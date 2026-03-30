/**
 * social-settings.ts — API routes pour la gestion des Social Settings
 * 
 * GET    /social-settings              → Récupérer les settings de l'org courante
 * GET    /social-settings/:orgId       → Récupérer les settings d'une org (super admin)
 * PUT    /social-settings              → Mettre à jour les settings de l'org courante
 * PUT    /social-settings/:orgId       → Mettre à jour les settings d'une org (super admin)
 * GET    /social-settings/all          → Liste toutes les configs (super admin)
 * 
 * POST   /social-context               → Carte d'identité sociale de l'utilisateur courant
 * 
 * POST   /org-follow/:orgId            → Follow une Colony
 * DELETE /org-follow/:orgId            → Unfollow une Colony
 * GET    /org-follow/my                → Mes Colonies suivies
 * GET    /org-follow/followers/:orgId  → Followers d'une Colony
 */

import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { authenticateToken } from '../middleware/auth';
import { getSocialContext } from '../lib/feed-visibility';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const router = Router();

// ═══════════════════════════════════════════════════════
// HELPER: extract user + org from request
// ═══════════════════════════════════════════════════════

function getUserContext(req: Request) {
  const user = (req as any).user;
  const orgId = user.organizationId || (req.headers['x-organization-id'] as string) || null;
  const isSuperAdmin = user.role === 'super_admin' || user.isSuperAdmin;
  return { user, orgId, isSuperAdmin, userId: user.id as string };
}

// ═══════════════════════════════════════════════════════
// SOCIAL SETTINGS CRUD
// ═══════════════════════════════════════════════════════

const socialSettingsUpdateSchema = z.object({
  wallEnabled: z.boolean().optional(),
  storiesEnabled: z.boolean().optional(),
  reelsEnabled: z.boolean().optional(),
  sparksEnabled: z.boolean().optional(),
  battlesEnabled: z.boolean().optional(),
  exploreEnabled: z.boolean().optional(),
  hiveLiveEnabled: z.boolean().optional(),
  messengerEnabled: z.boolean().optional(),
  callsEnabled: z.boolean().optional(),
  defaultPostVisibility: z.enum(['OUT', 'IN', 'ALL']).optional(),
  allowMembersPost: z.boolean().optional(),
  allowMembersStory: z.boolean().optional(),
  allowMembersReel: z.boolean().optional(),
  allowMembersSpark: z.boolean().optional(),
  requirePostApproval: z.boolean().optional(),
  showPublicPostsInFeed: z.boolean().optional(),
  showFriendsPostsInFeed: z.boolean().optional(),
  showFollowedColoniesInFeed: z.boolean().optional(),
  maxPostLength: z.number().int().min(100).max(50000).optional(),
  maxCommentLength: z.number().int().min(50).max(10000).optional(),
  maxMediaPerPost: z.number().int().min(1).max(50).optional(),
  maxVideoSizeMB: z.number().int().min(1).max(500).optional(),
  maxImageSizeMB: z.number().int().min(1).max(50).optional(),
  allowGifs: z.boolean().optional(),
  allowLinks: z.boolean().optional(),
  allowHashtags: z.boolean().optional(),
  profanityFilterEnabled: z.boolean().optional(),
  reactionsEnabled: z.boolean().optional(),
  commentsEnabled: z.boolean().optional(),
  sharesEnabled: z.boolean().optional(),
  commentDepthLimit: z.number().int().min(1).max(10).optional(),
  allowFollowColony: z.boolean().optional(),
  autoFollowOnJoin: z.boolean().optional(),
  friendRequestsEnabled: z.boolean().optional(),
  maxFriendsPerUser: z.number().int().min(50).max(50000).optional(),
  allowBlockColony: z.boolean().optional(),
  showMemberList: z.boolean().optional(),
  showMemberCount: z.boolean().optional(),
  profileVisibility: z.enum(['public', 'members_only', 'private']).optional(),
  notifyOnNewPost: z.boolean().optional(),
  notifyOnComment: z.boolean().optional(),
  notifyOnReaction: z.boolean().optional(),
  notifyOnNewFollower: z.boolean().optional(),
  notifyOnFriendRequest: z.boolean().optional(),
  notifyOnMention: z.boolean().optional(),
  showPostAnalytics: z.boolean().optional(),
  showProfileViews: z.boolean().optional(),
  customReactions: z.any().optional(),
  bannedWords: z.array(z.string()).optional(),
  pinnedPostsLimit: z.number().int().min(0).max(20).optional(),
  autoArchiveDays: z.number().int().min(0).max(3650).optional(),
});

// GET /social-settings/all — Super admin: toutes les configs
router.get('/all', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { isSuperAdmin } = getUserContext(req);
    if (!isSuperAdmin) return res.status(403).json({ error: 'Accès refusé' });

    const allSettings = await db.socialSettings.findMany({
      include: {
        organization: { select: { id: true, name: true, logoUrl: true } },
      },
      orderBy: { organization: { name: 'asc' } },
    });

    // Also get all orgs that DON'T have settings yet
    const orgsWithSettings = new Set(allSettings.map(s => s.organizationId));
    const orgsWithoutSettings = await db.organization.findMany({
      where: { id: { notIn: [...orgsWithSettings] } },
      select: { id: true, name: true, logoUrl: true },
      orderBy: { name: 'asc' },
    });

    res.json({ settings: allSettings, orgsWithoutSettings });
  } catch (error) {
    console.error('[SOCIAL-SETTINGS] Error fetching all:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════
// SOCIAL CONTEXT — "Carte d'identité sociale"
// MUST be BEFORE /:orgId to avoid being caught by the param route
// ═══════════════════════════════════════════════════════

router.get('/context/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId, orgId, isSuperAdmin } = getUserContext(req);
    const ctx = await getSocialContext(userId, orgId, isSuperAdmin);
    
    // Don't expose full IDs list on context endpoint for privacy reasons,
    // just return counts + settings
    res.json({
      userId: ctx.userId,
      myOrgId: ctx.myOrgId,
      friendCount: ctx.friendIds.length,
      followedColonyCount: ctx.followedOrgIds.length,
      blockedColonyCount: ctx.blockedOrgIds.length,
      followedUserCount: ctx.followedUserIds.length,
      isSuperAdmin: ctx.isSuperAdmin,
      settings: ctx.settings,
    });
  } catch (error) {
    console.error('[SOCIAL-CONTEXT] Error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════
// ORG FOLLOW CRUD
// MUST be BEFORE /:orgId to avoid "org-follow" being matched as orgId
// ═══════════════════════════════════════════════════════

// GET /org-follow/my — Mes Colonies suivies
router.get('/org-follow/my', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = getUserContext(req);
    
    const follows = await db.orgFollow.findMany({
      where: { userId },
      include: {
        organization: { select: { id: true, name: true, logoUrl: true, description: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(follows);
  } catch (error) {
    console.error('[ORG-FOLLOW] Error fetching my follows:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /org-follow/followers/:orgId — Followers d'une Colony
router.get('/org-follow/followers/:orgId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const targetOrgId = req.params.orgId;
    
    const followers = await db.orgFollow.findMany({
      where: { organizationId: targetOrgId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ count: followers.length, followers });
  } catch (error) {
    console.error('[ORG-FOLLOW] Error fetching followers:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /org-follow/count/:orgId — Nombre de followers d'une Colony
router.get('/org-follow/count/:orgId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const targetOrgId = req.params.orgId;
    const count = await db.orgFollow.count({ where: { organizationId: targetOrgId } });
    const { userId } = getUserContext(req);
    const isFollowing = await db.orgFollow.findUnique({
      where: { userId_organizationId: { userId, organizationId: targetOrgId } },
    });
    
    res.json({ count, isFollowing: !!isFollowing });
  } catch (error) {
    console.error('[ORG-FOLLOW] Error counting:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /org-follow/:orgId — Follow une Colony
router.post('/org-follow/:orgId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = getUserContext(req);
    const targetOrgId = req.params.orgId;

    // Check org exists
    const org = await db.organization.findUnique({ where: { id: targetOrgId }, select: { id: true } });
    if (!org) return res.status(404).json({ error: 'Colony introuvable' });

    // Check settings allow follow
    const settings = await db.socialSettings.findUnique({ where: { organizationId: targetOrgId } });
    if (settings && !settings.allowFollowColony) {
      return res.status(403).json({ error: 'Cette Colony n\'accepte pas les follows' });
    }

    // Upsert to avoid duplicate errors
    const follow = await db.orgFollow.upsert({
      where: { userId_organizationId: { userId, organizationId: targetOrgId } },
      update: {},
      create: {
        id: randomUUID(),
        userId,
        organizationId: targetOrgId,
      },
    });

    res.json({ followed: true, follow });
  } catch (error) {
    console.error('[ORG-FOLLOW] Error following:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /org-follow/:orgId — Unfollow une Colony
router.delete('/org-follow/:orgId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = getUserContext(req);
    const targetOrgId = req.params.orgId;

    await db.orgFollow.deleteMany({
      where: { userId, organizationId: targetOrgId },
    });

    res.json({ followed: false });
  } catch (error) {
    console.error('[ORG-FOLLOW] Error unfollowing:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════
// PARAMETRIC ROUTES — MUST be LAST (after all static routes)
// ═══════════════════════════════════════════════════════

// GET /social-settings — Get settings for current org
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { orgId } = getUserContext(req);
    if (!orgId) return res.json(null); // Free user, no org settings

    let settings = await db.socialSettings.findUnique({
      where: { organizationId: orgId },
    });

    if (!settings) {
      settings = await db.socialSettings.create({
        data: {
          id: randomUUID(),
          organizationId: orgId,
          updatedAt: new Date(),
        },
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('[SOCIAL-SETTINGS] Error fetching current:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /social-settings/:orgId — Get settings for a specific org
router.get('/:orgId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { orgId: myOrgId, isSuperAdmin } = getUserContext(req);
    const targetOrgId = req.params.orgId;

    // Only super admin or member of the org can view
    if (!isSuperAdmin && myOrgId !== targetOrgId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    let settings = await db.socialSettings.findUnique({
      where: { organizationId: targetOrgId },
    });

    // Auto-create with defaults if not existing
    if (!settings) {
      settings = await db.socialSettings.create({
        data: {
          id: randomUUID(),
          organizationId: targetOrgId,
          updatedAt: new Date(),
        },
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('[SOCIAL-SETTINGS] Error fetching:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /social-settings — Update settings for current org
router.put('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { orgId, isSuperAdmin: _isSuperAdmin } = getUserContext(req);
    if (!orgId) return res.status(400).json({ error: 'Pas de Colony active' });

    const parsed = socialSettingsUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten() });
    }

    const settings = await db.socialSettings.upsert({
      where: { organizationId: orgId },
      update: { ...parsed.data, updatedAt: new Date() },
      create: {
        id: randomUUID(),
        organizationId: orgId,
        ...parsed.data,
        updatedAt: new Date(),
      },
    });

    res.json(settings);
  } catch (error) {
    console.error('[SOCIAL-SETTINGS] Error updating current:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /social-settings/:orgId — Update settings for a specific org
router.put('/:orgId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { orgId: myOrgId, isSuperAdmin } = getUserContext(req);
    const targetOrgId = req.params.orgId;

    if (!isSuperAdmin && myOrgId !== targetOrgId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const parsed = socialSettingsUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten() });
    }

    const settings = await db.socialSettings.upsert({
      where: { organizationId: targetOrgId },
      update: { ...parsed.data, updatedAt: new Date() },
      create: {
        id: randomUUID(),
        organizationId: targetOrgId,
        ...parsed.data,
        updatedAt: new Date(),
      },
    });

    res.json(settings);
  } catch (error) {
    console.error('[SOCIAL-SETTINGS] Error updating:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
