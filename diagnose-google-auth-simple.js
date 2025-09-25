import { PrismaClient } from '@prisma/client';
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
      
      // État des tokens
      console.log(`      - Access Token: ${token.accessToken ? '✅ Présent' : '❌ Manquant'}`);
      console.log(`      - Refresh Token: ${token.refreshToken ? '✅ Présent' : '❌ MANQUANT'}`);
    }

    // Vérifier les configurations Google Workspace
    console.log('\n4️⃣ Vérification des configurations OAuth...');
    const googleConfigs = await prisma.googleWorkspaceConfig.findMany();
    console.log(`   - Configurations OAuth en base: ${googleConfigs.length}`);
    
    for (const config of googleConfigs) {
      console.log(`\n   🔧 Configuration ${config.organizationId}:`);
      console.log(`      - Client ID: ${config.clientId ? '✅ Présent' : '❌ Manquant'}`);
      console.log(`      - Client Secret: ${config.clientSecret ? '✅ Présent' : '❌ Manquant'}`);
      console.log(`      - Redirect URI: ${config.redirectUri || '❌ Manquant'}`);
    }

    console.log('\n5️⃣ Analyse des problèmes potentiels...');
    
    // Analyser chaque organisation
    for (const token of googleTokens) {
      console.log(`\n   🔍 Analyse organisation ${token.organizationId}:`);
      
      const config = googleConfigs.find(c => c.organizationId === token.organizationId);
      
      if (!config) {
        console.log('      ❌ PROBLÈME: Configuration OAuth manquante');
        continue;
      }
      
      if (!token.refreshToken) {
        console.log('      ❌ PROBLÈME CRITIQUE: Refresh token manquant - Reconnexion obligatoire');
        continue;
      }
      
      if (token.expiresAt && token.expiresAt <= new Date()) {
        console.log('      ⚠️ PROBLÈME: Token expiré - Refresh nécessaire');
      }
      
      if (!token.expiresAt) {
        console.log('      ⚠️ ATTENTION: Pas de date d\'expiration définie');
      }
      
      console.log('      ✅ Configuration semble correcte');
    }

    console.log('\n6️⃣ Recommandations...');
    
    if (!process.env.ENCRYPTION_KEY) {
      console.log('   🚨 CRITIQUE: Ajouter ENCRYPTION_KEY dans .env');
    }
    
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.log('   🚨 CRITIQUE: Vérifier GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET dans .env');
    }
    
    const tokensWithoutRefresh = googleTokens.filter(t => !t.refreshToken);
    if (tokensWithoutRefresh.length > 0) {
      console.log(`   🚨 URGENT: ${tokensWithoutRefresh.length} organisation(s) sans refresh token - Reconnexion nécessaire`);
      tokensWithoutRefresh.forEach(t => {
        console.log(`      - Organisation: ${t.organizationId}`);
      });
    }
    
    const expiredTokens = googleTokens.filter(t => t.expiresAt && t.expiresAt <= new Date());
    if (expiredTokens.length > 0) {
      console.log(`   ⚠️ ${expiredTokens.length} token(s) expiré(s) - Refresh automatique devrait fonctionner`);
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n🎯 === FIN DU DIAGNOSTIC ===');
}

diagnoseGoogleAuth().catch(console.error);