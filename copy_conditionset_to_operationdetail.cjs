const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function copyConditionSetToOperationDetail() {
  try {
    console.log('📋 COPIER-COLLER CONDITIONSET → OPERATIONDETAIL\n');
    
    // 1. Récupérer toutes les variables avec sourceRef de type "condition:"
    const conditionVariables = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        isVariable: true,
        sourceRef: {
          startsWith: 'condition:'
        }
      }
    });
    
    console.log(`🔍 Variables de condition trouvées: ${conditionVariables.length}\n`);
    
    for (const variable of conditionVariables) {
      const conditionId = variable.sourceRef.replace('condition:', '');
      
      console.log(`🔄 Variable: ${variable.variableKey}`);
      console.log(`   🆔 ID: ${variable.id}`);
      console.log(`   🔗 sourceRef: ${variable.sourceRef}`);
      console.log(`   🎯 conditionId: ${conditionId}`);
      
      try {
        // 2. Récupérer la condition correspondante
        const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
          where: { id: conditionId }
        });
        
        if (condition && condition.conditionSet) {
          console.log(`   📋 conditionSet trouvé (${JSON.stringify(condition.conditionSet).length} caractères)`);
          
          // 3. COPIER-COLLER DIRECT: conditionSet → operationDetail
          await prisma.treeBranchLeafSubmissionData.update({
            where: { id: variable.id },
            data: {
              operationDetail: condition.conditionSet // ✨ COPIE DIRECTE !
            }
          });
          
          console.log(`   ✅ operationDetail mis à jour (copie exacte)`);
        } else {
          console.log(`   ⚠️  Condition ${conditionId} non trouvée ou sans conditionSet`);
        }
        
      } catch (error) {
        console.log(`   ❌ Erreur: ${error.message}`);
      }
      
      console.log('');
    }
    
    // 4. Vérification finale
    console.log('📋 VÉRIFICATION:\n');
    const updatedVariables = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        isVariable: true,
        sourceRef: {
          startsWith: 'condition:'
        }
      },
      select: {
        id: true,
        variableKey: true,
        sourceRef: true,
        operationDetail: true
      }
    });
    
    updatedVariables.forEach((v, i) => {
      console.log(`${i + 1}. 🔑 ${v.variableKey}`);
      console.log(`   📍 sourceRef: ${v.sourceRef}`);
      const hasOperationDetail = v.operationDetail !== null;
      console.log(`   📋 operationDetail: ${hasOperationDetail ? '✅ Copié' : '❌ Vide'}`);
      
      if (hasOperationDetail) {
        const detail = v.operationDetail;
        console.log(`   📊 Contenu: id="${detail.id}", mode="${detail.mode}", ${detail.branches?.length || 0} branches`);
      }
      console.log('');
    });
    
    console.log('🎉 COPIER-COLLER TERMINÉ !');
    console.log('✨ operationDetail = conditionSet (copie exacte)');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

copyConditionSetToOperationDetail();