#!/usr/bin/env node
// Vérifie qu'un Field (id=nodeId) existe pour une variable donnée
// Usage:
//   node scripts/verify-field-for-variable.cjs --variableId <VAR_ID>

const { PrismaClient } = require('@prisma/client');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    const n = argv[i + 1];
    if (!n || n.startsWith('--')) args[k] = true; else { args[k] = n; i++; }
  }
  return args;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const args = parseArgs(process.argv);
    const variableId = args.variableId || args.var || args.v;
    if (!variableId) {
      console.error('❌ Usage: --variableId <ID>');
      process.exit(1);
    }

    const variable = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { id: variableId } });
    if (!variable) {
      console.error('❌ Variable introuvable:', variableId);
      process.exit(2);
    }
    const nodeId = variable.nodeId;
    console.log('🔎 Variable:', { id: variable.id, nodeId, displayName: variable.displayName, exposedKey: variable.exposedKey });

    const field = await prisma.field.findUnique({ where: { id: nodeId } });
    if (!field) {
      console.log('❌ Field absent pour nodeId:', nodeId);
      process.exit(3);
    }
    console.log('✅ Field trouvé:', { id: field.id, label: field.label, type: field.type, sectionId: field.sectionId, order: field.order });

    const section = await prisma.section.findUnique({ where: { id: field.sectionId } });
    console.log(section ? '✅ Section:' : '❌ Section absente:', section ? { id: section.id, name: section.name, blockId: section.blockId, order: section.order } : field.sectionId);

    const block = section ? await prisma.block.findUnique({ where: { id: section.blockId } }) : null;
    console.log(block ? '✅ Block:' : '❌ Block absent:', block ? { id: block.id, name: block.name, organizationId: block.organizationId } : (section ? section.blockId : '—'));

    // linkedVariableIds check
    const node = await prisma.treeBranchLeafNode.findUnique({ where: { id: nodeId }, select: { linkedVariableIds: true } });
    const inLinked = Array.isArray(node?.linkedVariableIds) && node.linkedVariableIds.includes(variableId);
    console.log(inLinked ? '✅ linkedVariableIds contient la variable' : '❌ linkedVariableIds ne contient PAS la variable');
  } catch (e) {
    console.error('💥 Erreur:', e);
    process.exit(10);
  }
}

main();
