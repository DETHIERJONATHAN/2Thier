const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function demonstrationFormules() {
  try {
    console.log('🎯 DÉMONSTRATION - Récupération des formules TreeBranchLeaf');
    console.log('===============================================================');
    
    // 1. Trouver un nœud qui a des formules
    console.log('🔍 1. Recherche de nœuds avec formules...');
    
    const nodesWithFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
      include: {
        node: {
          select: { id: true, label: true, treeId: true }
        }
      },
      take: 3
    });
    
    if (nodesWithFormulas.length === 0) {
      console.log('❌ Aucune formule trouvée en base');
      console.log('💡 Conseil: Créer des formules via l\'interface TreeBranchLeaf d\'abord');
      return;
    }
    
    console.log(`✅ ${nodesWithFormulas.length} formules trouvées !`);
    
    // 2. Afficher les formules par nœud
    const nodeGroups = {};
    nodesWithFormulas.forEach(formula => {
      const nodeId = formula.nodeId;
      if (!nodeGroups[nodeId]) {
        nodeGroups[nodeId] = {
          node: formula.node,
          formulas: []
        };
      }
      nodeGroups[nodeId].formulas.push(formula);
    });
    
    console.log('\n📊 2. Formules par nœud:');
    console.log('=======================');
    
    for (const nodeId in nodeGroups) {
      const group = nodeGroups[nodeId];
      console.log(`\n🌳 Nœud: "${group.node.label}" (${nodeId})`);
      console.log(`   Arbre: ${group.node.treeId}`);
      console.log(`   Formules (${group.formulas.length}):`);
      
      group.formulas.forEach((formula, index) => {
        console.log(`   ${index + 1}. "${formula.name}"`);
        console.log(`      📝 Description: ${formula.description || 'Aucune'}`);
        console.log(`      🧮 Tokens: ${JSON.stringify(formula.tokens)}`);
        console.log(`      🔢 Ordre: ${formula.order}`);
        console.log(`      ⭐ Par défaut: ${formula.isDefault ? 'Oui' : 'Non'}`);
      });
    }
    
    // 3. Démonstration de récupération pour un nœud spécifique
    const firstNodeId = Object.keys(nodeGroups)[0];
    if (firstNodeId) {
      console.log(`\n🎯 3. Récupération pour nœud ${firstNodeId}:`);
      console.log('============================================');
      
      const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
        where: { nodeId: firstNodeId },
        orderBy: { order: 'asc' }
      });
      
      console.log('✅ Méthode Prisma directe:');
      formulas.forEach(f => {
        console.log(`   - ${f.name}: ${JSON.stringify(f.tokens)}`);
      });
      
      // 4. Statistiques
      console.log('\n📈 4. Statistiques globales:');
      console.log('============================');
      
      const totalFormulas = await prisma.treeBranchLeafNodeFormula.count();
      const totalNodes = await prisma.treeBranchLeafNode.count();
      const nodesWithFormulasCount = await prisma.treeBranchLeafNode.count({
        where: {
          TreeBranchLeafNodeFormula: {
            some: {}
          }
        }
      });
      
      console.log(`📊 Formules totales: ${totalFormulas}`);
      console.log(`🌳 Nœuds totaux: ${totalNodes}`);
      console.log(`🧮 Nœuds avec formules: ${nodesWithFormulasCount}`);
      console.log(`📈 Pourcentage nœuds avec formules: ${Math.round((nodesWithFormulasCount / totalNodes) * 100)}%`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

demonstrationFormules();
