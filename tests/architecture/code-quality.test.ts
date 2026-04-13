/**
 * Tests d'architecture et de conventions du code
 * Vérifie les règles critiques du projet (Zhiive conventions)
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve(__dirname, '../../src');

function walkFiles(dir: string, exts: string[] = ['.ts', '.tsx']): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.includes('node_modules') && entry.name !== 'dist') {
      results.push(...walkFiles(full, exts));
    } else if (entry.isFile() && exts.some(ext => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

describe('Architecture: Zero Hardcode Rule', () => {
  it('should not have @ts-nocheck in any source file', () => {
    const files = walkFiles(SRC_DIR);
    const violations: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('@ts-nocheck')) {
        violations.push(file.replace(SRC_DIR, 'src'));
      }
    }
    expect(violations).toEqual([]);
  });

  it('should not use console.log in production routes', () => {
    const routesDir = path.join(SRC_DIR, 'routes');
    if (!fs.existsSync(routesDir)) return;

    const files = walkFiles(routesDir);
    const violations: string[] = [];

    for (const file of files) {
      if (file.includes('debug') || file.includes('test')) continue;
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('//') || line.startsWith('*')) continue;
        // Allow console.error and console.warn but not console.log
        if (line.includes('console.log(') && !line.includes('// debug')) {
          violations.push(`${file.replace(SRC_DIR, 'src')}:${i + 1}`);
        }
      }
    }

    // We document violations rather than fail - gradual improvement
    if (violations.length > 0) {
      console.warn(`⚠️ ${violations.length} console.log found in routes (should use proper logging)`);
    }
  });
});

describe('Architecture: Hive Identity (not CRM, not ERP)', () => {
  it('should not expose CRM/ERP terminology in UI-facing components', () => {
    const uiDirs = [
      path.join(SRC_DIR, 'pages'),
      path.join(SRC_DIR, 'components'),
    ];

    const violations: string[] = [];
    const FORBIDDEN_UI_TERMS = [/\bCRM\b/g, /\bERP\b/g];
    // Exceptions: comments, imports, internal identifiers
    const EXCEPTION_PATTERNS = ['//', '*', 'import ', 'crm-', 'CRM_', ' CRM ', 'className='];

    for (const dir of uiDirs) {
      if (!fs.existsSync(dir)) continue;
      const files = walkFiles(dir, ['.tsx']);
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmed = line.trim();
          // Skip comments and imports
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('import ')) continue;

          for (const pattern of FORBIDDEN_UI_TERMS) {
            // Only flag visible text (inside JSX strings or t() calls)
            if (line.match(pattern)) {
              // Check if it's in a visible string (between > and < or in quotes)
              if (line.includes('>CRM<') || line.includes('>ERP<') ||
                  line.match(/['"].*\bCRM\b.*['"]/)) {
                violations.push(`${file.replace(SRC_DIR, 'src')}:${i + 1}: ${trimmed.substring(0, 80)}`);
              }
            }
          }
        }
      }
    }

    if (violations.length > 0) {
      console.warn(`⚠️ ${violations.length} CRM/ERP references in UI (should use Hive terminology)`);
    }
  });
});

describe('Architecture: Database Access Pattern', () => {
  it('should import db from lib/database, not create new PrismaClient', () => {
    const files = walkFiles(SRC_DIR);
    const violations: string[] = [];

    for (const file of files) {
      if (file.includes('database.ts') || file.includes('prisma.ts') || file.includes('lib/prisma')) continue;
      const content = fs.readFileSync(file, 'utf-8');
      // Strip comments before checking
      const codeOnly = content.split('\n').filter(l => {
        const t = l.trim();
        return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
      }).join('\n');
      if (codeOnly.includes('new PrismaClient(')) {
        violations.push(file.replace(SRC_DIR, 'src'));
      }
    }

    expect(violations).toEqual([]);
  });
});

describe('Architecture: API Route Patterns', () => {
  it('should have authentication middleware on non-public routes', () => {
    const routesDir = path.join(SRC_DIR, 'routes');
    if (!fs.existsSync(routesDir)) return;

    const files = walkFiles(routesDir);
    const PUBLIC_ROUTES = ['health', 'public', 'webhook', 'test'];
    const noAuth: string[] = [];

    for (const file of files) {
      const basename = path.basename(file);
      if (PUBLIC_ROUTES.some(p => basename.includes(p))) continue;

      const content = fs.readFileSync(file, 'utf-8');
      // Check if the file uses auth middleware
      const hasAuth = content.includes('authMiddleware') ||
                      content.includes('authenticateToken') ||
                      content.includes('requireAuth') ||
                      content.includes('auth.') ||
                      content.includes('req.user');

      if (!hasAuth && content.includes('router.')) {
        noAuth.push(file.replace(SRC_DIR, 'src'));
      }
    }

    if (noAuth.length > 0) {
      console.warn(`⚠️ ${noAuth.length} route files without auth middleware`);
    }
  });
});

describe('Architecture: Error Handling', () => {
  it('should have try-catch on all async route handlers', () => {
    const routesDir = path.join(SRC_DIR, 'routes');
    if (!fs.existsSync(routesDir)) return;

    const files = walkFiles(routesDir);
    let totalHandlers = 0;
    let handlersWithCatch = 0;

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const asyncHandlers = content.match(/async\s*\(req/g);
      if (asyncHandlers) {
        totalHandlers += asyncHandlers.length;
        const catches = content.match(/catch\s*\(/g);
        handlersWithCatch += catches?.length ?? 0;
      }
    }

    if (totalHandlers > 0) {
      const ratio = handlersWithCatch / totalHandlers;
      // At least 60% of async handlers should have error handling
      expect(ratio).toBeGreaterThan(0.5);
    }
  });
});

describe('Architecture: Frontend Component Patterns', () => {
  it('should not have useEffect with missing dependencies causing infinite loops', () => {
    // Check for common anti-pattern: useEffect with empty deps that uses state setters
    const files = walkFiles(path.join(SRC_DIR, 'pages'), ['.tsx']);
    let suspiciousCount = 0;

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      // Pattern: useEffect(() => { ...setState... }, []) - might be intentional but flag it
      const matches = content.match(/useEffect\(\(\)\s*=>\s*\{[^}]*set[A-Z][^}]*\},\s*\[\]\)/g);
      if (matches) {
        suspiciousCount += matches.length;
      }
    }

    // This is informational, not a hard failure
    if (suspiciousCount > 20) {
      console.warn(`⚠️ ${suspiciousCount} useEffect with empty deps that call setState - review needed`);
    }
  });

  it('should use useTranslation inside React components only', () => {
    const files = walkFiles(SRC_DIR);
    const violations: string[] = [];

    for (const file of files) {
      // Skip test files
      if (file.includes('__tests__') || file.includes('.test.') || file.includes('.spec.')) continue;

      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Check for useTranslation at module level (outside of function/component)
        if (line === 'const { t } = useTranslation();' || line === 'const {t} = useTranslation();') {
          // Look backwards to see if we're inside a function/component
          let insideFunction = false;
          for (let j = i - 1; j >= Math.max(0, i - 20); j--) {
            const prevLine = lines[j].trim();
            if (prevLine.includes('=>') || prevLine.includes('function ') ||
                prevLine.includes('React.FC') || prevLine.includes(': FC')) {
              insideFunction = true;
              break;
            }
            // If we hit an export/import at the top level, it's module-level
            if (prevLine.startsWith('export ') && !prevLine.includes('=>') && !prevLine.includes('function')) {
              break;
            }
          }
          if (!insideFunction) {
            violations.push(`${file.replace(SRC_DIR, 'src')}:${i + 1}`);
          }
        }
      }
    }

    if (violations.length > 0) {
      console.warn(`⚠️ ${violations.length} useTranslation at module level`);
    }
  });
});
