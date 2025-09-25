const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function activateGoogleCalendar() {
  try {
    const module = await prisma.module.findFirst({
      where: { feature: 'google_calendar' }
    });
    
    if (!module) {
      console.log('Module Google Calendar non trouvé');
      return;
    }
    
    // Activer le module pour toutes les organisations
    const result = await prisma.organizationModuleStatus.updateMany({
      where: { moduleId: module.id },
      data: { active: true }
    });
    
    console.log(`Module Google Calendar activé pour ${result.count} organisations`);
    
    // Vérifier le résultat
    const orgModules = await prisma.organizationModuleStatus.findMany({
      where: { moduleId: module.id },
      include: { Organization: true }
    });
    
    console.log('\nÉtat après activation:');
    orgModules.forEach(om => {
      console.log(`- ${om.Organization.name}: ${om.active ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
    });
    
  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

activateGoogleCalendar();
