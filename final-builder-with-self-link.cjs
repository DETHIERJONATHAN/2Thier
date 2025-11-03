const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --- CONFIGURATION ---
const DRY_RUN = true; 
// -------------------

const COMPREHENSIVE_ID_REGEX = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|shared-ref-[\w-]+)/g;

function findNodeIdsInObject(obj, idsSet) {
    if (!obj) return;
    const visited = new WeakSet();
    function recurse(current) {
        if (!current || typeof current !== 'object' || visited.has(current)) return;
        visited.add(current);
        if (Array.isArray(current)) {
            current.forEach(item => recurse(item));
        } else {
            for (const key in current) {
                if (Object.prototype.hasOwnProperty.call(current, key)) {
                    const value = current[key];
                    if (typeof value === 'string') {
                        const foundIds = value.match(COMPREHENSIVE_ID_REGEX) || [];
                        foundIds.forEach(id => idsSet.add(id));
                    } else {
                        recurse(value);
                    }
                }
            }
        }
    }
    recurse(obj);
}

async function main() {
    if (DRY_RUN) {
        console.log('🚀 Démarrage en mode "Dry Run" (aucune modification ne sera effectuée).');
    } else {
        console.log('🚨 Démarrage en mode "Live" (LA BASE DE DONNÉES SERA MODIFIÉE).');
    }

    console.log('Chargement de toutes les données (Nœuds, Capacités, Variables)...');
    
    const allNodes = await prisma.treeBranchLeafNode.findMany({
        include: {
            TreeBranchLeafNodeFormula: { select: { id: true, tokens: true } },
            TreeBranchLeafNodeCondition: { select: { id: true, conditionSet: true } },
            TreeBranchLeafNodeTable: { 
                select: { 
                    id: true,
                    tableColumns: { select: { metadata: true } },
                    tableRows: { select: { cells: true } },
                    meta: true
                } 
            },
        },
    });
    const nodesMap = new Map(allNodes.map(node => [node.id, node]));

    const allVariables = await prisma.treeBranchLeafNodeVariable.findMany({
        select: { id: true, nodeId: true }
    });
    const variableMap = new Map(allVariables.map(v => [v.nodeId, v.id]));

    console.log(`✅ ${allNodes.length} nœuds et ${variableMap.size} variables chargées en mémoire.`);
    console.log('--------------------------------------------------');

    let updatesToPerform = [];

    for (const node of allNodes) {
        const newDeps = {
            linkedVariableIds: new Set(),
            linkedFormulaIds: new Set(),
            linkedConditionIds: new Set(),
            linkedTableIds: new Set(),
        };

        // --- ÉTAPE 1: AUTO-LIAISON (Logique ajoutée) ---
        // Lier les propres capacités du nœud pour la traçabilité de base.
        node.TreeBranchLeafNodeFormula.forEach(f => newDeps.linkedFormulaIds.add(f.id));
        node.TreeBranchLeafNodeCondition.forEach(c => newDeps.linkedConditionIds.add(c.id));
        node.TreeBranchLeafNodeTable.forEach(t => newDeps.linkedTableIds.add(t.id));
        // Lier sa propre variable exposée si elle existe
        const selfExposedVariableId = variableMap.get(node.id);
        if (selfExposedVariableId) {
            newDeps.linkedVariableIds.add(selfExposedVariableId);
        }
        // --- FIN AUTO-LIAISON ---

        // --- ÉTAPE 2: ANALYSE DES DÉPENDANCES EXTERNES ---
        const referencedNodeIds = new Set();
        findNodeIdsInObject(node.TreeBranchLeafNodeFormula, referencedNodeIds);
        findNodeIdsInObject(node.TreeBranchLeafNodeCondition, referencedNodeIds);
        findNodeIdsInObject(node.TreeBranchLeafNodeTable, referencedNodeIds);
        
        referencedNodeIds.delete(node.id);

        // --- ÉTAPE 3: LIAISON DES DÉPENDANCES (Logique à 3 niveaux) ---
        for (const depId of referencedNodeIds) {
            const depNode = nodesMap.get(depId);
            if (depNode) {
                // NIVEAU 1: Lier l'ID du nœud dépendant lui-même
                newDeps.linkedVariableIds.add(depNode.id);

                // NIVEAU 2: Lier les IDs de toutes les capacités du nœud dépendant
                depNode.TreeBranchLeafNodeFormula.forEach(f => newDeps.linkedFormulaIds.add(f.id));
                depNode.TreeBranchLeafNodeCondition.forEach(c => newDeps.linkedConditionIds.add(c.id));
                depNode.TreeBranchLeafNodeTable.forEach(t => newDeps.linkedTableIds.add(t.id));

                // NIVEAU 3: Lier l'ID de la variable "exposée" du nœud dépendant, si elle existe
                const exposedVariableId = variableMap.get(depNode.id);
                if (exposedVariableId) {
                    newDeps.linkedVariableIds.add(exposedVariableId);
                }
            }
        }

        // --- ÉTAPE 4: COMPARAISON ET PRÉPARATION DE LA MISE À JOUR ---
        const finalPayload = {
            linkedVariableIds: [...newDeps.linkedVariableIds].sort(),
            linkedFormulaIds: [...newDeps.linkedFormulaIds].sort(),
            linkedConditionIds: [...newDeps.linkedConditionIds].sort(),
            linkedTableIds: [...newDeps.linkedTableIds].sort(),
        };

        const currentNodeState = {
            linkedVariableIds: [...node.linkedVariableIds].sort(),
            linkedFormulaIds: [...node.linkedFormulaIds].sort(),
            linkedConditionIds: [...node.linkedConditionIds].sort(),
            linkedTableIds: [...node.linkedTableIds].sort(),
        };
        
        if (JSON.stringify(finalPayload) !== JSON.stringify(currentNodeState)) {
            updatesToPerform.push({ 
                id: node.id, 
                label: node.label,
                newData: finalPayload,
                oldData: currentNodeState
            });
        }
    }

    console.log('--------------------------------------------------');
    
    if (updatesToPerform.length > 0) {
        console.log(`\n🔎 ${updatesToPerform.length} nœud(s) à mettre à jour trouvés :`);
        updatesToPerform.slice(0, 20).forEach(update => {
             console.log(`\n   - "${update.label}" (ID: ${update.id})`);
             const { newData, oldData } = update;

             if(JSON.stringify(newData.linkedVariableIds) !== JSON.stringify(oldData.linkedVariableIds))
                console.log(`     - Variables: ${newData.linkedVariableIds.length} (Actuel: ${oldData.linkedVariableIds.length})`);
             if(JSON.stringify(newData.linkedFormulaIds) !== JSON.stringify(oldData.linkedFormulaIds))
                console.log(`     - Formules: ${newData.linkedFormulaIds.length} (Actuel: ${oldData.linkedFormulaIds.length})`);
            if(JSON.stringify(newData.linkedConditionIds) !== JSON.stringify(oldData.linkedConditionIds))
                console.log(`     - Conditions: ${newData.linkedConditionIds.length} (Actuel: ${oldData.linkedConditionIds.length})`);
            if(JSON.stringify(newData.linkedTableIds) !== JSON.stringify(oldData.linkedTableIds))
                console.log(`     - Tables: ${newData.linkedTableIds.length} (Actuel: ${oldData.linkedTableIds.length})`);
        });
        if (updatesToPerform.length > 20) {
            console.log(`\n   ... et ${updatesToPerform.length - 20} autre(s) nœud(s).`);
        }
    }

    if (!DRY_RUN && updatesToPerform.length > 0) {
        console.log('\n\nExécution des mises à jour...');
        const transactionPromises = updatesToPerform.map(({ id, newData }) => 
            prisma.treeBranchLeafNode.update({ where: { id }, data: newData })
        );
        await prisma.$transaction(transactionPromises);
        console.log(`✅ ${updatesToPerform.length} nœud(s) ont été mis à jour avec succès.`);
    } else if (DRY_RUN) {
         console.log(`\n🎉 Analyse "Dry Run" terminée. ${updatesToPerform.length} nœud(s) seraient mis à jour.`);
    } else {
        console.log('Aucune mise à jour nécessaire.');
    }
}

main()
    .catch((e) => {
        console.error("Une erreur est survenue :", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
