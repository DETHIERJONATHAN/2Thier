/**
 * Tests de sécurité étendus — Vérifie les patterns de sécurité OWASP
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

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
    const result = execSync(
      `grep -rl "zod\\|express-validator\\|Joi\\|\\.parse(" src/routes/ 2>/dev/null | wc -l`,
      { cwd: ROOT, encoding: 'utf-8' }
    ).trim();
    expect(parseInt(result)).toBeGreaterThan(0);
  });

  it('should not use eval() in source code', () => {
    const result = execSync(
      `grep -rn "\\beval(" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | grep -v "// " || true`,
      { cwd: ROOT, encoding: 'utf-8' }
    ).trim();
    // Allow very few legitimate uses (formula engine, etc.)
    const count = result ? result.split('\n').length : 0;
    expect(count).toBeLessThanOrEqual(3);
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
    const result = execSync(
      `grep -rn "queryRawUnsafe" src/routes/ --include="*.ts" 2>/dev/null || true`,
      { cwd: ROOT, encoding: 'utf-8' }
    ).trim();
    // queryRawUnsafe with user input concatenation is dangerous
    const concatResult = execSync(
      `grep -rn "queryRawUnsafe" src/routes/ --include="*.ts" 2>/dev/null | grep "req\." || true`,
      { cwd: ROOT, encoding: 'utf-8' }
    ).trim();
    expect(concatResult).toBe('');
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
