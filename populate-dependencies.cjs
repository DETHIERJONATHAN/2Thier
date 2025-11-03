const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --- CONFIGURATION ---
// Mettre à false pour exécuter les mises à jour en base de données.
const DRY_RUN = true; 
// -------------------

// --- FONCTIONS D'ANALYSE (AMÉLIORÉES) ---

const ID_REGEX = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i;
const SHARED_REF_REGEX = /shared-ref-[\w-]+/;

function extractIdFromRef(ref) {
    if (typeof ref !== 'string') return null;
    const match = ref.match(ID_REGEX);
    if (match) return match[0];
    // On ne gère pas les shared-ref pour l'instant car ils ne correspondent pas à des IDs de noeuds directs
    return null;
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

        // --- ANALYSE DES CAPACITÉS DU NŒUD LUI-MÊME ---
        if (node.TreeBranchLeafNodeFormula.length > 0) node.TreeBranchLeafNodeFormula.forEach(f => collectedDeps.linkedFormulaIds.add(f.id));
        if (node.TreeBranchLeafNodeCondition.length > 0) node.TreeBranchLeafNodeCondition.forEach(c => collectedDeps.linkedConditionIds.add(c.id));
        if (node.TreeBranchLeafNodeTable.length > 0) node.TreeBranchLeafNodeTable.forEach(t => collectedDeps.linkedTableIds.add(t.id));
        if (node.TreeBranchLeafNodeVariable) collectedDeps.linkedVariableIds.add(node.TreeBranchLeafNodeVariable.id);

        // --- ANALYSE DES DÉPENDANCES DANS LES CAPACITÉS ---
        const dependencyIds = new Set();

        // Formules
        node.TreeBranchLeafNodeFormula.forEach(formula => {
            findNodeIdsInObject(formula.tokens, dependencyIds);
        });

        // Conditions
        node.TreeBranchLeafNodeCondition.forEach(condition => {
            findNodeIdsInObject(condition.conditionSet, dependencyIds);
        });

        if (dependencyIds.size > 0) {
            analysisReport.push(`  - Dépendances trouvées dans ses capacités :`);
            for (const depId of dependencyIds) {
                const depNode = nodesMap.get(depId);
                if (depNode) {
                    // Ajoute la variable de la dépendance, si elle existe
                    if (depNode.TreeBranchLeafNodeVariable) {
                        collectedDeps.linkedVariableIds.add(depNode.TreeBranchLeafNodeVariable.id);
                        analysisReport.push(`    -> CHAMP: "${depNode.label}" (ID: ${depId})`);
                        analysisReport.push(`       - Contient la Variable (ID: ${depNode.TreeBranchLeafNodeVariable.id})`);
                    }
                    // Ajoute les capacités de la dépendance
                    if (depNode.TreeBranchLeafNodeFormula.length > 0) {
                         depNode.TreeBranchLeafNodeFormula.forEach(f => collectedDeps.linkedFormulaIds.add(f.id));
                         analysisReport.push(`       - Contient une Formule (ID: ${depNode.TreeBranchLeafNodeFormula[0].id})`);
                    }
                    if (depNode.TreeBranchLeafNodeCondition.length > 0) {
                        depNode.TreeBranchLeafNodeCondition.forEach(c => collectedDeps.linkedConditionIds.add(c.id));
                        analysisReport.push(`       - Contient une Condition (ID: ${depNode.TreeBranchLeafNodeCondition[0].id})`);
                    }
                }
            }
        }

        // --- PRÉPARATION DE LA MISE À JOUR ---
        const updatePayload = {
            linkedVariableIds: [...collectedDeps.linkedVariableIds],
            linkedFormulaIds: [...collectedDeps.linkedFormulaIds],
            linkedConditionIds: [...collectedDeps.linkedConditionIds],
            linkedTableIds: [...collectedDeps.linkedTableIds],
        };
        
        // Vérifier s'il y a un changement réel
        const hasChanged = JSON.stringify(updatePayload.linkedVariableIds.sort()) !== JSON.stringify(node.linkedVariableIds.sort()) ||
                           JSON.stringify(updatePayload.linkedFormulaIds.sort()) !== JSON.stringify(node.linkedFormulaIds.sort()) ||
                           JSON.stringify(updatePayload.linkedConditionIds.sort()) !== JSON.stringify(node.linkedConditionIds.sort()) ||
                           JSON.stringify(updatePayload.linkedTableIds.sort()) !== JSON.stringify(node.linkedTableIds.sort());

        if (hasChanged) {
            updatesToPerform.push({ id: node.id, data: updatePayload });
            
            console.log(`\n🔎 Node à mettre à jour: "${node.label}" (ID: ${node.id})`);
            if (node.TreeBranchLeafNodeVariable) {
                console.log(`   - Ce nœud est la Variable (ID: ${node.TreeBranchLeafNodeVariable.id})`);
            }
            if(analysisReport.length > 0) console.log(analysisReport.join('\n'));
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
