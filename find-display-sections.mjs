import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

console.log('\n==================== ANALYSE SECTIONS & DISPLAY FIELDS ====================\n');

// 1️⃣ TROUVER LES SECTIONS
console.log('1️⃣ SECTIONS créées (enfants des templates):');

const templates = await p.treeBranchLeafNode.findMany({
  where: {
    OR: [
      { label: { contains: 'Rampant' } },
      { label: { contains: 'toiture' } },
      { label: { contains: 'Mesure' } },
    ]
  },
  select: {
    id: true,
    label: true,
  },
  take: 20
});

console.log(`Trouvé ${templates.length} templates\n`);

// 2️⃣ POUR CHAQUE TEMPLATE, TROUVER SES SECTIONS
for (const template of templates) {
  const sections = await p.treeBranchLeafNode.findMany({
    where: {
      parentId: template.id,
      type: 'section'
    },
    select: {
      id: true,
      label: true,
      type: true,
      order: true,
    }
  });

  if (sections.length > 0) {
    console.log(`\n✅ Template "${template.label}": ${sections.length} sections`);
    
    for (const section of sections) {
      // 3️⃣ POUR CHAQUE SECTION, COMPTER SES ENFANTS leaf_field (= display fields)
      const displayFields = await p.treeBranchLeafNode.findMany({
        where: {
          parentId: section.id,
          type: 'leaf_field'
        },
        select: {
          id: true,
          label: true,
          linkedVariableIds: true,
        }
      });

      console.log(`\n   Section "${section.label}": ${displayFields.length} display fields`);
      displayFields.forEach(f => {
        const varCount = f.linkedVariableIds?.length || 0;
        console.log(`      - "${f.label}" (linkedVars: ${varCount})`);
      });
    }
  } else {
    console.log(`\n❌ Template "${template.label}": 0 sections`);
  }
}

// 4️⃣ RÉSUMÉ GLOBAL
console.log('\n\n4️⃣ RÉSUMÉ GLOBAL:');

const allSections = await p.treeBranchLeafNode.findMany({
  where: { type: 'section' },
  select: { id: true, label: true, parentId: true }
});

console.log(`Total sections: ${allSections.length}`);

const allDisplayFields = await p.treeBranchLeafNode.findMany({
  where: {
    type: 'leaf_field',
    parent: {
      is: { type: 'section' }
    }
  },
  select: { id: true, label: true, parentId: true, linkedVariableIds: true }
});

console.log(`Total display fields (leaf_field enfants de section): ${allDisplayFields.length}`);

const fieldsWithVars = allDisplayFields.filter(f => f.linkedVariableIds?.length > 0);
console.log(`Avec linkedVariableIds: ${fieldsWithVars.length}`);

// 5️⃣ PATTERN: Quel section a des fields, quel section n'en a pas?
console.log('\n5️⃣ PAR SECTION:');
const bySection = {};
allDisplayFields.forEach(f => {
  if (!bySection[f.parentId]) {
    bySection[f.parentId] = [];
  }
  bySection[f.parentId].push(f);
});

Object.entries(bySection).forEach(([sectionId, fields]) => {
  const section = allSections.find(s => s.id === sectionId);
  const sectionLabel = section?.label || sectionId.substring(0, 8);
  console.log(`   "${sectionLabel}": ${fields.length} fields`);
});

console.log('\n✅ Analyse complète!\n');

await p.$disconnect();
