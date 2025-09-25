// 🎯 DEVIS1MINUTE - Routes Landing Pages
import { Router } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { PrismaClient, type Prisma } from '@prisma/client';
import rateLimit from 'express-rate-limit';

const router = Router();
const prisma = new PrismaClient();

// 🔒 RATE LIMITING PUBLIC
const publicLandingRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 vues par minute par IP
  message: { success: false, message: 'Trop de requêtes landing pages' }
});

// 🔒 RATE LIMITING ADMIN
const adminLandingRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 requêtes par minute
  message: { success: false, message: 'Trop de requêtes landing admin' }
});

type JsonValue = Prisma.JsonValue;
type JsonObject = Prisma.JsonObject;

const isJsonObject = (value: JsonValue | null | undefined): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toJsonObject = (value: JsonValue | null | undefined): JsonObject =>
  (isJsonObject(value) ? value : {}) as JsonObject;

const toStringOrNull = (value: JsonValue | null | undefined): string | null =>
  (typeof value === 'string' ? value : null);

const toStringArray = (value: JsonValue | null | undefined): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

type LandingSnapshot = JsonObject & {
  id: string;
  label: string;
  createdAt: string;
  content: JsonObject;
  settings: JsonObject;
};

const toSnapshots = (value: JsonValue | null | undefined): LandingSnapshot[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is JsonObject => isJsonObject(item))
    .map((item) => {
      const id = toStringOrNull(item.id);
      const label = toStringOrNull(item.label) ?? `Snapshot ${new Date().toLocaleString()}`;
      const createdAt = toStringOrNull(item.createdAt) ?? new Date().toISOString();
      const content = toJsonObject(item.content ?? {});
      const settings = toJsonObject(item.settings ?? {});

      if (!id) {
        return null;
      }

      const snapshot: LandingSnapshot = {
        id,
        label,
        createdAt,
        content,
        settings
      };

      return snapshot;
    })
    .filter((snapshot): snapshot is LandingSnapshot => snapshot !== null);
};

// 🌐 GET /api/landing-pages/public/:slug - Affichage public d'une landing page
router.get('/public/:slug', publicLandingRateLimit, async (req, res) => {
  try {
    const { slug } = req.params;

    // Pas de modèle LandingPage dans le schéma actuel.
    // Utiliser TreeBranchLeafTree comme container de contenu public "landing" via category='landing'.
    // On tente de retrouver soit par id (slug=id), soit par name.
    const landingPage = await prisma.treeBranchLeafTree.findFirst({
      where: {
        category: 'landing',
        isPublic: true,
        OR: [
          { id: slug },
          { name: slug }
        ]
      },
      include: { Organization: { select: { name: true } } }
    });

    if (!landingPage) {
      return res.status(404).json({ 
        success: false, 
        message: 'Landing page non trouvée' 
      });
    }

    // Incrémenter le compteur de vues
    // Compte de vues: créer un enregistrement dans TreeBranchLeafSubmission comme trace minimaliste
    await prisma.treeBranchLeafSubmission.create({
      data: {
        treeId: landingPage.id,
        status: 'view',
        summary: {},
        exportData: {},
      }
    });

    // Extraire SEO et tracking à partir des blobs JSON existants (sans changer le schéma)
    const content = toJsonObject(landingPage.metadata);
    const styling = toJsonObject(landingPage.settings);
    const seo = toJsonObject(content.seo ?? null);
    const tracking = toJsonObject(styling.tracking ?? null);
    const title = toStringOrNull(content.title) ?? landingPage.name;
    const subtitle = toStringOrNull(content.subtitle);
    const ctaButton = toStringOrNull(content.ctaButton);
    const ctaUrl = toStringOrNull(content.ctaUrl);
    const seoTitle = toStringOrNull(seo.title) ?? landingPage.name;
    const seoDescription = toStringOrNull(seo.description);
    const keywords = toStringArray(seo.keywords);

    res.json({
      success: true,
      data: {
        id: landingPage.id,
        title,
        subtitle,
        content,
        seo: {
          title: seoTitle,
          description: seoDescription,
          keywords
        },
        styling,
        tracking, // { googleTagId?: string; metaPixelId?: string; enable?: boolean }
        ctaButton,
        ctaUrl,
        campaign: { name: landingPage.Organization?.name }
      }
    });

  } catch (error) {
    console.error('❌ [LANDING-PAGES] Erreur affichage public:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'affichage de la landing page' 
    });
  }
});

// 📊 POST /api/landing-pages/public/:slug/track - Tracking d'événements sur landing page
router.post('/public/:slug/track', publicLandingRateLimit, async (req, res) => {
  try {
    const { slug } = req.params;
    const { event, data = {} } = req.body;

    // Validation
    if (!event) {
      return res.status(400).json({ 
        success: false, 
        message: 'Type d\'événement requis' 
      });
    }

    const landingPage = await prisma.treeBranchLeafTree.findFirst({
      where: {
        category: 'landing',
        OR: [ { id: slug }, { name: slug } ]
      },
      select: { id: true, organizationId: true }
    });

    if (!landingPage) {
      return res.status(404).json({ 
        success: false, 
        message: 'Landing page non trouvée' 
      });
    }

    // Enregistrer l'événement de tracking
    // Utiliser TreeBranchLeafSubmission comme log d'événement minimal
    await prisma.treeBranchLeafSubmission.create({
      data: {
        treeId: landingPage.id,
        status: event,
        summary: data || {},
        exportData: {
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          referer: req.get('Referer')
        }
      }
    });

    // Incrémenter les compteurs spécifiques selon l'événement
    // Compteurs dérivés via agrégations, pas d'update direct requis ici.

    res.json({
      success: true,
      message: 'Événement trackė avec succès'
    });

  } catch (error) {
    console.error('❌ [LANDING-PAGES] Erreur tracking:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors du tracking' 
    });
  }
});

// === ROUTES ADMINISTRATEUR (AUTHENTIFIÉES) ===

router.use('/admin', authMiddleware);
router.use('/admin', adminLandingRateLimit);

// 📋 GET /api/landing-pages/admin/list - Liste des landing pages
router.get('/admin/list', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Organization ID manquant' 
      });
    }

    // Représenter les landing pages par les arbres TBL avec category='landing'
    const trees = await prisma.treeBranchLeafTree.findMany({
      where: { organizationId, category: 'landing' },
      orderBy: { createdAt: 'desc' }
    });

    // Pour chaque tree, compter les "vues" et "conversions" via TreeBranchLeafSubmission.status
    const data = await Promise.all(
      trees.map(async (t) => {
        const [views, conversions] = await Promise.all([
          prisma.treeBranchLeafSubmission.count({ where: { treeId: t.id, status: 'view' } }),
          prisma.treeBranchLeafSubmission.count({ where: { treeId: t.id, status: 'form_submit' } })
        ]);
        const conversionRate = views > 0 ? Math.round((conversions / views) * 100) : 0;
        const content = toJsonObject(t.metadata);
        const status = (t.status ?? 'draft').toUpperCase();
        return {
          id: t.id,
          title: t.name,
          slug: t.id,
          description: t.description ?? '',
          content,
          status,
          metaTitle: t.name,
          metaDescription: '',
          keywords: [],
          customCSS: '',
          customJS: '',
          trackingPixels: [],
          publishedAt: t.status === 'published' ? t.updatedAt : null,
          views,
          conversions,
          conversionRate,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt
        };
      })
    );

    res.json({ success: true, data });

  } catch (error) {
    console.error('❌ [LANDING-ADMIN] Erreur liste:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des landing pages' });
  }
});

// GET /api/landing-pages - alias simple pour la page front existante
router.get('/', authMiddleware, adminLandingRateLimit, requireRole(['admin','super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    // Réutiliser l'implémentation admin/list mais renvoyer data directement
    // pour compat avec la page frontend actuelle qui appelle /api/landing-pages
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organization ID manquant' });

    const trees = await prisma.treeBranchLeafTree.findMany({ where: { organizationId, category: 'landing' }, orderBy: { createdAt: 'desc' } });
    const data = await Promise.all(
      trees.map(async (t) => {
        const [views, conversions] = await Promise.all([
          prisma.treeBranchLeafSubmission.count({ where: { treeId: t.id, status: 'view' } }),
          prisma.treeBranchLeafSubmission.count({ where: { treeId: t.id, status: 'form_submit' } })
        ]);
        const conversionRate = views > 0 ? Math.round((conversions / views) * 100) : 0;
        const content = toJsonObject(t.metadata);
        const status = (t.status ?? 'draft').toUpperCase();
        return {
          id: t.id,
          title: t.name,
          slug: t.id,
          description: t.description ?? '',
          content,
          status,
          metaTitle: t.name,
          metaDescription: '',
          keywords: [],
          customCSS: '',
          customJS: '',
          trackingPixels: [],
          publishedAt: t.status === 'published' ? t.updatedAt : null,
          views,
          conversions,
          conversionRate,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt
        };
      })
    );
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [LANDING] Erreur / (list):', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des landing pages' });
  }
});

// GET /api/landing-pages/stats - statistiques globales
router.get('/stats', authMiddleware, adminLandingRateLimit, requireRole(['admin','super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organization ID manquant' });

    const totalPages = await prisma.treeBranchLeafTree.count({ where: { organizationId, category: 'landing' } });
    const publishedPages = await prisma.treeBranchLeafTree.count({ where: { organizationId, category: 'landing', status: 'published' } });
    const draftPages = totalPages - publishedPages;

    const [totalViews, totalConversions] = await Promise.all([
      prisma.treeBranchLeafSubmission.count({ where: { status: 'view', TreeBranchLeafTree: { organizationId, category: 'landing' } } }),
      prisma.treeBranchLeafSubmission.count({ where: { status: 'form_submit', TreeBranchLeafTree: { organizationId, category: 'landing' } } })
    ]);

    const avgConversionRate = totalViews > 0 ? Math.round((totalConversions / totalViews) * 100) : 0;
    res.json({ success: true, data: { totalPages, publishedPages, draftPages, totalViews, totalConversions, avgConversionRate } });
  } catch (error) {
    console.error('❌ [LANDING] Erreur /stats:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des statistiques' });
  }
});

// 📈 GET /api/landing-pages/stats/timeseries?days=30
router.get('/stats/timeseries', authMiddleware, adminLandingRateLimit, requireRole(['admin','super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organization ID manquant' });
  const daysParam = Array.isArray(req.query.days) ? req.query.days[0] : req.query.days;
  const requestedDays = Number.parseInt(daysParam ?? '30', 10);
  const safeDays = Number.isNaN(requestedDays) ? 30 : requestedDays;
  const days = Math.min(365, Math.max(1, safeDays));
    const start = new Date(); start.setDate(start.getDate() - (days - 1)); start.setHours(0,0,0,0);

    const submissions = await prisma.treeBranchLeafSubmission.findMany({
      where: { createdAt: { gte: start }, TreeBranchLeafTree: { organizationId, category: 'landing' } },
      select: { createdAt: true, status: true }
    });

    const byDay = new Map<string, { views: number; conversions: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(start.getTime()); d.setDate(start.getDate() + i);
      byDay.set(d.toISOString().slice(0,10), { views: 0, conversions: 0 });
    }
    for (const s of submissions) {
      const key = new Date(s.createdAt as unknown as Date).toISOString().slice(0,10);
      const rec = byDay.get(key); if (!rec) continue;
      if (s.status === 'view') rec.views++;
      if (s.status === 'form_submit') rec.conversions++;
    }
    const series = Array.from(byDay.entries()).map(([date, v]) => ({ date, views: v.views, conversions: v.conversions }));
    res.json({ success: true, data: { start: start.toISOString(), days, series } });
  } catch (error) {
    console.error('❌ [LANDING] Erreur timeseries:', error);
    res.status(500).json({ success: false, message: 'Erreur séries temporelles landing' });
  }
});

// === CRUD minimal pour la compatibilité avec la page front ===

// Créer
router.post('/', authMiddleware, adminLandingRateLimit, requireRole(['admin','super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organization ID manquant' });

  const { title, description, content, status, settings } = req.body as { title: string; description?: string; content?: unknown; status?: string; settings?: unknown };
    if (!title) return res.status(400).json({ success: false, message: 'Titre requis' });

    const created = await prisma.treeBranchLeafTree.create({
      data: {
        organizationId,
        name: title,
        description: description || '',
        category: 'landing',
        status: (status || 'DRAFT').toLowerCase(),
        metadata: content || {},
        settings: settings || {}
      }
    });
    res.json({ success: true, data: { id: created.id } });
  } catch (error) {
    console.error('❌ [LANDING] Erreur création:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la création' });
  }
});

// Mettre à jour
router.put('/:id', authMiddleware, adminLandingRateLimit, requireRole(['admin','super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organization ID manquant' });

    const tree = await prisma.treeBranchLeafTree.findFirst({ where: { id, organizationId, category: 'landing' } });
    if (!tree) return res.status(404).json({ success: false, message: 'Landing page non trouvée' });

    const { title, description, content, status, settings } = req.body as { title?: string; description?: string; content?: unknown; status?: string; settings?: unknown };
    const updated = await prisma.treeBranchLeafTree.update({
      where: { id },
      data: {
        name: title ?? tree.name,
        description: description ?? tree.description,
        metadata: content ?? tree.metadata,
        settings: settings ?? tree.settings,
        status: status ? status.toLowerCase() : tree.status
      }
    });
    res.json({ success: true, data: { id: updated.id } });
  } catch (error) {
    console.error('❌ [LANDING] Erreur mise à jour:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour' });
  }
});

// Supprimer
router.delete('/:id', authMiddleware, adminLandingRateLimit, requireRole(['admin','super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organization ID manquant' });

    const deleted = await prisma.treeBranchLeafTree.deleteMany({ where: { id, organizationId, category: 'landing' } });
    if (deleted.count === 0) return res.status(404).json({ success: false, message: 'Landing page non trouvée' });
    res.json({ success: true });
  } catch (error) {
    console.error('❌ [LANDING] Erreur suppression:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression' });
  }
});

// Publier / Dépublier
router.patch('/:id/publish', authMiddleware, adminLandingRateLimit, requireRole(['admin','super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { publish } = req.body as { publish?: boolean };
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organization ID manquant' });
    if (publish === undefined) return res.status(400).json({ success: false, message: 'Paramètre publish manquant' });

    const tree = await prisma.treeBranchLeafTree.findFirst({ where: { id, organizationId, category: 'landing' } });
    if (!tree) return res.status(404).json({ success: false, message: 'Landing page non trouvée' });

    const updated = await prisma.treeBranchLeafTree.update({ where: { id }, data: { status: publish ? 'published' : 'draft', isPublic: !!publish } });
    res.json({ success: true, data: { id: updated.id, status: updated.status } });
  } catch (error) {
    console.error('❌ [LANDING] Erreur publish:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la publication' });
  }
});

// 📄 GET /api/landing-pages/admin/:id - Détails d'une landing page (TreeBranchLeafTree)
router.get('/admin/:id', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organization ID manquant' });

    const tree = await prisma.treeBranchLeafTree.findFirst({ where: { id, organizationId, category: 'landing' } });
    if (!tree) return res.status(404).json({ success: false, message: 'Landing page non trouvée' });

    const content = toJsonObject(tree.metadata);
    const styling = toJsonObject(tree.settings);
    const seo = toJsonObject(content.seo ?? null);
    const tracking = toJsonObject(styling.tracking ?? null);
    const status = (tree.status ?? 'draft').toUpperCase();
    const seoTitle = toStringOrNull(seo.title) ?? tree.name;
    const seoDescription = toStringOrNull(seo.description) ?? '';
    const keywords = toStringArray(seo.keywords);

    res.json({
      success: true,
      data: {
        id: tree.id,
        title: tree.name,
        description: tree.description ?? '',
        status,
        content,
        seo: {
          title: seoTitle,
          description: seoDescription,
          keywords
        },
        styling,
        tracking,
        isPublic: !!tree.isPublic,
        createdAt: tree.createdAt,
        updatedAt: tree.updatedAt
      }
    });
  } catch (error) {
    console.error('❌ [LANDING-ADMIN] Erreur détail:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération du détail' });
  }
});

// 🧬 POST /api/landing-pages/:id/duplicate - Dupliquer la landing (draft)
router.post('/:id/duplicate', authMiddleware, adminLandingRateLimit, requireRole(['admin','super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organization ID manquant' });

    const tree = await prisma.treeBranchLeafTree.findFirst({ where: { id, organizationId, category: 'landing' } });
    if (!tree) return res.status(404).json({ success: false, message: 'Landing page non trouvée' });

    const suffix = Math.random().toString(36).slice(2, 6);
    const copy = await prisma.treeBranchLeafTree.create({
      data: {
        organizationId,
        name: `${tree.name} (copie ${suffix})`,
        description: tree.description || '',
        category: 'landing',
        status: 'draft',
        isPublic: false,
        metadata: toJsonObject(tree.metadata),
        settings: toJsonObject(tree.settings)
      }
    });
    res.json({ success: true, data: { id: copy.id } });
  } catch (error) {
    console.error('❌ [LANDING] Erreur duplication:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la duplication' });
  }
});

// 🧱 POST /api/landing-pages/:id/snapshot - Créer un snapshot (versionnage sans migration)
router.post('/:id/snapshot', authMiddleware, adminLandingRateLimit, requireRole(['admin','super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { label } = req.body as { label?: string };
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organization ID manquant' });

    const tree = await prisma.treeBranchLeafTree.findFirst({ where: { id, organizationId, category: 'landing' } });
    if (!tree) return res.status(404).json({ success: false, message: 'Landing page non trouvée' });

    const settings = toJsonObject(tree.settings);
    const versions = toSnapshots(settings._versions);
    const snapshotId = `${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    const snapshot: LandingSnapshot = {
      id: snapshotId,
      label: label || `Snapshot ${new Date().toLocaleString()}`,
      createdAt: new Date().toISOString(),
      content: toJsonObject(tree.metadata),
      settings: toJsonObject(tree.settings)
    };
    const updatedSettings: JsonObject = {
      ...settings,
      _versions: [snapshot, ...versions] as Prisma.JsonArray
    };
    const updated = await prisma.treeBranchLeafTree.update({ where: { id }, data: { settings: updatedSettings } });
    res.json({ success: true, data: { id: updated.id, snapshotId } });
  } catch (error) {
    console.error('❌ [LANDING] Erreur snapshot:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la création du snapshot' });
  }
});

// 🗂️ GET /api/landing-pages/:id/versions - Lister les versions
router.get('/:id/versions', authMiddleware, adminLandingRateLimit, requireRole(['admin','super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organization ID manquant' });

    const tree = await prisma.treeBranchLeafTree.findFirst({ where: { id, organizationId, category: 'landing' } });
    if (!tree) return res.status(404).json({ success: false, message: 'Landing page non trouvée' });
    const settings = toJsonObject(tree.settings);
    const versions = toSnapshots(settings._versions);
    res.json({
      success: true,
      data: versions.map((version) => ({
        id: version.id,
        label: version.label,
        createdAt: version.createdAt
      }))
    });
  } catch (error) {
    console.error('❌ [LANDING] Erreur versions:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des versions' });
  }
});

// ♻️ POST /api/landing-pages/:id/restore - Restaurer une version
router.post('/:id/restore', authMiddleware, adminLandingRateLimit, requireRole(['admin','super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { snapshotId } = req.body as { snapshotId: string };
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organization ID manquant' });
    if (!snapshotId) return res.status(400).json({ success: false, message: 'snapshotId requis' });

    const tree = await prisma.treeBranchLeafTree.findFirst({ where: { id, organizationId, category: 'landing' } });
    if (!tree) return res.status(404).json({ success: false, message: 'Landing page non trouvée' });
    const settings = toJsonObject(tree.settings);
    const versions = toSnapshots(settings._versions);
    const snap = versions.find((version) => version.id === snapshotId);
    if (!snap) return res.status(404).json({ success: false, message: 'Snapshot non trouvé' });

    const updated = await prisma.treeBranchLeafTree.update({
      where: { id },
      data: {
        metadata: snap.content,
        settings: { ...snap.settings, _versions: versions as Prisma.JsonArray }
      }
    });
    res.json({ success: true, data: { id: updated.id } });
  } catch (error) {
    console.error('❌ [LANDING] Erreur restore:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la restauration' });
  }
});

export default router;
