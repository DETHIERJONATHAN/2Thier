#!/usr/bin/env npx tsx
/**
 * Tests unitaires — PeppolBridge (Odoo JSON-RPC Client)
 *
 * Vérifie la structure, les exports et la logique de transformation
 * du service peppolBridge SANS nécessiter une connexion Odoo.
 *
 * Usage:
 *   npx tsx tests/peppol/peppol-bridge.test.ts
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

describe('PeppolBridge audit', () => {
it('audit checks pass', () => {

console.log('\n🔌 TEST — PeppolBridge (structure & conventions)\n');

// ── 1. Fichier existe ──
const bridgePath = path.join(SRC, 'services', 'peppolBridge.ts');
const bridgeSrc = fs.existsSync(bridgePath) ? fs.readFileSync(bridgePath, 'utf-8') : '';

if (bridgeSrc) ok('peppolBridge.ts existe');
else { fail('peppolBridge.ts manquant'); }

// ── 2. Exports corrects ──
if (bridgeSrc.includes('export class PeppolBridge'))  ok('export class PeppolBridge');
else fail('PeppolBridge non exporté');

if (bridgeSrc.includes('export function getPeppolBridge'))
  ok('export function getPeppolBridge (singleton)');
else fail('getPeppolBridge non exporté');

// ── 3. Pattern singleton ──
// The singleton should reuse the same instance
const singletonMatch = bridgeSrc.match(/let\s+_instance\s*[:|=]|const\s+_instance|_bridgeInstance/);
if (singletonMatch || bridgeSrc.includes('if (!')) ok('Pattern singleton détecté');
else warn('Pattern singleton non clair — vérifier getPeppolBridge()');

// ── 4. Utilise process.env pour toute la config Odoo ──
const envVars = ['ODOO_URL', 'ODOO_DB_NAME', 'ODOO_USER', 'ODOO_PASSWORD'];
for (const v of envVars) {
  if (bridgeSrc.includes(`process.env.${v}`)) ok(`Utilise process.env.${v}`);
  else fail(`process.env.${v} non trouvé`);
}

// ── 5. Méthodes JSON-RPC fondamentales ──
const methods = [
  'authenticate',
  'syncOrganization',
  'registerPeppol',
  'sendInvoice',
  'checkInvoiceStatus',
  'fetchIncomingDocuments',
  'getIncomingInvoices',
  'verifyPeppolEndpoint',
  'healthCheck',
];
for (const m of methods) {
  const regex = new RegExp(`\\b${m}\\s*\\(`);
  if (regex.test(bridgeSrc)) ok(`Méthode ${m}() présente`);
  else warn(`Méthode ${m}() non trouvée`);
}

// ── 6. JSON-RPC format ──
if (bridgeSrc.includes("'jsonrpc'") || bridgeSrc.includes('"jsonrpc"') || bridgeSrc.includes('jsonrpc:'))
  ok('Utilise le protocole JSON-RPC');
else fail('Protocole JSON-RPC non détecté');

if (bridgeSrc.includes("'2.0'") || bridgeSrc.includes('"2.0"'))
  ok('JSON-RPC version 2.0');
else warn('Version JSON-RPC 2.0 non explicite');

// ── 7. Pas de hardcode URL ──
const hardcodedUrlRegex = /['"`]https?:\/\/(?!localhost)[a-zA-Z0-9.-]+:\d+/;
const nonLocalHardcoded = bridgeSrc.split('\n').filter(l => {
  const t = l.trim();
  return hardcodedUrlRegex.test(t) && !t.startsWith('//') && !t.startsWith('*');
});
if (nonLocalHardcoded.length === 0) ok('Zéro URL Odoo hardcodée (hors localhost fallback)');
else warn(`${nonLocalHardcoded.length} URL(s) hardcodée(s)`, nonLocalHardcoded[0]?.trim());

// ── 8. Pas de new PrismaClient ──
if (!bridgeSrc.includes('new PrismaClient')) ok('Zéro new PrismaClient()');
else fail('new PrismaClient() trouvé — utiliser db singleton');

// ── 9. Gestion d'erreur ──
const tryCatchCount = (bridgeSrc.match(/try\s*{/g) || []).length;
if (tryCatchCount >= 3) ok(`Gestion erreurs : ${tryCatchCount} blocs try/catch`);
else warn(`Gestion erreurs : seulement ${tryCatchCount} blocs try/catch`);

// ── 10. Interfaces typées ──
const interfaces = ['OdooJsonRpcResponse', 'OdooCompany', 'OdooInvoice'];
for (const iface of interfaces) {
  if (bridgeSrc.includes(`interface ${iface}`)) ok(`Interface ${iface} définie`);
  else warn(`Interface ${iface} non définie`);
}

// ── 11. Pas de console.log en production (warn/error OK) ──
const consoleLogLines = bridgeSrc.split('\n').filter(l => {
  const t = l.trim();
  return t.includes('console.log(') && !t.startsWith('//') && !t.startsWith('*');
});
if (consoleLogLines.length <= 2) ok(`Console.log : ${consoleLogLines.length} (acceptable)`);
else warn(`Console.log : ${consoleLogLines.length} occurrences (réduire en prod)`);

// ── Summary ──
console.log('\n' + '─'.repeat(50));
console.log(`  TOTAL : ${passed} ✅  ${failed} ❌  ${warnings} ⚠️`);
if (failed === 0) console.log('  🎉 PeppolBridge OK');
else console.log('  🚨 PeppolBridge — corrections nécessaires');
console.log('─'.repeat(50) + '\n');

expect(failed).toBe(0);
});
});
