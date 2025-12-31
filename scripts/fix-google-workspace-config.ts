import { db } from '../src/lib/database';
import { encrypt } from '../src/utils/crypto';

/**
 * 🔧 Script pour configurer Google Workspace pour une organisation
 * 
 * Usage:
 *   npx tsx scripts/fix-google-workspace-config.ts [organizationId] [redirectUri]
 * 
 * Exemples:
 *   # Configuration automatique pour l'environnement actuel
 *   npx tsx scripts/fix-google-workspace-config.ts org-2thier-1766916379383
 * 
 *   # Avec redirectUri personnalisé
 *   npx tsx scripts/fix-google-workspace-config.ts org-2thier-1766916379383 https://app.2thier.be/auth/google/callback
 */

async function fixGoogleWorkspaceConfig() {
  // 📋 Récupération des arguments
  const organizationId = process.argv[2];
  let redirectUri = process.argv[3];
  
  if (!organizationId) {
    console.error('❌ Usage: npx tsx scripts/fix-google-workspace-config.ts <organizationId> [redirectUri]');
    console.error('');
    console.error('Exemples:');
    console.error('  npx tsx scripts/fix-google-workspace-config.ts org-2thier-1766916379383');
    console.error('  npx tsx scripts/fix-google-workspace-config.ts org-abc-123 https://app.example.com/auth/google/callback');
    process.exit(1);
  }
  
  // 🔍 Vérifier que l'organisation existe
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true }
  });
  
  if (!org) {
    console.error(`❌ Organisation "${organizationId}" introuvable dans la base de données`);
    process.exit(1);
  }
  
  console.log(`🏢 Organisation trouvée: ${org.name} (${org.id})`);
  
  // 🌍 Auto-détection du redirectUri si non fourni
  if (!redirectUri) {
    // Détecter l'environnement
    const codespaceHost = process.env.CODESPACE_NAME;
    const frontendUrl = process.env.FRONTEND_URL || process.env.VITE_APP_URL;
    
    if (codespaceHost) {
      // GitHub Codespaces
      redirectUri = `https://${codespaceHost}-5173.preview.app.github.dev/auth/google/callback`;
      console.log(`🚀 GitHub Codespaces détecté: ${redirectUri}`);
    } else if (frontendUrl) {
      redirectUri = `${frontendUrl}/auth/google/callback`;
      console.log(`🌐 Frontend URL détectée: ${redirectUri}`);
    } else if (process.env.NODE_ENV === 'production') {
      redirectUri = 'https://app.2thier.be/auth/google/callback';
      console.log(`🏭 Production détectée: ${redirectUri}`);
    } else {
      redirectUri = 'http://localhost:5173/auth/google/callback';
      console.log(`💻 Développement local: ${redirectUri}`);
    }
  }
  
  // 🔑 Récupération des credentials
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.error('❌ GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET manquant dans .env');
    console.error('');
    console.error('⚠️  Pour une configuration multi-tenant, vous devez:');
    console.error('   1. Créer un projet OAuth par organisation dans Google Cloud Console');
    console.error('   2. Ou utiliser les mêmes credentials globaux pour toutes les organisations');
    process.exit(1);
  }
  
  console.log('🔧 Mise à jour de la configuration Google Workspace...');
  
  // Vérifier si une config existe déjà
  const existingConfig = await db.googleWorkspaceConfig.findUnique({
    where: { organizationId }
  });
  
  if (existingConfig) {
    // Mise à jour
    const updated = await db.googleWorkspaceConfig.update({
      where: { organizationId },
      data: {
        clientId: encrypt(clientId),
        clientSecret: encrypt(clientSecret),
        redirectUri: redirectUri,
        enabled: true
      }
    });
    
    console.log('✅ Configuration Google Workspace mise à jour:');
    console.log(`   - Organization: ${org.name} (${org.id})`);
    console.log('   - clientId: OK (crypté)');
    console.log('   - clientSecret: OK (crypté)');
    console.log('   - redirectUri:', redirectUri);
    console.log('   - adminEmail:', updated.adminEmail);
    console.log('   - enabled:', updated.enabled);
  } else {
    // Création
    console.error(`❌ Aucune configuration Google Workspace trouvée pour ${organizationId}`);
    console.error('');
    console.error('💡 Vous devez d\'abord créer la configuration via l\'interface Super Admin');
    console.error('   ou créer manuellement l\'entrée dans la table GoogleWorkspaceConfig');
    process.exit(1);
  }
  
  console.log('');
  console.log('⚠️  IMPORTANT: N\'oubliez pas d\'ajouter ce redirectUri dans Google Cloud Console:');
  console.log(`   👉 ${redirectUri}`);
  console.log('');
  console.log('   1. Allez sur https://console.cloud.google.com/apis/credentials');
  console.log('   2. Sélectionnez votre OAuth 2.0 Client ID');
  console.log('   3. Ajoutez l\'URI de redirection autorisée ci-dessus');
}

fixGoogleWorkspaceConfig()
  .catch(console.error)
  .finally(() => process.exit(0));
