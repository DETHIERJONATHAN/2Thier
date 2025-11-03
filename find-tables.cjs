const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Recherche dans toutes les tables Prisma...\n');
    
    // Récupérer les métadonnées du schéma
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    console.log('📊 Tables disponibles:\n');
    tables.forEach((t, idx) => {
      console.log(`${idx + 1}. ${t.table_name}`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
