import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function trace() {
  // Le nœud copié problématique
  const nodeId = '6844ea47-db3d-4479-9e4e-ad207f7924e4-1'; // Longueur-1
  
  const node = await prisma.treeBranchLeafNode.findUnique({
    where: { id: nodeId },
    select: {
      id: true,
      label: true,
      hasFormula: true,
      formula_activeId: true,
      linkedFormulaIds: true,
      createdAt: true,
      updatedAt: true
    }
  });
  
  if (!node) {
    console.log('Nœud non trouvé');
    return;
  }
  
  console.log('=== État actuel de Longueur-1 ===');
  console.log(JSON.stringify(node, null, 2));
  
  // Si formula_activeId existe, vérifier si cette formule existe vraiment
  if (node.formula_activeId) {
    const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
      where: { id: node.formula_activeId },
      select: {
        id: true,
        label: true,
        nodeId: true,
        expression: true
      }
    });
    
    console.log('\n=== Formule référencée ===');
    if (formula) {
      console.log(JSON.stringify(formula, null, 2));
      console.log(`\nCette formule appartient au nœud: ${formula.nodeId}`);
      
      // Vérifier si le nodeId de la formule correspond à Longueur-1
      if (formula.nodeId !== nodeId) {
        console.log('⚠️ PROBLÈME: la formule appartient à un AUTRE nœud!');
        console.log('   -> Le formula_activeId ne devrait PAS être défini sur Longueur-1');
      }
    } else {
      console.log('❌ La formule n\'existe pas!');
    }
  }
  
  // Vérifier les formules liées (linkedFormulaIds)
  if (node.linkedFormulaIds && node.linkedFormulaIds.length > 0) {
    console.log('\n=== Formules dans linkedFormulaIds ===');
    for (const fid of node.linkedFormulaIds) {
      const f = await prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: fid },
        select: { id: true, label: true, nodeId: true }
      });
      console.log(`  - ${fid}: ${f ? `"${f.label}" (node: ${f.nodeId})` : 'NON TROUVÉE'}`);
    }
    console.log('\nNOTE: linkedFormulaIds contient les formules qui UTILISENT ce champ comme variable,');
    console.log('      pas les formules de ce champ lui-même.');
  }
}

trace()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
