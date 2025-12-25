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

const prisma = db;

/**
 * 🗑️ Nettoie les brouillons TBL expirés (>24h)
 * Exécuté : Toutes les heures
 */
export const cleanupExpiredStages = cron.schedule('0 * * * *', async () => {
  try {
    console.log('🧹 [CRON] Démarrage nettoyage brouillons TBL...');
    
    const result = await prisma.$executeRaw`
      SELECT cleanup_expired_tbl_stages();
    `;
    
    console.log(`✅ [CRON] Nettoyage brouillons terminé: ${result} supprimés`);
  } catch (error) {
    console.error('❌ [CRON] Erreur nettoyage brouillons:', error);
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
    console.log('🧹 [CRON] Démarrage nettoyage versions TBL...');
    
    const result = await prisma.$executeRaw`
      SELECT cleanup_old_tbl_versions();
    `;
    
    console.log(`✅ [CRON] Nettoyage versions terminé: ${result} supprimées`);
  } catch (error) {
    console.error('❌ [CRON] Erreur nettoyage versions:', error);
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
    console.log('🔓 [CRON] Démarrage libération locks TBL...');
    
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
    
    console.log(`✅ [CRON] Libération locks terminée: ${result.count} locks libérés`);
  } catch (error) {
    console.error('❌ [CRON] Erreur libération locks:', error);
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
    console.log('📊 [CRON] Génération statistiques TBL...');
    
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
    
    console.log('📊 [CRON] Statistiques TBL:');
    console.log(`  - Brouillons actifs: ${activeStages}`);
    console.log(`  - Submissions totales: ${totalSubmissions}`);
    console.log(`  - Versions totales: ${totalVersions}`);
    console.log(`  - Moyenne versions/submission: ${avgVersions}`);
    
  } catch (error) {
    console.error('❌ [CRON] Erreur génération stats:', error);
  }
}, {
  scheduled: true,
  timezone: 'Europe/Brussels'
});

/**
 * 🚀 Démarrer tous les jobs
 */
export function startTBLCronJobs() {
  console.log('🚀 [CRON] Démarrage des jobs TBL...');
  
  cleanupExpiredStages.start();
  console.log('  ✅ Nettoyage brouillons : Toutes les heures');
  
  cleanupOldVersions.start();
  console.log('  ✅ Nettoyage versions : Quotidien à 3h');
  
  releaseExpiredLocks.start();
  console.log('  ✅ Libération locks : Toutes les 30min');
  
  weeklyStats.start();
  console.log('  ✅ Statistiques : Hebdomadaire lundi 9h');
  
  console.log('✅ [CRON] Tous les jobs TBL sont actifs');
}

/**
 * 🛑 Arrêter tous les jobs
 */
export function stopTBLCronJobs() {
  console.log('🛑 [CRON] Arrêt des jobs TBL...');
  
  cleanupExpiredStages.stop();
  cleanupOldVersions.stop();
  releaseExpiredLocks.stop();
  weeklyStats.stop();
  
  console.log('✅ [CRON] Tous les jobs TBL sont arrêtés');
}

/**
 * 🔧 Exécuter un nettoyage manuel (pour tests)
 */
export async function runManualCleanup() {
  console.log('🔧 [MANUAL] Nettoyage manuel TBL...');
  
  try {
    // Brouillons
    const stages = await prisma.$executeRaw`SELECT cleanup_expired_tbl_stages();`;
    console.log(`  ✅ Brouillons: ${stages} supprimés`);
    
    // Versions
    const versions = await prisma.$executeRaw`SELECT cleanup_old_tbl_versions();`;
    console.log(`  ✅ Versions: ${versions} supprimées`);
    
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
    console.log(`  ✅ Locks: ${locks.count} libérés`);
    
    console.log('✅ [MANUAL] Nettoyage manuel terminé');
  } catch (error) {
    console.error('❌ [MANUAL] Erreur nettoyage manuel:', error);
    throw error;
  }
}

// Export default pour faciliter l'import
export default {
  start: startTBLCronJobs,
  stop: stopTBLCronJobs,
  runManual: runManualCleanup
};
