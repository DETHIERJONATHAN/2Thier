import express from 'express';
import prisma from '../prisma';

const router = express.Router();

/**
 * 🏢 ROUTES ORGANIZATIONS - VERSION SIMPLE POUR DEBUG
 */

// GET /api/organizations - Récupérer toutes les organisations
router.get('/', async (req, res) => {
  try {
    console.log('📡 [GET /api/organizations] Récupération des organisations...');
    
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

    console.log(`✅ [GET /api/organizations] ${organizations.length} organisations trouvées`);
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
    console.log(`📡 [GET /api/organizations/${id}] Récupération organisation...`);
    
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
      console.log(`❌ [GET /api/organizations/${id}] Organisation non trouvée`);
      return res.status(404).json({ success: false, error: 'Organisation non trouvée' });
    }

    console.log(`✅ [GET /api/organizations/${id}] Organisation trouvée: ${organization.name}`);
    res.json({ success: true, data: organization });
  } catch (error) {
    console.error(`❌ [GET /api/organizations/${req.params.id}] Erreur:`, error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// POST /api/organizations - Créer une nouvelle organisation
router.post('/', async (req, res) => {
  try {
    console.log('📡 [POST /api/organizations] Création organisation...');
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

    console.log(`✅ [POST /api/organizations] Organisation créée: ${newOrganization.name}`);
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
    console.log(`📡 [PUT /api/organizations/${id}] Mise à jour organisation...`);
    const organizationData = req.body;
    
    // 🔍 DEBUG - Afficher les données reçues
    console.log('📝 [PUT Organizations] Données reçues:', JSON.stringify(organizationData, null, 2));
    console.log('🔑 [PUT Organizations] Clés reçues:', Object.keys(organizationData));
    
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

    console.log(`✅ [PUT /api/organizations/${id}] Organisation mise à jour: ${updatedOrganization.name}`);
    res.json({ success: true, data: updatedOrganization });
  } catch (error) {
    console.error(`❌ [PUT /api/organizations/${req.params.id}] Erreur:`, error);
    
    // 🔍 Plus de détails sur l'erreur
    if (error instanceof Error) {
      console.error('❌ Message d\'erreur:', error.message);
      console.error('❌ Stack trace:', error.stack);
    }
    
    res.status(400).json({ 
      success: false, 
      error: 'Erreur lors de la mise à jour de l\'organisation',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
  }
});

// DELETE /api/organizations/:id - Supprimer une organisation
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📡 [DELETE /api/organizations/${id}] Suppression organisation...`);
    
    await prisma.organization.delete({ where: { id } });
    
    console.log(`✅ [DELETE /api/organizations/${id}] Organisation supprimée`);
    res.json({ success: true, message: 'Organisation supprimée avec succès' });
  } catch (error) {
    console.error(`❌ [DELETE /api/organizations/${req.params.id}] Erreur:`, error);
    res.status(500).json({ success: false, error: 'Erreur lors de la suppression de l\'organisation' });
  }
});

export default router;
