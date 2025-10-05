import { useState, useCallback, useMemo, useEffect } from 'react';
import { TBLField, TBLSection } from './useTBLDataPrismaComplete';

export interface ValidationState {
  isValidating: boolean;
  completedTabs: Set<string>;
  incompleteTabs: Set<string>;
  requiredFieldsStatus: Record<string, boolean>; // fieldId -> isCompleted
}

export interface ValidationActions {
  startValidation: () => void;
  stopValidation: () => void;
  updateFieldValue: (fieldId: string, value: unknown) => void;
  isTabComplete: (tabId: string) => boolean;
  isTabIncomplete: (tabId: string) => boolean;
  isFieldRequired: (fieldId: string) => boolean;
  shouldShowRequiredError: (fieldId: string) => boolean;
}

export interface UseTBLValidationProps {
  tabs: TBLSection[];
  fieldValues: Record<string, unknown>;
}

export function useTBLValidation({ tabs, fieldValues }: UseTBLValidationProps) {
  const [validationState, setValidationState] = useState<ValidationState>({
    isValidating: false,
    completedTabs: new Set(),
    incompleteTabs: new Set(),
    requiredFieldsStatus: {}
  });

  // 🎯 Collecter tous les champs obligatoires de tous les onglets
  const requiredFieldsByTab = useMemo(() => {
    const result: Record<string, TBLField[]> = {};
    
    tabs.forEach(tab => {
      const requiredFields: TBLField[] = [];
      
      // Récupérer les champs obligatoires directement dans l'onglet
      tab.fields?.forEach(field => {
        if (field.required) {
          requiredFields.push(field);
        }
        // Champs obligatoires dans les options de select
        field.options?.forEach(option => {
          option.conditionalFields?.forEach(condField => {
            if (condField.required) {
              requiredFields.push(condField);
            }
          });
        });
      });

      result[tab.id] = requiredFields;
    });

    return result;
  }, [tabs]);

  // 🎯 Calculer le statut de completion de chaque onglet
  const tabCompletionStatus = useMemo(() => {
    const completed = new Set<string>();
    const incomplete = new Set<string>();

    Object.entries(requiredFieldsByTab).forEach(([tabId, requiredFields]) => {
      const isComplete = requiredFields.every(field => {
        const value = fieldValues[field.id];
        return value !== null && value !== undefined && value !== '';
      });

      if (isComplete) {
        completed.add(tabId);
      } else {
        incomplete.add(tabId);
      }
    });

    return { completed, incomplete };
  }, [requiredFieldsByTab, fieldValues]);

  // 🎯 Mettre à jour l'état avec les statuts calculés
  const updateValidationState = useCallback(() => {
    const requiredFieldsStatus: Record<string, boolean> = {};
    
    Object.values(requiredFieldsByTab).flat().forEach(field => {
      const value = fieldValues[field.id];
      requiredFieldsStatus[field.id] = value !== null && value !== undefined && value !== '';
    });

    setValidationState(prev => ({
      ...prev,
      completedTabs: tabCompletionStatus.completed,
      incompleteTabs: tabCompletionStatus.incomplete,
      requiredFieldsStatus
    }));
  }, [requiredFieldsByTab, fieldValues, tabCompletionStatus]);

  // Actions
  const actions: ValidationActions = {
    startValidation: useCallback(() => {
      updateValidationState();
      setValidationState(prev => ({ ...prev, isValidating: true }));
    }, [updateValidationState]),

    stopValidation: useCallback(() => {
      setValidationState(prev => ({ ...prev, isValidating: false }));
    }, []),

    updateFieldValue: useCallback((fieldId: string, value: unknown) => {
      // Mettre à jour le statut du champ
      const isCompleted = value !== null && value !== undefined && value !== '';
      setValidationState(prev => ({
        ...prev,
        requiredFieldsStatus: {
          ...prev.requiredFieldsStatus,
          [fieldId]: isCompleted
        }
      }));
      
      // Recalculer les statuts des onglets
      setTimeout(updateValidationState, 0);
    }, [updateValidationState]),

    isTabComplete: useCallback((tabId: string) => {
      return validationState.completedTabs.has(tabId);
    }, [validationState.completedTabs]),

    isTabIncomplete: useCallback((tabId: string) => {
      return validationState.incompleteTabs.has(tabId);
    }, [validationState.incompleteTabs]),

    isFieldRequired: useCallback((fieldId: string) => {
      return Object.values(requiredFieldsByTab).flat().some(field => field.id === fieldId && field.required);
    }, [requiredFieldsByTab]),

    shouldShowRequiredError: useCallback((fieldId: string) => {
      const isRequired = Object.values(requiredFieldsByTab).flat().some(field => field.id === fieldId && field.required);
      return validationState.isValidating && 
             isRequired && 
             !validationState.requiredFieldsStatus[fieldId];
    }, [validationState.isValidating, validationState.requiredFieldsStatus, requiredFieldsByTab])
  };

  // Initialiser les statuts au premier rendu
  useState(() => {
    updateValidationState();
  });

  // 🔄 Mettre à jour les statuts en temps réel quand fieldValues change
  useEffect(() => {
    updateValidationState();
  }, [fieldValues, updateValidationState]);

  return {
    validationState,
    actions,
    requiredFieldsByTab
  };
}