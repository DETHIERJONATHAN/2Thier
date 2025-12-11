/**
 * 🔍 ENQUÊTE - D'OÙ VIENNENT LES FORMULES?
 * 
 * Cette script cherche EXACTEMENT où et quand les formules ont été créées
 * en regardant les timestamps et en remontant la chaîne d'appels.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(`\n${'═'.repeat(100)}\n`);
  console.log(`🔍 ENQUÊTE - D'OÙ VIENNENT LES FORMULES?\n`);

  try {
    // Les deux formules problématiques
    const problematicIds = [
      'd443f3b4-428a-434e-83ae-e809ca15afd2-1',
      'af69d29c-a815-460a-a184-c12738d807fe-1'
    ];

    for (const formulaId of problematicIds) {
      const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: formulaId }
      });

      if (!formula) {
        console.log(`❌ Formule non trouvée: ${formulaId}\n`);
        continue;
      }

      console.log(`\n${'─'.repeat(100)}\n`);
      console.log(`📄 ${formulaId}\n`);
      console.log(`   Créée le: ${formula.createdAt.toLocaleString()}`);
      console.log(`   Modifiée le: ${formula.updatedAt.toLocaleString()}`);
      console.log(`   Nœud propriétaire: ${formula.nodeId}`);
      console.log(`   Nœud infos: ${formula.node?.name || formula.node?.label || 'N/A'}`);

      // Chercher la formule ORIGINALE (sans suffixe)
      const originalId = formulaId.replace(/-\d+$/, '');
      const original = await prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: originalId }
      });

      if (original) {
        console.log(`\n   Formule ORIGINALE trouvée: ${originalId}`);
        console.log(`   - Créée le: ${original.createdAt.toLocaleString()}`);
        console.log(`   - Tokens identiques? ${JSON.stringify(formula.tokens) === JSON.stringify(original.tokens) ? '✅ OUI' : '❌ NON'}`);
      } else {
        console.log(`\n   ⚠️ Formule ORIGINALE (${originalId}) non trouvée!`);
      }

      // Chercher une condition qui référence cette formule (non-suffixée)
      const conditions = await prisma.treeBranchLeafNodeConditionSet.findMany({
        where: {
          linkedFormulaIds: {
            hasSome: [originalId]
          }
        },
        take: 5
      });

      if (conditions.length > 0) {
        console.log(`\n   Conditions qui la référencent: ${conditions.length}`);
        conditions.forEach(cond => {
          console.log(`   - ${cond.id}`);
          console.log(`     Créée: ${cond.createdAt.toLocaleString()}`);
          console.log(`     Modifiée: ${cond.updatedAt.toLocaleString()}`);
        });
      }

      // Chercher une condition SUFFIXÉE (copie) qui référence la formule SUFFIXÉE
      const suffixedConditions = await prisma.treeBranchLeafNodeConditionSet.findMany({
        where: {
          linkedFormulaIds: {
            hasSome: [formulaId]
          }
        },
        take: 5
      });

      if (suffixedConditions.length > 0) {
        console.log(`\n   Conditions SUFFIXÉES qui la référencent: ${suffixedConditions.length}`);
        suffixedConditions.forEach(cond => {
          console.log(`   - ${cond.id}`);
          console.log(`     Créée: ${cond.createdAt.toLocaleString()}`);
        });
      }

      // 🔥 POINT CRITIQUE - Chercher les conditions copiées au même moment
      const recentConditions = await prisma.treeBranchLeafNodeConditionSet.findMany({
        where: {
          createdAt: {
            gte: new Date(formula.createdAt.getTime() - 5000),
            lte: new Date(formula.createdAt.getTime() + 5000)
          }
        },
        take: 10
      });

      if (recentConditions.length > 0) {
        console.log(`\n   🔥 Conditions créées AU MÊME MOMENT (±5s): ${recentConditions.length}`);
        recentConditions.forEach(cond => {
          console.log(`   - ${cond.id}`);
          console.log(`     Formules liées: ${cond.linkedFormulaIds.join(', ')}`);
        });
      }
    }

    console.log(`\n${'═'.repeat(100)}\n`);
    console.log(`🎯 CONCLUSION:\n`);
    console.log(`Cherche à identifier le code path qui crée ces formules.`);
    console.log(`Regarde les timestamps pour déduire qui a appelé le `.create()`\n`);

  } catch (error) {
    console.error(`\n❌ ERREUR:`, error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
