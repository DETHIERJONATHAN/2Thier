/**
 * 🧹 Job Cron - Nettoyage automatique TBL
 * 
 * Ce fichier contient les jobs planifiés pour :
 * 1. Nettoyer les brouillons expirés (toutes les heures)
 * 2. Nettoyer les vieilles versions (quotidien)
 * 3. Libérer les locks expirés (toutes les 30 minutes)
 */

import cron from 'node-cron';
import { db } from '../lib/database';
import { logger } from '../lib/logger';

const prisma = db;

/**
 * 🗑️ Nettoie les brouillons TBL expirés (>24h)
 * Exécuté : Toutes les heures
 */
export const cleanupExpiredStages = cron.schedule('0 * * * *', async () => {
  try {
    logger.debug('🧹 [CRON] Démarrage nettoyage brouillons TBL...');
    
    const result = await prisma.$executeRaw`
      SELECT cleanup_expired_tbl_stages();
    `;
    
    logger.debug(`✅ [CRON] Nettoyage brouillons terminé: ${result} supprimés`);
  } catch (error) {
    logger.error('❌ [CRON] Erreur nettoyage brouillons:', error);
  }
}, {
  scheduled: true,
  timezone: 'Europe/Brussels'
});

/**
 * 📚 Nettoie les vieilles versions (garde 20 dernières par submission)
 * Exécuté : Tous les jours à 3h du matin
 */
export const cleanupOldVersions = cron.schedule('0 3 * * *', async () => {
  try {
    logger.debug('🧹 [CRON] Démarrage nettoyage versions TBL...');
    
    const result = await prisma.$executeRaw`
      SELECT cleanup_old_tbl_versions();
    `;
    
    logger.debug(`✅ [CRON] Nettoyage versions terminé: ${result} supprimées`);
  } catch (error) {
    logger.error('❌ [CRON] Erreur nettoyage versions:', error);
  }
}, {
  scheduled: true,
  timezone: 'Europe/Brussels'
});

/**
 * 🔓 Libère les locks de submissions expirés (>1h)
 * Exécuté : Toutes les 30 minutes
 */
export const releaseExpiredLocks = cron.schedule('*/30 * * * *', async () => {
  try {
    logger.debug('🔓 [CRON] Démarrage libération locks TBL...');
    
    // Libérer les locks de plus d'1h
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const result = await prisma.treeBranchLeafSubmission.updateMany({
      where: {
        lockedAt: {
          lt: oneHourAgo
        },
        lockedBy: {
          not: null
        }
      },
      data: {
        lockedBy: null,
        lockedAt: null
      }
    });
    
    logger.debug(`✅ [CRON] Libération locks terminée: ${result.count} locks libérés`);
  } catch (error) {
    logger.error('❌ [CRON] Erreur libération locks:', error);
  }
}, {
  scheduled: true,
  timezone: 'Europe/Brussels'
});

/**
 * 📊 Statistiques de nettoyage (optionnel - pour monitoring)
 * Exécuté : Tous les lundis à 9h
 */
export const weeklyStats = cron.schedule('0 9 * * 1', async () => {
  try {
    logger.debug('📊 [CRON] Génération statistiques TBL...');
    
    // Compter les stages actifs
    const activeStages = await prisma.treeBranchLeafStage.count({
      where: {
        expiresAt: {
          gt: new Date()
        }
      }
    });
    
    // Compter les submissions
    const totalSubmissions = await prisma.treeBranchLeafSubmission.count();
    
    // Compter les versions totales
    const totalVersions = await prisma.treeBranchLeafSubmissionVersion.count();
    
    // Moyenne de versions par submission
    const avgVersions = totalSubmissions > 0 ? (totalVersions / totalSubmissions).toFixed(2) : 0;
    
    logger.debug('📊 [CRON] Statistiques TBL:');
    logger.debug(`  - Brouillons actifs: ${activeStages}`);
    logger.debug(`  - Submissions totales: ${totalSubmissions}`);
    logger.debug(`  - Versions totales: ${totalVersions}`);
    logger.debug(`  - Moyenne versions/submission: ${avgVersions}`);
    
  } catch (error) {
    logger.error('❌ [CRON] Erreur génération stats:', error);
  }
}, {
  scheduled: true,
  timezone: 'Europe/Brussels'
});

/**
 * 🚀 Démarrer tous les jobs
 */
export function startTBLCronJobs() {
  logger.debug('🚀 [CRON] Démarrage des jobs TBL...');
  
  cleanupExpiredStages.start();
  logger.debug('  ✅ Nettoyage brouillons : Toutes les heures');
  
  cleanupOldVersions.start();
  logger.debug('  ✅ Nettoyage versions : Quotidien à 3h');
  
  releaseExpiredLocks.start();
  logger.debug('  ✅ Libération locks : Toutes les 30min');
  
  weeklyStats.start();
  logger.debug('  ✅ Statistiques : Hebdomadaire lundi 9h');
  
  logger.debug('✅ [CRON] Tous les jobs TBL sont actifs');
}

/**
 * 🛑 Arrêter tous les jobs
 */
export function stopTBLCronJobs() {
  logger.debug('🛑 [CRON] Arrêt des jobs TBL...');
  
  cleanupExpiredStages.stop();
  cleanupOldVersions.stop();
  releaseExpiredLocks.stop();
  weeklyStats.stop();
  
  logger.debug('✅ [CRON] Tous les jobs TBL sont arrêtés');
}

/**
 * 🔧 Exécuter un nettoyage manuel (pour tests)
 */
export async function runManualCleanup() {
  logger.debug('🔧 [MANUAL] Nettoyage manuel TBL...');
  
  try {
    // Brouillons
    const stages = await prisma.$executeRaw`SELECT cleanup_expired_tbl_stages();`;
    logger.debug(`  ✅ Brouillons: ${stages} supprimés`);
    
    // Versions
    const versions = await prisma.$executeRaw`SELECT cleanup_old_tbl_versions();`;
    logger.debug(`  ✅ Versions: ${versions} supprimées`);
    
    // Locks
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const locks = await prisma.treeBranchLeafSubmission.updateMany({
      where: {
        lockedAt: { lt: oneHourAgo },
        lockedBy: { not: null }
      },
      data: {
        lockedBy: null,
        lockedAt: null
      }
    });
    logger.debug(`  ✅ Locks: ${locks.count} libérés`);
    
    logger.debug('✅ [MANUAL] Nettoyage manuel terminé');
  } catch (error) {
    logger.error('❌ [MANUAL] Erreur nettoyage manuel:', error);
    throw error;
  }
}

// Export default pour faciliter l'import
export default {
  start: startTBLCronJobs,
  stop: stopTBLCronJobs,
  runManual: runManualCleanup
};
