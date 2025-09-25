const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deepServerDiagnosis() {
  console.log('🔍 DIAGNOSTIC APPROFONDI - Erreur 500 persistante\n');
  console.log('=' .repeat(60));

  try {
    // 1. Vérifier l'état exact de la formule en base
    console.log('📋 1. ÉTAT DE LA FORMULE EN BASE:');
    const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
      where: { id: 'cb42c9a9-c6b4-49bb-bd55-74d763123bfb' }
    });

    if (!formula) {
      console.log('❌ FORMULE INTROUVABLE !');
      return;
    }

    console.log('- ID:', formula.id);
    console.log('- Description:', formula.description);
    console.log('- Type tokens:', typeof formula.tokens);
    console.log('- Is Array:', Array.isArray(formula.tokens));
    console.log('- Tokens bruts:', JSON.stringify(formula.tokens));
    
    // 2. Vérifier le format exact des tokens
    console.log('\n🔍 2. ANALYSE DÉTAILLÉE DES TOKENS:');
    let tokens = formula.tokens;
    
    // Si c'est encore une chaîne, la parser
    if (typeof tokens === 'string') {
      console.log('⚠️  Tokens encore en format chaîne !');
      try {
        tokens = JSON.parse(tokens);
        console.log('✅ Parsing réussi');
      } catch (e) {
        console.log('❌ Erreur de parsing:', e.message);
        return;
      }
    }

    if (!Array.isArray(tokens)) {
      console.log('❌ Tokens ne sont pas un tableau !');
      return;
    }

    console.log('✅ Structure correcte (tableau avec', tokens.length, 'éléments)');
    tokens.forEach((token, index) => {
      console.log(`Token ${index + 1}:`, JSON.stringify(token, null, 2));
    });

    // 3. Vérifier les variables référencées
    console.log('\n🔗 3. VÉRIFICATION DES VARIABLES:');
    for (const token of tokens) {
      if (token.type === 'variable') {
        const varId = token.variableId || token.name || token.id;
        console.log(`Checking variable: ${varId}`);
        
        try {
          const variable = await prisma.treeBranchLeafNode.findFirst({
            where: { 
              OR: [
                { id: varId },
                { fieldName: varId }
              ]
            },
            select: { id: true, fieldName: true, type: true, option_label: true, field_label: true }
          });
          
          if (variable) {
            console.log(`✅ Variable trouvée:`, variable);
          } else {
            console.log(`❌ Variable introuvable: ${varId}`);
          }
        } catch (error) {
          console.log(`❌ Erreur lors de la recherche de ${varId}:`, error.message);
        }
      }
    }

    // 4. Simuler exactement ce que reçoit le serveur
    console.log('\n🧪 4. SIMULATION RÉCEPTION SERVEUR:');
    
    // Données typiques envoyées par le formulaire
    const mockRequestData = {
      formulaId: 'cb42c9a9-c6b4-49bb-bd55-74d763123bfb',
      formData: {
        "node_1757366229542_r791f4qk7": "702d1b09-abc9-4096-9aaa-77155ac5294f",
        "node_1757366229534_x6jxzmvmu": "3500"
      }
    };

    console.log('Données simulées:', JSON.stringify(mockRequestData, null, 2));

    // 5. Simuler l'évaluation côté serveur
    console.log('\n⚙️ 5. SIMULATION ÉVALUATION:');
    
    const formData = mockRequestData.formData;
    console.log('Form data reçu:', formData);
    
    // Parcourir les tokens et récupérer les valeurs
    for (const token of tokens) {
      if (token.type === 'variable') {
        const varId = token.variableId || token.name || token.id;
        console.log(`Token variable: ${varId}`);
        
        // Chercher la valeur dans formData
        let value = null;
        
        // Méthode 1: correspondance directe
        if (formData[varId]) {
          value = formData[varId];
          console.log(`  ✅ Valeur trouvée (directe): ${value}`);
        }
        // Méthode 2: recherche dans les valeurs (pour les options)
        else {
          for (const [key, val] of Object.entries(formData)) {
            if (val === varId) {
              value = varId; // Pour les options, l'ID est la valeur
              console.log(`  ✅ Valeur trouvée (option): ${value} via clé ${key}`);
              break;
            }
          }
        }
        
        if (!value) {
          console.log(`  ❌ Aucune valeur trouvée pour ${varId}`);
        }
      }
    }

    // 6. Test de cohérence finale
    console.log('\n✅ 6. RÉSUMÉ DU DIAGNOSTIC:');
    console.log('- Formule existe:', '✅');
    console.log('- Format tokens correct:', Array.isArray(tokens) ? '✅' : '❌');
    console.log('- Nombre de tokens:', tokens.length);
    console.log('- Variables mappées:', tokens.filter(t => t.type === 'variable').length);
    
    console.log('\n🎯 PROCHAINES ÉTAPES:');
    console.log('1. Vérifier les logs du serveur en temps réel');
    console.log('2. Examiner exactement ce qui cause l\'erreur 500');
    console.log('3. Identifier si c\'est un problème de format ou de logique');

  } catch (error) {
    console.error('❌ Erreur pendant le diagnostic:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deepServerDiagnosis();