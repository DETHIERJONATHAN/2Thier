const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Vérification des utilisateurs...');
  
  // Lister tous les utilisateurs
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true
    }
  });
  
  console.log(`👥 ${users.length} utilisateurs trouvés:`);
  users.forEach(user => {
    console.log(`  📧 ${user.email} (${user.firstName} ${user.lastName}) - Role: ${user.role} - Status: ${user.status}`);
  });
  
  console.log('\n🔐 Mise à jour des mots de passe vers "123"...');
  
  // Hash du mot de passe "123"
  const newPassword = "123";
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  // Mettre à jour tous les utilisateurs actifs
  const updated = await prisma.user.updateMany({
    where: {
      status: 'active'
    },
    data: {
      passwordHash: hashedPassword
    }
  });
  
  console.log(`✅ ${updated.count} utilisateurs mis à jour avec le mot de passe "123"`);
  console.log('\n🎯 Tu peux maintenant te connecter avec:');
  
  users.filter(u => u.status === 'active').forEach(user => {
    console.log(`  📧 Email: ${user.email}`);
    console.log(`  🔑 Mot de passe: 123`);
    console.log('');
  });
}

main()
  .catch(e => { 
    console.error('❌ Erreur:', e); 
    process.exit(1); 
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
