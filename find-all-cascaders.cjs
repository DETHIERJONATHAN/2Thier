const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function findAllCascaders() {
  console.log("🔍 Recherche de tous les cascaders...\n");

  try {
    // Chercher tous les nœuds qui ont le type cascader
    const cascaders = await prisma.treeBranchLeafNode.findMany({
      where: {
        type: {
          contains: "cascade",
        },
      },
      select: {
        id: true,
        label: true,
        type: true,
        subType: true,
        parentId: true,
        fieldType: true,
      },
      take: 20,
    });

    console.log(`📌 Cascaders trouvés (type contient 'cascade'): ${cascaders.length}\n`);
    cascaders.forEach((c) => {
      console.log(`   - ${c.label} (${c.type}${c.subType ? `/${c.subType}` : ""})`);
      console.log(`     ID: ${c.id}`);
      console.log(`     Parent: ${c.parentId || "ROOT"}`);
    });

    // Aussi chercher par type exact
    const cascadersExact = await prisma.treeBranchLeafNode.findMany({
      where: {
        type: "cascader",
      },
      select: {
        id: true,
        label: true,
        type: true,
        subType: true,
        parentId: true,
        fieldType: true,
      },
      take: 20,
    });

    console.log(`\n📌 Cascaders trouvés (type EXACT 'cascader'): ${cascadersExact.length}\n`);
    cascadersExact.forEach((c) => {
      console.log(`   - ${c.label} (${c.type}${c.subType ? `/${c.subType}` : ""})`);
      console.log(`     ID: ${c.id}`);
      console.log(`     Parent: ${c.parentId || "ROOT"}`);
    });

    // Chercher les nœuds avec sharedReferenceIds non-vide
    const nodesWithRefs = await prisma.treeBranchLeafNode.findMany({
      where: {
        sharedReferenceIds: {
          hasSome: [""],
        },
      },
      select: {
        id: true,
        label: true,
        type: true,
        sharedReferenceIds: true,
        parentId: true,
      },
      take: 10,
    });

    console.log(
      `\n📌 Nœuds avec sharedReferenceIds non-vide: ${nodesWithRefs.length}\n`
    );
    nodesWithRefs.forEach((node) => {
      console.log(`   - ${node.label} (${node.type})`);
      console.log(`     ID: ${node.id}`);
      console.log(`     Refs: ${JSON.stringify(node.sharedReferenceIds)}`);
    });

    // Chercher les nœuds Versant et ses enfants
    const versantAll = await prisma.treeBranchLeafNode.findMany({
      where: {
        label: {
          contains: "Versant",
        },
      },
      select: {
        id: true,
        label: true,
        type: true,
        parentId: true,
        sharedReferenceIds: true,
        other_TreeBranchLeafNode: {
          select: {
            id: true,
            label: true,
            type: true,
            sharedReferenceIds: true,
          },
        },
      },
    });

    console.log(`\n📌 Tous les nœuds contenant 'Versant': ${versantAll.length}\n`);
    versantAll.forEach((node) => {
      console.log(`   - ${node.label} (${node.type})`);
      console.log(`     ID: ${node.id}`);
      console.log(`     Parent: ${node.parentId || "ROOT"}`);
      console.log(`     Refs: ${JSON.stringify(node.sharedReferenceIds)}`);
      if (node.other_TreeBranchLeafNode.length > 0) {
        console.log(`     Enfants: ${node.other_TreeBranchLeafNode.length}`);
        node.other_TreeBranchLeafNode.forEach((child) => {
          console.log(`       • ${child.label} (${child.type})`);
          console.log(`         Refs: ${JSON.stringify(child.sharedReferenceIds)}`);
        });
      }
    });
  } catch (error) {
    console.error("❌ Erreur:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findAllCascaders();
