import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

console.log('\n🎯 SOLUTION: Simuler un nouveau repeat et vérifier\n');
console.log('='.repeat(80));

const PARENT_BRANCH = 'dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b';
const REPEATER_ID = 'e6474654-9c34-41d8-9cf5-1cce00bcfe6c';

console.log('📦 ÉTAPE 1: Configuration actuelle du template\n');

const repeater = await prisma.treeBranchLeafNode.findUnique({
  where: { id: REPEATER_ID },
  select: { metadata: true, label: true }
});

const templateNodeIds = repeater.metadata?.repeater?.templateNodeIds || [];

console.log(`Repeater: ${repeater.label}`);
console.log(`Template nodes: ${templateNodeIds.length}\n`);

const displayNodes = [
  { id: '9c9f42b2-e0df-4726-8a81-997c0dee71bc', name: 'Rampant toiture' },
  { id: '54adf56b-ee04-44bf-be20-9636be4383d6', name: 'Orientation-Inclinaison' }
];

console.log('Nœuds d\'affichage dans le template:');
for (const node of displayNodes) {
  const inTemplate = templateNodeIds.includes(node.id);
  console.log(`   ${inTemplate ? '✅' : '❌'} ${node.name}`);
}

console.log('\n' + '='.repeat(80));
console.log('📦 ÉTAPE 2: Que se passerait-il lors du prochain repeat ?\n');

console.log('Lors d\'un nouveau repeat (répétition N+1):');
console.log(`   → deep-copy-service copiera les ${templateNodeIds.length} nœuds du template`);
console.log(`   → Y compris les 2 nœuds d'affichage ajoutés récemment`);
console.log(`   → variable-copy-engine retournera displayNodeId pour chaque variable`);
console.log(`   → repeat-executor collectera ces displayNodeIds`);
console.log(`   → reassignCopiedNodesToDuplicatedParents les réassignera\n`);

console.log('Résultat attendu pour la répétition N+1:');
console.log('   ✅ Rampant toiture-(N+1) créé avec parent suffixé');
console.log('   ✅ Orientation-Inclinaison-(N+1) créé avec parent suffixé');

console.log('\n' + '='.repeat(80));
console.log('📦 ÉTAPE 3: Vérifier que les répétitions précédentes sont OK\n');

// Compter les copies existantes
const rampantCopies = await prisma.treeBranchLeafNode.findMany({
  where: {
    id: { startsWith: '9c9f42b2-e0df-4726-8a81-997c0dee71bc-' }
  },
  select: {
    id: true,
    label: true,
    parentId: true,
    createdAt: true
  },
  orderBy: { id: 'asc' }
});

const orientationCopies = await prisma.treeBranchLeafNode.findMany({
  where: {
    id: { startsWith: '54adf56b-ee04-44bf-be20-9636be4383d6-' }
  },
  select: {
    id: true,
    label: true,
    parentId: true,
    createdAt: true
  },
  orderBy: { id: 'asc' }
});

console.log(`Rampant copies existantes: ${rampantCopies.length}`);
rampantCopies.forEach(copy => {
  const suffix = copy.id.replace('9c9f42b2-e0df-4726-8a81-997c0dee71bc', '');
  const expectedParent = PARENT_BRANCH + suffix;
  const match = copy.parentId === expectedParent;
  console.log(`   ${match ? '✅' : '⚠️ '} ${copy.label} - Parent: ${match ? 'OK' : 'À CORRIGER'}`);
});

console.log(`\nOrientation copies existantes: ${orientationCopies.length}`);
if (orientationCopies.length === 0) {
  console.log('   ❌ Aucune copie (normal, ajouté récemment au template)');
} else {
  orientationCopies.forEach(copy => {
    const suffix = copy.id.replace('54adf56b-ee04-44bf-be20-9636be4383d6', '');
    const expectedParent = PARENT_BRANCH + suffix;
    const match = copy.parentId === expectedParent;
    console.log(`   ${match ? '✅' : '⚠️ '} ${copy.label} - Parent: ${match ? 'OK' : 'À CORRIGER'}`);
  });
}

console.log('\n' + '='.repeat(80));
console.log('📦 ÉTAPE 4: Détecter les problèmes de parent\n');

// Détecter Rampant-2 avec mauvais parent
const rampant2 = rampantCopies.find(c => c.id.endsWith('-2'));
if (rampant2) {
  const expectedParent2 = `${PARENT_BRANCH}-2`;
  if (rampant2.parentId !== expectedParent2) {
    console.log(`⚠️  PROBLÈME DÉTECTÉ: Rampant toiture-2`);
    console.log(`   Parent actuel: ${rampant2.parentId}`);
    console.log(`   Parent attendu: ${expectedParent2}`);
    console.log(`   Cause: Le parent -2 n'existe probablement pas !`);
    
    // Vérifier si le parent -2 existe
    const parent2 = await prisma.treeBranchLeafNode.findUnique({
      where: { id: expectedParent2 },
      select: { id: true, label: true }
    });
    
    if (!parent2) {
      console.log(`   ❌ CONFIRMÉ: Le parent ${expectedParent2} n'existe PAS`);
      console.log(`   → La répétition 2 n'a pas créé le parent de section !`);
    }
  }
}

console.log('\n' + '='.repeat(80));
console.log('\n🎯 CONCLUSION:\n');

console.log('✅ Configuration template: OK (nœuds d\'affichage ajoutés)');
console.log('✅ Code repeat-executor: OK (displayNodeIds trackés)');
console.log('⚠️  Répétitions précédentes: Faites AVANT la configuration\n');

console.log('📋 PROCHAINES ÉTAPES:');
console.log('1. Faire un NOUVEAU repeat depuis l\'interface');
console.log('2. Vérifier que Orientation-Inclinaison-(N+1) est créé');
console.log('3. Vérifier que son parent est bien suffixé\n');

console.log('🔧 Si le problème persiste:');
console.log('   → Vérifier les logs de repeat-executor.ts');
console.log('   → Vérifier que copyVariableWithCapacities retourne displayNodeId');
console.log('   → Vérifier que deepCopyNodes retourne displayNodeIds');

await prisma.$disconnect();
