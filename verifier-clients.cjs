const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifierNodeClients() {
  try {
    const clientNodeId = 'node_1757366229470_wbzl3mi60'; // Nœud Clients
    
    console.log('🔍 Vérification complète du nœud Clients...');
    console.log(`Node ID: ${clientNodeId}`);
    
    // 1. Récupérer les détails du nœud
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: clientNodeId },
      select: {
        id: true,
        label: true,
        type: true,
        subType: true,
        hasFormula: true,
        formulaConfig: true,
        metadata: true
      }
    });
    
    if (!node) {
      console.log('❌ Nœud Clients non trouvé !');
      return;
    }
    
    console.log('\n📊 DÉTAILS DU NŒUD CLIENTS:');
    console.log(`   Label: ${node.label}`);
    console.log(`   Type: ${node.type} / ${node.subType}`);
    console.log(`   hasFormula: ${node.hasFormula}`);
    console.log(`   formulaConfig: ${node.formulaConfig ? 'OUI' : 'NON'}`);
    console.log(`   metadata: ${node.metadata ? 'OUI' : 'NON'}`);
    
    if (node.formulaConfig) {
      console.log(`   📝 formulaConfig contenu: ${JSON.stringify(node.formulaConfig, null, 2)}`);
    }
    
    if (node.metadata) {
      console.log(`   📝 metadata contenu: ${JSON.stringify(node.metadata, null, 2)}`);
    }
    
    // 2. Vérifier les formules dans la table dédiée
    const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
      where: { nodeId: clientNodeId }
    });
    
    console.log(`\n🧮 FORMULES DANS LA TABLE DÉDIÉE: ${formulas.length}`);
    formulas.forEach((formula, index) => {
      console.log(`   ${index + 1}. "${formula.name}"`);
      console.log(`      ID: ${formula.id}`);
      console.log(`      Tokens: ${JSON.stringify(formula.tokens)}`);
      console.log(`      Ordre: ${formula.order}`);
      console.log(`      Par défaut: ${formula.isDefault}`);
    });
    
    // 3. Test de l'API pour ce nœud
    console.log('\n🌐 TEST API:');
    console.log(`   Endpoint: /api/treebranchleaf/nodes/${clientNodeId}/formulas`);
    console.log(`   → Devrait retourner ${formulas.length} formule(s)`);
    
    // 4. Problème potentiel - vérifier si hasFormula est à jour
    if (formulas.length > 0 && !node.hasFormula) {
      console.log('\n⚠️ PROBLÈME DÉTECTÉ:');
      console.log('   Des formules existent en table mais hasFormula = false');
      console.log('   → Le frontend ne peut pas détecter les formules');
      console.log('   → Solution: mettre à jour hasFormula = true');
      
      // Corriger automatiquement
      await prisma.treeBranchLeafNode.update({
        where: { id: clientNodeId },
        data: { hasFormula: true }
      });
      
      console.log('   ✅ hasFormula mis à jour à true');
    }
    
    // 5. Vérifier les capacités dans metadata
    if (node.metadata && typeof node.metadata === 'object') {
      const capabilities = node.metadata.capabilities;
      if (capabilities) {
        console.log('\n🎯 CAPACITÉS DANS METADATA:');
        Object.keys(capabilities).forEach(cap => {
          console.log(`   ${cap}: ${capabilities[cap] ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifierNodeClients();
