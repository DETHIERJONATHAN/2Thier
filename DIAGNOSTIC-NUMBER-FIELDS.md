# 🔧 Diagnostic des Champs NUMBER non éditables

## 🎯 Problème
Les champs de type `NUMBER` ne permettent pas la saisie.

## 📋 Étapes de diagnostic

### 1. Activer les logs détaillés
```javascript
// Dans la console du navigateur (F12)
localStorage.setItem('DEBUG_VERBOSE', '1');
```

Puis rechargez la page.

### 2. Exécuter le script de diagnostic
```bash
# Ouvrez la console du navigateur (F12)
# Copiez le contenu de scripts/debug-number-fields.js
# Collez-le dans la console et exécutez
```

### 3. Tester la saisie dans un champ nombre
Essayez de cliquer dans un champ nombre et de taper des chiffres.

### 4. Vérifier les logs

Vous devriez voir dans la console :

**A. Lors du clic/focus :**
```
❌ [NUMBER DISABLED] "Nom du champ": {
  disabled: false/true,
  isReadOnly: false/true,
  useCalculatedValue: false/true,
  hasFormula: false/true,
  ...
}
```

**B. Lors de la saisie (si le champ fonctionne) :**
```
🔢 [NUMBER CHANGE] "Nom du champ": {
  oldValue: null,
  newValue: 123,
  isDisabled: false,
  disabled: false,
  isReadOnly: false
}
```

## 🔍 Causes possibles

### Cause 1: Champ désactivé (disabled=true)
**Symptômes :** 
- Le champ est grisé
- `disabled: true` dans les logs

**Solutions :**
1. Vérifier si le prop `disabled` est passé au composant parent
2. Vérifier si `isReadOnly=true` (calculé depuis `useCalculatedValue`)

### Cause 2: Champ en lecture seule (isReadOnly=true)
**Symptômes :**
- `isReadOnly: true` dans les logs
- `useCalculatedValue: true`
- `hasFormula: true`

**Solutions :**
1. Le champ a une formule configurée → Activer `manualOverrideAllowed` dans la config
2. Désactiver la formule si vous voulez saisir manuellement

### Cause 3: Valeur non convertie en nombre
**Symptômes :**
- Le champ s'affiche mais ne réagit pas à la saisie
- Pas de logs `[NUMBER CHANGE]`

**Solution :**
- Vérifier que `numericValue` est bien calculé (correction déjà appliquée)

### Cause 4: onChange non défini
**Symptômes :**
```
❌ [Nom du champ] onChange est undefined - Le champ est probablement dans une SECTION DE DONNÉES (read-only) !
```

**Solution :**
- Déplacer le champ dans une section normale (pas `isDataSection`)

## 🛠️ Corrections appliquées

### ✅ Correction 1: Virgule orpheline dans commonProps
**Fichier:** `TBLFieldRenderer.tsx`
**Problème:** Syntaxe JavaScript invalide
**Solution:** Supprimé la virgule orpheline

### ✅ Correction 2: Conversion de la valeur en nombre
**Fichier:** `TBLFieldRendererAdvanced.tsx`
**Problème:** `finalValue` passé directement sans conversion
**Solution:** 
```typescript
const numericValue = finalValue === '' || finalValue === null || finalValue === undefined 
  ? null 
  : Number(finalValue);
```

### ✅ Correction 3: Logs de diagnostic
**Fichiers:** `TBLFieldRendererAdvanced.tsx`, `scripts/debug-number-fields.js`
**Ajouté:** Logs détaillés pour identifier la cause exacte

## 📊 Prochaines étapes

1. **Exécutez le script de diagnostic**
2. **Partagez les logs dans la console**
3. **Identifiez la cause** parmi celles listées ci-dessus
4. **Appliquez la solution correspondante**

## 🆘 Besoin d'aide?

Si le problème persiste après diagnostic, fournissez :
- Les logs `❌ [NUMBER DISABLED]`
- Les logs `🔢 [NUMBER CHANGE]` (ou leur absence)
- Le résultat du script de diagnostic
- Le nom du champ problématique
