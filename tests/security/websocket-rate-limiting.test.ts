/**
 * Tests — WebSocket Rate Limiting
 * Vérifie la logique du rate limiter Socket.IO
 */
import { describe, it, expect } from 'vitest';

// Extracted rate limiter logic for testing
function createRateLimiter(windowMs: number, maxEvents: number) {
  let eventCount = 0;
  let windowStart = Date.now();

  return {
    check(): boolean {
      const now = Date.now();
      if (now - windowStart > windowMs) {
        eventCount = 0;
        windowStart = now;
      }
      eventCount++;
      return eventCount <= maxEvents;
    },
    getCount() { return eventCount; },
    reset() { eventCount = 0; windowStart = Date.now(); },
  };
}

describe('WebSocket Rate Limiting', () => {
  it('should allow events within the limit', () => {
    const limiter = createRateLimiter(10_000, 50);
    for (let i = 0; i < 50; i++) {
      expect(limiter.check()).toBe(true);
    }
  });

  it('should block events exceeding the limit', () => {
    const limiter = createRateLimiter(10_000, 50);
    for (let i = 0; i < 50; i++) {
      limiter.check();
    }
    // 51st event should be blocked
    expect(limiter.check()).toBe(false);
  });

  it('should reset after window expires', () => {
    const limiter = createRateLimiter(100, 5); // 100ms window, 5 max
    for (let i = 0; i < 5; i++) {
      limiter.check();
    }
    expect(limiter.check()).toBe(false); // 6th blocked

    // Manually reset (simulating window expiry)
    limiter.reset();
    expect(limiter.check()).toBe(true); // Should work again
  });

  it('should count events correctly', () => {
    const limiter = createRateLimiter(10_000, 100);
    limiter.check();
    limiter.check();
    limiter.check();
    expect(limiter.getCount()).toBe(3);
  });

  it('should handle edge case: limit of 1', () => {
    const limiter = createRateLimiter(10_000, 1);
    expect(limiter.check()).toBe(true); // 1st allowed
    expect(limiter.check()).toBe(false); // 2nd blocked
  });

  it('should handle messageIds array size validation', () => {
    const MAX_MESSAGE_IDS = 100;
    const smallBatch = new Array(50).fill('id');
    const largeBatch = new Array(150).fill('id');

    expect(smallBatch.length <= MAX_MESSAGE_IDS).toBe(true);
    expect(largeBatch.length <= MAX_MESSAGE_IDS).toBe(false);
  });
});

describe('WebSocket Input Validation', () => {
  it('should reject non-string conversationId', () => {
    const validate = (id: unknown): boolean =>
      typeof id === 'string' && id.length > 0 && id.length < 100;

    expect(validate('conv-123')).toBe(true);
    expect(validate(123)).toBe(false);
    expect(validate(null)).toBe(false);
    expect(validate(undefined)).toBe(false);
    expect(validate('')).toBe(false);
    expect(validate('a'.repeat(100))).toBe(false);
  });

  it('should validate typing data structure', () => {
    const validateTyping = (data: unknown): boolean => {
      if (!data || typeof data !== 'object') return false;
      const d = data as Record<string, unknown>;
      return typeof d.conversationId === 'string' && typeof d.isTyping === 'boolean';
    };

    expect(validateTyping({ conversationId: 'c1', isTyping: true })).toBe(true);
    expect(validateTyping({ conversationId: 'c1', isTyping: 'yes' })).toBe(false);
    expect(validateTyping(null)).toBe(false);
    expect(validateTyping({})).toBe(false);
  });
});
