const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function executeGoogleModules() {
  try {
    console.log('🚀 Début de l\'ajout des modules Google Workspace...');
    
    // 1. GMAIL MODULE
    await prisma.module.upsert({
      where: { key: 'gmail' },
      update: {
        label: 'Gmail',
        feature: 'GMAIL',
        icon: 'MdEmail',
        route: '/gmail',
        active: true,
        description: 'Gestion des emails intégrée avec Gmail'
      },
      create: {
        key: 'gmail',
        label: 'Gmail',
        feature: 'GMAIL',
        icon: 'MdEmail',
        route: '/gmail',
        active: true,
        description: 'Gestion des emails intégrée avec Gmail'
      }
    });
    console.log('✅ Module Gmail ajouté');

    // 2. GOOGLE CALENDAR MODULE
    await prisma.modules.upsert({
      where: { name: 'Google Calendar' },
      update: {
        feature: 'GOOGLE_CALENDAR',
        icon: 'AiOutlineCalendar',
        route: '/google-calendar',
        active: true,
        description: 'Planification et gestion des rendez-vous avec Google Calendar'
      },
      create: {
        name: 'Google Calendar',
        feature: 'GOOGLE_CALENDAR',
        icon: 'AiOutlineCalendar',
        route: '/google-calendar',
        active: true,
        description: 'Planification et gestion des rendez-vous avec Google Calendar'
      }
    });
    console.log('✅ Module Google Calendar ajouté');

    // 3. GOOGLE DRIVE MODULE
    await prisma.modules.upsert({
      where: { name: 'Google Drive' },
      update: {
        feature: 'GOOGLE_DRIVE',
        icon: 'AiOutlineCloudServer',
        route: '/google-drive',
        active: true,
        description: 'Stockage et partage de fichiers avec Google Drive'
      },
      create: {
        name: 'Google Drive',
        feature: 'GOOGLE_DRIVE',
        icon: 'AiOutlineCloudServer',
        route: '/google-drive',
        active: true,
        description: 'Stockage et partage de fichiers avec Google Drive'
      }
    });
    console.log('✅ Module Google Drive ajouté');

    // 4. GOOGLE MEET MODULE
    await prisma.modules.upsert({
      where: { name: 'Google Meet' },
      update: {
        feature: 'GOOGLE_MEET',
        icon: 'BiVideo',
        route: '/google-meet',
        active: true,
        description: 'Visioconférences et réunions avec Google Meet'
      },
      create: {
        name: 'Google Meet',
        feature: 'GOOGLE_MEET',
        icon: 'BiVideo',
        route: '/google-meet',
        active: true,
        description: 'Visioconférences et réunions avec Google Meet'
      }
    });
    console.log('✅ Module Google Meet ajouté');

    // 5. GOOGLE DOCS MODULE
    await prisma.modules.upsert({
      where: { name: 'Google Docs' },
      update: {
        feature: 'GOOGLE_DOCS',
        icon: 'AiOutlineFileText',
        route: '/google-docs',
        active: true,
        description: 'Documents collaboratifs avec Google Docs'
      },
      create: {
        name: 'Google Docs',
        feature: 'GOOGLE_DOCS',
        icon: 'AiOutlineFileText',
        route: '/google-docs',
        active: true,
        description: 'Documents collaboratifs avec Google Docs'
      }
    });
    console.log('✅ Module Google Docs ajouté');

    // 6. GOOGLE SHEETS MODULE
    await prisma.modules.upsert({
      where: { name: 'Google Sheets' },
      update: {
        feature: 'GOOGLE_SHEETS',
        icon: 'AiOutlineTable',
        route: '/google-sheets',
        active: true,
        description: 'Tableurs partagés avec Google Sheets'
      },
      create: {
        name: 'Google Sheets',
        feature: 'GOOGLE_SHEETS',
        icon: 'AiOutlineTable',
        route: '/google-sheets',
        active: true,
        description: 'Tableurs partagés avec Google Sheets'
      }
    });
    console.log('✅ Module Google Sheets ajouté');

    // 7. Activer les modules pour toutes les organisations existantes
    console.log('🔄 Activation des modules pour toutes les organisations...');
    const organizations = await prisma.organizations.findMany();
    const googleModules = await prisma.modules.findMany({
      where: {
        feature: {
          in: ['GMAIL', 'GOOGLE_CALENDAR', 'GOOGLE_DRIVE', 'GOOGLE_MEET', 'GOOGLE_DOCS', 'GOOGLE_SHEETS']
        }
      }
    });

    for (const org of organizations) {
      for (const module of googleModules) {
        await prisma.organizationModules.upsert({
          where: {
            organizationId_moduleId: {
              organizationId: org.id,
              moduleId: module.id
            }
          },
          update: {
            isActive: true
          },
          create: {
            organizationId: org.id,
            moduleId: module.id,
            isActive: true
          }
        });
      }
    }
    console.log(`✅ Modules activés pour ${organizations.length} organisation(s)`);

    // Vérification finale
    console.log('🔍 Vérification des modules Google Workspace...');
    const finalModules = await prisma.modules.findMany({
      where: {
        feature: {
          in: ['GMAIL', 'GOOGLE_CALENDAR', 'GOOGLE_DRIVE', 'GOOGLE_MEET', 'GOOGLE_DOCS', 'GOOGLE_SHEETS']
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log(`🎉 ${finalModules.length} modules Google Workspace configurés :`);
    finalModules.forEach(module => {
      console.log(`  📱 ${module.name} (${module.feature}) - ${module.active ? '✅ Actif' : '❌ Inactif'}`);
    });
    
    console.log('🏁 Configuration terminée avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

executeGoogleModules();
