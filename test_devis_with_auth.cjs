const axios = require('axios');

async function testDevisWithAuth() {
  try {
    console.log('🔐 TEST DE CRÉATION DE DEVIS AVEC AUTHENTIFICATION\n');

    const baseURL = 'http://localhost:4000/api';
    
    // 1. D'abord, tenter de se connecter en tant qu'admin
    console.log('1️⃣ Tentative de connexion admin...');
    
    try {
      const loginResponse = await axios.post(`${baseURL}/auth/login`, {
        email: 'admin@2thier.be',
        password: 'admin123'
      });
      
      const token = loginResponse.data.token;
      console.log('✅ Connexion réussie!');
      
      // 2. Test de création avec token
      console.log('\n2️⃣ Test de création de devis...');
      
      const testData = {
        responses: {
          'field_1': { value: 'Test automatique', type: 'text' },
          'field_2': { value: 42, type: 'number' }
        },
        userId: 1,
        treeId: 1
      };

      const response = await axios.post(`${baseURL}/treebranchleaf/submit`, testData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log('\n🎉 SUCCÈS ! Devis créé !');
      console.log('📊 Réponse:', JSON.stringify(response.data, null, 2));

      // 3. Vérification des données automatiques
      if (response.data.id) {
        console.log('\n3️⃣ Vérification du système automatique...');
        
        const checkResponse = await axios.get(`${baseURL}/treebranchleaf/submission/${response.data.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const submission = checkResponse.data;
        console.log('📋 Submission complète:', JSON.stringify(submission, null, 2));
        
        // Vérifier les triggers automatiques
        if (submission.submissionData && submission.submissionData.length > 0) {
          console.log('\n🔍 Analyse des données automatiques:');
          
          submission.submissionData.forEach((data, index) => {
            console.log(`\n   📄 Ligne ${index + 1}:`);
            console.log(`      🔑 Key: ${data.key}`);
            console.log(`      💾 Value: ${data.value}`);
            console.log(`      🤖 operationDetail: ${data.operationDetail || 'NULL'}`);
            console.log(`      ⚡ operationResult: ${data.operationResult || 'NULL'}`);
            console.log(`      📡 operationSource: ${data.operationSource || 'NULL'}`);
            console.log(`      🕒 lastResolved: ${data.lastResolved || 'NULL'}`);
          });
          
          // Compter les champs automatiques peuplés
          const autoPopulated = submission.submissionData.filter(data => 
            data.operationDetail || data.operationResult || data.operationSource || data.lastResolved
          );
          
          console.log(`\n🎯 RÉSULTAT: ${autoPopulated.length}/${submission.submissionData.length} champs automatiquement peuplés`);
          
          if (autoPopulated.length > 0) {
            console.log('✅ LE SYSTÈME AUTOMATIQUE FONCTIONNE !');
          } else {
            console.log('⚠️  Les champs automatiques sont encore NULL - triggers à vérifier');
          }
        } else {
          console.log('⚠️  Aucune donnée submissionData trouvée');
        }
      }

    } catch (loginError) {
      console.log('❌ Échec de connexion admin, test direct sans auth...');
      
      // Test direct sans authentification pour diagnostic
      const testData = {
        responses: {
          'field_1': { value: 'Test sans auth', type: 'text' }
        },
        userId: 1,
        treeId: 1
      };

      const response = await axios.post(`${baseURL}/treebranchleaf/submit`, testData, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('📊 Réponse sans auth:', JSON.stringify(response.data, null, 2));
    }

  } catch (error) {
    console.error('\n❌ ERREUR lors du test:');
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data?.message || error.response.statusText}`);
      console.error(`   Détails:`, error.response.data);
      
      // Si c'est une erreur 500, on regarde les logs du serveur
      if (error.response.status === 500) {
        console.error('\n💡 SUGGESTION: Vérifier les logs du serveur avec get_task_output');
      }
    } else if (error.request) {
      console.error('   Aucune réponse reçue:', error.message);
    } else {
      console.error('   Erreur de configuration:', error.message);
    }
  }
}

testDevisWithAuth();