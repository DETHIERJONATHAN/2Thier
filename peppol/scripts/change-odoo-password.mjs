#!/usr/bin/env node
/**
 * Script pour changer le mot de passe admin d'Odoo en production.
 * 
 * Ce script se connecte à Odoo via JSON-RPC avec l'ancien mot de passe,
 * puis met à jour le mot de passe vers la nouvelle valeur (depuis .env).
 * 
 * Usage:
 *   node peppol/scripts/change-odoo-password.mjs [ancien_mdp]
 * 
 * Si ancien_mdp n'est pas fourni, "admin" est utilisé par défaut.
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env') });

const ODOO_URL = process.env.ODOO_URL || 'http://46.225.180.8:8069';
const ODOO_DB = process.env.ODOO_DB_NAME || 'odoo_peppol';
const ODOO_USER = process.env.ODOO_USER || 'admin';
const NEW_PASSWORD = process.env.ODOO_PASSWORD;
const OLD_PASSWORD = process.argv[2] || 'admin';

if (!NEW_PASSWORD) {
  console.error('❌ ODOO_PASSWORD non défini dans .env');
  process.exit(1);
}

if (NEW_PASSWORD === OLD_PASSWORD) {
  console.log('ℹ️  Ancien et nouveau mots de passe identiques — rien à faire.');
  process.exit(0);
}

let sessionCookie = null;

async function jsonRpc(url, method, params) {
  const headers = { 'Content-Type': 'application/json' };
  if (sessionCookie) headers['Cookie'] = sessionCookie;
  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
    redirect: 'manual',
  });
  const setCookie = resp.headers.get('set-cookie');
  if (setCookie) sessionCookie = setCookie.split(';')[0];
  const data = await resp.json();
  if (data.error) {
    throw new Error(data.error.data?.message || data.error.message || JSON.stringify(data.error));
  }
  return data.result;
}

async function main() {
  console.log(`🔐 Connexion à Odoo: ${ODOO_URL}`);
  console.log(`   DB: ${ODOO_DB}, User: ${ODOO_USER}`);
  console.log(`   Ancien mdp: ${OLD_PASSWORD.substring(0, 3)}***`);
  console.log(`   Nouveau mdp: ${NEW_PASSWORD.substring(0, 3)}***`);
  console.log('');

  // 1. Authentification avec l'ancien mot de passe
  console.log('1️⃣  Authentification avec l\'ancien mot de passe...');
  let uid;
  try {
    const authResult = await jsonRpc(`${ODOO_URL}/web/session/authenticate`, 'call', {
      db: ODOO_DB,
      login: ODOO_USER,
      password: OLD_PASSWORD,
    });
    uid = authResult?.uid;
    if (!uid) {
      throw new Error('Authentification échouée — uid non reçu');
    }
    console.log(`   ✅ Authentifié (uid=${uid})`);
  } catch (err) {
    console.error(`   ❌ Authentification échouée: ${err.message}`);
    console.error('   💡 Vérifiez que l\'ancien mot de passe est correct.');
    console.error('   💡 Usage: node peppol/scripts/change-odoo-password.mjs <ancien_mdp>');
    process.exit(1);
  }

  // 2. Changer le mot de passe via write sur res.users
  console.log('2️⃣  Changement du mot de passe...');
  try {
    await jsonRpc(`${ODOO_URL}/web/dataset/call_kw`, 'call', {
      model: 'res.users',
      method: 'write',
      args: [[uid], { password: NEW_PASSWORD }],
      kwargs: {},
    });
    console.log(`   ✅ Mot de passe changé avec succès !`);
  } catch (err) {
    console.error(`   ❌ Échec du changement: ${err.message}`);
    process.exit(1);
  }

  // 3. Vérification
  console.log('3️⃣  Vérification avec le nouveau mot de passe...');
  try {
    const verifyResult = await jsonRpc(`${ODOO_URL}/web/session/authenticate`, 'call', {
      db: ODOO_DB,
      login: ODOO_USER,
      password: NEW_PASSWORD,
    });
    if (verifyResult?.uid) {
      console.log(`   ✅ Vérification réussie ! Le nouveau mot de passe fonctionne.`);
    } else {
      throw new Error('uid non reçu avec le nouveau mot de passe');
    }
  } catch (err) {
    console.error(`   ⚠️  Vérification échouée: ${err.message}`);
    console.error('   ⚠️  Le mot de passe a peut-être été changé mais la vérification a échoué.');
    console.error('   💡 Essayez: node peppol/scripts/change-odoo-password.mjs <nouveau_mdp>');
    process.exit(1);
  }

  console.log('');
  console.log('🎉 Terminé ! Le mot de passe Odoo admin est maintenant synchronisé avec .env');
}

main().catch(err => {
  console.error('💥 Erreur fatale:', err.message);
  process.exit(1);
});
