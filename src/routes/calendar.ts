import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.js';
import { impersonationMiddleware } from '../middlewares/impersonation.js';
import { googleCalendarService } from '../google-auth/services/GoogleCalendarService.js';
import { prisma } from '../lib/prisma';
import { db } from '../lib/database.js';

const router = Router();
// Logging global minimal pour diagnostiquer les requêtes qui n'atteignent pas les handlers spécifiques
router.use((req, _res, next) => {
  try {
    const hasUser = Boolean((req as unknown as AuthenticatedRequest).user);
    console.log(`[CALENDAR ROUTES][TRACE] ${req.method} ${req.originalUrl} avant middlewares spécifiques - user?`, hasUser);
  } catch (e) {
    console.warn('[CALENDAR ROUTES][TRACE] logging pré-middleware échoué', e);
  }
  next();
});

// --- SSE (Server Sent Events) simple pour push temps réel ---
interface SSEClient { id: string; res: NodeJS.WritableStream & { write: (chunk: string) => boolean }; organizationId: string }
const sseClients: SSEClient[] = [];

function broadcast(orgId: string, event: string, payload: unknown) {
  const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  sseClients.filter(c => c.organizationId === orgId).forEach(c => c.res.write(data));
}

// Protège le flux SSE en exigeant l'auth une fois authMiddleware appliqué (voir déplacement plus bas)
function initSSE(req: AuthenticatedRequest, res: import('express').Response) {
  if (!req.user) {
    console.log('[CALENDAR ROUTES][SSE] ❌ Rejet connexion SSE: pas de user');
    return res.status(401).end();
  }
  // Permettre query ?organizationId=... comme fallback pour super_admin (ex: quand req.user.organizationId est null)
  let organizationId = req.user.organizationId as string | undefined;
  if (!organizationId && req.query.organizationId && req.user.role === 'super_admin') {
    organizationId = String(req.query.organizationId);
    console.log('[CALENDAR ROUTES][SSE] ⚙️ Fallback organizationId depuis query pour super_admin:', organizationId);
  }
  if (!organizationId) {
    console.log('[CALENDAR ROUTES][SSE] ❌ Aucun organizationId déterminé');
    return res.status(400).json({ error: 'organizationId manquant pour SSE' });
  }
  console.log('[CALENDAR ROUTES][SSE] ✅ Connexion SSE acceptée pour org', organizationId);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  const clientId = Date.now().toString() + Math.random();
  sseClients.push({ id: clientId, res, organizationId });
  res.write(`event: connected\ndata: {"clientId":"${clientId}"}\n\n`);
  req.on('close', () => {
    const idx = sseClients.findIndex(c => c.id === clientId);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
}

// Ajouter le middleware d'authentification AVANT d'exposer /stream pour qu'EventSource bénéficie de req.user
router.use(authMiddleware, impersonationMiddleware);

router.get('/stream', (req: AuthenticatedRequest, res) => {
  initSSE(req, res);
});
// (Les autres routes sont déjà protégées car le use() précédent est placé avant leur déclaration)

// ─────────────────────────────────────────────────────────────
//  UTILITAIRE: Détecte si l'utilisateur a un accès Google Calendar
//  (= utilisateur Gmail) ou non (= utilisateur Yandex).
//  Pour les utilisateurs Yandex, les événements sont stockés en DB
//  uniquement, puis poussés vers le Google Calendar d'entreprise
//  via le compte admin de l'organisation.
// ─────────────────────────────────────────────────────────────
async function hasGoogleCalendarAccess(userId: string, organizationId: string): Promise<boolean> {
  const googleToken = await db.googleToken.findFirst({
    where: { userId, organizationId, isValid: true },
    select: { id: true }
  });
  return !!googleToken;
}

/**
 * Pousse un événement vers le Google Calendar d'entreprise (pour les utilisateurs Yandex).
 * Utilise le premier compte admin de l'organisation qui a un token Google valide.
 * Préfixe le titre avec le nom de l'utilisateur pour identification.
 */
async function pushToCompanyCalendar(
  organizationId: string,
  event: { title: string; description?: string | null; startDate: Date; endDate: Date },
  ownerName: string
): Promise<string | null> {
  try {
    // Trouver un admin de l'organisation avec un token Google valide
    const adminToken = await db.googleToken.findFirst({
      where: {
        organizationId,
        isValid: true,
        User: {
          UserOrganization: {
            some: {
              organizationId,
              Role: { name: { in: ['admin', 'super_admin', 'manager'] } }
            }
          }
        }
      },
      select: { userId: true }
    });

    if (!adminToken) {
      console.warn('[CALENDAR] ⚠️ Aucun admin avec Google Calendar trouvé pour org:', organizationId);
      return null;
    }

    // Créer l'événement sur le Google Calendar de l'admin avec le nom de l'employé
    const googleEventData = {
      summary: `[${ownerName}] ${event.title}`,
      description: event.description || undefined,
      start: {
        dateTime: event.startDate.toISOString(),
        timeZone: 'Europe/Brussels',
      },
      end: {
        dateTime: event.endDate.toISOString(),
        timeZone: 'Europe/Brussels',
      },
    };

    const externalId = await googleCalendarService.createEvent(
      organizationId,
      googleEventData,
      adminToken.userId
    );

    console.log(`✅ [CALENDAR] Événement poussé vers Google Calendar entreprise: [${ownerName}] ${event.title}`);
    return externalId;
  } catch (error) {
    console.warn('[CALENDAR] ⚠️ Erreur push vers Google Calendar entreprise:', error);
    return null;
  }
}

// GET /api/calendar/events - Récupérer les événements de l'utilisateur
router.get('/events', async (req: AuthenticatedRequest, res) => {
  try {
    console.log('[CALENDAR ROUTES] GET /events - Début de la requête');
    const { userId, startDate, endDate, forceSync } = req.query as { userId?: string; startDate?: string; endDate?: string; forceSync?: string };
    const userIdToSearch = userId || req.user!.userId;
    const organizationId = req.user!.organizationId!;

    // Construction du whereClause
    interface WhereClause {
      organizationId: string;
      OR: Array<{ ownerId?: string; CalendarParticipant?: { some: { userId: string } } }>;
      startDate?: { gte: Date; lte: Date };
    }
    const whereClause: WhereClause = {
      organizationId,
      OR: [
        { ownerId: userIdToSearch },
        { CalendarParticipant: { some: { userId: userIdToSearch } } }
      ]
    };
    if (startDate && endDate) {
      whereClause.startDate = { gte: new Date(startDate), lte: new Date(endDate) };
    }

    // 1) Charger d'abord les événements locaux
    let events = await prisma.calendarEvent.findMany({
      where: whereClause,
      include: {
        CalendarParticipant: { include: { User: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        User: { select: { id: true, firstName: true, lastName: true, email: true } }
      },
      orderBy: { startDate: 'asc' }
    });

    console.log('[CALENDAR ROUTES] Événements locaux trouvés:', events.length);

    // 1.b) Auto-report des notes (type='note', status != 'done') si date passée et pas dépassé dueDate
    // Reporte au jour courant tant que non done et que la date d'échéance (dueDate) n'est pas dépassée
    try {
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      const notesToCarry = events.filter(e => e.type === 'note' && e.status !== 'done' && e.startDate < todayStart && (!e.dueDate || e.dueDate >= todayStart));
      if (notesToCarry.length) {
        console.log('[CALENDAR ROUTES] 🔁 Report automatique de', notesToCarry.length, 'notes non terminées');
        for (const n of notesToCarry) {
          await prisma.calendarEvent.update({
            where: { id: n.id },
            data: {
              startDate: todayStart,
              endDate: null, // allDay; pas nécessaire
              allDay: true
            }
          });
        }
        // Recharger après report
        events = await prisma.calendarEvent.findMany({
          where: whereClause,
          include: {
            CalendarParticipant: { include: { User: { select: { id: true, firstName: true, lastName: true, email: true } } } },
            User: { select: { id: true, firstName: true, lastName: true, email: true } }
          },
          orderBy: { startDate: 'asc' }
        });
      }
    } catch (carryErr) {
      console.warn('[CALENDAR ROUTES] ⚠️ Erreur report notes:', carryErr);
    }

    const needSync = forceSync === 'true' || events.length === 0; // stratégie simple: si aucun local → sync
    
    // ─── Auto-sync Google Calendar uniquement pour les utilisateurs Gmail ───
    // Les utilisateurs Yandex n'ont pas de Google Calendar personnel,
    // leurs événements sont stockés en DB uniquement.
    const userHasGoogleCalendar = await hasGoogleCalendarAccess(userIdToSearch, organizationId);
    
    if (needSync && userHasGoogleCalendar) {
      console.log('[CALENDAR ROUTES] 🔄 Lancement auto-sync Google Calendar (needSync=', needSync, ')');
      try {
        const syncStart = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 3600 * 1000); // -7j par défaut
        const syncEnd = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 3600 * 1000); // +30j
        const googleEvents = await googleCalendarService.syncEvents(organizationId, syncStart, syncEnd, userIdToSearch);
        console.log('[CALENDAR ROUTES] Google events récupérés:', googleEvents.length);

        for (const gEvent of googleEvents) {
          const gId = gEvent.id;
          if (!gId || !gEvent.start?.dateTime || !gEvent.end?.dateTime) continue;

          // Chercher par externalCalendarId (stocke l'ID Google)
            const existing = await prisma.calendarEvent.findFirst({
              where: { organizationId, externalCalendarId: gId }
            });

          const baseData = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title: gEvent.summary || 'Sans titre',
            description: gEvent.description || null,
            startDate: new Date(gEvent.start.dateTime),
            endDate: new Date(gEvent.end.dateTime),
            type: 'google_sync',
            status: 'synced',
            organizationId,
            ownerId: userIdToSearch,
            externalCalendarId: gId,
            updatedAt: new Date()
          };

          if (existing) {
            await prisma.calendarEvent.update({ where: { id: existing.id }, data: baseData });
          } else {
            await prisma.calendarEvent.create({ data: baseData });
          }
        }

        // Recharger après sync
        events = await prisma.calendarEvent.findMany({
          where: whereClause,
          include: {
            CalendarParticipant: { include: { User: { select: { id: true, firstName: true, lastName: true, email: true } } } },
            User: { select: { id: true, firstName: true, lastName: true, email: true } }
          },
          orderBy: { startDate: 'asc' }
        });
        console.log('[CALENDAR ROUTES] Événements après auto-sync:', events.length);
      } catch (syncError) {
        console.warn('[CALENDAR ROUTES] ⚠️ Auto-sync échouée (les événements locaux restent affichés):', syncError);
      }
    }

    return res.json(events);
  } catch (error) {
    console.error('Erreur récupération événements:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/calendar/ai-suggestions?leadId=...&days=5
// Génère des créneaux intelligents basés sur : disponibilité calendrier, fraîcheur du lead, dernier contact.
router.get('/ai-suggestions', async (req: AuthenticatedRequest, res) => {
  try {
    const { leadId } = req.query as { leadId?: string };
    const organizationId = req.user!.organizationId!;
    if (!leadId) {
      return res.status(400).json({ error: 'Paramètre leadId requis' });
    }

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
      select: { id: true, firstName: true, lastName: true, lastContactDate: true, nextFollowUpDate: true, status: true, createdAt: true }
    });
    if (!lead) return res.status(404).json({ error: 'Lead introuvable' });

    const horizonDays = 5;
    const now = new Date();
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + horizonDays);

    // Récupère événements existants (pour éviter conflits)
    const events = await prisma.calendarEvent.findMany({
      where: {
        organizationId,
        startDate: { gte: now, lte: horizon }
      },
      select: { id: true, startDate: true, endDate: true, title: true }
    });

    // Index rapide des créneaux occupés
    const isBusy = (slotStart: Date, slotEnd: Date) => {
      return events.some(ev => {
        const evStart = ev.startDate;
        const evEnd = ev.endDate || new Date(ev.startDate.getTime() + 30 * 60000);
        return evStart < slotEnd && evEnd > slotStart; // overlap
      });
    };

    // Heures candidates (adaptées pour densité >30 RDV/jour en multi-user; ici on se concentre sur suggestions prioritaires)
    const candidateHours = [9, 9.5, 10, 10.5, 11, 14, 14.5, 15, 15.5, 16]; // .5 => +30min
    type Suggestion = {
      date: string; endDate: string; score: number; type: string; reason: string; evidence: Record<string, unknown>;
    };
    const suggestions: Suggestion[] = [];

    for (let d = 0; d < horizonDays; d++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, 0, 0, 0, 0);
      for (const h of candidateHours) {
        const hour = Math.floor(h);
        const minutes = h % 1 ? 30 : 0;
        const slotStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minutes, 0, 0);
        // Ignore passé
        if (slotStart < now) continue;
        const slotEnd = new Date(slotStart.getTime() + 30 * 60000);
        const busy = isBusy(slotStart, slotEnd);
        // Calcul score
        let score = 50;
        const reasons: string[] = [];

        if (!busy) {
          score += 15; reasons.push('Créneau libre');
        } else {
          score -= 25; reasons.push('Conflit calendrier');
        }
        // Fenêtre de réactivité (prochaines 48h)
        const within48h = slotStart.getTime() - now.getTime() <= 48 * 3600 * 1000;
        if (within48h) { score += 10; reasons.push('Suivi rapide (<48h)'); }
        // Matin productif
        if (hour >= 9 && hour <= 11) { score += 5; reasons.push('Matin propice'); }
        // Après-midi focus
        if (hour >= 14 && hour <= 16 && !within48h) { score += 3; reasons.push('Créneau stable'); }
        // Dernier contact > 5 jours => augmenter priorité
        if (lead.lastContactDate) {
          const daysSinceLast = (now.getTime() - new Date(lead.lastContactDate).getTime()) / 86400000;
          if (daysSinceLast > 5) { score += 7; reasons.push('Relance nécessaire'); }
        } else { score += 6; reasons.push('Aucun contact préalable'); }
        // Proximité nextFollowUpDate
        if (lead.nextFollowUpDate) {
          const diff = Math.abs(new Date(lead.nextFollowUpDate).getTime() - slotStart.getTime()) / 86400000;
            if (diff <= 1.5) { score += 8; reasons.push('Aligné à la prochaine relance'); }
        }

        // Normalisation
        if (score > 100) score = 100;
        if (score < 0) score = 0;

        const type = score >= 85 ? 'best' : score >= 70 ? 'good' : 'ok';
        suggestions.push({
          date: slotStart.toISOString(),
          endDate: slotEnd.toISOString(),
            score,
            type,
            reason: reasons.join(' · '),
            evidence: {
              busy,
              within48h,
              lastContactDate: lead.lastContactDate,
              nextFollowUpDate: lead.nextFollowUpDate
            }
        });
      }
    }

    // Retirer les conflits jugés trop faibles (<55) pour réduire bruit
    const filtered = suggestions.filter(s => s.score >= 55).sort((a, b) => b.score - a.score).slice(0, 25);
    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error('[CALENDAR ROUTES] Erreur ai-suggestions:', error);
    res.status(500).json({ error: 'Erreur génération suggestions' });
  }
});

// POST /api/calendar/sync - Synchroniser avec Google Calendar
router.post('/sync', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const organizationId = req.user!.organizationId!;
    const { startDate, endDate } = req.body;

    // Dates par défaut si non fournies: -7j à +30j
    const syncStart = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const syncEnd = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 3600 * 1000);

    console.log('[CALENDAR SYNC] Début sync pour org:', organizationId, 'du', syncStart, 'au', syncEnd);

    // Utilise le nouveau service Google Calendar centralisé
    const googleEvents = await googleCalendarService.syncEvents(
      organizationId,
      syncStart,
      syncEnd,
      req.user!.userId
    );

    let createdCount = 0;
    let updatedCount = 0;

    for (const gEvent of googleEvents) {
      if (!gEvent.start?.dateTime || !gEvent.end?.dateTime) continue;

      const existingEvent = gEvent.id ? await prisma.calendarEvent.findFirst({
        where: { organizationId, externalCalendarId: gEvent.id }
      }) : null;

      const eventData = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: gEvent.summary || 'Sans titre',
        description: gEvent.description || null,
        startDate: new Date(gEvent.start.dateTime),
        endDate: new Date(gEvent.end.dateTime),
        type: 'google_sync',
        status: 'synced',
        organizationId,
        ownerId: userId,
        externalCalendarId: gEvent.id || null,
        updatedAt: new Date(),
      };

      if (existingEvent) {
        await prisma.calendarEvent.update({ where: { id: existingEvent.id }, data: eventData });
        updatedCount++;
      } else {
        await prisma.calendarEvent.create({ data: eventData });
        createdCount++;
      }
    }

    res.json({ message: 'Synchronisation terminée.', created: createdCount, updated: updatedCount });
  } catch (error) {
    console.error('Erreur de synchronisation Google Calendar:', error);
    res.status(500).json({ error: 'Erreur lors de la synchronisation.' });
  }
});

// POST /api/calendar/events - Créer un nouvel événement
router.post('/events', async (req: AuthenticatedRequest, res) => {
  try {
    console.log('[CALENDAR ROUTES] POST /events - Début création événement');
    console.log('[CALENDAR ROUTES] Body:', req.body);
    console.log('[CALENDAR ROUTES] User:', req.user);
    
    const eventData = req.body;
    const userId = req.user!.userId;
    const organizationId = req.user!.organizationId!;
    
    console.log('[CALENDAR ROUTES] userId:', userId);
    console.log('[CALENDAR ROUTES] organizationId:', organizationId);
    console.log('[CALENDAR ROUTES] eventData BRUT:', eventData);
    
    // 🔧 Préparation des données pour Prisma (validation des champs)
    const prismaData = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: eventData.title,
      description: eventData.description || null,
      startDate: eventData.start || eventData.startDate,
      endDate: eventData.end || eventData.endDate,
      allDay: eventData.isAllDay || eventData.allDay || false,
      type: eventData.category || eventData.type || 'rendez-vous', // 🎯 category → type
      status: eventData.priority || eventData.status || 'normal', // 🎯 priority → status  
      notes: eventData.notes || null,
      location: eventData.location || null,
      ownerId: userId,
      organizationId,
      updatedAt: new Date(),
    };
    
    console.log('[CALENDAR ROUTES] Données préparées pour Prisma:', prismaData);
    console.log('[CALENDAR ROUTES] Champs mappés correctement:', {
      'category → type': eventData.category + ' → ' + prismaData.type,
      'priority → status': eventData.priority + ' → ' + prismaData.status,
      'organizer': eventData.organizer + ' (ignoré - pas de champ dans Prisma)'
    });

  const event = await prisma.calendarEvent.create({
      data: prismaData,
    });
    
    console.log('[CALENDAR ROUTES] Événement créé:', event);

    // ─── Synchronisation Google Calendar ───
    // Gmail users : sync vers leur propre Google Calendar
    // Yandex users : push vers le Google Calendar d'entreprise (via admin)
    const userHasGoogle = await hasGoogleCalendarAccess(userId, organizationId);
    
    if (userHasGoogle) {
      // ✅ Utilisateur Gmail → sync vers SON Google Calendar
      try {
        const googleEventData = {
          summary: event.title,
          description: event.description,
          start: {
            dateTime: new Date(event.startDate).toISOString(),
            timeZone: 'Europe/Brussels',
          },
          end: {
            dateTime: new Date(event.endDate).toISOString(),
            timeZone: 'Europe/Brussels',
          },
        };
        
        const externalCalendarId = await googleCalendarService.createEvent(organizationId, googleEventData, userId);
        
        const updatedEvent = await prisma.calendarEvent.update({
          where: { id: event.id },
          data: { externalCalendarId },
          include: {
            project: { select: { id: true, name: true, clientName: true } },
            lead: { select: { id: true, firstName: true, lastName: true, email: true } }
          }
        });
        broadcast(organizationId, 'event.created', updatedEvent);
        return res.status(201).json(updatedEvent);
      } catch (googleError) {
        console.warn('[CALENDAR ROUTES] Erreur Google Calendar (événement créé en local):', googleError);
      }
    } else {
      // ✅ Utilisateur Yandex → push vers le Google Calendar d'entreprise
      try {
        const owner = await db.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true }
        });
        const ownerName = [owner?.firstName, owner?.lastName].filter(Boolean).join(' ') || 'Employé';

        const externalCalendarId = await pushToCompanyCalendar(
          organizationId,
          {
            title: event.title,
            description: event.description,
            startDate: new Date(event.startDate),
            endDate: new Date(event.endDate),
          },
          ownerName
        );

        if (externalCalendarId) {
          await prisma.calendarEvent.update({
            where: { id: event.id },
            data: { externalCalendarId }
          });
        }
      } catch (companyCalError) {
        console.warn('[CALENDAR ROUTES] Erreur push vers calendrier entreprise (événement créé en local):', companyCalError);
      }
    }
    
    broadcast(organizationId, 'event.created', event);
    res.status(201).json(event);
  } catch (error) {
    console.error('Erreur création événement:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'événement' });
  }
});

// POST /api/calendar/notes - Création rapide d'une note (tâche journalière auto-reportée)
router.post('/notes', async (req: AuthenticatedRequest, res) => {
  const startedAt = Date.now();
  console.log('\n[CALENDAR ROUTES] ▶ POST /notes - Début');
  console.log('[CALENDAR ROUTES] ▶ Body reçu:', req.body);
  try {
    const { title, description, dueDate, priority, category } = req.body as { title: string; description?: string; dueDate?: string; priority?: string; category?: string };
    // Fallback organizationId: si super_admin et body.organizationId fourni, l'utiliser (évite crash quand null)
    let organizationId = req.user?.organizationId as string | undefined;
    if (!organizationId && req.user?.role === 'super_admin' && (req.body.organizationId || req.query.organizationId)) {
      organizationId = String(req.body.organizationId || req.query.organizationId);
      console.log('[CALENDAR ROUTES][POST /notes] ⚙️ Fallback organizationId super_admin:', organizationId);
    }
    if (!organizationId) {
      console.warn('[CALENDAR ROUTES][POST /notes] ❌ organizationId introuvable');
      return res.status(400).json({ error: 'organizationId requis' });
    }
    const ownerId = req.user!.userId;
    if (!title || typeof title !== 'string') {
      console.warn('[CALENDAR ROUTES] ⚠️ Titre manquant ou invalide');
      return res.status(400).json({ error: 'Titre requis' });
    }

    // Normalisation / validation légère
    const allowedPriorities = ['low','medium','high','urgent'];
    const normalizedPriority = priority && allowedPriorities.includes(priority) ? priority : null;
    const safeCategory = category ? String(category).slice(0,64) : null;

    const today = new Date(); today.setHours(0,0,0,0);
    let parsedDue: Date | null = null;
    if (dueDate) {
      try {
        parsedDue = new Date(dueDate);
        if (isNaN(parsedDue.getTime())) {
          console.warn('[CALENDAR ROUTES] ⚠️ dueDate invalide, ignorée:', dueDate);
          parsedDue = null;
        }
      } catch (e) {
        console.warn('[CALENDAR ROUTES] ⚠️ Erreur parsing dueDate, ignorée:', dueDate, e);
        parsedDue = null;
      }
    }

    console.log('[CALENDAR ROUTES] ✔ Données normalisées:', { title, hasDescription: !!description, parsedDue, normalizedPriority, safeCategory, organizationId, ownerId });

    const data = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      description: description || null,
      startDate: today,
      endDate: null as Date | null,
      allDay: true,
      type: 'note',
      status: 'pending',
      dueDate: parsedDue,
      priority: normalizedPriority,
      category: safeCategory,
      organizationId,
      ownerId,
      updatedAt: new Date()
    };

    console.log('[CALENDAR ROUTES] ➕ Création Prisma calendarEvent avec data:', data);
    let note;
    try {
      note = await prisma.calendarEvent.create({ data });
  } catch (prismaCreateError: unknown) {
      console.error('[CALENDAR ROUTES] ❌ Prisma create a échoué');
      if (prismaCreateError?.code) {
        console.error('[CALENDAR ROUTES] ❌ Prisma error code:', prismaCreateError.code, 'meta:', prismaCreateError.meta);
      }
      console.error('[CALENDAR ROUTES] ❌ Détails erreur:', prismaCreateError);
      throw prismaCreateError; // relancer pour gestion catch globale
    }
    console.log('[CALENDAR ROUTES] ✅ Note créée:', { id: note.id, title: note.title });
    broadcast(organizationId, 'note.created', note);
    const duration = Date.now() - startedAt;
    console.log('[CALENDAR ROUTES] ⏱ Durée création note ms:', duration);
    res.status(201).json(note);
  } catch (error: unknown) {
    const duration = Date.now() - startedAt;
    console.error('[CALENDAR ROUTES] ❌ Erreur création note après', duration, 'ms');
    if (error instanceof Error) {
      console.error('[CALENDAR ROUTES] ❌ Stack:', error.stack);
    } else {
      console.error('[CALENDAR ROUTES] ❌ Valeur erreur non-Error:', error);
    }
    type PossiblyPrismaError = { code?: string; meta?: unknown } & Record<string, unknown>;
    const prismaErr = error as PossiblyPrismaError;
    if (prismaErr && typeof prismaErr === 'object' && 'code' in prismaErr && prismaErr.code) {
      console.error('[CALENDAR ROUTES] ❌ Prisma code:', prismaErr.code, 'meta:', prismaErr.meta);
    }
    res.status(500).json({ error: 'Erreur création note' });
  }
});

// PATCH /api/calendar/notes/:id/done - Marquer une note comme accomplie
router.patch('/notes/:id/done', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId!;
    const existing = await prisma.calendarEvent.findFirst({ where: { id, organizationId, type: 'note' } });
    if (!existing) return res.status(404).json({ error: 'Note introuvable' });
  const updated = await prisma.calendarEvent.update({
      where: { id },
  data: { status: 'done', completedAt: new Date() }
    });
  broadcast(organizationId, 'note.updated', updated);
    res.json(updated);
  } catch (error) {
    console.error('[CALENDAR ROUTES] Erreur completion note:', error);
    res.status(500).json({ error: 'Erreur completion note' });
  }
});

// GET /api/calendar/notes/summary - Compte rapide pour badge
router.get('/notes/summary', async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user!.organizationId!;
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const active = await prisma.calendarEvent.findMany({
      where: { organizationId, type: 'note', status: { not: 'done' } },
      select: { id: true, dueDate: true, startDate: true, title: true }
    });
    const overdue = active.filter(n => n.dueDate && n.dueDate < todayStart).map(n => n.id);
    res.json({ totalActive: active.length, overdueCount: overdue.length, overdueIds: overdue });
  } catch (e) {
    console.error('[CALENDAR ROUTES] Erreur notes/summary:', e);
    res.status(500).json({ error: 'Erreur summary notes' });
  }
});

// GET /api/calendar/notes/history?from=YYYY-MM-DD&to=YYYY-MM-DD&format=json|csv
router.get('/notes/history', async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user!.organizationId!;
    const { from, to, format } = req.query as { from?: string; to?: string; format?: string };
  const where: Record<string, unknown> = { organizationId, type: 'note', status: 'done', completedAt: { not: null } };
    if (from || to) {
      where.startDate = {};
      if (from) where.startDate.gte = new Date(from + 'T00:00:00');
      if (to) where.startDate.lte = new Date(to + 'T23:59:59');
    }
    const notes = await prisma.calendarEvent.findMany({ where, orderBy: { completedAt: 'desc' } });
    const enriched = notes.map(n => ({
      id: n.id,
      title: n.title,
      description: n.description,
      createdDate: n.startDate,
      dueDate: n.dueDate,
      completedAt: n.completedAt,
      completionDelayMinutes: n.completedAt && n.startDate ? Math.round(((n.completedAt as Date).getTime() - (n.startDate as Date).getTime())/60000) : null,
      overdue: n.dueDate && n.completedAt ? (n.completedAt as Date) > (n.dueDate as Date) : false,
      priority: n.priority,
      category: n.category
    }));
    if (format === 'csv') {
      const header = 'id;title;createdDate;dueDate;completedAt;completionDelayMinutes;overdue;priority;category';
      const rows = enriched.map(e => [e.id, e.title.replace(/;/g, ','), e.createdDate?.toISOString(), e.dueDate?.toISOString()||'', e.completedAt?.toISOString()||'', e.completionDelayMinutes??'', e.overdue, e.priority||'', e.category||''].join(';'));
      const csv = [header, ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      return res.send(csv);
    }
    res.json({ success: true, data: enriched });
  } catch (e) {
    console.error('[CALENDAR ROUTES] Erreur notes/history:', e);
    res.status(500).json({ error: 'Erreur history notes' });
  }
});

// PUT /api/calendar/events/:id - Modifier un événement
router.put('/events/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const eventData = req.body;
    const organizationId = req.user!.organizationId!;

    const updatedEvent = await prisma.calendarEvent.update({
      where: { id, organizationId },
      data: eventData,
    });

    if (updatedEvent.externalCalendarId) {
      try {
        const googleEventData = {
          summary: updatedEvent.title,
          description: updatedEvent.description,
          start: {
            dateTime: new Date(updatedEvent.startDate).toISOString(),
            timeZone: 'Europe/Brussels',
          },
          end: {
            dateTime: new Date(updatedEvent.endDate).toISOString(),
            timeZone: 'Europe/Brussels',
          },
        };
        
        await googleCalendarService.updateEvent(organizationId, updatedEvent.externalCalendarId, googleEventData, req.user!.userId);
      } catch (googleError) {
        console.warn('[CALENDAR ROUTES] Erreur mise à jour Google Calendar:', googleError);
      }
    }

    res.json(updatedEvent);
  } catch (error) {
    console.error('Erreur modification événement:', error);
    res.status(500).json({ error: 'Erreur lors de la modification de l\'événement' });
  }
});

// DELETE /api/calendar/events/:id - Supprimer un événement
router.delete('/events/:id', async (req: AuthenticatedRequest, res) => {
  try {
    console.log('[CALENDAR ROUTES] DELETE /events/:id - Début suppression');
    const { id } = req.params;
    const organizationId = req.user!.organizationId!;
    
    console.log('[CALENDAR ROUTES] ID à supprimer:', id);
    console.log('[CALENDAR ROUTES] OrganizationId:', organizationId);

    const eventToDelete = await prisma.calendarEvent.findUnique({ where: { id, organizationId } });
    console.log('[CALENDAR ROUTES] Événement trouvé:', eventToDelete);

    if (!eventToDelete) {
      console.log('[CALENDAR ROUTES] ❌ Événement non trouvé');
      return res.status(404).json({ error: 'Événement non trouvé.' });
    }

    console.log('[CALENDAR ROUTES] 🗑️ Suppression de l\'événement...');
    await prisma.calendarEvent.delete({ where: { id } });
    console.log('[CALENDAR ROUTES] ✅ Événement supprimé de la base de données');

    if (eventToDelete.externalCalendarId) {
      try {
        console.log('[CALENDAR ROUTES] 🔄 Suppression de Google Calendar...');
        await googleCalendarService.deleteEvent(organizationId, eventToDelete.externalCalendarId, req.user!.userId);
        console.log('[CALENDAR ROUTES] ✅ Événement supprimé de Google Calendar');
      } catch (googleError) {
        console.warn('[CALENDAR ROUTES] ⚠️ Erreur suppression Google Calendar:', googleError);
      }
    }

    console.log('[CALENDAR ROUTES] ✅ Suppression terminée avec succès');
    res.json({ message: 'Événement supprimé avec succès' });
  } catch (error) {
    console.error('[CALENDAR ROUTES] ❌ Erreur suppression événement:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'événement' });
  }
});

export default router;
