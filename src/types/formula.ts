/**
 * Types pour la manipulation des formules CRM
 * Ce fichier centralise les définitions de types pour tous les composants liés aux formules
 */

/**
 * Les types possibles d'éléments de formule
 * field: référence directe à un champ (valeur numérique ou convertible)
 * operator: opérateur arithmétique / logique séquentiel (+, -, *, /, =, etc.)
 * value: constante numérique (supporte aussi "10%" => 0.10)
 * function: futur (placeholder)
 * formula_ref: référence au résultat d'une autre formule imbriquée
 * adv_part: extraction d'une partie d'un champ advanced_select (selection / extra / nodeId)
 * cond: bloc conditionnel (if) contenant une condition + sous-séquences then / else
 */
export type FormulaItemType = 'field' | 'operator' | 'value' | 'function' | 'formula_ref' | 'adv_part' | 'cond' | 'switch';

/** Condition simple utilisée dans un item 'cond' */
export interface SimpleCondition {
    kind: 'advanced_select_equals' | 'advanced_select_in' | 'advanced_select_extra_cmp' | 'field_cmp';
    fieldId: string;              // Champ source (ou advanced_select)
    part?: 'selection' | 'extra' | 'nodeId'; // Pour advanced_select
    operator?: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'in';
    value: string | number | Array<string | number>;
}

/**
 * Un élément individuel dans une séquence de formule
 */
export interface FormulaItem {
    id: string;
    type: FormulaItemType;
    value: string | number | boolean | null;
    label?: string;
    fieldId?: string;                 // Pour 'field' ou 'adv_part'
    // --- function ---
    arguments?: FormulaItem[];        // Pour les fonctions futures
    // --- formula_ref ---
    refFormulaId?: string;            // ID de la formule référencée
    // --- adv_part ---
    part?: 'selection' | 'extra' | 'nodeId';
    valueType?: 'number' | 'string';  // Indication conversion
    // --- cond ---
    condition?: SimpleCondition;      // Métadonnées logique
    /** Nouvelle représentation: petite séquence interne (operande / opérateur / operande ...) évaluée en booléen */
    condExpr?: FormulaItem[];         // Alternative drag & drop à condition
    then?: FormulaItem[];             // Sous-séquence si vrai
    else?: FormulaItem[];             // Sous-séquence si faux
    elseBehavior?: 'zero' | 'ignore'; // Si pas de else: zero => 0, ignore => ne produit rien (null)
    // --- switch (multi-cas sur advanced_select.selection) ---
    switchFieldId?: string;           // Champ advanced_select ciblé
    switchPart?: 'selection' | 'extra' | 'nodeId';
    cases?: { value: string; label?: string; seq: FormulaItem[] }[]; // Séquences par valeur exacte
    defaultSeq?: FormulaItem[];       // Séquence par défaut
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
    details?: unknown;
    type?: FormulaValidationType;
}
