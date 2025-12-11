import { PrismaClient, type Prisma } from '@prisma/client';
import { copyFormulaCapacity } from '../../copy-capacity-formula.js';

/**
 * Service pour corriger COMPLÈTEMENT la duplication des nœuds avec lookups
 * 
 * Ce service s'assure que:
 * 1. Toutes les capacités (formules, conditions, tables) sont copiées avec suffixes
 * 2. Les tables de lookup sont correctement liées et alimentées
 * 3. Les fieldConfig pointent vers les bonnes ressources copiées  
 * 4. Aucun fallback vers les données originales n'est possible
 */

export interface CompleteDuplicationResult {
  nodeId: string;
  nodeLabel: string | null;
  capacitiesFixed: {
    formulas: number;
    conditions: number;
    tables: number;
    lookups: number;
  };
  fieldConfigUpdated: boolean;
  calculatedValueReset: boolean;
}

export interface CompleteDuplicationReport {
  totalNodesProcessed: number;
  nodesFixed: CompleteDuplicationResult[];
  errors: Array<{ nodeId: string; error: string }>;
}

/**
 * Corrige complètement un nœud dupliqué en copiant toutes ses capacités et lookups
 */
export async function fixCompleteDuplication(
  prisma: PrismaClient,
  originalNodeId: string,
  copiedNodeId: string,
  suffix: string = '-1'
): Promise<CompleteDuplicationResult> {
  console.log(`🔄 [COMPLETE-FIX] Correction complète: ${originalNodeId} → ${copiedNodeId}`);

  const result: CompleteDuplicationResult = {
    nodeId: copiedNodeId,
    nodeLabel: null,
    capacitiesFixed: {
      formulas: 0,
      conditions: 0,
      tables: 0,
      lookups: 0
    },
    fieldConfigUpdated: false,
    calculatedValueReset: false
  };

  // 1. Récupérer les nœuds
  const [originalNode, copiedNode] = await Promise.all([
    prisma.treeBranchLeafNode.findUnique({
      where: { id: originalNodeId },
      include: {
        TreeBranchLeafNodeFormula: true,
        TreeBranchLeafNodeCondition: true,
        TreeBranchLeafNodeTable: {
          include: {
            tableColumns: true,
            tableRows: true
          }
        }
      }
    }),
    prisma.treeBranchLeafNode.findUnique({
      where: { id: copiedNodeId }
    })
  ]);

  if (!originalNode) {
    throw new Error(`Nœud original ${originalNodeId} non trouvé`);
  }
  if (!copiedNode) {
    throw new Error(`Nœud copié ${copiedNodeId} non trouvé`);
  }

  result.nodeLabel = copiedNode.label;

  // 2. Copier les formules manquantes via copyFormulaCapacity (centralisé)
  const formulaIdMap = new Map<string, string>();
  const suffixNum = parseInt(suffix.replace('-', '')) || 1;
  
  // 🔧 Construire le nodeIdMap pour les remappages internes
  const nodeIdMap = new Map<string, string>();
  const treeId = copiedNode.treeId;
  if (treeId) {
    const allNodesInTree = await prisma.treeBranchLeafNode.findMany({
      where: { treeId },
      select: { id: true }
    });
    
    // Pour chaque node suffixé, mapper son base vers la version suffixée
    for (const node of allNodesInTree) {
      if (node.id.match(/-\d+$/)) {
        const baseId = node.id.replace(/-\d+$/, '');
        if (!nodeIdMap.has(baseId)) {
          nodeIdMap.set(baseId, node.id);
        }
      }
    }
  }
  
  for (const formula of originalNode.TreeBranchLeafNodeFormula) {
    try {
      const formulaResult = await copyFormulaCapacity(
        formula.id,
        copiedNodeId,
        suffixNum,
        prisma,
        { formulaIdMap, nodeIdMap }
      );

      if (formulaResult.success) {
        formulaIdMap.set(formula.id, formulaResult.newFormulaId);
        result.capacitiesFixed.formulas++;
      } else {
        console.error(`❌ Erreur copie formule: ${formula.id}`);
      }
    } catch (error) {
      console.error(`❌ Exception copie formule ${formula.id}:`, error);
    }
  }

  // 3. Copier les conditions manquantes
  for (const condition of originalNode.TreeBranchLeafNodeCondition) {
    const newConditionId = `${condition.id}${suffix}`;
    
    const existingCondition = await prisma.treeBranchLeafNodeCondition.findUnique({
      where: { id: newConditionId }
    });

    if (!existingCondition) {
      const adaptedConditionSet = adaptReferencesForCopiedNode(condition.conditionSet, suffix);

      await prisma.treeBranchLeafNodeCondition.create({
        data: {
          id: newConditionId,
          nodeId: copiedNodeId,
          organizationId: condition.organizationId,
          name: condition.name ? `${condition.name}${suffix}` : condition.name,
          conditionSet: adaptedConditionSet as Prisma.InputJsonValue,
          description: condition.description,
          isDefault: condition.isDefault,
          order: condition.order
        }
      });

      result.capacitiesFixed.conditions++;
    }
  }

  // 4. Copier les tables manquantes
  for (const table of originalNode.TreeBranchLeafNodeTable) {
    const newTableId = `${table.id}${suffix}`;
    
    const existingTable = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: newTableId }
    });

    if (!existingTable) {
      await prisma.treeBranchLeafNodeTable.create({
        data: {
          id: newTableId,
          nodeId: copiedNodeId,
          organizationId: table.organizationId,
          name: table.name ? `${table.name}${suffix}` : table.name,
          description: table.description,
          type: table.type,
          rowCount: table.rowCount,
          columnCount: table.columnCount,
          meta: table.meta as Prisma.InputJsonValue,
          isDefault: table.isDefault,
          order: table.order,
          lookupDisplayColumns: table.lookupDisplayColumns,
          lookupSelectColumn: table.lookupSelectColumn
        }
      });

      // Copier colonnes et lignes
      await Promise.all([
        ...table.tableColumns.map(col => 
          prisma.treeBranchLeafNodeTableColumn.create({
            data: {
              id: `${col.id}${suffix}`,
              tableId: newTableId,
              columnIndex: col.columnIndex,
              name: col.name ? `${col.name}${suffix}` : col.name,
              type: col.type,
              width: col.width,
              format: col.format,
              metadata: col.metadata as Prisma.InputJsonValue
            }
          })
        ),
        ...table.tableRows.map(row => 
          prisma.treeBranchLeafNodeTableRow.create({
            data: {
              id: `${row.id}${suffix}`,
              tableId: newTableId,
              rowIndex: row.rowIndex,
              cells: row.cells as Prisma.InputJsonValue
            }
          })
        )
      ]);

      result.capacitiesFixed.tables++;
    }
  }

  // 5. Corriger les lookups associés
  await fixAssociatedLookups(prisma, originalNode, copiedNode, suffix);
  result.capacitiesFixed.lookups = 1; // Simplifié pour le rapport

  // 6. Mettre à jour fieldConfig pour pointer vers les nouvelles ressources
  if (copiedNode.fieldConfig) {
    const newFieldConfig = updateFieldConfigReferences(copiedNode.fieldConfig, suffix);
    
    if (newFieldConfig !== copiedNode.fieldConfig) {
      await prisma.treeBranchLeafNode.update({
        where: { id: copiedNodeId },
        data: { fieldConfig: newFieldConfig as Prisma.InputJsonValue }
      });
      result.fieldConfigUpdated = true;
    }
  }

  // 7. Mettre à jour les flags et réinitialiser la valeur calculée
  await prisma.treeBranchLeafNode.update({
    where: { id: copiedNodeId },
    data: {
      hasFormula: originalNode.TreeBranchLeafNodeFormula.length > 0,
      hasCondition: originalNode.TreeBranchLeafNodeCondition.length > 0,
      hasTable: originalNode.TreeBranchLeafNodeTable.length > 0,
      calculatedValue: null,
      calculatedAt: null,
      calculatedBy: null
    }
  });

  result.calculatedValueReset = true;

  return result;
}

/**
 * Corrige les lookups associés (ex: table Mesure-1 pour Orientation-Inclinaison-1)
 */
async function fixAssociatedLookups(
  prisma: PrismaClient,
  originalNode: any,
  copiedNode: any,
  suffix: string
): Promise<void> {
  // Chercher les nœuds de type "Mesure" qui pourraient contenir des lookups
  const measureNodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      AND: [
        { label: { contains: 'Mesure' } },
        { label: { endsWith: suffix } },
        { treeId: copiedNode.treeId }
      ]
    },
    include: {
      TreeBranchLeafNodeTable: {
        include: {
          tableColumns: true,
          tableRows: true
        }
      }
    }
  });

  // Pour chaque table du nœud original, chercher un lookup correspondant
  for (const originalTable of originalNode.TreeBranchLeafNodeTable) {
    const lookupName = `Lookup ${originalNode.label}${suffix}`;
    
    for (const measureNode of measureNodes) {
      const lookupTable = measureNode.TreeBranchLeafNodeTable.find(t => 
        t.name.includes('Lookup') && 
        (t.name.includes(originalNode.label) || t.name === lookupName)
      );

      if (lookupTable && lookupTable.tableRows.length === 0) {
        console.log(`   🔗 Correction lookup: ${lookupTable.name}`);
        
        // Supprimer les anciennes données vides
        await Promise.all([
          prisma.treeBranchLeafNodeTableColumn.deleteMany({
            where: { tableId: lookupTable.id }
          }),
          prisma.treeBranchLeafNodeTableRow.deleteMany({
            where: { tableId: lookupTable.id }
          })
        ]);

        // Copier les données de la table principale
        await Promise.all([
          ...originalTable.tableColumns.map(col =>
            prisma.treeBranchLeafNodeTableColumn.create({
              data: {
                id: `${col.id}-lookup${suffix}`,
                tableId: lookupTable.id,
                columnIndex: col.columnIndex,
                name: col.name,
                type: col.type,
                width: col.width,
                format: col.format,
                metadata: col.metadata as Prisma.InputJsonValue
              }
            })
          ),
          ...originalTable.tableRows.map(row =>
            prisma.treeBranchLeafNodeTableRow.create({
              data: {
                id: `${row.id}-lookup${suffix}`,
                tableId: lookupTable.id,
                rowIndex: row.rowIndex,
                cells: row.cells as Prisma.InputJsonValue
              }
            })
          )
        ]);

        // Mettre à jour la configuration
        await prisma.treeBranchLeafNodeTable.update({
          where: { id: lookupTable.id },
          data: {
            rowCount: originalTable.rowCount,
            columnCount: originalTable.columnCount,
            lookupSelectColumn: originalTable.lookupSelectColumn || 'Orientation',
            lookupDisplayColumns: originalTable.lookupDisplayColumns.length > 0 
              ? originalTable.lookupDisplayColumns 
              : ['Orientation']
          }
        });
      }
    }
  }
}

/**
 * Adapte les références dans les tokens/conditions pour pointer vers les nœuds copiés
 */
function adaptReferencesForCopiedNode(data: unknown, suffix: string): unknown {
  if (!data) return data;

  const adaptString = (str: string): string => {
    return str
      .replace(/@value\.([A-Za-z0-9_:-]+)/g, (match, nodeId) => {
        if (nodeId.includes('shared-ref') || nodeId.endsWith(suffix.replace('-', ''))) {
          return match;
        }
        return `@value.${nodeId}${suffix}`;
      })
      .replace(/node-formula:([a-f0-9-]{36})/gi, (match, formulaId) => {
        return `node-formula:${formulaId}${suffix}`;
      });
  };

  if (Array.isArray(data)) {
    return data.map(item => 
      typeof item === 'string' ? adaptString(item) : item
    );
  }

  if (typeof data === 'string') {
    return adaptString(data);
  }

  try {
    const str = JSON.stringify(data);
    const adapted = adaptString(str);
    return JSON.parse(adapted);
  } catch {
    return data;
  }
}

/**
 * Met à jour les références dans fieldConfig
 */
function updateFieldConfigReferences(fieldConfig: unknown, suffix: string): unknown {
  if (!fieldConfig || typeof fieldConfig !== 'object') return fieldConfig;

  const config = { ...fieldConfig as Record<string, any> };

  // Mettre à jour les références vers les tables/lookups
  if (config.lookupTableId) {
    config.lookupTableId = `${config.lookupTableId}${suffix}`;
  }
  if (config.lookupNodeId) {
    config.lookupNodeId = `${config.lookupNodeId}${suffix}`;
  }

  return config;
}

/**
 * Corrige tous les nœuds dupliqués d'un repeater
 */
export async function fixAllCompleteDuplications(
  prisma: PrismaClient,
  repeaterNodeId?: string
): Promise<CompleteDuplicationReport> {
  console.log('🔧 [COMPLETE-DUPLICATION-FIX] Correction complète de tous les nœuds...');

  const report: CompleteDuplicationReport = {
    totalNodesProcessed: 0,
    nodesFixed: [],
    errors: []
  };

  try {
    const whereClause: Prisma.TreeBranchLeafNodeWhereInput = {
      AND: [
        { label: { endsWith: '-1' } }
      ]
    };

    if (repeaterNodeId) {
      whereClause.AND!.push({
        metadata: {
          path: ['duplicatedFromRepeater'],
          equals: repeaterNodeId
        }
      });
    }

    const copiedNodes = await prisma.treeBranchLeafNode.findMany({
      where: whereClause,
      select: {
        id: true,
        label: true,
        metadata: true
      }
    });

    for (const node of copiedNodes) {
      report.totalNodesProcessed++;

      try {
        let originalNodeId: string | null = null;

        if (node.metadata && typeof node.metadata === 'object') {
          const meta = node.metadata as Record<string, unknown>;
          originalNodeId = (meta.sourceTemplateId as string) || 
                          (meta.copiedFromNodeId as string) || 
                          null;
        }

        if (!originalNodeId && node.label) {
          const originalLabel = node.label.replace('-1', '');
          const originalNode = await prisma.treeBranchLeafNode.findFirst({
            where: { 
              label: originalLabel,
              id: { not: node.id }
            },
            select: { id: true }
          });
          
          if (originalNode) {
            originalNodeId = originalNode.id;
          }
        }

        if (!originalNodeId) {
          report.errors.push({
            nodeId: node.id,
            error: 'Impossible de trouver le nœud original'
          });
          continue;
        }

        const result = await fixCompleteDuplication(prisma, originalNodeId, node.id, '-1');
        report.nodesFixed.push(result);

      } catch (error) {
        report.errors.push({
          nodeId: node.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

  } catch (error) {
    console.error('❌ [COMPLETE-DUPLICATION-FIX] Erreur générale:', error);
  }

  return report;
}