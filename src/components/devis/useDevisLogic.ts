import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { message } from 'antd';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

// === TYPES COMPLETS DU SYSTÈME ===
interface FieldOption {
  id: string;
  label: string;
  value: string;
  fieldId: string;
  order: number;
}

interface ValidationRule {
  min?: number;
  max?: number;
  required?: boolean;
  pattern?: string;
  businessRules?: string[];
}

interface UIConfig {
  icon?: string;
  unit?: string;
  helpText?: string;
  placeholder?: string;
  readOnly?: boolean;
  animateUpdate?: boolean;
  highlightChanges?: boolean;
  showCalculationSteps?: boolean;
}

interface AdvancedConfig {
  ui?: UIConfig;
  validation?: ValidationRule;
  dependencies?: string[];
  autoCalculate?: boolean;
  decimalPlaces?: number;
  displayFormat?: string;
  color?: string;
  textColor?: string;
  reactive?: boolean;
  min?: number;
  max?: number;
  step?: number;
  numberType?: string;
  defaultValue?: string | number;
  technicalTag?: boolean;
  dbField?: string;
  tableau?: {
    columns: any[];
    templates: any[];
  };
}

export interface Field {
  id: string;
  label: string;
  type: string;
  width: string;
  required: boolean;
  sectionId: string;
  order: number;
  advancedConfig?: AdvancedConfig | null;
  FieldOption: FieldOption[];
}

export interface Section {
  id: string;
  name: string;
  order: number;
  blockId: string;
  active: boolean;
  sectionType: string;
  Field: Field[];
  fields?: Field[]; // Compatibilité
}

interface Block {
  id: string;
  name: string;
  organizationId: string;
  Section: Section[];
}

interface FormData {
  [fieldId: string]: any;
}

interface DevisData {
  id?: string;
  title?: string;
  data?: FormData;
  status?: 'draft' | 'sent' | 'approved' | 'rejected' | 'archived';
  clientId?: string;
  totalAmount?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface LeadData {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

interface DevisLogicProps {
  devisId?: string;
  leadId?: string;
  mode?: 'create' | 'edit' | 'view' | 'template';
}

// === MOTEUR DE FORMULES DYNAMIQUES ===
class DynamicFormulaEngine {
  private formData: FormData = {};
  private fieldsMap: Map<string, Field> = new Map();
  private calculationCache: Map<string, any> = new Map();

  constructor(fields: Field[], formData: FormData) {
    this.formData = formData;
    this.fieldsMap = new Map(fields.map(f => [f.id, f]));
  }

  updateFormData(formData: FormData) {
    this.formData = formData;
    this.calculationCache.clear(); // Invalider le cache
  }

  // Calcul des valeurs dérivées avec dépendances
  calculateDerivedValue(fieldId: string): any {
    if (this.calculationCache.has(fieldId)) {
      return this.calculationCache.get(fieldId);
    }

    const field = this.fieldsMap.get(fieldId);
    if (!field?.advancedConfig?.dependencies) {
      const value = this.formData[fieldId];
      this.calculationCache.set(fieldId, value);
      return value;
    }

    let result = this.performCalculation(field);
    this.calculationCache.set(fieldId, result);
    return result;
  }

  private performCalculation(field: Field): any {
    const { dependencies, autoCalculate } = field.advancedConfig!;
    
    if (!autoCalculate || !dependencies?.length) {
      return this.formData[field.id];
    }

    // Récupération des valeurs des dépendances
    const depValues = dependencies.map(depId => {
      const depValue = this.formData[depId];
      return typeof depValue === 'string' ? parseFloat(depValue) || 0 : (depValue || 0);
    });

    // Logique spécifique selon le type de champ
    switch (field.type) {
      case 'donnee':
        return this.calculateDataField(field, depValues);
      case 'prix_kwh_defini':
        return this.calculatePrixKwhDefini(depValues);
      default:
        return this.formData[field.id];
    }
  }

  private calculateDataField(field: Field, depValues: number[]): number {
    // Exemple : multiplication de deux valeurs de dépendance
    if (depValues.length >= 2) {
      return depValues[0] * depValues[1];
    }
    return depValues[0] || 0;
  }

  private calculatePrixKwhDefini(depValues: number[]): number {
    // Logique spécifique pour le calcul du prix kWh défini
    return depValues.reduce((acc, val) => acc + val, 0);
  }

  // Validation des règles métier
  validateBusinessRules(fieldId: string, value: any): string | null {
    const field = this.fieldsMap.get(fieldId);
    const rules = field?.advancedConfig?.validation?.businessRules;
    
    if (!rules?.length) return null;

    for (const rule of rules) {
      const error = this.applyBusinessRule(rule, value, field!);
      if (error) return error;
    }

    return null;
  }

  private applyBusinessRule(rule: string, value: any, field: Field): string | null {
    switch (rule) {
      case 'consumption_realistic':
        if (value < 500 || value > 100000) {
          return 'La consommation doit être entre 500 et 100000 kWh/an';
        }
        break;
      case 'positive_number':
        if (value <= 0) {
          return 'La valeur doit être positive';
        }
        break;
      case 'realistic_energy_price':
        if (value < 0.05 || value > 1.0) {
          return 'Le prix de l\'énergie semble irréaliste';
        }
        break;
    }
    return null;
  }
}

// === HOOK PRINCIPAL AVEC TOUTE LA LOGIQUE ===
export const useDevisLogic = ({ devisId, leadId, mode = 'create' }: DevisLogicProps = {}) => {
  const { api } = useAuthenticatedApi();
  
  // États principaux
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [formData, setFormData] = useState<FormData>({});
  const [devisData, setDevisData] = useState<DevisData>({});
  const [leadData, setLeadData] = useState<LeadData | null>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [warnings, setWarnings] = useState<Record<string, string | null>>({});
  const [fieldStates, setFieldStates] = useState<Record<string, any>>({});
  
  // États de l'interface
  const [activeTabKey, setActiveTabKey] = useState<string>('0');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSavedData, setLastSavedData] = useState<FormData>({});
  
  // Références et cache
  const formulaEngineRef = useRef<DynamicFormulaEngine | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const calculationTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialisation du moteur de formules
  const initializeFormulaEngine = useCallback(() => {
    if (sections.length > 0) {
      const allFields = sections.flatMap(s => s.Field || s.fields || []);
      formulaEngineRef.current = new DynamicFormulaEngine(allFields, formData);
    }
  }, [sections, formData]);

  // Chargement des données
  const fetchBlocks = useCallback(async () => {
    try {
      setLoading(true);
      const timestamp = Date.now();
      const forceReload = Math.random();
      const blocksData = await api.get(`/api/blocks?t=${timestamp}&forcereload=${forceReload}`);
      
      if (blocksData && Array.isArray(blocksData) && blocksData.length > 0) {
        setBlocks(blocksData);
        const firstBlock = blocksData[0];
        if (firstBlock.Section && Array.isArray(firstBlock.Section)) {
          const sortedSections = firstBlock.Section.sort((a: Section, b: Section) => a.order - b.order);
          // Assurer la compatibilité avec l'ancien système
          const sectionsWithFields = sortedSections.map(section => ({
            ...section,
            fields: section.Field || section.fields || [],
            label: section.name
          }));
          setSections(sectionsWithFields);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des blocs:', error);
      message.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const fetchDevisData = useCallback(async () => {
    if (!devisId) return;
    
    try {
      const data = await api.get(`/api/devis/${devisId}`);
      setDevisData(data);
      if (data.data) {
        setFormData(data.data);
        setLastSavedData(data.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du devis:', error);
      message.error('Erreur lors du chargement du devis');
    }
  }, [devisId, api]);

  const fetchLeadData = useCallback(async () => {
    if (!leadId) return;
    
    try {
      const lead = await api.get(`/api/leads/${leadId}`);
      setLeadData(lead);
      
      // Pré-remplir les champs client avec les données du lead
      const clientData: FormData = {};
      if (lead.firstName) clientData['prenom'] = lead.firstName;
      if (lead.lastName) clientData['nom'] = lead.lastName;
      if (lead.email) clientData['email'] = lead.email;
      if (lead.phone) clientData['telephone'] = lead.phone;
      if (lead.company) clientData['societe'] = lead.company;
      if (lead.address) clientData['adresse1'] = lead.address;
      if (lead.city) clientData['ville'] = lead.city;
      if (lead.postalCode) clientData['code_postal'] = lead.postalCode;
      if (lead.country) clientData['pays'] = lead.country;
      
      setFormData(prev => ({ ...clientData, ...prev }));
    } catch (error) {
      console.error('Erreur lors du chargement du lead:', error);
    }
  }, [leadId, api]);

  // Initialisation
  useEffect(() => {
    Promise.all([
      fetchBlocks(),
      fetchDevisData(),
      fetchLeadData()
    ]);
  }, [fetchBlocks, fetchDevisData, fetchLeadData]);

  useEffect(() => {
    initializeFormulaEngine();
  }, [initializeFormulaEngine]);

  // Gestion des changements de champs
  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [fieldId]: value };
      
      // Mise à jour du moteur de formules
      if (formulaEngineRef.current) {
        formulaEngineRef.current.updateFormData(newData);
        
        // Recalcul des champs dépendants
        clearTimeout(calculationTimeoutRef.current);
        calculationTimeoutRef.current = setTimeout(() => {
          recalculateDependentFields(fieldId, newData);
        }, 100);
      }
      
      return newData;
    });

    // Validation immédiate
    validateField(fieldId, value);
    
    // Auto-sauvegarde
    if (autoSaveEnabled && mode !== 'view') {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveFormData();
      }, 2000);
    }
  }, [autoSaveEnabled, mode]);

  // Recalcul des champs dépendants
  const recalculateDependentFields = useCallback((changedFieldId: string, newFormData: FormData) => {
    if (!formulaEngineRef.current) return;

    const allFields = sections.flatMap(s => s.Field || s.fields || []);
    const dependentFields = allFields.filter(field => 
      field.advancedConfig?.dependencies?.includes(changedFieldId)
    );

    if (dependentFields.length > 0) {
      setFormData(currentData => {
        const updatedData = { ...currentData };
        
        dependentFields.forEach(field => {
          const calculatedValue = formulaEngineRef.current!.calculateDerivedValue(field.id);
          if (calculatedValue !== undefined) {
            updatedData[field.id] = calculatedValue;
            
            // Marquer le champ comme mis à jour
            setFieldStates(prev => ({
              ...prev,
              [field.id]: { ...prev[field.id], updated: true }
            }));
          }
        });
        
        return updatedData;
      });
    }
  }, [sections]);

  // Validation des champs
  const validateField = useCallback((fieldId: string, value: any) => {
    let error: string | null = null;
    let warning: string | null = null;

    // Validation avec le moteur de formules
    if (formulaEngineRef.current) {
      error = formulaEngineRef.current.validateBusinessRules(fieldId, value);
    }

    // Validation basique
    const field = sections.flatMap(s => s.Field || s.fields || []).find(f => f.id === fieldId);
    if (field?.required && (!value || value === '')) {
      error = 'Ce champ est requis';
    }

    if (field?.advancedConfig?.validation) {
      const validation = field.advancedConfig.validation;
      
      if (validation.min !== undefined && value < validation.min) {
        error = `La valeur doit être supérieure ou égale à ${validation.min}`;
      }
      
      if (validation.max !== undefined && value > validation.max) {
        error = `La valeur doit être inférieure ou égale à ${validation.max}`;
      }
      
      if (validation.pattern && typeof value === 'string') {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          error = 'Format invalide';
        }
      }
    }

    setErrors(prev => ({ ...prev, [fieldId]: error }));
    setWarnings(prev => ({ ...prev, [fieldId]: warning }));
  }, [sections]);

  // Sauvegarde
  const saveFormData = useCallback(async () => {
    if (saving) return;
    
    setSaving(true);
    try {
      const payload = {
        ...devisData,
        data: formData,
        status: devisData.status || 'draft'
      };

      let savedData;
      if (devisId) {
        savedData = await api.put(`/api/devis/${devisId}`, payload);
      } else {
        savedData = await api.post('/api/devis', payload);
        setDevisData(prev => ({ ...prev, id: savedData.id }));
      }
      
      setLastSavedData(formData);
      message.success('Devis sauvegardé');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      message.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }, [saving, formData, devisData, devisId, api]);

  // Fonctions utilitaires
  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(lastSavedData);
  }, [formData, lastSavedData]);

  const getFieldError = useCallback((fieldId: string) => errors[fieldId], [errors]);
  const getFieldWarning = useCallback((fieldId: string) => warnings[fieldId], [warnings]);
  const getFieldState = useCallback((fieldId: string) => fieldStates[fieldId] || {}, [fieldStates]);

  const resetForm = useCallback(() => {
    setFormData({});
    setErrors({});
    setWarnings({});
    setFieldStates({});
  }, []);

  // Nettoyage
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Données
    blocks,
    sections,
    formData,
    devisData,
    leadData,
    
    // États
    errors,
    warnings,
    fieldStates,
    loading,
    saving,
    hasUnsavedChanges,
    activeTabKey,
    
    // Actions
    handleFieldChange,
    validateField,
    saveFormData,
    resetForm,
    setActiveTabKey,
    
    // Utilitaires
    getFieldError,
    getFieldWarning,
    getFieldState,
    
    // Contrôles
    setAutoSaveEnabled,
    refetch: fetchBlocks
  };
};
