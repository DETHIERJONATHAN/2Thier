import { PrismaClient } from '@prisma/client';

/**
 * Diagnostic script to compare an original TreeBranchLeafNodeCondition and its copied version.
 * It extracts referenced IDs from conditionSet (fields, shared-ref, formulas, conditions)
 * and checks whether the copied references exist in the database (with suffix applied).
 *
 * Usage (PowerShell):
 *   npx ts-node ./scripts/diagnostics/diagnose-condition-copy.ts --id bda51415-... --suffix 1
 */

const prisma = new PrismaClient();

interface ExtractedRefs {
  valueRefs: string[]; // @value.<id>
  formulaRefs: string[]; // node-formula:<id>
  conditionRefs: string[]; // condition:<id> or node-condition:<id>
  sharedRefs: string[]; // shared-ref-* plain strings
}

function extractRefs(conditionSet: unknown): ExtractedRefs {
  const refs: ExtractedRefs = { valueRefs: [], formulaRefs: [], conditionRefs: [], sharedRefs: [] };
  if (!conditionSet || typeof conditionSet !== 'object') return refs;
  const str = JSON.stringify(conditionSet);

  const pushUnique = (arr: string[], v: string) => {
    if (!v) return;
    if (!arr.includes(v)) arr.push(v);
  };

  const valueRegex = /@value\.([A-Za-z0-9_:-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = valueRegex.exec(str)) !== null) {
    pushUnique(refs.valueRefs, m[1]);
    if (m[1].startsWith('shared-ref-')) pushUnique(refs.sharedRefs, m[1]);
  }

  const formulaRegex = /node-formula:([A-Za-z0-9_-]+)/g;
  while ((m = formulaRegex.exec(str)) !== null) pushUnique(refs.formulaRefs, m[1]);

  const condRegex = /(?:condition:|node-condition:)([A-Za-z0-9_-]+)/g;
  while ((m = condRegex.exec(str)) !== null) pushUnique(refs.conditionRefs, m[1]);

  return refs;
}

async function checkExistence(label: string, ids: string[], table: 'node' | 'condition' | 'formula') {
  if (ids.length === 0) return { missing: [] as string[], found: ids };
  let existing: string[] = [];
  if (table === 'node') {
    const rows = await prisma.treeBranchLeafNode.findMany({ where: { id: { in: ids } }, select: { id: true } });
    existing = rows.map(r => r.id);
  } else if (table === 'condition') {
    const rows = await prisma.treeBranchLeafNodeCondition.findMany({ where: { id: { in: ids } }, select: { id: true } });
    existing = rows.map(r => r.id);
  } else {
    const rows = await prisma.treeBranchLeafNodeFormula.findMany({ where: { id: { in: ids } }, select: { id: true } });
    existing = rows.map(r => r.id);
  }
  const missing = ids.filter(id => !existing.includes(id));
  console.log(`- ${label}: ${ids.length} refs, missing ${missing.length}`);
  if (missing.length) console.log(`  missing => ${missing.join(', ')}`);
  return { missing, found: existing };
}

function withSuffix(ids: string[], suffix: string): string[] {
  return ids.map(id => (/-\d+$/.test(id) ? id : `${id}-${suffix}`));
}

async function main() {
  const args = process.argv.slice(2);
  const baseArg = args.find(a => a.startsWith('--id=')) || args[args.indexOf('--id') + 1];
  const suffixArg = args.find(a => a.startsWith('--suffix=')) || args[args.indexOf('--suffix') + 1];
  const baseId = baseArg?.replace('--id=', '').trim();
  const suffix = (suffixArg?.replace('--suffix=', '').trim() || '1');

  if (!baseId) {
    console.error('Missing --id <conditionId>');
    process.exit(1);
  }

  const copyId = `${baseId}-${suffix}`;
  console.log(`Base condition: ${baseId}`);
  console.log(`Copy condition: ${copyId}`);
  console.log(`Suffix: ${suffix}\n`);

  const original = await prisma.treeBranchLeafNodeCondition.findUnique({ where: { id: baseId } });
  const copy = await prisma.treeBranchLeafNodeCondition.findUnique({ where: { id: copyId } });

  if (!original) {
    console.error(`❌ Original condition not found: ${baseId}`);
  }
  if (!copy) {
    console.error(`❌ Copied condition not found: ${copyId}`);
  }
  if (!original || !copy) {
    await prisma.$disconnect();
    return;
  }

  const origRefs = extractRefs(original.conditionSet);
  const copyRefs = extractRefs(copy.conditionSet);

  console.log('\nOriginal refs:');
  await checkExistence('valueRefs (nodes)', origRefs.valueRefs, 'node');
  await checkExistence('sharedRefs (nodes)', origRefs.sharedRefs, 'node');
  await checkExistence('formulaRefs', origRefs.formulaRefs, 'formula');
  await checkExistence('conditionRefs', origRefs.conditionRefs, 'condition');

  console.log('\nCopied refs (post-suffix):');
  await checkExistence('valueRefs (nodes)', copyRefs.valueRefs, 'node');
  await checkExistence('sharedRefs (nodes)', copyRefs.sharedRefs, 'node');
  await checkExistence('formulaRefs', copyRefs.formulaRefs, 'formula');
  await checkExistence('conditionRefs', copyRefs.conditionRefs, 'condition');

  // Check expected-suffix existence for copied refs (value/shared/condition/formula)
  console.log('\nChecking expected suffixed targets (fallback):');
  await checkExistence('valueRefs+suffix', withSuffix(origRefs.valueRefs, suffix), 'node');
  await checkExistence('sharedRefs+suffix', withSuffix(origRefs.sharedRefs, suffix), 'node');
  await checkExistence('formulaRefs+suffix', withSuffix(origRefs.formulaRefs, suffix), 'formula');
  await checkExistence('conditionRefs+suffix', withSuffix(origRefs.conditionRefs, suffix), 'condition');

  console.log('\nDone.');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
