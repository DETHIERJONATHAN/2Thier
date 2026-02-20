/**
 * Diagnostic: Analyse complete du tri topologique de Prix TVAC 
 * et de la résolution @calculated
 */
import { db as prisma } from '../src/lib/database';

const PRIX_TVAC_NODE_ID = '2f0c0d37-ae97-405e-8fae-0a07680e2183';
const FORMULA_ID = 'f69fbdba-5612-4329-ac16-278182c4d52d';
const TREE_ID = 'cmf1mwoz10005gooked1j6orn';

async function main() {
  // 1. Charger les tokens de la formule
  const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
    where: { id: FORMULA_ID },
    select: { id: true, nodeId: true, tokens: true }
  });
  
  console.log('=== FORMULA TOKENS ===');
  console.log(JSON.stringify(formula?.tokens, null, 2));

  // 2. Extraire les refs comme le ferait collectReferencedNodeIdsForTriggers
  const refs = new Set<string>();
  collectRefs(formula?.tokens, refs);
  console.log('\n=== COLLECTED REFS (via collectReferencedNodeIdsForTriggers simulation) ===');
  for (const ref of refs) {
    console.log(`  - ${ref}`);
  }

  // 3. Charger capacitiesRaw comme le fait l'évaluateur (variables + formulas)
  const [variablesRaw, formulasRawDB] = await Promise.all([
    prisma.treeBranchLeafNodeVariable.findMany({
      where: { TreeBranchLeafNode: { treeId: TREE_ID }, sourceRef: { not: null } },
      include: { TreeBranchLeafNode: { select: { id: true, label: true, fieldType: true, type: true, subType: true } } }
    }),
    prisma.treeBranchLeafNodeFormula.findMany({
      where: { nodeId: { in: (await prisma.treeBranchLeafNode.findMany({ where: { treeId: TREE_ID, hasFormula: true }, select: { id: true } })).map(n => n.id) } }
    })
  ]);
  const formulaNodes = await prisma.treeBranchLeafNode.findMany({
    where: { id: { in: formulasRawDB.map(f => f.nodeId) } },
    select: { id: true, label: true, fieldType: true, type: true, subType: true }
  });
  const nodeMap = new Map(formulaNodes.map(n => [n.id, n]));
  
  const capacitiesRawAll = [
    ...variablesRaw.map(v => ({ nodeId: v.nodeId, sourceRef: v.sourceRef, TreeBranchLeafNode: v.TreeBranchLeafNode })),
    ...formulasRawDB.map(f => ({ nodeId: f.nodeId, sourceRef: `formula:${f.id}`, TreeBranchLeafNode: nodeMap.get(f.nodeId) }))
  ];
  const seenNodeIds = new Set<string>();
  const capacitiesRaw = capacitiesRawAll.filter(c => {
    if (seenNodeIds.has(c.nodeId)) return false;
    seenNodeIds.add(c.nodeId);
    return true;
  });

  const displayCapNodeIds = new Set<string>();
  for (const c of capacitiesRaw) {
    if (c.TreeBranchLeafNode?.fieldType === 'DISPLAY' || c.TreeBranchLeafNode?.type === 'DISPLAY' || c.TreeBranchLeafNode?.type === 'leaf_field') {
      displayCapNodeIds.add(c.nodeId);
    }
    if (c.nodeId.endsWith('-sum-total')) {
      displayCapNodeIds.add(c.nodeId);
    }
  }

  console.log('\n=== DEPENDENCY ANALYSIS ===');
  for (const refId of refs) {
    const inDisplayCap = displayCapNodeIds.has(refId);
    const cap = capacitiesRaw.find(c => c.nodeId === refId);
    console.log(`  ${refId.substring(0,12)}... → inDisplayCapNodeIds: ${inDisplayCap}, label: ${cap?.TreeBranchLeafNode?.label || 'N/A'}, sourceRef: ${cap?.sourceRef?.substring(0,40) || 'N/A'}`);
  }

  // 4. Build displayDeps exactly like the evaluator does
  const allFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
    where: { TreeBranchLeafNode: { treeId: TREE_ID } },
    select: { id: true, nodeId: true, tokens: true }
  });
  
  const formulasByNodeId = new Map<string, Array<{ tokens: unknown; id: string }>>();
  const formulasById = new Map<string, { tokens: unknown; nodeId: string }>();
  for (const f of allFormulas) {
    if (!formulasByNodeId.has(f.nodeId)) formulasByNodeId.set(f.nodeId, []);
    formulasByNodeId.get(f.nodeId)!.push({ tokens: f.tokens as unknown, id: f.id });
    formulasById.set(f.id, { tokens: f.tokens as unknown, nodeId: f.nodeId });
  }

  const displayDeps = new Map<string, Set<string>>();
  
  for (const displayNodeId of displayCapNodeIds) {
    const nodeRefs = new Set<string>();
    
    // 1. Collecter les refs depuis les formules
    const formulas = formulasByNodeId.get(displayNodeId) || [];
    for (const f of formulas) {
      collectRefs(f.tokens, nodeRefs);
    }

    // 4. Résoudre les node-formula cross-node
    const visitedFormulas = new Set<string>();
    const resolveTransitiveDeps = (data: unknown) => {
      if (!data) return;
      if (Array.isArray(data)) {
        for (const item of data) resolveTransitiveDeps(item);
        return;
      }
      if (typeof data === 'string') {
        const s = data.trim();
        if (s.startsWith('node-formula:')) {
          const fId = s.slice('node-formula:'.length).trim();
          if (fId && !visitedFormulas.has(fId)) {
            visitedFormulas.add(fId);
            const crossFormula = formulasById.get(fId);
            if (crossFormula && crossFormula.tokens) {
              collectRefs(crossFormula.tokens, nodeRefs);
              resolveTransitiveDeps(crossFormula.tokens);
            }
          }
        }
      }
      if (typeof data === 'object' && data !== null) {
        for (const val of Object.values(data as Record<string, unknown>)) {
          resolveTransitiveDeps(val);
        }
      }
    };
    for (const f of formulas) resolveTransitiveDeps(f.tokens);

    nodeRefs.delete(displayNodeId);
    
    for (const refId of nodeRefs) {
      if (refId.includes('.')) continue;
      if (displayCapNodeIds.has(refId)) {
        if (!displayDeps.has(displayNodeId)) displayDeps.set(displayNodeId, new Set());
        displayDeps.get(displayNodeId)!.add(refId);
      }
    }
  }

  // 5. Topo order
  const topoOrder = new Map<string, number>();
  const computeDepth = (nodeId: string, visited: Set<string>): number => {
    if (topoOrder.has(nodeId)) return topoOrder.get(nodeId)!;
    if (visited.has(nodeId)) return 0;
    visited.add(nodeId);
    const deps = displayDeps.get(nodeId);
    let maxDepth = 0;
    if (deps) {
      for (const dep of deps) {
        maxDepth = Math.max(maxDepth, computeDepth(dep, visited) + 1);
      }
    }
    topoOrder.set(nodeId, maxDepth);
    return maxDepth;
  };
  for (const nodeId of displayCapNodeIds) {
    computeDepth(nodeId, new Set());
  }

  console.log('\n=== TOPOLOGICAL ORDER FOR PRIX TVAC ===');
  const prixTvacDepth = topoOrder.get(PRIX_TVAC_NODE_ID) || 0;
  console.log(`Prix TVAC depth: ${prixTvacDepth}`);
  
  const prixTvacDeps = displayDeps.get(PRIX_TVAC_NODE_ID);
  if (prixTvacDeps) {
    console.log(`Prix TVAC has ${prixTvacDeps.size} display deps:`);
    for (const depId of prixTvacDeps) {
      const depDepth = topoOrder.get(depId) || 0;
      const cap = capacitiesRaw.find(c => c.nodeId === depId);
      console.log(`  ${depId.substring(0,12)}... depth=${depDepth} label="${cap?.TreeBranchLeafNode?.label || 'sum-total'}" sourceRef=${cap?.sourceRef?.substring(0,30) || 'N/A'}`);
    }
  } else {
    console.log('⚠️ Prix TVAC has NO display deps! This is likely the bug.');
  }

  // 6. Check the sort order position  
  const sortedNodeIds = [...displayCapNodeIds].sort((a, b) => {
    const aIsSumFormula = a.includes('sum-formula') || a.includes('sum-total') ? 1 : 0;
    const bIsSumFormula = b.includes('sum-formula') || b.includes('sum-total') ? 1 : 0;
    if (aIsSumFormula !== bIsSumFormula) return aIsSumFormula - bIsSumFormula;
    const aDepth = topoOrder.get(a) || 0;
    const bDepth = topoOrder.get(b) || 0;
    return aDepth - bDepth;
  });
  
  const prixTvacIdx = sortedNodeIds.indexOf(PRIX_TVAC_NODE_ID);
  console.log(`\nPrix TVAC position in sorted display list: ${prixTvacIdx} / ${sortedNodeIds.length}`);
  
  // Check deps positions
  if (prixTvacDeps) {
    for (const depId of prixTvacDeps) {
      const depIdx = sortedNodeIds.indexOf(depId);
      const isBeforePrixTvac = depIdx < prixTvacIdx;
      console.log(`  dep ${depId.substring(0,12)}... position=${depIdx} sorted_before_prix_tvac=${isBeforePrixTvac}`);
    }
  }

  // 7. Specifically check if Prix TVAC formula uses @calculated refs 
  // and what they resolve to (nodeId or nodeId-sum-total)
  console.log('\n=== RAW TOKEN VALUES (string tokens) ===');
  extractStringTokens(formula?.tokens, (s) => {
    if (s.includes('@calculated') || s.includes('sum-total') || s.includes('node-formula')) {
      console.log(`  "${s}"`);
    }
  });

  // 8. Vérifier la sourceRef de Prix TVAC dans capacitiesRaw
  const prixTvacCap = capacitiesRaw.find(c => c.nodeId === PRIX_TVAC_NODE_ID);
  console.log(`\n=== PRIX TVAC CAPACITY ===`);
  console.log(`  sourceRef: ${prixTvacCap?.sourceRef}`);
  console.log(`  subType: ${prixTvacCap?.TreeBranchLeafNode?.subType}`);
  console.log(`  fieldType: ${prixTvacCap?.TreeBranchLeafNode?.fieldType}`);

  await prisma.$disconnect();
}

function normalizeRef(ref?: unknown): string {
  if (!ref || typeof ref !== 'string') return '';
  return ref
    .replace(/^@value\./, '')
    .replace(/^@calculated\./, '')
    .replace(/^@table\./, '')
    .replace(/^@select\./, '')
    .replace(/^node-formula:/, '')
    .replace(/^node-table:/, '')
    .replace(/^node-condition:/, '')
    .replace(/^node-variable:/, '')
    .replace(/^condition:/, '')
    .replace(/^formula:/, '')
    .trim();
}

function isAcceptedNodeId(id: string): boolean {
  return id.length > 8 && !id.startsWith('.') && !id.startsWith('_');
}

function collectRefs(data: unknown, out: Set<string>) {
  if (!data) return;
  if (Array.isArray(data)) {
    for (const item of data) collectRefs(item, out);
    return;
  }
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (typeof obj.ref === 'string') {
      const id = normalizeRef(obj.ref);
      if (id && isAcceptedNodeId(id)) out.add(id);
    }
    const leftRef = (obj as any)?.left?.ref;
    if (typeof leftRef === 'string') {
      const id = normalizeRef(leftRef);
      if (id && isAcceptedNodeId(id)) out.add(id);
    }
    const rightRef = (obj as any)?.right?.ref;
    if (typeof rightRef === 'string') {
      const id = normalizeRef(rightRef);
      if (id && isAcceptedNodeId(id)) out.add(id);
    }
    if (Array.isArray((obj as any).nodeIds)) {
      for (const raw of (obj as any).nodeIds as unknown[]) {
        if (typeof raw !== 'string') continue;
        const id = normalizeRef(raw);
        if (id && isAcceptedNodeId(id)) out.add(id);
      }
    }
    for (const key of Object.keys(obj)) {
      collectRefs(obj[key], out);
    }
    return;
  }
  if (typeof data === 'string') {
    const s = data.trim();
    if (!s) return;
    const id = normalizeRef(s);
    if (id && isAcceptedNodeId(id)) {
      out.add(id);
      return;
    }
    if (isAcceptedNodeId(s)) out.add(s);
  }
}

function extractStringTokens(data: unknown, cb: (s: string) => void) {
  if (!data) return;
  if (Array.isArray(data)) {
    for (const item of data) extractStringTokens(item, cb);
    return;
  }
  if (typeof data === 'object' && data !== null) {
    for (const val of Object.values(data as Record<string, unknown>)) {
      extractStringTokens(val, cb);
    }
    return;
  }
  if (typeof data === 'string') {
    cb(data);
  }
}

main().catch(console.error);
