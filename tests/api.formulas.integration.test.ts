import { describe, it, expect } from 'vitest';
import express from 'express';
import treebranchleafRouter from '../src/components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes';

// Crée une app express minimaliste avec middleware JSON
const app = express();
app.use(express.json());
// Mock simple d'auth (injecte user pour passer authenticateToken dans route réelle si nécessaire)
app.use((req: express.Request, _res, next) => { (req as unknown as { user?: unknown }).user = { organizationId: 'org-test', isSuperAdmin: true }; next(); });
app.use('/api/treebranchleaf', treebranchleafRouter as unknown as express.Router);

// NOTE: si authenticateToken impose autre chose, on l'adaptera.

function jsonFetch(base: string, path: string, init?: RequestInit & { body?: unknown }) {
  const opts: RequestInit = { ...init };
  if (init?.body && typeof init.body !== 'string') {
    opts.body = JSON.stringify(init.body);
    opts.headers = { 'Content-Type': 'application/json', ...(init.headers||{}) } as Record<string,string>;
    opts.method = opts.method || 'POST';
  }
  opts.headers = { ...(opts.headers||{}), 'x-test-bypass-auth': '1' } as Record<string,string>;
  return fetch(base + path, opts).then(async r => ({ status: r.status, body: await r.json() }));
}

describe('API Formulas Integration', () => {
  let server: import('http').Server; let baseUrl: string | undefined;
  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
  const info = addr as import('net').AddressInfo;
  baseUrl = `http://127.0.0.1:${info.port}/api/treebranchleaf`;
        resolve();
      });
    });
  });
  afterAll(async () => { await new Promise<void>((r) => server.close(() => r())); });

  it('GET /formulas-version retourne version', async () => {
    expect(baseUrl).toBeDefined();
    const res = await jsonFetch(baseUrl!, '/formulas-version', { method: 'GET' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('version');
  });

  it('POST /evaluate/formula calcule une expression simple', async () => {
    expect(baseUrl).toBeDefined();
    const res = await jsonFetch(baseUrl!, '/evaluate/formula', { body: { expr: '{{a}} + {{b}} * 2', rolesMap: { a: 'A', b: 'B' }, values: { A: 3, B: 4 } } });
    expect(res.status).toBe(200);
    expect(res.body.value).toBe(11);
  });

  it('POST /evaluate/formula strictVariables signale variable manquante', async () => {
    expect(baseUrl).toBeDefined();
    const res = await jsonFetch(baseUrl!, '/evaluate/formula', { body: { expr: '{{a}} + {{b}}', rolesMap: { a: 'A', b: 'B' }, values: { A: 1 }, options: { strict: true } } });
    expect(res.status).toBe(200);
    expect(res.body.errors).toContain('unknown_variable');
  });

  it('POST /evaluate/formula retourne erreur parsing expression invalide', async () => {
    expect(baseUrl).toBeDefined();
    const res = await jsonFetch(baseUrl!, '/evaluate/formula', { body: { expr: '((1+2', rolesMap: {}, values: {} } });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
