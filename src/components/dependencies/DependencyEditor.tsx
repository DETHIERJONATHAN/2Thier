import React, { useState } from 'react';
import useCRMStore from '../../store';
import type { FieldDependency } from '../../store/slices/types';
import DependencyDropZone from './DependencyDropZone';
import { ADVANCED_CONDITION_FUNCTIONS, ADVANCED_VALUE_TESTS } from './dependencyIntegration';
import { generateNewFormatCode } from './dependencyUtils';

interface DependencyEditorProps {
  dependency: FieldDependency;
  onClose: () => void;
}

/**
 * Éditeur complet pour une dépendance
 */
const DependencyEditor: React.FC<DependencyEditorProps> = ({ dependency, onClose }) => {
    console.log(`[DependencyEditor] Render for dependency ${dependency.id}`);
    
    const [fixedValue, setFixedValue] = useState('');

    const handleNameChange = (newName: string) => {
        console.log(`[DependencyEditor] Name changed to: ${newName}`);
        const { updateDependency } = useCRMStore.getState();
        updateDependency(dependency.id, { name: newName });
    };

    const handleActionChange = (newAction: 'show' | 'hide' | 'require' | 'unrequire' | 'enable' | 'disable' | 'setValue') => {
        console.log(`[DependencyEditor] Action changed to: ${newAction}`);
        if (!dependency.sequence) return;
        const { updateDependency } = useCRMStore.getState();
        updateDependency(dependency.id, { sequence: { ...dependency.sequence, action: newAction } });
    };

    const handleAddFixedValue = () => {
        if (fixedValue.trim() === '') return;
        const num = parseFloat(fixedValue);
        
        // Vérifier que dependency.sequence existe et est correctement structuré
        if (!dependency.sequence || !Array.isArray(dependency.sequence.conditions)) {
            console.error("[DependencyEditor] Sequence is missing or malformed");
            return;
        }
        
        // Récupérer la première condition (ou créer un tableau vide)
        const currentConditions = [...dependency.sequence.conditions];
        const firstCondition = currentConditions[0] || [];
        
        // Ajouter la valeur à la première condition
        const updatedCondition = [...firstCondition, { 
            type: 'value' as const, 
            value: isNaN(num) ? fixedValue : num 
        }];
        
        // Mettre à jour les conditions
        currentConditions[0] = updatedCondition;
        
        // Mettre à jour la dépendance
        const { updateDependency } = useCRMStore.getState();
        updateDependency(dependency.id, { 
            sequence: {
                ...dependency.sequence,
                conditions: currentConditions
            }
        });
        
        setFixedValue('');
    };

    const handleAddOperator = (operator: string) => {
        // Vérifier que dependency.sequence existe et est correctement structuré
        if (!dependency.sequence || !Array.isArray(dependency.sequence.conditions)) {
            console.error("[DependencyEditor] Sequence is missing or malformed");
            return;
        }
        
        // Récupérer la première condition (ou créer un tableau vide)
        const currentConditions = [...dependency.sequence.conditions];
        const firstCondition = currentConditions[0] || [];
        
        // Ajouter l'opérateur à la première condition
        const updatedCondition = [...firstCondition, { 
            type: 'operator' as const, 
            value: operator 
        }];
        
        // Mettre à jour les conditions
        currentConditions[0] = updatedCondition;
        
        // Mettre à jour la dépendance
        const { updateDependency } = useCRMStore.getState();
        updateDependency(dependency.id, { 
            sequence: {
                ...dependency.sequence,
                conditions: currentConditions
            }
        });
    };

    return (
        <div className="flex flex-col gap-3 p-3 border-t border-blue-200 bg-blue-50 relative mt-4">
            <button 
                className="absolute top-1 right-2 text-gray-400 hover:text-red-500 text-lg z-10"
                title="Fermer l'édition"
                onClick={onClose}
            >×</button>

            <h3 className="font-bold text-sm">Édition de dépendance</h3>
            
            <input 
              type="text" 
              value={dependency.name} 
              onChange={e => handleNameChange(e.target.value)} 
              placeholder="Nom de la dépendance" 
              className="input input-bordered input-sm w-full" />

            <div className="flex flex-col gap-2 p-2 border rounded bg-gray-100">
                <div className="font-semibold text-xs text-gray-600">Condition de dépendance</div>
                <DependencyDropZone dependencyId={dependency.id} />
                
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <input 
                        type="text" 
                        placeholder="Valeur..." 
                        className="input input-bordered input-xs" 
                        value={fixedValue} 
                        onChange={e => setFixedValue(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && handleAddFixedValue()}
                    />
                    <button className="btn btn-xs" onClick={handleAddFixedValue}>Ajouter Valeur</button>
                    <div className="flex flex-wrap gap-1">
                        {['==', '!=', '>', '<', '>=', '<='].map(op => (
                            <button key={op} onClick={() => handleAddOperator(op)} className="btn btn-xs btn-outline">{op}</button>
                        ))}
                    </div>
                </div>
                
                {/* Section pour toutes les fonctions et tests - Affichés comme des boutons */}
                <div className="flex flex-col gap-2 mt-3">
                    {/* Fonctions de condition */}
                    <div className="mb-2">
                        <div className="font-semibold text-xs text-gray-600 mb-1">Fonctions de condition</div>
                        <div className="flex flex-wrap gap-1">
                            {ADVANCED_CONDITION_FUNCTIONS.map(func => (
                                <div key={func.value} className="relative group">
                                    <button 
                                        key={func.value} 
                                        onClick={() => handleAddOperator(func.value)} 
                                        className="btn btn-xs bg-indigo-100 text-indigo-700 border-indigo-300 hover:bg-indigo-200"
                                        title={func.description}
                                    >
                                        {func.label}
                                    </button>
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 max-w-xs pointer-events-none z-10">
                                        <p className="font-bold mb-1">{func.label}</p>
                                        <p className="mb-1">{func.description}</p>
                                        <p className="text-xs font-mono text-amber-300">{func.example}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Tests sur valeurs */}
                    <div>
                        <div className="font-semibold text-xs text-gray-600 mb-1">Tests sur valeurs</div>
                        <div className="flex flex-wrap gap-1">
                            {ADVANCED_VALUE_TESTS.map(test => (
                                <div key={test.value} className="relative group">
                                    <button 
                                        key={test.value} 
                                        onClick={() => handleAddOperator(test.value)} 
                                        className="btn btn-xs bg-red-100 text-red-700 border-red-300 hover:bg-red-200"
                                        title={test.description}
                                    >
                                        {test.label}
                                    </button>
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 max-w-xs pointer-events-none z-10">
                                        <p className="font-bold mb-1">{test.label}</p>
                                        <p className="mb-1">{test.description}</p>
                                        <p className="text-xs font-mono text-amber-300">{test.example}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-2 p-2 border rounded bg-gray-100">
                <div className="font-semibold text-xs text-gray-600">Actions de dépendance</div>
                
                {/* Section Visibilité */}
                <div className="mb-3">
                    <p className="text-xs text-gray-600 mb-1">Visibilité</p>
                    <div className="flex flex-wrap gap-1">
                        <button 
                            onClick={() => handleActionChange('show')} 
                            className={`btn btn-xs ${dependency.sequence?.action === 'show' ? 'btn-success' : 'btn-outline'}`}
                        >
                            Afficher
                        </button>
                        <button 
                            onClick={() => handleActionChange('hide')} 
                            className={`btn btn-xs ${dependency.sequence?.action === 'hide' ? 'btn-success' : 'btn-outline'}`}
                        >
                            Masquer
                        </button>
                    </div>
                </div>
                
                {/* Section Obligation */}
                <div className="mb-3">
                    <p className="text-xs text-gray-600 mb-1">Obligation</p>
                    <div className="flex flex-wrap gap-1">
                        <button 
                            onClick={() => handleActionChange('require')} 
                            className={`btn btn-xs ${dependency.sequence?.action === 'require' ? 'btn-primary' : 'btn-outline'}`}
                        >
                            Obligatoire
                        </button>
                        <button 
                            onClick={() => handleActionChange('unrequire')} 
                            className={`btn btn-xs ${dependency.sequence?.action === 'unrequire' ? 'btn-primary' : 'btn-outline'}`}
                        >
                            Facultatif
                        </button>
                    </div>
                </div>
                
                {/* Section Activation */}
                <div className="mb-3">
                    <p className="text-xs text-gray-600 mb-1">Activation</p>
                    <div className="flex flex-wrap gap-1">
                        <button 
                            onClick={() => handleActionChange('enable')} 
                            className={`btn btn-xs ${dependency.sequence?.action === 'enable' ? 'btn-info' : 'btn-outline'}`}
                        >
                            Activer
                        </button>
                        <button 
                            onClick={() => handleActionChange('disable')} 
                            className={`btn btn-xs ${dependency.sequence?.action === 'disable' ? 'btn-info' : 'btn-outline'}`}
                        >
                            Désactiver
                        </button>
                    </div>
                </div>
                
                {/* Section Valeur */}
                <div className="mb-3">
                    <p className="text-xs text-gray-600 mb-1">Valeur</p>
                    <div className="flex flex-wrap gap-1">
                        <button 
                            onClick={() => handleActionChange('setValue')} 
                            className={`btn btn-xs ${dependency.sequence?.action === 'setValue' ? 'btn-warning' : 'btn-outline'}`}
                        >
                            Prérenseigner
                        </button>
                    </div>
                </div>
                
                {/* Maintenir la sélection pour les systèmes existants */}
                <div className="mt-2 hidden">
                    <select 
                        className="select select-bordered select-sm"
                        value={dependency.sequence?.action || 'show'}
                        onChange={e => handleActionChange(e.target.value as 'show' | 'hide' | 'require' | 'unrequire' | 'enable' | 'disable' | 'setValue')}
                    >
                        <optgroup label="Visibilité">
                            <option value="show">Afficher</option>
                            <option value="hide">Masquer</option>
                        </optgroup>
                        <optgroup label="Obligation">
                            <option value="require">Rendre obligatoire</option>
                            <option value="unrequire">Rendre facultatif</option>
                        </optgroup>
                        <optgroup label="Activation">
                            <option value="enable">Activer</option>
                            <option value="disable">Désactiver</option>
                        </optgroup>
                        <optgroup label="Valeur">
                            <option value="setValue">Définir valeur</option>
                        </optgroup>
                    </select>
                </div>
            </div>
            
            {/* Visualisation de la dépendance au nouveau format */}
            <div className="flex flex-col gap-2 p-2 border rounded bg-gray-100 mt-4">
                <div className="font-semibold text-xs text-gray-600">Aperçu au nouveau format (Copilot)</div>
                <div className="bg-blue-50 p-2 rounded border border-blue-200">
                    <code className="text-xs font-mono">
                        {generateNewFormatCode(dependency)}
                    </code>
                </div>
            </div>
        </div>
    );
};

export default DependencyEditor;
