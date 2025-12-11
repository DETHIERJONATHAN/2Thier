import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: [],
});

async function main() {
  console.log('🔍 DIAGNOSTIC SHARED-REFS\n');

  // Récupérer la formule COS copiée
  const cosFormula = await prisma.treeBranchLeafNodeFormula.findUnique({
    where: { id: 'af69d29c-a815-460a-a184-c12738d807fe-1' }
  });

  if (!cosFormula) {
    console.log('❌ Formule COS copiée non trouvée');
    return;
  }

  console.log('📌 Formule COS COPIÉE: af69d29c-a815-460a-a184-c12738d807fe-1');
  
  const tokens = cosFormula.tokens || [];
  const sharedTokens = tokens.filter(t => typeof t === 'string' && t.includes('shared-ref'));
  
  console.log(`   Tokens trouvés: ${sharedTokens.length}`);
  sharedTokens.forEach(t => {
    console.log(`     - ${t}`);
    
    // Extraire l'ID
    const match = t.match(/@value\.shared-ref-([a-zA-Z0-9\-]+)/);
    if (match) {
      const refId = match[1];
      console.log(`       Cherchant shared-ref: "${refId}"`);
    }
  });

  // Chercher les shared-refs
  console.log('\n✅ Chercher les shared-refs EN BD:\n');
  
  // Chercher par pattern
  const allSharedRefs = await prisma.treeBranchLeafSharedRef.findMany({
    where: {
      id: {
        contains: '1764930447619'
      }
    },
    take: 20
  });

  console.log(`   Shared-refs contenant "1764930447619": ${allSharedRefs.length}`);
  allSharedRefs.forEach(ref => {
    console.log(`     - ID: ${ref.id}`);
    console.log(`       Name: ${ref.name}`);
  });

  console.log('\n   Chercher les versions AVEC suffixe -1:');
  const suffixed = allSharedRefs.filter(r => r.id.endsWith('-1'));
  console.log(`   Suffixés: ${suffixed.length}`);
  suffixed.forEach(ref => console.log(`     - ${ref.id}`));

  console.log('\n   Chercher les versions SANS suffixe:');
  const notSuffixed = allSharedRefs.filter(r => !r.id.endsWith('-1'));
  console.log(`   Sans suffixe: ${notSuffixed.length}`);
  notSuffixed.forEach(ref => console.log(`     - ${ref.id}`));

  if (suffixed.length === 0 && notSuffixed.length > 0) {
    console.log('\n⚠️ PROBLÈME: Les shared-refs n\'ont PAS été copiés/suffixés!');
    console.log('   Les tokens ont le suffixe -1, mais les shared-refs eux-mêmes n\'existent pas.');
  } else if (suffixed.length > 0) {
    console.log('\n✅ OK: Les shared-refs ont été suffixés correctement');
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
