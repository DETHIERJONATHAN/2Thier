#!/usr/bin/env node
/**
 * DIAGNOSTIC DISPLAY (subType='display') — Champs qui ne calculent pas
 * Usage: npx tsx --env-file=.env scripts/diagnose-display-v2.ts [--submissionId <ID>]
 */
import { db } from '../src/lib/database';
const prisma = db;

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return (idx !== -1 && idx + 1 < process.argv.length) ? process.argv[idx + 1] : undefined;
}

async function main() {
  const treeId = 'cmf1mwoz10005gooked1j6orn';
  let submissionId = getArg('submissionId');

  if (!submissionId) {
    const subs = await prisma.treeBranchLeafSubmission.findMany({
      where: { treeId },
      orderBy: { updatedAt: 'desc' },
      take: 3,
      select: { id: true, status: true, updatedAt: true }
    });
    if (subs.length === 0) { console.log('Aucune submission'); return; }
    submissionId = subs[0].id;
    console.log('Submissions récentes:');
    for (const s of subs) console.log(`  ${s.id === submissionId ? '→' : ' '} ${s.id} (${s.status}) ${s.updatedAt?.toISOString().slice(0,19)}`);
  }
  console.log(`\nTree: ${treeId}\nSubmission: ${submissionId}\n`);

  // 1. Charger les DISPLAY = subType='display'
  const displayNodes = await prisma.treeBranchLeafNode.findMany({
    where: { treeId, subType: 'display' },
    select: {
      id: true, label: true, type: true, subType: true, fieldType: true,
      hasFormula: true, hasCondition: true, hasTable: true, hasData: true, hasLink: true,
      calculatedValue: true, formula_activeId: true, condition_activeId: true, table_activeId: true,
      linkedVariableIds: true, linkedFormulaIds: true, linkedConditionIds: true,
    }
  });
  console.log(`${displayNodes.length} champs DISPLAY (subType=display) trouvés.\n`);

  // 2. Variables
  const variables = await prisma.treeBranchLeafNodeVariable.findMany({
    where: { nodeId: { in: displayNodes.map(n => n.id) } },
    select: { nodeId: true, sourceRef: true, sourceType: true, exposedKey: true, displayName: true }
  });
  const varByNode = new Map(variables.map(v => [v.nodeId, v]));

  // 3. Formules actives
  const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
    where: { nodeId: { in: displayNodes.map(n => n.id) } },
    select: { id: true, nodeId: true, name: true, tokens: true, isDefault: true }
  });
  const formulasByNode = new Map<string, typeof formulas>();
  for (const f of formulas) {
    if (!formulasByNode.has(f.nodeId)) formulasByNode.set(f.nodeId, []);
    formulasByNode.get(f.nodeId)!.push(f);
  }

  // 4. Conditions
  const conditions = await prisma.treeBranchLeafNodeCondition.findMany({
    where: { nodeId: { in: displayNodes.map(n => n.id) } },
    select: { id: true, nodeId: true, name: true }
  });
  const condsByNode = new Map<string, typeof conditions>();
  for (const c of conditions) {
    if (!condsByNode.has(c.nodeId)) condsByNode.set(c.nodeId, []);
    condsByNode.get(c.nodeId)!.push(c);
  }

  // 5. SubmissionData
  const sds = await prisma.treeBranchLeafSubmissionData.findMany({
    where: { submissionId, nodeId: { in: displayNodes.map(n => n.id) } },
    select: { nodeId: true, value: true, operationSource: true, sourceRef: true, lastResolved: true }
  });
  const sdMap = new Map(sds.map(sd => [sd.nodeId, sd]));

  // 6. Catégoriser
  const ok: Array<{label: string; id: string; value: string; source: string; caps: string[]}> = [];
  const broken: Array<any> = [];
  const noCapacity: Array<{label: string; id: string}> = [];

  for (const n of displayNodes) {
    const variable = varByNode.get(n.id);
    const sd = sdMap.get(n.id);
    const nodeFormulas = formulasByNode.get(n.id) || [];
    const nodeConds = condsByNode.get(n.id) || [];
    
    const hasSubmValue = Boolean(sd?.value && sd.value.trim() !== '' && sd.value !== '∅');

    const caps: string[] = [];
    if (n.hasFormula) caps.push('FORMULA');
    if (n.hasCondition) caps.push('CONDITION');
    if (n.hasTable) caps.push('TABLE');
    if (n.hasLink) caps.push('LINK');
    if (n.hasData) caps.push('DATA');

    // Peut-il calculer ? (a au moins une source)
    const hasSourceRefInVar = Boolean(variable?.sourceRef);
    const hasAnyCap = caps.length > 0 || hasSourceRefInVar
      || Boolean(n.formula_activeId) || Boolean(n.condition_activeId) || Boolean(n.table_activeId);

    // Est-il dans le pipeline capacitiesRaw de l'évaluateur ?
    // capacitiesRaw = variables avec sourceRef + nodes avec hasFormula
    const inCapacitiesRaw = hasSourceRefInVar || n.hasFormula;

    if (hasSubmValue) {
      ok.push({ label: n.label || '?', id: n.id, value: sd!.value!.slice(0, 50), source: sd!.operationSource || '?', caps });
    } else if (hasAnyCap) {
      broken.push({
        label: n.label || '?', id: n.id, caps,
        inCapacitiesRaw,
        varSourceRef: variable?.sourceRef || null,
        varSourceType: variable?.sourceType || null,
        hasFormula: n.hasFormula,
        hasCondition: n.hasCondition,
        hasTable: n.hasTable,
        hasLink: n.hasLink,
        formulaActiveId: n.formula_activeId,
        condActiveId: n.condition_activeId,
        tableActiveId: n.table_activeId,
        calcGlobal: n.calculatedValue?.slice(0, 50) || null,
        nFormulas: nodeFormulas.length,
        nConds: nodeConds.length,
        formulaTokens: nodeFormulas.length > 0 
          ? (nodeFormulas[0].tokens as any[])?.map((t: any) => typeof t === 'string' ? t : t?.value).join(' ').slice(0, 100) 
          : null,
      });
    } else {
      noCapacity.push({ label: n.label || '?', id: n.id });
    }
  }

  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║           📊 RAPPORT DISPLAY (subType=display)      ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  console.log(`  ✅ OK (valeur calculée)      : ${ok.length}`);
  console.log(`  🔴 BROKEN (cap mais pas val) : ${broken.length}`);
  console.log(`  ⚪ Pas de capacité du tout   : ${noCapacity.length}`);
  console.log(`  ─── Total                    : ${displayNodes.length}\n`);

  // BROKEN détaillés
  if (broken.length > 0) {
    console.log('═══════════════════ 🔴 BROKEN ═══════════════════════\n');
    
    // Sous-catégoriser les broken
    const brokenNotInPipeline = broken.filter(b => !b.inCapacitiesRaw);
    const brokenInPipeline = broken.filter(b => b.inCapacitiesRaw);
    
    if (brokenNotInPipeline.length > 0) {
      console.log(`  --- HORS pipeline capacitiesRaw (${brokenNotInPipeline.length}) ---`);
      console.log('  (Ces champs ont des capacités mais ne sont pas vus par l\'évaluateur)\n');
      for (const b of brokenNotInPipeline) {
        console.log(`  🔴 "${b.label}" — ${b.id}`);
        console.log(`     flags: ${b.caps.join(', ') || 'AUCUN'} | variable.sourceRef=${b.varSourceRef || 'NULL'} | hasFormula=${b.hasFormula}`);
        if (b.formulaActiveId) console.log(`     formula_activeId=${b.formulaActiveId} (${b.nFormulas} formule(s))`);
        if (b.condActiveId) console.log(`     condition_activeId=${b.condActiveId} (${b.nConds} condition(s))`);
        if (b.tableActiveId) console.log(`     table_activeId=${b.tableActiveId}`);
        if (b.hasLink) console.log(`     hasLink=true`);
        if (b.calcGlobal) console.log(`     calculatedValue(global)=${b.calcGlobal}`);
        console.log(`     ⚠️  CAUSE: Pas de variable.sourceRef ET hasFormula=false → ignoré par capacitiesRaw`);
        console.log('');
      }
    }

    if (brokenInPipeline.length > 0) {
      console.log(`  --- DANS le pipeline capacitiesRaw (${brokenInPipeline.length}) ---`);
      console.log('  (Ces champs sont dans le pipeline mais n\'ont pas de valeur)\n');
      for (const b of brokenInPipeline) {
        console.log(`  🔴 "${b.label}" — ${b.id}`);
        console.log(`     flags: ${b.caps.join(', ')} | sourceRef=${b.varSourceRef} | hasFormula=${b.hasFormula}`);
        if (b.formulaTokens) console.log(`     tokens: ${b.formulaTokens}`);
        if (b.calcGlobal) console.log(`     calculatedValue(global)=${b.calcGlobal}`);
        console.log('');
      }
    }
  }

  // OK résumé
  console.log('═══════════════════ ✅ OK ═══════════════════════\n');
  for (const o of ok) {
    console.log(`  ✅ "${o.label}" = ${o.value} [${o.source}]`);
  }

  // No cap
  if (noCapacity.length > 0) {
    console.log(`\n═══════════════════ ⚪ PAS DE CAPACITÉ (${noCapacity.length}) ═══════════════════════\n`);
    for (const nc of noCapacity) {
      console.log(`  ⚪ "${nc.label}"`);
    }
  }

  console.log('\n✅ Diagnostic terminé.');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
