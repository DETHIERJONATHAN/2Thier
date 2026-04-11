/**
 * Tests pour les routes company (src/routes/company.ts)
 * Vérifie GET /, PUT /, GET /settings
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/lib/database.js', () => ({
  db: {
    organization: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../src/lib/database', () => ({
  db: {
    organization: {
      findUnique: vi.fn(),
      update: vi.fn(),
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
import companyRouter from '../../src/routes/company';

const app = express();
app.use(express.json());
app.use('/api/company', companyRouter);

const mockOrg = vi.mocked(db.organization);

function req(method: string, path: string, body?: unknown) {
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  return fetch(baseUrl + path, opts).then(async r => ({ status: r.status, body: await r.json() }));
}

let server: import('http').Server;
let baseUrl: string;

describe('Company routes', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await new Promise<void>(resolve => {
      server = app.listen(0, () => {
        const addr = server.address() as import('net').AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}/api/company`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    await new Promise<void>(r => server.close(() => r()));
  });

  it('GET / returns organization data from DB', async () => {
    mockOrg.findUnique.mockResolvedValue({
      id: 'org-1', name: 'TestOrg', address: '123 Rue', phone: '0470000000',
      email: 'test@org.be', website: 'https://org.be', vatNumber: 'BE123', legalName: 'TestOrg SA', logoUrl: null,
    } as any);
    const res = await req('GET', '/');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('TestOrg');
    expect(mockOrg.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'org-1' },
    }));
  });

  it('GET / returns 404 when org not found', async () => {
    mockOrg.findUnique.mockResolvedValue(null);
    const res = await req('GET', '/');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('PUT / updates organization', async () => {
    mockOrg.update.mockResolvedValue({
      id: 'org-1', name: 'Updated', address: '456 Rue', phone: '0471111111',
      email: 'new@org.be', website: null, vatNumber: null, legalName: null,
    } as any);
    const res = await req('PUT', '/', { name: 'Updated', address: '456 Rue' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Updated');
    expect(mockOrg.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'org-1' },
    }));
  });

  it('GET /settings returns org settings', async () => {
    mockOrg.findUnique.mockResolvedValue({ id: 'org-1', name: 'TestOrg' } as any);
    const res = await req('GET', '/settings');
    expect(res.status).toBe(200);
    expect(res.body.data.currency).toBe('EUR');
    expect(res.body.data.timezone).toBe('Europe/Brussels');
  });

  it('GET /settings returns 404 when org not found', async () => {
    mockOrg.findUnique.mockResolvedValue(null);
    const res = await req('GET', '/settings');
    expect(res.status).toBe(404);
  });
});
