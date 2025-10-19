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
import { CalculatedFieldDisplay } from './CalculatedFieldDisplay';
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
  MinusCircleOutlined
} from '@ant-design/icons';
import TBLFieldRendererAdvanced from './TBLFieldRendererAdvanced';
import type { TBLSection, TBLField } from '../hooks/useTBLDataPrismaComplete';
import type { TBLFormData } from '../hooks/useTBLSave';
import { buildMirrorKeys } from '../utils/mirrorNormalization';
import type { RawTreeNode } from '../types';

declare global {
  interface Window {
    TBL_CASCADER_NODE_IDS?: Record<string, string>;
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
        maxDate: node.date_maxDate ?? undefined,
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
  }, []);

  // Cache de logs pour éviter répétitions massives
  const lastInjectionHashRef = useRef<string>('');
  // Section structure log (gated)
  dlog(`🔍 [TBL-SECTION] Level ${level} - Section "${section.title}":`, {
    id: section.id,
    title: section.title,
    fieldsCount: section.fields?.length || 0,
    subsectionsCount: section.subsections?.length || 0,
    subsections: section.subsections?.map(s => ({ id: s.id, title: s.title, fields: s.fields?.length || 0 }))
  });
  
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
    
    // Créer le tableau final en "compactant" l'ordre selon les conditions
    const finalFields: TBLField[] = [];
    let nextOrder = 0;
    
    // Traiter les champs dans l'ordre original
    const allFieldsSorted = fields.sort((a, b) => a.order - b.order);
    
    allFieldsSorted.forEach(field => {
      // 🔁 REPEATER : Déplier les instances du repeater dans le flux
      const isRepeater = field.type === 'leaf_repeater' || 
                         field.type === 'LEAF_REPEATER' ||
                         (field as any).fieldType === 'leaf_repeater' ||
                         (field as any).fieldType === 'LEAF_REPEATER';
      
      if (isRepeater) {
        const repeaterMetadata = field.metadata?.repeater;
        const templateNodeIds = repeaterMetadata?.templateNodeIds || [];
        const maxItems = repeaterMetadata?.maxItems;
        const repeaterLabel = field.label || 'Entrée';
        
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
        
        const getTemplateFieldLabel = (templateNodeId: string) => {
          // PRIORITÉ 1: Essayer de récupérer depuis les métadonnées du repeater EN PREMIER
          if (repeaterMetadata?.templateNodeLabels) {
            const labelFromMeta = (repeaterMetadata.templateNodeLabels as Record<string, string>)[templateNodeId];
            if (labelFromMeta) {
              return labelFromMeta;
            }
          }
          
          // PRIORITÉ 2: Chercher le champ dans la section actuelle
          let templateField = section.fields.find(f => f.id === templateNodeId);
          
          // PRIORITÉ 3: Si pas trouvé, chercher dans toutes les sous-sections
          if (!templateField && section.subsections) {
            templateField = findFieldInAllSections(section.subsections, templateNodeId);
          }
          
          const label = templateField?.label || templateNodeId;
          return label;
        };
        
        // Pour chaque instance, ajouter les champs template + bouton suppression
        for (let i = 0; i < instanceCount; i++) {
          templateNodeIds.forEach((templateNodeId) => {
            const templateLabel = getTemplateFieldLabel(templateNodeId);
            
            // Créer un champ virtuel pour cette instance
            const instanceField: TBLField = {
              ...field,
              id: `${field.id}_${i}_${templateNodeId}`,
              label: `${repeaterLabel} - ${templateLabel}`, // Format: "Nom du repeater - Nom du champ"
              type: 'TEXT', // Type par défaut, devrait être récupéré depuis l'arbre
              order: nextOrder,
              isRepeaterInstance: true,
              repeaterParentId: field.id,
              repeaterInstanceIndex: i,
              repeaterTemplateNodeId: templateNodeId
            } as TBLField & { isRepeaterInstance?: boolean; repeaterParentId?: string; repeaterInstanceIndex?: number; repeaterTemplateNodeId?: string };
            
            finalFields.push(instanceField);
            nextOrder++;
          });
          
          // Ajouter un bouton de suppression pour cette instance spécifique
          // 🎯 Permettre la suppression dès qu'il y a au moins 1 instance
          if (instanceCount > 0) {
            const removeInstanceButtonField: TBLField = {
              ...field,
              id: `${field.id}_removeInstance_${i}`,
              type: 'REPEATER_REMOVE_INSTANCE_BUTTON' as any,
              label: `Supprimer ${repeaterLabel} #${i + 1}`,
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
        const addButtonField: TBLField = {
          ...field,
          id: `${field.id}_addButton`,
          type: 'REPEATER_ADD_BUTTON' as any,
          label: repeaterMetadata?.addButtonLabel || 'Ajouter une entrée',
          order: nextOrder,
          isRepeaterButton: true,
          repeaterParentId: field.id,
          repeaterCanAdd: !maxItems || instanceCount < maxItems,
          repeaterInstanceCount: instanceCount
        } as TBLField & { isRepeaterButton?: boolean; repeaterParentId?: string; repeaterCanAdd?: boolean; repeaterInstanceCount?: number };
        
        finalFields.push(addButtonField);
        nextOrder++;
        
        return; // Passer au champ suivant
      }
      
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
          // Si la condition est remplie, l'ajouter à la position suivante
          finalFields.push({ ...field, order: nextOrder });
          nextOrder++;
        }
        // Si condition non remplie, on l'ignore dans le rendu
      } else {
        // Champ normal : toujours l'ajouter à la position suivante disponible
        finalFields.push({ ...field, order: nextOrder });
        nextOrder++;
        
        // 🎯 INJECTER LES CHAMPS CONDITIONNELS juste après le champ select/radio
        // 🔧 CORRECTION: Détecter SELECT même si isSelect pas défini (basé sur field.options)
        const isSelectField = field.isSelect || Array.isArray(field.options);
        if (isSelectField && field.options) {
          const rawSelectedValue = formData[field.id];
          // 🔧 CORRECTION: Normaliser les valeurs undefined pour éviter les problèmes de comparaison
          const selectedValue = rawSelectedValue === "undefined" ? undefined : rawSelectedValue;
          
          console.log('🔍🔍🔍 [SECTION RENDERER] ========== DÉBUT INJECTION CONDITIONNELS ==========');
          console.log('🔍🔍🔍 [SECTION RENDERER] Champ SELECT:', {
            fieldId: field.id,
            fieldLabel: field.label,
            rawSelectedValue,
            selectedValue,
            typeRaw: typeof rawSelectedValue,
            typeNormalized: typeof selectedValue
          });
          
          dlog(`🔍 [SECTION RENDERER] Champ select "${field.label}" - valeur sélectionnée: "${rawSelectedValue}" -> normalisée: "${selectedValue}"`);
          dlog(`🔍 [SECTION RENDERER] Type de rawSelectedValue: ${typeof rawSelectedValue}`);
          dlog(`🔍 [SECTION RENDERER] Type de selectedValue normalisée: ${typeof selectedValue}`);
          dlog(`🔍 [SECTION RENDERER] formData pour ${field.id}:`, formData[field.id]);
          dlog(`🔍 [SECTION RENDERER] formData complet:`, formData);
          dlog(`🔍 [SECTION RENDERER] Options disponibles:`, field.options?.map(opt => ({ 
            value: opt.value, 
            label: opt.label, 
            type: typeof opt.value,
            hasConditionalFields: !!(opt.conditionalFields && opt.conditionalFields.length > 0),
            conditionalFieldsCount: opt.conditionalFields?.length || 0
          })));
          
          // Chercher l'option sélectionnée qui a des champs conditionnels
          // Normalisation forte: tout en string sauf null/undefined
          const norm = (v: unknown) => (v === null || v === undefined ? v : String(v));
          const selectedNorm = norm(selectedValue);
          
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
            
            if (matchingNode) {
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

              const sharedReferenceIds = Array.isArray(matchingNode.sharedReferenceIds) ? matchingNode.sharedReferenceIds : [];
              if (sharedReferenceIds.length > 0) {
                console.log('🔗🔗🔗 [SECTION RENDERER] Références partagées détectées pour le nœud sélectionné:', {
                  matchingNodeId: matchingNode.id,
                  sharedReferenceIds
                });

                sharedReferenceIds.forEach(refId => {
                  const refNode = allNodes.find(node => node.id === refId);
                  if (!refNode) {
                    dlog('⚠️ [SECTION RENDERER] Référence partagée introuvable', { refId, matchingNodeId: matchingNode.id });
                    return;
                  }
                  if (existingIds.has(refNode.id)) {
                    return;
                  }
                  const refField = buildConditionalFieldFromNode(refNode);
                  conditionalFields.push(refField);
                  existingIds.add(refField.id);
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
          
          dlog(`🔍 [SECTION RENDERER] Option finale trouvée:`, selectedOption);
          
          if (selectedOption?.conditionalFields && selectedOption.conditionalFields.length > 0) {
            const injSignatureObj = {
              fieldId: field.id,
              optionValue: selectedOption.value,
              conditionalIds: selectedOption.conditionalFields.map(cf => cf.id)
            };
            const injHash = JSON.stringify(injSignatureObj);
            if (lastInjectionHashRef.current !== injHash) {
              lastInjectionHashRef.current = injHash;
              dlog(`========== INJECTION CHAMPS CONDITIONNELS ==========`);
              dlog(`Field: "${field.label}"`);
              dlog(`Option: "${selectedOption.label}"`);
              dlog(`Nombre de champs: ${selectedOption.conditionalFields.length}`);
              dlog(`Détails champs:`, selectedOption.conditionalFields.map(cf => ({
              label: cf.label,
              type: cf.type,
              placeholder: cf.placeholder
              })));
            } else {
              dlog(`(déjà loggé) Injection inchangée pour field=${field.id} option=${selectedOption.value}`);
            }
            
            // Injecter TOUS les champs conditionnels avec des ordres séquentiels
            selectedOption.conditionalFields.forEach((conditionalField, index) => {
              // 🔥 CORRECTION : Utiliser le nom de la référence partagée au lieu du label de l'option
              const sharedRefName = conditionalField.sharedReferenceName || conditionalField.label;
              const fieldLabel = sharedRefName || `${selectedOption.label} ${index + 1}`;
              
              const fieldWithOrder = {
                ...conditionalField,
                label: fieldLabel,
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
    
    return finalFields.sort((a, b) => a.order - b.order);
  }, [dlog, formData, section, allNodes, buildConditionalFieldFromNode]);

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
            value={formData[field.id]}
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
            allNodes={allNodes}
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
          if (r.startsWith('condition:') || r.startsWith('formula:') || r.startsWith('@value.')) {
            dlog(`Routing data direct sourceRef='${r}'`);
            const dMeta = (candidateDataInstance as { displayFormat?: string; unit?: string; precision?: number } | undefined) || {};
            const allowedFormats: Array<'number' | 'currency' | 'percentage'> = ['number','currency','percentage'];
            const rawFormat = dMeta.displayFormat;
            const displayFormat: 'number' | 'currency' | 'percentage' = (typeof rawFormat === 'string' && (allowedFormats as string[]).includes(rawFormat)) ? rawFormat as ('number' | 'currency' | 'percentage') : 'number';
            
            // Récupérer le nodeId depuis dataActiveId
            if (!dataActiveId || !treeId) {
              return <span style={{ color: '#888' }}>---</span>;
            }
            
            return (
              <CalculatedFieldDisplay
                nodeId={dataActiveId}
                treeId={treeId}
                formData={formData}
                displayFormat={displayFormat}
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
            const isFormula = ref.startsWith('formula:');
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
              
              return (
                <CalculatedFieldDisplay
                  nodeId={variableNodeId}
                  treeId={treeId}
                  formData={formData}
                  displayFormat={dataInstance?.displayFormat as 'number' | 'currency' | 'percentage' | undefined}
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
              
              return (
                <CalculatedFieldDisplay
                  nodeId={instanceId}
                  treeId={treeId}
                  formData={formData}
                  displayFormat={dataInstance?.displayFormat as 'number' | 'currency' | 'percentage' | undefined}
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
        
        return (
          <CalculatedFieldDisplay
            nodeId={formulaId}
            treeId={treeId}
            formData={formData}
            displayFormat="number"
            unit={field.config?.unit}
            precision={field.config?.decimals || 4}
            placeholder="Calcul en cours..."
          />
        );
      }
      
  // Pas de fallback conditionnel codé en dur: la valeur doit venir des capacités TBL (data/formula)
      
  // 🔍 Si aucune capacité configurée, afficher la valeur brute du formulaire
      const rawValue = formData[field.id];
  dlog(`🔬 [TEST FALLBACK] Aucune capacité - valeur brute: ${rawValue}`);
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
          return (
            <CalculatedFieldDisplay
              nodeId={extractedNodeId}
              treeId={treeId}
              formData={formData}
              displayFormat={cfg?.displayFormat || 'number'}
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
        
        // Tentative d'extraction de propriétés communes
        const obj = rawValue as Record<string, unknown>;
        const extracted = obj.text || obj.value || obj.result || obj.operationResult || obj.humanText || 
                         obj.calculatedValue || obj.displayValue || obj.label;
        
        if (extracted !== undefined) {
          dlog('✅ [FALLBACK OBJECT] Valeur extraite:', extracted);
          return String(extracted);
        }
        
        // Si c'est un tableau, joindre les éléments
        if (Array.isArray(rawValue)) {
          return rawValue.join(', ');
        }
        
        // Dernier recours: JSON.stringify pour un affichage lisible
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
            <Text style={{ 
              color: '#64748b', 
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {getDisplayValue()}
            </Text>
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
        {((section.isDataSection || section.title === 'Données' || section.title.includes('Données')) || orderedFields.length > 0) && (
          <>
            {/* Style spécial pour les champs des sections données */}
            {(section.isDataSection || section.title === 'Données' || section.title.includes('Données')) ? (
              <div style={{ marginBottom: '16px' }}>
                <Row gutter={dataRowGutter} justify="center">
                  {(orderedFields.length > 0 ? orderedFields : section.fields || []).map(renderDataSectionField)}
                </Row>
              </div>
            ) : orderedFields.length > 0 ? (
              <Row gutter={formRowGutter} className="tbl-form-row">
                {orderedFields.map((field) => {
                  // 🔁 Gestion spéciale des boutons repeater
                  if ((field as any).isRepeaterButton) {
                    const isAddButton = field.type === 'REPEATER_ADD_BUTTON';
                    const isRemoveInstanceButton = field.type === 'REPEATER_REMOVE_INSTANCE_BUTTON';
                    const repeaterParentId = (field as any).repeaterParentId;
                    const instanceCountKey = `${repeaterParentId}_instanceCount`;
                    const instanceCount = (field as any).repeaterInstanceCount || 0;
                    const instanceIndex = (field as any).repeaterInstanceIndex;
                    
                    if (isAddButton && !(field as any).repeaterCanAdd) {
                      return null; // Ne pas afficher le bouton + si on a atteint le max
                    }
                    
                    return (
                      <Col key={field.id} xs={24} className="mb-2">
                        <Button
                          type="dashed"
                          block
                          danger={isRemoveInstanceButton}
                          icon={isAddButton ? <PlusOutlined /> : <MinusCircleOutlined />}
                          onClick={() => {
                            if (isAddButton) {
                              // Ajouter une nouvelle instance
                              const newCount = instanceCount + 1;
                              dlog(`🔁 [REPEATER] Ajout instance:`, {
                                repeaterParentId,
                                oldCount: instanceCount,
                                newCount
                              });
                              onChange(instanceCountKey, newCount);
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
                              const templateNodeIds = parentField?.metadata?.repeater?.templateNodeIds || [];
                              
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
                          {field.label}
                        </Button>
                      </Col>
                    );
                  }
                  
                  // Rendu normal des champs
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
                      <TBLFieldRendererAdvanced
                        field={field}
                        value={formData[field.id]}
                        allNodes={allNodes}
                        onChange={(value) => {
                        dlog(`🔄 [SECTION RENDERER] onChange appelé pour ${field.id}:`, value);
                        dlog(`🔄 [SECTION RENDERER] Ancienne valeur:`, formData[field.id]);
                        onChange(field.id, value);

                        // ✨ Mécanisme de miroir UNIVERSEL - synchronise TOUS les champs vers leurs miroirs
                        try {
                          const label = (field.label || '').toString();
                          
                          // 🎯 TOUJOURS créer le miroir par label (plus seulement les conditionnels)
                          if (label) {
                            const mirrorKey = `__mirror_data_${label}`;
                            dlog(`🪞 [MIRROR][UNIVERSAL] Synchronisation: "${label}" -> ${mirrorKey} = ${value}`);
                            onChange(mirrorKey, value);
                            
                            // Synchroniser aussi vers window.TBL_FORM_DATA
                            if (typeof window !== 'undefined' && window.TBL_FORM_DATA) {
                              window.TBL_FORM_DATA[mirrorKey] = value;
                              
                              // Synchroniser toutes les variantes du miroir
                              Object.keys(window.TBL_FORM_DATA).forEach(key => {
                                if (key.startsWith('__mirror_data_') && 
                                    (key.includes(label) || 
                                     key.includes(label.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()) ||
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
                            const baseLabel = explicitTarget || label.replace(/\s*-\s*Champ.*$/i, '').trim();
                            if (baseLabel && baseLabel !== label) {
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
