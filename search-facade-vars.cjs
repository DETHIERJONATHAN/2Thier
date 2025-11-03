const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Recherche de toutes les variables contenant "facade"...\n');
  
  const vars = await prisma.treeBranchLeafNodeVariable.findMany({
    where: {
      displayName: {
        contains: 'facade',
        mode: 'insensitive'
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  if (vars.length === 0) {
    console.log('❌ Aucune variable contenant "facade" trouvée');
  } else {
    console.log(`✅ Trouvé ${vars.length} variable(s):\n`);
    
    for (const v of vars) {
      console.log(`📌 ${v.displayName}`);
      console.log(`   ID: ${v.id}`);
      console.log(`   nodeId: ${v.nodeId}`);
      console.log(`   sourceRef: ${v.sourceRef}`);
      console.log(`   sourceType: ${v.sourceType}`);
      console.log(`   createdAt: ${v.createdAt}`);
      
      const node = await prisma.treeBranchLeafNode.findUnique({
        where: { id: v.nodeId },
        select: {
          label: true,
          parentId: true,
          linkedVariableIds: true
        }
      });
      
      if (node) {
        console.log(`   Nœud: ${node.label}`);
        console.log(`   parentId: ${node.parentId}`);
        console.log(`   Est dans linkedVariableIds: ${node.linkedVariableIds?.includes(v.id)}`);
      }
      console.log('');
    }
  }
  
  // Chercher aussi dans linkedVariableIds
  console.log('🔍 Recherche de nœuds avec "facade" dans linkedVariableIds...\n');
  
  const allNodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      linkedVariableIds: {
        isEmpty: false
      }
    },
    select: {
      id: true,
      label: true,
      linkedVariableIds: true
    }
  });
  
  const nodesWithFacade = allNodes.filter(n => 
    n.linkedVariableIds?.some(id => id.toLowerCase().includes('facade'))
  );
  
  if (nodesWithFacade.length > 0) {
    console.log(`⚠️ Trouvé ${nodesWithFacade.length} nœud(s) avec un ID contenant "facade" dans linkedVariableIds:`);
    nodesWithFacade.forEach(n => {
      console.log(`   - ${n.label} (${n.id})`);
      console.log(`     linkedVariableIds:`, n.linkedVariableIds);
      console.log('');
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
