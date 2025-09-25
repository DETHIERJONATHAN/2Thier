import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function refreshGoogleToken() {
  try {
    // Récupérer le token expiré
    const expiredToken = await prisma.googleToken.findFirst();
    
    if (!expiredToken) {
      console.log('❌ Aucun token trouvé en base');
      return;
    }

    console.log('🔍 Token trouvé pour l\'organisation:', expiredToken.organizationId);
    console.log('⏰ Expire le:', expiredToken.expiresAt);
    console.log('🔄 Tentative de renouvellement...');

    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    client.setCredentials({
      access_token: expiredToken.accessToken,
      refresh_token: expiredToken.refreshToken,
      expiry_date: expiredToken.expiresAt ? new Date(expiredToken.expiresAt).getTime() : null,
    });

    // Forcer le renouvellement
    const { credentials } = await client.refreshAccessToken();
    
    console.log('✅ Token renouvelé avec succès !');
    console.log('🔧 Mise à jour en base de données...');

    // Mettre à jour en base
    await prisma.googleToken.update({
      where: { id: expiredToken.id },
      data: {
        accessToken: credentials.access_token || expiredToken.accessToken,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        refreshToken: credentials.refresh_token || expiredToken.refreshToken,
        updatedAt: new Date()
      }
    });

    console.log('🎉 Token mis à jour en base !');
    console.log('🕐 Nouvelle expiration:', credentials.expiry_date ? new Date(credentials.expiry_date) : 'Inconnue');

  } catch (error) {
    console.error('❌ Erreur lors du renouvellement:', error);
    console.log('');
    console.log('💡 Solutions possibles:');
    console.log('1. Reconnecter Google OAuth depuis l\'interface du CRM');
    console.log('2. Vérifier les variables d\'environnement GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET');
    console.log('3. Régénérer les tokens depuis Google Cloud Console');
  } finally {
    await prisma.$disconnect();
  }
}

refreshGoogleToken();
