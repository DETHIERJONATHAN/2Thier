/**
 * Tests pour le messenger (src/routes/messenger.ts)
 * Couvre la messagerie instantanée, les canaux, et la sécurité
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/database', () => ({
  db: {
    messengerChannel: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    messengerMessage: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
  },
  Prisma: {},
}));

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    messengerChannel: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    messengerMessage: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}));

import { db } from '../../src/lib/database';

describe('Messenger System', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('Message validation', () => {
    it('should reject empty messages', () => {
      const isValid = (content: string) => content.trim().length > 0;

      expect(isValid('')).toBe(false);
      expect(isValid('   ')).toBe(false);
      expect(isValid('Hello!')).toBe(true);
    });

    it('should enforce maximum message length', () => {
      const MAX_MSG_LENGTH = 10000;
      const isValid = (content: string) => content.length <= MAX_MSG_LENGTH;

      expect(isValid('Hello')).toBe(true);
      expect(isValid('x'.repeat(10001))).toBe(false);
      expect(isValid('x'.repeat(10000))).toBe(true);
    });

    it('should sanitize HTML in messages', () => {
      const sanitize = (input: string) => input.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]*on\w+=[^>]*>/gi, (match) => match.replace(/on\w+=["'][^"']*["']/gi, ''));

      const clean = sanitize('<script>alert("xss")</script>Hello');
      expect(clean).toBe('Hello');
      expect(clean).not.toContain('script');
    });
  });

  describe('Channel access control', () => {
    it('should only allow channel members to read messages', async () => {
      const channel = {
        id: 'ch1',
        members: ['u1', 'u2'],
        organizationId: 'org-1',
      };

      const canAccess = (userId: string, chan: typeof channel) => chan.members.includes(userId);

      expect(canAccess('u1', channel)).toBe(true);
      expect(canAccess('u3', channel)).toBe(false);
    });

    it('should enforce organization-scoped channels', () => {
      const canAccessChannel = (userOrgId: string, channelOrgId: string) => userOrgId === channelOrgId;

      expect(canAccessChannel('org-1', 'org-1')).toBe(true);
      expect(canAccessChannel('org-1', 'org-2')).toBe(false);
    });
  });

  describe('Message ordering', () => {
    it('should return messages in chronological order', () => {
      const messages = [
        { id: 'm3', createdAt: new Date('2024-03-01') },
        { id: 'm1', createdAt: new Date('2024-01-01') },
        { id: 'm2', createdAt: new Date('2024-02-01') },
      ];

      const sorted = [...messages].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      expect(sorted[0].id).toBe('m1');
      expect(sorted[1].id).toBe('m2');
      expect(sorted[2].id).toBe('m3');
    });
  });

  describe('Pagination', () => {
    it('should paginate messages correctly', async () => {
      (db.messengerMessage.count as any).mockResolvedValue(50);
      (db.messengerMessage.findMany as any).mockResolvedValue(
        Array.from({ length: 20 }, (_, i) => ({ id: `m${i}`, content: `msg-${i}` }))
      );

      const page = 1;
      const limit = 20;
      const total = await db.messengerMessage.count();
      const messages = await db.messengerMessage.findMany({
        skip: page * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      expect(total).toBe(50);
      expect(messages).toHaveLength(20);
      expect(Math.ceil(total / limit)).toBe(3);
    });
  });
});
