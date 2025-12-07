import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Recherche du champ "Rampant toiture"');
  
  // Rechercher par label
  const rampantFields = await prisma.treeBranchLeafNode.findMany({
    where: {
      label: { contains: 'Rampant', mode: 'insensitive' }
    },
    select: {
      id: true,
      label: true,
      type: true,
      parentId: true
    }
  });
  
  console.log('Champs trouvés avec "Rampant":', rampantFields);
  
  // Rechercher par ID si c'est différent
  const specificId = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '25309ba4-dcba-4757-95c0-6f601f98ce49' },
    select: {
      id: true,
      label: true,
      type: true,
      parentId: true
    }
  });
  
  if (specificId) {
    console.log('Champ avec ID spécifique:', specificId);
  } else {
    console.log('❌ Aucun champ trouvé avec ID 25309ba4-dcba-4757-95c0-6f601f98ce49');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);