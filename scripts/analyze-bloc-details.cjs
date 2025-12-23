const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const treeId = 'cmf1mwoz10005gooked1j6orn';
  
  // D'abord récupérer tous les nodeIds de l'arbre
  const nodes = await prisma.treeBranchLeafNode.findMany({
    where: { treeId },
    select: { id: true, label: true, type: true }
  });
  const nodeIds = nodes.map(n => n.id);
  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = n; });
  
  // Variables
  console.log('=== VARIABLES ===');
  const variables = await prisma.treeBranchLeafNodeVariable.findMany({
    where: { nodeId: { in: nodeIds } }
  });
  console.log('Total variables:', variables.length);
  variables.slice(0, 20).forEach(v => {
    const node = nodeMap[v.nodeId];
    console.log(`${v.exposedKey || v.displayName} | node: ${node?.label} | sourceRef: ${v.sourceRef}`);
  });
  
  // Formules
  console.log('\n=== FORMULES ===');
  const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
    where: { nodeId: { in: nodeIds } }
  });
  console.log('Total formules:', formulas.length);
  formulas.slice(0, 15).forEach(f => {
    const node = nodeMap[f.nodeId];
    console.log(`${node?.label}: ${f.formula}`);
  });
  
  // Conditions
  console.log('\n=== CONDITIONS ===');
  const conditions = await prisma.treeBranchLeafNodeCondition.findMany({
    where: { nodeId: { in: nodeIds } }
  });
  console.log('Total conditions:', conditions.length);
  conditions.slice(0, 10).forEach(c => {
    const node = nodeMap[c.nodeId];
    console.log(`${node?.label}: ${c.type} - ${c.field} ${c.operator} ${c.value}`);
  });
  
  // Repeaters en détail
  console.log('\n=== REPEATERS DETAIL ===');
  const repeaters = await prisma.treeBranchLeafNode.findMany({
    where: { treeId, type: 'leaf_repeater' }
  });
  for (const r of repeaters) {
    console.log(`\nRepeater: ${r.label} (${r.id})`);
    // Enfants du repeater
    const children = await prisma.treeBranchLeafNode.findMany({
      where: { parentId: r.id }
    });
    console.log(`  Enfants: ${children.length}`);
    children.forEach(c => {
      console.log(`    - ${c.type}: ${c.label}`);
    });
  }
  
  // Tables
  console.log('\n=== TABLES ===');
  const tables = await prisma.treeBranchLeafNodeTable.findMany({
    where: { node: { treeId } },
    include: { 
      node: { select: { label: true } },
      columns: true
    }
  });
  console.log('Total tables:', tables.length);
  tables.forEach(t => {
    console.log(`Table: ${t.node?.label} - ${t.columns.length} colonnes`);
    t.columns.forEach(col => console.log(`  - ${col.name}: ${col.type}`));
  });
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
