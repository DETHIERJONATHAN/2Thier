#!/usr/bin/env node

/**
 * 🎯 Script pour tester le endpoint /ultra-precision-compute
 * Simule l'appel du client et teste différents scénarios
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4000';
const API_ENDPOINT = '/api/measurement-reference/ultra-precision-compute';

// Test payload basé sur les logs
const testPayload = {
  detectedPoints: 230,
  objectPoints: [
    { x: 182.4, y: 11.3 },   // topLeft
    { x: 722.4, y: 11.3 },   // topRight
    { x: 656.1, y: 1061.7 }, // bottomRight
    { x: 182.4, y: 1094.5 }  // bottomLeft
  ],
  fusedCorners: {
    topLeft: { x: 0.486, y: 0.283 },
    topRight: { x: 0.734, y: 0.245 },
    bottomLeft: { x: 0.275, y: 0.956 },
    bottomRight: { x: 0.650, y: 0.948 }
  },
  markerSize: { w: 16, h: 16 }, // cm, CARRÉ
  canvasScale: 0.5533854166666666,
  imageSize: { width: 1536, height: 2048 }
};

async function testEndpoint() {
  console.log('='.repeat(80));
  console.log('🧪 TEST ENDPOINT /ultra-precision-compute');
  console.log('='.repeat(80));

  console.log(`\n📤 Envoi vers: ${BASE_URL}${API_ENDPOINT}`);
  console.log(`📊 Payload:`);
  console.log(`   • detectedPoints: ${testPayload.detectedPoints}`);
  console.log(`   • objectPoints: 4 coins`);
  console.log(`   • fusedCorners: marqueur détecté`);
  console.log(`   • markerSize: 16×16cm (carré)`);
  console.log(`   • canvasScale: ${testPayload.canvasScale}`);

  try {
    const response = await fetch(`${BASE_URL}${API_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    console.log(`\n📥 Réponse: ${response.status} ${response.statusText}`);

    const data = await response.json();

    if (response.ok) {
      console.log(`\n✅ SUCCÈS:`);
      console.log(`   Largeur:  ${data.largeur_cm?.toFixed(2)} cm`);
      console.log(`   Hauteur:  ${data.hauteur_cm?.toFixed(2)} cm`);
      console.log(`   Qualité:  ${data.quality?.toFixed(2)}%`);
      console.log(`   Inliers:  ${data.inlierCount}/230`);
      console.log(`   Méthode:  ${data.method}`);

      // Analyser la réponse
      console.log(`\n📊 ANALYSE:`);
      console.log(`   Vraie porte: 82×202 cm`);
      console.log(`   Erreur L: ${Math.abs(data.largeur_cm - 82).toFixed(2)}cm (${(Math.abs(data.largeur_cm - 82) / 82 * 100).toFixed(1)}%)`);
      console.log(`   Erreur H: ${Math.abs(data.hauteur_cm - 202).toFixed(2)}cm (${(Math.abs(data.hauteur_cm - 202) / 202 * 100).toFixed(1)}%)`);
    } else {
      console.log(`\n❌ ERREUR:`);
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error(`\n❌ Erreur de connexion: ${error.message}`);
    console.log(`   Assurez-vous que le serveur tourne sur ${BASE_URL}`);
  }

  console.log('\n' + '='.repeat(80));
}

// Test multiple appels pour voir l'instabilité
async function testMultipleCalls() {
  console.log('\n\n='.repeat(80));
  console.log('🔄 TEST INSTABILITÉ (5 appels consécutifs)');
  console.log('='.repeat(80));

  const results = [];

  for (let i = 0; i < 5; i++) {
    console.log(`\n📍 Appel #${i + 1}...`);
    try {
      const response = await fetch(`${BASE_URL}${API_ENDPOINT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });

      if (response.ok) {
        const data = await response.json();
        results.push({
          call: i + 1,
          largeur: data.largeur_cm,
          hauteur: data.hauteur_cm,
          quality: data.quality,
          inliers: data.inlierCount
        });

        console.log(`   ✅ ${data.largeur_cm.toFixed(2)} × ${data.hauteur_cm.toFixed(2)} cm (qualité: ${data.quality.toFixed(1)}%)`);
      }
    } catch (e) {
      console.log(`   ❌ Erreur: ${e.message}`);
    }
  }

  // Statistiques
  if (results.length > 0) {
    console.log('\n📊 STATISTIQUES:');
    const largeurs = results.map(r => r.largeur);
    const hauteurs = results.map(r => r.hauteur);

    const avgL = largeurs.reduce((a, b) => a + b) / largeurs.length;
    const avgH = hauteurs.reduce((a, b) => a + b) / hauteurs.length;
    const varL = Math.max(...largeurs) - Math.min(...largeurs);
    const varH = Math.max(...hauteurs) - Math.min(...hauteurs);

    console.log(`\n   Largeur:`);
    console.log(`      Moyenne:   ${avgL.toFixed(2)} cm`);
    console.log(`      Variation: ${varL.toFixed(2)} cm (${(varL / avgL * 100).toFixed(1)}%)`);

    console.log(`\n   Hauteur:`);
    console.log(`      Moyenne:   ${avgH.toFixed(2)} cm`);
    console.log(`      Variation: ${varH.toFixed(2)} cm (${(varH / avgH * 100).toFixed(1)}%)`);

    console.log(`\n   ${varL > 5 || varH > 5 ? '🔴 INSTABILITÉ DÉTECTÉE!' : '✅ Résultats stables'}`);
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

// Lancer les tests
(async () => {
  await testEndpoint();
  await testMultipleCalls();
})().catch(console.error);
