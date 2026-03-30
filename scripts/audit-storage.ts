#!/usr/bin/env npx tsx
/**
 * 🔍 AUDIT COMPLET DU SYSTÈME DE STOCKAGE — Zhiive
 *
 * Vérifie que tout le stockage est 100% GCS :
 *   - Zéro stockage local
 *   - Zéro cache
 *   - Zéro fallback
 *   - Zéro URL relative /uploads/ en base de données
 *   - Upload/Fetch/Delete GCS fonctionnels
 *
 * Usage :  env -u GOOGLE_APPLICATION_CREDENTIALS npx tsx scripts/audit-storage.ts
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

let passed = 0;
let failed = 0;
let warnings = 0;

function ok(label: string) {
  console.log(`  ✅ ${label}`);
  passed++;
}
function fail(label: string, detail?: string) {
  console.log(`  ❌ ${label}`);
  if (detail) console.log(`     → ${detail}`);
  failed++;
}
function warn(label: string, detail?: string) {
  console.log(`  ⚠️  ${label}`);
  if (detail) console.log(`     → ${detail}`);
  warnings++;
}

function grepFiles(pattern: RegExp, dir: string, extensions: string[]): { file: string; line: number; text: string }[] {
  const hits: { file: string; line: number; text: string }[] = [];
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', '.git', 'dist', '.next'].includes(entry.name)) continue;
        walk(full);
      } else if (extensions.some(e => entry.name.endsWith(e))) {
        const lines = fs.readFileSync(full, 'utf-8').split('\n');
        lines.forEach((txt, i) => {
          if (pattern.test(txt) && !txt.trim().startsWith('//') && !txt.trim().startsWith('*')) {
            hits.push({ file: path.relative(ROOT, full), line: i + 1, text: txt.trim() });
          }
        });
      }
    }
  };
  walk(dir);
  return hits;
}

// ─────────────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║   🔍 AUDIT STOCKAGE — Zhiive (100% GCS)        ║');
console.log('╚══════════════════════════════════════════════════╝\n');

// ── 1. storage.ts ────────────────────────────────────────────
console.log('━━━ 1. Vérification storage.ts ━━━');
const storageSrc = fs.readFileSync(path.join(SRC, 'lib', 'storage.ts'), 'utf-8');

if (!storageSrc.includes('uploadToLocal'))    ok('Pas de uploadToLocal()');
else fail('uploadToLocal() encore présent dans storage.ts');

if (!storageSrc.includes('express.static'))   ok('Pas de express.static');
else fail('express.static encore dans storage.ts');

// Check actual code lines (not comments) for public: true
const storageCodeLines = storageSrc.split('\n').filter(l => {
  const t = l.trim();
  return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
});
const storageCodeOnly = storageCodeLines.join('\n');

if (!storageCodeOnly.includes("public: true"))     ok('Pas de public: true (uniform bucket-level access)');
else fail('public: true trouvé dans storage.ts — cause erreur ACL');

if (storageSrc.includes("cacheControl: 'no-cache'")) ok("cacheControl: 'no-cache' configuré");
else fail("cacheControl: 'no-cache' manquant dans storage.ts");

if (storageSrc.includes('max-age'))           fail('max-age trouvé dans storage.ts — devrait être no-cache');
else ok('Pas de max-age dans storage.ts');

if (storageSrc.includes('GcloudAuth'))        ok('GcloudAuth custom auth client présent');
else fail('GcloudAuth manquant — auth dev cassée');

if (storageSrc.includes('GOOGLE_APPLICATION_CREDENTIALS: undefined'))
  ok('GOOGLE_APPLICATION_CREDENTIALS bypassed en dev');
else warn('Bypass GOOGLE_APPLICATION_CREDENTIALS non trouvé');

// ── 2. api-server-clean.ts /uploads ──────────────────────────
console.log('\n━━━ 2. Vérification api-server-clean.ts /uploads ━━━');
const apiSrc = fs.readFileSync(path.join(SRC, 'api-server-clean.ts'), 'utf-8');

// Should redirect to GCS, not serve locally
const uploadsSection = apiSrc.split('\n').filter(l => l.includes("/uploads") || l.includes("'/uploads'"));
const hasStaticUploads = uploadsSection.some(l => l.includes('express.static'));
const hasGcsRedirect = apiSrc.includes('storage.googleapis.com') && apiSrc.includes("app.use('/uploads'");

if (hasGcsRedirect)       ok('/uploads redirige vers GCS');
else fail('/uploads ne redirige pas vers GCS');

if (!hasStaticUploads)    ok('Pas de express.static pour /uploads');
else fail('express.static pour /uploads encore présent');

// ── 3. Code source : zéro stockage local ─────────────────────
console.log('\n━━━ 3. Recherche résidus stockage local dans src/ ━━━');

// Check for local upload writes (fs.writeFile + uploads) — exclude old api-server.ts
const localWrites = grepFiles(
  /fs\.(writeFile|mkdirSync|mkdir).*uploads/,
  SRC,
  ['.ts', '.tsx']
).filter(h => !h.file.includes('api-server.ts')); // old server, not active
if (localWrites.length === 0) {
  ok('Aucun fs.writeFile/mkdir vers uploads/ trouvé');
} else {
  for (const h of localWrites) {
    fail(`Écriture locale résiduelle: ${h.file}:${h.line}`, h.text);
  }
}

// Check for multer.diskStorage
const diskStorageHits = grepFiles(
  /multer\.diskStorage/,
  SRC,
  ['.ts', '.tsx']
);
if (diskStorageHits.length === 0) {
  ok('Aucun multer.diskStorage trouvé');
} else {
  for (const h of diskStorageHits) {
    fail(`multer.diskStorage résiduel: ${h.file}:${h.line}`, h.text);
  }
}

// Check for paths returning /uploads/ URLs to clients
const localUrlReturns = grepFiles(
  /(?:fileUrl|url|imageUrl)\s*[:=]\s*[`'"]\/uploads\//,
  SRC,
  ['.ts', '.tsx']
);
if (localUrlReturns.length === 0) {
  ok('Aucune URL /uploads/... retournée au client');
} else {
  for (const h of localUrlReturns) {
    fail(`URL locale retournée: ${h.file}:${h.line}`, h.text);
  }
}

// Check for public: true in GCS calls
const publicTrueInRoutes = grepFiles(
  /public:\s*true/,
  path.join(SRC, 'routes'),
  ['.ts']
).filter(h => !h.text.includes('isPublic'));  // ignore Prisma field
const publicTrueInLib = grepFiles(
  /public:\s*true/,
  path.join(SRC, 'lib'),
  ['.ts']
);
const publicTrueAll = [...publicTrueInRoutes, ...publicTrueInLib];
if (publicTrueAll.length === 0) {
  ok('Aucun public: true dans les upload GCS');
} else {
  for (const h of publicTrueAll) {
    fail(`public: true résiduel: ${h.file}:${h.line}`, h.text);
  }
}

// Check for fs.readFileSync/existsSync with 'public/uploads' (local reads for content)
const localReads = grepFiles(
  /(?:readFileSync|existsSync|readFile)\(.*(?:public.*uploads|uploads\/)/,
  SRC,
  ['.ts', '.tsx']
).filter(h =>
  !h.file.includes('audit-storage') // exclude this script
);
if (localReads.length === 0) {
  ok('Aucune lecture locale de fichiers uploads');
} else {
  for (const h of localReads) {
    warn(`Lecture locale résiduelle: ${h.file}:${h.line}`, h.text);
  }
}

// ── 4. Base de données : URLs locales ─────────────────────────
console.log('\n━━━ 4. Vérification base de données ━━━');

async function checkDatabase() {
  try {
    // Dynamic import to avoid loading Prisma at module level
    const { db } = await import('../src/lib/database');

    // Tables with URL fields that could contain /uploads/ paths
    const checks: { model: string; field: string; query: () => Promise<any[]> }[] = [
      {
        model: 'User',
        field: 'avatarUrl',
        query: () => db.user.findMany({
          where: { avatarUrl: { startsWith: '/uploads/' } },
          select: { id: true, avatarUrl: true },
        }),
      },
      {
        model: 'Organization',
        field: 'logoUrl',
        query: () => db.organization.findMany({
          where: { logoUrl: { startsWith: '/uploads/' } },
          select: { id: true, logoUrl: true },
        }),
      },
      {
        model: 'Organization',
        field: 'coverUrl',
        query: () => db.organization.findMany({
          where: { coverUrl: { startsWith: '/uploads/' } },
          select: { id: true, coverUrl: true },
        }),
      },
    ];

    // WallPost.mediaUrls is a Json field — use raw SQL
    try {
      const wallLocalUrls: any[] = await db.$queryRaw`
        SELECT id, "mediaUrls"::text FROM "WallPost"
        WHERE "mediaUrls"::text LIKE '%/uploads/%'
      `;
      if (wallLocalUrls.length === 0) {
        ok('WallPost.mediaUrls : aucune URL locale');
      } else {
        fail(`WallPost.mediaUrls : ${wallLocalUrls.length} posts avec URLs locales`);
        for (const r of wallLocalUrls.slice(0, 5)) {
          console.log(`     → id=${r.id}`);
        }
      }
    } catch {
      warn('WallPost.mediaUrls : impossible de vérifier (champ Json)');
    }

    // Check WebSiteMediaFile if it exists
    try {
      const websiteMediaLocal = await (db as any).webSiteMediaFile.findMany({
        where: {
          OR: [
            { fileUrl: { startsWith: '/uploads/' } },
            { filePath: { startsWith: '/uploads/' } },
          ],
        },
        select: { id: true, fileUrl: true, filePath: true },
      });
      if (websiteMediaLocal.length === 0) {
        ok('WebSiteMediaFile : aucune URL locale (fileUrl, filePath)');
      } else {
        fail(`WebSiteMediaFile : ${websiteMediaLocal.length} URLs locales trouvées`);
        for (const r of websiteMediaLocal.slice(0, 5)) {
          console.log(`     → id=${r.id} fileUrl=${r.fileUrl} filePath=${r.filePath}`);
        }
      }
    } catch {
      warn('WebSiteMediaFile : table non accessible (peut ne pas exister)');
    }

    for (const { model, field, query } of checks) {
      const results = await query();
      if (results.length === 0) {
        ok(`${model}.${field} : aucune URL locale`);
      } else {
        fail(`${model}.${field} : ${results.length} URLs locales trouvées !`);
        for (const r of results.slice(0, 5)) {
          console.log(`     → id=${r.id} ${field}=${(r as any)[field]}`);
        }
      }
    }

    // Check for chantier documents
    try {
      const chantierDocs = await (db as any).chantierDocument.findMany({
        where: { documentUrl: { startsWith: '/uploads/' } },
        select: { id: true, documentUrl: true },
      });
      if (chantierDocs.length === 0) {
        ok('ChantierDocument.documentUrl : aucune URL locale');
      } else {
        fail(`ChantierDocument.documentUrl : ${chantierDocs.length} URLs locales`);
      }
    } catch {
      // Table may not exist
    }

    // Check product documents (localPath field)
    try {
      const prodDocs = await (db as any).productDocument.findMany({
        where: { localPath: { startsWith: '/uploads/' } },
        select: { id: true, localPath: true },
      });
      if (prodDocs.length === 0) {
        ok('ProductDocument.localPath : aucune URL locale');
      } else {
        fail(`ProductDocument.localPath : ${prodDocs.length} URLs locales`);
      }
    } catch {
      // Table may not exist
    }
  } catch (error) {
    fail('Connexion base de données échouée', String(error));
  }
}

// ── 5. GCS Upload/Fetch/Delete live test ─────────────────────
console.log('\n━━━ 5. Test GCS live : Upload → Fetch → Delete ━━━');

async function testGcsLive() {
  try {
    const { uploadFile, deleteFile } = await import('../src/lib/storage');

    const testKey = `_audit_test_${Date.now()}.txt`;
    const testContent = `Audit Zhiive storage — ${new Date().toISOString()}`;
    const buffer = Buffer.from(testContent);

    // Upload
    const url = await uploadFile(buffer, testKey, 'text/plain');
    if (url.startsWith('https://storage.googleapis.com/')) {
      ok(`Upload OK → URL absolue GCS`);
    } else {
      fail(`Upload retourne URL non-GCS: ${url}`);
    }

    // Fetch
    const resp = await fetch(url);
    if (resp.status === 200) {
      const body = await resp.text();
      if (body === testContent) {
        ok('Fetch OK → contenu identique');
      } else {
        fail('Fetch OK mais contenu différent');
      }
    } else {
      fail(`Fetch échoué: HTTP ${resp.status}`);
    }

    // Check response headers for no-cache
    const cacheHeader = resp.headers.get('cache-control');
    if (cacheHeader && cacheHeader.includes('no-cache')) {
      ok(`Cache-Control: ${cacheHeader}`);
    } else {
      warn(`Cache-Control inattendu: ${cacheHeader || '(absent)'}`);
    }

    // Delete
    await deleteFile(url);
    const resp2 = await fetch(url);
    if (resp2.status === 404 || resp2.status === 403) {
      ok('Delete OK → fichier supprimé de GCS');
    } else {
      warn(`Delete: fichier encore accessible (HTTP ${resp2.status}) — propagation peut prendre du temps`);
    }

  } catch (error) {
    fail('Test GCS live échoué', String(error));
  }
}

// ── 6. Vérification imports storage.ts ────────────────────────
console.log('\n━━━ 6. Vérification des consommateurs de storage.ts ━━━');

const storageImports = grepFiles(
  /from\s+['"](?:\.\.\/|\.\/|@\/)lib\/storage['"]/,
  SRC,
  ['.ts', '.tsx']
);

const importers = [...new Set(storageImports.map(h => h.file))];
console.log(`  📦 ${importers.length} fichiers importent depuis lib/storage :`);
for (const f of importers) {
  console.log(`     - ${f}`);
}
ok(`${importers.length} consommateurs identifiés`);

// ── Exécution async ──────────────────────────────────────────
async function runAudit() {
  await checkDatabase();
  await testGcsLive();

  // ── Résumé ─────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log(`║   RÉSULTAT : ${passed} ✅  ${failed} ❌  ${warnings} ⚠️`);
  if (failed === 0) {
    console.log('║   🎉 AUDIT RÉUSSI — Stockage 100% GCS           ║');
  } else {
    console.log('║   🚨 AUDIT ÉCHOUÉ — Corrections nécessaires      ║');
  }
  console.log('╚══════════════════════════════════════════════════╝\n');

  process.exit(failed > 0 ? 1 : 0);
}

runAudit().catch(err => {
  console.error('Fatal:', err);
  process.exit(2);
});
