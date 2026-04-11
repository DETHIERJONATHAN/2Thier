#!/usr/bin/env npx tsx
/**
 * Tests — Envoi Peppol unifié (ChantierInvoice + StandaloneInvoice)
 *
 * Vérifie que la route POST /send/:invoiceId supporte les deux types
 * de factures et que le fallback fonctionne correctement.
 *
 * Usage:
 *   npx tsx tests/peppol/peppol-send-unified.test.ts
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

describe('Peppol send unified audit', () => {
it('audit checks pass', () => {

console.log('\n⚡ TEST — Envoi Peppol unifié (ChantierInvoice + StandaloneInvoice)\n');

const routes = readSrc('routes/peppol.ts');
if (!routes) { fail('routes/peppol.ts manquant'); }
ok('routes/peppol.ts existe');

// ══════════════════════════════════════════════════
// 1. SUPPORT DUAL TABLE (ChantierInvoice + StandaloneInvoice)
// ══════════════════════════════════════════════════
console.log('\n  ── Support dual-table dans POST /send/:invoiceId ──');

// Extraire la zone du POST /send/:invoiceId
const sendRouteMatch = routes.match(/router\.post\('\/send\/:invoiceId'[\s\S]*?(?=\/\/ ── (GET|POST|PUT|DELETE)|router\.(get|post|put|delete)\('\/send\/:invoiceId\/status|$)/);
const sendRoute = sendRouteMatch?.[0] || '';

if (sendRoute.includes('db.chantierInvoice.findFirst'))
  ok('POST /send : cherche dans ChantierInvoice');
else fail('POST /send : ne cherche PAS dans ChantierInvoice');

if (sendRoute.includes('db.standaloneInvoice.findFirst'))
  ok('POST /send : cherche dans StandaloneInvoice (fallback)');
else fail('POST /send : ne cherche PAS dans StandaloneInvoice');

// Vérifier l'ordre : ChantierInvoice d'abord, StandaloneInvoice ensuite
const chantierIdx = sendRoute.indexOf('db.chantierInvoice.findFirst');
const standaloneIdx = sendRoute.indexOf('db.standaloneInvoice.findFirst');
if (chantierIdx >= 0 && standaloneIdx >= 0 && chantierIdx < standaloneIdx)
  ok('POST /send : ordre correct → ChantierInvoice d\'abord, StandaloneInvoice ensuite');
else if (chantierIdx >= 0 && standaloneIdx >= 0)
  warn('POST /send : StandaloneInvoice est avant ChantierInvoice (vérifier)');

// Vérifier que les deux tables sont mises à jour (PROCESSING)
const chantierUpdateCount = (sendRoute.match(/db\.chantierInvoice\.update/g) || []).length;
const standaloneUpdateCount = (sendRoute.match(/db\.standaloneInvoice\.update/g) || []).length;
if (chantierUpdateCount >= 2)
  ok(`POST /send : ChantierInvoice.update() appelé ${chantierUpdateCount}x (processing + result)`);
else warn(`POST /send : ChantierInvoice.update() appelé seulement ${chantierUpdateCount}x`);

if (standaloneUpdateCount >= 2)
  ok(`POST /send : StandaloneInvoice.update() appelé ${standaloneUpdateCount}x (processing + result)`);
else warn(`POST /send : StandaloneInvoice.update() appelé seulement ${standaloneUpdateCount}x`);

// ══════════════════════════════════════════════════
// 2. VARIABLE invoiceSource POUR BRANCHER LA LOGIQUE
// ══════════════════════════════════════════════════
console.log('\n  ── Logique de branchement par source ──');

if (sendRoute.includes("invoiceSource"))
  ok('POST /send : variable invoiceSource pour le dispatching');
else fail('POST /send : pas de variable invoiceSource — logique non branchée');

if (sendRoute.includes("'chantier'") && sendRoute.includes("'standalone'"))
  ok('POST /send : deux sources reconnues (chantier + standalone)');
else fail('POST /send : sources manquantes dans le dispatching');

// Vérifier les conditions de branchement
if (sendRoute.includes("invoiceSource === 'chantier'") || sendRoute.includes("invoiceSource === 'standalone'"))
  ok('POST /send : conditions de branchement par source');
else fail('POST /send : pas de condition de branchement par source');

// ══════════════════════════════════════════════════
// 3. DONNÉES PARTENAIRE DEPUIS LES DEUX SOURCES
// ══════════════════════════════════════════════════
console.log('\n  ── Résolution données partenaire ──');

if (sendRoute.includes('clientName'))
  ok('POST /send : utilise clientName pour résolution partenaire');
else warn('POST /send : clientName non utilisé pour résolution');

if (sendRoute.includes('clientVat'))
  ok('POST /send : utilise clientVat pour résolution partenaire');
else warn('POST /send : clientVat non utilisé');

// ══════════════════════════════════════════════════
// 4. LIGNES DE FACTURE DÉTAILLÉES (StandaloneInvoice)
// ══════════════════════════════════════════════════
console.log('\n  ── Lignes de facture (StandaloneInvoice) ──');

if (sendRoute.includes('lines') && sendRoute.includes('parsedLines'))
  ok('POST /send : lit les lignes JSON de StandaloneInvoice');
else if (sendRoute.includes('.lines'))
  ok('POST /send : accède aux lignes de facture');
else warn('POST /send : pas de lecture des lignes détaillées StandaloneInvoice');

if (sendRoute.includes('sendLines'))
  ok('POST /send : construit sendLines adaptées par source');
else warn('POST /send : pas de construction sendLines');

// ══════════════════════════════════════════════════
// 5. GESTION D'ERREUR DUAL
// ══════════════════════════════════════════════════
console.log('\n  ── Gestion erreur dual-table ──');

// En cas d'erreur, les deux tables doivent être tentées
const catchBlock = sendRoute.match(/catch\s*\(error\)[\s\S]*$/)?.[0] || '';
if (catchBlock.includes('db.chantierInvoice.update') && catchBlock.includes('db.standaloneInvoice.update'))
  ok('POST /send : catch met à jour ERROR dans les deux tables');
else if (catchBlock.includes('db.chantierInvoice.update'))
  warn('POST /send : catch ne met à jour que ChantierInvoice (pas StandaloneInvoice)');
else fail('POST /send : catch ne gère pas les mises à jour d\'erreur');

// Vérifier .catch(() => {}) pour les mises à jour d'erreur (ne pas crasher sur un 404)
if (catchBlock.includes('.catch(() => {})') || catchBlock.includes('.catch(() =>'))
  ok('POST /send : .catch(() => {}) sur les updates d\'erreur (sécurisé)');
else warn('POST /send : pas de .catch() sur les updates d\'erreur');

// ══════════════════════════════════════════════════
// 6. GET /send/:invoiceId/status — DUAL TABLE
// ══════════════════════════════════════════════════
console.log('\n  ── GET /send/:invoiceId/status — dual table ──');

// Extraire la zone du GET /send/:invoiceId/status
const statusRouteStart = routes.indexOf("router.get('/send/:invoiceId/status'");
let statusRoute = '';
if (statusRouteStart >= 0) {
  const statusRouteEnd = routes.indexOf('router.', statusRouteStart + 10);
  statusRoute = statusRouteEnd > 0
    ? routes.slice(statusRouteStart, statusRouteEnd)
    : routes.slice(statusRouteStart, statusRouteStart + 1500);
}

if (statusRoute.includes('db.chantierInvoice.findFirst'))
  ok('GET /send/status : cherche dans ChantierInvoice');
else fail('GET /send/status : ne cherche PAS dans ChantierInvoice');

if (statusRoute.includes('db.standaloneInvoice.findFirst'))
  ok('GET /send/status : cherche dans StandaloneInvoice (fallback)');
else fail('GET /send/status : ne cherche PAS dans StandaloneInvoice');

// ══════════════════════════════════════════════════
// 7. SCHEMA PRISMA — CHAMPS PEPPOL
// ══════════════════════════════════════════════════
console.log('\n  ── Schema Prisma — champs Peppol ──');

const schema = fs.readFileSync(path.join(ROOT, 'prisma', 'schema.prisma'), 'utf-8');

const peppolFields = ['peppolStatus', 'peppolMessageId', 'peppolError', 'peppolSentAt'];
for (const model of ['StandaloneInvoice', 'ChantierInvoice']) {
  // Extraire le bloc du modèle en comptant les accolades
  const modelStart = schema.indexOf(`model ${model} {`);
  let modelDef = '';
  if (modelStart >= 0) {
    let depth = 0;
    let started = false;
    for (let i = modelStart; i < schema.length; i++) {
      if (schema[i] === '{') { depth++; started = true; }
      if (schema[i] === '}') { depth--; }
      modelDef += schema[i];
      if (started && depth === 0) break;
    }
  }
  for (const field of peppolFields) {
    if (modelDef.includes(field))
      ok(`${model}.${field} : présent dans le schema`);
    else fail(`${model}.${field} : ABSENT du schema`);
  }
}

// ── Summary ──
console.log('\n' + '─'.repeat(55));
console.log(`  TOTAL : ${passed} ✅  ${failed} ❌  ${warnings} ⚠️`);
if (failed === 0) console.log('  🎉 Envoi Peppol unifié — TOUT OK');
else console.log('  🚨 Envoi Peppol unifié — corrections nécessaires');
console.log('─'.repeat(55) + '\n');

expect(failed).toBe(0);
});
});
