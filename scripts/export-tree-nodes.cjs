#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true; // flag
      } else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const treeId = args.treeId || process.env.TREE_ID;
  const outPath = args.out || 'nodes.json';

  if (!treeId) {
    console.error('❌ Requis: --treeId <TREE_ID>');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    console.log(`🔄 Export des nœuds pour treeId=${treeId} ...`);
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: { treeId },
      orderBy: { createdAt: 'asc' }
    });

    const outAbs = path.resolve(outPath);
    fs.writeFileSync(outAbs, JSON.stringify(nodes, null, 2), 'utf-8');
    console.log(`✅ ${nodes.length} nœud(s) exporté(s) → ${outAbs}`);
  } catch (err) {
    console.error('❌ Erreur export:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
