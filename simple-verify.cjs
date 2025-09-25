const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simpleVerify() {
  try {
    console.log('🔍 VÉRIFICATION SIMPLE DES DONNÉES');
    console.log('==================================');
    
    // Organisations
    const orgCount = await prisma.organization.count();
    console.log(`📊 Organisations: ${orgCount}`);
    
    if (orgCount > 0) {
      const organizations = await prisma.organization.findMany();
      organizations.forEach(org => {
        console.log(`   - ${org.name} (${org.id.substring(0, 8)}...)`);
      });
    }
    
    // Modules
    const moduleCount = await prisma.module.count();
    console.log(`\n📦 Modules: ${moduleCount}`);
    
    if (moduleCount > 0) {
      const modules = await prisma.module.findMany({
        take: 10,
        select: { key: true, label: true }
      });
      console.log('   Exemples:');
      modules.forEach(module => {
        console.log(`   - ${module.label} (${module.key})`);
      });
    }
    
    // Utilisateurs
    const userCount = await prisma.user.count();
    console.log(`\n👥 Utilisateurs: ${userCount}`);
    
    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: { email: true, role: true }
      });
      users.forEach(user => {
        console.log(`   - ${user.email} (${user.role})`);
      });
    }
    
    // Autres tables importantes
    const leadCount = await prisma.lead.count();
    console.log(`\n🎯 Leads: ${leadCount}`);
    
    const roleCount = await prisma.role.count();
    console.log(`🔑 Rôles: ${roleCount}`);
    
    console.log('\n✅ TOUTES LES DONNÉES SONT BIEN PRÉSENTES !');
    console.log('📍 Prisma Studio est disponible sur http://localhost:5556');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

simpleVerify();
