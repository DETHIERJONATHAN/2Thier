import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

async function syncToProduction() {
  console.log('\n🔄 SYNCHRONISATION COMPLÈTE LOCAL → PRODUCTION\n');
  console.log('='.repeat(80));
  
  // Base LOCALE
  const prismaLocal = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://postgres:postgres@localhost:5432/2thier'
      }
    }
  });
  
  // Base PRODUCTION (utilise DATABASE_URL de .env ou variables d'environnement)
  const prismaProd = new PrismaClient();
  
  try {
    console.log('\n📊 ÉTAPE 1 : Lecture des données locales...\n');
    
    // Récupérer les sites vitrines en local
    const localSites = await prismaLocal.webSite.findMany({
      where: {
        slug: {
          in: ['site-vitrine-2thier', 'devis1min']
        }
      },
      include: {
        sections: {
          orderBy: { displayOrder: 'asc' }
        },
        config: true
      }
    });
    
    console.log(`   ✅ Trouvé ${localSites.length} sites en local`);
    localSites.forEach(s => {
      console.log(`      - ${s.siteName}: ${s.sections.length} sections`);
    });
    
    if (localSites.length === 0) {
      console.log('\n❌ ERREUR: Aucun site vitrine trouvé en local !');
      console.log('   Les slugs recherchés: site-vitrine-2thier, devis1min');
      process.exit(1);
    }
    
    console.log('\n📤 ÉTAPE 2 : Synchronisation vers production...\n');
    
    for (const localSite of localSites) {
      console.log(`\n   🔄 Site: ${localSite.siteName} (${localSite.slug})`);
      
      // Vérifier si le site existe en prod
      const prodSite = await prismaProd.webSite.findUnique({
        where: {
          organizationId_slug: {
            organizationId: localSite.organizationId,
            slug: localSite.slug
          }
        }
      });
      
      let siteId;
      
      if (prodSite) {
        console.log(`      Site existe, mise à jour...`);
        await prismaProd.webSite.update({
          where: { id: prodSite.id },
          data: {
            siteName: localSite.siteName,
            siteType: localSite.siteType,
            domain: localSite.domain,
            isActive: localSite.isActive,
            isPublished: localSite.isPublished,
            maintenanceMode: localSite.maintenanceMode
          }
        });
        siteId = prodSite.id;
      } else {
        console.log(`      Création du site...`);
        const newSite = await prismaProd.webSite.create({
          data: {
            organizationId: localSite.organizationId,
            slug: localSite.slug,
            siteName: localSite.siteName,
            siteType: localSite.siteType,
            domain: localSite.domain,
            isActive: localSite.isActive,
            isPublished: localSite.isPublished,
            maintenanceMode: localSite.maintenanceMode || false
          }
        });
        siteId = newSite.id;
      }
      
      // Supprimer les anciennes sections
      console.log(`      Nettoyage des anciennes sections...`);
      await prismaProd.webSiteSection.deleteMany({
        where: { websiteId: siteId }
      });
      
      // Créer les nouvelles sections
      console.log(`      Création de ${localSite.sections.length} sections...`);
      for (const section of localSite.sections) {
        await prismaProd.webSiteSection.create({
          data: {
            websiteId: siteId,
            key: section.key,
            type: section.type,
            name: section.name,
            content: section.content,
            backgroundColor: section.backgroundColor,
            textColor: section.textColor,
            customCss: section.customCss,
            displayOrder: section.displayOrder,
            isActive: section.isActive,
            isLocked: section.isLocked || false
          }
        });
      }
      
      console.log(`      ✅ ${localSite.siteName} synchronisé !`);
    }
    
    console.log('\n\n' + '='.repeat(80));
    console.log('✅ SYNCHRONISATION TERMINÉE !\n');
    
    // Vérification finale
    console.log('📊 VÉRIFICATION FINALE:\n');
    for (const localSite of localSites) {
      const prodSite = await prismaProd.webSite.findFirst({
        where: { slug: localSite.slug },
        include: { sections: true }
      });
      
      if (prodSite) {
        console.log(`   ✅ ${prodSite.siteName}: ${prodSite.sections.length} sections en production`);
      }
    }
    
    console.log('\n🎉 Les sites vitrines sont maintenant en production !');
    console.log('   → 2thier.be devrait maintenant afficher le site vitrine');
    console.log('   → devis1min.be devrait maintenant afficher le site vitrine\n');
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error);
    process.exit(1);
  } finally {
    await prismaLocal.$disconnect();
    await prismaProd.$disconnect();
  }
}

syncToProduction();
