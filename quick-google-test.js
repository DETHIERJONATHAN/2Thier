#!/usr/bin/env node

/**
 * 🔧 Test rapide du statut Google via l'API
 */

import fetch from 'node-fetch';

async function quickGoogleTest() {
  console.log('🔧 TEST RAPIDE STATUT GOOGLE');
  console.log('═'.repeat(40));
  
  try {
    // Test 1: Statut de connexion Google
    console.log('\n📡 Test statut connexion Google...');
    const statusResponse = await fetch('http://localhost:4000/api/auth/google/status', {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('✅ Statut API répond');
      console.log('📄 Données:', JSON.stringify(statusData, null, 2));
    } else {
      console.log(`❌ Erreur statut: ${statusResponse.status}`);
    }
    
    // Test 2: Test simple de l'API Gmail
    console.log('\n📧 Test API Gmail direct...');
    const gmailResponse = await fetch('http://localhost:4000/api/gmail/messages?maxResults=1', {
      headers: {
        'x-organization-id': '717a2b14-0d9c-48f6-b7ef-79dc0a0cc8de'
      }
    });
    
    const gmailData = await gmailResponse.json();
    console.log(`📊 Status: ${gmailResponse.status}`);
    
    if (gmailData.error) {
      console.log('❌ Erreur Gmail:', gmailData.error);
      if (gmailData.error.includes('insufficient authentication scopes')) {
        console.log('🔄 SOLUTION: Reconnexion nécessaire avec les nouveaux scopes');
      } else if (gmailData.error.includes('Connexion à Gmail requise')) {
        console.log('🔄 SOLUTION: Authentification Google requise');
      }
    } else {
      console.log('✅ API Gmail fonctionne !');
      console.log(`📧 Messages: ${gmailData.data?.length || 0}`);
    }
    
    // Instructions pour l'utilisateur
    console.log('\n🎯 ACTIONS RECOMMANDÉES:');
    console.log('1. Ouvrez http://localhost:5173 dans votre navigateur');
    console.log('2. Allez sur la page Gmail');
    console.log('3. Si vous voyez "Se connecter à Google", cliquez dessus');
    console.log('4. Acceptez toutes les permissions');
    console.log('5. Testez les boutons étoile et suppression');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

quickGoogleTest();
