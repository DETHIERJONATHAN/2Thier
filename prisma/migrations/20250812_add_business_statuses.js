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

async function addBusinessStatuses() {
  try {
    console.log('🔄 Ajout des statuts métier...\n');

    // Récupérer l'organisation 2Thier CRM
    const organization = await prisma.organization.findUnique({
      where: { name: '2Thier CRM' }
    });

    if (!organization) {
      throw new Error('❌ Organisation "2Thier CRM" non trouvée');
    }

    console.log(`🏢 Organisation trouvée: ${organization.name} (${organization.id})\n`);

    // 1. Ajouter les statuts d'appel s'ils n'existent pas
    console.log('📞 Ajout des statuts d\'appel...');
    for (const status of CALL_STATUSES) {
      const existingStatus = await prisma.callStatus.findFirst({
        where: { 
          name: status.name,
          organizationId: organization.id
        }
      });

      if (!existingStatus) {
        await prisma.callStatus.create({
          data: {
            name: status.name,
            color: status.color,
            order: status.order,
            organizationId: organization.id,
            data: { description: status.description }
          }
        });
        console.log(`   ✅ Ajouté: ${status.name}`);
      } else {
        console.log(`   ℹ️ Existe déjà: ${status.name}`);
      }
    }

    // 2. Ajouter les statuts de lead s'ils n'existent pas
    console.log('\n📋 Ajout des statuts de lead...');
    for (const status of LEAD_STATUSES) {
      const existingStatus = await prisma.leadStatus.findFirst({
        where: { 
          name: status.name,
          organizationId: organization.id
        }
      });

      if (!existingStatus) {
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
        console.log(`   ✅ Ajouté: ${status.name}`);
      } else {
        console.log(`   ℹ️ Existe déjà: ${status.name}`);
      }
    }

    // 3. Mappings par défaut
    console.log('\n🔄 Configuration des mappings par défaut...');
    const callStatuses = await prisma.callStatus.findMany({
      where: { organizationId: organization.id }
    });

    const leadStatuses = await prisma.leadStatus.findMany({
      where: { organizationId: organization.id }
    });

    // Mapping logique entre les statuts
    const mappings = [
      // Appel planifié -> Tentative de contact
      {
        callStatusName: 'Appel planifié',
        leadStatusName: 'Tentative de contact',
        priority: 1
      },
      // Pas de réponse -> Tentative de contact
      {
        callStatusName: 'Pas de réponse',
        leadStatusName: 'Tentative de contact',
        priority: 1
      },
      // Répondeur -> Tentative de contact
      {
        callStatusName: 'Répondeur',
        leadStatusName: 'Tentative de contact',
        priority: 1
      },
      // Appel terminé -> Connecté
      {
        callStatusName: 'Appel terminé',
        leadStatusName: 'Connecté',
        priority: 1
      },
      // RDV fixé -> RDV fixé
      {
        callStatusName: 'RDV fixé',
        leadStatusName: 'RDV fixé',
        priority: 1
      },
      // Pas intéressé -> Perdu
      {
        callStatusName: 'Pas intéressé',
        leadStatusName: 'Perdu',
        priority: 1
      }
    ];

    for (const mapping of mappings) {
      const callStatus = callStatuses.find(s => s.name === mapping.callStatusName);
      const leadStatus = leadStatuses.find(s => s.name === mapping.leadStatusName);

      if (callStatus && leadStatus) {
        const existingMapping = await prisma.callToLeadMapping.findFirst({
          where: {
            callStatusId: callStatus.id,
            leadStatusId: leadStatus.id,
            organizationId: organization.id
          }
        });

        if (!existingMapping) {
          await prisma.callToLeadMapping.create({
            data: {
              organizationId: organization.id,
              callStatusId: callStatus.id,
              leadStatusId: leadStatus.id,
              priority: mapping.priority
            }
          });
          console.log(`   ✅ Mapping ajouté: ${mapping.callStatusName} -> ${mapping.leadStatusName}`);
        } else {
          console.log(`   ℹ️ Mapping existe déjà: ${mapping.callStatusName} -> ${mapping.leadStatusName}`);
        }
      }
    }

    console.log('\n✨ Configuration terminée avec succès!');

  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addBusinessStatuses();
