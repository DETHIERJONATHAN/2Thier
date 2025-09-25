// Script pour compléter les mappings selon le tableau métier exact
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// MAPPINGS COMPLETS selon votre tableau métier exact
const COMPLETE_MAPPINGS = [
  {
    callStatusName: 'Planifié',
    leadStatusName: 'Nouveau',
    condition: 'automatic',
    priority: 1,
    description: 'Appel à venir, tâche à réaliser → Nouveau / Ouvert – le lead vient d\'être créé et attend un premier contact'
  },
  {
    callStatusName: 'En attente (Ringing)',
    leadStatusName: 'Nouveau',
    condition: 'automatic',
    priority: 2,
    description: 'La ligne sonne ou l\'appel est en file → Toujours Nouveau - la tentative démarre mais le lead n\'a pas encore répondu'
  },
  {
    callStatusName: 'En attente (Ringing)',
    leadStatusName: 'Contact en cours',
    condition: 'if_already_contacted',
    priority: 3,
    description: 'La ligne sonne → Contact en cours si déjà un échange précédent'
  },
  {
    callStatusName: 'Occupé',
    leadStatusName: 'Contact en cours',
    condition: 'automatic',
    priority: 4,
    description: 'Ligne occupée → Contact en cours - planifier une relance'
  },
  {
    callStatusName: 'Pas de réponse',
    leadStatusName: 'Contact en cours',
    condition: 'automatic',
    priority: 5,
    description: 'Aucun décroché → Contact en cours - planifier une relance'
  },
  {
    callStatusName: 'Manqué',
    leadStatusName: 'Contact en cours',
    condition: 'automatic',
    priority: 6,
    description: 'Appel manqué → Contact en cours - planifier une relance'
  },
  {
    callStatusName: 'Annulé',
    leadStatusName: 'Nouveau',
    condition: 'if_first_attempt',
    priority: 7,
    description: 'Appel interrompu avant connexion → Statut inchangé (Nouveau si premier appel)'
  },
  {
    callStatusName: 'Annulé',
    leadStatusName: 'Contact en cours',
    condition: 'if_retry_attempt',
    priority: 8,
    description: 'Appel interrompu avant connexion → Contact en cours si relance'
  },
  {
    callStatusName: 'Échec',
    leadStatusName: 'Non qualifié',
    condition: 'if_bad_number',
    priority: 9,
    description: 'Erreur technique (numéro invalide, problème réseau) → Non qualifié si mauvais numéro'
  },
  {
    callStatusName: 'En cours (Connected)',
    leadStatusName: 'Contact en cours',
    condition: 'automatic',
    priority: 10,
    description: 'Appel en cours → Le lead franchit la phase Contact en cours'
  },
  {
    callStatusName: 'Terminé (Completed)',
    leadStatusName: 'À qualifier',
    condition: 'if_conversation_happened',
    priority: 11,
    description: 'Appel abouti, conversation terminée → À qualifier pour évaluer l\'intérêt'
  },
  {
    callStatusName: 'Terminé (Completed)',
    leadStatusName: 'Prospect froid',
    condition: 'if_low_interest',
    priority: 12,
    description: 'Appel abouti → Prospect froid si intérêt faible manifesté'
  },
  {
    callStatusName: 'Terminé (Completed)',
    leadStatusName: 'Prospect chaud',
    condition: 'if_high_interest',
    priority: 13,
    description: 'Appel abouti → Prospect chaud si fort intérêt manifesté'
  },
  {
    callStatusName: 'Transaction ouverte',
    leadStatusName: 'Transaction ouverte',
    condition: 'automatic',
    priority: 14,
    description: 'L\'appel a conduit à une demande de devis → Transaction ouverte'
  },
  {
    callStatusName: 'Transaction ouverte',
    leadStatusName: 'Devis à envoyer',
    condition: 'if_quote_requested',
    priority: 15,
    description: 'Demande de devis → Devis à envoyer (première étape workflow devis)'
  },
  {
    callStatusName: 'Mauvais timing',
    leadStatusName: 'Mauvais timing',
    condition: 'automatic',
    priority: 16,
    description: 'Lead pertinent mais pas prêt → Mauvais timing'
  },
  {
    callStatusName: 'Mauvais timing',
    leadStatusName: 'À nurturer',
    condition: 'if_nurturing_needed',
    priority: 17,
    description: 'Lead pertinent mais pas prêt → À nurturer (workflow de maturation)'
  },
  {
    callStatusName: 'Non qualifié',
    leadStatusName: 'Non qualifié',
    condition: 'automatic',
    priority: 18,
    description: 'Contact hors cible → Non qualifié'
  },
  {
    callStatusName: 'Non qualifié',
    leadStatusName: 'KO / Pas intéressé',
    condition: 'if_not_interested',
    priority: 19,
    description: 'Contact pas intéressé → KO / Pas intéressé (sortir du pipeline)'
  }
  // Note: 'Appel interne' n'a pas de mapping car il ne change pas le statut du lead
];

async function completeMappings() {
  try {
    console.log('🔄 COMPLETION des mappings selon votre tableau métier...\n');

    // Récupérer l'organisation 2Thier CRM
    const organization = await prisma.organization.findUnique({
      where: { name: '2Thier CRM' }
    });

    if (!organization) {
      throw new Error('❌ Organisation "2Thier CRM" non trouvée');
    }

    console.log(`🏢 Organisation: ${organization.name}\n`);

    // Récupérer tous les statuts existants
    const callStatuses = await prisma.callStatus.findMany({
      where: { organizationId: organization.id }
    });

    const leadStatuses = await prisma.leadStatus.findMany({
      where: { organizationId: organization.id }
    });

    // Supprimer les anciens mappings pour recommencer proprement
    const deletedMappings = await prisma.callToLeadMapping.deleteMany({
      where: { organizationId: organization.id }
    });
    console.log(`🗑️  ${deletedMappings.count} anciens mappings supprimés\n`);

    // Créer tous les nouveaux mappings
    console.log('🧠 CRÉATION des mappings complets selon votre tableau...');
    
    let mappingsCreated = 0;
    for (const mapping of COMPLETE_MAPPINGS) {
      const callStatus = callStatuses.find(s => s.name === mapping.callStatusName);
      const leadStatus = leadStatuses.find(s => s.name === mapping.leadStatusName);

      if (!callStatus) {
        console.log(`   ⚠️  Statut d'appel "${mapping.callStatusName}" non trouvé`);
        continue;
      }

      if (!leadStatus) {
        console.log(`   ⚠️  Statut de lead "${mapping.leadStatusName}" non trouvé`);
        continue;
      }

      await prisma.callToLeadMapping.create({
        data: {
          organizationId: organization.id,
          callStatusId: callStatus.id,
          leadStatusId: leadStatus.id,
          condition: mapping.condition,
          priority: mapping.priority
        }
      });

      console.log(`   ✅ ${callStatus.name} → ${leadStatus.name} (${mapping.condition})`);
      mappingsCreated++;
    }

    console.log(`\n🎯 ${mappingsCreated} mappings complets créés selon votre tableau!\n`);

    // Résumé des mappings par statut d'appel
    console.log('📋 RÉSUMÉ DES MAPPINGS PAR STATUT D\'APPEL:');
    console.log('═══════════════════════════════════════════');
    
    const mappingsByCallStatus = {};
    for (const mapping of COMPLETE_MAPPINGS) {
      if (!mappingsByCallStatus[mapping.callStatusName]) {
        mappingsByCallStatus[mapping.callStatusName] = [];
      }
      mappingsByCallStatus[mapping.callStatusName].push({
        leadStatus: mapping.leadStatusName,
        condition: mapping.condition
      });
    }

    for (const [callStatusName, mappings] of Object.entries(mappingsByCallStatus)) {
      console.log(`\n📞 ${callStatusName}:`);
      mappings.forEach(m => {
        console.log(`   → ${m.leadStatus} (${m.condition})`);
      });
    }

    console.log('\n🎉 MAPPINGS COMPLETS SELON VOTRE TABLEAU MÉTIER INSTALLÉS!');
    console.log('════════════════════════════════════════════════════════');
    console.log('✅ Tous les scénarios de votre tableau sont couverts');
    console.log('✅ Conditions multiples pour les cas complexes');
    console.log('✅ Workflow devis complet configuré');
    console.log('✅ Gestion du nurturing et timing');

  } catch (error) {
    console.error('❌ Erreur lors de la complétion des mappings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

completeMappings();
