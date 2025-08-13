import React, { useCallback, memo } from 'react';
import type { Formula } from "../../store/slices/types";
import { validateFormula, prepareFormulaForAPI, getAPIHeaders } from '../../utils/formulaValidator';

// Liste des opérateurs disponibles
const OPERATORS = [
    // Opérateurs arithmétiques
    { value: '+', label: 'Addition : Ajoute deux valeurs (ex: 5 + 3)', category: 'arithmétique' },
    { value: '-', label: 'Soustraction : Soustrait la seconde valeur de la première (ex: 5 - 3)', category: 'arithmétique' },
    { value: '*', label: 'Multiplication : Multiplie deux valeurs (ex: 5 * 3)', category: 'arithmétique' },
    { value: '/', label: 'Division : Divise la première valeur par la seconde (ex: 15 / 3)', category: 'arithmétique' },
    { value: '%', label: 'Modulo : Renvoie le reste de la division entière (ex: 7 % 3 = 1)', category: 'arithmétique' },
    { value: '**', label: 'Puissance : Élève la première valeur à la puissance de la seconde (ex: 2 ** 3 = 8)', category: 'arithmétique' },
    
    // Opérateurs de comparaison
    { value: '=', label: 'Égal : Compare si deux valeurs sont égales (ex: prix = 100)', category: 'comparaison' },
    { value: '!=', label: 'Différent : Compare si deux valeurs sont différentes (ex: statut != "Fermé")', category: 'comparaison' },
    { value: '>', label: 'Supérieur : Vérifie si la première valeur est plus grande (ex: prix > 100)', category: 'comparaison' },
    { value: '<', label: 'Inférieur : Vérifie si la première valeur est plus petite (ex: prix < 100)', category: 'comparaison' },
    { value: '>=', label: 'Supérieur ou égal : Vérifie si la première valeur est plus grande ou égale (ex: âge >= 18)', category: 'comparaison' },
    { value: '<=', label: 'Inférieur ou égal : Vérifie si la première valeur est plus petite ou égale (ex: âge <= 65)', category: 'comparaison' },
    { value: '===', label: 'Strictement égal : Compare si deux valeurs sont égales en valeur et en type (ex: type === "client")', category: 'comparaison' },
    { value: '!==', label: 'Strictement différent : Compare si deux valeurs sont différentes en valeur ou en type', category: 'comparaison' },
    
    // Opérateurs logiques
    { value: '&&', label: 'ET logique : Les deux conditions doivent être vraies (ex: prix > 100 && quantité > 10)', category: 'logique' },
    { value: '||', label: 'OU logique : Au moins une des conditions doit être vraie (ex: statut = "Actif" || statut = "En attente")', category: 'logique' },
    { value: '!', label: 'NON logique : Inverse une condition (ex: !terminé signifie "non terminé")', category: 'logique' },
    
    // Opérateurs d'accès
    { value: '.', label: 'Accès à une propriété : Accède à une propriété d\'un objet (ex: client.nom)', category: 'accès' },
    { value: '[]', label: 'Accès à un élément : Accède à un élément d\'un tableau ou d\'un objet (ex: contacts[0])', category: 'accès' },
    { value: '?:', label: 'Opérateur ternaire : Condition ? si vrai : si faux (ex: age >= 18 ? "Majeur" : "Mineur")', category: 'conditionnel' },
    { value: '?.', label: 'Chaînage optionnel : Accède à une propriété d\'un objet qui peut être null (ex: client?.adresse)', category: 'accès' },
    { value: '??', label: 'Coalescence des nuls : Renvoie la valeur de droite si celle de gauche est null/undefined (ex: valeur ?? 0)', category: 'conditionnel' },
    { value: '...', label: 'Opérateur de décomposition : Décompose un tableau ou un objet (ex: ...tableau)', category: 'spécial' },
];

interface OperatorsPaletteProps {
    formulaId: string | undefined;
    formula?: Formula;  // Ajout d'une prop pour recevoir l'objet formula complet
}

/**
 * Palette d'opérateurs disponibles pour les formules
 */
const OperatorsPalette = memo(({ formulaId, formula }: OperatorsPaletteProps) => {
    const addOperatorToFormula = useCallback((operatorValue: string) => {
        if (!formulaId) {
            console.error(`[OperatorsPalette] ❌ Impossible d'ajouter l'opérateur: formulaId manquant`);
            return;
        }
        
        console.log(`[OperatorsPalette] ➕ Ajout de l'opérateur "${operatorValue}" à la formule ${formulaId}`);
        
        // Valider la formule actuelle
        if (!formula) {
            console.error(`[OperatorsPalette] ❌ Impossible d'ajouter l'opérateur: objet formula manquant`);
            return;
        }
        
        const validation = validateFormula(formula, 'OperatorsPalette');
        if (!validation.isValid) {
            console.error(`[OperatorsPalette] ❌ Validation de la formule échouée: ${validation.message}`, validation.details);
            return;
        }
        
        // Créer l'élément d'opérateur
        const newOperator = {
            type: 'operator' as const,
            id: `operator-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            value: operatorValue,
            label: operatorValue
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
        
        const newSequence = [...validatedSequence, newOperator];
        
        console.log(`[OperatorsPalette] 📊 Ajout de l'opérateur à la séquence: ${currentSequence.length} => ${newSequence.length} items`);
        
        // Préparer la formule pour l'API et effectuer des corrections automatiques si nécessaire
        const preparedFormula = prepareFormulaForAPI({
            ...formula,
            sequence: newSequence as any // Cast pour résoudre le problème de compatibilité entre les différents types FormulaItem
        }, 'OperatorsPalette');
        
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
                console.log(`[OperatorsPalette] ✅ Formule mise à jour via API directe`);
                // Forcer le rechargement des formules
                setTimeout(() => {
                    // Déclencher un événement personnalisé pour informer le parent
                    const event = new CustomEvent('formula-updated', { 
                        detail: { formulaId: formulaId, success: true } 
                    });
                    document.dispatchEvent(event);
                }, 300);
            } else {
                console.error(`[OperatorsPalette] ❌ Échec de la mise à jour via API: ${response.statusText}`);
            }
        })
        .catch(error => {
            console.error(`[OperatorsPalette] ❌ Erreur lors de la mise à jour via API:`, error);
        });
    }, [formulaId, formula]);
    
    return (
        <div className="mt-2 p-2 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm font-medium mb-2">Opérateurs disponibles:</p>
            
            {/* Opérateurs arithmétiques */}
            <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Arithmétiques:</p>
                <div className="flex flex-wrap gap-1">
                    {OPERATORS.filter(op => op.category === 'arithmétique').map((op) => (
                        <div key={op.value} className="relative group">
                            <button
                                type="button"
                                className="w-8 h-8 flex items-center justify-center bg-amber-50 border border-amber-300 rounded hover:bg-amber-100 text-amber-800 font-medium"
                                onClick={() => addOperatorToFormula(op.value)}
                                draggable="true"
                                title={op.label}
                                onDragStart={(e) => {
                                    console.log(`[OPERATOR_DRAG] Starting drag for operator: ${op.value}`);
                                    e.dataTransfer.setData('operator-value', op.value);
                                    e.dataTransfer.setData('operator-label', op.label);
                                    e.dataTransfer.setData('formula-element-type', 'operator');
                                    e.dataTransfer.setData('text/plain', op.value);
                                    e.dataTransfer.effectAllowed = 'copy';
                                    
                                    // Ajouter une classe visuelle pour indiquer que le glisser-déposer est actif
                                    document.querySelectorAll('.formula-drop-zone').forEach(el => {
                                        el.classList.add('drop-target-highlight');
                                    });
                                }}
                            >
                                {op.value}
                            </button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                                {op.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Opérateurs de comparaison */}
            <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Comparaison:</p>
                <div className="flex flex-wrap gap-1">
                    {OPERATORS.filter(op => op.category === 'comparaison').map((op) => (
                        <div key={op.value} className="relative group">
                            <button
                                type="button"
                                className="w-8 h-8 flex items-center justify-center bg-blue-50 border border-blue-300 rounded hover:bg-blue-100 text-blue-800 font-medium"
                                onClick={() => addOperatorToFormula(op.value)}
                                draggable="true"
                                title={op.label}
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('operator-value', op.value);
                                    e.dataTransfer.setData('operator-label', op.label);
                                    e.dataTransfer.setData('formula-element-type', 'operator');
                                    e.dataTransfer.setData('text/plain', op.value);
                                    e.dataTransfer.effectAllowed = 'copy';
                                    
                                    document.querySelectorAll('.formula-drop-zone').forEach(el => {
                                        el.classList.add('drop-target-highlight');
                                    });
                                }}
                            >
                                {op.value}
                            </button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10 min-w-max">
                                {op.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Opérateurs logiques */}
            <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Logiques:</p>
                <div className="flex flex-wrap gap-1">
                    {OPERATORS.filter(op => op.category === 'logique').map((op) => (
                        <div key={op.value} className="relative group">
                            <button
                                type="button"
                                className="w-8 h-8 flex items-center justify-center bg-green-50 border border-green-300 rounded hover:bg-green-100 text-green-800 font-medium"
                                onClick={() => addOperatorToFormula(op.value)}
                                draggable="true"
                                title={op.label}
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('operator-value', op.value);
                                    e.dataTransfer.setData('operator-label', op.label);
                                    e.dataTransfer.setData('formula-element-type', 'operator');
                                    e.dataTransfer.setData('text/plain', op.value);
                                    e.dataTransfer.effectAllowed = 'copy';
                                    
                                    document.querySelectorAll('.formula-drop-zone').forEach(el => {
                                        el.classList.add('drop-target-highlight');
                                    });
                                }}
                            >
                                {op.value}
                            </button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                                {op.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Autres opérateurs */}
            <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Autres opérateurs:</p>
                <div className="flex flex-wrap gap-1">
                    {OPERATORS.filter(op => 
                        op.category === 'accès' || op.category === 'conditionnel' || op.category === 'spécial'
                    ).map((op) => (
                        <div key={op.value} className="relative group">
                            <button
                                type="button"
                                className="w-auto h-8 px-2 flex items-center justify-center bg-purple-50 border border-purple-300 rounded hover:bg-purple-100 text-purple-800 font-medium"
                                onClick={() => addOperatorToFormula(op.value)}
                                draggable="true"
                                title={op.label}
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('operator-value', op.value);
                                    e.dataTransfer.setData('operator-label', op.label);
                                    e.dataTransfer.setData('formula-element-type', 'operator');
                                    e.dataTransfer.setData('text/plain', op.value);
                                    e.dataTransfer.effectAllowed = 'copy';
                                    
                                    document.querySelectorAll('.formula-drop-zone').forEach(el => {
                                        el.classList.add('drop-target-highlight');
                                    });
                                }}
                            >
                                {op.value}
                            </button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                                {op.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

export default OperatorsPalette;


