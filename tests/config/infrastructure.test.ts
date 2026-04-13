/**
 * Tests de non-régression pour le Vitest config
 * Vérifie que la configuration de test est correcte
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Vitest configuration', () => {
  const configPath = path.resolve(__dirname, '../../vitest.config.ts');

  it('should have coverage thresholds configured', () => {
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('thresholds');
    expect(content).toContain('lines');
    expect(content).toContain('functions');
    expect(content).toContain('branches');
  });

  it('should include tsx test files', () => {
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('.test.tsx');
  });

  it('should configure jsdom for React tests', () => {
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('jsdom');
  });

  it('should have v8 coverage provider', () => {
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain("provider: 'v8'");
  });

  it('should have @ alias configured', () => {
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain("'@'");
    expect(content).toContain('path.resolve');
  });
});

describe('Cloud Build configuration', () => {
  const buildPath = path.resolve(__dirname, '../../cloudbuild.yaml');

  it('should exist', () => {
    expect(fs.existsSync(buildPath)).toBe(true);
  });

  it('should run npm audit', () => {
    const content = fs.readFileSync(buildPath, 'utf-8');
    expect(content).toContain('npm audit');
  });

  it('should run tsc type-check', () => {
    const content = fs.readFileSync(buildPath, 'utf-8');
    expect(content).toContain('tsc --noEmit');
  });

  it('should run tests', () => {
    const content = fs.readFileSync(buildPath, 'utf-8');
    expect(content).toContain('npm run test');
  });

  it('should use prisma generate before tests', () => {
    const content = fs.readFileSync(buildPath, 'utf-8');
    const prismaIdx = content.indexOf('prisma generate');
    const testIdx = content.indexOf('npm run test');
    expect(prismaIdx).toBeLessThan(testIdx);
  });
});
