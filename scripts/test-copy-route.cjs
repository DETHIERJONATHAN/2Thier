#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const apiBase = process.env.API_URL || 'http://localhost:4000';
    const variable = await prisma.treeBranchLeafNodeVariable.findFirst({});
    if (!variable) {
      console.error('Aucune variable en base.');
      process.exit(1);
    }
    const ownerNode = await prisma.treeBranchLeafNode.findUnique({ where: { id: variable.nodeId } });
    if (!ownerNode) {
      console.error('Nœud propriétaire introuvable:', variable.nodeId);
      process.exit(1);
    }
    const tree = await prisma.treeBranchLeafTree.findUnique({ where: { id: ownerNode.treeId } });
    if (!tree) {
      console.error('Arbre introuvable:', ownerNode.treeId);
      process.exit(1);
    }
    const orgId = tree.organizationId;

    const url = `${apiBase}/api/treebranchleaf/nodes/${encodeURIComponent(ownerNode.id)}/copy-linked-variable`;
    const body = {
      variableId: variable.id,
      newSuffix: 1,
      duplicateNode: true
    };
    console.log('POST', url, 'body=', body, 'x-organization-id=', orgId);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-organization-id': orgId,
      },
      body: JSON.stringify(body)
    });

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    console.log('Status:', res.status, res.statusText);
    console.log('Response:', json);

    if (res.ok && json && json.targetNodeId) {
      const newNode = await prisma.treeBranchLeafNode.findUnique({ where: { id: json.targetNodeId } });
      const newVar = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { id: json.variableId } });
      console.log('Vérification DB:', {
        newNodeExists: !!newNode,
        newVarExists: !!newVar,
        newNodeParentId: newNode?.parentId || null,
        newNodeOrder: newNode?.order || null,
        newVarNodeId: newVar?.nodeId || null,
      });
    }
  } catch (e) {
    console.error('Erreur test-copy-route:', e);
    process.exitCode = 1;
  }
}

main();
