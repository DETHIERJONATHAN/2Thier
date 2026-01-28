/**
 * Normalise les configs lookup existantes (format incohérent / type manquant).
 *
 * Principaux cas corrigés:
 * - lookup.rowSourceOption.sourceField présent mais lookup.rowSourceOption.type absent -> type='field'
 * - lookup.columnSourceOption.sourceField présent mais lookup.columnSourceOption.type absent -> type='field'
 * - meta possède aussi des clés "legacy" au root (enabled/selectors/rowLookupEnabled/columnLookupEnabled)
 *   -> on ne les supprime pas ici, mais on s'assure que meta.lookup est exploitable.
 *
 * Dry-run par défaut.
 *
 * Usage:
 *   npx tsx scripts/tests/normalize-lookup-config.ts
 *   npx tsx scripts/tests/normalize-lookup-config.ts --apply
 *   npx tsx scripts/tests/normalize-lookup-config.ts --apply --tableId=<id>
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

function getLookup(meta: unknown): any | undefined {
  if (!meta || typeof meta !== 'object') return undefined;
  return (meta as any).lookup;
}

function shouldConsider(lookup: any) {
  if (!lookup) return false;
  return Boolean(lookup.enabled || lookup.rowLookupEnabled || lookup.columnLookupEnabled);
}

async function normalizeOne(tableId: string, apply: boolean) {
  const table = await db.treeBranchLeafNodeTable.findUnique({
    where: { id: tableId },
    select: { id: true, name: true, createdAt: true, meta: true },
  });

  if (!table) {
    console.log(`❌ Table introuvable: ${tableId}`);
    return;
  }

  const metaObj: any = table.meta && typeof table.meta === 'object' ? (table.meta as any) : {};
  const lookup = getLookup(metaObj);

  if (!shouldConsider(lookup)) {
    console.log(`⏭️  ${table.name}: pas une table lookup`);
    return;
  }

  let changed = false;

  if (lookup?.rowSourceOption?.sourceField && !lookup.rowSourceOption.type) {
    lookup.rowSourceOption.type = 'field';
    changed = true;
  }

  if (lookup?.columnSourceOption?.sourceField && !lookup.columnSourceOption.type) {
    lookup.columnSourceOption.type = 'field';
    changed = true;
  }

  // Si rowSourceOption est en fait un select mais selectors manquent (rare) => recopier.
  if (lookup?.rowSourceOption?.type === 'select' && lookup?.rowSourceOption?.sourceField && !lookup?.selectors?.rowFieldId) {
    lookup.selectors = { ...(lookup.selectors || {}), rowFieldId: lookup.rowSourceOption.sourceField };
    changed = true;
  }

  if (lookup?.columnSourceOption?.type === 'select' && lookup?.columnSourceOption?.sourceField && !lookup?.selectors?.columnFieldId) {
    lookup.selectors = { ...(lookup.selectors || {}), columnFieldId: lookup.columnSourceOption.sourceField };
    changed = true;
  }

  if (!changed) {
    console.log(`✅ ${table.name}: rien à normaliser`);
    return;
  }

  console.log(`\n- ${table.name}`);
  console.log(`  id=${table.id}`);
  console.log(`  createdAt=${table.createdAt.toISOString?.() ?? String(table.createdAt)}`);
  console.log(`  fixes:`);
  if (lookup?.rowSourceOption?.sourceField) {
    console.log(`    - rowSourceOption: type=${lookup.rowSourceOption.type} sourceField=${lookup.rowSourceOption.sourceField}`);
  }
  if (lookup?.columnSourceOption?.sourceField) {
    console.log(`    - columnSourceOption: type=${lookup.columnSourceOption.type} sourceField=${lookup.columnSourceOption.sourceField}`);
  }

  if (apply) {
    metaObj.lookup = lookup;
    await db.treeBranchLeafNodeTable.update({
      where: { id: table.id },
      data: { meta: metaObj },
    });
    console.log('  ✅ applied');
  } else {
    console.log('  🔎 would apply');
  }
}

async function main() {
  const apply = hasArg('apply');
  const tableId = getArgValue('tableId');

  console.log(`\n=== Normalize lookup config (dry-run=${apply ? 'no' : 'yes'}) ===`);

  if (tableId) {
    await normalizeOne(tableId, apply);
    return;
  }

  const tables = await db.treeBranchLeafNodeTable.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, createdAt: true, meta: true },
  });

  for (const t of tables) {
    const lookup = getLookup(t.meta);
    if (!shouldConsider(lookup)) continue;

    // On ne veut pas spammer: on ne traite que celles qui ont un sourceField sans type.
    const needs =
      (lookup?.rowSourceOption?.sourceField && !lookup?.rowSourceOption?.type) ||
      (lookup?.columnSourceOption?.sourceField && !lookup?.columnSourceOption?.type);

    if (needs) {
      await normalizeOne(t.id, apply);
    }
  }

  if (!apply) {
    console.log('\nRelance avec `--apply` pour appliquer.');
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('ERROR:', err);
    process.exit(1);
  });
