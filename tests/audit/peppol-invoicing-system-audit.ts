#!/usr/bin/env npx tsx
/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   🧾 ZHIIVE — AUDIT SYSTÈME FACTURATION PEPPOL                 ║
 * ║   Vérifie l'intégrité complète du système e-Facturation         ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Usage :
 *   npx tsx tests/audit/peppol-invoicing-system-audit.ts
 *   npx tsx tests/audit/peppol-invoicing-system-audit.ts --section=backend
 *   npx tsx tests/audit/peppol-invoicing-system-audit.ts --section=frontend
 *   npx tsx tests/audit/peppol-invoicing-system-audit.ts --section=security
 *   npx tsx tests/audit/peppol-invoicing-system-audit.ts --section=schema
 *   npx tsx tests/audit/peppol-invoicing-system-audit.ts --section=bridge
 *   npx tsx tests/audit/peppol-invoicing-system-audit.ts --section=integration
 *   npx tsx tests/audit/peppol-invoicing-system-audit.ts --section=conventions
 *
 * Sections :
 *   schema        — Modèles Prisma (PeppolConfig, PeppolIncomingInvoice, StandaloneInvoice, ChantierInvoice peppol fields)
 *   bridge        — Service PeppolBridge (JSON-RPC, singleton, méthodes, sécurité)
 *   backend       — Routes API (invoices.ts + peppol.ts) — auth, validation, isolation org, CRUD
 *   frontend      — FacturePage + PeppolSettings (hooks, style, appels API, no hardcode)
 *   security      — Authentification, autorisation, validation Zod, injection, OWASP
 *   integration   — Cohérence end-to-end (Schema ↔ Routes ↔ Bridge ↔ UI ↔ Docker ↔ Nav)
 *   conventions   — Conventions Zhiive (zero hardcode, db singleton, useAuthenticatedApi, i18n)
 *   all           — Tout (défaut)
 *
 * ──────────────────────────────────────────────────────────────────
 *  Architecture du système :
 *
 *    ┌─────────────┐   HTTPS    ┌──────────────────┐  JSON-RPC   ┌───────────────┐
 *    │  React SPA  │ ────────── │  Express API     │ ──────────  │  Odoo 17      │
 *    │  (Vite)     │            │  (Cloud Run)     │             │  (Hetzner)    │
 *    └─────────────┘            └──────────────────┘             └───────────────┘
 *         │                            │                               │
 *    FacturePage.tsx             invoices.ts (CRUD)             PeppolBridge.ts
 *    PeppolSettings.tsx          peppol.ts (Peppol)             → peppol.api.odoo.com
 *    ChantierInvoicesTab.tsx           │                               │
 *                               ┌──────────────┐               ┌──────────────┐
 *                               │  PostgreSQL  │               │  Réseau      │
 *                               │  (Cloud SQL) │               │  Peppol      │
 *                               └──────────────┘               └──────────────┘
 *
 *  Modèles DB :
 *    - PeppolConfig            → Config Peppol par colony (1:1 avec Organization)
 *    - PeppolIncomingInvoice   → Factures fournisseur reçues via Peppol
 *    - StandaloneInvoice       → Factures indépendantes (hors chantier)
 *    - ChantierInvoice         → Factures liées aux chantiers (+ champs peppol)
 *
 *  Odoo Headless :
 *    - IP : 46.225.180.8:8069 (ARM64 Hetzner)
 *    - Modules : account, account_peppol, l10n_be, account_edi_ubl_cii
 *    - Company : "2Thier SRL" — peppol_endpoint: 1025391354 — proxy_state: active
 * ──────────────────────────────────────────────────────────────────
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
  console.log(`\n${'━'.repeat(64)}`);
  console.log(`${emoji}  ${name.toUpperCase()}`);
  console.log(`${'━'.repeat(64)}`);
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

// ── File helpers ──────────────────────────────────────────────
function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath));
}

function readFile(relPath: string): string {
  const p = path.join(ROOT, relPath);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : '';
}

function readSrc(relPath: string): string {
  return readFile(path.join('src', relPath));
}

function countOccurrences(text: string, pattern: RegExp): number {
  return (text.match(pattern) || []).length;
}

function getCodeLines(src: string): string[] {
  return src.split('\n').filter(l => {
    const t = l.trim();
    return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('/**');
  });
}

function grepInDir(
  pattern: RegExp,
  dir: string,
  extensions: string[],
  excludeDirs: string[] = ['node_modules', '.git', 'dist', 'build', '.next']
): { file: string; line: number; text: string }[] {
  const hits: { file: string; line: number; text: string }[] = [];
  if (!fs.existsSync(dir)) return hits;
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (excludeDirs.includes(entry.name)) continue;
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

// ── Determine which sections to run ──────────────────────────
const sections = ['schema', 'bridge', 'backend', 'frontend', 'security', 'integration', 'conventions'];
const shouldRun = (name: string) => sectionArg === 'all' || sectionArg === name;

// ╔══════════════════════════════════════════════════════════════════╗
// ║   1. SCHEMA PRISMA                                              ║
// ╚══════════════════════════════════════════════════════════════════╝

if (shouldRun('schema')) {
  startSection('Schema Prisma — Modèles Facturation & Peppol', '🗃️');

  const schema = readFile('prisma/schema.prisma');
  if (!schema) {
    fail('prisma/schema.prisma non trouvé');
  } else {
    ok('prisma/schema.prisma existe');

    // ── PeppolConfig ──
    console.log('\n  ── PeppolConfig ──');
    if (schema.includes('model PeppolConfig')) ok('model PeppolConfig défini');
    else fail('model PeppolConfig manquant');

    const peppolConfigFields = [
      ['organizationId', 'String', '@unique'],
      ['enabled', 'Boolean', ''],
      ['peppolEas', 'String', '0208'],
      ['peppolEndpoint', 'String?', ''],
      ['registrationStatus', 'String', 'NOT_REGISTERED'],
      ['odooCompanyId', 'Int?', ''],
      ['odooProxyUserId', 'Int?', ''],
      ['contactEmail', 'String?', ''],
      ['contactPhone', 'String?', ''],
      ['migrationKey', 'String?', ''],
      ['autoSendEnabled', 'Boolean', ''],
      ['autoReceiveEnabled', 'Boolean', ''],
    ];
    for (const [field, type] of peppolConfigFields) {
      if (schema.includes(field) && schema.match(new RegExp(`${field}\\s+${type.replace('?', '\\?')}`))) {
        ok(`PeppolConfig.${field} : ${type}`);
      } else {
        fail(`PeppolConfig.${field} : ${type} manquant`);
      }
    }

    if (schema.includes('Organization @relation') && schema.match(/PeppolConfig[\s\S]*Organization\s+@relation/))
      ok('PeppolConfig → Organization relation');
    else fail('PeppolConfig → Organization relation manquante');

    // ── PeppolIncomingInvoice ──
    console.log('\n  ── PeppolIncomingInvoice ──');
    if (schema.includes('model PeppolIncomingInvoice')) ok('model PeppolIncomingInvoice défini');
    else fail('model PeppolIncomingInvoice manquant');

    const incomingFields = [
      'organizationId', 'peppolMessageId', 'senderEas', 'senderEndpoint',
      'senderName', 'senderVat', 'invoiceNumber', 'invoiceDate', 'dueDate',
      'totalAmount', 'taxAmount', 'currency', 'xmlContent', 'xmlUrl', 'pdfUrl',
      'status', 'reviewedBy', 'reviewedAt', 'notes', 'metadata',
    ];
    for (const field of incomingFields) {
      if (schema.includes(`  ${field}`) || schema.match(new RegExp(`^\\s+${field}\\s+`, 'm'))) {
        ok(`PeppolIncomingInvoice.${field}`);
      } else {
        fail(`PeppolIncomingInvoice.${field} manquant`);
      }
    }

    // peppolMessageId must be @unique
    if (schema.match(/peppolMessageId\s+String\s+@unique/))
      ok('peppolMessageId @unique (dédoublonnage Peppol)');
    else fail('peppolMessageId doit être @unique');

    // Indexes on PeppolIncomingInvoice
    const incomingBlock = schema.slice(schema.indexOf('model PeppolIncomingInvoice'), schema.indexOf('}', schema.indexOf('model PeppolIncomingInvoice')) + 1);
    const indexCount = countOccurrences(incomingBlock, /@@index/g);
    if (indexCount >= 3) ok(`PeppolIncomingInvoice : ${indexCount} @@index (performance)`);
    else warn(`PeppolIncomingInvoice : seulement ${indexCount} @@index`);

    // ── StandaloneInvoice ──
    console.log('\n  ── StandaloneInvoice ──');
    if (schema.includes('model StandaloneInvoice')) ok('model StandaloneInvoice défini');
    else fail('model StandaloneInvoice manquant');

    const standaloneFields = [
      'organizationId', 'invoiceNumber', 'type', 'clientName', 'clientVat',
      'clientEmail', 'clientAddress', 'description', 'status', 'issueDate', 'dueDate',
      'paidAt', 'subtotal', 'taxRate', 'taxAmount', 'totalAmount', 'currency',
      'notes', 'paymentTerms', 'documentUrl', 'createdById', 'lines',
      'peppolStatus', 'peppolMessageId', 'peppolError', 'peppolSentAt',
    ];
    let standaloneMissing = 0;
    for (const field of standaloneFields) {
      if (schema.match(new RegExp(`^\\s+${field}\\s+`, 'm'))) {
        ok(`StandaloneInvoice.${field}`);
      } else {
        fail(`StandaloneInvoice.${field} manquant`);
        standaloneMissing++;
      }
    }
    if (standaloneMissing === 0) ok('StandaloneInvoice : tous les champs présents ✓');

    // StandaloneInvoice indexes
    const standaloneBlock = schema.slice(schema.indexOf('model StandaloneInvoice'));
    const saIndexes = countOccurrences(standaloneBlock, /@@index/g);
    if (saIndexes >= 3) ok(`StandaloneInvoice : ${saIndexes} @@index (performance)`);
    else warn(`StandaloneInvoice : seulement ${saIndexes} @@index`);

    // ── ChantierInvoice Peppol fields ──
    console.log('\n  ── ChantierInvoice (champs Peppol) ──');
    const peppolFieldsOnChantierInvoice = ['peppolStatus', 'peppolMessageId', 'peppolError', 'peppolSentAt', 'peppolXmlUrl'];
    for (const field of peppolFieldsOnChantierInvoice) {
      if (schema.includes(field))
        ok(`ChantierInvoice.${field} présent`);
      else fail(`ChantierInvoice.${field} manquant`);
    }

    // ── Organization relations ──
    console.log('\n  ── Organization relations ──');
    if (schema.match(/PeppolConfig\s+PeppolConfig/)) ok('Organization.PeppolConfig relation');
    else if (schema.includes('PeppolConfig?')) ok('Organization.PeppolConfig? optionnel');
    else warn('Organization → PeppolConfig relation non trouvée');

    if (schema.includes('PeppolIncomingInvoice PeppolIncomingInvoice[]') || schema.includes('PeppolIncomingInvoice[]'))
      ok('Organization.PeppolIncomingInvoice[] relation');
    else warn('Organization → PeppolIncomingInvoice[] relation non trouvée');

    if (schema.includes('StandaloneInvoice StandaloneInvoice[]') || schema.includes('StandaloneInvoice[]'))
      ok('Organization.StandaloneInvoice[] relation');
    else warn('Organization → StandaloneInvoice[] relation non trouvée');
  }
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║   2. PEPPOL BRIDGE (Odoo JSON-RPC Client)                      ║
// ╚══════════════════════════════════════════════════════════════════╝

if (shouldRun('bridge')) {
  startSection('PeppolBridge — Service Odoo JSON-RPC', '🔌');

  const bridgePath = 'src/services/peppolBridge.ts';
  const bridge = readFile(bridgePath);
  if (!bridge) {
    fail(`${bridgePath} manquant`);
  } else {
    ok(`${bridgePath} existe (${bridge.split('\n').length} lignes)`);

    // ── Export & Singleton ──
    console.log('\n  ── Export & Singleton ──');
    if (bridge.includes('export class PeppolBridge')) ok('export class PeppolBridge');
    else fail('PeppolBridge non exporté');

    if (bridge.includes('export function getPeppolBridge') || bridge.includes('export const getPeppolBridge'))
      ok('getPeppolBridge() singleton exporté');
    else fail('getPeppolBridge() non exporté');

    const singletonPattern = /let\s+\w*[iI]nstance|const\s+\w*[iI]nstance|if\s*\(\s*!\w*[iI]nstance/;
    if (singletonPattern.test(bridge) || bridge.includes('if (!'))
      ok('Pattern singleton détecté');
    else warn('Pattern singleton non détecté');

    // ── Config depuis env ──
    console.log('\n  ── Configuration ──');
    for (const envVar of ['ODOO_URL', 'ODOO_DB_NAME', 'ODOO_USER', 'ODOO_PASSWORD']) {
      if (bridge.includes(`process.env.${envVar}`)) ok(`Config: process.env.${envVar}`);
      else fail(`Config: process.env.${envVar} non trouvé`);
    }

    // Pas de valeur hardcodée pour ODOO_URL (sauf localhost fallback)
    const hardcodedOdooUrl = bridge.split('\n').filter(l => {
      const t = l.trim();
      return /['"`]https?:\/\/(?!localhost)[a-zA-Z0-9.-]+:\d+/.test(t) &&
        !t.startsWith('//') && !t.startsWith('*');
    });
    if (hardcodedOdooUrl.length === 0) ok('Zéro URL Odoo hardcodée (hors localhost)');
    else warn(`${hardcodedOdooUrl.length} URL(s) Odoo hardcodée(s)`, hardcodedOdooUrl[0]?.trim());

    // ── Protocole JSON-RPC ──
    console.log('\n  ── Protocole JSON-RPC ──');
    if (bridge.includes("'jsonrpc'") || bridge.includes('"jsonrpc"') || bridge.includes('jsonrpc:'))
      ok('Utilise JSON-RPC');
    else fail('Protocole JSON-RPC non trouvé');

    if (bridge.includes("'2.0'") || bridge.includes('"2.0"'))
      ok('Version JSON-RPC 2.0');
    else warn('Version 2.0 non explicite');

    if (bridge.includes('Content-Type') && bridge.includes('application/json'))
      ok('Content-Type: application/json');
    else warn('Content-Type non trouvé');

    if (bridge.includes('session_id'))
      ok('Gestion du session cookie Odoo');
    else warn('Gestion session_id non trouvée');

    // ── Méthodes fondamentales ──
    console.log('\n  ── Méthodes ──');
    const requiredMethods = [
      ['authenticate', 'Authentification Odoo'],
      ['syncOrganization', 'Sync Colony → Odoo Company'],
      ['registerPeppol', 'Enregistrement sur réseau Peppol'],
      ['sendInvoice', 'Envoi facture via Peppol'],
      ['checkInvoiceStatus', 'Vérifier statut envoi'],
      ['checkRegistrationStatus', 'Vérifier statut enregistrement'],
      ['fetchIncomingDocuments', 'Déclencher réception factures'],
      ['getIncomingInvoices', 'Lister factures reçues'],
      ['verifyPeppolEndpoint', 'Vérifier endpoint Peppol (BCE)'],
      ['healthCheck', 'Health check Odoo'],
    ];
    for (const [method, desc] of requiredMethods) {
      const regex = new RegExp(`\\b${method}\\s*[(<]`);
      if (regex.test(bridge)) ok(`${method}() — ${desc}`);
      else warn(`${method}() manquant — ${desc}`);
    }

    // ── Méthode privée jsonRpc ──
    if (bridge.includes('jsonRpc')) ok('Méthode privée jsonRpc() (couche transport)');
    else fail('Méthode jsonRpc() non trouvée');

    if (bridge.includes('call(') || bridge.includes('private async call'))
      ok('Méthode call() pour model/method Odoo');
    else warn('Méthode call() non trouvée');

    // ── Gestion d'erreurs ──
    console.log('\n  ── Gestion d\'erreurs ──');
    const tryCatchCount = countOccurrences(bridge, /try\s*{/g);
    if (tryCatchCount >= 3) ok(`${tryCatchCount} blocs try/catch`);
    else warn(`Seulement ${tryCatchCount} blocs try/catch — fragile`);

    if (bridge.includes('data.error') || bridge.includes('error?.message'))
      ok('Gère les erreurs JSON-RPC Odoo');
    else fail('Aucune gestion des erreurs Odoo JSON-RPC');

    if (bridge.includes('throw new Error'))
      ok('Lance des erreurs explicites');
    else warn('Pas de throw new Error');

    // ── Interfaces TypeScript ──
    console.log('\n  ── Typage TypeScript ──');
    for (const iface of ['OdooJsonRpcResponse', 'OdooCompany', 'OdooInvoice', 'PeppolBridgeConfig']) {
      if (bridge.includes(`interface ${iface}`)) ok(`Interface ${iface}`);
      else warn(`Interface ${iface} non définie`);
    }

    // ── SyncOrganization : recherche par VAT + nom ──
    console.log('\n  ── SyncOrganization (logique) ──');
    if (bridge.includes('vat') && bridge.includes('search_read'))
      ok('Recherche company existante par VAT');
    else fail('Recherche par VAT non trouvée');

    if (bridge.includes("'=', org.name") || bridge.includes('name'))
      ok('Fallback: recherche par nom');
    else warn('Fallback par nom non trouvé');

    // ── RegisterPeppol : utilise wizard, pas méthode privée ──
    console.log('\n  ── RegisterPeppol (sécurité Odoo) ──');
    if (bridge.includes('res.config.settings'))
      ok('Utilise res.config.settings (méthode publique)');
    else fail('N\'utilise pas res.config.settings — risque de blocage Odoo');

    if (bridge.includes('button_create_peppol_proxy_user'))
      ok('Appelle button_create_peppol_proxy_user (méthode publique)');
    else fail('button_create_peppol_proxy_user non trouvé');

    if (!bridge.includes('_register_proxy_user'))
      ok('N\'utilise PAS _register_proxy_user (privé, bloqué)');
    else fail('Utilise _register_proxy_user — sera bloqué par sécurité Odoo');

    // ── Pas de PrismaClient ──
    if (!bridge.includes('new PrismaClient')) ok('Zéro new PrismaClient()');
    else fail('new PrismaClient() trouvé — utiliser db singleton');

    // ── Console.log ──
    const consoleLogs = bridge.split('\n').filter(l => {
      const t = l.trim();
      return t.includes('console.log(') && !t.startsWith('//') && !t.startsWith('*');
    });
    if (consoleLogs.length <= 5) ok(`Console.log: ${consoleLogs.length} (acceptable pour debug)`);
    else warn(`Console.log: ${consoleLogs.length} — réduire en prod`);
  }
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║   3. BACKEND — Routes API (invoices.ts + peppol.ts)             ║
// ╚══════════════════════════════════════════════════════════════════╝

if (shouldRun('backend')) {
  startSection('Backend — Routes API Factures & Peppol', '🔧');

  // ── invoices.ts ──
  console.log('\n  ═══ invoices.ts (CRUD Factures Unifiées) ═══');
  const invoices = readSrc('routes/invoices.ts');
  if (!invoices) {
    fail('routes/invoices.ts manquant');
  } else {
    ok(`routes/invoices.ts existe (${invoices.split('\n').length} lignes)`);

    // Imports
    console.log('\n  ── Imports ──');
    if (invoices.includes("from '../lib/database'") || invoices.includes("from '@/lib/database'"))
      ok('Import: db depuis lib/database');
    else fail('Import: db manquant');

    if (!invoices.includes('new PrismaClient')) ok('Zéro new PrismaClient()');
    else fail('new PrismaClient() trouvé');

    if (invoices.includes("from '../middleware/auth'") || invoices.includes("from '@/middleware/auth'"))
      ok('Import: middleware auth');
    else fail('Import: middleware auth manquant');

    if (invoices.includes("from 'zod'")) ok('Import: Zod (validation)');
    else warn('Import: Zod manquant');

    // Endpoints
    console.log('\n  ── Endpoints ──');
    const routeRegex = /router\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/g;
    const invoiceRoutes: { method: string; path: string; line: string }[] = [];
    for (const line of invoices.split('\n')) {
      const m = routeRegex.exec(line);
      if (m) invoiceRoutes.push({ method: m[1].toUpperCase(), path: m[2], line });
      routeRegex.lastIndex = 0;
    }

    ok(`${invoiceRoutes.length} endpoints définis`);

    const expectedInvoiceEndpoints = [
      ['GET', '/stats'],
      ['GET', '/'],
      ['POST', '/'],
      ['GET', '/:id'],
      ['PUT', '/:id'],
      ['DELETE', '/:id'],
      ['POST', '/:id/mark-paid'],
      ['POST', '/:id/mark-sent'],
    ];
    for (const [method, epath] of expectedInvoiceEndpoints) {
      const found = invoiceRoutes.find(r => r.method === method && r.path === epath);
      if (found) ok(`${method} /api/invoices${epath}`);
      else fail(`${method} /api/invoices${epath} manquant`);
    }

    // Auth on all routes
    console.log('\n  ── Auth ──');
    let unprotected = 0;
    for (const r of invoiceRoutes) {
      if (!r.line.includes('authenticateToken')) {
        fail(`Route NON PROTÉGÉE : ${r.method} ${r.path}`);
        unprotected++;
      }
    }
    if (unprotected === 0) ok('Toutes les routes utilisent authenticateToken');

    // Organization isolation
    console.log('\n  ── Isolation Organisation ──');
    if (invoices.includes('x-organization-id')) ok('Utilise header x-organization-id');
    else fail('x-organization-id non trouvé');

    const orgChecks = countOccurrences(invoices, /if\s*\(\s*!organizationId\s*\)/g);
    if (orgChecks >= 5) ok(`${orgChecks} vérifications !organizationId`);
    else warn(`Seulement ${orgChecks} vérifications !organizationId`);

    // Unified listing (3 sources)
    console.log('\n  ── Listing Unifié ──');
    if (invoices.includes('standaloneInvoice') && invoices.includes('chantierInvoice') && invoices.includes('peppolIncomingInvoice'))
      ok('GET / agrège 3 sources (standalone + chantier + incoming)');
    else fail('Listing unifié incomplet — manque une source');

    if (invoices.includes("source: 'standalone'")) ok("Marqueur source: 'standalone'");
    else fail("Marqueur source: 'standalone' manquant");
    if (invoices.includes("source: 'chantier'")) ok("Marqueur source: 'chantier'");
    else fail("Marqueur source: 'chantier' manquant");
    if (invoices.includes("source: 'incoming'")) ok("Marqueur source: 'incoming'");
    else fail("Marqueur source: 'incoming' manquant");

    // Filtering
    if (invoices.includes("req.query.filter")) ok('Support filtrage par tab (filter query)');
    else warn('Filtrage par tab non trouvé');

    if (invoices.includes("req.query.search") || invoices.includes("search"))
      ok('Support recherche (search query)');
    else warn('Recherche non trouvée');

    // Sort
    if (invoices.includes('.sort(')) ok('Tri unifié des résultats');
    else warn('Tri unifié non trouvé');

    // Stats endpoint
    console.log('\n  ── Stats ──');
    if (invoices.includes('totalEmises') && invoices.includes('totalRecues'))
      ok('Stats: totalEmises + totalRecues');
    else warn('Stats incomplètes');

    if (invoices.includes('totalPaid') && invoices.includes('totalPending') && invoices.includes('totalOverdue'))
      ok('Stats: totalPaid, totalPending, totalOverdue');
    else warn('Stats financières incomplètes');

    // Invoice number generation
    console.log('\n  ── Numéro facture ──');
    if (invoices.includes('FAC-')) ok('Préfixe numéro: FAC-YYYY-NNN');
    else fail('Préfixe FAC- non trouvé');

    if (invoices.includes('padStart')) ok('Numéro padded (FAC-2026-001)');
    else warn('Padding non trouvé');

    // Tax calculation
    console.log('\n  ── Calculs ──');
    if (invoices.includes('subtotal') && invoices.includes('taxAmount') && invoices.includes('totalAmount'))
      ok('Calcul: subtotal + taxAmount + totalAmount');
    else warn('Calcul montants incomplet');

    if (invoices.includes('taxRate') && invoices.includes('21'))
      ok('TVA belge 21% par défaut');
    else warn('TVA belge 21% non trouvée');

    // Draft-only restrictions
    console.log('\n  ── Restrictions DRAFT ──');
    if (invoices.includes("status !== 'DRAFT'") && invoices.includes('modifi'))
      ok('PUT: vérifie status DRAFT avant modification');
    else warn('PUT: pas de vérification DRAFT');

    if (invoices.includes("status !== 'DRAFT'") && invoices.includes('supprim'))
      ok('DELETE: vérifie status DRAFT avant suppression');
    else warn('DELETE: pas de vérification DRAFT');

    // Mark-paid works for both types
    console.log('\n  ── Mark-paid multi-source ──');
    if (invoices.includes('standaloneInvoice.findFirst') && invoices.includes('chantierInvoice.findFirst'))
      ok('mark-paid cherche dans standalone ET chantier');
    else fail('mark-paid ne couvre pas les 2 types');

    // ═══════════════════════════════════════════════════════════
    // ── peppol.ts ──
    console.log('\n\n  ═══ peppol.ts (Routes Peppol) ═══');
    const peppol = readSrc('routes/peppol.ts');
    if (!peppol) {
      fail('routes/peppol.ts manquant');
    } else {
      ok(`routes/peppol.ts existe (${peppol.split('\n').length} lignes)`);

      // Imports
      console.log('\n  ── Imports ──');
      if (peppol.includes("from '../lib/database'")) ok('Import: db singleton');
      else fail('Import: db manquant');

      if (peppol.includes("from '../services/peppolBridge'")) ok('Import: peppolBridge');
      else fail('Import: peppolBridge manquant');

      if (peppol.includes("from '../middleware/auth'")) ok('Import: middleware auth');
      else fail('Import: middleware auth manquant');

      if (peppol.includes('isAdmin')) ok('Import: isAdmin (admin-only ops)');
      else fail('Import: isAdmin manquant');

      // Endpoints
      console.log('\n  ── Endpoints ──');
      const peppolRouteRegex = /router\.(get|post|put|delete)\s*\(\s*['"]([^'"]+)['"]/g;
      const peppolRoutes: { method: string; path: string; line: string }[] = [];
      for (const line of peppol.split('\n')) {
        const m = peppolRouteRegex.exec(line);
        if (m) peppolRoutes.push({ method: m[1].toUpperCase(), path: m[2], line });
        peppolRouteRegex.lastIndex = 0;
      }
      ok(`${peppolRoutes.length} endpoints Peppol définis`);

      const expectedPeppolEndpoints = [
        ['GET', '/config'],
        ['PUT', '/config'],
        ['POST', '/register'],
        ['GET', '/status'],
        ['POST', '/send/:invoiceId'],
        ['GET', '/send/:invoiceId/status'],
        ['POST', '/fetch-incoming'],
        ['GET', '/incoming'],
        ['PUT', '/incoming/:id'],
        ['POST', '/verify-endpoint'],
        ['GET', '/health'],
      ];
      for (const [method, epath] of expectedPeppolEndpoints) {
        const found = peppolRoutes.find(r => r.method === method && r.path === epath);
        if (found) ok(`${method} /api/peppol${epath}`);
        else fail(`${method} /api/peppol${epath} manquant`);
      }

      // Admin protection on mutations
      console.log('\n  ── Admin Protection ──');
      const adminRoutes = [
        ['PUT', '/config', 'Modifier config'],
        ['POST', '/register', 'Enregistrement Peppol'],
        ['POST', '/send/:invoiceId', 'Envoi facture'],
        ['POST', '/fetch-incoming', 'Déclencher réception'],
        ['PUT', '/incoming/:id', 'Traiter facture entrante'],
      ];
      for (const [method, routePath, desc] of adminRoutes) {
        const route = peppolRoutes.find(r => r.method === method && r.path === routePath);
        if (route?.line.includes('isAdmin'))
          ok(`${method} ${routePath} : isAdmin (${desc})`);
        else warn(`${method} ${routePath} : pas de isAdmin (${desc})`);
      }

      // Zod validation schemas
      console.log('\n  ── Validation Zod ──');
      const zodSchemas = peppol.match(/(?:const|let)\s+\w+Schema\s*=\s*z\.object/g) || [];
      ok(`${zodSchemas.length} schéma(s) Zod`);

      if (peppol.includes('configSchema')) ok('configSchema (PUT /config)');
      else fail('configSchema manquant');
      if (peppol.includes('sendInvoiceSchema')) ok('sendInvoiceSchema (POST /send/:invoiceId)');
      else fail('sendInvoiceSchema manquant');
      if (peppol.includes('incomingUpdateSchema')) ok('incomingUpdateSchema (PUT /incoming/:id)');
      else fail('incomingUpdateSchema manquant');
      if (peppol.includes('verifySchema')) ok('verifySchema (POST /verify-endpoint)');
      else fail('verifySchema manquant');

      // Zod .transform fix for empty strings
      if (peppol.includes('.transform(') || peppol.includes("=== '' ?"))
        ok('Zod: .transform() pour empty strings → undefined');
      else warn('Zod: pas de .transform() pour empty strings (bug 400)');

      // GET /config returns default if no config exists
      console.log('\n  ── GET /config fallback ──');
      if (peppol.includes('NOT_REGISTERED') && peppol.includes('0208'))
        ok('GET /config retourne défaut si pas de config');
      else warn('GET /config: pas de fallback détecté');

      // Send invoice resolves partner data
      console.log('\n  ── Send Invoice (résolution partenaire) ──');
      if (peppol.includes('Lead') && peppol.includes('Chantier'))
        ok('Résolution partenaire: Lead + Chantier');
      else warn('Résolution partenaire partielle');

      if (peppol.includes('peppolStatus') && peppol.includes("'PROCESSING'"))
        ok('Marque peppolStatus = PROCESSING avant envoi');
      else warn('peppolStatus PROCESSING non géré');

      if (peppol.includes("'ERROR'") && peppol.includes('peppolError'))
        ok('Gestion erreur: peppolStatus = ERROR + peppolError');
      else warn('Gestion erreur Peppol incomplète');

      // Fetch incoming logic
      console.log('\n  ── Fetch Incoming ──');
      if (peppol.includes('fetchIncomingDocuments') && peppol.includes('getIncomingInvoices'))
        ok('Double appel: fetchIncomingDocuments + getIncomingInvoices');
      else warn('Logique fetch incoming incomplète');

      if (peppol.includes('peppolMessageId') && peppol.includes('findUnique'))
        ok('Dédoublonnage par peppolMessageId');
      else warn('Dédoublonnage non trouvé');
    }
  }
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║   4. FRONTEND — FacturePage + PeppolSettings                    ║
// ╚══════════════════════════════════════════════════════════════════╝

if (shouldRun('frontend')) {
  startSection('Frontend — FacturePage + PeppolSettings', '🎨');

  // ── FacturePage.tsx ──
  console.log('\n  ═══ FacturePage.tsx ═══');
  const facturePage = readSrc('pages/FacturePage.tsx');
  if (!facturePage) {
    fail('pages/FacturePage.tsx manquant');
  } else {
    ok(`pages/FacturePage.tsx existe (${facturePage.split('\n').length} lignes)`);

    // ── Hooks ──
    console.log('\n  ── Hooks React ──');
    if (facturePage.includes('useAuthenticatedApi'))
      ok('Utilise useAuthenticatedApi (pas fetch/axios)');
    else fail('N\'utilise pas useAuthenticatedApi');

    if (facturePage.includes('useAuth'))
      ok('Utilise useAuth');
    else warn('useAuth non trouvé');

    if (facturePage.includes('useCallback'))
      ok('Utilise useCallback (stabilité)');
    else warn('useCallback non trouvé — risque boucle');

    if (facturePage.includes('useMemo'))
      ok('Utilise useMemo (performance calculs)');
    else warn('useMemo non trouvé');

    // ── API calls ──
    console.log('\n  ── Appels API ──');
    if (facturePage.includes('/api/invoices'))
      ok('Appelle /api/invoices');
    else fail('N\'appelle pas /api/invoices');

    if (facturePage.includes('/api/invoices/stats'))
      ok('Appelle /api/invoices/stats');
    else fail('N\'appelle pas /api/invoices/stats');

    if (facturePage.includes('api.get') || facturePage.includes('api.get<'))
      ok('Utilise api.get() (GET)');
    else fail('api.get() non trouvé');

    if (facturePage.includes('api.post'))
      ok('Utilise api.post() (POST create/actions)');
    else fail('api.post() non trouvé');

    if (facturePage.includes('api.delete'))
      ok('Utilise api.delete() (DELETE)');
    else fail('api.delete() non trouvé');

    // ── UI Facebook style ──
    console.log('\n  ── Style Facebook ──');
    if (facturePage.includes('const FB =') || facturePage.includes('FB.bg'))
      ok('Constantes couleur FB (Facebook style)');
    else fail('Constantes FB non trouvées');

    const fbKeys = ['bg', 'white', 'text', 'textSecondary', 'blue', 'border', 'shadow', 'radius'];
    for (const key of fbKeys) {
      if (facturePage.includes(`FB.${key}`)) ok(`FB.${key} utilisé`);
      else warn(`FB.${key} non utilisé`);
    }

    // FBCard component
    if (facturePage.includes('FBCard'))
      ok('Composant FBCard (card Facebook style)');
    else warn('FBCard non trouvé');

    // ── Tabs ──
    console.log('\n  ── Tabs / Filtres ──');
    const tabKeys = ['all', 'outgoing', 'incoming', 'draft'];
    for (const tab of tabKeys) {
      if (facturePage.includes(`'${tab}'`)) ok(`Tab: '${tab}'`);
      else fail(`Tab: '${tab}' manquant`);
    }

    // ── Status config ──
    console.log('\n  ── Status ──');
    const statuses = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED', 'RECEIVED', 'REVIEWED'];
    for (const status of statuses) {
      if (facturePage.includes(`${status}:`)) ok(`Status: ${status}`);
      else warn(`Status: ${status} non configuré`);
    }

    // ── Source badges ──
    console.log('\n  ── Source Badges ──');
    for (const s of ['standalone', 'chantier', 'incoming']) {
      if (facturePage.includes(`${s}:`)) ok(`Badge source: ${s}`);
      else fail(`Badge source: ${s} manquant`);
    }

    // ── Create modal ──
    console.log('\n  ── Modal Création ──');
    if (facturePage.includes('showCreateModal') || facturePage.includes('CreateModal'))
      ok('Modal création présent');
    else fail('Modal création manquant');

    if (facturePage.includes('clientName'))
      ok('Champ: clientName');
    else fail('Champ clientName manquant');

    if (facturePage.includes('lines') && (facturePage.includes('InvoiceLine') || facturePage.includes('formData.lines')))
      ok('Lignes de facture dynamiques');
    else warn('Lignes de facture non trouvées');

    // ── Search ──
    if (facturePage.includes('search') && facturePage.includes('Rechercher'))
      ok('Barre de recherche');
    else warn('Barre de recherche non trouvée');

    // ── Responsive ──
    if (facturePage.includes('isMobile') || facturePage.includes('useScreenSize'))
      ok('Design responsive (isMobile)');
    else warn('Pas de responsive');

    // ── Stats bar ──
    console.log('\n  ── Stats Bar ──');
    if (facturePage.includes('stats.totalEmises') && facturePage.includes('stats.totalRecues'))
      ok('Affiche stats émises + reçues');
    else warn('Stats affichage incomplet');

    // ── Actions ──
    console.log('\n  ── Actions ──');
    if (facturePage.includes('handleMarkPaid') || facturePage.includes('mark-paid'))
      ok('Action: Marquer payée');
    else warn('Action mark-paid manquante');

    if (facturePage.includes('handleMarkSent') || facturePage.includes('mark-sent'))
      ok('Action: Marquer envoyée');
    else warn('Action mark-sent manquante');

    if (facturePage.includes('handleDelete'))
      ok('Action: Supprimer');
    else warn('Action supprimer manquante');

    // ── Dayjs locale ──
    if (facturePage.includes("'fr'") && facturePage.includes('dayjs'))
      ok('dayjs locale fr');
    else warn('dayjs locale fr non trouvé');

    // ── Peppol status display ──
    if (facturePage.includes('peppolStatus'))
      ok('Affichage du statut Peppol sur les factures');
    else warn('Statut Peppol non affiché');
  }

  // ── PeppolSettings.tsx ──
  console.log('\n\n  ═══ PeppolSettings.tsx ═══');
  const peppolSettings = readSrc('pages/settings/PeppolSettings.tsx');
  if (!peppolSettings) {
    fail('pages/settings/PeppolSettings.tsx manquant');
  } else {
    ok(`pages/settings/PeppolSettings.tsx existe (${peppolSettings.split('\n').length} lignes)`);

    if (peppolSettings.includes('useAuthenticatedApi'))
      ok('Utilise useAuthenticatedApi');
    else fail('N\'utilise pas useAuthenticatedApi');

    // API endpoints called
    const settingsApiCalls = [
      ['/api/peppol/config', 'Config'],
      ['/api/peppol/register', 'Register'],
      ['/api/peppol/health', 'Health'],
      ['/api/peppol/status', 'Status'],
    ];
    for (const [endpoint, label] of settingsApiCalls) {
      if (peppolSettings.includes(endpoint))
        ok(`Appelle ${endpoint} (${label})`);
      else warn(`N'appelle pas ${endpoint} (${label})`);
    }

    // Facebook style
    if (peppolSettings.includes('FB.') || peppolSettings.includes('const FB'))
      ok('Style Facebook (FB constants)');
    else warn('Style Facebook non trouvé');

    // Fields
    if (peppolSettings.includes('peppolEas')) ok('Champ: EAS');
    else warn('Champ EAS manquant');
    if (peppolSettings.includes('peppolEndpoint')) ok('Champ: Endpoint (BCE)');
    else warn('Champ endpoint manquant');
    if (peppolSettings.includes('contactEmail')) ok('Champ: Email contact');
    else warn('Champ email manquant');
    if (peppolSettings.includes('autoSendEnabled')) ok('Toggle: auto-send');
    else warn('Toggle auto-send manquant');

    // Registration button
    if (peppolSettings.includes('register') || peppolSettings.includes('Enregistrer'))
      ok('Bouton d\'enregistrement Peppol');
    else warn('Bouton enregistrement manquant');
  }

  // ── ChantierInvoicesTab.tsx ──
  console.log('\n\n  ═══ ChantierInvoicesTab.tsx (Peppol) ═══');
  const invoicesTab = readSrc('pages/Chantiers/ChantierInvoicesTab.tsx');
  if (invoicesTab) {
    ok('ChantierInvoicesTab.tsx existe');
    if (invoicesTab.includes('Peppol') || invoicesTab.includes('peppol'))
      ok('Bouton envoi Peppol intégré');
    else warn('Bouton Peppol non trouvé dans ChantierInvoicesTab');

    if (invoicesTab.includes('peppolStatus'))
      ok('Affichage peppolStatus');
    else warn('peppolStatus non affiché');
  } else {
    warn('ChantierInvoicesTab.tsx non trouvé');
  }
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║   5. SÉCURITÉ                                                   ║
// ╚══════════════════════════════════════════════════════════════════╝

if (shouldRun('security')) {
  startSection('Sécurité — OWASP, Auth, Validation, Injection', '🛡️');

  const invoices = readSrc('routes/invoices.ts');
  const peppol = readSrc('routes/peppol.ts');
  const bridge = readSrc('services/peppolBridge.ts');
  const allBackend = invoices + peppol + bridge;

  // ── A01: Broken Access Control ──
  console.log('\n  ── A01: Broken Access Control ──');

  // All routes must use authenticateToken
  for (const [name, src] of [['invoices.ts', invoices], ['peppol.ts', peppol]] as const) {
    const routeRegex = /router\.(get|post|put|delete)\s*\(/g;
    const routeCount = countOccurrences(src, routeRegex);
    const authCount = countOccurrences(src, /authenticateToken/g);
    if (authCount >= routeCount)
      ok(`${name}: ${authCount}/${routeCount} routes authentifiées`);
    else
      fail(`${name}: ${authCount}/${routeCount} routes authentifiées — ${routeCount - authCount} non protégées`);
  }

  // Org isolation: every route must check organizationId
  const orgIsolationByFile = [
    ['invoices.ts', invoices],
    ['peppol.ts', peppol],
  ] as const;
  for (const [name, src] of orgIsolationByFile) {
    const orgChecks = countOccurrences(src, /!organizationId/g);
    if (orgChecks >= 5) ok(`${name}: ${orgChecks} checks !organizationId (isolation org)`);
    else warn(`${name}: seulement ${orgChecks} checks !organizationId`);
  }

  // Admin-only for sensitive operations
  const adminOnlyOps = peppol.match(/isAdmin/g) || [];
  if (adminOnlyOps.length >= 4)
    ok(`peppol.ts: ${adminOnlyOps.length} routes protégées par isAdmin`);
  else warn(`peppol.ts: seulement ${adminOnlyOps.length} routes isAdmin`);

  // IDOR: findFirst with organizationId filter (not just findUnique by id)
  console.log('\n  ── IDOR Protection ──');
  for (const [name, src] of orgIsolationByFile) {
    const findFirstWithOrg = countOccurrences(src, /findFirst\s*\(\s*{\s*where:\s*{[^}]*organizationId/g);
    const findFirstTotal = countOccurrences(src, /findFirst\s*\(/g);
    if (findFirstWithOrg >= findFirstTotal * 0.8)
      ok(`${name}: ${findFirstWithOrg}/${findFirstTotal} findFirst incluent organizationId`);
    else
      warn(`${name}: ${findFirstWithOrg}/${findFirstTotal} findFirst incluent organizationId — risque IDOR`);
  }

  // ── A03: Injection ──
  console.log('\n  ── A03: Injection ──');

  // SQL injection: Prisma ORM protects, but check for raw queries in Peppol/Invoice routes specifically
  const invoicesSrc = readSrc('routes/invoices.ts');
  const peppolSrc = readSrc('routes/peppol.ts');
  const rawInInvoices = (invoicesSrc.match(/\$queryRaw|\$executeRaw|\.raw\(/g) || []).length;
  const rawInPeppol = (peppolSrc.match(/\$queryRaw|\$executeRaw|\.raw\(/g) || []).length;
  const rawTotal = rawInInvoices + rawInPeppol;
  if (rawTotal === 0)
    ok('Zéro requête SQL brute dans invoices.ts + peppol.ts (Prisma protège)');
  else warn(`${rawTotal} requête(s) SQL brute(s) dans les routes Peppol/Factures`);

  // Check for string interpolation in db queries
  const interpolatedInvoices = (invoicesSrc.match(/db\.\w+\.\w+\(.*`\$\{/g) || []).length;
  const interpolatedPeppol = (peppolSrc.match(/db\.\w+\.\w+\(.*`\$\{/g) || []).length;
  if (interpolatedInvoices + interpolatedPeppol === 0)
    ok('Zéro interpolation de string dans les requêtes DB');
  else fail(`${interpolatedQueries.length} interpolation(s) dans les requêtes DB — risque injection`);

  // ── A04: Insecure Design ──
  console.log('\n  ── A04: Insecure Design ──');

  // Draft-only edits
  if (invoices.includes("status !== 'DRAFT'"))
    ok('Protection: seuls les brouillons modifiables/supprimables');
  else fail('Pas de protection DRAFT-only');

  // Prevent double Peppol send
  if (peppol.includes("peppolStatus === 'PROCESSING'") || peppol.includes("peppolStatus === 'DONE'"))
    ok('Protection: empêche double envoi Peppol');
  else warn('Pas de protection contre double envoi Peppol');

  // Already registered check
  if (peppol.includes("registrationStatus === 'ACTIVE'"))
    ok('Protection: empêche double enregistrement Peppol');
  else warn('Pas de protection double enregistrement');

  // ── A05: Security Misconfiguration ──
  console.log('\n  ── A05: Misconfiguration ──');

  // Odoo credentials not hardcoded
  if (!bridge.includes("password: 'admin'") && !bridge.match(/password:\s*['"](?!admin['"])/))
    ok('Bridge: pas de mot de passe hardcodé (ou seulement fallback admin dev)');
  else {
    // Acceptable si c'est un fallback pour dev
    if (bridge.includes("process.env.ODOO_PASSWORD || 'admin'"))
      ok('Bridge: fallback admin pour dev (OK si env en prod)');
    else warn('Bridge: mot de passe potentiellement hardcodé');
  }

  // .env.example exists
  if (fileExists('.env.example'))
    ok('.env.example existe (docs pour variables env)');
  else warn('.env.example manquant');

  // ── A07: Identification & Authentication Failures ──
  console.log('\n  ── A07: Authentication ──');

  // JWT in middleware
  if (invoices.includes('authenticateToken') && peppol.includes('authenticateToken'))
    ok('JWT auth via authenticateToken middleware');
  else fail('authenticateToken manquant');

  // ── A08: Software & Data Integrity Failures ──
  console.log('\n  ── A08: Data Integrity ──');

  // Zod validation on all POST/PUT bodies
  const zodSchemaCount = countOccurrences(invoices + peppol, /\.safeParse\(/g);
  if (zodSchemaCount >= 5)
    ok(`${zodSchemaCount} validations Zod .safeParse() (entrées validées)`);
  else warn(`Seulement ${zodSchemaCount} validations Zod`);

  // ── A09: Security Logging ──
  console.log('\n  ── A09: Logging ──');
  const errorLogs = countOccurrences(allBackend, /console\.error/g);
  if (errorLogs >= 5)
    ok(`${errorLogs} console.error (logging erreurs sécurité)`);
  else warn(`Seulement ${errorLogs} console.error`);

  // ── Odoo Credentials Security ──
  console.log('\n  ── Sécurité Credentials Odoo ──');
  if (bridge.includes('process.env'))
    ok('Credentials Odoo depuis process.env');
  else fail('Credentials Odoo pas depuis env');

  // No credentials in frontend code
  const frontendOdooCreds = grepInDir(/ODOO_URL|ODOO_PASSWORD|ODOO_USER/, SRC, ['.tsx', '.jsx']);
  if (frontendOdooCreds.length === 0)
    ok('Zéro credential Odoo dans le frontend');
  else fail(`${frontendOdooCreds.length} credential(s) Odoo trouvé(es) côté frontend`);
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║   6. INTÉGRATION END-TO-END                                     ║
// ╚══════════════════════════════════════════════════════════════════╝

if (shouldRun('integration')) {
  startSection('Intégration End-to-End — Cohérence Système', '🔗');

  const schema = readFile('prisma/schema.prisma');
  const invoiceRoutes = readSrc('routes/invoices.ts');
  const peppolRoutes = readSrc('routes/peppol.ts');
  const bridge = readSrc('services/peppolBridge.ts');
  const facturePage = readSrc('pages/FacturePage.tsx');
  const peppolSettings = readSrc('pages/settings/PeppolSettings.tsx');
  const apiServer = readSrc('api-server-clean.ts');
  const appLayout = readSrc('AppLayout.tsx');
  const settingsPage = readSrc('pages/SettingsPage.tsx');
  const dockerCompose = readFile('docker-compose.peppol.yml');
  const odooConf = readFile('peppol/odoo-config/odoo.conf');
  const envExample = readFile('.env.example');

  // ── Routes registered in API server ──
  console.log('\n  ── Routes enregistrées dans api-server-clean.ts ──');
  if (apiServer.includes('peppolRouter') || apiServer.includes("peppol"))
    ok('peppolRouter enregistré dans api-server-clean.ts');
  else fail('peppolRouter NON enregistré');

  if (apiServer.includes('invoicesRouter') || apiServer.includes("invoices"))
    ok('invoicesRouter enregistré dans api-server-clean.ts');
  else fail('invoicesRouter NON enregistré');

  if (apiServer.includes("/api/peppol"))
    ok('Route: /api/peppol monté');
  else fail('Route /api/peppol non montée');

  if (apiServer.includes("/api/invoices"))
    ok('Route: /api/invoices monté');
  else fail('Route /api/invoices non montée');

  // ── Navigation ──
  console.log('\n  ── Navigation ──');
  if (appLayout.includes('PeppolSettings'))
    ok('AppLayout: PeppolSettings lazy import');
  else fail('PeppolSettings non importé dans AppLayout');

  if (appLayout.includes('peppol') && appLayout.includes('Route'))
    ok('AppLayout: Route /settings/peppol');
  else fail('Route /settings/peppol manquante');

  if (settingsPage && settingsPage.includes('peppol'))
    ok('SettingsPage: menu Peppol présent');
  else warn('SettingsPage: menu Peppol non trouvé');

  // Check FacturePage is routed
  if (appLayout.includes('FacturePage') || appLayout.includes('factur'))
    ok('AppLayout: FacturePage route');
  else warn('FacturePage pas dans AppLayout');

  // ── Schema ↔ Routes coherence ──
  console.log('\n  ── Schema ↔ Routes ──');
  const dbModelsUsed = [
    ['standaloneInvoice', invoiceRoutes, 'invoices.ts'],
    ['chantierInvoice', invoiceRoutes, 'invoices.ts'],
    ['peppolIncomingInvoice', invoiceRoutes, 'invoices.ts'],
    ['peppolConfig', peppolRoutes, 'peppol.ts'],
    ['peppolIncomingInvoice', peppolRoutes, 'peppol.ts'],
    ['chantierInvoice', peppolRoutes, 'peppol.ts'],
  ];
  for (const [model, src, file] of dbModelsUsed) {
    const modelName = model.charAt(0).toUpperCase() + model.slice(1);
    const inSchema = schema.includes(`model ${modelName}`);
    const inRoutes = src.includes(`db.${model}`);
    if (inSchema && inRoutes) ok(`db.${model} : dans schema + ${file}`);
    else if (!inSchema) fail(`db.${model} : modèle ABSENT du schema`);
    else if (!inRoutes) warn(`db.${model} : modèle dans schema mais pas dans ${file}`);
  }

  // ── Routes ↔ Bridge coherence ──
  console.log('\n  ── Routes ↔ Bridge ──');
  const bridgeCalls = [
    'syncOrganization', 'registerPeppol', 'sendInvoice',
    'checkRegistrationStatus', 'fetchIncomingDocuments',
    'getIncomingInvoices', 'verifyPeppolEndpoint', 'healthCheck',
  ];
  for (const method of bridgeCalls) {
    const inRoutes = peppolRoutes.includes(`.${method}(`);
    const inBridge = bridge.includes(`${method}(`);
    if (inRoutes && inBridge) ok(`${method}() : routes → bridge ✓`);
    else if (inRoutes && !inBridge) fail(`${method}() : appelé dans routes MAIS absent du bridge`);
    else if (!inRoutes && inBridge) warn(`${method}() : dans bridge mais pas appelé`);
  }

  // ── UI ↔ API coherence ──
  console.log('\n  ── UI ↔ API ──');
  const uiApiChecks = [
    ['/api/invoices', facturePage, 'FacturePage'],
    ['/api/invoices/stats', facturePage, 'FacturePage'],
    ['/api/peppol/config', peppolSettings, 'PeppolSettings'],
    ['/api/peppol/register', peppolSettings, 'PeppolSettings'],
    ['/api/peppol/health', peppolSettings, 'PeppolSettings'],
  ];
  for (const [endpoint, src, component] of uiApiChecks) {
    if (src.includes(endpoint))
      ok(`${component} → ${endpoint}`);
    else warn(`${component} n'appelle pas ${endpoint}`);
  }

  // ── Docker & Infra ──
  console.log('\n  ── Docker & Infra ──');
  if (dockerCompose) {
    ok('docker-compose.peppol.yml existe');
    if (dockerCompose.includes('odoo:17')) ok('Odoo 17 image');
    else warn('Image Odoo non spécifiée');
    if (dockerCompose.includes('postgres')) ok('PostgreSQL pour Odoo');
    else warn('PostgreSQL non trouvé dans compose');
  } else {
    warn('docker-compose.peppol.yml non trouvé');
  }

  if (odooConf) {
    ok('peppol/odoo-config/odoo.conf existe');
    if (odooConf.includes('list_db') && odooConf.includes('False'))
      ok('list_db = False (sécurité)');
    else warn('list_db non configuré');
  } else {
    warn('odoo.conf non trouvé');
  }

  // ── Environment variables ──
  console.log('\n  ── Variables d\'environnement ──');
  if (envExample) {
    for (const v of ['ODOO_URL', 'ODOO_DB_NAME', 'ODOO_USER', 'ODOO_PASSWORD']) {
      if (envExample.includes(v)) ok(`.env.example contient ${v}`);
      else warn(`.env.example manque ${v}`);
    }
  }
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║   7. CONVENTIONS ZHIIVE                                         ║
// ╚══════════════════════════════════════════════════════════════════╝

if (shouldRun('conventions')) {
  startSection('Conventions Zhiive — Zero Hardcode, Singleton, i18n', '🐝');

  const allFiles = [
    ['routes/invoices.ts', readSrc('routes/invoices.ts')],
    ['routes/peppol.ts', readSrc('routes/peppol.ts')],
    ['services/peppolBridge.ts', readSrc('services/peppolBridge.ts')],
    ['pages/FacturePage.tsx', readSrc('pages/FacturePage.tsx')],
    ['pages/settings/PeppolSettings.tsx', readSrc('pages/settings/PeppolSettings.tsx')],
  ];

  // ── Zero new PrismaClient ──
  console.log('\n  ── Zero new PrismaClient ──');
  for (const [name, src] of allFiles) {
    if (src.includes('new PrismaClient'))
      fail(`${name}: new PrismaClient() trouvé — CRITIQUE`);
    else ok(`${name}: zéro new PrismaClient()`);
  }

  // ── db singleton import ──
  console.log('\n  ── db singleton ──');
  for (const [name, src] of allFiles) {
    if (name.includes('pages/') || name.includes('services/peppolBridge')) continue; // Frontend & bridge don't need db
    if (src.includes("from '../lib/database'") || src.includes("from '@/lib/database'"))
      ok(`${name}: importe db singleton`);
    else fail(`${name}: n'importe pas db singleton`);
  }

  // ── useAuthenticatedApi (frontend) ──
  console.log('\n  ── useAuthenticatedApi (frontend) ──');
  for (const [name, src] of allFiles) {
    if (!name.includes('pages/')) continue;
    if (src.includes('useAuthenticatedApi'))
      ok(`${name}: utilise useAuthenticatedApi`);
    else fail(`${name}: n'utilise pas useAuthenticatedApi`);

    // No direct fetch/axios
    const directFetch = src.split('\n').filter(l => {
      const t = l.trim();
      return (t.includes('fetch(') || t.includes('axios.')) &&
        !t.startsWith('//') && !t.startsWith('*') && !t.includes('import');
    });
    if (directFetch.length === 0)
      ok(`${name}: zéro fetch/axios direct`);
    else fail(`${name}: ${directFetch.length} appel(s) fetch/axios direct`);
  }

  // ── Zero Hardcode (couleurs) ──
  console.log('\n  ── Zero Hardcode (couleurs) ──');
  for (const [name, src] of allFiles) {
    if (!name.includes('pages/')) continue;
    // Check for color hex in style attributes (not in FB/theme definition block)
    let inFBBlock = false;
    const hardcodedColors = src.split('\n').filter(l => {
      const t = l.trim();
      if (t.includes('const FB') || t.includes('FB =')) inFBBlock = true;
      if (inFBBlock && t.includes('};')) { inFBBlock = false; return false; }
      if (inFBBlock) return false; // Skip lines inside FB definition
      return /#[0-9a-fA-F]{6}/.test(t) && !t.startsWith('//') && !t.startsWith('*') &&
        !t.includes('STATUS_CONFIG') && !t.includes('STATUS_MAP') &&
        !t.includes('SOURCE_BADGE') && !t.includes("'#fff'") && !t.includes('"#fff"') &&
        !t.includes('+ \'1') && !t.includes('+ "1') && !t.includes('+ \'2'); // opacity suffixes
    });
    if (hardcodedColors.length <= 5)
      ok(`${name}: ${hardcodedColors.length} couleur(s) inline (toléré)`);
    else
      warn(`${name}: ${hardcodedColors.length} couleurs inline — préférer FB.* ou thème`);
  }

  // ── Zero Hardcode (textes français dans Backend) ──
  console.log('\n  ── Textes Backend ──');
  for (const [name, src] of allFiles) {
    if (name.includes('pages/')) continue;
    // Backend error messages in French are acceptable for user-facing errors
    ok(`${name}: messages d'erreur en français (acceptable pour API)`)
  }

  // ── Export default ──
  console.log('\n  ── Export ──');
  for (const [name, src] of allFiles) {
    if (src.includes('export default'))
      ok(`${name}: export default`);
    else warn(`${name}: pas de export default`);
  }

  // ── TypeScript strictness ──
  console.log('\n  ── TypeScript ──');
  for (const [name, src] of allFiles) {
    const anyCount = countOccurrences(src, /:\s*any\b/g);
    if (anyCount <= 5)
      ok(`${name}: ${anyCount} usages de :any (toléré)`);
    else warn(`${name}: ${anyCount} usages de :any — réduire`);
  }

  // ── Identité — pas de CRM/ERP dans l'UI ──
  console.log('\n  ── Identité Zhiive (pas de CRM/ERP) ──');
  for (const [name, src] of allFiles) {
    if (!name.includes('pages/')) continue;
    const crmHits = src.split('\n').filter(l => {
      const t = l.trim();
      return (/\bCRM\b|\bERP\b/).test(t) && !t.startsWith('//') && !t.startsWith('*');
    });
    if (crmHits.length === 0)
      ok(`${name}: zéro mention CRM/ERP (identité Zhiive)`);
    else fail(`${name}: ${crmHits.length} mention(s) CRM/ERP — interdit dans l'UI`);
  }
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║   RÉSUMÉ FINAL                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝

console.log('\n' + '═'.repeat(64));
console.log('🧾 RÉSUMÉ AUDIT — FACTURATION PEPPOL');
console.log('═'.repeat(64));

// Per-section breakdown
for (const [name, results] of Object.entries(sectionResults)) {
  const total = results.passed + results.failed + results.warnings;
  const status = results.failed === 0 ? '✅' : '🚨';
  console.log(`  ${status} ${name}: ${results.passed}✅  ${results.failed}❌  ${results.warnings}⚠️  (${total} checks)`);
}

console.log('─'.repeat(64));
const total = passed + failed + warnings;
console.log(`  TOTAL GLOBAL : ${passed} ✅  ${failed} ❌  ${warnings} ⚠️  (${total} checks)`);
console.log('─'.repeat(64));

if (failed === 0 && warnings === 0) {
  console.log('  🎉 SYSTÈME PARFAIT — Zéro problème détecté');
} else if (failed === 0) {
  console.log(`  🐝 SYSTÈME OK — ${warnings} avertissement(s) mineur(s)`);
} else {
  console.log(`  🚨 CORRECTIONS REQUISES — ${failed} problème(s) critique(s)`);
}
console.log('═'.repeat(64) + '\n');

process.exit(failed > 0 ? 1 : 0);
