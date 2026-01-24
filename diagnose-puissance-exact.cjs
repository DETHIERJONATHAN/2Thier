const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function diagnosePuissance() {
  try {
    // 1. Chercher TOUS les nodes Puissance
    const allPuissanceNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        label: {
          startsWith: 'Puissance'
        }
      }
    });

    console.log('\n=== TOUS LES NODES "PUISSANCE" ===');
    console.log(`Nombre trouvé: ${allPuissanceNodes.length}`);
    
    for (const node of allPuissanceNodes) {
      console.log(`\nLabel: "${node.label}" | ID: ${node.id} | hasTable: ${node.hasTable}`);
      console.log(`  table_activeId: ${node.table_activeId}`);
      console.log(`  Metadata.lookup:`, node.metadata?.lookup || 'NOT SET');
    }

  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

diagnosePuissance();
