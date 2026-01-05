#!/usr/bin/env tsx
/**
 * 🔧 SCRIPT DE CORRECTION - Google OAuth redirectUri pour Codespaces
 * 
 * Ce script met à jour le redirectUri dans googleWorkspaceConfig
 * pour correspondre à l'URL du Codespace actuel.
 * 
 * Usage:
 *   npx tsx scripts/fix-redirecturi-codespaces.ts [organizationId]
 * 
 * Si aucun organizationId n'est fourni, liste les organisations disponibles.
 */

import 'dotenv/config';
import { db } from '../src/lib/database';

function getCodespacesRedirectUri(): string | null {
  const codespaceName = process.env.CODESPACE_NAME;
  if (!codespaceName) {
    return null;
  }
  // Le callback doit pointer vers le frontend (port 5173) qui proxie vers l'API
  // OU directement vers l'API (port 4000)
  // On utilise le port 4000 (backend direct) pour éviter les problèmes de proxy
  return `https://${codespaceName}-4000.app.github.dev/api/google-auth/callback`;
}

async function main() {
  const orgId = process.argv[2];
  
  const codespaceUri = getCodespacesRedirectUri();
  
  console.log('🔍 Détection de l\'environnement...');
  console.log(`   CODESPACE_NAME: ${process.env.CODESPACE_NAME || 'Non défini'}`);
  
  if (!codespaceUri) {
    console.log('');
    console.log('⚠️  Ce script est conçu pour GitHub Codespaces.');
    console.log('   Variable CODESPACE_NAME non trouvée.');
    console.log('');
    console.log('   Pour la production, utilisez: npx tsx scripts/fix-redirecturi-prod.ts');
    await db.$disconnect();
    process.exit(1);
  }
  
  console.log(`   Redirect URI cible: ${codespaceUri}`);
  console.log('');
  
  if (!orgId) {
    console.log('📋 Organisations disponibles:');
    const orgs = await db.organization.findMany({ 
      include: {
        GoogleWorkspaceConfig: {
          select: { redirectUri: true, adminEmail: true }
        }
      }
    });
    
    if (orgs.length === 0) {
      console.log('   Aucune organisation trouvée.');
    } else {
      for (const org of orgs) {
        const config = org.GoogleWorkspaceConfig;
        const uri = config?.redirectUri || 'NON CONFIGURÉ';
        const admin = config?.adminEmail || 'N/A';
        const needsUpdate = uri !== codespaceUri ? '⚠️' : '✅';
        console.log(`   ${needsUpdate} ${org.id}`);
        console.log(`      Nom: ${org.name}`);
        console.log(`      Admin: ${admin}`);
        console.log(`      URI: ${uri}`);
        console.log('');
      }
    }
    
    console.log('');
    console.log('Usage: npx tsx scripts/fix-redirecturi-codespaces.ts <organizationId>');
    await db.$disconnect();
    return;
  }

  // Récupérer la config actuelle
  const config = await db.googleWorkspaceConfig.findUnique({
    where: { organizationId: orgId },
    select: {
      id: true,
      organizationId: true,
      redirectUri: true,
      adminEmail: true,
      isActive: true
    }
  });

  if (!config) {
    console.error(`❌ Aucune configuration Google Workspace trouvée pour: ${orgId}`);
    await db.$disconnect();
    process.exit(1);
  }

  console.log('📋 Configuration actuelle:');
  console.log(`   Organization ID: ${config.organizationId}`);
  console.log(`   Admin Email: ${config.adminEmail || 'N/A'}`);
  console.log(`   Is Active: ${config.isActive}`);
  console.log(`   Redirect URI actuel: ${config.redirectUri || 'NON DÉFINI'}`);
  console.log('');

  if (config.redirectUri === codespaceUri) {
    console.log('✅ Le redirectUri est déjà correct pour ce Codespace !');
    await db.$disconnect();
    return;
  }

  console.log('🔧 Mise à jour du redirectUri...');
  console.log(`   Ancien: ${config.redirectUri || 'NON DÉFINI'}`);
  console.log(`   Nouveau: ${codespaceUri}`);

  const updated = await db.googleWorkspaceConfig.update({
    where: { organizationId: orgId },
    data: { redirectUri: codespaceUri },
    select: { redirectUri: true }
  });

  console.log('');
  console.log('✅ Mise à jour effectuée !');
  console.log(`   Nouveau redirectUri: ${updated.redirectUri}`);
  console.log('');
  console.log('⚠️  IMPORTANT: Vous devez également ajouter cette URI dans Google Cloud Console:');
  console.log('');
  console.log('   1. Allez sur: https://console.cloud.google.com/apis/credentials');
  console.log('   2. Sélectionnez votre projet OAuth');
  console.log('   3. Cliquez sur votre "OAuth 2.0 Client ID"');
  console.log('   4. Dans "URIs de redirection autorisés", ajoutez:');
  console.log(`      ${codespaceUri}`);
  console.log('   5. Enregistrez');
  console.log('');
  console.log('📝 Note: Les URIs Codespaces changent à chaque nouveau Codespace.');
  console.log('   Vous devrez répéter cette opération si le Codespace est recréé.');

  await db.$disconnect();
}

main().catch(async (error) => {
  console.error('❌ Erreur:', error);
  await db.$disconnect();
  process.exit(1);
});
