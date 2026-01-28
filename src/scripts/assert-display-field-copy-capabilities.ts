#!/usr/bin/env tsx

/**
 * ✅ ASSERT: capacités OK + cause racine (original vs copy)
 *
 * Lecture seule: aucune écriture DB.
 *
 * Usage:
 *   npx tsx src/scripts/assert-display-field-copy-capabilities.ts <originalNodeId> <copyNodeId>
 */

import { db } from '../lib/database';

const prisma = db;

type AssertResult = {
  ok: boolean;
  label: string;
  details?: string;
};

function ok(label: string, details?: string): AssertResult {
  return { ok: true, label, details };
}

function fail(label: string, details?: string): AssertResult {
  return { ok: false, label, details };
}

function print(results: AssertResult[]) {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;

  for (const r of results) {
    const prefix = r.ok ? '✅' : '❌';
    console.log(`${prefix} ${r.label}${r.details ? ` — ${r.details}` : ''}`);
  }

  console.log(`\n📌 Résumé: ${passed}/${results.length} OK, ${failed} FAIL`);
  if (failed > 0) process.exitCode = 2;
}

async function main() {
  const [originalNodeId, copyNodeId] = process.argv.slice(2);
  if (!originalNodeId || !copyNodeId) {
    console.error('Usage: npx tsx src/scripts/assert-display-field-copy-capabilities.ts <originalNodeId> <copyNodeId>');
    process.exit(1);
  }

  const [orig, copy] = await Promise.all([
    prisma.treeBranchLeafNode.findUnique({
      where: { id: originalNodeId },
      select: {
        id: true,
        label: true,
        type: true,
        subType: true,
        fieldType: true,
        hasData: true,
        hasFormula: true,
        hasCondition: true,
        hasTable: true,
        calculatedValue: true,
        data_activeId: true,
        formula_activeId: true,
        condition_activeId: true,
        table_activeId: true,
        linkedVariableIds: true,
        linkedFormulaIds: true,
        linkedConditionIds: true,
        linkedTableIds: true
      }
    }),
    prisma.treeBranchLeafNode.findUnique({
      where: { id: copyNodeId },
      select: {
        id: true,
        label: true,
        type: true,
        subType: true,
        fieldType: true,
        hasData: true,
        hasFormula: true,
        hasCondition: true,
        hasTable: true,
        calculatedValue: true,
        data_activeId: true,
        formula_activeId: true,
        condition_activeId: true,
        table_activeId: true,
        linkedVariableIds: true,
        linkedFormulaIds: true,
        linkedConditionIds: true,
        linkedTableIds: true
      }
    })
  ]);

  if (!orig) {
    console.error('❌ Original introuvable en DB:', originalNodeId);
    process.exit(2);
  }
  if (!copy) {
    console.error('❌ Copie introuvable en DB:', copyNodeId);
    process.exit(3);
  }

  console.log('🔎 ASSERT capacités (original vs copie)');
  console.log('Original:', orig.id, JSON.stringify(orig.label));
  console.log('Copie   :', copy.id, JSON.stringify(copy.label));
  console.log('');

  const results: AssertResult[] = [];

  // 1) Flags capacités
  results.push(
    orig.hasData === copy.hasData ? ok('hasData identique') : fail('hasData identique', `orig=${orig.hasData} copy=${copy.hasData}`)
  );
  results.push(
    orig.hasFormula === copy.hasFormula
      ? ok('hasFormula identique')
      : fail('hasFormula identique', `orig=${orig.hasFormula} copy=${copy.hasFormula}`)
  );
  results.push(
    orig.hasCondition === copy.hasCondition
      ? ok('hasCondition identique')
      : fail('hasCondition identique', `orig=${orig.hasCondition} copy=${copy.hasCondition}`)
  );
  results.push(
    orig.hasTable === copy.hasTable ? ok('hasTable identique') : fail('hasTable identique', `orig=${orig.hasTable} copy=${copy.hasTable}`)
  );

  // 2) Comptage réel des records (formules, conditions, tables)
  const [formulas, conditions, tables] = await Promise.all([
    prisma.treeBranchLeafNodeFormula.findMany({ where: { nodeId: { in: [orig.id, copy.id] } }, select: { id: true, nodeId: true } }),
    prisma.treeBranchLeafNodeCondition.findMany({ where: { nodeId: { in: [orig.id, copy.id] } }, select: { id: true, nodeId: true } }),
    prisma.treeBranchLeafNodeTable.findMany({ where: { nodeId: { in: [orig.id, copy.id] } }, select: { id: true, nodeId: true } })
  ]);

  const fo = formulas.filter((f) => f.nodeId === orig.id).length;
  const fc = formulas.filter((f) => f.nodeId === copy.id).length;
  const co = conditions.filter((c) => c.nodeId === orig.id).length;
  const cc = conditions.filter((c) => c.nodeId === copy.id).length;
  const to = tables.filter((t) => t.nodeId === orig.id).length;
  const tc = tables.filter((t) => t.nodeId === copy.id).length;

  results.push(fo === fc ? ok('Formules: même quantité', `count=${fo}`) : fail('Formules: même quantité', `orig=${fo} copy=${fc}`));
  results.push(co === cc ? ok('Conditions: même quantité', `count=${co}`) : fail('Conditions: même quantité', `orig=${co} copy=${cc}`));
  results.push(to === tc ? ok('Tables: même quantité', `count=${to}`) : fail('Tables: même quantité', `orig=${to} copy=${tc}`));

  // 3) Active IDs pointent-ils vers un record existant ?
  const formulaIdsOrig = new Set(formulas.filter((f) => f.nodeId === orig.id).map((f) => f.id));
  const formulaIdsCopy = new Set(formulas.filter((f) => f.nodeId === copy.id).map((f) => f.id));
  const conditionIdsOrig = new Set(conditions.filter((c) => c.nodeId === orig.id).map((c) => c.id));
  const conditionIdsCopy = new Set(conditions.filter((c) => c.nodeId === copy.id).map((c) => c.id));
  const tableIdsOrig = new Set(tables.filter((t) => t.nodeId === orig.id).map((t) => t.id));
  const tableIdsCopy = new Set(tables.filter((t) => t.nodeId === copy.id).map((t) => t.id));

  results.push(
    orig.formula_activeId && formulaIdsOrig.has(orig.formula_activeId)
      ? ok('Original: formula_activeId valide', orig.formula_activeId)
      : fail('Original: formula_activeId valide', `formula_activeId=${orig.formula_activeId ?? '∅'}`)
  );

  results.push(
    copy.formula_activeId && formulaIdsCopy.has(copy.formula_activeId)
      ? ok('Copie: formula_activeId valide', copy.formula_activeId)
      : fail('Copie: formula_activeId valide', `formula_activeId=${copy.formula_activeId ?? '∅'}`)
  );

  results.push(
    orig.condition_activeId && conditionIdsOrig.has(orig.condition_activeId)
      ? ok('Original: condition_activeId valide', orig.condition_activeId)
      : fail('Original: condition_activeId valide', `condition_activeId=${orig.condition_activeId ?? '∅'}`)
  );

  results.push(
    copy.condition_activeId && conditionIdsCopy.has(copy.condition_activeId)
      ? ok('Copie: condition_activeId valide', copy.condition_activeId)
      : fail('Copie: condition_activeId valide', `condition_activeId=${copy.condition_activeId ?? '∅'}`)
  );

  results.push(
    orig.table_activeId && tableIdsOrig.has(orig.table_activeId)
      ? ok('Original: table_activeId valide', orig.table_activeId)
      : fail('Original: table_activeId valide', `table_activeId=${orig.table_activeId ?? '∅'}`)
  );

  results.push(
    copy.table_activeId && tableIdsCopy.has(copy.table_activeId)
      ? ok('Copie: table_activeId valide', copy.table_activeId)
      : fail('Copie: table_activeId valide', `table_activeId=${copy.table_activeId ?? '∅'}`)
  );

  // 4) Variables liées: présence
  results.push(
    orig.linkedVariableIds.length === copy.linkedVariableIds.length
      ? ok('linkedVariableIds: même quantité', `count=${orig.linkedVariableIds.length}`)
      : fail('linkedVariableIds: même quantité', `orig=${orig.linkedVariableIds.length} copy=${copy.linkedVariableIds.length}`)
  );

  // 5) Valeur stockée
  results.push(
    orig.calculatedValue !== null ? ok('Original: calculatedValue présent', String(orig.calculatedValue)) : fail('Original: calculatedValue présent')
  );
  results.push(
    copy.calculatedValue !== null ? ok('Copie: calculatedValue présent', String(copy.calculatedValue)) : fail('Copie: calculatedValue présent')
  );

  // 6) Valeur 0: cas à part (0 est une valeur légitime et doit s'afficher)
  if (String(copy.calculatedValue ?? '') === '0') {
    results.push(
      ok(
        'Note: copie = "0"',
        '"0" doit être affiché (si l’UI montre --- c’est plutôt un souci de fetch/erreur, ou une autre valeur réellement ∅)'
      )
    );
  } else {
    results.push(ok('Copie != "0"', `copy.calculatedValue=${copy.calculatedValue ?? '∅'}`));
  }

  // 7) Résumé cause racine (informative)
  if (!copy.table_activeId) {
    results.push(
      ok(
        'Cause racine probable du "0"',
        'Copie a table_activeId=NULL : même si les tables existent, aucune table active n’est sélectionnée → lookup souvent retombe à 0'
      )
    );
  }

  print(results);
}

main()
  .catch((e) => {
    console.error('❌ Erreur script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
