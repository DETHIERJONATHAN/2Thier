import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function diagnose() {
  const nodeId = '6844ea47-db3d-4479-9e4e-ad207f7924e4-1'; // Longueur-1
  const formulaActiveId = '53e5cc3f-36ef-49f1-8cd2-bfab3c522c19-1';
  
  // Vérifier si cette formule existe et quel est son nodeId (propriétaire)
  const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
    where: { id: formulaActiveId },
    select: { id: true, name: true, nodeId: true, tokens: true }
  });
  
  console.log('=== Formule référencée par formula_activeId ===');
  if (formula) {
    console.log(`ID: ${formula.id}`);
    console.log(`Name: ${formula.name}`);
    console.log(`NodeId (propriétaire): ${formula.nodeId}`);
    console.log(`Est-ce Longueur-1 le propriétaire ? ${formula.nodeId === nodeId ? '✅ OUI' : '❌ NON'}`);
    
    // Les tokens contiennent-ils une référence à Longueur-1 ?
    const tokensStr = JSON.stringify(formula.tokens);
    if (tokensStr.includes(nodeId)) {
      console.log(`\n⚠️ Longueur-1 est RÉFÉRENCÉ dans les tokens de cette formule!`);
    }
  } else {
    console.log('❌ Formule non trouvée!');
  }
  
  // Compter combien de formules ont Longueur-1 comme propriétaire
  const formulasOwnedByNode = await prisma.treeBranchLeafNodeFormula.count({
    where: { nodeId }
  });
  console.log(`\n=== Formules dont Longueur-1 est le propriétaire: ${formulasOwnedByNode} ===`);
  
  // Lister ces formules
  const ownedFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
    where: { nodeId },
    select: { id: true, name: true }
  });
  for (const f of ownedFormulas) {
    console.log(`  - ${f.id}: "${f.name}"`);
  }
}

diagnose()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
