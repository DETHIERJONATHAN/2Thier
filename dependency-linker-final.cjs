const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Normalise une référence pour extraire l'ID pur.
 * @param {string} ref - La référence brute.
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
 * Analyse une structure de données et extrait de manière récursive tous les IDs de nœuds référencés.
 * @param {any} data - La structure de données à analyser.
 * @param {Set<string>} referencedNodeIds - Un Set pour accumuler les IDs de nœuds trouvés.
 */
function findAllReferencedNodeIds(data, referencedNodeIds) {
    if (!data) return;

    if (Array.isArray(data)) {
        data.forEach(item => findAllReferencedNodeIds(item, referencedNodeIds));
        return;
    }

    if (typeof data === 'object' && data !== null) {
        // Logiques spécifiques pour trouver les références
        if (data.type === 'ref' && data.ref) {
            const id = normalizeRef(data.ref);
            if (id) referencedNodeIds.add(id);
        }
        if (data.left?.ref) {
            const id = normalizeRef(data.left.ref);
            if (id) referencedNodeIds.add(id);
        }
        if (data.right?.ref) {
            const id = normalizeRef(data.right.ref);
            if (id) referencedNodeIds.add(id);
        }
        if (data.nodeIds && Array.isArray(data.nodeIds)) {
            data.nodeIds.forEach(ref => {
                const id = normalizeRef(ref);
                if (id) referencedNodeIds.add(id);
            });
        }
        if (data.lookup?.selectors?.rowFieldId) {
            referencedNodeIds.add(data.lookup.selectors.rowFieldId);
        }
        if (data.lookup?.selectors?.columnFieldId) {
            referencedNodeIds.add(data.lookup.selectors.columnFieldId);
        }
        if (data.nodeId && data.hasOwnProperty('useAllChildren')) {
             referencedNodeIds.add(data.nodeId);
        }
        if (data.selectedNodeId) {
            referencedNodeIds.add(data.selectedNodeId);
        }

        // Exploration générique
        for (const key in data) {
            findAllReferencedNodeIds(data[key], referencedNodeIds);
        }
    } else if (typeof data === 'string') {
        if (data.startsWith('@value.')) {
            const id = normalizeRef(data);
            if (id) referencedNodeIds.add(id);
        }
    }
}

async function main() {
    console.log('🚀 Démarrage du Dependency Linker Final (Logique Inverse)...');
    await prisma.$connect();

    // 1. Charger toutes les données en mémoire
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
    const getCapacities = (nodeId) => ({
        formulas: allFormulas.filter(f => f.nodeId === nodeId),
        conditions: allConditions.filter(c => c.nodeId === nodeId),
        tables: allTables.filter(t => t.nodeId === nodeId),
        variable: allVariables.find(v => v.nodeId === nodeId),
        selectConfig: allSelectConfigs.find(sc => sc.nodeId === nodeId)
    });

    // 3. PASSE 1: Calculer les dépendances SORTANTES pour chaque nœud
    console.log('- Passe 1: Calcul des dépendances sortantes...');
    const outgoingDependencies = new Map();
    for (const node of allNodes) {
        const referencedNodeIds = new Set();
        const capacities = getCapacities(node.id);
        
        capacities.formulas.forEach(f => findAllReferencedNodeIds(f.tokens, referencedNodeIds));
        capacities.conditions.forEach(c => findAllReferencedNodeIds(c.conditionSet, referencedNodeIds));
        capacities.tables.forEach(t => findAllReferencedNodeIds(t.meta, referencedNodeIds));
        if (capacities.variable) findAllReferencedNodeIds(capacities.variable.metadata, referencedNodeIds);
        if (capacities.selectConfig) findAllReferencedNodeIds(capacities.selectConfig, referencedNodeIds);

        referencedNodeIds.delete(node.id); // Un nœud ne dépend pas de lui-même
        outgoingDependencies.set(node.id, referencedNodeIds);
    }

    // 4. PASSE 2: Calculer l'état final en incluant les dépendances ENTRANTES
    console.log('- Passe 2: Calcul des dépendances entrantes...');
    const finalLinkedState = new Map();
    // Initialiser l'état final pour chaque nœud
    for (const node of allNodes) {
        finalLinkedState.set(node.id, {
            linkedFormulaIds: new Set(),
            linkedConditionIds: new Set(),
            linkedTableIds: new Set(),
            linkedVariableIds: new Set(),
        });
    }

    for (const node of allNodes) {
        const nodeId = node.id;
        const state = finalLinkedState.get(nodeId);
        const capacities = getCapacities(nodeId);

        // a) Un nœud dépend toujours de ses propres capacités/variable
        if (capacities.variable) state.linkedVariableIds.add(capacities.variable.id);
        capacities.formulas.forEach(f => state.linkedFormulaIds.add(f.id));
        capacities.conditions.forEach(c => state.linkedConditionIds.add(c.id));
        capacities.tables.forEach(t => state.linkedTableIds.add(t.id));

        // b) Dépendances sortantes : Le nœud A dépend des variables des nœuds qu'il référence
        const referencedNodeIds = outgoingDependencies.get(nodeId) || new Set();
        for (const refId of referencedNodeIds) {
            const refCapacities = getCapacities(refId);
            if (refCapacities.variable) {
                state.linkedVariableIds.add(refCapacities.variable.id);
            }
        }

        // c) Dépendances entrantes : Si un nœud C référence A, alors A dépend de la variable/capacités de C
        for (const [sourceNodeId, referencedIds] of outgoingDependencies.entries()) {
            if (referencedIds.has(nodeId)) {
                const sourceCapacities = getCapacities(sourceNodeId);
                if (sourceCapacities.variable) {
                    state.linkedVariableIds.add(sourceCapacities.variable.id);
                }
                sourceCapacities.formulas.forEach(f => state.linkedFormulaIds.add(f.id));
                sourceCapacities.conditions.forEach(c => state.linkedConditionIds.add(c.id));
                sourceCapacities.tables.forEach(t => state.linkedTableIds.add(t.id));
            }
        }
    }

    // 5. Comparer l'état final avec l'état actuel et préparer la mise à jour
    console.log('- Comparaison et préparation de la mise à jour...');
    const updatesToPerform = [];
    for (const node of allNodes) {
        const oldState = {
            linkedFormulaIds: new Set(node.linkedFormulaIds),
            linkedConditionIds: new Set(node.linkedConditionIds),
            linkedTableIds: new Set(node.linkedTableIds),
            linkedVariableIds: new Set(node.linkedVariableIds),
        };
        const newState = finalLinkedState.get(node.id);
        
        let hasChanged = false;
        const changedFields = {};

        for (const key of Object.keys(newState)) {
            const newIds = [...newState[key]].sort();
            const oldIds = [...oldState[key]].sort();
            if (JSON.stringify(newIds) !== JSON.stringify(oldIds)) {
                hasChanged = true;
                changedFields[key] = { old: oldIds.length, new: newIds.length };
            }
        }

        if (hasChanged) {
            updatesToPerform.push({
                id: node.id,
                label: node.label,
                changes: changedFields,
                data: {
                    linkedFormulaIds: [...newState.linkedFormulaIds],
                    linkedConditionIds: [...newState.linkedConditionIds],
                    linkedTableIds: [...newState.linkedTableIds],
                    linkedVariableIds: [...newState.linkedVariableIds],
                }
            });
        }
    }

    // 6. Exécuter la transaction
    if (updatesToPerform.length > 0) {
        console.log(`\n✨ ${updatesToPerform.length} nœud(s) à mettre à jour.`);
        updatesToPerform.forEach(update => {
            console.log(`  - "${update.label}" (ID: ${update.id})`);
            for (const field in update.changes) {
                console.log(`    - ${field}: ${update.changes[field].new} IDs (était ${update.changes[field].old})`);
            }
        });

        const transaction = updatesToPerform.map(u => 
            prisma.treeBranchLeafNode.update({
                where: { id: u.id },
                data: u.data,
            })
        );

        try {
            console.log('\n- Exécution de la transaction...');
            await prisma.$transaction(transaction);
            console.log('✅ Mise à jour de la base de données terminée avec succès !');
        } catch (error) {
            console.error('❌ Erreur lors de la mise à jour en base de données :', error);
        }
    } else {
        console.log('\n✅ Toutes les dépendances (sortantes et entrantes) sont déjà à jour.');
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
