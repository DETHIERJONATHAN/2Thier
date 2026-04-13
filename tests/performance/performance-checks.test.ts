/**
 * Tests de performance — Vérifie les bonnes pratiques de performance
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'src');

describe('Performance — Bundle optimization', () => {
  it('vite.config should exist', () => {
    expect(fs.existsSync(path.join(ROOT, 'vite.config.ts'))).toBe(true);
  });

  it('should not import entire lodash (use lodash-es or individual imports)', () => {
    const result = execSync(
      `grep -rn "from 'lodash'" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "lodash-es" | grep -v "lodash/" || true`,
      { cwd: ROOT, encoding: 'utf-8' }
    ).trim();
    const count = result ? result.split('\n').length : 0;
    // Allow a few, but should mostly use tree-shakeable imports
    expect(count).toBeLessThanOrEqual(5);
  });

  it('should use React.lazy for route-level code splitting', () => {
    // Check App.tsx or routing setup
    const appFiles = ['App.tsx', 'routes.tsx', 'AppRoutes.tsx'].map(f => path.join(SRC, f));
    let hasLazy = false;
    for (const fp of appFiles) {
      if (fs.existsSync(fp)) {
        const content = fs.readFileSync(fp, 'utf-8');
        if (content.includes('React.lazy') || content.includes('lazy(')) {
          hasLazy = true;
          break;
        }
      }
    }
    expect(hasLazy).toBe(true);
  });
});

describe('Performance — Image optimization', () => {
  it('should not have excessively large images in public/', () => {
    const publicDir = path.join(ROOT, 'public');
    if (!fs.existsSync(publicDir)) return;
    
    const result = execSync(
      `find public/ -type f \\( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \\) -size +2M 2>/dev/null || true`,
      { cwd: ROOT, encoding: 'utf-8' }
    ).trim();
    const count = result ? result.split('\n').filter(Boolean).length : 0;
    expect(count).toBeLessThanOrEqual(15);
  });
});

describe('Performance — Database queries', () => {
  it('critical routes should use select/include to limit query scope', () => {
    const routeFiles = ['wall.ts', 'messenger.ts', 'leads.ts'];
    let selectCount = 0;
    for (const file of routeFiles) {
      const fp = path.join(SRC, 'routes', file);
      if (fs.existsSync(fp)) {
        const content = fs.readFileSync(fp, 'utf-8');
        if (content.includes('select:') || content.includes('include:')) {
          selectCount++;
        }
      }
    }
    expect(selectCount).toBeGreaterThan(0);
  });

  it('findMany calls in route files should have take/limit', () => {
    const routeDir = path.join(SRC, 'routes');
    const routeFiles = fs.readdirSync(routeDir).filter(f => f.endsWith('.ts'));
    let totalFindMany = 0;
    let totalTake = 0;
    for (const file of routeFiles) {
      const content = fs.readFileSync(path.join(routeDir, file), 'utf-8');
      totalFindMany += (content.match(/findMany/g) || []).length;
      totalTake += (content.match(/take:/g) || []).length;
    }
    if (totalFindMany > 0) {
      const ratio = totalTake / totalFindMany;
      expect(ratio).toBeGreaterThan(0.2);
    }
  });
});

describe('Performance — Caching', () => {
  it('should have service worker for caching', () => {
    expect(fs.existsSync(path.join(SRC, 'sw.ts'))).toBe(true);
  });

  it('api server should set cache-control for static or public resources', () => {
    const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
    const hasStatic = content.includes('express.static') || content.includes('Cache-Control') || content.includes('cache');
    expect(hasStatic).toBe(true);
  });
});

describe('Performance — Memory leaks prevention', () => {
  it('should not have setInterval without cleanup in routes', () => {
    const routeDir = path.join(SRC, 'routes');
    const routeFiles = fs.readdirSync(routeDir).filter(f => f.endsWith('.ts'));
    let intervalWithoutCleanup = 0;
    for (const file of routeFiles) {
      const content = fs.readFileSync(path.join(routeDir, file), 'utf-8');
      const intervals = (content.match(/setInterval/g) || []).length;
      const clears = (content.match(/clearInterval/g) || []).length;
      if (intervals > 0 && clears === 0) {
        // Intervals in server routes are sometimes OK (cleanup tasks), but should have clear
        intervalWithoutCleanup += intervals;
      }
    }
    // Allow a few for background tasks
    expect(intervalWithoutCleanup).toBeLessThanOrEqual(5);
  });
});
