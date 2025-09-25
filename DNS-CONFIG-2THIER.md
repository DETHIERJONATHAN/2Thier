# 🌐 CONFIGURATION DNS POUR 2THIER.BE

## Étapes à suivre chez one.com

### 1. Connexion à one.com
- Allez sur https://www.one.com
- Connectez-vous à votre compte
- Allez dans "Domaines" → "2thier.be" → "DNS"

### 2. Configuration des enregistrements DNS

#### A. Enregistrement CNAME pour www
```
Type: CNAME
Nom: www
Valeur: ghs.googlehosted.com
TTL: 3600 (1 heure)
```

#### B. Enregistrement A pour le domaine principal
```
Type: A
Nom: @ (ou laissez vide)
Valeur: [IP fournie par Google - voir console]
TTL: 3600 (1 heure)
```

### 3. Obtenir l'IP Google
1. Allez sur https://console.cloud.google.com/appengine/settings/domains
2. Ajoutez "2thier.be" comme domaine personnalisé
3. Google vous donnera l'IP à utiliser

### 4. Vérification
- Attendez 1-24h pour la propagation DNS
- Testez: https://www.2thier.be
- Testez: https://2thier.be

## 📞 Support
Si problème DNS, contactez le support one.com avec ces informations:
- Domaine: 2thier.be  
- Hébergement: Google Cloud App Engine
- CNAME: ghs.googlehosted.com
