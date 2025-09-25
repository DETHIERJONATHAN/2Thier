const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findFormuleConfig() {
  console.log('🔍 Recherche de la configuration qui contient cb42c9a9-c6b4-49bb-bd55-74d763123bfb...');
  
  // Chercher dans les nodes avec ce label
  const prixKwhNode = await prisma.treeBranchLeafNode.findFirst({
    where: { label: 'Prix Kw/h' },
    include: { 
      TreeBranchLeafNodeFormula: true,
      TreeBranchLeafNodeCondition: true,
      TreeBranchLeafNodeTable: true
    }
  });
  
  if (prixKwhNode) {
    console.log('✅ Node Prix Kw/h trouvé:', {
      id: prixKwhNode.id,
      label: prixKwhNode.label,
      tbl_code: prixKwhNode.tbl_code,
      tbl_type: prixKwhNode.tbl_type,
      tbl_capacity: prixKwhNode.tbl_capacity,
      metadata: JSON.stringify(prixKwhNode.metadata, null, 2)
    });
    
    console.log('\n📊 Formules liées:', prixKwhNode.TreeBranchLeafNodeFormula?.length || 0);
    if (prixKwhNode.TreeBranchLeafNodeFormula?.length > 0) {
      prixKwhNode.TreeBranchLeafNodeFormula.forEach((f, i) => {
        console.log(`Formule ${i+1}:`, {
          id: f.id,
          nodeId: f.nodeId,
          expression: f.expression,
          tokens: f.tokens
        });
      });
    }
    
    console.log('\n📊 Conditions liées:', prixKwhNode.TreeBranchLeafNodeCondition?.length || 0);
    if (prixKwhNode.TreeBranchLeafNodeCondition?.length > 0) {
      prixKwhNode.TreeBranchLeafNodeCondition.forEach((c, i) => {
        console.log(`Condition ${i+1}:`, {
          id: c.id,
          nodeId: c.nodeId,
          conditionSet: c.conditionSet
        });
      });
    }
  } else {
    console.log('❌ Node Prix Kw/h non trouvé');
  }
  
  await prisma.$disconnect();
}

findFormuleConfig().catch(console.error);