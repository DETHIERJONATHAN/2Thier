import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import type { Response } from 'express';

const router = Router();
const prisma = new PrismaClient();

// Interface pour les participants
interface ParticipantInput {
  role: string;
  userId?: string;
  clientId?: string;
}

// GET /api/calendar/events - Récupérer les événements du calendrier
router.get('/events', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { organizationId, userId } = req.user!;
    const { 
      startDate, 
      endDate, 
      type, 
      status,
      participantId,
      view = 'all' // 'own', 'organization', 'all'
    } = req.query;

    const whereClause: Record<string, unknown> = {};

    // Filtrage par organisation (multi-société)
    if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    // Filtrage par dates
    if (startDate || endDate) {
      whereClause.startDate = {};
      if (startDate) {
        (whereClause.startDate as Record<string, unknown>).gte = new Date(startDate as string);
      }
      if (endDate) {
        (whereClause.startDate as Record<string, unknown>).lte = new Date(endDate as string);
      }
    }

    // Filtrage par type d'événement
    if (type) {
      whereClause.type = type;
    }

    // Filtrage par statut
    if (status) {
      whereClause.status = status;
    }

    // Filtrage par vue
    if (view === 'own') {
      whereClause.ownerId = userId;
    } else if (view === 'organization') {
      // Tous les événements de l'organisation sont déjà filtrés par organizationId
    }

    // Filtrage par participant
    if (participantId) {
      whereClause.participants = {
        some: {
          OR: [
            { userId: participantId },
            { clientId: participantId }
          ]
        }
      };
    }

    const events = await prisma.calendarEvent.findMany({
      where: whereClause,
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        organization: {
          select: { id: true, name: true }
        },
        participants: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true }
            },
            client: {
              select: { id: true, data: true } // Les infos client sont dans data (JSON)
            }
          }
        }
      },
      orderBy: { startDate: 'asc' }
    });

    res.json(events);
  } catch (error) {
    console.error('[Calendar API] Erreur lors de la récupération des événements:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des événements' });
  }
});

// POST /api/calendar/events - Créer un nouvel événement
router.post('/events', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { organizationId, userId } = req.user!;
    const {
      title,
      description,
      startDate,
      endDate,
      allDay,
      type,
      status = 'confirmé',
      notes,
      location,
      participants = []
    } = req.body;

    // Validation des données requises
    if (!title || !startDate) {
      return res.status(400).json({ error: 'Le titre et la date de début sont requis' });
    }

    // Créer l'événement
    const event = await prisma.calendarEvent.create({
      data: {
        title,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        allDay: allDay || false,
        type,
        status,
        notes,
        location,
        organizationId,
        ownerId: userId
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        organization: {
          select: { id: true, name: true }
        }
      }
    });

    // Ajouter les participants si fournis
    if (participants.length > 0) {
      const participantData = participants.map((p: ParticipantInput) => ({
        eventId: event.id,
        role: p.role,
        userId: p.userId || null,
        clientId: p.clientId || null
      }));

      await prisma.calendarParticipant.createMany({
        data: participantData
      });
    }

    // Récupérer l'événement complet avec les participants
    const fullEvent = await prisma.calendarEvent.findUnique({
      where: { id: event.id },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        organization: {
          select: { id: true, name: true }
        },
        participants: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true }
            },
            client: {
              select: { id: true, data: true }
            }
          }
        }
      }
    });

    res.status(201).json(fullEvent);
  } catch (error) {
    console.error('[Calendar API] Erreur lors de la création de l\'événement:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création de l\'événement' });
  }
});

// PUT /api/calendar/events/:id - Modifier un événement
router.put('/events/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { organizationId, userId } = req.user!;
    const {
      title,
      description,
      startDate,
      endDate,
      allDay,
      type,
      status,
      notes,
      location,
      participants = []
    } = req.body;

    // Vérifier que l'événement existe et appartient à l'organisation
    const existingEvent = await prisma.calendarEvent.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }

    // Vérifier les permissions (propriétaire ou admin)
    if (existingEvent.ownerId !== userId) {
      // TODO: Ajouter une vérification de rôle admin si nécessaire
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Mettre à jour l'événement
    const updatedEvent = await prisma.calendarEvent.update({
      where: { id },
      data: {
        title,
        description,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : null,
        allDay,
        type,
        status,
        notes,
        location
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        organization: {
          select: { id: true, name: true }
        },
        participants: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true }
            },
            client: {
              select: { id: true, data: true }
            }
          }
        }
      }
    });

    // Gérer les participants (pour l'instant, on les remplace tous)
    if (participants.length > 0) {
      // Supprimer les anciens participants
      await prisma.calendarParticipant.deleteMany({
        where: { eventId: id }
      });

      // Ajouter les nouveaux participants
      const participantData = participants.map((p: ParticipantInput) => ({
        eventId: id,
        role: p.role,
        userId: p.userId || null,
        clientId: p.clientId || null
      }));

      await prisma.calendarParticipant.createMany({
        data: participantData
      });
    }

    res.json(updatedEvent);
  } catch (error) {
    console.error('[Calendar API] Erreur lors de la modification de l\'événement:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la modification de l\'événement' });
  }
});

// DELETE /api/calendar/events/:id - Supprimer un événement
router.delete('/events/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { organizationId, userId } = req.user!;

    // Vérifier que l'événement existe et appartient à l'organisation
    const existingEvent = await prisma.calendarEvent.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }

    // Vérifier les permissions (propriétaire ou admin)
    if (existingEvent.ownerId !== userId) {
      // TODO: Ajouter une vérification de rôle admin si nécessaire
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Supprimer les participants d'abord (contrainte de clé étrangère)
    await prisma.calendarParticipant.deleteMany({
      where: { eventId: id }
    });

    // Supprimer l'événement
    await prisma.calendarEvent.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[Calendar API] Erreur lors de la suppression de l\'événement:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression de l\'événement' });
  }
});

// GET /api/calendar/types - Récupérer les types d'événements disponibles
router.get('/types', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    // Pour l'instant, on retourne des types statiques
    // Plus tard, on pourra les rendre configurables par organisation
    const types = [
      { value: 'rendez-vous', label: 'Rendez-vous' },
      { value: 'relance', label: 'Relance' },
      { value: 'facture', label: 'Échéance facture' },
      { value: 'chantier', label: 'Chantier/Projet' },
      { value: 'formation', label: 'Formation' },
      { value: 'reunion', label: 'Réunion' },
      { value: 'maintenance', label: 'Maintenance' },
      { value: 'autre', label: 'Autre' }
    ];

    res.json(types);
  } catch (error) {
    console.error('[Calendar API] Erreur lors de la récupération des types:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
