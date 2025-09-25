import { PrismaClient } from '@prisma/client';
import { getResolver } from './TreeBranchLeafResolver';

/**
 * Service de tâches en arrière-plan pour le système TreeBranchLeaf
 */
export class TreeBranchLeafBackgroundJobService {
  private prisma: PrismaClient;
  private resolver: ReturnType<typeof getResolver>;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.resolver = getResolver(prisma);
  }

  /**
   * Démarre les tâches en arrière-plan
   */
  start(intervalMinutes = 15): void {
    if (this.isRunning) {
      console.warn('⚠️ Background jobs are already running');
      return;
    }

    console.log(`🚀 Starting TreeBranchLeaf background jobs (every ${intervalMinutes} minutes)`);
    
    // Exécution immédiate
    this.runBackgroundTasks();
    
    // Programmation récurrente
    this.intervalId = setInterval(
      () => this.runBackgroundTasks(),
      intervalMinutes * 60 * 1000
    );
    
    this.isRunning = true;
  }

  /**
   * Arrête les tâches en arrière-plan
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    console.log('🛑 TreeBranchLeaf background jobs stopped');
  }

  /**
   * Vérifie si les tâches sont en cours d'exécution
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Exécute toutes les tâches en arrière-plan
   */
  private async runBackgroundTasks(): Promise<void> {
    const startTime = Date.now();
    console.log('🔄 Running TreeBranchLeaf background tasks...');

    try {
      // Tâche 1: Résolution des opérations non résolues
      await this.resolver.resolveOperationsInBackground();

      // Tâche 2: Nettoyage des anciens caches
      await this.cleanupStaleCache();

      // Tâche 3: Recalcul des résultats obsolètes
      await this.recalculateStaleResults();

      // Tâche 4: Statistiques et monitoring
      await this.generateStatistics();

      const duration = Date.now() - startTime;
      console.log(`✅ Background tasks completed in ${duration}ms`);

    } catch (error) {
      console.error('❌ Background tasks failed:', error);
    }
  }

  /**
   * Nettoie les caches obsolètes (plus anciens que X jours)
   */
  private async cleanupStaleCache(staleDays = 7): Promise<void> {
    try {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - staleDays);

      const result = await this.prisma.treeBranchLeafSubmissionData.updateMany({
        where: {
          lastResolved: {
            lt: staleDate
          },
          operationDetail: {
            not: null
          }
        },
        data: {
          operationDetail: null,
          operationResult: null,
          lastResolved: null
        }
      });

      if (result.count > 0) {
        console.log(`🧹 Cleaned up ${result.count} stale cache entries older than ${staleDays} days`);
      }

    } catch (error) {
      console.error('Failed to cleanup stale cache:', error);
    }
  }

  /**
   * Recalcule les résultats pour les entrées qui ont des opérations résolues mais pas de résultat
   */
  private async recalculateStaleResults(): Promise<void> {
    try {
      const entriesNeedingCalculation = await this.prisma.treeBranchLeafSubmissionData.findMany({
        where: {
          operationDetail: { not: null },
          operationResult: null,
          operationSource: { not: null }
        },
        select: { id: true },
        take: 100 // Limiter pour éviter la surcharge
      });

      let calculated = 0;
      for (const entry of entriesNeedingCalculation) {
        try {
          await this.resolver.calculateAndCacheResult(entry.id);
          calculated++;
        } catch (error) {
          console.error(`Failed to calculate result for entry ${entry.id}:`, error);
        }
      }

      if (calculated > 0) {
        console.log(`🧮 Calculated results for ${calculated} entries`);
      }

    } catch (error) {
      console.error('Failed to recalculate stale results:', error);
    }
  }

  /**
   * Génère des statistiques sur l'état du système
   */
  private async generateStatistics(): Promise<void> {
    try {
      const stats = await this.prisma.treeBranchLeafSubmissionData.groupBy({
        by: ['operationSource'],
        where: {
          sourceRef: { not: null }
        },
        _count: {
          id: true
        }
      });

      const unresolvedCount = await this.prisma.treeBranchLeafSubmissionData.count({
        where: {
          sourceRef: { not: null },
          operationDetail: null
        }
      });

      const totalWithOperations = await this.prisma.treeBranchLeafSubmissionData.count({
        where: {
          sourceRef: { not: null }
        }
      });

      console.log('📊 TreeBranchLeaf Statistics:');
      console.log(`   Total entries with operations: ${totalWithOperations}`);
      console.log(`   Unresolved operations: ${unresolvedCount}`);
      
      stats.forEach(stat => {
        console.log(`   ${stat.operationSource}: ${stat._count.id} entries`);
      });

      // Alertes si trop d'entrées non résolues
      if (unresolvedCount > 100) {
        console.warn(`⚠️ High number of unresolved operations: ${unresolvedCount}`);
      }

    } catch (error) {
      console.error('Failed to generate statistics:', error);
    }
  }

  /**
   * Force une synchronisation complète (à utiliser avec précaution)
   */
  async forceFullSync(): Promise<void> {
    console.log('🔄 Starting forced full synchronization...');
    
    try {
      // Invalider tous les caches
      await this.prisma.treeBranchLeafSubmissionData.updateMany({
        where: {
          sourceRef: { not: null }
        },
        data: {
          operationDetail: null,
          operationResult: null,
          lastResolved: null
        }
      });

      // Relancer les tâches en arrière-plan
      await this.runBackgroundTasks();
      
      console.log('✅ Forced full synchronization completed');
      
    } catch (error) {
      console.error('❌ Forced full synchronization failed:', error);
      throw error;
    }
  }

  /**
   * Teste la connectivité et le bon fonctionnement du service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: unknown }> {
    try {
      // Test de connectivité à la base de données
      await this.prisma.$queryRaw`SELECT 1`;
      
      // Test de comptage basique
      const count = await this.prisma.treeBranchLeafSubmissionData.count();
      
      return {
        status: 'healthy',
        details: {
          isRunning: this.isRunning,
          databaseConnected: true,
          totalSubmissionData: count,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          isRunning: this.isRunning,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}

// Instance singleton pour la gestion globale
let backgroundJobInstance: TreeBranchLeafBackgroundJobService | null = null;

export function getBackgroundJobService(prisma: PrismaClient): TreeBranchLeafBackgroundJobService {
  if (!backgroundJobInstance) {
    backgroundJobInstance = new TreeBranchLeafBackgroundJobService(prisma);
  }
  return backgroundJobInstance;
}

// Gestionnaire pour l'arrêt propre
export function setupGracefulShutdown(): void {
  const shutdownHandler = () => {
    if (backgroundJobInstance) {
      console.log('🛑 Graceful shutdown: stopping background jobs...');
      backgroundJobInstance.stop();
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdownHandler);
  process.on('SIGTERM', shutdownHandler);
}