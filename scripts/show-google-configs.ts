#!/usr/bin/env tsx
/**
 * 📋 SCRIPT DE DIAGNOSTIC - Configuration Google OAuth
 * 
 * Affiche toutes les configurations Google Workspace en BDD
 */

import 'dotenv/config';
import { db } from '../src/lib/database';

async function main() {
  console.log('📋 Toutes les configurations Google Workspace:\n');

  const configs = await db.googleWorkspaceConfig.findMany({
    select: {
      id: true,
      organizationId: true,
      domain: true,
      adminEmail: true,
      redirectUri: true,
      isActive: true,
      Organization: {
        select: {
          name: true
        }
      }
    }
  });

  if (configs.length === 0) {
    console.log('❌ Aucune configuration trouvée');
    await db.$disconnect();
    return;
  }

  configs.forEach((config, index) => {
    console.log(`Configuration #${index + 1}:`);
    console.log(`  Organization: ${config.Organization?.name} (${config.organizationId})`);
    console.log(`  Domain: ${config.domain || 'N/A'}`);
    console.log(`  Admin Email: ${config.adminEmail || 'N/A'}`);
    console.log(`  Redirect URI: ${config.redirectUri || 'NON DÉFINI ⚠️'}`);
    console.log(`  Is Active: ${config.isActive}`);
    console.log('');
  });

  console.log('🎯 Pour corriger le redirectUri:');
  console.log('  npx tsx scripts/fix-redirecturi-prod.ts <organizationId>');

  await db.$disconnect();
}

main().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});
