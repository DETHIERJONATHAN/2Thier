import express from 'express';
import { authenticateToken } from '../middleware/auth';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Routeur exploration code pour coach IA (SuperAdmin seulement)
// Endpoints:
//  GET /api/ai/code/tree?path=src/pages&depth=2
//  GET /api/ai/code/file?path=src/routes/ai.ts&offset=0&limit=400
//  GET /api/ai/code/search?q=gmail&path=src&max=25
//  GET /api/ai/code/summary?path=src/routes/ai.ts
//  GET /api/ai/code/diff?old=src/routes/ai.ts&new=src/routes/index.ts
//  GET /api/ai/code/recent

const router = express.Router();
router.use(authenticateToken);

const ALLOWED_ROOTS = ['src', 'prisma'];
const REPO_ROOT = process.cwd().replace(/\\/g, '/');
const MAX_FILE_LINES_RETURN = 800;
const MAX_FILE_SIZE_BYTES = 400 * 1024; // 400KB

interface RecentEntry { path: string; at: number; lines?: number; hash?: string }
const RECENT_FILES: RecentEntry[] = [];
// Cache simple en mémoire des analyses (TTL 60s)
interface Cached<T> { ts: number; data: T }
interface AnalyzeSummary {
  path: string;
  lines: number;
  jsx?: boolean;
  exports?: { named: string[]; hasDefault: boolean };
  dependencies?: { external: string[]; internal: string[] };
  antdComponents?: string[];
  hooks?: { total: number; useEffect: number; custom: string[] };
  signals?: { complexity: string[]; missing: string[] };
  jsxStructure?: { maxDepth: number; tagCount: number; densityPer100Lines: number } | null;
  metrics?: { score: number; heuristic: string };
  risks?: { code: string; severity: 'low'|'medium'|'high'; detail: string }[];
  suggestions?: string[];
  notes?: string;
  i18n?: boolean;
}
const ANALYZE_CACHE: Record<string, Cached<AnalyzeSummary>> = {};
const ANALYZE_TTL_MS = 60_000;
function recordRecent(entry: RecentEntry) {
  const existing = RECENT_FILES.find(r => r.path === entry.path);
  if (existing) { existing.at = entry.at; existing.lines = entry.lines; existing.hash = entry.hash; }
  else {
    RECENT_FILES.push(entry);
    if (RECENT_FILES.length > 30) RECENT_FILES.sort((a,b)=>b.at-a.at).splice(30);
  }
}

interface SafeUser { isSuperAdmin?: boolean; roles?: string[] }

function isSuper(request: express.Request): boolean {
  const u = (request as unknown as { user?: SafeUser }).user;
  return !!(u?.isSuperAdmin || u?.roles?.includes?.('super_admin'));
}

function ensureSuper(req: express.Request, res: express.Response): boolean {
  if (!isSuper(req)) {
    res.status(403).json({ success: false, error: 'Accès restreint SuperAdmin' });
    return false;
  }
  return true;
}

function sanitizeRelative(p: string): string | null {
  if (!p) return null;
  const norm = path.posix.normalize(p.replace(/\\/g, '/')).replace(/^\/+/, '');
  const base = norm.split('/')[0];
  if (!ALLOWED_ROOTS.includes(base)) return null;
  return norm;
}

function abs(rel: string): string { return path.join(REPO_ROOT, rel); }

// GET /api/ai/code/tree
router.get('/code/tree', (req, res) => {
  if (!ensureSuper(req, res)) return;
  const rel = sanitizeRelative(String(req.query.path || 'src'));
  if (!rel) return res.status(400).json({ success: false, error: 'Chemin non autorisé' });
  const depth = Math.min(4, Math.max(0, parseInt(String(req.query.depth || '2'), 10) || 0));
  const target = abs(rel);
  if (!fs.existsSync(target)) return res.status(404).json({ success: false, error: 'Chemin introuvable' });
  function build(p: string, d: number) {
    const stat = fs.statSync(p);
    const name = path.basename(p);
    const relPath = p.substring(REPO_ROOT.length + 1).replace(/\\/g, '/');
    if (stat.isDirectory()) {
      if (d >= depth) return { type: 'dir', name, path: relPath };
  let children: ReturnType<typeof build>[] = [];
  try { children = fs.readdirSync(p).slice(0, 200).map(f => build(path.join(p, f), d + 1)); } catch { children = []; }
      return { type: 'dir', name, path: relPath, children };
    }
    return { type: 'file', name, path: relPath, size: stat.size };
  }
  try {
    const tree = build(target, 0);
    res.json({ success: true, data: tree, meta: { root: rel, depth } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Erreur lecture', details: (e as Error).message });
  }
});

// GET /api/ai/code/file
router.get('/code/file', (req, res) => {
  if (!ensureSuper(req, res)) return;
  const rel = sanitizeRelative(String(req.query.path || ''));
  if (!rel) return res.status(400).json({ success: false, error: 'Chemin non autorisé' });
  const target = abs(rel);
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return res.status(404).json({ success: false, error: 'Fichier introuvable' });
  const offset = Math.max(0, parseInt(String(req.query.offset || '0'), 10) || 0);
  const limit = Math.min(800, Math.max(50, parseInt(String(req.query.limit || '400'), 10) || 400));
  try {
  const content = fs.readFileSync(target, 'utf8');
  const totalBytes = Buffer.byteLength(content, 'utf8');
  const lines = content.split(/\r?\n/);
  const etag = 'W/"' + crypto.createHash('sha256').update(content).digest('hex').slice(0,16) + '"';
  const ifNoneMatch = req.headers['if-none-match'];
  if (ifNoneMatch && ifNoneMatch === etag) { res.status(304).end(); return; }
  const truncated = totalBytes > MAX_FILE_SIZE_BYTES || lines.length > MAX_FILE_LINES_RETURN;
  const slice = lines.slice(offset, Math.min(offset + limit, truncated ? MAX_FILE_LINES_RETURN : lines.length));
  recordRecent({ path: rel, at: Date.now(), lines: lines.length, hash: etag });
  res.setHeader('ETag', etag);
  res.json({ success: true, data: { path: rel, offset, limit: slice.length, totalLines: lines.length, totalBytes, truncated, lines: slice } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Erreur lecture fichier', details: (e as Error).message });
  }
});

let FILE_INDEX: string[] | null = null;
function buildFileIndex() {
  if (FILE_INDEX) return FILE_INDEX;
  const acc: string[] = [];
  function walk(rel: string) {
    const full = abs(rel);
    if (!fs.existsSync(full)) return;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(full).slice(0, 500);
      for (const e of entries) {
        const childRel = rel + '/' + e;
        if (/node_modules|\.git|dist|build/.test(childRel)) continue;
        walk(childRel);
      }
    } else if (/\.(ts|tsx|js|cjs|mjs)$/.test(rel)) { acc.push(rel); }
  }
  for (const root of ALLOWED_ROOTS) walk(root);
  FILE_INDEX = acc; return FILE_INDEX;
}

// GET /api/ai/code/search
router.get('/code/search', (req, res) => {
  if (!ensureSuper(req, res)) return;
  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({ success: false, error: 'Paramètre q requis' });
  const scope = sanitizeRelative(String(req.query.path || 'src')) || 'src';
  const max = Math.min(50, Math.max(1, parseInt(String(req.query.max || '25'), 10) || 25));
  const files = buildFileIndex().filter(f => f.startsWith(scope));
  const results: { path: string; line: number; snippet: string }[] = [];
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  for (const f of files) {
    if (results.length >= max) break;
    try {
      const content = fs.readFileSync(abs(f), 'utf8');
      const lines = content.split(/\r?\n/);
      for (let idx = 0; idx < lines.length && results.length < max; idx++) {
        const line = lines[idx];
        if (regex.test(line)) results.push({ path: f, line: idx + 1, snippet: line.trim().slice(0, 240) });
      }
  } catch {
      // ignorer erreurs de lecture individuelles
    }
  }
  res.json({ success: true, data: { query: q, matches: results, scope, max } });
});

// GET /api/ai/code/summary
router.get('/code/summary', (req, res) => {
  if (!ensureSuper(req, res)) return;
  const rel = sanitizeRelative(String(req.query.path || ''));
  if (!rel) return res.status(400).json({ success: false, error: 'Chemin non autorisé' });
  const target = abs(rel);
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return res.status(404).json({ success: false, error: 'Fichier introuvable' });
  try {
    const content = fs.readFileSync(target, 'utf8');
    const lines = content.split(/\r?\n/);
    const totalBytes = Buffer.byteLength(content, 'utf8');
    const importRegex = /import\s+[^;]*?from\s+['"]([^'";]+)['"]/g;
    const requiresRegex = /require\(\s*['"]([^'";]+)['"]\s*\)/g;
    const depsSet = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = importRegex.exec(content))) depsSet.add(m[1]);
    while ((m = requiresRegex.exec(content))) depsSet.add(m[1]);
    const deps = Array.from(depsSet).sort();
    const exportRegex = /export\s+(?:default\s+)?(class|function|const|let|var|interface|type|enum)?\s*([A-Za-z0-9_]+)/g;
    const named: string[] = [];
    while ((m = exportRegex.exec(content))) {
      const kind = m[1] || 'symbol';
      const name = m[2];
      if (!named.includes(name)) named.push(name + ':' + kind);
    }
    const braceExport = /export\s+{([^}]+)}/g;
    while ((m = braceExport.exec(content))) {
      const inside = m[1].split(',').map(s => s.trim().split(/\s+as\s+/i)[0]).filter(Boolean);
      inside.forEach(sym => { if (!named.some(n => n.startsWith(sym+':'))) named.push(sym + ':ref'); });
    }
    const defaultExport = /export\s+default\s+/.test(content);
    const summary = {
      path: rel,
      lines: lines.length,
      bytes: totalBytes,
      hasDefaultExport: defaultExport,
      exports: named.slice(0,50),
      dependencies: deps.slice(0,100),
      sizeCategory: totalBytes > MAX_FILE_SIZE_BYTES ? 'large' : 'normal',
      lastModified: fs.statSync(target).mtime,
    };
    recordRecent({ path: rel, at: Date.now(), lines: lines.length });
    res.json({ success: true, data: summary });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Erreur résumé fichier', details: (e as Error).message });
  }
});

// GET /api/ai/code/diff
router.get('/code/diff', (req, res) => {
  if (!ensureSuper(req, res)) return;
  const oldRel = sanitizeRelative(String(req.query.old || ''));
  const newRel = sanitizeRelative(String(req.query.new || ''));
  if (!oldRel || !newRel) return res.status(400).json({ success: false, error: 'Paramètres old et new requis' });
  const oldPath = abs(oldRel); const newPath = abs(newRel);
  if (!fs.existsSync(oldPath) || !fs.statSync(oldPath).isFile()) return res.status(404).json({ success: false, error: 'Ancien fichier introuvable' });
  if (!fs.existsSync(newPath) || !fs.statSync(newPath).isFile()) return res.status(404).json({ success: false, error: 'Nouveau fichier introuvable' });
  try {
    const oldLines = fs.readFileSync(oldPath,'utf8').split(/\r?\n/);
    const newLines = fs.readFileSync(newPath,'utf8').split(/\r?\n/);
    const diffs: { type: 'ctx'|'add'|'del'; oldLine?: number; newLine?: number; text: string }[] = [];
    const max = Math.max(oldLines.length, newLines.length);
    const maxOutput = 800;
    for (let i=0; i<max && diffs.length < maxOutput; i++) {
      const a = oldLines[i]; const b = newLines[i];
      if (a === b) {
        if (diffs.length && diffs[diffs.length-1].type === 'ctx') continue;
        diffs.push({ type: 'ctx', oldLine: i+1, newLine: i+1, text: a ?? '' });
      } else {
        if (a !== undefined) diffs.push({ type: 'del', oldLine: i+1, text: a });
        if (b !== undefined) diffs.push({ type: 'add', newLine: i+1, text: b });
      }
    }
    recordRecent({ path: oldRel, at: Date.now(), lines: oldLines.length });
    recordRecent({ path: newRel, at: Date.now(), lines: newLines.length });
    res.json({ success: true, data: { old: oldRel, new: newRel, oldLines: oldLines.length, newLines: newLines.length, diffs } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Erreur diff', details: (e as Error).message });
  }
});

// GET /api/ai/code/recent
router.get('/code/recent', (req, res) => {
  if (!ensureSuper(req, res)) return;
  const list = RECENT_FILES.sort((a,b)=>b.at-a.at).slice(0,20);
  res.json({ success: true, data: list });
});

// GET /api/ai/code/analyze?path=src/pages/SomePage.tsx
// Analyse qualitative (aucune génération de code) : métriques, heuristiques UI/UX, idées d'amélioration.
router.get('/code/analyze', (req, res) => {
  if (!ensureSuper(req, res)) return;
  const rel = sanitizeRelative(String(req.query.path || ''));
  if (!rel) return res.status(400).json({ success: false, error: 'Chemin non autorisé' });
  const target = abs(rel);
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return res.status(404).json({ success: false, error: 'Fichier introuvable' });
  try {
    const cached = ANALYZE_CACHE[rel];
    const now = Date.now();
    if (cached && now - cached.ts < ANALYZE_TTL_MS) {
      return res.json({ success: true, data: cached.data, meta: { cached: true, ageMs: now - cached.ts } });
    }
    const content = fs.readFileSync(target, 'utf8');
    const lines = content.split(/\r?\n/);
    const size = lines.length;
    const jsx = /<[^>]+>/g.test(content) || rel.endsWith('.tsx');
    const hooksCount = (content.match(/\buse(State|Effect|Memo|Callback|Ref|Context|Reducer)\b/g) || []).length;
    const useEffectCount = (content.match(/\buseEffect\b/g) || []).length;
    const customHooks = (content.match(/\buse[A-Z][A-Za-z0-9_]*/g) || []).filter(h => !/use(State|Effect|Memo|Callback|Ref|Context|Reducer)/.test(h));
    const importAntd = (content.match(/from ['"]antd['"]/g) || []).length > 0;
    const antdComponents = Array.from(new Set(((content.match(/<([A-Z][A-Za-z0-9]+)\b/g) || []).map(m => m.slice(1))).filter(n => /^(Button|Table|Form|Modal|Input|Select|DatePicker|Tabs|Tag|Tooltip|Dropdown|Menu|Layout|Card|Space|Flex|Grid|Alert|Avatar|Badge)$/.test(n)))).sort();
    const hasI18n = /\bi18n\b|\bt\(['"]/.test(content);
  const usesTailwind = /className="[^"]*(flex|grid|px-|py-|text-|bg-|rounded|shadow)/.test(content);
    const largeFile = size > 400;
    const veryLargeFile = size > 800;
    const manyHooks = hooksCount > 15 || useEffectCount > 6;
    // Calcul profondeur JSX & densité
    let depth = 0, maxDepth = 0, tagCount = 0;
    if (jsx) {
      for (const line of lines) {
        const trimmed = line.trim();
        const openTags = trimmed.match(/<([A-Za-z][A-Za-z0-9-]*)([^>/]*?)>/g) || [];
  // selfClosing non utilisé dans l'heuristique; ignoré
        const closeTags = trimmed.match(/<\/(?:[A-Za-z][A-Za-z0-9-]*)>/g) || [];
        tagCount += openTags.length;
        // assume each non-selfclosing open increases depth until a corresponding close
        const openNonSelf = openTags.filter(t => !/\/>$/.test(t));
  for (let i=0;i<openNonSelf.length;i++) { depth++; if (depth > maxDepth) maxDepth = depth; }
  for (let i=0;i<closeTags.length;i++) { depth = Math.max(0, depth - 1); }
        // adjust for self-closing already counted above but not depth affecting beyond immediate
      }
    }
    const jsxDensity = jsx ? (tagCount / Math.max(1, size/100)) : 0; // tags par 100 lignes
    const complexitySignals: string[] = [];
    if (largeFile) complexitySignals.push('taille>400 lignes');
    if (veryLargeFile) complexitySignals.push('taille>800 lignes (risque lisibilité)');
    if (manyHooks) complexitySignals.push('beaucoup de hooks (fragmentation probable)');
    if (customHooks.length > 8) complexitySignals.push('grand nombre de hooks personnalisés');
    if (maxDepth > 12) complexitySignals.push('profondeur jsx>12 (hiérarchie très profonde)');
    if (jsxDensity > 160) complexitySignals.push('densité jsx élevée (>160 tags/100 lignes)');
    const missingSignals: string[] = [];
    if (!hasI18n && jsx) missingSignals.push('i18n manquant (t("..."))');
    if (!importAntd && jsx) missingSignals.push('Pas de composant Ant Design détecté (peut-être custom UI)');
    // Heuristique accessibilité basique
    const hasAlt = /<img[^>]+alt=/.test(content);
    const hasAria = /aria-\w+=/.test(content);
    if (/<img[^>]+>/.test(content) && !hasAlt) missingSignals.push('Images sans attribut alt');
    if (jsx && !hasAria) missingSignals.push('Peu/pas d’attributs ARIA');
    // Idées d'amélioration heuristiques
    const ideas: string[] = [];
    if (largeFile) ideas.push('Scinder le composant en sous-composants (réduction taille & lisibilité)');
    if (manyHooks) ideas.push('Extraire logique business dans des hooks personnalisés nommés / services');
    if (!hasI18n) ideas.push('Internationaliser le texte statique');
    if (antdComponents.includes('Table') && !/pagination/i.test(content)) ideas.push('Ajouter pagination / tri / filtrage sur Table');
    if (antdComponents.includes('Form') && !/Form\.Item\s+name=/.test(content)) ideas.push('Vérifier binding structuré des champs Form.Item');
    if (!usesTailwind && importAntd) ideas.push('Uniformiser spacing avec Tailwind pour cohérence visuelle');
    if (missingSignals.includes('Images sans attribut alt')) ideas.push('Ajouter attribut alt sur toutes les images (accessibilité)');
    if (!/ErrorBoundary|ErrorFallback/.test(content) && useEffectCount > 0) ideas.push('Envelopper la page dans un ErrorBoundary réutilisable');
    if (!/Skeleton|Spin|Loading|isLoading/.test(content) && /fetch|api\.(get|post|put|delete)/.test(content)) ideas.push('Afficher état de chargement (Skeleton / Spin) pendant les requêtes');
    if (!/analytics|track(Event)?/i.test(content)) ideas.push('Instrumenter événements clefs (tracking analytics)');
    const dependencyKinds = {
      external: Array.from(new Set(Array.from(content.matchAll(/import\s+[^;]+from\s+['"]([^'".][^'"/]*)['"]/g)).map(m => m[1]))).sort(),
      internal: Array.from(new Set(Array.from(content.matchAll(/import\s+[^;]+from\s+['"](\.{1,2}\/[^"]+)['"]/g)).map(m => m[1]))).sort()
    };
    const exportMatches = Array.from(content.matchAll(/export\s+(?:default\s+)?(function|const|class)\s+([A-Za-z0-9_]+)/g)).map(m => m[2]);
    const defaultExport = /export\s+default\s+/.test(content);
    // Score très rudimentaire (0-100)
    let baseScore = 80;
    if (largeFile) baseScore -= 5;
    if (veryLargeFile) baseScore -= 10;
    if (manyHooks) baseScore -= 5;
    if (!hasI18n) baseScore -= 5;
    if (missingSignals.includes('Images sans attribut alt')) baseScore -= 5;
    if (maxDepth > 12) baseScore -= 5;
    const score = Math.max(30, Math.min(95, baseScore));
    // Risques structurés
    const risks: { code: string; severity: 'low'|'medium'|'high'; detail: string }[] = [];
    if (veryLargeFile) risks.push({ code: 'component_too_large', severity: 'high', detail: 'Composant >800 lignes' });
    else if (largeFile) risks.push({ code: 'component_large', severity: 'medium', detail: 'Composant >400 lignes' });
    if (manyHooks) risks.push({ code: 'hooks_overuse', severity: 'medium', detail: 'Hooks nombreux (fragmenter logique)' });
    if (!hasI18n && jsx) risks.push({ code: 'missing_i18n', severity: 'medium', detail: 'Textes non internationalisés' });
    if (maxDepth > 12) risks.push({ code: 'deep_jsx_tree', severity: 'medium', detail: 'Hiérarchie JSX très profonde' });
    if (jsxDensity > 160) risks.push({ code: 'high_jsx_density', severity: 'low', detail: 'Beaucoup de balises par 100 lignes' });
    if (!/Skeleton|Spin|Loading|isLoading/.test(content) && /api\.(get|post|put|delete)/.test(content)) risks.push({ code: 'missing_loading_state', severity: 'medium', detail: 'Aucun état de chargement visible' });
    if (antdComponents.includes('Table') && !/pagination/i.test(content)) risks.push({ code: 'table_no_pagination', severity: 'low', detail: 'Table sans pagination explicite' });
    const summary = {
      path: rel,
      lines: size,
      jsx,
      exports: { named: exportMatches.slice(0,50), hasDefault: defaultExport },
      dependencies: dependencyKinds,
      antdComponents,
      hooks: { total: hooksCount, useEffect: useEffectCount, custom: Array.from(new Set(customHooks)).slice(0,30) },
      signals: { complexity: complexitySignals, missing: missingSignals },
      jsxStructure: jsx ? { maxDepth, tagCount, densityPer100Lines: Math.round(jsxDensity) } : null,
      metrics: { score, heuristic: 'Indicatif (non scientifique)' },
      risks,
      suggestions: ideas.slice(0, 25),
      notes: 'Analyse purement heuristique, ne génère PAS de code. Destinée à soutenir une conversation sur la qualité & améliorations possibles.'
    };
    recordRecent({ path: rel, at: Date.now(), lines: size });
    ANALYZE_CACHE[rel] = { ts: now, data: summary };
    res.json({ success: true, data: summary, meta: { cached: false } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Erreur analyse', details: (e as Error).message });
  }
});

// GET /api/ai/code/feature/analyze?feature=mail
router.get('/code/feature/analyze', (req, res) => {
  if (!ensureSuper(req, res)) return;
  const feature = String(req.query.feature || '').trim();
  if (!feature) return res.status(400).json({ success: false, error: 'Paramètre feature requis' });
  const fmapPath = abs('src/feature-map.json');
  if (!fs.existsSync(fmapPath)) return res.status(500).json({ success: false, error: 'feature-map.json manquant' });
  try {
    interface FeatureDef { label?: string; primaryPages?: string[]; relatedServices?: string[]; keywords?: string[] }
    const fmap = JSON.parse(fs.readFileSync(fmapPath, 'utf8')) as Record<string, FeatureDef>;
    const def = fmap[feature];
    if (!def) return res.status(404).json({ success: false, error: 'Feature inconnue' });
    const files: string[] = [...(def.primaryPages||[]), ...(def.relatedServices||[])].filter(Boolean);
  interface FileAnalysis { path: string; lines: number; jsx: boolean; hooks: { total: number; useEffect: number; custom: string[] }; antdComponents: string[]; hasI18n: boolean; usesTailwind: boolean; exports: { named: string[]; hasDefault: boolean }; importAntd: boolean }
  interface FileError { path: string; error: string }
  const analyses: FileAnalysis[] = [];
  const errors: FileError[] = [];
    // Réutilise l’heuristique d’analyse locale sans dupliquer tout le code (mini refactor interne)
    function analyzeFile(rel: string) {
      const target = abs(rel);
      if (!fs.existsSync(target) || !fs.statSync(target).isFile()) { errors.push({ path: rel, error: 'introuvable' }); return; }
      const content = fs.readFileSync(target, 'utf8');
      const lines = content.split(/\r?\n/);
      const jsx = /<[^>]+>/g.test(content) || rel.endsWith('.tsx');
      const hooksCount = (content.match(/\buse(State|Effect|Memo|Callback|Ref|Context|Reducer)\b/g) || []).length;
      const useEffectCount = (content.match(/\buseEffect\b/g) || []).length;
      const customHooks = (content.match(/\buse[A-Z][A-Za-z0-9_]*/g) || []).filter(h => !/use(State|Effect|Memo|Callback|Ref|Context|Reducer)/.test(h));
      const importAntd = (content.match(/from ['"]antd['"]/g) || []).length > 0;
      const antdComponents = Array.from(new Set(((content.match(/<([A-Z][A-Za-z0-9]+)\b/g) || []).map(m => m.slice(1))).filter(n => /^(Button|Table|Form|Modal|Input|Select|DatePicker|Tabs|Tag|Tooltip|Dropdown|Menu|Layout|Card|Space|Flex|Grid|Alert|Avatar|Badge)$/.test(n)))).sort();
      const hasI18n = /\bi18n\b|\bt\(['"]/.test(content);
      const usesTailwind = /className="[^"]*(flex|grid|px-|py-|text-|bg-|rounded|shadow)/.test(content);
      const exportMatches = Array.from(content.matchAll(/export\s+(?:default\s+)?(function|const|class)\s+([A-Za-z0-9_]+)/g)).map(m => m[2]);
      const defaultExport = /export\s+default\s+/.test(content);
      analyses.push({
        path: rel,
        lines: lines.length,
        jsx,
        hooks: { total: hooksCount, useEffect: useEffectCount, custom: Array.from(new Set(customHooks)).slice(0,30) },
        antdComponents,
        hasI18n,
        usesTailwind,
        exports: { named: exportMatches.slice(0,30), hasDefault: defaultExport },
        importAntd
      });
    }
    files.slice(0, 30).forEach(f => analyzeFile(f));
    // Agrégation simple
    const totalLines = analyses.reduce((s,a)=>s+a.lines,0);
    const totalHooks = analyses.reduce((s,a)=>s+a.hooks.total,0);
    const pages = analyses.filter(a => a.jsx);
    const avgLines = analyses.length ? Math.round(totalLines / analyses.length) : 0;
    const summary = {
      feature,
      label: def.label,
      fileCount: analyses.length,
      totalLines,
      avgLines,
      totalHooks,
      pages: pages.length,
      i18nCoverage: analyses.length ? (analyses.filter(a=>a.hasI18n).length / analyses.length) : 0,
      antdUsageRate: analyses.length ? (analyses.filter(a=>a.importAntd).length / analyses.length) : 0,
      tailwindUsageRate: analyses.length ? (analyses.filter(a=>a.usesTailwind).length / analyses.length) : 0
    };
    res.json({ success: true, data: { summary, analyses, errors } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Erreur analyse feature', details: (e as Error).message });
  }
});

// POST /api/ai/code/analyze/batch  body: { paths: string[] }
router.post('/code/analyze/batch', (req, res) => {
  if (!ensureSuper(req, res)) return;
  const body = req.body || {};
  const paths: unknown = body.paths;
  if (!Array.isArray(paths) || paths.length === 0) return res.status(400).json({ success: false, error: 'paths[] requis' });
  const unique = Array.from(new Set(paths.map(p => String(p)))).slice(0,40);
  const analyses: AnalyzeSummary[] = [];
  const errors: { path: string; error: string }[] = [];
  const now = Date.now();
  function analyzeOne(rel: string) {
    const safe = sanitizeRelative(rel);
    if (!safe) { errors.push({ path: rel, error: 'non autorisé' }); return; }
    const full = abs(safe);
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) { errors.push({ path: rel, error: 'introuvable' }); return; }
    // réutilise cache
    const cached = ANALYZE_CACHE[safe];
    if (cached && now - cached.ts < ANALYZE_TTL_MS) { analyses.push(cached.data); return; }
    // appel interne via logique de /code/analyze (duplicated minimal subset: lire puis insérer dans cache via fetch serait surcoût)
    try {
      const content = fs.readFileSync(full,'utf8');
      const lines = content.split(/\r?\n/);
      const hooksCount = (content.match(/\buse(State|Effect|Memo|Callback|Ref|Context|Reducer)\b/g) || []).length;
      const useEffectCount = (content.match(/\buseEffect\b/g) || []).length;
      const customHooks = (content.match(/\buse[A-Z][A-Za-z0-9_]*/g) || []).filter(h => !/use(State|Effect|Memo|Callback|Ref|Context|Reducer)/.test(h));
      const jsx = /<[^>]+>/g.test(content) || /\.tsx$/.test(safe);
      let depth = 0, maxDepth = 0, tagCount = 0;
      if (jsx) {
        for (const line of lines) {
          const trimmed = line.trim();
          const openTags = trimmed.match(/<([A-Za-z][A-Za-z0-9-]*)([^>/]*?)>/g) || [];
          const closeTags = trimmed.match(/<\/(?:[A-Za-z][A-Za-z0-9-]*)>/g) || [];
          tagCount += openTags.length;
          const openNonSelf = openTags.filter(t => !/\/>$/.test(t));
          for (let i=0;i<openNonSelf.length;i++) { depth++; if (depth>maxDepth) maxDepth = depth; }
          for (let i=0;i<closeTags.length;i++) { depth = Math.max(0, depth-1); }
        }
      }
      const jsxDensity = jsx ? (tagCount / Math.max(1, lines.length/100)) : 0;
      const hasI18n = /\bt\(['"][^)]*\)/.test(content) || /i18n/.test(content);
      const antdComponents = Array.from(new Set(((content.match(/<([A-Z][A-Za-z0-9]+)\b/g) || []).map(m=>m.slice(1))).filter(n=>/^(Button|Table|Form|Modal|Input|Select|DatePicker|Tabs|Tag|Tooltip|Dropdown|Menu|Layout|Card|Space|Flex|Grid|Alert|Avatar|Badge)$/.test(n)))).sort();
      const summary = {
        path: safe,
        lines: lines.length,
        hooks: { total: hooksCount, useEffect: useEffectCount, custom: Array.from(new Set(customHooks)).slice(0,20) },
        jsxStructure: jsx ? { maxDepth, tagCount, densityPer100Lines: Math.round(jsxDensity) } : null,
        i18n: hasI18n,
        antdComponents
      };
      ANALYZE_CACHE[safe] = { ts: now, data: summary };
      analyses.push(summary);
    } catch (e) { errors.push({ path: rel, error: (e as Error).message }); }
  }
  unique.forEach(analyzeOne);
  res.json({ success: true, data: { analyses, errors, count: analyses.length } });
});

export default router;
