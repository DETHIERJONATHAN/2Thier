/**
 * Tests pour les routes auth (src/routes/auth.ts)
 * Vérifie POST /login, GET /me — validation des entrées
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    user: { findFirst: vi.fn() },
  },
  db: {
    user: { findFirst: vi.fn() },
  },
}));

vi.mock('../../src/lib/database', () => ({
  db: {
    user: { findFirst: vi.fn() },
  },
}));

import { prisma } from '../../src/lib/prisma';
import express from 'express';
import authRouter from '../../src/routes/auth';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

const mockUser = vi.mocked(prisma.user);

function req(method: string, path: string, body?: unknown) {
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  return fetch(baseUrl + path, opts).then(async r => ({ status: r.status, body: await r.json() }));
}

let server: import('http').Server;
let baseUrl: string;

describe('Auth routes', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await new Promise<void>(resolve => {
      server = app.listen(0, () => {
        const addr = server.address() as import('net').AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}/api/auth`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    await new Promise<void>(r => server.close(() => r()));
  });

  // ── POST /login ──
  it('POST /login returns 400 when email is missing', async () => {
    const res = await req('POST', '/login', {});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /login returns 404 when user not found', async () => {
    mockUser.findFirst.mockResolvedValue(null);
    const res = await req('POST', '/login', { email: 'nonexistent@test.com' });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('POST /login returns user data on success', async () => {
    mockUser.findFirst.mockResolvedValue({
      id: 'u1', email: 'test@org.be', firstName: 'Jean', lastName: 'Test',
      UserOrganization: [{ Organization: { id: 'org-1', name: 'TestOrg' } }],
    } as any);
    const res = await req('POST', '/login', { email: 'test@org.be' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.currentUser.email).toBe('test@org.be');
    expect(res.body.currentUser.organizations).toHaveLength(1);
    expect(res.body.token).toBeDefined();
  });

  // ── GET /me ──
  it('GET /me returns 401 when no user in DB', async () => {
    mockUser.findFirst.mockResolvedValue(null);
    const res = await req('GET', '/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /me returns first user as fallback', async () => {
    mockUser.findFirst.mockResolvedValue({
      id: 'u1', email: 'test@org.be', firstName: 'Jean', lastName: 'Test',
      UserOrganization: [{ Organization: { id: 'org-1', name: 'TestOrg' } }],
    } as any);
    const res = await req('GET', '/me');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
