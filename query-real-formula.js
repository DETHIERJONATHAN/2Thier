// Appel direct à l'API pour récupérer la vraie formule
import fetch from 'node-fetch';

async function analyzeRealFormula() {
  try {
    console.log('🔍 [API CALL] Récupération de la formule cb42c9a9-c6b4-49bb-bd55-74d763123bfb');
    
    // Appel direct à l'API (sans auth pour l'instant)
    const response = await fetch('http://localhost:3000/api/debug/formula/cb42c9a9-c6b4-49bb-bd55-74d763123bfb');
    
    if (!response.ok) {
      console.error(`❌ Erreur API: ${response.status} ${response.statusText}`);
      
      // Essayer de créer un endpoint temporaire
      console.log('📋 Créons un endpoint debug temporaire...');
      return;
    }
    
    const data = await response.json();
    console.log('📊 [FORMULE RÉELLE] Structure:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    
    // Plan B: utiliser un endpoint existant avec debug
    console.log('\n📋 [PLAN B] Ajoutons du debug à un endpoint existant...');
    
    // Tester avec l'endpoint d'évaluation
    const testData = {
      node_1757366229542_r791f4qk7: 'd6212e5e-3fe9-4cce-b380-e6745524d011',
      'd6212e5e-3fe9-4cce-b380-e6745524d011_field': '2',
      '__mirror_data_Calcul du prix Kw/h': '2', 
      'node_1757366229534_x6jxzmvmu': '5'
    };
    
    try {
      const evalResponse = await fetch('http://localhost:3000/api/treebranchleaf/evaluate/formula/cb42c9a9-c6b4-49bb-bd55-74d763123bfb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });
      
      if (evalResponse.ok) {
        const result = await evalResponse.json();
        console.log('✅ [ÉVALUATION] Résultat:', result);
      } else {
        console.log('❌ Endpoint eval non accessible sans auth');
      }
    } catch (evalError) {
      console.log('❌ Erreur eval:', evalError.message);
    }
  }
}

analyzeRealFormula();