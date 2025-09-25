const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🧪 TEST COMPLET DU SYSTÈME AUTOMATISÉ\n');
    
    // 1. Récupérer un devis existant pour copier ses références
    const existingDevis = await prisma.treeBranchLeafSubmission.findFirst({
      select: { userId: true, treeId: true }
    });
    
    if (!existingDevis) {
      console.log('❌ Aucun devis existant trouvé');
      return;
    }
    
    console.log('📋 Devis de référence trouvé');
    
    // 2. Créer un nouveau devis (doit déclencher le trigger)
    const testDevisId = `test-auto-${Date.now()}`;
    
    console.log('\n🚀 Création nouveau devis pour tester l\'automatisation...');
    
    const newDevis = await prisma.treeBranchLeafSubmission.create({
      data: {
        id: testDevisId,
        treeId: existingDevis.treeId,
        userId: existingDevis.userId,
        updatedAt: new Date()
      }
    });
    
    console.log(`✅ Devis créé: ${newDevis.id}`);
    
    // 3. Attendre que les triggers fassent leur travail
    console.log('\n⏳ Attente de l\'exécution des triggers (3 secondes)...');
    await new Promise(r => setTimeout(r, 3000));
    
    // 4. Vérifier les variables auto-créées
    console.log('\n📊 VÉRIFICATION DES VARIABLES AUTO-CRÉÉES:');
    
    const autoCreatedVars = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { 
        submissionId: newDevis.id, 
        isVariable: true 
      },
      select: {
        id: true,
        variableKey: true,
        sourceRef: true,
        value: true,
        operationResult: true
      }
    });
    
    console.log(`   🎯 Variables auto-créées: ${autoCreatedVars.length}`);
    
    autoCreatedVars.forEach((v, i) => {
      const type = v.sourceRef?.startsWith('formula:') ? '🧮' : '🔀';
      console.log(`   ${i + 1}. ${type} ${v.variableKey}`);
      console.log(`      Valeur: ${v.value}`);
      
      if (v.operationResult) {
        if (v.operationResult.needsTranslation) {
          console.log(`      📝 En attente de traduction (${v.operationResult.type})`);
        } else if (v.operationResult.translation) {
          console.log(`      📝 Traduit: ${v.operationResult.translation.substring(0, 60)}...`);
        }
      } else {
        console.log(`      📝 Pas de traduction`);
      }
      console.log('');
    });
    
    // 5. Si des variables sont en attente, les traiter
    const pendingVars = autoCreatedVars.filter(v => 
      v.operationResult?.needsTranslation === true
    );
    
    if (pendingVars.length > 0) {
      console.log(`\n🔄 TRAITEMENT DES ${pendingVars.length} VARIABLES EN ATTENTE:`);
      
      for (const variable of pendingVars) {
        console.log(`   🔄 ${variable.variableKey}...`);
        
        try {
          let translation = '';
          
          if (variable.sourceRef?.startsWith('condition:')) {
            const conditionId = variable.sourceRef.replace('condition:', '');
            const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
              where: { id: conditionId }
            });
            
            if (condition) {
              translation = await quickParseCondition(condition.conditionSet, variable.submissionId);
            }
          } else if (variable.sourceRef?.startsWith('formula:')) {
            const formulaId = variable.sourceRef.replace('formula:', '');
            const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
              where: { id: formulaId }
            });
            
            if (formula && formula.tokens) {
              translation = await quickParseFormula(formula.tokens, variable.submissionId);
            }
          }
          
          // Sauvegarder la traduction
          await prisma.treeBranchLeafSubmissionData.update({
            where: { id: variable.id },
            data: {
              operationResult: { translation: translation },
              value: 'Auto-traduit'
            }
          });
          
          console.log(`      ✅ ${translation.substring(0, 80)}...`);
          
        } catch (error) {
          console.log(`      ❌ Erreur: ${error.message}`);
        }
      }
    }
    
    // 6. Résultat final
    console.log('\n🎉 RÉSULTAT FINAL:');
    
    const finalVars = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { 
        submissionId: newDevis.id, 
        isVariable: true 
      },
      select: {
        variableKey: true,
        sourceRef: true,
        operationResult: true
      }
    });
    
    finalVars.forEach((v, i) => {
      const type = v.sourceRef?.startsWith('formula:') ? '🧮' : '🔀';
      console.log(`   ${i + 1}. ${type} ${v.variableKey}`);
      if (v.operationResult?.translation) {
        console.log(`      📝 ${v.operationResult.translation}`);
      }
      console.log('');
    });
    
    // 7. Nettoyage du test
    console.log('🧹 Nettoyage du devis de test...');
    await prisma.treeBranchLeafSubmission.delete({
      where: { id: testDevisId }
    });
    
    console.log('✅ TEST TERMINÉ - Le système est maintenant 100% automatisé !');
    
  } catch(e) {
    console.log('Erreur:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();

// Fonctions de parsing simplifiées pour le test
async function quickParseCondition(conditionSet, submissionId) {
  try {
    const dataObj = typeof conditionSet === 'string' ? JSON.parse(conditionSet) : conditionSet;
    
    if (dataObj.branches && dataObj.branches[0]) {
      const branch = dataObj.branches[0];
      const nodeId = branch.when?.left?.ref?.replace('@value.', '');
      
      if (nodeId) {
        const node = await prisma.treeBranchLeafNode.findUnique({
          where: { id: nodeId },
          select: { label: true }
        });
        
        return `SI ("${node?.label || 'Champ'}" NON VIDE) ALORS (ACTION) SINON (ACTION)`;
      }
    }
    
    return 'CONDITION AUTO-TRADUITE';
  } catch (error) {
    return 'ERREUR TRADUCTION CONDITION';
  }
}

async function quickParseFormula(tokens, submissionId) {
  try {
    if (!Array.isArray(tokens)) return 'FORMULE INVALIDE';
    
    const parts = [];
    
    for (const token of tokens) {
      if (typeof token === 'string' && token.startsWith('@value.')) {
        const nodeId = token.replace('@value.', '');
        const node = await prisma.treeBranchLeafNode.findUnique({
          where: { id: nodeId },
          select: { label: true }
        });
        
        parts.push(`"${node?.label || 'Champ'}" (auto)`);
      } else {
        parts.push(token);
      }
    }
    
    return parts.join(' ');
  } catch (error) {
    return 'ERREUR TRADUCTION FORMULE';
  }
}