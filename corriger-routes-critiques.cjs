const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION SPÉCIFIQUE DES ROUTES CRITIQUES');
console.log('='.repeat(55));

// Corrections spécifiques pour les routes restantes
const correctionsCritiques = [
  // TelnyxPage - toutes les routes manquent /api/
  { fichier: 'src/pages/TelnyxPage.tsx', de: "stableApi.get('/telnyx/", a: "stableApi.get('/api/telnyx/" },
  { fichier: 'src/pages/TelnyxPage.tsx', de: "stableApi.post('/telnyx/", a: "stableApi.post('/api/telnyx/" },
  { fichier: 'src/pages/TelnyxPage.tsx', de: "stableApi.put('/telnyx/", a: "stableApi.put('/api/telnyx/" },
  { fichier: 'src/pages/TelnyxPage.tsx', de: "stableApi.delete('/telnyx/", a: "stableApi.delete('/api/telnyx/" },
  
  // GoogleAgendaPage - routes Calendar manquent /api/
  { fichier: 'src/pages/GoogleAgendaPage.tsx', de: "stableApi.get('/calendar/", a: "stableApi.get('/api/calendar/" },
  { fichier: 'src/pages/GoogleAgendaPage.tsx', de: "stableApi.post('/calendar/", a: "stableApi.post('/api/calendar/" },
  { fichier: 'src/pages/GoogleAgendaPage.tsx', de: "stableApi.put('/calendar/", a: "stableApi.put('/api/calendar/" },
  { fichier: 'src/pages/GoogleAgendaPage.tsx', de: "stableApi.delete('/calendar/", a: "stableApi.delete('/api/calendar/" },
  
  // GoogleMeetPage - routes Meet manquent /api/
  { fichier: 'src/pages/GoogleMeetPage.tsx', de: "stableApi.get('/google-meet/", a: "stableApi.get('/api/google-meet/" },
  { fichier: 'src/pages/GoogleMeetPage.tsx', de: "stableApi.post('/google-meet/", a: "stableApi.post('/api/google-meet/" },
  { fichier: 'src/pages/GoogleMeetPage.tsx', de: "stableApi.delete('/google-meet/", a: "stableApi.delete('/api/google-meet/" },
  
  // AnalyticsPage - routes Analytics manquent /api/
  { fichier: 'src/pages/AnalyticsPage.tsx', de: "stableApi.get('/analytics/", a: "stableApi.get('/api/analytics/" },
  { fichier: 'src/pages/AnalyticsPage.tsx', de: "stableApi.post('/analytics/", a: "stableApi.post('/api/analytics/" },
  
  // AuditPage - routes Analytics manquent /api/
  { fichier: 'src/pages/AuditPage.tsx', de: "stableApi.get('/analytics/", a: "stableApi.get('/api/analytics/" },
  
  // Routes leads pour /api/leads
  { fichier: 'src/pages/TelnyxPage.tsx', de: "stableApi.get('/leads?", a: "stableApi.get('/api/leads?" },
  { fichier: 'src/pages/GoogleAgendaPage.tsx', de: "stableApi.get('/leads?", a: "stableApi.get('/api/leads?" },
  
  // AgendaPage plugin - toutes les routes /api/
  { fichier: 'src/plugins/ModuleAgenda/AgendaPage.tsx', de: "api.get('/api/calendar/", a: "api.get('/api/calendar/" }, // déjà bon
  { fichier: 'src/plugins/ModuleAgenda/AgendaPage.tsx', de: "api.post('/api/calendar/", a: "api.post('/api/calendar/" }, // déjà bon
  
  // Corriger les Google services qui utilisent des routes non-standard
  { fichier: 'src/pages/GoogleDocsPage.tsx', de: "api.get('/drive/files", a: "api.get('/api/google-drive/files" },
  { fichier: 'src/pages/GoogleDocsPage.tsx', de: "api.post('/drive/files", a: "api.post('/api/google-drive/files" },
  { fichier: 'src/pages/GoogleDocsPage.tsx', de: "api.delete('/drive/files", a: "api.delete('/api/google-drive/files" },
  
  { fichier: 'src/pages/GoogleSheetsPage.tsx', de: "api.get('/drive/files", a: "api.get('/api/google-drive/files" },
  { fichier: 'src/pages/GoogleSheetsPage.tsx', de: "api.post('/drive/files", a: "api.post('/api/google-drive/files" },
  { fichier: 'src/pages/GoogleSheetsPage.tsx', de: "api.delete('/drive/files", a: "api.delete('/api/google-drive/files" },
  
  // Services Calendar Integration
  { fichier: 'src/services/CalendarIntegrationService.ts', de: "this.api.get('/api/calendar/", a: "this.api.get('/api/calendar/" }, // déjà bon
  { fichier: 'src/services/CalendarIntegrationService.ts', de: "this.api.post('/api/calendar/", a: "this.api.post('/api/calendar/" }, // déjà bon
  { fichier: 'src/services/CalendarIntegrationService.ts', de: "this.api.get('/api/leads/", a: "this.api.get('/api/leads/" }, // déjà bon
  
  // Hooks useDrafts - Google Auth routes
  { fichier: 'src/hooks/useDrafts.ts', de: "api.get('/api/google-auth/", a: "api.get('/api/google-auth/" }, // déjà bon
  { fichier: 'src/hooks/useDrafts.ts', de: "api.post('/api/google-auth/", a: "api.post('/api/google-auth/" }, // déjà bon
  { fichier: 'src/hooks/useDrafts.ts', de: "api.delete('/api/google-auth/", a: "api.delete('/api/google-auth/" }, // déjà bon
  
  // Hooks useGmailService - messages
  { fichier: 'src/hooks/useGmailService.ts', de: "fetch(`${window.location.origin}/api/gmail/", a: "fetch(`${window.location.origin}/api/gmail/" }, // déjà bon
  
  // FormulairePage - blocks 
  { fichier: 'src/pages/FormulairePage.tsx', de: "api.get('/api/blocks", a: "api.get('/api/blocks" }, // déjà bon
  
  // Correctifs pour utils et optimizations
  { fichier: 'src/utils/roleOptimizations.ts', de: "api.get('/roles/", a: "api.get('/api/roles/" },
  { fichier: 'src/utils/organizationOptimizations.ts', de: "api.get('/modules?", a: "api.get('/api/modules?" },
  { fichier: 'src/utils/userOptimizations.ts', de: "api.get('/users/", a: "api.get('/api/users/" }
];

let totalCorrections = 0;
let fichiersModifies = 0;

// Appliquer les corrections
for (const { fichier, de, a } of correctionsCritiques) {
  const cheminComplet = path.join(process.cwd(), fichier);
  
  if (fs.existsSync(cheminComplet)) {
    try {
      const contenu = fs.readFileSync(cheminComplet, 'utf8');
      
      if (contenu.includes(de)) {
        const nouveauContenu = contenu.replaceAll(de, a);
        fs.writeFileSync(cheminComplet, nouveauContenu, 'utf8');
        
        const nbCorrections = (contenu.match(new RegExp(de.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        
        console.log(`✅ ${fichier} → ${nbCorrections} correction(s)`);
        console.log(`   ${de} → ${a}`);
        
        fichiersModifies++;
        totalCorrections += nbCorrections;
      }
    } catch (error) {
      console.error(`❌ Erreur ${fichier}:`, error.message);
    }
  } else {
    console.log(`⚠️  Fichier non trouvé: ${fichier}`);
  }
}

console.log('\n' + '='.repeat(55));
console.log(`🎉 CORRECTION CRITIQUE TERMINÉE !`);
console.log(`📄 Fichiers modifiés: ${fichiersModifies}`);
console.log(`🔧 Total corrections: ${totalCorrections}`);

// Vérifier quelques routes critiques restantes
console.log('\n🔍 VÉRIFICATION DES ROUTES CRITIQUES:');

const routesAVerifier = [
  { fichier: 'src/pages/TelnyxPage.tsx', recherche: "'/telnyx/" },
  { fichier: 'src/pages/GoogleAgendaPage.tsx', recherche: "'/calendar/" },
  { fichier: 'src/pages/GoogleMeetPage.tsx', recherche: "'/google-meet/" },
  { fichier: 'src/pages/AnalyticsPage.tsx', recherche: "'/analytics/" }
];

for (const { fichier, recherche } of routesAVerifier) {
  const cheminComplet = path.join(process.cwd(), fichier);
  
  if (fs.existsSync(cheminComplet)) {
    const contenu = fs.readFileSync(cheminComplet, 'utf8');
    const matches = contenu.match(new RegExp(recherche.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
    
    if (matches) {
      console.log(`❌ ${fichier} : ${matches.length} route(s) sans /api/ trouvée(s)`);
    } else {
      console.log(`✅ ${fichier} : toutes les routes ont /api/`);
    }
  }
}

console.log('\n🚀 PROCHAINES ÉTAPES:');
console.log('1. Redémarrer le serveur avec: npm run dev');
console.log('2. Tester les modules Telnyx, Calendar, Google Meet');
console.log('3. Vérifier les logs de la console navigateur');

console.log('\n' + '='.repeat(55));
