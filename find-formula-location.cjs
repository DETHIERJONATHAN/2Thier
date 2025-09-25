const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findWhereFormulaIsStored() {
  try {
    const fieldId = '52c7f63b-7e57-4ba8-86da-19a176f09220';
    console.log('🔍 RECHERCHE FORMULE POUR Prix Kw/h - Defini:', fieldId);
    
    // 1. Chercher dans le NOUVEAU modèle 'formula'
    console.log('\n1️⃣ RECHERCHE dans modèle FORMULA (nouveau):');
    try {
      const newFormulas = await prisma.formula.findMany({
        where: { fieldId },
        include: {
          versions: {
            include: {
              nodes: true
            }
          }
        }
      });
      
      console.log('   Résultat:', newFormulas.length, 'formules trouvées');
      newFormulas.forEach((f, i) => {
        console.log(`   Formule ${i+1}: ID=${f.id}, Active=${f.isActive}`);
        console.log(`   Versions:`, f.versions.length);
      });
    } catch (e) {
      console.log('   ERREUR nouveau modèle:', e.message);
    }
    
    // 2. Chercher dans l'ANCIEN modèle 'fieldFormula'  
    console.log('\n2️⃣ RECHERCHE dans modèle FIELDFORMULA (ancien):');
    try {
      const oldFormulas = await prisma.fieldFormula.findMany({
        where: { fieldId }
      });
      
      console.log('   Résultat:', oldFormulas.length, 'formules trouvées');
      oldFormulas.forEach((f, i) => {
        console.log(`   Formule ${i+1}: ID=${f.id}, Name=${f.name}`);
      });
    } catch (e) {
      console.log('   ERREUR ancien modèle:', e.message);
    }

    // 3. Chercher la formule spécifique qui cause l'erreur
    console.log('\n3️⃣ RECHERCHE formule spécifique 387dd1f0-903f-4c46-8b1c-14d63bdba53c:');
    
    // Dans nouveau modèle
    try {
      const specificNew = await prisma.formula.findUnique({
        where: { id: '387dd1f0-903f-4c46-8b1c-14d63bdba53c' }
      });
      console.log('   Dans nouveau modèle:', specificNew ? 'TROUVÉE' : 'PAS TROUVÉE');
    } catch (e) {
      console.log('   Erreur nouveau modèle:', e.message);
    }
    
    // Dans ancien modèle
    try {
      const specificOld = await prisma.fieldFormula.findUnique({
        where: { id: '387dd1f0-903f-4c46-8b1c-14d63bdba53c' }
      });
      console.log('   Dans ancien modèle:', specificOld ? 'TROUVÉE' : 'PAS TROUVÉE');
    } catch (e) {
      console.log('   Erreur ancien modèle:', e.message);
    }

  } catch (error) {
    console.error('Erreur globale:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findWhereFormulaIsStored();
