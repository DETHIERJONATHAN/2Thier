/**
 * Script pour trouver les nœuds nécessaires à la formule Mensualité - Prêt
 */
import { db } from '../src/lib/database';

async function main() {
  // 1. Chercher les nœuds pertinents
  const nodes = await db.treeBranchLeafNode.findMany({
    where: {
      OR: [
        { label: { contains: 'ensualit', mode: 'insensitive' } },
        { label: { contains: 'inancement', mode: 'insensitive' } },
        { label: { contains: 'aux d', mode: 'insensitive' } },
        { label: { contains: 'rix TVAC', mode: 'insensitive' } },
        { label: { contains: 'Prêt', mode: 'insensitive' } },
        { label: { contains: 'Pret', mode: 'insensitive' } },
      ]
    },
    select: { 
      id: true, label: true, type: true, hasFormula: true, 
      treeId: true, parentId: true, subType: true 
    },
    orderBy: { label: 'asc' }
  });

  console.log('=== NODES TROUVÉS ===');
  for (const n of nodes) {
    console.log(`  ID: ${n.id}`);
    console.log(`  Label: ${n.label}`);
    console.log(`  Type: ${n.type} | SubType: ${n.subType}`);
    console.log(`  HasFormula: ${n.hasFormula}`);
    console.log(`  TreeId: ${n.treeId}`);
    console.log(`  ParentId: ${n.parentId}`);
    console.log('  ---');
  }

  // 2. Chercher les formules existantes pour ces nœuds
  const nodeIds = nodes.map(n => n.id);
  const formulas = await db.treeBranchLeafNodeFormula.findMany({
    where: { nodeId: { in: nodeIds } },
    select: { id: true, nodeId: true, tokens: true, expression: true }
  });

  console.log('\n=== FORMULES EXISTANTES ===');
  for (const f of formulas) {
    const node = nodes.find(n => n.id === f.nodeId);
    console.log(`  Node: ${node?.label} (${f.nodeId})`);
    console.log(`  FormulaId: ${f.id}`);
    console.log(`  Tokens: ${JSON.stringify(f.tokens)}`);
    console.log(`  Expression: ${f.expression}`);
    console.log('  ---');
  }

  // 3. Chercher les variables/capacités pour ces nœuds
  const capacities = await db.treeBranchLeafNodeCapacity.findMany({
    where: { nodeId: { in: nodeIds } },
    select: { id: true, nodeId: true, sourceRef: true, value: true, operationResult: true }
  });

  console.log('\n=== CAPACITIES ===');
  for (const c of capacities) {
    const node = nodes.find(n => n.id === c.nodeId);
    console.log(`  Node: ${node?.label} (${c.nodeId})`);
    console.log(`  CapacityId: ${c.id}`);
    console.log(`  SourceRef: ${c.sourceRef}`);
    console.log(`  Value: ${c.value}`);
    console.log(`  OperationResult: ${JSON.stringify(c.operationResult)}`);
    console.log('  ---');
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
