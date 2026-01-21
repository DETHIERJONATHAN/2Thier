// Routes gestion des formulaires publics (Public Forms) - RELOAD FIX
import { Router, type Response } from 'express';
import type {
  PublicForm as PrismaPublicForm,
  PublicFormSubmission as PrismaPublicFormSubmission
} from '@prisma/client';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { prisma } from '../lib/prisma.js';

// 🔍 DEBUG: Vérifier que prisma est bien importé
console.log('[PUBLIC-FORMS-DEBUG] prisma importé:', typeof prisma, prisma ? '✅ OK' : '❌ UNDEFINED');

const router = Router();

const submissionRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Trop de soumissions de formulaires' }
});

const adminRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { success: false, message: 'Trop de requetes formulaires' }
});

const rawBaseUrl =
  process.env.PUBLIC_FORMS_BASE_URL ||
  process.env.PUBLIC_SITE_URL ||
  process.env.FRONTEND_BASE_URL ||
  'https://devis1minute.be';
const PUBLIC_FORMS_BASE_URL = rawBaseUrl.replace(/\/$/, '');
const DEFAULT_EMBED_HEIGHT = Number.parseInt(process.env.PUBLIC_FORM_EMBED_HEIGHT ?? '', 10) || 520;

const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();

const generateFallbackSlug = () => `form-${Math.random().toString(36).slice(2, 8)}`;

const ensureUniqueSlug = async (
  organizationId: string,
  base: string,
  excludeFormId?: string
): Promise<string> => {
  const sanitized = base || generateFallbackSlug();
  let slug = sanitized;
  let counter = 1;
  const maxAttempts = 100;

  while (counter <= maxAttempts) {
    // Chercher tous les formulaires avec ce slug (actifs ET supprimés)
    const allWithSlug = await prisma.publicForm.findMany({
      where: {
        organizationId,
        slug,
        id: excludeFormId ? { not: excludeFormId } : undefined
      },
      select: { id: true, deletedAt: true }
    });

    if (allWithSlug.length === 0) {
      // Aucun formulaire avec ce slug, on peut l'utiliser
      console.log('[ensureUniqueSlug] ✅ Slug disponible:', slug);
      return slug;
    }

    // Vérifier si tous sont supprimés
    const activeOnes = allWithSlug.filter(f => f.deletedAt === null);
    const deletedOnes = allWithSlug.filter(f => f.deletedAt !== null);

    if (activeOnes.length === 0 && deletedOnes.length > 0) {
      // Tous sont supprimés : les supprimer définitivement pour libérer le slug
      console.log(`[ensureUniqueSlug] 🗑️ Suppression définitive de ${deletedOnes.length} formulaire(s) supprimé(s) avec le slug "${slug}"`);
      await prisma.publicForm.deleteMany({
        where: {
          id: { in: deletedOnes.map(f => f.id) }
        }
      });
      console.log('[ensureUniqueSlug] ✅ Slug libéré:', slug);
      return slug;
    }

    if (activeOnes.length > 0) {
      // Il existe un formulaire actif avec ce slug, essayer avec un compteur
      console.log('[ensureUniqueSlug] ⚠️ Slug déjà utilisé par un formulaire actif:', slug);
      slug = `${sanitized}-${counter++}`;
    }
  }

  // Fallback avec timestamp après 100 tentatives
  const timestamp = Date.now();
  const timestampedSlug = `${sanitized}-${timestamp}`;
  console.log('[ensureUniqueSlug] 🔄 Utilisation du slug avec timestamp:', timestampedSlug);
  return timestampedSlug;
};

const toPublicUrl = (slug: string) => `${PUBLIC_FORMS_BASE_URL}/forms/${slug}`;

const buildEmbedCode = (slug: string) => {
  const url = toPublicUrl(slug);
  return `<iframe src="${url}" title="Formulaire ${slug}" style="width:100%;max-width:600px;height:${DEFAULT_EMBED_HEIGHT}px;border:0;border-radius:12px;" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
};

const mapFormToResponse = (form: PrismaPublicForm) => {
  const rawFields = Array.isArray(form.fields as unknown[]) ? (form.fields as unknown[]) : [];

  return {
    id: form.id,
    name: form.name,
    description: form.description ?? undefined,
    category: form.category ?? 'contact',
    slug: form.slug,
    publicUrl: toPublicUrl(form.slug),
    embedCode: buildEmbedCode(form.slug),
    isActive: form.isActive && form.deletedAt === null,
    collectsRgpdConsent: form.collectsRgpdConsent,
    autoPublishLeads: form.autoPublishLeads,
    requiresCommercialTracking: form.requiresCommercialTracking ?? false,
    maxSubmissionsPerDay: form.maxSubmissionsPerDay ?? undefined,
    customCss: form.customCss ?? undefined,
    thankYouMessage: form.thankYouMessage,
    redirectUrl: form.redirectUrl ?? undefined,
    submissionCount: form.submissionCount ?? 0,
    conversionRate: Number(form.conversionRate ?? 0),
    lastSubmission: form.lastSubmissionAt ? form.lastSubmissionAt.toISOString() : undefined,
    createdAt: form.createdAt.toISOString(),
    updatedAt: form.updatedAt.toISOString(),
    fields: rawFields,
    campaigns: form.campaigns ?? []
  };
};

const mapSubmissionToResponse = (submission: PrismaPublicFormSubmission) => ({
  id: submission.id,
  formId: submission.formId,
  submittedAt: submission.createdAt.toISOString(),
  ipAddress: submission.ipAddress ?? '',
  userAgent: submission.userAgent ?? '',
  leadId: submission.leadId ?? undefined,
  data: (submission.data as Record<string, unknown>) ?? {},
  status: submission.status ?? 'new'
});

const optionalPositiveInt = z.preprocess((value) => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }
  return value;
}, z.number().int().positive().optional());

const formFieldSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    name: z.string().optional(),
    label: z.string().optional(),
    type: z.string().optional(),
    required: z.boolean().optional(),
    placeholder: z.string().optional(),
    options: z.array(z.string()).optional(),
    order: z.number().int().optional()
  })
  .passthrough();

const baseFormSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  description: z.string().max(1000).optional(),
  category: z.string().max(120).optional(),
  slug: z.string().max(160).optional(),
  fields: z.array(formFieldSchema).default([]),
  thankYouMessage: z.string().min(1).max(1000).optional(),
  redirectUrl: z.string().max(500).optional(),
  collectsRgpdConsent: z.boolean().optional(),
  autoPublishLeads: z.boolean().optional(),
  requiresCommercialTracking: z.boolean().optional(),
  maxSubmissionsPerDay: optionalPositiveInt,
  customCss: z.string().optional(),
  campaigns: z.array(z.string().min(1)).optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional()
});

const createFormSchema = baseFormSchema;
const updateFormSchema = baseFormSchema.partial();
const toggleSchema = z.object({ isActive: z.boolean() });

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
  const existingUsers = await prisma.user.findMany({
    where: {
      organizationId,
      OR: [
        { firstName, lastName },
        // Chercher aussi les variantes avec suffixe
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

const submissionSchema = z
  .object({
    formId: z.string().min(1),
    privacyConsent: z.boolean(),
    marketingConsent: z.boolean().optional()
  })
  .passthrough();

const normalizeFormPayload = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  const data = { ...(payload as Record<string, unknown>) };
  if (!data.name && typeof data.title === 'string') {
    data.name = data.title;
  }
  if (!data.thankYouMessage && typeof data.submissionMessage === 'string') {
    data.thankYouMessage = data.submissionMessage;
  }
  if (!data.fields && Array.isArray(data.formFields)) {
    data.fields = data.formFields;
  }
  if (data.maxSubmissionsPerDay === '') {
    data.maxSubmissionsPerDay = undefined;
  }
  return data;
};

const resolveOrganizationId = (req: AuthenticatedRequest, res: Response): string | null => {
  const organizationId = req.user?.organizationId;
  if (!organizationId) {
    res.status(400).json({ success: false, message: 'Organization ID manquant' });
    return null;
  }
  return organizationId;
};

const listFormsHandler = async (req: AuthenticatedRequest, res: Response) => {
  const organizationId = resolveOrganizationId(req, res);
  if (!organizationId) {
    return;
  }

  try {
    const forms = await prisma.publicForm.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });

    res.json(forms.map(mapFormToResponse));
  } catch (error) {
  console.error('[PUBLIC-FORMS] Liste impossible:', error);
  res.status(500).json({ success: false, message: 'Erreur lors de la recuperation des formulaires' });
  }
};

const statsHandler = async (req: AuthenticatedRequest, res: Response) => {
  const organizationId = resolveOrganizationId(req, res);
  if (!organizationId) {
    return;
  }

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [forms, totalSubmissions, todaySubmissions] = await prisma.$transaction([
      prisma.publicForm.findMany({
        where: { organizationId, deletedAt: null },
        select: { id: true, name: true, submissionCount: true, conversionRate: true, isActive: true }
      }),
      prisma.publicFormSubmission.count({ where: { organizationId } }),
      prisma.publicFormSubmission.count({
        where: { organizationId, createdAt: { gte: startOfDay } }
      })
    ]);

    const totalForms = forms.length;
    const activeForms = forms.filter((form) => form.isActive).length;
    const conversionRate =
      totalForms > 0
        ? Number(
            (
              forms.reduce((sum, form) => sum + Number(form.conversionRate ?? 0), 0) /
              totalForms
            ).toFixed(2)
          )
        : 0;

    const topForm = forms.reduce<null | (typeof forms)[number]>((best, current) => {
      if (!best || current.submissionCount > best.submissionCount) {
        return current;
      }
      return best;
    }, null);

    res.json({
      totalForms,
      activeForms,
      totalSubmissions,
      todaySubmissions,
      conversionRate,
      topPerformingForm: topForm?.name ?? ''
    });
  } catch (error) {
    console.error('[PUBLIC-FORMS] Statistiques impossibles:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la recuperation des statistiques' });
  }
};

const submissionsHandler = async (req: AuthenticatedRequest, res: Response) => {
  const organizationId = resolveOrganizationId(req, res);
  if (!organizationId) {
    return;
  }

  const { formId } = req.params;

  try {
    const form = await prisma.publicForm.findFirst({
      where: { id: formId, organizationId, deletedAt: null }
    });

    if (!form) {
      res.status(404).json({ success: false, message: 'Formulaire introuvable' });
      return;
    }

    const submissions = await prisma.publicFormSubmission.findMany({
      where: { formId: form.id, organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json(submissions.map(mapSubmissionToResponse));
  } catch (error) {
    console.error('[PUBLIC-FORMS] Soumissions impossibles:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la recuperation des soumissions' });
  }
};

const createFormHandler = async (req: AuthenticatedRequest, res: Response) => {
  const organizationId = resolveOrganizationId(req, res);
  if (!organizationId) {
    return;
  }

  const normalized = normalizeFormPayload(req.body);
  const parsed = createFormSchema.safeParse(normalized);

  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Donnees invalides', issues: parsed.error.flatten() });
    return;
  }

  try {
    const payload = parsed.data;
    const baseSlug = slugify(payload.slug ?? payload.name);
    const slug = await ensureUniqueSlug(organizationId, baseSlug);

    const created = await prisma.publicForm.create({
      data: {
        organizationId,
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        category: (payload.category ?? 'contact').toLowerCase(),
        slug,
        fields: payload.fields,
        thankYouMessage: payload.thankYouMessage ?? 'Merci pour votre soumission !',
        redirectUrl: payload.redirectUrl?.trim() || null,
        collectsRgpdConsent: payload.collectsRgpdConsent ?? true,
        autoPublishLeads: payload.autoPublishLeads ?? false,
        requiresCommercialTracking: payload.requiresCommercialTracking ?? false,
        maxSubmissionsPerDay: payload.maxSubmissionsPerDay ?? null,
        customCss: payload.customCss ?? null,
        campaigns: payload.campaigns ?? [],
        isActive: payload.isActive ?? true,
        isPublic: payload.isPublic ?? true,
        submissionCount: 0,
        conversionRate: 0
      }
    });

    res.status(201).json(mapFormToResponse(created));
  } catch (error) {
    console.error('[PUBLIC-FORMS] Creation impossible:', error);
    
    // Erreur de contrainte unique (ne devrait plus arriver avec la nouvelle logique)
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      res.status(409).json({ 
        success: false, 
        message: 'Un formulaire avec ce nom existe déjà. Veuillez choisir un autre nom.' 
      });
      return;
    }
    
    res.status(500).json({ success: false, message: 'Erreur lors de la création du formulaire' });
  }
};

const updateFormHandler = async (req: AuthenticatedRequest, res: Response) => {
  const organizationId = resolveOrganizationId(req, res);
  if (!organizationId) {
    return;
  }

  const { formId } = req.params;
  const normalized = normalizeFormPayload(req.body);
  const parsed = updateFormSchema.safeParse(normalized);

  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Donnees invalides', issues: parsed.error.flatten() });
    return;
  }

  try {
    const form = await prisma.publicForm.findFirst({
      where: { id: formId, organizationId, deletedAt: null }
    });

    if (!form) {
      res.status(404).json({ success: false, message: 'Formulaire introuvable' });
      return;
    }

    const payload = parsed.data;
    let nextSlug = form.slug;

    if (payload.slug || payload.name) {
      const baseSlug = slugify(payload.slug ?? payload.name ?? form.name);
      nextSlug = await ensureUniqueSlug(organizationId, baseSlug, form.id);
    }

    const data: Record<string, unknown> = {};

    if (payload.name !== undefined) data.name = payload.name.trim();
    if (payload.description !== undefined) data.description = payload.description?.trim() || null;
    if (payload.category !== undefined) data.category = payload.category;
    if (payload.fields !== undefined) data.fields = payload.fields;
    if (payload.thankYouMessage !== undefined) data.thankYouMessage = payload.thankYouMessage;
    if (payload.redirectUrl !== undefined) data.redirectUrl = payload.redirectUrl?.trim() || null;
    if (payload.collectsRgpdConsent !== undefined) data.collectsRgpdConsent = payload.collectsRgpdConsent;
    if (payload.autoPublishLeads !== undefined) data.autoPublishLeads = payload.autoPublishLeads;
    if (payload.requiresCommercialTracking !== undefined) data.requiresCommercialTracking = payload.requiresCommercialTracking;
    if (payload.maxSubmissionsPerDay !== undefined) data.maxSubmissionsPerDay = payload.maxSubmissionsPerDay ?? null;
    if (payload.customCss !== undefined) data.customCss = payload.customCss ?? null;
    if (payload.campaigns !== undefined) data.campaigns = payload.campaigns;
    if (payload.isActive !== undefined) data.isActive = payload.isActive;
    if (nextSlug !== form.slug) data.slug = nextSlug;

    const updated = await prisma.publicForm.update({
      where: { id: form.id },
      data
    });

    res.json(mapFormToResponse(updated));
  } catch (error) {
    console.error('[PUBLIC-FORMS] Mise à jour impossible:', error);
    
    // Erreur de contrainte unique lors de la modification du slug
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      res.status(409).json({ 
        success: false, 
        message: 'Un formulaire avec ce nom existe déjà. Veuillez choisir un autre nom.' 
      });
      return;
    }
    
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du formulaire' });
  }
};

const toggleFormHandler = async (req: AuthenticatedRequest, res: Response) => {
  const organizationId = resolveOrganizationId(req, res);
  if (!organizationId) {
    return;
  }

  const { formId } = req.params;
  const parsed = toggleSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Donnees invalides', issues: parsed.error.flatten() });
    return;
  }

  try {
    const form = await prisma.publicForm.findFirst({
      where: { id: formId, organizationId, deletedAt: null }
    });

    if (!form) {
      res.status(404).json({ success: false, message: 'Formulaire introuvable' });
      return;
    }

    const updated = await prisma.publicForm.update({
      where: { id: form.id },
      data: { isActive: parsed.data.isActive }
    });

    res.json(mapFormToResponse(updated));
  } catch (error) {
    console.error('[PUBLIC-FORMS] Toggle impossible:', error);
    res.status(500).json({ success: false, message: 'Erreur lors du changement de statut du formulaire' });
  }
};

const deleteFormHandler = async (req: AuthenticatedRequest, res: Response) => {
  const organizationId = resolveOrganizationId(req, res);
  if (!organizationId) {
    return;
  }

  const { formId } = req.params;

  try {
    const form = await prisma.publicForm.findFirst({
      where: { id: formId, organizationId, deletedAt: null }
    });

    if (!form) {
      res.status(404).json({ success: false, message: 'Formulaire introuvable' });
      return;
    }

    // Modifier le slug pour libérer le nom (éviter les conflits avec la contrainte UNIQUE)
    const deletedSlug = `${form.slug}-deleted-${Date.now()}`;
    
    await prisma.publicForm.update({
      where: { id: form.id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        slug: deletedSlug // Libère le slug original pour réutilisation
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[PUBLIC-FORMS] Suppression impossible:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression du formulaire' });
  }
};

router.get(
  '/',
  authMiddleware,
  requireRole(['admin', 'super_admin']),
  adminRateLimit,
  listFormsHandler
);
router.get(
  '/stats',
  authMiddleware,
  requireRole(['admin', 'super_admin']),
  adminRateLimit,
  statsHandler
);
router.get(
  '/:formId/submissions',
  authMiddleware,
  requireRole(['admin', 'super_admin']),
  adminRateLimit,
  submissionsHandler
);
router.get(
  '/:formId',
  authMiddleware,
  requireRole(['admin', 'super_admin']),
  adminRateLimit,
  async (req, res) => {
    try {
      const { formId } = req.params;
      const user = (req as any).user;

      const form = await prisma.publicForm.findFirst({
        where: {
          id: formId,
          deletedAt: null,
          ...(user.isSuperAdmin ? {} : { organizationId: user.organizationId })
        }
      });

      if (!form) {
        return res.status(404).json({ success: false, message: 'Formulaire introuvable' });
      }

      res.json(form);
    } catch (error) {
      console.error('[PUBLIC-FORMS] Erreur récupération formulaire:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la récupération du formulaire' });
    }
  }
);
router.post(
  '/',
  authMiddleware,
  requireRole(['admin', 'super_admin']),
  adminRateLimit,
  createFormHandler
);
router.put(
  '/:formId',
  authMiddleware,
  requireRole(['admin', 'super_admin']),
  adminRateLimit,
  updateFormHandler
);
router.patch(
  '/:formId/toggle',
  authMiddleware,
  requireRole(['admin', 'super_admin']),
  adminRateLimit,
  toggleFormHandler
);
router.delete(
  '/:formId',
  authMiddleware,
  requireRole(['admin', 'super_admin']),
  adminRateLimit,
  deleteFormHandler
);

const adminRouter = Router();
adminRouter.get('/list', listFormsHandler);
adminRouter.get('/stats', statsHandler);
adminRouter.get('/:formId/submissions', submissionsHandler);
adminRouter.post('/create', createFormHandler);
adminRouter.put('/:formId', updateFormHandler);
adminRouter.patch('/:formId/toggle', toggleFormHandler);
adminRouter.post('/:formId/toggle', toggleFormHandler);
adminRouter.delete('/:formId', deleteFormHandler);
router.use(
  '/admin',
  authMiddleware,
  requireRole(['admin', 'super_admin']),
  adminRateLimit,
  adminRouter
);

// Route pour obtenir les liens commerciaux d'un utilisateur (accessible à tous les utilisateurs authentifiés)
router.get('/my-commercial-links', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const organizationId = req.user?.organizationId;

  if (!userId || !organizationId) {
    res.status(401).json({ success: false, message: 'Non authentifié' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true }
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
      return;
    }

    // Générer le slug utilisateur unique
    const userSlug = await generateUserSlug(user.firstName, user.lastName, organizationId);

    // Récupérer tous les formulaires nominatifs actifs de l'organisation
    const forms = await prisma.publicForm.findMany({
      where: {
        organizationId,
        requiresCommercialTracking: true,
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        isActive: true,
        submissionCount: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      userSlug,
      forms
    });
  } catch (error) {
    console.error('[PUBLIC-FORMS] Erreur récupération liens commerciaux:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération' });
  }
});

router.get('/public/:identifier/config', async (req, res) => {
  try {
    const { identifier } = req.params;
    const form = await prisma.publicForm.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
        isPublic: true,
        OR: [{ id: identifier }, { slug: identifier }]
      }
    });

    if (!form) {
      res.status(404).json({ success: false, message: 'Formulaire introuvable' });
      return;
    }

    const fields = Array.isArray(form.fields as unknown[]) ? (form.fields as unknown[]) : [];

    res.json({
      success: true,
      data: {
        id: form.id,
        title: form.name,
        name: form.name,
        description: form.description,
        fields,
        styling: {
          submitLabel: 'Envoyer',
          customCss: form.customCss ?? undefined,
          redirectUrl: form.redirectUrl ?? undefined
        },
        submissionMessage: form.thankYouMessage
      }
    });
  } catch (error) {
  console.error('[PUBLIC-FORMS] Config publique impossible:', error);
  res.status(500).json({ success: false, message: 'Erreur lors de la recuperation de la configuration du formulaire' });
  }
});

router.post('/submit', submissionRateLimit, async (req, res) => {
  const parsed = submissionSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Donnees de soumission invalides', issues: parsed.error.flatten() });
    return;
  }

  const { formId, privacyConsent, marketingConsent = false, ref, ...payload } = parsed.data as {
    formId: string;
    privacyConsent: boolean;
    marketingConsent?: boolean;
    ref?: string;
    [key: string]: unknown;
  };

  if (!privacyConsent) {
  res.status(400).json({ success: false, message: 'Consentement de confidentialite requis' });
    return;
  }

  try {
    const form = await prisma.publicForm.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
        isPublic: true,
        OR: [{ id: formId }, { slug: formId }]
      }
    });

    if (!form) {
      res.status(404).json({ success: false, message: 'Formulaire introuvable' });
      return;
    }

    if (form.maxSubmissionsPerDay) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const submissionsToday = await prisma.publicFormSubmission.count({
        where: {
          formId: form.id,
          createdAt: { gte: startOfDay }
        }
      });

      if (submissionsToday >= form.maxSubmissionsPerDay) {
        res.status(429).json({ success: false, message: 'Limite de soumissions atteinte pour aujourd\'hui' });
        return;
      }
    }

    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const userAgent = req.headers['user-agent'] ?? 'unknown';

    // Extraire le commercial référent depuis le paramètre 'ref'
    const referredBy = ref || null;

    const submission = await prisma.publicFormSubmission.create({
      data: {
        formId: form.id,
        organizationId: form.organizationId,
        data: payload,
        status: 'new',
        ipAddress,
        userAgent,
        privacyConsent,
        marketingConsent,
        referredBy
      }
    });

    await prisma.publicForm.update({
      where: { id: form.id },
      data: {
        submissionCount: { increment: 1 },
        lastSubmissionAt: new Date()
      }
    });

    // 🎯 Si autoPublishLeads est activé, créer automatiquement un lead
    if (form.autoPublishLeads) {
      try {
        const leadData: Record<string, unknown> = {
          organizationId: form.organizationId,
          source: 'public-form',
          status: 'nouveau',
          notes: `Lead créé automatiquement depuis le formulaire "${form.name}"`,
          data: payload
        };

        // Extraire les champs standards si présents dans payload
        if (payload.firstName) leadData.firstName = payload.firstName;
        if (payload.lastName) leadData.lastName = payload.lastName;
        if (payload.email) leadData.email = payload.email;
        if (payload.phone) leadData.phone = payload.phone;
        if (payload.company) leadData.company = payload.company;

        // 🔥 Si un commercial est référent (tracking nominatif), attribuer le lead
        if (referredBy) {
          // Le referredBy est maintenant au format "prenom-nom" ou "prenom-nom-2"
          // On doit retrouver l'utilisateur correspondant
          const slugParts = referredBy.split('-');
          
          // Chercher l'utilisateur par firstName et lastName
          const users = await prisma.user.findMany({
            where: {
              organizationId: form.organizationId
            }
          });

          // Trouver l'utilisateur dont le slug correspond
          let referrer = null;
          for (const u of users) {
            const userSlug = await generateUserSlug(u.firstName, u.lastName, form.organizationId);
            if (userSlug === referredBy) {
              referrer = u;
              break;
            }
          }

          if (referrer) {
            leadData.assignedUserId = referrer.id;
            leadData.notes = `Lead créé depuis le formulaire "${form.name}" via le lien de ${referrer.firstName} ${referrer.lastName}`;
            console.log(`✅ [PUBLIC-FORMS] Lead attribué automatiquement à ${referrer.firstName} ${referrer.lastName}`);
          } else {
            console.warn(`⚠️ [PUBLIC-FORMS] Utilisateur référent introuvable pour le slug: ${referredBy}`);
          }
        }

        const lead = await prisma.lead.create({ data: leadData as any });

        // Mettre à jour la soumission avec le leadId
        await prisma.publicFormSubmission.update({
          where: { id: submission.id },
          data: { leadId: lead.id }
        });

        console.log(`✅ [PUBLIC-FORMS] Lead créé automatiquement: ${lead.id}`);
      } catch (leadError) {
        console.error('[PUBLIC-FORMS] Erreur lors de la création du lead:', leadError);
        // Ne pas bloquer la soumission si la création du lead échoue
      }
    }

    res.json({
      success: true,
      message: form.thankYouMessage,
      data: {
        submissionId: submission.id,
        submittedAt: submission.createdAt.toISOString()
      }
    });
  } catch (error) {
  console.error('[PUBLIC-FORMS] Soumission impossible:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la soumission du formulaire' });
  }
});

export default router;
