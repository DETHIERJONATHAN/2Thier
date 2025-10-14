const { PrismaClient } = require('@prisma/client');

async function compare() {
  const prismaLocal = new PrismaClient({
    datasources: {
      db: { url: 'postgresql://postgres:postgres@localhost:5432/2thier' }
    }
  });
  
  const prismaProd = new PrismaClient();

  try {
    console.log('\n🔍 COMPARAISON BASE LOCAL vs PRODUCTION\n');
    
    const [localSites, prodSites] = await Promise.all([
      prismaLocal.webSite.findMany({
        where: { slug: { in: ['site-vitrine-2thier', 'devis1min'] } },
        include: { sections: { orderBy: { displayOrder: 'asc' } } }
      }),
      prismaProd.webSite.findMany({
        where: { slug: { in: ['site-vitrine-2thier', 'devis1min'] } },
        include: { sections: { orderBy: { displayOrder: 'asc' } } }
      })
    ]);

    console.log('📦 BASE LOCALE:');
    localSites.forEach(s => {
      console.log(`   ${s.siteName}: ${s.sections.length} sections`);
      s.sections.slice(0, 7).forEach(sec => 
        console.log(`      ${sec.displayOrder}. ${sec.name} (${sec.type})`)
      );
    });

    console.log('\n📡 BASE PRODUCTION:');
    prodSites.forEach(s => {
      console.log(`   ${s.siteName}: ${s.sections.length} sections`);
      s.sections.slice(0, 7).forEach(sec => 
        console.log(`      ${sec.displayOrder}. ${sec.name} (${sec.type})`)
      );
    });

    console.log('\n📊 RÉSULTAT:');
    localSites.forEach(local => {
      const prod = prodSites.find(p => p.slug === local.slug);
      const match = local.sections.length === (prod?.sections?.length || 0);
      console.log(`   ${local.siteName}: ${match ? '✅ IDENTIQUE' : '❌ DIFFÉRENT'}`);
      console.log(`      Local: ${local.sections.length} | Prod: ${prod?.sections?.length || 0}`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prismaLocal.$disconnect();
    await prismaProd.$disconnect();
  }
}

compare();
