/**
 * Répare les tables dont le meta a été écrasé par lookupMeta (symptôme: meta.enabled existe mais meta.lookup absent).
 *
 * Dry-run par défaut.
 *
 * Usage:
 *   npx tsx scripts/tests/repair-overwritten-lookup-meta.ts
 *   npx tsx scripts/tests/repair-overwritten-lookup-meta.ts --apply
 *   npx tsx scripts/tests/repair-overwritten-lookup-meta.ts --apply --limit=50
 */

import { db } from '../../src/lib/database';

function hasArg(name: string) {
  return process.argv.includes(`--${name}`);
}

function getArgValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find(a => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

function isOverwrittenLookupMeta(meta: unknown): meta is Record<string, unknown> {
  if (!meta || typeof meta !== 'object') return false;
  const m = meta as any;

  // "vieux bug": on persistait lookupMeta directement => clés typiques: enabled, selectors, rowLookupEnabled, columnLookupEnabled...
  const looksLikeLookupMeta =
    'enabled' in m || 'selectors' in m || 'rowLookupEnabled' in m || 'columnLookupEnabled' in m;

  const hasLookupWrapper = 'lookup' in m;
  return looksLikeLookupMeta && !hasLookupWrapper;
}

async function main() {
  const apply = hasArg('apply');
  const limit = Number(getArgValue('limit') ?? '200') || 200;

  const tables = await db.treeBranchLeafNodeTable.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, nodeId: true, createdAt: true, meta: true },
  });

  const candidates = tables.filter(t => isOverwrittenLookupMeta(t.meta));

  console.log(`\n=== Repair overwritten lookup meta (dry-run=${apply ? 'no' : 'yes'}) ===`);
  console.log(`Scanned ${tables.length} tables, found ${candidates.length} candidates.\n`);

  for (const t of candidates) {
    const metaKeys = Object.keys(t.meta as any);
    console.log(`- ${t.name}`);
    console.log(`  id=${t.id}`);
    console.log(`  createdAt=${t.createdAt.toISOString?.() ?? String(t.createdAt)}`);
    console.log(`  metaKeys=[${metaKeys.join(', ')}]`);

    if (apply) {
      await db.treeBranchLeafNodeTable.update({
        where: { id: t.id },
        data: {
          meta: {
            lookup: t.meta as any,
          } as any,
        },
      });
      console.log('  ✅ patched: meta = { lookup: <oldMeta> }');
    } else {
      console.log('  🔎 would patch: meta = { lookup: <oldMeta> }');
    }

    console.log('');
  }

  if (!apply && candidates.length > 0) {
    console.log('Relance avec `--apply` pour appliquer la réparation.');
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('ERROR:', err);
    process.exit(1);
  });
