/*
  Safe enum patch: add 'neutral' to OperationSource enum without reset/migrate.
  Reads DATABASE_URL from .env via PrismaClient.
*/
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const check = await prisma.$queryRawUnsafe(
      "SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='OperationSource' AND e.enumlabel='neutral' LIMIT 1"
    );
    if (Array.isArray(check) && check.length > 0) {
      console.log('[DB] OperationSource already has value neutral. Nothing to do.');
      return;
    }
    console.log('[DB] Adding value neutral to enum OperationSource...');
  await prisma.$executeRawUnsafe("ALTER TYPE \"OperationSource\" ADD VALUE IF NOT EXISTS 'neutral'");
    console.log('[DB] ✅ Added neutral to OperationSource.');
  } catch (err) {
    console.error('[DB] ❌ Failed to add neutral to OperationSource:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
