const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== DIAGNOSTIC COMPLET PANNEAUX MAX-1 ===\n');

  // 1. Vérifier les tables de lookup
  const tables = [
    { id: '5403f874-3d02-427a-854b-0cfad91c7906-1', name: 'Largeur panneau-1' },
    { id: '2f58d585-19ed-4834-add9-ce065eb1ab4c-1', name: 'Longueur panneau-1' }
  ];

  for (const t of tables) {
    const table = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: t.id },
      include: { tableRows: true, tableColumns: true }
    });
    
    console.log(`\n📊 TABLE ${t.name} (${t.id}):`);
    if (table) {
      console.log(`  nodeId: ${table.nodeId}`);
      console.log(`  Colonnes: ${table.tableColumns?.length || 0}`);
      console.log(`  Lignes: ${table.tableRows?.length || 0}`);
      
      // Afficher les données des lignes
      if (table.tableRows) {
        for (const row of table.tableRows.slice(0, 3)) {
          console.log(`    Row ${row.rowIndex}:`, JSON.stringify(row.cells).substring(0, 100));
        }
      }
    } else {
      console.log(`  ❌ TABLE INTROUVABLE !`);
    }
  }

  // 2. Vérifier les valeurs source
  const sources = [
    { id: '6817ee20-5782-4b03-a7b1-0687cc5b4d58-1', name: 'Rampant toiture-1' },
    { id: '6844ea47-db3d-4479-9e4e-ad207f7924e4-1', name: 'Longueur-1' }
  ];

  console.log('\n\n=== VALEURS SOURCE ===');
  for (const s of sources) {
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: s.id },
      select: { id: true, label: true, calculatedValue: true, value: true }
    });
    
    console.log(`\n📐 ${s.name} (${s.id}):`);
    if (node) {
      console.log(`  label: ${node.label}`);
      console.log(`  calculatedValue: ${node.calculatedValue}`);
      console.log(`  value: ${node.value}`);
    } else {
      console.log(`  ❌ INTROUVABLE !`);
    }
  }

  // 3. Vérifier la condition
  const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
    where: { id: '8eebf44e-f70b-4613-b13b-5f1e0a8b82cb-1' }
  });

  console.log('\n\n=== CONDITION POSITION-1 ===');
  if (condition) {
    console.log(`nodeId: ${condition.nodeId}`);
    const cs = condition.conditionSet;
    if (cs && cs.branches) {
      console.log(`Branches: ${cs.branches.length}`);
      for (const b of cs.branches) {
        console.log(`  Branch "${b.label}":`);
        console.log(`    Left ref: ${b.when?.left?.ref}`);
        console.log(`    Right ref: ${b.when?.right?.ref}`);
        console.log(`    Actions: ${JSON.stringify(b.actions?.map(a => a.nodeIds))}`);
      }
      console.log(`  Fallback actions: ${JSON.stringify(cs.fallback?.actions?.map(a => a.nodeIds))}`);
    }
  }

  // 4. Vérifier Position-1 (la valeur qui détermine la condition)
  const position1 = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '249b682d-d50d-42fd-bdcf-f6a1139792d1-1' },
    select: { id: true, label: true, calculatedValue: true, value: true }
  });

  console.log('\n\n=== POSITION-1 (détermine la condition) ===');
  if (position1) {
    console.log(`label: ${position1.label}`);
    console.log(`value: ${position1.value}`);
    console.log(`calculatedValue: ${position1.calculatedValue}`);
  }

  // 5. Vérifier Portrait-1 (comparaison dans la condition)
  const portrait1 = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '3211d48d-4745-445d-b8fc-3e19e5dc4b8a-1' },
    select: { id: true, label: true, calculatedValue: true, value: true }
  });

  console.log('\n\n=== PORTRAIT-1 (comparé dans la condition) ===');
  if (portrait1) {
    console.log(`label: ${portrait1.label}`);
    console.log(`value: ${portrait1.value}`);
    console.log(`calculatedValue: ${portrait1.calculatedValue}`);
  }

  // 6. Vérifier les formules
  console.log('\n\n=== FORMULES DE PANNEAUX MAX-1 ===');
  const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
    where: { nodeId: '3da47bc3-739e-4c83-98c3-813ecf77a740-1' }
  });
  
  for (const f of formulas) {
    console.log(`\nFormule ${f.id}:`);
    console.log(`  name: ${f.name}`);
    console.log(`  tokens:`, f.tokens);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
