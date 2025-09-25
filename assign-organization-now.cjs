const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔧 Attribution de l\'organisation à l\'utilisateur...\n');
    
    const userId = '1757366075163-2vdibc2ve';
    const organizationId = '1757366075153-otief8knu';
    
    // Trouver un rôle admin global (pour commencer)
    const adminRole = await prisma.role.findFirst({
      where: {
        name: 'admin',
        organizationId: null // Rôle global
      }
    });
    
    if (!adminRole) {
      console.log('❌ Rôle admin global non trouvé');
      return;
    }
    
    console.log(`📋 Attribution :`);
    console.log(`- Utilisateur: jonathan.dethier@2thier.be`);
    console.log(`- Organisation: 2thier.be`);
    console.log(`- Rôle: ${adminRole.name} (${adminRole.label})`);
    console.log('');
    
    // Vérifier si l'association existe déjà
    const existingAssociation = await prisma.userOrganization.findFirst({
      where: {
        userId: userId,
        organizationId: organizationId
      }
    });
    
    if (existingAssociation) {
      console.log('⚠️  Association déjà existante, mise à jour...');
      
      const updated = await prisma.userOrganization.update({
        where: { id: existingAssociation.id },
        data: {
          roleId: adminRole.id,
          status: 'ACTIVE',
          updatedAt: new Date()
        }
      });
      
      console.log('✅ Association mise à jour avec succès');
    } else {
      console.log('➕ Création de la nouvelle association...');
      
      // Générer un ID unique pour UserOrganization
      const userOrgId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      const created = await prisma.userOrganization.create({
        data: {
          id: userOrgId,
          userId: userId,
          organizationId: organizationId,
          roleId: adminRole.id,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log('✅ Association créée avec succès');
    }
    
    // Vérifier le résultat
    const user = await prisma.user.findUnique({
      where: { email: 'jonathan.dethier@2thier.be' },
      select: {
        email: true,
        UserOrganization: {
          select: {
            status: true,
            Organization: {
              select: { name: true }
            },
            Role: {
              select: { name: true, label: true }
            }
          }
        }
      }
    });
    
    console.log('\\n🎉 Résultat final :');
    console.log(`- Email: ${user.email}`);
    user.UserOrganization.forEach(userOrg => {
      console.log(`- Organisation: ${userOrg.Organization.name}`);
      console.log(`- Rôle: ${userOrg.Role.name} (${userOrg.Role.label})`);
      console.log(`- Status: ${userOrg.status}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur :', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();