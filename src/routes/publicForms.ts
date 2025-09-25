// 🎯 DEVIS1MINUTE - Routes Public Forms
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import rateLimit from 'express-rate-limit';

const router = Router();
const prisma = new PrismaClient();

// 🔒 RATE LIMITING PUBLIC (plus strict)
const publicFormsRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 soumissions par 5 minutes par IP
  message: { success: false, message: 'Trop de soumissions de formulaires' }
});

// 🔒 RATE LIMITING ADMIN
const adminFormsRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 requêtes par minute
  message: { success: false, message: 'Trop de requêtes forms admin' }
});

// Import conditionnel du middleware auth pour les routes admin
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';

// 📝 POST /api/forms/submit - Soumission publique de formulaire (NON AUTHENTIFIÉ)
router.post('/submit', publicFormsRateLimit, async (req, res) => {
  try {
    const {
      formId,
      firstName,
      lastName,
      email,
      phone,
      company,
      address,
      city,
      region,
      postalCode,
      projectType,
      projectDescription,
      budget,
      timeline,
      // Champs UTM pour tracking
      utmSource,
      utmMedium,
      utmCampaign,
      // Consentements RGPD
      privacyConsent = false,
      marketingConsent = false
    } = req.body;

    // Validation des champs requis
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Prénom, nom et email sont requis' 
      });
    }

    if (!privacyConsent) {
      return res.status(400).json({ 
        success: false, 
        message: 'Consentement de confidentialité requis' 
      });
    }

    // Vérifier que le formulaire public existe et est actif
    let publicForm = null;
    let organizationId = null;
    let campaignId = null;

    if (formId) {
      publicForm = await prisma.publicForm.findUnique({
        where: { 
          id: formId,
          isActive: true 
        },
        include: {
          campaign: {
            select: {
              organizationId: true
            }
          }
        }
      });

      if (publicForm) {
        organizationId = publicForm.campaign?.organizationId;
        campaignId = publicForm.campaignId;
      }
    }

    // Si pas de form spécifique, utiliser l'organisation par défaut "2Thier"
    if (!organizationId) {
      const defaultOrg = await prisma.organization.findFirst({
        where: { name: { contains: '2Thier' } }
      });
      organizationId = defaultOrg?.id;
    }

    if (!organizationId) {
      return res.status(500).json({ 
        success: false, 
        message: 'Configuration système incomplète' 
      });
    }

    // Détection de doublon par email (dernières 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existingLead = await prisma.lead.findFirst({
      where: {
        email,
        createdAt: { gte: yesterday }
      }
    });

    if (existingLead) {
      return res.status(409).json({ 
        success: false, 
        message: 'Un lead avec cet email a déjà été soumis récemment' 
      });
    }

    // Création du lead
    const lead = await prisma.lead.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        company,
        address,
        city,
        region,
        postalCode,
        projectType,
        projectDescription,
        budget: budget ? parseFloat(budget) : null,
        timeline,
        source: 'PUBLIC_FORM',
        status: 'NEW',
        organizationId,
        campaignId,
        utmSource: utmSource || 'devis1minute',
        utmMedium: utmMedium || 'form',
        utmCampaign: utmCampaign || 'public-form',
        privacyConsent,
        marketingConsent,
        // Score IA initial basique
        aiScore: Math.floor(Math.random() * 40) + 60 // Score entre 60-99 pour nouveaux leads
      }
    });

    // Incrémenter le compteur du formulaire si applicable
    if (publicForm) {
      await prisma.publicForm.update({
        where: { id: formId },
        data: {
          submissionsCount: { increment: 1 }
        }
      });
    }

    // Réponse publique (données minimales)
    res.json({
      success: true,
      message: 'Votre demande a été soumise avec succès',
      data: {
        leadId: lead.id,
        submittedAt: lead.createdAt
      }
    });

  } catch (error) {
    console.error('❌ [PUBLIC-FORMS] Erreur soumission:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la soumission du formulaire' 
    });
  }
});

// 📋 GET /api/forms/public/:id/config - Configuration publique d'un formulaire
router.get('/public/:id/config', async (req, res) => {
  try {
    const { id } = req.params;

    const publicForm = await prisma.publicForm.findUnique({
      where: { 
        id,
        isActive: true 
      },
      select: {
        id: true,
        title: true,
        description: true,
        fields: true,
        styling: true,
        submissionMessage: true,
        campaign: {
          select: {
            name: true,
            organization: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!publicForm) {
      return res.status(404).json({ 
        success: false, 
        message: 'Formulaire non trouvé ou inactif' 
      });
    }

    res.json({
      success: true,
      data: publicForm
    });

  } catch (error) {
    console.error('❌ [PUBLIC-FORMS] Erreur config:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération de la configuration' 
    });
  }
});

// === ROUTES ADMINISTRATEUR (AUTHENTIFIÉES) ===

router.use('/admin', authMiddleware);
router.use('/admin', adminFormsRateLimit);

// 📊 GET /api/forms/admin/list - Liste des formulaires (admin)
router.get('/admin/list', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Organization ID manquant' 
      });
    }

    const forms = await prisma.publicForm.findMany({
      where: {
        campaign: {
          organizationId
        }
      },
      include: {
        campaign: {
          select: {
            name: true,
            type: true
          }
        },
        _count: {
          select: {
            leads: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: forms.map(form => ({
        ...form,
        leadsCount: form._count.leads
      }))
    });

  } catch (error) {
    console.error('❌ [FORMS-ADMIN] Erreur liste:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des formulaires' 
    });
  }
});

// 🎯 POST /api/forms/admin/create - Créer un formulaire
router.post('/admin/create', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Organization ID manquant' 
      });
    }

    const {
      title,
      description,
      campaignId,
      fields = [],
      styling = {},
      submissionMessage,
      isActive = true
    } = req.body;

    // Validation
    if (!title || !campaignId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Titre et campagne requis' 
      });
    }

    // Vérifier que la campagne appartient à l'organisation
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        organizationId
      }
    });

    if (!campaign) {
      return res.status(404).json({ 
        success: false, 
        message: 'Campagne non trouvée' 
      });
    }

    const publicForm = await prisma.publicForm.create({
      data: {
        title,
        description,
        campaignId,
        fields,
        styling,
        submissionMessage: submissionMessage || 'Merci pour votre soumission !',
        isActive
      },
      include: {
        campaign: {
          select: {
            name: true,
            organization: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      data: publicForm,
      message: 'Formulaire créé avec succès'
    });

  } catch (error) {
    console.error('❌ [FORMS-ADMIN] Erreur création:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la création du formulaire' 
    });
  }
});

// 📈 GET /api/forms/admin/stats - Statistiques des formulaires
router.get('/admin/stats', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Organization ID manquant' 
      });
    }

    const [totalForms, activeForms, totalSubmissions, thisMonthSubmissions] = await Promise.all([
      prisma.publicForm.count({
        where: {
          campaign: {
            organizationId
          }
        }
      }),
      prisma.publicForm.count({
        where: {
          isActive: true,
          campaign: {
            organizationId
          }
        }
      }),
      prisma.lead.count({
        where: {
          organizationId,
          source: 'PUBLIC_FORM'
        }
      }),
      prisma.lead.count({
        where: {
          organizationId,
          source: 'PUBLIC_FORM',
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalForms,
        activeForms,
        totalSubmissions,
        thisMonthSubmissions
      }
    });

  } catch (error) {
    console.error('❌ [FORMS-ADMIN] Erreur stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des statistiques' 
    });
  }
});

export default router;
