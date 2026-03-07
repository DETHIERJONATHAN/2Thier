import { Router } from 'express';
import { db } from '../lib/database';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Schéma de validation pour créer/modifier un statut de chantier
const chantierStatusSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6,8}$/i, 'Couleur hexadécimale invalide').transform(c => c.slice(0, 7)),
  order: z.number().int().min(0).optional(),
  isDefault: z.boolean().optional()
});

/**
 * GET /api/chantier-statuses
 * Récupère tous les statuts de chantier pour l'organisation
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'organisation requis'
      });
    }

    const statuses = await db.chantierStatus.findMany({
      where: { organizationId },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { Chantier: true }
        }
      }
    });

    res.json({
      success: true,
      data: statuses
    });
  } catch (error) {
    console.error('[ChantierStatuses] Erreur GET /:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

/**
 * POST /api/chantier-statuses
 * Crée un nouveau statut de chantier
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'organisation requis'
      });
    }

    const validation = chantierStatusSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: validation.error.errors
      });
    }

    const { name, color, order, isDefault } = validation.data;

    // Si c'est le statut par défaut, retirer le flag des autres
    if (isDefault) {
      await db.chantierStatus.updateMany({
        where: { organizationId, isDefault: true },
        data: { isDefault: false }
      });
    }

    // Déterminer l'ordre si pas spécifié
    let finalOrder = order;
    if (finalOrder === undefined) {
      const maxOrder = await db.chantierStatus.findFirst({
        where: { organizationId },
        orderBy: { order: 'desc' },
        select: { order: true }
      });
      finalOrder = (maxOrder?.order ?? -1) + 1;
    }

    const { randomUUID } = await import('crypto');
    const status = await db.chantierStatus.create({
      data: {
        id: randomUUID(),
        name,
        color,
        order: finalOrder,
        isDefault: isDefault ?? false,
        organizationId,
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: { Chantier: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: status,
      message: 'Statut de chantier créé avec succès'
    });
  } catch (error) {
    console.error('[ChantierStatuses] Erreur POST /:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

/**
 * PUT /api/chantier-statuses/:id
 * Met à jour un statut de chantier
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'organisation requis'
      });
    }

    const validation = chantierStatusSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: validation.error.errors
      });
    }

    // Vérifier que le statut existe et appartient à l'organisation
    const existing = await db.chantierStatus.findFirst({
      where: { id, organizationId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Statut de chantier non trouvé'
      });
    }

    const { name, color, order, isDefault } = validation.data;

    if (isDefault) {
      await db.chantierStatus.updateMany({
        where: { organizationId, isDefault: true, id: { not: id } },
        data: { isDefault: false }
      });
    }

    const status = await db.chantierStatus.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(color && { color }),
        ...(order !== undefined && { order }),
        ...(isDefault !== undefined && { isDefault }),
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: { Chantier: true }
        }
      }
    });

    res.json({
      success: true,
      data: status,
      message: 'Statut mis à jour avec succès'
    });
  } catch (error) {
    console.error('[ChantierStatuses] Erreur PUT /:id:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

/**
 * DELETE /api/chantier-statuses/:id
 * Supprime un statut de chantier
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'organisation requis'
      });
    }

    const existing = await db.chantierStatus.findFirst({
      where: { id, organizationId },
      include: {
        _count: {
          select: { Chantier: true }
        }
      }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Statut de chantier non trouvé'
      });
    }

    if (existing._count.Chantier > 0) {
      return res.status(400).json({
        success: false,
        message: `Impossible de supprimer : ${existing._count.Chantier} chantier(s) utilisent ce statut`
      });
    }

    await db.chantierStatus.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Statut supprimé avec succès'
    });
  } catch (error) {
    console.error('[ChantierStatuses] Erreur DELETE /:id:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

/**
 * POST /api/chantier-statuses/reorder
 * Réorganise l'ordre des statuts
 */
router.post('/reorder', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { statusIds } = req.body;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'organisation requis'
      });
    }

    if (!Array.isArray(statusIds)) {
      return res.status(400).json({
        success: false,
        message: 'Array d\'IDs requis'
      });
    }

    const updatePromises = statusIds.map((statusId: string, index: number) =>
      db.chantierStatus.updateMany({
        where: { id: statusId, organizationId },
        data: { order: index }
      })
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Ordre mis à jour avec succès'
    });
  } catch (error) {
    console.error('[ChantierStatuses] Erreur POST /reorder:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

/**
 * POST /api/chantier-statuses/seed
 * Initialise les statuts par défaut pour une organisation
 */
router.post('/seed', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'organisation requis'
      });
    }

    // Vérifier s'il y a déjà des statuts
    const existingCount = await db.chantierStatus.count({
      where: { organizationId }
    });

    if (existingCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Des statuts existent déjà pour cette organisation'
      });
    }

    const { randomUUID } = await import('crypto');
    const defaultStatuses = [
      { name: 'Nouveau', color: '#8c8c8c', order: 0, isDefault: true },
      { name: 'Visite technique', color: '#2f54eb', order: 1, isDefault: false },
      { name: 'Commande', color: '#13c2c2', order: 2, isDefault: false },
      { name: 'Planifié', color: '#1677ff', order: 3, isDefault: false },
      { name: 'En cours', color: '#fa8c16', order: 4, isDefault: false },
      { name: 'Terminé', color: '#52c41a', order: 5, isDefault: false },
      { name: 'Réception', color: '#722ed1', order: 6, isDefault: false },
      { name: 'Annulé', color: '#ff4d4f', order: 7, isDefault: false },
    ];

    const created = await Promise.all(
      defaultStatuses.map(s =>
        db.chantierStatus.create({
          data: {
            id: randomUUID(),
            organizationId,
            ...s,
            updatedAt: new Date()
          }
        })
      )
    );

    res.status(201).json({
      success: true,
      data: created,
      message: `${created.length} statuts par défaut créés`
    });
  } catch (error) {
    console.error('[ChantierStatuses] Erreur POST /seed:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

export default router;
