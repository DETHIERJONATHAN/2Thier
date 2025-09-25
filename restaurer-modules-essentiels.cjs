const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function restaurerModulesEssentiels() {
  console.log('🔄 RESTAURATION DES MODULES ESSENTIELS MANQUANTS');
  console.log('================================================\n');
  
  try {
    // Modules essentiels qui doivent exister
    const modulesEssentiels = [
      {
        key: 'clients',
        label: 'Client',
        feature: 'CRM',
        icon: 'UserOutlined',
        route: '/client',
        description: 'Gestion des clients'
      },
      {
        key: 'facturation',
        label: 'Facture', 
        feature: 'facturation:view',
        icon: 'FileTextOutlined',
        route: '/facture',
        description: 'Gestion de la facturation'
      },
      {
        key: 'formulaires',
        label: 'Formulaires',
        feature: 'formulaires:view',
        icon: 'FormOutlined',
        route: '/formulaire',
        description: 'Gestion des formulaires'
      },
      {
        key: 'modules',
        label: 'Modules',
        feature: 'admin_panel:view',
        icon: 'SettingOutlined',
        route: '/admin/modules',
        description: 'Administration des modules'
      },
      {
        key: 'roles',
        label: 'Rôles',
        feature: 'admin_panel:view',
        icon: 'TeamOutlined',
        route: '/admin/roles',
        description: 'Gestion des rôles'
      },
      {
        key: 'users',
        label: 'Utilisateurs',
        feature: 'admin_panel:view',
        icon: 'UserOutlined',
        route: '/admin/users',
        description: 'Gestion des utilisateurs'
      },
      {
        key: 'permissions',
        label: 'Permissions',
        feature: 'admin_panel:view',
        icon: 'SafetyOutlined',
        route: '/admin/permissions',
        description: 'Gestion des permissions'
      },
      {
        key: 'organizations',
        label: 'Organisations',
        feature: 'super_admin',
        icon: 'BankOutlined',
        route: '/admin/organizations',
        description: 'Gestion des organisations'
      }
    ];
    
    let modulesCreés = 0;
    let modulesExistants = 0;
    
    for (const moduleData of modulesEssentiels) {
      // Vérifier si le module existe déjà
      const moduleExistant = await prisma.module.findFirst({
        where: { key: moduleData.key }
      });
      
      if (!moduleExistant) {
        try {
          const nouveauModule = await prisma.module.create({
            data: {
              key: moduleData.key,
              label: moduleData.label,
              feature: moduleData.feature,
              icon: moduleData.icon,
              route: moduleData.route,
              description: moduleData.description,
              active: true
            }
          });
          
          modulesCreés++;
          console.log(`✅ Module créé: ${moduleData.label} (${moduleData.key}) → ${moduleData.route}`);
          
          // Activer pour l'organisation 2Thier CRM
          const telnyx2thier = await prisma.organization.findFirst({
            where: { name: '2Thier CRM' }
          });
          
          if (telnyx2thier) {
            try {
              await prisma.organizationModuleStatus.create({
                data: {
                  organizationId: telnyx2thier.id,
                  moduleId: nouveauModule.id,
                  active: true
                }
              });
              console.log(`   ✅ Activé pour 2Thier CRM`);
            } catch (error) {
              console.log(`   ⚠️  Activation déjà existante pour ${moduleData.key}`);
            }
          }
          
        } catch (error) {
          console.error(`❌ Erreur création ${moduleData.key}:`, error.message);
        }
      } else {
        modulesExistants++;
        console.log(`ℹ️  Module existant: ${moduleData.label} (${moduleData.key})`);
      }
    }
    
    console.log(`\n📊 BILAN:`);
    console.log(`✅ Modules créés: ${modulesCreés}`);
    console.log(`ℹ️  Modules déjà existants: ${modulesExistants}`);
    
    // Résumé final
    console.log('\n📋 RÉSUMÉ FINAL - TOUS LES MODULES:');
    console.log('===================================');
    
    const modulesFinal = await prisma.module.findMany({
      orderBy: { label: 'asc' }
    });
    
    console.log(`\n🎯 MODULES ACTIFS (${modulesFinal.filter(m => m.active).length}/${modulesFinal.length}):`);
    
    // Grouper par catégorie pour un meilleur affichage
    const modulesParCategorie = {
      'CRM': [],
      'Google Workspace': [],
      'Administration': [],
      'Communications': [],
      'Autres': []
    };
    
    modulesFinal.forEach(module => {
      if (module.key.startsWith('google_')) {
        modulesParCategorie['Google Workspace'].push(module);
      } else if (module.route && module.route.startsWith('/admin/')) {
        modulesParCategorie['Administration'].push(module);
      } else if (module.key === 'telnyx') {
        modulesParCategorie['Communications'].push(module);
      } else if (['clients', 'facturation', 'leads', 'gestion_sav', 'dashboard', 'technique', 'formulaires', 'mail', 'Agenda', 'blocs'].includes(module.key)) {
        modulesParCategorie['CRM'].push(module);
      } else {
        modulesParCategorie['Autres'].push(module);
      }
    });
    
    Object.entries(modulesParCategorie).forEach(([categorie, modules]) => {
      if (modules.length > 0) {
        console.log(`\n📁 ${categorie.toUpperCase()}:`);
        modules.forEach(module => {
          const status = module.active ? '✅' : '❌';
          console.log(`   ${status} ${module.label} (${module.key}): ${module.route} [${module.feature}]`);
        });
      }
    });
    
    console.log('\n🎉 RESTAURATION TERMINÉE !');
    console.log('==========================');
    console.log('👉 Rafraîchissez votre page CRM pour voir TOUS les modules dans la sidebar !');
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restaurerModulesEssentiels();
