# 🔧 FIX COMPLET - Suffixes manquants dans table_instances

## ✅ Problème Identifié & Résolu

**Avant**: Les clés de `table_instances` **N'AVAIENT PAS les suffixes**:
```javascript
{
  "9bc0622c-b2df-42a2-902c-6d0c6ecac10b": {  // ❌ PAS DE SUFFIXE
    "tableId": "9bc0622c-b2df-42a2-902c-6d0c6ecac10b"  // ❌ PAS DE SUFFIXE
  }
}
```

**Après**: Les deux la clé ET le `tableId` reçoivent les suffixes:
```javascript
{
  "9bc0622c-b2df-42a2-902c-6d0c6ecac10b-1": {  // ✅ SUFFIXE APPLIQUÉ
    "tableId": "9bc0622c-b2df-42a2-902c-6d0c6ecac10b-1"  // ✅ SUFFIXE APPLIQUÉ
  }
}
```

## 🐛 Root Cause

**Le bug**: Utilisation de `key.includes('-')` pour vérifier si un suffixe existe
```typescript
// ❌ MAUVAIS:
const newKey = key.includes('-') ? key : `${key}-${suffix}`;
// Problème: Les UUIDs CONTIENNENT des tirets! 
// "9bc0622c-b2df-42a2-902c-6d0c6ecac10b".includes('-') === true
// Donc le code pense qu'il a DÉJÀ un suffixe et n'en ajoute pas!
```

## ✅ La Solution

**Utiliser une REGEX pour vérifier le suffixe numérique**:
```typescript
// ✅ BON:
const hasSuffixRegex = /-\d+$/;  // Suffixe numérique à la fin: -1, -2, etc.
const newKey = hasSuffixRegex.test(key) ? key : `${key}-${suffix}`;
// La regex vérifie spécifiquement "-(chiffres)$" à la fin
// Les UUIDs n'en ont pas, donc le suffixe est ajouté ✅
```

## 📝 Fichiers Corrigés

### 1. **treebranchleaf-routes.ts** (PRINCIPAL)
- **Ligne 2061-2066**: Clés de `table_instances` (`/-\d+$/` au lieu de `includes('-')`)
- **Ligne 2074-2082**: Valeurs `tableId` internes (`/-\d+$/` au lieu de `includes('-')`)
- **Statut**: ✅ CORRIGÉ

### 2. **update-selectors-after-copy.ts**
- **Ligne 78-81**: Mapping des tables copiées (`/-\d+$/` au lieu de `includes('-')`)
- **Statut**: ✅ CORRIGÉ

### 3. **copy-variable-with-capacities.ts**
- **Ligne 639-642**: Clés de `table_instances` pour les variables
- **Ligne 645-649**: Valeurs `tableId` pour les variables
- **Statut**: ✅ CORRIGÉ

## 🎯 Impact

- ✅ Clés de `table_instances` reçoivent suffixes: `tableId` → `tableId-1`
- ✅ Valeurs `tableId` reçoivent suffixes: `tableId` → `tableId-1`
- ✅ Les trois fichiers qui manipulent `table_instances` sont corrigés
- ✅ Fonctionne pour n'importe quel suffix numérique (-1, -2, -99, etc.)

## 🧪 Vérification

Après duplication d'un nœud via le bouton "repeat":

```bash
node check-suffixes.cjs
```

Doit afficher:
```
✓ Clé: ✅ "9bc0622c-b2df-42a2-902c-6d0c6ecac10b-1"
  ↳ tableId: ✅ "9bc0622c-b2df-42a2-902c-6d0c6ecac10b-1"
```

## 🚀 Déploiement

Le fix est déployé et prêt à tester immédiatement. Pas de migration BD nécessaire.
