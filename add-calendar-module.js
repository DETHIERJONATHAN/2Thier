import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function addCalendarModule() {
  try {
    const existing = await prisma.module.findUnique({
      where: { key: 'calendar' }
    });

    if (!existing) {
      const newModule = await prisma.module.create({
        data: {
          key: 'calendar',
          label: 'Agenda',
          feature: 'CALENDAR',
          icon: 'CalendarOutlined',
          route: '/calendar',
          description: 'Gestion de l\'agenda et des événements',
          page: 'CalendarPage',
          order: 4,
          active: true
        }
      });
      console.log('Module AGENDA ajouté avec succès!', newModule);
    } else {
      console.log('Le module AGENDA existe déjà:', existing);
      
      // Si besoin, mettre à jour pour s'assurer qu'il est actif
      if (!existing.active) {
        await prisma.module.update({
          where: { id: existing.id },
          data: { active: true }
        });
        console.log('Module AGENDA réactivé!');
      }
    }

    // Vérifier que le module est bien activé pour toutes les organisations
    const organizations = await prisma.organization.findMany({
      include: {
        OrganizationModuleStatus: true
      }
    });

    const moduleId = existing?.id || newModule.id;

    for (const org of organizations) {
      const moduleStatus = org.OrganizationModuleStatus.find(
        status => status.moduleId === moduleId
      );

      if (!moduleStatus) {
        // Activer le module pour cette organisation
        await prisma.organizationModuleStatus.create({
          data: {
            organizationId: org.id,
            moduleId: moduleId,
            active: true
          }
        });
        console.log(`Module AGENDA activé pour l'organisation: ${org.name}`);
      } else if (!moduleStatus.active) {
        // Réactiver le module pour cette organisation
        await prisma.organizationModuleStatus.update({
          where: { id: moduleStatus.id },
          data: { active: true }
        });
        console.log(`Module AGENDA réactivé pour l'organisation: ${org.name}`);
      }
    }

    console.log('✅ Module AGENDA configuré avec succès pour toutes les organisations!');

  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout du module AGENDA:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addCalendarModule();
