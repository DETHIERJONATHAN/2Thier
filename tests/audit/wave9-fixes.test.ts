/**
 * Wave 9 — Tests de sécurité et qualité ciblés
 * Valide les corrections apportées dans la Wave 9
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const SRC = path.resolve(__dirname, '../../src');
const ROOT = path.resolve(__dirname, '../..');

describe('Wave 9 — SQL Injection Prevention', () => {
  it('should have no unprotected $queryRawUnsafe (all must have SECURITY comment)', () => {
    const result = execSync(
      `grep -rn '\\$queryRawUnsafe' src/routes/ src/api/ src/components/ 2>/dev/null || true`,
      { cwd: ROOT, encoding: 'utf-8' }
    );
    const lines = result.trim().split('\n').filter(Boolean);
    for (const line of lines) {
      // Each file with $queryRawUnsafe must have a SECURITY comment nearby
      const filePath = line.split(':')[0];
      const content = fs.readFileSync(path.join(ROOT, filePath), 'utf-8');
      expect(content).toContain('SECURITY');
    }
  });

  it('ai-internal.ts should use $queryRaw (not $queryRawUnsafe)', () => {
    const content = fs.readFileSync(path.join(SRC, 'routes/ai-internal.ts'), 'utf-8');
    expect(content).not.toContain('$queryRawUnsafe');
  });

  it('telnyx.ts should use $queryRaw (not $queryRawUnsafe)', () => {
    const content = fs.readFileSync(path.join(SRC, 'api/telnyx.ts'), 'utf-8');
    expect(content).not.toContain('$queryRawUnsafe');
  });

  it('treebranchleaf-routes.ts should use $queryRaw (not $queryRawUnsafe)', () => {
    const content = fs.readFileSync(
      path.join(SRC, 'components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes.ts'),
      'utf-8'
    );
    expect(content).not.toContain('$queryRawUnsafe');
  });
});

describe('Wave 9 — Route Authentication', () => {
  const protectedRouteFiles = [
    'routes/debug.ts',
    'routes/batch-routes.ts',
    'routes/documents.ts',
    'routes/modules.ts',
    'routes/tbl-batch-routes.ts',
    'routes/product-documents.ts',
    'routes/form-sections.ts',
    'routes/users.ts',
    'routes/organizations-simple.ts',
    'routes/tbl-select-config-route.ts',
    'routes/validations.ts',
    'routes/sync-temp.ts',
    'routes/new-integrations.ts',
  ];

  for (const routeFile of protectedRouteFiles) {
    it(`${routeFile} should require authentication`, () => {
      const content = fs.readFileSync(path.join(SRC, routeFile), 'utf-8');
      expect(content).toContain('authenticateToken');
    });
  }

  it('debug.ts should be SuperAdmin-only', () => {
    const content = fs.readFileSync(path.join(SRC, 'routes/debug.ts'), 'utf-8');
    expect(content).toMatch(/superAdmin|isSuperAdmin|SUPER_ADMIN|SuperAdmin/i);
  });
});

describe('Wave 9 — Database Singleton', () => {
  it('seed-2thier.ts should import from database module (not new PrismaClient)', () => {
    const content = fs.readFileSync(path.join(SRC, 'site/seed-2thier.ts'), 'utf-8');
    expect(content).not.toMatch(/new\s+PrismaClient/);
    expect(content).toContain('database');
  });

  it('database.ts should have findMany auto-limit via $extends', () => {
    const content = fs.readFileSync(path.join(SRC, 'lib/database.ts'), 'utf-8');
    expect(content).toContain('$extends');
    expect(content).toContain('findMany');
    expect(content).toContain('MAX_DEFAULT_TAKE');
  });

  it('database.ts should NOT use deprecated $use middleware', () => {
    const content = fs.readFileSync(path.join(SRC, 'lib/database.ts'), 'utf-8');
    expect(content).not.toContain('$use(');
  });
});

describe('Wave 9 — CSP Configuration', () => {
  it('scriptSrc should NOT contain unsafe-inline', () => {
    const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
    // Find the scriptSrc line
    const scriptSrcMatch = content.match(/scriptSrc:\s*\[([^\]]+)\]/);
    expect(scriptSrcMatch).toBeTruthy();
    expect(scriptSrcMatch![1]).not.toContain("'unsafe-inline'");
  });

  it('styleSrc should contain unsafe-inline (required for Ant Design)', () => {
    const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
    const styleSrcMatch = content.match(/styleSrc:\s*\[([^\]]+)\]/);
    expect(styleSrcMatch).toBeTruthy();
    expect(styleSrcMatch![1]).toContain("'unsafe-inline'");
  });
});

describe('Wave 9 — Console Suppression', () => {
  it('api-server should suppress console.log in production', () => {
    const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
    expect(content).toContain("process.env.NODE_ENV === 'production'");
    expect(content).toContain('console.log');
    expect(content).toContain('noop');
  });

  it('vite.config should drop console in production build', () => {
    const viteConfig = fs.readFileSync(path.join(ROOT, 'vite.config.ts'), 'utf-8');
    expect(viteConfig).toContain('drop_console');
  });
});

describe('Wave 9 — Frontend Quality', () => {
  it('should not have NotFoundPage as inline div', () => {
    const content = fs.readFileSync(path.join(SRC, 'AppLayout.tsx'), 'utf-8');
    expect(content).not.toContain("element={<div>Page non trouvée</div>}");
    expect(content).toContain('NotFoundPage');
  });

  it('NotFoundPage should use i18n', () => {
    const content = fs.readFileSync(path.join(SRC, 'pages/NotFoundPage.tsx'), 'utf-8');
    expect(content).toContain('useTranslation');
    expect(content).toContain("t('notFound.");
  });

  const criticalComponents = [
    'components/zhiive/StoriesBar.tsx',
    'components/zhiive/ReelsPanel.tsx',
    'components/zhiive/WaxPanel.tsx',
    'components/messenger/FilePreview.tsx',
  ];

  for (const comp of criticalComponents) {
    it(`${comp} should use images with loading="lazy"`, () => {
      const content = fs.readFileSync(path.join(SRC, comp), 'utf-8');
      const imgTags = content.match(/<img\b[^>]*>/g) || [];
      for (const tag of imgTags) {
        // Skip template literal img tags (in strings for HTML generation)
        if (tag.includes('${')) continue;
        expect(tag).toContain('loading="lazy"');
      }
    });
  }
});

describe('Wave 9 — i18n 404 Keys', () => {
  it('fr.json should have notFound keys', () => {
    const content = JSON.parse(fs.readFileSync(path.join(SRC, 'i18n/locales/fr.json'), 'utf-8'));
    expect(content.notFound).toBeDefined();
    expect(content.notFound.title).toBeTruthy();
    expect(content.notFound.subtitle).toBeTruthy();
    expect(content.notFound.backHome).toBeTruthy();
  });

  it('en.json should have notFound keys', () => {
    const content = JSON.parse(fs.readFileSync(path.join(SRC, 'i18n/locales/en.json'), 'utf-8'));
    expect(content.notFound).toBeDefined();
    expect(content.notFound.title).toBeTruthy();
    expect(content.notFound.subtitle).toBeTruthy();
    expect(content.notFound.backHome).toBeTruthy();
  });
});
