/**
 * 📊 Système de copie des TABLES
 * 
 * Ce module gère la copie complète d'une table (TreeBranchLeafNodeTable)
 * avec toutes ses sous-entités : colonnes, lignes et cellules.
 * 
 * PRINCIPES :
 * -----------
 * 1. Copier la table principale avec suffixe
 * 2. Copier toutes les colonnes (TreeBranchLeafNodeTableColumn)
 * 3. Copier toutes les lignes (TreeBranchLeafNodeTableRow)
 * 4. Copier toutes les cellules (TreeBranchLeafNodeTableCell)
 * 5. Réécrire les IDs dans les configs JSON
 * 6. 🔗 LIAISON AUTOMATIQUE OBLIGATOIRE: linkedTableIds sur TOUS les nœuds référencés
 * 7. Mettre à jour linkedTableIds du nœud propriétaire
 * 8. Synchroniser les paramètres de capacité (hasTable, table_activeId, etc.)
 * 
 * @author System TBL
 * @version 2.0.0 - LIAISON AUTOMATIQUE OBLIGATOIRE
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { linkTableToAllNodes } from './universal-linking-system';
import { rewriteJsonReferences, forceSharedRefSuffixes, forceSharedRefSuffixesInJson, type RewriteMaps } from './repeat/utils/universal-reference-rewriter.js';

// ═══════════════════════════════════════════════════════════════════════════
// 📋 TYPES ET INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Options pour la copie de table
 */
export interface CopyTableOptions {
  /** Map des nœuds copiés (ancien ID → nouveau ID) pour réécrire les configs */
  nodeIdMap?: Map<string, string>;
  /** Map des tables déjà copiées (cache pour éviter doublons) */
  tableCopyCache?: Map<string, string>;
  /** Map des tables copiées (ancien ID → nouveau ID) pour remapper table_instances */
  tableIdMap?: Map<string, string>;
}

/**
 * Résultat de la copie d'une table
 */
export interface CopyTableResult {
  /** ID de la table copiée */
  newTableId: string;
  /** ID du nœud propriétaire */
  nodeId: string;
  /** Nombre de colonnes copiées */
  columnsCount: number;
  /** Nombre de lignes copiées */
  rowsCount: number;
  /** Nombre de cellules copiées */
  cellsCount: number;
  /** Succès de l'opération */
  success: boolean;
  /** Message d'erreur éventuel */
  error?: string;
}

function stripNumericSuffix(value: string | null | undefined): string | null | undefined {
  if (!value) return value;
  const numericWithAnySuffix = /^\d+(?:-\d+)+$/;
  const numericOnly = /^\d+$/;
  if (numericWithAnySuffix.test(value)) return value.split('-')[0];
  if (numericOnly.test(value)) return value;
  return value;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 FONCTIONS UTILITAIRES DE RÉÉCRITURE
// ═══════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════
// 🔄 Réécriture utilise maintenant le système universel rewriteJsonReferences
// La fonction ancienne rewriteIdsInJson est remplacée par rewriteJsonReferences
// ═══════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════
// 🔄 FONCTION PRINCIPALE DE COPIE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Copie une table avec toutes ses colonnes, lignes et cellules
 * 
 * PROCESSUS :
 * -----------
 * 1. Vérifier le cache (éviter doublons)
 * 2. Récupérer la table originale + colonnes + lignes + cellules
 * 3. Générer les nouveaux IDs avec suffixe
 * 4. Créer la nouvelle table
 * 5. Copier toutes les colonnes
 * 6. Copier toutes les lignes
 * 7. Copier toutes les cellules
 * 8. Mettre à jour linkedTableIds du nœud
 * 9. Synchroniser les paramètres de capacité
 * 10. Mettre en cache
 * 
 * @param originalTableId - ID de la table à copier
 * @param newNodeId - ID du nouveau nœud propriétaire
 * @param suffix - Suffixe numérique à appliquer
 * @param prisma - Instance Prisma Client
 * @param options - Options avec nodeIdMap
 * @returns Résultat de la copie
 * 
 * @example
 * const result = await copyTableCapacity(
 *   'table-abc',
 *   'node-xyz-1',
 *   1,
 *   prisma,
 *   { nodeIdMap: new Map([['node-a', 'node-a-1']]) }
 * );
 * // result.newTableId = 'table-abc-1'
 * // result.columnsCount = 3
 * // result.rowsCount = 5
 * // result.cellsCount = 15
 */
export async function copyTableCapacity(
  originalTableId: string,
  newNodeId: string,
  suffix: number,
  prisma: PrismaClient,
  options: CopyTableOptions = {}
): Promise<CopyTableResult> {
  
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`📊 COPIE TABLE: ${originalTableId}`);
  console.log(`   Suffixe: ${suffix}`);
  console.log(`   Nouveau nœud: ${newNodeId}`);
  console.log(`${'═'.repeat(80)}\n`);

  const {
    nodeIdMap = new Map(),
    tableCopyCache = new Map(),
    tableIdMap = new Map()
  } = options;

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // 🔍 ÉTAPE 1 : Vérifier le cache
    // ═══════════════════════════════════════════════════════════════════════
    if (tableCopyCache.has(originalTableId)) {
      const cachedId = tableCopyCache.get(originalTableId)!;
      console.log(`♻️ Table déjà copiée (cache): ${originalTableId} → ${cachedId}`);
      
      const cached = await prisma.treeBranchLeafNodeTable.findUnique({
        where: { id: cachedId },
        include: {
          tableColumns: true,
          tableRows: true
        }
      });
      
      if (cached) {
        // Compter le total des cellules depuis les rows
        let totalCells = 0;
        for (const row of cached.tableRows) {
          const cells = (row.cells as any) || [];
          totalCells += Array.isArray(cells) ? cells.length : Object.keys(cells).length;
        }
        
        return {
          newTableId: cached.id,
          nodeId: cached.nodeId,
          columnsCount: cached.tableColumns.length,
          rowsCount: cached.tableRows.length,
          cellsCount: totalCells,
          success: true
        };
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📥 ÉTAPE 2 : Récupérer la table originale PAR ID (enlever suffixe si présent) + sous-entités
    // ═══════════════════════════════════════════════════════════════════════
    // originalTableId peut contenir un suffixe si c'est déjà une copie
    // On enlève le suffixe pour trouver l'original
    const cleanTableId = originalTableId.replace(/-\d+$/, '');
    console.log(`🔍 Recherche table avec id: ${cleanTableId} (original: ${originalTableId})`);
    
    const originalTable = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: cleanTableId },
      include: {
        tableColumns: { orderBy: { columnIndex: 'asc' } },
        tableRows: { orderBy: { rowIndex: 'asc' } }
      }
    });

    if (!originalTable) {
      console.error(`❌ Table introuvable avec id: ${cleanTableId}`);
      return {
        newTableId: '',
        nodeId: '',
        columnsCount: 0,
        rowsCount: 0,
        cellsCount: 0,
        success: false,
        error: `Table introuvable avec id: ${cleanTableId}`
      };
    }

    console.log(`✅ Table trouvée: ${originalTable.name || originalTable.id}`);
    console.log(`   NodeId original: ${originalTable.nodeId}`);
    console.log(`   Colonnes: ${originalTable.tableColumns.length}`);
    console.log(`   Lignes: ${originalTable.tableRows.length}`);
    
    // Compter le total des cellules depuis les rows
    let originalTotalCells = 0;
    for (const row of originalTable.tableRows) {
      const cells = (row.cells as any) || [];
      originalTotalCells += Array.isArray(cells) ? cells.length : Object.keys(cells).length;
    }
    console.log(`   Cellules (total): ${originalTotalCells}`);

    // ═══════════════════════════════════════════════════════════════════════
    // 🆔 ÉTAPE 3 : Générer les nouveaux IDs (pour la table elle-même)
    // ═══════════════════════════════════════════════════════════════════════
    // On utilise l'id original de la table avec suffixe
    const newTableId = `${originalTable.id}-${suffix}`;
    console.log(`📝 Nouvel ID table: ${newTableId}`);

    // Maps pour les sous-entités (colonne/ligne/cellule)
    const columnIdMap = new Map<string, string>();
    const rowIdMap = new Map<string, string>();

    // ═══════════════════════════════════════════════════════════════════════
    // 💾 ÉTAPE 4 : Créer (ou mettre à jour) la nouvelle table — idempotent
    // ═══════════════════════════════════════════════════════════════════════
    let newTable = await prisma.treeBranchLeafNodeTable.findUnique({ where: { id: newTableId } });
    if (newTable) {
      newTable = await prisma.treeBranchLeafNodeTable.update({
        where: { id: newTableId },
        data: {
          nodeId: newNodeId,
          name: originalTable.name ? `${originalTable.name}-${suffix}` : null,
          description: originalTable.description,
          type: originalTable.type,
          meta: (() => {
            const rewriteMaps: RewriteMaps = { nodeIdMap, formulaIdMap: new Map(), conditionIdMap: new Map(), tableIdMap };
            return rewriteJsonReferences(originalTable.meta, rewriteMaps, suffix);
          })(),
          updatedAt: new Date()
        }
      });
    } else {
      newTable = await prisma.treeBranchLeafNodeTable.create({
        data: {
          id: newTableId,
          nodeId: newNodeId,
          organizationId: originalTable.organizationId,
          name: originalTable.name ? `${originalTable.name}-${suffix}` : null,
          description: originalTable.description,
          type: originalTable.type,
          meta: (() => {
            const rewriteMaps: RewriteMaps = { nodeIdMap, formulaIdMap: new Map(), conditionIdMap: new Map(), tableIdMap };
            return rewriteJsonReferences(originalTable.meta, rewriteMaps);
          })(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    console.log(`✅ Table créée: ${newTable.id}`);

    // ═══════════════════════════════════════════════════════════════════════
    // 📋 ÉTAPE 5 : Copier toutes les colonnes (EXACT comme copy-table-final.cjs)
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`\n📋 Copie de ${originalTable.tableColumns.length} colonnes...`);
    
    // Utiliser une query brute pour obtenir les colonnes (même pattern que le script)
    // ⚠️ NE PAS copier config - juste les champs de base !
    const originalColumnsRaw = await prisma.$queryRaw<any[]>`
      SELECT "id", "tableId", "columnIndex", "name", "type", "width", "format", "metadata"
      FROM "TreeBranchLeafNodeTableColumn"
      WHERE "tableId" = ${originalTable.id}
      ORDER BY "columnIndex" ASC
    `;

    let columnsCount = 0;
    for (const col of originalColumnsRaw) {
      try {
        // Générer un ID unique (pas de suffixe)
        const newColumnId = `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
        columnIdMap.set(col.id, newColumnId);

        // Normaliser le nom de colonne : ne pas suffixer les valeurs purement numériques
        // (ex: "5-1" → "5"), mais conserver les noms textuels (ex: "Orientation-1")
        const normalizedName = (() => {
          const raw = col.name as string | null;
          if (!raw) return raw;
          const stripped = stripNumericSuffix(raw);
          return stripped ?? raw; // noms textuels conservés (Orientation-1, etc.)
        })();

        // Créer directement - SANS réécrire le metadata/config (comme le script)
        await prisma.treeBranchLeafNodeTableColumn.create({
          data: {
            id: newColumnId,
            tableId: newTableId,
            columnIndex: col.columnIndex,
            name: normalizedName,
            type: col.type || 'text',
            width: col.width,
            format: col.format,
            metadata: col.metadata  // Copie brute, pas de réécriture
          }
        });

        columnsCount++;
        console.log(`  ✓ [${col.columnIndex}] "${col.name}" → ${newColumnId}`);
      } catch (e) {
        console.warn(`  ⚠️ [${col.columnIndex}] Erreur: ${(e as Error).message.split('\n')[0].substring(0, 80)}`);
      }
    }

    console.log(`✅ ${columnsCount} colonnes copiées`);

    // ═══════════════════════════════════════════════════════════════════════
    // 📄 ÉTAPE 6 : Copier toutes les lignes (EXACT comme copy-table-final.cjs)
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`\n📄 Copie de ${originalTable.tableRows.length} lignes...`);
    
    // Utiliser une query brute pour obtenir les lignes (même pattern que le script)
    // ⚠️ NE PAS copier metadata - juste les cells !
    const originalRowsRaw = await prisma.$queryRaw<any[]>`
      SELECT "id", "tableId", "rowIndex", "cells"
      FROM "TreeBranchLeafNodeTableRow"
      WHERE "tableId" = ${originalTable.id}
      ORDER BY "rowIndex" ASC
    `;

    let rowsCount = 0;
    for (const row of originalRowsRaw) {
      try {
        // Générer un ID unique (pas de suffixe)
        const newRowId = `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
        rowIdMap.set(row.id, newRowId);

        // Créer directement - SANS réécrire les cells (comme le script)
        await prisma.treeBranchLeafNodeTableRow.create({
          data: {
            id: newRowId,
            tableId: newTableId,
            rowIndex: row.rowIndex,
            cells: row.cells  // Copie brute, pas de réécriture
          }
        });

        rowsCount++;
        if (rowsCount % 5 === 0) {
          console.log(`  ✓ ${rowsCount}/${originalRowsRaw.length} lignes copiées...`);
        }
      } catch (e) {
        console.warn(`  ⚠️ [${row.rowIndex}] Erreur: ${(e as Error).message.split('\n')[0].substring(0, 80)}`);
      }
    }

    console.log(`✅ ${rowsCount} lignes copiées`);

    // ═══════════════════════════════════════════════════════════════════════
    // 🧹 ÉTAPE 6bis : Normaliser les noms de colonnes pour retirer les suffixes numériques
    // ═══════════════════════════════════════════════════════════════════════
    try {
      const cols = await prisma.treeBranchLeafNodeTableColumn.findMany({
        where: { tableId: newTableId },
        select: { id: true, name: true }
      });
      for (const c of cols) {
        const cleaned = stripNumericSuffix(c.name);
        if (cleaned !== c.name) {
          await prisma.treeBranchLeafNodeTableColumn.update({
            where: { id: c.id },
            data: { name: cleaned }
          });
        }
      }
      console.log(`✅ Noms de colonnes normalisés (suffixes numériques retirés)`);
    } catch (e) {
      console.warn(`⚠️ Normalisation des noms de colonnes échouée:`, (e as Error).message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔢 ÉTAPE 7 : Mettre à jour les métadonnées rowCount et columnCount
    // ═══════════════════════════════════════════════════════════════════════
    await prisma.treeBranchLeafNodeTable.update({
      where: { id: newTableId },
      data: {
        rowCount: rowsCount,
        columnCount: columnsCount,
        updatedAt: new Date()
      }
    });

    console.log(`✅ Métadonnées mises à jour:`);
    console.log(`   - rowCount: ${rowsCount}`);
    console.log(`✅ Table créée: ${newTable.id}`);

    // ═══════════════════════════════════════════════════════════════════════
    // 🔗 ÉTAPE 4 : LIAISON AUTOMATIQUE OBLIGATOIRE
    // ═══════════════════════════════════════════════════════════════════════
    // ⚡ UTILISATION DU SYSTÈME UNIVERSEL DE LIAISON
    // On lie avec la version RÉÉCRITE (ids suffixés) pour couvrir tous les champs
    const rewriteMaps: RewriteMaps = { nodeIdMap, formulaIdMap: new Map(), conditionIdMap: new Map(), tableIdMap };
    let rewrittenTableData = rewriteJsonReferences(originalTable.tableData, rewriteMaps, suffix);
    
    // ═══════════════════════════════════════════════════════════════════════
    // 🔥 RÉÉCRITURE FORCÉE DES SHARED-REFS DANS LA TABLE
    // ═══════════════════════════════════════════════════════════════════════
    // Forcer TOUS les @value.shared-ref-* même imbriqués dans les cellules/colonnes
    console.log(`\n🔥 RÉÉCRITURE FORCÉE des shared-refs dans tableData...`);
    rewrittenTableData = forceSharedRefSuffixesInJson(rewrittenTableData, suffix);
    
    try {
      await linkTableToAllNodes(prisma, newTableId, rewrittenTableData);
    } catch (e) {
      console.error(`❌ Erreur LIAISON AUTOMATIQUE:`, (e as Error).message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔗 ÉTAPE 4B : Mettre à jour linkedTableIds du nœud propriétaire
    // ═══════════════════════════════════════════════════════════════════════
    try {
      await addToNodeLinkedField(prisma, newNodeId, 'linkedTableIds', [newTableId]);
      console.log(`✅ linkedTableIds mis à jour pour nœud propriétaire ${newNodeId}`);
    } catch (e) {
      console.warn(`⚠️ Erreur MAJ linkedTableIds du propriétaire:`, (e as Error).message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📝 ÉTAPE 9 : Synchroniser les paramètres de capacité + copier table_instances
    // ═══════════════════════════════════════════════════════════════════════
    try {
      // Récupérer le nœud original pour copier table_instances
      const originalNode = await prisma.treeBranchLeafNode.findUnique({
        where: { id: originalTable.nodeId },
        select: {
          table_activeId: true,
          table_instances: true
        }
      });

      console.log(`🔍 Nœud original trouvé, récupération table_instances...`);
      console.log(`   - table_activeId original: ${originalNode?.table_activeId}`);
      console.log(`   - table_instances:`, originalNode?.table_instances ? Object.keys(originalNode.table_instances as any).length + ' clés' : 'null');

      // Copier table_instances en remappant les clés (ancien tableId → nouveau tableId)
      let newTableInstances: Record<string, any> = {};
      if (originalNode?.table_instances && typeof originalNode.table_instances === 'object') {
        const originalInstances = originalNode.table_instances as Record<string, any>;
        
        for (const [tableId, config] of Object.entries(originalInstances)) {
          // Remapper l'ID de la table
          const mappedTableId = tableIdMap.has(tableId) ? tableIdMap.get(tableId)! : `${tableId}-${suffix}`;
          
          // Remapper les IDs dans la config (au cas où il y aurait des références)
          const remappedConfig = rewriteJsonReferences(config, rewriteMaps, suffix);
          
          newTableInstances[mappedTableId] = remappedConfig;
          console.log(`   📋 Instance remappée: ${tableId} → ${mappedTableId}`);
        }
      }

      // Déterminer la nouvelle table_activeId
      const oldActiveId = originalNode?.table_activeId;
      let newActiveId = newTableId; // Par défaut, la nouvelle table devient active
      
      if (oldActiveId && tableIdMap.has(oldActiveId)) {
        newActiveId = tableIdMap.get(oldActiveId)!;
        console.log(`   🔄 table_activeId remappée: ${oldActiveId} → ${newActiveId}`);
      } else if (oldActiveId) {
        newActiveId = `${oldActiveId}-${suffix}`;
      }

      // Ajouter la nouvelle table aux instances si pas déjà là
      if (!newTableInstances[newTableId]) {
        newTableInstances[newTableId] = {};
        console.log(`   ✅ Instance ajoutée pour nouvelle table: ${newTableId}`);
      }

      // Mettre à jour le nœud copié avec tous les paramètres
      await prisma.treeBranchLeafNode.update({
        where: { id: newNodeId },
        data: {
          hasTable: true,
          table_activeId: newTableId,  // ✅ La nouvelle table est l'active
          table_instances: newTableInstances as any,  // ✅ Copié et remappé
          table_name: newTable.name,
          table_description: newTable.description,
          table_type: newTable.type
        }
      });
      console.log(`✅ Paramètres capacité (table) mis à jour pour nœud ${newNodeId}`);
      console.log(`   - table_activeId: ${newTableId}`);
      console.log(`   - table_instances: ${Object.keys(newTableInstances).length} clé(s) copiée(s)`);
      console.log(`   - table_name: ${newTable.name || 'null'}`);
      console.log(`   - table_type: ${newTable.type || 'null'}`);
    } catch (e) {
      console.warn(`⚠️ Erreur lors de la mise à jour des paramètres capacité:`, (e as Error).message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🎯 ÉTAPE 10 (NOUVELLE) : Mettre à jour table_activeId + table_instances sur les nœuds selectors
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`🎯 ÉTAPE 10: Activation des selectors avec lookup`);
    console.log(`${'═'.repeat(80)}`);
    // Selectors mis à jour automatiquement via ÉTAPE 9
    console.log(`✅ ÉTAPE 10: Selectors mis à jour via l'ÉTAPE 9`);

    // ═══════════════════════════════════════════════════════════════════════
    // 🔗 ÉTAPE 11 : Mettre en cache
    // ═══════════════════════════════════════════════════════════════════════
    tableCopyCache.set(originalTableId, newTableId);

    console.log(`\n${'═'.repeat(80)}`);
    console.log(`✅ COPIE TABLE TERMINÉE`);
    console.log(`   📊 Table: ${newTableId}`);
    console.log(`   📋 Colonnes: ${originalTable.tableColumns.length}`);
    console.log(`   📄 Lignes: ${originalTable.tableRows.length}`);
    console.log(`   🔢 Cellules: ${cellsCopied}`);
    console.log(`${'═'.repeat(80)}\n`);

    return {
      newTableId,
      nodeId: newNodeId,
      columnsCount: originalTable.tableColumns.length,
      rowsCount: originalTable.tableRows.length,
      cellsCount: cellsCopied,
      success: true
    };

  } catch (error) {
    console.error(`❌ Erreur lors de la copie de la table:`, error);
    return {
      newTableId: '',
      nodeId: '',
      columnsCount: 0,
      rowsCount: 0,
      cellsCount: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 FONCTIONS UTILITAIRES POUR LINKED FIELDS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ajoute des IDs à un champ linked... d'un nœud (sans doublons)
 */
async function addToNodeLinkedField(
  prisma: PrismaClient,
  nodeId: string,
  field: 'linkedFormulaIds' | 'linkedConditionIds' | 'linkedTableIds' | 'linkedVariableIds',
  idsToAdd: string[]
): Promise<void> {
  if (!idsToAdd || idsToAdd.length === 0) return;

  const node = await prisma.treeBranchLeafNode.findUnique({
    where: { id: nodeId },
    select: { [field]: true }
  });

  if (!node) {
    console.warn(`⚠️ Nœud ${nodeId} introuvable pour MAJ ${field}`);
    return;
  }

  const current = (node[field] || []) as string[];
  const newIds = [...new Set([...current, ...idsToAdd])]; // Dédupliquer

  await prisma.treeBranchLeafNode.update({
    where: { id: nodeId },
    data: { [field]: { set: newIds } }
  });
}
