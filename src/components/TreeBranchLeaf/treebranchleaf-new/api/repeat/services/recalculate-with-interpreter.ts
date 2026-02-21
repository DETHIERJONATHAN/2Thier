import { PrismaClient } from '@prisma/client';
import { interpretReference, identifyReferenceType } from '../../operation-interpreter';

/**
 * Ã°Å¸Å¡â‚¬ SERVICE: RECALCULATION DES CHAMPS APRÃƒË†S DUPLICATION
 * 
 * Ce service appelle l'OPERATION INTERPRETER pour recalculer
 * les vraies valeurs des champs copiÃƒÂ©s avec leurs capacitÃƒÂ©s
 * (formules, conditions, tables)
 */

export interface RecalculationResult {
  nodeId: string;
  label: string | null;
  hasCapacity: boolean;
  capacityType: 'formula' | 'condition' | 'table' | 'none';
  oldValue: string | null;
  newValue: string | null;
  recalculationSuccess: boolean;
  error?: string;
}

export interface RecalculationReport {
  totalNodes: number;
  recalculated: RecalculationResult[];
  errors: Array<{ nodeId: string; error: string }>;
}

/**
 * Ã°Å¸Â§Â® RECALCULER UN SEUL NÃ…â€™UD avec l'Operation Interpreter
 */
export async function recalculateNodeWithOperationInterpreter(
  prisma: PrismaClient,
  nodeId: string,
  submissionId?: string
): Promise<RecalculationResult> {

  const result: RecalculationResult = {
    nodeId,
    label: null,
    hasCapacity: false,
    capacityType: 'none',
    oldValue: null,
    newValue: null,
    recalculationSuccess: false
  };

  try {
    // 1. Chercher le nÃ…â€œud
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: {
        id: true,
        field_label: true,
        calculatedValue: true,
        hasFormula: true,
        hasCondition: true,
        hasTable: true,
        linkedFormulaIds: true,
        linkedConditionIds: true,
        linkedTableIds: true,
        TreeBranchLeafNodeFormula: { select: { id: true } },
        TreeBranchLeafNodeCondition: { select: { id: true } },
        TreeBranchLeafNodeTable: { select: { id: true } }
      }
    });

    if (!node) {
      result.error = `NÃ…â€œud non trouvÃƒÂ©`;
      return result;
    }

    result.label = node.field_label;
    result.oldValue = node.calculatedValue;

    // 2. DÃƒÂ©terminer le type de capacitÃƒÂ©
    if (node.TreeBranchLeafNodeFormula?.length > 0) {
      result.capacityType = 'formula';
      result.hasCapacity = true;
    } else if (node.TreeBranchLeafNodeCondition?.length > 0) {
      result.capacityType = 'condition';
      result.hasCapacity = true;
    } else if (node.TreeBranchLeafNodeTable?.length > 0) {
      result.capacityType = 'table';
      result.hasCapacity = true;
    }

    // Si pas de capacitÃƒÂ©, pas besoin de recalculer
    if (!result.hasCapacity) {
      return result;
    }

    // 3. Construire la sourceRef pour interpretReference
    let sourceRef = '';
    
    if (result.capacityType === 'formula' && node.linkedFormulaIds?.length > 0) {
      sourceRef = `node-formula:${node.linkedFormulaIds[0]}`;
    } else if (result.capacityType === 'condition' && node.linkedConditionIds?.length > 0) {
      sourceRef = `condition:${node.linkedConditionIds[0]}`;
    } else if (result.capacityType === 'table' && node.linkedTableIds?.length > 0) {
      sourceRef = `node-table:${node.linkedTableIds[0]}`;
    }

    if (!sourceRef) {
      result.error = `Impossible de construire sourceRef`;
      return result;
    }


    // 4. APPELER OPERATION INTERPRETER POUR RECALCULER
    try {
      const valuesCache = new Map();
      const interpretResult = await interpretReference(
        sourceRef,
        submissionId || '',
        prisma,
        valuesCache,
        0,
        new Map(),
        new Map()
      );

      result.newValue = interpretResult.result;
      result.recalculationSuccess = true;


      // 5. METTRE Ãƒâ‚¬ JOUR LA BD avec la nouvelle calculatedValue
      if (result.newValue && result.newValue !== 'null' && result.newValue !== 'Ã¢Ë†â€¦') {
        await prisma.treeBranchLeafNode.update({
          where: { id: nodeId },
          data: {
            calculatedValue: result.newValue,
            calculatedAt: new Date(),
            calculatedBy: `interpreter-${result.capacityType}`
          }
        });
      }

    } catch (interpretError) {
      result.error = `Erreur interpretReference: ${interpretError instanceof Error ? interpretError.message : String(interpretError)}`;
      console.warn(`   Ã¢Å¡Â Ã¯Â¸Â  ${result.error}`);
    }

  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    console.error(`   Ã¢ÂÅ’ Erreur: ${result.error}`);
  }

  return result;
}

/**
 * Ã°Å¸Å¡â‚¬ RECALCULER TOUS LES NÃ…â€™UDS COPIÃƒâ€°S DU REPEATER
 */
export async function recalculateAllCopiedNodesWithOperationInterpreter(
  prisma: PrismaClient,
  repeaterNodeId: string,
  suffixMarker: string = '-1',
  precomputedNodeIds?: string[],
): Promise<RecalculationReport> {

  const report: RecalculationReport = {
    totalNodes: 0,
    recalculated: [],
    errors: []
  };

  try {
    // 🚀 OPTIMISÉ: si les IDs sont pré-calculés, skip le BFS récursif
    let copiedNodes: Array<{ id: string; field_label: string | null }>;
    
    if (precomputedNodeIds && precomputedNodeIds.length > 0) {
      copiedNodes = precomputedNodeIds.map(id => ({ id, field_label: null }));
    } else {
      // Fallback: BFS récursif (pour les appels hors-repeater)
      const repeaterChildren = await prisma.treeBranchLeafNode.findMany({
        where: { parentId: repeaterNodeId },
        select: { id: true, field_label: true }
      });
      const allDescendants: Array<{ id: string; field_label: string | null }> = [];
      const queue = [...repeaterChildren];
      while (queue.length > 0) {
        const current = queue.shift();
        if (!current) continue;
        allDescendants.push(current);
        const children = await prisma.treeBranchLeafNode.findMany({
          where: { parentId: current.id },
          select: { id: true, field_label: true }
        });
        queue.push(...children);
      }
      copiedNodes = allDescendants.filter(node => node.id.includes(suffixMarker));
    }
    
    report.totalNodes = copiedNodes.length;


    // 4. Recalculer chacun
    for (const node of copiedNodes) {
      try {
        const recalcResult = await recalculateNodeWithOperationInterpreter(
          prisma,
          node.id
        );
        report.recalculated.push(recalcResult);

        if (recalcResult.recalculationSuccess && recalcResult.newValue) {
        } else if (!recalcResult.recalculationSuccess) {
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        report.errors.push({ nodeId: node.id, error: errorMsg });
        console.error(`   Ã¢ÂÅ’ ${node.field_label}: ${errorMsg}`);
      }
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    report.errors.push({ nodeId: repeaterNodeId, error: `Erreur globale: ${errorMsg}` });
    console.error(`Ã¢ÂÅ’ Erreur globale: ${errorMsg}`);
  }

  // RÃƒÂ©sumÃƒÂ©
  const successCount = report.recalculated.filter(r => r.recalculationSuccess).length;

  return report;
}

export { interpretReference };
