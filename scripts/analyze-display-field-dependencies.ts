/**
 * 🔍 ANALYSE DES DÉPENDANCES DES CHAMPS D'AFFICHAGE
 * 
 * Ce script analyse tous les champs d'affichage d'un arbre TBL
 * et montre exactement quels champs déclenchent leur recalcul.
 * 
 * Usage:
 *   npm run ts-node scripts/analyze-display-field-dependencies.ts --treeId <TREE_ID>
 */

import { db } from '../src/lib/database';

interface DependencyInfo {
  displayFieldId: string;
  displayFieldLabel: string;
  capacityType: 'formula' | 'condition' | 'table' | 'none';
  capacityId?: string;
  dependencies: Array<{
    nodeId: string;
    label: string;
    type: string;
  }>;
  rawTokens?: any;
}

/**
 * Extrait les nodeIds depuis les tokens d'une formule
 * SUPPORTE: tokens objets {type, value} ET tokens strings "@value.xxx"
 */
function extractNodeIdsFromTokens(tokens: any[]): Set<string> {
  const nodeIds = new Set<string>();
  
  if (!Array.isArray(tokens)) return nodeIds;
  
  for (const token of tokens) {
    let rawValue: string | null = null;
    
    // Cas 1: Token STRING (ex: "@value.xxx", "condition:yyy")
    if (typeof token === 'string') {
      rawValue = token;
    }
    // Cas 2: Token OBJET (ex: {type: 'field', value: '@value.xxx'})
    else if (token && typeof token === 'object') {
      rawValue = token.value || token.ref;
    }
    
    if (!rawValue || typeof rawValue !== 'string') continue;
    
    // Ignorer les opérateurs mathématiques
    if (['+', '-', '*', '/', '(', ')'].includes(rawValue.trim())) continue;
    
    // Nettoyer les préfixes pour extraire le nodeId
    let nodeId = rawValue
      .replace('@value.', '')
      .replace('@table.', '')
      .replace('@calculated.', '')
      .replace('@select.', '')
      .replace('node-formula:', '')
      .replace('node-table:', '')
      .replace('node-condition:', '')
      .replace('condition:', '')
      .replace('formula:', '')
      .replace('table:', '')
      .trim();
    
    // Extraire le premier segment si c'est un chemin avec .
    if (nodeId.includes('.')) {
      nodeId = nodeId.split('.')[0];
    }
    
    // Vérifier si c'est un UUID, nodeId généré, ou shared-ref valide
    const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(-[0-9]+|-sum-total)?$/i;
    const nodeIdRegex = /^node_[0-9]+_[a-z0-9]+$/i;
    const sharedRefRegex = /^shared-ref-[a-z0-9-]+$/i;
    
    if (uuidRegex.test(nodeId) || nodeIdRegex.test(nodeId) || sharedRefRegex.test(nodeId)) {
      nodeIds.add(nodeId);
    }
  }
  
  return nodeIds;
}

/**
 * Extrait les nodeIds depuis le conditionSet d'une condition
 */
function extractNodeIdsFromConditionSet(conditionSet: any): Set<string> {
  const nodeIds = new Set<string>();
  
  if (!conditionSet || typeof conditionSet !== 'object') return nodeIds;
  
  // Analyser les branches
  if (Array.isArray(conditionSet.branches)) {
    for (const branch of conditionSet.branches) {
      // Analyser le WHEN (left et right)
      if (branch.when) {
        if (branch.when.left?.ref) {
          const leftId = branch.when.left.ref
            .replace('@value.', '')
            .replace('@select.', '')
            .replace('@table.', '')
            .split('.')[0];
          if (leftId) nodeIds.add(leftId);
        }
        if (branch.when.right?.ref) {
          const rightId = branch.when.right.ref
            .replace('@value.', '')
            .replace('@select.', '')
            .replace('@table.', '')
            .split('.')[0];
          if (rightId) nodeIds.add(rightId);
        }
      }
      
      // Analyser les actions (nodeIds référencés)
      if (Array.isArray(branch.actions)) {
        for (const action of branch.actions) {
          if (Array.isArray(action.nodeIds)) {
            action.nodeIds.forEach((id: string) => {
              const cleanId = id
                .replace('node-formula:', '')
                .replace('node-table:', '')
                .replace('node-condition:', '')
                .replace('formula:', '')
                .replace('table:', '')
                .replace('condition:', '');
              if (cleanId) nodeIds.add(cleanId);
            });
          }
        }
      }
    }
  }
  
  // Analyser le fallback
  if (conditionSet.fallback?.actions) {
    for (const action of conditionSet.fallback.actions) {
      if (Array.isArray(action.nodeIds)) {
        action.nodeIds.forEach((id: string) => {
          const cleanId = id
            .replace('node-formula:', '')
            .replace('node-table:', '')
            .replace('node-condition:', '')
            .replace('formula:', '')
            .replace('table:', '')
            .replace('condition:', '');
          if (cleanId) nodeIds.add(cleanId);
        });
      }
    }
  }
  
  return nodeIds;
}

/**
 * Extrait les nodeIds depuis la configuration d'une table lookup
 */
function extractNodeIdsFromTableConfig(tableConfig: any): Set<string> {
  const nodeIds = new Set<string>();
  
  if (!tableConfig || typeof tableConfig !== 'object') return nodeIds;
  
  // Analyser lookupFieldId
  if (tableConfig.lookupFieldId) {
    nodeIds.add(tableConfig.lookupFieldId);
  }
  
  // Analyser les conditions de filtre
  if (Array.isArray(tableConfig.filterConditions)) {
    for (const condition of tableConfig.filterConditions) {
      if (condition.fieldId) {
        nodeIds.add(condition.fieldId);
      }
    }
  }
  
  return nodeIds;
}

async function analyzeDisplayFieldDependencies(treeId: string) {
  console.log(`\n🔍 Analyse des dépendances pour l'arbre: ${treeId}\n`);
  
  // 1. Récupérer tous les noeuds de l'arbre
  const allNodes = await db.treeBranchLeafNode.findMany({
    where: { treeId },
    select: {
      id: true,
      label: true,
      type: true,
      fieldType: true,
      metadata: true
    }
  });
  
  const nodeMap = new Map(allNodes.map(n => [n.id, n]));
  
  // 1b. Récupérer toutes les tables de l'arbre
  const allTables = await db.treeBranchLeafNodeTable.findMany({
    where: {
      TreeBranchLeafNode: { treeId }
    },
    select: {
      id: true,
      name: true,
      nodeId: true
    }
  });
  
  // Ajouter les tables à la map avec un type spécial
  for (const table of allTables) {
    nodeMap.set(table.id, {
      id: table.id,
      label: table.name || 'Table sans nom',
      type: 'table',
      fieldType: null,
      metadata: null
    });
  }
  
  // 2. Trouver les VRAIS champs d'affichage = Variables avec sourceRef
  const variables = await db.treeBranchLeafNodeVariable.findMany({
    where: {
      TreeBranchLeafNode: { treeId }
    },
    select: {
      id: true,
      nodeId: true,
      sourceRef: true,
      TreeBranchLeafNode: {
        select: { label: true }
      }
    }
  });
  
  console.log(`📊 Trouvé ${variables.length} VRAIS champs d'affichage (Variables)\n`);
  
  const results: DependencyInfo[] = [];
  
  // 3. Pour chaque variable (vrai champ d'affichage), analyser ses dépendances
  for (const variable of variables) {
    const sourceRef = variable.sourceRef;
    
    const info: DependencyInfo = {
      displayFieldId: variable.nodeId,
      displayFieldLabel: variable.TreeBranchLeafNode?.label || 'Sans label',
      capacityType: 'none',
      dependencies: []
    };
    
    if (!sourceRef) {
      results.push(info);
      continue;
    }
    
    // Détecter le type de capacity
    if (sourceRef.includes('node-formula:') || sourceRef.includes('formula:')) {
      info.capacityType = 'formula';
      const formulaId = sourceRef.replace('node-formula:', '').replace('formula:', '');
      info.capacityId = formulaId;
      
      // Récupérer la formule
      const formula = await db.treeBranchLeafNodeFormula.findUnique({
        where: { id: formulaId },
        select: { tokens: true }
      });
      
      if (formula?.tokens) {
        info.rawTokens = formula.tokens;
        const depNodeIds = extractNodeIdsFromTokens(formula.tokens as any[]);
        
        for (const depNodeId of depNodeIds) {
          const depNode = nodeMap.get(depNodeId);
          info.dependencies.push({
            nodeId: depNodeId,
            label: depNode?.label || 'Inconnu',
            type: depNode?.type || 'unknown'
          });
        }
      }
    } 
    else if (sourceRef.includes('node-condition:') || sourceRef.includes('condition:')) {
      info.capacityType = 'condition';
      const conditionId = sourceRef.replace('node-condition:', '').replace('condition:', '');
      info.capacityId = conditionId;
      
      // Récupérer la condition
      const condition = await db.treeBranchLeafNodeCondition.findUnique({
        where: { id: conditionId },
        select: { conditionSet: true }
      });
      
      if (condition?.conditionSet) {
        const depNodeIds = extractNodeIdsFromConditionSet(condition.conditionSet);
        
        for (const depNodeId of depNodeIds) {
          const depNode = nodeMap.get(depNodeId);
          info.dependencies.push({
            nodeId: depNodeId,
            label: depNode?.label || 'Inconnu',
            type: depNode?.type || 'unknown'
          });
        }
      }
    }
    else if (sourceRef.includes('node-table:') || sourceRef.includes('table:')) {
      info.capacityType = 'table';
      const tableId = sourceRef.replace('node-table:', '').replace('table:', '');
      info.capacityId = tableId;
      
      // Récupérer la config de table (peut être dans metadata)
      const tableNode = await db.treeBranchLeafNode.findUnique({
        where: { id: tableId },
        select: { metadata: true }
      });
      
      if (tableNode?.metadata) {
        const depNodeIds = extractNodeIdsFromTableConfig(tableNode.metadata);
        
        for (const depNodeId of depNodeIds) {
          const depNode = nodeMap.get(depNodeId);
          info.dependencies.push({
            nodeId: depNodeId,
            label: depNode?.label || 'Inconnu',
            type: depNode?.type || 'unknown'
          });
        }
      }
    }
    
    results.push(info);
  }
  
  // 4. Afficher les résultats de manière CLAIRE
  console.log('\n📋 RAPPORT DÉTAILLÉ - VOS CHAMPS D\'AFFICHAGE\n');
  console.log('═'.repeat(100));
  
  for (let i = 0; i < results.length; i++) {
    const info = results[i];
    
    console.log(`\n${i + 1}. 📊 CHAMP D'AFFICHAGE : "${info.displayFieldLabel}"`);
    console.log('─'.repeat(100));
    
    // Capacité
    if (info.capacityType === 'formula') {
      console.log(`   📐 CAPACITÉ : Formule`);
      if (info.rawTokens) {
        const formula = (info.rawTokens as string[]).join(' ');
        console.log(`   📝 Expression : ${formula}`);
      }
    } else if (info.capacityType === 'condition') {
      console.log(`   🔀 CAPACITÉ : Condition (SI... ALORS... SINON...)`);
    } else if (info.capacityType === 'table') {
      console.log(`   📋 CAPACITÉ : Table Lookup`);
    } else {
      console.log(`   ⚠️  CAPACITÉ : Aucune (champ simple)`);
    }
    
    // Dépendances (Champs liés)
    console.log(`\n   🔗 CHAMPS LIÉS :`);
    if (info.dependencies.length === 0) {
      console.log(`      ❌ Aucun champ lié détecté`);
    } else {
      for (const dep of info.dependencies) {
        const typeEmoji = dep.type === 'table' ? '📋' : '📝';
        console.log(`      ${typeEmoji} ${dep.label}`);
      }
      console.log(`\n      → Total: ${info.dependencies.length} champ(s) lié(s)`);
    }
    
    console.log('\n' + '═'.repeat(100));
  }
  
  // 5. Statistiques récapitulatives
  console.log(`\n\n📊 RÉSUMÉ GLOBAL\n`);
  console.log('─'.repeat(100));
  console.log(`   📌 Total champs d'affichage : ${results.length}`);
  console.log(`   📐 Avec formules : ${results.filter(r => r.capacityType === 'formula').length}`);
  console.log(`   🔀 Avec conditions : ${results.filter(r => r.capacityType === 'condition').length}`);
  console.log(`   📋 Avec tables : ${results.filter(r => r.capacityType === 'table').length}`);
  console.log(`   ⚠️  Sans capacity : ${results.filter(r => r.capacityType === 'none').length}`);
  console.log(`\n   ✅ Avec champs liés : ${results.filter(r => r.dependencies.length > 0).length}`);
  console.log(`   ❌ Sans champs liés : ${results.filter(r => r.dependencies.length === 0).length}`);
  console.log('─'.repeat(100));
  
  return results;
}

// Exécution
const args = process.argv.slice(2);
const treeIdIndex = args.indexOf('--treeId');

if (treeIdIndex === -1 || !args[treeIdIndex + 1]) {
  console.error('❌ Erreur: --treeId requis');
  console.log('Usage: npm run ts-node scripts/analyze-display-field-dependencies.ts --treeId <TREE_ID>');
  process.exit(1);
}

const treeId = args[treeIdIndex + 1];

analyzeDisplayFieldDependencies(treeId)
  .then(() => {
    console.log('\n✅ Analyse terminée\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });
