import { PrismaClient } from '@prisma/client';

/**
 * List conditions whose conditionSet references targets that do not exist (nodes, shared-ref, formulas, conditions).
 * Optional filters: --id <conditionId> to limit, --suffix <n> to also check suffixed variants.
 *
 * Usage (PowerShell):
 *   npx ts-node ./scripts/diagnostics/check-condition-refs.ts --suffix 1
 *   npx ts-node ./scripts/diagnostics/check-condition-refs.ts --id bda51415-... --suffix 1
 */

const prisma = new PrismaClient();

interface ExtractedRefs {
  valueRefs: string[];
  sharedRefs: string[];
  formulaRefs: string[];
  conditionRefs: string[];
}

function extractRefs(conditionSet: unknown): ExtractedRefs {
  const refs: ExtractedRefs = { valueRefs: [], sharedRefs: [], formulaRefs: [], conditionRefs: [] };
  if (!conditionSet || typeof conditionSet !== 'object') return refs;
  const str = JSON.stringify(conditionSet);
  const push = (arr: string[], v: string) => { if (v && !arr.includes(v)) arr.push(v); };

  let m: RegExpExecArray | null;
  const valRe = /@value\.([A-Za-z0-9_:-]+)/g;
  while ((m = valRe.exec(str)) !== null) { push(refs.valueRefs, m[1]); if (m[1].startsWith('shared-ref-')) push(refs.sharedRefs, m[1]); }
  const fRe = /node-formula:([A-Za-z0-9_-]+)/g;
  while ((m = fRe.exec(str)) !== null) push(refs.formulaRefs, m[1]);
  const cRe = /(?:condition:|node-condition:)([A-Za-z0-9_-]+)/g;
  while ((m = cRe.exec(str)) !== null) push(refs.conditionRefs, m[1]);
  return refs;
}

async function exists(table: 'node' | 'formula' | 'condition', ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  if (table === 'node') {
    const rows = await prisma.treeBranchLeafNode.findMany({ where: { id: { in: ids } }, select: { id: true } });
    return new Set(rows.map(r => r.id));
  }
  if (table === 'formula') {
    const rows = await prisma.treeBranchLeafNodeFormula.findMany({ where: { id: { in: ids } }, select: { id: true } });
    return new Set(rows.map(r => r.id));
  }
  const rows = await prisma.treeBranchLeafNodeCondition.findMany({ where: { id: { in: ids } }, select: { id: true } });
  return new Set(rows.map(r => r.id));
}

function withSuffix(ids: string[], suffix?: string): string[] {
  if (!suffix) return ids;
  return ids.map(id => (/-\d+$/.test(id) ? id : `${id}-${suffix}`));
}

async function checkOne(condId: string, suffix?: string) {
  const cond = await prisma.treeBranchLeafNodeCondition.findUnique({ where: { id: condId } });
  if (!cond) {
    console.log(`❌ Condition not found: ${condId}`);
    return;
  }
  const refs = extractRefs(cond.conditionSet);

  const valueExists = await exists('node', refs.valueRefs);
  const sharedExists = await exists('node', refs.sharedRefs);
  const formulaExists = await exists('formula', refs.formulaRefs);
  const condExists = await exists('condition', refs.conditionRefs);

  const missingValues = refs.valueRefs.filter(id => !valueExists.has(id));
  const missingShared = refs.sharedRefs.filter(id => !sharedExists.has(id));
  const missingFormulas = refs.formulaRefs.filter(id => !formulaExists.has(id));
  const missingConds = refs.conditionRefs.filter(id => !condExists.has(id));

  console.log(`\nCondition ${condId}`);
  if (!missingValues.length && !missingShared.length && !missingFormulas.length && !missingConds.length) {
    console.log('✅ All references exist');
  } else {
    if (missingValues.length) console.log(`⚠️ Missing valueRefs: ${missingValues.join(', ')}`);
    if (missingShared.length) console.log(`⚠️ Missing sharedRefs: ${missingShared.join(', ')}`);
    if (missingFormulas.length) console.log(`⚠️ Missing formulaRefs: ${missingFormulas.join(', ')}`);
    if (missingConds.length) console.log(`⚠️ Missing conditionRefs: ${missingConds.join(', ')}`);
  }

  if (suffix) {
    const expectedValues = withSuffix(refs.valueRefs, suffix);
    const expectedShared = withSuffix(refs.sharedRefs, suffix);
    const expectedFormulas = withSuffix(refs.formulaRefs, suffix);
    const expectedConds = withSuffix(refs.conditionRefs, suffix);

    const valueExistsS = await exists('node', expectedValues);
    const sharedExistsS = await exists('node', expectedShared);
    const formulaExistsS = await exists('formula', expectedFormulas);
    const condExistsS = await exists('condition', expectedConds);

    const missValuesS = expectedValues.filter(id => !valueExistsS.has(id));
    const missSharedS = expectedShared.filter(id => !sharedExistsS.has(id));
    const missFormulasS = expectedFormulas.filter(id => !formulaExistsS.has(id));
    const missCondsS = expectedConds.filter(id => !condExistsS.has(id));

    console.log(`Expected (suffix=${suffix}) targets missing:`);
    if (missValuesS.length) console.log(`- valueRefs+suffix missing: ${missValuesS.join(', ')}`);
    if (missSharedS.length) console.log(`- sharedRefs+suffix missing: ${missSharedS.join(', ')}`);
    if (missFormulasS.length) console.log(`- formulaRefs+suffix missing: ${missFormulasS.join(', ')}`);
    if (missCondsS.length) console.log(`- conditionRefs+suffix missing: ${missCondsS.join(', ')}`);
    if (!missValuesS.length && !missSharedS.length && !missFormulasS.length && !missCondsS.length) console.log('- none');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const idArg = args.find(a => a.startsWith('--id=')) || (args.includes('--id') ? args[args.indexOf('--id') + 1] : undefined);
  const suffixArg = args.find(a => a.startsWith('--suffix=')) || (args.includes('--suffix') ? args[args.indexOf('--suffix') + 1] : undefined);
  const suffix = suffixArg?.replace('--suffix=', '').trim();
  const singleId = idArg?.replace('--id=', '').trim();

  if (singleId) {
    await checkOne(singleId, suffix);
  } else {
    const all = await prisma.treeBranchLeafNodeCondition.findMany({ select: { id: true } });
    for (const c of all) {
      await checkOne(c.id, suffix);
    }
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
