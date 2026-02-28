import { db } from './src/lib/database';

const TOIT_REPEATER_ID = 'a231810e-122a-4057-a9ce-b119fa9cbe9a';
const ONDULEUR_REPEATER_ID = 'ce8af8f6-496f-49df-a8aa-bb31d2c01739';
const TREE_ID = 'cmf1mwoz10005gooked1j6orn';

async function main() {
  console.log('='.repeat(80));
  console.log('INVESTIGATION: Tree structure for Toit & Onduleur repeaters');
  console.log('='.repeat(80));

  // 1. Toit repeater node itself
  console.log('\n--- 1. TOIT REPEATER NODE ---');
  const toitRepeater = await db.treeBranchLeafNode.findUnique({
    where: { id: TOIT_REPEATER_ID },
    select: { id: true, label: true, type: true, subType: true, parentId: true, metadata: true, treeId: true }
  });
  console.log('Toit Repeater:', JSON.stringify(toitRepeater, null, 2));
  
  if (toitRepeater?.metadata) {
    const meta = toitRepeater.metadata as any;
    console.log('\nTemplate Node IDs:', JSON.stringify(meta.templateNodeIds, null, 2));
    console.log('Copies:', JSON.stringify(meta.copies, null, 2));
    console.log('repeatCount:', meta.repeatCount);
  }

  // 2. Direct children of Toit repeater
  console.log('\n--- 2. DIRECT CHILDREN OF TOIT REPEATER (parentId = repeater ID) ---');
  const toitChildren = await db.treeBranchLeafNode.findMany({
    where: { parentId: TOIT_REPEATER_ID },
    select: { id: true, label: true, type: true, subType: true, parentId: true, order: true },
    orderBy: { order: 'asc' }
  });
  console.log(`Found ${toitChildren.length} direct children:`);
  toitChildren.forEach(c => {
    console.log(`  [${c.order}] ${c.label} (type=${c.type}, subType=${c.subType}, id=${c.id})`);
  });

  // 3. For each direct child, find THEIR children (grandchildren of repeater)
  console.log('\n--- 3. GRANDCHILDREN OF TOIT REPEATER ---');
  for (const child of toitChildren) {
    const grandChildren = await db.treeBranchLeafNode.findMany({
      where: { parentId: child.id },
      select: { id: true, label: true, type: true, subType: true, parentId: true, order: true },
      orderBy: { order: 'asc' }
    });
    if (grandChildren.length > 0) {
      console.log(`\n  Children of "${child.label}" (${child.id}):`);
      grandChildren.forEach(gc => {
        console.log(`    [${gc.order}] ${gc.label} (type=${gc.type}, subType=${gc.subType}, id=${gc.id})`);
      });
    }
  }

  // 4. Find all nodes with label containing "-1" suffix in this tree related to Toit
  console.log('\n--- 4. COPY NODES WITH SUFFIX -1 IN TREE (Toit-related) ---');
  const copyNodes = await db.treeBranchLeafNode.findMany({
    where: {
      treeId: TREE_ID,
      label: { contains: '-1' },
      metadata: { path: ['sourceRepeaterNodeId'], equals: TOIT_REPEATER_ID }
    },
    select: { id: true, label: true, type: true, parentId: true, metadata: true, order: true },
    orderBy: { order: 'asc' }
  });
  console.log(`Found ${copyNodes.length} Toit copy nodes with -1 suffix:`);
  copyNodes.forEach(cn => {
    const meta = cn.metadata as any;
    console.log(`  ${cn.label} → parentId=${cn.parentId}, copyIndex=${meta?.copyIndex}, sourceNodeId=${meta?.sourceNodeId}`);
  });

  // 4b. Alternative: find all nodes whose metadata references the Toit repeater
  console.log('\n--- 4b. ALL NODES referencing Toit repeater in metadata ---');
  const allToitCopies = await db.treeBranchLeafNode.findMany({
    where: {
      treeId: TREE_ID,
      metadata: { path: ['sourceRepeaterNodeId'], equals: TOIT_REPEATER_ID }
    },
    select: { id: true, label: true, type: true, parentId: true, metadata: true, order: true },
    orderBy: [{ label: 'asc' }, { order: 'asc' }]
  });
  console.log(`Found ${allToitCopies.length} nodes referencing Toit repeater:`);
  allToitCopies.forEach(cn => {
    const meta = cn.metadata as any;
    console.log(`  ${cn.label} → parentId=${cn.parentId}, copyIndex=${meta?.copyIndex}`);
  });

  // 5. If no results from metadata filter, try finding by label pattern
  if (allToitCopies.length === 0) {
    console.log('\n--- 4c. FALLBACK: Nodes with "Panneau" or "Position" labels ---');
    const panneauNodes = await db.treeBranchLeafNode.findMany({
      where: {
        treeId: TREE_ID,
        OR: [
          { label: { contains: 'Panneau' } },
          { label: { contains: 'Position' } },
          { label: { contains: 'Inclinaison' } },
          { label: { contains: 'Orientation' } },
        ]
      },
      select: { id: true, label: true, type: true, subType: true, parentId: true, metadata: true, order: true },
      orderBy: [{ label: 'asc' }, { order: 'asc' }]
    });
    console.log(`Found ${panneauNodes.length} Panneau/Position/Inclinaison/Orientation nodes:`);
    panneauNodes.forEach(cn => {
      const meta = cn.metadata as any;
      console.log(`  ${cn.label} (type=${cn.type}) → parentId=${cn.parentId}, meta.sourceRepeaterNodeId=${meta?.sourceRepeaterNodeId}, meta.copyIndex=${meta?.copyIndex}, meta.sourceNodeId=${meta?.sourceNodeId}`);
    });
  }

  // ============================================================================
  // ONDULEUR REPEATER
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('ONDULEUR REPEATER');
  console.log('='.repeat(80));

  // 6. Onduleur repeater node
  console.log('\n--- 6. ONDULEUR REPEATER NODE ---');
  const ondRepeater = await db.treeBranchLeafNode.findUnique({
    where: { id: ONDULEUR_REPEATER_ID },
    select: { id: true, label: true, type: true, subType: true, parentId: true, metadata: true, treeId: true }
  });
  console.log('Onduleur Repeater:', JSON.stringify(ondRepeater, null, 2));

  if (ondRepeater?.metadata) {
    const meta = ondRepeater.metadata as any;
    console.log('\nTemplate Node IDs:', JSON.stringify(meta.templateNodeIds, null, 2));
    console.log('Copies:', JSON.stringify(meta.copies, null, 2));
    console.log('repeatCount:', meta.repeatCount);
  }

  // 7. Direct children of Onduleur repeater
  console.log('\n--- 7. DIRECT CHILDREN OF ONDULEUR REPEATER ---');
  const ondChildren = await db.treeBranchLeafNode.findMany({
    where: { parentId: ONDULEUR_REPEATER_ID },
    select: { id: true, label: true, type: true, subType: true, parentId: true, order: true },
    orderBy: { order: 'asc' }
  });
  console.log(`Found ${ondChildren.length} direct children:`);
  ondChildren.forEach(c => {
    console.log(`  [${c.order}] ${c.label} (type=${c.type}, subType=${c.subType}, id=${c.id})`);
  });

  // 8. Grandchildren of Onduleur repeater
  console.log('\n--- 8. GRANDCHILDREN OF ONDULEUR REPEATER ---');
  for (const child of ondChildren) {
    const grandChildren = await db.treeBranchLeafNode.findMany({
      where: { parentId: child.id },
      select: { id: true, label: true, type: true, subType: true, parentId: true, order: true },
      orderBy: { order: 'asc' }
    });
    if (grandChildren.length > 0) {
      console.log(`\n  Children of "${child.label}" (${child.id}):`);
      grandChildren.forEach(gc => {
        console.log(`    [${gc.order}] ${gc.label} (type=${gc.type}, subType=${gc.subType}, id=${gc.id})`);
      });
    }
  }

  // 9. Onduleur copy nodes
  console.log('\n--- 9. ONDULEUR COPY NODES ---');
  const ondCopies = await db.treeBranchLeafNode.findMany({
    where: {
      treeId: TREE_ID,
      OR: [
        { label: { contains: 'Onduleur-1' } },
        { label: { startsWith: 'Onduleur' } }
      ]
    },
    select: { id: true, label: true, type: true, subType: true, parentId: true, metadata: true, order: true },
    orderBy: [{ label: 'asc' }, { order: 'asc' }]
  });
  console.log(`Found ${ondCopies.length} Onduleur nodes:`);
  ondCopies.forEach(cn => {
    const meta = cn.metadata as any;
    console.log(`  ${cn.label} (type=${cn.type}, subType=${cn.subType}) → parentId=${cn.parentId}, meta.sourceRepeaterNodeId=${meta?.sourceRepeaterNodeId}, meta.copyIndex=${meta?.copyIndex}`);
  });

  // 10. Summary comparison
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`\nToit repeater (${TOIT_REPEATER_ID}):`);
  console.log(`  Direct children: ${toitChildren.length}`);
  toitChildren.slice(0, 5).forEach(c => console.log(`    - ${c.label} (${c.type})`));
  if (toitChildren.length > 5) console.log(`    ... and ${toitChildren.length - 5} more`);
  
  console.log(`\nOnduleur repeater (${ONDULEUR_REPEATER_ID}):`);
  console.log(`  Direct children: ${ondChildren.length}`);
  ondChildren.slice(0, 5).forEach(c => console.log(`    - ${c.label} (${c.type})`));
  if (ondChildren.length > 5) console.log(`    ... and ${ondChildren.length - 5} more`);

  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
