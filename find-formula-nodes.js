import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findFormulaNodes() {
  try {
    // Chercher tous les enregistrements dans TreeBranchLeafNodeFormula
    const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
      select: {
        id: true,
        nodeId: true,
        name: true,
        tokens: true,
        isDefault: true,
        order: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('🔍 Total formules dans la table:', formulas.length);
    
    if (formulas.length === 0) {
      console.log('❌ Aucune formule trouvée dans la table TreeBranchLeafNodeFormula');
      return;
    }
    
    // Grouper par nodeId
    const byNode = formulas.reduce((acc, f) => {
      if (!acc[f.nodeId]) acc[f.nodeId] = [];
      acc[f.nodeId].push(f);
      return acc;
    }, {});
    
    console.log('\\n📊 Formules par nœud:');
    
    for (const [nodeId, nodeFormulas] of Object.entries(byNode)) {
      console.log(`\\n🎯 Nœud ID: ${nodeId}`);
      
      // Récupérer le label du nœud
      try {
        const node = await prisma.treeBranchLeafNode.findUnique({
          where: { id: nodeId },
          select: { label: true }
        });
        console.log(`   Label: ${node?.label || 'Non trouvé'}`);
      } catch {
        console.log('   Label: Erreur de lecture');
      }
      
      console.log(`   ${nodeFormulas.length} formule(s):`);
      nodeFormulas.forEach((f, i) => {
        console.log(`     ${i+1}. ${f.name}`);
        console.log(`        Tokens: ${f.tokens}`);
        console.log(`        Par défaut: ${f.isDefault}`);
        console.log(`        Ordre: ${f.order}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findFormulaNodes();
