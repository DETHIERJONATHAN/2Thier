/**
 * 🚀 ACTIVATION COMPLÈTE DES SERVICES GOOGLE WORKSPACE
 * Ce script active tous les services Google demandés dans le CRM
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function activateAllGoogleServices() {
  try {
    console.log('🚀 ACTIVATION COMPLÈTE DES SERVICES GOOGLE WORKSPACE\n');
    console.log('=' .repeat(60));
    
    const organizationId = '717a2b14-0d9c-48f6-b7ef-79dc0a0cc8de';
    
    // 1. MISE À JOUR CONFIGURATION GOOGLE WORKSPACE
    console.log('\n📋 1. MISE À JOUR CONFIGURATION GOOGLE WORKSPACE...');
    
    const config = await prisma.googleWorkspaceConfig.findFirst({
      where: { organizationId }
    });
    
    if (config) {
      await prisma.googleWorkspaceConfig.update({
        where: { id: config.id },
        data: {
          // Services principaux
          meetEnabled: true,      // 🎥 Google Meet
          docsEnabled: true,      // 📝 Google Docs  
          sheetsEnabled: true,    // 📊 Google Sheets
          voiceEnabled: true,     // 📞 Google Voice
          // Drive déjà activé
          driveEnabled: true,     // 📁 Google Drive (confirmé)
          // Gmail + Calendar déjà activés
          gmailEnabled: true,     // 📧 Gmail (confirmé)
          calendarEnabled: true,  // 📅 Calendar (confirmé)
          updatedAt: new Date()
        }
      });
      console.log('✅ Configuration Google Workspace mise à jour');
    }
    
    // 2. CRÉATION/MISE À JOUR DES MODULES
    console.log('\n📦 2. CRÉATION DES MODULES...');
    
    const modules = [
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        key: 'google_meet',
        label: 'Google Meet',
        feature: 'GOOGLE_MEET',
        icon: 'BiVideo',
        route: '/google-meet',
        description: 'Visioconférences et réunions intégrées au CRM',
        page: 'GoogleMeetPage',
        order: 13.0
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440005',
        key: 'google_docs',
        label: 'Google Docs',
        feature: 'GOOGLE_DOCS',
        icon: 'AiOutlineFileText',
        route: '/google-docs',
        description: 'Documents collaboratifs et templates automatiques',
        page: 'GoogleDocsPage',
        order: 14.0
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440006',
        key: 'google_sheets',
        label: 'Google Sheets',
        feature: 'GOOGLE_SHEETS',
        icon: 'AiOutlineTable',
        route: '/google-sheets',
        description: 'Rapports et dashboards dynamiques',
        page: 'GoogleSheetsPage',
        order: 15.0
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440007',
        key: 'google_voice',
        label: 'Google Voice',
        feature: 'GOOGLE_VOICE',
        icon: 'FaPhone',
        route: '/google-voice',
        description: 'Téléphonie et SMS intégrés',
        page: 'GoogleVoicePage',
        order: 16.0
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440008',
        key: 'google_chat',
        label: 'Google Chat',
        feature: 'GOOGLE_CHAT',
        icon: 'BiMessageSquareDetail',
        route: '/google-chat',
        description: 'Communication équipe en temps réel',
        page: 'GoogleChatPage',
        order: 17.0
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440009',
        key: 'google_maps',
        label: 'Google Maps',
        feature: 'GOOGLE_MAPS',
        icon: 'FaMapMarkerAlt',
        route: '/google-maps',
        description: 'Géolocalisation et optimisation tournées',
        page: 'GoogleMapsPage',
        order: 18.0
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440010',
        key: 'google_keep',
        label: 'Google Keep',
        feature: 'GOOGLE_KEEP',
        icon: 'AiOutlineFileAdd',
        route: '/google-keep',
        description: 'Notes rapides et mémos partagés',
        page: 'GoogleKeepPage',
        order: 19.0
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440011',
        key: 'google_analytics',
        label: 'Google Analytics',
        feature: 'GOOGLE_ANALYTICS',
        icon: 'AiOutlineBarChart',
        route: '/google-analytics',
        description: 'Tracking et analyse des leads web',
        page: 'GoogleAnalyticsPage',
        order: 20.0
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440012',
        key: 'google_gemini',
        label: 'Google Gemini AI',
        feature: 'GOOGLE_GEMINI',
        icon: 'AiOutlineRobot',
        route: '/google-gemini',
        description: 'Intelligence artificielle pour automatisation CRM',
        page: 'GoogleGeminiPage',
        order: 21.0
      }
    ];
    
    let addedModules = 0;
    let updatedModules = 0;
    
    for (const moduleData of modules) {
      try {
        const existingModule = await prisma.module.findUnique({
          where: { id: moduleData.id }
        });
        
        if (existingModule) {
          await prisma.module.update({
            where: { id: moduleData.id },
            data: {
              ...moduleData,
              active: true,
              updatedAt: new Date()
            }
          });
          updatedModules++;
          console.log(`🔄 Module ${moduleData.label} mis à jour`);
        } else {
          await prisma.module.create({
            data: {
              ...moduleData,
              active: true
            }
          });
          addedModules++;
          console.log(`✅ Module ${moduleData.label} créé`);
        }
      } catch (error) {
        console.log(`❌ Erreur module ${moduleData.label}:`, error.message);
      }
    }
    
    // 3. ACTIVATION DES MODULES POUR L'ORGANISATION
    console.log('\n🔧 3. ACTIVATION DES MODULES POUR L\'ORGANISATION...');
    
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
            settings: {
              maxUsers: 50,
              autoSync: true,
              permissions: ['read', 'write']
            },
            updatedAt: new Date()
          },
          create: {
            organizationId,
            moduleId: module.id,
            active: true,
            settings: {
              maxUsers: 50,
              autoSync: true,
              permissions: ['read', 'write']
            }
          }
        });
        activatedForOrg++;
        console.log(`✅ ${module.label} activé pour l'organisation`);
      } catch (error) {
        console.log(`❌ Erreur activation ${module.label}:`, error.message);
      }
    }
    
    // 4. RÉSUMÉ FINAL
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 ACTIVATION COMPLÈTE TERMINÉE !');
    console.log('=' .repeat(60));
    console.log(`✅ ${addedModules} nouveaux modules créés`);
    console.log(`🔄 ${updatedModules} modules mis à jour`);
    console.log(`🔧 ${activatedForOrg} modules activés pour l'organisation`);
    
    console.log('\n📱 SERVICES GOOGLE WORKSPACE MAINTENANT DISPONIBLES:');
    console.log('🎥 Google Meet - Visioconférences');
    console.log('📝 Google Docs - Documents automatiques');
    console.log('📊 Google Sheets - Rapports dynamiques');
    console.log('📞 Google Voice - Téléphonie intégrée');
    console.log('💬 Google Chat - Communication équipe');
    console.log('🗺️ Google Maps - Géolocalisation clients');
    console.log('📝 Google Keep - Notes rapides');
    console.log('📈 Google Analytics - Tracking leads');
    console.log('🤖 Google Gemini - Intelligence artificielle');
    
    console.log('\n🚀 PROCHAINES ÉTAPES:');
    console.log('1. Rafraîchir l\'interface CRM');
    console.log('2. Vérifier les nouveaux modules dans la navigation');
    console.log('3. Configurer les scopes OAuth pour les nouveaux services');
    console.log('4. Tester chaque intégration individuellement');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'activation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter l'activation
activateAllGoogleServices();
