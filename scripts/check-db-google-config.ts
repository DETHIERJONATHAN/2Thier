#!/usr/bin/env tsx
import 'dotenv/config';
import { db } from '../src/lib/database';

async function main() {
  console.log('📋 Vérification de la configuration Google Workspace en BDD...\n');
  
  try {
    const configs = await db.googleWorkspaceConfig.findMany({
      select: {
        id: true,
        organizationId: true,
        domain: true,
        adminEmail: true,
        redirectUri: true,
        isActive: true,
        clientId: true,
        clientSecret: true
      }
    });

    if (configs.length === 0) {
      console.log('❌ Aucune configuration Google Workspace trouvée en BDD');
    } else {
      console.log(`✅ ${configs.length} configuration(s) trouvée(s):\n`);
      configs.forEach((config, index) => {
        console.log(`Config #${index + 1}:`);
        console.log(`  ID: ${config.id}`);
        console.log(`  Organization ID: ${config.organizationId}`);
        console.log(`  Domain: ${config.domain || 'N/A'}`);
        console.log(`  Admin Email: ${config.adminEmail || 'N/A'}`);
        console.log(`  Redirect URI: ${config.redirectUri || 'N/A'}`);
        console.log(`  Is Active: ${config.isActive}`);
        console.log(`  Has Client ID: ${!!config.clientId}`);
        console.log(`  Has Client Secret: ${!!config.clientSecret}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await db.$disconnect();
  }
}

main();
