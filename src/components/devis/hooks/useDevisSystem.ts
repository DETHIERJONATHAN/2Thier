import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { message } from 'antd';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import { useAuth } from '../../../auth/useAuth';
import { applyValidation } from '../../../utils/validationHelper';
import { evaluateDependency } from '../../../utils/dependencyValidator';
import type { FieldDependency as StoreFieldDependency } from '../../../store/slices/types';
import { DynamicFormulaEngine } from '../../../services/DynamicFormulaEngine';

// Types
export type FieldOption = { id: string; label: string; value?: string };
export type Field = {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  width?: string;
  options?: FieldOption[];
  config?: Record<string, unknown> | null;
  advancedConfig?: Record<string, unknown> | null;
};

export type UploadedFileValue = {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

export function isUploadedFileValue(v: unknown): v is UploadedFileValue {
  if (!v || typeof v !== 'object') return false;
  const obj = v as Record<string, unknown>;
  return typeof obj.name === 'string' && typeof obj.dataUrl === 'string';
}

export type Section = { 
  id: string; 
  name: string; 
  sectionType?: string | null; 
  menuFieldId?: string | null; 
  order?: number; 
  active?: boolean; 
  fields: Field[] 
};

export type Block = { id: string; name?: string; sections: Section[] };
export type LeadData = { devis?: Record<string, Record<string, unknown>> } & Record<string, unknown>;
export type Lead = { id: string; data?: LeadData; name?: string; email?: string; company?: string };

export type FieldUIState = { visible: boolean; disabled: boolean; required: boolean };
export type RuleFormula = { id: string; sequence?: unknown; order?: number; name?: string; targetFieldId?: string };

export type FieldDependency = {
  id: string;
  conditions: Array<{ fieldId: string; operator: string; value: unknown }>;
  actions: Array<{ type: string; value: unknown }>;
};

export interface DevisSystemConfig {
  devisId?: string;
}

export function useDevisSystem(config: DevisSystemConfig = {}) {
  const { devisId } = config;
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('leadId');
  
  const { api } = useAuthenticatedApi();
  const { user } = useAuth();

  // État principal
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [lead, setLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [fieldStates, setFieldStates] = useState<Record<string, FieldUIState>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [archived, setArchived] = useState(false);
  
  // Moteur de formules
  const formulaEngine = useRef(new DynamicFormulaEngine()).current;
  
  // Fonctions utilitaires
  const findFieldById = useCallback((fieldId: string): Field | null => {
    for (const block of blocks) {
      for (const section of block.sections) {
        const field = section.fields.find(f => f.id === fieldId);
        if (field) return field;
      }
    }
    return null;
  }, [blocks]);

  const getAllFields = useCallback((): Field[] => {
    return blocks.flatMap(block => 
      block.sections.flatMap(section => section.fields)
    );
  }, [blocks]);

  // Chargement des données
  const loadBlocks = useCallback(async () => {
    try {
      const response = await api.get('/api/blocks');
      if (!response?.length) {
        console.warn('[DEVIS] Aucun bloc trouvé');
        return;
      }

      const transformedBlocks = response.map((block: any) => {
        if (!block.Section || !Array.isArray(block.Section)) {
          console.warn('[DEVIS] Bloc sans sections:', block.id);
          return { id: block.id, name: block.name || 'Bloc', sections: [] };
        }

        const sections = block.Section
          .filter((s: any) => s.active !== false)
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
          .map((section: any) => {
            const fields = (section.Field || [])
              .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
              .map((field: any) => ({
                id: field.id,
                label: field.label || 'Champ',
                type: field.type || 'text',
                required: field.required || false,
                width: field.width || '1/2',
                options: field.FieldOption ? field.FieldOption
                  .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                  .map((opt: any) => ({
                    id: opt.id,
                    label: opt.label || opt.value || 'Option',
                    value: opt.value || opt.label
                  })) : [],
                config: field.config,
                advancedConfig: field.advancedConfig
              }));

            return {
              id: section.id,
              name: section.name || 'Section',
              sectionType: section.sectionType,
              menuFieldId: section.menuFieldId,
              order: section.order,
              active: section.active,
              fields
            };
          });

        return { id: block.id, name: block.name || 'Bloc', sections };
      });

      setBlocks(transformedBlocks);
    } catch (error) {
      console.error('[DEVIS] Erreur lors du chargement des blocs:', error);
      message.error('Erreur lors du chargement des blocs');
    }
  }, [api]);

  const loadLead = useCallback(async () => {
    if (!leadId) return;

    try {
      const response = await api.get(`/api/leads/${leadId}`);
      if (response) {
        setLead(response);
        
        // Initialiser formData avec les données du lead
        const leadDevisData = response.data?.devis || {};
        const initialFormData: Record<string, unknown> = {};

        // Pré-remplir avec les données du lead
        for (const [blockId, blockData] of Object.entries(leadDevisData)) {
          if (blockData && typeof blockData === 'object') {
            Object.assign(initialFormData, blockData);
          }
        }

        setFormData(initialFormData);
      }
    } catch (error) {
      console.error('[DEVIS] Erreur lors du chargement du lead:', error);
      message.error('Erreur lors du chargement du lead');
    }
  }, [leadId, api]);

  // Validation et dépendances
  const updateFieldStates = useCallback(async () => {
    const newStates: Record<string, FieldUIState> = {};
    const allFields = getAllFields();

    for (const field of allFields) {
      let visible = true;
      let disabled = false;
      let required = field.required || false;

      // Évaluer les dépendances
      if (field.advancedConfig?.dependencies) {
        try {
          const dependencies = field.advancedConfig.dependencies as StoreFieldDependency[];
          for (const dep of dependencies) {
            const result = await evaluateDependency(dep, formData, findFieldById);
            if (!result.visible) visible = false;
            if (result.disabled) disabled = true;
            if (result.required !== undefined) required = result.required;
          }
        } catch (error) {
          console.warn('[DEVIS] Erreur évaluation dépendance:', error);
        }
      }

      newStates[field.id] = { visible, disabled, required };
    }

    setFieldStates(newStates);
  }, [formData, getAllFields, findFieldById]);

  const validateField = useCallback((fieldId: string, value: unknown): string | null => {
    const field = findFieldById(fieldId);
    if (!field) return null;

    const fieldState = fieldStates[fieldId];
    if (!fieldState?.visible) return null;

    return applyValidation(field, value, fieldState.required);
  }, [findFieldById, fieldStates]);

  // Gestion des changements de données
  const handleFieldChange = useCallback(async (fieldId: string, value: unknown) => {
    setFormData(prev => {
      const newData = { ...prev, [fieldId]: value };
      
      // Traitement immédiat des formules
      setTimeout(async () => {
        try {
          const field = findFieldById(fieldId);
          if (field?.advancedConfig?.triggers) {
            const triggers = field.advancedConfig.triggers as RuleFormula[];
            for (const trigger of triggers) {
              if (trigger.targetFieldId) {
                const result = await formulaEngine.evaluate(trigger.sequence, newData);
                setFormData(current => ({ ...current, [trigger.targetFieldId!]: result }));
              }
            }
          }
        } catch (error) {
          console.warn('[DEVIS] Erreur traitement formule:', error);
        }
      }, 0);

      return newData;
    });

    // Validation
    const error = validateField(fieldId, value);
    setErrors(prev => ({ ...prev, [fieldId]: error }));
  }, [findFieldById, validateField, formulaEngine]);

  // Sauvegarde automatique
  const saveDevis = useCallback(async () => {
    if (!leadId || saving) return;

    setSaving(true);
    try {
      const devisData = { [blocks[0]?.id || 'default']: formData };
      
      await api.patch(`/api/leads/${leadId}`, {
        data: {
          ...lead?.data,
          devis: devisData
        }
      });
    } catch (error) {
      console.error('[DEVIS] Erreur sauvegarde:', error);
      message.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }, [leadId, formData, blocks, lead?.data, api, saving]);

  // Auto-save
  useEffect(() => {
    const timeoutId = setTimeout(saveDevis, 2000);
    return () => clearTimeout(timeoutId);
  }, [formData]);

  // Chargement initial
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadBlocks(), loadLead()]);
      setLoading(false);
    };

    loadData();
  }, [loadBlocks, loadLead]);

  // Mise à jour des états des champs
  useEffect(() => {
    updateFieldStates();
  }, [updateFieldStates]);

  return {
    // État
    blocks,
    lead,
    formData,
    fieldStates,
    errors,
    saving,
    loading,
    archived,
    
    // Actions
    handleFieldChange,
    saveDevis,
    setArchived,
    
    // Utilitaires
    findFieldById,
    getAllFields
  };
}
