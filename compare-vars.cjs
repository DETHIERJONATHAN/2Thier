const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function compare() {
  console.log('\n=== COMPARAISON DES VARIABLES ===\n');

  // Toutes les variables avec Rampant, Longueur ou inclinaison
  const vars = await p.treeBranchLeafNodeVariable.findMany({
    where: {
      OR: [
        { displayName: { contains: 'Rampant', mode: 'insensitive' } },
        { displayName: { contains: 'Longueur', mode: 'insensitive' } },
        { displayName: { contains: 'inclinaison', mode: 'insensitive' } }
      ]
    }
  });

  for (const v of vars) {
    console.log(`\n📌 Variable: "${v.displayName}"`);
    console.log(`   ID: ${v.id}`);
    console.log(`   nodeId: ${v.nodeId}`);
    console.log(`   sourceRef: ${v.sourceRef}`);
    console.log(`   sourceType: ${v.sourceType}`);
    
    // Vérifier si le nœud existe
    if (v.nodeId) {
      const node = await p.treeBranchLeafNode.findUnique({
        where: { id: v.nodeId },
        select: { id: true, label: true, type: true, parentId: true }
      });
      if (node) {
        console.log(`   ✅ Nœud trouvé: "${node.label}" (${node.type})`);
        
        // Vérifier le parent
        if (node.parentId) {
          const parent = await p.treeBranchLeafNode.findUnique({
            where: { id: node.parentId },
            select: { id: true, label: true, type: true }
          });
          console.log(`   📂 Parent: "${parent?.label}" (${parent?.type})`);
        }
      } else {
        console.log(`   ❌ Nœud introuvable!`);
      }
    }
  }

  // Vérifier les nœuds -1 (copies)
  console.log('\n\n=== NŒUDS COPIES (-1) ===\n');
  const copies = await p.treeBranchLeafNode.findMany({
    where: {
      id: { endsWith: '-1' },
      OR: [
        { label: { contains: 'Rampant', mode: 'insensitive' } },
        { label: { contains: 'Longueur', mode: 'insensitive' } },
        { label: { contains: 'inclinaison', mode: 'insensitive' } }
      ]
    },
    select: { id: true, label: true, type: true, parentId: true }
  });

  for (const c of copies) {
    console.log(`📋 ${c.label} (${c.id})`);
    
    // Vérifier si une variable existe pour cette copie
    const varForCopy = await p.treeBranchLeafNodeVariable.findFirst({
      where: { nodeId: c.id }
    });
    if (varForCopy) {
      console.log(`   ✅ Variable liée: ${varForCopy.id}`);
    } else {
      console.log(`   ❌ PAS de variable liée`);
    }
  }

  await p.$disconnect();
}

compare().catch(e => { console.error(e); process.exit(1); });
