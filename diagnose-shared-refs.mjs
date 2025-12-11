import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

console.log('🔍 DIAGNOSTIC SHARED-REFS\n');

// Chercher la formule copiée af69d29c...-1 (COS)
const cosFormula = await prisma.treeBranchLeafNodeFormula.findUnique({
  where: { id: 'af69d29c-a815-460a-a184-c12738d807fe-1' }
});

console.log('📌 Formule COS COPIÉE: af69d29c-a815-460a-a184-c12738d807fe-1');
if (cosFormula && Array.isArray(cosFormula.tokens)) {
  const shared = cosFormula.tokens.filter(t => typeof t === 'string' && t.includes('shared-ref'));
  console.log(`   Tokens shared-ref trouvés: ${shared.length}`);
  shared.forEach(s => console.log(`     - ${s}`));

  // Extraire les IDs
  console.log('\n   Chercher les shared-refs en BD:\n');
  for (const token of shared) {
    // Format: @value.shared-ref-1764930447619-77tj9-1
    const match = token.match(/@value\.shared-ref-([a-zA-Z0-9\-]+)/);
    if (match) {
      const refId = match[1];
      console.log(`   Cherchant ID: "${refId}"`);
      
      // Chercher dans TreeBranchLeafSharedRef
      const sharedRef = await prisma.treeBranchLeafSharedRef.findUnique({
        where: { id: refId }
      });
      
      if (sharedRef) {
        console.log(`      ✅ TROUVÉ! Name: "${sharedRef.name}"`);
      } else {
        console.log(`      ❌ NON TROUVÉ en BD!`);
        
        // Chercher la version SANS le suffixe -1
        const idWithoutSuffix = refId.replace(/-1$/, '');
        console.log(`      Essayer sans suffix (-1): "${idWithoutSuffix}"`);
        
        const sharedRefNoSuffix = await prisma.treeBranchLeafSharedRef.findUnique({
          where: { id: idWithoutSuffix }
        });
        
        if (sharedRefNoSuffix) {
          console.log(`      ✅ TROUVÉ (SANS SUFFIX)! Name: "${sharedRefNoSuffix.name}"`);
          console.log(`      ⚠️ PROBLÈME: Le shared-ref n'a PAS été copié/suffixé!`);
        } else {
          console.log(`      ❌ TOUJOURS PAS TROUVÉ même sans suffix`);
        }
      }
    }
    console.log();
  }
}

// Maintenant vérifier la formule RACINE
console.log('\n\n📌 Formule RACINE COPIÉE: d443f3b4-428a-434e-83ae-e809ca15afd2-1');
const racineFormula = await prisma.treeBranchLeafNodeFormula.findUnique({
  where: { id: 'd443f3b4-428a-434e-83ae-e809ca15afd2-1' }
});

if (racineFormula && Array.isArray(racineFormula.tokens)) {
  const shared = racineFormula.tokens.filter(t => typeof t === 'string' && t.includes('shared-ref'));
  console.log(`   Tokens shared-ref trouvés: ${shared.length}`);
  shared.slice(0, 3).forEach(s => console.log(`     - ${s}`));
  if (shared.length > 3) console.log(`     ... et ${shared.length - 3} autres`);

  console.log('\n   Vérifier les 3 premiers shared-refs:\n');
  for (let i = 0; i < Math.min(3, shared.length); i++) {
    const token = shared[i];
    const match = token.match(/@value\.shared-ref-([a-zA-Z0-9\-]+)/);
    if (match) {
      const refId = match[1];
      console.log(`   Cherchant ID: "${refId}"`);
      
      const sharedRef = await prisma.treeBranchLeafSharedRef.findUnique({
        where: { id: refId }
      });
      
      if (sharedRef) {
        console.log(`      ✅ TROUVÉ! Name: "${sharedRef.name}"`);
      } else {
        console.log(`      ❌ NON TROUVÉ!`);
        
        // Chercher sans suffix
        const idWithoutSuffix = refId.replace(/-1$/, '');
        const sharedRefNoSuffix = await prisma.treeBranchLeafSharedRef.findUnique({
          where: { id: idWithoutSuffix }
        });
        
        if (sharedRefNoSuffix) {
          console.log(`      ✅ TROUVÉ (SANS SUFFIX): "${sharedRefNoSuffix.name}"`);
          console.log(`      ⚠️ PROBLÈME: Shared-ref pas copié/suffixé`);
        }
      }
    }
    console.log();
  }
}

await prisma.$disconnect();
