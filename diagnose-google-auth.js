import { PrismaClient } from '@prisma/client';
import { decrypt, encrypt } from './src/utils/crypto.js';
import { google } from 'googleapis';

const prisma = new PrismaClient();

async function diagnoseGoogleAuth() {
  console.log('🔍 === DIAGNOSTIC GOOGLE AUTHENTICATION ===\n');

  try {
    console.log('1️⃣ Vérification des variables d\'environnement...');
    console.log('   - ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY ? '✅ Définie' : '❌ Manquante');
    console.log('   - GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Définie' : '❌ Manquante');
    console.log('   - GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Définie' : '❌ Manquante');
    console.log('   - GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI ? '✅ Définie' : '❌ Manquante');

    console.log('\n2️⃣ Test de chiffrement/déchiffrement...');
    try {
      const testString = 'test_google_token_12345';
      const encrypted = encrypt(testString);
      const decrypted = decrypt(encrypted);
      console.log('   - Chiffrement:', encrypted ? '✅ OK' : '❌ Erreur');
      console.log('   - Déchiffrement:', decrypted === testString ? '✅ OK' : '❌ Erreur');
    } catch (error) {
      console.log('   - Erreur:', '❌', error.message);
    }

    console.log('\n3️⃣ Vérification de la base de données...');
    
    // Vérifier les tokens Google
    const googleTokens = await prisma.googleToken.findMany();
    console.log(`   - Tokens Google en base: ${googleTokens.length}`);
    
    for (const token of googleTokens) {
      console.log(`\n   📊 Organisation ${token.organizationId}:`);
      console.log(`      - Créé le: ${token.createdAt}`);
      console.log(`      - Expire le: ${token.expiresAt || 'Pas de date'}`);
      console.log(`      - Dernière MAJ: ${token.updatedAt}`);
      
      // Calculer l'état d'expiration
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
      
      if (token.expiresAt) {
        const isExpired = token.expiresAt <= now;
        const isExpiringSoon = token.expiresAt <= fiveMinutesFromNow;
        
        console.log(`      - État: ${isExpired ? '❌ EXPIRÉ' : isExpiringSoon ? '⚠️ EXPIRE BIENTÔT' : '✅ VALIDE'}`);
      } else {
        console.log(`      - État: ⚠️ PAS DE DATE D'EXPIRATION`);
      }
      
      // Tester le déchiffrement des tokens
      try {
        const accessToken = decrypt(token.accessToken);
        console.log(`      - Access Token: ${accessToken ? '✅ Déchiffrable' : '❌ Erreur'}`);
        
        if (token.refreshToken) {
          const refreshToken = decrypt(token.refreshToken);
          console.log(`      - Refresh Token: ${refreshToken ? '✅ Déchiffrable' : '❌ Erreur'}`);
        } else {
          console.log(`      - Refresh Token: ❌ MANQUANT`);
        }
      } catch (error) {
        console.log(`      - Erreur déchiffrement: ❌ ${error.message}`);
      }
    }

    // Vérifier les configurations Google Workspace
    console.log('\n4️⃣ Vérification des configurations OAuth...');
    const googleConfigs = await prisma.googleWorkspaceConfig.findMany();
    console.log(`   - Configurations OAuth en base: ${googleConfigs.length}`);
    
    for (const config of googleConfigs) {
      console.log(`\n   🔧 Configuration ${config.organizationId}:`);
      try {
        const clientId = decrypt(config.clientId);
        const clientSecret = decrypt(config.clientSecret);
        console.log(`      - Client ID: ${clientId ? '✅ Déchiffrable' : '❌ Erreur'}`);
        console.log(`      - Client Secret: ${clientSecret ? '✅ Déchiffrable' : '❌ Erreur'}`);
        console.log(`      - Redirect URI: ${config.redirectUri || '❌ Manquant'}`);
      } catch (error) {
        console.log(`      - Erreur déchiffrement config: ❌ ${error.message}`);
      }
    }

    console.log('\n5️⃣ Test de refresh avec Google API...');
    for (const token of googleTokens) {
      if (!token.refreshToken) continue;
      
      console.log(`\n   🔄 Test refresh pour organisation ${token.organizationId}:`);
      
      try {
        const config = googleConfigs.find(c => c.organizationId === token.organizationId);
        if (!config) {
          console.log('      ❌ Configuration OAuth manquante');
          continue;
        }

        const oauth2Client = new google.auth.OAuth2(
          decrypt(config.clientId),
          decrypt(config.clientSecret),
          config.redirectUri
        );

        oauth2Client.setCredentials({
          refresh_token: decrypt(token.refreshToken)
        });

        const { credentials } = await oauth2Client.refreshAccessToken();
        console.log('      ✅ Refresh réussi');
        console.log(`      - Nouveau token expire: ${new Date(credentials.expiry_date || 0)}`);
        
      } catch (error) {
        console.log(`      ❌ Erreur refresh: ${error.message}`);
        
        if (error.message.includes('invalid_grant')) {
          console.log('      🚨 REFRESH TOKEN RÉVOQUÉ - Reconnexion nécessaire');
        } else if (error.message.includes('invalid_client')) {
          console.log('      🚨 CONFIGURATION OAUTH INVALIDE');
        }
      }
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n🎯 === FIN DU DIAGNOSTIC ===');
}

diagnoseGoogleAuth().catch(console.error);