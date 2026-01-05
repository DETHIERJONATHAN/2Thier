/**
 * Système de refresh automatique des tokens Google - Version intégrée
 * Cette version évite les problèmes de compilation en intégrant directement le code
 */

import { google } from 'googleapis';
import { db } from '../lib/database.js';
import { decrypt } from './crypto.js';

export interface RefreshTokenResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  error?: string;
}

/**
 * Vérifie et rafraîchit automatiquement un token Google si nécessaire
 * @param organizationId L'ID de l'organisation
 * @param userId L'ID de l'utilisateur (requis pour la clé composite)
 */
export async function refreshGoogleTokenIfNeeded(organizationId: string, userId?: string): Promise<RefreshTokenResult> {
  try {
    console.log('[REFRESH-TOKEN] 🔍 Vérification token pour organisation:', organizationId, 'userId:', userId);

    // 1. Récupérer le token actuel
    let googleToken;
    
    if (userId) {
      // Nouveau modèle : clé composite userId + organizationId
      googleToken = await db.googleToken.findUnique({
        where: { 
          userId_organizationId: { userId, organizationId }
        }
      });
    } else {
      // Fallback legacy : chercher le premier token pour cette organisation
      console.log('[REFRESH-TOKEN] ⚠️ userId non fourni, fallback sur findFirst');
      googleToken = await db.googleToken.findFirst({
        where: { organizationId }
      });
    }

    if (!googleToken) {
      console.log('[REFRESH-TOKEN] ❌ Aucun token trouvé pour l\'organisation:', organizationId);
      return { success: false, error: 'no_token_found' };
    }

    console.log('[REFRESH-TOKEN] 📋 Token trouvé, expiration:', googleToken.expiresAt);

    // 2. Vérifier si le token est proche de l'expiration (dans les 30 prochaines minutes)
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
    const isExpiring = googleToken.expiresAt && googleToken.expiresAt <= thirtyMinutesFromNow;
    const isExpired = googleToken.expiresAt && googleToken.expiresAt <= now;

    console.log('[REFRESH-TOKEN] ⏰ Maintenant:', now.toISOString());
    console.log('[REFRESH-TOKEN] ⏰ Token expire le:', googleToken.expiresAt?.toISOString());
    console.log('[REFRESH-TOKEN] ⚠️ Token expirant bientôt (30min)?', isExpiring);
    console.log('[REFRESH-TOKEN] ❌ Token déjà expiré?', isExpired);

    console.log('[REFRESH-TOKEN] ⏰ État du token (délai 30min):');
    console.log('  - Expire le:', googleToken.expiresAt);
    console.log('  - Maintenant:', now);
    console.log('  - Expiré:', isExpired);
    console.log('  - Expire bientôt (30min):', isExpiring);

    // 3. Si le token n'est pas expiré et pas proche de l'expiration, on le retourne tel quel
    if (!isExpiring && !isExpired) {
      console.log('[REFRESH-TOKEN] ✅ Token encore valide (plus de 30min), pas de refresh nécessaire');
      return {
        success: true,
        accessToken: googleToken.accessToken,
        refreshToken: googleToken.refreshToken || undefined,
        expiresAt: googleToken.expiresAt
      };
    }

    // 4. Le token est expiré ou expire bientôt (moins de 30min), tentative de refresh
    if (!googleToken.refreshToken) {
      console.log('[REFRESH-TOKEN] ❌ Token expiré mais pas de refresh token disponible');
      return { success: false, error: 'no_refresh_token' };
    }

    console.log('[REFRESH-TOKEN] 🔄 Token expiré/expirant (moins de 30min), tentative de refresh...');

    // 5. Récupérer la configuration OAuth
    const googleConfig = await db.googleWorkspaceConfig.findUnique({
      where: { organizationId }
    });

    if (!googleConfig || !googleConfig.clientId || !googleConfig.clientSecret) {
      console.log('[REFRESH-TOKEN] ❌ Configuration OAuth manquante pour l\'organisation:', organizationId);
      console.log('[REFRESH-TOKEN] 📋 Config trouvée:', !!googleConfig);
      if (googleConfig) {
        console.log('[REFRESH-TOKEN] 📋 ClientId présent:', !!googleConfig.clientId);
        console.log('[REFRESH-TOKEN] 📋 ClientSecret présent:', !!googleConfig.clientSecret);
      }
      return { success: false, error: 'missing_oauth_config' };
    }

    // 6. Créer le client OAuth et tenter le refresh
    console.log('[REFRESH-TOKEN] 🔧 Configuration OAuth client...');
    const clientId = googleConfig.clientId ? decrypt(googleConfig.clientId) : null;
    const clientSecret = googleConfig.clientSecret ? decrypt(googleConfig.clientSecret) : null;
    if (!clientId || !clientSecret) {
      console.log('[REFRESH-TOKEN] ❌ Configuration OAuth manquante/invalide (après déchiffrement)');
      return { success: false, error: 'missing_oauth_config' };
    }

    // Pour un refresh, le redirectUri n'est pas nécessaire.
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);

    // Configurer le refresh token
    console.log('[REFRESH-TOKEN] 🔑 Configuration des credentials...');
    oauth2Client.setCredentials({
      refresh_token: googleToken.refreshToken || undefined
    });

    try {
      console.log('[REFRESH-TOKEN] 🚀 Tentative de refresh du token...');
      // Forcer le refresh du token
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      console.log('[REFRESH-TOKEN] ✅ Refresh réussi!');
      console.log('[REFRESH-TOKEN] 📋 Nouveau token expire le:', new Date(credentials.expiry_date || 0));
      console.log('[REFRESH-TOKEN] 📋 Token reçu:', !!credentials.access_token);
      console.log('[REFRESH-TOKEN] 📋 Nouveau refresh token reçu:', !!credentials.refresh_token);

      // 7. Sauvegarder le nouveau token
      const newExpiresAt = credentials.expiry_date ? new Date(credentials.expiry_date) : null;
      
      console.log('[REFRESH-TOKEN] 💾 Sauvegarde du nouveau token...');
      
      // Utiliser la clé composite pour la mise à jour
      if (userId) {
        await db.googleToken.update({
          where: { 
            userId_organizationId: { userId, organizationId }
          },
          data: {
            accessToken: credentials.access_token!,
            expiresAt: newExpiresAt,
            updatedAt: new Date(),
            lastRefreshAt: new Date(),
            refreshCount: { increment: 1 },
            // Garder l'ancien refresh token sauf si un nouveau est fourni
            ...(credentials.refresh_token && {
              refreshToken: credentials.refresh_token
            })
          }
        });
      } else if (googleToken.id) {
        // Fallback: utiliser l'ID du token
        await db.googleToken.update({
          where: { id: googleToken.id },
          data: {
            accessToken: credentials.access_token!,
            expiresAt: newExpiresAt,
            updatedAt: new Date(),
            lastRefreshAt: new Date(),
            refreshCount: { increment: 1 },
            ...(credentials.refresh_token && {
              refreshToken: credentials.refresh_token
            })
          }
        });
      }

      console.log('[REFRESH-TOKEN] 💾 Token mis à jour en base de données');

      return {
        success: true,
        accessToken: credentials.access_token!,
        refreshToken: credentials.refresh_token || googleToken.refreshToken || undefined,
        expiresAt: newExpiresAt
      };

    } catch (refreshError: unknown) {
      console.error('[REFRESH-TOKEN] ❌ Erreur lors du refresh:', refreshError);
      
      // Analyser le type d'erreur
      const errorMessage = refreshError instanceof Error ? refreshError.message : String(refreshError);
      console.log('[REFRESH-TOKEN] 🔍 Message d\'erreur:', errorMessage);
      
      if (errorMessage.includes('invalid_grant')) {
        console.log('[REFRESH-TOKEN] 🚨 Refresh token invalide ou révoqué');
        return { success: false, error: 'invalid_refresh_token' };
      } else if (errorMessage.includes('invalid_client')) {
        console.log('[REFRESH-TOKEN] 🚨 Configuration OAuth invalide');
        return { success: false, error: 'invalid_oauth_config' };
      } else {
        console.log('[REFRESH-TOKEN] 🚨 Erreur générique:', errorMessage);
        return { success: false, error: 'refresh_failed' };
      }
    }

  } catch (error) {
    console.error('[REFRESH-TOKEN] ❌ Erreur générale dans refreshGoogleTokenIfNeeded:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log('[REFRESH-TOKEN] 🔍 Détails de l\'erreur générale:', errorMessage);
    return { success: false, error: 'general_error' };
  }
}
