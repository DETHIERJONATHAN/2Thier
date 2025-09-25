// Audit des formules: détecte celles dont les tokens sont vides et affiche leur contexte
// Usage:
//   node scripts/audit-formulas-empty.cjs --treeId <TREE_ID>
//   node scripts/audit-formulas-empty.cjs            # pour tout le workspace (peut être verbeux)

const { PrismaClient } = require('@prisma/client');

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--treeId') out.treeId = argv[++i];
  }
  return out;
}

async function main() {
  const { treeId } = parseArgs(process.argv);
  const prisma = new PrismaClient();
  try {
    const where = treeId
      ? { TreeBranchLeafNode: { treeId } }
      : {};

    const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
      where,
      select: {
        id: true,
        tokens: true,
        nodeId: true,
        isDefault: true,
        node: { select: { label: true, treeId: true } }
      }
    });

    const empties = formulas.filter(f => !Array.isArray(f.tokens) || f.tokens.length === 0);

    console.log(`Formules scannées: ${formulas.length}`);
    console.log(`Formules avec tokens vides: ${empties.length}`);

    for (const f of empties) {
  console.log(`- formula:${f.id} | node:${f.nodeId} | label:"${f.node?.label || ''}" | tree:${f.node?.treeId || ''}`);
    }

    if (empties.length === 0) {
      console.log('✅ Aucune formule vide détectée.');
    } else {
      console.log('\nℹ️ Remplis les tokens de ces formules pour obtenir un OperationDetail/Result lisible.');
    }
  } catch (e) {
    console.error('❌ ERREUR audit:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => process.exit(1));
