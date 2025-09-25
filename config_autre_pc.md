# Configuration PostgreSQL pour connexion réseau

## A FAIRE SUR L'AUTRE PC (celui avec PostgreSQL) :

### 1. Trouver l'adresse IP de l'autre PC
Ouvrir l'invite de commande (cmd) et taper :
```cmd
ipconfig
```
Notez l'adresse IPv4 (exemple : 192.168.1.100)

### 2. Localiser les fichiers de configuration PostgreSQL
Les fichiers sont dans : C:\Program Files\PostgreSQL\13\data\

### 3. Modifier postgresql.conf
Ouvrir le fichier postgresql.conf avec un éditeur de texte EN TANT QU'ADMINISTRATEUR

Chercher cette ligne :
```
#listen_addresses = 'localhost'
```

La remplacer par :
```
listen_addresses = '*'
```

### 4. Modifier pg_hba.conf
Ouvrir le fichier pg_hba.conf et ajouter cette ligne à la fin :
```
# Connexions depuis le réseau local
host    all             all             192.168.0.0/16          md5
```

### 5. Redémarrer PostgreSQL
- Windows + R → services.msc
- Chercher "postgresql-x64-13"
- Clic droit → Redémarrer

### 6. Créer la base de données "2thier"
Ouvrir pgAdmin ou utiliser psql :
```sql
CREATE DATABASE "2thier";
```

### 7. Vérifier que le pare-feu Windows autorise PostgreSQL
- Panneau de configuration → Pare-feu Windows
- Autoriser une application → PostgreSQL (port 5432)
