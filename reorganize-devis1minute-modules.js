import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function reorganizeDevis1minuteModules() {
  try {
    console.log('🔄 RÉORGANISATION DES MODULES DEVIS1MINUTE');
    console.log('='.repeat(50));
    
    // 1. Récupérer tous les modules Devis1Minute
    const devisModules = await prisma.module.findMany({
      where: {
        key: {
          startsWith: 'devis1minute'
        }
      }
    });
    
    console.log(`📋 ${devisModules.length} modules Devis1Minute trouvés\n`);
    
    // 2. Définir les catégories et l'ordre pour chaque module
    const moduleConfig = {
      // 🏢 MODULES ADMIN (pour 2Thier CRM)
      'devis1minute_admin_campaigns': { 
        label: 'Génération de leads', 
        order: 1,
        category: 'admin',
        description: 'Créer et gérer les campagnes de génération de leads'
      },
      'devis1minute_admin_analytics': { 
        label: 'Analytics campagnes', 
        order: 2,
        category: 'admin',
        description: 'Analyser les performances avec IA'
      },
      'devis1minute_admin_landing': { 
        label: 'Landing Pages', 
        order: 3,
        category: 'admin',
        description: 'Créer les pages de destination pour les campagnes'
      },
      'devis1minute_admin_forms': { 
        label: 'Formulaires publics', 
        order: 4,
        category: 'admin',
        description: 'Gérer les formulaires de capture de leads'
      },
      
      // 👥 MODULES PARTENAIRES
      'devis1minute_partner': { 
        label: 'Portail partenaire', 
        order: 11,
        category: 'partenaire',
        description: 'Tableau de bord partenaire'
      },
      'devis1minute_marketplace': { 
        label: 'Marketplace', 
        order: 12,
        category: 'partenaire',
        description: 'Acheter des leads qualifiés'
      },
      'devis1minute_leads': { 
        label: 'Mes leads', 
        order: 13,
        category: 'partenaire',
        description: 'Gérer les leads achetés'
      },
      'devis1minute_billing': { 
        label: 'Facturation', 
        order: 14,
        category: 'partenaire',
        description: 'Crédits et facturation'
      }
    };
    
    // 3. Mettre à jour chaque module
    let updatedCount = 0;
    
    for (const module of devisModules) {
      const config = moduleConfig[module.key];
      
      if (config) {
        console.log(`🔧 Mise à jour: ${module.label} -> ${config.label}`);
        console.log(`   Catégorie: ${config.category}`);
        console.log(`   Ordre: ${config.order}`);
        
        await prisma.module.update({
          where: { id: module.id },
          data: {
            label: config.label,
            description: config.description,
            order: config.order
          }
        });
        
        updatedCount++;
        console.log('   ✅ Mis à jour\n');
      } else {
        console.log(`⚠️  Configuration manquante pour: ${module.key}\n`);
      }
    }
    
    console.log('='.repeat(50));
    console.log(`✅ RÉORGANISATION TERMINÉE`);
    console.log(`📊 ${updatedCount}/${devisModules.length} modules mis à jour`);
    
    // 4. Afficher le résultat final
    console.log('\n📋 STRUCTURE FINALE:');
    
    const finalModules = await prisma.module.findMany({
      where: {
        key: {
          startsWith: 'devis1minute'
        }
      },
      orderBy: {
        order: 'asc'
      }
    });
    
    console.log('\n🏢 MODULES ADMIN (2Thier CRM):');
    finalModules
      .filter(m => moduleConfig[m.key]?.category === 'admin')
      .forEach(m => {
        console.log(`  ${m.order}. ${m.label} (${m.route})`);
      });
    
    console.log('\n👥 MODULES PARTENAIRES:');
    finalModules
      .filter(m => moduleConfig[m.key]?.category === 'partenaire')
      .forEach(m => {
        console.log(`  ${m.order}. ${m.label} (${m.route})`);
      });
      
    console.log('\n🎉 Les modules apparaîtront maintenant dans le bon ordre dans le sidebar !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la réorganisation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reorganizeDevis1minuteModules();
