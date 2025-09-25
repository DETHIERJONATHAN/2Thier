import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findCorrectNodes() {
  try {
    // Les nodeId que je vois dans l'image de la table TreeBranchLeafNodeFormula
    const nodeIdsFromTable = [
      'node_1757366229470_wb2l', // début du premier nodeId visible
      'node_1757366229463_sye4'  // début du second nodeId visible
    ];
    
    console.log('🔍 Recherche des nœuds correspondants aux formules...');
    
    // Chercher tous les nœuds avec ces préfixes
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        OR: [
          { id: { startsWith: 'node_1757366229470' } },
          { id: { startsWith: 'node_1757366229463' } }
        ]
      },
      select: {
        id: true,
        label: true
      }
    });
    
    console.log('📋 Nœuds trouvés:', nodes.length);
    
    for (const node of nodes) {
      console.log(`\n📌 Nœud: "${node.label}" (ID: ${node.id})`);
      
      // Chercher les formules pour ce nœud
      const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
        where: { nodeId: node.id },
        select: {
          id: true,
          name: true,
          tokens: true,
          isDefault: true,
          order: true
        }
      });
      
      console.log(`  📊 Formules dans la table: ${formulas.length}`);
      
      if (formulas.length > 0) {
        formulas.forEach((f, i) => {
          console.log(`    ${i+1}. "${f.name}"`);
          console.log(`       Tokens bruts: ${f.tokens}`);
          
          // Essayer de parser, mais gérer l'erreur
          try {
            const parsed = JSON.parse(f.tokens);
            console.log(`       Tokens parsés: ${JSON.stringify(parsed)}`);
          } catch (e) {
            console.log(`       ⚠️  Tokens non-JSON valide: ${f.tokens}`);
          }
          
          console.log(`       Default: ${f.isDefault}, Order: ${f.order}`);
        });
      }
    }
    
    // Maintenant, cherchons aussi tous les nœuds avec "prix" ou "kw" pour voir la différence
    console.log('\n🔍 Comparaison avec TOUS les nœuds contenant prix/kw:');
    
    const allPriceNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        OR: [
          { label: { contains: 'prix', mode: 'insensitive' } },
          { label: { contains: 'kw', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        label: true
      }
    });
    
    for (const node of allPriceNodes) {
      const hasFormula = await prisma.treeBranchLeafNodeFormula.count({
        where: { nodeId: node.id }
      });
      
      console.log(`📌 "${node.label}" (${node.id}) - Formules: ${hasFormula > 0 ? '✅' : '❌'}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findCorrectNodes();
