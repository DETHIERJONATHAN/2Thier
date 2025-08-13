import React, { useCallback, memo } from 'react';
import type { Formula } from "../../store/slices/types";
import { validateFormula, prepareFormulaForAPI, getAPIHeaders } from '../../utils/formulaValidator';

// Liste des fonctions avancées
const FUNCTIONS = [
    // Fonctions conditionnelles
    { value: 'IF(condition, alors, sinon)', label: 'IF', description: 'Évalue une condition et renvoie une valeur si vraie, une autre si fausse' },
    { value: 'SWITCH(valeur, cas1, résultat1, ...)', label: 'SWITCH', description: 'Compare une valeur à plusieurs cas et renvoie le résultat correspondant' },
    { value: 'CASE(condition1, valeur1, condition2, valeur2, ..., défaut)', label: 'CASE', description: 'Évalue plusieurs conditions dans l\'ordre et renvoie la valeur correspondant à la première vraie' },
    { value: 'IFS(condition1, valeur1, condition2, valeur2, ..., défaut)', label: 'IFS', description: 'Version avancée de IF permettant d\'évaluer plusieurs conditions en séquence' },
    
    // Fonctions mathématiques
    { value: 'ROUND(valeur, décimales)', label: 'ROUND', description: 'Arrondit un nombre au nombre de décimales spécifié' },
    { value: 'MIN(valeur1, valeur2, ...)', label: 'MIN', description: 'Renvoie la plus petite valeur parmi les arguments' },
    { value: 'MAX(valeur1, valeur2, ...)', label: 'MAX', description: 'Renvoie la plus grande valeur parmi les arguments' },
    { value: 'SUM(liste)', label: 'SUM', description: 'Calcule la somme des valeurs dans une liste' },
    { value: 'AVERAGE(liste)', label: 'AVERAGE', description: 'Calcule la moyenne des valeurs dans une liste' },
    { value: 'ABS(valeur)', label: 'ABS', description: 'Renvoie la valeur absolue d\'un nombre' },
    { value: 'CEILING(valeur, précision)', label: 'CEILING', description: 'Arrondit un nombre à l\'entier supérieur ou au multiple spécifié' },
    { value: 'FLOOR(valeur, précision)', label: 'FLOOR', description: 'Arrondit un nombre à l\'entier inférieur ou au multiple spécifié' },
    { value: 'POWER(base, exposant)', label: 'POWER', description: 'Élève un nombre à la puissance spécifiée' },
    { value: 'SQRT(valeur)', label: 'SQRT', description: 'Calcule la racine carrée d\'un nombre' },
    
    // Fonctions de texte
    { value: 'LENGTH(texte)', label: 'LENGTH', description: 'Renvoie le nombre de caractères dans une chaîne de texte' },
    { value: 'CONCAT(valeurs...)', label: 'CONCAT', description: 'Concatène (joint) plusieurs chaînes de texte' },
    { value: 'UPPER(texte)', label: 'UPPER', description: 'Convertit un texte en majuscules' },
    { value: 'LOWER(texte)', label: 'LOWER', description: 'Convertit un texte en minuscules' },
    { value: 'TRIM(texte)', label: 'TRIM', description: 'Supprime les espaces au début et à la fin d\'un texte' },
    { value: 'SUBSTRING(texte, début, longueur)', label: 'SUBSTRING', description: 'Extrait une partie d\'une chaîne de texte' },
    { value: 'REPLACE(texte, ancien, nouveau)', label: 'REPLACE', description: 'Remplace toutes les occurrences d\'un texte par un autre' },
    
    // Fonctions de date
    { value: 'NOW()', label: 'NOW', description: 'Renvoie la date et l\'heure actuelles' },
    { value: 'DATE_DIFF(date1, date2)', label: 'DATE_DIFF', description: 'Calcule la différence entre deux dates en jours' },
    { value: 'TODAY()', label: 'TODAY', description: 'Renvoie la date du jour (sans l\'heure)' },
    { value: 'FORMAT_DATE(date, format)', label: 'FORMAT_DATE', description: 'Formate une date selon le modèle spécifié' },
    { value: 'ADD_DAYS(date, jours)', label: 'ADD_DAYS', description: 'Ajoute un nombre de jours à une date' },
    { value: 'ADD_MONTHS(date, mois)', label: 'ADD_MONTHS', description: 'Ajoute un nombre de mois à une date' },
    { value: 'YEAR(date)', label: 'YEAR', description: 'Extrait l\'année d\'une date' },
    { value: 'MONTH(date)', label: 'MONTH', description: 'Extrait le mois d\'une date' },
    { value: 'DAY(date)', label: 'DAY', description: 'Extrait le jour d\'une date' },
    
    // Fonctions de vérification
    { value: 'IS_EMPTY(champ)', label: 'IS_EMPTY', description: 'Vérifie si un champ est vide (null, undefined, chaîne vide)' },
    { value: 'IS_NULL(valeur)', label: 'IS_NULL', description: 'Vérifie si une valeur est null ou undefined' },
    { value: 'IS_NUMBER(valeur)', label: 'IS_NUMBER', description: 'Vérifie si une valeur est un nombre' },
    { value: 'IS_TEXT(valeur)', label: 'IS_TEXT', description: 'Vérifie si une valeur est une chaîne de texte' },
    { value: 'IS_BOOLEAN(valeur)', label: 'IS_BOOLEAN', description: 'Vérifie si une valeur est un booléen (vrai/faux)' },
    { value: 'IS_DATE(valeur)', label: 'IS_DATE', description: 'Vérifie si une valeur est une date valide' },
    
    // Fonctions de recherche et d'agrégation
    { value: 'LOOKUP(table, clé)', label: 'LOOKUP', description: 'Recherche une valeur dans une table de référence à partir d\'une clé' },
    { value: 'INDEX(liste, position)', label: 'INDEX', description: 'Renvoie l\'élément à une position spécifique dans une liste' },
    { value: 'FILTER(liste, condition)', label: 'FILTER', description: 'Filtre une liste selon une condition' },
    { value: 'COUNT(liste)', label: 'COUNT', description: 'Compte le nombre d\'éléments dans une liste' },
    { value: 'IN(valeur, liste)', label: 'IN', description: 'Vérifie si une valeur existe dans une liste' },
    { value: 'DISTINCT(liste)', label: 'DISTINCT', description: 'Renvoie les valeurs uniques d\'une liste' },
    
    // Constantes et valeurs
    { value: 'TRUE()', label: 'TRUE', description: 'Renvoie la valeur booléenne vrai' },
    { value: 'FALSE()', label: 'FALSE', description: 'Renvoie la valeur booléenne faux' },
    { value: 'NULL()', label: 'NULL', description: 'Renvoie une valeur nulle' },
    { value: 'BLANK()', label: 'BLANK', description: 'Renvoie une valeur vide' },
    { value: 'PI()', label: 'PI', description: 'Renvoie la valeur de π (pi)' },
    { value: 'E()', label: 'E', description: 'Renvoie la valeur de e (nombre d\'Euler)' },
];

interface FunctionsPaletteProps {
    formulaId: string | undefined;
    formula?: Formula;
}

/**
 * Palette de fonctions avancées pour les formules
 */
const FunctionsPalette = memo(({ formulaId, formula }: FunctionsPaletteProps) => {
    const addFunctionToFormula = useCallback((functionValue: string) => {
        if (!formulaId) {
            console.error(`[FunctionsPalette] ❌ Impossible d'ajouter la fonction: formulaId manquant`);
            return;
        }
        
        console.log(`[FunctionsPalette] ➕ Ajout de la fonction "${functionValue}" à la formule ${formulaId}`);
        
        // Valider la formule actuelle
        if (!formula) {
            console.error(`[FunctionsPalette] ❌ Impossible d'ajouter la fonction: objet formula manquant`);
            return;
        }
        
        const validation = validateFormula(formula, 'FunctionsPalette');
        if (!validation.isValid) {
            console.error(`[FunctionsPalette] ❌ Validation de la formule échouée: ${validation.message}`, validation.details);
            return;
        }
        
        // Créer l'élément de fonction
        const newFunction = {
            type: 'function' as const,
            id: `function-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            value: functionValue,
            label: functionValue.split('(')[0]
        };
        
        // Utiliser les headers standard
        const headers = getAPIHeaders();
        
        // Construire la nouvelle séquence
        const currentSequence = (formula && Array.isArray(formula.sequence)) ? formula.sequence : [];
        
        // S'assurer que tous les éléments de la séquence ont un ID valide
        const validatedSequence = currentSequence.map(item => {
            if (!item.id) {
                return {
                    ...item,
                    id: `auto-fix-${item.type || 'item'}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
                };
            }
            return item;
        });
        
        const newSequence = [...validatedSequence, newFunction];
        
        console.log(`[FunctionsPalette] 📊 Ajout de la fonction à la séquence: ${currentSequence.length} => ${newSequence.length} items`);
        
        // Préparer la formule pour l'API et effectuer des corrections automatiques si nécessaire
        const preparedFormula = prepareFormulaForAPI({
            ...formula,
            sequence: newSequence as any // Cast pour résoudre le problème de compatibilité entre les différents types FormulaItem
        }, 'FunctionsPalette');
        
        // Mettre à jour directement via l'API avec la formule validée et préparée
        fetch(`/api/formulas/${formulaId}`, {
            method: 'PUT', 
            headers,
            body: JSON.stringify({
                id: formulaId,
                name: formula.name || "Nouvelle formule",
                sequence: preparedFormula.sequence
            })
        })
        .then(response => {
            if (response.ok) {
                console.log(`[FunctionsPalette] ✅ Formule mise à jour via API directe`);
                // Forcer le rechargement des formules
                setTimeout(() => {
                    // Déclencher un événement personnalisé pour informer le parent
                    const event = new CustomEvent('formula-updated', { 
                        detail: { formulaId: formulaId, success: true } 
                    });
                    document.dispatchEvent(event);
                }, 300);
            } else {
                console.error(`[FunctionsPalette] ❌ Échec de la mise à jour via API: ${response.statusText}`);
            }
        })
        .catch(error => {
            console.error(`[FunctionsPalette] ❌ Erreur lors de la mise à jour via API:`, error);
        });
    }, [formulaId, formula]);
    
    return (
        <div className="mt-2 p-2 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm font-medium mb-2">Fonctions avancées:</p>
            
            {/* Fonctions conditionnelles */}
            <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Conditionnelles:</p>
                <div className="flex flex-wrap gap-1">
                    {FUNCTIONS.filter(f => 
                        f.value.startsWith('IF') || 
                        f.value.startsWith('SWITCH') || 
                        f.value.startsWith('CASE') ||
                        f.value.startsWith('IFS')
                    ).map((func) => (
                        <div key={func.value} className="relative group">
                            <button
                                type="button"
                                className="px-2 py-1 bg-blue-100 border border-blue-300 rounded text-sm hover:bg-blue-200 text-blue-800"
                                onClick={() => addFunctionToFormula(func.value)}
                                draggable="true"
                                title={func.value}
                                onDragStart={(e) => {
                                    console.log(`[FUNCTION_DRAG] Starting drag for function: ${func.value}`);
                                    e.dataTransfer.setData('function-value', func.value);
                                    e.dataTransfer.setData('function-label', func.label);
                                    e.dataTransfer.setData('formula-element-type', 'function');
                                    e.dataTransfer.setData('text/plain', func.value);
                                    e.dataTransfer.effectAllowed = 'copy';
                                    
                                    document.querySelectorAll('.formula-drop-zone').forEach(el => {
                                        el.classList.add('drop-target-highlight');
                                    });
                                }}
                            >
                                {func.label}
                            </button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 max-w-xs pointer-events-none z-10">
                                <p className="font-bold mb-1">{func.label}: {func.value}</p>
                                <p>{func.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Fonctions mathématiques */}
            <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Mathématiques:</p>
                <div className="flex flex-wrap gap-1">
                    {FUNCTIONS.filter(f => 
                        ['ROUND', 'MIN', 'MAX', 'SUM', 'AVERAGE', 'ABS', 'CEILING', 'FLOOR', 'POWER', 'SQRT'].includes(f.label)
                    ).map((func) => (
                        <div key={func.value} className="relative group">
                            <button
                                type="button"
                                className="px-2 py-1 bg-green-100 border border-green-300 rounded text-sm hover:bg-green-200 text-green-800"
                                onClick={() => addFunctionToFormula(func.value)}
                                draggable="true"
                                title={func.value}
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('function-value', func.value);
                                    e.dataTransfer.setData('function-label', func.label);
                                    e.dataTransfer.setData('formula-element-type', 'function');
                                    e.dataTransfer.setData('text/plain', func.value);
                                    e.dataTransfer.effectAllowed = 'copy';
                                    
                                    document.querySelectorAll('.formula-drop-zone').forEach(el => {
                                        el.classList.add('drop-target-highlight');
                                    });
                                }}
                            >
                                {func.label}
                            </button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 max-w-xs pointer-events-none z-10">
                                <p className="font-bold mb-1">{func.label}: {func.value}</p>
                                <p>{func.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Fonctions de texte */}
            <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Texte:</p>
                <div className="flex flex-wrap gap-1">
                    {FUNCTIONS.filter(f => 
                        ['LENGTH', 'CONCAT', 'UPPER', 'LOWER', 'TRIM', 'SUBSTRING', 'REPLACE'].includes(f.label)
                    ).map((func) => (
                        <div key={func.value} className="relative group">
                            <button
                                type="button"
                                className="px-2 py-1 bg-purple-100 border border-purple-300 rounded text-sm hover:bg-purple-200 text-purple-800"
                                onClick={() => addFunctionToFormula(func.value)}
                                draggable="true"
                                title={func.value}
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('function-value', func.value);
                                    e.dataTransfer.setData('function-label', func.label);
                                    e.dataTransfer.setData('formula-element-type', 'function');
                                    e.dataTransfer.setData('text/plain', func.value);
                                    e.dataTransfer.effectAllowed = 'copy';
                                    
                                    document.querySelectorAll('.formula-drop-zone').forEach(el => {
                                        el.classList.add('drop-target-highlight');
                                    });
                                }}
                            >
                                {func.label}
                            </button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 max-w-xs pointer-events-none z-10">
                                <p className="font-bold mb-1">{func.label}: {func.value}</p>
                                <p>{func.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Fonctions de date */}
            <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Date et heure:</p>
                <div className="flex flex-wrap gap-1">
                    {FUNCTIONS.filter(f => 
                        ['NOW', 'DATE_DIFF', 'TODAY', 'FORMAT_DATE', 'ADD_DAYS', 'ADD_MONTHS', 'YEAR', 'MONTH', 'DAY'].includes(f.label)
                    ).map((func) => (
                        <div key={func.value} className="relative group">
                            <button
                                type="button"
                                className="px-2 py-1 bg-orange-100 border border-orange-300 rounded text-sm hover:bg-orange-200 text-orange-800"
                                onClick={() => addFunctionToFormula(func.value)}
                                draggable="true"
                                title={func.value}
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('function-value', func.value);
                                    e.dataTransfer.setData('function-label', func.label);
                                    e.dataTransfer.setData('formula-element-type', 'function');
                                    e.dataTransfer.setData('text/plain', func.value);
                                    e.dataTransfer.effectAllowed = 'copy';
                                    
                                    document.querySelectorAll('.formula-drop-zone').forEach(el => {
                                        el.classList.add('drop-target-highlight');
                                    });
                                }}
                            >
                                {func.label}
                            </button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 max-w-xs pointer-events-none z-10">
                                <p className="font-bold mb-1">{func.label}: {func.value}</p>
                                <p>{func.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Fonctions de vérification */}
            <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Vérifications:</p>
                <div className="flex flex-wrap gap-1">
                    {FUNCTIONS.filter(f => f.label.startsWith('IS_')).map((func) => (
                        <div key={func.value} className="relative group">
                            <button
                                type="button"
                                className="px-2 py-1 bg-red-100 border border-red-300 rounded text-sm hover:bg-red-200 text-red-800"
                                onClick={() => addFunctionToFormula(func.value)}
                                draggable="true"
                                title={func.value}
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('function-value', func.value);
                                    e.dataTransfer.setData('function-label', func.label);
                                    e.dataTransfer.setData('formula-element-type', 'function');
                                    e.dataTransfer.setData('text/plain', func.value);
                                    e.dataTransfer.effectAllowed = 'copy';
                                    
                                    document.querySelectorAll('.formula-drop-zone').forEach(el => {
                                        el.classList.add('drop-target-highlight');
                                    });
                                }}
                            >
                                {func.label}
                            </button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 max-w-xs pointer-events-none z-10">
                                <p className="font-bold mb-1">{func.label}: {func.value}</p>
                                <p>{func.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Fonctions de recherche et autres */}
            <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Recherche et agrégation:</p>
                <div className="flex flex-wrap gap-1">
                    {FUNCTIONS.filter(f => 
                        ['LOOKUP', 'INDEX', 'FILTER', 'COUNT', 'IN', 'DISTINCT'].includes(f.label)
                    ).map((func) => (
                        <div key={func.value} className="relative group">
                            <button
                                type="button"
                                className="px-2 py-1 bg-indigo-100 border border-indigo-300 rounded text-sm hover:bg-indigo-200 text-indigo-800"
                                onClick={() => addFunctionToFormula(func.value)}
                                draggable="true"
                                title={func.value}
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('function-value', func.value);
                                    e.dataTransfer.setData('function-label', func.label);
                                    e.dataTransfer.setData('formula-element-type', 'function');
                                    e.dataTransfer.setData('text/plain', func.value);
                                    e.dataTransfer.effectAllowed = 'copy';
                                    
                                    document.querySelectorAll('.formula-drop-zone').forEach(el => {
                                        el.classList.add('drop-target-highlight');
                                    });
                                }}
                            >
                                {func.label}
                            </button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 max-w-xs pointer-events-none z-10">
                                <p className="font-bold mb-1">{func.label}: {func.value}</p>
                                <p>{func.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Constantes et valeurs */}
            <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Constantes:</p>
                <div className="flex flex-wrap gap-1">
                    {FUNCTIONS.filter(f => 
                        ['TRUE', 'FALSE', 'NULL', 'BLANK', 'PI', 'E'].includes(f.label)
                    ).map((func) => (
                        <div key={func.value} className="relative group">
                            <button
                                type="button"
                                className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm hover:bg-gray-200 text-gray-800"
                                onClick={() => addFunctionToFormula(func.value)}
                                draggable="true"
                                title={func.value}
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('function-value', func.value);
                                    e.dataTransfer.setData('function-label', func.label);
                                    e.dataTransfer.setData('formula-element-type', 'function');
                                    e.dataTransfer.setData('text/plain', func.value);
                                    e.dataTransfer.effectAllowed = 'copy';
                                    
                                    document.querySelectorAll('.formula-drop-zone').forEach(el => {
                                        el.classList.add('drop-target-highlight');
                                    });
                                }}
                            >
                                {func.label}
                            </button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 max-w-xs pointer-events-none z-10">
                                <p className="font-bold mb-1">{func.label}: {func.value}</p>
                                <p>{func.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

export default FunctionsPalette;
