#!/usr/bin/env node

/**
 * 🔍 DIAGNOSTIC COMPLET — Champs DISPLAY sans valeur calculée
 * 
 * Ce script identifie les champs DISPLAY qui DEVRAIENT calculer mais ne le font pas,
 * en analysant :
 *   1. Les capacités de chaque champ (formula, condition, table, link)
 *   2. Les dépendances (tokens des formules) et si elles ont une valeur
 *   3. Les SubmissionData scopées par submission
 *   4. Le valueMap théorique (inputs remplis ou non)
 * 
 * Usage :
 *   npx tsx --env-file=.env scripts/diagnose-display-fields.ts [--treeId <ID>] [--submissionId <ID>]
 * 
 * Sans arguments, il prend le dernier arbre et la dernière submission.
 */

import { db } from '../src/lib/database';

const prisma = db;

// ── Parsing args ──
function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return undefined;
}

// ── Helpers ──
function extractNodeIdsFromTokens(tokens: unknown[]): Set<string> {
  const ids = new Set<string>();
  if (!Array.isArray(tokens)) return ids;
  for (const t of tokens) {
    let raw: string | null = null;
    if (typeof t === 'string') raw = t;
    else if (t && typeof t === 'object' && 'value' in t) raw = (t as any).value;
    if (!raw || typeof raw !== 'string') continue;
    if (['+', '-', '*', '/', '(', ')', ','].includes(raw.trim())) continue;
    // Extraire l'ID après @value. @calculated. @select. etc.
    let id = raw
      .replace(/@value\./g, '')
      .replace(/@calculated\./g, '')
      .replace(/@table\./g, '')
      .replace(/@select\./g, '')
      .replace(/^formula:/, '')
      .replace(/^condition:/, '')
      .replace(/^node-formula:/, '')
      .replace(/^node-condition:/, '')
      .replace(/^node-table:/, '')
      .replace(/^table:/, '')
      .trim();
    if (id.includes('.')) id = id.split('.')[0];
    // Valider que c'est un ID plausible (UUID, node_xxx, shared-ref-xxx)
    if (/^[a-f0-9]{8}/.test(id) || /^node_/.test(id) || /^shared-ref-/.test(id)) {
      ids.add(id);
    }
  }
  return ids;
}

function extractNodeIdsFromConditionSet(cs: any): Set<string> {
  const ids = new Set<string>();
  if (!cs || typeof cs !== 'object') return ids;
  function walk(obj: any) {
    if (!obj) return;
    if (typeof obj === 'string' && (obj.startsWith('@value.') || obj.startsWith('@select.'))) {
      ids.add(obj.replace('@value.', '').replace('@select.', '').split('.')[0]);
    }
    if (obj.ref && typeof obj.ref === 'string') {
      const cleaned = obj.ref.replace('@value.', '').replace('@select.', '').split('.')[0];
      if (/^[a-f0-9]{8}/.test(cleaned) || /^node_/.test(cleaned)) ids.add(cleaned);
    }
    if (obj.left) walk(obj.left);
    if (obj.right) walk(obj.right);
    if (obj.value) walk(obj.value);
    if (Array.isArray(obj.branches)) for (const b of obj.branches) walk(b);
    if (obj.when) walk(obj.when);
    if (obj.then) walk(obj.then);
    if (obj.else) walk(obj.else);
    if (obj.default) walk(obj.default);
  }
  walk(cs);
  return ids;
}

// ── Types ──
interface DisplayFieldReport {
  nodeId: string;
  label: string;
  capacities: string[];
  sourceRef: string | null;
  formulaTokens: unknown[] | null;
  depNodeIds: string[];
  depStatus: Array<{ nodeId: string; label: string; hasValue: boolean; value: string | null; source: string }>;
  submissionValue: string | null;
  submissionSource: string | null;
  lastResolved: Date | null;
  calculatedValueGlobal: string | null;
  allDepsHaveValue: boolean;
  status: 'OK' | 'BROKEN' | 'MISSING_DEPS' | 'NO_CAPACITY' | 'NO_SUBMISSION';
  reason: string;
}

// ── Main ──
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  🔍 DIAGNOSTIC — DISPLAY FIELDS SANS VALEUR CALCULÉE      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  let treeId = getArg('treeId');
  let submissionId = getArg('submissionId');

  // ── 1. Trouver le tree ──
  if (!treeId) {
    const trees = await prisma.treeBranchLeafTree.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { id: true, name: true, organizationId: true, updatedAt: true }
    });
    if (trees.length === 0) { console.log('❌ Aucun arbre trouvé.'); return; }
    console.log('📋 Arbres récents (on prend le premier) :');
    for (const t of trees) {
      console.log(`   ${t.id === trees[0].id ? '→' : ' '} ${t.name} (${t.id.slice(0, 12)}…) org=${t.organizationId} maj=${t.updatedAt?.toISOString().slice(0, 10)}`);
    }
    treeId = trees[0].id;
  }
  console.log(`\n🌳 Tree ID: ${treeId}\n`);

  // ── 2. Trouver la submission ──
  if (!submissionId) {
    const subs = await prisma.treeBranchLeafSubmission.findMany({
      where: { treeId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { id: true, status: true, updatedAt: true, leadId: true }
    });
    if (subs.length === 0) { console.log('❌ Aucune submission trouvée pour ce tree.'); return; }
    console.log('📋 Submissions récentes (on prend la première) :');
    for (const s of subs) {
      console.log(`   ${s.id === subs[0].id ? '→' : ' '} ${s.id.slice(0, 20)}… status=${s.status} lead=${s.leadId?.slice(0, 12) || '-'} maj=${s.updatedAt?.toISOString().slice(0, 19)}`);
    }
    submissionId = subs[0].id;
  }
  console.log(`📝 Submission ID: ${submissionId}\n`);

  // ── 3. Charger TOUS les nœuds de l'arbre ──
  const allNodes = await prisma.treeBranchLeafNode.findMany({
    where: { treeId },
    select: {
      id: true, label: true, type: true, fieldType: true,
      hasFormula: true, hasCondition: true, hasTable: true, hasData: true, hasLink: true,
      calculatedValue: true,
      formula_activeId: true, condition_activeId: true, table_activeId: true,
      linkedVariableIds: true, linkedFormulaIds: true, linkedConditionIds: true, linkedTableIds: true,
      link_targetNodeId: true, link_targetTreeId: true, link_mode: true,
    }
  });
  const nodeMap = new Map(allNodes.map(n => [n.id, n]));
  console.log(`📦 ${allNodes.length} nœuds chargés pour cet arbre.\n`);

  // ── 4. Identifier les DISPLAY fields ──
  const displayNodes = allNodes.filter(n =>
    n.fieldType === 'DISPLAY' || n.type === 'DISPLAY' || n.type === 'leaf_field'
  );
  console.log(`🖥️  ${displayNodes.length} champs DISPLAY identifiés.\n`);

  // ── 5. Charger les variables, formules et conditions liées ──
  const [variables, formulas, conditions] = await Promise.all([
    prisma.treeBranchLeafNodeVariable.findMany({
      where: { TreeBranchLeafNode: { treeId } },
      select: { id: true, nodeId: true, exposedKey: true, displayName: true, sourceRef: true, sourceType: true, fixedValue: true }
    }),
    prisma.treeBranchLeafNodeFormula.findMany({
      where: { nodeId: { in: allNodes.map(n => n.id) } },
      select: { id: true, nodeId: true, name: true, tokens: true, isDefault: true }
    }),
    prisma.treeBranchLeafNodeCondition.findMany({
      where: { nodeId: { in: allNodes.map(n => n.id) } },
      select: { id: true, nodeId: true, name: true, conditionSet: true }
    })
  ]);
  const varByNode = new Map(variables.map(v => [v.nodeId, v]));
  const formulaByNode = new Map<string, typeof formulas[0][]>();
  for (const f of formulas) {
    if (!formulaByNode.has(f.nodeId)) formulaByNode.set(f.nodeId, []);
    formulaByNode.get(f.nodeId)!.push(f);
  }
  const condByNode = new Map<string, typeof conditions[0][]>();
  for (const c of conditions) {
    if (!condByNode.has(c.nodeId)) condByNode.set(c.nodeId, []);
    condByNode.get(c.nodeId)!.push(c);
  }

  // ── 6. Charger les SubmissionData pour cette submission ──
  const submissionData = await prisma.treeBranchLeafSubmissionData.findMany({
    where: { submissionId },
    select: { nodeId: true, value: true, operationSource: true, operationResult: true, lastResolved: true, sourceRef: true }
  });
  const sdMap = new Map(submissionData.map(sd => [sd.nodeId, sd]));
  console.log(`💾 ${submissionData.length} SubmissionData chargées pour cette submission.\n`);

  // ── 7. Construire le rapport pour chaque DISPLAY field ──
  const reports: DisplayFieldReport[] = [];
  let brokenCount = 0;
  let missingDepsCount = 0;
  let okCount = 0;
  let noCapsCount = 0;

  for (const node of displayNodes) {
    const caps: string[] = [];
    if (node.hasFormula) caps.push('FORMULA');
    if (node.hasCondition) caps.push('CONDITION');
    if (node.hasTable) caps.push('TABLE');
    if (node.hasLink) caps.push('LINK');
    if (node.hasData) caps.push('DATA');

    const variable = varByNode.get(node.id);
    const nodeFormulas = formulaByNode.get(node.id) || [];
    const nodeConditions = condByNode.get(node.id) || [];
    const sd = sdMap.get(node.id);

    // Déterminer le sourceRef effectif
    let sourceRef: string | null = variable?.sourceRef || null;
    if (!sourceRef && node.formula_activeId) sourceRef = `formula:${node.formula_activeId}`;
    if (!sourceRef && nodeFormulas.length > 0) sourceRef = `formula:${nodeFormulas[0].id}`;
    if (!sourceRef && node.condition_activeId) sourceRef = `condition:${node.condition_activeId}`;
    if (!sourceRef && node.table_activeId) sourceRef = `table:${node.table_activeId}`;

    // Extraire les tokens de la formule active
    let activeFormula = nodeFormulas.find(f => f.id === node.formula_activeId);
    if (!activeFormula && nodeFormulas.length > 0) activeFormula = nodeFormulas.find(f => f.isDefault) || nodeFormulas[0];
    const formulaTokens = activeFormula?.tokens as unknown[] | null;

    // Collecter les dépendances (nodeIds référencés dans formules ET conditions)
    const depNodeIds = new Set<string>();
    if (formulaTokens) {
      for (const id of extractNodeIdsFromTokens(formulaTokens)) depNodeIds.add(id);
    }
    for (const cond of nodeConditions) {
      for (const id of extractNodeIdsFromConditionSet(cond.conditionSet)) depNodeIds.add(id);
    }
    // Si sourceRef pointe vers une autre formule/condition, résoudre aussi
    if (variable?.sourceRef) {
      const refMatch = variable.sourceRef.match(/^(?:formula|condition|node-formula|node-condition):(.+)/);
      if (refMatch) {
        const refId = refMatch[1];
        const refFormula = formulas.find(f => f.id === refId);
        if (refFormula?.tokens) {
          for (const id of extractNodeIdsFromTokens(refFormula.tokens as unknown[])) depNodeIds.add(id);
        }
        const refCond = conditions.find(c => c.id === refId);
        if (refCond?.conditionSet) {
          for (const id of extractNodeIdsFromConditionSet(refCond.conditionSet)) depNodeIds.add(id);
        }
      }
    }

    // Vérifier le statut de chaque dépendance
    const depStatus: DisplayFieldReport['depStatus'] = [];
    for (const depId of depNodeIds) {
      const depNode = nodeMap.get(depId);
      const depSD = sdMap.get(depId);
      const hasValue = !!(depSD?.value && depSD.value.trim() !== '' && depSD.value !== '∅') 
        || !!(depNode?.calculatedValue && depNode.calculatedValue.trim() !== '');
      const value = depSD?.value || depNode?.calculatedValue || null;
      const source = depSD ? 'submissionData' : depNode?.calculatedValue ? 'calculatedValue' : 'aucune';
      depStatus.push({
        nodeId: depId,
        label: depNode?.label || '(inconnu)',
        hasValue,
        value: value ? String(value).slice(0, 50) : null,
        source
      });
    }

    const allDepsHaveValue = depStatus.length === 0 || depStatus.every(d => d.hasValue);

    // Déterminer le statut final
    let status: DisplayFieldReport['status'];
    let reason: string;

    const hasSubmissionValue = !!(sd?.value && sd.value.trim() !== '' && sd.value !== '∅');
    const hasCapacity = caps.length > 0 || !!sourceRef;

    if (!hasCapacity) {
      status = 'NO_CAPACITY';
      reason = 'Aucune capacité de calcul (pas de formula, condition, table, link)';
      noCapsCount++;
    } else if (hasSubmissionValue) {
      status = 'OK';
      reason = `Valeur = "${sd!.value}" (source: ${sd!.operationSource || 'inconnue'})`;
      okCount++;
    } else if (!allDepsHaveValue) {
      status = 'MISSING_DEPS';
      const missingDeps = depStatus.filter(d => !d.hasValue).map(d => `"${d.label}" (${d.nodeId.slice(0, 8)})`);
      reason = `Dépendances manquantes: ${missingDeps.join(', ')}`;
      missingDepsCount++;
    } else {
      status = 'BROKEN';
      reason = `Toutes les ${depStatus.length} dépendances ont une valeur MAIS le champ n'a PAS de valeur calculée`;
      brokenCount++;
    }

    reports.push({
      nodeId: node.id,
      label: node.label || '(sans nom)',
      capacities: caps,
      sourceRef,
      formulaTokens,
      depNodeIds: [...depNodeIds],
      depStatus,
      submissionValue: sd?.value || null,
      submissionSource: sd?.operationSource || null,
      lastResolved: sd?.lastResolved || null,
      calculatedValueGlobal: node.calculatedValue,
      allDepsHaveValue,
      status,
      reason
    });
  }

  // ── 8. Affichage du rapport ──
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    📊 RAPPORT DIAGNOSTIC                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  console.log(`  ✅ OK (valeur calculée présente)   : ${okCount}`);
  console.log(`  🔴 BROKEN (deps OK mais pas de val) : ${brokenCount}`);
  console.log(`  🟡 MISSING_DEPS (deps manquantes)   : ${missingDepsCount}`);
  console.log(`  ⚪ NO_CAPACITY (pas de formule)      : ${noCapsCount}`);
  console.log(`  ─── Total display fields            : ${reports.length}\n`);

  // ── 8a. Détails des BROKEN (le plus important) ──
  const brokenReports = reports.filter(r => r.status === 'BROKEN');
  if (brokenReports.length > 0) {
    console.log('═══════════════════ 🔴 CHAMPS BROKEN ═══════════════════════');
    console.log('(Toutes les dépendances ont une valeur, MAIS le champ n\'a pas de résultat)\n');
    for (const r of brokenReports) {
      console.log(`  🔴 "${r.label}" — ${r.nodeId}`);
      console.log(`     Capacités : ${r.capacities.join(', ') || 'AUCUNE'}`);
      console.log(`     SourceRef : ${r.sourceRef || 'NULL'}`);
      if (r.formulaTokens) {
        const tokenStr = (r.formulaTokens as any[]).map(t => typeof t === 'string' ? t : (t?.value || JSON.stringify(t))).join(' ');
        console.log(`     Formule   : ${tokenStr.slice(0, 120)}`);
      }
      console.log(`     Submission: value=${r.submissionValue || 'NULL'} source=${r.submissionSource || 'NULL'} resolved=${r.lastResolved?.toISOString() || 'jamais'}`);
      console.log(`     CalcGlobal: ${r.calculatedValueGlobal || 'NULL'}`);
      console.log(`     Dépendances (${r.depStatus.length}) — toutes OK :`);
      for (const d of r.depStatus) {
        console.log(`       ${d.hasValue ? '✅' : '❌'} "${d.label}" (${d.nodeId.slice(0, 8)}…) = ${d.value || 'NULL'} [${d.source}]`);
      }
      console.log('');
    }
  }

  // ── 8b. Détails des MISSING_DEPS ──
  const missingDepsReports = reports.filter(r => r.status === 'MISSING_DEPS');
  if (missingDepsReports.length > 0) {
    console.log('═══════════════ 🟡 CHAMPS AVEC DEPS MANQUANTES ═════════════');
    console.log('(Le champ ne peut pas calculer car une ou plusieurs dépendances n\'ont pas de valeur)\n');
    for (const r of missingDepsReports) {
      console.log(`  🟡 "${r.label}" — ${r.nodeId.slice(0, 16)}…`);
      console.log(`     Capacités: ${r.capacities.join(', ')}`);
      const missing = r.depStatus.filter(d => !d.hasValue);
      const filled = r.depStatus.filter(d => d.hasValue);
      console.log(`     Deps remplies : ${filled.length}/${r.depStatus.length}`);
      for (const d of missing) {
        console.log(`       ❌ "${d.label}" (${d.nodeId.slice(0, 8)}…) — ${d.source}`);
      }
      console.log('');
    }
  }

  // ── 8c. Résumé OK ──
  const okReports = reports.filter(r => r.status === 'OK');
  if (okReports.length > 0) {
    console.log('═══════════════════ ✅ CHAMPS OK (résumé) ═══════════════════\n');
    for (const r of okReports) {
      const val = r.submissionValue ? r.submissionValue.slice(0, 40) : 'NULL';
      console.log(`  ✅ "${r.label}" = ${val} [${r.submissionSource}]`);
    }
    console.log('');
  }

  // ── 8d. Résumé NO_CAPACITY ──
  const noCapReports = reports.filter(r => r.status === 'NO_CAPACITY');
  if (noCapReports.length > 0) {
    console.log('═══════════════ ⚪ CHAMPS SANS CAPACITÉ (résumé) ════════════\n');
    for (const r of noCapReports) {
      console.log(`  ⚪ "${r.label}" — ${r.nodeId.slice(0, 16)}…`);
    }
    console.log('');
  }

  // ── 9. Diagnostic approfondi pour BROKEN fields: vérifier le pipeline d'évaluation ──
  if (brokenReports.length > 0) {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  🔬 DIAGNOSTIC APPROFONDI — POURQUOI CES CHAMPS NE        ║');
    console.log('║     CALCULENT PAS MALGRÉ TOUTES LES DEPS REMPLIES ?       ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    for (const r of brokenReports) {
      console.log(`\n  ──── "${r.label}" (${r.nodeId}) ────`);
      const node = nodeMap.get(r.nodeId)!;
      
      // Check 1: Le nœud a-t-il une variable ?
      const variable = varByNode.get(r.nodeId);
      console.log(`  [CHECK 1] Variable associée: ${variable ? `OUI (sourceRef=${variable.sourceRef}, sourceType=${variable.sourceType})` : 'NON'}`);
      
      // Check 2: Le nœud a-t-il une formule active ?
      const activeFormulaId = node.formula_activeId;
      const nFormulas = (formulaByNode.get(r.nodeId) || []).length;
      console.log(`  [CHECK 2] formula_activeId: ${activeFormulaId || 'NULL'} (${nFormulas} formule(s) au total)`);
      
      // Check 3: Le nœud a-t-il une condition active ?
      const activeCondId = node.condition_activeId;
      const nConds = (condByNode.get(r.nodeId) || []).length;
      console.log(`  [CHECK 3] condition_activeId: ${activeCondId || 'NULL'} (${nConds} condition(s) au total)`);
      
      // Check 4: Le nœud est-il dans les capacitiesRaw ? (a une variable avec sourceRef OU hasFormula)
      const inCapacitiesViaVariable = variable?.sourceRef !== null && variable?.sourceRef !== undefined;
      const inCapacitiesViaFormula = node.hasFormula;
      console.log(`  [CHECK 4] Dans capacities via variable (sourceRef): ${inCapacitiesViaVariable ? 'OUI' : 'NON'}`);
      console.log(`  [CHECK 4] Dans capacities via formula (hasFormula): ${inCapacitiesViaFormula ? 'OUI' : 'NON'}`);
      
      if (!inCapacitiesViaVariable && !inCapacitiesViaFormula) {
        console.log(`  ⚠️  CAUSE PROBABLE: Le nœud n'est PAS dans capacitiesRaw !`);
        console.log(`     → Si sourceRef est NULL et hasFormula est false, l'évaluateur ne le traite PAS.`);
        console.log(`     → Vérifier si le nœud devrait avoir une variable avec sourceRef ou hasFormula=true.`);
        
        // Check : a-t-il une condition mais pas dans capacities ?
        if (node.hasCondition || nConds > 0) {
          console.log(`  ⚠️  Le nœud a hasCondition=${node.hasCondition} et ${nConds} condition(s), MAIS PAS de variable avec sourceRef !`);
          console.log(`     → L'évaluateur ne le verra QUE si hasFormula=true ou variable.sourceRef != null`);
          console.log(`     → FIX: Créer une variable avec sourceRef="condition:<condId>" ou mettre hasFormula=true`);
        }
      }
      
      // Check 5: Linked IDs cohérents ?
      console.log(`  [CHECK 5] linkedVariableIds: ${node.linkedVariableIds?.length || 0} | linkedFormulaIds: ${node.linkedFormulaIds?.length || 0} | linkedConditionIds: ${node.linkedConditionIds?.length || 0}`);
      
      // Check 6: Le SmartCalculatedField fronted peut-il le recalculer ?
      // Il faut sourceRef dans la variable OU dans SubmissionData
      const sdSourceRef = sdMap.get(r.nodeId)?.sourceRef;
      console.log(`  [CHECK 6] SubmissionData.sourceRef: ${sdSourceRef || 'NULL'} (nécessaire pour SmartCalculatedField)`);
      
      // Check 7a: Le controleur GET peut-il le recalculer ?
      const canRecalc = (node.fieldType === 'DISPLAY' || node.type === 'DISPLAY' || node.type === 'leaf_field')
        && (node.hasTable || !!variable?.sourceRef?.startsWith('formula:') || !!variable?.sourceRef?.startsWith('condition:')
            || !!variable?.sourceRef?.startsWith('node-table:') || node.hasFormula);
      console.log(`  [CHECK 7] canRecalculateDisplayField (GET controller): ${canRecalc ? 'OUI' : 'NON'}`);
      if (!canRecalc) {
        console.log(`     → Le GET /calculated-value retournera NULL au lieu de recalculer`);
      }
    }
  }

  // ── 10. Statistiques capacities pipeline ──
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  📊 STATISTIQUES DU PIPELINE DE CAPACITÉS                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  const variablesWithSourceRef = variables.filter(v => v.sourceRef);
  const nodesWithFormula = allNodes.filter(n => n.hasFormula);
  const displayWithVariable = displayNodes.filter(n => varByNode.has(n.id));
  const displayWithFormula = displayNodes.filter(n => n.hasFormula);
  const displayWithCondition = displayNodes.filter(n => n.hasCondition);
  const displayWithTable = displayNodes.filter(n => n.hasTable);
  const displayWithNoCapacityEntry = displayNodes.filter(n => {
    const v = varByNode.get(n.id);
    return (!v || !v.sourceRef) && !n.hasFormula;
  });

  console.log(`  Variables totales avec sourceRef : ${variablesWithSourceRef.length}`);
  console.log(`  Nœuds totaux avec hasFormula     : ${nodesWithFormula.length}`);
  console.log('');
  console.log(`  DISPLAY avec variable            : ${displayWithVariable.length} / ${displayNodes.length}`);
  console.log(`  DISPLAY avec hasFormula           : ${displayWithFormula.length} / ${displayNodes.length}`);
  console.log(`  DISPLAY avec hasCondition         : ${displayWithCondition.length} / ${displayNodes.length}`);
  console.log(`  DISPLAY avec hasTable             : ${displayWithTable.length} / ${displayNodes.length}`);
  console.log(`  DISPLAY HORS capacities (⚠️)      : ${displayWithNoCapacityEntry.length} / ${displayNodes.length}`);
  
  if (displayWithNoCapacityEntry.length > 0) {
    console.log('\n  ⚠️  Les champs DISPLAY suivants ne sont PAS dans le pipeline de capacités :');
    console.log('     (Ils ne seront JAMAIS évalués par l\'évaluateur create-and-evaluate !)\n');
    for (const n of displayWithNoCapacityEntry) {
      const caps = [
        n.hasFormula && 'FORMULA', n.hasCondition && 'CONDITION',
        n.hasTable && 'TABLE', n.hasLink && 'LINK', n.hasData && 'DATA'
      ].filter(Boolean).join(', ') || 'AUCUNE';
      const v = varByNode.get(n.id);
      console.log(`     ⚠️  "${n.label}" (${n.id.slice(0, 16)}…)`);
      console.log(`        flags: ${caps}`);
      console.log(`        variable: ${v ? `id=${v.id.slice(0, 12)}… sourceRef=${v.sourceRef || 'NULL'} sourceType=${v.sourceType}` : 'AUCUNE'}`);
      if (n.condition_activeId) console.log(`        condition_activeId: ${n.condition_activeId}`);
      if (n.formula_activeId) console.log(`        formula_activeId: ${n.formula_activeId}`);
      console.log('');
    }
  }

  console.log('\n✅ Diagnostic terminé.\n');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('❌ Erreur fatale:', err);
  process.exit(1);
});
