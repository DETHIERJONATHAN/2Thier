const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function executeGoogleModules() {
  try {
    console.log('🚀 Début de l\'ajout des modules Google Workspace...');
    
    // 1. GMAIL MODULE
    const gmailModule = await prisma.module.upsert({
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
    const calendarModule = await prisma.module.upsert({
      where: { key: 'google-calendar' },
      update: {
        label: 'Google Calendar',
        feature: 'GOOGLE_CALENDAR',
        icon: 'AiOutlineCalendar',
        route: '/google-calendar',
        active: true,
        description: 'Planification et gestion des rendez-vous avec Google Calendar'
      },
      create: {
        key: 'google-calendar',
        label: 'Google Calendar',
        feature: 'GOOGLE_CALENDAR',
        icon: 'AiOutlineCalendar',
        route: '/google-calendar',
        active: true,
        description: 'Planification et gestion des rendez-vous avec Google Calendar'
      }
    });
    console.log('✅ Module Google Calendar ajouté');

    // 3. GOOGLE DRIVE MODULE
    const driveModule = await prisma.module.upsert({
      where: { key: 'google-drive' },
      update: {
        label: 'Google Drive',
        feature: 'GOOGLE_DRIVE',
        icon: 'AiOutlineCloudServer',
        route: '/google-drive',
        active: true,
        description: 'Stockage et partage de fichiers avec Google Drive'
      },
      create: {
        key: 'google-drive',
        label: 'Google Drive',
        feature: 'GOOGLE_DRIVE',
        icon: 'AiOutlineCloudServer',
        route: '/google-drive',
        active: true,
        description: 'Stockage et partage de fichiers avec Google Drive'
      }
    });
    console.log('✅ Module Google Drive ajouté');

    // 4. GOOGLE MEET MODULE
    const meetModule = await prisma.module.upsert({
      where: { key: 'google-meet' },
      update: {
        label: 'Google Meet',
        feature: 'GOOGLE_MEET',
        icon: 'BiVideo',
        route: '/google-meet',
        active: true,
        description: 'Visioconférences et réunions avec Google Meet'
      },
      create: {
        key: 'google-meet',
        label: 'Google Meet',
        feature: 'GOOGLE_MEET',
        icon: 'BiVideo',
        route: '/google-meet',
        active: true,
        description: 'Visioconférences et réunions avec Google Meet'
      }
    });
    console.log('✅ Module Google Meet ajouté');

    // 5. GOOGLE DOCS MODULE
    const docsModule = await prisma.module.upsert({
      where: { key: 'google-docs' },
      update: {
        label: 'Google Docs',
        feature: 'GOOGLE_DOCS',
        icon: 'AiOutlineFileText',
        route: '/google-docs',
        active: true,
        description: 'Documents collaboratifs avec Google Docs'
      },
      create: {
        key: 'google-docs',
        label: 'Google Docs',
        feature: 'GOOGLE_DOCS',
        icon: 'AiOutlineFileText',
        route: '/google-docs',
        active: true,
        description: 'Documents collaboratifs avec Google Docs'
      }
    });
    console.log('✅ Module Google Docs ajouté');

    // 6. GOOGLE SHEETS MODULE
    const sheetsModule = await prisma.module.upsert({
      where: { key: 'google-sheets' },
      update: {
        label: 'Google Sheets',
        feature: 'GOOGLE_SHEETS',
        icon: 'AiOutlineTable',
        route: '/google-sheets',
        active: true,
        description: 'Tableurs partagés avec Google Sheets'
      },
      create: {
        key: 'google-sheets',
        label: 'Google Sheets',
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
    const organizations = await prisma.organization.findMany();
    const googleModules = await prisma.module.findMany({
      where: {
        feature: {
          in: ['GMAIL', 'GOOGLE_CALENDAR', 'GOOGLE_DRIVE', 'GOOGLE_MEET', 'GOOGLE_DOCS', 'GOOGLE_SHEETS']
        }
      }
    });

    for (const org of organizations) {
      for (const module of googleModules) {
        await prisma.organizationModuleStatus.upsert({
          where: {
            organizationId_moduleId: {
              organizationId: org.id,
              moduleId: module.id
            }
          },
          update: {
            active: true
          },
          create: {
            organizationId: org.id,
            moduleId: module.id,
            active: true
          }
        });
      }
    }
    console.log(`✅ Modules activés pour ${organizations.length} organisation(s)`);

    // Vérification finale
    console.log('🔍 Vérification des modules Google Workspace...');
    const finalModules = await prisma.module.findMany({
      where: {
        feature: {
          in: ['GMAIL', 'GOOGLE_CALENDAR', 'GOOGLE_DRIVE', 'GOOGLE_MEET', 'GOOGLE_DOCS', 'GOOGLE_SHEETS']
        }
      },
      orderBy: {
        label: 'asc'
      }
    });
    
    console.log(`🎉 ${finalModules.length} modules Google Workspace configurés :`);
    finalModules.forEach(module => {
      console.log(`  📱 ${module.label} (${module.feature}) - ${module.active ? '✅ Actif' : '❌ Inactif'}`);
    });
    
    console.log('🏁 Configuration terminée avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

executeGoogleModules();
