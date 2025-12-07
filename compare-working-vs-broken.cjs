const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function compare() {
  console.log("\n" + "=".repeat(80));
  console.log("COMPARAISON: Champs qui marchent VS Orientation");
  console.log("=".repeat(80) + "\n");

  const fieldsToCheck = [
    { name: "Rampant toiture", status: "MARCHE" },
    { name: "Longueur toiture", status: "MARCHE" },
    { name: "Orientation", status: "NE MARCHE PAS" }
  ];

  for (const field of fieldsToCheck) {
    console.log("\n" + "-".repeat(60));
    console.log(field.status + " - " + field.name);
    console.log("-".repeat(60));

    const node = await p.treeBranchLeafNode.findFirst({
      where: { label: field.name },
      select: { id: true, label: true, parentId: true, type: true, hasData: true, linkedVariableIds: true }
    });

    if (!node) { console.log("  Noeud introuvable!"); continue; }

    console.log("  ID: " + node.id);
    console.log("  hasData: " + node.hasData);
    console.log("  linkedVariableIds: " + node.linkedVariableIds);

    const directVar = await p.treeBranchLeafNodeVariable.findFirst({ where: { nodeId: node.id } });
    if (directVar) {
      console.log("\n  VARIABLE DIRECTE (nodeId = " + node.id + "):");
      console.log("     ID: " + directVar.id);
      console.log("     displayName: " + directVar.displayName);
      console.log("     sourceRef: " + directVar.sourceRef);
    } else {
      console.log("\n  PAS DE VARIABLE DIRECTE");
    }

    if (node.linkedVariableIds) {
      let linkedIds;
      try { linkedIds = JSON.parse(node.linkedVariableIds); } catch { linkedIds = [node.linkedVariableIds]; }
      if (Array.isArray(linkedIds) && linkedIds.length > 0) {
        console.log("\n  VARIABLES DANS linkedVariableIds:");
        for (const varId of linkedIds) {
          const linkedVar = await p.treeBranchLeafNodeVariable.findUnique({ where: { id: varId } });
          if (linkedVar) {
            console.log("     - " + linkedVar.id);
            console.log("       nodeId: " + linkedVar.nodeId + (linkedVar.nodeId === node.id ? " (= ce noeud)" : " (AUTRE NOEUD!)"));
            if (linkedVar.nodeId && linkedVar.nodeId !== node.id) {
              const otherNode = await p.treeBranchLeafNode.findUnique({ where: { id: linkedVar.nodeId }, select: { label: true } });
              if (otherNode) console.log("       -> Pointe vers: " + otherNode.label);
            }
          }
        }
      }
    }

    const copy = await p.treeBranchLeafNode.findFirst({ where: { id: node.id + "-1" } });
    console.log("\n  COPIE -1: " + (copy ? "EXISTE (" + copy.label + ")" : "N EXISTE PAS"));
  }

  console.log("\n" + "=".repeat(60));
  console.log("CHAMP AFFICHAGE: Orientation - inclinaison");
  console.log("=".repeat(60));
  
  const displayNode = await p.treeBranchLeafNode.findFirst({ where: { label: "Orientation - inclinaison" } });
  if (displayNode) {
    console.log("  ID: " + displayNode.id);
    const displayVar = await p.treeBranchLeafNodeVariable.findFirst({ where: { nodeId: displayNode.id } });
    if (displayVar) console.log("  Variable: " + displayVar.id + " sourceRef=" + displayVar.sourceRef);
    const displayCopy = await p.treeBranchLeafNode.findFirst({ where: { id: displayNode.id + "-1" } });
    console.log("  Copie -1: " + (displayCopy ? "EXISTE" : "N EXISTE PAS"));
  }

  await p.$disconnect();
}

compare();
