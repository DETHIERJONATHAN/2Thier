#!/usr/bin/env node
/*
  Backfill des colonnes linked*Ids sur TreeBranchLeafNode à partir des liaisons existantes.
  - linkedVariableIds: TreeBranchLeafNodeVariable (1:1) -> [variable.id] + références inverses
  - linkedFormulaIds: TreeBranchLeafNodeFormula (1:n) -> [formula.id] + références inverses
  - linkedConditionIds: TreeBranchLeafNodeCondition (1:n) -> [condition.id] + références inverses
  - linkedTableIds: TreeBranchLeafNodeTable (1:n) -> [table.id]

  Stratégie de mise à jour:
  - Pour chaque nodeId rencontré, on fusionne les valeurs existantes (si présentes) avec les nouvelles IDs et on supprime les doublons.
  - On n'écrase rien: on ne fait que l'union des valeurs (safe en production, aucun reset).
*/

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

// Helpers d'extraction d'IDs pour rétro-remplir les références inverses
const normalizeRefId = (ref) => {
  if (!ref || typeof ref !== 'string') return ref;
  if (ref.startsWith('node-formula:')) return ref.replace(/^node-formula:/, '');
  return ref;
};

const extractNodeIdsFromTokens = (tokens) => {
  const ids = new Set();
  if (!tokens) return ids;
  const addFromString = (s) => {
    let m;
    // Même regex que côté API pour capturer toutes les formes d'ID référencées
    const re = /@value\.([A-Za-z0-9_:-]+)/gi;
    while ((m = re.exec(s)) !== null) ids.add(m[1]);
  };
  if (Array.isArray(tokens)) {
    for (const t of tokens) addFromString(typeof t === 'string' ? t : JSON.stringify(t));
  } else if (typeof tokens === 'string') {
    addFromString(tokens);
  } else {
    addFromString(JSON.stringify(tokens));
  }
  return ids;
};

const extractNodeIdsFromConditionSet = (conditionSet) => {
  const ids = new Set();
  if (!conditionSet || typeof conditionSet !== 'object') return ids;
  const obj = conditionSet;
  // 1) tokens éventuels
  if (Array.isArray(obj.tokens)) {
    for (const t of obj.tokens) {
      const asStr = typeof t === 'string' ? t : JSON.stringify(t);
      const re = /@value\.([a-f0-9-]{36})/gi;
      let m;
      while ((m = re.exec(asStr)) !== null) ids.add(m[1]);
    }
  }
  // 2) branches.when.left/right { ref: "@value.<uuid>" } + actions[].nodeIds
  if (Array.isArray(obj.branches)) {
    for (const br of obj.branches) {
      const b = br || {};
      const when = b.when || {};
      const scanWhen = (node) => {
        if (!node || typeof node !== 'object') return;
        const ref = node.ref;
        if (typeof ref === 'string') {
          const m = /@value\.([a-f0-9-]{36})/i.exec(ref);
          if (m && m[1]) ids.add(m[1]);
        }
        if (node.left) scanWhen(node.left);
        if (node.right) scanWhen(node.right);
      };
      scanWhen(when);
      const actions = Array.isArray(b.actions) ? b.actions : [];
      for (const a of actions) {
        const nodeIds = Array.isArray(a?.nodeIds) ? a.nodeIds : [];
        for (const nid of nodeIds) ids.add(normalizeRefId(nid));
      }
    }
  }
  // 2bis) fallback.actions.nodeIds
  if (obj.fallback && typeof obj.fallback === 'object') {
    const actions = Array.isArray(obj.fallback.actions) ? obj.fallback.actions : [];
    for (const a of actions) {
      const nodeIds = Array.isArray(a?.nodeIds) ? a.nodeIds : [];
      for (const nid of nodeIds) ids.add(normalizeRefId(nid));
    }
  }
  // 3) dernier recours: stringify global
  const str = JSON.stringify(obj);
  if (str) {
    const re = /@value\.([a-f0-9-]{36})/gi;
    let m;
    while ((m = re.exec(str)) !== null) ids.add(m[1]);
  }
  return ids;
};

// Helper pour parser sourceRef dans le format "type:id"
const parseSourceRef = (sourceRef) => {
  if (!sourceRef || typeof sourceRef !== 'string') return null;
  const [rawType, rawId] = sourceRef.split(':');
  let type = (rawType || '').toLowerCase();
  if (type.startsWith('node-')) type = type.replace(/^node-/, '');
  const id = (rawId || '').trim();
  if (!id) return null;
  if (type === 'formula' || type === 'formule') return { type: 'formula', id };
  if (type === 'condition') return { type: 'condition', id };
  if (type === 'table') return { type: 'table', id };
  return null;
};

async function main() {
  const started = Date.now();
  console.log('▶ Backfill linked*Ids started...');

  // Récupérer toutes les liaisons existantes
  const [variables, formulas, conditions, tables] = await Promise.all([
    // Inclure sourceRef et metadata pour l'extraction des références inverses des variables
    prisma.treeBranchLeafNodeVariable.findMany({ select: { id: true, nodeId: true, sourceRef: true, metadata: true } }),
    // Inclure les tokens pour l'extraction des références inverses
    prisma.treeBranchLeafNodeFormula.findMany({ select: { id: true, nodeId: true, tokens: true } }),
    // Inclure le conditionSet pour l'extraction des références inverses
    prisma.treeBranchLeafNodeCondition.findMany({ select: { id: true, nodeId: true, conditionSet: true } }),
    prisma.treeBranchLeafNodeTable.findMany({ select: { id: true, nodeId: true } }),
  ]);

  // Préparer un set de tous les nodeIds existants pour filtrer les refs invalides
  const allNodes = await prisma.treeBranchLeafNode.findMany({ select: { id: true } });
  const existingNodeIds = new Set(allNodes.map(n => n.id));

  // Grouper par nodeId
  const byNode = new Map();
  const ensure = (nodeId) => {
    if (!byNode.has(nodeId)) {
      byNode.set(nodeId, {
        linkedVariableIds: [],
        linkedFormulaIds: [],
        linkedConditionIds: [],
        linkedTableIds: [],
      });
    }
    return byNode.get(nodeId);
  };

  // Helper pour extraire les IDs référencés par une variable
  const getVariableReferencedIds = async (variable) => {
    const ids = new Set();
    if (!variable) return ids;

    const { sourceRef, metadata } = variable;

    // 1. Référence directe dans metadata.selectedNodeId
    if (metadata?.selectedNodeId) {
      ids.add(normalizeRefId(metadata.selectedNodeId));
    }

    // 2. Référence dans sourceRef
    const parsedRef = parseSourceRef(sourceRef);
    if (parsedRef) {
      if (parsedRef.type === 'formula') {
        const formula = await prisma.treeBranchLeafNodeFormula.findUnique({ 
          where: { id: parsedRef.id }, 
          select: { tokens: true } 
        });
        if (formula) {
          extractNodeIdsFromTokens(formula.tokens).forEach(id => ids.add(normalizeRefId(id)));
        }
      } else if (parsedRef.type === 'condition') {
        const condition = await prisma.treeBranchLeafNodeCondition.findUnique({ 
          where: { id: parsedRef.id }, 
          select: { conditionSet: true } 
        });
        if (condition) {
          extractNodeIdsFromConditionSet(condition.conditionSet).forEach(id => ids.add(normalizeRefId(id)));
        }
      } else {
        // Gérer les cas comme "table:id" ou "node:id"
        ids.add(normalizeRefId(parsedRef.id));
      }
    } else if (sourceRef) {
      // Si ce n'est pas un format "type:id", ça peut être un nodeId direct
      ids.add(normalizeRefId(sourceRef));
    }
    
    return ids;
  };

  // Helper pour extraire les variables des nœuds référencés
  const getNodeReferencedVariableIds = async (nodeId) => {
    const variableIds = new Set();
    
    // Récupérer la variable du nœud courant pour analyser ses références
    const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
      where: { nodeId },
      select: { sourceRef: true, metadata: true }
    });
    
    if (!variable) return variableIds;
    
    // Extraire les nœuds référencés par cette variable
    const referencedNodeIds = await getVariableReferencedIds(variable);
    
    // Pour chaque nœud référencé, récupérer sa variable (si elle existe)
    for (const refNodeId of referencedNodeIds) {
      if (existingNodeIds.has(refNodeId)) {
        const refVariable = await prisma.treeBranchLeafNodeVariable.findUnique({
          where: { nodeId: refNodeId },
          select: { id: true }
        });
        if (refVariable) {
          variableIds.add(refVariable.id);
        }
      }
    }
    
    return variableIds;
  };

  // Traiter les variables (propriétaire + références inverses)
  for (const v of variables) {
    // 1) propriétaire
    const g = ensure(v.nodeId);
    g.linkedVariableIds.push(v.id);
    
    // 2) références inverses (nœuds référencés par cette variable)  
    try {
      const refs = await getVariableReferencedIds(v);
      const filteredRefs = Array.from(refs).filter(id => existingNodeIds.has(id));
      for (const refId of filteredRefs) {
        const gg = ensure(refId);
        gg.linkedVariableIds.push(v.id);
      }
    } catch (e) {
      console.warn(`Warning processing variable ${v.id}:`, e.message);
    }
    
    // 3) NOUVEAU: Ajouter les IDs des variables des nœuds référencés
    try {
      const referencedVariableIds = await getNodeReferencedVariableIds(v.nodeId);
      const g2 = ensure(v.nodeId);
      for (const varId of referencedVariableIds) {
        g2.linkedVariableIds.push(varId);
      }
    } catch (e) {
      console.warn(`Warning processing node variable references ${v.nodeId}:`, e.message);
    }
  }

  // Traiter les formulas (propriétaire + références inverses)
  for (const f of formulas) {
    // 1) propriétaire
    const g = ensure(f.nodeId);
    g.linkedFormulaIds.push(f.id);
    // 2) références inverses (champs, options, etc.) extraites des tokens
    const refs = Array.from(extractNodeIdsFromTokens(f.tokens)).filter(id => existingNodeIds.has(id));
    for (const refId of refs) {
      const gg = ensure(refId);
      gg.linkedFormulaIds.push(f.id);
    }
  }

  // Traiter les conditions (propriétaire + références inverses)
  for (const c of conditions) {
    // 1) propriétaire
    const g = ensure(c.nodeId);
    g.linkedConditionIds.push(c.id);
    // 2) références inverses extraites du conditionSet
    const refs = Array.from(extractNodeIdsFromConditionSet(c.conditionSet)).filter(id => existingNodeIds.has(id));
    for (const refId of refs) {
      const gg = ensure(refId);
      gg.linkedConditionIds.push(c.id);
    }
  }

  // Traiter les tables (propriétaire uniquement)
  for (const t of tables) {
    const g = ensure(t.nodeId);
    g.linkedTableIds.push(t.id);
  }

  const nodeIds = Array.from(byNode.keys());
  console.log(`• Nodes à mettre à jour: ${nodeIds.length}`);

  let updatedCount = 0;
  const batchSize = 100;
  for (let i = 0; i < nodeIds.length; i += batchSize) {
    const batchIds = nodeIds.slice(i, i + batchSize);
    // Lire les valeurs actuelles pour merge
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: { id: { in: batchIds } },
      select: {
        id: true,
        linkedVariableIds: true,
        linkedFormulaIds: true,
        linkedConditionIds: true,
        linkedTableIds: true,
      },
    });

    for (const node of nodes) {
      const desired = byNode.get(node.id) || {};
      const nextLinkedVariableIds = uniq([...(node.linkedVariableIds || []), ...(desired.linkedVariableIds || [])]);
      const nextLinkedFormulaIds = uniq([...(node.linkedFormulaIds || []), ...(desired.linkedFormulaIds || [])]);
      const nextLinkedConditionIds = uniq([...(node.linkedConditionIds || []), ...(desired.linkedConditionIds || [])]);
      const nextLinkedTableIds = uniq([...(node.linkedTableIds || []), ...(desired.linkedTableIds || [])]);

      const changed = (
        nextLinkedVariableIds.length !== (node.linkedVariableIds || []).length ||
        nextLinkedFormulaIds.length !== (node.linkedFormulaIds || []).length ||
        nextLinkedConditionIds.length !== (node.linkedConditionIds || []).length ||
        nextLinkedTableIds.length !== (node.linkedTableIds || []).length
      );

      if (!changed) continue;

      await prisma.treeBranchLeafNode.update({
        where: { id: node.id },
        data: {
          linkedVariableIds: { set: nextLinkedVariableIds },
          linkedFormulaIds: { set: nextLinkedFormulaIds },
          linkedConditionIds: { set: nextLinkedConditionIds },
          linkedTableIds: { set: nextLinkedTableIds },
        },
      });
      updatedCount++;
    }
  }

  const elapsedMs = Date.now() - started;
  console.log(`✔ Backfill terminé. Nodes modifiés: ${updatedCount}. Durée: ${elapsedMs} ms.`);
}

main()
  .catch((e) => {
    console.error('Backfill error:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });