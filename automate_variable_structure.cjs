const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function automateVariableStructure() {
  console.log('🤖 AUTOMATISATION DE LA STRUCTURE DES VARIABLES');
  console.log('🎯 nodeId → ID | submissionId → dummy | value → label du node\n');
  
  try {
    // 1. Créer une soumission dummy pour les variables
    let dummySubmission;
    try {
      dummySubmission = await prisma.treeBranchLeafSubmission.findFirst({
        where: { id: 'dummy-submission-for-variables' }
      });
      
      if (!dummySubmission) {
        dummySubmission = await prisma.treeBranchLeafSubmission.create({
          data: {
            id: 'dummy-submission-for-variables',
            treeId: '7de9b14d-974b-4c5e-839f-9e1b4e6c7d8a', // Un tree ID existant
            organizationId: '7de9b14d-974b-4c5e-839f-9e1b4e6c7d8a',
            userId: '7de9b14d-974b-4c5e-839f-9e1b4e6c7d8a',
            submittedAt: new Date()
          }
        });
        console.log('✅ Soumission dummy créée');
      } else {
        console.log('✅ Soumission dummy existe déjà');
      }
    } catch (error) {
      console.log('⚠️  Erreur création dummy submission, on continue...');
    }

    // 2. Récupérer tous les enregistrements de variables
    const variableRecords = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        isVariable: true
      },
      include: {
        TreeBranchLeafNode: true
      }
    });

    console.log(`📊 ${variableRecords.length} variables trouvées\n`);

    const newRecords = [];

    // 3. Préparer les nouveaux enregistrements restructurés
    for (const record of variableRecords) {
      if (record.TreeBranchLeafNode) {
        const nodeId = record.nodeId;
        const nodeLabel = record.TreeBranchLeafNode.label;
        
        console.log(`🔄 Restructuration: ${record.id}`);
        console.log(`   🆔 Nouvel ID: ${nodeId}`);
        console.log(`   📝 submissionId: dummy-submission-for-variables`);
        console.log(`   🏷️  value: ${nodeLabel}`);
        console.log(`   🔗 nodeId: ${nodeId}`);

        const newRecord = {
          id: nodeId, // ✨ LE NODEID DEVIENT L'ID !
          submissionId: 'dummy-submission-for-variables', // ✨ SUBMISSION DUMMY
          nodeId: nodeId,
          value: nodeLabel, // ✨ LABEL DU NODE DANS VALUE !
          createdAt: record.createdAt,
          lastResolved: record.lastResolved,
          operationDetail: record.operationDetail,
          operationResult: record.operationResult,
          operationSource: record.operationSource,
          sourceRef: record.sourceRef,
          fieldLabel: record.fieldLabel,
          isVariable: true,
          variableDisplayName: record.variableDisplayName,
          variableKey: record.variableKey,
          variableUnit: record.variableUnit
        };

        newRecords.push({ old: record, new: newRecord });
        console.log('   ✅ Préparé\n');
      }
    }

    // 4. Supprimer les anciens et créer les nouveaux
    console.log('🔄 Application des changements...\n');
    
    for (const { old, new: newRecord } of newRecords) {
      try {
        // Supprimer l'ancien
        await prisma.treeBranchLeafSubmissionData.delete({
          where: { id: old.id }
        });
        console.log(`🗑️  Supprimé: ${old.id}`);
        
        // Créer le nouveau avec nodeId comme ID
        await prisma.treeBranchLeafSubmissionData.create({
          data: newRecord
        });
        console.log(`✨ Créé: ${newRecord.id} (value: "${newRecord.value}")`);
        
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`⚠️  ${newRecord.id} existe déjà, mise à jour...`);
          await prisma.treeBranchLeafSubmissionData.update({
            where: { id: newRecord.id },
            data: {
              value: newRecord.value,
              isVariable: true,
              variableDisplayName: newRecord.variableDisplayName,
              variableKey: newRecord.variableKey,
              variableUnit: newRecord.variableUnit
            }
          });
          console.log(`✅ Mis à jour: ${newRecord.id}`);
        } else {
          console.error(`❌ Erreur pour ${newRecord.id}:`, error.message);
        }
      }
    }

    // 5. Vérification finale
    console.log('\n📋 VÉRIFICATION FINALE:');
    const finalRecords = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        isVariable: true
      },
      orderBy: { id: 'asc' }
    });

    console.log(`\n✅ ${finalRecords.length} variables restructurées:`);
    finalRecords.forEach((record, i) => {
      console.log(`${i + 1}. ID: ${record.id}`);
      console.log(`   📁 submissionId: ${record.submissionId}`);
      console.log(`   🔗 nodeId: ${record.nodeId}`);
      console.log(`   💎 value: "${record.value}"`);
      console.log(`   🏷️  variable: ${record.variableKey}\n`);
    });

    console.log('🎉 AUTOMATISATION TERMINÉE AVEC SUCCÈS !');
    console.log('👉 Les variables ont maintenant:');
    console.log('   • ID = nodeId');
    console.log('   • submissionId = dummy');
    console.log('   • value = label du node');

  } catch (error) {
    console.error('❌ Erreur lors de l\'automatisation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

automateVariableStructure();