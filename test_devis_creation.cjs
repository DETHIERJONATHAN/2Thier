const axios = require('axios');

async function testDevisCreation() {
  try {
    console.log('🧪 TEST DE CRÉATION DE DEVIS\n');

    // Configuration de base
    const baseURL = 'http://localhost:4000/api';
    
    // Données de test simplifiées pour TreeBranchLeaf
    const testData = {
      responses: {
        'field_1': { value: 'Test', type: 'text' },
        'field_2': { value: 25, type: 'number' }
      },
      userId: 1, // ID utilisateur de test
      treeId: 1   // ID de l'arbre existant
    };

    console.log('📝 Données de test:', JSON.stringify(testData, null, 2));

    // Test de création via l'API TreeBranchLeaf
    console.log('\n🚀 Envoi de la requête...');
    
    const response = await axios.post(`${baseURL}/treebranchleaf/submit`, testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('\n✅ SUCCÈS !');
    console.log('📊 Réponse:', JSON.stringify(response.data, null, 2));
    
    // Vérifier si les données automatiques ont été peuplées
    if (response.data.id) {
      console.log('\n🔍 Vérification des données automatiques...');
      
      const verifyResponse = await axios.get(`${baseURL}/treebranchleaf/submission/${response.data.id}`);
      
      console.log('📋 Données complètes de la submission:');
      console.log(JSON.stringify(verifyResponse.data, null, 2));
      
      // Vérifier les champs automatiques
      const submissionData = verifyResponse.data.submissionData || [];
      const autoFields = submissionData.filter(data => 
        data.operationDetail || data.operationResult || data.operationSource || data.lastResolved
      );
      
      console.log(`\n🎯 Champs automatiques détectés: ${autoFields.length}`);
      autoFields.forEach(field => {
        console.log(`   ✅ ${field.key}: operationDetail=${!!field.operationDetail}, operationResult=${!!field.operationResult}`);
      });
    }

  } catch (error) {
    console.error('\n❌ ERREUR lors du test:');
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data?.message || error.response.statusText}`);
      console.error(`   Détails:`, error.response.data);
    } else if (error.request) {
      console.error('   Aucune réponse reçue:', error.message);
    } else {
      console.error('   Erreur de configuration:', error.message);
    }
  }
}

testDevisCreation();