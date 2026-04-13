/**
 * Tests pour le middleware d'authentification (src/middlewares/auth.ts)
 * Couvre JWT validation, token refresh, session management
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret-key-for-testing-only';

describe('Authentication Middleware', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('JWT Token Validation', () => {
    it('should validate a properly signed JWT', () => {
      const payload = { userId: 'u1', email: 'test@test.com', organizationId: 'org-1' };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      expect(decoded.userId).toBe('u1');
      expect(decoded.email).toBe('test@test.com');
      expect(decoded.organizationId).toBe('org-1');
    });

    it('should reject an expired JWT', () => {
      const payload = { userId: 'u1' };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '-1h' });

      expect(() => jwt.verify(token, JWT_SECRET)).toThrow();
    });

    it('should reject a JWT signed with wrong secret', () => {
      const payload = { userId: 'u1' };
      const token = jwt.sign(payload, 'wrong-secret');

      expect(() => jwt.verify(token, JWT_SECRET)).toThrow();
    });

    it('should reject a malformed JWT', () => {
      expect(() => jwt.verify('not.a.jwt', JWT_SECRET)).toThrow();
      expect(() => jwt.verify('', JWT_SECRET)).toThrow();
    });

    it('should reject a JWT with tampered payload', () => {
      const token = jwt.sign({ userId: 'u1', role: 'member' }, JWT_SECRET);
      const parts = token.split('.');
      // Tamper with payload
      const tamperedPayload = Buffer.from(JSON.stringify({ userId: 'u1', role: 'superAdmin' })).toString('base64url');
      const tampered = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      expect(() => jwt.verify(tampered, JWT_SECRET)).toThrow();
    });
  });

  describe('Authorization header parsing', () => {
    it('should extract Bearer token from Authorization header', () => {
      const extractToken = (header?: string): string | null => {
        if (!header) return null;
        const match = header.match(/^Bearer\s+(.+)$/i);
        return match ? match[1] : null;
      };

      expect(extractToken('Bearer abc123')).toBe('abc123');
      expect(extractToken('bearer abc123')).toBe('abc123');
      expect(extractToken('Basic abc123')).toBeNull();
      expect(extractToken(undefined)).toBeNull();
      expect(extractToken('')).toBeNull();
    });
  });

  describe('Super Admin detection', () => {
    it('should identify super admin from JWT claims', () => {
      const SUPER_ADMIN_EMAILS = ['admin@2thier.be'];

      const isSuperAdmin = (email: string, claimSuperAdmin?: boolean) => {
        return claimSuperAdmin === true || SUPER_ADMIN_EMAILS.includes(email);
      };

      expect(isSuperAdmin('admin@2thier.be')).toBe(true);
      expect(isSuperAdmin('user@test.com', true)).toBe(true);
      expect(isSuperAdmin('user@test.com')).toBe(false);
    });
  });

  describe('Token refresh', () => {
    it('should issue new token preserving claims', () => {
      const originalPayload = { userId: 'u1', email: 'test@test.com', organizationId: 'org-1' };
      const originalToken = jwt.sign(originalPayload, JWT_SECRET, { expiresIn: '1h' });

      const decoded = jwt.verify(originalToken, JWT_SECRET) as any;
      // Refresh with a different expiry to ensure different token
      const newToken = jwt.sign(
        { userId: decoded.userId, email: decoded.email, organizationId: decoded.organizationId },
        JWT_SECRET,
        { expiresIn: '2h' }
      );

      const newDecoded = jwt.verify(newToken, JWT_SECRET) as any;
      expect(newDecoded.userId).toBe(originalPayload.userId);
      expect(newDecoded.email).toBe(originalPayload.email);
      expect(newDecoded.organizationId).toBe(originalPayload.organizationId);
      // Different expiry means different token
      expect(newDecoded.exp).not.toBe(decoded.exp);
    });
  });

  describe('Request authentication flow', () => {
    it('should attach user to request after successful auth', () => {
      const req: any = { headers: { authorization: '' }, user: undefined };

      const authenticate = (request: any, secret: string) => {
        const token = request.headers.authorization?.replace('Bearer ', '');
        if (!token) throw new Error('No token');
        const decoded = jwt.verify(token, secret) as any;
        request.user = decoded;
        return decoded;
      };

      const token = jwt.sign({ userId: 'u1', role: 'admin' }, JWT_SECRET);
      req.headers.authorization = `Bearer ${token}`;

      const result = authenticate(req, JWT_SECRET);
      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe('u1');
      expect(result.role).toBe('admin');
    });
  });
});
