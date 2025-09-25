# Configuration PostgreSQL après installation

## 1. Localiser les fichiers de configuration
Après installation, les fichiers sont dans :
- `C:\Program Files\PostgreSQL\[version]\data\`
- Ou `C:\ProgramData\PostgreSQL\[version]\data\`

## 2. Modifier postgresql.conf
Ouvrir `postgresql.conf` avec un éditeur de texte (en tant qu'administrateur) :

Chercher cette ligne :
```
#listen_addresses = 'localhost'
```

La remplacer par :
```
listen_addresses = '*'
```

Et s'assurer que le port est correct :
```
port = 5432
```

## 3. Modifier pg_hba.conf
Ouvrir `pg_hba.conf` et ajouter cette ligne à la fin :
```
# Connexions depuis le réseau local
host    all             all             192.168.0.0/16          md5
```

## 4. Redémarrer PostgreSQL
- Ouvrir "Services" Windows (services.msc)
- Chercher "postgresql-x64-[version]"
- Clic droit → Redémarrer

## 5. Créer la base de données "2thier"
Ouvrir pgAdmin ou utiliser la ligne de commande :
```sql
CREATE DATABASE "2thier";
```

## 6. Trouver l'IP du PC
```cmd
ipconfig
```
Noter l'adresse IPv4 (ex: 192.168.1.100)
