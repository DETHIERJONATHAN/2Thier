# Guide d'export de la base de données

## Sur l'autre PC (celui avec les vraies données) :

### Option A : Export complet avec pg_dump
```bash
pg_dump -h localhost -U postgres -d 2thier --clean --if-exists --create > backup_2thier.sql
```

### Option B : Export avec données seulement
```bash
pg_dump -h localhost -U postgres -d 2thier --data-only --inserts > data_2thier.sql
```

### Option C : Export via pgAdmin (interface graphique)
1. Ouvrir pgAdmin
2. Clic droit sur la base "2thier"
3. Backup...
4. Format: Custom ou Plain
5. Sauvegarder le fichier

## Transférer le fichier
- Copier le fichier .sql sur une clé USB
- Ou l'envoyer par email/cloud
- Ou le partager via réseau local
