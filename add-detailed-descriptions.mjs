// Script pour ajouter les descriptions détaillées selon le tableau métier
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Descriptions détaillées pour STATUTS D'APPELS selon votre tableau métier
const CALL_STATUS_DESCRIPTIONS = {
  'Planifié': 'Appel à venir, tâche à réaliser. Le contact sera appelé selon la planification.',
  'En attente (Ringing)': 'La ligne sonne ou l\'appel est en file d\'attente. Tentative de contact en cours.',
  'Occupé': 'Ligne occupée. Le contact était indisponible, une relance sera nécessaire.',
  'Pas de réponse': 'Aucun décroché après sonnerie. Contact pas disponible, planifier une relance.',
  'Manqué': 'Appel manqué par le contact. Tentative non aboutie, relance recommandée.',
  'Annulé': 'Appel interrompu avant connexion. L\'appel doit être replanifié.',
  'Échec': 'Erreur technique (numéro invalide, problème réseau). Contact potentiellement injoignable.',
  'En cours (Connected)': 'Appel en cours ou conversation en direct. Communication établie avec le contact.',
  'Terminé (Completed)': 'Appel abouti, conversation terminée. Le contact a été joint et échangé.',
  'Transaction ouverte': 'L\'appel a conduit à une demande de devis. Le contact est intéressé par une offre commerciale.',
  'Mauvais timing': 'Le contact est pertinent mais pas prêt actuellement. Timing à revoir plus tard.',
  'Non qualifié': 'Contact hors cible ou pas intéressé. Lead ne correspond pas aux critères.',
  'Appel interne': 'Appel entre collègues, non lié à un lead. Coordination interne ou support.'
};

// Descriptions détaillées pour STATUTS DE LEADS selon votre tableau métier
const LEAD_STATUS_DESCRIPTIONS = {
  'Nouveau': 'Lead vient d\'être créé et attend un premier contact. Aucune tentative d\'approche encore effectuée.',
  'Contact en cours': 'Tentative de contact en cours. Des efforts sont déployés pour joindre le lead sans succès définitif encore.',
  'À qualifier': 'Lead contacté mais nécessite qualification approfondie. Évaluation du niveau d\'intérêt et des besoins en cours.',
  'Prospect froid': 'Contact qualifié avec intérêt faible ou distant. Potentiel existant mais pas immédiat.',
  'Prospect chaud': 'Contact qualifié avec fort intérêt manifesté. Forte probabilité de conversion à court terme.',
  'Transaction ouverte': 'Demande de devis ou transaction commerciale en cours. Processus de vente activement engagé.',
  'Devis à envoyer': 'Devis à préparer et envoyer suite à une demande. Étape de formalisation de l\'offre.',
  'Devis envoyé': 'Devis envoyé, en attente de réponse du prospect. Phase de négociation et validation.',
  'Devis signé': 'Devis accepté et signé par le client. Transaction finalisée avec succès.',
  'Mauvais timing': 'Lead pertinent mais pas le bon moment pour lui. Situation à réévaluer plus tard.',
  'À nurturer': 'Lead en maturation nécessitant un suivi périodique. Développement de la relation sur le long terme.',
  'Non qualifié': 'Lead hors cible ou critères non remplis. Contact ne correspondant pas au profil recherché.',
  'KO / Pas intéressé': 'Lead définitivement pas intéressé ou refus catégorique. Fin du processus commercial.'
};

async function addDetailedDescriptions() {
  try {
    console.log('📝 AJOUT DES DESCRIPTIONS DÉTAILLÉES selon votre tableau métier...\n');

    // Récupérer l'organisation 2Thier CRM
    const organization = await prisma.organization.findUnique({
      where: { name: '2Thier CRM' }
    });

    if (!organization) {
      throw new Error('❌ Organisation "2Thier CRM" non trouvée');
    }

    console.log(`🏢 Organisation: ${organization.name}\n`);

    // 1. MISE À JOUR DES DESCRIPTIONS POUR LES STATUTS D'APPELS
    console.log('📞 MISE À JOUR des descriptions des statuts d\'appels...');
    
    const callStatuses = await prisma.callStatus.findMany({
      where: { organizationId: organization.id }
    });

    let updatedCallStatuses = 0;
    for (const status of callStatuses) {
      const description = CALL_STATUS_DESCRIPTIONS[status.name];
      if (description) {
        await prisma.callStatus.update({
          where: { id: status.id },
          data: { description: description }
        });
        console.log(`   ✅ ${status.name}: "${description}"`);
        updatedCallStatuses++;
      } else {
        console.log(`   ⚠️  Description manquante pour: ${status.name}`);
      }
    }

    console.log(`\n🎯 ${updatedCallStatuses} descriptions d'appels mises à jour\n`);

    // 2. MISE À JOUR DES DESCRIPTIONS POUR LES STATUTS DE LEADS
    console.log('👥 MISE À JOUR des descriptions des statuts de leads...');
    
    const leadStatuses = await prisma.leadStatus.findMany({
      where: { organizationId: organization.id }
    });

    let updatedLeadStatuses = 0;
    for (const status of leadStatuses) {
      const description = LEAD_STATUS_DESCRIPTIONS[status.name];
      if (description) {
        await prisma.leadStatus.update({
          where: { id: status.id },
          data: { description: description }
        });
        console.log(`   ✅ ${status.name}: "${description}"`);
        updatedLeadStatuses++;
      } else {
        console.log(`   ⚠️  Description manquante pour: ${status.name}`);
      }
    }

    console.log(`\n🎯 ${updatedLeadStatuses} descriptions de leads mises à jour\n`);

    // 3. RÉSUMÉ FINAL
    console.log('📊 RÉSUMÉ DES INFO-BULLES MÉTIER:');
    console.log('═══════════════════════════════════');
    console.log(`✅ ${updatedCallStatuses} statuts d'appels avec descriptions détaillées`);
    console.log(`✅ ${updatedLeadStatuses} statuts de leads avec descriptions métier`);
    console.log('✅ Info-bulles disponibles pour l\'interface utilisateur');
    console.log('✅ Définitions selon votre tableau de référence métier');

    console.log('\n🎨 UTILISATION DANS L\'INTERFACE:');
    console.log('════════════════════════════════');
    console.log('💡 Utilisez le champ "description" pour les info-bulles (tooltips)');
    console.log('📝 Chaque statut a maintenant sa définition métier complète');
    console.log('🎯 Facilite la compréhension et l\'utilisation par les équipes');

  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout des descriptions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addDetailedDescriptions();
