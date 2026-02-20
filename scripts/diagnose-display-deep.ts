#!/usr/bin/env node
/**
 * DIAGNOSTIC APPROFONDI — Pourquoi ces DISPLAY ne calculent pas ?
 * Analyse CHAQUE champ broken : sa config, ses dépendances, son pipeline.
 * 
 * Usage: npx tsx --env-file=.env scripts/diagnose-display-deep.ts
 */
import { db } from '../src/lib/database';
const prisma = db;

async function main() {
  const treeId = 'cmf1mwoz10005gooked1j6orn';
  // Prendre la submission la plus active (celle avec lead)
  const subWithLead = 'tbl-1771444669258-cxn2a45sk';
  // Et le default-draft le plus récent
  const subDefaultDraft = 'tbl-1771335550570-x1602d0nj';

  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  🔬 DIAGNOSTIC APPROFONDI — DISPLAY FIELDS BROKEN          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // 1. Charger TOUS les DISPLAY (subType='display')
  const displayNodes = await prisma.treeBranchLeafNode.findMany({
    where: { treeId, subType: 'display' },
    select: {
      id: true, label: true, type: true, subType: true, fieldType: true,
      hasFormula: true, hasCondition: true, hasTable: true, hasData: true, hasLink: true,
      calculatedValue: true,
      formula_activeId: true, condition_activeId: true, table_activeId: true,
      linkedVariableIds: true, linkedFormulaIds: true, linkedConditionIds: true, linkedTableIds: true,
      link_targetNodeId: true, link_targetTreeId: true, link_mode: true,
      metadata: true, parentId: true,
      isSharedReference: true, sharedReferenceId: true, sharedReferenceName: true,
    }
  });

  // Variables
  const allVars = await prisma.treeBranchLeafNodeVariable.findMany({
    where: { nodeId: { in: displayNodes.map(n => n.id) } },
    select: { id: true, nodeId: true, sourceRef: true, sourceType: true, exposedKey: true, displayName: true, fixedValue: true, selectedNodeId: true }
  });
  const varByNode = new Map(allVars.map(v => [v.nodeId, v]));

  // Formules
  const allFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
    where: { nodeId: { in: displayNodes.map(n => n.id) } },
    select: { id: true, nodeId: true, name: true, tokens: true, isDefault: true, targetProperty: true }
  });
  const formulasByNode = new Map<string, typeof allFormulas>();
  for (const f of allFormulas) {
    if (!formulasByNode.has(f.nodeId)) formulasByNode.set(f.nodeId, []);
    formulasByNode.get(f.nodeId)!.push(f);
  }

  // Conditions  
  const allConds = await prisma.treeBranchLeafNodeCondition.findMany({
    where: { nodeId: { in: displayNodes.map(n => n.id) } },
    select: { id: true, nodeId: true, name: true, conditionSet: true }
  });
  const condsByNode = new Map<string, typeof allConds>();
  for (const c of allConds) {
    if (!condsByNode.has(c.nodeId)) condsByNode.set(c.nodeId, []);
    condsByNode.get(c.nodeId)!.push(c);
  }

  // Tables (tableConfig est un champ JSON sur le node, pas un model séparé)
  // On récupère tableConfig directement depuis les nodes qui ont hasTable
  const tableNodes = displayNodes.filter(n => n.hasTable || n.table_activeId);
  const tableConfigs = await prisma.treeBranchLeafNode.findMany({
    where: { id: { in: tableNodes.map(n => n.id) } },
    select: { id: true, tableConfig: true }
  });
  const tableConfigByNode = new Map(tableConfigs.map(t => [t.id, t.tableConfig as any]));

  // SubmissionData pour les 2 submissions
  const [sdsLead, sdsDraft] = await Promise.all([
    prisma.treeBranchLeafSubmissionData.findMany({
      where: { submissionId: subWithLead, nodeId: { in: displayNodes.map(n => n.id) } },
      select: { nodeId: true, value: true, operationSource: true, sourceRef: true }
    }),
    prisma.treeBranchLeafSubmissionData.findMany({
      where: { submissionId: subDefaultDraft, nodeId: { in: displayNodes.map(n => n.id) } },
      select: { nodeId: true, value: true, operationSource: true, sourceRef: true }
    })
  ]);
  const sdLeadMap = new Map(sdsLead.map(sd => [sd.nodeId, sd]));
  const sdDraftMap = new Map(sdsDraft.map(sd => [sd.nodeId, sd]));

  // Identifier les broken
  const broken: typeof displayNodes = [];
  const noCap: typeof displayNodes = [];

  for (const n of displayNodes) {
    const v = varByNode.get(n.id);
    const sdLead = sdLeadMap.get(n.id);
    const sdDraft = sdDraftMap.get(n.id);
    const hasValLead = Boolean(sdLead?.value && sdLead.value.trim() !== '' && sdLead.value !== '∅');
    const hasValDraft = Boolean(sdDraft?.value && sdDraft.value.trim() !== '' && sdDraft.value !== '∅');

    const hasAnyCap = n.hasFormula || n.hasCondition || n.hasTable || n.hasLink || n.hasData
      || Boolean(v?.sourceRef) || Boolean(n.formula_activeId) || Boolean(n.condition_activeId) || Boolean(n.table_activeId);

    if (!hasAnyCap) {
      noCap.push(n);
    } else if (!hasValLead || !hasValDraft) {
      broken.push(n);
    }
  }

  // ══════════════ ANALYSE DES BROKEN ══════════════
  console.log(`\n📊 ${broken.length} champs DISPLAY avec capacité MAIS sans valeur dans au moins 1 submission\n`);

  // Catégoriser par type de problème
  const linkBroken: typeof displayNodes = [];
  const tableBroken: typeof displayNodes = [];
  const condBroken: typeof displayNodes = [];
  const formulaBroken: typeof displayNodes = [];
  const otherBroken: typeof displayNodes = [];

  for (const n of broken) {
    if (n.hasLink && !n.hasFormula && !n.hasCondition && !n.hasTable) linkBroken.push(n);
    else if (n.hasTable && !n.hasFormula && !n.hasCondition) tableBroken.push(n);
    else if (n.hasCondition) condBroken.push(n);
    else if (n.hasFormula) formulaBroken.push(n);
    else otherBroken.push(n);
  }

  // ── LINK FIELDS ──
  if (linkBroken.length > 0) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`🔗 LINK FIELDS BROKEN (${linkBroken.length})`);
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('EXPLICATION: Les LINK fields copient la valeur d\'un autre nœud.');
    console.log('Ils sont résolus par FIX R21b dans le valueMap, MAIS ne sont PAS');
    console.log('dans capacitiesRaw (pas de variable.sourceRef, pas de hasFormula).');
    console.log('→ La valeur est dans le valueMap en mémoire mais JAMAIS persistée\n');

    for (const n of linkBroken) {
      const v = varByNode.get(n.id);
      const sdLead = sdLeadMap.get(n.id);
      const sdDraft = sdDraftMap.get(n.id);
      
      // Résoudre le nœud cible
      let targetInfo = '(non configuré)';
      if (n.link_targetNodeId) {
        const targetNode = await prisma.treeBranchLeafNode.findUnique({
          where: { id: n.link_targetNodeId },
          select: { id: true, label: true, type: true, subType: true, treeId: true }
        });
        targetInfo = targetNode 
          ? `"${targetNode.label}" (${targetNode.type}/${targetNode.subType}) tree=${targetNode.treeId === treeId ? 'SAME' : targetNode.treeId?.slice(0,12)}`
          : `ID=${n.link_targetNodeId} (NOT FOUND!)`;
      }

      console.log(`  🔗 "${n.label}" — ${n.id}`);
      console.log(`     link_targetNodeId: ${n.link_targetNodeId || 'NULL'}`);
      console.log(`     link_targetTreeId: ${n.link_targetTreeId || 'NULL'}`);
      console.log(`     link_mode: ${n.link_mode || 'NULL'}`);
      console.log(`     → Cible: ${targetInfo}`);
      console.log(`     variable: ${v ? `sourceRef=${v.sourceRef || 'NULL'}, sourceType=${v.sourceType}` : 'AUCUNE'}`);
      console.log(`     inCapacitiesRaw: ${Boolean((v && v.sourceRef) || n.hasFormula)}`);
      console.log(`     Val(lead): ${sdLead?.value?.slice(0, 40) || 'NULL'} | Val(draft): ${sdDraft?.value?.slice(0, 40) || 'NULL'}`);
      console.log('');
    }

    console.log('  💡 ROOT CAUSE: L\'évaluateur construit capacitiesRaw depuis:');
    console.log('     1) Variables avec sourceRef != null');
    console.log('     2) Nodes avec hasFormula = true');
    console.log('     Les LINK fields n\'ont NI l\'un NI l\'autre.');
    console.log('     FIX R21b résout les links dans le valueMap MAIS ne les');
    console.log('     ajoute PAS dans computedValuesToStore → pas de SubmissionData.\n');
  }

  // ── TABLE FIELDS ──
  if (tableBroken.length > 0) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📋 TABLE LOOKUP FIELDS BROKEN (${tableBroken.length})`);
    console.log('═══════════════════════════════════════════════════════════\n');

    for (const n of tableBroken) {
      const v = varByNode.get(n.id);
      const sdLead = sdLeadMap.get(n.id);
      const sdDraft = sdDraftMap.get(n.id);
      const tableConf = tableConfigByNode.get(n.id);

      console.log(`  📋 "${n.label}" — ${n.id}`);
      console.log(`     hasTable: ${n.hasTable} | table_activeId: ${n.table_activeId || 'NULL'}`);
      if (tableConf) {
        console.log(`     tableConfig: ${JSON.stringify(tableConf).slice(0, 200)}`);
      }
      console.log(`     variable: ${v ? `sourceRef=${v.sourceRef || 'NULL'}, sourceType=${v.sourceType}` : 'AUCUNE'}`);
      console.log(`     inCapacitiesRaw: ${Boolean((v && v.sourceRef) || n.hasFormula)}`);
      console.log(`     Val(lead): ${sdLead?.value?.slice(0, 40) || 'NULL'} | Val(draft): ${sdDraft?.value?.slice(0, 40) || 'NULL'}`);
      console.log('');
    }
  }

  // ── CONDITION FIELDS ──  
  if (condBroken.length > 0) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`⚡ CONDITION FIELDS BROKEN (${condBroken.length})`);
    console.log('═══════════════════════════════════════════════════════════\n');

    for (const n of condBroken) {
      const v = varByNode.get(n.id);
      const conds = condsByNode.get(n.id) || [];
      const sdLead = sdLeadMap.get(n.id);
      const sdDraft = sdDraftMap.get(n.id);

      console.log(`  ⚡ "${n.label}" — ${n.id}`);
      console.log(`     hasCondition: ${n.hasCondition} | condition_activeId: ${n.condition_activeId || 'NULL'}`);
      console.log(`     conditions: ${conds.length} — ${conds.map(c => c.name || c.id.slice(0,8)).join(', ')}`);
      console.log(`     variable: ${v ? `sourceRef=${v.sourceRef || 'NULL'}, sourceType=${v.sourceType}` : 'AUCUNE'}`);
      console.log(`     inCapacitiesRaw: ${Boolean((v && v.sourceRef) || n.hasFormula)}`);
      console.log(`     Val(lead): ${sdLead?.value?.slice(0, 40) || 'NULL'} | Val(draft): ${sdDraft?.value?.slice(0, 40) || 'NULL'}`);
      console.log('');
    }
  }

  // ── FORMULA FIELDS ──
  if (formulaBroken.length > 0) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📐 FORMULA FIELDS BROKEN (${formulaBroken.length})`);
    console.log('═══════════════════════════════════════════════════════════\n');

    for (const n of formulaBroken) {
      const v = varByNode.get(n.id);
      const formulas = formulasByNode.get(n.id) || [];
      const sdLead = sdLeadMap.get(n.id);
      const sdDraft = sdDraftMap.get(n.id);

      console.log(`  📐 "${n.label}" — ${n.id}`);
      console.log(`     hasFormula: ${n.hasFormula} | formula_activeId: ${n.formula_activeId || 'NULL'}`);
      for (const f of formulas) {
        const tokenStr = Array.isArray(f.tokens) 
          ? (f.tokens as any[]).map((t: any) => typeof t === 'string' ? t : t?.value || JSON.stringify(t)).join(' ').slice(0, 100)
          : 'NULL';
        console.log(`     formula "${f.name || f.id.slice(0,8)}": ${tokenStr}`);
      }
      console.log(`     variable: ${v ? `sourceRef=${v.sourceRef || 'NULL'}, sourceType=${v.sourceType}` : 'AUCUNE'}`);
      console.log(`     inCapacitiesRaw: ${Boolean((v && v.sourceRef) || n.hasFormula)}`);
      console.log(`     Val(lead): ${sdLead?.value?.slice(0, 40) || 'NULL'} | Val(draft): ${sdDraft?.value?.slice(0, 40) || 'NULL'}`);
      console.log('');
    }
  }

  // ── OTHER BROKEN ──
  if (otherBroken.length > 0) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`❓ AUTRES FIELDS BROKEN (${otherBroken.length})`);
    console.log('═══════════════════════════════════════════════════════════\n');

    for (const n of otherBroken) {
      const v = varByNode.get(n.id);
      console.log(`  ❓ "${n.label}" — ${n.id}`);
      console.log(`     flags: F=${n.hasFormula} C=${n.hasCondition} T=${n.hasTable} L=${n.hasLink} D=${n.hasData}`);
      console.log(`     variable: ${v ? `sourceRef=${v.sourceRef || 'NULL'}` : 'AUCUNE'}`);
      console.log('');
    }
  }

  // ══════════════ ANALYSE DES "PAS DE CAPACITÉ" ══════════════
  if (noCap.length > 0) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`⚪ DISPLAY SANS AUCUNE CAPACITÉ (${noCap.length})`);
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('QUESTION: Ces champs DEVRAIENT-ils calculer ?\n');

    for (const n of noCap) {
      const v = varByNode.get(n.id);
      const formulas = formulasByNode.get(n.id) || [];
      const conds = condsByNode.get(n.id) || [];
      const sdLead = sdLeadMap.get(n.id);
      const sdDraft = sdDraftMap.get(n.id);
      const meta = n.metadata as any;

      console.log(`  ⚪ "${n.label}" — ${n.id}`);
      console.log(`     flags: F=${n.hasFormula} C=${n.hasCondition} T=${n.hasTable} L=${n.hasLink} D=${n.hasData}`);
      console.log(`     variable: ${v ? `sourceRef=${v.sourceRef || 'NULL'}, type=${v.sourceType}` : 'AUCUNE'}`);
      console.log(`     formulas DB: ${formulas.length} | conditions DB: ${conds.length}`);
      console.log(`     isSharedReference: ${n.isSharedReference} | sharedRefId: ${n.sharedReferenceId || 'NULL'}`);
      if (meta?.sourceTemplateId) console.log(`     copié de: ${meta.sourceTemplateId}`);
      if (meta?.copiedFromNodeId) console.log(`     copié de node: ${meta.copiedFromNodeId}`);
      console.log(`     formula_activeId: ${n.formula_activeId || 'NULL'}`);
      console.log(`     condition_activeId: ${n.condition_activeId || 'NULL'}`);
      console.log(`     table_activeId: ${n.table_activeId || 'NULL'}`);
      console.log(`     Val(lead): ${sdLead?.value?.slice(0, 40) || 'NULL'} | Val(draft): ${sdDraft?.value?.slice(0, 40) || 'NULL'}`);
      
      // Chercher si le nœud parent a des infos
      if (n.parentId) {
        const parent = await prisma.treeBranchLeafNode.findUnique({
          where: { id: n.parentId },
          select: { id: true, label: true, type: true, subType: true }
        });
        if (parent) console.log(`     parent: "${parent.label}" (${parent.type}/${parent.subType})`);
      }
      console.log('');
    }
  }

  // ══════════════ VÉRIFICATION FIX R21b ══════════════
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 VÉRIFICATION : FIX R21b résout-il les LINK fields ?');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Regarder tous les link nodes (même ceux dans capacitiesRaw)
  const linkNodes = displayNodes.filter(n => n.hasLink);
  console.log(`${linkNodes.length} DISPLAY nodes avec hasLink=true\n`);
  
  for (const n of linkNodes) {
    const v = varByNode.get(n.id);
    const sdLead = sdLeadMap.get(n.id);
    const inPipeline = Boolean((v && v.sourceRef) || n.hasFormula);
    
    let status = '?';
    if (sdLead?.value && sdLead.value.trim() !== '') status = '✅ A une valeur';
    else if (inPipeline) status = '🟡 Dans pipeline mais pas de valeur';
    else status = '🔴 HORS pipeline, pas de valeur';

    console.log(`  ${status} — "${n.label}" target=${n.link_targetNodeId?.slice(0,12) || 'NULL'} mode=${n.link_mode || 'NULL'}`);
  }

  console.log('\n✅ Diagnostic approfondi terminé.');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
