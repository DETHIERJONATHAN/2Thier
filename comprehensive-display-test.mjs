import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * TEST 1: Vérifier quels nœuds d'affichage existent actuellement
 */
async function test1_checkExistingDisplayNodes() {
  console.log('📋 TEST 1: NŒUDS D\'AFFICHAGE EXISTANTS\n');
  console.log('='.repeat(80));

  const displayNodeIds = [
    '9c9f42b2-e0df-4726-8a81-997c0dee71bc',   // Rampant toiture
    '54adf56b-ee04-44bf-be20-9636be4383d6',   // Orientation-Inclinaison
    // ID de Longueur toiture à découvrir
  ];

  // Chercher d'abord la variable "Longueur toiture"
  const longueurVar = await prisma.treeBranchLeafNodeVariable.findFirst({
    where: {
      displayName: {
        contains: 'Longueur',
        mode: 'insensitive'
      }
    },
    select: {
      id: true,
      displayName: true,
      nodeId: true
    }
  });

  if (longueurVar && longueurVar.nodeId) {
    console.log(`\n✅ Variable "Longueur" trouvée:`);
    console.log(`   ID: ${longueurVar.id}`);
    console.log(`   Nom: ${longueurVar.displayName}`);
    console.log(`   nodeId: ${longueurVar.nodeId}`);
    displayNodeIds.push(longueurVar.nodeId);
  }

  console.log('\n📦 NŒUDS ORIGINAUX:\n');

  for (const nodeId of displayNodeIds) {
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: {
        id: true,
        label: true,
        parentId: true,
        type: true,
        metadata: true
      }
    });

    if (node) {
      console.log(`✅ ${node.label}`);
      console.log(`   ID: ${node.id}`);
      console.log(`   Parent: ${node.parentId}`);
      console.log(`   Type: ${node.type}`);
      
      // Chercher la variable liée
      const variable = await prisma.treeBranchLeafNodeVariable.findFirst({
        where: { nodeId: node.id },
        select: { id: true, displayName: true }
      });
      
      if (variable) {
        console.log(`   Variable: ${variable.displayName} (${variable.id})`);
      }
      console.log();
    } else {
      console.log(`❌ Nœud ${nodeId} introuvable\n`);
    }
  }

  console.log('='.repeat(80));
  return displayNodeIds;
}

/**
 * TEST 2: Chercher les versions -1 de ces nœuds
 */
async function test2_checkCopiedNodes(displayNodeIds) {
  console.log('\n📋 TEST 2: NŒUDS COPIÉS (AVEC SUFFIXE -1)\n');
  console.log('='.repeat(80));

  for (const nodeId of displayNodeIds) {
    const copiedId = `${nodeId}-1`;
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: copiedId },
      select: {
        id: true,
        label: true,
        parentId: true,
        type: true,
        createdAt: true,
        metadata: true
      }
    });

    if (node) {
      console.log(`\n✅ ${node.label} (COPIÉ)`);
      console.log(`   ID: ${node.id}`);
      console.log(`   Parent: ${node.parentId}`);
      
      // Vérifier si le parent a un suffixe
      const hasSuffixedParent = node.parentId && /-\d+$/.test(node.parentId);
      console.log(`   Parent suffixé: ${hasSuffixedParent ? '✅ OUI' : '❌ NON'}`);
      console.log(`   Créé: ${node.createdAt.toLocaleString()}`);
      
      // Vérifier la variable copiée
      const variable = await prisma.treeBranchLeafNodeVariable.findFirst({
        where: { nodeId: node.id },
        select: { id: true, displayName: true, sourceRef: true }
      });
      
      if (variable) {
        console.log(`   Variable copiée: ${variable.displayName} (${variable.id})`);
        console.log(`   sourceRef: ${variable.sourceRef}`);
      } else {
        console.log(`   ⚠️  Aucune variable copiée trouvée`);
      }
    } else {
      console.log(`\n❌ ${copiedId} PAS CRÉÉ`);
    }
  }

  console.log('\n' + '='.repeat(80));
}

/**
 * TEST 3: Vérifier quels champs ont linkedVariableIds
 */
async function test3_checkFieldsWithLinkedVariables() {
  console.log('\n📋 TEST 3: CHAMPS AVEC linkedVariableIds\n');
  console.log('='.repeat(80));

  const variableIds = [
    'dfe42b56-ce2e-4c2d-a4a2-cba90087ed72',  // Rampant
    'ac81b3a7-5e5a-4c13-90f5-51503aadc748',  // Orientation
    '42de8d47-1300-49e0-bb00-f2dc3e4052d6',  // Longueur
  ];

  for (const varId of variableIds) {
    const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
      where: { id: varId },
      select: { id: true, displayName: true, nodeId: true }
    });

    if (!variable) {
      console.log(`❌ Variable ${varId} introuvable\n`);
      continue;
    }

    console.log(`\n📦 ${variable.displayName} (${varId})`);
    
    // Chercher les champs qui utilisent cette variable
    const fields = await prisma.treeBranchLeafNode.findMany({
      where: {
        linkedVariableIds: {
          has: varId
        }
      },
      select: {
        id: true,
        label: true,
        type: true,
        linkedVariableIds: true
      }
    });

    if (fields.length > 0) {
      console.log(`   ✅ Utilisée par ${fields.length} champ(s):`);
      fields.forEach(f => {
        console.log(`      • ${f.label} (${f.id})`);
      });
    } else {
      console.log(`   ❌ Aucun champ n'utilise cette variable dans linkedVariableIds`);
      console.log(`   → La variable ne sera PAS copiée automatiquement lors du repeat`);
    }
  }

  console.log('\n' + '='.repeat(80));
}

/**
 * TEST 4: Vérifier le repeater et ses templateNodeIds
 */
async function test4_checkRepeaterConfig() {
  console.log('\n📋 TEST 4: CONFIGURATION DU REPEATER\n');
  console.log('='.repeat(80));

  const repeaterId = 'e6474654-9c34-41d8-9cf5-1cce00bcfe6c';
  
  const repeater = await prisma.treeBranchLeafNode.findUnique({
    where: { id: repeaterId },
    select: {
      id: true,
      label: true,
      metadata: true
    }
  });

  if (!repeater) {
    console.log('❌ Repeater introuvable');
    return;
  }

  const metadata = repeater.metadata as any;
  const templateNodeIds = metadata?.repeater?.templateNodeIds || [];

  console.log(`\n✅ Repeater: ${repeater.label}`);
  console.log(`\nTemplate contient ${templateNodeIds.length} nœuds:\n`);

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

    if (node) {
      console.log(`   • ${node.label} (${node.type})`);
      if (node.linkedVariableIds && (node.linkedVariableIds as string[]).length > 0) {
        console.log(`     linkedVariableIds: ${(node.linkedVariableIds as string[]).join(', ')}`);
      }
    }
  }

  // Vérifier si les nœuds d'affichage sont dans le template
  console.log('\n📌 NŒUDS D\'AFFICHAGE DANS LE TEMPLATE:');
  
  const displayNodeIds = [
    '9c9f42b2-e0df-4726-8a81-997c0dee71bc',   // Rampant
    '54adf56b-ee04-44bf-be20-9636be4383d6',   // Orientation-Inclinaison
  ];

  for (const nodeId of displayNodeIds) {
    const isInTemplate = templateNodeIds.includes(nodeId);
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: { label: true }
    });
    
    console.log(`   ${isInTemplate ? '✅' : '❌'} ${node?.label || nodeId}`);
  }

  console.log('\n' + '='.repeat(80));
}

/**
 * TEST 5: Simulation du repeat pour comprendre le flow
 */
async function test5_simulateRepeatFlow() {
  console.log('\n📋 TEST 5: SIMULATION DU FLOW DE REPEAT\n');
  console.log('='.repeat(80));

  const repeaterId = 'e6474654-9c34-41d8-9cf5-1cce00bcfe6c';
  const repeater = await prisma.treeBranchLeafNode.findUnique({
    where: { id: repeaterId },
    select: { metadata: true }
  });

  const metadata = repeater?.metadata as any;
  const templateNodeIds = metadata?.repeater?.templateNodeIds || [];

  console.log('\n🔄 ÉTAPE 1: deepCopyNodeInternal copie les nœuds du template');
  console.log(`   ${templateNodeIds.length} nœuds à copier\n`);

  const variablesThatWillBeCopied = new Set<string>();
  
  for (const nodeId of templateNodeIds) {
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: {
        id: true,
        label: true,
        linkedVariableIds: true
      }
    });

    if (node) {
      console.log(`   📦 ${node.label}`);
      
      const linkedVarIds = (node.linkedVariableIds as string[] || []);
      if (linkedVarIds.length > 0) {
        console.log(`      → linkedVariableIds détectés: ${linkedVarIds.length}`);
        linkedVarIds.forEach(varId => {
          if (!varId.startsWith('shared-ref-')) {
            variablesThatWillBeCopied.add(varId);
            console.log(`         • ${varId} → sera copié`);
          }
        });
      }
    }
  }

  console.log('\n🔄 ÉTAPE 2: copyVariableWithCapacities pour chaque variable');
  console.log(`   ${variablesThatWillBeCopied.size} variable(s) seront copiées:\n`);

  for (const varId of variablesThatWillBeCopied) {
    const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
      where: { id: varId },
      select: {
        id: true,
        displayName: true,
        nodeId: true
      }
    });

    if (variable) {
      console.log(`   ✅ ${variable.displayName}`);
      console.log(`      Variable ID: ${variable.id}`);
      console.log(`      Display Node ID: ${variable.nodeId}`);
      console.log(`      → Créera: ${variable.nodeId}-1\n`);
    }
  }

  // Vérifier les variables manquantes
  console.log('❌ VARIABLES QUI NE SERONT PAS COPIÉES:\n');
  
  const allTargetVars = [
    { id: 'dfe42b56-ce2e-4c2d-a4a2-cba90087ed72', name: 'Rampant' },
    { id: 'ac81b3a7-5e5a-4c13-90f5-51503aadc748', name: 'Orientation' },
    { id: '42de8d47-1300-49e0-bb00-f2dc3e4052d6', name: 'Longueur' },
  ];

  for (const { id, name } of allTargetVars) {
    if (!variablesThatWillBeCopied.has(id)) {
      console.log(`   ❌ ${name} (${id})`);
      console.log(`      Raison: Aucun champ template n'a ce varId dans linkedVariableIds\n`);
    }
  }

  console.log('='.repeat(80));
}

async function runAllTests() {
  console.log('\n🧪 SUITE DE TESTS COMPLÈTE POUR LES NŒUDS D\'AFFICHAGE\n');
  console.log('█'.repeat(80));
  
  try {
    const displayNodeIds = await test1_checkExistingDisplayNodes();
    await test2_checkCopiedNodes(displayNodeIds);
    await test3_checkFieldsWithLinkedVariables();
    await test4_checkRepeaterConfig();
    await test5_simulateRepeatFlow();
    
    console.log('\n█'.repeat(80));
    console.log('\n✅ TOUS LES TESTS TERMINÉS\n');
  } catch (error) {
    console.error('\n❌ ERREUR:', error);
  }
}

runAllTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
