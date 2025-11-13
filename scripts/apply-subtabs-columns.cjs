const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    console.log('Checking TreeBranchLeafNode columns...');
    const cols = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='TreeBranchLeafNode'`;
    const colNames = cols.map(r => r.column_name);
    const missing = [];
    if (!colNames.includes('subtabs')) missing.push("subtabs JSONB");
    if (!colNames.includes('subtab')) missing.push("subtab VARCHAR(255)");
    if (missing.length === 0) {
      console.log('No missing subtabs/subtab columns found. Nothing to do.');
      await prisma.$disconnect();
      return;
    }
    console.log('Missing columns:', missing);
    // Apply ALTER statements non-destructively
      const statements = [];
      if (!colNames.includes('subtabs')) statements.push('ALTER TABLE "TreeBranchLeafNode" ADD COLUMN IF NOT EXISTS "subtabs" JSONB;');
      if (!colNames.includes('subtab')) statements.push('ALTER TABLE "TreeBranchLeafNode" ADD COLUMN IF NOT EXISTS "subtab" VARCHAR(255);');
    for (const s of statements) {
      console.log('Executing:', s);
      await prisma.$executeRawUnsafe(s);
    }
    // Create index for subtab if not exists
    const idx = 'TreeBranchLeafNode_subtab_idx';
    if (!colNames.includes('subtab')) {
      console.log('Creating index on subtab');
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "${idx}" ON "TreeBranchLeafNode" ("subtab");`);
    }
    console.log('Done applying subtabs/subtab columns.');
  } catch (err) {
    console.error('Error applying subtabs columns:', err);
  } finally {
    await prisma.$disconnect();
  }
})();
