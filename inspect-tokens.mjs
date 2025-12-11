/**
 * 🔍 INSPECTER LES TOKENS RÉELS EN BD
 * Montre EXACTEMENT le format, type, et structure des tokens
 */

import { PrismaClient } from '@prisma/client';
import util from 'util';

const prisma = new PrismaClient();

async function main() {
  console.log(`\n${'═'.repeat(100)}\n`);
  console.log(`🔍 INSPECTION DES TOKENS RÉELS EN BD\n`);

  try {
    const formulas = [
      'd443f3b4-428a-434e-83ae-e809ca15afd2',
      'af69d29c-a815-460a-a184-c12738d807fe'
    ];

    for (const formulaId of formulas) {
      const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: formulaId }
      });

      if (!formula) {
        console.log(`⚠️  Formule non trouvée: ${formulaId}\n`);
        continue;
      }

      console.log(`\n📄 ${formulaId}\n`);

      // Afficher le VRAI type
      console.log(`Type du champ tokens: ${typeof formula.tokens}`);
      console.log(`Est Array: ${Array.isArray(formula.tokens)}`);
      console.log(`JSON.stringify:\n${JSON.stringify(formula.tokens, null, 2)}\n`);

      // Inspecter chaque élément
      if (Array.isArray(formula.tokens)) {
        console.log(`Nombre de tokens: ${formula.tokens.length}\n`);

        const sharedRefTokens = formula.tokens.filter((t, idx) => {
          const isString = typeof t === 'string';
          const includesRef = String(t).includes('shared-ref');
          if (includesRef) {
            console.log(`  [${idx}] Type: ${typeof t}, Value: "${t}"`);
          }
          return includesRef;
        });

        console.log(`\n✅ Total avec 'shared-ref': ${sharedRefTokens.length}`);
      }

      console.log(`\n${'─'.repeat(100)}`);
    }

  } catch (error) {
    console.error(`❌ ERREUR:`, error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
