# 🔧 Guide de Test Rapide - Éditeurs CRM

## 🚀 Comment Tester les Corrections

### 1. **Accès à la Page de Test**
- URL directe : `http://localhost:5173/test-editors`
- Ou via menu : **Administration** → **Test Éditeurs**

### 2. **Test des Formules** 
1. Sélectionnez un champ dans la liste
2. Cliquez sur **+ Ajouter** dans l'onglet Formules
3. ✅ **L'éditeur s'ouvre et ne se ferme PAS automatiquement**
4. Glissez un champ depuis le panneau gauche
5. ✅ **Le drag & drop fonctionne sans fermer l'éditeur**
6. Ajoutez des opérateurs (+, -, *, /)
7. Testez la formule avec des valeurs

### 3. **Test des Validations**
1. Basculez sur l'onglet **Validations**
2. Cliquez sur **+ Ajouter**
3. ✅ **L'éditeur reste ouvert**
4. Définissez des règles de validation

### 4. **Test des Dépendances**
1. Basculez sur l'onglet **Dépendances**
2. Cliquez sur **+ Ajouter**
3. ✅ **L'éditeur reste ouvert**
4. Créez des conditions SI/ALORS

## 🐛 Signes que Tout Fonctionne

### ✅ **Comportement Correct**
- L'éditeur reste ouvert après avoir ajouté un élément
- Le drag & drop fonctionne fluidement
- Les données se sauvegardent correctement
- Pas de fermeture automatique de l'éditeur
- Les logs montrent des cycles normaux

### ❌ **Signes de Problème**
- L'éditeur se ferme après chaque action
- Erreurs "Maximum update depth exceeded"
- Le drag & drop se coupe brutalement
- Les données disparaissent

## 📊 Logs à Surveiller

**Dans la console (F12)**, vous devriez voir :
```
[TestEditorsPage] Setting up fields subscription
[FieldFormulasEditor] Render start for fieldId: xxx
[FieldFormulasEditor] Store changed, updating data
```

**Évitez ces logs en boucle :**
```
[FieldFormulasEditor] Store changed, updating data (en continu)
activeFormula result: undefined (répétitif)
```

## 🔄 Si les Problèmes Persistent

1. **Rechargez la page** (F5)
2. **Redémarrez le serveur** (`npm run dev`)
3. **Vérifiez la console** pour les erreurs
4. **Testez avec un autre champ**

## 💡 Conseils d'Utilisation

### **Workflow Recommandé**
1. Sélectionnez un champ
2. Ouvrez UN éditeur à la fois (Formules OU Validations OU Dépendances)
3. Complétez votre travail
4. Fermez l'éditeur avant de passer au suivant

### **Drag & Drop Efficace**
- Glissez depuis le panneau **Champs disponibles**
- Déposez dans les **zones grises pointillées**
- Attendez le retour visuel (bordure verte)

### **Gestion des Erreurs**
- Si un éditeur se fige, cliquez sur le **X** pour le fermer
- Rechargez la page si nécessaire
- Les données sont sauvegardées automatiquement

---

🎯 **Objectif** : Pouvoir travailler sur les formules, validations et dépendances sans interruption, avec des interactions drag & drop fluides et stables.
