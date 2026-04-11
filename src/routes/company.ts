// Routes pour la gestion des entreprises
import { Router } from 'express';
import { authMiddleware, type AuthenticatedRequest, requireRole } from '../middlewares/auth.js';
import { db } from '../lib/database.js';

const router = Router();

// Authentification requise pour toutes les routes
router.use(authMiddleware);

/**
 * GET /api/company
 * Obtenir les informations de l'entreprise
 */
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { organizationId } = req.user!;
    
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, address: true, phone: true, email: true, website: true, vatNumber: true, legalName: true, logoUrl: true },
    });

    if (!org) return res.status(404).json({ success: false, message: 'Organisation introuvable' });
    
    res.json({ success: true, data: org });
    
  } catch (error) {
    console.error('❌ [CompanyAPI] Erreur récupération entreprise:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des informations de l\'entreprise' 
    });
  }
});

/**
 * PUT /api/company
 * Mettre à jour les informations de l'entreprise (Admin seulement)
 */
router.put('/', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { organizationId } = req.user!;
    const { name, address, phone, email, website, vatNumber, legalName } = req.body;
    
    const updated = await db.organization.update({
      where: { id: organizationId },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(website !== undefined && { website }),
        ...(vatNumber !== undefined && { vatNumber }),
        ...(legalName !== undefined && { legalName }),
        updatedAt: new Date(),
      },
      select: { id: true, name: true, address: true, phone: true, email: true, website: true, vatNumber: true, legalName: true },
    });
    
    res.json({
      success: true,
      message: 'Informations de l\'entreprise mises à jour avec succès',
      data: updated,
    });
    
  } catch (error) {
    console.error('❌ [CompanyAPI] Erreur mise à jour entreprise:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la mise à jour des informations de l\'entreprise' 
    });
  }
});

/**
 * GET /api/company/settings
 * Obtenir les paramètres de l'entreprise
 */
router.get('/settings', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { organizationId } = req.user!;

    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    });

    if (!org) return res.status(404).json({ success: false, message: 'Organisation introuvable' });

    // Paramètres applicatifs (non stockés en DB pour l'instant)
    const settings = {
      organizationId,
      currency: 'EUR',
      timezone: 'Europe/Brussels',
      language: 'fr',
      dateFormat: 'DD/MM/YYYY',
      invoicePrefix: 'INV-',
      quotePrefix: 'DEV-',
    };
    
    res.json({ success: true, data: settings });
    
  } catch (error) {
    console.error('❌ [CompanyAPI] Erreur paramètres entreprise:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des paramètres' 
    });
  }
});

export default router;
