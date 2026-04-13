import { google } from 'googleapis';
import { OAuth2Client, Credentials } from 'google-auth-library';
import { randomUUID } from 'crypto';
import { db } from '../../lib/database';
import { decrypt } from '../../utils/crypto';

import {
  googleOAuthConfig,
  GOOGLE_OAUTH_SCOPES,
  describeGoogleOAuthConfig,
  isGoogleOAuthConfigured,
} from '../../auth/googleConfig';
import { logger } from '../../lib/logger';

const { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET, redirectUri: GOOGLE_REDIRECT_URI } = googleOAuthConfig;

export const GOOGLE_SCOPES_LIST = [...GOOGLE_OAUTH_SCOPES];

const SCOPES = GOOGLE_SCOPES_LIST;

// Interface pour les informations utilisateur de Google
interface UserInfo {
  id?: string | null;
  email?: string | null;
  name?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  picture?: string | null;
  locale?: string | null;
}

export class GoogleOAuthService {
  private oauth2Client: OAuth2Client;

  constructor() {
    if (!isGoogleOAuthConfigured()) {
      logger.warn('[GoogleOAuthService] ⚠️ Configuration Google OAuth incomplète', describeGoogleOAuthConfig());
    }

    this.oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );
  }
  
  private formatOAuthError(error: unknown): Record<string, unknown> {
    const asAny = error as unknown;
    const responseData = asAny?.response?.data;
    return {
      message: asAny instanceof Error ? asAny.message : String(error),
      code: asAny?.code,
      status: asAny?.response?.status ?? asAny?.status,
      error: responseData?.error,
      error_description: responseData?.error_description
    };
  }

  // Générer l'URL d'autorisation Google
  getAuthUrl(
    userId: string,
    organizationId: string,
    hostHeaderOrForceConsent: string | boolean = false,
    maybeForceConsent?: boolean
  ): string {
    // Compat: certains call-sites historiques passaient un hostHeader en 3e param.
    const forceConsent = typeof hostHeaderOrForceConsent === 'boolean'
      ? hostHeaderOrForceConsent
      : (maybeForceConsent ?? false);

    const state = JSON.stringify({ userId, organizationId });

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // ✅ ESSENTIEL : Obtenir un refresh token
      scope: SCOPES,
      state: state,
      // Si forceConsent ou première connexion : demander le consentement pour obtenir refresh_token
      // Sinon : juste sélectionner le compte (plus fluide)
      prompt: forceConsent ? 'consent' : 'select_account',
      include_granted_scopes: true, // ✅ Active l'autorisation incrémentielle
      enable_granular_consent: true // ✅ Protection multicompte
    });
    
    logger.debug('[GoogleOAuthService] 🔗 URL d\'autorisation générée:', authUrl);
    logger.debug('[GoogleOAuthService] 🎯 Redirect URI configuré:', GOOGLE_REDIRECT_URI);
    logger.debug('[GoogleOAuthService] 🔄 Force consent:', forceConsent);
    
    return authUrl;
  }

  // Échanger le code contre des tokens
  async getTokenFromCode(code: string): Promise<Credentials> {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  // Sauvegarder les tokens
  async saveUserTokens(userId: string, organizationId: string, tokens: Credentials, googleEmail?: string) {
    if (!organizationId) {
      throw new Error("L'ID de l'organisation est requis pour sauvegarder les tokens Google.");
    }
    if (!userId) {
      throw new Error("L'ID de l'utilisateur est requis pour sauvegarder les tokens Google.");
    }

    const updateData = {
      accessToken: tokens.access_token!,
      // IMPORTANT : Toujours mettre à jour le refresh_token s'il est fourni.
      // Google peut en envoyer un nouveau lors du 'consent'.
      refreshToken: tokens.refresh_token,
      tokenType: tokens.token_type || 'Bearer',
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scope: tokens.scope,
      updatedAt: new Date()
    };

    // Rechercher par userId + organizationId (nouveau modèle)
    const existingToken = await db.googleToken.findUnique({
      where: { 
        userId_organizationId: { userId, organizationId }
      }
    });

    if (existingToken) {
      await db.googleToken.update({
        where: { 
          userId_organizationId: { userId, organizationId }
        },
        data: {
          accessToken: updateData.accessToken,
          // Ne met à jour le refresh token que s'il est nouveau, sinon conserve l'ancien
          refreshToken: updateData.refreshToken ?? existingToken.refreshToken,
          expiresAt: updateData.expiresAt,
          scope: updateData.scope,
          updatedAt: updateData.updatedAt,
          lastRefreshAt: new Date(),
          refreshCount: { increment: 1 },
          googleEmail: googleEmail ?? existingToken.googleEmail
        }
      });
    } else {
      await db.googleToken.create({
        data: {
          id: randomUUID(),
          userId,
          organizationId,
          accessToken: updateData.accessToken,
          refreshToken: updateData.refreshToken,
          tokenType: updateData.tokenType,
          expiresAt: updateData.expiresAt,
          scope: updateData.scope,
          googleEmail: googleEmail,
          updatedAt: new Date(),
        }
      });
    }
    logger.debug(`[GoogleOAuthService] Tokens sauvegardés/mis à jour pour l'utilisateur ${userId} (org: ${organizationId}, email: ${googleEmail})`);
  }

  // Récupérer les tokens par userId et organizationId
  async getUserTokens(userId: string, organizationId?: string) {
    // Si organizationId est fourni, recherche directe
    if (organizationId) {
      return await db.googleToken.findUnique({
        where: { 
          userId_organizationId: { userId, organizationId }
        }
      });
    }

    // Sinon, récupérer l'organisation par défaut de l'utilisateur
    const userWithOrg = await db.user.findUnique({
      where: { id: userId },
      include: { 
        UserOrganization: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!userWithOrg || !userWithOrg.UserOrganization[0]) {
      logger.debug(`[GoogleOAuthService] Utilisateur ${userId} ou organisation non trouvé`);
      return null;
    }

    const defaultOrgId = userWithOrg.UserOrganization[0].organizationId;

    return await db.googleToken.findUnique({
      where: { 
        userId_organizationId: { userId, organizationId: defaultOrgId }
      }
    });
  }

  // Client authentifié avec email administrateur Google Workspace
  // Maintenant, chaque utilisateur a son propre token
  async getAuthenticatedClientForOrganization(organizationId: string, userId?: string): Promise<OAuth2Client | null> {
    // Récupérer l'organisation et sa config Google Workspace
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      include: {
        GoogleWorkspaceConfig: true,
      },
    });

    if (!organization) {
      return null;
    }

    const googleConfig = organization.GoogleWorkspaceConfig;

    if (!googleConfig || !googleConfig.adminEmail || !googleConfig.domain) {
      return null;
    }

    const clientId = googleConfig.clientId ? decrypt(googleConfig.clientId) : null;
    const clientSecret = googleConfig.clientSecret ? decrypt(googleConfig.clientSecret) : null;
    if (!clientId || !clientSecret) {
      logger.warn('[GoogleOAuthService] ❌ clientId/clientSecret manquants pour org', organizationId);
      return null;
    }

    // Récupérer les tokens pour cet utilisateur dans cette organisation
    let tokens;
    if (userId) {
      tokens = await db.googleToken.findUnique({
        where: { 
          userId_organizationId: { userId, organizationId: organization.id }
        }
      });
    } else {
      // Fallback : prendre le premier token disponible pour cette organisation (legacy)
      tokens = await db.googleToken.findFirst({
        where: { organizationId: organization.id }
      });
    }

    if (!tokens) {
      return null;
    }

    // Configuration des credentials
    const credentials = {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: tokens.tokenType,
      expiry_date: tokens.expiresAt?.getTime()
    };

    // Créer une nouvelle instance OAuth2Client pour l'admin
    // Pour l'utilisation API + refresh, le redirectUri n'est pas requis.
    const adminOAuth2Client = new google.auth.OAuth2(clientId, clientSecret);

    adminOAuth2Client.setCredentials(credentials);

    // Vérifier si le token est expiré et le rafraîchir si nécessaire
    const now = new Date();
    const expiryDate = tokens.expiresAt;
    
    if (expiryDate && expiryDate <= now) {
      try {
        const { credentials: newCredentials } = await adminOAuth2Client.refreshAccessToken();
        
        if (newCredentials.access_token && newCredentials.expiry_date) {
          await db.googleToken.update({
            where: { id: tokens.id },
            data: {
              accessToken: newCredentials.access_token,
              // Mettre à jour le refresh token SEULEMENT s'il est nouveau
              refreshToken: newCredentials.refresh_token ?? tokens.refreshToken,
              tokenType: newCredentials.token_type || 'Bearer',
              expiresAt: new Date(newCredentials.expiry_date),
              updatedAt: new Date(),
              lastRefreshAt: new Date(),
              refreshCount: { increment: 1 }
            }
          });
        }
      } catch (error) {
        logger.error(`[GoogleOAuthService] ❌ Échec du rafraîchissement pour admin ${googleConfig.adminEmail}:`, this.formatOAuthError(error));
        return null;
      }
    }

    return adminOAuth2Client;
  }

  // Client authentifié pour un utilisateur spécifique dans une organisation
  async getAuthenticatedClient(userId: string, organizationId?: string): Promise<OAuth2Client | null> {
    const tokens = await this.getUserTokens(userId, organizationId);
    if (!tokens) {
      logger.debug(`[GoogleOAuthService] ❌ Aucun token trouvé pour l'utilisateur ${userId}`);
      return null;
    }

    // Déterminer l'organisation cible
    let orgId = organizationId;
    if (!orgId) {
      const userWithOrg = await db.user.findUnique({
        where: { id: userId },
        include: {
          UserOrganization: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        }
      });
      orgId = userWithOrg?.UserOrganization?.[0]?.organizationId;
    }

    if (!orgId) {
      logger.debug(`[GoogleOAuthService] ❌ Impossible de déterminer l'organisation pour l'utilisateur ${userId}`);
      return null;
    }

    // Charger la config OAuth (org) et la déchiffrer
    const googleConfig = await db.googleWorkspaceConfig.findUnique({ where: { organizationId: orgId } });
    const clientId = googleConfig?.clientId ? decrypt(googleConfig.clientId) : null;
    const clientSecret = googleConfig?.clientSecret ? decrypt(googleConfig.clientSecret) : null;
    if (!clientId || !clientSecret) {
      logger.warn('[GoogleOAuthService] ❌ clientId/clientSecret manquants pour org', orgId);
      return null;
    }

    logger.debug(`[GoogleOAuthService] 🔍 Tokens trouvés pour ${userId}:`);
    logger.debug(`[GoogleOAuthService] - Access token: ${tokens.accessToken ? 'Présent' : 'MANQUANT'}`);
    logger.debug(`[GoogleOAuthService] - Refresh token: ${tokens.refreshToken ? 'Présent' : 'MANQUANT'}`);
    logger.debug(`[GoogleOAuthService] - Expires at: ${tokens.expiresAt}`);

    // Configuration des credentials
    const credentials = {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: tokens.tokenType,
      expiry_date: tokens.expiresAt?.getTime()
    };
    
    logger.debug(`[GoogleOAuthService] 🔧 Configuration credentials:`, {
      hasAccessToken: !!credentials.access_token,
      hasRefreshToken: !!credentials.refresh_token,
      tokenType: credentials.token_type,
      expiryDate: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : 'NON_DÉFINI'
    });

    // Créer une NOUVELLE instance OAuth2Client pour cet utilisateur (org-specific)
    // Pour l'utilisation API + refresh, le redirectUri n'est pas requis.
    const userOAuth2Client = new google.auth.OAuth2(clientId, clientSecret);

    userOAuth2Client.setCredentials(credentials);
    
    logger.debug(`[GoogleOAuthService] 📋 Credentials définies sur nouveau OAuth2Client`);

    // Vérifier si le token est expiré et le rafraîchir si nécessaire
    const now = new Date();
    const expiryDate = tokens.expiresAt;
    
    logger.debug(`[GoogleOAuthService] ⏰ Vérification expiration: maintenant=${now.toISOString()}, expiry=${expiryDate?.toISOString()}`);
    
    if (expiryDate && expiryDate <= now) {
      logger.debug(`[GoogleOAuthService] ⚠️ Token expiré pour l'utilisateur ${userId}, rafraîchissement...`);
      try {
        // Utiliser la méthode refresh du client OAuth2
        const { credentials } = await userOAuth2Client.refreshAccessToken();
        logger.debug(`[GoogleOAuthService] ✅ Rafraîchissement réussi, nouvelles credentials:`, {
          hasAccessToken: !!credentials.access_token,
          hasRefreshToken: !!credentials.refresh_token,
          newExpiry: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : 'NON_DÉFINI'
        });
        
        if (credentials.access_token && credentials.expiry_date) {
          // Mettre à jour les tokens en base
          await this.updateUserTokens(userId, {
            accessToken: credentials.access_token,
            refreshToken: credentials.refresh_token || tokens.refreshToken, // Garde l'ancien si pas de nouveau
            tokenType: credentials.token_type || 'Bearer',
            expiresAt: new Date(credentials.expiry_date)
        });
        
        logger.debug(`[GoogleOAuthService] ✅ Token rafraîchi avec succès pour l'utilisateur ${userId}`);
      }
    } catch (error) {
        logger.error(`[GoogleOAuthService] ❌ Échec du rafraîchissement du token pour ${userId}:`, this.formatOAuthError(error));
      return null;
    }
  } else if (expiryDate) {
    logger.debug(`[GoogleOAuthService] ✅ Token encore valide pour ${userId} (expire dans ${Math.round((expiryDate.getTime() - now.getTime()) / 1000 / 60)} minutes)`);
  } else {
    logger.debug(`[GoogleOAuthService] ⚠️ Pas de date d'expiration définie pour ${userId}`);
  }

  logger.debug(`[GoogleOAuthService] 🚀 Retour du nouveau client OAuth2 configuré pour ${userId}`);
  return userOAuth2Client;
  }

  // Méthode pour mettre à jour les tokens existants
  private async updateUserTokens(userId: string, tokenData: {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresAt: Date;
  }) {
    // Récupérer l'utilisateur avec sa relation UserOrganization
    const userWithOrg = await db.user.findUnique({
      where: { id: userId },
      include: { 
        UserOrganization: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!userWithOrg || !userWithOrg.UserOrganization[0]) {
      throw new Error(`Utilisateur ${userId} ou organisation non trouvé`);
    }

    const organizationId = userWithOrg.UserOrganization[0].organizationId;

    await db.googleToken.update({
      where: { userId_organizationId: { userId, organizationId } },
      data: {
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        tokenType: tokenData.tokenType,
        expiresAt: tokenData.expiresAt
      }
    });
  }

  // Vérifier si connecté
  async isUserConnected(userId: string): Promise<boolean> {
    const tokens = await this.getUserTokens(userId);
    return !!tokens;
  }

  // Déconnecter l'utilisateur
  async disconnectUser(userId: string) {
    try {
      const tokens = await this.getUserTokens(userId);
      if (tokens?.refreshToken) {
        // Révoquer le refresh token, ce qui invalide l'accès.
        await this.oauth2Client.revokeToken(tokens.refreshToken);
        logger.debug(`[GoogleOAuthService] Token révoqué pour l'utilisateur ${userId}`);
      }
    } catch (error) {
      logger.error(`[GoogleOAuthService] Échec de la révocation du token pour ${userId}:`, error);
      // On continue même si la révocation échoue pour supprimer les données locales
    }

    // Récupérer l'utilisateur avec sa relation UserOrganization
    const userWithOrg = await db.user.findUnique({
      where: { id: userId },
      include: { 
        UserOrganization: {
          take: 1, // Prendre la première organisation
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (userWithOrg?.UserOrganization[0]) {
      const organizationId = userWithOrg.UserOrganization[0].organizationId;
      // Supprimer de la base de données avec la clé composite userId + organizationId
      await db.googleToken.delete({ 
        where: { userId_organizationId: { userId, organizationId } } 
      });
      logger.debug(`[GoogleOAuthService] Tokens supprimés de la DB pour l'utilisateur ${userId} (org: ${organizationId})`);
    } else {
      logger.debug(`[GoogleOAuthService] Impossible de trouver l'organization pour l'utilisateur ${userId}`);
    }
  }

  // Tester la connexion
  async testConnection(userId: string): Promise<{ success: boolean; userInfo?: UserInfo; error?: string }> {
    try {
      const auth = await this.getAuthenticatedClient(userId);
      if (!auth) return { success: false, error: 'Non connecté' };

      const oauth2 = google.oauth2({ version: 'v2', auth });
      const response = await oauth2.userinfo.get();
      return { success: true, userInfo: response.data };
    } catch (error: unknown) {
      logger.error(`[GoogleOAuthService] Erreur lors du test de connexion pour ${userId}:`, error);
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Une erreur inconnue est survenue' };
    }
  }
}

export const googleOAuthService = new GoogleOAuthService();
