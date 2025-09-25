const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('=== VÉRIFICATION BASE DE DONNÉES ===');

    const userCount = await prisma.user.count();
    const orgCount = await prisma.organization.count();
    const moduleCount = await prisma.module.count();

    console.log(`Utilisateurs : ${userCount}`);
    console.log(`Organisations : ${orgCount}`);
    console.log(`Modules : ${moduleCount}`);

    if (userCount === 0 && orgCount === 0) {
      console.log('\n❌ Base de données vide ! Solution :');
      console.log('1. localStorage.clear() dans la console du navigateur');
      console.log('2. Rechargez la page');
      console.log('3. Exécutez : npm run dev');
      console.log('4. Allez sur http://localhost:3000/register');
      console.log('5. Créez un nouveau compte');
    } else if (userCount > 0) {
      console.log('\n✅ Utilisateurs trouvés :');
      const users = await prisma.user.findMany({
        include: { organization: true }
      });
      
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.role})`);
      });
      
      console.log('\nSOLUTION :');
      console.log('1. localStorage.clear() dans la console');
      console.log('2. Rechargez et reconnectez-vous');
    }

  } catch (error) {
    console.error('Erreur de connexion :', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
