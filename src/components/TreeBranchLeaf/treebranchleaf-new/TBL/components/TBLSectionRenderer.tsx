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
// ✅ NOUVEAU SYSTÈME : CalculatedValueCard affiche les valeurs STOCKÉES dans Prisma
import { CalculatedValueCard } from './CalculatedValueCard';
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
  Button,
  Form
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
import { isCopyFromRepeater } from '../utils/isCopyFromRepeater';

const { Text } = Typography;
const { Panel } = Collapse;
const { useBreakpoint } = Grid;

// 🎯 INTERFACE POUR NAMESPACING DES REPEATERS
interface RepeaterNamespaceMeta {
  prefix: string; // Format: "${parentId}_${instanceIndex}_"
  parentId: string;
  instanceIndex: number;
  labelPrefix: string; // Ex: "Versant 1", "Bloc 1"
}

interface CloneRepeaterOptions {
  applyLabelPrefix?: boolean;
  templateNodeId?: string;
}

// 🔧 FONCTION CRITIQUE: Namespacing pour les champs du repeater
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

  // 🔑 CRITIQUE: Appliquer le namespace à l'ID pour qu'on puisse retrouver la valeur dans formData
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

// 🎨 FORMATAGE DES VALEURS AVEC CONFIGURATION
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
  allSections?: TBLSection[]; // 🔥 NOUVEAU: Toutes les sections pour chercher dans "Nouveau Section"
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
  allSections = [],
  disabled = false,
  level = 0,
  parentConditions = {},
  isValidation = false
}) => {
  // ✅ CRITIQUE: Stabiliser l'API pour éviter les re-rendus à chaque frappe
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]);
  // dlog alias to global debug logger (globalDlog checks DEBUG_VERBOSE)
  const dlog = globalDlog;
  
  // � DEBUG GLOBAL: Voir tous les champs reçus par cette section
  // ⚠️ DÉSACTIVÉ pour performance - réactiver si besoin de debug
  /*
  useEffect(() => {
    const copiesInSection = (section.fields || []).filter(field => {
      const meta = (field.metadata || {}) as any;
      return !!meta?.sourceTemplateId;
    });
    
    if (copiesInSection.length > 0) {
      console.log(`🚨 [SECTION-COPIES] Section "${section.title}" a reçu ${copiesInSection.length} copies:`, 
        copiesInSection.map(f => `${f.label} (source: ${(f.metadata as any)?.sourceTemplateId})`));
    }
  }, [section.fields, section.title]);
  */

  // �🔍 EXPOSITION GLOBALE POUR DÉBOGAGE
  // ⚠️ DÉSACTIVÉ pour performance - réactiver si besoin de debug
  /*
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.TBL_FORM_DATA = formData;
      window.TBL_ALL_NODES = allNodes;
      window.debugSharedRefs = () => {
        console.log('🔍 [DEBUG SUMMARY]');
        console.log('TBL_CASCADER_NODE_IDS:', window.TBL_CASCADER_NODE_IDS);
        console.log('TBL_FORM_DATA pour Versant:', Object.entries(formData).filter(([k]) => k.includes('versant') || k.includes('Versant') || k.includes('e207d8bf')));
        console.log('TBL_ALL_NODES count:', allNodes.length);
        console.log('Nœuds de type leaf_option:', allNodes.filter(n => n.type === 'leaf_option').length);
        console.log('Nœuds avec sharedReferenceIds:', allNodes.filter(n => n.sharedReferenceIds && n.sharedReferenceIds.length > 0).length);
      };
    }
  }, [formData, allNodes]);
  */
  
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
  
  // ✅ CRITIQUE: Mémoiser le handleFieldChange pour éviter les re-rendus
  const handleFieldChange = useCallback((fieldId: string, value: any, fieldLabel?: string) => {
    onChange(fieldId, value);
    
    // Synchronisation miroir
    if (fieldLabel) {
      try {
        const mirrorKey = `__mirror_data_${fieldLabel}`;
        onChange(mirrorKey, value);
      } catch {
        // Ignorer les erreurs de miroir en production
      }
    }
  }, [onChange]);
  
  // ✅ CRITIQUE: Fonction pour extraire la valeur de formData
  const extractFieldValue = useCallback((fieldId: string) => {
    const rawValue = formData[fieldId];
    // Si c'est un objet avec value/calculatedValue (réponse backend), extraire
    if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
      return rawValue.value ?? rawValue.calculatedValue ?? rawValue.operationResult?.value ?? rawValue;
    }
    return rawValue;
  }, [formData]);

  // Debug gating (localStorage.setItem('TBL_SMART_DEBUG','1'))
  // NOTE: Moved earlier to avoid runtime TDZ errors (dlog used across this file)

  // Handler to delete a full copy group (used by delete button)
  const handleDeleteCopyGroup = useCallback(async (f: TBLField) => {
    try {
      const repeaterId = (f as any).parentRepeaterId as string;
      const label = String(f.label || '');
      const oldPattern = label.match(/\(Copie\s+(\d+)\)/);
      const newPattern = label.match(/-(\d+)\s*$/);
      const copyNumber = oldPattern?.[1] || newPattern?.[1] || null;
      const signatureOld = copyNumber ? ` (Copie ${copyNumber})` : null;
      const signatureNew = copyNumber ? `-${copyNumber}` : null;

      if (!copyNumber) {
        console.warn('⚠️ [DELETE COPY GROUP] Signature de copie introuvable, action ignorée.');
        return;
      }

  dlog('🗑️ [DELETE COPY GROUP] Suppression de la copie:', { copyNumber, repeaterId });

      const fieldsInSameCopy = section.fields.filter(sf => {
        const sameRepeater = (sf as any).parentRepeaterId === repeaterId;
        const lbl = String(sf.label || '');
        const isCopyField = (sf as any).isDeletableCopy === true;
        const matchesOld = signatureOld ? lbl.endsWith(signatureOld) : false;
        const matchesNew = signatureNew ? /-(\d+)\s*$/.test(lbl) && lbl.endsWith(signatureNew!) : false;
        return sameRepeater && isCopyField && (matchesOld || matchesNew);
      });

      const fieldsInNewSection = (allNodes || []).filter(n => {
        const lbl = String(n.label || '');
        const matchesOld = signatureOld ? lbl.endsWith(signatureOld) : false;
        const matchesNew = signatureNew ? /-(\d+)\s*$/.test(lbl) && lbl.endsWith(signatureNew!) : false;
        const notInCurrentSection = !section.fields.some((sf: any) => sf.id === n.id);
        const shouldDelete = notInCurrentSection && (matchesOld || matchesNew) && n.id !== f.id;
        if (shouldDelete) {
          dlog('✅ [DELETE MATCH] Champ trouvé via allNodes:', { label: lbl, id: n.id, notInCurrentSection });
        }
        return shouldDelete;
      });

      const allFieldsToDelete = Array.from(new Map([...fieldsInSameCopy, ...fieldsInNewSection].map(x => [x.id, x])).values());
      if (allFieldsToDelete.length === 0) {
        dlog('⚠️ [DELETE COPY GROUP] Aucun champ à supprimer pour cette copie.');
        return;
      }

      dlog('🗑️ [DELETE COPY GROUP] Suppression de', allFieldsToDelete.length, 'champs (après déduplication)');

      // Dispatch optimistic UI update to remove the ids immediately (suppress reload)
      try {
        const optimisticIds = allFieldsToDelete.map(x => x.id);
        window.dispatchEvent(new CustomEvent('tbl-repeater-updated', { detail: { treeId: treeId, nodeId: repeaterId, source: 'delete-copy-group-optimistic', suppressReload: true, deletingIds: optimisticIds, timestamp: Date.now() } }));
        dlog('[DELETE COPY GROUP] Dispatched optimistic tbl-repeater-updated (deletingIds)', optimisticIds);
      } catch {
        dlog('[DELETE COPY GROUP] Failed to dispatch optimistic tbl-repeater-updated (silent)');
      }

      const BATCH_SIZE = 5;
      const MAX_RETRIES = 3;
      const DELAY_MS = 500;
      let globalSuccess = 0;
      let globalFailed = 0;
      const globalFailedFields: Array<{ label: string; id: string; lastError: string }> = [];
      const globalSuccessIds: string[] = [];

      const deleteWithRetry = async (node: any, retry = 0) => {
        try {
          await api.delete(`/api/treebranchleaf/trees/${treeId}/nodes/${node.id}`, { suppressErrorLogForStatuses: [404] });
          return { status: 'success' as const, id: node.id, label: node.label };
        } catch (err: any) {
          const status = err?.status || 500;
          const errMsg = err?.data?.error || err?.message || 'Erreur inconnue';
          if (status === 500 && retry < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, DELAY_MS * (retry + 1)));
            return deleteWithRetry(node, retry + 1);
          }
          if (status === 404) return { status: 'success' as const, id: node.id, label: node.label };
          return { status: 'failed' as const, id: node.id, label: node.label, error: errMsg };
        }
      };

  for (let i = 0; i < allFieldsToDelete.length; i += BATCH_SIZE) {
        const batch = allFieldsToDelete.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map(b => deleteWithRetry(b)));
        for (const r of results) {
          if (r.status === 'success') {
            globalSuccess++;
            globalSuccessIds.push(r.id);
          } else {
            globalFailed++;
            globalFailedFields.push({ label: r.label || '', id: r.id, lastError: String((r as any).error || '') });
          }
        }
        if (i + BATCH_SIZE < allFieldsToDelete.length) await new Promise(res => setTimeout(res, DELAY_MS));
      }

      dlog('🗑️ [DELETE COPY GROUP] Suppression terminée - Succès:', globalSuccess, '❌ Échecs:', globalFailed);
      if (globalFailed > 0) console.warn('🗑️ [DELETE COPY GROUP] Champs non supprimés:', globalFailedFields.map(f => `${f.label} (${f.lastError})`));

      // Extra cleanup: scan for display nodes referencing deleted copies
      try {
  const removedSet = new Set(globalSuccessIds);
        let nodesForScan = Array.isArray(allNodes) && allNodes.length > 0 ? allNodes : [];
        if (!nodesForScan || nodesForScan.length === 0) {
          try {
            const resp = await api.get(`/api/treebranchleaf/trees/${treeId}/nodes`);
            nodesForScan = Array.isArray(resp) ? resp as any[] : (resp?.data || resp?.nodes || []);
          } catch (err) {
            console.warn('[DELETE COPY GROUP] Unable to fetch full tree for extra deletion:', err);
            nodesForScan = allNodes || [];
          }
        }
        const nodeById = new Map(nodesForScan.map(n => [n.id, n] as const));
        const relatedTemplateIds = new Set<string>();
        for (const rid of globalSuccessIds) {
          const removedNode = nodeById.get(rid);
          if (!removedNode) continue;
          const dm: any = removedNode.metadata || {};
          if (dm?.sourceTemplateId) relatedTemplateIds.add(String(dm.sourceTemplateId));
          if (dm?.copiedFromNodeId) relatedTemplateIds.add(String(dm.copiedFromNodeId));
        }

        const extraCandidates = (nodesForScan || []).filter(n => {
          const meta: any = n.metadata || {};
          const looksLikeDisplay = !!(meta?.autoCreateDisplayNode || meta?.copiedFromNodeId || meta?.fromVariableId || meta?.sourceTemplateId);
          if (!looksLikeDisplay) return false;
          if (removedSet.has(n.id)) return false;
          if (meta.copiedFromNodeId && (removedSet.has(String(meta.copiedFromNodeId)) || relatedTemplateIds.has(String(meta.copiedFromNodeId)))) return true;
          if (meta.sourceTemplateId && (removedSet.has(String(meta.sourceTemplateId)) || relatedTemplateIds.has(String(meta.sourceTemplateId)))) return true;
          if (meta.fromVariableId) {
            for (const rid of Array.from(removedSet)) if (String(meta.fromVariableId).includes(String(rid))) return true;
            for (const tid of Array.from(relatedTemplateIds)) if (String(meta.fromVariableId).includes(String(tid))) return true;
          }
          for (const rid of Array.from(removedSet)) {
            const m = String(rid).match(/-(\d+)$/);
            if (m) {
              const suffix = `-${m[1]}`;
              if (String(meta.fromVariableId || '').endsWith(suffix)) return true;
              if (String(n.label || '').endsWith(suffix)) return true;
            }
          }
          return false;
        });

  if (extraCandidates.length > 0) {
          const extraIdsToRemove: string[] = [];
          for (let i = 0; i < extraCandidates.length; i += BATCH_SIZE) {
            const batch = extraCandidates.slice(i, i + BATCH_SIZE);
            const res = await Promise.all(batch.map(b => deleteWithRetry(b)));
            for (const r of res) {
              if (r.status === 'success') extraIdsToRemove.push(r.id);
              else console.warn('[DELETE COPY GROUP] Failed to delete extra display node', r.id, (r as any).error);
            }
          }
          if (extraIdsToRemove.length > 0) {
            for (const id of extraIdsToRemove) if (!globalSuccessIds.includes(id)) globalSuccessIds.push(id);
            dlog('🗑️ [DELETE COPY GROUP] Additional display nodes deleted successfully:', extraIdsToRemove.length);
          }
        }
      } catch (e) {
        console.warn('[DELETE COPY GROUP] Extra cleanup encountered an error:', e);
      }

      try {
        // Final reconciliation event
        window.dispatchEvent(new CustomEvent('tbl-repeater-updated', { detail: { treeId: treeId, nodeId: repeaterId, source: 'delete-copy-group-finished', suppressReload: true, deletedIds: globalSuccessIds, timestamp: Date.now() } }));
        dlog('[DELETE COPY GROUP] Dispatched final tbl-repeater-updated (deletedIds)', globalSuccessIds);
        // Backwards-compatible light event for other listeners if needed
        window.dispatchEvent(new CustomEvent('delete-copy-group-finished', { detail: { treeId: treeId, nodeId: repeaterId, deletedIds: globalSuccessIds, timestamp: Date.now() } }));
        // Ensure local retransform/computation runs in dependent components if they rely on memoized values
        try {
          window.dispatchEvent(new CustomEvent('TBL_FORM_DATA_CHANGED', { detail: { reason: 'delete-copy-group-finished', deletedIds: globalSuccessIds } }));
        } catch {/* noop */}
      } catch {
        dlog('⚠️ [DELETE COPY GROUP] Impossible de dispatch final tbl-repeater-updated (silent)');
      }
    } catch (error) {
      console.error('❌ [DELETE COPY GROUP] Erreur lors de la suppression de la copie:', error);
    }
  }, [api, allNodes, section, treeId, dlog]);
  
  // Debug gating (localStorage.setItem('TBL_SMART_DEBUG','1')) is declared earlier

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
    
    // Créer le tableau final en "compactant" l'ordre selon les conditions
  const finalFields: TBLField[] = [];
  // Suivi des champs déjà insérés lors du regroupement (évite les doublons)
  const consumedFieldIds = new Set<string>();
    let nextOrder = 0;
    
    // 🎯 CORRECTION: Ne pas trier les champs pour préserver l'ordre des repeaters
    // Traiter les champs dans l'ordre où ils ont été ajoutés à finalFields
    console.log('🔍 [ALL FIELDS DEBUG] Fields récupérés de la base (SANS TRI):', {
      totalFields: fields.length,
      fieldIds: fields.map(f => f.id),
      versantFields: fields.filter(f => f.id?.includes('3f0f') || f.id?.includes('e207d8bf') || f.label?.includes('Versant')),
      versantFieldIds: fields.filter(f => f.id?.includes('3f0f') || f.id?.includes('e207d8bf') || f.label?.includes('Versant')).map(f => ({ id: f.id, label: f.label, type: f.type }))
    });
    
    // 🎯 TRAITEMENT INLINE: Parcourir les champs dans l'ordre de la section
    // et déplier les repeaters à l'endroit exact où ils apparaissent
    fields.forEach(field => {
      // ⛔️ Sauter les champs déjà consommés par un regroupement de copies
      if (consumedFieldIds.has(field.id)) {
        return;
      }

      // ⛔️ Déporter TOUS les champs appartenant à une copie réelle vers le parent répéteur
      // On ne les rend pas à leur position brute dans section.fields; ils seront insérés
      // à la position du répéteur pour respecter la règle "les copies démarrent ici".
      const belongsToRealCopy = Boolean((field as any).parentRepeaterId && (field as any).sourceTemplateId);
      if (belongsToRealCopy) {
        return;
      }
      // 🔁 REPEATER : Déplier les instances du repeater dans le flux
      const isRepeater = (
        field.type === 'leaf_repeater' || 
        field.type === 'LEAF_REPEATER' ||
        (field as any).fieldType === 'leaf_repeater' ||
        (field as any).fieldType === 'LEAF_REPEATER' ||
        (field.metadata && typeof field.metadata === 'object' && 'repeater' in field.metadata)
      );
      
      // 🚨 CRITIQUE: Détecter les repeaters copiés qui ont changé de type
      if (field.id === 'e207d8bf-6a6f-414c-94ed-ffde47096915' || field.id === '10724c29-a717-4650-adf3-0ea6633f64f1') {
        console.log('🚨🚨🚨 [REPEATER TYPE CHECK] Analyse du repeater:', {
          fieldId: field.id,
          fieldLabel: field.label,
          fieldType: field.type,
          fieldSubType: (field as any).subType,
          fieldFieldType: (field as any).fieldType,
          isRepeaterDetected: isRepeater,
          hasRepeaterMetadata: !!(field.metadata && typeof field.metadata === 'object' && 'repeater' in field.metadata),
          repeaterMetadata: field.metadata?.repeater,
          isOriginal: field.id === '10724c29-a717-4650-adf3-0ea6633f64f1',
          isCopy: field.id === 'e207d8bf-6a6f-414c-94ed-ff6e47096915'
        });
      }
      
      if (isRepeater) {
        // 🔥 DEBUG CRITIQUE: Analyser ce repeater spécifiquement
        if (field.id === '10724c29-a717-4650-adf3-0ea6633f64f1') {
          console.log('🔥🔥🔥 [REPEATER CONTAINER DEBUG] Repeater container analysé:', {
            fieldId: field.id,
            fieldLabel: field.label,
            fieldType: field.type,
            metadata: field.metadata,
            repeaterMetadata: field.metadata?.repeater,
            allNodesCount: allNodes?.length || 0,
            sectionFieldsCount: section.fields.length
          });
        }

        const repeaterMetadata = field.metadata?.repeater;
        const templateNodeIdsRaw = repeaterMetadata?.templateNodeIds || [];

        // 🔎 Helpers: retrouver un node brut, déterminer si c'est un champ et récupérer tous les champs descendants
        const getNodeById = (id: string): RawTreeNode | undefined => allNodes?.find(n => n.id === id);
        const isFieldNode = (n?: RawTreeNode) => !!n && (
          (typeof n.fieldType === 'string' && n.fieldType.length > 0) ||
          (typeof n.subType === 'string' && n.subType.length > 0) ||
          (n.type && n.type.includes('leaf'))
        );
        const getChildren = (parentId: string): RawTreeNode[] => allNodes?.filter(n => n.parentId === parentId) || [];
        const getDescendantFieldNodes = (rootId: string): RawTreeNode[] => {
          const result: RawTreeNode[] = [];
          const stack: string[] = [rootId];
          const visited = new Set<string>();
          while (stack.length) {
            const id = stack.pop()!;
            if (visited.has(id)) continue;
            visited.add(id);
            const children = getChildren(id);
            for (const c of children) {
              if (isFieldNode(c)) result.push(c);
              if (c.id && !visited.has(c.id)) stack.push(c.id);
            }
          }
          return result;
        };

        // Développer les IDs fournis: si on sélectionne une branche/section, on prend tous les champs descendants
        const expandTemplateNodeIds = (ids: string[]): string[] => {
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
  const _iconOnly = (field as any).repeater_iconOnly ?? repeaterMetadata?.iconOnly ?? false;
        const maxItems = (field as any).repeater_maxItems ?? repeaterMetadata?.maxItems ?? null;
        
        // Récupérer le nombre d'instances depuis formData (clé spéciale)
        const instanceCountKey = `${field.id}_instanceCount`;
        // 🎯 Commencer à 0 instances - l'utilisateur doit cliquer sur "Ajouter" pour en créer
  const _instanceCount = (formData[instanceCountKey] as number) ?? 0;
        
        // NOUVEAU: Regrouper les COPIES RÉELLES à la position du répéteur, par rang d'encodage
        // 1) Récupérer toutes les copies de ce répéteur
        const copyFieldsAll = fields.filter(f => (f as any).parentRepeaterId === field.id && (f as any).sourceTemplateId);

        // 2) Construire mapping templateId -> liste de copies, triées par duplicatedAt puis index dans le label (fallback)
        const copiesByTemplate: Record<string, TBLField[]> = {};
        const getCopyIndexFromLabel = (lbl?: string) => {
          if (!lbl) return undefined;
          const m = lbl.match(/\(Copie\s*(\d+)\)/i);
          return m ? parseInt(m[1], 10) : undefined;
        };
        templateNodeIds.forEach(tid => { copiesByTemplate[tid] = []; });
        copyFieldsAll.forEach(cf => {
          const tid = (cf as any).sourceTemplateId as string | undefined;
          if (!tid) return;
          if (!copiesByTemplate[tid]) copiesByTemplate[tid] = [];
          copiesByTemplate[tid].push(cf);
        });
        Object.keys(copiesByTemplate).forEach(tid => {
          copiesByTemplate[tid].sort((a, b) => {
            const da = new Date(((a as any).metadata?.duplicatedAt) || 0).getTime();
            const db = new Date(((b as any).metadata?.duplicatedAt) || 0).getTime();
            if (da !== db) return da - db;
            const ia = getCopyIndexFromLabel(a.label);
            const ib = getCopyIndexFromLabel(b.label);
            if (ia !== undefined && ib !== undefined && ia !== ib) return ia - ib;
            return String(a.label || '').localeCompare(String(b.label || ''));
          });
        });

        // 3) Nombre de blocs = max du nombre de copies parmi les templates
        const maxBlocks = Math.max(0, ...Object.values(copiesByTemplate).map(arr => arr.length));

        // 4) Insérer bloc par bloc, dans l'ordre des templates
        for (let copyIndex = 0; copyIndex < maxBlocks; copyIndex++) {
          const block: TBLField[] = [];
          for (const tid of templateNodeIds) {
            const arr = copiesByTemplate[tid] || [];
            const cf = arr[copyIndex];
            if (!cf) continue; // Cas manquant (A) : ignorer
            consumedFieldIds.add(cf.id);
            block.push(cf);
          }
          // Marquer le dernier champ du bloc pour afficher le bouton poubelle de la copie
          block.forEach((f, idx) => {
            const isLast = idx === block.length - 1;
            // 1) Insérer le champ de copie
            finalFields.push({ ...f, order: nextOrder, isLastInCopyGroup: isLast });
            nextOrder++;

            // 2) Si c'est un select/cascade, injecter ses champs conditionnels IMMÉDIATEMENT APRÈS
            try {
              const isSelectField = (f as any).isSelect || Array.isArray(f.options);
              const isCascade = (f.type === 'cascade');
              if (!isSelectField && !isCascade) return;

              // Déterminer la valeur sélectionnée pour cette copie
              const norm = (v: unknown) => (v === null || v === undefined ? v : String(v));
              let selectedValue: unknown = (formData as Record<string, unknown>)[f.id];

              // Construire selectedOption pour réutiliser les conditionalFields éventuels
              let selectedOption = (Array.isArray(f.options) ? f.options.find(opt => {
                if (selectedValue === undefined || selectedValue === null) {
                  return opt.value === undefined || opt.value === null;
                }
                return opt.value === selectedValue || norm(opt.value) === norm(selectedValue);
              }) : undefined) as (typeof f.options extends undefined ? never : NonNullable<typeof f.options>[number]) | undefined;

              // Si pas de conditionalFields préconstruits, reconstruire depuis allNodes via nodeId persistant
              let conditionalFieldsToRender: TBLField[] = [];
              const conditionalFromOption = selectedOption && Array.isArray(selectedOption.conditionalFields) ? selectedOption.conditionalFields : [];
              if (conditionalFromOption.length > 0) {
                conditionalFieldsToRender = conditionalFromOption as TBLField[];
              } else {
                // Chercher nodeId persistant
                let cascaderNodeId: string | undefined;
                try {
                  if (typeof window !== 'undefined' && (window as any).TBL_FORM_DATA) {
                    const key = `${f.id}__selectedNodeId`;
                    const maybe = (window as any).TBL_FORM_DATA[key];
                    if (typeof maybe === 'string' && maybe.length > 0) cascaderNodeId = maybe;
                  }
                } catch {/* noop */}

                // Trouver le node correspondant et reconstruire les conditionnels
                if (cascaderNodeId) {
                  const matchingNode = allNodes.find(n => n.id === cascaderNodeId);
                  if (matchingNode) {
                    const childFields = allNodes.filter(childNode => childNode.parentId === matchingNode.id && childNode.type === 'leaf_option_field');
                    for (const child of childFields) {
                      conditionalFieldsToRender.push(buildConditionalFieldFromNode(child));
                    }
                    const sharedReferenceIds = findAllSharedReferencesRecursive(matchingNode.id, allNodes);
                    for (const refId of sharedReferenceIds) {
                      const refNode = allNodes.find(n => n.id === refId);
                      if (refNode) conditionalFieldsToRender.push(buildConditionalFieldFromNode(refNode));
                    }
                    // Fallback: si selectedValue est vide, utiliser le label du node
                    if (selectedValue === undefined || selectedValue === null) selectedValue = matchingNode.label;
                  }
                }
              }

              if (conditionalFieldsToRender.length > 0) {
                // Injecter juste après la copie
                conditionalFieldsToRender.forEach((cf) => {
                  // Éviter doublons au sein du même parent/option
                  const isAlreadyInFinalFields = finalFields.some(existingField => 
                    existingField.id === cf.id &&
                    (existingField as any).parentFieldId === f.id &&
                    (existingField as any).parentOptionValue === selectedValue
                  );
                  if (isAlreadyInFinalFields) return;

                  const fieldLabelBase = cf.sharedReferenceName || cf.label || String(selectedValue ?? '');
                  const fieldWithOrder = {
                    ...cf,
                    label: fieldLabelBase,
                    sharedReferenceName: fieldLabelBase,
                    order: nextOrder,
                    isConditional: true,
                    parentFieldId: f.id,
                    parentOptionValue: selectedValue,
                    mirrorTargetLabel: (selectedOption as any)?.label || String(selectedValue ?? '')
                  } as TBLField & { isConditional: true; parentFieldId: string; parentOptionValue: unknown };

                  finalFields.push(fieldWithOrder);
                  nextOrder++;
                });
              }
            } catch (e) {
              console.warn('[REPEATER COPY INJECTION] Échec injection conditionnels pour copie', { fieldId: f.id, error: e });
            }
          });
        }

        // 5) Ajouter le bouton + APRÈS les blocs
        const currentCopiesCount = maxBlocks;
        const canAdd = !maxItems || currentCopiesCount < (Number(maxItems) || Infinity);
        const buttonLabel = (field as any).repeater_addButtonLabel 
          || repeaterMetadata?.addButtonLabel 
          || (repeaterLabel && repeaterLabel !== 'Entrée' ? `Ajouter ${repeaterLabel}` : 'Ajouter une entrée');
        const addButtonField: TBLField = {
          ...field,
          id: `${field.id}_addButton`,
          type: 'REPEATER_ADD_BUTTON' as any,
          label: buttonLabel,
          order: nextOrder,
          isRepeaterButton: true,
          repeaterParentId: field.id,
          repeaterCanAdd: canAdd,
          repeaterInstanceCount: currentCopiesCount,
          repeaterButtonSize: buttonSize,
          repeaterButtonWidth: buttonWidth,
          repeaterIconOnly: false,
          repeater_buttonSize: 'middle',
          repeater_buttonWidth: 'full',
          repeater_iconOnly: false
        } as TBLField & { isRepeaterButton?: boolean };
        finalFields.push(addButtonField);
        nextOrder++;

        return; // on a géré ce répéteur ici
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
          // Ancienne implémentation ne gérait que _0_ — on généralise pour tous les index (_1_, _2_, …)
          if (rawSelectedValue === undefined) {
            // 1) Fallback direct via originalFieldId si présent
            const originalFieldId = (field as any).originalFieldId as string | undefined;
            if (originalFieldId && formData[originalFieldId] !== undefined) {
              rawSelectedValue = formData[originalFieldId];
            }
          }
          if (rawSelectedValue === undefined) {
            // 2) Fallback via motif namespace repeater: `${parentId}_${instanceIndex}_${originalId}`
            //    On extrait originalId avec une regex générale qui couvre tous les index
            const m = /^.+?_\d+?_(.+)$/.exec(field.id);
            if (m && m[1] && formData[m[1]] !== undefined) {
              rawSelectedValue = formData[m[1]];
            }
          }
          if (rawSelectedValue === undefined && field.id.includes('_0_')) {
            // 3) Compatibilité rétro: ancien format spécifique _0_
            const originalId = field.id.split('_0_')[1]; // Extraire l'ID original après le namespace
            if (originalId && formData[originalId] !== undefined) {
              rawSelectedValue = formData[originalId];
            }
          }
          if (rawSelectedValue === undefined) {
            // 4) Fallback de dernier recours: scan léger des clés formData pour un suffixe `_${originalId}`
            //    Utile si un autre schéma de namespace est utilisé (ex: multiple underscores avant l'originalId)
            const suffixMatch = (() => {
              const parts = field.id.split('_');
              if (parts.length >= 3) {
                // Si format standard repeater: parentId_<index>_<originalId>
                const maybeOriginal = parts.slice(2).join('_');
                return maybeOriginal || undefined;
              }
              return undefined;
            })();
            if (suffixMatch) {
              const key = Object.keys(formData).find(k => k === suffixMatch || k.endsWith(`_${suffixMatch}`));
              if (key && formData[key] !== undefined) {
                rawSelectedValue = formData[key];
              }
            }
          }
          
          // 🔧 CORRECTION: Normaliser les valeurs undefined pour éviter les problèmes de comparaison
          let selectedValue = rawSelectedValue === "undefined" ? undefined : rawSelectedValue;
          
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
          // On gardera ici l'id d'une éventuelle COPIE utilisée pour reconstruire la sélection,
          // afin d'attacher les champs injectés à la bonne instance (et non au template).
          let fallbackSelectedCopyId: string | undefined;
          if (!selectedOption && allNodes && allNodes.length > 0) {
            let matchingNode: RawTreeNode | undefined;
            let cascaderNodeId: string | undefined;

            if (typeof window !== 'undefined' && window.TBL_CASCADER_NODE_IDS) {
              cascaderNodeId = window.TBL_CASCADER_NODE_IDS[field.id];
            }

            // ✅ Fallback persistant: si le map volatile n'a pas l'entrée, regarder dans TBL_FORM_DATA
            if (!cascaderNodeId && typeof window !== 'undefined' && (window as any).TBL_FORM_DATA) {
              try {
                const TBL_FORM_DATA = (window as any).TBL_FORM_DATA as Record<string, unknown>;
                // 1) Clé exacte: `${field.id}__selectedNodeId`
                const directKey = `${field.id}__selectedNodeId`;
                let maybeId = TBL_FORM_DATA[directKey] as string | undefined;
                
                // 2) Monde SANS namespace: si on traite un TEMPLATE, regarder les COPIES liées
                //    (originalFieldId/sourceTemplateId) et utiliser leur `${copyId}__selectedNodeId`
                if ((!maybeId || typeof maybeId !== 'string') && Array.isArray(fields)) {
                  const relatedCopies = fields.filter(f => 
                    (f as any)?.originalFieldId === field.id || (f as any)?.sourceTemplateId === field.id
                  );
                  for (const copy of relatedCopies) {
                    const key = `${copy.id}__selectedNodeId`;
                    const val = TBL_FORM_DATA[key];
                    if (typeof val === 'string' && val.length > 0) {
                      maybeId = val as string;
                      console.log('🔁 [CASCADER FALLBACK COPY] Utilisation sélection de la copie:', {
                        templateId: field.id,
                        copyId: copy.id,
                        nodeId: maybeId
                      });
                      // 🧭 Mémoriser l'id de la copie pour attacher les champs injectés à cette instance
                      fallbackSelectedCopyId = copy.id;
                      break;
                    }
                  }
                }
                if (typeof maybeId === 'string' && maybeId.length > 0) {
                  cascaderNodeId = maybeId;
                }
              } catch { /* noop */ }
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
              // 🧩 Fallback: si la valeur sélectionnée est undefined, utiliser la valeur de l'option retenue
              if (selectedValue === undefined || selectedValue === null) {
                selectedValue = preBuiltOption.value as unknown;
                console.log('🧩 [FALLBACK SELECTED VALUE] selectedValue défini via preBuiltOption.value =', selectedValue);
              }
            } else if (matchingNode) {
              console.log('✅✅✅ [SECTION RENDERER] Option trouvée dans allNodes:', matchingNode);
              console.log('🔍 [MATCHING NODE DEBUG] Détails complets du nœud:', {
                id: matchingNode.id,
                label: matchingNode.label,
                type: matchingNode.type,
                parentId: matchingNode.parentId,
                sharedReferenceIds: matchingNode.sharedReferenceIds,
                sharedReferenceId: matchingNode.sharedReferenceId,
                metadata: matchingNode.metadata
              });

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
                allNodesCount: allNodes.length,
                directSharedRefs: matchingNode.sharedReferenceIds,
                directSharedRef: matchingNode.sharedReferenceId,
                childrenByParentId: allNodes.filter(n => n.parentId === matchingNode.id).map(c => ({
                  id: c.id,
                  label: c.label,
                  type: c.type,
                  sharedReferenceIds: c.sharedReferenceIds
                }))
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
              // 🧩 Fallback: si selectedValue est undefined, utiliser le label de l'option reconstruite
              if (selectedValue === undefined || selectedValue === null) {
                selectedValue = reconstructedOption.value as unknown;
                console.log('🧩 [FALLBACK SELECTED VALUE] selectedValue défini via reconstructedOption.value =', selectedValue);
              }
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
              // 🔄 Cas repeater: appliquer namespaceRepeaterField SAUF pour les références partagées
              if (selectedOption?.label === 'Mesure simple') {
                console.log('💥💥💥 [MESURE SIMPLE REPEATER] CHECKING SHARED REFERENCES');
              }
              conditionalFieldsToRender = rawConditionalFields.map((conditionalField, index) => {
                if ((conditionalField as any).isRepeaterInstance) {
                  return conditionalField;
                }
                
                // 🚨 NOUVELLE LOGIQUE: Bypass namespacing pour les références partagées ET les nœuds backend
                const hasSharedReferences = !!(
                  conditionalField.sharedReferenceId || 
                  (conditionalField.sharedReferenceIds && conditionalField.sharedReferenceIds.length > 0)
                );
                
                // 🔥 NOUVEAU: Bypass pour les nœuds backend (GRD, Prix Kwh, etc.)
                const isBackendNode = !!(
                  (conditionalField as any).metadata?.sourceType === 'tree' ||
                  (conditionalField as any).config?.sourceType === 'tree' ||
                  (conditionalField as any).nodeId ||
                  (conditionalField as any).metadata?.nodeId || // Vérifier aussi dans les métadonnées
                  (conditionalField as any).config?.nodeId || // Vérifier aussi dans la config
                  (conditionalField as any).metadata?.sourceRef ||
                  (conditionalField.id && conditionalField.id.startsWith('node_')) // Fallback: l'ID ressemble à un ID de noeud backend
                );
                
                if (hasSharedReferences || isBackendNode) {
                  if (selectedOption?.label === 'Mesure simple') {
                    if (hasSharedReferences) {
                      console.log(`🔥 [${index + 1}] BYPASS NAMESPACE (shared ref):`, {
                        id: conditionalField.id,
                        label: conditionalField.label,
                        sharedReferenceId: conditionalField.sharedReferenceId,
                        sharedReferenceIds: conditionalField.sharedReferenceIds,
                        sharedReferenceName: conditionalField.sharedReferenceName
                      });
                    }
                    if (isBackendNode) {
                      console.log(`🔥 [${index + 1}] BYPASS NAMESPACE (backend node):`, {
                        id: conditionalField.id,
                        label: conditionalField.label,
                        nodeId: (conditionalField as any).nodeId || (conditionalField as any).metadata?.nodeId || (conditionalField as any).config?.nodeId,
                        sourceType: (conditionalField as any).metadata?.sourceType || (conditionalField as any).config?.sourceType,
                        sourceRef: (conditionalField as any).metadata?.sourceRef,
                        idLooksLikeNode: conditionalField.id && conditionalField.id.startsWith('node_')
                      });
                    }
                  }
                  // Retourner le champ tel quel, en s'assurant que nodeId est bien présent à la racine
                  return {
                    ...conditionalField,
                    nodeId: (conditionalField as any).nodeId || conditionalField.id
                  };
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
                  console.log(`💥 [${index + 1}] NAMESPACÉ (pas de shared ref):`, {
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
            // Si la sélection a été reconstruite à partir d'une COPIE, on laisse l'injection se faire au niveau de la copie
            if (fallbackSelectedCopyId && fallbackSelectedCopyId !== field.id) {
              console.log('↪️ [INJECTION SKIP] Sélection reconstruite depuis une copie, injection déléguée à la copie.', {
                templateId: field.id,
                fallbackSelectedCopyId
              });
              return; // ne pas injecter ici
            }
            // Déterminer le parentFieldId à utiliser pour l'injection
            // Si nous avons reconstruit la sélection via une COPIE, attacher aux champs de la copie.
            const parentIdForInjection = field.id;
            if (selectedOption?.label === 'Mesure simple') {
              console.log('🧭 [INJECTION PARENT] Détermination du parentFieldId pour injection:', {
                fieldId: field.id,
                fallbackSelectedCopyId,
                parentIdForInjection
              });
            }
            // 🎉 LOG FINAL POUR MESURE SIMPLE
            if (selectedOption?.label === 'Mesure simple') {
              console.log(`\n${'🎉'.repeat(50)}`);
              console.log('🎉🎉🎉 [MESURE SIMPLE INJECTION] INJECTION FINALE RÉUSSIE !');
              console.log('🎉 Champs injectés:', conditionalFieldsToRender.map(cf => ({
                id: cf.id,
                label: cf.label,
                type: cf.type,
                sharedReferenceName: cf.sharedReferenceName,
                sharedReferenceId: cf.sharedReferenceId,
                sharedReferenceIds: cf.sharedReferenceIds
              })));
              console.log(`${'🎉'.repeat(50)}\n`);
            } else {
              console.log('🔍 [CONDITIONAL FIELDS] Injection de champs conditionnels:', {
                fieldId: field.id,
                fieldLabel: field.label,
                selectedOptionLabel: selectedOption?.label,
                conditionalFieldsCount: conditionalFieldsToRender.length,
                conditionalFields: conditionalFieldsToRender.map(cf => ({
                  id: cf.id,
                  label: cf.label,
                  type: cf.type,
                  sharedReferenceName: cf.sharedReferenceName
                }))
              });
            }
            
            if (fallbackSelectedCopyId) {
              dlog(`[SKIP INJECTION @TEMPLATE] La sélection appartient à une copie (${fallbackSelectedCopyId}). L'injection se fera au niveau de la copie.`);
            } else {
              if (conditionalFieldsToRender !== rawConditionalFields) {
                (selectedOption as unknown as { conditionalFields?: TBLField[] }).conditionalFields = conditionalFieldsToRender;
              }
              const injSignatureObj = {
                fieldId: parentIdForInjection,
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
                dlog(`(déjà loggé) Injection inchangée pour field=${parentIdForInjection} option=${selectedOption.value}`);
              }
              
              // Injecter TOUS les champs conditionnels avec des ordres séquentiels
              conditionalFieldsToRender.forEach((conditionalField, index) => {
              // 🔥 VÉRIFICATION AMÉLIORÉE: Éviter les doublons basé sur plusieurs critères
              const isAlreadyInFinalFields = finalFields.some(existingField => 
                existingField.id === conditionalField.id &&
                (existingField as any).parentFieldId === parentIdForInjection &&
                (existingField as any).parentOptionValue === selectedValue
              );
              
              // 🔥 NOUVELLE VÉRIFICATION: Éviter les doublons basés sur parentFieldId + parentOptionValue
              const isDuplicateBasedOnParent = finalFields.some(existingField => 
                existingField.parentFieldId === parentIdForInjection && 
                existingField.parentOptionValue === selectedValue &&
                existingField.label === conditionalField.label
              );
              
              if (isAlreadyInFinalFields || isDuplicateBasedOnParent) {
                console.log('🚫 [CONDITIONAL FIELD] Éviter doublon - champ déjà présent:', {
                  id: conditionalField.id,
                  label: conditionalField.label,
                  parentField: parentIdForInjection,
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
                parentFieldId: parentIdForInjection,
                parentOptionValue: selectedValue, // Utiliser la valeur normalisée (peut provenir du fallback si undefined)
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
    
    // (le traitement des repeaters se fait inline ci-dessus)
    
    // 🔥 DÉDUPLICATION FINALE: Nettoyer les doublons potentiels
    // IMPORTANT: on ne doit PAS fusionner deux champs conditionnels provenant de parents différents
    // (ex: Versant original vs Versant (Copie 1) vs Versant (Copie 2)).
    // On considère donc un champ unique par triplet (id, parentFieldId, parentOptionValue) lorsqu'il est conditionnel.
    const uniqueFields = finalFields.reduce((acc, field) => {
      const isConditional = (field as any).isConditional === true;
      const compositeKey = isConditional
        ? `${field.id}::${(field as any).parentFieldId || 'no-parent'}::${(field as any).parentOptionValue ?? ''}`
        : field.id;

      const existingFieldIndex = acc.findIndex(existingField => {
        const existingIsConditional = (existingField as any).isConditional === true;
        const existingKey = existingIsConditional
          ? `${existingField.id}::${(existingField as any).parentFieldId || 'no-parent'}::${(existingField as any).parentOptionValue ?? ''}`
          : existingField.id;
        return existingKey === compositeKey;
      });
      
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
          parentFieldId: (field as any).parentFieldId,
          parentOptionValue: (field as any).parentOptionValue,
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
    
    // 🔥 FILTRE CRITIQUE: Exclure les COPIES de répéteurs (identifiées par metadata.sourceTemplateId)
    // Ces copies ne doivent s'afficher que dans le répéteur lui-même, pas comme des champs normaux
    const result = orderedFields.filter(field => {
      const meta = (field.metadata || {}) as any;
      const sourceTemplateId = meta?.sourceTemplateId;
      const fieldParentId = (field as any)?.parentRepeaterId || (field as any)?.parentId || (allNodes.find(n => n.id === field.id)?.parentId || undefined);
      if (sourceTemplateId && isCopyFromRepeater(sourceTemplateId, allNodes, fieldParentId)) {
        console.log(`🚫 [COPY-FILTER] Exclusion de copie: "${field.label}" (sourceTemplateId: ${meta.sourceTemplateId})`);
        return false;
      }
      return true;
    });
    
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
      nbExcludedCopies: orderedFields.length - result.length,
      resultFieldsConditionnels: result.filter(f => (f as any).isConditional).length,
      detailsChamps: result.map(f => ({
        id: f.id,
        label: f.label,
        order: f.order,
        isConditional: (f as any).isConditional
      }))
    });
    
    return result;
  }, [orderedFields, section.title, allNodes]);

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

    // 🔥 CORRECTION CRITIQUE: Pré-chargement batch UNIQUEMENT au montage du composant
    // ❌ NE PAS mettre formData dans les dépendances car ça relance l'API à chaque frappe !
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDataSection, section.fields, evaluateBatch]); // ✅ formData intentionnellement omis pour éviter les appels API à chaque frappe

    const renderDataSectionField = (field: TBLField) => {
    // 🔥 CORRECTION CRITIQUE: Synthétiser capabilities.data pour les champs condition/formula
    // Si le champ n'a pas de data_instances mais a une sourceRef dans ses metadata,
    // créer un objet data synthétique pour que getDisplayValue() fonctionne correctement
    let effectiveCapabilities = field.capabilities;
    
    // ⚠️ DEBUG DÉSACTIVÉ pour performance - réactiver si besoin
    // console.log(`🎯 [RENDER DATA FIELD] Début renderDataSectionField pour: "${field.label}" (id: ${field.id})`);
    
    // 🔥 CORRECTION: Les champs avec data.instances vides seront gérés par PRIORITÉ 0 dans getDisplayValue()
    
    // 🔥 CORRECTION CRITIQUE : Si le champ a une capacité Table (lookup ou matrix), utiliser le renderer éditable
    const hasTableCapability = effectiveCapabilities?.table?.enabled;
    const hasRowOrColumnMode = effectiveCapabilities?.table?.currentTable?.rowBased === true || 
                               effectiveCapabilities?.table?.currentTable?.columnBased === true;
  // Note: le mode 'matrix' est géré en affichage (BackendValueDisplay), pas en édition
    
    //  Détection des champs répétables
    const isRepeater = field.type === 'leaf_repeater' || 
                       field.type === 'LEAF_REPEATER' ||
                       (field as any).fieldType === 'leaf_repeater' ||
                       (field as any).fieldType === 'LEAF_REPEATER';
    
  // Rendre éditable si c'est un lookup (rowBased/columnBased) OU un répétable
  // ⚠️ Ne PAS traiter les résultats de matrice comme éditables: ils doivent s'afficher via BackendValueDisplay
  if ((hasTableCapability && hasRowOrColumnMode) || isRepeater) {
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
            value={extractFieldValue(field.id)}
            allNodes={allNodes}
            onChange={(value) => handleFieldChange(field.id, value, field.label)}
            isValidation={isValidation}
            formData={formData}
            treeId={treeId}
          />
        </Col>
      );
    }
    
    // 🎯 Système TreeBranchLeaf : connexion aux capacités réelles (DISPLAY ONLY)
    const getDisplayValue = () => {
      const capabilities = effectiveCapabilities;
      
  dlog(`🔬 [TEST CAPABILITIES] Champ "${field.label}" - Capabilities présentes:`, !!capabilities);
  console.log(`🔥 [DEBUG CAPABILITIES] "${field.label}":`, {
    hasData: !!capabilities?.data,
    dataActiveId: capabilities?.data?.activeId,
    dataInstancesCount: Object.keys(capabilities?.data?.instances || {}).length,
    dataSourceType: (capabilities?.data?.instances?.[capabilities?.data?.activeId as string] as any)?.metadata?.sourceType,
    dataSourceRef: (capabilities?.data?.instances?.[capabilities?.data?.activeId as string] as any)?.metadata?.sourceRef,
    hasTable: !!capabilities?.table,
    hasFormula: !!capabilities?.formula,
    fieldId: field.id,
    fieldLabel: field.label
  });

      // ✨ Check 0: valeur "miroir" issue d'un champ conditionnel associé (ex: "Prix Kw/h - Champ")
      // Permet d'afficher instantanément la valeur saisie quand aucune capacité Data/Formula n'est disponible
      const mirrorKey = `__mirror_data_${field.label}`;
      const mirrorValue: unknown = (formData as Record<string, unknown>)[mirrorKey];
      const hasDynamicCapabilities = Boolean(capabilities?.data?.instances || capabilities?.formula);
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

      // 🔥 PRIORITÉ 0 (AVANT TOUT): Si data.instances existe MAIS EST VIDE, c'est une condition/formule
      // → Afficher directement via BackendValueDisplay avec field.id
      // ✅ CORRECTION: Vérifier aussi si le champ a une sourceRef dans ses métadonnées
      // 🎯 MEGA FIX: Même SANS sourceRef, si data.instances est vide mais data.enabled = true,
      //    c'est probablement un champ calculé → tenter avec field.id
      const hasEmptyInstances = capabilities?.data?.instances && Object.keys(capabilities.data.instances).length === 0;
      const hasDataCapability = capabilities?.data?.enabled || (capabilities?.data?.instances !== undefined);
      
      if (hasEmptyInstances && hasDataCapability && treeId && field.id) {
        console.log(`🚀🚀🚀 [MEGA FIX BACKEND] Champ "${field.label}" (${field.id}) - Affichage valeur stockée`);
        return (
          <CalculatedValueCard
            nodeId={field.id}
            unit={(field.config as any)?.unit}
            precision={(field.config as any)?.decimals ?? 2}
            placeholder="---"
          />
        );
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
        let dataSourceType = candidateDataInstance?.metadata?.sourceType;
        let dataSourceRef = candidateDataInstance?.metadata?.sourceRef as string | undefined;
        
        // 🔥 FIX ULTRA SIMPLE: Si data.instances est vide mais le champ a une sourceRef dans ses métadonnées,
        // on l'utilise directement. C'est pour les champs condition/formula qui n'ont pas de data_instances.
        if (!dataSourceRef) {
          const fieldMeta = (field as any).metadata || {};
          const fallbackSourceRef = fieldMeta.sourceRef || (field as any).sourceRef;
          if (fallbackSourceRef && typeof fallbackSourceRef === 'string') {
            dataSourceRef = fallbackSourceRef;
            dataSourceType = 'tree';
            console.log(`🔧 [FALLBACK SOURCEREF] Utilisation sourceRef du champ pour "${field.label}": ${dataSourceRef}`);
          }
        }
        
        // 🚫 Suppression de la préférence forcée formule : on suit exactement la sourceRef.
        // Si la sourceRef cible une condition -> on affiche la condition (bool / valeur) via BackendCalculatedField.
        // Si l'utilisateur veut une formule, la sourceRef doit explicitement être "formula:<id>".
        if (dataSourceType === 'tree' && typeof dataSourceRef === 'string') {
          const r = dataSourceRef;
          if (r.startsWith('condition:') || r.startsWith('formula:') || r.startsWith('node-formula:') || r.startsWith('@value.') || r.startsWith('@table.')) {
            dlog(`Routing data direct sourceRef='${r}'`);
            const dMeta = (candidateDataInstance as { displayFormat?: string; unit?: string; precision?: number } | undefined) || {};
            // Récupérer le nodeId selon le type de sourceRef
            if (!treeId) {
              return <span style={{ color: '#888' }}>---</span>;
            }
            // Choix du nodeId à évaluer
            const looksLikeUuid = (s?: string) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
            let nodeIdToUse: string | undefined;
            
            // 🔥 FIX CRITIQUE: Pour condition/formula, utiliser field.id (pas l'ID de la sourceRef)
            // Car le backend retourne les résultats indexés par field.id, pas par l'ID de la condition/formule
            if (r.startsWith('condition:') || r.startsWith('formula:') || r.startsWith('node-formula:')) {
              nodeIdToUse = field.id; // Utiliser l'ID du champ, pas celui de la condition/formule
              console.log(`✅ [FIX FORMULA/CONDITION] Utilisation field.id pour la recherche backend: ${nodeIdToUse} (sourceRef était: ${r})`);
            } else if (r.startsWith('@value.')) {
              nodeIdToUse = r.split('@value.')[1]; // "@value.xyz" -> "xyz"
              dlog(`✅ [FIX @VALUE] Extraction nodeId direct de sourceRef: ${nodeIdToUse}`);
            } else if (r.startsWith('@table.')) {
              // Cas @table.*: correctif existant car activeId peut être la table conteneur
              const tableActiveId = (capabilities?.table as any)?.activeId as string | undefined;
              const fieldNodeId = (field as any).nodeId || (field as any).metadata?.originalNodeId || field.id;
              nodeIdToUse = dataActiveId;
              // Si activeId est égal à l'ID de table ou est absent, basculer sur l'ID du champ
              if (!nodeIdToUse || (tableActiveId && nodeIdToUse === tableActiveId)) {
                nodeIdToUse = fieldNodeId;
              }
              // Sécurité: si nodeIdToUse ne ressemble pas à un UUID, mais field.id oui, prendre field.id
              if (!looksLikeUuid(nodeIdToUse) && looksLikeUuid(field.id)) {
                nodeIdToUse = field.id;
              }
              dlog(`✅ [TABLE RESOLUTION] nodeIdToUse final: ${nodeIdToUse}`);
            } else {
              // Fallback: utiliser dataActiveId
              nodeIdToUse = dataActiveId as string | undefined;
            }

            if (!nodeIdToUse) {
              return <span style={{ color: '#888' }}>---</span>;
            }

            // ✅ NOUVEAU SYSTÈME : CalculatedValueCard affiche la valeur STOCKÉE
            return (
              <CalculatedValueCard
                nodeId={nodeIdToUse}
                unit={dMeta.unit}
                precision={typeof dMeta.precision === 'number' ? dMeta.precision : (field.config?.decimals || 2)}
                placeholder="---"
              />
            );
          }
        }
      } catch (e) {
        console.warn('⚠️ [PREFERENCE] Erreur lors de la vérification priorité formule vs donnée:', e);
      }
      
  // ✨ PRIORITÉ 1: Capacité Data avec instances PEUPLÉES (données dynamiques depuis TreeBranchLeafNodeVariable)
  if ((capabilities?.data?.enabled || capabilities?.data?.instances) && 
      capabilities?.data?.instances && 
      Object.keys(capabilities.data.instances).length > 0) {
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
              let variableNodeId = (capabilities?.data?.activeId) || (capabilities?.data?.instances ? Object.keys(capabilities.data.instances)[0] : undefined);
              
              // 🔥 FIX CRITIQUE FORMULE: Pour les formules/conditions, le backend retourne les résultats
              // avec le nodeId du CHAMP D'AFFICHAGE (field.id), PAS le nodeId de la formule elle-même.
              // On doit donc TOUJOURS utiliser field.id pour les formules/conditions.
              if (isCondition || isFormula) {
                variableNodeId = field.id;
                console.log(`🔥🔥🔥 [FIX ${isFormula ? 'FORMULA' : 'CONDITION'}] Utilisation de field.id: ${variableNodeId} pour "${field.label}"`);
              }
              
              if (!variableNodeId || !treeId) {
                return <span style={{ color: '#888' }}>---</span>;
              }
              
              // ✅ NOUVEAU SYSTÈME : CalculatedValueCard affiche la valeur STOCKÉE
              return (
                <CalculatedValueCard
                  nodeId={variableNodeId}
                  unit={dataInstance?.unit as string | undefined}
                  precision={dataInstance?.precision as number | undefined}
                  placeholder="---"
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
              
              // ✅ NOUVEAU SYSTÈME : CalculatedValueCard affiche la valeur du champ d'affichage
              // 🔥 FIX CRITIQUE: Utiliser field.id et non instanceId
              // Le backend stocke la valeur calculée dans le nœud du CHAMP D'AFFICHAGE
              return (
                <CalculatedValueCard
                  nodeId={field.id}
                  unit={dataInstance?.unit as string | undefined}
                  precision={dataInstance?.precision as number | undefined}
                  placeholder="---"
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
        
        // ✅ NOUVEAU SYSTÈME : CalculatedValueCard affiche la valeur STOCKÉE
        // 🔥 FIX CRITIQUE: Utiliser field.id (nodeId du champ d'affichage) et non formulaId
        // Le backend stocke les résultats avec le nodeId du CHAMP D'AFFICHAGE
        return (
          <CalculatedValueCard
            nodeId={field.id}
            unit={field.config?.unit}
            precision={field.config?.decimals || 4}
            placeholder="---"
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
          // ✅ NOUVEAU SYSTÈME : CalculatedValueCard affiche la valeur du champ d'affichage
          // 🔥 FIX CRITIQUE: Utiliser field.id et non extractedNodeId
          // Le backend stocke la valeur calculée dans le nœud du CHAMP D'AFFICHAGE
          return (
            <CalculatedValueCard
              nodeId={field.id}
              unit={cfg?.unit}
              precision={cfg?.decimals || 2}
              placeholder="---"
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
              console.log(`✅ [RENDER DATA FIELD] Fin renderDataSectionField pour: "${field.label}" - displayValue:`, displayValue);
              
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
                  {(() => {
                    const filteredFields = orderedFields.filter(field => {
                      const meta = (field.metadata || {}) as any;
                      const sourceTemplateId = meta?.sourceTemplateId;
                      const fieldParentId = (field as any)?.parentRepeaterId || (field as any)?.parentId || (allNodes.find(n => n.id === field.id)?.parentId || undefined);
                      const isRepeaterVariant = Boolean((field as any).parentRepeaterId) || (sourceTemplateId && isCopyFromRepeater(sourceTemplateId, allNodes, fieldParentId));
                      if (sourceTemplateId && isCopyFromRepeater(sourceTemplateId, allNodes, fieldParentId)) {
                        console.log(`🚫 [COPY-FILTER] Exclusion de copie DATA SECTION: "${field.label}" (sourceTemplateId: ${meta.sourceTemplateId})`);
                        return false;
                      }
                      if (isRepeaterVariant) {
                        console.log(`🚫 [REPEATER-FILTER] Exclusion de variante repeater DATA SECTION: "${field.label}" (id: ${field.id})`);
                      }
                      return !isRepeaterVariant;
                    });
                    
                    console.log(`🎯🎯🎯 [DATA SECTION ROW] Rendering ${filteredFields.length} filtered fields in Row:`, filteredFields.map(f => ({ id: f.id, label: f.label })));
                    
                    return filteredFields.map(field => {
                      const rendered = renderDataSectionField(field);
                      console.log(`✅✅✅ [DATA SECTION FIELD RENDERED] "${field.label}" -> JSX element:`, rendered);
                      return rendered;
                    });
                  })()}
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
                    const buttonSize = (field as any).repeater_buttonSize ?? (field as any).repeaterButtonSize ?? 'middle'; // tiny, small, middle, large
                    const buttonWidth = (field as any).repeater_buttonWidth ?? (field as any).repeaterButtonWidth ?? 'auto'; // auto, half, full
                    const iconOnly = isAddButton ? false : ((field as any).repeater_iconOnly ?? (field as any).repeaterIconOnly ?? false); // add button shows label
                    
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
                        className="mb-2 tbl-form-col"
                        style={{}}
                      >
                        {/* Rendre le bouton d'ajout dans le même wrapper qu'un champ pour alignement parfait */}
                        <Form.Item
                          className={`mb-4 ${isMobile ? 'tbl-form-item-mobile' : ''}`}
                          labelCol={{ span: 24 }}
                          wrapperCol={{ span: 24 }}
                          colon={false}
                          // Réserver l'espace du label pour s'aligner avec les autres champs
                          label={<span style={{ visibility: 'hidden' }}>.</span>}
                          style={{ width: '150px' }}
                        >
                          <Button
                            type={isAddButton ? 'dashed' : 'dashed'}
                            ghost={false}
                            size={isAddButton ? 'middle' : 'middle'}
                            block={false}
                            danger={isRemoveInstanceButton}
                            icon={isAddButton ? <PlusOutlined /> : <MinusCircleOutlined />}
                            aria-label={isAddButton ? (field.label || 'Ajouter') : 'Répéteur'}
                            style={{
                              height: isAddButton ? 32 : 32,
                              width: '150px',
                              fontSize: '14px',
                              borderRadius: '6px',
                              borderStyle: 'dashed',
                              backgroundColor: isAddButton ? '#fff' : undefined,
                              borderColor: isAddButton ? '#d9d9d9' : undefined,
                              color: isAddButton ? undefined : undefined,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '0 12px'
                            }}
                            onClick={async () => {
                            if (isAddButton) {
                              // 🎯 NOUVELLE LOGIQUE: Utiliser l'API de copie réelle
                              console.log(`\n${'🚀'.repeat(30)}`);
                              console.log(`🚀🚀🚀 [CRÉATION VERSANT] Bouton "Ajouter Versant" cliqué !`);
                              console.log(`🚀 repeaterParentId: ${repeaterParentId}`);
                              console.log(`🚀 Utilisation de l'API de copie au lieu du namespace`);
                              console.log(`${'🚀'.repeat(30)}\n`);
                              
                                let optimisticOk = true;
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
                                
                                // 🎯 Premièrement: ajouter l'instance UI localement (optimistic UI)
                                try {
                                  const newCount = instanceCount + 1;
                                  onChange(instanceCountKey, newCount);
                                } catch (e) {
                                  console.warn('⚠️ [REPEATER] Échec optimistic add instance', e);
                                }

                                // Appel à l'API de copie (opération asynchrone en arrière-plan)
                                const response = await api.post(`/api/treebranchleaf/nodes/${repeaterParentId}/duplicate-templates`, {
                                  templateNodeIds
                                });
                                
                                console.log(`✅ [COPY-API] Copie créée:`, response);
                                
                                // ✅ Réponse reçue. On n'appelle PAS TBL_FORCE_REFRESH pour éviter le rechargement
                                // du formulaire complet et l'affichage d'un loader. On émet un événement local
                                // pour indiquer qu'une duplication a été effectuée, mais en demandant aux
                                // listeners de ne pas forcer un rechargement (suppressReload).
                                try {
                                  const duplicatedArray = (response && (response.duplicated || (response as any).data?.duplicated)) || [];
                                  const normalizedDuplicated = duplicatedArray.map((d: any) => ({ id: d?.id || d, parentId: d?.parentId || (d?.node || {})?.parentId || undefined, sourceTemplateId: d?.sourceTemplateId || (d?.metadata || {})?.sourceTemplateId || undefined }));
                                  console.log('[COPY-API] Dispatching tbl-repeater-updated (silent) duplicated:', normalizedDuplicated.map(d => d.id));
                                  window.dispatchEvent(new CustomEvent('tbl-repeater-updated', {
                                    detail: {
                                      treeId: treeId,
                                      nodeId: repeaterParentId,
                                      source: 'duplicate-templates',
                                      duplicated: normalizedDuplicated,
                                      suppressReload: true,
                                      timestamp: Date.now()
                                    }
                                  }));
                                } catch (e) {
                                  console.warn('⚠️ [COPY-API] Impossible de dispatch tbl-repeater-updated (silent)', e);
                                }
                                
                                } catch (error) {
                                  console.error('❌ [COPY-API] Erreur lors de la copie:', error);
                                  optimisticOk = false;
                                }

                                // Si la duplication a échoué côté serveur, annuler l'optimistic UI
                                if (!optimisticOk) {
                                  try {
                                    const newCount = Math.max(0, (formData[instanceCountKey] as number || 1) - 1);
                                    onChange(instanceCountKey, newCount);
                                  } catch (e) {
                                    console.warn('⚠️ [COPY-API] Impossible d’annuler l’instance localement', e);
                                  }
                                }
                            } else if (isRemoveInstanceButton) {
                              // Supprimer une instance spécifique
                              dlog(`🔁 [REPEATER] Suppression instance #${instanceIndex + 1}:`, {
                                repeaterParentId,
                                instanceIndex,
                                oldCount: instanceCount
                              });
                              
                              // 🎯 Diminuer immédiatement le compteur localement (optimistic)
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
                            {isAddButton ? (field.label || 'Ajouter') : (!iconOnly && field.label)}
                          </Button>
                        </Form.Item>
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
                        key={`${field.id}__pf_${(field as any).parentFieldId || 'none'}`}
                        xs={24}
                        sm={12}
                        md={field.type === 'textarea' || field.type === 'TEXTAREA' ? 24 : 8}
                        lg={field.type === 'textarea' || field.type === 'TEXTAREA' ? 24 : 6}
                        xl={field.type === 'textarea' || field.type === 'TEXTAREA' ? 24 : 6}
                        className="mb-2 tbl-form-col conditional-field-injected"
                        data-parent-field-id={(field as any).parentFieldId || ''}
                        data-parent-option-value={String((field as any).parentOptionValue ?? '')}
                        data-field-id={field.id}
                        data-field-label={field.label || ''}
                      >
                        <TBLFieldRendererAdvanced
                          field={field}
                          value={extractFieldValue(field.id)}
                          allNodes={allNodes}
                          onChange={(value) => handleFieldChange(field.id, value, field.label)}
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
                                value={extractFieldValue(condField.id)}
                                allNodes={allNodes}
                                onChange={(value) => handleFieldChange(condField.id, value, condField.label)}
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
                                value={extractFieldValue(field.id)}
                                allNodes={allNodes}
                                onChange={(value) => handleFieldChange(field.id, value, field.label)}
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
                      {/* Contrôles de copies: on garde seulement ➕ (sur le dernier champ du groupe) et un bouton 🗑️ pour supprimer TOUTE la copie (sur le dernier champ du groupe) */}
                      {(field.canAddNewCopy || (field as any).isLastInCopyGroup) && (
                        <div style={{ 
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px'
                        }}>
                          <div style={{ flex: 1 }}>
                            <TBLFieldRendererAdvanced
                              field={field}
                              value={extractFieldValue(field.id)}
                              allNodes={allNodes}
                              onChange={(value) => handleFieldChange(field.id, value, field.label)}
                              disabled={disabled}
                              formData={formData}
                              treeMetadata={field.treeMetadata}
                              treeId={treeId}
                            />
                          </div>
                          
                          {/* BOUTONS D'ACTION (par groupe de copie) */}
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {/* ➕ Plus par champ désactivé: on ne garde que le bouton + du répéteur */}
                            
                            {/* 🗑️ BOUTON SUPPRIMER TOUTE LA COPIE (affiché sur le dernier champ du groupe) */}
                            {(field as any).isLastInCopyGroup && (field as any).parentRepeaterId && (
                              <Button
                                type="text"
                                danger
                                size="small"
                                shape="circle"
                                icon={<DeleteOutlined />}
                                title={`Supprimer cette copie`}
                                style={{
                                  marginTop: '4px',
                                  minWidth: '24px',
                                  height: '24px',
                                  padding: '0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                onClick={() => handleDeleteCopyGroup(field)}
                              />
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* RENDU NORMAL (sans boutons d'action) */}
                      {!field.canAddNewCopy && !(field as any).isLastInCopyGroup && (
                        <TBLFieldRendererAdvanced
                          field={field}
                          value={extractFieldValue(field.id)}
                          allNodes={allNodes}
                          onChange={(value) => handleFieldChange(field.id, value, field.label)}
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
                    allSections={allSections}
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
                      allSections={allSections}
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

// ✅ MÉMOÏSATION AVEC COMPARAISON CUSTOM pour éviter les re-rendus à chaque frappe
const MemoizedTBLSectionRenderer = React.memo(TBLSectionRenderer, (prevProps, nextProps) => {
  // Ne re-render que si les props pertinentes changent
  if (prevProps.section.id !== nextProps.section.id) return false;
  if (prevProps.disabled !== nextProps.disabled) return false;
  if (prevProps.treeId !== nextProps.treeId) return false;
  if (prevProps.level !== nextProps.level) return false;
  
  // ⚠️ CRITIQUE: Comparer SEULEMENT les valeurs des champs de CETTE section
  const prevFieldIds = prevProps.section.fields.map(f => f.id);
  const nextFieldIds = nextProps.section.fields.map(f => f.id);
  
  // Si les champs ont changé (ajout/suppression), re-render
  if (prevFieldIds.length !== nextFieldIds.length) return false;
  if (!prevFieldIds.every((id, i) => id === nextFieldIds[i])) return false;
  
  // Comparer les VALEURS des champs de cette section uniquement
  for (const fieldId of prevFieldIds) {
    if (prevProps.formData[fieldId] !== nextProps.formData[fieldId]) {
      return false; // Une valeur a changé, re-render
    }
  }
  
  // Aucun changement pertinent, ne pas re-render
  return true;
});

MemoizedTBLSectionRenderer.displayName = 'TBLSectionRenderer';

export default MemoizedTBLSectionRenderer;
