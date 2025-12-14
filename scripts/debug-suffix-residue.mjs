import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Ajuste ces IDs au besoin pour filtrer un scope précis (ex: repeater ou pattern de labels)
const labelFilters = ['Orientation', 'Inclinaison', 'Plan', 'Mesure simple'];
const suffixes = ['-1', '-2'];

const likeSuffix = (suffix) => ({ endsWith: suffix });

async function main() {
  console.log('\n🔍 Résidus suffixés (-1/-2) sur nodes + variables + shared-ref');

  // Nodes suffixés
  const nodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      OR: suffixes.map((s) => ({ id: likeSuffix(s) }))
    },
    select: {
      id: true,
      label: true,
      metadata: true,
      linkedVariableIds: true,
      linkedConditionIds: true,
      linkedTableIds: true
    },
    orderBy: { id: 'asc' }
  });

  console.log(`\n🧱 Nodes (${nodes.length})`);
  for (const n of nodes) {
    console.log(`- ${n.id} | label=${n.label} | copySuffix=${(n.metadata && typeof n.metadata==='object' && n.metadata.copySuffix) ?? 'n/a'} | copiedFrom=${(n.metadata && typeof n.metadata==='object' && n.metadata.copiedFromNodeId) ?? 'n/a'} | sourceTemplateId=${(n.metadata && typeof n.metadata==='object' && n.metadata.sourceTemplateId) ?? 'n/a'}`);
    console.log(`  linkedVariableIds=${JSON.stringify(n.linkedVariableIds || [])}`);
    console.log(`  linkedConditionIds=${JSON.stringify(n.linkedConditionIds || [])}`);
    console.log(`  linkedTableIds=${JSON.stringify(n.linkedTableIds || [])}`);
  }

  // Variables suffixées
  const vars = await prisma.treeBranchLeafNodeVariable.findMany({
    where: {
      OR: suffixes.map((s) => ({ id: likeSuffix(s) }))
    },
    select: {
      id: true,
      nodeId: true,
      displayName: true,
      sourceRef: true,
      exposedKey: true
    },
    orderBy: { id: 'asc' }
  });

  console.log(`\n🔗 Variables (${vars.length})`);
  for (const v of vars) {
    console.log(`- ${v.id} | node=${v.nodeId} | name=${v.displayName}`);
    console.log(`  linkedConditionIds=${JSON.stringify(v.linkedConditionIds || [])}`);
    console.log(`  linkedFormulaIds=${JSON.stringify(v.linkedFormulaIds || [])}`);
    console.log(`  linkedTableIds=${JSON.stringify(v.linkedTableIds || [])}`);
  }

  // Shared-ref suffixés (optionnel, pour nettoyer)
  const sharedRefs = await prisma.treeBranchLeafNode.findMany({
    where: {
      isSharedReference: true,
      OR: suffixes.map((s) => ({ id: likeSuffix(s) }))
    },
    select: { id: true, label: true, metadata: true },
    orderBy: { id: 'asc' }
  });

  console.log(`\n🔖 Shared refs (${sharedRefs.length})`);
  sharedRefs.forEach(r => {
    console.log(`- ${r.id} | label=${r.label}`);
  });

  // Plan/variables in plan2 to see target count
  try {
    const { executeRepeatDuplication } = await import('../src/components/TreeBranchLeaf/treebranchleaf-new/api/repeat/repeat-service.ts');
    const mockReq = { user: { organizationId: 'cmf1mwoz10002gooked6zubz4', isSuperAdmin: true } };
    const repeaterNodeId = 'd1d8810d-232b-46e0-a5dd-9ee889ad9fc0';
    const planned = await executeRepeatDuplication(prisma, repeaterNodeId, { includeTotals: true });
    console.log(`\n🧩 Plan variables: ${planned.plan.variables.length}`);
    planned.plan.variables.slice(0, 20).forEach((v, idx) => {
      console.log(`  [${idx}] templateVar=${v.templateVariableId} targetNodeId=${v.targetNodeId} plannedVarId=${v.plannedVariableId}`);
    });
  } catch (e) {
    console.warn('⚠️ Impossible d’afficher le plan variables:', e?.message || e);
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
