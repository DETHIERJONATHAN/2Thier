const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION AUTOMATIQUE DES ROUTES API DANS LE FRONTEND');
console.log('='.repeat(65));

// Définir les corrections nécessaires
const corrections = [
  // Authentification
  { recherche: "api.get('/auth/", remplacement: "api.get('/api/auth/" },
  { recherche: "api.post('/auth/", remplacement: "api.post('/api/auth/" },
  { recherche: "api.get('/me')", remplacement: "api.get('/api/me')" },
  { recherche: "api.post('/logout')", remplacement: "api.post('/api/logout')" },
  { recherche: "api.post('/register')", remplacement: "api.post('/api/register')" },
  
  // Organisations
  { recherche: "api.get('/organizations", remplacement: "api.get('/api/organizations" },
  { recherche: "api.post('/organizations", remplacement: "api.post('/api/organizations" },
  { recherche: "api.put('/organizations", remplacement: "api.put('/api/organizations" },
  { recherche: "api.delete('/organizations", remplacement: "api.delete('/api/organizations" },
  
  // Modules
  { recherche: "api.get('/modules", remplacement: "api.get('/api/modules" },
  { recherche: "api.post('/modules", remplacement: "api.post('/api/modules" },
  { recherche: "api.put('/modules", remplacement: "api.put('/api/modules" },
  { recherche: "api.delete('/modules", remplacement: "api.delete('/api/modules" },
  
  // Leads  
  { recherche: "api.get('/leads", remplacement: "api.get('/api/leads" },
  { recherche: "api.post('/leads", remplacement: "api.post('/api/leads" },
  { recherche: "api.put('/leads", remplacement: "api.put('/api/leads" },
  { recherche: "api.patch('/leads", remplacement: "api.patch('/api/leads" },
  { recherche: "api.delete('/leads", remplacement: "api.delete('/api/leads" },
  
  // Clients (déjà bon avec /api/)
  { recherche: "api.get('/clients')", remplacement: "api.get('/api/clients')" },
  { recherche: "api.post('/clients')", remplacement: "api.post('/api/clients')" },
  
  // Projets (déjà bon avec /api/)
  { recherche: "api.get('/projects')", remplacement: "api.get('/api/projects')" },
  { recherche: "api.post('/projects')", remplacement: "api.post('/api/projects')" },
  
  // Emails (déjà bon avec /api/)
  { recherche: "api.get('/emails", remplacement: "api.get('/api/emails" },
  { recherche: "api.post('/emails", remplacement: "api.post('/api/emails" },
  
  // Gmail
  { recherche: "api.get('/gmail/", remplacement: "api.get('/api/gmail/" },
  { recherche: "api.post('/gmail/", remplacement: "api.post('/api/gmail/" },
  { recherche: "api.delete('/gmail/", remplacement: "api.delete('/api/gmail/" },
  
  // Google Auth
  { recherche: "api.get('/google-auth/", remplacement: "api.get('/api/google-auth/" },
  { recherche: "api.post('/google-auth/", remplacement: "api.post('/api/google-auth/" },
  { recherche: "api.get('/auto-google-auth/", remplacement: "api.get('/api/auto-google-auth/" },
  { recherche: "api.post('/auto-google-auth/", remplacement: "api.post('/api/auto-google-auth/" },
  
  // Calendar (corriger les doubles /api/api/)
  { recherche: "api.get('/calendar/", remplacement: "api.get('/api/calendar/" },
  { recherche: "api.post('/calendar/", remplacement: "api.post('/api/calendar/" },
  { recherche: "api.put('/calendar/", remplacement: "api.put('/api/calendar/" },
  { recherche: "api.delete('/calendar/", remplacement: "api.delete('/api/calendar/" },
  
  // Telnyx
  { recherche: "api.get('/telnyx/", remplacement: "api.get('/api/telnyx/" },
  { recherche: "api.post('/telnyx/", remplacement: "api.post('/api/telnyx/" },
  { recherche: "api.put('/telnyx/", remplacement: "api.put('/api/telnyx/" },
  { recherche: "api.delete('/telnyx/", remplacement: "api.delete('/api/telnyx/" },
  
  // Gemini
  { recherche: "api.get('/gemini/", remplacement: "api.get('/api/gemini/" },
  { recherche: "api.post('/gemini/", remplacement: "api.post('/api/gemini/" },
  
  // Utilisateurs
  { recherche: "api.get('/users", remplacement: "api.get('/api/users" },
  { recherche: "api.post('/users", remplacement: "api.post('/api/users" },
  { recherche: "api.put('/users", remplacement: "api.put('/api/users" },
  { recherche: "api.delete('/users", remplacement: "api.delete('/api/users" },
  
  // Rôles
  { recherche: "api.get('/roles", remplacement: "api.get('/api/roles" },
  { recherche: "api.post('/roles", remplacement: "api.post('/api/roles" },
  { recherche: "api.put('/roles", remplacement: "api.put('/api/roles" },
  { recherche: "api.delete('/roles", remplacement: "api.delete('/api/roles" },
  
  // Permissions
  { recherche: "api.get('/permissions", remplacement: "api.get('/api/permissions" },
  { recherche: "api.post('/permissions", remplacement: "api.post('/api/permissions" },
  { recherche: "api.put('/permissions", remplacement: "api.put('/api/permissions" },
  { recherche: "api.delete('/permissions", remplacement: "api.delete('/api/permissions" },
  
  // Blocs (corriger les appels sans /api/)
  { recherche: "api.get('/blocks", remplacement: "api.get('/api/blocks" },
  { recherche: "api.post('/blocks", remplacement: "api.post('/api/blocks" },
  { recherche: "api.put('/blocks", remplacement: "api.put('/api/blocks" },
  { recherche: "api.delete('/blocks", remplacement: "api.delete('/api/blocks" },
  
  // Notifications
  { recherche: "api.get('/notifications", remplacement: "api.get('/api/notifications" },
  { recherche: "api.post('/notifications", remplacement: "api.post('/api/notifications" },
  { recherche: "api.patch('/notifications", remplacement: "api.patch('/api/notifications" },
  { recherche: "api.delete('/notifications", remplacement: "api.delete('/api/notifications" },
  
  // Settings
  { recherche: "api.get('/settings", remplacement: "api.get('/api/settings" },
  { recherche: "api.post('/settings", remplacement: "api.post('/api/settings" },
  { recherche: "api.put('/settings", remplacement: "api.put('/api/settings" },
  { recherche: "api.delete('/settings", remplacement: "api.delete('/api/settings" },
  
  // Profile
  { recherche: "api.get('/profile", remplacement: "api.get('/api/profile" },
  { recherche: "api.post('/profile", remplacement: "api.post('/api/profile" },
  { recherche: "api.put('/profile", remplacement: "api.put('/api/profile" },
  
  // Analytics
  { recherche: "api.get('/analytics/", remplacement: "api.get('/api/analytics/" },
  { recherche: "api.post('/analytics/", remplacement: "api.post('/api/analytics/" },
  
  // Google Services → Routes spécifiques
  { recherche: "api.get('/drive/files", remplacement: "api.get('/api/google-drive/files" },
  { recherche: "api.post('/drive/files", remplacement: "api.post('/api/google-drive/files" },
  { recherche: "api.delete('/drive/files", remplacement: "api.delete('/api/google-drive/files" },
  
  { recherche: "api.get('/google-meet/", remplacement: "api.get('/api/google-meet/" },
  { recherche: "api.post('/google-meet/", remplacement: "api.post('/api/google-meet/" },
  { recherche: "api.delete('/google-meet/", remplacement: "api.delete('/api/google-meet/" },
  
  // Mail services
  { recherche: "api.get('/mail/", remplacement: "api.get('/api/mail/" },
  { recherche: "api.post('/mail/", remplacement: "api.post('/api/mail/" },
  { recherche: "api.patch('/mail/", remplacement: "api.patch('/api/mail/" },
  { recherche: "api.delete('/mail/", remplacement: "api.delete('/api/mail/" },
  
  // Email accounts
  { recherche: "api.get('/email-accounts", remplacement: "api.get('/api/email-accounts" },
  { recherche: "api.post('/email-accounts", remplacement: "api.post('/api/email-accounts" },
  
  // Admin password
  { recherche: "api.get('/admin-password/", remplacement: "api.get('/api/admin-password/" },
  { recherche: "api.post('/admin-password/", remplacement: "api.post('/api/admin-password/" },
  
  // Corriger les doubles /api/api/ qui pourraient être créés
  { recherche: "'/api/api/", remplacement: "'/api/" }
];

// Fonction pour parcourir récursivement les dossiers
function parcourirDossier(dossier, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const fichiers = [];
  
  function lire(chemin) {
    const items = fs.readdirSync(chemin);
    
    for (const item of items) {
      const cheminComplet = path.join(chemin, item);
      const stats = fs.statSync(cheminComplet);
      
      if (stats.isDirectory()) {
        // Ignorer node_modules et autres dossiers inutiles
        if (!['node_modules', '.git', 'build', 'dist', '.next'].includes(item)) {
          lire(cheminComplet);
        }
      } else if (extensions.some(ext => item.endsWith(ext))) {
        fichiers.push(cheminComplet);
      }
    }
  }
  
  lire(dossier);
  return fichiers;
}

// Obtenir tous les fichiers TypeScript/JavaScript du frontend
const fichiersATraiter = parcourirDossier('./src');

console.log(`📁 ${fichiersATraiter.length} fichiers trouvés à analyser`);

let totalCorrections = 0;
let fichiersModifies = 0;

// Traiter chaque fichier
for (const fichier of fichiersATraiter) {
  try {
    const contenu = fs.readFileSync(fichier, 'utf8');
    let nouveauContenu = contenu;
    let correctionsManquantes = 0;
    
    // Appliquer toutes les corrections
    for (const { recherche, remplacement } of corrections) {
      // Échapper les caractères spéciaux pour créer une regex valide
      const rechercheEchappee = recherche.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      try {
        const regex = new RegExp(rechercheEchappee, 'g');
        const matches = nouveauContenu.match(regex);
        
        if (matches) {
          nouveauContenu = nouveauContenu.replace(regex, remplacement);
          correctionsManquantes += matches.length;
        }
      } catch (error) {
        // Si la regex est invalide, essayer une recherche simple
        if (nouveauContenu.includes(recherche)) {
          nouveauContenu = nouveauContenu.replaceAll(recherche, remplacement);
          correctionsManquantes++;
        }
      }
    }
    
    // Si des corrections ont été appliquées, sauvegarder le fichier
    if (correctionsManquantes > 0) {
      fs.writeFileSync(fichier, nouveauContenu, 'utf8');
      console.log(`✅ ${path.relative('.', fichier)} → ${correctionsManquantes} correction(s)`);
      fichiersModifies++;
      totalCorrections += correctionsManquantes;
    }
    
  } catch (error) {
    console.error(`❌ Erreur lors du traitement de ${fichier}:`, error.message);
  }
}

console.log('\n' + '='.repeat(65));
console.log(`🎉 CORRECTION TERMINÉE !`);
console.log(`📄 Fichiers modifiés: ${fichiersModifies}`);
console.log(`🔧 Total corrections: ${totalCorrections}`);

if (totalCorrections > 0) {
  console.log('\n🚀 ACTIONS SUIVANTES:');
  console.log('1. Redémarrer le serveur de développement');
  console.log('2. Vérifier que les appels API fonctionnent maintenant');
  console.log('3. Tester les modules critiques (Telnyx, Google Calendar, etc.)');
  
  console.log('\n💡 COMMANDES DE TEST:');
  console.log('npm run dev  # Redémarrer le serveur');
  console.log('# Puis tester les fonctionnalités dans le navigateur');
} else {
  console.log('\n✅ Aucune correction nécessaire - toutes les routes sont déjà correctes !');
}

console.log('\n' + '='.repeat(65));
