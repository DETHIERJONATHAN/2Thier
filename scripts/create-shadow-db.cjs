require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not defined.');
    process.exit(1);
  }

  const adminUrl = connectionString.replace(/\/([^\/]+)$/, '/postgres');
  const client = new Client({ connectionString: adminUrl });

  try {
    await client.connect();
    const dbName = '2thier_shadow';
    const check = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (check.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`[shadow-db] Created database ${dbName}`);
    } else {
      console.log(`[shadow-db] Database ${dbName} already exists`);
    }
  } catch (error) {
    console.error('[shadow-db] Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
