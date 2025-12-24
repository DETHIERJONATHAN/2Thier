import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function diagnose() {
  // Formule originale (sans suffixe)
  const originalFormulaId = '53e5cc3f-36ef-49f1-8cd2-bfab3c522c19';
  
  const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
    where: { id: originalFormulaId },
    select: { id: true, name: true, nodeId: true }
  });
  
  console.log('=== FORMULE ORIGINALE ===');
  if (formula) {
    console.log(`ID: ${formula.id}`);
    console.log(`Name: ${formula.name}`);
    console.log(`NodeId (propriétaire ORIGINAL): ${formula.nodeId}`);
    
    // Vérifier ce nœud original
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: formula.nodeId },
      select: { id: true, label: true, hasFormula: true, formula_activeId: true }
    });
    
    if (node) {
      console.log(`\n=== Nœud propriétaire ORIGINAL ===`);
      console.log(`ID: ${node.id}`);
      console.log(`Label: ${node.label}`);
      console.log(`hasFormula: ${node.hasFormula}`);
      console.log(`formula_activeId: ${node.formula_activeId}`);
    }
  } else {
    console.log('❌ Formule originale non trouvée');
  }
  
  // Vérifier le nœud source "Longueur" (sans -1)
  const sourceNodeId = '6844ea47-db3d-4479-9e4e-ad207f7924e4';
  const sourceNode = await prisma.treeBranchLeafNode.findUnique({
    where: { id: sourceNodeId },
    select: { id: true, label: true, hasFormula: true, formula_activeId: true }
  });
  
  console.log(`\n=== Nœud source "Longueur" ===`);
  if (sourceNode) {
    console.log(`ID: ${sourceNode.id}`);
    console.log(`Label: ${sourceNode.label}`);
    console.log(`hasFormula: ${sourceNode.hasFormula}`);
    console.log(`formula_activeId: ${sourceNode.formula_activeId}`);
  }
}

diagnose()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
