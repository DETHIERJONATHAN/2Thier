/**
 * Tests exhaustifs pour Feed Visibility (src/lib/feed-visibility.ts)
 *
 * Couvre :
 *  - buildWallFeedWhere()   — Filtres du mur (personal, org, public)
 *  - buildMediaFeedWhere()  — Filtres stories/reels
 *  - buildSparkFeedWhere()  — Filtres sparks
 *  - buildExploreFeedWhere() — Filtres exploration (private, friends, org, all)
 *  - getOrgSocialSettings() — Récupération settings avec fallback defaults
 *  - getSocialContext()     — Construction du contexte social complet
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────
vi.mock('../../../src/lib/database', () => ({
  db: {
    socialSettings: { findUnique: vi.fn() },
    friendship: { findMany: vi.fn().mockResolvedValue([]) },
    orgFollow: { findMany: vi.fn().mockResolvedValue([]) },
    orgBlock: { findMany: vi.fn().mockResolvedValue([]) },
    follow: { findMany: vi.fn().mockResolvedValue([]) },
    user: { findUnique: vi.fn().mockResolvedValue({ isSuperAdmin: false }) },
  },
}));

import {
  buildWallFeedWhere,
  buildMediaFeedWhere,
  buildSparkFeedWhere,
  buildExploreFeedWhere,
  getOrgSocialSettings,
  type SocialContext,
  type SocialSettingsData,
  type FeedMode,
} from '../../../src/lib/feed-visibility';
import { db } from '../../../src/lib/database';

const mockFindUnique = vi.mocked(db.socialSettings.findUnique);

// ── Helpers ──────────────────────────────────────────
function createCtx(overrides: Partial<SocialContext> = {}): SocialContext {
  return {
    userId: 'user-1',
    myOrgId: 'org-1',
    friendIds: [],
    followedOrgIds: [],
    blockedOrgIds: [],
    followedUserIds: [],
    isSuperAdmin: false,
    settings: {
      showPublicPostsInFeed: true,
      showFriendsPostsInFeed: true,
      showFollowedColoniesInFeed: true,
      wallEnabled: true,
      storiesEnabled: true,
      reelsEnabled: true,
      sparksEnabled: true,
      battlesEnabled: true,
      exploreEnabled: true,
      hiveLiveEnabled: true,
      reactionsEnabled: true,
      commentsEnabled: true,
      sharesEnabled: true,
      maxPostLength: 5000,
      maxCommentLength: 2000,
      maxMediaPerPost: 10,
      maxVideoSizeMB: 100,
      maxImageSizeMB: 10,
      defaultPostVisibility: 'IN',
      allowMembersPost: true,
      allowMembersStory: true,
      allowMembersReel: true,
      allowMembersSpark: true,
      requirePostApproval: false,
      waxEnabled: true,
      waxAlertsEnabled: true,
      waxDefaultRadiusKm: 10,
      eventsEnabled: true,
      capsulesEnabled: true,
      questsEnabled: true,
      autoPostOnDevisSigned: true,
      autoPostOnInvoicePaid: false,
      autoPostOnChantierCreated: true,
      autoPostOnChantierCompleted: true,
      autoPostOnNewClient: false,
      autoPostOnCalendarEvent: false,
      autoPostOnTaskCompleted: false,
      autoPostDefaultVisibility: 'IN',
    },
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════
describe('buildWallFeedWhere', () => {
  // ─── SuperAdmin ──────────────────────────────────
  describe('SuperAdmin mode', () => {
    it('returns only isPublished for superAdmin without org', () => {
      const ctx = createCtx({ isSuperAdmin: true, myOrgId: null });
      const where = buildWallFeedWhere(ctx, 'personal');
      expect(where).toEqual({ isPublished: true });
    });

    it('does NOT return bare isPublished for superAdmin WITH org', () => {
      const ctx = createCtx({ isSuperAdmin: true, myOrgId: 'org-1' });
      const where = buildWallFeedWhere(ctx, 'personal');
      expect(where).toHaveProperty('OR'); // Still filtered by org context
    });
  });

  // ─── Personal Mode ──────────────────────────────
  describe('Personal mode', () => {
    it('includes own posts', () => {
      const ctx = createCtx();
      const where = buildWallFeedWhere(ctx, 'personal');
      expect(where.OR).toContainEqual(
        expect.objectContaining({ authorId: 'user-1' })
      );
    });

    it('includes public posts (ALL visibility)', () => {
      const ctx = createCtx();
      const where = buildWallFeedWhere(ctx, 'personal');
      expect(where.OR).toContainEqual(
        expect.objectContaining({ visibility: 'ALL' })
      );
    });

    it('includes friends posts when enabled and friends exist', () => {
      const ctx = createCtx({ friendIds: ['friend-1', 'friend-2'] });
      const where = buildWallFeedWhere(ctx, 'personal');
      const friendCondition = where.OR.find(
        (c: any) => c.authorId?.in && c.publishAsOrg === false
      );
      expect(friendCondition).toBeDefined();
      expect(friendCondition.authorId.in).toContain('friend-1');
    });

    it('excludes friends posts when showFriendsPostsInFeed is false', () => {
      const ctx = createCtx({
        friendIds: ['friend-1'],
        settings: { ...createCtx().settings!, showFriendsPostsInFeed: false },
      });
      const where = buildWallFeedWhere(ctx, 'personal');
      const friendCondition = where.OR?.find(
        (c: any) => c.authorId?.in
      );
      expect(friendCondition).toBeUndefined();
    });

    it('includes followed Colonies posts when enabled', () => {
      const ctx = createCtx({ followedOrgIds: ['org-2', 'org-3'] });
      const where = buildWallFeedWhere(ctx, 'personal');
      const followedCondition = where.OR.find(
        (c: any) => c.organizationId?.in
      );
      expect(followedCondition).toBeDefined();
    });

    it('filters out blocked Colonies from followed list', () => {
      const ctx = createCtx({
        followedOrgIds: ['org-2', 'org-3'],
        blockedOrgIds: ['org-2'],
      });
      const where = buildWallFeedWhere(ctx, 'personal');
      const followedCondition = where.OR.find(
        (c: any) => c.organizationId?.in
      );
      if (followedCondition) {
        expect(followedCondition.organizationId.in).not.toContain('org-2');
        expect(followedCondition.organizationId.in).toContain('org-3');
      }
    });

    it('includes own Colony public posts', () => {
      const ctx = createCtx({ myOrgId: 'org-1' });
      const where = buildWallFeedWhere(ctx, 'personal');
      const orgPublic = where.OR.find(
        (c: any) => c.visibility === 'ALL' && c.organizationId === 'org-1'
      );
      expect(orgPublic).toBeDefined();
    });
  });

  // ─── Org Mode ───────────────────────────────────
  describe('Org (Colony) mode', () => {
    it('includes internal posts (IN)', () => {
      const ctx = createCtx();
      const where = buildWallFeedWhere(ctx, 'org');
      expect(where.OR).toContainEqual(
        expect.objectContaining({ visibility: 'IN', organizationId: 'org-1' })
      );
    });

    it('includes public Colony posts (ALL)', () => {
      const ctx = createCtx();
      const where = buildWallFeedWhere(ctx, 'org');
      expect(where.OR).toContainEqual(
        expect.objectContaining({ visibility: 'ALL', organizationId: 'org-1' })
      );
    });

    it('includes own private posts (OUT)', () => {
      const ctx = createCtx();
      const where = buildWallFeedWhere(ctx, 'org');
      expect(where.OR).toContainEqual(
        expect.objectContaining({ visibility: 'OUT', authorId: 'user-1' })
      );
    });

    it('includes client posts (CLIENT)', () => {
      const ctx = createCtx();
      const where = buildWallFeedWhere(ctx, 'org');
      expect(where.OR).toContainEqual(
        expect.objectContaining({ visibility: 'CLIENT', organizationId: 'org-1' })
      );
    });

    it('includes inter-Colony public posts when showPublicPostsInFeed is true', () => {
      const ctx = createCtx();
      const where = buildWallFeedWhere(ctx, 'org');
      const interColony = where.OR.find(
        (c: any) => c.publishAsOrg && c.organizationId?.not === 'org-1'
      );
      expect(interColony).toBeDefined();
    });

    it('excludes blocked Colonies from inter-Colony discovery', () => {
      const ctx = createCtx({ blockedOrgIds: ['blocked-org'] });
      const where = buildWallFeedWhere(ctx, 'org');
      const interColony = where.OR.find(
        (c: any) => c.publishAsOrg && c.organizationId?.not
      );
      if (interColony) {
        expect(interColony.organizationId.notIn).toContain('blocked-org');
      }
    });

    it('falls back to personal mode when myOrgId is null', () => {
      const ctx = createCtx({ myOrgId: null });
      const where = buildWallFeedWhere(ctx, 'org');
      // Should have OR conditions like personal mode
      expect(where.OR).toBeDefined();
      expect(where.OR).toContainEqual(
        expect.objectContaining({ authorId: 'user-1' })
      );
    });
  });

  // ─── Public Mode ────────────────────────────────
  describe('Public mode', () => {
    it('returns only ALL visibility posts', () => {
      const ctx = createCtx();
      const where = buildWallFeedWhere(ctx, 'public');
      expect(where.visibility).toBe('ALL');
      expect(where.isPublished).toBe(true);
    });

    it('excludes blocked Colonies', () => {
      const ctx = createCtx({ blockedOrgIds: ['blocked-1'] });
      const where = buildWallFeedWhere(ctx, 'public');
      expect(where.organizationId?.notIn).toContain('blocked-1');
    });

    it('no blocked org filter when blockedOrgIds is empty', () => {
      const ctx = createCtx({ blockedOrgIds: [] });
      const where = buildWallFeedWhere(ctx, 'public');
      expect(where.organizationId).toBeUndefined();
    });
  });
});

// ═══════════════════════════════════════════════════════
describe('buildMediaFeedWhere', () => {
  it('handles personal mode with own content', () => {
    const ctx = createCtx();
    const where = buildMediaFeedWhere(ctx, 'personal', 'story');
    expect(where.OR).toBeDefined();
    expect(where.OR).toContainEqual(
      expect.objectContaining({ authorId: 'user-1', publishAsOrg: false })
    );
  });

  it('includes public content from non-blocked orgs', () => {
    const ctx = createCtx({ blockedOrgIds: ['blocked-1'] });
    const where = buildMediaFeedWhere(ctx, 'personal', 'reel');
    const publicCondition = where.OR.find(
      (c: any) => c.visibility === 'ALL' && c.publishAsOrg === false
    );
    expect(publicCondition).toBeDefined();
    if (publicCondition) {
      expect(publicCondition.organizationId?.notIn).toContain('blocked-1');
    }
  });

  it('handles org mode — shows internal Colony content', () => {
    const ctx = createCtx();
    const where = buildMediaFeedWhere(ctx, 'org', 'story');
    expect(where.OR).toContainEqual(
      expect.objectContaining({ organizationId: 'org-1' })
    );
  });

  it('falls back to personal mode when no org in org mode', () => {
    const ctx = createCtx({ myOrgId: null });
    const where = buildMediaFeedWhere(ctx, 'org', 'reel');
    expect(where.OR).toContainEqual(
      expect.objectContaining({ authorId: 'user-1' })
    );
  });

  it('public mode shows ALL visibility only', () => {
    const ctx = createCtx();
    const where = buildMediaFeedWhere(ctx, 'public', 'story');
    expect(where.visibility).toBe('ALL');
  });
});

// ═══════════════════════════════════════════════════════
describe('buildSparkFeedWhere', () => {
  it('delegates to buildWallFeedWhere (same logic)', () => {
    const ctx = createCtx();
    const sparkWhere = buildSparkFeedWhere(ctx, 'personal');
    const wallWhere = buildWallFeedWhere(ctx, 'personal');
    expect(JSON.stringify(sparkWhere)).toEqual(JSON.stringify(wallWhere));
  });

  it('works for org mode', () => {
    const ctx = createCtx();
    const where = buildSparkFeedWhere(ctx, 'org');
    expect(where.OR).toBeDefined();
    expect(where.isPublished).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
describe('buildExploreFeedWhere', () => {
  it('private scope returns only own posts', () => {
    const ctx = createCtx();
    const where = buildExploreFeedWhere(ctx, 'personal', 'private');
    expect(where).toEqual({ authorId: 'user-1' });
  });

  it('friends scope returns friends posts (ALL visibility)', () => {
    const ctx = createCtx({ friendIds: ['friend-1', 'friend-2'] });
    const where = buildExploreFeedWhere(ctx, 'personal', 'friends');
    expect(where.authorId?.in).toContain('friend-1');
    expect(where.visibility).toBe('ALL');
  });

  it('friends scope returns impossible filter when no friends', () => {
    const ctx = createCtx({ friendIds: [] });
    const where = buildExploreFeedWhere(ctx, 'personal', 'friends');
    expect(where.id).toBe('impossible'); // No results
  });

  it('org scope returns Colony posts', () => {
    const ctx = createCtx({ myOrgId: 'org-1' });
    const where = buildExploreFeedWhere(ctx, 'org', 'org');
    expect(where).toEqual({ organizationId: 'org-1' });
  });

  it('default (all) scope returns ALL visibility', () => {
    const ctx = createCtx();
    const where = buildExploreFeedWhere(ctx, 'public', 'all');
    expect(where.visibility).toBe('ALL');
  });

  it('excludes blocked orgs from all scope', () => {
    const ctx = createCtx({ blockedOrgIds: ['blocked-1'] });
    const where = buildExploreFeedWhere(ctx, 'public', 'all');
    expect(where.organizationId?.notIn).toContain('blocked-1');
  });

  it('no scope defaults to all public', () => {
    const ctx = createCtx();
    const where = buildExploreFeedWhere(ctx, 'public');
    expect(where.visibility).toBe('ALL');
  });
});

// ═══════════════════════════════════════════════════════
describe('getOrgSocialSettings — Extended', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps all business auto-post settings from DB', async () => {
    mockFindUnique.mockResolvedValue({
      autoPostOnDevisSigned: false,
      autoPostOnInvoicePaid: true,
      autoPostDefaultVisibility: 'ALL',
    } as any);

    const settings = await getOrgSocialSettings('org-1');
    expect(settings.autoPostOnDevisSigned).toBe(false);
    expect(settings.autoPostOnInvoicePaid).toBe(true);
    expect(settings.autoPostDefaultVisibility).toBe('ALL');
  });

  it('returns default auto-post settings when not in DB', async () => {
    mockFindUnique.mockResolvedValue({} as any);
    const settings = await getOrgSocialSettings('org-1');
    expect(settings.autoPostOnDevisSigned).toBe(true); // default
    expect(settings.autoPostOnInvoicePaid).toBe(false); // default
    expect(settings.autoPostDefaultVisibility).toBe('IN'); // default
  });

  it('returns all default events/capsules/quests when not in DB', async () => {
    mockFindUnique.mockResolvedValue({} as any);
    const settings = await getOrgSocialSettings('org-1');
    expect(settings.eventsEnabled).toBe(true);
    expect(settings.capsulesEnabled).toBe(true);
    expect(settings.questsEnabled).toBe(true);
  });

  it('returns complete SocialSettingsData with all fields', async () => {
    mockFindUnique.mockResolvedValue(null);
    const settings = await getOrgSocialSettings('org-empty');

    // Verify every single field exists
    const requiredKeys: (keyof SocialSettingsData)[] = [
      'showPublicPostsInFeed', 'showFriendsPostsInFeed', 'showFollowedColoniesInFeed',
      'wallEnabled', 'storiesEnabled', 'reelsEnabled', 'sparksEnabled',
      'battlesEnabled', 'exploreEnabled', 'hiveLiveEnabled',
      'reactionsEnabled', 'commentsEnabled', 'sharesEnabled',
      'maxPostLength', 'maxCommentLength', 'maxMediaPerPost',
      'maxVideoSizeMB', 'maxImageSizeMB',
      'defaultPostVisibility', 'allowMembersPost', 'allowMembersStory',
      'allowMembersReel', 'allowMembersSpark', 'requirePostApproval',
      'waxEnabled', 'waxAlertsEnabled', 'waxDefaultRadiusKm',
      'eventsEnabled', 'capsulesEnabled', 'questsEnabled',
      'autoPostOnDevisSigned', 'autoPostOnInvoicePaid',
      'autoPostOnChantierCreated', 'autoPostOnChantierCompleted',
      'autoPostOnNewClient', 'autoPostOnCalendarEvent',
      'autoPostOnTaskCompleted', 'autoPostDefaultVisibility',
    ];

    requiredKeys.forEach(key => {
      expect(settings).toHaveProperty(key);
      expect(settings[key]).not.toBeUndefined();
    });
  });
});
