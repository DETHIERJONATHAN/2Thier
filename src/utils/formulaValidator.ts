import { Formula, FormulaItem, FormulaValidationResult, FormulaValidationType } from '../types/formula';

/**
 * Vérifie si une formule est valide pour être manipulée
 * @param formula La formule à vérifier
 * @param source Le nom du composant qui effectue la vérification (pour les logs)
 * @returns Un objet contenant le résultat de la validation et un message éventuel
 */
export const validateFormula = (formula: any, source: string = 'Validator'): FormulaValidationResult => {
    if (!formula) {
        console.error(`[${source}] ❌ Formule invalide: non définie`);
        return { 
            isValid: false, 
            message: 'Formule non définie',
            type: 'complete'
        };
    }

    // Vérification de l'ID
    if (!formula.id || typeof formula.id !== 'string' || formula.id.trim() === '') {
        console.error(`[${source}] ❌ Formule invalide: ID manquant ou invalide`, { 
            id: formula.id, 
            type: typeof formula.id 
        });
        return { 
            isValid: false, 
            message: 'ID de formule invalide', 
            details: { id: formula.id, type: typeof formula.id },
            type: 'complete'
        };
    }

    // Validation de la structure de la séquence
    if (formula.sequence && !Array.isArray(formula.sequence)) {
        console.error(`[${source}] ❌ Formule invalide: la séquence n'est pas un tableau`, {
            sequence: formula.sequence,
            type: typeof formula.sequence
        });
        return {
            isValid: false,
            message: 'Séquence de formule invalide',
            details: { sequence: formula.sequence, type: typeof formula.sequence },
            type: 'sequence'
        };
    }

    // Analyse approfondie de la séquence
    if (formula.sequence && Array.isArray(formula.sequence)) {
        const sequenceAnalysis = analyzeSequence(formula.sequence, source);
        
        // Vérifier les IDs des éléments
        const invalidItems = formula.sequence.filter(
            (item: FormulaItem) => !item || !item.id || typeof item.id !== 'string' || item.id.trim() === ''
        );
        
        if (invalidItems.length > 0) {
            console.error(`[${source}] ⚠️ Formule avec ${invalidItems.length} éléments de séquence sans ID valide`, {
                invalidItems,
                formulaId: formula.id
            });
            // Ne pas bloquer l'opération, mais signaler le problème
            console.warn(`[${source}] 🔍 La formule ${formula.id} contient des éléments invalides`);
        }
        
        // Vérifier la cohérence des types d'éléments
        if (sequenceAnalysis.hasInvalidTypes) {
            console.warn(`[${source}] ⚠️ La formule ${formula.id} contient des types d'éléments inconnus`, {
                invalidTypes: sequenceAnalysis.invalidTypes
            });
        }

        // Vérifier l'alternance champ/opérateur
        if (sequenceAnalysis.hasOperatorSequenceIssues) {
            console.warn(`[${source}] ⚠️ La formule ${formula.id} présente des problèmes de séquence d'opérateurs`, {
                sequenceDetails: sequenceAnalysis.operatorSequenceIssues
            });
        }

        // Vérifier la présence d'au moins un champ
        if (formula.sequence.length > 0 && sequenceAnalysis.typeCounts.field === 0) {
            console.warn(`[${source}] ⚠️ La formule ${formula.id} ne contient aucun champ`);
        }

        // Statistiques générales
        console.log(`[${source}] 📊 Statistiques de la formule ${formula.id}:`, {
            totalElements: formula.sequence.length,
            typeCounts: sequenceAnalysis.typeCounts,
        });
    }

    // Validation du nom
    if (!formula.name || typeof formula.name !== 'string') {
        console.warn(`[${source}] ⚠️ Formule ${formula.id} sans nom ou avec nom invalide`);
    }

    // Succès
    console.log(`[${source}] ✅ Formule valide: ${formula.id}`, {
        name: formula.name || 'Sans nom',
        sequenceLength: formula.sequence?.length || 0,
        targetProperty: formula.targetProperty
    });
    
    return { isValid: true, message: 'Formule valide' };
};

/**
 * Analyse la séquence d'une formule pour détecter des problèmes potentiels
 */
const analyzeSequence = (sequence: FormulaItem[], source: string) => {
    const result = {
        typeCounts: {
            field: 0,
            operator: 0, 
            value: 0,
            function: 0,
            unknown: 0
        },
        hasInvalidTypes: false,
        invalidTypes: [] as string[],
        hasOperatorSequenceIssues: false,
        operatorSequenceIssues: [] as string[]
    };

    if (!Array.isArray(sequence) || sequence.length === 0) {
        return result;
    }
    
    // Analyse des types d'éléments
    sequence.forEach((item, index) => {
        if (!item || typeof item !== 'object') {
            result.hasInvalidTypes = true;
            result.invalidTypes.push(`Element à l'index ${index} n'est pas un objet valide`);
            return;
        }
        
        switch(item.type) {
            case 'field':
                result.typeCounts.field++;
                break;
            case 'operator':
                result.typeCounts.operator++;
                break;
            case 'value':
                result.typeCounts.value++;
                break;
            case 'function':
                result.typeCounts.function++;
                break;
            default:
                result.typeCounts.unknown++;
                result.hasInvalidTypes = true;
                result.invalidTypes.push(`Type inconnu: "${item.type}" à l'index ${index}`);
        }
    });

    // Analyse de l'alternance opérateurs/non-opérateurs
    // Une formule valide ne devrait pas avoir deux opérateurs consécutifs ou deux champs consécutifs sans opérateur entre eux
    let lastType = '';
    sequence.forEach((item, index) => {
        if (!item || !item.type) return;
        
        if (item.type === 'operator') {
            if (lastType === 'operator') {
                result.hasOperatorSequenceIssues = true;
                result.operatorSequenceIssues.push(`Deux opérateurs consécutifs aux index ${index-1} et ${index}`);
            }
        } else {
            if (lastType !== '' && lastType !== 'operator') {
                result.hasOperatorSequenceIssues = true;
                result.operatorSequenceIssues.push(`Deux non-opérateurs consécutifs sans opérateur entre eux aux index ${index-1} et ${index}`);
            }
        }
        
        lastType = item.type;
    });
    
    return result;
};

/**
 * Prépare une formule pour être envoyée à l'API en effectuant des corrections si nécessaire
 * @param formula La formule à préparer
 * @param source Le nom du composant qui effectue la préparation (pour les logs)
 * @returns La formule corrigée et prête pour l'API
 */
export const prepareFormulaForAPI = (formula: Formula, source: string = 'Validator'): Formula => {
    if (!formula) {
        console.error(`[${source}] ❌ Impossible de préparer une formule undefined`);
        throw new Error('Formule non définie');
    }

    const preparedFormula = { ...formula };

    // S'assurer que l'ID est présent
    if (!preparedFormula.id || typeof preparedFormula.id !== 'string' || preparedFormula.id.trim() === '') {
        console.error(`[${source}] ❌ Impossible de préparer une formule sans ID valide`);
        throw new Error('ID de formule invalide');
    }

    // S'assurer que la séquence est un tableau
    if (!preparedFormula.sequence) {
        preparedFormula.sequence = [];
        console.warn(`[${source}] ⚠️ Initialisation d'une séquence vide pour la formule ${preparedFormula.id}`);
    } else if (!Array.isArray(preparedFormula.sequence)) {
        console.warn(`[${source}] ⚠️ Conversion de la séquence en tableau pour la formule ${preparedFormula.id}`);
        preparedFormula.sequence = [];
    }

    // Réparer les éléments invalides de la séquence
    if (Array.isArray(preparedFormula.sequence)) {
        preparedFormula.sequence = preparedFormula.sequence.map((item, index) => {
            if (!item) {
                console.warn(`[${source}] ⚠️ Élément null ou undefined à l'index ${index}, remplacement par un opérateur par défaut`);
                return {
                    id: `auto-fix-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                    type: 'operator',
                    value: '+',
                    label: 'Opérateur par défaut'
                };
            }

            if (!item.id || typeof item.id !== 'string' || item.id.trim() === '') {
                console.warn(`[${source}] ⚠️ Élément sans ID valide à l'index ${index}, ajout d'un ID`);
                return {
                    ...item,
                    id: `auto-fix-${item.type || 'item'}-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 9)}`
                };
            }

            // S'assurer que l'élément a un type valide
            if (!item.type || !['field', 'operator', 'value', 'function'].includes(item.type)) {
                console.warn(`[${source}] ⚠️ Élément avec type invalide (${item.type}) à l'index ${index}, correction en 'value'`);
                return {
                    ...item,
                    type: 'value' as const
                };
            }

            // S'assurer que l'élément a une valeur (même si c'est une chaîne vide)
            if (item.value === undefined || item.value === null) {
                console.warn(`[${source}] ⚠️ Élément sans valeur à l'index ${index}, ajout d'une valeur par défaut`);
                return {
                    ...item,
                    value: item.type === 'operator' ? '+' : ''
                };
            }

            return item;
        });
    }

    // S'assurer qu'il y a un nom
    if (!preparedFormula.name || preparedFormula.name.trim() === '') {
        preparedFormula.name = 'Formule sans nom';
        console.warn(`[${source}] ⚠️ Ajout d'un nom par défaut à la formule ${preparedFormula.id}`);
    }

    // S'assurer qu'il y a une targetProperty (même si vide)
    if (preparedFormula.targetProperty === undefined || preparedFormula.targetProperty === null) {
        preparedFormula.targetProperty = '';
        console.warn(`[${source}] ⚠️ Initialisation de targetProperty pour la formule ${preparedFormula.id}`);
    }

    console.log(`[${source}] ✅ Formule préparée pour l'API: ${preparedFormula.id}`, {
        name: preparedFormula.name,
        sequenceLength: preparedFormula.sequence.length,
        targetProperty: preparedFormula.targetProperty || '(non définie)'
    });

    return preparedFormula;
};

/**
 * Obtient les headers standard pour les requêtes API
 */
export const getAPIHeaders = (): HeadersInit => {
    const token = localStorage.getItem('token');
    const organizationId = localStorage.getItem('organizationId');
    
    const headers: HeadersInit = {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
    };
    
    if (organizationId) {
        headers['X-Organization-Id'] = organizationId;
    }
    
    return headers;
};

/**
 * Vérifie si une séquence de formule est bien équilibrée
 * (par exemple, pas deux opérateurs consécutifs)
 */
export const validateFormulaSequence = (sequence: FormulaItem[]): FormulaValidationResult => {
    if (!Array.isArray(sequence)) {
        return {
            isValid: false,
            message: 'Séquence invalide: ce n\'est pas un tableau',
            type: 'sequence'
        };
    }
    
    // Séquence vide est valide
    if (sequence.length === 0) {
        return {
            isValid: true,
            message: 'Séquence vide',
            type: 'sequence'
        };
    }
    
    // Une séquence avec un seul élément est valide seulement si c'est un champ ou une valeur
    if (sequence.length === 1) {
        const item = sequence[0];
        if (item.type !== 'field' && item.type !== 'value' && item.type !== 'function') {
            return {
                isValid: false,
                message: 'Une séquence avec un seul élément doit être un champ ou une valeur, pas un opérateur',
                type: 'sequence'
            };
        }
        return {
            isValid: true,
            message: 'Séquence avec un seul élément valide',
            type: 'sequence'
        };
    }
    
    // Vérifier l'alternance opérateurs/non-opérateurs
    let lastType = '';
    for (let i = 0; i < sequence.length; i++) {
        const item = sequence[i];
        
        if (!item || !item.type) {
            return {
                isValid: false,
                message: `Élément invalide à l'index ${i}`,
                type: 'sequence'
            };
        }
        
        if (item.type === 'operator') {
            if (lastType === 'operator') {
                return {
                    isValid: false,
                    message: `Deux opérateurs consécutifs aux index ${i-1} et ${i}`,
                    details: { index1: i-1, index2: i },
                    type: 'sequence'
                };
            }
        } else {
            if (lastType !== '' && lastType !== 'operator') {
                return {
                    isValid: false,
                    message: `Deux non-opérateurs consécutifs sans opérateur entre eux aux index ${i-1} et ${i}`,
                    details: { index1: i-1, index2: i },
                    type: 'sequence'
                };
            }
        }
        
        lastType = item.type;
    }
    
    return {
        isValid: true,
        message: 'Séquence valide',
        type: 'sequence'
    };
};
