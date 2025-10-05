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
import { SmartCalculatedField } from './SmartCalculatedField';
import { useBatchEvaluation } from '../hooks/useBatchEvaluation';
import { 
  Card, 
  Typography, 
  Row,
  Col,
  Divider,
  Tag,
  Collapse,
  Grid
} from 'antd';
import { 
  BranchesOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';
import TBLFieldRendererAdvanced from './TBLFieldRendererAdvanced';
import type { TBLSection, TBLField } from '../hooks/useTBLDataPrismaComplete';
import type { TBLFormData } from '../hooks/useTBLSave';
import { buildMirrorKeys } from '../utils/mirrorNormalization';

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
  disabled?: boolean;
  level?: number; // Niveau de profondeur pour le style
  parentConditions?: Record<string, unknown>; // Conditions héritées du parent
}

const TBLSectionRenderer: React.FC<TBLSectionRendererProps> = ({
  section,
  formData,
  onChange,
  disabled = false,
  level = 0,
  parentConditions = {}
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const formRowGutter: [number, number] = useMemo(() => [
    isMobile ? 12 : 16,
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

  // 🔄 Réorganiser l'ordre des champs selon les conditions + injection des champs conditionnels
  const orderedFields = useMemo(() => {
    const fields = [...section.fields];
    
    // Créer le tableau final en "compactant" l'ordre selon les conditions
    const finalFields: TBLField[] = [];
    let nextOrder = 0;
    
    // Traiter les champs dans l'ordre original
    const allFieldsSorted = fields.sort((a, b) => a.order - b.order);
    
    allFieldsSorted.forEach(field => {
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
        if (field.isSelect && field.options) {
          const rawSelectedValue = formData[field.id];
          // 🔧 CORRECTION: Normaliser les valeurs undefined pour éviter les problèmes de comparaison
          const selectedValue = rawSelectedValue === "undefined" ? undefined : rawSelectedValue;
          
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
          let selectedOption = field.options.find(opt => {
            if (selectedValue === undefined || selectedValue === null) {
              return opt.value === undefined || opt.value === null;
            }
            return opt.value === selectedValue;
          });
          if (!selectedOption) {
            selectedOption = field.options.find(opt => norm(opt.value) === selectedNorm);
            if (selectedOption) {
              dlog('🟡 [SECTION RENDERER] Correspondance option trouvée via comparaison loose (string).');
            } else {
              dlog('🔴 [SECTION RENDERER] Aucune option match strict ou loose. selectedValue=', selectedValue, 'selectedNorm=', selectedNorm, 'options=', field.options.map(o => ({ value:o.value, norm:norm(o.value) })));
            }
          }
          dlog(`🔍 [SECTION RENDERER] Option trouvée:`, selectedOption);
          
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
              const fieldWithOrder = {
                ...conditionalField,
                label: conditionalField.label || `${selectedOption.label} ${index + 1}`,
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
  }, [dlog, formData, section]);

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

    // 🔍 DEBUG LOG pour comprendre la logique
    console.log(`🔍 [TBLSectionRenderer] Section "${section.title || section.name}" -> isDataSection: ${isDataSection}`, {
      'section.isDataSection': section.isDataSection,
      'section.title': section.title,
      'section.title === "Données"': section.title === 'Données',
      'section.title.includes("Données")': section.title?.includes('Données'),
      'isDataSection final': isDataSection
    });

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
  console.log(`🔬🔬🔬 [DATA SECTION FIELD] DÉBUT RENDER "${field.label}" ==========`);
  console.log(`🔬 [DATA SECTION FIELD] Field ID: ${field.id}`);
  console.log(`🔬 [DATA SECTION FIELD] Field Type: ${field.fieldType}`);
  console.log(`🔬 [DATA SECTION FIELD] Has Capabilities:`, !!field.capabilities);
  console.log(`🔬 [DATA SECTION FIELD] Capabilities:`, field.capabilities);
  console.log(`🔬 [DATA SECTION FIELD] FormData Value:`, formData[field.id]);
    
    // 🔥 CORRECTION CRITIQUE : Si le champ a une capacité Table (lookup ou matrix), utiliser le renderer éditable
    const hasTableCapability = field.capabilities?.table?.enabled;
    const hasRowOrColumnMode = field.capabilities?.table?.currentTable?.rowBased === true || 
                               field.capabilities?.table?.currentTable?.columnBased === true;
    const isMatrixMode = field.capabilities?.table?.currentTable?.mode === 'matrix';
    
    // 🔬 DIAGNOSTIC APPROFONDI
    console.log(`🔬 [DATA SECTION FIELD] "${field.label}" - currentTable COMPLET:`, field.capabilities?.table?.currentTable);
    console.log(`🔬 [DATA SECTION FIELD] "${field.label}" - hasTableCapability: ${hasTableCapability}, hasRowOrColumnMode: ${hasRowOrColumnMode}, isMatrixMode: ${isMatrixMode}`);
    
    // Rendre éditable si c'est un lookup (rowBased/columnBased) OU un résultat de matrice
    if (hasTableCapability && (hasRowOrColumnMode || isMatrixMode)) {
      console.log(`✅✅✅ [DATA SECTION FIX] Champ "${field.label}" a une capacité Table -> Utilisation TBLFieldRendererAdvanced`);
      return (
        <Col
          key={field.id}
          xs={24}
          sm={12}
          lg={8}
          className="mb-2"
        >
          <TBLFieldRendererAdvanced
            field={field}
            value={formData[field.id]}
            onChange={(value) => {
              console.log(`🔄🔄🔄 [SECTION RENDERER][DATA SECTION] onChange appelé pour ${field.id}:`, value);
              onChange(field.id, value);

              // Synchronisation miroir
              try {
                const label = (field.label || '').toString();
                if (label) {
                  const mirrorKey = `__mirror_data_${label}`;
                  console.log(`🪞 [MIRROR][DATA SECTION] Synchronisation: "${label}" -> ${mirrorKey} = ${value}`);
                  onChange(mirrorKey, value);
                }
              } catch (e) {
                console.warn('⚠️ [MIRROR] Impossible de créer la valeur miroir:', e);
              }
            }}
            isValidation={isValidation}
            formData={formData}
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
      if (!hasDynamicCapabilities && (effectiveMirrorValue === undefined || effectiveMirrorValue === null || effectiveMirrorValue === '')) {
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
          if (!variantHit) {
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
  dlog(`🪞 [MIRROR] Valeur miroir ignorée pour "${field.label}" car capacités dynamiques présentes.`);
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
        // Si la sourceRef cible une condition -> on affiche la condition (bool / valeur) via SmartCalculatedField.
        // Si l'utilisateur veut une formule, la sourceRef doit explicitement être "formula:<id>".
        if (dataSourceType === 'tree' && typeof dataSourceRef === 'string') {
          const r = dataSourceRef;
          if (r.startsWith('condition:') || r.startsWith('formula:') || r.startsWith('@value.')) {
            dlog(`Routing data direct sourceRef='${r}'`);
            const dMeta = (candidateDataInstance as { displayFormat?: string; unit?: string; precision?: number } | undefined) || {};
            const allowedFormats: Array<'number' | 'currency' | 'percentage'> = ['number','currency','percentage'];
            const rawFormat = dMeta.displayFormat;
            const displayFormat: 'number' | 'currency' | 'percentage' = (typeof rawFormat === 'string' && (allowedFormats as string[]).includes(rawFormat)) ? rawFormat as ('number' | 'currency' | 'percentage') : 'number';
            return (
              <SmartCalculatedField
                sourceRef={r}
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
          
          // Mode arborescence (router selon la vraie référence: condition:, formula:, @value.)
          if (configSourceType === 'tree' && configSourceRef) {
            const ref = String(configSourceRef);
            const isCondition = ref.startsWith('condition:');
            const isFormula = ref.startsWith('formula:');
            const isValue = ref.startsWith('@value.');
            dlog(`🔬 [TEST TREE SOURCE] Router direct: condition=${isCondition}, formula=${isFormula}, value=${isValue}`);

            if (isCondition || isFormula || isValue) {
              // Si batch pré-chargé et c'est une variable nodeId connue => montrer la valeur batch si existante
              if (batchLoaded && ref.startsWith('condition:')) {
                const nodeId = (capabilities?.data?.activeId) || (capabilities?.data?.instances ? Object.keys(capabilities.data.instances)[0] : undefined);
                if (nodeId && batchCacheRef.current[nodeId] != null) {
                  const val = batchCacheRef.current[nodeId];
                  return <span style={{ fontWeight: 'bold', color: '#047857' }}>{formatValueWithConfig(val, dataInstance)}</span>;
                }
              }
              return (
                <SmartCalculatedField
                  sourceRef={ref}
                  formData={formData}
                  displayFormat={dataInstance?.displayFormat}
                  unit={dataInstance?.unit}
                  precision={dataInstance?.precision}
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
              return (
                <SmartCalculatedField
                  sourceRef={`variable:${instanceId}`}
                  formData={formData}
                  displayFormat={dataInstance?.displayFormat}
                  unit={dataInstance?.unit}
                  precision={dataInstance?.precision}
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
        
        return (
          <SmartCalculatedField
            sourceRef={`formula:${formulaId ?? ''}`}
            formData={formData}
            displayFormat="number"
            unit={field.config?.unit}
            precision={field.config?.decimals || 4}
            placeholder="Calcul en cours..."
            rawExpression={rawExpression}
            variablesDefinition={variablesDef}
          />
        );
      }
      
  // Pas de fallback conditionnel codé en dur: la valeur doit venir des capacités TBL (data/formula)
      
  // 🔍 Si aucune capacité configurée, afficher la valeur brute du formulaire
      const rawValue = formData[field.id];
  dlog(`🔬 [TEST FALLBACK] Aucune capacité - valeur brute: ${rawValue}`);
      // 🧩 Nouveau: si metadata/config contient un sourceRef exploitable, utiliser SmartCalculatedField
      try {
        const metaLike = (field.treeMetadata || field.config || {}) as Record<string, unknown>;
        const metaSourceRef = (metaLike.sourceRef as string | undefined) || (metaLike['source_ref'] as string | undefined);
        if (metaSourceRef && typeof metaSourceRef === 'string' && /^(formula:|condition:|variable:|@value\.)/.test(metaSourceRef)) {
          dlog(`🧪 [FALLBACK SMART] Utilisation SmartCalculatedField via metaSourceRef='${metaSourceRef}'`);
          if (localStorage.getItem('TBL_DIAG') === '1') {
            console.log('[TBL_DIAG][fallback-smart]', {
              fieldId: field.id,
              label: field.label,
              metaSourceRef,
              hasCapabilities: !!field.capabilities
            });
          }
          const cfg = field.config as { displayFormat?: 'number'|'currency'|'percentage'; unit?: string; decimals?: number } | undefined;
          return (
            <SmartCalculatedField
              sourceRef={metaSourceRef}
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

      // ✅ Afficher la valeur brute (l'utilisateur saisit ce qu'il veut)
      dlog(`🔬 [TEST FALLBACK] Retour valeur brute: ${rawValue}`);
      return rawValue.toString();
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
      <Col key={field.id} xs={24} sm={12} lg={8}>
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
                {orderedFields.map((field) => (
                  <Col
                    key={field.id}
                    xs={24}
                    sm={24}
                    md={field.type === 'textarea' || field.type === 'TEXTAREA' ? 24 : 12}
                    lg={field.type === 'textarea' || field.type === 'TEXTAREA' ? 24 : 12}
                    className="mb-2 tbl-form-col"
                  >
                    <TBLFieldRendererAdvanced
                      field={field}
                      value={formData[field.id]}
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
                            console.log(`🪞 [MIRROR][UNIVERSAL] Synchronisation: "${label}" -> ${mirrorKey} = ${value}`);
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
                                  console.log(`🔄 [MIRROR][VARIANT] ${key} = ${value}`);
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
                    />
                  </Col>
                ))}
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
