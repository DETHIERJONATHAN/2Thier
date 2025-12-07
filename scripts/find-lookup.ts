import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findLookupConfig() {
  console.log('🔍 Recherche: où est stockée la config lookup?\n');

  try {
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: { label: 'Orientation' },
      take: 1
    });

    if (nodes.length === 0) {
      console.log('❌ Aucun nœud Orientation trouvé');
      return;
    }

    const node = nodes[0];
    console.log(`📍 Nœud: ${node.label} (${node.id})\n`);

    console.log('📋 Contenu complet:');
    console.log(JSON.stringify(node, null, 2));

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findLookupConfig();
