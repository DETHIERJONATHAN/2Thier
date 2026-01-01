#!/usr/bin/env tsx
import 'dotenv/config';
import { db } from '../src/lib/database';
import { decrypt } from '../src/utils/crypto';

async function main() {
  console.log('🔍 Vérification du Client ID en BDD (décrypté)...\n');
  
  try {
    const config = await db.googleWorkspaceConfig.findFirst({
      where: {
        organizationId: '1757366075154-i554z93kl'
      }
    });

    if (!config) {
      console.log('❌ Aucune configuration trouvée');
      return;
    }

    console.log('📋 Configuration trouvée:');
    console.log('  Organization ID:', config.organizationId);
    console.log('  Domain:', config.domain);
    console.log('  Admin Email:', config.adminEmail);
    console.log('  Redirect URI:', config.redirectUri);
    console.log('  Is Active:', config.isActive);
    console.log('');
    
    if (config.clientId) {
      const decryptedClientId = decrypt(config.clientId);
      console.log('🔑 Client ID (décrypté):', decryptedClientId);
    } else {
      console.log('❌ Pas de Client ID en BDD');
    }
    
    if (config.clientSecret) {
      const decryptedSecret = decrypt(config.clientSecret);
      console.log('🔐 Client Secret (décrypté):', decryptedSecret.substring(0, 20) + '...');
    } else {
      console.log('❌ Pas de Client Secret en BDD');
    }

    console.log('');
    console.log('📄 Client ID dans .env:', process.env.GOOGLE_CLIENT_ID);
    console.log('');
    
    if (config.clientId && process.env.GOOGLE_CLIENT_ID) {
      const decryptedClientId = decrypt(config.clientId);
      if (decryptedClientId === process.env.GOOGLE_CLIENT_ID) {
        console.log('✅ Les Client IDs correspondent !');
      } else {
        console.log('❌ PROBLÈME: Les Client IDs sont DIFFÉRENTS !');
        console.log('   BDD     :', decryptedClientId);
        console.log('   .env    :', process.env.GOOGLE_CLIENT_ID);
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await db.$disconnect();
  }
}

main();
