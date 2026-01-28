/**
 * Inspecte rapidement le contenu d'une table normalisée (headers + labels de lignes).
 *
 * Usage:
 *   npx tsx scripts/tests/inspect-table-content.ts --tableId=<id>
 */

import { db } from '../../src/lib/database';

function getArgValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find(a => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

function parseCells(cells: unknown): any[] {
  if (cells == null) return [];
  if (Array.isArray(cells)) return cells;
  if (typeof cells === 'string') {
    try {
      const parsed = JSON.parse(cells);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [cells];
    }
  }
  return [cells];
}

async function main() {
  const tableId = getArgValue('tableId');
  if (!tableId) {
    console.error('Missing --tableId');
    process.exit(1);
  }

  const table = await db.treeBranchLeafNodeTable.findUnique({
    where: { id: tableId },
    select: {
      id: true,
      name: true,
      rowCount: true,
      columnCount: true,
      meta: true,
      tableColumns: {
        orderBy: { columnIndex: 'asc' },
        select: { columnIndex: true, name: true },
      },
      tableRows: {
        orderBy: { rowIndex: 'asc' },
        take: 15,
        select: { rowIndex: true, cells: true },
      },
    },
  });

  if (!table) {
    console.error(`Table not found: ${tableId}`);
    process.exit(1);
  }

  console.log(`\n=== TABLE CONTENT ===`);
  console.log(`name=${table.name}`);
  console.log(`id=${table.id}`);
  console.log(`rowCount=${table.rowCount} columnCount=${table.columnCount}`);

  const headers = table.tableColumns.map(c => c.name);
  console.log(`\nHeaders (first 20):`);
  console.log(headers.slice(0, 20).map((h, i) => `${i}:${h}`).join(' | '));

  console.log(`\nRows preview (skip header rowIndex=0):`);
  for (const r of table.tableRows) {
    if (r.rowIndex === 0) continue;
    const cells = parseCells(r.cells);
    const label = cells.length > 0 ? String(cells[0]) : '';
    const values = cells.slice(1, 6).map(v => (v === null || v === undefined ? '' : String(v)));
    console.log(`- rowIndex=${r.rowIndex} label="${label}" values[0..4]=${JSON.stringify(values)}`);
  }

  const lookup = (table.meta as any)?.lookup;
  if (lookup) {
    console.log(`\nLookup summary:`);
    console.log(`enabled=${String(lookup.enabled)}`);
    console.log(`rowLookupEnabled=${String(lookup.rowLookupEnabled)}`);
    console.log(`columnLookupEnabled=${String(lookup.columnLookupEnabled)}`);
    console.log(`rowSourceOption=${JSON.stringify(lookup.rowSourceOption ?? null)}`);
    console.log(`columnSourceOption=${JSON.stringify(lookup.columnSourceOption ?? null)}`);
    console.log(`selectors=${JSON.stringify(lookup.selectors ?? null)}`);
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
