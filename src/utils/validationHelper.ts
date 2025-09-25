/**
 * Utilitaires pour les validations
 */

/**
 * Retourne le libellé utilisateur pour un type de validation
 */
export function getValidationLabel(type: string): string {
    const validationLabels: Record<string, string> = {
        required: 'Obligatoire',
        min_value: 'Valeur Min',
        max_value: 'Valeur Max',
        min_length: 'Longueur Min',
        max_length: 'Longueur Max',
        regex: 'Expression Régulière',
        email: 'Email',
        phone: 'Téléphone',
        iban: 'IBAN',
        vat: 'TVA',
        postal_code: 'Code Postal',
        compare_fields: 'Comparer Champs',
        conditional: 'Conditionnelle',
        blacklist: 'Liste Noire',
        cross_field: 'Multi-champ'
    };

    return validationLabels[type] || type;
}

/**
 * Retourne les en-têtes pour les appels d'API
 */
export function getAPIHeaders(): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        'X-Client-Version': process.env.VITE_APP_VERSION || '1.0.0',
    };
}

/**
 * Applique une validation à une valeur
 * @param type Type de validation
 * @param value Valeur à valider
 * @param params Paramètres additionnels
 * @returns {boolean} true si la validation passe, false sinon
 */
export function applyValidation(
    type: string,
    value: any,
    params?: Record<string, any>,
    formValues?: Record<string, any>
): boolean {
    // Éviter les erreurs sur les valeurs nulles ou undefined si non requis
    if ((value === null || value === undefined || value === '') && type !== 'required') {
        return true;
    }

    switch (type) {
        case 'required':
            return value !== null && value !== undefined && value !== '';
        
        case 'min_value':
            return Number(value) >= Number(params?.value || 0);
        
        case 'max_value':
            return Number(value) <= Number(params?.value || 0);
        
        case 'min_length':
            return String(value).length >= Number(params?.length || 0);
        
        case 'max_length':
            return String(value).length <= Number(params?.length || 0);
        
        case 'regex':
            try {
                const pattern = new RegExp(params?.pattern || '');
                return pattern.test(String(value));
            } catch (e) {
                console.error('Erreur regex:', e);
                return false;
            }
        
        case 'email':
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
        
        case 'phone':
            // Format de téléphone international simplifié
            return /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,3}[-\s.]?[0-9]{4,7}$/.test(String(value));
        
        case 'compare_fields':
            if (!formValues || !params?.targetField) return true;
            const targetValue = formValues[params.targetField];
            const operator = params?.operator || '==';
            
            switch (operator) {
                case '==': return value == targetValue;
                case '!=': return value != targetValue;
                case '>': return value > targetValue;
                case '<': return value < targetValue;
                case '>=': return value >= targetValue;
                case '<=': return value <= targetValue;
                default: return true;
            }
        
        case 'conditional':
            // Pour les validations conditionnelles, il faudrait un évaluateur d'expressions
            // Simplifié ici, mais devrait être implémenté avec un vrai évaluateur
            if (!params?.condition || !formValues) return true;
            
            // Si la condition n'est pas remplie, pas besoin de valider
            // Implémentation simplifiée
            const conditionMet = evaluateCondition(params.condition, formValues);
            if (!conditionMet) return true;
            
            // Si condition remplie, appliquer la validation spécifiée
            return applyValidation(params.validation, value, params.validationParams, formValues);
        
        default:
            // Validation inconnue, considérer comme réussie
            return true;
    }
}

/**
 * Fonction simplifiée d'évaluation de condition
 * À remplacer par un vrai évaluateur d'expressions
 */
function evaluateCondition(condition: string, values: Record<string, any>): boolean {
    try {
        // ATTENTION: Ceci est dangereux en production!
        // À remplacer par un évaluateur sécurisé
        // eslint-disable-next-line no-new-func
        const evalFn = new Function(
            ...Object.keys(values),
            `return ${condition};`
        );
        return evalFn(...Object.values(values));
    } catch (e) {
        console.error('Erreur évaluation condition:', e);
        return false;
    }
}

/**
 * Génère un message d'erreur pour une validation échouée
 */
export function generateErrorMessage(
    type: string,
    fieldName: string,
    params?: Record<string, any>
): string {
    const fieldLabel = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
    
    switch (type) {
        case 'required':
            return `Le champ ${fieldLabel} est obligatoire`;
        
        case 'min_value':
            return `${fieldLabel} doit être supérieur ou égal à ${params?.value || 0}`;
        
        case 'max_value':
            return `${fieldLabel} doit être inférieur ou égal à ${params?.value || 0}`;
        
        case 'min_length':
            return `${fieldLabel} doit contenir au moins ${params?.length || 0} caractères`;
        
        case 'max_length':
            return `${fieldLabel} ne peut pas dépasser ${params?.length || 0} caractères`;
        
        case 'regex':
            return `${fieldLabel} n'est pas au format attendu`;
        
        case 'email':
            return `${fieldLabel} doit être une adresse email valide`;
        
        case 'phone':
            return `${fieldLabel} doit être un numéro de téléphone valide`;
        
        case 'iban':
            return `${fieldLabel} doit être un IBAN valide`;
        
        case 'vat':
            return `${fieldLabel} doit être un numéro de TVA valide`;
        
        case 'postal_code':
            return `${fieldLabel} doit être un code postal valide`;
        
        default:
            return `${fieldLabel} n'est pas valide`;
    }
}
