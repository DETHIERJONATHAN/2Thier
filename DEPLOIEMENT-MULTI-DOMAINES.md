# 🌐 Configuration Multi-Domaines pour 2Thier

## 📋 Architecture des Domaines

```
https://2thier.be              → Site Vitrine 2Thier (public)
https://www.2thier.be          → Redirige vers 2thier.be
https://app.2thier.be          → CRM (authentifié)
https://devis1min.be           → Marketplace Devis1Minute (public)
https://www.devis1min.be       → Redirige vers devis1min.be
```

---

## 🚀 Étapes de Déploiement

### **1. Déploiement Automatique via GitHub Actions**

À chaque push sur `sauvegarde-deploy-final`, GitHub Actions :
- ✅ Build l'application
- ✅ Crée l'image Docker
- ✅ Déploie sur Google Cloud Run
- ✅ Le même service répond sur tous les domaines

### **2. Configuration des Custom Domains (Une seule fois)**

Exécuter le script PowerShell :

```powershell
cd scripts
.\deploy-multi-domains.ps1
```

Ce script configure automatiquement les 5 domaines sur Google Cloud Run.

### **3. Configuration DNS (Chez votre registrar)**

Après avoir exécuté le script, récupérer les valeurs DNS :

```powershell
# Pour 2thier.be
gcloud run domain-mappings describe --domain=2thier.be --region=europe-west1

# Pour devis1min.be
gcloud run domain-mappings describe --domain=devis1min.be --region=europe-west1
```

---

## 📝 Enregistrements DNS à Configurer

### **Pour 2thier.be :**

| Type  | Nom | Valeur                          | TTL  |
|-------|-----|---------------------------------|------|
| A     | @   | `[IP fournie par Google Cloud]` | 3600 |
| CNAME | www | `ghs.googlehosted.com`          | 3600 |

### **Pour devis1min.be :**

| Type  | Nom | Valeur                          | TTL  |
|-------|-----|---------------------------------|------|
| A     | @   | `[IP fournie par Google Cloud]` | 3600 |
| CNAME | www | `ghs.googlehosted.com`          | 3600 |

### **Pour app.2thier.be :**

| Type  | Nom | Valeur                          | TTL  |
|-------|-----|---------------------------------|------|
| A     | app | `[IP fournie par Google Cloud]` | 3600 |

---

## ✅ Vérification du Statut

```powershell
# Vérifier si le mapping est actif
gcloud run domain-mappings list --region=europe-west1

# Vérifier le statut d'un domaine spécifique
gcloud run domain-mappings describe --domain=2thier.be --region=europe-west1
```

**Statut attendu :** `Status: ACTIVE`

---

## 🔄 Routing Automatique

L'application détecte automatiquement le domaine et route vers la bonne page :

```typescript
// useDomainRouter.tsx
- 2thier.be → /site-vitrine-2thier (Site Vitrine)
- devis1min.be → /devis1minute (Marketplace)
- app.2thier.be → /connexion ou /dashboard (CRM)
```

---

## 🧪 Tests Locaux

En local, vous pouvez tester en modifiant votre fichier `hosts` :

**Windows :** `C:\Windows\System32\drivers\etc\hosts`

```
127.0.0.1 2thier.be
127.0.0.1 devis1min.be
127.0.0.1 app.2thier.be
```

Puis accéder à :
- `http://2thier.be:5173` → Site Vitrine
- `http://devis1min.be:5173` → Marketplace
- `http://app.2thier.be:5173` → CRM

---

## 📊 Monitoring

```powershell
# Voir les logs du service
gcloud run services logs read crm-api --region=europe-west1 --limit=50

# Voir les métriques
gcloud run services describe crm-api --region=europe-west1
```

---

## 🔧 Dépannage

### **Problème : "Domain verification required"**
```powershell
# Vérifier la propriété du domaine dans Google Search Console
# https://search.google.com/search-console
```

### **Problème : "SSL certificate pending"**
- Attendre 15-60 minutes pour la génération automatique du certificat SSL
- Vérifier avec : `gcloud run domain-mappings describe --domain=2thier.be --region=europe-west1`

### **Problème : "DNS not propagated"**
- Vérifier la propagation DNS : https://dnschecker.org
- Peut prendre jusqu'à 48h (généralement 1-4h)

---

## 📞 Support

En cas de problème, vérifier :
1. ✅ Les DNS sont bien configurés chez le registrar
2. ✅ Le service Cloud Run est bien déployé et actif
3. ✅ Les domain mappings sont en statut ACTIVE
4. ✅ Les certificats SSL sont générés (peut prendre 1h)

---

## 🎯 Résultat Final

Une fois tout configuré, chaque domaine affichera automatiquement la bonne application :

- **2thier.be** : Site vitrine avec services énergétiques
- **app.2thier.be** : CRM complet pour gestion interne
- **devis1min.be** : Marketplace pour leads et partenaires

**Un seul déploiement GitHub = 3 sites mis à jour ! 🚀**
