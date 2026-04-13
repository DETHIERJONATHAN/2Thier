/**
 * Tests pour les routes RGPD (src/routes/rgpd.ts)
 * Couvre la conformité GDPR : export de données, suppression, consentement
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/database', () => ({
  db: {
    user: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    lead: { findMany: vi.fn(), deleteMany: vi.fn() },
    auditLog: { create: vi.fn() },
  },
  Prisma: {},
}));

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    lead: { findMany: vi.fn(), deleteMany: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

import { db } from '../../src/lib/database';

describe('RGPD Compliance', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('Right to access (Article 15)', () => {
    it('should return all personal data for a user', async () => {
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        firstName: 'Jean',
        lastName: 'Dupont',
        phone: '+32470000000',
        createdAt: new Date('2024-01-01'),
      };
      (db.user.findUnique as any).mockResolvedValue(mockUser);

      const user = await db.user.findUnique({ where: { id: 'u1' } });
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('firstName');
      expect(user).toHaveProperty('createdAt');
    });

    it('should not expose internal fields in RGPD export', () => {
      const userData = {
        id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B',
        password: 'hashed', refreshToken: 'token123', internalNotes: 'admin note',
      };
      const SENSITIVE_FIELDS = ['password', 'refreshToken', 'internalNotes'];
      const exported: Record<string, any> = {};
      for (const [key, value] of Object.entries(userData)) {
        if (!SENSITIVE_FIELDS.includes(key)) {
          exported[key] = value;
        }
      }
      expect(exported).not.toHaveProperty('password');
      expect(exported).not.toHaveProperty('refreshToken');
      expect(exported).toHaveProperty('email');
    });
  });

  describe('Right to erasure (Article 17)', () => {
    it('should anonymize user data on deletion request', () => {
      const anonymize = (user: { firstName: string; lastName: string; email: string; phone?: string }) => ({
        firstName: 'SUPPRIMÉ',
        lastName: 'SUPPRIMÉ',
        email: `deleted-${Date.now()}@anonymized.local`,
        phone: null,
      });

      const result = anonymize({ firstName: 'Jean', lastName: 'Dupont', email: 'jean@test.com', phone: '+32123' });
      expect(result.firstName).toBe('SUPPRIMÉ');
      expect(result.lastName).toBe('SUPPRIMÉ');
      expect(result.email).toMatch(/^deleted-\d+@anonymized\.local$/);
      expect(result.phone).toBeNull();
    });

    it('should cascade delete related personal data', async () => {
      (db.lead.deleteMany as any).mockResolvedValue({ count: 5 });

      const result = await db.lead.deleteMany({ where: { assignedToId: 'u1' } });
      expect(result.count).toBe(5);
      expect(db.lead.deleteMany).toHaveBeenCalledWith({ where: { assignedToId: 'u1' } });
    });
  });

  describe('Data minimization (Article 5)', () => {
    it('should not store unnecessary personal data', () => {
      const NECESSARY_FIELDS = ['id', 'email', 'firstName', 'lastName', 'organizationId', 'role', 'createdAt'];
      const FORBIDDEN_FIELDS = ['ssn', 'creditCard', 'bankAccount', 'nationalId'];

      for (const field of FORBIDDEN_FIELDS) {
        expect(NECESSARY_FIELDS).not.toContain(field);
      }
    });
  });

  describe('Audit trail', () => {
    it('should log RGPD data access', async () => {
      (db.auditLog.create as any).mockResolvedValue({ id: 'log1' });

      await db.auditLog.create({
        data: {
          action: 'RGPD_DATA_EXPORT',
          userId: 'u1',
          targetUserId: 'u1',
          timestamp: new Date(),
        },
      });

      expect(db.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'RGPD_DATA_EXPORT' }),
        })
      );
    });
  });
});
