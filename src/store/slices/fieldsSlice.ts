// fieldsSlice.ts - Gestion des champs

import { StateCreator } from 'zustand';
import { CRMState, Field, FieldMeta } from './types';
import { fetchWithAuth } from './api';
import { toast } from 'react-toastify';
import { logger } from '../../lib/logger';

// Types pour ce slice spécifique
export interface FieldsSlice {
  fieldMetaCounts: Record<string | number, FieldMeta>;
  getField: (blockId: string | number, sectionId: string | number, fieldId: string | number) => Field | undefined;
  addFieldToSection: (sectionId: string | number, field: Partial<Field>) => Promise<Field | null>;
  updateField: (fieldId: string | number, fieldData: Partial<Field>) => Promise<void>;
  removeField: (fieldId: string | number) => Promise<void>;
  updateFieldsOrderInSection: (sectionId: string | number, fieldsOrder: { id: string | number; order: number }[]) => Promise<void>;
  moveFieldToSection: (fieldId: string | number, sourceSectionId: string | number, targetSectionId: string | number, newOrder: number) => Promise<void>;
  fetchFieldMetaCounts: (fieldIds: (string | number)[]) => Promise<void>;
  addOptionToField: (fieldId: string | number, option: { label: string; value?: string }) => Promise<void>;
  removeOptionFromField: (fieldId: string | number, optionId: string | number) => Promise<void>;
}

// Création du slice
export const createFieldsSlice: StateCreator<
  CRMState,
  [],
  [],
  FieldsSlice
> = (set, get) => ({
  fieldMetaCounts: {},
  
  getField: (blockId, sectionId, fieldId) => {
    const block = get().blocks.find(b => String(b.id) === String(blockId));
    if (!block) return undefined;
    
    const section = block.sections.find(s => String(s.id) === String(sectionId));
    if (!section) return undefined;
    
    return section.fields.find(f => String(f.id) === String(fieldId));
  },
  
  addFieldToSection: async (sectionId: string | number, field: Partial<Field>) => {
    // Vérification label non vide
    if (!field.label || field.label.trim() === "") {
      toast.error("Le label du champ est obligatoire.");
      throw new Error("Le label du champ est obligatoire.");
    }

    const stateBeforeUpdate = get();

    try {
      const res = await fetchWithAuth(`/api/sections/${sectionId}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(field),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Une erreur inattendue est survenue" }));
        toast.error(err.error || "Erreur lors de l'ajout du champ");
        throw new Error(err.error || "Erreur lors de l'ajout du champ");
      }

      const updatedBlock = await res.json();

      set((state) => ({
        blocks: state.blocks.map(b => String(b.id) === String(updatedBlock.id) ? updatedBlock : b),
      }));

      // On cherche le champ créé pour le retourner (utile pour l'UI)
      const section = updatedBlock.sections.find((s: Record<string, unknown>) => String(s.id) === String(sectionId));
      const createdField = section?.fields.find((f: Field) => 
        f.label === field.label && 
        !stateBeforeUpdate.blocks.flatMap(b => b.sections)
          .flatMap(s => s.fields)
          .some(oldField => oldField.id === f.id)
      );

      if (createdField) {
        get().fetchFieldMetaCounts([createdField.id]);
      }

      toast.success("Champ ajouté avec succès !");
      return createdField || null;

    } catch (err: unknown) {
      logger.error('[CRMStore] addFieldToSection error:', err);
      toast.error(err.message || "Une erreur est survenue.");
      set({ blocks: stateBeforeUpdate.blocks });
      throw err;
    }
  },
  
  updateField: async (fieldId, fieldData) => {
    const { options, ...otherFieldData } = fieldData;
    const body = { ...otherFieldData };

    logger.debug('[fieldsSlice] updateField - fieldId:', fieldId);
    logger.debug('[fieldsSlice] updateField - fieldData reçu:', fieldData);
    logger.debug('[fieldsSlice] updateField - body envoyé:', body);

    const res = await fetchWithAuth(`/api/fields/${fieldId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      logger.error('[fieldsSlice] updateField - Erreur:', errorText);
      toast.error(`Erreur lors de la mise à jour du champ: ${errorText}`);
      throw new Error(`Failed to update field: ${errorText}`);
    }

    const updatedField = await res.json();
    logger.debug('[fieldsSlice] updateField - updatedField reçu du serveur:', updatedField);
    logger.debug('[fieldsSlice] updateField - advancedConfig dans updatedField:', updatedField?.advancedConfig);

    set((state) => ({
      blocks: state.blocks.map(block => ({
        ...block,
        sections: block.sections.map(section => ({
          ...section,
          fields: section.fields.map((f: Field) => {
            if (String(f.id) === String(fieldId)) {
              logger.debug('[fieldsSlice] Avant mise à jour - field actuel:', f);
              logger.debug('[fieldsSlice] Avant mise à jour - advancedConfig actuel:', f.advancedConfig);
              const newField = { ...f, ...updatedField, options: f.options };
              logger.debug('[fieldsSlice] Après mise à jour - nouveau field:', newField);
              logger.debug('[fieldsSlice] Après mise à jour - nouveau advancedConfig:', newField.advancedConfig);
              return newField;
            }
            return f;
          })
        }))
      })),
    }));
    
    get().fetchFieldMetaCounts([fieldId]);
    
    // 🔧 FIX: Recharger les blocks depuis la base de données pour avoir les données fraîches
    logger.debug('[fieldsSlice] Rechargement des blocks après updateField...');
    // Réinitialiser le TTL pour forcer le rechargement
    const currentState = get();
    set({ ...currentState, _lastBlocksFetch: 0 });
    get().fetchBlocks();
  },
  
  removeField: async (fieldId: string | number) => {
    const stateBeforeUpdate = get();
    try {
      // Optimistic UI update
      set((state) => ({
        blocks: state.blocks.map(block => ({
          ...block,
          sections: (block.sections ?? []).map(section => ({
            ...section,
            fields: (section.fields ?? []).filter(f => String(f.id) !== String(fieldId)),
          })),
        })),
      }));

      const res = await fetchWithAuth(`/api/fields/${fieldId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Une erreur inattendue est survenue lors de la suppression du champ" }));
        toast.error(err.error || "Erreur lors de la suppression du champ");
        throw new Error(err.error || "Erreur lors de la suppression du champ");
      }
      
      toast.success("Champ supprimé avec succès !");
    } catch (error) {
      logger.error("Erreur dans removeField:", error);
      toast.error("La suppression du champ a échoué. Restauration de l'état.");
      set({ blocks: stateBeforeUpdate.blocks });
    }
  },
  
  updateFieldsOrderInSection: async (sectionId: string | number, fieldsOrder: { id: string | number; order: number }[]) => {
    const res = await fetchWithAuth(`/api/sections/${sectionId}/fields/order`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: fieldsOrder }),
    });
    const updatedBlock = await res.json();
    set((state) => ({
      blocks: state.blocks.map(b => String(b.id) === String(updatedBlock.id) ? updatedBlock : b),
    }));
  },
  
  moveFieldToSection: async (fieldId, sourceSectionId, targetSectionId, newOrder) => {
    try {
      const res = await fetchWithAuth(`/api/fields/${fieldId}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceSectionId, targetSectionId, newOrder }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors du déplacement du champ");
      }

      const updatedBlock = await res.json();
      
      set((state) => ({
        blocks: state.blocks.map(b => String(b.id) === String(updatedBlock.id) ? updatedBlock : b),
      }));
      
      toast.success("Champ déplacé avec succès !");
    } catch (err: unknown) {
      toast.error(err.message);
      logger.error('[CRMStore] moveFieldToSection error:', err);
    }
  },
  
  fetchFieldMetaCounts: async (fieldIds) => {
    if (!fieldIds || fieldIds.length === 0) {
      return;
    }
    try {
      const res = await fetchWithAuth(`/api/fields/meta-counts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldIds }),
      });
      
      if (!res.ok) {
        logger.error('Erreur lors de la récupération des métadonnées des champs');
        return;
      }
      
      const metaCounts = await res.json();
      set((state) => ({
        fieldMetaCounts: {
          ...state.fieldMetaCounts,
          ...metaCounts,
        },
      }));
    } catch (err) {
      logger.error('Impossible de contacter le serveur pour les métadonnées des champs.', err);
    }
  },
  
  addOptionToField: async (fieldId, option) => {
    try {
      const res = await fetchWithAuth(`/api/fields/${fieldId}/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(option),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de l'ajout de l'option");
      }
      
      const updatedField = await res.json();
      
      // Mise à jour optimiste du state
      set(state => {
        const newBlocks = state.blocks.map(block => ({
          ...block,
          sections: block.sections.map(section => ({
            ...section,
            fields: section.fields.map((f) => {
              if (String(f.id) === String(fieldId)) {
                return updatedField;
              }
              return f;
            }),
          })),
        }));
        return { blocks: newBlocks };
      });
      
      toast.success("Option ajoutée avec succès !");
    } catch (err: unknown) {
      toast.error(err.message);
      logger.error('[CRMStore] addOptionToField error:', err);
      throw err;
    }
  },
  
  removeOptionFromField: async (fieldId, optionId) => {
    try {
      const res = await fetchWithAuth(`/api/fields/${fieldId}/options/${optionId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de la suppression de l'option");
      }
      
      const updatedField = await res.json();
      
      // Mise à jour optimiste du state
      set(state => {
        const newBlocks = state.blocks.map(block => ({
          ...block,
          sections: block.sections.map(section => ({
            ...section,
            fields: section.fields.map((f) => {
              if (String(f.id) === String(fieldId)) {
                return updatedField;
              }
              return f;
            }),
          })),
        }));
        return { blocks: newBlocks };
      });
      
      toast.success("Option supprimée avec succès !");
    } catch (err: unknown) {
      toast.error(err.message);
      logger.error('[CRMStore] removeOptionFromField error:', err);
      throw err;
    }
  },
});

