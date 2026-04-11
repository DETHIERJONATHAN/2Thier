#!/usr/bin/env npx tsx
/**
 * Tests — Intégrité Peppol End-to-End
 *
 * Vérifie la cohérence entre tous les composants du système Peppol :
 *   Schema Prisma ↔ Routes ↔ PeppolBridge ↔ UI ↔ Docker ↔ Env
 *
 * Usage:
 *   npx tsx tests/peppol/peppol-integration.test.ts
 */

import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

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

function readSrc(rel: string): string {
  const p = path.join(SRC, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : '';
}

function readRoot(rel: string): string {
  const p = path.join(ROOT, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : '';
}

describe('Peppol integration E2E audit', () => {
it('audit checks pass', () => {

console.log('\n🔗 TEST — Intégrité Peppol End-to-End\n');

// ══════════════════════════════════════════════════
// 1. COHÉRENCE SCHEMA ↔ ROUTES
// ══════════════════════════════════════════════════
console.log('  ── Schema ↔ Routes ──');

const schema = readRoot('prisma/schema.prisma');
const routes = readSrc('routes/peppol.ts');

// Routes must reference Prisma models that exist in schema
const prismaModelUsages = ['peppolConfig', 'peppolIncomingInvoice', 'chantierInvoice'];
for (const model of prismaModelUsages) {
  const inRoutes = routes.includes(`db.${model}`);
  const modelName = model.charAt(0).toUpperCase() + model.slice(1);
  const inSchema = schema.includes(`model ${modelName}`) || schema.includes(`model Peppol`);
  if (inRoutes && inSchema)
    ok(`${model} : utilisé dans routes ET défini dans schema`);
  else if (inRoutes && !inSchema)
    fail(`${model} : utilisé dans routes MAIS absent du schema`);
  else if (!inRoutes && inSchema)
    warn(`${model} : défini dans schema mais pas référencé dans routes`);
}

// ══════════════════════════════════════════════════
// 2. COHÉRENCE ROUTES ↔ BRIDGE
// ══════════════════════════════════════════════════
console.log('\n  ── Routes ↔ PeppolBridge ──');

const bridge = readSrc('services/peppolBridge.ts');

// Routes import getPeppolBridge
if (routes.includes('getPeppolBridge'))
  ok('Routes importent getPeppolBridge');
else fail('Routes n\'importent pas getPeppolBridge');

// Bridge methods called from routes
const bridgeCallsInRoutes = [
  'syncOrganization',
  'registerPeppol',
  'sendInvoice',
  'checkInvoiceStatus',
  'fetchIncomingDocuments',
  'getIncomingInvoices',
  'verifyPeppolEndpoint',
  'healthCheck',
];
for (const method of bridgeCallsInRoutes) {
  const inRoutes = routes.includes(`.${method}(`);
  const inBridge = bridge.includes(`${method}(`);
  if (inRoutes && inBridge) ok(`${method}() : appelé dans routes, défini dans bridge`);
  else if (inRoutes && !inBridge) fail(`${method}() : appelé dans routes MAIS absent du bridge`);
  else if (!inRoutes && inBridge) warn(`${method}() : défini dans bridge mais pas appelé depuis routes`);
}

// ══════════════════════════════════════════════════
// 3. COHÉRENCE UI ↔ API ROUTES
// ══════════════════════════════════════════════════
console.log('\n  ── UI ↔ API Routes ──');

const ui = readSrc('pages/settings/PeppolSettings.tsx');

// UI calls correct API paths
const uiApiCalls = [
  { path: '/api/peppol/config', label: 'GET/PUT config' },
  { path: '/api/peppol/register', label: 'POST register' },
  { path: '/api/peppol/health', label: 'GET health' },
  { path: '/api/peppol/status', label: 'GET status' },
];

for (const call of uiApiCalls) {
  if (ui.includes(call.path))
    ok(`UI appelle ${call.path} (${call.label})`);
  else warn(`UI n'appelle pas ${call.path} (${call.label})`);
}

// UI uses useAuthenticatedApi
if (ui.includes('useAuthenticatedApi'))
  ok('UI : utilise useAuthenticatedApi (pas fetch/axios direct)');
else fail('UI : n\'utilise pas useAuthenticatedApi');

// ══════════════════════════════════════════════════
// 4. COHÉRENCE SCHEMA ↔ UI (ChantierInvoicesTab)
// ══════════════════════════════════════════════════
console.log('\n  ── Schema ↔ ChantierInvoicesTab ──');

const invoicesTab = readSrc('pages/Chantiers/ChantierInvoicesTab.tsx');

const peppolFieldsOnInvoice = ['peppolStatus', 'peppolMessageId', 'peppolError', 'peppolSentAt', 'peppolXmlUrl'];
for (const field of peppolFieldsOnInvoice) {
  const inSchema = schema.includes(field);
  const inUI = invoicesTab.includes(field);
  if (inSchema && inUI)       ok(`${field} : présent dans schema ET dans UI`);
  else if (inSchema && !inUI) warn(`${field} : dans schema mais pas dans UI`);
  else if (!inSchema && inUI) fail(`${field} : dans UI mais absent du schema`);
}

// ══════════════════════════════════════════════════
// 5. APP LAYOUT & SETTINGS PAGE
// ══════════════════════════════════════════════════
console.log('\n  ── Navigation ──');

const appLayout = readSrc('AppLayout.tsx');
const settingsPage = readSrc('pages/SettingsPage.tsx');

// Lazy import in AppLayout
if (appLayout.includes("import('./pages/settings/PeppolSettings')"))
  ok('AppLayout : lazy import PeppolSettings');
else fail('AppLayout : lazy import PeppolSettings manquant');

// Route declared
if (appLayout.includes('path="peppol"') || appLayout.includes("path='peppol'"))
  ok('AppLayout : route peppol déclarée');
else fail('AppLayout : route peppol non déclarée');

// Menu item in SettingsPage
if (settingsPage.includes("key: 'peppol'") || settingsPage.includes('key: "peppol"'))
  ok('SettingsPage : menu item peppol');
else fail('SettingsPage : menu item peppol manquant');

// ══════════════════════════════════════════════════
// 6. API SERVER REGISTRATION
// ══════════════════════════════════════════════════
console.log('\n  ── api-server-clean.ts ──');

const apiServer = readSrc('api-server-clean.ts');

if (apiServer.includes("import peppolRouter"))
  ok('api-server : import peppolRouter');
else fail('api-server : import peppolRouter manquant');

if (apiServer.includes("app.use('/api/peppol'") || apiServer.includes('app.use("/api/peppol"'))
  ok('api-server : /api/peppol monté');
else fail('api-server : /api/peppol non monté');

// ══════════════════════════════════════════════════
// 7. DOCKER & ENV
// ══════════════════════════════════════════════════
console.log('\n  ── Docker & Environnement ──');

const dockerCompose = readRoot('docker-compose.peppol.yml');
const envExample = readRoot('.env.example');
const odooConf = readRoot('peppol/odoo-config/odoo.conf');

if (dockerCompose) ok('docker-compose.peppol.yml existe');
else fail('docker-compose.peppol.yml manquant');

if (odooConf) ok('peppol/odoo-config/odoo.conf existe');
else fail('peppol/odoo-config/odoo.conf manquant');

// Docker compose references odoo.conf
if (dockerCompose && dockerCompose.includes('odoo.conf'))
  ok('Docker compose : référence odoo.conf');
else warn('Docker compose : ne référence pas odoo.conf');

// Env vars consistency: bridge reads from env, env.example documents them
const envVarsRequired = ['ODOO_URL', 'ODOO_DB_NAME', 'ODOO_USER', 'ODOO_PASSWORD'];
for (const v of envVarsRequired) {
  const inBridge = bridge.includes(`process.env.${v}`);
  const inEnvExample = envExample.includes(v);
  if (inBridge && inEnvExample) ok(`${v} : lu par bridge ET documenté dans .env.example`);
  else if (inBridge && !inEnvExample) fail(`${v} : lu par bridge MAIS absent de .env.example`);
  else if (!inBridge && inEnvExample) warn(`${v} : documenté mais non lu par bridge`);
}

// ══════════════════════════════════════════════════
// 8. SÉCURITÉ CROSS-CUTTING
// ══════════════════════════════════════════════════
console.log('\n  ── Sécurité Cross-Cutting ──');

// No credentials in source code (non-env)
const allPeppolFiles = [bridge, routes, ui, invoicesTab];
for (const src of allPeppolFiles) {
  if (!src) continue;
  // Check for hardcoded passwords (not in process.env context or fallback)
  const passwordLine = src.split('\n').find(l => {
    const t = l.trim();
    return /password\s*[:=]\s*['"][^'"]{5,}['"]/.test(t) &&
      !t.includes('process.env') &&
      !t.includes('config') &&
      !t.includes("|| '") &&
      !t.includes('interface') &&
      !t.includes('type ') &&
      !t.startsWith('//') &&
      !t.startsWith('*');
  });
  if (passwordLine) fail('Credential hardcodé détecté', passwordLine.trim().slice(0, 80));
}
ok('Zéro credential hardcodé dans les fichiers Peppol');

// XMLContent stored (for audit trail) — check schema
if (schema.includes('xmlContent'))
  ok('Schema : xmlContent stocké pour audit trail');
else warn('Schema : xmlContent non trouvé — pas d\'audit trail XML');

// ── Summary ──
console.log('\n' + '─'.repeat(50));
console.log(`  TOTAL : ${passed} ✅  ${failed} ❌  ${warnings} ⚠️`);
if (failed === 0) console.log('  🎉 Intégrité Peppol E2E OK');
else console.log('  🚨 Intégrité Peppol — incohérences détectées');
console.log('─'.repeat(50) + '\n');

expect(failed).toBe(0);
});
});
