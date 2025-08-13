import React, { useCallback, useMemo, memo } from 'react';
import useCRMStore from '../../store';
import type { FormulaItem, Block, Section, Field } from '../../store/slices/types';

interface FieldsPaletteProps {
    formulaId: string | undefined;
    currentFieldId?: string; // ID du champ actuel (pour éviter de l'ajouter à la formule)
}

interface SimpleField {
    id: string;
    label: string;
    sectionName?: string;
    blockName?: string;
}

/**
 * Palette de sélection des champs disponibles pour les formules
 */
// Composant mémorisé pour éviter les re-rendus inutiles
export const FieldsPalette: React.FC<FieldsPaletteProps> = memo(({ formulaId, currentFieldId }) => {
    // Extraction simplifiée des blocs du store
    const blocks = useCRMStore(state => state.blocks);
    
    // Transformation des données en liste de champs utilisables
    const allFields = useMemo(() => {
        const fields: SimpleField[] = [];
        
        blocks.forEach((block: Block) => {
            block.sections.forEach((section: Section) => {
                section.fields.forEach((field: Field) => {
                    // Éviter d'inclure le champ actuel dans la liste
                    if (field.id !== currentFieldId) {
                        fields.push({
                            id: field.id,
                            label: field.label || field.id,
                            sectionName: section.name,
                            blockName: block.name
                        });
                    }
                });
            });
        });
        
        return fields;
    }, [blocks, currentFieldId]);

    // Organisation des champs par section pour une meilleure lisibilité
    const fieldsBySection = useMemo(() => {
        const sections: Record<string, SimpleField[]> = {};
        
        allFields.forEach(field => {
            const sectionKey = `${field.blockName || 'Sans bloc'} > ${field.sectionName || 'Sans section'}`;
            
            if (!sections[sectionKey]) {
                sections[sectionKey] = [];
            }
            
            sections[sectionKey].push(field);
        });
        
        return sections;
    }, [allFields]);
    
    const addFieldToFormula = useCallback((fieldId: string, fieldLabel: string) => {
        if (!formulaId) {
            console.error(`[FieldsPalette] ❌ Impossible d'ajouter le champ: formulaId manquant`);
            return;
        }
        
        console.log(`[FieldsPalette] ➕ Ajout du champ "${fieldLabel}" (${fieldId}) à la formule ${formulaId}`);
        
        // Obtenir la dernière version du store
        const store = useCRMStore.getState();
        
        // Trouver la formule actuelle
        let currentFormula = null;
        
        outerLoop: for (const block of store.blocks) {
            for (const section of block.sections) {
                for (const field of section.fields) {
                    if (!field.formulas || !Array.isArray(field.formulas)) continue;
                    
                    const foundFormula = field.formulas.find(f => f && f.id === formulaId);
                    if (foundFormula) {
                        currentFormula = foundFormula;
                        console.log(`[FieldsPalette] ✅ Formule trouvée dans le champ ${field.id}`);
                        break outerLoop;
                    }
                }
            }
        }
        
        if (!currentFormula) {
            console.error(`[FieldsPalette] ❌ Formule ${formulaId} introuvable dans le store`);
            return;
        }
        
        // Créer l'élément de champ
        const newField: FormulaItem = {
            type: 'field' as const,
            id: fieldId,
            value: fieldId,
            label: fieldLabel
        };
        
        // Ajouter le champ à la séquence existante
        const currentSequence = Array.isArray(currentFormula.sequence) ? currentFormula.sequence : [];
        const newSequence = [...currentSequence, newField];
        
        console.log(`[FieldsPalette] 📊 Ajout du champ à la séquence: ${currentSequence.length} => ${newSequence.length} items`);
        
        // Mettre à jour la formule avec la nouvelle séquence
        const { updateFormula } = useCRMStore.getState();
        updateFormula(formulaId, { sequence: newSequence });
        
    }, [formulaId]);
    
    return (
        <div className="mt-4 p-2 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm font-medium mb-2">Champs disponibles:</p>
            
            {Object.keys(fieldsBySection).length === 0 ? (
                <p className="text-xs text-gray-400 italic">Aucun champ disponible</p>
            ) : (
                <div className="space-y-4">
                    {Object.entries(fieldsBySection).map(([sectionName, fields]) => (
                        <div key={sectionName} className="space-y-1">
                            <p className="text-xs text-gray-500 font-medium">{sectionName}:</p>
                            <div className="flex flex-wrap gap-2">
                                {fields.map((field) => (
                                    <button
                                        key={field.id}
                                        type="button"
                                        title={`${field.label} (${field.id})`}
                                        className="px-2 py-1 bg-blue-100 border border-blue-300 rounded text-sm hover:bg-blue-200 truncate max-w-[150px]"
                                        onClick={() => addFieldToFormula(field.id, field.label)}
                                        draggable="true"
                                        onDragStart={(e) => {
                                            console.log(`[FIELD_PALETTE_DRAG] Starting drag for field: ${field.id} (${field.label})`);
                                            e.dataTransfer.setData('field-id', field.id);
                                            e.dataTransfer.setData('field-label', field.label);
                                            e.dataTransfer.setData('formula-element-type', 'field');
                                            e.dataTransfer.setData('text/plain', `${field.label} (${field.id})`);
                                            e.dataTransfer.effectAllowed = 'copy';
                                        }}
                                    >
                                        {field.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});
