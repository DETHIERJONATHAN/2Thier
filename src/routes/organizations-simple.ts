import express from 'express';
import prisma from '../prisma';

const router = express.Router();

/**
 * 🏢 ROUTES ORGANIZATIONS - VERSION SIMPLE POUR DEBUG
 * ✅ Zéro cache — chaque requête va directement à Cloud SQL
 */

// GET /api/organizations - Récupérer toutes les organisations
router.get('/', async (req, res) => {
  try {
    
    const organizations = await prisma.organization.findMany({
      include: {
        UserOrganization: {
          include: {
            User: {
              select: { id: true, email: true, firstName: true, lastName: true }
            }
          }
        }
      }
    });

    res.json({ success: true, data: organizations });
  } catch (error) {
    console.error('❌ [GET /api/organizations] Erreur:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// GET /api/organizations/:id - Récupérer une organisation spécifique
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    
    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        UserOrganization: {
          include: {
            User: {
              select: { id: true, email: true, firstName: true, lastName: true }
            }
          }
        }
      }
    });

    if (!organization) {
      return res.status(404).json({ success: false, error: 'Organisation non trouvée' });
    }

    res.json({ success: true, data: organization });
  } catch (error) {
    console.error(`❌ [GET /api/organizations/${req.params.id}] Erreur:`, error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// POST /api/organizations - Créer une nouvelle organisation
router.post('/', async (req, res) => {
  try {
    const organizationData = req.body;
    
    const newOrganization = await prisma.organization.create({
      data: {
        name: organizationData.name,
        status: organizationData.status || 'active',
      },
      include: {
        UserOrganization: {
          include: {
            User: {
              select: { id: true, email: true, firstName: true, lastName: true }
            }
          }
        }
      }
    });

    res.json({ success: true, data: newOrganization });
  } catch (error) {
    console.error('❌ [POST /api/organizations] Erreur:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la création de l\'organisation' });
  }
});

// PUT /api/organizations/:id - Mettre à jour une organisation
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationData = req.body;

    // 🔍 DEBUG - Afficher les données reçues

    const updatedOrganization = await prisma.organization.update({
      where: { id },
      data: {
        name: organizationData.name,
        status: organizationData.status,
        website: organizationData.website || null, // Gérer le website optionnel
      },
      include: {
        UserOrganization: {
          include: {
            User: {
              select: { id: true, email: true, firstName: true, lastName: true }
            }
          }
        }
      }
    });

    res.json({ success: true, data: updatedOrganization });
  } catch (error) {
    console.error(`❌ [PUT /api/organizations/${req.params.id}] Erreur:`, error);

    // 🔍 Plus de détails sur l'erreur
    if (error instanceof Error) {
      console.error("❌ Message d'erreur:", error.message);
      console.error('❌ Stack trace:', error.stack);
    }

    res.status(400).json({
      success: false,
      error: "Erreur lors de la mise à jour de l'organisation",
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// DELETE /api/organizations/:id - Supprimer une organisation
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.organization.delete({ where: { id } });
    
    res.json({ success: true, message: 'Organisation supprimée avec succès' });
  } catch (error) {
    console.error(`❌ [DELETE /api/organizations/${req.params.id}] Erreur:`, error);
    res.status(500).json({ success: false, error: 'Erreur lors de la suppression de l\'organisation' });
  }
});

export default router;
