# 🎨 PLAN AJOUT SYSTÈME D'ALIGNEMENT - 3 SECTIONS

**Date :** 2025-08-01  
**Objectif :** Ajouter les contrôles d'alignement manquants dans VALUES, PROCESS et CTA

---

## 📊 RÉSUMÉ DES MODIFICATIONS

| Section | Fichier | Contrôles à ajouter | Type |
|---------|---------|---------------------|------|
| **VALUES** | `values.schema.ts` | Grid + textAlign items | Grid + Select |
| **PROCESS** | `process.schema.ts` | textAlign + iconAlign | Select |
| **CTA** | `cta.schema.ts` | textAlign + buttonAlign | Select |

---

## 1️⃣ VALUES - Configuration de Grille

### 📝 Modification `values.schema.ts`

**Ajouter après le champ `items` (ligne ~110) :**

```typescript
{
  id: 'grid',
  type: 'grid',
  label: '📊 Configuration de Grille',
  description: 'Organisation des cartes en colonnes responsive',
  default: {
    columns: { mobile: 1, tablet: 2, desktop: 4 },
    gap: '24px',
    alignment: 'stretch',
    justifyContent: 'center'
  }
},
```

**Ajouter dans le groupe `style` :**

```typescript
{
  id: 'textAlign',
  type: 'select',
  label: 'Alignement du texte',
  default: 'center',
  options: {
    choices: [
      { label: '⬅️ Gauche', value: 'left' },
      { label: '↔️ Centre', value: 'center' },
      { label: '➡️ Droite', value: 'right' }
    ]
  }
},
{
  id: 'iconAlign',
  type: 'select',
  label: 'Position des icônes',
  default: 'center',
  options: {
    choices: [
      { label: '⬅️ Gauche', value: 'flex-start' },
      { label: '↔️ Centre', value: 'center' },
      { label: '➡️ Droite', value: 'flex-end' }
    ]
  }
}
```

**Mettre à jour `defaults.style` :**

```typescript
style: {
  backgroundColor: '#f9fafb',
  iconColor: '#10b981',
  cardBackground: '#ffffff',
  textAlign: 'center',
  iconAlign: 'center'
},
grid: {
  columns: { mobile: 1, tablet: 2, desktop: 4 },
  gap: '24px',
  alignment: 'stretch',
  justifyContent: 'center'
}
```

---

## 2️⃣ PROCESS - Alignement des Étapes

### 📝 Modification `process.schema.ts`

**Ajouter dans le groupe `style` (ligne ~140) :**

```typescript
{
  id: 'textAlign',
  type: 'select',
  label: 'Alignement du texte',
  default: 'center',
  options: {
    choices: [
      { label: '⬅️ Gauche', value: 'left' },
      { label: '↔️ Centre', value: 'center' },
      { label: '➡️ Droite', value: 'right' }
    ]
  }
},
{
  id: 'stepsAlign',
  type: 'select',
  label: 'Orientation des étapes',
  default: 'horizontal',
  options: {
    choices: [
      { label: '↔️ Horizontale', value: 'horizontal' },
      { label: '⬇️ Verticale', value: 'vertical' }
    ]
  }
},
{
  id: 'iconPosition',
  type: 'select',
  label: 'Position des icônes',
  default: 'top',
  options: {
    choices: [
      { label: '⬆️ En haut', value: 'top' },
      { label: '⬅️ À gauche', value: 'left' }
    ]
  }
}
```

**Mettre à jour `defaults.style` :**

```typescript
style: {
  backgroundColor: '#ffffff',
  iconColor: '#10b981',
  textAlign: 'center',
  stepsAlign: 'horizontal',
  iconPosition: 'top'
}
```

---

## 3️⃣ CTA - Alignement du Contenu et des Boutons

### 📝 Modification `cta.schema.ts`

**Rechercher le groupe `style` (ligne ~200+) et ajouter :**

```typescript
{
  id: 'textAlign',
  type: 'select',
  label: 'Alignement du texte',
  default: 'center',
  options: {
    choices: [
      { label: '⬅️ Gauche', value: 'left' },
      { label: '↔️ Centre', value: 'center' },
      { label: '➡️ Droite', value: 'right' }
    ]
  }
},
{
  id: 'contentAlign',
  type: 'select',
  label: 'Alignement du contenu',
  default: 'center',
  description: 'Position du contenu dans la section',
  options: {
    choices: [
      { label: '⬅️ Gauche', value: 'flex-start' },
      { label: '↔️ Centre', value: 'center' },
      { label: '➡️ Droite', value: 'flex-end' }
    ]
  }
},
{
  id: 'buttonAlign',
  type: 'select',
  label: 'Alignement des boutons',
  default: 'center',
  options: {
    choices: [
      { label: '⬅️ Gauche', value: 'flex-start' },
      { label: '↔️ Centre', value: 'center' },
      { label: '➡️ Droite', value: 'flex-end' }
    ]
  }
}
```

**Mettre à jour `defaults.style` :**

```typescript
style: {
  backgroundColor: '#10b981',
  textColor: '#ffffff',
  textAlign: 'center',
  contentAlign: 'center',
  buttonAlign: 'center',
  minHeight: '400px',
  // ... autres champs existants
}
```

---

## 🔄 RENDERERS À METTRE À JOUR

Après modification des schémas, vérifier que les renderers utilisent bien les nouvelles props :

### 1. **ValuesRenderer.tsx**
```typescript
<div style={{ 
  textAlign: content.style?.textAlign || 'center',
  // ...
}}>
  <Row gutter={content.grid?.gap || [24, 24]}>
    {/* Colonnes responsive selon grid.columns */}
  </Row>
</div>
```

### 2. **ProcessRenderer.tsx**
```typescript
<Steps 
  direction={content.style?.stepsAlign || 'horizontal'}
  style={{ textAlign: content.style?.textAlign || 'center' }}
>
  {/* ... */}
</Steps>
```

### 3. **CtaRenderer.tsx**
```typescript
<div style={{
  textAlign: content.style?.textAlign || 'center',
  justifyContent: content.style?.contentAlign || 'center',
  // ...
}}>
  <div style={{ justifyContent: content.style?.buttonAlign || 'center' }}>
    {/* Boutons */}
  </div>
</div>
```

---

## ✅ CHECKLIST D'IMPLÉMENTATION

- [ ] **1. Modifier `values.schema.ts`**
  - [ ] Ajouter champ `grid` (type: 'grid')
  - [ ] Ajouter `textAlign` dans style
  - [ ] Ajouter `iconAlign` dans style
  - [ ] Mettre à jour `defaults`

- [ ] **2. Modifier `process.schema.ts`**
  - [ ] Ajouter `textAlign` dans style
  - [ ] Ajouter `stepsAlign` dans style
  - [ ] Ajouter `iconPosition` dans style
  - [ ] Mettre à jour `defaults`

- [ ] **3. Modifier `cta.schema.ts`**
  - [ ] Ajouter `textAlign` dans style
  - [ ] Ajouter `contentAlign` dans style
  - [ ] Ajouter `buttonAlign` dans style
  - [ ] Mettre à jour `defaults`

- [ ] **4. Tester dans l'éditeur**
  - [ ] VALUES : Vérifier GridConfigEditor s'affiche
  - [ ] PROCESS : Vérifier les selects d'alignement
  - [ ] CTA : Vérifier les selects d'alignement
  - [ ] Tester changement de valeurs et preview

- [ ] **5. Vérifier les renderers**
  - [ ] ValuesRenderer applique grid + textAlign
  - [ ] ProcessRenderer applique stepsAlign + textAlign
  - [ ] CtaRenderer applique contentAlign + buttonAlign

- [ ] **6. Tester en production**
  - [ ] Créer une nouvelle section VALUES
  - [ ] Créer une nouvelle section PROCESS
  - [ ] Créer une nouvelle section CTA
  - [ ] Modifier alignements et vérifier résultat

---

## 💡 NOTES TECHNIQUES

### Type GridConfig (déjà défini dans `types.ts`)
```typescript
interface GridConfig {
  columns: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  gap: string;
  alignment: 'start' | 'center' | 'end' | 'stretch';
  justifyContent: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
}
```

### Composant GridConfigEditor (déjà implémenté)
- Fichier : `src/site/editor/fields/GridConfigEditor.tsx`
- Props : `{ value, onChange, responsive }`
- Utilisation automatique quand `type: 'grid'`

### FieldRenderer gère automatiquement
Le composant `FieldRenderer.tsx` détecte le `type: 'grid'` et affiche `GridConfigEditor` automatiquement. Aucun import manuel nécessaire.

---

## 🎯 RÉSULTAT ATTENDU

Après implémentation, l'utilisateur pourra :

1. **Dans VALUES :**
   - ✅ Choisir nombre de colonnes par device (1-4 mobile, 2-6 tablet, 3-12 desktop)
   - ✅ Ajuster l'espacement entre les cartes (8px à 32px)
   - ✅ Aligner le texte (gauche, centre, droite)
   - ✅ Positionner les icônes (gauche, centre, droite)

2. **Dans PROCESS :**
   - ✅ Aligner le texte (gauche, centre, droite)
   - ✅ Orientation étapes (horizontale, verticale)
   - ✅ Position icônes (en haut, à gauche)

3. **Dans CTA :**
   - ✅ Aligner le texte (gauche, centre, droite)
   - ✅ Positionner le contenu (gauche, centre, droite)
   - ✅ Aligner les boutons (gauche, centre, droite)

**→ Satisfaction demande utilisateur : "pouvoir placer tout où je veux" ✅**
