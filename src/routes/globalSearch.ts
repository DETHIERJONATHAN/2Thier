import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { authenticateToken, fetchFullUser } from '../middleware/auth';
import { logger } from '../lib/logger';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticateToken as unknown);
router.use(fetchFullUser as unknown);

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

// SECURITY: ALLOWED_TABLES whitelist — only these tables can be searched
const ALLOWED_TABLES = new Set(Object.keys(TABLE_META));

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
  const user = req.user;
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
    // SECURITY: $queryRawUnsafe is safe here — table+column names come from ALLOWED_TABLES whitelist + SAFE_IDENTIFIER regex validation. User input is passed as $1 parameter.
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
    logger.error('[GLOBAL SEARCH] Error:', err);
    res.status(500).json({ error: 'Erreur lors de la recherche' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/search/web?q=query&limit=10
// Zhiive Search — recherche web via SearXNG auto-hébergé
// White-label : aucune mention du moteur sous-jacent n'est exposée
// ═══════════════════════════════════════════════════════════════
const SEARXNG_URL = process.env.SEARXNG_URL || 'http://46.225.180.8:8888';
const WEB_SEARCH_RATE_LIMIT = new Map<string, { count: number; resetAt: number }>();
const MAX_WEB_SEARCHES_PER_MINUTE = 20;

router.get('/web', async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  const q = (req.query.q as string || '').trim();
  if (q.length < 2) { res.json({ results: [], query: q }); return; }

  // Rate limiting per user
  const now = Date.now();
  const userLimit = WEB_SEARCH_RATE_LIMIT.get(user.id);
  if (userLimit && userLimit.resetAt > now) {
    if (userLimit.count >= MAX_WEB_SEARCHES_PER_MINUTE) {
      res.status(429).json({ error: 'Trop de recherches. Réessayez dans un instant.' });
      return;
    }
    userLimit.count++;
  } else {
    WEB_SEARCH_RATE_LIMIT.set(user.id, { count: 1, resetAt: now + 60000 });
  }

  const limit = Math.min(parseInt(req.query.limit as string) || 10, 30);
  const pageno = Math.max(1, Math.min(parseInt(req.query.pageno as string) || 1, 50));

  try {
    const searchUrl = `${SEARXNG_URL}/search?q=${encodeURIComponent(q)}&format=json&categories=general&language=fr&pageno=${pageno}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(searchUrl, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      logger.warn(`[ZHIIVE SEARCH] Status ${response.status}`);
      res.status(502).json({ error: 'Recherche temporairement indisponible' });
      return;
    }

    const data = await response.json() as { results?: Array<{ title?: string; content?: string; url?: string; img_src?: string; thumbnail?: string; engine?: string }> };
    // White-label: strip engine/source info, only expose what the user needs
    const results = (data.results || []).slice(0, limit).map((r) => {
      let favicon = '';
      try { const u = new URL(r.url || ''); favicon = `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`; } catch { /* ok */ }
      return {
        title: r.title || '',
        content: r.content || '',
        url: r.url || '',
        img_src: r.img_src || r.thumbnail || '',
        favicon,
      };
    });
    res.json({ results, query: q });
  } catch (err: unknown) {
    if (err.name === 'AbortError') {
      logger.warn('[ZHIIVE SEARCH] Timeout');
      res.status(504).json({ error: 'Recherche expirée, réessayez' });
    } else {
      logger.warn('[ZHIIVE SEARCH] Error:', err.message);
      res.status(503).json({ error: 'Recherche indisponible' });
    }
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/search/browse-proxy?url=<encoded_url>
// FULL transparent proxy — reroutes ALL sub-resources (JS, CSS, images,
// fetch, XHR) through the proxy so the site works 100% inside an iframe.
// ═══════════════════════════════════════════════════════════════
const BROWSE_RATE_LIMIT = new Map<string, { count: number; resetAt: number }>();
const MAX_BROWSE_PER_MINUTE = 600; // Amazon loads 50-100+ sub-resources per page

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const PROXY_PATH = '/api/search/browse-proxy';

// ── Server-side cookie jar: stores cookies per user per domain ──
// Without this, sites like Amazon break because they rely on session cookies
const COOKIE_JAR = new Map<string, Map<string, string[]>>(); // userId -> domain -> cookies[]
const COOKIE_JAR_TTL = 30 * 60 * 1000; // 30 min
const COOKIE_JAR_CLEANUP = new Map<string, number>(); // userId -> lastAccess

function getCookieDomain(url: string): string {
  try { return new URL(url).hostname; } catch { return ''; }
}

function getStoredCookies(userId: string, url: string): string {
  const domain = getCookieDomain(url);
  if (!domain) return '';
  const userJar = COOKIE_JAR.get(userId);
  if (!userJar) return '';
  // Collect cookies from domain and parent domains
  const cookies: string[] = [];
  const parts = domain.split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    const d = parts.slice(i).join('.');
    const c = userJar.get(d);
    if (c) cookies.push(...c);
  }
  return cookies.join('; ');
}

function storeCookies(userId: string, url: string, setCookieHeaders: string[]): void {
  if (!setCookieHeaders.length) return;
  const domain = getCookieDomain(url);
  if (!domain) return;
  if (!COOKIE_JAR.has(userId)) COOKIE_JAR.set(userId, new Map());
  const userJar = COOKIE_JAR.get(userId)!;
  // Parse each Set-Cookie for its domain or default to request domain
  for (const header of setCookieHeaders) {
    const cookieName = header.split('=')[0]?.trim();
    if (!cookieName) continue;
    // Extract domain from cookie if specified
    const domainMatch = header.match(/;\s*domain\s*=\s*\.?([^;]+)/i);
    const cookieDomain = domainMatch ? domainMatch[1].trim().toLowerCase() : domain;
    if (!userJar.has(cookieDomain)) userJar.set(cookieDomain, []);
    const existing = userJar.get(cookieDomain)!;
    // Replace existing cookie with same name
    const namePrefix = cookieName + '=';
    const idx = existing.findIndex(c => c.startsWith(namePrefix));
    const cookieValue = header.split(';')[0]; // name=value only
    if (idx >= 0) existing[idx] = cookieValue;
    else existing.push(cookieValue);
  }
  COOKIE_JAR_CLEANUP.set(userId, Date.now());
}

// Cleanup old cookie jars every 10 min
setInterval(() => {
  const now = Date.now();
  for (const [uid, lastAccess] of COOKIE_JAR_CLEANUP.entries()) {
    if (now - lastAccess > COOKIE_JAR_TTL) {
      COOKIE_JAR.delete(uid);
      COOKIE_JAR_CLEANUP.delete(uid);
    }
  }
}, 10 * 60 * 1000);

// ── In-memory resource cache (CSS/JS/images) ──
// Avoids re-fetching the same resource dozens of times
interface CacheEntry { data: Buffer | string; contentType: string; ts: number; }
const RESOURCE_CACHE = new Map<string, CacheEntry>();
const CACHE_MAX_SIZE = 200;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

function getCached(url: string): CacheEntry | null {
  const entry = RESOURCE_CACHE.get(url);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { RESOURCE_CACHE.delete(url); return null; }
  return entry;
}

function setCache(url: string, data: Buffer | string, contentType: string): void {
  // Evict oldest if full
  if (RESOURCE_CACHE.size >= CACHE_MAX_SIZE) {
    const oldest = RESOURCE_CACHE.keys().next().value;
    if (oldest) RESOURCE_CACHE.delete(oldest);
  }
  RESOURCE_CACHE.set(url, { data, contentType, ts: Date.now() });
}

function isUrlAllowed(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') return false;
    if (host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('172.')) return false;
    if (host.endsWith('.local') || host.endsWith('.internal')) return false;
    if (host === '169.254.169.254' || host === 'metadata.google.internal') return false;
    return true;
  } catch {
    return false;
  }
}

function makeProxyUrl(url: string): string {
  return `${PROXY_PATH}?url=${encodeURIComponent(url)}`;
}

// Rewrite ALL src/href/action/srcset attributes to go through the proxy
function rewriteAllUrls(html: string, baseUrl: string): string {
  // Rewrite src="..." (script, img, iframe, video, audio, source, embed)
  html = html.replace(
    /(\s(?:src|href|action|poster|data)\s*=\s*["'])([^"']*)(["'])/gi,
    (_match, prefix, url, suffix) => {
      if (!url || url.startsWith('data:') || url.startsWith('javascript:') || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) {
        return `${prefix}${url}${suffix}`;
      }
      // Skip if already proxied
      if (url.includes(PROXY_PATH)) return `${prefix}${url}${suffix}`;
      try {
        const resolved = new URL(url, baseUrl).href;
        if (resolved.startsWith('http')) {
          return `${prefix}${makeProxyUrl(resolved)}${suffix}`;
        }
      } catch { /* keep original */ }
      return `${prefix}${url}${suffix}`;
    }
  );

  // Rewrite srcset="url1 1x, url2 2x"
  html = html.replace(
    /(\ssrcset\s*=\s*["'])([^"']+)(["'])/gi,
    (_match, prefix, srcset, suffix) => {
      const parts = srcset.split(',').map((part: string) => {
        const [url, ...descriptors] = part.trim().split(/\s+/);
        if (!url || url.startsWith('data:') || url.includes(PROXY_PATH)) {
          return part;
        }
        try {
          const resolved = new URL(url, baseUrl).href;
          return `${makeProxyUrl(resolved)} ${descriptors.join(' ')}`;
        } catch {
          return part;
        }
      });
      return `${prefix}${parts.join(', ')}${suffix}`;
    }
  );

  // Rewrite url() in inline style attributes
  html = html.replace(
    /(style\s*=\s*["'][^"']*url\s*\(\s*['"]?)([^'")]+)(['"]?\s*\))/gi,
    (_match, prefix, url, suffix) => {
      if (url.startsWith('data:') || url.includes(PROXY_PATH)) return `${prefix}${url}${suffix}`;
      try {
        const resolved = new URL(url, baseUrl).href;
        return `${prefix}${makeProxyUrl(resolved)}${suffix}`;
      } catch {
        return `${prefix}${url}${suffix}`;
      }
    }
  );

  return html;
}

// Rewrite url() refs inside CSS text
function rewriteCssUrls(css: string, baseUrl: string): string {
  return css.replace(
    /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi,
    (_match, quote, url) => {
      if (url.startsWith('data:') || url.includes(PROXY_PATH)) return _match;
      try {
        const resolved = new URL(url, baseUrl).href;
        return `url(${quote}${makeProxyUrl(resolved)}${quote})`;
      } catch {
        return _match;
      }
    }
  );
}

// The CRITICAL script: intercepts ALL network requests (fetch, XHR, dynamic imports)
// and routes them through our proxy. Also neutralizes frame-busting.
// OPTIMIZED: URL cache, selective setAttribute, error suppression, SW blocking.
function buildInterceptorScript(pageUrl: string): string {
  return `<script data-zhiive-proxy="1">
(function(){
  var P = '${PROXY_PATH}';
  var B = ${JSON.stringify(pageUrl)};
  var _c = {}; // URL cache for performance
  function px(u){
    if(!u||typeof u!=='string') return u;
    var cached = _c[u];
    if(cached !== undefined) return cached;
    if(u.indexOf(P)!==-1){ _c[u]=u; return u; }
    if(u.startsWith('data:')||u.startsWith('blob:')||u.startsWith('javascript:')||u.startsWith('#')){ return u; }
    try{
      var abs = new URL(u, B).href;
      if(abs.startsWith('http')){ var r=P+'?url='+encodeURIComponent(abs); _c[u]=r; return r; }
    }catch(e){}
    _c[u]=u;
    return u;
  }

  // Suppress uncaught errors from proxied content to prevent cascade failures
  window.onerror = function(){ return true; };
  try{ window.onunhandledrejection = function(e){ if(e&&e.preventDefault) e.preventDefault(); }; }catch(e){}

  // Block Service Worker registration (could hijack proxy requests)
  try{ if(navigator.serviceWorker){ navigator.serviceWorker.register = function(){ return Promise.reject(new Error('blocked by proxy')); }; } }catch(e){}

  // 1. Override fetch()
  var origFetch = window.fetch;
  window.fetch = function(input, init){
    try{
      if(typeof input === 'string') input = px(input);
      else if(input instanceof Request) input = new Request(px(input.url), input);
    }catch(e){}
    return origFetch.call(this, input, init);
  };

  // 2. Override XMLHttpRequest.open()
  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url){
    try{ arguments[1] = px(url); }catch(e){}
    return origOpen.apply(this, arguments);
  };

  // 3. Override Image src
  var imgDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  if(imgDesc && imgDesc.set){
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      set: function(v){ try{ v=px(v); }catch(e){} imgDesc.set.call(this, v); },
      get: imgDesc.get
    });
  }

  // 4. Override setAttribute — SELECTIVE: only for script/link/iframe/source/embed
  // (images handled by Image.src override, links by click interceptor)
  var origSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value){
    if((name==='src'||name==='href')&&typeof value==='string'&&value.indexOf('http')===0){
      var t = this.tagName;
      if(t==='SCRIPT'||t==='LINK'||t==='IFRAME'||t==='SOURCE'||t==='EMBED'||t==='OBJECT'){
        try{ value = px(value); }catch(e){}
      }
    }
    return origSetAttribute.call(this, name, value);
  };

  // 5. Intercept link clicks
  document.addEventListener('click', function(e){
    var a = e.target;
    while(a && a.tagName !== 'A') a = a.parentElement;
    if(!a || !a.href) return;
    var h = a.href;
    if(h.indexOf(P)!==-1||h.startsWith('javascript:')||h.startsWith('mailto:')||h.startsWith('tel:')||h.startsWith('#')) return;
    if(h.startsWith('http')){
      e.preventDefault();
      e.stopPropagation();
      window.location.href = px(h);
    }
  }, true);

  // 6. Neutralize frame-busting
  try{ Object.defineProperty(window,'top',{get:function(){return window.self;}}); }catch(e){}
  try{ Object.defineProperty(window,'frameElement',{get:function(){return null;}}); }catch(e){}
  try{ Object.defineProperty(window,'parent',{get:function(){return window.self;}}); }catch(e){}
})();
</script>`;
}

router.get('/browse-proxy', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  const targetUrl = (req.query.url as string || '').trim();
  if (!targetUrl) { res.status(400).json({ error: 'URL manquante' }); return; }

  if (!isUrlAllowed(targetUrl)) {
    res.status(403).json({ error: 'URL non autorisée' });
    return;
  }

  // Rate limiting per user
  const now = Date.now();
  const userLimit = BROWSE_RATE_LIMIT.get(user.id);
  if (userLimit && userLimit.resetAt > now) {
    if (userLimit.count >= MAX_BROWSE_PER_MINUTE) {
      res.status(429).json({ error: 'Trop de requêtes' });
      return;
    }
    userLimit.count++;
  } else {
    BROWSE_RATE_LIMIT.set(user.id, { count: 1, resetAt: now + 60000 });
  }

  const shortUrl = targetUrl.length > 80 ? targetUrl.slice(0, 80) + '...' : targetUrl;

  // Check in-memory cache for non-HTML resources
  const cached = getCached(targetUrl);
  if (cached) {
    res.setHeader('Content-Type', cached.contentType);
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('X-Proxy-Cache', 'HIT');
    res.send(cached.data);
    return;
  }

  try {
    const fetchStart = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    // Build headers — include stored cookies for this domain
    const storedCookies = getStoredCookies(user.id, targetUrl);
    const targetOrigin = new URL(targetUrl).origin;

    if (storedCookies) {
      // Cookie injection placeholder — currently unused by the fetch pipeline
    }

    const fetchHeaders: Record<string, string> = {
      'User-Agent': BROWSER_UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'identity',
      'Cache-Control': 'no-cache',
      'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Referer': targetOrigin + '/',
    };
    if (storedCookies) {
      fetchHeaders['Cookie'] = storedCookies;
    }

    const response = await fetch(targetUrl, {
      headers: fetchHeaders,
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    const fetchDuration = Date.now() - fetchStart;

    // Store any cookies the server sends back
    const setCookieHeaders = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
    if (setCookieHeaders.length) {
      storeCookies(user.id, targetUrl, setCookieHeaders);
    }

    const finalUrl = response.url || targetUrl;
    const contentType = response.headers.get('content-type') || '';
    const contentLength = response.headers.get('content-length') || '?';
    const xfo = response.headers.get('x-frame-options') || 'none';
    const csp = response.headers.get('content-security-policy') || '';
    const cspFrameAncestors = csp.includes('frame-ancestors') ? csp.match(/frame-ancestors[^;]*/)?.[0] : 'none';
    const redirected = finalUrl !== targetUrl;

    if (redirected) logger.info(`[PROXY]   ↪ Redirected to: ${finalUrl.length > 80 ? finalUrl.slice(0, 80) + '...' : finalUrl}`);
    if (xfo !== 'none') logger.info(`[PROXY]   🚫 X-Frame-Options: ${xfo}`);
    if (cspFrameAncestors && cspFrameAncestors !== 'none') logger.info(`[PROXY]   🚫 CSP: ${cspFrameAncestors}`);
    if (setCookieHeaders.length) logger.info(`[PROXY]   🍪 Received ${setCookieHeaders.length} Set-Cookie headers`);

    // Common response headers
    const setProxyHeaders = () => {
      res.removeHeader('X-Frame-Options');
      res.removeHeader('Content-Security-Policy');
      res.removeHeader('X-XSS-Protection');
      res.setHeader('Access-Control-Allow-Origin', '*');
    };

    // ═══ HTML pages: full rewrite ═══
    if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
      let html = await response.text();
      const originalSize = html.length;

      // Check for CAPTCHA or block pages
      const isCaptcha = /captcha|robot|automated|bot.*detect|verify.*human/i.test(html.slice(0, 5000));
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const pageTitle = titleMatch ? titleMatch[1].trim() : '(no title)';
      if (isCaptcha) logger.info(`[PROXY]   ⚠️ CAPTCHA/BOT DETECTION detected in HTML!`);

      // Log first 200 chars of <body> to see what's there
      const bodyMatch = html.match(/<body[^>]*>([\s\S]{0,300})/i);
      if (bodyMatch) {
        const bodyPreview = bodyMatch[1].replace(/\s+/g, ' ').trim().slice(0, 150);
      }

      // Strip anti-iframe meta tags
      html = html.replace(/<meta[^>]*http-equiv\s*=\s*["']?(?:X-Frame-Options|Content-Security-Policy)["']?[^>]*>/gi, '');

      // Strip frame-busting JS patterns
      html = html.replace(/(?:window\.)?top\.location\s*(?:\.href\s*)?=\s*[^;\n]+/gi, '/*z*/');
      html = html.replace(/(?:window\.)?parent\.location\s*(?:\.href\s*)?=\s*[^;\n]+/gi, '/*z*/');
      html = html.replace(/if\s*\(\s*(?:window\.)?(?:top|self|parent)\s*!==?\s*(?:window\.)?(?:top|self)\s*\)[^}]*\{[^}]*\}/gi, '/*z*/');

      // Count how many frame-busting patterns we stripped
      const stripped = (originalSize - html.length);
      if (stripped > 0) logger.info(`[PROXY]   🧹 Stripped ${stripped} chars of frame-busting code`);

      // Inject interceptor FIRST (before any other script runs)
      const interceptor = buildInterceptorScript(finalUrl);
      if (/<head[\s>]/i.test(html)) {
        html = html.replace(/<head([\s>])/i, `<head$1${interceptor}`);
      } else if (/<html[\s>]/i.test(html)) {
        html = html.replace(/<html([\s>])/i, `<html$1<head>${interceptor}</head>`);
      } else {
        html = interceptor + html;
      }

      // Rewrite ALL resource URLs (src, href, action, srcset, style url())
      html = rewriteAllUrls(html, finalUrl);

      // Strip known heavy external tracking/analytics scripts entirely
      // (these cause extra requests + tracking issues, never useful in proxy mode)
      html = html.replace(/<script\s[^>]*\bsrc\s*=\s*["'][^"']*(?:google-analytics\.com|googletagmanager\.com|connect\.facebook\.net|doubleclick\.net|amazon-adsystem\.com|fls-eu\.amazon\.|fls-na\.amazon\.)[^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '');

      const finalSize = html.length;

      // Count proxied URLs
      const proxyUrlCount = (html.match(/\/api\/search\/browse-proxy\?url=/g) || []).length;

      // Serve
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      setProxyHeaders();
      res.send(html);
    }
    // ═══ CSS: rewrite url() references ═══
    else if (contentType.includes('text/css')) {
      let css = await response.text();
      css = rewriteCssUrls(css, finalUrl);
      setCache(targetUrl, css, contentType);
      res.setHeader('Content-Type', contentType);
      setProxyHeaders();
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(css);
    }
    // ═══ JavaScript: serve as-is with CORS ═══
    else if (contentType.includes('javascript') || contentType.includes('ecmascript')) {
      const js = await response.text();
      setCache(targetUrl, js, contentType);
      res.setHeader('Content-Type', contentType);
      setProxyHeaders();
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(js);
    }
    // ═══ Everything else (images, fonts, PDFs, etc): pipe through ═══
    else {
      const buffer = Buffer.from(await response.arrayBuffer());
      setCache(targetUrl, buffer, contentType);
      res.setHeader('Content-Type', contentType);
      if (response.headers.get('content-length')) {
        res.setHeader('Content-Length', response.headers.get('content-length')!);
      }
      setProxyHeaders();
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(buffer);
    }
  } catch (err: unknown) {
    if (err.name === 'AbortError') {
      logger.error(`[PROXY] ⏱️ TIMEOUT (20s) | ${shortUrl}`);
      res.status(504).json({ error: 'La page ne répond pas' });
    } else {
      logger.error(`[PROXY] ❌ ERROR | ${shortUrl} | ${err.message}`);
      res.status(502).json({ error: 'Impossible de charger cette page' });
    }
  }
}));



export default router;
