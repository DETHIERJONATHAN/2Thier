/**
 * 🔍 VÉRIFICATION DU VRAI FLUX
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyRealFlow() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 VÉRIFICATION DU FLUX RÉEL');
  console.log('='.repeat(80) + '\n');

  try {
    // 1. Variable originale
    const originalVar = await prisma.treeBranchLeafNodeVariable.findFirst({
      where: { exposedKey: 'var_965b' }
    });

    console.log('📋 VARIABLE ORIGINALE:');
    console.log(`   exposedKey: ${originalVar.exposedKey}`);
    console.log(`   Variable.id: ${originalVar.id}`);
    console.log(`   Variable.nodeId: ${originalVar.nodeId}`);
    console.log(`   Variable.sourceRef: ${originalVar.sourceRef}`);

    // Extraire l'ID de la formule du sourceRef
    const formulaIdFromSourceRef = originalVar.sourceRef.replace('node-formula:', '');
    console.log(`\n   💡 ID formule extrait du sourceRef: ${formulaIdFromSourceRef}`);

    // 2. Chercher la formule par ID
    const formulaById = await prisma.treeBranchLeafNodeFormula.findUnique({
      where: { id: formulaIdFromSourceRef }
    });

    if (formulaById) {
      console.log(`\n✅ FORMULE TROUVÉE PAR ID:`);
      console.log(`   Formula.id: ${formulaById.id}`);
      console.log(`   Formula.nodeId: ${formulaById.nodeId}`);
      console.log(`   Formula.name: ${formulaById.name}`);
      console.log(`\n   🔗 VÉRIFICATION: Variable.nodeId == Formula.nodeId ?`);
      console.log(`      ${originalVar.nodeId} == ${formulaById.nodeId}`);
      console.log(`      ${originalVar.nodeId === formulaById.nodeId ? '✅ MATCH !' : '❌ PAS DE MATCH'}`);
    } else {
      console.log(`\n❌ FORMULE NON TROUVÉE avec id: ${formulaIdFromSourceRef}`);
    }

    // 3. Variable copiée
    console.log('\n\n' + '='.repeat(80));
    const copiedVar = await prisma.treeBranchLeafNodeVariable.findFirst({
      where: { exposedKey: 'var_965b-1' }
    });

    if (copiedVar) {
      console.log('📋 VARIABLE COPIÉE:');
      console.log(`   exposedKey: ${copiedVar.exposedKey}`);
      console.log(`   Variable.id: ${copiedVar.id}`);
      console.log(`   Variable.nodeId: ${copiedVar.nodeId}`);
      console.log(`   Variable.sourceRef: ${copiedVar.sourceRef}`);

      const copiedFormulaIdFromSourceRef = copiedVar.sourceRef.replace('node-formula:', '');
      console.log(`\n   💡 ID formule extrait du sourceRef: ${copiedFormulaIdFromSourceRef}`);

      // Chercher la formule copiée par ID
      const copiedFormulaById = await prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: copiedFormulaIdFromSourceRef }
      });

      if (copiedFormulaById) {
        console.log(`\n✅ FORMULE COPIÉE TROUVÉE PAR ID:`);
        console.log(`   Formula.id: ${copiedFormulaById.id}`);
        console.log(`   Formula.nodeId: ${copiedFormulaById.nodeId}`);
        console.log(`   Formula.name: ${copiedFormulaById.name}`);
        console.log(`\n   🔗 VÉRIFICATION: Variable.nodeId == Formula.nodeId ?`);
        console.log(`      ${copiedVar.nodeId} == ${copiedFormulaById.nodeId}`);
        console.log(`      ${copiedVar.nodeId === copiedFormulaById.nodeId ? '✅ MATCH !' : '❌ PAS DE MATCH'}`);
      } else {
        console.log(`\n❌ FORMULE COPIÉE NON TROUVÉE avec id: ${copiedFormulaIdFromSourceRef}`);
        
        // Vérifier si l'ID sans suffixe existe
        const idWithoutSuffix = copiedFormulaIdFromSourceRef.replace(/-\d+$/, '');
        console.log(`\n   🔍 Recherche avec ID sans suffixe: ${idWithoutSuffix}`);
        
        const originalFormulaExists = await prisma.treeBranchLeafNodeFormula.findUnique({
          where: { id: idWithoutSuffix }
        });

        if (originalFormulaExists) {
          console.log(`   ✅ FORMULE ORIGINALE EXISTE !`);
          console.log(`      Formula.id: ${originalFormulaExists.id}`);
          console.log(`      Formula.nodeId: ${originalFormulaExists.nodeId}`);
          console.log(`\n   💡 SOLUTION: Copier cette formule avec:`);
          console.log(`      Nouveau Formula.id: ${copiedFormulaIdFromSourceRef}`);
          console.log(`      Nouveau Formula.nodeId: ${copiedVar.nodeId}`);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 CONCLUSION\n');
    console.log('Le sourceRef contient Formula.id (pas Formula.nodeId)');
    console.log('Mais Formula.nodeId doit = Variable.nodeId pour le linking');
    console.log('\nFlux de copie correct:');
    console.log('1. Lire Variable.sourceRef → Extraire Formula.id original');
    console.log('2. Chercher Formule par id (sans suffixe)');
    console.log('3. Copier avec:');
    console.log('   - Nouveau Formula.id = Formula.id original + suffixe');
    console.log('   - Nouveau Formula.nodeId = Variable copiée.nodeId');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ ERREUR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyRealFlow();
