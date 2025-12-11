/**
 * 🔍 SCRIPT DE TRACAGE - Cherche exactement les IDs problématiques
 * Cherche les deux formules spécifiques mentionnées par l'utilisateur
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`🔍 SCRIPT DE TRACAGE - Cherche les formules spécifiques`);
  console.log(`${'═'.repeat(80)}\n`);

  try {
    // Les IDs des formules mentionnées par l'utilisateur (sans le suffix)
    const formuleIds = [
      'd443f3b4-428a-434e-83ae-e809ca15afd2',
      'af69d29c-a815-460a-a184-c12738d807fe'
    ];

    for (const baseId of formuleIds) {
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`🔎 Traçage de la formule: ${baseId}`);
      console.log(`${'─'.repeat(80)}`);

      // 1. Chercher l'original
      console.log(`\n1️⃣  FORMULE ORIGINALE: ${baseId}`);
      const originalForm = await prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: baseId }
      });

      if (originalForm) {
        console.log(`   ✅ Trouvée`);
        console.log(`      Tokens (premiers 200 chars):`);
        console.log(`      ${JSON.stringify(originalForm.tokens).substring(0, 200)}`);
        
        if (Array.isArray(originalForm.tokens)) {
          const sharedRefs = originalForm.tokens.filter((t: any) =>
            typeof t === 'string' && t.includes('shared-ref')
          );
          console.log(`      Shared-refs: ${sharedRefs.length}`);
          sharedRefs.slice(0, 5).forEach((t: any) => {
            const suffix = /-\d+$/.test(t) ? '✅ suffixé' : '❌ NON-suffixé';
            console.log(`        ${suffix}: ${t}`);
          });
        }
      } else {
        console.log(`   ❌ INTROUVABLE`);
      }

      // 2. Chercher la copie avec suffix -1
      const copiedId = `${baseId}-1`;
      console.log(`\n2️⃣  FORMULE COPIÉE: ${copiedId}`);
      const copiedForm = await prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: copiedId }
      });

      if (copiedForm) {
        console.log(`   ✅ Trouvée`);
        console.log(`      Tokens (premiers 200 chars):`);
        console.log(`      ${JSON.stringify(copiedForm.tokens).substring(0, 200)}`);
        
        if (Array.isArray(copiedForm.tokens)) {
          const sharedRefs = copiedForm.tokens.filter((t: any) =>
            typeof t === 'string' && t.includes('shared-ref')
          );
          console.log(`      Shared-refs: ${sharedRefs.length}`);
          sharedRefs.slice(0, 5).forEach((t: any) => {
            const suffix = /-\d+$/.test(t) ? '✅ suffixé' : '❌ NON-suffixé';
            console.log(`        ${suffix}: ${t}`);
          });
        }
      } else {
        console.log(`   ❌ INTROUVABLE`);
      }

      // 3. Comparer
      if (originalForm && copiedForm) {
        console.log(`\n3️⃣  COMPARAISON:`);
        if (JSON.stringify(originalForm.tokens) === JSON.stringify(copiedForm.tokens)) {
          console.log(`   ❌ PROBLÈME MAJEUR: Les tokens sont IDENTIQUES!`);
          console.log(`      Cela veut dire que la copie n'a pas changé les shared-refs`);
        } else {
          console.log(`   ✅ Les tokens sont différents`);
          
          // Chercher les différences
          const origStr = JSON.stringify(originalForm.tokens);
          const copiedStr = JSON.stringify(copiedForm.tokens);
          
          if (copiedStr.includes('-1') && !origStr.includes('-1')) {
            console.log(`   ✅ La copie CONTIENT des suffixes -1`);
          } else if (!copiedStr.includes('-1') && origStr.includes('-1')) {
            console.log(`   ⚠️  La copie N'a PAS de suffixes -1 mais l'original en a`);
          }
        }
      }

      // 4. Chercher les conditions qui référencent cette formule
      console.log(`\n4️⃣  CONDITIONS RÉFÉRENÇANT CETTE FORMULE:`);
      
      const conditions = await prisma.treeBranchLeafNodeCondition.findMany({
        take: 100
      });
      
      let foundConditions = [];
      for (const cond of conditions) {
        const condStr = JSON.stringify(cond.conditionSet);
        if (condStr.includes(baseId) || condStr.includes(copiedId)) {
          foundConditions.push({ cond, isOriginal: condStr.includes(baseId), isCopied: condStr.includes(copiedId) });
        }
      }
      
      if (foundConditions.length > 0) {
        console.log(`   Trouvé ${foundConditions.length} condition(s)`);
        for (const { cond, isOriginal, isCopied } of foundConditions) {
          console.log(`\n   Condition: ${cond.id}`);
          if (isOriginal) console.log(`      ✏️  Référence l'ORIGINAL: ${baseId}`);
          if (isCopied) console.log(`      ✅ Référence la COPIE: ${copiedId}`);
          
          // Afficher le fragment du conditionSet
          const condStr = JSON.stringify(cond.conditionSet);
          const idx = condStr.indexOf(baseId) !== -1 ? 
            condStr.indexOf(baseId) : condStr.indexOf(copiedId);
          if (idx !== -1) {
            console.log(`      Contexte: ...${condStr.substring(Math.max(0, idx - 50), idx + 100)}...`);
          }
        }
      } else {
        console.log(`   ❌ Aucune condition ne référence cette formule`);
      }
    }

    console.log(`\n${'═'.repeat(80)}`);
    console.log(`🔍 FIN TRACAGE`);
    console.log(`${'═'.repeat(80)}\n`);

  } catch (error) {
    console.error(`❌ Erreur:`, error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
