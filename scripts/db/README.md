# Sauvegarde et restauration de la base (PostgreSQL)

Prérequis: `pg_dump` et `psql` installés (PostgreSQL client) et variable `DATABASE_URL` configurée.

- Backup (Windows PowerShell):
  - `./scripts/db/backup.ps1`
  - Sortie dans `db-backups/backup_YYYYMMDD_HHMMSS.sql`
- Restore (Windows PowerShell):
  - `./scripts/db/restore.ps1 -File db-backups/backup_...sql`

Attention: n'utilisez jamais `prisma migrate reset` sur une base contenant des données. Préférez `prisma migrate deploy` pour appliquer les migrations en sécurité.
