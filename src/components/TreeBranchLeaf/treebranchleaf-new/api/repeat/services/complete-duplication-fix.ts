import { PrismaClient, type Prisma } from '@prisma/client';
import { copyFormulaCapacity } from '../../copy-capacity-formula.js';

/**
 * Service pour corriger COMPLÃƒË†TEMENT la duplication des nÃ…â€œuds avec lookups
 * 
 * Ce service s'assure que:
 * 1. Toutes les capacitÃƒÂ©s (formules, conditions, tables) sont copiÃƒÂ©es avec suffixes
 * 2. Les tables de lookup sont correctement liÃƒÂ©es et alimentÃƒÂ©es
 * 3. Les fieldConfig pointent vers les bonnes ressources copiÃƒÂ©es  
 * 4. Aucun fallback vers les donnÃƒÂ©es originales n'est possible
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
 * Corrige complÃƒÂ¨tement un nÃ…â€œud dupliquÃƒÂ© en copiant toutes ses capacitÃƒÂ©s et lookups
 */
export async function fixCompleteDuplication(
  prisma: PrismaClient,
  originalNodeId: string,
  copiedNodeId: string,
  suffix: string = '-1'
): Promise<CompleteDuplicationResult> {

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
    throw new Error(`NÃ…â€œud original ${originalNodeId} non trouvÃƒÂ©`);
  }
  if (!copiedNode) {
    throw new Error(`NÃ…â€œud copiÃƒÂ© ${copiedNodeId} non trouvÃƒÂ©`);
  }

  result.nodeLabel = copiedNode.label;

  // 2. Copier les formules manquantes via copyFormulaCapacity (centralisÃƒÂ©)
  const formulaIdMap = new Map<string, string>();
  const suffixNum = parseInt(suffix.replace('-', '')) || 1;
  
  // Ã°Å¸â€Â§ Construire le nodeIdMap pour les remappages internes
  const nodeIdMap = new Map<string, string>();
  const treeId = copiedNode.treeId;
  if (treeId) {
    const allNodesInTree = await prisma.treeBranchLeafNode.findMany({
      where: { treeId },
      select: { id: true }
    });
    
    // Pour chaque node suffixÃƒÂ©, mapper son base vers la version suffixÃƒÂ©e
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
        console.error(`Ã¢ÂÅ’ Erreur copie formule: ${formula.id}`);
      }
    } catch (error) {
      console.error(`Ã¢ÂÅ’ Exception copie formule ${formula.id}:`, error);
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
          // Ã°Å¸â€Â¢ COPIE TABLE META: suffixer comparisonColumn et UUIDs si c'est du texte
          meta: (() => {
            if (!table.meta) return table.meta as Prisma.InputJsonValue;
            try {
              const metaObj = typeof table.meta === 'string' ? JSON.parse(table.meta) : JSON.parse(JSON.stringify(table.meta));
              const suffixNum = parseInt(suffix.replace('-', '')) || 1;
              // Suffixer les UUIDs dans selectors
              if (metaObj?.lookup?.selectors?.columnFieldId && !metaObj.lookup.selectors.columnFieldId.endsWith(`-${suffixNum}`)) {
                metaObj.lookup.selectors.columnFieldId = `${metaObj.lookup.selectors.columnFieldId}-${suffixNum}`;
              }
              if (metaObj?.lookup?.selectors?.rowFieldId && !metaObj.lookup.selectors.rowFieldId.endsWith(`-${suffixNum}`)) {
                metaObj.lookup.selectors.rowFieldId = `${metaObj.lookup.selectors.rowFieldId}-${suffixNum}`;
              }
              // Suffixer sourceField dans rowSourceOption
              if (metaObj?.lookup?.rowSourceOption?.sourceField && !metaObj.lookup.rowSourceOption.sourceField.endsWith(`-${suffixNum}`)) {
                metaObj.lookup.rowSourceOption.sourceField = `${metaObj.lookup.rowSourceOption.sourceField}-${suffixNum}`;
              }
              // Suffixer sourceField dans columnSourceOption
              if (metaObj?.lookup?.columnSourceOption?.sourceField && !metaObj.lookup.columnSourceOption.sourceField.endsWith(`-${suffixNum}`)) {
                metaObj.lookup.columnSourceOption.sourceField = `${metaObj.lookup.columnSourceOption.sourceField}-${suffixNum}`;
              }
              // Suffixer comparisonColumn dans rowSourceOption si c'est du texte
              if (metaObj?.lookup?.rowSourceOption?.comparisonColumn) {
                const val = metaObj.lookup.rowSourceOption.comparisonColumn;
                if (!/^-?\d+(\.\d+)?$/.test(val.trim()) && !val.endsWith(suffix)) {
                  metaObj.lookup.rowSourceOption.comparisonColumn = `${val}${suffix}`;
                }
              }
              // Suffixer comparisonColumn dans columnSourceOption si c'est du texte
              if (metaObj?.lookup?.columnSourceOption?.comparisonColumn) {
                const val = metaObj.lookup.columnSourceOption.comparisonColumn;
                if (!/^-?\d+(\.\d+)?$/.test(val.trim()) && !val.endsWith(suffix)) {
                  metaObj.lookup.columnSourceOption.comparisonColumn = `${val}${suffix}`;
                }
              }
              return metaObj as Prisma.InputJsonValue;
            } catch {
              return table.meta as Prisma.InputJsonValue;
            }
          })(),
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
              // Ã°Å¸â€Â¢ COPIE TABLE COLUMN: suffixe seulement pour texte, pas pour nombres
              name: col.name 
                ? (/^-?\d+(\.\d+)?$/.test(col.name.trim()) ? col.name : `${col.name}${suffix}`)
                : col.name,
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

  // 5. Corriger les lookups associÃƒÂ©s
  await fixAssociatedLookups(prisma, originalNode, copiedNode, suffix);
  result.capacitiesFixed.lookups = 1; // SimplifiÃƒÂ© pour le rapport

  // 6. Mettre ÃƒÂ  jour fieldConfig pour pointer vers les nouvelles ressources
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
  // 🔧 FIX 06/01/2026: Vérifier que les tables sont vraiment assignées au node copié
  // avant de mettre hasTable: true. Sinon un node comme Inclinaison-1 qui n'a pas de table
  // aura incorrectement hasTable: true
  const copiedNodeTables = await prisma.treeBranchLeafNodeTable.count({
    where: { nodeId: copiedNodeId }
  });
  
  await prisma.treeBranchLeafNode.update({
    where: { id: copiedNodeId },
    data: {
      hasFormula: originalNode.TreeBranchLeafNodeFormula.length > 0,
      hasCondition: originalNode.TreeBranchLeafNodeCondition.length > 0,
      hasTable: copiedNodeTables > 0,  // Vérifier les tables du node COPIÉ, pas de l'original
      calculatedValue: null,
      calculatedAt: null,
      calculatedBy: null
    }
  });

  result.calculatedValueReset = true;

  return result;
}

/**
 * Corrige les lookups associÃƒÂ©s (ex: table Mesure-1 pour Orientation-Inclinaison-1)
 */
async function fixAssociatedLookups(
  prisma: PrismaClient,
  originalNode: any,
  copiedNode: any,
  suffix: string
): Promise<void> {
  // Chercher les nÃ…â€œuds de type "Mesure" qui pourraient contenir des lookups
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

  // Pour chaque table du nÃ…â€œud original, chercher un lookup correspondant
  for (const originalTable of originalNode.TreeBranchLeafNodeTable) {
    const lookupName = `Lookup ${originalNode.label}${suffix}`;
    
    for (const measureNode of measureNodes) {
      const lookupTable = measureNode.TreeBranchLeafNodeTable.find(t => 
        t.name.includes('Lookup') && 
        (t.name.includes(originalNode.label) || t.name === lookupName)
      );

      if (lookupTable && lookupTable.tableRows.length === 0) {
        
        // Supprimer les anciennes donnÃƒÂ©es vides
        await Promise.all([
          prisma.treeBranchLeafNodeTableColumn.deleteMany({
            where: { tableId: lookupTable.id }
          }),
          prisma.treeBranchLeafNodeTableRow.deleteMany({
            where: { tableId: lookupTable.id }
          })
        ]);

        // Copier les donnÃƒÂ©es de la table principale
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

        // Mettre ÃƒÂ  jour la configuration
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
 * Adapte les rÃƒÂ©fÃƒÂ©rences dans les tokens/conditions pour pointer vers les nÃ…â€œuds copiÃƒÂ©s
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
 * Met ÃƒÂ  jour les rÃƒÂ©fÃƒÂ©rences dans fieldConfig
 */
function updateFieldConfigReferences(fieldConfig: unknown, suffix: string): unknown {
  if (!fieldConfig || typeof fieldConfig !== 'object') return fieldConfig;

  const config = { ...fieldConfig as Record<string, any> };

  // Mettre ÃƒÂ  jour les rÃƒÂ©fÃƒÂ©rences vers les tables/lookups
  if (config.lookupTableId) {
    config.lookupTableId = `${config.lookupTableId}${suffix}`;
  }
  if (config.lookupNodeId) {
    config.lookupNodeId = `${config.lookupNodeId}${suffix}`;
  }

  return config;
}

/**
 * Corrige tous les nÃ…â€œuds dupliquÃƒÂ©s d'un repeater
 */
export async function fixAllCompleteDuplications(
  prisma: PrismaClient,
  repeaterNodeId?: string
): Promise<CompleteDuplicationReport> {

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
            error: 'Impossible de trouver le nÃ…â€œud original'
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
    console.error('Ã¢ÂÅ’ [COMPLETE-DUPLICATION-FIX] Erreur gÃƒÂ©nÃƒÂ©rale:', error);
  }

  return report;
}
