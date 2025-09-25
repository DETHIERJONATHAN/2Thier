const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function compareConditionStructures() {
  console.log("🔬 COMPARAISON: Structures des conditions");
  console.log("=".repeat(60));

  try {
    // Condition qui fonctionne
    const workingConditionId = "ff05cc48-27ec-4d94-8975-30a0f9c1c275";
    const workingCondition = await prisma.treeBranchLeafNodeCondition.findUnique({
      where: { id: workingConditionId }
    });

    // Notre condition problématique
    const problemConditionId = "15314ca9-6246-4e25-b1a8-18b33c208f9a";
    const problemCondition = await prisma.treeBranchLeafNodeCondition.findUnique({
      where: { id: problemConditionId }
    });

    console.log("\n📊 CONDITION QUI FONCTIONNE:");
    console.log("=".repeat(40));
    console.log(JSON.stringify(workingCondition.conditionSet, null, 2));

    console.log("\n🔧 NOTRE CONDITION:");
    console.log("=".repeat(40));
    console.log(JSON.stringify(problemCondition.conditionSet, null, 2));

    // Comparaison des variables
    console.log("\n🔗 VARIABLES ASSOCIÉES:");
    console.log("=".repeat(40));
    
    const workingVariable = await prisma.treeBranchLeafNodeVariable.findFirst({
      where: { sourceRef: `condition:${workingConditionId}` },
      include: { TreeBranchLeafNode: true }
    });

    const problemVariable = await prisma.treeBranchLeafNodeVariable.findFirst({
      where: { sourceRef: `condition:${problemConditionId}` },
      include: { TreeBranchLeafNode: true }
    });

    console.log("✅ Variable qui fonctionne:", {
      id: workingVariable?.id,
      exposedKey: workingVariable?.exposedKey,
      sourceType: workingVariable?.sourceType,
      nodeTitle: workingVariable?.TreeBranchLeafNode?.label,
      nodeTblType: workingVariable?.TreeBranchLeafNode?.tbl_type,
      nodeTblCapacity: workingVariable?.TreeBranchLeafNode?.tbl_capacity
    });

    console.log("🔧 Notre variable:", {
      id: problemVariable?.id,
      exposedKey: problemVariable?.exposedKey,
      sourceType: problemVariable?.sourceType,
      nodeTitle: problemVariable?.TreeBranchLeafNode?.label,
      nodeTblType: problemVariable?.TreeBranchLeafNode?.tbl_type,
      nodeTblCapacity: problemVariable?.TreeBranchLeafNode?.tbl_capacity
    });

    // Analyse des différences clés
    console.log("\n🔍 ANALYSE DES DIFFÉRENCES:");
    console.log("=".repeat(40));

    // 1. Structure des branches
    const workingBranches = workingCondition.conditionSet?.branches || [];
    const problemBranches = problemCondition.conditionSet?.branches || [];
    
    console.log(`📋 Branches - Working: ${workingBranches.length}, Problem: ${problemBranches.length}`);
    
    if (workingBranches.length > 0) {
      console.log("✅ Branch qui fonctionne:", workingBranches[0]);
    }
    if (problemBranches.length > 0) {
      console.log("🔧 Notre branch:", problemBranches[0]);
    }

    // 2. Structure des fallbacks
    const workingFallback = workingCondition.conditionSet?.fallback;
    const problemFallback = problemCondition.conditionSet?.fallback;

    console.log("\n📋 Fallbacks:");
    console.log("✅ Fallback qui fonctionne:", workingFallback);
    console.log("🔧 Notre fallback:", problemFallback);

    // 3. Vérifier les formules référencées
    if (workingFallback?.actions?.[0]?.nodeIds?.[0]) {
      const workingFormulaRef = workingFallback.actions[0].nodeIds[0];
      console.log(`\n🧮 Formule qui fonctionne: ${workingFormulaRef}`);
      
      if (workingFormulaRef.startsWith('node-formula:')) {
        const formulaId = workingFormulaRef.replace('node-formula:', '');
        const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
          where: { id: formulaId }
        });
        console.log("  Tokens:", formula?.tokens);
      }
    }

    if (problemFallback?.actions?.[0]?.nodeIds?.[0]) {
      const problemFormulaRef = problemFallback.actions[0].nodeIds[0];
      console.log(`\n🔧 Notre formule: ${problemFormulaRef}`);
      
      if (problemFormulaRef.startsWith('node-formula:')) {
        const formulaId = problemFormulaRef.replace('node-formula:', '');
        const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
          where: { id: formulaId }
        });
        console.log("  Tokens:", formula?.tokens);
      }
    }

  } catch (error) {
    console.error("❌ Erreur:", error);
  } finally {
    await prisma.$disconnect();
  }
}

compareConditionStructures();