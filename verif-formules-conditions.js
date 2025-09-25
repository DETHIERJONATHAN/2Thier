import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verifierFormulesDansConditions() {
  try {
    console.log('🔍 Vérification des formules dans les conditions...');
    
    // Chercher toutes les conditions qui contiennent des formules
    const conditions = await prisma.treeBranchLeafNodeCondition.findMany({
      select: {
        id: true,
        name: true,
        nodeId: true,
        conditionSet: true
      }
    });
    
    console.log(`📊 Total conditions trouvées: ${conditions.length}`);
    
    conditions.forEach((condition, i) => {
      console.log(`\n--- Condition ${i + 1}: ${condition.name} ---`);
      console.log('ID:', condition.id);
      console.log('NodeId:', condition.nodeId);
      
      const condSet = condition.conditionSet;
      if (condSet && typeof condSet === 'object') {
        // Vérifier dans branches
        if (condSet.branches && Array.isArray(condSet.branches)) {
          condSet.branches.forEach((branch, bi) => {
            if (branch.actions && Array.isArray(branch.actions)) {
              branch.actions.forEach((action, ai) => {
                if (action.nodeIds && Array.isArray(action.nodeIds)) {
                  const formulas = action.nodeIds.filter(id => id.includes('formula'));
                  if (formulas.length > 0) {
                    console.log(`  🎯 ALORS - Branch ${bi}, Action ${ai}: ${formulas.length} formule(s)`);
                    formulas.forEach(f => console.log(`    - ${f}`));
                  }
                }
              });
            }
          });
        }
        
        // Vérifier dans fallback (SINON)
        if (condSet.fallback && condSet.fallback.actions && Array.isArray(condSet.fallback.actions)) {
          condSet.fallback.actions.forEach((action, ai) => {
            if (action.nodeIds && Array.isArray(action.nodeIds)) {
              const formulas = action.nodeIds.filter(id => id.includes('formula'));
              if (formulas.length > 0) {
                console.log(`  🎯 SINON - Action ${ai}: ${formulas.length} formule(s)`);
                formulas.forEach(f => console.log(`    - ${f}`));
              }
            }
          });
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifierFormulesDansConditions();
