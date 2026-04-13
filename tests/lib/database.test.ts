import { describe, it, expect } from 'vitest';

describe('Database singleton', () => {
  it('should export db and Prisma from database.ts', async () => {
    const mod = await import('../../src/lib/database');
    expect(mod.db).toBeDefined();
    expect(mod.Prisma).toBeDefined();
    expect(typeof mod.disconnectDatabase).toBe('function');
    expect(typeof mod.checkDatabaseConnection).toBe('function');
    expect(typeof mod.getDatabaseInfo).toBe('function');
  });

  it('should return the same instance on multiple imports (singleton)', async () => {
    const mod1 = await import('../../src/lib/database');
    const mod2 = await import('../../src/lib/database');
    expect(mod1.db).toBe(mod2.db);
  });

  it('prisma.ts re-export should be the same singleton', async () => {
    const { db } = await import('../../src/lib/database');
    const { prisma } = await import('../../src/lib/prisma');
    expect(prisma).toBe(db);
  });
});
