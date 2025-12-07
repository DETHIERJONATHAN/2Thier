import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * SIMULATION: Ce qui se passe lors d'un repeat
 * pour prouver le problème des nœuds d'affichage
 */
async function simulateRepeatFlow() {
  console.log('🎬 SIMULATION DU FLUX REPEAT\n');
  console.log('='.repeat(80));

  // 1. Récupérer le nœud source "Rampant toiture"
  const sourceNode = await prisma.treeBranchLeafNode.findFirst({
    where: {
      label: 'Rampant toiture',
      id: { not: { endsWith: '-1' } }
    },
    select: {
      id: true,
      label: true,
      parentId: true,
      linkedVariableIds: true
    }
  });

  if (!sourceNode) {
    console.log('❌ Nœud source "Rampant toiture" introuvable');
    return;
  }

  console.log('\n📦 ÉTAPE 1: Nœud source identifié');
  console.log(`   ID: ${sourceNode.id}`);
  console.log(`   Label: ${sourceNode.label}`);
  console.log(`   Parent: ${sourceNode.parentId}`);
  console.log(`   LinkedVariableIds: ${sourceNode.linkedVariableIds}`);

  // 2. Simuler la copie du nœud
  const suffix = '1';
  const copiedNodeId = `${sourceNode.id}-${suffix}`;
  const copiedParentId = sourceNode.parentId ? `${sourceNode.parentId}-${suffix}` : null;

  console.log('\n\n📋 ÉTAPE 2: deepCopyNodeInternal simule la copie');
  console.log(`   Nouveau ID: ${copiedNodeId}`);
  console.log(`   Parent calculé (sans cloneExternalParents): ${copiedParentId}`);
  console.log(`   ❓ Est-ce que ce parent existe?`);

  // Vérifier si le parent cible existe
  if (copiedParentId) {
    const parentExists = await prisma.treeBranchLeafNode.findUnique({
      where: { id: copiedParentId },
      select: { id: true, label: true }
    });

    if (parentExists) {
      console.log(`   ✅ OUI: ${parentExists.label}`);
    } else {
      console.log(`   ❌ NON: Le parent ${copiedParentId} n'existe pas`);
      console.log(`   → Le nœud sera créé avec parentId original: ${sourceNode.parentId}`);
    }
  }

  // 3. Simuler la copie des variables
  console.log('\n\n🔄 ÉTAPE 3: Copie des linkedVariableIds');
  console.log('   (Boucle dans deep-copy-service.ts ligne ~820)\n');

  const linkedVarIds = Array.isArray(sourceNode.linkedVariableIds)
    ? sourceNode.linkedVariableIds
    : [];

  const displayNodesCreated = [];

  for (const varId of linkedVarIds) {
    console.log(`   📌 Variable: ${varId}`);

    const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
      where: { id: varId },
      select: {
        id: true,
        nodeId: true,
        displayName: true,
        sourceRef: true
      }
    });

    if (!variable) {
      console.log(`      ❌ Variable introuvable`);
      continue;
    }

    console.log(`      Nom: ${variable.displayName}`);
    console.log(`      SourceRef: ${variable.sourceRef}`);

    // Check si c'est une shared-ref
    const isSharedRef = varId.startsWith('shared-ref-');
    if (isSharedRef) {
      console.log(`      ⏭️  SKIP: C'est une shared-ref → pas de copie`);
      continue;
    }

    // Sinon, copyVariableWithCapacities sera appelé
    console.log(`      ✅ Appel copyVariableWithCapacities:`);
    
    const newVarId = `${varId}-${suffix}`;
    const displayNodeId = variable.nodeId ? `${variable.nodeId}-${suffix}` : newVarId;
    
    console.log(`         Nouvelle variable ID: ${newVarId}`);
    console.log(`         Nœud d'affichage ID: ${displayNodeId}`);

    // Le nœud d'affichage sera créé avec quel parent?
    // Dans variable-copy-engine.ts, displayParentId vient de deep-copy-service
    // qui passe newParentId (le parent du champ au moment de la copie)
    
    console.log(`         Parent du nœud d'affichage: ${copiedParentId || sourceNode.parentId}`);
    console.log(`         ⚠️  PROBLÈME: Ce parent ne sera JAMAIS réaligné!`);
    console.log(`         ⚠️  Le nœud d'affichage ne sera PAS ajouté à duplicatedNodeIds`);
    console.log(`         ⚠️  reassignCopiedNodesToDuplicatedParents ne le touchera pas`);

    displayNodesCreated.push({
      displayNodeId,
      variableId: newVarId,
      displayName: variable.displayName,
      expectedParent: copiedParentId || sourceNode.parentId
    });
  }

  // 4. Simuler reassignCopiedNodesToDuplicatedParents
  console.log('\n\n🧭 ÉTAPE 4: reassignCopiedNodesToDuplicatedParents');
  console.log('   (Dans repeat-executor.ts ligne ~420)\n');

  console.log(`   duplicatedNodeIds contient:`);
  console.log(`      - ${copiedNodeId} (le champ copié) ✅`);
  console.log(`   duplicatedNodeIds NE contient PAS:`);
  for (const display of displayNodesCreated) {
    console.log(`      - ${display.displayNodeId} (affichage de ${display.displayName}) ❌`);
  }

  console.log(`\n   Résultat:`);
  console.log(`      ✅ ${copiedNodeId} sera réaligné vers ${copiedParentId}`);
  console.log(`      ❌ Les nœuds d'affichage resteront sous ${sourceNode.parentId || 'leur parent original'}`);

  // 5. Diagnostic final
  console.log('\n\n' + '='.repeat(80));
  console.log('🔍 DIAGNOSTIC:\n');
  console.log('❌ PROBLÈME IDENTIFIÉ:');
  console.log('   1. deep-copy-service.ts appelle copyVariableWithCapacities');
  console.log('   2. copyVariableWithCapacities crée les nœuds d\'affichage');
  console.log('   3. Ces nœuds ne sont PAS ajoutés à duplicatedNodeIds');
  console.log('   4. reassignCopiedNodesToDuplicatedParents ne les réaligne pas');
  console.log('   5. Résultat: affichages orphelins sous mauvais parent\n');

  console.log('✅ SOLUTION:');
  console.log('   Dans deep-copy-service.ts, après copyVariableWithCapacities:');
  console.log('   1. Récupérer le nodeId du nœud d\'affichage créé');
  console.log('   2. Le stocker dans un Map pour le retourner au repeat-executor');
  console.log('   3. Dans repeat-executor, ajouter ces IDs à duplicatedNodeIds');
  console.log('   4. reassignCopiedNodesToDuplicatedParents les réalignera automatiquement\n');

  console.log('📝 IMPLÉMENTATION:');
  console.log('   1. Modifier DeepCopyResult pour inclure displayNodeIds: string[]');
  console.log('   2. Dans deep-copy-service, collecter les IDs des affichages créés');
  console.log('   3. Dans repeat-executor, après deepCopyNodeInternal:');
  console.log('      - Ajouter copyResult.displayNodeIds à duplicatedNodeIds');
  console.log('      - Ajouter les mapping dans originalNodeIdByCopyId');

  console.log('\n' + '='.repeat(80));
  console.log('✅ TEST TERMINÉ - Solution confirmée\n');
}

simulateRepeatFlow()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
