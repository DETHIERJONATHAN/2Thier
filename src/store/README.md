# Migration vers le CRM Store modulaire

Ce document explique comment migrer du magasin monolithique `crmStore.ts` vers la nouvelle architecture modulaire basée sur des slices Zustand.

## Structure du projet

```
src/store/
├── index.ts                  # Point d'entrée du magasin composé
├── README.md                 # Ce fichier de documentation
├── slices/
│   ├── api.ts               # Fonctions d'API partagées
│   ├── types.ts             # Interfaces et types partagés
│   ├── blocksSlice.ts       # Gestion des blocs/formulaires
│   ├── sectionsSlice.ts     # Gestion des sections
│   ├── fieldsSlice.ts       # Gestion des champs
│   ├── formulasSlice.ts     # Gestion des formules
│   ├── validationsSlice.ts  # Gestion des validations
│   ├── dependenciesSlice.ts # Gestion des dépendances
│   ├── metaSlice.ts         # Gestion de l'état UI
│   └── utilsSlice.ts        # Fonctions utilitaires
```

## Architecture du nouveau magasin

Le nouveau magasin CRM est décomposé en plusieurs slices (tranches), chacune responsable d'un domaine spécifique :

- **blocksSlice** : Gestion des blocs/formulaires (CRUD)
- **sectionsSlice** : Gestion des sections (CRUD, réordonner)
- **fieldsSlice** : Gestion des champs (CRUD, méta, déplacer)
- **formulasSlice** : Gestion des formules
- **validationsSlice** : Gestion des validations
- **dependenciesSlice** : Gestion des dépendances
- **metaSlice** : Gestion de l'état global (navigation, chargement, etc.)

## Comment migrer

### 1. Importation du nouveau magasin

Remplacez :

```typescript
import { useStore } from '../store/crmStore';
```

Par :

```typescript
import useCRMStore from '../store/index';
```

### 2. Utilisation des actions

Le nouveau store expose les mêmes actions que l'ancien, mais elles sont maintenant organisées par domaine. Les appels sont identiques :

Ancien :
```typescript
const { addBlock, removeField } = useStore();
```

Nouveau :
```typescript
const { addBlock, removeField } = useCRMStore();
```

### 3. Accès aux données d'état

L'accès aux données reste le même :

```typescript
const blocks = useCRMStore(state => state.blocks);
const activeBlockIndex = useCRMStore(state => state.activeBlockIndex);
```

### 4. Sélecteurs optimisés

Pour des performances optimales, créez des sélecteurs ciblés qui ne déclenchent des re-renders que lorsque les données pertinentes changent :

```typescript
// Au lieu de ceci (qui cause un re-render à chaque changement dans le store) :
const { blocks } = useCRMStore();

// Préférez ceci :
const blocks = useCRMStore(state => state.blocks);

// Ou encore plus ciblé :
const currentBlock = useCRMStore(state => state.blocks[state.activeBlockIndex]);
```

## Exemples de migration

### Exemple 1 : Édition d'un champ

Avant :
```typescript
const { updateField } = useStore();
updateField(fieldId, { label: "Nouveau label" });
```

Après :
```typescript
const { updateField } = useCRMStore();
updateField(fieldId, { label: "Nouveau label" });
```

### Exemple 2 : Ajout d'une formule

Avant :
```typescript
const { createFormula } = useStore();
createFormula(fieldId, formulaData);
```

Après :
```typescript
const { createFormula } = useCRMStore();
createFormula(fieldId, formulaData);
```

## Notes importantes

1. L'API externe du magasin reste identique pour faciliter la migration.
2. La structure interne de l'état est inchangée (même format pour `blocks`, `sections`, `fields`, etc.).
3. Tous les types sont maintenant explicites et documentés dans `types.ts`.
4. Chaque slice gère son propre domaine de façon indépendante, améliorant la maintenance.
