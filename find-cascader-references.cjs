const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function findVersantCascaderReferences() {
  console.log("🔍 Recherche du cascader 'Versant'...\n");

  try {
    // 1. Trouver le nœud Versant (cascader parent) - chercher par label uniquement d'abord
    const versantNode = await prisma.treeBranchLeafNode.findFirst({
      where: {
        label: "Versant",
      },
      include: {
        other_TreeBranchLeafNode: true, // enfants
      },
    });

    if (!versantNode) {
      console.log("❌ Cascader 'Versant' introuvable.");
      return;
    }

    console.log("✅ Cascader trouvé:");
    console.log(`   ID: ${versantNode.id}`);
    console.log(`   Label: ${versantNode.label}`);
    console.log(`   Type: ${versantNode.type}`);
    console.log(`   Enfants: ${versantNode.other_TreeBranchLeafNode.length}\n`);

    // 2. Chercher toutes les options du cascader (parentId = versantNode.id)
    const options = await prisma.treeBranchLeafNode.findMany({
      where: {
        parentId: versantNode.id,
      },
      select: {
        id: true,
        label: true,
        value: true,
        sharedReferenceId: true,
        sharedReferenceIds: true,
        parentId: true,
      },
    });

    console.log(`📌 Options trouvées: ${options.length}`);
    console.log("─".repeat(80) + "\n");

    // 3. Pour chaque option, chercher les références partagées
    for (const option of options) {
      console.log(`🎯 Option: "${option.label}" (${option.value})`);
      console.log(`   ID: ${option.id}`);
      console.log(`   Single Ref ID: ${option.sharedReferenceId || "AUCUN"}`);
      console.log(`   Array Refs: ${JSON.stringify(option.sharedReferenceIds)}`);

      // Combiner les deux sources de références
      const refIds = new Set();
      if (option.sharedReferenceId) {
        refIds.add(option.sharedReferenceId);
      }
      if (option.sharedReferenceIds && Array.isArray(option.sharedReferenceIds)) {
        option.sharedReferenceIds.forEach((id) => refIds.add(id));
      }

      if (refIds.size === 0) {
        console.log("   ⚠️  Aucune référence partagée");
      } else {
        console.log(`   📦 ${refIds.size} référence(s) partagée(s):`);

        // 4. Chercher chaque référence dans TreeBranchLeafNode
        for (const refId of refIds) {
          const referencedNode = await prisma.treeBranchLeafNode.findUnique({
            where: { id: refId },
            select: {
              id: true,
              label: true,
              type: true,
              subType: true,
              description: true,
              isSharedReference: true,
              sharedReferenceName: true,
              sharedReferenceCategory: true,
              hasCondition: true,
              hasData: true,
              hasFormula: true,
              hasTable: true,
              hasAPI: true,
              hasLink: true,
              fieldType: true,
              fieldConfig: true,
              conditionConfig: true,
              formulaConfig: true,
              tableConfig: true,
              apiConfig: true,
              linkConfig: true,
              other_TreeBranchLeafNode: true, // enfants possibles
            },
          });

          if (referencedNode) {
            console.log(`\n      ✨ Référence ID: ${refId}`);
            console.log(`         Label: ${referencedNode.label}`);
            console.log(`         Type: ${referencedNode.type}${referencedNode.subType ? `/${referencedNode.subType}` : ""}`);
            console.log(`         Field Type: ${referencedNode.fieldType || "N/A"}`);
            console.log(`         Shared Ref Name: ${referencedNode.sharedReferenceName || "N/A"}`);
            console.log(`         Shared Ref Category: ${referencedNode.sharedReferenceCategory || "N/A"}`);

            // Afficher les flags
            console.log(`         Flags:`);
            console.log(`           - hasCondition: ${referencedNode.hasCondition}`);
            console.log(`           - hasData: ${referencedNode.hasData}`);
            console.log(`           - hasFormula: ${referencedNode.hasFormula}`);
            console.log(`           - hasTable: ${referencedNode.hasTable}`);
            console.log(`           - hasAPI: ${referencedNode.hasAPI}`);
            console.log(`           - hasLink: ${referencedNode.hasLink}`);

            // Si c'est un shared reference, afficher les détails
            if (referencedNode.isSharedReference) {
              console.log(`         ⭐ C'EST UNE RÉFÉRENCE PARTAGÉE`);
            }

            // Afficher les enfants s'il y en a
            if (referencedNode.other_TreeBranchLeafNode.length > 0) {
              console.log(
                `         👶 ${referencedNode.other_TreeBranchLeafNode.length} enfant(s) trouvé(s):`
              );
              for (const child of referencedNode.other_TreeBranchLeafNode) {
                console.log(`            - ${child.label} (type: ${child.type})`);
              }
            }

            // Afficher les configs si non-null
            if (referencedNode.conditionConfig) {
              console.log(`         Condition Config: ${JSON.stringify(referencedNode.conditionConfig)}`);
            }
            if (referencedNode.formulaConfig) {
              console.log(`         Formula Config: ${JSON.stringify(referencedNode.formulaConfig)}`);
            }
          } else {
            console.log(`      ❌ Référence ${refId} introuvable!`);
          }
        }
      }

      console.log("\n" + "─".repeat(80) + "\n");
    }
  } catch (error) {
    console.error("❌ Erreur:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findVersantCascaderReferences();
