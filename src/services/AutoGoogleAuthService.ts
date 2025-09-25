import { PrismaClient } from '@prisma/client';
import { googleOAuthService } from '../google-auth/core/GoogleOAuthCore.js';

const prisma = new PrismaClient();

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
      console.log(`🔄 [AutoGoogleAuth] DÉBUT autoConnectToGoogle pour user ${userId} org ${organizationId}...`);

      // 1. Vérifier si l'utilisateur a déjà des tokens Google valides
      console.log(`🔍 [AutoGoogleAuth] Vérification tokens existants pour user ${userId}...`);
      const existingTokens = await googleOAuthService.getUserTokens(userId);
      console.log(`🔍 [AutoGoogleAuth] Tokens existants pour user ${userId}:`, existingTokens ? 'TROUVÉS' : 'AUCUN');
      
      if (existingTokens) {
        // 🔧 CORRECTIF: Beaucoup moins agressif - on fait confiance aux tokens existants
        const now = new Date();
        const isExpired = existingTokens.expiresAt && existingTokens.expiresAt <= now;
        
        if (!isExpired) {
          console.log(`✅ [AutoGoogleAuth] Tokens valides trouvés pour user ${userId} - connexion considérée comme active`);
          return {
            success: true,
            isConnected: true,
            needsManualAuth: false,
            message: 'Connexion Google automatique réussie (tokens existants)'
          };
        } else {
          console.log(`⚠️ [AutoGoogleAuth] Tokens expirés pour user ${userId} - mais on laisse le middleware gérer le refresh`);
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
          console.log(`✅ [AutoGoogleAuth] Connexion Google organisation disponible pour user ${userId}`);
          return {
            success: true,
            isConnected: true,
            needsManualAuth: false,
            message: 'Connexion Google via organisation réussie'
          };
        }
      }

      // 3. Première connexion nécessaire - générer l'URL d'autorisation
      const authUrl = googleOAuthService.getAuthUrl(userId);
      
      console.log(`🔐 [AutoGoogleAuth] Première connexion Google nécessaire pour user ${userId}`);
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
        console.log(`[AutoGoogleAuth] Pas de tokens pour user ${userId}`);
        return false;
      }
      
      // Vérifier seulement l'expiration, pas la validité via API
      const now = new Date();
      const isExpired = tokens.expiresAt && tokens.expiresAt <= now;
      
      if (isExpired) {
        console.log(`[AutoGoogleAuth] Tokens expirés pour user ${userId}`);
        return false;
      }
      
      console.log(`[AutoGoogleAuth] ✅ Tokens présents et non expirés pour user ${userId}`);
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
      console.log(`[AutoGoogleAuth] 🔧 Refresh conservateur pour user ${userId} - délégation au middleware`);
      
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
      console.log(`🚀 [AutoGoogleAuth] DÉBUT handleLoginGoogleConnection pour user ${userId} org ${organizationId}...`);
      
      // Connexion asynchrone en arrière-plan pour ne pas bloquer le login
      setTimeout(async () => {
        try {
          console.log(`⏰ [AutoGoogleAuth] TIMEOUT DÉCLENCHÉ (5 min) - Exécution autoConnectToGoogle pour user ${userId}...`);
          
          const result = await this.autoConnectToGoogle(userId, organizationId);
          console.log(`📋 [AutoGoogleAuth] RÉSULTAT autoConnectToGoogle pour user ${userId}:`, result);
          
          if (result.success && result.isConnected) {
            console.log(`✅ [AutoGoogleAuth] Connexion Google automatique réussie pour user ${userId}`);
            
            // Optionnel: Envoyer une notification WebSocket ou mise à jour en temps réel
            // pour informer le frontend que Google est connecté
            this.notifyFrontendGoogleConnected(userId);
          } else if (result.needsManualAuth) {
            console.log(`🔐 [AutoGoogleAuth] Connexion manuelle requise pour user ${userId}`);
            console.log(`🔗 [AutoGoogleAuth] URL d'autorisation: ${result.authUrl}`);
            
            // Optionnel: Envoyer une notification au frontend avec l'URL d'auth
            this.notifyFrontendManualAuthRequired(userId, result.authUrl);
          } else {
            console.log(`⚠️ [AutoGoogleAuth] Résultat inattendu pour user ${userId}:`, result);
          }
        } catch (timeoutError) {
          console.error(`❌ [AutoGoogleAuth] Erreur dans setTimeout pour user ${userId}:`, timeoutError);
        }
      }, 5 * 60 * 1000); // 🔧 CORRECTIF: Délai de 5 minutes au lieu de 1 seconde pour être moins agressif

      console.log(`📤 [AutoGoogleAuth] handleLoginGoogleConnection terminé pour user ${userId} - timeout 5min programmé`);
    } catch (error) {
      console.error(`❌ [AutoGoogleAuth] Erreur handleLoginGoogleConnection pour user ${userId}:`, error);
    }
  }

  /**
   * Notifie le frontend que Google est connecté automatiquement
   */
  private notifyFrontendGoogleConnected(userId: string): void {
    // TODO: Implémenter notification WebSocket ou autre mécanisme temps réel
    console.log(`📢 [AutoGoogleAuth] Google connecté automatiquement pour user ${userId}`);
    
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
    console.log(`📢 [AutoGoogleAuth] Connexion manuelle requise pour user ${userId}`, { authUrl });
    
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
      console.log(`🔄 [AutoGoogleAuth] Nettoyage session Google pour user ${userId}...`);
      
      // Ne pas supprimer les tokens (pour permettre la reconnexion automatique)
      // Juste nettoyer les sessions en cours si nécessaire
      
      console.log(`✅ [AutoGoogleAuth] Session Google nettoyée pour user ${userId}`);
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
