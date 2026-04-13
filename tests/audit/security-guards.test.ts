/**
 * Tests de sécurité avancés — Wave 9
 * Vérifie les gardes de sécurité critiques
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const SRC = path.resolve(__dirname, '../../src');
const ROOT = path.resolve(__dirname, '../..');

describe('Security — No Secrets in Source Code', () => {
  it('should not have hardcoded JWT secret values', () => {
    // Check for actual hardcoded secret values like: JWT_SECRET = "mysecret" 
    // Imports and process.env references are fine
    const result = execSync(
      'grep -rn "JWT_SECRET" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v process.env | grep -v ".test." | grep -v node_modules | grep -v "import " | grep -v "require(" | grep -v "REQUIRED_ENV" || true',
      { cwd: ROOT, encoding: 'utf-8' }
    );
    const violations = result.trim().split('\n').filter(l => {
      if (!l) return false;
      // Allow usage of imported JWT_SECRET constant (no literal assignment)
      return l.match(/JWT_SECRET\s*=\s*['"][^'"]+['"]/);
    });
    expect(violations.length).toBe(0);
  });

  it('should not have hardcoded database password values', () => {
    const result = execSync(
      'grep -rn "PGPASSWORD" src/ --include="*.ts" 2>/dev/null | grep -v process.env | grep -v ".test." || true',
      { cwd: ROOT, encoding: 'utf-8' }
    );
    const violations = result.trim().split('\n').filter(l => {
      if (!l) return false;
      return l.match(/PGPASSWORD\s*=\s*['"][^'"]+['"]/);
    });
    expect(violations.length).toBe(0);
  });
});

describe('Security — Authentication Middleware Coverage', () => {
  it('critical route files should require authentication', () => {
    // These specific route files MUST have auth middleware — they handle sensitive data
    const criticalProtectedFiles = [
      'debug.ts',
      'batch-routes.ts',
      'documents.ts',
      'modules.ts',
      'tbl-batch-routes.ts',
      'product-documents.ts',
      'ai.ts',
      'ai-internal.ts',
      'form-sections.ts',
      'users.ts',
      'organizations-simple.ts',
      'tbl-select-config-route.ts',
      'validations.ts',
      'sync-temp.ts',
      'new-integrations.ts',
    ];
    
    const routeDir = path.join(SRC, 'routes');
    for (const file of criticalProtectedFiles) {
      const filePath = path.join(routeDir, file);
      if (!fs.existsSync(filePath)) continue;
      
      const content = fs.readFileSync(filePath, 'utf-8');
      const hasAuth = content.includes('authenticateToken') || 
                      content.includes('authMiddleware') ||
                      content.includes('req.user');
      expect(hasAuth, `${file} must have authentication`).toBe(true);
    }
  });

  it('no mounted route should be completely unprotected', () => {
    const routeDir = path.join(SRC, 'routes');
    const routeFiles = fs.readdirSync(routeDir).filter(f => f.endsWith('.ts') && !f.includes('.test.'));
    
    // Intentionally public routes (webhooks, public forms, health)
    const intentionallyPublic = ['auth.ts', 'health.ts', 'google-auth.ts', 'hosting.ts', 'index.ts', 
                                  'public-form.ts', 'public-forms.ts', 'publicLeads.ts', 'direct-lead.ts', 'test.ts'];
    
    const unprotected: string[] = [];
    for (const file of routeFiles) {
      if (intentionallyPublic.includes(file)) continue;
      const content = fs.readFileSync(path.join(routeDir, file), 'utf-8');
      const hasAuth = content.includes('authenticateToken') || 
                      content.includes('authMiddleware') ||
                      content.includes('requireRole') ||
                      content.includes('requirePermission') ||
                      content.includes('req.user');
      const hasRoutes = content.match(/router\.(get|post|put|delete|patch)\(/);
      if (!hasAuth && hasRoutes) {
        unprotected.push(file);
      }
    }
    expect(unprotected, `Unprotected routes found: ${unprotected.join(', ')}`).toHaveLength(0);
  });
});

describe('Security — CORS & Headers', () => {
  it('should have CORS configured', () => {
    const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
    expect(content).toContain('cors');
  });

  it('should have Helmet configured', () => {
    const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
    expect(content).toContain('helmet');
  });

  it('should have HSTS enabled', () => {
    const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
    expect(content).toMatch(/hsts|strictTransportSecurity/i);
  });
});

describe('Security — Input Validation', () => {
  it('should have input sanitization middleware', () => {
    const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
    expect(content).toContain('inputSanitization');
  });

  it('should have SQL injection detection', () => {
    const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
    expect(content).toContain('sqlInjectionDetection');
  });
});

describe('Security — Rate Limiting', () => {
  it('should have general rate limiting', () => {
    const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
    expect(content).toContain('advancedRateLimit');
  });

  it('should have AI-specific rate limiting', () => {
    const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
    expect(content).toContain('aiRateLimit');
  });

  it('should have upload-specific rate limiting', () => {
    const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
    expect(content).toContain('uploadRateLimit');
  });
});

describe('Security — Graceful Shutdown', () => {
  it('should handle SIGTERM', () => {
    const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
    expect(content).toContain('SIGTERM');
  });

  it('should handle SIGINT', () => {
    const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
    expect(content).toContain('SIGINT');
  });

  it('should close database on shutdown', () => {
    const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
    expect(content).toContain('$disconnect');
  });
});
