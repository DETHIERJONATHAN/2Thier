import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
  console.log('\n==================== DIAGNOSTIC REPEATER FULL CYCLE ====================\n');

  try {
    // 1️⃣ TEMPLATES ET LINKEDVARIABLEIDS
    console.log('📋 ÉTAPE 1: Vérifier les TEMPLATES et linkedVariableIds');
    const templates = await prisma.treeNode.findMany({
      where: {
        id: {
          in: [
            '1191316a-16d8-4614-9a54-b85be9d55a89',
            '962677c1-224e-4f1a-9837-88cbc2be2aad',
            'b92c3d0b-cd41-4689-9c72-3660a0ad8fa3',
            'f81b2ace-9f6c-45d4-82a7-a8e4bf842e45',
            '7d3dc335-ab7e-43e2-bbf1-395981a7938a',
            'ea10e9f4-9002-4923-8417-f1b4e3a1bdc7',
            '6844ea47-db3d-4479-9e4e-ad207f7924e4',
          ],
        },
      },
      select: {
        id: true,
        label: true,
        linkedVariableIds: true,
        type: true,
      },
    });

    console.log(`✅ ${templates.length} templates trouvés:\n`);
    templates.forEach((t) => {
      console.log(`   ${t.label} (${t.id})`);
      console.log(`      linkedVariableIds: ${JSON.stringify(t.linkedVariableIds)}`);
    });

    // 2️⃣ VÉRIFIER LES DISPLAY NODES EXISTANTS
    console.log('\n📊 ÉTAPE 2: Afficher les DISPLAY NODES actuels (leaf_display)');
    const displayNodes = await prisma.treeNode.findMany({
      where: {
        type: 'leaf_display',
        parentId: {
          in: [
            '1191316a-16d8-4614-9a54-b85be9d55a89',
            '962677c1-224e-4f1a-9837-88cbc2be2aad',
            'b92c3d0b-cd41-4689-9c72-3660a0ad8fa3',
            'f81b2ace-9f6c-45d4-82a7-a8e4bf842e45',
            '7d3dc335-ab7e-43e2-bbf1-395981a7938a',
            'ea10e9f4-9002-4923-8417-f1b4e3a1bdc7',
            '6844ea47-db3d-4479-9e4e-ad207f7924e4',
          ],
        },
      },
      select: {
        id: true,
        label: true,
        parentId: true,
        metadata: true,
      },
    });

    console.log(`✅ ${displayNodes.length} display nodes trouvés (templates BASE):\n`);
    displayNodes.forEach((d) => {
      console.log(`   ${d.label} → parent: ${d.parentId}`);
    });

    // 3️⃣ VÉRIFIER LES DISPLAY NODES COPIÉS (-1)
    console.log(
      '\n📊 ÉTAPE 3: Afficher les DISPLAY NODES copiés (leaf_display avec suffix -1)'
    );
    const copiedDisplayNodes = await prisma.treeNode.findMany({
      where: {
        type: 'leaf_display',
        id: {
          contains: '-1',
        },
        parentId: {
          in: [
            '1191316a-16d8-4614-9a54-b85be9d55a89-1',
            '962677c1-224e-4f1a-9837-88cbc2be2aad-1',
            'b92c3d0b-cd41-4689-9c72-3660a0ad8fa3-1',
            'f81b2ace-9f6c-45d4-82a7-a8e4bf842e45-1',
            '7d3dc335-ab7e-43e2-bbf1-395981a7938a-1',
            'ea10e9f4-9002-4923-8417-f1b4e3a1bdc7-1',
            '6844ea47-db3d-4479-9e4e-ad207f7924e4-1',
          ],
        },
      },
      select: {
        id: true,
        label: true,
        parentId: true,
        metadata: true,
      },
    });

    console.log(`✅ ${copiedDisplayNodes.length} display nodes COPIÉS trouvés (-1):\n`);
    copiedDisplayNodes.forEach((d) => {
      console.log(`   ${d.label} → parent: ${d.parentId}`);
    });

    // 4️⃣ VÉRIFIER TREEBRANCHLEAFNODEVA RIABLE ORPHELINES
    console.log(
      '\n🔍 ÉTAPE 4: Chercher les TreeBranchLeafNodeVariable orphelines'
    );
    const orphanedVars = await prisma.treeBranchLeafNodeVariable.findMany({
      where: {
        linkedNodeId: {
          in: [
            '1191316a-16d8-4614-9a54-b85be9d55a89',
            '962677c1-224e-4f1a-9837-88cbc2be2aad',
            'b92c3d0b-cd41-4689-9c72-3660a0ad8fa3',
            'f81b2ace-9f6c-45d4-82a7-a8e4bf842e45',
            '7d3dc335-ab7e-43e2-bbf1-395981a7938a',
            'ea10e9f4-9002-4923-8417-f1b4e3a1bdc7',
            '6844ea47-db3d-4479-9e4e-ad207f7924e4',
          ],
        },
      },
      select: {
        id: true,
        nodeId: true,
        linkedNodeId: true,
        originalVariableId: true,
        newVariableId: true,
        createdAt: true,
      },
    });

    console.log(`✅ ${orphanedVars.length} TreeBranchLeafNodeVariable entries:\n`);
    orphanedVars.slice(0, 10).forEach((v) => {
      console.log(`   nodeId: ${v.nodeId} → linkedNodeId: ${v.linkedNodeId}`);
      console.log(`      originalVarId: ${v.originalVariableId}`);
      console.log(`      newVarId: ${v.newVariableId}\n`);
    });
    if (orphanedVars.length > 10) {
      console.log(`   ... et ${orphanedVars.length - 10} autres entrées`);
    }

    // 5️⃣ VÉRIFIER LES VARIABLLES
    console.log('\n📈 ÉTAPE 5: Afficher les VARIABLES de ces nodes');
    const variables = await prisma.treeNode.findMany({
      where: {
        type: 'leaf_variable',
        parentId: {
          in: [
            '1191316a-16d8-4614-9a54-b85be9d55a89',
            '962677c1-224e-4f1a-9837-88cbc2be2aad',
            'b92c3d0b-cd41-4689-9c72-3660a0ad8fa3',
            'f81b2ace-9f6c-45d4-82a7-a8e4bf842e45',
            '7d3dc335-ab7e-43e2-bbf1-395981a7938a',
            'ea10e9f4-9002-4923-8417-f1b4e3a1bdc7',
            '6844ea47-db3d-4479-9e4e-ad207f7924e4',
          ],
        },
      },
      select: {
        id: true,
        label: true,
        parentId: true,
        order: true,
      },
    });

    console.log(`✅ ${variables.length} leaf_variable nodes:\n`);
    variables.slice(0, 10).forEach((v) => {
      console.log(`   ${v.label} (${v.id}) → parent: ${v.parentId}`);
    });

    // 6️⃣ QUESTION CLÉE: POURQUOI SEULEMENT 1/3?
    console.log('\n❓ ÉTAPE 6: Analyser POURQUOI 1/3 seulement');
    console.log('   Cherchons les TEMPLATES avec linkedVariableIds non vides...');

    const templatesWithVars = templates.filter((t) => t.linkedVariableIds?.length > 0);
    console.log(`\n   ${templatesWithVars.length}/${templates.length} templates ont linkedVariableIds`);
    templatesWithVars.forEach((t) => {
      console.log(`      ✅ ${t.label}: ${t.linkedVariableIds.length} variables`);
    });

    console.log(
      '\n   Les display nodes se créent SEULEMENT si linkedVariableIds est rempli!'
    );
    console.log('   Si linkedVariableIds est vide → PAS DE DISPLAY NODE!\n');

    // 7️⃣ RÉSUMÉ FINAL
    console.log('📋 RÉSUMÉ FINAL');
    console.log(`   Templates BASE: ${templates.length}`);
    console.log(`   Display nodes BASE: ${displayNodes.length}`);
    console.log(`   Display nodes COPIÉS (-1): ${copiedDisplayNodes.length}`);
    console.log(`   TreeBranchLeafNodeVariable entries: ${orphanedVars.length}`);
    console.log(`   Templates avec linkedVariableIds: ${templatesWithVars.length}`);
    console.log(`\n   ⚠️  PROBLÈME: Après suppression + re-création, seulement 1/3 display nodes`);
    console.log('   CAUSE PROBABLE: Les linkedVariableIds ne sont pas préservés');
    console.log('   ou le cache (TreeBranchLeafNodeVariable) empêche la re-création\n');
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
