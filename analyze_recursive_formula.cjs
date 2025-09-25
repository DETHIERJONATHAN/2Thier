const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔍 ANALYSE FORMULE DANS CONDITION SINON\n');
    
    // La formule mentionnée dans le SINON
    const formulaId = '7097ff9b-974a-4fb3-80d8-49634a634efc';
    
    console.log(`📋 Analyse de la formule: ${formulaId}`);
    
    const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
      where: { id: formulaId },
      include: {
        node: true
      }
    });
    
    if (formula) {
      console.log(`✅ Formule trouvée:`);
      console.log(`   Label: ${formula.label || 'Sans label'}`);
      console.log(`   Description: ${formula.description || 'Sans description'}`);
      console.log(`   Tokens: ${JSON.stringify(formula.tokens, null, 2)}`);
      
      if (formula.node) {
        console.log(`   Node associé: ${formula.node.label}`);
      }
      
      // Analyser les tokens de cette formule
      if (formula.tokens && Array.isArray(formula.tokens)) {
        console.log(`\n🔍 ANALYSE DES TOKENS:`);
        
        for (let i = 0; i < formula.tokens.length; i++) {
          const token = formula.tokens[i];
          console.log(`   ${i}: ${JSON.stringify(token)}`);
          
          if (typeof token === 'string' && token.startsWith('@value.')) {
            const nodeId = token.replace('@value.', '');
            console.log(`      → Référence au node: ${nodeId}`);
            
            // Chercher ce node
            const referencedNode = await prisma.treeBranchLeafNode.findUnique({
              where: { id: nodeId },
              select: { 
                label: true, 
                defaultValue: true
              }
            });
            
            if (referencedNode) {
              console.log(`      → Label: "${referencedNode.label}"`);
              console.log(`      → Valeur défaut: "${referencedNode.defaultValue}"`);
              
              // Vérifier si ce node a lui-même une formule ou condition !
              const nodeFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
                where: { nodeId: nodeId }
              });
              
              const nodeConditions = await prisma.treeBranchLeafNodeCondition.findMany({
                where: { nodeId: nodeId }
              });
              
              if (nodeFormulas.length > 0) {
                console.log(`      → 🧮 CE NODE A UNE FORMULE !`);
                nodeFormulas.forEach(f => {
                  console.log(`         Formule: ${f.label} (${f.id})`);
                });
              }
              
              if (nodeConditions.length > 0) {
                console.log(`      → 🔀 CE NODE A UNE CONDITION !`);
                nodeConditions.forEach(c => {
                  console.log(`         Condition: ${c.name} (${c.id})`);
                });
              }
            }
          }
        }
      }
      
    } else {
      console.log(`❌ Formule ${formulaId} non trouvée`);
    }
    
    console.log('\n🎯 CONCLUSION:');
    console.log('   Il faut descendre RÉCURSIVEMENT dans chaque référence !');
    console.log('   Chaque @value. peut être une formule, condition ou tableau');
    
  } catch(e) {
    console.log('Erreur:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();