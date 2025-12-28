# 🚀 SYSTÈME UNIVERSEL DE WEBSITE BUILDER

> Architecture révolutionnaire pour créer des sites web **sans coder** chaque section manuellement.
> **Schéma-driven, AI-powered, infiniment scalable.**

---

## 📁 Structure du Dossier `/site`

```
src/site/
├── 📚 schemas/              # Définitions des sections
│   ├── types.ts            # Types TypeScript complets
│   ├── index.ts            # Registre central
│   ├── header.schema.ts    # Schéma Header
│   ├── hero.schema.ts      # Schéma Hero
│   └── *.schema.ts         # Autres schémas...
│
├── 🎨 editor/               # Composants d'édition
│   ├── UniversalSectionEditor.tsx  # Éditeur universel
│   └── fields/             # Renderers de champs
│       ├── FieldRenderer.tsx       # Générateur de champs
│       ├── ArrayFieldEditor.tsx    # Listes drag & drop
│       ├── IconPicker.tsx          # Sélecteur d'icônes
│       ├── ImageUploader.tsx       # Upload d'images
│       ├── RichTextEditor.tsx      # Éditeur WYSIWYG
│       └── GridConfigEditor.tsx    # Config grille
│
├── 🤖 ai/                   # Intégration IA
│   ├── AIAssistButton.tsx          # Bouton ✨ IA
│   └── AIContentGenerator.tsx      # Générateur complet
│
├── 🎬 renderer/             # Rendu des sections
│   └── (à créer)
│
├── 🏗️ builder/              # Interface de construction
│   └── (à créer)
│
├── 🛠️ utils/                # Utilitaires
│   └── (à créer)
│
└── 🌐 api/                  # Routes API
    └── (à créer)
```

---

## 🎯 CONCEPT CLÉ : Le Schéma

Au lieu de coder manuellement chaque éditeur de section, on définit un **schéma JSON** :

```typescript
export const heroSchema: SectionSchema = {
  type: 'hero',
  name: '🚀 Hero Section',
  icon: '🚀',
  category: 'content',
  aiEnabled: true,
  
  fields: [
    {
      id: 'title',
      type: 'rich-text',
      label: 'Titre Principal',
      required: true,
      options: {
        aiSuggest: true,
        aiContext: 'main_headline'
      }
    },
    // ... autres champs
  ],
  
  defaults: {
    title: 'Titre par défaut',
    // ... valeurs par défaut
  }
};
```

Le système lit ce schéma et **génère automatiquement** :
- ✅ L'interface d'édition (formulaire)
- ✅ La validation
- ✅ Les suggestions IA
- ✅ Le rendu visuel

---

## 🔄 FLUX DE DONNÉES

```
┌─────────────────────────────────────────────────────┐
│ 1. DÉFINITION (schema)                              │
│    header.schema.ts → SectionSchema                 │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 2. ÉDITION (editor)                                 │
│    UniversalSectionEditor → Form + FieldRenderer    │
│    User édite → onChange(newContent)                │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 3. STOCKAGE (database)                              │
│    SectionInstance { id, type, content, order }     │
│    Saved in PostgreSQL via Prisma                   │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 4. RENDU (renderer)                                 │
│    SectionRenderer → Composant React final          │
│    Display on live site                             │
└─────────────────────────────────────────────────────┘
```

---

## 📝 CRÉER UNE NOUVELLE SECTION

### Étape 1 : Créer le schéma

```bash
# Créer le fichier
src/site/schemas/services.schema.ts
```

```typescript
import { SectionSchema } from './types';

export const servicesSchema: SectionSchema = {
  type: 'services',
  name: '⚡ Services',
  icon: '⚡',
  category: 'content',
  aiEnabled: true,
  
  fields: [
    {
      id: 'title',
      type: 'text',
      label: 'Titre de la section',
      default: 'Nos Services',
      options: { aiSuggest: true }
    },
    {
      id: 'items',
      type: 'array',
      label: 'Liste des services',
      options: {
        draggable: true,
        maxItems: 6,
        itemType: {
          title: {
            id: 'title',
            type: 'text',
            label: 'Nom du service'
          },
          description: {
            id: 'description',
            type: 'textarea',
            label: 'Description'
          },
          icon: {
            id: 'icon',
            type: 'icon',
            label: 'Icône'
          }
        }
      }
    }
  ],
  
  defaults: {
    title: 'Nos Services',
    items: [
      {
        title: 'Installation',
        description: 'Installation de panneaux solaires',
        icon: 'ThunderboltOutlined'
      }
    ]
  }
};
```

### Étape 2 : Enregistrer dans le registre

```typescript
// src/site/schemas/index.ts
import servicesSchema from './services.schema';

export const sectionRegistry: SectionSchemaRegistry = {
  header: headerSchema,
  hero: heroSchema,
  services: servicesSchema, // ✅ AJOUTÉ !
  // ...
};
```

### Étape 3 : C'EST TOUT ! 🎉

L'éditeur est **automatiquement** généré. Pas de code supplémentaire !

```tsx
<UniversalSectionEditor
  sectionType="services"
  content={servicesContent}
  onChange={handleUpdate}
/>
```

---

## 🎨 TYPES DE CHAMPS DISPONIBLES

| Type | Description | Exemple |
|------|-------------|---------|
| `text` | Input texte simple | Titre, URL, nom |
| `textarea` | Zone de texte multiligne | Description |
| `rich-text` | Éditeur WYSIWYG | Contenu formaté |
| `number` | Input numérique | Prix, quantité |
| `slider` | Curseur (min/max) | Opacité, taille |
| `size` | Taille CSS (px, rem, %) | Largeur, hauteur |
| `spacing` | Marges/Padding | 16px 24px |
| `color` | Sélecteur de couleur | #10b981 |
| `icon` | Emoji ou Ant Icon | ⚡, HomeOutlined |
| `image` | Upload d'image | Logo, photo |
| `select` | Liste déroulante | Choix multiples |
| `boolean` | Switch ON/OFF | Activer/Désactiver |
| `array` | Liste d'items | Menu, services, témoignages |
| `group` | Groupe de champs | Card ou Collapse |
| `grid` | Config layout grille | Colonnes responsive |

---

## 🤖 INTÉGRATION IA

### AI Assist Button (par champ)

```typescript
{
  id: 'title',
  type: 'text',
  label: 'Titre',
  options: {
    aiSuggest: true,        // ✅ Active le bouton ✨
    aiContext: 'main_headline'  // Context pour l'IA
  }
}
```

Un bouton **✨** apparaît à côté du champ. Au clic :
- Génère une suggestion basée sur le contexte
- L'utilisateur peut accepter ou modifier

### AI Content Generator (section complète)

```typescript
aiEnabled: true,
aiContext: {
  businessType: ['energy', 'solar'],
  tone: ['professional', 'inspiring'],
  keywords: ['photovoltaïque', 'économies']
}
```

Bouton **"Générer avec IA"** dans l'éditeur :
- Génère TOUT le contenu de la section
- Titre, sous-titre, CTA, images, couleurs
- Cohérent et optimisé SEO

---

## 🔌 API ENDPOINTS (à créer)

```typescript
// POST /api/ai/generate-field
// Génère un champ individuel
{
  fieldId: 'title',
  fieldType: 'text',
  aiContext: 'main_headline',
  businessType: 'energy',
  tone: 'professional'
}

// POST /api/ai/generate-section
// Génère une section complète
{
  sectionType: 'hero',
  aiContext: { businessType, tone, keywords },
  currentContent: { ... }
}

// POST /api/ai/optimize-image
// Optimise une image (compression, resize, alt text)
{
  imageUrl: 'https://...',
  context: 'hero_image'
}

// POST /api/ai/suggest-styles
// Suggère des couleurs/styles cohérents
{
  sectionType: 'hero',
  brandColors: ['#10b981'],
  mood: 'professional'
}
```

---

## 📦 DÉPENDANCES

### Installées
- ✅ `antd` : Composants UI
- ✅ `@ant-design/icons` : Icônes
- ✅ `@dnd-kit/core` + `@dnd-kit/sortable` : Drag & drop

### À installer (si besoin)
```bash
# Rich text editor (optionnel)
npm install react-quill

# Image crop (optionnel)
npm install react-easy-crop

# AI/OpenAI (backend)
npm install openai
```

---

## 🚀 PROCHAINES ÉTAPES

### Phase 1 : Schémas Complets ✅ (En cours)
- [x] types.ts
- [x] header.schema.ts
- [x] hero.schema.ts
- [ ] services.schema.ts
- [ ] stats.schema.ts
- [ ] testimonials.schema.ts
- [ ] projects.schema.ts
- [ ] cta.schema.ts
- [ ] footer.schema.ts
- [ ] contact.schema.ts

### Phase 2 : Composants Manquants 🔄 (En cours)
- [x] FieldRenderer.tsx
- [x] ArrayFieldEditor.tsx
- [x] IconPicker.tsx
- [x] ImageUploader.tsx
- [x] RichTextEditor.tsx (basique)
- [x] GridConfigEditor.tsx
- [x] AIAssistButton.tsx
- [x] AIContentGenerator.tsx
- [ ] UniversalSectionRenderer.tsx
- [ ] SectionPreview.tsx

### Phase 3 : Intégration NoCodeBuilder 📝 (À faire)
- [ ] Remplacer PropertyEditor par UniversalSectionEditor
- [ ] Mettre à jour SectionEditor.tsx pour utiliser les schémas
- [ ] Tester avec sections existantes (header, hero)
- [ ] Migration des données si nécessaire

### Phase 4 : API AI 🤖 (À faire)
- [ ] Route `/api/ai/generate-field`
- [ ] Route `/api/ai/generate-section`
- [ ] Route `/api/ai/optimize-image`
- [ ] Route `/api/ai/suggest-styles`
- [ ] Intégration OpenAI/Claude

### Phase 5 : Tests & Docs 📚 (À faire)
- [ ] Tests unitaires des schémas
- [ ] Tests d'intégration
- [ ] Guide utilisateur
- [ ] Vidéos tutoriels

---

## 💡 AVANTAGES DU SYSTÈME

### Pour les Développeurs
- ✅ **Pas de duplication** : Un schéma = Une section complète
- ✅ **Scalable** : Ajouter une section = 1 fichier JSON
- ✅ **Maintenable** : Logique centralisée
- ✅ **Type-safe** : TypeScript partout
- ✅ **Testable** : Schémas validables

### Pour les Utilisateurs
- ✅ **Interface unique** : Même UX partout
- ✅ **AI partout** : Suggestions intelligentes
- ✅ **Drag & drop** : Réorganisation facile
- ✅ **Prévisualisation** : Voir les changements en direct
- ✅ **Aucun code** : 100% visuel

### Pour le Business
- ✅ **Time-to-market** : Nouveau site en minutes
- ✅ **Coût réduit** : Moins de développement custom
- ✅ **Évolutif** : Nouvelles fonctionnalités = nouveaux schémas
- ✅ **Multi-tenant** : Un système, des milliers de sites

---

## 🎓 APPRENTISSAGE

### Pour comprendre le système

1. **Lire `types.ts`** : Toutes les interfaces et types
2. **Étudier `header.schema.ts`** : Exemple de schéma complet
3. **Analyser `FieldRenderer.tsx`** : Comment un schéma devient UI
4. **Tester `UniversalSectionEditor.tsx`** : L'éditeur en action

### Pour ajouter une feature

1. **Nouveau type de champ ?** → Ajouter dans `FieldType` + case dans `FieldRenderer`
2. **Nouvelle section ?** → Créer `*.schema.ts` + enregistrer dans `index.ts`
3. **Nouvelle fonctionnalité AI ?** → Ajouter dans `AIContext` + endpoint API

---

## 📞 SUPPORT

Questions ? Bugs ? Améliorations ?

- **Créateur :** 2Thier CRM Team
- **Documentation :** Ce fichier + commentaires inline
- **Code source :** Entièrement documenté avec JSDoc

---

## 🏆 PHILOSOPHIE

> "Un système qui génère son interface depuis un schéma n'est pas seulement plus rapide à développer, il est **infiniment plus scalable**, **plus maintenable**, et **plus puissant** qu'un système codé en dur."

**Ce n'est pas juste un builder de sites. C'est un système d'IA qui comprend l'intention et génère l'interface.**

---

**Made with ⚡ by 2Thier - Powered by AI 🤖**
