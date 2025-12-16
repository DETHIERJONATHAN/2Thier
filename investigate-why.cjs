const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== POURQUOI PANNEAUX MAX ORIGINAL = 1 ET COPIE = 0 ? ===\n');

  // Panneaux max ORIGINAL
  const original = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '3da47bc3-739e-4c83-98c3-813ecf77a740' },
    select: { 
      id: true, label: true, calculatedValue: true, value: true,
      hasFormula: true, formula_activeId: true,
      hasCondition: true, condition_activeId: true
    }
  });

  console.log('PANNEAUX MAX ORIGINAL:');
  console.log(JSON.stringify(original, null, 2));

  // Panneaux max COPIE
  const copy = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '3da47bc3-739e-4c83-98c3-813ecf77a740-1' },
    select: { 
      id: true, label: true, calculatedValue: true, value: true,
      hasFormula: true, formula_activeId: true,
      hasCondition: true, condition_activeId: true
    }
  });

  console.log('\nPANNEAUX MAX-1 COPIE:');
  console.log(JSON.stringify(copy, null, 2));

  // Vérifier les sources de l'ORIGINAL
  console.log('\n\n=== SOURCES FORMULE ORIGINALE ===');
  
  const sourcesOriginal = [
    { id: '6817ee20-5782-4b03-a7b1-0687cc5b4d58', name: 'Rampant toiture (original)' },
    { id: '6844ea47-db3d-4479-9e4e-ad207f7924e4', name: 'Longueur (original)' },
  ];

  for (const s of sourcesOriginal) {
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: s.id },
      select: { id: true, label: true, calculatedValue: true, value: true }
    });
    console.log(`\n${s.name}:`);
    console.log(`  label: ${node?.label}`);
    console.log(`  calculatedValue: ${node?.calculatedValue}`);
    console.log(`  value: ${node?.value}`);
  }

  // Vérifier les sources de la COPIE  
  console.log('\n\n=== SOURCES FORMULE COPIÉE ===');
  
  const sourcesCopy = [
    { id: '6817ee20-5782-4b03-a7b1-0687cc5b4d58-1', name: 'Rampant toiture-1 (copie)' },
    { id: '6844ea47-db3d-4479-9e4e-ad207f7924e4-1', name: 'Longueur-1 (copie)' },
  ];

  for (const s of sourcesCopy) {
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: s.id },
      select: { id: true, label: true, calculatedValue: true, value: true }
    });
    console.log(`\n${s.name}:`);
    console.log(`  label: ${node?.label}`);
    console.log(`  calculatedValue: ${node?.calculatedValue}`);
    console.log(`  value: ${node?.value}`);
  }

  // QUESTION CRITIQUE: D'où vient le "1" de Panneaux max original ?
  // Si Rampant = 0 et Longueur = null, la formule devrait retourner 0 !
  console.log('\n\n=== ANALYSE CRITIQUE ===');
  console.log('Si Rampant original = 0 et Longueur original = null');
  console.log('La formule ENT((0-0.3)/table) * ENT((null-0.3)/table) devrait = 0 ou NaN');
  console.log('MAIS Panneaux max original affiche 1.00 ???');
  console.log('\nHYPOTHÈSE: La valeur 1.00 est une valeur EN CACHE / ANCIENNE');
  console.log('qui n\'a pas été recalculée depuis que les sources ont été vidées.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
