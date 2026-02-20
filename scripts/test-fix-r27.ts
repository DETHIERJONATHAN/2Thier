/**
 * Test FIX R27: Vérifie que interpretReference('formula:xxx') 
 * identifie correctement le type 'formula' au lieu de 'field'
 */
import { db } from '../src/lib/database';
import { interpretReference } from '../src/components/TreeBranchLeaf/treebranchleaf-new/api/operation-interpreter';

const SUBMISSION_ID = 'tbl-1771444669258-cxn2a45sk';
const PRIX_TVAC_NODE_ID = '2f0c0d37-ae97-405e-8fae-0a07680e2183';
const PRIX_TVAC_FORMULA_ID = 'f69fbdba-5612-4329-ac16-278182c4d52d';
const REMISE_TVAC_NODE_ID = 'f90992d2-ede8-4189-ba83-5530e44f27fd';
const REMISE_TVAC_FORMULA_ID = '3a8e7fa1-31e3-4e78-856a-9410a77c38b9';

async function main() {
  const prisma = db as any;
  
  // Construire le valueMap depuis les SubmissionData
  const allData = await prisma.treeBranchLeafSubmissionData.findMany({
    where: { submissionId: SUBMISSION_ID },
    select: { nodeId: true, value: true, sourceRef: true }
  });
  
  const valueMap = new Map<string, string>();
  for (const d of allData) {
    valueMap.set(d.nodeId, d.value || '0');
  }
  console.log(`Loaded ${valueMap.size} entries into valueMap`);
  
  // Construire un labelMap
  const nodes = await prisma.treeBranchLeafNode.findMany({
    where: { treeId: 'cmf1mwoz10005gooked1j6orn' },
    select: { id: true, label: true }
  });
  const labelMap = new Map<string, string>();
  for (const n of nodes) labelMap.set(n.id, n.label);

  // === TEST 1: Prix TVAC (formula:UUID) ===
  console.log('\n=== TEST 1: Prix TVAC (formula:' + PRIX_TVAC_FORMULA_ID + ') ===');
  const cache1 = new Map();
  const result1 = await interpretReference(
    'formula:' + PRIX_TVAC_FORMULA_ID,
    SUBMISSION_ID,
    prisma,
    cache1,
    0,
    valueMap,
    labelMap
  );
  console.log('  Type:', result1.details?.type);
  console.log('  Résultat:', result1.result);
  console.log('  HumanText:', result1.humanText);
  if (result1.details?.type === 'formula') {
    console.log('  ✅ FIX R27 FONCTIONNE: formula: prefix détecté!');
    console.log('  Expression:', result1.details?.expression);
    console.log('  calculatedResult:', result1.details?.calculatedResult);
  } else {
    console.log('  ❌ FIX R27 NE FONCTIONNE PAS: type=' + result1.details?.type);
  }

  // Mettre à jour valueMap avec le résultat de Prix TVAC
  valueMap.set(PRIX_TVAC_NODE_ID, result1.result?.toString() || '0');
  console.log('\n  → Prix TVAC mis dans valueMap:', result1.result);

  // === TEST 2: Remise TVAC (formula:UUID) ===
  console.log('\n=== TEST 2: Remise TVAC (formula:' + REMISE_TVAC_FORMULA_ID + ') ===');
  const cache2 = new Map();
  const result2 = await interpretReference(
    'formula:' + REMISE_TVAC_FORMULA_ID,
    SUBMISSION_ID,
    prisma,
    cache2,
    0,
    valueMap,
    labelMap
  );
  console.log('  Type:', result2.details?.type);
  console.log('  Résultat:', result2.result);
  console.log('  HumanText:', result2.humanText);
  if (result2.details?.type === 'formula') {
    console.log('  ✅ Remise TVAC évaluée comme formule!');
    console.log('  Expression:', result2.details?.expression);
    console.log('  calculatedResult:', result2.details?.calculatedResult);
  } else {
    console.log('  ❌ Remise TVAC: type=' + result2.details?.type);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
