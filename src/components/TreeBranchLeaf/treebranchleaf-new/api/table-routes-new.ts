/**
 * 🗂️ NOUVELLES ROUTES POUR LES TABLES - ARCHITECTURE NORMALISÉE
 * 
 * Cette version utilise une architecture 100% normalisée :
 * - TreeBranchLeafNodeTable : Métadonnées de la table
 * - TreeBranchLeafNodeTableColumn : Chaque colonne est une entrée séparée
 * - TreeBranchLeafNodeTableRow : Chaque ligne est une entrée séparée
 * 
 * Plus de JSON volumineux, tout est stocké de manière relationnelle !
 */

import { Router } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

const router = Router();
const prisma = new PrismaClient();

type MinimalReqUser = { organizationId?: string | null; isSuperAdmin?: boolean; role?: string; userRole?: string };
type MinimalReq = { user?: MinimalReqUser; headers?: Record<string, unknown> };

function getAuthCtx(req: MinimalReq): { organizationId: string | null; isSuperAdmin: boolean } {
  const user: MinimalReqUser = (req && req.user) || {};
  const headerOrg: string | undefined = (req?.headers?.['x-organization-id'] as string)
    || (req?.headers?.['x-organization'] as string)
    || (req?.headers?.['organization-id'] as string);
  const role: string | undefined = user.role || user.userRole;
  const isSuperAdmin = Boolean(user.isSuperAdmin || role === 'super_admin' || role === 'superadmin');
  const organizationId: string | null = (user.organizationId as string) || headerOrg || null;
  return { organizationId, isSuperAdmin };
}

// =============================================================================
// POST /api/treebranchleaf/nodes/:nodeId/tables - Créer une table
// =============================================================================
router.post('/nodes/:nodeId/tables', async (req, res) => {
  const { nodeId } = req.params;
  const { name, description, columns, rows, type = 'static' } = req.body;
  const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

  console.log(`[NEW POST /tables] 🚀 Début création table pour node ${nodeId}`);
  console.log(`[NEW POST /tables] 📊 Données reçues: ${Array.isArray(columns) ? columns.length : 0} colonnes, ${Array.isArray(rows) ? rows.length : 0} lignes`);

  if (!name) {
    return res.status(400).json({ error: 'Le nom de la table est requis' });
  }
  if (!Array.isArray(columns)) {
    return res.status(400).json({ error: 'La définition des colonnes est requise (array)' });
  }
  if (!Array.isArray(rows)) {
    return res.status(400).json({ error: 'Les données (rows) sont requises (array)' });
  }

  try {
    // Vérifier que le nœud existe et appartient à l'organisation
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      include: { TreeBranchLeafTree: true }
    });

    if (!node) {
      return res.status(404).json({ error: 'Nœud non trouvé' });
    }
    if (!isSuperAdmin && organizationId && node.TreeBranchLeafTree.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Accès non autorisé à ce nœud' });
    }

    const tableId = randomUUID();
    console.log(`[NEW POST /tables] 🆔 Nouvel ID de table généré: ${tableId}`);

    // Préparer les données pour la transaction
    const tableData = {
      id: tableId,
      nodeId,
      organizationId: node.TreeBranchLeafTree.organizationId,
      name,
      description: description || null,
      type,
      rowCount: rows.length,
      columnCount: columns.length,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Préparer les colonnes
    const tableColumnsData = columns.map((col: any, index: number) => {
      const colName = typeof col === 'string' ? col : (col.name || `Colonne ${index + 1}`);
      const colType = typeof col === 'object' && col.type ? col.type : 'text';
      const colWidth = typeof col === 'object' && col.width ? col.width : null;
      const colFormat = typeof col === 'object' && col.format ? col.format : null;
      const colMetadata = typeof col === 'object' && col.metadata ? col.metadata : {};

      return {
        tableId: tableId,
        columnIndex: index,
        name: colName,
        type: colType,
        width: colWidth,
        format: colFormat,
        metadata: colMetadata as Prisma.InputJsonValue,
      };
    });

    // Préparer les lignes
    const tableRowsData = rows.map((row, index) => ({
      tableId: tableId,
      rowIndex: index,
      cells: row as Prisma.InputJsonValue,
    }));

    console.log(`[NEW POST /tables] 📦 Transaction préparée: 1 table + ${tableColumnsData.length} colonnes + ${tableRowsData.length} lignes`);
    console.log(`[NEW POST /tables] 🔍 ANALYSE DÉTAILLÉE DES ROWS:`);
    console.log(`[NEW POST /tables]    - Type de rows reçu: ${Array.isArray(rows) ? 'array' : typeof rows}`);
    console.log(`[NEW POST /tables]    - rows.length: ${rows.length}`);
    console.log(`[NEW POST /tables]    - rows[0] (première ligne):`, rows[0]);
    console.log(`[NEW POST /tables]    - rows[0][0] (A1):`, rows[0]?.[0]);
    console.log(`[NEW POST /tables]    - rows[0][1-3] (premières données):`, rows[0]?.slice(1, 4));
    console.log(`[NEW POST /tables]    - rows[1] (deuxième ligne):`, rows[1]);
    console.log(`[NEW POST /tables]    - rows[1][0] (label ligne 2):`, rows[1]?.[0]);
    console.log(`[NEW POST /tables]    - rows[dernière]:`, rows[rows.length - 1]);
    console.log(`[NEW POST /tables] 🔍 ANALYSE TABLEROWSDATA (après map):`);
    console.log(`[NEW POST /tables]    - tableRowsData[0].cells:`, tableRowsData[0].cells);
    console.log(`[NEW POST /tables]    - tableRowsData[1].cells:`, tableRowsData[1].cells);
    console.log(`[NEW POST /tables]    - tableRowsData[dernière].cells:`, tableRowsData[tableRowsData.length - 1].cells);

    // Exécuter la création dans une transaction atomique
    // ⚠️ TIMEOUT AUGMENTÉ pour les gros fichiers (43k+ lignes)
    const result = await prisma.$transaction(async (tx) => {
      console.log(`[NEW POST /tables] 🔄 Étape 1/3: Création de la table principale...`);
      const newTable = await tx.treeBranchLeafNodeTable.create({
        data: tableData,
      });

      if (tableColumnsData.length > 0) {
        console.log(`[NEW POST /tables] 🔄 Étape 2/3: Insertion de ${tableColumnsData.length} colonnes...`);
        await tx.treeBranchLeafNodeTableColumn.createMany({
          data: tableColumnsData,
        });
      }

      if (tableRowsData.length > 0) {
        console.log(`[NEW POST /tables] 🔄 Étape 3/3: Insertion de ${tableRowsData.length} lignes...`);
        
        // ⚠️ IMPORTANT: createMany ne supporte PAS les champs JSONB !
        // Il faut utiliser create() en boucle pour préserver les arrays JSON
        for (const rowData of tableRowsData) {
          await tx.treeBranchLeafNodeTableRow.create({
            data: rowData,
          });
        }
        
        console.log(`[NEW POST /tables] ✅ Lignes insérées ! Vérification...`);
        // Vérifier les 3 premières lignes insérées
        const verif = await tx.treeBranchLeafNodeTableRow.findMany({
          where: { tableId },
          orderBy: { rowIndex: 'asc' },
          take: 3
        });
        console.log(`[NEW POST /tables] 🔍 VÉRIFICATION POST-INSERTION:`);
        verif.forEach((row, idx) => {
          console.log(`[NEW POST /tables]    - Ligne ${idx} (rowIndex=${row.rowIndex}):`);
          console.log(`[NEW POST /tables]      cells type:`, typeof row.cells);
          console.log(`[NEW POST /tables]      cells value:`, row.cells);
          if (typeof row.cells === 'string') {
            try {
              const parsed = JSON.parse(row.cells);
              console.log(`[NEW POST /tables]      cells[0] après parse:`, parsed[0]);
            } catch (e) {
              console.log(`[NEW POST /tables]      ❌ Erreur parse:`, e.message);
            }
          } else if (Array.isArray(row.cells)) {
            console.log(`[NEW POST /tables]      cells[0]:`, row.cells[0]);
            console.log(`[NEW POST /tables]      cells.length:`, row.cells.length);
          }
        });
      }

      return newTable;
    }, {
      timeout: 60000, // 60 secondes pour les gros fichiers (43k+ lignes)
    });

    console.log(`[NEW POST /tables] ✅ Transaction terminée avec succès ! Table ${result.id} créée.`);

    // 🎯 Mettre à jour hasTable du nœud
    await prisma.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: { hasTable: true }
    });
    console.log(`[NEW POST /tables] ✅ hasTable mis à jour pour node ${nodeId}`);

    // 📊 MAJ linkedTableIds du nœud propriétaire
    try {
      const node = await prisma.treeBranchLeafNode.findUnique({ where: { id: nodeId }, select: { linkedTableIds: true } });
      const current = node?.linkedTableIds ?? [];
      const next = Array.from(new Set([...(current || []), result.id]));
      await prisma.treeBranchLeafNode.update({ where: { id: nodeId }, data: { linkedTableIds: { set: next } } });
    } catch (e) {
      console.warn('[NEW POST /tables] Warning updating linkedTableIds:', (e as Error).message);
    }

    // �🔄 MISE À JOUR AUTOMATIQUE DES SELECT CONFIGS
    // Si d'autres champs référencent une ancienne table pour ce même nœud,
    // on les met à jour pour pointer vers la nouvelle table
    try {
      console.log(`[NEW POST /tables] 🔍 Recherche des SelectConfigs à mettre à jour pour nodeId: ${nodeId}`);
      
      // Trouver la SelectConfig de ce nœud (s'il en a une)
      const selectConfig = await prisma.treeBranchLeafSelectConfig.findFirst({
        where: { nodeId },
      });
      
      if (selectConfig) {
        const oldTableRef = selectConfig.tableReference;
        
        // Mettre à jour vers la nouvelle table
        await prisma.treeBranchLeafSelectConfig.update({
          where: { id: selectConfig.id },
          data: { tableReference: result.id },
        });
        
        console.log(`[NEW POST /tables] ✅ SelectConfig mis à jour: ${selectConfig.id}`);
        console.log(`[NEW POST /tables]    - Ancien tableau: ${oldTableRef}`);
        console.log(`[NEW POST /tables]    - Nouveau tableau: ${result.id}`);
        
        // Chercher d'autres champs qui utilisaient l'ancien tableau (crossover tables)
        if (oldTableRef) {
          const otherConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
            where: { 
              tableReference: oldTableRef,
              nodeId: { not: nodeId } // Exclure celui qu'on vient de mettre à jour
            },
          });
          
          if (otherConfigs.length > 0) {
            console.log(`[NEW POST /tables] 🔍 ${otherConfigs.length} autres SelectConfigs référencent l'ancien tableau`);
            
            // Mettre à jour tous les autres
            const updateResult = await prisma.treeBranchLeafSelectConfig.updateMany({
              where: { 
                tableReference: oldTableRef,
                nodeId: { not: nodeId }
              },
              data: { tableReference: result.id }
            });
            
            console.log(`[NEW POST /tables] ✅ ${updateResult.count} SelectConfigs supplémentaires mis à jour`);
            otherConfigs.forEach(cfg => {
              console.log(`[NEW POST /tables]    - NodeId: ${cfg.nodeId} (keyColumn: ${cfg.keyColumn}, keyRow: ${cfg.keyRow})`);
            });
          }
        }
      } else {
        console.log(`[NEW POST /tables] ℹ️ Pas de SelectConfig trouvée pour ce nœud`);
      }
    } catch (updateError) {
      console.error(`[NEW POST /tables] ⚠️ Erreur lors de la mise à jour des SelectConfigs:`, updateError);
      // Ne pas bloquer la réponse même si la mise à jour échoue
    }

    // 🔄 Recharger la table avec colonnes et lignes pour renvoyer au frontend
    const createdTable = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: result.id },
      include: {
        tableColumns: {
          orderBy: { columnIndex: 'asc' },
        },
        tableRows: {
          orderBy: { rowIndex: 'asc' },
        },
      },
    });

    if (!createdTable) {
      throw new Error('Table créée mais introuvable lors de la relecture');
    }

    // Formater la réponse avec colonnes et lignes
    res.status(201).json({
      id: createdTable.id,
      nodeId: createdTable.nodeId,
      name: createdTable.name,
      description: createdTable.description,
      type: createdTable.type,
      columns: createdTable.tableColumns.map(c => c.name),
      rows: createdTable.tableRows.map(r => {
        // Convertir JSONB Prisma → Array JavaScript natif
        const cells = r.cells;
        if (Array.isArray(cells)) {
          return cells;
        }
        if (typeof cells === 'string') {
          try {
            const parsed = JSON.parse(cells);
            return Array.isArray(parsed) ? parsed : [String(parsed)];
          } catch {
            return [String(cells)];
          }
        }
        if (cells && typeof cells === 'object') {
          return Object.values(cells);
        }
        return [String(cells || '')];
      }),
      meta: createdTable.meta || {},
      rowCount: createdTable.rowCount,
      columnCount: createdTable.columnCount,
      createdAt: createdTable.createdAt,
      updatedAt: createdTable.updatedAt,
    });

  } catch (error) {
    console.error(`❌ [NEW POST /tables] Erreur lors de la création de la table:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return res.status(500).json({ 
        error: 'Erreur de base de données lors de la création de la table.',
        code: error.code,
        meta: error.meta,
      });
    }
    res.status(500).json({ error: 'Impossible de créer la table' });
  }
});

// =============================================================================
// GET /api/treebranchleaf/tables/:id - Récupérer une table avec pagination
// =============================================================================
router.get('/tables/:id', async (req, res) => {
  const { id } = req.params;
  const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
  
  // Paramètres de pagination
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = (page - 1) * limit;

  console.log(`[NEW GET /tables/:id] 📖 Récupération table ${id} (page ${page}, limit ${limit})`);

  try {
    // Récupérer la table
    const table = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id },
      include: {
        TreeBranchLeafNode: {
          select: {
            treeId: true,
            TreeBranchLeafTree: {
              select: { organizationId: true }
            }
          }
        }
      }
    });

    if (!table) {
      return res.status(404).json({ error: 'Table non trouvée' });
    }

    // Vérification de l'organisation
    const tableOrgId = table.TreeBranchLeafNode?.TreeBranchLeafTree?.organizationId;
    if (!isSuperAdmin && organizationId && tableOrgId !== organizationId) {
      return res.status(403).json({ error: 'Accès non autorisé à cette table' });
    }

    // Récupérer les colonnes
    const columns = await prisma.treeBranchLeafNodeTableColumn.findMany({
      where: { tableId: id },
      orderBy: { columnIndex: 'asc' },
    });

    // Récupérer les lignes paginées
    const rows = await prisma.treeBranchLeafNodeTableRow.findMany({
      where: { tableId: id },
      orderBy: { rowIndex: 'asc' },
      take: limit,
      skip: offset,
    });

    console.log(`[NEW GET /tables/:id] ✅ Récupéré: ${columns.length} colonnes et ${rows.length} lignes (sur ${table.rowCount} total)`);

    // Renvoyer la réponse complète
    res.json({
      id: table.id,
      nodeId: table.nodeId,
      name: table.name,
      description: table.description,
      type: table.type,
      columns: columns.map(c => ({
        name: c.name,
        type: c.type,
        width: c.width,
        format: c.format,
        metadata: c.metadata,
      })),
      rows: rows.map(r => r.cells),
      page,
      limit,
      totalRows: table.rowCount,
      totalPages: Math.ceil(table.rowCount / limit),
      createdAt: table.createdAt,
      updatedAt: table.updatedAt,
    });

  } catch (error) {
    console.error(`❌ [NEW GET /tables/:id] Erreur lors de la récupération de la table:`, error);
    res.status(500).json({ error: 'Impossible de récupérer la table' });
  }
});

// =============================================================================
// PUT /api/treebranchleaf/tables/:id - Mettre à jour une table
// =============================================================================
router.put('/tables/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, columns, rows, type } = req.body;
  const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

  console.log(`[NEW PUT /tables/:id] 🔄 Mise à jour table ${id}`);
  console.log(`[NEW PUT /tables/:id] Nouvelles données: ${Array.isArray(columns) ? columns.length : 'N/A'} colonnes, ${Array.isArray(rows) ? rows.length : 'N/A'} lignes`);

  try {
    const updatedTable = await prisma.$transaction(async (tx) => {
      // Vérifier l'existence et les permissions
      const table = await tx.treeBranchLeafNodeTable.findUnique({
        where: { id },
        include: {
          TreeBranchLeafNode: {
            include: { TreeBranchLeafTree: true }
          }
        }
      });

      if (!table) {
        throw new Error('Table non trouvée');
      }

      const tableOrgId = table.TreeBranchLeafNode?.TreeBranchLeafTree?.organizationId;
      if (!isSuperAdmin && organizationId && tableOrgId !== organizationId) {
        throw new Error('Accès non autorisé');
      }

      // Préparer les données de mise à jour
      const updateData: Prisma.TreeBranchLeafNodeTableUpdateInput = {
        updatedAt: new Date(),
      };
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (type) updateData.type = type;
      if (Array.isArray(columns)) updateData.columnCount = columns.length;
      if (Array.isArray(rows)) updateData.rowCount = rows.length;

      // Mettre à jour la table principale
      const tableUpdated = await tx.treeBranchLeafNodeTable.update({
        where: { id },
        data: updateData,
      });
      console.log(`[NEW PUT /tables/:id] ✅ Étape 1: Table principale mise à jour`);

      // Si de nouvelles colonnes sont fournies, les remplacer
      if (Array.isArray(columns)) {
        console.log(`[NEW PUT /tables/:id] 🔄 Remplacement des colonnes...`);
        await tx.treeBranchLeafNodeTableColumn.deleteMany({ where: { tableId: id } });
        
        if (columns.length > 0) {
          const newColumnsData = columns.map((col: any, index: number) => ({
            tableId: id,
            columnIndex: index,
            name: typeof col === 'string' ? col : (col.name || `Colonne ${index + 1}`),
            type: typeof col === 'object' ? col.type : 'text',
            width: typeof col === 'object' ? col.width : null,
            format: typeof col === 'object' ? col.format : null,
            metadata: typeof col === 'object' && col.metadata ? col.metadata : {},
          }));
          await tx.treeBranchLeafNodeTableColumn.createMany({ data: newColumnsData });
        }
        console.log(`[NEW PUT /tables/:id] ✅ Étape 2: ${columns.length} colonnes remplacées`);
      }

      // Si de nouvelles lignes sont fournies, les remplacer
      if (Array.isArray(rows)) {
        console.log(`[NEW PUT /tables/:id] 🔄 Remplacement des lignes...`);
        await tx.treeBranchLeafNodeTableRow.deleteMany({ where: { tableId: id } });
        
        if (rows.length > 0) {
          // ⚠️ CRITIQUE: Utiliser create() en boucle au lieu de createMany()
          // Prisma createMany() NE SUPPORTE PAS les champs JSONB correctement !
          console.log(`[NEW PUT /tables/:id] 🔄 Création de ${rows.length} lignes (boucle create)...`);
          for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            await tx.treeBranchLeafNodeTableRow.create({
              data: {
                tableId: id,
                rowIndex: index,
                cells: row as Prisma.InputJsonValue,
              }
            });
            console.log(`[PUT /tables/:id] Row ${index} created, cells.length:`, Array.isArray(row) ? row.length : 'N/A');
          }
        }
        console.log(`[NEW PUT /tables/:id] ✅ Étape 3: ${rows.length} lignes remplacées`);
      }

      return tableUpdated;
    });

    console.log(`[NEW PUT /tables/:id] 🎉 Transaction de mise à jour terminée avec succès`);
    
    const finalTableData = await prisma.treeBranchLeafNodeTable.findUnique({ where: { id } });
    res.json(finalTableData);

  } catch (error) {
    console.error(`❌ [NEW PUT /tables/:id] Erreur lors de la mise à jour:`, error);
    if (error instanceof Error && (error.message === 'Table non trouvée' || error.message === 'Accès non autorisé')) {
      const status = error.message === 'Table non trouvée' ? 404 : 403;
      return res.status(status).json({ error: error.message });
    }
    res.status(500).json({ error: 'Impossible de mettre à jour la table' });
  }
});

// =============================================================================
// DELETE /api/treebranchleaf/tables/:id - Supprimer une table
// =============================================================================
router.delete('/tables/:id', async (req, res) => {
  const { id } = req.params;
  const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

  console.log(`[NEW DELETE /tables/:id] 🗑️ Suppression table ${id}`);

  try {
    // Vérifier l'existence et les permissions
    const table = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id },
      include: {
        TreeBranchLeafNode: {
          include: { TreeBranchLeafTree: true }
        }
      }
    });

    if (!table) {
      return res.status(404).json({ error: 'Table non trouvée' });
    }

    const tableOrgId = table.TreeBranchLeafNode?.TreeBranchLeafTree?.organizationId;
    if (!isSuperAdmin && organizationId && tableOrgId !== organizationId) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    // 1️⃣ Supprimer la table (les colonnes et lignes seront supprimées en cascade via Prisma)
    await prisma.treeBranchLeafNodeTable.delete({ where: { id } });
    console.log(`[NEW DELETE /tables/:id] ✅ Table ${id} supprimée (+ colonnes/lignes en cascade)`);

    // 🔍 Nettoyer les champs Select/Cascader qui utilisent cette table comme lookup
    // 💡 UTILISER LA MÊME LOGIQUE QUE LE BOUTON "DÉSACTIVER LOOKUP" QUI FONCTIONNE PARFAITEMENT
    try {
      const selectConfigsUsingTable = await prisma.treeBranchLeafSelectConfig.findMany({
        where: { tableReference: id },
        select: { nodeId: true }
      });

      if (selectConfigsUsingTable.length > 0) {
        console.log(`[NEW DELETE /tables/:id] 🧹 ${selectConfigsUsingTable.length} champ(s) Select/Cascader référencent cette table - DÉSACTIVATION LOOKUP`);
        
        // Pour chaque champ, appliquer la MÊME logique que le bouton "Désactiver lookup"
        for (const config of selectConfigsUsingTable) {
          const selectNode = await prisma.treeBranchLeafNode.findUnique({
            where: { id: config.nodeId },
            select: { 
              label: true,
              metadata: true
            }
          });

          if (selectNode) {
            console.log(`[NEW DELETE /tables/:id] 🔧 Désactivation lookup pour "${selectNode.label}" (${config.nodeId})`);
            
            // 1️⃣ Nettoyer metadata.capabilities.table (comme le fait le bouton Désactiver)
            const oldMetadata = (selectNode.metadata || {}) as Record<string, unknown>;
            const oldCapabilities = (oldMetadata.capabilities || {}) as Record<string, unknown>;
            const newCapabilities = {
              ...oldCapabilities,
              table: {
                enabled: false,
                activeId: null,
                instances: null,
                currentTable: null,
              }
            };
            const newMetadata = {
              ...oldMetadata,
              capabilities: newCapabilities
            };

            // 2️⃣ Mettre à jour le nœud (même logique que PUT /capabilities/table avec enabled: false)
            await prisma.treeBranchLeafNode.update({
              where: { id: config.nodeId },
              data: {
                hasTable: false,
                table_activeId: null,
                table_instances: null,
                table_name: null,
                table_type: null,
                table_meta: null,
                table_columns: null,
                table_rows: null,
                table_data: null,
                metadata: JSON.parse(JSON.stringify(newMetadata)),
                select_options: [],
                updatedAt: new Date()
              }
            });

            // 3️⃣ Supprimer la configuration SELECT (comme le fait le bouton Désactiver)
            await prisma.treeBranchLeafSelectConfig.deleteMany({
              where: { nodeId: config.nodeId }
            });
            
            console.log(`[NEW DELETE /tables/:id] ✅ Lookup désactivé pour "${selectNode.label}" - champ débloqué`);
          }
        }

        console.log(`[NEW DELETE /tables/:id] ✅ ${selectConfigsUsingTable.length} champ(s) Select DÉBLOQUÉS (lookup désactivé)`);
      }
    } catch (selectConfigError) {
      console.error(`[NEW DELETE /tables/:id] ⚠️ Erreur désactivation lookups:`, selectConfigError);
      // On continue quand même
    }

    // 2️⃣ Nettoyer TOUS les champs liés aux tables dans le nœud
    if (table.nodeId) {
      const node = await prisma.treeBranchLeafNode.findUnique({ 
        where: { id: table.nodeId }, 
        select: { 
          linkedTableIds: true,
          table_activeId: true,
          table_instances: true
        } 
      });

      // 🔄 Nettoyer linkedTableIds
      const currentLinkedIds = node?.linkedTableIds ?? [];
      const nextLinkedIds = currentLinkedIds.filter(x => x !== id);

      // 🔄 Si la table supprimée était active, réinitialiser table_activeId
      const wasActiveTable = node?.table_activeId === id;
      
      // 🔄 Nettoyer table_instances (retirer l'instance de cette table)
      let cleanedInstances = node?.table_instances ?? {};
      if (typeof cleanedInstances === 'object' && cleanedInstances !== null) {
        const instances = cleanedInstances as Record<string, unknown>;
        if (instances[id]) {
          delete instances[id];
          cleanedInstances = instances;
        }
      }

      // 🔄 Compter les tables restantes pour hasTable
      const remainingTables = await prisma.treeBranchLeafNodeTable.count({
        where: { nodeId: table.nodeId }
      });

      // 📝 Mise à jour du nœud avec TOUS les nettoyages
      await prisma.treeBranchLeafNode.update({
        where: { id: table.nodeId },
        data: {
          hasTable: remainingTables > 0,
          linkedTableIds: { set: nextLinkedIds },
          table_activeId: wasActiveTable ? null : undefined, // Réinitialiser si c'était la table active
          table_instances: cleanedInstances,
          // Réinitialiser les autres champs si plus de tables
          ...(remainingTables === 0 && {
            table_name: null,
            table_type: null,
            table_meta: null,
            table_columns: null,
            table_rows: null,
            table_data: null,
            table_importSource: null,
            table_isImported: false
          })
        }
      });

      console.log(`[NEW DELETE /tables/:id] ✅ Nœud ${table.nodeId} nettoyé:`, {
        hasTable: remainingTables > 0,
        linkedTableIds: nextLinkedIds.length,
        table_activeId_reset: wasActiveTable,
        table_instances_cleaned: true,
        all_fields_reset: remainingTables === 0
      });
    }

    console.log(`[NEW DELETE /tables/:id] ✅ Table ${id} supprimée avec succès (+ colonnes et lignes en cascade)`);
    res.json({ success: true, message: 'Table supprimée avec succès' });

  } catch (error) {
    console.error(`❌ [NEW DELETE /tables/:id] Erreur lors de la suppression:`, error);
    res.status(500).json({ error: 'Impossible de supprimer la table' });
  }
});

// =============================================================================
// ALIASES POUR COMPATIBILITÉ AVEC L'ANCIEN FORMAT D'URL
// =============================================================================

// Alias PUT: /nodes/:nodeId/tables/:tableId → /tables/:id
router.put('/nodes/:nodeId/tables/:tableId', async (req, res) => {
  const { tableId } = req.params;
  const { name, description, columns, rows, type, meta } = req.body;
  const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

  console.log(`[NEW PUT /nodes/:nodeId/tables/:tableId] 🔄 Alias route - redirection vers PUT /tables/${tableId}`);
  console.log(`[NEW PUT /nodes/:nodeId/tables/:tableId] 📊 Données reçues:`, {
    hasColumns: !!columns,
    hasRows: !!rows,
    hasMeta: !!meta,
    type
  });

  try {
    // Si le body contient seulement meta (mise à jour de configuration lookup)
    // On ne touche PAS aux colonnes/lignes, juste les métadonnées
    if (meta && !columns && !rows) {
      console.log(`[NEW PUT /nodes/:nodeId/tables/:tableId] ⚙️ Mise à jour métadonnées uniquement (lookup config)`);
      
      const table = await prisma.treeBranchLeafNodeTable.findUnique({
        where: { id: tableId },
        include: {
          TreeBranchLeafNode: {
            include: { TreeBranchLeafTree: true }
          }
        }
      });

      if (!table) {
        return res.status(404).json({ error: 'Table non trouvée' });
      }

      const tableOrgId = table.TreeBranchLeafNode?.TreeBranchLeafTree?.organizationId;
      if (!isSuperAdmin && organizationId && tableOrgId !== organizationId) {
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      // Mise à jour des métadonnées seulement
      const updatedTable = await prisma.treeBranchLeafNodeTable.update({
        where: { id: tableId },
        data: {
          meta: meta as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });

      console.log(`[NEW PUT /nodes/:nodeId/tables/:tableId] ✅ Métadonnées mises à jour avec succès`);
      return res.json(updatedTable);
    }

    // Sinon, mise à jour complète (colonnes + lignes)
    const updatedTable = await prisma.$transaction(async (tx) => {
      const table = await tx.treeBranchLeafNodeTable.findUnique({
        where: { id: tableId },
        include: {
          TreeBranchLeafNode: {
            include: { TreeBranchLeafTree: true }
          }
        }
      });

      if (!table) {
        throw new Error('Table non trouvée');
      }

      const tableOrgId = table.TreeBranchLeafNode?.TreeBranchLeafTree?.organizationId;
      if (!isSuperAdmin && organizationId && tableOrgId !== organizationId) {
        throw new Error('Accès non autorisé');
      }

      const updateData: Prisma.TreeBranchLeafNodeTableUpdateInput = {
        updatedAt: new Date(),
      };
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (type) updateData.type = type;
      if (meta) updateData.meta = meta as Prisma.InputJsonValue;
      // NE mettre à jour columnCount/rowCount QUE si les arrays contiennent réellement des données
      if (Array.isArray(columns) && columns.length > 0) updateData.columnCount = columns.length;
      if (Array.isArray(rows) && rows.length > 0) updateData.rowCount = rows.length;

      const tableUpdated = await tx.treeBranchLeafNodeTable.update({
        where: { id: tableId },
        data: updateData,
      });

      // ⚠️ IMPORTANT: Ne remplacer les colonnes QUE si l'array n'est PAS vide
      // Un array vide signifie généralement que le frontend ne veut pas modifier les colonnes
      if (Array.isArray(columns) && columns.length > 0) {
        console.log(`[NEW PUT /nodes/:nodeId/tables/:tableId] 🔄 Remplacement des colonnes...`);
        await tx.treeBranchLeafNodeTableColumn.deleteMany({ where: { tableId } });
        
        const newColumnsData = columns.map((col: any, index: number) => ({
          tableId,
          columnIndex: index,
          name: typeof col === 'string' ? col : (col.name || `Colonne ${index + 1}`),
          type: typeof col === 'object' ? col.type : 'text',
          width: typeof col === 'object' ? col.width : null,
          format: typeof col === 'object' ? col.format : null,
          metadata: typeof col === 'object' && col.metadata ? col.metadata : {},
        }));
        await tx.treeBranchLeafNodeTableColumn.createMany({ data: newColumnsData });
        console.log(`[NEW PUT /nodes/:nodeId/tables/:tableId] ✅ ${columns.length} colonnes remplacées`);
      }

      // ⚠️ IMPORTANT: Ne remplacer les lignes QUE si l'array n'est PAS vide
      // Un array vide signifie généralement que le frontend ne veut pas modifier les lignes
      if (Array.isArray(rows) && rows.length > 0) {
        console.log(`[NEW PUT /nodes/:nodeId/tables/:tableId] 🔄 Remplacement des lignes...`);
        console.log(`[PUT ALIAS] 🔍 ANALYSE ROWS REÇUES DU FRONTEND:`);
        console.log(`[PUT ALIAS]    - rows.length:`, rows.length);
        console.log(`[PUT ALIAS]    - rows[0] type:`, typeof rows[0]);
        console.log(`[PUT ALIAS]    - rows[0] isArray:`, Array.isArray(rows[0]));
        console.log(`[PUT ALIAS]    - rows[0] value:`, rows[0]);
        if (rows.length > 1) {
          console.log(`[PUT ALIAS]    - rows[1] type:`, typeof rows[1]);
          console.log(`[PUT ALIAS]    - rows[1] isArray:`, Array.isArray(rows[1]));
          console.log(`[PUT ALIAS]    - rows[1] value:`, rows[1]);
        }
        
        await tx.treeBranchLeafNodeTableRow.deleteMany({ where: { tableId } });
        
        // ⚠️ CRITIQUE: Utiliser create() en boucle au lieu de createMany()
        // Prisma createMany() NE SUPPORTE PAS les champs JSONB correctement !
        // Il convertit les arrays JSON en simple strings, perdant les données
        console.log(`[NEW PUT /nodes/:nodeId/tables/:tableId] 🔄 Création de ${rows.length} lignes (boucle create)...`);
        for (let index = 0; index < rows.length; index++) {
          const row = rows[index];
          console.log(`[PUT ALIAS] Row ${index} AVANT create - type:`, typeof row, 'isArray:', Array.isArray(row), 'value:', row);
          await tx.treeBranchLeafNodeTableRow.create({
            data: {
              tableId,
              rowIndex: index,
              cells: row as Prisma.InputJsonValue,
            }
          });
          console.log(`[PUT ALIAS] Row ${index} created, cells.length:`, Array.isArray(row) ? row.length : 'N/A');
        }
        console.log(`[NEW PUT /nodes/:nodeId/tables/:tableId] ✅ ${rows.length} lignes remplacées`);
      }

      return tableUpdated;
    });

    console.log(`[NEW PUT /nodes/:nodeId/tables/:tableId] 🎉 Mise à jour terminée avec succès`);
    res.json(updatedTable);

  } catch (error) {
    console.error(`❌ [NEW PUT /nodes/:nodeId/tables/:tableId] Erreur:`, error);
    if (error instanceof Error && (error.message === 'Table non trouvée' || error.message === 'Accès non autorisé')) {
      const status = error.message === 'Table non trouvée' ? 404 : 403;
      return res.status(status).json({ error: error.message });
    }
    res.status(500).json({ error: 'Impossible de mettre à jour la table' });
  }
});

// =============================================================================
// GET /api/treebranchleaf/nodes/:nodeId/tables - Liste des tables d'un nœud
// =============================================================================
router.get('/nodes/:nodeId/tables', async (req, res) => {
  const { nodeId } = req.params;
  const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

  console.log(`[NEW GET /nodes/:nodeId/tables] 📋 Récupération des tables pour node ${nodeId}`);

  try {
    // Vérifier que le nœud existe et appartient à l'organisation
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      include: { TreeBranchLeafTree: true }
    });

    if (!node) {
      return res.status(404).json({ error: 'Nœud non trouvé' });
    }
    if (!isSuperAdmin && organizationId && node.TreeBranchLeafTree.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Accès non autorisé à ce nœud' });
    }

    // Récupérer toutes les tables de ce nœud avec colonnes et lignes
    const tables = await prisma.treeBranchLeafNodeTable.findMany({
      where: { nodeId },
      include: {
        tableColumns: {
          orderBy: { columnIndex: 'asc' },
        },
        tableRows: {
          orderBy: { rowIndex: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`[NEW GET /nodes/:nodeId/tables] ✅ ${tables.length} table(s) trouvée(s)`);

    // Reformater la réponse pour correspondre au format attendu par le frontend
    const formattedTables = tables.map(table => ({
      id: table.id,
      name: table.name,
      description: table.description,
      type: table.type,
      columns: table.tableColumns.map(c => c.name),
      rows: table.tableRows.map(r => {
        // ✅ Convertir JSONB Prisma → Array JavaScript natif
        const cells = r.cells;
        if (Array.isArray(cells)) {
          return cells;
        }
        // Si cells n'est pas déjà un array, essayer de le parser
        if (typeof cells === 'string') {
          try {
            const parsed = JSON.parse(cells);
            return Array.isArray(parsed) ? parsed : [String(parsed)];
          } catch {
            return [String(cells)];
          }
        }
        // Si cells est un objet (JSONB), vérifier s'il a une structure d'array
        if (cells && typeof cells === 'object') {
          return Object.values(cells);
        }
        return [String(cells || '')];
      }),
      meta: table.meta || {},
      order: table.createdAt ? new Date(table.createdAt).getTime() : 0,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt,
    }));

    res.json(formattedTables);

  } catch (error) {
    console.error(`❌ [NEW GET /nodes/:nodeId/tables] Erreur:`, error);
    res.status(500).json({ error: 'Impossible de récupérer les tables' });
  }
});

export default router;
