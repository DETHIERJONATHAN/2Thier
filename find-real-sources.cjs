const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== TROUVER CE QUE L\'ORIGINAL UTILISE VRAIMENT ===\n');

  // Récupérer TOUTES les formules de Panneaux max original
  const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
    where: { nodeId: '3da47bc3-739e-4c83-98c3-813ecf77a740' }
  });

  console.log(`Nombre de formules pour Panneaux max: ${formulas.length}\n`);

  for (const f of formulas) {
    console.log(`\n=== FORMULE: ${f.name} (${f.id}) ===`);
    console.log('Tokens:', f.tokens);
    
    // Extraire et vérifier chaque référence
    if (f.tokens) {
      for (const token of f.tokens) {
        if (typeof token === 'string' && token.startsWith('@')) {
          const match = token.match(/@(\w+)\.([a-f0-9-]+)/);
          if (match) {
            const [, type, id] = match;
            
            // Chercher le nœud
            const node = await prisma.treeBranchLeafNode.findUnique({
              where: { id },
              select: { id: true, label: true, calculatedValue: true, value: true }
            });
            
            // Chercher la table
            const table = await prisma.treeBranchLeafNodeTable.findUnique({
              where: { id }
            });
            
            console.log(`\n  ${token}:`);
            if (node) {
              console.log(`    → NODE: ${node.label}`);
              console.log(`    → calculatedValue: ${node.calculatedValue}`);
              console.log(`    → value: ${node.value}`);
            }
            if (table) {
              console.log(`    → TABLE: ${table.name}`);
              console.log(`    → lookupKey: ${table.lookupKey}`);
              console.log(`    → lookupColumn: ${table.lookupColumn}`);
            }
            if (!node && !table) {
              console.log(`    → ❌ NI NODE NI TABLE TROUVÉ`);
            }
          }
        }
      }
    }
  }

  // Vérifier la condition active
  console.log('\n\n=== CONDITION ACTIVE DE PANNEAUX MAX ===');
  const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
    where: { id: '8eebf44e-f70b-4613-b13b-5f1e0a8b82cb' }
  });
  
  if (condition) {
    console.log(`Condition: ${condition.name}`);
    const cs = condition.conditionSet;
    if (cs?.branches) {
      for (const b of cs.branches) {
        console.log(`\nBranche "${b.label}":`);
        console.log(`  Si: ${b.when?.left?.ref} ${b.when?.operator} ${b.when?.right?.ref}`);
        console.log(`  Alors: ${JSON.stringify(b.actions)}`);
        
        // Vérifier les valeurs des refs
        if (b.when?.left?.ref) {
          const leftMatch = b.when.left.ref.match(/@(\w+)\.([a-f0-9-]+)/);
          if (leftMatch) {
            const node = await prisma.treeBranchLeafNode.findUnique({
              where: { id: leftMatch[2] },
              select: { label: true, value: true, calculatedValue: true }
            });
            console.log(`  LEFT NODE: ${node?.label} = value:${node?.value}, calc:${node?.calculatedValue}`);
          }
        }
        if (b.when?.right?.ref) {
          const rightMatch = b.when.right.ref.match(/@(\w+)\.([a-f0-9-]+)/);
          if (rightMatch) {
            const node = await prisma.treeBranchLeafNode.findUnique({
              where: { id: rightMatch[2] },
              select: { label: true, value: true, calculatedValue: true }
            });
            console.log(`  RIGHT NODE: ${node?.label} = value:${node?.value}, calc:${node?.calculatedValue}`);
          }
        }
      }
      console.log(`\nFallback: ${JSON.stringify(cs.fallback?.actions)}`);
    }
  }

  // Vérifier Position et Portrait
  console.log('\n\n=== POSITION ET PORTRAIT (originaux) ===');
  const position = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '249b682d-d50d-42fd-bdcf-f6a1139792d1' },
    select: { label: true, value: true, calculatedValue: true }
  });
  console.log('Position:', position);

  const portrait = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '3211d48d-4745-445d-b8fc-3e19e5dc4b8a' },
    select: { label: true, value: true, calculatedValue: true }
  });
  console.log('Portrait:', portrait);

  // Comparer avec les copies
  console.log('\n\n=== POSITION ET PORTRAIT (copies) ===');
  const position1 = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '249b682d-d50d-42fd-bdcf-f6a1139792d1-1' },
    select: { label: true, value: true, calculatedValue: true }
  });
  console.log('Position-1:', position1);

  const portrait1 = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '3211d48d-4745-445d-b8fc-3e19e5dc4b8a-1' },
    select: { label: true, value: true, calculatedValue: true }
  });
  console.log('Portrait-1:', portrait1);
}

main().catch(console.error).finally(() => prisma.$disconnect());
