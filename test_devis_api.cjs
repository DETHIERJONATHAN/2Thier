// Compatible Node.js sans dépendances externes
const http = require('http');

async function testCreateDevis() {
  try {
    console.log('🧪 Test de création de devis avec système automatique...');
    
    const postData = JSON.stringify({
      treeId: 1,
      name: 'Test Devis Automatique',
      data: {
        test: 'valeur',
        autre: 'donnée'
      }
    });

    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/treebranchleaf/submissions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      console.log('📊 Status:', res.statusCode);
      console.log('📋 Headers:', res.headers);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📝 Réponse brute:', data);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const result = JSON.parse(data);
            console.log('✅ Devis créé avec succès!');
            console.log('🆔 ID:', result.id);
            console.log('🌳 TreeBranchLeafSubmissionData:', result.TreeBranchLeafSubmissionData);
          } catch (parseError) {
            console.log('⚠️ Réponse non-JSON:', data);
          }
        } else {
          console.log('❌ Erreur lors de la création');
        }
      });
    });

    req.on('error', (error) => {
      console.error('💥 Erreur:', error.message);
    });

    req.write(postData);
    req.end();
    
  } catch (error) {
    console.error('💥 Erreur:', error.message);
  }
}

testCreateDevis();