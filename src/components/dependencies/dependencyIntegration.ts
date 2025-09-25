/**
 * Ce fichier intègre les nouvelles fonctions de dépendance avec l'interface existante
 * Il permet d'utiliser les nouvelles fonctionnalités avec l'interface actuelle
 */

import { DependencyAction } from '../../utils/dependencyFunctions';

// Mapping des actions existantes vers les nouvelles actions
export const mapActionToNewFormat = (action: 'show' | 'hide' | 'require' | 'unrequire' | 'enable' | 'disable' | 'setValue'): DependencyAction => {
  switch (action) {
    case 'show': return DependencyAction.SHOW;
    case 'hide': return DependencyAction.HIDE;
    case 'require': return DependencyAction.SET_REQUIRED;
    case 'unrequire': return DependencyAction.SET_OPTIONAL;
    case 'enable': return DependencyAction.ENABLE;
    case 'disable': return DependencyAction.DISABLE;
    case 'setValue': return DependencyAction.SET_VALUE;
    default: return DependencyAction.SHOW;
  }
};

// Mapping des nouvelles actions vers les actions existantes
export const mapNewFormatToAction = (action: DependencyAction): 'show' | 'hide' | 'require' | 'unrequire' | 'enable' | 'disable' | 'setValue' => {
  switch (action) {
    case DependencyAction.SHOW: return 'show';
    case DependencyAction.HIDE: return 'hide';
    case DependencyAction.SET_REQUIRED: return 'require';
    case DependencyAction.SET_OPTIONAL: return 'unrequire';
    case DependencyAction.ENABLE: return 'enable';
    case DependencyAction.DISABLE: return 'disable';
    case DependencyAction.SET_VALUE: return 'setValue';
    default: return 'show';
  }
};

// Liste des actions de conditions avancées
export const ADVANCED_CONDITION_FUNCTIONS = [
  { 
    value: 'IF', 
    label: 'IF',
    description: 'Exécute une action si la condition est vraie, sinon exécute une autre action',
    example: 'IF(statut = "En cours", SHOW("details"), HIDE("details"))',
    syntax: 'IF(condition, action_si_vrai, action_si_faux)'
  },
  { 
    value: 'AND', 
    label: 'AND',
    description: 'Vérifie si toutes les conditions sont vraies',
    example: 'AND(statut = "En cours", priorité > 3)',
    syntax: 'AND(condition1, condition2, ...)'
  },
  { 
    value: 'OR', 
    label: 'OR',
    description: 'Vérifie si au moins une des conditions est vraie',
    example: 'OR(statut = "En cours", statut = "En attente")',
    syntax: 'OR(condition1, condition2, ...)'
  },
  { 
    value: 'NOT', 
    label: 'NOT',
    description: 'Inverse une condition',
    example: 'NOT(IS_EMPTY(email))',
    syntax: 'NOT(condition)'
  },
];

// Liste des tests de valeur avancés
export const ADVANCED_VALUE_TESTS = [
  { 
    value: 'IS_NULL', 
    label: 'Est null',
    description: 'Vérifie si une valeur est null',
    example: 'IS_NULL(date_fin)'
  },
  { 
    value: 'IS_EMPTY', 
    label: 'Est vide',
    description: 'Vérifie si une valeur est vide',
    example: 'IS_EMPTY(commentaire)'
  },
  { 
    value: 'EQUALS', 
    label: 'Est égal à',
    description: 'Vérifie si une valeur est égale à une autre',
    example: 'pays = "France"'
  },
  { 
    value: 'IN', 
    label: 'Est dans la liste',
    description: 'Vérifie si une valeur est présente dans une liste',
    example: 'pays IN ["France", "Belgique", "Suisse"]'
  },
  { 
    value: 'GREATER_THAN', 
    label: 'Est supérieur à',
    description: 'Vérifie si une valeur est supérieure à une autre',
    example: 'age > 18'
  },
  { 
    value: 'LESS_THAN', 
    label: 'Est inférieur à',
    description: 'Vérifie si une valeur est inférieure à une autre',
    example: 'prix < 100'
  },
];
