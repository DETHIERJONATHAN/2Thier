/**
 * 🔧 SCRIPT POUR RENOMMER LE MODULE AGENDA EN GOOGLE AGENDA
 * Met à jour le label pour plus de clarté
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function renameAgendaModule() {
  try {
    console.log('🔍 Recherche du module Agenda...\n');

    // Trouver le module Agenda
    const agendaModule = await prisma.module.findFirst({
      where: {
        OR: [
          { key: 'Agenda' },
          { label: 'Agenda' },
          { feature: 'Agenda' }
        ]
      }
    });

    if (!agendaModule) {
      console.log('❌ Module Agenda non trouvé');
      return;
    }

    console.log('📋 Module trouvé:');
    console.log(`  - ID: ${agendaModule.id}`);
    console.log(`  - Key: "${agendaModule.key}"`);
    console.log(`  - Label: "${agendaModule.label}"`);
    console.log(`  - Feature: "${agendaModule.feature}"`);

    // Mettre à jour le module
    const updatedModule = await prisma.module.update({
      where: { id: agendaModule.id },
      data: {
        label: 'Google Agenda',
        key: 'google-agenda',
        feature: 'google-calendar',
        description: 'Gestion des rendez-vous et événements via Google Calendar'
      }
    });

    console.log('\n✅ Module mis à jour:');
    console.log(`  - Nouveau Label: "${updatedModule.label}"`);
    console.log(`  - Nouvelle Key: "${updatedModule.key}"`);
    console.log(`  - Nouvelle Feature: "${updatedModule.feature}"`);
    console.log(`  - Description: "${updatedModule.description}"`);

    console.log('\n🎉 Renommage terminé avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors du renommage:', error);
  } finally {
    await prisma.$disconnect();
  }
}

renameAgendaModule();
