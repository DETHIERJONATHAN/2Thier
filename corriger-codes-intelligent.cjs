/**
 * 🔧 CORRECTION INTELLIGENTE CODES TBL
 * 
 * Amélioration de l'algorithme de génération pour éviter les troncatures
 */

const { PrismaClient } = require('@prisma/client');

async function corrigerCodesIntelligent() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧠 CORRECTION INTELLIGENTE CODES TBL');
    console.log('='.repeat(50));
    
    const codesTronques = await prisma.treeBranchLeafNode.findMany({
      where: { 
        tbl_code: { endsWith: '-' }
      }
    });
    
    console.log(`🔍 Codes à améliorer: ${codesTronques.length}`);
    
    for (const element of codesTronques) {
      // Algorithme intelligent pour générer un meilleur code
      let labelPropre = element.label
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Supprimer accents
        .replace(/[^a-z0-9\s]/g, '') // Garder seulement lettres, chiffres, espaces
        .trim();
      
      // Extraire les mots clés les plus significatifs
      const mots = labelPropre.split(/\s+/).filter(m => m.length > 0);
      
      let codeLabel = '';
      
      if (mots.length === 1) {
        // Un seul mot : prendre jusqu'à 8 caractères
        codeLabel = mots[0].substring(0, 8);
      } else if (mots.length === 2) {
        // Deux mots : 4 chars du premier + 4 du second
        codeLabel = mots[0].substring(0, 4) + mots[1].substring(0, 4);
      } else {
        // Plusieurs mots : première lettre de chaque + compléter avec le premier mot
        const initiales = mots.map(m => m[0]).join('');
        if (initiales.length >= 6) {
          codeLabel = initiales.substring(0, 8);
        } else {
          codeLabel = initiales + mots[0].substring(1, 8 - initiales.length);
        }
      }
      
      // S'assurer qu'on a au moins 3 caractères
      if (codeLabel.length < 3) {
        codeLabel = labelPropre.replace(/[^a-z0-9]/g, '').substring(0, 8);
      }
      
      // Retirer les tirets de fin si présents
      codeLabel = codeLabel.replace(/-+$/, '');
      
      const nouveauCode = `${element.tbl_type}${element.tbl_capacity}${codeLabel}`;
      
      await prisma.treeBranchLeafNode.update({
        where: { id: element.id },
        data: { 
          tbl_code: nouveauCode,
          tbl_updated_at: new Date()
        }
      });
      
      console.log(`✅ "${element.label}"`);
      console.log(`   Ancien: ${element.tbl_code}`);
      console.log(`   Nouveau: ${nouveauCode}`);
      console.log(`   Mots: [${mots.join(', ')}]`);
    }
    
    console.log('\n🎉 VÉRIFICATION FINALE');
    console.log('-'.repeat(30));
    
    const verification = await prisma.treeBranchLeafNode.findMany({
      where: { 
        tbl_code: { endsWith: '-' }
      }
    });
    
    console.log(`📊 Codes se terminant par '-': ${verification.length}`);
    
    if (verification.length === 0) {
      console.log('🏆 SUCCÈS - Plus aucun code tronqué !');
    } else {
      console.log('⚠️ Codes restants à investiguer:');
      verification.forEach(v => {
        console.log(`   "${v.label}" → ${v.tbl_code}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution
corrigerCodesIntelligent();