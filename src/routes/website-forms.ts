/**
 * 📋 Routes API - Module Formulaires Website
 * 
 * Gestion des formulaires publics style Effy avec mapping TBL
 * 
 * Routes Admin:
 * - GET /api/website-forms - Liste des formulaires
 * - GET /api/website-forms/:id - Détail d'un formulaire
 * - POST /api/website-forms - Créer un formulaire
 * - PUT /api/website-forms/:id - Mettre à jour un formulaire
 * - DELETE /api/website-forms/:id - Supprimer un formulaire
 * - POST /api/website-forms/:id/steps - Ajouter une étape
 * - PUT /api/website-forms/steps/:stepId - Mettre à jour une étape
 * - DELETE /api/website-forms/steps/:stepId - Supprimer une étape
 * - POST /api/website-forms/steps/:stepId/fields - Ajouter un champ
 * - PUT /api/website-forms/fields/:fieldId - Mettre à jour un champ
 * - DELETE /api/website-forms/fields/:fieldId - Supprimer un champ
 * - POST /api/website-forms/:id/link-website - Lier à un site
 * - DELETE /api/website-forms/:id/unlink-website/:websiteId - Délier d'un site
 * 
 * @author IA Assistant - Module Formulaires
 * @version 1.0.0
 */

import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { authMiddleware, AuthenticatedRequest as AuthReq } from '../middlewares/auth';

const router = Router();

// Types pour les requêtes authentifiées
interface AuthenticatedRequest extends Request {
  organizationId?: string;
  user?: { userId: string; isSuperAdmin?: boolean };
}

// Helper pour récupérer l'organizationId
const getOrgId = (req: AuthenticatedRequest): string => {
  const orgId = req.organizationId || (req.headers['x-organization-id'] as string);
  if (!orgId) throw new Error('Organization ID manquant');
  return orgId;
};

// ============================================================================
// 📋 CRUD FORMULAIRES
// ============================================================================

/**
 * GET /api/website-forms
 * Liste tous les formulaires de l'organisation
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const { websiteId } = req.query;
    
    console.log('📋 [WebsiteForms] GET all forms for org:', organizationId);
    
    const forms = await db.website_forms.findMany({
      where: {
        organizationId,
        ...(websiteId ? {
          websites: {
            some: { websiteId: Number(websiteId) }
          }
        } : {})
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
          include: {
            fields: {
              orderBy: { order: 'asc' }
            }
          }
        },
        websites: {
          include: {
            website: {
              select: { id: true, siteName: true, slug: true }
            }
          }
        },
        _count: {
          select: { submissions: true, steps: true, questions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`✅ [WebsiteForms] Found ${forms.length} forms`);
    res.json(forms);
  } catch (error) {
    console.error('❌ [WebsiteForms] Error fetching forms:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des formulaires',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * GET /api/website-forms/by-website/:websiteId
 * Liste les formulaires liés à un site web spécifique
 */
router.get('/by-website/:websiteId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const { websiteId } = req.params;
    
    console.log('📋 [WebsiteForms] GET forms for website:', websiteId);
    
    const forms = await db.website_forms.findMany({
      where: {
        organizationId,
        websites: {
          some: { websiteId: Number(websiteId) }
        }
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
          include: {
            fields: {
              orderBy: { order: 'asc' }
            }
          }
        },
        websites: {
          include: {
            website: {
              select: { id: true, siteName: true, slug: true }
            }
          }
        },
        _count: {
          select: { submissions: true, steps: true, questions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`✅ [WebsiteForms] Found ${forms.length} forms for website ${websiteId}`);
    res.json(forms);
  } catch (error) {
    console.error('❌ [WebsiteForms] Error fetching forms by website:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des formulaires',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * GET /api/website-forms/my-commercial-links
 * Retourne les liens commerciaux personnalisés de l'utilisateur connecté
 * IMPORTANT: Cette route DOIT être avant /:id pour éviter qu'Express ne la matche comme /:id
 */
router.get('/my-commercial-links', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const userId = req.user!.userId; // Avec authMiddleware, req.user est garanti

    console.log('🎯 [WebsiteForms] GET my-commercial-links for user:', userId);

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    // Générer le slug utilisateur unique
    const userSlug = await generateUserSlug(user.firstName, user.lastName, organizationId);

    // Récupérer tous les formulaires nominatifs actifs de l'organisation
    const forms = await db.website_forms.findMany({
      where: {
        organizationId,
        requiresCommercialTracking: true,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        isActive: true,
        websites: {
          select: {
            website: {
              select: {
                cloudRunDomain: true,
                domain: true,
                siteName: true
              }
            },
            urlPath: true,
            isDefault: true
          }
        },
        _count: {
          select: { submissions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedForms = forms.map(form => {
      // Prendre le premier site lié (ou celui par défaut)
      const defaultWebsite = form.websites.find(w => w.isDefault) || form.websites[0];
      const websiteUrl = defaultWebsite?.website.cloudRunDomain 
        ? `https://${defaultWebsite.website.cloudRunDomain}`
        : defaultWebsite?.website.domain 
        ? `https://${defaultWebsite.website.domain}`
        : null;

      return {
        id: form.id.toString(),
        name: form.name,
        description: form.description,
        slug: form.slug,
        isActive: form.isActive,
        submissionCount: form._count.submissions,
        websiteUrl, // URL du site associé
        websiteName: defaultWebsite?.website.siteName,
        urlPath: defaultWebsite?.urlPath || '/simulateur'
      };
    });

    console.log('✅ [WebsiteForms] Found', formattedForms.length, 'nominative forms');

    res.json({
      success: true,
      userSlug,
      forms: formattedForms
    });
  } catch (error) {
    console.error('❌ [WebsiteForms] Error getting commercial links:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des liens commerciaux',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * GET /api/website-forms/:id
 * Détail d'un formulaire avec toutes ses étapes et champs
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const { id } = req.params;
    
    console.log('📋 [WebsiteForms] GET form:', id);
    
    const form = await db.website_forms.findFirst({
      where: {
        id: Number(id),
        organizationId
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
          include: {
            fields: {
              orderBy: { order: 'asc' }
            }
          }
        },
        websites: {
          include: {
            website: {
              select: { id: true, siteName: true, slug: true, domain: true }
            }
          }
        },
        _count: {
          select: { submissions: true }
        }
      }
    });
    
    if (!form) {
      return res.status(404).json({ error: 'Formulaire non trouvé' });
    }
    
    console.log('✅ [WebsiteForms] Form found:', form.name);
    res.json(form);
  } catch (error) {
    console.error('❌ [WebsiteForms] Error fetching form:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération du formulaire',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * POST /api/website-forms
 * Créer un nouveau formulaire
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const { name, slug, description, treeId, settings, successTitle, successMessage, requiresCommercialTracking } = req.body;
    
    console.log('📋 [WebsiteForms] CREATE form:', name);
    
    // Vérifier que le slug n'existe pas déjà
    const existing = await db.website_forms.findFirst({
      where: { organizationId, slug }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Un formulaire avec ce slug existe déjà' });
    }
    
    const form = await db.website_forms.create({
      data: {
        organizationId,
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description,
        treeId,
        settings: settings || {},
        successTitle,
        successMessage,
        isActive: true,
        requiresCommercialTracking: requiresCommercialTracking || false  // 🎯 Tracking commercial
      },
      include: {
        steps: true,
        websites: true
      }
    });
    
    console.log('✅ [WebsiteForms] Form created:', form.id);
    res.status(201).json(form);
  } catch (error) {
    console.error('❌ [WebsiteForms] Error creating form:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création du formulaire',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * PUT /api/website-forms/:id
 * Mettre à jour un formulaire
 */
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const { id } = req.params;
    const { name, slug, description, treeId, settings, successTitle, successMessage, isActive, requiresCommercialTracking } = req.body;
    
    console.log('📋 [WebsiteForms] UPDATE form:', id);
    
    // Vérifier que le formulaire existe
    const existing = await db.website_forms.findFirst({
      where: { id: Number(id), organizationId }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Formulaire non trouvé' });
    }
    
    // Vérifier unicité du slug si modifié
    if (slug && slug !== existing.slug) {
      const slugExists = await db.website_forms.findFirst({
        where: { organizationId, slug, id: { not: Number(id) } }
      });
      if (slugExists) {
        return res.status(400).json({ error: 'Ce slug est déjà utilisé' });
      }
    }
    
    const form = await db.website_forms.update({
      where: { id: Number(id) },
      data: {
        name,
        slug,
        description,
        treeId,
        settings,
        successTitle,
        successMessage,
        isActive,
        requiresCommercialTracking: requiresCommercialTracking || false  // 🎯 Tracking commercial
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
          include: { fields: { orderBy: { order: 'asc' } } }
        },
        websites: {
          include: { website: { select: { id: true, siteName: true, slug: true } } }
        }
      }
    });
    
    console.log('✅ [WebsiteForms] Form updated:', form.id);
    res.json(form);
  } catch (error) {
    console.error('❌ [WebsiteForms] Error updating form:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour du formulaire',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * DELETE /api/website-forms/:id
 * Supprimer un formulaire
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const { id } = req.params;
    
    console.log('📋 [WebsiteForms] DELETE form:', id);
    
    // Vérifier que le formulaire existe
    const existing = await db.website_forms.findFirst({
      where: { id: Number(id), organizationId }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Formulaire non trouvé' });
    }
    
    await db.website_forms.delete({
      where: { id: Number(id) }
    });
    
    console.log('✅ [WebsiteForms] Form deleted:', id);
    res.json({ success: true, message: 'Formulaire supprimé' });
  } catch (error) {
    console.error('❌ [WebsiteForms] Error deleting form:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la suppression du formulaire',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// ============================================================================
// 📝 GESTION DES ÉTAPES
// ============================================================================

/**
 * POST /api/website-forms/:id/steps
 * Ajouter une étape au formulaire
 */
router.post('/:id/steps', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const { id } = req.params;
    const { title, subtitle, helpText, stepType, isRequired, condition, settings } = req.body;
    
    console.log('📋 [WebsiteForms] ADD step to form:', id);
    
    // Vérifier que le formulaire existe
    const form = await db.website_forms.findFirst({
      where: { id: Number(id), organizationId },
      include: { steps: true }
    });
    
    if (!form) {
      return res.status(404).json({ error: 'Formulaire non trouvé' });
    }
    
    // Calculer le prochain ordre
    const maxOrder = form.steps.reduce((max, s) => Math.max(max, s.order), -1);
    
    const step = await db.website_form_steps.create({
      data: {
        formId: Number(id),
        title,
        subtitle,
        helpText,
        stepType: stepType || 'single_choice',
        order: maxOrder + 1,
        isRequired: isRequired !== false,
        condition,
        settings: settings || {}
      },
      include: { fields: true }
    });
    
    console.log('✅ [WebsiteForms] Step created:', step.id);
    res.status(201).json(step);
  } catch (error) {
    console.error('❌ [WebsiteForms] Error creating step:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création de l\'étape',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * PUT /api/website-forms/steps/:stepId
 * Mettre à jour une étape
 */
router.put('/steps/:stepId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { stepId } = req.params;
    const { title, subtitle, helpText, stepType, order, isRequired, condition, settings } = req.body;
    
    console.log('📋 [WebsiteForms] UPDATE step:', stepId);
    
    const step = await db.website_form_steps.update({
      where: { id: Number(stepId) },
      data: {
        title,
        subtitle,
        helpText,
        stepType,
        order,
        isRequired,
        condition,
        settings
      },
      include: { fields: { orderBy: { order: 'asc' } } }
    });
    
    console.log('✅ [WebsiteForms] Step updated:', step.id);
    res.json(step);
  } catch (error) {
    console.error('❌ [WebsiteForms] Error updating step:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour de l\'étape',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * DELETE /api/website-forms/steps/:stepId
 * Supprimer une étape
 */
router.delete('/steps/:stepId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { stepId } = req.params;
    
    console.log('📋 [WebsiteForms] DELETE step:', stepId);
    
    await db.website_form_steps.delete({
      where: { id: Number(stepId) }
    });
    
    console.log('✅ [WebsiteForms] Step deleted:', stepId);
    res.json({ success: true, message: 'Étape supprimée' });
  } catch (error) {
    console.error('❌ [WebsiteForms] Error deleting step:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la suppression de l\'étape',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * PUT /api/website-forms/:id/steps/reorder
 * Réorganiser les étapes
 */
router.put('/:id/steps/reorder', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { stepIds } = req.body; // Array d'IDs dans le nouvel ordre
    
    console.log('📋 [WebsiteForms] REORDER steps for form:', id);
    
    // Mettre à jour l'ordre de chaque étape
    const updates = stepIds.map((stepId: number, index: number) => 
      db.website_form_steps.update({
        where: { id: stepId },
        data: { order: index }
      })
    );
    
    await Promise.all(updates);
    
    console.log('✅ [WebsiteForms] Steps reordered');
    res.json({ success: true });
  } catch (error) {
    console.error('❌ [WebsiteForms] Error reordering steps:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la réorganisation',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// ============================================================================
// 🔧 GESTION DES CHAMPS
// ============================================================================

/**
 * POST /api/website-forms/steps/:stepId/fields
 * Ajouter un champ à une étape
 */
router.post('/steps/:stepId/fields', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { stepId } = req.params;
    const { 
      label, value, fieldType, icon, imageUrl, placeholder, 
      helpText, defaultValue, validation, tblNodeId, tblNodeLabel,
      isDefault, condition, metadata 
    } = req.body;
    
    console.log('📋 [WebsiteForms] ADD field to step:', stepId);
    
    // Récupérer l'étape pour calculer l'ordre
    const step = await db.website_form_steps.findUnique({
      where: { id: Number(stepId) },
      include: { fields: true }
    });
    
    if (!step) {
      return res.status(404).json({ error: 'Étape non trouvée' });
    }
    
    const maxOrder = step.fields.reduce((max, f) => Math.max(max, f.order), -1);
    
    const field = await db.website_form_fields.create({
      data: {
        stepId: Number(stepId),
        label,
        value: value || label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        fieldType: fieldType || 'option',
        icon,
        imageUrl,
        placeholder,
        helpText,
        defaultValue,
        validation,
        tblNodeId,
        tblNodeLabel,
        order: maxOrder + 1,
        isDefault: isDefault || false,
        condition,
        metadata: metadata || {}
      }
    });
    
    console.log('✅ [WebsiteForms] Field created:', field.id);
    res.status(201).json(field);
  } catch (error) {
    console.error('❌ [WebsiteForms] Error creating field:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création du champ',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * PUT /api/website-forms/fields/:fieldId
 * Mettre à jour un champ
 */
router.put('/fields/:fieldId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fieldId } = req.params;
    const { 
      label, value, fieldType, icon, imageUrl, placeholder, 
      helpText, defaultValue, validation, tblNodeId, tblNodeLabel,
      order, isDefault, condition, metadata 
    } = req.body;
    
    console.log('📋 [WebsiteForms] UPDATE field:', fieldId);
    
    const field = await db.website_form_fields.update({
      where: { id: Number(fieldId) },
      data: {
        label,
        value,
        fieldType,
        icon,
        imageUrl,
        placeholder,
        helpText,
        defaultValue,
        validation,
        tblNodeId,
        tblNodeLabel,
        order,
        isDefault,
        condition,
        metadata
      }
    });
    
    console.log('✅ [WebsiteForms] Field updated:', field.id);
    res.json(field);
  } catch (error) {
    console.error('❌ [WebsiteForms] Error updating field:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour du champ',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * DELETE /api/website-forms/fields/:fieldId
 * Supprimer un champ
 */
router.delete('/fields/:fieldId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fieldId } = req.params;
    
    console.log('📋 [WebsiteForms] DELETE field:', fieldId);
    
    await db.website_form_fields.delete({
      where: { id: Number(fieldId) }
    });
    
    console.log('✅ [WebsiteForms] Field deleted:', fieldId);
    res.json({ success: true, message: 'Champ supprimé' });
  } catch (error) {
    console.error('❌ [WebsiteForms] Error deleting field:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la suppression du champ',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * PUT /api/website-forms/steps/:stepId/fields/reorder
 * Réorganiser les champs d'une étape
 */
router.put('/steps/:stepId/fields/reorder', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { stepId } = req.params;
    const { fieldIds } = req.body;
    
    console.log('📋 [WebsiteForms] REORDER fields for step:', stepId);
    
    const updates = fieldIds.map((fieldId: number, index: number) => 
      db.website_form_fields.update({
        where: { id: fieldId },
        data: { order: index }
      })
    );
    
    await Promise.all(updates);
    
    console.log('✅ [WebsiteForms] Fields reordered');
    res.json({ success: true });
  } catch (error) {
    console.error('❌ [WebsiteForms] Error reordering fields:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la réorganisation',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// ============================================================================
// 🔗 LIAISON FORMULAIRE <-> SITES
// ============================================================================

/**
 * POST /api/website-forms/:id/link-website
 * Lier un formulaire à un site
 */
router.post('/:id/link-website', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { websiteId, isDefault, urlPath } = req.body;
    
    console.log('📋 [WebsiteForms] LINK form', id, 'to website', websiteId);
    
    // Vérifier si la liaison existe déjà
    const existing = await db.website_form_website.findFirst({
      where: { formId: Number(id), websiteId: Number(websiteId) }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Ce formulaire est déjà lié à ce site' });
    }
    
    const link = await db.website_form_website.create({
      data: {
        formId: Number(id),
        websiteId: Number(websiteId),
        isDefault: isDefault || false,
        urlPath: urlPath || '/simulateur'
      },
      include: {
        website: { select: { id: true, siteName: true, slug: true } },
        form: { select: { id: true, name: true, slug: true } }
      }
    });
    
    console.log('✅ [WebsiteForms] Link created:', link.id);
    res.status(201).json(link);
  } catch (error) {
    console.error('❌ [WebsiteForms] Error linking:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la liaison',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * DELETE /api/website-forms/:id/unlink-website/:websiteId
 * Supprimer la liaison entre un formulaire et un site
 */
router.delete('/:id/unlink-website/:websiteId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, websiteId } = req.params;
    
    console.log('📋 [WebsiteForms] UNLINK form', id, 'from website', websiteId);
    
    await db.website_form_website.deleteMany({
      where: { 
        formId: Number(id), 
        websiteId: Number(websiteId) 
      }
    });
    
    console.log('✅ [WebsiteForms] Link deleted');
    res.json({ success: true, message: 'Liaison supprimée' });
  } catch (error) {
    console.error('❌ [WebsiteForms] Error unlinking:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la suppression de la liaison',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// ============================================================================
// 📊 STATISTIQUES
// ============================================================================

/**
 * GET /api/website-forms/:id/stats
 * Statistiques d'un formulaire
 */
router.get('/:id/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const _organizationId = getOrgId(req); // Garde pour validation future
    const { id } = req.params;
    
    console.log('📋 [WebsiteForms] GET stats for form:', id);
    
    const [total, completed, partial, recent] = await Promise.all([
      db.website_form_submissions.count({ where: { formId: Number(id) } }),
      db.website_form_submissions.count({ where: { formId: Number(id), status: 'completed' } }),
      db.website_form_submissions.count({ where: { formId: Number(id), status: 'partial' } }),
      db.website_form_submissions.findMany({
        where: { formId: Number(id) },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          leadId: true,
          status: true,
          createdAt: true,
          utmSource: true,
          utmCampaign: true
        }
      })
    ]);
    
    res.json({
      totalSubmissions: total,
      completedSubmissions: completed,
      partialSubmissions: partial,
      conversionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0,
      recentSubmissions: recent
    });
  } catch (error) {
    console.error('❌ [WebsiteForms] Error fetching stats:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des statistiques',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// ============================================================================
// 📋 CRUD QUESTIONS (Mode Simulateur - 1 écran = 1 question)
// ============================================================================

/**
 * GET /api/website-forms/:id/questions
 * Liste toutes les questions d'un formulaire (mode simulateur)
 */
router.get('/:id/questions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const { id } = req.params;
    
    console.log('📋 [WebsiteForms] GET questions for form:', id);
    
    // Vérifier que le formulaire appartient à l'organisation
    const form = await db.website_forms.findFirst({
      where: { id: Number(id), organizationId }
    });
    
    if (!form) {
      return res.status(404).json({ error: 'Formulaire non trouvé' });
    }
    
    const questions = await db.website_form_questions.findMany({
      where: { formId: Number(id) },
      orderBy: { order: 'asc' }
    });
    
    console.log(`✅ [WebsiteForms] Found ${questions.length} questions`);
    res.json(questions);
  } catch (error) {
    console.error('❌ [WebsiteForms] Error fetching questions:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des questions',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * POST /api/website-forms/:id/questions
 * Créer une nouvelle question (mode simulateur)
 */
router.post('/:id/questions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const { id } = req.params;
    const { 
      questionKey, 
      questionType, 
      title, 
      subtitle, 
      imageUrl, 
      order, 
      options, 
      navigation, 
      defaultNextQuestionKey, 
      isRequired, 
      placeholder,
      validationRules 
    } = req.body;
    
    console.log('📋 [WebsiteForms] CREATE question for form:', id, questionKey);
    
    // Vérifier que le formulaire appartient à l'organisation
    const form = await db.website_forms.findFirst({
      where: { id: Number(id), organizationId }
    });
    
    if (!form) {
      return res.status(404).json({ error: 'Formulaire non trouvé' });
    }
    
    // Vérifier unicité de la clé
    const existingKey = await db.website_form_questions.findFirst({
      where: { formId: Number(id), questionKey }
    });
    
    if (existingKey) {
      return res.status(400).json({ error: 'Cette clé de question existe déjà pour ce formulaire' });
    }
    
    const question = await db.website_form_questions.create({
      data: {
        formId: Number(id),
        questionKey,
        questionType,
        title,
        subtitle,
        imageUrl,
        order: order || 1,
        options: options || null,
        navigation: navigation || null,
        defaultNextQuestionKey,
        isRequired: isRequired !== false,
        placeholder,
        validationRules: validationRules || null
      }
    });
    
    console.log('✅ [WebsiteForms] Question created:', question.id);
    res.status(201).json(question);
  } catch (error) {
    console.error('❌ [WebsiteForms] Error creating question:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création de la question',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * PUT /api/website-forms/questions/:questionId
 * Mettre à jour une question
 */
router.put('/questions/:questionId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const { questionId } = req.params;
    const { 
      questionType, 
      title, 
      subtitle, 
      imageUrl, 
      order, 
      options, 
      navigation, 
      defaultNextQuestionKey, 
      isRequired, 
      placeholder,
      validationRules 
    } = req.body;
    
    console.log('📋 [WebsiteForms] UPDATE question:', questionId);
    
    // Vérifier que la question existe et appartient à l'organisation
    const existing = await db.website_form_questions.findUnique({
      where: { id: Number(questionId) },
      include: { form: true }
    });
    
    if (!existing || existing.form.organizationId !== organizationId) {
      return res.status(404).json({ error: 'Question non trouvée' });
    }
    
    const question = await db.website_form_questions.update({
      where: { id: Number(questionId) },
      data: {
        questionType,
        title,
        subtitle,
        imageUrl,
        order,
        options: options !== undefined ? options : undefined,
        navigation: navigation !== undefined ? navigation : undefined,
        defaultNextQuestionKey,
        isRequired,
        placeholder,
        validationRules: validationRules !== undefined ? validationRules : undefined
      }
    });
    
    console.log('✅ [WebsiteForms] Question updated:', question.id);
    res.json(question);
  } catch (error) {
    console.error('❌ [WebsiteForms] Error updating question:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour de la question',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * DELETE /api/website-forms/questions/:questionId
 * Supprimer une question
 */
router.delete('/questions/:questionId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const { questionId } = req.params;
    
    console.log('📋 [WebsiteForms] DELETE question:', questionId);
    
    // Vérifier que la question existe et appartient à l'organisation
    const existing = await db.website_form_questions.findUnique({
      where: { id: Number(questionId) },
      include: { form: true }
    });
    
    if (!existing || existing.form.organizationId !== organizationId) {
      return res.status(404).json({ error: 'Question non trouvée' });
    }
    
    await db.website_form_questions.delete({
      where: { id: Number(questionId) }
    });
    
    console.log('✅ [WebsiteForms] Question deleted');
    res.json({ success: true, message: 'Question supprimée' });
  } catch (error) {
    console.error('❌ [WebsiteForms] Error deleting question:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la suppression de la question',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// ============================================================================
// 🎯 TRACKING COMMERCIAL NOMINATIF
// ============================================================================

// Helper pour générer un slug utilisateur unique (prénom-nom)
const generateUserSlug = async (firstName: string, lastName: string, organizationId: string): Promise<string> => {
  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Retirer les accents
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const baseSlug = `${slugify(firstName)}-${slugify(lastName)}`;
  
  // Vérifier si ce slug existe déjà
  const existingUsers = await db.user.findMany({
    where: {
      organizationId,
      OR: [
        { firstName, lastName },
        {
          firstName: { startsWith: firstName },
          lastName: { startsWith: lastName }
        }
      ]
    }
  });

  // Si c'est le seul, pas de suffixe
  if (existingUsers.length === 0 || existingUsers.length === 1) {
    return baseSlug;
  }

  // Sinon, ajouter un numéro
  let counter = 2;
  let slug = `${baseSlug}-${counter}`;
  
  // Trouver le prochain numéro disponible
  while (counter < 100) {
    const exists = existingUsers.some(u => {
      const userSlug = `${slugify(u.firstName)}-${slugify(u.lastName)}`;
      return userSlug === slug;
    });
    
    if (!exists) break;
    counter++;
    slug = `${baseSlug}-${counter}`;
  }

  return slug;
};

export default router;

