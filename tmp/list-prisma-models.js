import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const keys = Object.keys(prisma).filter((key) => !key.startsWith('_') && !key.startsWith('$'));
    console.log(keys);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
