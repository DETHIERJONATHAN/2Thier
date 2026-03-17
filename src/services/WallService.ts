/**
 * WallService — Service centralisé pour créer des posts automatiques sur le mur
 * 
 * Chaque action CRM (signature, commande, planification, fin chantier, facture, etc.)
 * appelle ce service pour générer un post sur le mur.
 * 
 * Usage:
 *   import { WallService } from '../services/WallService';
 *   await WallService.onDevisSigne({ organizationId, authorId, leadId, chantierId, details });
 */

import { db } from '../lib/database';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface CrmEventContext {
  organizationId: string;
  authorId: string;          // User qui a déclenché l'action
  leadId?: string;           // Client concerné
  chantierId?: string;       // Chantier concerné
  details?: Record<string, any>; // Données additionnelles
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

async function getAuthorName(authorId: string): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: authorId },
    select: { firstName: true, lastName: true },
  });
  if (!user) return 'Système';
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Système';
}

async function getLeadName(leadId: string): Promise<string> {
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    select: { firstName: true, lastName: true, company: true },
  });
  if (!lead) return 'Client';
  const name = [lead.firstName, lead.lastName].filter(Boolean).join(' ');
  return lead.company ? `${name} (${lead.company})` : name || 'Client';
}

async function createAutoPost(params: {
  organizationId: string;
  authorId: string;
  content: string;
  visibility: 'OUT' | 'IN' | 'ALL' | 'CLIENT';
  targetLeadId?: string;
  crmEventType: string;
  crmEntityType?: string;
  crmEntityId?: string;
  category?: string;
  mediaUrls?: string[];
  mediaType?: string;
}) {
  try {
    const post = await db.wallPost.create({
      data: {
        organizationId: params.organizationId,
        authorId: params.authorId,
        content: params.content,
        visibility: params.visibility,
        targetLeadId: params.targetLeadId,
        crmEventType: params.crmEventType,
        crmEntityType: params.crmEntityType,
        crmEntityId: params.crmEntityId,
        category: params.category || 'projet',
        mediaUrls: params.mediaUrls,
        mediaType: params.mediaType,
        publishedAt: new Date(),
      },
    });

    console.log(`[WALL-SERVICE] ✅ Auto-post créé: ${params.crmEventType} | post=${post.id}`);
    return post;
  } catch (error) {
    console.error(`[WALL-SERVICE] ❌ Erreur auto-post ${params.crmEventType}:`, error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// WALL SERVICE — Événements CRM
// ═══════════════════════════════════════════════════════════════

export const WallService = {

  // ─── NOUVEAU LEAD ────────────────────────────────
  async onNouveauLead(ctx: CrmEventContext) {
    const authorName = await getAuthorName(ctx.authorId);
    const leadName = ctx.leadId ? await getLeadName(ctx.leadId) : 'un nouveau prospect';

    // Post interne (visible par l'organisation)
    await createAutoPost({
      organizationId: ctx.organizationId,
      authorId: ctx.authorId,
      content: `🎯 ${authorName} a ajouté un nouveau lead : ${leadName}`,
      visibility: 'IN',
      crmEventType: 'NOUVEAU_LEAD',
      crmEntityType: 'Lead',
      crmEntityId: ctx.leadId,
      category: 'projet',
    });
  },

  // ─── DEVIS SIGNÉ ─────────────────────────────────
  async onDevisSigne(ctx: CrmEventContext) {
    const authorName = await getAuthorName(ctx.authorId);
    const leadName = ctx.leadId ? await getLeadName(ctx.leadId) : 'un client';

    // Post interne
    await createAutoPost({
      organizationId: ctx.organizationId,
      authorId: ctx.authorId,
      content: `🤝 Nouveau contrat signé ! ${authorName} a conclu avec ${leadName}. Bienvenue dans la famille ! 🎉`,
      visibility: 'IN',
      crmEventType: 'DEVIS_SIGNE',
      crmEntityType: 'Lead',
      crmEntityId: ctx.leadId,
      category: 'projet',
    });

    // Post client (visible par le client sur son mur)
    if (ctx.leadId) {
      await createAutoPost({
        organizationId: ctx.organizationId,
        authorId: ctx.authorId,
        content: `🤝 Votre devis a été signé avec succès ! Bienvenue et merci pour votre confiance. Votre projet démarre maintenant — vous serez tenu(e) informé(e) de chaque étape.`,
        visibility: 'CLIENT',
        targetLeadId: ctx.leadId,
        crmEventType: 'DEVIS_SIGNE',
        crmEntityType: 'Lead',
        crmEntityId: ctx.leadId,
        category: 'projet',
      });
    }
  },

  // ─── COMMANDE PASSÉE ─────────────────────────────
  async onCommandePassee(ctx: CrmEventContext) {
    const leadName = ctx.leadId ? await getLeadName(ctx.leadId) : 'un client';

    await createAutoPost({
      organizationId: ctx.organizationId,
      authorId: ctx.authorId,
      content: `📦 Commande de matériel passée pour ${leadName}. Le fournisseur a été contacté.`,
      visibility: 'IN',
      crmEventType: 'COMMANDE',
      crmEntityType: 'Chantier',
      crmEntityId: ctx.chantierId,
      category: 'projet',
    });

    if (ctx.leadId) {
      const materiel = ctx.details?.materiel || 'Votre matériel';
      await createAutoPost({
        organizationId: ctx.organizationId,
        authorId: ctx.authorId,
        content: `📦 ${materiel} a été commandé auprès de notre fournisseur. Nous vous tiendrons informé(e) dès la réception !`,
        visibility: 'CLIENT',
        targetLeadId: ctx.leadId,
        crmEventType: 'COMMANDE',
        crmEntityType: 'Chantier',
        crmEntityId: ctx.chantierId,
        category: 'projet',
      });
    }
  },

  // ─── COMMANDE RÉCEPTIONNÉE ───────────────────────
  async onCommandeReceptionnee(ctx: CrmEventContext) {
    const leadName = ctx.leadId ? await getLeadName(ctx.leadId) : 'un client';

    await createAutoPost({
      organizationId: ctx.organizationId,
      authorId: ctx.authorId,
      content: `📦✅ Le matériel pour ${leadName} est arrivé ! Prêt pour la planification.`,
      visibility: 'IN',
      crmEventType: 'RECEPTION_COMMANDE',
      crmEntityType: 'Chantier',
      crmEntityId: ctx.chantierId,
      category: 'projet',
    });

    if (ctx.leadId) {
      await createAutoPost({
        organizationId: ctx.organizationId,
        authorId: ctx.authorId,
        content: `📦 Bonne nouvelle ! Votre matériel est arrivé dans nos entrepôts. La prochaine étape : la planification de votre installation !`,
        visibility: 'CLIENT',
        targetLeadId: ctx.leadId,
        crmEventType: 'RECEPTION_COMMANDE',
        crmEntityType: 'Chantier',
        crmEntityId: ctx.chantierId,
        category: 'projet',
        mediaUrls: ctx.details?.photos,
        mediaType: ctx.details?.photos ? 'gallery' : undefined,
      });
    }
  },

  // ─── PLANIFICATION DU CHANTIER ───────────────────
  async onPlanification(ctx: CrmEventContext) {
    const leadName = ctx.leadId ? await getLeadName(ctx.leadId) : 'un client';
    const date = ctx.details?.plannedDate ? new Date(ctx.details.plannedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'bientôt';
    const responsable = ctx.details?.responsable || '';

    await createAutoPost({
      organizationId: ctx.organizationId,
      authorId: ctx.authorId,
      content: `📅 Chantier planifié pour ${leadName} le ${date}.${responsable ? ` Responsable : ${responsable}` : ''}`,
      visibility: 'IN',
      crmEventType: 'PLANIFICATION',
      crmEntityType: 'Chantier',
      crmEntityId: ctx.chantierId,
      category: 'projet',
    });

    if (ctx.leadId) {
      await createAutoPost({
        organizationId: ctx.organizationId,
        authorId: ctx.authorId,
        content: `📅 Votre chantier est planifié pour le ${date} ! ${responsable ? `${responsable} sera en charge de votre installation.` : ''} Notre équipe se prépare pour votre installation.`,
        visibility: 'CLIENT',
        targetLeadId: ctx.leadId,
        crmEventType: 'PLANIFICATION',
        crmEntityType: 'Chantier',
        crmEntityId: ctx.chantierId,
        category: 'projet',
      });
    }
  },

  // ─── CHANTIER EN COURS (post manuel technicien) ──
  async onChantierEnCours(ctx: CrmEventContext) {
    const authorName = await getAuthorName(ctx.authorId);
    const message = ctx.details?.message || 'Travaux en cours';

    await createAutoPost({
      organizationId: ctx.organizationId,
      authorId: ctx.authorId,
      content: `🔨 ${authorName} : ${message}`,
      visibility: 'IN',
      crmEventType: 'CHANTIER_EN_COURS',
      crmEntityType: 'Chantier',
      crmEntityId: ctx.chantierId,
      category: 'chantier_realise',
      mediaUrls: ctx.details?.photos,
      mediaType: ctx.details?.photos ? 'gallery' : undefined,
    });

    if (ctx.leadId) {
      await createAutoPost({
        organizationId: ctx.organizationId,
        authorId: ctx.authorId,
        content: `🔨 ${message}`,
        visibility: 'CLIENT',
        targetLeadId: ctx.leadId,
        crmEventType: 'CHANTIER_EN_COURS',
        crmEntityType: 'Chantier',
        crmEntityId: ctx.chantierId,
        category: 'projet',
        mediaUrls: ctx.details?.photos,
        mediaType: ctx.details?.photos ? 'gallery' : undefined,
      });
    }
  },

  // ─── FIN DE CHANTIER ────────────────────────────
  async onFinChantier(ctx: CrmEventContext) {
    const leadName = ctx.leadId ? await getLeadName(ctx.leadId) : 'un client';

    // Post public (visible par tous les clients = vitrine)
    await createAutoPost({
      organizationId: ctx.organizationId,
      authorId: ctx.authorId,
      content: `✅ Nouveau chantier terminé ! Installation réussie${ctx.details?.puissance ? ` — ${ctx.details.puissance}` : ''}. Encore un client satisfait ! 🎉`,
      visibility: 'ALL',
      crmEventType: 'FIN_CHANTIER',
      crmEntityType: 'Chantier',
      crmEntityId: ctx.chantierId,
      category: 'chantier_realise',
      mediaUrls: ctx.details?.photos,
      mediaType: ctx.details?.photos ? 'gallery' : undefined,
    });

    // Post interne
    await createAutoPost({
      organizationId: ctx.organizationId,
      authorId: ctx.authorId,
      content: `✅ Chantier terminé pour ${leadName} ! Bravo à l'équipe ! 🎉`,
      visibility: 'IN',
      crmEventType: 'FIN_CHANTIER',
      crmEntityType: 'Chantier',
      crmEntityId: ctx.chantierId,
      category: 'projet',
    });

    if (ctx.leadId) {
      await createAutoPost({
        organizationId: ctx.organizationId,
        authorId: ctx.authorId,
        content: `✅ Votre installation est terminée ! 🎉 Toute l'équipe vous félicite pour ce choix. La prochaine étape sera la réception de votre installation.`,
        visibility: 'CLIENT',
        targetLeadId: ctx.leadId,
        crmEventType: 'FIN_CHANTIER',
        crmEntityType: 'Chantier',
        crmEntityId: ctx.chantierId,
        category: 'projet',
        mediaUrls: ctx.details?.photos,
        mediaType: ctx.details?.photos ? 'gallery' : undefined,
      });
    }
  },

  // ─── RÉCEPTION (PV signé) ───────────────────────
  async onReception(ctx: CrmEventContext) {
    const leadName = ctx.leadId ? await getLeadName(ctx.leadId) : 'un client';

    await createAutoPost({
      organizationId: ctx.organizationId,
      authorId: ctx.authorId,
      content: `📋 PV de réception signé par ${leadName}${ctx.details?.satisfaction ? ` — Satisfaction : ${'⭐'.repeat(ctx.details.satisfaction)}/5` : ''}.`,
      visibility: 'IN',
      crmEventType: 'RECEPTION',
      crmEntityType: 'Chantier',
      crmEntityId: ctx.chantierId,
      category: 'projet',
    });

    if (ctx.leadId) {
      await createAutoPost({
        organizationId: ctx.organizationId,
        authorId: ctx.authorId,
        content: `📋 Votre procès-verbal de réception a été signé avec succès. ${ctx.details?.hasReserves ? 'Des réserves ont été notées, nous les traiterons dans les meilleurs délais.' : 'Aucune réserve — tout est parfait !'} Merci pour votre confiance !`,
        visibility: 'CLIENT',
        targetLeadId: ctx.leadId,
        crmEventType: 'RECEPTION',
        crmEntityType: 'Chantier',
        crmEntityId: ctx.chantierId,
        category: 'projet',
      });
    }
  },

  // ─── FACTURE ENVOYÉE ─────────────────────────────
  async onFactureEnvoyee(ctx: CrmEventContext) {
    const leadName = ctx.leadId ? await getLeadName(ctx.leadId) : 'un client';
    const montant = ctx.details?.amount ? `${ctx.details.amount.toLocaleString('fr-FR')}€` : '';

    await createAutoPost({
      organizationId: ctx.organizationId,
      authorId: ctx.authorId,
      content: `💰 Facture${montant ? ` de ${montant}` : ''} envoyée à ${leadName}.`,
      visibility: 'IN',
      crmEventType: 'FACTURE',
      crmEntityType: 'ChantierInvoice',
      crmEntityId: ctx.details?.invoiceId,
      category: 'projet',
    });

    if (ctx.leadId) {
      await createAutoPost({
        organizationId: ctx.organizationId,
        authorId: ctx.authorId,
        content: `📄 Votre facture est disponible${montant ? ` — Montant : ${montant}` : ''}. Vous pouvez la consulter dans vos documents.`,
        visibility: 'CLIENT',
        targetLeadId: ctx.leadId,
        crmEventType: 'FACTURE',
        crmEntityType: 'ChantierInvoice',
        crmEntityId: ctx.details?.invoiceId,
        category: 'projet',
      });
    }
  },

  // ─── CHANTIER TERMINÉ (tout fini) ────────────────
  async onProjetTermine(ctx: CrmEventContext) {
    if (ctx.leadId) {
      await createAutoPost({
        organizationId: ctx.organizationId,
        authorId: ctx.authorId,
        content: `🏠 Votre projet est officiellement terminé ! Merci pour votre confiance. N'hésitez pas à nous recommander à vos proches — chaque parrainage compte ! 🤝`,
        visibility: 'CLIENT',
        targetLeadId: ctx.leadId,
        crmEventType: 'TERMINE',
        crmEntityType: 'Chantier',
        crmEntityId: ctx.chantierId,
        category: 'projet',
      });
    }
  },

  // ─── SAV OUVERT ──────────────────────────────────
  async onSavOuvert(ctx: CrmEventContext) {
    const leadName = ctx.leadId ? await getLeadName(ctx.leadId) : 'un client';

    await createAutoPost({
      organizationId: ctx.organizationId,
      authorId: ctx.authorId,
      content: `🔧 Ticket SAV ouvert pour ${leadName}. ${ctx.details?.description || ''}`,
      visibility: 'IN',
      crmEventType: 'SAV',
      crmEntityType: 'Chantier',
      crmEntityId: ctx.chantierId,
      category: 'projet',
    });

    if (ctx.leadId) {
      await createAutoPost({
        organizationId: ctx.organizationId,
        authorId: ctx.authorId,
        content: `🔧 Un ticket SAV a été ouvert pour votre installation. Notre équipe s'en occupe et vous tiendra informé(e) de l'avancement.`,
        visibility: 'CLIENT',
        targetLeadId: ctx.leadId,
        crmEventType: 'SAV',
        crmEntityType: 'Chantier',
        crmEntityId: ctx.chantierId,
        category: 'projet',
      });
    }
  },

  // ─── EMAIL ENVOYÉ ────────────────────────────────
  async onEmailEnvoye(ctx: CrmEventContext) {
    const authorName = await getAuthorName(ctx.authorId);
    const leadName = ctx.leadId ? await getLeadName(ctx.leadId) : ctx.details?.recipientEmail || 'un contact';

    await createAutoPost({
      organizationId: ctx.organizationId,
      authorId: ctx.authorId,
      content: `📧 ${authorName} a envoyé un email à ${leadName}${ctx.details?.subject ? ` — "${ctx.details.subject}"` : ''}.`,
      visibility: 'IN',
      crmEventType: 'EMAIL_ENVOYE',
      crmEntityType: 'Lead',
      crmEntityId: ctx.leadId,
      category: 'projet',
    });
  },

  // ─── RDV PLANIFIÉ ────────────────────────────────
  async onRdvPlanifie(ctx: CrmEventContext) {
    const authorName = await getAuthorName(ctx.authorId);
    const date = ctx.details?.date ? new Date(ctx.details.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '';

    await createAutoPost({
      organizationId: ctx.organizationId,
      authorId: ctx.authorId,
      content: `📅 ${authorName} a planifié un rendez-vous${date ? ` le ${date}` : ''}${ctx.details?.title ? ` — ${ctx.details.title}` : ''}.`,
      visibility: 'IN',
      crmEventType: 'RDV_PLANIFIE',
      crmEntityType: 'Lead',
      crmEntityId: ctx.leadId,
      category: 'projet',
    });
  },

  // ─── APPEL EFFECTUÉ ──────────────────────────────
  async onAppelEffectue(ctx: CrmEventContext) {
    const authorName = await getAuthorName(ctx.authorId);
    const leadName = ctx.leadId ? await getLeadName(ctx.leadId) : ctx.details?.phoneNumber || 'un contact';

    await createAutoPost({
      organizationId: ctx.organizationId,
      authorId: ctx.authorId,
      content: `📞 ${authorName} a appelé ${leadName}${ctx.details?.duration ? ` (${ctx.details.duration})` : ''}.`,
      visibility: 'IN',
      crmEventType: 'APPEL_EFFECTUE',
      crmEntityType: 'Lead',
      crmEntityId: ctx.leadId,
      category: 'projet',
    });
  },

  // ─── POST PROMOTION (manuel admin) ───────────────
  async createPromotion(ctx: CrmEventContext & { content: string; mediaUrls?: string[] }) {
    await createAutoPost({
      organizationId: ctx.organizationId,
      authorId: ctx.authorId,
      content: ctx.content,
      visibility: 'ALL',
      crmEventType: 'PROMOTION',
      category: 'promotion',
      mediaUrls: ctx.mediaUrls,
      mediaType: ctx.mediaUrls ? 'gallery' : undefined,
    });
  },

  // ─── POST CONSEIL (manuel admin) ─────────────────
  async createConseil(ctx: CrmEventContext & { content: string; mediaUrls?: string[] }) {
    await createAutoPost({
      organizationId: ctx.organizationId,
      authorId: ctx.authorId,
      content: ctx.content,
      visibility: 'ALL',
      crmEventType: 'CONSEIL',
      category: 'conseil',
      mediaUrls: ctx.mediaUrls,
      mediaType: ctx.mediaUrls ? 'gallery' : undefined,
    });
  },
};
