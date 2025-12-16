"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var auth_1 = require("../middleware/auth");
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var crypto_1 = __importDefault(require("crypto"));
// Routeur exploration code pour coach IA (SuperAdmin seulement)
// Endpoints:
//  GET /api/ai/code/tree?path=src/pages&depth=2
//  GET /api/ai/code/file?path=src/routes/ai.ts&offset=0&limit=400
//  GET /api/ai/code/search?q=gmail&path=src&max=25
//  GET /api/ai/code/summary?path=src/routes/ai.ts
//  GET /api/ai/code/diff?old=src/routes/ai.ts&new=src/routes/index.ts
//  GET /api/ai/code/recent
var router = express_1.default.Router();
router.use(auth_1.authenticateToken);
var ALLOWED_ROOTS = ['src', 'prisma'];
var REPO_ROOT = process.cwd().replace(/\\/g, '/');
var MAX_FILE_LINES_RETURN = 800;
var MAX_FILE_SIZE_BYTES = 400 * 1024; // 400KB
var RECENT_FILES = [];
var ANALYZE_CACHE = {};
var ANALYZE_TTL_MS = 60000;
function recordRecent(entry) {
    var existing = RECENT_FILES.find(function (r) { return r.path === entry.path; });
    if (existing) {
        existing.at = entry.at;
        existing.lines = entry.lines;
        existing.hash = entry.hash;
    }
    else {
        RECENT_FILES.push(entry);
        if (RECENT_FILES.length > 30)
            RECENT_FILES.sort(function (a, b) { return b.at - a.at; }).splice(30);
    }
}
function isSuper(request) {
    var _a, _b;
    var u = request.user;
    return !!((u === null || u === void 0 ? void 0 : u.isSuperAdmin) || ((_b = (_a = u === null || u === void 0 ? void 0 : u.roles) === null || _a === void 0 ? void 0 : _a.includes) === null || _b === void 0 ? void 0 : _b.call(_a, 'super_admin')));
}
function ensureSuper(req, res) {
    if (!isSuper(req)) {
        res.status(403).json({ success: false, error: 'Accès restreint SuperAdmin' });
        return false;
    }
    return true;
}
function sanitizeRelative(p) {
    if (!p)
        return null;
    var norm = path_1.default.posix.normalize(p.replace(/\\/g, '/')).replace(/^\/+/, '');
    var base = norm.split('/')[0];
    if (!ALLOWED_ROOTS.includes(base))
        return null;
    return norm;
}
function abs(rel) { return path_1.default.join(REPO_ROOT, rel); }
// GET /api/ai/code/tree
router.get('/code/tree', function (req, res) {
    if (!ensureSuper(req, res))
        return;
    var rel = sanitizeRelative(String(req.query.path || 'src'));
    if (!rel)
        return res.status(400).json({ success: false, error: 'Chemin non autorisé' });
    var depth = Math.min(4, Math.max(0, parseInt(String(req.query.depth || '2'), 10) || 0));
    var target = abs(rel);
    if (!fs_1.default.existsSync(target))
        return res.status(404).json({ success: false, error: 'Chemin introuvable' });
    function build(p, d) {
        var stat = fs_1.default.statSync(p);
        var name = path_1.default.basename(p);
        var relPath = p.substring(REPO_ROOT.length + 1).replace(/\\/g, '/');
        if (stat.isDirectory()) {
            if (d >= depth)
                return { type: 'dir', name: name, path: relPath };
            var children = [];
            try {
                children = fs_1.default.readdirSync(p).slice(0, 200).map(function (f) { return build(path_1.default.join(p, f), d + 1); });
            }
            catch (_a) {
                children = [];
            }
            return { type: 'dir', name: name, path: relPath, children: children };
        }
        return { type: 'file', name: name, path: relPath, size: stat.size };
    }
    try {
        var tree = build(target, 0);
        res.json({ success: true, data: tree, meta: { root: rel, depth: depth } });
    }
    catch (e) {
        res.status(500).json({ success: false, error: 'Erreur lecture', details: e.message });
    }
});
// GET /api/ai/code/file
router.get('/code/file', function (req, res) {
    if (!ensureSuper(req, res))
        return;
    var rel = sanitizeRelative(String(req.query.path || ''));
    if (!rel)
        return res.status(400).json({ success: false, error: 'Chemin non autorisé' });
    var target = abs(rel);
    if (!fs_1.default.existsSync(target) || !fs_1.default.statSync(target).isFile())
        return res.status(404).json({ success: false, error: 'Fichier introuvable' });
    var offset = Math.max(0, parseInt(String(req.query.offset || '0'), 10) || 0);
    var limit = Math.min(800, Math.max(50, parseInt(String(req.query.limit || '400'), 10) || 400));
    try {
        var content = fs_1.default.readFileSync(target, 'utf8');
        var totalBytes = Buffer.byteLength(content, 'utf8');
        var lines = content.split(/\r?\n/);
        var etag = 'W/"' + crypto_1.default.createHash('sha256').update(content).digest('hex').slice(0, 16) + '"';
        var ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch && ifNoneMatch === etag) {
            res.status(304).end();
            return;
        }
        var truncated = totalBytes > MAX_FILE_SIZE_BYTES || lines.length > MAX_FILE_LINES_RETURN;
        var slice = lines.slice(offset, Math.min(offset + limit, truncated ? MAX_FILE_LINES_RETURN : lines.length));
        recordRecent({ path: rel, at: Date.now(), lines: lines.length, hash: etag });
        res.setHeader('ETag', etag);
        res.json({ success: true, data: { path: rel, offset: offset, limit: slice.length, totalLines: lines.length, totalBytes: totalBytes, truncated: truncated, lines: slice } });
    }
    catch (e) {
        res.status(500).json({ success: false, error: 'Erreur lecture fichier', details: e.message });
    }
});
var FILE_INDEX = null;
function buildFileIndex() {
    if (FILE_INDEX)
        return FILE_INDEX;
    var acc = [];
    function walk(rel) {
        var full = abs(rel);
        if (!fs_1.default.existsSync(full))
            return;
        var stat = fs_1.default.statSync(full);
        if (stat.isDirectory()) {
            var entries = fs_1.default.readdirSync(full).slice(0, 500);
            for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
                var e = entries_1[_i];
                var childRel = rel + '/' + e;
                if (/node_modules|\.git|dist|build/.test(childRel))
                    continue;
                walk(childRel);
            }
        }
        else if (/\.(ts|tsx|js|cjs|mjs)$/.test(rel)) {
            acc.push(rel);
        }
    }
    for (var _i = 0, ALLOWED_ROOTS_1 = ALLOWED_ROOTS; _i < ALLOWED_ROOTS_1.length; _i++) {
        var root = ALLOWED_ROOTS_1[_i];
        walk(root);
    }
    FILE_INDEX = acc;
    return FILE_INDEX;
}
// GET /api/ai/code/search
router.get('/code/search', function (req, res) {
    if (!ensureSuper(req, res))
        return;
    var q = String(req.query.q || '').trim();
    if (!q)
        return res.status(400).json({ success: false, error: 'Paramètre q requis' });
    var scope = sanitizeRelative(String(req.query.path || 'src')) || 'src';
    var max = Math.min(50, Math.max(1, parseInt(String(req.query.max || '25'), 10) || 25));
    var files = buildFileIndex().filter(function (f) { return f.startsWith(scope); });
    var results = [];
    var regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
        var f = files_1[_i];
        if (results.length >= max)
            break;
        try {
            var content = fs_1.default.readFileSync(abs(f), 'utf8');
            var lines = content.split(/\r?\n/);
            for (var idx = 0; idx < lines.length && results.length < max; idx++) {
                var line = lines[idx];
                if (regex.test(line))
                    results.push({ path: f, line: idx + 1, snippet: line.trim().slice(0, 240) });
            }
        }
        catch (_a) {
            // ignorer erreurs de lecture individuelles
        }
    }
    res.json({ success: true, data: { query: q, matches: results, scope: scope, max: max } });
});
// GET /api/ai/code/summary
router.get('/code/summary', function (req, res) {
    if (!ensureSuper(req, res))
        return;
    var rel = sanitizeRelative(String(req.query.path || ''));
    if (!rel)
        return res.status(400).json({ success: false, error: 'Chemin non autorisé' });
    var target = abs(rel);
    if (!fs_1.default.existsSync(target) || !fs_1.default.statSync(target).isFile())
        return res.status(404).json({ success: false, error: 'Fichier introuvable' });
    try {
        var content = fs_1.default.readFileSync(target, 'utf8');
        var lines = content.split(/\r?\n/);
        var totalBytes = Buffer.byteLength(content, 'utf8');
        var importRegex = /import\s+[^;]*?from\s+['"]([^'";]+)['"]/g;
        var requiresRegex = /require\(\s*['"]([^'";]+)['"]\s*\)/g;
        var depsSet = new Set();
        var m = void 0;
        while ((m = importRegex.exec(content)))
            depsSet.add(m[1]);
        while ((m = requiresRegex.exec(content)))
            depsSet.add(m[1]);
        var deps = Array.from(depsSet).sort();
        var exportRegex = /export\s+(?:default\s+)?(class|function|const|let|var|interface|type|enum)?\s*([A-Za-z0-9_]+)/g;
        var named_1 = [];
        while ((m = exportRegex.exec(content))) {
            var kind = m[1] || 'symbol';
            var name_1 = m[2];
            if (!named_1.includes(name_1))
                named_1.push(name_1 + ':' + kind);
        }
        var braceExport = /export\s+{([^}]+)}/g;
        while ((m = braceExport.exec(content))) {
            var inside = m[1].split(',').map(function (s) { return s.trim().split(/\s+as\s+/i)[0]; }).filter(Boolean);
            inside.forEach(function (sym) { if (!named_1.some(function (n) { return n.startsWith(sym + ':'); }))
                named_1.push(sym + ':ref'); });
        }
        var defaultExport = /export\s+default\s+/.test(content);
        var summary = {
            path: rel,
            lines: lines.length,
            bytes: totalBytes,
            hasDefaultExport: defaultExport,
            exports: named_1.slice(0, 50),
            dependencies: deps.slice(0, 100),
            sizeCategory: totalBytes > MAX_FILE_SIZE_BYTES ? 'large' : 'normal',
            lastModified: fs_1.default.statSync(target).mtime,
        };
        recordRecent({ path: rel, at: Date.now(), lines: lines.length });
        res.json({ success: true, data: summary });
    }
    catch (e) {
        res.status(500).json({ success: false, error: 'Erreur résumé fichier', details: e.message });
    }
});
// GET /api/ai/code/diff
router.get('/code/diff', function (req, res) {
    if (!ensureSuper(req, res))
        return;
    var oldRel = sanitizeRelative(String(req.query.old || ''));
    var newRel = sanitizeRelative(String(req.query.new || ''));
    if (!oldRel || !newRel)
        return res.status(400).json({ success: false, error: 'Paramètres old et new requis' });
    var oldPath = abs(oldRel);
    var newPath = abs(newRel);
    if (!fs_1.default.existsSync(oldPath) || !fs_1.default.statSync(oldPath).isFile())
        return res.status(404).json({ success: false, error: 'Ancien fichier introuvable' });
    if (!fs_1.default.existsSync(newPath) || !fs_1.default.statSync(newPath).isFile())
        return res.status(404).json({ success: false, error: 'Nouveau fichier introuvable' });
    try {
        var oldLines = fs_1.default.readFileSync(oldPath, 'utf8').split(/\r?\n/);
        var newLines = fs_1.default.readFileSync(newPath, 'utf8').split(/\r?\n/);
        var diffs = [];
        var max = Math.max(oldLines.length, newLines.length);
        var maxOutput = 800;
        for (var i = 0; i < max && diffs.length < maxOutput; i++) {
            var a = oldLines[i];
            var b = newLines[i];
            if (a === b) {
                if (diffs.length && diffs[diffs.length - 1].type === 'ctx')
                    continue;
                diffs.push({ type: 'ctx', oldLine: i + 1, newLine: i + 1, text: a !== null && a !== void 0 ? a : '' });
            }
            else {
                if (a !== undefined)
                    diffs.push({ type: 'del', oldLine: i + 1, text: a });
                if (b !== undefined)
                    diffs.push({ type: 'add', newLine: i + 1, text: b });
            }
        }
        recordRecent({ path: oldRel, at: Date.now(), lines: oldLines.length });
        recordRecent({ path: newRel, at: Date.now(), lines: newLines.length });
        res.json({ success: true, data: { old: oldRel, new: newRel, oldLines: oldLines.length, newLines: newLines.length, diffs: diffs } });
    }
    catch (e) {
        res.status(500).json({ success: false, error: 'Erreur diff', details: e.message });
    }
});
// GET /api/ai/code/recent
router.get('/code/recent', function (req, res) {
    if (!ensureSuper(req, res))
        return;
    var list = RECENT_FILES.sort(function (a, b) { return b.at - a.at; }).slice(0, 20);
    res.json({ success: true, data: list });
});
// GET /api/ai/code/analyze?path=src/pages/SomePage.tsx
// Analyse qualitative (aucune génération de code) : métriques, heuristiques UI/UX, idées d'amélioration.
router.get('/code/analyze', function (req, res) {
    if (!ensureSuper(req, res))
        return;
    var rel = sanitizeRelative(String(req.query.path || ''));
    if (!rel)
        return res.status(400).json({ success: false, error: 'Chemin non autorisé' });
    var target = abs(rel);
    if (!fs_1.default.existsSync(target) || !fs_1.default.statSync(target).isFile())
        return res.status(404).json({ success: false, error: 'Fichier introuvable' });
    try {
        var cached = ANALYZE_CACHE[rel];
        var now = Date.now();
        if (cached && now - cached.ts < ANALYZE_TTL_MS) {
            return res.json({ success: true, data: cached.data, meta: { cached: true, ageMs: now - cached.ts } });
        }
        var content = fs_1.default.readFileSync(target, 'utf8');
        var lines = content.split(/\r?\n/);
        var size = lines.length;
        var jsx = /<[^>]+>/g.test(content) || rel.endsWith('.tsx');
        var hooksCount = (content.match(/\buse(State|Effect|Memo|Callback|Ref|Context|Reducer)\b/g) || []).length;
        var useEffectCount = (content.match(/\buseEffect\b/g) || []).length;
        var customHooks = (content.match(/\buse[A-Z][A-Za-z0-9_]*/g) || []).filter(function (h) { return !/use(State|Effect|Memo|Callback|Ref|Context|Reducer)/.test(h); });
        var importAntd = (content.match(/from ['"]antd['"]/g) || []).length > 0;
        var antdComponents = Array.from(new Set(((content.match(/<([A-Z][A-Za-z0-9]+)\b/g) || []).map(function (m) { return m.slice(1); })).filter(function (n) { return /^(Button|Table|Form|Modal|Input|Select|DatePicker|Tabs|Tag|Tooltip|Dropdown|Menu|Layout|Card|Space|Flex|Grid|Alert|Avatar|Badge)$/.test(n); }))).sort();
        var hasI18n = /\bi18n\b|\bt\(['"]/.test(content);
        var usesTailwind = /className="[^"]*(flex|grid|px-|py-|text-|bg-|rounded|shadow)/.test(content);
        var largeFile = size > 400;
        var veryLargeFile = size > 800;
        var manyHooks = hooksCount > 15 || useEffectCount > 6;
        // Calcul profondeur JSX & densité
        var depth = 0, maxDepth = 0, tagCount = 0;
        if (jsx) {
            for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
                var line = lines_1[_i];
                var trimmed = line.trim();
                var openTags = trimmed.match(/<([A-Za-z][A-Za-z0-9-]*)([^>/]*?)>/g) || [];
                // selfClosing non utilisé dans l'heuristique; ignoré
                var closeTags = trimmed.match(/<\/(?:[A-Za-z][A-Za-z0-9-]*)>/g) || [];
                tagCount += openTags.length;
                // assume each non-selfclosing open increases depth until a corresponding close
                var openNonSelf = openTags.filter(function (t) { return !/\/>$/.test(t); });
                for (var i = 0; i < openNonSelf.length; i++) {
                    depth++;
                    if (depth > maxDepth)
                        maxDepth = depth;
                }
                for (var i = 0; i < closeTags.length; i++) {
                    depth = Math.max(0, depth - 1);
                }
                // adjust for self-closing already counted above but not depth affecting beyond immediate
            }
        }
        var jsxDensity = jsx ? (tagCount / Math.max(1, size / 100)) : 0; // tags par 100 lignes
        var complexitySignals = [];
        if (largeFile)
            complexitySignals.push('taille>400 lignes');
        if (veryLargeFile)
            complexitySignals.push('taille>800 lignes (risque lisibilité)');
        if (manyHooks)
            complexitySignals.push('beaucoup de hooks (fragmentation probable)');
        if (customHooks.length > 8)
            complexitySignals.push('grand nombre de hooks personnalisés');
        if (maxDepth > 12)
            complexitySignals.push('profondeur jsx>12 (hiérarchie très profonde)');
        if (jsxDensity > 160)
            complexitySignals.push('densité jsx élevée (>160 tags/100 lignes)');
        var missingSignals = [];
        if (!hasI18n && jsx)
            missingSignals.push('i18n manquant (t("..."))');
        if (!importAntd && jsx)
            missingSignals.push('Pas de composant Ant Design détecté (peut-être custom UI)');
        // Heuristique accessibilité basique
        var hasAlt = /<img[^>]+alt=/.test(content);
        var hasAria = /aria-\w+=/.test(content);
        if (/<img[^>]+>/.test(content) && !hasAlt)
            missingSignals.push('Images sans attribut alt');
        if (jsx && !hasAria)
            missingSignals.push('Peu/pas d’attributs ARIA');
        // Idées d'amélioration heuristiques
        var ideas = [];
        if (largeFile)
            ideas.push('Scinder le composant en sous-composants (réduction taille & lisibilité)');
        if (manyHooks)
            ideas.push('Extraire logique business dans des hooks personnalisés nommés / services');
        if (!hasI18n)
            ideas.push('Internationaliser le texte statique');
        if (antdComponents.includes('Table') && !/pagination/i.test(content))
            ideas.push('Ajouter pagination / tri / filtrage sur Table');
        if (antdComponents.includes('Form') && !/Form\.Item\s+name=/.test(content))
            ideas.push('Vérifier binding structuré des champs Form.Item');
        if (!usesTailwind && importAntd)
            ideas.push('Uniformiser spacing avec Tailwind pour cohérence visuelle');
        if (missingSignals.includes('Images sans attribut alt'))
            ideas.push('Ajouter attribut alt sur toutes les images (accessibilité)');
        if (!/ErrorBoundary|ErrorFallback/.test(content) && useEffectCount > 0)
            ideas.push('Envelopper la page dans un ErrorBoundary réutilisable');
        if (!/Skeleton|Spin|Loading|isLoading/.test(content) && /fetch|api\.(get|post|put|delete)/.test(content))
            ideas.push('Afficher état de chargement (Skeleton / Spin) pendant les requêtes');
        if (!/analytics|track(Event)?/i.test(content))
            ideas.push('Instrumenter événements clefs (tracking analytics)');
        var dependencyKinds = {
            external: Array.from(new Set(Array.from(content.matchAll(/import\s+[^;]+from\s+['"]([^'".][^'"/]*)['"]/g)).map(function (m) { return m[1]; }))).sort(),
            internal: Array.from(new Set(Array.from(content.matchAll(/import\s+[^;]+from\s+['"](\.{1,2}\/[^"]+)['"]/g)).map(function (m) { return m[1]; }))).sort()
        };
        var exportMatches = Array.from(content.matchAll(/export\s+(?:default\s+)?(function|const|class)\s+([A-Za-z0-9_]+)/g)).map(function (m) { return m[2]; });
        var defaultExport = /export\s+default\s+/.test(content);
        // Score très rudimentaire (0-100)
        var baseScore = 80;
        if (largeFile)
            baseScore -= 5;
        if (veryLargeFile)
            baseScore -= 10;
        if (manyHooks)
            baseScore -= 5;
        if (!hasI18n)
            baseScore -= 5;
        if (missingSignals.includes('Images sans attribut alt'))
            baseScore -= 5;
        if (maxDepth > 12)
            baseScore -= 5;
        var score = Math.max(30, Math.min(95, baseScore));
        // Risques structurés
        var risks = [];
        if (veryLargeFile)
            risks.push({ code: 'component_too_large', severity: 'high', detail: 'Composant >800 lignes' });
        else if (largeFile)
            risks.push({ code: 'component_large', severity: 'medium', detail: 'Composant >400 lignes' });
        if (manyHooks)
            risks.push({ code: 'hooks_overuse', severity: 'medium', detail: 'Hooks nombreux (fragmenter logique)' });
        if (!hasI18n && jsx)
            risks.push({ code: 'missing_i18n', severity: 'medium', detail: 'Textes non internationalisés' });
        if (maxDepth > 12)
            risks.push({ code: 'deep_jsx_tree', severity: 'medium', detail: 'Hiérarchie JSX très profonde' });
        if (jsxDensity > 160)
            risks.push({ code: 'high_jsx_density', severity: 'low', detail: 'Beaucoup de balises par 100 lignes' });
        if (!/Skeleton|Spin|Loading|isLoading/.test(content) && /api\.(get|post|put|delete)/.test(content))
            risks.push({ code: 'missing_loading_state', severity: 'medium', detail: 'Aucun état de chargement visible' });
        if (antdComponents.includes('Table') && !/pagination/i.test(content))
            risks.push({ code: 'table_no_pagination', severity: 'low', detail: 'Table sans pagination explicite' });
        var summary = {
            path: rel,
            lines: size,
            jsx: jsx,
            exports: { named: exportMatches.slice(0, 50), hasDefault: defaultExport },
            dependencies: dependencyKinds,
            antdComponents: antdComponents,
            hooks: { total: hooksCount, useEffect: useEffectCount, custom: Array.from(new Set(customHooks)).slice(0, 30) },
            signals: { complexity: complexitySignals, missing: missingSignals },
            jsxStructure: jsx ? { maxDepth: maxDepth, tagCount: tagCount, densityPer100Lines: Math.round(jsxDensity) } : null,
            metrics: { score: score, heuristic: 'Indicatif (non scientifique)' },
            risks: risks,
            suggestions: ideas.slice(0, 25),
            notes: 'Analyse purement heuristique, ne génère PAS de code. Destinée à soutenir une conversation sur la qualité & améliorations possibles.'
        };
        recordRecent({ path: rel, at: Date.now(), lines: size });
        ANALYZE_CACHE[rel] = { ts: now, data: summary };
        res.json({ success: true, data: summary, meta: { cached: false } });
    }
    catch (e) {
        res.status(500).json({ success: false, error: 'Erreur analyse', details: e.message });
    }
});
// GET /api/ai/code/feature/analyze?feature=mail
router.get('/code/feature/analyze', function (req, res) {
    if (!ensureSuper(req, res))
        return;
    var feature = String(req.query.feature || '').trim();
    if (!feature)
        return res.status(400).json({ success: false, error: 'Paramètre feature requis' });
    var fmapPath = abs('src/feature-map.json');
    if (!fs_1.default.existsSync(fmapPath))
        return res.status(500).json({ success: false, error: 'feature-map.json manquant' });
    try {
        var fmap = JSON.parse(fs_1.default.readFileSync(fmapPath, 'utf8'));
        var def = fmap[feature];
        if (!def)
            return res.status(404).json({ success: false, error: 'Feature inconnue' });
        var files = __spreadArray(__spreadArray([], (def.primaryPages || []), true), (def.relatedServices || []), true).filter(Boolean);
        var analyses_1 = [];
        var errors_1 = [];
        // Réutilise l’heuristique d’analyse locale sans dupliquer tout le code (mini refactor interne)
        function analyzeFile(rel) {
            var target = abs(rel);
            if (!fs_1.default.existsSync(target) || !fs_1.default.statSync(target).isFile()) {
                errors_1.push({ path: rel, error: 'introuvable' });
                return;
            }
            var content = fs_1.default.readFileSync(target, 'utf8');
            var lines = content.split(/\r?\n/);
            var jsx = /<[^>]+>/g.test(content) || rel.endsWith('.tsx');
            var hooksCount = (content.match(/\buse(State|Effect|Memo|Callback|Ref|Context|Reducer)\b/g) || []).length;
            var useEffectCount = (content.match(/\buseEffect\b/g) || []).length;
            var customHooks = (content.match(/\buse[A-Z][A-Za-z0-9_]*/g) || []).filter(function (h) { return !/use(State|Effect|Memo|Callback|Ref|Context|Reducer)/.test(h); });
            var importAntd = (content.match(/from ['"]antd['"]/g) || []).length > 0;
            var antdComponents = Array.from(new Set(((content.match(/<([A-Z][A-Za-z0-9]+)\b/g) || []).map(function (m) { return m.slice(1); })).filter(function (n) { return /^(Button|Table|Form|Modal|Input|Select|DatePicker|Tabs|Tag|Tooltip|Dropdown|Menu|Layout|Card|Space|Flex|Grid|Alert|Avatar|Badge)$/.test(n); }))).sort();
            var hasI18n = /\bi18n\b|\bt\(['"]/.test(content);
            var usesTailwind = /className="[^"]*(flex|grid|px-|py-|text-|bg-|rounded|shadow)/.test(content);
            var exportMatches = Array.from(content.matchAll(/export\s+(?:default\s+)?(function|const|class)\s+([A-Za-z0-9_]+)/g)).map(function (m) { return m[2]; });
            var defaultExport = /export\s+default\s+/.test(content);
            analyses_1.push({
                path: rel,
                lines: lines.length,
                jsx: jsx,
                hooks: { total: hooksCount, useEffect: useEffectCount, custom: Array.from(new Set(customHooks)).slice(0, 30) },
                antdComponents: antdComponents,
                hasI18n: hasI18n,
                usesTailwind: usesTailwind,
                exports: { named: exportMatches.slice(0, 30), hasDefault: defaultExport },
                importAntd: importAntd
            });
        }
        files.slice(0, 30).forEach(function (f) { return analyzeFile(f); });
        // Agrégation simple
        var totalLines = analyses_1.reduce(function (s, a) { return s + a.lines; }, 0);
        var totalHooks = analyses_1.reduce(function (s, a) { return s + a.hooks.total; }, 0);
        var pages = analyses_1.filter(function (a) { return a.jsx; });
        var avgLines = analyses_1.length ? Math.round(totalLines / analyses_1.length) : 0;
        var summary = {
            feature: feature,
            label: def.label,
            fileCount: analyses_1.length,
            totalLines: totalLines,
            avgLines: avgLines,
            totalHooks: totalHooks,
            pages: pages.length,
            i18nCoverage: analyses_1.length ? (analyses_1.filter(function (a) { return a.hasI18n; }).length / analyses_1.length) : 0,
            antdUsageRate: analyses_1.length ? (analyses_1.filter(function (a) { return a.importAntd; }).length / analyses_1.length) : 0,
            tailwindUsageRate: analyses_1.length ? (analyses_1.filter(function (a) { return a.usesTailwind; }).length / analyses_1.length) : 0
        };
        res.json({ success: true, data: { summary: summary, analyses: analyses_1, errors: errors_1 } });
    }
    catch (e) {
        res.status(500).json({ success: false, error: 'Erreur analyse feature', details: e.message });
    }
});
// POST /api/ai/code/analyze/batch  body: { paths: string[] }
router.post('/code/analyze/batch', function (req, res) {
    if (!ensureSuper(req, res))
        return;
    var body = req.body || {};
    var paths = body.paths;
    if (!Array.isArray(paths) || paths.length === 0)
        return res.status(400).json({ success: false, error: 'paths[] requis' });
    var unique = Array.from(new Set(paths.map(function (p) { return String(p); }))).slice(0, 40);
    var analyses = [];
    var errors = [];
    var now = Date.now();
    function analyzeOne(rel) {
        var safe = sanitizeRelative(rel);
        if (!safe) {
            errors.push({ path: rel, error: 'non autorisé' });
            return;
        }
        var full = abs(safe);
        if (!fs_1.default.existsSync(full) || !fs_1.default.statSync(full).isFile()) {
            errors.push({ path: rel, error: 'introuvable' });
            return;
        }
        // réutilise cache
        var cached = ANALYZE_CACHE[safe];
        if (cached && now - cached.ts < ANALYZE_TTL_MS) {
            analyses.push(cached.data);
            return;
        }
        // appel interne via logique de /code/analyze (duplicated minimal subset: lire puis insérer dans cache via fetch serait surcoût)
        try {
            var content = fs_1.default.readFileSync(full, 'utf8');
            var lines = content.split(/\r?\n/);
            var hooksCount = (content.match(/\buse(State|Effect|Memo|Callback|Ref|Context|Reducer)\b/g) || []).length;
            var useEffectCount = (content.match(/\buseEffect\b/g) || []).length;
            var customHooks = (content.match(/\buse[A-Z][A-Za-z0-9_]*/g) || []).filter(function (h) { return !/use(State|Effect|Memo|Callback|Ref|Context|Reducer)/.test(h); });
            var jsx = /<[^>]+>/g.test(content) || /\.tsx$/.test(safe);
            var depth = 0, maxDepth = 0, tagCount = 0;
            if (jsx) {
                for (var _i = 0, lines_2 = lines; _i < lines_2.length; _i++) {
                    var line = lines_2[_i];
                    var trimmed = line.trim();
                    var openTags = trimmed.match(/<([A-Za-z][A-Za-z0-9-]*)([^>/]*?)>/g) || [];
                    var closeTags = trimmed.match(/<\/(?:[A-Za-z][A-Za-z0-9-]*)>/g) || [];
                    tagCount += openTags.length;
                    var openNonSelf = openTags.filter(function (t) { return !/\/>$/.test(t); });
                    for (var i = 0; i < openNonSelf.length; i++) {
                        depth++;
                        if (depth > maxDepth)
                            maxDepth = depth;
                    }
                    for (var i = 0; i < closeTags.length; i++) {
                        depth = Math.max(0, depth - 1);
                    }
                }
            }
            var jsxDensity = jsx ? (tagCount / Math.max(1, lines.length / 100)) : 0;
            var hasI18n = /\bt\(['"][^)]*\)/.test(content) || /i18n/.test(content);
            var antdComponents = Array.from(new Set(((content.match(/<([A-Z][A-Za-z0-9]+)\b/g) || []).map(function (m) { return m.slice(1); })).filter(function (n) { return /^(Button|Table|Form|Modal|Input|Select|DatePicker|Tabs|Tag|Tooltip|Dropdown|Menu|Layout|Card|Space|Flex|Grid|Alert|Avatar|Badge)$/.test(n); }))).sort();
            var summary = {
                path: safe,
                lines: lines.length,
                hooks: { total: hooksCount, useEffect: useEffectCount, custom: Array.from(new Set(customHooks)).slice(0, 20) },
                jsxStructure: jsx ? { maxDepth: maxDepth, tagCount: tagCount, densityPer100Lines: Math.round(jsxDensity) } : null,
                i18n: hasI18n,
                antdComponents: antdComponents
            };
            ANALYZE_CACHE[safe] = { ts: now, data: summary };
            analyses.push(summary);
        }
        catch (e) {
            errors.push({ path: rel, error: e.message });
        }
    }
    unique.forEach(analyzeOne);
    res.json({ success: true, data: { analyses: analyses, errors: errors, count: analyses.length } });
});
exports.default = router;
