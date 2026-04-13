import { StateCreator } from 'zustand';
import { CRMState } from './types';
import { fetchWithAuth } from './api';
import { logger } from '../../lib/logger';

export interface ValidationSlice {
  // Actions pour les validations
  createValidation: (fieldId: string, validationData: unknown) => Promise<unknown>;
  updateValidation: (validationId: string, data: unknown) => Promise<void>;
  deleteValidation: (validationId: string) => Promise<void>;
  getFieldValidations: (fieldId: string) => any[] | undefined;
  reorderValidations: (fieldId: string, oldIndex: number, newIndex: number) => Promise<void>;
}

// Fonction utilitaire pour déplacer un élément dans un tableau
const arrayMove = (array: unknown[], fromIndex: number, toIndex: number) => {
  const result = [...array];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
};

export const createValidationSlice: StateCreator<
  CRMState,
  [],
  [],
  ValidationSlice
> = (set, get) => ({
  createValidation: async (fieldId, validationData) => {
    try {
      logger.debug(`[CRMStore][createValidation] Creating validation for field ${fieldId}:`, validationData);
      
      const res = await fetchWithAuth(`/api/fields/${fieldId}/validations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validationData),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de la création de la validation");
      }
      
      const updatedValidations = await res.json();
      logger.debug(`[CRMStore][createValidation] Received validations:`, updatedValidations);
      
      // Mise à jour du state
      set(state => {
        const newBlocks = state.blocks.map(block => ({
          ...block,
          sections: block.sections.map(section => ({
            ...section,
            fields: section.fields.map((f) => {
              if (String(f.id) === String(fieldId)) {
                return { ...f, validations: updatedValidations };
              }
              return f;
            }),
          })),
        }));
        return { blocks: newBlocks };
      });
      
      // On trouve la nouvelle validation par son nom/type pour la retourner
      const latestState = get();
      const field = latestState.blocks
        .flatMap(b => b.sections)
        .flatMap(s => s.fields)
        .find(f => String(f.id) === String(fieldId));
        
      const newValidation = field?.validations?.find(v => 
        v.type === validationData.type && v.params?.value === validationData.params?.value
      );
      
      return newValidation || null;
    } catch (err: unknown) {
      logger.error('[CRMStore][createValidation] Error:', err);
      throw err;
    }
  },
  
  updateValidation: async (validationId, data) => {
    const stateBeforeUpdate = get();
    logger.debug(`[CRMStore][updateValidation] Updating validation ${validationId}:`, data);
    
    // Trouver le field qui contient cette validation
    let fieldId: string | undefined;
    let originalValidation: unknown = undefined;
    
    stateBeforeUpdate.blocks.forEach(block => {
      block.sections.forEach(section => {
        section.fields.forEach(field => {
          if (field.validations) {
            const foundValidation = field.validations.find(v => String(v.id) === String(validationId));
            if (foundValidation) {
              fieldId = field.id;
              originalValidation = foundValidation;
            }
          }
        });
      });
    });
    
    if (!fieldId || !originalValidation) {
      logger.error(`[CRMStore][updateValidation] Validation ${validationId} not found in any field`);
      throw new Error("Validation non trouvée");
    }
    
    // Mise à jour optimiste
    set(state => {
      const newBlocks = state.blocks.map(block => ({
        ...block,
        sections: block.sections.map(section => ({
          ...section,
          fields: section.fields.map((f) => {
            if (String(f.id) === String(fieldId) && f.validations) {
              return {
                ...f,
                validations: f.validations.map(validation =>
                  String(validation.id) === String(validationId) 
                    ? { ...validation, ...data }
                    : validation
                )
              };
            }
            return f;
          }),
        })),
      }));
      return { blocks: newBlocks };
    });
    
    try {
      const finalData = { ...originalValidation, ...data };
      const res = await fetchWithAuth(`/api/validations/${validationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de la mise à jour de la validation");
      }
      
      const updatedValidations = await res.json();
      
      // Mise à jour avec les données du serveur
      const finalFieldId = fieldId; // Capture pour le closure
      set(state => {
        const newBlocks = state.blocks.map(block => ({
          ...block,
          sections: block.sections.map(section => ({
            ...section,
            fields: section.fields.map((f) => {
              if (String(f.id) === String(finalFieldId)) {
                return { ...f, validations: updatedValidations };
              }
              return f;
            }),
          })),
        }));
        return { blocks: newBlocks };
      });
      
      logger.debug(`[CRMStore][updateValidation] Validation updated successfully`);
    } catch (err: unknown) {
      logger.error('[CRMStore][updateValidation] Error:', err);
      // Rollback en cas d'erreur
      set({ blocks: stateBeforeUpdate.blocks });
      throw err;
    }
  },
  
  deleteValidation: async (validationId) => {
    const stateBeforeUpdate = get();
    logger.debug(`[CRMStore][deleteValidation] Deleting validation ${validationId}`);
    
    // Trouver le field qui contient cette validation
    let fieldId: string | undefined;
    
    stateBeforeUpdate.blocks.forEach(block => {
      block.sections.forEach(section => {
        section.fields.forEach(field => {
          if (field.validations && field.validations.some(v => String(v.id) === String(validationId))) {
            fieldId = field.id;
          }
        });
      });
    });
    
    if (!fieldId) {
      logger.error(`[CRMStore][deleteValidation] Validation ${validationId} not found in any field`);
      throw new Error("Validation non trouvée");
    }
    
    // Mise à jour optimiste
    set(state => {
      const newBlocks = state.blocks.map(block => ({
        ...block,
        sections: block.sections.map(section => ({
          ...section,
          fields: section.fields.map((f) => {
            if (String(f.id) === String(fieldId) && f.validations) {
              return {
                ...f,
                validations: f.validations.filter(v => String(v.id) !== String(validationId))
              };
            }
            return f;
          }),
        })),
      }));
      return { blocks: newBlocks };
    });
    
    try {
      const res = await fetchWithAuth(`/api/validations/${validationId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de la suppression de la validation");
      }
      
      const updatedValidations = await res.json();
      
      // Mise à jour avec les données du serveur
      const finalFieldId = fieldId; // Capture pour le closure
      set(state => {
        const newBlocks = state.blocks.map(block => ({
          ...block,
          sections: block.sections.map(section => ({
            ...section,
            fields: section.fields.map((f) => {
              if (String(f.id) === String(finalFieldId)) {
                return { ...f, validations: updatedValidations };
              }
              return f;
            }),
          })),
        }));
        return { blocks: newBlocks };
      });
      
      logger.debug(`[CRMStore][deleteValidation] Validation deleted successfully`);
    } catch (err: unknown) {
      logger.error('[CRMStore][deleteValidation] Error:', err);
      // Rollback en cas d'erreur
      set({ blocks: stateBeforeUpdate.blocks });
      throw err;
    }
  },
  
  getFieldValidations: (fieldId) => {
    const state = get();
    for (const block of state.blocks) {
      for (const section of block.sections) {
        for (const field of section.fields) {
          if (String(field.id) === String(fieldId)) {
            return field.validations;
          }
        }
      }
    }
    return undefined;
  },
  
  reorderValidations: async (fieldId, oldIndex, newIndex) => {
    logger.debug(`[CRMStore][reorderValidations] Reordering validations for field ${fieldId} from ${oldIndex} to ${newIndex}`);
    let fieldToUpdate: unknown | undefined;
    let reorderedValidations: unknown[] | undefined;
    const stateBeforeUpdate = get();

    set(state => {
      const newBlocks = state.blocks.map(block => ({
        ...block,
        sections: block.sections.map(section => ({
          ...section,
          fields: section.fields.map(f => {
            if (String(f.id) === String(fieldId) && f.validations) {
              reorderedValidations = arrayMove(f.validations, oldIndex, newIndex);
              fieldToUpdate = { ...f, validations: reorderedValidations };
              return fieldToUpdate;
            }
            return f;
          }),
        })),
      }));
      return { blocks: newBlocks };
    });

    if (fieldToUpdate && reorderedValidations) {
      try {
        const res = await fetchWithAuth(`/api/fields/${fieldId}/reorder-validations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ validationIds: reorderedValidations.map(v => v.id) }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Erreur lors de la mise à jour de l'ordre des validations");
        }
        
        logger.debug(`[CRMStore][reorderValidations] Validation order updated successfully`);
      } catch (err: unknown) {
        logger.error('[CRMStore][reorderValidations] API error:', err);
        // Rollback en cas d'erreur
        set({ blocks: stateBeforeUpdate.blocks });
        throw err;
      }
    }
  }
});

