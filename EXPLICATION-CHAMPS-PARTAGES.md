# 🔗 Explication : Champs Partagés (Références)

## Qu'est-ce qu'un champ partagé ?

Un **champ partagé** est un **template réutilisable** que vous pouvez créer une fois et utiliser dans plusieurs endroits de vos formulaires.

### ✅ Avantages

1. **Cohérence** : Tous les formulaires utilisent exactement le même champ
2. **Gain de temps** : Créez une fois, réutilisez partout
3. **Maintenance facile** : Modifiez le template → tous les usages sont mis à jour automatiquement

### 📝 Exemple concret

Vous avez un champ **"Surface habitable"** que vous utilisez dans 10 formulaires différents :
- ❌ **Sans référence** : Vous devez le recréer 10 fois + le modifier 10 fois en cas de changement
- ✅ **Avec référence** : Vous créez 1 template "Surface Habitable" et le sélectionnez dans 10 formulaires

## Comment ça marche ?

### Mode 1 : Copie indépendante (par défaut)
- Chaque champ est unique
- Les modifications n'affectent que ce formulaire
- **Utiliser quand** : Le champ est spécifique à ce contexte

### Mode 2 : Référence partagée
- Le champ est lié à un template
- Les modifications du template affectent **tous les usages**
- **Utiliser quand** : Le champ doit être identique partout

## 🎯 Comment créer un champ partagé ?

1. Dans **Parameters**, allez dans la section **"Mode de réutilisation"**
2. Sélectionnez **"Référence partagée"**
3. Deux options :
   - **Utiliser une référence existante** : Choisissez dans la liste
   - **Créer une nouvelle référence** : Donnez-lui un nom et créez-la

### Exemple de création :
```
Nom : "Hauteur sous plafond"
Description : "Champ standard pour mesurer la hauteur"
```

Après création, ce template apparaît dans la liste et vous pouvez le sélectionner dans d'autres formulaires.

## 🔍 Détails techniques

### Dans la base de données

**Template source** (le modèle original) :
```json
{
  "isSharedReference": true,
  "sharedReferenceId": null,
  "sharedReferenceName": "Hauteur sous plafond"
}
```

**Référence** (les usages du template) :
```json
{
  "isSharedReference": false,
  "sharedReferenceId": "abc-123-xyz",
  "sharedReferenceName": "Hauteur sous plafond"
}
```

### Catégorie : Pourquoi elle est masquée ?

La **catégorie** servait uniquement à **grouper visuellement** les références dans le Select dropdown :
- 🏠 Immobilier
- ⚡ Énergie
- 📋 Général
- etc.

**Problème** : Ça complexifie l'interface sans réel bénéfice.

**Solution actuelle** : Tous les templates utilisent la catégorie `'general'` par défaut. L'infrastructure est là si vous voulez réactiver les catégories plus tard.

## 🐛 Problème résolu : Rechargements multiples

### Avant
Chaque création de template déclenchait :
1. Appel API pour créer → ✅
2. **Rechargement complet de la liste** → ❌ (inutile !)
3. Résultat : 5+ appels API en quelques secondes dans les logs

### Après
1. Appel API pour créer → ✅
2. **Ajout direct dans la liste locale** → ✅ (pas d'appel API supplémentaire)
3. Résultat : 1 seul appel API, affichage instantané

### Logs console

**Avant** :
```
[useAuthenticatedApi] ➡️ GET /api/treebranchleaf/shared-references  (x5 en 2 secondes)
```

**Après** :
```
🔄 [SharedRef] Chargement des références disponibles...
✅ [SharedRef] 3 références chargées
✅ [SharedRef] Référence créée: Hauteur sous plafond
```

## 📊 Utilisation recommandée

### ✅ Créez une référence pour :
- Champs standards utilisés dans **plusieurs formulaires**
- Champs dont la **structure doit rester identique** partout
- **Templates métier** réutilisables (ex: "Adresse complète", "Surface m²", "Prix TTC")

### ❌ N'utilisez PAS de référence pour :
- Champs **uniques** à un contexte spécifique
- Champs qui **varient** selon le formulaire
- Champs **temporaires** ou en test

## 🎨 Interface simplifiée

**Champs visibles lors de la création** :
1. **Nom** (obligatoire) : Le nom du template
2. **Description** (optionnel) : Explication de l'usage

**Champs masqués** :
- **Catégorie** : Toujours `'general'` (peut être réactivé si besoin)

## 🔮 Évolutions futures possibles

1. **Réactiver les catégories** avec une UI améliorée (tags colorés, filtres)
2. **Gestion centralisée** des templates (page dédiée)
3. **Statistiques d'usage** : Voir combien de fois un template est utilisé
4. **Versionning** : Historique des modifications d'un template
5. **Permissions** : Qui peut modifier un template partagé ?

---

**Résumé** :
- ✅ Créez des templates pour les champs standards
- ✅ Réutilisez-les dans plusieurs formulaires
- ✅ Modifiez le template → tous les usages suivent
- ✅ Interface simplifiée (plus de catégorie visible)
- ✅ Performance optimisée (plus de rechargements inutiles)
