import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Comparer les deux champs en détail
const pentId = 'a5877005-d182-4544-ab23-5529908d42f9'; // Combien de pents
const murId = 'bba85c12-f64f-47f9-ae88-06ff3be3cec4';  // Combien de mur

const pent = await prisma.treeBranchLeafNode.findUnique({
  where: { id: pentId }
});

const mur = await prisma.treeBranchLeafNode.findUnique({
  where: { id: murId }
});

console.log('=== COMPARAISON DES DEUX CHAMPS ===\n');

console.log('📌 COMBIEN DE PENTS:');
console.log('   ID:', pent?.id);
console.log('   fieldType:', pent?.fieldType);
console.log('   subType:', pent?.subType);
console.log('   number_min:', pent?.number_min);
console.log('   number_max:', pent?.number_max);
console.log('   number_defaultValue:', pent?.number_defaultValue);
console.log('   number_step:', pent?.number_step);
console.log('   isRequired:', pent?.isRequired);

console.log('\n📌 COMBIEN DE MUR:');
console.log('   ID:', mur?.id);
console.log('   fieldType:', mur?.fieldType);
console.log('   subType:', mur?.subType);
console.log('   number_min:', mur?.number_min);
console.log('   number_max:', mur?.number_max);
console.log('   number_defaultValue:', mur?.number_defaultValue);
console.log('   number_step:', mur?.number_step);
console.log('   isRequired:', mur?.isRequired);

// Vérifier les repeaters qui les utilisent
const toitRepeater = await prisma.treeBranchLeafNode.findFirst({
  where: { repeater_countSourceNodeId: pentId }
});

const murRepeater = await prisma.treeBranchLeafNode.findFirst({
  where: { repeater_countSourceNodeId: murId }
});

console.log('\n=== REPEATERS LIÉS ===');
console.log('\n📦 Repeater pour "Combien de pents":');
if (toitRepeater) {
  console.log('   ID:', toitRepeater.id);
  console.log('   Label:', toitRepeater.label);
  console.log('   repeater_minItems:', toitRepeater.repeater_minItems);
  console.log('   repeater_maxItems:', toitRepeater.repeater_maxItems);
} else {
  console.log('   ❌ AUCUN REPEATER TROUVÉ!');
}

console.log('\n📦 Repeater pour "Combien de mur":');
if (murRepeater) {
  console.log('   ID:', murRepeater.id);
  console.log('   Label:', murRepeater.label);
  console.log('   repeater_minItems:', murRepeater.repeater_minItems);
  console.log('   repeater_maxItems:', murRepeater.repeater_maxItems);
} else {
  console.log('   ❌ AUCUN REPEATER TROUVÉ!');
}

await prisma.$disconnect();
