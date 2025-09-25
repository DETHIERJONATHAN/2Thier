import 'dotenv/config';
import { spawn } from 'child_process';
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

async function checkPgDump(): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('pg_dump', ['--version'], { stdio: 'ignore' });
    proc.on('error', () => reject(new Error('pg_dump introuvable dans le PATH')));
    proc.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error('pg_dump non fonctionnel (code ' + code + ')'));
    });
  });
}

async function run(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL manquant dans .env');
    process.exit(1);
  }

  const backupsDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

  const stamp = nowStamp();
  const latestName = 'sauvegarde 2THIER.sql';
  const stampedName = `sauvegarde 2THIER_${stamp}.sql`;
  const latestPath = path.join(backupsDir, latestName);
  const stampedPath = path.join(backupsDir, stampedName);

  try {
    await checkPgDump();
  } catch {
    console.error('pg_dump non trouvé. Installe Postgres client ou ajoute pg_dump au PATH.');
    console.error('Doc: https://www.postgresql.org/download/');
    process.exit(1);
  }

  console.log('➡️ Sauvegarde en cours vers:', stampedPath);
  const args = [
    `--file=${stampedPath}`,
    '--format=plain',
    '--no-owner',
    '--no-privileges',
    '--encoding=UTF8',
    `--dbname=${dbUrl}`,
  ];

  await new Promise<void>((resolve, reject) => {
    const proc = spawn('pg_dump', args, { stdio: 'inherit' });
    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error('pg_dump exited with code ' + code));
    });
  });

  try {
    fs.copyFileSync(stampedPath, latestPath);
  } catch {
    console.warn('Copie vers le fichier "dernier" échouée, mais le fichier horodaté existe.');
  }

  console.log('✅ Sauvegarde terminée.');
  console.log('   Dernier snapshot:', latestPath);
  console.log('   Historique horodaté:', stampedPath);
}

run().catch((err) => {
  console.error('Erreur sauvegarde:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
