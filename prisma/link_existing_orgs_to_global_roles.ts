
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const globalRoles = await prisma.role.findMany({
    where: { organizationId: null },
  });

  const organizations = await prisma.organization.findMany();

  for (const organization of organizations) {
    for (const role of globalRoles) {
      const existingLink = await prisma.organizationRoleStatus.findUnique({
        where: {
          organizationId_roleId: {
            organizationId: organization.id,
            roleId: role.id,
          },
        },
      });

      if (!existingLink) {
        await prisma.organizationRoleStatus.create({
          data: {
            organizationId: organization.id,
            roleId: role.id,
            active: true,
          },
        });
        console.log(`Linked organization ${organization.name} to global role ${role.name}`);
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
