#!/usr/bin/env node
/**
 * Debug script to check variables linked to template nodes
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const REPEATER_NODE_ID = process.argv[2] || '0f7a180b-36df-413c-9266-059f47ce1190';

async function main() {
  console.log('=== Checking variables for repeater:', REPEATER_NODE_ID);
  
  // Get repeater node
  const repeaterNode = await prisma.treeBranchLeafNode.findUnique({
    where: { id: REPEATER_NODE_ID },
    select: {
      id: true,
      label: true,
      metadata: true,
      repeater_templateNodeIds: true
    }
  });
  
  if (!repeaterNode) {
    console.error('Repeater not found!');
    return;
  }
  
  console.log('\n📦 Repeater node:', repeaterNode.label);
  
  // Extract template IDs from metadata
  const metaRepeater = repeaterNode.metadata?.repeater;
  const templateNodeIds = metaRepeater?.templateNodeIds || [];
  console.log('\n📋 Template Node IDs from metadata.repeater.templateNodeIds:');
  console.log(JSON.stringify(templateNodeIds, null, 2));
  
  if (!templateNodeIds.length) {
    console.warn('⚠️ No template node IDs found in metadata!');
    return;
  }
  
  // Get direct variables (owned by template nodes)
  const directVariables = await prisma.treeBranchLeafNodeVariable.findMany({
    where: { nodeId: { in: templateNodeIds } },
    select: {
      id: true,
      nodeId: true,
      displayName: true,
      exposedKey: true,
      sourceRef: true,
      sourceType: true
    }
  });
  
  console.log('\n🔷 Direct variables (owned by template nodes):');
  if (directVariables.length) {
    directVariables.forEach(v => {
      console.log(`  - ${v.displayName || v.exposedKey || v.id} (nodeId: ${v.nodeId}, sourceType: ${v.sourceType})`);
    });
  } else {
    console.log('  (none)');
  }
  
  // Get linked variables (linkedVariableIds on template nodes)
  const templateNodesWithLinks = await prisma.treeBranchLeafNode.findMany({
    where: { id: { in: templateNodeIds } },
    select: {
      id: true,
      label: true,
      linkedVariableIds: true
    }
  });
  
  console.log('\n🔗 Template nodes with linkedVariableIds:');
  const linkedVarIds = [];
  for (const node of templateNodesWithLinks) {
    if (node.linkedVariableIds && node.linkedVariableIds.length) {
      console.log(`  - ${node.label} (${node.id}): linkedVariableIds = [${node.linkedVariableIds.join(', ')}]`);
      linkedVarIds.push(...node.linkedVariableIds);
    }
  }
  
  if (!linkedVarIds.length) {
    console.log('  (none)');
  }
  
  // Fetch linked variables details
  const uniqueLinkedVarIds = [...new Set(linkedVarIds)].filter(id => !directVariables.some(v => v.id === id));
  if (uniqueLinkedVarIds.length) {
    const linkedVariables = await prisma.treeBranchLeafNodeVariable.findMany({
      where: { id: { in: uniqueLinkedVarIds } },
      select: {
        id: true,
        nodeId: true,
        displayName: true,
        exposedKey: true,
        sourceRef: true,
        sourceType: true
      }
    });
    
    console.log('\n🔶 Linked variables (referenced by templates but owned elsewhere):');
    linkedVariables.forEach(v => {
      console.log(`  - ${v.displayName || v.exposedKey || v.id}`);
      console.log(`      id: ${v.id}`);
      console.log(`      nodeId: ${v.nodeId}`);
      console.log(`      sourceRef: ${v.sourceRef}`);
      console.log(`      sourceType: ${v.sourceType}`);
    });
  }
  
  // Check for capacities (formulas, conditions, tables) linked to template nodes
  const [formulas, conditions, tables] = await Promise.all([
    prisma.treeBranchLeafNodeFormula.findMany({
      where: { nodeId: { in: templateNodeIds } },
      select: { id: true, nodeId: true, expression: true }
    }),
    prisma.treeBranchLeafNodeCondition.findMany({
      where: { nodeId: { in: templateNodeIds } },
      select: { id: true, nodeId: true }
    }),
    prisma.treeBranchLeafNodeTable.findMany({
      where: { nodeId: { in: templateNodeIds } },
      select: { id: true, nodeId: true, tableName: true }
    })
  ]);
  
  console.log('\n📊 Capacities on template nodes:');
  console.log(`  - Formulas: ${formulas.length}`);
  formulas.forEach(f => console.log(`      • ${f.id} (node: ${f.nodeId})`));
  console.log(`  - Conditions: ${conditions.length}`);
  conditions.forEach(c => console.log(`      • ${c.id} (node: ${c.nodeId})`));
  console.log(`  - Tables: ${tables.length}`);
  tables.forEach(t => console.log(`      • ${t.id} (node: ${t.nodeId}, tableName: ${t.tableName})`));
  
  // Now check for display field (leaf_repeater_display) and their linked variables
  const displayNodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      OR: [
        { type: 'leaf_repeater_display' },
        { type: { contains: 'display' } }
      ],
      metadata: {
        path: ['sourceTemplateId'],
        string_contains: templateNodeIds[0]?.substring(0, 8) || ''
      }
    },
    select: {
      id: true,
      label: true,
      type: true,
      linkedVariableIds: true,
      metadata: true
    },
    take: 20
  });
  
  console.log('\n🖥️ Existing display/copy nodes (might indicate previous duplications):');
  displayNodes.forEach(d => {
    console.log(`  - ${d.label} (${d.id}, type: ${d.type})`);
    if (d.linkedVariableIds?.length) {
      console.log(`      linkedVariableIds: [${d.linkedVariableIds.join(', ')}]`);
    }
  });
  
  console.log('\n✅ Analysis complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
