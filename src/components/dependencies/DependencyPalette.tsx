import { useCallback, memo } from 'react';
import { DependencyAction } from '../../utils/dependencyFunctions';

// Liste des actions de dépendance disponibles
const DEPENDENCY_ACTIONS = [
    // Actions d'affichage
    { 
        value: DependencyAction.SHOW, 
        label: 'Afficher',
        category: 'affichage', 
        description: 'Affiche un champ ou un groupe de champs',
        example: 'SHOW("adresse_livraison")'
    },
    { 
        value: DependencyAction.HIDE, 
        label: 'Masquer',
        category: 'affichage', 
        description: 'Masque un champ ou un groupe de champs',
        example: 'HIDE("adresse_livraison")'
    },
    
    // Actions d'activation
    { 
        value: DependencyAction.ENABLE, 
        label: 'Activer',
        category: 'activation', 
        description: 'Active un champ pour permettre l\'édition',
        example: 'ENABLE("bouton_validation")'
    },
    { 
        value: DependencyAction.DISABLE, 
        label: 'Désactiver',
        category: 'activation', 
        description: 'Désactive un champ pour empêcher l\'édition',
        example: 'DISABLE("bouton_validation")' 
    },
    
    // Actions de validation
    { 
        value: DependencyAction.SET_REQUIRED, 
        label: 'Rendre obligatoire',
        category: 'validation', 
        description: 'Rend un champ obligatoire',
        example: 'SET_REQUIRED("telephone")'
    },
    { 
        value: DependencyAction.SET_OPTIONAL, 
        label: 'Rendre facultatif',
        category: 'validation', 
        description: 'Rend un champ facultatif',
        example: 'SET_OPTIONAL("telephone")'
    },
    
    // Actions de valeur
    { 
        value: DependencyAction.SET_VALUE, 
        label: 'Définir valeur',
        category: 'valeur', 
        description: 'Prérempli un champ avec une valeur spécifique',
        example: 'SET_VALUE("pays", "France")'
    },
];

// Liste des fonctions de condition
const CONDITION_FUNCTIONS = [
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

// Liste des tests de valeur
const VALUE_TESTS = [
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

interface DependencyPaletteProps {
    fieldId?: string;
    onAddDependency?: (type: string) => void;
}

/**
 * Palette d'actions de dépendance disponibles
 */
const DependencyPalette = memo(({ fieldId, onAddDependency }: DependencyPaletteProps) => {
    const handleAddDependency = useCallback((dependencyType: string) => {
        if (!fieldId) {
            console.error(`[DependencyPalette] ❌ Impossible d'ajouter la dépendance: fieldId manquant`);
            return;
        }
        
        console.log(`[DependencyPalette] ➕ Ajout de la dépendance "${dependencyType}" pour le champ ${fieldId}`);
        
        // Si un callback est fourni, l'utiliser
        if (onAddDependency) {
            onAddDependency(dependencyType);
        }
    }, [fieldId, onAddDependency]);
    
    // Regrouper les actions par catégorie
    const displayActions = DEPENDENCY_ACTIONS.filter(action => action.category === 'affichage');
    const activationActions = DEPENDENCY_ACTIONS.filter(action => action.category === 'activation');
    const validationActions = DEPENDENCY_ACTIONS.filter(action => action.category === 'validation');
    const valueActions = DEPENDENCY_ACTIONS.filter(action => action.category === 'valeur');
    
    return (
        <div className="mt-2 p-2 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm font-semibold mb-3 text-blue-700">Dépendances et Actions</p>
            
            <p className="text-xs font-medium text-gray-700 mb-4 border-b border-gray-200 pb-1">Toutes les opérations de dépendance</p>
            
            {/* Tous les boutons regroupés ensemble */}
            <div className="flex flex-wrap gap-2 mb-4">
                {/* Actions d'affichage */}
                {displayActions.map((action) => (
                    <div key={action.value} className="relative group">
                        <button
                            type="button"
                            className="px-2 py-1 bg-green-100 border border-green-300 rounded text-xs hover:bg-green-200 text-green-800 shadow-sm"
                            onClick={() => handleAddDependency(action.value)}
                            draggable="true"
                            title={action.label}
                            onDragStart={(e) => {
                                console.log(`[DEPENDENCY_DRAG] Starting drag for action: ${action.value}`);
                                const data = {
                                    type: 'dependency-action',
                                    id: action.value,
                                    value: action.value,
                                    label: action.label,
                                    category: action.category
                                };
                                e.dataTransfer.setData('application/json', JSON.stringify(data));
                                e.dataTransfer.setData('dependency-action', action.value);
                                e.dataTransfer.setData('dependency-label', action.label);
                                e.dataTransfer.setData('element-type', 'dependency-action');
                                e.dataTransfer.setData('text/plain', action.value);
                                e.dataTransfer.effectAllowed = 'copy';
                            }}
                        >
                            {action.label}
                        </button>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 max-w-xs pointer-events-none z-10 shadow-lg">
                            <p className="font-bold mb-1 text-green-300">{action.label}</p>
                            <p className="mb-2">{action.description}</p>
                            <p className="text-amber-300 font-mono text-xs">{action.example}</p>
                        </div>
                    </div>
                ))}
                
                {/* Actions d'activation */}
                {activationActions.map((action) => (
                    <div key={action.value} className="relative group">
                        <button
                            type="button"
                            className="px-2 py-1 bg-blue-100 border border-blue-300 rounded text-xs hover:bg-blue-200 text-blue-800 shadow-sm"
                            onClick={() => handleAddDependency(action.value)}
                            draggable="true"
                            title={action.label}
                            onDragStart={(e) => {
                                console.log(`[DEPENDENCY_DRAG] Starting drag for action: ${action.value}`);
                                const data = {
                                    type: 'dependency-action',
                                    id: action.value,
                                    value: action.value,
                                    label: action.label,
                                    category: action.category
                                };
                                e.dataTransfer.setData('application/json', JSON.stringify(data));
                                e.dataTransfer.setData('dependency-action', action.value);
                                e.dataTransfer.setData('dependency-label', action.label);
                                e.dataTransfer.setData('element-type', 'dependency-action');
                                e.dataTransfer.setData('text/plain', action.value);
                                e.dataTransfer.effectAllowed = 'copy';
                            }}
                        >
                            {action.label}
                        </button>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 max-w-xs pointer-events-none z-10 shadow-lg">
                            <p className="font-bold mb-1 text-blue-300">{action.label}</p>
                            <p className="mb-2">{action.description}</p>
                            <p className="text-amber-300 font-mono text-xs">{action.example}</p>
                        </div>
                    </div>
                ))}
                
                {/* Actions de validation */}
                {validationActions.map((action) => (
                    <div key={action.value} className="relative group">
                        <button
                            type="button"
                            className="px-2 py-1 bg-purple-100 border border-purple-300 rounded text-xs hover:bg-purple-200 text-purple-800 shadow-sm"
                            onClick={() => handleAddDependency(action.value)}
                            draggable="true"
                            title={action.label}
                            onDragStart={(e) => {
                                console.log(`[DEPENDENCY_DRAG] Starting drag for action: ${action.value}`);
                                const data = {
                                    type: 'dependency-action',
                                    id: action.value,
                                    value: action.value,
                                    label: action.label,
                                    category: action.category
                                };
                                e.dataTransfer.setData('application/json', JSON.stringify(data));
                                e.dataTransfer.setData('dependency-action', action.value);
                                e.dataTransfer.setData('dependency-label', action.label);
                                e.dataTransfer.setData('element-type', 'dependency-action');
                                e.dataTransfer.setData('text/plain', action.value);
                                e.dataTransfer.effectAllowed = 'copy';
                            }}
                        >
                            {action.label}
                        </button>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 max-w-xs pointer-events-none z-10 shadow-lg">
                            <p className="font-bold mb-1 text-purple-300">{action.label}</p>
                            <p className="mb-2">{action.description}</p>
                            <p className="text-amber-300 font-mono text-xs">{action.example}</p>
                        </div>
                    </div>
                ))}
                
                {/* Actions de valeur */}
                {valueActions.map((action) => (
                    <div key={action.value} className="relative group">
                        <button
                            type="button"
                            className="px-2 py-1 bg-orange-100 border border-orange-300 rounded text-xs hover:bg-orange-200 text-orange-800 shadow-sm"
                            onClick={() => handleAddDependency(action.value)}
                            draggable="true"
                            title={action.label}
                            onDragStart={(e) => {
                                console.log(`[DEPENDENCY_DRAG] Starting drag for action: ${action.value}`);
                                const data = {
                                    type: 'dependency-action',
                                    id: action.value,
                                    value: action.value,
                                    label: action.label,
                                    category: action.category
                                };
                                e.dataTransfer.setData('application/json', JSON.stringify(data));
                                e.dataTransfer.setData('dependency-action', action.value);
                                e.dataTransfer.setData('dependency-label', action.label);
                                e.dataTransfer.setData('element-type', 'dependency-action');
                                e.dataTransfer.setData('text/plain', action.value);
                                e.dataTransfer.effectAllowed = 'copy';
                            }}
                        >
                            {action.label}
                        </button>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 max-w-xs pointer-events-none z-10 shadow-lg">
                            <p className="font-bold mb-1 text-orange-300">{action.label}</p>
                            <p className="mb-2">{action.description}</p>
                            <p className="text-amber-300 font-mono text-xs">{action.example}</p>
                        </div>
                    </div>
                ))}
                
                {/* Fonctions de condition */}
                {CONDITION_FUNCTIONS.map((condition) => (
                    <div key={condition.value} className="relative group">
                        <button
                            type="button"
                            className="px-2 py-1 bg-indigo-100 border border-indigo-300 rounded text-xs hover:bg-indigo-200 text-indigo-800 shadow-sm"
                            onClick={() => handleAddDependency(condition.value)}
                            draggable="true"
                            title={condition.label}
                            onDragStart={(e) => {
                                console.log(`[DEPENDENCY_DRAG] Starting drag for condition: ${condition.value}`);
                                const data = {
                                    type: 'dependency-condition',
                                    id: condition.value,
                                    value: condition.value,
                                    label: condition.label
                                };
                                e.dataTransfer.setData('application/json', JSON.stringify(data));
                                e.dataTransfer.setData('dependency-condition', condition.value);
                                e.dataTransfer.setData('dependency-label', condition.label);
                                e.dataTransfer.setData('element-type', 'dependency-condition');
                                e.dataTransfer.setData('text/plain', condition.value);
                                e.dataTransfer.effectAllowed = 'copy';
                            }}
                        >
                            {condition.label}
                        </button>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 max-w-xs pointer-events-none z-10 shadow-lg">
                            <p className="font-bold mb-1 text-indigo-300">{condition.label}</p>
                            <p className="mb-2">{condition.description}</p>
                            <p className="text-gray-300 italic text-xs mb-1">Exemple: {condition.example}</p>
                            <p className="text-amber-300 font-mono text-xs">{condition.syntax}</p>
                        </div>
                    </div>
                ))}
                
                {/* Tests sur valeurs */}
                {VALUE_TESTS.map((test) => (
                    <div key={test.value} className="relative group">
                        <button
                            type="button"
                            className="px-2 py-1 bg-red-100 border border-red-300 rounded text-xs hover:bg-red-200 text-red-800 shadow-sm"
                            onClick={() => handleAddDependency(test.value)}
                            draggable="true"
                            title={test.label}
                            onDragStart={(e) => {
                                console.log(`[DEPENDENCY_DRAG] Starting drag for test: ${test.value}`);
                                const data = {
                                    type: 'dependency-test',
                                    id: test.value,
                                    value: test.value,
                                    label: test.label
                                };
                                e.dataTransfer.setData('application/json', JSON.stringify(data));
                                e.dataTransfer.setData('dependency-test', test.value);
                                e.dataTransfer.setData('dependency-label', test.label);
                                e.dataTransfer.setData('element-type', 'dependency-test');
                                e.dataTransfer.setData('text/plain', test.value);
                                e.dataTransfer.effectAllowed = 'copy';
                            }}
                        >
                            {test.label}
                        </button>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 max-w-xs pointer-events-none z-10 shadow-lg">
                            <p className="font-bold mb-1 text-red-300">{test.label}</p>
                            <p className="mb-2">{test.description}</p>
                            <p className="text-amber-300 font-mono text-xs">{test.example}</p>
                        </div>
                    </div>
                ))}
            </div>
                
            {/* Légende des couleurs */}
            <div className="text-xs text-gray-500 mt-4 border-t border-gray-200 pt-2">
                <p className="mb-1"><span className="inline-block w-3 h-3 rounded bg-green-100 border border-green-300 mr-1"></span> Affichage &nbsp;
                <span className="inline-block w-3 h-3 rounded bg-blue-100 border border-blue-300 mr-1"></span> Activation &nbsp;
                <span className="inline-block w-3 h-3 rounded bg-purple-100 border border-purple-300 mr-1"></span> Validation</p>
                <p><span className="inline-block w-3 h-3 rounded bg-orange-100 border border-orange-300 mr-1"></span> Valeur &nbsp;
                <span className="inline-block w-3 h-3 rounded bg-indigo-100 border border-indigo-300 mr-1"></span> Conditions &nbsp;
                <span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-300 mr-1"></span> Tests</p>
            </div>
        </div>
    );
});

export default DependencyPalette;
