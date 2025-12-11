/**
 * 🔗 SCRIPT 1 - TRACER LA CHAÎNE COMPLÈTE DE DÉPENDANCE
 * 
 * Condition → Formules → Tokens
 * 
 * Montre EXACTEMENT où le problème se manifeste
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(`\n${'═'.repeat(90)}`);
  console.log(`🔗 DIAGNOSTIC 1 - TRACER LA CHAÎNE: Condition → Formules → Tokens`);
  console.log(`${'═'.repeat(90)}\n`);

  try {
    // Trouver la condition problématique
    const problematicCond = await prisma.treeBranchLeafNodeCondition.findUnique({
      where: { id: 'b0e9def0-ab4d-4e28-9cba-1c0632bf646e-1' }
    });

    if (!problematicCond) {
      console.log(`❌ Condition non trouvée`);
      return;
    }

    console.log(`\n📋 CONDITION COPIÉE (-1):`);
    console.log(`   ID: ${problematicCond.id}`);
    console.log(`   conditionSet: ${JSON.stringify(problematicCond.conditionSet).substring(0, 100)}...`);

    // Extraire les IDs de formules du conditionSet
    const condStr = JSON.stringify(problematicCond.conditionSet);
    const formulaIdRegex = /node-formula:([a-f0-9-]+(?:-\d+)?)/gi;
    const formulaIds = new Set();
    let match;
    while ((match = formulaIdRegex.exec(condStr)) !== null) {
      formulaIds.add(match[1]);
    }

    console.log(`\n   📌 Formules référencées dans le conditionSet:`);
    if (formulaIds.size === 0) {
      console.log(`      ❌ Aucune formule trouvée!`);
    } else {
      Array.from(formulaIds).forEach((fId, i) => {
        const isCopied = /-\d+$/.test(fId);
        console.log(`      [${i}] ${fId} ${isCopied ? '✅ COPIÉE (-suffix)' : '❌ ORIGINALE (pas de suffix)'}`);
      });
    }

    // Pour chaque formule référencée, charger ses tokens
    console.log(`\n   🔍 TOKENS DE CHAQUE FORMULE:`);
    for (const formulaId of formulaIds) {
      const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: formulaId }
      });

      if (!formula) {
        console.log(`      ❌ Formule ${formulaId} NON TROUVÉE EN BD`);
        continue;
      }

      console.log(`\n      📄 ${formulaId}:`);
      if (Array.isArray(formula.tokens)) {
        const sharedRefs = formula.tokens.filter(t => 
          typeof t === 'string' && t.includes('@value.shared-ref')
        );
        console.log(`         Tokens: ${formula.tokens.length} tokens`);
        console.log(`         Shared-refs: ${sharedRefs.length}`);
        
        if (sharedRefs.length > 0) {
          sharedRefs.slice(0, 3).forEach((sr, i) => {
            const isSuffixed = /-\d+$/.test(sr);
            console.log(`            [${i}] ${sr} ${isSuffixed ? '✅ SUFFIXÉ' : '❌ NON-SUFFIXÉ'}`);
          });
          if (sharedRefs.length > 3) {
            console.log(`            ... +${sharedRefs.length - 3} de plus`);
          }
        }
      }
    }

    // Maintenant montrer l'ORIGINALE de la condition
    console.log(`\n\n${'─'.repeat(90)}`);
    console.log(`\n📋 CONDITION ORIGINALE (sans -1):`);
    const originalCondId = 'b0e9def0-ab4d-4e28-9cba-1c0632bf646e';
    const originalCond = await prisma.treeBranchLeafNodeCondition.findUnique({
      where: { id: originalCondId }
    });

    if (originalCond) {
      const origStr = JSON.stringify(originalCond.conditionSet);
      const origFormulaRegex = /node-formula:([a-f0-9-]+(?:-\d+)?)/gi;
      const origFormulaIds = new Set();
      let origMatch;
      while ((origMatch = origFormulaRegex.exec(origStr)) !== null) {
        origFormulaIds.add(origMatch[1]);
      }

      console.log(`   ID: ${originalCond.id}`);
      console.log(`   📌 Formules référencées:`);
      Array.from(origFormulaIds).forEach((fId, i) => {
        const isCopied = /-\d+$/.test(fId);
        console.log(`      [${i}] ${fId} ${isCopied ? '✅ COPIÉE' : '❌ ORIGINALE'}`);
      });

      console.log(`\n   🔍 TOKENS DE CHAQUE FORMULE:`);
      for (const formulaId of origFormulaIds) {
        const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
          where: { id: formulaId }
        });

        if (formula && Array.isArray(formula.tokens)) {
          const sharedRefs = formula.tokens.filter(t => 
            typeof t === 'string' && t.includes('@value.shared-ref')
          );
          console.log(`\n      📄 ${formulaId}:`);
          console.log(`         Tokens: ${formula.tokens.length}`);
          console.log(`         Shared-refs: ${sharedRefs.length}`);
          
          if (sharedRefs.length > 0) {
            sharedRefs.slice(0, 3).forEach((sr, i) => {
              const isSuffixed = /-\d+$/.test(sr);
              console.log(`            [${i}] ${sr} ${isSuffixed ? '✅ SUFFIXÉ' : '❌ NON-SUFFIXÉ'}`);
            });
          }
        }
      }
    }

    // DIAGNOSTIC FINAL
    console.log(`\n\n${'═'.repeat(90)}`);
    console.log(`\n🎯 DIAGNOSTIC FINAL:\n`);

    if (problematicCond && originalCond) {
      const copiedStr = JSON.stringify(problematicCond.conditionSet);
      const origStr = JSON.stringify(originalCond.conditionSet);

      // Comparer les références
      const copiedRefs = copiedStr.match(/node-formula:([a-f0-9-]+(?:-\d+)?)/gi) || [];
      const origRefs = origStr.match(/node-formula:([a-f0-9-]+(?:-\d+)?)/gi) || [];

      console.log(`   ORIGINALE → ${origRefs.length} références de formules`);
      console.log(`   COPIÉE    → ${copiedRefs.length} références de formules\n`);

      // Vérifier les correspondances
      const origFormulaSet = new Set(origRefs.map(r => r.replace('node-formula:', '')));
      const copiedFormulaSet = new Set(copiedRefs.map(r => r.replace('node-formula:', '')));

      const hasSuffixInCopied = Array.from(copiedFormulaSet).some(id => /-\d+$/.test(id));
      const hasSuffixInOrig = Array.from(origFormulaSet).some(id => /-\d+$/.test(id));

      console.log(`   FORMULES ORIGINALES:  ${hasSuffixInOrig ? '✅ ONT DES SUFFIXES' : '❌ PAS DE SUFFIXES'}`);
      console.log(`   FORMULES COPIÉES:     ${hasSuffixInCopied ? '✅ ONT DES SUFFIXES' : '❌ PAS DE SUFFIXES'}`);

      if (!hasSuffixInCopied) {
        console.log(`\n   ⚠️  PROBLÈME DÉTECTÉ:`);
        console.log(`   Les formules de la condition COPIÉE N'ONT PAS de suffixes!`);
        console.log(`   → Cela veut dire que le remplacement des références a ÉCHOUÉ`);
        console.log(`   → OU que le remplacement n'a jamais été exécuté`);
      }
    }

    console.log(`\n${'═'.repeat(90)}\n`);

  } catch (error) {
    console.error(`❌ Erreur:`, error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
