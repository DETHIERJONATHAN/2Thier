/**
 * update-mensuel-economie-indexation.cjs
 * 
 * Ajoute une indexation de 3% à la formule "Mensuel - Economie"
 * 
 * Formule AVANT : ( Autoconsommation + Vente Kwh ) / 12
 * Formule APRÈS : ( ( Autoconsommation + Vente Kwh ) / 12 ) * 1.03
 * 
 * L'indexation de 3% reflète l'augmentation annuelle du prix de l'électricité.
 */
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

const FORMULA_ID = '86d4bf2b-f43b-485b-92e4-b610e61d1fcd';
const NODE_ID = '9a398318-1a29-443d-a0b2-c05b4ae8c918';

// Anciens tokens : ( Autoconsommation + Vente ) / 12
const OLD_TOKENS = [
  "(", 
  "@calculated.6cad7c21-b222-4648-bc91-65fb6d4fa54f", 
  "+", 
  "@calculated.676d2211-6663-48b5-a888-b8a3c6b85a73", 
  ")", 
  "/", 
  "12"
];

// Nouveaux tokens : ( ( Autoconsommation + Vente ) / 12 ) * 1.03
const NEW_TOKENS = [
  "(", 
  "(", 
  "@calculated.6cad7c21-b222-4648-bc91-65fb6d4fa54f", 
  "+", 
  "@calculated.676d2211-6663-48b5-a888-b8a3c6b85a73", 
  ")", 
  "/", 
  "12", 
  ")", 
  "*", 
  "1.03"
];

async function main() {
  console.log('=== MISE À JOUR FORMULE "Mensuel - Economie" ===\n');
  console.log('Ajout indexation 3% (prix électricité)\n');

  // 1. Vérifier l'état actuel
  const formula = await db.treeBranchLeafNodeFormula.findUnique({
    where: { id: FORMULA_ID },
    select: { id: true, name: true, tokens: true, nodeId: true }
  });

  if (!formula) {
    console.error('❌ Formule non trouvée avec ID:', FORMULA_ID);
    process.exit(1);
  }

  console.log('📋 Formule trouvée:', formula.name);
  console.log('   Node ID:', formula.nodeId);
  console.log('   Tokens actuels:', JSON.stringify(formula.tokens));

  // Vérifier que les tokens correspondent à ce qu'on attend
  const currentTokens = Array.isArray(formula.tokens) ? formula.tokens : [];
  const tokensMatch = JSON.stringify(currentTokens) === JSON.stringify(OLD_TOKENS);
  
  if (!tokensMatch) {
    // Vérifier si l'indexation est déjà appliquée
    const alreadyIndexed = JSON.stringify(currentTokens) === JSON.stringify(NEW_TOKENS);
    if (alreadyIndexed) {
      console.log('\n✅ L\'indexation de 3% est DÉJÀ appliquée. Rien à faire.');
      return;
    }
    console.warn('\n⚠️  Les tokens actuels ne correspondent pas exactement aux tokens attendus.');
    console.warn('   Attendu:', JSON.stringify(OLD_TOKENS));
    console.warn('   Actuel:', JSON.stringify(currentTokens));
    console.warn('\n   Application de l\'indexation sur les tokens actuels...');
    
    // Wrapper les tokens actuels avec ( ... ) * 1.03
    const wrappedTokens = ["(", ...currentTokens, ")", "*", "1.03"];
    
    const updated = await db.treeBranchLeafNodeFormula.update({
      where: { id: FORMULA_ID },
      data: { 
        tokens: wrappedTokens,
        description: 'Mensuel Economie avec indexation 3% prix électricité'
      }
    });
    
    console.log('\n✅ Formule mise à jour avec wrapper !');
    console.log('   Nouveaux tokens:', JSON.stringify(updated.tokens));
    return;
  }

  // 2. Appliquer la mise à jour
  console.log('\n🔄 Application de l\'indexation 3%...');
  
  const updated = await db.treeBranchLeafNodeFormula.update({
    where: { id: FORMULA_ID },
    data: { 
      tokens: NEW_TOKENS,
      description: 'Mensuel Economie avec indexation 3% prix électricité'
    }
  });

  console.log('\n✅ Formule mise à jour avec succès !');
  console.log('   Nouveaux tokens:', JSON.stringify(updated.tokens));

  // 3. Vérification
  console.log('\n=== VÉRIFICATION ===');
  const node = await db.treeBranchLeafNode.findUnique({
    where: { id: NODE_ID },
    select: { id: true, label: true, hasFormula: true }
  });
  console.log(`   Node: ${node?.label} | hasFormula: ${node?.hasFormula}`);
  
  const check = await db.treeBranchLeafNodeFormula.findUnique({
    where: { id: FORMULA_ID },
    select: { name: true, tokens: true }
  });
  console.log(`   Formule: ${check.name}`);
  console.log(`   Tokens: ${JSON.stringify(check.tokens)}`);
  console.log('\n📊 Formule lisible:');
  console.log('   AVANT : ( Autoconsommation + Vente Kwh ) / 12');
  console.log('   APRÈS : ( ( Autoconsommation + Vente Kwh ) / 12 ) × 1.03');
  console.log('\n🎯 L\'indexation de 3% est maintenant prise en compte pour le prix de l\'électricité.');
}

main()
  .catch(async (e) => {
    console.error('❌ ERREUR:', e);
    await db.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
