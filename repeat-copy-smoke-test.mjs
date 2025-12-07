import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_NODES = [
  { name: 'Rampant toiture', id: '9c9f42b2-e0df-4726-8a81-997c0dee71bc' },
  { name: 'Orientation-Inclinaison', id: '54adf56b-ee04-44bf-be20-9636be4383d6' },
  { name: 'Longueur toiture', id: 'adbf2827-d5d7-4ef1-9b38-67f76e9129a6' }
];

const realUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const toSuffix = (nodeId) => {
  const match = /-(\d+)$/.exec(nodeId);
  return match ? Number(match[1]) : null;
};

async function main() {
  console.log('🔬 Repeat Copy Smoke Test');
  console.log('='.repeat(72));

  let hasIssues = false;

  for (const target of TARGET_NODES) {
    console.log(`\n📁 ${target.name}`);
    console.log('-'.repeat(40));

    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        OR: [
          { id: target.id },
          { id: { startsWith: `${target.id}-` } }
        ]
      },
      select: {
        id: true,
        label: true,
        parentId: true,
        linkedVariableIds: true,
        metadata: true
      }
    });

    if (!nodes.length) {
      console.log('  ❌ Aucun nœud trouvé pour ce template');
      hasIssues = true;
      continue;
    }

    const sorted = nodes.sort((a, b) => {
      const sa = toSuffix(a.id) ?? 0;
      const sb = toSuffix(b.id) ?? 0;
      return sa - sb;
    });

    for (const node of sorted) {
      const suffix = toSuffix(node.id);
      const linkedVars = Array.isArray(node.linkedVariableIds) ? node.linkedVariableIds : [];
      const copySuffix = typeof node.metadata === 'object' ? node.metadata?.copySuffix : undefined;
      const statusEmoji = suffix === null ? '🔵' : '🟢';

      console.log(`\n${statusEmoji} ${node.id}`);
      console.log(`   Label: ${node.label}`);
      console.log(`   Parent: ${node.parentId || '∅'}`);
      if (suffix !== null) {
        console.log(`   Suffix: ${suffix}`);
        if (typeof copySuffix === 'number' && copySuffix !== suffix) {
          console.log(`   ⚠️ copySuffix metadata=${copySuffix}`);
          hasIssues = true;
        }
      }

      if (!linkedVars.length) {
        console.log('   ❌ Aucun linkedVariableId');
        hasIssues = true;
        continue;
      }

      for (const varId of linkedVars) {
        if (!realUuid.test(varId)) {
          console.log(`   ↪️ Ignoré (référence spéciale): ${varId}`);
          continue;
        }

        if (suffix !== null && !varId.endsWith(`-${suffix}`)) {
          console.log(`   ❌ Variable ${varId} ne correspond pas au suffixe attendu -${suffix}`);
          hasIssues = true;
          continue;
        }

        const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
          where: { id: varId },
          select: { id: true, nodeId: true }
        });

        if (!variable) {
          console.log(`   ❌ Variable ${varId} introuvable`);
          hasIssues = true;
          continue;
        }

        if (variable.nodeId !== node.id) {
          console.log(`   ❌ Variable ${varId} associée à ${variable.nodeId}, attendu ${node.id}`);
          hasIssues = true;
        } else {
          console.log(`   ✅ Variable liée: ${varId}`);
        }
      }
    }
  }

  console.log('\n'.repeat(1) + '='.repeat(72));
  if (hasIssues) {
    console.log('❌ Des incohérences ont été détectées');
    process.exitCode = 1;
  } else {
    console.log('✅ Tout est cohérent');
  }
}

main()
  .catch(err => {
    console.error('Erreur durant le test:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
