require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const migrationName = process.argv[2];
const hash = process.argv[3];

if (!migrationName || !hash) {
  console.error('Usage: node scripts/sync-migration-checksum.cjs <migrationName> <checksum>');
  process.exit(1);
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(
      'DELETE FROM "_prisma_migrations" WHERE migration_name = $1 AND finished_at IS NULL',
      migrationName
    );
    const result = await prisma.$executeRawUnsafe(
      'UPDATE "_prisma_migrations" SET checksum = $1, applied_steps_count = 1 WHERE migration_name = $2',
      hash,
      migrationName
    );
    console.log('[migration-sync] Updated rows:', result.count ?? result);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[migration-sync] Error:', error.message || error);
  process.exit(1);
});
