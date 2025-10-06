# 🚀 Guide de Déploiement CRM 2Thier

## Architecture

```
LOCAL (développement)          PRODUCTION (Cloud)
├── Code (fichiers .ts/.tsx)  → GitHub → Cloud Run
└── Base de données (PostgreSQL) → Cloud SQL
```

---

## 📦 Déployer du CODE (Frontend/Backend)

Quand tu modifies des **fichiers de code** (`.ts`, `.tsx`, composants React, API, etc.) :

```powershell
# 1. Commiter les modifications
git add -A
git commit -m "Description de tes modifications"

# 2. Pousser vers GitHub (déclenche le déploiement automatique)
git push origin sauvegarde-deploy-final
```

**Temps de déploiement :** 5-10 minutes

**Suivi du déploiement :** https://github.com/DETHIERJONATHAN/2Thier/actions

---

## 💾 Déployer la BASE DE DONNÉES

Quand tu crées des **configurations via l'interface no-code** (favoris, formulaires, modules, etc.) :

```powershell
# Exécuter le script de synchronisation
.\scripts\sync-db-to-prod.ps1
```

**Ce que fait ce script :**
1. ✅ Exporte ta base locale (PostgreSQL)
2. ☁️ Upload vers Google Cloud Storage
3. 💾 Import dans Cloud SQL production
4. 🧹 Nettoie les fichiers temporaires

**Temps de déploiement :** 2-5 minutes

⚠️ **ATTENTION :** Cette opération **écrase** toutes les données en production !

---

## 🔄 Workflow de Développement Recommandé

### Scénario 1 : Tu développes une nouvelle fonctionnalité

```powershell
# 1. Modifier le code localement (VSCode)
# 2. Tester en local (http://localhost:5173)
# 3. Quand ça fonctionne :
git add -A
git commit -m "Ajout fonctionnalité X"
git push origin sauvegarde-deploy-final
```

### Scénario 2 : Tu configures des formulaires/modules

```powershell
# 1. Créer les configurations via l'interface (localhost:5173)
# 2. Tester en local
# 3. Quand ça fonctionne :
.\scripts\sync-db-to-prod.ps1
```

### Scénario 3 : Les deux en même temps

```powershell
# 1. Pousser le CODE d'abord
git add -A
git commit -m "Code pour nouveau module"
git push origin sauvegarde-deploy-final

# 2. Attendre que GitHub Actions termine (5-10 min)
# 3. Ensuite pousser la BASE DE DONNÉES
.\scripts\sync-db-to-prod.ps1
```

---

## 🌐 URLs Important

- **Production :** https://app.2thier.be
- **Local :** http://localhost:5173
- **GitHub Actions :** https://github.com/DETHIERJONATHAN/2Thier/actions
- **Google Cloud Console :** https://console.cloud.google.com/run?project=thiernew

---

## 🛠️ Commandes Utiles

### Vérifier l'état Git
```powershell
git status
```

### Voir les différences
```powershell
git diff
```

### Annuler des modifications locales
```powershell
git restore <fichier>
```

### Vérifier l'état de la base locale
```powershell
npx prisma migrate status
```

### Lancer l'application en local
```powershell
npm run dev
```

---

## ⚠️ Points d'Attention

### ❌ NE JAMAIS faire :
- ❌ Modifier directement les données en production via pgAdmin
- ❌ Pousser du code non testé en production
- ❌ Synchroniser la base pendant qu'un client utilise le site

### ✅ TOUJOURS faire :
- ✅ Tester en local avant de déployer
- ✅ Commiter régulièrement ton code
- ✅ Vérifier que GitHub Actions réussit (vert ✅)
- ✅ Garder des backups avant de synchroniser la base

---

## 📞 En cas de problème

### Le site ne charge pas après déploiement
1. Vérifier GitHub Actions : https://github.com/DETHIERJONATHAN/2Thier/actions
2. Si rouge ❌, lire les logs d'erreur
3. Si vert ✅, attendre 2-3 minutes (propagation)

### La base de données semble vide en production
1. Tu as probablement oublié de synchroniser la base
2. Exécute : `.\scripts\sync-db-to-prod.ps1`

### Erreur lors du `git push`
1. Vérifie que tu es sur la bonne branche : `git branch`
2. Si besoin : `git pull origin sauvegarde-deploy-final`
3. Résous les conflits si nécessaire
4. Réessaye le push

---

## 📊 Structure du Projet

```
crm/
├── src/                    # Code source
│   ├── components/        # Composants React
│   ├── pages/            # Pages de l'application
│   ├── api-server-clean.ts  # Serveur API
│   └── ...
├── prisma/                # Base de données
│   ├── schema.prisma     # Schéma de la DB
│   └── migrations/       # Historique des migrations
├── scripts/              # Scripts utilitaires
│   ├── sync-db-to-prod.ps1  # Script de sync DB
│   └── ...
├── archived-scripts/     # Anciens scripts (ignoré par Git)
└── .github/workflows/    # GitHub Actions (CI/CD)
```

---

**Dernière mise à jour :** 6 octobre 2025
**Version du guide :** 1.0 - Post déploiement réussi
