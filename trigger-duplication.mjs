/**
 * Script pour déclencher la duplication du repeater via API
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4000';
const REPEATER_ID = 'd1d8810d-232b-46e0-a5dd-9ee889ad9fc0';

async function triggerDuplication() {
  console.log('🚀 Déclenchement de la duplication du repeater...\n');
  
  try {
    const response = await fetch(
      `${API_BASE}/api/repeat/${REPEATER_ID}/instances/execute`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'duplicate',
          templateNodeIds: [
            'ad6fc72b-1757-4cc9-9d79-215cabf610e6',
            '962677c1-224e-4f1a-9837-88cbc2be2aad',
            'b92c3d0b-cd41-4689-9c72-3660a0ad8fa3',
            'f81b2ace-9f6c-45d4-82a7-a8e4bf842e45',
            '7d3dc335-ab7e-43e2-bbf1-395981a7938a',
            'ea10e9f4-9002-4923-8417-f1b4e3a1bdc7'
          ]
        })
      }
    );
    
    if (!response.ok) {
      const text = await response.text();
      console.error('❌ Erreur API:', response.status, text);
      process.exit(1);
    }
    
    const result = await response.json();
    console.log('✅ Duplication réussie!\n');
    console.log('📊 Résultat:', JSON.stringify(result, null, 2));
    
    console.log('\n🔍 Maintenant lance: node check-variable-440d.mjs');
    
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
}

triggerDuplication();
