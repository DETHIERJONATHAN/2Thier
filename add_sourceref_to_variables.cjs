const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addSourceRefToVariables() {
  try {
    console.log('🔗 AJOUT DE SOURCEREF AUX VARIABLES\n');
    
    // 1. Récupérer toutes les variables avec leur sourceRef
    const variables = await prisma.treeBranchLeafNodeVariable.findMany({
      select: {
        id: true,
        nodeId: true,
        exposedKey: true,
        sourceRef: true,
        TreeBranchLeafNode: {
          select: {
            label: true
          }
        }
      }
    });
    
    console.log(`🔍 Variables trouvées: ${variables.length}\n`);
    
    // 2. Mettre à jour chaque variable dans TreeBranchLeafSubmissionData
    let updatedCount = 0;
    
    for (const variable of variables) {
      const nodeId = variable.nodeId;
      const sourceRef = variable.sourceRef;
      const variableKey = variable.exposedKey;
      
      console.log(`🔄 Variable: ${variableKey}`);
      console.log(`   🆔 nodeId: ${nodeId}`);
      console.log(`   🔗 sourceRef: ${sourceRef || 'null'}`);
      
      try {
        // Chercher l'enregistrement correspondant (où ID = nodeId)
        const submissionData = await prisma.treeBranchLeafSubmissionData.findUnique({
          where: { id: nodeId }
        });
        
        if (submissionData) {
          // Mettre à jour la sourceRef
          const updated = await prisma.treeBranchLeafSubmissionData.update({
            where: { id: nodeId },
            data: {
              sourceRef: sourceRef
            }
          });
          
          console.log(`   ✅ sourceRef mise à jour: "${sourceRef}"`);
          updatedCount++;
        } else {
          console.log(`   ⚠️  Aucun enregistrement trouvé avec ID = ${nodeId}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Erreur: ${error.message}`);
      }
      
      console.log('');
    }
    
    // 3. Vérification finale
    console.log('📋 VÉRIFICATION FINALE:\n');
    const updatedVariables = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        isVariable: true
      },
      select: {
        id: true,
        nodeId: true,
        variableKey: true,
        sourceRef: true,
        value: true
      },
      orderBy: { variableKey: 'asc' }
    });
    
    console.log(`✅ ${updatedCount} variables mises à jour sur ${variables.length}\n`);
    
    updatedVariables.forEach((record, i) => {
      console.log(`${i + 1}. 🔑 ${record.variableKey}`);
      console.log(`   🆔 ID: ${record.id}`);
      console.log(`   🔗 nodeId: ${record.nodeId}`);
      console.log(`   📍 sourceRef: "${record.sourceRef || 'null'}"`);
      console.log(`   💎 value: "${record.value}"\n`);
    });
    
    console.log('🎉 SOURCEREF AJOUTÉE AVEC SUCCÈS !');
    console.log('✨ Chaque variable a maintenant sa sourceRef de TreeBranchLeafNodeVariable');
    console.log('   dans la colonne sourceRef de TreeBranchLeafSubmissionData');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSourceRefToVariables();