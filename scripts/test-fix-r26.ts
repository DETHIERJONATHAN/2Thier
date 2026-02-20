/**
 * Script de test: Force la réévaluation de la soumission la plus récente
 * et vérifie que Prix TVAC est correctement calculé (FIX R26)
 */
import { db as prisma } from '../src/lib/database';

const PRIX_TVAC_NODE_ID = '2f0c0d37-ae97-405e-8fae-0a07680e2183';
const SUBMISSION_ID = 'tbl-1771444669258-cxn2a45sk';
const TREE_ID = 'cmf1mwoz10005gooked1j6orn';

const DEPS = [
  { id: 'de947d33-b42a-4c3d-a821-cf3577d6ef6a', name: 'Cable DC TVAC' },
  { id: '7add8e2f-01a4-4475-9189-dba0792d711c', name: 'Cale AC TVAC' },
  { id: '8d8729fc-5916-4778-9cc0-95128f536c58', name: "Main d'œuvre TVAC" },
  { id: '09f7a8fa-6b1c-4b59-8cc6-b345735fe987', name: 'Matériaux TVAC' },
  { id: '9e1e6f82-4669-4101-a00c-fcb574503b4b', name: 'Optimiseur TVAC' },
  { id: '86f2b8cb-c32c-4f01-b3e8-792b10da5841-sum-total', name: 'Onduleur TVAC sum-total' },
  { id: '095c3064-281f-4671-8e10-2cbb400366b4-sum-total', name: 'PV TVAC sum-total' },
  { id: '3042cac2-20b7-4b0b-b1e9-850a6c132846', name: 'Transport TVA' },
];

async function main() {
  console.log('=== AVANT RÉÉVALUATION ===');
  
  // 1. Vérifier les valeurs actuelles
  for (const dep of DEPS) {
    const sd = await prisma.treeBranchLeafSubmissionData.findUnique({
      where: { submissionId_nodeId: { submissionId: SUBMISSION_ID, nodeId: dep.id } },
      select: { value: true }
    });
    console.log(`  ${dep.name}: ${sd?.value ?? 'NULL'}`);
  }
  
  const prixTvac = await prisma.treeBranchLeafSubmissionData.findUnique({
    where: { submissionId_nodeId: { submissionId: SUBMISSION_ID, nodeId: PRIX_TVAC_NODE_ID } },
    select: { value: true, sourceRef: true, operationResult: true }
  });
  console.log(`  Prix TVAC: value=${prixTvac?.value ?? 'NULL'} sourceRef=${prixTvac?.sourceRef} operationResult=${JSON.stringify(prixTvac?.operationResult)}`);

  // 2. Importer et appeler l'évaluateur
  console.log('\n=== RÉÉVALUATION EN COURS (mode open) ===');
  
  // Dynamically import the evaluator
  const evalModule = await import('../src/components/TreeBranchLeaf/tbl-bridge/routes/tbl-submission-evaluator');
  
  // L'évaluateur est exporté comme router. On doit appeler evaluateCapacitiesForSubmission directement
  // Mais si ce n'est pas exporté, on peut simuler via l'API avec auth
  
  // Alternative: appeler directement la DB pour simuler le résultat de la formule
  // Vérifions plutôt manuellement l'ordre topologique
  
  // 3. Charger les capacités et vérifier l'ordre de tri
  const [variablesRaw, formulasRaw] = await Promise.all([
    prisma.treeBranchLeafNodeVariable.findMany({
      where: { TreeBranchLeafNode: { treeId: TREE_ID }, sourceRef: { not: null } },
      include: { TreeBranchLeafNode: { select: { id: true, label: true, fieldType: true, type: true } } }
    }),
    prisma.treeBranchLeafNodeFormula.findMany({
      where: { 
        nodeId: {
          in: (await prisma.treeBranchLeafNode.findMany({
            where: { treeId: TREE_ID, hasFormula: true },
            select: { id: true }
          })).map(n => n.id)
        }
      }
    })
  ]);

  const formulaNodes = await prisma.treeBranchLeafNode.findMany({
    where: { id: { in: formulasRaw.map(f => f.nodeId) } },
    select: { id: true, label: true, fieldType: true, type: true }
  });
  const nodeMap = new Map(formulaNodes.map(n => [n.id, n]));

  const capacitiesRawAll = [
    ...variablesRaw.map(v => ({ nodeId: v.nodeId, sourceRef: v.sourceRef, TreeBranchLeafNode: v.TreeBranchLeafNode })),
    ...formulasRaw.map(f => ({ nodeId: f.nodeId, sourceRef: `formula:${f.id}`, TreeBranchLeafNode: nodeMap.get(f.nodeId) }))
  ];
  const seen = new Set<string>();
  const capacitiesRaw = capacitiesRawAll.filter(c => { if (seen.has(c.nodeId)) return false; seen.add(c.nodeId); return true; });

  // displayCapNodeIds
  const displayCapNodeIds = new Set<string>();
  for (const c of capacitiesRaw) {
    if (c.TreeBranchLeafNode?.fieldType === 'DISPLAY' || c.TreeBranchLeafNode?.type === 'DISPLAY' || c.TreeBranchLeafNode?.type === 'leaf_field') {
      displayCapNodeIds.add(c.nodeId);
    }
    if (c.nodeId.endsWith('-sum-total')) displayCapNodeIds.add(c.nodeId);
  }

  // Build displayDeps from formula tokens (simplified)
  const displayDeps = new Map<string, Set<string>>();
  const allFormulas = new Map<string, Array<{ tokens: unknown; id: string }>>();
  const formulasById = new Map<string, { tokens: unknown; nodeId: string }>();
  for (const f of formulasRaw) {
    if (!allFormulas.has(f.nodeId)) allFormulas.set(f.nodeId, []);
    allFormulas.get(f.nodeId)!.push({ tokens: f.tokens as unknown, id: f.id });
    formulasById.set(f.id, { tokens: f.tokens as unknown, nodeId: f.nodeId });
  }

  function collectRefs(data: unknown, out: Set<string>) {
    if (!data) return;
    if (Array.isArray(data)) { for (const i of data) collectRefs(i, out); return; }
    if (typeof data === 'string') {
      const s = data.trim();
      const id = s.replace(/^@value\./, '').replace(/^@calculated\./, '').replace(/^@table\./, '')
        .replace(/^@select\./, '').replace(/^node-formula:/, '').replace(/^node-table:/, '')
        .replace(/^node-condition:/, '').replace(/^node-variable:/, '').replace(/^condition:/, '')
        .replace(/^formula:/, '').trim();
      if (id && id.length > 8 && !id.startsWith('.') && !id.startsWith('_')) out.add(id);
    }
    if (typeof data === 'object' && data !== null) { for (const v of Object.values(data as any)) collectRefs(v, out); }
  }

  for (const displayNodeId of displayCapNodeIds) {
    const refs = new Set<string>();
    const formulas = allFormulas.get(displayNodeId) || [];
    for (const f of formulas) collectRefs(f.tokens, refs);
    // Transitive
    const visited = new Set<string>();
    function resolve(data: unknown) {
      if (!data) return;
      if (Array.isArray(data)) { for (const i of data) resolve(i); return; }
      if (typeof data === 'string' && data.startsWith('node-formula:')) {
        const fId = data.slice('node-formula:'.length).trim();
        if (fId && !visited.has(fId)) { visited.add(fId); const cf = formulasById.get(fId); if (cf?.tokens) { collectRefs(cf.tokens, refs); resolve(cf.tokens); } }
      }
      if (typeof data === 'object' && data !== null) { for (const v of Object.values(data as any)) resolve(v); }
    }
    for (const f of formulas) resolve(f.tokens);
    refs.delete(displayNodeId);
    for (const refId of refs) {
      if (refId.includes('.')) continue;
      if (displayCapNodeIds.has(refId)) {
        if (!displayDeps.has(displayNodeId)) displayDeps.set(displayNodeId, new Set());
        displayDeps.get(displayNodeId)!.add(refId);
      }
    }
  }

  // Topo order
  const topoOrder = new Map<string, number>();
  function computeDepth(nodeId: string, visited: Set<string>): number {
    if (topoOrder.has(nodeId)) return topoOrder.get(nodeId)!;
    if (visited.has(nodeId)) return 0;
    visited.add(nodeId);
    const deps = displayDeps.get(nodeId);
    let max = 0;
    if (deps) { for (const d of deps) max = Math.max(max, computeDepth(d, visited) + 1); }
    topoOrder.set(nodeId, max);
    return max;
  }
  for (const nid of displayCapNodeIds) computeDepth(nid, new Set());

  // Sort like FIX R26
  const sortedCapacities = [...capacitiesRaw].sort((a, b) => {
    const aIsDisplay = displayCapNodeIds.has(a.nodeId) ? 1 : 0;
    const bIsDisplay = displayCapNodeIds.has(b.nodeId) ? 1 : 0;
    if (aIsDisplay !== bIsDisplay) return aIsDisplay - bIsDisplay;
    const aDepth = topoOrder.get(a.nodeId) || 0;
    const bDepth = topoOrder.get(b.nodeId) || 0;
    if (aDepth !== bDepth) return aDepth - bDepth;
    const aIsSumFormula = a.sourceRef?.includes('sum-formula') || a.sourceRef?.includes('sum-total') ? 1 : 0;
    const bIsSumFormula = b.sourceRef?.includes('sum-formula') || b.sourceRef?.includes('sum-total') ? 1 : 0;
    return aIsSumFormula - bIsSumFormula;
  });

  // Find Prix TVAC and its deps positions
  const prixTvacIdx = sortedCapacities.findIndex(c => c.nodeId === PRIX_TVAC_NODE_ID);
  const prixTvacDepth = topoOrder.get(PRIX_TVAC_NODE_ID) || 0;
  console.log(`\nPrix TVAC position: ${prixTvacIdx}/${sortedCapacities.length}, depth=${prixTvacDepth}`);
  console.log(`Prix TVAC deps:`);
  const prixTvacDeps = displayDeps.get(PRIX_TVAC_NODE_ID);
  if (prixTvacDeps) {
    for (const depId of prixTvacDeps) {
      const depIdx = sortedCapacities.findIndex(c => c.nodeId === depId);
      const depDepth = topoOrder.get(depId) || 0;
      const cap = sortedCapacities.find(c => c.nodeId === depId);
      const isBefore = depIdx < prixTvacIdx;
      console.log(`  ${depId.substring(0,12)}... pos=${depIdx} depth=${depDepth} before_prix_tvac=${isBefore} label=${cap?.TreeBranchLeafNode?.label || 'sum-total'}`);
    }
  } else {
    console.log('  ⚠️ NO DEPS DETECTED! This is the bug - displayDeps for Prix TVAC is empty');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
