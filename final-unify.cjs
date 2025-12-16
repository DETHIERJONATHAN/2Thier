const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function finalUnify() {
  const totalIds = [
    '3da47bc3-739e-4c83-98c3-813ecf77a740-sum-total',
    '0cac5b10-ea6e-45a4-a24a-a5a4ab6a04e0-sum-total',
    'f40b31f0-9cba-4110-a2a6-37df8c986661-sum-total'
  ];

  console.log('\n🔧 Uniformisation finale des Totaux...\n');

  // Uniformiser TOUS les champs pour qu'ils soient identiques à M² toiture - Total
  for (const id of totalIds) {
    await prisma.treeBranchLeafNode.update({
      where: { id },
      data: { 
        data_visibleToUser: false,  // Comme M² toiture
        fieldType: null,
        fieldSubType: null,
        subType: null
      }
    });
    console.log('✅ Unifié:', id);
  }
  
  // Vérification
  const nodes = await prisma.treeBranchLeafNode.findMany({
    where: { id: { in: totalIds } },
    select: { label: true, data_visibleToUser: true, fieldType: true, calculatedValue: true }
  });
  
  console.log('\n📊 Résultat:');
  nodes.forEach(n => {
    console.log(`   ${n.label}: data_visibleToUser=${n.data_visibleToUser}, fieldType=${n.fieldType}, value=${n.calculatedValue}`);
  });
  
  await prisma.$disconnect();
}
finalUnify();
