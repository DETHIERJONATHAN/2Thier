# Documentation du système de dépendances dans le CRM

## Aperçu

Le système de dépendances permet de définir des comportements dynamiques pour les champs en fonction de conditions spécifiques. Ces dépendances offrent un moyen puissant de créer des formulaires interactifs qui réagissent aux données saisies par l'utilisateur.

## Fonctionnalités principales

Le système de dépendances permet de :

1. **Contrôler l'affichage des champs** : Afficher ou masquer des champs en fonction de conditions
2. **Gérer l'état des champs** : Activer ou désactiver des champs selon le contexte
3. **Définir la nature obligatoire** : Rendre des champs obligatoires ou facultatifs de façon dynamique
4. **Pré-remplir automatiquement** : Définir des valeurs par défaut conditionnelles

## Architecture du système de dépendances

Le système de dépendances est organisé selon une architecture modulaire avec plusieurs composants interconnectés :

```
dependencies/
├── types.ts                    # Définition des types et interfaces
├── dependencyIntegration.ts    # Intégration avec l'API et fonctions avancées
├── dependencyUtils.ts          # Utilitaires pour la manipulation des dépendances
├── DependencyRuleEditorNew.tsx # Éditeur principal des règles de dépendance
├── FieldDependenciesEditor.tsx # Composant parent pour éditer les dépendances d'un champ
├── DependencyRules.tsx         # Gestionnaire des règles de dépendance et leur évaluation
├── DynamicFormField.tsx        # Champ de formulaire réactif aux dépendances
└── index.ts                    # Point d'entrée pour les exports
```

### Flux de données et interactions

```
┌───────────────────┐     ┌─────────────────────────┐
│ ConfigAvancee.tsx │────▶│ FieldDependenciesEditor │
└───────────────────┘     └───────────┬─────────────┘
                                      │
                                      ▼
                          ┌───────────────────────────┐
                          │ DependencyRuleEditorNew   │
                          └─┬────────────────────────┬┘
                            │                        │
                ┌───────────▼───────┐      ┌─────────▼──────────┐
                │ dependencyUtils   │      │ dependencyIntegration│
                └───────────────────┘      └────────────────────┘
```

## Types de dépendances

### Conditions de dépendance

Les conditions permettent d'évaluer des situations et de déterminer quelles actions exécuter :

- **IF(condition, action_si_vrai, action_si_faux)** : Exécute une action si la condition est vraie, sinon exécute une autre action
  ```javascript
  IF(statut = "Fermé", HIDE("commentaire"), SHOW("commentaire"))
  ```

- **AND(cond1, cond2, ...)** : Vérifie si toutes les conditions sont vraies
  ```javascript
  IF(AND(type = "Entreprise", chiffre_affaires > 1000000), SHOW("contact_comptable"), HIDE("contact_comptable"))
  ```

- **OR(cond1, cond2, ...)** : Vérifie si au moins une des conditions est vraie
  ```javascript
  IF(OR(statut = "Urgent", priorite > 3), SHOW("alerte"), HIDE("alerte"))
  ```

- **NOT(condition)** : Inverse une condition
  ```javascript
  IF(NOT(IS_EMPTY(email)), ENABLE("validation"), DISABLE("validation"))
  ```

### Tests sur valeurs

Les fonctions de test permettent d'évaluer des valeurs et de les comparer :

- **IS_NULL(valeur)** : Vérifie si la valeur est null
  ```javascript
  IF(IS_NULL(date_fin), SET_REQUIRED("justification"), SET_OPTIONAL("justification"))
  ```

- **IS_EMPTY(valeur)** : Vérifie si la valeur est vide
  ```javascript
  IF(IS_EMPTY(telephone), SHOW("avertissement_telephone"), HIDE("avertissement_telephone"))
  ```

- **valeur = valeur_attendue** : Vérifie l'égalité entre deux valeurs
  ```javascript
  IF(pays = "France", SHOW("departement"), HIDE("departement"))
  ```

- **valeur IN liste** : Vérifie si la valeur est présente dans une liste
  ```javascript
  IF(pays IN ["France", "Belgique", "Suisse"], SHOW("langue_francaise"), HIDE("langue_francaise"))
  ```

- **Comparaisons** : >, <, >=, <=, =, !=
  ```javascript
  IF(age < 18, HIDE("contrat"), SHOW("contrat"))
  ```

### Actions possibles

Les actions définissent ce qui doit se produire lorsqu'une condition est remplie :

- **SHOW(field_id)** : Affiche un champ
  ```javascript
  SHOW("adresse_livraison")
  ```

- **HIDE(field_id)** : Masque un champ
  ```javascript
  HIDE("adresse_livraison")
  ```

- **ENABLE(field_id)** : Active un champ
  ```javascript
  ENABLE("bouton_validation")
  ```

- **DISABLE(field_id)** : Désactive un champ
  ```javascript
  DISABLE("bouton_validation")
  ```

- **SET_REQUIRED(field_id)** : Rend un champ obligatoire
  ```javascript
  SET_REQUIRED("telephone")
  ```

- **SET_OPTIONAL(field_id)** : Rend un champ facultatif
  ```javascript
  SET_OPTIONAL("telephone")
  ```

- **SET_VALUE(field_id, valeur)** : Prérempli un champ avec une valeur
  ```javascript
  SET_VALUE("pays", "France")
  ```

## Actions sur plusieurs champs

Certaines actions peuvent être appliquées à plusieurs champs en même temps en passant un tableau d'identifiants :

```javascript
// Masquer plusieurs champs d'un coup
HIDE(["adresse_livraison", "adresse_facturation", "code_promo"])

// Activer plusieurs champs
ENABLE(["telephone", "email", "adresse"])

// Rendre plusieurs champs obligatoires
SET_REQUIRED(["nom", "prenom", "email"])
```

## Exemples complets

### Formulaire d'inscription avec différents profils

```javascript
// Si le type de compte est "Entreprise", afficher les champs spécifiques aux entreprises
IF(type_compte = "Entreprise", SHOW(["siret", "tva", "raison_sociale"]), HIDE(["siret", "tva", "raison_sociale"]))

// Si le type de compte est "Particulier", afficher les champs spécifiques aux particuliers
IF(type_compte = "Particulier", SHOW(["date_naissance", "profession"]), HIDE(["date_naissance", "profession"]))

// Rendre le champ "téléphone mobile" obligatoire si l'option "notifications SMS" est cochée
IF(notifications_sms = true, SET_REQUIRED("telephone_mobile"), SET_OPTIONAL("telephone_mobile"))

// Désactiver le bouton de validation tant que les CGV ne sont pas acceptées
IF(cgv_acceptees = true, ENABLE("bouton_validation"), DISABLE("bouton_validation"))
```

### Formulaire de commande

```javascript
// Afficher l'adresse de livraison uniquement si elle est différente de l'adresse de facturation
IF(adresse_differente = true, SHOW("bloc_adresse_livraison"), HIDE("bloc_adresse_livraison"))

// Rendre le champ "instructions de livraison" obligatoire si le type de livraison est "à domicile"
IF(type_livraison = "domicile", SET_REQUIRED("instructions_livraison"), SET_OPTIONAL("instructions_livraison"))

// Pré-remplir le pays avec "France" si le champ est vide
IF(IS_EMPTY(pays), SET_VALUE("pays", "France"))

// Afficher les options de paiement en fonction du montant total
IF(montant_total > 1000, 
   SHOW(["paiement_echelonne", "virement", "cheque"]), 
   HIDE("paiement_echelonne")
)
```

## Implémentation technique

Le système de dépendances est implémenté avec TypeScript pour une meilleure sécurité de typage. Les fonctions principales sont définies dans le module `dependencyFunctions.ts` et peuvent être utilisées dans tous les composants de formulaire du CRM.

Pour évaluer toutes les dépendances d'un formulaire, utilisez la fonction `evaluateDependencies` qui appliquera automatiquement les actions appropriées en fonction des conditions spécifiées.

## Description détaillée des composants

### 1. Points d'entrée principaux

#### `FieldDependenciesEditor.tsx`
- **Rôle** : Composant principal pour gérer les dépendances d'un champ spécifique
- **Utilisé par** : `ConfigAvancee.tsx`, `SimpleTestEditorsPage.tsx`
- **Dépendances** : `DependencyRuleEditorNew.tsx`, `useCRMStore`, `types.ts`
- **Fonctionnalités** :
  - Chargement des dépendances depuis l'API
  - Ajout/suppression/modification des dépendances
  - Interface utilisateur pour la gestion des dépendances

#### `DynamicFormField.tsx`
- **Rôle** : Composant de champ de formulaire qui réagit aux dépendances
- **Utilisé par** : `DependenciesDemo.tsx` et autres composants de formulaire
- **Dépendances** : `DependencyRules.tsx`
- **Fonctionnalités** :
  - Affiche/masque/active/désactive le champ selon les dépendances
  - Applique les règles de dépendance en temps réel

### 2. Composants d'édition

#### `DependencyRuleEditorNew.tsx`
- **Rôle** : Éditeur avancé pour une règle de dépendance individuelle
- **Utilisé par** : `FieldDependenciesEditor.tsx`
- **Dépendances** : `@dnd-kit/core`, `dependencyIntegration.ts`, `useCRMStore`
- **Fonctionnalités** :
  - Interface drag-and-drop pour la création de conditions
  - Gestion des opérateurs logiques (IF, AND, OR, NOT)
  - Tests de valeur (IS_NULL, IS_EMPTY, etc.)
  - Sélection d'actions de dépendance (show, hide, require, etc.)

#### `DependencyRules.tsx`
- **Rôle** : Gestionnaire de règles pour évaluer et appliquer les dépendances
- **Utilisé par** : `DynamicFormField.tsx`
- **Dépendances** : `AdvancedDependencyEditor.tsx`, `dependencyFunctions.ts`
- **Fonctionnalités** :
  - Évaluation des règles de dépendance
  - Application des résultats aux champs cibles

### 3. Fichiers utilitaires et définitions

#### `types.ts`
- **Rôle** : Définit les interfaces et types utilisés dans le système de dépendances
- **Principales interfaces** :
  - `Dependency` : Structure principale d'une règle de dépendance
  - `DependencyAction` : Types d'actions possibles
  - `DependencyOperator` : Opérateurs de comparaison
  - `DependencyCondition` : Structure pour les conditions

#### `dependencyIntegration.ts`
- **Rôle** : Intègre les fonctions avancées de dépendance avec l'interface utilisateur
- **Fonctionnalités** :
  - Définition des opérateurs logiques disponibles (ADVANCED_CONDITION_FUNCTIONS)
  - Définition des tests de valeur disponibles (ADVANCED_VALUE_TESTS)
  - Mapping entre les actions internes et l'API

#### `dependencyUtils.ts`
- **Rôle** : Fournit des fonctions utilitaires pour la manipulation des dépendances
- **Fonctionnalités** :
  - Validation des dépendances
  - Conversion de formats
  - Fonctions helper pour la gestion des dépendances

### 4. Utilitaires externes

#### `src/utils/dependencyFunctions.ts`
- **Rôle** : Définit les fonctions de base utilisées pour l'évaluation des dépendances
- **Principales fonctions** :
  - `IF`, `AND`, `OR`, `NOT` : Opérateurs logiques
  - `SHOW`, `HIDE`, `ENABLE`, `DISABLE` : Actions sur les champs
  - `SET_REQUIRED`, `SET_OPTIONAL`, `SET_VALUE` : Modifications d'état
  - `IS_NULL`, `IS_EMPTY`, etc. : Tests de valeur

## Flux de traitement d'une dépendance

1. L'utilisateur crée une dépendance via `FieldDependenciesEditor`
2. La dépendance est éditée avec `DependencyRuleEditorNew` 
3. Les conditions et actions sont stockées dans un objet `Dependency`
4. La dépendance est enregistrée via API et mise en cache dans le store
5. Au moment du rendu d'un formulaire, `DynamicFormField` utilise `DependencyRules` pour évaluer les dépendances
6. Les actions résultantes sont appliquées (afficher/masquer/activer/désactiver le champ)

## Intégration avec le reste de l'application

Le système de dépendances s'intègre avec d'autres parties du CRM :

1. **Store global** : Via `useCRMStore`, les dépendances accèdent à la structure des formulaires et blocs
2. **API** : Les dépendances sont persistées via des appels API (/api/fields/{id}/dependencies)
3. **Formulaires** : Les champs dynamiques réagissent aux dépendances en temps réel
4. **Configuration** : Les dépendances sont configurées dans l'interface avancée des formulaires
