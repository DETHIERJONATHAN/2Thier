/**
 * SCHEDULER DE REFRESH AUTOMATIQUE DES TOKENS GOOGLE
 * 
 * Ce service s'exécute en arrière-plan et refresh automatiquement tous les tokens Google
 * avant qu'ils n'expirent, éliminant complètement le besoin de reconnexion manuelle.
 * 
 * PROBLÈME RÉSOLU :
 * - Les tokens Google expirent toutes les heures (3600s)
 * - Sans utilisation active, ils expirent et l'utilisateur doit se reconnecter
 * - Ce scheduler refresh automatiquement AVANT expiration
 * 
 * FONCTIONNEMENT :
 * - Vérifie toutes les 50 minutes tous les tokens
 * - Refresh automatiquement ceux qui expirent dans les 10 prochaines minutes
 * - Enregistre l'historique complet dans la base
 * - Logs détaillés pour monitoring
 * - Gestion d'erreurs robuste
 */

import { db } from '../lib/database.js';
import { decrypt } from '../utils/crypto.js';

export class GoogleTokenRefreshScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private readonly REFRESH_INTERVAL = 50 * 60 * 1000; // 50 minutes
  private refreshCount = 0;
  private lastRefreshTime: Date | null = null;

  constructor() {
    console.log('🔄 [GoogleTokenScheduler] Scheduler initialisé');
  }

  start(): void {
    if (this.isRunning) {
      console.log('⚠️ [GoogleTokenScheduler] Scheduler déjà en cours d\'exécution');
      return;
    }

    this.isRunning = true;
    
    // Démarrer immédiatement un refresh
    this.refreshAllTokens();
    
    // Puis programmer les refreshs périodiques
    this.intervalId = setInterval(() => {
      this.refreshAllTokens();
    }, this.REFRESH_INTERVAL);

    console.log('🚀 [GoogleTokenScheduler] Scheduler démarré - refresh toutes les 50 minutes');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('⏹️ [GoogleTokenScheduler] Scheduler arrêté');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      refreshInterval: this.REFRESH_INTERVAL,
      refreshCount: this.refreshCount,
      lastRefresh: this.lastRefreshTime
    };
  }

  async forceRefreshAll(): Promise<void> {
    console.log('🔥 [GoogleTokenScheduler] Refresh forcé de tous les tokens');
    await this.refreshAllTokens({ ignoreExpiry: true });
  }

  private async refreshAllTokens(options: { ignoreExpiry?: boolean } = {}): Promise<void> {
    try {
      console.log('🔄 [GoogleTokenScheduler] Début du refresh de tous les tokens...');
      this.lastRefreshTime = new Date();

      const ignoreExpiry = options.ignoreExpiry === true;
      
      // Récupérer les tokens à refresher
      const tokensToRefresh = await db.googleToken.findMany({
        where: {
          // Ne tenter un refresh que si un refresh token existe
          refreshToken: {
            not: null,
          },
          ...(ignoreExpiry
            ? {}
            : {
              OR: [
                // Tokens qui expirent dans moins de 10 minutes
                {
                  expiresAt: {
                    lte: new Date(Date.now() + 10 * 60 * 1000)
                  }
                },
                // Ou tokens sans date d'expiration (considérés comme expirés)
                {
                  expiresAt: null
                }
              ]
            })
        },
        include: {
          Organization: true
        }
      });

      console.log(`🔍 [GoogleTokenScheduler] ${tokensToRefresh.length} tokens trouvés à refresher${ignoreExpiry ? ' (mode forcé)' : ''}`);

      let successCount = 0;
      let errorCount = 0;

      for (const token of tokensToRefresh) {
        const success = await this.refreshSingleToken(token);
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }
      }

      this.refreshCount++;
      console.log(`✅ [GoogleTokenScheduler] Refresh terminé: ${successCount} succès, ${errorCount} erreurs`);
    } catch (error) {
      console.error('❌ [GoogleTokenScheduler] Erreur lors du refresh général:', error);
    }
  }

  private async refreshSingleToken(token: { 
    id: string; 
    organizationId: string; 
    refreshToken: string | null; 
    expiresAt: Date | null;
    googleEmail?: string | null;
    Organization?: { name: string } | null;
  }): Promise<boolean> {
    const oldExpiresAt = token.expiresAt;
    
    try {
      console.log(`🔄 [GoogleTokenScheduler] Refresh token pour org ${token.organizationId}`);
      
      if (!token.refreshToken) {
        const errorMsg = 'Aucun refresh token disponible';
        console.error(`❌ [GoogleTokenScheduler] ${errorMsg} pour org ${token.organizationId}`);
        
        await this.logRefreshHistory({
          organizationId: token.organizationId,
          success: false,
          message: errorMsg,
          errorDetails: 'Missing refresh token',
          oldExpiresAt,
          newExpiresAt: null
        });
        return false;
      }

      // Charger la configuration OAuth de l'organisation (par-organisation)
      const googleConfig = await db.googleWorkspaceConfig.findUnique({
        where: { organizationId: token.organizationId }
      });

      // Si un adminEmail est défini, on ne refresh que le token associé à ce compte.
      // Cela évite de polluer le monitoring avec d'anciens tokens (non-admin) dans la même organisation.
      const adminEmail = googleConfig?.adminEmail?.trim().toLowerCase();
      const tokenEmail = token.googleEmail?.trim().toLowerCase();
      if (adminEmail && tokenEmail !== adminEmail) {
        console.log(`⏭️ [GoogleTokenScheduler] Token ignoré (non-admin) pour org ${token.organizationId}: ${token.googleEmail ?? '(sans googleEmail)'}`);
        return true;
      }

      const clientId = googleConfig?.clientId ? decrypt(googleConfig.clientId) : null;
      const clientSecret = googleConfig?.clientSecret ? decrypt(googleConfig.clientSecret) : null;

      if (!clientId || !clientSecret) {
        const errorMsg = 'Configuration OAuth (clientId/clientSecret) manquante ou invalide';
        console.error(`❌ [GoogleTokenScheduler] ${errorMsg} pour org ${token.organizationId}`);
        await this.logRefreshHistory({
          organizationId: token.organizationId,
          success: false,
          message: errorMsg,
          errorDetails: 'Missing or invalid encrypted OAuth credentials',
          oldExpiresAt,
          newExpiresAt: null
        });
        return false;
      }

      // Appeler l'API Google pour refresher le token
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: token.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const rawBody = await response.text();
        let googleError: string | undefined;
        let googleErrorDescription: string | undefined;
        try {
          const parsed = JSON.parse(rawBody) as { error?: string; error_description?: string };
          googleError = parsed.error;
          googleErrorDescription = parsed.error_description;
        } catch {
          // body non JSON
        }

        let errorMsg = `Erreur Google OAuth: ${response.status}`;
        if (googleError === 'invalid_grant') {
          errorMsg = 'Refresh token révoqué/invalide (réauthentification requise)';

          // Nettoyer le refresh token pour stopper les refreshs répétés et refléter l'état réel dans l'UI.
          try {
            await db.googleToken.update({
              where: { id: token.id },
              data: { refreshToken: null, updatedAt: new Date() }
            });
          } catch (cleanupError) {
            console.warn('[GoogleTokenScheduler] ⚠️ Impossible de nettoyer refreshToken après invalid_grant:', cleanupError);
          }
        } else if (googleError === 'invalid_client') {
          errorMsg = 'Client OAuth invalide (clientId/clientSecret incorrects)';
        } else if (googleError) {
          errorMsg = `Erreur Google OAuth (${googleError})`;
        }

        const errorDetails = [
          googleError ? `error=${googleError}` : null,
          googleErrorDescription ? `error_description=${googleErrorDescription}` : null,
          rawBody || null
        ].filter(Boolean).join(' | ');

        console.error(`❌ [GoogleTokenScheduler] ${errorMsg} pour org ${token.organizationId}:`, errorDetails);
        
        await this.logRefreshHistory({
          organizationId: token.organizationId,
          success: false,
          message: errorMsg,
          errorDetails,
          oldExpiresAt,
          newExpiresAt: null
        });
        return false;
      }

      const tokenData = await response.json();
      const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

      // Mettre à jour le token dans la base en utilisant l'ID du token
      await db.googleToken.update({
        where: { id: token.id },
        data: {
          accessToken: tokenData.access_token,
          expiresAt: newExpiresAt,
          updatedAt: new Date(),
          lastRefreshAt: new Date(),
          refreshCount: { increment: 1 },
          // Mettre à jour le refresh token s'il y en a un nouveau
          ...(tokenData.refresh_token && { refreshToken: tokenData.refresh_token }),
          // Mettre à jour le scope s'il y en a un nouveau
          ...(tokenData.scope && { scope: tokenData.scope })
        }
      });

      const successMsg = 'Token refreshed successfully';
      console.log(`✅ [GoogleTokenScheduler] ${successMsg} pour org ${token.organizationId}, expire à ${newExpiresAt.toISOString()}`);
      
      await this.logRefreshHistory({
        organizationId: token.organizationId,
        success: true,
        message: successMsg,
        errorDetails: null,
        oldExpiresAt,
        newExpiresAt
      });

      return true;

    } catch (error) {
      const errorMsg = 'Erreur lors du refresh du token';
      const errorDetails = error instanceof Error ? error.message : 'Erreur inconnue';
      
      console.error(`❌ [GoogleTokenScheduler] ${errorMsg} pour org ${token.organizationId}:`, error);
      
      await this.logRefreshHistory({
        organizationId: token.organizationId,
        success: false,
        message: errorMsg,
        errorDetails,
        oldExpiresAt,
        newExpiresAt: null
      });

      return false;
    }
  }

  private async logRefreshHistory({
    organizationId,
    success,
    message,
    errorDetails,
    oldExpiresAt,
    newExpiresAt
  }: {
    organizationId: string;
    success: boolean;
    message: string;
    errorDetails: string | null;
    oldExpiresAt: Date | null;
    newExpiresAt: Date | null;
  }): Promise<void> {
    try {
      await db.googleTokenRefreshHistory.create({
        data: {
          organizationId,
          success,
          message,
          errorDetails,
          oldExpiresAt,
          newExpiresAt,
          refreshedAt: new Date()
        }
      });
    } catch (error) {
      console.error('❌ [GoogleTokenScheduler] Erreur lors de l\'enregistrement de l\'historique:', error);
    }
  }
}

// Instance singleton
export const googleTokenScheduler = new GoogleTokenRefreshScheduler();
