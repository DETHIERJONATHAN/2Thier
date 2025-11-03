const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  
  // Cherche le repeater parent
  const repeaterParent = await prisma.treeBranchLeafNode.findFirst({
    where: {
      label: 'Versant',
      fieldType: 'repeater'
    },
    select: {
      id: true,
      label: true,
      repeater_templateNodeIds: true
    }
  });
  
  console.log('🔁 REPEATER PARENT:');
  console.log(JSON.stringify(repeaterParent, null, 2));
  
  if (repeaterParent?.repeater_templateNodeIds) {
    console.log('\n📦 TEMPLATES DU REPEATER:\n');
    
    for (const tid of repeaterParent.repeater_templateNodeIds) {
      const node = await prisma.treeBranchLeafNode.findUnique({
        where: { id: tid },
        select: { 
          id: true, 
          label: true,
          linkedVariableIds: true
        }
      });
      
      if (node) {
        console.log(`  • ${node.label}`);
        console.log(`    ID: ${tid}`);
        console.log(`    linkedVariableIds: ${JSON.stringify(node.linkedVariableIds)}`);
        console.log('');
      }
    }
  }
  
  await prisma.$disconnect();
})();
