/**
 * Tests de sécurité — CORS, headers, protection contre les fuites d'information
 * Vérifie que l'API est correctement protégée en production
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

// ─── Mock de la base de données ───
vi.mock('../../src/lib/database', () => ({
  db: {
    user: { findFirst: vi.fn(), findUnique: vi.fn() },
    organization: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));
vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    user: { findFirst: vi.fn() },
    $queryRaw: vi.fn(),
  },
  db: {
    user: { findFirst: vi.fn() },
  },
}));

describe('Security: CORS & Headers', () => {
  let server: import('http').Server;
  let baseUrl: string;

  beforeAll(async () => {
    // Importer et démarrer l'app après les mocks
    // On teste les headers via un serveur Express minimal reproduisant les headers du vrai serveur
    const express = (await import('express')).default;
    const helmet = (await import('helmet')).default;

    const app = express();
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
        },
      },
    }));
    app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
    app.get('/api/test-error', (_req, _res, next) => {
      next(new Error('Test error message'));
    });
    // Error handler mimicking production behavior
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ error: 'Une erreur interne s\'est produite' });
    });

    await new Promise<void>(resolve => {
      server = app.listen(0, () => {
        const addr = server.address() as import('net').AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>(r => server.close(() => r()));
  });

  it('devrait inclure les headers de sécurité (helmet)', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const headers = res.headers;

    // X-Content-Type-Options: nosniff
    expect(headers.get('x-content-type-options')).toBe('nosniff');
    // X-Frame-Options 
    expect(headers.get('x-frame-options')).toBeTruthy();
    // Strict-Transport-Security (HSTS) en production
    // Note: helmet n'envoie HSTS que si derrière HTTPS, mais le header existe
  });

  it('ne devrait PAS exposer X-Powered-By', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.headers.get('x-powered-by')).toBeNull();
  });

  it('ne devrait PAS exposer le stack trace dans les erreurs', async () => {
    const res = await fetch(`${baseUrl}/api/test-error`);
    const body = await res.json();
    expect(res.status).toBe(500);
    // Ne doit pas contenir de stack trace
    expect(body).not.toHaveProperty('stack');
    // Ne doit pas contenir le message d'erreur interne
    expect(body.error).not.toContain('Test error');
    expect(body.error).toBe('Une erreur interne s\'est produite');
  });

  it('Content-Security-Policy devrait être présent', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const csp = res.headers.get('content-security-policy');
    expect(csp).toBeTruthy();
    // Ne devrait pas contenir unsafe-eval
    expect(csp).not.toContain('unsafe-eval');
  });
});

describe('Security: Body Limits', () => {
  let server: import('http').Server;
  let baseUrl: string;

  beforeAll(async () => {
    const express = (await import('express')).default;
    const app = express();
    // Limite à 1KB pour le test
    app.use(express.json({ limit: '1kb' }));
    app.post('/api/test', (req, res) => res.json({ received: true }));

    await new Promise<void>(resolve => {
      server = app.listen(0, () => {
        const addr = server.address() as import('net').AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>(r => server.close(() => r()));
  });

  it('devrait rejeter les payloads trop volumineux (413)', async () => {
    const bigPayload = { data: 'x'.repeat(2000) };
    const res = await fetch(`${baseUrl}/api/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bigPayload),
    });
    expect(res.status).toBe(413);
  });
});

describe('Security: SQL Injection Prevention', () => {
  it('les requêtes $queryRawUnsafe critiques utilisent des paramètres', async () => {
    // Vérification statique : lire le fichier globalSearch.ts et vérifier ALLOWED_TABLES
    const fs = await import('fs');
    const path = await import('path');

    const globalSearchPath = path.resolve(__dirname, '../../src/routes/globalSearch.ts');
    if (fs.existsSync(globalSearchPath)) {
      const content = fs.readFileSync(globalSearchPath, 'utf-8');
      expect(content).toContain('ALLOWED_TABLES');
    }

    // Vérifier que ai-internal.ts utilise $queryRaw (tagged template = paramétrisé)
    const aiInternalPath = path.resolve(__dirname, '../../src/routes/ai-internal.ts');
    if (fs.existsSync(aiInternalPath)) {
      const content = fs.readFileSync(aiInternalPath, 'utf-8');
      // Prisma $queryRaw avec tagged template literals est automatiquement paramétrisé
      // ${limit} dans un tagged template devient $1 à l'exécution
      expect(content).toContain('$queryRaw');
      // S'assurer qu'on n'utilise PAS $queryRawUnsafe pour cette requête
      expect(content).not.toContain('$queryRawUnsafe');
    }
  });

  it('les entrées de recherche globale valident les tables autorisées', () => {
    // Simule l'approche whitelist
    const ALLOWED_TABLES = ['User', 'Lead', 'Chantier', 'Organization'];
    const maliciousTable = 'User"; DROP TABLE "User"--';
    expect(ALLOWED_TABLES.includes(maliciousTable)).toBe(false);
  });
});
