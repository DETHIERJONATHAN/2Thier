# 🔧 CORRECTIONS COMPLÈTES DES CONDITIONS DE SCHÉMAS

## 📋 Résumé

**Date**: 13 octobre 2025  
**Problème**: Les ContactFormSelector et autres champs conditionnels n'apparaissaient pas quand l'utilisateur changeait le type d'action  
**Cause racine**: Mauvaise extraction des valeurs dans les fonctions `condition()` des schémas

---

## 🎯 Problème Identifié

### Contexte des Valeurs dans les Schémas

Quand un champ est défini **à l'intérieur d'un `group`** ou d'un **`array` itemType**, le paramètre `values` de la fonction `condition()` contient **directement les valeurs du group/item**, PAS les valeurs complètes du formulaire.

### Exemple du Problème

```typescript
// ❌ MAUVAIS (avant correction)
{
  id: 'cta',
  type: 'group',
  fields: [
    {
      id: 'formAnchor',
      type: 'contact-form-selector',
      condition: (values) => {
        // 🚫 values contient déjà le CTA directement !
        // values = { actionType: 'contact-form', text: '...', ... }
        const button = values?.cta || {};  // ❌ values.cta est undefined !
        const action = button.actionType;
        return action === 'contact-form';
      }
    }
  ]
}

// ✅ BON (après correction)
{
  id: 'cta',
  type: 'group',
  fields: [
    {
      id: 'formAnchor',
      type: 'contact-form-selector',
      condition: (values) => {
        // ✅ values contient directement { actionType, text, ... }
        const action = values?.actionType;
        return action === 'contact-form';
      }
    }
  ]
}
```

---

## 📂 Fichiers Corrigés

### 1. **header.schema.ts** ✅

**Emplacement**: `src/site/schemas/header.schema.ts`  
**Section**: `cta` (group)

**Conditions corrigées**:
- ✅ `text` - ligne ~310
- ✅ `formAnchor` - ligne ~323 (ContactFormSelector)
- ✅ `sectionAnchor` - ligne ~340
- ✅ `pageSlug` - ligne ~360
- ✅ `customUrl` - ligne ~380
- ✅ `openInNewTab` - ligne ~390
- ✅ `phoneNumber` - ligne ~400
- ✅ `emailAddress` - ligne ~410
- ✅ `buttonType` - ligne ~420
- ✅ `buttonSize` - ligne ~435
- ✅ `style` (group) - ligne ~450

**Changement type**:
```typescript
// Avant
const button = values?.cta || {};
const action = button.actionType || ...;

// Après
const action = values?.actionType;
```

---

### 2. **hero.schema.ts** ✅

**Emplacement**: `src/site/schemas/hero.schema.ts`  
**Sections**: `primaryButton` et `secondaryButton` (groups)

**Conditions corrigées** (déjà corrigées précédemment):
- ✅ `formAnchor` (primaryButton) - ligne ~198
- ✅ `sectionAnchor` (primaryButton)
- ✅ `pageSlug` (primaryButton)
- ✅ `customUrl` (primaryButton)
- ✅ `openInNewTab` (primaryButton)
- ✅ `phoneNumber` (primaryButton)
- ✅ `emailAddress` (primaryButton)
- ✅ Tous les champs de `secondaryButton` (même pattern)

**Changement type**:
```typescript
// Gère à la fois le contexte du group ET le contexte global
const action = values?.actionType || values?.primaryButton?.actionType;
```

---

### 3. **services.schema.ts** ✅

**Emplacement**: `src/site/schemas/services.schema.ts`  
**Section**: `services[]` → item `cta` (group dans array)

**Conditions corrigées**:
- ✅ `text` - ligne ~207
- ✅ `formAnchor` - ligne ~219 (ContactFormSelector)
- ✅ `sectionAnchor` - ligne ~235
- ✅ `pageSlug` - ligne ~255
- ✅ `customUrl` - ligne ~275

**Changement type**:
```typescript
// Avant
const action = values?.cta?.actionType || (values?.ctaUrl ? 'external-url' : ...);

// Après
const action = values?.actionType || 'contact-form';
```

**Type de champ corrigé**:
```typescript
// Avant
{
  id: 'formAnchor',
  type: 'select',  // ❌ Simple select
  options: {
    choices: [
      { label: '#contact', value: '#contact' },
      ...
    ]
  }
}

// Après
{
  id: 'formAnchor',
  type: 'contact-form-selector',  // ✅ ContactFormSelector
  options: {
    placeholder: 'Créer ou sélectionner un formulaire',
    allowCreate: true
  }
}
```

---

### 4. **cta.schema.ts** ✅

**Emplacement**: `src/site/schemas/cta.schema.ts`  
**Section**: `buttons[]` (array itemType)

**Conditions corrigées**:
- ✅ `text` - ligne ~103
- ✅ `formTarget` - ligne ~149 (ContactFormSelector)
- ✅ `internalPath` - ligne ~130
- ✅ `externalUrl` - ligne ~140
- ✅ `phoneNumber` - ligne ~160
- ✅ `emailAddress` - ligne ~170
- ✅ `openInNewTab` - ligne ~180
- ✅ `href` - ligne ~200

**Changement type**:
```typescript
// Déjà correct mais simplifié pour cohérence
// Avant
const action = values?.actionType || '';
return ['form', 'contact-form'].includes(action);

// Après
const action = values?.actionType || '';
return action === 'form' || action === 'contact-form';
```

---

## 🔍 Vérification Complète

### Tous les endroits avec `contact-form-selector`

1. ✅ **Header** - CTA principal
2. ✅ **Hero** - Primary Button
3. ✅ **Hero** - Secondary Button
4. ✅ **Services** - CTA par service (dans array)
5. ✅ **CTA Section** - Boutons multiples (dans array)

### Autres sections analysées (sans contact-form)

- ✅ **Footer** - Liens simples, pas de CTA
- ✅ **Process** - Pas de CTA
- ✅ **Projects** - Pas de CTA
- ✅ **Testimonials** - Pas de CTA
- ✅ **Stats** - Pas de CTA
- ✅ **Values** - Pas de CTA

---

## 📊 Impact des Corrections

### Avant les corrections

```
User change "Type d'action" → "Formulaire de contact"
→ FieldRenderer évalue condition
→ condition reçoit values = { actionType: 'contact-form', ... }
→ condition cherche values.cta.actionType
→ values.cta est undefined
→ condition retourne false
→ ContactFormSelector n'apparaît PAS ❌
```

### Après les corrections

```
User change "Type d'action" → "Formulaire de contact"
→ FieldRenderer évalue condition (avec Form.useWatch pour valeurs en temps réel)
→ condition reçoit values = { actionType: 'contact-form', ... }
→ condition lit values.actionType directement
→ condition retourne true
→ ContactFormSelector apparaît ✅
```

---

## 🧪 Tests à Effectuer

### Test 1: Header CTA
1. Ouvrir section **Header**
2. Développer **"🔘 Bouton d'Action (CTA)"**
3. Changer **"Type d'action"** → **"Formulaire de contact"**
4. ✅ Le champ **"Formulaire à ouvrir"** doit apparaître
5. Sélectionner formulaire "Clients"
6. Sauvegarder

### Test 2: Hero Buttons
1. Ouvrir section **Hero**
2. Développer **"🟢 Bouton principal"**
3. Changer **"Type d'action"** → **"Formulaire de contact"**
4. ✅ Le champ **"Formulaire à ouvrir"** doit apparaître
5. Répéter pour **"Bouton secondaire"**

### Test 3: Services CTA
1. Ouvrir section **Services**
2. Développer un service
3. Développer **"Bouton CTA"**
4. Changer **"Type d'action"** → **"Formulaire de contact"**
5. ✅ Le champ **"Formulaire à ouvrir"** doit apparaître

### Test 4: CTA Section
1. Ouvrir section **CTA**
2. Développer **"🔘 Boutons"**
3. Développer un bouton
4. Changer **"Type d'action"** → **"Formulaire de contact"**
5. ✅ Le champ **"Formulaire à ouvrir"** doit apparaître

### Test 5: Nettoyage CTA
1. Dans n'importe quelle section
2. Changer **"Type d'action"** → **"Aucun bouton"**
3. Sauvegarder
4. ✅ Le bouton doit disparaître du site
5. ✅ Le bouton ne doit plus apparaître si on réouvre l'éditeur

---

## 🎓 Leçons Apprises

### Règle 1: Contexte des Groups
```typescript
// Dans un group, values contient le group directement
{
  id: 'myGroup',
  type: 'group',
  fields: [
    {
      id: 'myField',
      condition: (values) => {
        // values = myGroup data, PAS full form data
        return values.someProperty === true;
      }
    }
  ]
}
```

### Règle 2: Contexte des Arrays
```typescript
// Dans un array itemType, values contient l'item directement
{
  id: 'myArray',
  type: 'array',
  options: {
    itemType: {
      myField: {
        id: 'myField',
        condition: (values) => {
          // values = item data, PAS array data
          return values.itemProperty === true;
        }
      }
    }
  }
}
```

### Règle 3: Form.useWatch pour Valeurs en Temps Réel
```typescript
// Dans FieldRenderer, toujours utiliser currentFormValues
const watchedValues = Form.useWatch([], { preserve: true });
const currentFormValues = useMemo(
  () => watchedValues || formValues || value || {},
  [watchedValues, formValues, value]
);

// Passer currentFormValues aux conditions
field.condition(currentFormValues);
```

---

## ✅ Résultat Final

### Sections Corrigées: 4
- Header (10 conditions)
- Hero (déjà corrigé)
- Services (5 conditions)
- CTA (2 conditions simplifiées)

### Champs ContactFormSelector Fonctionnels: 5
- Header CTA
- Hero Primary Button
- Hero Secondary Button
- Services CTA (par item)
- CTA Buttons (par item)

### Système de Nettoyage: Universel
- Fonction récursive dans UniversalSectionEditor
- Fonctionne pour TOUS les schemas
- Gère les objects, arrays et nested structures

---

## 🚀 Prochaines Étapes

1. ✅ **Corrections terminées**
2. 🔄 **Tests utilisateur en cours**
3. ⏳ **Validation end-to-end** (CTA → Modal)
4. ⏳ **Tests sur site de production**

---

**Status**: ✅ **CORRECTIONS COMPLÈTES - PRÊT POUR TESTS**
