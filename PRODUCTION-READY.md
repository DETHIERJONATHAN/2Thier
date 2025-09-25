## Déploiement automatique CRM 2Thier

Ce guide récapitule toutes les actions à réaliser pour relier le dépôt GitHub au site de production et maintenir le CRM synchronisé avec vos modifications locales.

### 1. Préparer l’infrastructure

1. **Base de données PostgreSQL gérée** : créez une instance managée (Railway, Render, Supabase, RDS…) et copiez l’URL complète dans un coffre-fort.
2. **Serveur d’exécution** : provisionnez une VM Linux (Ubuntu ≥ 22.04 recommandé) avec Docker Engine et Docker Compose v2 installés.
3. **Nom de domaine** : pointez `crm.2thier.be` (ou l’URL choisie) vers le serveur et configurez le reverse proxy (Caddy, Nginx ou Traefik) pour exposer le port 4000.

### 2. Secrets GitHub Actions

Dans `Settings > Secrets and variables > Actions`, créez les entrées suivantes :

| Secret | Description |
| --- | --- |
| `PRODUCTION_DATABASE_URL` | URL PostgreSQL complète (utilisée par `prisma migrate deploy`). |
| `PRODUCTION_APP_URL` | URL publique finale (affichée dans les workflows). |
| `PRODUCTION_SSH_HOST` | Hôte (IP ou domaine) du serveur. |
| `PRODUCTION_SSH_PORT` | Port SSH (par défaut 22). |
| `PRODUCTION_SSH_USER` | Utilisateur SSH disposant des droits Docker. |
| `PRODUCTION_SSH_KEY` | Clé privée SSH *au format OpenSSH* (copier le contenu, ne pas zipper). |
| `PRODUCTION_DEPLOY_PATH` | Chemin distant contenant le fichier Compose (ex : `/opt/crm`). |
| `PRODUCTION_COMPOSE_FILE` | Nom du fichier Compose distant si différent de `docker-compose.yml`. |

> 💡 Conservez toutes les clés API (Google, Meta, Telnyx, Gemini, JWT, etc.) dans le gestionnaire de secrets de votre hébergeur **et** dans un `.env.production` sur le serveur, jamais dans Git.

### 3. Préparer le serveur

1. Clonez/poussez le dossier `docker/compose.production.yml` sur le serveur et renommez-le `docker-compose.yml` (ou définissez `PRODUCTION_COMPOSE_FILE`).
2. Copiez le fichier `.env.production.example`, remplissez toutes les variables et enregistrez-le sur le serveur sous `.env.production` dans le même dossier que `docker-compose.yml`.
3. Vérifiez que l’utilisateur SSH possède les droits `docker` (`sudo usermod -aG docker <user>` puis reconnectez-vous).
4. (Optionnel) Configurez un reverse proxy (Caddy/Nginx) pour servir l’application via HTTPS.

### 4. Fonctionnement des workflows

| Workflow | Déclencheur | Rôle |
| --- | --- | --- |
| `CI` | Push / PR sur `main` | `npm run lint` + `npm run test` + `npm run build` pour valider la branche. |
| `docker-publish` | Push sur `main` ou manuel | Construit l’image GHCR `ghcr.io/<owner>/<repo>/crm`. |
| `deploy-production` *(nouveau)* | Push sur `main` ou manuel | Recompile, applique `prisma migrate deploy`, pousse l’image et redémarre le serveur distant. |

Chaque déploiement met à jour automatiquement la variable `GHCR_IMAGE` dans `.env.production` sur le serveur, puis exécute :

```bash
docker compose pull
docker compose up -d --remove-orphans
```

### 5. Checklist finale avant mise en ligne

- [ ] Les tests `npm run test` passent en local.
- [ ] `npm run build` fonctionne en local.
- [ ] `.env` local **reste hors Git** (confirmé par `git status`).
- [ ] Les secrets Google/Meta/Telnyx/Tunnel ngrok sont copiés dans `.env.production` (serveur) et dans les Secrets GitHub.
- [ ] Le tunnel ngrok est rafraîchi si l’URL Meta change (mettez à jour `META_REDIRECT_URI`).
- [ ] `PRODUCTION_DATABASE_URL` cible la base gérée (pas la base locale).

### 6. Exploitation courante

- **Nouvelle fonctionnalité** : développez sur une branche, ouvrez une PR. La CI garantit lint + tests + build.
- **Fusion dans `main`** : déclenche automatiquement `deploy-production`. Surveillez l’onglet *Actions* pour connaître l’état du déploiement.
- **Retour arrière** : redeployez une révision antérieure en lançant `deploy-production` via *Run workflow* et sélectionnez le commit souhaité.
- **Logs production** : connectez-vous en SSH et utilisez `docker compose logs -f crm`.

### 7. Intervention manuelle (secours)

```bash
# Sur le serveur, dossier de déploiement
docker compose pull
docker compose up -d --remove-orphans
docker compose logs -f crm
```

### 8. Sécurité & maintenance

- Renouvelez régulièrement les clés OAuth exposées dans votre `.env` local.
- Consultez la configuration Google/Meta après chaque changement d’URL de redirection.
- Programmez un backup PostgreSQL automatisé côté hébergeur (les scripts locaux restent hors dépôt).
- Surveillez l’espace disque (`docker system prune -f` est effectué après chaque déploiement mais gardez un œil sur /var/lib/docker).

Avec ces éléments, le dépôt est entièrement prêt : un push sur `main` déploie automatiquement une image propre, applique les migrations Prisma sur la base distante et redémarre le serveur Docker de production.
