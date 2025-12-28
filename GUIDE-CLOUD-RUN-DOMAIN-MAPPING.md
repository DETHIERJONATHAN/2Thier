# 🌐 Guide: Lier un site CRM à un domaine Cloud Run

## ✅ Ce qui a été fait

### 1. Nouvelle table et colonnes
Ajout de colonnes dans la table `websites` pour gérer le mapping Cloud Run :
- `cloudRunDomain` : Domaine mappé (ex: `2thier.be`)
- `cloudRunServiceName` : Nom du service Cloud Run (ex: `crm2thier-vite-prod`)
- `cloudRunRegion` : Région du service (par défaut: `europe-west1`)
- `cloudRunMappingVerified` : Indique si le mapping a été vérifié
- `cloudRunMappingVerifiedAt` : Date de la dernière vérification

### 2. Nouvelle API `/api/cloud-run-domains`
Créé le fichier `src/api/cloud-run-domains.ts` avec deux endpoints :
- **GET `/api/cloud-run-domains`** : Liste des domaines mappés dans Cloud Run
- **POST `/api/cloud-run-domains/verify`** : Vérifie qu'un domaine est accessible

### 3. Composant de sélection `CloudRunDomainSelector`
Créé `src/components/websites/CloudRunDomainSelector.tsx` :
- Liste déroulante des domaines Cloud Run disponibles
- Bouton de vérification pour tester l'accessibilité
- Affichage des informations du domaine sélectionné

### 4. Intégration dans le formulaire de création
Mis à jour `WebsitesAdminPage.tsx` pour :
- Afficher un vrai formulaire de création (avant c'était juste un message)
- Intégrer le sélecteur de domaine Cloud Run
- Gérer les données du mapping lors de la sauvegarde

---

## 📋 Comment l'utiliser

### Étape 1: Accéder à la page de gestion des sites
1. Connectez-vous en tant que **Super Admin**
2. Allez dans **Admin → Gestion des Sites Web**

### Étape 2: Créer un nouveau site
1. Cliquez sur **"Nouveau site"**
2. Remplissez le formulaire :
   - **Nom du site** : Ex: "2Thier Energy", "Devis1Minute"
   - **Type de site** : Vitrine, Landing Page ou Blog
   - **Slug** : URL interne (ex: `2thier`, `devis1minute`)
   - **Domaine personnalisé** (optionnel) : Ex: `www.monsite.be`

### Étape 3: Lier à un domaine Cloud Run
1. Dans la section **"☁️ Mapping Cloud Run"**, cliquez sur le sélecteur
2. Choisissez un domaine parmi :
   - `2thier.be` (Site principal 2Thier Energy)
   - `devis1minute.be` (Landing page Devis1Minute)
3. Cliquez sur **"Vérifier"** pour tester que le domaine est accessible
4. Les informations du service Cloud Run seront automatiquement remplies

### Étape 4: Sauvegarder
1. Cliquez sur **"➕ Créer le site"**
2. Le site est maintenant lié au domaine Cloud Run !

---

## 🔗 Vos domaines mappés actuels

D'après la console Cloud Run, vous avez :

| Domaine | Service | Région | Statut |
|---------|---------|--------|--------|
| `2thier.be` | `crm2thier-vite-prod` | `europe-west1` | ✅ Actif |
| `devis1minute.be` | `crm2thier-vite-prod` | `crm2thier-vite-prod` | ✅ Actif |

**Lien console** : https://console.cloud.google.com/run/domains?hl=fr&project=thiernew

---

## 🎯 Cas d'usage

### Cas 1: Site vitrine 2Thier
```
Nom: 2Thier Energy
Type: Site Vitrine
Slug: 2thier
Cloud Run: 2thier.be → crm2thier-vite-prod
```

Résultat : Le site sera accessible via `https://2thier.be`

### Cas 2: Landing page Devis1Minute
```
Nom: Devis1Minute
Type: Landing Page
Slug: devis1minute
Cloud Run: devis1minute.be → crm2thier-vite-prod
```

Résultat : Le site sera accessible via `https://devis1minute.be`

---

## 🚀 Ajouter de nouveaux domaines

### Dans Cloud Run (Google Cloud Console)
1. Allez sur https://console.cloud.google.com/run/domains?project=thiernew
2. Cliquez sur **"Mapper un domaine personnalisé"**
3. Sélectionnez le service `crm2thier-vite-prod`
4. Entrez votre nouveau domaine
5. Suivez les instructions pour configurer les DNS

### Dans le CRM
Une fois le domaine mappé dans Cloud Run, ajoutez-le dans le code :

**Fichier** : `src/api/cloud-run-domains.ts`
```typescript
const mappedDomains = [
  {
    domain: '2thier.be',
    serviceName: 'crm2thier-vite-prod',
    region: 'europe-west1',
    status: 'active',
    mappedAt: '2024-12-01',
    description: 'Site principal 2Thier Energy'
  },
  {
    domain: 'devis1minute.be',
    serviceName: 'crm2thier-vite-prod',
    region: 'europe-west1',
    status: 'active',
    mappedAt: '2024-12-01',
    description: 'Landing page Devis1Minute'
  },
  // 👇 AJOUTEZ VOTRE NOUVEAU DOMAINE ICI
  {
    domain: 'monsite.be',
    serviceName: 'crm2thier-vite-prod',
    region: 'europe-west1',
    status: 'active',
    mappedAt: '2025-12-28',
    description: 'Description de mon nouveau site'
  }
];
```

---

## 🔧 Fonctionnalités avancées

### Vérification automatique
Le bouton **"Vérifier"** teste si le domaine répond en HTTPS. Cela permet de :
- S'assurer que le mapping DNS est correct
- Vérifier que le certificat SSL est actif
- Confirmer que le service Cloud Run est bien en ligne

### API pour récupérer dynamiquement les domaines
**TODO futur** : Possibilité d'interroger l'API Cloud Run pour récupérer automatiquement la liste des domaines mappés, plutôt que de les coder en dur.

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Cloud Run                          │
│                                                              │
│  Service: crm2thier-vite-prod                               │
│  ├── Domaine 1: 2thier.be                                   │
│  ├── Domaine 2: devis1minute.be                             │
│  └── Domaine 3: [vos autres domaines]                       │
│                                                              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ Mapping via
                          │ cloudRunDomain
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                 Base de données (PostgreSQL)                 │
│                                                              │
│  Table: websites                                             │
│  ├── id: 1                                                   │
│  ├── siteName: "2Thier Energy"                              │
│  ├── slug: "2thier"                                         │
│  ├── cloudRunDomain: "2thier.be"           ◄── LIEN         │
│  ├── cloudRunServiceName: "crm2thier-vite-prod"            │
│  └── cloudRunRegion: "europe-west1"                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Rendu via
                          │ middleware
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              Application CRM (Frontend)                      │
│                                                              │
│  Requête: https://2thier.be                                 │
│    ↓                                                         │
│  Middleware websiteDetection détecte le domaine             │
│    ↓                                                         │
│  Récupère les données du site id=1                          │
│    ↓                                                         │
│  Affiche le site vitrine 2Thier Energy                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist de vérification

- [x] Colonnes ajoutées dans la table `websites`
- [x] Index créé sur `cloudRunDomain`
- [x] API `/api/cloud-run-domains` créée
- [x] Composant `CloudRunDomainSelector` créé
- [x] Intégration dans `WebsitesAdminPage`
- [x] Migration SQL appliquée
- [x] Client Prisma régénéré
- [ ] Tester la création d'un site avec mapping Cloud Run
- [ ] Vérifier que le domaine est bien sauvegardé
- [ ] Tester la vérification du domaine
- [ ] Valider l'affichage du site via le domaine Cloud Run

---

## 🎉 Prochaines étapes

1. **Redémarrez le serveur** pour charger la nouvelle API
2. **Testez la création d'un site** avec mapping Cloud Run
3. **Vérifiez** que le site s'affiche bien sur `2thier.be` ou `devis1minute.be`
4. **Ajoutez d'autres domaines** si nécessaire

---

## 📞 Support

Si vous rencontrez un problème :
1. Vérifiez que le domaine est bien mappé dans Cloud Run
2. Vérifiez que les colonnes existent dans la base de données
3. Consultez les logs du serveur pour voir les erreurs
4. Testez la route API directement : `GET /api/cloud-run-domains`

Bon développement ! 🚀
