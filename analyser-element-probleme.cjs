const { PrismaClient } = require('@prisma/client');

async function analyserElement() {
  const prisma = new PrismaClient();
  try {
    // Trouver l'élément spécifique
    const element = await prisma.treeBranchLeafNode.findUnique({
      where: { id: '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e' },
      include: {
        TreeBranchLeafNode: true, // Parent
      }
    });
    
    if (!element) {
      console.log('❌ Élément non trouvé');
      return;
    }
    
    console.log('🔍 ANALYSE DE L\'ÉLÉMENT PROBLÉMATIQUE:');
    console.log('='.repeat(50));
    console.log(`📋 Élément: "${element.label}"`);
    console.log(`🆔 ID: ${element.id}`);
    console.log(`📂 Type: ${element.type}`);
    console.log(`🏷️ Code TBL actuel: ${element.tbl_code} (Type:${element.tbl_type}, Capacité:${element.tbl_capacity})`);
    console.log(`👨‍👩‍👧‍👦 Parent ID: ${element.parentId}`);
    
    if (element.parentId) {
      const parent = await prisma.treeBranchLeafNode.findUnique({
        where: { id: element.parentId }
      });
      
      console.log(`\n👨‍👩‍👧‍👦 PARENT:`);
      console.log(`   Label: "${parent?.label}"`);
      console.log(`   Type: ${parent?.type}`);
      console.log(`   Code TBL: ${parent?.tbl_code}`);
      
      // Vérifier si le parent est une section
      const estDansSection = parent?.type === 'section';
      console.log(`\n🎯 DIAGNOSTIC:`);
      console.log(`   Parent est une section: ${estDansSection ? 'OUI ✅' : 'NON ❌'}`);
      
      if (estDansSection) {
        const nouveauType = '6'; // Champ Données
        const capacite = element.tbl_capacity;
        const nomCourt = element.tbl_code?.substring(2) || 'data';
        const nouveauCode = `${nouveauType}${capacite}${nomCourt}`;
        
        console.log(`   ➡️  CORRECTION NÉCESSAIRE:`);
        console.log(`   ❌ Actuel: ${element.tbl_code} (Type ${element.tbl_type} = Champ simple)`);
        console.log(`   ✅ Correct: ${nouveauCode} (Type ${nouveauType} = Champ Données)`);
        console.log(`\n🔧 VOUS AVEZ RAISON ! Cet élément doit être un 6${capacite}, pas un 3${capacite}`);
      } else {
        console.log(`   ✅ Code TBL correct pour un champ hors section`);
      }
    }
    
    // Vérifier combien d'autres éléments ont le même problème
    console.log(`\n🔍 RECHERCHE D'AUTRES PROBLÈMES SIMILAIRES:`);
    const champsEnSection = await prisma.treeBranchLeafNode.findMany({
      where: {
        type: 'leaf_field',
        tbl_type: 3, // Actuellement codés comme "Champ simple"
        TreeBranchLeafNode: {
          type: 'section' // Mais parent est une section
        }
      },
      include: {
        TreeBranchLeafNode: true
      }
    });
    
    console.log(`   Champs mal classés trouvés: ${champsEnSection.length}`);
    champsEnSection.forEach((c, i) => {
      console.log(`   ${i+1}. "${c.label}" → ${c.tbl_code} (dans section "${c.TreeBranchLeafNode?.label}")`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

analyserElement();