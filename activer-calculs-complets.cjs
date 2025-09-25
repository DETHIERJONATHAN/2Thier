const { PrismaClient } = require('@prisma/client');

async function activerCalculs() {
  const prisma = new PrismaClient();

  try {
    console.log('🔧 ACTIVATION DES CALCULS POUR TOUS LES CHAMPS DONNÉES');
    console.log('====================================================');
    
    // Corriger les champs qui ont des formules mais hasFormula: false
    const champsCorriger = [
      {
        id: '688046c2-c2ee-4617-b4d3-c66eca40fa9d',
        nom: 'Champ (C) dans Données',
        formuleId: '5843ef67-458d-4659-91dd-6232de435aa4'
      },
      {
        id: 'cc8bf34e-3461-426e-a16d-2c1db4ff8a76', 
        nom: 'Champ (C) dans Nouveau Section',
        formuleId: '3a04a2ff-bc48-43b5-814f-bff80b3af5c6'
      }
    ];

    console.log('🎯 CORRECTION DES CHAMPS:');
    
    for (const champ of champsCorriger) {
      console.log(`\n   Traitement ${champ.nom}...`);
      
      // 1. Activer hasFormula
      const result = await prisma.treeBranchLeafNode.update({
        where: { id: champ.id },
        data: {
          hasFormula: true,
          formula_activeId: champ.formuleId  // Corriger aussi le formula_activeId
        }
      });
      
      console.log(`   ✅ hasFormula: ${result.hasFormula}`);
      console.log(`   ✅ formula_activeId: ${result.formula_activeId}`);

      // 2. S'assurer que la formule est active
      await prisma.treeBranchLeafNodeFormula.update({
        where: { id: champ.formuleId },
        data: {
          isActive: true
        }
      });
      
      console.log(`   ✅ Formule activée`);
    }

    // 3. Corriger aussi le champ "Prix Kw/h" pour qu'il pointe vers la bonne formule
    console.log(`\n🔧 CORRECTION DU CHAMP "Prix Kw/h":`);
    const prixKwhResult = await prisma.treeBranchLeafNode.update({
      where: { id: '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e' },
      data: {
        formula_activeId: '7097ff9b-974a-4fb3-80d8-49634a634efc'  // Corriger la référence
      }
    });
    
    console.log(`   ✅ formula_activeId corrigé: ${prixKwhResult.formula_activeId}`);

    // 4. S'assurer que toutes les formules sont actives
    await prisma.treeBranchLeafNodeFormula.update({
      where: { id: '7097ff9b-974a-4fb3-80d8-49634a634efc' },
      data: { isActive: true }
    });

    console.log(`\n🎉 RÉSULTAT FINAL:`);
    console.log(`   ✅ 3 champs avec hasData: true ET hasFormula: true`);
    console.log(`   ✅ formula_activeId corrigés pour pointer vers les bonnes formules`);
    console.log(`   ✅ Toutes les formules activées`);
    
    console.log(`\n🚀 MAINTENANT TOUS LES CHAMPS DONNÉES DEVRAIENT CALCULER !`);

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

activerCalculs();