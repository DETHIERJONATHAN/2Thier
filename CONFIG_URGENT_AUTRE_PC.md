# URGENT - Configuration à faire sur l'autre PC (192.168.129.52)

## 1. MODIFIER postgresql.conf
Fichier : C:\Program Files\PostgreSQL\15\data\postgresql.conf

Chercher et modifier cette ligne :
```
# AVANT :
#listen_addresses = 'localhost'

# APRÈS :
listen_addresses = '*'
```

## 2. MODIFIER pg_hba.conf  
Fichier : C:\Program Files\PostgreSQL\15\data\pg_hba.conf

Ajouter cette ligne à la fin :
```
host    all             all             192.168.129.0/24        md5
```

## 3. REDÉMARRER PostgreSQL
- Windows + R → services.msc
- Chercher "postgresql-x64-15"  
- Clic droit → Redémarrer

## 4. VÉRIFIER que la base "2thier" existe
Ouvrir pgAdmin et créer la base si nécessaire :
```sql
CREATE DATABASE "2thier";
```

## 5. CONFIGURER LE PARE-FEU
- Panneau de configuration → Pare-feu Windows
- Paramètres avancés → Règles de trafic entrant
- Nouvelle règle → Port → TCP → 5432 → Autoriser

Une fois fait, revenez sur ce PC et testez la connexion !
