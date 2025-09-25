const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findBlockFormulaire() {
  try {
    const blocks = await prisma.block.findMany({
      where: {
        name: {
          contains: 'bloc',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        name: true,
        organizationId: true
      }
    });
    
    console.log('📋 Formulaires trouvés avec "bloc" dans le nom:');
    blocks.forEach(block => {
      console.log(`- ID: ${block.id}, Nom: ${block.name}, Org: ${block.organizationId}`);
    });
    
    if (blocks.length === 0) {
      console.log('⚠️ Aucun formulaire "Bloc" trouvé');
      
      // Afficher tous les formulaires pour référence
      const allBlocks = await prisma.block.findMany({
        select: {
          id: true,
          name: true,
          organizationId: true
        },
        take: 10
      });
      
      console.log('\n📋 Premiers 10 formulaires disponibles:');
      allBlocks.forEach(block => {
        console.log(`- ID: ${block.id}, Nom: ${block.name}, Org: ${block.organizationId}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findBlockFormulaire();
