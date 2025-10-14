import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌟 === SEED SITE VITRINE 2THIER - VERSION SIMPLE === 🌟\n');

  // 🧹 NETTOYAGE
  console.log('🧹 Nettoyage...');
  const existingSite = await prisma.webSite.findFirst({ 
    where: { 
      organizationId: '1757366075154-i554z93kl',
      siteName: '2Thier Energy'
    } 
  });
  if (existingSite) {
    await prisma.webSiteTestimonial.deleteMany({ where: { websiteId: existingSite.id } });
    await prisma.webSiteProject.deleteMany({ where: { websiteId: existingSite.id } });
    await prisma.webSiteService.deleteMany({ where: { websiteId: existingSite.id } });
    await prisma.webSiteSection.deleteMany({ where: { websiteId: existingSite.id } });
    await prisma.webSiteConfig.deleteMany({ where: { websiteId: existingSite.id } });
    await prisma.webSite.delete({ where: { id: existingSite.id } });
  }
  console.log('✅ Nettoyage terminé\n');

  // 1️⃣ CRÉATION DU SITE
  console.log('1️⃣ Création du site "2Thier Energy"...');
  const website = await prisma.webSite.create({
    data: {
      organizationId: '1757366075154-i554z93kl',
      siteName: '2Thier Energy',
      siteType: 'vitrine',
      slug: 'site-vitrine-2thier',
      domain: '2thier.be',
      isActive: true,
      isPublished: true
    },
  });
  console.log(`✅ Site créé - ID: ${website.id}\n`);

  console.log('✨✨✨ SEED TERMINÉ ! ✨✨✨');
  console.log(`\n🌐 Le site est maintenant accessible dans l'admin:`);
  console.log(`   Gestion des Sites Web → Éditer "2Thier Energy"`);
  console.log(`   Utilisez l'éditeur NO-CODE pour remplir le contenu !\n`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
