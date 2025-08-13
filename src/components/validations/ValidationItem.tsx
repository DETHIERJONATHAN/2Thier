import React, { useState } from 'react';
import { getValidationLabel } from '../../utils/validationHelper';

interface ValidationItemProps {
    id: string;
    type: string;
    message?: string;
    params?: Record<string, any>;
    active?: boolean;
    onUpdate?: (id: string, updates: any) => void;
    onDelete?: (id: string) => void;
}

/**
 * Composant pour afficher et éditer une validation unique
 */
const ValidationItem: React.FC<ValidationItemProps> = ({
    id,
    type,
    message = '',
    params = {},
    active = true,
    onUpdate,
    onDelete
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editMessage, setEditMessage] = useState(message);
    const [isActive, setIsActive] = useState(active);
    const [editParams, setEditParams] = useState<Record<string, any>>(params);

    // Gestion de la mise à jour
    const handleUpdate = () => {
        if (onUpdate) {
            onUpdate(id, {
                message: editMessage,
                active: isActive,
                params: editParams
            });
        }
        setIsEditing(false);
    };

    // Définir les champs à afficher selon le type de validation
    const renderParamsFields = () => {
        switch (type) {
            case 'min_value':
            case 'max_value':
                return (
                    <div className="flex items-center mt-2">
                        <label className="text-xs mr-2">Valeur:</label>
                        <input
                            type="number"
                            className="border border-gray-300 rounded px-2 py-1 text-sm w-20"
                            value={editParams.value || ''}
                            onChange={(e) => setEditParams({ ...editParams, value: e.target.value })}
                        />
                    </div>
                );
            
            case 'min_length':
            case 'max_length':
                return (
                    <div className="flex items-center mt-2">
                        <label className="text-xs mr-2">Longueur:</label>
                        <input
                            type="number"
                            className="border border-gray-300 rounded px-2 py-1 text-sm w-20"
                            value={editParams.length || ''}
                            onChange={(e) => setEditParams({ ...editParams, length: e.target.value })}
                        />
                    </div>
                );
            
            case 'regex':
                return (
                    <div className="flex items-center mt-2">
                        <label className="text-xs mr-2">Pattern:</label>
                        <input
                            type="text"
                            className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
                            value={editParams.pattern || ''}
                            onChange={(e) => setEditParams({ ...editParams, pattern: e.target.value })}
                        />
                    </div>
                );
            
            case 'compare_fields':
                return (
                    <div className="flex flex-col gap-2 mt-2">
                        <div className="flex items-center">
                            <label className="text-xs mr-2">Champ cible:</label>
                            <input
                                type="text"
                                className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
                                value={editParams.targetField || ''}
                                onChange={(e) => setEditParams({ ...editParams, targetField: e.target.value })}
                            />
                        </div>
                        <div className="flex items-center">
                            <label className="text-xs mr-2">Opérateur:</label>
                            <select
                                className="border border-gray-300 rounded px-2 py-1 text-sm"
                                value={editParams.operator || '=='}
                                onChange={(e) => setEditParams({ ...editParams, operator: e.target.value })}
                            >
                                <option value="==">Égal (==)</option>
                                <option value="!=">Différent (!=)</option>
                                <option value=">">Supérieur à (&gt;)</option>
                                <option value="<">Inférieur à (&lt;)</option>
                                <option value=">=">Supérieur ou égal (&gt;=)</option>
                                <option value="<=">Inférieur ou égal (&lt;=)</option>
                            </select>
                        </div>
                    </div>
                );
            
            case 'conditional':
                return (
                    <div className="flex flex-col gap-2 mt-2">
                        <div className="flex items-center">
                            <label className="text-xs mr-2">Condition:</label>
                            <input
                                type="text"
                                className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
                                placeholder="field1 == 'valeur'"
                                value={editParams.condition || ''}
                                onChange={(e) => setEditParams({ ...editParams, condition: e.target.value })}
                            />
                        </div>
                        <div className="flex items-center">
                            <label className="text-xs mr-2">Validation:</label>
                            <input
                                type="text"
                                className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
                                placeholder="Type de validation"
                                value={editParams.validation || ''}
                                onChange={(e) => setEditParams({ ...editParams, validation: e.target.value })}
                            />
                        </div>
                    </div>
                );
            
            default:
                return null;
        }
    };

    return (
        <div className={`border rounded-md p-3 mb-2 ${isActive ? 'bg-white' : 'bg-gray-100'}`}>
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                    <span className="font-medium text-sm">{getValidationLabel(type)}</span>
                    <span className={`ml-2 px-1.5 py-0.5 text-xs rounded ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                        {isActive ? 'Actif' : 'Inactif'}
                    </span>
                </div>
                <div className="flex gap-1">
                    <button
                        type="button"
                        onClick={() => setIsEditing(!isEditing)}
                        className="text-blue-500 hover:text-blue-700 text-sm"
                    >
                        {isEditing ? 'Annuler' : 'Modifier'}
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete?.(id)}
                        className="text-red-500 hover:text-red-700 text-sm ml-2"
                    >
                        Supprimer
                    </button>
                </div>
            </div>

            {isEditing ? (
                <div className="mt-2">
                    <div className="mb-2">
                        <label className="block text-xs mb-1">Message d'erreur:</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            value={editMessage}
                            onChange={(e) => setEditMessage(e.target.value)}
                        />
                    </div>
                    
                    <div className="mb-2">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                className="mr-2"
                            />
                            <span className="text-xs">Validation active</span>
                        </label>
                    </div>
                    
                    {renderParamsFields()}
                    
                    <div className="flex justify-end mt-3">
                        <button
                            type="button"
                            onClick={handleUpdate}
                            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                        >
                            Enregistrer
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-sm text-gray-600">{message || `Validation de type ${type}`}</div>
            )}
        </div>
    );
};

export default ValidationItem;
