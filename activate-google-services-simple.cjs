/**
 * 🚀 ACTIVATION SIMPLE DES SERVICES GOOGLE WORKSPACE
 * Script corrigé sans le champ settings
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function activateGoogleServicesSimple() {
  try {
    console.log('🚀 ACTIVATION SIMPLE DES SERVICES GOOGLE WORKSPACE\n');
    console.log('=' .repeat(60));
    
    const organizationId = '717a2b14-0d9c-48f6-b7ef-79dc0a0cc8de';
    
    // 1. ACTIVATION DES MODULES POUR L'ORGANISATION (version simple)
    console.log('\n🔧 ACTIVATION DES MODULES POUR L\'ORGANISATION...');
    
    const allModules = await prisma.module.findMany({
      where: {
        feature: {
          in: [
            'GOOGLE_MEET', 'GOOGLE_DOCS', 'GOOGLE_SHEETS', 'GOOGLE_VOICE',
            'GOOGLE_CHAT', 'GOOGLE_MAPS', 'GOOGLE_KEEP', 'GOOGLE_ANALYTICS',
            'GOOGLE_GEMINI'
          ]
        }
      }
    });
    
    console.log(`📦 Trouvé ${allModules.length} modules Google à activer`);
    
    let activatedForOrg = 0;
    
    for (const module of allModules) {
      try {
        await prisma.organizationModuleStatus.upsert({
          where: {
            organizationId_moduleId: {
              organizationId,
              moduleId: module.id
            }
          },
          update: {
            active: true,
            updatedAt: new Date()
          },
          create: {
            organizationId,
            moduleId: module.id,
            active: true
          }
        });
        activatedForOrg++;
        console.log(`✅ ${module.label} activé pour l'organisation`);
      } catch (error) {
        console.log(`❌ Erreur activation ${module.label}:`, error.message);
      }
    }
    
    // 2. VÉRIFICATION FINALE
    console.log('\n🔍 VÉRIFICATION DES MODULES ACTIVÉS...');
    
    const activeModules = await prisma.organizationModuleStatus.findMany({
      where: {
        organizationId,
        active: true
      },
      include: {
        Module: true
      }
    });
    
    const googleModules = activeModules.filter(m => 
      m.Module.feature.startsWith('GOOGLE_')
    );
    
    // 3. RÉSUMÉ FINAL
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 ACTIVATION TERMINÉE !');
    console.log('=' .repeat(60));
    console.log(`🔧 ${activatedForOrg} modules activés pour l'organisation`);
    console.log(`📱 ${googleModules.length} services Google actifs au total`);
    
    console.log('\n📱 SERVICES GOOGLE WORKSPACE ACTIFS:');
    googleModules.forEach(m => {
      const emoji = {
        'GMAIL': '📧',
        'GOOGLE_CALENDAR': '📅', 
        'GOOGLE_DRIVE': '📁',
        'GOOGLE_MEET': '🎥',
        'GOOGLE_DOCS': '📝',
        'GOOGLE_SHEETS': '📊',
        'GOOGLE_VOICE': '📞',
        'GOOGLE_CHAT': '💬',
        'GOOGLE_MAPS': '🗺️',
        'GOOGLE_KEEP': '📝',
        'GOOGLE_ANALYTICS': '📈',
        'GOOGLE_GEMINI': '🤖'
      }[m.Module.feature] || '🔧';
      
      console.log(`${emoji} ${m.Module.label} - ${m.Module.description}`);
    });
    
    console.log('\n🚀 PROCHAINES ÉTAPES:');
    console.log('1. Rafraîchir l\'interface CRM pour voir les nouveaux modules');
    console.log('2. Configurer les scopes OAuth dans Google Cloud Console');
    console.log('3. Tester l\'accès à chaque nouveau service');
    console.log('4. Développer les composants frontend pour chaque service');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'activation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter l'activation
activateGoogleServicesSimple();
