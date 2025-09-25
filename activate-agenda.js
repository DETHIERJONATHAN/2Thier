const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function activateAgenda() {
  try {
    // Récupérer le module Agenda
    const agendaModule = await prisma.module.findFirst({
      where: { key: 'agenda' }
    });
    
    if (!agendaModule) {
      console.log('Module Agenda introuvable');
      return;
    }
    
    console.log('Module Agenda trouvé:', agendaModule.id);
    
    // Récupérer toutes les organisations
    const organizations = await prisma.organization.findMany();
    console.log(`Organisations trouvées: ${organizations.length}`);
    
    for (const org of organizations) {
      console.log(`Traitement de l'organisation: ${org.name}`);
      
      // Vérifier si le statut existe déjà
      const existingStatus = await prisma.organizationModuleStatus.findFirst({
        where: {
          organizationId: org.id,
          moduleId: agendaModule.id
        }
      });
      
      if (existingStatus) {
        // Mettre à jour si existe
        await prisma.organizationModuleStatus.update({
          where: { id: existingStatus.id },
          data: { isActive: true }
        });
        console.log(`✅ Module Agenda activé pour ${org.name}`);
      } else {
        // Créer si n'existe pas
        await prisma.organizationModuleStatus.create({
          data: {
            organizationId: org.id,
            moduleId: agendaModule.id,
            isActive: true
          }
        });
        console.log(`✅ Statut créé et module Agenda activé pour ${org.name}`);
      }
    }
    
    console.log('\n=== VÉRIFICATION FINALE ===');
    const finalStatuses = await prisma.organizationModuleStatus.findMany({
      where: { moduleId: agendaModule.id },
      include: { organization: true }
    });
    
    finalStatuses.forEach(status => {
      console.log(`${status.organization.name}: ${status.isActive ? 'ACTIF' : 'INACTIF'}`);
    });
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

activateAgenda();
