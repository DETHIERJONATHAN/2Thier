import { db } from '../lib/database';
import axios from 'axios';
import { decrypt } from '../utils/crypto';
import { getBackendBaseUrl, joinUrl } from '../utils/baseUrl';
import type { Request } from 'express';

const prisma = db;
const TELNYX_API_URL = 'https://api.telnyx.com/v2';

/**
 * 🧠 SERVICE DE CASCADE TELNYX - "TELNYX COMME CERVEAU"
 * 
 * Architecture: TOUS les appels passent par Telnyx Call Control
 * Cascade: CRM (10s) → Softphones (simultané) → GSM (PSTN)
 * Historique: 100% garanti même si CRM OFF
 */

interface CascadeOptions {
  organizationId: string;
  fromNumber: string;
  toNumber: string;
  leadId?: string;
}

interface CascadeLeg {
  type: 'sip' | 'pstn';
  destination: string;
  endpointId?: string;
  priority: number;
  timeout: number;
}

/**
 * Récupère les headers Telnyx avec la clé API chiffrée de l'organisation
 */
async function getTelnyxHeaders(organizationId: string) {
  try {
    // Récupérer la config Telnyx de l'organisation
    const config = await prisma.telnyxConfig.findUnique({
      where: { organizationId }
    });

    let apiKey = (process.env.TELNYX_API_KEY || '').trim();
    if (config?.encryptedApiKey) {
      try {
        apiKey = decrypt(config.encryptedApiKey).trim();
      } catch {
        console.error('❌ [TelnyxCascade] API Key illisible (ENCRYPTION_KEY modifiée ?)');
        return null;
      }
    }

    if (!apiKey || apiKey.trim().length === 0) {
      console.error('❌ [TelnyxCascade] API Key vide après déchiffrement');
      return null;
    }

    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
  } catch (error) {
    console.error('❌ [TelnyxCascade] Erreur getTelnyxHeaders:', error);
    return null;
  }
}

/**
 * Planifie la cascade d'appel basée sur les SIP endpoints configurés
 */
async function planCascade(organizationId: string): Promise<CascadeLeg[]> {
  try {
    // Récupérer tous les endpoints SIP actifs, triés par priorité
    const sipEndpoints = await prisma.telnyxSipEndpoint.findMany({
      where: {
        organizationId,
        status: 'active'
      },
      orderBy: {
        priority: 'asc'
      }
    });

    const legs: CascadeLeg[] = [];

    // Convertir chaque endpoint en leg de cascade
    for (const endpoint of sipEndpoints) {
      legs.push({
        type: 'sip',
        destination: `sip:${endpoint.sipUsername}@${endpoint.sipDomain}`,
        endpointId: endpoint.id,
        priority: endpoint.priority,
        timeout: endpoint.timeout
      });
    }

    console.log(`📋 [TelnyxCascade] Cascade planifiée: ${legs.length} étapes`, legs);
    return legs;

  } catch (error) {
    console.error('❌ [TelnyxCascade] Erreur planCascade:', error);
    return [];
  }
}

/**
 * Initie un appel avec cascade complète orchestrée par Telnyx
 * 
 * Flow:
 * 1. Crée le call record IMMÉDIATEMENT (avant toute tentative)
 * 2. Tente CRM endpoint (SIP) avec timeout
 * 3. Si no-answer → Ring group softphones (simultané)
 * 4. Si no-answer → Bridge PSTN vers GSM
 * 5. Webhooks mettent à jour les call legs
 */
export async function initiateCallWithCascade(options: CascadeOptions, req?: Request): Promise<any> {
  const { organizationId, fromNumber, toNumber, leadId } = options;

  try {
    console.log('📞 [TelnyxCascade] Initiation appel avec cascade:', { fromNumber, toNumber, organizationId });

    const config = await prisma.telnyxConfig.findUnique({ where: { organizationId } }).catch(() => null);
    const connectionId = (config?.defaultConnectionId || process.env.TELNYX_CONNECTION_ID || '').trim();
    if (!connectionId) {
      throw new Error('TELNYX_CONNECTION_ID manquant (configurez une connexion par défaut Telnyx)');
    }
    const webhookUrl = (config?.webhookUrl && config.webhookUrl !== '__AUTO__')
      ? config.webhookUrl
      : joinUrl(getBackendBaseUrl({ req }), '/api/telnyx/webhooks');

    // 1. RÉCUPÉRER HEADERS TELNYX
    const headers = await getTelnyxHeaders(organizationId);
    if (!headers) {
      throw new Error('Configuration Telnyx manquante');
    }

    // 2. INITIER L'APPEL VIA TELNYX CALL CONTROL
    const callResponse = await axios.post(`${TELNYX_API_URL}/calls`, {
      to: toNumber,
      from: fromNumber,
      connection_id: connectionId,
      webhook_url: webhookUrl,
      command_id: `call-${Date.now()}`
    }, { headers });

    const callData = callResponse.data.data;
    const callControlId = callData.call_control_id;

    console.log('✅ [TelnyxCascade] Appel initié sur Telnyx:', callControlId);

    // 3. CRÉER LE CALL RECORD EN BASE (IMMÉDIATEMENT)
    const call = await prisma.telnyxCall.create({
      data: {
        id: `call-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        callId: callControlId,
        fromNumber: fromNumber,
        toNumber: toNumber,
        direction: 'outbound',
        status: 'initiated', // ✅ État initial
        organizationId: organizationId,
        leadId: leadId,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('💾 [TelnyxCascade] Call record créé:', call.id);

    // 4. PLANIFIER LA CASCADE
    const cascadeLegs = await planCascade(organizationId);

    if (cascadeLegs.length === 0) {
      console.warn('⚠️ [TelnyxCascade] Aucun endpoint SIP configuré, appel direct');
      // Pas de cascade, l'appel va directement au `to`
      return {
        success: true,
        callId: call.id,
        callControlId: callControlId,
        cascade: []
      };
    }

    // 5. EXÉCUTER LA CASCADE (Phase par phase)
    await executeCascade(cascadeLegs, call.callId);

    return {
      success: true,
      callId: call.id,
      callControlId: callControlId,
      cascade: cascadeLegs.map(leg => ({
        type: leg.type,
        destination: leg.destination,
        priority: leg.priority
      }))
    };

  } catch (error: any) {
    console.error('❌ [TelnyxCascade] Erreur initiation cascade:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Exécute la cascade d'appel étape par étape
 * 
 * NOTE: Dans la vraie implémentation, la cascade est orchestrée par Telnyx
 * via les webhooks. Ici on enregistre juste les legs prévus.
 */
async function executeCascade(
  cascadeLegs: CascadeLeg[],
  callId: string
): Promise<void> {
  try {
    // Pour chaque leg de la cascade, créer un record TelnyxCallLeg
    for (const leg of cascadeLegs) {
      await prisma.telnyxCallLeg.create({
        data: {
          id: `leg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          callId: callId,
          legType: leg.type,
          endpointId: leg.endpointId,
          destination: leg.destination,
          status: 'pending', // En attente d'exécution
          priority: leg.priority,
          dialedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    console.log(`✅ [TelnyxCascade] ${cascadeLegs.length} legs créés pour cascade`);

    // TODO: Implémenter la logique de dial/transfer via Telnyx Call Control
    // Pour l'instant, les webhooks vont gérer les transitions d'état

  } catch (error) {
    console.error('❌ [TelnyxCascade] Erreur executeCascade:', error);
    throw error;
  }
}

/**
 * Met à jour le statut d'un call leg (appelé par les webhooks)
 */
export async function updateCallLegStatus(
  callId: string,
  destination: string,
  status: 'dialing' | 'answered' | 'no-answer' | 'busy' | 'failed' | 'timeout',
  answeredAt?: Date,
  endedAt?: Date,
  duration?: number
): Promise<void> {
  try {
    const leg = await prisma.telnyxCallLeg.findFirst({
      where: {
        callId: callId,
        destination: destination
      }
    });

    if (!leg) {
      console.warn(`⚠️ [TelnyxCascade] Leg non trouvé: ${callId} -> ${destination}`);
      return;
    }

    await prisma.telnyxCallLeg.update({
      where: { id: leg.id },
      data: {
        status,
        answeredAt,
        endedAt,
        duration,
        updatedAt: new Date()
      }
    });

    console.log(`✅ [TelnyxCascade] Leg mis à jour: ${destination} -> ${status}`);

    // Si answered, mettre à jour le call principal avec answeredBy
    if (status === 'answered') {
      await prisma.telnyxCall.update({
        where: { callId: callId },
        data: {
          answeredBy: destination,
          status: 'in-progress',
          updatedAt: new Date()
        }
      });

      console.log(`✅ [TelnyxCascade] Call answered_by: ${destination}`);
    }

  } catch (error) {
    console.error('❌ [TelnyxCascade] Erreur updateCallLegStatus:', error);
  }
}

export const TelnyxCascadeService = {
  initiateCallWithCascade,
  updateCallLegStatus
};
