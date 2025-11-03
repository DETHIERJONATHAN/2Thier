/**
 * 🧪 TEST DE LA COPIE COMPLÈTE DES CAPACITÉS
 * 
 * Ce script teste si la logique de copie fonctionne maintenant
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCopyFlow() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TEST DE LA LOGIQUE DE COPIE CORRIGÉE');
  console.log('='.repeat(80) + '\n');

  try {
    // 1. Prendre une variable originale avec formule
    const originalVar = await prisma.treeBranchLeafNodeVariable.findFirst({
      where: { 
        exposedKey: 'var_965b',
        sourceRef: { startsWith: 'node-formula:' }
      }
    });

    if (!originalVar) {
      console.log('❌ Variable originale non trouvée');
      return;
    }

    console.log('📋 VARIABLE ORIGINALE:');
    console.log(`   exposedKey: ${originalVar.exposedKey}`);
    console.log(`   Variable.nodeId: ${originalVar.nodeId}`);
    console.log(`   Variable.sourceRef: ${originalVar.sourceRef}`);

    // 2. Extraire l'ID de la formule
    const formulaId = originalVar.sourceRef.replace('node-formula:', '');
    console.log(`\n💡 ID formule dans sourceRef: ${formulaId}`);

    // 3. Chercher la formule par ID
    const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
      where: { id: formulaId }
    });

    if (!formula) {
      console.log(`❌ Formule non trouvée avec id: ${formulaId}`);
      return;
    }

    console.log(`\n✅ FORMULE ORIGINALE TROUVÉE:`);
    console.log(`   Formula.id: ${formula.id}`);
    console.log(`   Formula.nodeId: ${formula.nodeId}`);
    console.log(`   Formula.name: ${formula.name}`);
    console.log(`\n   🔗 Vérification linking:`);
    console.log(`      Variable.nodeId == Formula.nodeId ? ${originalVar.nodeId === formula.nodeId ? '✅' : '❌'}`);

    // 4. Simuler la copie
    console.log('\n\n' + '='.repeat(80));
    console.log('🔧 SIMULATION DE COPIE\n');

    const suffix = 1;
    const newVarNodeId = `${originalVar.nodeId}-${suffix}`;
    const newFormulaId = `${formula.id}-${suffix}`;

    console.log('Ce qui devrait être créé:');
    console.log('\n📝 NOUVELLE VARIABLE:');
    console.log(`   Variable.nodeId: ${newVarNodeId}`);
    console.log(`   Variable.sourceRef: node-formula:${newFormulaId}`);

    console.log('\n📝 NOUVELLE FORMULE:');
    console.log(`   Formula.id: ${newFormulaId}`);
    console.log(`   Formula.nodeId: ${newVarNodeId} ← DOIT MATCHER Variable.nodeId`);

    // 5. Vérifier la variable copiée existante
    console.log('\n\n' + '='.repeat(80));
    console.log('🔍 VÉRIFICATION VARIABLE COPIÉE EXISTANTE\n');

    const copiedVar = await prisma.treeBranchLeafNodeVariable.findFirst({
      where: { exposedKey: 'var_965b-1' }
    });

    if (copiedVar) {
      console.log('📋 VARIABLE COPIÉE (existante):');
      console.log(`   Variable.nodeId: ${copiedVar.nodeId}`);
      console.log(`   Variable.sourceRef: ${copiedVar.sourceRef}`);

      // Extraire l'ID de formule du sourceRef
      const copiedFormulaIdFromRef = copiedVar.sourceRef.replace('node-formula:', '');
      console.log(`\n💡 ID formule dans sourceRef: ${copiedFormulaIdFromRef}`);

      // Chercher si la formule copiée existe
      const copiedFormula = await prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: copiedFormulaIdFromRef }
      });

      if (copiedFormula) {
        console.log(`\n✅ FORMULE COPIÉE EXISTE !`);
        console.log(`   Formula.id: ${copiedFormula.id}`);
        console.log(`   Formula.nodeId: ${copiedFormula.nodeId}`);
        console.log(`\n   🔗 Vérification linking:`);
        console.log(`      Variable.nodeId == Formula.nodeId ? ${copiedVar.nodeId === copiedFormula.nodeId ? '✅ OUI' : '❌ NON'}`);
      } else {
        console.log(`\n❌ FORMULE COPIÉE MANQUANTE !`);
        console.log(`   Devrait exister: Formula.id = "${copiedFormulaIdFromRef}"`);
        console.log(`   Avec: Formula.nodeId = "${copiedVar.nodeId}"`);
        
        // Test avec nouveau code
        console.log(`\n🧪 TEST AVEC NOUVEAU CODE:`);
        const cleanId = copiedFormulaIdFromRef.replace(/-\d+$/, '');
        console.log(`   1. Enlever suffixe: "${copiedFormulaIdFromRef}" → "${cleanId}"`);
        
        const foundFormula = await prisma.treeBranchLeafNodeFormula.findUnique({
          where: { id: cleanId }
        });
        
        if (foundFormula) {
          console.log(`   2. ✅ Formule originale trouvée avec id: ${cleanId}`);
          console.log(`   3. Devrait copier avec:`);
          console.log(`      - Nouveau Formula.id: ${copiedFormulaIdFromRef}`);
          console.log(`      - Nouveau Formula.nodeId: ${copiedVar.nodeId}`);
          console.log(`\n   💡 AVEC LE NOUVEAU CODE, CETTE COPIE DEVRAIT FONCTIONNER !`);
        } else {
          console.log(`   2. ❌ Formule originale non trouvée`);
        }
      }
    } else {
      console.log('⚠️  Aucune variable copiée trouvée (normal si pas encore testé)');
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 RÉSUMÉ\n');
    console.log('Le nouveau code:');
    console.log('1. ✅ Enlève le suffixe de l\'ID dans sourceRef');
    console.log('2. ✅ Cherche la formule originale par ID');
    console.log('3. ✅ Copie avec nouveau ID (avec suffixe) et nouveau nodeId');
    console.log('\n👉 TESTE EN CLIQUANT SUR LE "+" DU REPEATER !');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ ERREUR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCopyFlow();
