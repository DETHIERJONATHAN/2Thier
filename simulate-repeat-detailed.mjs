import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

console.log('\n🔬 SIMULATION EXACTE DU REPEAT\n');
console.log('='.repeat(80));

const REPEATER_ID = 'e6474654-9c34-41d8-9cf5-1cce00bcfe6c';

console.log('📦 ÉTAPE 1: Récupérer le template\n');

const repeater = await prisma.treeBranchLeafNode.findUnique({
  where: { id: REPEATER_ID },
  select: {
    id: true,
    label: true,
    metadata: true
  }
});

const templateNodeIds = repeater.metadata?.repeater?.templateNodeIds || [];

console.log(`Template nodes: ${templateNodeIds.length}`);
console.log(JSON.stringify(templateNodeIds, null, 2));

console.log('\n' + '='.repeat(80));
console.log('📦 ÉTAPE 2: Analyser CHAQUE nœud du template\n');

for (const nodeId of templateNodeIds) {
  const node = await prisma.treeBranchLeafNode.findUnique({
    where: { id: nodeId },
    select: {
      id: true,
      label: true,
      type: true,
      linkedVariableIds: true
    }
  });

  if (!node) {
    console.log(`❌ Nœud introuvable: ${nodeId}\n`);
    continue;
  }

  console.log(`📌 ${node.label} (${node.type})`);
  console.log(`   ID: ${node.id}`);

  if (node.linkedVariableIds && node.linkedVariableIds.length > 0) {
    console.log(`   linkedVariableIds: ${node.linkedVariableIds.length}`);
    
    for (const varId of node.linkedVariableIds) {
      const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
        where: { id: varId },
        select: {
          displayName: true,
          nodeId: true
        }
      });

      if (variable) {
        console.log(`      • ${variable.displayName}`);
        console.log(`        nodeId: ${variable.nodeId || 'null'}`);
      }
    }
  }
  console.log();
}

console.log('='.repeat(80));
console.log('\n🔍 ÉTAPE 3: Chercher qui utilise les nœuds d\'affichage\n');

const displayNodes = [
  { id: '9c9f42b2-e0df-4726-8a81-997c0dee71bc', name: 'Rampant toiture' },
  { id: '54adf56b-ee04-44bf-be20-9636be4383d6', name: 'Orientation-Inclinaison' }
];

for (const display of displayNodes) {
  console.log(`\n🔸 ${display.name} (${display.id})`);
  
  // Chercher qui référence ce nœud
  const variable = await prisma.treeBranchLeafNodeVariable.findFirst({
    where: { nodeId: display.id },
    select: {
      id: true,
      displayName: true
    }
  });

  if (variable) {
    console.log(`   Variable associée: ${variable.displayName} (${variable.id})`);
    
    // Chercher qui utilise cette variable
    const fieldsUsingVariable = await prisma.treeBranchLeafNode.findMany({
      where: {
        linkedVariableIds: {
          has: variable.id
        }
      },
      select: {
        id: true,
        label: true
      }
    });

    console.log(`   Utilisée par ${fieldsUsingVariable.length} champ(s):`);
    fieldsUsingVariable.forEach(field => {
      const isInTemplate = templateNodeIds.includes(field.id);
      console.log(`      ${isInTemplate ? '✅' : '❌'} ${field.label} (${field.id})`);
    });
  } else {
    console.log(`   ❌ Aucune variable associée à ce nœud d'affichage`);
  }

  // Vérifier si le nœud d'affichage lui-même est dans le template
  const isDirectlyInTemplate = templateNodeIds.includes(display.id);
  console.log(`   Dans le template directement: ${isDirectlyInTemplate ? 'OUI ✅' : 'NON ❌'}`);
}

console.log('\n' + '='.repeat(80));
console.log('\n🎯 CONCLUSION:\n');

const rampantInTemplate = templateNodeIds.includes('9c9f42b2-e0df-4726-8a81-997c0dee71bc');
const orientationInTemplate = templateNodeIds.includes('54adf56b-ee04-44bf-be20-9636be4383d6');

console.log(`Rampant dans template: ${rampantInTemplate ? 'OUI ✅' : 'NON ❌'}`);
console.log(`Orientation dans template: ${orientationInTemplate ? 'OUI ✅' : 'NON ❌'}\n`);

if (!rampantInTemplate || !orientationInTemplate) {
  console.log('⚠️  PROBLÈME: Les nœuds d\'affichage doivent être DIRECTEMENT dans templateNodeIds');
  console.log('   pour être copiés par deepCopyNodes()');
} else {
  console.log('✅ Configuration correcte - Les nœuds seront copiés au prochain repeat');
}

await prisma.$disconnect();
