/**
 * Tests pour les routes call-to-lead-mappings (src/routes/call-to-lead-mappings.ts)
 * Vérifie CRUD complet avec vérification d'accès organisationnel
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/lib/database.js', () => ({
  db: {
    callToLeadMapping: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('../../src/lib/database', () => ({
  db: {
    callToLeadMapping: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('../../src/middlewares/auth.js', () => ({
  authMiddleware: (_req: any, _res: any, next: any) => {
    _req.user = { id: 'u1', userId: 'u1', organizationId: 'org-1', role: 'admin', isSuperAdmin: false };
    next();
  },
  requireRole: (_roles: string[]) => (_req: any, _res: any, next: any) => next(),
  AuthenticatedRequest: {},
}));

import { db } from '../../src/lib/database';
import express from 'express';
import callToLeadRouter from '../../src/routes/call-to-lead-mappings';

const app = express();
app.use(express.json());
app.use('/api/ctlm', callToLeadRouter);

const mockMapping = vi.mocked(db.callToLeadMapping);

function req(method: string, path: string, body?: unknown) {
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  return fetch(baseUrl + path, opts).then(async r => ({ status: r.status, body: await r.json() }));
}

let server: import('http').Server;
let baseUrl: string;

describe('Call-to-Lead Mappings routes', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await new Promise<void>(resolve => {
      server = app.listen(0, () => {
        const addr = server.address() as import('net').AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}/api/ctlm`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    await new Promise<void>(r => server.close(() => r()));
  });

  it('GET / returns all mappings for organization', async () => {
    mockMapping.findMany.mockResolvedValue([
      { id: 'm1', callStatusId: 'cs1', leadStatusId: 'ls1', priority: 1 },
    ] as any);
    const res = await req('GET', '/');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(mockMapping.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: 'org-1' },
    }));
  });

  it('POST / creates a mapping', async () => {
    mockMapping.create.mockResolvedValue({ id: 'm-new', organizationId: 'org-1', callStatusId: 'cs1', leadStatusId: 'ls1' } as any);
    const res = await req('POST', '/', { callStatusId: 'cs1', leadStatusId: 'ls1' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(mockMapping.create).toHaveBeenCalled();
  });

  it('POST / returns 400 if callStatusId missing', async () => {
    const res = await req('POST', '/', { leadStatusId: 'ls1' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST / returns 400 if leadStatusId missing', async () => {
    const res = await req('POST', '/', { callStatusId: 'cs1' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('PUT /:id updates existing mapping', async () => {
    mockMapping.findFirst.mockResolvedValue({ id: 'm1', organizationId: 'org-1' } as any);
    mockMapping.update.mockResolvedValue({ id: 'm1', priority: 5 } as any);
    const res = await req('PUT', '/m1', { priority: 5 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockMapping.findFirst).toHaveBeenCalledWith({ where: { id: 'm1', organizationId: 'org-1' } });
  });

  it('PUT /:id returns 404 if mapping not in org', async () => {
    mockMapping.findFirst.mockResolvedValue(null);
    const res = await req('PUT', '/m-other', { priority: 5 });
    expect(res.status).toBe(404);
  });

  it('DELETE /:id deletes existing mapping', async () => {
    mockMapping.findFirst.mockResolvedValue({ id: 'm1', organizationId: 'org-1' } as any);
    mockMapping.delete.mockResolvedValue({ id: 'm1' } as any);
    const res = await req('DELETE', '/m1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('DELETE /:id returns 404 if mapping not in org', async () => {
    mockMapping.findFirst.mockResolvedValue(null);
    const res = await req('DELETE', '/m-other');
    expect(res.status).toBe(404);
  });
});
