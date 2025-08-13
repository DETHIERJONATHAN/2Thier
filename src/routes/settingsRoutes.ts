import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.js';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

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

// PUT /api/settings/lead-statuses/:id
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
        callStatus: true,
        leadStatus: true
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
        callStatus: true,
        leadStatus: true
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
        callStatus: true,
        leadStatus: true
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
          callStatus: true,
          leadStatus: true
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
        callStatus: true,
        leadStatus: true
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
        callStatus: true,
        leadStatus: true
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
        callStatus: true,
        leadStatus: true
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
        callStatus: true,
        leadStatus: true
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
          callStatus: true,
          leadStatus: true
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
          callStatus: true,
          leadStatus: true
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
        callStatus: true,
        leadStatus: true
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

export default router;
