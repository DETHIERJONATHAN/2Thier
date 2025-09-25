import React, { useCallback, memo } from 'react';

// Liste des valeurs spéciales disponibles
const SPECIAL_VALUES = [
    { 
        value: 'true', 
        label: 'Vrai', 
        color: 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200',
        description: 'Valeur booléenne vraie - Utile pour les conditions et les comparaisons'
    },
    { 
        value: 'false', 
        label: 'Faux', 
        color: 'bg-red-100 border-red-300 text-red-800 hover:bg-red-200',
        description: 'Valeur booléenne fausse - Utile pour les conditions et les comparaisons'
    },
    { 
        value: 'null', 
        label: 'Null', 
        color: 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200',
        description: 'Valeur nulle - Représente l\'absence intentionnelle d\'une valeur'
    },
    { 
        value: 'undefined', 
        label: 'Vide', 
        color: 'bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200',
        description: 'Valeur indéfinie - Représente un champ qui n\'a pas été rempli'
    }
];

// Liste des valeurs numériques rapides
const NUMERIC_VALUES = [
    { value: '0', label: '0', description: 'Valeur numérique zéro' },
    { value: '1', label: '1', description: 'Valeur numérique un' },
    { value: '100', label: '100', description: 'Valeur numérique cent' },
];

interface ValuesWidgetProps {
    onSelectValue?: (value: string) => void;
}

/**
 * Widget pour insérer rapidement des valeurs spéciales ou numériques
 */
const ValuesWidget = memo(({ onSelectValue }: ValuesWidgetProps) => {
    const handleValueClick = useCallback((value: string) => {
        console.log(`[ValuesWidget] Valeur sélectionnée: ${value}`);
        
        if (onSelectValue) {
            onSelectValue(value);
        } else {
            // Pas de callback fourni, copier dans le presse-papier par défaut
            navigator.clipboard.writeText(value)
                .then(() => {
                    console.log(`[ValuesWidget] Valeur copiée dans le presse-papier: ${value}`);
                    
                    // Afficher une notification temporaire
                    const notification = document.createElement('div');
                    notification.textContent = `Valeur copiée: ${value}`;
                    notification.className = 'fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg z-50';
                    document.body.appendChild(notification);
                    
                    // Supprimer la notification après 2 secondes
                    setTimeout(() => {
                        document.body.removeChild(notification);
                    }, 2000);
                })
                .catch(err => {
                    console.error(`[ValuesWidget] Erreur lors de la copie dans le presse-papier:`, err);
                });
        }
    }, [onSelectValue]);
    
    return (
        <div className="p-2 bg-gray-50 rounded-md border border-gray-200">
            {/* Valeurs spéciales */}
            <div className="mb-3">
                <p className="text-sm font-semibold mb-2 text-blue-700">Valeurs spéciales:</p>
                <div className="flex flex-wrap gap-2">
                    {SPECIAL_VALUES.map((val) => (
                        <div key={val.value} className="relative group">
                            <button
                                type="button"
                                className={`px-3 py-1 rounded text-sm ${val.color}`}
                                onClick={() => handleValueClick(val.value)}
                                draggable="true"
                                title={val.label}
                                onDragStart={(e) => {
                                    console.log(`[VALUE_DRAG] Starting drag for value: ${val.value}`);
                                    e.dataTransfer.setData('value-data', val.value);
                                    e.dataTransfer.setData('value-label', val.label);
                                    e.dataTransfer.setData('element-type', 'value');
                                    e.dataTransfer.setData('text/plain', val.value);
                                    e.dataTransfer.effectAllowed = 'copy';
                                }}
                            >
                                {val.label}
                            </button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none z-10 shadow-lg">
                                {val.description}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Valeurs numériques */}
            <div>
                <p className="text-sm font-semibold mb-2 text-blue-700">Valeurs numériques:</p>
                <div className="flex flex-wrap gap-2 items-center">
                    {NUMERIC_VALUES.map((val) => (
                        <div key={val.value} className="relative group">
                            <button
                                type="button"
                                className="w-8 h-8 flex items-center justify-center bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 text-gray-800"
                                onClick={() => handleValueClick(val.value)}
                                draggable="true"
                                title={val.label}
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('value-data', val.value);
                                    e.dataTransfer.setData('value-label', val.label);
                                    e.dataTransfer.setData('element-type', 'value');
                                    e.dataTransfer.setData('text/plain', val.value);
                                    e.dataTransfer.effectAllowed = 'copy';
                                }}
                            >
                                {val.label}
                            </button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none z-10 shadow-lg">
                                {val.description}
                            </div>
                        </div>
                    ))}
                    
                    {/* Champ de valeur personnalisée */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Valeur..."
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const value = (e.target as HTMLInputElement).value;
                                    if (value.trim()) {
                                        handleValueClick(value);
                                        (e.target as HTMLInputElement).value = '';
                                    }
                                }
                            }}
                        />
                        <div className="absolute text-xs text-gray-500 mt-1">
                            Appuyez sur Entrée pour ajouter
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default ValuesWidget;
