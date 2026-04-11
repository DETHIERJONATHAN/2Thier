/**
 * business-auto-post.ts — Service de création automatique de posts sociaux
 * lors d'événements business (devis signé, facture payée, chantier, tâche, etc.)
 * 
 * Workflow : Événement business → Vérification SocialSettings → 3 WallPosts créés :
 *   1. Post CLIENT (privé, visible uniquement par le client concerné)
 *   2. Post IN (annonce interne Colony)
 *   3. Post ALL (publication publique / publicité)
 * 
 * Usage depuis n'importe quelle route backend :
 *   import { createBusinessAutoPost } from '../services/business-auto-post';
 *   await createBusinessAutoPost({ orgId, userId, eventType: 'devis_signed', entityId, entityLabel });
 */

import { db } from '../lib/database';
import { getOrgSocialSettings } from '../lib/feed-visibility';
import { sendPushToUser } from '../routes/push';

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

export type BusinessEventType =
  | 'devis_signed'
  | 'invoice_paid'
  | 'chantier_created'
  | 'chantier_completed'
  | 'new_client'
  | 'calendar_event'
  | 'task_completed';

interface AutoPostParams {
  orgId: string;
  userId: string;           // User who triggered the event
  eventType: BusinessEventType;
  entityId?: string;        // ID of the entity (devis, chantier, etc.)
  entityLabel: string;      // Human-readable label (e.g., "Devis #2024-001")
  targetLeadId?: string;    // Lead/Client concerned (for CLIENT post)
  clientName?: string;      // Name of the client for the posts
  amount?: number;          // Amount (for devis/invoice)
  extraContent?: string;    // Additional content for the posts
}

// ═══════════════════════════════════════════════════════
// EVENT → SETTING MAPPING
// ═══════════════════════════════════════════════════════

const EVENT_SETTING_MAP: Record<BusinessEventType, string> = {
  devis_signed: 'autoPostOnDevisSigned',
  invoice_paid: 'autoPostOnInvoicePaid',
  chantier_created: 'autoPostOnChantierCreated',
  chantier_completed: 'autoPostOnChantierCompleted',
  new_client: 'autoPostOnNewClient',
  calendar_event: 'autoPostOnCalendarEvent',
  task_completed: 'autoPostOnTaskCompleted',
};

const EVENT_LABELS: Record<BusinessEventType, { emoji: string; action: string; publicAction: string }> = {
  devis_signed: { emoji: '✅', action: 'Devis signé', publicAction: 'Nouveau projet validé' },
  invoice_paid: { emoji: '💰', action: 'Facture payée', publicAction: 'Projet en cours' },
  chantier_created: { emoji: '🏗️', action: 'Nouveau chantier lancé', publicAction: 'Nouveau chantier en préparation' },
  chantier_completed: { emoji: '🎉', action: 'Chantier terminé', publicAction: 'Projet réalisé avec succès' },
  new_client: { emoji: '🤝', action: 'Nouveau client', publicAction: 'Bienvenue à un nouveau membre' },
  calendar_event: { emoji: '📅', action: 'Événement planifié', publicAction: 'Événement à venir' },
  task_completed: { emoji: '✔️', action: 'Tâche accomplie', publicAction: 'Objectif atteint' },
};

// ═══════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════

export async function createBusinessAutoPost(params: AutoPostParams): Promise<{ created: number; postIds: string[] }> {
  const { orgId, userId, eventType, entityId, entityLabel, targetLeadId, clientName, amount, extraContent } = params;
  
  // 1. Check if this event type is enabled in SocialSettings
  const settings = await getOrgSocialSettings(orgId);
  const settingKey = EVENT_SETTING_MAP[eventType];
  if (!(settings as any)[settingKey]) {
    return { created: 0, postIds: [] };
  }

  const labels = EVENT_LABELS[eventType];
  const amountStr = amount ? ` (${amount.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })})` : '';
  const postIds: string[] = [];

  // 2. Post CLIENT — Privé pour le client concerné
  if (targetLeadId) {
    try {
      const clientPost = await db.wallPost.create({
        data: {
          organizationId: orgId,
          authorId: userId,
          content: `${labels.emoji} ${labels.action} — ${entityLabel}${amountStr}\n\n${extraContent || `Bonjour${clientName ? ' ' + clientName : ''}, votre ${entityLabel.toLowerCase()} a été traité avec succès.`}`,
          visibility: 'CLIENT',
          targetLeadId,
          publishAsOrg: true,
          crmEventType: eventType,
          crmEntityType: eventType.split('_')[0].toUpperCase(),
          crmEntityId: entityId,
          isPublished: true,
          publishedAt: new Date(),
        },
      });
      postIds.push(clientPost.id);
    } catch (err) {
      console.error(`[AUTO-POST] Error creating CLIENT post for ${eventType}:`, err);
    }
  }

  // 3. Post IN — Annonce interne Colony
  try {
    const internalPost = await db.wallPost.create({
      data: {
        organizationId: orgId,
        authorId: userId,
        content: `${labels.emoji} ${labels.action} — ${entityLabel}${amountStr}${clientName ? `\nClient : ${clientName}` : ''}${extraContent ? `\n${extraContent}` : ''}`,
        visibility: 'IN',
        publishAsOrg: true,
        crmEventType: eventType,
        crmEntityType: eventType.split('_')[0].toUpperCase(),
        crmEntityId: entityId,
        isPublished: true,
        publishedAt: new Date(),
      },
    });
    postIds.push(internalPost.id);
  } catch (err) {
    console.error(`[AUTO-POST] Error creating IN post for ${eventType}:`, err);
  }

  // 4. Post ALL — Publication publique (publicité)
  try {
    const publicPost = await db.wallPost.create({
      data: {
        organizationId: orgId,
        authorId: userId,
        content: `${labels.emoji} ${labels.publicAction}${amountStr ? '' : ''}\n\n${extraContent || `Encore un beau projet réalisé par notre Colony !`}`,
        visibility: settings.autoPostDefaultVisibility || 'ALL',
        publishAsOrg: true,
        crmEventType: eventType,
        crmEntityType: eventType.split('_')[0].toUpperCase(),
        crmEntityId: entityId,
        isPublished: true,
        publishedAt: new Date(),
      },
    });
    postIds.push(publicPost.id);
  } catch (err) {
    console.error(`[AUTO-POST] Error creating ALL post for ${eventType}:`, err);
  }

  // 5. Send push notification to org members about the internal post
  try {
    const orgMembers = await db.user.findMany({
      where: { organizationId: orgId, id: { not: userId } },
      select: { id: true },
    });
    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });
    for (const member of orgMembers) {
      sendPushToUser(member.id, {
        title: `${org?.name || 'Colony'} — ${labels.action}`,
        body: `${labels.emoji} ${entityLabel}${amountStr}`,
        icon: '/pwa-192x192.png',
        tag: `business-event-${eventType}-${entityId}`,
        url: '/dashboard',
        type: 'notification',
      }).catch(() => {});
    }
  } catch (err) {
    console.error(`[AUTO-POST] Error sending push for ${eventType}:`, err);
  }

  console.log(`[AUTO-POST] Created ${postIds.length} posts for ${eventType} (${entityLabel})`);
  return { created: postIds.length, postIds };
}
