#!/usr/bin/env node
/**
 * Cleanup script: remove materialized copies of shared-reference source nodes inside a copied subtree.
 *
 * Why: older deep-copy logic accidentally materialized shared references as real children.
 * This script deletes any copied node whose original had isSharedReference = true, limited to a subtree.
 *
 * Usage (PowerShell):
 *   node scripts/cleanup-materialized-shared-refs.cjs --root <copyRootNodeId>
 *
 * Safety:
 * - Only operates within the provided root subtree
 * - Dry-run by default; use --apply to actually delete
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { root: null, apply: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--apply') out.apply = true;
    else if (a === '--root') { out.root = args[i + 1]; i++; }
    else if (a.startsWith('--root=')) out.root = a.split('=')[1];
  }
  return out;
}

async function main() {
  const { root, apply } = parseArgs();
  if (!root) {
    console.error('Missing required --root <nodeId>');
    process.exit(1);
  }

  const rootNode = await prisma.treeBranchLeafNode.findUnique({ where: { id: root } });
  if (!rootNode) {
    console.error('Root node not found:', root);
    process.exit(1);
  }

  const all = await prisma.treeBranchLeafNode.findMany({ where: { treeId: rootNode.treeId } });
  const byId = new Map(all.map(n => [n.id, n]));
  const childrenByParent = new Map();
  for (const n of all) {
    if (!n.parentId) continue;
    if (!childrenByParent.has(n.parentId)) childrenByParent.set(n.parentId, []);
    childrenByParent.get(n.parentId).push(n.id);
  }

  // Collect subtree
  const subtree = new Set();
  const q = [root];
  while (q.length) {
    const cur = q.shift();
    if (subtree.has(cur)) continue;
    subtree.add(cur);
    for (const c of (childrenByParent.get(cur) || [])) q.push(c);
  }

  // For each node in subtree, if it has metadata.copiedFromNodeId and the original is a shared reference source, mark for deletion.
  const toDeleteRoots = new Set();
  for (const id of subtree) {
    const n = byId.get(id);
    if (!n) continue;
    const meta = (n.metadata || {});
    const origId = meta && typeof meta === 'object' ? (meta.copiedFromNodeId || null) : null;
    if (!origId || typeof origId !== 'string') continue;
    const orig = byId.get(origId) || await prisma.treeBranchLeafNode.findUnique({ where: { id: origId } });
    if (orig && orig.isSharedReference === true && orig.sharedReferenceId === null) {
      toDeleteRoots.add(id);
    }
  }

  // Expand deletions to include descendants
  const toDelete = new Set();
  for (const id of toDeleteRoots) {
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop();
      if (toDelete.has(cur)) continue;
      toDelete.add(cur);
      for (const c of (childrenByParent.get(cur) || [])) stack.push(c);
    }
  }

  if (toDelete.size === 0) {
    console.log('No materialized shared-reference copies found under root. Nothing to do.');
    return;
  }

  console.log(`Found ${toDelete.size} node(s) to delete under subtree of ${root}.`);
  if (!apply) {
    console.log('Dry run. Use --apply to actually delete. First 10 ids:', Array.from(toDelete).slice(0, 10));
    return;
  }

  // Delete from leaves upward to avoid FK issues
  const depth = new Map();
  const getDepth = (id) => {
    if (depth.has(id)) return depth.get(id);
    const n = byId.get(id);
    if (!n || !n.parentId) { depth.set(id, 0); return 0; }
    const d = getDepth(n.parentId) + 1; depth.set(id, d); return d;
  };
  const ordered = Array.from(toDelete).sort((a, b) => getDepth(b) - getDepth(a));

  for (const id of ordered) {
    await prisma.treeBranchLeafNode.delete({ where: { id } });
  }

  console.log('Deletion complete.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
