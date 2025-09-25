import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addGoogleWorkspaceModules() {
  try {
    console.log('🚀 AJOUT DES MODULES GOOGLE WORKSPACE...');
    
    // Modules Google Workspace à ajouter
    const googleModules = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        key: 'gmail',
        label: 'Gmail',
        feature: 'GMAIL',
        icon: 'MdEmail',
        route: '/gmail',
        description: 'Gestion des emails intégrée avec Gmail',
        page: 'GmailPage',
        order: 10.0,
        active: true
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        key: 'google_calendar',
        label: 'Google Calendar',
        feature: 'GOOGLE_CALENDAR',
        icon: 'AiOutlineCalendar',
        route: '/google-calendar',
        description: 'Planification et gestion des rendez-vous avec Google Calendar',
        page: 'GoogleCalendarPage',
        order: 11.0,
        active: true
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        key: 'google_drive',
        label: 'Google Drive',
        feature: 'GOOGLE_DRIVE',
        icon: 'AiOutlineCloudServer',
        route: '/google-drive',
        description: 'Stockage et partage de fichiers avec Google Drive',
        page: 'GoogleDrivePage',
        order: 12.0,
        active: true
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        key: 'google_meet',
        label: 'Google Meet',
        feature: 'GOOGLE_MEET',
        icon: 'BiVideo',
        route: '/google-meet',
        description: 'Visioconférences et réunions avec Google Meet',
        page: 'GoogleMeetPage',
        order: 13.0,
        active: true
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440005',
        key: 'google_docs',
        label: 'Google Docs',
        feature: 'GOOGLE_DOCS',
        icon: 'AiOutlineFileText',
        route: '/google-docs',
        description: 'Documents collaboratifs avec Google Docs',
        page: 'GoogleDocsPage',
        order: 14.0,
        active: true
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440006',
        key: 'google_sheets',
        label: 'Google Sheets',
        feature: 'GOOGLE_SHEETS',
        icon: 'AiOutlineTable',
        route: '/google-sheets',
        description: 'Tableurs partagés avec Google Sheets',
        page: 'GoogleSheetsPage',
        order: 15.0,
        active: true
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440007',
        key: 'google_voice',
        label: 'Google Voice',
        feature: 'GOOGLE_VOICE',
        icon: 'FaPhone',
        route: '/google-voice',
        description: 'Appels et SMS avec Google Voice',
        page: 'GoogleVoicePage',
        order: 16.0,
        active: true
      }
    ];

    console.log('\n📦 CRÉATION DES MODULES...');
    let addedModules = 0;
    
    for (const moduleData of googleModules) {
      try {
        // Vérifier si le module existe déjà
        const existingModule = await prisma.module.findUnique({
          where: { id: moduleData.id }
        });
        
        if (existingModule) {
          console.log(`   ⚠️ Module ${moduleData.label} existe déjà, mise à jour...`);
          await prisma.module.update({
            where: { id: moduleData.id },
            data: moduleData
          });
        } else {
          await prisma.module.create({
            data: {
              ...moduleData,
              createdAt: new Date(),
              updatedAt: new Date(),
              organizationId: null // Modules globaux
            }
          });
          console.log(`   ✅ Module ${moduleData.label} ajouté`);
          addedModules++;
        }
      } catch (error) {
        console.log(`   ❌ Erreur pour ${moduleData.label}:`, error.message);
      }
    }
    
    console.log(`\n📊 RÉSUMÉ: ${addedModules} nouveaux modules ajoutés`);
    
    // Créer des permissions pour les nouveaux modules
    console.log('\n🔐 CRÉATION DES PERMISSIONS...');
    
    const roles = await prisma.role.findMany();
    let permissionsAdded = 0;
    
    for (const moduleData of googleModules) {
      // Pour chaque rôle et chaque module, créer les permissions de base
      for (const role of roles) {
        try {
          // Permission de lecture
          await prisma.permission.create({
            data: {
              roleId: role.id,
              organizationId: role.organizationId,
              moduleId: moduleData.id,
              action: 'read',
              resource: '*',
              allowed: true,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
          
          // Permission d'écriture (seulement pour les super admins et admins)
          if (role.name === 'superadmin' || role.name === 'admin') {
            await prisma.permission.create({
              data: {
                roleId: role.id,
                organizationId: role.organizationId,
                moduleId: moduleData.id,
                action: 'write',
                resource: '*',
                allowed: true,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
            
            await prisma.permission.create({
              data: {
                roleId: role.id,
                organizationId: role.organizationId,
                moduleId: moduleData.id,
                action: 'create',
                resource: '*',
                allowed: true,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
            
            await prisma.permission.create({
              data: {
                roleId: role.id,
                organizationId: role.organizationId,
                moduleId: moduleData.id,
                action: 'update',
                resource: '*',
                allowed: true,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
            
            await prisma.permission.create({
              data: {
                roleId: role.id,
                organizationId: role.organizationId,
                moduleId: moduleData.id,
                action: 'delete',
                resource: '*',
                allowed: true,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
          }
          
          permissionsAdded++;
        } catch (error) {
          // Permission peut déjà exister, on ignore l'erreur
        }
      }
    }
    
    console.log(`   ✅ ${permissionsAdded} permissions créées`);
    
    // Vérification finale
    console.log('\n🎉 MODULES GOOGLE WORKSPACE AJOUTÉS AVEC SUCCÈS!');
    
    const allModules = await prisma.module.findMany({
      where: {
        feature: {
          in: ['GMAIL', 'GOOGLE_CALENDAR', 'GOOGLE_DRIVE', 'GOOGLE_MEET', 'GOOGLE_DOCS', 'GOOGLE_SHEETS', 'GOOGLE_VOICE']
        }
      },
      orderBy: { order: 'asc' }
    });
    
    console.log('\n📋 MODULES GOOGLE WORKSPACE DISPONIBLES:');
    allModules.forEach(module => {
      console.log(`   🔸 ${module.label} (${module.key}) - ${module.active ? '✅ Actif' : '❌ Inactif'}`);
    });
    
    const totalPermissions = await prisma.permission.count({
      where: {
        moduleId: {
          in: allModules.map(m => m.id)
        }
      }
    });
    
    console.log(`\n🔐 Total permissions Google Workspace: ${totalPermissions}`);
    
  } catch (error) {
    console.error('💥 ERREUR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addGoogleWorkspaceModules();
