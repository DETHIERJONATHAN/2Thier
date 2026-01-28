/**
 * Diagnostic ciblé Orientation / Inclinaison.
 *
 * Objectif: retrouver les tables/nodes pertinents et vérifier:
 * - meta.lookup présent et cohérent
 * - selectors.rowFieldId / selectors.columnFieldId remplis
 * - SelectConfigs présents pour: composite nodeId, rowFieldId, columnFieldId
 *
 * Usage:
 *   npx tsx scripts/tests/diagnose-orientation-inclinaison.ts
 *   npx tsx scripts/tests/diagnose-orientation-inclinaison.ts --query=orientation
 *   npx tsx scripts/tests/diagnose-orientation-inclinaison.ts --tableId=<id>
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

function asRootMeta(meta: unknown): any | undefined {
  if (!meta || typeof meta !== 'object') return undefined;
  return meta as any;
}

function norm(s: string) {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

async function inspectTable(tableId: string) {
  const table = await db.treeBranchLeafNodeTable.findUnique({
    where: { id: tableId },
    select: { id: true, name: true, nodeId: true, createdAt: true, meta: true },
  });

  if (!table) {
    console.log(`❌ Table introuvable: ${tableId}`);
    return;
  }

  const rootMeta = asRootMeta(table.meta);
  const lookup = asLookupMeta(table.meta);
  const metaKeys = table.meta && typeof table.meta === 'object' ? Object.keys(table.meta as any) : [];

  console.log(`\n=== TABLE ===`);
  console.log(`name=${table.name}`);
  console.log(`id=${table.id}`);
  console.log(`nodeId=${table.nodeId}`);
  console.log(`createdAt=${table.createdAt.toISOString?.() ?? String(table.createdAt)}`);
  console.log(`metaKeys=[${metaKeys.join(', ')}]`);

  if (!lookup) {
    console.log(`❌ meta.lookup absent (soit pas une table lookup, soit meta mal formé/écrasé)`);
    return;
  }

  const selectors = lookup.selectors ?? {};
  const rowFieldId = selectors.rowFieldId;
  const columnFieldId = selectors.columnFieldId;

  console.log(`\n=== LOOKUP ===`);
  console.log(`enabled=${String(lookup.enabled)}`);
  console.log(`rowLookupEnabled=${String(lookup.rowLookupEnabled)}`);
  console.log(`columnLookupEnabled=${String(lookup.columnLookupEnabled)}`);
  console.log(`selectors.rowFieldId=${rowFieldId ? rowFieldId : 'EMPTY'}`);
  console.log(`selectors.columnFieldId=${columnFieldId ? columnFieldId : 'EMPTY'}`);
  console.log(`rowSourceOption.type=${lookup.rowSourceOption?.type ?? 'null'}`);
  console.log(`rowSourceOption.sourceField=${lookup.rowSourceOption?.sourceField ?? 'null'}`);
  console.log(`columnSourceOption.type=${lookup.columnSourceOption?.type ?? 'null'}`);
  console.log(`columnSourceOption.sourceField=${lookup.columnSourceOption?.sourceField ?? 'null'}`);
  console.log(`displayRow=${lookup.displayRow ?? 'null'}`);
  console.log(`displayColumn=${lookup.displayColumn ?? 'null'}`);

  async function checkSuffixVariants(id: string, label: string) {
    const variants = [`${id}-1`, `${id}-2`];
    const found = await Promise.all(
      variants.map(async (vid) => {
        const n = await db.treeBranchLeafNode.findUnique({ where: { id: vid }, select: { id: true, label: true } });
        return n ? `${n.id} (${n.label})` : null;
      })
    );
    const existing = found.filter(Boolean) as string[];
    if (existing.length > 0) {
      console.log(`⚠️  Variantes suffixées trouvées pour ${label}: ${existing.join(' | ')}`);
    }
  }

  if (lookup.rowSourceOption?.sourceField) {
    await checkSuffixVariants(String(lookup.rowSourceOption.sourceField), 'rowSourceOption.sourceField');
  }
  if (lookup.columnSourceOption?.sourceField) {
    await checkSuffixVariants(String(lookup.columnSourceOption.sourceField), 'columnSourceOption.sourceField');
  }
  if (selectors.rowFieldId) {
    await checkSuffixVariants(String(selectors.rowFieldId), 'selectors.rowFieldId');
  }
  if (selectors.columnFieldId) {
    await checkSuffixVariants(String(selectors.columnFieldId), 'selectors.columnFieldId');
  }

  const rootSelectors = rootMeta?.selectors;
  if (rootSelectors || rootMeta?.enabled !== undefined || rootMeta?.rowLookupEnabled !== undefined || rootMeta?.columnLookupEnabled !== undefined) {
    console.log(`\n=== ROOT META (legacy/incorrect) ===`);
    console.log(`enabled=${rootMeta?.enabled ?? 'null'}`);
    console.log(`rowLookupEnabled=${rootMeta?.rowLookupEnabled ?? 'null'}`);
    console.log(`columnLookupEnabled=${rootMeta?.columnLookupEnabled ?? 'null'}`);
    console.log(`selectors.rowFieldId=${rootSelectors?.rowFieldId ?? 'null'}`);
    console.log(`selectors.columnFieldId=${rootSelectors?.columnFieldId ?? 'null'}`);
  }

  const nodeIdsToCheck = [table.nodeId, rowFieldId, columnFieldId].filter(Boolean) as string[];
  const configs = await db.treeBranchLeafSelectConfig.findMany({
    where: { nodeId: { in: nodeIdsToCheck } },
    select: { nodeId: true, optionsSource: true, tableReference: true, displayColumn: true, displayRow: true, createdAt: true },
  });
  const byNodeId = new Map(configs.map(c => [c.nodeId, c]));

  console.log(`\n=== SELECTCONFIGS ===`);
  for (const id of nodeIdsToCheck) {
    const cfg = byNodeId.get(id);
    if (!cfg) {
      console.log(`MISSING nodeId=${id}`);
    } else {
      console.log(
        `OK nodeId=${id} optionsSource=${cfg.optionsSource ?? 'null'} tableRef=${cfg.tableReference ?? 'null'} displayColumn=${cfg.displayColumn ?? 'null'} displayRow=${cfg.displayRow ?? 'null'}`,
      );
    }
  }

  console.log(`\n=== VERDICT ===`);
  const hasRow = Boolean(rowFieldId || (lookup.rowSourceOption && lookup.rowSourceOption.type && lookup.rowSourceOption.type !== 'select'));
  const hasCol = Boolean(columnFieldId || (lookup.columnSourceOption && lookup.columnSourceOption.type && lookup.columnSourceOption.type !== 'select'));
  if (!hasRow || !hasCol) {
    console.log(`❌ source(s) manquante(s) -> l'interpréteur lookup retournera ∅`);
  } else {
    console.log(`✅ sources row/col présentes (on peut ensuite investiguer la correspondance valeurs vs table)`);
  }

  if (metaKeys.length <= 3) {
    console.log(`⚠ meta semble "écrasé" (trop peu de clés). Cela arrivait quand on sauvait lookupMeta au lieu de meta complet.`);
  }
}

async function main() {
  const tableId = getArgValue('tableId');
  if (tableId) {
    await inspectTable(tableId);
    return;
  }

  const queryRaw = getArgValue('query') ?? 'orientation';
  const query = norm(queryRaw);

  console.log(`\nRecherche tables/nodes contenant: ${queryRaw}`);

  const tables = await db.treeBranchLeafNodeTable.findMany({
    where: {
      name: { contains: queryRaw, mode: 'insensitive' },
    },
    take: 25,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, nodeId: true, createdAt: true, meta: true },
  });

  // Ajoute aussi une recherche large sur les 200 dernières tables si le nom ne matche pas.
  const fallback = await db.treeBranchLeafNodeTable.findMany({
    take: 200,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, nodeId: true, createdAt: true, meta: true },
  });

  const merged = [...tables];
  for (const t of fallback) {
    if (!merged.some(x => x.id === t.id)) merged.push(t);
  }

  const candidates = merged
    .map(t => ({ t, lookup: asLookupMeta(t.meta) }))
    .filter(x => {
      const n = norm(x.t.name);
      return n.includes('orientation') || n.includes('inclinaison') || n.includes(query);
    })
    .slice(0, 25);

  if (candidates.length === 0) {
    console.log('❌ Aucun candidat trouvé par nom.');
    console.log('\nJe liste les tables les plus récentes qui ont un meta.lookup, pour que tu puisses choisir un id:');

    const recentLookupTables = merged
      .map(t => ({ t, lookup: asLookupMeta(t.meta) }))
      .filter(x => Boolean(x.lookup))
      .sort((a, b) => {
        const aTime = new Date(a.t.createdAt as any).getTime();
        const bTime = new Date(b.t.createdAt as any).getTime();
        return bTime - aTime;
      })
      .slice(0, 25);

    if (recentLookupTables.length === 0) {
      console.log('⚠️ Aucune table récente avec meta.lookup trouvée dans les 200 dernières.');
      console.log('Passe un --tableId=<id> si tu l\'as sous la main.');
      return;
    }

    for (const { t, lookup } of recentLookupTables) {
      const selectors = lookup?.selectors ?? {};
      console.log(`\n- ${t.name}`);
      console.log(`  id=${t.id}`);
      console.log(`  createdAt=${t.createdAt.toISOString?.() ?? String(t.createdAt)}`);
      console.log(`  enabled=${String(lookup?.enabled)}`);
      console.log(`  rowFieldId=${selectors.rowFieldId ?? 'EMPTY'}`);
      console.log(`  columnFieldId=${selectors.columnFieldId ?? 'EMPTY'}`);
    }

    console.log('\nRelance ensuite avec:');
    console.log('  npx tsx scripts/tests/diagnose-orientation-inclinaison.ts --tableId=<un-id-ci-dessus>');
    return;
  }

  console.log(`\nCandidats trouvés: ${candidates.length}`);
  for (const { t, lookup } of candidates) {
    const selectors = lookup?.selectors ?? {};
    console.log(`\n- ${t.name}`);
    console.log(`  id=${t.id}`);
    console.log(`  createdAt=${t.createdAt.toISOString?.() ?? String(t.createdAt)}`);
    console.log(`  hasLookup=${lookup ? 'yes' : 'no'}`);
    console.log(`  rowFieldId=${selectors.rowFieldId ?? 'EMPTY'}`);
    console.log(`  columnFieldId=${selectors.columnFieldId ?? 'EMPTY'}`);
  }

  console.log('\nPour un diagnostic complet, relance avec:');
  console.log('  npx tsx scripts/tests/diagnose-orientation-inclinaison.ts --tableId=<un-id-ci-dessus>');
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('ERROR:', err);
    process.exit(1);
  });
