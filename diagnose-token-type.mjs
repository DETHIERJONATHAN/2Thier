/**
 * 🔍 SCRIPT 2 - VÉRIFIER LE TYPE RÉEL DES TOKENS
 * 
 * Les tokens sont-ils réellement des arrays?
 * Ou sont-ils stringify d'une autre façon?
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(`\n${'═'.repeat(90)}`);
  console.log(`🔍 DIAGNOSTIC 2 - QUEL EST LE TYPE RÉEL DES TOKENS?`);
  console.log(`${'═'.repeat(90)}\n`);

  try {
    // Vérifier les DEUX formules problématiques
    const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
      where: {
        id: {
          in: [
            'd443f3b4-428a-434e-83ae-e809ca15afd2',
            'd443f3b4-428a-434e-83ae-e809ca15afd2-1',
            'af69d29c-a815-460a-a184-c12738d807fe',
            'af69d29c-a815-460a-a184-c12738d807fe-1'
          ]
        }
      }
    });

    console.log(`Trouvé ${formulas.length} formules\n`);

    for (const formula of formulas) {
      console.log(`${'─'.repeat(90)}`);
      console.log(`\n📄 FORMULE: ${formula.id}\n`);

      console.log(`   📦 Type du champ tokens: ${typeof formula.tokens}`);
      console.log(`   🔹 Constructor: ${formula.tokens?.constructor?.name || 'N/A'}`);
      console.log(`   🔹 Is Array: ${Array.isArray(formula.tokens)}`);
      console.log(`   🔹 Is String: ${typeof formula.tokens === 'string'}`);
      console.log(`   🔹 Is Object: ${typeof formula.tokens === 'object' && !Array.isArray(formula.tokens)}`);

      // Afficher les RAW données
      console.log(`\n   📋 CONTENU RAW:`);
      if (Array.isArray(formula.tokens)) {
        console.log(`      ✅ C'EST UN ARRAY de ${formula.tokens.length} éléments`);
        console.log(`      Types des 5 premiers éléments:`);
        formula.tokens.slice(0, 5).forEach((t, i) => {
          console.log(`         [${i}] Type: ${typeof t}, Value: ${String(t).substring(0, 50)}`);
        });
      } else if (typeof formula.tokens === 'string') {
        console.log(`      ⚠️  C'EST UNE STRING!`);
        console.log(`      Longueur: ${formula.tokens.length}`);
        console.log(`      Premiers 100 chars: ${formula.tokens.substring(0, 100)}`);
        
        // Essayer de parser
        try {
          const parsed = JSON.parse(formula.tokens);
          console.log(`      ✅ PEUT ÊTRE PARSÉE COMME JSON`);
          console.log(`      Type après parsing: ${typeof parsed}`);
          console.log(`      Is Array: ${Array.isArray(parsed)}`);
          if (Array.isArray(parsed)) {
            console.log(`      Taille du array: ${parsed.length}`);
          }
        } catch (e) {
          console.log(`      ❌ NE PEUT PAS ÊTRE PARSÉE: ${e.message}`);
        }
      } else if (typeof formula.tokens === 'object') {
        console.log(`      📊 C'EST UN OBJET (pas array)`);
        console.log(`      Clés: ${Object.keys(formula.tokens).join(', ')}`);
      }

      // Chercher les shared-refs
      console.log(`\n   🔍 SEARCH shared-refs:`);
      const tokensStr = JSON.stringify(formula.tokens);
      const sharedRefMatches = tokensStr.match(/@value\.shared-ref-[A-Za-z0-9_-]+/g) || [];
      
      console.log(`      Trouvé: ${sharedRefMatches.length} shared-refs`);
      if (sharedRefMatches.length > 0) {
        // Compter suffixés vs non-suffixés
        const withSuffix = sharedRefMatches.filter(s => /-\d+$/.test(s));
        const withoutSuffix = sharedRefMatches.filter(s => !/-\d+$/.test(s));
        
        console.log(`      ✅ Avec suffix (-N): ${withSuffix.length}`);
        console.log(`      ❌ Sans suffix: ${withoutSuffix.length}`);
        
        if (withoutSuffix.length > 0) {
          console.log(`\n      Exemples NON-suffixés:`);
          withoutSuffix.slice(0, 3).forEach((s, i) => {
            console.log(`         [${i}] ${s}`);
          });
        }
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
