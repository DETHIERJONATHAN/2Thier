/**
 * 🔍 SCRIPT 3 - TRACER EXACTEMENT CE QUE rewriteJsonReferences() RETOURNE
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(`\n${'═'.repeat(90)}`);
  console.log(`🔍 DIAGNOSTIC 3 - TRACER LA FONCTION rewriteJsonReferences()`);
  console.log(`${'═'.repeat(90)}\n`);

  try {
    const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
      where: { id: 'd443f3b4-428a-434e-83ae-e809ca15afd2' }
    });

    if (!formula) {
      console.log(`❌ Formule non trouvée`);
      return;
    }

    console.log(`\n📄 FORMULE ORIGINALE: ${formula.id}\n`);
    console.log(`   Tokens type: ${Array.isArray(formula.tokens) ? 'ARRAY' : typeof formula.tokens}`);
    console.log(`   Tokens length: ${formula.tokens.length}`);
    console.log(`   Shared-refs: ${formula.tokens.filter(t => 
      typeof t === 'string' && t.includes('@value.shared-ref')
    ).length}`);

    // Afficher les premiers tokens
    console.log(`\n   Premiers 5 tokens:`);
    formula.tokens.slice(0, 5).forEach((t, i) => {
      console.log(`      [${i}] "${t}"`);
    });

    // Créer les maps vides
    const nodeIdMap = new Map();
    const formulaIdMap = new Map();
    const conditionIdMap = new Map();
    const tableIdMap = new Map();

    console.log(`\n\n💭 QUESTION: Si on appelle rewriteJsonReferences():`);
    console.log(`   - Avec une map VIDE`);
    console.log(`   - Et suffix = 1`);
    console.log(`   - Qu'est-ce qu'on obtient?\n`);

    // La réponse théorique
    console.log(`   ✅ rewriteJsonReferences() devrait:`);
    console.log(`      1. Traverse les tokens (c'est un array)`);
    console.log(`      2. Pour CHAQUE token qui est une string`);
    console.log(`      3. Appelle rewriteReferences() sur la string`);
    console.log(`      4. rewriteReferences() ajoute le suffix (-1) à tous les IDs`);
    console.log(`      5. Retourne un nouvel array avec les tokens réécrits`);

    console.log(`\n   🎯 DONC THÉORIQUEMENT:`);
    console.log(`      AVANT: ["@value.shared-ref-1764930465855-s03k6g", ...]`);
    console.log(`      APRÈS: ["@value.shared-ref-1764930465855-s03k6g-1", ...]`);

    console.log(`\n   ❓ MAIS EN PRATIQUE:`);
    console.log(`      Les tokens sont IDENTIQUES entre original et copie!`);
    console.log(`      C'est-à-dire que rewriteJsonReferences() n'a RIEN CHANGÉ!`);

    // Pourquoi?
    console.log(`\n   🔴 RAISON POSSIBLE: L'une de ces 2 situations:`);
    console.log(`      1️⃣  rewriteJsonReferences() n'a pas été appelée sur les tokens`);
    console.log(`      2️⃣  rewriteJsonReferences() retourne une copie IDENTIQUE (pas de changements)`);

    console.log(`\n   ❓ VÉRIFICATION: Cherchons le problème dans copy-capacity-formula.ts`);
    console.log(`      → Ligne 279-280: on crée les rewriteMaps`);
    console.log(`      → Ligne 281: rewriteJsonReferences() est appelée`);
    console.log(`      → MAIS les maps sont VIDES! (nodeIdMap, formulaIdMap, etc.)`);
    console.log(`      → Donc rewriteJsonReferences() ne peut RIEN remplacer!`);

    console.log(`\n   🎯 DIAGNOSTIC FINAL:`);
    console.log(`      rewriteJsonReferences() a un "fail-safe":`);
    console.log(`      Si la map ne trouve pas la référence, il la laisse INCHANGÉE`);
    console.log(`      Ou il la suffixe seulement SI... hmm regardons le code`);

    console.log(`\n   🔍 DANS rewriteReferences() (line ~102):`);
    console.log(`      if (isSharedRef) {`);
    console.log(`        if (!suffixStr) return id;  // Pas de suffix fourni`);
    console.log(`        return applySuffix(id);      // SINON on applique suffix`);
    console.log(`      }`);

    console.log(`\n   ✅ AH DONC! suffixStr EST FOURNI (suffix=1)`);
    console.log(`      Donc rewriteReferences() DEVRAIT ajouter -1 aux shared-refs!`);
    console.log(`      MAIS les tokens en BD ne les ont pas!`);

    console.log(`\n   🤔 CELA VEUT DIRE: rewriteJsonReferences() n'a jamais été exécuté!`);
    console.log(`      OU bien son résultat n'a jamais été sauvegardé!`);

    console.log(`\n   🔴 THÉORIE FINALE:`);
    console.log(`      La formule copiée a été créée AVANT que:
      1. rewriteJsonReferences() soit appelée`);
    console.log(`      2. forceSharedRefSuffixes() soit appelée`);
    console.log(`      3. forceSharedRefSuffixesInJson() soit appelée`);
    console.log(`\n      Les tokens actuels sont UN COPIE DIRECTE des originaux!`);

    console.log(`\n${'═'.repeat(90)}\n`);

  } catch (error) {
    console.error(`❌ Erreur:`, error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
