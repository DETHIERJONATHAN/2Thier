const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --- CONFIGURATION ---
const DRY_RUN = false; 
// -------------------

// Regex pour trouver les IDs de nœuds (UUID v4) ET les références partagées
const COMPREHENSIVE_ID_REGEX = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|shared-ref-\d+-\w+)/g;

/**
 * Parcourt un objet ou un tableau récursivement pour trouver tous les IDs (UUIDs et shared-refs).
 * @param {any} obj L'objet à analyser.
 * @param {Set<string>} idsSet Le Set pour stocker les IDs trouvés.
 */
function findNodeIdsInObject(obj, idsSet) {
    if (!obj) return;

    const visited = new WeakSet();

    function recurse(current) {
        if (!current || typeof current !== 'object' || visited.has(current)) {
            return;
        }
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

    console.log('Chargement de tous les nœuds et de leurs capacités...');
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
    console.log(`✅ ${allNodes.length} nœuds chargés en mémoire.`);
    console.log('--------------------------------------------------');

    let updatesToPerform = [];

    for (const node of allNodes) {
        const newDeps = {
            linkedVariableIds: new Set(),
            linkedFormulaIds: new Set(),
            linkedConditionIds: new Set(),
            linkedTableIds: new Set(),
        };

        const referencedNodeIds = new Set();
        findNodeIdsInObject(node.TreeBranchLeafNodeFormula, referencedNodeIds);
        findNodeIdsInObject(node.TreeBranchLeafNodeCondition, referencedNodeIds);
        findNodeIdsInObject(node.TreeBranchLeafNodeTable, referencedNodeIds);
        
        referencedNodeIds.delete(node.id);

        for (const depId of referencedNodeIds) {
            const depNode = nodesMap.get(depId);
            if (depNode) {
                // Règle principale : lier l'ID du nœud dépendant comme une "variable"
                newDeps.linkedVariableIds.add(depNode.id);

                // Lier toutes les capacités du nœud dépendant
                depNode.TreeBranchLeafNodeFormula.forEach(f => newDeps.linkedFormulaIds.add(f.id));
                depNode.TreeBranchLeafNodeCondition.forEach(c => newDeps.linkedConditionIds.add(c.id));
                depNode.TreeBranchLeafNodeTable.forEach(t => newDeps.linkedTableIds.add(t.id));
            }
        }

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
        updatesToPerform.slice(0, 15).forEach(update => { // On affiche les 15 premiers pour la lisibilité
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
        if (updatesToPerform.length > 15) {
            console.log(`\n   ... et ${updatesToPerform.length - 15} autre(s) nœud(s).`);
        }
    }

    if (!DRY_RUN && updatesToPerform.length > 0) {
        console.log('\n\nExécution des mises à jour...');
        const transactionPromises = updatesToPerform.map(({ id, newData }) => 
            prisma.treeBranchLeafNode.update({
                where: { id },
                data: newData,
            })
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
