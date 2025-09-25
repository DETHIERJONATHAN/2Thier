const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function trouverFormulesParNomNode() {
  try {
    console.log('🔍 Recherche de la formule "Prix Kw/h" dans tous les nœuds...');
    
    // Trouver la formule
    const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
      where: {
        name: {
          contains: 'Prix Kw/h'
        }
      }
    });
    
    console.log(`✅ ${formulas.length} formule(s) trouvée(s) avec "Prix Kw/h"`);
    
    for (const formula of formulas) {
      console.log(`\n📋 Formule: "${formula.name}"`);
      console.log(`   🆔 ID: ${formula.id}`);
      console.log(`   🎯 Node ID: ${formula.nodeId}`);
      console.log(`   🧮 Tokens: ${JSON.stringify(formula.tokens)}`);
      
      // Trouver le nœud associé
      const node = await prisma.treeBranchLeafNode.findUnique({
        where: { id: formula.nodeId },
        select: { id: true, label: true, type: true, subType: true }
      });
      
      if (node) {
        console.log(`   🌳 Nœud: "${node.label}" (${node.type})`);
        console.log(`   📝 Sous-type: ${node.subType || 'aucun'}`);
      } else {
        console.log(`   ❌ Nœud non trouvé !`);
      }
    }
    
    // Chercher aussi les nœuds qui contiennent "Calcul" ou "Prix"
    console.log('\n🔍 Recherche des nœuds contenant "Calcul" ou "Prix"...');
    
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        OR: [
          { label: { contains: 'Calcul' } },
          { label: { contains: 'Prix' } }
        ]
      },
      select: { id: true, label: true, type: true, subType: true }
    });
    
    console.log(`✅ ${nodes.length} nœud(s) trouvé(s)`);
    
    for (const node of nodes) {
      console.log(`\n🌳 Nœud: "${node.label}"`);
      console.log(`   🆔 ID: ${node.id}`);
      console.log(`   📝 Type: ${node.type} / ${node.subType || 'aucun'}`);
      
      // Chercher s'il a des formules
      const nodeFormulas = await prisma.treeBranchLeafNodeFormula.count({
        where: { nodeId: node.id }
      });
      
      console.log(`   🧮 Formules: ${nodeFormulas}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

trouverFormulesParNomNode();
