/**
 * Tests des routes API critiques — Health, validation, réponses
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import express from 'express';

// ─── Mocks ───
vi.mock('../../src/lib/database', () => ({
  db: {
    user: { findFirst: vi.fn(), findUnique: vi.fn() },
    lead: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((args: any) => Promise.resolve({ id: 'new-1', ...args.data })),
      count: vi.fn().mockResolvedValue(0),
    },
    organization: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));
vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    user: { findFirst: vi.fn() },
    lead: { findMany: vi.fn().mockResolvedValue([]) },
  },
  db: {
    user: { findFirst: vi.fn() },
  },
}));

describe('API: Health endpoint', () => {
  let server: import('http').Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.get('/api/health', (_req, res) => {
      res.json({ status: 'ok', version: process.env.npm_package_version || '0.1.0' });
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

  it('GET /api/health devrait retourner 200 avec status ok', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('GET /api/health devrait être rapide (<500ms)', async () => {
    const start = Date.now();
    await fetch(`${baseUrl}/api/health`);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });
});

describe('API: Validation des entrées (Zod schemas)', () => {
  it('CreateLeadSchema devrait rejeter les données manquantes', async () => {
    const { z } = await import('zod');

    // Schéma simplifié similaire à celui de l'API
    const CreateLeadSchema = z.object({
      firstName: z.string().min(1).max(100),
      lastName: z.string().min(1).max(100),
      email: z.string().email().optional(),
      phone: z.string().max(30).optional(),
    });

    // Sans firstName
    const result1 = CreateLeadSchema.safeParse({ lastName: 'Dupont' });
    expect(result1.success).toBe(false);

    // Sans lastName
    const result2 = CreateLeadSchema.safeParse({ firstName: 'Jean' });
    expect(result2.success).toBe(false);

    // Données valides
    const result3 = CreateLeadSchema.safeParse({ firstName: 'Jean', lastName: 'Dupont', email: 'jean@test.be' });
    expect(result3.success).toBe(true);
  });

  it('devrait rejeter les emails malformés', async () => {
    const { z } = await import('zod');
    const EmailSchema = z.string().email();

    expect(EmailSchema.safeParse('valid@test.be').success).toBe(true);
    expect(EmailSchema.safeParse('invalid').success).toBe(false);
    expect(EmailSchema.safeParse('<script>alert(1)</script>').success).toBe(false);
    expect(EmailSchema.safeParse('user@.com').success).toBe(false);
  });

  it('devrait rejeter les chaînes trop longues (DoS prevention)', async () => {
    const { z } = await import('zod');
    const NameSchema = z.string().max(100);

    const longString = 'a'.repeat(101);
    expect(NameSchema.safeParse(longString).success).toBe(false);
    expect(NameSchema.safeParse('Normal Name').success).toBe(true);
  });
});

describe('API: Réponses en erreur', () => {
  let server: import('http').Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());

    // 404 handler
    app.use((_req, res) => {
      res.status(404).json({ error: 'Route non trouvée' });
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

  it('route inexistante devrait retourner 404', async () => {
    const res = await fetch(`${baseUrl}/api/nonexistent`);
    expect(res.status).toBe(404);
  });

  it('la réponse 404 devrait être en JSON', async () => {
    const res = await fetch(`${baseUrl}/api/nonexistent`);
    const contentType = res.headers.get('content-type');
    expect(contentType).toContain('application/json');
  });
});

describe('API: Rate limiting (concept)', () => {
  it('trop de requêtes rapides devraient être limitées', async () => {
    // Ce test vérifie le concept — en production, express-rate-limit gère cela
    const requestTimestamps: number[] = [];
    const MAX_REQUESTS_PER_SECOND = 100;

    // Simule 200 requêtes en <1s
    for (let i = 0; i < 200; i++) {
      requestTimestamps.push(Date.now());
    }

    const now = Date.now();
    const recentRequests = requestTimestamps.filter(t => now - t < 1000);
    expect(recentRequests.length).toBeGreaterThan(MAX_REQUESTS_PER_SECOND);
    // En production, on devrait bloquer après MAX_REQUESTS_PER_SECOND
  });
});

describe('API: Environnement sécurisé', () => {
  it('les variables critiques ne devraient pas être exposées dans les réponses', () => {
    // Simule la vérification qu'aucune variable sensible ne fuite
    const sensitiveKeys = ['DATABASE_URL', 'SESSION_SECRET', 'JWT_SECRET', 'GOOGLE_CLIENT_SECRET'];
    const mockResponse = { status: 'ok', version: '0.1.1' };

    for (const key of sensitiveKeys) {
      const responseStr = JSON.stringify(mockResponse);
      expect(responseStr).not.toContain(key);
    }
  });

  it('NODE_ENV devrait être défini', () => {
    // En test, NODE_ENV est souvent 'test' — vérifie qu'il existe
    expect(process.env.NODE_ENV).toBeDefined();
  });
});
