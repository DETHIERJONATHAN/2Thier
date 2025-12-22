# 📄 Système de Génération de Documents

Système complet de création et génération de documents PDF (Devis, Factures, Bons de commande) intégré à TreeBranchLeaf.

## 🎯 Vue d'Ensemble

### Architecture en 2 parties :

1. **Interface Admin** (`/admin/documents`) - Pour créer les templates
2. **Interface Utilisateur** (Onglet Client dans TBL) - Pour générer les documents

## 📊 Base de Données

### Tables Prisma créées :

- **DocumentTemplate** : Templates de documents créés par l'admin
- **DocumentSection** : Sections modulaires d'un template (page de garde, tableau de prix, etc.)
- **DocumentTheme** : Thèmes visuels (couleurs, logo, polices)
- **GeneratedDocument** : Documents PDF générés pour les clients

## 🔑 Fonctionnalités Principales

### Pour l'Admin :

✅ Créer des templates réutilisables (Devis, Factures, etc.)
✅ Gérer les thèmes visuels (couleurs, logo)
✅ Traductions multilingues (FR, NL, DE, EN)
✅ Templates actifs/inactifs

### Pour l'Utilisateur (dans TBL) :

✅ Générer automatiquement des documents depuis une submission
✅ Détection automatique de la langue client
✅ Télécharger les PDF
✅ Envoyer par email
✅ Suivi du statut (Brouillon, Envoyé, Signé, Payé)
✅ Numérotation automatique des documents (DEV-2025-0001)

## 🚀 Comment Utiliser

### 1. Créer un Template (Admin)

1. Aller sur `/admin/documents`
2. Cliquer sur "Nouveau Template"
3. Remplir :
   - Nom : "Devis Standard"
   - Type : Devis
   - Langue par défaut : Français
   - Description (optionnel)

### 2. Générer un Document (Utilisateur)

1. Ouvrir une submission TBL (module TreeBranchLeaf)
2. Aller dans l'onglet "Client"
3. Cliquer sur "Nouveau Document" → Devis
4. Le PDF est généré automatiquement !

## 📁 Fichiers Importants

```
src/
├── routes/
│   ├── documents.ts              # API Templates (Admin)
│   └── documents-generated.ts    # API Documents générés (Users)
├── pages/
│   └── DocumentTemplatesPage.tsx # Interface admin
├── components/
│   └── Documents/
│       └── DocumentsSection.tsx  # Composant TBL Client
└── components/TreeBranchLeaf/
    └── treebranchleaf-new/TBL/
        ├── TBL.tsx              # Intégration dans TBL
        └── components/
            └── ClientSidebar.tsx # Sidebar avec documents

prisma/
└── schema.prisma                 # Schéma DB
```

## 🌍 Détection Automatique de Langue

Le système détecte automatiquement la langue basée sur :
- Pays du lead (si disponible)
- Région (Flandre → NL, Wallonie → FR)
- Adresse (mots-clés dans la ville/région)
- Par défaut : Français

## 📋 Routes API

### Admin (Templates)
- `GET /api/documents/templates` - Liste templates
- `POST /api/documents/templates` - Créer template
- `PUT /api/documents/templates/:id` - Modifier template
- `DELETE /api/documents/templates/:id` - Supprimer template

### Sections
- `POST /api/documents/templates/:id/sections` - Ajouter section
- `PUT /api/documents/sections/:id` - Modifier section
- `DELETE /api/documents/sections/:id` - Supprimer section

### Thèmes
- `GET /api/documents/themes` - Liste thèmes
- `POST /api/documents/themes` - Créer thème

### Documents Générés (Users)
- `GET /api/documents/generated?submissionId=xxx` - Liste documents
- `POST /api/documents/generated/generate` - Générer document
- `GET /api/documents/generated/:id` - Détails document
- `POST /api/documents/generated/:id/send` - Envoyer email
- `DELETE /api/documents/generated/:id` - Supprimer

## 🎨 Types de Sections Disponibles

- `COVER_PAGE` - Page de garde
- `COMPANY_PRESENTATION` - Présentation entreprise
- `TEXT_BLOCK` - Bloc de texte
- `PRODUCT_OFFER` - Offre produit
- `PRICING_TABLE` - Tableau de prix
- `CHART_ROI` - Graphique ROI
- `CHART_BAR` - Graphique barres
- `CHART_LINE` - Graphique lignes
- `CHART_PIE` - Graphique camembert
- `IMAGE` - Image
- `TERMS_CONDITIONS` - Conditions générales
- `SIGNATURE_BLOCK` - Zone signature
- `PAGE_BREAK` - Saut de page

## 📝 Statuts de Documents

- **DRAFT** - Brouillon
- **SENT** - Envoyé au client
- **VIEWED** - Vu par le client
- **SIGNED** - Signé électroniquement
- **PAID** - Payé
- **CANCELLED** - Annulé

## 🔮 Prochaines Étapes (TODO)

1. ✅ Base de données
2. ✅ Routes API
3. ✅ Interface admin
4. ✅ Intégration TBL
5. ⏳ Génération PDF réelle avec React-PDF
6. ⏳ Éditeur de sections drag & drop
7. ⏳ Templates pré-définis (5-10 templates professionnels)
8. ⏳ Signatures électroniques
9. ⏳ Paiements en ligne (Stripe)
10. ⏳ Portail client public

## 🐛 Dépannage

### Le composant DocumentsSection ne s'affiche pas ?
- Vérifier que `submissionId` ou `leadId` est passé en props
- Vérifier la console pour les erreurs API

### Les documents ne se génèrent pas ?
- Vérifier qu'il existe au moins un template actif du bon type
- Vérifier les logs du serveur API

### Erreur "Template non trouvé" ?
- S'assurer que l'admin a créé des templates dans `/admin/documents`

## 📞 Support

Pour toute question, contacter l'équipe dev ! 🚀
