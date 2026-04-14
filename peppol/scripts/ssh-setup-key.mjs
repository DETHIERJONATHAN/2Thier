#!/usr/bin/env node
/**
 * Installe la clé SSH publique sur le VPS et configure ~/.ssh/config
 * pour une connexion sans mot de passe à l'avenir.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Client } = require('ssh2');
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const SSH_HOST = '46.225.180.8';
const SSH_USER = 'root';
const SSH_PASS = process.argv[2] || 'E7eEpjvwWKUt';

const KEY_PATH = join(process.env.TEMP || homedir(), 'vps_temp_key');
const PUB_KEY_PATH = KEY_PATH + '.pub';

function runCmd(conn, cmd, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve({ out: '', err: 'TIMEOUT' }), timeoutMs);
    conn.exec(cmd, (err, stream) => {
      if (err) { clearTimeout(timer); return reject(err); }
      let out = '', errStr = '';
      stream.on('data', (d) => out += d.toString());
      stream.stderr.on('data', (d) => errStr += d.toString());
      stream.on('close', () => { clearTimeout(timer); resolve({ out, err: errStr }); });
    });
  });
}

const conn = new Client();

conn.on('ready', async () => {
  console.log('✅ SSH connecté');

  try {
    // Lire la clé publique générée
    if (!existsSync(PUB_KEY_PATH)) {
      console.error(`❌ Clé publique introuvable: ${PUB_KEY_PATH}`);
      console.error('   Lancez d\'abord: ssh-keygen -t ed25519 -f ' + KEY_PATH + ' -N ""');
      conn.end(); return;
    }
    const pubKey = readFileSync(PUB_KEY_PATH, 'utf8').trim();
    console.log('📋 Clé publique:', pubKey.substring(0, 60) + '...');

    // Installer sur le VPS
    const { out, err } = await runCmd(conn, `
      mkdir -p ~/.ssh && chmod 700 ~/.ssh
      grep -qxF '${pubKey}' ~/.ssh/authorized_keys 2>/dev/null || echo '${pubKey}' >> ~/.ssh/authorized_keys
      chmod 600 ~/.ssh/authorized_keys
      echo "KEY_INSTALLED"
    `);

    if (out.includes('KEY_INSTALLED')) {
      console.log('✅ Clé SSH installée sur le VPS');
    } else {
      console.log('Out:', out); console.log('Err:', err);
    }

    // Vérifier l'état Docker sur le VPS
    const { out: dockerOut } = await runCmd(conn, 'docker ps --format "{{.Names}}\\t{{.Status}}" 2>&1');
    console.log('\n📦 Containers VPS:\n' + dockerOut);

  } catch(e) {
    console.error('❌', e.message);
  } finally {
    conn.end();
  }
}).connect({
  host: SSH_HOST, port: 22,
  username: SSH_USER, password: SSH_PASS,
  readyTimeout: 15000,
});

conn.on('error', (err) => { console.error('❌ SSH error:', err.message); process.exit(1); });
