# Script d'import des données

# 1. Sauvegarder la base actuelle (au cas où)
pg_dump -h localhost -U postgres -d 2thier > backup_current.sql

# 2. Supprimer et recréer la base de données
dropdb -h localhost -U postgres 2thier
createdb -h localhost -U postgres 2thier

# 3. Importer les nouvelles données
psql -h localhost -U postgres -d 2thier < backup_2thier.sql

# 4. Appliquer les migrations Prisma pour s'assurer de la compatibilité
npx prisma migrate deploy
npx prisma generate
