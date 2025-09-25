const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function validationTest() {
  try {
    console.log('🎯 === VALIDATION POUR TEST DE SUPPRESSION ===');
    console.log('');

    // 1. Vérifier les emails actuels
    const currentEmails = await prisma.email.findMany({
      where: {
        userId: 'c8eba369-99f4-4c1a-9d71-85e582787590',
        folder: 'inbox'
      },
      select: {
        id: true,
        subject: true,
        from: true,
        uid: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    console.log(`📧 Emails disponibles pour test (INBOX): ${currentEmails.length}`);
    console.log('');
    console.log('🎮 IDs à utiliser pour tester la suppression:');
    currentEmails.forEach((email, index) => {
      console.log(`${index + 1}. ✅ ${email.id}`);
      console.log(`   📝 ${email.subject}`);
      console.log(`   👤 ${email.from}`);
      console.log('');
    });

    console.log('🚀 === INSTRUCTIONS DE TEST ===');
    console.log('');
    console.log('1. 🌐 Ouvrir votre navigateur en mode INCOGNITO');
    console.log('2. 📍 Aller sur http://localhost:5173');
    console.log('3. 🔑 Se connecter au CRM');
    console.log('4. 📧 Aller dans la section Email');
    console.log('5. ✅ Sélectionner quelques emails');
    console.log('6. 🗑️ Cliquer sur "Supprimer"');
    console.log('7. ✨ Vérifier qu\'il n\'y a AUCUNE erreur 404');
    console.log('');
    console.log('💡 L\'AutoMailSyncService est DÉSACTIVÉ, donc pas de nouvelles');
    console.log('   synchronisations qui interfèrent avec vos tests.');
    console.log('');
    console.log('🏁 Une fois confirmé que ça marche, dites-moi et je');
    console.log('   réactiverai l\'AutoMailSyncService !');

  } catch (error) {
    console.error('❌ Erreur lors de la validation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

validationTest();
