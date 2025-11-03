const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findMFacade() {
  try {
    console.log('\n🔍 Recherche du nœud "M Façade"\n');
    
    const node = await prisma.treeBranchLeafNode.findFirst({
      where: {
        label: { contains: 'M f', mode: 'insensitive' }
      },
      select: {
        id: true,
        label: true,
        treeId: true,
        fieldType: true,
        fieldSubType: true,
        linkedVariableIds: true,
        metadata: true,
        data_activeId: true,
        data_instances: true
      }
    });
    
    if (node) {
      console.log('✅ NŒUD TROUVÉ:');
      console.log(JSON.stringify(node, null, 2));
    } else {
      console.log('❌ Nœud non trouvé');
      
      // Chercher tous les nœuds contenant "Façade"
      const nodes = await prisma.treeBranchLeafNode.findMany({
        where: {
          label: { contains: 'Façade' }
        },
        select: {
          id: true,
          label: true,
          fieldType: true
        },
        take: 10
      });
      
      console.log(`\n📊 Nœuds avec "Façade" (${nodes.length}):`);
      nodes.forEach(n => {
        console.log(`  • ${n.label} (${n.fieldType})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findMFacade();
