const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function creerDevisTest() {
  try {
    console.log('🔄 Création d\'un devis de test...');
    
    // Chercher l'utilisateur actuel
    const user = await prisma.user.findFirst({
      where: { role: 'super_admin' }
    });
    
    if (!user) {
      console.log('❌ Aucun super admin trouvé');
      return;
    }
    
    // Créer un devis de test
    const devis = await prisma.formSubmission.create({
      data: {
        data: {
          // Données initiales pour tester le tableau
          "nouveau-champ-tableau": []
        },
        userId: user.id
      }
    });
    
    console.log(`✅ Devis créé avec l'ID: ${devis.id}`);
    console.log(`🔗 URL de test: http://localhost:5173/devis?id=${devis.id}`);
    
    // Afficher l'ID pour navigation directe
    console.log('\n📋 Copiez cette URL dans votre navigateur pour tester le tableau :');
    console.log(`http://localhost:5173/devis?id=${devis.id}`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

creerDevisTest();
