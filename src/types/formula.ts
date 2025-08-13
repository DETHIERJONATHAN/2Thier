/**
 * Types pour la manipulation des formules CRM
 * Ce fichier centralise les définitions de types pour tous les composants liés aux formules
 */

/**
 * Les types possibles d'éléments de formule
 */
export type FormulaItemType = 'field' | 'operator' | 'value' | 'function';

/**
 * Un élément individuel dans une séquence de formule
 */
export interface FormulaItem {
    id: string;
    type: FormulaItemType;
    value: string | number | boolean;
    label?: string;
    fieldId?: string;  // Pour les éléments de type 'field'
    // Propriétés spécifiques aux fonctions
    arguments?: FormulaItem[];  // Pour les éléments de type 'function'
}

/**
 * Une formule complète
 */
export interface Formula {
    id: string;
    name: string;
    sequence: FormulaItem[];
    targetProperty: string;
    expression?: string;
    targetFieldId?: string;
    // Autres propriétés potentielles
    description?: string;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
    updatedBy?: string;
}

/**
 * Types possibles de validation pour une formule
 */
export type FormulaValidationType = 
    | 'sequence'      // Validation de la structure de séquence
    | 'operators'     // Validation des opérateurs
    | 'fields'        // Validation des champs
    | 'functions'     // Validation des fonctions
    | 'complete';     // Validation complète

/**
 * Résultat de validation d'une formule
 */
export interface FormulaValidationResult {
    isValid: boolean;
    message: string;
    details?: any;
    type?: FormulaValidationType;
}
