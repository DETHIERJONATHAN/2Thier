import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function activateAdministration() {
  await prisma.category.updateMany({
    where: { name: 'Administration' },
    data: { active: true }
  });
  console.log('✅ Catégorie Administration activée');
  await prisma.$disconnect();
}

activateAdministration().catch(console.error);
