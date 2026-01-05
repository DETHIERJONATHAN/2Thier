import { google } from 'googleapis';
import { OAuth2Client, Credentials } from 'google-auth-library';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';

import {
  GOOGLE_OAUTH_SCOPES,
  describeGoogleOAuthConfig,
  isGoogleOAuthConfigured,
} from '../auth/googleConfig';
import { computeRedirectUri } from '../auth/googleConfig'; // ⭐ Importer la fonction de calcul dynamique

const SCOPES = [...GOOGLE_OAUTH_SCOPES];

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
  // ⭐ CHANGEMENT: Ne pas créer oauth2Client au startup, créer dynamiquement à chaque requête
  private getOAuth2Client(redirectUri: string): OAuth2Client {
    // Récupérer les credentials depuis googleConfig
    // Utiliser require() pour récupérer les valeurs actuelles
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.warn('[GoogleOAuthService] Credentials Google manquants');
      throw new Error('Google OAuth credentials not configured');
    }
    
    return new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      redirectUri
    );
  }

  constructor() {
    if (!isGoogleOAuthConfigured()) {
      console.warn('[GoogleOAuthService] Configuration Google OAuth incomplète');
    }
  }

  // Générer l'URL d'autorisation Google
  getAuthUrl(userId: string, organizationId: string, hostHeader?: string): string {
    console.log('[GoogleOAuthService] Scopes:', SCOPES);
    
    // ⭐ IMPORTANT: Utiliser le Host header s'il est fourni pour cohérence avec le callback
    // Sinon, utiliser la détection d'environnement automatique via env vars
    let redirectUri: string;
    
    if (hostHeader) {
      // Utiliser la même logique que le callback endpoint
      console.log('[GoogleOAuthService] Host header fourni:', hostHeader);
      if (hostHeader.includes('app.github.dev')) {
        // Codespaces
        const match = hostHeader.split(':')[0].match(/^(.+?)-\d+\.app\.github\.dev$/);
        const codespaceName = match ? match[1] : hostHeader.replace('.app.github.dev', '').split(':')[0];
        redirectUri = `https://${codespaceName}-4000.app.github.dev/api/google-auth/callback`;
        console.log('[GoogleOAuthService] Codespaces détecté:', { codespaceName, redirectUri });
      } else if (hostHeader.includes('2thier.be')) {
        // Production
        redirectUri = 'https://app.2thier.be/api/google-auth/callback';
        console.log('[GoogleOAuthService] Production détectée:', { redirectUri });
      } else {
        // Local
        redirectUri = 'http://localhost:4000/api/google-auth/callback';
        console.log('[GoogleOAuthService] Local détecté:', { redirectUri });
      }
    } else {
      // Fallback: utiliser computeRedirectUri() pour la détection automatique
      redirectUri = computeRedirectUri();
      console.log('[GoogleOAuthService] Redirect URI automatique (sans Host header):', redirectUri);
    }
    
    const oauth2Client = this.getOAuth2Client(redirectUri);
    const state = JSON.stringify({ userId, organizationId });

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state: state,
      prompt: 'consent'
    });
    
    console.log('[GoogleOAuthService] URL générée:', authUrl);
    return authUrl;
  }

  // Échanger le code contre des tokens
  async getTokenFromCode(code: string, redirectUri?: string): Promise<Credentials> {
    // ⭐ Si pas d'URI fournie, recalculer dynamiquement
    const actualRedirectUri = redirectUri || computeRedirectUri();
    const oauth2Client = this.getOAuth2Client(actualRedirectUri);
    
    console.log('[GoogleOAuthService] Échange de code avec redirectUri:', actualRedirectUri);
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  }

  // Sauvegarder les tokens en fusionnant avec les anciens pour protéger le refresh_token
  async saveUserTokens(userId: string, organizationId: string, tokens: Credentials, googleEmail?: string) {
    if (!organizationId) {
      throw new Error("L'ID de l'organisation est requis pour sauvegarder les tokens Google.");
    }
    if (!userId) {
      throw new Error("L'ID de l'utilisateur est requis pour sauvegarder les tokens Google.");
    }

    // 1. Récupérer les tokens existants pour cet utilisateur dans cette organisation
    const existingTokens = await prisma.googleToken.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });

    // 2. Préparer les données de mise à jour
    const updateData = {
      accessToken: tokens.access_token!,
      // Conserver l'ancien refresh_token s'il n'y en a pas de nouveau
      refreshToken: tokens.refresh_token || existingTokens?.refreshToken,
      tokenType: tokens.token_type || 'Bearer',
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scope: tokens.scope,
      updatedAt: new Date(),
      googleEmail: googleEmail || existingTokens?.googleEmail
    };

    
    
    

    // 3. Utiliser upsert pour créer ou mettre à jour
    try {
      await prisma.googleToken.upsert({
        where: { userId_organizationId: { userId, organizationId } },
        update: updateData,
        create: {
          id: crypto.randomUUID(),
          userId,
          organizationId,
          accessToken: updateData.accessToken,
          refreshToken: updateData.refreshToken,
          tokenType: updateData.tokenType,
          expiresAt: updateData.expiresAt,
          scope: updateData.scope,
          googleEmail: updateData.googleEmail,
        }
      });
      
    } catch (error) {
      console.error(`[GoogleOAuthService] ❌ ERREUR lors de la sauvegarde des tokens:`, error);
      throw error;
    }
  }

  // Récupérer les tokens par userId et organizationId
  async getUserTokens(userId: string, organizationId?: string) {
    // Si organizationId est fourni, recherche directe
    if (organizationId) {
      return await prisma.googleToken.findUnique({
        where: { userId_organizationId: { userId, organizationId } }
      });
    }

    // Sinon, récupérer l'organisation par défaut de l'utilisateur
    const userWithOrg = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        UserOrganization: {
          take: 1, // Prendre la première organisation
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!userWithOrg || !userWithOrg.UserOrganization[0]) {
      
      return null;
    }

    const defaultOrgId = userWithOrg.UserOrganization[0].organizationId;

    // Puis récupérer les tokens pour cet utilisateur dans cette organisation
    return await prisma.googleToken.findUnique({
      where: { userId_organizationId: { userId, organizationId: defaultOrgId } }
    });
  }

  // Client authentifié avec email administrateur Google Workspace
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
        where: { userId_organizationId: { userId, organizationId: organization.id } }
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
              refreshToken: newCredentials.refresh_token || tokens.refreshToken,
              tokenType: newCredentials.token_type || 'Bearer',
              expiresAt: new Date(newCredentials.expiry_date)
            }
          });
        }
      } catch (error) {
        console.error(`[GoogleOAuthService] Échec rafraîchissement token pour ${organization.name}:`, error);
        return null;
      }
    }

    return adminOAuth2Client;
  }

  // Client authentifié pour un utilisateur
  async getAuthenticatedClient(userId: string, organizationId?: string): Promise<OAuth2Client | null> {
    
    
    const tokens = await this.getUserTokens(userId, organizationId);
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
    
    

    // Créer une NOUVELLE instance OAuth2Client pour cet utilisateur
    const userOAuth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    userOAuth2Client.setCredentials(credentials);
    
    

    // Vérifier si le token est expiré et le rafraîchir si nécessaire
    const now = new Date();
    const expiryDate = tokens.expiresAt;
    
    
    
    if (expiryDate && expiryDate <= now) {
      
      try {
        // Utiliser la méthode refresh du client OAuth2
        const { credentials } = await userOAuth2Client.refreshAccessToken();
        
        
        if (credentials.access_token && credentials.expiry_date) {
          // Mettre à jour les tokens en base
          await this.updateUserTokens(userId, {
            accessToken: credentials.access_token,
            refreshToken: credentials.refresh_token || tokens.refreshToken, // Garde l'ancien si pas de nouveau
            tokenType: credentials.token_type || 'Bearer',
            expiresAt: new Date(credentials.expiry_date)
        });
        
        
      }
    } catch (error) {
      console.error(`[GoogleOAuthService] ❌ Échec du rafraîchissement du token pour ${userId}:`, error);
      return null;
    }
  } else if (expiryDate) {
    
  } else {
    
  }

  
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

    // Utiliser la clé composite userId + organizationId
    await prisma.googleToken.update({
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
      // Supprimer de la base de données avec la clé composite
      await prisma.googleToken.delete({ 
        where: { userId_organizationId: { userId, organizationId } } 
      });
      
    } else {
      
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
