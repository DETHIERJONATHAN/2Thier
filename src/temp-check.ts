import { db } from "./lib/database";

async function main() {
  const originalTable = await db.treeBranchLeafCapacityTable.findUnique({
    where: { id: "e5c2aed8-00ea-4e72-8ace-22b942199a68" },
    include: { rows: true }
  });
  
  console.log("=== TABLE ORIGINALE ===");
  console.log("ID:", originalTable?.id);
  console.log("NodeId:", originalTable?.nodeId);
  console.log("Nombre de rows:", originalTable?.rows?.length);
  
  const copiedTable = await db.treeBranchLeafCapacityTable.findUnique({
    where: { id: "e5c2aed8-00ea-4e72-8ace-22b942199a68-1" },
    include: { rows: true }
  });
  
  console.log("\n=== TABLE COPIÉE (-1) ===");
  console.log("Existe:", !!copiedTable);
  if (copiedTable) {
    console.log("ID:", copiedTable.id);
    console.log("NodeId:", copiedTable.nodeId);
    console.log("Nombre de rows:", copiedTable.rows?.length);
  }
  
  const origConfig = await db.treeBranchLeafSelectConfig.findUnique({
    where: { nodeId: "c071a466-5a0f-4b4e-afb0-fd69ac79d51a" }
  });
  console.log("\n=== SELECT CONFIG ORIGINALE ===");
  console.log(JSON.stringify(origConfig, null, 2));
  
  const copiedConfig = await db.treeBranchLeafSelectConfig.findUnique({
    where: { nodeId: "c071a466-5a0f-4b4e-afb0-fd69ac79d51a-1" }
  });
  console.log("\n=== SELECT CONFIG COPIÉE ===");
  console.log(JSON.stringify(copiedConfig, null, 2));
}

main();
