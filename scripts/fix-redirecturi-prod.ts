#!/usr/bin/env tsx
/**
 * 🔧 SCRIPT DE CORRECTION - Google OAuth redirectUri
 * 
 * Ce script met à jour le redirectUri dans googleWorkspaceConfig
 * pour correspondre à celui configuré dans Google Cloud Console.
 * 
 * Usage:
 *   npx tsx scripts/fix-redirecturi-prod.ts <organizationId>
 * 
 * Exemple:
 *   npx tsx scripts/fix-redirecturi-prod.ts org-2thier-1766916379383
 */

import 'dotenv/config';
import { db } from '../src/lib/database';

const CORRECT_REDIRECT_URI = 'https://app.2thier.be/api/google-auth/callback';

async function main() {
  const orgId = process.argv[2];
  
  if (!orgId) {
    console.error('❌ Usage: npx tsx scripts/fix-redirecturi-prod.ts <organizationId>');
    console.error('');
    console.error('Pour trouver l\'organizationId:');
    console.error('  SELECT id, name FROM "Organization";');
    process.exit(1);
  }

  console.log('🔍 Vérification de la configuration...\n');

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
    console.error(`❌ Aucune configuration trouvée pour l'organisation: ${orgId}`);
    console.error('');
    console.error('Organisations disponibles:');
    const orgs = await db.organization.findMany({ select: { id: true, name: true } });
    orgs.forEach(o => console.log(`  - ${o.id} (${o.name})`));
    await db.$disconnect();
    process.exit(1);
  }

  console.log('📋 Configuration actuelle:');
  console.log(`  Organization ID: ${config.organizationId}`);
  console.log(`  Admin Email: ${config.adminEmail || 'N/A'}`);
  console.log(`  Is Active: ${config.isActive}`);
  console.log(`  Redirect URI actuel: ${config.redirectUri || 'NON DÉFINI'}`);
  console.log('');

  if (config.redirectUri === CORRECT_REDIRECT_URI) {
    console.log('✅ Le redirectUri est déjà correct !');
    console.log(`   URI: ${CORRECT_REDIRECT_URI}`);
    await db.$disconnect();
    return;
  }

  console.log('⚠️  Le redirectUri est INCORRECT !');
  console.log(`   Actuel:  ${config.redirectUri || 'NON DÉFINI'}`);
  console.log(`   Correct: ${CORRECT_REDIRECT_URI}`);
  console.log('');
  console.log('🔧 Correction en cours...');

  // Mettre à jour
  const updated = await db.googleWorkspaceConfig.update({
    where: { organizationId: orgId },
    data: { redirectUri: CORRECT_REDIRECT_URI },
    select: { redirectUri: true }
  });

  console.log('');
  console.log('✅ Correction appliquée avec succès !');
  console.log(`   Nouveau redirectUri: ${updated.redirectUri}`);
  console.log('');
  console.log('🎯 Prochaines étapes:');
  console.log('   1. Vérifier que ce même URI est autorisé dans Google Cloud Console');
  console.log('   2. Essayer de se connecter à nouveau');
  console.log('');
  console.log('📝 Google Cloud Console:');
  console.log('   https://console.cloud.google.com/apis/credentials');
  console.log('   → OAuth 2.0 Client IDs → Votre client');
  console.log('   → URIs de redirection autorisés:');
  console.log(`   → ${CORRECT_REDIRECT_URI} ✅`);

  await db.$disconnect();
}

main().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});
