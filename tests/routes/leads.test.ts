/**
 * Tests pour les routes leads (src/routes/leads.ts)
 * Couvre GET /, POST / — validation + contrôle d'accès organisationnel
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks hoistés ─────────────────────────────────────────────
vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    organization: { findMany: vi.fn(), findUnique: vi.fn() },
    lead: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    leadStatus: { findFirst: vi.fn() },
    user: { findUnique: vi.fn(), findFirst: vi.fn() },
  },
  db: {
    organization: { findMany: vi.fn(), findUnique: vi.fn() },
    lead: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    leadStatus: { findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

vi.mock('../../src/middlewares/auth', () => ({
  authMiddleware: (_req: any, _res: any, next: any) => {
    _req.user = { id: 'u1', userId: 'u1', organizationId: 'org-1', role: 'member', isSuperAdmin: false };
    next();
  },
  AuthenticatedRequest: {},
}));

vi.mock('../../src/middlewares/impersonation', () => ({
  impersonationMiddleware: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../src/services/business-auto-post', () => ({
  createBusinessAutoPost: vi.fn().mockResolvedValue(null),
}));

import { prisma } from '../../src/lib/prisma';
import express from 'express';
import leadsRouter from '../../src/routes/leads';

const app = express();
app.use(express.json());
app.use('/api/leads', leadsRouter);

const mockPrisma = vi.mocked(prisma);

function req(method: string, path: string, body?: unknown) {
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  return fetch(baseUrl + path, opts).then(async r => ({ status: r.status, body: await r.json().catch(() => ({})) }));
}

let server: import('http').Server;
let baseUrl: string;

describe('Leads routes — GET /', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await new Promise<void>(resolve => {
      server = app.listen(0, () => {
        const addr = server.address() as import('net').AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}/api/leads`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    await new Promise<void>(r => server.close(() => r()));
  });

  it("retourne la liste des leads de l'organisation", async () => {
    const leads = [{ id: 'l1', firstName: 'Jean', lastName: 'Test', organizationId: 'org-1' }];
    mockPrisma.lead.findMany.mockResolvedValue(leads as any);
    mockPrisma.lead.count.mockResolvedValue(1);
    const res = await req('GET', '/');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Leads routes — POST /', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await new Promise<void>(resolve => {
      server = app.listen(0, () => {
        const addr = server.address() as import('net').AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}/api/leads`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    await new Promise<void>(r => server.close(() => r()));
  });

  it('retourne 400 si le statut est manquant', async () => {
    const res = await req('POST', '/', { firstName: 'Jean' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('statut');
  });

  it("retourne 404 si l'organisation n'existe pas", async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(null);
    const res = await req('POST', '/', { status: 'nouveau', firstName: 'Jean' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Organisation');
  });

  it('crée un lead avec les données valides', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1', name: 'TestOrg' } as any);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'u1', email: 'u1@test.be' } as any);
    const newLead = { id: 'l-new', firstName: 'Jean', organizationId: 'org-1', status: 'nouveau' };
    mockPrisma.lead.create.mockResolvedValue(newLead as any);
    const res = await req('POST', '/', { status: 'nouveau', firstName: 'Jean', lastName: 'Test' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('l-new');
    expect(mockPrisma.lead.create).toHaveBeenCalled();
  });
});
