const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Trouver l'arbre Bloc
  const tree = await prisma.treeBranchLeafTree.findFirst({
    where: { name: { contains: 'Bloc', mode: 'insensitive' } }
  });
  
  console.log('ARBRE:', tree.id, tree.name);
  
  // Récupérer les nœuds
  const nodes = await prisma.treeBranchLeafNode.findMany({
    where: { treeId: tree.id },
    orderBy: { order: 'asc' }
  });
  
  console.log('\nTOTAL NOEUDS:', nodes.length);
  
  // Types
  const types = {};
  nodes.forEach(n => {
    types[n.type] = (types[n.type] || 0) + 1;
  });
  console.log('\nTYPES:', types);
  
  // Afficher 15 premiers nœuds
  console.log('\n--- PREMIERS NOEUDS ---');
  nodes.slice(0, 15).forEach(n => {
    const configStr = n.config ? JSON.stringify(n.config).substring(0, 100) : 'null';
    console.log(`${n.type} | ${n.label} | config: ${configStr}`);
  });
  
  // Chercher les repeaters
  console.log('\n--- REPEATERS ---');
  const repeaters = nodes.filter(n => n.type === 'leaf_repeater');
  repeaters.forEach(r => {
    console.log('Repeater:', r.label, r.id);
    console.log('Config:', JSON.stringify(r.config, null, 2));
  });
  
  // Chercher champs avec prix/total/quantité dans le label
  console.log('\n--- CHAMPS DEVIS POTENTIELS ---');
  const keywords = ['prix', 'total', 'quantit', 'montant', 'surface', 'puissance', 'kwc', 'panneau'];
  nodes.forEach(n => {
    const label = (n.label || '').toLowerCase();
    if (keywords.some(k => label.includes(k))) {
      console.log(`${n.type} | ${n.label} | id: ${n.id}`);
    }
  });
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
