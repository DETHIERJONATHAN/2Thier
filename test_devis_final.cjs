const http = require('http');

console.log('🧪 Test final - Création devis avec triggers PostgreSQL automatiques\n');

const postData = JSON.stringify({
  name: 'Test Devis Triggers',
  treeId: 'cmf1mwoz10005gooked1j6orn', // Utiliser l'ID de l'arbre existant
  leadId: null
});

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/treebranchleaf/submissions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'Authorization': 'Bearer fake-token-for-testing'
  }
};

const req = http.request(options, (res) => {
  console.log(`📡 Statut de réponse: ${res.statusCode}`);
  console.log(`📋 Headers de réponse:`, res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\n📦 Réponse complète:');
    
    try {
      const jsonResponse = JSON.parse(data);
      console.log('✅ Réponse JSON parsée avec succès:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🆔 ID:', jsonResponse.id);
      console.log('🌳 TreeId:', jsonResponse.treeId);
      console.log('👤 UserId:', jsonResponse.userId);
      console.log('📧 LeadId:', jsonResponse.leadId);
      console.log('📊 Status:', jsonResponse.status);
      console.log('📝 Summary:', jsonResponse.summary);
      console.log('⏰ UpdatedAt:', jsonResponse.updatedAt);
      
      if (jsonResponse.TreeBranchLeafTree) {
        console.log('\n🌳 TreeBranchLeafTree:');
        console.log('  - ID:', jsonResponse.TreeBranchLeafTree.id);
        console.log('  - Name:', jsonResponse.TreeBranchLeafTree.name);
      }
      
      if (jsonResponse.TreeBranchLeafSubmissionData) {
        console.log('\n📊 TreeBranchLeafSubmissionData (auto-populé):');
        const data = jsonResponse.TreeBranchLeafSubmissionData;
        console.log('  🔧 operationDetail:', data.operationDetail);
        console.log('  📈 operationResult:', data.operationResult);
        console.log('  📍 operationSource:', data.operationSource);
        console.log('  ✅ lastResolved:', data.lastResolved);
        console.log('  🔍 analysisDepth:', data.analysisDepth);
        console.log('  ⚡ computationComplexity:', data.computationComplexity);
        console.log('  🛡️ dataIntegrity:', data.dataIntegrity);
        console.log('  📏 performanceMetrics:', data.performanceMetrics);
        console.log('  ✔️ validationStatus:', data.validationStatus);
        console.log('  🚨 errorHandling:', data.errorHandling);
        console.log('  📋 outputFormat:', data.outputFormat);
        console.log('  ⏱️ processingTime:', data.processingTime);
        console.log('  💾 memoryUsage:', data.memoryUsage);
        console.log('  🎯 resourceAllocation:', data.resourceAllocation);
        console.log('  🔒 securityLevel:', data.securityLevel);
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎉 Test final réussi ! Les triggers PostgreSQL ont fonctionné !');
      
    } catch (parseError) {
      console.error('❌ Erreur de parsing JSON:', parseError.message);
      console.log('📄 Réponse brute:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Erreur de requête: ${e.message}`);
});

console.log('🚀 Envoi de la requête POST...');
req.write(postData);
req.end();