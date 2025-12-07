import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findAllDisplayNodes() {
  console.log('🔍 RECHERCHE DE TOUS LES NŒUDS D\'AFFICHAGE\n');
  console.log('='.repeat(80));

  // Chercher tous les nœuds qui ont fromVariableId dans metadata
  const allNodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      metadata: {
        not: { equals: null }
      }
    },
    select: {
      id: true,
      label: true,
      parentId: true,
      metadata: true
    }
  });

  const displayNodes = allNodes.filter(n => 
    n.metadata && 
    typeof n.metadata === 'object' && 
    'fromVariableId' in n.metadata
  );

  console.log(`\nTotal de nœuds dans la base: ${allNodes.length}`);
  console.log(`Nœuds d'affichage (avec fromVariableId): ${displayNodes.length}\n`);

  if (displayNodes.length === 0) {
    console.log('❌ AUCUN nœud d\'affichage trouvé\n');
    console.log('💡 Les nœuds d\'affichage n\'ont peut-être pas été créés.\n');
    
    // Chercher les variables
    const variables = await prisma.treeBranchLeafNodeVariable.findMany({
      where: {
        id: {
          in: [
            'dfe42b56-ce2e-4c2d-a4a2-cba90087ed72',
            'ac81b3a7-5e5a-4c13-90f5-51503aadc748',
            '42de8d47-1300-49e0-bb00-f2dc3e4052d6'
          ]
        }
      },
      select: {
        id: true,
        displayName: true,
        nodeId: true
      }
    });
    
    console.log(`Variables sources trouvées: ${variables.length}\n`);
    for (const v of variables) {
      console.log(`  • ${v.displayName || v.id}`);
      console.log(`    nodeId: ${v.nodeId || 'NULL'}\n`);
    }
    
    return;
  }

  console.log('='.repeat(80));
  
  for (const node of displayNodes) {
    const isCopy = node.id.includes('-1');
    console.log(`\n${isCopy ? '🟢 COPIE' : '🔵 SOURCE'}: ${node.label}`);
    console.log(`  ID: ${node.id}`);
    console.log(`  ParentId: ${node.parentId}`);
    console.log(`  fromVariableId: ${node.metadata.fromVariableId}`);
    
    if (node.parentId) {
      const parent = await prisma.treeBranchLeafNode.findUnique({
        where: { id: node.parentId },
        select: { id: true, label: true, type: true }
      });
      
      if (parent) {
        console.log(`  Parent: ${parent.label} (${parent.type})`);
      } else {
        console.log(`  Parent: ❌ INTROUVABLE`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
}

findAllDisplayNodes()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
