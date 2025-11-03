const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function syncVariableSourceRefs() {
  try {
    console.log('\n🔧 === SYNCHRONISATION DES sourceRef ===\n');
    console.log('Objectif: Synchroniser TreeBranchLeafNodeVariable.sourceRef avec data_instances.metadata.sourceRef\n');

    const formulaNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        tbl_type: 6,
        data_instances: { not: null }
      },
      include: {
        TreeBranchLeafNodeVariable: true
      }
    });

    console.log(`📊 Trouvé ${formulaNodes.length} champs formule avec data_instances\n`);

    const updates = [];

    for (const node of formulaNodes) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📝 ${node.label}`);
      console.log(`${'='.repeat(60)}`);

      if (!node.data_instances) continue;

      const dataInstances = node.data_instances;
      const firstInstanceKey = Object.keys(dataInstances)[0];
      const firstInstance = dataInstances[firstInstanceKey];

      if (!firstInstance || !firstInstance.metadata) {
        console.log('⚠️  Pas de metadata dans data_instances');
        continue;
      }

      const jsonSourceRef = firstInstance.metadata.sourceRef;
      console.log(`📦 data_instances.metadata.sourceRef: ${jsonSourceRef}`);

      if (node.TreeBranchLeafNodeVariable) {
        const dbSourceRef = node.TreeBranchLeafNodeVariable.sourceRef;
        console.log(`🗄️  TreeBranchLeafNodeVariable.sourceRef: ${dbSourceRef}`);

        if (jsonSourceRef !== dbSourceRef) {
          console.log(`\n❌ DÉSYNCHRONISÉ !`);
          console.log(`   JSON dit: "${jsonSourceRef}"`);
          console.log(`   DB dit:   "${dbSourceRef}"`);
          console.log(`\n🔧 Action: Mettre à jour la DB avec la valeur JSON`);

          updates.push({
            nodeId: node.id,
            variableId: node.TreeBranchLeafNodeVariable.id,
            oldSourceRef: dbSourceRef,
            newSourceRef: jsonSourceRef
          });
        } else {
          console.log(`✅ Déjà synchronisé`);
        }
      } else {
        console.log(`⚠️  Pas de TreeBranchLeafNodeVariable en DB`);
      }
    }

    if (updates.length > 0) {
      console.log(`\n\n${'='.repeat(60)}`);
      console.log(`📋 RÉSUMÉ DES MISES À JOUR`);
      console.log(`${'='.repeat(60)}\n`);

      updates.forEach((u, i) => {
        console.log(`${i + 1}. Variable ${u.variableId}`);
        console.log(`   Avant: ${u.oldSourceRef}`);
        console.log(`   Après: ${u.newSourceRef}\n`);
      });

      console.log(`\n🚀 Appliquer les ${updates.length} mises à jour ? (décommentez le code ci-dessous)`);
      console.log(`\n// DÉCOMMENTEZ POUR APPLIQUER:`);
      console.log(`/*`);
      console.log(`for (const update of updates) {`);
      console.log(`  await prisma.treeBranchLeafNodeVariable.update({`);
      console.log(`    where: { id: update.variableId },`);
      console.log(`    data: { sourceRef: update.newSourceRef }`);
      console.log(`  });`);
      console.log(`  console.log(\`✅ Mis à jour: \${update.variableId}\`);`);
      console.log(`}`);
      console.log(`*/`);

      // APPLIQUER AUTOMATIQUEMENT
      console.log(`\n🔥 APPLICATION AUTOMATIQUE DES CORRECTIONS...\n`);
      for (const update of updates) {
        await prisma.treeBranchLeafNodeVariable.update({
          where: { id: update.variableId },
          data: { sourceRef: update.newSourceRef }
        });
        console.log(`✅ Mis à jour: ${update.variableId} -> ${update.newSourceRef}`);
      }
      console.log(`\n🎉 TERMINÉ !`);

    } else {
      console.log(`\n✅ Tous les sourceRef sont déjà synchronisés !`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncVariableSourceRefs();
