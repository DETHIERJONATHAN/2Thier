/**
 * Tests pour les routes wall (src/routes/wall.ts)
 * Couvre la création de posts avec enforcement des social settings
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks hoistés ─────────────────────────────────────────────
vi.mock('../../src/lib/database', () => ({
  db: {
    wallPost: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn(), delete: vi.fn() },
    userPhoto: { createMany: vi.fn() },
    socialSettings: { findUnique: vi.fn() },
    wallReaction: { findFirst: vi.fn(), create: vi.fn(), delete: vi.fn() },
    wallComment: { create: vi.fn(), findMany: vi.fn() },
    wallShare: { findFirst: vi.fn(), create: vi.fn() },
    follow: { findMany: vi.fn() },
    orgFollow: { findMany: vi.fn() },
    friendship: { findMany: vi.fn() },
    orgBlock: { findFirst: vi.fn() },
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
  buildWallFeedWhere: vi.fn().mockReturnValue({}),
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

vi.mock('../../src/constants/reactions', () => ({
  REACTION_TYPE_VALUES: ['LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY'] as const,
}));

import { db } from '../../src/lib/database';
import { getOrgSocialSettings } from '../../src/lib/feed-visibility';
import express from 'express';
import wallRouter from '../../src/routes/wall';

const app = express();
app.use(express.json());
app.use('/api/wall', wallRouter);

const DEFAULT_SETTINGS = {
  wallEnabled: true,
  allowMembersPost: true,
  maxPostLength: 5000,
  maxMediaPerPost: 10,
  maxVideoSizeMB: 100,
  maxImageSizeMB: 10,
  requirePostApproval: false,
  moderationMode: 'disabled',
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

describe('Wall — POST /posts', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetSettings.mockResolvedValue(DEFAULT_SETTINGS as any);
    await new Promise<void>(resolve => {
      server = app.listen(0, () => {
        const addr = server.address() as import('net').AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}/api/wall`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    await new Promise<void>(r => server.close(() => r()));
  });

  it('crée un post avec contenu valide', async () => {
    const mockPost = { id: 'p1', content: 'Hello Hive', authorId: 'u1', author: {}, organization: null, parentPost: null };
    mockDb.wallPost.create.mockResolvedValue(mockPost as any);
    const res = await req('POST', '/posts', { content: 'Hello Hive' });
    expect(res.status).toBe(201);
    expect(mockDb.wallPost.create).toHaveBeenCalled();
  });

  it('retourne 403 si le mur est désactivé', async () => {
    mockGetSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, wallEnabled: false } as any);
    const res = await req('POST', '/posts', { content: 'test' });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('désactivé');
  });

  it('retourne 403 si les membres ne peuvent pas poster', async () => {
    mockGetSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, allowMembersPost: false } as any);
    const res = await req('POST', '/posts', { content: 'test' });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('administrateurs');
  });

  it('retourne 400 si contenu dépasse maxPostLength', async () => {
    mockGetSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, maxPostLength: 10 } as any);
    const res = await req('POST', '/posts', { content: 'A'.repeat(11) });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('limite');
  });

  it('retourne 400 si trop de médias', async () => {
    mockGetSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, maxMediaPerPost: 2 } as any);
    const res = await req('POST', '/posts', { content: 'test', mediaUrls: ['a', 'b', 'c'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('médias');
  });

  it('retourne 400 si visibility CLIENT sans targetLeadId', async () => {
    const res = await req('POST', '/posts', { content: 'test', visibility: 'CLIENT' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('targetLeadId');
  });

  it('retourne 400 si ni contenu ni médias', async () => {
    const res = await req('POST', '/posts', {});
    expect(res.status).toBe(400);
  });

  it('post en attente si requirePostApproval est activé (non-admin)', async () => {
    mockGetSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, requirePostApproval: true } as any);
    const mockPost = { id: 'p2', content: 'test', isPublished: false, author: {}, organization: null, parentPost: null };
    mockDb.wallPost.create.mockResolvedValue(mockPost as any);
    const res = await req('POST', '/posts', { content: 'test' });
    expect(res.status).toBe(201);
    expect(mockDb.wallPost.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isPublished: false }) })
    );
  });
});

describe('Wall — DELETE /posts/:id', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await new Promise<void>(resolve => {
      server = app.listen(0, () => {
        const addr = server.address() as import('net').AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}/api/wall`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    await new Promise<void>(r => server.close(() => r()));
  });

  it("retourne 404 si le post n'existe pas", async () => {
    mockDb.wallPost.findUnique.mockResolvedValue(null);
    const res = await req('DELETE', '/posts/nonexistent');
    expect(res.status).toBe(404);
  });

  it("retourne 403 si non auteur et non admin", async () => {
    mockDb.wallPost.findUnique.mockResolvedValue({ id: 'p1', authorId: 'other-user', organizationId: 'org-1' } as any);
    const res = await req('DELETE', '/posts/p1');
    expect(res.status).toBe(403);
  });

  it('supprime le post si auteur', async () => {
    mockDb.wallPost.findUnique.mockResolvedValue({ id: 'p1', authorId: 'u1', organizationId: 'org-1' } as any);
    mockDb.wallPost.delete.mockResolvedValue({ id: 'p1' } as any);
    const res = await req('DELETE', '/posts/p1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
