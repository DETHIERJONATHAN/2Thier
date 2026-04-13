import React, { useCallback, memo } from 'react';
import type { Validation } from "../../types/validation";
import { getAPIHeaders } from '../../utils/validationHelper';
import { logger } from '../../lib/logger';

// Liste des types de validations disponibles
const VALIDATIONS = [
    // Vérifications de valeur simple
    { 
        value: 'required', 
        label: 'Obligatoire',
        category: 'simple', 
        description: 'Vérifie que le champ n\'est pas vide',
        example: 'Le champ nom doit être rempli',
        function: 'IS_REQUIRED(valeur)'
    },
    { 
        value: 'min_value', 
        label: 'Valeur Min',
        category: 'simple', 
        description: 'Vérifie qu\'une valeur numérique est supérieure ou égale à un minimum',
        example: 'Le prix doit être supérieur ou égal à 0',
        function: 'valeur >= min'
    },
    { 
        value: 'max_value', 
        label: 'Valeur Max',
        category: 'simple', 
        description: 'Vérifie qu\'une valeur numérique est inférieure ou égale à un maximum',
        example: 'La quantité doit être inférieure ou égale à 100',
        function: 'valeur <= max'
    },
    { 
        value: 'between', 
        label: 'Entre',
        category: 'simple', 
        description: 'Vérifie qu\'une valeur est comprise entre deux bornes',
        example: 'La température doit être entre 15 et 30 degrés',
        function: 'BETWEEN(valeur, min, max)'
    },
    { 
        value: 'compare_fields', 
        label: 'Comparer Champs',
        category: 'simple', 
        description: 'Compare la valeur avec celle d\'un autre champ',
        example: 'La date de fin doit être postérieure à la date de début',
        function: 'valeur1 OPERATOR valeur2'
    },
    { 
        value: 'min_length', 
        label: 'Longueur Min',
        category: 'simple', 
        description: 'Vérifie que la longueur du texte est supérieure ou égale à un minimum',
        example: 'Le mot de passe doit contenir au moins 8 caractères',
        function: 'LENGTH(valeur) >= min_length'
    },
    { 
        value: 'max_length', 
        label: 'Longueur Max',
        category: 'simple', 
        description: 'Vérifie que la longueur du texte est inférieure ou égale à un maximum',
        example: 'La description ne doit pas dépasser 500 caractères',
        function: 'LENGTH(valeur) <= max_length'
    },
    
    // Vérifications de type
    { 
        value: 'is_number', 
        label: 'Est un nombre',
        category: 'type', 
        description: 'Vérifie que la valeur est un nombre valide',
        example: '42, 3.14, -5',
        function: 'IS_NUMBER(valeur)'
    },
    { 
        value: 'is_text', 
        label: 'Est du texte',
        category: 'type', 
        description: 'Vérifie que la valeur est une chaîne de texte',
        example: 'Tout texte',
        function: 'IS_TEXT(valeur)'
    },
    { 
        value: 'is_date', 
        label: 'Est une date',
        category: 'type', 
        description: 'Vérifie que la valeur est une date valide',
        example: '14/07/2025',
        function: 'IS_DATE(valeur)'
    },
    { 
        value: 'is_boolean', 
        label: 'Est un booléen',
        category: 'type', 
        description: 'Vérifie que la valeur est un booléen (vrai/faux)',
        example: 'true, false',
        function: 'IS_BOOLEAN(valeur)'
    },
    
    // Tests logiques
    { 
        value: 'is_null', 
        label: 'Est null',
        category: 'logique', 
        description: 'Vérifie si la valeur est null',
        example: 'Le champ doit être explicitement null',
        function: 'IS_NULL(valeur)'
    },
    { 
        value: 'is_empty', 
        label: 'Est vide',
        category: 'logique', 
        description: 'Vérifie si la valeur est vide (chaîne vide, tableau vide, etc.)',
        example: 'Le champ ne doit contenir aucune valeur',
        function: 'IS_EMPTY(valeur)'
    },
    { 
        value: 'in_list', 
        label: 'Dans la liste',
        category: 'logique', 
        description: 'Vérifie si la valeur est présente dans une liste de valeurs autorisées',
        example: 'Le statut doit être "En cours", "Terminé" ou "En attente"',
        function: 'IN(valeur, liste_autorisée)'
    },
    { 
        value: 'not_in_list', 
        label: 'Pas dans la liste',
        category: 'logique', 
        description: 'Vérifie que la valeur n\'est pas dans une liste de valeurs interdites',
        example: 'Le mot de passe ne doit pas contenir de mots interdits',
        function: 'NOT_IN(valeur, liste_interdite)'
    },
    
    // Vérifications de format
    { 
        value: 'regex', 
        label: 'Regex',
        category: 'format', 
        description: 'Vérifie que la valeur correspond à un motif d\'expression régulière',
        example: 'Format: lettres, chiffres et tirets uniquement',
        function: 'MATCH(valeur, pattern)'
    },
    { 
        value: 'email', 
        label: 'Email',
        category: 'format', 
        description: 'Vérifie que la valeur est une adresse email valide',
        example: 'exemple@domaine.com',
        function: 'IS_EMAIL(valeur)'
    },
    { 
        value: 'phone', 
        label: 'Téléphone',
        category: 'format', 
        description: 'Vérifie que la valeur est un numéro de téléphone valide',
        example: '+33 6 12 34 56 78',
        function: 'IS_PHONE(valeur)'
    },
    { 
        value: 'iban', 
        label: 'IBAN',
        category: 'format', 
        description: 'Vérifie que la valeur est un numéro IBAN valide',
        example: 'FR76 3000 6000 0112 3456 7890 189',
        function: 'IS_IBAN(valeur)'
    },
    { 
        value: 'vat', 
        label: 'TVA',
        category: 'format', 
        description: 'Vérifie que la valeur est un numéro de TVA valide',
        example: 'FR12345678901',
        function: 'IS_TVA(valeur, pays)'
    },
    { 
        value: 'postal_code', 
        label: 'Code Postal',
        category: 'format', 
        description: 'Vérifie que la valeur est un code postal valide selon le pays sélectionné',
        example: '75001 (France) ou 1000 (Belgique)',
        function: 'IS_POSTAL_CODE(valeur, pays)'
    },
    
    // Validation conditionnelle
    { 
        value: 'conditional', 
        label: 'Conditionnelle',
        category: 'advanced', 
        description: 'Applique une validation uniquement si une condition est remplie',
        example: 'Si Pays = Belgique, alors Code postal = 4 chiffres'
    },
    
    // Valeurs interdites
    { 
        value: 'blacklist', 
        label: 'Liste noire',
        category: 'advanced', 
        description: 'Vérifie que la valeur ne figure pas dans une liste de valeurs interdites',
        example: 'Le mot de passe ne doit pas contenir "password", "123456", etc.'
    },
    
    // Multi-champ
    { 
        value: 'cross_field', 
        label: 'Multi-champ',
        category: 'advanced', 
        description: 'Validation qui implique plusieurs champs en même temps',
        example: 'Montant payé doit être inférieur ou égal au total dû'
    },
];

interface ValidationsPaletteProps {
    validationId?: string;
    fieldId?: string;
    onAddValidation?: (type: string) => void;
}

/**
 * Palette de validations disponibles
 */
const ValidationsPalette = memo(({ validationId, fieldId, onAddValidation }: ValidationsPaletteProps) => {
    const handleAddValidation = useCallback((validationType: string) => {
        if (!fieldId) {
            logger.error(`[ValidationsPalette] ❌ Impossible d'ajouter la validation: fieldId manquant`);
            return;
        }
        
        logger.debug(`[ValidationsPalette] ➕ Ajout de la validation "${validationType}" pour le champ ${fieldId}`);
        
        // Si un callback est fourni, l'utiliser
        if (onAddValidation) {
            onAddValidation(validationType);
            return;
        }
        
        // Sinon, créer directement via l'API
        // Utiliser les headers standard
        const headers = getAPIHeaders();
        
        // Créer une nouvelle validation via l'API
        fetch(`/api/validations`, {
            method: 'POST', 
            headers,
            body: JSON.stringify({
                fieldId,
                type: validationType,
                message: `Validation ${validationType}`,
                active: true
            })
        })
        .then(response => {
            if (response.ok) {
                logger.debug(`[ValidationsPalette] ✅ Validation créée avec succès`);
                // Forcer le rechargement des validations
                setTimeout(() => {
                    // Déclencher un événement personnalisé pour informer le parent
                    const event = new CustomEvent('validation-updated', { 
                        detail: { fieldId: fieldId, success: true } 
                    });
                    document.dispatchEvent(event);
                }, 300);
            } else {
                logger.error(`[ValidationsPalette] ❌ Échec de la création de la validation: ${response.statusText}`);
            }
        })
        .catch(error => {
            logger.error(`[ValidationsPalette] ❌ Erreur lors de la création de la validation:`, error);
        });
    }, [fieldId, onAddValidation]);
    
    // Regrouper les validations par catégorie
    const simpleValidations = VALIDATIONS.filter(val => val.category === 'simple');
    const typeValidations = VALIDATIONS.filter(val => val.category === 'type');
    const logiqueValidations = VALIDATIONS.filter(val => val.category === 'logique');
    const formatValidations = VALIDATIONS.filter(val => val.category === 'format');
    const advancedValidations = VALIDATIONS.filter(val => val.category === 'advanced');
    
    return (
        <div className="mt-2 p-2 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm font-semibold mb-3 text-blue-700">Types de validation</p>
            
            {/* Vérifications de valeur simple */}
            <div className="mb-4">
                <p className="text-xs font-medium text-gray-700 mb-2 border-b border-gray-200 pb-1">🎯 Vérifications de valeur simple</p>
                <div className="flex flex-wrap gap-2">
                    {simpleValidations.map((validation) => (
                        <div key={validation.value} className="relative group">
                            <button
                                type="button"
                                className="px-2 py-1 bg-green-100 border border-green-300 rounded text-xs hover:bg-green-200 text-green-800 shadow-sm"
                                onClick={() => handleAddValidation(validation.value)}
                                draggable="true"
                                title={validation.label}
                                onDragStart={(e) => {
                                    logger.debug(`[VALIDATION_DRAG] Starting drag for validation: ${validation.value}`);
                                    // Format standard pour être compatible avec ValidationZone
                                    const data = {
                                        type: 'validation',
                                        id: validation.value,
                                        value: validation.value,
                                        label: validation.label,
                                        category: validation.category
                                    };
                                    e.dataTransfer.setData('application/json', JSON.stringify(data));
                                    e.dataTransfer.setData('validation-type', validation.value);
                                    e.dataTransfer.setData('validation-label', validation.label);
                                    e.dataTransfer.setData('element-type', 'validation');
                                    e.dataTransfer.setData('text/plain', validation.value);
                                    e.dataTransfer.effectAllowed = 'copy';
                                }}
                            >
                                {validation.label}
                            </button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 max-w-xs pointer-events-none z-10 shadow-lg">
                                <p className="font-bold mb-1 text-green-300">{validation.label}</p>
                                <p className="mb-2">{validation.description}</p>
                                <p className="text-gray-300 italic text-xs">Exemple: {validation.example}</p>
                                {validation.function && (
                                    <p className="mt-1 text-amber-300 font-mono text-xs">{validation.function}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Vérifications de type */}
            <div className="mb-4">
                <p className="text-xs font-medium text-gray-700 mb-2 border-b border-gray-200 pb-1">🔍 Vérifications de type</p>
                <div className="flex flex-wrap gap-2">
                    {typeValidations.map((validation) => (
                        <div key={validation.value} className="relative group">
                            <button
                                type="button"
                                className="px-2 py-1 bg-blue-100 border border-blue-300 rounded text-xs hover:bg-blue-200 text-blue-800 shadow-sm"
                                onClick={() => handleAddValidation(validation.value)}
                                draggable="true"
                                title={validation.label}
                                onDragStart={(e) => {
                                    logger.debug(`[VALIDATION_DRAG] Starting drag for validation: ${validation.value}`);
                                    const data = {
                                        type: 'validation',
                                        id: validation.value,
                                        value: validation.value,
                                        label: validation.label,
                                        category: validation.category
                                    };
                                    e.dataTransfer.setData('application/json', JSON.stringify(data));
                                    e.dataTransfer.setData('validation-type', validation.value);
                                    e.dataTransfer.setData('validation-label', validation.label);
                                    e.dataTransfer.setData('element-type', 'validation');
                                    e.dataTransfer.setData('text/plain', validation.value);
                                    e.dataTransfer.effectAllowed = 'copy';
                                }}
                            >
                                {validation.label}
                            </button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 max-w-xs pointer-events-none z-10 shadow-lg">
                                <p className="font-bold mb-1 text-blue-300">{validation.label}</p>
                                <p className="mb-2">{validation.description}</p>
                                <p className="text-gray-300 italic text-xs">Exemple: {validation.example}</p>
                                {validation.function && (
                                    <p className="mt-1 text-amber-300 font-mono text-xs">{validation.function}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Tests logiques */}
            <div className="mb-4">
                <p className="text-xs font-medium text-gray-700 mb-2 border-b border-gray-200 pb-1">🕹️ Tests logiques</p>
                <div className="flex flex-wrap gap-2">
                    {logiqueValidations.map((validation) => (
                        <div key={validation.value} className="relative group">
                            <button
                                type="button"
                                className="px-2 py-1 bg-orange-100 border border-orange-300 rounded text-xs hover:bg-orange-200 text-orange-800 shadow-sm"
                                onClick={() => handleAddValidation(validation.value)}
                                draggable="true"
                                title={validation.label}
                                onDragStart={(e) => {
                                    logger.debug(`[VALIDATION_DRAG] Starting drag for validation: ${validation.value}`);
                                    const data = {
                                        type: 'validation',
                                        id: validation.value,
                                        value: validation.value,
                                        label: validation.label,
                                        category: validation.category
                                    };
                                    e.dataTransfer.setData('application/json', JSON.stringify(data));
                                    e.dataTransfer.setData('validation-type', validation.value);
                                    e.dataTransfer.setData('validation-label', validation.label);
                                    e.dataTransfer.setData('element-type', 'validation');
                                    e.dataTransfer.setData('text/plain', validation.value);
                                    e.dataTransfer.effectAllowed = 'copy';
                                }}
                            >
                                {validation.label}
                            </button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 max-w-xs pointer-events-none z-10 shadow-lg">
                                <p className="font-bold mb-1 text-orange-300">{validation.label}</p>
                                <p className="mb-2">{validation.description}</p>
                                <p className="text-gray-300 italic text-xs">Exemple: {validation.example}</p>
                                {validation.function && (
                                    <p className="mt-1 text-amber-300 font-mono text-xs">{validation.function}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Vérifications de format */}
            <div className="mb-4">
                <p className="text-xs font-medium text-gray-700 mb-2 border-b border-gray-200 pb-1">🔒 Vérifications de format</p>
                <div className="flex flex-wrap gap-2">
                    {formatValidations.map((validation) => (
                        <div key={validation.value} className="relative group">
                            <button
                                type="button"
                                className="px-2 py-1 bg-purple-100 border border-purple-300 rounded text-xs hover:bg-purple-200 text-purple-800 shadow-sm"
                                onClick={() => handleAddValidation(validation.value)}
                                draggable="true"
                                title={validation.label}
                                onDragStart={(e) => {
                                    logger.debug(`[VALIDATION_DRAG] Starting drag for validation: ${validation.value}`);
                                    // Format standard pour être compatible avec ValidationZone
                                    const data = {
                                        type: 'validation',
                                        id: validation.value,
                                        value: validation.value,
                                        label: validation.label,
                                        category: validation.category
                                    };
                                    e.dataTransfer.setData('application/json', JSON.stringify(data));
                                    e.dataTransfer.setData('validation-type', validation.value);
                                    e.dataTransfer.setData('validation-label', validation.label);
                                    e.dataTransfer.setData('element-type', 'validation');
                                    e.dataTransfer.setData('text/plain', validation.value);
                                    e.dataTransfer.effectAllowed = 'copy';
                                }}
                            >
                                {validation.label}
                            </button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 max-w-xs pointer-events-none z-10 shadow-lg">
                                <p className="font-bold mb-1 text-purple-300">{validation.label}</p>
                                <p className="mb-2">{validation.description}</p>
                                <p className="text-gray-300 italic text-xs">Exemple: {validation.example}</p>
                                {validation.function && (
                                    <p className="mt-1 text-amber-300 font-mono text-xs">{validation.function}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Validations avancées */}
            <div className="mb-2">
                <p className="text-xs font-medium text-gray-700 mb-2 border-b border-gray-200 pb-1">🔗 Validations avancées</p>
                <div className="flex flex-wrap gap-2">
                    {advancedValidations.map((validation) => (
                        <div key={validation.value} className="relative group">
                            <button
                                type="button"
                                className="px-2 py-1 bg-red-100 border border-red-300 rounded text-xs hover:bg-red-200 text-red-800 shadow-sm"
                                onClick={() => handleAddValidation(validation.value)}
                                draggable="true"
                                title={validation.label}
                                onDragStart={(e) => {
                                    logger.debug(`[VALIDATION_DRAG] Starting drag for validation: ${validation.value}`);
                                    // Format standard pour être compatible avec ValidationZone
                                    const data = {
                                        type: 'validation',
                                        id: validation.value,
                                        value: validation.value,
                                        label: validation.label,
                                        category: validation.category
                                    };
                                    e.dataTransfer.setData('application/json', JSON.stringify(data));
                                    e.dataTransfer.setData('validation-type', validation.value);
                                    e.dataTransfer.setData('validation-label', validation.label);
                                    e.dataTransfer.setData('element-type', 'validation');
                                    e.dataTransfer.setData('text/plain', validation.value);
                                    e.dataTransfer.effectAllowed = 'copy';
                                }}
                            >
                                {validation.label}
                            </button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 max-w-xs pointer-events-none z-10 shadow-lg">
                                <p className="font-bold mb-1 text-red-300">{validation.label}</p>
                                <p className="mb-2">{validation.description}</p>
                                <p className="text-gray-300 italic text-xs">Exemple: {validation.example}</p>
                                {validation.function && (
                                    <p className="mt-1 text-amber-300 font-mono text-xs">{validation.function}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

export default ValidationsPalette;
