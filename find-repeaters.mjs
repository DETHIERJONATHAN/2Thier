import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Chercher tous les repeaters avec leur configuration
const repeaters = await prisma.treeBranchLeafNode.findMany({
  where: {
    OR: [
      { type: 'leaf_repeater' },
      { fieldType: 'repeater' },
      { label: { contains: 'ersant', mode: 'insensitive' } }, // Versant
      { label: { contains: 'mur', mode: 'insensitive' } }
    ]
  },
  select: {
    id: true,
    label: true,
    type: true,
    fieldType: true,
    repeater_countSourceNodeId: true,
    repeater_templateNodeIds: true,
    repeater_minItems: true,
    repeater_maxItems: true
  },
  take: 30
});

console.log('=== REPEATERS ET NŒUDS LIÉS ===');
for (const r of repeaters) {
  console.log('\n---');
  console.log('Label:', r.label);
  console.log('ID:', r.id);
  console.log('Type:', r.type);
  console.log('fieldType:', r.fieldType);
  console.log('countSourceNodeId:', r.repeater_countSourceNodeId);
  console.log('templateNodeIds:', r.repeater_templateNodeIds);
  console.log('minItems:', r.repeater_minItems);
  console.log('maxItems:', r.repeater_maxItems);
}

// Trouver le repeater Versant
const versantRepeater = repeaters.find(r => r.label?.toLowerCase().includes('versant'));
if (versantRepeater) {
  console.log('\n\n=== REPEATER VERSANT TROUVÉ ===');
  console.log('ID:', versantRepeater.id);
  console.log('countSourceNodeId:', versantRepeater.repeater_countSourceNodeId);
  
  // Si countSourceNodeId existe, trouver ce champ
  if (versantRepeater.repeater_countSourceNodeId) {
    const sourceField = await prisma.treeBranchLeafNode.findUnique({
      where: { id: versantRepeater.repeater_countSourceNodeId },
      select: {
        id: true,
        label: true,
        fieldType: true,
        number_min: true,
        number_max: true,
        number_defaultValue: true
      }
    });
    console.log('\n=== CHAMP SOURCE POUR VERSANT ===');
    console.log(JSON.stringify(sourceField, null, 2));
  }
}

await prisma.$disconnect();
