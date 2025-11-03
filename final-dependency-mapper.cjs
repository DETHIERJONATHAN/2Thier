const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --- CONFIGURATION ---
const DRY_RUN = true; 
// -------------------

// --- FONCTIONS D'ANALYSE ---

const ID_REGEX = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i;

function extractIdFromRef(ref) {
    if (typeof ref !== 'string') return null;
    const match = ref.match(ID_REGEX);
    return match ? match[0] : null;
}

function findNodeIdsInObject(obj, nodeIds) {
    if (!obj) return;
    if (Array.isArray(obj)) {
        obj.forEach(item => findNodeIdsInObject(item, nodeIds));
        return;
    }
    if (typeof obj === 'object') {
        for (const key in obj) {
            const value = obj[key];
            if ((key === 'ref' || key === 'var') && typeof value === 'string') {
                const id = extractIdFromRef(value);
                if (id) nodeIds.add(id);
            } else if (key === 'nodeIds' && Array.isArray(value)) {
                value.forEach(id => {
                    if (typeof id === 'string') {
                        const extractedId = extractIdFromRef(id);
                        if (extractedId) nodeIds.add(extractedId);
                    }
                });
            } else {
                findNodeIdsInObject(value, nodeIds);
            }
        }
    }
}

// --- SCRIPT PRINCIPAL ---

async function main() {
    if (DRY_RUN) {
        console.log('🚀 Démarrage en mode "Dry Run" (aucune modification ne sera effectuée).');
    } else {
        console.log('🚨 Démarrage en mode "Live" (LA BASE DE DONNÉES SERA MODIFIÉE).');
    }

    console.log('Chargement de tous les nœuds et de leurs capacités...');
    const allNodes = await prisma.treeBranchLeafNode.findMany({
        include: {
            TreeBranchLeafNodeFormula: true,
            TreeBranchLeafNodeCondition: true,
            TreeBranchLeafNodeTable: true,
            TreeBranchLeafNodeVariable: true,
        },
    });

    const nodesMap = new Map(allNodes.map(node => [node.id, node]));
    console.log(`✅ ${allNodes.length} nœuds chargés en mémoire.`);
    console.log('--------------------------------------------------');

    let updatesToPerform = [];

    for (const node of allNodes) {
        const collectedDeps = {
            linkedVariableIds: new Set(node.linkedVariableIds),
            linkedFormulaIds: new Set(node.linkedFormulaIds),
            linkedConditionIds: new Set(node.linkedConditionIds),
            linkedTableIds: new Set(node.linkedTableIds),
        };

        let analysisReport = [];

        // Règle 1: Chaque noeud DOIT être lié à sa propre variable s'il en a une.
        if (node.TreeBranchLeafNodeVariable) {
            collectedDeps.linkedVariableIds.add(node.TreeBranchLeafNodeVariable.id);
        }
        // Chaque noeud est lié à ses propres capacités.
        node.TreeBranchLeafNodeFormula.forEach(f => collectedDeps.linkedFormulaIds.add(f.id));
        node.TreeBranchLeafNodeCondition.forEach(c => collectedDeps.linkedConditionIds.add(c.id));
        node.TreeBranchLeafNodeTable.forEach(t => collectedDeps.linkedTableIds.add(t.id));

        const dependencyNodeIds = new Set();
        node.TreeBranchLeafNodeFormula.forEach(formula => findNodeIdsInObject(formula.tokens, dependencyNodeIds));
        node.TreeBranchLeafNodeCondition.forEach(condition => findNodeIdsInObject(condition.conditionSet, dependencyNodeIds));

        if (dependencyNodeIds.size > 0) {
            analysisReport.push(`  - Dépendances trouvées dans ses capacités :`);
            for (const depId of dependencyNodeIds) {
                const depNode = nodesMap.get(depId);
                if (depNode) {
                    analysisReport.push(`    -> CHAMP: "${depNode.label}" (ID: ${depId})`);
                    
                    // Règle 2: Pour chaque dépendance, on ajoute sa variable.
                    if (depNode.TreeBranchLeafNodeVariable) {
                        collectedDeps.linkedVariableIds.add(depNode.TreeBranchLeafNodeVariable.id);
                        analysisReport.push(`       - Ajout de sa Variable (ID: ${depNode.TreeBranchLeafNodeVariable.id})`);
                    } else {
                        analysisReport.push(`       - ⚠️ Ce champ n'a pas de variable directement associée.`);
                    }
                }
            }
        }

        const updatePayload = {
            linkedVariableIds: [...collectedDeps.linkedVariableIds],
            linkedFormulaIds: [...collectedDeps.linkedFormulaIds],
            linkedConditionIds: [...collectedDeps.linkedConditionIds],
            linkedTableIds: [...collectedDeps.linkedTableIds],
        };
        
        const hasChanged = JSON.stringify(updatePayload.linkedVariableIds.sort()) !== JSON.stringify(node.linkedVariableIds.sort()) ||
                           JSON.stringify(updatePayload.linkedFormulaIds.sort()) !== JSON.stringify(node.linkedFormulaIds.sort()) ||
                           JSON.stringify(updatePayload.linkedConditionIds.sort()) !== JSON.stringify(node.linkedConditionIds.sort()) ||
                           JSON.stringify(updatePayload.linkedTableIds.sort()) !== JSON.stringify(node.linkedTableIds.sort());

        if (hasChanged) {
            updatesToPerform.push({ id: node.id, data: updatePayload });
            
            console.log(`\n🔎 Node à mettre à jour: "${node.label}" (ID: ${node.id})`);
            if (analysisReport.length > 0) console.log(analysisReport.join('\n'));
            console.log('   => IDs à insérer :');
            console.log(`      - linkedVariableIds: [${updatePayload.linkedVariableIds.join(', ')}]`);
            console.log(`      - linkedFormulaIds: [${updatePayload.linkedFormulaIds.join(', ')}]`);
            console.log(`      - linkedConditionIds: [${updatePayload.linkedConditionIds.join(', ')}]`);
            console.log(`      - linkedTableIds: [${updatePayload.linkedTableIds.join(', ')}]`);
        }
    }

    console.log('--------------------------------------------------');
    console.log(`\n🎉 Analyse "Dry Run" terminée. ${updatesToPerform.length} nœud(s) seraient mis à jour.`);

    if (!DRY_RUN && updatesToPerform.length > 0) {
        console.log('\n\nExécution des mises à jour...');
        for (const update of updatesToPerform) {
            await prisma.treeBranchLeafNode.update({
                where: { id: update.id },
                data: update.data,
            });
        }
        console.log(`✅ ${updatesToPerform.length} nœud(s) ont été mis à jour avec succès.`);
    } else if (!DRY_RUN) {
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
