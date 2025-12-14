import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

console.log('\n==================== DIAGNOSTIC: LINKEDVARIABLEIDS vs VARIABLES EXISTANTES ====================\n');

// 1️⃣ Chercher les 7 templates du repeat
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
    linkedVariableIds: true,
  },
  take: 20
});

console.log(`Trouvé ${templates.length} templates\n`);

// 2️⃣ Pour chaque template, vérifier linkedVariableIds
for (const template of templates) {
  const linkedVarIds = template.linkedVariableIds || [];
  
  if (linkedVarIds.length === 0) {
    console.log(`❌ "${template.label}": aucun linkedVariableIds`);
    continue;
  }

  console.log(`\n📋 "${template.label}":`);
  console.log(`   linkedVariableIds dans le champ: ${linkedVarIds.length} items`);
  
  for (const varId of linkedVarIds) {
    // Chercher si cette variable existe en BD
    const exists = await p.treeBranchLeafNodeVariable.findUnique({
      where: { nodeId: varId },
      select: { id: true, nodeId: true, displayName: true }
    });

    if (exists) {
      console.log(`   ✅ ${varId}: EXISTE (displayName: ${exists.displayName})`);
    } else {
      console.log(`   ❌ ${varId}: N'EXISTE PAS (ORPHELIN!)`);
    }
  }
}

// 3️⃣ Vérifier les variables copiées (-1, -2, etc)
console.log('\n\n3️⃣ CHERCHER LES VARIABLES COPIÉES (avec suffixes -1, -2):');

const copiedVars = await p.treeBranchLeafNodeVariable.findMany({
  where: {
    nodeId: {
      contains: '-1'
    }
  },
  select: {
    nodeId: true,
    displayName: true,
  },
  take: 50
});

console.log(`Trouvé ${copiedVars.length} variables avec suffix -1 ou similaire\n`);
copiedVars.slice(0, 10).forEach(v => {
  console.log(`   - ${v.nodeId}: ${v.displayName}`);
});

console.log('\n✅ Diagnostic terminé!\n');

await p.$disconnect();
