import { PrismaClient, type Prisma } from '@prisma/client';
import type { DuplicationContext } from '../../registry/repeat-id-registry.js';
import { logCapacityEvent } from '../repeat-blueprint-writer.js';
import { deriveRepeatContextFromMetadata } from './repeat-context-utils.js';

/**
 * Service pour corriger la copie des capacités manquantes dans les nœuds dupliqués
 * 
 * Ce service s'assure que:
 * 1. Tous les nœuds copiés ont leurs capacités (formules, conditions, tables) correctement dupliquées
 * 2. Les capacités copiées ont des suffixes appropriés
 * 3. Les références dans les capacités pointent vers les nœuds copiés, pas les originaux
 * 4. Les flags hasFormula/hasCondition/hasTable sont cohérents avec les capacités réelles
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
 * Copie les capacités manquantes d'un nœud original vers son nœud copié
 */
export async function copyMissingCapacities(
  prisma: PrismaClient,
  originalNodeId: string,
  copiedNodeId: string,
  suffix: string = '-1',
  repeatContext?: DuplicationContext
): Promise<CapacityCopyResult> {
  console.log(`🔄 [CAPACITY-COPY] Copie des capacités: ${originalNodeId} → ${copiedNodeId}`);

  // 1. Récupérer le nœud original avec toutes ses capacités
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
    throw new Error(`Nœud original ${originalNodeId} non trouvé`);
  }

  // 2. Récupérer le nœud copié
  const copiedNode = await prisma.treeBranchLeafNode.findUnique({
    where: { id: copiedNodeId }
  });

  if (!copiedNode) {
    throw new Error(`Nœud copié ${copiedNodeId} non trouvé`);
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

  // 3. Copier les formules
  for (const formula of originalNode.TreeBranchLeafNodeFormula) {
    const newFormulaId = `${formula.id}${suffix}`;
    const formulaName = formula.name ? `${formula.name}${suffix}` : formula.name;

    // Vérifier si la formule existe déjà
    const existingFormula = await prisma.treeBranchLeafNodeFormula.findUnique({
      where: { id: newFormulaId }
    });

    if (!existingFormula) {
      // Adapter les tokens pour pointer vers les nœuds copiés
      const adaptedTokens = adaptTokensForCopiedNode(formula.tokens, suffix);

      await prisma.treeBranchLeafNodeFormula.create({
        data: {
          id: newFormulaId,
          nodeId: copiedNodeId,
          organizationId: formula.organizationId,
          name: formulaName,
          tokens: adaptedTokens as Prisma.InputJsonValue,
          description: formula.description,
          isDefault: formula.isDefault,
          order: formula.order
        }
      });

      if (repeatContext) {
        logCapacityEvent({
          ownerNodeId: copiedNodeId,
          capacityId: newFormulaId,
          capacityType: 'formula',
          context: repeatContext
        });
      }

      result.capacitiesFixed.formulas++;
      console.log(`   ✅ Formule copiée: ${formulaName}`);
    }
  }

  // 4. Copier les conditions
  for (const condition of originalNode.TreeBranchLeafNodeCondition) {
    const newConditionId = `${condition.id}${suffix}`;
    const conditionName = condition.name ? `${condition.name}${suffix}` : condition.name;

    // Vérifier si la condition existe déjà
    const existingCondition = await prisma.treeBranchLeafNodeCondition.findUnique({
      where: { id: newConditionId }
    });

    if (!existingCondition) {
      // Adapter le conditionSet pour pointer vers les nœuds copiés
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
      console.log(`   ✅ Condition copiée: ${conditionName}`);
    }
  }

  // 5. Copier les tables
  for (const table of originalNode.TreeBranchLeafNodeTable) {
    const newTableId = `${table.id}${suffix}`;
    const tableName = table.name ? `${table.name}${suffix}` : table.name;

    // Vérifier si la table existe déjà
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
          meta: table.meta as Prisma.InputJsonValue,
          isDefault: table.isDefault,
          order: table.order,
          lookupDisplayColumns: table.lookupDisplayColumns,
          lookupSelectColumn: table.lookupSelectColumn,
          // Copier les colonnes
          tableColumns: {
            create: table.tableColumns.map(col => ({
              id: `${col.id}${suffix}`,
              columnIndex: col.columnIndex,
              name: col.name ? `${col.name}${suffix}` : col.name,
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
      console.log(`   ✅ Table copiée: ${tableName} (${table.tableColumns.length} cols, ${table.tableRows.length} rows)`);
    }
  }

  // 6. Mettre à jour les flags du nœud copié
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
      // Réinitialiser la valeur calculée pour forcer un nouveau calcul
      calculatedValue: null,
      calculatedAt: null,
      calculatedBy: null
    }
  });

  result.flagsUpdated = newFlags;

  console.log(`   🎯 Flags mis à jour: hasFormula=${newFlags.hasFormula}, hasCondition=${newFlags.hasCondition}, hasTable=${newFlags.hasTable}`);

  return result;
}

/**
 * Adapte les tokens d'une formule pour pointer vers les nœuds copiés
 */
function adaptTokensForCopiedNode(tokens: unknown, suffix: string): unknown {
  if (!tokens) return tokens;

  const adaptToken = (tokenStr: string): string => {
    // Remplacer les références @value.nodeId par @value.nodeId-1
    return tokenStr.replace(/@value\.([A-Za-z0-9_:-]+)/g, (match, nodeId) => {
      // Ne pas ajouter de suffixe si c'est déjà une référence partagée avec suffixe
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
 * Adapte le conditionSet d'une condition pour pointer vers les nœuds copiés
 */
function adaptConditionSetForCopiedNode(conditionSet: unknown, suffix: string): unknown {
  if (!conditionSet) return conditionSet;

  try {
    let str = JSON.stringify(conditionSet);
    
    // Remplacer les références @value.nodeId
    str = str.replace(/@value\.([A-Za-z0-9_:-]+)/g, (match, nodeId) => {
      if (nodeId.includes('shared-ref') || nodeId.endsWith(suffix.replace('-', ''))) {
        return match;
      }
      return `@value.${nodeId}${suffix}`;
    });

    // Remplacer les références node-formula:
    str = str.replace(/node-formula:([a-f0-9-]{36})/gi, (match, formulaId) => {
      return `node-formula:${formulaId}${suffix}`;
    });

    return JSON.parse(str);
  } catch {
    return conditionSet;
  }
}

/**
 * Corrige toutes les capacités manquantes pour les nœuds copiés d'un repeater
 */
export async function fixAllMissingCapacities(
  prisma: PrismaClient,
  repeaterNodeId?: string
): Promise<CapacityCopyReport> {
  console.log('🔧 [CAPACITY-FIX] Correction des capacités manquantes...');

  const report: CapacityCopyReport = {
    totalNodesProcessed: 0,
    nodesFixed: [],
    errors: []
  };

  try {
    // Trouver tous les nœuds copiés avec des flags de capacité mais sans capacités réelles
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

    console.log(`🔍 Trouvé ${problemNodes.length} nœuds copiés à analyser`);

    for (const node of problemNodes) {
      report.totalNodesProcessed++;

      try {
        const formulaMismatch = node.hasFormula && node.TreeBranchLeafNodeFormula.length === 0;
        const conditionMismatch = node.hasCondition && node.TreeBranchLeafNodeCondition.length === 0;
        const tableMismatch = node.hasTable && node.TreeBranchLeafNodeTable.length === 0;

        if (!formulaMismatch && !conditionMismatch && !tableMismatch) {
          console.log(`✅ ${node.label}: Aucun problème de capacités`);
          continue;
        }

        console.log(`🚨 ${node.label}: Capacités manquantes détectées`);

        // Trouver le nœud original
        let originalNodeId: string | null = null;
        const meta = node.metadata && typeof node.metadata === 'object'
          ? (node.metadata as Record<string, unknown>)
          : null;

        if (meta) {
          originalNodeId = (meta.sourceTemplateId as string) || (meta.copiedFromNodeId as string) || null;
        }

        // Si pas de métadonnées, essayer de deviner l'original par le nom
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
            console.log(`💡 Nœud original deviné: ${originalLabel} (${originalNodeId})`);
          }
        }

        if (!originalNodeId) {
          report.errors.push({
            nodeId: node.id,
            error: 'Impossible de trouver le nœud original'
          });
          continue;
        }

        // Copier les capacités manquantes
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
    console.error('❌ [CAPACITY-FIX] Erreur générale:', error);
  }

  return report;
}