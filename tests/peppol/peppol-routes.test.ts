#!/usr/bin/env npx tsx
/**
 * Tests — Routes API Peppol
 *
 * Vérifie la structure des routes, la sécurité (auth, validation),
 * l'isolation par organisation et les conventions Zhiive.
 *
 * Usage:
 *   npx tsx tests/peppol/peppol-routes.test.ts
 */

import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src');

let passed = 0;
let failed = 0;
let warnings = 0;

function ok(label: string) {
  passed++;
  console.log(`  ✅ ${label}`);
}
function fail(label: string, detail?: string) {
  failed++;
  console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
}
function warn(label: string, detail?: string) {
  warnings++;
  console.log(`  ⚠️  ${label}${detail ? ` — ${detail}` : ''}`);
}

console.log('\n🔌 TEST — Routes API Peppol (structure & sécurité)\n');

// ── Lire le fichier ──
const routesPath = path.join(SRC, 'routes', 'peppol.ts');
const src = fs.existsSync(routesPath) ? fs.readFileSync(routesPath, 'utf-8') : '';

if (!src) { fail('routes/peppol.ts manquant'); process.exit(1); }
ok('routes/peppol.ts existe');

const lines = src.split('\n');
const codeLines = lines.filter(l => {
  const t = l.trim();
  return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
});

// ══════════════════════════════════════════════════
// 1. IMPORTS & DÉPENDANCES
// ══════════════════════════════════════════════════
console.log('\n  ── Imports ──');

if (src.includes("from '../lib/database'") || src.includes("from '@/lib/database'"))
  ok('Import : db depuis lib/database (singleton)');
else fail('Import : db non importé depuis lib/database');

if (!src.includes('new PrismaClient'))
  ok('Import : zéro new PrismaClient()');
else fail('Import : new PrismaClient() trouvé');

if (src.includes("from '../middleware/auth'") || src.includes("from '@/middleware/auth'"))
  ok('Import : middleware auth importé');
else fail('Import : middleware auth non importé');

if (src.includes("from 'zod'") || src.includes("from \"zod\""))
  ok('Import : Zod pour validation');
else warn('Import : Zod non importé');

if (src.includes("from '../services/peppolBridge'") || src.includes("from '@/services/peppolBridge'"))
  ok('Import : peppolBridge importé');
else fail('Import : peppolBridge non importé');

// ══════════════════════════════════════════════════
// 2. SÉCURITÉ AUTH
// ══════════════════════════════════════════════════
console.log('\n  ── Sécurité Auth ──');

// Parse all route definitions
const routeDefRegex = /router\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/g;
const routeDefs: Array<{ method: string; path: string; line: number; lineText: string }> = [];
for (let i = 0; i < lines.length; i++) {
  const m = routeDefRegex.exec(lines[i]);
  if (m) {
    routeDefs.push({ method: m[1], path: m[2], line: i + 1, lineText: lines[i] });
  }
  routeDefRegex.lastIndex = 0;
}

ok(`${routeDefs.length} endpoints définis`);

// Every route must use authenticateToken
let unprotectedCount = 0;
for (const r of routeDefs) {
  if (!r.lineText.includes('authenticateToken')) {
    fail(`Route NON PROTÉGÉE : ${r.method.toUpperCase()} ${r.path} (ligne ${r.line})`);
    unprotectedCount++;
  }
}
if (unprotectedCount === 0) ok('Toutes les routes utilisent authenticateToken');

// Mutation routes (POST, PUT, DELETE) should use isAdmin for sensitive operations
const mutationRoutes = routeDefs.filter(r => ['post', 'put', 'delete', 'patch'].includes(r.method));
const adminProtected = mutationRoutes.filter(r => r.lineText.includes('isAdmin'));
if (adminProtected.length > 0)
  ok(`${adminProtected.length}/${mutationRoutes.length} routes mutation protégées par isAdmin`);
else warn('Aucune route mutation protégée par isAdmin');

// Specific critical routes that MUST be admin-only
const criticalPaths = ['/register', '/config'];
for (const cp of criticalPaths) {
  const route = routeDefs.find(r => r.path === cp && ['post', 'put'].includes(r.method));
  if (route) {
    if (route.lineText.includes('isAdmin'))
      ok(`${route.method.toUpperCase()} ${cp} : protégé par isAdmin`);
    else fail(`${route.method.toUpperCase()} ${cp} : DOIT être protégé par isAdmin`);
  }
}

// ══════════════════════════════════════════════════
// 3. ISOLATION PAR ORGANISATION
// ══════════════════════════════════════════════════
console.log('\n  ── Isolation Organisation ──');

if (src.includes('x-organization-id') || src.includes('getOrganizationId'))
  ok('Isolation org : utilise header x-organization-id');
else fail('Isolation org : x-organization-id non trouvé');

// Check that org ID is validated in routes
const orgIdCheckPattern = /if\s*\(\s*!organizationId\s*\)/;
const orgChecks = lines.filter(l => orgIdCheckPattern.test(l));
if (orgChecks.length >= 3)
  ok(`Isolation org : ${orgChecks.length} routes vérifient organizationId`);
else warn(`Isolation org : seulement ${orgChecks.length} vérifications organizationId`);

// ══════════════════════════════════════════════════
// 4. VALIDATION DES ENTRÉES (Zod)
// ══════════════════════════════════════════════════
console.log('\n  ── Validation Entrées ──');

const zodSchemas = src.match(/(?:const|let)\s+\w+Schema\s*=\s*z\.object/g) || [];
ok(`${zodSchemas.length} schéma(s) Zod défini(s)`);

// Check specific schemas
if (src.includes('configSchema'))     ok('Schéma : configSchema (PUT /config)');
else warn('Schéma : configSchema manquant');

if (src.includes('sendInvoiceSchema') || src.includes('z.object') && src.includes('partnerVat'))
  ok('Schéma : sendInvoiceSchema (POST /send)');
else warn('Schéma : validation envoi facture manquante');

// Check .parse() or .safeParse() usage
const parseUsages = (src.match(/\.parse\(|\.safeParse\(/g) || []).length;
if (parseUsages >= 2) ok(`Validation : ${parseUsages} appels .parse()/.safeParse()`);
else warn(`Validation : seulement ${parseUsages} appels .parse()/.safeParse()`);

// ══════════════════════════════════════════════════
// 5. COMPLÉTUDE DES ENDPOINTS
// ══════════════════════════════════════════════════
console.log('\n  ── Complétude Endpoints ──');

const expectedEndpoints = [
  { method: 'get',  path: '/config',           label: 'Récupérer config' },
  { method: 'put',  path: '/config',           label: 'Mettre à jour config' },
  { method: 'post', path: '/register',         label: 'Enregistrer Peppol' },
  { method: 'get',  path: '/status',           label: 'Statut enregistrement' },
  { method: 'post', path: '/send/:invoiceId',  label: 'Envoyer facture' },
  { method: 'get',  path: '/send/:invoiceId/status', label: 'Statut envoi' },
  { method: 'post', path: '/fetch-incoming',   label: 'Déclencher réception' },
  { method: 'get',  path: '/incoming',         label: 'Lister entrantes' },
  { method: 'put',  path: '/incoming/:id',     label: 'Mettre à jour entrante' },
  { method: 'post', path: '/verify-endpoint',  label: 'Vérifier endpoint' },
  { method: 'get',  path: '/health',           label: 'Health check Odoo' },
];

let foundCount = 0;
for (const ep of expectedEndpoints) {
  const found = routeDefs.some(r =>
    r.method === ep.method &&
    (r.path === ep.path || r.path.replace(/:[a-zA-Z]+/g, ':param') === ep.path.replace(/:[a-zA-Z]+/g, ':param'))
  );
  if (found) { foundCount++; ok(`${ep.method.toUpperCase().padEnd(4)} ${ep.path.padEnd(25)} — ${ep.label}`); }
  else fail(`${ep.method.toUpperCase().padEnd(4)} ${ep.path.padEnd(25)} — ${ep.label} MANQUANT`);
}

// ══════════════════════════════════════════════════
// 6. GESTION D'ERREUR
// ══════════════════════════════════════════════════
console.log('\n  ── Gestion Erreurs ──');

const tryCatchCount = (src.match(/try\s*{/g) || []).length;
const catchCount = (src.match(/catch\s*\(/g) || []).length;
if (tryCatchCount >= 5) ok(`Gestion erreurs : ${tryCatchCount} blocs try/catch`);
else warn(`Gestion erreurs : seulement ${tryCatchCount} blocs try/catch`);

// Check HTTP error codes used
const errorCodes = ['400', '401', '403', '404', '500'];
for (const code of errorCodes) {
  if (src.includes(`.status(${code})`))
    ok(`HTTP ${code} : utilisé`);
}

// ══════════════════════════════════════════════════
// 7. CONVENTIONS ZHIIVE
// ══════════════════════════════════════════════════
console.log('\n  ── Conventions Zhiive ──');

// Response format { success: true/false, ... }
if (src.includes('success: true') && src.includes('success: false'))
  ok('Format réponse : { success: true/false } uniforme');
else warn('Format réponse : vérifier uniformité { success }');

// Export default router
if (src.includes('export default router'))
  ok('Export : export default router');
else fail('Export : export default router manquant');

// No console.log (use proper logging)
const consoleLogCount = codeLines.filter(l => l.includes('console.log(')).length;
const consoleErrorCount = codeLines.filter(l => l.includes('console.error(')).length;
if (consoleLogCount <= 3) ok(`Console : ${consoleLogCount} console.log (acceptable)`);
else warn(`Console : ${consoleLogCount} console.log (réduire, utiliser logger)`);
if (consoleErrorCount > 0) ok(`Console : ${consoleErrorCount} console.error (pour les erreurs)`);

// ── Summary ──
console.log('\n' + '─'.repeat(50));
console.log(`  TOTAL : ${passed} ✅  ${failed} ❌  ${warnings} ⚠️`);
if (failed === 0) console.log('  🎉 Routes Peppol OK');
else console.log('  🚨 Routes Peppol — corrections nécessaires');
console.log('─'.repeat(50) + '\n');

process.exit(failed > 0 ? 1 : 0);
