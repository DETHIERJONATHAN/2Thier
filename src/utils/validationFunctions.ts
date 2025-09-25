/**
 * Fonctions de validation pour le système CRM
 * Ces fonctions permettent de vérifier qu'une valeur est correcte/cohérente avant validation du champ
 */

/**
 * Vérifie qu'une valeur n'est pas vide
 * @param {any} value - La valeur à vérifier
 * @returns {boolean} true si la valeur est non vide, false sinon
 */
export function IS_REQUIRED(value: any): boolean {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
}

/**
 * Vérifie qu'une valeur est un nombre
 * @param {any} value - La valeur à vérifier
 * @returns {boolean} true si la valeur est un nombre, false sinon
 */
export function IS_NUMBER(value: any): boolean {
    if (typeof value === 'number' && !isNaN(value)) return true;
    if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return !isNaN(parsed) && isFinite(parsed);
    }
    return false;
}

/**
 * Vérifie qu'une valeur est du texte
 * @param {any} value - La valeur à vérifier
 * @returns {boolean} true si la valeur est du texte, false sinon
 */
export function IS_TEXT(value: any): boolean {
    return typeof value === 'string';
}

/**
 * Vérifie qu'une valeur est une date valide
 * @param {any} value - La valeur à vérifier
 * @returns {boolean} true si la valeur est une date valide, false sinon
 */
export function IS_DATE(value: any): boolean {
    if (value instanceof Date) return !isNaN(value.getTime());
    if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        return !isNaN(date.getTime());
    }
    return false;
}

/**
 * Vérifie qu'une valeur est un booléen
 * @param {any} value - La valeur à vérifier
 * @returns {boolean} true si la valeur est un booléen, false sinon
 */
export function IS_BOOLEAN(value: any): boolean {
    return typeof value === 'boolean' || value === 'true' || value === 'false';
}

/**
 * Vérifie qu'une valeur est une adresse email valide
 * @param {any} value - La valeur à vérifier
 * @returns {boolean} true si la valeur est une adresse email valide, false sinon
 */
export function IS_EMAIL(value: any): boolean {
    if (typeof value !== 'string') return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(value);
}

/**
 * Vérifie qu'une valeur est un numéro de téléphone valide
 * @param {any} value - La valeur à vérifier
 * @returns {boolean} true si la valeur est un numéro de téléphone valide, false sinon
 */
export function IS_PHONE(value: any): boolean {
    if (typeof value !== 'string') return false;
    // Accepte divers formats internationaux de numéros de téléphone
    const phoneRegex = /^(\+\d{1,3}[ -]?)?\(?\d{1,4}\)?[ -]?\d{1,4}[ -]?\d{1,4}[ -]?\d{1,9}$/;
    return phoneRegex.test(value);
}

/**
 * Vérifie qu'une valeur est un IBAN valide
 * @param {any} value - La valeur à vérifier
 * @returns {boolean} true si la valeur est un IBAN valide, false sinon
 */
export function IS_IBAN(value: any): boolean {
    if (typeof value !== 'string') return false;
    // Suppression des espaces et caractères spéciaux
    const iban = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    // Vérification de la longueur minimale
    if (iban.length < 15 || iban.length > 34) return false;
    
    // Vérification du code pays
    const countryCode = iban.substring(0, 2);
    if (!/^[A-Z]{2}$/.test(countryCode)) return false;
    
    // Vérification simple du format (pourrait être améliorée avec une bibliothèque dédiée)
    const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;
    return ibanRegex.test(iban);
}

/**
 * Vérifie qu'une valeur est un numéro de TVA valide
 * @param {any} value - La valeur à vérifier
 * @param {string} country - Le code pays (FR, BE, DE, etc.)
 * @returns {boolean} true si la valeur est un numéro de TVA valide, false sinon
 */
export function IS_TVA(value: any, country: string = 'FR'): boolean {
    if (typeof value !== 'string') return false;
    
    // Format de base: code pays + chiffres
    const vatRegex: Record<string, RegExp> = {
        'FR': /^FR[0-9A-Z]{2}[0-9]{9}$/,
        'BE': /^BE0[0-9]{9}$/,
        'LU': /^LU[0-9]{8}$/,
        'DE': /^DE[0-9]{9}$/,
        'ES': /^ES[A-Z0-9]{1}[0-9]{7}[A-Z0-9]{1}$/,
        'IT': /^IT[0-9]{11}$/,
        'NL': /^NL[0-9]{9}B[0-9]{2}$/,
        'UK': /^GB([0-9]{9}([0-9]{3})?|[A-Z]{2}[0-9]{3})$/
    };
    
    // Utiliser le regex correspondant au pays ou un regex générique
    const regex = vatRegex[country] || /^[A-Z]{2}[0-9A-Z]{2,12}$/;
    return regex.test(value.toUpperCase());
}

/**
 * Vérifie qu'une valeur est un code postal valide selon le pays
 * @param {any} value - La valeur à vérifier
 * @param {string} country - Le code pays (FR, BE, DE, etc.)
 * @returns {boolean} true si la valeur est un code postal valide, false sinon
 */
export function IS_POSTAL_CODE(value: any, country: string = 'FR'): boolean {
    if (typeof value !== 'string' && typeof value !== 'number') return false;
    
    const postalValue = String(value).trim();
    
    const postalRegex: Record<string, RegExp> = {
        'FR': /^(?:0[1-9]|[1-8]\d|9[0-8])\d{3}$/,  // France: 5 chiffres (01000-98999)
        'BE': /^[1-9]\d{3}$/,                       // Belgique: 4 chiffres (1000-9999)
        'LU': /^[1-9]\d{3}$/,                       // Luxembourg: 4 chiffres
        'DE': /^[0-9]{5}$/,                         // Allemagne: 5 chiffres
        'CH': /^[1-9]\d{3}$/,                       // Suisse: 4 chiffres
        'US': /^\d{5}(-\d{4})?$/,                   // USA: 5 chiffres + optionnel 4 chiffres
        'UK': /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i // UK: format complexe
    };
    
    // Utiliser le regex correspondant au pays ou un regex générique
    const regex = postalRegex[country] || /^[0-9A-Z]{3,10}$/i;
    return regex.test(postalValue);
}

/**
 * Vérifie qu'une valeur est comprise entre deux bornes incluses
 * @param {number} value - La valeur à vérifier
 * @param {number} min - La borne inférieure
 * @param {number} max - La borne supérieure
 * @returns {boolean} true si la valeur est entre min et max (inclus), false sinon
 */
export function BETWEEN(value: any, min: any, max: any): boolean {
    const numValue = Number(value);
    const numMin = Number(min);
    const numMax = Number(max);
    
    if (isNaN(numValue) || isNaN(numMin) || isNaN(numMax)) return false;
    
    return numValue >= numMin && numValue <= numMax;
}

/**
 * Calcule la longueur d'une valeur
 * @param {any} value - La valeur dont on veut calculer la longueur
 * @returns {number} La longueur de la valeur
 */
export function LENGTH(value: any): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'string') return value.length;
    if (Array.isArray(value)) return value.length;
    if (typeof value === 'object') return Object.keys(value).length;
    return String(value).length;
}

/**
 * Vérifie si une valeur est null ou undefined
 * @param {any} value - La valeur à vérifier
 * @returns {boolean} true si la valeur est null ou undefined, false sinon
 */
export function IS_NULL(value: any): boolean {
    return value === null || value === undefined;
}

/**
 * Vérifie si une valeur est vide (chaîne vide, tableau vide, objet sans propriétés, null, undefined)
 * @param {any} value - La valeur à vérifier
 * @returns {boolean} true si la valeur est vide, false sinon
 */
export function IS_EMPTY(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
}

/**
 * Vérifie si une valeur est présente dans une liste
 * @param {any} value - La valeur à rechercher
 * @param {Array} list - La liste dans laquelle rechercher
 * @returns {boolean} true si la valeur est dans la liste, false sinon
 */
export function IN(value: any, list: any[]): boolean {
    if (!Array.isArray(list)) return false;
    return list.includes(value);
}

/**
 * Vérifie si une valeur n'est pas présente dans une liste
 * @param {any} value - La valeur à rechercher
 * @param {Array} list - La liste dans laquelle rechercher
 * @returns {boolean} true si la valeur n'est pas dans la liste, false sinon
 */
export function NOT_IN(value: any, list: any[]): boolean {
    return !IN(value, list);
}

/**
 * Vérifie si une valeur correspond à un motif d'expression régulière
 * @param {string} value - La valeur à vérifier
 * @param {string|RegExp} pattern - Le motif d'expression régulière
 * @returns {boolean} true si la valeur correspond au motif, false sinon
 */
export function MATCH(value: any, pattern: string | RegExp): boolean {
    if (typeof value !== 'string') return false;
    
    let regex: RegExp;
    if (pattern instanceof RegExp) {
        regex = pattern;
    } else if (typeof pattern === 'string') {
        try {
            // Extraire le motif et les drapeaux si présents (ex: /pattern/gi)
            const match = pattern.match(/^\/(.*)\/([gimsuy]*)$/);
            if (match) {
                regex = new RegExp(match[1], match[2]);
            } else {
                regex = new RegExp(pattern);
            }
        } catch (e) {
            console.error('Motif d\'expression régulière invalide:', e);
            return false;
        }
    } else {
        return false;
    }
    
    return regex.test(value);
}
