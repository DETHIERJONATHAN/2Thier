# Configuration PostgreSQL pour connexion réseau

## Sur l'autre PC (celui avec les données) :

### 1. Trouver l'adresse IP
```cmd
ipconfig
```
Notez l'adresse IPv4 (ex: 192.168.1.100)

### 2. Localiser les fichiers de configuration PostgreSQL
Les fichiers sont généralement dans :
- Windows : `C:\Program Files\PostgreSQL\[version]\data\`
- Ou dans : `C:\Users\[user]\AppData\Roaming\postgresql\`

### 3. Modifier postgresql.conf
Ouvrir le fichier `postgresql.conf` et modifier :
```
# Ligne à changer :
listen_addresses = 'localhost'
# En :
listen_addresses = '*'

# Et s'assurer que le port est correct :
port = 5432
```

### 4. Modifier pg_hba.conf
Ajouter cette ligne à la fin du fichier `pg_hba.conf` :
```
# Autoriser les connexions depuis le réseau local
host    all             all             192.168.0.0/16          md5
```

### 5. Redémarrer PostgreSQL
- Windows : Services → PostgreSQL → Redémarrer
- Ou redémarrer l'ordinateur

### 6. Tester la connexion depuis ce PC
```bash
psql -h [IP_AUTRE_PC] -U postgres -d 2thier
```
