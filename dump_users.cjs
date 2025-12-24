const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to database...');
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

  // Determine filename based on env var or default
  const filename = process.env.OUTPUT_FILE || 'users_local_check.csv';
  
  fs.writeFileSync(filename, header + rows);
  console.log(`Exported ${users.length} users to ${filename}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
