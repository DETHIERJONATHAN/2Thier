import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function activateDevis1MinuteModules() {
  try {
    console.log('🚀 Activation des modules Devis1Minute...');

    // 1. Trouver tous les modules Devis1Minute
    const devis1minuteModules = await prisma.module.findMany({
      where: {
        key: {
          in: [
            'lead-generation',
            'marketplace', 
            'partner-portal',
            'public-forms',
            'landing-pages',
            'campaign-analytics'
          ]
        }
      }
    });

    console.log(`📦 Trouvé ${devis1minuteModules.length} modules Devis1Minute`);

    // 2. Trouver toutes les organisations (ou une organisation spécifique)
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true
      }
    });

    console.log(`🏢 Trouvé ${organizations.length} organisations`);

    // 3. Activer les modules pour chaque organisation
    let totalActivated = 0;

    for (const org of organizations) {
      console.log(`\n🏢 Activation pour ${org.name}...`);
      
      for (const module of devis1minuteModules) {
        try {
          await prisma.organizationModuleStatus.upsert({
            where: {
              organizationId_moduleId: {
                organizationId: org.id,
                moduleId: module.id
              }
            },
            update: {
              active: true,
              updatedAt: new Date()
            },
            create: {
              organizationId: org.id,
              moduleId: module.id,
              active: true
            }
          });
          
          console.log(`   ✅ ${module.label} activé`);
          totalActivated++;
        } catch (error) {
          console.log(`   ❌ Erreur ${module.label}: ${error.message}`);
        }
      }
    }

    // 4. Vérification finale
    console.log('\n🔍 VÉRIFICATION DES ACTIVATIONS...');
    const activeModules = await prisma.organizationModuleStatus.findMany({
      where: {
        active: true,
        Module: {
          key: {
            in: [
              'lead-generation',
              'marketplace', 
              'partner-portal',
              'public-forms',
              'landing-pages',
              'campaign-analytics'
            ]
          }
        }
      },
      include: {
        Module: true,
        Organization: true
      }
    });

    console.log('\n📊 RÉSUMÉ FINAL:');
    console.log(`✅ ${totalActivated} activations effectuées`);
    console.log(`📱 ${activeModules.length} modules Devis1Minute actifs au total`);
    
    console.log('\n📋 MODULES ACTIFS PAR ORGANISATION:');
    const groupedByOrg = {};
    activeModules.forEach(am => {
      if (!groupedByOrg[am.Organization.name]) {
        groupedByOrg[am.Organization.name] = [];
      }
      groupedByOrg[am.Organization.name].push(am.Module.label);
    });

    Object.keys(groupedByOrg).forEach(orgName => {
      console.log(`🏢 ${orgName}:`);
      groupedByOrg[orgName].forEach(moduleLabel => {
        console.log(`   ✅ ${moduleLabel}`);
      });
    });

    console.log('\n🎉 ACTIVATION TERMINÉE !');
    console.log('Les modules Devis1Minute sont maintenant actifs.');
    console.log('Rafraîchissez votre interface CRM pour les voir apparaître.');

  } catch (error) {
    console.error('❌ Erreur lors de l\'activation :', error);
  } finally {
    await prisma.$disconnect();
  }
}

activateDevis1MinuteModules();
