# 🌐 Configuration DNS Multi-Domaines 2Thier

**Date de configuration :** 6 octobre 2025  
**Projet Google Cloud :** thiernew  
**Service Cloud Run :** crm-api  
**Région :** europe-west1

---

## ✅ Étape 1 : Configuration pour 2thier.be

### Enregistrements DNS à ajouter chez votre registraire

#### Enregistrements A (IPv4) - Nom: `@` ou racine
```
Type: A
Nom: @
Valeur: 216.239.32.21
TTL: 3600

Type: A
Nom: @
Valeur: 216.239.34.21
TTL: 3600

Type: A
Nom: @
Valeur: 216.239.36.21
TTL: 3600

Type: A
Nom: @
Valeur: 216.239.38.21
TTL: 3600
```

#### Enregistrements AAAA (IPv6) - Nom: `@` ou racine
```
Type: AAAA
Nom: @
Valeur: 2001:4860:4802:32::15
TTL: 3600

Type: AAAA
Nom: @
Valeur: 2001:4860:4802:34::15
TTL: 3600

Type: AAAA
Nom: @
Valeur: 2001:4860:4802:36::15
TTL: 3600

Type: AAAA
Nom: @
Valeur: 2001:4860:4802:38::15
TTL: 3600
```

#### Enregistrement CNAME pour www
```
Type: CNAME
Nom: www
Valeur: ghs.googlehosted.com.
TTL: 3600
```

**Note :** Le point final `.` après `ghs.googlehosted.com.` est important !

---

## ⏳ Étape 2 : Vérification de devis1min.be

### Code de vérification Google Search Console
```
google-site-verification=1I_ib0ib3AaiEi8QGdWY7gsVQxgwd6EoLLMp9m5y7g0
```

### Enregistrement TXT à ajouter AVANT toute autre configuration
```
Type: TXT
Nom: @
Valeur: google-site-verification=1I_ib0ib3AaiEi8QGdWY7gsVQxgwd6EoLLMp9m5y7g0
TTL: 3600
```

**⚠️ IMPORTANT :** Ce TXT doit être ajouté en PREMIER pour vérifier la propriété du domaine dans Google Cloud.

---

## 🔄 Étape 3 : Configuration pour devis1min.be (APRÈS vérification)

### Enregistrements DNS à ajouter (mêmes IPs que 2thier.be)

#### Enregistrements A (IPv4)
```
Type: A
Nom: @
Valeur: 216.239.32.21
TTL: 3600

Type: A
Nom: @
Valeur: 216.239.34.21
TTL: 3600

Type: A
Nom: @
Valeur: 216.239.36.21
TTL: 3600

Type: A
Nom: @
Valeur: 216.239.38.21
TTL: 3600
```

#### Enregistrements AAAA (IPv6)
```
Type: AAAA
Nom: @
Valeur: 2001:4860:4802:32::15
TTL: 3600

Type: AAAA
Nom: @
Valeur: 2001:4860:4802:34::15
TTL: 3600

Type: AAAA
Nom: @
Valeur: 2001:4860:4802:36::15
TTL: 3600

Type: AAAA
Nom: @
Valeur: 2001:4860:4802:38::15
TTL: 3600
```

#### Enregistrement CNAME pour www
```
Type: CNAME
Nom: www
Valeur: ghs.googlehosted.com.
TTL: 3600
```

---

## 📋 Ordre des Opérations

### Pour 2thier.be (prêt maintenant) :
1. ✅ Mapping Cloud Run créé
2. ⏳ Ajouter les 8 enregistrements A et AAAA
3. ⏳ Ajouter l'enregistrement CNAME pour www
4. ⏳ Attendre propagation DNS (1-48h)
5. ⏳ Certificat SSL généré automatiquement (15-60 min après DNS)

### Pour devis1min.be (en 2 temps) :
**PHASE 1 - Vérification :**
1. ⏳ Ajouter l'enregistrement TXT de vérification Google
2. ⏳ Attendre propagation (15-60 min)
3. ⏳ Vérifier le domaine dans Google Search Console
4. ⏳ Exécuter la commande de mapping Cloud Run

**PHASE 2 - Configuration :**
5. ⏳ Ajouter les 8 enregistrements A et AAAA
6. ⏳ Ajouter l'enregistrement CNAME pour www
7. ⏳ Attendre propagation DNS
8. ⏳ Certificat SSL généré automatiquement

---

## 🧪 Vérification DNS

### Commandes pour tester la propagation :

```bash
# Vérifier les enregistrements A
nslookup 2thier.be
nslookup devis1min.be

# Vérifier les enregistrements CNAME
nslookup www.2thier.be
nslookup www.devis1min.be

# Vérifier le TXT de vérification
nslookup -type=TXT devis1min.be
```

### Outils en ligne :
- https://dnschecker.org/
- https://www.whatsmydns.net/

---

## 🎯 Résultat Final

Une fois TOUT configuré, vous aurez :

```
https://2thier.be        → Site Vitrine 2Thier (public)
https://www.2thier.be    → Redirige vers 2thier.be
https://app.2thier.be    → CRM (authentification requise)
https://api.2thier.be    → API (authentification requise)
https://devis1min.be     → Marketplace Devis1Minute (public)
https://www.devis1min.be → Redirige vers devis1min.be
```

**Tous ces domaines pointent vers le MÊME service Cloud Run** mais le code React affiche le bon contenu grâce à la détection du hostname dans `useDomainRouter.tsx` ! 🚀

---

## 📞 Support

En cas de problème :
1. Vérifier les logs Cloud Run : `gcloud run services logs read crm-api --region=europe-west1`
2. Vérifier les mappings : `gcloud beta run domain-mappings list --region=europe-west1`
3. Vérifier les certificats SSL : Ils se génèrent automatiquement 15-60 min après la bonne configuration DNS

---

**Registraire utilisé :** [À COMPLÉTER]  
**Date de configuration DNS :** [À COMPLÉTER]  
**Date de vérification SSL :** [À COMPLÉTER]
