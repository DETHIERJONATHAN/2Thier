import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma';

const router = Router();

// Appliquer l'authentification à toutes les routes
router.use(authMiddleware);

// GET /api/settings/lead-statuses
router.get('/lead-statuses', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }
    
    console.log('[LEAD-STATUSES] Récupération des statuts pour l\'organisation:', organizationId);
    
    const statuses = await prisma.leadStatus.findMany({
      where: {
        organizationId: organizationId
      },
      orderBy: {
        order: 'asc'
      }
    });
    
    console.log(`[LEAD-STATUSES] ${statuses.length} statuts trouvés`);
    res.json(statuses);
    
  } catch (error) {
    console.error('[LEAD-STATUSES] Erreur lors de la récupération des statuts:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des statuts',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// POST /api/settings/lead-statuses
router.post('/lead-statuses', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }
    
    const { name, color, order, isDefault } = req.body;
    
    // Si isDefault est true, retirer le flag default des autres statuts
    if (isDefault) {
      await prisma.leadStatus.updateMany({
        where: {
          organizationId: organizationId,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
    }
    
    const newStatus = await prisma.leadStatus.create({
      data: {
        name,
        color,
        order: order || 0,
        isDefault: isDefault || false,
        organizationId
      }
    });
    
    console.log('[LEAD-STATUSES] Nouveau statut créé:', newStatus.name);
    res.status(201).json(newStatus);
    
  } catch (error) {
    console.error('[LEAD-STATUSES] Erreur lors de la création du statut:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création du statut',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// PUT /api/settings/lead-statuses/reorder (DOIT ÊTRE AVANT la route :id)
router.put('/lead-statuses/reorder', async (req, res) => {
  console.log('🚨 [DEBUG] LEAD-STATUSES REORDER - ROUTE APPELÉE !');
  console.log('🚨 [DEBUG] Body received:', req.body);
  console.log('🚨 [DEBUG] Headers:', req.headers);
  
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    
    if (!organizationId) {
      console.log('🚨 [DEBUG] PAS D\'ORG ID');
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }

    const { statuses } = req.body; // Format: [{ id: 'uuid', order: 0 }]
    
    if (!Array.isArray(statuses)) {
      console.log('🚨 [DEBUG] PAS UN ARRAY:', typeof statuses, statuses);
      return res.status(400).json({ 
        error: 'Array de statuts requis' 
      });
    }

    console.log('[LEAD-STATUSES] 📥 DONNÉES REÇUES:', JSON.stringify(statuses, null, 2));
    console.log('[LEAD-STATUSES] 📊 Réorganisation de', statuses.length, 'statuts pour org:', organizationId);

    // Vérifier que chaque statut a un id et un order
    for (const status of statuses) {
      if (!status.id || status.order === undefined) {
        console.error('[LEAD-STATUSES] ❌ Statut invalide:', status);
        return res.status(400).json({ 
          error: `Statut invalide: ${JSON.stringify(status)}` 
        });
      }
    }

    // Mettre à jour l'ordre de chaque statut avec logs détaillés
    const updatePromises = statuses.map(async (status: { id: string; order: number }) => {
      console.log(`[LEAD-STATUSES] 🔄 Mise à jour ${status.id} -> order: ${status.order}`);
      const result = await prisma.leadStatus.updateMany({
        where: { id: status.id, organizationId },
        data: { order: status.order }
      });
      console.log(`[LEAD-STATUSES] ✅ Résultat pour ${status.id}: ${result.count} ligne(s) modifiée(s)`);
      return result;
    });

    const results = await Promise.all(updatePromises);
    console.log('[LEAD-STATUSES] 📋 Résultats globaux:', results.map(r => r.count));

    res.json({
      success: true,
      message: 'Ordre mis à jour avec succès'
    });
  } catch (error) {
    console.error('[LEAD-STATUSES] Erreur lors de la réorganisation:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la réorganisation' 
    });
  }
});

// PUT /api/settings/lead-statuses/:id (DOIT ÊTRE APRÈS la route /reorder)
router.put('/lead-statuses/:id', (req, res) => {
  console.log('[ROUTE] PUT /api/settings/lead-statuses/:id atteint', req.params.id);
  // Logique de placeholder
  res.status(200).json({ id: req.params.id, ...req.body });
});

// DELETE /api/settings/lead-statuses/:id
router.delete('/lead-statuses/:id', (req, res) => {
  console.log('[ROUTE] DELETE /api/settings/lead-statuses/:id atteint', req.params.id);
  // Logique de placeholder
  res.status(204).send();
});

// ===== ROUTES CALL STATUSES =====

// GET /api/settings/call-statuses
router.get('/call-statuses', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }
    
    console.log('[CALL-STATUSES] Récupération des statuts pour l\'organisation:', organizationId);
    
    const callStatuses = await prisma.callStatus.findMany({
      where: {
        organizationId: organizationId
      },
      orderBy: {
        order: 'asc'
      }
    });
    
      // Si aucun statut d'appel, ne rien créer par défaut
      if (callStatuses.length === 0) {
        console.log('[CALL-STATUSES] Aucun statut trouvé');
      }    console.log(`[CALL-STATUSES] ${callStatuses.length} statuts trouvés`);
    res.json(callStatuses);
    
  } catch (error) {
    console.error('[CALL-STATUSES] Erreur lors de la récupération des statuts:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des statuts d\'appel',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// POST /api/settings/call-statuses (bulk save)
router.post('/call-statuses', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }
    
    const statuses = req.body;
    
    if (!Array.isArray(statuses)) {
      return res.status(400).json({ 
        error: 'Le corps de la requête doit être un tableau de statuts' 
      });
    }
    
    console.log(`[CALL-STATUSES] Sauvegarde en lot de ${statuses.length} statuts`);
    
    // Supprimer tous les statuts existants pour cette organisation
    await prisma.callStatus.deleteMany({
      where: {
        organizationId: organizationId
      }
    });
    
    // Créer les nouveaux statuts
    const savedStatuses = [];
    for (let i = 0; i < statuses.length; i++) {
      const status = statuses[i];
      const savedStatus = await prisma.callStatus.create({
        data: {
          name: status.name,
          color: status.color,
          order: i,
          organizationId
        }
      });
      savedStatuses.push(savedStatus);
    }
    
    console.log(`[CALL-STATUSES] ${savedStatuses.length} statuts sauvegardés`);
    res.json(savedStatuses);
    
  } catch (error) {
    console.error('[CALL-STATUSES] Erreur lors de la sauvegarde des statuts:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la sauvegarde des statuts d\'appel',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// POST /api/settings/call-statuses/reorder
router.post('/call-statuses/reorder', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }
    
    const { statusIds } = req.body;
    
    if (!Array.isArray(statusIds)) {
      return res.status(400).json({ 
        error: 'statusIds doit être un tableau' 
      });
    }
    
    console.log(`[CALL-STATUSES] Réorganisation de ${statusIds.length} statuts`);
    
    // Mettre à jour l'ordre des statuts
    for (let i = 0; i < statusIds.length; i++) {
      await prisma.callStatus.update({
        where: {
          id: statusIds[i],
          organizationId: organizationId
        },
        data: {
          order: i
        }
      });
    }
    
    // Récupérer les statuts mis à jour
    const updatedStatuses = await prisma.callStatus.findMany({
      where: {
        organizationId: organizationId
      },
      orderBy: {
        order: 'asc'
      }
    });
    
    console.log(`[CALL-STATUSES] Réorganisation terminée`);
    res.json(updatedStatuses);
    
  } catch (error) {
    console.error('[CALL-STATUSES] Erreur lors de la réorganisation:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la réorganisation des statuts d\'appel',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// PUT /api/settings/call-statuses/reorder (alias PUT pour POST)
router.put('/call-statuses/reorder', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }

    const { statuses } = req.body; // Format: [{ id: 'uuid', order: 0 }]
    
    if (!Array.isArray(statuses)) {
      return res.status(400).json({ 
        error: 'Array de statuts requis' 
      });
    }

    console.log(`[CALL-STATUSES] PUT Réorganisation de ${statuses.length} statuts`);

    // Mettre à jour l'ordre de chaque statut
    const updatePromises = statuses.map((status: { id: string; order: number }) =>
      prisma.callStatus.update({
        where: { id: status.id },
        data: { order: status.order }
      })
    );

    await Promise.all(updatePromises);

    console.log(`[CALL-STATUSES] PUT Réorganisation terminée`);
    res.json({
      success: true,
      message: 'Ordre mis à jour avec succès'
    });
  } catch (error) {
    console.error('[CALL-STATUSES] PUT Erreur lors de la réorganisation:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la réorganisation des statuts d\'appel',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// POST /api/settings/call-statuses/add
router.post('/call-statuses/add', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }
    
    const { name, color } = req.body;
    
    if (!name || !color) {
      return res.status(400).json({ 
        error: 'Le nom et la couleur sont requis' 
      });
    }
    
    // Obtenir le prochain ordre
    const maxOrder = await prisma.callStatus.aggregate({
      where: {
        organizationId: organizationId
      },
      _max: {
        order: true
      }
    });
    
    const nextOrder = (maxOrder._max.order || 0) + 1;
    
    const newStatus = await prisma.callStatus.create({
      data: {
        name,
        color,
        order: nextOrder,
        organizationId
      }
    });
    
    console.log(`[CALL-STATUSES] Nouveau statut créé: ${newStatus.name}`);
    res.status(201).json(newStatus);
    
  } catch (error) {
    console.error('[CALL-STATUSES] Erreur lors de la création du statut:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création du statut d\'appel',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// PUT /api/settings/call-statuses/:id
router.put('/call-statuses/:id', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }
    
    const { id } = req.params;
    const { name, color } = req.body;
    
    console.log(`[CALL-STATUSES] Mise à jour du statut ${id}`);
    
    const updatedStatus = await prisma.callStatus.update({
      where: {
        id: id,
        organizationId: organizationId
      },
      data: {
        name,
        color
      }
    });
    
    console.log(`[CALL-STATUSES] Statut mis à jour: ${updatedStatus.name}`);
    res.json(updatedStatus);
    
  } catch (error) {
    console.error('[CALL-STATUSES] Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour du statut d\'appel',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// DELETE /api/settings/call-statuses/:id
router.delete('/call-statuses/:id', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }
    
    const { id } = req.params;
    
    console.log(`[CALL-STATUSES] Suppression du statut ${id}`);
    
    await prisma.callStatus.delete({
      where: {
        id: id,
        organizationId: organizationId
      }
    });
    
    console.log(`[CALL-STATUSES] Statut supprimé`);
    res.status(204).send();
    
  } catch (error) {
    console.error('[CALL-STATUSES] Erreur lors de la suppression du statut:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la suppression du statut d\'appel',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// ===== ROUTES CALL TO LEAD MAPPING =====

// GET /api/settings/call-to-lead-mappings
router.get('/call-to-lead-mappings', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }
    
    console.log('[MAPPINGS] Récupération des mappings pour l\'organisation:', organizationId);
    
    const mappings = await prisma.callToLeadMapping.findMany({
      where: {
        organizationId: organizationId,
        isActive: true
      },
      include: {
        CallStatus: true,
        LeadStatus: true
      },
      orderBy: {
        priority: 'asc'
      }
    });
    
    console.log(`[MAPPINGS] ${mappings.length} mappings trouvés`);
    res.json(mappings);
    
  } catch (error) {
    console.error('[MAPPINGS] Erreur lors de la récupération des mappings:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des mappings',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// POST /api/settings/call-to-lead-mappings
router.post('/call-to-lead-mappings', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }
    
    const { callStatusId, leadStatusId, condition, priority } = req.body;
    
    if (!callStatusId || !leadStatusId) {
      return res.status(400).json({ 
        error: 'callStatusId et leadStatusId sont requis' 
      });
    }
    
    console.log(`[MAPPINGS] Création d'un mapping: ${callStatusId} -> ${leadStatusId}`);
    
    const mapping = await prisma.callToLeadMapping.create({
      data: {
        organizationId,
        callStatusId,
        leadStatusId,
        condition: condition || null,
        priority: priority || 0
      },
      include: {
        CallStatus: true,
        LeadStatus: true
      }
    });
    
    console.log(`[MAPPINGS] Mapping créé: ${mapping.id}`);
    res.status(201).json(mapping);
    
  } catch (error) {
    console.error('[MAPPINGS] Erreur lors de la création du mapping:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création du mapping',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// PUT /api/settings/call-to-lead-mappings/:id
router.put('/call-to-lead-mappings/:id', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }
    
    const { id } = req.params;
    const { callStatusId, leadStatusId, condition, priority, isActive } = req.body;
    
    console.log(`[MAPPINGS] Mise à jour du mapping ${id}`);
    
    const mapping = await prisma.callToLeadMapping.update({
      where: {
        id: id,
        organizationId: organizationId
      },
      data: {
        callStatusId,
        leadStatusId,
        condition,
        priority,
        isActive
      },
      include: {
        CallStatus: true,
        LeadStatus: true
      }
    });
    
    console.log(`[MAPPINGS] Mapping mis à jour: ${mapping.id}`);
    res.json(mapping);
    
  } catch (error) {
    console.error('[MAPPINGS] Erreur lors de la mise à jour du mapping:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour du mapping',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// DELETE /api/settings/call-to-lead-mappings/:id
router.delete('/call-to-lead-mappings/:id', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }
    
    const { id } = req.params;
    
    console.log(`[MAPPINGS] Suppression du mapping ${id}`);
    
    await prisma.callToLeadMapping.delete({
      where: {
        id: id,
        organizationId: organizationId
      }
    });
    
    console.log(`[MAPPINGS] Mapping supprimé`);
    res.status(204).send();
    
  } catch (error) {
    console.error('[MAPPINGS] Erreur lors de la suppression du mapping:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la suppression du mapping',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// POST /api/settings/call-to-lead-mappings/bulk
router.post('/call-to-lead-mappings/bulk', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }
    
    const { mappings } = req.body;
    
    if (!Array.isArray(mappings)) {
      return res.status(400).json({ 
        error: 'mappings doit être un tableau' 
      });
    }
    
    console.log(`[MAPPINGS] Sauvegarde en lot de ${mappings.length} mappings`);
    
    // Supprimer tous les mappings existants
    await prisma.callToLeadMapping.deleteMany({
      where: {
        organizationId: organizationId
      }
    });
    
    // Créer les nouveaux mappings
    const savedMappings = [];
    for (let i = 0; i < mappings.length; i++) {
      const mapping = mappings[i];
      const savedMapping = await prisma.callToLeadMapping.create({
        data: {
          organizationId,
          callStatusId: mapping.callStatusId,
          leadStatusId: mapping.leadStatusId,
          condition: mapping.condition || null,
          priority: i,
          isActive: mapping.isActive !== false
        },
        include: {
          CallStatus: true,
          LeadStatus: true
        }
      });
      savedMappings.push(savedMapping);
    }
    
    console.log(`[MAPPINGS] ${savedMappings.length} mappings sauvegardés`);
    res.json(savedMappings);
    
  } catch (error) {
    console.error('[MAPPINGS] Erreur lors de la sauvegarde des mappings:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la sauvegarde des mappings',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// GET /api/settings/call-lead-mappings
router.get('/call-lead-mappings', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }
    
    console.log('[MAPPINGS] Récupération des mappings pour l\'organisation:', organizationId);
    
    const mappings = await prisma.callToLeadMapping.findMany({
      where: {
        organizationId: organizationId
      },
      include: {
        CallStatus: true,
        LeadStatus: true
      },
      orderBy: {
        priority: 'asc'
      }
    });
    
    console.log(`[MAPPINGS] ${mappings.length} mappings trouvés`);
    res.json(mappings);
    
  } catch (error) {
    console.error('[MAPPINGS] Erreur lors de la récupération des mappings:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des mappings',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// GET /api/settings/call-lead-mappings
router.get('/call-lead-mappings', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }
    
    console.log('[MAPPINGS] Récupération des mappings pour l\'organisation:', organizationId);
    
    const mappings = await prisma.callToLeadMapping.findMany({
      where: {
        organizationId: organizationId
      },
      include: {
        CallStatus: true,
        LeadStatus: true
      },
      orderBy: {
        priority: 'asc'
      }
    });
    
    console.log(`[MAPPINGS] ${mappings.length} mappings trouvés`);
    res.json(mappings);
    
  } catch (error) {
    console.error('[MAPPINGS] Erreur lors de la récupération des mappings:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des mappings',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// GET /api/settings/email-templates
router.get('/email-templates', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }

    const templates = await prisma.emailTemplate.findMany({
      where: { organizationId }
    });

    res.json(templates);
  } catch (error) {
    console.error('[TEMPLATES] Erreur lors de la récupération des modèles:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des modèles',
      message: error instanceof Error ? error.message : 'Erreur inconnue'  
    });
  }
});

// POST /api/settings/email-templates - Créer un template email
router.post('/email-templates', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    if (!organizationId) return res.status(400).json({ error: 'Organisation non spécifiée' });

    const { name, subject, content, type } = req.body;
    if (!name || !content) return res.status(400).json({ error: 'Nom et contenu requis' });

    const template = await prisma.emailTemplate.create({
      data: {
        id: `et_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        organizationId,
        name,
        subject: subject || '',
        content,
        type: type || 'general',
        updatedAt: new Date(),
      }
    });

    console.log('[TEMPLATES] ✅ Template email créé:', template.id);
    res.status(201).json(template);
  } catch (error) {
    console.error('[TEMPLATES] Erreur création template:', error);
    res.status(500).json({ error: 'Erreur lors de la création du modèle', message: error instanceof Error ? error.message : 'Erreur inconnue' });
  }
});

// PUT /api/settings/email-templates/:id - Modifier un template email
router.put('/email-templates/:id', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    if (!organizationId) return res.status(400).json({ error: 'Organisation non spécifiée' });

    const { name, subject, content, type } = req.body;
    const template = await prisma.emailTemplate.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(subject !== undefined && { subject }),
        ...(content !== undefined && { content }),
        ...(type && { type }),
        updatedAt: new Date(),
      }
    });

    console.log('[TEMPLATES] ✅ Template email modifié:', template.id);
    res.json(template);
  } catch (error) {
    console.error('[TEMPLATES] Erreur modification template:', error);
    res.status(500).json({ error: 'Erreur lors de la modification du modèle', message: error instanceof Error ? error.message : 'Erreur inconnue' });
  }
});

// DELETE /api/settings/email-templates/:id - Supprimer un template email
router.delete('/email-templates/:id', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    if (!organizationId) return res.status(400).json({ error: 'Organisation non spécifiée' });

    await prisma.emailTemplate.delete({ where: { id: req.params.id } });
    console.log('[TEMPLATES] ✅ Template email supprimé:', req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('[TEMPLATES] Erreur suppression template:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du modèle', message: error instanceof Error ? error.message : 'Erreur inconnue' });
  }
});

// GET /api/settings/lead-sources
router.get('/lead-sources', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }

    const sources = await prisma.leadSource.findMany({
      where: { organizationId }
    });

    res.json(sources);
  } catch (error) {
    console.error('[SOURCES] Erreur lors de la récupération des sources:', error); 
    res.status(500).json({
      error: 'Erreur lors de la récupération des sources',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// POST /api/settings/call-lead-mappings  
router.post('/call-lead-mappings', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }
    
    const { callStatusId, leadStatusId, priority, description } = req.body;
    
    console.log('[MAPPINGS] Création d\'un nouveau mapping:', {
      callStatusId,
      leadStatusId,
      organizationId,
      priority
    });
    
    const newMapping = await prisma.callToLeadMapping.create({
      data: {
        callStatusId,
        leadStatusId,
        organizationId,
        priority: priority || 1,
        description: description || null
      },
      include: {
        CallStatus: true,
        LeadStatus: true
      }
    });
    
    console.log('[MAPPINGS] Nouveau mapping créé:', newMapping.id);
    res.status(201).json(newMapping);
    
  } catch (error) {
    console.error('[MAPPINGS] Erreur lors de la création du mapping:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création du mapping',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// PUT /api/settings/call-lead-mappings/:id
router.put('/call-lead-mappings/:id', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    const mappingId = req.params.id;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }
    
    const { callStatusId, leadStatusId, priority, description } = req.body;
    
    console.log('[MAPPINGS] Mise à jour du mapping:', mappingId);
    
    const updatedMapping = await prisma.callToLeadMapping.update({
      where: {
        id: mappingId,
        organizationId: organizationId
      },
      data: {
        callStatusId,
        leadStatusId,
        priority,
        description
      },
      include: {
        CallStatus: true,
        LeadStatus: true
      }
    });
    
    console.log('[MAPPINGS] Mapping mis à jour:', updatedMapping.id);
    res.json(updatedMapping);
    
  } catch (error) {
    console.error('[MAPPINGS] Erreur lors de la mise à jour du mapping:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour du mapping',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// DELETE /api/settings/call-lead-mappings/:id
router.delete('/call-lead-mappings/:id', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    const mappingId = req.params.id;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }
    
    console.log('[MAPPINGS] Suppression du mapping:', mappingId);
    
    await prisma.callToLeadMapping.delete({
      where: {
        id: mappingId,
        organizationId: organizationId
      }
    });
    
    console.log('[MAPPINGS] Mapping supprimé:', mappingId);
    res.status(204).send();
    
  } catch (error) {
    console.error('[MAPPINGS] Erreur lors de la suppression du mapping:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la suppression du mapping',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// POST /api/settings/call-lead-mappings - Créer un nouveau mapping
router.post('/call-lead-mappings', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }
    
    const { callStatusId, leadStatusId, priority } = req.body;
    
    if (!callStatusId || !leadStatusId) {
      return res.status(400).json({ 
        error: 'callStatusId et leadStatusId sont requis' 
      });
    }
    
    console.log('[MAPPING] Création d\'un nouveau mapping:', { callStatusId, leadStatusId, priority });
    
    // Vérifier si un mapping existe déjà pour ce statut d'appel
    const existingMapping = await prisma.callToLeadMapping.findFirst({
      where: {
        callStatusId: callStatusId,
        organizationId: organizationId
      }
    });
    
    if (existingMapping) {
      // Mettre à jour le mapping existant
      const updatedMapping = await prisma.callToLeadMapping.update({
        where: { id: existingMapping.id },
        data: {
          leadStatusId: leadStatusId,
          priority: priority || existingMapping.priority
        },
        include: {
          CallStatus: true,
          LeadStatus: true
        }
      });
      
      console.log('[MAPPING] Mapping mis à jour:', updatedMapping.id);
      return res.json(updatedMapping);
    } else {
      // Créer un nouveau mapping
      const newMapping = await prisma.callToLeadMapping.create({
        data: {
          callStatusId: callStatusId,
          leadStatusId: leadStatusId,
          organizationId: organizationId,
          priority: priority || 1
        },
        include: {
          CallStatus: true,
          LeadStatus: true
        }
      });
      
      console.log('[MAPPING] Nouveau mapping créé:', newMapping.id);
      return res.json(newMapping);
    }
    
  } catch (error) {
    console.error('[MAPPING] Erreur lors de la création du mapping:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création du mapping',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// PUT /api/settings/call-lead-mappings/:id - Modifier un mapping
router.put('/call-lead-mappings/:id', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    const mappingId = req.params.id;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }
    
    const { callStatusId, leadStatusId, priority } = req.body;
    
    console.log('[MAPPING] Modification du mapping:', mappingId, { callStatusId, leadStatusId, priority });
    
    const updatedMapping = await prisma.callToLeadMapping.update({
      where: { 
        id: mappingId,
        organizationId: organizationId 
      },
      data: {
        ...(callStatusId && { callStatusId }),
        ...(leadStatusId && { leadStatusId }),
        ...(priority !== undefined && { priority })
      },
      include: {
        CallStatus: true,
        LeadStatus: true
      }
    });
    
    console.log('[MAPPING] Mapping mis à jour:', updatedMapping.id);
    res.json(updatedMapping);
    
  } catch (error) {
    console.error('[MAPPING] Erreur lors de la modification du mapping:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la modification du mapping',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// DELETE /api/settings/call-lead-mappings/:id - Supprimer un mapping
router.delete('/call-lead-mappings/:id', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    const mappingId = req.params.id;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }
    
    console.log('[MAPPING] Suppression du mapping:', mappingId);
    
    await prisma.callToLeadMapping.delete({
      where: { 
        id: mappingId,
        organizationId: organizationId 
      }
    });
    
    console.log('[MAPPING] Mapping supprimé:', mappingId);
    res.json({ success: true, message: 'Mapping supprimé avec succès' });
    
  } catch (error) {
    console.error('[MAPPING] Erreur lors de la suppression du mapping:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la suppression du mapping',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// 🚀 POST /api/settings/initialize-default-statuses - Initialiser les statuts par défaut
router.post('/initialize-default-statuses', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }

    console.log('🚀 [INIT] Initialisation des statuts par défaut pour l\'organisation:', organizationId);

    // 1) Statuts d'appel par défaut (15 statuts selon cahier des charges)
    const defaultCallStatuses = [
      { name: "📞 Pas de réponse", description: "Le client n'a pas décroché", color: "#f39c12", icon: "📞", order: 1 },
      { name: "📞 Numéro incorrect / injoignable", description: "Numéro invalide ou injoignable", color: "#e74c3c", icon: "📞", order: 2 },
      { name: "📞 Rappel programmé", description: "Rappel planifié avec le client", color: "#3498db", icon: "📞", order: 3 },
      { name: "📞 Contacté – Pas intéressé", description: "Client contacté mais pas intéressé", color: "#e67e22", icon: "📞", order: 4 },
      { name: "📞 Contacté – Non qualifié", description: "Lead ne correspond pas à nos critères", color: "#95a5a6", icon: "⚠️", order: 5 },
      { name: "📞 Contacté – À rappeler plus tard", description: "Client demande à être rappelé plus tard", color: "#f1c40f", icon: "📞", order: 6 },
      { name: "📞 Contacté – Information envoyée (mail/sms)", description: "Informations envoyées au client", color: "#9b59b6", icon: "📞", order: 7 },
      { name: "📞 Contacté – Rendez-vous fixé", description: "RDV fixé avec le client", color: "#2ecc71", icon: "📞", order: 8 },
      { name: "📞 Contacté – Refus (non direct à l'appel)", description: "Refus lors de l'appel", color: "#c0392b", icon: "📞", order: 9 },
      { name: "📞 Contacté – Refus ferme (après devis/visite)", description: "Refus définitif après devis/visite", color: "#8e44ad", icon: "📞", order: 10 },
      { name: "📞 Contacté – Refus définitif", description: "Refus définitif du prospect", color: "#a93226", icon: "❌", order: 11 },
      { name: "📞 Contacté – Devis demandé", description: "Client demande un devis", color: "#16a085", icon: "📞", order: 12 },
      { name: "📞 Contacté – Devis envoyé", description: "Devis envoyé au client", color: "#27ae60", icon: "📞", order: 13 },
      { name: "📞 Contacté – En négociation", description: "Négociation en cours", color: "#f39c12", icon: "📞", order: 14 },
      { name: "📞 Contacté – Gagné (vente conclue)", description: "Vente finalisée", color: "#2ecc71", icon: "📞", order: 15 }
    ];

    // 2) Statuts de leads par défaut (14 statuts selon cahier des charges)
    const defaultLeadStatuses = [
      { name: "🟢 Nouveau lead", description: "Lead nouvellement créé", color: "#2ecc71", order: 1 },
      { name: "🟡 Contacter (dès le 1er appel tenté)", description: "À contacter dès le premier appel", color: "#f1c40f", order: 2 },
      { name: "🟡 En attente de rappel (si convenu avec le client)", description: "Rappel convenu avec le client", color: "#f39c12", order: 3 },
      { name: "🟡 Information envoyée", description: "Informations envoyées au client", color: "#f1c40f", order: 4 },
      { name: "🟠 Devis en préparation", description: "Devis en cours de préparation", color: "#e67e22", order: 5 },
      { name: "🟠 Devis envoyé", description: "Devis envoyé au client", color: "#d35400", order: 6 },
      { name: "🟠 En négociation", description: "Négociation en cours", color: "#e74c3c", order: 7 },
      { name: "🎯 Ciblé (objectif client)", description: "Client ciblé comme objectif", color: "#9b59b6", order: 8 },
      { name: "🟣 Non traité dans le délai (auto)", description: "Non traité automatiquement", color: "#8e44ad", order: 9 },
      { name: "⚠️ Non qualifié", description: "Lead ne correspond pas aux critères", color: "#95a5a6", order: 10 },
      { name: "🔴 Perdu (après visite/devis non signé, ou auto via SLA)", description: "Lead perdu", color: "#c0392b", order: 11 },
      { name: "❌ Refusé (non direct / pas intéressé)", description: "Refus direct", color: "#e74c3c", order: 12 },
      { name: "🟢 Gagné", description: "Lead gagné", color: "#27ae60", order: 13 },
      { name: "⚫ Injoignable / Archivé", description: "Lead injoignable ou archivé", color: "#34495e", order: 14 }
    ];

    // Créer les statuts d'appel
    for (const status of defaultCallStatuses) {
      try {
        await prisma.callStatus.upsert({
          where: { 
            organizationId_name: { 
              organizationId, 
              name: status.name 
            } 
          },
          update: {}, // Ne pas modifier si existe déjà
          create: {
            ...status,
            organizationId,
            isActive: true,
            isDefault: false
          }
        });
        console.log(`✅ [INIT] Statut d'appel créé: ${status.name}`);
      } catch {
        console.log(`⚠️ [INIT] Statut d'appel existe déjà: ${status.name}`);
      }
    }

    // Créer les statuts de leads
    for (const status of defaultLeadStatuses) {
      try {
        await prisma.leadStatus.upsert({
          where: { 
            organizationId_name: { 
              organizationId, 
              name: status.name 
            } 
          },
          update: {}, // Ne pas modifier si existe déjà
          create: {
            ...status,
            organizationId,
            isDefault: false
          }
        });
        console.log(`✅ [INIT] Statut de lead créé: ${status.name}`);
      } catch {
        console.log(`⚠️ [INIT] Statut de lead existe déjà: ${status.name}`);
      }
    }

    // 3) Créer les mappings par défaut
    const mappings = [
      { callStatusName: "📞 Pas de réponse", leadStatusName: "🟡 Contacter (dès le 1er appel tenté)" },
      { callStatusName: "📞 Numéro incorrect / injoignable", leadStatusName: "⚫ Injoignable / Archivé" },
      { callStatusName: "📞 Rappel programmé", leadStatusName: "🟡 En attente de rappel (si convenu avec le client)" },
      { callStatusName: "📞 Contacté – Pas intéressé", leadStatusName: "❌ Refusé (non direct / pas intéressé)" },
      { callStatusName: "📞 Contacté – Non qualifié", leadStatusName: "⚠️ Non qualifié" },
      { callStatusName: "📞 Contacté – Refus (non direct à l'appel)", leadStatusName: "❌ Refusé (non direct / pas intéressé)" },
      { callStatusName: "📞 Contacté – Refus ferme (après devis/visite)", leadStatusName: "🔴 Perdu (après visite/devis non signé, ou auto via SLA)" },
      { callStatusName: "📞 Contacté – Refus définitif", leadStatusName: "❌ Refusé (non direct / pas intéressé)" },
      { callStatusName: "📞 Contacté – À rappeler plus tard", leadStatusName: "🟡 En attente de rappel (si convenu avec le client)" },
      { callStatusName: "📞 Contacté – Information envoyée (mail/sms)", leadStatusName: "🟡 Information envoyée" },
      { callStatusName: "📞 Contacté – Rendez-vous fixé", leadStatusName: "🎯 Ciblé (objectif client)" },
      { callStatusName: "📞 Contacté – Devis demandé", leadStatusName: "🟠 Devis en préparation" },
      { callStatusName: "📞 Contacté – Devis envoyé", leadStatusName: "🟠 Devis envoyé" },
      { callStatusName: "📞 Contacté – En négociation", leadStatusName: "🟠 En négociation" },
      { callStatusName: "📞 Contacté – Gagné (vente conclue)", leadStatusName: "🟢 Gagné" }
    ];

    // Récupérer les statuts créés pour les mappings
    const callStatuses = await prisma.callStatus.findMany({ where: { organizationId } });
    const leadStatuses = await prisma.leadStatus.findMany({ where: { organizationId } });

    // Créer les mappings
    for (const mapping of mappings) {
      const callStatus = callStatuses.find(cs => cs.name === mapping.callStatusName);
      const leadStatus = leadStatuses.find(ls => ls.name === mapping.leadStatusName);
      
      if (callStatus && leadStatus) {
        try {
          await prisma.callToLeadMapping.upsert({
            where: {
              organizationId_callStatusId_leadStatusId: {
                organizationId,
                callStatusId: callStatus.id,
                leadStatusId: leadStatus.id
              }
            },
            update: {},
            create: {
              organizationId,
              callStatusId: callStatus.id,
              leadStatusId: leadStatus.id,
              condition: "automatic",
              priority: 1,
              description: `Mapping automatique: ${mapping.callStatusName} → ${mapping.leadStatusName}`,
              isActive: true
            }
          });
          console.log(`✅ [INIT] Mapping créé: ${mapping.callStatusName} → ${mapping.leadStatusName}`);
        } catch {
          console.log(`⚠️ [INIT] Mapping existe déjà: ${mapping.callStatusName} → ${mapping.leadStatusName}`);
        }
      }
    }

    console.log('🎉 [INIT] Initialisation terminée avec succès !');
    
    res.json({ 
      success: true, 
      message: 'Statuts par défaut initialisés avec succès !',
      details: {
        callStatuses: defaultCallStatuses.length,
        leadStatuses: defaultLeadStatuses.length,
        mappings: mappings.length
      }
    });

  } catch (error) {
    console.error('❌ [INIT] Erreur lors de l\'initialisation des statuts:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'initialisation des statuts',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// ============================================================================
// 🎯 IA MESURE - Configuration Métré A4 V10
// ============================================================================

// GET /api/settings/ai-measure - Récupérer la configuration
router.get('/ai-measure', async (req, res) => {
  try {
    // ✅ SYSTÈME UNIQUE: Métré A4 V10 (centres des 6 petits tags)
    return res.json({
      success: true,
      data: {
        markerWidthCm: 13.0,
        markerHeightCm: 20.5,
        boardSizeCm: 29.7
      }
    });
    
  } catch (error) {
    console.error('[AI-MEASURE] Erreur récupération config:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la récupération de la configuration',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// POST /api/settings/ai-measure - Sauvegarder la configuration
router.post('/ai-measure', async (req, res) => {
  try {
    // ✅ SYSTÈME UNIQUE: Métré A4 V10 a des dimensions fixes.
    return res.status(400).json({
      success: false,
      error: 'Configuration désactivée: Métré A4 V10 est fixe (13×20.5cm).'
    });
    
  } catch (error) {
    console.error('[AI-MEASURE] Erreur sauvegarde config:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la sauvegarde de la configuration',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

export default router;
