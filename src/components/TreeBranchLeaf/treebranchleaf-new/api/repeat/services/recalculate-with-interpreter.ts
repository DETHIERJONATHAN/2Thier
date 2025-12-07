import { PrismaClient } from '@prisma/client';
import { interpretReference, identifyReferenceType } from '../../operation-interpreter';

/**
 * 🚀 SERVICE: RECALCULATION DES CHAMPS APRÈS DUPLICATION
 * 
 * Ce service appelle l'OPERATION INTERPRETER pour recalculer
 * les vraies valeurs des champs copiés avec leurs capacités
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
 * 🧮 RECALCULER UN SEUL NŒUD avec l'Operation Interpreter
 */
export async function recalculateNodeWithOperationInterpreter(
  prisma: PrismaClient,
  nodeId: string,
  submissionId?: string
): Promise<RecalculationResult> {
  console.log(`🧮 [RECALC] Recalculation du nœud: ${nodeId}`);

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
    // 1. Chercher le nœud
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
      result.error = `Nœud non trouvé`;
      return result;
    }

    result.label = node.field_label;
    result.oldValue = node.calculatedValue;

    // 2. Déterminer le type de capacité
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

    // Si pas de capacité, pas besoin de recalculer
    if (!result.hasCapacity) {
      console.log(`   ℹ️  Pas de capacité (formule/condition/table)`);
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

    console.log(`   📍 sourceRef: ${sourceRef}`);
    console.log(`   🔄 Appel à interpretReference...`);

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

      console.log(`   ✅ Nouvelle valeur calculée: ${result.newValue}`);

      // 5. METTRE À JOUR LA BD avec la nouvelle calculatedValue
      if (result.newValue && result.newValue !== 'null' && result.newValue !== '∅') {
        await prisma.treeBranchLeafNode.update({
          where: { id: nodeId },
          data: {
            calculatedValue: result.newValue,
            calculatedAt: new Date(),
            calculatedBy: `interpreter-${result.capacityType}`
          }
        });
        console.log(`   💾 Valeur sauvegardée en BD`);
      }

    } catch (interpretError) {
      result.error = `Erreur interpretReference: ${interpretError instanceof Error ? interpretError.message : String(interpretError)}`;
      console.warn(`   ⚠️  ${result.error}`);
    }

  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ Erreur: ${result.error}`);
  }

  return result;
}

/**
 * 🚀 RECALCULER TOUS LES NŒUDS COPIÉS DU REPEATER
 */
export async function recalculateAllCopiedNodesWithOperationInterpreter(
  prisma: PrismaClient,
  repeaterNodeId: string,
  suffixMarker: string = '-1'
): Promise<RecalculationReport> {
  console.log(`\n🚀 [RECALC-REPORT] Recalculation de TOUS les nœuds copiés du repeater ${repeaterNodeId}`);
  console.log(`   Cherchant nœuds avec suffixe: ${suffixMarker}`);

  const report: RecalculationReport = {
    totalNodes: 0,
    recalculated: [],
    errors: []
  };

  try {
    // 1. D'abord, trouver tous les enfants du repeater node
    console.log(`   📍 Recherche des enfants du repeater: ${repeaterNodeId}`);
    const repeaterChildren = await prisma.treeBranchLeafNode.findMany({
      where: {
        parentId: repeaterNodeId
      },
      select: {
        id: true,
        field_label: true
      }
    });

    console.log(`   📋 Trouvé ${repeaterChildren.length} enfants directs du repeater`);

    // 2. Chercher récursivement tous les descendants (enfants + petits-enfants + etc.)
    const allDescendants: Array<{ id: string; field_label: string | null }> = [];
    const queue = [...repeaterChildren];
    
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      
      allDescendants.push(current);
      
      // Chercher les enfants de ce nœud
      const children = await prisma.treeBranchLeafNode.findMany({
        where: {
          parentId: current.id
        },
        select: {
          id: true,
          field_label: true
        }
      });
      
      queue.push(...children);
    }

    console.log(`   📋 Trouvé ${allDescendants.length} descendants totaux`);

    // 3. Filtrer pour ne garder que ceux avec le suffixe
    const copiedNodes = allDescendants.filter(node => node.id.includes(suffixMarker));
    console.log(`   📋 Après filtrage par suffixe "${suffixMarker}": ${copiedNodes.length} nœuds copiés`);

    report.totalNodes = copiedNodes.length;

    // 4. Recalculer chacun
    for (const node of copiedNodes) {
      try {
        console.log(`   ⏳ Recalculation de: ${node.id} (${node.field_label})`);
        const recalcResult = await recalculateNodeWithOperationInterpreter(
          prisma,
          node.id
        );
        report.recalculated.push(recalcResult);

        if (recalcResult.recalculationSuccess && recalcResult.newValue) {
          console.log(`   ✅ ${node.field_label}: ${recalcResult.oldValue || 'null'} → ${recalcResult.newValue}`);
        } else if (!recalcResult.recalculationSuccess) {
          console.log(`   ⚠️  ${node.field_label}: Pas de capacité ou erreur`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        report.errors.push({ nodeId: node.id, error: errorMsg });
        console.error(`   ❌ ${node.field_label}: ${errorMsg}`);
      }
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    report.errors.push({ nodeId: repeaterNodeId, error: `Erreur globale: ${errorMsg}` });
    console.error(`❌ Erreur globale: ${errorMsg}`);
  }

  // Résumé
  const successCount = report.recalculated.filter(r => r.recalculationSuccess).length;
  console.log(`\n📊 RÉSUMÉ RECALCULATION:`);
  console.log(`   • Total nœuds descendants: ${report.totalNodes}`);
  console.log(`   • Recalculés avec succès: ${successCount}`);
  console.log(`   • Erreurs: ${report.errors.length}`);

  return report;
}

export { interpretReference };
