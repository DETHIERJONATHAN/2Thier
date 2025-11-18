# Scripts de Test - Champs d'Affichage et Copies

Ce dossier contient des scripts de test pour vérifier le bon fonctionnement des champs d'affichage et de leurs copies dans le système TreeBranchLeaf.

## 🚀 Test Rapide (Recommandé)

### Utilisation:
1. Ouvrez votre navigateur sur l'application CRM
2. Ouvrez la console de développement (F12)
3. Copiez-collez le contenu de `quick-test.js` dans la console
4. Le test se lance automatiquement

### Ce que fait le test rapide:
- ✅ Teste les APIs de récupération des valeurs calculées
- ✅ Vérifie la présence des champs dans le DOM
- ✅ Surveille les logs de correction des copies
- ✅ Donne des instructions claires

## 📋 Test Complet

### Utilisation:
1. Ouvrez la console de développement
2. Copiez-collez le contenu de `test-display-fields.js`
3. Lancez `TestSuite.runAll()` dans la console

### Fonctionnalités du test complet:
- 📡 **Tests API**: Vérifie tous les endpoints de valeurs calculées
- 🔍 **Tests DOM**: Recherche et analyse les éléments d'affichage
- 👂 **Capture de logs**: Surveille les logs de correction et d'erreurs
- 📊 **Rapport détaillé**: Génère un rapport complet avec recommandations

### Tests disponibles individuellement:
```javascript
// Test uniquement les APIs
APITests.testAllFields()

// Test uniquement le DOM
DOMTests.testAllVisibleFields()

// Analyse des logs capturés
LogTests.analyzeLogs()
```

## 🎯 Champs testés

### Champs originaux:
- `Prix Kwh` (05e9c859-6bca-4a08-9367-8fed61ee0ac7)
- `GRD` (aed2eb41-0d12-4483-ad29-b7485f7983ad)
- `M façade` (939bb51d-c0af-444f-a794-2aa3062ef34c)
- `Orientation-Inclinaison` (213c68ec-f359-4257-bc78-4f5e4a0c80d8)

### Champs copiés:
- `M façade-1` (939bb51d-c0af-444f-a794-2aa3062ef34c-1)
- `Orientation-Inclinaison-1` (213c68ec-f359-4257-bc78-4f5e4a0c80d8-1)

## 🔍 Logs à surveiller

### Logs de succès attendus:
```
🚀 [COPY FIX] Forçage CalculatedValueDisplay pour copie: xxx-1 (Label-1)
✅ [useNodeCalculatedValue] Valeur récupérée: {nodeId: "xxx", value: "valeur"}
✅ [RENDER DATA FIELD] Fin renderDataSectionField pour: "Label-1" - displayValue: [objet]
```

### Logs d'erreur à éviter:
```
❌ ReferenceError: resolveBackendNodeId is not defined
❌ [API ERROR] Failed to fetch calculated value
⚠️ [resolveBackendNodeId] Erreur résolution nodeId
```

## 📊 Interprétation des résultats

### ✅ Succès complet:
- Toutes les APIs retournent des valeurs
- Tous les champs affichent des valeurs (pas "---")
- Logs [COPY FIX] présents pour les copies
- Aucune erreur JavaScript

### ⚠️ Problèmes partiels:
- APIs OK mais champs affichent "---" → Problème de rendu
- Champs originaux OK mais copies KO → Problème de détection des copies
- Pas de logs [COPY FIX] → La correction ne s'active pas

### ❌ Échec:
- APIs retournent des erreurs → Problème backend
- Erreurs JavaScript → Problème de code frontend
- Aucun champ trouvé → Problème de navigation/DOM

## 🛠️ Dépannage

### Si les copies affichent toujours "---":
1. Vérifiez les logs [COPY FIX] dans la console
2. Vérifiez que `resolveBackendNodeId` est défini avant utilisation
3. Testez les APIs individuellement
4. Vérifiez la regex de détection des suffixes: `/^.+-\d+$/`

### Si les APIs échouent:
1. Vérifiez que le serveur fonctionne
2. Vérifiez les IDs des champs dans la configuration
3. Testez manuellement: `/api/tree-nodes/FIELD_ID/calculated-value`

### Si aucun champ n'est trouvé:
1. Vérifiez que vous êtes sur la bonne page
2. Naviguez vers les sections contenant les champs
3. Vérifiez que les champs sont visibles (pas masqués par conditions)