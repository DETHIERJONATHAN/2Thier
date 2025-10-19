require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const oldName = process.argv[2];
const newName = process.argv[3];

if (!oldName || !newName) {
  console.error('Usage: node scripts/rename-migration.cjs <old-name> <new-name>');
  process.exit(1);
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await prisma.$executeRawUnsafe(
      'UPDATE "_prisma_migrations" SET migration_name = $1 WHERE migration_name = $2',
      newName,
      oldName
    );
    console.log('[rename-migration] Updated rows:', result.count ?? result);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[rename-migration] Error:', error.message || error);
  process.exit(1);
});
