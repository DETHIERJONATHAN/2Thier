// Routes pour la gestion des entreprises
import { Router } from 'express';
import { authMiddleware, type AuthenticatedRequest, requireRole } from '../middlewares/auth.js';

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
    
    // TODO: Récupérer les informations de l'entreprise depuis la base de données
    const companyInfo = {
      id: organizationId,
      name: "2Thier CRM",
      address: "Rue de Floreffe 37, 5150 Franière",
      phone: "0470/29.50.77",
      email: "info@2thier.be",
      website: "https://2thier.be",
      vatNumber: "BE0123456789",
      registrationNumber: "123456789"
    };
    
    res.json({
      success: true,
      data: companyInfo
    });
    
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
    const updateData = req.body;
    
    // TODO: Mettre à jour les informations dans la base de données
    
    res.json({
      success: true,
      message: 'Informations de l\'entreprise mises à jour avec succès',
      data: updateData
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

    // TODO: Récupérer les paramètres depuis la base de données
    const settings = {
      organizationId,
      currency: "EUR",
      timezone: "Europe/Brussels",
      language: "fr",
      dateFormat: "DD/MM/YYYY",
      invoicePrefix: "INV-",
      quotePrefix: "DEV-"
    };
    
    res.json({
      success: true,
      data: settings
    });
    
  } catch (error) {
    console.error('❌ [CompanyAPI] Erreur paramètres entreprise:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des paramètres' 
    });
  }
});

export default router;
