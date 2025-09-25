const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findMissingNode() {
  console.log('🕵️ RECHERCHE DU NŒUD MANQUANT');
  console.log('='.repeat(50));

  try {
    const missingNodeId = 'node_1757366229556_2a3fcdn70';
    
    console.log(`🔍 Recherche de patterns similaires pour: ${missingNodeId}`);
    
    // Rechercher par timestamp (1757366229556)
    const timestamp = '1757366229556';
    console.log(`\n🕰️ Recherche par timestamp ${timestamp}:`);
    
    const nodesByTimestamp = await prisma.treeBranchLeafNode.findMany({
      where: {
        id: {
          contains: timestamp
        }
      }
    });
    
    console.log(`Trouvé ${nodesByTimestamp.length} nœud(s) avec ce timestamp:`);
    nodesByTimestamp.forEach(node => {
      console.log(`  - ${node.id}: "${node.label}" (${node.type}/${node.subType})`);
    });

    // Rechercher des nœuds avec "facture" dans le label (probable pour la division facture/consommation)
    console.log(`\n💰 Recherche de nœuds avec "facture" dans le label:`);
    
    const factureNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        label: {
          contains: 'facture',
          mode: 'insensitive'
        }
      }
    });
    
    console.log(`Trouvé ${factureNodes.length} nœud(s) avec "facture":`);
    factureNodes.forEach(node => {
      console.log(`  - ${node.id}: "${node.label}" (${node.type}/${node.subType})`);
    });

    // Rechercher des nœuds avec "prix" ou "coût" ou "montant"
    console.log(`\n💸 Recherche de nœuds avec "prix", "coût" ou "montant":`);
    
    const prixNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        OR: [
          { label: { contains: 'prix', mode: 'insensitive' } },
          { label: { contains: 'coût', mode: 'insensitive' } },
          { label: { contains: 'cout', mode: 'insensitive' } },
          { label: { contains: 'montant', mode: 'insensitive' } }
        ]
      }
    });
    
    console.log(`Trouvé ${prixNodes.length} nœud(s) avec prix/coût/montant:`);
    prixNodes.forEach(node => {
      console.log(`  - ${node.id}: "${node.label}" (${node.type}/${node.subType})`);
    });

    // Vérifier les formules qui référencent des nœuds inexistants
    console.log(`\n🔗 Vérification des formules avec références cassées:`);
    
    const allFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
      include: {
        node: {
          select: { label: true }
        }
      }
    });
    
    for (const formula of allFormulas) {
      const tokens = formula.tokens;
      if (Array.isArray(tokens)) {
        for (const token of tokens) {
          if (token.type === 'variable' && token.name) {
            // Vérifier si le nœud référencé existe
            const referencedNode = await prisma.treeBranchLeafNode.findUnique({
              where: { id: token.name }
            });
            
            if (!referencedNode) {
              console.log(`  ⚠️ RÉFÉRENCE CASSÉE dans formule "${formula.node.label}": ${token.name}`);
            }
          }
        }
      }
    }

    // ANALYSE SPÉCIALE : Chercher des nœuds qui pourraient représenter une "facture"
    console.log(`\n🧾 Recherche avancée de nœuds pouvant représenter le numérateur (facture/montant):`);
    
    const potentialNumeratorNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        OR: [
          { label: { contains: 'électr', mode: 'insensitive' } },
          { label: { contains: 'facture', mode: 'insensitive' } },
          { label: { contains: 'montant', mode: 'insensitive' } },
          { label: { contains: 'coût', mode: 'insensitive' } },
          { label: { contains: 'total', mode: 'insensitive' } },
          { label: { contains: 'annuel', mode: 'insensitive' } }
        ]
      },
      where: {
        treeId: 'cmf1mwoz10005gooked1j6orn' // Même tree que la consommation
      }
    });
    
    console.log(`Trouvé ${potentialNumeratorNodes.length} candidat(s) potentiel(s):`);
    potentialNumeratorNodes.forEach(node => {
      console.log(`  - ${node.id}: "${node.label}" (${node.type}/${node.subType})`);
    });

  } catch (error) {
    console.error('❌ Erreur lors de la recherche:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findMissingNode();