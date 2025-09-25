// Script pour initialiser les statuts métier dans la base de données
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CALL_STATUSES = [
  { name: 'Appel planifié', color: '#faad14', order: 0, description: 'Appel programmé à l\'avance mais non encore effectué' },
  { name: 'Appel en cours', color: '#1890ff', order: 1, description: 'Appel actif en temps réel' },
  { name: 'Appel terminé', color: '#52c41a', order: 2, description: 'Appel achevé avec succès' },
  { name: 'Pas de réponse', color: '#ff7875', order: 3, description: 'Personne n\'a décroché' },
  { name: 'Répondeur', color: '#722ed1', order: 4, description: 'Message vocal laissé' },
  { name: 'Occupé', color: '#f5222d', order: 5, description: 'Ligne occupée' },
  { name: 'Appel annulé', color: '#8c8c8c', order: 6, description: 'Appel qui n\'a pas eu lieu' },
  { name: 'RDV fixé', color: '#13c2c2', order: 7, description: 'Rendez-vous obtenu' },
  { name: 'Pas intéressé', color: '#ff4d4f', order: 8, description: 'Prospect non intéressé' }
];

const LEAD_STATUSES = [
  { name: 'Nouveau', color: '#faad14', order: 0, isDefault: true, description: 'Lead non encore contacté' },
  { name: 'Tentative de contact', color: '#1890ff', order: 1, description: 'En attente de réponse après tentatives' },
  { name: 'En cours', color: '#722ed1', order: 2, description: 'Premier contact établi' },
  { name: 'Connecté', color: '#52c41a', order: 3, description: 'Échange réel effectué' },
  { name: 'RDV fixé', color: '#13c2c2', order: 4, description: 'Rendez-vous planifié' },
  { name: 'Devis envoyé', color: '#eb2f96', order: 5, description: 'En attente de réponse au devis' },
  { name: 'En relance', color: '#fa8c16', order: 6, description: 'Relances en cours' },
  { name: 'Signé', color: '#389e0d', order: 7, description: 'Lead converti en client' },
  { name: 'Perdu', color: '#ff4d4f', order: 8, description: 'Lead non abouti' },
  { name: 'Non qualifié', color: '#8c8c8c', order: 9, description: 'Lead hors cible' }
];

async function initializeBusinessStatuses() {
  try {
    console.log('🔄 Initialisation des statuts métier...\n');

    // Récupérer l'organisation 2Thier CRM
    const organization = await prisma.organization.findUnique({
      where: { name: '2Thier CRM' }
    });

    if (!organization) {
      throw new Error('❌ Organisation "2Thier CRM" non trouvée');
    }

    console.log(`🏢 Organisation trouvée: ${organization.name} (${organization.id})\n`);

    // 1. Créer les statuts d'appel
    console.log('📞 Création des statuts d\'appel...');
    for (const status of CALL_STATUSES) {
      await prisma.callStatus.create({
        data: {
          name: status.name,
          color: status.color,
          order: status.order,
          organizationId: organization.id,
          data: { description: status.description }
        }
      });
      console.log(`   ✅ Créé: ${status.name}`);
    }

    // 2. Créer les statuts de lead
    console.log('\n📋 Création des statuts de lead...');
    for (const status of LEAD_STATUSES) {
      await prisma.leadStatus.create({
        data: {
          name: status.name,
          color: status.color,
          order: status.order,
          isDefault: status.isDefault || false,
          organizationId: organization.id,
          data: { description: status.description }
        }
      });
      console.log(`   ✅ Créé: ${status.name}`);
    }

    console.log('\n✨ Initialisation terminée avec succès!');
    console.log('💡 Vous pouvez maintenant configurer les mappings dans l\'interface "Mapping Statuts"');

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

initializeBusinessStatuses();
