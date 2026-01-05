/**
 * GOOGLE AUTHENTICATION MANAGER - MODULE CENTRAL
 * 
 * Ce module centralise toute la logique d'authentification Google Workspace.
 * Il est le SEUL point d'entrée pour obtenir un client Google authentifié.
 * 
 * Logique d'authentification :
 * - L'utilisateur se connecte au CRM avec son email CRM
 * - Chaque utilisateur a son propre token Google par organisation
 * - Les tokens sont stockés au niveau utilisateur + organisation (ex: userId + organizationId)
 * - Cela permet à chaque membre de l'organisation d'accéder à sa propre boîte Gmail
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
   * Obtient un client Google authentifié pour un utilisateur dans une organisation
   * 
   * @param organizationId - ID de l'organisation
   * @param userId - ID de l'utilisateur (optionnel pour rétrocompatibilité)
   * @returns Client OAuth2 authentifié ou null si échec
   */
  async getAuthenticatedClient(organizationId: string, userId?: string): Promise<OAuth2Client | null> {
    if (!organizationId) {
      console.error('[GoogleAuthManager] ❌ organizationId est requis');
      return null;
    }

    console.log(`[GoogleAuthManager] 🔐 Demande de client authentifié pour l'organisation: ${organizationId}, utilisateur: ${userId || 'non spécifié'}`);
    
    try {
      return await googleOAuthService.getAuthenticatedClientForOrganization(organizationId, userId);
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
   * @param hostHeader - Host header du request (optionnel, utilisé pour détection d'environnement)
   * @returns URL d'autorisation
   */
  getAuthorizationUrl(userId: string, organizationId: string, hostHeader?: string): string {
    return googleOAuthService.getAuthUrl(userId, organizationId, hostHeader);
  }

  /**
   * Échange un code d'autorisation contre des tokens
   * 
   * @param code - Code d'autorisation reçu de Google
   * @param userId - ID de l'utilisateur
   * @param organizationId - ID de l'organisation
   * @param googleEmail - Email du compte Google connecté (optionnel)
   */
  async exchangeCodeForTokens(code: string, userId: string, organizationId: string, googleEmail?: string): Promise<void> {
    const tokens = await googleOAuthService.getTokenFromCode(code);
    await googleOAuthService.saveUserTokens(userId, organizationId, tokens, googleEmail);
  }
}

// Export de l'instance singleton
export const googleAuthManager = GoogleAuthManager.getInstance();
