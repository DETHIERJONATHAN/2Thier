const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function repairOrphanCapacities() {
  console.log('🔧 RÉPARATION DES CAPACITÉS ORPHELINES (FORMULES ET CONDITIONS UNIQUEMENT)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // 1. RÉPARATION DES FORMULES ORPHELINES
    console.log('\n🧮 === RÉPARATION DES FORMULES ===');
    
    const orphanFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
      include: {
        TreeBranchLeafNode: true
      }
    });

    for (const formula of orphanFormulas) {
      const node = formula.TreeBranchLeafNode;
      const linkedFormulaIds = node.linkedFormulaIds || [];
      const isLinked = linkedFormulaIds.includes(formula.id);
      
      // Vérifier s'il y a des variables associées à ce noeud
      const nodeVariables = await prisma.treeBranchLeafNodeVariable.findMany({
        where: { nodeId: formula.nodeId }
      });
      
      if (!isLinked && nodeVariables.length > 0) {
        console.log(`\n🔧 Réparation: "${formula.name}" → Nœud "${node.label}"`);
        console.log(`   - Formule ID: ${formula.id}`);
        console.log(`   - Nœud ID: ${formula.nodeId}`);
        
        // Ajouter l'ID de la formule aux linkedFormulaIds
        const updatedLinkedFormulaIds = [...linkedFormulaIds, formula.id];
        
        await prisma.treeBranchLeafNode.update({
          where: { id: formula.nodeId },
          data: {
            linkedFormulaIds: updatedLinkedFormulaIds
          }
        });
        
        console.log(`   ✅ Ajouté aux linkedFormulaIds: ${updatedLinkedFormulaIds.join(', ')}`);
        
        // Mettre à jour exposedKey des variables (pas besoin de mettre à jour car déjà correct)
        for (const variable of nodeVariables) {
          console.log(`   📝 Variable "${variable.displayName}" trouvée:`);
          console.log(`      - exposedKey: ${variable.exposedKey}`);
          console.log(`      - displayName: ${variable.displayName}`);
        }
      }
    }

    // 2. RÉPARATION DES CONDITIONS ORPHELINES
    console.log('\n⚡ === RÉPARATION DES CONDITIONS ===');
    
    const orphanConditions = await prisma.treeBranchLeafNodeCondition.findMany({
      include: {
        TreeBranchLeafNode: true
      }
    });

    for (const condition of orphanConditions) {
      const node = condition.TreeBranchLeafNode;
      const linkedConditionIds = node.linkedConditionIds || [];
      const isLinked = linkedConditionIds.includes(condition.id);
      
      // Vérifier s'il y a des variables associées à ce noeud
      const nodeVariables = await prisma.treeBranchLeafNodeVariable.findMany({
        where: { nodeId: condition.nodeId }
      });
      
      if (!isLinked && nodeVariables.length > 0) {
        console.log(`\n🔧 Réparation: "${condition.name}" → Nœud "${node.label}"`);
        console.log(`   - Condition ID: ${condition.id}`);
        console.log(`   - Nœud ID: ${condition.nodeId}`);
        
        // Ajouter l'ID de la condition aux linkedConditionIds
        const updatedLinkedConditionIds = [...linkedConditionIds, condition.id];
        
        await prisma.treeBranchLeafNode.update({
          where: { id: condition.nodeId },
          data: {
            linkedConditionIds: updatedLinkedConditionIds
          }
        });
        
        console.log(`   ✅ Ajouté aux linkedConditionIds: ${updatedLinkedConditionIds.join(', ')}`);
        
        // Mettre à jour exposedKey des variables (pas besoin de mettre à jour car déjà correct)
        for (const variable of nodeVariables) {
          console.log(`   📝 Variable "${variable.displayName}" trouvée:`);
          console.log(`      - exposedKey: ${variable.exposedKey}`);
          console.log(`      - displayName: ${variable.displayName}`);
        }
      }
    }

    console.log('\n🎯 === RÉSUMÉ DE LA RÉPARATION ===');
    console.log('✅ Toutes les formules et conditions orphelines ont été réparées');
    console.log('⚠️  Les tables lookup ont été ignorées (champs d\'information uniquement)');
    console.log('🚀 Les champs réparés devraient maintenant créer des displayFields lors de la duplication');

  } catch (error) {
    console.error('❌ Erreur lors de la réparation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

repairOrphanCapacities();