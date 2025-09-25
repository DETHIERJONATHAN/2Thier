import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getOrganization() {
  console.log('🏢 ORGANISATIONS DISPONIBLES:\n');
  
  const orgs = await prisma.organization.findMany();
  orgs.forEach(org => {
    console.log(`  - ${org.id}: ${org.name}`);
  });
  
  console.log('\n👥 UTILISATEURS AVEC ORGANISATIONS:\n');
  
  const users = await prisma.user.findMany({
    include: {
      UserOrganization: {
        include: {
          organization: true
        }
      }
    }
  });
  
  users.forEach(user => {
    console.log(`📧 ${user.firstName} ${user.lastName}:`);
    user.UserOrganization.forEach(uo => {
      console.log(`  -> Organisation: ${uo.organization.name} (${uo.organizationId})`);
    });
  });
  
  await prisma.$disconnect();
}

getOrganization().catch(console.error);
