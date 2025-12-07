import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const REPEATER_ID = 'e6474654-9c34-41d8-9cf5-1cce00bcfe6c';

console.log('\n✅ VALIDATION FINALE DU SETUP\n');
console.log('='.repeat(80));

const repeater = await prisma.treeBranchLeafNode.findUnique({
  where: { id: REPEATER_ID },
  select: { metadata: true }
});

const templateIds = repeater.metadata?.repeater?.templateNodeIds || [];
const displayIds = repeater.metadata?.repeater?.displayNodeIds || [];

console.log(`\n📦 Configuration:`);
console.log(`   Template nodes: ${templateIds.length}`);
console.log(`   Display nodes: ${displayIds.length}\n`);

let fieldCount = 0;
let sectionCount = 0;
let missingCount = 0;

console.log('📋 Template nodes:\n');
for (let i = 0; i < templateIds.length; i++) {
  const node = await prisma.treeBranchLeafNode.findUnique({
    where: { id: templateIds[i] },
    select: { label: true, type: true }
  });

  if (!node) {
    console.log(`   ${i + 1}. ❌ INTROUVABLE: ${templateIds[i]}`);
    missingCount++;
  } else {
    const isSection = node.type === 'section';
    const icon = isSection ? '📁' : '📄';
    const warning = isSection ? ' ⚠️ SERA IGNORÉE' : '';
    
    if (isSection) sectionCount++;
    else fieldCount++;
    
    console.log(`   ${i + 1}. ${icon} ${node.label}${warning}`);
  }
}

console.log(`\n🎨 Display nodes:\n`);
for (const nodeId of displayIds) {
  const node = await prisma.treeBranchLeafNode.findUnique({
    where: { id: nodeId },
    select: { label: true }
  });
  const inTemplate = templateIds.includes(nodeId);
  console.log(`   ${inTemplate ? '✅' : '⚠️'} ${node?.label || nodeId} ${!inTemplate ? '(PAS DANS TEMPLATE)' : ''}`);
}

console.log(`\n📊 Résumé:`);
console.log(`   - Champs à dupliquer: ${fieldCount}`);
console.log(`   - Sections à ignorer: ${sectionCount}`);
console.log(`   - Display nodes: ${displayIds.length}`);
console.log(`   - Nœuds manquants: ${missingCount}`);

// Vérifier les copies existantes
console.log(`\n🔍 Copies existantes:\n`);

let copyCount = 0;
for (const templateId of templateIds) {
  const template = await prisma.treeBranchLeafNode.findUnique({
    where: { id: templateId },
    select: { label: true }
  });

  if (!template) continue;

  const copies = await prisma.treeBranchLeafNode.findMany({
    where: {
      id: { not: templateId },
      label: { startsWith: template.label + '-' }
    }
  });

  if (copies.length > 0) {
    console.log(`   ⚠️ ${template.label}: ${copies.length} copie(s)`);
    copies.forEach(c => console.log(`      - ${c.label}`));
    copyCount += copies.length;
  }
}

if (copyCount === 0) {
  console.log(`   ✅ Aucune copie (base propre)`);
}

console.log(`\n📝 État:`);
if (missingCount === 0 && copyCount === 0 && fieldCount === 9 && sectionCount === 1) {
  console.log(`   ✅ TOUT EST PRÊT POUR LE TEST !`);
  console.log(`\n🧪 Actions attendues lors du prochain clic sur "+":`);
  console.log(`   - ✅ ${fieldCount} champs seront dupliqués avec suffixe -1`);
  console.log(`   - ❌ ${sectionCount} section sera ignorée (pas dupliquée)`);
  console.log(`   - 🎨 ${displayIds.length} display nodes seront affichés en haut`);
} else {
  console.log(`   ⚠️ PROBLÈMES DÉTECTÉS:`);
  if (missingCount > 0) console.log(`      - ${missingCount} nœud(s) introuvable(s) dans le template`);
  if (copyCount > 0) console.log(`      - ${copyCount} copie(s) existante(s) à nettoyer`);
  if (fieldCount !== 9) console.log(`      - Nombre de champs incorrect (${fieldCount} au lieu de 9)`);
  if (sectionCount !== 1) console.log(`      - Nombre de sections incorrect (${sectionCount} au lieu de 1)`);
}

console.log('\n' + '='.repeat(80));

await prisma.$disconnect();
