/**
 * feed-visibility.ts — Carte d'identité sociale centralisée (Backend)
 * 
 * Ce module est la SOURCE UNIQUE pour déterminer ce qu'un utilisateur peut voir
 * dans tous les flux sociaux de Zhiive (Wall, Stories, Reels, Sparks, Explore, etc.)
 * 
 * Chaque route sociale doit appeler getSocialContext() puis buildFeedWhere()
 * au lieu de construire ses propres filtres localement.
 */

import { db } from './database';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface SocialContext {
  userId: string;
  myOrgId: string | null;
  friendIds: string[];
  followedOrgIds: string[];
  blockedOrgIds: string[];
  followedUserIds: string[];
  isSuperAdmin: boolean;
  settings: SocialSettingsData | null;
}

export interface SocialSettingsData {
  showPublicPostsInFeed: boolean;
  showFriendsPostsInFeed: boolean;
  showFollowedColoniesInFeed: boolean;
  wallEnabled: boolean;
  storiesEnabled: boolean;
  reelsEnabled: boolean;
  sparksEnabled: boolean;
  battlesEnabled: boolean;
  exploreEnabled: boolean;
  hiveLiveEnabled: boolean;
  reactionsEnabled: boolean;
  commentsEnabled: boolean;
  sharesEnabled: boolean;
  maxPostLength: number;
  maxCommentLength: number;
  maxMediaPerPost: number;
  maxVideoSizeMB: number;
  maxImageSizeMB: number;
  defaultPostVisibility: string;
  allowMembersPost: boolean;
  allowMembersStory: boolean;
  allowMembersReel: boolean;
  allowMembersSpark: boolean;
  requirePostApproval: boolean;
}

export type FeedMode = 'personal' | 'org' | 'public';

// ═══════════════════════════════════════════════════════════════
// GET SOCIAL CONTEXT — "Carte d'identité sociale"
// ═══════════════════════════════════════════════════════════════

/**
 * Récupère le contexte social complet d'un utilisateur.
 * Appeler une seule fois par requête, puis passer à buildFeedWhere().
 */
export async function getSocialContext(
  userId: string,
  orgId: string | null,
  isSuperAdmin: boolean = false
): Promise<SocialContext> {
  // Exécuter toutes les requêtes en parallèle pour la performance
  const [
    friendships,
    orgFollows,
    orgBlocks,
    userFollows,
    settings,
  ] = await Promise.all([
    // Amis acceptés (bidirectionnel)
    db.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [
          { requesterId: userId },
          { addresseeId: userId },
        ],
      },
      select: { requesterId: true, addresseeId: true },
    }),
    // Colonies suivies
    db.orgFollow.findMany({
      where: { userId },
      select: { organizationId: true },
    }),
    // Colonies bloquées
    db.orgBlock.findMany({
      where: { userId },
      select: { blockedOrgId: true },
    }),
    // Utilisateurs suivis (Follow asymétrique)
    db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    }),
    // Settings de la Colony courante
    orgId ? db.socialSettings.findUnique({
      where: { organizationId: orgId },
    }) : Promise.resolve(null),
  ]);

  // Extraire les IDs des amis (bidirectionnel)
  const friendIds = friendships.map(f =>
    f.requesterId === userId ? f.addresseeId : f.requesterId
  );

  return {
    userId,
    myOrgId: orgId,
    friendIds,
    followedOrgIds: orgFollows.map(f => f.organizationId),
    blockedOrgIds: orgBlocks.map(b => b.blockedOrgId),
    followedUserIds: userFollows.map(f => f.followingId),
    isSuperAdmin,
    settings,
  };
}

// ═══════════════════════════════════════════════════════════════
// BUILD FEED WHERE — Génère les filtres Prisma selon le mode
// ═══════════════════════════════════════════════════════════════

/**
 * Construit le filtre Prisma `where` pour les posts du Mur (wall).
 * Remplace tous les blocs if/else dans wall.ts.
 */
export function buildWallFeedWhere(
  ctx: SocialContext,
  mode: FeedMode
): Record<string, any> {
  const base: any = { isPublished: true };

  // SuperAdmin voit tout
  if (ctx.isSuperAdmin && !ctx.myOrgId) {
    return base;
  }

  // Bloquer les posts des Colonies bloquées
  const blockedOrgFilter = ctx.blockedOrgIds.length > 0
    ? { organizationId: { notIn: ctx.blockedOrgIds } }
    : {};

  if (mode === 'personal') {
    // Mode Bee (personnel) : 
    // 1. Mes propres posts personnels
    // 2. Posts publics personnels (ALL + publishAsOrg=false)
    // 3. Posts de mes amis (ALL + publishAsOrg=false)
    // 4. Posts publics de ma propre Colony (ALL + orgId=myOrg)
    // 5. Posts publics des Colonies suivies (ALL + orgId in followedOrgs)
    const orConditions: any[] = [
      // Mes posts personnels
      { authorId: ctx.userId, publishAsOrg: false },
    ];

    // Posts publics d'autres bees (non-Colony)
    if (ctx.settings?.showFriendsPostsInFeed !== false) {
      if (ctx.friendIds.length > 0) {
        orConditions.push({
          visibility: 'ALL',
          publishAsOrg: false,
          authorId: { in: ctx.friendIds },
          ...blockedOrgFilter,
        });
      }
    }

    // Posts publics généraux (discovery)
    orConditions.push({
      visibility: 'ALL',
      publishAsOrg: false,
      ...blockedOrgFilter,
    });

    // Posts publics de ma Colony
    if (ctx.myOrgId) {
      orConditions.push({
        visibility: 'ALL',
        organizationId: ctx.myOrgId,
      });
    }

    // Posts publics des Colonies suivies
    if (ctx.settings?.showFollowedColoniesInFeed !== false && ctx.followedOrgIds.length > 0) {
      const filteredFollowed = ctx.followedOrgIds.filter(id => !ctx.blockedOrgIds.includes(id));
      if (filteredFollowed.length > 0) {
        orConditions.push({
          visibility: 'ALL',
          organizationId: { in: filteredFollowed },
        });
      }
    }

    return { ...base, OR: orConditions };

  } else if (mode === 'org') {
    // Mode Colony :
    // 1. Posts internes de ma Colony (IN)
    // 2. Posts publics de ma Colony (ALL)
    // 3. Mes posts privés dans ma Colony (OUT)
    // 4. Posts clients de ma Colony (CLIENT)
    // 5. Posts publics d'autres Colonies (inter-Colony discovery)
    if (!ctx.myOrgId) {
      // Pas de Colony → fallback en mode personnel
      return buildWallFeedWhere(ctx, 'personal');
    }

    const orConditions: any[] = [
      // Interne Colony
      { visibility: 'IN', organizationId: ctx.myOrgId },
      // Public Colony
      { visibility: 'ALL', organizationId: ctx.myOrgId },
      // Mes posts privés
      { visibility: 'OUT', authorId: ctx.userId },
      // Posts clients Colony
      { visibility: 'CLIENT', organizationId: ctx.myOrgId },
    ];

    // Inter-Colony : posts publics d'autres Colonies
    if (ctx.settings?.showPublicPostsInFeed !== false) {
      orConditions.push({
        visibility: 'ALL',
        publishAsOrg: true,
        organizationId: { not: ctx.myOrgId, ...( ctx.blockedOrgIds.length > 0 ? { notIn: ctx.blockedOrgIds } : {}) },
      });
    }

    return { ...base, OR: orConditions };

  } else {
    // Mode Public (réseau complet) :
    // Tous les posts ALL, excluant les Colonies bloquées
    return {
      ...base,
      visibility: 'ALL',
      ...blockedOrgFilter,
    };
  }
}

/**
 * Construit le filtre Prisma pour les Stories / Reels.
 * Respecte les paramètres de la Colony pour l'activation.
 */
export function buildMediaFeedWhere(
  ctx: SocialContext,
  mode: FeedMode,
  mediaType: 'story' | 'reel'
): Record<string, any> {
  const base: any = {};
  const blockedOrgFilter = ctx.blockedOrgIds.length > 0
    ? { organizationId: { notIn: ctx.blockedOrgIds } }
    : {};

  if (mode === 'personal') {
    // Stories/Reels personnels + amis + Colonies suivies publiques
    const orConditions: any[] = [
      { authorId: ctx.userId, publishAsOrg: false },
    ];

    // Contenu public personnel d'autres bees
    orConditions.push({
      visibility: 'ALL',
      publishAsOrg: false,
      ...blockedOrgFilter,
    });

    // Amis
    if (ctx.settings?.showFriendsPostsInFeed !== false && ctx.friendIds.length > 0) {
      orConditions.push({
        authorId: { in: ctx.friendIds },
        publishAsOrg: false,
        ...blockedOrgFilter,
      });
    }

    // Colonies suivies publiques
    if (ctx.settings?.showFollowedColoniesInFeed !== false && ctx.followedOrgIds.length > 0) {
      const filteredFollowed = ctx.followedOrgIds.filter(id => !ctx.blockedOrgIds.includes(id));
      if (filteredFollowed.length > 0) {
        orConditions.push({
          visibility: 'ALL',
          organizationId: { in: filteredFollowed },
        });
      }
    }

    // Ma Colony publique
    if (ctx.myOrgId) {
      orConditions.push({
        visibility: 'ALL',
        organizationId: ctx.myOrgId,
      });
    }

    return { ...base, OR: orConditions };

  } else if (mode === 'org') {
    if (!ctx.myOrgId) return buildMediaFeedWhere(ctx, 'personal', mediaType);
    
    return {
      ...base,
      OR: [
        { organizationId: ctx.myOrgId },
        // Inter-Colony public
        ...(ctx.settings?.showPublicPostsInFeed !== false ? [{
          visibility: 'ALL',
          organizationId: { not: ctx.myOrgId, ...(ctx.blockedOrgIds.length > 0 ? { notIn: ctx.blockedOrgIds } : {}) },
        }] : []),
      ],
    };

  } else {
    // Public : tout le réseau
    return { ...base, visibility: 'ALL', ...blockedOrgFilter };
  }
}

/**
 * Construit le filtre pour les Sparks (SpaceFlow).
 */
export function buildSparkFeedWhere(
  ctx: SocialContext,
  mode: FeedMode
): Record<string, any> {
  // Sparks suivent la même logique que les posts du mur
  return buildWallFeedWhere(ctx, mode);
}

/**
 * Construit le filtre pour l'Explore gallery.
 */
export function buildExploreFeedWhere(
  ctx: SocialContext,
  mode: FeedMode,
  scope?: 'friends' | 'org' | 'all' | 'private'
): Record<string, any> {
  const blockedOrgFilter = ctx.blockedOrgIds.length > 0
    ? { organizationId: { notIn: ctx.blockedOrgIds } }
    : {};

  if (scope === 'private') {
    return { authorId: ctx.userId };
  }

  if (scope === 'friends') {
    if (ctx.friendIds.length === 0) return { id: 'impossible' }; // No results
    return {
      authorId: { in: ctx.friendIds },
      visibility: 'ALL',
      ...blockedOrgFilter,
    };
  }

  if (scope === 'org' && ctx.myOrgId) {
    return { organizationId: ctx.myOrgId };
  }

  // Default: all public
  return { visibility: 'ALL', ...blockedOrgFilter };
}
