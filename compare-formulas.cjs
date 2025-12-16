const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== COMPARAISON FORMULE ORIGINALE VS COPIE ===\n');
  
  // Formule originale
  const original = await prisma.treeBranchLeafNodeFormula.findUnique({
    where: { id: '60c3283b-7587-4766-a81c-1c115dc279b6' }
  });
  
  console.log('FORMULE ORIGINALE (MAX paysage):');
  console.log('tokens:', original?.tokens);
  
  // Formule copiée  
  const copy = await prisma.treeBranchLeafNodeFormula.findUnique({
    where: { id: '60c3283b-7587-4766-a81c-1c115dc279b6-1' }
  });
  
  console.log('\nFORMULE COPIÉE (MAX paysage-1):');
  console.log('tokens:', copy?.tokens);

  // Identifier les références dans les tokens originaux
  console.log('\n\n=== ANALYSE DES RÉFÉRENCES ===');
  
  if (original?.tokens) {
    for (const token of original.tokens) {
      if (typeof token === 'string' && token.startsWith('@')) {
        const match = token.match(/@(\w+)\.([a-f0-9-]+)/);
        if (match) {
          const [, type, id] = match;
          const node = await prisma.treeBranchLeafNode.findUnique({
            where: { id },
            select: { id: true, label: true, calculatedValue: true, value: true }
          });
          console.log(`\n${token}:`);
          console.log(`  → ${node?.label || 'INTROUVABLE'}`);
          console.log(`  → calculatedValue: ${node?.calculatedValue}`);
          console.log(`  → value: ${node?.value}`);
        }
      }
    }
  }
  
  console.log('\n\n=== ANALYSE RÉFÉRENCES COPIÉES ===');
  
  if (copy?.tokens) {
    for (const token of copy.tokens) {
      if (typeof token === 'string' && token.startsWith('@')) {
        const match = token.match(/@(\w+)\.([a-f0-9-]+)/);
        if (match) {
          const [, type, id] = match;
          const node = await prisma.treeBranchLeafNode.findUnique({
            where: { id },
            select: { id: true, label: true, calculatedValue: true, value: true }
          });
          console.log(`\n${token}:`);
          console.log(`  → ${node?.label || 'INTROUVABLE'}`);
          console.log(`  → calculatedValue: ${node?.calculatedValue}`);
          console.log(`  → value: ${node?.value}`);
        }
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
