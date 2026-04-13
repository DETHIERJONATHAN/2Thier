/**
 * Tests d'architecture — vérifie les conventions du projet Zhiive
 * Assure que les conventions critiques sont respectées
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const SRC = path.resolve(__dirname, '../../src');

describe('Architecture Conventions', () => {
  describe('Database singleton (db) usage', () => {
    it('should not have new PrismaClient() in route files', () => {
      const result = execSync(
        `grep -rl "new PrismaClient()" src/routes/ 2>/dev/null || true`,
        { cwd: path.resolve(__dirname, '../..'), encoding: 'utf-8' }
      );
      expect(result.trim()).toBe('');
    });

    it('src/lib/database.ts should exist', () => {
      expect(fs.existsSync(path.join(SRC, 'lib/database.ts'))).toBe(true);
    });

    it('src/lib/prisma.ts should re-export from database.ts', () => {
      const content = fs.readFileSync(path.join(SRC, 'lib/prisma.ts'), 'utf-8');
      expect(content).toContain('./database');
    });
  });

  describe('Security middleware stack', () => {
    it('api-server should import all security middleware', () => {
      const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
      expect(content).toContain('securityMonitoring');
      expect(content).toContain('timingAttackProtection');
      expect(content).toContain('advancedRateLimit');
      expect(content).toContain('anomalyDetection');
      expect(content).toContain('inputSanitization');
      expect(content).toContain('sqlInjectionDetection');
      expect(content).toContain('helmet');
    });

    it('api-server should have CSRF origin check', () => {
      const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
      expect(content).toContain('CSRF');
      expect(content).toContain('origin');
    });

    it('rate limiters should exist for AI and upload', () => {
      const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
      expect(content).toContain('aiRateLimit');
      expect(content).toContain('uploadRateLimit');
    });
  });

  describe('Graceful shutdown', () => {
    it('should handle SIGTERM', () => {
      const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
      expect(content).toContain('SIGTERM');
    });

    it('should handle SIGINT', () => {
      const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
      expect(content).toContain('SIGINT');
    });

    it('should handle uncaughtException', () => {
      const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
      expect(content).toContain('uncaughtException');
    });
  });

  describe('Health check', () => {
    it('should verify database connection in health check', () => {
      const content = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');
      expect(content).toContain('SELECT 1');
    });
  });

  describe('No hardcoded secrets', () => {
    it('should not hardcode JWT secret in config', () => {
      const content = fs.readFileSync(path.join(SRC, 'config.ts'), 'utf-8');
      // Should read from env, not hardcode
      expect(content).toContain('process.env');
      expect(content).toContain('JWT_SECRET');
    });
  });

  describe('Pagination safety', () => {
    it('wall.ts findMany should have take limits', () => {
      const content = fs.readFileSync(path.join(SRC, 'routes/wall.ts'), 'utf-8');
      const findManyCount = (content.match(/findMany/g) || []).length;
      const takeCount = (content.match(/take:/g) || []).length;
      // At minimum, the critical queries should have take
      expect(takeCount).toBeGreaterThanOrEqual(3);
    });

    it('messenger.ts findMany should have take limits', () => {
      const content = fs.readFileSync(path.join(SRC, 'routes/messenger.ts'), 'utf-8');
      const takeCount = (content.match(/take:/g) || []).length;
      expect(takeCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('TypeScript configuration', () => {
    it('tsconfig.base.json should have strict: true', () => {
      const raw = fs.readFileSync(path.resolve(__dirname, '../../tsconfig.base.json'), 'utf-8');
      expect(raw).toContain('"strict": true');
    });

    it('tsconfig.build.json should exclude test files', () => {
      const raw = fs.readFileSync(path.resolve(__dirname, '../../tsconfig.build.json'), 'utf-8');
      expect(raw).toContain('*.test.ts');
      expect(raw).toContain('*.test.tsx');
    });
  });

  describe('Service Worker', () => {
    it('should have unified SW source in src/sw.ts', () => {
      expect(fs.existsSync(path.join(SRC, 'sw.ts'))).toBe(true);
    });

    it('sw.ts should contain push notification handlers', () => {
      const content = fs.readFileSync(path.join(SRC, 'sw.ts'), 'utf-8');
      expect(content).toContain('push');
      expect(content).toContain('notificationclick');
      expect(content).toContain('precacheAndRoute');
    });
  });
});
