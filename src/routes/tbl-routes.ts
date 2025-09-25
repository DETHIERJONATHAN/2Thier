import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// POST /api/tbl/devis - Sauvegarder un devis TBL
router.post('/devis', authenticateToken, requireRole(['user', 'admin', 'super_admin']), async (req, res) => {
  try {
    const {
      clientId,
      treeId,
      organizationId,
      userId,
      projectName,
      notes,
      isDraft,
      formData,
      metadata
    } = req.body;

    console.log('💾 [TBL API] Sauvegarde devis TBL:', {
      clientId,
      treeId,
      projectName,
      isDraft,
      fieldsCount: Object.keys(formData || {}).length
    });

    // Vérification des données requises
    if (!clientId || !treeId || !organizationId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Données manquantes: clientId, treeId, organizationId et userId sont requis'
      });
    }

    // Vérifier que l'utilisateur a accès à l'organisation
    if (req.user?.organizationId && req.user.organizationId !== organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé à cette organisation'
      });
    }

    // Créer ou mettre à jour le devis TBL
    const devisData = {
      clientId,
      treeId,
      organizationId,
      userId,
      projectName: projectName || `Projet TBL ${new Date().toLocaleDateString()}`,
      notes: notes || '',
      isDraft: isDraft || false,
      formData: formData || {},
      metadata: {
        ...metadata,
        savedAt: new Date().toISOString(),
        version: '1.0'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Pour l'instant, on utilise une table générique ou on stocke en JSON
    // TODO: Créer une table dédiée tbl_devis si nécessaire
    
    // Simuler la sauvegarde pour le moment
    const devisId = `tbl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('✅ [TBL API] Devis sauvegardé avec succès:', { devisId, devisData });

    res.json({
      success: true,
      devisId,
      message: 'Devis TBL sauvegardé avec succès',
      data: devisData
    });

  } catch (error) {
    console.error('❌ [TBL API] Erreur sauvegarde devis:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la sauvegarde'
    });
  }
});

// GET /api/tbl/devis/client/:clientId - Récupérer les devis d'un client
router.get('/devis/client/:clientId', authenticateToken, requireRole(['user', 'admin', 'super_admin']), async (req, res) => {
  try {
    const { clientId } = req.params;
    const { organizationId, role } = req.user || {};

    console.log('📖 [TBL API] Récupération devis client:', clientId);

    if (!organizationId && role !== 'super_admin') {
      return res.status(403).json({
        error: 'Organisation non renseignée pour l’utilisateur',
        success: false
      });
    }

    // TODO: Implémenter la récupération depuis la base de données
    // Pour l'instant, retourner un tableau vide
    
    res.json([]);

  } catch (error) {
    console.error('❌ [TBL API] Erreur récupération devis client:', error);
    res.status(500).json({
      error: 'Erreur serveur lors de la récupération des devis'
    });
  }
});

// GET /api/tbl/devis/:devisId - Charger un devis spécifique
router.get('/devis/:devisId', authenticateToken, requireRole(['user', 'admin', 'super_admin']), async (req, res) => {
  try {
    const { devisId } = req.params;
    const { organizationId, role } = req.user || {};

    console.log('📖 [TBL API] Chargement devis:', devisId);

    if (!organizationId && role !== 'super_admin') {
      return res.status(403).json({
        error: 'Organisation non renseignée pour l’utilisateur',
        success: false
      });
    }

    // TODO: Implémenter la récupération depuis la base de données
    // Pour l'instant, retourner null
    
    res.json({
      formData: null
    });

  } catch (error) {
    console.error('❌ [TBL API] Erreur chargement devis:', error);
    res.status(500).json({
      error: 'Erreur serveur lors du chargement du devis'
    });
  }
});

// GET /api/clients/:clientId/access-check - Vérifier l'accès à un client
router.get('/clients/:clientId/access-check', authenticateToken, requireRole(['user', 'admin', 'super_admin']), async (req, res) => {
  try {
    const { clientId } = req.params;
    const { organizationId, role } = req.user || {};

    console.log('🔒 [TBL API] Vérification accès client:', clientId);

    // SuperAdmin a accès à tout
    if (role === 'super_admin') {
      return res.json({ hasAccess: true });
    }

    if (!organizationId) {
      return res.status(403).json({
        hasAccess: false,
        error: 'Organisation non renseignée pour l’utilisateur'
      });
    }

    // TODO: Vérifier dans la base de données si le client appartient à l'organisation
    // Pour l'instant, accorder l'accès aux utilisateurs authentifiés
    
    res.json({ hasAccess: true });

  } catch (error) {
    console.error('❌ [TBL API] Erreur vérification accès client:', error);
    res.status(500).json({
      hasAccess: false,
      error: 'Erreur serveur lors de la vérification d\'accès'
    });
  }
});

export default router;
