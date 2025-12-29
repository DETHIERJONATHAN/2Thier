/**
 * Middleware pour le refresh automatique des tokens Google
 * Ce middleware vérifie et renouvelle automatiquement les tokens expirés
 */

import { google } from 'googleapis';
import { prisma } from '../lib/prisma.js';
import { decrypt, encrypt } from '../lib/encryption.js';
import { Request, Response, NextFunction } from 'express';

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
      googleToken = await prisma.googleToken.findUnique({
        where: { userId_organizationId: { userId, organizationId } }
      });
    } else {
      // Fallback legacy
      googleToken = await prisma.googleToken.findFirst({
        where: { organizationId }
      });
    }

    if (!googleToken) {
      console.log('[REFRESH-TOKEN] ❌ Aucun token trouvé');
      return { success: false, error: 'no_token_found' };
    }

    // 2. Vérifier si le token est proche de l'expiration (dans les 30 prochaines minutes)
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
    
    // 🆕 AMÉLIORATION : Refresh seulement si vraiment nécessaire (plus conservateur)
    const isExpiring = googleToken.expiresAt && googleToken.expiresAt <= thirtyMinutesFromNow;
    const isExpired = googleToken.expiresAt && googleToken.expiresAt <= now;
    const noExpiryDate = !googleToken.expiresAt;

    console.log('[REFRESH-TOKEN] ⏰ État du token (délai 30min):');
    console.log('  - Expire le:', googleToken.expiresAt);
    console.log('  - Maintenant:', now);
    console.log('  - Expiré:', isExpired);
    console.log('  - Expire bientôt (30min):', isExpiring);
    console.log('  - Pas de date d\'expiration:', noExpiryDate);

    // 3. Si le token n'est pas expiré et pas proche de l'expiration, on le retourne tel quel
    // 🆕 AMÉLIORATION : Plus conservateur - on refresh seulement si vraiment proche de l'expiration
    if (!isExpiring && !isExpired && !noExpiryDate) {
      console.log('[REFRESH-TOKEN] ✅ Token encore valide (plus de 30min), pas de refresh nécessaire');
      return {
        success: true,
        accessToken: decrypt(googleToken.accessToken),
        refreshToken: googleToken.refreshToken ? decrypt(googleToken.refreshToken) : undefined,
        expiresAt: googleToken.expiresAt
      };
    }

    // 4. Le token est expiré, expire bientôt (moins de 30 min), ou n'a pas de date d'expiration - refresh nécessaire
    if (!googleToken.refreshToken) {
      console.log('[REFRESH-TOKEN] ❌ Refresh nécessaire mais pas de refresh token disponible');
      return { success: false, error: 'no_refresh_token' };
    }

    if (noExpiryDate) {
      console.log('[REFRESH-TOKEN] 🔄 Token sans date d\'expiration, refresh par sécurité...');
    } else {
      console.log('[REFRESH-TOKEN] 🔄 Token expiré/expirant (moins de 30 min), tentative de refresh...');
    }

    // 5. Récupérer la configuration OAuth
    const googleConfig = await prisma.googleWorkspaceConfig.findUnique({
      where: { organizationId }
    });

    if (!googleConfig || !googleConfig.clientId || !googleConfig.clientSecret) {
      console.log('[REFRESH-TOKEN] ❌ Configuration OAuth manquante');
      return { success: false, error: 'missing_oauth_config' };
    }

    // 6. Créer le client OAuth et tenter le refresh
    const oauth2Client = new google.auth.OAuth2(
      decrypt(googleConfig.clientId),
      decrypt(googleConfig.clientSecret),
      googleConfig.redirectUri
    );

    // Configurer le refresh token
    oauth2Client.setCredentials({
      refresh_token: decrypt(googleToken.refreshToken)
    });

    try {
      // Forcer le refresh du token
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      console.log('[REFRESH-TOKEN] ✅ Refresh réussi!');
      console.log('  - Nouveau token expire le:', new Date(credentials.expiry_date || 0));

      // 7. Sauvegarder le nouveau token
      const newExpiresAt = credentials.expiry_date ? new Date(credentials.expiry_date) : null;
      
      // Mise à jour avec la clé composite ou l'ID
      if (userId) {
        await prisma.googleToken.update({
          where: { userId_organizationId: { userId, organizationId } },
          data: {
            accessToken: encrypt(credentials.access_token!),
            expiresAt: newExpiresAt,
            updatedAt: new Date(),
            ...(credentials.refresh_token && {
              refreshToken: encrypt(credentials.refresh_token)
            })
          }
        });
      } else if (googleToken.id) {
        await prisma.googleToken.update({
          where: { id: googleToken.id },
          data: {
            accessToken: encrypt(credentials.access_token!),
            expiresAt: newExpiresAt,
            updatedAt: new Date(),
            ...(credentials.refresh_token && {
              refreshToken: encrypt(credentials.refresh_token)
            })
          }
        });
      }

      console.log('[REFRESH-TOKEN] 💾 Token mis à jour en base de données');

      return {
        success: true,
        accessToken: credentials.access_token!,
        refreshToken: credentials.refresh_token || decrypt(googleToken.refreshToken),
        expiresAt: newExpiresAt
      };

    } catch (refreshError: unknown) {
      console.error('[REFRESH-TOKEN] ❌ Erreur lors du refresh:', refreshError);
      
      // Analyser le type d'erreur
      const errorMessage = refreshError instanceof Error ? refreshError.message : String(refreshError);
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
    console.error('[REFRESH-TOKEN] ❌ Erreur générale:', error);
    return { success: false, error: 'general_error' };
  }
}

/**
 * Middleware Express pour vérifier et rafraîchir automatiquement les tokens Google
 */
export function googleTokenRefreshMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Récupérer l'organizationId depuis les headers ou la query
      const organizationId = req.headers['x-organization-id'] || req.query.organizationId;
      
      if (!organizationId) {
        // Pas d'organisation spécifiée, on continue sans refresh
        return next();
      }

      // Récupérer userId depuis la requête authentifiée
      const userId = (req as any).user?.userId || (req as any).user?.id;
      console.log('[REFRESH-MIDDLEWARE] 🔍 Vérification token pour organisation:', organizationId, 'userId:', userId);

      // Tenter le refresh si nécessaire
      const refreshResult = await refreshGoogleTokenIfNeeded(organizationId as string, userId);
      
      if (refreshResult.success) {
        console.log('[REFRESH-MIDDLEWARE] ✅ Token valide ou rafraîchi avec succès');
        // Ajouter les informations du token à la requête pour les routes suivantes
        req.googleToken = {
          accessToken: refreshResult.accessToken,
          refreshToken: refreshResult.refreshToken,
          expiresAt: refreshResult.expiresAt
        };
      } else {
        console.log('[REFRESH-MIDDLEWARE] ⚠️ Refresh échoué:', refreshResult.error);
        // On continue quand même, la route gérera l'erreur
        req.googleTokenError = refreshResult.error;
      }

      next();

    } catch (error) {
      console.error('[REFRESH-MIDDLEWARE] ❌ Erreur middleware:', error);
      // En cas d'erreur, on continue sans bloquer
      next();
    }
  };
}

/**
 * Fonction utilitaire pour obtenir un token Google valide
 */
export async function getValidGoogleToken(organizationId: string, userId?: string) {
  const refreshResult = await refreshGoogleTokenIfNeeded(organizationId, userId);
  
  if (!refreshResult.success) {
    throw new Error(`Failed to get valid Google token: ${refreshResult.error}`);
  }
  
  return {
    accessToken: refreshResult.accessToken!,
    refreshToken: refreshResult.refreshToken,
    expiresAt: refreshResult.expiresAt
  };
}
