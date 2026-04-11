/**
 * 🚀 BATCH ROUTES - Endpoints optimisés pour les opérations en masse
 * 
 * Ces routes remplacent les boucles d'appels individuels par des requêtes batch.
 * Amélioration typique: N requêtes → 1 requête
 */

import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { google } from 'googleapis';

const router = Router();

// ============================================================================
// 🔐 Helper pour extraire le contexte d'auth
// ============================================================================

interface AuthContext {
  userId?: string;
  organizationId?: string | null;
  isSuperAdmin?: boolean;
}

function getAuthCtx(req: Request): AuthContext {
  const user = req.user;
  return {
    userId: user?.id,
    organizationId: user?.organizationId || null,
    isSuperAdmin: user?.isSuperAdmin || false
  };
}

// ============================================================================
// 📧 GMAIL BATCH OPERATIONS
// ============================================================================

/**
 * POST /api/batch/gmail/modify
 * Modifier plusieurs messages Gmail en une seule requête
 * 
 * Body: { messageIds: string[], addLabelIds?: string[], removeLabelIds?: string[] }
 */
router.post('/gmail/modify', async (req: Request, res: Response) => {
  try {
    const { userId, organizationId } = getAuthCtx(req);
    const { messageIds, addLabelIds = [], removeLabelIds = [] } = req.body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'messageIds requis (array non vide)' });
    }

    // Récupérer les tokens Google de l'utilisateur
    const googleToken = await db.googleToken.findFirst({
      where: { userId: userId! }
    });

    if (!googleToken) {
      return res.status(401).json({ error: 'Tokens Google non trouvés' });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: googleToken.accessToken,
      refresh_token: googleToken.refreshToken
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Utiliser l'API batch de Gmail (batchModify)
    await gmail.users.messages.batchModify({
      userId: 'me',
      requestBody: {
        ids: messageIds,
        addLabelIds,
        removeLabelIds
      }
    });

    res.json({ 
      success: true, 
      count: messageIds.length,
      message: `${messageIds.length} message(s) modifié(s)` 
    });

  } catch (error: any) {
    console.error('[BATCH] ❌ Gmail modify error:', error);
    res.status(500).json({ error: error.message || 'Erreur batch Gmail' });
  }
});

/**
 * POST /api/batch/gmail/trash
 * Mettre plusieurs messages à la corbeille en une seule requête
 * 
 * Body: { messageIds: string[] }
 */
router.post('/gmail/trash', async (req: Request, res: Response) => {
  try {
    const { userId } = getAuthCtx(req);
    const { messageIds } = req.body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'messageIds requis (array non vide)' });
    }

    const googleToken = await db.googleToken.findFirst({
      where: { userId: userId! }
    });

    if (!googleToken) {
      return res.status(401).json({ error: 'Tokens Google non trouvés' });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: googleToken.accessToken,
      refresh_token: googleToken.refreshToken
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Utiliser batchModify pour ajouter le label TRASH
    await gmail.users.messages.batchModify({
      userId: 'me',
      requestBody: {
        ids: messageIds,
        addLabelIds: ['TRASH'],
        removeLabelIds: ['INBOX']
      }
    });

    res.json({ 
      success: true, 
      count: messageIds.length,
      message: `${messageIds.length} message(s) mis à la corbeille` 
    });

  } catch (error: any) {
    console.error('[BATCH] ❌ Gmail trash error:', error);
    res.status(500).json({ error: error.message || 'Erreur batch Gmail' });
  }
});

/**
 * DELETE /api/batch/gmail/delete
 * Supprimer définitivement plusieurs messages Gmail
 * 
 * Body: { messageIds: string[] }
 */
router.delete('/gmail/delete', async (req: Request, res: Response) => {
  try {
    const { userId } = getAuthCtx(req);
    const { messageIds } = req.body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'messageIds requis (array non vide)' });
    }

    const googleToken = await db.googleToken.findFirst({
      where: { userId: userId! }
    });

    if (!googleToken) {
      return res.status(401).json({ error: 'Tokens Google non trouvés' });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: googleToken.accessToken,
      refresh_token: googleToken.refreshToken
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Utiliser l'API batch delete de Gmail
    await gmail.users.messages.batchDelete({
      userId: 'me',
      requestBody: {
        ids: messageIds
      }
    });

    res.json({ 
      success: true, 
      count: messageIds.length,
      message: `${messageIds.length} message(s) supprimé(s) définitivement` 
    });

  } catch (error: any) {
    console.error('[BATCH] ❌ Gmail delete error:', error);
    res.status(500).json({ error: error.message || 'Erreur batch Gmail' });
  }
});

// ============================================================================
// 👥 LEADS BATCH OPERATIONS
// ============================================================================

/**
 * PATCH /api/batch/leads/status
 * Mettre à jour le statut de plusieurs leads en une seule requête
 * 
 * Body: { leadIds: string[], statusId: string }
 */
router.patch('/leads/status', async (req: Request, res: Response) => {
  try {
    const { organizationId } = getAuthCtx(req);
    const { leadIds, statusId } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'leadIds requis (array non vide)' });
    }

    if (!statusId) {
      return res.status(400).json({ error: 'statusId requis' });
    }

    // Vérifier que le statut existe
    const status = await db.leadStatus.findUnique({
      where: { id: statusId }
    });

    if (!status) {
      return res.status(404).json({ error: 'Statut non trouvé' });
    }

    // Mise à jour batch avec Prisma
    const result = await db.lead.updateMany({
      where: {
        id: { in: leadIds },
        organizationId: organizationId || undefined
      },
      data: {
        leadStatusId: statusId,
        updatedAt: new Date()
      }
    });

    res.json({ 
      success: true, 
      count: result.count,
      message: `${result.count} lead(s) mis à jour` 
    });

  } catch (error: any) {
    console.error('[BATCH] ❌ Leads status error:', error);
    res.status(500).json({ error: error.message || 'Erreur batch leads' });
  }
});

/**
 * PATCH /api/batch/leads/assign
 * Assigner plusieurs leads à un utilisateur en une seule requête
 * 
 * Body: { leadIds: string[], assignedToId: string | null }
 */
router.patch('/leads/assign', async (req: Request, res: Response) => {
  try {
    const { organizationId } = getAuthCtx(req);
    const { leadIds, assignedToId } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'leadIds requis (array non vide)' });
    }

    // Mise à jour batch
    const result = await db.lead.updateMany({
      where: {
        id: { in: leadIds },
        organizationId: organizationId || undefined
      },
      data: {
        assignedToId: assignedToId || null,
        updatedAt: new Date()
      }
    });

    res.json({ 
      success: true, 
      count: result.count,
      message: `${result.count} lead(s) assigné(s)` 
    });

  } catch (error: any) {
    console.error('[BATCH] ❌ Leads assign error:', error);
    res.status(500).json({ error: error.message || 'Erreur batch leads' });
  }
});

/**
 * DELETE /api/batch/leads
 * Supprimer plusieurs leads en une seule requête
 * 
 * Body: { leadIds: string[] }
 */
router.delete('/leads', async (req: Request, res: Response) => {
  try {
    const { organizationId } = getAuthCtx(req);
    const { leadIds } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'leadIds requis (array non vide)' });
    }

    // Suppression batch
    const result = await db.lead.deleteMany({
      where: {
        id: { in: leadIds },
        organizationId: organizationId || undefined
      }
    });

    res.json({ 
      success: true, 
      count: result.count,
      message: `${result.count} lead(s) supprimé(s)` 
    });

  } catch (error: any) {
    console.error('[BATCH] ❌ Leads delete error:', error);
    res.status(500).json({ error: error.message || 'Erreur batch leads' });
  }
});

// ============================================================================
// 📋 FIELDS BATCH OPERATIONS (pour les formulaires dynamiques)
// ============================================================================

/**
 * POST /api/batch/fields/configs
 * Charger les configurations de plusieurs fields en une seule requête
 * 
 * Body: { fieldIds: string[] }
 */
router.post('/fields/configs', async (req: Request, res: Response) => {
  try {
    const { fieldIds } = req.body;

    if (!fieldIds || !Array.isArray(fieldIds) || fieldIds.length === 0) {
      return res.status(400).json({ error: 'fieldIds requis (array non vide)' });
    }

    // Charger toutes les configs en une seule requête
    const configs = await db.fieldConfig.findMany({
      where: {
        fieldId: { in: fieldIds }
      },
      include: {
        field: true
      }
    });

    // Organiser par fieldId pour faciliter l'accès côté client
    const configsByFieldId: Record<string, any> = {};
    for (const config of configs) {
      configsByFieldId[config.fieldId] = config;
    }

    res.json({ 
      success: true, 
      count: configs.length,
      configs: configsByFieldId 
    });

  } catch (error: any) {
    console.error('[BATCH] ❌ Fields configs error:', error);
    res.status(500).json({ error: error.message || 'Erreur batch fields' });
  }
});

// ============================================================================
// 🔧 MODULES BATCH OPERATIONS
// ============================================================================

/**
 * PATCH /api/batch/modules/toggle
 * Activer/désactiver plusieurs modules en une seule requête
 * 
 * Body: { moduleIds: string[], enabled: boolean }
 */
router.patch('/modules/toggle', async (req: Request, res: Response) => {
  try {
    const { organizationId } = getAuthCtx(req);
    const { moduleIds, enabled } = req.body;

    if (!moduleIds || !Array.isArray(moduleIds) || moduleIds.length === 0) {
      return res.status(400).json({ error: 'moduleIds requis (array non vide)' });
    }

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled requis (boolean)' });
    }

    // Mise à jour batch des modules
    const result = await db.organizationModule.updateMany({
      where: {
        moduleId: { in: moduleIds },
        organizationId: organizationId || undefined
      },
      data: {
        enabled,
        updatedAt: new Date()
      }
    });

    res.json({ 
      success: true, 
      count: result.count,
      message: `${result.count} module(s) ${enabled ? 'activé(s)' : 'désactivé(s)'}` 
    });

  } catch (error: any) {
    console.error('[BATCH] ❌ Modules toggle error:', error);
    res.status(500).json({ error: error.message || 'Erreur batch modules' });
  }
});

// ============================================================================
// 📊 ANALYTICS BATCH - Optimisation des requêtes de statistiques
// ============================================================================

/**
 * GET /api/batch/analytics/leads-by-status
 * Compte des leads par statut en UNE SEULE requête (au lieu de N requêtes)
 */
router.get('/analytics/leads-by-status', async (req: Request, res: Response) => {
  try {
    const { organizationId } = getAuthCtx(req);

    // Utiliser groupBy pour éviter N requêtes count individuelles
    const counts = await db.lead.groupBy({
      by: ['leadStatusId'],
      where: {
        organizationId: organizationId || undefined
      },
      _count: {
        id: true
      }
    });

    // Charger les noms des statuts
    const statusIds = counts.map(c => c.leadStatusId).filter(Boolean) as string[];
    const statuses = await db.leadStatus.findMany({
      where: { id: { in: statusIds } },
      select: { id: true, name: true, color: true }
    });

    const statusMap = new Map(statuses.map(s => [s.id, s]));

    const result = counts.map(c => ({
      statusId: c.leadStatusId,
      statusName: c.leadStatusId ? statusMap.get(c.leadStatusId)?.name : 'Sans statut',
      statusColor: c.leadStatusId ? statusMap.get(c.leadStatusId)?.color : '#999',
      count: c._count.id
    }));

    res.json({ success: true, data: result });

  } catch (error: any) {
    console.error('[BATCH] ❌ Analytics leads-by-status error:', error);
    res.status(500).json({ error: error.message || 'Erreur analytics' });
  }
});

/**
 * GET /api/batch/analytics/leads-by-source
 * Compte des leads par source en UNE SEULE requête
 */
router.get('/analytics/leads-by-source', async (req: Request, res: Response) => {
  try {
    const { organizationId } = getAuthCtx(req);

    const counts = await db.lead.groupBy({
      by: ['source'],
      where: {
        organizationId: organizationId || undefined
      },
      _count: {
        id: true
      }
    });

    const result = counts.map(c => ({
      source: c.source || 'Non définie',
      count: c._count.id
    }));

    res.json({ success: true, data: result });

  } catch (error: any) {
    console.error('[BATCH] ❌ Analytics leads-by-source error:', error);
    res.status(500).json({ error: error.message || 'Erreur analytics' });
  }
});

/**
 * GET /api/batch/analytics/leads-by-assignee
 * Compte des leads par assigné en UNE SEULE requête
 */
router.get('/analytics/leads-by-assignee', async (req: Request, res: Response) => {
  try {
    const { organizationId } = getAuthCtx(req);

    const counts = await db.lead.groupBy({
      by: ['assignedToId'],
      where: {
        organizationId: organizationId || undefined
      },
      _count: {
        id: true
      }
    });

    // Charger les noms des utilisateurs
    const userIds = counts.map(c => c.assignedToId).filter(Boolean) as string[];
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true }
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    const result = counts.map(c => ({
      assignedToId: c.assignedToId,
      assigneeName: c.assignedToId 
        ? `${userMap.get(c.assignedToId)?.firstName || ''} ${userMap.get(c.assignedToId)?.lastName || ''}`.trim()
        : 'Non assigné',
      count: c._count.id
    }));

    res.json({ success: true, data: result });

  } catch (error: any) {
    console.error('[BATCH] ❌ Analytics leads-by-assignee error:', error);
    res.status(500).json({ error: error.message || 'Erreur analytics' });
  }
});

export default router;
