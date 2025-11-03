const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Extrait récursivement les IDs de nœuds référencés à partir de n'importe quel objet ou tableau JSON.
 * @param {any} data - La donnée à inspecter.
 * @param {Set<string>} nodeIds - Le set pour stocker les IDs de nœuds trouvés.
 */
function findReferencedNodeIds(data, nodeIds) {
    if (!data) return;

    if (Array.isArray(data)) {
        data.forEach(item => findReferencedNodeIds(item, nodeIds));
    } else if (typeof data === 'object' && data !== null) {
        // Logique spécifique pour les tokens de formule/condition qui référencent un nœud
        if (data.type === 'variable' && typeof data.value === 'string') {
            nodeIds.add(data.value);
        }
        // Logique pour les lookups de table
        else if (data.lookupNodeId && typeof data.lookupNodeId === 'string') {
            nodeIds.add(data.lookupNodeId);
        }
        // Logique pour les champs de type 'select' avec source de nœud
        else if (data.nodeId && typeof data.nodeId === 'string') {
             nodeIds.add(data.nodeId);
        }
        // Logique pour les métadonnées de variable qui référencent un nœud
        else if (data.selectedNodeId && typeof data.selectedNodeId === 'string') {
            nodeIds.add(data.selectedNodeId);
        }

        // Parcourir toutes les clés de l'objet pour une recherche exhaustive
        for (const key in data) {
            findReferencedNodeIds(data[key], nodeIds);
        }
    }
}

async function main() {
    console.log('🚀 Démarrage du Dependency Linker v2 (Logique Corrigée)...');
    await prisma.$connect();

    // 1. Charger toutes les entités nécessaires en mémoire
    console.log('- Chargement des données...');
    const allNodes = await prisma.treeBranchLeafNode.findMany({
        select: {
            id: true,
            label: true,
            linkedFormulaIds: true,
            linkedConditionIds: true,
            linkedTableIds: true,
            linkedVariableIds: true,
        }
    });

    const allFormulas = await prisma.treeBranchLeafNodeFormula.findMany();
    const allConditions = await prisma.treeBranchLeafNodeCondition.findMany();
    const allTables = await prisma.treeBranchLeafNodeTable.findMany();
    const allVariables = await prisma.treeBranchLeafNodeVariable.findMany();
    const allSelectConfigs = await prisma.treeBranchLeafSelectConfig.findMany();

    // Créer des maps pour un accès rapide
    const variableMap = new Map(allVariables.map(v => [v.nodeId, v.id]));
    const nodeMap = new Map(allNodes.map(n => [n.id, n]));

    const updatesToPerform = [];

    console.log(`- Analyse de ${allNodes.length} nœuds...`);

    // 2. Analyser chaque nœud pour construire ses nouvelles dépendances
    for (const node of allNodes) {
        const referencedNodeIds = new Set();
        const newLinked = {
            linkedFormulaIds: new Set(),
            linkedConditionIds: new Set(),
            linkedTableIds: new Set(),
            linkedVariableIds: new Set(),
        };

        // A. Dépendances directes (capacités et variable appartenant au nœud)
        const formulas = allFormulas.filter(f => f.nodeId === node.id);
        const conditions = allConditions.filter(c => c.nodeId === node.id);
        const tables = allTables.filter(t => t.nodeId === node.id);
        const selectConfig = allSelectConfigs.find(sc => sc.nodeId === node.id);
        const ownVariable = allVariables.find(v => v.nodeId === node.id);

        // La variable du nœud est toujours une dépendance de lui-même
        if (ownVariable) {
            newLinked.linkedVariableIds.add(ownVariable.id);
            // Analyser les métadonnées de la variable elle-même pour des références
            findReferencedNodeIds(ownVariable.metadata, referencedNodeIds);
        }

        // Analyser les capacités pour trouver les nœuds référencés
        formulas.forEach(f => {
            newLinked.linkedFormulaIds.add(f.id);
            findReferencedNodeIds(f.tokens, referencedNodeIds);
        });
        conditions.forEach(c => {
            newLinked.linkedConditionIds.add(c.id);
            findReferencedNodeIds(c.conditionSet, referencedNodeIds);
        });
        tables.forEach(t => {
            newLinked.linkedTableIds.add(t.id);
            findReferencedNodeIds(t.config, referencedNodeIds);
        });
        if (selectConfig) {
            findReferencedNodeIds(selectConfig, referencedNodeIds);
        }

        // B. Dépendances indirectes (variables des nœuds référencés)
        referencedNodeIds.delete(node.id); // On ne se référence pas soi-même

        for (const refId of referencedNodeIds) {
            // Pour chaque nœud référencé, on ajoute sa variable à la liste des dépendances
            if (variableMap.has(refId)) {
                newLinked.linkedVariableIds.add(variableMap.get(refId));
            }
        }

        // 3. Comparer avec les dépendances existantes
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
                changedFields[key] = { old: oldIds, new: newIds };
                nodeMap.get(node.id)[key] = newIds; // Mettre à jour la vue en mémoire
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

    // 4. Exécuter les mises à jour si nécessaire
    if (updatesToPerform.length > 0) {
        console.log(`\n✨ ${updatesToPerform.length} nœud(s) à mettre à jour.`);
        for (const update of updatesToPerform) {
            console.log(`  - "${update.label}" (ID: ${update.id})`);
            for(const field in update.changes) {
                console.log(`    - ${field}: ${update.changes[field].new.length} IDs (était ${update.changes[field].old.length})`);
            }
        }

        const transaction = updatesToPerform.map(u => {
            const nodeData = nodeMap.get(u.id);
            return prisma.treeBranchLeafNode.update({
                where: { id: u.id },
                data: {
                    linkedFormulaIds: [...nodeData.linkedFormulaIds],
                    linkedConditionIds: [...nodeData.linkedConditionIds],
                    linkedTableIds: [...nodeData.linkedTableIds],
                    linkedVariableIds: [...nodeData.linkedVariableIds],
                },
            });
        });

        try {
            console.log('\n- Exécution de la transaction...');
            await prisma.$transaction(transaction);
            console.log('✅ Mise à jour terminée avec succès !');
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
