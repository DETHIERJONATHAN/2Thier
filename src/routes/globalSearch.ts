import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { authenticateToken, fetchFullUser } from '../middleware/auth';

const router = Router();
router.use(authenticateToken as any);
router.use(fetchFullUser as any);

// ═══════════════════════════════════════════════════════════════
// Métadonnées des tables connues : catégorie, label, icône, route
// + colonnes intelligentes pour label/description
// ═══════════════════════════════════════════════════════════════
interface TableConfig {
  category: string;
  label: string;
  icon: string;
  routeFn: (id: string) => string;
  /** Colonnes à utiliser comme label principal (premier trouvé non-vide) */
  labelCols?: string[];
  /** Colonnes à utiliser comme description (concaténées) */
  descCols?: string[];
}

const TABLE_META: Record<string, TableConfig> = {
  User:              { category: 'users',      label: 'Utilisateur',     icon: 'user',      routeFn: id => `/profile/${id}`,          labelCols: ['firstName', 'lastName'], descCols: ['email', 'role', 'phone'] },
  Lead:              { category: 'leads',      label: 'Lead / Client',   icon: 'contacts',  routeFn: id => `/leads/${id}`,            labelCols: ['firstName', 'lastName'], descCols: ['company', 'email', 'phone', 'leadNumber', 'status'] },
  Chantier:          { category: 'chantiers',  label: 'Chantier',        icon: 'tool',      routeFn: id => `/chantiers/${id}`,        labelCols: ['customLabel', 'clientName'], descCols: ['siteAddress', 'productLabel', 'notes'] },
  Quote:             { category: 'quotes',     label: 'Devis',           icon: 'file-text', routeFn: id => `/quotes/${id}`,           labelCols: ['title', 'number'], descCols: ['notes', 'status'] },
  GeneratedDocument: { category: 'documents',  label: 'Document',        icon: 'file-pdf',  routeFn: id => `/documents/${id}`,        labelCols: ['title', 'documentNumber'], descCols: ['pdfFilename', 'type', 'status'] },
  WallPost:          { category: 'posts',      label: 'Post',            icon: 'message',   routeFn: id => `/dashboard?post=${id}`,   labelCols: ['content'], descCols: ['mediaType'] },
  Email:             { category: 'emails',     label: 'Email',           icon: 'mail',      routeFn: id => `/emails/${id}`,           labelCols: ['subject'], descCols: ['from', 'to'] },
  CalendarEvent:     { category: 'events',     label: 'Événement',       icon: 'calendar',  routeFn: id => `/calendar?event=${id}`,   labelCols: ['title'], descCols: ['description', 'location', 'type'] },
  Module:            { category: 'modules',    label: 'Module',          icon: 'appstore',  routeFn: id => `/dashboard?module=${id}`, labelCols: ['label', 'key'], descCols: ['description', 'feature'] },
  Product:           { category: 'products',   label: 'Produit',         icon: 'appstore',  routeFn: id => `/products/${id}`,         labelCols: ['name', 'label'], descCols: ['description', 'category'] },
  Organization:      { category: 'orgs',       label: 'Colony',          icon: 'team',      routeFn: id => `/colony/${id}`,           labelCols: ['name'], descCols: ['domain', 'email'] },
  Order:             { category: 'orders',     label: 'Commande',        icon: 'file-text', routeFn: id => `/orders/${id}`,           labelCols: ['orderNumber', 'title'], descCols: ['status', 'notes'] },
  JoinRequest:       { category: 'requests',   label: 'Demande',         icon: 'user',      routeFn: () => `/admin/join-requests`,    labelCols: ['req_name'], descCols: ['addr_name', 'status', 'source'] },
  contact_submissions: { category: 'contacts', label: 'Contact',         icon: 'contacts',  routeFn: id => `/contacts/${id}`,         labelCols: ['name', 'email'], descCols: ['phone', 'message'] },
  DocumentTemplate:  { category: 'templates',  label: 'Template',        icon: 'file-pdf',  routeFn: id => `/templates/${id}`,        labelCols: ['name', 'title'], descCols: ['description'] },
  EmailTemplate:     { category: 'templates',  label: 'Template Email',  icon: 'mail',      routeFn: id => `/email-templates/${id}`,  labelCols: ['name', 'subject'], descCols: ['description'] },
  ChantierStatus:    { category: 'chantiers',  label: 'Statut Chantier', icon: 'tool',      routeFn: () => `/settings/chantiers`,     labelCols: ['name'], descCols: ['color'] },
  Category:          { category: 'categories', label: 'Catégorie',       icon: 'appstore',  routeFn: id => `/categories/${id}`,       labelCols: ['name'], descCols: ['description'] },
  Notification:      { category: 'notifs',     label: 'Notification',    icon: 'mail',      routeFn: () => `/notifications`,          labelCols: ['title', 'message'], descCols: ['type'] },
  website_forms:     { category: 'forms',      label: 'Formulaire',      icon: 'form',      routeFn: id => `/form/${id}`,             labelCols: ['name'], descCols: ['description', 'status'] },
  TreeBranchLeafTree: { category: 'trees',     label: 'Formulaire',      icon: 'form',      routeFn: id => `/tbl/${id}`,              labelCols: ['name', 'label'], descCols: ['description'] },
};

// Tables à exclure de la recherche (internes, techniques, trop volumineuses)
const EXCLUDED_TABLES = new Set([
  '_prisma_migrations', 'verification_checksums',
  'AnalyticsEvent', 'AiUsageLog', 'GoogleTokenRefreshHistory',
  'PushSubscription', 'SystemConfig', 'IntegrationsSettings',
  'CalibrationProfile', 'MeasurePhotoPoint',
]);

// Colonnes sensibles/inutiles — JAMAIS affichées ni cherchées
const SENSITIVE_COLUMNS = new Set([
  'password', 'passwordHash', 'hashedPassword', 'hash',
  'token', 'accessToken', 'refreshToken', 'apiKey', 'secret',
  'encryptedPassword', 'resetToken', 'verificationToken',
  'sessionToken', 'jwtToken', 'privateKey', 'publicKey',
  'credentials', 'oauthToken', 'authToken',
]);

// Regex pour valider les noms de tables/colonnes (sécurité injection SQL)
const SAFE_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

// ═══════════════════════════════════════════════════════════════
// GET /api/search/global?q=query&limit=5
// Recherche universelle — scanne TOUTE la base de données
// ═══════════════════════════════════════════════════════════════
router.get('/global', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  const q = (req.query.q as string || '').trim();
  if (q.length < 2) {
    res.json({ results: {}, query: q, total: 0 });
    return;
  }

  const perTable = Math.min(parseInt(req.query.limit as string) || 5, 10);

  try {
    // ── Phase 1 : Découvrir TOUTES les colonnes texte de la base ──
    const textColumns = await db.$queryRaw<Array<{ table_name: string; column_name: string }>>`
      SELECT c.table_name, c.column_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON c.table_name = t.table_name AND t.table_schema = c.table_schema
      WHERE c.table_schema = 'public'
        AND c.data_type IN ('text', 'character varying')
        AND t.table_type = 'BASE TABLE'
        AND c.table_name NOT LIKE '_prisma%'
      ORDER BY c.table_name, c.ordinal_position
    `;

    // Tables qui ont une colonne "id"
    const idCheck = await db.$queryRaw<Array<{ table_name: string }>>`
      SELECT DISTINCT table_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = 'id'
    `;
    const tablesWithId = new Set(idCheck.map(r => r.table_name));

    // ── Phase 2 : Grouper colonnes par table (exclure sensibles) ──
    const tableMap = new Map<string, string[]>();
    for (const { table_name, column_name } of textColumns) {
      if (EXCLUDED_TABLES.has(table_name)) continue;
      if (!tablesWithId.has(table_name)) continue;
      if (SENSITIVE_COLUMNS.has(column_name)) continue;
      if (!SAFE_IDENTIFIER.test(table_name) || !SAFE_IDENTIFIER.test(column_name)) continue;
      if (!tableMap.has(table_name)) tableMap.set(table_name, []);
      tableMap.get(table_name)!.push(column_name);
    }

    if (tableMap.size === 0) {
      res.json({ results: {}, query: q, total: 0 });
      return;
    }

    // ── Phase 3 : Construire le UNION ALL dynamique ──
    // Pour chaque table, on cherche dans les colonnes texte et on remonte
    // les colonnes de label/desc configurées (ou les premières colonnes safe)
    const subQueries: string[] = [];
    for (const [table, cols] of tableMap) {
      const meta = TABLE_META[table];
      const searchCols = cols.slice(0, 15);
      const whereOr = searchCols.map(c => `"${c}" ILIKE $1`).join(' OR ');

      // Colonnes pour le label : utiliser la config ou les premières colonnes
      const labelCandidates = meta?.labelCols?.filter(c => cols.includes(c)) || [];
      const descCandidates = meta?.descCols?.filter(c => cols.includes(c)) || [];

      // Si pas de config, prendre intelligemment les premières colonnes non-id
      const safeCols = cols.filter(c => c !== 'id' && !c.endsWith('Id') && !c.endsWith('_id'));
      const labelParts = labelCandidates.length > 0
        ? labelCandidates.map(c => `COALESCE("${c}",'')`).join(` || ' ' || `)
        : safeCols.length > 0
          ? `COALESCE("${safeCols[0]}",'')`
          : `'${table}'`;
      const descParts = descCandidates.length > 0
        ? descCandidates.map(c => `LEFT(COALESCE("${c}",''), 100)`)
        : safeCols.slice(1, 4).map(c => `LEFT(COALESCE("${c}",''), 100)`);
      const descSql = descParts.length > 0
        ? `CONCAT_WS(' · ', ${descParts.join(', ')})`
        : `''`;

      // Quelle colonne a matché ?
      const matchCase = searchCols.map(c => `WHEN "${c}" ILIKE $1 THEN '${c}'`).join(' ');

      subQueries.push(
        `(SELECT '${table}'::text AS "tbl", "id"::text AS "rid", ` +
        `(CASE ${matchCase} ELSE '${searchCols[0]}' END)::text AS "matchCol", ` +
        `(${labelParts})::text AS "label", ` +
        `(${descSql})::text AS "desc" ` +
        `FROM "${table}" WHERE (${whereOr}) LIMIT ${perTable})`
      );
    }

    const fullSql = subQueries.join('\nUNION ALL\n') + '\nLIMIT 60';
    const rawResults = await db.$queryRawUnsafe<Array<{
      tbl: string; rid: string; matchCol: string; label: string; desc: string;
    }>>(fullSql, `%${q}%`);

    // ── Phase 4 : Enrichir et organiser les résultats ──
    const grouped: Record<string, any[]> = {};

    for (const row of rawResults) {
      const meta = TABLE_META[row.tbl] || {
        category: 'other',
        label: row.tbl,
        icon: 'search',
        routeFn: () => '',
      };

      const cat = meta.category;
      if (!grouped[cat]) grouped[cat] = [];

      const cleanLabel = (row.label || '').replace(/\s+/g, ' ').trim() || meta.label;
      const cleanDesc = (row.desc || '').replace(/\s+/g, ' ').trim();
      // Ajouter l'info de la table + colonne matchée quand pertinent
      const descWithContext = cleanDesc
        ? `${cleanDesc}`
        : `${meta.label} — trouvé dans "${row.matchCol}"`;

      grouped[cat].push({
        id: row.rid,
        _type: cat,
        _label: cleanLabel.length > 80 ? cleanLabel.substring(0, 80) + '…' : cleanLabel,
        _desc: descWithContext.length > 140 ? descWithContext.substring(0, 140) + '…' : descWithContext,
        _route: meta.routeFn(row.rid),
        _icon: meta.icon,
        _table: row.tbl,
        _matchedColumn: row.matchCol,
      });
    }

    const total = rawResults.length;

    // ── Phase 5 : Dédoublonnage des noms identiques ──
    // Pour chaque catégorie (users, leads, etc.), si 2+ résultats ont le même _label,
    // on ajoute un suffixe tiré de la description pour les distinguer
    for (const cat of Object.keys(grouped)) {
      const items = grouped[cat];
      const labelCounts = new Map<string, number>();
      for (const item of items) {
        labelCounts.set(item._label, (labelCounts.get(item._label) || 0) + 1);
      }
      for (const item of items) {
        if ((labelCounts.get(item._label) || 0) > 1 && item._desc) {
          // Extract first useful part of description as suffix
          const suffix = item._desc.split(' · ')[0]?.trim();
          if (suffix && suffix.length > 0 && suffix.length < 50) {
            item._label = `${item._label} (${suffix})`;
          }
        }
      }
    }

    res.json({ results: grouped, query: q, total });

  } catch (err) {
    console.error('[GLOBAL SEARCH] Error:', err);
    res.status(500).json({ error: 'Erreur lors de la recherche' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/search/web?q=query&limit=10
// Recherche web via SearXNG self-hosted (proxy backend)
// ═══════════════════════════════════════════════════════════════
const SEARXNG_URL = process.env.SEARXNG_URL || 'https://search.zhiive.com';
const WEB_SEARCH_RATE_LIMIT = new Map<string, { count: number; resetAt: number }>();
const MAX_WEB_SEARCHES_PER_MINUTE = 10;

router.get('/web', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  const q = (req.query.q as string || '').trim();
  if (q.length < 2) { res.json({ results: [], query: q }); return; }

  // Rate limiting per user
  const now = Date.now();
  const userLimit = WEB_SEARCH_RATE_LIMIT.get(user.id);
  if (userLimit && userLimit.resetAt > now) {
    if (userLimit.count >= MAX_WEB_SEARCHES_PER_MINUTE) {
      res.status(429).json({ error: 'Trop de recherches web. Réessayez dans un instant.' });
      return;
    }
    userLimit.count++;
  } else {
    WEB_SEARCH_RATE_LIMIT.set(user.id, { count: 1, resetAt: now + 60000 });
  }

  const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);

  try {
    const searchUrl = `${SEARXNG_URL}/search?q=${encodeURIComponent(q)}&format=json&categories=general&language=fr&pageno=1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(searchUrl, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`SearXNG returned ${response.status}`);
    }

    const data = await response.json() as { results?: Array<{ title?: string; content?: string; url?: string; img_src?: string; thumbnail?: string }> };
    const results = (data.results || []).slice(0, limit).map((r) => ({
      title: r.title || '',
      content: r.content || '',
      url: r.url || '',
      img_src: r.img_src || r.thumbnail || '',
    }));

    res.json({ results, query: q });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.warn('[WEB SEARCH] SearXNG timeout');
      res.status(504).json({ error: 'Recherche web expirée' });
    } else {
      console.warn('[WEB SEARCH] SearXNG unavailable:', err.message);
      res.status(503).json({ error: 'Recherche web indisponible' });
    }
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/search/browse-proxy?url=<encoded_url>
// Proxy pour afficher des pages web dans un iframe in-app
// Contourne X-Frame-Options / CSP en servant le HTML via notre domaine
// ═══════════════════════════════════════════════════════════════
const BROWSE_RATE_LIMIT = new Map<string, { count: number; resetAt: number }>();
const MAX_BROWSE_PER_MINUTE = 30;

// Security: block internal/private IPs
function isUrlAllowed(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    // Block private ranges
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') return false;
    if (host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('172.')) return false;
    if (host.endsWith('.local') || host.endsWith('.internal')) return false;
    // Block cloud metadata endpoints
    if (host === '169.254.169.254' || host === 'metadata.google.internal') return false;
    return true;
  } catch {
    return false;
  }
}

router.get('/browse-proxy', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  const targetUrl = (req.query.url as string || '').trim();
  if (!targetUrl) { res.status(400).json({ error: 'URL manquante' }); return; }

  // Validate URL
  if (!isUrlAllowed(targetUrl)) {
    res.status(403).json({ error: 'URL non autorisée' });
    return;
  }

  // Rate limiting per user
  const now = Date.now();
  const userLimit = BROWSE_RATE_LIMIT.get(user.id);
  if (userLimit && userLimit.resetAt > now) {
    if (userLimit.count >= MAX_BROWSE_PER_MINUTE) {
      res.status(429).json({ error: 'Trop de requêtes. Réessayez dans un instant.' });
      return;
    }
    userLimit.count++;
  } else {
    BROWSE_RATE_LIMIT.set(user.id, { count: 1, resetAt: now + 60000 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ZhiiveBrowser/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr,en;q=0.5',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    const contentType = response.headers.get('content-type') || '';

    // For HTML content: inject <base> tag and serve without restrictive headers
    if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
      let html = await response.text();

      // Inject <base> tag so relative resources (CSS, JS, images) resolve correctly
      const baseTag = `<base href="${targetUrl}">`;
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${baseTag}`);
      } else if (html.includes('<HEAD>')) {
        html = html.replace('<HEAD>', `<HEAD>${baseTag}`);
      } else {
        html = baseTag + html;
      }

      // Serve with permissive headers — no X-Frame-Options, no restrictive CSP
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.removeHeader('X-Frame-Options');
      res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
      res.send(html);
    } else {
      // For non-HTML (images, PDFs, etc): pipe through
      res.setHeader('Content-Type', contentType);
      res.removeHeader('X-Frame-Options');
      const buffer = Buffer.from(await response.arrayBuffer());
      res.send(buffer);
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      res.status(504).json({ error: 'La page ne répond pas' });
    } else {
      console.warn('[BROWSE PROXY] Error:', err.message);
      res.status(502).json({ error: 'Impossible de charger cette page' });
    }
  }
});

export default router;
