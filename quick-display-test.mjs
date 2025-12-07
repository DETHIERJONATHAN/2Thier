import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

console.log('\n🧪 DIAGNOSTIC COMPLET DES NŒUDS D\'AFFICHAGE\n');
console.log('='.repeat(80));

// IDs des 3 variables qu'on cherche
const targetVariables = [
  { id: 'dfe42b56-ce2e-4c2d-a4a2-cba90087ed72', name: 'Rampant toiture' },
  { id: 'ac81b3a7-5e5a-4c13-90f5-51503aadc748', name: 'Orientation-Inclinaison' },
  { id: '42de8d47-1300-49e0-bb00-f2dc3e4052d6', name: 'Longueur toiture' }
];

console.log('\n📦 TEST 1: VARIABLES ORIGINALES\n');

for (const target of targetVariables) {
  const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
    where: { id: target.id },
    select: {
      id: true,
      displayName: true,
      nodeId: true,
      sourceRef: true
    }
  });

  if (variable) {
    console.log(`✅ ${target.name}`);
    console.log(`   Variable ID: ${variable.id}`);
    console.log(`   Display Name: ${variable.displayName}`);
    console.log(`   Node ID: ${variable.nodeId}`);
    console.log(`   SourceRef: ${variable.sourceRef}\n`);
  } else {
    console.log(`❌ ${target.name} - Variable introuvable\n`);
  }
}

console.log('='.repeat(80));
console.log('\n📦 TEST 2: NŒUDS D\'AFFICHAGE ORIGINAUX\n');

const displayNodeIds = [];
for (const target of targetVariables) {
  const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
    where: { id: target.id },
    select: { nodeId: true }
  });

  if (variable && variable.nodeId) {
    displayNodeIds.push(variable.nodeId);
    
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: variable.nodeId },
      select: {
        id: true,
        label: true,
        parentId: true,
        type: true
      }
    });

    if (node) {
      console.log(`✅ ${target.name}`);
      console.log(`   Node ID: ${node.id}`);
      console.log(`   Label: ${node.label}`);
      console.log(`   Parent: ${node.parentId}`);
      console.log(`   Type: ${node.type}\n`);
    } else {
      console.log(`❌ ${target.name} - Nœud d'affichage introuvable\n`);
    }
  }
}

console.log('='.repeat(80));
console.log('\n📦 TEST 3: NŒUDS COPIÉS (AVEC SUFFIXE -1)\n');

let foundCount = 0;
for (let i = 0; i < displayNodeIds.length; i++) {
  const nodeId = displayNodeIds[i];
  const copiedId = `${nodeId}-1`;
  const target = targetVariables[i];
  
  const node = await prisma.treeBranchLeafNode.findUnique({
    where: { id: copiedId },
    select: {
      id: true,
      label: true,
      parentId: true,
      createdAt: true
    }
  });

  if (node) {
    foundCount++;
    const hasSuffixedParent = node.parentId && /-\d+$/.test(node.parentId);
    console.log(`✅ ${target.name} COPIÉ`);
    console.log(`   Node ID: ${node.id}`);
    console.log(`   Parent: ${node.parentId}`);
    console.log(`   Parent suffixé: ${hasSuffixedParent ? 'OUI ✅' : 'NON ❌'}`);
    console.log(`   Créé: ${node.createdAt.toLocaleString()}\n`);
  } else {
    console.log(`❌ ${target.name} - PAS COPIÉ`);
    console.log(`   Attendu: ${copiedId}\n`);
  }
}

console.log('='.repeat(80));
console.log('\n📦 TEST 4: CHAMPS AVEC linkedVariableIds\n');

for (const target of targetVariables) {
  const fields = await prisma.treeBranchLeafNode.findMany({
    where: {
      linkedVariableIds: {
        has: target.id
      }
    },
    select: {
      id: true,
      label: true,
      type: true
    }
  });

  if (fields.length > 0) {
    console.log(`✅ ${target.name} utilisée par ${fields.length} champ(s):`);
    fields.forEach(f => {
      console.log(`   • ${f.label} (${f.id})`);
    });
    console.log();
  } else {
    console.log(`❌ ${target.name} - Aucun champ n'utilise cette variable`);
    console.log(`   → Ne sera PAS copiée automatiquement lors du repeat\n`);
  }
}

console.log('='.repeat(80));
console.log('\n📦 TEST 5: REPEATER CONFIGURATION\n');

const repeater = await prisma.treeBranchLeafNode.findUnique({
  where: { id: 'e6474654-9c34-41d8-9cf5-1cce00bcfe6c' },
  select: {
    id: true,
    label: true,
    metadata: true
  }
});

if (repeater) {
  const metadata = repeater.metadata;
  const templateNodeIds = metadata?.repeater?.templateNodeIds || [];
  
  console.log(`Repeater: ${repeater.label}`);
  console.log(`Template contient ${templateNodeIds.length} nœuds\n`);
  
  console.log('Nœuds d\'affichage dans le template:');
  for (const displayNodeId of displayNodeIds) {
    const isInTemplate = templateNodeIds.includes(displayNodeId);
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: displayNodeId },
      select: { label: true }
    });
    console.log(`   ${isInTemplate ? '✅' : '❌'} ${node?.label || displayNodeId}`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('\n🎯 RÉSUMÉ:\n');
console.log(`Nœuds copiés: ${foundCount}/3`);
console.log(`Nœuds manquants: ${3 - foundCount}/3`);

if (foundCount < 3) {
  console.log('\n⚠️  PROBLÈME: Certains nœuds d\'affichage ne sont pas copiés');
  console.log('   Cause probable: Leurs nodeId ne sont pas dans templateNodeIds');
  console.log('   OU: Les variables ne sont pas dans linkedVariableIds des champs template');
}

await prisma.$disconnect();
