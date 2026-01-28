/**
 * Patch sécurisé des selectors lookup d'une table.
 *
 * Objectif: corriger rapidement un meta.lookup incomplet (selectors vides) sans toucher au reste.
 *
 * Dry-run par défaut.
 *
 * Usage:
 *   npx tsx scripts/tests/patch-lookup-selectors.ts --tableId=<id> --rowFieldId=<id> --columnFieldId=<id>
 *   npx tsx scripts/tests/patch-lookup-selectors.ts --apply --tableId=<id> --rowFieldId=<id> --columnFieldId=<id>
 */

import { randomUUID } from 'node:crypto';

import { db } from '../../src/lib/database';

function hasArg(name: string) {
  return process.argv.includes(`--${name}`);
}

function getArgValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find(a => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

function getLookup(meta: unknown): any | undefined {
  if (!meta || typeof meta !== 'object') return undefined;
  return (meta as any).lookup;
}

async function main() {
  const apply = hasArg('apply');
  const tableId = getArgValue('tableId');
  const rowFieldId = getArgValue('rowFieldId');
  const columnFieldId = getArgValue('columnFieldId');

  if (!tableId || !rowFieldId || !columnFieldId) {
    console.log('❌ Arguments manquants.');
    console.log('Ex: npx tsx scripts/tests/patch-lookup-selectors.ts --tableId=<id> --rowFieldId=<id> --columnFieldId=<id>');
    process.exit(1);
  }

  const table = await db.treeBranchLeafNodeTable.findUnique({
    where: { id: tableId },
    select: { id: true, name: true, createdAt: true, meta: true },
  });

  if (!table) {
    console.log(`❌ Table introuvable: ${tableId}`);
    process.exit(1);
  }

  const metaObj: any = table.meta && typeof table.meta === 'object' ? (table.meta as any) : {};
  const lookup = getLookup(metaObj) ?? {};

  lookup.selectors = { ...(lookup.selectors || {}), rowFieldId, columnFieldId };

  // On force le mode "select" car les selectors n'ont de sens que dans ce mode.
  lookup.rowSourceOption = { ...(lookup.rowSourceOption || {}), type: 'select', sourceField: null };
  lookup.columnSourceOption = { ...(lookup.columnSourceOption || {}), type: 'select', sourceField: null };

  metaObj.lookup = lookup;

  console.log(`\n=== Patch lookup selectors (dry-run=${apply ? 'no' : 'yes'}) ===`);
  console.log(`table: ${table.name}`);
  console.log(`id=${table.id}`);
  console.log(`createdAt=${table.createdAt.toISOString?.() ?? String(table.createdAt)}`);
  console.log(`set selectors.rowFieldId=${rowFieldId}`);
  console.log(`set selectors.columnFieldId=${columnFieldId}`);
  console.log(`force rowSourceOption.type=select`);
  console.log(`force columnSourceOption.type=select`);

  if (!apply) {
    console.log('\n🔎 would apply (use --apply to write)');
    const existingRow = await db.treeBranchLeafSelectConfig.findFirst({ where: { nodeId: rowFieldId } });
    const existingCol = await db.treeBranchLeafSelectConfig.findFirst({ where: { nodeId: columnFieldId } });
    console.log(`would ensure SelectConfig(rowFieldId)=${existingRow ? 'exists' : 'CREATE'}`);
    console.log(`would ensure SelectConfig(columnFieldId)=${existingCol ? 'exists' : 'CREATE'}`);
    return;
  }

  await db.treeBranchLeafNodeTable.update({
    where: { id: table.id },
    data: { meta: metaObj },
  });

  const existingRow = await db.treeBranchLeafSelectConfig.findFirst({ where: { nodeId: rowFieldId } });
  if (!existingRow) {
    await db.treeBranchLeafSelectConfig.create({
      data: {
        id: randomUUID(),
        nodeId: rowFieldId,
        options: [] as any,
        multiple: false,
        searchable: true,
        allowCustom: false,
        optionsSource: 'table',
        tableReference: table.id,
        keyColumn: null,
        valueColumn: null,
        displayColumn: null,
        dependsOnNodeId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  const existingCol = await db.treeBranchLeafSelectConfig.findFirst({ where: { nodeId: columnFieldId } });
  if (!existingCol) {
    await db.treeBranchLeafSelectConfig.create({
      data: {
        id: randomUUID(),
        nodeId: columnFieldId,
        options: [] as any,
        multiple: false,
        searchable: true,
        allowCustom: false,
        optionsSource: 'table',
        tableReference: table.id,
        keyColumn: null,
        valueColumn: null,
        displayColumn: null,
        dependsOnNodeId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  console.log('\n✅ applied');
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('ERROR:', err);
    process.exit(1);
  });
