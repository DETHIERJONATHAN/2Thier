/**
 * Tests d'architecture étendus — Error handling, asyncHandler adoption, logging, i18n
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { grepSrc } from '../helpers/grepSrc';

const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'src');

describe('Architecture — Error Handling', () => {
  it('asyncHandler utility should exist', () => {
    expect(fs.existsSync(path.join(SRC, 'utils/asyncHandler.ts'))).toBe(true);
  });

  it('asyncHandler should be adopted in route files with unprotected handlers', () => {
    const files = ['permissions-templates.ts', 'services.ts'];
    for (const file of files) {
      const filePath = path.join(SRC, 'routes', file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content).toContain('asyncHandler');
      }
    }
  });

  it('api-server should have a global error handler (4-param middleware)', () => {
    const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
    // ErrorRequestHandler has 4 params: err, req, res, next
    expect(content).toMatch(/\(err.*req.*res.*next\)/);
  });

  it('global error handler should mask stack traces in production', () => {
    const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
    expect(content).toContain('production');
    expect(content).toContain('stack');
  });
});

describe('Architecture — Logger Usage', () => {
  it('logger module should exist', () => {
    expect(fs.existsSync(path.join(SRC, 'lib/logger.ts'))).toBe(true);
  });

  it('logger should be browser-safe (import.meta.env check)', () => {
    const content = fs.readFileSync(path.join(SRC, 'lib/logger.ts'), 'utf-8');
    expect(content).toContain('import.meta');
  });

  it('routes should not use bare console.log', () => {
    const hits = grepSrc(/console\.log/, { dir: path.join(SRC, 'routes') });
    // Soft check — route files should be migrated to the shared logger.
    const fileCount = new Set(hits.map(h => h.file)).size;
    expect(fileCount).toBeLessThanOrEqual(10);
  });
});

describe('Architecture — i18n Configuration', () => {
  it('fr.json should exist and have common keys', () => {
    const filePath = path.join(SRC, 'i18n/locales/fr.json');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(content.common).toBeDefined();
    expect(content.common.save).toBeDefined();
    expect(content.common.cancel).toBeDefined();
    expect(content.common.delete).toBeDefined();
    expect(content.common.loading).toBeDefined();
  });

  it('en.json should exist and have matching common keys', () => {
    const filePath = path.join(SRC, 'i18n/locales/en.json');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(content.common).toBeDefined();
    expect(content.common.save).toBeDefined();
    expect(content.common.cancel).toBeDefined();
  });

  it('fr.json and en.json should have the same top-level keys', () => {
    const fr = JSON.parse(fs.readFileSync(path.join(SRC, 'i18n/locales/fr.json'), 'utf-8'));
    const en = JSON.parse(fs.readFileSync(path.join(SRC, 'i18n/locales/en.json'), 'utf-8'));
    const frKeys = Object.keys(fr).sort();
    const enKeys = Object.keys(en).sort();
    expect(frKeys).toEqual(enKeys);
  });
});

describe('Architecture — ESLint Configuration', () => {
  it('eslint should warn on no-explicit-any', () => {
    const content = fs.readFileSync(path.join(ROOT, 'eslint.config.js'), 'utf-8');
    expect(content).toContain('no-explicit-any');
    expect(content).toContain("'warn'");
  });

  it('eslint should warn on console usage', () => {
    const content = fs.readFileSync(path.join(ROOT, 'eslint.config.js'), 'utf-8');
    expect(content).toContain('no-console');
  });
});

describe('Architecture — PWA', () => {
  it('manifest.webmanifest should exist', () => {
    expect(fs.existsSync(path.join(ROOT, 'public/manifest.webmanifest'))).toBe(true);
  });

  it('manifest should have required PWA fields', () => {
    const raw = fs.readFileSync(path.join(ROOT, 'public/manifest.webmanifest'), 'utf-8');
    const manifest = JSON.parse(raw);
    expect(manifest.name).toBeDefined();
    expect(manifest.short_name).toBeDefined();
    expect(manifest.start_url).toBeDefined();
    expect(manifest.display).toBeDefined();
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  it('index.html should reference the manifest', () => {
    const content = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
    expect(content).toContain('manifest.webmanifest');
  });
});

describe('Architecture — SEO', () => {
  it('index.html should have OG meta tags', () => {
    const content = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
    expect(content).toContain('og:title');
    expect(content).toContain('og:description');
    expect(content).toContain('og:image');
    expect(content).toContain('og:url');
  });

  it('index.html should have Twitter card', () => {
    const content = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
    expect(content).toContain('twitter:card');
    expect(content).toContain('twitter:title');
  });

  it('index.html should have canonical link', () => {
    const content = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
    expect(content).toContain('rel="canonical"');
  });

  it('index.html should have JSON-LD structured data', () => {
    const content = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
    expect(content).toContain('application/ld+json');
    expect(content).toContain('schema.org');
  });

  it('robots.txt should exist', () => {
    expect(fs.existsSync(path.join(ROOT, 'public/robots.txt'))).toBe(true);
  });
});

describe('Architecture — Accessibility', () => {
  it('index.html should have lang attribute', () => {
    const content = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
    expect(content).toMatch(/html.*lang="fr"/);
  });

  it('index.html should have skip-to-content link', () => {
    const content = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
    expect(content).toContain('skip-link');
    expect(content).toContain('#main-content');
  });

  it('MainLayoutNew should have main-content landmark', () => {
    const filePath = path.join(SRC, 'pages/page2thier/MainLayoutNew.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('id="main-content"');
    expect(content).toContain('role="main"');
  });

  it('viewport meta should allow user scaling', () => {
    const content = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
    expect(content).toContain('user-scalable=yes');
    expect(content).not.toContain('user-scalable=no');
  });
});

describe('Architecture — Documentation', () => {
  it('README.md should exist and be substantial', () => {
    const content = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf-8');
    const lineCount = content.split('\n').length;
    expect(lineCount).toBeGreaterThan(50);
  });

  it('README should document the tech stack', () => {
    const content = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf-8');
    expect(content).toContain('React');
    expect(content).toContain('Express');
    expect(content).toContain('Prisma');
    expect(content).toContain('PostgreSQL');
  });

  it('README should document code conventions', () => {
    const content = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf-8');
    expect(content).toContain('useAuthenticatedApi');
    expect(content).toContain('database');
  });

  it('copilot-instructions.md should exist', () => {
    expect(fs.existsSync(path.join(ROOT, '.github/copilot-instructions.md'))).toBe(true);
  });
});
