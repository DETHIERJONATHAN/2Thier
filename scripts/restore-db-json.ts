import 'dotenv/config';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

function isDir(p: string) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}
function isFile(p: string) {
  try { return fs.statSync(p).isFile(); } catch { return false; }
}

async function getPrimaryKey(client: Client, table: string): Promise<string[]> {
  const res = await client.query<{ column_name: string }>(
    `SELECT kcu.column_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
     WHERE tc.table_schema = 'public'
       AND tc.table_name = $1
       AND tc.constraint_type = 'PRIMARY KEY'
     ORDER BY kcu.ordinal_position`,
    [table]
  );
  return res.rows.map(r => r.column_name);
}

function quoteIdent(id: string) {
  return '"' + id.replace(/"/g, '""') + '"';
}

async function upsertRow(client: Client, table: string, row: Record<string, unknown>, pkCols: string[]) {
  const cols = Object.keys(row);
  if (cols.length === 0) return;
  const qCols = cols.map(quoteIdent).join(',');
  const placeholders = cols.map((_, i) => `$${i+1}`).join(',');
  const r = row as Record<string, unknown>;
  const values = cols.map(c => r[c] as unknown);

  if (pkCols.length > 0) {
    const qPk = pkCols.map(quoteIdent).join(',');
    const updateCols = cols.filter(c => !pkCols.includes(c));
    const setClause = updateCols.length
      ? 'SET ' + updateCols.map(c => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`).join(',')
      : '';
    const sql = `INSERT INTO ${quoteIdent(table)} (${qCols}) VALUES (${placeholders})
                 ON CONFLICT (${qPk}) DO ${setClause ? 'UPDATE ' + setClause : 'NOTHING'}`;
    await client.query(sql, values);
  } else {
    // Pas de PK connue: essayer INSERT, ignorer doublons via ON CONFLICT DO NOTHING sur toutes colonnes ne marche pas.
    // On tente un INSERT simple; si ça casse, on passe.
    try {
      const sql = `INSERT INTO ${quoteIdent(table)} (${qCols}) VALUES (${placeholders})`;
      await client.query(sql, values);
    } catch {
      // ignore
    }
  }
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL manquant dans .env');
    process.exit(1);
  }
  const arg = process.argv[2];
  const backupsRoot = path.resolve(process.cwd(), 'backups', 'json');
  let source: string | undefined;

  if (arg) {
    const abs = path.isAbsolute(arg) ? arg : path.join(process.cwd(), arg);
    source = abs;
  } else {
    // Choisir le dernier fichier agrégé si présent, sinon le dernier dossier
    const files = isDir(backupsRoot) ? fs.readdirSync(backupsRoot).map(n => path.join(backupsRoot, n)) : [];
    const aggregates = files.filter(p => p.endsWith('.json'));
    const folders = files.filter(p => isDir(p) && path.basename(p).startsWith('sauvegarde 2THIER_'));
    const byMtime = (a: string, b: string) => (fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    aggregates.sort(byMtime);
    folders.sort(byMtime);
    source = aggregates[0] || folders[0];
  }

  if (!source) {
    console.error('Aucune sauvegarde JSON trouvée. Fournis un chemin vers un fichier agrégé ou un dossier.');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query('BEGIN');
    // Désactiver les contraintes/triggers pour faciliter l'ordre d'import (sauvegarde cohérente requise)
    await client.query("SET session_replication_role = 'replica'");

    if (isFile(source)) {
      // Agrégé
      const data = JSON.parse(fs.readFileSync(source, 'utf8')) as Record<string, unknown[]>;
      const tables = Object.keys(data);
      for (const table of tables) {
        const rows = data[table] as Record<string, unknown>[];
        if (!Array.isArray(rows) || rows.length === 0) continue;
        const pk = await getPrimaryKey(client, table);
        for (const r of rows) {
          await upsertRow(client, table, r, pk);
        }
        console.log(`Restauré ${table}: ${rows.length} lignes`);
      }
    } else if (isDir(source)) {
      // Dossier par tables
      const files = fs.readdirSync(source).filter(n => n.endsWith('.json'));
      for (const f of files) {
        const table = path.basename(f, '.json');
        const rows = JSON.parse(fs.readFileSync(path.join(source, f), 'utf8')) as Record<string, unknown>[];
        if (!Array.isArray(rows) || rows.length === 0) continue;
        const pk = await getPrimaryKey(client, table);
        for (const r of rows) {
          await upsertRow(client, table, r, pk);
        }
        console.log(`Restauré ${table}: ${rows.length} lignes`);
      }
    } else {
      console.error('Chemin de sauvegarde invalide:', source);
      process.exit(1);
    }

    await client.query("SET session_replication_role = 'origin'");
    await client.query('COMMIT');
    console.log('✅ Restauration JSON terminée (insert/upsert, aucune suppression).');
  } catch (e) {
    await client.query('ROLLBACK');
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Erreur restauration JSON:', msg);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('Erreur fatale:', e instanceof Error ? e.message : String(e));
  process.exit(1);
});
