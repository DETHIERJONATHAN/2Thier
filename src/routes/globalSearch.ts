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
  Organization:      { category: 'orgs',       label: 'Organisation',    icon: 'appstore',  routeFn: id => `/organizations/${id}`,    labelCols: ['name'], descCols: ['domain', 'email'] },
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
    res.json({ results: grouped, query: q, total });

  } catch (err) {
    console.error('[GLOBAL SEARCH] Error:', err);
    res.status(500).json({ error: 'Erreur lors de la recherche' });
  }
});

export default router;
