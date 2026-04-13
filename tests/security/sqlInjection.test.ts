/**
 * Tests pour la protection CSRF Origin + SQL Injection Detection
 * dans le serveur API Express
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

vi.mock('../../src/security/securityLogger', () => ({
  logSecurityEvent: vi.fn(),
  securityMetrics: { requestCount: 0, blockedRequests: 0, suspiciousActivity: 0 },
}));

describe('SQL Injection Detection', () => {
  let sqlInjectionDetection: (req: Request, res: Response, next: NextFunction) => void;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../src/security/securityMiddleware');
    sqlInjectionDetection = mod.sqlInjectionDetection;
    mockReq = {
      ip: '1.2.3.4',
      method: 'POST',
      url: '/api/test',
      headers: { 'user-agent': 'test' },
      query: {},
      body: {},
      params: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  it('should allow clean requests through', () => {
    mockReq.body = { name: 'Jean Dupont', email: 'jean@test.com' };
    sqlInjectionDetection(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should block UNION SELECT injection in body', () => {
    mockReq.body = { search: "' UNION SELECT * FROM users--" };
    sqlInjectionDetection(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('should block SQL comment injection in query', () => {
    mockReq.query = { id: "1 OR 1=1--" } as any;
    sqlInjectionDetection(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('should block exec xp_ injection', () => {
    mockReq.body = { cmd: 'exec xp_cmdshell' };
    sqlInjectionDetection(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle nested object injection', () => {
    mockReq.body = { nested: { deep: "admin'--" } };
    sqlInjectionDetection(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should detect injection in URL', () => {
    mockReq.url = "/api/users?id=1'%20OR%20'1'='1";
    sqlInjectionDetection(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });
});

describe('Input Sanitization', () => {
  let inputSanitization: (req: Request, res: Response, next: NextFunction) => void;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../src/security/securityMiddleware');
    inputSanitization = mod.inputSanitization;
    mockReq = {
      ip: '1.2.3.4',
      method: 'POST',
      url: '/api/test',
      headers: { 'user-agent': 'test' },
      query: {},
      body: {},
      params: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  it('should pass clean data without modification', () => {
    mockReq.body = { name: 'Jean', email: 'j@test.com' };
    inputSanitization(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(mockReq.body.name).toBe('Jean');
  });

  it('should strip script tags from body strings', () => {
    mockReq.body = { content: 'Hello <script>alert(1)</script> World' };
    inputSanitization(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(mockReq.body.content).not.toContain('<script>');
  });
});
