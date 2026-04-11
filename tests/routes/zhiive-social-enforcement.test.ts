/**
 * Tests pour l'enforcement des SocialSettings dans zhiive.ts
 * Couvre: RSVP events, dismiss sparks, saved reels, story view
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/lib/database', () => ({
  db: {
    eventAttendee: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    sparkDismiss: { upsert: vi.fn() },
    savedReel: { upsert: vi.fn(), deleteMany: vi.fn() },
    storyView: { findUnique: vi.fn(), create: vi.fn() },
    story: { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn(), delete: vi.fn() },
    wallPost: { findMany: vi.fn() },
    spark: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    battle: { findMany: vi.fn(), create: vi.fn() },
    socialEvent: { findMany: vi.fn(), create: vi.fn() },
    timeCapsule: { findMany: vi.fn(), create: vi.fn() },
    quest: { findMany: vi.fn(), findUnique: vi.fn() },
    questProgress: { upsert: vi.fn() },
    commentLike: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(), count: vi.fn() },
    follow: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(), findMany: vi.fn() },
    orgFollow: { findMany: vi.fn() },
    friendship: { findMany: vi.fn() },
    orgBlock: { findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
    socialSettings: { findUnique: vi.fn() },
    battleEntry: { create: vi.fn() },
    sparkVote: { upsert: vi.fn() },
  },
}));

vi.mock('../../src/middleware/auth', () => ({
  authenticateToken: (_req: any, _res: any, next: any) => {
    _req.user = { id: 'u1', organizationId: 'org-1', role: 'member', isSuperAdmin: false };
    next();
  },
}));

vi.mock('../../src/lib/feed-visibility', () => ({
  getSocialContext: vi.fn(),
  getOrgSocialSettings: vi.fn(),
  buildExploreFeedWhere: vi.fn().mockReturnValue({}),
  buildSparkFeedWhere: vi.fn().mockReturnValue({}),
  buildMediaFeedWhere: vi.fn().mockReturnValue({}),
  FeedMode: {},
}));

vi.mock('../../src/lib/storage', () => ({
  uploadExpressFile: vi.fn(),
}));

vi.mock('../../src/routes/push', () => ({
  sendPushToUser: vi.fn(),
}));

vi.mock('../../src/services/ai-moderation', () => ({
  moderateContent: vi.fn().mockResolvedValue({ flagged: false }),
}));

import { db } from '../../src/lib/database';
import { getOrgSocialSettings } from '../../src/lib/feed-visibility';
import express from 'express';
import zhiiveRouter from '../../src/routes/zhiive';

const app = express();
app.use(express.json());
app.use('/api/zhiive', zhiiveRouter);

const ENABLED_SETTINGS = {
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
  eventsEnabled: true,
  capsulesEnabled: true,
  questsEnabled: true,
  waxEnabled: true,
  waxAlertsEnabled: true,
  maxPostLength: 5000,
  maxCommentLength: 2000,
  maxMediaPerPost: 10,
  maxVideoSizeMB: 100,
  maxImageSizeMB: 10,
  allowMembersPost: true,
  allowMembersStory: true,
  allowMembersReel: true,
  allowMembersSpark: true,
  moderationMode: 'disabled',
  requirePostApproval: false,
};

const mockDb = vi.mocked(db);
const mockGetSettings = vi.mocked(getOrgSocialSettings);

function req(method: string, path: string, body?: unknown) {
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  return fetch(baseUrl + path, opts).then(async r => ({ status: r.status, body: await r.json().catch(() => ({})) }));
}

let server: import('http').Server;
let baseUrl: string;

// ═══ RSVP events enforcement ═══
describe('Zhiive — RSVP events enforcement', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetSettings.mockResolvedValue(ENABLED_SETTINGS as any);
    await new Promise<void>(resolve => {
      server = app.listen(0, () => {
        const addr = server.address() as import('net').AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}/api/zhiive`;
        resolve();
      });
    });
  });
  afterEach(async () => { await new Promise<void>(r => server.close(() => r())); });

  it('POST /events/:id/rsvp — 403 si eventsEnabled=false', async () => {
    mockGetSettings.mockResolvedValue({ ...ENABLED_SETTINGS, eventsEnabled: false } as any);
    const res = await req('POST', '/events/evt1/rsvp', { status: 'GOING' });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Events disabled');
  });

  it('POST /events/:id/rsvp — crée RSVP si events activés', async () => {
    mockDb.eventAttendee.findUnique.mockResolvedValue(null);
    mockDb.eventAttendee.create.mockResolvedValue({ id: 'a1' } as any);
    const res = await req('POST', '/events/evt1/rsvp', { status: 'GOING' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('DELETE /events/:id/rsvp — 403 si eventsEnabled=false', async () => {
    mockGetSettings.mockResolvedValue({ ...ENABLED_SETTINGS, eventsEnabled: false } as any);
    const res = await req('DELETE', '/events/evt1/rsvp');
    expect(res.status).toBe(403);
  });
});

// ═══ Spark dismiss enforcement ═══
describe('Zhiive — Spark dismiss enforcement', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetSettings.mockResolvedValue(ENABLED_SETTINGS as any);
    await new Promise<void>(resolve => {
      server = app.listen(0, () => {
        const addr = server.address() as import('net').AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}/api/zhiive`;
        resolve();
      });
    });
  });
  afterEach(async () => { await new Promise<void>(r => server.close(() => r())); });

  it('POST /sparks/:id/dismiss — 403 si sparksEnabled=false', async () => {
    mockGetSettings.mockResolvedValue({ ...ENABLED_SETTINGS, sparksEnabled: false } as any);
    const res = await req('POST', '/sparks/sp1/dismiss');
    expect(res.status).toBe(403);
  });

  it('POST /sparks/:id/dismiss — ok si sparks activés', async () => {
    mockDb.sparkDismiss.upsert.mockResolvedValue({ id: 'd1' } as any);
    const res = await req('POST', '/sparks/sp1/dismiss');
    expect(res.status).toBe(200);
    expect(res.body.dismissed).toBe(true);
  });
});

// ═══ Saved reels enforcement ═══
describe('Zhiive — Saved reels enforcement', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetSettings.mockResolvedValue(ENABLED_SETTINGS as any);
    await new Promise<void>(resolve => {
      server = app.listen(0, () => {
        const addr = server.address() as import('net').AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}/api/zhiive`;
        resolve();
      });
    });
  });
  afterEach(async () => { await new Promise<void>(r => server.close(() => r())); });

  it('POST /saved-reels/:id — 403 si reelsEnabled=false', async () => {
    mockGetSettings.mockResolvedValue({ ...ENABLED_SETTINGS, reelsEnabled: false } as any);
    const res = await req('POST', '/saved-reels/p1');
    expect(res.status).toBe(403);
  });

  it('POST /saved-reels/:id — sauvegarde ok', async () => {
    mockDb.savedReel.upsert.mockResolvedValue({ id: 'sr1' } as any);
    const res = await req('POST', '/saved-reels/p1');
    expect(res.status).toBe(200);
    expect(res.body.saved).toBe(true);
  });

  it('DELETE /saved-reels/:id — 403 si reelsEnabled=false', async () => {
    mockGetSettings.mockResolvedValue({ ...ENABLED_SETTINGS, reelsEnabled: false } as any);
    const res = await req('DELETE', '/saved-reels/p1');
    expect(res.status).toBe(403);
  });
});

// ═══ Story view enforcement ═══
describe('Zhiive — Story view enforcement', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetSettings.mockResolvedValue(ENABLED_SETTINGS as any);
    await new Promise<void>(resolve => {
      server = app.listen(0, () => {
        const addr = server.address() as import('net').AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}/api/zhiive`;
        resolve();
      });
    });
  });
  afterEach(async () => { await new Promise<void>(r => server.close(() => r())); });

  it('POST /stories/:id/view — 403 si storiesEnabled=false', async () => {
    mockGetSettings.mockResolvedValue({ ...ENABLED_SETTINGS, storiesEnabled: false } as any);
    const res = await req('POST', '/stories/s1/view');
    expect(res.status).toBe(403);
  });

  it('POST /stories/:id/view — enregistre vue ok', async () => {
    mockDb.storyView.findUnique.mockResolvedValue(null);
    mockDb.storyView.create.mockResolvedValue({ id: 'v1' } as any);
    const res = await req('POST', '/stories/s1/view');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
