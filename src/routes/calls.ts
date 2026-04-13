import { Router, Request, Response } from 'express';
import { SIGNAL_EXPIRY_MS } from '../lib/constants';
import { db } from '../lib/database';
import { authenticateToken } from '../middleware/auth';
import { getGeminiService } from '../services/GoogleGeminiService';
import { sendPushToUser } from './push';
import { logger } from '../lib/logger';

const router = Router();

// ═══════════════════════════════════════════════════════════════
// POST /calls/:id/leave-beacon — Emergency leave via sendBeacon (no auth, called on tab close)
// This route MUST be before authenticateToken middleware
// ═══════════════════════════════════════════════════════════════
router.post('/:id/leave-beacon', async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.body || {};
  if (!userId || !req.params.id) { res.status(400).json({ error: 'Missing data' }); return; }

  try {
    // Mark participant as left
    await db.callParticipant.updateMany({
      where: { callId: req.params.id, userId, status: 'joined' },
      data: { status: 'left', leftAt: new Date() },
    });

    // Check if anyone is still in the call
    const stillJoined = await db.callParticipant.count({
      where: { callId: req.params.id, status: 'joined' },
    });

    if (stillJoined === 0) {
      await db.videoCall.update({
        where: { id: req.params.id },
        data: { status: 'ended', endedAt: new Date() },
      }).catch(() => {});
    }

    res.json({ success: true });
  } catch (err) {
    logger.error('[CALLS] Beacon leave error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// All routes below require authentication
router.use(authenticateToken as unknown);

// ═══════════════════════════════════════════════════════════════
// GET /calls/ice-servers — Return TURN credentials for WebRTC
// ═══════════════════════════════════════════════════════════════
// Metered.ca free-tier TURN or env-configured TURN
router.get('/ice-servers', async (_req: Request, res: Response): Promise<void> => {
  try {
    const turnUrl = process.env.TURN_SERVER_URL;
    const turnUser = process.env.TURN_USERNAME;
    const turnCred = process.env.TURN_CREDENTIAL;

    const iceServers: unknown[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];

    if (turnUrl && turnUser && turnCred) {
      // TURN configured via environment variables
      iceServers.push(
        { urls: turnUrl, username: turnUser, credential: turnCred },
      );
      // Also add TCP transport variant if it's a turn: URL
      if (turnUrl.startsWith('turn:')) {
        iceServers.push({ urls: `${turnUrl}?transport=tcp`, username: turnUser, credential: turnCred });
      }
    } else {
      // Fallback: free Metered.ca open-relay TURN servers
      // Required for WebRTC connectivity when peers are behind symmetric NAT
      iceServers.push(
        { urls: 'stun:stun.relay.metered.ca:80' },
        { urls: 'turn:global.relay.metered.ca:80', username: 'e8dd65b92f6ebc3c0de0ee43', credential: 'kMdMsKPjSGXBPkb+' },
        { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: 'e8dd65b92f6ebc3c0de0ee43', credential: 'kMdMsKPjSGXBPkb+' },
        { urls: 'turn:global.relay.metered.ca:443', username: 'e8dd65b92f6ebc3c0de0ee43', credential: 'kMdMsKPjSGXBPkb+' },
        { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: 'e8dd65b92f6ebc3c0de0ee43', credential: 'kMdMsKPjSGXBPkb+' },
      );
    }

    res.json({ iceServers });
  } catch (err) {
    logger.error('[CALLS] Error generating ICE servers:', err);
    res.json({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /calls/start — Initiate a call from a conversation
// ═══════════════════════════════════════════════════════════════
router.post('/start', async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  const { conversationId, callType = 'video', title } = req.body;
  if (!conversationId) { res.status(400).json({ error: 'conversationId requis' }); return; }

  try {
    // Get conversation participants
    const participants = await db.conversationParticipant.findMany({
      where: { conversationId, isActive: true },
      select: { userId: true },
    });

    if (participants.length < 2) {
      res.status(400).json({ error: 'La conversation doit avoir au moins 2 participants' }); return;
    }

    // Check no active call exists for this conversation
    const activeCall = await db.videoCall.findFirst({
      where: { conversationId, status: { in: ['ringing', 'active'] } },
      include: { participants: { select: { userId: true, status: true } } },
    });
    if (activeCall) {
      // If the user already left this call, end the stale call and create a new one
      const myParticipant = activeCall.participants.find(p => p.userId === user.id);
      if (myParticipant?.status === 'left') {
        await db.videoCall.update({
          where: { id: activeCall.id },
          data: { status: 'ended', endedAt: new Date() },
        });
        // Fall through to create a new call
      } else {
        res.json({ call: activeCall, existing: true }); return;
      }
    }

    // Create the call
    const call = await db.videoCall.create({
      data: {
        conversationId,
        initiatorId: user.id,
        callType,
        title,
        status: 'ringing',
        participants: {
          create: participants.map(p => ({
            userId: p.userId,
            status: p.userId === user.id ? 'joined' : 'invited',
            joinedAt: p.userId === user.id ? new Date() : null,
          })),
        },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
        },
        initiator: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    // Send push notifications to all invited participants
    const callerName = `${call.initiator.firstName} ${call.initiator.lastName}`.trim();
    const invitedParticipants = call.participants.filter(p => p.userId !== user.id);
    for (const p of invitedParticipants) {
      sendPushToUser(p.userId, {
        title: `📞 ${callType === 'video' ? 'Appel vidéo' : 'Appel audio'} entrant`,
        body: `${callerName} vous appelle...`,
        icon: call.initiator.avatarUrl || '/pwa-192x192.png',
        tag: `call-${call.id}`,
        callId: call.id,
        type: 'incoming-call',
        url: '/',
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200, 100, 200],
        actions: [
          { action: 'answer', title: '✅ Répondre' },
          { action: 'reject', title: '❌ Refuser' },
        ],
      }).catch(err => logger.warn('[CALLS] Push notification error:', err));
    }

    res.json({ call, existing: false });
  } catch (err) {
    logger.error('[CALLS] Error starting call:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /calls/:id/join — Join a call
// ═══════════════════════════════════════════════════════════════
router.post('/:id/join', async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    const call = await db.videoCall.findUnique({ where: { id: req.params.id } });
    if (!call || call.status === 'ended') {
      res.status(404).json({ error: 'Appel terminé ou non trouvé' }); return;
    }

    // Update participant status
    await db.callParticipant.updateMany({
      where: { callId: req.params.id, userId: user.id },
      data: { status: 'joined', joinedAt: new Date() },
    });

    // Only transition to 'active' when a NON-initiator joins
    // This keeps the call 'ringing' so the other side can see it
    if (call.status === 'ringing' && call.initiatorId !== user.id) {
      await db.videoCall.update({
        where: { id: req.params.id },
        data: { status: 'active', startedAt: new Date() },
      });
    }

    res.json({ success: true });
  } catch (err) {
    logger.error('[CALLS] Error joining call:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /calls/:id/leave — Leave a call
// ═══════════════════════════════════════════════════════════════
router.post('/:id/leave', async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    await db.callParticipant.updateMany({
      where: { callId: req.params.id, userId: user.id },
      data: { status: 'left', leftAt: new Date() },
    });

    // Count total and remaining participants
    const totalParticipants = await db.callParticipant.count({
      where: { callId: req.params.id },
    });
    const stillJoined = await db.callParticipant.count({
      where: { callId: req.params.id, status: 'joined' },
    });

    // End call if: nobody joined OR it's a 2-person call and one left
    const shouldEnd = stillJoined === 0 || (totalParticipants <= 2 && stillJoined <= 1);
    if (shouldEnd) {
      // Mark all remaining participants as left
      await db.callParticipant.updateMany({
        where: { callId: req.params.id, status: { in: ['joined', 'invited'] } },
        data: { status: 'left', leftAt: new Date() },
      });
      const callData = await db.videoCall.findUnique({ where: { id: req.params.id } });
      const durationSec = callData?.startedAt
        ? Math.floor((Date.now() - callData.startedAt.getTime()) / 1000)
        : 0;

      const call = await db.videoCall.update({
        where: { id: req.params.id },
        data: {
          status: 'ended',
          endedAt: new Date(),
          duration: durationSec,
        },
      });

      // Insert a system message in the conversation so the call appears in Whispers
      if (call.conversationId) {
        // Clean up signaling buffer for this call
        signalingBuffer.delete(req.params.id);
        const callIcon = call.callType === 'video' ? '📹' : '📞';
        let messageContent: string;

        if (!callData?.startedAt) {
          // Nobody answered — cancelled/missed call
          messageContent = `${callIcon} Appel ${call.callType === 'video' ? 'vidéo' : 'audio'} manqué`;
        } else {
          const mins = Math.floor(durationSec / 60);
          const secs = durationSec % 60;
          const durationStr = mins > 0 ? `${mins}min ${secs}s` : `${secs}s`;
          messageContent = `${callIcon} Appel ${call.callType === 'video' ? 'vidéo' : 'audio'} terminé — Durée : ${durationStr}`;
        }

        await db.message.create({
          data: {
            conversationId: call.conversationId,
            senderId: user.id,
            content: messageContent,
          },
        });

        // Update conversation timestamp so it appears at the top
        await db.conversation.update({
          where: { id: call.conversationId },
          data: { updatedAt: new Date() },
        }).catch(() => {});
      }

      res.json({ success: true, callEnded: true, call });
    } else {
      res.json({ success: true, callEnded: false });
    }
  } catch (err) {
    logger.error('[CALLS] Error leaving call:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /calls/:id/reject — Reject/decline a call
// ═══════════════════════════════════════════════════════════════
router.post('/:id/reject', async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    await db.callParticipant.updateMany({
      where: { callId: req.params.id, userId: user.id },
      data: { status: 'rejected' },
    });

    // Insert a "missed call" message in the conversation
    const call = await db.videoCall.findUnique({ where: { id: req.params.id } });
    if (call?.conversationId) {
      const callIcon = call.callType === 'video' ? '📹' : '📞';
      await db.message.create({
        data: {
          conversationId: call.conversationId,
          senderId: call.initiatorId,
          content: `${callIcon} Appel ${call.callType === 'video' ? 'vidéo' : 'audio'} manqué`,
        },
      });
      await db.conversation.update({
        where: { id: call.conversationId },
        data: { updatedAt: new Date() },
      }).catch(() => {});
    }

    res.json({ success: true });
  } catch (err) {
    logger.error('[CALLS] Error rejecting call:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /calls/:id — Get call status & participants (polling)
// ═══════════════════════════════════════════════════════════════
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    const call = await db.videoCall.findUnique({
      where: { id: req.params.id },
      include: {
        participants: {
          include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
        },
        initiator: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    if (!call) { res.status(404).json({ error: 'Appel non trouvé' }); return; }
    res.json(call);
  } catch (err) {
    logger.error('[CALLS] Error fetching call:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /calls/incoming — Check for incoming calls
// ═══════════════════════════════════════════════════════════════
router.get('/check/incoming', async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    const incoming = await db.callParticipant.findFirst({
      where: {
        userId: user.id,
        status: 'invited',
        call: { status: { in: ['ringing', 'active'] } },
      },
      include: {
        call: {
          include: {
            initiator: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            participants: {
              include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
            },
          },
        },
      },
    });

    res.json({ incoming: incoming?.call || null });
  } catch (err) {
    logger.error('[CALLS] Error checking incoming:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /calls/:id/signal — Exchange WebRTC signaling data
// ═══════════════════════════════════════════════════════════════

// Simple in-memory signaling buffer (works for single-server deployment)
const signalingBuffer = new Map<string, Array<{ from: string; to: string; type: string; data: unknown; ts: number }>>();

// Cleanup completed calls from signaling buffer periodically (every 60s)
setInterval(() => {
  const now = Date.now();
  for (const [callId, signals] of signalingBuffer.entries()) {
    // Remove calls where all signals are >60s old
    if (signals.length === 0 || signals.every(s => now - s.ts > 60000)) {
      signalingBuffer.delete(callId);
    }
  }
}, 60000);

router.post('/:id/signal', async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  const { to, type, data } = req.body; // type: 'offer' | 'answer' | 'ice-candidate'
  const callId = req.params.id;

  const key = callId;
  if (!signalingBuffer.has(key)) signalingBuffer.set(key, []);
  signalingBuffer.get(key)!.push({ from: user.id, to, type, data, ts: Date.now() });

  // Clean old signals (> 120s) — allows time for callee to join and receive offer
  const now = Date.now();
  const signals = signalingBuffer.get(key)!;
  const cleaned = signals.filter(s => now - s.ts < SIGNAL_EXPIRY_MS);
  signalingBuffer.set(key, cleaned);

  res.json({ success: true });
});

// GET /calls/:id/signal — Poll for signaling messages
router.get('/:id/signal', async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  const callId = req.params.id;
  const signals = signalingBuffer.get(callId) || [];

  // Return signals addressed to this user
  const mySignals = signals.filter(s => s.to === user.id);

  // Remove consumed signals
  if (mySignals.length > 0) {
    const remaining = signals.filter(s => s.to !== user.id);
    signalingBuffer.set(callId, remaining);
  }

  res.json({ signals: mySignals });
});

// ═══════════════════════════════════════════════════════════════
// POST /calls/:id/transcribe — Generate meeting summary with Gemini
// ═══════════════════════════════════════════════════════════════
router.post('/:id/transcribe', async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  const { transcription } = req.body;
  if (!transcription) { res.status(400).json({ error: 'Transcription requise' }); return; }

  try {
    const call = await db.videoCall.findUnique({
      where: { id: req.params.id },
      include: {
        participants: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });
    if (!call) { res.status(404).json({ error: 'Appel non trouvé' }); return; }

    const participantNames = call.participants.map(p =>
      `${p.user.firstName || ''} ${p.user.lastName || ''}`.trim()
    ).join(', ');

    // Use Gemini to generate meeting summary
    const gemini = getGeminiService();
    const prompt = `Tu es un assistant professionnel. Voici la transcription d'une réunion vidéo entre: ${participantNames}.
${call.title ? `Sujet de la réunion: ${call.title}` : ''}

TRANSCRIPTION:
${transcription}

Génère un compte-rendu de réunion structuré en français avec:
1. **Résumé** (3-5 phrases)
2. **Points clés discutés** (liste à puces)
3. **Décisions prises** (si applicable)
4. **Actions à suivre** (avec responsable si identifiable)
5. **Prochaines étapes**

Sois concis et professionnel.`;

    const chatResult = await gemini.chat({ prompt });
    const summary = chatResult.success && chatResult.content ? chatResult.content : 'Résumé non disponible';

    // Save to database
    await db.videoCall.update({
      where: { id: req.params.id },
      data: { transcription, meetingSummary: summary },
    });

    res.json({ success: true, summary });
  } catch (err) {
    logger.error('[CALLS] Error transcribing:', err);
    res.status(500).json({ error: 'Erreur lors de la transcription' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /calls/history — Call history for user
// ═══════════════════════════════════════════════════════════════
router.get('/history/list', async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    const calls = await db.videoCall.findMany({
      where: {
        participants: { some: { userId: user.id } },
        status: 'ended',
      },
      include: {
        participants: {
          include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
        },
        initiator: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json(calls);
  } catch (err) {
    logger.error('[CALLS] Error fetching history:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GHOST CALL CLEANUP — Runs every 60s to terminate orphaned calls
// ═══════════════════════════════════════════════════════════════
setInterval(async () => {
  try {
    const now = new Date();

    // 1. End 'ringing' calls older than 90 seconds (nobody picked up)
    const ringingCutoff = new Date(now.getTime() - 90_000);
    const staleRinging = await db.videoCall.findMany({
      where: { status: 'ringing', createdAt: { lt: ringingCutoff } },
      select: { id: true, conversationId: true, initiatorId: true, callType: true },
    });
    for (const call of staleRinging) {
      await db.videoCall.update({
        where: { id: call.id },
        data: { status: 'missed', endedAt: now },
      });
      await db.callParticipant.updateMany({
        where: { callId: call.id, status: { in: ['invited', 'joined'] } },
        data: { status: 'left', leftAt: now },
      });
      signalingBuffer.delete(call.id);
    }

    // 2. End 'active' calls where all participants left > 2 minutes ago
    const activeCutoff = new Date(now.getTime() - 120_000);
    const staleActive = await db.videoCall.findMany({
      where: {
        status: 'active',
        participants: { every: { OR: [{ status: 'left' }, { status: 'rejected' }, { leftAt: { lt: activeCutoff } }] } },
      },
      select: { id: true },
    });
    for (const call of staleActive) {
      const stillJoined = await db.callParticipant.count({
        where: { callId: call.id, status: 'joined' },
      });
      if (stillJoined === 0) {
        await db.videoCall.update({
          where: { id: call.id },
          data: { status: 'ended', endedAt: now },
        });
        signalingBuffer.delete(call.id);
      }
    }
  } catch (err) {
    logger.error('[CALLS] Ghost cleanup error:', err);
  }
}, 60_000);

export default router;
