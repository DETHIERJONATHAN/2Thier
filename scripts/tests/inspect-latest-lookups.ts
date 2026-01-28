/**
 * Inspecte les dernières tables avec lookup et vérifie les SelectConfigs associées.
 *
 * Usage:
 *   npx tsx scripts/tests/inspect-latest-lookups.ts
 *   npx tsx scripts/tests/inspect-latest-lookups.ts --limit=20
 */

import { db } from '../../src/lib/database';

function getArgValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find(a => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

function asLookupMeta(meta: unknown): any | undefined {
  if (!meta || typeof meta !== 'object') return undefined;
  return (meta as any).lookup;
}

async function main() {
  const limit = Number(getArgValue('limit') ?? '10') || 10;

  const tables = await db.treeBranchLeafNodeTable.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      nodeId: true,
      createdAt: true,
      meta: true,
    },
  });

  const lookupTables = tables
    .map(t => ({ t, lookup: asLookupMeta(t.meta) }))
    .filter(x => !!x.lookup && (x.lookup.enabled || x.lookup.rowLookupEnabled || x.lookup.columnLookupEnabled));

  console.log(`\n=== Inspect latest lookup tables (limit=${limit}) ===`);
  console.log(`Found ${lookupTables.length} lookup-like tables in last ${tables.length} tables.\n`);

  for (const { t, lookup } of lookupTables) {
    const selectors = lookup.selectors ?? {};
    const rowFieldId = selectors.rowFieldId;
    const columnFieldId = selectors.columnFieldId;

    console.log(`- Table: ${t.name}`);
    console.log(`  id=${t.id}`);
    console.log(`  nodeId=${t.nodeId}`);
    console.log(`  createdAt=${t.createdAt.toISOString?.() ?? String(t.createdAt)}`);
    console.log(`  lookup.enabled=${String(lookup.enabled)}`);
    console.log(`  selectors.rowFieldId=${rowFieldId ? rowFieldId : 'EMPTY'}`);
    console.log(`  selectors.columnFieldId=${columnFieldId ? columnFieldId : 'EMPTY'}`);

    const idsToCheck = [t.nodeId, rowFieldId, columnFieldId].filter(Boolean) as string[];
    const configs = await db.treeBranchLeafSelectConfig.findMany({
      where: { nodeId: { in: idsToCheck } },
      select: { nodeId: true, optionsSource: true, tableReference: true, displayColumn: true, displayRow: true, createdAt: true },
    });

    const byNodeId = new Map(configs.map(c => [c.nodeId, c]));

    for (const checkId of idsToCheck) {
      const c = byNodeId.get(checkId);
      if (!c) {
        console.log(`  SelectConfig(${checkId}) = MISSING`);
      } else {
        console.log(
          `  SelectConfig(${checkId}) = ok source=${c.optionsSource ?? 'null'} tableRef=${c.tableReference ?? 'null'} displayColumn=${c.displayColumn ?? 'null'} displayRow=${c.displayRow ?? 'null'}`,
        );
      }
    }

    // Détection simple d'un meta écrasé: si meta.lookup existe mais meta a très peu de clés.
    const metaKeys = t.meta && typeof t.meta === 'object' ? Object.keys(t.meta as any) : [];
    if (metaKeys.length > 0 && metaKeys.length <= 3) {
      console.log(`  ⚠ meta keys suspiciously small: [${metaKeys.join(', ')}]`);
    }

    console.log('');
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('ERROR:', err);
    process.exit(1);
  });
