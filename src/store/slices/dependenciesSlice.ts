import { StateCreator } from 'zustand';
import { CRMState } from './types';
import { fetchWithAuth } from './api';

export interface DependenciesSlice {
  // Actions pour les dépendances
  createDependency: (fieldId: string, dependencyData: any) => Promise<any>;
  updateDependency: (dependencyId: string, data: any) => Promise<void>;
  deleteDependency: (dependencyId: string) => Promise<void>;
  getFieldDependencies: (fieldId: string) => any[] | undefined;
  reorderDependencies: (fieldId: string, oldIndex: number, newIndex: number) => Promise<void>;
}

// Fonction utilitaire pour déplacer un élément dans un tableau
const arrayMove = (array: any[], fromIndex: number, toIndex: number) => {
  const result = [...array];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
};

export const createDependenciesSlice: StateCreator<
  CRMState,
  [],
  [],
  DependenciesSlice
> = (set, get) => ({
  createDependency: async (fieldId, dependencyData) => {
    console.log(`[CRMStore][createDependency] Creating dependency for field ${fieldId}:`, dependencyData);
    
    try {
      const res = await fetchWithAuth(`/api/fields/${fieldId}/dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dependencyData),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de la création de la dépendance");
      }
      
      const updatedDependencies = await res.json();
      console.log(`[CRMStore][createDependency] Received dependencies:`, updatedDependencies);
      
      // Mise à jour du state
      set(state => {
        const newBlocks = state.blocks.map(block => ({
          ...block,
          sections: block.sections.map(section => ({
            ...section,
            fields: section.fields.map((f) => {
              if (String(f.id) === String(fieldId)) {
                return { ...f, dependencies: updatedDependencies };
              }
              return f;
            }),
          })),
        }));
        return { blocks: newBlocks };
      });
      
      // On trouve la nouvelle dépendance pour la retourner
      const latestState = get();
      const field = latestState.blocks
        .flatMap(b => b.sections)
        .flatMap(s => s.fields)
        .find(f => String(f.id) === String(fieldId));
        
      // On utilise une heuristique pour retrouver la nouvelle dépendance
      // (par ex. la dernière ajoutée ou celle qui correspond aux données envoyées)
      const newDependency = field?.dependencies?.[field.dependencies.length - 1];
      
      return newDependency || null;
    } catch (err: any) {
      console.error('[CRMStore][createDependency] Error:', err);
      throw err;
    }
  },
  
  updateDependency: async (dependencyId, data) => {
    console.log(`[CRMStore][updateDependency] Updating dependency ${dependencyId}:`, data);
    const stateBeforeUpdate = get();
    
    // Trouver le field qui contient cette dépendance
    let fieldId: string | undefined;
    let originalDependency: any = undefined;
    
    stateBeforeUpdate.blocks.forEach(block => {
      block.sections.forEach(section => {
        section.fields.forEach(field => {
          if (field.dependencies) {
            const foundDependency = field.dependencies.find(d => String(d.id) === String(dependencyId));
            if (foundDependency) {
              fieldId = field.id;
              originalDependency = foundDependency;
            }
          }
        });
      });
    });
    
    if (!fieldId || !originalDependency) {
      console.error(`[CRMStore][updateDependency] Dependency ${dependencyId} not found in any field`);
      throw new Error("Dépendance non trouvée");
    }
    
    // Mise à jour optimiste
    set(state => {
      const newBlocks = state.blocks.map(block => ({
        ...block,
        sections: block.sections.map(section => ({
          ...section,
          fields: section.fields.map((f) => {
            if (String(f.id) === String(fieldId) && f.dependencies) {
              return {
                ...f,
                dependencies: f.dependencies.map(dependency =>
                  String(dependency.id) === String(dependencyId) 
                    ? { ...dependency, ...data }
                    : dependency
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
      // Fusionner les données originales avec les mises à jour
      const finalData = { ...originalDependency, ...data };
      
      const res = await fetchWithAuth(`/api/dependencies/${dependencyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de la mise à jour de la dépendance");
      }
      
      const updatedDependencies = await res.json();
      
      // Mise à jour avec les données du serveur
      const finalFieldId = fieldId; // Capture pour le closure
      set(state => {
        const newBlocks = state.blocks.map(block => ({
          ...block,
          sections: block.sections.map(section => ({
            ...section,
            fields: section.fields.map((f) => {
              if (String(f.id) === String(finalFieldId)) {
                return { ...f, dependencies: updatedDependencies };
              }
              return f;
            }),
          })),
        }));
        return { blocks: newBlocks };
      });
      
      console.log(`[CRMStore][updateDependency] Dependency updated successfully`);
    } catch (err: any) {
      console.error('[CRMStore][updateDependency] Error:', err);
      // Rollback en cas d'erreur
      set({ blocks: stateBeforeUpdate.blocks });
      throw err;
    }
  },
  
  deleteDependency: async (dependencyId) => {
    console.log(`[CRMStore][deleteDependency] Deleting dependency ${dependencyId}`);
    const stateBeforeUpdate = get();
    
    // Trouver le field qui contient cette dépendance
    let fieldId: string | undefined;
    
    stateBeforeUpdate.blocks.forEach(block => {
      block.sections.forEach(section => {
        section.fields.forEach(field => {
          if (field.dependencies && field.dependencies.some(d => String(d.id) === String(dependencyId))) {
            fieldId = field.id;
          }
        });
      });
    });
    
    if (!fieldId) {
      console.error(`[CRMStore][deleteDependency] Dependency ${dependencyId} not found in any field`);
      throw new Error("Dépendance non trouvée");
    }
    
    // Mise à jour optimiste
    set(state => {
      const newBlocks = state.blocks.map(block => ({
        ...block,
        sections: block.sections.map(section => ({
          ...section,
          fields: section.fields.map((f) => {
            if (String(f.id) === String(fieldId) && f.dependencies) {
              return {
                ...f,
                dependencies: f.dependencies.filter(d => String(d.id) !== String(dependencyId))
              };
            }
            return f;
          }),
        })),
      }));
      return { blocks: newBlocks };
    });
    
    try {
      const res = await fetchWithAuth(`/api/dependencies/${dependencyId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de la suppression de la dépendance");
      }
      
      const updatedDependencies = await res.json();
      
      // Mise à jour avec les données du serveur
      const finalFieldId = fieldId; // Capture pour le closure
      set(state => {
        const newBlocks = state.blocks.map(block => ({
          ...block,
          sections: block.sections.map(section => ({
            ...section,
            fields: section.fields.map((f) => {
              if (String(f.id) === String(finalFieldId)) {
                return { ...f, dependencies: updatedDependencies };
              }
              return f;
            }),
          })),
        }));
        return { blocks: newBlocks };
      });
      
      console.log(`[CRMStore][deleteDependency] Dependency deleted successfully`);
    } catch (err: any) {
      console.error('[CRMStore][deleteDependency] Error:', err);
      // Rollback en cas d'erreur
      set({ blocks: stateBeforeUpdate.blocks });
      throw err;
    }
  },
  
  getFieldDependencies: (fieldId) => {
    const state = get();
    for (const block of state.blocks) {
      for (const section of block.sections) {
        for (const field of section.fields) {
          if (String(field.id) === String(fieldId)) {
            return field.dependencies;
          }
        }
      }
    }
    return undefined;
  },
  
  reorderDependencies: async (fieldId, oldIndex, newIndex) => {
    console.log(`[CRMStore][reorderDependencies] Reordering dependencies for field ${fieldId} from ${oldIndex} to ${newIndex}`);
    let fieldToUpdate: any | undefined;
    let reorderedDependencies: any[] | undefined;
    const stateBeforeUpdate = get();

    set(state => {
      const newBlocks = state.blocks.map(block => ({
        ...block,
        sections: block.sections.map(section => ({
          ...section,
          fields: section.fields.map(f => {
            if (String(f.id) === String(fieldId) && f.dependencies) {
              reorderedDependencies = arrayMove(f.dependencies, oldIndex, newIndex);
              fieldToUpdate = { ...f, dependencies: reorderedDependencies };
              return fieldToUpdate;
            }
            return f;
          }),
        })),
      }));
      return { blocks: newBlocks };
    });

    if (fieldToUpdate && reorderedDependencies) {
      try {
        const res = await fetchWithAuth(`/api/fields/${fieldId}/reorder-dependencies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dependencyIds: reorderedDependencies.map(d => d.id) }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Erreur lors de la mise à jour de l'ordre des dépendances");
        }
        
        console.log(`[CRMStore][reorderDependencies] Dependencies order updated successfully`);
      } catch (err: any) {
        console.error('[CRMStore][reorderDependencies] API error:', err);
        // Rollback en cas d'erreur
        set({ blocks: stateBeforeUpdate.blocks });
        throw err;
      }
    }
  }
});

