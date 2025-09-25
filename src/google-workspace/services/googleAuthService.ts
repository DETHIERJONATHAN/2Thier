import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../../lib/prisma.js';
import { decrypt } from '../../utils/crypto.js';
import { refreshGoogleTokenIfNeeded } from '../../utils/googleTokenRefresh.js';

export const getGmailClient = async (organizationId: string): Promise<any | null> => {
    try {
        console.log('[getGmailClient] 🔍 Demande de client Gmail pour org:', organizationId);
        
        // 1. Utiliser le système de rafraîchissement automatique intégré
        const refreshResult = await refreshGoogleTokenIfNeeded(organizationId);
        
        if (!refreshResult.success) {
            console.error('[getGmailClient] ❌ Impossible de rafraîchir le token:', refreshResult.error);
            return null;
        }
        
        console.log('[getGmailClient] ✅ Token valide obtenu');

        // 2. Récupérer les configuration OAuth pour cette organisation
        const googleConfig = await prisma.googleWorkspaceConfig.findUnique({
            where: { organizationId }
        });

        if (!googleConfig || !googleConfig.clientId || !googleConfig.clientSecret) {
            console.error('[getGmailClient] ❌ Configuration OAuth manquante');
            return null;
        }

        // 3. Créer le client OAuth avec la configuration déchiffrée
        const client = new OAuth2Client(
            decrypt(googleConfig.clientId),
            decrypt(googleConfig.clientSecret),
            googleConfig.redirectUri
        );

        // 4. Configurer les credentials avec les tokens valides
        client.setCredentials({
            access_token: refreshResult.accessToken,
            refresh_token: refreshResult.refreshToken,
            expiry_date: refreshResult.expiresAt ? refreshResult.expiresAt.getTime() : null,
        });

        console.log('[getGmailClient] 📧 Client Gmail configuré avec succès');
        return google.gmail({ version: 'v1', auth: client });

    } catch (error) {
        console.error('[getGmailClient] ❌ Erreur:', error);
        return null;
    }
};

export const getGmailMessageDetails = async (organizationId: string, messageId: string): Promise<any | null> => {
    try {
        console.log('[getGmailMessageDetails] 📨 Récupération message:', messageId);
        
        const gmail = await getGmailClient(organizationId);
        if (!gmail) {
            console.error('[getGmailMessageDetails] ❌ Impossible d\'initialiser le client Gmail');
            return null;
        }

        const response = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'full', // 'full' pour avoir le corps, les en-têtes, etc.
        });

        console.log('[getGmailMessageDetails] ✅ Message récupéré avec succès');
        return response.data;
    } catch (error) {
        console.error(`[getGmailMessageDetails] ❌ Erreur lors de la récupération du message ${messageId}:`, error);
        return null;
    }
}

export default {};
