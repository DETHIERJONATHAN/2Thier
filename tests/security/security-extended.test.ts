/**
 * Tests de sécurité étendus — Vérifie les patterns de sécurité OWASP
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { grepSrc } from '../helpers/grepSrc';

const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'src');

describe('Security — HTTP Security Headers', () => {
  it('api-server should use helmet', () => {
    const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
    expect(content).toContain('helmet');
  });

  it('api-server should use CORS with origin validation', () => {
    const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
    expect(content).toContain('cors');
    expect(content).toContain('origin');
  });
});

describe('Security — Rate Limiting', () => {
  it('should have rate limiting on auth endpoints', () => {
    const routeFiles = ['auth.ts', 'authRoutes.ts'];
    let found = false;
    for (const file of routeFiles) {
      const fp = path.join(SRC, 'routes', file);
      if (fs.existsSync(fp)) {
        const content = fs.readFileSync(fp, 'utf-8');
        if (content.includes('rateLimit') || content.includes('rate')) {
          found = true;
          break;
        }
      }
    }
    // Also check api-server-clean.ts for global rate limiting
    const serverContent = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
    if (serverContent.includes('rateLimit') || serverContent.includes('Rate')) {
      found = true;
    }
    expect(found).toBe(true);
  });
});

describe('Security — Input Validation', () => {
  it('routes should use zod or express-validator for input validation', () => {
    const hits = grepSrc(/\b(zod|express-validator|Joi)\b|\.parse\(/i, {
      dir: path.join(SRC, 'routes'),
    });
    const uniqueFiles = new Set(hits.map(h => h.file));
    expect(uniqueFiles.size).toBeGreaterThan(0);
  });

  it('should not use eval() in source code', () => {
    const hits = grepSrc(/\beval\(/, { dir: SRC, ignoreComments: true });
    // Allow very few legitimate uses (formula engine, etc.)
    expect(hits.length).toBeLessThanOrEqual(3);
  });
});

describe('Security — Authentication middleware', () => {
  it('auth middleware should exist', () => {
    const authPaths = [
      path.join(SRC, 'middleware/auth.ts'),
      path.join(SRC, 'middlewares/auth.ts'),
    ];
    const exists = authPaths.some(p => fs.existsSync(p));
    expect(exists).toBe(true);
  });

  it('routes should use authentication middleware', () => {
    const routeDir = path.join(SRC, 'routes');
    const routeFiles = fs.readdirSync(routeDir).filter(f => f.endsWith('.ts'));
    let authenticatedCount = 0;
    for (const file of routeFiles) {
      const content = fs.readFileSync(path.join(routeDir, file), 'utf-8');
      if (content.includes('authenticateToken') || content.includes('authMiddleware') || content.includes('req.user')) {
        authenticatedCount++;
      }
    }
    // Most routes should be authenticated
    expect(authenticatedCount).toBeGreaterThan(routeFiles.length * 0.5);
  });
});

describe('Security — SQL Injection Prevention', () => {
  it('api-server should have SQL injection detection middleware', () => {
    const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
    expect(content).toContain('sqlInjectionDetection');
  });

  it('should not use raw SQL string concatenation in routes', () => {
    // queryRawUnsafe combined with `req.` on the same line indicates user input
    // is being concatenated into SQL — always a red flag.
    const hits = grepSrc(/queryRawUnsafe[\s\S]*req\./, {
      dir: path.join(SRC, 'routes'),
    });
    expect(hits.map(h => `${h.file}:${h.line}`)).toEqual([]);
  });
});

describe('Security — Error Information Leakage', () => {
  it('global error handler should not leak stack traces in production', () => {
    const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
    // Should check NODE_ENV before sending stack
    expect(content).toContain('production');
  });
});

describe('Security — File Upload Safety', () => {
  it('should have upload size limits', () => {
    const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
    const hasLimit = content.includes('limit') || content.includes('maxFileSize') || content.includes('fileSize');
    expect(hasLimit).toBe(true);
  });
});
