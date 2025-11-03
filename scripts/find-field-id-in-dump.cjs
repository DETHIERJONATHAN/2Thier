#!/usr/bin/env node
/**
 * find-field-id-in-dump.cjs
 *
 * Objectif: Trouver l'ID d'un champ (par label) directement dans un dump allNodes (nodes.json),
 * sans dépendre de Prisma/DB.
 *
 * Utilisation (PowerShell/Windows):
 *   node scripts/find-field-id-in-dump.cjs --nodes nodes.json --label "Versant (Copie 1)"
 *   # optionnel: --preferType leaf_cascader|leaf_select|leaf_option_field ...
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
        args[key] = true;
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

function main() {
  const args = parseArgs(process.argv);
  const nodesPath = args.nodes;
  const label = args.label;
  const preferType = args.preferType || 'leaf_cascader';

  if (!nodesPath || !label) {
    console.error('❌ Requis: --nodes <nodes.json> --label "<Texte exact du label>"');
    process.exit(1);
  }

  const allNodes = loadJson(path.resolve(nodesPath));
  if (!Array.isArray(allNodes)) {
    console.error('❌ nodes.json doit être un tableau de nœuds.');
    process.exit(1);
  }

  const matches = allNodes.filter(n => n && n.label === label);
  if (matches.length === 0) {
    console.log(`❌ Aucun nœud trouvé pour label: ${label}`);
    process.exit(1);
  }

  console.log(`✅ ${matches.length} nœud(s) trouvé(s) pour "${label}"`);
  for (const n of matches) {
    console.log(`- id=${n.id} | type=${n.type} | fieldType=${n.fieldType} | parentId=${n.parentId}`);
  }

  // Préférence: un nœud de champ direct correspondant au type préféré
  let recommended = matches.find(n => n.fieldType === preferType)
                  || matches.find(n => n.type === preferType);

  // Si on a matché une branche portant le label, essayer de trouver un champ "preferType" dans son sous-arbre
  function getChildren(parentId) { return allNodes.filter(n => n.parentId === parentId); }
  function findDescendantByFieldType(rootId, fieldType) {
    const stack = [rootId];
    const visited = new Set();
    while (stack.length) {
      const id = stack.pop();
      if (visited.has(id)) continue;
      visited.add(id);
      const children = getChildren(id);
      for (const c of children) {
        if (c.fieldType === fieldType) return c;
        stack.push(c.id);
      }
    }
    return null;
  }

  if (!recommended) {
    // Chercher un descendant adéquat si le match principal est une branche
    const branchMatch = matches.find(n => n.type === 'branch');
    if (branchMatch) {
      const desc = findDescendantByFieldType(branchMatch.id, preferType);
      if (desc) {
        recommended = desc;
        console.log(`\nℹ️ Champ descendant trouvé dans la branche: id=${desc.id} | type=${desc.type} | fieldType=${desc.fieldType}`);
      }
    }
  }

  if (!recommended) {
    // Faute de mieux, prendre le premier match
    recommended = matches[0];
  }

  console.log(`\n🎯 Recommandation fieldId à tester: ${recommended.id}`);
  // Pour utilisation dans un pipe
  console.log(`FIELD_ID=${recommended.id}`);
}

main();
