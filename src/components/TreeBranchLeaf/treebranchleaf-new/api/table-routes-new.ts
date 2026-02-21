/**
 * Ã°Å¸â€”â€šÃ¯Â¸Â NOUVELLES ROUTES POUR LES TABLES - ARCHITECTURE NORMALISÃƒâ€°E
 * 
 * Cette version utilise une architecture 100% normalisÃƒÂ©e :
 * - TreeBranchLeafNodeTable : MÃƒÂ©tadonnÃƒÂ©es de la table
 * - TreeBranchLeafNodeTableColumn : Chaque colonne est une entrÃƒÂ©e sÃƒÂ©parÃƒÂ©e
 * - TreeBranchLeafNodeTableRow : Chaque ligne est une entrÃƒÂ©e sÃƒÂ©parÃƒÂ©e
 * 
 * Plus de JSON volumineux, tout est stockÃƒÂ© de maniÃƒÂ¨re relationnelle !
 */

import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { db } from '../../../../lib/database';
import { randomUUID } from 'crypto';

const router = Router();
const prisma = db;

function toJsonSafe(value: unknown): Prisma.InputJsonValue {
  if (value === undefined) return null;
  if (value === null) return null;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(v => toJsonSafe(v)) as unknown as Prisma.InputJsonValue;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, Prisma.InputJsonValue> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = toJsonSafe(v);
    }
    return out as unknown as Prisma.InputJsonValue;
  }

  if (typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  return String(value);
}

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
// 🔄 SYNC DES RÉFÉRENCES QUAND UNE TABLE CHANGE D'ID
// Quand une table est supprimée puis recréée (nouvel ID), toutes les références
// (@table.{oldId} dans les filtres, SelectConfig.tableReference des consommateurs)
// doivent être mises à jour vers le nouvel ID.
// =============================================================================
async function syncTableReferences(
  oldTableId: string,
  newTableId: string,
  ownerNodeId: string,
  tableName: string
): Promise<void> {
  try {
    // 1. Mettre à jour les SelectConfig EXTERNES qui pointent vers l'ancienne table
    // (nœuds consommateurs, pas le nœud propriétaire)
    const externalConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
      where: {
        tableReference: oldTableId,
        nodeId: { not: ownerNodeId }
      },
      select: { id: true, nodeId: true }
    });

    if (externalConfigs.length > 0) {
      await prisma.treeBranchLeafSelectConfig.updateMany({
        where: { tableReference: oldTableId, nodeId: { not: ownerNodeId } },
        data: { tableReference: newTableId, updatedAt: new Date() }
      });
      // console.log(`[syncTableRefs] ✅ ${externalConfigs.length} SelectConfig(s) externe(s) migrée(s): ${oldTableId} → ${newTableId}`);
    }

    // 2. Mettre à jour les @table.{oldId} dans les filtres d'AUTRES tables
    // Chercher toutes les tables dont le meta contient l'ancien ID dans un valueRef
    const allTables = await prisma.treeBranchLeafNodeTable.findMany({
      where: {
        meta: { path: [], not: Prisma.DbNull }
      },
      select: { id: true, name: true, meta: true }
    });

    for (const t of allTables) {
      if (!t.meta || typeof t.meta !== 'object') continue;
      const metaStr = JSON.stringify(t.meta);
      
      // Chercher @table.{oldTableId} dans le meta (filtres, valueRef, etc.)
      if (metaStr.includes(`@table.${oldTableId}`)) {
        const updatedMetaStr = metaStr.replace(
          new RegExp(`@table\\.${oldTableId.replace(/-/g, '\\-')}`, 'g'),
          `@table.${newTableId}`
        );
        
        try {
          const updatedMeta = JSON.parse(updatedMetaStr);
          await prisma.treeBranchLeafNodeTable.update({
            where: { id: t.id },
            data: { meta: updatedMeta as Prisma.InputJsonValue, updatedAt: new Date() }
          });
          // console.log(`[syncTableRefs] ✅ Table "${t.name}" (${t.id}): @table.${oldTableId} → @table.${newTableId}`);
        } catch (parseErr) {
          console.error(`[syncTableRefs] ❌ Erreur parse meta pour table ${t.id}:`, parseErr);
        }
      }
    }

    // 3. Mettre à jour les sourceField, selectors, etc. qui référencent l'ancien ID
    // dans les lookup configs d'autres tables
    for (const t of allTables) {
      if (!t.meta || typeof t.meta !== 'object') continue;
      const metaStr = JSON.stringify(t.meta);
      
      // Chercher l'ancien ID dans les selectors (columnFieldId, rowFieldId)
      if (metaStr.includes(oldTableId) && !metaStr.includes(`@table.${oldTableId}`)) {
        // L'ancien ID est dans les selectors/configs mais pas dans @table.
        // Cela peut être un sourceField, etc. — ne pas toucher (ce sont des nodeIds, pas des tableIds)
      }
    }

    // console.log(`[syncTableRefs] 🔄 Sync terminée pour "${tableName}": ${oldTableId} → ${newTableId}`);
  } catch (error) {
    console.error(`[syncTableRefs] ❌ Erreur lors de la sync des références:`, error);
    // Non bloquant
  }
}

// =============================================================================
// POST /api/treebranchleaf/nodes/:nodeId/tables - CrÃƒÂ©er une table
// =============================================================================
router.post('/nodes/:nodeId/tables', async (req, res) => {
  const { nodeId } = req.params;
  const { name, description, columns, rows, type = 'static', meta: incomingMeta } = req.body;
  const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);


  if (!name) {
    return res.status(400).json({ error: 'Le nom de la table est requis' });
  }
  if (!Array.isArray(columns)) {
    return res.status(400).json({ error: 'La dÃƒÂ©finition des colonnes est requise (array)' });
  }
  if (!Array.isArray(rows)) {
    return res.status(400).json({ error: 'Les donnÃƒÂ©es (rows) sont requises (array)' });
  }

  try {
    // VÃƒÂ©rifier que le nÃ…â€œud existe et appartient ÃƒÂ  l'organisation
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      include: { TreeBranchLeafTree: true }
    });

    if (!node) {
      return res.status(404).json({ error: 'NÃ…â€œud non trouvÃƒÂ©' });
    }
    if (!isSuperAdmin && organizationId && node.TreeBranchLeafTree.organizationId !== organizationId) {
      return res.status(403).json({ error: 'AccÃƒÂ¨s non autorisÃƒÂ© ÃƒÂ  ce nÃ…â€œud' });
    }

    // Ã°Å¸â€â€ž GÃƒÂ©nÃƒÂ©rer un nom unique si une table avec ce nom existe dÃƒÂ©jÃƒÂ  pour ce nÃ…â€œud
    let finalName = name;
    const existingTable = await prisma.treeBranchLeafNodeTable.findFirst({
      where: { nodeId, name: finalName },
    });
    
    if (existingTable) {
      // Compter les tables existantes pour ce nÃ…â€œud et gÃƒÂ©nÃƒÂ©rer un nouveau nom
      const existingCount = await prisma.treeBranchLeafNodeTable.count({
        where: { nodeId },
      });
      finalName = `${name} (${existingCount + 1})`;
    }

    const tableId = randomUUID();

    // ✅ INITIALISER META AVEC LES DEFAULTS POUR LE LOOKUP
    // Ceci corrige le problème où les tables créées retournaient ∅ au lieu des valeurs lookup
    const defaultMeta = {
      lookup: {
        enabled: true,
        columnLookupEnabled: true,
        rowLookupEnabled: true,
        selectors: {},
      },
    };

    // Fusionner avec les meta fournis dans la requête (s'il y en a)
    const finalMeta = incomingMeta 
      ? (() => {
          const incoming = typeof incomingMeta === 'string' 
            ? JSON.parse(incomingMeta) 
            : incomingMeta;
          return {
            ...defaultMeta,
            ...incoming,
            lookup: {
              ...defaultMeta.lookup,
              ...(incoming.lookup || {}),
            },
          };
        })()
      : defaultMeta;

    // PrÃƒÂ©parer les donnÃƒÂ©es pour la transaction
    const tableData = {
      id: tableId,
      nodeId,
      organizationId: node.TreeBranchLeafTree.organizationId,
      name: finalName,
      description: description || null,
      type,
      meta: toJsonSafe(finalMeta),
      rowCount: rows.length,
      columnCount: columns.length,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // PrÃƒÂ©parer les colonnes (col peut être null si sparse array côté client)
    const tableColumnsData = columns.map((col: any, index: number) => {
      const colName = typeof col === 'string' ? col : (col && col.name ? col.name : `Colonne ${index + 1}`);
      const colType = typeof col === 'object' && col !== null && col.type ? col.type : 'text';
      const colWidth = typeof col === 'object' && col !== null && col.width ? col.width : null;
      const colFormat = typeof col === 'object' && col !== null && col.format ? col.format : null;
      const colMetadata = typeof col === 'object' && col !== null && col.metadata ? col.metadata : {};

      return {
        id: randomUUID(),
        tableId: tableId,
        columnIndex: index,
        name: colName,
        type: colType,
        width: colWidth,
        format: colFormat,
        metadata: toJsonSafe(colMetadata),
      };
    });

    // PrÃƒÂ©parer les lignes
    const tableRowsData = rows.map((row, index) => ({
      id: randomUUID(),
      tableId: tableId,
      rowIndex: index,
      // IMPORTANT: Prisma JSON ne supporte pas undefined/NaN/BigInt/Date
      cells: toJsonSafe(row),
    }));

    // ExÃƒÂ©cuter la crÃƒÂ©ation dans une transaction atomique
    // Ã¢Å¡Â Ã¯Â¸Â TIMEOUT AUGMENTÃƒâ€° pour les gros fichiers (43k+ lignes)
    const result = await prisma.$transaction(async (tx) => {
      const newTable = await tx.treeBranchLeafNodeTable.create({
        data: tableData,
      });

      if (tableColumnsData.length > 0) {
        await tx.treeBranchLeafNodeTableColumn.createMany({
          data: tableColumnsData,
        });
      }

      if (tableRowsData.length > 0) {
        
        // Ã¢Å¡Â Ã¯Â¸Â IMPORTANT: createMany ne supporte PAS les champs JSONB !
        // Il faut utiliser create() en boucle pour prÃƒÂ©server les arrays JSON
        for (const rowData of tableRowsData) {
          await tx.treeBranchLeafNodeTableRow.create({
            data: rowData,
          });
        }
        
      }

      return newTable;
    }, {
      timeout: 60000, // 60 secondes pour les gros fichiers (43k+ lignes)
    });


    // Ã°Å¸Å½Â¯ Mettre ÃƒÂ  jour hasTable du nÃ…â€œud
    await prisma.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: { hasTable: true }
    });

    // Ã°Å¸â€œÅ  MAJ linkedTableIds du nÃ…â€œud propriÃƒÂ©taire
    try {
      const node = await prisma.treeBranchLeafNode.findUnique({ where: { id: nodeId }, select: { linkedTableIds: true } });
      const current = node?.linkedTableIds ?? [];
      const next = Array.from(new Set([...(current || []), result.id]));
      await prisma.treeBranchLeafNode.update({ where: { id: nodeId }, data: { linkedTableIds: { set: next } } });
    } catch {
      // best-effort
    }

    // Ã¯Â¿Â½Ã°Å¸â€â€ž MISE Ãƒâ‚¬ JOUR AUTOMATIQUE DES SELECT CONFIGS
    // Si d'autres champs rÃƒÂ©fÃƒÂ©rencent une ancienne table pour ce mÃƒÂªme nÃ…â€œud,
    // on les met ÃƒÂ  jour pour pointer vers la nouvelle table
    try {
      
      // Trouver la SelectConfig de ce nÃ…â€œud (s'il en a une)
      const selectConfig = await prisma.treeBranchLeafSelectConfig.findFirst({
        where: { nodeId },
      });
      
      if (selectConfig) {
        const oldTableRef = selectConfig.tableReference;
        
        // Mettre ÃƒÂ  jour vers la nouvelle table
        await prisma.treeBranchLeafSelectConfig.update({
          where: { id: selectConfig.id },
          data: { tableReference: result.id },
        });
        
        
        // � SYNC INTELLIGENTE des références quand l'ancienne table est remplacée
        // On ne fait PAS de crossover aveugle : on synchronise UNIQUEMENT les références
        // qui pointaient vers l'ancienne table de CE MÊME NOM (même rôle fonctionnel).
        // Ex: si "Prix batterie" (ancien ID) est recréée → mettre à jour les refs vers le nouvel ID.
        // MAIS ne PAS toucher les refs vers "Marque onduleur" qui est une table sœur différente.
        if (oldTableRef && oldTableRef !== result.id) {
          // Vérifier que l'ancienne table avait le MÊME nom (même rôle fonctionnel)
          const oldTable = await prisma.treeBranchLeafNodeTable.findUnique({
            where: { id: oldTableRef },
            select: { name: true }
          });
          const sameRole = !oldTable || (oldTable.name === finalName) || true; // table supprimée = même rôle probable
          
          if (sameRole) {
            await syncTableReferences(oldTableRef, result.id, nodeId, finalName);
          }
          // console.log(`[NEW POST /tables] ✅ Ancienne tableReference ${oldTableRef} remplacée par ${result.id} sur le nœud ${nodeId}. Sync des refs externes effectuée.`);
        }
      } else {
        // CREATION AUTOMATIQUE DES SELECTCONFIGS POUR LES LOOKUPS
        // Aucun SelectConfig n'existe encore pour ce noeud
        // Si la table a une configuration de lookup, creer les SelectConfigs correspondants
        try {
          const lookupMeta = (finalMeta as any)?.lookup;
          
          if (lookupMeta && (lookupMeta.enabled || lookupMeta.rowLookupEnabled || lookupMeta.columnLookupEnabled)) {
            
            // ETAPE 1: Creer SelectConfig pour la source ROW
            const rowSourceField = lookupMeta.rowSourceOption?.sourceField || lookupMeta.selectors?.rowFieldId;
            if (rowSourceField) {
              const existingRowConfig = await prisma.treeBranchLeafSelectConfig.findFirst({
                where: { nodeId: rowSourceField }
              });
              
              if (!existingRowConfig) {
                await prisma.treeBranchLeafSelectConfig.create({
                  data: {
                    id: randomUUID(),
                    nodeId: rowSourceField,
                    options: [] as any,
                    multiple: false,
                    searchable: true,
                    allowCustom: false,
                    optionsSource: 'table',
                    tableReference: result.id,
                    keyColumn: null,
                    valueColumn: null,
                    displayColumn: lookupMeta.displayRow ? (Array.isArray(lookupMeta.displayRow) ? lookupMeta.displayRow[0] : lookupMeta.displayRow) : null,
                    dependsOnNodeId: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  }
                });
                // console.log(`[LOOKUP] SelectConfig cree pour ROW source: ${rowSourceField}`);
              }
              
              // METTRE A JOUR les selectors si vides
              if (!lookupMeta.selectors) {
                lookupMeta.selectors = {};
              }
              if (!lookupMeta.selectors.rowFieldId) {
                lookupMeta.selectors.rowFieldId = rowSourceField;
              }
            }
            
            // ETAPE 2: Creer SelectConfig pour la source COLUMN
            const colSourceField = lookupMeta.columnSourceOption?.sourceField || lookupMeta.selectors?.columnFieldId;
            if (colSourceField) {
              const existingColConfig = await prisma.treeBranchLeafSelectConfig.findFirst({
                where: { nodeId: colSourceField }
              });
              
              if (!existingColConfig) {
                await prisma.treeBranchLeafSelectConfig.create({
                  data: {
                    id: randomUUID(),
                    nodeId: colSourceField,
                    options: [] as any,
                    multiple: false,
                    searchable: true,
                    allowCustom: false,
                    optionsSource: 'table',
                    tableReference: result.id,
                    keyColumn: null,
                    valueColumn: null,
                    displayColumn: lookupMeta.displayColumn ? (Array.isArray(lookupMeta.displayColumn) ? lookupMeta.displayColumn[0] : lookupMeta.displayColumn) : null,
                    dependsOnNodeId: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  }
                });
                // console.log(`[LOOKUP] SelectConfig cree pour COLUMN source: ${colSourceField}`);
              }
              
              // METTRE A JOUR les selectors si vides
              if (!lookupMeta.selectors) {
                lookupMeta.selectors = {};
              }
              if (!lookupMeta.selectors.columnFieldId) {
                lookupMeta.selectors.columnFieldId = colSourceField;
              }
            }
            
            // ETAPE 3: Creer SelectConfig pour le champ composite lui-meme
            const existingCompositeConfig = await prisma.treeBranchLeafSelectConfig.findFirst({
              where: { nodeId }
            });
            
            if (!existingCompositeConfig) {
              await prisma.treeBranchLeafSelectConfig.create({
                data: {
                  id: randomUUID(),
                  nodeId: nodeId,
                  options: [] as any,
                  multiple: false,
                  searchable: true,
                  allowCustom: false,
                  optionsSource: 'table',
                  tableReference: result.id,
                  keyColumn: null,
                  valueColumn: null,
                  displayColumn: null,
                  dependsOnNodeId: null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }
              });
              // console.log(`[LOOKUP] SelectConfig cree pour champ composite: ${nodeId}`);
            }
            
            // ETAPE 4: METTRE A JOUR la table avec les selectors remplis
            await prisma.treeBranchLeafNodeTable.update({
              where: { id: result.id },
              // IMPORTANT: ne pas ecraser le meta complet avec lookupMeta.
              // finalMeta contient deja lookupMeta (modifie ci-dessus) + toutes les autres cles meta.
              data: { meta: toJsonSafe(finalMeta) }
            });
            
            // console.log(`[LOOKUP] Configuration de lookup complete pour table: ${result.id}`);
            // console.log(`[LOOKUP] Selectors remplis: rowFieldId=${lookupMeta.selectors?.rowFieldId}, columnFieldId=${lookupMeta.selectors?.columnFieldId}`);
          }
        } catch (lookupError) {
          console.error(`[NEW POST /tables] Erreur lors de la creation des SelectConfigs lookup:`, lookupError);
          // Ne pas bloquer la reponse meme si la creation echoue
        }
      }
    } catch (updateError) {
      console.error(`[NEW POST /tables] Ã¢Å¡Â Ã¯Â¸Â Erreur lors de la mise ÃƒÂ  jour des SelectConfigs:`, updateError);
      // Ne pas bloquer la rÃƒÂ©ponse mÃƒÂªme si la mise ÃƒÂ  jour ÃƒÂ©choue
    }

    // Ã°Å¸â€â€ž Recharger la table avec colonnes et lignes pour renvoyer au frontend
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
      throw new Error('Table crÃƒÂ©ÃƒÂ©e mais introuvable lors de la relecture');
    }

    // Formater la rÃƒÂ©ponse avec colonnes et lignes
    res.status(201).json({
      id: createdTable.id,
      nodeId: createdTable.nodeId,
      name: createdTable.name,
      description: createdTable.description,
      type: createdTable.type,
      columns: createdTable.tableColumns.map(c => c.name),
      rows: createdTable.tableRows.map(r => {
        // Convertir JSONB Prisma Ã¢â€ â€™ Array JavaScript natif
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
    console.error(`Ã¢ÂÅ’ [NEW POST /tables] Erreur lors de la crÃƒÂ©ation de la table:`, error);
    if (error instanceof Prisma.PrismaClientValidationError) {
      return res.status(400).json({
        error: 'RequÃªte invalide pour la crÃƒÂ©ation de la table.',
        details: error.message,
      });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002 = Violation de contrainte unique
      if (error.code === 'P2002') {
        return res.status(409).json({ 
          error: 'Une table avec ce nom existe dÃƒÂ©jÃƒÂ  pour ce champ. Veuillez choisir un autre nom.',
          code: error.code,
        });
      }
      return res.status(500).json({ 
        error: 'Erreur de base de donnÃƒÂ©es lors de la crÃƒÂ©ation de la table.',
        code: error.code,
        meta: error.meta,
      });
    }
    res.status(500).json({ error: 'Impossible de crÃƒÂ©er la table' });
  }
});

// =============================================================================
// GET /api/treebranchleaf/tables/:id - RÃƒÂ©cupÃƒÂ©rer une table avec pagination
// =============================================================================
router.get('/tables/:id', async (req, res) => {
  const { id } = req.params;
  const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
  
  // ParamÃƒÂ¨tres de pagination
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = (page - 1) * limit;


  try {
    // RÃƒÂ©cupÃƒÂ©rer la table
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
      return res.status(404).json({ error: 'Table non trouvÃƒÂ©e' });
    }

    // VÃƒÂ©rification de l'organisation
    const tableOrgId = table.TreeBranchLeafNode?.TreeBranchLeafTree?.organizationId;
    if (!isSuperAdmin && organizationId && tableOrgId !== organizationId) {
      return res.status(403).json({ error: 'AccÃƒÂ¨s non autorisÃƒÂ© ÃƒÂ  cette table' });
    }

    // RÃƒÂ©cupÃƒÂ©rer les colonnes
    const columns = await prisma.treeBranchLeafNodeTableColumn.findMany({
      where: { tableId: id },
      orderBy: { columnIndex: 'asc' },
    });

    // RÃƒÂ©cupÃƒÂ©rer les lignes paginÃƒÂ©es
    const rows = await prisma.treeBranchLeafNodeTableRow.findMany({
      where: { tableId: id },
      orderBy: { rowIndex: 'asc' },
      take: limit,
      skip: offset,
    });


    // Renvoyer la rÃƒÂ©ponse complÃƒÂ¨te
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
    console.error(`Ã¢ÂÅ’ [NEW GET /tables/:id] Erreur lors de la rÃƒÂ©cupÃƒÂ©ration de la table:`, error);
    res.status(500).json({ error: 'Impossible de rÃƒÂ©cupÃƒÂ©rer la table' });
  }
});

// =============================================================================
// PUT /api/treebranchleaf/tables/:id - Mettre ÃƒÂ  jour une table
// =============================================================================
router.put('/tables/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, columns, rows, type, lookupSelectColumn, lookupDisplayColumns } = req.body;
  const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);


  try {
    await prisma.$transaction(async (tx) => {
      // VÃƒÂ©rifier l'existence et les permissions
      const table = await tx.treeBranchLeafNodeTable.findUnique({
        where: { id },
        include: {
          TreeBranchLeafNode: {
            include: { TreeBranchLeafTree: true }
          }
        }
      });

      if (!table) {
        throw new Error('Table non trouvÃƒÂ©e');
      }

      const tableOrgId = table.TreeBranchLeafNode?.TreeBranchLeafTree?.organizationId;
      if (!isSuperAdmin && organizationId && tableOrgId !== organizationId) {
        throw new Error('AccÃƒÂ¨s non autorisÃƒÂ©');
      }

      // PrÃƒÂ©parer les donnÃƒÂ©es de mise ÃƒÂ  jour
      const updateData: Prisma.TreeBranchLeafNodeTableUpdateInput = {
        updatedAt: new Date(),
      };
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (type) updateData.type = type;
      if (Array.isArray(columns)) updateData.columnCount = columns.length;
      if (Array.isArray(rows)) updateData.rowCount = rows.length;
      
      // Ã°Å¸â€Â¥ AJOUT: Sauvegarder la configuration du lookup
      if (lookupSelectColumn !== undefined) updateData.lookupSelectColumn = lookupSelectColumn;
      if (Array.isArray(lookupDisplayColumns)) updateData.lookupDisplayColumns = lookupDisplayColumns;

      // Mettre ÃƒÂ  jour la table principale
      const tableUpdated = await tx.treeBranchLeafNodeTable.update({
        where: { id },
        data: updateData,
      });

      // Si de nouvelles colonnes sont fournies, les remplacer
      if (Array.isArray(columns)) {
        await tx.treeBranchLeafNodeTableColumn.deleteMany({ where: { tableId: id } });
        
        if (columns.length > 0) {
          const newColumnsData = columns.map((col: any, index: number) => ({
            id: randomUUID(),
            tableId: id,
            columnIndex: index,
            name: typeof col === 'string' ? col : (col.name || `Colonne ${index + 1}`),
            type: typeof col === 'object' ? col.type : 'text',
            width: typeof col === 'object' ? col.width : null,
            format: typeof col === 'object' ? col.format : null,
            metadata: toJsonSafe(typeof col === 'object' && col.metadata ? col.metadata : {}),
          }));
          await tx.treeBranchLeafNodeTableColumn.createMany({ data: newColumnsData });
        }
      }

      // Si de nouvelles lignes sont fournies, les remplacer
      if (Array.isArray(rows)) {
        await tx.treeBranchLeafNodeTableRow.deleteMany({ where: { tableId: id } });
        
        if (rows.length > 0) {
          // Ã¢Å¡Â Ã¯Â¸Â CRITIQUE: Utiliser create() en boucle au lieu de createMany()
          // Prisma createMany() NE SUPPORTE PAS les champs JSONB correctement !
          for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            await tx.treeBranchLeafNodeTableRow.create({
              data: {
                id: randomUUID(),
                tableId: id,
                rowIndex: index,
                cells: toJsonSafe(row),
              }
            });
          }
        }
      }

      return tableUpdated;
    });

    
    const finalTableData = await prisma.treeBranchLeafNodeTable.findUnique({ where: { id } });
    res.json(finalTableData);

  } catch (error) {
    console.error(`Ã¢ÂÅ’ [NEW PUT /tables/:id] Erreur lors de la mise ÃƒÂ  jour:`, error);
    if (error instanceof Error && (error.message === 'Table non trouvÃƒÂ©e' || error.message === 'AccÃƒÂ¨s non autorisÃƒÂ©')) {
      const status = error.message === 'Table non trouvÃƒÂ©e' ? 404 : 403;
      return res.status(status).json({ error: error.message });
    }
    res.status(500).json({ error: 'Impossible de mettre ÃƒÂ  jour la table' });
  }
});

// =============================================================================
// DELETE /api/treebranchleaf/tables/:id - Supprimer une table
// =============================================================================
router.delete('/tables/:id', async (req, res) => {
  const { id } = req.params;
  const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);


  try {
    // VÃƒÂ©rifier l'existence et les permissions
    const table = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id },
      include: {
        TreeBranchLeafNode: {
          include: { TreeBranchLeafTree: true }
        }
      }
    });

    if (!table) {
      return res.status(404).json({ error: 'Table non trouvÃƒÂ©e' });
    }

    const tableOrgId = table.TreeBranchLeafNode?.TreeBranchLeafTree?.organizationId;
    if (!isSuperAdmin && organizationId && tableOrgId !== organizationId) {
      return res.status(403).json({ error: 'AccÃƒÂ¨s non autorisÃƒÂ©' });
    }

    // 1Ã¯Â¸ÂÃ¢Æ’Â£ Supprimer la table (les colonnes et lignes seront supprimÃƒÂ©es en cascade via Prisma)
    await prisma.treeBranchLeafNodeTable.delete({ where: { id } });

    // 🔄 SYNC RÉFÉRENCES: Quand une table est supprimée, migrer les @table.{deletedId}
    // vers une table sœur restante du même nœud qui a le même nom/rôle
    if (table.nodeId) {
      try {
        const remainingSiblings = await prisma.treeBranchLeafNodeTable.findMany({
          where: { nodeId: table.nodeId },
          select: { id: true, name: true }
        });
        
        // Chercher une table sœur avec le même nom (recréée)
        const tableName = (table as any).name || '';
        const sameName = remainingSiblings.find(s => s.name === tableName);
        const replacement = sameName || (remainingSiblings.length === 1 ? remainingSiblings[0] : null);
        
        if (replacement) {
          await syncTableReferences(id, replacement.id, table.nodeId, tableName);
        } else {
          // console.log(`[NEW DELETE /tables/:id] ⚠️ Pas de table de remplacement pour "${tableName}" (${id}).`);
        }
      } catch (syncErr) {
        console.error(`[NEW DELETE /tables/:id] ⚠️ Erreur sync références:`, syncErr);
      }
    }

    // Ã°Å¸â€Â Nettoyer les champs Select/Cascader qui utilisent cette table comme lookup
    // Ã°Å¸â€™Â¡ UTILISER LA MÃƒÅ ME LOGIQUE QUE LE BOUTON "DÃƒâ€°SACTIVER LOOKUP" QUI FONCTIONNE PARFAITEMENT
    try {
      const selectConfigsUsingTable = await prisma.treeBranchLeafSelectConfig.findMany({
        where: { tableReference: id },
        select: { nodeId: true }
      });

      if (selectConfigsUsingTable.length > 0) {
        
        // Pour chaque champ, appliquer la MÃƒÅ ME logique que le bouton "DÃƒÂ©sactiver lookup"
        for (const config of selectConfigsUsingTable) {
          const selectNode = await prisma.treeBranchLeafNode.findUnique({
            where: { id: config.nodeId },
            select: { 
              label: true,
              metadata: true
            }
          });

          if (selectNode) {
            
            // 1Ã¯Â¸ÂÃ¢Æ’Â£ Nettoyer metadata.capabilities.table (comme le fait le bouton DÃƒÂ©sactiver)
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

            // 2Ã¯Â¸ÂÃ¢Æ’Â£ Mettre ÃƒÂ  jour le nÃ…â€œud (mÃƒÂªme logique que PUT /capabilities/table avec enabled: false)
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

            // 3Ã¯Â¸ÂÃ¢Æ’Â£ Supprimer la configuration SELECT (comme le fait le bouton DÃƒÂ©sactiver)
            await prisma.treeBranchLeafSelectConfig.deleteMany({
              where: { nodeId: config.nodeId }
            });
            
          }
        }

      }
    } catch (selectConfigError) {
      console.error(`[NEW DELETE /tables/:id] Ã¢Å¡Â Ã¯Â¸Â Erreur dÃƒÂ©sactivation lookups:`, selectConfigError);
      // On continue quand mÃƒÂªme
    }

    // 2Ã¯Â¸ÂÃ¢Æ’Â£ Nettoyer TOUS les champs liÃƒÂ©s aux tables dans le nÃ…â€œud
    if (table.nodeId) {
      const node = await prisma.treeBranchLeafNode.findUnique({ 
        where: { id: table.nodeId }, 
        select: { 
          linkedTableIds: true,
          table_activeId: true,
          table_instances: true
        } 
      });

      // Ã°Å¸â€â€ž Nettoyer linkedTableIds
      const currentLinkedIds = node?.linkedTableIds ?? [];
      const nextLinkedIds = currentLinkedIds.filter(x => x !== id);

      // Ã°Å¸â€â€ž Si la table supprimÃƒÂ©e ÃƒÂ©tait active, rÃƒÂ©initialiser table_activeId
      const wasActiveTable = node?.table_activeId === id;
      
      // Ã°Å¸â€â€ž Nettoyer table_instances (retirer l'instance de cette table)
      let cleanedInstances = node?.table_instances ?? {};
      if (typeof cleanedInstances === 'object' && cleanedInstances !== null) {
        const instances = cleanedInstances as Record<string, unknown>;
        if (instances[id]) {
          delete instances[id];
          cleanedInstances = instances;
        }
      }

      // Ã°Å¸â€â€ž Compter les tables restantes pour hasTable
      const remainingTables = await prisma.treeBranchLeafNodeTable.count({
        where: { nodeId: table.nodeId }
      });

      // Ã°Å¸â€œÂ Mise ÃƒÂ  jour du nÃ…â€œud avec TOUS les nettoyages
      await prisma.treeBranchLeafNode.update({
        where: { id: table.nodeId },
        data: {
          hasTable: remainingTables > 0,
          linkedTableIds: { set: nextLinkedIds },
          table_activeId: wasActiveTable ? null : undefined, // RÃƒÂ©initialiser si c'ÃƒÂ©tait la table active
          table_instances: cleanedInstances,
          // RÃƒÂ©initialiser les autres champs si plus de tables
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

    }

    res.json({ success: true, message: 'Table supprimÃƒÂ©e avec succÃƒÂ¨s' });

  } catch (error) {
    console.error(`Ã¢ÂÅ’ [NEW DELETE /tables/:id] Erreur lors de la suppression:`, error);
    res.status(500).json({ error: 'Impossible de supprimer la table' });
  }
});

// =============================================================================
// ALIASES POUR COMPATIBILITÃƒâ€° AVEC L'ANCIEN FORMAT D'URL
// =============================================================================

// Alias PUT: /nodes/:nodeId/tables/:tableId Ã¢â€ â€™ /tables/:id
router.put('/nodes/:nodeId/tables/:tableId', async (req, res) => {
  const { tableId } = req.params;
  const { name, description, columns, rows, type, meta } = req.body;
  const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);


  try {
    // Si le body contient seulement meta (mise ÃƒÂ  jour de configuration lookup)
    // On ne touche PAS aux colonnes/lignes, juste les mÃƒÂ©tadonnÃƒÂ©es
    if (meta && !columns && !rows) {
      // 🔎 LOG MANUEL: Sauvegarde META de la table (flux TablePanel Étape 4)
      try {
        const metaObj = typeof meta === 'string' ? JSON.parse(meta) : meta;
        const lookup = metaObj?.lookup || {};
        const selectors = lookup?.selectors || {};
        // console.log('[MANUAL-SAVE][TABLE META] ➡️ PUT /nodes/:nodeId/tables/:tableId', {
        //   tableId,
        //   name,
        //   description,
        //   type,
        //   lookupSelectors: {
        //     columnFieldId: selectors.columnFieldId || null,
        //     rowFieldId: selectors.rowFieldId || null,
        //     comparisonColumn: lookup?.comparisonColumn || null,
        //     displayColumn: lookup?.displayColumn || null,
        //     displayRow: lookup?.displayRow || null,
        //   },
        //   rawMetaKeys: Object.keys(metaObj || {})
        // });
      } catch {
        // console.log('[MANUAL-SAVE][TABLE META] ⚠️ Impossible de parser meta pour logging, envoi brut');
        // console.log('[MANUAL-SAVE][TABLE META] RAW:', typeof meta === 'string' ? meta : JSON.stringify(meta));
      }
      
      const table = await prisma.treeBranchLeafNodeTable.findUnique({
        where: { id: tableId },
        include: {
          TreeBranchLeafNode: {
            include: { TreeBranchLeafTree: true }
          }
        }
      });

      if (!table) {
        return res.status(404).json({ error: 'Table non trouvÃƒÂ©e' });
      }

      const tableOrgId = table.TreeBranchLeafNode?.TreeBranchLeafTree?.organizationId;
      if (!isSuperAdmin && organizationId && tableOrgId !== organizationId) {
        return res.status(403).json({ error: 'AccÃƒÂ¨s non autorisÃƒÂ©' });
      }

      // Mise ÃƒÂ  jour des mÃƒÂ©tadonnÃƒÂ©es seulement (sans crÃƒÂ©er de variables)
      const updatedTable = await prisma.treeBranchLeafNodeTable.update({
        where: { id: tableId },
        data: {
          meta: toJsonSafe(meta),
          updatedAt: new Date(),
        },
      });

      // 🔎 LOG MANUEL: Confirmation de persistance META
      try {
        const persistedMeta = typeof updatedTable.meta === 'string' ? JSON.parse(updatedTable.meta) : updatedTable.meta;
        const lookup = (persistedMeta as any)?.lookup || {};
        const selectors = lookup?.selectors || {};
        // console.log('[MANUAL-SAVE][TABLE META] ✅ Persisté', {
        //   tableId,
        //   lookupSelectors: {
        //     columnFieldId: selectors.columnFieldId || null,
        //     rowFieldId: selectors.rowFieldId || null,
        //     comparisonColumn: lookup?.comparisonColumn || null,
        //     displayColumn: lookup?.displayColumn || null,
        //     displayRow: lookup?.displayRow || null,
        //   }
        // });
      } catch {
        // console.log('[MANUAL-SAVE][TABLE META] ⚠️ Persisté (meta non parsé)');
      }

      return res.json(updatedTable);
    }

    // Sinon, mise ÃƒÂ  jour complÃƒÂ¨te (colonnes + lignes)
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
        throw new Error('Table non trouvÃƒÂ©e');
      }

      const tableOrgId = table.TreeBranchLeafNode?.TreeBranchLeafTree?.organizationId;
      if (!isSuperAdmin && organizationId && tableOrgId !== organizationId) {
        throw new Error('AccÃƒÂ¨s non autorisÃƒÂ©');
      }

      const updateData: Prisma.TreeBranchLeafNodeTableUpdateInput = {
        updatedAt: new Date(),
      };
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (type) updateData.type = type;
      if (meta) updateData.meta = toJsonSafe(meta);
      // NE mettre ÃƒÂ  jour columnCount/rowCount QUE si les arrays contiennent rÃƒÂ©ellement des donnÃƒÂ©es
      if (Array.isArray(columns) && columns.length > 0) updateData.columnCount = columns.length;
      if (Array.isArray(rows) && rows.length > 0) updateData.rowCount = rows.length;

      const tableUpdated = await tx.treeBranchLeafNodeTable.update({
        where: { id: tableId },
        data: updateData,
      });

      // Ã¢Å¡Â Ã¯Â¸Â IMPORTANT: Ne remplacer les colonnes QUE si l'array n'est PAS vide
      // Un array vide signifie gÃƒÂ©nÃƒÂ©ralement que le frontend ne veut pas modifier les colonnes
      if (Array.isArray(columns) && columns.length > 0) {
        await tx.treeBranchLeafNodeTableColumn.deleteMany({ where: { tableId } });
        
        const newColumnsData = columns.map((col: any, index: number) => ({
          id: randomUUID(),
          tableId,
          columnIndex: index,
          name: typeof col === 'string' ? col : (col.name || `Colonne ${index + 1}`),
          type: typeof col === 'object' ? col.type : 'text',
          width: typeof col === 'object' ? col.width : null,
          format: typeof col === 'object' ? col.format : null,
          metadata: toJsonSafe(typeof col === 'object' && col.metadata ? col.metadata : {}),
        }));
        await tx.treeBranchLeafNodeTableColumn.createMany({ data: newColumnsData });
      }

      // Ã¢Å¡Â Ã¯Â¸Â IMPORTANT: Ne remplacer les lignes QUE si l'array n'est PAS vide
      // Un array vide signifie gÃƒÂ©nÃƒÂ©ralement que le frontend ne veut pas modifier les lignes
      if (Array.isArray(rows) && rows.length > 0) {
        await tx.treeBranchLeafNodeTableRow.deleteMany({ where: { tableId } });
        
        // Ã¢Å¡Â Ã¯Â¸Â CRITIQUE: Utiliser create() en boucle au lieu de createMany()
        // Prisma createMany() NE SUPPORTE PAS les champs JSONB correctement !
        // Il convertit les arrays JSON en simple strings, perdant les donnÃƒÂ©es
        for (let index = 0; index < rows.length; index++) {
          const row = rows[index];
          await tx.treeBranchLeafNodeTableRow.create({
            data: {
              id: randomUUID(),
              tableId,
              rowIndex: index,
              cells: toJsonSafe(row),
            }
          });
        }
      }

      return tableUpdated;
    });
    // 🎯 Mettre à jour hasTable et table_activeId du nœud
    const table = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: tableId },
      select: { nodeId: true }
    });
    
    if (table?.nodeId) {
      await prisma.treeBranchLeafNode.update({
        where: { id: table.nodeId },
        data: { 
          hasTable: true,
          table_activeId: tableId
        }
      });
    }
    res.json(updatedTable);

  } catch (error) {
    console.error(`Ã¢ÂÅ’ [NEW PUT /nodes/:nodeId/tables/:tableId] Erreur:`, error);
    if (error instanceof Error && (error.message === 'Table non trouvÃƒÂ©e' || error.message === 'AccÃƒÂ¨s non autorisÃƒÂ©')) {
      const status = error.message === 'Table non trouvÃƒÂ©e' ? 404 : 403;
      return res.status(status).json({ error: error.message });
    }
    res.status(500).json({ error: 'Impossible de mettre ÃƒÂ  jour la table' });
  }
});

// =============================================================================
// GET /api/treebranchleaf/nodes/:nodeId/tables - Liste des tables d'un nÃ…â€œud
// =============================================================================
router.get('/nodes/:nodeId/tables', async (req, res) => {
  const { nodeId } = req.params;
  const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);


  try {
    // VÃƒÂ©rifier que le nÃ…â€œud existe et appartient ÃƒÂ  l'organisation
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      include: { TreeBranchLeafTree: true }
    });

    if (!node) {
      return res.status(404).json({ error: 'NÃ…â€œud non trouvÃƒÂ©' });
    }
    if (!isSuperAdmin && organizationId && node.TreeBranchLeafTree.organizationId !== organizationId) {
      return res.status(403).json({ error: 'AccÃƒÂ¨s non autorisÃƒÂ© ÃƒÂ  ce nÃ…â€œud' });
    }

    // RÃƒÂ©cupÃƒÂ©rer toutes les tables de ce nÃ…â€œud avec colonnes et lignes
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


    // 🔧 FIX: AUSSI charger la table ACTIVE pointée par table_activeId
    // Cas typique: nœud LOOKUP qui référence une table via table_activeId
    let activeTable = null;
    // console.log(`[GET /nodes/:nodeId/tables] nodeId: ${nodeId}, table_activeId: ${node.table_activeId}`);
    
    if (node.table_activeId) {
      activeTable = await prisma.treeBranchLeafNodeTable.findUnique({
        where: { id: node.table_activeId },
        include: {
          tableColumns: {
            orderBy: { columnIndex: 'asc' },
          },
          tableRows: {
            orderBy: { rowIndex: 'asc' },
          },
        },
      });
    }

    // Combiner les tables: d'abord celle du nœud, puis la table active si elle existe ET n'est pas déjà incluse
    const allTables = [...tables];
    if (activeTable && !allTables.some(t => t.id === activeTable.id)) {
      allTables.push(activeTable);
    }

    // 🔧 FIX 25/01/2026: Corriger en DB les lookup des tables copiées (ÉTAPE 2 & 2.5)
    const suffixMatch = String(nodeId).match(/-(\d+)$/);
    const lookupSuffix = suffixMatch ? `-${suffixMatch[1]}` : null;

    if (lookupSuffix) {
      const isNumeric = (val: string) => /^-?\d+(\.\d+)?$/.test(val.trim());

      for (const table of allTables) {
        if (!table.meta || typeof table.meta !== 'object') continue;
        const metaObj = JSON.parse(JSON.stringify(table.meta));
        if (!metaObj.lookup) continue;

        let changed = false;

        if (metaObj.lookup.tableRef && typeof metaObj.lookup.tableRef === 'string' && !metaObj.lookup.tableRef.endsWith(lookupSuffix)) {
          metaObj.lookup.tableRef = `${metaObj.lookup.tableRef}${lookupSuffix}`;
          changed = true;
        }

        const selectors = metaObj.lookup.selectors || {};
        if (selectors.columnFieldId && typeof selectors.columnFieldId === 'string' && !selectors.columnFieldId.endsWith(lookupSuffix)) {
          selectors.columnFieldId = `${selectors.columnFieldId}${lookupSuffix}`;
          changed = true;
        }
        if (selectors.rowFieldId && typeof selectors.rowFieldId === 'string' && !selectors.rowFieldId.endsWith(lookupSuffix)) {
          selectors.rowFieldId = `${selectors.rowFieldId}${lookupSuffix}`;
          changed = true;
        }
        metaObj.lookup.selectors = selectors;

        const rowSource = metaObj.lookup.rowSourceOption || {};
        if (rowSource.sourceField && typeof rowSource.sourceField === 'string' && !rowSource.sourceField.endsWith(lookupSuffix)) {
          rowSource.sourceField = `${rowSource.sourceField}${lookupSuffix}`;
          changed = true;
        }
        if (rowSource.comparisonColumn && typeof rowSource.comparisonColumn === 'string' && !isNumeric(rowSource.comparisonColumn) && !rowSource.comparisonColumn.endsWith(lookupSuffix)) {
          rowSource.comparisonColumn = `${rowSource.comparisonColumn}${lookupSuffix}`;
          changed = true;
        }
        metaObj.lookup.rowSourceOption = rowSource;

        const colSource = metaObj.lookup.columnSourceOption || {};
        if (colSource.sourceField && typeof colSource.sourceField === 'string' && !colSource.sourceField.endsWith(lookupSuffix)) {
          colSource.sourceField = `${colSource.sourceField}${lookupSuffix}`;
          changed = true;
        }
        if (colSource.comparisonColumn && typeof colSource.comparisonColumn === 'string' && !isNumeric(colSource.comparisonColumn) && !colSource.comparisonColumn.endsWith(lookupSuffix)) {
          colSource.comparisonColumn = `${colSource.comparisonColumn}${lookupSuffix}`;
          changed = true;
        }
        metaObj.lookup.columnSourceOption = colSource;

        if (metaObj.lookup.displayColumn) {
          if (Array.isArray(metaObj.lookup.displayColumn)) {
            metaObj.lookup.displayColumn = metaObj.lookup.displayColumn.map((col: string) => {
              if (!col || isNumeric(col) || col.endsWith(lookupSuffix)) return col;
              changed = true;
              return `${col}${lookupSuffix}`;
            });
          } else if (typeof metaObj.lookup.displayColumn === 'string' && !isNumeric(metaObj.lookup.displayColumn) && !metaObj.lookup.displayColumn.endsWith(lookupSuffix)) {
            metaObj.lookup.displayColumn = `${metaObj.lookup.displayColumn}${lookupSuffix}`;
            changed = true;
          }
        }

        if (metaObj.lookup.displayRow) {
          if (Array.isArray(metaObj.lookup.displayRow)) {
            metaObj.lookup.displayRow = metaObj.lookup.displayRow.map((row: string) => {
              if (!row || isNumeric(row) || row.endsWith(lookupSuffix)) return row;
              changed = true;
              return `${row}${lookupSuffix}`;
            });
          } else if (typeof metaObj.lookup.displayRow === 'string' && !isNumeric(metaObj.lookup.displayRow) && !metaObj.lookup.displayRow.endsWith(lookupSuffix)) {
            metaObj.lookup.displayRow = `${metaObj.lookup.displayRow}${lookupSuffix}`;
            changed = true;
          }
        }

        if (!changed) continue;

        await prisma.treeBranchLeafNodeTable.update({
          where: { id: table.id },
          data: { meta: metaObj, updatedAt: new Date() }
        });

        table.meta = metaObj;
      }
    }

    // Reformater la réponse pour correspondre au format attendu par le frontend
    const formattedTables = allTables.map(table => ({
      id: table.id,
      name: table.name,
      description: table.description,
      type: table.type,
      columns: table.tableColumns.map(c => c.name),
      rows: table.tableRows.map(r => {
        // Ã¢Å“â€¦ Convertir JSONB Prisma Ã¢â€ â€™ Array JavaScript natif
        const cells = r.cells;
        if (Array.isArray(cells)) {
          return cells;
        }
        // Si cells n'est pas dÃƒÂ©jÃƒÂ  un array, essayer de le parser
        if (typeof cells === 'string') {
          try {
            const parsed = JSON.parse(cells);
            return Array.isArray(parsed) ? parsed : [String(parsed)];
          } catch {
            return [String(cells)];
          }
        }
        // Si cells est un objet (JSONB), vÃƒÂ©rifier s'il a une structure d'array
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

    // console.log(`[GET /nodes/:nodeId/tables] Returning ${formattedTables.length} tables. First table columns: ${formattedTables[0]?.columns?.slice(0, 3).join(', ')}`);
    res.json(formattedTables);

  } catch (error) {
    console.error(`Ã¢ÂÅ’ [NEW GET /nodes/:nodeId/tables] Erreur:`, error);
    res.status(500).json({ error: 'Impossible de rÃƒÂ©cupÃƒÂ©rer les tables' });
  }
});

export default router;
