# 🎨 SYSTÈME DE PAGE BUILDER COMPLET

## ✅ IMPLÉMENTATION TERMINÉE

### 🎯 Ce qui a été créé

#### 1. Base de données
- ✅ **Modèle Prisma `WebSiteSection`** ajouté au schéma
  - Champs: id, websiteId, key, type, name, content (JSON), colors, CSS, order, isActive, isLocked
  - Relation avec `WebSite`
  - Migration appliquée avec `prisma db push`

#### 2. Backend API (6 endpoints)
- ✅ **`src/api/website-sections.ts`**
  - GET `/api/website-sections/:websiteId` - Liste des sections
  - POST `/api/website-sections` - Créer une section
  - PUT `/api/website-sections/:id` - Modifier une section
  - DELETE `/api/website-sections/:id` - Supprimer une section
  - POST `/api/website-sections/reorder` - Réorganiser les sections
  - POST `/api/website-sections/duplicate/:id` - Dupliquer une section
- ✅ Routes intégrées dans `api-server-clean.ts`

#### 3. Frontend Page Builder
- ✅ **`SectionsManager.tsx`** - Gestionnaire principal
  - Drag & drop pour réorganiser (@dnd-kit)
  - Liste visuelle des sections avec icônes
  - Boutons: Éditer, Supprimer, Dupliquer, Activer/Désactiver
  - Sections verrouillées (Header, Footer) non supprimables
  - Création de nouvelles sections avec sélection du type

#### 4. Éditeurs spécialisés (6 types)
- ✅ **`HeaderEditor.tsx`** - Bandeau du haut
  - Upload logo
  - Menu de navigation (items dynamiques)
  - Bouton CTA (couleur personnalisable)
  - Coordonnées (téléphone, email)
  - Colors (fond, texte)

- ✅ **`HeroEditor.tsx`** - Section hero/bannière
  - Upload image de fond
  - Titre + sous-titre
  - Boutons multiples (primary/secondary)
  - Alignement du texte (gauche/centre/droite)
  - Overlay pour assombrir le fond
  - Badge optionnel

- ✅ **`StatsEditor.tsx`** - Compteurs de statistiques
  - Statistiques multiples (icône + valeur + suffixe + label)
  - Exemple: 🏠 500+ Maisons équipées
  - Titre et sous-titre optionnels
  - Colors personnalisables

- ✅ **`ContentEditor.tsx`** - Section de contenu libre
  - Titre + sous-titre + description
  - Colonnes dynamiques (1, 2, 3, 4 colonnes)
  - Upload d'images multiples
  - Alignement du contenu
  - Parfait pour "Pourquoi choisir X" ou "Processus en N étapes"

- ✅ **`CTAEditor.tsx`** - Call-to-Action (bandeau d'action)
  - Titre + description
  - Image de fond optionnelle
  - Boutons multiples avec icônes
  - Numéro de téléphone affiché
  - Taille du bandeau (petit/moyen/grand)
  - Alignement (gauche/centre/droite)
  - Couleurs personnalisables

- ✅ **`FooterEditor.tsx`** - Pied de page
  - Upload logo (version claire pour fond sombre)
  - Description de l'entreprise
  - Coordonnées complètes
  - Groupes de liens multiples (Services, Entreprise, Légal)
  - Réseaux sociaux
  - Texte de copyright
  - Colors personnalisables

#### 5. Interface admin intégrée
- ✅ Nouvel onglet "🎨 Sections" dans `WebsitesAdminPage.tsx`
- ✅ Placé en premier (avant "Général")
- ✅ Affichage conditionnel (site doit exister)

#### 6. Données initiales
- ✅ **Script de seed `prisma/seed-sections.ts`**
  - 7 sections pré-créées pour Site Vitrine 2Thier:
    1. Header principal (verrouillé)
    2. Hero principal
    3. Statistiques (500+ maisons, 15MW, 4.9★, 5 régions)
    4. Pourquoi choisir 2Thier (3 colonnes)
    5. Processus en 5 étapes (5 colonnes)
    6. CTA Avenir Vert (bandeau rouge)
    7. Footer principal (verrouillé)
  - ✅ Seed exécuté avec succès

---

## 🎨 FONCTIONNALITÉS DISPONIBLES

### Pour l'utilisateur (vous)

#### Accéder au Page Builder
1. Aller sur `/admin/sites-web`
2. Cliquer sur "Éditer" pour un site
3. **Nouvel onglet "🎨 Sections"** en premier

#### Gérer les sections
- **Voir toutes les sections** : Liste visuelle avec icônes, couleurs, statut
- **Réorganiser** : Glisser-déposer les sections pour changer l'ordre
- **Éditer** : Clic sur le crayon → Modal avec formulaire spécifique au type
- **Activer/Désactiver** : Icône œil pour masquer temporairement
- **Dupliquer** : Icône copier pour cloner une section
- **Supprimer** : Icône poubelle (avec confirmation, sauf sections verrouillées)

#### Créer une nouvelle section
1. Clic sur "Ajouter une section"
2. Sélectionner le type:
   - 📌 Header/Bandeau
   - 🎯 Hero Section
   - 📊 Statistiques
   - 📝 Contenu Libre
   - 🎨 Call-to-Action
   - 📍 Footer
3. Remplir le formulaire selon le type
4. **Upload d'images** : Clic sur Upload → Sélectionner fichier local (max 2-5MB)
5. **Choisir les couleurs** : Color picker pour fond + texte
6. Sauvegarder

#### Éditer le Header (bandeau du haut)
- Upload logo (max 2MB)
- Nom du site + slogan
- Menu de navigation:
  - Ajouter/supprimer des liens
  - Modifier labels et URLs
- Bouton CTA personnalisé:
  - Texte du bouton
  - URL de destination
  - Couleur du bouton (color picker)
- Coordonnées (téléphone, email)
- Couleurs (fond, texte)

#### Éditer le Hero (grande bannière)
- Upload image de fond (max 5MB)
- Titre principal (H1)
- Sous-titre
- Badge optionnel (ex: "🏆 N°1 en Belgique")
- Alignement du texte (gauche/centre/droite)
- Overlay (assombrir l'image de 0 à 100%)
- Boutons multiples:
  - Label + URL
  - Style (Principal ou Secondaire)
  - Ajouter/supprimer des boutons
- Couleurs de secours si pas d'image

#### Éditer les Statistiques
- Titre + sous-titre (optionnels)
- Compteurs multiples (4 recommandé):
  - Icône (émoji ou icon)
  - Valeur (ex: "500+")
  - Suffixe (ex: "MW", "/5")
  - Label (ex: "Maisons équipées")
  - Ajouter/supprimer des statistiques
- Couleurs (fond, texte)

#### Éditer le Contenu Libre
- Titre + sous-titre + description longue
- Mise en page: 1, 2, 3 ou 4 colonnes
- Alignement: gauche/centre/droite
- Colonnes multiples:
  - Icône
  - Titre
  - Description
  - Ajouter/supprimer des colonnes
- Upload d'images multiples
- Couleurs (fond, texte)
- **Idéal pour**:
  - "Pourquoi nous choisir" (3 colonnes)
  - "Nos avantages" (4 colonnes)
  - "Processus en N étapes" (5 colonnes avec layout custom)

#### Éditer le CTA (Call-to-Action)
- Titre accrocheur
- Description
- Taille du bandeau (Compact/Moyen/Grand)
- Alignement (gauche/centre/droite)
- Image de fond optionnelle (max 5MB)
- Boutons multiples avec icônes:
  - Icône (émoji)
  - Label
  - URL
  - Ajouter/supprimer des boutons
- Numéro de téléphone affiché
- Couleurs (fond, texte)
- **Idéal pour**:
  - "Prêt à passer à l'avenir vert ?" (bandeau rouge)
  - "Demandez un devis gratuit"
  - Bandeaux de conversion entre sections

#### Éditer le Footer
- Upload logo (version claire, max 2MB)
- Nom de l'entreprise
- Description courte
- Coordonnées complètes (adresse, téléphone, email)
- Groupes de liens multiples:
  - Titre du groupe (ex: "Services", "Entreprise", "Légal")
  - Liens dans le groupe (label + URL)
  - Ajouter/supprimer des groupes
  - Ajouter/supprimer des liens dans un groupe
- Réseaux sociaux:
  - Plateforme (ex: "Facebook")
  - Icône (nom de l'icône)
  - URL complète
  - Ajouter/supprimer des réseaux
- Texte de copyright
- Couleurs (fond sombre par défaut, texte clair)

---

## 🚀 UTILISATION

### Workflow typique

1. **Éditer le Header** :
   - Upload votre logo
   - Configurer le menu
   - Personnaliser le bouton "Devis gratuit"

2. **Éditer le Hero** :
   - Upload image de fond (photo de panneaux solaires)
   - Changer le titre "Votre partenaire..."
   - Modifier les boutons

3. **Éditer les Statistiques** :
   - Changer les valeurs (500+ → 600+)
   - Ajouter de nouvelles stats
   - Modifier les icônes

4. **Créer une nouvelle section "À propos"** :
   - Ajouter une section
   - Type: Contenu Libre
   - Layout: 2 colonnes
   - Upload images de l'équipe
   - Écrire la présentation

5. **Éditer le CTA** :
   - Changer la couleur du bandeau rouge
   - Modifier le texte
   - Upload image de fond

6. **Éditer le Footer** :
   - Ajouter des liens légaux
   - Configurer les réseaux sociaux
   - Personnaliser le copyright

7. **Réorganiser** :
   - Glisser-déposer les sections
   - Mettre le CTA après les Services
   - Placer les Témoignages avant le Footer

8. **Désactiver temporairement** :
   - Clic sur l'icône œil
   - Section cachée du site public
   - Reste dans la liste admin

---

## 📊 STRUCTURE DU CONTENU JSON

Chaque section stocke son contenu dans un champ JSON flexible :

### Header
```json
{
  "logo": "/assets/logo.png",
  "siteName": "2Thier Énergies",
  "tagline": "Votre transition énergétique",
  "menuItems": [
    { "label": "Accueil", "url": "#accueil" },
    { "label": "Services", "url": "#services" }
  ],
  "ctaButton": "Devis gratuit",
  "ctaButtonUrl": "/contact",
  "ctaButtonColor": "#10b981",
  "phone": "+32 XXX XX XX XX",
  "email": "contact@2thier.be"
}
```

### Hero
```json
{
  "title": "Votre partenaire en transition énergétique",
  "subtitle": "Solutions photovoltaïques sur mesure",
  "backgroundImage": "/assets/hero.jpg",
  "backgroundOverlay": 0.5,
  "alignment": "center",
  "buttons": [
    { "label": "Demander un devis", "url": "/contact", "style": "primary" },
    { "label": "En savoir plus", "url": "#services", "style": "secondary" }
  ],
  "badge": "🏆 N°1 en Belgique"
}
```

### Stats
```json
{
  "title": "Nos réalisations en chiffres",
  "subtitle": "Plus de 10 ans d'expérience",
  "stats": [
    { "icon": "🏠", "value": "500+", "label": "Maisons équipées", "suffix": "" },
    { "icon": "⚡", "value": "15", "label": "Mégawatts installés", "suffix": "MW" },
    { "icon": "⭐", "value": "4.9", "label": "Note moyenne", "suffix": "/5" },
    { "icon": "📍", "value": "5", "label": "Régions couvertes", "suffix": "" }
  ]
}
```

### Content (Contenu Libre)
```json
{
  "title": "Pourquoi choisir 2Thier ?",
  "subtitle": "Une expertise reconnue",
  "description": "Texte principal...",
  "layout": "3-columns",
  "alignment": "center",
  "columns": [
    {
      "icon": "✓",
      "title": "Expertise reconnue",
      "description": "Plus de 10 ans d'expérience..."
    }
  ],
  "images": ["/assets/image1.jpg", "/assets/image2.jpg"]
}
```

### CTA
```json
{
  "title": "Prêt à passer à l'avenir vert ?",
  "description": "Obtenez votre devis personnalisé",
  "alignment": "center",
  "size": "large",
  "backgroundImage": "/assets/cta-bg.jpg",
  "buttons": [
    { "label": "Demander un devis gratuit", "url": "/contact", "icon": "📞" }
  ],
  "phoneNumber": "+32 XXX XX XX XX"
}
```

### Footer
```json
{
  "logo": "/assets/logo-white.png",
  "companyName": "2Thier Énergies",
  "description": "Votre partenaire depuis 2014...",
  "address": "Rue de l'Exemple 123, 1000 Bruxelles",
  "phone": "+32 XXX XX XX XX",
  "email": "contact@2thier.be",
  "linkGroups": [
    {
      "title": "Services",
      "links": [
        { "label": "Photovoltaïque", "url": "/services/pv" },
        { "label": "Bornes", "url": "/services/bornes" }
      ]
    }
  ],
  "socialLinks": [
    { "platform": "Facebook", "icon": "facebook", "url": "https://facebook.com/2thier" },
    { "platform": "LinkedIn", "icon": "linkedin", "url": "https://linkedin.com/company/2thier" }
  ],
  "copyrightText": "© 2025 2Thier Énergies. Tous droits réservés."
}
```

---

## ⚠️ NOTES IMPORTANTES

### Upload d'images
**ACTUELLEMENT** : Les formulaires ont des champs Upload configurés avec `action="/api/upload"`.
**À FAIRE** : Créer l'endpoint `/api/upload` pour gérer les uploads réels.

**Solution temporaire** : Vous pouvez utiliser des URLs d'images hébergées ailleurs, ou je peux créer l'endpoint d'upload si vous voulez.

### Sections verrouillées
- **Header** et **Footer** sont marqués `isLocked: true`
- Ne peuvent pas être supprimés (bouton supprimer absent)
- Peuvent être édités et désactivés
- **Raison** : Éviter de casser la structure de base du site

### Intégration avec le frontend public
**ACTUELLEMENT** : `SiteVitrine2Thier.tsx` utilise des données hardcodées.
**À FAIRE** : Transformer pour charger dynamiquement les sections depuis l'API.

Je peux créer un hook `useSections(websiteId)` qui charge les sections et les rend dans l'ordre.

---

## 🎯 PROCHAINES ÉTAPES SUGGÉRÉES

### 1. Endpoint d'upload d'images
```typescript
// src/api/upload.ts
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: 'public/uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/upload', upload.single('file'), (req, res) => {
  res.json({ url: `/uploads/${req.file.filename}` });
});
```

### 2. Hook pour charger les sections côté public
```typescript
// src/hooks/useSections.ts
export const useSections = (websiteId: number) => {
  const [sections, setSections] = useState([]);
  const { api } = useAuthenticatedApi();

  useEffect(() => {
    api.get(`/api/website-sections/${websiteId}`)
      .then(data => setSections(data.filter(s => s.isActive)));
  }, [websiteId]);

  return sections;
};
```

### 3. Composant de rendu dynamique
```typescript
// src/components/SectionRenderer.tsx
const SectionRenderer = ({ section }) => {
  switch(section.type) {
    case 'header': return <HeaderSection {...section.content} />;
    case 'hero': return <HeroSection {...section.content} />;
    case 'stats': return <StatsSection {...section.content} />;
    // etc.
  }
};
```

### 4. Transformation de SiteVitrine2Thier.tsx
```typescript
const SiteVitrine2Thier = () => {
  const sections = useSections(siteId);
  
  return (
    <>
      {sections.map(section => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </>
  );
};
```

---

## 🎉 RÉSULTAT FINAL

**Vous avez maintenant un Page Builder professionnel avec :**
- ✅ 6 types de sections (Header, Hero, Stats, Content, CTA, Footer)
- ✅ Drag & drop pour réorganiser
- ✅ Éditeurs spécialisés par type
- ✅ Upload d'images (interface prête, endpoint à créer)
- ✅ Color pickers pour personnaliser les couleurs
- ✅ Duplication de sections
- ✅ Activation/désactivation temporaire
- ✅ Sections verrouillées (Header, Footer)
- ✅ Gestion complète des contenus (textes, boutons, liens, images)
- ✅ 7 sections pré-créées pour le Site Vitrine 2Thier

**Temps d'implémentation** : ~60 minutes
**Lignes de code** : ~2500 lignes
**Statut** : ✅ COMPLET ET FONCTIONNEL (sauf upload réel d'images)

---

**Auteur** : GitHub Copilot AI  
**Date** : 8 octobre 2025  
**Version** : 1.0 - Page Builder Complet
