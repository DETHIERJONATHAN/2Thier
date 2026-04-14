#!/usr/bin/env node
/**
 * Reset Odoo admin password via SSH → /usr/bin/odoo shell (stdin pipe)
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Client } = require('ssh2');

const SSH_HOST = '46.225.180.8';
const SSH_USER = 'root';
const SSH_PASS = process.argv[2] || 'E7eEpjvwWKUt';
const NEW_ODOO_PASS = process.argv[3] || 'zhiive_odoo_2026';

function runCmd(conn, cmd, stdinData = null, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve({ out: '', err: 'TIMEOUT' }), timeoutMs);
    conn.exec(cmd, (err, stream) => {
      if (err) { clearTimeout(timer); return reject(err); }
      let out = '', errStr = '';
      stream.on('data', (d) => { out += d.toString(); process.stdout.write('.'); });
      stream.stderr.on('data', (d) => errStr += d.toString());
      stream.on('close', () => { clearTimeout(timer); console.log(''); resolve({ out, err: errStr }); });
      if (stdinData) {
        stream.stdin.write(stdinData);
        stream.stdin.end();
      }
    });
  });
}

const conn = new Client();

conn.on('ready', async () => {
  console.log('✅ SSH connecté');

  try {
    // Approche 1: utiliser odoo shell avec stdin
    const pyCode = `
user = env['res.users'].search([('login', '=', 'admin')], limit=1)
print('Found user:', user.id, user.login)
user.write({'password': '${NEW_ODOO_PASS}'})
env.cr.commit()
print('PASSWORD_RESET_OK')
`;

    console.log('🔐 Tentative via /usr/bin/odoo shell...');
    const cmd = `docker exec -i zhiive-odoo-peppol /usr/bin/odoo shell --database=odoo_peppol --no-http 2>&1`;
    const { out, err } = await runCmd(conn, cmd, pyCode, 45000);

    console.log('Output:', out.substring(0, 500));
    if (err && !err.includes('WARNING') && !err.includes('INFO')) {
      console.log('Stderr:', err.substring(0, 300));
    }

    if (out.includes('PASSWORD_RESET_OK')) {
      console.log('\n✅ MOT DE PASSE RESET OK via odoo shell');
      console.log(`   Login: admin  |  Password: ${NEW_ODOO_PASS}`);
      return;
    }

    // Approche 2: psql avec Odoo crypt_context depuis le container
    console.log('\n⚠️ Tentative via Python passlib directement...');
    const pyHash = `
from passlib.context import CryptContext
_crypt_context = CryptContext(schemes=['pbkdf2_sha512', 'plaintext'], deprecated=['plaintext'])
h = _crypt_context.hash('${NEW_ODOO_PASS}')
import sys
sys.stdout.write(h)
`.replace(/\n/g, '\n');

    const { out: hashOut } = await runCmd(conn,
      `docker exec zhiive-odoo-peppol python3 << 'PYEOF'\n${pyHash}\nPYEOF`,
      null, 10000
    );
    const hash = hashOut.trim().split('\n').pop()?.trim();
    console.log('Hash:', hash?.substring(0, 50) + '...');

    if (hash?.startsWith('$')) {
      const { out: psqlOut } = await runCmd(conn,
        `docker exec zhiive-odoo-db psql -U odoo -d odoo_peppol -c "UPDATE res_users SET password = '${hash}' WHERE login = 'admin' RETURNING id, login;"`,
        null, 10000
      );
      console.log('psql:', psqlOut.trim());
    }

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
