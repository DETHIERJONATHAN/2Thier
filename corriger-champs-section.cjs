/**
 * 🔧 CORRECTION INTELLIGENTE DES CHAMPS EN SECTION
 * 
 * Script pour corriger uniquement les éléments mal classés :
 * - Champs (leaf_field) dans des sections → doivent être Type 6 (Données)
 * - Sans reset, juste corrections ciblées
 */

const { PrismaClient } = require('@prisma/client');

async function corrigerChampsEnSection() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 CORRECTION INTELLIGENTE DES CHAMPS EN SECTION');
    console.log('='.repeat(55));
    
    // 1. Identifier tous les champs mal classés
    const champsACorreger = await prisma.treeBranchLeafNode.findMany({
      where: {
        type: 'leaf_field',
        tbl_type: 3, // Actuellement codés comme "Champ simple"
        TreeBranchLeafNode: {
          type: 'section' // Mais parent est une section
        }
      },
      include: {
        TreeBranchLeafNode: true // Parent
      }
    });

    console.log(`🔍 Champs mal classés trouvés: ${champsACorreger.length}`);

    if (champsACorreger.length === 0) {
      console.log('✅ Aucune correction nécessaire !');
      return;
    }

    let corriges = 0;

    for (const champ of champsACorreger) {
      const ancienCode = champ.tbl_code;
      const ancienType = champ.tbl_type;
      const capacite = champ.tbl_capacity;
      
      // Nouveau type : 6 (Champ Données)
      const nouveauType = 6;
      
      // Nouveau code TBL : remplacer le premier chiffre par 6
      const nouveauCode = ancienCode ? `6${capacite}${ancienCode.substring(2)}` : null;
      
      console.log(`\n🔄 ${corriges + 1}/${champsACorreger.length} - "${champ.label}"`);
      console.log(`   📂 Dans section: "${champ.TreeBranchLeafNode?.label}"`);
      console.log(`   ❌ Ancien: ${ancienCode} (Type ${ancienType} = Champ simple)`);
      console.log(`   ✅ Nouveau: ${nouveauCode} (Type ${nouveauType} = Champ Données)`);

      // Appliquer la correction
      await prisma.treeBranchLeafNode.update({
        where: { id: champ.id },
        data: {
          tbl_type: nouveauType,
          tbl_code: nouveauCode,
          tbl_updated_at: new Date()
        }
      });

      corriges++;
    }

    console.log(`\n🎉 CORRECTION TERMINÉE !`);
    console.log(`   ✅ ${corriges} éléments corrigés`);
    console.log(`   🎯 Règle appliquée: Champs en section → Type 6 (Données)`);

    // Vérification finale
    console.log(`\n🔍 VÉRIFICATION POST-CORRECTION:`);
    const verification = await prisma.treeBranchLeafNode.findMany({
      where: {
        type: 'leaf_field',
        tbl_type: 3, // Encore codés comme champ simple
        TreeBranchLeafNode: {
          type: 'section' // Mais dans une section
        }
      }
    });

    if (verification.length === 0) {
      console.log(`   ✅ Parfait ! Plus aucun champ mal classé`);
    } else {
      console.log(`   ⚠️  ${verification.length} champs encore mal classés`);
    }

    // Statistiques finales
    const statsFinales = await prisma.treeBranchLeafNode.groupBy({
      by: ['tbl_type'],
      _count: true,
      where: { tbl_code: { not: null } }
    });

    console.log(`\n📊 NOUVELLES STATISTIQUES PAR TYPE:`);
    statsFinales.forEach(stat => {
      const typeStr = ['?', 'Branche', 'Sous-branche', 'Champ', 'Option', 'Option+Champ', 'Données', 'Section'][stat.tbl_type || 0];
      console.log(`   Type ${stat.tbl_type} (${typeStr}): ${stat._count} éléments`);
    });

  } catch (error) {
    console.error('❌ Erreur correction:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution
corrigerChampsEnSection();