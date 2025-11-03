/**
 * 🔍 ANALYSE DU LINKING RÉEL Variable.nodeId ↔ Capacity.nodeId
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeRealLinking() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 ANALYSE DU LINKING Variable.nodeId ↔ Capacity.nodeId');
  console.log('='.repeat(80) + '\n');

  try {
    // 1. Trouver des variables avec formules
    console.log('📋 SECTION 1: Variables avec FORMULES\n');
    
    const varsWithFormula = await prisma.treeBranchLeafNodeVariable.findMany({
      where: {
        sourceRef: {
          startsWith: 'node-formula:'
        }
      },
      take: 5
    });

    console.log(`Trouvé ${varsWithFormula.length} variables avec formules\n`);

    for (const v of varsWithFormula) {
      console.log(`Variable: ${v.exposedKey}`);
      console.log(`  Variable.nodeId: ${v.nodeId}`);
      console.log(`  Variable.sourceRef: ${v.sourceRef}`);
      
      // Chercher la formule avec LE MÊME nodeId
      const formula = await prisma.treeBranchLeafNodeFormula.findFirst({
        where: { nodeId: v.nodeId }
      });

      if (formula) {
        console.log(`  ✅ FORMULE TROUVÉE avec Formula.nodeId = Variable.nodeId`);
        console.log(`     Formula.id: ${formula.id}`);
        console.log(`     Formula.nodeId: ${formula.nodeId}`);
        console.log(`     Formula.name: ${formula.name}`);
      } else {
        console.log(`  ❌ AUCUNE FORMULE avec Formula.nodeId = "${v.nodeId}"`);
      }
      console.log('');
    }

    // 2. Variables COPIÉES (avec -1)
    console.log('\n' + '='.repeat(80));
    console.log('📋 SECTION 2: Variables COPIÉES (avec suffixe -1)\n');
    
    const copiedVars = await prisma.treeBranchLeafNodeVariable.findMany({
      where: {
        exposedKey: {
          endsWith: '-1'
        },
        sourceRef: {
          startsWith: 'node-formula:'
        }
      },
      take: 5
    });

    console.log(`Trouvé ${copiedVars.length} variables copiées avec formules\n`);

    for (const v of copiedVars) {
      console.log(`Variable copiée: ${v.exposedKey}`);
      console.log(`  Variable.nodeId: ${v.nodeId}`);
      console.log(`  Variable.sourceRef: ${v.sourceRef}`);
      
      // Chercher la formule copiée avec LE MÊME nodeId
      const formula = await prisma.treeBranchLeafNodeFormula.findFirst({
        where: { nodeId: v.nodeId }
      });

      if (formula) {
        console.log(`  ✅ FORMULE COPIÉE TROUVÉE !`);
        console.log(`     Formula.id: ${formula.id}`);
        console.log(`     Formula.nodeId: ${formula.nodeId}`);
        console.log(`     Formula.name: ${formula.name}`);
      } else {
        console.log(`  ❌ FORMULE COPIÉE MANQUANTE !`);
        console.log(`     Devrait chercher: Formula.nodeId = "${v.nodeId}"`);
        
        // Vérifier si une formule existe avec ce nodeId sans le suffixe
        const originalNodeId = v.nodeId.replace(/-\d+$/, '');
        const originalFormula = await prisma.treeBranchLeafNodeFormula.findFirst({
          where: { nodeId: originalNodeId }
        });
        
        if (originalFormula) {
          console.log(`     ℹ️  Formule ORIGINALE trouvée:`);
          console.log(`        Original.nodeId: ${originalFormula.nodeId}`);
          console.log(`        Original.name: ${originalFormula.name}`);
          console.log(`        💡 Il faut copier cette formule avec nodeId = "${v.nodeId}"`);
        }
      }
      console.log('');
    }

    // 3. RÉSUMÉ
    console.log('\n' + '='.repeat(80));
    console.log('📊 RÉSUMÉ ET DIAGNOSTIC\n');

    const totalVars = await prisma.treeBranchLeafNodeVariable.count({
      where: { sourceRef: { startsWith: 'node-formula:' } }
    });

    const varsWithMatchingFormula = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM "TreeBranchLeafNodeVariable" v
      INNER JOIN "TreeBranchLeafNodeFormula" f ON f."nodeId" = v."nodeId"
      WHERE v."sourceRef" LIKE 'node-formula:%'
    `;

    const matched = Number(varsWithMatchingFormula[0].count);
    const unmatched = totalVars - matched;

    console.log(`Total variables avec formules: ${totalVars}`);
    console.log(`Variables avec formule linkée (nodeId match): ${matched} ✅`);
    console.log(`Variables SANS formule linkée: ${unmatched} ❌`);

    if (unmatched > 0) {
      console.log('\n⚠️  PROBLÈME DÉTECTÉ !');
      console.log('Certaines variables ont un sourceRef "node-formula:XXX"');
      console.log('mais AUCUNE formule n\'a le même Variable.nodeId');
      console.log('\n💡 SOLUTION:');
      console.log('Lors de la copie, il faut:');
      console.log('1. Copier la variable avec nouveau nodeId (ex: "abc-123-1")');
      console.log('2. Trouver la formule originale avec Formula.nodeId = Variable.nodeId (sans suffixe)');
      console.log('3. Copier la formule avec Formula.nodeId = nouveau Variable.nodeId');
    } else {
      console.log('\n✅ Tous les linkages sont corrects !');
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('\n❌ ERREUR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeRealLinking();
