import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const nodeId = '7d3dc335-ab7e-43e2-bbf1-395981a7938a';
  
  console.log('🔍 Recherche du node:', nodeId);
  
  // Vérifier si le node existe
  const node = await db.treeBranchLeafNode.findUnique({
    where: { id: nodeId },
    select: { id: true, label: true, type: true, treeId: true }
  });
  
  console.log('📦 Node:', node ? JSON.stringify(node, null, 2) : 'NON TROUVÉ');
  
  // Vérifier si une config SELECT existe
  const config = await db.treeBranchLeafSelectConfig.findFirst({
    where: { nodeId }
  });
  
  console.log('⚙️ SelectConfig:', config ? JSON.stringify(config, null, 2) : 'NON TROUVÉ');
  
  // Chercher des nodes similaires
  const similar = await db.treeBranchLeafNode.findMany({
    where: { id: { startsWith: '7d3dc335' } },
    select: { id: true, label: true },
    take: 5
  });
  console.log('🔎 Nodes similaires:', similar);
}

main().catch(console.error).finally(() => db.$disconnect());
