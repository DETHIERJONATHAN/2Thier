import { useState, useEffect, useCallback, useRef } from 'react';
import { dlog } from '../../../../../utils/debug';
import { buildMirrorKeys } from '../utils/mirrorNormalization';

// 🔇 Contrôle de verbosité (activer via console: window.__TBL_VERBOSE__ = true)
declare global { interface Window { __TBL_VERBOSE__?: boolean } }
const verbose = () => (typeof window !== 'undefined' && window.__TBL_VERBOSE__ === true);
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';
import { isCopyFromRepeater } from '../utils/isCopyFromRepeater';

// 🎯 FONCTION: Création automatique des mirrors pour tous les champs TreeBranchLeaf
const createAutomaticMirrors = (tabs: TBLTab[], nodes: TreeBranchLeafNode[]): void => {
  try {
    if (typeof window === 'undefined' || !window.TBL_FORM_DATA) {
      console.log('🎯 [MIRROR] Initialisation TBL_FORM_DATA...');
      if (typeof window !== 'undefined') {
        window.TBL_FORM_DATA = {};
      }
    }

    let mirrorsCreated = 0;
    
    // Parcourir tous les onglets et sections
    tabs.forEach(tab => {
      tab.sections?.forEach(section => {
        if (section.isDataSection && section.fields) {
          section.fields.forEach(field => {
            // Créer un mirror pour chaque champ de données TreeBranchLeaf
            const mirrorKey = `__mirror_data_${field.label}`;
            
            if (typeof window !== 'undefined' && window.TBL_FORM_DATA && !(mirrorKey in window.TBL_FORM_DATA)) {
              // Valeur par défaut basée sur le type de champ
              let defaultValue: string | number | boolean | null = null;
              if (field.type === 'number') defaultValue = 0;
              else if (field.type === 'boolean') defaultValue = false;
              else if (field.type === 'text') defaultValue = '';
              
              window.TBL_FORM_DATA[mirrorKey] = defaultValue;
              mirrorsCreated++;
              
              console.log('🎯 [MIRROR][AUTO_CREATE]', { 
                mirrorKey, 
                fieldId: field.id, 
                fieldLabel: field.label, 
                fieldType: field.type,
                defaultValue 
              });
              
              // Créer aussi toutes les variantes du mirror
              try {
                const variants = buildMirrorKeys(field.label).map(k => k.replace(/^__mirror_data_/, ''));
                variants.forEach(v => {
                  const variantKey = `__mirror_data_${v}`;
                  if (!(variantKey in window.TBL_FORM_DATA)) {
                    window.TBL_FORM_DATA[variantKey] = defaultValue;
                    console.log('🎯 [MIRROR][AUTO_CREATE_VARIANT]', { 
                      variantKey, 
                      from: mirrorKey, 
                      defaultValue 
                    });
                  }
                });
              } catch (e) {
                console.warn('[MIRROR][VARIANT][ERROR]', e);
              }
            }
          });
        }
      });
    });
    
    // 2. Créer des mirrors pour les champs de FORMULES TreeBranchLeaf
    nodes.forEach(node => {
      if (node.hasFormula && node.label) {
        const formulaMirrorKey = `__mirror_formula_${node.id}`;
        const formulaLabelMirrorKey = `__mirror_formula_${node.label}`;
        
        if (typeof window !== 'undefined' && window.TBL_FORM_DATA) {
          // Miroir par ID de formule
          if (!(formulaMirrorKey in window.TBL_FORM_DATA)) {
            const defaultValue = 0; // Les formules retournent généralement des nombres
            window.TBL_FORM_DATA[formulaMirrorKey] = defaultValue;
            console.log('🧮 [MIRROR][FORMULA_CREATE]', {
              mirrorKey: formulaMirrorKey,
              formulaId: node.id,
              formulaLabel: node.label,
              defaultValue
            });
            mirrorsCreated++;
          }
          
          // Miroir par label de formule
          if (!(formulaLabelMirrorKey in window.TBL_FORM_DATA)) {
            const defaultValue = 0;
            window.TBL_FORM_DATA[formulaLabelMirrorKey] = defaultValue;
            console.log('🧮 [MIRROR][FORMULA_LABEL_CREATE]', {
              mirrorKey: formulaLabelMirrorKey,
              formulaLabel: node.label,
              defaultValue
            });
            mirrorsCreated++;
            
            // Créer des variantes de noms pour les formules aussi
            try {
              const formulaVariants = buildMirrorKeys(node.label);
              formulaVariants.forEach(variantKey => {
                if (variantKey !== formulaLabelMirrorKey) {
                  const formulaVariantKey = variantKey.replace('__mirror_data_', '__mirror_formula_');
                  if (!(formulaVariantKey in window.TBL_FORM_DATA)) {
                    window.TBL_FORM_DATA[formulaVariantKey] = defaultValue;
                    console.log('🧮 [MIRROR][FORMULA_VARIANT]', {
                      variantKey: formulaVariantKey,
                      from: formulaLabelMirrorKey,
                      defaultValue
                    });
                    mirrorsCreated++;
                  }
                }
              });
            } catch (e) {
              console.warn('[MIRROR][FORMULA_VARIANT][ERROR]', e);
            }
          }
        }
      }
    });
    
    // 3. Créer des mirrors pour les CONDITIONS TreeBranchLeaf
    nodes.forEach(node => {
      if (node.hasCondition && node.label) {
        const conditionMirrorKey = `__mirror_condition_${node.id}`;
        const conditionLabelMirrorKey = `__mirror_condition_${node.label}`;
        
        if (typeof window !== 'undefined' && window.TBL_FORM_DATA) {
          // Miroir par ID de condition
          if (!(conditionMirrorKey in window.TBL_FORM_DATA)) {
            const defaultValue = false; // Les conditions retournent généralement des booléens
            window.TBL_FORM_DATA[conditionMirrorKey] = defaultValue;
            console.log('🔀 [MIRROR][CONDITION_CREATE]', {
              mirrorKey: conditionMirrorKey,
              conditionId: node.id,
              conditionLabel: node.label,
              defaultValue
            });
            mirrorsCreated++;
          }
          
          // Miroir par label de condition
          if (!(conditionLabelMirrorKey in window.TBL_FORM_DATA)) {
            const defaultValue = false;
            window.TBL_FORM_DATA[conditionLabelMirrorKey] = defaultValue;
            console.log('🔀 [MIRROR][CONDITION_LABEL_CREATE]', {
              mirrorKey: conditionLabelMirrorKey,
              conditionLabel: node.label,
              defaultValue
            });
            mirrorsCreated++;
            
            // Créer des variantes de noms pour les conditions aussi
            try {
              const conditionVariants = buildMirrorKeys(node.label);
              conditionVariants.forEach(variantKey => {
                if (variantKey !== conditionLabelMirrorKey) {
                  const conditionVariantKey = variantKey.replace('__mirror_data_', '__mirror_condition_');
                  if (!(conditionVariantKey in window.TBL_FORM_DATA)) {
                    window.TBL_FORM_DATA[conditionVariantKey] = defaultValue;
                    console.log('🔀 [MIRROR][CONDITION_VARIANT]', {
                      variantKey: conditionVariantKey,
                      from: conditionLabelMirrorKey,
                      defaultValue
                    });
                    mirrorsCreated++;
                  }
                }
              });
            } catch (e) {
              console.warn('[MIRROR][CONDITION_VARIANT][ERROR]', e);
            }
          }
        }
      }
    });
    
    if (mirrorsCreated > 0) {
      console.log(`🎉 [MIRROR] ${mirrorsCreated} mirrors automatiques créés pour TreeBranchLeaf (données, formules, conditions) !`);
    }
  } catch (error) {
    console.error('❌ [MIRROR] Erreur lors de la création automatique des mirrors:', error);
  }
};

// 🔄 FORCE REFRESH: 1757277837853 - VÉRIFICATION OPTION + CHAMP
if (verbose()) {
  dlog('🔄 [FORCE REFRESH] Hook useTBLDataPrismaComplete rechargé à', new Date().toISOString());
  dlog('🎯 [DEBUG CRITICAL] Vérification des option + champ FORCÉE - système TreeBranchLeaf DYNAMIQUE');
}

// 🧠 Cache local pour résolution de valeur (évite double fetch StrictMode). TTL 30s
const VALUE_CACHE_TTL_MS = 30_000;
const valueResolutionCache = new Map<string, { timestamp: number; result: { value: string | number | boolean | null; variableConfig?: Record<string, unknown> } }>();

// 🎯 NOUVELLE FONCTION: Résolution des valeurs dynamiques depuis TreeBranchLeafNodeVariable
const resolveFieldValue = async (
  node: TreeBranchLeafNode,
  api: { get: (url: string) => Promise<{ data: Record<string, unknown> }> },
  treeId: string
): Promise<{ value: string | number | boolean | null; variableConfig?: Record<string, unknown> }> => {
  if (verbose()) dlog(`🔍 [RESOLVE_VALUE] Résolution valeur pour "${node.label}" (hasData: ${node.hasData})`);
  
  // Si le champ n'a pas de capacité "Données", utiliser la valeur par défaut
  if (!node.hasData) {
    const defaultValue = node.defaultValue || node.value || 
                        node.bool_defaultValue || node.text_defaultValue || 
                        node.number_defaultValue || node.select_defaultValue || 
                        node.date_defaultValue;
    if (verbose()) dlog(`🔍 [RESOLVE_VALUE] Pas de capacité données, valeur par défaut: ${defaultValue}`);
    return { value: defaultValue as string | number | boolean | null };
  }

  try {
    // ♻️ Cache
    const cached = valueResolutionCache.get(node.id);
    if (cached && Date.now() - cached.timestamp < VALUE_CACHE_TTL_MS) {
      if (verbose()) dlog(`♻️ [RESOLVE_VALUE] Cache hit pour "${node.label}"`);
      return cached.result;
    }
    // Récupérer la configuration de la variable depuis l'API
    const variableResponse = await api.get(`/api/treebranchleaf/trees/${treeId}/nodes/${node.id}/data`);
    if (verbose()) dlog('🧾 [RESOLVE_VALUE] Payload brut /data pour', node.label, ':', variableResponse);

    // 🔄 Normalisation: supporter deux formats possibles
    // 1) fetch/json direct => { exposedKey, sourceType, ... }
    // 2) axios-like       => { data: { exposedKey, sourceType, ... } }
    let variableConfig: Record<string, unknown> | undefined;
    if (variableResponse && typeof variableResponse === 'object') {
      const vrAny = variableResponse as { data?: unknown } & Record<string, unknown>;
      if (vrAny.data && typeof vrAny.data === 'object' && !Array.isArray(vrAny.data)) {
        variableConfig = vrAny.data as Record<string, unknown>;
        if (verbose()) dlog('🧪 [RESOLVE_VALUE] Forme axios détectée (utilisation de .data)');
      } else {
        variableConfig = vrAny as Record<string, unknown>;
        if (verbose()) dlog('🧪 [RESOLVE_VALUE] Forme plate détectée (objet direct sans .data)');
      }
    }

    if (variableConfig && Object.keys(variableConfig).length === 0) {
      console.warn('⚠️ [RESOLVE_VALUE] /data a renvoyé un objet vide pour', node.id, '(hasData flag=', node.hasData, ')');
    }

  if (verbose()) dlog(`🔍 [RESOLVE_VALUE] Configuration variable normalisée:`, variableConfig);
    
      // Extraire la configuration depuis les colonnes dédiées (top-level), avec fallback legacy dans metadata
      const topLevelSourceType = (variableConfig as unknown as { sourceType?: string })?.sourceType;
      const topLevelSourceRef = (variableConfig as unknown as { sourceRef?: string | null })?.sourceRef || undefined;
      const topLevelFixedValue = (variableConfig as unknown as { fixedValue?: unknown })?.fixedValue;
      const topLevelSelectedNodeId = (variableConfig as unknown as { selectedNodeId?: string | null })?.selectedNodeId || undefined;

      const legacySourceType = (variableConfig as unknown as { metadata?: { sourceType?: string } })?.metadata?.sourceType;
      const legacySourceRef = (variableConfig as unknown as { metadata?: { sourceRef?: string } })?.metadata?.sourceRef;
      const legacyFixedValue = (variableConfig as unknown as { metadata?: { fixedValue?: unknown } })?.metadata?.fixedValue;
      const legacySelectedNodeId = (variableConfig as unknown as { metadata?: { selectedNodeId?: string } })?.metadata?.selectedNodeId;

      const sourceType = topLevelSourceType || legacySourceType;
      const sourceRef = (topLevelSourceRef ?? legacySourceRef) as string | undefined;
      const fixedValue = topLevelFixedValue ?? legacyFixedValue;
      const selectedNodeId = topLevelSelectedNodeId || legacySelectedNodeId;

      // Si pas de configuration ou pas de sourceType, utiliser valeur par défaut
      if (!variableConfig || !sourceType) {
        const fallbackValue = (variableConfig && (variableConfig as { defaultValue?: unknown }).defaultValue) || node.defaultValue || node.value;
        if (verbose()) dlog(`🔍 [RESOLVE_VALUE] Pas de sourceType, valeur fallback: ${fallbackValue}`);
        const result = { value: fallbackValue as string | number | boolean | null, variableConfig };
        valueResolutionCache.set(node.id, { timestamp: Date.now(), result });
        return result;
      }

    // Mode valeur fixe
    if (sourceType === 'fixed' && fixedValue !== undefined) {
      if (verbose()) dlog(`🔍 [RESOLVE_VALUE] Mode fixe, valeur: ${fixedValue}`);
      const result = { value: fixedValue as string | number | boolean | null, variableConfig };
      valueResolutionCache.set(node.id, { timestamp: Date.now(), result });
      return result;
    }

    // Mode arborescence (référence dynamique)
    if (sourceType === 'tree') {
      // Si une sourceRef explicite est définie, laisser l'évaluation dynamique au composant SmartCalculatedField
      if (typeof sourceRef === 'string' && sourceRef) {
        const isDynamicRef = sourceRef.startsWith('condition:') || sourceRef.startsWith('formula:') || sourceRef.startsWith('node-formula:') || sourceRef.startsWith('@value.');
        if (isDynamicRef) {
          if (verbose()) dlog(`🌲 [RESOLVE_VALUE] Référence dynamique détectée (${sourceRef}) → laisser l'évaluation au rendu`);
          const result = { value: null, variableConfig };
          valueResolutionCache.set(node.id, { timestamp: Date.now(), result });
          return result;
        }
      }

      // Compat: ancien stockage via selectedNodeId (ex: node-formula:ID)
      if (selectedNodeId) {
        if (verbose()) dlog(`🔍 [RESOLVE_VALUE] Mode arborescence (legacy), selectedNodeId: ${selectedNodeId}`);
        if (selectedNodeId.startsWith('node-formula:')) {
          const formulaId = selectedNodeId.replace('node-formula:', '');
          if (verbose()) dlog(`🔍 [RESOLVE_VALUE] (legacy) ID formule extrait: ${formulaId} → évaluation déléguée au rendu`);
          const result = { value: null, variableConfig }; // Laisser SmartCalculatedField gérer
          valueResolutionCache.set(node.id, { timestamp: Date.now(), result });
          return result;
        }
      }
    }

    // Fallback: valeur par défaut
    const fallbackValue = (variableConfig as { defaultValue?: unknown }).defaultValue || node.defaultValue || node.value;
  if (verbose()) dlog(`🔍 [RESOLVE_VALUE] Fallback final: ${fallbackValue}`);
  const result = { value: fallbackValue as string | number | boolean | null, variableConfig };
  valueResolutionCache.set(node.id, { timestamp: Date.now(), result });
  return result;

  } catch (error) {
    console.error(`❌ [RESOLVE_VALUE] Erreur résolution valeur pour "${node.label}":`, error);
    return { value: (node.defaultValue || node.value || null) as string | number | boolean | null };
  }
};

// (formatage des valeurs déplacé côté affichage; pas nécessaire au niveau du hook)

// � TYPES HELPER POUR LES CAPACITÉS
type FormulaCapability = {
  expression: string;
  variables: Record<string, { sourceField: string; type: string }>;
  allowManualOverride?: boolean;
} | null;

type ConditionCapability = Array<{
  dependsOn: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: unknown;
  action: 'show' | 'hide' | 'enable' | 'disable';
}> | null;

type TableCapability = {
  columns: Array<{ key: string; label: string; type: string }>;
  dataSource?: string;
  allowEdit?: boolean;
} | null;

type APICapability = {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Record<string, unknown>;
  responseField?: string;
  autoRefresh?: boolean;
} | null;

type LinkCapability = Array<{
  targetField: string;
  linkType: 'mirror' | 'calculate' | 'lookup';
  expression?: string;
}> | null;

type MarkersCapability = Array<{
  id: string;
  name: string;
  color: string;
  icon?: string;
  condition?: string;
}> | null;

// �🌟 INTERFACE PRISMA COMPLÈTE (TOUTES les colonnes)
export interface TreeBranchLeafNode {
  id: string;
  treeId: string;
  parentId: string | null;
  type: string;
  subType: string | null;
  label: string;
  description: string | null;
  value: string | null;
  order: number;
  isRequired: boolean;
  isVisible: boolean;
  isActive: boolean;
  
  // Colonnes spécialisées Prisma
  fieldType?: string;
  fieldSubType?: string;
  
  // Apparence
  appearance_size?: string;
  appearance_width?: string;
  appearance_variant?: string;
  
  // Configuration texte COMPLÈTE
  text_placeholder?: string;
  text_maxLength?: number;
  text_minLength?: number;
  text_rows?: number;
  text_mask?: string; // 🔥 AJOUT: masque de saisie
  text_regex?: string;
  text_defaultValue?: string;
  
  // Configuration nombre COMPLÈTE
  number_min?: number;
  number_max?: number;
  number_step?: number;
  number_decimals?: number;
  number_prefix?: string;
  number_suffix?: string;
  number_unit?: string;
  number_defaultValue?: number;
  
  // Configuration sélection COMPLÈTE
  select_multiple?: boolean;
  select_searchable?: boolean;
  select_allowClear?: boolean;
  select_options?: Array<{ label: string; value: string }> | Record<string, unknown>;
  select_defaultValue?: string;
  
  // Choix multiple pour branches SELECT (niveau 2+)
  isMultiple?: boolean;
  
  // Configuration booléen COMPLÈTE
  bool_trueLabel?: string;
  bool_falseLabel?: string;
  bool_defaultValue?: boolean;
  
  // Configuration date COMPLÈTE
  date_format?: string;
  date_showTime?: boolean;
  date_defaultValue?: string;
  // 🔥 AJOUT PRISMA DYNAMIC MINDATE/MAXDATE
  date_minDate?: string;
  date_maxDate?: string;
  
  // Configuration image COMPLÈTE
  image_maxSize?: number;
  image_ratio?: string;
  image_crop?: boolean;
  image_thumbnails?: Record<string, unknown> | null;
  
  // Option + Champ
  option_label?: string;
  field_label?: string;
  
  // 🎯 NOUVEAU: SYSTÈME D'INSTANCES MULTIPLES (Capacités TreeBranchLeaf)
  data_instances?: Record<string, unknown> | null;
  data_activeId?: string | null;
  
  formula_instances?: Record<string, unknown> | null;
  formula_activeId?: string | null;
  
  condition_instances?: Record<string, unknown> | null;
  condition_activeId?: string | null;
  
  table_instances?: Record<string, unknown> | null;
  table_activeId?: string | null;
  
  api_instances?: Record<string, unknown> | null;
  api_activeId?: string | null;
  
  link_instances?: Record<string, unknown> | null;
  link_activeId?: string | null;
  
  markers_instances?: Record<string, unknown> | null;
  markers_activeId?: string | null;
  
  // Métadonnées
  metadata: Record<string, unknown>;
  defaultValue?: string;
  calculatedValue?: string;
}

// 🎯 INTERFACES TBL COMPLÈTES (toutes les capacités)
export interface TBLField {
  id: string;
  name: string;
  label: string;
  type: string; // 🎯 DYNAMIQUE: Respecte EXACTEMENT node.fieldType
  required: boolean;
  value?: string | number | boolean;
  visible: boolean;
  placeholder?: string;
  description?: string;
  order: number;
  
  // 🎯 NOUVEAU: Gestion de la résolution asynchrone des valeurs
  needsValueResolution?: boolean; // Indique si la valeur doit être résolue via TreeBranchLeafNodeVariable
  
  // 🎯 NOUVEAU: Gestion des options et champs conditionnels
  isSelect?: boolean;           // Si c'est une sous-branche (liste déroulante)
  options?: Array<{            // Options de la liste déroulante
    id: string;
    label: string;
    value: string;
    conditionalFields?: TBLField[]; // 🎯 PLUSIEURS CHAMPS CONDITIONNELS par option
  }>;
  
  // 🎯 NOUVEAU: Propriétés pour champs conditionnels injectés dynamiquement
  isConditional?: boolean;      // Marque si c'est un champ conditionnel injecté
  parentFieldId?: string;       // ID du champ parent (select/radio)
  parentOptionValue?: string;   // Valeur de l'option qui a déclenché ce champ
  
  // Configuration avancée depuis Prisma (COMPLÈTE)
  config?: {
    // Apparence
    size?: string;
    width?: string;
    variant?: string;
    
    // Texte
    minLength?: number;
    maxLength?: number;
    rows?: number;
  mask?: string;
    regex?: string;
    textDefaultValue?: string;
    
    // Nombre
    min?: number;
    max?: number;
    step?: number;
    decimals?: number;
    prefix?: string;
    suffix?: string;
    unit?: string;
    numberDefaultValue?: number;
    
    // Date
    format?: string;
    showTime?: boolean;
    dateDefaultValue?: string;
  minDate?: string;
  maxDate?: string;
    
    // Sélection
    multiple?: boolean;
    searchable?: boolean;
    allowClear?: boolean;
    selectDefaultValue?: string;
    
    // Booléen
    trueLabel?: string;
    falseLabel?: string;
    boolDefaultValue?: boolean;
    
    // Image
    maxSize?: number;
    ratio?: string;
    crop?: boolean;
    thumbnails?: Record<string, unknown>;
  };
  
  // 🎯 NOUVEAU: CAPACITÉS TREBRANCHLEAF (système d'instances)
  capabilities?: {
    data?: {
      enabled: boolean;
      activeId?: string;
      instances?: Record<string, unknown>;
    };
    
    formula?: {
      enabled: boolean;
      activeId?: string;
      instances?: Record<string, unknown>;
      currentFormula?: {
        expression: string;
        variables: Record<string, { sourceField: string; type: string }>;
        allowManualOverride?: boolean;
      };
    };
    
    condition?: {
      enabled: boolean;
      activeId?: string;
      instances?: Record<string, unknown>;
      currentConditions?: Array<{
        dependsOn: string;
        operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
        value: unknown;
        action: 'show' | 'hide' | 'enable' | 'disable';
      }>;
    };
    
    table?: {
      enabled: boolean;
      activeId?: string;
      instances?: Record<string, unknown>;
      currentTable?: {
        columns: Array<{ key: string; label: string; type: string }>;
        dataSource?: string;
        allowEdit?: boolean;
      };
    };
    
    api?: {
      enabled: boolean;
      activeId?: string;
      instances?: Record<string, unknown>;
      currentAPI?: {
        endpoint: string;
        method: 'GET' | 'POST' | 'PUT' | 'DELETE';
        params?: Record<string, unknown>;
        responseField?: string;
        autoRefresh?: boolean;
      };
    };
    
    link?: {
      enabled: boolean;
      activeId?: string;
      instances?: Record<string, unknown>;
      currentLinks?: Array<{
        targetField: string;
        linkType: 'mirror' | 'calculate' | 'lookup';
        expression?: string;
      }>;
    };
    
    markers?: {
      enabled: boolean;
      activeId?: string;
      instances?: Record<string, unknown>;
      currentMarkers?: Array<{
        id: string;
        name: string;
        color: string;
        icon?: string;
        condition?: string;
      }>;
    };
  };
  
  // Propriétés pour la gestion des copies supprimables
  isDeletableCopy?: boolean;
  parentRepeaterId?: string;
  sourceTemplateId?: string;
  
  // Propriété pour le bouton d'ajout de nouveau versant
  canAddNewCopy?: boolean;
  isLastInCopyGroup?: boolean;
}

export interface TBLSection {
  id: string;
  name: string;
  title?: string;
  description?: string;
  icon?: string;
  fields: TBLField[];   // 🎯 MAINTENANT: Mix de champs simples + listes déroulantes
  order: number;
  isDataSection?: boolean; // 🎯 Nouvelle propriété pour identifier les sections données TreeBranchLeaf
}

export interface TBLTab {
  id: string;
  name: string;
  label: string;
  order: number;
  sections: TBLSection[];
  allFields: TBLField[];  // 🎯 NOUVEAU: Tous les champs de cet onglet (pour statistiques)
}

export interface TBLTree {
  id: string;
  name: string;
  tabs: TBLTab[];
}

// 🔄 TRANSFORMATION PRISMA → TBL (COMPLÈTE AVEC TOUTES LES CAPACITÉS)
const transformPrismaNodeToField = (
  node: TreeBranchLeafNode,
  childrenMap: Map<string, TreeBranchLeafNode[]>,
  nodeLookup: Map<string, TreeBranchLeafNode>,
  activeSharedReferences?: Map<string, string[]>, // 🔗 NOUVEAU: Références partagées actives
  _formData?: Record<string, any> // 🔗 NOUVEAU: Pour vérifier les sélections
): TBLField => {
  // 🔗 RÉSOLUTION DES RÉFÉRENCES PARTAGÉES
  let resolvedNode = node;
  if (node.sharedReferenceId && !node.isSharedReference) {
    // Ce nœud utilise une référence partagée → récupérer la source
    const sourceTemplate = nodeLookup.get(node.sharedReferenceId);
    if (sourceTemplate && sourceTemplate.isSharedReference) {
      if (verbose()) {
        dlog(`🔗 [SHARED REF] Résolution: "${node.label}" → "${sourceTemplate.label}" (${sourceTemplate.id})`);
      }
      // Merger les configurations (⚡ UTILISER L'ID DU TEMPLATE POUR PARTAGER LES DONNÉES)
      resolvedNode = {
        ...sourceTemplate,
        id: sourceTemplate.id, // ⚡ MÊME ID = MÊMES DONNÉES PARTOUT
        label: node.label || sourceTemplate.label, // Garde le label local si défini
        description: node.description || sourceTemplate.description,
        order: node.order,
        parentId: node.parentId,
        treeId: node.treeId,
        // Marquer comme référence résolue
        metadata: {
          ...sourceTemplate.metadata,
          isResolvedReference: true,
          referenceSourceId: sourceTemplate.id,
          referenceSourceLabel: sourceTemplate.label,
          // Garder trace de l'ID du nœud de référence (pour le rendu dans l'arbre)
          referenceNodeId: node.id
        }
      };
    }
  }
  
  // 1️⃣ Déterminer si c'est une sous-branche (liste déroulante) ou un champ simple
  const children = childrenMap.get(resolvedNode.id) || [];
  const hasOptions = children.some(child => child.type === 'leaf_option' || child.type === 'leaf_option_field');
  
  // 🎯 FONCTION HELPER: Extraire la capacité active depuis les instances
  const extractActiveCapability = (instances: Record<string, unknown> | null, activeId: string | null): unknown => {
    if (!instances || !activeId) return null;
    return instances[activeId] || null;
  };
  
  // 🎯 NOUVEAU: Construction des capacités depuis les instances Prisma
  const capabilities = {
    data: {
      enabled: !!node.data_instances && Object.keys(node.data_instances || {}).length > 0,
      activeId: node.data_activeId,
      instances: node.data_instances,
    },
    
    formula: {
      enabled: !!node.formula_instances && Object.keys(node.formula_instances || {}).length > 0,
      activeId: node.formula_activeId,
      currentFormula: extractActiveCapability(node.formula_instances, node.formula_activeId) as FormulaCapability,
      instances: node.formula_instances,
    },
    
    condition: {
      enabled: !!node.condition_instances && Object.keys(node.condition_instances || {}).length > 0,
      activeId: node.condition_activeId,
      instances: node.condition_instances,
      currentConditions: extractActiveCapability(node.condition_instances, node.condition_activeId) as ConditionCapability,
    },
    
    table: {
      enabled: !!node.table_instances && Object.keys(node.table_instances || {}).length > 0,
      activeId: node.table_activeId,
      instances: node.table_instances,
      currentTable: extractActiveCapability(node.table_instances, node.table_activeId) as TableCapability,
    },
    
    api: {
      enabled: !!node.api_instances && Object.keys(node.api_instances || {}).length > 0,
      activeId: node.api_activeId,
      instances: node.api_instances,
      currentAPI: extractActiveCapability(node.api_instances, node.api_activeId) as APICapability,
    },
    
    link: {
      enabled: !!node.link_instances && Object.keys(node.link_instances || {}).length > 0,
      activeId: node.link_activeId,
      instances: node.link_instances,
      currentLinks: extractActiveCapability(node.link_instances, node.link_activeId) as LinkCapability,
    },
    
    markers: {
      enabled: !!node.markers_instances && Object.keys(node.markers_instances || {}).length > 0,
      activeId: node.markers_activeId,
      instances: node.markers_instances,
      currentMarkers: extractActiveCapability(node.markers_instances, node.markers_activeId) as MarkersCapability,
    },
  };
  
  // Log des capacités pour debug
  const enabledCapabilities = Object.entries(capabilities)
    .filter(([, cap]) => cap.enabled)
    .map(([name]) => name);
  
  if (enabledCapabilities.length > 0 && verbose()) {
    dlog(`🎯 [CAPACITÉS] Champ "${node.label}": ${enabledCapabilities.join(', ')}`);
  }
  
  if (hasOptions) {
    // 🎯 C'EST UNE SOUS-BRANCHE = LISTE DÉROULANTE
    const options = children
      .filter(child => child.type === 'leaf_option' || child.type === 'leaf_option_field')
      .sort((a, b) => a.order - b.order)
      .map(optionNode => {
  if (verbose()) dlog(`🔍 [DEBUG OPTION] Traitement option "${optionNode.label}" (${optionNode.type})`);
  if (verbose()) dlog(`🎯 [DEBUG OPTION] Détails option:`, {
          id: optionNode.id,
          type: optionNode.type,
          label: optionNode.label,
          option_label: optionNode.option_label,
          field_label: optionNode.field_label,
          fieldType: optionNode.fieldType,
          isLeafOptionField: optionNode.type === 'leaf_option_field'
        });
        
        const conditionalFields: TBLField[] = [];
        
        // Si c'est une "option + champ", créer le champ conditionnel direct
        if (optionNode.type === 'leaf_option_field') {
          if (verbose()) dlog(`🎯 [OPTION + CHAMP] Trouvé leaf_option_field: "${optionNode.label}" avec field_label: "${optionNode.field_label}"`);
          
          // 🔥 100% DYNAMIQUE PRISMA: Priorité subType > fieldType > type
          const finalFieldType = optionNode.subType || optionNode.fieldType || optionNode.type || 'TEXT';
          
        dlog(`🔍 [TYPE DETECTION DYNAMIC] ${optionNode.label}`, { fieldType: optionNode.fieldType, subType: optionNode.subType, type: optionNode.type, final: finalFieldType });
          
          conditionalFields.push({
            // Utiliser un nodeId RÉEL pour persister dans Prisma
            id: optionNode.id,
            name: optionNode.field_label || `${optionNode.label} - Champ`,
            label: optionNode.field_label || `${optionNode.label} - Champ`,
            type: finalFieldType,
            required: optionNode.isRequired,
            visible: optionNode.isVisible,
            placeholder: optionNode.text_placeholder,
            description: optionNode.description,
            order: optionNode.order,
            config: {
              size: optionNode.appearance_size,
              width: optionNode.appearance_width,
              variant: optionNode.appearance_variant,
              minLength: optionNode.text_minLength,
              maxLength: optionNode.text_maxLength,
              rows: optionNode.text_rows,
              mask: optionNode.text_mask, // 🔥 AJOUT: masque
              regex: optionNode.text_regex,
              textDefaultValue: optionNode.text_defaultValue,
              min: optionNode.number_min,
              max: optionNode.number_max,
              step: optionNode.number_step,
              decimals: optionNode.number_decimals,
              prefix: optionNode.number_prefix,
              suffix: optionNode.number_suffix,
              unit: optionNode.number_unit,
              numberDefaultValue: optionNode.number_defaultValue,
              format: optionNode.date_format,
              showTime: optionNode.date_showTime,
              dateDefaultValue: optionNode.date_defaultValue,
              // 🔥 AJOUT PRISMA DYNAMIC MINDATE/MAXDATE
              minDate: optionNode.date_minDate,
              maxDate: optionNode.date_maxDate,
              multiple: optionNode.select_multiple,
              searchable: optionNode.select_searchable,
              allowClear: optionNode.select_allowClear,
              selectDefaultValue: optionNode.select_defaultValue,
              trueLabel: optionNode.bool_trueLabel,
              falseLabel: optionNode.bool_falseLabel,
              boolDefaultValue: optionNode.bool_defaultValue,
            },
            // 🎯 NOUVEAU: Capacités pour les champs conditionnels
            capabilities: {
              data: {
                enabled: !!optionNode.data_instances && Object.keys(optionNode.data_instances || {}).length > 0,
                activeId: optionNode.data_activeId,
                instances: optionNode.data_instances,
              },
              formula: {
                enabled: !!optionNode.formula_instances && Object.keys(optionNode.formula_instances || {}).length > 0,
                activeId: optionNode.formula_activeId,
                instances: optionNode.formula_instances,
                currentFormula: extractActiveCapability(optionNode.formula_instances, optionNode.formula_activeId) as FormulaCapability,
              },
              condition: {
                enabled: !!optionNode.condition_instances && Object.keys(optionNode.condition_instances || {}).length > 0,
                activeId: optionNode.condition_activeId,
                instances: optionNode.condition_instances,
                currentConditions: extractActiveCapability(optionNode.condition_instances, optionNode.condition_activeId) as ConditionCapability,
              },
              table: {
                enabled: !!optionNode.table_instances && Object.keys(optionNode.table_instances || {}).length > 0,
                activeId: optionNode.table_activeId,
                instances: optionNode.table_instances,
                currentTable: extractActiveCapability(optionNode.table_instances, optionNode.table_activeId) as TableCapability,
              },
              api: {
                enabled: !!optionNode.api_instances && Object.keys(optionNode.api_instances || {}).length > 0,
                activeId: optionNode.api_activeId,
                instances: optionNode.api_instances,
                currentAPI: extractActiveCapability(optionNode.api_instances, optionNode.api_activeId) as APICapability,
              },
              link: {
                enabled: !!optionNode.link_instances && Object.keys(optionNode.link_instances || {}).length > 0,
                activeId: optionNode.link_activeId,
                instances: optionNode.link_instances,
                currentLinks: extractActiveCapability(optionNode.link_instances, optionNode.link_activeId) as LinkCapability,
              },
              markers: {
                enabled: !!optionNode.markers_instances && Object.keys(optionNode.markers_instances || {}).length > 0,
                activeId: optionNode.markers_activeId,
                instances: optionNode.markers_instances,
                currentMarkers: extractActiveCapability(optionNode.markers_instances, optionNode.markers_activeId) as MarkersCapability,
              },
            }
          });
          if (verbose()) dlog(`  ✅ Champ direct ajouté: ${optionNode.field_label || optionNode.label}`);
        }
        
        // 🎯 NOUVEAU: Récupérer TOUS les enfants de cette option (champs liés)
        // ⚠️ MAIS SEULEMENT si ce n'est PAS un leaf_option_field (pour éviter les doublons)
        if (optionNode.type !== 'leaf_option_field') {
          const optionChildren = childrenMap.get(optionNode.id) || [];
    if (verbose()) dlog(`  🔍 Enfants de l'option "${optionNode.label}": ${optionChildren.length}`);
          
          optionChildren
            .filter(child => child.type.includes('leaf_field'))
            .sort((a, b) => a.order - b.order)
            .forEach(childField => {
              if (verbose()) dlog(`    🍃 Enfant trouvé: "${childField.label}" (${childField.type})`);
              
              // 🔥 100% DYNAMIQUE PRISMA: Priorité subType > fieldType > type
              const finalChildFieldType = childField.subType || childField.fieldType || childField.type || 'text';
              
            dlog(`🔍 [TYPE DETECTION ENFANT] ${childField.label}`, { fieldType: childField.fieldType, subType: childField.subType, type: childField.type, final: finalChildFieldType });
              
              conditionalFields.push({
                id: childField.id,
                name: childField.label,
                label: childField.label,
                type: finalChildFieldType,
                required: childField.isRequired,
                visible: childField.isVisible,
                placeholder: childField.text_placeholder,
                description: childField.description,
                order: childField.order,
                config: {
                  size: childField.appearance_size,
                  width: childField.appearance_width,
                  variant: childField.appearance_variant,
                  minLength: childField.text_minLength,
                  maxLength: childField.text_maxLength,
                  rows: childField.text_rows,
                  mask: childField.text_mask, // 🔥 AJOUT: masque
                  regex: childField.text_regex,
                  textDefaultValue: childField.text_defaultValue,
                  min: childField.number_min,
                  max: childField.number_max,
                  step: childField.number_step,
                  decimals: childField.number_decimals,
                  prefix: childField.number_prefix,
                  suffix: childField.number_suffix,
                  unit: childField.number_unit,
                  numberDefaultValue: childField.number_defaultValue,
                  format: childField.date_format,
                  showTime: childField.date_showTime,
                  dateDefaultValue: childField.date_defaultValue,
                  // 🔥 AJOUT PRISMA DYNAMIC MINDATE/MAXDATE
                  minDate: childField.date_minDate,
                  maxDate: childField.date_maxDate,
                  multiple: childField.select_multiple,
                  searchable: childField.select_searchable,
                  allowClear: childField.select_allowClear,
                  selectDefaultValue: childField.select_defaultValue,
                  trueLabel: childField.bool_trueLabel,
                  falseLabel: childField.bool_falseLabel,
                  boolDefaultValue: childField.bool_defaultValue,
                },
                // 🎯 NOUVEAU: Capacités pour TOUS les champs enfants
                capabilities: {
                  data: {
                    enabled: !!childField.data_instances && Object.keys(childField.data_instances || {}).length > 0,
                    activeId: childField.data_activeId,
                    instances: childField.data_instances,
                  },
                  formula: {
                    enabled: !!childField.formula_instances && Object.keys(childField.formula_instances || {}).length > 0,
                    activeId: childField.formula_activeId,
                    instances: childField.formula_instances,
                    currentFormula: extractActiveCapability(childField.formula_instances, childField.formula_activeId) as FormulaCapability,
                  },
                  condition: {
                    enabled: !!childField.condition_instances && Object.keys(childField.condition_instances || {}).length > 0,
                    activeId: childField.condition_activeId,
                    instances: childField.condition_instances,
                    currentConditions: extractActiveCapability(childField.condition_instances, childField.condition_activeId) as ConditionCapability,
                  },
                  table: {
                    enabled: !!childField.table_instances && Object.keys(childField.table_instances || {}).length > 0,
                    activeId: childField.table_activeId,
                    instances: childField.table_instances,
                    currentTable: extractActiveCapability(childField.table_instances, childField.table_activeId) as TableCapability,
                  },
                  api: {
                    enabled: !!childField.api_instances && Object.keys(childField.api_instances || {}).length > 0,
                    activeId: childField.api_activeId,
                    instances: childField.api_instances,
                    currentAPI: extractActiveCapability(childField.api_instances, childField.api_activeId) as APICapability,
                  },
                  link: {
                    enabled: !!childField.link_instances && Object.keys(childField.link_instances || {}).length > 0,
                    activeId: childField.link_activeId,
                    instances: childField.link_instances,
                    currentLinks: extractActiveCapability(childField.link_instances, childField.link_activeId) as LinkCapability,
                  },
                  markers: {
                    enabled: !!childField.markers_instances && Object.keys(childField.markers_instances || {}).length > 0,
                    activeId: childField.markers_activeId,
                    instances: childField.markers_instances,
                    currentMarkers: extractActiveCapability(childField.markers_instances, childField.markers_activeId) as MarkersCapability,
                  },
                }
              });
            });
        }
        
        // 🔗 NOUVEAU: Ajouter les RÉFÉRENCES PARTAGÉES comme champs conditionnels
        const sharedRefIds = activeSharedReferences.get(optionNode.id);
        if (sharedRefIds && sharedRefIds.length > 0) {
          if (verbose()) dlog(`  🔗 Toujours inclure les ${sharedRefIds.length} références partagées pour l'option "${optionNode.label}" pour un rendu dynamique.`);

          sharedRefIds.forEach(refId => {
            const refNode = nodeLookup.get(refId);
            if (refNode) {
              if (verbose()) dlog(`    ➕ Ajout référence partagée: "${refNode.label}"`);
              
              const finalRefFieldType = refNode.subType || refNode.fieldType || refNode.type || 'TEXT';
              
              conditionalFields.push({
                id: refNode.id,
                name: refNode.label,
                label: refNode.label,
                type: finalRefFieldType,
                required: refNode.isRequired,
                visible: refNode.isVisible,
                placeholder: refNode.text_placeholder,
                description: refNode.description,
                order: refNode.order || 9999, // Ordre élevé par défaut
                // 🎯 AJOUT CRITIQUE: Nom de la référence partagée pour l'affichage dans TBLSectionRenderer
                sharedReferenceName: refNode.label,
                config: {
                size: refNode.appearance_size,
                width: refNode.appearance_width,
                variant: refNode.appearance_variant,
                minLength: refNode.text_minLength,
                maxLength: refNode.text_maxLength,
                rows: refNode.text_rows,
                mask: refNode.text_mask,
                regex: refNode.text_regex,
                textDefaultValue: refNode.text_defaultValue,
                min: refNode.number_min,
                max: refNode.number_max,
                step: refNode.number_step,
                decimals: refNode.number_decimals,
                prefix: refNode.number_prefix,
                suffix: refNode.number_suffix,
                unit: refNode.number_unit,
                numberDefaultValue: refNode.number_defaultValue,
                format: refNode.date_format,
                showTime: refNode.date_showTime,
                dateDefaultValue: refNode.date_defaultValue,
                minDate: refNode.date_minDate,
                maxDate: refNode.date_maxDate,
                multiple: refNode.select_multiple,
                searchable: refNode.select_searchable,
                allowClear: refNode.select_allowClear,
                selectDefaultValue: refNode.select_defaultValue,
                trueLabel: refNode.bool_trueLabel,
                falseLabel: refNode.bool_falseLabel,
                boolDefaultValue: refNode.bool_defaultValue,
              },
              capabilities: {
                data: {
                  enabled: !!refNode.data_instances && Object.keys(refNode.data_instances || {}).length > 0,
                  activeId: refNode.data_activeId,
                  instances: refNode.data_instances,
                },
                formula: {
                  enabled: !!refNode.formula_instances && Object.keys(refNode.formula_instances || {}).length > 0,
                  activeId: refNode.formula_activeId,
                  instances: refNode.formula_instances,
                  currentFormula: extractActiveCapability(refNode.formula_instances, refNode.formula_activeId) as FormulaCapability,
                },
                condition: {
                  enabled: !!refNode.condition_instances && Object.keys(refNode.condition_instances || {}).length > 0,
                  activeId: refNode.condition_activeId,
                  instances: refNode.condition_instances,
                  currentConditions: extractActiveCapability(refNode.condition_instances, refNode.condition_activeId) as ConditionCapability,
                },
                table: {
                  enabled: !!refNode.table_instances && Object.keys(refNode.table_instances || {}).length > 0,
                  activeId: refNode.table_activeId,
                  instances: refNode.table_instances,
                  currentTable: extractActiveCapability(refNode.table_instances, refNode.table_activeId) as TableCapability,
                },
                api: {
                  enabled: !!refNode.api_instances && Object.keys(refNode.api_instances || {}).length > 0,
                  activeId: refNode.api_activeId,
                  instances: refNode.api_instances,
                  currentAPI: extractActiveCapability(refNode.api_instances, refNode.api_activeId) as APICapability,
                },
                link: {
                  enabled: !!refNode.link_instances && Object.keys(refNode.link_instances || {}).length > 0,
                  activeId: refNode.link_activeId,
                  instances: refNode.link_instances,
                  currentLinks: extractActiveCapability(refNode.link_instances, refNode.link_activeId) as LinkCapability,
                },
                markers: {
                  enabled: !!refNode.markers_instances && Object.keys(refNode.markers_instances || {}).length > 0,
                  activeId: refNode.markers_activeId,
                  instances: refNode.markers_instances,
                  currentMarkers: extractActiveCapability(refNode.markers_instances, refNode.markers_activeId) as MarkersCapability,
                },
              }
            });
          } else {
            if (verbose()) dlog(`    ⚠️ Référence partagée "${refId}" introuvable`);
          }
        });
        }
        
  if (verbose()) dlog(`  📊 Total champs conditionnels pour "${optionNode.label}": ${conditionalFields.length}`);
        
        return {
          id: optionNode.id,
          label: optionNode.option_label || optionNode.label,
          // Stocker la valeur MÉTIER par défaut (label) plutôt que l'id du nœud
          value: optionNode.value || optionNode.option_label || optionNode.label,
          conditionalFields: conditionalFields.length > 0 ? conditionalFields : undefined,
          // ✨ AJOUT: Capacités TreeBranchLeaf pour la détection automatique
          hasData: optionNode.hasData,
          hasFormula: optionNode.hasFormula,
          hasCondition: optionNode.hasCondition,
          hasTable: optionNode.hasTable,
          hasAPI: optionNode.hasAPI,
          hasLink: optionNode.hasLink,
          capabilities: optionNode.metadata?.capabilities,
          metadata: optionNode.metadata
        };
      });
    
    return {
      id: node.id,
      name: node.label,
      label: node.label,
      type: 'select',
      required: node.isRequired,
      visible: node.isVisible,
      description: node.description,
      order: node.order,
      isSelect: true,
      // 💡 Propriétés tooltip depuis les colonnes TBL
      text_helpTooltipType: node.text_helpTooltipType,
      text_helpTooltipText: node.text_helpTooltipText,
      text_helpTooltipImage: node.text_helpTooltipImage,
      // 🎯 APPARENCE CONFIG avec tooltips intégrés
      appearanceConfig: {
        ...(node.appearanceConfig || {}),
        // ✅ Ajouter les tooltips dans appearanceConfig
        helpTooltipType: node.text_helpTooltipType,
        helpTooltipText: node.text_helpTooltipText,
        helpTooltipImage: node.text_helpTooltipImage
      },
      options,
      config: {
        size: node.appearance_size,
        width: node.appearance_width,
        variant: node.appearance_variant,
        // ✅ Support du choix multiple : select_multiple OU isMultiple (pour branches SELECT)
        multiple: node.select_multiple || node.isMultiple,
        searchable: node.select_searchable,
        allowClear: node.select_allowClear,
        selectDefaultValue: node.select_defaultValue,
      },
      capabilities
    };
  } else if (node.type === 'leaf_repeater') {
    // 🔁 C'EST UN RÉPÉTABLE
    if (verbose()) dlog(`🔁 [REPEATER] Transformation répétable: "${node.label}"`);
    
    // Extraire les metadata.repeater depuis les colonnes Prisma
    // 🛡️ S'assurer que templateNodeIds est toujours un tableau
    let templateNodeIds = node.repeater_templateNodeIds || [];
    if (!Array.isArray(templateNodeIds)) {
      // Si c'est un objet JSON ou une chaîne, essayer de parser
      if (typeof templateNodeIds === 'string') {
        try {
          templateNodeIds = JSON.parse(templateNodeIds);
        } catch (e) {
          console.error('❌ [REPEATER] Impossible de parser repeater_templateNodeIds:', e);
          templateNodeIds = [];
        }
      } else {
        templateNodeIds = [];
      }
    }

    if (templateNodeIds.length === 0 && node.metadata && typeof node.metadata === 'object') {
      const legacyRepeater = (node.metadata as Record<string, unknown>).repeater as { templateNodeIds?: unknown } | undefined;
      if (legacyRepeater?.templateNodeIds && Array.isArray(legacyRepeater.templateNodeIds)) {
        // ⚡️ Fallback legacy: réutiliser les IDs définis dans metadata.repeater
        templateNodeIds = legacyRepeater.templateNodeIds as string[];
      }
    }
    
    // 🏷️ Extraire templateNodeLabels depuis la colonne Prisma
    let templateNodeLabels = node.repeater_templateNodeLabels || null;
    if (typeof templateNodeLabels === 'string') {
      try {
        templateNodeLabels = JSON.parse(templateNodeLabels);
      } catch (e) {
        console.error('❌ [REPEATER] Impossible de parser repeater_templateNodeLabels:', e);
        templateNodeLabels = null;
      }
    }

    if (!templateNodeLabels && node.metadata && typeof node.metadata === 'object') {
      const legacyRepeater = (node.metadata as Record<string, unknown>).repeater as { templateNodeLabels?: unknown } | undefined;
      if (legacyRepeater?.templateNodeLabels && typeof legacyRepeater.templateNodeLabels === 'object') {
        // ⚡️ Fallback legacy: récupérer les labels conservés dans metadata.repeater
        templateNodeLabels = legacyRepeater.templateNodeLabels;
      }
    }

    if (Array.isArray(templateNodeLabels)) {
      const templateLabelsArray = templateNodeLabels;
      templateNodeLabels = templateNodeIds.reduce<Record<string, string>>((acc, templateId, index) => {
        const maybeLabel = templateLabelsArray?.[index];
        if (typeof maybeLabel === 'string' && maybeLabel.trim().length > 0) {
          acc[templateId] = maybeLabel;
        }
        return acc;
      }, {});
    }

    if ((!templateNodeLabels || Object.keys(templateNodeLabels).length === 0) && templateNodeIds.length > 0) {
      const derivedLabels: Record<string, string> = {};

      const pickLabel = (templateId: string): string | undefined => {
        const candidateNode = nodeLookup.get(templateId) || children.find(child => child.id === templateId);
        if (!candidateNode) return undefined;

        const metadata = typeof candidateNode.metadata === 'object' ? candidateNode.metadata as Record<string, unknown> : undefined;
        const metadataLabelCandidate = metadata
          ? (metadata['originalLabel'] ?? metadata['label'] ?? metadata['displayName'])
          : undefined;
        const metadataLabel = typeof metadataLabelCandidate === 'string' ? metadataLabelCandidate : undefined;

        return (
          candidateNode.label ||
          (candidateNode as { field_label?: string }).field_label ||
          (candidateNode as { option_label?: string }).option_label ||
          metadataLabel
        );
      };

      templateNodeIds.forEach(templateId => {
        const label = pickLabel(templateId);
        if (label) {
          derivedLabels[templateId] = label;
        }
      });

      if (Object.keys(derivedLabels).length > 0) {
        templateNodeLabels = derivedLabels;
      }
    }
    
    const repeaterMetadata = {
      templateNodeIds,
      templateNodeLabels, // ✅ AJOUT DES LABELS
      minItems: node.repeater_minItems || 0,
      maxItems: node.repeater_maxItems || null,
      addButtonLabel: node.repeater_addButtonLabel || null, // ⚡ NULL = utilise le nom du champ
      buttonSize: node.repeater_buttonSize || 'middle',
      buttonWidth: node.repeater_buttonWidth || 'auto',
      iconOnly: node.repeater_iconOnly || false
    };
    
    if (verbose()) dlog(`🔁 [REPEATER] Metadata:`, repeaterMetadata);
    
    return {
      id: node.id,
      name: node.label,
      label: node.label,
      type: 'leaf_repeater', // ⬅️ TYPE SPÉCIFIQUE POUR LE RÉPÉTABLE
      required: node.isRequired,
      visible: node.isVisible,
      description: node.description,
      order: node.order,
      // 🎯 APPARENCE CONFIG pour le repeater
      appearanceConfig: {
        ...(node.appearanceConfig || {}),
        // ✅ Ajouter les tooltips dans appearanceConfig
        helpTooltipType: node.text_helpTooltipType,
        helpTooltipText: node.text_helpTooltipText,
        helpTooltipImage: node.text_helpTooltipImage
      },
      // 🎯 METADATA RÉPÉTABLE
      metadata: {
        repeater: repeaterMetadata
      },
      capabilities
    };
    
  } else if (node.type.includes('leaf_field')) {
    // 🎯 C'EST UN CHAMP SIMPLE
    
    // 🔥 100% DYNAMIQUE PRISMA: Priorité subType > fieldType > type
    const finalFieldType = node.subType || node.fieldType || node.type || 'text';
    
  dlog(`🔍 [TYPE DETECTION SIMPLE] ${node.label}`, { fieldType: node.fieldType, subType: node.subType, type: node.type, final: finalFieldType });
    
    return {
      id: node.id,
      name: node.label,
      label: node.label,
      type: finalFieldType,
      required: node.isRequired,
      value: node.defaultValue || node.value || node.bool_defaultValue || node.text_defaultValue || node.number_defaultValue || node.select_defaultValue || node.date_defaultValue,
      visible: node.isVisible,
      placeholder: node.text_placeholder,
      description: node.description,
      order: node.order,
      // 🎯 NOUVEAU: Marquer si le champ a besoin de résolution de valeur
      needsValueResolution: node.hasData,
      // 💡 Propriétés tooltip depuis les colonnes TBL
      text_helpTooltipType: node.text_helpTooltipType,
      text_helpTooltipText: node.text_helpTooltipText,
      text_helpTooltipImage: node.text_helpTooltipImage,
      // 🎯 APPARENCE CONFIG avec tooltips intégrés
      appearanceConfig: {
        ...(node.appearanceConfig || {}),
        // ✅ Ajouter les tooltips dans appearanceConfig
        helpTooltipType: node.text_helpTooltipType,
        helpTooltipText: node.text_helpTooltipText,
        helpTooltipImage: node.text_helpTooltipImage
      },
      config: {
        size: node.appearance_size,
        width: node.appearance_width,
        variant: node.appearance_variant,
        minLength: node.text_minLength,
        maxLength: node.text_maxLength,
        rows: node.text_rows,
        mask: node.text_mask, // 🔥 AJOUT: masque
        regex: node.text_regex,
        textDefaultValue: node.text_defaultValue,
        min: node.number_min,
        max: node.number_max,
        step: node.number_step,
        decimals: node.number_decimals,
        prefix: node.number_prefix,
        suffix: node.number_suffix,
        unit: node.number_unit,
        numberDefaultValue: node.number_defaultValue,
        format: node.date_format,
        showTime: node.date_showTime,
        dateDefaultValue: node.date_defaultValue,
        // 🔥 AJOUT PRISMA DYNAMIC MINDATE/MAXDATE
        minDate: node.date_minDate,
        maxDate: node.date_maxDate,
        multiple: node.select_multiple,
        searchable: node.select_searchable,
        allowClear: node.select_allowClear,
        selectDefaultValue: node.select_defaultValue,
        trueLabel: node.bool_trueLabel,
        falseLabel: node.bool_falseLabel,
        boolDefaultValue: node.bool_defaultValue,
        maxSize: node.image_maxSize,
        ratio: node.image_ratio,
        crop: node.image_crop,
        thumbnails: node.image_thumbnails,
      },
      capabilities
    };
  }
  
  // Fallback pour autres types
  // 🔥 100% DYNAMIQUE PRISMA: Priorité subType > fieldType > type
  const finalFallbackType = node.subType || node.fieldType || node.type || 'text';
  
  dlog(`🔍 [TYPE DETECTION FALLBACK] ${node.label}`, { fieldType: node.fieldType, subType: node.subType, type: node.type, final: finalFallbackType });
  
  return {
    id: node.id,
    name: node.label,
    label: node.label,
    type: finalFallbackType,
    required: node.isRequired,
    visible: node.isVisible,
    order: node.order,
    capabilities
  };
};

// 🌳 FONCTION PRINCIPALE: Transformation hiérarchique DYNAMIQUE PRISMA
export const transformNodesToTBLComplete = (
  nodes: TreeBranchLeafNode[],
  formData?: Record<string, any> // 🔗 NOUVEAU: Pour vérifier les sélections d'options
): {
  tree: TBLTree;
  tabs: TBLTab[];
  fieldsByTab: Record<string, TBLField[]>;
  sectionsByTab: Record<string, TBLSection[]>;
} => {
  if (verbose()) dlog('🌳 [TBL-PRISMA] Début transformation DYNAMIQUE:', { nodesCount: nodes.length });
  
  // 1️⃣ Créer les maps de hiérarchie
  const nodeMap = new Map<string, TreeBranchLeafNode>();
  const childrenMap = new Map<string, TreeBranchLeafNode[]>();
  
  nodes.forEach(node => {
    nodeMap.set(node.id, node);
    const parentId = node.parentId || 'root';
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(node);
  });
  
  // ✅ 1.5️⃣ NOUVELLE LOGIQUE : Stocker TOUTES les références partagées (single ET multiple)
  // On ne modifie PAS childrenMap, on stocke juste quelles options ont des refs actives
  const activeSharedReferences = new Map<string, string[]>(); // optionId -> [refNodeIds]

  nodes.forEach(node => {
    const ids: string[] = [];
    if (Array.isArray((node as unknown as { sharedReferenceIds?: string[] }).sharedReferenceIds)) {
      ids.push(...((node as unknown as { sharedReferenceIds?: string[] }).sharedReferenceIds as string[]));
    }
    const single = (node as unknown as { sharedReferenceId?: string }).sharedReferenceId;
    if (typeof single === 'string' && single.trim().length > 0) {
      ids.push(single);
    }

    if (ids.length > 0) {
      const isOption = node.type === 'leaf_option' || node.type === 'leaf_option_field';
      if (isOption) {
        // 🎯 STOCKER TOUTES les options avec références, la sélection sera vérifiée dynamiquement
        // Dédupliquer pour éviter doublons potentiels
        const uniqueIds = Array.from(new Set(ids));
        activeSharedReferences.set(node.id, uniqueIds);
        if (verbose()) dlog(`🔗 [TBL-PRISMA] Option "${node.label}" stockée avec ${uniqueIds.length} références partagées (single/array)`);
      }
    }
  });
  
  // 2️⃣ Identifier les niveaux selon votre architecture EXACTE
  // ❌ FILTRER LES RÉFÉRENCES PARTAGÉES - Elles ne sont PAS des onglets !
  const allRootChildren = childrenMap.get('root') || [];
  const niveau1Nodes = allRootChildren.filter(node => !node.isSharedReference);
  
  if (verbose()) {
    const filteredCount = allRootChildren.length - niveau1Nodes.length;
    if (filteredCount > 0) {
      dlog(`🚫 [TBL-PRISMA] ${filteredCount} références partagées EXCLUES des onglets:`, 
        allRootChildren.filter(n => n.isSharedReference).map(n => n.label));
    }
    dlog('🔍 [TBL-PRISMA] Onglets (Niveau 1):', niveau1Nodes.length, niveau1Nodes.map(n => `${n.label} (order: ${n.order})`));
  }
  
  // 3️⃣ Fonction récursive pour traiter TOUS les niveaux selon TreeBranchLeaf
  const processedNodeIds = new Set<string>(); // 🎯 ÉVITER LES DOUBLONS
  const detectedSections = new Map<string, { node: TreeBranchLeafNode, fields: TBLField[] }>(); // 🎯 SECTIONS DÉTECTÉES
  
  const processNodeRecursively = (nodeId: string, currentLevel: number = 2): TBLField[] => {
    const children = childrenMap.get(nodeId) || [];
    const processedFields: TBLField[] = [];
    
  if (verbose()) dlog(`  🌿 Niveau ${currentLevel} - Nœud "${nodeMap.get(nodeId)?.label}": ${children.length} enfants`);
    
    // 🎯 TRAITER TOUS LES ENFANTS DANS L'ORDRE PRISMA (par order)
    children
      .sort((a, b) => a.order - b.order) // RESPECT STRICT DE L'ORDRE PRISMA
      .forEach(child => {
  if (verbose()) dlog(`    📝 Traitement: "${child.label}" (type: ${child.type}, order: ${child.order})`);
        
        // 🎯 ÉVITER LES DOUBLONS - vérifier si ce nœud a déjà été traité
        if (processedNodeIds.has(child.id)) {
          if (verbose()) dlog(`      🚫 DOUBLON ÉVITÉ: "${child.label}" déjà traité`);
          return;
        }
        
        // 🎯 RESPECTER LA HIÉRARCHIE TREEBRANCHLEAF DYNAMIQUEMENT
        if (child.type === 'section') {
          // 🏗️ C'EST UNE SECTION = CRÉER UNE SOUS-SECTION TBL
          if (verbose()) dlog(`      📦 Section détectée: "${child.label}" - traitement des champs de la section`);
      const sectionFields = processNodeRecursively(child.id, currentLevel + 1);
          detectedSections.set(child.id, { node: child, fields: sectionFields });
          if (verbose()) dlog(`      ✅ Section "${child.label}" créée avec ${sectionFields.length} champs`);
          // ⚡ IMPORTANT: Ajouter aussi les champs à la liste principale pour qu'ils soient disponibles
          processedFields.push(...sectionFields);
          processedNodeIds.add(child.id); // 🎯 MARQUER COMME TRAITÉ
          
        } else if (child.type === 'branch' || (!child.type.includes('leaf') && child.type !== 'root')) {
          // 🌳 C'EST UNE BRANCHE = PEUT ÊTRE UNE LISTE DÉROULANTE OU CONTENIR DES ÉLÉMENTS
          const grandChildren = childrenMap.get(child.id) || [];
          const hasOptions = grandChildren.some(gc => gc.type === 'leaf_option' || gc.type === 'leaf_option_field');
          
          if (hasOptions) {
            // 🎯 BRANCHE AVEC OPTIONS = LISTE DÉROULANTE
            const selectField = transformPrismaNodeToField(child, childrenMap, nodeMap, activeSharedReferences, formData);
            processedFields.push(selectField);
            if (verbose()) dlog(`      ✅ Liste déroulante: "${selectField.label}" avec ${selectField.options?.length || 0} options`);
          } else {
            // 🎯 BRANCHE SANS OPTIONS = CONTENEUR - TRAITER SES ENFANTS
            if (verbose()) dlog(`      🔄 Branche conteneur: "${child.label}" - traitement des enfants`);
          }
          
          // TOUJOURS traiter les enfants de cette branche récursivement
          const subFields = processNodeRecursively(child.id, currentLevel + 1);
          processedFields.push(...subFields);
          
        } else if (child.type.includes('leaf_field')) {
          // 🍃 C'EST UNE FEUILLE = CHAMP SIMPLE
          const field = transformPrismaNodeToField(child, childrenMap, nodeMap, activeSharedReferences, formData);
          processedFields.push(field);
          processedNodeIds.add(child.id); // 🎯 MARQUER COMME TRAITÉ
          if (verbose()) dlog(`      🍃 Champ simple: "${field.label}" (${field.type})`);
          
          // Vérifier s'il y a des liens depuis ce champ
          const linkedChildren = childrenMap.get(child.id) || [];
          if (linkedChildren.length > 0) {
            if (verbose()) dlog(`        🔗 LIENS depuis champ "${child.label}": ${linkedChildren.length} éléments`);
            const linkedFields = processNodeRecursively(child.id, currentLevel + 1);
            processedFields.push(...linkedFields);
          }
          
        } else if (child.type === 'leaf_repeater') {
          // 🔁 C'EST UN RÉPÉTABLE = AJOUTER COMME CHAMP SPÉCIAL
          const repeaterField = transformPrismaNodeToField(child, childrenMap, nodeMap, activeSharedReferences, formData);
          processedFields.push(repeaterField);
          processedNodeIds.add(child.id); // 🎯 MARQUER COMME TRAITÉ
          if (verbose()) dlog(`      🔁 Répétable: "${repeaterField.label}" avec metadata.repeater:`, repeaterField.metadata?.repeater);
          
          // 🆕 NOUVELLE LOGIQUE: Distinguer templates vs copies réelles
          const allChildren = childrenMap.get(child.id) || [];
          const templateNodeIds = repeaterField.metadata?.repeater?.templateNodeIds || [];
          
          // Séparer templates des copies
          const templates = allChildren.filter(node => templateNodeIds.includes(node.id));
          const realCopies = allChildren.filter(node => {
            const meta = node.metadata as any;
            return meta?.sourceTemplateId && templateNodeIds.includes(meta.sourceTemplateId);
          });
          
          if (verbose()) dlog(`        � Templates: ${templates.length}, 📋 Copies réelles: ${realCopies.length}`);
          
          // Marquer SEULEMENT les templates comme traités (pas les copies)
          templates.forEach(template => {
            processedNodeIds.add(template.id);
          });
          
          // 📋 TRAITER LES COPIES RÉELLES comme des champs normaux
          realCopies.forEach((copyNode, index) => {
            const copyField = transformPrismaNodeToField(copyNode, childrenMap, nodeMap, activeSharedReferences, formData);
            
            // 🗑️ AJOUTER LES MÉTADONNÉES DE SUPPRESSION
            copyField.isDeletableCopy = true;
            copyField.parentRepeaterId = child.id;
            copyField.sourceTemplateId = (copyNode.metadata as any)?.sourceTemplateId;
            
            // ➕ AJOUTER LE BOUTON + SUR LA DERNIÈRE COPIE
            copyField.isLastInCopyGroup = (index === realCopies.length - 1);
            copyField.canAddNewCopy = copyField.isLastInCopyGroup;
            
            processedFields.push(copyField);
            processedNodeIds.add(copyNode.id);
            if (verbose()) dlog(`        📋 Copie ajoutée: "${copyField.label}" (sourceTemplate: ${(copyNode.metadata as any)?.sourceTemplateId}) ${copyField.isLastInCopyGroup ? '➕' : ''}`);
          });
          
          // ➕ SI AUCUNE COPIE, LE TEMPLATE PEUT CRÉER UNE NOUVELLE COPIE
          if (realCopies.length === 0 && templates.length > 0) {
            // Ajouter le bouton + sur le premier template (original)
            const originalTemplate = templates[0];
            const originalTemplateField = transformPrismaNodeToField(originalTemplate, childrenMap, nodeMap, activeSharedReferences, formData);
            originalTemplateField.canAddNewCopy = true;
            originalTemplateField.isLastInCopyGroup = true;
            originalTemplateField.parentRepeaterId = child.id;
            
            processedFields.push(originalTemplateField);
            processedNodeIds.add(originalTemplate.id);
            if (verbose()) dlog(`        📝 Template original avec bouton +: "${originalTemplateField.label}"`);
          }
          
        } else if (child.type === 'leaf_option' || child.type === 'leaf_option_field') {
          // ⚠️ OPTIONS DÉJÀ TRAITÉES DANS LA LISTE DÉROULANTE PARENTE
          if (verbose()) dlog(`      ⚠️ Option "${child.label}" déjà traitée dans liste déroulante`);
          processedNodeIds.add(child.id); // 🎯 MARQUER COMME TRAITÉ
          
          // Mais traiter les liens depuis cette option (et marquer les enfants comme traités)
          const linkedChildren = childrenMap.get(child.id) || [];
          if (linkedChildren.length > 0) {
            if (verbose()) dlog(`        🔗 LIENS depuis option "${child.label}": ${linkedChildren.length} éléments`);
            // Marquer tous les enfants liés comme traités pour éviter les doublons
            linkedChildren.forEach(linkedChild => {
              processedNodeIds.add(linkedChild.id);
            });
            const linkedFields = processNodeRecursively(child.id, currentLevel + 1);
            processedFields.push(...linkedFields);
          }
        }
      });
    
    return processedFields;
  };
  
  // 4️⃣ Construire les onglets avec transformation DYNAMIQUE
  const tabs: TBLTab[] = [];
  const fieldsByTab: Record<string, TBLField[]> = {};
  const sectionsByTab: Record<string, TBLSection[]> = {};
  
  niveau1Nodes
    .sort((a, b) => a.order - b.order)
    .forEach(ongletNode => {
  if (verbose()) dlog(`📑 [TBL-PRISMA] === ONGLET: "${ongletNode.label}" ===`);
      
      // Traiter RÉCURSIVEMENT tous les descendants à partir du niveau 2
      const ongletFields = processNodeRecursively(ongletNode.id, 2);
      
      // Trier tous les champs par ordre global
      const sortedFields = ongletFields.sort((a, b) => a.order - b.order);
      
      // 🎯 UTILISER LES VRAIES SECTIONS DÉTECTÉES
      const ongletSections: TBLSection[] = [];
      
      // Trouver les sections détectées pour cet onglet
      const sectionsForTab = Array.from(detectedSections.entries())
        .filter(([sectionId]) => {
          const sectionNode = nodeMap.get(sectionId);
          return sectionNode?.parentId === ongletNode.id;
        });
      
      if (sectionsForTab.length > 0) {
        // Créer une section pour chaque section détectée
        sectionsForTab.forEach(([sectionId, sectionData], index) => {
          // 🔥 FILTRE CRITIQUE: Exclure les COPIES de répéteurs (metadata.sourceTemplateId) de chaque section détectée
          const sectionFieldsFiltered = sectionData.fields.filter(field => {
              const meta = (field.metadata || {}) as any;
              const sourceTemplateId = meta?.sourceTemplateId;
              const parentId = nodeMap.get(field.id)?.parentId;
              if (sourceTemplateId && isCopyFromRepeater(sourceTemplateId, nodeMap, parentId)) {
                console.log(`🚫 [TBL-HOOK] Exclusion de copie de répéteur "${field.label}" de la section détectée "${sectionData.node.label}" (sourceTemplateId: ${meta.sourceTemplateId})`);
                return false; // exclude real repeater copies from sections
              }
              // Otherwise include the copy (e.g., copies created in display section)
              return true;
            });
          
          ongletSections.push({
            id: `${sectionId}-section`,
            name: sectionData.node.label,
            title: sectionData.node.label,
            description: sectionData.node.description || undefined,
            fields: sectionFieldsFiltered,
            order: index,
            isDataSection: true // 🎯 TOUTES les sections TreeBranchLeaf sont des sections données
          });
          
          // 🎯 Log pour vérifier la création des sections données
          dlog(`🎯 [TBL] Section TreeBranchLeaf créée: "${sectionData.node.label}" -> isDataSection: true (${sectionFieldsFiltered.length} champs)`);
        });
        
        // Ajouter une section pour les champs qui ne sont dans aucune section
        const fieldsInSections = sectionsForTab.flatMap(([, sectionData]) => sectionData.fields.map(f => f.id));
        const fieldsNotInSections = sortedFields.filter(f => !fieldsInSections.includes(f.id));
        
        // 🔥 FILTRE CRITIQUE: Exclure les COPIES de répéteurs (metadata.sourceTemplateId) avant de les ajouter aux sections
        const fieldsNotInSectionsFiltered = fieldsNotInSections.filter(field => {
          const meta = (field.metadata || {}) as any;
          const sourceTemplateId = meta?.sourceTemplateId;
          const parentId = nodeMap.get(field.id)?.parentId;
          if (sourceTemplateId && isCopyFromRepeater(sourceTemplateId, nodeMap, parentId)) {
            console.log(`🚫 [TBL-HOOK] Exclusion de copie de répéteur "${field.label}" de la section "${ongletNode.label}" (sourceTemplateId: ${meta.sourceTemplateId})`);
            return false;
          }
          return true;
        });
        
        if (fieldsNotInSectionsFiltered.length > 0) {
          ongletSections.push({
            id: `${ongletNode.id}-section`,
            name: ongletNode.label,
            title: ongletNode.label,
            description: ongletNode.description || undefined,
            fields: fieldsNotInSectionsFiltered,
            order: sectionsForTab.length
          });
        }
      } else {
        // 🔥 FILTRE CRITIQUE: Exclure les COPIES de répéteurs (metadata.sourceTemplateId) avant de créer la section par défaut
        const sortedFieldsFiltered = sortedFields.filter(field => {
          const meta = (field.metadata || {}) as any;
          const sourceTemplateId = meta?.sourceTemplateId;
          const parentId = nodeMap.get(field.id)?.parentId;
          if (sourceTemplateId && isCopyFromRepeater(sourceTemplateId, nodeMap, parentId)) {
            console.log(`🚫 [TBL-HOOK] Exclusion de copie de répéteur "${field.label}" de la section par défaut "${ongletNode.label}" (sourceTemplateId: ${meta.sourceTemplateId})`);
            return false;
          }
          return true;
        });
        
        // Pas de sections détectées, créer une section par défaut
        ongletSections.push({
          id: `${ongletNode.id}-section`,
          name: ongletNode.label,
          title: ongletNode.label,
          description: ongletNode.description || undefined,
          fields: sortedFieldsFiltered,
          order: 0
        });
      }
      
      // Construire l'onglet
      const tab: TBLTab = {
        id: ongletNode.id,
        name: ongletNode.label,
        label: ongletNode.label,
        order: ongletNode.order,
        sections: ongletSections,
        allFields: sectionsForTab.length > 0 ? 
          ongletSections.flatMap(section => section.fields) : // Utiliser tous les champs des sections
          sortedFields // Ou tous les champs si pas de sections
      };
      
      tabs.push(tab);
      fieldsByTab[tab.id] = tab.allFields;
      sectionsByTab[tab.id] = ongletSections;
      
  if (verbose()) dlog(`✅ [TBL-PRISMA] Onglet "${tab.label}" créé: ${sortedFields.length} champs dynamiques`);
    });
  
  // 5️⃣ Construire l'arbre final DYNAMIQUEMENT
  const treeRootNode = nodes.find(n => n.parentId === null && n.type === 'root') || nodes[0];
  const tree: TBLTree = {
    id: treeRootNode?.treeId || 'unknown',
    name: treeRootNode?.label || treeRootNode?.value || 'Formulaire',
    tabs: tabs.sort((a, b) => a.order - b.order)
  };
  
  const totalFields = Object.values(fieldsByTab).flat().length;
  if (verbose()) dlog('✅ [TBL-PRISMA] Transformation DYNAMIQUE terminée:', { 
    tabs: tabs.length, 
    totalFields,
    totalSections: Object.values(sectionsByTab).flat().length 
  });
  
  return { tree, tabs, fieldsByTab, sectionsByTab };
};

// 🎯 HOOK PRINCIPAL
export const useTBLDataPrismaComplete = ({ tree_id, disabled = false }: { tree_id: string; disabled?: boolean }) => {
  console.log('🎯 [TBL DEBUG] useTBLDataPrismaComplete appelé avec tree_id:', tree_id, 'disabled:', disabled);
  
  // ✅ STABILISATION ULTRA CRITIQUE: Utiliser un REF pour que l'API ne change JAMAIS
  const apiHook = useAuthenticatedApi();
  const apiRef = useRef(apiHook.api);
  
  // Mettre à jour le ref seulement si api change vraiment
  useEffect(() => {
    if (apiHook.api && apiHook.api !== apiRef.current) {
      apiRef.current = apiHook.api;
    }
  }, [apiHook.api]);
  
  const api = apiRef.current;
  
  const [tree, setTree] = useState<TBLTree | null>(null);
  const [tabs, setTabs] = useState<TBLTab[]>([]);
  const [fieldsByTab, setFieldsByTab] = useState<Record<string, TBLField[]>>({});
  const [sectionsByTab, setSectionsByTab] = useState<Record<string, TBLSection[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawNodes, setRawNodes] = useState<TreeBranchLeafNode[]>([]); // 🔄 NOUVEAU: Garder les données brutes pour retransformation
  const rawNodesRef = useRef<TreeBranchLeafNode[]>([]); // 🔄 NOUVEAU: Ref stable pour éviter recréation callback
  const capabilityDebounceRef = useRef<number | null>(null);
  
  // Synchroniser le ref avec le state
  useEffect(() => {
    rawNodesRef.current = rawNodes;
    try { (window as any).__DEBUG_RAW_NODES = rawNodes; } catch { /* ignore */ }
  }, [rawNodes]);

  // Feature: When form data changes, re-transform the existing rawNodes with the new formData
  // This state/ref pair is used to trigger a recompute of the memoized transform without fetching.
  const [formDataVersion, setFormDataVersion] = useState(0);
  const formDataVersionRef = useRef<number>(0);
  useEffect(() => { formDataVersionRef.current = formDataVersion; }, [formDataVersion]);

  const transformedRef = useRef<ReturnType<typeof transformNodesToTBLComplete> | null>(null);
  useEffect(() => { transformedRef.current = { tree, tabs, fieldsByTab, sectionsByTab }; }, [tree, tabs, fieldsByTab, sectionsByTab]);

  const fetchData = useCallback(async () => {
    if (!tree_id || disabled) return;

    try {
      setLoading(true);
      setError(null);
      if (verbose()) dlog('📡 [TBL-PRISMA] Récupération données:', { tree_id });

      const response = await api.get(`/api/treebranchleaf/trees/${tree_id}/nodes`);
      if (response && Array.isArray(response)) {
        // store raw
        setRawNodes(response);
        const formData = (typeof window !== 'undefined' && window.TBL_FORM_DATA) || {};
        const transformedData = transformNodesToTBLComplete(response, formData);
        if (verbose()) dlog('🔄 [TBL-PRISMA] Phase 2: Résolution des valeurs dynamiques...');

        const resolvedFieldsByTab: Record<string, TBLField[]> = {};
        for (const [tabId, fields] of Object.entries(transformedData.fieldsByTab)) {
          const resolvedFields = await Promise.all(
            fields.map(async (field) => {
              if (field.needsValueResolution) {
                try {
                  if (verbose()) dlog(`🔍 [TBL-PRISMA] Résolution valeur pour "${field.label}"`);
                  const originalNode = response.find(node => node.id === field.id);
                  if (originalNode) {
                    const { value: resolvedValue, variableConfig } = await resolveFieldValue(originalNode, api, tree_id);
                    let nextCapabilities = field.capabilities;
                    const variableId = originalNode.id;
                    if (variableConfig) {
                      nextCapabilities = {
                        ...(field.capabilities || {}),
                        data: {
                          enabled: true,
                          activeId: variableId,
                          instances: {
                            ...(field.capabilities?.data?.instances || {}),
                            [variableId]: { metadata: { ...(variableConfig as Record<string, unknown>) } }
                          }
                        }
                      } as TBLField['capabilities'];
                    }
                    if (resolvedValue !== null) {
                      if (verbose()) dlog(`✅ [TBL-PRISMA] Valeur résolue pour "${field.label}": ${resolvedValue}`);
                      return { ...field, value: resolvedValue, capabilities: nextCapabilities };
                    }
                    if (variableConfig) {
                      if (verbose()) dlog(`ℹ️ [TBL-PRISMA] Valeur non calculée pour "${field.label}", évaluation déléguée`);
                      return { ...field, capabilities: nextCapabilities };
                    }
                  }
                } catch (valueError) {
                  console.error(`❌ [TBL-PRISMA] Erreur résolution valeur pour "${field.label}":`, valueError);
                }
              }
              return field;
            })
          );
          resolvedFieldsByTab[tabId] = resolvedFields;
        }

        const resolvedSectionsByTab: Record<string, TBLSection[]> = {};
        for (const [tabId, sections] of Object.entries(transformedData.sectionsByTab)) {
          const resolvedSections = sections.map(section => ({
            ...section,
            fields: resolvedFieldsByTab[tabId]?.filter(field => section.fields.some(sectionField => sectionField.id === field.id)) || section.fields
          }));
          resolvedSectionsByTab[tabId] = resolvedSections;
        }

        const resolvedTabs = transformedData.tabs.map(tab => ({ ...tab, allFields: resolvedFieldsByTab[tab.id] || tab.allFields, sections: resolvedSectionsByTab[tab.id] || tab.sections }));
        if (verbose()) dlog('✅ [TBL-PRISMA] Résolution des valeurs terminée');
        createAutomaticMirrors(resolvedTabs, response);
        setTree({ ...transformedData.tree, tabs: resolvedTabs });
        setTabs(resolvedTabs);
        setFieldsByTab(resolvedFieldsByTab);
        setSectionsByTab(resolvedSectionsByTab);
      } else {
        console.error('❌ [TBL-PRISMA] Réponse API invalide:', response);
        setError('Format de données invalide');
      }
    } catch (err) {
      console.error('❌ [TBL-PRISMA] Erreur:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [api, tree_id, disabled]);

  const reconcileDuplicatedNodes = useCallback(async (duplicated: Array<{ id: string; parentId?: string; sourceTemplateId?: string }>) => {
    if (!duplicated || duplicated.length === 0) return;
    const getMissing = () => {
      const t = transformedRef.current;
      if (!t) return duplicated.map(d => d.id);
      const allFields = Object.values(t.fieldsByTab || {}).flat();
      return duplicated.map(d => d.id).filter(id => !allFields.some(f => f.id === id));
    };

    let missing = getMissing();
    if (missing.length === 0) return;
    let attempts = 0;
    while (missing.length > 0 && attempts < 4) {
      attempts += 1;
  await Promise.all(missing.map(async id => {
        try {
          const res = await apiRef.current.get(`/api/treebranchleaf/nodes/${id}/full`);
          const nodes: TreeBranchLeafNode[] = Array.isArray(res) ? res as TreeBranchLeafNode[] : (res && typeof res === 'object' ? (res.data || res.nodes || (res.node ? [res.node] : [])) : []);
          if (nodes.length > 0) {
            setRawNodes(prev => {
              const known = new Set(prev.map(n => n.id));
              const newOnes = nodes.filter(n => !known.has(n.id));
              if (newOnes.length === 0) return prev;
              return [...prev, ...newOnes];
            });
          }
        } catch { /* ignore */ }
      }));

      await new Promise(r => setTimeout(r, 200));
      setFormDataVersion(v => v + 1);
      await new Promise(r => setTimeout(r, 100));
      missing = getMissing();
    }

    if (missing.length > 0) {
      console.warn('[TBL Hook] Reconciliation incomplete after retry; attempting targeted merge using full tree');
      try {
        const response = await apiRef.current.get(`/api/treebranchleaf/trees/${tree_id}/nodes`);
        let allNodes: TreeBranchLeafNode[] = [];
        if (Array.isArray(response)) allNodes = response as TreeBranchLeafNode[];
        else if (response && typeof response === 'object') allNodes = (response.data || response.nodes || []) as TreeBranchLeafNode[];
        if (allNodes.length > 0) {
          // Merge nodes whose metadata.copiedFromNodeId OR metadata.sourceTemplateId match duplicated sources or ids
          const duplicateIds = new Set(duplicated.map(d => d.id));
          const duplicateSourceTemplateIds = new Set(duplicated.map(d => d.sourceTemplateId).filter(Boolean));
          const sourceParentIds: string[] = [];
          if (duplicateSourceTemplateIds.size > 0) {
            await Promise.all(Array.from(duplicateSourceTemplateIds).map(async (stid) => {
              try {
                const sr = await apiRef.current.get(`/api/treebranchleaf/nodes/${stid}/full`);
                const sarr: TreeBranchLeafNode[] = Array.isArray(sr) ? sr as TreeBranchLeafNode[] : (sr && typeof sr === 'object' ? (sr.data || sr.nodes || (sr.node ? [sr.node] : [])) : []);
                if (sarr.length > 0) {
                  const p = sarr[0].parentId;
                  if (p) sourceParentIds.push(p as string);
                }
              } catch (err) {
                ddiag('[TBL Hook] failed to resolve sourceTemplateId parent during reconciliation', stid, err);
              }
            }));
          }
          const sourceParentSet = new Set(sourceParentIds);
          const candidates = allNodes.filter(n => {
            const meta: any = n.metadata || {};
            const parentMatchesSource = !!(n.parentId && sourceParentSet.has(n.parentId));
            return (meta.copiedFromNodeId && duplicateIds.has(meta.copiedFromNodeId)) ||
                   (meta.copiedFromNodeId && duplicateSourceTemplateIds.has(meta.copiedFromNodeId)) ||
                   (meta.sourceTemplateId && duplicateSourceTemplateIds.has(meta.sourceTemplateId)) ||
                   (meta.fromVariableId && parentMatchesSource) ||
                   (meta.autoCreated && parentMatchesSource);
          });
          if (candidates.length > 0) {
            setRawNodes(prev => {
              const known = new Set(prev.map(n => n.id));
              const newOnes = candidates.filter(n => !known.has(n.id));
              if (newOnes.length === 0) return prev;
              return [...prev, ...newOnes];
            });
            console.log('[TBL Hook] merged nodes from full tree query:', candidates.length);
            // trigger retransform and re-evaluate missing
            setFormDataVersion(v => v + 1);
            await new Promise(r => setTimeout(r, 120));
            missing = getMissing();
          } else {
            console.warn('[TBL Hook] No candidate nodes found in full tree query. Falling back to full fetch (fetchData)');
            fetchData();
          }
        } else {
          console.warn('[TBL Hook] Full tree query returned no nodes, falling back to fetchData()');
          fetchData();
        }
      } catch (err) {
        console.error('[TBL Hook] Failed full tree reconcile query:', err);
        fetchData();
      }
    }
  }, [apiRef, fetchData, tree_id]);


  useEffect(() => {
    if (disabled) {
      setLoading(false);
      return;
    }
    fetchData();
  }, [fetchData, disabled]);

  // 🔄 FONCTION: Retransformer les données avec le formData actuel (SANS recharger depuis l'API)
  const retransformWithCurrentFormData = useCallback(async () => {
    const currentRawNodes = rawNodesRef.current;
    
    if (!currentRawNodes || currentRawNodes.length === 0) {
      console.warn('⚠️ [TBL Hook] Pas de données brutes disponibles pour retransformation');
      return;
    }

    try {
      console.log('🔄 [TBL Hook] Retransformation avec formData actuel...', 'rawNodes:', currentRawNodes.length);
      
      // ✅ Récupérer formData depuis le global store TBL
      const formData = (typeof window !== 'undefined' && window.TBL_FORM_DATA) || {};
      const transformedData = transformNodesToTBLComplete(currentRawNodes, formData);
      
      // 🎯 PHASE 2: Résolution asynchrone des valeurs pour les champs qui en ont besoin
      const resolvedFieldsByTab: Record<string, TBLField[]> = {};
      
      for (const [tabId, fields] of Object.entries(transformedData.fieldsByTab)) {
        const resolvedFields = await Promise.all(
          fields.map(async (field) => {
            if (field.needsValueResolution) {
              try {
                const originalNode = currentRawNodes.find(node => node.id === field.id);
                if (originalNode) {
                  const { value: resolvedValue, variableConfig } = await resolveFieldValue(originalNode, api, tree_id);

                  let nextCapabilities = field.capabilities;
                  const variableId = originalNode.id;
                  if (variableConfig) {
                    nextCapabilities = {
                      ...(field.capabilities || {}),
                      data: {
                        enabled: true,
                        activeId: variableId,
                        instances: {
                          ...(field.capabilities?.data?.instances || {}),
                          [variableId]: { metadata: { ...(variableConfig as Record<string, unknown>) } }
                        }
                      }
                    } as TBLField['capabilities'];
                  }

                  if (resolvedValue !== null) {
                    return { ...field, value: resolvedValue, capabilities: nextCapabilities };
                  }

                  if (variableConfig) {
                    return { ...field, capabilities: nextCapabilities };
                  }
                }
              } catch (valueError) {
                console.error(`❌ [TBL-PRISMA] Erreur résolution valeur pour "${field.label}":`, valueError);
              }
            }
            return field;
          })
        );
        
        resolvedFieldsByTab[tabId] = resolvedFields;
      }
      
      // 🎯 MISE À JOUR des sections avec les champs résolus
      const resolvedSectionsByTab: Record<string, TBLSection[]> = {};
      
      for (const [tabId, sections] of Object.entries(transformedData.sectionsByTab)) {
        const resolvedSections = sections.map(section => ({
          ...section,
          fields: resolvedFieldsByTab[tabId]?.filter(field => 
            section.fields.some(sectionField => sectionField.id === field.id)
          ) || section.fields
        }));
        
        resolvedSectionsByTab[tabId] = resolvedSections;
      }
      
      // 🎯 MISE À JOUR de l'arbre avec les onglets résolus
      const resolvedTabs = transformedData.tabs.map(tab => ({
        ...tab,
        allFields: resolvedFieldsByTab[tab.id] || tab.allFields,
        sections: resolvedSectionsByTab[tab.id] || tab.sections
      }));
      
      console.log('✅ [TBL Hook] Retransformation terminée, mise à jour du state...');
      
      setTree({ ...transformedData.tree, tabs: resolvedTabs });
      setTabs(resolvedTabs);
      setFieldsByTab(resolvedFieldsByTab);
      setSectionsByTab(resolvedSectionsByTab);
      console.log('✅ [TBL Hook] Retransformation terminée');
    } catch (err) {
      console.error('❌ [TBL Hook] Erreur lors de la retransformation:', err);
    }
  }, [api, tree_id]);

  // 🔄 NOUVEAU: Écouter les changements de formData pour réinjecter les références partagées
  // ⚠️ ATTENTION: NE PAS recharger fetchData() qui réinitialise tout le formulaire !
  // → On retransforme les données déjà chargées avec le nouveau formData
  // Debounce + guard refs
  const retransformDebounceRef = useRef<number | null>(null);
  const isRetransformingRef = useRef(false);

  useEffect(() => {
    console.log('🎯 [TBL Hook] Event listener monté/mis à jour. disabled:', disabled, 'tree_id:', tree_id, 'rawNodesRef.current.length:', rawNodesRef.current.length);
    
  const handleFormDataChange = () => {
      console.log('🔔 [TBL Hook] Event TBL_FORM_DATA_CHANGED reçu !');
      
      if (disabled) {
        console.log('⚠️ [TBL Hook] Hook désactivé, ignoré');
        return;
      }
      
      if (!tree_id) {
        console.log('⚠️ [TBL Hook] Pas de tree_id, ignoré');
        return;
      }
      
      if (rawNodesRef.current.length === 0) {
        console.log('⚠️ [TBL Hook] rawNodes vide, ignoré');
        return;
      }
      
      // Débouncer les appels pour ne pas lancer une retransformation sur chaque caractère
      if (retransformDebounceRef.current) {
        window.clearTimeout(retransformDebounceRef.current);
      }
      retransformDebounceRef.current = window.setTimeout(() => {
        if (isRetransformingRef.current) return; // éviter la concurrence
        try {
          isRetransformingRef.current = true;
          retransformWithCurrentFormData();
        } finally {
          isRetransformingRef.current = false;
        }
      }, 250);
    };

    console.log('✅ [TBL Hook] Event listener TBL_FORM_DATA_CHANGED attaché');
    window.addEventListener('TBL_FORM_DATA_CHANGED', handleFormDataChange);
    
    return () => {
      console.log('🧹 [TBL Hook] Event listener TBL_FORM_DATA_CHANGED détaché');
      window.removeEventListener('TBL_FORM_DATA_CHANGED', handleFormDataChange);
      if (retransformDebounceRef.current) {
        window.clearTimeout(retransformDebounceRef.current);
        retransformDebounceRef.current = null;
      }
    };
  }, [disabled, tree_id, retransformWithCurrentFormData]);

  // 🔄 Écouter les changements de capacité pour recharger les données
  useEffect(() => {
    const handleCapabilityUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ nodeId: string; treeId: string | number | undefined }>;
      const { treeId: eventTreeId } = customEvent.detail;
      
      // Recharger uniquement si c'est notre arbre
  if (!disabled && eventTreeId && String(eventTreeId) === String(tree_id)) {
        console.log('🔄 [TBL Hook OLD] Capacité mise à jour détectée, rechargement des données... (debounced)', customEvent.detail);
        if (capabilityDebounceRef.current) window.clearTimeout(capabilityDebounceRef.current);
        capabilityDebounceRef.current = window.setTimeout(() => {
          fetchData();
        }, 300);
      }
    };

    window.addEventListener('tbl-capability-updated', handleCapabilityUpdate);
    return () => {
      if (capabilityDebounceRef.current) window.clearTimeout(capabilityDebounceRef.current);
      window.removeEventListener('tbl-capability-updated', handleCapabilityUpdate);
    };
  }, [fetchData, disabled, tree_id, retransformWithCurrentFormData, reconcileDuplicatedNodes]);

  // 🔄 Écouter les changements de paramètres repeater pour recharger les données
  useEffect(() => {
    console.warn('🎧 [TBL Hook] Listener tbl-repeater-updated INSTALLÉ', { tree_id, disabled });
    
  const handleRepeaterUpdate = (event: Event) => {
      console.warn('🎉🎉🎉 [TBL Hook] EVENT REÇU - tbl-repeater-updated', {
        event,
        detail: (event as CustomEvent).detail,
        tree_id,
        disabled
      });
      
  const customEvent = event as CustomEvent<{ nodeId: string; treeId: string | number | undefined; source?: string; timestamp?: number; suppressReload?: boolean; duplicated?: any[] }>;
      const { treeId: eventTreeId, nodeId, source, timestamp } = customEvent.detail;
      
      console.warn('🔍 [TBL Hook] Vérification treeId', {
        eventTreeId,
        localTreeId: tree_id,
        match: String(eventTreeId) === String(tree_id),
        disabled,
        nodeId,
        source,
        timestamp: timestamp ? new Date(timestamp).toISOString() : 'N/A'
      });
      
      // Recharger uniquement si c'est notre arbre
      if (!disabled && eventTreeId && String(eventTreeId) === String(tree_id)) {
        // Si le dispatcheur a demandé de ne PAS recharger (suppressReload), on ne déclenche
        // pas fetchData() afin d'éviter le rechargement complet du formulaire (UX).
        if (customEvent.detail?.suppressReload) {
          console.log('🔇 [TBL Hook] Repeater update (suppressReload=true) — pas de fetchData, retransform possible', customEvent.detail);
          // Optionnel: retransform localement si nécessaire
          if (rawNodesRef.current.length && !disabled) {
            // Si des nouveaux duplicates sont fournis, fusionner les nœuds côté client
            const detail = customEvent.detail as any;
            const duplicated: Array<{ id: string; label?: string; type?: string; parentId?: string }> = detail?.duplicated || [];
            const deletedIds: string[] = detail?.deletedIds || [];

          (async () => {
              try {
                // 1) Merge duplicated nodes (fetch full subtrees and append)
                if (Array.isArray(duplicated) && duplicated.length > 0) {
                  const toFetch = Array.from(new Set(duplicated.map(d => d.id))).filter(Boolean) as string[];
                  const fetchedNodesList: TreeBranchLeafNode[] = [];
                  await Promise.all(toFetch.map(async (id) => {
                      try {
                        // Retry few times if the backend hasn't materialized the subtree yet
                        let attempts = 0;
                        let res: any = null;
                        while (attempts < 3) {
                          try {
                            res = await apiRef.current.get(`/api/treebranchleaf/nodes/${id}/full`);
                            break; // success
                          } catch {
                            attempts += 1;
                            await new Promise(r => setTimeout(r, 120));
                          }
                        }
                        if (!res) {
                          throw new Error('no response from /nodes/:id/full');
                        }
                        if (Array.isArray(res)) fetchedNodesList.push(...res as TreeBranchLeafNode[]);
                        else if (res && typeof res === 'object') {
                          const asAny = res as any;
                          if (Array.isArray(asAny.data)) fetchedNodesList.push(...asAny.data);
                          else if (Array.isArray(asAny.nodes)) fetchedNodesList.push(...asAny.nodes);
                          else if (asAny.node && typeof asAny.node === 'object') fetchedNodesList.push(asAny.node);
                        }
                      } catch (e) {
                        console.warn('[TBL Hook] fetch duplicated node failed', id, e);
                      }
                    }));

                  if (fetchedNodesList.length > 0) {
                    setRawNodes(prev => {
                      const byId = new Set(prev.map(n => n.id));
                      const newOnes = fetchedNodesList.filter(n => !byId.has(n.id));
                      if (newOnes.length === 0) return prev;
                      return [...prev, ...newOnes];
                    });
                    console.log('[TBL Hook] merged duplicated subtree nodes:', fetchedNodesList.length);
                    // ALSO: fetch parent subtrees to capture ANY display nodes created under the parent
                    let parentIds = Array.from(new Set((duplicated as Array<any>).map(d => d.parentId).filter(Boolean)));
                    // Also collect parent ids of the source templates (duplicated.sourceTemplateId)
                    // because display nodes may be created under the original template's parent
                    const sourceParentIds: string[] = [];
                    const sourceTemplateIds = Array.from(new Set((duplicated as Array<any>).map(d => d.sourceTemplateId).filter(Boolean))) as string[];
                    if (sourceTemplateIds.length > 0) {
                      await Promise.all(sourceTemplateIds.map(async stid => {
                        try {
                          const sres = await apiRef.current.get(`/api/treebranchleaf/nodes/${stid}/full`);
                          const sarr: TreeBranchLeafNode[] = Array.isArray(sres) ? sres as TreeBranchLeafNode[] : (sres && typeof sres === 'object' ? (sres.data || sres.nodes || (sres.node ? [sres.node] : [])) : []);
                          if (sarr && sarr.length > 0) {
                            if (sarr[0].parentId) sourceParentIds.push(sarr[0].parentId as string);
                          }
                        } catch (e) {
                          ddiag('[TBL Hook] failed to fetch sourceTemplateId full node', stid, e);
                        }
                      }));
                      if (sourceParentIds.length > 0) parentIds = [...new Set(parentIds.concat(sourceParentIds))];
                    }
                    if (parentIds.length > 0) {
                      const fetchedParentNodes: TreeBranchLeafNode[] = [];
                      await Promise.all(parentIds.map(async pid => {
                        try {
                          const pr = await apiRef.current.get(`/api/treebranchleaf/nodes/${pid}/full`);
                          if (Array.isArray(pr)) fetchedParentNodes.push(...pr as TreeBranchLeafNode[]);
                          else if (pr && typeof pr === 'object') {
                            const asAny = pr as any;
                            if (Array.isArray(asAny.data)) fetchedParentNodes.push(...asAny.data);
                            else if (Array.isArray(asAny.nodes)) fetchedParentNodes.push(...asAny.nodes);
                            else if (asAny.node && typeof asAny.node === 'object') fetchedParentNodes.push(asAny.node);
                          }
                        } catch {
                          console.warn('[TBL Hook] fetch parent subtree failed', pid);
                        }
                      }));
                      if (fetchedParentNodes.length > 0) {
                        setRawNodes(prev => {
                          const byId = new Set(prev.map(n => n.id));
                          const newOnes = fetchedParentNodes.filter(n => !byId.has(n.id));
                          if (newOnes.length === 0) return prev;
                          return [...prev, ...newOnes];
                        });
                        console.log('[TBL Hook] merged parent subtree nodes:', fetchedParentNodes.length);
                      }
                    }
                  }
                  else if (Array.isArray(duplicated) && duplicated.length > 0) {
                    console.warn('[TBL Hook] Expected duplicates but fetched 0 nodes -> falling back to full fetch (respecting suppressReload)');
                    if (customEvent.detail?.forceRefresh) {
                      fetchData();
                    } else {
                      ddiag('[TBL Hook] suppressReload=true — skipping fallback fetch for expected duplicates (no reload)');
                    }
                    return;
                  }
                }

                // 2) Remove deletedIds from local rawNodes (and descendants)
                if (Array.isArray(deletedIds) && deletedIds.length > 0) {
                  // 1. Build base removed set (including descendants in rawNodes)
                  setRawNodes(prev => {
                    const removed = new Set(deletedIds);
                    // Build closure of descendants within local rawNodes
                    let added = true;
                    while (added) {
                      added = false;
                      for (const n of prev) {
                        if (n.parentId && removed.has(n.parentId) && !removed.has(n.id)) {
                          removed.add(n.id);
                          added = true;
                        }
                      }
                    }
                    if (removed.size === 0) return prev;
                    return prev.filter(n => !removed.has(n.id));
                  });

                  // 2. Attempt to find additional nodes to delete (display nodes created elsewhere)
                  (async () => {
                    try {
                      if (!tree_id) return;
                      // Attempt a local scan first (rawNodesRef.current) to find display nodes referencing
                      // removed nodes and remove them localy without a network roundtrip.
                      let allNodes: TreeBranchLeafNode[] = Array.isArray(rawNodesRef.current) ? rawNodesRef.current as TreeBranchLeafNode[] : [];
                      // If local cache is empty, optionally fetch full tree only if forceRefresh is allowed.
                      if (!allNodes.length && (customEvent.detail?.forceRefresh)) {
                        const resp = await apiRef.current.get(`/api/treebranchleaf/trees/${tree_id}/nodes`);
                        if (Array.isArray(resp)) allNodes = resp as TreeBranchLeafNode[];
                        else if (resp && typeof resp === 'object') allNodes = (resp.data || resp.nodes || []) as TreeBranchLeafNode[];
                      }
                      if (!allNodes.length) return;
                      const baseRemoved = new Set(deletedIds);
                      // Derive related template ids from deleted nodes to find nodes that refer to templates
                      const nodeById = new Map(allNodes.map(n => [n.id, n] as const));
                      const relatedTemplateIds = new Set<string>();
                      for (const rid of deletedIds) {
                        const deletedNode = nodeById.get(rid as string);
                        if (!deletedNode) continue;
                        const dm: any = deletedNode.metadata || {};
                        if (dm?.sourceTemplateId) relatedTemplateIds.add(String(dm.sourceTemplateId));
                        if (dm?.copiedFromNodeId) relatedTemplateIds.add(String(dm.copiedFromNodeId));
                      }
                      const extraToRemove = new Set<string>();
                      for (const node of allNodes) {
                        const meta: any = node.metadata || {};
                        if (meta.copiedFromNodeId && baseRemoved.has(String(meta.copiedFromNodeId))) extraToRemove.add(node.id);
                        if (meta.copiedFromNodeId && relatedTemplateIds.has(String(meta.copiedFromNodeId))) extraToRemove.add(node.id);
                        if (meta.sourceTemplateId && (baseRemoved.has(String(meta.sourceTemplateId)) || relatedTemplateIds.has(String(meta.sourceTemplateId)))) extraToRemove.add(node.id);
                        if (meta.fromVariableId) {
                          // Heuristic: if fromVariableId contains any removed id or related template id string, mark for removal
                          for (const rid of baseRemoved) {
                            if (String(meta.fromVariableId).includes(String(rid))) extraToRemove.add(node.id);
                          }
                          for (const tid of relatedTemplateIds) {
                            if (String(meta.fromVariableId).includes(String(tid))) extraToRemove.add(node.id);
                          }
                        }
                        // Heuristic: if deleted ids include a suffix -N, remove nodes whose fromVariableId endsWith that suffix
                        for (const rid of baseRemoved) {
                          const m = String(rid).match(/-(\d+)$/);
                          if (m) {
                            const suffix = `-${m[1]}`;
                            if (String(meta.fromVariableId).endsWith(suffix)) extraToRemove.add(node.id);
                          }
                        }
                      }
                      if (extraToRemove.size > 0) {
                        setRawNodes(prev => prev.filter(n => !extraToRemove.has(n.id)));
                        console.log('[TBL Hook] merged additional deletion candidates from full tree:', extraToRemove.size);
                        setFormDataVersion(v => v + 1);
                      }
                      else {
                        // If we didn't find matching display nodes to delete, we do NOT trigger a full
                        // fetch because the caller asked for suppressReload=true. A full fetch would
                        // force a complete remount and create a UX flicker. If the caller explicitly
                        // requests a refresh, it may pass forceRefresh=true in the event detail.
                        if (customEvent.detail?.forceRefresh) {
                          setTimeout(() => fetchData(), 800);
                        } else {
                          ddiag('[TBL Hook] suppressReload=true — skipping fallback full fetch (no reload)');
                        }
                      }
                    } catch (e) {
                      ddiag('[TBL Hook] failed to enrich deletions via full tree query', e);
                    }
                  })();
              }

                // 3) Finally, retransform once after changes
                if (retransformDebounceRef.current) window.clearTimeout(retransformDebounceRef.current);
                retransformDebounceRef.current = window.setTimeout(() => {
                  retransformWithCurrentFormData();
                }, 100);
                (async () => {
                  try {
                    if (duplicated && duplicated.length > 0) await reconcileDuplicatedNodes(duplicated);
                  } catch { /* ignore */ }
                })();
              } catch (e) {
                console.error('[TBL Hook] Erreur lors du merge/suppression de duplicates localement', e);
              }
            })();
          }
        } else {
          console.warn('✅✅✅ [TBL Hook] RECHARGEMENT DES DONNÉES !', customEvent.detail);
          fetchData();
        }
      } else {
        console.warn('❌ [TBL Hook] Rechargement ignoré', { 
          reason: disabled ? 'disabled=true' : !eventTreeId ? 'no treeId' : 'treeId mismatch',
          eventTreeId,
          localTreeId: tree_id
        });
      }
    };

    window.addEventListener('tbl-repeater-updated', handleRepeaterUpdate);
    return () => {
      console.warn('🔴 [TBL Hook] Listener tbl-repeater-updated DÉSINSTALLÉ', { tree_id });
      window.removeEventListener('tbl-repeater-updated', handleRepeaterUpdate);
    };
  }, [fetchData, disabled, tree_id, retransformWithCurrentFormData, reconcileDuplicatedNodes]);

  // 🔄 Wrapper pour logger les appels à refetch
  const refetch = useCallback(() => {
    console.log('🔄 [useTBLDataPrismaComplete] refetch() appelé !');
    return fetchData();
  }, [fetchData]);

  return {
    tree,
    tabs,
    fieldsByTab,
    sectionsByTab,
    loading,
    error,
    refetch,
    rawNodes // 🔥 NOUVEAU: Exposer rawNodes pour Cascader (contient leaf_option)
  };
};
