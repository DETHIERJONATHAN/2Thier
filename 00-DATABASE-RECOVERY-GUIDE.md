# Guide de Restauration Base de Données (Méthode Stratifiée)

Ce guide documente la procédure utilisée avec succès le 24/12/2025 pour restaurer la base de données de production (Cloud SQL) à partir de la base locale, en contournant les erreurs de dépendances circulaires (notamment sur `TreeBranchLeafNode` et `FieldOptionNode`).

## Le Problème
L'import standard (`pg_dump` complet) échoue sur Cloud SQL pour deux raisons :
1. **Dépendances Circulaires** : PostgreSQL ne peut pas insérer une ligne "Enfant" si son "Parent" n'existe pas encore. Si le Parent dépend aussi de l'Enfant (ou si l'ordre d'insertion est mauvais), l'import bloque.
2. **Commandes non supportées** : Les dumps locaux contiennent souvent `SET transaction_timeout` ou `session_replication_role` qui sont interdits sur Cloud SQL géré.

## La Solution : Export/Import Stratifié
Au lieu d'un seul fichier monolithique, nous divisons l'opération en 3 étapes distinctes pour briser le cycle de dépendance :
1.  **Schéma (`pre-data`)** : Création des tables vides.
2.  **Données (`data`)** : Insertion des données brutes. Comme les contraintes (clés étrangères) ne sont pas encore là, l'ordre d'insertion n'a aucune importance.
3.  **Contraintes (`post-data`)** : Activation des clés étrangères, index et triggers une fois toutes les données présentes.

---

## Procédure Détaillée (PowerShell)

### 1. Export Local en 3 parties
Utilisez `pg_dump` avec les flags `--section` pour séparer les composants.

```powershell
$env:PGPASSWORD="VotreMotDePasseLocal"
$PG_BIN="C:\Program Files\PostgreSQL\17\bin\pg_dump.exe"

# Étape 1 : Schéma seulement (Structure)
& $PG_BIN -h localhost -p 5432 -U postgres -d 2thier --section=pre-data --clean --if-exists --no-owner --no-acl -f export_step1_schema.sql

# Étape 2 : Données seulement (Contenu)
# --column-inserts est plus lent mais plus robuste pour la compatibilité
& $PG_BIN -h localhost -p 5432 -U postgres -d 2thier --section=data --column-inserts --no-owner --no-acl -f export_step2_data.sql

# Étape 3 : Contraintes seulement (Clés étrangères, Index)
& $PG_BIN -h localhost -p 5432 -U postgres -d 2thier --section=post-data --no-owner --no-acl -f export_step3_constraints.sql
```

### 2. Nettoyage des fichiers
Il faut retirer les commandes qui font planter Cloud SQL.

```powershell
$files = @("export_step1_schema.sql", "export_step2_data.sql", "export_step3_constraints.sql")

foreach ($file in $files) {
    $cleanName = $file.Replace('.sql', '_clean.sql')
    (Get-Content $file -Raw) -replace "SET transaction_timeout[^;]*;", "" -replace "SET session_replication_role[^;]*;", "" | Set-Content $cleanName -Encoding UTF8
}
```

### 3. Upload vers Google Cloud Storage
Cloud SQL ne peut importer que depuis un bucket GCS.

```powershell
gsutil cp export_step1_schema_clean.sql gs://thiernew-db-import/
gsutil cp export_step2_data_clean.sql gs://thiernew-db-import/
gsutil cp export_step3_constraints_clean.sql gs://thiernew-db-import/
```

### 4. Import dans Cloud SQL (Ordre Strict)
Si la base de destination est corrompue ou contient des restes, commencez par un "Wipe" (voir section Dépannage).

```powershell
# 1. Import Structure (Crée les tables vides)
gcloud sql import sql crm-db gs://thiernew-db-import/export_step1_schema_clean.sql --database=2thier --project=thiernew --user=postgres --quiet

# 2. Import Données (Peuple les tables sans vérifier les liens)
gcloud sql import sql crm-db gs://thiernew-db-import/export_step2_data_clean.sql --database=2thier --project=thiernew --user=postgres --quiet

# 3. Import Contraintes (Rétablit les liens et l'intégrité)
gcloud sql import sql crm-db gs://thiernew-db-import/export_step3_constraints_clean.sql --database=2thier --project=thiernew --user=postgres --quiet
```

---

## Dépannage : Reset Total (Wipe)
Si l'étape 1 échoue car "cannot drop table... because other objects depend on it", il faut forcer la suppression du schéma public.

1. Créer un fichier `wipe_db.sql` avec ce contenu :
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   GRANT ALL ON SCHEMA public TO postgres;
   GRANT ALL ON SCHEMA public TO public;
   ```
2. Uploader et importer ce fichier avant l'étape 1.
