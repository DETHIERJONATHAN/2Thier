// Diagnostic: compare an original condition and its copy, and check referenced targets/variables.
// Usage (PowerShell):
//   node scripts/diagnostics/compare-condition-copy.js --id bda51415-1530-4f97-8b5b-2c22a51a2e43 --suffix 1
//
// Output:
// - Missing refs in original/copy (nodes, shared-ref, formulas, conditions)
// - Existence of suffixed refs (what the copy should point to)
// - Owner node variable wiring (data_activeId vs linkedVariableIds) for original and copy
// - Presence of target nodes referenced by actions (nodeIds in actions)

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const numSuffix = /-\d+$/;

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const withEq = args.find((a) => a.startsWith(`--${flag}=`));
    if (withEq) return withEq.split('=')[1];
    const idx = args.indexOf(`--${flag}`);
    if (idx !== -1 && args[idx + 1]) return args[idx + 1];
    return undefined;
  };
  const id = get('id');
  const suffix = get('suffix') || '1';
  if (!id) {
    console.error('Missing --id <conditionId>');
    process.exit(1);
  }
  return { baseId: id, suffix, copyId: `${id}-${suffix}` };
}

function uniqPush(arr, v) {
  if (v && !arr.includes(v)) arr.push(v);
}

function extractRefs(conditionSet) {
  const refs = { valueRefs: [], sharedRefs: [], formulaRefs: [], conditionRefs: [], actionNodeRefs: [] };
  if (!conditionSet || typeof conditionSet !== 'object') return refs;
  const str = JSON.stringify(conditionSet);
  let m;
  const valRe = /@value\.([A-Za-z0-9_:-]+)/g;
  while ((m = valRe.exec(str)) !== null) {
    uniqPush(refs.valueRefs, m[1]);
    if (m[1].startsWith('shared-ref-')) uniqPush(refs.sharedRefs, m[1]);
  }
  const fRe = /node-formula:([A-Za-z0-9_-]+)/g;
  while ((m = fRe.exec(str)) !== null) uniqPush(refs.formulaRefs, m[1]);
  const cRe = /(?:condition:|node-condition:)([A-Za-z0-9_-]+)/g;
  while ((m = cRe.exec(str)) !== null) uniqPush(refs.conditionRefs, m[1]);

  // extract action nodeIds from parsed object (if present)
  try {
    const obj = JSON.parse(str);
    const walk = (o) => {
      if (!o || typeof o !== 'object') return;
      if (Array.isArray(o)) return o.forEach(walk);
      if (o.nodeIds && Array.isArray(o.nodeIds)) {
        o.nodeIds.forEach((id) => uniqPush(refs.actionNodeRefs, id));
      }
      Object.values(o).forEach(walk);
    };
    walk(obj);
  } catch (_) {}

  return refs;
}

async function exists(table, ids) {
  if (!ids || ids.length === 0) return new Set();
  let rows = [];
  if (table === 'node') {
    rows = await prisma.treeBranchLeafNode.findMany({ where: { id: { in: ids } }, select: { id: true } });
  } else if (table === 'formula') {
    rows = await prisma.treeBranchLeafNodeFormula.findMany({ where: { id: { in: ids } }, select: { id: true } });
  } else {
    rows = await prisma.treeBranchLeafNodeCondition.findMany({ where: { id: { in: ids } }, select: { id: true } });
  }
  return new Set(rows.map((r) => r.id));
}

function withSuffix(ids, suffix) {
  return (ids || []).map((id) => (numSuffix.test(id) ? id : `${id}-${suffix}`));
}

async function checkRefs(label, refs, suffix) {
  console.log(`\n[${label}]`);
  const valMissing = refs.valueRefs.filter((id) => !refs.valueExists.has(id));
  const sharedMissing = refs.sharedRefs.filter((id) => !refs.sharedExists.has(id));
  const formulaMissing = refs.formulaRefs.filter((id) => !refs.formulaExists.has(id));
  const condMissing = refs.conditionRefs.filter((id) => !refs.conditionExists.has(id));
  const actionNodeMissing = refs.actionNodeRefs.filter((id) => !refs.actionNodeExists.has(id));

  if (!valMissing.length && !sharedMissing.length && !formulaMissing.length && !condMissing.length && !actionNodeMissing.length) {
    console.log('✅ All refs exist');
  } else {
    if (valMissing.length) console.log('⚠️ Missing valueRefs:', valMissing.join(', '));
    if (sharedMissing.length) console.log('⚠️ Missing sharedRefs:', sharedMissing.join(', '));
    if (formulaMissing.length) console.log('⚠️ Missing formulaRefs:', formulaMissing.join(', '));
    if (condMissing.length) console.log('⚠️ Missing conditionRefs:', condMissing.join(', '));
    if (actionNodeMissing.length) console.log('⚠️ Missing action.nodeIds:', actionNodeMissing.join(', '));
  }

  // Expected suffixed targets
  const expectedVals = withSuffix(refs.valueRefs, suffix);
  const expectedShared = withSuffix(refs.sharedRefs, suffix);
  const expectedFormulas = withSuffix(refs.formulaRefs, suffix);
  const expectedConds = withSuffix(refs.conditionRefs, suffix);
  const expectedActions = withSuffix(refs.actionNodeRefs, suffix);

  const expValsMissing = expectedVals.filter((id) => !refs.valueExistsS.has(id));
  const expSharedMissing = expectedShared.filter((id) => !refs.sharedExistsS.has(id));
  const expFormMissing = expectedFormulas.filter((id) => !refs.formulaExistsS.has(id));
  const expCondMissing = expectedConds.filter((id) => !refs.conditionExistsS.has(id));
  const expActionMissing = expectedActions.filter((id) => !refs.actionNodeExistsS.has(id));

  console.log('Expected (suffix) missing:');
  const none = !expValsMissing.length && !expSharedMissing.length && !expFormMissing.length && !expCondMissing.length && !expActionMissing.length;
  if (none) {
    console.log('- none');
  } else {
    if (expValsMissing.length) console.log('- valueRefs+suffix:', expValsMissing.join(', '));
    if (expSharedMissing.length) console.log('- sharedRefs+suffix:', expSharedMissing.join(', '));
    if (expFormMissing.length) console.log('- formulaRefs+suffix:', expFormMissing.join(', '));
    if (expCondMissing.length) console.log('- conditionRefs+suffix:', expCondMissing.join(', '));
    if (expActionMissing.length) console.log('- action.nodeIds+suffix:', expActionMissing.join(', '));
  }
}

async function enrichRefs(conditionSet, suffix) {
  const refs = extractRefs(conditionSet);
  refs.valueExists = await exists('node', refs.valueRefs);
  refs.sharedExists = await exists('node', refs.sharedRefs);
  refs.formulaExists = await exists('formula', refs.formulaRefs);
  refs.conditionExists = await exists('condition', refs.conditionRefs);
  refs.actionNodeExists = await exists('node', refs.actionNodeRefs);

  refs.valueExistsS = await exists('node', withSuffix(refs.valueRefs, suffix));
  refs.sharedExistsS = await exists('node', withSuffix(refs.sharedRefs, suffix));
  refs.formulaExistsS = await exists('formula', withSuffix(refs.formulaRefs, suffix));
  refs.conditionExistsS = await exists('condition', withSuffix(refs.conditionRefs, suffix));
  refs.actionNodeExistsS = await exists('node', withSuffix(refs.actionNodeRefs, suffix));
  return refs;
}

async function checkOwnerNode(nodeId) {
  if (!nodeId) return null;
  const node = await prisma.treeBranchLeafNode.findUnique({
    where: { id: nodeId },
    select: { id: true, label: true, data_activeId: true, linkedVariableIds: true },
  });
  return node;
}

async function main() {
  const { baseId, copyId, suffix } = parseArgs();
  console.log(`Base: ${baseId}`);
  console.log(`Copy: ${copyId}`);
  console.log(`Suffix: ${suffix}\n`);

  const base = await prisma.treeBranchLeafNodeCondition.findUnique({ where: { id: baseId } });
  const copy = await prisma.treeBranchLeafNodeCondition.findUnique({ where: { id: copyId } });
  if (!base) console.error(`❌ Base condition not found: ${baseId}`);
  if (!copy) console.error(`❌ Copy condition not found: ${copyId}`);
  if (!base || !copy) {
    await prisma.$disconnect();
    return;
  }

  const baseRefs = await enrichRefs(base.conditionSet, suffix);
  const copyRefs = await enrichRefs(copy.conditionSet, suffix);

  await checkRefs(`ORIGINAL ${baseId}`, baseRefs, suffix);
  await checkRefs(`COPY ${copyId}`, copyRefs, suffix);

  // Owner nodes linkage check
  console.log('\nOwner nodes and variables:');
  const baseOwner = await checkOwnerNode(base.nodeId);
  const copyOwner = await checkOwnerNode(copy.nodeId);
  if (baseOwner) {
    console.log(`- Base owner ${baseOwner.id} [${baseOwner.label}] data_activeId=${baseOwner.data_activeId} linkedVariableIds=${(baseOwner.linkedVariableIds||[]).join(',')}`);
  }
  if (copyOwner) {
    console.log(`- Copy owner ${copyOwner.id} [${copyOwner.label}] data_activeId=${copyOwner.data_activeId} linkedVariableIds=${(copyOwner.linkedVariableIds||[]).join(',')}`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
