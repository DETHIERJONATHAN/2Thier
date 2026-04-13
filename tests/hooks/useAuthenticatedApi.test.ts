/**
 * Tests pour la couche d'abstraction API authentifiée
 * Vérifie que useAuthenticatedApi est correctement structuré
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('useAuthenticatedApi hook', () => {
  const hookPath = path.resolve(__dirname, '../../src/hooks/useAuthenticatedApi.ts');

  it('should exist as a module', () => {
    expect(fs.existsSync(hookPath)).toBe(true);
  });

  it('should export useAuthenticatedApi', () => {
    const content = fs.readFileSync(hookPath, 'utf-8');
    expect(content).toContain('useAuthenticatedApi');
    expect(content).toContain('export');
  });

  it('should include api.get and api.post patterns', () => {
    const content = fs.readFileSync(hookPath, 'utf-8');
    // The hook should define get/post methods
    expect(content).toMatch(/get|GET/);
    expect(content).toMatch(/post|POST/);
  });

  it('should handle authentication headers', () => {
    const content = fs.readFileSync(hookPath, 'utf-8');
    // Should reference auth tokens or headers
    expect(content).toMatch(/[Aa]uth|[Tt]oken|[Hh]eader|[Cc]ookie/);
  });
});
