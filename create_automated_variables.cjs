const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createAutomatedVariableStructure() {
  try {
    console.log('🤖 CRÉATION AUTOMATIQUE DE LA STRUCTURE VARIABLES\n');
    
    // 1. Récupérer toutes les variables définies
    const variables = await prisma.treeBranchLeafNodeVariable.findMany({
      include: {
        TreeBranchLeafNode: true
      }
    });
    
    console.log(`🔍 Variables trouvées: ${variables.length}\n`);
    
    if (variables.length === 0) {
      console.log('❌ Aucune variable trouvée dans TreeBranchLeafNodeVariable');
      return;
    }
    
    // 2. Créer une soumission dummy si nécessaire
    let dummySubmissionId = 'dummy-for-variables';
    let dummySubmission;
    
    try {
      dummySubmission = await prisma.treeBranchLeafSubmission.findUnique({
        where: { id: dummySubmissionId }
      });
      
      if (!dummySubmission) {
        // Récupérer un tree et org existants
        const existingData = await prisma.treeBranchLeafSubmissionData.findFirst({
          include: {
            TreeBranchLeafSubmission: true
          }
        });
        
        if (existingData) {
          dummySubmission = await prisma.treeBranchLeafSubmission.create({
            data: {
              id: dummySubmissionId,
              treeId: existingData.TreeBranchLeafSubmission.treeId,
              organizationId: existingData.TreeBranchLeafSubmission.organizationId,
              userId: existingData.TreeBranchLeafSubmission.userId,
              submittedAt: new Date()
            }
          });
          console.log('✅ Soumission dummy créée');
        }
      } else {
        console.log('✅ Soumission dummy existe déjà');
      }
    } catch (error) {
      console.log('⚠️  Problème avec la soumission dummy, on utilise une existante...');
      const existingSubmission = await prisma.treeBranchLeafSubmission.findFirst();
      dummySubmissionId = existingSubmission.id;
    }
    
    console.log(`📁 Utilisation de submissionId: ${dummySubmissionId}\n`);
    
    // 3. Créer les enregistrements automatiquement
    const createdRecords = [];
    
    for (const variable of variables) {
      const nodeId = variable.nodeId;
      const nodeLabel = variable.TreeBranchLeafNode ? variable.TreeBranchLeafNode.label : `Variable ${variable.exposedKey}`;
      
      console.log(`🔄 Création automatique pour variable: ${variable.exposedKey}`);
      console.log(`   🆔 ID: ${nodeId} (= nodeId)`);
      console.log(`   📁 submissionId: ${dummySubmissionId}`);
      console.log(`   🔗 nodeId: ${nodeId}`);
      console.log(`   💎 value: "${nodeLabel}" (label du node)`);
      console.log(`   🔑 variableKey: ${variable.exposedKey}`);
      
      try {
        const newRecord = await prisma.treeBranchLeafSubmissionData.create({
          data: {
            id: nodeId, // ✨ NODEID COMME ID !
            submissionId: dummySubmissionId, // ✨ DUMMY SUBMISSION
            nodeId: nodeId,
            value: nodeLabel, // ✨ LABEL DU NODE !
            isVariable: true,
            variableKey: variable.exposedKey,
            variableDisplayName: variable.displayName || 'Variable auto',
            variableUnit: variable.unit || '',
            fieldLabel: nodeLabel,
            sourceRef: `auto-variable-${variable.exposedKey}`
          }
        });
        
        createdRecords.push(newRecord);
        console.log(`   ✅ Créé avec succès!\n`);
        
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`   ⚠️  Existe déjà, mise à jour...`);
          await prisma.treeBranchLeafSubmissionData.update({
            where: { id: nodeId },
            data: {
              value: nodeLabel,
              isVariable: true,
              variableKey: variable.exposedKey,
              variableDisplayName: variable.displayName || 'Variable auto',
              variableUnit: variable.unit || ''
            }
          });
          console.log(`   ✅ Mis à jour!\n`);
        } else {
          console.error(`   ❌ Erreur:`, error.message);
        }
      }
    }
    
    // 4. Vérification finale
    console.log('📋 VÉRIFICATION FINALE:\n');
    const finalVariables = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        isVariable: true
      },
      orderBy: { variableKey: 'asc' }
    });
    
    console.log(`✅ ${finalVariables.length} variables automatiquement structurées:\n`);
    finalVariables.forEach((record, i) => {
      console.log(`${i + 1}. 🆔 ID: ${record.id}`);
      console.log(`   📁 submissionId: ${record.submissionId}`);
      console.log(`   🔗 nodeId: ${record.nodeId}`);
      console.log(`   💎 value: "${record.value}"`);
      console.log(`   🔑 variableKey: ${record.variableKey}\n`);
    });
    
    console.log('🎉 AUTOMATISATION TERMINÉE !');
    console.log('✨ Structure automatique appliquée:');
    console.log('   • ID = nodeId de la variable');
    console.log('   • submissionId = dummy (pas utilisé)');
    console.log('   • value = label du node associé');
    console.log('   • Toutes les variables ont isVariable=true');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAutomatedVariableStructure();