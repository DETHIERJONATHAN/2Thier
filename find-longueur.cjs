const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Chercher tous les champs Longueur
  const nodes = await prisma.treeBranchLeafNode.findMany({
    where: { label: { contains: 'Longueur' } },
    select: { id: true, label: true, value: true, calculatedValue: true }
  });
  
  console.log('=== TOUS LES CHAMPS LONGUEUR ===\n');
  for (const n of nodes) {
    console.log(`${n.label}:`);
    console.log(`  id: ${n.id}`);
    console.log(`  value: ${n.value}`);
    console.log(`  calculatedValue: ${n.calculatedValue}\n`);
  }
  
  // L'ID utilisé dans la formule
  const formulaRef = '6844ea47-db3d-4479-9e4e-ad207f7924e4-1';
  console.log('\n=== CHAMP RÉFÉRENCÉ PAR LA FORMULE ===');
  console.log(`ID dans formule: ${formulaRef}`);
  
  const node = await prisma.treeBranchLeafNode.findUnique({
    where: { id: formulaRef },
    select: { id: true, label: true, value: true, calculatedValue: true }
  });
  
  if (node) {
    console.log(`TROUVÉ: ${node.label}`);
    console.log(`  value: ${node.value}`);
    console.log(`  calculatedValue: ${node.calculatedValue}`);
  } else {
    console.log('❌ CHAMP INTROUVABLE!');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
