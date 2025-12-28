# Démarrage Local + DB Proxy

Ce fichier documente la procédure simplifiée pour lancer l'environnement de développement local connecté à la base de données de production via le proxy Cloud SQL.

## 🚀 Lancement Rapide

Pour tout lancer en une seule commande (Proxy + Serveur + Client), exécutez simplement :

```bash
./scripts/start-local.sh
```

## 📋 Ce que fait le script

1.  **Arrêt du proxy existant** : Il tue tout processus `cloud-sql-proxy` qui pourrait bloquer le port.
2.  **Authentification** : Il vérifie si vous avez un token Google valide. Si ce n'est pas le cas, il lance `gcloud auth login` pour vous reconnecter.
3.  **Démarrage du Proxy** : Il lance le proxy Cloud SQL en utilisant votre token d'accès personnel (ce qui contourne les problèmes de "Application Default Credentials" expirés).
4.  **Lancement de l'App** : Il exécute `npm run dev` pour démarrer le frontend (Vite) et le backend (Node.js).

## 🛠️ Dépannage

Si le script échoue :

1.  **Erreur d'authentification** : Lancez manuellement `gcloud auth login --no-launch-browser` et suivez les instructions.
2.  **Port occupé** : Vérifiez que rien d'autre n'utilise le port 5432 (`lsof -i :5432`).
3.  **Erreur de connexion DB** : Vérifiez que votre fichier `.env` contient bien `DATABASE_URL="postgresql://postgres:Jlsl2022%40@127.0.0.1:5432/2thier"`.

---
*Ce fichier a été créé pour faciliter le redémarrage de l'environnement de développement.*
