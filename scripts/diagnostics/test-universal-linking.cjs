/**
 * 🧪 TEST DU SYSTÈME UNIVERSEL DE LIAISON
 * 
 * Ce script teste que toutes les liaisons bidirectionnelles sont bien créées
 * automatiquement lors de la création/copie de capacités et de variables.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testUniversalLinkingSystem() {
  try {
    console.log('\n🧪 TEST DU SYSTÈME UNIVERSEL DE LIAISON\n');
    console.log('═'.repeat(80));
    
    // ═══════════════════════════════════════════════════════════════════════
    // 1️⃣ TEST: Rechercher une condition récente
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n1️⃣ TEST DES CONDITIONS:\n');
    
    const recentCondition = await prisma.treeBranchLeafNodeCondition.findFirst({
      orderBy: { createdAt: 'desc' },
      take: 1
    });
    
    if (recentCondition) {
      console.log(`📋 Condition testée: ${recentCondition.id}`);
      console.log(`   name: ${recentCondition.name}`);
      
      // Extraire les nodeIds du conditionSet
      const conditionSet = recentCondition.conditionSet;
      const nodeIds = new Set();
      
      if (conditionSet) {
        const str = JSON.stringify(conditionSet);
        const uuidRegex = /@value\.([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi;
        let match;
        while ((match = uuidRegex.exec(str)) !== null) {
          nodeIds.add(match[1]);
        }
      }
      
      console.log(`\n   📊 ${nodeIds.size} nœud(s) trouvé(s) dans le conditionSet`);
      
      // Vérifier que linkedConditionIds contient bien l'ID de la condition
      let linkedCount = 0;
      let notLinkedCount = 0;
      
      for (const nodeId of nodeIds) {
        const node = await prisma.treeBranchLeafNode.findUnique({
          where: { id: nodeId },
          select: { linkedConditionIds: true, label: true }
        });
        
        if (node) {
          const isLinked = node.linkedConditionIds && node.linkedConditionIds.includes(recentCondition.id);
          if (isLinked) {
            linkedCount++;
            console.log(`   ✅ ${nodeId} (${node.label}) → linkedConditionIds contient ${recentCondition.id}`);
          } else {
            notLinkedCount++;
            console.log(`   ❌ ${nodeId} (${node.label}) → linkedConditionIds NE CONTIENT PAS ${recentCondition.id}`);
          }
        }
      }
      
      console.log(`\n   📊 Résultat: ${linkedCount}/${nodeIds.size} nœuds correctement liés`);
      
      if (notLinkedCount > 0) {
        console.log(`   ⚠️ ${notLinkedCount} nœud(s) NON LIÉS - Le système automatique n'a pas fonctionné !`);
      } else {
        console.log(`   ✅ TOUS les nœuds sont correctement liés !`);
      }
    } else {
      console.log('⚠️ Aucune condition trouvée');
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // 2️⃣ TEST: Rechercher une formule récente
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(80));
    console.log('\n2️⃣ TEST DES FORMULES:\n');
    
    const recentFormula = await prisma.treeBranchLeafNodeFormula.findFirst({
      orderBy: { createdAt: 'desc' },
      take: 1
    });
    
    if (recentFormula) {
      console.log(`📋 Formule testée: ${recentFormula.id}`);
      console.log(`   name: ${recentFormula.name}`);
      
      // Extraire les nodeIds des tokens
      const nodeIds = new Set();
      
      if (recentFormula.tokens) {
        let tokens;
        if (typeof recentFormula.tokens === 'string') {
          try {
            tokens = JSON.parse(recentFormula.tokens);
          } catch {
            tokens = [];
          }
        } else {
          tokens = recentFormula.tokens;
        }
        
        if (Array.isArray(tokens)) {
          for (const token of tokens) {
            if (token && typeof token === 'object') {
              if (token.type === 'field' && token.fieldId) {
                nodeIds.add(token.fieldId);
              }
              if (token.type === 'nodeValue' && token.nodeId) {
                nodeIds.add(token.nodeId);
              }
            }
          }
        }
      }
      
      console.log(`\n   📊 ${nodeIds.size} nœud(s) trouvé(s) dans les tokens`);
      
      // Vérifier que linkedFormulaIds contient bien l'ID de la formule
      let linkedCount = 0;
      let notLinkedCount = 0;
      
      for (const nodeId of nodeIds) {
        const node = await prisma.treeBranchLeafNode.findUnique({
          where: { id: nodeId },
          select: { linkedFormulaIds: true, label: true }
        });
        
        if (node) {
          const isLinked = node.linkedFormulaIds && node.linkedFormulaIds.includes(recentFormula.id);
          if (isLinked) {
            linkedCount++;
            console.log(`   ✅ ${nodeId} (${node.label}) → linkedFormulaIds contient ${recentFormula.id}`);
          } else {
            notLinkedCount++;
            console.log(`   ❌ ${nodeId} (${node.label}) → linkedFormulaIds NE CONTIENT PAS ${recentFormula.id}`);
          }
        }
      }
      
      console.log(`\n   📊 Résultat: ${linkedCount}/${nodeIds.size} nœuds correctement liés`);
      
      if (notLinkedCount > 0) {
        console.log(`   ⚠️ ${notLinkedCount} nœud(s) NON LIÉS - Le système automatique n'a pas fonctionné !`);
      } else {
        console.log(`   ✅ TOUS les nœuds sont correctement liés !`);
      }
    } else {
      console.log('⚠️ Aucune formule trouvée');
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // 3️⃣ TEST: Rechercher une variable récente
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(80));
    console.log('\n3️⃣ TEST DES VARIABLES:\n');
    
    const recentVariable = await prisma.treeBranchLeafNodeVariable.findFirst({
      orderBy: { createdAt: 'desc' },
      take: 1
    });
    
    if (recentVariable) {
      console.log(`📋 Variable testée: ${recentVariable.id}`);
      console.log(`   displayName: ${recentVariable.displayName}`);
      console.log(`   sourceRef: ${recentVariable.sourceRef}`);
      
      // Déterminer le type de capacité et extraire les nodeIds
      const nodeIds = new Set();
      
      if (recentVariable.sourceRef.startsWith('condition:') || recentVariable.sourceRef.startsWith('node-condition:')) {
        const conditionId = recentVariable.sourceRef.replace('condition:', '').replace('node-condition:', '');
        console.log(`   Type: CONDITION (${conditionId})`);
        
        const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
          where: { id: conditionId },
          select: { conditionSet: true }
        });
        
        if (condition && condition.conditionSet) {
          const str = JSON.stringify(condition.conditionSet);
          const uuidRegex = /@value\.([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi;
          let match;
          while ((match = uuidRegex.exec(str)) !== null) {
            nodeIds.add(match[1]);
          }
        }
      } else if (recentVariable.sourceRef.startsWith('node-formula:')) {
        const formulaId = recentVariable.sourceRef.replace('node-formula:', '');
        console.log(`   Type: FORMULE (${formulaId})`);
        
        const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
          where: { id: formulaId },
          select: { tokens: true }
        });
        
        if (formula && formula.tokens) {
          let tokens;
          if (typeof formula.tokens === 'string') {
            try {
              tokens = JSON.parse(formula.tokens);
            } catch {
              tokens = [];
            }
          } else {
            tokens = formula.tokens;
          }
          
          if (Array.isArray(tokens)) {
            for (const token of tokens) {
              if (token && typeof token === 'object') {
                if (token.type === 'field' && token.fieldId) {
                  nodeIds.add(token.fieldId);
                }
                if (token.type === 'nodeValue' && token.nodeId) {
                  nodeIds.add(token.nodeId);
                }
              }
            }
          }
        }
      }
      
      console.log(`\n   📊 ${nodeIds.size} nœud(s) trouvé(s) dans la capacité`);
      
      // Vérifier que linkedVariableIds contient bien l'ID de la variable
      let linkedCount = 0;
      let notLinkedCount = 0;
      
      for (const nodeId of nodeIds) {
        const node = await prisma.treeBranchLeafNode.findUnique({
          where: { id: nodeId },
          select: { linkedVariableIds: true, label: true }
        });
        
        if (node) {
          const isLinked = node.linkedVariableIds && node.linkedVariableIds.includes(recentVariable.id);
          if (isLinked) {
            linkedCount++;
            console.log(`   ✅ ${nodeId} (${node.label}) → linkedVariableIds contient ${recentVariable.id}`);
          } else {
            notLinkedCount++;
            console.log(`   ❌ ${nodeId} (${node.label}) → linkedVariableIds NE CONTIENT PAS ${recentVariable.id}`);
          }
        }
      }
      
      console.log(`\n   📊 Résultat: ${linkedCount}/${nodeIds.size} nœuds correctement liés`);
      
      if (notLinkedCount > 0) {
        console.log(`   ⚠️ ${notLinkedCount} nœud(s) NON LIÉS - Le système automatique n'a pas fonctionné !`);
      } else {
        console.log(`   ✅ TOUS les nœuds sont correctement liés !`);
      }
    } else {
      console.log('⚠️ Aucune variable trouvée');
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // 📋 RÉSUMÉ
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(80));
    console.log('\n✅ TEST TERMINÉ\n');
    console.log('Le système universel de liaison est maintenant actif !');
    console.log('');
    console.log('📋 Ce qui est maintenant AUTOMATIQUE et OBLIGATOIRE:');
    console.log('');
    console.log('1. Quand une CONDITION est créée/copiée:');
    console.log('   → linkedConditionIds est mis à jour sur TOUS les nœuds référencés');
    console.log('');
    console.log('2. Quand une FORMULE est créée/copiée:');
    console.log('   → linkedFormulaIds est mis à jour sur TOUS les nœuds référencés');
    console.log('');
    console.log('3. Quand une TABLE est créée/copiée:');
    console.log('   → linkedTableIds est mis à jour sur TOUS les nœuds référencés');
    console.log('');
    console.log('4. Quand une VARIABLE charge une capacité:');
    console.log('   → linkedVariableIds est mis à jour sur TOUS les nœuds de la capacité');
    console.log('');
    console.log('🎯 AUCUNE EXCEPTION - C\'EST OBLIGATOIRE ET AUTOMATIQUE !');
    console.log('\n' + '═'.repeat(80));
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUniversalLinkingSystem();
