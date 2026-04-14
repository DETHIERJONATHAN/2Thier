#!/usr/bin/env node
/**
 * Reset du mot de passe admin Odoo via connexion directe PostgreSQL.
 * Connecte sur le port 5433 (PostgreSQL exposé par docker-compose.peppol.yml).
 *
 * Usage:
 *   node peppol/scripts/reset-odoo-admin-password.mjs [nouveau_mot_de_passe]
 *
 * Par défaut le nouveau mot de passe = ODOO_PASSWORD dans .env, sinon "zhiive_odoo_2026"
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHmac, randomBytes, pbkdf2 as pbkdf2Cb } from 'crypto';
import { promisify } from 'util';
import pg from 'pg';

const pbkdf2 = promisify(pbkdf2Cb);
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env') });

const ODOO_DB_HOST = process.env.ODOO_DB_HOST || '46.225.180.8';
const ODOO_DB_PORT = parseInt(process.env.ODOO_DB_PORT || '5433');
const ODOO_DB_USER = process.env.ODOO_DB_USER || 'odoo';
const ODOO_DB_PASSWORD = process.env.ODOO_DB_PASSWORD || 'odoo_peppol_secret';
const ODOO_DB_NAME = process.env.ODOO_DB_NAME || 'odoo_peppol';

const NEW_PASSWORD = process.argv[2] || process.env.ODOO_PASSWORD || 'zhiive_odoo_2026';

// Génère un hash pbkdf2-sha512 compatible Odoo 17 (passlib)
async function hashOdooPassword(password) {
  const ITERATIONS = 29000;
  const SALT = randomBytes(16);
  const KEY_LEN = 64;

  const derived = await pbkdf2(password, SALT, ITERATIONS, KEY_LEN, 'sha512');

  // passlib encode en base64 "ab64" (url-safe, sans padding, avec '.' au lieu de '+')
  const saltB64 = SALT.toString('base64url').replace(/=/g, '');
  const hashB64 = derived.toString('base64url').replace(/=/g, '');

  return `$pbkdf2-sha512$${ITERATIONS}$${saltB64}$${hashB64}`;
}

async function main() {
  console.log(`🔐 Reset mot de passe admin Odoo → "${NEW_PASSWORD}"`);
  console.log(`   DB: ${ODOO_DB_HOST}:${ODOO_DB_PORT}/${ODOO_DB_NAME} (user: ${ODOO_DB_USER})`);

  const hash = await hashOdooPassword(NEW_PASSWORD);
  console.log(`   Hash généré (pbkdf2-sha512): ${hash.substring(0, 40)}...`);

  const client = new pg.Client({
    host: ODOO_DB_HOST,
    port: ODOO_DB_PORT,
    user: ODOO_DB_USER,
    password: ODOO_DB_PASSWORD,
    database: ODOO_DB_NAME,
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('   ✅ Connecté à PostgreSQL');

    // Vérifier que l'utilisateur admin existe
    const check = await client.query(
      "SELECT id, login FROM res_users WHERE login = 'admin' AND active = true"
    );

    if (check.rowCount === 0) {
      console.error('   ❌ Utilisateur admin introuvable dans res_users');
      process.exit(1);
    }

    const adminId = check.rows[0].id;
    console.log(`   ℹ️  Admin trouvé: id=${adminId}, login=${check.rows[0].login}`);

    // Mettre à jour le mot de passe
    await client.query(
      'UPDATE res_users SET password = $1 WHERE id = $2',
      [hash, adminId]
    );

    console.log(`   ✅ Mot de passe mis à jour`);

    // Vérifier
    const verify = await client.query(
      "SELECT login, password IS NOT NULL as has_hash FROM res_users WHERE id = $1",
      [adminId]
    );
    console.log(`   ✅ Vérification: ${JSON.stringify(verify.rows[0])}`);

  } finally {
    await client.end();
  }

  console.log(`\n✅ Terminé ! Nouveau mot de passe: "${NEW_PASSWORD}"`);
  console.log(`   Mettez à jour ODOO_PASSWORD dans .env et GSM.`);
}

main().catch((err) => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});
