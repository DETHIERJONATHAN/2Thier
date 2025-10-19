# 📋 CHANGELOG - Duplication Physique des Templates Repeater

**Date**: 16 octobre 2025  
**Version**: 2.0.0 - SYSTÈME PHYSIQUE (Migration complète)  
**Impact**: BREAKING CHANGE - Suppression du système virtuel

---

## 🔥 Version 2.0 - Migration vers Nœuds Physiques (16 octobre 2025)

### ⚠️ BREAKING CHANGE

**Suppression complète du système d'instances virtuelles.**

### Changements Majeurs

#### 1. Endpoint GET `/trees/:treeId/repeater-fields`
**Fichier**: `treebranchleaf-routes.ts` (Ligne ~1350)

**AVANT** (Système virtuel):
```typescript
// Générait des IDs composés virtuels
repeaterFields.push({
  id: `${node.id}_0_${templateId}`, // ❌ Virtuel
  label: `${node.label} - ${templateLabel}`,
  // ...
});
```

**APRÈS** (Système physique):
```typescript
// Retourne les vrais enfants physiques du repeater
const physicalChildren = allNodes.filter(n => n.parentId === node.id);

for (const child of physicalChildren) {
  const sourceTemplateId = child.metadata?.sourceTemplateId;
  
  // Validation : doit être une copie d'un template actif
  if (!sourceTemplateId || !templateNodeIds.includes(sourceTemplateId)) {
    continue;
  }

  repeaterFields.push({
    id: child.id, // ✅ UUID réel
    label: `${node.label} - ${child.label}`,
    // ...
  });
}
```

#### 2. Impact sur les Utilisateurs

| Aspect | Avant (v1.x) | Après (v2.0) |
|--------|-------------|--------------|
| **ID des champs** | `repeaterId_0_templateId` | UUID v4 standard |
| **GET /nodes/:id** | ❌ 404 Not Found | ✅ 200 OK |
| **Utilisation formules** | ❌ Erreur de référence | ✅ Fonctionnel |
| **Persistance** | ❌ Virtuel (pas en DB) | ✅ Persisté en DB |
| **Traçabilité** | ❌ Aucune | ✅ Via `metadata.sourceTemplateId` |

#### 3. Validation et Filtrage

Le nouveau système ajoute plusieurs couches de validation :

```typescript
// Vérification 1 : Le nœud doit être un enfant direct du repeater
physicalChildren.filter(n => n.parentId === node.id)

// Vérification 2 : Doit avoir un sourceTemplateId
if (!childMeta?.sourceTemplateId) continue;

// Vérification 3 : Le template source doit être actif
if (!templateNodeIds.includes(sourceTemplateId)) continue;
```

### Migration

**Aucune action requise** si vous utilisez déjà la v1.0 :
- Les copies physiques existent déjà
- Le système bascule automatiquement vers leur utilisation

**Action requise** pour les anciennes données :
1. Ouvrir chaque formulaire avec repeater
2. Re-sélectionner les templates (déclenche la duplication si nécessaire)
3. Vérifier que les formules/conditions fonctionnent

### Logs de Débogage

```bash
# Nouveaux logs pour tracer le comportement
🔁 [TBL-ROUTES] Nœud repeater "Bloc 1" a 3 enfants physiques
✅ [TBL-ROUTES] Enfant "Photo (Copie 1)" - sourceTemplate: node_xxx
⚠️ [TBL-ROUTES] Enfant "Autre" ignoré (pas de sourceTemplateId)
⚠️ [TBL-ROUTES] Enfant "Vieux" ignoré (template source plus dans liste)
```

---

## Version 1.0 - Système de Duplication Automatique (16 octobre 2025)

---

## ✅ Fichiers Modifiés

### 1. Backend API Routes
**Fichier**: `src/components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes.ts`

**Ajouts**:
- ✨ Nouvel endpoint `POST /nodes/:nodeId/duplicate-templates`
- 🔍 Détection automatique des doublons via `metadata.sourceTemplateId`
- 🏷️ Génération intelligente des labels avec numérotation
- 🛡️ Protection complète des données existantes

**Lignes modifiées**: ~200 lignes ajoutées après l'endpoint `/repeater-fields`

---

### 2. Frontend Parameters Component
**Fichier**: `src/components/TreeBranchLeaf/treebranchleaf-new/components/Parameters/Parameters.tsx`

**Ajouts**:
- ✨ Import du hook `useAuthenticatedApi`
- 🔁 Fonction `duplicateTemplatesPhysically()`
- 🎣 Hook automatique dans `commitRepeaterMetadata`

**Lignes modifiées**: ~30 lignes ajoutées

---

## 🔄 Flux de Fonctionnement

### Avant (Système Virtuel)
```
Utilisateur sélectionne templates → Sauvegarde en metadata
→ Instances virtuelles générées à la volée (parentId_0_templateId)
→ ❌ IDs composites → Erreurs 404
```

### Après (Système Dual)
```
Utilisateur sélectionne templates → Sauvegarde en metadata
→ API duplique physiquement les templates
→ ✅ Nœuds enfants réels avec UUID valides
→ ✅ + Instances virtuelles pour le rendu
```

---

## 🚀 Nouveaux Endpoints

### POST /api/treebranchleaf/nodes/:nodeId/duplicate-templates

**Request**:
```json
{
  "templateNodeIds": ["uuid1", "uuid2"]
}
```

**Response Success (201)**:
```json
{
  "duplicated": [
    {
      "id": "new-uuid-1",
      "label": "Photo du coffret (Copie 1)",
      "type": "leaf_field",
      "parentId": "repeater-uuid"
    }
  ],
  "count": 1
}
```

**Response Already Duplicated (200)**:
```json
{
  "duplicated": [],
  "message": "Tous les templates sont déjà dupliqués"
}
```

---

## 🛡️ Sécurité & Traçabilité

Chaque nœud dupliqué contient:
```typescript
metadata: {
  ...originalMetadata,
  sourceTemplateId: "uuid-du-template-original",
  duplicatedAt: "2025-10-16T10:30:00.000Z",
  duplicatedFromRepeater: "uuid-du-repeater-parent"
}
```

**Avantages**:
- ✅ Détection automatique des doublons
- ✅ Traçabilité complète de l'origine
- ✅ Possibilité de re-synchronisation future
- ✅ Audit et nettoyage facilitésÔÇï

---

## 📊 Impact sur la Performance

### Opération de Duplication
- **Requêtes DB**: 3-4 requêtes par duplication
  1. Vérification du parent
  2. Liste des enfants existants
  3. Récupération des templates
  4. Création des copies (1 INSERT par template)

- **Temps estimé**: < 500ms pour 3 templates
- **Impact utilisateur**: Imperceptible (appel async)

### Pas d'impact sur:
- ❌ Le chargement des arbres
- ❌ Le rendu des formulaires
- ❌ Les requêtes existantes

---

## 🧪 Tests Recommandés

### Test 1: Première Duplication
1. Créer un repeater "Bloc 1"
2. Sélectionner 3 templates
3. Vérifier la création de 3 enfants avec "(Copie 1)"

### Test 2: Anti-Doublons
1. Garder la même sélection
2. Re-sauvegarder
3. Vérifier qu'aucun doublon n'est créé

### Test 3: Ajout Incrémental
1. Ajouter 2 nouveaux templates à la sélection
2. Vérifier que seuls les 2 nouveaux sont dupliqués
3. Vérifier la numérotation "(Copie 1)"

### Test 4: Réutilisabilité
1. Ouvrir le sélecteur de champs dans une formule
2. Vérifier que les copies apparaissent
3. Sélectionner une copie → Pas d'erreur 404

---

## 🔧 Configuration Requise

**Aucune migration DB nécessaire** ✅

Le système utilise:
- Colonnes existantes (`metadata`, `parentId`, etc.)
- Endpoint API standard
- Pas de nouvelle table

---

## ⚠️ Points d'Attention

### 1. Suppression des Templates
**Comportement**: Les copies NE SONT PAS supprimées automatiquement

**Raison**: Protection des données utilisateur

**Solution future**: Ajouter un bouton "Nettoyer les copies orphelines"

### 2. Modification des Templates
**Comportement**: Les copies NE sont PAS mises à jour automatiquement

**Raison**: Indépendance des copies (intention de l'utilisateur)

**Solution future**: Ajouter une option "Synchroniser avec le template source"

### 3. Renommage des Copies
**Comportement**: L'utilisateur PEUT renommer manuellement les copies

**Impact**: Aucun - La traçabilité reste via `metadata.sourceTemplateId`

---

## 🎉 Bénéfices Utilisateur

1. **✅ Pas d'erreurs 404**
   - Tous les nœuds ont des UUIDs valides

2. **✅ Réutilisation totale**
   - Les copies sont de vrais champs
   - Utilisables dans formules, conditions, etc.

3. **✅ Transparence**
   - Comportement identique aux champs normaux

4. **✅ Traçabilité**
   - On sait toujours d'où vient une copie

5. **✅ Sécurité**
   - Pas de suppression automatique
   - Détection de doublons

---

## 📈 Prochaines Évolutions Possibles

### Version 1.1
- [ ] Bouton "Synchroniser avec le template"
- [ ] Bouton "Nettoyer les copies orphelines"
- [ ] Indicateur visuel des copies dans l'arbre

### Version 1.2
- [ ] Duplication récursive (avec sous-champs)
- [ ] Options de duplication avancées
- [ ] Prévisualisation avant duplication

### Version 2.0
- [ ] Système de "Templates Master"
- [ ] Mise à jour en cascade
- [ ] Gestion des versions

---

## 🐛 Bugs Connus

**Aucun bug connu à ce jour** ✅

---

## 📞 Support

En cas de problème:
1. Vérifier les logs serveur: `🔁 [DUPLICATE-TEMPLATES]`
2. Vérifier les logs frontend: `🔁 [duplicateTemplatesPhysically]`
3. Vérifier la structure DB: `metadata.sourceTemplateId` doit être présent

---

## 👥 Contributeurs

- **DETHIER Jonathan** - Implémentation initiale
- **GitHub Copilot** - Assistance technique

---

**Status**: ✅ PRODUCTION READY
