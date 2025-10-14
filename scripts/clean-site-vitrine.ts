/**
 * 🧹 SCRIPT DE NETTOYAGE DU SITE VITRINE
 * 
 * Supprime uniquement les données du site vitrine 2Thier dans Prisma
 * Sans toucher aux autres données (users, leads, etc.)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanSiteVitrine() {
  console.log('🧹 Nettoyage du site vitrine en cours...');

  try {
    // Trouver le site vitrine par slug
    const website = await prisma.webSite.findFirst({
      where: { slug: 'site-vitrine-2thier' }
    });

    if (!website) {
      console.log('ℹ️  Aucun site vitrine trouvé avec le slug "site-vitrine-2thier"');
      return;
    }

    console.log(`📍 Site trouvé : ${website.siteName} (ID: ${website.id})`);

    // Supprimer toutes les données liées (Prisma gère les cascades)
    await prisma.webSite.delete({
      where: { id: website.id }
    });

    console.log('✅ Site vitrine supprimé avec succès !');
    console.log('   → Config, Services, Projects, Testimonials, Sections supprimés également');

  } catch (error) {
    console.error('❌ Erreur lors du nettoyage :', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanSiteVitrine()
  .then(() => {
    console.log('🎉 Nettoyage terminé !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Échec du nettoyage :', error);
    process.exit(1);
  });
