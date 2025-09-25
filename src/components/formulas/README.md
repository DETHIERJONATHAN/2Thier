# Documentation des composants de formules

Ce dossier contient les composants React utilisés pour créer et manipuler les formules dans l'application CRM.

## Architecture du système de formules

Le système de formules est organisé selon une architecture modulaire avec plusieurs composants interconnectés :

```
formulas/
├── FieldFormulasEditorNew.tsx   # Point d'entrée principal pour l'édition des formules d'un champ
├── FormulaItemEditor.tsx        # Éditeur pour une seule formule (container)
├── FormulaSequenceEditor.tsx    # Éditeur de séquence d'opérations dans une formule (drag-and-drop)
├── SortableFormulaItem.tsx      # Item de formule pouvant être déplacé (drag-and-drop)
├── OperatorsPalette.tsx         # Palette d'opérateurs disponibles
├── FunctionsPalette.tsx         # Palette de fonctions disponibles
├── FieldsPalette.tsx            # Palette de champs disponibles
├── FormulaEvaluator.tsx         # Composant d'évaluation et test des formules
├── FormulaTestTool.tsx          # Outil de test complet pour les formules
├── formula-editor.css           # Styles spécifiques à l'éditeur de formules
└── index.ts                     # Point d'entrée pour les exports
```

### Flux de données et interactions

```
┌──────────────────┐     ┌───────────────────────┐
│ConfigAvancee.tsx │────▶│FieldFormulasEditorNew │
└──────────────────┘     └──────────┬────────────┘
                                   │
                                   ▼
                         ┌─────────────────────┐
                         │  FormulaItemEditor  │
                         └┬────────┬───────────┘
                          │        │
              ┌───────────▼─┐    ┌─▼───────────────┐
              │OperatorsPalette│  │FormulaSequenceEditor│
              └─────────────┘    └─────────┬───────┘
                                           │
                                  ┌────────▼───────┐
                                  │SortableFormulaItem│
                                  └─────────────────┘
```

## Composants principaux

### OperatorsPalette

Palette d'opérateurs disponibles pour les formules. Les opérateurs sont organisés par catégories :
- Opérateurs arithmétiques (+, -, *, /, %, **)
- Opérateurs de comparaison (=, !=, >, <, >=, <=, ===, !==)
- Opérateurs logiques (&&, ||, !)
- Autres opérateurs spéciaux (.[], ?:, ?., ??, ...)

Chaque opérateur est accompagné d'une infobulle (tooltip) qui explique son fonctionnement avec un exemple.

### FunctionsPalette

Palette de fonctions avancées pour les formules. Les fonctions sont organisées par catégories :
- Fonctions conditionnelles (IF, SWITCH, CASE, IFS)
- Fonctions mathématiques (ROUND, MIN, MAX, SUM, AVERAGE, ABS, etc.)
- Fonctions de texte (LENGTH, CONCAT, UPPER, LOWER, TRIM, etc.)
- Fonctions de date (NOW, DATE_DIFF, TODAY, FORMAT_DATE, etc.)
- Fonctions de vérification (IS_EMPTY, IS_NULL, IS_NUMBER, etc.)
- Fonctions de recherche et d'agrégation (LOOKUP, INDEX, FILTER, COUNT, etc.)
- Constantes (TRUE, FALSE, NULL, BLANK, PI, E)

Chaque fonction est accompagnée d'une infobulle qui explique son fonctionnement avec sa syntaxe et sa description.

## Utilisation du glisser-déposer

Les opérateurs et fonctions peuvent être ajoutés à une formule de deux façons :
1. Par clic direct sur l'élément
2. Par glisser-déposer (drag-and-drop) vers une zone de formule

## Implémentation technique

Les composants utilisent :
- React avec TypeScript pour une meilleure sécurité de typage
- Des callbacks optimisés avec useCallback pour éviter les rendus inutiles
- Des appels API directs pour sauvegarder les modifications
- Des tooltips natifs pour l'aide contextuelle
- Un système de validation pour éviter les formules invalides
- Une prise en charge complète des évènements de glisser-déposer
- La bibliothèque @dnd-kit/core pour les fonctionnalités de drag-and-drop

## Description détaillée des composants

### 1. Points d'entrée principaux

#### `FieldFormulasEditorNew.tsx`
- **Rôle** : Composant principal pour gérer les formules d'un champ spécifique
- **Utilisé par** : `ConfigAvancee.tsx`, `SimpleTestEditorsPage.tsx`
- **Dépendances** : `useCRMStore`, `FormulaItemEditor`, types du store
- **Fonctionnalités** :
  - Chargement des formules depuis l'API
  - Ajout/suppression/modification des formules
  - Interface utilisateur pour la gestion des formules

### 2. Composants d'édition

#### `FormulaItemEditor.tsx`
- **Rôle** : Éditeur pour une formule individuelle
- **Utilisé par** : `FieldFormulasEditorNew.tsx`
- **Dépendances** : `FormulaSequenceEditor`, `OperatorsPalette`, `FunctionsPalette`, `FormulaEvaluator`
- **Fonctionnalités** :
  - Interface utilisateur pour modifier les métadonnées d'une formule
  - Intégration des différents outils d'édition
  - Validation et test des formules

#### `FormulaSequenceEditor.tsx`
- **Rôle** : Éditeur de séquence d'opérations dans une formule (drag-and-drop)
- **Utilisé par** : `FormulaItemEditor.tsx`
- **Dépendances** : `@dnd-kit/core`, `@dnd-kit/sortable`, `SortableFormulaItem`, `useCRMStore`
- **Fonctionnalités** :
  - Interface drag-and-drop pour manipuler les éléments d'une formule
  - Ordonnancement et gestion des opérations
  - Sauvegarde automatique des changements

#### `SortableFormulaItem.tsx`
- **Rôle** : Item de formule pouvant être déplacé dans la séquence
- **Utilisé par** : `FormulaSequenceEditor.tsx`
- **Dépendances** : `@dnd-kit/sortable`
- **Fonctionnalités** :
  - Représentation visuelle d'un élément de formule
  - Gestion des événements drag-and-drop
  - Affichage contextuel selon le type d'élément

### 3. Palettes et outils

#### `OperatorsPalette.tsx`
- **Rôle** : Fournit une interface pour ajouter des opérateurs à une formule
- **Utilisé par** : `FormulaItemEditor.tsx`
- **Fonctionnalités** :
  - Liste catégorisée d'opérateurs
  - Glisser-déposer vers la zone de formule
  - Informations contextuelles pour chaque opérateur

#### `FunctionsPalette.tsx`
- **Rôle** : Fournit une interface pour ajouter des fonctions à une formule
- **Utilisé par** : `FormulaItemEditor.tsx`
- **Fonctionnalités** :
  - Liste catégorisée de fonctions
  - Glisser-déposer vers la zone de formule
  - Documentation intégrée pour chaque fonction

#### `FormulaEvaluator.tsx`
- **Rôle** : Évalue et teste une formule en temps réel
- **Utilisé par** : `FormulaItemEditor.tsx`
- **Fonctionnalités** :
  - Évaluation de la formule avec des données réelles ou simulées
  - Affichage des résultats et des erreurs
  - Interface pour tester différents scénarios

### 4. Intégration et API

#### Sauvegarde des formules
Les formules sont persistées de deux manières :
1. **API** : Appels CRUD via endpoints dédiés (/api/fields/{id}/formulas)
2. **Store global** : Mise en cache dans le state global via useCRMStore

#### Validation des formules
La validation est effectuée à plusieurs niveaux :
1. **Front-end** : Validation syntaxique et structurelle avant sauvegarde
2. **API** : Validation côté serveur lors de la sauvegarde
3. **Temps réel** : Feedback visuel pendant l'édition

## Exemples d'utilisation

### Intégration basique
```jsx
// Exemple d'intégration des palettes dans un composant parent
import OperatorsPalette from './OperatorsPalette';
import FunctionsPalette from './FunctionsPalette';

const FormulaEditor = ({ formulaId, formula }) => {
  return (
    <div className="formula-editor">
      <h3>Éditeur de formule</h3>
      
      {/* Zone d'édition de la formule */}
      <div className="formula-edit-zone formula-drop-zone">
        {/* Contenu de la formule */}
      </div>
      
      {/* Palettes d'éléments */}
      <div className="formula-palettes">
        <OperatorsPalette formulaId={formulaId} formula={formula} />
        <FunctionsPalette formulaId={formulaId} formula={formula} />
      </div>
    </div>
  );
};
```

### Intégration complète dans un formulaire
```jsx
import { FieldFormulasEditorNew } from '../../components/formulas';

const FieldConfigurationForm = ({ field }) => {
  return (
    <div className="field-config">
      {/* Autres configurations du champ */}
      <div className="section">
        <h3>Formules de calcul</h3>
        <FieldFormulasEditorNew fieldId={field.id} />
      </div>
    </div>
  );
};
```

## Flux de travail typique

1. L'utilisateur ouvre l'éditeur de configuration avancée d'un champ via `ConfigAvancee.tsx`
2. Le composant `FieldFormulasEditorNew` charge les formules existantes pour ce champ
3. L'utilisateur peut :
   - Créer une nouvelle formule (bouton "+")
   - Éditer une formule existante (cliquer pour développer)
   - Supprimer une formule (bouton "Supprimer")
4. Lors de l'édition d'une formule :
   - Les opérateurs, fonctions et champs peuvent être ajoutés par drag-and-drop
   - Les éléments de la formule peuvent être réorganisés
   - L'utilisateur peut tester la formule en temps réel
5. Les modifications sont sauvegardées automatiquement via l'API
6. La formule est disponible pour être utilisée dans les champs et dépendances
```
