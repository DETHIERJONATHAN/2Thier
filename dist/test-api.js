// Test direct avec fetch pour vérifier l'API
async function testAPIDirectly() {
  try {
    console.log('=== TEST API DEPUIS LE FRONTEND ===');
    
    const leadId = '8ffdf10e-2167-4ec6-b306-3ffb5a92240f'; // Pierre Martin
    
    // Test 1: Récupérer le lead actuel
    console.log('1. Récupération du lead...');
    const getResponse = await fetch(`/api/leads/${leadId}`, {
      credentials: 'include'
    });
    const leadData = await getResponse.json();
    console.log('Lead actuel:', leadData.name, 'statut:', leadData.status);
    
    // Test 2: Mettre à jour le statut
    console.log('2. Mise à jour du statut vers "contacted"...');
    const putResponse = await fetch(`/api/leads/${leadId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'contacted' })
    });
    
    if (!putResponse.ok) {
      console.error('Erreur PUT:', putResponse.status, putResponse.statusText);
      const errorText = await putResponse.text();
      console.error('Détails erreur:', errorText);
      return;
    }
    
    const updatedLead = await putResponse.json();
    console.log('Lead mis à jour:', updatedLead.name, 'nouveau statut:', updatedLead.status);
    
    // Test 3: Vérifier que le changement a été persisté
    console.log('3. Vérification...');
    const verifyResponse = await fetch(`/api/leads/${leadId}`, {
      credentials: 'include'
    });
    const verifiedLead = await verifyResponse.json();
    console.log('Vérification:', verifiedLead.name, 'statut final:', verifiedLead.status);
    
    if (verifiedLead.status === 'contacted') {
      console.log('✅ SUCCESS: L\'API fonctionne correctement !');
    } else {
      console.log('❌ FAIL: Le statut n\'a pas été sauvegardé');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Exécuter le test
console.log('Vous pouvez exécuter cette fonction dans la console du navigateur:');
console.log('testAPIDirectly()');

// Pour faciliter l'accès global
window.testAPIDirectly = testAPIDirectly;
