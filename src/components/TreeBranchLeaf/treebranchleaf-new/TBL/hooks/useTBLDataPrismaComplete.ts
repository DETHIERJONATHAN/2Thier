import { useState, useEffect, useCallback, useRef } from 'react';
import { dlog } from '../../../../../utils/debug';
import { buildMirrorKeys } from '../utils/mirrorNormalization';
import { normalizeSubTabValues } from '../../utils/subTabNormalization';

// 🔇 Contrôle de verbosité (activer via console: window.__TBL_VERBOSE__ = true)
declare global { interface Window { __TBL_VERBOSE__?: boolean } }
const verbose = () => (typeof window !== 'undefined' && window.__TBL_VERBOSE__ === true);
const diagEnabled = () => {
  try { return localStorage.getItem('TBL_DIAG') === '1'; } catch { return false; }
};
const ddiag = (...args: unknown[]) => { if (diagEnabled()) if (verbose()) console.log('[TBL_DIAG]', ...args as any); };
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';

// 🎯 FONCTION: Création automatique des mirrors pour tous les champs TreeBranchLeaf
export const createAutomaticMirrors = (tabs: TBLTab[], nodes: TreeBranchLeafNode[]): void => {
  try {
    if (typeof window === 'undefined' || !window.TBL_FORM_DATA) {
      if (verbose()) console.log('🎯 [MIRROR] Initialisation TBL_FORM_DATA...');
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
              
              if (verbose()) console.log('🎯 [MIRROR][AUTO_CREATE]', { 
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
                    if (verbose()) console.log('🎯 [MIRROR][AUTO_CREATE_VARIANT]', { 
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
            if (verbose()) console.log('🧮 [MIRROR][FORMULA_CREATE]', {
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
            if (verbose()) console.log('🧮 [MIRROR][FORMULA_LABEL_CREATE]', {
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
                    if (verbose()) console.log('🧮 [MIRROR][FORMULA_VARIANT]', {
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
            if (verbose()) console.log('🔀 [MIRROR][CONDITION_CREATE]', {
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
            if (verbose()) console.log('🔀 [MIRROR][CONDITION_LABEL_CREATE]', {
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
                    if (verbose()) console.log('🔀 [MIRROR][CONDITION_VARIANT]', {
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

// 🚀 Cache global pour données batch (partagé par tous les appels resolveFieldValue)
let batchNodeDataCache: Record<string, unknown> | null = null;
let batchNodeDataTreeId: string | null = null;

// Fonction pour initialiser/mettre à jour le cache batch depuis le contexte
export const setBatchNodeDataCache = (treeId: string, dataByNode: Record<string, unknown>) => {
  batchNodeDataCache = dataByNode;
  batchNodeDataTreeId = treeId;
  console.log(`🚀 [BATCH_CACHE] Cache node-data mis à jour: ${Object.keys(dataByNode).length} nodes pour tree ${treeId}`);
};

// 🚀 FONCTION OPTIMISÉE: Vérifie si le cache batch est prêt pour ce tree
export const isBatchCacheReady = (treeId: string): boolean => {
  return batchNodeDataCache !== null && batchNodeDataTreeId === treeId;
};

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
    // ♻️ Cache local (TTL court)
    const cached = valueResolutionCache.get(node.id);
    if (cached && Date.now() - cached.timestamp < VALUE_CACHE_TTL_MS) {
      if (verbose()) dlog(`♻️ [RESOLVE_VALUE] Cache local hit pour "${node.label}"`);
      return cached.result;
    }

    // 🚀 BATCH FIRST: Essayer d'abord le cache batch (priorité absolue)
    let variableConfig: Record<string, unknown> | undefined;
    let usedBatch = false;
    
    // 🔄 Vérifier si le batch est prêt - NE PAS attendre car le batch charge en parallèle
    // Les composants se mettront à jour automatiquement quand le batch sera disponible
    if (batchNodeDataCache && batchNodeDataTreeId === treeId) {
      const batchData = batchNodeDataCache[node.id] as { variable?: Record<string, unknown> } | undefined;
      if (batchData?.variable) {
        variableConfig = batchData.variable;
        usedBatch = true;
        if (verbose()) dlog(`🚀 [RESOLVE_VALUE] BATCH HIT pour "${node.label}"`);
      } else if (batchData) {
        // Le node est dans le batch mais sans variable - utiliser la valeur par défaut
        usedBatch = true;
        if (verbose()) dlog(`🚀 [RESOLVE_VALUE] BATCH (sans variable) pour "${node.label}"`);
      }
    }

    // 🔄 SKIP API FALLBACK: Si le batch n'est pas prêt, retourner null
    // Les valeurs seront résolues quand le batch sera chargé (via le contexte)
    // Cela évite N appels API individuels qui sont remplacés par 1 seul batch
    if (!variableConfig && !usedBatch) {
      if (verbose()) dlog(`⏳ [RESOLVE_VALUE] Batch non prêt pour "${node.label}" - résolution différée (treeId: ${treeId}, cacheTreeId: ${batchNodeDataTreeId})`);
      // Retourner la valeur par défaut du node en attendant le batch
      const defaultValue = node.defaultValue || node.value || 
                          node.bool_defaultValue || node.text_defaultValue || 
                          node.number_defaultValue || node.select_defaultValue || 
                          node.date_defaultValue;
      return { value: defaultValue as string | number | boolean | null };
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
  appearanceConfig?: Record<string, unknown> | null;
  
  // Configuration layout des sections
  section_collapsible?: boolean;
  section_defaultCollapsed?: boolean;
  section_showChildrenCount?: boolean;
  section_columnsDesktop?: number;
  section_columnsMobile?: number;
  section_gutter?: number;
  
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
  
  // 🤖 AI MEASURE: Colonnes dédiées pour la mesure par IA (analyse d'images)
  aiMeasure_enabled?: boolean;
  aiMeasure_autoTrigger?: boolean;
  aiMeasure_prompt?: string | null;
  aiMeasure_keys?: Array<{
    id: string;
    key: string;
    label: string;
    type: string;
    targetRef?: string;
    targetLabel?: string;
  }> | null;
  
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
  // 🔗 LINK CAPABILITY: Colonnes directes pour afficher la valeur d'un autre champ
  hasLink?: boolean;
  link_targetNodeId?: string | null;
  link_targetTreeId?: string | null;
  link_mode?: string | null;
  link_carryContext?: boolean | null;
  
  markers_instances?: Record<string, unknown> | null;
  markers_activeId?: string | null;
  
  // 🔁 REPEATER: Colonnes Prisma dédiées
  repeater_templateNodeIds?: string | string[];
  repeater_templateNodeLabels?: string | Record<string, string>;
  repeater_minItems?: number;
  repeater_maxItems?: number;
  repeater_addButtonLabel?: string;
  repeater_buttonSize?: string;
  repeater_buttonWidth?: string;
  repeater_iconOnly?: boolean;
  // 🔄 PRÉ-CHARGEMENT INTELLIGENT: ID du champ source qui contrôle le nombre de copies
  repeater_countSourceNodeId?: string | null;
  
  // 🛒 PRODUIT: Colonnes dédiées pour la visibilité conditionnelle par produit
  hasProduct?: boolean;
  product_visibleFor?: string[] | null;
  product_sourceNodeId?: string | null;
  product_options?: Array<{ label: string; value: string }> | null;

  // Métadonnées
  metadata: Record<string, unknown>;
  subtab?: string | null;
  subtabs?: string | string[] | Record<string, unknown> | null;
  defaultValue?: string;
  calculatedValue?: string;
  // Permet l'accès à des propriétés additionnelles de l'API
  [key: string]: unknown;
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

  // 🔖 Optionnel: clé de sous-onglet (purement visuelle) - valeur issue de metadata.subTab
  subTabKey?: string | null;
  subTabKeys?: string[];
  
  // Propriétés pour la gestion des copies supprimables
  isDeletableCopy?: boolean;
  parentRepeaterId?: string;
  sourceTemplateId?: string;
  
  // Propriété pour le bouton d'ajout de nouveau versant
  canAddNewCopy?: boolean;
  isLastInCopyGroup?: boolean;
  
  // 🔄 PRÉ-CHARGEMENT INTELLIGENT: ID du champ source qui contrôle le nombre de copies
  repeater_countSourceNodeId?: string | null;
  // 🔁 REPEATER: colonnes Prisma directes pour le bouton "Ajouter"
  repeater_templateNodeIds?: string[] | string;
  
  // 🤖 AI MEASURE: Propriétés pour la mesure par IA sur champs IMAGE
  aiMeasure_enabled?: boolean;
  aiMeasure_autoTrigger?: boolean;
  aiMeasure_prompt?: string | null;
  aiMeasure_keys?: Array<{
    id: string;
    key: string;
    label: string;
    type: string;
    targetRef?: string;
    targetLabel?: string;
  }> | null;
  
  // 🔗 LINK CAPABILITY: Propriétés pour afficher la valeur d'un autre champ
  hasLink?: boolean;
  link_targetNodeId?: string | null;
  link_targetTreeId?: string | null;
  link_mode?: 'JUMP' | 'APPEND_SECTION' | 'PHOTO' | string | null;
  link_carryContext?: boolean | null;

  // 🛒 PRODUIT: Propriétés pour la visibilité conditionnelle par produit
  hasProduct?: boolean;
  product_visibleFor?: string[] | null;
  product_sourceNodeId?: string | null;
}

const tryParseJSON = (value: unknown): unknown => {
  if (typeof value !== 'string') return value ?? undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const firstChar = trimmed[0];
  const lastChar = trimmed[trimmed.length - 1];
  const looksJson = (firstChar === '{' && lastChar === '}') || (firstChar === '[' && lastChar === ']');
  if (!looksJson) return trimmed;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
};

const extractSubTabValue = (node?: TreeBranchLeafNode | null): unknown => {
  if (!node) return undefined;
  const metadata = typeof node.metadata === 'object' ? (node.metadata as Record<string, unknown>) : undefined;
  if (metadata) {
    if (metadata.subTab !== undefined) return metadata.subTab;
    if (metadata.subTabKey !== undefined) return metadata.subTabKey;
  }

  const columnSubTab = tryParseJSON(node.subtab ?? undefined);
  if (columnSubTab !== undefined) return columnSubTab;

  const columnSubTabs = tryParseJSON(node.subtabs ?? undefined);
  if (columnSubTabs !== undefined) return columnSubTabs;

  return undefined;
};

const buildSectionConfig = (node?: TreeBranchLeafNode | null): TBLSectionConfig | undefined => {
  if (!node) return undefined;
  const config: TBLSectionConfig = {
    columnsDesktop: node.section_columnsDesktop ?? undefined,
    columnsMobile: node.section_columnsMobile ?? undefined,
    gutter: node.section_gutter ?? undefined,
    collapsible: node.section_collapsible ?? undefined,
    defaultCollapsed: node.section_defaultCollapsed ?? undefined,
    showChildrenCount: node.section_showChildrenCount ?? undefined
  };
  const hasValue = Object.values(config).some(value => value !== undefined);
  return hasValue ? config : undefined;
};

const resolveSubTabAssignments = (
  originalNode: TreeBranchLeafNode,
  resolvedNode: TreeBranchLeafNode,
  nodeLookup: Map<string, TreeBranchLeafNode>
): string[] => {
  const direct = normalizeSubTabValues(extractSubTabValue(originalNode));
  if (direct.length > 0) return direct;

  // Shared references inherit the template metadata. Keep it as a fallback only so the
  // node-level subTab selection (where the reference is actually used) stays authoritative.
  const fromResolved = normalizeSubTabValues(extractSubTabValue(resolvedNode));
  if (fromResolved.length > 0) return fromResolved;

  const metadata = typeof originalNode.metadata === 'object' ? (originalNode.metadata as Record<string, unknown>) : undefined;
  const templateId = (metadata?.sourceTemplateId as string | undefined) || (metadata?.copiedFromNodeId as string | undefined);
  if (templateId) {
    const templateNode = nodeLookup.get(templateId);
    const fromTemplate = normalizeSubTabValues(extractSubTabValue(templateNode));
    if (fromTemplate.length > 0) return fromTemplate;
  }

  // 🔧 FIX: Remonter la chaîne des parents pour hériter le subtab
  // Si le nœud n'a pas de subtab, chercher dans ses parents (branche, section, etc.)
  let parentId = originalNode.parentId;
  const visited = new Set<string>();
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parentNode = nodeLookup.get(parentId);
    if (parentNode) {
      const fromParent = normalizeSubTabValues(extractSubTabValue(parentNode));
      if (fromParent.length > 0) {
        return fromParent;
      }
      parentId = parentNode.parentId;
    } else {
      break;
    }
  }

  return [];
};

const collectSharedReferenceIds = (node?: TreeBranchLeafNode | null): string[] => {
  if (!node) return [];
  const ids: string[] = [];
  const arrayValue = (node as unknown as { sharedReferenceIds?: unknown }).sharedReferenceIds;
  if (Array.isArray(arrayValue)) {
    arrayValue.forEach(value => {
      if (typeof value === 'string' && value.trim().length > 0) {
        ids.push(value.trim());
      }
    });
  }

  const singleValue = (node as unknown as { sharedReferenceId?: unknown }).sharedReferenceId;
  if (typeof singleValue === 'string' && singleValue.trim().length > 0) {
    ids.push(singleValue.trim());
  }

  return Array.from(new Set(ids));
};

const deriveCopySuffix = (
  childId: string,
  templateId?: string | null,
  metadata?: Record<string, unknown>
): string | null => {
  if (templateId && childId.startsWith(`${templateId}-`) && childId.length > templateId.length + 1) {
    return childId.slice(templateId.length + 1);
  }

  const metadataSuffix = metadata?.['copySuffix'];
  if (typeof metadataSuffix === 'number' || typeof metadataSuffix === 'string') {
    const suffix = String(metadataSuffix).trim();
    if (suffix.length > 0) {
      return suffix;
    }
  }

  const fallbackMatch = childId.match(/-(\d+(?:-\d+)*)$/);
  return fallbackMatch ? fallbackMatch[1] : null;
};

export interface TBLSectionConfig {
  columnsDesktop?: number;
  columnsMobile?: number;
  gutter?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  showChildrenCount?: boolean;
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
  metadata?: Record<string, unknown>;
  config?: TBLSectionConfig;
  subsections?: TBLSection[];
}

export interface TBLTab {
  id: string;
  name: string;
  label: string;
  order: number;
  sections: TBLSection[];
  allFields: TBLField[];  // 🎯 NOUVEAU: Tous les champs de cet onglet (pour statistiques)
  // Subtabs metadata (optionnelement défini dans metadata du noeud parent)
  subTabs?: { key: string; label: string }[];
  // 🛒 PRODUIT: Visibilité des sous-onglets par produit (depuis metadata du noeud GROUP)
  product_subTabsVisibility?: Record<string, string[] | null> | null;
  product_sourceNodeId?: string | null;
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
      const copySuffix = (node.metadata as Record<string, unknown> | null | undefined)?.copySuffix;
      const isCopyInstance = copySuffix !== undefined || /-\d+$/.test(node.id);
      const resolvedId = isCopyInstance ? node.id : sourceTemplate.id;
      // Merger les configurations (⚡ UTILISER L'ID DU TEMPLATE POUR PARTAGER LES DONNÉES)
      resolvedNode = {
        ...sourceTemplate,
        id: resolvedId,
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
  
  // 🔖 Sub-tab (purement visuelle) - tirée depuis metadata/colonnes + fallback template
  const subTabAssignments = resolveSubTabAssignments(node, resolvedNode, nodeLookup);
  const primarySubTabKey = subTabAssignments[0];

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
              // 🔧 FIX: Priorité à data_precision pour les champs d'affichage
              decimals: optionNode.data_precision ?? optionNode.number_decimals,
              prefix: optionNode.number_prefix,
              suffix: optionNode.number_suffix,
              unit: optionNode.number_unit ?? optionNode.data_unit,
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
          
          // 🔧 FIX DYNAMIQUE: Résoudre le subtab de l'option parente pour l'héritage aux enfants
          // Si l'option n'a pas de subtab, on remonte la chaîne (branch -> section)
          const optionSubTabsForChildren = resolveSubTabAssignments(optionNode, optionNode, nodeLookup);
          
          optionChildren
            .filter(child => child.type.includes('leaf_field'))
            .sort((a, b) => a.order - b.order)
            .forEach(childField => {
              if (verbose()) dlog(`    🍃 Enfant trouvé: "${childField.label}" (${childField.type})`);
              
              // 🔥 100% DYNAMIQUE PRISMA: Priorité subType > fieldType > type
              const finalChildFieldType = childField.subType || childField.fieldType || childField.type || 'text';
              
              // 🔧 FIX DYNAMIQUE: Résoudre le subtab de l'enfant, sinon hériter de l'option parente
              const childSubTabs = resolveSubTabAssignments(childField, childField, nodeLookup);
              const effectiveChildSubTabs = childSubTabs.length > 0 ? childSubTabs : optionSubTabsForChildren;
              
            dlog(`🔍 [TYPE DETECTION ENFANT] ${childField.label}`, { fieldType: childField.fieldType, subType: childField.subType, type: childField.type, final: finalChildFieldType, inheritedSubTabs: effectiveChildSubTabs });
              
              conditionalFields.push({
                id: childField.id,
                name: childField.label,
                label: childField.label,
                type: finalChildFieldType,
                required: childField.isRequired,
                visible: childField.isVisible,
                placeholder: childField.text_placeholder,
                description: childField.description,
                // 🔧 FIX DYNAMIQUE: Héritage du subtab - l'enfant hérite de l'option parente si pas de subtab propre
                subTabKey: effectiveChildSubTabs[0] ?? undefined,
                subTabKeys: effectiveChildSubTabs.length > 0 ? effectiveChildSubTabs : undefined,
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
                  // 🔧 FIX: Priorité à data_precision pour les champs d'affichage
                  decimals: childField.data_precision ?? childField.number_decimals,
                  prefix: childField.number_prefix,
                  suffix: childField.number_suffix,
                  unit: childField.number_unit ?? childField.data_unit,
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
          
          // 🔗 NOUVEAU: Traiter les SOUS-OPTIONS récursivement pour leurs shared refs
          // Ex: Triangle → Rampant, Plan, Inclinaison
          const subOptions = optionChildren.filter(child => child.type === 'leaf_option' || child.type === 'leaf_option_field');
          if (subOptions.length > 0 && verbose()) dlog(`  🔍 Sous-options de "${optionNode.label}": ${subOptions.length}`);
          
          subOptions.forEach(subOption => {
            const subOptionSharedRefIds = activeSharedReferences.get(subOption.id);
            if (subOptionSharedRefIds && subOptionSharedRefIds.length > 0) {
              if (verbose()) dlog(`    🔗 Sous-option "${subOption.label}" a ${subOptionSharedRefIds.length} références partagées`);
              
              // Récupérer le subtab de la sous-option ou remonter la chaîne
              const subOptionSubTabAssignments = resolveSubTabAssignments(subOption, subOption, nodeLookup);
              
              // console.log(`🔍 [SUB-OPTION SHARED REF] Sous-option "${subOption.label}" (${subOption.id}):`, {
              //   subOptionSubtab: subOption.subtab,
              //   subOptionParentId: subOption.parentId,
              //   resolvedSubTabs: subOptionSubTabAssignments
              // });
              
              subOptionSharedRefIds.forEach(refId => {
                const refNode = nodeLookup.get(refId);
                if (refNode) {
                  const finalRefFieldType = refNode.subType || refNode.fieldType || refNode.type || 'TEXT';
                  const refSubTabAssignments = resolveSubTabAssignments(refNode, refNode, nodeLookup);
                  const effectiveSubTabs = refSubTabAssignments.length > 0 ? refSubTabAssignments : subOptionSubTabAssignments;
                  
                  conditionalFields.push({
                    id: refNode.id,
                    name: refNode.label,
                    label: refNode.label,
                    type: finalRefFieldType,
                    required: refNode.isRequired,
                    visible: refNode.isVisible,
                    placeholder: refNode.text_placeholder,
                    description: refNode.description,
                    order: typeof refNode.order === 'number' ? refNode.order : 9999,
                    sharedReferenceName: refNode.label,
                    subTabKey: effectiveSubTabs[0] ?? undefined,
                    subTabKeys: effectiveSubTabs.length ? effectiveSubTabs : undefined,
                    // Marquer comme provenant d'une sous-option pour le debug
                    metadata: {
                      ...(typeof refNode.metadata === 'object' ? refNode.metadata : {}),
                      fromSubOption: subOption.label,
                      fromSubOptionId: subOption.id,
                    }
                  });
                  if (verbose()) dlog(`      ➕ Référence partagée depuis sous-option: "${refNode.label}" → subTab: ${effectiveSubTabs.join(', ') || 'aucun'}`);
                }
              });
            }
          });
        }
        
        // 🔗 NOUVEAU: Ajouter les RÉFÉRENCES PARTAGÉES comme champs conditionnels
        const sharedRefIds = activeSharedReferences.get(optionNode.id);
        if (sharedRefIds && sharedRefIds.length > 0) {
          if (verbose()) dlog(`  🔗 Toujours inclure les ${sharedRefIds.length} références partagées pour l'option "${optionNode.label}" pour un rendu dynamique.`);

          // 🔧 FIX: Récupérer le subtab de l'option parente pour les champs partagés
          // Les champs partagés ont subtab: null mais doivent hériter du contexte de l'option
          const optionSubTabAssignments = resolveSubTabAssignments(optionNode, optionNode, nodeLookup);
          
          // 🔍 DEBUG: Vérifier la résolution du subtab
          if (verbose()) console.log(`🔍 [SHARED REF DEBUG] Option "${optionNode.label}" (${optionNode.id}):`, {
            optionSubtab: optionNode.subtab,
            optionParentId: optionNode.parentId,
            parentInLookup: optionNode.parentId ? !!nodeLookup.get(optionNode.parentId) : false,
            parentSubtab: optionNode.parentId ? nodeLookup.get(optionNode.parentId)?.subtab : null,
            resolvedSubTabs: optionSubTabAssignments
          });
          
          if (verbose()) dlog(`  🔧 SubTab de l'option parente "${optionNode.label}": ${optionSubTabAssignments.join(', ') || 'aucun'}`);

          sharedRefIds.forEach(refId => {
            const refNode = nodeLookup.get(refId);
            if (refNode) {
              if (verbose()) dlog(`    ➕ Ajout référence partagée: "${refNode.label}"`);
              
              const finalRefFieldType = refNode.subType || refNode.fieldType || refNode.type || 'TEXT';
              
              // 🔧 FIX: Résoudre les subTabKeys - PRIORITÉ: option parente > champ partagé
              const refSubTabAssignments = resolveSubTabAssignments(refNode, refNode, nodeLookup);
              // Utiliser le subtab de l'option parente si le champ partagé n'en a pas
              const effectiveSubTabs = refSubTabAssignments.length > 0 ? refSubTabAssignments : optionSubTabAssignments;
              
              conditionalFields.push({
                id: refNode.id,
                name: refNode.label,
                label: refNode.label,
                type: finalRefFieldType,
                required: refNode.isRequired,
                visible: refNode.isVisible,
                placeholder: refNode.text_placeholder,
                description: refNode.description,
                order: typeof refNode.order === 'number' ? refNode.order : 9999, // Ordre élevé par défaut
                // 🎯 AJOUT CRITIQUE: Nom de la référence partagée pour l'affichage dans TBLSectionRenderer
                sharedReferenceName: refNode.label,
                // 🔧 FIX: Propager les sous-onglets - hérité de l'option parente si nécessaire
                subTabKey: effectiveSubTabs[0] ?? undefined,
                subTabKeys: effectiveSubTabs.length ? effectiveSubTabs : undefined,
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
                // 🔧 FIX: Priorité à data_precision pour les champs d'affichage
                decimals: refNode.data_precision ?? refNode.number_decimals,
                prefix: refNode.number_prefix,
                suffix: refNode.number_suffix,
                unit: refNode.number_unit ?? refNode.data_unit,
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
          // 🔥 FIX: Utiliser l'ID du nœud comme valeur si value est null/undefined
          // Cela permet aux conditions @select.xxx de fonctionner correctement
          // car elles comparent avec l'ID de l'option, pas son label
          value: optionNode.value || optionNode.id,
          // 🔧 FIX: Trier les champs conditionnels par order pour respecter l'ordre configuré
          conditionalFields: conditionalFields.length > 0 ? conditionalFields.sort((a, b) => ((typeof a.order === 'number' ? a.order : 9999) - (typeof b.order === 'number' ? b.order : 9999))) : undefined,
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
        ...((node.metadata as any)?.appearance || {}),
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
      capabilities,
      // 🔗 LINK CAPABILITY: Copier les propriétés directement sur le champ pour le rendu
      hasLink: node.hasLink,
      link_targetNodeId: node.link_targetNodeId,
      link_targetTreeId: node.link_targetTreeId,
      link_mode: node.link_mode,
      link_carryContext: node.link_carryContext,
      // 🛒 PRODUIT: Propriétés de visibilité conditionnelle
      hasProduct: node.hasProduct,
      product_visibleFor: node.product_visibleFor || null,
      product_sourceNodeId: node.product_sourceNodeId || null,
      subTabKey: primarySubTabKey ?? undefined,
      subTabKeys: subTabAssignments.length ? subTabAssignments : undefined
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
        ...((node.metadata as any)?.appearance || {}),
        // ✅ Ajouter les tooltips dans appearanceConfig
        helpTooltipType: node.text_helpTooltipType,
        helpTooltipText: node.text_helpTooltipText,
        helpTooltipImage: node.text_helpTooltipImage
      },
      // 🎯 METADATA RÉPÉTABLE
      metadata: {
        repeater: repeaterMetadata
      },
      capabilities,
      // � LINK CAPABILITY: Copier les propriétés directement sur le champ pour le rendu
      hasLink: node.hasLink,
      link_targetNodeId: node.link_targetNodeId,
      link_targetTreeId: node.link_targetTreeId,
      link_mode: node.link_mode,
      link_carryContext: node.link_carryContext,
      // �🔄 PRÉ-CHARGEMENT INTELLIGENT: Transmettre l'ID du champ source
      repeater_countSourceNodeId: node.repeater_countSourceNodeId || null,
      // 🔁 REPEATER: Colonnes Prisma directes pour "Ajouter"
      repeater_templateNodeIds: templateNodeIds,
      // 🛒 PRODUIT: Propriétés de visibilité conditionnelle
      hasProduct: node.hasProduct,
      product_visibleFor: node.product_visibleFor || null,
      product_sourceNodeId: node.product_sourceNodeId || null,
      subTabKey: primarySubTabKey ?? undefined,
      subTabKeys: subTabAssignments.length ? subTabAssignments : undefined
    };
    
  } else if (node.type.includes('leaf_field')) {
    // 🎯 C'EST UN CHAMP SIMPLE
    
    // 🔥 100% DYNAMIQUE PRISMA: Priorité subType > fieldType > type
    const finalFieldType = node.subType || node.fieldType || node.type || 'text';
    
  dlog(`🔍 [TYPE DETECTION SIMPLE] ${node.label}`, { fieldType: node.fieldType, subType: node.subType, type: node.type, final: finalFieldType });

    // 🛒 PRODUIT: Construire les options depuis select_options (champs source produit sans enfants leaf_option)
    const selectOptionsFromColumn = (() => {
      if (node.select_options && Array.isArray(node.select_options) && (node.select_options as unknown[]).length > 0) {
        return (node.select_options as Array<{ label: string; value: string }>).map(opt => ({
          id: opt.value || opt.label,
          label: opt.label,
          value: opt.value || opt.label,
        }));
      }
      return undefined;
    })();
    
    const isSelectWithOptions = !!selectOptionsFromColumn && selectOptionsFromColumn.length > 0;
    
    // 🛒 Si le champ a des select_options non vides, forcer le type à 'select' (ou 'multiselect') pour le rendu
    // select_multiple détermine le MODE (simple/multiple)
    const effectiveFieldType = isSelectWithOptions
      ? (node.select_multiple === true ? 'multiselect' : 'select')
      : finalFieldType;

    if (isSelectWithOptions) {
      dlog(`🛒 [PRODUCT SELECT] Champ "${node.label}": ${selectOptionsFromColumn!.length} options depuis select_options, multiple=${node.select_multiple}, type=${effectiveFieldType}`);
    }
    
    return {
      id: node.id,
      name: node.label,
      label: node.label,
      type: effectiveFieldType,
      displayIcon: (node as any)?.metadata?.appearance?.displayIcon || (node as any)?.appearanceConfig?.displayIcon,
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
        ...((node.metadata as any)?.appearance || {}),
        // ✅ Ajouter les tooltips dans appearanceConfig
        helpTooltipType: node.text_helpTooltipType,
        helpTooltipText: node.text_helpTooltipText,
        helpTooltipImage: node.text_helpTooltipImage
      },
      // 🛒 PRODUIT: Options depuis select_options pour les champs source produit
      ...(isSelectWithOptions ? { options: selectOptionsFromColumn, isSelect: true } : {}),
      config: {
        size: node.appearance_size,
        width: node.appearance_width,
        variant: node.appearance_variant,
        displayIcon: (node as any)?.metadata?.appearance?.displayIcon || (node as any)?.appearanceConfig?.displayIcon,
        minLength: node.text_minLength,
        maxLength: node.text_maxLength,
        rows: node.text_rows,
        mask: node.text_mask, // 🔥 AJOUT: masque
        regex: node.text_regex,
        textDefaultValue: node.text_defaultValue,
        min: node.number_min,
        max: node.number_max,
        step: node.number_step,
        // 🔧 FIX: Priorité à data_precision pour les champs d'affichage
        decimals: node.data_precision ?? node.number_decimals,
        prefix: node.number_prefix,
        suffix: node.number_suffix,
        unit: node.number_unit ?? node.data_unit,
        numberDefaultValue: node.number_defaultValue,
        format: node.date_format,
        showTime: node.date_showTime,
        dateDefaultValue: node.date_defaultValue,
        // 🔥 AJOUT PRISMA DYNAMIC MINDATE/MAXDATE
        minDate: node.date_minDate,
        maxDate: node.date_maxDate,
        // 🛒 PRODUIT + SELECT: Respecter select_multiple (true=multiselect, false/null=select simple)
        multiple: isSelectWithOptions ? (node.select_multiple === true) : node.select_multiple,
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
      capabilities,
      // 🔗 LINK CAPABILITY: Copier les propriétés directement sur le champ pour le rendu
      hasLink: node.hasLink,
      link_targetNodeId: node.link_targetNodeId,
      link_targetTreeId: node.link_targetTreeId,
      link_mode: node.link_mode,
      link_carryContext: node.link_carryContext,
      // 🤖 AI MEASURE: Transmettre la configuration IA Mesure pour les champs IMAGE
      aiMeasure_enabled: node.aiMeasure_enabled,
      aiMeasure_autoTrigger: node.aiMeasure_autoTrigger,
      aiMeasure_prompt: node.aiMeasure_prompt,
      aiMeasure_keys: node.aiMeasure_keys,
      // 🛒 PRODUIT: Propriétés de visibilité conditionnelle
      hasProduct: node.hasProduct,
      product_visibleFor: node.product_visibleFor || null,
      product_sourceNodeId: node.product_sourceNodeId || null,
      subTabKey: primarySubTabKey ?? undefined,
      subTabKeys: subTabAssignments.length ? subTabAssignments : undefined
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
    capabilities,
    // 🔗 LINK CAPABILITY: Copier les propriétés directement sur le champ pour le rendu
    hasLink: node.hasLink,
    link_targetNodeId: node.link_targetNodeId,
    link_targetTreeId: node.link_targetTreeId,
    link_mode: node.link_mode,
    link_carryContext: node.link_carryContext,
    // 🛒 PRODUIT: Propriétés de visibilité conditionnelle
    hasProduct: node.hasProduct,
    product_visibleFor: node.product_visibleFor || null,
    product_sourceNodeId: node.product_sourceNodeId || null,
    subTabKey: primarySubTabKey ?? undefined,
    subTabKeys: subTabAssignments.length ? subTabAssignments : undefined
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
  const effectiveParentMap = new Map<string, string | null>();
  const copiesBySourceId = new Map<string, TreeBranchLeafNode[]>();

  const getNodeMetadata = (node: TreeBranchLeafNode): Record<string, unknown> | undefined => {
    return typeof node.metadata === 'object' && node.metadata !== null
      ? (node.metadata as Record<string, unknown>)
      : undefined;
  };

  nodes.forEach(node => {
    nodeMap.set(node.id, node);

    const metadata = getNodeMetadata(node);
    const sourceTemplateId =
      (metadata?.['copiedFromNodeId'] as string | undefined)
      || (metadata?.['copied_from_node_id'] as string | undefined)
      || (metadata?.['sourceTemplateId'] as string | undefined);

    if (sourceTemplateId) {
      if (!copiesBySourceId.has(sourceTemplateId)) {
        copiesBySourceId.set(sourceTemplateId, []);
      }
      copiesBySourceId.get(sourceTemplateId)!.push(node);
    }
  });

  nodes.forEach(node => {
    const metadata = getNodeMetadata(node);
    let effectiveParentId = (node.parentId ?? null) as string | null;

    if (!effectiveParentId) {
      const duplicatedFromRepeater = metadata?.['duplicatedFromRepeater']
        || metadata?.['repeaterParentId']
        || metadata?.['repeaterNodeId']
        || metadata?.['repeaterParentNodeId'];
      if (typeof duplicatedFromRepeater === 'string' && duplicatedFromRepeater.trim().length > 0) {
        effectiveParentId = duplicatedFromRepeater.trim();
      } else if (typeof duplicatedFromRepeater === 'number') {
        effectiveParentId = String(duplicatedFromRepeater);
      }
    }

    if (!effectiveParentId) {
      const templateSourceId = (metadata?.['sourceTemplateId'] as string | undefined)
        || (metadata?.['copiedFromNodeId'] as string | undefined)
        || (metadata?.['copied_from_node_id'] as string | undefined);
      if (templateSourceId) {
        const templateNode = nodeMap.get(templateSourceId);
        const templateParent = templateNode?.parentId ?? effectiveParentMap.get(templateSourceId) ?? null;
        if (templateParent) {
          effectiveParentId = templateParent;
        }
      }
    }

    effectiveParentMap.set(node.id, effectiveParentId);
    const parentKey = effectiveParentId ?? 'root';
    if (!childrenMap.has(parentKey)) {
      childrenMap.set(parentKey, []);
    }
    childrenMap.get(parentKey)!.push(node);
  });

  if (verbose()) dlog(`📊 [INJECT ORPHANS] Building childrenMap: ${childrenMap.size} parent groups, ${nodes.length} total nodes`);

  const orphanedCopies: TreeBranchLeafNode[] = [];
  nodes.forEach(node => {
    const metadata = getNodeMetadata(node);
    if (node.parentId && effectiveParentMap.get(node.id) === null) {
      const sourceTemplateId =
        (metadata?.['copiedFromNodeId'] as string | undefined)
        || (metadata?.['copied_from_node_id'] as string | undefined)
        || (metadata?.['sourceTemplateId'] as string | undefined);

      if (sourceTemplateId) {
        const sourceNode = nodeMap.get(sourceTemplateId);
        if (sourceNode?.parentId) {
          effectiveParentMap.set(node.id, sourceNode.parentId);
          if (!childrenMap.has(sourceNode.parentId)) {
            childrenMap.set(sourceNode.parentId, []);
          }
          childrenMap.get(sourceNode.parentId)!.push(node);
          orphanedCopies.push(node);
          if (verbose()) dlog(`  ✅ [INJECT] "${node.label}" (${node.id}) → parent ${sourceNode.parentId}`);
        }
      }
    }
  });

  if (orphanedCopies.length > 0 && verbose()) {
    dlog(`🔗 [INJECT ORPHANS] Re-parented ${orphanedCopies.length} orphaned copies`);
  }

  if (verbose()) dlog(`🔗 [INHERIT SHARED REFS] Propagating sharedReferenceIds from templates to copies...`);
  const processedRefCopies = new Set<string>();
  nodes.forEach(node => {
    const metadata = getNodeMetadata(node);
    const templateId =
      (metadata?.['copiedFromNodeId'] as string | undefined)
      || (metadata?.['copied_from_node_id'] as string | undefined)
      || (metadata?.['sourceTemplateId'] as string | undefined);

    if (templateId && !processedRefCopies.has(node.id)) {
      const templateNode = nodeMap.get(templateId);
      const templateRefs = collectSharedReferenceIds(templateNode);

      if (templateRefs.length > 0) {
        const copySuffix = deriveCopySuffix(node.id, templateNode?.id, metadata);
        const resolvedRefs = copySuffix
          ? templateRefs.map(refId => {
              const candidate = `${refId}-${copySuffix}`;
              return nodeMap.has(candidate) ? candidate : refId;
            })
          : templateRefs;

        if (resolvedRefs.length > 0 && !Array.isArray((node as any).sharedReferenceIds)) {
          (node as any).sharedReferenceIds = resolvedRefs;
          processedRefCopies.add(node.id);
          if (verbose()) dlog(`  ✅ [INHERIT] "${node.label}" inherited ${resolvedRefs.length} shared refs from "${templateNode?.label}"`);
        }
      }
    }
  });

  if (processedRefCopies.size > 0 && verbose()) {
    dlog(`🔗 [INHERIT SHARED REFS] Inherited shared refs for ${processedRefCopies.size} copies`);
  }

  if (verbose()) dlog(`📋 [COPY CHILDREN] Propagating template children to option copies...`);
  const processedCopies = new Set<string>();
  nodes.forEach(node => {
    const metadata = getNodeMetadata(node);
    const templateId =
      (metadata?.['copiedFromNodeId'] as string | undefined)
      || (metadata?.['copied_from_node_id'] as string | undefined)
      || (metadata?.['sourceTemplateId'] as string | undefined);

    if (templateId && !processedCopies.has(node.id)) {
      const templateNode = nodeMap.get(templateId);
      const templateChildren = childrenMap.get(templateId) || [];

      if (templateChildren.length > 0) {
        const copySuffix = deriveCopySuffix(node.id, templateNode?.id, metadata);

        templateChildren.forEach(templateChild => {
          const childCopyId = copySuffix ? `${templateChild.id}-${copySuffix}` : `${templateChild.id}-copy`;
          const childCopyNode = nodeMap.get(childCopyId) || nodeMap.get(templateChild.id);

          if (childCopyNode && childCopyNode.id !== templateChild.id) {
            if (!childrenMap.has(node.id)) {
              childrenMap.set(node.id, []);
            }
            const existing = childrenMap.get(node.id)!.find(c => c.id === childCopyNode.id);
            if (!existing) {
              childrenMap.get(node.id)!.push(childCopyNode);
              if (verbose()) dlog(`  ✅ [CHILD COPY] "${childCopyNode.label}" → parent ${node.label}`);
            }
          }
        });

        processedCopies.add(node.id);
      }
    }
  });

  if (processedCopies.size > 0 && verbose()) {
    dlog(`📋 [COPY CHILDREN] Propagated children for ${processedCopies.size} option copies`);
  }
  
  // ✅ 1.5️⃣ NOUVELLE LOGIQUE : Stocker TOUTES les références partagées (single ET multiple)
  // On ne modifie PAS childrenMap, on stocke juste quelles options ont des refs actives
  const activeSharedReferences = new Map<string, string[]>(); // optionId -> [refNodeIds]

  nodes.forEach(node => {
    const isOption = node.type === 'leaf_option' || node.type === 'leaf_option_field';
    if (!isOption) return;

    const ownIds = collectSharedReferenceIds(node);
    let resolvedIds = ownIds;

    if (resolvedIds.length === 0) {
      const metadata = getNodeMetadata(node);
      const templateOptionId =
        (metadata?.['copiedFromNodeId'] as string | undefined)
        || (metadata?.['copied_from_node_id'] as string | undefined)
        || (metadata?.['sourceTemplateId'] as string | undefined);

      if (templateOptionId) {
        const templateNode = nodeMap.get(templateOptionId);
        const templateSharedRefs = collectSharedReferenceIds(templateNode);

        if (templateSharedRefs.length > 0) {
          const suffix = deriveCopySuffix(node.id, templateNode?.id, metadata);

          if (suffix) {
            const resolvedFromTemplate = templateSharedRefs.map(refId => {
              const candidateId = `${refId}-${suffix}`;
              if (nodeMap.has(candidateId)) {
                return candidateId;
              }

              const copyCandidates = copiesBySourceId.get(refId);
              if (copyCandidates && copyCandidates.length > 0) {
                const matchingCopy = copyCandidates.find(copyNode => deriveCopySuffix(copyNode.id, refId, getNodeMetadata(copyNode)) === suffix);
                if (matchingCopy) {
                  return matchingCopy.id;
                }
              }

              return refId;
            });

            resolvedIds = resolvedFromTemplate;
          } else {
            resolvedIds = templateSharedRefs;
          }
        }
      }
    }

    if (resolvedIds.length > 0) {
      const uniqueIds = Array.from(new Set(resolvedIds));
      activeSharedReferences.set(node.id, uniqueIds);
      // 🔍 DEBUG: Log quand une option a des shared refs
      // console.log(`🔗 [SHARED REFS STORED] Option "${node.label}" (${node.id}):`, {
      //   resolvedIds: uniqueIds,
      //   nodeSubtab: node.subtab,
      //   nodeParentId: node.parentId
      // });
      if (verbose()) {
        dlog(`🔗 [TBL-PRISMA] Option "${node.label}" stockée avec ${uniqueIds.length} références partagées (résolues)`);
      }
    }
  });
  
  // 2️⃣ Identifier les niveaux selon votre architecture EXACTE
  // ❌ FILTRER LES RÉFÉRENCES PARTAGÉES - Elles ne sont PAS des onglets !
  const allRootChildren = childrenMap.get('root') || [];
  const niveau1Nodes = allRootChildren.filter(node => !node.isSharedReference);
  const orphanedSharedRefs = allRootChildren.filter(node => node.isSharedReference);
  
  if (orphanedSharedRefs.length > 0 && niveau1Nodes.length > 0) {
    const firstTabId = niveau1Nodes[0].id;
    if (!childrenMap.has(firstTabId)) {
      childrenMap.set(firstTabId, []);
    }
    childrenMap.get(firstTabId)!.push(...orphanedSharedRefs);
    orphanedSharedRefs.forEach(ref => {
      effectiveParentMap.set(ref.id, firstTabId);
    });
    if (verbose()) dlog(`🔗 [INJECT SHARED REFS] ${orphanedSharedRefs.length} orphaned shared refs → first tab`);
  }
  
  if (verbose()) {
    const filteredCount = allRootChildren.length - niveau1Nodes.length;
    if (filteredCount > 0 && orphanedSharedRefs.length !== filteredCount) {
      dlog(`🚫 [TBL-PRISMA] Non-root references:`, 
        allRootChildren.filter(n => !n.isSharedReference && niveau1Nodes.indexOf(n) === -1).map(n => n.label));
    }
    dlog('🔍 [TBL-PRISMA] Onglets (Niveau 1):', niveau1Nodes.length, niveau1Nodes.map(n => `${n.label} (order: ${n.order})`));
  }
  
  // 3️⃣ Fonction récursive pour traiter TOUS les niveaux selon TreeBranchLeaf
  const processedNodeIds = new Set<string>(); // 🎯 ÉVITER LES DOUBLONS
  const detectedSections = new Map<string, { node: TreeBranchLeafNode, fields: TBLField[] }>(); // 🎯 SECTIONS DÉTECTÉES
  
  // 🎯 NOUVEAU: Compteur d'ordre hiérarchique global pour respecter l'ordre de l'arbre
  let globalHierarchyOrder = 0;
  
  // 🎯 Helper pour assigner l'ordre hiérarchique global à un champ
  const assignHierarchyOrder = (field: TBLField): TBLField => {
    field.order = globalHierarchyOrder++;
    return field;
  };
  
  // 🔍 PREMIÈRE PASSE PRÉALABLE: Construire la map templateId -> tabId d'origine AVANT le processing
  const templateToTabMap = new Map<string, string>();
  niveau1Nodes.forEach(ongletNode => {
    const ongletChildren = childrenMap.get(ongletNode.id) || [];
    const collectTemplateIds = (nodeId: string) => {
      const children = childrenMap.get(nodeId) || [];
      children.forEach(child => {
        if (child.type === 'leaf_field' || child.type === 'leaf_section' || child.type === 'leaf_group') {
          templateToTabMap.set(child.id, ongletNode.id);
          collectTemplateIds(child.id); // Récursif pour les enfants
        }
      });
    };
    ongletChildren.forEach(child => {
      templateToTabMap.set(child.id, ongletNode.id);
      collectTemplateIds(child.id);
    });
  });
  
  if (verbose()) if (verbose()) console.log('🗺️ [TAB MAPPING EARLY] Template → Tab mapping créée:', templateToTabMap.size, 'templates');
  
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
          
          // 🆕 CHERCHER LES COPIES DE CETTE SECTION DEPUIS D'AUTRES ONGLETS
          // (Les copies créées dans un répéteur d'un autre onglet mais qui doivent aller dans cette section)
          const _sectionFieldBaseIds = sectionFields.map(f => f.id);
          
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
            processedFields.push(assignHierarchyOrder(selectField));
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
          // ⚠️ EXCLURE LES RÉFÉRENCES PARTAGÉES - Elles sont rendues via les options qui les utilisent
          if (child.isSharedReference) {
            if (verbose()) dlog(`      🚫 Référence partagée ignorée (rendue via options): "${child.label}"`);
            processedNodeIds.add(child.id); // Marquer comme traité pour éviter les doublons
            return;
          }
          
          const field = transformPrismaNodeToField(child, childrenMap, nodeMap, activeSharedReferences, formData);
          processedFields.push(assignHierarchyOrder(field));
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
          
          // 🆕 NOUVELLE LOGIQUE: Distinguer templates vs copies réelles
          const allChildren = childrenMap.get(child.id) || [];
          const templateNodeIds = repeaterField.metadata?.repeater?.templateNodeIds || [];
          
          // 🔧 FIX MULTI-ONGLET: Étendre les subTabKeys du repeater pour inclure TOUS les onglets
          // de ses templates. Sans ça, le repeater n'apparaît que dans son onglet d'origine
          // (ex: Mesure) et les copies dans d'autres onglets (ex: Devis) n'ont pas de bouton supprimer
          // car TBL.tsx filtre le repeater hors de section.fields pour les autres onglets.
          {
            const repeaterSubTabs = new Set<string>((repeaterField as any).subTabKeys || []);
            if ((repeaterField as any).subTabKey) repeaterSubTabs.add((repeaterField as any).subTabKey);
            for (const tid of templateNodeIds) {
              const templateNode = nodeMap.get(tid);
              if (templateNode) {
                const tSubTabs = resolveSubTabAssignments(templateNode, templateNode, nodeMap);
                tSubTabs.forEach(t => repeaterSubTabs.add(t));
              }
            }
            if (repeaterSubTabs.size > 0) {
              const expandedSubTabs = Array.from(repeaterSubTabs);
              (repeaterField as any).subTabKey = expandedSubTabs[0];
              (repeaterField as any).subTabKeys = expandedSubTabs;
            }
          }
          
          processedFields.push(assignHierarchyOrder(repeaterField));
          processedNodeIds.add(child.id); // 🎯 MARQUER COMME TRAITÉ
          if (verbose()) dlog(`      🔁 Répétable: "${repeaterField.label}" avec metadata.repeater:`, repeaterField.metadata?.repeater, `subTabKeys:`, (repeaterField as any).subTabKeys);
          
          // Séparer templates des copies
          const templates = allChildren.filter(node => templateNodeIds.includes(node.id));
          // Real copies are any children that are NOT templates; as a fallback use metadata
          const realCopies = allChildren.filter(node => {
            const meta = node.metadata as any || {};
            const copiedFrom = meta?.sourceTemplateId || meta?.copiedFromNodeId || meta?.copied_from_node_id || undefined;
            if (copiedFrom && templateNodeIds.includes(copiedFrom)) return true;
            // If template ids exist, treat any child NOT present in template IDs as a copy
            if (templateNodeIds && Array.isArray(templateNodeIds) && templateNodeIds.length > 0) {
              return !templateNodeIds.includes(node.id);
            }
            // Fallback: if templates are not defined, consider anything with a sourceTemplateId as copy
            return !!copiedFrom;
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
            // ✅ INDEX INSTANCE (utilisé pour suppression ciblée)
            (copyField as any).repeaterInstanceIndex = index;
            copyField.metadata = {
              ...(copyField.metadata || {}),
              repeaterParentId: child.id,
              repeaterInstanceIndex: index
            } as any;
            
            // ➕ AJOUTER LE BOUTON + SUR LA DERNIÈRE COPIE
            copyField.isLastInCopyGroup = (index === realCopies.length - 1);
            copyField.canAddNewCopy = copyField.isLastInCopyGroup;
            
            processedFields.push(assignHierarchyOrder(copyField));
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
            
            processedFields.push(assignHierarchyOrder(originalTemplateField));
            processedNodeIds.add(originalTemplate.id);
            if (verbose()) dlog(`        📝 Template original avec bouton +: "${originalTemplateField.label}"`);
          }
          
        } else if (child.type === 'leaf_option' || child.type === 'leaf_option_field') {
          // ⚠️ OPTIONS DÉJÀ TRAITÉES DANS LA LISTE DÉROULANTE PARENTE
          if (verbose()) dlog(`      ⚠️ Option "${child.label}" déjà traitée dans liste déroulante`);
          processedNodeIds.add(child.id); // 🎯 MARQUER COMME TRAITÉ
          
          // 🔧 FIX DUPLICATION: Les enfants d'options sont des champs CONDITIONNELS uniquement !
          // Ils sont déjà inclus dans conditionalFields de l'option parente via transformPrismaNodeToField.
          // NE PAS les ajouter à processedFields pour éviter qu'ils apparaissent deux fois :
          //   1. Dans section.fields (erroné - c'était le bug)
          //   2. Comme champ conditionnel injecté quand l'option est sélectionnée (correct)
          // On marque simplement les enfants comme traités pour éviter tout traitement futur
          const linkedChildren = childrenMap.get(child.id) || [];
          if (linkedChildren.length > 0) {
            if (verbose()) dlog(`        🔗 ENFANTS CONDITIONNELS de l'option "${child.label}": ${linkedChildren.length} éléments (non ajoutés à processedFields)`);
            // Marquer tous les enfants comme traités sans les ajouter aux champs de section
            linkedChildren.forEach(linkedChild => {
              processedNodeIds.add(linkedChild.id);
              if (verbose()) dlog(`          🏷️ Marqué comme traité (conditionnel): "${linkedChild.label}"`);
            });
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
      
      // 🎯 RESET: Réinitialiser le compteur d'ordre hiérarchique pour chaque onglet
      globalHierarchyOrder = 0;
      
      // Traiter RÉCURSIVEMENT tous les descendants à partir du niveau 2
      const ongletFields = processNodeRecursively(ongletNode.id, 2);
      
      // Trier tous les champs par ordre global sans exclure les copies croisées
      const sortedFields = ongletFields.sort((a, b) => a.order - b.order);
      const sortedFieldsFiltered = sortedFields;
      
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
          // Garder les copies de répéteurs pour que les sections puissent les exposer.
          // Le rendu des repeaters dans TBLSectionRenderer s'appuie sur ces champs
          // (parentRepeaterId, sourceTemplateId) pour injecter les instances dynamiques.
          
          // 🎯 CRITICAL FIX: Trier les champs par leur order TBL pour respecter l'ordre dans l'arbre
          const sectionFieldsFiltered = [...sectionData.fields].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
          
          // 🔍🔍🔍 DIAGNOSTIC FORCE - Sections Devis/PV
          if (sectionData.node.label?.includes('Devis') || sectionData.node.label?.includes('PV')) {
            console.log(`🔍🔍🔍 [DIAGNOSTIC TRANSFORM SECTION "${sectionData.node.label}"] Field count:`, sectionFieldsFiltered.length);
            console.log(`🔍🔍🔍 [DIAGNOSTIC TRANSFORM SECTION "${sectionData.node.label}"] Field IDs:`, sectionFieldsFiltered.map(f => f.id));
            const panneauInSection = sectionFieldsFiltered.filter(f => 
              f.id === 'f117b34a-d74c-413a-b7c1-4b9290619012' || 
              f.id === 'fb35d781-5b1b-4a2b-869b-ea0b902a444e' ||
              f.id.startsWith('f117b34a-') || 
              f.id.startsWith('fb35d781-')
            );
            console.log(`🔍🔍🔍 [DIAGNOSTIC TRANSFORM SECTION "${sectionData.node.label}"] Panneau fields found:`, panneauInSection.length, panneauInSection.map(f => ({ id: f.id, label: f.label })));
          }
          
          ongletSections.push({
            id: `${sectionId}-section`,
            name: sectionData.node.label,
            title: sectionData.node.label,
            description: sectionData.node.description || undefined,
            fields: sectionFieldsFiltered,
            order: index,
            isDataSection: true // 🎯 TOUTES les sections TreeBranchLeaf sont des sections données
            ,
            metadata: typeof sectionData.node.metadata === 'object' ? sectionData.node.metadata as Record<string, unknown> : {}
            ,
            config: buildSectionConfig(sectionData.node)
          });
          
          // 🎯 Log pour vérifier la création des sections données
          dlog(`🎯 [TBL] Section TreeBranchLeaf créée: "${sectionData.node.label}" -> isDataSection: true (${sectionFieldsFiltered.length} champs)`);
        });
        
        // Ajouter une section pour les champs qui ne sont dans aucune section
        const fieldsInSections = sectionsForTab.flatMap(([, sectionData]) => sectionData.fields.map(f => f.id));
        const fieldsNotInSections = sortedFieldsFiltered.filter(f => !fieldsInSections.includes(f.id));
        const fieldsNotInSectionsFiltered = fieldsNotInSections;
        
        if (fieldsNotInSectionsFiltered.length > 0) {
          ongletSections.push({
            id: `${ongletNode.id}-section`,
            name: ongletNode.label,
            title: ongletNode.label,
            description: ongletNode.description || undefined,
            fields: fieldsNotInSectionsFiltered,
            order: sectionsForTab.length
            ,
            metadata: typeof ongletNode.metadata === 'object' ? ongletNode.metadata as Record<string, unknown> : {}
            ,
            config: buildSectionConfig(ongletNode)
          });
        }
      } else {
        // Pas de sections détectées, utiliser les champs déjà filtrés (sans copies cross-tab)
        
        // Pas de sections détectées, créer une section par défaut
        ongletSections.push({
          id: `${ongletNode.id}-section`,
          name: ongletNode.label,
          title: ongletNode.label,
          description: ongletNode.description || undefined,
          fields: sortedFieldsFiltered,
          order: 0
          ,
          metadata: typeof ongletNode.metadata === 'object' ? ongletNode.metadata as Record<string, unknown> : {}
          ,
          config: buildSectionConfig(ongletNode)
        });
      }
      
      // Construire l'onglet
      // 🔧 FIX: Utiliser UNIQUEMENT les sous-onglets définis dans TreeBranchLeaf (colonne subtabs)
      // et respecter leur ordre d'origine
      let definedSubTabs: string[] = [];
      
      // 1. Priorité: colonne subtabs du nœud onglet
      const columnSubTabs = tryParseJSON(ongletNode.subtabs ?? undefined);
      if (Array.isArray(columnSubTabs)) {
        definedSubTabs = columnSubTabs.map(s => String(s));
      } else if (typeof columnSubTabs === 'string' && columnSubTabs.trim()) {
        definedSubTabs = [columnSubTabs];
      }
      
      // 2. Fallback: metadata.subTabs si subtabs n'est pas défini
      if (definedSubTabs.length === 0) {
        try {
          const nodeTabs = (ongletNode.metadata && (ongletNode.metadata as any).subTabs) as string[] | undefined;
          if (Array.isArray(nodeTabs)) {
            definedSubTabs = nodeTabs.map(s => String(s));
          }
        } catch { /* ignore */ }
      }
      
      // 🎯 Construire les sous-onglets UNIQUEMENT depuis la liste définie, dans l'ordre
      const inferredSubTabs = definedSubTabs.map(label => ({ key: label, label }));

      // 🎯 DÉTERMINER le bon tab pour chaque champ AVANT de construire l'objet tab
      const fieldsForThisTab: TBLField[] = [];
      
      sortedFields.forEach(field => {
        // Assign all fields to their current tab without forcing them back to the template tab
        fieldsForThisTab.push(field);
        if (!fieldsByTab[ongletNode.id]) {
          fieldsByTab[ongletNode.id] = [];
        }
        fieldsByTab[ongletNode.id].push(field);
      });

      // 🛒 PRODUIT: Extraire product_subTabsVisibility depuis metadata du noeud onglet
      const ongletMeta = ongletNode.metadata as Record<string, unknown> | null | undefined;
      const productSubTabsVis = ongletMeta?.product_subTabsVisibility as Record<string, string[] | null> | null | undefined;
      const productSourceId = (ongletNode as any).product_sourceNodeId as string | null | undefined;

      const tab: TBLTab = {
        id: ongletNode.id,
        name: ongletNode.label,
        label: ongletNode.label,
        order: ongletNode.order,
        sections: ongletSections,
        allFields: sectionsForTab.length > 0 ? 
          ongletSections.flatMap(section => section.fields) : // Utiliser tous les champs des sections
          fieldsForThisTab // Utiliser SEULEMENT les champs qui appartiennent vraiment à cet onglet
        ,
        subTabs: inferredSubTabs.length > 0 ? inferredSubTabs : undefined,
        product_subTabsVisibility: productSubTabsVis || null,
        product_sourceNodeId: productSourceId || null,
      };
      
      tabs.push(tab);
      
      sectionsByTab[tab.id] = ongletSections;
      
  if (verbose()) dlog(`✅ [TBL-PRISMA] Onglet "${tab.label}" créé: ${sortedFields.length} champs dynamiques`);
    });
  
  // 🆕 TROISIÈME PASSE supprimée: les copies restent désormais dans l'onglet/section où elles ont été créées
  
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
  
  // 🔍🔍🔍 DIAGNOSTIC GLOBAL - Tous les champs "Panneau"
  // if (verbose()) console.log('🔍🔍🔍 [DIAGNOSTIC GLOBAL] Recherche champs Panneau dans fieldsByTab');
  // const allFieldsGlobal = Object.values(fieldsByTab).flat();
  // const panneauFieldsGlobal = allFieldsGlobal.filter(f => 
  //   f.label?.includes('Panneau') || f.label?.includes('panneau') ||
  //   f.id === 'f117b34a-d74c-413a-b7c1-4b9290619012' || 
  //   f.id === 'fb35d781-5b1b-4a2b-869b-ea0b902a444e' ||
  //   f.id.startsWith('f117b34a-') || 
  //   f.id.startsWith('fb35d781-')
  // );
  // if (verbose()) console.log('🔍🔍🔍 [DIAGNOSTIC GLOBAL] Panneau fields trouvés:', panneauFieldsGlobal.length, panneauFieldsGlobal.map(f => ({
  //   id: f.id,
  //   label: f.label,
  //   tabId: Object.entries(fieldsByTab).find(([_, fields]) => fields.includes(f))?.[0],
  //   metadata: (f as any).metadata
  // })));
  
  return { tree, tabs, fieldsByTab, sectionsByTab };
};

// 🎯 HOOK PRINCIPAL
export const useTBLDataPrismaComplete = ({ tree_id, disabled = false, triggerRetransform }: { tree_id: string; disabled?: boolean; triggerRetransform?: number }) => {
  if (verbose()) console.log('🎯 [TBL DEBUG] useTBLDataPrismaComplete appelé avec tree_id:', tree_id, 'disabled:', disabled, 'triggerRetransform:', triggerRetransform);
  
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
  
  // 🔥 GLOBAL EVENT LISTENER FOR DEBUG
  useEffect(() => {
    const globalListener = (event: any) => {
      try {
        window.__tblEventLog = window.__tblEventLog || [];
        window.__tblEventLog.push({ event: event.type, time: new Date().toISOString(), detail: event.detail });
        if (event.type === 'tbl-node-updated') {
          if (verbose()) console.log('🌐 [GLOBAL] tbl-node-updated event detected!', event.detail);
        }
      } catch {
        // noop
      }
    };
    window.addEventListener('tbl-node-updated', globalListener, true); // Use capture phase
    return () => window.removeEventListener('tbl-node-updated', globalListener, true);
  }, []);
  
  type FetchOptions = { silent?: boolean };

  // 🔧 FIX: Garder en mémoire les IDs récemment supprimés pour empêcher un fetch silent
  // de les ramener avant que le cleanup serveur ne soit terminé
  const recentlyDeletedIdsRef = useRef<Set<string>>(new Set());
  const recentlyDeletedTimerRef = useRef<number | null>(null);

  const [tree, setTree] = useState<TBLTree | null>(null);
  const [tabs, setTabs] = useState<TBLTab[]>([]);
  const [fieldsByTab, setFieldsByTab] = useState<Record<string, TBLField[]>>({});
  const [sectionsByTab, setSectionsByTab] = useState<Record<string, TBLSection[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawNodes, setRawNodes] = useState<TreeBranchLeafNode[]>([]); // 🔄 NOUVEAU: Garder les données brutes pour retransformation
  const rawNodesRef = useRef<TreeBranchLeafNode[]>([]); // 🔄 NOUVEAU: Ref stable pour éviter recréation callback
  
  const updateRawNodes = useCallback((updater: TreeBranchLeafNode[] | ((prev: TreeBranchLeafNode[]) => TreeBranchLeafNode[])) => {
    setRawNodes(prev => {
      const next = typeof updater === 'function'
        ? (updater as (items: TreeBranchLeafNode[]) => TreeBranchLeafNode[])(prev)
        : updater;
      rawNodesRef.current = next;
      try { (window as any).__DEBUG_RAW_NODES = next; } catch { /* ignore */ }
      return next;
    });
  }, [setRawNodes]);
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

  const tabsRef = useRef(tabs);
  useEffect(() => { tabsRef.current = tabs; }, [tabs]);
  const sectionsByTabRef = useRef(sectionsByTab);
  useEffect(() => { sectionsByTabRef.current = sectionsByTab; }, [sectionsByTab]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    try {
      const sections = Object.values(sectionsByTab || {}).flat();
      const sectionsWithDisplayAlways = sections.filter(s => !!(s as any).metadata?.displayAlways);
      if (sectionsWithDisplayAlways.length) {
        if (verbose()) console.log('[TBL Hook - Prisma] Sections with displayAlways found after transform:', sectionsWithDisplayAlways.map(s => ({ id: s.id, title: s.title })));
      } else {
        if (verbose()) console.log('[TBL Hook - Prisma] No sections with displayAlways after transform');
      }
    } catch (e) { console.error('[TBL Hook - Prisma] logging transform error', e); }
  }, [sectionsByTab]);

  const fetchData = useCallback(async (options?: FetchOptions) => {
    const silent = options?.silent === true;
    // console.log removed for performance
    if (!tree_id || disabled) return;

    try {
      if (!silent) setLoading(true);
      setError(null);
      // console.log removed for performance
      if (verbose()) dlog('📡 [TBL-PRISMA] Récupération données:', { tree_id });

      const response = await api.get(`/api/treebranchleaf/trees/${tree_id}/nodes`);
      // console.log removed for performance
      
      // 🔗 DEBUG: Vérifier les nodes avec hasLink AVANT transformation (verbose only)
      if (Array.isArray(response) && verbose()) {
        const nodesWithLink = (response as any[]).filter((n: any) => n.hasLink === true);
        console.log(`🔗🔗🔗 [FETCH-DATA RAW] ${nodesWithLink.length} nodes avec hasLink=true reçus de l'API:`, 
          nodesWithLink.map((n: any) => ({ id: n.id, label: n.label, hasLink: n.hasLink, link_targetNodeId: n.link_targetNodeId, link_mode: n.link_mode }))
        );
      }
      
      if (response && Array.isArray(response)) {
        // 🔧 FIX: Filtrer les IDs récemment supprimés pour empêcher
        // un fetch silent de ramener des display nodes que le serveur n'a pas encore nettoyé
        const filteredResponse = recentlyDeletedIdsRef.current.size > 0 && silent
          ? response.filter((n: any) => !recentlyDeletedIdsRef.current.has(n.id))
          : response;
        // store raw
        updateRawRef.current(filteredResponse);
        if (process.env.NODE_ENV === 'development') {
          const withDisplayAlways = filteredResponse.filter(r => r.metadata && typeof r.metadata === 'object' && (r.metadata as any).displayAlways === true);
          if (verbose()) console.log('🔎 [TBL Hook - Prisma] fetch nodes with displayAlways', withDisplayAlways.map(n => ({ id: n.id, label: n.label }))); 
        }
        const formData = (typeof window !== 'undefined' && window.TBL_FORM_DATA) || {};
        const transformedData = transformNodesToTBLComplete(filteredResponse, formData);
        if (verbose()) dlog('🔄 [TBL-PRISMA] Phase 2: Résolution des valeurs dynamiques...');

        const resolvedFieldsByTab: Record<string, TBLField[]> = {};
        for (const [tabId, fields] of Object.entries(transformedData.fieldsByTab)) {
          const resolvedFields = await Promise.all(
            fields.map(async (field) => {
              if (field.needsValueResolution) {
                try {
                  if (verbose()) dlog(`🔍 [TBL-PRISMA] Résolution valeur pour "${field.label}"`);
                  const originalNode = filteredResponse.find(node => node.id === field.id);
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

        // 🔍🔍🔍 DIAGNOSTIC: Chercher les champs "Panneau" et "N° de panneau"
        // FORCE TOUJOURS LES LOGS DIAGNOSTICS (verbose désactivé temporairement)
        if (process.env.NODE_ENV === 'development') {
          const allFields = Object.values(resolvedFieldsByTab).flat();
          const panneauFields = allFields.filter(f => 
            f.label?.includes('Panneau') || f.label?.includes('panneau') ||
            f.id === 'f117b34a-d74c-413a-b7c1-4b9290619012' || f.id === 'fb35d781-5b1b-4a2b-869b-ea0b902a444e' ||
            f.id.startsWith('f117b34a-') || f.id.startsWith('fb35d781-')
          );
          if (verbose()) console.log('🔍🔍🔍 [DIAGNOSTIC PANNEAU] Tous les champs "Panneau" trouvés:', panneauFields.map(f => ({
            id: f.id,
            label: f.label,
            parentId: (f as any).parentId,
            sourceTemplateId: (f as any).sourceTemplateId,
            copySuffix: (f.metadata as any)?.copySuffix
            , subTabKey: (f as any).subTabKey,
            subTabKeys: (f as any).subTabKeys
          })));
        }

        const resolvedSectionsByTab: Record<string, TBLSection[]> = {};
        for (const [tabId, sections] of Object.entries(transformedData.sectionsByTab)) {
          const resolvedSections = sections.map(section => {
            // 🆕 CROSS-SECTION COPY FIX: Inclure les copies dont le sourceTemplateId correspond à un champ de cette section
            const sectionBaseFieldIds = section.fields.map(f => f.id);
            
            // ✅ Champs du tab actuel
            const _currentTabFields = resolvedFieldsByTab[tabId] || [];
            
            // 🔍 CHERCHER AUSSI DANS TOUS LES AUTRES TABS pour les copies cross-tab
            const allTabsFields = Object.values(resolvedFieldsByTab).flat();
            
            // 🔍🔍🔍 DIAGNOSTIC pour cette section
            if (process.env.NODE_ENV === 'development' && verbose() && (section.name?.includes('Devis') || section.name?.includes('PV'))) {
              console.log(`🔍🔍🔍 [DIAGNOSTIC SECTION "${section.name}"] sectionBaseFieldIds:`, sectionBaseFieldIds);
              const panneauInBase = sectionBaseFieldIds.filter(id => 
                id === 'f117b34a-d74c-413a-b7c1-4b9290619012' || id === 'fb35d781-5b1b-4a2b-869b-ea0b902a444e'
              );
              console.log(`🔍🔍🔍 [DIAGNOSTIC SECTION "${section.name}"] Panneau fields in base?`, panneauInBase);
            }
            
            const sectionFieldsResolved = allTabsFields.filter(field => {
              // Garder les champs de base de la section
              if (sectionBaseFieldIds.includes(field.id)) return true;
              
              // 🎯 NOUVEAU: Garder aussi les copies dont le sourceTemplateId est dans cette section
              const sourceTemplateId = (field as any).sourceTemplateId || (field.metadata as any)?.sourceTemplateId;
              if (sourceTemplateId && sectionBaseFieldIds.includes(sourceTemplateId)) {
                if (verbose()) dlog(`🔗 [CROSS-TAB COPY] Ajout de "${field.label}" (du tab source) à section "${section.name}" du tab "${tabId}"`);
                return true;
              }
              
              return false;
            });
            
            return {
              ...section,
              fields: sectionFieldsResolved
            };
          });
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
      if (!silent) setLoading(false);
    }
  }, [api, tree_id, disabled]);

  // 🔥 NEW: REACT TO EXTERNAL RETRANSFORM TRIGGER (from TreeBranchLeafEditor)
  // 🔧 FIX: Utiliser un ref pour suivre le dernier triggerRetransform traité et éviter les boucles infinies
  const lastProcessedRetransformRef = useRef<number>(0);
  
  useEffect(() => {
    // 🔥 FIX: Ne pas exécuter si pas de trigger ou si déjà traité
    if (!triggerRetransform || rawNodes.length === 0) return;
    if (triggerRetransform === lastProcessedRetransformRef.current) return; // Déjà traité
    
    lastProcessedRetransformRef.current = triggerRetransform;
    
    if (verbose()) console.log('🔥 [useTBLDataPrismaComplete] Retransform triggered!', { triggerRetransform, rawNodesCount: rawNodes.length });
    
    try {
      const formData = (typeof window !== 'undefined' && window.TBL_FORM_DATA) || {};
      const transformedData = transformNodesToTBLComplete(rawNodes, formData);
      
      // Rebuild sectionsByTab with metadata properly evaluated
      const resolvedSectionsByTab: Record<string, TBLSection[]> = {};
      for (const [tabId, sections] of Object.entries(transformedData.sectionsByTab)) {
        const resolvedSections = sections.map(section => ({
          ...section,
          fields: section.fields  // Fields already filtered in transform based on current state
        }));

        // 🔎 Pour chaque section, lister les champs Panneau présents (diagnostic plus fin)
        // 🔧 FIX: Utiliser sectionsByTabRef au lieu de sectionsByTab pour éviter la dépendance circulaire
        Object.entries(sectionsByTabRef.current).forEach(([tabIdDiag, secs]) => {
          secs.forEach(sec => {
            const found = (sec.fields || []).filter(f => 
              (f.label && (f.label.includes('Panneau') || f.label.includes('panneau'))) ||
              f.id === 'f117b34a-d74c-413a-b7c1-4b9290619012' ||
              f.id === 'fb35d781-5b1b-4a2b-869b-ea0b902a444e' ||
              f.id.startsWith('f117b34a-') ||
              f.id.startsWith('fb35d781-')
            );
          if (found.length > 0) {
            if (verbose()) console.log('🔎 [DIAGNOSTIC SECTION] Panneau fields in section:', { tabId: tabIdDiag, sectionId: sec.id, sectionName: sec.name, fields: found.map(f => ({ id: f.id, label: f.label, parentRepeaterId: (f as any).parentRepeaterId, sourceTemplateId: (f as any).sourceTemplateId || (f as any).metadata?.sourceTemplateId, subTabKey: (f as any).subTabKey, subTabKeys: (f as any).subTabKeys, visible: f.visible })) });
            }
          });
        });
        resolvedSectionsByTab[tabId] = resolvedSections;
      }
      
      if (verbose()) console.log('✅ [useTBLDataPrismaComplete] Retransform complete, updating state');
      setTabs(transformedData.tabs);
      setFieldsByTab(transformedData.fieldsByTab);
      setSectionsByTab(resolvedSectionsByTab);
    } catch (err) {
      console.error('❌ [useTBLDataPrismaComplete] Retransform error:', err);
    }
  }, [triggerRetransform, rawNodes]); // 🔧 FIX: Retiré sectionsByTab des dépendances pour éviter la boucle infinie

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
            updateRawRef.current(prev => {
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
            updateRawRef.current(prev => {
              const byId = new Set(prev.map(n => n.id));
              const newOnes = candidates.filter(n => !byId.has(n.id));
              if (newOnes.length === 0) return prev;
              return [...prev, ...newOnes];
            });
            if (verbose()) console.log('[TBL Hook] merged nodes from full tree query:', candidates.length);
            // trigger retransform and re-evaluate missing
            setFormDataVersion(v => v + 1);
            await new Promise(r => setTimeout(r, 120));
            missing = getMissing();
          } else {
            console.warn('[TBL Hook] No candidate nodes found in full tree query. Falling back to full fetch (fetchData)');
            fetchDataRef.current();
          }
        } else {
          console.warn('[TBL Hook] Full tree query returned no nodes, falling back to fetchData()');
          fetchDataRef.current();
        }
      } catch (err) {
        console.error('[TBL Hook] Failed full tree reconcile query:', err);
        fetchDataRef.current();
      }
    }
  }, [apiRef, tree_id]);


  useEffect(() => {
    console.log('🔗🔗🔗 [INITIAL-FETCH] useEffect triggered, disabled:', disabled);
    if (disabled) {
      setLoading(false);
      return;
    }
    // 🔥 FIX: Use fetchData directly instead of fetchDataRef which is defined later
    console.log('🔗🔗🔗 [INITIAL-FETCH] Calling fetchData directly');
    fetchData();
  }, [disabled, fetchData]);

  // 🔄 FONCTION: Retransformer les données avec le formData actuel (SANS recharger depuis l'API)
  const retransformWithCurrentFormData = useCallback(async () => {
    const currentRawNodes = rawNodesRef.current;
    
    if (!currentRawNodes || currentRawNodes.length === 0) {
      console.warn('⚠️ [TBL Hook] Pas de données brutes disponibles pour retransformation');
      return;
    }

    try {
      if (verbose()) console.log('🔄 [TBL Hook] Retransformation avec formData actuel...', 'rawNodes:', currentRawNodes.length);
      if (verbose()) console.log('🔍 [TBL Hook] RawNodes IDs:', currentRawNodes.map(n => `${n.id}(${n.label})`).slice(0, 10));
      
      // ✅ Récupérer formData depuis le global store TBL
      const formData = (typeof window !== 'undefined' && window.TBL_FORM_DATA) || {};
      const transformedData = transformNodesToTBLComplete(currentRawNodes, formData);
      
      if (verbose()) console.log('🎯 [TBL Hook] Retransformation: transformedData.tabs.length=', transformedData.tabs.length, 'fieldsByTab keys=', Object.keys(transformedData.fieldsByTab).length);
      
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

      try {
        createAutomaticMirrors(resolvedTabs, currentRawNodes);
      } catch (mirrorError) {
        console.error('⚠️ [TBL Hook] Impossible de créer les mirrors après retransformation:', mirrorError);
      }
      
      if (verbose()) console.log('✅ [TBL Hook] Retransformation terminée, mise à jour du state...');
      if (verbose()) console.log('📊 [TBL Hook] État mis à jour: tabs=', resolvedTabs.length, 'fieldsByTab=', Object.keys(resolvedFieldsByTab).length);
      
      setTree({ ...transformedData.tree, tabs: resolvedTabs });
      setTabs(resolvedTabs);
      setFieldsByTab(resolvedFieldsByTab);
      setSectionsByTab(resolvedSectionsByTab);
      if (verbose()) console.log('✅ [TBL Hook] Retransformation terminée');
    } catch (err) {
      console.error('❌ [TBL Hook] Erreur lors de la retransformation:', err);
    }
  }, [api, tree_id]);

  const matchesCurrentTreeId = useCallback((eventTreeId?: string | number) => {
    if (!tree_id || eventTreeId === undefined || eventTreeId === null) {
      return false;
    }
    return String(eventTreeId) === String(tree_id);
  }, [tree_id]);

  useEffect(() => {
    if (disabled) return;
    if (formDataVersion < 1) return;
    retransformWithCurrentFormData();
  }, [disabled, formDataVersion, retransformWithCurrentFormData]);

  // 🔄 NOUVEAU: Écouter les changements de formData pour réinjecter les références partagées
  // ⚠️ ATTENTION: NE PAS recharger fetchData() qui réinitialise tout le formulaire ! (voir fetchDataRef.current)
  // → On retransforme les données déjà chargées avec le nouveau formData
  // Debounce + guard refs
  const retransformDebounceRef = useRef<number | null>(null);
  const isRetransformingRef = useRef(false);

  useEffect(() => {
    if (verbose()) console.log('🎯 [TBL Hook] Event listener monté/mis à jour. disabled:', disabled, 'tree_id:', tree_id, 'rawNodesRef.current.length:', rawNodesRef.current.length);
    
  const handleFormDataChange = () => {
      if (verbose()) console.log('🔔 [TBL Hook] Event TBL_FORM_DATA_CHANGED reçu !');
      
      if (disabled) {
        if (verbose()) console.log('⚠️ [TBL Hook] Hook désactivé, ignoré');
        return;
      }
      
      if (!tree_id) {
        if (verbose()) console.log('⚠️ [TBL Hook] Pas de tree_id, ignoré');
        return;
      }
      
      if (rawNodesRef.current.length === 0) {
        if (verbose()) console.log('⚠️ [TBL Hook] rawNodes vide, ignoré');
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

    if (verbose()) console.log('✅ [TBL Hook] Event listener TBL_FORM_DATA_CHANGED attaché');
    window.addEventListener('TBL_FORM_DATA_CHANGED', handleFormDataChange);
    
    return () => {
      if (verbose()) console.log('🧹 [TBL Hook] Event listener TBL_FORM_DATA_CHANGED détaché');
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
        if (verbose()) console.log('🔄 [TBL Hook OLD] Capacité mise à jour détectée, rechargement des données... (debounced)', customEvent.detail);
        if (capabilityDebounceRef.current) window.clearTimeout(capabilityDebounceRef.current);
        capabilityDebounceRef.current = window.setTimeout(() => {
          fetchDataRef.current();
        }, 300);
      }
    };

    window.addEventListener('tbl-capability-updated', handleCapabilityUpdate);
    return () => {
      if (capabilityDebounceRef.current) window.clearTimeout(capabilityDebounceRef.current);
      window.removeEventListener('tbl-capability-updated', handleCapabilityUpdate);
    };
  }, [disabled, tree_id]);

  // Store current functions in refs to avoid re-registering listeners
  const retransformRef = useRef(retransformWithCurrentFormData);
  const reconcileRef = useRef(reconcileDuplicatedNodes);
  const updateRawRef = useRef(updateRawNodes);
  const fetchDataRef = useRef(fetchData);

  useEffect(() => {
    retransformRef.current = retransformWithCurrentFormData;
    reconcileRef.current = reconcileDuplicatedNodes;
    updateRawRef.current = updateRawNodes;
    fetchDataRef.current = fetchData;
  }, [retransformWithCurrentFormData, reconcileDuplicatedNodes, updateRawNodes, fetchData]);

  useEffect(() => {
    if (!tree_id || disabled) return;

    const handleNodeUpdated = (event: Event) => {
      try {
        const customEvent = event as CustomEvent<{ node?: Partial<TreeBranchLeafNode>; treeId?: string | number }>;
        const { node, treeId: eventTreeId } = customEvent.detail || {};
        if (!node || !matchesCurrentTreeId(eventTreeId)) {
          return;
        }

        updateRawRef.current(prev => {
          const next = [...prev];
          const idx = next.findIndex(existing => existing.id === node.id);
          if (idx >= 0) {
            next[idx] = { ...next[idx], ...node } as TreeBranchLeafNode;
            return next;
          }
          return [...next, node as TreeBranchLeafNode];
        });

        setFormDataVersion(v => v + 1);
      } catch (err) {
        console.error('❌ [TBL Hook] handleNodeUpdated failed:', err);
      }
    };

    window.addEventListener('tbl-node-updated', handleNodeUpdated);
    return () => window.removeEventListener('tbl-node-updated', handleNodeUpdated);
  }, [tree_id, disabled, matchesCurrentTreeId]);

  // 🔄 Écouter les changements de paramètres repeater pour recharger les données
  useEffect(() => {
    if (verbose()) console.log('🎧🎧🎧 [TBL Hook] Listener tbl-repeater-updated INSTALLÉ', { tree_id, disabled });

    const handleRepeaterUpdate = async (event: Event) => {
      const customEvent = event as CustomEvent<{
        nodeId: string;
        treeId: string | number | undefined;
        source?: string;
        timestamp?: number;
        suppressReload?: boolean;
        duplicated?: Array<{ id: string; parentId?: string; sourceTemplateId?: string }>;
        deletedIds?: string[];
        deletingIds?: string[];
        newNodes?: Array<Partial<TreeBranchLeafNode> & { id?: string }>;
      }>;
      const detail = customEvent.detail || {};
      const { treeId: eventTreeId, suppressReload } = detail;

      if (disabled || !eventTreeId || String(eventTreeId) !== String(tree_id)) {
        if (verbose()) console.log('🔇 [TBL Hook] Repeater update ignoré (autre arbre ou hook désactivé)', { eventTreeId, tree_id, disabled });
        return;
      }

      if (suppressReload) {
        // Support both `newNodes` and `nodes` payload keys from repeater copy API
        const inlineNodesSource = (detail as any).newNodes || (detail as any).nodes;
        const inlineNodes = Array.isArray(inlineNodesSource) ? inlineNodesSource : [];
        const duplicated = Array.isArray(detail.duplicated) ? detail.duplicated : [];
        const deletedIds = Array.isArray(detail.deletedIds) ? detail.deletedIds : [];
        const deletingIds = Array.isArray(detail.deletingIds) ? detail.deletingIds : [];
        const inlineNodeCount = inlineNodes.length;
        const hasRenderableInlineNodes = inlineNodes.some(node => {
          const type = typeof node?.type === 'string' ? node.type.toLowerCase() : '';
          // Conservative: only treat as renderable when matches expected Leaf types
          return type.includes('leaf_field') || type.includes('leaf_option') || type.includes('leaf_option_field') || type === 'leaf_repeater';
        });
        const needsFallbackReload = duplicated.length > 0 && (!inlineNodeCount || !hasRenderableInlineNodes);

        if (inlineNodes.length > 0) {
          updateRawRef.current(prev => {
            const next = [...prev];
            let changed = false;
            inlineNodes.forEach((node) => {
              if (!node || typeof node !== 'object' || !node.id) return;
              const idx = next.findIndex(existing => existing.id === node.id);
              if (idx >= 0) {
                next[idx] = { ...next[idx], ...(node as TreeBranchLeafNode) };
              } else {
                next.push(node as TreeBranchLeafNode);
              }
              changed = true;
            });
            return changed ? next : prev;
          });
          // If inline nodes are provided but lack a full "type" / renderable properties,
          // attempt to fetch their full payloads individually and merge them to ensure rendering.
          const inlineIdsNeedingFetch: string[] = inlineNodes
            .filter(n => n && typeof n === 'object' && n.id && (!n.type || typeof n.type !== 'string' || !/(leaf_|leaf_repeater)/i.test(n.type)))
            .map(n => n.id);
          if (inlineIdsNeedingFetch.length > 0) {
            // Fire off fetches concurrently (don't block the main update), then merge results
            Promise.all(inlineIdsNeedingFetch.map(async id => {
              try {
                const res = await apiRef.current.get(`/api/treebranchleaf/nodes/${id}/full`);
                const nodes: TreeBranchLeafNode[] = Array.isArray(res)
                  ? res as TreeBranchLeafNode[]
                  : (res && typeof res === 'object' ? (res.data || res.nodes || (res.node ? [res.node] : [])) : []);
                if (nodes.length > 0) {
                  updateRawRef.current(prev => {
                    const byId = new Map(prev.map(n => [n.id, n]));
                    let changed2 = false;
                    nodes.forEach(n => {
                      if (!n.id) return;
                      const existing = byId.get(n.id);
                      if (!existing) { byId.set(n.id, n); changed2 = true; }
                      else { const merged = { ...existing, ...n }; if (merged !== existing) { byId.set(n.id, merged); changed2 = true; } }
                    });
                    return changed2 ? Array.from(byId.values()) : prev;
                  });
                          // Debug: log inline node ids merged and basic metadata for diagnostics
                          try {
                            const inlineSummaries = inlineNodes.filter(n => n && n.id).map(n => ({ id: n.id, type: n.type, parentId: n.parentId, metadataSummary: (n.metadata && typeof n.metadata === 'object') ? (n.metadata as any).sourceTemplateId || (n.metadata as any).copiedFromNodeId || null : null }));
                            if (verbose()) console.log('[TBL Hook] inline nodes merged (summaries):', inlineSummaries);
                          } catch { /* noop */ }
                }
              } catch (err) {
                ddiag('[TBL Hook] inline node fetch failed for id', id, err);
              }
            })).catch(() => { /* noop */ });
          }
        }

        const idsToRemove = [...new Set([...(deletedIds || []), ...(deletingIds || [])])];
        let idsActuallyRemoved = false;
        if (idsToRemove.length > 0) {
          // 🔧 FIX: Cascade par suffixe + scan des display nodes (comme le hook fixed)
          const eventRepeaterId = String(detail.nodeId || '');
          updateRawRef.current(prev => {
            const removed = new Set(idsToRemove);
            // Extraire les suffixes des nœuds supprimés
            const deletedSuffixes = new Set<string>();
            for (const id of idsToRemove) {
              const m = String(id).match(/-(\d+)$/);
              if (m) deletedSuffixes.add(m[1]);
            }
            // Cascade: supprimer les enfants dont le parent a été supprimé + même suffixe
            let cascadeAdded = true;
            while (cascadeAdded) {
              cascadeAdded = false;
              for (const n of prev) {
                if (removed.has(n.id)) continue;
                if (n.parentId && removed.has(n.parentId)) {
                  const nodeSuffix = String(n.id).match(/-(\d+)$/)?.[1];
                  if (nodeSuffix && deletedSuffixes.has(nodeSuffix)) {
                    removed.add(n.id);
                    cascadeAdded = true;
                  } else if (!nodeSuffix) {
                    removed.add(n.id);
                    cascadeAdded = true;
                  }
                }
              }
            }
            // 🔧 FIX DISPLAY: Scanner les display/derived nodes avec le même suffixe + même repeater
            // 🔧 FIX SCOPE: TOUTES les conditions doivent être scopées au repeater courant.
            // AVANT: meta.copiedFromNodeId/sourceTemplateId/etc. matchaient TOUT nœud copié,
            // y compris les copies d'AUTRES repeaters → suppression croisée !
            // APRÈS: on vérifie l'appartenance au repeater via duplicatedFromRepeater/repeaterParentId/repeatScopeId
            if (eventRepeaterId && deletedSuffixes.size > 0) {
              // Pré-calculer les templateNodeIds du repeater pour vérification d'appartenance
              const repeaterNode = prev.find(n => n.id === eventRepeaterId);
              const repeaterMeta: any = repeaterNode?.metadata || {};
              const templateIds = new Set<string>([
                ...(repeaterMeta.repeater?.templateNodeIds || []),
                ...(() => {
                  try {
                    const raw = (repeaterNode as any)?.repeater_templateNodeIds 
                                || (repeaterNode as any)?.repeaterTemplateNodeIds;
                    if (raw) return typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
                  } catch { /* ignore */ }
                  return [];
                })()
              ]);
              
              // 🔧 FIX: Étendre templateIds par BFS pour inclure TOUS les descendants
              // (sous-sections, sous-champs, etc.) — nécessaire pour Toit dont les
              // display nodes référencent des variables sur des enfants de templates
              {
                const bfsQueue = [...templateIds, eventRepeaterId];
                const bfsVisited = new Set<string>(bfsQueue);
                while (bfsQueue.length > 0) {
                  const pid = bfsQueue.shift()!;
                  for (const n of prev) {
                    const nId = String(n.id);
                    if (String(n.parentId) === pid && !bfsVisited.has(nId)) {
                      const baseId = nId.replace(/-\d+$/, '');
                      templateIds.add(baseId);
                      bfsVisited.add(nId);
                      bfsQueue.push(nId);
                    }
                  }
                }
              }

              for (const n of prev) {
                if (removed.has(n.id)) continue;
                const nodeSuffix = String(n.id).match(/-(\d+)$/)?.[1];
                if (!nodeSuffix || !deletedSuffixes.has(nodeSuffix)) continue;
                if (String(n.id).includes('-sum-total')) continue;
                const meta = ((n as any).metadata || {}) as Record<string, unknown>;
                
                // Vérifier que le nœud APPARTIENT au repeater courant
                const belongsToRepeater = 
                  meta.duplicatedFromRepeater === eventRepeaterId ||
                  meta.repeaterParentId === eventRepeaterId ||
                  meta.repeatScopeId === eventRepeaterId;
                
                // Pour les nœuds avec sourceTemplateId/copiedFromNodeId, vérifier que le template
                // fait partie des templates du repeater courant
                const baseId = String(n.id).replace(/-\d+$/, '');
                const templateBelongsToRepeater = templateIds.has(baseId) || 
                  (meta.sourceTemplateId && templateIds.has(String(meta.sourceTemplateId))) ||
                  (meta.copiedFromNodeId && templateIds.has(String(meta.copiedFromNodeId)));
                
                // Le nœud parent est-il déjà supprimé ? (cascade directe)
                const parentAlreadyRemoved = n.parentId && removed.has(String(n.parentId));

                if (belongsToRepeater || templateBelongsToRepeater || parentAlreadyRemoved) {
                  removed.add(n.id);
                }
              }
              
              // 🔧 FIX DISPLAY V2: Tracer les display nodes via linkedVariableIds → fromVariableId
              // Les display nodes legacy/actuels peuvent avoir duplicatedFromRepeater: true (boolean)
              // au lieu de l'ID du repeater. On utilise la chaîne: fromVariableId → variable hôte → template repeater
              if (templateIds.size > 0) {
                // Construire map: baseVariableId → Set<baseNodeId> (TOUS les nœuds hébergeant cette variable)
                // 🔧 FIX V3: Une variable peut être liée à PLUSIEURS nœuds (linked variables).
                // Si on ne garde qu'un seul nodeId, le "mauvais" nœud (hors templateIds) peut
                // écraser le bon → la trace échoue pour KVA, Rampant toiture, M² toiture.
                // Avec un Set, on vérifie si AU MOINS UN des hôtes est dans templateIds.
                const varToNodeBasesMap = new Map<string, Set<string>>();
                for (const n of prev) {
                  const nMeta = ((n as any).metadata || {}) as Record<string, unknown>;
                  // Skip display nodes — ils référencent la variable mais ne sont pas l'hôte
                  if (nMeta.autoCreatedDisplayNode || nMeta.tbl_auto_generated) continue;
                  const lvIds = (n as any).linkedVariableIds;
                  if (Array.isArray(lvIds)) {
                    const nodeBase = String(n.id).replace(/-\d+$/, '');
                    for (const vid of lvIds) {
                      const baseVid = String(vid).replace(/-\d+$/, '');
                      let s = varToNodeBasesMap.get(baseVid);
                      if (!s) { s = new Set(); varToNodeBasesMap.set(baseVid, s); }
                      s.add(nodeBase);
                    }
                  }
                }
                if (varToNodeBasesMap.size > 0) {
                  for (const n of prev) {
                    if (removed.has(n.id)) continue;
                    const nodeSuffix = String(n.id).match(/-(\d+)$/)?.[1];
                    if (!nodeSuffix || !deletedSuffixes.has(nodeSuffix)) continue;
                    const meta = ((n as any).metadata || {}) as Record<string, unknown>;
                    // Accepter autoCreatedDisplayNode, tbl_auto_generated, OU fromVariableId seul
                    const fromVarId = meta.fromVariableId;
                    if (!fromVarId) continue;
                    const baseFromVarId = String(fromVarId).replace(/-\d+$/, '');
                    const hostNodeBases = varToNodeBasesMap.get(baseFromVarId);
                    if (hostNodeBases) {
                      for (const hBase of hostNodeBases) {
                        if (templateIds.has(hBase)) {
                          removed.add(n.id);
                          break;
                        }
                      }
                    }
                  }
                }
              }
            }
            if (removed.size === 0) return prev;
            // 🔧 FIX: Mémoriser les IDs supprimés pour empêcher un fetch de les ramener
            removed.forEach(id => recentlyDeletedIdsRef.current.add(id));
            // Nettoyer après 10s (le serveur a largement fini son cleanup)
            if (recentlyDeletedTimerRef.current) window.clearTimeout(recentlyDeletedTimerRef.current);
            recentlyDeletedTimerRef.current = window.setTimeout(() => {
              recentlyDeletedIdsRef.current.clear();
              recentlyDeletedTimerRef.current = null;
            }, 10000) as unknown as number;
            idsActuallyRemoved = true;
            return prev.filter(n => !removed.has(n.id));
          });
        }

        // NEW: fetch updated parent repeater containers so their metadata lists new copy IDs immediately
        if (duplicated.length > 0) {
          const parentIds = [...new Set(duplicated.map(d => d.parentId).filter(Boolean))] as string[];
          if (parentIds.length > 0) {
            await Promise.all(parentIds.map(async parentId => {
              try {
                const res = await apiRef.current.get(`/api/treebranchleaf/nodes/${parentId}/full`);
                const nodes: TreeBranchLeafNode[] = Array.isArray(res)
                  ? res as TreeBranchLeafNode[]
                  : (res && typeof res === 'object'
                      ? (res.data || res.nodes || (res.node ? [res.node] : []))
                      : []);
                if (nodes.length > 0) {
                  updateRawRef.current(prev => {
                    const byId = new Map(prev.map(n => [n.id, n]));
                    let changed = false;
                    nodes.forEach(n => {
                      if (!n.id) return;
                      const existing = byId.get(n.id);
                      if (!existing) {
                        byId.set(n.id, n);
                        changed = true;
                      } else {
                        // merge shallow to keep other props
                        const merged = { ...existing, ...n };
                        if (merged !== existing) {
                          byId.set(n.id, merged);
                          changed = true;
                        }
                      }
                    });
                    const nextRes = changed ? Array.from(byId.values()) : prev;
                    // Debug: log parent merge summary
                    try {
                      if (verbose()) console.log('[TBL Hook] merged parent node(s) into rawNodes:', nodes.map(n => n.id));
                    } catch { /* noop */ }
                    return nextRes;
                  });
                }
              } catch (e) {
                console.warn('[TBL Hook] Unable to fetch updated parent repeater container', parentId, e);
              }
            }));
          }
        }

        // Always reconcile duplicated nodes and wait for the reconciliation to complete
        if (duplicated.length > 0) {
          try {
            ddiag('[TBL Hook] Start reconcile for duplicated ids:', duplicated.map(d=>d.id));
            await reconcileRef.current(duplicated);
            ddiag('[TBL Hook] Reconcile done for duplicated ids');
          } catch (e) {
            console.warn('[TBL Hook] reconcile failed (ignored)', e);
          }
        }

        // Re-transform AFTER reconciliation to ensure new nodes are merged and visible
        // 🔧 FIX: Ne retransformer que si quelque chose a changé (duplication OU IDs réellement supprimés)
        // Sinon le second événement tbl-repeater-updated (deletedIds après deletingIds) provoquait
        // une retransform REDONDANTE car les IDs étaient déjà supprimés par l'événement optimiste.
        if (rawNodesRef.current.length > 0 && (duplicated.length > 0 || idsActuallyRemoved)) {
          try {
            if (verbose()) console.log('[TBL Hook] retransform AFTER duplicate reconciled - rawNodes count', rawNodesRef.current.length);
            retransformRef.current();
          } catch (err) {
            console.error('[TBL Hook] retransform after duplication failed:', err);
            // If this fails, try a silent fetch as fallback
            fetchDataRef.current({ silent: true });
          }
        }

        // Always perform a silent refetch shortly after duplication to guarantee full subtree availability
        if (duplicated.length > 0) {
          // Increase delay slightly (ms) to give reconcile + retransform a chance
          const delay = needsFallbackReload ? 80 : 160; // tuned values for stability
          window.setTimeout(() => {
            fetchDataRef.current({ silent: true });
          }, delay);
        }

        // Ensure the retransform actually produced a visible change for duplicated ids.
        // If not, retry a quick retransform up to N times before fallback to full fetch.
        (async () => {
          try {
            const duplicatedIds = duplicated.map(d => d.id);
            const hasIdInTransformed = () => {
              const t = transformedRef.current;
              if (!t) return false;
              const allFields = Object.values(t.fieldsByTab || {}).flat();
              return duplicatedIds.every(id => allFields.some(f => f.id === id));
            };

            if (hasIdInTransformed()) {
              if (verbose()) console.log('[TBL Hook] Duplicated ids found in transformed fields after first retransform');
              return;
            }

            for (let attempt = 1; attempt <= 3; attempt++) {
              // small delay for server/transform to settle
              await new Promise(r => setTimeout(r, attempt === 1 ? 80 : 120));
              try {
                console.error(`[TBL Hook] Retry retransform attempt ${attempt}`);
                retransformRef.current();
              } catch (err) {
                ddiag('[TBL Hook] retransform attempt failed', attempt, err);
              }

              if (hasIdInTransformed()) {
                console.error('[TBL Hook] Duplicated ids now present after retries');
                return;
              }
            }

            // Still not present → attempt optimistic UI injection for duplicated ids
            console.warn('[TBL Hook] Duplicated ids not present after retries; attempting optimistic UI injection');
            try {
              const missingIds = duplicatedIds.filter(id => {
                const t = transformedRef.current;
                if (!t) return true;
                const allFields = Object.values(t.fieldsByTab || {}).flat();
                return !allFields.some(f => f.id === id);
              });
              const rawMap = new Map(rawNodesRef.current.map(n => [n.id, n]));
              // Build capabilities helper (small version from transformer)
              const buildMinimalField = (node: TreeBranchLeafNode) => {
                const finalFieldType = (node.subType || node.fieldType || node.type || 'text') as string;
                const capabilities = {
                  data: {
                    enabled: !!node.data_instances && Object.keys(node.data_instances || {}).length > 0,
                    activeId: node.data_activeId,
                    instances: node.data_instances
                  }
                };
                return {
                  id: node.id,
                  name: node.label,
                  label: node.label,
                  type: finalFieldType,
                  required: node.isRequired,
                  visible: node.isVisible,
                  order: node.order,
                  parentRepeaterId: node.parentId,
                  sourceTemplateId: (node.metadata as any)?.sourceTemplateId,
                  isDeletableCopy: true,
                  isLastInCopyGroup: false,
                  canAddNewCopy: false,
                  metadata: node.metadata,
                  capabilities
                } as any as TBLField;
              };

              // Map sectionsByTab to mutate locally
              const newSectionsByTab = { ...(sectionsByTabRef.current || {}) };
              
              // 🎯 DEBUG: Afficher tous les onglets disponibles
              console.log(`🔍🔍🔍 [INJECTION OPTIMISTE] Onglets disponibles dans sectionsByTab:`, Object.keys(newSectionsByTab));
              Object.keys(newSectionsByTab).forEach(tabId => {
                const sections = newSectionsByTab[tabId] || [];
                console.log(`   - Tab "${tabId}": ${sections.length} sections`);
                sections.forEach(s => {
                  console.log(`      • Section "${s.name}" (${s.id}): ${s.fields.length} champs`);
                });
              });
              
              let injected = 0;
              missingIds.forEach(id => {
                const node = rawMap.get(id);
                if (!node) return;
                const field = buildMinimalField(node);
                
                // CRITICAL: For copies, find the TEMPLATE FIELD section (not repeater button!) and place copy NEXT TO original
                const sourceTemplateId = (node.metadata as any)?.sourceTemplateId;
                const parentRepeaterId = node.parentId;
                let inserted = false;
                
                console.log(`🔍 [COPY DEBUG] Processing copy field: "${field.label}", sourceTemplateId="${sourceTemplateId}", parentRepeaterId="${parentRepeaterId}"`);
                
                // 🎯 DEBUG SPÉCIAL PANNEAU
                const isPanneauField = field.label?.includes('Panneau') || field.label?.includes('panneau');
                if (isPanneauField) {
                  console.log(`🎯🎯🎯 [PANNEAU DEBUG] Champ Panneau détecté: "${field.label}"`);
                  console.log(`🎯 sourceTemplateId: ${sourceTemplateId}`);
                  console.log(`🎯 field.id: ${(field as any).id}`);
                  console.log(`🎯 parentRepeaterId: ${parentRepeaterId}`);
                  console.log(`🎯 field.metadata:`, node.metadata);
                }
                
                // Priority 1: Find the ORIGINAL TEMPLATE FIELD in the sections (not the repeater button!)
                // The copy should go right after the template field, in the SAME section as the template
                if (sourceTemplateId) {
                  console.log(`🔍 [COPY PLACEMENT] Looking for template with sourceTemplateId="${sourceTemplateId}" in ${Object.keys(newSectionsByTab).length} tabs`);
                  
                  if (isPanneauField) {
                    console.log(`🎯🎯🎯 [PANNEAU SEARCH] Recherche de l'original pour "${field.label}"...`);
                    console.log(`🎯 [PANNEAU SEARCH] Tabs disponibles: [${Object.keys(newSectionsByTab).join(', ')}]`);
                  }
                  
                  for (const tabId of Object.keys(newSectionsByTab)) {
                    const secs = newSectionsByTab[tabId] || [];
                    if (isPanneauField) {
                      console.log(`🎯 [PANNEAU SEARCH] Tab "${tabId}": ${secs.length} sections`);
                    } else {
                      console.log(`🔍 [COPY PLACEMENT] Tab "${tabId}": checking ${secs.length} sections`);
                    }
                    
                    for (let si = 0; si < secs.length; si++) {
                      const section = secs[si];
                      const allFieldIds = section.fields.map(f => (f as any).id);
                      const allFieldLabels = section.fields.map(f => (f as any).label);
                      
                      if (isPanneauField) {
                        console.log(`🎯 [PANNEAU SEARCH] Section "${section.name}" (${section.id}):`);
                        console.log(`   - ${section.fields.length} champs`);
                        console.log(`   - IDs: [${allFieldIds.join(', ')}]`);
                        console.log(`   - Labels: [${allFieldLabels.join(', ')}]`);
                        console.log(`   - Recherche de sourceTemplateId="${sourceTemplateId}"...`);
                      } else {
                        console.log(`🔍 [COPY PLACEMENT] Section "${section.name}" (${section.id}): ${section.fields.length} fields [${allFieldIds.join(', ')}]`);
                      }
                      
                      // Find the original template field by its ID
                      const templateFieldIdx = section.fields.findIndex(f => (f as any).id === sourceTemplateId);
                      
                      if (templateFieldIdx !== -1) {
                        if (isPanneauField) {
                          console.log(`✅✅✅ [PANNEAU FOUND] Template trouvé! "${(section.fields[templateFieldIdx] as any).label}" à l'index ${templateFieldIdx} dans section "${section.name}"`);
                        }
                        console.log(`✅ [COPY PLACEMENT] Found template field "${(section.fields[templateFieldIdx] as any).label}" in section "${section.name}"`);
                        // Place the copy right after the template field in the SAME section
                        const nextFields = [ ...section.fields ];
                        nextFields.splice(templateFieldIdx + 1, 0, field);
                        secs[si] = { ...section, fields: nextFields } as any;
                        inserted = true;
                        console.log(`✅ [COPY PLACEMENT] Copy "${field.label}" placed in section "${section.name}" (next to template field)`);
                        if (isPanneauField) {
                          console.log(`✅✅✅ [PANNEAU PLACED] Copie "${field.label}" placée dans section "${section.name}" après template`);
                        }
                        injected++;
                        break;
                      } else if (isPanneauField) {
                        console.log(`❌ [PANNEAU SEARCH] Template ID "${sourceTemplateId}" NON TROUVÉ dans cette section`);
                      }
                    }
                    if (inserted) break;
                  }
                  
                  if (isPanneauField && !inserted) {
                    console.error(`❌❌❌ [PANNEAU ERROR] Impossible de trouver le template pour "${field.label}" avec sourceTemplateId="${sourceTemplateId}"`);
                    console.error(`❌ Aucun champ avec cet ID n'existe dans aucune section de newSectionsByTab!`);
                  }
                } else {
                  console.warn(`⚠️ [COPY PLACEMENT] Copy "${field.label}" has NO sourceTemplateId in metadata!`);
                  if (isPanneauField) {
                    console.error(`❌❌❌ [PANNEAU ERROR] "${field.label}" n'a PAS de sourceTemplateId dans les metadata!`);
                  }
                }

                // Fallback: If no sourceTemplateId match, skip placement and do NOT add to Bloc section
                // Copies without proper sourceTemplateId will be filtered or handled elsewhere
                if (!inserted) {
                  console.warn(`⚠️ [COPY PLACEMENT] Copy "${field.label}" has no template match (sourceTemplateId="${sourceTemplateId}"), skipping placement`);
                  // Do NOT force insert into first section - let the normal data flow handle it
                }
              });

              if (injected > 0) {
                console.error('[TBL Hook] injected optimistic duplicated fields into sections:', injected);
                setSectionsByTab(newSectionsByTab);
                // Rebuild tabs & fieldsByTab
                const newTabs = ((tabsRef.current || []) as TBLTab[]).map(tab => ({ ...tab, sections: newSectionsByTab[tab.id] || tab.sections }));
                setTabs(newTabs);
                const rebuiltFieldsByTab: Record<string, TBLField[]> = {};
                newTabs.forEach(t => rebuiltFieldsByTab[t.id] = t.sections.flatMap(s => s.fields));
                setFieldsByTab(rebuiltFieldsByTab);
              } else {
                console.warn('[TBL Hook] No sections found to inject duplicated fields. Falling back silent fetch.');
                fetchDataRef.current({ silent: true });
              }
            } catch (err) {
              console.warn('[TBL Hook] optimistic injection failed, falling back to full silent fetch', err);
              fetchDataRef.current({ silent: true });
            }
          } catch {
            // ignore
          }
        })();

        // Dispatch a local silent retransform event for the top-level container UI to reconcile
        // 🔧 FIX: Skip pour les suppressions — la retransform inline ci-dessus suffit.
        // Dispatcher un tbl-force-retransform ici provoquait une retransform REDONDANTE.
        if (duplicated.length > 0) {
          try {
            window.dispatchEvent(new CustomEvent('tbl-force-retransform', {
              detail: { source: 'repeater-update', treeId: tree_id }
            }));
          } catch {
            // ignore dispatch errors
          }
        }

        return;
      }

      // Refresh silencieux pour éviter le spinner de chargement
      fetchDataRef.current({ silent: true });
    };

    window.addEventListener('tbl-repeater-updated', handleRepeaterUpdate);
    return () => {
      if (verbose()) console.log('🧹 [TBL Hook] Event listener tbl-repeater-updated détaché');
      window.removeEventListener('tbl-repeater-updated', handleRepeaterUpdate);
    };
  }, [tree_id, disabled]);

  // 🔧 FIX: Écouter tbl-force-retransform pour le refetch silencieux post-suppression
  useEffect(() => {
    if (!tree_id || disabled) return;
    const handleForceRetransform = (event: Event) => {
      const detail = (event as CustomEvent<{ treeId?: string | number; forceRemote?: boolean; silent?: boolean }>).detail || {};
      if (!detail?.treeId || String(detail.treeId) !== String(tree_id)) return;
      if (detail.forceRemote) {
        const silent = detail.silent === true;
        fetchDataRef.current({ silent });
      } else {
        // Retransform locale seulement
        retransformRef.current();
      }
    };
    window.addEventListener('tbl-force-retransform', handleForceRetransform);
    return () => window.removeEventListener('tbl-force-retransform', handleForceRetransform);
  }, [tree_id, disabled]);

  const handleNodeMetadataUpdate = useCallback((updatedNode: TreeBranchLeafNode) => {
    if (!updatedNode || !updatedNode.id) return;

    updateRawNodes(prev => {
      const idx = prev.findIndex(node => node.id === updatedNode.id);
      if (idx === -1) {
        return prev;
      }
      const next = [...prev];
      next[idx] = { ...next[idx], ...updatedNode };
      return next;
    });

    retransformRef.current();
  }, [updateRawNodes]);

  const refetch = useCallback(() => {
    fetchDataRef.current();
  }, []);

  return {
    tree,
    tabs,
    fieldsByTab,
    sectionsByTab,
    rawNodes,
    loading,
    error,
    refetch,
    retransformWithCurrentFormData,
    handleNodeMetadataUpdate
  };
};
    


