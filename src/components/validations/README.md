# Documentation du système de validations dans le CRM

## Aperçu

Le système de validations permet de vérifier qu'une valeur est correcte ou cohérente avant la validation d'un champ. Il offre un moyen puissant de créer des formulaires interactifs qui valident les données saisies par l'utilisateur.

## Architecture du système de validations

Le système de validations est organisé selon une architecture modulaire avec plusieurs composants interconnectés :

```
validations/
├── types.ts                        # Définition des types et interfaces
├── ValidationsPalette.tsx          # Palette de validations disponibles (boutons)
├── ValidationZone.tsx              # Zone de dépôt pour les validations
├── ValidationRuleEditor.tsx        # Éditeur pour une règle de validation
├── FieldValidationsEditor.tsx      # Composant parent pour éditer les validations d'un champ
├── ValidationItemEditor.tsx        # Éditeur pour une validation individuelle
├── ValidationSequenceEditor.tsx    # Éditeur de séquence de validations
├── ValidationEvaluator.tsx         # Composant d'évaluation des validations
└── index.ts                        # Point d'entrée pour les exports
```

### Flux de données et interactions

```
┌───────────────────┐     ┌─────────────────────────┐
│ ConfigAvancee.tsx │────▶│ FieldValidationsEditor  │
└───────────────────┘     └───────────┬─────────────┘
                                      │
                                      ▼
                          ┌───────────────────────────┐
                          │ ValidationRuleEditor      │
                          └─┬────────────────────────┬┘
                            │                        │
                ┌───────────▼───────┐      ┌─────────▼──────────┐
                │  ValidationZone   │      │  ValidationPreview  │
                └─────────┬─────────┘      └────────────────────┘
                          │
                          ▼
                ┌─────────────────┐
                │ValidationsPalette│
                └─────────────────┘
```

## Types de validations disponibles

### Vérifications de valeur simple

- **Obligatoire** (`IS_REQUIRED(valeur)`) : Vérifie que le champ n'est pas vide
- **Valeur Min** (`valeur >= min`) : Vérifie qu'une valeur numérique est supérieure ou égale à un minimum
- **Valeur Max** (`valeur <= max`) : Vérifie qu'une valeur numérique est inférieure ou égale à un maximum
- **Entre** (`BETWEEN(valeur, min, max)`) : Vérifie qu'une valeur est comprise entre deux bornes
- **Comparer Champs** (`valeur1 OPERATOR valeur2`) : Compare la valeur avec celle d'un autre champ
- **Longueur Min** (`LENGTH(valeur) >= min_length`) : Vérifie que la longueur du texte est supérieure ou égale à un minimum
- **Longueur Max** (`LENGTH(valeur) <= max_length`) : Vérifie que la longueur du texte est inférieure ou égale à un maximum

### Vérifications de type

- **Est un nombre** (`IS_NUMBER(valeur)`) : Vérifie que la valeur est un nombre valide
- **Est du texte** (`IS_TEXT(valeur)`) : Vérifie que la valeur est une chaîne de texte
- **Est une date** (`IS_DATE(valeur)`) : Vérifie que la valeur est une date valide
- **Est un booléen** (`IS_BOOLEAN(valeur)`) : Vérifie que la valeur est un booléen (vrai/faux)

### Tests logiques

- **Est null** (`IS_NULL(valeur)`) : Vérifie si la valeur est null
- **Est vide** (`IS_EMPTY(valeur)`) : Vérifie si la valeur est vide (chaîne vide, tableau vide, etc.)
- **Dans la liste** (`IN(valeur, liste_autorisée)`) : Vérifie si la valeur est présente dans une liste de valeurs autorisées
- **Pas dans la liste** (`NOT_IN(valeur, liste_interdite)`) : Vérifie que la valeur n'est pas dans une liste de valeurs interdites

### Vérifications de format

- **Regex** (`MATCH(valeur, pattern)`) : Vérifie que la valeur correspond à un motif d'expression régulière
- **Email** (`IS_EMAIL(valeur)`) : Vérifie que la valeur est une adresse email valide
- **Téléphone** (`IS_PHONE(valeur)`) : Vérifie que la valeur est un numéro de téléphone valide
- **IBAN** (`IS_IBAN(valeur)`) : Vérifie que la valeur est un numéro IBAN valide
- **TVA** (`IS_TVA(valeur, pays)`) : Vérifie que la valeur est un numéro de TVA valide
- **Code Postal** (`IS_POSTAL_CODE(valeur, pays)`) : Vérifie que la valeur est un code postal valide selon le pays sélectionné

### Validations avancées

- **Conditionnelle** : Applique une validation uniquement si une condition est remplie
- **Liste noire** : Vérifie que la valeur ne figure pas dans une liste de valeurs interdites
- **Multi-champ** : Validation qui implique plusieurs champs en même temps

## Système de dépendances

Le système de dépendances permet de contrôler dynamiquement le comportement des champs en fonction de conditions. Ces dépendances peuvent être utilisées pour afficher/masquer des champs, les activer/désactiver, les rendre obligatoires/facultatifs, ou préremplir des valeurs automatiquement.

### Interface de l'éditeur de dépendances

L'éditeur de dépendances offre une interface intuitive divisée en plusieurs sections :

1. **Informations de base** : Nom de la dépendance et formule à utiliser
2. **Zone de règle** : Définition de la condition qui activera cette dépendance
3. **Actions de dépendance** : Boutons pour définir le comportement à appliquer

```
┌─────────────────── Actions de dépendance ───────────────────┐
│                                                             │
│  ┌── Visibilité ──┐  ┌── Obligation ──┐  ┌── Activation ──┐ │
│  │ ⚪ Afficher    │  │ ⚪ Obligatoire  │  │ ⚪ Activer     │ │
│  │ ⚪ Masquer     │  │ ⚪ Facultatif   │  │ ⚪ Désactiver  │ │
│  └───────────────┘  └────────────────┘  └───────────────┘  │
│                                                             │
│  ┌── Valeur ─────────────────────────────────────────────┐  │
│  │ ⚪ Prérenseigner                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────── Opérateurs logiques ───────┐ ┌───── Tests de valeur ────────┐
│                                   │ │                              │
│  [IF]    [AND]    [OR]    [NOT]   │ │  [Est null]     [Est vide]   │
│                                   │ │  [Est égal à]   [Dans liste] │
└───────────────────────────────────┘ │  [Supérieur à]  [Inférieur à]│
                                      └──────────────────────────────┘
```

4. **Opérateurs logiques** : Boutons IF, AND, OR, NOT pour construire des conditions complexes
5. **Tests de valeur** : Boutons pour tester différentes conditions (Est null, Est vide, Est égal à, etc.)
6. **Bouton d'ajout de condition** : Pour ajouter des conditions supplémentaires

### Conditions de dépendance

#### Opérateurs logiques
- **IF** : Exécute une action si la condition est vraie, sinon exécute une autre action
- **AND** : Vérifie si toutes les conditions sont vraies
- **OR** : Vérifie si au moins une des conditions est vraies
- **NOT** : Inverse une condition

### Tests sur valeurs

#### Tests de base
- **Est null** : Vérifie si la valeur est null
- **Est vide** : Vérifie si la valeur est vide (chaîne vide, tableau vide, etc.)
- **Est égal à** : Vérifie si la valeur est égale à une valeur attendue

#### Tests de comparaison
- **Est supérieur à** : Vérifie si la valeur est supérieure à une autre
- **Est inférieur à** : Vérifie si la valeur est inférieure à une autre
- **Est dans la liste** : Vérifie si la valeur est présente dans une liste prédéfinie

### Actions possibles

#### Visibilité
- **SHOW** (Afficher) : Affiche un champ dans le formulaire
- **HIDE** (Masquer) : Masque un champ dans le formulaire

#### Obligation
- **SET_REQUIRED** (Obligatoire) : Rend un champ obligatoire
- **SET_OPTIONAL** (Facultatif) : Rend un champ facultatif

#### Activation
- **ENABLE** (Activer) : Active un champ pour permettre la saisie
- **DISABLE** (Désactiver) : Désactive un champ pour empêcher la saisie

#### Valeur
- **SET_VALUE** (Prérenseigner) : Prérempli un champ avec une valeur par défaut

## Description détaillée des composants

### 1. Points d'entrée principaux

#### `FieldValidationsEditor.tsx`
- **Rôle** : Composant principal pour gérer les validations d'un champ spécifique
- **Utilisé par** : `ConfigAvancee.tsx`, `SimpleTestEditorsPage.tsx`
- **Dépendances** : `ValidationRuleEditor`, `types.ts`
- **Fonctionnalités** :
  - Chargement des validations depuis l'API
  - Ajout/suppression/modification des validations
  - Interface utilisateur pour la gestion des validations

### 2. Composants d'édition

#### `ValidationRuleEditor.tsx`
- **Rôle** : Éditeur pour une règle de validation individuelle
- **Utilisé par** : `FieldValidationsEditor.tsx`
- **Dépendances** : `ValidationZone`, `ValidationPreview`
- **Fonctionnalités** :
  - Interface utilisateur pour configurer une validation
  - Gestion des options de validation
  - Visualisation des règles de validation

#### `ValidationZone.tsx`
- **Rôle** : Zone de dépôt pour les validations
- **Utilisé par** : `ValidationRuleEditor.tsx`
- **Dépendances** : `ValidationsPalette`
- **Fonctionnalités** :
  - Affichage de la palette de validations
  - Gestion du drag-and-drop pour les validations

#### `ValidationsPalette.tsx`
- **Rôle** : Palette contenant tous les types de validations disponibles
- **Utilisé par** : `ValidationZone.tsx`, `ValidationEditorWidget.tsx`
- **Fonctionnalités** :
  - Présentation des validations par catégories
  - Boutons pour les différents types de validation
  - Infobulles explicatives

### 3. Composants utilitaires

#### `ValidationEvaluator.tsx`
- **Rôle** : Évalue les validations sur une valeur
- **Utilisé par** : Divers composants
- **Fonctionnalités** :
  - Test des validations sur des valeurs
  - Affichage des résultats de validation

#### `ValidationItemEditor.tsx`
- **Rôle** : Éditeur pour une validation spécifique
- **Utilisé par** : `ValidationSequenceEditor.tsx`
- **Fonctionnalités** :
  - Configuration des paramètres de validation
  - Personnalisation des messages d'erreur

## Utilisation

Les validations peuvent être ajoutées à un champ de plusieurs façons :

1. Par clic direct sur le type de validation souhaité
2. Par glisser-déposer (drag-and-drop) vers la zone de validation d'un champ

## Flux de travail typique

1. L'utilisateur ouvre l'éditeur de configuration avancée d'un champ via `ConfigAvancee.tsx`
2. Le composant `FieldValidationsEditor` charge les validations existantes pour ce champ
3. L'utilisateur peut :
   - Ajouter une nouvelle validation depuis la palette
   - Configurer les paramètres de la validation
   - Personnaliser les messages d'erreur
   - Supprimer une validation existante
4. Les validations sont appliquées automatiquement lors de la saisie des données

## Personnalisation des messages d'erreur

Chaque validation peut être configurée avec un message d'erreur personnalisé qui sera affiché à l'utilisateur final lorsque la validation échouera.

## Exemple d'utilisation

```javascript
// Validation d'un champ email
IS_REQUIRED(email) && IS_EMAIL(email)

// Validation d'un champ numérique
IS_NUMBER(prix) && BETWEEN(prix, 0, 1000)

// Validation conditionnelle
IS_POSTAL_CODE(codePostal, pays)

// Validation comparative
date_fin > date_debut
```

## Implémentation technique

Les validations sont implémentées en utilisant React avec TypeScript pour une meilleure sécurité de typage. Le composant `ValidationsPalette` permet d'ajouter et de configurer facilement des validations pour n'importe quel champ du CRM.

### Technologies utilisées

- **React** : Pour la construction de l'interface utilisateur
- **TypeScript** : Pour la sécurité de typage
- **Drag-and-drop API** : Pour l'interaction utilisateur
- **API REST** : Pour la persistance des données

### Intégration avec le reste de l'application

Le système de validation s'intègre avec d'autres parties du CRM :

1. **Store global** : Les validations sont chargées et mises en cache via le store global
2. **API** : Les validations sont persistées via des appels API (/api/fields/{id}/validations)
3. **Formulaires** : Les validations sont appliquées aux champs en temps réel
4. **Formulaire avancé** : Les validations sont configurées dans l'interface avancée des formulaires

## Exemples d'utilisation dans le code

```jsx
// Intégration du FieldValidationsEditor dans un composant parent
import { FieldValidationsEditor } from '../../components/validations';

const ConfigAvancee = ({ field }) => {
  return (
    <div className="config-avancee">
      <h3>Validations du champ</h3>
      <FieldValidationsEditor fieldId={field.id} />
    </div>
  );
};
```

### Exemple d'implémentation d'une validation personnalisée

```typescript
// Exemple d'ajout d'une nouvelle validation dans ValidationsPalette.tsx
const CUSTOM_VALIDATIONS = [
  { 
    value: 'custom_format', 
    label: 'Format personnalisé',
    category: 'format', 
    description: 'Vérifie que la valeur correspond à un format spécifique',
    example: 'ABC-123',
    function: 'MATCH(valeur, "^[A-Z]{3}-\\d{3}$")'
  },
  // autres validations...
];
```
