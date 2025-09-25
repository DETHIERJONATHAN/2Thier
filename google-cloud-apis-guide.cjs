/**
 * 🔧 GUIDE COMPLET ACTIVATION APIs GOOGLE CLOUD
 * Ce script liste toutes les APIs à activer pour les services Google Workspace
 */

console.log('🚀 GUIDE ACTIVATION APIs GOOGLE CLOUD POUR CRM\n');
console.log('=' .repeat(70));

const apis = {
  'DÉJÀ ACTIVÉES': {
    '📧 Gmail': [
      'Gmail API',
      'Google Workspace Admin SDK'
    ],
    '📅 Google Calendar': [
      'Calendar API'
    ],
    '📁 Google Drive': [
      'Drive API'
    ]
  },
  
  'NOUVELLES À ACTIVER': {
    '🤖 Google Gemini AI': [
      'Vertex AI API',
      'Generative AI API', 
      'AI Platform API',
      'Cloud Natural Language API',
      'Cloud Translation API',
      'Cloud Speech-to-Text API',
      'Cloud Text-to-Speech API'
    ],
    
    '🎥 Google Meet': [
      'Google Meet API',
      'Google Workspace Events API',
      'Google Calendar API (déjà activé)'
    ],
    
    '📝 Google Docs': [
      'Google Docs API',
      'Google Drive API (déjà activé)'
    ],
    
    '📊 Google Sheets': [
      'Google Sheets API',
      'Google Drive API (déjà activé)'
    ],
    
    '💬 Google Chat': [
      'Google Chat API',
      'Hangouts Chat API',
      'Google Workspace Admin SDK (déjà activé)'
    ],
    
    '🗺️ Google Maps': [
      'Maps JavaScript API',
      'Geocoding API',
      'Places API',
      'Directions API',
      'Distance Matrix API'
    ],
    
    '📝 Google Keep': [
      'Keep API (limitée)',
      'Notes API (si disponible)'
    ],
    
    '📈 Google Analytics': [
      'Google Analytics Reporting API',
      'Google Analytics Data API (GA4)',
      'Google Analytics Admin API'
    ],
    
    '📞 Google Voice': [
      'Google Voice API (limitée en Europe)',
      'Cloud Speech API'
    ]
  }
};

// Affichage organisé
Object.entries(apis).forEach(([section, services]) => {
  console.log(`\n📋 ${section}:`);
  console.log('─'.repeat(50));
  
  Object.entries(services).forEach(([service, apiList]) => {
    console.log(`\n${service}:`);
    apiList.forEach(api => {
      const status = api.includes('déjà activé') ? '✅' : '🔄';
      console.log(`  ${status} ${api}`);
    });
  });
});

console.log('\n' + '=' .repeat(70));
console.log('🛠️ ÉTAPES D\'ACTIVATION DANS GOOGLE CLOUD CONSOLE');
console.log('=' .repeat(70));

const steps = [
  '1. 🌐 Aller sur https://console.cloud.google.com',
  '2. 📂 Sélectionner votre projet (ou créer un nouveau)',
  '3. 🔍 Aller dans "APIs & Services" > "Library"',
  '4. 🔍 Rechercher chaque API listée ci-dessus',
  '5. ✅ Cliquer "Enable" pour chaque API',
  '6. 🔑 Configurer les identifiants OAuth 2.0',
  '7. 🔐 Ajouter les scopes nécessaires'
];

steps.forEach(step => console.log(step));

console.log('\n🔑 SCOPES OAUTH 2.0 À AJOUTER:');
console.log('─'.repeat(50));

const scopes = [
  // Existants
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send', 
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/drive',
  
  // Nouveaux pour Meet
  'https://www.googleapis.com/auth/meetings',
  'https://www.googleapis.com/auth/calendar.events',
  
  // Nouveaux pour Docs/Sheets
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets',
  
  // Nouveaux pour Chat
  'https://www.googleapis.com/auth/chat.spaces',
  'https://www.googleapis.com/auth/chat.messages',
  
  // Nouveaux pour AI
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/generative-language',
  
  // Nouveaux pour Analytics
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/analytics.edit'
];

scopes.forEach(scope => console.log(`📋 ${scope}`));

console.log('\n💰 COÛTS ESTIMÉS PAR SERVICE:');
console.log('─'.repeat(50));

const costs = [
  '🤖 Gemini AI: ~$0.001-0.01 par requête (variable selon modèle)',
  '🗺️ Google Maps: ~$2-7 per 1000 requêtes',
  '📈 Google Analytics: Gratuit jusqu\'à certaines limites',
  '🎥 Google Meet: Inclus dans Google Workspace',
  '📝 Google Docs/Sheets: Inclus dans Google Workspace',
  '💬 Google Chat: Inclus dans Google Workspace',
  '📝 Google Keep: Gratuit (API limitée)',
  '📞 Google Voice: Variable selon région'
];

costs.forEach(cost => console.log(`💡 ${cost}`));

console.log('\n⚠️ LIMITATIONS IMPORTANTES:');
console.log('─'.repeat(50));

const limitations = [
  '🌍 Google Voice: Pas de numéros belges disponibles',
  '📝 Google Keep: API très limitée, pas officielle',
  '💰 Gemini AI: Peut devenir coûteux avec usage intensif',
  '🗺️ Maps: Quotas quotidiens à surveiller',
  '🔒 Chat: Nécessite Google Workspace Business+'
];

limitations.forEach(limitation => console.log(`⚠️ ${limitation}`));

console.log('\n🚀 RECOMMANDATIONS PRIORISÉES:');
console.log('─'.repeat(50));

const recommendations = [
  '🥇 PRIORITÉ 1: Gemini AI (différenciateur majeur)',
  '🥈 PRIORITÉ 2: Google Meet (essentiel business)',
  '🥉 PRIORITÉ 3: Google Docs/Sheets (productivité)',
  '4️⃣ PRIORITÉ 4: Google Maps (optimisation)',
  '5️⃣ PRIORITÉ 5: Google Analytics (tracking)',
  '6️⃣ ÉVALUER: Google Chat (selon besoins équipe)',
  '❓ SKIP: Google Voice (limitation géographique)',
  '❓ SKIP: Google Keep (API limitée)'
];

recommendations.forEach(rec => console.log(`📊 ${rec}`));

console.log('\n✅ ACTIONS IMMÉDIATES:');
console.log('─'.repeat(50));

console.log('1. 🔧 Activer Vertex AI API pour Gemini');
console.log('2. 🎥 Activer Google Meet API');  
console.log('3. 📝 Activer Google Docs + Sheets APIs');
console.log('4. 🔑 Mettre à jour les scopes OAuth');
console.log('5. 💳 Configurer la facturation Google Cloud');
console.log('6. 🧪 Tester chaque API individuellement');

console.log('\n🎯 VOULEZ-VOUS QUE JE VOUS AIDE À:');
console.log('─'.repeat(50));
console.log('A) 🤖 Implémenter Google Gemini AI en premier');
console.log('B) 🎥 Configurer Google Meet intégration');  
console.log('C) 📋 Créer un script de test pour toutes les APIs');
console.log('D) 💰 Analyser les coûts en détail');

console.log('\n💡 Répondez avec la lettre de votre choix !');
