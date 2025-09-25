const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createVariablesDirectly() {
  try {
    console.log('🤖 CRÉATION DIRECTE DES VARIABLES\n');
    
    // 1. Récupérer les variables
    const variables = await prisma.treeBranchLeafNodeVariable.findMany({
      include: {
        TreeBranchLeafNode: true
      }
    });
    
    console.log(`🔍 Variables: ${variables.length}\n`);
    
    // 2. Récupérer une soumission existante
    const existingSubmission = await prisma.treeBranchLeafSubmission.findFirst();
    console.log(`📁 Soumission existante: ${existingSubmission.id}\n`);
    
    // 3. Créer chaque variable individuellement
    for (const variable of variables) {
      const nodeId = variable.nodeId;
      const nodeLabel = variable.TreeBranchLeafNode?.label || `Variable ${variable.exposedKey}`;
      
      console.log(`🔄 ${variable.exposedKey}:`);
      console.log(`   🆔 ID cible: ${nodeId}`);
      console.log(`   💎 Value: "${nodeLabel}"`);
      
      try {
        // Vérifier si existe déjà
        const existing = await prisma.treeBranchLeafSubmissionData.findUnique({
          where: { id: nodeId }
        });
        
        if (existing) {
          console.log(`   ⚠️  Existe déjà, mise à jour...`);
          await prisma.treeBranchLeafSubmissionData.update({
            where: { id: nodeId },
            data: {
              value: nodeLabel,
              isVariable: true,
              variableKey: variable.exposedKey,
              variableDisplayName: variable.displayName,
              variableUnit: variable.unit || '',
              fieldLabel: nodeLabel
            }
          });
          console.log(`   ✅ Mis à jour!\n`);
        } else {
          console.log(`   ➕ Création...`);
          await prisma.treeBranchLeafSubmissionData.create({
            data: {
              id: nodeId,
              submissionId: existingSubmission.id,
              nodeId: nodeId,
              value: nodeLabel,
              isVariable: true,
              variableKey: variable.exposedKey,
              variableDisplayName: variable.displayName,
              variableUnit: variable.unit || '',
              fieldLabel: nodeLabel
            }
          });
          console.log(`   ✅ Créé!\n`);
        }
      } catch (error) {
        console.log(`   ❌ Erreur: ${error.message}\n`);
      }
    }
    
    // 4. Vérification
    console.log('📋 RÉSULTAT FINAL:\n');
    const result = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        OR: [
          { isVariable: true },
          { variableKey: { not: null } }
        ]
      }
    });
    
    console.log(`✅ Variables créées: ${result.length}\n`);
    result.forEach((r, i) => {
      console.log(`${i+1}. 🆔 ${r.id} = 🔗 ${r.nodeId}`);
      console.log(`   📁 submissionId: ${r.submissionId}`);
      console.log(`   💎 value: "${r.value}"`);
      console.log(`   🔑 variableKey: ${r.variableKey}\n`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createVariablesDirectly();