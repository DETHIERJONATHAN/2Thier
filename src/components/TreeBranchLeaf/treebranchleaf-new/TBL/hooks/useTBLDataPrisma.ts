import { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';

/**
 * 🌳 INTERFACE PRISMA EXACTE - TreeBranchLeafNode
 * Copie EXACTE du schéma Prisma - AUCUNE modification !
 */
interface TreeBranchLeafNode {
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
  fieldConfig: Record<string, unknown> | null;
  conditionConfig: Record<string, unknown> | null;
  formulaConfig: Record<string, unknown> | null;
  tableConfig: Record<string, unknown> | null;
  apiConfig: Record<string, unknown> | null;
  linkConfig: Record<string, unknown> | null;
  defaultValue: string | null;
  calculatedValue: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  hasAPI: boolean;
  hasCondition: boolean;
  hasData: boolean;
  hasFormula: boolean;
  hasLink: boolean;
  hasMarkers: boolean;
  hasTable: boolean;
  
  // Type de champ spécifique
  fieldType: string | null;
  fieldSubType: string | null;
  
  // Apparence générale
  appearance_size: string | null;
  appearance_width: string | null;
  appearance_variant: string | null;
  
  // Configuration champs texte
  text_placeholder: string | null;
  text_maxLength: number | null;
  text_minLength: number | null;
  text_mask: string | null;
  text_regex: string | null;
  text_rows: number | null;
  
  // Configuration champs nombre
  number_min: number | null;
  number_max: number | null;
  number_step: number | null;
  number_decimals: number | null;
  number_prefix: string | null;
  number_suffix: string | null;
  number_unit: string | null;
  number_defaultValue: number | null;
  
  // Configuration champs sélection
  select_multiple: boolean | null;
  select_searchable: boolean | null;
  select_allowClear: boolean | null;
  select_defaultValue: string | null;
  select_options: Record<string, unknown> | null;
  
  // Configuration champs booléen
  bool_trueLabel: string | null;
  bool_falseLabel: string | null;
  bool_defaultValue: boolean | null;
  
  // Configuration champs date
  date_format: string | null;
  date_showTime: boolean | null;
  date_minDate: Date | null;
  date_maxDate: Date | null;
  
  // Configuration champs image
  image_maxSize: number | null;
  image_ratio: string | null;
  image_crop: boolean | null;
  image_thumbnails: Record<string, unknown> | null;
  
  // Configuration capacité Data
  data_instances: Record<string, unknown> | null;
  data_activeId: string | null;
  data_exposedKey: string | null;
  data_displayFormat: string | null;
  data_unit: string | null;
  data_precision: number | null;
  data_visibleToUser: boolean | null;
  
  // Configuration capacité Formula
  formula_instances: Record<string, unknown> | null;
  formula_activeId: string | null;
  formula_tokens: Record<string, unknown> | null;
  formula_name: string | null;
  
  // Configuration capacité Condition
  condition_instances: Record<string, unknown> | null;
  condition_activeId: string | null;
  condition_mode: string | null;
  condition_branches: Record<string, unknown> | null;
  condition_tokens: Record<string, unknown> | null;
  
  // Configuration capacité Table
  table_instances: Record<string, unknown> | null;
  table_activeId: string | null;
  table_type: string | null;
  table_name: string | null;
  table_columns: Record<string, unknown> | null;
  table_rows: Record<string, unknown> | null;
  table_data: Record<string, unknown> | null;
  table_meta: Record<string, unknown> | null;
  table_isImported: boolean | null;
  table_importSource: string | null;
  
  // Configuration capacité API
  api_instances: Record<string, unknown> | null;
  api_activeId: string | null;
  api_bodyVars: Record<string, unknown> | null;
  api_name: string | null;
  
  // Configuration capacité Link
  link_instances: Record<string, unknown> | null;
  link_activeId: string | null;
  link_targetTreeId: string | null;
  link_targetNodeId: string | null;
  link_mode: string | null;
  link_carryContext: boolean | null;
  link_params: Record<string, unknown> | null;
  link_name: string | null;
  
  // Configuration capacité Markers
  markers_instances: Record<string, unknown> | null;
  markers_activeId: string | null;
  markers_selectedIds: Record<string, unknown> | null;
  markers_available: Record<string, unknown> | null;
  markers_name: string | null;
  
  // Configuration O+C (Option + Champ)
  option_label: string | null;
  field_label: string | null;
}

/**
 * 🎯 INTERFACES TBL - EXACTEMENT selon la structure TreeBranchLeaf
 */

// CHAMP - Depuis une feuille TreeBranchLeaf
export interface TBLField {
  id: string;
  label: string;
  type: string; // Depuis fieldType
  subType?: string; // Depuis fieldSubType
  required: boolean; // Depuis isRequired
  visible: boolean; // Depuis isVisible
  value?: string | number | boolean | null; // Depuis value ou defaultValue
  
  // Configuration complète depuis les colonnes spécialisées
  config: {
    // Apparence
    size?: string;
    width?: string;
    variant?: string;
    
    // Selon le type de champ
    text?: {
      placeholder?: string;
      maxLength?: number;
      minLength?: number;
      mask?: string;
      regex?: string;
      rows?: number;
    };
    
    number?: {
      min?: number;
      max?: number;
      step?: number;
      decimals?: number;
      prefix?: string;
      suffix?: string;
      unit?: string;
      defaultValue?: number;
    };
    
    select?: {
      multiple?: boolean;
      searchable?: boolean;
      allowClear?: boolean;
      defaultValue?: string;
      options?: Record<string, unknown>;
    };
    
    bool?: {
      trueLabel?: string;
      falseLabel?: string;
      defaultValue?: boolean;
    };
    
    date?: {
      format?: string;
      showTime?: boolean;
      minDate?: Date;
      maxDate?: Date;
    };
    
    image?: {
      maxSize?: number;
      ratio?: string;
      crop?: boolean;
      thumbnails?: Record<string, unknown>;
    };
  };
  
  // Capacités activées
  capabilities: {
    hasData: boolean;
    hasFormula: boolean;
    hasCondition: boolean;
    hasTable: boolean;
    hasAPI: boolean;
    hasLink: boolean;
    hasMarkers: boolean;
  };
  
  order: number;
  parentId?: string;
}

// SECTION - Depuis une sous-branche TreeBranchLeaf 
export interface TBLSection {
  id: string;
  label: string;
  description?: string;
  icon?: string; // Depuis metadata.icon
  fields: TBLField[];
  subsections?: TBLSection[]; // Récursif pour sous-branches (OPTIONNEL)
  options?: TBLOption[]; // Options de liste déroulante (OPTIONNEL)
  order: number;
  parentId?: string;
}

// OPTION - Depuis leaf_option TreeBranchLeaf
export interface TBLOption {
  id: string;
  label: string;
  value: string;
  field?: TBLField; // Si option + champ (option_field)
  order: number;
,
}

// ONGLET - Depuis une branche TreeBranchLeaf niveau 1
export interface TBLTab {
  id: string;
  label: string;
  description?: string;
  icon?: string; // Depuis metadata.icon
  sections: TBLSection[];
  fields: TBLField[]; // Champs directs dans l'onglet
  order: number;
}

// ARBRE - Depuis TreeBranchLeafTree
export interface TBLTree {
  id: string;
  name: string;
  tabs: TBLTab[];
}

/**
 * 🚀 HOOK PRINCIPAL - Transformation DYNAMIQUE PRISMA
 */
interface UseTBLDataPrismaParams {
  treeId: string;
}

interface UseTBLDataPrismaReturn {
  tree: TBLTree | null;
  loading: boolean;
  error: string | null;
}

export const useTBLDataPrisma = ({ treeId }: UseTBLDataPrismaParams): UseTBLDataPrismaReturn => {
  const { api } = useAuthenticatedApi();
  const [tree, setTree] = useState<TBLTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 🔧 TRANSFORMATION : TreeBranchLeafNode → TBLField
   * Respecte EXACTEMENT toutes les colonnes Prisma
   */
  const createTBLFieldFromNode = useCallback((node: TreeBranchLeafNode): TBLField => {
    // console.log(...) // ✨ Log réduit - objet de debug

    // Icône depuis metadata
    let icon = '📋'; // Icône par défaut
    if (node.metadata && typeof node.metadata === 'object') {
      const meta = node.metadata as Record<string, unknown>;
      if (meta.icon && typeof meta.icon === 'string') {
        icon = meta.icon;
      }
    }

    return {
      id: node.id,
      label: node.label,
      description: node.description || undefined,
      icon,
      fields: fields.sort((a, b) => a.order - b.order),
      subsections: subsections.sort((a, b) => a.order - b.order),
      options: options.sort((a, b) => a.order - b.order),
      order: node.order,
      parentId: node.parentId || undefined,
    };
  }, [createTBLFieldFromNode, createTBLOptionFromNode]);

  /**
   * 📡 RÉCUPÉRATION ET TRANSFORMATION DES DONNÉES
   */
  const fetchAndTransformData = useCallback(async () => {
    if (!treeId) return;

    try {
      setLoading(true);
      setError(null);

      // console.log('📡 [fetchAndTransformData] Début récupération:', { treeId }); // ✨ Log réduit

      // Récupérer tous les nœuds de l'arbre
      const nodes = await api.get(`/api/treebranchleaf/trees/${treeId}/nodes`) as TreeBranchLeafNode[];
      
      // console.log(...) // ✨ Log réduit - objet de debug

        // Icône de l'onglet depuis metadata
        let tabIcon = '📄'; // Icône par défaut
        if (tabNode.metadata && typeof tabNode.metadata === 'object') {
          const meta = tabNode.metadata as Record<string, unknown>;
          if (meta.icon && typeof meta.icon === 'string') {
            tabIcon = meta.icon;
          }
        }

        return {
          id: tabNode.id,
          label: tabNode.label,
          description: tabNode.description || undefined,
          icon: tabIcon,
          sections: sections.sort((a, b) => a.order - b.order),
          fields: directFields.sort((a, b) => a.order - b.order),
          order: tabNode.order,
        };
      const transformedTree: TBLTree = {
        id: treeId,
        name: treeName,
        tabs: tabs.sort((a, b) => a.order - b.order),
      };

      // console.log(...) // ✨ Log réduit

      // {
        // treeName,

          // acc + tab.fields.length + tab.sections.reduce((sacc, section) => sacc + section.fields.length, 0), 0
        // )

      // }

      setTree(transformedTree);

    } catch (err) {
      console.error('❌ [fetchAndTransformData] Erreur:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [treeId, api, createTBLSectionFromNode, createTBLFieldFromNode]);

  useEffect(() => {
    fetchAndTransformData();
  }, [fetchAndTransformData]);

  return {
    tree,
    loading,
    error,
  };
};
