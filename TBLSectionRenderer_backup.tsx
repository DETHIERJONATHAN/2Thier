/**
 * 🏗️ TBLSectionRenderer - Rendu hiérarchique des sections TBL
 * 
 * Gère l'affichage des sections avec :
 * - Hiérarchie TreeBranchLeaf complète (sections + sous-sections)
 * - Logique conditionnelle (affichage/masquage basé sur les options)
 * - Rendu récursif des sous-sections
 * - Champs avec configuration TreeBranchLeaf avancée
 */

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { dlog as globalDlog } from '../../../../../utils/debug';
// ✅ NOUVEAU SYSTÈME : BackendValueDisplay récupère directement la valeur du backend
import { BackendValueDisplay } from './BackendValueDisplay';
import { useBatchEvaluation } from '../hooks/useBatchEvaluation';
import { 
  Card, 
  Typography, 
  Row,
  Col,
  Divider,
  Tag,
  Collapse,
  Grid,
  Button
} from 'antd';
import { 
  BranchesOutlined,
  EyeInvisibleOutlined,
  PlusOutlined,
  MinusCircleOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import TBLFieldRendererAdvanced from './TBLFieldRendererAdvanced';
import type { TBLSection, TBLField } from '../hooks/useTBLDataPrismaComplete';
import type { TBLFormData } from '../hooks/useTBLSave';
import { buildMirrorKeys } from '../utils/mirrorNormalization';
import type { RawTreeNode } from '../types';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';

declare global {
  interface Window {
    TBL_CASCADER_NODE_IDS?: Record<string, string>;
    TBL_FORCE_REFRESH?: () => void;
  }
}

const { Text } = Typography;
const { Panel } = Collapse;
const { useBreakpoint } = Grid;

// 🎯 FONCTION HELPER: Formatage des valeurs selon la configuration (depuis useTBLDataPrismaComplete)
const formatValueWithConfig = (
  value: number | string | boolean | null,
  config: { displayFormat?: string; unit?: string; precision?: number }
): string | number | boolean | null => {
  if (value === null || value === undefined) return null;

  const { displayFormat = 'number', unit, precision = 2 } = config;

  switch (displayFormat) {
    case 'currency': {
      const numValue = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(numValue)) return String(value);
      const formatted = numValue.toLocaleString('fr-FR', {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision
      });
      return unit ? `${formatted} ${unit}` : formatted;
    }
      
    case 'percentage': {
      const pctValue = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(pctValue)) return String(value);
      return `${pctValue.toFixed(precision)}%`;
    }
      
    case 'number': {
      const rawNumValue = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(rawNumValue)) return String(value);
      const numFormatted = rawNumValue.toLocaleString('fr-FR', {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision
      });
      
      // Si l'unité est €, traiter comme une devise
      if (unit === '€') {
        return `${numFormatted} €`;
      }
      
      return unit ? `${numFormatted} ${unit}` : numFormatted;
    }
      
    case 'boolean':
      return Boolean(value);
      
    default:
      return String(value);
  }
};

interface RepeaterNamespaceMeta {
  prefix: string;
  labelPrefix?: string;
  parentId: string;
  instanceIndex: number;
}

interface CloneRepeaterOptions {
  templateNodeId?: string;
  applyLabelPrefix?: boolean;
}

const namespaceRepeaterField = (
  srcField: TBLField,
  namespace: RepeaterNamespaceMeta,
  options: CloneRepeaterOptions = {}
): TBLField => {
  const applyLabelPrefix = options.applyLabelPrefix !== false;
  const cloned: TBLField = JSON.parse(JSON.stringify(srcField));

  const originalFieldId =
    (srcField as unknown as { originalFieldId?: string }).originalFieldId ||
    ((srcField as unknown as { metadata?: { originalFieldId?: string; originalNodeId?: string } }).metadata?.originalFieldId) ||
    (srcField as unknown as { repeaterTemplateNodeId?: string }).repeaterTemplateNodeId ||
    srcField.id;

  cloned.id = `${namespace.prefix}${originalFieldId}`;

  if (applyLabelPrefix && namespace.labelPrefix) {
    cloned.label = `${namespace.labelPrefix} - ${srcField.label}`;
    if (cloned.sharedReferenceName) {
      cloned.sharedReferenceName = `${namespace.labelPrefix} - ${cloned.sharedReferenceName}`;
    }
  }

  // Gestion des sharedReferenceIds
  // ⚠️ IMPORTANT: Ne PAS préfixer les sharedReferenceIds
  // Ils référencent des nœuds «raw» dans allNodes côté frontend.
  // Le resolver s'appuie sur ces IDs non-namespacés pour retrouver
  // les nœuds de référence et injecter les conditionalFields.
  // On préserve donc les IDs tels quels.

  if (cloned.config && typeof (cloned.config as Record<string, unknown>).sourceRef === 'string') {
    const rawRef = (cloned.config as Record<string, unknown>).sourceRef as string;
    const isBackendRef = (
      rawRef.startsWith('condition:') ||
      rawRef.startsWith('formula:') ||
      rawRef.startsWith('node-formula:') ||
      rawRef.startsWith('@value.') ||
      rawRef.startsWith('@table.') ||
      rawRef.startsWith('shared-ref-') ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawRef) ||
      /^node_[0-9]+_[a-z0-9]+$/i.test(rawRef)
    );
    if (!isBackendRef) {
      (cloned.config as Record<string, unknown>).sourceRef = `${namespace.prefix}${rawRef}`;
    }
  }

  // 🎯 Transformer les références des conditions pour pointer vers les champs namespacés
  if (Array.isArray(cloned.conditions)) {
    cloned.conditions = cloned.conditions.map((condition) => ({
      ...condition,
      dependsOn: `${namespace.prefix}${condition.dependsOn}`
    }));
  }

  // 🎯 NOUVEAU : Cloner et préfixer les filterConditions du tableLookupConfig
  if (cloned.tableLookupConfig && Array.isArray(cloned.tableLookupConfig.filterConditions)) {
    cloned.tableLookupConfig.filterConditions = cloned.tableLookupConfig.filterConditions.map(condition => {
      if (condition.fieldId) {
        return {
          ...condition,
          fieldId: `${namespace.prefix}${condition.fieldId}`
        };
      }
      return condition;
    });
  }

  // 🔥 CRITIQUE: Préserver le selectConfig original du champ principal pour les références partagées
  if (srcField.selectConfig) {
    cloned.selectConfig = JSON.parse(JSON.stringify(srcField.selectConfig));
  }

  // 🎯 NOUVEAU : Cloner et préfixer les conditionalFields des options pour les repeaters
  if (Array.isArray(cloned.options)) {
    
    // 🔬 ANALYSE CASCADE: Afficher le champ copié

    cloned.options = cloned.options.map((option, _optIdx) => {
      // 🔥 CORRECTION CRITIQUE: Deep clone pour préserver sharedReferenceIds
      // Le shallow copy { ...option } ne clone pas les objets imbriqués !
      const clonedOption = JSON.parse(JSON.stringify(option));

      // ⚠️ NE PAS préfixer les sharedReferenceIds - ils doivent pointer vers les nœuds originaux dans allNodes
      // Les nœuds référencés existent déjà dans allNodes avec leurs IDs d'origine
      // Le système les trouvera et créera automatiquement les champs conditionnels
      
      if (!Array.isArray(option.conditionalFields)) {
        return clonedOption;
      }
      
      clonedOption.conditionalFields = option.conditionalFields.map((cf) => {
        // 🔬 AVANT clonage
        const cfSharedRefsBefore = cf.sharedReferenceIds || cf.metadata?.sharedReferenceIds;
        
        // Appliquer le namespacing au champ conditionnel lui-même
        const namespacedCF = namespaceRepeaterField(cf, namespace, {
          applyLabelPrefix: true, // Appliquer le préfixe "Versant 1 - " etc.
          templateNodeId: (cf as any).originalFieldId || cf.id
        });
        
        // 🔬 APRÈS clonage
        const cfSharedRefsAfter = namespacedCF.sharedReferenceIds || namespacedCF.metadata?.sharedReferenceIds;
        
        if (Array.isArray(cfSharedRefsBefore) && cfSharedRefsBefore.length > 0) {
          if (!Array.isArray(cfSharedRefsAfter) || cfSharedRefsAfter.length === 0) {
            // sharedReferenceIds PERDU pendant le clonage!
          } else {
            // sharedReferenceIds préservé
          }
        }
        
        // 🔥 CRITIQUE: Préserver le selectConfig original pour les références partagées
        if (cf.selectConfig) {
          namespacedCF.selectConfig = JSON.parse(JSON.stringify(cf.selectConfig));
        }
        
        return namespacedCF;
      });
      
      return clonedOption;
    });
  }

  const originalNodeId =
    (srcField as unknown as { metadata?: { originalNodeId?: string; originalFieldId?: string } }).metadata?.originalNodeId ||
    (srcField as unknown as { metadata?: { originalFieldId?: string } }).metadata?.originalFieldId ||
    originalFieldId;

  cloned.metadata = {
    ...(cloned.metadata || {}),
    originalFieldId,
    originalNodeId
  };

  const templateNodeId =
    options.templateNodeId ||
    (srcField as unknown as { repeaterTemplateNodeId?: string }).repeaterTemplateNodeId ||
    originalFieldId;

  // 🎯 CORRECTION: namespaceRepeaterField EST UTILISÉ POUR LES REPEATERS SEULEMENT
  // Ce flag doit être TRUE pour que la logique d'injection de conditionalFields fonctionne correctement
  (cloned as unknown as Record<string, unknown>).isRepeaterInstance = true;
  (cloned as unknown as Record<string, unknown>).originalFieldId = originalFieldId;
  (cloned as unknown as Record<string, unknown>).repeaterParentId = namespace.parentId;
  (cloned as unknown as Record<string, unknown>).repeaterInstanceIndex = namespace.instanceIndex;
  (cloned as unknown as Record<string, unknown>).repeaterInstanceLabel = namespace.labelPrefix;
  (cloned as unknown as Record<string, unknown>).repeaterTemplateNodeId = templateNodeId;
  (cloned as unknown as Record<string, unknown>).repeaterNamespace = namespace;

  return cloned;
};

interface TBLSectionRendererProps {
  section: TBLSection;
  formData: TBLFormData;
  onChange: (fieldId: string, value: unknown) => void;
  treeId?: string; // ID de l'arbre TreeBranchLeaf
  allNodes?: RawTreeNode[]; // 🔥 NOUVEAU: Tous les nœuds pour Cascader
  disabled?: boolean;
  level?: number; // Niveau de profondeur pour le style
  parentConditions?: Record<string, unknown>; // Conditions héritées du parent
  isValidation?: boolean; // Mode validation (affichage des erreurs)
}

const TBLSectionRenderer: React.FC<TBLSectionRendererProps> = ({
  section,
  formData,
  onChange,
  treeId,
  allNodes = [],
  disabled = false,
  level = 0,
  parentConditions = {},
  isValidation = false
}) => {
  const { api } = useAuthenticatedApi();
  
  // 🔥 FONCTION RECURSIVE STABLE : Recherche récursive des sharedReferenceIds dans toute la hiérarchie PAR PARENTID
  const findAllSharedReferencesRecursive = useCallback((nodeId: string, allNodes: any[], visited = new Set<string>()): string[] => {
    if (visited.has(nodeId)) return [];
    visited.add(nodeId);
    
    const node = allNodes.find(n => n.id === nodeId);
    if (!node) {
      return [];
    }
    
    const sharedRefs: string[] = [];
    
    // Ajouter les sharedReferenceIds du nœud actuel
    if (Array.isArray(node.sharedReferenceIds)) {
      sharedRefs.push(...node.sharedReferenceIds);
    }
    // Fallback: considérer aussi la référence unique si présente
    if (node.sharedReferenceId && typeof node.sharedReferenceId === 'string') {
      sharedRefs.push(node.sharedReferenceId);
    }
    
    // 🎯 RECHERCHE PAR PARENTID : Trouver tous les nœuds enfants
    const childrenByParentId = allNodes.filter(n => n.parentId === nodeId);
    
    for (const child of childrenByParentId) {
      const childRefs = findAllSharedReferencesRecursive(child.id, allNodes, visited);
      sharedRefs.push(...childRefs);
    }
    
    return sharedRefs;
  }, []);

  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const formRowGutter: [number, number] = useMemo(() => [
    isMobile ? 12 : 24,
    isMobile ? 12 : 24
  ], [isMobile]);
  const dataRowGutter: [number, number] = useMemo(() => [
    isMobile ? 12 : 16,
    16
  ], [isMobile]);
  // Debug gating (localStorage.setItem('TBL_SMART_DEBUG','1'))
  const debugEnabled = useMemo(() => {
    try { return localStorage.getItem('TBL_SMART_DEBUG') === '1'; } catch { return false; }
  }, []);
  const dlog = useCallback((...args: unknown[]) => {
    if (debugEnabled) {
      globalDlog('[TBLSectionRenderer]', ...args);
    }
  }, [debugEnabled]);

  const buildConditionalFieldFromNode = useCallback((node: RawTreeNode): TBLField => {
    const finalFieldType = (node.subType || node.fieldType || node.type || 'TEXT') as string;

    const buildBaseCapability = (
      instances?: Record<string, unknown> | null,
      activeId?: string | null
    ) => {
      const hasInstances = !!instances && Object.keys(instances).length > 0;
      return {
        enabled: hasInstances,
        activeId: hasInstances && activeId ? activeId : undefined,
        instances: hasInstances ? instances : undefined,
      };
    };

    const extractActiveInstance = (
      instances?: Record<string, unknown> | null,
      activeId?: string | null
    ) => {
      if (!instances || !activeId) return undefined;
      return (instances as Record<string, unknown>)[activeId];
    };

    const formulaInstances = node.formula_instances as Record<string, unknown> | null;
    const conditionInstances = node.condition_instances as Record<string, unknown> | null;

    // 🔥 AJOUT CRITIQUE: Construire les options pour les champs CASCADE/SELECT
    let options: Array<{
      id: string;
      label: string;
      value: string;
      metadata?: any;
      conditionalFields?: TBLField[];
    }> | undefined;

    // Récupérer les children qui sont des options (leaf_option)
    const optionChildren = allNodes.filter(n => 
      n.parentId === node.id && 
      (n.type === 'leaf_option' || n.type === 'leaf_option_field')
    );

    if (optionChildren.length > 0) {
      
      options = optionChildren.map(optionNode => {

        return {
          id: optionNode.id,
          label: optionNode.option_label || optionNode.label,
          value: optionNode.value || optionNode.option_label || optionNode.label,
          metadata: optionNode.metadata, // 🔥 CRITIQUE: Inclure metadata avec sharedReferenceIds !
          conditionalFields: undefined // TODO: construire si nécessaire
        };
      });
    }

    return {
      id: node.id,
      name: (node.field_label as string) || (node.name as string) || node.label,
      label: node.label,
      type: finalFieldType,
      required: Boolean(node.isRequired),
      visible: node.isVisible !== false,
      placeholder: node.text_placeholder ?? undefined,
      description: node.description ?? undefined,
      order: typeof node.order === 'number' ? node.order : 9999,
      sharedReferenceName: node.sharedReferenceName || node.label,
      options, // 🔥 AJOUT CRITIQUE: Inclure les options construites !
      config: {
        size: node.appearance_size ?? undefined,
        width: node.appearance_width ?? undefined,
        variant: node.appearance_variant ?? undefined,
        minLength: node.text_minLength ?? undefined,
        maxLength: node.text_maxLength ?? undefined,
        rows: node.text_rows ?? undefined,
        mask: node.text_mask ?? undefined,
        regex: node.text_regex ?? undefined,
        textDefaultValue: node.text_defaultValue ?? undefined,
        min: node.number_min ?? undefined,
        max: node.number_max ?? undefined,
        step: node.number_step ?? undefined,
        decimals: node.number_decimals ?? undefined,
        prefix: node.number_prefix ?? undefined,
        suffix: node.number_suffix ?? undefined,
        unit: node.number_unit ?? undefined,
        numberDefaultValue: node.number_defaultValue ?? undefined,
        format: node.date_format ?? undefined,
        showTime: node.date_showTime ?? undefined,
        dateDefaultValue: node.date_defaultValue ?? undefined,
        minDate: node.date_minDate ?? undefined,
        maxDate: node.date_max ?? undefined,
        multiple: node.select_multiple ?? undefined,
        searchable: node.select_searchable ?? undefined,
        allowClear: node.select_allowClear ?? undefined,
        selectDefaultValue: node.select_defaultValue ?? undefined,
        trueLabel: node.bool_trueLabel ?? undefined,
        falseLabel: node.bool_falseLabel ?? undefined,
        boolDefaultValue: node.bool_defaultValue ?? undefined,
      },
      capabilities: {
        data: buildBaseCapability(node.data_instances as Record<string, unknown> | null, node.data_activeId as string | null),
        formula: {
          ...buildBaseCapability(formulaInstances, node.formula_activeId as string | null),
          currentFormula: extractActiveInstance(formulaInstances, node.formula_activeId as string | null) as unknown,
        },
        condition: {
          ...buildBaseCapability(conditionInstances, node.condition_activeId as string | null),
          currentConditions: extractActiveInstance(conditionInstances, node.condition_activeId as string | null) as unknown,
        },
        table: buildBaseCapability(node.table_instances as Record<string, unknown> | null, node.table_activeId as string | null),
        api: buildBaseCapability(node.api_instances as Record<string, unknown> | null, node.api_activeId as string | null),
        link: buildBaseCapability(node.link_instances as Record<string, unknown> | null, node.link_activeId as string | null),
        markers: buildBaseCapability(node.markers_instances as Record<string, unknown> | null, node.markers_activeId as string | null),
      },
    } as TBLField;
  }, [allNodes]);

  // Cache de logs pour éviter répétitions massives
  const lastInjectionHashRef = useRef<string>('');
  // Section structure log (gated)
  
  // 🎯 Vérifier si cette section doit être affichée selon les conditions
  const isVisible = useMemo(() => {
    if (!section.conditions) return true;

    const { dependsOn, showWhen, operator = 'equals' } = section.conditions;
    if (!dependsOn) return true;

    const dependentValue = formData[dependsOn];
    
    switch (operator) {
      case 'equals':
        return dependentValue === showWhen;
      case 'not_equals':
        return dependentValue !== showWhen;
      case 'contains':
        return String(dependentValue || '').includes(String(showWhen));
      case 'exists':
        return dependentValue !== undefined && dependentValue !== null && dependentValue !== '';
      default:
        return true;
    }
  }, [section.conditions, formData]);

  // 🔄 Réorganiser l'ordre des champs selon les conditions + injection des champs conditionnels + DÉPLOIEMENT DES REPEATERS
  const orderedFields = useMemo(() => {
    const fields = [...section.fields];
    const finalFields: TBLField[] = [];
    let nextOrder = 0;
    
    console.log('🔍 [TREE ORDER PROCESSING] Début traitement ordre arbre:', {
      totalFields: fields.length,
      sectionName: section.title,
      fieldIds: fields.map(f => f.id)
    });
    
    // 🎯 NOUVELLE LOGIQUE: Traiter chaque champ à sa position dans l'arbre
    // Respecter l'ordre original des champs et traiter selon le type
    fields.forEach(field => {
      const isRepeater = (
        field.type === 'leaf_repeater' || 
        field.type === 'LEAF_REPEATER' ||
        (field as any).fieldType === 'leaf_repeater' ||
        (field as any).fieldType === 'LEAF_REPEATER' ||
        (field.metadata && typeof field.metadata === 'object' && 'repeater' in field.metadata)
      );
      
      const getCopySignature = (field: TBLField): string | null => {
        const label = field.label || '';
        const copyMatch = label.match(/\(Copie (\d+)\)/);
        return copyMatch ? `Copie ${copyMatch[1]}` : null;
      };
      
      const copySignature = getCopySignature(field);

      // 🎯 CHAMP NORMAL : traiter à sa position dans l'arbre
      finalFields.push({ 
        ...field, 
        order: nextOrder
      });
      nextOrder++;
    });
    
    console.log('🎯 [TREE ORDER RESULT] Traitement terminé:', {
      totalProcessed: finalFields.length,
      fieldOrder: finalFields.map(f => ({ id: f.id, label: f.label, order: f.order }))
    });
    
    return finalFields;
  }, [section.fields, formData, allNodes, buildConditionalFieldFromNode, namespaceRepeaterField]);

  // 🔗 ÉTAPE 2: Filtrer les champs basés sur la visibilité conditionnelle du cascader
  // Si un cascader est sélectionné, afficher UNIQUEMENT les champs dont sharedReferenceId correspond
  // 🔥 LOG BRUTAL: Afficher TOUS les champs de cette section pour déboguer
  if (orderedFields.length > 0) {
    const fieldDetails = orderedFields.map(f => ({
      label: f.label,
      type: f.type,
      isConditional: (f as any).isConditional,
      parentFieldId: (f as any).parentFieldId,
      hasSharedRefId: !!(f.sharedReferenceId || (f as any).sharedReferenceIds),
      order: f.order
    }));
    console.log(`🚨🚨🚨 [ULTRA DEBUG] ORDEREDFIELDS Section "${section.title}" (${section.sectionName}): ${orderedFields.length} champs`, fieldDetails);
    
    // Log spécifique pour les champs conditionnels
    const conditionalFields = orderedFields.filter(f => (f as any).isConditional);
    if (conditionalFields.length > 0) {
      console.log(`🚨🚨🚨 [ULTRA DEBUG] CHAMPS CONDITIONNELS trouvés dans orderedFields:`, {
        nbChamps: conditionalFields.length,
        details: conditionalFields.map(cf => ({
          id: cf.id,
          label: cf.label,
          order: cf.order,
          parentFieldId: (cf as any).parentFieldId,
          parentOptionValue: (cf as any).parentOptionValue
        }))
      });
    }
  }

  // ℹ️ NOTE: Les champs conditionnels sont DÉJÀ gérés par la logique existante
  // dans les cascaders et repeaters. Le système injecte automatiquement les
  // conditionalFields dans finalFields quand une option est sélectionnée.
  // On ne doit pas les filtrer à nouveau ici.
  const visibilityFilteredFields = useMemo(() => {
    console.log('🚨🚨🚨 [ULTRA DEBUG] VISIBILITYFILTERED - Entrée:', {
      section: section.title,
      nbOrderedFields: orderedFields.length,
      orderedFieldsConditionnels: orderedFields.filter(f => (f as any).isConditional).length
    });
    
    // Pour l'instant, on retourne tous les champs sans filtre 
    // pour voir si l'injection fonctionne. Les champs conditionnels
    // sont censés être automatiquement visibles quand injectés.
    const result = orderedFields;
    
    // LOG DÉTAILLÉ pour champs conditionnels injectés
    orderedFields.forEach(field => {
      if ((field as any).isConditional) {
        console.log(`🔍🔍🔍 [CONDITIONAL FIELD DEBUG]`, {
          fieldId: field.id,
          fieldLabel: field.label,
          isConditional: (field as any).isConditional,
          fieldType: field.type,
          parentFieldId: (field as any).parentFieldId,
          parentOptionValue: (field as any).parentOptionValue,
          sharedReferenceId: field.sharedReferenceId
        });
      }
    });
    
    console.log(`🚨🚨🚨 [ULTRA DEBUG] VISIBILITYFILTERED - Sortie: ${result.length} champs`);
    
    return result;
  }, [orderedFields]);

  // ℹ️ NOTE: Le contenu peut être filtré selon les règles de visibilité
  // et les dépendances cascader. Cette logique est pour l'instant simplifiée.
  const filteredFields = useMemo(() => {
    console.log('��� [ULTRA DEBUG] FILTEREDFIELDS - Entrée:', {
      section: section.title,
      nbVisibilityFiltered: visibilityFilteredFields.length,
      conditionnelsVisible: visibilityFilteredFields.filter(f => (f as any).isConditional).length
    });

    const result = visibilityFilteredFields;
    
    console.log('🚨🚨🚨 [ULTRA DEBUG] FILTEREDFIELDS - Sortie:', {
      section: section.title,
      nbResultFields: result.length,
      resultFieldsConditionnels: result.filter(f => (f as any).isConditional).length,
      detailsChamps: result.map(f => ({
        id: f.id,
        label: f.label,
        order: f.order,
        isConditional: (f as any).isConditional
      }))
    });
    
    return result;
  }, [orderedFields, section.title]);

  // 🎨 Déterminer le style selon le niveau
  const getSectionStyle = () => {
    switch (level) {
      case 0: // Section principale
        return {
          marginBottom: '24px',
          border: '1px solid #d9d9d9',
          borderRadius: '8px'
        };
      case 1: // Sous-section
        return {
          marginBottom: '16px',
          border: '1px solid #f0f0f0',
          borderRadius: '6px',
          backgroundColor: '#fafafa'
        };
      case 2: // Sous-sous-section
        return {
          marginBottom: '12px',
          border: '1px solid #f5f5f5',
          borderRadius: '4px',
          backgroundColor: '#fdfdfd'
        };
      default:
        return {
          marginBottom: '8px',
          padding: '8px',
          backgroundColor: '#f9f9f9',
          borderRadius: '4px'
        };
    }
  };

  // 🎯 Cas spécial : si la section est une navigation et n'a qu'une subsection,
  // rendre directement la subsection sans wrapper supplémentaire
  if (isNavigationSection && section.subsections?.length === 1 && (!section.fields || section.fields.length === 0)) {
    return (
      <TBLSectionRenderer
        key={section.subsections[0].id}
        section={section.subsections[0]}
        level={level}
        formData={formData}
        onFormChange={onFormChange}
        allNodes={allNodes}
        buildConditionalFieldFromNode={buildConditionalFieldFromNode}
        namespaceRepeaterField={namespaceRepeaterField}
        findAllSharedReferencesRecursive={findAllSharedReferencesRecursive}
        onRepeaterChange={onRepeaterChange}
        debug={debug}
      />
    );
  }

  // 🎯 Cas spécial : section de navigation avec title qui décrit ses sous-sections
  if (isNavigationSection && level === 0) {
    return (
      <div style={getSectionStyle()}>
        <Card
          size="default"
          className={`tbl-navigation-section`}
        >
          <Card.Meta
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: '600' }}>{section.title}</span>
                {section.description && (
                  <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal' }}>
                    {section.description}
                  </span>
                )}
              </div>
            }
          />
          <div style={{ marginTop: '16px' }}>
            {section.subsections?.map((subsection) => (
              <TBLSectionRenderer
                key={subsection.id}
                section={subsection}
                level={level + 1}
                formData={formData}
                onFormChange={onFormChange}
                allNodes={allNodes}
                buildConditionalFieldFromNode={buildConditionalFieldFromNode}
                namespaceRepeaterField={namespaceRepeaterField}
                findAllSharedReferencesRecursive={findAllSharedReferencesRecursive}
                onRepeaterChange={onRepeaterChange}
                debug={debug}
              />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={getSectionStyle()}>
      <Card
        size={level === 0 ? 'default' : 'small'}
        className={`tbl-section-level-${level}`}
      >
        {level > 0 && (
          <div className="mb-4">
            {/* Style spécial pour section "Données" */}
            {section.title === 'Données' || section.title.includes('Données') ? (
              <div 
                style={{
                  background: 'linear-gradient(135deg, #14b8a6 0%, #0891b2 100%)',
                  color: 'white',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}
              >
                <Text strong style={{ color: 'white', fontSize: '16px' }}>
                  {section.title}
                </Text>
              </div>
            ) : (
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Title level={level + 2} style={{ margin: 0, color: '#1890ff' }}>
                      {section.title}
                    </Title>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Champs de cette section */}
        {filteredFields.length > 0 && (
          <div className="space-y-4">
            {filteredFields.map((field) => (
              <div key={field.id} className="mb-4">
                <TBLFieldRenderer
                  field={field}
                  value={formData[field.id]}
                  onChange={(value) => onFormChange(field.id, value)}
                  allNodes={allNodes}
                  buildConditionalFieldFromNode={buildConditionalFieldFromNode}
                  namespaceRepeaterField={namespaceRepeaterField}
                  findAllSharedReferencesRecursive={findAllSharedReferencesRecursive}
                  onRepeaterChange={onRepeaterChange}
                  debug={debug}
                />
              </div>
            ))}
          </div>
        )}

        {/* Sous-sections */}
        {section.subsections && section.subsections.length > 0 && (
          <div className="mt-6 space-y-4">
            {section.subsections.map((subsection) => (
              <TBLSectionRenderer
                key={subsection.id}
                section={subsection}
                level={level + 1}
                formData={formData}
                onFormChange={onFormChange}
                allNodes={allNodes}
                buildConditionalFieldFromNode={buildConditionalFieldFromNode}
                namespaceRepeaterField={namespaceRepeaterField}
                findAllSharedReferencesRecursive={findAllSharedReferencesRecursive}
                onRepeaterChange={onRepeaterChange}
                debug={debug}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
          const expanded: string[] = [];
          ids.forEach(id => {
            const node = getNodeById(id);
            if (!node) return;

            if (isFieldNode(node)) {
              expanded.push(id);
            } else {
              const descendants = getDescendantFieldNodes(id);
              descendants.forEach(d => {
                expanded.push(d.id);
                // Inclure les champs conditionnels et partagés des descendants
                if (d.conditionalFields) {
                  d.conditionalFields.forEach(cf => expanded.push(cf.id));
                }
                if (d.sharedReferenceIds) {
                  d.sharedReferenceIds.forEach(sharedId => expanded.push(sharedId));
                }
                // Fallback: inclure la référence unique dans l'expansion
                if (d.sharedReferenceId && typeof d.sharedReferenceId === 'string') {
                  expanded.push(d.sharedReferenceId);
                }
                // Inclure les configurations spécifiques comme "mesure simple"
                if (d.config && d.config.sourceRef) {
                  expanded.push(d.config.sourceRef);
                }
              });
            }
          });
          return Array.from(new Set(expanded));
        };

        // 🎯 RÉCUPÉRER L'ORDRE DES TEMPLATES DEPUIS L'ARBRE COPIÉ (CODE DUPLIQUÉ - À OPTIMISER)
        const getTemplateNodeIdsInTreeOrder = (templateNodeIds: string[]) => {
          if (!allNodes || allNodes.length === 0) {
            return templateNodeIds;
          }
          
          const repeaterNode = allNodes.find(n => n.id === field.id);
          if (!repeaterNode || !repeaterNode.children) {
            return templateNodeIds;
          }
          
          const orderedIds: string[] = [];
          repeaterNode.children.forEach(child => {
            if (child.config?.sourceRef && templateNodeIds.includes(child.config.sourceRef)) {
              orderedIds.push(child.config.sourceRef);
            } else if (templateNodeIds.includes(child.id)) {
              orderedIds.push(child.id);
            }
          });
          
          templateNodeIds.forEach(id => {
            if (!orderedIds.includes(id)) {
              orderedIds.push(id);
            }
          });
          
          return orderedIds;
        };

        const templateNodeIds = getTemplateNodeIdsInTreeOrder(expandTemplateNodeIds(templateNodeIdsRaw));
        // 🎯 CORRECTION : Utiliser le label du champ (ex: "Versant", "Toiture") pour le bouton
        const repeaterLabel = field.label || field.name || 'Entrée';
        
        // 🚀 PRIORITÉ AUX COLONNES : Lire les colonnes Prisma en priorité, puis fallback sur metadata
        const buttonSize = (field as any).repeater_buttonSize || repeaterMetadata?.buttonSize || 'middle';
        const buttonWidth = (field as any).repeater_buttonWidth || repeaterMetadata?.buttonWidth || 'auto';
        const iconOnly = (field as any).repeater_iconOnly ?? repeaterMetadata?.iconOnly ?? false;
        const maxItems = (field as any).repeater_maxItems ?? repeaterMetadata?.maxItems ?? null;
        
        // Récupérer le nombre d'instances depuis formData (clé spéciale)
        const instanceCountKey = `${field.id}_instanceCount`;
        // 🎯 Commencer à 0 instances - l'utilisateur doit cliquer sur "Ajouter" pour en créer
        const instanceCount = (formData[instanceCountKey] as number) ?? 0;
        
        // Récupérer les labels des champs template - chercher dans TOUTES les sections récursivement
        const findFieldInAllSections = (sections: TBLSection[], fieldId: string): TBLField | undefined => {
          for (const sec of sections) {
            // Chercher dans les champs de cette section
            const found = sec.fields?.find(f => f.id === fieldId);
            if (found) return found;
            
            // Chercher récursivement dans les sous-sections
            if (sec.subsections && sec.subsections.length > 0) {
              const foundInSub = findFieldInAllSections(sec.subsections, fieldId);
              if (foundInSub) return foundInSub;
            }
          }
          return undefined;
        };

        // Traiter les champs selon l'ordre de l'arbre
        orderPreservingTreeFields.forEach(field => {
          const copySignature = getCopySignature(field);
          
          finalFields.push({ 
            ...field, 
            order: nextOrder
          });
          nextOrder++;
        });
      } else {
        // Pas d'arbre disponible, traitement classique
        section.fields.forEach(field => {
          const copySignature = getCopySignature(field);
          
          finalFields.push({ 
            ...field, 
            order: nextOrder
          });
          nextOrder++;
        });
    });

    console.log('🎯 [TREE ORDER RESULT] Traitement terminé:', {
      totalProcessed: finalFields.length,
      fieldOrder: finalFields.map(f => ({ id: f.id, label: f.label, order: f.order }))
    });
    
    return finalFields;
  }, [section.fields, formData, allNodes, buildConditionalFieldFromNode, namespaceRepeaterField]);

  // 🔗 ÉTAPE 2: Filtrer les champs basés sur la visibilité conditionnelle du cascader
              }
            }

            if (templateField) {
              const namespaced = namespaceRepeaterField(
                templateField,
                namespaceMeta,
                { templateNodeId: templateNodeId }
              );
              // Attacher métadonnées repeater pour gestion ultérieure
              (namespaced as any).repeaterParentId = field.id;
              (namespaced as any).repeaterInstanceIndex = i;
              (namespaced as any).repeaterTemplateNodeId = templateNodeId;

              // 🔥 DEBUG: Tracer la création d'instance pour ce repeater
              if (field.id === '10724c29-a717-4650-adf3-0ea6633f64f1') {
                console.log('🔥🔥🔥 [INSTANCE CREATED] Instance créée:', {
                  originalTemplateId: templateNodeId,
                  originalTemplateLabel: templateField.label,
                  namespacedId: namespaced.id,
                  namespacedLabel: namespaced.label,
                  repeaterParentId: field.id,
                  instanceIndex: i,
                  finalFieldWillBeAdded: true
                });
              }
              (namespaced as any).repeaterInstanceLabel = instanceLabelPrefix;
              (namespaced as any).repeaterNamespace = namespaceMeta;
              

              // 🔗 CORRECTION: Traiter les sharedReferenceIds des enfants du cascader
              // Les références partagées peuvent être:
              // 1. Directement sur l'option
              // 2. Sur les enfants de l'option (ex: "Mesure simple" a les sharedReferenceIds)
              if (Array.isArray(namespaced.options)) {
                namespaced.options = namespaced.options.map(opt => {
                  // 🔥 NOUVEAU: Chercher les références partagées aussi dans les enfants de l'option
                  // Trouver le nœud RawTreeNode correspondant à cette option
                  const optionRawNode = allNodes?.find(n => n.id === opt.id);
                  let sharedRefIds: string[] = [];
                  
                  if (optionRawNode) {
                    // 🔥 NOUVEAU: Utiliser la recherche récursive infinie pour trouver TOUTES les références dans l'arborescence
                    sharedRefIds = findAllSharedReferencesRecursive(optionRawNode.id, allNodes || []);
                  } else {
                    // Fallback: chercher dans les propriétés directes
                    const metaIds = Array.isArray(opt.metadata?.sharedReferenceIds) ? opt.metadata!.sharedReferenceIds : [];
                    const metaSingle = typeof opt.metadata?.sharedReferenceId === 'string' ? [opt.metadata!.sharedReferenceId] : [];
                    const topIds = Array.isArray((opt as any).sharedReferenceIds) ? (opt as any).sharedReferenceIds : [];
                    const topSingle = typeof (opt as any).sharedReferenceId === 'string' ? [(opt as any).sharedReferenceId] : [];
                    sharedRefIds = [...metaIds, ...metaSingle, ...topIds, ...topSingle];
                  }
                  
                  if (Array.isArray(sharedRefIds) && sharedRefIds.length > 0) {
                    
                    // Initialiser conditionalFields si absent
                    if (!Array.isArray(opt.conditionalFields)) {
                      opt.conditionalFields = [];
                    }
                    
                    // Pour chaque sharedReferenceId, cloner et namespace le champ
                    sharedRefIds.forEach((refId) => {
                      const refNode = allNodes?.find(n => n.id === refId);
                      if (!refNode) {
                        return;
                      }
                      
                      // Vérifier si déjà présent
                      const alreadyExists = opt.conditionalFields?.some(cf => cf.id === refId || cf.id === `${namespaceMeta.prefix}${refId}`);
                      if (alreadyExists) {
                        return;
                      }
                      
                      // Construire, namespace et ajouter
                      const refField = buildConditionalFieldFromNode(refNode);
                      const namespacedRef = namespaceRepeaterField(refField, namespaceMeta, {
                        applyLabelPrefix: true,
                        templateNodeId: refId
                      });
                      
                      opt.conditionalFields?.push(namespacedRef);
                    });
                  } else if (Array.isArray(opt.conditionalFields) && opt.conditionalFields.length > 0) {
                    // Les options ont des conditionalFields mais pas de sharedReferenceIds
                    // On doit cloner et namespace ces conditionalFields
                    
                    opt.conditionalFields = opt.conditionalFields.map(condField => {
                      const namespacedCondField = namespaceRepeaterField(condField, namespaceMeta, {
                        applyLabelPrefix: true,
                        templateNodeId: condField.id
                      });
                      return namespacedCondField;
                    });
                  }
                  
                  return opt;
                });
              }
              
              namespaced.order = nextOrder;
              
              // 🔍 DEBUG : Vérifier les options après modification
              
              // 🔥 DEBUG: Confirmer l'ajout final pour ce repeater
              if (field.id === '10724c29-a717-4650-adf3-0ea6633f64f1') {
                console.log('🔥🔥🔥 [FIELD ADDED TO FINAL] Champ ajouté aux finalFields:', {
                  namespacedId: namespaced.id,
                  namespacedLabel: namespaced.label,
                  order: nextOrder,
                  finalFieldsCountBefore: finalFields.length
                });
              }
              
              finalFields.push(namespaced);
              
              // 🔍 DEBUG ORDER: Vérifier l'ordre assigné
              console.log('🎯 [ORDER DEBUG] Champ ajouté:', {
                id: namespaced.id,
                label: namespaced.label,
                order: namespaced.order,
                instance: i,
                template: templateNodeId
              });
            } else {
              // Ultime fallback minimaliste pour ne rien casser
              const instanceField: TBLField = {
                id: `${field.id}_${i}_${templateNodeId}`,
                label: `${repeaterLabel} ${i + 1} - ${templateLabel}`,
                type: 'TEXT',
                required: false,
                visible: true,
                order: nextOrder,
                sharedReferenceName: `${repeaterLabel} ${i + 1} - ${templateLabel}`
              } as unknown as TBLField & { isRepeaterInstance?: boolean };
              (instanceField as any).isRepeaterInstance = true;
              (instanceField as any).repeaterParentId = field.id;
              (instanceField as any).repeaterInstanceIndex = i;
              (instanceField as any).repeaterTemplateNodeId = templateNodeId;
              (instanceField as any).repeaterInstanceLabel = `${repeaterLabel} ${i + 1}`;
              (instanceField as any).originalFieldId = templateNodeId;
              (instanceField as any).metadata = {
                originalFieldId: templateNodeId,
                originalNodeId: templateNodeId,
              };
              (instanceField as any).repeaterNamespace = namespaceMeta;
              finalFields.push(instanceField);
            }
            nextOrder++;
          });
          
          // Ajouter un bouton de suppression pour cette instance spécifique
          // 🎯 Permettre la suppression dès qu'il y a au moins 1 instance
          if (instanceCount > 0) {
            const removeInstanceButtonField: TBLField = {
              ...field,
              id: `${field.id}_removeInstance_${i}`,
              type: 'REPEATER_REMOVE_INSTANCE_BUTTON' as any,
              label: `Supprimer ${repeaterLabel} ${i + 1}`,
              order: nextOrder,
              isRepeaterButton: true,
              repeaterParentId: field.id,
              repeaterInstanceIndex: i,
              repeaterInstanceCount: instanceCount
            } as TBLField & { isRepeaterButton?: boolean; repeaterParentId?: string; repeaterInstanceIndex?: number; repeaterInstanceCount?: number };
            
            finalFields.push(removeInstanceButtonField);
            nextOrder++;
          }
        }
        
        // Ajouter un champ spécial "bouton +" qui sera rendu différemment
        // 🎯 PRIORITÉ : 1) addButtonLabel custom, 2) "Ajouter [NomDuChamp]", 3) "Ajouter une entrée"
        const buttonLabel = (field as any).repeater_addButtonLabel 
          || repeaterMetadata?.addButtonLabel 
          || (repeaterLabel && repeaterLabel !== 'Entrée' ? `Ajouter ${repeaterLabel}` : 'Ajouter une entrée');
        
        // 🔍 DEBUG : Afficher les informations du repeater
        
        const addButtonField: TBLField = {
          ...field,
          // 💣 CORRECTION : Ne pas écraser les propriétés déjà présentes sur `field`
          // On s'assure que `repeater_buttonSize` etc. sont conservés.
          id: `${field.id}_addButton`,
          type: 'REPEATER_ADD_BUTTON' as any,
          label: buttonLabel,
          order: nextOrder,
          isRepeaterButton: true,
          repeaterParentId: field.id,
          repeaterCanAdd: !maxItems || instanceCount < maxItems,
          repeaterInstanceCount: instanceCount,
          // On passe directement les valeurs calculées pour que le rendu les utilise
          repeaterButtonSize: buttonSize,
          repeaterButtonWidth: buttonWidth,
          repeaterIconOnly: iconOnly
        } as TBLField & { isRepeaterButton?: boolean; repeaterParentId?: string; repeaterCanAdd?: boolean; repeaterInstanceCount?: number; repeaterButtonSize?: string; repeaterButtonWidth?: string; repeaterIconOnly?: boolean };
        
        finalFields.push(addButtonField);
        nextOrder++;
      }
    });

    console.log('✅ [ORDER FINALIZATION] Finalisation ordre des champs:', {
      totalFields: finalFields.length,
      fieldIds: finalFields.map(f => f.id)
    });
    
    // 🎯 DÉDUPLICATION: Supprimer les doublons (même id) en gardant le dernier ajouté
    const uniqueFields = finalFields.reduce((acc, field) => {
      const existingIndex = acc.findIndex(f => f.id === field.id);
      if (existingIndex >= 0) {
        // Remplacer l'existing par le nouveau
        acc[existingIndex] = field;
      } else {
        // Nouveau champ
        acc.push(field);
      }
      return acc;
    }, [] as typeof finalFields);
    
    // 🎯 CORRECTION: Ne pas trier pour préserver l'ordre des repeaters
    // Les champs sont déjà dans le bon ordre car ajoutés séquentiellement avec nextOrder
    return uniqueFields;
        // Champ conditionnel : vérifier s'il doit être affiché
        const condition = field.conditions[0];
        const dependentValue = formData[condition.dependsOn];
        
        let isConditionMet = false;
        switch (condition.operator) {
          case 'equals':
            isConditionMet = dependentValue === condition.showWhen;
            break;
          case 'not_equals':
            isConditionMet = dependentValue !== condition.showWhen;
            break;
          default:
            isConditionMet = true;
        }
        
        if (isConditionMet) {
          // Si la condition est remplie, l'ajouter à la position suivante
          // 🔥 CRITICAL FIX: Préserver les propriétés personnalisées comme isConditional
          finalFields.push({ 
            ...field, 
            order: nextOrder,
            // Préserver les propriétés personnalisées qui peuvent avoir été ajoutées
            ...(field as any).isConditional && { isConditional: (field as any).isConditional },
            ...(field as any).parentFieldId && { parentFieldId: (field as any).parentFieldId },
            ...(field as any).parentOptionValue && { parentOptionValue: (field as any).parentOptionValue },
            ...(field as any).namespace && { namespace: (field as any).namespace }
          });
          nextOrder++;
        }
        // Si condition non remplie, on l'ignore dans le rendu
      } else {
        // Champ normal : toujours l'ajouter à la position suivante disponible
        // 🔥 CRITICAL FIX: Préserver les propriétés personnalisées comme isConditional
        finalFields.push({ 
          ...field, 
          order: nextOrder,
          // Préserver les propriétés personnalisées qui peuvent avoir été ajoutées
          ...(field as any).isConditional && { isConditional: (field as any).isConditional },
          ...(field as any).parentFieldId && { parentFieldId: (field as any).parentFieldId },
          ...(field as any).parentOptionValue && { parentOptionValue: (field as any).parentOptionValue },
          ...(field as any).namespace && { namespace: (field as any).namespace }
        });
        nextOrder++;
        
        // 🎯 INJECTER LES CHAMPS CONDITIONNELS juste après le champ select/radio
        // 🔧 CORRECTION: Détecter SELECT même si isSelect pas défini (basé sur field.options)
        // 🔥 NOUVEAU: Aussi détecter CASCADE même sans options (pour les copies clonées)
        const isSelectField = field.isSelect || Array.isArray(field.options);
        const isCascadeWithoutOptions = field.type === 'cascade' && (!field.options || field.options.length === 0);
        

        
        if ((isSelectField && field.options) || (isCascadeWithoutOptions)) {
          let rawSelectedValue = formData[field.id];
          
          // 🔥 FIX CRITICAL: Pour les champs namespacés (repeater), essayer aussi l'ID original comme fallback
          if (rawSelectedValue === undefined && field.id.includes('_0_')) {
            const originalId = field.id.split('_0_')[1]; // Extraire l'ID original après le namespace
            rawSelectedValue = formData[originalId];
          }
          
          // 🔧 CORRECTION: Normaliser les valeurs undefined pour éviter les problèmes de comparaison
          const selectedValue = rawSelectedValue === "undefined" ? undefined : rawSelectedValue;
          
          // 🎯 LOGS CIBLÉS VERSANT 1
          const isVersantField = field.label?.includes('Versant') || field.id?.includes('versant') || field.label?.toLowerCase().includes('versant');
          
          // 🚨 DEBUG CRITIQUE: Analyser le formData pour ce champ
          console.log('🔍 [FORM DATA DEBUG] Recherche de valeur pour field:', {
            fieldId: field.id,
            fieldLabel: field.label,
            rawSelectedValue,
            selectedValue,
            fieldType: field.type,
            fieldSubType: (field as any).subType,
            fieldFieldType: (field as any).fieldType,
            isRepeaterInstance: (field as any).isRepeaterInstance,
            repeaterParentId: (field as any).repeaterParentId,
            originalFieldId: (field as any).originalFieldId,
            formDataKeys: Object.keys(formData).filter(k => k.includes(field.id) || k.includes(field.id.split('_')[2] || '')),
            formDataSample: Object.fromEntries(
              Object.entries(formData).filter(([k]) => 
                k.includes(field.id) || k.includes(field.id.split('_')[2] || '') || k.includes('node_1757366229569')
              )
            )
          });

          if (isVersantField) {
            console.log('🎯🎯🎯 [VERSANT DEBUG] Champ Versant détecté:', {
              fieldId: field.id,
              fieldLabel: field.label,
              fieldType: field.type,
              fieldSubType: (field as any).subType,
              fieldFieldType: (field as any).fieldType,
              selectedValue,
              rawSelectedValue,
              isRepeaterInstance: (field as any).isRepeaterInstance,
              repeaterParentId: (field as any).repeaterParentId,
              originalFieldId: (field as any).originalFieldId,
              isOriginalRepeater: field.id === '10724c29-a717-4650-adf3-0ea6633f64f1',
              isCopiedRepeater: field.id === 'e207d8bf-6a6f-414c-94ed-ff6e47096915',
              isTemplate: field.id === '3f0f3de7-9bc4-4fca-b39e-52e1ce9530af',
              allFormDataKeys: Object.keys(formData),
              relevantFormDataEntries: Object.entries(formData).filter(([key]) => 
                key.includes('versant') || key.includes('Versant') || key.toLowerCase().includes(field.id?.toLowerCase() || '') ||
                key.includes('f3a380cd-9a66-49cf-b03a-365d174496d4') || // ID du champ Type visible dans les logs
                key.includes('10724c29') || key.includes('e207d8bf') || key.includes('3f0f3de7')
              ),
              fieldOptions: field.options || [],
              hasSharedReference: field.sharedReferenceId || field.sharedReferenceIds
            });
          }
          
          // Le système d'injection conditionnelle est entièrement dynamique
          // Il gère automatiquement l'affichage des champs basé sur les sélections utilisateur

          // Chercher l'option sélectionnée qui a des champs conditionnels
          console.log('\n��� [ULTRA DEBUG] ========== DÉBUT INJECTION CONDITIONNELS ==========');
          console.log('��� [ULTRA DEBUG] Champ détecté pour injection:', {
            fieldId: field.id,
            fieldLabel: field.label,
            fieldType: field.type,
            isSelectField,
            isCascadeWithoutOptions,
            hasOptions: Array.isArray(field.options),
            optionsCount: field.options?.length || 0,
            rawSelectedValue,
            selectedValue,
            typeRaw: typeof rawSelectedValue,
            typeNormalized: typeof selectedValue,
            formDataKeys: Object.keys(formData).filter(k => k.includes(field.id.split('_')[0]))
          });

          // 🔥 DEBUG spécifique pour la copie du champ Versant
          if (field.id === 'e207d8bf-6a6f-414c-94ed-ffde47096915') {
            console.log('🔥🔥🔥 [COPIE VERSANT DEBUG] Champ copié spécifique détecté:', {
              fieldId: field.id,
              fieldLabel: field.label,
              fieldType: field.type,
              selectedValue,
              rawSelectedValue,
              willProceedWithInjection: selectedValue !== undefined && selectedValue !== null,
              optionsCount: field.options?.length || 0,
              hasSharedReference: field.sharedReferenceId || field.sharedReferenceIds,
              formDataCheck: Object.keys(formData).filter(k => k.includes(field.id)),
              fieldOptions: field.options?.map(opt => ({ label: opt.label, value: opt.value }))
            });
          }

          // 🔥 DEBUG spécifique pour les instances copiées du repeater (format namespacé)
          if (field.id && field.id.includes('10724c29-a717-4650-adf3-0ea6633f64f1_')) {
            console.log('🔥🔥🔥 [REPEATER INSTANCE DEBUG] Instance copiée détectée:', {
              fieldId: field.id,
              fieldLabel: field.label,
              fieldType: field.type,
              selectedValue,
              rawSelectedValue,
              isVersantInstance: field.id.includes('3f0f3de7-9bc4-4fca-b39e-52e1ce9530af'),
              instanceNumber: field.id.split('_')[1],
              templateId: field.id.split('_')[2],
              willProceedWithInjection: selectedValue !== undefined && selectedValue !== null,
              optionsCount: field.options?.length || 0,
              formDataCheck: Object.keys(formData).filter(k => k.includes(field.id))
            });
          }

          // 🎯 LOG SPÉCIAL VERSANT
          if (isVersantField) {
            console.log('🎯🎯🎯 [VERSANT INJECTION] Analyse injection pour champ Versant:', {
              fieldId: field.id,
              fieldLabel: field.label,
              selectedValue,
              willProceedWithInjection: selectedValue !== undefined && selectedValue !== null,
              optionsAvailable: field.options?.length || 0,
              isTemplate: field.id === '3f0f3de7-9bc4-4fca-b39e-52e1ce9530af',
              isInstance: field.id.includes('10724c29-a717-4650-adf3-0ea6633f64f1_'),
              optionsDetail: field.options?.map(opt => ({
                label: opt.label,
                value: opt.value,
                hasConditionals: opt.conditionalFields?.length > 0,
                hasSharedRefs: opt.sharedReferenceId || opt.sharedReferenceIds
              }))
            });
          }
          

          // Chercher l'option sélectionnée qui a des champs conditionnels
          // Normalisation forte: tout en string sauf null/undefined
          const norm = (v: unknown) => (v === null || v === undefined ? v : String(v));
          const selectedNorm = norm(selectedValue);
          
          // 🔥 LOG CRITIQUE: Vérifier l'état de field.options AVANT recherche
          console.log('��� [ULTRA DEBUG] État field.options au moment de la sélection:', {
            fieldId: field.id,
            fieldLabel: field.label,
            selectedValue,
            nbOptions: field.options?.length || 0,
            optionsDetails: field.options?.map((o, i) => ({
              index: i,
              label: o.label,
              value: o.value,
              valueType: typeof o.value,
              hasConditionalFields: Array.isArray(o.conditionalFields) && o.conditionalFields.length > 0,
              conditionalFieldsCount: o.conditionalFields?.length || 0,
              conditionalFieldsLabels: o.conditionalFields?.map(cf => cf.label) || [],
              hasMetadata: !!o.metadata,
              metadataKeys: o.metadata ? Object.keys(o.metadata) : [],
              sharedReferenceIds: o.metadata?.sharedReferenceIds || null
            }))
          });
          
          // 🎯 ÉTAPE 1 : Chercher dans field.options (niveau 1)
          let selectedOption = field.options.find(opt => {
            if (selectedValue === undefined || selectedValue === null) {
              return opt.value === undefined || opt.value === null;
            }
            return opt.value === selectedValue;
          });
          if (!selectedOption) {
            selectedOption = field.options.find(opt => norm(opt.value) === selectedNorm);
            if (selectedOption) {
              dlog('🟡 [SECTION RENDERER] Correspondance option niveau 1 trouvée via comparaison loose (string).');
            }
          }
          

          
          // 🔍🔍🔍 DEBUG: ULTRA-AGGRESSIVE - check cascade field every time
          dlog(`\n${'='.repeat(80)}`);
          dlog(`🚀🚀🚀 [EVERY CASCADE CHECK] field.type="${field.type}", field.label="${field.label}"`);
          dlog(`  selectedValue: "${selectedValue}"`);
          dlog(`  selectedOption exists? ${!!selectedOption}`);
          if (selectedOption) {
            dlog(`    → label: "${selectedOption.label}"`);
            dlog(`    → Has conditionalFields? ${!!selectedOption.conditionalFields}`);
            dlog(`    → conditionalFields length: ${selectedOption?.conditionalFields?.length || 0}`);
          }
          dlog(`${'='.repeat(80)}\n`);
          
          // 🔍🔍🔍 DEBUG: Vérifier si l'option sélectionnée a des conditionalFields
          if (selectedOption && field.type === 'cascade') {
            console.log(`🎯🎯🎯 [SELECTED OPTION CHECK] field="${field.label}", selectedValue="${selectedValue}"`, {
              selectedOptionLabel: selectedOption.label,
              selectedOptionHasConditionalFields: !!selectedOption.conditionalFields,
              selectedOptionConditionalFieldsCount: Array.isArray(selectedOption.conditionalFields) ? selectedOption.conditionalFields.length : 0,
              selectedOptionConditionalFieldsLabels: Array.isArray(selectedOption.conditionalFields) ? selectedOption.conditionalFields.map(cf => cf.label) : []
            });
          }
          
          // 🎯 ÉTAPE 2 : Si pas trouvé, chercher dans allNodes (sous-options niveau 2+)
          if (!selectedOption && allNodes && allNodes.length > 0) {
            let matchingNode: RawTreeNode | undefined;
            let cascaderNodeId: string | undefined;

            if (typeof window !== 'undefined' && window.TBL_CASCADER_NODE_IDS) {
              cascaderNodeId = window.TBL_CASCADER_NODE_IDS[field.id];
            }

            if (cascaderNodeId) {
              matchingNode = allNodes.find(node => node.id === cascaderNodeId);
              console.log('🔍🔍🔍 [SECTION RENDERER] Recherche prioritaire via nodeId', {
                fieldLabel: field.label,
                cascaderNodeId,
                found: !!matchingNode
              });
            }

            if (!matchingNode) {
              console.log('🔍🔍🔍 [SECTION RENDERER] Option non trouvée niveau 1, recherche dans allNodes...', {
                fieldLabel: field.label,
                selectedValue,
                allNodesCount: allNodes.length,
                leafOptionNodes: allNodes.filter(n => n.type === 'leaf_option').length
              });
              
              // Chercher dans les nodes de type leaf_option qui ont le bon label/value
              matchingNode = allNodes.find(node => 
                (node.type === 'leaf_option' || node.type === 'leaf_option_field') &&
                (node.label === selectedValue || norm(node.label) === selectedNorm)
              );
              
              console.log('🔍🔍🔍 [SECTION RENDERER] Résultat recherche matchingNode:', {
                found: !!matchingNode,
                matchingNode: matchingNode ? { id: matchingNode.id, label: matchingNode.label, type: matchingNode.type } : null
              });
            }
            
            // 🔥 CRITQUE: Avant de reconstuire depuis allNodes, vérifier si l'option existe déjà dans field.options
            // avec les conditionalFields clonés (cas repeaters). Ça priorise les references namespaced.
            const preBuiltOption = field.options?.find(opt => 
              norm(opt.value) === selectedNorm || opt.value === selectedValue
            );
            
            if (preBuiltOption && preBuiltOption.conditionalFields && preBuiltOption.conditionalFields.length > 0) {
              console.log('✅ [SECTION RENDERER] Option pré-clonée trouvée dans field.options avec conditionalFields:',  {
                label: preBuiltOption.label,
                conditionalFieldsCount: preBuiltOption.conditionalFields.length,
                conditionalFieldsDetails: preBuiltOption.conditionalFields.map(cf => ({ id: cf.id, label: cf.label })),
                note: 'Utilisation des sharedReferences namespaced (cas repeater)'
              });
              selectedOption = preBuiltOption;
            } else if (matchingNode) {
              console.log('✅✅✅ [SECTION RENDERER] Option trouvée dans allNodes:', matchingNode);

              const reconstructedOption: { id: string; value: string; label: string; conditionalFields?: TBLField[]; metadata?: Record<string, unknown> | null } = {
                id: matchingNode.id,
                value: matchingNode.label,
                label: matchingNode.label,
                metadata: matchingNode.metadata || null
              };

              const conditionalFields: TBLField[] = [];
              const existingIds = new Set<string>();

              const childFields = allNodes.filter(childNode =>
                childNode.parentId === matchingNode.id &&
                childNode.type === 'leaf_option_field'
              );

              console.log('🔍🔍🔍 [SECTION RENDERER] Recherche childFields:', {
                matchingNodeId: matchingNode.id,
                childFieldsCount: childFields.length,
                childFields: childFields.map(c => ({ id: c.id, label: c.label, type: c.type, fieldType: c.fieldType, sharedReferenceName: c.sharedReferenceName }))
              });

              if (childFields.length > 0) {
                console.log(`🎯🎯🎯 [SECTION RENDERER] Trouvé ${childFields.length} champs enfants (références partagées)`);
                childFields.forEach(childNode => {
                  const fieldFromChild = buildConditionalFieldFromNode(childNode);
                  conditionalFields.push(fieldFromChild);
                  existingIds.add(fieldFromChild.id);
                });
              }

              console.log('🔍🔍🔍 [SECTION RENDERER] Reconstruction option depuis allNodes:', {
                matchingNodeId: matchingNode.id,
                matchingNodeLabel: matchingNode.label,
                fieldId: field.id,
                fieldLabel: field.label,
                selectedValue,
                matchingNodeHasSharedRefs: !!matchingNode.sharedReferenceIds,
                matchingNodeSharedRefsLength: Array.isArray(matchingNode.sharedReferenceIds) ? matchingNode.sharedReferenceIds.length : 0
              });
              

              // 🔥 AMÉLIORATION : Utiliser la recherche récursive dans toute la hiérarchie TreeBranchLeafNode
              // Les sharedReferenceIds peuvent être dans le nœud directement OU dans ses enfants
              const sharedReferenceIds = findAllSharedReferencesRecursive(matchingNode.id, allNodes);
              
              console.log('🔗🔗🔗 [SECTION RENDERER] Recherche RÉCURSIVE des références partagées:', {
                matchingNodeId: matchingNode.id,
                matchingNodeLabel: matchingNode.label,
                sharedReferenceIdsRecursive: sharedReferenceIds,
                fieldId: field.id,
                fieldLabel: field.label,
                allNodesCount: allNodes.length
              });

              if (sharedReferenceIds.length > 0) {
                console.log('🔗🔗🔗 [SECTION RENDERER] Références partagées détectées via recherche récursive:', {
                  matchingNodeId: matchingNode.id,
                  sharedReferenceIds,
                  fieldId: field.id,
                  fieldLabel: field.label
                });

                sharedReferenceIds.forEach(refId => {
                  const refNode = allNodes.find(node => node.id === refId);
                  if (!refNode) {
                    console.log('⚠️ [SECTION RENDERER] Référence partagée introuvable:', { refId, matchingNodeId: matchingNode.id });
                    return;
                  }
                  if (existingIds.has(refNode.id)) {
                    console.log('⚠️ [SECTION RENDERER] Référence déjà ajoutée:', { refId: refNode.id, matchingNodeId: matchingNode.id });
                    return;
                  }
                  
                  console.log('✅ [SECTION RENDERER] Ajout référence partagée:', {
                    refId: refNode.id,
                    refLabel: refNode.label,
                    refFieldType: refNode.fieldType,
                    matchingNodeId: matchingNode.id
                  });
                  
                  const refField = buildConditionalFieldFromNode(refNode);
                  conditionalFields.push(refField);
                  existingIds.add(refField.id);
                  
                  console.log('✅ [SECTION RENDERER] Champ conditionnel ajouté:', {
                    refFieldId: refField.id,
                    refFieldLabel: refField.label,
                    refFieldType: refField.type,
                    conditionalFieldsCount: conditionalFields.length
                  });
                });
              } else {
                console.log('⚠️ [SECTION RENDERER] Aucune référence partagée trouvée via recherche récursive:', {
                  matchingNodeId: matchingNode.id,
                  matchingNodeLabel: matchingNode.label,
                  fieldId: field.id,
                  fieldLabel: field.label
                });
              }

              if (conditionalFields.length > 0) {
                reconstructedOption.conditionalFields = conditionalFields;
              }

              selectedOption = reconstructedOption;
            } else {
              dlog('🔴 [SECTION RENDERER] Aucune option match dans field.options ni allNodes. selectedValue=', selectedValue, 'selectedNorm=', selectedNorm);
            }
          } else if (!selectedOption) {
            dlog('🔴 [SECTION RENDERER] Aucune option match strict ou loose. selectedValue=', selectedValue, 'selectedNorm=', selectedNorm, 'options=', field.options.map(o => ({ value:o.value, norm:norm(o.value) })));
          }

          // ✅ ÉTAPE 2-bis : Si une option est trouvée mais SANS champs conditionnels,
          // reconstruire dynamiquement ses conditionalFields depuis allNodes (refs partagées + enfants directs)
          if (selectedOption && (!Array.isArray(selectedOption.conditionalFields) || selectedOption.conditionalFields.length === 0) && allNodes && allNodes.length > 0) {
            try {
              let srcNode: RawTreeNode | undefined = undefined;
              // Priorité: id exact de l'option s'il correspond à un node
              if (selectedOption.id) {
                srcNode = allNodes.find(n => n.id === (selectedOption as any).id);
              }
              // Fallback: recherche par label/value
              if (!srcNode) {
                srcNode = allNodes.find(node => 
                  (node.type === 'leaf_option' || node.type === 'leaf_option_field') &&
                  (node.label === selectedOption!.value || norm(node.label) === selectedNorm)
                );
              }

              if (srcNode) {
                const rebuiltConditional: TBLField[] = [];
                const existingIds = new Set<string>();

                // 1) Ajouter les enfants directs de type leaf_option_field
                const childFields = allNodes.filter(childNode =>
                  childNode.parentId === srcNode!.id &&
                  childNode.type === 'leaf_option_field'
                );
                childFields.forEach(childNode => {
                  const fieldFromChild = buildConditionalFieldFromNode(childNode);
                  rebuiltConditional.push(fieldFromChild);
                  existingIds.add(fieldFromChild.id);
                });

                // 2) Injecter les références partagées détectées récursivement depuis srcNode
                const sharedReferenceIds = findAllSharedReferencesRecursive(srcNode.id, allNodes);
                sharedReferenceIds.forEach(refId => {
                  const refNode = allNodes.find(node => node.id === refId);
                  if (!refNode || existingIds.has(refNode.id)) return;
                  const refField = buildConditionalFieldFromNode(refNode);
                  rebuiltConditional.push(refField);
                  existingIds.add(refField.id);
                });

                if (rebuiltConditional.length > 0) {
                  (selectedOption as any).conditionalFields = rebuiltConditional;
                  console.log('✅ [SECTION RENDERER] conditionalFields reconstruits dynamiquement pour option sélectionnée:', {
                    fieldId: field.id,
                    fieldLabel: field.label,
                    optionLabel: selectedOption.label,
                    count: rebuiltConditional.length
                  });
                }
              }
            } catch (e) {
              console.warn('⚠️ [SECTION RENDERER] Reconstruction conditionalFields échouée:', e);
            }
          }
          
          dlog(`🔍 [SECTION RENDERER] Option finale trouvée:`, selectedOption);
          
          const rawConditionalFields = selectedOption?.conditionalFields || [];
          let conditionalFieldsToRender = rawConditionalFields;

          // �🚨🚨 [DIAGNOSTIC VERSANT-MESURE SIMPLE] - Log TOUTES les sélections cascade
          if (field.type === 'cascade' && selectedValue) {
            console.log(`\n${'🔥'.repeat(50)}`);
            console.log(`🚨🚨🚨 [CASCADE SELECTED] field="${field.label}" (id=${field.id})`);
            console.log(`🚨 selectedValue="${selectedValue}"`);
            console.log(`🚨 selectedOption exists? ${!!selectedOption}`);
            console.log(`🚨 field.isRepeaterInstance? ${!!(field as any).isRepeaterInstance}`);
            console.log(`🚨 field.repeaterNamespace?`, (field as any).repeaterNamespace);
            
            if (selectedOption) {
              console.log(`🚨 selectedOption.label: "${selectedOption.label}"`);
              console.log(`🚨 selectedOption.value: "${selectedOption.value}"`);
              console.log(`🚨 selectedOption.conditionalFields exists? ${!!selectedOption.conditionalFields}`);
              console.log(`🚨 selectedOption.conditionalFields.length: ${selectedOption.conditionalFields?.length || 0}`);
              
              // 🔥🔥🔥 DETECTION SPECIFIQUE MESURE SIMPLE 🔥🔥🔥
              if (selectedOption.label === 'Mesure simple') {
                console.log(`\n${'🎯'.repeat(30)}`);
                console.log('🎯🎯🎯 [MESURE SIMPLE DETECTED] DÉTECTION MESURE SIMPLE !');
                console.log('🎯 Contexte complet:', {
                  fieldId: field.id,
                  fieldLabel: field.label,
                  isRepeaterInstance: !!(field as any).isRepeaterInstance,
                  repeaterNamespace: (field as any).repeaterNamespace,
                  selectedOption: {
                    label: selectedOption.label,
                    value: selectedOption.value,
                    hasConditionalFields: !!selectedOption.conditionalFields,
                    conditionalFieldsCount: selectedOption.conditionalFields?.length || 0
                  }
                });
                
                if (selectedOption.conditionalFields?.length > 0) {
                  console.log('🎯 [MESURE SIMPLE] Champs conditionnels trouvés:');
                  selectedOption.conditionalFields.forEach((cf, idx) => {
                    console.log(`🎯   ${idx + 1}. ${cf.label} (id: ${cf.id}, sharedRef: ${(cf as any).sharedReferenceName})`);
                  });
                  
                  // Vérifier spécifiquement les champs recherchés
                  const longueurFacade = selectedOption.conditionalFields.find(cf => 
                    cf.label?.toLowerCase().includes('longueur') && cf.label?.toLowerCase().includes('façade')
                  );
                  const rampant = selectedOption.conditionalFields.find(cf => 
                    cf.label?.toLowerCase().includes('rampant')
                  );
                  
                  console.log('🎯 [MESURE SIMPLE] Champs cibles recherchés:', {
                    longueurFacadeTrouve: !!longueurFacade,
                    longueurFacadeDetails: longueurFacade ? {
                      id: longueurFacade.id,
                      label: longueurFacade.label,
                      sharedRef: (longueurFacade as any).sharedReferenceName
                    } : null,
                    rampantTrouve: !!rampant,
                    rampantDetails: rampant ? {
                      id: rampant.id,
                      label: rampant.label,
                      sharedRef: (rampant as any).sharedReferenceName
                    } : null
                  });
                } else {
                  console.log('🎯 [MESURE SIMPLE] ❌ PROBLÈME: Aucun champ conditionnel trouvé !');
                }
                console.log(`${'🎯'.repeat(30)}\n`);
              }
              
              if (selectedOption.conditionalFields && selectedOption.conditionalFields.length > 0) {
                console.log(`🚨 RÉFÉRENCES PARTAGÉES TROUVÉES:`, selectedOption.conditionalFields.map(f => ({
                  id: f.id,
                  label: f.label,
                  type: f.type,
                  sharedReferenceName: (f as any).sharedReferenceName
                })));
              } else {
                console.log(`🚨 ❌ AUCUNE RÉFÉRENCE PARTAGÉE dans selectedOption.conditionalFields`);
              }
            } else {
              console.log(`🚨 ❌ selectedOption is NULL or UNDEFINED`);
            }
            
            console.log(`🚨 rawConditionalFields.length: ${rawConditionalFields.length}`);
            console.log(`${'🔥'.repeat(50)}\n`);
          }

          // 🔥 FIX: Toujours traiter les conditionalFields (repeater ET copies normales)
          // Pour les repeaters: appliquer namespace; pour les copies normales: utiliser as-is
          if (rawConditionalFields.length > 0) {
            // 🎯 LOG SPÉCIFIQUE MESURE SIMPLE DANS REPEATER
            if (selectedOption?.label === 'Mesure simple' && (field as any).isRepeaterInstance) {
              console.log(`\n${'🎯'.repeat(50)}`);
              console.log('🎯🎯🎯 [MESURE SIMPLE REPEATER] DÉTECTION DANS REPEATER !');
              console.log('🎯 Context:', {
                fieldLabel: field.label,
                repeaterNamespace: (field as any).repeaterNamespace,
                conditionalFieldsCount: rawConditionalFields.length,
                conditionalFields: rawConditionalFields.map(cf => ({
                  id: cf.id,
                  label: cf.label,
                  sharedRef: (cf as any).sharedReferenceName
                }))
              });
            }
            
            const namespaceMeta = (field as any).repeaterNamespace as RepeaterNamespaceMeta | undefined;
            
            if (namespaceMeta && (field as any).isRepeaterInstance) {
              // 🔄 Cas repeater: appliquer namespaceRepeaterField
              if (selectedOption?.label === 'Mesure simple') {
                console.log('💥💥💥 [MESURE SIMPLE REPEATER] APPLYING NAMESPACE');
              }
              conditionalFieldsToRender = rawConditionalFields.map((conditionalField, index) => {
                if ((conditionalField as any).isRepeaterInstance) {
                  return conditionalField;
                }
                
                const namespacedField = namespaceRepeaterField(
                  conditionalField,
                  namespaceMeta,
                  {
                    applyLabelPrefix: false,
                    templateNodeId: (conditionalField as unknown as { originalFieldId?: string }).originalFieldId ||
                      (conditionalField as unknown as { repeaterTemplateNameId?: string }).repeaterTemplateNodeId ||
                      conditionalField.id
                  }
                );
                
                if (selectedOption?.label === 'Mesure simple') {
                  console.log(`💥 [${index + 1}] NAMESPACÉ:`, {
                    avant: conditionalField.label,
                    après: namespacedField.label,
                    id: namespacedField.id
                  });
                }
                
                return namespacedField;
              });
            }
            // ✅ Cas copie normale: les conditionalFields sont déjà correctement clonés (sans namespace)
          }

          if (conditionalFieldsToRender.length > 0) {
            // 🎉 LOG FINAL POUR MESURE SIMPLE
            if (selectedOption?.label === 'Mesure simple') {
              console.log(`\n${'🎉'.repeat(50)}`);
              console.log('🎉🎉🎉 [MESURE SIMPLE INJECTION] INJECTION FINALE RÉUSSIE !');
              console.log('🎉 Champs injectés:', conditionalFieldsToRender.map(cf => ({
                id: cf.id,
                label: cf.label
              })));
              console.log(`${'🎉'.repeat(50)}\n`);
            }
            
            if (conditionalFieldsToRender !== rawConditionalFields) {
              (selectedOption as unknown as { conditionalFields?: TBLField[] }).conditionalFields = conditionalFieldsToRender;
            }
            const injSignatureObj = {
              fieldId: field.id,
              optionValue: selectedOption.value,
              conditionalIds: conditionalFieldsToRender.map(cf => cf.id)
            };
            const injHash = JSON.stringify(injSignatureObj);
            if (lastInjectionHashRef.current !== injHash) {
              lastInjectionHashRef.current = injHash;
              dlog(`========== INJECTION CHAMPS CONDITIONNELS ==========`);
              dlog(`Field: "${field.label}"`);
              dlog(`Option: "${selectedOption.label}"`);
              dlog(`Nombre de champs: ${conditionalFieldsToRender.length}`);
              dlog(`Détails champs:`, conditionalFieldsToRender.map(cf => ({
              label: cf.label,
              type: cf.type,
              placeholder: cf.placeholder
              })));
            } else {
              dlog(`(déjà loggé) Injection inchangée pour field=${field.id} option=${selectedOption.value}`);
            }
            
            // Injecter TOUS les champs conditionnels avec des ordres séquentiels
            conditionalFieldsToRender.forEach((conditionalField, index) => {
              // 🔥 VÉRIFICATION AMÉLIORÉE: Éviter les doublons basé sur plusieurs critères
              const isAlreadyInFinalFields = finalFields.some(existingField => 
                existingField.id === conditionalField.id
              );
              
              // 🔥 NOUVELLE VÉRIFICATION: Éviter les doublons basés sur parentFieldId + parentOptionValue
              const isDuplicateBasedOnParent = finalFields.some(existingField => 
                existingField.parentFieldId === field.id && 
                existingField.parentOptionValue === selectedValue &&
                existingField.label === conditionalField.label
              );
              
              if (isAlreadyInFinalFields || isDuplicateBasedOnParent) {
                console.log('🚫 [CONDITIONAL FIELD] Éviter doublon - champ déjà présent:', {
                  id: conditionalField.id,
                  label: conditionalField.label,
                  parentField: field.label,
                  selectedOption: selectedOption.label,
                  reasonByFieldId: isAlreadyInFinalFields,
                  reasonByParentCombo: isDuplicateBasedOnParent
                });
                return; // Skip cette injection pour éviter le doublon
              }
              
              // 🔥 CORRECTION : Utiliser le nom de la référence partagée au lieu du label de l'option
              const baseSharedRefName = conditionalField.sharedReferenceName || conditionalField.label;
              let fieldLabel = baseSharedRefName || `${selectedOption.label} ${index + 1}`;
              const conditionalNamespace = (conditionalField as any).repeaterNamespace as RepeaterNamespaceMeta | undefined;
              if (conditionalNamespace?.labelPrefix && !fieldLabel.startsWith(`${conditionalNamespace.labelPrefix} -`)) {
                fieldLabel = `${conditionalNamespace.labelPrefix} - ${fieldLabel}`;
              }
              
              const fieldWithOrder = {
                ...conditionalField,
                label: fieldLabel,
                sharedReferenceName: fieldLabel,
                order: nextOrder,
                // Marquer comme champ conditionnel pour la logique interne seulement
                isConditional: true,
                parentFieldId: field.id,
                parentOptionValue: selectedValue, // Utiliser la valeur normalisée
                // ✨ CIBLE MIROIR: relier ce champ conditionnel à la carte Données portant le label de l'option
                // Exemple: option "Prix Kw/h" -> mirrorTargetLabel = "Prix Kw/h" pour alimenter la carte du même nom
                mirrorTargetLabel: selectedOption.label
              };
              

              
              dlog(`Création champ conditionnel #${index + 1}`, {
                label: fieldWithOrder.label,
                order: fieldWithOrder.order,
                parentFieldId: fieldWithOrder.parentFieldId,
                parentOptionValue: fieldWithOrder.parentOptionValue
              });
              
              finalFields.push(fieldWithOrder);
              nextOrder++;
            });
            

          } 
          // ✨ NOUVEAU: Détecter les capacités TreeBranchLeaf sur l'option sélectionnée
          else if (selectedOption && (selectedOption.hasData || selectedOption.hasFormula)) {
            dlog(`Option avec capacités TreeBranchLeaf`, {
              option: selectedOption.label,
              hasData: selectedOption.hasData,
              hasFormula: selectedOption.hasFormula
            });
            
            // Générer automatiquement un champ intelligent pour cette option
            const smartField = {
              id: `${selectedOption.value}_smart_field`,
              type: 'TEXT',
              label: selectedOption.label,
              order: nextOrder,
              isConditional: true,
              parentFieldId: field.id,
              parentOptionValue: selectedValue, // Utiliser la valeur normalisée
              // Copier les capacités TreeBranchLeaf de l'option
              hasData: selectedOption.hasData,
              hasFormula: selectedOption.hasFormula,
              capabilities: selectedOption.capabilities,
              metadata: selectedOption.metadata,
              // Marquer comme champ intelligent TreeBranchLeaf
              isTreeBranchLeafSmart: true
            };
            
            dlog(`Génération automatique du champ intelligent pour ${selectedOption.label}`);
            finalFields.push(smartField);
            nextOrder++;
          }
          else {
            dlog(`Aucun champ conditionnel trouvé pour l'option "${selectedValue}"`);
            
            // Debug supplémentaire pour voir toutes les options avec champs conditionnels
            dlog(`Liste options avec champs conditionnels`, field.options.filter(opt => opt.conditionalFields && opt.conditionalFields.length > 0).map(opt => ({
              label: opt.label,
              value: opt.value,
              count: opt.conditionalFields?.length
            })));
          }
        }
      }
    });
    
    // 🎯 TRAITER ENSUITE LES GROUPES DE CHAMPS COPIÉS
    // Ces champs seront regroupés ensemble par signature de copie
    fieldGroups.forEach((groupFields, copySignature) => {
      console.log(`🎯 [COPY GROUP PROCESSING] Traitement du groupe "${copySignature}" avec ${groupFields.length} champs`);
      
      groupFields.forEach(field => {
        // Traiter les champs du groupe exactement comme les champs normaux
        if (field.conditions && field.conditions.length > 0) {
          // Champ conditionnel : vérifier s'il doit être affiché
          const condition = field.conditions[0];
          const dependentValue = formData[condition.dependsOn];
          
          let isConditionMet = false;
          switch (condition.operator) {
            case 'equals':
              isConditionMet = dependentValue === condition.showWhen;
              break;
            case 'not_equals':
              isConditionMet = dependentValue !== condition.showWhen;
              break;
            default:
              isConditionMet = true;
          }
          
          if (isConditionMet) {
            finalFields.push({ 
              ...field, 
              order: nextOrder,
              ...(field as any).isConditional && { isConditional: (field as any).isConditional },
              ...(field as any).parentFieldId && { parentFieldId: (field as any).parentFieldId },
              ...(field as any).parentOptionValue && { parentOptionValue: (field as any).parentOptionValue },
              ...(field as any).namespace && { namespace: (field as any).namespace }
            });
            nextOrder++;
          }
        } else {
          // Champ normal du groupe copié
          finalFields.push({ 
            ...field, 
            order: nextOrder,
            ...(field as any).isConditional && { isConditional: (field as any).isConditional },
            ...(field as any).parentFieldId && { parentFieldId: (field as any).parentFieldId },
            ...(field as any).parentOptionValue && { parentOptionValue: (field as any).parentOptionValue },
            ...(field as any).namespace && { namespace: (field as any).namespace }
          });
          nextOrder++;
          
          // Traiter aussi les champs conditionnels pour les SELECT/RADIO du groupe copié
          if ((field.type === 'select' || field.type === 'radio' || field.type === 'cascade') && field.options && field.options.length > 0) {
            const selectedValue = formData[field.id];
            const selectedOption = field.options.find(opt => opt.value === selectedValue);
            
            if (selectedOption && selectedOption.conditionalFields && selectedOption.conditionalFields.length > 0) {
              selectedOption.conditionalFields.forEach(condField => {
                const fieldWithOrder = {
                  ...condField,
                  order: nextOrder,
                  isConditional: true,
                  parentFieldId: field.id,
                  parentOptionValue: selectedValue
                };
                
                finalFields.push(fieldWithOrder);
                nextOrder++;
              });
            }
          }
        }
      });
    });
    
    // 🎯 TRAITER MAINTENANT LES REPEATERS AVEC LE BON REGROUPEMENT
    repeaterFields.forEach((_, repeaterId) => {
      const repeaterField = fields.find(f => f.id === repeaterId);
      if (!repeaterField) return;
      
      // Code existant pour traiter le repeater, mais maintenant il sera traité séparément
      const isRepeater = (
        repeaterField.type === 'leaf_repeater' || 
        repeaterField.type === 'LEAF_REPEATER' ||
        (repeaterField as any).fieldType === 'leaf_repeater' ||
        (repeaterField as any).fieldType === 'LEAF_REPEATER' ||
        (repeaterField.metadata && typeof repeaterField.metadata === 'object' && 'repeater' in repeaterField.metadata)
      );
      
      if (isRepeater) {
        // [Insérer ici tout le code de traitement du repeater existant]
        // Je vais copier le code existant...
        
        const repeaterMetadata = repeaterField.metadata?.repeater;
        const templateNodeIdsRaw = (repeaterField as any).repeater_templateNodeIds 
          ? JSON.parse((repeaterField as any).repeater_templateNodeIds) 
          : repeaterMetadata?.templateNodeIds || [];

        // Expansion des templateNodeIds avec système de recherche récursive
        const expandTemplateNodeIds = (rawIds: string[]) => {
          const expanded: string[] = [];
          rawIds.forEach(nodeId => {
            expanded.push(nodeId);
            if (allNodes) {
              const sourceNode = allNodes.find(n => n.id === nodeId);
              sourceNode?.children?.forEach(child => {
                if (child.config?.sourceRef) {
                  expanded.push(child.config.sourceRef);
                }
              });
            }
          });
          return Array.from(new Set(expanded));
        };

        // 🎯 RÉCUPÉRER L'ORDRE DES TEMPLATES DEPUIS L'ARBRE COPIÉ
        // Au lieu d'utiliser templateNodeIds dans l'ordre de la DB, utiliser l'ordre de l'arbre
        const getTemplateNodeIdsInTreeOrder = (templateNodeIds: string[]) => {
          if (!allNodes || allNodes.length === 0) {
            return templateNodeIds; // Fallback si pas d'arbre
          }
          
          // Trouver le nœud repeater dans l'arbre
          const repeaterNode = allNodes.find(n => n.id === repeaterField.id);
          if (!repeaterNode || !repeaterNode.children) {
            return templateNodeIds; // Fallback si pas trouvé
          }
          
          // Récupérer l'ordre des enfants depuis l'arbre
          const orderedIds: string[] = [];
          repeaterNode.children.forEach(child => {
            if (child.config?.sourceRef && templateNodeIds.includes(child.config.sourceRef)) {
              orderedIds.push(child.config.sourceRef);
            } else if (templateNodeIds.includes(child.id)) {
              orderedIds.push(child.id);
            }
          });
          
          // Ajouter les IDs manquants à la fin (au cas où)
          templateNodeIds.forEach(id => {
            if (!orderedIds.includes(id)) {
              orderedIds.push(id);
            }
          });
          
          console.log('🎯 [TREE ORDER] Ordre des templates depuis l\'arbre:', {
            originalOrder: templateNodeIds,
            treeOrder: orderedIds,
            repeaterNodeId: repeaterField.id,
            hasChildren: !!repeaterNode.children
          });
          
          return orderedIds;
        };

        const templateNodeIds = getTemplateNodeIdsInTreeOrder(expandTemplateNodeIds(templateNodeIdsRaw));
        const repeaterLabel = repeaterField.label || repeaterField.name || 'Entrée';
        
        const buttonSize = (repeaterField as any).repeater_buttonSize || repeaterMetadata?.buttonSize || 'middle';
        const buttonWidth = (repeaterField as any).repeater_buttonWidth || repeaterMetadata?.buttonWidth || 'auto';
        const iconOnly = (repeaterField as any).repeater_iconOnly ?? repeaterMetadata?.iconOnly ?? false;
        const maxItems = (repeaterField as any).repeater_maxItems ?? repeaterMetadata?.maxItems ?? null;
        
        // Récupérer le nombre d'instances depuis formData
        const instanceCountKey = `${repeaterField.id}_instanceCount`;
        const instanceCount = (formData[instanceCountKey] as number) ?? 0;
        
        const findFieldInAllSections = (sections: TBLSection[], fieldId: string): TBLField | undefined => {
          for (const sec of sections) {
            const found = sec.fields?.find(f => f.id === fieldId);
            if (found) return found;
            if (sec.subsections && sec.subsections.length > 0) {
              const foundInSub = findFieldInAllSections(sec.subsections, fieldId);
              if (foundInSub) return foundInSub;
            }
          }
          return undefined;
        };
        
        const _getTemplateFieldLabel = (templateNodeId: string) => {
          if (repeaterMetadata?.templateNodeLabels) {
            const labelFromMeta = (repeaterMetadata.templateNodeLabels as Record<string, string>)[templateNodeId];
            if (labelFromMeta) return labelFromMeta;
          }
          let templateField = section.fields.find(f => f.id === templateNodeId);
          if (!templateField && section.subsections) {
            templateField = findFieldInAllSections(section.subsections, templateNodeId);
          }
          return templateField?.label || templateNodeId;
        };

        // 🎯 REGROUPEMENT CORRIGÉ : Pour chaque instance, ajouter TOUS ses champs ensemble
        for (let i = 0; i < instanceCount; i++) {
          const instanceLabelPrefix = `${repeaterLabel} ${i + 1}`;
          const namespaceMeta = {
            prefix: `${repeaterField.id}_${i}_`,
            labelPrefix: instanceLabelPrefix,
            parentId: repeaterField.id,
            instanceIndex: i
          };

          // Ajouter TOUS les champs de cette instance avant de passer à l'instance suivante
          templateNodeIds.forEach((templateNodeId) => {
            let templateField: TBLField | undefined = section.fields.find(f => f.id === templateNodeId);
            
            if (!templateField && section.subsections) {
              templateField = findFieldInAllSections(section.subsections, templateNodeId);
            }

            if (!templateField) {
              const rawNode = getNodeById(templateNodeId);
              if (rawNode) {
                const built = buildConditionalFieldFromNode(rawNode);
                templateField = built as unknown as TBLField;
              }
            }

            if (templateField) {
              const namespaced = namespaceRepeaterField(
                templateField,
                namespaceMeta,
                { templateNodeId: templateNodeId }
              );
              
              (namespaced as any).repeaterParentId = repeaterField.id;
              (namespaced as any).repeaterInstanceIndex = i;
              (namespaced as any).repeaterTemplateNodeId = templateNodeId;
              (namespaced as any).repeaterInstanceLabel = instanceLabelPrefix;
              (namespaced as any).repeaterNamespace = namespaceMeta;

              // Traitement des options et références partagées (code existant)
              if (Array.isArray(namespaced.options)) {
                namespaced.options = namespaced.options.map(opt => {
                  const optionRawNode = allNodes?.find(n => n.id === opt.id);
                  let sharedRefIds: string[] = [];
                  
                  if (optionRawNode) {
                    sharedRefIds = findAllSharedReferencesRecursive(optionRawNode.id, allNodes || []);
                  } else {
                    const metaIds = Array.isArray(opt.metadata?.sharedReferenceIds) ? opt.metadata!.sharedReferenceIds : [];
                    const metaSingle = typeof opt.metadata?.sharedReferenceId === 'string' ? [opt.metadata!.sharedReferenceId] : [];
                    const topIds = Array.isArray((opt as any).sharedReferenceIds) ? (opt as any).sharedReferenceIds : [];
                    const topSingle = typeof (opt as any).sharedReferenceId === 'string' ? [(opt as any).sharedReferenceId] : [];
                    sharedRefIds = [...metaIds, ...metaSingle, ...topIds, ...topSingle];
                  }
                  
                  if (Array.isArray(sharedRefIds) && sharedRefIds.length > 0) {
                    if (!Array.isArray(opt.conditionalFields)) {
                      opt.conditionalFields = [];
                    }
                    
                    sharedRefIds.forEach((refId) => {
                      const refNode = allNodes?.find(n => n.id === refId);
                      if (!refNode) return;
                      
                      const alreadyExists = opt.conditionalFields?.some(cf => cf.id === refId || cf.id === `${namespaceMeta.prefix}${refId}`);
                      if (alreadyExists) return;
                      
                      const refField = buildConditionalFieldFromNode(refNode);
                      const namespacedRef = namespaceRepeaterField(refField, namespaceMeta, {
                        applyLabelPrefix: true,
                        templateNodeId: refId
                      });
                      
                      opt.conditionalFields?.push(namespacedRef);
                    });
                  } else if (Array.isArray(opt.conditionalFields) && opt.conditionalFields.length > 0) {
                    opt.conditionalFields = opt.conditionalFields.map(condField => {
                      const namespacedCondField = namespaceRepeaterField(condField, namespaceMeta, {
                        applyLabelPrefix: true,
                        templateNodeId: condField.id
                      });
                      return namespacedCondField;
                    });
                  }
                  
                  return opt;
                });
              }
              
              namespaced.order = nextOrder;
              finalFields.push(namespaced);
              nextOrder++;
            }
          });
          
          // Bouton de suppression pour cette instance
          if (instanceCount > 0) {
            const removeInstanceButtonField: TBLField = {
              ...repeaterField,
              id: `${repeaterField.id}_removeInstance_${i}`,
              type: 'REPEATER_REMOVE_INSTANCE_BUTTON' as any,
              label: `Supprimer ${repeaterLabel} ${i + 1}`,
              order: nextOrder,
              isRepeaterButton: true,
              repeaterParentId: repeaterField.id,
              repeaterInstanceIndex: i,
              repeaterInstanceCount: instanceCount
            } as TBLField & { isRepeaterButton?: boolean; repeaterParentId?: string; repeaterInstanceIndex?: number; repeaterInstanceCount?: number };
            
            finalFields.push(removeInstanceButtonField);
            nextOrder++;
          }
        }
        
        // Bouton d'ajout
        const buttonLabel = (repeaterField as any).repeater_addButtonLabel 
          || repeaterMetadata?.addButtonLabel 
          || (repeaterLabel && repeaterLabel !== 'Entrée' ? `Ajouter ${repeaterLabel}` : 'Ajouter une entrée');
        
        const addButtonField: TBLField = {
          ...repeaterField,
          id: `${repeaterField.id}_addButton`,
          type: 'REPEATER_ADD_BUTTON' as any,
          label: buttonLabel,
          order: nextOrder,
          isRepeaterButton: true,
          repeaterParentId: repeaterField.id,
          repeaterCanAdd: !maxItems || instanceCount < maxItems,
          repeaterInstanceCount: instanceCount,
          repeaterButtonSize: buttonSize,
          repeaterButtonWidth: buttonWidth,
          repeaterIconOnly: iconOnly
        } as TBLField & { isRepeaterButton?: boolean; repeaterParentId?: string; repeaterCanAdd?: boolean; repeaterInstanceCount?: number; repeaterButtonSize?: string; repeaterButtonWidth?: string; repeaterIconOnly?: boolean };
        
        finalFields.push(addButtonField);
        nextOrder++;
      }
    });
    
    // 🔥 DÉDUPLICATION FINALE: Nettoyer tous les doublons potentiels
    const uniqueFields = finalFields.reduce((acc, field) => {
      // Vérifier si un champ avec le même ID existe déjà
      const existingFieldIndex = acc.findIndex(existingField => existingField.id === field.id);
      
      if (existingFieldIndex === -1) {
        // Nouveau champ, l'ajouter
        acc.push(field);
      } else {
        // Champ existant - garder celui avec l'ordre le plus bas (premier ajouté)
        const existingField = acc[existingFieldIndex];
        if (field.order < existingField.order) {
          acc[existingFieldIndex] = field;
        }
        console.log('🔧 [DEDUPLICATION] Doublon détecté et résolu:', {
          id: field.id,
          label: field.label,
          keptOrder: Math.min(field.order, existingField.order),
          removedOrder: Math.max(field.order, existingField.order)
        });
      }
      
      return acc;
    }, [] as typeof finalFields);
    
    // 🎯 CORRECTION: Ne pas trier pour préserver l'ordre des repeaters
    // Les champs sont déjà dans le bon ordre car ajoutés séquentiellement avec nextOrder
    return uniqueFields;
  }, [dlog, formData, section, allNodes, buildConditionalFieldFromNode, findAllSharedReferencesRecursive]);

  // 🔗 ÉTAPE 2: Filtrer les champs basés sur la visibilité conditionnelle du cascader
  // Si un cascader est sélectionné, afficher UNIQUEMENT les champs dont sharedReferenceId correspond
  // 🔥 LOG BRUTAL: Afficher TOUS les champs de cette section pour déboguer
  if (orderedFields.length > 0) {
    const fieldDetails = orderedFields.map(f => ({
      label: f.label,
      type: f.type,
      isConditional: (f as any).isConditional,
      parentFieldId: (f as any).parentFieldId,
      hasSharedRefId: !!(f.sharedReferenceId || (f as any).sharedReferenceIds),
      order: f.order
    }));
    console.log(`�🚨🚨 [ULTRA DEBUG] ORDEREDFIELDS Section "${section.title}" (${section.sectionName}): ${orderedFields.length} champs`, fieldDetails);
    
    // Log spécifique pour les champs conditionnels
    const conditionalFields = orderedFields.filter(f => (f as any).isConditional);
    if (conditionalFields.length > 0) {
      console.log(`🚨🚨🚨 [ULTRA DEBUG] CHAMPS CONDITIONNELS trouvés dans orderedFields:`, {
        nbChamps: conditionalFields.length,
        details: conditionalFields.map(cf => ({
          id: cf.id,
          label: cf.label,
          order: cf.order,
          parentFieldId: (cf as any).parentFieldId,
          parentOptionValue: (cf as any).parentOptionValue
        }))
      });
    }
  }

  // ℹ️ NOTE: Les champs conditionnels sont DÉJÀ gérés par la logique existante
  // dans les cascaders et repeaters. Le système injecte automatiquement les
  // conditionalFields dans finalFields quand une option est sélectionnée.
  // On ne doit pas les filtrer à nouveau ici.
  const visibilityFilteredFields = useMemo(() => {
    console.log('🚨🚨🚨 [ULTRA DEBUG] VISIBILITYFILTERED - Entrée:', {
      section: section.title,
      nbOrderedFields: orderedFields.length,
      orderedFieldsConditionnels: orderedFields.filter(f => (f as any).isConditional).length
    });
    
    // Pour l'instant, on retourne tous les champs sans filtre 
    // pour voir si l'injection fonctionne. Les champs conditionnels
    // sont censés être automatiquement visibles quand injectés.
    const result = orderedFields;
    
    // LOG DÉTAILLÉ pour champs conditionnels injectés
    orderedFields.forEach(field => {
      if ((field as any).isConditional) {
        console.log(`🔍🔍🔍 [CONDITIONAL FIELD DEBUG]`, {
          fieldId: field.id,
          fieldLabel: field.label,
          isConditional: (field as any).isConditional,
          fieldType: field.type,
          parentFieldId: (field as any).parentFieldId,
          parentOptionValue: (field as any).parentOptionValue,
          visibilityConditions: field.visibility || 'Aucune',
          section: section.title
        });
      }
    });
    
    console.log('🚨🚨🚨 [ULTRA DEBUG] VISIBILITYFILTERED - Sortie:', {
      section: section.title,
      nbResultFields: result.length,
      resultFieldsConditionnels: result.filter(f => (f as any).isConditional).length,
      detailsChamps: result.map(f => ({
        id: f.id,
        label: f.label,
        order: f.order,
        isConditional: (f as any).isConditional
      }))
    });
    
    return result;
  }, [orderedFields, section.title]);

  // 🎨 Déterminer le style selon le niveau
  const getSectionStyle = () => {
    switch (level) {
      case 0: // Section principale
        return {
          marginBottom: '24px',
          border: '1px solid #d9d9d9',
          borderRadius: '8px'
        };
      case 1: // Sous-section
        return {
          marginBottom: '16px',
          border: '1px solid #f0f0f0',
          borderRadius: '6px',
          marginLeft: '16px'
        };
      default: // Sous-sous-section et plus
        return {
          marginBottom: '12px',
          border: '1px solid #fafafa',
          borderRadius: '4px',
          marginLeft: `${16 * level}px`
        };
    }
  };

  // 🎯 Fonction de rendu pour les champs de la section "Données" avec TreeBranchLeaf
    const { evaluateBatch } = useBatchEvaluation({ debug: false });
    const batchCacheRef = useRef<Record<string, number | string | boolean | null>>({});
    const [batchLoaded, setBatchLoaded] = useState(false);
    const isDataSection = section.isDataSection || section.title === 'Données' || section.title.includes('Données');

    // Pré-chargement batch pour les cartes de la section Données
    useEffect(() => {
      if (!isDataSection) return;
      type DataInstance = { metadata?: { sourceType?: string; sourceRef?: string }; displayFormat?: string; unit?: string; precision?: number };
      type CapabilityData = { activeId?: string; instances?: Record<string, DataInstance> };
      const candidateNodeIds: string[] = [];
      for (const f of (section.fields || [])) {
        const capData: CapabilityData | undefined = (f.capabilities && (f.capabilities as Record<string, unknown>).data) as CapabilityData | undefined;
        if (capData?.instances && Object.keys(capData.instances).length > 0) {
          const activeId = capData.activeId || Object.keys(capData.instances)[0];
          if (activeId) candidateNodeIds.push(activeId);
        }
      }
      if (candidateNodeIds.length === 0) { setBatchLoaded(true); return; }
      (async () => {
        const results = await evaluateBatch(candidateNodeIds, formData);
        const map: Record<string, number | string | boolean | null> = {};
        Object.values(results).forEach(r => { map[r.nodeId] = r.calculatedValue; });
        batchCacheRef.current = map;
        setBatchLoaded(true);
      })();
    }, [isDataSection, formData, section.fields, evaluateBatch]);

    const renderDataSectionField = (field: TBLField) => {
    // 🔥 CORRECTION CRITIQUE : Si le champ a une capacité Table (lookup ou matrix), utiliser le renderer éditable
    const hasTableCapability = field.capabilities?.table?.enabled;
    const hasRowOrColumnMode = field.capabilities?.table?.currentTable?.rowBased === true || 
                               field.capabilities?.table?.currentTable?.columnBased === true;
    const isMatrixMode = field.capabilities?.table?.currentTable?.mode === 'matrix';
    
    //  Détection des champs répétables
    const isRepeater = field.type === 'leaf_repeater' || 
                       field.type === 'LEAF_REPEATER' ||
                       (field as any).fieldType === 'leaf_repeater' ||
                       (field as any).fieldType === 'LEAF_REPEATER';
    
    // Rendre éditable si c'est un lookup (rowBased/columnBased) OU un résultat de matrice OU un répétable
    if ((hasTableCapability && (hasRowOrColumnMode || isMatrixMode)) || isRepeater) {
      return (
        <Col
          key={field.id}
          xs={24}
          sm={12}
          lg={6}
          className="mb-2"
        >
          <TBLFieldRendererAdvanced
            field={field}
            value={(() => {
              const rawValue = formData[field.id];
              // Si c'est un objet avec value/calculatedValue (réponse backend), extraire
              if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
                return rawValue.value ?? rawValue.calculatedValue ?? rawValue.operationResult?.value ?? rawValue;
              }
              return rawValue;
            })()}
            allNodes={allNodes}
            onChange={(value) => {
              onChange(field.id, value);

              // Synchronisation miroir
              try {
                const label = (field.label || '').toString();
                if (label) {
                  const mirrorKey = `__mirror_data_${label}`;
                  onChange(mirrorKey, value);
                }
              } catch (e) {
                console.warn('⚠️ [MIRROR] Impossible de créer la valeur miroir:', e);
              }
            }}
            isValidation={isValidation}
            formData={formData}
            treeId={treeId}
          />
        </Col>
      );
    }
    
    // 🎯 Système TreeBranchLeaf : connexion aux capacités réelles (DISPLAY ONLY)
    const getDisplayValue = () => {
      const capabilities = field.capabilities;
      
  dlog(`🔬 [TEST CAPABILITIES] Champ "${field.label}" - Capabilities présentes:`, !!capabilities);

      // ✨ Check 0: valeur "miroir" issue d'un champ conditionnel associé (ex: "Prix Kw/h - Champ")
      // Permet d'afficher instantanément la valeur saisie quand aucune capacité Data/Formula n'est disponible
      const mirrorKey = `__mirror_data_${field.label}`;
      const mirrorValue: unknown = (formData as Record<string, unknown>)[mirrorKey];
      const hasDynamicCapabilities = Boolean(field.capabilities?.data?.instances || field.capabilities?.formula);
      // 🔍 Recherche variantes si pas trouvé
      let effectiveMirrorValue = mirrorValue;
      // 🔥 MODIFICATION: Rechercher les variantes MÊME SI hasDynamicCapabilities = true
      // Car le champ peut avoir une capacité mais la valeur calculée peut être vide
      if (effectiveMirrorValue === undefined || effectiveMirrorValue === null || effectiveMirrorValue === '') {
        try {
          const variantKeys = buildMirrorKeys(field.label || '').map(k => k); // déjà préfixés
          let variantHit: string | null = null;
          for (const vk of variantKeys) {
            if ((formData as Record<string, unknown>)[vk] !== undefined) {
              effectiveMirrorValue = (formData as Record<string, unknown>)[vk];
              dlog(`🪞 [MIRROR][VARIANT] Utilisation variante '${vk}' pour champ '${field.label}' ->`, effectiveMirrorValue);
              variantHit = vk;
              break;
            }
          }
          if (!variantHit && !hasDynamicCapabilities) {
            // Log agressif UNIQUE par champ (limité via ref ? simplif: log à chaque rendu si debug actif)
            const diag = (() => { try { return localStorage.getItem('TBL_DIAG') === '1'; } catch { return false; } })();
            if (diag) {
              console.warn('[TBL][MIRROR][MISS]', {
                label: field.label,
                triedMirrorKey: mirrorKey,
                variantKeys,
                reason: 'Aucune variante de clé miroir trouvée et aucune capacité dynamique',
                hasDynamicCapabilities
              });
            }
          }
        } catch (e) {
          console.warn('[MIRROR][VARIANT][ERROR]', e);
        }
      }
      
      // 🔥 MODIFICATION: Afficher la valeur miroir SI elle existe, MÊME AVEC capacités dynamiques
      // On laisse quand même les capacités s'exécuter après, et si elles retournent une valeur,
      // elle remplacera la valeur miroir. Mais si les capacités retournent null, au moins on a une valeur.
      // POUR L'INSTANT: On garde le comportement où on n'affiche QUE si pas de capacités dynamiques
      // Car sinon BackendCalculatedField va s'exécuter et peut écraser la valeur miroir
      if (!hasDynamicCapabilities && effectiveMirrorValue !== undefined && effectiveMirrorValue !== null && effectiveMirrorValue !== '') {
        const precision = (field.config as { decimals?: number } | undefined)?.decimals ?? 2;
        const unit = (field.config as { unit?: string } | undefined)?.unit;
        const asNumber = typeof effectiveMirrorValue === 'number'
          ? effectiveMirrorValue
          : parseFloat(String(effectiveMirrorValue).replace(',', '.'));
        const valueToFormat: number | string = isNaN(asNumber) ? String(mirrorValue) : asNumber;
        const formatted = formatValueWithConfig(valueToFormat as number | string, { displayFormat: 'number', unit, precision });
  dlog(`🪞 [MIRROR] Affichage via valeur miroir pour "${field.label}" (${mirrorKey}) (pas de capacité dynamique):`, formatted);
        return formatted ?? String(valueToFormat);
      } else if (effectiveMirrorValue !== undefined && effectiveMirrorValue !== null && effectiveMirrorValue !== '' && hasDynamicCapabilities) {
  dlog(`🪞 [MIRROR] Valeur miroir DÉTECTÉE pour "${field.label}" mais capacités dynamiques présentes - on laisse les capacités s'exécuter`);
      }

      // ✨ Pré-évaluation: si la capacité Donnée pointe vers une condition et qu'une formule est dispo,
      // on donne la priorité à la formule pour éviter un résultat null quand la condition n'est pas remplie.
      try {
        const dataActiveId = capabilities?.data?.activeId;
        type DataInstanceMeta = { metadata?: { sourceType?: string; sourceRef?: string; fixedValue?: unknown } } & Record<string, unknown>;
        const dataInstances = capabilities?.data?.instances as Record<string, DataInstanceMeta> | undefined;
        const candidateDataInstance = dataActiveId && dataInstances
          ? dataInstances[dataActiveId]
          : (dataInstances ? dataInstances[Object.keys(dataInstances)[0]] : undefined);
        const dataSourceType = candidateDataInstance?.metadata?.sourceType;
        const dataSourceRef = candidateDataInstance?.metadata?.sourceRef as string | undefined;
        // 🚫 Suppression de la préférence forcée formule : on suit exactement la sourceRef.
        // Si la sourceRef cible une condition -> on affiche la condition (bool / valeur) via BackendCalculatedField.
        // Si l'utilisateur veut une formule, la sourceRef doit explicitement être "formula:<id>".
        if (dataSourceType === 'tree' && typeof dataSourceRef === 'string') {
          const r = dataSourceRef;
          if (r.startsWith('condition:') || r.startsWith('formula:') || r.startsWith('node-formula:') || r.startsWith('@value.') || r.startsWith('@table.')) {
            dlog(`Routing data direct sourceRef='${r}'`);
            const dMeta = (candidateDataInstance as { displayFormat?: string; unit?: string; precision?: number } | undefined) || {};
            // Récupérer le nodeId depuis dataActiveId
            if (!dataActiveId || !treeId) {
              return <span style={{ color: '#888' }}>---</span>;
            }
            
            // ✅ NOUVEAU SYSTÈME : BackendValueDisplay récupère directement la valeur du backend
            return (
              <BackendValueDisplay
                nodeId={dataActiveId}
                treeId={treeId}
                formData={formData}
                unit={dMeta.unit}
                precision={typeof dMeta.precision === 'number' ? dMeta.precision : (field.config?.decimals || 2)}
                placeholder="Calcul..."
              />
            );
          }
        }
      } catch (e) {
        console.warn('⚠️ [PREFERENCE] Erreur lors de la vérification priorité formule vs donnée:', e);
      }
      
  // ✨ PRIORITÉ 1: Capacité Data (données dynamiques depuis TreeBranchLeafNodeVariable)
  // Ne pas exiger strictement 'enabled' si des instances existent côté Prisma
  if (capabilities?.data?.enabled || capabilities?.data?.instances) {
  dlog(`� [TEST DATA] Champ "${field.label}" a une capacité Data active:`, capabilities.data.activeId);
  dlog(`🔬 [TEST DATA] Instances disponibles:`, capabilities.data.instances);
        
        // Récupérer la configuration de la variable active
        const dataInstance = capabilities.data.activeId
          ? capabilities.data.instances?.[capabilities.data.activeId]
          : (capabilities.data.instances 
              ? capabilities.data.instances[Object.keys(capabilities.data.instances)[0]] 
              : undefined);
  dlog(`🔬 [TEST DATA] Instance active:`, dataInstance);
        
        if (dataInstance && dataInstance.metadata) {
          const { sourceType: configSourceType, sourceRef: configSourceRef, fixedValue } = dataInstance.metadata;
          
          dlog(`� [TEST METADATA] sourceType: "${configSourceType}"`);
          dlog(`🔬 [TEST METADATA] sourceRef: "${configSourceRef}"`);
          dlog(`🔬 [TEST METADATA] fixedValue:`, fixedValue);
          
          // Mode arborescence (router selon la vraie référence: condition:, formula:, @value., @table.)
          if (configSourceType === 'tree' && configSourceRef) {
            const ref = String(configSourceRef);
            const isCondition = ref.startsWith('condition:');
            const isFormula = ref.startsWith('formula:') || ref.startsWith('node-formula:');
            const isValue = ref.startsWith('@value.');
            const isTable = ref.startsWith('@table.'); // 🔥 AJOUT: Support des références @table
            dlog(`🔬 [TEST TREE SOURCE] Router direct: condition=${isCondition}, formula=${isFormula}, value=${isValue}, table=${isTable}`);

            if (isCondition || isFormula || isValue || isTable) { // 🔥 AJOUT: isTable
              // Si batch pré-chargé et c'est une variable nodeId connue => montrer la valeur batch si existante
              if (batchLoaded && ref.startsWith('condition:')) {
                const nodeId = (capabilities?.data?.activeId) || (capabilities?.data?.instances ? Object.keys(capabilities.data.instances)[0] : undefined);
                if (nodeId && batchCacheRef.current[nodeId] != null) {
                  const val = batchCacheRef.current[nodeId];
                  return <span style={{ fontWeight: 'bold', color: '#047857' }}>{formatValueWithConfig(val, dataInstance)}</span>;
                }
              }
              
              // Récupérer le nodeId pour le composant
              const variableNodeId = (capabilities?.data?.activeId) || (capabilities?.data?.instances ? Object.keys(capabilities.data.instances)[0] : undefined);
              
              if (!variableNodeId || !treeId) {
                return <span style={{ color: '#888' }}>---</span>;
              }
              
              // ✅ NOUVEAU SYSTÈME : BackendValueDisplay récupère directement la valeur du backend
              return (
                <BackendValueDisplay
                  nodeId={variableNodeId}
                  treeId={treeId}
                  formData={formData}
                  unit={dataInstance?.unit as string | undefined}
                  precision={dataInstance?.precision as number | undefined}
                  placeholder={batchLoaded ? '---' : 'Calcul...'}
                />
              );
            }

            // Sinon, déléguer à l'évaluation de variable du nœud
            const instanceId = capabilities?.data?.activeId 
              || (capabilities?.data?.instances ? Object.keys(capabilities.data.instances)[0] : undefined);
            if (instanceId) {
              dlog(`🎯 [DATA VARIABLE] nodeId utilisé pour évaluation: ${instanceId}`);
              const preVal = batchLoaded ? batchCacheRef.current[instanceId] : null;
              if (batchLoaded && preVal != null) {
                return <span style={{ fontWeight: 'bold', color: '#047857' }}>{formatValueWithConfig(preVal, dataInstance)}</span>;
              }
              
              if (!treeId) {
                return <span style={{ color: '#888' }}>---</span>;
              }
              
              // ✅ NOUVEAU SYSTÈME : BackendValueDisplay récupère directement la valeur du backend
              return (
                <BackendValueDisplay
                  nodeId={instanceId}
                  treeId={treeId}
                  formData={formData}
                  unit={dataInstance?.unit as string | undefined}
                  precision={dataInstance?.precision as number | undefined}
                  placeholder={batchLoaded ? '---' : 'Calcul...'}
                />
              );
            }
            console.warn('ℹ️ [DATA VARIABLE] Aucune instanceId trouvée pour variable – affichage placeholder');
            return '---';
          }
          
          // Mode valeur fixe
          if (configSourceType === 'fixed' && fixedValue !== undefined) {
            dlog(`� [TEST FIXED] Valeur fixe détectée: ${fixedValue}`);
            const formatted = formatValueWithConfig(fixedValue, dataInstance);
            return formatted;
          }
          
          // Fallback: valeur par défaut de la configuration
          if (dataInstance.defaultValue !== undefined) {
            dlog(`� [TEST DEFAULT] Valeur par défaut: ${dataInstance.defaultValue}`);
            return formatValueWithConfig(dataInstance.defaultValue, dataInstance);
          }
        }
      }
      
      // ✨ PRIORITÉ 2: Capacité Formula (formules directes) - COPIE DU COMPORTEMENT "Prix Kw/h test"
      const formulaId = capabilities?.formula?.activeId 
        || (capabilities?.formula?.instances && Object.keys(capabilities.formula.instances).length > 0 ? Object.keys(capabilities.formula.instances)[0] : undefined);
      if ((formulaId && String(formulaId).trim().length > 0) || capabilities?.formula?.currentFormula) {
        const currentFormula = capabilities?.formula?.currentFormula;
        const rawExpression = currentFormula?.expression;
        const variablesDef = currentFormula?.variables ? Object.fromEntries(Object.entries(currentFormula.variables).map(([k,v]) => [k, { sourceField: (v as { sourceField?: string; type?: string }).sourceField, type: (v as { sourceField?: string; type?: string }).type }])) : undefined;
        
        dlog(`🔬 [TEST FORMULA ENHANCED] Formule avec expression: ${rawExpression}`);
        dlog(`🔬 [TEST FORMULA ENHANCED] Variables définies:`, variablesDef);
        
        if (!formulaId || !treeId) {
          return <span style={{ color: '#888' }}>---</span>;
        }
        
        // ✅ NOUVEAU SYSTÈME : BackendValueDisplay récupère directement la valeur du backend
        return (
          <BackendValueDisplay
            nodeId={formulaId}
            treeId={treeId}
            formData={formData}
            unit={field.config?.unit}
            precision={field.config?.decimals || 4}
            placeholder="Calcul en cours..."
          />
        );
      }
      
  // Pas de fallback conditionnel codé en dur: la valeur doit venir des capacités TBL (data/formula)
      
  // 🔍 Si aucune capacité configurée, afficher la valeur brute du formulaire
      let rawValue = formData[field.id];
      
      // 🛡️ EXTRACTION PRÉCOCE : Si rawValue est un objet (réponse backend), extraire la valeur IMMÉDIATEMENT
      // Cela évite d'afficher "[object Object]" dans les cartes bleues et autres affichages
      if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
        const obj = rawValue as Record<string, unknown>;
        // Priorité: value > calculatedValue > operationResult.value
        rawValue = obj.value ?? obj.calculatedValue ?? (obj.operationResult && typeof obj.operationResult === 'object' 
          ? (obj.operationResult as Record<string, unknown>).value 
          : undefined) ?? rawValue;
        
        if (rawValue && typeof rawValue === 'object') {
          // Si toujours un objet après extraction, essayer d'autres propriétés
          const stillObj = rawValue as Record<string, unknown>;
          rawValue = stillObj.text ?? stillObj.result ?? stillObj.displayValue ?? stillObj.humanText ?? stillObj.label ?? rawValue;
        }
        
        dlog(`🛡️ [EXTRACTION PRÉCOCE] Objet détecté, valeur extraite:`, rawValue);
      }
      
  dlog(`🔬 [TEST FALLBACK] Aucune capacité - valeur brute: ${rawValue}`);
      
      // 🐛 DEBUG SPÉCIFIQUE pour M² de la toiture
      if (field.id === 'bda4aa6c-033e-46f8-ad39-5ea4e2a1cb77') {
        console.log('🐛 [DEBUG M² toiture] Configuration complète du champ:', {
          id: field.id,
          label: field.label,
          type: field.type,
          capabilities: field.capabilities,
          treeMetadata: field.treeMetadata,
          config: field.config,
          metadata: (field as any).metadata,
          rawValue
        });
      }
      // 🧩 Nouveau: si metadata/config contient un sourceRef exploitable, utiliser CalculatedFieldDisplay
      try {
        const metaLike = (field.treeMetadata || field.config || {}) as Record<string, unknown>;
        const metaSourceRef = (metaLike.sourceRef as string | undefined) || (metaLike['source_ref'] as string | undefined);
        if (metaSourceRef && typeof metaSourceRef === 'string' && /^(formula:|condition:|variable:|@value\.)/.test(metaSourceRef)) {
          dlog(`🧪 [FALLBACK SMART] Utilisation CalculatedFieldDisplay via metaSourceRef='${metaSourceRef}'`);
          if (localStorage.getItem('TBL_DIAG') === '1') {
            dlog('[TBL_DIAG][fallback-smart]', {
              fieldId: field.id,
              label: field.label,
              metaSourceRef,
              hasCapabilities: !!field.capabilities
            });
          }
          
          // Extraire le nodeId depuis metaSourceRef (format: "formula:id" ou "condition:id")
          const extractedNodeId = metaSourceRef.includes(':') 
            ? metaSourceRef.split(':')[1] 
            : metaSourceRef;
          
          if (!extractedNodeId || !treeId) {
            return <span style={{ color: '#888' }}>---</span>;
          }
          
          const cfg = field.config as { displayFormat?: 'number'|'currency'|'percentage'; unit?: string; decimals?: number } | undefined;
          // ✅ NOUVEAU SYSTÈME : BackendValueDisplay récupère directement la valeur du backend
          return (
            <BackendValueDisplay
              nodeId={extractedNodeId}
              treeId={treeId}
              formData={formData}
              unit={cfg?.unit}
              precision={cfg?.decimals || 2}
              placeholder="Calcul..."
            />
          );
        }
      } catch { /* ignore */ }

      // Si pas de valeur saisie, afficher placeholder
      if (rawValue == null || rawValue === undefined || rawValue === '') {
        dlog(`🔬 [TEST FALLBACK] Pas de valeur - affichage placeholder`);
        return '---';
      }

      // ✅ Afficher la valeur brute avec formatage défensif (protection contre [object Object])
      dlog(`🔬 [TEST FALLBACK] Retour valeur brute: ${rawValue}`);
      
      // 🛡️ PROTECTION : Si rawValue est un objet, extraire la valeur intelligemment
      if (typeof rawValue === 'object' && rawValue !== null) {
  dlog('⚠️ [FALLBACK OBJECT] Détection d\'un objet dans rawValue:', rawValue);
        
        // Tentative d'extraction de propriétés communes (ordre d'importance)
        const obj = rawValue as Record<string, unknown>;
        
        // 🎯 PRIORITÉ 1 : Valeurs directes du résultat backend
        const extracted = obj.value || obj.calculatedValue || obj.text || obj.result || 
                         obj.displayValue || obj.humanText || obj.label;
        
        if (extracted !== undefined && extracted !== null) {
          dlog('✅ [FALLBACK OBJECT] Valeur extraite:', extracted);
          // Si c'est encore un objet avec operationResult, extraire de là
          if (typeof extracted === 'object' && extracted !== null && 'value' in (extracted as Record<string, unknown>)) {
            return String((extracted as Record<string, unknown>).value);
          }
          return String(extracted);
        }
        
        // 🎯 PRIORITÉ 2 : Si c'est un résultat d'opération avec nested value
        if (obj.operationResult && typeof obj.operationResult === 'object') {
          const opResult = obj.operationResult as Record<string, unknown>;
          if (opResult.value !== undefined) {
            dlog('✅ [FALLBACK OBJECT] Valeur extraite depuis operationResult:', opResult.value);
            return String(opResult.value);
          }
        }
        
        // Si c'est un tableau, joindre les éléments
        if (Array.isArray(rawValue)) {
          return rawValue.join(', ');
        }
        
        // Dernier recours: JSON.stringify pour un affichage lisible
        dlog('⚠️ [FALLBACK OBJECT] Aucune propriété exploitable trouvée, affichage JSON');
        try {
          return JSON.stringify(rawValue);
        } catch {
          return String(rawValue);
        }
      }
      
      return String(rawValue);
    };

    // 🎨 Style de la carte selon le type de champ
    const getCardStyle = () => {
      let borderColor = '#0ea5e9'; // Bleu par défaut
      let backgroundColor = '#f0f9ff';
      
      // Couleurs selon le type
      if (field.type === 'number') {
        borderColor = '#059669'; // Vert pour les nombres
        backgroundColor = '#ecfdf5';
      } else if (field.type === 'select') {
        borderColor = '#7c3aed'; // Violet pour les sélections
        backgroundColor = '#faf5ff';
      } else if (field.type === 'boolean') {
        borderColor = '#dc2626'; // Rouge pour booléens
        backgroundColor = '#fef2f2';
      }
      
      return {
        textAlign: 'center' as const,
        border: `2px solid ${borderColor}`,
        borderRadius: '12px',
        backgroundColor,
        minHeight: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      };
    };

    return (
      <Col key={field.id} xs={24} sm={12} lg={6}>
        <Card
          size="small"
          style={getCardStyle()}
          styles={{ body: { padding: '12px 8px' } }}
        >
          <div>
            <Text strong style={{ 
              color: '#0ea5e9', 
              fontSize: '13px',
              display: 'block',
              marginBottom: '4px'
            }}>
              {field.label}
            </Text>
            {(() => {
              const displayValue = getDisplayValue();
              
              // 🎯 NOUVEAU SYSTÈME ULTRA-SIMPLE:
              // BackendValueDisplay retourne juste la valeur (string ou Fragment avec string)
              // La carte bleue ENVELOPPE TOUJOURS dans un <Text> avec le bon style
              
              return (
                <Text style={{ 
                  color: '#64748b', 
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {displayValue}
                </Text>
              );
            })()}
          </div>
        </Card>
      </Col>
    );
  };

  if (!isVisible) {
    return (
      <div style={{ ...getSectionStyle(), opacity: 0.3, pointerEvents: 'none' }}>
        <Card size="small">
          <div className="flex items-center gap-2 text-gray-400">
            <EyeInvisibleOutlined />
            <Text type="secondary">{section.title} (masqué par condition)</Text>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={getSectionStyle()}>
      <Card
        size={level === 0 ? 'default' : 'small'}
        className={`tbl-section-level-${level}`}
      >
        {/* En-tête de section (seulement pour les sous-sections, pas le niveau racine) */}
        {level > 0 && (
          <div className="mb-4">
            {/* Style spécial pour section "Données" */}
            {section.title === 'Données' || section.title.includes('Données') ? (
              <div 
                style={{
                  background: 'linear-gradient(135deg, #14b8a6 0%, #0891b2 100%)',
                  color: 'white',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}
              >
                <Text strong style={{ color: 'white', fontSize: '16px' }}>
                  {section.title}
                </Text>
              </div>
            ) : (
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <BranchesOutlined />
                    <Text strong style={{ fontSize: '16px' }}>
                      {section.title}
                    </Text>
                  </div>
                  
                  {section.description && (
                    <Text type="secondary" className="block mb-2">
                      {section.description}
                    </Text>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Champs de cette section */}
        {/* Forcer l'affichage des sections données même si orderedFields est vide */}
        {((section.isDataSection || section.title === 'Données' || section.title.includes('Données')) || visibilityFilteredFields.length > 0) && (
          <>
            {/* Style spécial pour les champs des sections données */}
            {(section.isDataSection || section.title === 'Données' || section.title.includes('Données')) ? (
              <div style={{ marginBottom: '16px' }}>
                <Row gutter={dataRowGutter} justify="center">
                  {(visibilityFilteredFields.length > 0 ? visibilityFilteredFields : section.fields || []).map(renderDataSectionField)}
                </Row>
              </div>
            ) : visibilityFilteredFields.length > 0 ? (
              <Row gutter={formRowGutter} className="tbl-form-row">
                {visibilityFilteredFields.map((field) => {
                  // 🚨🚨🚨 DEBUG: Log pour chaque champ rendu avec détails complets
                  console.log('��� [ULTRA DEBUG] RENDU CHAMP:', {
                    id: field.id,
                    label: field.label,
                    type: field.type,
                    isConditional: (field as any).isConditional,
                    isRepeaterButton: (field as any).isRepeaterButton,
                    parentFieldId: (field as any).parentFieldId,
                    parentOptionValue: (field as any).parentOptionValue,
                    order: field.order
                  });

                  // Debug spécifique pour les champs conditionnels
                  if ((field as any).isConditional) {
                    console.log('��� [CONDITIONAL FIELD RENDER] Rendu champ conditionnel:', {
                      id: field.id,
                      label: field.label,
                      type: field.type,
                      isConditional: (field as any).isConditional,
                      parentFieldId: (field as any).parentFieldId,
                      parentOptionValue: (field as any).parentOptionValue,
                      namespace: (field as any).namespace,
                      order: field.order,
                      shouldBeVisible: true
                    });
                  }
                  // 🔁 Gestion spéciale des boutons repeater
                  if ((field as any).isRepeaterButton) {
                    const isAddButton = field.type === 'REPEATER_ADD_BUTTON';
                    const isRemoveInstanceButton = field.type === 'REPEATER_REMOVE_INSTANCE_BUTTON';
                    const repeaterParentId = (field as any).repeaterParentId;
                    const instanceCountKey = `${repeaterParentId}_instanceCount`;
                    const instanceCount = (field as any).repeaterInstanceCount || 0;
                    const instanceIndex = (field as any).repeaterInstanceIndex;
                    const buttonSize = (field as any).repeater_buttonSize || 'middle'; // tiny, small, middle, large
                    const buttonWidth = (field as any).repeater_buttonWidth || 'auto'; // auto, half, full
                    const iconOnly = (field as any).repeater_iconOnly || false; // true = juste "+"
                    
                    // 🔍 DEBUG CRITIQUE : Afficher TOUTES les propriétés du field
                    if (isAddButton) {
                      console.log('🎯🎯🎯 [REPEATER RENDER] Rendu du bouton ADD:', {
                        fieldId: field.id,
                        fieldLabel: field.label,
                        'field.repeaterButtonSize': (field as any).repeaterButtonSize,
                        'field.repeaterButtonWidth': (field as any).repeaterButtonWidth,
                        'field.repeaterIconOnly': (field as any).repeaterIconOnly,
                        'buttonSize (utilisé)': buttonSize,
                        'buttonWidth (utilisé)': buttonWidth,
                        'iconOnly (utilisé)': iconOnly,
                        'TOUTES_LES_PROPS': field
                      });
                    }
                    
                    if (isAddButton && !(field as any).repeaterCanAdd) {
                      return null; // Ne pas afficher le bouton + si on a atteint le max
                    }
                    
                    return (
                      <Col 
                        key={field.id}
                        xs={24}
                        sm={12}
                        md={8}
                        lg={6}
                        xl={6}
                        className="mb-2"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                          minHeight: '56px'
                        }}
                      >
                        <Button
                          type={isAddButton ? "dashed" : "dashed"}
                          ghost={false}
                          size="middle"
                          danger={isRemoveInstanceButton}
                          icon={isAddButton ? <PlusOutlined /> : <MinusCircleOutlined />}
                          style={{
                            height: '32px',
                            fontSize: '14px',
                            borderRadius: '6px',
                            borderStyle: 'dashed',
                            backgroundColor: isAddButton ? '#f9f9f9' : undefined,
                            borderColor: isAddButton ? '#d9d9d9' : undefined,
                            color: isAddButton ? '#1890ff' : undefined,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 12px',
                            minWidth: 'auto'
                          }}
                          onClick={async () => {
                            if (isAddButton) {
                              // 🎯 NOUVELLE LOGIQUE: Utiliser l'API de copie réelle
                              console.log(`\n${'🚀'.repeat(30)}`);
                              console.log(`🚀🚀🚀 [CRÉATION VERSANT] Bouton "Ajouter Versant" cliqué !`);
                              console.log(`🚀 repeaterParentId: ${repeaterParentId}`);
                              console.log(`🚀 Utilisation de l'API de copie au lieu du namespace`);
                              console.log(`${'🚀'.repeat(30)}\n`);
                              
                              try {
                                // Récupérer les templates depuis les métadonnées du repeater
                                const parentField = section.fields.find(f => f.id === repeaterParentId);
                                
                                // Chercher templateNodeIds dans repeater_templateNodeIds ou metadata.repeater.templateNodeIds
                                let templateNodeIds = parentField?.repeater_templateNodeIds || [];
                                if (!Array.isArray(templateNodeIds)) {
                                  if (typeof templateNodeIds === 'string') {
                                    try {
                                      templateNodeIds = JSON.parse(templateNodeIds);
                                    } catch (e) {
                                      console.error('❌ [COPY-API] Impossible de parser repeater_templateNodeIds:', e);
                                      templateNodeIds = [];
                                    }
                                  } else {
                                    templateNodeIds = [];
                                  }
                                }
                                
                                // Fallback vers metadata.repeater.templateNodeIds
                                if (templateNodeIds.length === 0) {
                                  templateNodeIds = parentField?.metadata?.repeater?.templateNodeIds || [];
                                }
                                
                                if (templateNodeIds.length === 0) {
                                  console.error('❌ [COPY-API] Aucun template trouvé dans le repeater');
                                  console.log('🔍 [COPY-API] parentField:', parentField);
                                  return;
                                }
                                
                                console.log(`🔁 [COPY-API] Duplication des templates:`, { 
                                  repeaterParentId, 
                                  templateNodeIds 
                                });
                                
                                // Appel à l'API de copie
                                const response = await api.post(`/api/treebranchleaf/nodes/${repeaterParentId}/duplicate-templates`, {
                                  templateNodeIds
                                });
                                
                                console.log(`✅ [COPY-API] Copie créée:`, response);
                                
                                // 🔄 Recharger les données pour voir la nouvelle copie
                                console.log(`🔄 [COPY-API] Rechargement des données...`);
                                if (typeof window !== 'undefined' && window.TBL_FORCE_REFRESH) {
                                  window.TBL_FORCE_REFRESH();
                                  console.log(`✅ [COPY-API] Données rechargées !`);
                                } else {
                                  console.warn(`⚠️ [COPY-API] window.TBL_FORCE_REFRESH non disponible`);
                                }
                                
                              } catch (error) {
                                console.error('❌ [COPY-API] Erreur lors de la copie:', error);
                              }
                            } else if (isRemoveInstanceButton) {
                              // Supprimer une instance spécifique
                              dlog(`🔁 [REPEATER] Suppression instance #${instanceIndex + 1}:`, {
                                repeaterParentId,
                                instanceIndex,
                                oldCount: instanceCount
                              });
                              
                              // 🎯 Diminuer immédiatement le compteur
                              const newCount = instanceCount - 1;
                              onChange(instanceCountKey, newCount);
                              
                              // Récupérer les IDs des champs template depuis les métadonnées
                              const parentField = section.fields.find(f => f.id === repeaterParentId);
                              const rawIds = parentField?.metadata?.repeater?.templateNodeIds || [];
                              // Utiliser la même expansion que pour le rendu afin de purger toutes les clés liées
                              const templateNodeIds = expandTemplateNodeIds(rawIds);
                              
                              // Décaler toutes les instances après celle supprimée
                              for (let i = instanceIndex + 1; i < instanceCount; i++) {
                                templateNodeIds.forEach(templateId => {
                                  const currentKey = `${repeaterParentId}_${i}_${templateId}`;
                                  const previousKey = `${repeaterParentId}_${i - 1}_${templateId}`;
                                  const currentValue = formData[currentKey];
                                  onChange(previousKey, currentValue);
                                });
                              }
                              
                              // Supprimer les clés de la dernière instance (maintenant obsolète)
                              templateNodeIds.forEach(templateId => {
                                const lastKey = `${repeaterParentId}_${instanceCount - 1}_${templateId}`;
                                onChange(lastKey, undefined);
                              });
                            }
                          }}
                          disabled={disabled}
                        >
                          {!iconOnly && field.label}
                        </Button>
                      </Col>
                    );
                  }
                  
                  // 🎯 DÉTECTER LES CHAMPS CONDITIONNELS INJECTÉS
                  // Les champs conditionnels injectés ont la propriété isConditional: true
                  const isInjectedConditionalField = (field as any).isConditional === true;
                  
                  if (isInjectedConditionalField) {
                    // Rendre directement le champ conditionnel injecté
                    console.log('🚨🚨🚨 [CONDITIONAL FIELD DIRECT RENDER] Rendu champ conditionnel injecté:', {
                      id: field.id,
                      label: field.label,
                      type: field.type,
                      parentFieldId: (field as any).parentFieldId,
                      parentOptionValue: (field as any).parentOptionValue
                    });
                    
                    return (
                      <Col
                        key={field.id}
                        xs={24}
                        sm={12}
                        md={field.type === 'textarea' || field.type === 'TEXTAREA' ? 24 : 8}
                        lg={field.type === 'textarea' || field.type === 'TEXTAREA' ? 24 : 6}
                        xl={field.type === 'textarea' || field.type === 'TEXTAREA' ? 24 : 6}
                        className="mb-2 tbl-form-col conditional-field-injected"
                      >
                        <TBLFieldRendererAdvanced
                          field={field}
                          value={(() => {
                            const rawValue = formData[field.id];
                            if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
                              return rawValue.value ?? rawValue.calculatedValue ?? rawValue.operationResult?.value ?? rawValue;
                            }
                            return rawValue;
                          })()}
                          allNodes={allNodes}
                          onChange={(value) => {
                            console.log('🔄 [CONDITIONAL FIELD] onChange pour champ conditionnel injecté:', field.id, value);
                            onChange(field.id, value);

                            // Synchronisation miroir pour les champs conditionnels
                            try {
                              const label = (field.label || '').toString();
                              const mirrorTargetLabel = (field as any).mirrorTargetLabel;
                              const baseLabel = mirrorTargetLabel || label;
                              
                              if (baseLabel) {
                                const mirrorKey = `__mirror_data_${baseLabel}`;
                                console.log('🪞 [CONDITIONAL MIRROR] Synchronisation:', baseLabel, '->', mirrorKey, '=', value);
                                onChange(mirrorKey, value);
                              }
                            } catch (e) {
                              console.warn('⚠️ [CONDITIONAL MIRROR] Erreur:', e);
                            }
                          }}
                          disabled={disabled}
                          formData={formData}
                          treeMetadata={field.treeMetadata}
                          treeId={treeId}
                        />
                      </Col>
                    );
                  }

                  // 🎯 INJECTION CONDITIONALFIELDS POUR REPEATERS - DÉSACTIVÉE
                  // ❌ CETTE INJECTION EST MAINTENANT DÉSACTIVÉE CAR LES CHAMPS CONDITIONNELS 
                  // SONT DÉJÀ GÉRÉS PAR LE SYSTÈME INTÉGRÉ DANS orderedFields
                  // Cette injection directe causait des doublons de champs conditionnels
                  const shouldInjectConditionalFields = (_field: any) => {
                    // ❌ DÉSACTIVÉ - retourne toujours false pour éviter la double injection
                    return false;
                    
                    // Code original commenté pour référence :
                    // const isSelectField = field.type === 'select' || field.type === 'SELECT' || field.type === 'cascade';
                    // const hasOptions = field.options && Array.isArray(field.options) && field.options.length > 0;
                    // const isCascadeWithoutOptions = field.type === 'cascade' && (!field.options || field.options.length === 0);
                    // return (isSelectField && hasOptions) || isCascadeWithoutOptions;
                  };

                  // ❌ CETTE SECTION EST MAINTENANT DÉSACTIVÉE - LES CHAMPS CONDITIONNELS 
                  // SONT GÉRÉS PAR LE SYSTÈME INTÉGRÉ DANS orderedFields
                  if (shouldInjectConditionalFields(field)) {
                    const _repeaterNamespace = (field as any).repeaterNamespace as RepeaterNamespaceMeta | undefined;

                    // Récupérer la valeur pour ce field (priorité au namespacé, puis original)
                    let selectedValue = formData[field.id];
                    
                    if (selectedValue && field.options) {
                      // Chercher l'option sélectionnée
                      const selectedOption = field.options.find((opt: any) => opt.value === selectedValue);
                      
                      if (selectedOption && selectedOption.conditionalFields && selectedOption.conditionalFields.length > 0) {
                        console.log('🚨🚨🚨 [CONDITIONAL FIELD DIRECT RENDER] Rendu champ conditionnel injecté:', {
                          id: condField.id,
                          label: condField.label,
                          type: condField.type,
                          parentFieldId: field.id,
                          parentOptionValue: selectedValue
                        });
                        
                        // ⚡ INJECTION RÉELLE : Rendre les conditionalFields directement après le champ
                        const conditionalFieldsToRender = selectedOption.conditionalFields.map((condField: any, condIdx: number) => {
                          
                          return (
                            <Col
                              key={`${field.id}_conditional_${condIdx}`}
                              xs={24}
                              sm={12}
                              md={condField.type === 'textarea' || condField.type === 'TEXTAREA' ? 24 : 8}
                              lg={condField.type === 'textarea' || condField.type === 'TEXTAREA' ? 24 : 6}
                              xl={condField.type === 'textarea' || condField.type === 'TEXTAREA' ? 24 : 6}
                              className="mb-2 tbl-form-col"
                            >
                              <TBLFieldRendererAdvanced
                                field={condField}
                                value={(() => {
                                  const rawValue = formData[condField.id];
                                  if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
                                    return rawValue.value ?? rawValue.calculatedValue ?? rawValue.operationResult?.value ?? rawValue;
                                  }
                                  return rawValue;
                                })()}
                                allNodes={allNodes}
                                onChange={(value) => {
                                  onChange(condField.id, value);

                                  // Synchronisation miroir pour les conditionalFields
                                  try {
                                    const label = (condField.label || '').toString();
                                    const repeaterNamespace = (condField as unknown as Record<string, unknown>).repeaterNamespace as RepeaterNamespaceMeta | undefined;
                                    
                                    let cleanLabel = label;
                                    if (repeaterNamespace?.labelPrefix) {
                                      const prefix = repeaterNamespace.labelPrefix;
                                      if (label.startsWith(prefix)) {
                                        cleanLabel = label.substring(prefix.length).replace(/^\s*-\s*/, '').trim();
                                      }
                                    }
                                    
                                    if (cleanLabel) {
                                      const mirrorKey = `__mirror_data_${cleanLabel}`;
                                      onChange(mirrorKey, value);
                                    }
                                  } catch (e) {
                                    console.warn('⚠️ [REPEATER INJECTION MIRROR] Erreur:', e);
                                  }
                                }}
                                disabled={disabled}
                                formData={formData}
                                treeMetadata={condField.treeMetadata}
                                treeId={treeId}
                              />
                            </Col>
                          );
                        });
                        
                        // Retourner un Fragment contenant le champ principal ET ses conditionalFields
                        return (
                          <React.Fragment key={field.id}>
                            {/* Champ principal */}
                            <Col
                              xs={24}
                              sm={12}
                              md={field.type === 'textarea' || field.type === 'TEXTAREA' ? 24 : 8}
                              lg={field.type === 'textarea' || field.type === 'TEXTAREA' ? 24 : 6}
                              xl={field.type === 'textarea' || field.type === 'TEXTAREA' ? 24 : 6}
                              className="mb-2 tbl-form-col"
                            >
                              <TBLFieldRendererAdvanced
                                field={field}
                                value={(() => {
                                  const rawValue = formData[field.id];
                                  if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
                                    return rawValue.value ?? rawValue.calculatedValue ?? rawValue.operationResult?.value ?? rawValue;
                                  }
                                  return rawValue;
                                })()}
                                allNodes={allNodes}
                                onChange={(value) => {
                                  dlog(`🔄 [SECTION RENDERER] onChange appelé pour ${field.id}:`, value);
                                  onChange(field.id, value);

                                  // Synchronisation miroir normale
                                  try {
                                    const label = (field.label || '').toString();
                                    const repeaterNamespace = (field as unknown as Record<string, unknown>).repeaterNamespace as RepeaterNamespaceMeta | undefined;
                                    const isRepeaterInstance = Boolean(repeaterNamespace);
                                    
                                    let cleanLabel = label;
                                    if (isRepeaterInstance && repeaterNamespace?.labelPrefix) {
                                      const prefix = repeaterNamespace.labelPrefix;
                                      if (label.startsWith(prefix)) {
                                        cleanLabel = label.substring(prefix.length).replace(/^\s*-\s*/, '').trim();
                                        dlog(`🔧 [MIRROR][NAMESPACE] Label nettoyé: "${label}" -> "${cleanLabel}"`);
                                      }
                                    }
                                    
                                    if (cleanLabel) {
                                      const mirrorKey = `__mirror_data_${cleanLabel}`;
                                      dlog(`🪞 [MIRROR][UNIVERSAL] Synchronisation: "${cleanLabel}" -> ${mirrorKey} = ${value}`);
                                      onChange(mirrorKey, value);
                                    }
                                  } catch (e) {
                                    console.warn('⚠️ [MIRROR] Impossible de créer la valeur miroir:', e);
                                  }
                                }}
                                disabled={disabled}
                                formData={formData}
                                treeMetadata={field.treeMetadata}
                                treeId={treeId}
                              />
                            </Col>
                            {/* ConditionalFields injectés */}
                            {conditionalFieldsToRender}
                          </React.Fragment>
                        );
                      }
                    }
                  }

                  // Rendu normal des champs (si pas d'injection de conditionalFields)
                  return (
                    <Col
                      key={field.id}
                      xs={24}
                      sm={12}
                      md={field.type === 'textarea' || field.type === 'TEXTAREA' ? 24 : 8}
                      lg={field.type === 'textarea' || field.type === 'TEXTAREA' ? 24 : 6}
                      xl={field.type === 'textarea' || field.type === 'TEXTAREA' ? 24 : 6}
                      className="mb-2 tbl-form-col"
                    >
                      {/* 🗑️ BOUTON DE SUPPRESSION ET ➕ AJOUT POUR LES COPIES */}
                      {(field.isDeletableCopy || field.canAddNewCopy) && (
                        <div style={{ 
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px'
                        }}>
                          <div style={{ flex: 1 }}>
                            <TBLFieldRendererAdvanced
                              field={field}
                              value={(() => {
                                const rawValue = formData[field.id];
                                if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
                                  return rawValue.value ?? rawValue.calculatedValue ?? rawValue.operationResult?.value ?? rawValue;
                                }
                                return rawValue;
                              })()}
                              allNodes={allNodes}
                              onChange={(value) => {
                                dlog(`🔄 [SECTION RENDERER] onChange appelé pour ${field.id}:`, value);
                                onChange(field.id, value);

                                // Synchronisation miroir normale
                                try {
                                  const label = (field.label || '').toString();
                                  const repeaterNamespace = (field as unknown as Record<string, unknown>).repeaterNamespace as RepeaterNamespaceMeta | undefined;
                                  const isRepeaterInstance = Boolean(repeaterNamespace);
                                  
                                  let cleanLabel = label;
                                  if (isRepeaterInstance && repeaterNamespace?.labelPrefix) {
                                    const prefix = repeaterNamespace.labelPrefix;
                                    if (label.startsWith(prefix)) {
                                      cleanLabel = label.substring(prefix.length).replace(/^\s*-\s*/, '').trim();
                                      dlog(`🔧 [MIRROR][NAMESPACE] Label nettoyé: "${label}" -> "${cleanLabel}"`);
                                    }
                                  }
                                  
                                  if (cleanLabel) {
                                    const mirrorKey = `__mirror_data_${cleanLabel}`;
                                    dlog(`🪞 [MIRROR][UNIVERSAL] Synchronisation: "${cleanLabel}" -> ${mirrorKey} = ${value}`);
                                    onChange(mirrorKey, value);
                                  }
                                } catch (e) {
                                  console.warn('⚠️ [MIRROR] Impossible de créer la valeur miroir:', e);
                                }
                              }}
                              disabled={disabled}
                              formData={formData}
                              treeMetadata={field.treeMetadata}
                              treeId={treeId}
                            />
                          </div>
                          
                          {/* BOUTONS D'ACTION */}
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {/* ➕ BOUTON AJOUTER NOUVEAU VERSANT */}
                            {field.canAddNewCopy && (
                              <Button
                                type="primary"
                                ghost
                                size="small"
                                icon={<PlusOutlined />}
                                title="Ajouter un nouveau versant"
                                style={{
                                  marginTop: '4px',
                                  minWidth: '24px',
                                  height: '24px',
                                  padding: '0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                onClick={async () => {
                                  console.log(`➕ [ADD NEW COPY] Création d'une nouvelle copie depuis:`, {
                                    fieldId: field.id,
                                    fieldLabel: field.label,
                                    parentRepeaterId: field.parentRepeaterId || field.id
                                  });

                                  try {
                                    // Récupérer l'ID du repeater parent
                                    const repeaterParentId = field.parentRepeaterId || section.fields.find(f => f.metadata?.repeater?.templateNodeIds?.includes(field.id))?.id;
                                    
                                    if (!repeaterParentId) {
                                      console.error('❌ [ADD NEW COPY] Impossible de trouver le repeater parent');
                                      return;
                                    }

                                    // Récupérer les templates depuis les métadonnées du repeater
                                    const parentField = section.fields.find(f => f.id === repeaterParentId);
                                    
                                    let templateNodeIds = parentField?.repeater_templateNodeIds || [];
                                    if (!Array.isArray(templateNodeIds)) {
                                      if (typeof templateNodeIds === 'string') {
                                        try {
                                          templateNodeIds = JSON.parse(templateNodeIds);
                                        } catch (e) {
                                          console.error('❌ [ADD NEW COPY] Impossible de parser repeater_templateNodeIds:', e);
                                          templateNodeIds = [];
                                        }
                                      } else {
                                        templateNodeIds = [];
                                      }
                                    }
                                    
                                    // Fallback vers metadata.repeater.templateNodeIds
                                    if (templateNodeIds.length === 0) {
                                      templateNodeIds = parentField?.metadata?.repeater?.templateNodeIds || [];
                                    }
                                    
                                    if (templateNodeIds.length === 0) {
                                      console.error('❌ [ADD NEW COPY] Aucun template trouvé dans le repeater');
                                      console.log('🔍 [ADD NEW COPY] parentField:', parentField);
                                      return;
                                    }
                                    
                                    console.log(`🔁 [ADD NEW COPY] Duplication des templates:`, { 
                                      repeaterParentId, 
                                      templateNodeIds 
                                    });
                                    
                                    // Appel à l'API de copie
                                    const response = await api.post(`/api/treebranchleaf/nodes/${repeaterParentId}/duplicate-templates`, {
                                      templateNodeIds
                                    });
                                    
                                    console.log(`✅ [ADD NEW COPY] Copie créée:`, response);
                                    
                                    // 🔄 Recharger les données pour voir la nouvelle copie
                                    console.log(`🔄 [ADD NEW COPY] Rechargement des données...`);
                                    if (typeof window !== 'undefined' && window.TBL_FORCE_REFRESH) {
                                      window.TBL_FORCE_REFRESH();
                                      console.log(`✅ [ADD NEW COPY] Données rechargées !`);
                                    } else {
                                      console.warn(`⚠️ [ADD NEW COPY] window.TBL_FORCE_REFRESH non disponible`);
                                    }
                                    
                                  } catch (error) {
                                    console.error('❌ [ADD NEW COPY] Erreur lors de la copie:', error);
                                  }
                                }}
                              />
                            )}
                            
                            {/* 🗑️ BOUTON SUPPRIMER COPIE */}
                            {field.isDeletableCopy && (
                              <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                title={`Supprimer ${field.label}`}
                                style={{
                                  marginTop: '4px',
                                  minWidth: '24px',
                                  height: '24px',
                                  padding: '0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                onClick={async () => {
                                  console.log(`🗑️ [DELETE COPY] Suppression de la copie:`, {
                                    fieldId: field.id,
                                    fieldLabel: field.label,
                                    sourceTemplateId: field.sourceTemplateId,
                                    parentRepeaterId: field.parentRepeaterId
                                  });

                                  try {
                                    // Appel à l'API de suppression
                                    await api.delete(`/api/treebranchleaf/trees/${treeId}/nodes/${field.id}`);
                                    
                                    console.log(`✅ [DELETE COPY] Copie supprimée avec succès:`, field.id);
                                    
                                    // 🔄 Recharger les données pour voir la suppression
                                    if (typeof window !== 'undefined' && window.TBL_FORCE_REFRESH) {
                                      window.TBL_FORCE_REFRESH();
                                      console.log(`✅ [DELETE COPY] Données rechargées !`);
                                    } else {
                                      console.warn(`⚠️ [DELETE COPY] window.TBL_FORCE_REFRESH non disponible`);
                                    }
                                    
                                  } catch (error) {
                                    console.error('❌ [DELETE COPY] Erreur lors de la suppression:', error);
                                  }
                                }}
                              />
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* RENDU NORMAL (sans boutons d'action) */}
                      {!field.isDeletableCopy && !field.canAddNewCopy && (
                        <TBLFieldRendererAdvanced
                          field={field}
                          value={(() => {
                            const rawValue = formData[field.id];
                            // Si c'est un objet avec value/calculatedValue (réponse backend), extraire
                            if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
                              return rawValue.value ?? rawValue.calculatedValue ?? rawValue.operationResult?.value ?? rawValue;
                            }
                            return rawValue;
                          })()}
                          allNodes={allNodes}
                          onChange={(value) => {
                          dlog(`🔄 [SECTION RENDERER] onChange appelé pour ${field.id}:`, value);
                          dlog(`🔄 [SECTION RENDERER] Ancienne valeur:`, formData[field.id]);
                          onChange(field.id, value);

                          // ✨ Mécanisme de miroir UNIVERSEL - synchronise TOUS les champs vers leurs miroirs
                          try {
                            const label = (field.label || '').toString();
                            
                            // 🔧 NETTOYAGE DES LABELS POUR LES INSTANCES RÉPÉTÉES
                            // Si le champ provient d'un repeater, on retire le préfixe de namespace
                            // pour que les clones écrivent dans les MÊMES clés miroir que l'original
                            const repeaterNamespace = (field as unknown as Record<string, unknown>).repeaterNamespace as RepeaterNamespaceMeta | undefined;
                            const isRepeaterInstance = Boolean(repeaterNamespace);
                            
                            let cleanLabel = label;
                            if (isRepeaterInstance && repeaterNamespace?.labelPrefix) {
                              const prefix = repeaterNamespace.labelPrefix;
                              // Si le label commence par le préfixe (ex: "Versant 1 - Orientation")
                              if (label.startsWith(prefix)) {
                                // Retirer le préfixe et le " - " qui suit pour obtenir "Orientation"
                                cleanLabel = label.substring(prefix.length).replace(/^\s*-\s*/, '').trim();
                                dlog(`🔧 [MIRROR][NAMESPACE] Label nettoyé: "${label}" -> "${cleanLabel}"`);
                              }
                            }
                            
                            // 🎯 TOUJOURS créer le miroir par label (plus seulement les conditionnels)
                            // Utiliser le label NETTOYÉ pour que les instances répétées et l'original partagent la même clé
                            if (cleanLabel) {
                              const mirrorKey = `__mirror_data_${cleanLabel}`;
                              dlog(`🪞 [MIRROR][UNIVERSAL] Synchronisation: "${cleanLabel}" -> ${mirrorKey} = ${value}`);
                              onChange(mirrorKey, value);
                              
                              // Synchroniser aussi vers window.TBL_FORM_DATA
                              if (typeof window !== 'undefined' && window.TBL_FORM_DATA) {
                                window.TBL_FORM_DATA[mirrorKey] = value;
                                
                                // Synchroniser toutes les variantes du miroir
                                Object.keys(window.TBL_FORM_DATA).forEach(key => {
                                  if (key.startsWith('__mirror_data_') && 
                                      (key.includes(cleanLabel) || 
                                       key.includes(cleanLabel.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()) ||
                                       key === mirrorKey)) {
                                    window.TBL_FORM_DATA[key] = value;
                                    dlog(`🔄 [MIRROR][VARIANT] ${key} = ${value}`);
                                  }
                                });
                              }
                            }
                            
                            // 🔧 Logique spéciale pour les champs conditionnels (conservée)
                            const isConditional = Boolean(field.isConditional) || /\s-\s/.test(label);
                            if (isConditional) {
                              const explicitTarget = (field as unknown as { mirrorTargetLabel?: string }).mirrorTargetLabel;
                              const baseLabel = explicitTarget || cleanLabel.replace(/\s*-\s*Champ.*$/i, '').trim();
                              if (baseLabel && baseLabel !== cleanLabel) {
                                const conditionalMirrorKey = `__mirror_data_${baseLabel}`;
                                dlog(`🪞 [MIRROR][CONDITIONAL] Mise à jour de la valeur miroir pour "${baseLabel}" -> key=${conditionalMirrorKey}:`, value);
                                onChange(conditionalMirrorKey, value);
                              }
                            }
                          } catch (e) {
                            console.warn('⚠️ [MIRROR] Impossible de créer la valeur miroir:', e);
                          }
                        }}
                        field={field}
                        value={(() => {
                          const rawValue = formData[field.id];
                          // Si c'est un objet avec value/calculatedValue (réponse backend), extraire
                          if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
                            return rawValue.value ?? rawValue.calculatedValue ?? rawValue.operationResult?.value ?? rawValue;
                          }
                          return rawValue;
                        })()}
                        allNodes={allNodes}
                        onChange={(value) => {
                        dlog(`🔄 [SECTION RENDERER] onChange appelé pour ${field.id}:`, value);
                        dlog(`🔄 [SECTION RENDERER] Ancienne valeur:`, formData[field.id]);
                        onChange(field.id, value);

                        // ✨ Mécanisme de miroir UNIVERSEL - synchronise TOUS les champs vers leurs miroirs
                        try {
                          const label = (field.label || '').toString();
                          
                          // 🔧 NETTOYAGE DES LABELS POUR LES INSTANCES RÉPÉTÉES
                          // Si le champ provient d'un repeater, on retire le préfixe de namespace
                          // pour que les clones écrivent dans les MÊMES clés miroir que l'original
                          const repeaterNamespace = (field as unknown as Record<string, unknown>).repeaterNamespace as RepeaterNamespaceMeta | undefined;
                          const isRepeaterInstance = Boolean(repeaterNamespace);
                          
                          let cleanLabel = label;
                          if (isRepeaterInstance && repeaterNamespace?.labelPrefix) {
                            const prefix = repeaterNamespace.labelPrefix;
                            // Si le label commence par le préfixe (ex: "Versant 1 - Orientation")
                            if (label.startsWith(prefix)) {
                              // Retirer le préfixe et le " - " qui suit pour obtenir "Orientation"
                              cleanLabel = label.substring(prefix.length).replace(/^\s*-\s*/, '').trim();
                              dlog(`🔧 [MIRROR][NAMESPACE] Label nettoyé: "${label}" -> "${cleanLabel}"`);
                            }
                          }
                          
                          // 🎯 TOUJOURS créer le miroir par label (plus seulement les conditionnels)
                          // Utiliser le label NETTOYÉ pour que les instances répétées et l'original partagent la même clé
                          if (cleanLabel) {
                            const mirrorKey = `__mirror_data_${cleanLabel}`;
                            dlog(`🪞 [MIRROR][UNIVERSAL] Synchronisation: "${cleanLabel}" -> ${mirrorKey} = ${value}`);
                            onChange(mirrorKey, value);
                            
                            // Synchroniser aussi vers window.TBL_FORM_DATA
                            if (typeof window !== 'undefined' && window.TBL_FORM_DATA) {
                              window.TBL_FORM_DATA[mirrorKey] = value;
                              
                              // Synchroniser toutes les variantes du miroir
                              Object.keys(window.TBL_FORM_DATA).forEach(key => {
                                if (key.startsWith('__mirror_data_') && 
                                    (key.includes(cleanLabel) || 
                                     key.includes(cleanLabel.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()) ||
                                     key === mirrorKey)) {
                                  window.TBL_FORM_DATA[key] = value;
                                  dlog(`🔄 [MIRROR][VARIANT] ${key} = ${value}`);
                                }
                              });
                            }
                          }
                          
                          // 🔧 Logique spéciale pour les champs conditionnels (conservée)
                          const isConditional = Boolean(field.isConditional) || /\s-\s/.test(label);
                          if (isConditional) {
                            const explicitTarget = (field as unknown as { mirrorTargetLabel?: string }).mirrorTargetLabel;
                            const baseLabel = explicitTarget || cleanLabel.replace(/\s*-\s*Champ.*$/i, '').trim();
                            if (baseLabel && baseLabel !== cleanLabel) {
                              const conditionalMirrorKey = `__mirror_data_${baseLabel}`;
                              dlog(`🪞 [MIRROR][CONDITIONAL] Mise à jour de la valeur miroir pour "${baseLabel}" -> key=${conditionalMirrorKey}:`, value);
                              onChange(conditionalMirrorKey, value);
                            }
                          }
                        } catch (e) {
                          console.warn('⚠️ [MIRROR] Impossible de créer la valeur miroir:', e);
                        }
                      }}
                          disabled={disabled}
                          formData={formData}
                          treeMetadata={field.treeMetadata}
                          treeId={treeId}
                        />
                      )}
                    </Col>
                  );
                })}
              </Row>
            ) : null}
            
            {section.subsections && section.subsections.length > 0 && (
              <Divider />
            )}
          </>
        )}

        {/* Sous-sections (récursif) */}
        {section.subsections && section.subsections.length > 0 && (
          <div className="mt-4">
            {level < 2 ? (
              // Affichage direct pour les premiers niveaux
              <>
                {section.subsections.map((subsection) => (
                  <TBLSectionRenderer
                    key={subsection.id}
                    section={subsection}
                    formData={formData}
                    onChange={onChange}
                    treeId={treeId}
                    allNodes={allNodes}
                    disabled={disabled}
                    level={level + 1}
                    parentConditions={parentConditions}
                  />
                ))}
              </>
            ) : (
              // Affichage en accordéon pour les niveaux plus profonds
              <Collapse size="small" ghost>
                {section.subsections.map((subsection) => (
                  <Panel 
                    key={subsection.id} 
                    header={
                      <div className="flex items-center gap-2">
                        <BranchesOutlined />
                        <span>{subsection.title}</span>
                        <Tag size="small" color="geekblue">
                          {subsection.fields.length} champs
                        </Tag>
                      </div>
                    }
                  >
                    <TBLSectionRenderer
                      section={subsection}
                      formData={formData}
                      onChange={onChange}
                      treeId={treeId}
                      allNodes={allNodes}
                      disabled={disabled}
                      level={level + 1}
                      parentConditions={parentConditions}
                    />
                  </Panel>
                ))}
              </Collapse>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default TBLSectionRenderer;
