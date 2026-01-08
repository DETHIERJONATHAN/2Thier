import { db } from '../src/lib/database';

async function cleanup() {
  const deletedNodes = await db.treeBranchLeafNode.deleteMany({
    where: { id: { endsWith: '-1' } }
  });
  console.log('Nodes -1 supprimés:', deletedNodes.count);

  const deletedTables = await db.treeBranchLeafNodeTable.deleteMany({
    where: { id: { endsWith: '-1' } }
  });
  console.log('Tables -1 supprimées:', deletedTables.count);

  const deletedSelectConfigs = await db.treeBranchLeafSelectConfig.deleteMany({
    where: { id: { endsWith: '-1' } }
  });
  console.log('SelectConfigs -1 supprimées:', deletedSelectConfigs.count);

  const deletedFormulas = await db.treeBranchLeafNodeFormula.deleteMany({
    where: { id: { endsWith: '-1' } }
  });
  console.log('Formulas -1 supprimées:', deletedFormulas.count);

  const deletedVars = await db.treeBranchLeafNodeVariable.deleteMany({
    where: { id: { endsWith: '-1' } }
  });
  console.log('Variables -1 supprimées:', deletedVars.count);
  
  process.exit(0);
}
cleanup();
