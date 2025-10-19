require('dotenv').config();
const { Client } = require('pg');

async function dropShadowDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[drop-shadow-db] DATABASE_URL is not defined.');
    process.exit(1);
  }

  const url = new URL(databaseUrl);
  const originalDbName = url.pathname.replace(/^\//, '');
  const shadowDbName = process.env.SHADOW_DATABASE_NAME || `${originalDbName}_shadow`;

  const adminUrl = new URL(url.toString());
  adminUrl.pathname = '/postgres';

  const client = new Client({ connectionString: adminUrl.toString() });

  try {
    await client.connect();
    await client.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1;`, [shadowDbName]);
    await client.query(`DROP DATABASE IF EXISTS "${shadowDbName}";`);
    console.log(`[drop-shadow-db] Dropped database: ${shadowDbName}`);
  } catch (error) {
    console.error('[drop-shadow-db] Error:', error.message || error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

dropShadowDatabase();
