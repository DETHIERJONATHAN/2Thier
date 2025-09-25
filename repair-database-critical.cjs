const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function repairDatabase() {
  console.log('🔧 RÉPARATION BASE DE DONNÉES - DONNÉES CRITIQUES MANQUANTES');
  console.log('='.repeat(70));

  try {
    // 1. Vérifier/Créer l'organisation 2thier
    console.log('🏢 Vérification organisation 2thier...');
    
    let organization = await prisma.organization.findFirst({
      where: { name: '2thier' }
    });

    if (!organization) {
      console.log('❌ Organisation 2thier manquante - Création...');
      organization = await prisma.organization.create({
        data: {
          name: '2thier',
          website: 'https://2thier.be',
          description: 'Organisation principale 2thier',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('✅ Organisation 2thier créée:', organization.id);
    } else {
      console.log('✅ Organisation 2thier trouvée:', organization.id);
    }

    // 2. Créer le rôle SUPER_ADMIN s'il n'existe pas
    console.log('\n🎭 Vérification rôle SUPER_ADMIN...');
    
    let superAdminRole = await prisma.role.findFirst({
      where: { 
        name: 'SUPER_ADMIN',
        organizationId: organization.id 
      }
    });

    if (!superAdminRole) {
      console.log('❌ Rôle SUPER_ADMIN manquant - Création...');
      superAdminRole = await prisma.role.create({
        data: {
          name: 'SUPER_ADMIN',
          label: 'Super Administrateur',
          organizationId: organization.id,
          description: 'Super Administrateur',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('✅ Rôle SUPER_ADMIN créé:', superAdminRole.id);
    } else {
      console.log('✅ Rôle SUPER_ADMIN trouvé:', superAdminRole.id);
    }

    // 3. Vérifier/Créer le Super Admin
    console.log('\n👤 Vérification utilisateur Super Admin...');
    
    let superAdmin = await prisma.user.findFirst({
      where: { email: 'jonathan.dethier@2thier.be' }
    });

    if (!superAdmin) {
      console.log('❌ Super Admin manquant - Création...');
      const hashedPassword = await bcrypt.hash('Jlsl2022@', 10);
      
      superAdmin = await prisma.user.create({
        data: {
          email: 'jonathan.dethier@2thier.be',
          passwordHash: hashedPassword,
          firstName: 'Jonathan',
          lastName: 'Dethier',
          status: 'active',
          role: 'super_admin',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('✅ Super Admin créé:', superAdmin.id);
    } else {
      console.log('✅ Super Admin trouvé:', superAdmin.id);
    }

    // 4. Vérifier/Créer la relation UserOrganization
    console.log('\n🔗 Vérification relation UserOrganization...');
    
    let userOrg = await prisma.userOrganization.findFirst({
      where: {
        userId: superAdmin.id,
        organizationId: organization.id
      }
    });

    if (!userOrg) {
      console.log('❌ Relation UserOrganization manquante - Création...');
      userOrg = await prisma.userOrganization.create({
        data: {
          userId: superAdmin.id,
          organizationId: organization.id,
          roleId: superAdminRole.id,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('✅ Relation UserOrganization créée');
    } else {
      console.log('✅ Relation UserOrganization trouvée');
    }

    // 5. Les modules seront activés automatiquement par le système
    console.log('\n📦 Les modules seront activés automatiquement...');

    // 6. Résumé final
    console.log('\n📊 RÉSUMÉ RÉPARATION:');
    console.log(`   🏢 Organisation: ${organization.name} (ID: ${organization.id})`);
    console.log(`   👤 Super Admin: ${superAdmin.email}`);
    console.log(`   🎭 Rôle: ${superAdminRole.name}`);
    console.log(`   🔗 UserOrganization: Liée`);
    console.log(`   📦 Modules: Seront activés automatiquement`);
    
    console.log('\n🎯 ACTIONS SUIVANTES:');
    console.log('   1. ✅ Redémarrer le serveur (npm run dev)');
    console.log('   2. ✅ Se connecter avec jonathan.dethier@2thier.be');
    console.log('   3. ✅ Tester la connexion Google OAuth');

  } catch (error) {
    console.error('❌ Erreur lors de la réparation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

repairDatabase();
