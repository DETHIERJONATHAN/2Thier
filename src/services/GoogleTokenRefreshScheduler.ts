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

import { prisma } from '../lib/prisma';

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
    await this.refreshAllTokens();
  }

  private async refreshAllTokens(): Promise<void> {
    try {
      console.log('🔄 [GoogleTokenScheduler] Début du refresh de tous les tokens...');
      this.lastRefreshTime = new Date();
      
      // Récupérer tous les tokens qui expirent dans moins de 10 minutes
      const tokensToRefresh = await prisma.googleToken.findMany({
        where: {
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
        },
        include: {
          Organization: true
        }
      });

      console.log(`🔍 [GoogleTokenScheduler] ${tokensToRefresh.length} tokens trouvés à refresher`);

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

      // Appeler l'API Google pour refresher le token
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          refresh_token: token.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        const errorMsg = `Erreur Google OAuth: ${response.status}`;
        console.error(`❌ [GoogleTokenScheduler] ${errorMsg} pour org ${token.organizationId}:`, errorData);
        
        await this.logRefreshHistory({
          organizationId: token.organizationId,
          success: false,
          message: errorMsg,
          errorDetails: errorData,
          oldExpiresAt,
          newExpiresAt: null
        });
        return false;
      }

      const tokenData = await response.json();
      const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

      // Mettre à jour le token dans la base
      await prisma.googleToken.update({
        where: { organizationId: token.organizationId },
        data: {
          accessToken: tokenData.access_token,
          expiresAt: newExpiresAt,
          updatedAt: new Date(),
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
      await prisma.googleTokenRefreshHistory.create({
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
