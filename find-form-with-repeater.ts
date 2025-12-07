import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 FINDING FORMS THAT CONTAIN THE REPEATER\n");

  // Get the repeater
  const repeater = await prisma.treeBranchLeafNode.findUnique({
    where: { id: "c4c40496-6611-47e3-a85c-4220ccd6d96b" },
  });

  console.log(`📊 REPEATER: ${repeater?.label} (${repeater?.id})`);
  console.log(`   TreeId: ${repeater?.treeId}`);

  // Get the tree
  const tree = await prisma.treeBranchLeafTree.findUnique({
    where: { id: repeater?.treeId || "" },
    select: {
      id: true,
      name: true,
    },
  });

  console.log(`\n📋 TREE: ${tree?.name} (${tree?.id}`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
