/**
 * 🔧 ROUTES API DE DIAGNOSTIC DU SYSTÈME DE NOTIFICATIONS
 */

import { Router } from 'express';
import { authMiddleware, type AuthenticatedRequest, requireRole } from '../middlewares/auth.js';
import UniversalNotificationService from '../services/UniversalNotificationService.js';
import { logger } from '../lib/logger';

const router = Router();

// Authentification requise pour toutes les routes
router.use(authMiddleware);

/**
 * GET /api/notifications-system/status
 * Obtenir le statut du système de notifications
 */
router.get('/status', async (req: AuthenticatedRequest, res) => {
  try {
    const universalService = UniversalNotificationService.getInstance();
    const status = { universal: !!universalService, started: true };
    
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ [NotificationSystemAPI] Erreur statut:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération du statut' 
    });
  }
});

/**
 * POST /api/notifications-system/test-email
 * Créer une notification email de test (Admin seulement)
 */
router.post('/test-email', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { userId, organizationId } = req.user!;
    
    const universalService = UniversalNotificationService.getInstance();
    
    await universalService.notifyNewEmail({
      emailId: 'test-' + Date.now(),
      from: 'system@2thier.be',
      subject: 'Test de notification - ' + new Date().toLocaleTimeString('fr-FR'),
      userId,
      organizationId
    });
    
    res.json({
      success: true,
      message: 'Notification email de test créée avec succès'
    });
    
  } catch (error) {
    logger.error('❌ [NotificationSystemAPI] Erreur test email:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la création de la notification test' 
    });
  }
});

/**
 * POST /api/notifications-system/test-lead
 * Créer une notification lead de test (Admin seulement)
 */
router.post('/test-lead', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { userId, organizationId } = req.user!;
    
    const universalService = UniversalNotificationService.getInstance();
    
    await universalService.notifyNewLead({
      leadId: 'test-lead-' + Date.now(),
      name: 'Lead de Test',
      email: 'test@example.com',
      phone: '+32 123 456 789',
      source: 'Test API',
      userId,
      organizationId
    });
    
    res.json({
      success: true,
      message: 'Notification lead de test créée avec succès'
    });
    
  } catch (error) {
    logger.error('❌ [NotificationSystemAPI] Erreur test lead:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la création de la notification test' 
    });
  }
});

/**
 * POST /api/notifications-system/test-call
 * Créer une notification appel manqué de test (Admin seulement)
 */
router.post('/test-call', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { userId, organizationId } = req.user!;
    
    const universalService = UniversalNotificationService.getInstance();
    
    await universalService.notifyMissedCall({
      from: '+32 123 456 789',
      duration: 0,
      userId,
      organizationId
    });
    
    res.json({
      success: true,
      message: 'Notification appel manqué de test créée avec succès'
    });
    
  } catch (error) {
    logger.error('❌ [NotificationSystemAPI] Erreur test appel:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la création de la notification test' 
    });
  }
});

/**
 * GET /api/notifications-system/stats/:organizationId
 * Obtenir les statistiques des notifications (Admin seulement)
 */
router.get('/stats/:organizationId', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { organizationId } = req.params;
    
    const universalService = UniversalNotificationService.getInstance();
    const stats = await universalService.getStats(organizationId);
    
    res.json({
      success: true,
      data: stats,
      organizationId
    });
    
  } catch (error) {
    logger.error('❌ [NotificationSystemAPI] Erreur stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des statistiques' 
    });
  }
});

/**
 * POST /api/notifications-system/restart
 * Redémarrer le système de notifications (Super Admin seulement)
 */
router.post('/restart', requireRole(['super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    
    const universalService = UniversalNotificationService.getInstance();
    if (universalService) {
      universalService.stop();
      universalService.start();
    }
    
    res.json({
      success: true,
      message: 'Système de notifications redémarré avec succès'
    });
    
  } catch (error) {
    logger.error('❌ [NotificationSystemAPI] Erreur redémarrage:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors du redémarrage du système' 
    });
  }
});

export default router;
