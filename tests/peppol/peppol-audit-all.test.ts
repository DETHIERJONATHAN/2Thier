#!/usr/bin/env npx tsx
/**
 * 🐝 Audit Peppol complet — Lance tous les tests du dossier peppol/
 *
 * Vérifie l'intégrité de tout le système Peppol :
 *   1. Routes API (structure, sécurité, auth)
 *   2. Envoi unifié (ChantierInvoice + StandaloneInvoice)
 *   3. Bouton Peppol dans FacturePage
 *   4. PeppolBridge (connexion Odoo)
 *   5. Cron checker (transition + santé)
 *   6. Intégration end-to-end (schema ↔ routes ↔ bridge ↔ UI)
 *   7. Auto-fetch incoming (cron)
 *
 * Usage:
 *   npx tsx tests/peppol/peppol-audit-all.test.ts
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

// Liste des tests d'audit statiques (lancés avec tsx — PAS d'import vitest)
const staticTests: { name: string; file: string }[] = [
  // Tous convertis en tests Vitest — voir vitestTests ci-dessous
];

// Tests Vitest (lancés avec vitest — contiennent import { ... } from 'vitest')
const vitestTests = [
  { name: 'Routes API Peppol',                  file: 'peppol-routes.test.ts' },
  { name: 'Envoi unifié (dual-table)',           file: 'peppol-send-unified.test.ts' },
  { name: 'Bouton Peppol FacturePage',           file: 'peppol-facture-ui.test.ts' },
  { name: 'PeppolBridge (Odoo)',                 file: 'peppol-bridge.test.ts' },
  { name: 'Intégration E2E',                     file: 'peppol-integration.test.ts' },
  { name: 'Cron Checker (unit)',                 file: 'peppol-cron-checker.test.ts' },
  { name: 'Cron Fetch Incoming (unit)',           file: 'peppol-fetch-incoming-cron.test.ts' },
  { name: 'Système Peppol complet',              file: 'peppol-system.test.ts' },
  { name: 'VAT Lookup + Peppol',                 file: 'vat-lookup-peppol.test.ts' },
  { name: 'Désinscription Peppol',               file: 'peppol-deregister.test.ts' },
];

console.log('\n' + '═'.repeat(60));
console.log('  🐝 AUDIT PEPPOL COMPLET — Zhiive');
console.log('═'.repeat(60) + '\n');

describe('Peppol audit-all orchestrator', () => {
it('all audit suites pass', () => {

let totalPassed = 0;
let totalFailed = 0;
let totalSkipped = 0;

// ── Tests d'audit statiques ──
console.log('📋 TESTS D\'AUDIT STATIQUES (structure du code)\n');

for (const test of staticTests) {
  const testPath = path.join(__dirname, test.file);
  if (!fs.existsSync(testPath)) {
    console.log(`  ⏭️  ${test.name} — fichier manquant (${test.file})`);
    totalSkipped++;
    continue;
  }

  try {
    const output = execSync(`npx tsx "${testPath}"`, {
      cwd: ROOT,
      timeout: 30000,
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    // Compter les résultats depuis la ligne TOTAL
    const totalLine = output.split('\n').find(l => l.includes('TOTAL'));
    const passedMatch = totalLine?.match(/(\d+)\s*✅/);
    const failedMatch = totalLine?.match(/(\d+)\s*❌/);
    const p = passedMatch ? parseInt(passedMatch[1]) : 0;
    const f = failedMatch ? parseInt(failedMatch[1]) : 0;
    totalPassed += p;
    totalFailed += f;

    if (f === 0) {
      console.log(`  ✅ ${test.name} — ${p} checks OK`);
    } else {
      console.log(`  ❌ ${test.name} — ${p} ✅, ${f} ❌`);
      // Afficher les lignes ❌
      const failLines = output.split('\n').filter(l => l.includes('❌'));
      failLines.forEach(l => console.log(`     ${l.trim()}`));
    }
  } catch (err: any) {
    totalFailed++;
    const stderr = err.stderr?.toString() || '';
    const stdout = err.stdout?.toString() || '';

    // Essayer d'extraire les résultats même en cas d'exit 1
    const totalLine = stdout.split('\n').find((l: string) => l.includes('TOTAL'));
    const passedMatch = totalLine?.match(/(\d+)\s*✅/);
    const failedMatch = totalLine?.match(/(\d+)\s*❌/);
    if (passedMatch || failedMatch) {
      const p = passedMatch ? parseInt(passedMatch[1]) : 0;
      const f = failedMatch ? parseInt(failedMatch[1]) : 0;
      totalPassed += p;
      totalFailed += (f - 1); // -1 car on a déjà compté 1 fail
      console.log(`  ❌ ${test.name} — ${p} ✅, ${f} ❌`);
      const failLines = stdout.split('\n').filter((l: string) => l.includes('❌'));
      failLines.forEach((l: string) => console.log(`     ${l.trim()}`));
    } else {
      console.log(`  💥 ${test.name} — CRASH`);
      if (stderr) console.log(`     ${stderr.split('\n')[0]}`);
    }
  }
}

// ── Tests Vitest ──
console.log('\n📋 TESTS VITEST (logique mockée)\n');

for (const test of vitestTests) {
  const testPath = path.join(__dirname, test.file);
  if (!fs.existsSync(testPath)) {
    console.log(`  ⏭️  ${test.name} — fichier manquant (${test.file})`);
    totalSkipped++;
    continue;
  }

  try {
    const output = execSync(`npx vitest run "${testPath}" --reporter=verbose 2>&1`, {
      cwd: ROOT,
      timeout: 60000,
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    // Compter tests passés/échoués dans la sortie vitest
    const testPassedMatch = output.match(/(\d+)\s*passed/);
    const testFailedMatch = output.match(/(\d+)\s*failed/);
    const p = testPassedMatch ? parseInt(testPassedMatch[1]) : 0;
    const f = testFailedMatch ? parseInt(testFailedMatch[1]) : 0;
    totalPassed += p;
    totalFailed += f;

    if (f === 0) {
      console.log(`  ✅ ${test.name} — ${p} tests OK`);
    } else {
      console.log(`  ❌ ${test.name} — ${p} passés, ${f} échoués`);
    }
  } catch (err: any) {
    const stdout = err.stdout?.toString() || '';
    const testPassedMatch = stdout.match(/(\d+)\s*passed/);
    const testFailedMatch = stdout.match(/(\d+)\s*failed/);

    if (testPassedMatch || testFailedMatch) {
      const p = testPassedMatch ? parseInt(testPassedMatch[1]) : 0;
      const f = testFailedMatch ? parseInt(testFailedMatch[1]) : 0;
      totalPassed += p;
      totalFailed += f;
      console.log(`  ❌ ${test.name} — ${p} passés, ${f} échoués`);
      // Afficher les lignes FAIL
      const failLines = stdout.split('\n').filter((l: string) => l.includes('FAIL') || l.includes('AssertionError') || l.includes('Expected'));
      failLines.slice(0, 5).forEach((l: string) => console.log(`     ${l.trim()}`));
    } else {
      totalFailed++;
      console.log(`  💥 ${test.name} — CRASH`);
      const stderr = err.stderr?.toString() || '';
      if (stderr) console.log(`     ${stderr.split('\n')[0]}`);
      else if (stdout) console.log(`     ${stdout.split('\n').slice(-3).join('\n     ')}`);
    }
  }
}

// ── Summary ──
console.log('\n' + '═'.repeat(60));
console.log(`  RÉSULTAT GLOBAL : ${totalPassed} ✅  ${totalFailed} ❌  ${totalSkipped} ⏭️`);
if (totalFailed === 0 && totalSkipped === 0) {
  console.log('  🎉 AUDIT PEPPOL COMPLET — TOUT EST OK !');
} else if (totalFailed === 0) {
  console.log('  ✅ AUDIT PEPPOL — OK (certains tests skippés)');
} else {
  console.log('  🚨 AUDIT PEPPOL — CORRECTIONS NÉCESSAIRES');
}
console.log('═'.repeat(60) + '\n');

expect(totalFailed).toBe(0);
});
});
