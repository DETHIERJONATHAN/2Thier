import { google } from 'googleapis';
import { OAuth2Client, Credentials } from 'google-auth-library';
import { randomUUID } from 'crypto';
import { prisma } from '../../lib/prisma';

import {
  googleOAuthConfig,
  GOOGLE_OAUTH_SCOPES,
  describeGoogleOAuthConfig,
  isGoogleOAuthConfigured,
} from '../../auth/googleConfig';

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
      console.warn('[GoogleOAuthService] ⚠️ Configuration Google OAuth incomplète', describeGoogleOAuthConfig());
    }

    this.oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );
  }

  // Générer l'URL d'autorisation Google
  getAuthUrl(userId: string, organizationId: string): string {
    const state = JSON.stringify({ userId, organizationId });

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state: state,
      prompt: 'consent'
    });
    
    console.log('[GoogleOAuthService] 🔗 URL d\'autorisation générée:', authUrl);
    console.log('[GoogleOAuthService] 🎯 Redirect URI configuré:', GOOGLE_REDIRECT_URI);
    
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
    const existingToken = await prisma.googleToken.findUnique({
      where: { 
        userId_organizationId: { userId, organizationId }
      }
    });

    if (existingToken) {
      await prisma.googleToken.update({
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
      await prisma.googleToken.create({
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
    console.log(`[GoogleOAuthService] Tokens sauvegardés/mis à jour pour l'utilisateur ${userId} (org: ${organizationId}, email: ${googleEmail})`);
  }

  // Récupérer les tokens par userId et organizationId
  async getUserTokens(userId: string, organizationId?: string) {
    // Si organizationId est fourni, recherche directe
    if (organizationId) {
      return await prisma.googleToken.findUnique({
        where: { 
          userId_organizationId: { userId, organizationId }
        }
      });
    }

    // Sinon, récupérer l'organisation par défaut de l'utilisateur
    const userWithOrg = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        UserOrganization: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!userWithOrg || !userWithOrg.UserOrganization[0]) {
      console.log(`[GoogleOAuthService] Utilisateur ${userId} ou organisation non trouvé`);
      return null;
    }

    const defaultOrgId = userWithOrg.UserOrganization[0].organizationId;

    return await prisma.googleToken.findUnique({
      where: { 
        userId_organizationId: { userId, organizationId: defaultOrgId }
      }
    });
  }

  // Client authentifié avec email administrateur Google Workspace
  // Maintenant, chaque utilisateur a son propre token
  async getAuthenticatedClientForOrganization(organizationId: string, userId?: string): Promise<OAuth2Client | null> {
    // Récupérer l'organisation et sa config Google Workspace
    const organization = await prisma.organization.findUnique({
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

    // Récupérer les tokens pour cet utilisateur dans cette organisation
    let tokens;
    if (userId) {
      tokens = await prisma.googleToken.findUnique({
        where: { 
          userId_organizationId: { userId, organizationId: organization.id }
        }
      });
    } else {
      // Fallback : prendre le premier token disponible pour cette organisation (legacy)
      tokens = await prisma.googleToken.findFirst({
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
    const adminOAuth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    adminOAuth2Client.setCredentials(credentials);

    // Vérifier si le token est expiré et le rafraîchir si nécessaire
    const now = new Date();
    const expiryDate = tokens.expiresAt;
    
    if (expiryDate && expiryDate <= now) {
      try {
        const { credentials: newCredentials } = await adminOAuth2Client.refreshAccessToken();
        
        if (newCredentials.access_token && newCredentials.expiry_date) {
          await prisma.googleToken.update({
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
        console.error(`[GoogleOAuthService] ❌ Échec du rafraîchissement pour admin ${googleConfig.adminEmail}:`, error);
        return null;
      }
    }

    return adminOAuth2Client;
  }

  // Client authentifié pour un utilisateur spécifique dans une organisation
  async getAuthenticatedClient(userId: string, organizationId?: string): Promise<OAuth2Client | null> {
    const tokens = await this.getUserTokens(userId, organizationId);
    if (!tokens) {
      console.log(`[GoogleOAuthService] ❌ Aucun token trouvé pour l'utilisateur ${userId}`);
      return null;
    }

    console.log(`[GoogleOAuthService] 🔍 Tokens trouvés pour ${userId}:`);
    console.log(`[GoogleOAuthService] - Access token: ${tokens.accessToken ? tokens.accessToken.substring(0, 20) + '...' : 'MANQUANT'}`);
    console.log(`[GoogleOAuthService] - Refresh token: ${tokens.refreshToken ? tokens.refreshToken.substring(0, 20) + '...' : 'MANQUANT'}`);
    console.log(`[GoogleOAuthService] - Expires at: ${tokens.expiresAt}`);

    // Configuration des credentials
    const credentials = {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: tokens.tokenType,
      expiry_date: tokens.expiresAt?.getTime()
    };
    
    console.log(`[GoogleOAuthService] 🔧 Configuration credentials:`, {
      hasAccessToken: !!credentials.access_token,
      accessTokenLength: credentials.access_token?.length,
      hasRefreshToken: !!credentials.refresh_token,
      refreshTokenLength: credentials.refresh_token?.length,
      tokenType: credentials.token_type,
      expiryDate: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : 'NON_DÉFINI'
    });

    // Créer une NOUVELLE instance OAuth2Client pour cet utilisateur
    const userOAuth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    userOAuth2Client.setCredentials(credentials);
    
    console.log(`[GoogleOAuthService] 📋 Credentials définies sur nouveau OAuth2Client`);

    // Vérifier si le token est expiré et le rafraîchir si nécessaire
    const now = new Date();
    const expiryDate = tokens.expiresAt;
    
    console.log(`[GoogleOAuthService] ⏰ Vérification expiration: maintenant=${now.toISOString()}, expiry=${expiryDate?.toISOString()}`);
    
    if (expiryDate && expiryDate <= now) {
      console.log(`[GoogleOAuthService] ⚠️ Token expiré pour l'utilisateur ${userId}, rafraîchissement...`);
      try {
        // Utiliser la méthode refresh du client OAuth2
        const { credentials } = await userOAuth2Client.refreshAccessToken();
        console.log(`[GoogleOAuthService] ✅ Rafraîchissement réussi, nouvelles credentials:`, {
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
        
        console.log(`[GoogleOAuthService] ✅ Token rafraîchi avec succès pour l'utilisateur ${userId}`);
      }
    } catch (error) {
      console.error(`[GoogleOAuthService] ❌ Échec du rafraîchissement du token pour ${userId}:`, error);
      return null;
    }
  } else if (expiryDate) {
    console.log(`[GoogleOAuthService] ✅ Token encore valide pour ${userId} (expire dans ${Math.round((expiryDate.getTime() - now.getTime()) / 1000 / 60)} minutes)`);
  } else {
    console.log(`[GoogleOAuthService] ⚠️ Pas de date d'expiration définie pour ${userId}`);
  }

  console.log(`[GoogleOAuthService] 🚀 Retour du nouveau client OAuth2 configuré pour ${userId}`);
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
    const userWithOrg = await prisma.user.findUnique({
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

    await prisma.googleToken.update({
      where: { organizationId },
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
        console.log(`[GoogleOAuthService] Token révoqué pour l'utilisateur ${userId}`);
      }
    } catch (error) {
      console.error(`[GoogleOAuthService] Échec de la révocation du token pour ${userId}:`, error);
      // On continue même si la révocation échoue pour supprimer les données locales
    }

    // Récupérer l'utilisateur avec sa relation UserOrganization
    const userWithOrg = await prisma.user.findUnique({
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
      await prisma.googleToken.delete({ 
        where: { userId_organizationId: { userId, organizationId } } 
      });
      console.log(`[GoogleOAuthService] Tokens supprimés de la DB pour l'utilisateur ${userId} (org: ${organizationId})`);
    } else {
      console.log(`[GoogleOAuthService] Impossible de trouver l'organization pour l'utilisateur ${userId}`);
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
      console.error(`[GoogleOAuthService] Erreur lors du test de connexion pour ${userId}:`, error);
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Une erreur inconnue est survenue' };
    }
  }
}

export const googleOAuthService = new GoogleOAuthService();
