#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

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
  const label = args.label || 'Versant (Copie 1)';
  const treeId = args.treeId; // optionnel pour restreindre

  const prisma = new PrismaClient();
  try {
    const where = treeId ? { label, treeId } : { label };

    const nodes = await prisma.treeBranchLeafNode.findMany({
      where,
      orderBy: { updatedAt: 'desc' }
    });

    if (nodes.length === 0) {
      console.log('❌ Aucun nœud trouvé pour label:', label, treeId ? `dans treeId=${treeId}` : '');
      process.exit(1);
    }

    console.log(`✅ ${nodes.length} nœud(s) trouvé(s) pour "${label}"${treeId ? ` (treeId=${treeId})` : ''}`);
    for (const n of nodes) {
      console.log(`- id=${n.id} | type=${n.type} | fieldType=${n.fieldType} | subType=${n.subType} | parentId=${n.parentId}`);
    }

    // Heuristique: préférer un fieldType cascader si présent
    const cascader = nodes.find(n => n.fieldType === 'leaf_cascader') || nodes[0];
    console.log('\n🎯 Recommandation fieldId à tester:', cascader.id);
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
