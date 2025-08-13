/**
 * GOOGLE AUTHENTICATION MANAGER - MODULE CENTRAL
 * 
 * Ce module centralise toute la logique d'authentification Google Workspace.
 * Il est le SEUL point d'entrée pour obtenir un client Google authentifié.
 * 
 * Logique d'authentification :
 * - L'utilisateur se connecte au CRM avec son email personnel (ex: dethier.jls@gmail.com)
 * - Pour Google Workspace, on utilise l'email administrateur de l'organisation (ex: jonathan.dethier@2thier.be)
 * - Cet email administrateur est configuré dans googleWorkspaceConfig.adminEmail
 * - Les tokens sont stockés au niveau de l'organisation, pas de l'utilisateur
 */

import { OAuth2Client } from 'google-auth-library';
import { googleOAuthService } from './GoogleOAuthCore';

export class GoogleAuthManager {
  private static instance: GoogleAuthManager;

  private constructor() {
    // Utilise l'instance singleton existante du service
  }

  public static getInstance(): GoogleAuthManager {
    if (!GoogleAuthManager.instance) {
      GoogleAuthManager.instance = new GoogleAuthManager();
    }
    return GoogleAuthManager.instance;
  }

  /**
   * Obtient un client Google authentifié pour une organisation
   * 
   * @param organizationId - ID de l'organisation
   * @returns Client OAuth2 authentifié ou null si échec
   */
  async getAuthenticatedClient(organizationId: string): Promise<OAuth2Client | null> {
    if (!organizationId) {
      console.error('[GoogleAuthManager] ❌ organizationId est requis');
      return null;
    }

    console.log(`[GoogleAuthManager] 🔐 Demande de client authentifié pour l'organisation: ${organizationId}`);
    
    try {
      return await googleOAuthService.getAuthenticatedClientForOrganization(organizationId);
    } catch (error) {
      console.error('[GoogleAuthManager] ❌ Erreur lors de l\'obtention du client authentifié:', error);
      return null;
    }
  }

  /**
   * Génère une URL d'autorisation Google
   * 
   * @param userId - ID de l'utilisateur
   * @param organizationId - ID de l'organisation
   * @returns URL d'autorisation
   */
  getAuthorizationUrl(userId: string, organizationId: string): string {
    return googleOAuthService.getAuthUrl(userId, organizationId);
  }

  /**
   * Échange un code d'autorisation contre des tokens
   * 
   * @param code - Code d'autorisation reçu de Google
   * @param userId - ID de l'utilisateur
   * @param organizationId - ID de l'organisation
   */
  async exchangeCodeForTokens(code: string, userId: string, organizationId: string): Promise<void> {
    const tokens = await googleOAuthService.getTokenFromCode(code);
    await googleOAuthService.saveUserTokens(userId, organizationId, tokens);
  }
}

// Export de l'instance singleton
export const googleAuthManager = GoogleAuthManager.getInstance();
