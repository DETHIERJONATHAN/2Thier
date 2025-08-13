import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Les définitions de chaque statut avec leur mapping vers les statuts de lead
const CALL_STATUSES = [
  { 
    name: 'Appel planifié',
    color: '#faad14',
    order: 0,
    data: {
      description: 'Appel programmé à l\'avance mais non encore effectué',
      tooltip: 'Appel programmé pour une date/heure future → Tentative de contact'
    }
  },
  { 
    name: 'Appel en cours',
    color: '#1890ff',
    order: 1,
    data: {
      description: 'Appel actif en temps réel',
      tooltip: 'Appel actuellement en cours avec le contact'
    }
  },
  { 
    name: 'Appel terminé',
    color: '#52c41a',
    order: 2,
    data: {
      description: 'Appel achevé avec succès',
      tooltip: 'Appel terminé avec contact établi → Lead Connecté'
    }
  },
  { 
    name: 'Pas de réponse',
    color: '#ff7875',
    order: 3,
    data: {
      description: 'Personne n\'a décroché',
      tooltip: 'Le contact n\'a pas répondu à l\'appel → Tentative de contact'
    }
  },
  { 
    name: 'Répondeur',
    color: '#722ed1',
    order: 4,
    data: {
      description: 'Message vocal laissé',
      tooltip: 'Message laissé sur répondeur → Tentative de contact'
    }
  },
  { 
    name: 'Occupé',
    color: '#f5222d',
    order: 5,
    data: {
      description: 'Ligne occupée',
      tooltip: 'La ligne était occupée → Tentative de contact'
    }
  },
  { 
    name: 'Appel annulé',
    color: '#8c8c8c',
    order: 6,
    data: {
      description: 'Appel qui n\'a pas eu lieu',
      tooltip: 'Appel annulé avant d\'être effectué'
    }
  },
  { 
    name: 'RDV fixé',
    color: '#13c2c2',
    order: 7,
    data: {
      description: 'Rendez-vous obtenu',
      tooltip: 'Appel conclu par un RDV → Lead RDV fixé'
    }
  },
  { 
    name: 'Pas intéressé',
    color: '#ff4d4f',
    order: 8,
    data: {
      description: 'Prospect non intéressé',
      tooltip: 'Contact non intéressé par l\'offre → Lead Perdu'
    }
  }
];

const LEAD_STATUSES = [
  { 
    name: 'Nouveau',
    color: '#faad14',
    order: 0,
    isDefault: true,
    data: {
      description: 'Lead non encore contacté',
      tooltip: 'Nouveau lead à traiter, aucun contact établi'
    }
  },
  { 
    name: 'Tentative de contact',
    color: '#1890ff',
    order: 1,
    data: {
      description: 'En attente de réponse après tentatives',
      tooltip: 'Contact tenté mais pas encore joint (appels sans réponse, messages)'
    }
  },
  { 
    name: 'En cours',
    color: '#722ed1',
    order: 2,
    data: {
      description: 'Premier contact établi',
      tooltip: 'Premier échange réalisé, en cours de traitement'
    }
  },
  { 
    name: 'Connecté',
    color: '#52c41a',
    order: 3,
    data: {
      description: 'Échange réel effectué',
      tooltip: 'Contact établi et conversation réalisée'
    }
  },
  { 
    name: 'RDV fixé',
    color: '#13c2c2',
    order: 4,
    data: {
      description: 'Rendez-vous planifié',
      tooltip: 'Un rendez-vous a été fixé avec le lead'
    }
  },
  { 
    name: 'Devis envoyé',
    color: '#eb2f96',
    order: 5,
    data: {
      description: 'En attente de réponse au devis',
      tooltip: 'Proposition commerciale envoyée, en attente de retour'
    }
  },
  { 
    name: 'En relance',
    color: '#fa8c16',
    order: 6,
    data: {
      description: 'Relances en cours',
      tooltip: 'Suivi actif après proposition/RDV'
    }
  },
  { 
    name: 'Signé',
    color: '#389e0d',
    order: 7,
    data: {
      description: 'Lead converti en client',
      tooltip: 'Lead converti avec succès en client'
    }
  },
  { 
    name: 'Perdu',
    color: '#ff4d4f',
    order: 8,
    data: {
      description: 'Lead non abouti',
      tooltip: 'Lead non intéressé ou opportunité perdue'
    }
  },
  { 
    name: 'Non qualifié',
    color: '#8c8c8c',
    order: 9,
    data: {
      description: 'Lead hors cible',
      tooltip: 'Lead ne correspondant pas aux critères cibles'
    }
  }
];

async function updateStatusesTooltips() {
  try {
    console.log('🔄 Mise à jour des tooltips des statuts...\n');

    // Récupérer l'organisation 2Thier CRM
    const organization = await prisma.organization.findUnique({
      where: { name: '2Thier CRM' }
    });

    if (!organization) {
      throw new Error('❌ Organisation "2Thier CRM" non trouvée');
    }

    // 1. Mettre à jour les tooltips des statuts d'appel
    console.log('📞 Mise à jour des tooltips des statuts d\'appel...');
    for (const status of CALL_STATUSES) {
      const existingStatus = await prisma.callStatus.findFirst({
        where: { 
          name: status.name,
          organizationId: organization.id
        }
      });

      if (existingStatus) {
        await prisma.callStatus.update({
          where: { id: existingStatus.id },
          data: { data: status.data }
        });
        console.log(`   ✅ Tooltip mis à jour: ${status.name}`);
      }
    }

    // 2. Mettre à jour les tooltips des statuts de lead
    console.log('\n📋 Mise à jour des tooltips des statuts de lead...');
    for (const status of LEAD_STATUSES) {
      const existingStatus = await prisma.leadStatus.findFirst({
        where: { 
          name: status.name,
          organizationId: organization.id
        }
      });

      if (existingStatus) {
        await prisma.leadStatus.update({
          where: { id: existingStatus.id },
          data: { data: status.data }
        });
        console.log(`   ✅ Tooltip mis à jour: ${status.name}`);
      }
    }

    console.log('\n✨ Mise à jour des tooltips terminée avec succès!');

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateStatusesTooltips();
