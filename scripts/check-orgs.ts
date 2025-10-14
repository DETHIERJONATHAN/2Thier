import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true
    }
  });
  console.log(JSON.stringify(orgs, null, 2));
}

main().finally(() => prisma.$disconnect());
