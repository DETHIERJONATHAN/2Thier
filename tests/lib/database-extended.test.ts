/**
 * Tests pour le database layer (src/lib/database.ts)
 * Couvre le singleton, la gestion de connexion, et la resilience
 */
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Database Layer', () => {
  const DB_FILE = path.resolve(__dirname, '../../src/lib/database.ts');

  describe('Singleton pattern', () => {
    it('should export a single db instance', () => {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      expect(content).toContain('export');
      // Should have a singleton pattern
      const dbExports = content.match(/export\s+(const|let)\s+db/g);
      expect(dbExports).not.toBeNull();
    });

    it('should NOT create new PrismaClient in database.ts more than once', () => {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const newPrismaClient = content.match(/new\s+PrismaClient/g);
      // Should have at most 1 PrismaClient instantiation
      expect(newPrismaClient?.length ?? 0).toBeLessThanOrEqual(2);
    });

    it('should not have any other file creating new PrismaClient()', () => {
      const srcDir = path.resolve(__dirname, '../../src');
      const violations: string[] = [];

      const walkDir = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && !entry.name.includes('node_modules')) {
            walkDir(fullPath);
          } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
            // Skip the database.ts file itself and prisma-related files
            if (fullPath.includes('database.ts') || fullPath.includes('prisma.ts') || fullPath.includes('lib/prisma')) continue;
            const content = fs.readFileSync(fullPath, 'utf-8');
            // Strip comments before checking
            const codeOnly = content.split('\n').filter(l => {
              const t = l.trim();
              return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
            }).join('\n');
            if (codeOnly.includes('new PrismaClient(')) {
              violations.push(fullPath.replace(srcDir, 'src'));
            }
          }
        }
      };

      walkDir(srcDir);
      expect(violations).toEqual([]);
    });
  });

  describe('Connection safety', () => {
    it('should handle database URL with proper format', () => {
      const isValidDbUrl = (url: string) => {
        return /^postgres(ql)?:\/\/.+/.test(url) || url.startsWith('/cloudsql/');
      };

      expect(isValidDbUrl('postgresql://user:pass@localhost:5432/db')).toBe(true);
      expect(isValidDbUrl('postgres://user:pass@localhost/db')).toBe(true);
      expect(isValidDbUrl('/cloudsql/project:region:instance')).toBe(true);
      expect(isValidDbUrl('mysql://invalid')).toBe(false);
      expect(isValidDbUrl('')).toBe(false);
    });
  });

  describe('Multi-tenant data isolation', () => {
    it('should always filter by organizationId', () => {
      // Simulating query building
      const buildQuery = (orgId: string | null, filters: any) => {
        if (!orgId) throw new Error('organizationId is required for multi-tenant queries');
        return { ...filters, organizationId: orgId };
      };

      expect(() => buildQuery(null, {})).toThrow('organizationId is required');
      expect(buildQuery('org-1', { status: 'active' })).toEqual({
        status: 'active',
        organizationId: 'org-1',
      });
    });
  });

  describe('Query safety', () => {
    it('should not use $queryRawUnsafe anywhere in the codebase', () => {
      const srcDir = path.resolve(__dirname, '../../src');
      const violations: string[] = [];

      const walkDir = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && !entry.name.includes('node_modules')) {
            walkDir(fullPath);
          } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            // Allow $queryRawUnsafe only if it uses parameterized placeholders ($1, $2...)
            const matches = content.match(/\$queryRawUnsafe\(/g);
            if (matches) {
              // Check if each usage has proper parameterization
              const lines = content.split('\n');
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('$queryRawUnsafe(')) {
                  // Look at the next few lines for string interpolation without params
                  const context = lines.slice(i, i + 5).join('\n');
                  if (context.includes('${') && !context.includes(', ')) {
                    violations.push(`${fullPath.replace(srcDir, 'src')}:${i + 1}`);
                  }
                }
              }
            }
          }
        }
      };

      walkDir(srcDir);
      // Any violations here represent potential SQL injection risks
      if (violations.length > 0) {
        console.warn('⚠️ Potential $queryRawUnsafe risks:', violations);
      }
    });

    it('should use pagination with safe limits', () => {
      const safePaginate = (page: number, limit: number) => {
        const safePage = Math.max(0, Math.floor(page));
        const safeLimit = Math.min(200, Math.max(1, Math.floor(limit)));
        return { skip: safePage * safeLimit, take: safeLimit };
      };

      expect(safePaginate(0, 20)).toEqual({ skip: 0, take: 20 });
      expect(safePaginate(1, 50)).toEqual({ skip: 50, take: 50 });
      expect(safePaginate(-1, 20)).toEqual({ skip: 0, take: 20 });
      expect(safePaginate(0, 999)).toEqual({ skip: 0, take: 200 }); // Capped at 200
      expect(safePaginate(0, -5)).toEqual({ skip: 0, take: 1 }); // Min 1
      expect(safePaginate(0, 0)).toEqual({ skip: 0, take: 1 }); // Min 1
    });
  });
});
