const { PrismaClient } = require('@prisma/client');

async function activerCalculsSimple() {
  const prisma = new PrismaClient();

  try {
    console.log('🔧 ACTIVATION SIMPLE DES CALCULS');
    console.log('================================');
    
    // Corriger juste les champs pour hasFormula: true
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

    console.log('🎯 ACTIVATION hasFormula: true:');
    
    for (const champ of champsCorriger) {
      console.log(`\n   Traitement ${champ.nom}...`);
      
      const result = await prisma.treeBranchLeafNode.update({
        where: { id: champ.id },
        data: {
          hasFormula: true,
          formula_activeId: champ.formuleId
        }
      });
      
      console.log(`   ✅ hasFormula: ${result.hasFormula}`);
      console.log(`   ✅ formula_activeId: ${result.formula_activeId}`);
    }

    // Corriger aussi le champ "Prix Kw/h"
    console.log(`\n🔧 CORRECTION DU CHAMP "Prix Kw/h":`);
    const prixKwhResult = await prisma.treeBranchLeafNode.update({
      where: { id: '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e' },
      data: {
        formula_activeId: '7097ff9b-974a-4fb3-80d8-49634a634efc'
      }
    });
    
    console.log(`   ✅ formula_activeId corrigé: ${prixKwhResult.formula_activeId}`);

    console.log(`\n🎉 VÉRIFICATION FINALE:`);
    const tousLesChamps = await prisma.treeBranchLeafNode.findMany({
      where: {
        hasData: true
      },
      select: {
        id: true,
        label: true,
        hasData: true,
        hasFormula: true,
        formula_activeId: true
      }
    });

    console.log('\n   ÉTAT FINAL DES CHAMPS DONNÉES:');
    for (const champ of tousLesChamps) {
      const statut = (champ.hasData && champ.hasFormula && champ.formula_activeId) ? '🎯 CALCULERA' : '❌ Ne calculera pas';
      console.log(`     ${champ.label}: ${statut}`);
      console.log(`       hasData: ${champ.hasData}, hasFormula: ${champ.hasFormula}, formula_activeId: ${champ.formula_activeId ? 'OUI' : 'NON'}`);
    }
    
    console.log(`\n🚀 CORRECTION TERMINÉE ! Testez maintenant dans l'interface.`);

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

activerCalculsSimple();