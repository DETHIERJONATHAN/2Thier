const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function searchForSharedRefPattern() {
  console.log("🔍 Recherche du pattern 'shared-ref-1760829001722-f8y0en'...\n");

  try {
    // Chercher dans les colonnes de texte qui pourraient contenir l'ID
    const nodesWithRefInLabel = await prisma.treeBranchLeafNode.findMany({
      where: {
        OR: [
          { label: { contains: "shared-ref-1760829001722-f8y0en" } },
          { description: { contains: "shared-ref-1760829001722-f8y0en" } },
          { value: { contains: "shared-ref-1760829001722-f8y0en" } },
          { sharedReferenceName: { contains: "shared-ref-1760829001722-f8y0en" } },
          { sharedReferenceId: "shared-ref-1760829001722-f8y0en" },
        ],
      },
      select: {
        id: true,
        label: true,
        description: true,
        type: true,
      },
    });

    console.log(
      `📌 Nœuds trouvés avec 'shared-ref-1760829001722-f8y0en': ${nodesWithRefInLabel.length}`
    );
    nodesWithRefInLabel.forEach((node) => {
      console.log(`   - ${node.label} (${node.type})`);
    });

    // Chercher les nœuds avec sharedReferenceName contenant "Rectangle"
    const rectangleRefs = await prisma.treeBranchLeafNode.findMany({
      where: {
        sharedReferenceName: {
          contains: "Rectangle",
        },
      },
      select: {
        id: true,
        label: true,
        sharedReferenceName: true,
        sharedReferenceCategory: true,
        isSharedReference: true,
        type: true,
      },
    });

    console.log(
      `\n📌 Nœuds avec sharedReferenceName contenant 'Rectangle': ${rectangleRefs.length}`
    );
    rectangleRefs.forEach((node) => {
      console.log(`   - ${node.label}`);
      console.log(`     isSharedReference: ${node.isSharedReference}`);
      console.log(`     sharedReferenceName: ${node.sharedReferenceName}`);
      console.log(`     sharedReferenceCategory: ${node.sharedReferenceCategory}`);
    });

    // Chercher TOUTES les références partagées
    const allSharedRefs = await prisma.treeBranchLeafNode.findMany({
      where: {
        isSharedReference: true,
      },
      select: {
        id: true,
        label: true,
        sharedReferenceName: true,
        sharedReferenceCategory: true,
        type: true,
        parentId: true,
      },
      take: 20,
    });

    console.log(
      `\n📌 Toutes les références partagées (isSharedReference=true): ${allSharedRefs.length}`
    );
    allSharedRefs.forEach((node) => {
      console.log(
        `   - ID: ${node.id} | Name: ${node.sharedReferenceName || "N/A"} | Cat: ${node.sharedReferenceCategory || "N/A"}`
      );
    });

    // Chercher les nœuds parents et enfants du Rectangle
    const rectangleOption = await prisma.treeBranchLeafNode.findUnique({
      where: {
        id: "4612e452-7e26-4933-baa3-aa4cabc05656", // Rectangle ID
      },
      include: {
        other_TreeBranchLeafNode: {
          // enfants potentiels
          select: {
            id: true,
            label: true,
            type: true,
          },
        },
        referenceUsages: {
          // nœuds qui utilisent cette référence
          select: {
            id: true,
            label: true,
            type: true,
          },
        },
      },
    });

    console.log("\n📌 Nœud Rectangle (option):");
    if (rectangleOption) {
      console.log(`   ID: ${rectangleOption.id}`);
      console.log(`   Label: ${rectangleOption.label}`);
      console.log(`   sharedReferenceIds: ${JSON.stringify(rectangleOption.sharedReferenceIds)}`);
      console.log(`   Enfants: ${rectangleOption.other_TreeBranchLeafNode.length}`);
      console.log(
        `   Utilisages (referenceUsages): ${rectangleOption.referenceUsages.length}`
      );
    }

    // Dernière tentative: chercher directement par ID
    console.log(
      "\n📌 Tentative de recherche directe de 'shared-ref-1760829001722-f8y0en'..."
    );
    const directFind = await prisma.treeBranchLeafNode.findUnique({
      where: {
        id: "shared-ref-1760829001722-f8y0en",
      },
    });

    if (directFind) {
      console.log(`   ✅ TROUVÉ! Label: ${directFind.label}`);
    } else {
      console.log(`   ❌ Non trouvé!`);
    }
  } catch (error) {
    console.error("❌ Erreur:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

searchForSharedRefPattern();
