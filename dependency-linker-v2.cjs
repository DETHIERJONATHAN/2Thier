const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = true;

// Regex pour trouver les IDs de nœuds (UUID v4)
const NODE_ID_REGEX = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g;

function findNodeIdsInJson(obj, idsSet) {
    if (!obj) return;

    const jsonString = JSON.stringify(obj);
    const foundIds = jsonString.match(NODE_ID_REGEX) || [];
    foundIds.forEach(id => idsSet.add(id));
}

async function main() {
    console.log(`🚀 Démarrage en mode ${DRY_RUN ? '"Dry Run"' : '"Live"'}.`);

    console.log('Chargement de toutes les données nécessaires...');
    const allNodes = await prisma.treeBranchLeafNode.findMany({
        select: {
            id: true,
            label: true,
            linkedVariableIds: true,
            TreeBranchLeafNodeFormula: { select: { tokens: true } },
            TreeBranchLeafNodeCondition: { select: { conditionSet: true } },
            TreeBranchLeafNodeTable: { select: { tableColumns: true, actions: true } }, // Correction: 'tableColumns' au lieu de 'columns'
        },
    });

    const variableMap = new Map();
    const allVariables = await prisma.treeBranchLeafNodeVariable.findMany({
        select: { id: true, treeBranchLeafNodeId: true }
    });
    allVariables.forEach(v => {
        if (v.treeBranchLeafNodeId) {
            variableMap.set(v.treeBranchLeafNodeId, v.id);
        }
    });

    console.log(`✅ ${allNodes.length} nœuds et ${variableMap.size} variables chargés.`);
    console.log('--------------------------------------------------');

    let updatesToPerform = [];

    for (const node of allNodes) {
        const dependencyNodeIds = new Set();
        
        // Recherche des dépendances dans toutes les capacités du nœud
        findNodeIdsInJson(node.TreeBranchLeafNodeFormula, dependencyNodeIds);
        findNodeIdsInJson(node.TreeBranchLeafNodeCondition, dependencyNodeIds);
        findNodeIdsInJson(node.TreeBranchLeafNodeTable, dependencyNodeIds);
        
        // On s'assure de ne pas se référencer soi-même
        dependencyNodeIds.delete(node.id);

        if (dependencyNodeIds.size === 0) {
            continue; // Pas de dépendances externes, on passe au suivant
        }

        // On part des IDs de variables déjà liés
        const newLinkedVariableIds = new Set(node.linkedVariableIds);
        let hasChanged = false;

        // Pour chaque ID de nœud dépendant, on ajoute l'ID de sa variable
        for (const depId of dependencyNodeIds) {
            const variableId = variableMap.get(depId);
            // Si la variable existe et n'est pas déjà dans la liste, on l'ajoute
            if (variableId && !newLinkedVariableIds.has(variableId)) {
                newLinkedVariableIds.add(variableId);
                hasChanged = true;
            }
        }

        if (hasChanged) {
            const oldIds = [...node.linkedVariableIds].sort();
            const newIds = [...newLinkedVariableIds].sort();

            // Vérification finale pour être absolument sûr que la liste a changé
            if (JSON.stringify(oldIds) !== JSON.stringify(newIds)) {
                 updatesToPerform.push({
                    id: node.id,
                    label: node.label,
                    newData: { linkedVariableIds: newIds },
                    oldData: { linkedVariableIds: oldIds },
                });
            }
        }
    }

    console.log('--------------------------------------------------');
    
    if (updatesToPerform.length > 0) {
        console.log(`\n🔎 ${updatesToPerform.length} nœud(s) à mettre à jour trouvés (focus sur les variables) :`);
        updatesToPerform.forEach(update => {
            console.log(`\n   - "${update.label}" (ID: ${update.id})`);
            console.log(`     - Variables à lier: [${update.newData.linkedVariableIds.join(', ')}]`);
            console.log(`     - Variables actuelles: [${update.oldData.linkedVariableIds.join(', ')}]`);
        });
    }

    if (!DRY_RUN && updatesToPerform.length > 0) {
        console.log('\n\nExécution des mises à jour...');
        for (const { id, newData } of updatesToPerform) {
            await prisma.treeBranchLeafNode.update({
                where: { id },
                data: { linkedVariableIds: newData.linkedVariableIds },
            });
        }
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
