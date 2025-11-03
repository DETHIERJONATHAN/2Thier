const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = true;

const ID_REGEX_GLOBAL = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g;

function findDependencyNodeIds(obj, idsSet) {
    if (!obj) return;
    if (Array.isArray(obj)) {
        obj.forEach(item => findDependencyNodeIds(item, idsSet));
        return;
    }
    if (typeof obj === 'object') {
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const value = obj[key];
                if (typeof value === 'string') {
                    const foundIds = value.match(ID_REGEX_GLOBAL) || [];
                    foundIds.forEach(id => idsSet.add(id));
                } else {
                    findDependencyNodeIds(value, idsSet);
                }
            }
        }
    }
}

async function main() {
    console.log(`🚀 Démarrage en mode ${DRY_RUN ? '"Dry Run"' : '"Live"'}.`);

    console.log('Chargement de tous les nœuds et variables...');
    const allNodes = await prisma.treeBranchLeafNode.findMany({
        select: {
            id: true,
            label: true,
            linkedVariableIds: true,
            TreeBranchLeafNodeFormula: { select: { tokens: true } },
            TreeBranchLeafNodeCondition: { select: { conditionSet: true } },
            TreeBranchLeafNodeTable: { select: { columns: true, actions: true } },
        },
    });

    const variableMap = new Map();
    const allVariables = await prisma.treeBranchLeafNodeVariable.findMany({
        select: { id: true, treeBranchLeafNodeId: true }
    });
    allVariables.forEach(v => {
        if(v.treeBranchLeafNodeId) {
            variableMap.set(v.treeBranchLeafNodeId, v.id);
        }
    });

    console.log(`✅ ${allNodes.length} nœuds et ${variableMap.size} variables chargés.`);
    console.log('--------------------------------------------------');

    let updatesToPerform = [];

    for (const node of allNodes) {
        const dependencyNodeIds = new Set();
        findDependencyNodeIds(node.TreeBranchLeafNodeFormula, dependencyNodeIds);
        findDependencyNodeIds(node.TreeBranchLeafNodeCondition, dependencyNodeIds);
        findDependencyNodeIds(node.TreeBranchLeafNodeTable, dependencyNodeIds);
        
        // On s'assure de ne pas se référencer soi-même
        dependencyNodeIds.delete(node.id);

        if (dependencyNodeIds.size === 0) {
            continue;
        }

        const newLinkedVariableIds = new Set(node.linkedVariableIds);
        let hasChanged = false;

        for (const depId of dependencyNodeIds) {
            const variableId = variableMap.get(depId);
            if (variableId && !newLinkedVariableIds.has(variableId)) {
                newLinkedVariableIds.add(variableId);
                hasChanged = true;
            }
        }

        if (hasChanged) {
            const oldIds = [...node.linkedVariableIds].sort();
            const newIds = [...newLinkedVariableIds].sort();

            // Vérification finale pour être absolument sûr
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
