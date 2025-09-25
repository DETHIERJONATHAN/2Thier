// Test POST direct pour debugging de l'erreur 500

const axios = require('axios');

async function testPostSubmissions() {
  try {
    console.log('🔧 TEST DIRECT POST /api/treebranchleaf/submissions\n');

    const baseURL = 'http://localhost:4000/api';
    
    // Données selon le format attendu par l'API
    const submissionData = {
      treeId: 'cmf1mwoz10005gooked1j6orn', // TreeId existant
      leadId: '1758062740843-tbl-test',     // Lead existant
      name: 'Test Devis Automatique',
      data: {
        '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e': 'Valeur test 1',
        '688046c2-c2ee-4617-b4d3-c66eca40fa9d': 'Valeur test 2'
      }
    };

    console.log('📝 Données envoyées:', JSON.stringify(submissionData, null, 2));

    // Test avec cookies de session (simulation de l'auth frontend)
    const response = await axios.post(`${baseURL}/treebranchleaf/submissions`, submissionData, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=s%3A...; accessToken=...',  // Simulation de cookies
        'x-organization-id': '1757366075154-i554z93kl'
      },
      timeout: 10000,
      validateStatus: function (status) {
        return status < 600; // Accepter même les erreurs 5xx pour voir le détail
      }
    });

    if (response.status === 200 || response.status === 201) {
      console.log('\n✅ SUCCÈS !');
      console.log('📊 Réponse:', JSON.stringify(response.data, null, 2));
    } else {
      console.log(`\n❌ ERREUR ${response.status}`);
      console.log('📋 Message:', response.data?.message || response.statusText);
      console.log('🔍 Détails:', response.data);
    }

  } catch (error) {
    console.error('\n💥 EXCEPTION:');
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data?.message || 'Pas de message'}`);
      console.error(`   Erreur complète:`, error.response.data);
      
      // Logs spécifiques pour erreur 500
      if (error.response.status === 500) {
        console.error('\n🚨 ERREUR 500 - Problème serveur:');
        console.error('   Vérifier les logs du serveur pour plus de détails');
        console.error('   Erreur probablement dans la base de données ou la logique');
      }
    } else if (error.request) {
      console.error('   Aucune réponse:', error.message);
    } else {
      console.error('   Configuration:', error.message);
    }
  }
}

testPostSubmissions();