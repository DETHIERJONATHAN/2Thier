import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function populateDatabase() {
  try {
    console.log('🚀 Remplissage de la base de données...\n');

    // Obtenir toutes les organisations
    const organizations = await prisma.organization.findMany();
    console.log(`📊 ${organizations.length} organisation(s) trouvée(s)\n`);

    if (organizations.length === 0) {
      console.log('❌ Aucune organisation trouvée !');
      return;
    }

    for (const org of organizations) {
      console.log(`🏢 Traitement organisation: ${org.name} (${org.id})`);

      // 1) Statuts d'appel (commercial)
      const callStatuses = [
        { name: "📞 Pas de réponse", description: "Le client n'a pas décroché", color: "#f39c12", order: 1 },
        { name: "📞 Numéro incorrect / injoignable", description: "Numéro invalide ou injoignable", color: "#e74c3c", order: 2 },
        { name: "📞 Rappel programmé", description: "Rappel planifié avec le client", color: "#3498db", order: 3 },
        { name: "📞 Contacté – Pas intéressé", description: "Client contacté mais pas intéressé", color: "#e67e22", order: 4 },
        { name: "📞 Contacté – À rappeler plus tard", description: "Client demande à être rappelé plus tard", color: "#f1c40f", order: 5 },
        { name: "📞 Contacté – Information envoyée (mail/sms)", description: "Informations envoyées au client", color: "#9b59b6", order: 6 },
        { name: "📞 Contacté – Rendez-vous fixé", description: "RDV fixé avec le client", color: "#2ecc71", order: 7 },
        { name: "📞 Contacté – Refus (non direct à l'appel)", description: "Refus lors de l'appel", color: "#c0392b", order: 8 },
        { name: "📞 Contacté – Refus ferme (après devis/visite)", description: "Refus définitif après devis/visite", color: "#8e44ad", order: 9 },
        { name: "📞 Contacté – Devis demandé", description: "Client demande un devis", color: "#16a085", order: 10 },
        { name: "📞 Contacté – Devis envoyé", description: "Devis envoyé au client", color: "#27ae60", order: 11 },
        { name: "📞 Contacté – En négociation", description: "Négociation en cours", color: "#f39c12", order: 12 },
        { name: "📞 Contacté – Gagné (vente conclue)", description: "Vente finalisée", color: "#2ecc71", order: 13 }
      ];

      // 2) Statuts du lead / pipeline
      const leadStatuses = [
        { name: "🟢 Nouveau lead", color: "#2ecc71", order: 1 },
        { name: "🟡 Contacter (dès le 1er appel tenté)", color: "#f1c40f", order: 2 },
        { name: "🟡 En attente de rappel (si convenu avec le client)", color: "#f39c12", order: 3 },
        { name: "🟡 Information envoyée", color: "#f1c40f", order: 4 },
        { name: "🟠 Devis en préparation", color: "#e67e22", order: 5 },
        { name: "🟠 Devis envoyé", color: "#d35400", order: 6 },
        { name: "🟠 En négociation", color: "#e74c3c", order: 7 },
        { name: "🎯 Ciblé (objectif client)", color: "#9b59b6", order: 8 },
        { name: "🟣 Non traité dans le délai (auto)", color: "#8e44ad", order: 9 },
        { name: "🔴 Perdu (après visite/devis non signé, ou auto via SLA)", color: "#c0392b", order: 10 },
        { name: "❌ Refusé (non direct / pas intéressé)", color: "#e74c3c", order: 11 },
        { name: "🟢 Gagné", color: "#27ae60", order: 12 },
        { name: "⚫ Injoignable / Archivé", color: "#34495e", order: 13 }
      ];

      // Créer les statuts d'appel avec createMany pour plus de simplicité
      console.log('📞 Création des statuts d\'appel...');
      const callStatusesToCreate = callStatuses.map(status => ({
        ...status,
        organizationId: org.id,
        isActive: true,
        isDefault: false,
        id: `call-${org.id}-${status.order}`, // ID unique
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await prisma.callStatus.createMany({
        data: callStatusesToCreate,
        skipDuplicates: true
      });
      console.log(`✅ ${callStatusesToCreate.length} statuts d'appel créés`);

      // Créer les statuts de leads
      console.log('📊 Création des statuts de leads...');
      const leadStatusesToCreate = leadStatuses.map(status => ({
        ...status,
        organizationId: org.id,
        isDefault: false,
        id: `lead-${org.id}-${status.order}`, // ID unique
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await prisma.leadStatus.createMany({
        data: leadStatusesToCreate,
        skipDuplicates: true
      });
      console.log(`✅ ${leadStatusesToCreate.length} statuts de leads créés`);

      // Récupérer les statuts créés pour les mappings
      const createdCallStatuses = await prisma.callStatus.findMany({
        where: { organizationId: org.id }
      });
      const createdLeadStatuses = await prisma.leadStatus.findMany({
        where: { organizationId: org.id }
      });

      // 3) Créer les mappings
      console.log('🔗 Création des mappings...');
      const mappingsData = [
        { callStatusName: "📞 Pas de réponse", leadStatusName: "🟡 Contacter (dès le 1er appel tenté)" },
        { callStatusName: "📞 Numéro incorrect / injoignable", leadStatusName: "⚫ Injoignable / Archivé" },
        { callStatusName: "📞 Rappel programmé", leadStatusName: "🟡 En attente de rappel (si convenu avec le client)" },
        { callStatusName: "📞 Contacté – Pas intéressé", leadStatusName: "❌ Refusé (non direct / pas intéressé)" },
        { callStatusName: "📞 Contacté – À rappeler plus tard", leadStatusName: "🟡 En attente de rappel (si convenu avec le client)" },
        { callStatusName: "📞 Contacté – Information envoyée (mail/sms)", leadStatusName: "🟡 Information envoyée" },
        { callStatusName: "📞 Contacté – Rendez-vous fixé", leadStatusName: "🎯 Ciblé (objectif client)" },
        { callStatusName: "📞 Contacté – Refus (non direct à l'appel)", leadStatusName: "❌ Refusé (non direct / pas intéressé)" },
        { callStatusName: "📞 Contacté – Refus ferme (après devis/visite)", leadStatusName: "🔴 Perdu (après visite/devis non signé, ou auto via SLA)" },
        { callStatusName: "📞 Contacté – Devis demandé", leadStatusName: "🟠 Devis en préparation" },
        { callStatusName: "📞 Contacté – Devis envoyé", leadStatusName: "🟠 Devis envoyé" },
        { callStatusName: "📞 Contacté – En négociation", leadStatusName: "🟠 En négociation" },
        { callStatusName: "📞 Contacté – Gagné (vente conclue)", leadStatusName: "🟢 Gagné" }
      ];

      const mappingsToCreate = [];
      for (const mapping of mappingsData) {
        const callStatus = createdCallStatuses.find(cs => cs.name === mapping.callStatusName);
        const leadStatus = createdLeadStatuses.find(ls => ls.name === mapping.leadStatusName);
        
        if (callStatus && leadStatus) {
          mappingsToCreate.push({
            id: `mapping-${org.id}-${callStatus.order}-${leadStatus.order}`,
            organizationId: org.id,
            callStatusId: callStatus.id,
            leadStatusId: leadStatus.id,
            condition: "automatic",
            priority: 1,
            description: `${mapping.callStatusName} → ${mapping.leadStatusName}`,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }

      await prisma.callToLeadMapping.createMany({
        data: mappingsToCreate,
        skipDuplicates: true
      });
      console.log(`✅ ${mappingsToCreate.length} mappings créés`);

      console.log(`✅ Organisation ${org.name} terminée !\n`);
    }

    console.log('🎉 Remplissage terminé avec succès !');

  } catch (error) {
    console.error('❌ ERREUR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateDatabase();