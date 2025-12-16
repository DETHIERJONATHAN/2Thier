const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const panneauxMaxId = '3da47bc3-739e-4c83-98c3-813ecf77a740';
  
  // Chercher Panneaux max et Panneaux max-1
  const [panneauxMax, panneauxMax1] = await Promise.all([
    prisma.treeBranchLeafNode.findUnique({
      where: { id: panneauxMaxId },
      select: {
        id: true,
        label: true,
        parentId: true,
        type: true,
        hasTable: true,
        linkedTableIds: true
      }
    }),
    prisma.treeBranchLeafNode.findUnique({
      where: { id: panneauxMaxId + '-1' },
      select: {
        id: true,
        label: true,
        parentId: true,
        type: true,
        hasTable: true,
        linkedTableIds: true
      }
    })
  ]);

  console.log('=== PANNEAUX MAX (Original) ===');
  console.log(JSON.stringify(panneauxMax, null, 2));
  
  console.log('\n=== PANNEAUX MAX-1 (Copie) ===');
  console.log(JSON.stringify(panneauxMax1, null, 2));

  // Trouver le parent de Panneaux max-1
  if (panneauxMax1?.parentId) {
    const parent1 = await prisma.treeBranchLeafNode.findUnique({
      where: { id: panneauxMax1.parentId },
      select: {
        id: true,
        label: true,
        type: true,
        subType: true,
        repeater_templateNodeIds: true
      }
    });
    console.log('\n=== PARENT DE PANNEAUX MAX-1 ===');
    console.log(JSON.stringify(parent1, null, 2));
    
    // Chercher le "Répéteur" parent
    if (parent1?.parentId) {
      const grandParent1 = await prisma.treeBranchLeafNode.findUnique({
        where: { id: parent1.parentId },
        select: {
          id: true,
          label: true,
          type: true,
          subType: true,
          repeater_templateNodeIds: true
        }
      });
      console.log('\n=== GRAND-PARENT DE PANNEAUX MAX-1 ===');
      console.log(JSON.stringify(grandParent1, null, 2));
    }
  }

  // Chercher le section parent avec templates
  const sectionsWithTemplates = await prisma.treeBranchLeafNode.findMany({
    where: {
      type: 'section'
    },
    select: {
      id: true,
      label: true,
      subType: true,
      repeater_templateNodeIds: true
    }
  });

  const repeaterSections = sectionsWithTemplates.filter(s => 
    s.repeater_templateNodeIds && 
    typeof s.repeater_templateNodeIds === 'string' &&
    s.repeater_templateNodeIds.includes(panneauxMaxId)
  );

  console.log('\n=== SECTIONS AVEC PANNEAUX MAX DANS TEMPLATES ===');
  if (repeaterSections.length > 0) {
    repeaterSections.forEach(s => {
      console.log(`${s.label} (${s.id}) subType=${s.subType}`);
      console.log(`Templates: ${s.repeater_templateNodeIds}`);
    });
  } else {
    // Peut-être que le format est JSON array
    const allSections = sectionsWithTemplates.filter(s => s.repeater_templateNodeIds);
    console.log(`Sections avec templates: ${allSections.length}`);
    allSections.slice(0, 5).forEach(s => {
      console.log(`- ${s.label}: type=${typeof s.repeater_templateNodeIds}`);
      const tpl = s.repeater_templateNodeIds;
      if (Array.isArray(tpl)) {
        console.log(`  Array: ${tpl.slice(0, 3).join(', ')}`);
        if (tpl.includes(panneauxMaxId)) {
          console.log('  ⭐ CONTIENT PANNEAUX MAX!');
        }
      } else {
        console.log(`  Value: ${JSON.stringify(tpl).slice(0, 100)}`);
      }
    });
  }

  // Trouver qui a repeater_templateNodeIds contenant Panneaux max
  console.log('\n=== RECHERCHE GLOBALE ===');
  const allNodes = await prisma.treeBranchLeafNode.findMany({
    select: {
      id: true,
      label: true,
      type: true,
      subType: true,
      repeater_templateNodeIds: true
    }
  });

  const found = allNodes.filter(n => {
    const tpl = n.repeater_templateNodeIds;
    if (!tpl) return false;
    if (Array.isArray(tpl)) return tpl.includes(panneauxMaxId);
    if (typeof tpl === 'string') return tpl.includes(panneauxMaxId);
    return false;
  });

  console.log(`Trouvé ${found.length} nodes avec Panneaux max dans templates`);
  found.forEach(n => {
    console.log(`- ${n.label} (${n.id}) type=${n.type} subType=${n.subType}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
