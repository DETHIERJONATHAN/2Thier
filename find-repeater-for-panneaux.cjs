const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const panneauxMaxId = '3da47bc3-739e-4c83-98c3-813ecf77a740';
  
  // Trouver tous les nodes qui ont des templateNodeIds (ce sont les repeaters)
  const allNodes = await prisma.treeBranchLeafNode.findMany({
    select: {
      id: true,
      label: true,
      type: true,
      repeater_templateNodeIds: true
    }
  });

  // Filtrer les repeaters actifs
  const repeaters = allNodes.filter(n => 
    n.type === 'repeater' && n.repeater_templateNodeIds && n.repeater_templateNodeIds.length > 0
  );

  console.log('=== REPEATERS TROUVÉS ===');
  console.log(`Nombre total: ${repeaters.length}`);

  for (const rep of repeaters) {
    console.log(`\n📁 ${rep.label} (${rep.id})`);
    console.log(`   Templates (${rep.repeater_templateNodeIds.length}): ${rep.repeater_templateNodeIds.slice(0, 3).join(', ')}...`);
    
    if (rep.repeater_templateNodeIds.includes(panneauxMaxId)) {
      console.log('   ⭐ CONTIENT PANNEAUX MAX!');
    }
  }

  // Rechercher quel repeater contient Panneaux max
  const repeaterWithPanneaux = repeaters.find(r => 
    r.repeater_templateNodeIds.includes(panneauxMaxId)
  );

  console.log('\n\n=== REPEATER CONTENANT PANNEAUX MAX ===');
  if (repeaterWithPanneaux) {
    console.log(`Trouvé: ${repeaterWithPanneaux.label} (${repeaterWithPanneaux.id})`);
    console.log(`Templates: ${JSON.stringify(repeaterWithPanneaux.repeater_templateNodeIds, null, 2)}`);
  } else {
    console.log('⚠️ PANNEAUX MAX N\'EST PAS DANS LES TEMPLATES D\'UN REPEATER!');
    
    // Regarder l'arbre parent
    const panneauxMax = await prisma.treeBranchLeafNode.findUnique({
      where: { id: panneauxMaxId },
      select: { id: true, label: true, parentId: true }
    });
    console.log(`\nPanneaux max: ${JSON.stringify(panneauxMax)}`);
    
    if (panneauxMax?.parentId) {
      const parent = await prisma.treeBranchLeafNode.findUnique({
        where: { id: panneauxMax.parentId },
        select: { id: true, label: true, parentId: true, type: true, repeater_templateNodeIds: true }
      });
      console.log(`Parent: ${JSON.stringify(parent, null, 2)}`);
      
      if (parent?.parentId) {
        const grandParent = await prisma.treeBranchLeafNode.findUnique({
          where: { id: parent.parentId },
          select: { id: true, label: true, type: true, repeater_templateNodeIds: true }
        });
        console.log(`Grand-parent: ${JSON.stringify(grandParent, null, 2)}`);
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
