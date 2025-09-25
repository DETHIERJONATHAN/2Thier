// Test simple avec curl pour voir les logs serveur
const fetch = require('node-fetch');

async function simpleTest() {
  console.log('🧪 TEST SIMPLE ENDPOINT');
  console.log('=======================');
  
  const conditionId = 'ff05cc48-27ec-4d94-8975-30a0f9c1c275';
  const submissionId = '00c1a9d4-b27c-40dd-a08b-99d516504b9b';
  
  console.log(`ConditionId: ${conditionId}`);
  console.log(`SubmissionId: ${submissionId}`);
  
  try {
    console.log('\n📡 Envoi requête...');
    
    const response = await fetch('http://localhost:4000/api/treebranchleaf/evaluate/condition/' + conditionId, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        submissionId: submissionId,
        organizationId: 'test-org',
        userId: 'test-user',
        testMode: true
      })
    });
    
    console.log(`Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erreur: ${errorText}`);
      return;
    }
    
    const result = await response.json();
    console.log('\n📊 RÉPONSE:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Erreur fetch:', error.message);
  }
}

// Attendre que le serveur soit prêt
setTimeout(simpleTest, 2000);