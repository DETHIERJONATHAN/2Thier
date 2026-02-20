/**
 * Script de test: Appelle directement evaluateCapacitiesForSubmission
 * pour forcer la réévaluation avec FIX R26 et vérifier le résultat de Prix TVAC
 */
import { db as prisma } from '../src/lib/database';
import { interpretReference, type InterpretResult } from '../src/components/TreeBranchLeaf/treebranchleaf-new/api/operation-interpreter';

const PRIX_TVAC_NODE_ID = '2f0c0d37-ae97-405e-8fae-0a07680e2183';
const FORMULA_ID = 'f69fbdba-5612-4329-ac16-278182c4d52d';
const SUBMISSION_ID = 'tbl-1771444669258-cxn2a45sk';
const TREE_ID = 'cmf1mwoz10005gooked1j6orn';

const DEPS = [
  { id: 'de947d33-b42a-4c3d-a821-cf3577d6ef6a', name: 'Cable DC TVAC' },
  { id: '7add8e2f-01a4-4475-9189-dba0792d711c', name: 'Cale AC TVAC' },
  { id: '8d8729fc-5916-4778-9cc0-95128f536c58', name: "Main d'œuvre TVAC" },
  { id: '09f7a8fa-6b1c-4b59-8cc6-b345735fe987', name: 'Matériaux TVAC' },
  { id: '9e1e6f82-4669-4101-a00c-fcb574503b4b', name: 'Optimiseur TVAC' },
  { id: '86f2b8cb-c32c-4f01-b3e8-792b10da5841-sum-total', name: 'Onduleur TVAC sum-total' },
  { id: '095c3064-281f-4671-8e10-2cbb400366b4-sum-total', name: 'PV TVAC sum-total' },
  { id: '3042cac2-20b7-4b0b-b1e9-850a6c132846', name: 'Transport TVA' },
];

async function main() {
  // Simuler ce que fait l'évaluateur lors de la résolution de la formule de Prix TVAC
  // On va récupérer les valeurs des deps depuis le valueMap/SubmissionData comme le ferait le backend
  
  // 1. Charger toutes les SubmissionData existantes dans un valueMap
  const allData = await prisma.treeBranchLeafSubmissionData.findMany({
    where: { submissionId: SUBMISSION_ID },
    select: { nodeId: true, value: true }
  });
  
  const valueMap = new Map<string, unknown>();
  for (const d of allData) {
    if (d.value !== null && d.value !== undefined) {
      valueMap.set(d.nodeId, d.value);
    }
  }
  console.log(`Loaded ${allData.length} SubmissionData entries into valueMap`);

  // 2. Vérifier les valeurs des deps dans le valueMap
  console.log('\n=== VALEURS DES DEPS DANS LE VALUEMAP ===');
  let expectedSum = 0;
  for (const dep of DEPS) {
    const val = valueMap.get(dep.id);
    const numVal = Number(val) || 0;
    expectedSum += numVal;
    console.log(`  ${dep.name}: ${val ?? 'ABSENT'} (numeric: ${numVal})`);
  }
  console.log(`  → Somme attendue: ${expectedSum}`);

  // 3. Simuler l'interprétation de la formule de Prix TVAC
  console.log('\n=== INTERPRÉTATION DE LA FORMULE ===');
  const valuesCache = new Map<string, InterpretResult>();
  const labelMap = new Map<string, string>();
  
  try {
    const result = await interpretReference(
      `formula:${FORMULA_ID}`,
      SUBMISSION_ID,
      prisma as any,
      valuesCache,
      0,
      valueMap,
      labelMap
    );
    console.log(`  Résultat: ${result.result}`);
    console.log(`  HumanText: ${result.humanText}`);
    console.log(`  Details type: ${result.details?.type}`);
  } catch (err: any) {
    console.error(`  ERREUR: ${err.message}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
