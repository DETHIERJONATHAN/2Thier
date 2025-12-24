import { PrismaClient, type Prisma } from '@prisma/client';
import type { DuplicationContext } from '../../registry/repeat-id-registry.js';
import { logCapacityEvent } from '../repeat-blueprint-writer.js';
import { deriveRepeatContextFromMetadata } from './repeat-context-utils.js';
import { copyFormulaCapacity } from '../../copy-capacity-formula.js';

/**
 * Service pour corriger la copie des capacitÃƒÂ©s manquantes dans les nÃ…â€œuds dupliquÃƒÂ©s
 * 
 * Ce service s'assure que:
 * 1. Tous les nÃ…â€œuds copiÃƒÂ©s ont leurs capacitÃƒÂ©s (formules, conditions, tables) correctement dupliquÃƒÂ©es
 * 2. Les capacitÃƒÂ©s copiÃƒÂ©es ont des suffixes appropriÃƒÂ©s
 * 3. Les rÃƒÂ©fÃƒÂ©rences dans les capacitÃƒÂ©s pointent vers les nÃ…â€œuds copiÃƒÂ©s, pas les originaux
 * 4. Les flags hasFormula/hasCondition/hasTable sont cohÃƒÂ©rents avec les capacitÃƒÂ©s rÃƒÂ©elles
 */

export interface CapacityCopyResult {
  nodeId: string;
  nodeLabel: string | null;
  capacitiesFixed: {
    formulas: number;
    conditions: number;
    tables: number;
  };
  flagsUpdated: {
    hasFormula: boolean;
    hasCondition: boolean;
    hasTable: boolean;
  };
}

export interface CapacityCopyReport {
  totalNodesProcessed: number;
  nodesFixed: CapacityCopyResult[];
  errors: Array<{ nodeId: string; error: string }>;
}

/**
 * Copie les capacitÃƒÂ©s manquantes d'un nÃ…â€œud original vers son nÃ…â€œud copiÃƒÂ©
 */
export async function copyMissingCapacities(
  prisma: PrismaClient,
  originalNodeId: string,
  copiedNodeId: string,
  suffix: string = '-1',
  repeatContext?: DuplicationContext,
  nodeIdMap?: Map<string, string>
): Promise<CapacityCopyResult> {

  // 1. RÃƒÂ©cupÃƒÂ©rer le nÃ…â€œud original avec toutes ses capacitÃƒÂ©s
  const originalNode = await prisma.treeBranchLeafNode.findUnique({
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
  });

  if (!originalNode) {
    throw new Error(`NÃ…â€œud original ${originalNodeId} non trouvÃƒÂ©`);
  }

  // 2. RÃƒÂ©cupÃƒÂ©rer le nÃ…â€œud copiÃƒÂ©
  const copiedNode = await prisma.treeBranchLeafNode.findUnique({
    where: { id: copiedNodeId }
  });

  if (!copiedNode) {
    throw new Error(`NÃ…â€œud copiÃƒÂ© ${copiedNodeId} non trouvÃƒÂ©`);
  }

  const result: CapacityCopyResult = {
    nodeId: copiedNodeId,
    nodeLabel: copiedNode.label,
    capacitiesFixed: {
      formulas: 0,
      conditions: 0,
      tables: 0
    },
    flagsUpdated: {
      hasFormula: false,
      hasCondition: false,
      hasTable: false
    }
  };

  // 3. Copier les formules via copyFormulaCapacity (centralisÃƒÂ©)
  const formulaIdMap = new Map<string, string>();
  const suffixNum = parseInt(suffix.replace('-', '')) || 1;
  
  // Ã°Å¸â€Â§ Construire le nodeIdMap si pas fourni
  // Cela permet de remapper les rÃƒÂ©fÃƒÂ©rences internes dans les formules
  let workingNodeIdMap = nodeIdMap;
  if (!workingNodeIdMap) {
    workingNodeIdMap = new Map<string, string>();
    
    // Chercher tous les nodes du mÃƒÂªme arbre ET suffixÃƒÂ©s
    const treeId = copiedNode.treeId;
    if (treeId) {
      const allNodesInTree = await prisma.treeBranchLeafNode.findMany({
        where: { treeId },
        select: { id: true }
      });
      
      // Pour chaque node, vÃƒÂ©rifier si la version suffixÃƒÂ©e existe
      const baseNodeId = originalNodeId.replace(/-\d+$/, ''); // Retirer suffixe ÃƒÂ©ventuel
      
      for (const node of allNodesInTree) {
        // Si c'est un node suffixÃƒÂ© (finit par -1, -2, etc.)
        if (node.id.match(/-\d+$/)) {
          const baseId = node.id.replace(/-\d+$/, '');
          if (!workingNodeIdMap.has(baseId)) {
            workingNodeIdMap.set(baseId, node.id);
          }
        }
      }
    }
  }
  
  for (const formula of originalNode.TreeBranchLeafNodeFormula) {
    try {
      // Utiliser copyFormulaCapacity pour avoir la rÃƒÂ©ÃƒÂ©criture complÃƒÂ¨te avec suffixes
      const formulaResult = await copyFormulaCapacity(
        formula.id,
        copiedNodeId,
        suffixNum,
        prisma,
        { 
          formulaIdMap,
          nodeIdMap: workingNodeIdMap
        }
      );

      if (formulaResult.success) {
        formulaIdMap.set(formula.id, formulaResult.newFormulaId);
        result.capacitiesFixed.formulas++;

        if (repeatContext) {
          logCapacityEvent({
            ownerNodeId: copiedNodeId,
            capacityId: formulaResult.newFormulaId,
            capacityType: 'formula',
            context: repeatContext
          });
        }
      } else {
        console.error(`   Ã¢ÂÅ’ Erreur copie formule: ${formula.id}`);
      }
    } catch (error) {
      console.error(`   Ã¢ÂÅ’ Exception copie formule ${formula.id}:`, error);
    }
  }

  // 4. Copier les conditions
  for (const condition of originalNode.TreeBranchLeafNodeCondition) {
    const newConditionId = `${condition.id}${suffix}`;
    const conditionName = condition.name ? `${condition.name}${suffix}` : condition.name;

    // VÃƒÂ©rifier si la condition existe dÃƒÂ©jÃƒÂ 
    const existingCondition = await prisma.treeBranchLeafNodeCondition.findUnique({
      where: { id: newConditionId }
    });

    if (!existingCondition) {
      // Adapter le conditionSet pour pointer vers les nÃ…â€œuds copiÃƒÂ©s
      const adaptedConditionSet = adaptConditionSetForCopiedNode(condition.conditionSet, suffix);

      await prisma.treeBranchLeafNodeCondition.create({
        data: {
          id: newConditionId,
          nodeId: copiedNodeId,
          organizationId: condition.organizationId,
          name: conditionName,
          conditionSet: adaptedConditionSet as Prisma.InputJsonValue,
          description: condition.description,
          isDefault: condition.isDefault,
          order: condition.order
        }
      });

      if (repeatContext) {
        logCapacityEvent({
          ownerNodeId: copiedNodeId,
          capacityId: newConditionId,
          capacityType: 'condition',
          context: repeatContext
        });
      }

      result.capacitiesFixed.conditions++;
    }
  }

  // 5. Copier les tables
  for (const table of originalNode.TreeBranchLeafNodeTable) {
    const newTableId = `${table.id}${suffix}`;
    const tableName = table.name ? `${table.name}${suffix}` : table.name;

    // VÃƒÂ©rifier si la table existe dÃƒÂ©jÃƒÂ 
    const existingTable = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: newTableId }
    });

    if (!existingTable) {
      await prisma.treeBranchLeafNodeTable.create({
        data: {
          id: newTableId,
          nodeId: copiedNodeId,
          organizationId: table.organizationId,
          name: tableName,
          description: table.description,
          type: table.type,
          rowCount: table.rowCount,
          columnCount: table.columnCount,
          // Ã°Å¸â€Â§ TRAITER LE meta: suffix les rÃƒÂ©fÃƒÂ©rences aux nodes ET comparisonColumn
          meta: (() => {
            if (!table.meta) {
              return table.meta as Prisma.InputJsonValue;
            }
            try {
              const metaObj = typeof table.meta === 'string' ? JSON.parse(table.meta) : JSON.parse(JSON.stringify(table.meta));
              const suffixNum = parseInt(suffix.replace('-', '')) || 1;
              
              // Ã°Å¸â€Â¢ COPIE TABLE META: suffixer comparisonColumn si c'est du texte
              if (metaObj?.lookup?.rowSourceOption?.comparisonColumn) {
                const val = metaObj.lookup.rowSourceOption.comparisonColumn;
                if (!/^-?\d+(\.\d+)?$/.test(val.trim())) {
                  metaObj.lookup.rowSourceOption.comparisonColumn = `${val}${suffix}`;
                }
              }
              if (metaObj?.lookup?.columnSourceOption?.comparisonColumn) {
                const val = metaObj.lookup.columnSourceOption.comparisonColumn;
                if (!/^-?\d+(\.\d+)?$/.test(val.trim())) {
                  metaObj.lookup.columnSourceOption.comparisonColumn = `${val}${suffix}`;
                }
              }
              
              // Ã°Å¸â€Â¥ FIX: Suffixer displayColumn (peut ÃƒÂªtre string ou array)
              if (metaObj?.lookup?.displayColumn) {
                if (Array.isArray(metaObj.lookup.displayColumn)) {
                  metaObj.lookup.displayColumn = metaObj.lookup.displayColumn.map((col: string) => {
                    if (col && !/^-?\d+(\.\d+)?$/.test(col.trim()) && !col.endsWith(suffix)) {
                      return `${col}${suffix}`;
                    }
                    return col;
                  });
                } else if (typeof metaObj.lookup.displayColumn === 'string') {
                  const val = metaObj.lookup.displayColumn;
                  if (!/^-?\d+(\.\d+)?$/.test(val.trim()) && !val.endsWith(suffix)) {
                    metaObj.lookup.displayColumn = `${val}${suffix}`;
                  }
                }
              }
              
              // Ã°Å¸â€Â¥ FIX: Suffixer displayRow (peut ÃƒÂªtre string ou array)
              if (metaObj?.lookup?.displayRow) {
                if (Array.isArray(metaObj.lookup.displayRow)) {
                  metaObj.lookup.displayRow = metaObj.lookup.displayRow.map((row: string) => {
                    if (row && !/^-?\d+(\.\d+)?$/.test(row.trim()) && !row.endsWith(suffix)) {
                      return `${row}${suffix}`;
                    }
                    return row;
                  });
                } else if (typeof metaObj.lookup.displayRow === 'string') {
                  const val = metaObj.lookup.displayRow;
                  if (!/^-?\d+(\.\d+)?$/.test(val.trim()) && !val.endsWith(suffix)) {
                    metaObj.lookup.displayRow = `${val}${suffix}`;
                  }
                }
              }
              
              // Remplacer les UUIDs par leurs versions suffixÃƒÂ©s
              let str = JSON.stringify(metaObj);
              str = str.replace(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi, (uuid: string) => {
                if (workingNodeIdMap && workingNodeIdMap.has(uuid)) {
                  const mapped = workingNodeIdMap.get(uuid);
                  return mapped;
                }
                // Si pas dans la map et suffixe pas dÃƒÂ©jÃƒÂ  appliquÃƒÂ©, l'ajouter
                if (!uuid.match(/-\d+$/)) {
                  return `${uuid}-${suffixNum}`;
                }
                return uuid;
              });
              return JSON.parse(str) as Prisma.InputJsonValue;
            } catch {
              console.warn('[table.meta] Erreur traitement meta, copie tel quel');
              return table.meta as Prisma.InputJsonValue;
            }
          })(),
          isDefault: table.isDefault,
          order: table.order,
          lookupDisplayColumns: table.lookupDisplayColumns,
          lookupSelectColumn: table.lookupSelectColumn,
          // Copier les colonnes
          tableColumns: {
            create: table.tableColumns.map(col => ({
              id: `${col.id}${suffix}`,
              columnIndex: col.columnIndex,
              // Ã°Å¸â€Â¢ COPIE TABLE COLUMN: suffixe seulement pour texte, pas pour nombres
              name: col.name 
                ? (/^-?\d+(\.\d+)?$/.test(col.name.trim()) ? col.name : `${col.name}${suffix}`)
                : col.name,
              type: col.type,
              width: col.width,
              format: col.format,
              metadata: col.metadata as Prisma.InputJsonValue
            }))
          },
          // Copier les lignes
          tableRows: {
            create: table.tableRows.map(row => ({
              id: `${row.id}${suffix}`,
              rowIndex: row.rowIndex,
              cells: row.cells as Prisma.InputJsonValue
            }))
          }
        }
      });

      if (repeatContext) {
        logCapacityEvent({
          ownerNodeId: copiedNodeId,
          capacityId: newTableId,
          capacityType: 'table',
          context: repeatContext
        });
      }

      result.capacitiesFixed.tables++;
    }
  }

  // 6. Mettre ÃƒÂ  jour les flags du nÃ…â€œud copiÃƒÂ©
  const newFlags = {
    hasFormula: originalNode.TreeBranchLeafNodeFormula.length > 0,
    hasCondition: originalNode.TreeBranchLeafNodeCondition.length > 0,
    hasTable: originalNode.TreeBranchLeafNodeTable.length > 0
  };

  await prisma.treeBranchLeafNode.update({
    where: { id: copiedNodeId },
    data: {
      hasFormula: newFlags.hasFormula,
      hasCondition: newFlags.hasCondition,
      hasTable: newFlags.hasTable,
      // RÃƒÂ©initialiser la valeur calculÃƒÂ©e pour forcer un nouveau calcul
      calculatedValue: null,
      calculatedAt: null,
      calculatedBy: null
    }
  });

  result.flagsUpdated = newFlags;


  return result;
}

/**
 * Adapte les tokens d'une formule pour pointer vers les nÃ…â€œuds copiÃƒÂ©s
 */
function adaptTokensForCopiedNode(tokens: unknown, suffix: string): unknown {
  if (!tokens) return tokens;

  const adaptToken = (tokenStr: string): string => {
    // Remplacer les rÃƒÂ©fÃƒÂ©rences @value.nodeId par @value.nodeId-1
    return tokenStr.replace(/@value\.([A-Za-z0-9_:-]+)/g, (match, nodeId) => {
      // Ne pas ajouter de suffixe si c'est dÃƒÂ©jÃƒÂ  une rÃƒÂ©fÃƒÂ©rence partagÃƒÂ©e avec suffixe
      if (nodeId.includes('shared-ref') || nodeId.endsWith(suffix.replace('-', ''))) {
        return match;
      }
      return `@value.${nodeId}${suffix}`;
    });
  };

  if (Array.isArray(tokens)) {
    return tokens.map(token => 
      typeof token === 'string' ? adaptToken(token) : token
    );
  }

  if (typeof tokens === 'string') {
    return adaptToken(tokens);
  }

  // Pour les objets JSON complexes
  try {
    const str = JSON.stringify(tokens);
    const adapted = adaptToken(str);
    return JSON.parse(adapted);
  } catch {
    return tokens;
  }
}

/**
 * Adapte le conditionSet d'une condition pour pointer vers les nÃ…â€œuds copiÃƒÂ©s
 */
function adaptConditionSetForCopiedNode(conditionSet: unknown, suffix: string): unknown {
  if (!conditionSet) return conditionSet;

  try {
    let str = JSON.stringify(conditionSet);
    
    // Remplacer les rÃƒÂ©fÃƒÂ©rences @value.nodeId
    str = str.replace(/@value\.([A-Za-z0-9_:-]+)/g, (match, nodeId) => {
      if (nodeId.includes('shared-ref') || nodeId.endsWith(suffix.replace('-', ''))) {
        return match;
      }
      return `@value.${nodeId}${suffix}`;
    });

    // Remplacer les rÃƒÂ©fÃƒÂ©rences node-formula:
    str = str.replace(/node-formula:([a-f0-9-]{36})/gi, (match, formulaId) => {
      return `node-formula:${formulaId}${suffix}`;
    });

    const applySuffix = (value: unknown): unknown => {
      if (typeof value !== 'string') return value;
      return /-\d+$/.test(value) ? value : `${value}${suffix}`;
    };

    const suffixIds = (cs: any): any => {
      if (!cs || typeof cs !== 'object') return cs;
      const out: any = Array.isArray(cs) ? cs.map(suffixIds) : { ...cs };

      if (!Array.isArray(cs) && out.id) {
        out.id = applySuffix(out.id);
      }

      if (out.branches && Array.isArray(out.branches)) {
        out.branches = out.branches.map((branch: any) => {
          const b: any = { ...branch };
          if (b.id) b.id = applySuffix(b.id);
          if (b.actions && Array.isArray(b.actions)) {
            b.actions = b.actions.map((action: any) => {
              const a: any = { ...action };
              if (a.id) a.id = applySuffix(a.id);
              return a;
            });
          }
          return b;
        });
      }

      if (out.fallback && typeof out.fallback === 'object') {
        const fb: any = { ...out.fallback };
        if (fb.id) fb.id = applySuffix(fb.id);
        if (fb.actions && Array.isArray(fb.actions)) {
          fb.actions = fb.actions.map((action: any) => {
            const a: any = { ...action };
            if (a.id) a.id = applySuffix(a.id);
            return a;
          });
        }
        out.fallback = fb;
      }

      return out;
    };

    const parsed = JSON.parse(str);
    return suffixIds(parsed);
  } catch {
    return conditionSet;
  }
}

/**
 * Corrige toutes les capacitÃƒÂ©s manquantes pour les nÃ…â€œuds copiÃƒÂ©s d'un repeater
 */
export async function fixAllMissingCapacities(
  prisma: PrismaClient,
  repeaterNodeId?: string
): Promise<CapacityCopyReport> {

  const report: CapacityCopyReport = {
    totalNodesProcessed: 0,
    nodesFixed: [],
    errors: []
  };

  try {
    // Trouver tous les nÃ…â€œuds copiÃƒÂ©s avec des flags de capacitÃƒÂ© mais sans capacitÃƒÂ©s rÃƒÂ©elles
    const whereClause: Prisma.TreeBranchLeafNodeWhereInput = {
      AND: [
        { label: { endsWith: '-1' } },
        {
          OR: [
            { hasFormula: true },
            { hasCondition: true },
            { hasTable: true }
          ]
        }
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

    const problemNodes = await prisma.treeBranchLeafNode.findMany({
      where: whereClause,
      select: {
        id: true,
        label: true,
        hasFormula: true,
        hasCondition: true,
        hasTable: true,
        metadata: true,
        TreeBranchLeafNodeFormula: { select: { id: true } },
        TreeBranchLeafNodeCondition: { select: { id: true } },
        TreeBranchLeafNodeTable: { select: { id: true } }
      }
    });


    for (const node of problemNodes) {
      report.totalNodesProcessed++;

      try {
        const formulaMismatch = node.hasFormula && node.TreeBranchLeafNodeFormula.length === 0;
        const conditionMismatch = node.hasCondition && node.TreeBranchLeafNodeCondition.length === 0;
        const tableMismatch = node.hasTable && node.TreeBranchLeafNodeTable.length === 0;

        if (!formulaMismatch && !conditionMismatch && !tableMismatch) {
          continue;
        }


        // Trouver le nÃ…â€œud original
        let originalNodeId: string | null = null;
        const meta = node.metadata && typeof node.metadata === 'object'
          ? (node.metadata as Record<string, unknown>)
          : null;

        if (meta) {
          originalNodeId = (meta.sourceTemplateId as string) || (meta.copiedFromNodeId as string) || null;
        }

        // Si pas de mÃƒÂ©tadonnÃƒÂ©es, essayer de deviner l'original par le nom
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

        // Copier les capacitÃƒÂ©s manquantes
        const repeatContext = deriveRepeatContextFromMetadata(
          { id: node.id, metadata: node.metadata },
          {
            templateNodeId: originalNodeId,
            suffix: '-1',
            repeaterNodeId: meta?.duplicatedFromRepeater as string | undefined
          }
        );

        const result = await copyMissingCapacities(prisma, originalNodeId, node.id, '-1', repeatContext);
        report.nodesFixed.push(result);

      } catch (error) {
        report.errors.push({
          nodeId: node.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

  } catch (error) {
    console.error('Ã¢ÂÅ’ [CAPACITY-FIX] Erreur gÃƒÂ©nÃƒÂ©rale:', error);
  }

  return report;
}
