import 'dotenv/config';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

function nowStamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}-${mm}-${dd}_${hh}-${mi}-${ss}`;
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL manquant dans .env');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  const stamp = nowStamp();
  const backupsRoot = path.resolve(process.cwd(), 'backups', 'json');
  const baseDir = path.join(backupsRoot, `sauvegarde 2THIER_${stamp}`);
  fs.mkdirSync(baseDir, { recursive: true });

  // Lister toutes les tables du schéma public
  const tablesRes = await client.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`
  );

  let totalRows = 0;
  const aggregate: Record<string, unknown[]> = {};
  for (const row of tablesRes.rows) {
    const table = row.table_name;
    // Quote identificateur sensible à la casse
    const ident = '"' + table.replace(/"/g, '""') + '"';
    const dataRes = await client.query(`SELECT * FROM ${ident}`);
    const outPath = path.join(baseDir, `${table}.json`);
    fs.writeFileSync(outPath, JSON.stringify(dataRes.rows, null, 2), 'utf8');
    aggregate[table] = dataRes.rows as unknown[];
    totalRows += dataRes.rowCount || 0;
    console.log(`✓ Export ${table}: ${dataRes.rowCount} lignes -> ${outPath}`);
  }

  await client.end();
  // Ecrire un fichier unique agrégé (dernier + horodaté)
  const latestAggregate = path.join(backupsRoot, 'sauvegarde 2THIER.json');
  const stampedAggregate = path.join(backupsRoot, `sauvegarde 2THIER_${stamp}.json`);
  fs.mkdirSync(backupsRoot, { recursive: true });
  fs.writeFileSync(stampedAggregate, JSON.stringify(aggregate, null, 2), 'utf8');
  try {
    fs.copyFileSync(stampedAggregate, latestAggregate);
  } catch {
    console.warn('Impossible d\'écrire le fichier agrégé "dernier"; le fichier horodaté existe.');
  }
  console.log('\n✅ Sauvegarde JSON complète terminée');
  console.log('Dossier:', baseDir);
  console.log('Fichier unique (horodaté):', stampedAggregate);
  console.log('Fichier unique (dernier):', latestAggregate);
  console.log('Total lignes exportées:', totalRows);
}

main().catch((err) => {
  console.error('Erreur sauvegarde JSON:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
