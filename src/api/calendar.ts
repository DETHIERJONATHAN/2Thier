import { Router } from 'express';
import { db } from '../lib/database';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import type { Response } from 'express';
import { createBusinessAutoPost } from '../services/business-auto-post';

const router = Router();
const prisma = db;

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
      leadId,
      chantierId,
      clientId,
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

    // Filtrage par lead lié
    if (leadId) {
      whereClause.linkedLeadId = leadId;
    }

    // Filtrage par chantier lié
    if (chantierId) {
      whereClause.linkedChantierId = chantierId;
    }

    // Filtrage par client lié
    if (clientId) {
      whereClause.linkedClientId = clientId;
    }

    const events = await prisma.calendarEvent.findMany({
      where: whereClause,
      include: {
        User: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        Organization: {
          select: { id: true, name: true }
        },
        CalendarParticipant: {
          include: {
            User: {
              select: { id: true, firstName: true, lastName: true, email: true }
            },
            Lead: {
              select: { id: true, data: true }
            }
          }
        },
        ChantierEvent: {
          include: {
            Chantier: {
              select: { id: true, clientName: true, siteAddress: true, productLabel: true, amount: true, statusId: true, ChantierStatus: { select: { name: true, color: true } } }
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
      participants = [],
      linkedLeadId,
      linkedChantierId,
      linkedClientId,
      linkedProjectId,
      linkedEmailId,
      externalCalendarId
    } = req.body;

    // Validation des données requises
    if (!title || !startDate) {
      return res.status(400).json({ error: 'Le titre et la date de début sont requis' });
    }

    // Créer l'événement
    const eventId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const event = await prisma.calendarEvent.create({
      data: {
        id: eventId,
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
        ownerId: userId,
        updatedAt: new Date(),
        linkedLeadId: linkedLeadId || null,
        linkedChantierId: linkedChantierId || null,
        linkedClientId: linkedClientId || null,
        linkedProjectId: linkedProjectId || null,
        linkedEmailId: linkedEmailId || null,
        externalCalendarId: externalCalendarId || null
      },
      include: {
        User: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        Organization: {
          select: { id: true, name: true }
        }
      }
    });

    // Ajouter les participants si fournis
    if (participants.length > 0) {
      const participantData = participants.map((p: ParticipantInput) => ({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
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
        User: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        Organization: {
          select: { id: true, name: true }
        },
        CalendarParticipant: {
          include: {
            User: {
              select: { id: true, firstName: true, lastName: true, email: true }
            },
            Lead: {
              select: { id: true, data: true }
            }
          }
        }
      }
    });

    // 🐝 Auto-post social : événement calendrier créé
    createBusinessAutoPost({
      orgId: req.user!.organizationId,
      userId: req.user!.userId,
      eventType: 'calendar_event',
      entityId: event.id,
      entityLabel: title || 'Événement',
    }).catch(err => console.error('[Calendar API] Auto-post error:', err));

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
      participants = [],
      linkedLeadId,
      linkedChantierId,
      linkedClientId,
      linkedProjectId,
      linkedEmailId,
      externalCalendarId
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

    // Construire les données de mise à jour
    const updateData: Record<string, unknown> = {
      updatedAt: new Date()
    };
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (allDay !== undefined) updateData.allDay = allDay;
    if (type !== undefined) updateData.type = type;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (location !== undefined) updateData.location = location;
    if (linkedLeadId !== undefined) updateData.linkedLeadId = linkedLeadId || null;
    if (linkedChantierId !== undefined) updateData.linkedChantierId = linkedChantierId || null;
    if (linkedClientId !== undefined) updateData.linkedClientId = linkedClientId || null;
    if (linkedProjectId !== undefined) updateData.linkedProjectId = linkedProjectId || null;
    if (linkedEmailId !== undefined) updateData.linkedEmailId = linkedEmailId || null;
    if (externalCalendarId !== undefined) updateData.externalCalendarId = externalCalendarId || null;

    // Mettre à jour l'événement
    const updatedEvent = await prisma.calendarEvent.update({
      where: { id },
      data: updateData,
      include: {
        User: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        Organization: {
          select: { id: true, name: true }
        },
        CalendarParticipant: {
          include: {
            User: {
              select: { id: true, firstName: true, lastName: true, email: true }
            },
            Lead: {
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
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
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
      { value: 'tache', label: 'Tâche' },
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

// GET /api/calendar/chantier-events - Récupérer les événements chantier comme des événements calendrier
router.get('/chantier-events', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { organizationId } = req.user!;
    const { startDate, endDate } = req.query;

    if (!organizationId) {
      return res.json([]);
    }

    const whereClause: Record<string, unknown> = {
      Chantier: { organizationId }
    };

    // Filtrer par dates si des CalendarEvents liés existent
    if (startDate || endDate) {
      whereClause.CalendarEvent = {
        startDate: {}
      };
      if (startDate) {
        (((whereClause.CalendarEvent as Record<string, unknown>).startDate) as Record<string, unknown>).gte = new Date(startDate as string);
      }
      if (endDate) {
        (((whereClause.CalendarEvent as Record<string, unknown>).startDate) as Record<string, unknown>).lte = new Date(endDate as string);
      }
    }

    const chantierEvents = await prisma.chantierEvent.findMany({
      where: whereClause,
      include: {
        Chantier: {
          select: {
            id: true,
            clientName: true,
            siteAddress: true,
            productLabel: true,
            productColor: true,
            amount: true,
            statusId: true,
            leadId: true,
            ChantierStatus: { select: { name: true, color: true } },
            Responsable: { select: { id: true, firstName: true, lastName: true } }
          }
        },
        CalendarEvent: {
          select: {
            id: true,
            title: true,
            description: true,
            startDate: true,
            endDate: true,
            location: true,
            allDay: true,
            status: true
          }
        },
        ValidatedBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Transformer en format calendrier unifié
    const calendarFormatEvents = chantierEvents.map(ce => ({
      id: `chantier-event-${ce.id}`,
      title: ce.CalendarEvent?.title || `${ce.type} - ${ce.Chantier?.clientName || 'Chantier'}`,
      startDate: ce.CalendarEvent?.startDate || ce.createdAt,
      endDate: ce.CalendarEvent?.endDate || null,
      allDay: ce.CalendarEvent?.allDay || false,
      location: ce.CalendarEvent?.location || ce.Chantier?.siteAddress || null,
      type: 'chantier',
      status: ce.status,
      description: ce.CalendarEvent?.description || ce.notes || null,
      // Données enrichies chantier
      chantierEventType: ce.type,
      chantierId: ce.chantierId,
      chantierClientName: ce.Chantier?.clientName,
      chantierSiteAddress: ce.Chantier?.siteAddress,
      chantierProduct: ce.Chantier?.productLabel,
      chantierProductColor: ce.Chantier?.productColor,
      chantierAmount: ce.Chantier?.amount,
      chantierStatus: ce.Chantier?.ChantierStatus,
      chantierResponsable: ce.Chantier?.Responsable,
      problemNote: ce.problemNote,
      validatedBy: ce.ValidatedBy,
      validatedAt: ce.validatedAt
    }));

    res.json(calendarFormatEvents);
  } catch (error) {
    console.error('[Calendar API] Erreur lors de la récupération des événements chantier:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/calendar/telnyx-calls - Récupérer l'historique des appels Telnyx comme des événements calendrier
router.get('/telnyx-calls', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { organizationId } = req.user!;
    const { startDate, endDate } = req.query;

    if (!organizationId) {
      return res.json([]);
    }

    const whereClause: Record<string, unknown> = { organizationId };

    if (startDate || endDate) {
      whereClause.startedAt = {};
      if (startDate) {
        (whereClause.startedAt as Record<string, unknown>).gte = new Date(startDate as string);
      }
      if (endDate) {
        (whereClause.startedAt as Record<string, unknown>).lte = new Date(endDate as string);
      }
    }

    const calls = await prisma.telnyxCall.findMany({
      where: whereClause,
      include: {
        Lead: {
          select: { id: true, firstName: true, lastName: true, email: true, data: true }
        }
      },
      orderBy: { startedAt: 'desc' },
      take: 200
    });

    const calendarFormatCalls = calls.map(call => {
      const leadName = call.Lead
        ? `${call.Lead.firstName || ''} ${call.Lead.lastName || ''}`.trim() || (call.Lead.data as Record<string, string>)?.name || call.toNumber
        : call.toNumber;
      
      const durationMinutes = call.duration ? Math.ceil(call.duration / 60) : 0;
      
      return {
        id: `telnyx-call-${call.id}`,
        title: `📞 ${call.direction === 'outbound' ? '→' : '←'} ${leadName}${durationMinutes > 0 ? ` (${durationMinutes}min)` : ''}`,
        startDate: call.startedAt,
        endDate: call.endedAt || (call.duration ? new Date(call.startedAt.getTime() + call.duration * 1000) : call.startedAt),
        allDay: false,
        type: 'appel',
        status: call.status,
        description: null,
        // Données enrichies appel
        callDirection: call.direction,
        callDuration: call.duration,
        callStatus: call.status,
        callFrom: call.fromNumber,
        callTo: call.toNumber,
        callRecordingUrl: call.recordingUrl,
        linkedLeadId: call.leadId,
        leadName,
        leadData: call.Lead
      };
    });

    res.json(calendarFormatCalls);
  } catch (error) {
    console.error('[Calendar API] Erreur lors de la récupération des appels Telnyx:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
