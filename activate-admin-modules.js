import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function activateAdminModules() {
  try {
    console.log('🔧 Activation des modules d\'administration...');

    // Trouver le super admin
    const superAdmin = await prisma.user.findFirst({
      where: { 
        OR: [
          { role: 'super_admin' },
          { email: 'jonathan.dethier@2thier.be' }
        ]
      },
      include: { 
        UserOrganization: {
          include: {
            Organization: true
          }
        }
      }
    });

    if (!superAdmin || superAdmin.UserOrganization.length === 0) {
      console.error('❌ Aucun super admin ou organisation trouvé');
      return;
    }

    const organization = superAdmin.UserOrganization[0].Organization;
    console.log(`📋 Organisation trouvée: ${organization.name} (${organization.id})`);

    // Trouver tous les modules d'administration
    const adminModules = await prisma.module.findMany({
      where: {
        key: {
          in: [
            'super-admin-modules',
            'super-admin-roles', 
            'super-admin-users',
            'super-admin-permissions',
            'super-admin-rights-summary',
            'super-admin-organizations',
            'super-admin-forms'
          ]
        }
      }
    });

    console.log(`📦 ${adminModules.length} modules d'administration trouvés`);

    let activated = 0;
    let alreadyActive = 0;

    for (const module of adminModules) {
      const existingStatus = await prisma.organizationModuleStatus.findUnique({
        where: {
          organizationId_moduleId: {
            organizationId: organization.id,
            moduleId: module.id
          }
        }
      });

      if (!existingStatus) {
        await prisma.organizationModuleStatus.create({
          data: {
            id: randomUUID(),
            organizationId: organization.id,
            moduleId: module.id,
            active: true,
            updatedAt: new Date()
          }
        });
        console.log(`✅ Module "${module.label}" activé`);
        activated++;
      } else if (existingStatus.active) {
        console.log(`⚠️  Module "${module.label}" déjà activé`);
        alreadyActive++;
      } else {
        await prisma.organizationModuleStatus.update({
          where: {
            organizationId_moduleId: {
              organizationId: organization.id,
              moduleId: module.id
            }
          },
          data: {
            active: true,
            updatedAt: new Date()
          }
        });
        console.log(`🔄 Module "${module.label}" réactivé`);
        activated++;
      }
    }

    console.log('\n📊 RÉSUMÉ ACTIVATION:');
    console.log(`✅ ${activated} modules activés`);
    console.log(`⚠️  ${alreadyActive} modules déjà actifs`);
    console.log(`🎯 ${adminModules.length} modules d'administration au total`);

    console.log('\n🎉 MODULES D\'ADMINISTRATION ACTIVÉS AVEC SUCCÈS !');

  } catch (error) {
    console.error('❌ Erreur lors de l\'activation des modules:', error);
  } finally {
    await prisma.$disconnect();
  }
}

activateAdminModules();
