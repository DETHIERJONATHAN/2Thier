const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Analyse des données existantes...\n');
    
    // 1. Lister toutes les organisations
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true
      }
    });
    
    console.log('📊 Organisations existantes :');
    organizations.forEach(org => {
      console.log(`- ${org.name} (ID: ${org.id}, Status: ${org.status})`);
    });
    console.log('');
    
    // 2. Trouver l'utilisateur jonathan.dethier@2thier.be
    const user = await prisma.user.findUnique({
      where: { email: 'jonathan.dethier@2thier.be' },
      select: {
        id: true,
        email: true,
        UserOrganization: {
          select: {
            organizationId: true,
            roleId: true,
            status: true,
            Organization: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });
    
    if (!user) {
      console.log('❌ Utilisateur jonathan.dethier@2thier.be non trouvé');
      return;
    }
    
    console.log('👤 Utilisateur trouvé :');
    console.log(`- Email: ${user.email}`);
    console.log(`- ID: ${user.id}`);
    
    if (user.UserOrganization.length > 0) {
      console.log('- Organisations associées :');
      user.UserOrganization.forEach(userOrg => {
        console.log(`  * ${userOrg.Organization.name} (Status: ${userOrg.status})`);
      });
    } else {
      console.log('- ⚠️  Aucune organisation associée');
    }
    console.log('');
    
    // 3. Vérifier s'il y a une organisation "2thier" ou similaire
    const targetOrg = organizations.find(org => 
      org.name.toLowerCase().includes('2thier') || 
      org.name.toLowerCase().includes('thier')
    );
    
    if (targetOrg) {
      console.log(`🎯 Organisation cible trouvée : ${targetOrg.name}`);
    } else {
      console.log('🔍 Recherche d\'organisation appropriée...');
      console.log('Suggestions :');
      organizations.forEach((org, index) => {
        console.log(`${index + 1}. ${org.name}`);
      });
    }
    
    // 4. Vérifier les rôles disponibles
    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
        label: true,
        organizationId: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log('\n🔐 Rôles disponibles :');
    roles.forEach(role => {
      console.log(`- ${role.name} (${role.label}) - OrgID: ${role.organizationId || 'Global'}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur :', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();