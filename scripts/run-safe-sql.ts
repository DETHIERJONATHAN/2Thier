import 'dotenv/config';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

// Usage: tsx scripts/run-safe-sql.ts scripts/sql/2025-08-14_add_quotes_safe.sql
async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Usage: tsx scripts/run-safe-sql.ts <path-to-sql-file>');
    process.exit(1);
  }
  const sqlPath = path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg);
  if (!fs.existsSync(sqlPath)) {
    console.error('SQL file not found:', sqlPath);
    process.exit(1);
  }
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set in environment');
    process.exit(1);
  }
  const client = new Client({ connectionString });
  try {
    await client.connect();
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('SAFE SQL executed successfully:', path.basename(sqlPath));
  } catch (err) {
    await client.query('ROLLBACK');
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error executing SQL:', msg);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
