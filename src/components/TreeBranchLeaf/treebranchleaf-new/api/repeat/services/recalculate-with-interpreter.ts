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
    // 1. Chercher le noeud (sans relations inexistantes - seul TreeBranchLeafNodeTable est une relation)
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
      }
    });

    if (!node) {
      result.error = `Noeud non trouvé`;
      return result;
    }

    result.label = node.field_label;
    result.oldValue = node.calculatedValue;

    // 2. Déterminer le type de capacité via les champs booléens et les IDs liés
    if ((node.hasFormula || (node.linkedFormulaIds && (node.linkedFormulaIds as string[]).length > 0))) {
      result.capacityType = 'formula';
      result.hasCapacity = true;
    } else if ((node.hasCondition || (node.linkedConditionIds && (node.linkedConditionIds as string[]).length > 0))) {
      result.capacityType = 'condition';
      result.hasCapacity = true;
    } else if ((node.hasTable || (node.linkedTableIds && (node.linkedTableIds as string[]).length > 0))) {
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
 * RECALCULER TOUS LES NOEUDS COPIES DU REPEATER
 * Optimise: 1 seul findMany pour tous les noeuds au lieu de N x findUnique
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
    // Determiner les IDs a traiter
    let nodeIds: string[];
    
    if (precomputedNodeIds && precomputedNodeIds.length > 0) {
      nodeIds = precomputedNodeIds;
    } else {
      // Fallback: BFS recursif (pour les appels hors-repeater)
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
      nodeIds = allDescendants.filter(node => node.id.includes(suffixMarker)).map(n => n.id);
    }
    
    report.totalNodes = nodeIds.length;
    
    if (nodeIds.length === 0) return report;

    // BATCH: Charger TOUS les noeuds en une seule requete findMany
    const allNodes = await prisma.treeBranchLeafNode.findMany({
      where: { id: { in: nodeIds } },
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
      }
    });
    
    const nodeMap = new Map(allNodes.map(n => [n.id, n]));

    // Recalculer chaque noeud — PARALLÉLISÉ par chunks de 5
    const CHUNK_SIZE = 5;
    for (let chunkStart = 0; chunkStart < nodeIds.length; chunkStart += CHUNK_SIZE) {
      const chunk = nodeIds.slice(chunkStart, chunkStart + CHUNK_SIZE);
      const chunkResults = await Promise.all(chunk.map(async (nodeId) => {
      const node = nodeMap.get(nodeId);
      if (!node) {
        return { nodeId, error: 'Noeud non trouve' } as { nodeId: string; error: string };
      }
      
      const result: RecalculationResult = {
        nodeId,
        label: node.field_label,
        hasCapacity: false,
        capacityType: 'none',
        oldValue: node.calculatedValue,
        newValue: null,
        recalculationSuccess: false
      };
      
      // Determiner le type de capacite
      const linkedFormulas = node.linkedFormulaIds as string[] | null;
      const linkedConditions = node.linkedConditionIds as string[] | null;
      const linkedTables = node.linkedTableIds as string[] | null;
      
      if (node.hasFormula || (linkedFormulas && linkedFormulas.length > 0)) {
        result.capacityType = 'formula';
        result.hasCapacity = true;
      } else if (node.hasCondition || (linkedConditions && linkedConditions.length > 0)) {
        result.capacityType = 'condition';
        result.hasCapacity = true;
      } else if (node.hasTable || (linkedTables && linkedTables.length > 0)) {
        result.capacityType = 'table';
        result.hasCapacity = true;
      }
      
      if (!result.hasCapacity) {
        return result;
      }
      
      // Construire la sourceRef
      let sourceRef = '';
      if (result.capacityType === 'formula' && linkedFormulas && linkedFormulas.length > 0) {
        sourceRef = `node-formula:${linkedFormulas[0]}`;
      } else if (result.capacityType === 'condition' && linkedConditions && linkedConditions.length > 0) {
        sourceRef = `condition:${linkedConditions[0]}`;
      } else if (result.capacityType === 'table' && linkedTables && linkedTables.length > 0) {
        sourceRef = `node-table:${linkedTables[0]}`;
      }
      
      if (!sourceRef) {
        result.error = 'Impossible de construire sourceRef';
        return result;
      }
      
      // Appeler l'operation interpreter
      try {
        const valuesCache = new Map();
        const interpretResult = await interpretReference(
          sourceRef,
          '',
          prisma,
          valuesCache,
          0,
          new Map(),
          new Map()
        );
        
        result.newValue = interpretResult.result;
        result.recalculationSuccess = true;
        
        // Mettre a jour la BD
        if (result.newValue && result.newValue !== 'null') {
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
        console.warn(`[recalculate-with-interpreter] ${result.error}`);
      }
      
      return result;
      }));
      
      // Collecter les résultats du chunk
      for (const r of chunkResults) {
        if ('error' in r && !('hasCapacity' in r)) {
          report.errors.push(r as { nodeId: string; error: string });
        } else {
          report.recalculated.push(r as RecalculationResult);
        }
      }
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    report.errors.push({ nodeId: repeaterNodeId, error: `Erreur globale: ${errorMsg}` });
    console.error(`[recalculate-with-interpreter] Erreur globale: ${errorMsg}`);
  }

  return report;
}

export { interpretReference };
