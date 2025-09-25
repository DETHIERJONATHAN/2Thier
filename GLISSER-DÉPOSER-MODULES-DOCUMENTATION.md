# 📦 Glisser-Déposer des Modules entre Sections - Documentation

## Vue d'ensemble

Cette fonctionnalité permet aux Super-Admins de déplacer facilement des modules d'une section à l'autre dans l'administration des modules (`/admin/modules`) en utilisant le glisser-déposer (drag & drop).

## ✨ Fonctionnalités Implémentées

### 1. **Réorganisation dans une section** (déjà existant)
- Glisser un module pour le réordonner dans sa section actuelle
- Met à jour l'ordre (`order`) du module dans la base de données

### 2. **Déplacement entre sections** (NOUVEAU!)
- Glisser un module d'une section vers une autre section
- Change automatiquement la `key` du module pour correspondre à la nouvelle section
- Visual feedback avec zone de drop mise en surbrillance

### 3. **Réorganisation des sections** (déjà existant)
- Glisser les sections pour les réordonner

## 🎯 Comment ça fonctionne

### Mapping Section → Key Module

Le système utilise un mapping automatique pour déterminer la `key` du module selon sa section de destination :

| Section de destination | Préfixe appliqué | Exemple |
|------------------------|------------------|---------|
| **Administration** | `admin_` | `admin_users` |
| **Formulaires** | `bloc` | `bloc` |
| **Outils Techniques** | `technique` | `technique` |
| **Google Workspace** | `google_` | `google_calendar` |
| **Devis1Minute-ADMIN** | `devis1minute_admin_` | `devis1minute_admin_campaigns` |
| **Devis1Minute** | `devis1minute_` | `devis1minute_leads` |
| **Autres** | *(conserve le key original)* | `any_existing_key` |

### Logique de génération du nouveau `key`

```typescript
// Si c'est la section "Autres", on garde le key original
if (targetSectionId === 'other') {
  newKey = draggedModule.key;
} 
// Pour "Formulaires", on utilise directement 'bloc'
else if (targetSectionId === 'forms') {
  newKey = 'bloc';
} 
// Pour "Technique", on utilise directement 'technique'
else if (targetSectionId === 'technical') {
  newKey = 'technique';
} 
// Pour les autres, on combine préfixe + nom de base
else {
  const baseName = draggedModule.key.replace(/^(admin_|bloc_|technique_|google_|devis1minute_admin_|devis1minute_)/, '');
  newKey = keyPrefix + baseName;
}
```

## 🎨 Interface Utilisateur

### Feedback Visuel
- **Zone de drop** : Bordure bleue pointillée avec fond bleu clair
- **Message d'indication** : "📦 Déposer le module dans [Nom de la Section]"
- **Animation** : Transition fluide avec opacité lors du drag
- **Survol** : Ring bleu autour de la section cible

### États Visuels
1. **État normal** : Sections normales avec modules
2. **Pendant le drag** : Module en cours de déplacement avec opacité réduite
3. **Survol de section** : Section mise en surbrillance avec message
4. **Drop réussi** : Message de succès avec nom de la section de destination

## 🔧 API et Backend

### Endpoint utilisé
```http
PUT /api/modules/:id
Content-Type: application/json

{
  "key": "nouveau_prefixe_nom",
  "order": 0
}
```

### Synchronisation
- **Base de données** : Mise à jour immédiate du `key` et `order`
- **Sidebar** : Actualisation automatique via `refreshModules()`
- **Page admin** : Rechargement des données via `loadData()`

## 🚀 Utilisation

### Pour les Super-Admins :

1. **Accéder à l'administration des modules** : `/admin/modules`

2. **Déplacer un module dans la même section** :
   - Cliquer et faire glisser le module vers une autre position dans la même section
   - L'ordre est automatiquement mis à jour

3. **Déplacer un module vers une autre section** :
   - Cliquer et faire glisser le module vers une autre section
   - La section se met en surbrillance quand le module peut y être déposé
   - Relâcher pour effectuer le déplacement
   - Le module prend automatiquement la `key` appropriée pour sa nouvelle section

### Messages de confirmation :
- ✅ `Module "[nom]" déplacé vers la section "[section]"`
- ❌ `Erreur lors du déplacement du module vers la nouvelle section`

## 🔍 Détails Techniques

### Hooks @dnd-kit utilisés :
- `useSortable()` : Pour les éléments déplaçables
- `useDroppable()` : Pour les zones de drop des sections
- `DndContext` : Contexte global avec gestion des événements

### Événements gérés :
- `onDragStart` : Détection du début du drag d'un module
- `onDragOver` : Détection du survol d'une zone de drop
- `onDragEnd` : Traitement du drop et mise à jour

### État géré :
- `isDraggingModule` : Booléen indiquant si un module est en cours de drag
- `dragOverSectionId` : ID de la section actuellement survolée

## 📋 Testing

### Scénarios de test :
1. ✅ Déplacer un module `admin_users` vers la section "Google Workspace" → devient `google_users`
2. ✅ Déplacer un module `devis1minute_leads` vers "Administration" → devient `admin_leads`
3. ✅ Déplacer un module vers la section "Autres" → conserve son `key` original
4. ✅ Réorganiser des modules dans la même section → met à jour uniquement l'`order`
5. ✅ Annuler un drag → aucune modification

### Vérifications post-déplacement :
- [ ] Le module apparaît dans sa nouvelle section dans l'interface
- [ ] La sidebar est mise à jour avec le nouveau placement
- [ ] La base de données contient la nouvelle `key`
- [ ] L'ordre est réinitialisé à 0 dans la nouvelle section

## 🎯 Avantages

1. **Intuitif** : Interface drag & drop familière
2. **Visuel** : Feedback immédiat et clair
3. **Automatique** : Gestion automatique des `key` selon les sections
4. **Synchronisé** : Mise à jour en temps réel de toute l'interface
5. **Sécurisé** : Accessible uniquement aux Super-Admins

## 🔮 Améliorations Futures Possibles

1. **Validation** : Empêcher certains déplacements selon des règles métier
2. **Historique** : Log des déplacements de modules
3. **Batch operations** : Sélection multiple pour déplacer plusieurs modules
4. **Preview** : Aperçu du nouveau `key` avant validation
5. **Undo/Redo** : Possibilité d'annuler les déplacements

---

## 💡 Notes d'implémentation

- La fonctionnalité respecte les permissions existantes (Super-Admin uniquement)
- Compatible avec le système de sections partagées (`useSharedSections`)
- Maintient la cohérence avec l'architecture existante
- Gère correctement les cas d'erreur et les rollbacks
