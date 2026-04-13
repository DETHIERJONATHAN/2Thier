/**
 * rgpd.ts — Routes RGPD / GDPR compliance
 *
 * - GET  /api/rgpd/export        — Exporter toutes les données personnelles (JSON)
 * - POST /api/rgpd/delete-account — Demande de suppression de compte (droit à l'oubli)
 * - POST /api/rgpd/retention-cleanup — Cron: purge des anciennes données sociales
 */

import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { authenticateToken } from '../middleware/auth';
import { getOrgSocialSettings } from '../lib/feed-visibility';
import { logger } from '../lib/logger';

const router = Router();
router.use(authenticateToken as unknown);

// Helper: extract user from request
function getUser(req: Request) {
  return req.user as { id: string; organizationId?: string; isSuperAdmin?: boolean } | undefined;
}

// ═══════════════════════════════════════════════════════
// GET /api/rgpd/export — Export all personal data (GDPR Art. 20)
// ═══════════════════════════════════════════════════════
router.get('/export', async (req: Request, res: Response) => {
  const user = getUser(req);
  if (!user?.id) return res.status(401).json({ success: false, message: 'Non authentifié' });

  try {
    // Check if org allows data export
    if (user.organizationId) {
      const settings = await getOrgSocialSettings(user.organizationId);
      if (!(settings as any).gdprDataExportEnabled) {
        return res.status(403).json({ success: false, message: 'Export de données désactivé par votre Colony' });
      }
    }

    // Gather all personal data in parallel
    const [
      profile,
      wallPosts,
      comments,
      reactions,
      stories,
      sparks,
      friendships,
      follows,
      orgFollows,
      messages,
      notifications,
      calendarEvents,
      pushSubscriptions,
      locations,
    ] = await Promise.all([
      // Profile
      db.user.findUnique({
        where: { id: user.id },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          phoneNumber: true, address: true, avatarUrl: true, coverUrl: true,
          language: true, createdAt: true, updatedAt: true,
          commercialSlug: true, vatNumber: true,
        },
      }),
      // Wall Posts
      db.wallPost.findMany({
        where: { authorId: user.id },
        select: {
          id: true, content: true, mediaUrls: true, visibility: true,
          category: true, tags: true, likesCount: true, commentsCount: true,
          createdAt: true, publishAsOrg: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      // Comments
      db.wallComment.findMany({
        where: { authorId: user.id },
        select: { id: true, content: true, mediaUrl: true, createdAt: true, postId: true },
        orderBy: { createdAt: 'desc' },
      }),
      // Reactions
      db.wallReaction.findMany({
        where: { userId: user.id },
        select: { id: true, type: true, postId: true, createdAt: true },
      }),
      // Stories
      db.story.findMany({
        where: { authorId: user.id },
        select: { id: true, caption: true, mediaUrl: true, mediaType: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      // Sparks
      db.spark.findMany({
        where: { authorId: user.id },
        select: { id: true, content: true, sparkCount: true, isRevealed: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      // Friendships
      db.friendship.findMany({
        where: { OR: [{ requesterId: user.id }, { addresseeId: user.id }] },
        select: {
          id: true, status: true, createdAt: true,
          requester: { select: { id: true, firstName: true, lastName: true } },
          addressee: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      // Follows
      db.follow.findMany({
        where: { OR: [{ followerId: user.id }, { followingId: user.id }] },
        select: { followerId: true, followingId: true, createdAt: true },
      }),
      // Org Follows
      db.orgFollow.findMany({
        where: { userId: user.id },
        select: { organizationId: true, createdAt: true },
      }),
      // Messages (content only, no conversation metadata)
      db.message.findMany({
        where: { senderId: user.id },
        select: { id: true, content: true, mediaUrls: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5000, // Limit for performance
      }),
      // Notifications
      db.notification.findMany({
        where: { userId: user.id },
        select: { id: true, type: true, data: true, readAt: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
      // Calendar events created by user
      db.calendarEvent.findMany({
        where: { ownerId: user.id },
        select: { id: true, title: true, description: true, startDate: true, endDate: true, type: true, location: true },
        orderBy: { startDate: 'desc' },
      }),
      // Push subscriptions (no sensitive data)
      db.pushSubscription.findMany({
        where: { userId: user.id },
        select: { id: true, createdAt: true, isActive: true },
      }),
      // Location history
      db.userLocation.findMany({
        where: { userId: user.id },
        select: { latitude: true, longitude: true, ghostMode: true, updatedAt: true },
      }),
    ]);

    // Additional data exports (#41 enhancement)
    const [emailAccount, formSubmissions, userPhotos, bookmarks, documents] = await Promise.all([
      db.emailAccount.findUnique({ where: { userId: user.id }, select: { emailAddress: true, createdAt: true } }).catch(() => null),
      db.formSubmission.findMany({ where: { userId: user.id }, take: 5000, select: { id: true, data: true, createdAt: true } }).catch(() => []),
      db.userPhoto.findMany({ where: { userId: user.id }, select: { url: true, category: true, createdAt: true } }).catch(() => []),
      db.userBookmark.findMany({ where: { userId: user.id }, select: { url: true, title: true, createdAt: true } }).catch(() => []),
      db.generatedDocument.findMany({ where: { createdBy: user.id }, take: 1000, select: { id: true, title: true, pdfUrl: true, createdAt: true } }).catch(() => []),
    ]);

    const exportData = {
      _meta: {
        exportDate: new Date().toISOString(),
        exportType: 'GDPR_FULL_EXPORT',
        userId: user.id,
        format: 'JSON',
      },
      profile,
      socialContent: {
        wallPosts,
        comments,
        reactions,
        stories,
        sparks,
      },
      socialConnections: {
        friendships,
        follows,
        orgFollows,
      },
      messages: {
        count: messages.length,
        items: messages,
      },
      notifications: {
        count: notifications.length,
        items: notifications,
      },
      calendar: calendarEvents,
      devices: pushSubscriptions,
      locations,
      emailAccount,
      formSubmissions: { count: (formSubmissions as any[]).length, items: formSubmissions },
      photos: userPhotos,
      bookmarks,
      documents: { count: (documents as any[]).length, items: documents },
    };

    // Set download headers
    const filename = `zhiive-data-export-${user.id.substring(0, 8)}-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(exportData);
  } catch (error) {
    logger.error('[RGPD] Export error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'export' });
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/rgpd/delete-account — Right to erasure (GDPR Art. 17)
// ═══════════════════════════════════════════════════════
router.post('/delete-account', async (req: Request, res: Response) => {
  const user = getUser(req);
  if (!user?.id) return res.status(401).json({ success: false, message: 'Non authentifié' });

  const { confirmation } = req.body;
  if (confirmation !== 'DELETE_MY_ACCOUNT') {
    return res.status(400).json({
      success: false,
      message: 'Confirmation requise: envoyez { "confirmation": "DELETE_MY_ACCOUNT" }',
    });
  }

  try {
    const userId = user.id;

    // 1. Anonymize social content (don't delete — preserve thread integrity)
    await Promise.all([
      db.wallPost.updateMany({
        where: { authorId: userId },
        data: { content: '[Contenu supprimé]', mediaUrls: null, isAnonymous: true },
      }),
      db.wallComment.updateMany({
        where: { authorId: userId },
        data: { content: '[Commentaire supprimé]', mediaUrl: null },
      }),
      db.story.deleteMany({ where: { authorId: userId } }),
      db.spark.updateMany({
        where: { authorId: userId },
        data: { content: '[Contenu supprimé]', mediaUrl: null },
      }),
      db.message.updateMany({
        where: { senderId: userId },
        data: { content: null, mediaUrls: null },
      }),
    ]);

    // 2. Delete personal data relationships
    await Promise.all([
      db.wallReaction.deleteMany({ where: { userId } }),
      db.friendship.deleteMany({ where: { OR: [{ requesterId: userId }, { addresseeId: userId }] } }),
      db.follow.deleteMany({ where: { OR: [{ followerId: userId }, { followingId: userId }] } }),
      db.orgFollow.deleteMany({ where: { userId } }),
      db.orgBlock.deleteMany({ where: { userId } }),
      db.notification.deleteMany({ where: { userId } }),
      db.pushSubscription.deleteMany({ where: { userId } }),
      db.userLocation.deleteMany({ where: { userId } }),
    ]);

    // 2b. Delete/anonymize additional personal data (#40 enhancement)
    await Promise.all([
      // Email & communications
      db.emailAccount.deleteMany({ where: { userId } }),
      db.googleMailWatch.deleteMany({ where: { userId } }).catch(() => {}),
      db.email.updateMany({ where: { userId }, data: { userId: null as any } }),
      // Telecom
      db.telnyxUserConfig.deleteMany({ where: { userId } }).catch(() => {}),
      db.telnyxSettings.deleteMany({ where: { userId } }).catch(() => {}),
      db.telnyxPhoneNumber.updateMany({ where: { assignedUserId: userId }, data: { assignedUserId: null } }).catch(() => {}),
      db.googleVoiceCall.updateMany({ where: { userId }, data: { userId: null } }).catch(() => {}),
      db.googleVoiceSMS.updateMany({ where: { userId }, data: { userId: null } }).catch(() => {}),
      // Calendar
      db.calendarParticipant.deleteMany({ where: { userId } }).catch(() => {}),
      db.calendarEvent.updateMany({ where: { ownerId: userId }, data: { ownerId: null } }).catch(() => {}),
      // Documents & forms
      db.generatedDocument.updateMany({ where: { createdBy: userId }, data: { createdBy: null } }).catch(() => {}),
      db.productDocument.updateMany({ where: { uploadedById: userId }, data: { uploadedById: null as any } }).catch(() => {}),
      // Org links
      db.userOrganization.deleteMany({ where: { userId } }),
      db.invitation.updateMany({ where: { invitedById: userId }, data: { invitedById: null as any } }).catch(() => {}),
      // CRM (unassign, don't delete org data)
      db.lead.updateMany({ where: { assignedToId: userId }, data: { assignedToId: null } }).catch(() => {}),
      db.chantier.updateMany({ where: { responsableId: userId }, data: { responsableId: null } }).catch(() => {}),
      db.chantier.updateMany({ where: { commercialId: userId }, data: { commercialId: null } }).catch(() => {}),
      db.technician.updateMany({ where: { userId }, data: { userId: null } }).catch(() => {}),
      // Audit trail (anonymize)
      db.chantierHistory.updateMany({ where: { userId }, data: { userId: null } }).catch(() => {}),
    ]);

    // 3. Anonymize user profile (soft delete — keep ID for FK integrity)
    await db.user.update({
      where: { id: userId },
      data: {
        email: `deleted-${userId.substring(0, 8)}@deleted.zhiive.local`,
        firstName: 'Utilisateur',
        lastName: 'Supprimé',
        phoneNumber: null,
        address: null,
        avatarUrl: null,
        coverUrl: null,
        passwordHash: 'ACCOUNT_DELETED',
        vatNumber: null,
        commercialSlug: null,
        isActive: false,
      },
    });

    logger.info(`[RGPD] Account deleted/anonymized: ${userId}`);
    res.json({ success: true, message: 'Compte supprimé et données anonymisées conformément au RGPD' });
  } catch (error) {
    logger.error('[RGPD] Delete account error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression' });
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/rgpd/retention-cleanup — Cron: auto-purge old social data
// Based on SocialSettings.gdprRetentionDays per organization
// ═══════════════════════════════════════════════════════
router.post('/retention-cleanup', async (req: Request, res: Response) => {
  const user = getUser(req);
  if (!user?.isSuperAdmin) {
    return res.status(403).json({ success: false, message: 'Super Admin requis' });
  }

  try {
    // Find all orgs with retention enabled (gdprRetentionDays > 0)
    const orgsWithRetention = await db.socialSettings.findMany({
      where: { gdprRetentionDays: { gt: 0 } },
      select: { organizationId: true, gdprRetentionDays: true },
    });

    let totalPurged = 0;

    for (const org of orgsWithRetention) {
      const cutoffDate = new Date(Date.now() - org.gdprRetentionDays * 24 * 60 * 60 * 1000);

      // Purge old wall posts
      const deletedPosts = await db.wallPost.deleteMany({
        where: {
          organizationId: org.organizationId,
          createdAt: { lt: cutoffDate },
          isPinned: false, // Don't purge pinned posts
        },
      });

      // Purge old stories (already expired, but clean DB)
      const deletedStories = await db.story.deleteMany({
        where: {
          organizationId: org.organizationId,
          createdAt: { lt: cutoffDate },
        },
      });

      // Purge old notifications
      const deletedNotifs = await db.notification.deleteMany({
        where: {
          organizationId: org.organizationId,
          createdAt: { lt: cutoffDate },
          readAt: { not: null }, // Only purge read notifications
        },
      });

      const orgTotal = deletedPosts.count + deletedStories.count + deletedNotifs.count;
      if (orgTotal > 0) {
        logger.info(`[RGPD] Retention cleanup for org ${org.organizationId}: ${orgTotal} items purged (${org.gdprRetentionDays}d retention)`);
      }
      totalPurged += orgTotal;
    }

    res.json({
      success: true,
      orgsProcessed: orgsWithRetention.length,
      totalPurged,
    });
  } catch (error) {
    logger.error('[RGPD] Retention cleanup error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors du nettoyage' });
  }
});

export default router;
