const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Normalise une référence pour extraire l'ID pur.
 * Inspiré de `normalizeRef` dans operation-interpreter.ts
 * @param {string} ref - La référence brute (ex: "@value.node-id-123", "condition:cond-id-456").
 * @returns {string} L'ID normalisé.
 */
function normalizeRef(ref) {
    if (typeof ref !== 'string') return '';
    return ref
        .replace('@value.', '')
        .replace('@table.', '')
        .replace('node-formula:', '')
        .replace('node-table:', '')
        .replace('node-condition:', '')
        .replace('condition:', '')
        .trim();
}

/**
 * Analyse une structure de données (objet/tableau) et extrait de manière récursive tous les IDs de nœuds référencés.
 * Cette fonction est une implémentation de la logique de dépendance vue dans `operation-interpreter.ts`.
 * @param {any} data - La structure de données à analyser (ex: tokens de formule, conditionSet, config de table).
 * @param {Set<string>} referencedNodeIds - Un Set pour accumuler les IDs de nœuds trouvés.
 */
function findAllDependencies(data, referencedNodeIds) {
    if (!data) return;

    if (Array.isArray(data)) {
        data.forEach(item => findAllDependencies(item, referencedNodeIds));
        return;
    }

    if (typeof data === 'object' && data !== null) {
        // --- Logiques spécifiques inspirées de `operation-interpreter.ts` ---

        // Formule: token de référence objet { type: 'ref', ref: '@value.xxx' }
        if (data.type === 'ref' && data.ref) {
            const id = normalizeRef(data.ref);
            if (id) referencedNodeIds.add(id);
        }

        // Condition: `when` clause
        if (data.when) {
            findAllDependencies(data.when, referencedNodeIds);
        }
        if (data.left?.ref) {
            const id = normalizeRef(data.left.ref);
            if (id) referencedNodeIds.add(id);
        }
        if (data.right?.ref) {
            const id = normalizeRef(data.right.ref);
            if (id) referencedNodeIds.add(id);
        }

        // Condition: `actions` et `fallback`
        if (data.actions) {
            findAllDependencies(data.actions, referencedNodeIds);
        }
        if (data.fallback) {
            findAllDependencies(data.fallback, referencedNodeIds);
        }
        if (data.nodeIds) { // Trouvé dans les actions
            data.nodeIds.forEach(ref => {
                const id = normalizeRef(ref);
                if (id) referencedNodeIds.add(id);
            });
        }

        // Table: `lookup` selectors
        if (data.lookup?.selectors) {
            const selectors = data.lookup.selectors;
            if (selectors.rowFieldId) referencedNodeIds.add(selectors.rowFieldId);
            if (selectors.columnFieldId) referencedNodeIds.add(selectors.columnFieldId);
        }

        // Select Config: source de nœud
        if (data.nodeId && data.hasOwnProperty('useAllChildren')) {
             referencedNodeIds.add(data.nodeId);
        }
        
        // Variable Metadata: référence à un nœud sélectionné
        if (data.selectedNodeId) {
            referencedNodeIds.add(data.selectedNodeId);
        }

        // --- Exploration générique ---
        for (const key in data) {
            findAllDependencies(data[key], referencedNodeIds);
        }
    } else if (typeof data === 'string') {
        // Formule: token de référence string "@value.xxx"
        if (data.startsWith('@value.')) {
            const id = normalizeRef(data);
            if (id) referencedNodeIds.add(id);
        }
    }
}


async function main() {
    console.log('🚀 Démarrage du Dependency Linker v3 (Logique `operation-interpreter`)...');
    await prisma.$connect();

    // 1. Charger toutes les données en mémoire pour des performances optimales
    console.log('- Chargement des données...');
    const [allNodes, allFormulas, allConditions, allTables, allVariables, allSelectConfigs] = await prisma.$transaction([
        prisma.treeBranchLeafNode.findMany({
            select: { id: true, label: true, linkedFormulaIds: true, linkedConditionIds: true, linkedTableIds: true, linkedVariableIds: true }
        }),
        prisma.treeBranchLeafNodeFormula.findMany(),
        prisma.treeBranchLeafNodeCondition.findMany(),
        prisma.treeBranchLeafNodeTable.findMany(),
        prisma.treeBranchLeafNodeVariable.findMany(),
        prisma.treeBranchLeafSelectConfig.findMany()
    ]);

    // 2. Créer des Maps pour un accès instantané
    const nodeMap = new Map(allNodes.map(n => [n.id, n]));
    const formulaMap = new Map();
    allFormulas.forEach(f => {
        if (!formulaMap.has(f.nodeId)) formulaMap.set(f.nodeId, []);
        formulaMap.get(f.nodeId).push(f);
    });
    const conditionMap = new Map();
    allConditions.forEach(c => {
        if (!conditionMap.has(c.nodeId)) conditionMap.set(c.nodeId, []);
        conditionMap.get(c.nodeId).push(c);
    });
    const tableMap = new Map();
    allTables.forEach(t => {
        if (!tableMap.has(t.nodeId)) tableMap.set(t.nodeId, []);
        tableMap.get(t.nodeId).push(t);
    });
    const variableMap = new Map(allVariables.map(v => [v.nodeId, v]));
    const selectConfigMap = new Map(allSelectConfigs.map(sc => [sc.nodeId, sc]));

    const updatesToPerform = [];

    console.log(`- Analyse de ${allNodes.length} nœuds...`);

    // 3. Analyser chaque nœud
    for (const node of allNodes) {
        const referencedNodeIds = new Set();
        const newLinked = {
            linkedFormulaIds: new Set(),
            linkedConditionIds: new Set(),
            linkedTableIds: new Set(),
            linkedVariableIds: new Set(),
        };

        // A. Extraire les dépendances depuis les capacités du nœud actuel
        const formulas = formulaMap.get(node.id) || [];
        const conditions = conditionMap.get(node.id) || [];
        const tables = tableMap.get(node.id) || [];
        const variable = variableMap.get(node.id);
        const selectConfig = selectConfigMap.get(node.id);

        formulas.forEach(f => findAllDependencies(f.tokens, referencedNodeIds));
        conditions.forEach(c => findAllDependencies(c.conditionSet, referencedNodeIds));
        tables.forEach(t => findAllDependencies(t.meta, referencedNodeIds));
        if (variable) findAllDependencies(variable.metadata, referencedNodeIds);
        if (selectConfig) findAllDependencies(selectConfig, referencedNodeIds);

        // B. Construire les listes de dépendances
        // Le nœud dépend toujours de ses propres capacités et de sa propre variable
        if (variable) newLinked.linkedVariableIds.add(variable.id);
        formulas.forEach(f => newLinked.linkedFormulaIds.add(f.id));
        conditions.forEach(c => newLinked.linkedConditionIds.add(c.id));
        tables.forEach(t => newLinked.linkedTableIds.add(t.id));

        // C. Ajouter les capacités et variables des nœuds référencés
        referencedNodeIds.delete(node.id); // Un nœud ne peut pas dépendre de lui-même

        for (const refId of referencedNodeIds) {
            if (!nodeMap.has(refId)) continue; // Ignorer les références brisées

            // Ajouter la variable du nœud référencé
            const refVariable = variableMap.get(refId);
            if (refVariable) newLinked.linkedVariableIds.add(refVariable.id);

            // Ajouter les capacités du nœud référencé
            (formulaMap.get(refId) || []).forEach(f => newLinked.linkedFormulaIds.add(f.id));
            (conditionMap.get(refId) || []).forEach(c => newLinked.linkedConditionIds.add(c.id));
            (tableMap.get(refId) || []).forEach(t => newLinked.linkedTableIds.add(t.id));
        }

        // 4. Comparer avec l'état actuel et préparer la mise à jour
        const oldLinked = {
            linkedFormulaIds: new Set(node.linkedFormulaIds),
            linkedConditionIds: new Set(node.linkedConditionIds),
            linkedTableIds: new Set(node.linkedTableIds),
            linkedVariableIds: new Set(node.linkedVariableIds),
        };

        let hasChanged = false;
        const changedFields = {};

        for (const key of Object.keys(newLinked)) {
            const newIds = [...newLinked[key]].sort();
            const oldIds = [...oldLinked[key]].sort();
            if (JSON.stringify(newIds) !== JSON.stringify(oldIds)) {
                hasChanged = true;
                changedFields[key] = { old: oldIds.length, new: newIds.length };
                nodeMap.get(node.id)[key] = newIds;
            }
        }

        if (hasChanged) {
            updatesToPerform.push({
                id: node.id,
                label: node.label,
                changes: changedFields,
            });
        }
    }

    // 5. Exécuter la transaction de mise à jour
    if (updatesToPerform.length > 0) {
        console.log(`\n✨ ${updatesToPerform.length} nœud(s) à mettre à jour.`);
        updatesToPerform.forEach(update => {
            console.log(`  - "${update.label}" (ID: ${update.id})`);
            for (const field in update.changes) {
                console.log(`    - ${field}: ${update.changes[field].new} IDs (était ${update.changes[field].old})`);
            }
        });

        const transaction = updatesToPerform.map(u => {
            const nodeData = nodeMap.get(u.id);
            return prisma.treeBranchLeafNode.update({
                where: { id: u.id },
                data: {
                    linkedFormulaIds: nodeData.linkedFormulaIds,
                    linkedConditionIds: nodeData.linkedConditionIds,
                    linkedTableIds: nodeData.linkedTableIds,
                    linkedVariableIds: nodeData.linkedVariableIds,
                },
            });
        });

        try {
            console.log('\n- Exécution de la transaction...');
            await prisma.$transaction(transaction);
            console.log('✅ Mise à jour de la base de données terminée avec succès !');
        } catch (error) {
            console.error('❌ Erreur lors de la mise à jour en base de données :', error);
        }
    } else {
        console.log('\n✅ Toutes les dépendances sont déjà à jour. Aucune action requise.');
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
