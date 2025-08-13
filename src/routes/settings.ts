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

export default settingsRouter;
