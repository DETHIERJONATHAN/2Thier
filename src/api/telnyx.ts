import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import axios from 'axios';
import { AuthenticatedRequest } from '../middlewares/auth';

const router = Router();
const prisma = new PrismaClient();

// Configuration Telnyx
const TELNYX_API_URL = 'https://api.telnyx.com/v2';
const TELNYX_API_KEY = process.env.TELNYX_API_KEY;

// Utilitaires d'authentification Telnyx
const telnyxHeaders = {
  'Authorization': `Bearer ${TELNYX_API_KEY}`,
  'Content-Type': 'application/json'
};

// Schemas de validation
const makeCallSchema = z.object({
  to: z.string().min(1),
  from: z.string().min(1),
  connection_id: z.string().optional(),
  lead_id: z.string().optional(),
  webhook_url: z.string().url().optional()
});

const sendMessageSchema = z.object({
  to: z.string().min(1),
  from: z.string().min(1),
  text: z.string().min(1).max(1600),
  type: z.enum(['SMS', 'MMS']).default('SMS'),
  lead_id: z.string().optional(),
  media_urls: z.array(z.string().url()).optional()
});

const purchaseNumberSchema = z.object({
  country: z.string().length(2),
  type: z.enum(['local', 'toll-free', 'national', 'mobile']),
  area_code: z.string().optional()
});

// Interfaces TypeScript pour Telnyx API
interface TelnyxConnectionResponse {
  id: string;
  connection_name?: string;
  active: boolean;
  outbound?: { type: string };
  webhook_event_url?: string;
  created_at: string;
  updated_at: string;
}

interface TelnyxPhoneNumberResponse {
  id: string;
  phone_number: string;
  status: string;
  country_code: string;
  phone_number_type: string;
  features?: string[];
  monthly_recurring_cost?: string;
  connection_id?: string;
  purchased_at: string;
}

interface TelnyxCallUpdateData {
  status?: string;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
  updatedAt: Date;
}

// --- CONNEXIONS ---
router.get('/connections', async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('🔍 [Telnyx API] Récupération des connexions...');
    
    const organizationId = req.user!.organizationId!;
    console.log('[Telnyx API] organizationId:', organizationId);
    
    // Récupérer depuis Telnyx
    const response = await axios.get(`${TELNYX_API_URL}/connections`, {
      headers: telnyxHeaders
    });

    const connections = response.data.data.map((conn: TelnyxConnectionResponse) => ({
      id: conn.id,
      name: conn.connection_name || `Connection ${conn.id.substring(0, 8)}`,
      status: conn.active ? 'active' : 'inactive',
      type: conn.outbound?.type || 'voice',
      webhook_url: conn.webhook_event_url,
      created_at: conn.created_at,
      updated_at: conn.updated_at
    }));

    // Sauvegarder en base
    for (const conn of connections) {
      await prisma.telnyxConnection.upsert({
        where: { id: conn.id },
        update: {
          name: conn.name,
          status: conn.status,
          type: conn.type,
          webhookUrl: conn.webhook_url,
          updatedAt: new Date()
        },
        create: {
          id: conn.id,
          name: conn.name,
          status: conn.status,
          type: conn.type,
          webhookUrl: conn.webhook_url,
          organizationId: organizationId,
          createdAt: new Date(conn.created_at),
          updatedAt: new Date()
        }
      });
    }

    console.log(`✅ [Telnyx API] ${connections.length} connexions synchronisées`);
    res.json(connections);
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur connexions:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des connexions' });
  }
});

// --- NUMÉROS DE TÉLÉPHONE ---
router.get('/phone-numbers', async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('🔍 [Telnyx API] Récupération des numéros...');
    
    const organizationId = req.user!.organizationId!;
    
    const response = await axios.get(`${TELNYX_API_URL}/phone_numbers`, {
      headers: telnyxHeaders,
      params: { 'page[size]': 250 }
    });

    const phoneNumbers = response.data.data.map((number: TelnyxPhoneNumberResponse) => ({
      id: number.id,
      phone_number: number.phone_number,
      status: number.status,
      country_code: number.country_code,
      number_type: number.phone_number_type,
      features: number.features || [],
      monthly_cost: parseFloat(number.monthly_recurring_cost || '0'),
      connection_id: number.connection_id,
      purchased_at: number.purchased_at
    }));

    // Sauvegarder en base
    for (const number of phoneNumbers) {
      await prisma.telnyxPhoneNumber.upsert({
        where: { id: number.id },
        update: {
          phoneNumber: number.phone_number,
          status: number.status,
          countryCode: number.country_code,
          numberType: number.number_type,
          features: number.features,
          monthlyCost: number.monthly_cost,
          connectionId: number.connection_id,
          updatedAt: new Date()
        },
        create: {
          id: number.id,
          phoneNumber: number.phone_number,
          status: number.status,
          countryCode: number.country_code,
          numberType: number.number_type,
          features: number.features,
          monthlyCost: number.monthly_cost,
          connectionId: number.connection_id,
          organizationId: organizationId,
          purchasedAt: new Date(number.purchased_at),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    console.log(`✅ [Telnyx API] ${phoneNumbers.length} numéros synchronisés`);
    res.json(phoneNumbers);
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur numéros:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des numéros' });
  }
});

router.post('/phone-numbers/purchase', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = purchaseNumberSchema.parse(req.body);
    console.log('🛒 [Telnyx API] Achat de numéro:', data);

    // Rechercher des numéros disponibles
    const searchResponse = await axios.get(`${TELNYX_API_URL}/available_phone_numbers`, {
      headers: telnyxHeaders,
      params: {
        'filter[country_code]': data.country,
        'filter[phone_number_type]': data.type,
        'filter[area_code]': data.area_code,
        'page[size]': 10
      }
    });

    if (!searchResponse.data.data.length) {
      return res.status(404).json({ error: 'Aucun numéro disponible avec ces critères' });
    }

    // Acheter le premier numéro disponible
    const availableNumber = searchResponse.data.data[0];
    const purchaseResponse = await axios.post(`${TELNYX_API_URL}/phone_number_orders`, {
      phone_numbers: [{ phone_number: availableNumber.phone_number }]
    }, { headers: telnyxHeaders });

    console.log('✅ [Telnyx API] Numéro acheté:', availableNumber.phone_number);
    res.json({ 
      success: true, 
      phone_number: availableNumber.phone_number,
      order_id: purchaseResponse.data.data.id 
    });
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur achat numéro:', error);
    res.status(500).json({ error: 'Erreur lors de l\'achat du numéro' });
  }
});

// --- APPELS ---
router.get('/calls', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const organizationId = req.user!.organizationId!;
    console.log(`🔍 [Telnyx API] Récupération des appels (${limit})...`);
    
    const calls = await prisma.telnyxCall.findMany({
      where: { organizationId: organizationId },
      orderBy: { startedAt: 'desc' },
      take: limit
    });

    const formattedCalls = calls.map(call => ({
      id: call.id,
      call_id: call.callId,
      from: call.fromNumber,
      to: call.toNumber,
      direction: call.direction,
      status: call.status,
      duration: call.duration || 0,
      cost: call.cost || 0,
      started_at: call.startedAt.toISOString(),
      ended_at: call.endedAt?.toISOString(),
      recording_url: call.recordingUrl,
      lead_id: call.leadId
    }));

    console.log(`✅ [Telnyx API] ${formattedCalls.length} appels récupérés`);
    res.json(formattedCalls);
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur récupération appels:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des appels' });
  }
});

router.post('/calls', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = makeCallSchema.parse(req.body);
    const organizationId = req.user!.organizationId!;
    console.log('📞 [Telnyx API] Initiation appel:', data);

    // Appel à l'API Telnyx
    const response = await axios.post(`${TELNYX_API_URL}/calls`, {
      to: data.to,
      from: data.from,
      connection_id: data.connection_id,
      webhook_url: data.webhook_url,
      command_id: `call-${Date.now()}`
    }, { headers: telnyxHeaders });

    const callData = response.data.data;

    // Sauvegarder en base
    const call = await prisma.telnyxCall.create({
      data: {
        id: `call-${Date.now()}`,
        callId: callData.call_control_id,
        fromNumber: data.from,
        toNumber: data.to,
        direction: 'outbound',
        status: 'in-progress',
        organizationId: organizationId,
        leadId: data.lead_id,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ [Telnyx API] Appel initié:', call.callId);
    res.json({
      id: call.id,
      call_id: call.callId,
      from: call.fromNumber,
      to: call.toNumber,
      status: call.status
    });
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur initiation appel:', error);
    res.status(500).json({ error: 'Erreur lors de l\'initiation de l\'appel' });
  }
});

router.post('/calls/:callId/hangup', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { callId } = req.params;
    const organizationId = req.user!.organizationId!;
    console.log('☎️ [Telnyx API] Raccrocher appel:', callId);

    // Rechercher l'appel en base
    const call = await prisma.telnyxCall.findFirst({
      where: { 
        callId: callId,
        organizationId: organizationId
      }
    });

    if (!call) {
      return res.status(404).json({ error: 'Appel non trouvé' });
    }

    // Raccrocher via Telnyx
    await axios.post(`${TELNYX_API_URL}/calls/${callId}/actions/hangup`, {}, {
      headers: telnyxHeaders
    });

    // Mettre à jour en base
    await prisma.telnyxCall.update({
      where: { id: call.id },
      data: {
        status: 'completed',
        endedAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ [Telnyx API] Appel raccroché:', callId);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur raccrocher:', error);
    res.status(500).json({ error: 'Erreur lors du raccrochage' });
  }
});

router.post('/calls/:callId/mute', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { callId } = req.params;
    console.log('🔇 [Telnyx API] Couper micro:', callId);

    await axios.post(`${TELNYX_API_URL}/calls/${callId}/actions/mute`, {}, {
      headers: telnyxHeaders
    });

    console.log('✅ [Telnyx API] Micro coupé:', callId);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur mute:', error);
    res.status(500).json({ error: 'Erreur lors de la coupure du micro' });
  }
});

router.post('/calls/:callId/unmute', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { callId } = req.params;
    console.log('🔊 [Telnyx API] Activer micro:', callId);

    await axios.post(`${TELNYX_API_URL}/calls/${callId}/actions/unmute`, {}, {
      headers: telnyxHeaders
    });

    console.log('✅ [Telnyx API] Micro activé:', callId);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur unmute:', error);
    res.status(500).json({ error: 'Erreur lors de l\'activation du micro' });
  }
});

// --- MESSAGES ---
router.get('/messages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const organizationId = req.user!.organizationId!;
    console.log(`🔍 [Telnyx API] Récupération des messages (${limit})...`);
    
    const messages = await prisma.telnyxMessage.findMany({
      where: { organizationId: organizationId },
      orderBy: { sentAt: 'desc' },
      take: limit
    });

    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      message_id: msg.messageId,
      from: msg.fromNumber,
      to: msg.toNumber,
      direction: msg.direction,
      type: msg.type,
      text: msg.text,
      status: msg.status,
      cost: msg.cost || 0,
      sent_at: msg.sentAt.toISOString(),
      delivered_at: msg.deliveredAt?.toISOString(),
      media_urls: msg.mediaUrls || [],
      lead_id: msg.leadId
    }));

    console.log(`✅ [Telnyx API] ${formattedMessages.length} messages récupérés`);
    res.json(formattedMessages);
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur récupération messages:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des messages' });
  }
});

router.post('/messages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = sendMessageSchema.parse(req.body);
    const organizationId = req.user!.organizationId!;
    console.log('💬 [Telnyx API] Envoi message:', data);

    // Envoi via Telnyx
    const response = await axios.post(`${TELNYX_API_URL}/messages`, {
      to: data.to,
      from: data.from,
      text: data.text,
      type: data.type,
      media_urls: data.media_urls,
      webhook_url: `${process.env.APP_URL}/api/telnyx/webhooks/messages`
    }, { headers: telnyxHeaders });

    const messageData = response.data.data;

    // Sauvegarder en base
    const message = await prisma.telnyxMessage.create({
      data: {
        id: `msg-${Date.now()}`,
        messageId: messageData.id,
        fromNumber: data.from,
        toNumber: data.to,
        direction: 'outbound',
        type: data.type,
        text: data.text,
        status: 'sent',
        organizationId: organizationId,
        leadId: data.lead_id,
        mediaUrls: data.media_urls || [],
        sentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ [Telnyx API] Message envoyé:', message.messageId);
    res.json({
      id: message.id,
      message_id: message.messageId,
      status: message.status
    });
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur envoi message:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
  }
});

// --- WEBHOOKS ---
router.post('/webhooks/calls', async (req: Request, res: Response) => {
  try {
    const webhook = req.body;
    console.log('🪝 [Telnyx Webhook] Appel:', webhook.data?.event_type);

    const callData = webhook.data?.payload;
    if (!callData) {
      return res.json({ received: true });
    }

    // Mettre à jour l'appel en base
    const call = await prisma.telnyxCall.findFirst({
      where: { callId: callData.call_control_id }
    });

    if (call) {
      const updateData: TelnyxCallUpdateData = {
        status: callData.state || call.status,
        updatedAt: new Date()
      };

      if (callData.state === 'bridged') {
        updateData.startedAt = new Date();
      } else if (['hangup', 'completed'].includes(callData.state)) {
        updateData.endedAt = new Date();
        updateData.duration = callData.hangup_duration_millis ? 
          Math.floor(callData.hangup_duration_millis / 1000) : 0;
      }

      await prisma.telnyxCall.update({
        where: { id: call.id },
        data: updateData
      });

      console.log(`✅ [Telnyx Webhook] Appel mis à jour: ${call.callId} -> ${callData.state}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('❌ [Telnyx Webhook] Erreur appel:', error);
    res.status(500).json({ error: 'Erreur webhook appel' });
  }
});

router.post('/webhooks/messages', async (req: Request, res: Response) => {
  try {
    const webhook = req.body;
    console.log('🪝 [Telnyx Webhook] Message:', webhook.data?.event_type);

    const messageData = webhook.data?.payload;
    if (!messageData) {
      return res.json({ received: true });
    }

    // Traiter selon le type d'événement
    const eventType = webhook.data.event_type;
    
    if (eventType === 'message.received') {
      // Message entrant
      await prisma.telnyxMessage.create({
        data: {
          id: `msg-${Date.now()}`,
          messageId: messageData.id,
          fromNumber: messageData.from.phone_number,
          toNumber: messageData.to[0].phone_number,
          direction: 'inbound',
          type: messageData.type,
          text: messageData.text,
          status: 'delivered',
          organizationId: 'default', // TODO: déterminer l'organisation
          sentAt: new Date(messageData.received_at),
          deliveredAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      console.log('✅ [Telnyx Webhook] Message entrant sauvegardé:', messageData.id);
    } else if (eventType === 'message.sent') {
      // Mettre à jour le statut du message sortant
      const message = await prisma.telnyxMessage.findFirst({
        where: { messageId: messageData.id }
      });

      if (message) {
        await prisma.telnyxMessage.update({
          where: { id: message.id },
          data: {
            status: 'delivered',
            deliveredAt: new Date(),
            updatedAt: new Date()
          }
        });

        console.log('✅ [Telnyx Webhook] Message livré:', messageData.id);
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('❌ [Telnyx Webhook] Erreur message:', error);
    res.status(500).json({ error: 'Erreur webhook message' });
  }
});

// --- SYNCHRONISATION ---
router.post('/sync', async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('🔄 [Telnyx API] Synchronisation complète...');
    
    const organizationId = req.user!.organizationId!;

    // Synchroniser toutes les données
    const [connectionsRes, numbersRes] = await Promise.all([
      axios.get(`${TELNYX_API_URL}/connections`, { headers: telnyxHeaders }),
      axios.get(`${TELNYX_API_URL}/phone_numbers`, { 
        headers: telnyxHeaders,
        params: { 'page[size]': 250 }
      })
    ]);

    // Mettre à jour les connexions
    for (const conn of connectionsRes.data.data) {
      await prisma.telnyxConnection.upsert({
        where: { id: conn.id },
        update: {
          name: conn.connection_name || `Connection ${conn.id.substring(0, 8)}`,
          status: conn.active ? 'active' : 'inactive',
          type: conn.outbound?.type || 'voice',
          webhookUrl: conn.webhook_event_url,
          updatedAt: new Date()
        },
        create: {
          id: conn.id,
          name: conn.connection_name || `Connection ${conn.id.substring(0, 8)}`,
          status: conn.active ? 'active' : 'inactive',
          type: conn.outbound?.type || 'voice',
          webhookUrl: conn.webhook_event_url,
          organizationId: organizationId,
          createdAt: new Date(conn.created_at),
          updatedAt: new Date()
        }
      });
    }

    // Mettre à jour les numéros
    for (const number of numbersRes.data.data) {
      await prisma.telnyxPhoneNumber.upsert({
        where: { id: number.id },
        update: {
          phoneNumber: number.phone_number,
          status: number.status,
          countryCode: number.country_code,
          numberType: number.phone_number_type,
          features: number.features || [],
          monthlyCost: parseFloat(number.monthly_recurring_cost || '0'),
          connectionId: number.connection_id,
          updatedAt: new Date()
        },
        create: {
          id: number.id,
          phoneNumber: number.phone_number,
          status: number.status,
          countryCode: number.country_code,
          numberType: number.phone_number_type,
          features: number.features || [],
          monthlyCost: parseFloat(number.monthly_recurring_cost || '0'),
          connectionId: number.connection_id,
          organizationId: organizationId,
          purchasedAt: new Date(number.purchased_at),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    console.log('✅ [Telnyx API] Synchronisation terminée');
    res.json({ 
      success: true,
      connections: connectionsRes.data.data.length,
      numbers: numbersRes.data.data.length
    });
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur synchronisation:', error);
    res.status(500).json({ error: 'Erreur lors de la synchronisation' });
  }
});

// --- CONFIGURATION UTILISATEUR ---
router.post('/user-config', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, assignedNumber, canMakeCalls, canSendSms, monthlyLimit } = req.body;
    const organizationId = req.user!.organizationId!;

    console.log('⚙️ [Telnyx API] Configuration utilisateur:', { userId, assignedNumber });

    // Créer ou mettre à jour la configuration utilisateur Telnyx
    const userConfig = await prisma.telnyxUserConfig.upsert({
      where: { userId: userId },
      update: {
        assignedNumber,
        canMakeCalls: canMakeCalls || false,
        canSendSms: canSendSms || false,
        monthlyLimit: monthlyLimit ? parseFloat(monthlyLimit) : null,
        updatedAt: new Date()
      },
      create: {
        userId,
        organizationId,
        assignedNumber,
        canMakeCalls: canMakeCalls || false,
        canSendSms: canSendSms || false,
        monthlyLimit: monthlyLimit ? parseFloat(monthlyLimit) : null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Si un numéro est assigné, le marquer comme utilisé
    if (assignedNumber) {
      await prisma.telnyxPhoneNumber.updateMany({
        where: { 
          phoneNumber: assignedNumber,
          organizationId: organizationId 
        },
        data: { 
          assignedUserId: userId,
          updatedAt: new Date()
        }
      });
      
      // Libérer les autres numéros de cet utilisateur
      await prisma.telnyxPhoneNumber.updateMany({
        where: { 
          assignedUserId: userId,
          phoneNumber: { not: assignedNumber },
          organizationId: organizationId 
        },
        data: { 
          assignedUserId: null,
          updatedAt: new Date()
        }
      });
    } else {
      // Libérer tous les numéros de cet utilisateur
      await prisma.telnyxPhoneNumber.updateMany({
        where: { 
          assignedUserId: userId,
          organizationId: organizationId 
        },
        data: { 
          assignedUserId: null,
          updatedAt: new Date()
        }
      });
    }

    console.log('✅ [Telnyx API] Configuration utilisateur sauvegardée');
    res.json({ success: true, config: userConfig });
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur config utilisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde de la configuration' });
  }
});

router.get('/user-config/:userId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const organizationId = req.user!.organizationId!;

    console.log('🔍 [Telnyx API] Récupération config utilisateur:', userId);

    const userConfig = await prisma.telnyxUserConfig.findFirst({
      where: { 
        userId: userId,
        organizationId: organizationId 
      }
    });

    res.json(userConfig || {
      userId,
      organizationId,
      canMakeCalls: false,
      canSendSms: false,
      assignedNumber: null,
      monthlyLimit: null
    });
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur récupération config:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la configuration' });
  }
});

router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId!;
    console.log('📊 [Telnyx API] Récupération statistiques...');

    const [totalCalls, totalSms, activeNumbers] = await Promise.all([
      prisma.telnyxCall.count({
        where: { 
          organizationId: organizationId,
          startedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        }
      }),
      prisma.telnyxMessage.count({
        where: { 
          organizationId: organizationId,
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        }
      }),
      prisma.telnyxPhoneNumber.count({
        where: { 
          organizationId: organizationId,
          status: 'active'
        }
      })
    ]);

    // Calculer le coût mensuel (approximatif)
    const calls = await prisma.telnyxCall.findMany({
      where: { 
        organizationId: organizationId,
        startedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
      },
      select: { cost: true }
    });

    const numbers = await prisma.telnyxPhoneNumber.findMany({
      where: { 
        organizationId: organizationId,
        status: 'active'
      },
      select: { monthlyCost: true }
    });

    const callsCost = calls.reduce((sum, call) => sum + (call.cost || 0), 0);
    const numbersCost = numbers.reduce((sum, number) => sum + (number.monthlyCost || 0), 0);
    const monthlyCost = callsCost + numbersCost;

    console.log('✅ [Telnyx API] Statistiques récupérées');
    res.json({
      totalCalls,
      totalSms,
      activeNumbers,
      monthlyCost
    });
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur stats:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

export default router;
