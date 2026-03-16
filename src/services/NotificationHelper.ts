/**
 * NotificationHelper — Point d'entrée unique pour créer des notifications CRM.
 * 
 * Usage: import { notify } from '../services/NotificationHelper';
 *        await notify.leadReceived(orgId, { leadName, source }, userId, '/leads/123');
 * 
 * Toutes les méthodes sont fire-and-forget : elles ne bloquent jamais le flux principal.
 */
import { db } from '../lib/database';
import { v4 as uuidv4 } from 'uuid';

type Priority = 'low' | 'normal' | 'high' | 'urgent';

interface NotifPayload {
  organizationId: string;
  type: string;
  data: Record<string, unknown>;
  userId?: string | null;
  priority?: Priority;
  actionUrl?: string | null;
}

async function createNotification(payload: NotifPayload): Promise<void> {
  try {
    await db.notification.create({
      data: {
        id: uuidv4(),
        organizationId: payload.organizationId,
        type: payload.type as any,
        data: {
          ...payload.data,
          timestamp: new Date().toISOString(),
        },
        userId: payload.userId ?? undefined,
        priority: payload.priority || 'normal',
        actionUrl: payload.actionUrl ?? undefined,
        status: 'PENDING',
        updatedAt: new Date(),
      },
    });
  } catch (err) {
    // Ne jamais bloquer le flux principal
    console.error(`[NotificationHelper] Erreur création notification (${payload.type}):`, err);
  }
}

/** Notifie plusieurs utilisateurs en parallèle (ex: tous les admins d'une org) */
async function notifyMultipleUsers(
  userIds: string[],
  payload: Omit<NotifPayload, 'userId'>
): Promise<void> {
  await Promise.allSettled(
    userIds.map(uid => createNotification({ ...payload, userId: uid }))
  );
}

/** Récupère les admins d'une organisation */
async function getOrgAdminIds(organizationId: string): Promise<string[]> {
  try {
    const admins = await db.userOrganization.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        Role: { name: { in: ['admin', 'super_admin', 'Admin'] } },
      },
      select: { userId: true },
    });
    return admins.map(a => a.userId);
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════
// MÉTHODES MÉTIER — API publique du helper
// ═══════════════════════════════════════════════════════

export const notify = {

  // ───────── LEADS ─────────
  async leadReceived(orgId: string, leadData: { name: string; source?: string; email?: string; phone?: string }, assignedToId?: string | null, leadId?: string) {
    const adminIds = await getOrgAdminIds(orgId);
    const allTargets = assignedToId ? [...new Set([...adminIds, assignedToId])] : adminIds;
    await notifyMultipleUsers(allTargets, {
      organizationId: orgId,
      type: 'NEW_LEAD_RECEIVED',
      priority: 'high',
      actionUrl: leadId ? `/leads?id=${leadId}` : '/leads',
      data: {
        message: `📥 Nouveau lead : ${leadData.name}`,
        leadName: leadData.name,
        source: leadData.source || 'formulaire',
        email: leadData.email,
        phone: leadData.phone,
        icon: 'user-plus',
        category: 'leads',
      },
    });
  },

  async leadAssigned(orgId: string, leadData: { name: string; assignedToName?: string }, assignedToId: string, leadId?: string) {
    await createNotification({
      organizationId: orgId,
      type: 'NEW_LEAD_ASSIGNED',
      userId: assignedToId,
      priority: 'high',
      actionUrl: leadId ? `/leads?id=${leadId}` : '/leads',
      data: {
        message: `🎯 Lead "${leadData.name}" vous a été assigné`,
        leadName: leadData.name,
        assignedToName: leadData.assignedToName,
        icon: 'target',
        category: 'leads',
      },
    });
  },

  async leadStatusChanged(orgId: string, leadData: { name: string; oldStatus: string; newStatus: string }, targetUserId?: string | null, leadId?: string) {
    const targets = targetUserId ? [targetUserId] : await getOrgAdminIds(orgId);
    await notifyMultipleUsers(targets, {
      organizationId: orgId,
      type: 'LEAD_STATUS_CHANGED',
      priority: 'normal',
      actionUrl: leadId ? `/leads?id=${leadId}` : '/leads',
      data: {
        message: `📋 Lead "${leadData.name}" : ${leadData.oldStatus} → ${leadData.newStatus}`,
        leadName: leadData.name,
        oldStatus: leadData.oldStatus,
        newStatus: leadData.newStatus,
        icon: 'arrow-right',
        category: 'leads',
      },
    });
  },

  // ───────── FORMULAIRES ─────────
  async formSubmission(orgId: string, formData: { formName: string; formSlug: string; contactName: string; contactEmail?: string; contactPhone?: string; source?: string }, leadId?: string | null) {
    const adminIds = await getOrgAdminIds(orgId);
    await notifyMultipleUsers(adminIds, {
      organizationId: orgId,
      type: 'FORM_SUBMISSION_RECEIVED',
      priority: 'high',
      actionUrl: leadId ? `/leads?id=${leadId}` : '/parametres/formulaires',
      data: {
        message: `📋 Nouvelle soumission "${formData.formName}" de ${formData.contactName}`,
        formName: formData.formName,
        formSlug: formData.formSlug,
        contactName: formData.contactName,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        source: formData.source || 'website',
        icon: 'file-text',
        category: 'forms',
      },
    });
  },

  // ───────── INVITATIONS ─────────
  async invitationCreated(orgId: string, data: { email: string; roleName: string }, inviterId: string) {
    await createNotification({
      organizationId: orgId,
      type: 'INVITATION_CREATED',
      userId: inviterId,
      priority: 'normal',
      actionUrl: '/parametres/utilisateurs',
      data: {
        message: `✉️ Invitation envoyée à ${data.email} (${data.roleName})`,
        email: data.email,
        roleName: data.roleName,
        icon: 'mail',
        category: 'invitations',
      },
    });
  },

  async invitationAccepted(orgId: string, data: { email: string; userName?: string }) {
    const adminIds = await getOrgAdminIds(orgId);
    await notifyMultipleUsers(adminIds, {
      organizationId: orgId,
      type: 'INVITATION_ACCEPTED',
      priority: 'high',
      actionUrl: '/parametres/utilisateurs',
      data: {
        message: `🎉 ${data.userName || data.email} a accepté l'invitation !`,
        email: data.email,
        userName: data.userName,
        icon: 'user-check',
        category: 'invitations',
      },
    });
  },

  async joinRequestReceived(orgId: string, data: { userName: string; userId: string; message?: string }) {
    const adminIds = await getOrgAdminIds(orgId);
    await notifyMultipleUsers(adminIds, {
      organizationId: orgId,
      type: 'JOIN_REQUEST_RECEIVED',
      priority: 'high',
      actionUrl: '/parametres/utilisateurs',
      data: {
        message: `🙋 ${data.userName} demande à rejoindre l'organisation`,
        userName: data.userName,
        requestMessage: data.message,
        icon: 'user-plus',
        category: 'invitations',
      },
    });
  },

  async joinRequestApproved(orgId: string, data: { userName: string }, targetUserId: string) {
    await createNotification({
      organizationId: orgId,
      type: 'JOIN_REQUEST_APPROVED',
      userId: targetUserId,
      priority: 'high',
      data: {
        message: `✅ Votre demande d'adhésion a été approuvée !`,
        userName: data.userName,
        icon: 'check-circle',
        category: 'invitations',
      },
    });
  },

  async joinRequestRejected(orgId: string, data: { userName: string; reason?: string }, targetUserId: string) {
    await createNotification({
      organizationId: orgId,
      type: 'JOIN_REQUEST_REJECTED',
      userId: targetUserId,
      priority: 'normal',
      data: {
        message: `❌ Votre demande d'adhésion a été refusée${data.reason ? ` : ${data.reason}` : ''}`,
        userName: data.userName,
        reason: data.reason,
        icon: 'x-circle',
        category: 'invitations',
      },
    });
  },

  // ───────── DEVIS ─────────
  async quoteStatusChanged(orgId: string, quoteData: { title: string; from: string; to: string; quoteId: string }, targetUserId?: string | null) {
    const statusLabels: Record<string, string> = {
      DRAFT: 'Brouillon', SENT: 'Envoyé', ACCEPTED: 'Accepté',
      REJECTED: 'Rejeté', CANCELLED: 'Annulé', EXPIRED: 'Expiré',
    };
    const isAccepted = quoteData.to === 'ACCEPTED';
    const isRejected = quoteData.to === 'REJECTED';
    const icon = isAccepted ? '✅' : isRejected ? '❌' : '📄';
    const priority: Priority = isAccepted ? 'urgent' : isRejected ? 'high' : 'normal';
    const type = isAccepted ? 'QUOTE_ACCEPTED' : isRejected ? 'QUOTE_REJECTED' : 'QUOTE_SENT';

    const targets = targetUserId ? [targetUserId] : await getOrgAdminIds(orgId);
    await notifyMultipleUsers(targets, {
      organizationId: orgId,
      type,
      priority,
      actionUrl: `/devis?id=${quoteData.quoteId}`,
      data: {
        message: `${icon} Devis "${quoteData.title}" : ${statusLabels[quoteData.from] || quoteData.from} → ${statusLabels[quoteData.to] || quoteData.to}`,
        quoteTitle: quoteData.title,
        from: quoteData.from,
        to: quoteData.to,
        category: 'quotes',
        icon: isAccepted ? 'check-circle' : isRejected ? 'x-circle' : 'file-text',
      },
    });
  },

  // ───────── DOCUMENTS & E-SIGNATURE ─────────
  async documentSigned(orgId: string, data: { signerName: string; signerEmail: string; documentId?: string }, targetUserIds?: string[]) {
    const targets = targetUserIds?.length ? targetUserIds : await getOrgAdminIds(orgId);
    await notifyMultipleUsers(targets, {
      organizationId: orgId,
      type: 'DOCUMENT_SIGNED',
      priority: 'urgent',
      actionUrl: data.documentId ? `/documents?id=${data.documentId}` : '/documents',
      data: {
        message: `✍️ Document signé par ${data.signerName} (${data.signerEmail})`,
        signerName: data.signerName,
        signerEmail: data.signerEmail,
        icon: 'pen-tool',
        category: 'documents',
      },
    });
  },

  // ───────── CALENDRIER ─────────
  async calendarEventCreated(orgId: string, eventData: { title: string; startDate: string; creatorName?: string }, participantIds: string[], eventId?: string) {
    await notifyMultipleUsers(participantIds, {
      organizationId: orgId,
      type: 'CALENDAR_EVENT_INVITATION',
      priority: 'normal',
      actionUrl: '/calendrier',
      data: {
        message: `📅 Nouvel événement : "${eventData.title}" le ${new Date(eventData.startDate).toLocaleDateString('fr-BE')}`,
        eventTitle: eventData.title,
        startDate: eventData.startDate,
        creatorName: eventData.creatorName,
        icon: 'calendar',
        category: 'calendar',
      },
    });
  },

  async calendarEventUpdated(orgId: string, eventData: { title: string }, participantIds: string[]) {
    await notifyMultipleUsers(participantIds, {
      organizationId: orgId,
      type: 'CALENDAR_EVENT_UPDATED',
      priority: 'normal',
      actionUrl: '/calendrier',
      data: {
        message: `📅 Événement modifié : "${eventData.title}"`,
        eventTitle: eventData.title,
        icon: 'calendar',
        category: 'calendar',
      },
    });
  },

  async calendarEventCancelled(orgId: string, eventData: { title: string }, participantIds: string[]) {
    await notifyMultipleUsers(participantIds, {
      organizationId: orgId,
      type: 'CALENDAR_EVENT_CANCELLED',
      priority: 'high',
      actionUrl: '/calendrier',
      data: {
        message: `🗑️ Événement annulé : "${eventData.title}"`,
        eventTitle: eventData.title,
        icon: 'calendar-x',
        category: 'calendar',
      },
    });
  },

  // ───────── CHANTIERS ─────────
  async chantierInvoiceCreated(orgId: string, data: { chantierName: string; amount?: number }, targetUserIds?: string[]) {
    const targets = targetUserIds?.length ? targetUserIds : await getOrgAdminIds(orgId);
    await notifyMultipleUsers(targets, {
      organizationId: orgId,
      type: 'CHANTIER_INVOICE_CREATED',
      priority: 'normal',
      actionUrl: '/chantiers',
      data: {
        message: `🧾 Nouvelle facture pour le chantier "${data.chantierName}"${data.amount ? ` — ${data.amount}€` : ''}`,
        chantierName: data.chantierName,
        amount: data.amount,
        icon: 'receipt',
        category: 'chantiers',
      },
    });
  },

  // ───────── TELNYX / TÉLÉPHONIE ─────────
  async missedCall(orgId: string, callData: { fromNumber: string; toNumber: string }, targetUserId?: string | null) {
    const targets = targetUserId ? [targetUserId] : await getOrgAdminIds(orgId);
    await notifyMultipleUsers(targets, {
      organizationId: orgId,
      type: 'MISSED_CALL',
      priority: 'urgent',
      actionUrl: '/telephonie',
      data: {
        message: `📞 Appel manqué de ${callData.fromNumber}`,
        fromNumber: callData.fromNumber,
        toNumber: callData.toNumber,
        icon: 'phone-missed',
        category: 'telephony',
      },
    });
  },

  async incomingSms(orgId: string, smsData: { fromNumber: string; text: string }, targetUserId?: string | null) {
    const targets = targetUserId ? [targetUserId] : await getOrgAdminIds(orgId);
    await notifyMultipleUsers(targets, {
      organizationId: orgId,
      type: 'INCOMING_SMS',
      priority: 'normal',
      actionUrl: '/telephonie',
      data: {
        message: `💬 SMS reçu de ${smsData.fromNumber}: "${smsData.text.substring(0, 80)}${smsData.text.length > 80 ? '...' : ''}"`,
        fromNumber: smsData.fromNumber,
        text: smsData.text.substring(0, 500),
        icon: 'message-square',
        category: 'telephony',
      },
    });
  },

  // ───────── IA DIGEST ─────────
  async aiDailyDigest(orgId: string, digestData: { summary: string; stats: Record<string, unknown> }, targetUserId: string) {
    await createNotification({
      organizationId: orgId,
      type: 'AI_DAILY_DIGEST',
      userId: targetUserId,
      priority: 'low',
      actionUrl: '/dashboard',
      data: {
        message: `🤖 ${digestData.summary}`,
        stats: digestData.stats,
        icon: 'brain',
        category: 'ai',
      },
    });
  },
};

export default notify;
