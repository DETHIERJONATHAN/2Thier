#!/usr/bin/env tsx

/**
 * 🔎 Compare original vs copy (TBL/display) field
 *
 * Objectif: comprendre pourquoi une copie n'affiche pas/plus de valeur.
 *
 * Lecture seule: aucune écriture en DB.
 *
 * Usage:
 *   npx tsx src/scripts/compare-original-copy-display-field.ts <originalNodeId> <copyNodeId>
 *
 * Exemple:
 *   npx tsx src/scripts/compare-original-copy-display-field.ts \
 *     6b25f86d-8450-485a-8855-eb5d6a37735e \
 *     6b25f86d-8450-485a-8855-eb5d6a37735e-1
 */

import { db } from '../lib/database';

const prisma = db;

type JsonValue = unknown;

type NodeSnapshot = {
  id: string;
  treeId: string;
  parentId: string | null;
  type: string;
  subType: string | null;
  label: string;
  fieldType: string | null;
  fieldSubType: string | null;
  hasData: boolean;
  hasFormula: boolean;
  hasCondition: boolean;
  hasTable: boolean;
  hasAPI: boolean;
  calculatedValue: string | null;
  calculatedAt: Date | null;
  calculatedBy: string | null;
  data_activeId: string | null;
  formula_activeId: string | null;
  condition_activeId: string | null;
  table_activeId: string | null;
  linkedVariableIds: string[];
  linkedFormulaIds: string[];
  linkedConditionIds: string[];
  linkedTableIds: string[];
  metadata: JsonValue;
  data_instances: JsonValue;
  formula_instances: JsonValue;
  condition_instances: JsonValue;
  table_instances: JsonValue;
  table_meta: JsonValue;
};

function stableStringify(value: unknown): string {
  try {
    return JSON.stringify(value, Object.keys(value as any).sort(), 2);
  } catch {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
}

function summarizeJson(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) return `Array(len=${value.length})`;

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  const keysPreview = keys.slice(0, 10);
  const more = keys.length > keysPreview.length ? `, +${keys.length - keysPreview.length}` : '';
  return `Object(keys=${keysPreview.join(', ')}${more})`;
}

function pickMeta(meta: unknown): Record<string, unknown> {
  if (!meta || typeof meta !== 'object') return {};
  const m = meta as Record<string, unknown>;
  const keysOfInterest = [
    'copiedFromNodeId',
    'sourceTemplateId',
    'fromVariableId',
    'parentNodeId',
    'triggerNodeIds',
    'tbl_auto_generated',
    'duplicatedFromRepeater',
    'copySuffix',
    'suffixNum',
    'autoCreateDisplayNode',
    'isSumDisplayField'
  ];
  const out: Record<string, unknown> = {};
  for (const k of keysOfInterest) {
    if (k in m) out[k] = m[k];
  }
  return out;
}

function diffObjects(a: Record<string, unknown>, b: Record<string, unknown>): Array<{ key: string; a: unknown; b: unknown }> {
  const keys = new Set<string>([...Object.keys(a), ...Object.keys(b)]);
  const diffs: Array<{ key: string; a: unknown; b: unknown }> = [];
  for (const key of Array.from(keys).sort()) {
    const av = a[key];
    const bv = b[key];
    if (stableStringify(av) !== stableStringify(bv)) {
      diffs.push({ key, a: av, b: bv });
    }
  }
  return diffs;
}

async function fetchNode(nodeId: string): Promise<NodeSnapshot | null> {
  return prisma.treeBranchLeafNode.findUnique({
    where: { id: nodeId },
    select: {
      id: true,
      treeId: true,
      parentId: true,
      type: true,
      subType: true,
      label: true,
      fieldType: true,
      fieldSubType: true,
      hasData: true,
      hasFormula: true,
      hasCondition: true,
      hasTable: true,
      hasAPI: true,
      calculatedValue: true,
      calculatedAt: true,
      calculatedBy: true,
      data_activeId: true,
      formula_activeId: true,
      condition_activeId: true,
      table_activeId: true,
      linkedVariableIds: true,
      linkedFormulaIds: true,
      linkedConditionIds: true,
      linkedTableIds: true,
      metadata: true,
      data_instances: true,
      formula_instances: true,
      condition_instances: true,
      table_instances: true,
      table_meta: true
    }
  });
}

async function main() {
  const [originalNodeId, copyNodeId] = process.argv.slice(2);
  if (!originalNodeId || !copyNodeId) {
    console.error('Usage: npx tsx src/scripts/compare-original-copy-display-field.ts <originalNodeId> <copyNodeId>');
    process.exit(1);
  }

  console.log('🔎 === COMPARE ORIGINAL vs COPY (DISPLAY/TBL) ===');
  console.log('Original:', originalNodeId);
  console.log('Copy    :', copyNodeId);

  const [orig, copy] = await Promise.all([fetchNode(originalNodeId), fetchNode(copyNodeId)]);

  if (!orig) {
    console.error('❌ Original introuvable en DB');
    process.exit(2);
  }
  if (!copy) {
    console.error('❌ Copie introuvable en DB');
    process.exit(3);
  }

  if (orig.treeId !== copy.treeId) {
    console.warn('⚠️ TreeId différent entre original et copie:', { orig: orig.treeId, copy: copy.treeId });
  }

  console.log('\n🧾 1) Résumé');
  console.log('   - label:', orig.label, '→', copy.label);
  console.log('   - type/subType:', `${orig.type}/${orig.subType ?? '∅'}`, '→', `${copy.type}/${copy.subType ?? '∅'}`);
  console.log('   - fieldType:', orig.fieldType ?? '∅', '→', copy.fieldType ?? '∅');
  console.log('   - flags:', {
    orig: { hasData: orig.hasData, hasFormula: orig.hasFormula, hasCondition: orig.hasCondition, hasTable: orig.hasTable },
    copy: { hasData: copy.hasData, hasFormula: copy.hasFormula, hasCondition: copy.hasCondition, hasTable: copy.hasTable }
  });
  console.log('   - calculatedValue:', orig.calculatedValue ?? '∅', '→', copy.calculatedValue ?? '∅');

  console.log('\n🧩 2) Diffs (propriétés clés)');
  const keyA: Record<string, unknown> = {
    treeId: orig.treeId,
    parentId: orig.parentId,
    type: orig.type,
    subType: orig.subType,
    label: orig.label,
    fieldType: orig.fieldType,
    fieldSubType: orig.fieldSubType,
    hasData: orig.hasData,
    hasFormula: orig.hasFormula,
    hasCondition: orig.hasCondition,
    hasTable: orig.hasTable,
    hasAPI: orig.hasAPI,
    data_activeId: orig.data_activeId,
    formula_activeId: orig.formula_activeId,
    condition_activeId: orig.condition_activeId,
    table_activeId: orig.table_activeId,
    linkedVariableIds: orig.linkedVariableIds,
    linkedFormulaIds: orig.linkedFormulaIds,
    linkedConditionIds: orig.linkedConditionIds,
    linkedTableIds: orig.linkedTableIds
  };

  const keyB: Record<string, unknown> = {
    treeId: copy.treeId,
    parentId: copy.parentId,
    type: copy.type,
    subType: copy.subType,
    label: copy.label,
    fieldType: copy.fieldType,
    fieldSubType: copy.fieldSubType,
    hasData: copy.hasData,
    hasFormula: copy.hasFormula,
    hasCondition: copy.hasCondition,
    hasTable: copy.hasTable,
    hasAPI: copy.hasAPI,
    data_activeId: copy.data_activeId,
    formula_activeId: copy.formula_activeId,
    condition_activeId: copy.condition_activeId,
    table_activeId: copy.table_activeId,
    linkedVariableIds: copy.linkedVariableIds,
    linkedFormulaIds: copy.linkedFormulaIds,
    linkedConditionIds: copy.linkedConditionIds,
    linkedTableIds: copy.linkedTableIds
  };

  const diffs = diffObjects(keyA, keyB);
  if (diffs.length === 0) {
    console.log('   ✅ Aucune différence sur les propriétés clés');
  } else {
    for (const d of diffs) {
      console.log(`   - ${d.key}:`);
      console.log('       orig:', stableStringify(d.a).replace(/\n/g, '\n       '));
      console.log('       copy:', stableStringify(d.b).replace(/\n/g, '\n       '));
    }
  }

  console.log('\n🧷 3) Metadata (extraits utiles)');
  const metaOrig = pickMeta(orig.metadata);
  const metaCopy = pickMeta(copy.metadata);
  console.log('   orig:', stableStringify(metaOrig));
  console.log('   copy:', stableStringify(metaCopy));

  console.log('\n🧠 4) Instances (résumé)');
  console.log('   data_instances     :', summarizeJson(orig.data_instances), '→', summarizeJson(copy.data_instances));
  console.log('   formula_instances  :', summarizeJson(orig.formula_instances), '→', summarizeJson(copy.formula_instances));
  console.log('   condition_instances:', summarizeJson(orig.condition_instances), '→', summarizeJson(copy.condition_instances));
  console.log('   table_instances    :', summarizeJson(orig.table_instances), '→', summarizeJson(copy.table_instances));
  console.log('   table_meta         :', summarizeJson(orig.table_meta), '→', summarizeJson(copy.table_meta));

  console.log('\n🧾 5) Formules / conditions / variables liées');
  const [formulas, conditions, variables, tables] = await Promise.all([
    prisma.treeBranchLeafNodeFormula.findMany({
      where: { nodeId: { in: [orig.id, copy.id] } },
      select: { id: true, nodeId: true, name: true, isDefault: true, order: true, targetProperty: true, constraintMessage: true, tokens: true },
      orderBy: [{ nodeId: 'asc' }, { order: 'asc' }]
    }),
    prisma.treeBranchLeafNodeCondition.findMany({
      where: { nodeId: { in: [orig.id, copy.id] } },
      select: { id: true, nodeId: true, name: true, isDefault: true, order: true, conditionSet: true },
      orderBy: [{ nodeId: 'asc' }, { order: 'asc' }]
    }),
    prisma.treeBranchLeafNodeVariable.findMany({
      where: { id: { in: Array.from(new Set([...(orig.linkedVariableIds || []), ...(copy.linkedVariableIds || [])])) } },
      select: { id: true, nodeId: true, exposedKey: true, displayName: true, sourceType: true, sourceRef: true, fixedValue: true, unit: true },
      orderBy: [{ id: 'asc' }]
    }),
    prisma.treeBranchLeafNodeTable.findMany({
      where: { nodeId: { in: [orig.id, copy.id] } },
      select: {
        id: true,
        nodeId: true,
        name: true,
        type: true,
        isDefault: true,
        order: true,
        lookupSelectColumn: true,
        lookupDisplayColumns: true,
        columnCount: true,
        rowCount: true,
        meta: true,
        tableColumns: {
          select: { id: true, columnIndex: true, name: true, type: true, format: true },
          orderBy: { columnIndex: 'asc' }
        },
        tableRows: {
          select: { id: true, rowIndex: true },
          orderBy: { rowIndex: 'asc' },
          take: 5
        }
      },
      orderBy: [{ nodeId: 'asc' }, { order: 'asc' }]
    })
  ]);

  const formulasOrig = formulas.filter((f) => f.nodeId === orig.id);
  const formulasCopy = formulas.filter((f) => f.nodeId === copy.id);
  const conditionsOrig = conditions.filter((c) => c.nodeId === orig.id);
  const conditionsCopy = conditions.filter((c) => c.nodeId === copy.id);
  const tablesOrig = tables.filter((t) => t.nodeId === orig.id);
  const tablesCopy = tables.filter((t) => t.nodeId === copy.id);

  console.log(`   - formulas: orig=${formulasOrig.length} copy=${formulasCopy.length}`);
  console.log(`   - conditions: orig=${conditionsOrig.length} copy=${conditionsCopy.length}`);
  console.log(`   - linkedVariableIds: orig=${orig.linkedVariableIds.length} copy=${copy.linkedVariableIds.length} (unique fetched=${variables.length})`);
  console.log(`   - tables: orig=${tablesOrig.length} copy=${tablesCopy.length} (table_activeId: orig=${orig.table_activeId ?? '∅'} copy=${copy.table_activeId ?? '∅'})`);

  if (formulasOrig.length || formulasCopy.length) {
    console.log('\n   📌 Formules (résumé par nom/targetProperty)');
    for (const f of formulasOrig) {
      console.log(`     orig - ${f.name} (target=${f.targetProperty ?? '∅'}) default=${f.isDefault}`);
    }
    for (const f of formulasCopy) {
      console.log(`     copy - ${f.name} (target=${f.targetProperty ?? '∅'}) default=${f.isDefault}`);
    }
  }

  if (conditionsOrig.length || conditionsCopy.length) {
    console.log('\n   📌 Conditions (noms)');
    for (const c of conditionsOrig) {
      console.log(`     orig - ${c.name} default=${c.isDefault}`);
    }
    for (const c of conditionsCopy) {
      console.log(`     copy - ${c.name} default=${c.isDefault}`);
    }
  }

  if (variables.length) {
    console.log('\n   🔗 Variables liées (id → exposedKey/sourceRef)');
    for (const v of variables) {
      console.log(`     - ${v.id} nodeId=${v.nodeId} key=${v.exposedKey ?? '∅'} source=${v.sourceType ?? '∅'} ref=${v.sourceRef ?? '∅'}`);
    }
  }

  if (tablesOrig.length || tablesCopy.length) {
    console.log('\n   📋 Tables (résumé)');
    const printTables = (label: 'orig' | 'copy', nodeTables: typeof tablesOrig, activeId: string | null, linkedIds: string[]) => {
      const activeExists = activeId ? nodeTables.some((t) => t.id === activeId) : false;
      console.log(`     ${label} - linkedTableIds: ${linkedIds.length ? linkedIds.join(', ') : '∅'}`);
      console.log(`     ${label} - table_activeId: ${activeId ?? '∅'} (existsOnNodeTables=${activeExists})`);
      const defaults = nodeTables.filter((t) => t.isDefault);
      console.log(`     ${label} - default tables: ${defaults.length ? defaults.map((t) => t.id).join(', ') : '∅'}`);
      for (const t of nodeTables) {
        const columnsPreview = t.tableColumns.slice(0, 6).map((c) => `${c.columnIndex}:${c.name}`).join(' | ');
        console.log(
          `     ${label} - table ${t.id} name="${t.name}" type=${t.type} default=${t.isDefault} order=${t.order} cols=${t.columnCount} rows=${t.rowCount} lookupSelect=${t.lookupSelectColumn ?? '∅'} previewCols=[${columnsPreview}] sampleRows=${t.tableRows.length}`
        );
      }
    };

    printTables('orig', tablesOrig, orig.table_activeId, orig.linkedTableIds);
    printTables('copy', tablesCopy, copy.table_activeId, copy.linkedTableIds);
  }

  console.log('\n🧪 6) Hypothèse ciblée sur l’affichage du champ copié');
  if (copy.calculatedValue === '0') {
    console.log('   ⚠️ La copie a calculatedValue="0".');
    console.log('   ⚠️ Dans le contrôleur GET /api/tree-nodes/:nodeId/calculated-value, il existe un filtre qui considère "0" comme une valeur non valide pour certains display fields.');
    console.log('   → Symptôme typique: la valeur est bien calculée (=0) mais le backend ne la renvoie pas, donc l’UI affiche ---.');
  } else {
    console.log('   - calculatedValue(copy) n’est pas "0"; vérifier plutôt les IDs de capacités / metadata copiée (copiedFromNodeId, linkedVariableIds, etc.).');
  }

  console.log('\n✅ Comparaison terminée (lecture seule).');
}

main()
  .catch((e) => {
    console.error('❌ Erreur script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
