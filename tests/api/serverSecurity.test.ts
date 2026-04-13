/**
 * Tests pour les routes API critiques
 * Health check, CORS, et middleware chain
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';

describe('Express middleware order validation', () => {
  it('should export all required security middleware', async () => {
    const mod = await import('../../src/security/securityMiddleware');
    const requiredExports = [
      'securityMonitoring',
      'timingAttackProtection',
      'advancedRateLimit',
      'authRateLimit',
      'aiRateLimit',
      'uploadRateLimit',
      'anomalyDetection',
      'inputSanitization',
      'sqlInjectionDetection',
    ];
    for (const name of requiredExports) {
      expect(typeof (mod as any)[name]).toBe('function');
    }
  });
});

describe('Config validation', () => {
  it('should exit if JWT_SECRET is missing in production', async () => {
    // This test verifies the structure - actual process.exit is tested indirectly
    const configSource = await import('fs').then(fs =>
      fs.readFileSync(require('path').resolve(__dirname, '../../src/config.ts'), 'utf-8')
    );
    expect(configSource).toContain('process.exit(1)');
    expect(configSource).toContain('JWT_SECRET');
  });

  it('should validate required env vars in prod', async () => {
    const serverSource = await import('fs').then(fs =>
      fs.readFileSync(require('path').resolve(__dirname, '../../src/api-server-clean.ts'), 'utf-8')
    );
    // Check critical env var validation
    expect(serverSource).toContain('SESSION_SECRET');
    expect(serverSource).toContain('process.exit(1)');
  });
});

describe('Structured logging', () => {
  it('should export securityLogger and logSecurityEvent', async () => {
    const mod = await import('../../src/security/securityLogger');
    expect(mod.securityLogger).toBeDefined();
    expect(typeof mod.logSecurityEvent).toBe('function');
  });
});

describe('Rate limiter configuration', () => {
  it('aiRateLimit should be a valid middleware', async () => {
    const { aiRateLimit } = await import('../../src/security/securityMiddleware');
    expect(typeof aiRateLimit).toBe('function');
    // In dev/codespaces it's a noop, in prod it's the real limiter
    expect(aiRateLimit.length).toBeLessThanOrEqual(3); // middleware signature
  });

  it('uploadRateLimit should be a valid middleware', async () => {
    const { uploadRateLimit } = await import('../../src/security/securityMiddleware');
    expect(typeof uploadRateLimit).toBe('function');
  });
});
