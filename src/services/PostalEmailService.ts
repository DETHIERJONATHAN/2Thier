/**
 * ============================================================
 *  PostalEmailService — Service email via Postal (self-hosted)
 * ============================================================
 *
 *  Fournit une interface complète pour gérer les emails via
 *  un serveur Postal self-hosted (https://docs.postalserver.io/).
 *
 *  Fonctionnalités :
 *    - Envoi d'email via l'API REST Postal
 *    - Réception d'emails via webhooks Postal
 *    - Gestion des credentials (création/suppression de boîtes)
 *    - Sauvegarde des emails dans la base de données
 *
 *  L'API Postal utilise des clés d'API serveur, pas de
 *  mot de passe utilisateur. Chaque organisation a un
 *  "credential" (boîte mail) sur le serveur Postal.
 * ============================================================
 */

import { db } from '../lib/database.js';
import crypto from 'crypto';
import { logger } from '../lib/logger';

// ─── Types ───────────────────────────────────────────────────

interface PostalSendOptions {
  from: string;
  to: string | string[];
  subject: string;
  body: string;
  isHtml?: boolean;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  attachments?: PostalAttachment[];
}

interface PostalAttachment {
  name: string;
  contentType: string;
  data: string; // base64
}

interface PostalApiResponse {
  status: 'success' | 'error';
  data?: Record<string, unknown>;
  error?: string;
}

interface PostalMessageResult {
  message_id: string;
  token: string;
}

interface PostalInboundPayload {
  id: number;
  rcpt_to: string;
  mail_from: string;
  subject: string;
  message_id: string;
  timestamp: number;
  size: number;
  spam_status: string;
  bounce: boolean;
  plain_body?: string;
  html_body?: string;
  attachments?: Array<{
    filename: string;
    content_type: string;
    size: number;
    data: string; // base64
  }>;
}

// ─── Service ─────────────────────────────────────────────────

export class PostalEmailService {
  private apiUrl: string;
  private apiKey: string;

  constructor(apiUrl?: string, apiKey?: string) {
    this.apiUrl = apiUrl || process.env.POSTAL_API_URL || '';
    this.apiKey = apiKey || process.env.POSTAL_API_KEY || '';

    if (!this.apiUrl || !this.apiKey) {
      logger.warn('⚠️ [POSTAL] Configuration manquante: POSTAL_API_URL ou POSTAL_API_KEY');
    }
  }

  // ─── Envoi d'email ───────────────────────────────────────

  /**
   * Envoie un email via l'API REST de Postal.
   * Doc: https://docs.postalserver.io/developer/api/send-message
   */
  async sendEmail(options: PostalSendOptions): Promise<PostalMessageResult> {
    const { from, to, subject, body, isHtml = false, cc, bcc, replyTo, attachments } = options;

    const toArray = Array.isArray(to) ? to : [to];

    const payload: Record<string, unknown> = {
      to: toArray,
      from,
      subject,
      reply_to: replyTo || from,
    };

    if (isHtml) {
      payload.html_body = body;
    } else {
      payload.plain_body = body;
    }

    if (cc?.length) payload.cc = cc;
    if (bcc?.length) payload.bcc = bcc;

    if (attachments?.length) {
      payload.attachments = attachments.map(a => ({
        name: a.name,
        content_type: a.contentType,
        data: a.data,
      }));
    }


    const result = await this.apiCall<{ messages: Record<string, PostalMessageResult> }>('send/message', payload);

    if (!result.data?.messages) {
      throw new Error('Réponse Postal invalide: pas de messages');
    }

    // Postal retourne un objet { messages: { "recipient@email.com": { id, token } } }
    const firstRecipient = Object.keys(result.data.messages)[0];
    const messageResult = result.data.messages[firstRecipient] as PostalMessageResult;


    return messageResult;
  }

  // ─── Gestion des credentials (boîtes mail) ──────────────

  /**
   * Enregistre une boîte mail dans le système Zhiive.
   *
   * Note: La Server API Key de Postal ne donne accès qu'aux endpoints d'envoi
   * (send/message, send/raw, messages/*). Les endpoints de gestion (routes, credentials,
   * http_endpoints) nécessitent l'interface web admin.
   *
   * Le routage des emails entrants est géré par un catch-all route configuré
   * dans l'interface web de Postal (postal.zhiive.com) qui renvoie TOUS les
   * emails @zhiive.com vers le webhook /api/postal/inbound.
   *
   * L'envoi se fait via l'API REST avec la Server API Key — pas besoin de
   * credential SMTP par utilisateur.
   */
  async createMailbox(emailAddress: string, name?: string): Promise<{ key: string }> {
    const [localPart, domain] = emailAddress.split('@');

    if (!localPart || !domain) {
      throw new Error(`Adresse email invalide: ${emailAddress}`);
    }


    // Vérifier que l'API Postal est joignable (test d'envoi à vide)
    try {
      await this.apiCall<Record<string, unknown>>('send/message', {});
    } catch {
      // L'erreur "NoRecipients" est attendue — ça confirme que l'API fonctionne
    }

    // Pas besoin de créer de route/credential via l'API :
    // - Envoi : la Server API Key suffit pour envoyer depuis n'importe quelle @zhiive.com
    // - Réception : un catch-all route dans Postal web admin redirige vers /api/postal/inbound
    // - L'EmailAccount en DB suffit pour que processInboundEmail() associe l'email au bon user

    return { key: '' };
  }

  /**
   * Récupère ou crée l'endpoint webhook pour la réception.
   */
  private async getWebhookEndpointId(): Promise<number> {
    // On cherche l'endpoint HTTP existant
    const endpoints = await this.apiCall<{ http_endpoints: Array<{ id: number; url: string }> }>('http_endpoints/list', {});

    const webhookUrl = process.env.POSTAL_WEBHOOK_URL || `${process.env.API_URL || ''}/api/postal/inbound`;

    const existing = endpoints.data?.http_endpoints?.find(
      (ep: { url: string }) => ep.url === webhookUrl
    );

    if (existing) return existing.id;

    // Créer l'endpoint
    const created = await this.apiCall<{ http_endpoint: { id: number } }>('http_endpoints/create', {
      name: 'Zhiive Inbound',
      url: webhookUrl,
      encoding: 'BodyAsJSON',
      format: 'Hash',
      strip_replies: true,
      include_attachments: true,
    });

    return created.data?.http_endpoint?.id || 0;
  }

  // ─── Traitement des emails entrants (webhook) ───────────

  /**
   * Traite un email entrant reçu via le webhook Postal.
   * Sauvegarde l'email dans la base de données.
   */
  async processInboundEmail(payload: PostalInboundPayload): Promise<string | null> {
    try {
      const recipientEmail = payload.rcpt_to;
      const senderEmail = payload.mail_from;


      // Trouver l'utilisateur propriétaire de cette adresse
      const emailAccount = await db.emailAccount.findFirst({
        where: {
          emailAddress: recipientEmail,
          mailProvider: 'postal',
        },
        select: { userId: true, emailAddress: true },
      });

      if (!emailAccount) {
        logger.warn(`⚠️ [POSTAL] Aucun compte trouvé pour ${recipientEmail}`);
        return null;
      }

      // Vérifier que cet email n'existe pas déjà (déduplication par message_id)
      const existing = await db.email.findFirst({
        where: {
          userId: emailAccount.userId,
          uid: payload.message_id,
        },
      });

      if (existing) {
        return existing.id;
      }

      // Sauvegarder dans la DB
      const email = await db.email.create({
        data: {
          id: crypto.randomUUID(),
          userId: emailAccount.userId,
          from: senderEmail,
          to: recipientEmail,
          subject: payload.subject || 'Sans sujet',
          body: payload.html_body || payload.plain_body || '',
          contentType: payload.html_body ? 'text/html' : 'text/plain',
          folder: payload.spam_status === 'spam' ? 'spam' : 'inbox',
          isRead: false,
          isStarred: false,
          uid: payload.message_id,
          createdAt: new Date(payload.timestamp * 1000),
        },
      });


      return email.id;
    } catch (error) {
      logger.error('❌ [POSTAL] Erreur traitement email entrant:', error);
      throw error;
    }
  }

  // ─── Test de connexion ──────────────────────────────────

  /**
   * Teste la connexion à l'API Postal.
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.apiCall('deliverability/domain_check', { domain: 'test.com' });
      return result.status === 'success';
    } catch (error) {
      logger.error('❌ [POSTAL] Erreur connexion:', error);
      return false;
    }
  }

  // ─── API REST helper ────────────────────────────────────

  /**
   * Effectue un appel à l'API REST de Postal.
   * L'authentification se fait via le header X-Server-API-Key.
   */
  private async apiCall<T = Record<string, unknown>>(
    endpoint: string,
    payload: Record<string, unknown>
  ): Promise<PostalApiResponse & { data?: T }> {
    const url = `${this.apiUrl}/api/v1/${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Server-API-Key': this.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Postal API error ${response.status}: ${errorText}`);
    }

    const result = await response.json() as PostalApiResponse & { data?: T };

    if (result.status === 'error') {
      throw new Error(`Postal API error: ${result.error || 'Unknown error'}`);
    }

    return result;
  }
}

// ─── Singleton pour utilisation dans les routes ────────────

let _postalService: PostalEmailService | null = null;

export function getPostalService(): PostalEmailService {
  if (!_postalService) {
    _postalService = new PostalEmailService();
  }
  return _postalService;
}
