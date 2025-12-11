/**
 * ✅ SCRIPT 4 - TRACER L'EXÉCUTION COMPLÈTE DE copyFormulaCapacity
 * 
 * Ce script simule EXACTEMENT ce que copyFormulaCapacity() fait
 * Il affiche chaque étape pour montrer EXACTEMENT où ça casse
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

// 🔧 Importer les fonctions depuis le serveur
const { forceSharedRefSuffixes, forceSharedRefSuffixesInJson, rewriteJsonReferences } = await (async () => {
  try {
    // Essayer charger depuis la source compilée
    const module = await import('./src/api-server/routes/universal-reference-rewriter.ts');
    return module;
  } catch {
    console.log(`⚠️  Impossible d'importer les fonctions - utilisation de versions mock`);
    
    // Versions mock des fonctions
    return {
      forceSharedRefSuffixes: (tokens, suffix) => {
        if (!Array.isArray(tokens)) return tokens;
        return tokens.map(t => {
          if (typeof t === 'string' && t.includes('@value.shared-ref')) {
            const match = t.match(/^(@value\.shared-ref-[^-]+)(?:-\d+)?$/);
            if (match) {
              return `${match[1]}-${suffix}`;
            }
          }
          return t;
        });
      },
      forceSharedRefSuffixesInJson: (obj, suffix) => {
        return JSON.parse(
          JSON.stringify(obj).replace(
            /(@value\.shared-ref-[^-"]+)(?!-\d)(?=["\]},\s])/g,
            `$1-${suffix}`
          )
        );
      },
      rewriteJsonReferences: (obj) => {
        return obj;
      }
    };
  }
})();

async function main() {
  console.log(`\n${'═'.repeat(100)}`);
  console.log(`🔍 SCRIPT 4 - TRACER L'EXÉCUTION COMPLÈTE`);
  console.log(`${'═'.repeat(100)}\n`);

  try {
    // Formules problématiques à tester
    const testFormulaIds = [
      'd443f3b4-428a-434e-83ae-e809ca15afd2',
      'af69d29c-a815-460a-a184-c12738d807fe'
    ];

    for (const originalId of testFormulaIds) {
      console.log(`\n${'─'.repeat(100)}`);
      console.log(`\n🔬 TEST FORMULE: ${originalId}\n`);

      // ÉTAPE 1: Charger la formule originale
      console.log(`📖 ÉTAPE 1: Charger la formule originale...`);
      const original = await prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: originalId }
      });

      if (!original) {
        console.log(`   ⚠️  Formule non trouvée`);
        continue;
      }

      console.log(`   ✅ Trouvée`);
      console.log(`      - ID: ${original.id}`);
      console.log(`      - Tokens count: ${Array.isArray(original.tokens) ? original.tokens.length : 'NOT AN ARRAY'}`);

      // Compter les shared-refs originaux
      const originalSharedRefs = Array.isArray(original.tokens) 
        ? original.tokens.filter(t => typeof t === 'string' && t.includes('@value.shared-ref'))
        : [];
      const originalNonSuffixed = originalSharedRefs.filter(s => !/-\d+$/.test(s));

      console.log(`      - Shared-refs non-suffixés: ${originalNonSuffixed.length}`);
      if (originalNonSuffixed.length > 0) {
        console.log(`        Exemples: ${originalNonSuffixed.slice(0, 2).map(s => `"${s}"`).join(', ')}`);
      }

      // ÉTAPE 2: Préparer la copie
      console.log(`\n✂️  ÉTAPE 2: Préparer la copie (suffix = "-1")...`);
      const suffix = '-1';
      let rewrittenTokens = original.tokens;

      console.log(`   - Avant: ${Array.isArray(rewrittenTokens) ? rewrittenTokens.length : '?'} tokens`);

      // ÉTAPE 3: rewriteJsonReferences
      console.log(`\n🔄 ÉTAPE 3: rewriteJsonReferences()...`);
      rewrittenTokens = rewriteJsonReferences(rewrittenTokens);
      const afterRewrite = Array.isArray(rewrittenTokens)
        ? rewrittenTokens.filter(t => typeof t === 'string' && t.includes('@value.shared-ref')).length
        : 0;
      console.log(`   - Shared-refs après rewriteJsonReferences: ${afterRewrite}`);

      // ÉTAPE 4: forceSharedRefSuffixes (sur l'array tokens directement)
      console.log(`\n⚡ ÉTAPE 4: forceSharedRefSuffixes()...`);
      if (Array.isArray(rewrittenTokens)) {
        rewrittenTokens = forceSharedRefSuffixes(rewrittenTokens, suffix.replace('-', ''));
      }
      const afterForce1 = Array.isArray(rewrittenTokens)
        ? rewrittenTokens.filter(t => typeof t === 'string' && t.includes('@value.shared-ref')).length
        : 0;
      const afterForce1Suffixed = Array.isArray(rewrittenTokens)
        ? rewrittenTokens.filter(t => typeof t === 'string' && t.includes('@value.shared-ref') && /-1$/.test(t)).length
        : 0;
      console.log(`   - Total shared-refs: ${afterForce1}`);
      console.log(`   - Avec suffix "-1": ${afterForce1Suffixed}`);

      // ÉTAPE 5: forceSharedRefSuffixesInJson (sur tout l'objet)
      console.log(`\n🔀 ÉTAPE 5: forceSharedRefSuffixesInJson()...`);
      rewrittenTokens = forceSharedRefSuffixesInJson(rewrittenTokens, suffix.replace('-', ''));
      const afterForce2 = Array.isArray(rewrittenTokens)
        ? rewrittenTokens.filter(t => typeof t === 'string' && t.includes('@value.shared-ref')).length
        : 0;
      const afterForce2Suffixed = Array.isArray(rewrittenTokens)
        ? rewrittenTokens.filter(t => typeof t === 'string' && t.includes('@value.shared-ref') && /-1$/.test(t)).length
        : 0;
      console.log(`   - Total shared-refs: ${afterForce2}`);
      console.log(`   - Avec suffix "-1": ${afterForce2Suffixed}`);

      // ÉTAPE 6: Créer la formule copiée
      console.log(`\n💾 ÉTAPE 6: Créer la formule en BD...`);
      const testFormulaCopy = await prisma.treeBranchLeafNodeFormula.create({
        data: {
          id: `${originalId}-test-trace-${Date.now()}`,
          name: `TEST-TRACE-${originalId}`,
          tokens: rewrittenTokens,
          organizationId: original.organizationId,
          conditionSetId: original.conditionSetId,
          nodeId: original.nodeId,
          createdBy: original.createdBy,
          updatedBy: original.updatedBy
        }
      });
      console.log(`   ✅ Créée: ${testFormulaCopy.id}`);

      // ÉTAPE 7: Relire de la BD
      console.log(`\n📖 ÉTAPE 7: Relire de la BD...`);
      const readBack = await prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: testFormulaCopy.id }
      });

      const readBackSharedRefs = Array.isArray(readBack.tokens)
        ? readBack.tokens.filter(t => typeof t === 'string' && t.includes('@value.shared-ref'))
        : [];
      const readBackSuffixed = readBackSharedRefs.filter(s => /-1$/.test(s));

      console.log(`   - Shared-refs en BD: ${readBackSharedRefs.length}`);
      console.log(`   - Avec suffix "-1": ${readBackSuffixed.length}`);

      if (readBackSuffixed.length === readBackSharedRefs.length) {
        console.log(`\n   🎉 SUCCÈS! Tous les shared-refs sont suffixés!`);
      } else {
        console.log(`\n   ❌ PROBLÈME! ${readBackSharedRefs.length - readBackSuffixed.length} non-suffixés`);
        if (readBackSharedRefs.length > 0) {
          console.log(`      Exemples: ${readBackSharedRefs.slice(0, 2).map(s => `"${s}"`).join(', ')}`);
        }
      }

      // Nettoyer
      await prisma.treeBranchLeafNodeFormula.delete({
        where: { id: testFormulaCopy.id }
      });
    }

    console.log(`\n${'═'.repeat(100)}\n`);
    console.log(`✅ Test complet! Regarde les résultats ci-dessus.\n`);

  } catch (error) {
    console.error(`\n❌ ERREUR:`, error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
