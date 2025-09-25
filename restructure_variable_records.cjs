const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function restructureVariableRecords() {
  console.log('🔄 Restructuration des enregistrements de variables...');
  
  try {
    // Récupérer tous les enregistrements de variables actuels
    const variableRecords = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        isVariable: true
      },
      include: {
        TreeBranchLeafNode: true // Pour récupérer le label du node
      }
    });

    console.log(`📊 ${variableRecords.length} enregistrements de variables trouvés`);

    const newRecords = [];

    for (const record of variableRecords) {
      if (record.TreeBranchLeafNode) {
        const nodeLabel = record.TreeBranchLeafNode.label;
        const nodeId = record.nodeId;
        
        console.log(`🔄 Préparation du nouvel enregistrement basé sur ${record.id}:`);
        console.log(`   - nouvel ID: ${nodeId} (ancien nodeId)`);
        console.log(`   - submissionId: null`);
        console.log(`   - nodeId: ${nodeId}`);
        console.log(`   - value: ${nodeLabel}`);

        // Préparer le nouvel enregistrement
        const newRecord = {
          id: nodeId,
          submissionId: null, // Mise à null comme demandé
          nodeId: nodeId,
          value: nodeLabel,
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
      } else {
        console.log(`⚠️  Enregistrement ${record.id} sans node associé`);
      }
    }

    // Supprimer les anciens enregistrements et créer les nouveaux
    for (const { old, new: newRecord } of newRecords) {
      try {
        // Supprimer l'ancien
        await prisma.treeBranchLeafSubmissionData.delete({
          where: { id: old.id }
        });
        
        // Créer le nouveau avec le nodeId comme ID
        await prisma.treeBranchLeafSubmissionData.create({
          data: newRecord
        });
        
        console.log(`✅ Restructuré ${old.id} → ${newRecord.id}`);
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`⚠️  L'enregistrement ${newRecord.id} existe déjà, mise à jour...`);
          await prisma.treeBranchLeafSubmissionData.update({
            where: { id: newRecord.id },
            data: {
              submissionId: null,
              value: newRecord.value,
              isVariable: true,
              variableDisplayName: newRecord.variableDisplayName,
              variableKey: newRecord.variableKey,
              variableUnit: newRecord.variableUnit
            }
          });
        } else {
          console.error(`❌ Erreur pour ${old.id}:`, error.message);
        }
      }
    }

    console.log('✅ Restructuration terminée avec succès !');
    
    // Vérification finale
    const updatedRecords = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        isVariable: true
      },
      select: {
        id: true,
        nodeId: true,
        submissionId: true,
        value: true,
        variableKey: true,
        variableDisplayName: true
      }
    });

    console.log('\n📋 État final des enregistrements de variables:');
    updatedRecords.forEach(record => {
      console.log(`   ID: ${record.id}, nodeId: ${record.nodeId}, submissionId: ${record.submissionId}, value: ${record.value}, variable: ${record.variableKey}`);
    });

  } catch (error) {
    console.error('❌ Erreur lors de la restructuration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restructureVariableRecords();