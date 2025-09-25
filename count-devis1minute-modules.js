import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function countDevis1MinuteModules() {
  try {
    const modules = await prisma.module.findMany({
      where: {
        OR: [
          { key: { contains: 'devis' } },
          { key: { contains: 'lead' } },
          { key: { contains: 'marketplace' } },
          { key: { contains: 'partner' } },
          { key: { contains: 'campaign' } },
          { key: { contains: 'landing' } },
          { key: { contains: 'forms' } },
          { feature: { contains: 'lead' } },
          { feature: { contains: 'marketplace' } },
          { feature: { contains: 'partner' } },
          { feature: { contains: 'campaign' } },
          { feature: { contains: 'landing' } },
          { feature: { contains: 'forms' } }
        ]
      },
      orderBy: { order: 'asc' }
    });

    console.log('🔍 MODULES DEVIS1MINUTE TROUVÉS:');
    console.log('================================');
    modules.forEach((mod, index) => {
      console.log(`${index + 1}. ${mod.label} (${mod.key}) - Feature: ${mod.feature}`);
    });
    console.log('================================');
    console.log(`📊 TOTAL: ${modules.length} modules`);

    // Analyse plus spécifique
    console.log('\n🎯 MODULES PAR CATÉGORIE:');
    const categories = {};
    modules.forEach(mod => {
      const category = mod.feature || 'other';
      if (!categories[category]) categories[category] = [];
      categories[category].push(mod.label);
    });

    Object.keys(categories).forEach(cat => {
      console.log(`\n📂 ${cat.toUpperCase()}:`);
      categories[cat].forEach(label => console.log(`   - ${label}`));
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

countDevis1MinuteModules();
