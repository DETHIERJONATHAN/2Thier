import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 TRACING REPEATER DUPLICATION PLAN FOR ORIENTATION-INCLINAISON\n");

  // Repeater ID for 'toit'
  const repeaterId = "c4c40496-6611-47e3-a85c-4220ccd6d96b";

  // Get repeater info
  const repeater = await prisma.treeBranchLeafNode.findUnique({
    where: { id: repeaterId },
  });

  console.log("📊 REPEATER INFO:");
  console.log(`  ID: ${repeater?.id}`);
  console.log(`  Label: ${repeater?.label}`);
  console.log(`  Type: ${repeater?.fieldType}`);

  // Get template node IDs from JSON
  const templateNodeIds = repeater?.repeater_templateNodeIds
    ? (JSON.parse(repeater.repeater_templateNodeIds) as string[])
    : [];

  console.log(`  Template Nodes Count: ${templateNodeIds.length}`);
  console.log(`  Template Node IDs: ${templateNodeIds.join(", ")}`);

  // Get all template nodes
  const templateNodes = await prisma.treeBranchLeafNode.findMany({
    where: { id: { in: templateNodeIds } },
    select: {
      id: true,
      label: true,
      linkedVariableIds: true,
    },
  });

  // Find Orientation-Inclinaison node
  const orientationNode = templateNodes.find(
    (n) => n.label === "Orientation-Inclinaison"
  );

  console.log("\n📍 ORIENTATION-INCLINAISON NODE:");
  if (orientationNode) {
    console.log(`  ID: ${orientationNode.id}`);
    console.log(`  Label: ${orientationNode.label}`);
    console.log(`  LinkedVariableIds: ${JSON.stringify(orientationNode.linkedVariableIds)}`);

    // Get the linked variables
    if (
      orientationNode.linkedVariableIds &&
      orientationNode.linkedVariableIds.length > 0
    ) {
      console.log("\n🔗 LINKED VARIABLES:");
      for (const varId of orientationNode.linkedVariableIds) {
        const linkedVar = await prisma.treeBranchLeafNodeVariable.findUnique({
          where: { id: varId },
          select: {
            id: true,
            displayName: true,
            nodeId: true,
            sourceType: true,
          },
        });
        console.log(`  Variable ID: ${varId}`);
        console.log(`    DisplayName: ${linkedVar?.displayName}`);
        console.log(`    NodeId: ${linkedVar?.nodeId}`);
        console.log(
          `    SourceType: ${linkedVar?.sourceType}`
        );

        // Check if this variable would be SKIPPED
        const willSkip = linkedVar?.displayName?.includes("Lookup Table");
        console.log(`    📌 WILL BE SKIPPED: ${willSkip} (displayName includes 'Lookup Table')`);
      }
    }
  } else {
    console.log(
      "  ❌ NOT FOUND in template nodes"
    );
  }

  // Now list all template nodes and which variables they have
  console.log("\n📋 ALL TEMPLATE NODES AND THEIR VARIABLES:");
  for (const node of templateNodes) {
    console.log(`\n  📍 NODE: ${node.label} (${node.id})`);
    console.log(`     LinkedVariableIds: ${node.linkedVariableIds?.length || 0}`);
    if (node.linkedVariableIds && node.linkedVariableIds.length > 0) {
      for (const varId of node.linkedVariableIds) {
        const linkedVar = await prisma.treeBranchLeafNodeVariable.findUnique({
          where: { id: varId },
          select: {
            id: true,
            displayName: true,
          },
        });
        const willSkip = linkedVar?.displayName?.includes("Lookup Table");
        console.log(
          `       - ${linkedVar?.displayName} [${willSkip ? "❌ SKIP" : "✅ PROCESS"}]`
        );
      }
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
