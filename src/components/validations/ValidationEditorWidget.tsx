import React, { useState } from 'react';
import ValidationsPalette from './ValidationsPalette';
import ValuesWidget from './ValuesWidget';

interface ValidationEditorWidgetProps {
    fieldId?: string;
    onAddValidation?: (type: string) => void;
    onSelectValue?: (value: string) => void;
}

/**
 * Widget complet pour l'édition des validations
 * Combine la palette de validations et le widget de valeurs
 */
const ValidationEditorWidget: React.FC<ValidationEditorWidgetProps> = ({ 
    fieldId, 
    onAddValidation,
    onSelectValue 
}) => {
    const [activeTab, setActiveTab] = useState<'validations' | 'values' | 'fields'>('validations');

    return (
        <div className="border border-gray-200 rounded-md shadow-sm">
            {/* Onglets */}
            <div className="flex border-b border-gray-200">
                <button
                    className={`px-4 py-2 text-sm font-medium ${
                        activeTab === 'validations'
                            ? 'border-b-2 border-blue-500 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab('validations')}
                >
                    Validations
                </button>
                <button
                    className={`px-4 py-2 text-sm font-medium ${
                        activeTab === 'values'
                            ? 'border-b-2 border-blue-500 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab('values')}
                >
                    Valeurs
                </button>
                <button
                    className={`px-4 py-2 text-sm font-medium ${
                        activeTab === 'fields'
                            ? 'border-b-2 border-blue-500 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab('fields')}
                >
                    Champs du formulaire
                </button>
            </div>

            {/* Contenu de l'onglet actif */}
            <div className="p-2">
                {activeTab === 'validations' && (
                    <ValidationsPalette
                        fieldId={fieldId}
                        onAddValidation={onAddValidation}
                    />
                )}
                
                {activeTab === 'values' && (
                    <ValuesWidget
                        onSelectValue={onSelectValue}
                    />
                )}
                
                {activeTab === 'fields' && (
                    <div className="p-3">
                        <p className="text-sm font-medium mb-2">Champs disponibles:</p>
                        <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                            {/* Ce contenu sera rempli dynamiquement dans un composant réel */}
                            <p className="text-sm text-gray-500 italic">
                                Les champs du formulaire seront affichés ici
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ValidationEditorWidget;
