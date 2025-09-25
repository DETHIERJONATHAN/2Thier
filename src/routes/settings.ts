import { Router } from 'express';
import { authenticateToken, isAdmin, extractOrganization } from '../middleware/auth';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../prisma.js';

const settingsRouter = Router();

// Appliquer les middlewares à toutes les routes de ce fichier
settingsRouter.use(authenticateToken, extractOrganization, isAdmin);

// Obtenir tous les statuts de lead pour une organisation
settingsRouter.get('/lead-statuses', async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(400).json({ error: "L'ID de l'organisation est requis" });
    }

    // Vérifier si des statuts existent déjà dans la base de données
    let leadStatuses = await prisma.leadStatus.findMany({
      where: { organizationId },
      orderBy: { order: 'asc' }
    });

    // Si aucun statut n'existe, créer les statuts par défaut
    if (leadStatuses.length === 0) {
      const defaultStatuses = [
        {
          name: 'Nouveau',
          color: '#52c41a',
          order: 0,
          organizationId
        },
        {
          name: 'En cours',
          color: '#1890ff',
          order: 1,
          organizationId
        },
        {
          name: 'Fermé',
          color: '#f5222d',
          order: 2,
          organizationId
        }
      ];

      // Créer les statuts par défaut dans la base de données
      await prisma.leadStatus.createMany({
        data: defaultStatuses
      });

      // Récupérer les statuts nouvellement créés
      leadStatuses = await prisma.leadStatus.findMany({
        where: { organizationId },
        orderBy: { order: 'asc' }
      });
    }

    res.json(leadStatuses);
  } catch (error) {
    console.error('Erreur lors de la récupération des statuts de lead:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Mettre à jour l'ordre des statuts de lead
settingsRouter.post('/lead-statuses/reorder', async (req: AuthenticatedRequest, res) => {
  const { statuses } = req.body; // Ex: [{ id: 'uuid1', order: 0 }, { id: 'uuid2', order: 1 }]

  try {
    await Promise.all(
      statuses.map((status: { id: string; order: number }) =>
        prisma.leadStatus.update({
          where: { id: status.id },
          data: { order: status.order },
        })
      )
    );
    res.status(204).send();
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'ordre des statuts de lead:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Ajouter un nouveau statut de lead
settingsRouter.post('/lead-statuses', async (req: AuthenticatedRequest, res) => {
  const { name, color } = req.body;
  const organizationId = req.user?.organizationId;

  try {
    const newStatus = await prisma.leadStatus.create({
      data: {
        name,
        color,
        organizationId,
        order: 0, // Par défaut, l'ordre est 0
      },
    });
    res.status(201).json(newStatus);
  } catch (error) {
    console.error('Erreur lors de l\'ajout d\'un nouveau statut de lead:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Mettre à jour un statut de lead
settingsRouter.put('/lead-statuses/:id', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { name, color } = req.body;

  try {
    const updatedStatus = await prisma.leadStatus.update({
      where: { id },
      data: { name, color },
    });
    res.json(updatedStatus);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut de lead:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Supprimer un statut de lead
settingsRouter.delete('/lead-statuses/:id', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const organizationId = req.user?.organizationId;

  try {
    await prisma.leadStatus.deleteMany({
      where: {
        id,
        organizationId,
      },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Erreur lors de la suppression du statut de lead:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// ================================
// ROUTES POUR LES STATUTS D'APPELS
// ================================

// Obtenir tous les statuts d'appels pour une organisation
settingsRouter.get('/call-statuses', async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(400).json({ error: "L'ID de l'organisation est requis" });
    }

    // Vérifier si des statuts existent déjà dans la base de données
    const callStatuses = await prisma.callStatus.findMany({
      where: { organizationId },
      orderBy: { order: 'asc' }
    });

    // Ne pas créer de statuts par défaut
    if (callStatuses.length === 0) {
      console.log('[INFO] Aucun statut d\'appel trouvé pour l\'organisation');
    }

    res.json(callStatuses);
  } catch (error) {
    console.error('Erreur lors de la récupération des statuts d\'appels:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Sauvegarder tous les statuts d'appels (utilisé par LeadsSettingsPage)
settingsRouter.post('/call-statuses', async (req: AuthenticatedRequest, res) => {
  try {
    const { statuses } = req.body;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: "L'ID de l'organisation est requis" });
    }

    if (!Array.isArray(statuses)) {
      return res.status(400).json({ error: "Les statuts doivent être un tableau" });
    }

    // Supprimer tous les statuts existants pour cette organisation
    await prisma.callStatus.deleteMany({
      where: { organizationId }
    });

    // Recréer les statuts avec les nouvelles données
    if (statuses.length > 0) {
      const statusesToCreate = statuses.map((status, index) => ({
        name: status.name,
        color: status.color,
        order: index,
        organizationId
      }));

      await prisma.callStatus.createMany({
        data: statusesToCreate
      });
    }

    // Récupérer les statuts nouvellement créés
    const updatedStatuses = await prisma.callStatus.findMany({
      where: { organizationId },
      orderBy: { order: 'asc' }
    });

    res.status(201).json(updatedStatuses);
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des statuts d\'appels:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Mettre à jour l'ordre des statuts d'appels
settingsRouter.post('/call-statuses/reorder', async (req: AuthenticatedRequest, res) => {
  const { statuses } = req.body; // Ex: [{ id: 'uuid1', order: 0 }, { id: 'uuid2', order: 1 }]

  try {
    await Promise.all(
      statuses.map((status: { id: string; order: number }) =>
        prisma.callStatus.update({
          where: { id: status.id },
          data: { order: status.order },
        })
      )
    );
    res.status(204).send();
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'ordre des statuts d\'appels:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Mettre à jour l'ordre des statuts d'appels (PUT alias)
settingsRouter.put('/call-statuses/reorder', async (req: AuthenticatedRequest, res) => {
  const { statuses } = req.body; // Ex: [{ id: 'uuid1', order: 0 }, { id: 'uuid2', order: 1 }]

  try {
    await Promise.all(
      statuses.map((status: { id: string; order: number }) =>
        prisma.callStatus.update({
          where: { id: status.id },
          data: { order: status.order },
        })
      )
    );
    res.status(200).json({ success: true, message: 'Ordre mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'ordre des statuts d\'appels:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Ajouter un nouveau statut d'appel
settingsRouter.post('/call-statuses/add', async (req: AuthenticatedRequest, res) => {
  const { name, color } = req.body;
  const organizationId = req.user?.organizationId;

  try {
    const newStatus = await prisma.callStatus.create({
      data: {
        name,
        color,
        organizationId,
        order: 0, // Par défaut, l'ordre est 0
      },
    });
    res.status(201).json(newStatus);
  } catch (error) {
    console.error('Erreur lors de l\'ajout d\'un nouveau statut d\'appel:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Mettre à jour un statut d'appel
settingsRouter.put('/call-statuses/:id', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { name, color } = req.body;

  try {
    const updatedStatus = await prisma.callStatus.update({
      where: { id },
      data: { name, color },
    });
    res.json(updatedStatus);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut d\'appel:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Supprimer un statut d'appel
settingsRouter.delete('/call-statuses/:id', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const organizationId = req.user?.organizationId;

  try {
    await prisma.callStatus.deleteMany({
      where: {
        id,
        organizationId,
      },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Erreur lors de la suppression du statut d\'appel:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// 🚀 Initialiser les statuts par défaut selon le cahier des charges
settingsRouter.post('/initialize-default-statuses', async (req: AuthenticatedRequest, res) => {
  const organizationId = req.user?.organizationId;
  
  if (!organizationId) {
    return res.status(400).json({ error: "L'ID de l'organisation est requis" });
  }

  try {
    console.log('🚀 Initialisation des statuts par défaut pour l\'organisation:', organizationId);

    // 1) Statuts d'appel par défaut (13 statuts selon cahier des charges)
    const defaultCallStatuses = [
      { name: "📞 Pas de réponse", description: "Le client n'a pas décroché", color: "#f39c12", icon: "📞", order: 1 },
      { name: "📞 Numéro incorrect / injoignable", description: "Numéro invalide ou injoignable", color: "#e74c3c", icon: "📞", order: 2 },
      { name: "📞 Rappel programmé", description: "Rappel planifié avec le client", color: "#3498db", icon: "📞", order: 3 },
      { name: "📞 Contacté – Pas intéressé", description: "Client contacté mais pas intéressé", color: "#e67e22", icon: "📞", order: 4 },
      { name: "📞 Contacté – À rappeler plus tard", description: "Client demande à être rappelé plus tard", color: "#f1c40f", icon: "📞", order: 5 },
      { name: "📞 Contacté – Information envoyée (mail/sms)", description: "Informations envoyées au client", color: "#9b59b6", icon: "📞", order: 6 },
      { name: "📞 Contacté – Rendez-vous fixé", description: "RDV fixé avec le client", color: "#2ecc71", icon: "📞", order: 7 },
      { name: "📞 Contacté – Refus (non direct à l'appel)", description: "Refus lors de l'appel", color: "#c0392b", icon: "📞", order: 8 },
      { name: "📞 Contacté – Refus ferme (après devis/visite)", description: "Refus définitif après devis/visite", color: "#8e44ad", icon: "📞", order: 9 },
      { name: "📞 Contacté – Devis demandé", description: "Client demande un devis", color: "#16a085", icon: "📞", order: 10 },
      { name: "📞 Contacté – Devis envoyé", description: "Devis envoyé au client", color: "#27ae60", icon: "📞", order: 11 },
      { name: "📞 Contacté – En négociation", description: "Négociation en cours", color: "#f39c12", icon: "📞", order: 12 },
      { name: "📞 Contacté – Gagné (vente conclue)", description: "Vente finalisée", color: "#2ecc71", icon: "📞", order: 13 }
    ];

    // 2) Statuts de leads par défaut (13 statuts selon cahier des charges)
    const defaultLeadStatuses = [
      { name: "🟢 Nouveau lead", description: "Lead nouvellement créé", color: "#2ecc71", order: 1 },
      { name: "🟡 Contacter (dès le 1er appel tenté)", description: "À contacter dès le premier appel", color: "#f1c40f", order: 2 },
      { name: "🟡 En attente de rappel (si convenu avec le client)", description: "Rappel convenu avec le client", color: "#f39c12", order: 3 },
      { name: "🟡 Information envoyée", description: "Informations envoyées au client", color: "#f1c40f", order: 4 },
      { name: "🟠 Devis en préparation", description: "Devis en cours de préparation", color: "#e67e22", order: 5 },
      { name: "🟠 Devis envoyé", description: "Devis envoyé au client", color: "#d35400", order: 6 },
      { name: "🟠 En négociation", description: "Négociation en cours", color: "#e74c3c", order: 7 },
      { name: "🎯 Ciblé (objectif client)", description: "Client ciblé comme objectif", color: "#9b59b6", order: 8 },
      { name: "🟣 Non traité dans le délai (auto)", description: "Non traité automatiquement", color: "#8e44ad", order: 9 },
      { name: "🔴 Perdu (après visite/devis non signé, ou auto via SLA)", description: "Lead perdu", color: "#c0392b", order: 10 },
      { name: "❌ Refusé (non direct / pas intéressé)", description: "Refus direct", color: "#e74c3c", order: 11 },
      { name: "🟢 Gagné", description: "Lead gagné", color: "#27ae60", order: 12 },
      { name: "⚫ Injoignable / Archivé", description: "Lead injoignable ou archivé", color: "#34495e", order: 13 }
    ];

    // Créer les statuts d'appel
    for (const status of defaultCallStatuses) {
      try {
        await prisma.callStatus.upsert({
          where: { 
            organizationId_name: { 
              organizationId, 
              name: status.name 
            } 
          },
          update: {}, // Ne pas modifier si existe déjà
          create: {
            ...status,
            organizationId,
            isActive: true,
            isDefault: false
          }
        });
        console.log(`✅ Statut d'appel créé: ${status.name}`);
      } catch {
        console.log(`⚠️ Statut d'appel existe déjà: ${status.name}`);
      }
    }

    // Créer les statuts de leads
    for (const status of defaultLeadStatuses) {
      try {
        await prisma.leadStatus.upsert({
          where: { 
            organizationId_name: { 
              organizationId, 
              name: status.name 
            } 
          },
          update: {}, // Ne pas modifier si existe déjà
          create: {
            ...status,
            organizationId,
            isDefault: false
          }
        });
        console.log(`✅ Statut de lead créé: ${status.name}`);
      } catch {
        console.log(`⚠️ Statut de lead existe déjà: ${status.name}`);
      }
    }

    // 3) Créer les mappings par défaut
    const mappings = [
      { callStatusName: "📞 Pas de réponse", leadStatusName: "🟡 Contacter (dès le 1er appel tenté)" },
      { callStatusName: "📞 Numéro incorrect / injoignable", leadStatusName: "⚫ Injoignable / Archivé" },
      { callStatusName: "📞 Rappel programmé", leadStatusName: "🟡 En attente de rappel (si convenu avec le client)" },
      { callStatusName: "📞 Contacté – Pas intéressé", leadStatusName: "❌ Refusé (non direct / pas intéressé)" },
      { callStatusName: "📞 Contacté – Refus (non direct à l'appel)", leadStatusName: "❌ Refusé (non direct / pas intéressé)" },
      { callStatusName: "📞 Contacté – Refus ferme (après devis/visite)", leadStatusName: "🔴 Perdu (après visite/devis non signé, ou auto via SLA)" },
      { callStatusName: "📞 Contacté – À rappeler plus tard", leadStatusName: "🟡 En attente de rappel (si convenu avec le client)" },
      { callStatusName: "📞 Contacté – Information envoyée (mail/sms)", leadStatusName: "🟡 Information envoyée" },
      { callStatusName: "📞 Contacté – Rendez-vous fixé", leadStatusName: "🎯 Ciblé (objectif client)" },
      { callStatusName: "📞 Contacté – Devis demandé", leadStatusName: "🟠 Devis en préparation" },
      { callStatusName: "📞 Contacté – Devis envoyé", leadStatusName: "🟠 Devis envoyé" },
      { callStatusName: "📞 Contacté – En négociation", leadStatusName: "🟠 En négociation" },
      { callStatusName: "📞 Contacté – Gagné (vente conclue)", leadStatusName: "🟢 Gagné" }
    ];

    // Récupérer les statuts créés pour les mappings
    const callStatuses = await prisma.callStatus.findMany({ where: { organizationId } });
    const leadStatuses = await prisma.leadStatus.findMany({ where: { organizationId } });

    // Créer les mappings
    for (const mapping of mappings) {
      const callStatus = callStatuses.find(cs => cs.name === mapping.callStatusName);
      const leadStatus = leadStatuses.find(ls => ls.name === mapping.leadStatusName);
      
      if (callStatus && leadStatus) {
        try {
          await prisma.callToLeadMapping.upsert({
            where: {
              organizationId_callStatusId_leadStatusId: {
                organizationId,
                callStatusId: callStatus.id,
                leadStatusId: leadStatus.id
              }
            },
            update: {},
            create: {
              organizationId,
              callStatusId: callStatus.id,
              leadStatusId: leadStatus.id,
              condition: "automatic",
              priority: 1,
              description: `Mapping automatique: ${mapping.callStatusName} → ${mapping.leadStatusName}`,
              isActive: true
            }
          });
          console.log(`✅ Mapping créé: ${mapping.callStatusName} → ${mapping.leadStatusName}`);
        } catch {
          console.log(`⚠️ Mapping existe déjà: ${mapping.callStatusName} → ${mapping.leadStatusName}`);
        }
      }
    }

    res.json({ 
      success: true, 
      message: 'Statuts par défaut initialisés avec succès !',
      details: {
        callStatuses: defaultCallStatuses.length,
        leadStatuses: defaultLeadStatuses.length,
        mappings: mappings.length
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation des statuts:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'initialisation des statuts',
      details: error.message 
    });
  }
});

export default settingsRouter;
