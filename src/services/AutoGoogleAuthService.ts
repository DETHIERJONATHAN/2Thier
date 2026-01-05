import { prisma } from '../lib/prisma';
import { googleOAuthService } from '../google-auth/core/GoogleOAuthCore.js';

/**
 * Service pour la connexion automatique à Google Workspace lors de la connexion au CRM
 * Gère la connexion automatique en arrière-plan sans intervention utilisateur
 */
export class AutoGoogleAuthService {
  private static instance: AutoGoogleAuthService | null = null;

  private constructor() {}

  static getInstance(): AutoGoogleAuthService {
    if (!this.instance) {
      this.instance = new AutoGoogleAuthService();
    }
    return this.instance;
  }

  /**
   * Connecte automatiquement l'utilisateur à Google Workspace lors de sa connexion au CRM
   * Utilise les credentials stockés ou initie la première connexion
   */
  async autoConnectToGoogle(userId: string, organizationId?: string): Promise<{
    success: boolean;
    isConnected: boolean;
    needsManualAuth: boolean;
    authUrl?: string;
    message: string;
  }> {
    try {
      

      // 1. Vérifier si l'utilisateur a déjà des tokens Google valides
      
      const existingTokens = await googleOAuthService.getUserTokens(userId);
      
      
      if (existingTokens) {
        // 🔧 CORRECTIF: Beaucoup moins agressif - on fait confiance aux tokens existants
        const now = new Date();
        const isExpired = existingTokens.expiresAt && existingTokens.expiresAt <= now;
        
        if (!isExpired) {
          
          return {
            success: true,
            isConnected: true,
            needsManualAuth: false,
            message: 'Connexion Google automatique réussie (tokens existants)'
          };
        } else {
          
          return {
            success: true,
            isConnected: true,
            needsManualAuth: false,
            message: 'Connexion Google - refresh délégué au middleware'
          };
        }
      }

      // 2. Si pas de tokens ou refresh impossible, vérifier si l'organisation a une connexion centralisée
      if (organizationId) {
        const orgConnection = await this.checkOrganizationGoogleConnection(organizationId);
        if (orgConnection.hasConnection) {
          
          return {
            success: true,
            isConnected: true,
            needsManualAuth: false,
            message: 'Connexion Google via organisation réussie'
          };
        }
      }

      // 3. Première connexion nécessaire - générer l'URL d'autorisation
      console.log('[AutoGoogleAuth] 🔐 Génération de l\'URL d\'autorisation pour première connexion');
      const authUrl = googleOAuthService.getAuthUrl(userId, userId); // Utiliser userId comme fallback pour organizationId
      console.log('[AutoGoogleAuth] URL générée:', authUrl);
      
      return {
        success: true,
        isConnected: false,
        needsManualAuth: true,
        authUrl,
        message: 'Première connexion Google requise'
      };

    } catch (error) {
      console.error(`❌ [AutoGoogleAuth] Erreur connexion automatique pour user ${userId}:`, error);
      return {
        success: false,
        isConnected: false,
        needsManualAuth: true,
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Teste si les tokens existants sont valides (VERSION MOINS AGRESSIVE)
   */
  private async testExistingTokens(userId: string): Promise<boolean> {
    try {
      // 🔧 CORRECTIF : On considère les tokens comme valides s'ils existent
      // Au lieu de faire des appels API agressifs qui peuvent causer des refresh
      const tokens = await googleOAuthService.getUserTokens(userId);
      
      if (!tokens) {
        
        return false;
      }
      
      // Vérifier seulement l'expiration, pas la validité via API
      const now = new Date();
      const isExpired = tokens.expiresAt && tokens.expiresAt <= now;
      
      if (isExpired) {
        
        return false;
      }
      
      
      return true;
      
    } catch (error) {
      console.error(`❌ [AutoGoogleAuth] Test tokens failed for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Tente de rafraîchir automatiquement les tokens (VERSION MOINS AGRESSIVE)
   */
  private async attemptTokenRefresh(userId: string): Promise<boolean> {
    try {
      // 🔧 CORRECTIF : Moins agressif dans le refresh des tokens
      // On ne fait plus d'appels API automatiques, on laisse le middleware s'en charger
      
      
      // Juste vérifier que les tokens existent toujours après refresh
      const tokens = await googleOAuthService.getUserTokens(userId);
      return !!tokens;
      
    } catch (error) {
      console.error(`❌ [AutoGoogleAuth] Token refresh failed for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Vérifie si l'organisation a une connexion Google centralisée
   */
  private async checkOrganizationGoogleConnection(organizationId: string): Promise<{
    hasConnection: boolean;
    connectionType?: 'workspace' | 'oauth';
  }> {
    try {
      // Vérifier s'il y a une configuration Google Workspace active
      const workspaceConfig = await prisma.googleWorkspaceConfig.findFirst({
        where: { isActive: true }
      });

      if (workspaceConfig) {
        return {
          hasConnection: true,
          connectionType: 'workspace'
        };
      }

      // Vérifier s'il y a des connexions OAuth au niveau organisation
      // (Pour l'instant, on considère que l'organisation n'a pas de connexion centralisée OAuth)
      // Cette fonctionnalité peut être ajoutée plus tard selon votre modèle de données

      return {
        hasConnection: false,
        connectionType: undefined
      };
    } catch (error) {
      console.error(`❌ [AutoGoogleAuth] Erreur vérification connexion org ${organizationId}:`, error);
      return { hasConnection: false };
    }
  }

  /**
   * Configure la connexion automatique lors du login
   * À appeler dans le processus d'authentification du CRM
   */
  async handleLoginGoogleConnection(userId: string, organizationId?: string): Promise<void> {
    try {
      
      
      // Connexion asynchrone en arrière-plan pour ne pas bloquer le login
      setTimeout(async () => {
        try {
          
          
          const result = await this.autoConnectToGoogle(userId, organizationId);
          
          
          if (result.success && result.isConnected) {
            
            
            // Optionnel: Envoyer une notification WebSocket ou mise à jour en temps réel
            // pour informer le frontend que Google est connecté
            this.notifyFrontendGoogleConnected(userId);
          } else if (result.needsManualAuth) {
            
            
            
            // Optionnel: Envoyer une notification au frontend avec l'URL d'auth
            this.notifyFrontendManualAuthRequired(userId, result.authUrl);
          } else {
            
          }
        } catch (timeoutError) {
          console.error(`❌ [AutoGoogleAuth] Erreur dans setTimeout pour user ${userId}:`, timeoutError);
        }
      }, 5 * 60 * 1000); // 🔧 CORRECTIF: Délai de 5 minutes au lieu de 1 seconde pour être moins agressif

      
    } catch (error) {
      console.error(`❌ [AutoGoogleAuth] Erreur handleLoginGoogleConnection pour user ${userId}:`, error);
    }
  }

  /**
   * Notifie le frontend que Google est connecté automatiquement
   */
  private notifyFrontendGoogleConnected(userId: string): void {
    // TODO: Implémenter notification WebSocket ou autre mécanisme temps réel
    
    
    // Exemple: Vous pourriez utiliser Socket.IO ou Server-Sent Events
    // socketService.notifyUser(userId, {
    //   type: 'GOOGLE_AUTO_CONNECTED',
    //   message: 'Google Workspace connecté automatiquement'
    // });
  }

  /**
   * Notifie le frontend qu'une connexion manuelle est requise
   */
  private notifyFrontendManualAuthRequired(userId: string, authUrl?: string): void {
    // TODO: Implémenter notification avec URL d'autorisation
    
    
    // Exemple: Notification avec action
    // socketService.notifyUser(userId, {
    //   type: 'GOOGLE_MANUAL_AUTH_REQUIRED',
    //   message: 'Connectez votre compte Google Workspace',
    //   action: {
    //     type: 'OPEN_GOOGLE_AUTH',
    //     url: authUrl
    //   }
    // });
  }

  /**
   * Déconnecte automatiquement Google lors du logout du CRM
   */
  async handleLogoutGoogleDisconnection(userId: string): Promise<void> {
    try {
      
      
      // Ne pas supprimer les tokens (pour permettre la reconnexion automatique)
      // Juste nettoyer les sessions en cours si nécessaire
      
      
    } catch (error) {
      console.error(`❌ [AutoGoogleAuth] Erreur nettoyage session Google pour user ${userId}:`, error);
    }
  }

  /**
   * Obtient le statut de connexion Google actuel
   */
  async getGoogleConnectionStatus(userId: string, organizationId?: string): Promise<{
    isConnected: boolean;
    connectionType?: 'personal' | 'organization' | 'workspace';
    lastConnected?: Date;
    needsReauth?: boolean;
  }> {
    try {
      // Vérifier connexion personnelle
      const isPersonallyConnected = await googleOAuthService.isUserConnected(userId);
      
      if (isPersonallyConnected) {
        const tokens = await googleOAuthService.getUserTokens(userId);
        return {
          isConnected: true,
          connectionType: 'personal',
          lastConnected: tokens?.updatedAt || tokens?.createdAt,
          needsReauth: false
        };
      }

      // Vérifier connexion organisation/workspace
      if (organizationId) {
        const orgConnection = await this.checkOrganizationGoogleConnection(organizationId);
        if (orgConnection.hasConnection) {
          return {
            isConnected: true,
            connectionType: orgConnection.connectionType === 'workspace' ? 'workspace' : 'organization',
            needsReauth: false
          };
        }
      }

      return {
        isConnected: false,
        needsReauth: true
      };
    } catch (error) {
      console.error(`❌ [AutoGoogleAuth] Erreur statut connexion pour user ${userId}:`, error);
      return {
        isConnected: false,
        needsReauth: true
      };
    }
  }
}

// Export de l'instance singleton
export const autoGoogleAuthService = AutoGoogleAuthService.getInstance();
