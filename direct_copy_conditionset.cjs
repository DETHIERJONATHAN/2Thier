const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function directCopyConditionSet() {
  try {
    console.log('📋 COPIER-COLLER DIRECT (SANS TRANSFORMATION)\n');
    
    // 1. Variables avec sourceRef condition
    const conditionVariables = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        isVariable: true,
        sourceRef: {
          startsWith: 'condition:'
        }
      }
    });
    
    console.log(`🔍 Variables condition: ${conditionVariables.length}\n`);
    
    for (const variable of conditionVariables) {
      const conditionId = variable.sourceRef.replace('condition:', '');
      
      console.log(`🔄 Variable: ${variable.variableKey}`);
      console.log(`   🎯 conditionId: ${conditionId}`);
      
      try {
        // 2. Récupérer la condition avec conditionSet RAW
        const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
          where: { id: conditionId },
          select: {
            conditionSet: true  // SEULEMENT le conditionSet
          }
        });
        
        if (condition && condition.conditionSet) {
          console.log(`   📋 conditionSet récupéré`);
          console.log(`   📄 Taille: ${JSON.stringify(condition.conditionSet).length} caractères`);
          
          // 3. COPIE DIRECTE - AUCUNE TRANSFORMATION
          await prisma.treeBranchLeafSubmissionData.update({
            where: { id: variable.id },
            data: {
              operationDetail: condition.conditionSet  // COPIE BRUTE
            }
          });
          
          console.log(`   ✅ COPIÉ TEL QUEL dans operationDetail`);
          
          // Afficher un extrait pour vérifier
          const conditionSetStr = JSON.stringify(condition.conditionSet);
          console.log(`   🔍 Début: ${conditionSetStr.substring(0, 100)}...`);
          
        } else {
          console.log(`   ❌ Condition ${conditionId} introuvable`);
        }
        
      } catch (error) {
        console.log(`   ❌ Erreur: ${error.message}`);
      }
      
      console.log('');
    }
    
    // 4. Vérification que c'est identique
    console.log('🔍 VÉRIFICATION DU COPIER-COLLER:\n');
    
    for (const variable of conditionVariables) {
      const conditionId = variable.sourceRef.replace('condition:', '');
      
      // Récupérer l'original
      const original = await prisma.treeBranchLeafNodeCondition.findUnique({
        where: { id: conditionId },
        select: { conditionSet: true }
      });
      
      // Récupérer la copie
      const copy = await prisma.treeBranchLeafSubmissionData.findUnique({
        where: { id: variable.id },
        select: { operationDetail: true }
      });
      
      if (original && copy) {
        const originalStr = JSON.stringify(original.conditionSet);
        const copyStr = JSON.stringify(copy.operationDetail);
        const isIdentical = originalStr === copyStr;
        
        console.log(`📋 ${variable.variableKey}:`);
        console.log(`   🔸 Original: ${originalStr.length} caractères`);
        console.log(`   🔹 Copie: ${copyStr.length} caractères`);
        console.log(`   ${isIdentical ? '✅ IDENTIQUE' : '❌ DIFFÉRENT'}`);
        
        if (!isIdentical) {
          console.log(`   🔍 Original début: ${originalStr.substring(0, 50)}...`);
          console.log(`   🔍 Copie début: ${copyStr.substring(0, 50)}...`);
        }
        console.log('');
      }
    }
    
    console.log('🎉 COPIER-COLLER DIRECT TERMINÉ !');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

directCopyConditionSet();