const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addConditionToMirrorSystem() {
  console.log("🪞 AJOUT: Condition au système de miroirs");
  console.log("=".repeat(50));

  try {
    const conditionId = "15314ca9-6246-4e25-b1a8-18b33c208f9a";
    const nodeId = "688046c2-c2ee-4617-b4d3-c66eca40fa9d";

    // 1. Vérifier que la condition existe
    const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
      where: { id: conditionId }
    });

    if (!condition) {
      console.log("❌ Condition non trouvée!");
      return;
    }

    console.log("✅ Condition trouvée:", conditionId);

    // 2. Vérifier le node
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId }
    });

    console.log("✅ Node trouvé:", node.label);

    // 3. Le problème: Le système de mirror automatique ne reconnaît pas notre condition
    // car elle n'est pas liée correctement au node dans le système TBL
    
    console.log("\n🔍 DIAGNOSTIC:");
    console.log("=".repeat(30));
    console.log("❌ Le système de mirror automatique crée des mirrors pour:");
    console.log("   - Les données (__mirror_data_*)");
    console.log("   - Les formules (__mirror_formula_*)"); 
    console.log("   - Les conditions (__mirror_condition_*)");
    console.log("");
    console.log("❌ Mais il ne crée PAS de mirror pour notre condition");
    console.log(`   car elle n'est pas associée au node ${nodeId} dans le système`);

    // 4. Solution: Créer l'entrée mirror manuellement
    console.log("\n🔧 SOLUTION: Créer le mirror condition manuellement");
    console.log("=".repeat(50));

    // Nous devons simuler ce que fait le système automatique
    const mirrorKeys = [
      // Le mirror principal avec l'ID exact de la condition
      `__mirror_condition_${conditionId}`,
      // Le mirror avec le label du node
      `__mirror_condition_${node.label}`,
      // L'ID exact que le système cherche
      conditionId,
      // L'exposedKey
      `15314ca9-6246-4e25-b1a8-18b33c208f9a`
    ];

    console.log("🎯 Clés de mirror à créer dans FormData:");
    mirrorKeys.forEach(key => {
      console.log(`   FormData["${key}"] = true`);
    });

    // 5. Identifier pourquoi le système ne crée pas le mirror automatiquement
    console.log("\n🔍 POURQUOI LE MIRROR N'EST PAS CRÉÉ:");
    console.log("=".repeat(40));
    console.log("Dans les logs, on voit:");
    console.log("  🔀 [MIRROR][CONDITION_CREATE] {..., conditionId: '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e', ...}");
    console.log("Mais AUCUNE ligne pour notre condition 15314ca9-6246-4e25-b1a8-18b33c208f9a");
    console.log("");
    console.log("Cela signifie que le système ne voit pas notre condition comme");
    console.log("étant liée à un node dans le système TBL principal.");

    // 6. Solution alternative: Modifier la structure pour que le mirror soit créé
    console.log("\n💡 SOLUTION ALTERNATIVE:");
    console.log("=".repeat(30));
    console.log("Au lieu de forcer FormData, modifier la structure pour que");
    console.log("le système crée automatiquement le mirror condition.");

    // Vérifier s'il y a une formule ou condition liée au node
    const nodeData = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      include: {
        TreeBranchLeafNodeFormula: true,
        TreeBranchLeafNodeCondition: true,
        TreeBranchLeafNodeVariable: true
      }
    });

    console.log("\n📊 ANALYSE DU NODE:");
    console.log("=".repeat(25));
    console.log(`Node: ${nodeData.label}`);
    console.log(`Formules liées: ${nodeData.TreeBranchLeafNodeFormula?.length || 0}`);
    console.log(`Conditions liées: ${nodeData.TreeBranchLeafNodeCondition?.length || 0}`);
    console.log(`Variables liées: ${nodeData.TreeBranchLeafNodeVariable?.length || 0}`);

    if (nodeData.TreeBranchLeafNodeCondition?.length === 0) {
      console.log("\n🎯 SOLUTION TROUVÉE:");
      console.log("=".repeat(20));
      console.log("Le node n'a pas de condition directement liée!");
      console.log("Il faut créer l'association condition -> node pour que");
      console.log("le système de mirror automatique fonctionne.");

      // Créer l'association si elle n'existe pas
      console.log("\n🔧 Création de l'association condition -> node...");
      
      // Option 1: Mettre la condition avec le même ID que le node
      // Option 2: Créer une vraie association dans la base
      
      console.log("ÉTAPE SUIVANTE: Associer la condition au node dans le système TBL");
    }

  } catch (error) {
    console.error("❌ Erreur:", error);
  } finally {
    await prisma.$disconnect();
  }
}

addConditionToMirrorSystem();