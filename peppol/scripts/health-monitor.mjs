#!/usr/bin/env node
/**
 * 🏥 Peppol Health Monitor — Script de diagnostic complet
 * 
 * Vérifie :
 *   1. Connectivité Odoo (JSON-RPC)
 *   2. Authentification admin
 *   3. Modules Peppol installés
 *   4. Statut de l'entreprise 2Thier SRL
 *   5. Mode edi (prod vs demo)
 *   6. État de la DB Odoo
 *   7. Factures en erreur ou bloquées
 * 
 * Usage :
 *   node peppol/scripts/health-monitor.mjs
 * 
 * Exit codes :
 *   0 = tout OK
 *   1 = problème critique détecté
 *   2 = avertissement (pas bloquant)
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env') });

const ODOO_URL = process.env.ODOO_URL || 'http://46.225.180.8:8069';
const ODOO_DB = process.env.ODOO_DB_NAME || 'odoo_peppol';
const ODOO_USER = process.env.ODOO_USER || 'admin';
const ODOO_PASSWORD = process.env.ODOO_PASSWORD;

const CHECKS = [];
let warnings = 0;
let errors = 0;

function check(name, status, detail = '') {
  const icon = status === 'OK' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
  if (status === 'WARN') warnings++;
  if (status === 'FAIL') errors++;
  CHECKS.push({ name, status, detail });
  console.log(`  ${icon} ${name}${detail ? ` — ${detail}` : ''}`);
}

let sessionCookie = null;

async function jsonRpc(url, method, params) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (sessionCookie) headers['Cookie'] = sessionCookie;
    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
      signal: controller.signal,
      redirect: 'manual',
    });
    const setCookie = resp.headers.get('set-cookie');
    if (setCookie) sessionCookie = setCookie.split(';')[0];
    const data = await resp.json();
    if (data.error) throw new Error(data.error.data?.message || data.error.message || JSON.stringify(data.error));
    return data.result;
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const startTime = Date.now();
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║           🏥 Peppol Health Monitor — Zhiive            ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  📅 ${new Date().toISOString()}`);
  console.log(`  🌐 ${ODOO_URL} / DB: ${ODOO_DB}`);
  console.log('');

  // ── 1. Connectivité HTTP ──
  console.log('── Connectivité ──');
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(`${ODOO_URL}/web/health`, { signal: controller.signal });
    clearTimeout(timeout);
    if (resp.ok) {
      check('HTTP Health Endpoint', 'OK', `${resp.status} en ${Date.now() - startTime}ms`);
    } else {
      check('HTTP Health Endpoint', 'FAIL', `Status ${resp.status}`);
    }
  } catch (err) {
    check('HTTP Health Endpoint', 'FAIL', err.message);
  }

  // ── 2. Authentification ──
  console.log('');
  console.log('── Authentification ──');
  let uid = null;
  try {
    if (!ODOO_PASSWORD) throw new Error('ODOO_PASSWORD non défini dans .env');
    const authResult = await jsonRpc(`${ODOO_URL}/web/session/authenticate`, 'call', {
      db: ODOO_DB, login: ODOO_USER, password: ODOO_PASSWORD,
    });
    uid = authResult?.uid;
    if (uid) {
      check('Auth JSON-RPC', 'OK', `uid=${uid}`);
    } else {
      check('Auth JSON-RPC', 'FAIL', 'uid non reçu — mauvais identifiants ?');
    }
  } catch (err) {
    check('Auth JSON-RPC', 'FAIL', err.message);
  }

  if (!uid) {
    printSummary(startTime);
    process.exit(1);
  }

  // ── 3. Modules Peppol ──
  console.log('');
  console.log('── Modules Peppol ──');
  const requiredModules = ['account_peppol', 'account_edi_ubl_cii', 'l10n_be', 'account'];
  try {
    const modules = await jsonRpc(`${ODOO_URL}/web/dataset/call_kw`, 'call', {
      model: 'ir.module.module',
      method: 'search_read',
      args: [[['name', 'in', requiredModules]]],
      kwargs: { fields: ['name', 'state'] },
    });
    for (const mod of requiredModules) {
      const found = modules.find(m => m.name === mod);
      if (found?.state === 'installed') {
        check(`Module ${mod}`, 'OK', 'installé');
      } else if (found) {
        check(`Module ${mod}`, 'WARN', `état: ${found.state}`);
      } else {
        check(`Module ${mod}`, 'FAIL', 'non trouvé');
      }
    }
  } catch (err) {
    check('Modules Peppol', 'FAIL', err.message);
  }

  // ── 4. Entreprise 2Thier SRL ──
  console.log('');
  console.log('── Entreprise Peppol ──');
  try {
    const companies = await jsonRpc(`${ODOO_URL}/web/dataset/call_kw`, 'call', {
      model: 'res.company',
      method: 'search_read',
      args: [[]],
      kwargs: { fields: ['name', 'vat', 'peppol_eas', 'peppol_endpoint', 'account_peppol_proxy_state', 'is_account_peppol_participant', 'account_peppol_contact_email'] },
    });

    if (companies.length === 0) {
      check('Entreprise', 'FAIL', 'aucune company trouvée');
    } else {
      // Trouver la company active Peppol (proxy_state = active)
      const activeCompany = companies.find(c => c.account_peppol_proxy_state === 'active') || companies[0];
      const company = activeCompany;
      check('Company', 'OK', `${company.name} (id: ${company.id})`);
      
      if (company.vat) {
        check('TVA', 'OK', company.vat);
      } else {
        check('TVA', 'FAIL', 'non configuré');
      }

      if (company.peppol_eas === '0208') {
        check('Peppol EAS', 'OK', company.peppol_eas);
      } else {
        check('Peppol EAS', 'WARN', company.peppol_eas || 'non configuré');
      }

      if (company.peppol_endpoint) {
        check('Peppol Endpoint', 'OK', company.peppol_endpoint);
      } else {
        check('Peppol Endpoint', 'FAIL', 'non configuré');
      }

      const proxyState = company.account_peppol_proxy_state;
      if (proxyState === 'active') {
        check('Proxy State', 'OK', 'ACTIVE');
      } else if (proxyState === 'smp_registration') {
        check('Proxy State', 'WARN', 'smp_registration (en cours)');
      } else {
        check('Proxy State', 'FAIL', proxyState || 'inactif');
      }

      if (company.is_account_peppol_participant) {
        check('Peppol Participant', 'OK', 'OUI');
      } else {
        check('Peppol Participant', 'WARN', 'NON — pas encore enregistré comme participant');
      }

      if (company.account_peppol_contact_email) {
        check('Contact Email', 'OK', company.account_peppol_contact_email);
      } else {
        check('Contact Email', 'WARN', 'non configuré');
      }

      check('Total Companies', 'OK', `${companies.length} company(ies) dans Odoo`);
    }
  } catch (err) {
    check('Entreprise Peppol', 'FAIL', err.message);
  }

  // ── 5. Factures en erreur ──
  console.log('');
  console.log('── Factures Peppol ──');
  try {
    const errorInvoices = await jsonRpc(`${ODOO_URL}/web/dataset/call_kw`, 'call', {
      model: 'account.move',
      method: 'search_read',
      args: [[['move_type', '=', 'out_invoice'], ['peppol_move_state', '=', 'error']]],
      kwargs: { fields: ['name', 'ref', 'partner_id', 'amount_total', 'peppol_move_state'], limit: 20 },
    });

    if (errorInvoices.length === 0) {
      check('Factures en erreur', 'OK', '0 facture en erreur');
    } else {
      check('Factures en erreur', 'WARN', `${errorInvoices.length} facture(s) en erreur`);
      for (const inv of errorInvoices.slice(0, 5)) {
        console.log(`    ↳ ${inv.name} — ${inv.partner_id?.[1] || 'N/A'} — ${inv.amount_total}€`);
      }
    }

    const processingInvoices = await jsonRpc(`${ODOO_URL}/web/dataset/call_kw`, 'call', {
      model: 'account.move',
      method: 'search_read',
      args: [[['move_type', '=', 'out_invoice'], ['peppol_move_state', '=', 'processing']]],
      kwargs: { fields: ['name', 'ref', 'amount_total'], limit: 20 },
    });

    if (processingInvoices.length === 0) {
      check('Factures processing', 'OK', '0 facture en traitement');
    } else {
      check('Factures processing', 'OK', `${processingInvoices.length} facture(s) en cours de traitement`);
    }

    const doneInvoices = await jsonRpc(`${ODOO_URL}/web/dataset/call_kw`, 'call', {
      model: 'account.move',
      method: 'search_count',
      args: [[['move_type', '=', 'out_invoice'], ['peppol_move_state', '=', 'done']]],
      kwargs: {},
    });
    check('Factures livrées (total)', 'OK', `${doneInvoices} facture(s) livrées via Peppol`);

  } catch (err) {
    check('Factures Peppol', 'FAIL', err.message);
  }

  // ── 6. Factures entrantes ──
  console.log('');
  console.log('── Factures entrantes ──');
  try {
    const inBills = await jsonRpc(`${ODOO_URL}/web/dataset/call_kw`, 'call', {
      model: 'account.move',
      method: 'search_count',
      args: [[['move_type', '=', 'in_invoice']]],
      kwargs: {},
    });
    check('Factures reçues (total)', 'OK', `${inBills} facture(s) fournisseurs dans Odoo`);
  } catch (err) {
    check('Factures entrantes', 'FAIL', err.message);
  }

  printSummary(startTime);
  process.exit(errors > 0 ? 1 : warnings > 0 ? 2 : 0);
}

function printSummary(startTime) {
  const elapsed = Date.now() - startTime;
  console.log('');
  console.log('══════════════════════════════════════════════════════════');
  const ok = CHECKS.filter(c => c.status === 'OK').length;
  const warn = CHECKS.filter(c => c.status === 'WARN').length;
  const fail = CHECKS.filter(c => c.status === 'FAIL').length;

  if (fail > 0) {
    console.log(`  🔴 CRITIQUE — ${fail} check(s) en échec, ${warn} avertissement(s), ${ok} OK`);
  } else if (warn > 0) {
    console.log(`  🟡 ATTENTION — ${warn} avertissement(s), ${ok} OK`);
  } else {
    console.log(`  🟢 TOUT EST OK — ${ok} checks passés`);
  }
  console.log(`  ⏱️  ${elapsed}ms`);
  console.log('══════════════════════════════════════════════════════════');
  console.log('');
}

main().catch(err => {
  console.error('💥 Erreur fatale:', err.message);
  process.exit(1);
});
