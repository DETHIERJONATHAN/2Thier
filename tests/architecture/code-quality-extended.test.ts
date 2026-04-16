/**
 * Tests de qualité du code — vérifie les bonnes pratiques à l'échelle du projet
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'src');

describe('Code Quality — No direct PrismaClient instantiation', () => {
  it('no file in src/ should instantiate new PrismaClient() except database.ts', () => {
    const result = execSync(
      `grep -rn "new PrismaClient()" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v database.ts | grep -v "// " | grep -v "\\* " || true`,
      { cwd: ROOT, encoding: 'utf-8' }
    ).trim();
    if (result) {
      const lines = result.split('\n').filter(l => l.trim().length > 0);
      expect(lines.length).toBe(0);
    }
  });
});

describe('Code Quality — No @ts-nocheck directives', () => {
  it('should have zero @ts-nocheck in src/', () => {
    const result = execSync(
      `grep -rl "@ts-nocheck" src/ --include="*.ts" --include="*.tsx" 2>/dev/null || true`,
      { cwd: ROOT, encoding: 'utf-8' }
    ).trim();
    const count = result ? result.split('\n').length : 0;
    expect(count).toBe(0);
  });
});

describe('Code Quality — Import conventions', () => {
  it('routes should import db from database layer, not prisma directly', () => {
    const routeFiles = fs.readdirSync(path.join(SRC, 'routes')).filter(f => f.endsWith('.ts'));
    const violations: string[] = [];
    for (const file of routeFiles) {
      const content = fs.readFileSync(path.join(SRC, 'routes', file), 'utf-8');
      if (content.includes("from '@prisma/client'") && content.includes('new PrismaClient')) {
        violations.push(file);
      }
    }
    expect(violations).toEqual([]);
  });
});

describe('Code Quality — No hardcoded secrets in source', () => {
  it('should not hardcode API keys in route files', () => {
    const result = execSync(
      `grep -rn "sk-[a-zA-Z0-9]\\{20,\\}" src/routes/ 2>/dev/null || true`,
      { cwd: ROOT, encoding: 'utf-8' }
    ).trim();
    expect(result).toBe('');
  });

  it('should not hardcode database URLs in source', async () => {
    const { grepSrc } = await import('../helpers/grepSrc');
    const hits = grepSrc(/postgresql:\/\/.*:.*@/i, { dir: SRC })
      .filter(h => !h.file.includes('database.ts') && !h.file.includes('.env'));
    expect(hits.map(h => `${h.file}:${h.line}  ${h.text}`)).toEqual([]);
  });
});

describe('Code Quality — Husky + lint-staged', () => {
  it('lint-staged config should exist', () => {
    expect(fs.existsSync(path.join(ROOT, '.lintstagedrc.json'))).toBe(true);
  });

  it('lint-staged should run eslint on TS files', () => {
    const content = fs.readFileSync(path.join(ROOT, '.lintstagedrc.json'), 'utf-8');
    expect(content).toContain('eslint');
    expect(content).toContain('ts');
  });

  it('husky pre-commit hook should exist', () => {
    const hookPath = path.join(ROOT, '.husky/pre-commit');
    expect(fs.existsSync(hookPath)).toBe(true);
    const content = fs.readFileSync(hookPath, 'utf-8');
    expect(content).toContain('lint-staged');
  });
});

describe('Code Quality — TypeScript strict mode', () => {
  it('tsconfig.base.json should enable strict', () => {
    const content = fs.readFileSync(path.join(ROOT, 'tsconfig.base.json'), 'utf-8');
    expect(content).toContain('"strict": true');
  });

  it('tsconfig.base.json should enable noUncheckedIndexedAccess or strictNullChecks', () => {
    const raw = fs.readFileSync(path.join(ROOT, 'tsconfig.base.json'), 'utf-8');
    // strict: true implies strictNullChecks, so it's enough
    expect(raw).toContain('"strict": true');
  });
});

describe('Code Quality — Package.json scripts', () => {
  it('should have build, dev and test scripts', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
    expect(pkg.scripts.build).toBeDefined();
    expect(pkg.scripts.dev).toBeDefined();
    expect(pkg.scripts.test).toBeDefined();
  });

  it('should have lint script', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
    const hasLint = pkg.scripts.lint || Object.values(pkg.scripts).some((s: unknown) => typeof s === 'string' && s.includes('eslint'));
    expect(hasLint).toBeTruthy();
  });
});

describe('Code Quality — Active Identity centralization', () => {
  it('ActiveIdentityContext should exist', () => {
    expect(fs.existsSync(path.join(SRC, 'contexts/ActiveIdentityContext.tsx'))).toBe(true);
  });

  it('ActiveIdentityContext should export useActiveIdentity hook', () => {
    const content = fs.readFileSync(path.join(SRC, 'contexts/ActiveIdentityContext.tsx'), 'utf-8');
    expect(content).toContain('useActiveIdentity');
    expect(content).toContain('export');
  });
});
