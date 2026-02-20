#!/usr/bin/env node
/**
 * Diagnostic complet du champ "Prix TVAC" (2f0c0d37-ae97-405e-8fae-0a07680e2183)
 */
import { db } from '../src/lib/database';

async function main() {
  const nodeId = '2f0c0d37-ae97-405e-8fae-0a07680e2183';

  // 1. Node complet
  const node = await db.treeBranchLeafNode.findUnique({ where: { id: nodeId }, select: {
    id: true, label: true, type: true, subType: true, fieldType: true,
    hasFormula: true, hasCondition: true, hasTable: true, hasData: true, hasLink: true,
    formula_activeId: true, condition_activeId: true, table_activeId: true,
    link_targetNodeId: true, link_targetTreeId: true, link_mode: true,
    calculatedValue: true, treeId: true, parentId: true,
    linkedVariableIds: true, linkedFormulaIds: true, linkedConditionIds: true, linkedTableIds: true,
    isSharedReference: true, sharedReferenceId: true,
    metadata: true
  }});
  console.log('=== NODE ===');
  console.log(JSON.stringify(node, null, 2));

  if (!node) {
    console.log('NODE NOT FOUND!');
    await db.$disconnect();
    return;
  }

  // 2. Variable
  const variable = await db.treeBranchLeafNodeVariable.findFirst({ where: { nodeId }, select: {
    id: true, sourceRef: true, sourceType: true, exposedKey: true, displayName: true,
    fixedValue: true, selectedNodeId: true, metadata: true
  }});
  console.log('\n=== VARIABLE ===');
  console.log(JSON.stringify(variable, null, 2));

  // 3. Formules
  const formulas = await db.treeBranchLeafNodeFormula.findMany({ where: { nodeId }, select: {
    id: true, name: true, tokens: true, isDefault: true, targetProperty: true
  }});
  console.log('\n=== FORMULAS (' + formulas.length + ') ===');
  for (const f of formulas) {
    const tokenStr = Array.isArray(f.tokens)
      ? (f.tokens as any[]).map((t: any) => typeof t === 'string' ? t : t?.value || t?.type || JSON.stringify(t)).join(' ')
      : 'NULL';
    console.log('Formula:', f.id, '| name:', f.name, '| default:', f.isDefault, '| target:', f.targetProperty);
    console.log('  tokens:', tokenStr.slice(0, 400));
  }

  // 4. Conditions
  const conditions = await db.treeBranchLeafNodeCondition.findMany({ where: { nodeId }, select: {
    id: true, name: true, conditionSet: true
  }});
  console.log('\n=== CONDITIONS (' + conditions.length + ') ===');
  for (const c of conditions) console.log(JSON.stringify(c).slice(0, 400));

  // 5. Table
  if (node.table_activeId) {
    const table = await db.treeBranchLeafNodeTable.findFirst({ where: { id: node.table_activeId }, select: { id: true, meta: true }});
    console.log('\n=== TABLE ===');
    console.log(JSON.stringify(table?.meta, null, 2));
  }

  // 6. SubmissionData (toutes les submissions)
  const sds = await db.treeBranchLeafSubmissionData.findMany({ where: { nodeId }, select: {
    submissionId: true, value: true, operationSource: true, sourceRef: true, operationResult: true
  }});
  console.log('\n=== SUBMISSION DATA (' + sds.length + ') ===');
  for (const sd of sds) {
    console.log(sd.submissionId.slice(0,35), '| val:', (sd.value || 'NULL').slice(0,50), '| src:', (sd.sourceRef || 'NULL').slice(0,40), '| opResult:', JSON.stringify(sd.operationResult)?.slice(0,50));
  }

  // 7. Pipeline check
  const inPipeline = Boolean((variable && variable.sourceRef) || node.hasFormula);
  console.log('\n=== PIPELINE ===');
  console.log('inCapacitiesRaw:', inPipeline);
  console.log('hasFormula:', node.hasFormula, '| formula_activeId:', node.formula_activeId);
  console.log('variable.sourceRef:', variable?.sourceRef || 'NULL');

  // 8. Si formule, analyser les dépendances
  if (formulas.length > 0) {
    console.log('\n=== DEPENDENCIES (from formula tokens) ===');
    const depNodeIds = new Set<string>();
    for (const f of formulas) {
      if (!Array.isArray(f.tokens)) continue;
      for (const t of f.tokens as any[]) {
        const val = typeof t === 'string' ? t : t?.value || '';
        // @calculated.nodeId, @value.nodeId, @select.nodeId
        const match = val.match(/@(?:calculated|value|select|table)\.([a-f0-9-]+)/);
        if (match) depNodeIds.add(match[1]);
        // node-formula:formulaId
        if (val.startsWith('node-formula:')) {
          const fId = val.slice('node-formula:'.length);
          const refFormula = await db.treeBranchLeafNodeFormula.findFirst({ where: { id: fId }, select: { nodeId: true }});
          if (refFormula) depNodeIds.add(refFormula.nodeId);
        }
      }
    }
    
    if (depNodeIds.size > 0) {
      console.log('Depends on', depNodeIds.size, 'nodes:');
      const depNodes = await db.treeBranchLeafNode.findMany({
        where: { id: { in: Array.from(depNodeIds) } },
        select: { id: true, label: true, subType: true, hasFormula: true }
      });
      
      // Check values in active submissions
      const activeSubs = ['tbl-1771335550570-x1602d0nj', 'tbl-1771444669258-cxn2a45sk'];
      for (const depNode of depNodes) {
        const depSds = await db.treeBranchLeafSubmissionData.findMany({
          where: { nodeId: depNode.id, submissionId: { in: activeSubs } },
          select: { submissionId: true, value: true }
        });
        const valMap = new Map(depSds.map(s => [s.submissionId.slice(0,15), s.value?.slice(0,30) || 'NULL']));
        console.log(`  "${depNode.label}" (${depNode.subType}) ${depNode.id.slice(0,12)} → draft=${valMap.get('tbl-1771335550') || 'NULL'} lead=${valMap.get('tbl-1771444669') || 'NULL'}`);
      }
    }
  }

  // 9. Parent info
  if (node.parentId) {
    const parent = await db.treeBranchLeafNode.findUnique({ where: { id: node.parentId }, select: { id: true, label: true, type: true, subType: true }});
    console.log('\n=== PARENT ===');
    console.log(JSON.stringify(parent));
  }

  await db.$disconnect();
}
main().catch(console.error);
