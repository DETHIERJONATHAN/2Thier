#!/usr/bin/env node
/**
 * diagnose-shared-refs.cjs
 *
 * Objectif: Diagnostiquer pourquoi les "références partagées" ne s'affichent pas
 * pour un champ select/cascader (ex: "Versant (Copie 1)" avec chemin Rectangle > Mesure simple).
 *
 * Utilisation (PowerShell/Windows):
 *   node scripts/diagnose-shared-refs.cjs --nodes path\to\nodes.json --form path\to\form.json --fieldId <FIELD_ID> --path "Rectangle>Mesure simple"
 *   # ou
 *   node scripts/diagnose-shared-refs.cjs --nodes path\to\nodes.json --fieldId <FIELD_ID> --value "Mesure simple"
 *
 * Paramètres:
 *   --nodes    Chemin vers un JSON (array) de RawTreeNode (allNodes)
 *   --form     Chemin vers un JSON (objet) des formData (facultatif)
 *   --fieldId  ID du champ (peut être namespacé parentId_index_originalId)
 *   --path     Chemin du Cascader (ex: "Rectangle>Mesure simple") (facultatif)
 *   --value    Valeur sélectionnée (fallback si pas de path) (facultatif)
 *
 * Sortie: étapes de résolution (selectedValue, matchingNode, enfants conditionnels,
 * sharedReferenceIds trouvés récursivement et leur présence dans allNodes),
 * + causes probables si rien n'est trouvé.
 */

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true; // flag
      } else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

function loadJson(p) {
  const content = fs.readFileSync(p, 'utf-8');
  return JSON.parse(content);
}

function looksLikeUUID(s) {
  return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
function isNamespacedNodeLike(s) {
  return typeof s === 'string' && /^node_\d+_[a-z0-9]+$/i.test(s);
}
function deriveOriginalId(fieldId) {
  if (!fieldId || typeof fieldId !== 'string') return fieldId;
  // Motif repeater: parentId_index_originalId
  const m = /^.+?_\d+?_(.+)$/.exec(fieldId);
  if (m && m[1]) return m[1];
  // Compat _0_
  if (fieldId.includes('_0_')) {
    const parts = fieldId.split('_0_');
    if (parts[1]) return parts[1];
  }
  return fieldId;
}

function norm(v) { return (v === null || v === undefined) ? v : String(v); }

function resolveSelectedValue(fieldId, formData) {
  if (!formData) return undefined;
  let raw = formData[fieldId];
  if (raw === undefined) {
    const originalId = deriveOriginalId(fieldId);
    if (originalId && formData[originalId] !== undefined) raw = formData[originalId];
  }
  if (raw === undefined && fieldId.includes('_0_')) {
    const originalId = fieldId.split('_0_')[1];
    if (originalId && formData[originalId] !== undefined) raw = formData[originalId];
  }
  if (raw === undefined) {
    // Dernier recours: suffix scan
    const parts = fieldId.split('_');
    if (parts.length >= 3) {
      const maybeOriginal = parts.slice(2).join('_');
      const key = Object.keys(formData).find(k => k === maybeOriginal || k.endsWith(`_${maybeOriginal}`));
      if (key && formData[key] !== undefined) raw = formData[key];
    }
  }
  return (raw === 'undefined') ? undefined : raw;
}

function findNodeById(allNodes, id) {
  return allNodes.find(n => n.id === id);
}
function getChildren(allNodes, parentId) {
  return allNodes.filter(n => n.parentId === parentId);
}

function buildFindAllSharedReferencesRecursive(allNodes) {
  return function findAllSharedReferencesRecursive(nodeId, visited = new Set()) {
    if (visited.has(nodeId)) return [];
    visited.add(nodeId);
    const node = findNodeById(allNodes, nodeId);
    if (!node) return [];
    const sharedRefs = [];
    if (Array.isArray(node.sharedReferenceIds)) {
      sharedRefs.push(...node.sharedReferenceIds);
    }
    if (node.sharedReferenceId && typeof node.sharedReferenceId === 'string') {
      sharedRefs.push(node.sharedReferenceId);
    }
    const children = getChildren(allNodes, nodeId);
    for (const child of children) {
      const childRefs = findAllSharedReferencesRecursive(child.id, visited);
      sharedRefs.push(...childRefs);
    }
    return sharedRefs;
  }
}

function findMatchingOptionNode({ allNodes, fieldNode, pathSegments, selectedValue }) {
  // Si on a un chemin (Cascader), on suit parentage
  if (Array.isArray(pathSegments) && pathSegments.length > 0 && fieldNode) {
    let currentParentId = fieldNode.id;
    let currentNode = null;
    for (const seg of pathSegments) {
      const child = allNodes.find(n => n.parentId === currentParentId && (n.type === 'leaf_option' || n.type === 'leaf_option_field') && n.label === seg);
      if (!child) return { matchingNode: null, viaPath: true };
      currentNode = child;
      currentParentId = child.id;
    }
    return { matchingNode: currentNode, viaPath: true };
  }
  // Sinon: chercher un node option par label
  const sv = norm(selectedValue);
  const node = allNodes.find(n => (n.type === 'leaf_option' || n.type === 'leaf_option_field') && (norm(n.label) === sv));
  return { matchingNode: node || null, viaPath: false };
}

function main() {
  const args = parseArgs(process.argv);
  const nodesPath = args.nodes;
  const formPath = args.form;
  const fieldIdRaw = args.fieldId;
  const pathArg = args.path; // "Rectangle>Mesure simple"
  const valueArg = args.value;

  if (!nodesPath || !fieldIdRaw) {
    console.error('❌ Arguments manquants. Requis: --nodes <nodes.json> --fieldId <FIELD_ID> [--form <form.json>] [--path "A>B>C" | --value "X"]');
    process.exit(1);
  }

  const allNodes = loadJson(path.resolve(nodesPath));
  const formData = formPath ? loadJson(path.resolve(formPath)) : {};
  const fieldId = fieldIdRaw;
  const originalId = deriveOriginalId(fieldId);

  // Résolution selectedValue
  let selectedValue = resolveSelectedValue(fieldId, formData);
  if ((selectedValue === undefined || selectedValue === null) && typeof valueArg === 'string') {
    selectedValue = valueArg;
  }

  // Résolution fieldNode
  let fieldNode = findNodeById(allNodes, fieldId);
  if (!fieldNode && originalId) fieldNode = findNodeById(allNodes, originalId);

  // Résolution matching option node
  const segments = typeof pathArg === 'string' && pathArg.length > 0 ? pathArg.split('>').map(s => s.trim()) : null;
  const { matchingNode, viaPath } = findMatchingOptionNode({ allNodes, fieldNode, pathSegments: segments, selectedValue });

  // Fallback: si on a trouvé une option pré-construite (viaPath true) ou via label,
  // mais selectedValue est vide, on l’alimente depuis l’option
  if ((selectedValue === undefined || selectedValue === null) && matchingNode) {
    selectedValue = matchingNode.label;
  }

  const findAllSharedReferencesRecursive = buildFindAllSharedReferencesRecursive(allNodes);

  // Diagnostic
  const output = {
    input: { fieldId, originalId, path: pathArg || null, valueArg: valueArg || null },
    resolution: {
      selectedValue,
      fieldNodeFound: !!fieldNode,
      fieldNodeId: fieldNode ? fieldNode.id : null,
      fieldNodeLabel: fieldNode ? fieldNode.label : null,
      matchingNodeFound: !!matchingNode,
      matchingNodeId: matchingNode ? matchingNode.id : null,
      matchingNodeLabel: matchingNode ? matchingNode.label : null,
      matchingViaPath: viaPath
    },
    optionChildren: [],
    conditionalChildren: [],
    sharedReferences: {
      foundIds: [],
      details: []
    },
    probableCauses: []
  };

  // Enfants conditionnels directs de l’option
  if (matchingNode) {
    const childFields = allNodes.filter(n => n.parentId === matchingNode.id && n.type === 'leaf_option_field');
    output.conditionalChildren = childFields.map(n => ({ id: n.id, label: n.label, type: n.type, fieldType: n.fieldType }));

    // Références partagées (récursif)
    const sharedRefIds = findAllSharedReferencesRecursive(matchingNode.id);
    output.sharedReferences.foundIds = Array.from(new Set(sharedRefIds));
    output.sharedReferences.details = output.sharedReferences.foundIds.map(id => {
      const rn = findNodeById(allNodes, id);
      return {
        id,
        existsInAllNodes: !!rn,
        label: rn ? rn.label : null,
        fieldType: rn ? rn.fieldType : null,
        type: rn ? rn.type : null
      };
    });
  }

  // Probables causes si rien n’apparaît
  if (!fieldNode) {
    output.probableCauses.push('Le fieldId (ou son original) n’existe pas dans allNodes. Champ copié non résolu.');
  }
  if (!matchingNode) {
    if (segments && segments.length > 0) {
      output.probableCauses.push('Chemin Cascader introuvable sous le champ (une des étapes du chemin n’existe pas).');
    } else if (selectedValue === undefined || selectedValue === null) {
      output.probableCauses.push('selectedValue est undefined/null (formData vide ou fallback non résolu).');
    } else {
      output.probableCauses.push('Aucun node option avec un label égal à selectedValue n’a été trouvé.');
    }
  } else {
    if (output.conditionalChildren.length === 0 && output.sharedReferences.foundIds.length === 0) {
      output.probableCauses.push('L’option sélectionnée n’a ni champs enfants (leaf_option_field) ni sharedReferenceIds dans son sous-arbre.');
      output.probableCauses.push('Si c’est une copie, vérifier que les références partagées suffixées (-N) ont été appliquées lors de la duplication.');
    }
    if (output.sharedReferences.foundIds.length > 0) {
      const missing = output.sharedReferences.details.filter(d => !d.existsInAllNodes);
      if (missing.length > 0) {
        output.probableCauses.push('Certaines sharedReferenceIds référencent des nœuds absents de allNodes.');
      }
    }
  }

  // Sortie lisible
  console.log('===== DIAGNOSE SHARED REFS =====');
  console.log(JSON.stringify(output, null, 2));
}

main();
