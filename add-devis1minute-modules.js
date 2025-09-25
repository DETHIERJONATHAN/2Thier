import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addDevis1MinuteModules() {
  try {
    console.log('🚀 Ajout des modules Devis1Minute...');

    // Modules Devis1Minute à ajouter
    const modules = [
      {
        key: 'lead-generation',
        label: 'Lead Generation',
        feature: 'lead_generation',
        icon: 'campaign',
        route: '/lead-generation',
        description: 'Générateur de campagnes publicitaires Google/Meta/TikTok',
        page: 'LeadGenerationPage',
        order: 20,
        active: true
      },
      {
        key: 'marketplace',
        label: 'Marketplace Leads',
        feature: 'marketplace',
        icon: 'shopping',
        route: '/marketplace',
        description: 'Achat et vente de leads qualifiés',
        page: 'MarketplacePage',
        order: 21,
        active: true
      },
      {
        key: 'partner-portal',
        label: 'Espace Partenaire',
        feature: 'partner_portal',
        icon: 'handshake',
        route: '/partner',
        description: 'Interface dédiée aux partenaires pros',
        page: 'PartnerPortalPage',
        order: 22,
        active: true
      },
      {
        key: 'public-forms',
        label: 'Formulaires Publics',
        feature: 'public_forms',
        icon: 'form',
        route: '/forms',
        description: 'Gestion des formulaires de capture leads',
        page: 'PublicFormsPage',
        order: 23,
        active: true
      },
      {
        key: 'landing-pages',
        label: 'Landing Pages',
        feature: 'landing_pages',
        icon: 'layout',
        route: '/landing-pages',
        description: 'Création de pages de destination no-code',
        page: 'LandingPagesPage',
        order: 24,
        active: true
      },
      {
        key: 'campaign-analytics',
        label: 'Analytics Campagnes',
        feature: 'campaign_analytics',
        icon: 'bar-chart',
        route: '/analytics',
        description: 'Analytics et performances des campagnes',
        page: 'CampaignAnalyticsPage',
        order: 25,
        active: true
      }
    ];

    // Ajouter chaque module
    for (const moduleData of modules) {
      const existingModule = await prisma.module.findFirst({
        where: { key: moduleData.key }
      });

      if (!existingModule) {
        const newModule = await prisma.module.create({
          data: moduleData
        });
        console.log(`✅ Module "${newModule.label}" ajouté avec succès`);
      } else {
        console.log(`⚠️  Module "${moduleData.label}" existe déjà`);
      }
    }

    console.log('\n🎯 Récapitulatif des modules Devis1Minute :');
    const devis1minuteModules = await prisma.module.findMany({
      where: {
        key: {
          in: modules.map(m => m.key)
        }
      },
      orderBy: { order: 'asc' }
    });

    devis1minuteModules.forEach(module => {
      console.log(`   📦 ${module.label} (${module.key}) - Route: ${module.route}`);
    });

    console.log('\n🚀 MODULES DEVIS1MINUTE INSTALLÉS AVEC SUCCÈS !');
    console.log('\nPour activer ces modules pour une organisation :');
    console.log('1. Connectez-vous au CRM');
    console.log('2. Allez dans Paramètres > Modules');
    console.log('3. Activez les modules Devis1Minute souhaités');

  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout des modules :', error);
  } finally {
    await prisma.$disconnect();
  }
}

addDevis1MinuteModules();
