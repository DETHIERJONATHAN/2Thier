import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
    orderBy: {
      id: 'asc',
    },
  });

  const header = 'id,email,firstName,lastName,role\n';
  const rows = users.map(u => 
    `${u.id},${u.email},${u.firstName || ''},${u.lastName || ''},${u.role}`
  ).join('\n');

  fs.writeFileSync('users_local_check.csv', header + rows);
  console.log(`Exported ${users.length} users to users_local_check.csv`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
