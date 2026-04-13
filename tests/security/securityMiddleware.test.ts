import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

// Mock securityLogger before importing the module
vi.mock('../../src/security/securityLogger', () => ({
  logSecurityEvent: vi.fn(),
  securityMetrics: {
    requestCount: 0,
    blockedRequests: 0,
    suspiciousActivity: 0,
  },
}));

describe('Security Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      ip: '127.0.0.1',
      method: 'GET',
      url: '/api/test',
      path: '/api/test',
      headers: { 'user-agent': 'test-agent' },
      body: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      on: vi.fn(),
    };
    mockNext = vi.fn();
  });

  describe('securityMonitoring', () => {
    it('should call next() for normal requests', async () => {
      const { securityMonitoring } = await import('../../src/security/securityMiddleware');
      securityMonitoring(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should detect XSS patterns in URL', async () => {
      const { securityMonitoring } = await import('../../src/security/securityMiddleware');
      const { logSecurityEvent } = await import('../../src/security/securityLogger');
      mockReq.url = '/api/test?q=<script>alert(1)</script>';
      securityMonitoring(mockReq as Request, mockRes as Response, mockNext);
      expect(logSecurityEvent).toHaveBeenCalledWith(
        'SUSPICIOUS_REQUEST',
        expect.objectContaining({ patterns: 'detected' }),
        'warn',
      );
      // Should still call next (monitoring, not blocking)
      expect(mockNext).toHaveBeenCalled();
    });

    it('should detect SQL injection patterns in body', async () => {
      const { securityMonitoring } = await import('../../src/security/securityMiddleware');
      const { logSecurityEvent } = await import('../../src/security/securityLogger');
      mockReq.body = { search: "admin' UNION SELECT * FROM users--" };
      securityMonitoring(mockReq as Request, mockRes as Response, mockNext);
      expect(logSecurityEvent).toHaveBeenCalledWith(
        'SUSPICIOUS_REQUEST',
        expect.objectContaining({ patterns: 'detected' }),
        'warn',
      );
    });

    it('should detect path traversal in URL', async () => {
      const { securityMonitoring } = await import('../../src/security/securityMiddleware');
      const { logSecurityEvent } = await import('../../src/security/securityLogger');
      mockReq.url = '/api/files/../../../etc/passwd';
      securityMonitoring(mockReq as Request, mockRes as Response, mockNext);
      expect(logSecurityEvent).toHaveBeenCalledWith(
        'SUSPICIOUS_REQUEST',
        expect.objectContaining({ patterns: 'detected' }),
        'warn',
      );
    });

    it('should assign a requestId to the request', async () => {
      const { securityMonitoring } = await import('../../src/security/securityMiddleware');
      securityMonitoring(mockReq as Request, mockRes as Response, mockNext);
      expect((mockReq as any).requestId).toBeDefined();
      expect(typeof (mockReq as any).requestId).toBe('string');
    });
  });

  describe('anomalyDetection', () => {
    it('should let normal requests through in dev', async () => {
      const { anomalyDetection } = await import('../../src/security/securityMiddleware');
      anomalyDetection(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('inputSanitization', () => {
    it('should call next for clean input', async () => {
      const { inputSanitization } = await import('../../src/security/securityMiddleware');
      mockReq.body = { name: 'John', email: 'john@test.com' };
      inputSanitization(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Rate limiters export check', () => {
    it('should export all rate limiters as functions', async () => {
      const mod = await import('../../src/security/securityMiddleware');
      expect(typeof mod.authRateLimit).toBe('function');
      expect(typeof mod.advancedRateLimit).toBe('function');
      expect(typeof mod.aiRateLimit).toBe('function');
      expect(typeof mod.uploadRateLimit).toBe('function');
      expect(typeof mod.securityMonitoring).toBe('function');
      expect(typeof mod.anomalyDetection).toBe('function');
      expect(typeof mod.inputSanitization).toBe('function');
    });
  });
});
