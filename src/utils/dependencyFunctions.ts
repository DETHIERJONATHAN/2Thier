/**
 * Fonctions de dépendance pour le système CRM
 * Ces fonctions permettent de définir des comportements dynamiques pour les champs
 * en fonction de conditions spécifiques.
 */

import { IS_EMPTY } from './validationFunctions';

/**
 * Types d'actions possibles pour les dépendances
 */
export enum DependencyAction {
    SHOW = 'SHOW',
    HIDE = 'HIDE',
    ENABLE = 'ENABLE',
    DISABLE = 'DISABLE',
    SET_REQUIRED = 'SET_REQUIRED',
    SET_OPTIONAL = 'SET_OPTIONAL',
    SET_VALUE = 'SET_VALUE'
}

/**
 * Interface pour les résultats d'une dépendance
 */
export interface DependencyResult {
    action: DependencyAction;
    targetField: string | string[];
    value?: any;
    applied: boolean;
}

/**
 * Évalue une condition et exécute l'une des deux actions en fonction du résultat
 * @param condition - La condition à évaluer
 * @param actionIfTrue - L'action à exécuter si la condition est vraie
 * @param actionIfFalse - L'action à exécuter si la condition est fausse
 * @returns Le résultat de l'action exécutée
 */
export function IF(condition: boolean, actionIfTrue: DependencyResult, actionIfFalse: DependencyResult): DependencyResult {
    if (condition) {
        return {
            ...actionIfTrue,
            applied: true
        };
    } else {
        return {
            ...actionIfFalse,
            applied: true
        };
    }
}

/**
 * Vérifie si toutes les conditions sont vraies
 * @param conditions - Les conditions à vérifier
 * @returns true si toutes les conditions sont vraies, false sinon
 */
export function AND(...conditions: boolean[]): boolean {
    return conditions.every(condition => Boolean(condition));
}

/**
 * Vérifie si au moins une des conditions est vraie
 * @param conditions - Les conditions à vérifier
 * @returns true si au moins une condition est vraie, false sinon
 */
export function OR(...conditions: boolean[]): boolean {
    return conditions.some(condition => Boolean(condition));
}

/**
 * Inverse une condition
 * @param condition - La condition à inverser
 * @returns true si la condition est fausse, false si elle est vraie
 */
export function NOT(condition: boolean): boolean {
    return !condition;
}

/**
 * Vérifie si une valeur est présente dans une liste
 * @param value - La valeur à rechercher
 * @param list - La liste dans laquelle rechercher
 * @returns true si la valeur est dans la liste, false sinon
 */
export function IN(value: any, list: any[]): boolean {
    return list.includes(value);
}

/**
 * Action pour afficher un champ
 * @param fieldId - L'identifiant du champ à afficher (peut être un ID unique ou un tableau d'IDs)
 * @returns L'objet de résultat de dépendance
 */
export function SHOW(fieldId: string | string[]): DependencyResult {
    return {
        action: DependencyAction.SHOW,
        targetField: fieldId,
        applied: false
    };
}

/**
 * Action pour masquer un champ
 * @param fieldId - L'identifiant du champ à masquer (peut être un ID unique ou un tableau d'IDs)
 * @returns L'objet de résultat de dépendance
 */
export function HIDE(fieldId: string | string[]): DependencyResult {
    return {
        action: DependencyAction.HIDE,
        targetField: fieldId,
        applied: false
    };
}

/**
 * Action pour activer un champ
 * @param fieldId - L'identifiant du champ à activer (peut être un ID unique ou un tableau d'IDs)
 * @returns L'objet de résultat de dépendance
 */
export function ENABLE(fieldId: string | string[]): DependencyResult {
    return {
        action: DependencyAction.ENABLE,
        targetField: fieldId,
        applied: false
    };
}

/**
 * Action pour désactiver un champ
 * @param fieldId - L'identifiant du champ à désactiver (peut être un ID unique ou un tableau d'IDs)
 * @returns L'objet de résultat de dépendance
 */
export function DISABLE(fieldId: string | string[]): DependencyResult {
    return {
        action: DependencyAction.DISABLE,
        targetField: fieldId,
        applied: false
    };
}

/**
 * Action pour rendre un champ obligatoire
 * @param fieldId - L'identifiant du champ à rendre obligatoire (peut être un ID unique ou un tableau d'IDs)
 * @returns L'objet de résultat de dépendance
 */
export function SET_REQUIRED(fieldId: string | string[]): DependencyResult {
    return {
        action: DependencyAction.SET_REQUIRED,
        targetField: fieldId,
        applied: false
    };
}

/**
 * Action pour rendre un champ facultatif
 * @param fieldId - L'identifiant du champ à rendre facultatif (peut être un ID unique ou un tableau d'IDs)
 * @returns L'objet de résultat de dépendance
 */
export function SET_OPTIONAL(fieldId: string | string[]): DependencyResult {
    return {
        action: DependencyAction.SET_OPTIONAL,
        targetField: fieldId,
        applied: false
    };
}

/**
 * Action pour définir la valeur d'un champ
 * @param fieldId - L'identifiant du champ dont on veut définir la valeur
 * @param value - La valeur à définir
 * @returns L'objet de résultat de dépendance
 */
export function SET_VALUE(fieldId: string, value: any): DependencyResult {
    return {
        action: DependencyAction.SET_VALUE,
        targetField: fieldId,
        value,
        applied: false
    };
}

/**
 * Applique une dépendance à un champ
 * @param result - Le résultat de la dépendance à appliquer
 * @param formValues - Les valeurs actuelles du formulaire
 * @param updateFormField - Fonction pour mettre à jour un champ du formulaire
 */
export function applyDependency(
    result: DependencyResult,
    formValues: Record<string, any>,
    updateFormField: (fieldId: string, property: string, value: any) => void
): void {
    if (!result.applied) return;

    const fields = Array.isArray(result.targetField) ? result.targetField : [result.targetField];

    fields.forEach(fieldId => {
        switch (result.action) {
            case DependencyAction.SHOW:
                updateFormField(fieldId, 'visible', true);
                break;
            case DependencyAction.HIDE:
                updateFormField(fieldId, 'visible', false);
                break;
            case DependencyAction.ENABLE:
                updateFormField(fieldId, 'disabled', false);
                break;
            case DependencyAction.DISABLE:
                updateFormField(fieldId, 'disabled', true);
                break;
            case DependencyAction.SET_REQUIRED:
                updateFormField(fieldId, 'required', true);
                break;
            case DependencyAction.SET_OPTIONAL:
                updateFormField(fieldId, 'required', false);
                break;
            case DependencyAction.SET_VALUE:
                // Ne mettre à jour la valeur que si le champ est vide ou différent
                if (IS_EMPTY(formValues[fieldId]) || formValues[fieldId] !== result.value) {
                    updateFormField(fieldId, 'value', result.value);
                }
                break;
        }
    });
}

/**
 * Évalue toutes les dépendances d'un formulaire
 * @param dependencies - Liste des fonctions de dépendance à évaluer
 * @param formValues - Les valeurs actuelles du formulaire
 * @param updateFormField - Fonction pour mettre à jour un champ du formulaire
 */
export function evaluateDependencies(
    dependencies: Array<() => DependencyResult>,
    formValues: Record<string, any>,
    updateFormField: (fieldId: string, property: string, value: any) => void
): void {
    dependencies.forEach(dependencyFn => {
        const result = dependencyFn();
        applyDependency(result, formValues, updateFormField);
    });
}
