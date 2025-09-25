const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function activateAgendaModule() {
  try {
    console.log('🔍 Recherche du module Agenda...');
    
    // Trouver le module Agenda
    const agendaModule = await prisma.module.findFirst({
      where: {
        OR: [
          { key: 'Agenda' },
          { key: 'agenda' },
          { label: 'Agenda' }
        ]
      }
    });
    
    if (!agendaModule) {
      console.log('❌ Module Agenda non trouvé');
      return;
    }
    
    console.log('✅ Module Agenda trouvé:', {
      id: agendaModule.id,
      key: agendaModule.key,
      label: agendaModule.label,
      active: agendaModule.active
    });
    
    // Trouver l'organisation 2Thier CRM
    const organization = await prisma.organization.findFirst({
      where: {
        name: '2Thier CRM'
      }
    });
    
    if (!organization) {
      console.log('❌ Organisation 2Thier CRM non trouvée');
      return;
    }
    
    console.log('✅ Organisation trouvée:', {
      id: organization.id,
      name: organization.name
    });
    
    // Vérifier si le module est déjà activé pour cette organisation
    const existingStatus = await prisma.organizationModuleStatus.findFirst({
      where: {
        organizationId: organization.id,
        moduleId: agendaModule.id
      }
    });
    
    if (existingStatus) {
      console.log('📋 Statut existant:', {
        active: existingStatus.active
      });
      
      if (existingStatus.active) {
        console.log('✅ Le module Agenda est déjà activé pour cette organisation');
        return;
      }
      
      // Mettre à jour le statut
      await prisma.organizationModuleStatus.update({
        where: {
          id: existingStatus.id
        },
        data: {
          active: true
        }
      });
      
      console.log('✅ Module Agenda activé avec succès !');
    } else {
      // Créer un nouveau statut
      await prisma.organizationModuleStatus.create({
        data: {
          organizationId: organization.id,
          moduleId: agendaModule.id,
          active: true
        }
      });
      
      console.log('✅ Nouveau statut créé - Module Agenda activé !');
    }
    
    // Vérifier le résultat
    const finalStatus = await prisma.organizationModuleStatus.findFirst({
      where: {
        organizationId: organization.id,
        moduleId: agendaModule.id
      }
    });
    
    console.log('🎯 Statut final:', {
      active: finalStatus?.active,
      organizationId: finalStatus?.organizationId,
      moduleId: finalStatus?.moduleId
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

activateAgendaModule();
