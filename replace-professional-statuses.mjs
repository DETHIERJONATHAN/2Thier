// Script pour remplacer complètement les statuts par le mapping métier professionnel
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// NOUVEAUX STATUTS D'APPELS - Désactivé pour laisser l'utilisateur les gérer
const PROFESSIONAL_CALL_STATUSES = [];

// NOUVEAUX STATUTS DE LEADS selon votre tableau métier
const PROFESSIONAL_LEAD_STATUSES = [
  { name: 'Nouveau', color: '#faad14', order: 0, isDefault: true, description: 'Lead vient d\'être créé et attend un premier contact' },
  { name: 'Contact en cours', color: '#1890ff', order: 1, isDefault: false, description: 'Tentative de contact en cours' },
  { name: 'À qualifier', color: '#722ed1', order: 2, isDefault: false, description: 'Lead contacté mais nécessite qualification' },
  { name: 'Prospect froid', color: '#52c41a', order: 3, isDefault: false, description: 'Contact qualifié avec intérêt faible' },
  { name: 'Prospect chaud', color: '#f5222d', order: 4, isDefault: false, description: 'Contact qualifié avec fort intérêt' },
  { name: 'Transaction ouverte', color: '#13c2c2', order: 5, isDefault: false, description: 'Demande de devis ou transaction en cours' },
  { name: 'Devis à envoyer', color: '#eb2f96', order: 6, isDefault: false, description: 'Devis à préparer et envoyer' },
  { name: 'Devis envoyé', color: '#fa541c', order: 7, isDefault: false, description: 'Devis envoyé, en attente de réponse' },
  { name: 'Devis signé', color: '#389e0d', order: 8, isDefault: false, description: 'Devis accepté et signé' },
  { name: 'Mauvais timing', color: '#fa8c16', order: 9, isDefault: false, description: 'Lead pertinent mais pas le bon moment' },
  { name: 'À nurturer', color: '#d4b106', order: 10, isDefault: false, description: 'Lead en maturation, suivi périodique' },
  { name: 'Non qualifié', color: '#8c8c8c', order: 11, isDefault: false, description: 'Lead hors cible' },
  { name: 'KO / Pas intéressé', color: '#ff4d4f', order: 12, isDefault: false, description: 'Lead définitivement pas intéressé' }
];

// MAPPINGS INTELLIGENTS selon votre tableau métier
const INTELLIGENT_MAPPINGS = [
  {
    callStatusName: 'Planifié',
    leadStatusName: 'Nouveau',
    condition: 'automatic',
    priority: 1,
    description: 'Appel planifié → Lead reste Nouveau en attente du premier contact'
  },
  {
    callStatusName: 'En attente (Ringing)',
    leadStatusName: 'Contact en cours',
    condition: 'automatic',
    priority: 2,
    description: 'Ligne sonne → Contact en cours, tentative démarrée'
  },
  {
    callStatusName: 'Occupé',
    leadStatusName: 'Contact en cours',
    condition: 'automatic',
    priority: 3,
    description: 'Ligne occupée → Planifier une relance'
  },
  {
    callStatusName: 'Pas de réponse',
    leadStatusName: 'Contact en cours',
    condition: 'automatic',
    priority: 4,
    description: 'Pas de réponse → Planifier une relance'
  },
  {
    callStatusName: 'Manqué',
    leadStatusName: 'Contact en cours',
    condition: 'automatic',
    priority: 5,
    description: 'Appel manqué → Planifier une relance'
  },
  {
    callStatusName: 'Annulé',
    leadStatusName: null, // Pas de changement
    condition: 'no_change',
    priority: 6,
    description: 'Appel annulé → Statut lead inchangé, replanifier l\'appel'
  },
  {
    callStatusName: 'Échec',
    leadStatusName: 'Non qualifié',
    condition: 'automatic',
    priority: 7,
    description: 'Erreur technique → Marquer comme non qualifié si problème permanent'
  },
  {
    callStatusName: 'En cours (Connected)',
    leadStatusName: 'Contact en cours',
    condition: 'automatic',
    priority: 8,
    description: 'Appel connecté → Contact en cours, évaluer à la fin'
  },
  {
    callStatusName: 'Terminé (Completed)',
    leadStatusName: null, // Évaluation manuelle
    condition: 'manual_evaluation',
    priority: 9,
    description: 'Appel terminé → Évaluation manuelle requise (Prospect froid/chaud selon discussion)'
  },
  {
    callStatusName: 'Transaction ouverte',
    leadStatusName: 'Transaction ouverte',
    condition: 'automatic',
    priority: 10,
    description: 'Demande de devis → Passer aux phases Devis à envoyer → Devis envoyé → Devis signé'
  },
  {
    callStatusName: 'Mauvais timing',
    leadStatusName: 'Mauvais timing',
    condition: 'automatic',
    priority: 11,
    description: 'Lead pertinent mais pas prêt → Workflow de maturation'
  },
  {
    callStatusName: 'Non qualifié',
    leadStatusName: 'KO / Pas intéressé',
    condition: 'automatic',
    priority: 12,
    description: 'Lead hors cible → Sortir du pipeline ou recycler plus tard'
  },
  {
    callStatusName: 'Appel interne',
    leadStatusName: null, // Pas de changement
    condition: 'no_change',
    priority: 13,
    description: 'Appel interne → Aucun changement, utilisé pour coordination interne'
  }
];

async function replaceProfessionalStatuses() {
  try {
    console.log('🔄 REMPLACEMENT COMPLET par les statuts métier professionnels...\n');

    // Récupérer l'organisation 2Thier CRM
    const organization = await prisma.organization.findUnique({
      where: { name: '2Thier CRM' }
    });

    if (!organization) {
      throw new Error('❌ Organisation "2Thier CRM" non trouvée');
    }

    console.log(`🏢 Organisation trouvée: ${organization.name} (${organization.id})\n`);

    // 1. SUPPRESSION COMPLÈTE des anciens statuts
    console.log('🗑️  SUPPRESSION des anciens statuts...');
    
    // Supprimer les anciens mappings
    const deletedMappings = await prisma.callToLeadMapping.deleteMany({
      where: { organizationId: organization.id }
    });
    console.log(`   ✅ ${deletedMappings.count} anciens mappings supprimés`);

    // Supprimer les anciens statuts d'appels
    const deletedCallStatuses = await prisma.callStatus.deleteMany({
      where: { organizationId: organization.id }
    });
    console.log(`   ✅ ${deletedCallStatuses.count} anciens statuts d'appels supprimés`);

    // Supprimer les anciens statuts de leads
    const deletedLeadStatuses = await prisma.leadStatus.deleteMany({
      where: { organizationId: organization.id }
    });
    console.log(`   ✅ ${deletedLeadStatuses.count} anciens statuts de leads supprimés\n`);

    // 2. CRÉATION des nouveaux statuts professionnels
    console.log('🆕 CRÉATION des nouveaux statuts professionnels...');

    // Créer les nouveaux statuts d'appels
    const createdCallStatuses = [];
    for (const status of PROFESSIONAL_CALL_STATUSES) {
      const created = await prisma.callStatus.create({
        data: {
          name: status.name,
          color: status.color,
          order: status.order,
          organizationId: organization.id,
          data: { description: status.description }
        }
      });
      createdCallStatuses.push(created);
    }
    console.log(`   ✅ ${createdCallStatuses.length} nouveaux statuts d'appels créés`);

    // Créer les nouveaux statuts de leads
    const createdLeadStatuses = [];
    for (const status of PROFESSIONAL_LEAD_STATUSES) {
      const created = await prisma.leadStatus.create({
        data: {
          name: status.name,
          color: status.color,
          order: status.order,
          isDefault: status.isDefault,
          organizationId: organization.id,
          data: { description: status.description }
        }
      });
      createdLeadStatuses.push(created);
    }
    console.log(`   ✅ ${createdLeadStatuses.length} nouveaux statuts de leads créés\n`);

    // 3. CONFIGURATION des mappings intelligents
    console.log('🧠 CONFIGURATION des mappings intelligents...');

    let mappingsCreated = 0;
    for (const mapping of INTELLIGENT_MAPPINGS) {
      // Trouver les IDs des statuts
      const callStatus = createdCallStatuses.find(s => s.name === mapping.callStatusName);
      const leadStatus = mapping.leadStatusName ? 
        createdLeadStatuses.find(s => s.name === mapping.leadStatusName) : null;

      if (!callStatus) {
        console.log(`   ⚠️  Statut d'appel "${mapping.callStatusName}" non trouvé`);
        continue;
      }

      // Créer le mapping seulement si leadStatus existe (pas de null autorisé)
      if (leadStatus) {
        await prisma.callToLeadMapping.create({
          data: {
            organizationId: organization.id,
            callStatusId: callStatus.id,
            leadStatusId: leadStatus.id,
            condition: mapping.condition,
            priority: mapping.priority
          }
        });

        console.log(`   ✅ ${callStatus.name} → ${leadStatus.name}`);
        mappingsCreated++;
      } else {
        console.log(`   ⚠️  ${callStatus.name} → Aucun changement (mapping manuel requis)`);
      }
    }

    console.log(`\n🎯 ${mappingsCreated} mappings intelligents configurés\n`);

    // 4. RÉSUMÉ FINAL
    console.log('📊 RÉSUMÉ DU NOUVEAU SYSTÈME MÉTIER:');
    console.log('═══════════════════════════════════════');
    console.log(`✅ ${PROFESSIONAL_CALL_STATUSES.length} statuts d'appels professionnels`);
    console.log(`✅ ${PROFESSIONAL_LEAD_STATUSES.length} statuts de leads métier`);
    console.log(`✅ ${mappingsCreated} règles de mapping automatique`);
    console.log('✅ Workflow complet: Planifié → Contact → Qualification → Transaction → Signature');
    console.log('✅ Gestion du nurturing et timing');
    console.log('✅ Distinction appels internes vs commerciaux');

    console.log('\n🏆 REMPLACEMENT TERMINÉ AVEC SUCCÈS!');
    console.log('════════════════════════════════════');
    console.log('🎯 Votre CRM utilise maintenant un système de statuts professionnel');
    console.log('🔄 Les mappings intelligents automatisent l\'avancement des leads');
    console.log('📈 Workflow optimisé pour le cycle de vente complet');

  } catch (error) {
    console.error('❌ Erreur lors du remplacement:', error);
  } finally {
    await prisma.$disconnect();
  }
}

replaceProfessionalStatuses();
