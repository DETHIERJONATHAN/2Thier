const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Lancement du diagnostic des variables ---');

    try {
        const totalVariables = await prisma.treeBranchLeafNodeVariable.count();
        console.log(`1. Nombre total de variables trouvées : ${totalVariables}`);

        if (totalVariables === 0) {
            console.log("❌ Le problème est confirmé : aucune variable n'est trouvée dans la table 'TreeBranchLeafNodeVariable'. Le script ne peut pas fonctionner.");
            return;
        }

        const variablesWithNodeId = await prisma.treeBranchLeafNodeVariable.count({
            where: {
                nodeId: {
                    not: null
                }
            }
        });
        console.log(`2. Variables avec un 'nodeId' non nul : ${variablesWithNodeId}`);

        if (variablesWithNodeId === 0) {
            console.log("❌ Problème critique : Aucune variable n'est liée à un nœud via le champ 'nodeId'.");
        } else {
            console.log("✅ Le lien 'nodeId' semble exister sur certaines variables.");
        }

        const firstFive = await prisma.treeBranchLeafNodeVariable.findMany({
            take: 5,
            select: {
                id: true,
                nodeId: true,
                exposedKey: true
            }
        });

        console.log("\n3. Échantillon de 5 variables :");
        if (firstFive.length > 0) {
            console.table(firstFive);
        } else {
            console.log("   Aucun échantillon à afficher.");
        }

    } catch (e) {
        console.error("\nUne erreur est survenue durant le diagnostic :", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
