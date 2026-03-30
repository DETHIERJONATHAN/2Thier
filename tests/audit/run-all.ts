#!/usr/bin/env npx tsx
/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   🐝 ZHIIVE — AUDIT GLOBAL UNIFIÉ                              ║
 * ║   Vérifie TOUT le système en une seule commande                 ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Usage :
 *   env -u GOOGLE_APPLICATION_CREDENTIALS npx tsx tests/audit/run-all.ts
 *   env -u GOOGLE_APPLICATION_CREDENTIALS npx tsx tests/audit/run-all.ts --section=storage
 *   env -u GOOGLE_APPLICATION_CREDENTIALS npx tsx tests/audit/run-all.ts --section=database
 *
 * Sections:
 *   storage    — Stockage GCS (zéro local, zéro cache)
 *   database   — Intégrité BDD (URLs, orphelins, conventions)
 *   api        — Backend routes & middleware
 *   security   — Sécurité & conventions code
 *   social     — Hive social (Wall, Stories, Reels)
 *   tbl        — TreeBranchLeaf (formulaires, formules, variables)
 *   google     — Intégrations Google
 *   dataloc    — Zéro stockage local (tout Google Cloud SQL)
 *   all        — Tout (défaut)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src');

// ── Argument parsing ──────────────────────────────────────────
const args = process.argv.slice(2);
const sectionArg = args.find(a => a.startsWith('--section='))?.split('=')[1] || 'all';

// ── Counters ──────────────────────────────────────────────────
let passed = 0;
let failed = 0;
let warnings = 0;
const sectionResults: Record<string, { passed: number; failed: number; warnings: number }> = {};
let currentSection = '';

function startSection(name: string, emoji: string) {
  currentSection = name;
  sectionResults[name] = { passed: 0, failed: 0, warnings: 0 };
  console.log(`\n${'━'.repeat(60)}`);
  console.log(`${emoji} ${name.toUpperCase()}`);
  console.log(`${'━'.repeat(60)}`);
}

function ok(label: string) {
  console.log(`  ✅ ${label}`);
  passed++;
  sectionResults[currentSection].passed++;
}
function fail(label: string, detail?: string) {
  console.log(`  ❌ ${label}`);
  if (detail) console.log(`     → ${detail}`);
  failed++;
  sectionResults[currentSection].failed++;
}
function warn(label: string, detail?: string) {
  console.log(`  ⚠️  ${label}`);
  if (detail) console.log(`     → ${detail}`);
  warnings++;
  sectionResults[currentSection].warnings++;
}

// ── Helpers ───────────────────────────────────────────────────
function grepFiles(
  pattern: RegExp,
  dir: string,
  extensions: string[],
  exclude: string[] = []
): { file: string; line: number; text: string }[] {
  const hits: { file: string; line: number; text: string }[] = [];
  if (!fs.existsSync(dir)) return hits;
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', '.git', 'dist', '.next', 'build'].includes(entry.name)) continue;
        walk(full);
      } else if (extensions.some(e => entry.name.endsWith(e))) {
        const rel = path.relative(ROOT, full);
        if (exclude.some(ex => rel.includes(ex))) continue;
        const lines = fs.readFileSync(full, 'utf-8').split('\n');
        lines.forEach((txt, i) => {
          if (pattern.test(txt) && !txt.trim().startsWith('//') && !txt.trim().startsWith('*')) {
            hits.push({ file: rel, line: i + 1, text: txt.trim() });
          }
        });
      }
    }
  };
  walk(dir);
  return hits;
}

function readSrc(relPath: string): string {
  const full = path.join(SRC, relPath);
  if (!fs.existsSync(full)) return '';
  return fs.readFileSync(full, 'utf-8');
}

function codeOnly(src: string): string {
  return src.split('\n').filter(l => {
    const t = l.trim();
    return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
  }).join('\n');
}

// ══════════════════════════════════════════════════════════════
// SECTION 1: STOCKAGE GCS
// ══════════════════════════════════════════════════════════════
async function auditStorage() {
  startSection('Stockage GCS', '📦');

  const storageSrc = readSrc('lib/storage.ts');
  const storageCode = codeOnly(storageSrc);

  // storage.ts checks
  if (!storageSrc.includes('uploadToLocal'))     ok('storage.ts : pas de uploadToLocal()');
  else fail('storage.ts : uploadToLocal() encore présent');

  if (!storageCode.includes("public: true"))     ok('storage.ts : pas de public: true');
  else fail('storage.ts : public: true (erreur ACL uniforme)');

  if (storageSrc.includes("cacheControl: 'no-cache'")) ok("storage.ts : cacheControl: 'no-cache'");
  else fail("storage.ts : cacheControl: 'no-cache' manquant");

  if (!storageSrc.includes('max-age'))           ok('storage.ts : pas de max-age');
  else fail('storage.ts : max-age résiduel');

  if (storageSrc.includes('GcloudAuth'))         ok('storage.ts : GcloudAuth dev auth');
  else fail('storage.ts : GcloudAuth manquant');

  // api-server-clean.ts
  const apiSrc = readSrc('api-server-clean.ts');
  const uploadsLines = apiSrc.split('\n').filter(l => l.includes("'/uploads'"));
  const hasStaticUploads = uploadsLines.some(l => l.includes('express.static'));
  const hasGcsRedirect = apiSrc.includes('storage.googleapis.com') && apiSrc.includes("app.use('/uploads'");

  if (hasGcsRedirect)     ok('api-server : /uploads → GCS redirect');
  else fail('api-server : /uploads ne redirige pas vers GCS');
  if (!hasStaticUploads)  ok('api-server : pas de express.static /uploads');
  else fail('api-server : express.static /uploads résiduel');

  // Code source: zero local
  const localWrites = grepFiles(/fs\.(writeFile|mkdirSync|mkdir).*uploads/, SRC, ['.ts', '.tsx'], ['api-server.ts', 'audit']);
  if (localWrites.length === 0) ok('Code : zéro écriture locale uploads');
  else localWrites.forEach(h => fail(`Écriture locale: ${h.file}:${h.line}`, h.text));

  const diskStorageHits = grepFiles(/multer\.diskStorage/, SRC, ['.ts', '.tsx']);
  if (diskStorageHits.length === 0) ok('Code : zéro multer.diskStorage');
  else diskStorageHits.forEach(h => fail(`diskStorage: ${h.file}:${h.line}`, h.text));

  const localUrlReturns = grepFiles(/(?:fileUrl|url|imageUrl)\s*[:=]\s*[`'"]\/uploads\//, SRC, ['.ts', '.tsx']);
  if (localUrlReturns.length === 0) ok('Code : zéro URL /uploads/ retournée');
  else localUrlReturns.forEach(h => fail(`URL locale: ${h.file}:${h.line}`, h.text));

  // GCS live test
  try {
    const { uploadFile, deleteFile } = await import('../../src/lib/storage');
    const testKey = `_audit_${Date.now()}.txt`;
    const buf = Buffer.from('audit-test');
    const url = await uploadFile(buf, testKey, 'text/plain');
    if (url.startsWith('https://storage.googleapis.com/')) ok('GCS live : upload OK');
    else fail('GCS live : URL non-GCS');

    const resp = await fetch(url);
    if (resp.status === 200) ok('GCS live : fetch OK');
    else fail(`GCS live : fetch HTTP ${resp.status}`);

    const cacheHeader = resp.headers.get('cache-control');
    if (cacheHeader?.includes('no-cache')) ok(`GCS live : Cache-Control: ${cacheHeader}`);
    else warn(`GCS live : Cache-Control: ${cacheHeader || 'absent'}`);

    await deleteFile(url);
    const resp2 = await fetch(url);
    if (resp2.status === 404 || resp2.status === 403) ok('GCS live : delete OK');
    else warn(`GCS live : delete status ${resp2.status}`);
  } catch (e) {
    fail('GCS live : test échoué', String(e));
  }
}

// ══════════════════════════════════════════════════════════════
// SECTION 2: BASE DE DONNÉES
// ══════════════════════════════════════════════════════════════
async function auditDatabase() {
  startSection('Base de données & Intégrité', '🗄️');

  try {
    const { db } = await import('../../src/lib/database');

    // 2a. Zéro URL locale en BDD
    const urlChecks = [
      { model: 'User', field: 'avatarUrl', q: () => db.user.findMany({ where: { avatarUrl: { startsWith: '/uploads/' } }, select: { id: true } }) },
      { model: 'Organization', field: 'logoUrl', q: () => db.organization.findMany({ where: { logoUrl: { startsWith: '/uploads/' } }, select: { id: true } }) },
      { model: 'Organization', field: 'coverUrl', q: () => db.organization.findMany({ where: { coverUrl: { startsWith: '/uploads/' } }, select: { id: true } }) },
    ];
    for (const { model, field, q } of urlChecks) {
      const r = await q();
      if (r.length === 0) ok(`${model}.${field} : zéro URL locale`);
      else fail(`${model}.${field} : ${r.length} URLs /uploads/`);
    }

    // WallPost mediaUrls (Json)
    try {
      const w: any[] = await db.$queryRaw`SELECT id FROM "WallPost" WHERE "mediaUrls"::text LIKE '%/uploads/%'`;
      if (w.length === 0) ok('WallPost.mediaUrls : zéro URL locale');
      else fail(`WallPost.mediaUrls : ${w.length} posts avec /uploads/`);
    } catch { warn('WallPost.mediaUrls : impossible de vérifier'); }

    // ChantierDocument
    try {
      const c = await (db as any).chantierDocument.findMany({ where: { documentUrl: { startsWith: '/uploads/' } }, select: { id: true } });
      if (c.length === 0) ok('ChantierDocument : zéro URL locale');
      else fail(`ChantierDocument : ${c.length} URLs locales`);
    } catch { /* table may not exist */ }

    // ProductDocument
    try {
      const p = await (db as any).productDocument.findMany({ where: { localPath: { startsWith: '/uploads/' } }, select: { id: true } });
      if (p.length === 0) ok('ProductDocument : zéro URL locale');
      else fail(`ProductDocument : ${p.length} URLs locales`);
    } catch { /* table may not exist */ }

    // 2b. Utilisateurs sans email
    const noEmail = await db.user.count({ where: { email: { equals: '' } } });
    if (noEmail === 0) ok('Users : tous ont un email');
    else fail(`Users : ${noEmail} sans email`);

    // 2c. Organizations count
    const orgCount = await db.organization.count();
    ok(`Organizations : ${orgCount} en BDD`);

    // 2d. Orphan leads (org doesn't exist)
    try {
      const orphanLeads: any[] = await db.$queryRaw`
        SELECT COUNT(*) as c FROM "Lead" l
        LEFT JOIN "Organization" o ON l."organizationId" = o.id
        WHERE l."organizationId" IS NOT NULL AND o.id IS NULL
      `;
      const count = Number(orphanLeads[0]?.c || 0);
      if (count === 0) ok('Leads : zéro orphelin (org supprimée)');
      else warn(`Leads : ${count} orphelins (org supprimée)`);
    } catch { warn('Leads : vérification orphelins impossible'); }

    // 2e. Database connection pool
    ok('Connexion BDD : OK (singleton db)');

  } catch (e) {
    fail('Connexion BDD échouée', String(e));
  }
}

// ══════════════════════════════════════════════════════════════
// SECTION 3: API / BACKEND
// ══════════════════════════════════════════════════════════════
async function auditApi() {
  startSection('Backend API & Routes', '🔌');

  const apiSrc = readSrc('api-server-clean.ts');

  // 3a. Security headers
  if (apiSrc.includes('helmet'))              ok('Helmet activé');
  else warn('Helmet non trouvé');

  if (apiSrc.includes('contentSecurityPolicy') || apiSrc.includes('Content-Security-Policy') || apiSrc.includes('csp'))
    ok('CSP configuré');
  else warn('CSP non trouvé');

  if (apiSrc.includes('cors'))                ok('CORS configuré');
  else fail('CORS manquant');

  if (apiSrc.includes('rateLimit') || apiSrc.includes('rate-limit') || apiSrc.includes('express-rate-limit') || apiSrc.includes('advancedRateLimit'))
    ok('Rate limiting actif');
  else warn('Rate limiting non trouvé');

  // 3b. Auth middleware (Passport sessions)
  if (apiSrc.includes('passport.initialize()') && apiSrc.includes('passport.session()'))
    ok('Middleware auth : Passport initialize + session');
  else warn('Middleware auth : Passport non initialisé globalement');

  if (apiSrc.includes('passport'))            ok('Passport configuré');
  else warn('Passport non trouvé');

  // 3c. No new PrismaClient in routes
  const prismaViolations = grepFiles(
    /new PrismaClient/,
    path.join(SRC, 'routes'),
    ['.ts']
  );
  if (prismaViolations.length === 0) ok('Routes : zéro new PrismaClient()');
  else prismaViolations.forEach(h => fail(`new PrismaClient: ${h.file}:${h.line}`));

  // Also check services
  const svcPrismaViolations = grepFiles(
    /new PrismaClient/,
    path.join(SRC, 'services'),
    ['.ts']
  );
  if (svcPrismaViolations.length === 0) ok('Services : zéro new PrismaClient()');
  else svcPrismaViolations.forEach(h => fail(`new PrismaClient: ${h.file}:${h.line}`));

  // Also check api/
  const apiPrismaViolations = grepFiles(
    /new PrismaClient/,
    path.join(SRC, 'api'),
    ['.ts']
  );
  if (apiPrismaViolations.length === 0) ok('API : zéro new PrismaClient()');
  else apiPrismaViolations.forEach(h => fail(`new PrismaClient: ${h.file}:${h.line}`));

  // 3d. Error handling
  if (apiSrc.includes('app.use') && apiSrc.includes('err'))
    ok('Error handler global existe');
  else warn('Error handler global non trouvé');

  // 3e. File upload config
  if (apiSrc.includes('fileUpload') || apiSrc.includes('express-fileupload'))
    ok('express-fileupload configuré');
  else warn('express-fileupload non trouvé');

  // 3f. Trust proxy (for Cloud Run)
  if (apiSrc.includes('trust proxy'))         ok('trust proxy configuré');
  else warn('trust proxy non trouvé (nécessaire Cloud Run)');
}

// ══════════════════════════════════════════════════════════════
// SECTION 4: SÉCURITÉ & CONVENTIONS CODE
// ══════════════════════════════════════════════════════════════
async function auditSecurity() {
  startSection('Sécurité & Conventions Code', '🔒');

  // 4a. No hardcoded secrets
  const secretPatterns = grepFiles(
    /(?:password|secret|api_key|apikey|token)\s*[:=]\s*['"][^'"]{8,}['"]/i,
    SRC,
    ['.ts', '.tsx'],
    ['node_modules', '.env', 'test', 'audit', 'seed', 'example', 'README', '_backup', '_OLD', '_ORIGINAL', 'Old']
  ).filter(h =>
    !h.text.includes('process.env') &&
    !h.text.includes('req.') &&
    !h.text.includes('config.') &&
    !h.text.includes('type ') &&
    !h.text.includes('interface ') &&
    !h.text.includes('getItem') &&
    !h.text.includes('placeholder') &&
    !h.text.includes('label') &&
    !h.text.includes('Label') &&
    !h.text.includes('description') &&
    !h.text.includes('text:') &&
    !h.text.includes("'Mot de") &&
    !h.text.includes('ARRONDI') &&
    !h.text.includes('TRONQUE') &&
    !h.text.includes('token:') &&
    !h.text.includes('TOKEN') &&
    !h.text.includes('NUMBER') &&
    !h.text.includes('OPERATOR') &&
    !h.text.includes('REFERENCE') &&
    !h.text.includes('PARENTHESIS') &&
    !h.text.includes('FUNCTION') &&
    !h.file.includes('_deprecated') &&
    !h.file.includes('FormulaPanel')
  );
  if (secretPatterns.length === 0) ok('Code : pas de secrets hardcodés détectés');
  else {
    warn(`Code : ${secretPatterns.length} potentiels secrets hardcodés`);
    secretPatterns.slice(0, 5).forEach(h => console.log(`     → ${h.file}:${h.line}`));
  }

  // 4b. SQL injection check — Smart categorization
  // Reads context around each $executeRawUnsafe / $queryRawUnsafe to categorize:
  //   STATIC_DDL  → String literal SQL without variable interpolation (safe)
  //   PARAMETERIZED → Uses $1, $2 placeholders + ...params (safe)
  //   RISKY       → Dynamic SQL with ${variable} interpolation or string concat
  const rawSqlHits = grepFiles(
    /\$queryRawUnsafe|\$executeRawUnsafe/,
    SRC,
    ['.ts', '.tsx']
  );

  let staticDdlCount = 0;
  let parameterizedCount = 0;
  let boundedIntCount = 0;
  let validatedIdentifierCount = 0;
  let linkedFieldCount = 0;
  const fieldInterpolationHits: typeof rawSqlHits = [];
  const riskyHits: typeof rawSqlHits = [];

  for (const hit of rawSqlHits) {
    // Read broad context (20 lines before and 30 after to capture full statement)
    const fullPath = path.join(ROOT, hit.file);
    const allLines = fs.readFileSync(fullPath, 'utf-8').split('\n');
    const startIdx = Math.max(0, hit.line - 21);
    const endIdx = Math.min(allLines.length - 1, hit.line + 30);
    const context = allLines.slice(startIdx, endIdx + 1).join('\n');

    // Extract the full statement from the hit line through the closing paren/semicolon
    const stmtLines: string[] = [];
    let parenDepth = 0;
    let started = false;
    for (let i = hit.line - 1; i < Math.min(allLines.length, hit.line + 40); i++) {
      const l = allLines[i];
      stmtLines.push(l);
      for (const ch of l) {
        if (ch === '(') { parenDepth++; started = true; }
        else if (ch === ')') parenDepth--;
      }
      if (started && parenDepth <= 0) break;
    }
    const stmtText = stmtLines.join('\n');

    // Check 1: Static DDL — uses string literal or backtick template WITHOUT ${...} interpolation
    const ddlKeywords = /ALTER TABLE|CREATE TABLE|CREATE INDEX|CREATE UNIQUE|DO \$\$/i;
    const hasTemplateInterpolation = /\$\{[^}]+\}/.test(stmtText);
    const isDDL = ddlKeywords.test(stmtText);
    const isStaticDDL = isDDL && !hasTemplateInterpolation;

    // Check 2: Parameterized — uses $1/$2 placeholders and values passed as separate args
    const hasPlaceholders = /\$[1-9]/.test(stmtText);
    const hasParamsSpread = /\.\.\.params/.test(stmtText);
    const hasMultipleArgs = /,\s*(?:randomUUID|userId|organizationId|treeId|submissionIds|type|true|false|null)/.test(stmtText);
    const isParameterized = hasPlaceholders && (hasParamsSpread || hasMultipleArgs);

    // Check 3: Also catch parameterized queries where placeholders are built dynamically
    // e.g. valuePlaceholders = ['($1, $2, $3)', '($4, $5, $6)'] then ...params
    const hasDynamicPlaceholders = /valuePlaceholders|conditions\.push/.test(context) && hasParamsSpread;

    if (isStaticDDL) {
      staticDdlCount++;
    } else if (isParameterized || hasDynamicPlaceholders) {
      parameterizedCount++;
    } else {
      // Sub-categorize remaining: field interpolation from controlled type vs truly dynamic
      const hasFieldInterpolation = /"\$\{field\}"|\$\{field\}|\$\{column\}/.test(stmtText);
      const hasBoundedInt = /\$\{limit\}|\$\{offset\}|\$\{perTable\}/.test(stmtText) && /Math\.min|Math\.max|parseInt|Number\(/.test(context);
      // Whitelist-iterable: table name from Object.keys of a hardcoded object
      const hasWhitelistIterable = /Object\.keys\(/.test(context) && /\$\{tableName\}/.test(stmtText);
      // Dynamic identifiers validated with SAFE_IDENTIFIER regex
      const hasSafeIdentifierValidation = /SAFE_IDENTIFIER\.test/.test(
        fs.readFileSync(path.join(ROOT, hit.file), 'utf-8')
      );
      // Field typed as LinkedField enum (strict union type)
      const fullFileContent = fs.readFileSync(path.join(ROOT, hit.file), 'utf-8');
      const hasLinkedFieldType = (
        /field:\s*LinkedField/.test(fullFileContent) ||
        /field:\s*['"]linked(?:Formula|Condition|Table|Variable)Ids['"]/.test(fullFileContent) ||
        /:\s*'linkedFormulaIds'\s*\|\s*'linkedConditionIds'/.test(fullFileContent)
      );

      if (hasFieldInterpolation && hasLinkedFieldType) {
        linkedFieldCount++;
      } else if (hasFieldInterpolation) {
        fieldInterpolationHits.push(hit);
      } else if (hasBoundedInt || hasWhitelistIterable) {
        boundedIntCount++;
      } else if (hasSafeIdentifierValidation) {
        validatedIdentifierCount++;
      } else {
        riskyHits.push(hit);
      }
    }
  }

  if (staticDdlCount > 0) ok(`SQL : ${staticDdlCount} DDL statiques (ALTER/CREATE, sans variables — sûrs)`);
  if (parameterizedCount > 0) ok(`SQL : ${parameterizedCount} requêtes paramétrées ($1, ...params — sûrs)`);
  if (boundedIntCount > 0) ok(`SQL : ${boundedIntCount} interpolations entières bornées / whitelist itérable (sûrs)`);
  if (validatedIdentifierCount > 0) ok(`SQL : ${validatedIdentifierCount} identifiants dynamiques validés (SAFE_IDENTIFIER regex — OK)`);
  if (linkedFieldCount > 0) ok(`SQL : ${linkedFieldCount} interpolations LinkedField typé (union strict — sûrs)`);

  if (fieldInterpolationHits.length > 0) {
    warn(`SQL : ${fieldInterpolationHits.length} interpolations de champ contrôlé (vérifier que le type est un enum strict)`);
    fieldInterpolationHits.slice(0, 3).forEach(h => console.log(`     → ${h.file}:${h.line}`));
  }

  if (riskyHits.length === 0) {
    ok('SQL : zéro requête dynamique risquée (hors champs contrôlés)');
  } else {
    for (const h of riskyHits) {
      fail(`SQL dynamique: ${h.file}:${h.line}`, h.text.slice(0, 120));
    }
  }

  // 4c. eval() usage
  const evalHits = grepFiles(
    /\beval\s*\(/,
    SRC,
    ['.ts', '.tsx'],
    ['node_modules']
  );
  if (evalHits.length === 0) ok('Code : zéro eval()');
  else evalHits.forEach(h => fail(`eval() trouvé: ${h.file}:${h.line}`, h.text));

  // 4d. Zero localStorage in Zhiive components
  const localStorageZhiive = grepFiles(
    /localStorage\./,
    path.join(SRC, 'components', 'zhiive'),
    ['.ts', '.tsx']
  );
  if (localStorageZhiive.length === 0) ok('Zhiive components : zéro localStorage');
  else localStorageZhiive.forEach(h => fail(`localStorage: ${h.file}:${h.line}`, h.text));

  // Also check pages for localStorage used in social context
  const localStoragePages = grepFiles(
    /localStorage\./,
    path.join(SRC, 'pages'),
    ['.ts', '.tsx'],
    ['_deprecated', 'test', 'Test', 'demo', '_backup', '_OLD', '_ORIGINAL', 'Debug', '.backup', '.disabled', 'Diagnostic', 'GoogleAuthCallback', 'Old']
  );
  if (localStoragePages.length === 0) ok('Pages : zéro localStorage');
  else {
    warn(`Pages : ${localStoragePages.length} usages localStorage`);
    localStoragePages.slice(0, 5).forEach(h => console.log(`     → ${h.file}:${h.line}`));
  }

  // 4e. Forbidden terms in UI (CRM, ERP, réseau social)
  const forbiddenTerms = grepFiles(
    /['"`](?:CRM|ERP|réseau social|social network)['"` ]/i,
    SRC,
    ['.tsx'],
    ['_deprecated', 'test', 'audit', '_backup', '_OLD', '_ORIGINAL']
  ).filter(h =>
    !h.text.includes('import') &&
    !h.text.includes('//') &&
    !h.text.includes('console.') &&
    !h.text.includes('.includes(') &&
    !h.text.includes('.toLowerCase()') &&
    !h.text.includes('filter(') &&
    !h.text.includes('find(') &&
    !h.text.includes('// ') &&
    !h.text.includes('icon') &&
    !h.text.includes('return ')
  );
  if (forbiddenTerms.length === 0) ok('UI : zéro terme interdit (CRM/ERP/réseau social)');
  else {
    warn(`UI : ${forbiddenTerms.length} termes interdits`);
    forbiddenTerms.slice(0, 5).forEach(h => console.log(`     → ${h.file}:${h.line} — ${h.text.slice(0, 80)}`));
  }

  // 4f. Hardcoded colors in Zhiive
  const hardcodedColors = grepFiles(
    /#[0-9a-fA-F]{6}/,
    path.join(SRC, 'components', 'zhiive'),
    ['.tsx', '.ts'],
    ['Theme']
  ).filter(h => !h.text.includes('//'));
  if (hardcodedColors.length === 0) ok('Zhiive : zéro couleur hardcodée');
  else warn(`Zhiive : ${hardcodedColors.length} couleurs hardcodées (convention: SF.*/FB.*/COLORS.*)`);

  // 4g. No dangerouslySetInnerHTML without sanitization
  const dangerousHtml = grepFiles(
    /dangerouslySetInnerHTML/,
    SRC,
    ['.tsx'],
    ['_deprecated', '_backup', '_OLD', '_ORIGINAL', '.backup', '.disabled']
  );
  // Check each file for DOMPurify usage
  const unsanitizedHtml: typeof dangerousHtml = [];
  for (const h of dangerousHtml) {
    const fileSrc = fs.readFileSync(path.join(ROOT, h.file), 'utf-8');
    if (!fileSrc.includes('DOMPurify') && !fileSrc.includes('dompurify') && !fileSrc.includes('sanitizeHtml')) {
      unsanitizedHtml.push(h);
    }
  }
  if (dangerousHtml.length === 0) ok('Code : zéro dangerouslySetInnerHTML');
  else if (unsanitizedHtml.length === 0) ok(`Code : ${dangerousHtml.length} dangerouslySetInnerHTML, tous sanitizés (DOMPurify)`);
  else {
    warn(`Code : ${unsanitizedHtml.length}/${dangerousHtml.length} dangerouslySetInnerHTML sans DOMPurify`);
    unsanitizedHtml.slice(0, 5).forEach(h => console.log(`     → ${h.file}:${h.line}`));
  }
}

// ══════════════════════════════════════════════════════════════
// SECTION 5: SOCIAL (Wall, Stories, Reels)
// ══════════════════════════════════════════════════════════════
async function auditSocial() {
  startSection('Hive Social (Wall, Reels, Stories)', '🐝');

  // 5a. ActiveIdentity centralisé
  const activeIdentityCtx = readSrc('contexts/ActiveIdentityContext.tsx');
  if (activeIdentityCtx.includes('useActiveIdentity')) ok('ActiveIdentityContext : hook useActiveIdentity existe');
  else fail('ActiveIdentityContext : hook manquant');

  // Check that social components use useActiveIdentity, not local isOrgMode
  const socialFiles = [
    'pages/DashboardPageUnified.tsx',
    'components/zhiive/StoriesBar.tsx',
    'components/zhiive/ReelsPanel.tsx',
    'components/zhiive/ExplorePanel.tsx',
  ];
  for (const f of socialFiles) {
    const src = readSrc(f);
    if (!src) { warn(`${f} : fichier non trouvé`); continue; }
    const baseName = path.basename(f);
    if (src.includes('useActiveIdentity')) ok(`${baseName} : utilise useActiveIdentity`);
    else warn(`${baseName} : n'utilise pas useActiveIdentity`);
    // Check no local isOrgMode calculation
    if (codeOnly(src).includes("feedMode === 'org' && !!currentOrganization"))
      fail(`${baseName} : calcule isOrgMode localement (interdit)`);
  }

  // 5b. Wall routes check
  const wallRoutes = readSrc('routes/wall.ts');
  if (wallRoutes.includes('publishAsOrg')) ok('wall.ts : gère publishAsOrg');
  else warn('wall.ts : publishAsOrg non trouvé');

  if (wallRoutes.includes("uploadExpressFile") || wallRoutes.includes("uploadFile"))
    ok('wall.ts : utilise storage module pour upload');
  else fail('wall.ts : n\'utilise pas le storage module');

  // 5c. Social settings route
  const socialSettings = readSrc('routes/social-settings.ts');
  if (socialSettings) ok('social-settings.ts : route existe');
  else warn('social-settings.ts : route manquante');

  // 5d. Friends route
  const friends = readSrc('routes/friends.ts');
  if (friends) ok('friends.ts : route existe');
  else warn('friends.ts : route manquante');

  // 5e. Check useAuthenticatedApi usage (no direct fetch/axios)
  const directFetch = grepFiles(
    /\bfetch\s*\(\s*[`'"]\/api\//,
    path.join(SRC, 'components', 'zhiive'),
    ['.tsx', '.ts']
  );
  if (directFetch.length === 0) ok('Zhiive components : zéro fetch() direct vers /api');
  else {
    warn(`Zhiive components : ${directFetch.length} fetch() directs (utiliser useAuthenticatedApi)`);
    directFetch.slice(0, 3).forEach(h => console.log(`     → ${h.file}:${h.line}`));
  }

  // 5f. Database social data integrity
  try {
    const { db } = await import('../../src/lib/database');

    const postCount = await db.wallPost.count();
    ok(`WallPost : ${postCount} posts en BDD`);

    // Posts without author
    const orphanPosts: any[] = await db.$queryRaw`
      SELECT COUNT(*) as c FROM "WallPost" p
      LEFT JOIN "User" u ON p."authorId" = u.id
      WHERE u.id IS NULL
    `;
    const orphanCount = Number(orphanPosts[0]?.c || 0);
    if (orphanCount === 0) ok('WallPost : zéro post orphelin (auteur supprimé)');
    else fail(`WallPost : ${orphanCount} posts orphelins`);

    // Stories count
    try {
      const storyCount = await (db as any).story.count();
      ok(`Story : ${storyCount} stories en BDD`);
    } catch { /* table may not exist */ }

  } catch { warn('Social DB : vérification impossible (pas de connexion)'); }
}

// ══════════════════════════════════════════════════════════════
// SECTION 6: TBL (TreeBranchLeaf)
// ══════════════════════════════════════════════════════════════
async function auditTbl() {
  startSection('TreeBranchLeaf (Formulaires)', '🌳');

  try {
    const { db } = await import('../../src/lib/database');

    // 6a. Trees count
    const treeCount = await db.treeBranchLeafTree.count();
    ok(`Trees : ${treeCount} arbres en BDD`);

    // 6b. Nodes count
    const nodeCount = await db.treeBranchLeafNode.count();
    ok(`Nodes : ${nodeCount} nœuds en BDD`);

    // 6c. Submissions count
    const subCount = await db.treeBranchLeafSubmission.count();
    ok(`Submissions : ${subCount} soumissions`);

    // 6d. Formulas with empty tokens
    const allFormulas = await db.treeBranchLeafNodeFormula.count();
    const emptyFormulas = await db.treeBranchLeafNodeFormula.findMany({
      where: { tokens: { equals: [] } },
      select: { id: true },
    });
    if (emptyFormulas.length === 0) ok(`Formulas : ${allFormulas} formules, zéro tokens vides`);
    else warn(`Formulas : ${emptyFormulas.length}/${allFormulas} avec tokens vides`);

    // 6e. SelectConfigs with table reference
    const selectConfigs = await db.treeBranchLeafSelectConfig.count();
    ok(`SelectConfigs : ${selectConfigs} configurations`);

    // 6f. Variables count
    const varCount = await db.treeBranchLeafNodeVariable.count();
    ok(`Variables : ${varCount} variables`);

    // 6g. Orphan nodes (tree doesn't exist)
    const orphanNodes: any[] = await db.$queryRaw`
      SELECT COUNT(*) as c FROM "TreeBranchLeafNode" n
      LEFT JOIN "TreeBranchLeafTree" t ON n."treeId" = t.id
      WHERE t.id IS NULL
    `;
    const orphanNodeCount = Number(orphanNodes[0]?.c || 0);
    if (orphanNodeCount === 0) ok('Nodes : zéro orphelin (tree supprimé)');
    else warn(`Nodes : ${orphanNodeCount} orphelins (tree supprimé)`);

    // 6h. Tables count
    const tableCount = await db.treeBranchLeafNodeTable.count();
    ok(`Tables : ${tableCount} tables TBL`);

    // 6i. Views (tables with sourceTableId)
    const viewCount = await db.treeBranchLeafNodeTable.count({ where: { sourceTableId: { not: null } } });
    ok(`Views : ${viewCount} tables VIEW`);

    // 6j. Nodes with hasTable but no table_activeId
    const brokenTableNodes = await db.treeBranchLeafNode.count({
      where: { hasTable: true, table_activeId: null }
    });
    if (brokenTableNodes === 0) ok('Nodes hasTable : tous ont un table_activeId');
    else warn(`Nodes hasTable : ${brokenTableNodes} sans table_activeId`);

  } catch (e) {
    fail('TBL : vérification échouée', String(e));
  }

  // 6k. Code checks
  const tblRouteFiles = grepFiles(
    /new PrismaClient/,
    path.join(SRC, 'routes'),
    ['.ts']
  ).filter(h => h.file.includes('tbl') || h.file.includes('treebranchleaf'));
  if (tblRouteFiles.length === 0) ok('TBL routes : zéro new PrismaClient()');
  else tblRouteFiles.forEach(h => fail(`new PrismaClient: ${h.file}:${h.line}`));
}

// ══════════════════════════════════════════════════════════════
// SECTION 7: GOOGLE INTEGRATIONS
// ══════════════════════════════════════════════════════════════
async function auditGoogle() {
  startSection('Intégrations Google', '🔗');

  // 7a. Google config in DB
  try {
    const { db } = await import('../../src/lib/database');

    const configs = await db.googleWorkspaceConfig.findMany({
      select: { id: true, organizationId: true, domain: true, isActive: true, clientId: true },
    });
    if (configs.length > 0) {
      ok(`GoogleWorkspaceConfig : ${configs.length} configuration(s)`);
      for (const c of configs) {
        if (c.clientId) ok(`  Org ${c.organizationId.slice(0, 12)}... : clientId présent, active=${c.isActive}`);
        else warn(`  Org ${c.organizationId.slice(0, 12)}... : clientId manquant`);
      }
    } else {
      warn('GoogleWorkspaceConfig : aucune configuration');
    }

    // 7b. Google tokens
    const tokenCount = await db.googleToken.count();
    ok(`GoogleTokens : ${tokenCount} tokens en BDD`);

    // Expired tokens (refresh token null)
    const noRefresh = await db.googleToken.count({ where: { refreshToken: null } });
    if (noRefresh === 0) ok('GoogleTokens : tous ont un refreshToken');
    else warn(`GoogleTokens : ${noRefresh} sans refreshToken`);

  } catch { warn('Google DB : vérification impossible'); }

  // 7c. Google auth files exist
  const googleFiles = [
    'google-auth/core/GoogleAuthManager.ts',
    'google-auth/core/GoogleOAuthCore.ts',
    'google-auth/services/GoogleCalendarService.ts',
    'google-auth/services/GoogleDriveService.ts',
    'google-auth/services/GoogleGmailService.ts',
  ];
  for (const f of googleFiles) {
    const src = readSrc(f);
    if (src) ok(`${path.basename(f)} : existe`);
    else warn(`${path.basename(f)} : manquant`);
  }

  // 7d. No hardcoded Google credentials
  const googleCreds = grepFiles(
    /(?:client_id|client_secret|api_key)\s*[:=]\s*['"][A-Za-z0-9_-]{20,}['"]/,
    path.join(SRC, 'google-auth'),
    ['.ts']
  );
  if (googleCreds.length === 0) ok('Google auth : zéro credential hardcodé');
  else googleCreds.forEach(h => fail(`Credential hardcodé: ${h.file}:${h.line}`));
}

// ══════════════════════════════════════════════════════════════
// SECTION 8: ZÉRO STOCKAGE LOCAL (tout Google Cloud SQL)
// ══════════════════════════════════════════════════════════════
async function auditDataLocal() {
  startSection('Zéro Stockage Local (Cloud SQL only)', '☁️');

  // 8a. Zéro dépendance base de données locale (SQLite, LevelDB, lowdb, nedb, PouchDB)
  const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
  const allDeps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
  const localDbPackages = ['sqlite3', 'better-sqlite3', 'sql.js', 'leveldb', 'level', 'lowdb', 'nedb', 'pouchdb', 'localforage'];
  const foundLocalDbPkgs = localDbPackages.filter(p => p in allDeps);
  if (foundLocalDbPkgs.length === 0) ok('package.json : zéro dépendance DB locale (sqlite/level/lowdb/nedb/pouch)');
  else foundLocalDbPkgs.forEach(p => fail(`package.json : dépendance DB locale « ${p} »`));

  // 8b. Zéro import de lib DB locale dans le code
  const localDbImports = grepFiles(
    /require\(['"](?:sqlite3|better-sqlite3|sql\.js|leveldb|level|lowdb|nedb|pouchdb|localforage)['"]\)|from\s+['"](?:sqlite3|better-sqlite3|sql\.js|leveldb|level|lowdb|nedb|pouchdb|localforage)['"]/,
    SRC,
    ['.ts', '.tsx']
  );
  if (localDbImports.length === 0) ok('Code : zéro import DB locale');
  else localDbImports.forEach(h => fail(`Import DB locale: ${h.file}:${h.line}`, h.text));

  // 8c. Zéro ORM/client DB alternatif (pg.Pool, knex, typeorm, sequelize, mongoose, mongodb)
  const altOrmHits = grepFiles(
    /new\s+Pool\s*\(|pg\.Pool|require\(['"]pg['"]\)|from\s+['"]pg['"]|require\(['"]knex['"]\)|from\s+['"]knex['"]|require\(['"]typeorm['"]\)|from\s+['"]typeorm['"]|require\(['"]sequelize['"]\)|from\s+['"]sequelize['"]|require\(['"]mongoose['"]\)|from\s+['"]mongoose['"]|require\(['"]mongodb['"]\)|from\s+['"]mongodb['"]/,
    SRC,
    ['.ts', '.tsx'],
    ['node_modules', 'audit', '_deprecated', '_backup', '_OLD']
  ).filter(h => !h.text.includes('type ') && !h.text.includes('interface ') && !h.text.includes("'prisma'"));
  if (altOrmHits.length === 0) ok('Code : zéro ORM/client DB alternatif (pg/knex/typeorm/sequelize/mongoose)');
  else altOrmHits.forEach(h => fail(`ORM alternatif: ${h.file}:${h.line}`, h.text));

  // 8d. Zéro new PrismaClient() hors singleton (vérif globale)
  const prismaNewHits = grepFiles(
    /new PrismaClient/,
    SRC,
    ['.ts', '.tsx'],
    ['node_modules', 'audit']
  ).filter(h =>
    !h.file.includes('lib/database') && // le singleton lui-même
    !h.file.includes('seed')            // scripts de seed
  );
  if (prismaNewHits.length === 0) ok('Code : zéro new PrismaClient() hors singleton');
  else prismaNewHits.forEach(h => fail(`new PrismaClient: ${h.file}:${h.line}`, h.text));

  // 8e. Zéro IndexedDB / openDatabase dans le code
  const indexedDbHits = grepFiles(
    /indexedDB\.open|openDatabase\s*\(|window\.indexedDB/,
    SRC,
    ['.ts', '.tsx'],
    ['node_modules']
  );
  if (indexedDbHits.length === 0) ok('Code : zéro IndexedDB / openDatabase');
  else indexedDbHits.forEach(h => fail(`IndexedDB: ${h.file}:${h.line}`, h.text));

  // 8f. Zéro localStorage pour données métier (excluant debug flags, auth token, OAuth flow)
  const debugKeys = /DEBUG_VERBOSE|DEBUG_ALLOW|DEBUG_NS|DEBUG_DEDUP_MS|DEBUG_TS|TBL_DEBUG|TBL_DIAG|TBL_SMART_DEBUG|TBL_AUTO_DIAG|USE_FIXED_HIERARCHY|TBL_DEBUG_DELETE|apiLogLevel/;
  const authKeys = /\btoken\b|organizationId|role|google_oauth_pending|google_oauth_org_id|impersonationToken|auth_token/;
  const allLocalStorageHits = grepFiles(
    /localStorage\.\s*(?:setItem|getItem|removeItem)\s*\(/,
    SRC,
    ['.ts', '.tsx'],
    ['node_modules', '_deprecated', '_backup', '_OLD', '_ORIGINAL', '.backup', '.disabled', 'audit', 'Old']
  ).filter(h =>
    !debugKeys.test(h.text) &&
    !authKeys.test(h.text) &&
    !h.file.includes('utils/debug') &&
    !h.file.includes('utils/consoleFilter') &&
    !h.file.includes('utils/tblDebug') &&
    !h.file.includes('auth/authUtils') &&
    !h.file.includes('auth/AuthProvider') &&
    !h.file.includes('store/slices/api') &&
    !h.file.includes('GoogleWorkspaceConfig') &&
    !h.file.includes('GoogleAuthCallback') &&
    !h.file.includes('googleAuthReset') &&
    !h.file.includes('useAuthenticatedApi') &&
    !h.file.includes('utils/api') &&
    !h.file.includes('utils/validationHelper')
  );
  if (allLocalStorageHits.length === 0) ok('Code : zéro localStorage pour données métier');
  else {
    warn(`Code : ${allLocalStorageHits.length} usages localStorage pour données métier`);
    allLocalStorageHits.forEach(h => console.log(`     → ${h.file}:${h.line} — ${h.text.slice(0, 100)}`));
  }

  // 8g. Zéro sessionStorage pour données métier (excluant OAuth flow, impersonation)
  const oauthSessionKeys = /google_auth_just_completed|google_auth_error|impersonatedUserId|impersonatedOrgId/;
  const allSessionStorageHits = grepFiles(
    /sessionStorage\.\s*(?:setItem|getItem|removeItem)\s*\(/,
    SRC,
    ['.ts', '.tsx'],
    ['node_modules', '_deprecated', '_backup', '_OLD', '_ORIGINAL', '.backup', '.disabled', 'audit', 'Old']
  ).filter(h =>
    !oauthSessionKeys.test(h.text) &&
    !h.file.includes('GoogleAuthCallback') &&
    !h.file.includes('googleAuthReset') &&
    !h.file.includes('auth/AuthProvider')
  );
  if (allSessionStorageHits.length === 0) ok('Code : zéro sessionStorage pour données métier');
  else {
    warn(`Code : ${allSessionStorageHits.length} usages sessionStorage pour données métier`);
    allSessionStorageHits.forEach(h => console.log(`     → ${h.file}:${h.line} — ${h.text.slice(0, 100)}`));
  }

  // 8h. DATABASE_URL pointe vers Cloud SQL (pas sqlite, pas localhost)
  // En dev, DATABASE_URL est dans .env — on le lit manuellement si non défini
  let dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl) {
    const envPath = path.join(ROOT, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const match = envContent.match(/^DATABASE_URL\s*=\s*["']?([^"'\n]+)/m);
      if (match) dbUrl = match[1];
    }
  }
  if (!dbUrl) {
    warn('DATABASE_URL : variable non définie et pas de .env');
  } else if (dbUrl.includes('sqlite')) {
    fail('DATABASE_URL : pointe vers SQLite !', dbUrl.slice(0, 40));
  } else if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    ok('DATABASE_URL : PostgreSQL (Cloud SQL)');
  } else {
    warn('DATABASE_URL : type non reconnu', dbUrl.slice(0, 40));
  }

  // 8i. Prisma schema utilise postgresql
  const schemaPath = path.join(ROOT, 'prisma', 'schema.prisma');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    if (schema.includes('provider = "postgresql"') || schema.includes("provider = 'postgresql'")) {
      ok('schema.prisma : provider = postgresql');
    } else if (schema.includes('sqlite')) {
      fail('schema.prisma : provider = sqlite !');
    } else {
      warn('schema.prisma : provider non reconnu');
    }
  } else {
    fail('schema.prisma : fichier non trouvé');
  }

  // 8j. Zéro cache serveur en mémoire (Map avec TTL) dans les routes/middleware/services
  // Patterns détectés : new Map<...>() avec TTL/expiry/timestamp dans un fichier serveur
  const serverCacheHits = grepFiles(
    /\bnew Map<.*(?:Cache|Expir|TTL|timestamp)/i,
    path.join(SRC, 'routes'),
    ['.ts'],
    []
  ).concat(
    grepFiles(
      /\bnew Map<.*(?:Cache|Expir|TTL|timestamp)/i,
      path.join(SRC, 'middleware'),
      ['.ts'],
      []
    ),
    grepFiles(
      /\bnew Map<.*(?:Cache|Expir|TTL|timestamp)/i,
      path.join(SRC, 'services'),
      ['.ts'],
      []
    )
  );
  if (serverCacheHits.length === 0) {
    ok('Zéro cache serveur en mémoire (routes/middleware/services)');
  } else {
    fail(`${serverCacheHits.length} cache(s) serveur détecté(s)`, serverCacheHits.map(h => `${h.file}:${h.line}`).join(', '));
  }

  // 8k. Zéro CACHE_TTL constantes dans le code serveur (routes/middleware/services)
  const serverDirs = ['routes', 'middleware', 'services'];
  const ttlConstHits: { file: string; line: number; text: string }[] = [];
  for (const dir of serverDirs) {
    ttlConstHits.push(...grepFiles(
      /\b(CACHE_TTL|PDF_CACHE_TTL|TRIGGER_INDEX_CACHE_TTL|EXCLUDED_NODES_CACHE_TTL)\b/,
      path.join(SRC, dir),
      ['.ts'],
      []
    ));
  }
  // Also check top-level src/*.ts server files
  ttlConstHits.push(...grepFiles(
    /\b(CACHE_TTL|PDF_CACHE_TTL|TRIGGER_INDEX_CACHE_TTL|EXCLUDED_NODES_CACHE_TTL)\b/,
    SRC,
    ['.ts'],
    ['components', 'pages', 'hooks', 'contexts', 'auth', 'store', 'node_modules', 'dist']
  ));
  if (ttlConstHits.length === 0) {
    ok('Zéro constante CACHE_TTL dans le code serveur');
  } else {
    fail(`${ttlConstHits.length} constante(s) CACHE_TTL trouvée(s)`, ttlConstHits.map(h => `${h.file}:${h.line}`).join(', '));
  }

  // 8l. Zéro dépendance Redis/Memcached dans package.json
  const pkgJsonPath = path.join(ROOT, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    const pkg = fs.readFileSync(pkgJsonPath, 'utf-8');
    const cacheDepHits = ['redis', 'ioredis', 'memcached', 'memcachier', 'node-cache', 'lru-cache'].filter(dep => pkg.includes(`"${dep}"`));
    if (cacheDepHits.length === 0) {
      ok('Zéro dépendance cache (Redis/Memcached/lru-cache)');
    } else {
      fail(`Dépendance(s) cache détectée(s)`, cacheDepHits.join(', '));
    }
  }
}

// ══════════════════════════════════════════════════════════════
// RUNNER
// ══════════════════════════════════════════════════════════════
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║   🐝 ZHIIVE — AUDIT GLOBAL UNIFIÉ                              ║');
  console.log(`║   📅 ${new Date().toISOString().slice(0, 19).replace('T', ' ')}                               ║`);
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  const sections: Record<string, () => Promise<void>> = {
    storage:  auditStorage,
    database: auditDatabase,
    api:      auditApi,
    security: auditSecurity,
    social:   auditSocial,
    tbl:      auditTbl,
    google:   auditGoogle,
    dataloc:  auditDataLocal,
  };

  if (sectionArg === 'all') {
    for (const [name, fn] of Object.entries(sections)) {
      await fn();
    }
  } else if (sections[sectionArg]) {
    await sections[sectionArg]();
  } else {
    console.error(`Section inconnue: ${sectionArg}. Disponibles: ${Object.keys(sections).join(', ')}, all`);
    process.exit(2);
  }

  // ── Summary ───────────────────────────────────────────────
  console.log('\n\n' + '═'.repeat(60));
  console.log('📊 RÉSUMÉ PAR SECTION');
  console.log('═'.repeat(60));

  for (const [name, r] of Object.entries(sectionResults)) {
    const icon = r.failed > 0 ? '🔴' : r.warnings > 0 ? '🟡' : '🟢';
    console.log(`  ${icon} ${name.padEnd(20)} ${r.passed} ✅  ${r.failed} ❌  ${r.warnings} ⚠️`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`  TOTAL : ${passed} ✅  ${failed} ❌  ${warnings} ⚠️`);

  if (failed === 0) {
    console.log('  🎉 AUDIT RÉUSSI — Système Zhiive opérationnel');
  } else {
    console.log('  🚨 AUDIT ÉCHOUÉ — Corrections nécessaires');
  }
  console.log('═'.repeat(60) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(2);
});
