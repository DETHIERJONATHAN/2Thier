import { describe, it, expect, vi } from 'vitest';

describe('Config', () => {
  it('should export JWT_SECRET as a string', async () => {
    // In test env, JWT_SECRET should fallback to dev-secret or be set
    const { JWT_SECRET } = await import('../../src/config');
    expect(typeof JWT_SECRET).toBe('string');
    expect(JWT_SECRET.length).toBeGreaterThan(0);
  });
});
