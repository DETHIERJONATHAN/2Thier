const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Liste complète des modules basée sur les pages existantes
const allModules = [
  // Modules CRM de base
  {
    key: 'leads',
    label: 'Leads',
    feature: 'leads:view',
    icon: 'UserOutlined',
    route: '/leads',
    description: 'Gestion des prospects et leads',
    active: true
  },
  {
    key: 'clients',
    label: 'Client',
    feature: 'clients:view',
    icon: 'TeamOutlined',
    route: '/clients',
    description: 'Gestion des clients',
    active: true
  },
  {
    key: 'facturation',
    label: 'Facture',
    feature: 'facturation:view',
    icon: 'FileTextOutlined',
    route: '/facture',
    description: 'Gestion de la facturation',
    active: true
  },
  {
    key: 'dashboard',
    label: 'Tableau de bord',
    feature: 'dashboard:view',
    icon: 'DashboardOutlined',
    route: '/dashboard',
    description: 'Tableau de bord principal',
    active: true
  },

  // Google Workspace
  {
    key: 'google_agenda',
    label: 'Google Agenda',
    feature: 'google_agenda:view',
    icon: 'CalendarOutlined',
    route: '/google-agenda',
    description: 'Intégration Google Calendar',
    active: true
  },
  {
    key: 'google_analytics',
    label: 'Google Analytics',
    feature: 'google_analytics:view',
    icon: 'BarChartOutlined',
    route: '/google-analytics',
    description: 'Analyse Google Analytics',
    active: true
  },
  {
    key: 'google_chat',
    label: 'Google Chat',
    feature: 'google_chat:view',
    icon: 'MessageOutlined',
    route: '/google-chat',
    description: 'Google Chat intégré',
    active: true
  },
  {
    key: 'google_docs',
    label: 'Google Docs',
    feature: 'google_docs:view',
    icon: 'FileWordOutlined',
    route: '/google-docs',
    description: 'Documents Google Docs',
    active: true
  },
  {
    key: 'google_drive',
    label: 'Google Drive',
    feature: 'google_drive:view',
    icon: 'CloudOutlined',
    route: '/google-drive',
    description: 'Stockage Google Drive',
    active: true
  },
  {
    key: 'google_keep',
    label: 'Google Keep',
    feature: 'google_keep:view',
    icon: 'PushpinOutlined',
    route: '/google-keep',
    description: 'Notes Google Keep',
    active: true
  },
  {
    key: 'google_mail',
    label: 'Google Mail',
    feature: 'google_mail:view',
    icon: 'MailOutlined',
    route: '/google-mail',
    description: 'Gmail intégré',
    active: true
  },
  {
    key: 'google_maps',
    label: 'Google Maps',
    feature: 'google_maps:view',
    icon: 'EnvironmentOutlined',
    route: '/google-maps',
    description: 'Cartes Google Maps',
    active: true
  },
  {
    key: 'google_meet',
    label: 'Google Meet',
    feature: 'google_meet:view',
    icon: 'VideoCameraOutlined',
    route: '/google-meet',
    description: 'Visioconférence Google Meet',
    active: true
  },
  {
    key: 'google_forms',
    label: 'Google Forms',
    feature: 'google_forms:view',
    icon: 'FormOutlined',
    route: '/google-forms',
    description: 'Formulaires Google Forms',
    active: true
  },
  {
    key: 'google_groups',
    label: 'Google Groups',
    feature: 'google_groups:view',
    icon: 'TeamOutlined',
    route: '/google-groups',
    description: 'Groupes Google Groups',
    active: true
  },
  {
    key: 'google_gemini',
    label: 'Google Gemini AI',
    feature: 'google_gemini:view',
    icon: 'RobotOutlined',
    route: '/google-gemini',
    description: 'IA Google Gemini',
    active: true
  },

  // Formulaires
  {
    key: 'formulaires',
    label: 'Formulaires',
    feature: 'formulaires:view',
    icon: 'FormOutlined',
    route: '/formulaires',
    description: 'Gestionnaire de formulaires',
    active: true
  },
  {
    key: 'blocs',
    label: 'Bloc',
    feature: 'blocs:view',
    icon: 'BlockOutlined',
    route: '/blocs',
    description: 'Blocs de construction',
    active: true
  },

  // Communications
  {
    key: 'telnyx',
    label: 'Telnyx Communications',
    feature: 'telnyx:view',
    icon: 'PhoneOutlined',
    route: '/telnyx',
    description: 'Services de télécommunications Telnyx',
    active: true
  },

  // Technique
  {
    key: 'technique',
    label: 'Technique',
    feature: 'technique:view',
    icon: 'SettingOutlined',
    route: '/technique',
    description: 'Outils techniques',
    active: true
  },
  {
    key: 'analytics',
    label: 'Statistiques',
    feature: 'analytics:view',
    icon: 'BarChartOutlined',
    route: '/analytics',
    description: 'Statistiques et analyses',
    active: true
  },

  // Administration
  {
    key: 'modules',
    label: 'Modules',
    feature: 'admin_panel:view',
    icon: 'AppstoreOutlined',
    route: '/admin/modules',
    description: 'Gestion des modules',
    active: true
  },
  {
    key: 'roles',
    label: 'Rôles',
    feature: 'admin_panel:view',
    icon: 'SafetyOutlined',
    route: '/admin/roles',
    description: 'Gestion des rôles',
    active: true
  },
  {
    key: 'users',
    label: 'Utilisateurs',
    feature: 'admin_panel:view',
    icon: 'UserOutlined',
    route: '/admin/users',
    description: 'Gestion des utilisateurs',
    active: true
  },
  {
    key: 'permissions',
    label: 'Permissions',
    feature: 'admin_panel:view',
    icon: 'KeyOutlined',
    route: '/admin/permissions',
    description: 'Gestion des permissions',
    active: true
  },
  {
    key: 'organizations',
    label: 'Organisations',
    feature: 'super_admin',
    icon: 'BankOutlined',
    route: '/admin/organizations',
    description: 'Gestion des organisations',
    active: true
  }
];

async function addMissingModules() {
  console.log('🔄 Ajout des modules manquants...');
  
  try {
    // Récupérer les modules existants
    const existingModules = await prisma.module.findMany();
    console.log(`📋 Modules existants: ${existingModules.length}`);
    existingModules.forEach(m => console.log(`  - ${m.key} (${m.label})`));
    
    // Identifier les modules manquants
    const existingModuleKeys = new Set(existingModules.map(m => m.key));
    const missingModules = allModules.filter(m => !existingModuleKeys.has(m.key));
    
    console.log(`\n🆕 Modules manquants: ${missingModules.length}`);
    missingModules.forEach(m => console.log(`  - ${m.key} (${m.label})`));
    
    if (missingModules.length === 0) {
      console.log('✅ Tous les modules sont déjà présents !');
      return;
    }
    
    // Ajouter les modules manquants
    let addedCount = 0;
    for (const module of missingModules) {
      try {
        await prisma.module.create({
          data: {
            key: module.key,
            label: module.label,
            feature: module.feature,
            icon: module.icon,
            route: module.route,
            description: module.description,
            active: module.active
          }
        });
        addedCount++;
        console.log(`✅ Module ajouté: ${module.key}`);
      } catch (error) {
        console.error(`❌ Erreur pour ${module.key}:`, error.message);
      }
    }
    
    console.log(`\n🎉 ${addedCount} modules ajoutés avec succès !`);
    
    // Activer les modules pour l'organisation 2Thier CRM
    console.log('\n🔄 Activation des modules pour 2Thier CRM...');
    const targetOrg = await prisma.organization.findFirst({
      where: { name: '2Thier CRM' }
    });
    
    if (targetOrg) {
      console.log(`📋 Organisation trouvée: ${targetOrg.name} (${targetOrg.id})`);
      
      const allModulesNow = await prisma.module.findMany();
      let activatedCount = 0;
      
      for (const module of allModulesNow) {
        try {
          // Vérifier si déjà activé
          const existing = await prisma.organizationModuleStatus.findFirst({
            where: {
              organizationId: targetOrg.id,
              moduleId: module.id
            }
          });
          
          if (!existing) {
            await prisma.organizationModuleStatus.create({
              data: {
                organizationId: targetOrg.id,
                moduleId: module.id,
                active: true
              }
            });
            activatedCount++;
            console.log(`✅ Module activé: ${module.label}`);
          }
        } catch (error) {
          console.error(`❌ Erreur activation ${module.key}:`, error.message);
        }
      }
      
      console.log(`🎉 ${activatedCount} modules activés pour 2Thier CRM !`);
    } else {
      console.log('❌ Organisation 2Thier CRM non trouvée');
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addMissingModules();
