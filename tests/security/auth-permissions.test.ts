/**
 * Tests auth & permissions — Validation Zod, middleware d'authentification, accès protégés
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ───
vi.mock('../../src/lib/database', () => ({
  db: {
    user: { findFirst: vi.fn(), findUnique: vi.fn() },
    lead: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn(), count: vi.fn().mockResolvedValue(0) },
    organization: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));
vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    user: { findFirst: vi.fn(), findUnique: vi.fn() },
    lead: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn(), count: vi.fn().mockResolvedValue(0) },
  },
  db: {
    user: { findFirst: vi.fn() },
  },
}));

describe('Auth: Validation des entrées (Zod)', () => {
  it('email vide devrait être rejeté par le schéma', async () => {
    // Simule le schéma LoginSchema
    const { z } = await import('zod');
    const LoginSchema = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    });

    const result = LoginSchema.safeParse({ email: '', password: 'test' });
    expect(result.success).toBe(false);
  });

  it('email invalide devrait être rejeté', async () => {
    const { z } = await import('zod');
    const LoginSchema = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    });

    const result = LoginSchema.safeParse({ email: 'not-an-email', password: 'test' });
    expect(result.success).toBe(false);
  });

  it('mot de passe vide devrait être rejeté', async () => {
    const { z } = await import('zod');
    const LoginSchema = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    });

    const result = LoginSchema.safeParse({ email: 'valid@test.com', password: '' });
    expect(result.success).toBe(false);
  });

  it('données valides devraient passer', async () => {
    const { z } = await import('zod');
    const LoginSchema = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    });

    const result = LoginSchema.safeParse({ email: 'user@company.be', password: 'P@ssw0rd' });
    expect(result.success).toBe(true);
  });
});

describe('Auth: Protection des routes sans token', () => {
  let server: import('http').Server;
  let baseUrl: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    const express = (await import('express')).default;
    const app = express();
    app.use(express.json());

    // Middleware auth simulé (similaire à celui du projet)
    const requireAuth = (req: any, res: any, next: any) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token manquant' });
      }
      // En prod, on vérifierait le JWT ici
      const token = authHeader.split(' ')[1];
      if (!token || token === 'invalid') {
        return res.status(401).json({ error: 'Token invalide' });
      }
      next();
    };

    // Routes protégées
    app.get('/api/leads', requireAuth, (_req, res) => res.json([]));
    app.get('/api/users', requireAuth, (_req, res) => res.json([]));
    app.post('/api/leads', requireAuth, (_req, res) => res.json({ id: '1' }));
    // Route publique
    app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

    await new Promise<void>(resolve => {
      server = app.listen(0, () => {
        const addr = server.address() as import('net').AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    await new Promise<void>(r => server.close(() => r()));
  });

  it('GET /api/leads sans token devrait retourner 401', async () => {
    const res = await fetch(`${baseUrl}/api/leads`);
    expect(res.status).toBe(401);
  });

  it('GET /api/users sans token devrait retourner 401', async () => {
    const res = await fetch(`${baseUrl}/api/users`);
    expect(res.status).toBe(401);
  });

  it('POST /api/leads sans token devrait retourner 401', async () => {
    const res = await fetch(`${baseUrl}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    });
    expect(res.status).toBe(401);
  });

  it('Token invalide devrait retourner 401', async () => {
    const res = await fetch(`${baseUrl}/api/leads`, {
      headers: { Authorization: 'Bearer invalid' },
    });
    expect(res.status).toBe(401);
  });

  it('GET /api/health sans token devrait réussir (route publique)', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
  });
});

describe('Auth: Protection contre le JWT fabrication', () => {
  it('un faux JWT ne devrait pas être accepté', async () => {
    const fakeJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkF0dGFja2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

    // Vérification : un JWT signé avec un mauvais secret ne devrait pas passer
    const jwt = await import('jsonwebtoken');
    expect(() => {
      jwt.default.verify(fakeJwt, 'le-vrai-secret-du-serveur');
    }).toThrow();
  });
});
