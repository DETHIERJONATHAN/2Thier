import { Router } from 'express';
import { db } from '../lib/database';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const prisma = db;

// Schéma de validation pour créer/modifier un statut
const leadStatusSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Couleur hexadécimale invalide'),
  order: z.number().int().min(0).optional(),
  isDefault: z.boolean().optional()
});

/**
 * GET /api/lead-statuses
 * Récupère tous les statuts de leads pour l'organisation
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

    const leadStatuses = await prisma.leadStatus.findMany({
      where: { organizationId },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { leads: true }
        }
      }
    });

    res.json({
      success: true,
      data: leadStatuses
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statuts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur interne du serveur' 
    });
  }
});

/**
 * POST /api/lead-statuses
 * Crée un nouveau statut de lead
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

    const validation = leadStatusSchema.safeParse(req.body);
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
      await prisma.leadStatus.updateMany({
        where: { organizationId, isDefault: true },
        data: { isDefault: false }
      });
    }

    // Déterminer l'ordre si pas spécifié
    let finalOrder = order;
    if (finalOrder === undefined) {
      const maxOrder = await prisma.leadStatus.findFirst({
        where: { organizationId },
        orderBy: { order: 'desc' },
        select: { order: true }
      });
      finalOrder = (maxOrder?.order ?? -1) + 1;
    }

    const leadStatus = await prisma.leadStatus.create({
      data: {
        name,
        color,
        order: finalOrder,
        isDefault: isDefault ?? false,
        organizationId
      },
      include: {
        _count: {
          select: { leads: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: leadStatus,
      message: 'Statut créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création du statut:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur interne du serveur' 
    });
  }
});

/**
 * PUT /api/lead-statuses/:id
 * Met à jour un statut de lead
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

    const validation = leadStatusSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Données invalides',
        errors: validation.error.errors
      });
    }

    // Vérifier que le statut existe et appartient à l'organisation
    const existingStatus = await prisma.leadStatus.findFirst({
      where: { id, organizationId }
    });

    if (!existingStatus) {
      return res.status(404).json({ 
        success: false, 
        message: 'Statut non trouvé' 
      });
    }

    const { name, color, order, isDefault } = validation.data;

    // Si c'est le statut par défaut, retirer le flag des autres
    if (isDefault) {
      await prisma.leadStatus.updateMany({
        where: { organizationId, isDefault: true, id: { not: id } },
        data: { isDefault: false }
      });
    }

    const leadStatus = await prisma.leadStatus.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(color && { color }),
        ...(order !== undefined && { order }),
        ...(isDefault !== undefined && { isDefault })
      },
      include: {
        _count: {
          select: { leads: true }
        }
      }
    });

    res.json({
      success: true,
      data: leadStatus,
      message: 'Statut mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur interne du serveur' 
    });
  }
});

/**
 * DELETE /api/lead-statuses/:id
 * Supprime un statut de lead
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

    // Vérifier que le statut existe et appartient à l'organisation
    const existingStatus = await prisma.leadStatus.findFirst({
      where: { id, organizationId },
      include: {
        _count: {
          select: { leads: true }
        }
      }
    });

    if (!existingStatus) {
      return res.status(404).json({ 
        success: false, 
        message: 'Statut non trouvé' 
      });
    }

    // Vérifier s'il y a des leads associés
    if (existingStatus._count.leads > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Impossible de supprimer ce statut car ${existingStatus._count.leads} lead(s) l'utilisent encore` 
      });
    }

    await prisma.leadStatus.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Statut supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du statut:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur interne du serveur' 
    });
  }
});

/**
 * POST /api/lead-statuses/reorder
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

    // Mettre à jour l'ordre de chaque statut
    const updatePromises = statusIds.map((statusId, index) =>
      prisma.leadStatus.updateMany({
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
    console.error('Erreur lors de la réorganisation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur interne du serveur' 
    });
  }
});

/**
 * PUT /api/lead-statuses/reorder
 * Réorganise l'ordre des statuts (alias PUT pour POST)
 */
router.put('/reorder', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { statuses } = req.body; // Format: [{ id: 'uuid', order: 0 }]
    
    if (!organizationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID d\'organisation requis' 
      });
    }

    if (!Array.isArray(statuses)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Array de statuts requis' 
      });
    }

    // Mettre à jour l'ordre de chaque statut
    const updatePromises = statuses.map((status: { id: string; order: number }) =>
      prisma.leadStatus.updateMany({
        where: { id: status.id, organizationId },
        data: { order: status.order }
      })
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Ordre mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la réorganisation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur interne du serveur' 
    });
  }
});

export default router;
