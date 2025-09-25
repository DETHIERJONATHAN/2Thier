const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function linkUserToOrg() {
  console.log('🔗 Liaison utilisateur avec organisation...');
  
  // Récupérer l'utilisateur
  const user = await prisma.user.findFirst({
    where: { email: 'jonathan.dethier@dethier.be' }
  });
  
  // Récupérer l'organisation 2Thier CRM
  const org = await prisma.organization.findFirst({
    where: { name: '2Thier CRM' }
  });
  
  // Récupérer ou créer un rôle super admin
  let role = await prisma.role.findFirst({
    where: { 
      name: 'super_admin',
      organizationId: org.id
    }
  });
  
  if (!role) {
    console.log('🔧 Création du rôle super_admin...');
    role = await prisma.role.create({
      data: {
        id: '99999999-9999-9999-9999-999999999999',
        name: 'super_admin',
        label: 'Super Administrateur',
        description: 'Accès complet au système',
        organizationId: org.id,
        isGlobal: false,
        isDetached: false
      }
    });
  }
  
  // Créer la relation UserOrganization
  try {
    await prisma.userOrganization.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        roleId: role.id,
        status: 'ACTIVE'
      }
    });
    console.log('✅ Utilisateur lié à l\'organisation avec le rôle super_admin');
  } catch (error) {
    console.log('⚠️ Relation déjà existante ou erreur:', error.message);
  }
  
  await prisma.$disconnect();
}

linkUserToOrg().catch(console.error);
