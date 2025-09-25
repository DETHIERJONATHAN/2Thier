import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL manquant');

  const sqlDir = path.resolve(process.cwd(), 'scripts', 'sql');
  const files = fs.readdirSync(sqlDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query('BEGIN');
    for (const f of files) {
      const full = path.join(sqlDir, f);
      const sql = fs.readFileSync(full, 'utf8');
      console.log('Running SQL:', f);
      await client.query(sql);
    }
    await client.query('COMMIT');
    console.log('All safe SQL executed successfully.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error executing safe SQLs:', e instanceof Error ? e.message : String(e));
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
