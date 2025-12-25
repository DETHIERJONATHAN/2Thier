import express from 'express';
import { db } from '../../lib/database.js';
import { verifyUser } from '../../middlewares/auth.js';

const prisma = db;
const router = express.Router();

// Middleware pour vérifier l'authentification sur toutes les routes
router.use(verifyUser);

/**
 * Récupérer tous les leads
 * GET /api/leads
 * NOTE: CETTE ROUTE EST DÉSACTIVÉE POUR ÉVITER LES CONFLITS AVEC routes/leads.ts
 */
router.get('/leads_disabled', async (req, res) => {
  console.log('[API/Leads] Requête GET /api/leads reçue avec query:', req.query);
  try {
    const { organizationId } = req.query;
    const userId = req.userId;
    
    console.log('[API/Leads] Requête faite par userId:', userId);
    console.log('[API/Leads] OrganizationId dans la requête:', organizationId);

    // Vérifier si l'utilisateur peut accéder aux leads
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        UserOrganization: {
          include: {
            role: {
              include: {
                RolePermission: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    console.log('[API/Leads] Utilisateur trouvé:', user ? `${user.email} (${user.id})` : 'Non trouvé');
    console.log('[API/Leads] Organisation de l\'utilisateur:', user?.UserOrganization[0]?.organizationId || 'Aucune');

    // Si l'utilisateur est super admin ou a les permissions appropriées
    const isSuperAdmin = user?.isSuperAdmin || false;
    console.log('[API/Leads] Est super admin:', isSuperAdmin);
    
    // Si c'est un super admin demandant 'all', récupérer tous les leads
    if (isSuperAdmin && organizationId === 'all') {
      console.log('[API/Leads] Super admin demandant tous les leads');
      const leads = await prisma.lead.findMany({
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });
      console.log(`[API/Leads] ${leads.length} leads trouvés au total`);
      return res.json(leads);
    }
    
    // Sinon, filtrer par organisation
    const orgId = organizationId || user?.UserOrganization[0]?.organizationId;
    
    if (!orgId) {
      console.log('[API/Leads] Erreur: Aucune organisation spécifiée');
      return res.status(400).json({ error: 'Organisation non spécifiée' });
    }
    
    console.log(`[API/Leads] Recherche des leads pour l'organisation: ${orgId}`);

    const leads = await prisma.lead.findMany({
      where: { organizationId: orgId },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    console.log(`[API/Leads] ${leads.length} leads trouvés pour l'organisation ${orgId}`);

    res.json(leads);
  } catch (error) {
    console.error('[API/Leads] Erreur lors de la récupération des leads:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des leads' });
  }
});

/**
 * Récupérer un lead spécifique
 * GET /api/leads/:id
 */
router.get('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Vérification des permissions omise pour simplifier
    
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead non trouvé' });
    }

    res.json(lead);
  } catch (error) {
    console.error('Erreur lors de la récupération du lead:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du lead' });
  }
});

/**
 * Créer un nouveau lead
 * POST /api/leads
 * NOTE: CETTE ROUTE EST DÉSACTIVÉE POUR ÉVITER LES CONFLITS AVEC routes/leads.ts
 */
router.post('/leads_disabled', async (req, res) => {
  try {
    console.log('[POST /api/leads] Requête reçue:', { body: req.body, userId: req.userId });
    const userId = req.userId;
    const { status, data } = req.body;
    console.log('[POST /api/leads] Status et data extraits:', { status, data });

    // Mode développement: si userId est "dev-user-id", utiliser la première organisation trouvée
    let organizationId;
    
    if (userId === "dev-user-id") {
      // Mode développement - prendre la première organisation disponible
      const firstOrg = await prisma.organization.findFirst();
      if (!firstOrg) {
        return res.status(400).json({ error: 'Aucune organisation disponible pour le mode développement' });
      }
      organizationId = firstOrg.id;
      console.log('Mode développement - utilisation de l\'organisation:', firstOrg.name);
    } else {
      // Mode normal - obtenir l'organisation de l'utilisateur
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          UserOrganization: {
            take: 1
          }
        }
      });

      if (!user || !user.UserOrganization[0]) {
        return res.status(400).json({ error: 'Utilisateur non associé à une organisation' });
      }

      organizationId = user.UserOrganization[0].organizationId;
    }

    // Créer le lead
    // En mode développement, on cherche un utilisateur valide pour l'assignation
    let assignedToId = userId;
    
    if (userId === "dev-user-id") {
      console.log('[POST /api/leads] Mode développement détecté, recherche d\'un utilisateur');
      const anyUser = await prisma.user.findFirst({
        where: {
          UserOrganization: {
            some: {
              organizationId
            }
          }
        }
      });
      if (anyUser) {
        assignedToId = anyUser.id;
        console.log('[POST /api/leads] Utilisateur trouvé:', { id: assignedToId, email: anyUser.email });
      } else {
        assignedToId = null; // Si aucun utilisateur n'est trouvé, on met null
        console.log('[POST /api/leads] Aucun utilisateur trouvé, assignedToId=null');
      }
    }
    
    console.log('[POST /api/leads] Tentative de création du lead avec:', {
      status,
      data,
      organizationId,
      assignedToId
    });
    
    try {
      // Créer le lead une seule fois
      const createdLead = await prisma.lead.create({
        data: {
          status,
          data,
          organizationId,
          assignedToId,
        }
      });
      
      console.log('[POST /api/leads] Lead créé avec succès:', createdLead);
      res.status(201).json(createdLead);
    } catch (createError) {
      console.error('[POST /api/leads] Erreur lors de la création du lead:', createError);
      // Relancer l'erreur pour qu'elle soit capturée par le bloc catch parent
      throw createError;
    }
  } catch (error) {
    console.error('[POST /api/leads] Erreur détaillée lors de la création du lead:', error);
    // Renvoyer des détails d'erreur pour faciliter le débogage
    res.status(500).json({ 
      error: 'Erreur lors de la création du lead',
      message: error.message,
      stack: error.stack
    });
  }
});

/**
 * Mettre à jour un lead
 * PUT /api/leads/:id
 */
router.put('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, data, assignedToId } = req.body;
    const userId = req.userId;

    // Vérification des permissions omise pour simplifier
    
    // Mettre à jour le lead
    const lead = await prisma.lead.update({
      where: { id },
      data: {
        status,
        data,
        assignedToId,
        updatedAt: new Date()
      }
    });

    res.json(lead);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du lead:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du lead' });
  }
});

/**
 * Supprimer un lead
 * DELETE /api/leads/:id
 */
router.delete('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Vérification des permissions omise pour simplifier
    
    await prisma.lead.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Erreur lors de la suppression du lead:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du lead' });
  }
});

export default router;
