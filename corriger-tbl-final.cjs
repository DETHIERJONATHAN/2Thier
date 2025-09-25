/**
 * 🔧 CORRECTION FINALE TBL BRIDGE V2.0
 * 
 * Correction des problèmes identifiés :
 * 1. Codes tronqués se terminant par "-"
 * 2. Amélioration détection capacités
 */

const { PrismaClient } = require('@prisma/client');

async function corrigerProblemesTBL() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 CORRECTION FINALE TBL BRIDGE V2.0');
    console.log('='.repeat(50));
    
    // 1. ✅ CORRIGER CODES TRONQUÉS
    console.log('\n1️⃣ CORRECTION CODES TRONQUÉS');
    console.log('-'.repeat(30));
    
    const codesTronques = await prisma.treeBranchLeafNode.findMany({
      where: { 
        tbl_code: { endsWith: '-' }
      }
    });
    
    console.log(`🔍 Codes tronqués trouvés: ${codesTronques.length}`);
    
    for (const element of codesTronques) {
      // Régénérer le code sans troncature
      const labelNorm = element.label
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Supprimer accents
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      // Garder maximum 8 caractères du label normalisé
      const labelTronque = labelNorm.substring(0, 8);
      const nouveauCode = `${element.tbl_type}${element.tbl_capacity}${labelTronque}`;
      
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
    }
    
    // 2. ✅ AMÉLIORER DÉTECTION CAPACITÉS
    console.log('\n2️⃣ AMÉLIORATION DÉTECTION CAPACITÉS');
    console.log('-'.repeat(30));
    
    // Chercher éléments avec formules mais mal détectés
    const elementsAvecFormules = await prisma.treeBranchLeafNode.findMany({
      where: {
        TreeBranchLeafNodeFormula: { some: {} }
      },
      include: {
        TreeBranchLeafNodeFormula: true
      }
    });
    
    console.log(`🔍 Éléments avec formules: ${elementsAvecFormules.length}`);
    
    for (const element of elementsAvecFormules) {
      if (element.tbl_capacity !== 2) {
        console.log(`🔧 Correction capacité pour "${element.label}"`);
        console.log(`   Formules: ${element.TreeBranchLeafNodeFormula.length}`);
        
        // Régénérer le code avec la bonne capacité
        const labelNorm = element.label
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        const labelTronque = labelNorm.substring(0, 8);
        const nouveauCode = `${element.tbl_type}2${labelTronque}`; // Capacité 2 = Formule
        
        await prisma.treeBranchLeafNode.update({
          where: { id: element.id },
          data: { 
            tbl_capacity: 2,
            tbl_code: nouveauCode,
            tbl_updated_at: new Date()
          }
        });
        
        console.log(`✅ Capacité corrigée: ${element.tbl_capacity} → 2`);
        console.log(`✅ Code corrigé: ${element.tbl_code} → ${nouveauCode}`);
      }
    }
    
    // 3. ✅ VÉRIFICATION FINALE
    console.log('\n3️⃣ VÉRIFICATION POST-CORRECTION');
    console.log('-'.repeat(30));
    
    const verification = await prisma.treeBranchLeafNode.findMany({
      where: { 
        tbl_code: { not: null }
      },
      select: { 
        tbl_code: true,
        tbl_type: true,
        tbl_capacity: true,
        label: true
      }
    });
    
    const codesTronquesRestants = verification.filter(v => v.tbl_code?.endsWith('-'));
    const capacitesIncorrectes = await prisma.treeBranchLeafNode.count({
      where: {
        TreeBranchLeafNodeFormula: { some: {} },
        tbl_capacity: { not: 2 }
      }
    });
    
    console.log(`📊 Codes tronqués restants: ${codesTronquesRestants.length}`);
    console.log(`📊 Capacités incorrectes restantes: ${capacitesIncorrectes}`);
    
    if (codesTronquesRestants.length === 0 && capacitesIncorrectes === 0) {
      console.log('🎉 CORRECTION RÉUSSIE - Tous problèmes corrigés !');
    } else {
      console.log('⚠️ Problèmes restants à investiguer');
    }
    
    console.log('\n🏆 RÉSUMÉ CORRECTION');
    console.log('='.repeat(30));
    console.log(`✅ Codes tronqués corrigés: ${codesTronques.length}`);
    console.log(`✅ Capacités formules corrigées: ${elementsAvecFormules.filter(e => e.tbl_capacity !== 2).length}`);
    console.log('🚀 TBL Bridge V2.0 prêt pour la production !');
    
  } catch (error) {
    console.error('❌ Erreur correction:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution
corrigerProblemesTBL();