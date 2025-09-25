import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import treebranchleafRouter from '../src/components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes';

const app = express();
app.use(express.json());
// Inject user super admin + bypass header compat
app.use((req: express.Request & { user?: unknown }, _res, next) => { req.user = { organizationId: 'org-test', isSuperAdmin: true }; next(); });
app.use('/api/treebranchleaf', treebranchleafRouter as unknown as express.Router);

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

describe('API Formulas Cache', () => {
  let server: import('http').Server; let baseUrl: string;
  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as import('net').AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}/api/treebranchleaf`;
        resolve();
      });
    });
  });
  afterAll(async () => { await new Promise<void>((r) => server.close(() => r())); });

  it('purge le cache après au moins une évaluation', async () => {
    // 1. Provoquer une évaluation pour remplir le cache
    const evalRes = await jsonFetch(baseUrl, '/evaluate/formula', { body: { expr: '{{a}} + 1', rolesMap: { a: 'A' }, values: { A: 2 } } });
    expect(evalRes.status).toBe(200);
    expect(evalRes.body.value).toBe(3);

    // 2. Purger le cache
    const clearRes = await jsonFetch(baseUrl, '/formulas/cache/clear', { method: 'POST', body: {} });
    expect(clearRes.status).toBe(200);
    expect(clearRes.body).toHaveProperty('cleared', true);
    // stats.entries devrait être 0 juste après purge
    expect(clearRes.body?.stats?.entries).toBe(0);
  });
});
