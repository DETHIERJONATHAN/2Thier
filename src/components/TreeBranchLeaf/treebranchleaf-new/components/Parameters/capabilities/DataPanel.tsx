import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, Form, Input, Checkbox, Typography, Select, Space, message, Button, InputNumber, Switch, Divider, Tag } from 'antd';
import { useAuthenticatedApi } from '../../../../../../hooks/useAuthenticatedApi';
import { useDebouncedCallback } from '../../../hooks/useDebouncedCallback';
import NodeTreeSelector, { NodeTreeSelectorValue } from '../shared/NodeTreeSelector';
import { useEvalBridge } from '../../../TBL/bridge/evalBridge';
import { logger } from '../../../../../../lib/logger';

const { Title, Text } = Typography;

interface DataPanelProps {
  treeId: string;
  nodeId: string;
  value?: {
    exposedKey?: string;
    sourceType?: 'fixed' | 'tree';
    fixedValue?: string;
    sourceRef?: string; // Nouvelle propriété pour la référence d'arborescence
    displayFormat?: 'number' | 'text' | 'boolean' | 'date' | 'currency' | 'percentage';
    unit?: string;
    precision?: number;
    visibleToUser?: boolean;
  } | Record<string, unknown>;
  onChange?: (val: Record<string, unknown>) => void;
  readOnly?: boolean;
}

type DataInstance = {
  id: string;
  name: string;
  config: {
    exposedKey?: string; // Gardé pour compatibilité
    sourceType?: 'fixed' | 'tree'; // Type de source (toujours 'tree' par défaut)
    fixedValue?: string; // Conservé pour compatibilité
    sourceRef?: string; // Référence d'arborescence (@value.nodeId, @select.nodeId, formule, etc.)
    sourceRefName?: string; // 🎯 NOUVEAU : Nom de la capacité référencée pour l'affichage
    displayFormat?: 'number' | 'text' | 'boolean' | 'date' | 'currency' | 'percentage';
    unit?: string;
    precision?: number;
    visibleToUser?: boolean;
  };
  enabled?: boolean;
};

const formatOptions = [
  { value: 'number', label: 'Nombre' },
  { value: 'text', label: 'Texte' },
  { value: 'boolean', label: 'Booléen' },
  { value: 'date', label: 'Date' },
  { value: 'currency', label: 'Devise' },
  { value: 'percentage', label: 'Pourcentage' }
];

const DataPanel: React.FC<DataPanelProps> = ({ treeId, nodeId, value, onChange, readOnly }) => {
  const { api } = useAuthenticatedApi();
  const { enqueue } = useEvalBridge();
  type EnqueueResp = { value?: unknown; calculatedValue?: unknown; evaluation?: { result?: unknown; details?: { message?: string } }; result?: unknown; conditionName?: string } | undefined;
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  const [instances, setInstances] = useState<DataInstance[]>([]);
  const [variableId, setVariableId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  
  // 🌲 États pour le sélecteur d'arborescence
  const [treeSelectorOpen, setTreeSelectorOpen] = useState(false);
  const [selectedSourceRef, setSelectedSourceRef] = useState<string>('');
  const [selectedCapacityName, setSelectedCapacityName] = useState<string | null>(null); // 🎯 Nom de la capacité sélectionnée
  const [conditions, setConditions] = useState<{ items: Array<{ id: string; name: string }> }>({ items: [] });
  const [formulas, setFormulas] = useState<{ items: Array<{ id: string; name: string }> }>({ items: [] });
  const [tables, setTables] = useState<{ items: Array<{ id: string; name: string }> }>({ items: [] });
  
  // 🎯 NOUVEAU : Référence pour tracker les changements utilisateur avec protection renforcée
  const lastUserChangeRef = useRef<number>(0);
  const userSelectedRefRef = useRef<string | null>(null); // Track what user actually selected
  
  // 🔗 Source depuis l'arborescence uniquement
  const [sourceType, setSourceType] = useState<'fixed' | 'tree'>('tree');
  const [fixedValue, setFixedValue] = useState<string>('');
  
  // 🎯 NOUVEAU : État pour le dernier résultat de test
  const [lastTestResult, setLastTestResult] = useState<{
    status: 'ok' | 'ko' | 'neutral' | 'error';
    conditionName: string;
    timestamp: number;
    details?: string;
    apiValue?: unknown;
  } | null>(null);

  // 📊 NOUVEAU : État pour le champ Total (somme des copies)
  const [createSumDisplayField, setCreateSumDisplayField] = useState<boolean>(false);
  const [sumFieldLoading, setSumFieldLoading] = useState<boolean>(false);

  // 🧪 Bac à sable de test
  type TestRow = { key: string; type: 'text' | 'number' | 'boolean'; value: string | number | boolean };
  const [sandboxOpen, setSandboxOpen] = useState<boolean>(false);
  const [testRows, setTestRows] = useState<TestRow[]>([{ key: '', type: 'text', value: '' }]);
  const [alorsValue, setAlorsValue] = useState<string>('');
  const [sinonValue, setSinonValue] = useState<string>('');
  const [executing, setExecuting] = useState<boolean>(false);
  const [testKeySelectorOpen, setTestKeySelectorOpen] = useState<boolean>(false);
  const testKeyRowIndexRef = useRef<number | null>(null);

  // 📜 Détails dynamiques de la condition sélectionnée (expression + sorties)
  type ConditionAction = { type?: string; value?: unknown; formula?: string; formulaId?: string } & Record<string, unknown>;
  type ConditionSet = {
    mode?: string;
    branches?: Array<{
      // when peut suivre l'ancien schéma ({ left.key }) ou le nouveau AST (ValueRef { ref|value })
      when?: { 
        op?: string; 
        left?: { key?: string; ref?: string; value?: unknown };
        right?: unknown | { ref?: string; value?: unknown } 
      };
      actions?: ConditionAction[];
    }>;
    fallback?: { actions?: ConditionAction[] };
  };
  const [conditionDetails, setConditionDetails] = useState<{
    expression?: string;
    whenKey?: string;
    thenLabel?: string;
    elseLabel?: string;
    thenIsFormula?: boolean;
    elseIsFormula?: boolean;
    thenFormulaId?: string;
    elseFormulaId?: string;
  } | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        setLoading(true);
        // lire instances depuis metadata
        const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown> };
        const list: DataInstance[] = ((node?.metadata as { capabilities?: { datas?: DataInstance[] } } | undefined)?.capabilities?.datas) || [];
        
        // 📊 Charger l'état createSumDisplayField depuis la metadata du nœud
        const sumFieldEnabled = (node?.metadata as { createSumDisplayField?: boolean } | undefined)?.createSumDisplayField || false;
        setCreateSumDisplayField(sumFieldEnabled);
        
        // 🏷️ TOUJOURS récupérer la variable pour avoir le displayName correct
        const variableData = await api.get(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}/data`) as { 
          id?: string; 
          usedVariableId?: string;
          displayName?: string;
          sourceRef?: string;
          sourceType?: string;
          fixedValue?: string;
        } | undefined;
        
        if (variableData && typeof variableData.usedVariableId === 'string') {
          setVariableId(variableData.usedVariableId);
        }
        
        // 🏷️ Utiliser le displayName de la variable comme nom officiel
        const variableDisplayName = variableData?.displayName || '';
        
        if (list.length > 0) {
          const first = list[0];
          // 🏷️ IMPORTANT: Utiliser le displayName de la variable, pas celui de la metadata
          const resolvedName = variableDisplayName || first.name || 'Donnée 1';
          setInstances(list.map((it, idx) => idx === 0 ? { ...it, name: resolvedName } : it));
          setActiveId(first.id);
          setName(resolvedName);
          // 🎯 Initialiser les nouveaux états depuis la VARIABLE (source de vérité)
          setSourceType(variableData?.sourceType || first.config.sourceType || 'tree');
          setFixedValue(variableData?.fixedValue || first.config.fixedValue || '');
          setSelectedSourceRef(variableData?.sourceRef || first.config.sourceRef || '');
          setSelectedCapacityName(first.config.sourceRefName || null);
          // Laisser l'effet de synchronisation (activeId) remplir le formulaire après montage
          onChange?.(first.config as Record<string, unknown>);
        } else {
          const data = variableData;
          if (!mountedRef.current) return;
          const initial = {
            exposedKey: data?.exposedKey || `var_${nodeId.slice(0, 4)}`,
            sourceType: data?.sourceType || 'tree', // Toujours arborescence
            fixedValue: data?.fixedValue || '', // Conservé pour compatibilité
            sourceRef: data?.sourceRef || '', // Référence d'arborescence vide par défaut
            displayFormat: data?.displayFormat || 'number',
            unit: data?.unit || '',
            precision: data?.precision ?? 2,
            visibleToUser: Boolean(data?.visibleToUser)
          };
          // 🎯 Initialiser les nouveaux états
          setSourceType(initial.sourceType);
          setFixedValue(initial.fixedValue);
          setSelectedSourceRef(initial.sourceRef);
          // 🏷️ Utiliser le displayName de la variable ou un nom par défaut
          const resolvedName = variableDisplayName || 'Donnée 1';
          const first: DataInstance = { id: `data_${Date.now()}`, name: resolvedName, config: initial };
          setInstances([first]);
          setActiveId(first.id);
          setName(resolvedName);
          // 🛡️ PROTECTION FANTÔMES: Ne persister en metadata que si c'est une variable propre au nœud
          // (pas proxiée d'un autre nœud, et sourceRef non vide)
          const isProxied = !!(data as Record<string, unknown>)?.proxiedFromNodeId;
          const hasRealData = !isProxied && !!(data?.sourceRef || data?.fixedValue || data?.usedVariableId);
          if (hasRealData) {
            try {
              const md = (node?.metadata || {}) as Record<string, unknown>;
              const nextMd = { ...md, capabilities: { ...(md as { capabilities?: Record<string, unknown> }).capabilities, datas: [first] } };
              await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd });
            } catch { /* noop */ }
          } else {
            logger.debug('🛡️ [DataPanel] Variable proxiée ou vide, skip persistence metadata pour', nodeId);
          }
          onChange?.(initial);
        }
      } catch {
        // silencieux
      } finally {
        setLoading(false);
      }
    })();
    return () => { mountedRef.current = false; };
  }, [api, treeId, nodeId, onChange, value, form]);

  // 📦 Charger les capacités (formules, conditions, tables) au montage pour l'affichage
  useEffect(() => {
    (async () => {
      try {
        const [conditionsResponse, formulasResponse, tablesResponse] = await Promise.all([
          api.get('/api/treebranchleaf/reusables/conditions'),
          api.get('/api/treebranchleaf/reusables/formulas'),
          api.get('/api/treebranchleaf/reusables/tables')
        ]);
        logger.debug('📦 [DataPanel] Capacités chargées - tables:', tablesResponse);
        setConditions(conditionsResponse || { items: [] });
        setFormulas(formulasResponse || { items: [] });
        setTables(tablesResponse || { items: [] });
      } catch (error) {
        logger.warn('Erreur lors du chargement des capacités:', error);
      }
    })();
  }, [api]);

  // 🎯 NOUVEAU: Effect pour synchroniser les états locaux quand activeId change
  useEffect(() => {
    if (activeId && instances.length > 0) {
      const activeInstance = instances.find(it => it.id === activeId);
      if (activeInstance?.config) {
        logger.debug('🔄 [DataPanel] Synchronisation états pour activeId:', activeId, 'config:', activeInstance.config);
        
        // 🛡️ PROTECTION: Ne pas écraser si l'utilisateur vient de faire un changement
        const now = Date.now();
        const timeSinceLastUserChange = now - (lastUserChangeRef.current || 0);
        
        if (timeSinceLastUserChange > 3000) { // Seulement si pas de changement récent
          // Mettre à jour les états locaux
          setSourceType(activeInstance.config.sourceType || 'fixed');
          setFixedValue(activeInstance.config.fixedValue || '');
          // ❌ NE PAS synchroniser sourceRef depuis les métadonnées - il ne change que via le sélecteur
          // setSelectedSourceRef(activeInstance.config.sourceRef || '');
          
          // Mettre à jour le formulaire
          form.setFieldsValue(activeInstance.config as Record<string, unknown>);
          
          logger.debug('✅ [DataPanel] États synchronisés - sourceType:', activeInstance.config.sourceType, 'fixedValue:', activeInstance.config.fixedValue, 'sourceRef:', selectedSourceRef, '(PRÉSERVÉ)');
        } else {
          logger.debug('🛡️ [DataPanel] Synchronisation ignorée - changement utilisateur récent');
        }
      }
    }
  }, [activeId, instances, form, selectedSourceRef]);

  const save = useCallback(async (vals: Record<string, unknown>) => {
    try {
      const updated = await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}/data`, vals) as { id?: string; usedVariableId?: string } | undefined;
      if (updated && typeof updated.usedVariableId === 'string') {
        setVariableId(updated.usedVariableId);
      }
      
      // 🚀 AUTO-ACTIVATION: Activer la capacité "Données" quand on configure quelque chose
  const hasConfiguration = (vals.sourceType === 'fixed' && vals.fixedValue) || 
           (vals.sourceType === 'tree' && (vals as Record<string, unknown>)?.sourceRef);
      
      if (hasConfiguration) {
        try {
          await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { hasData: true });
          logger.debug('🚀 [DataPanel] Capacité "Données" auto-activée');
        } catch (err) {
          logger.warn('⚠️ [DataPanel] Erreur auto-activation capacité:', err);
        }
      }
      
      // mettre à jour metadata instance active
      if (activeId) {
        try {
          const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown> };
          const md = (node?.metadata || {}) as Record<string, unknown>;
          const list: DataInstance[] = ((md as { capabilities?: { datas?: DataInstance[] } }).capabilities?.datas) || instances;
          const updated = (list || []).map(it => it.id === activeId ? { ...it, config: vals as DataInstance['config'], name } : it);
          const nextMd = { ...md, capabilities: { ...(md as { capabilities?: Record<string, unknown> }).capabilities, datas: updated } };
          await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd });
          setInstances(updated);
          
          // 🎯 CORRECTION CRITIQUE: Récupérer les données fraîches depuis l'API et mettre à jour le formulaire
          try {
            const freshData = await api.get(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}/data`);
            logger.debug('🔄 [DataPanel] Données fraîches depuis l\'API:', freshData);
            logger.debug('🔄 [DataPanel] États avant mise à jour - sourceType:', sourceType, 'fixedValue:', fixedValue, 'selectedSourceRef:', selectedSourceRef);
            // Mettre à jour l'ID de variable si disponible
            if (freshData && typeof (freshData as { usedVariableId?: string }).usedVariableId === 'string') {
              setVariableId((freshData as { usedVariableId?: string }).usedVariableId!);
            }
            
            if (freshData) {
              // 🎯 PROTECTION: Ne pas écraser l'état si l'utilisateur vient de faire un changement
              // Si les données fraîches correspondent déjà aux états actuels, pas de mise à jour
              const freshSourceType = freshData.sourceType || 'fixed';
              const freshFixedValue = freshData.fixedValue || '';
              const freshSourceRef = freshData.sourceRef || '';
              
              logger.debug('🔄 [DataPanel] Données fraîches depuis l\'API - sourceType:', freshSourceType, 'fixedValue:', freshFixedValue, 'sourceRef:', freshSourceRef);
              logger.debug('🔄 [DataPanel] États actuels - sourceType:', sourceType, 'fixedValue:', fixedValue, 'selectedSourceRef:', selectedSourceRef);
              
          // 🛡️ PROTECTION CRITIQUE: Ne pas écraser les états utilisateur récemment modifiés
              // Ignorer la mise à jour si on vient de faire une modification (dans les 5 dernières secondes)
              const now = Date.now();
              const lastUserChange = lastUserChangeRef.current || 0;
              const timeSinceLastChange = now - lastUserChange;
              
              // Protection renforcée : vérifier aussi si l'utilisateur a fait une sélection qui est différente
              const userHasSelectedDifferent = userSelectedRefRef.current && 
                                             userSelectedRefRef.current !== freshSourceRef;
              
              if (timeSinceLastChange < 5000 || userHasSelectedDifferent) {
                logger.debug('🛡️ [DataPanel] Récente modification utilisateur détectée - ignore mise à jour API', {
                  timeSinceLastChange,
                  userHasSelectedDifferent,
                  userSelected: userSelectedRefRef.current,
                  freshSourceRef
                });
                return;
              }
              
              // 🎯 CORRECTION CRITIQUE: Ne JAMAIS écraser le sourceRef depuis l'API
              // Le sourceRef ne doit changer QUE si l'utilisateur clique sur "Sélectionner dans l'arborescence"
              // Seulement mettre à jour sourceType et fixedValue
              if (freshSourceType !== sourceType || freshFixedValue !== fixedValue) {
                logger.debug('🔄 [DataPanel] Mise à jour nécessaire - application des données fraîches (SAUF sourceRef)');
                setSourceType(freshSourceType);
                setFixedValue(freshFixedValue);
                // ❌ NE PAS FAIRE: setSelectedSourceRef(freshSourceRef); 
                
                // Mettre à jour le formulaire SANS toucher au sourceRef
                const { sourceRef: _ignored, ...freshDataWithoutSourceRef } = freshData as Record<string, unknown>;
                form.setFieldsValue(freshDataWithoutSourceRef);
                
                logger.debug('✅ [DataPanel] États après mise à jour - sourceType:', freshSourceType, 'fixedValue:', freshFixedValue, 'selectedSourceRef:', selectedSourceRef, '(PRÉSERVÉ)');
              } else {
                logger.debug('🚫 [DataPanel] Pas de mise à jour nécessaire - données identiques');
              }
            }
          } catch (error) {
            logger.error('🔥 [DataPanel] Erreur récupération données fraîches:', error);
          }
        } catch { /* noop */ }
      }
      onChange?.(vals);
    } catch {
      messageApi.error('Erreur de sauvegarde de la donnée');
    }
  }, [api, treeId, nodeId, onChange, activeId, instances, name, form, sourceType, fixedValue, selectedSourceRef, messageApi]);

  const debouncedSave = useDebouncedCallback(save, 400);

  const onValuesChange = useCallback((_: unknown, all: Record<string, unknown>) => {
    debouncedSave(all);
  }, [debouncedSave]);

  // 🌲 Gestionnaire de sélection dans l'arborescence
  const handleTreeSelection = useCallback((selection: NodeTreeSelectorValue) => {
    logger.debug('🌲 [DataPanel] Sélection arborescence:', selection);
    
    // 🎯 NOUVEAU : Marquer le changement utilisateur ET sauvegarder sa sélection
    lastUserChangeRef.current = Date.now();
    userSelectedRefRef.current = selection.ref || null;
    
    // 🎯 CORRECTION: Passer automatiquement en mode "tree" quand on sélectionne une référence
    setSourceType('tree');
    
    // 🎯 Stocker le nom de la capacité sélectionnée
    if (selection.name) {
      setSelectedCapacityName(selection.name);
    }
    
    // Mettre à jour le champ sourceRef ET sourceType dans le formulaire
    form.setFieldsValue({ 
      sourceRef: selection.ref,
      sourceType: 'tree',
      sourceRefName: selection.name // 🎯 Persister le nom pour les rechargements
    });
    setSelectedSourceRef(selection.ref);
    
    // Sauvegarder automatiquement avec le nom de la capacité
    const currentValues = form.getFieldsValue();
    const updatedValues = { 
      ...currentValues, 
      sourceRef: selection.ref,
      sourceType: 'tree',
      sourceRefName: selection.name // 🎯 Inclure le nom dans la sauvegarde
    };
    debouncedSave(updatedValues);
    
    // Fermer le sélecteur
    setTreeSelectorOpen(false);
  }, [form, debouncedSave]);

  // Sélection clé (pour le bac à sable)
  const openTestKeySelector = useCallback((rowIndex: number) => {
    testKeyRowIndexRef.current = rowIndex;
    setTestKeySelectorOpen(true);
  }, []);

  const handleTestKeySelection = useCallback((selection: NodeTreeSelectorValue) => {
    const idx = testKeyRowIndexRef.current;
    if (idx == null) return;
    setTestRows(prev => prev.map((r, i) => i === idx ? { ...r, key: selection.ref || '' } : r));
    setTestKeySelectorOpen(false);
  }, []);

  // 🌲 Gestionnaire d'ouverture du sélecteur
  const openTreeSelector = useCallback(async () => {
    // 🎯 NOUVEAU : Marquer le changement utilisateur
    lastUserChangeRef.current = Date.now();
    
    // Charger les conditions, formules et tables pour l'affichage des noms
    try {
      const [conditionsResponse, formulasResponse, tablesResponse] = await Promise.all([
        api.get('/api/treebranchleaf/reusables/conditions'),
        api.get('/api/treebranchleaf/reusables/formulas'),
        api.get('/api/treebranchleaf/reusables/tables')
      ]);
      logger.debug('🔍 [DataPanel] Conditions chargées:', conditionsResponse);
      logger.debug('🔍 [DataPanel] Formules chargées:', formulasResponse);
      logger.debug('🔍 [DataPanel] Tables chargées:', tablesResponse);
      setConditions(conditionsResponse || { items: [] });
      setFormulas(formulasResponse || { items: [] });
      setTables(tablesResponse || { items: [] });
    } catch (error) {
      logger.warn('Erreur lors du chargement des conditions/formules/tables:', error);
    }
    setTreeSelectorOpen(true);
  }, [api, setConditions, setFormulas, setTables]);

  // 🧠 Utilitaire: transformer une clause "when" en texte lisible
  const stringifyWhen = useCallback((when?: { op?: string; left?: { key?: string; ref?: string; value?: unknown }; right?: unknown | { ref?: string; value?: unknown } }) => {
    if (!when) return { text: '', key: undefined as string | undefined };
    const op = String(when.op || '').trim();
    // clé: préférer left.ref (nouveau), sinon left.key (ancien)
    const leftRef = (when.left?.ref as string | undefined) || (when.left?.key as string | undefined);
    // droite: si objet ValueRef avec value, l'utiliser; sinon afficher brute
    const rawRight = when.right as unknown;
    const rightVal = (rawRight && typeof rawRight === 'object' && (rawRight as { value?: unknown }).value !== undefined)
      ? (rawRight as { value?: unknown }).value
      : rawRight;
    const opLabel =
      op === 'equals' || op === '==' ? '=' :
      op === '!=' ? '≠' :
      op === 'greaterThan' || op === '>' ? '>' :
      op === 'lessThan' || op === '<' ? '<' :
      op === '>=' ? '≥' :
      op === '<=' ? '≤' :
      op === 'contains' ? 'contient' :
      op === 'startsWith' ? 'commence par' :
      op === 'endsWith' ? 'se termine par' :
      op === 'isEmpty' ? 'est vide' :
      op === 'isNotEmpty' ? "n'est pas vide" : op || '?';
    let rhs = '';
    if (rightVal !== undefined && rightVal !== null && opLabel && !['est vide', "n'est pas vide"].includes(opLabel)) rhs = ` ${String(rightVal)}`;
    const keyLabel = leftRef || '';
    const txt = keyLabel ? `${keyLabel} ${opLabel}${rhs}` : opLabel;
    return { text: txt, key: leftRef };
  }, []);

  // 🔎 Charger dynamiquement la définition de la condition sélectionnée (expression + sorties)
  useEffect(() => {
    const ref = selectedSourceRef;
    if (!(sourceType === 'tree' && typeof ref === 'string' && ref.startsWith('condition:'))) {
      setConditionDetails(null);
      return;
    }
    const conditionId = ref.replace('condition:', '');
    let cancelled = false;
    (async () => {
      try {
        const cond = await api.get(`/api/treebranchleaf/reusables/conditions/${conditionId}`);
        const set: ConditionSet = (cond?.conditionSet || {}) as ConditionSet;
        const first = Array.isArray(set?.branches) && set.branches.length > 0 ? set.branches[0] : undefined;
        const whenInfo = stringifyWhen(first?.when);

        // Actions "Alors" et "Sinon"
        const thenAction = (first?.actions && first.actions[0]) as ConditionAction | undefined;
        const elseAction = (set?.fallback?.actions && set.fallback.actions[0]) as ConditionAction | undefined;

        // Résoudre labels (valeur directe ou référence formule)
        const resolveLabel = async (action?: ConditionAction): Promise<{ label: string; isFormula: boolean; formulaId?: string }> => {
          if (!action) return { label: '—', isFormula: false };
          // Nouveau modèle: EVAL_FORMULA + formulaId; Ancien: type:'formula' + formula
          const rawFormulaId = (action.type === 'EVAL_FORMULA' && action.formulaId)
            ? action.formulaId
            : (action.type === 'formula' && action.formula ? String(action.formula) : undefined);
          if (rawFormulaId) {
            const fid = String(rawFormulaId).replace('formula:', '');
            try {
              const f = await api.get(`/api/treebranchleaf/reusables/formulas/${fid}`);
              const name = f?.name || fid.slice(0, 8) + '…';
              return { label: `🧮 Formule: ${name}`, isFormula: true, formulaId: fid };
            } catch {
              return { label: `🧮 Formule: ${fid.slice(0, 8)}…`, isFormula: true, formulaId: fid };
            }
          }
          if (action.value !== undefined) {
            return { label: String(action.value), isFormula: false };
          }
          return { label: '—', isFormula: false };
        };

        const [thenMeta, elseMeta] = await Promise.all([
          resolveLabel(thenAction),
          resolveLabel(elseAction)
        ]);

        if (!cancelled) {
          setConditionDetails({
            expression: whenInfo.text,
            whenKey: whenInfo.key,
            thenLabel: thenMeta.label,
            elseLabel: elseMeta.label,
            thenIsFormula: thenMeta.isFormula,
            elseIsFormula: elseMeta.isFormula,
            thenFormulaId: thenMeta.formulaId,
            elseFormulaId: elseMeta.formulaId
          });

          // Pré-remplir le bac à sable: clé de test principale + sorties affichées
          if (whenInfo.key) {
            setTestRows(prev => {
              if (!prev || prev.length === 0 || !prev[0].key) {
                return [{ key: whenInfo.key!, type: 'text', value: '' }];
              }
              return prev;
            });
          }
          setAlorsValue(thenMeta.label);
          setSinonValue(elseMeta.label);
        }
      } catch (e) {
        logger.warn('⚠️ Impossible de charger la condition:', (e as Error)?.message);
        if (!cancelled) setConditionDetails(null);
      }
    })();
    return () => { cancelled = true; };
  }, [api, selectedSourceRef, sourceType, stringifyWhen]);

  const helper = useMemo(() => (
    <Text type="secondary" style={{ fontSize: 11 }}>
      🎯 Choisissez une <strong>valeur fixe</strong> (ex: "95%") ou sélectionnez depuis l'<strong>arborescence</strong> (champs, formules, conditions).
      Le formatage (unité, précision) sera appliqué automatiquement pour l'affichage final.
    </Text>
  ), []);

  // Formatage cohérent avec configuration
  const formatValueForDisplay = useCallback((val: unknown) => {
    if (val === null || val === undefined) return '—';
    const displayFormat = form.getFieldValue('displayFormat') as string | undefined;
    const unit = form.getFieldValue('unit') as string | undefined;
    const precision = (form.getFieldValue('precision') as number | undefined) ?? 2;
    let out = '';
    if (displayFormat === 'number' || displayFormat === 'currency' || typeof val === 'number') {
      const num = typeof val === 'number' ? val : Number(val);
      if (!Number.isNaN(num)) {
        out = num.toLocaleString('fr-FR', { minimumFractionDigits: precision, maximumFractionDigits: precision });
      } else {
        out = String(val);
      }
    } else if (displayFormat === 'percentage') {
      const num = typeof val === 'number' ? val : Number(val);
      out = Number.isNaN(num) ? String(val) : `${num.toFixed(precision)} %`;
    } else if (displayFormat === 'boolean') {
      out = String(Boolean(val));
    } else {
      out = String(val);
    }
    if (unit && displayFormat !== 'percentage') {
      out = `${out} ${unit}`.trim();
    }
    return out;
  }, [form]);

  // Libellé lisible pour la référence sélectionnée
  const selectedRefLabel = useMemo(() => {
    const ref = selectedSourceRef || '';
    if (!ref) return '';
    if (ref.startsWith('condition:') || ref.startsWith('node-condition:')) {
      const id = ref.replace('condition:', '').replace('node-condition:', '');
      const c = conditions.items?.find((x) => x.id === id);
      return c ? `🧩 Condition: ${c.name}` : `🧩 Condition: ${id.slice(0, 8)}…`;
    }
    if (ref.startsWith('formula:') || ref.startsWith('node-formula:')) {
      const id = ref.replace('formula:', '').replace('node-formula:', '');
      const f = formulas.items?.find((x) => x.id === id);
      return f ? `🧮 Formule: ${f.name}` : `🧮 Formule: ${id.slice(0, 8)}…`;
    }
    if (ref.startsWith('@table.') || ref.startsWith('table:')) {
      const id = ref.replace('@table.', '').replace('table:', '');
      const t = tables.items?.find((x) => x.id === id);
      return t ? `📊 Table: ${t.name}` : `📊 Table: ${id.slice(0, 8)}…`;
    }
    if (ref.startsWith('@value.')) {
      return `📊 Champ: ${ref.replace('@value.', '')}`;
    }
    return ref;
  }, [selectedSourceRef, conditions.items, formulas.items, tables.items]);

  // Affichage demandé: montrer l'ID de la CAPACITÉ dans le champ de sélection
  const selectedRefDisplay = useMemo(() => {
    const ref = selectedSourceRef || '';
    // Extraire l'ID de la capacité du sourceRef
    if (ref.startsWith('node-formula:') || ref.startsWith('formula:')) {
      return ref.replace('node-formula:', '').replace('formula:', '');
    }
    if (ref.startsWith('node-condition:') || ref.startsWith('condition:')) {
      return ref.replace('node-condition:', '').replace('condition:', '');
    }
    if (ref.startsWith('@table.') || ref.startsWith('table:')) {
      return ref.replace('@table.', '').replace('table:', '');
    }
    if (ref.startsWith('@value.')) {
      return ref.replace('@value.', '');
    }
    // Fallback: afficher variableId ou le label
    return (variableId && typeof variableId === 'string' && variableId.length > 0)
      ? variableId
      : selectedRefLabel;
  }, [selectedSourceRef, variableId, selectedRefLabel]);

  // (supprimé) getSelectedName n'était pas utilisé

  const deleteData = useCallback(() => {
    const confirmed = window.confirm('Supprimer la donnée exposée ?\nCette action vide la configuration et désactive la capacité.');
    if (!confirmed) return;
    (async () => {
      try {
        // ✅ Utiliser DELETE au lieu de PUT avec valeurs vides
        await api.delete(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}/data`);
        
        // 🎯 Nettoyer l'instance du tableau local
        const updatedInstances = instances.filter(it => it.id !== activeId);
        setInstances(updatedInstances);
        
        // 🎯 Réinitialiser TOUS les états locaux
        setSourceType('fixed');
        setFixedValue('');
        setSelectedSourceRef('');
        setVariableId(null);
        setName('');
        setConditionDetails(null);
        setLastTestResult(null);
        userSelectedRefRef.current = null;
        
        // 🎯 Mettre à jour metadata pour supprimer l'instance
        try {
          const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown>; hasData?: boolean };
          const md = (node?.metadata || {}) as Record<string, unknown>;
          const nextMd = { ...md, capabilities: { ...(md as { capabilities?: Record<string, unknown> }).capabilities, datas: updatedInstances } };
          await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd, hasData: false });
          
          // 🔔 Émettre l'événement pour rafraîchir l'arbre
          window.dispatchEvent(new CustomEvent('tbl-node-updated', { 
            detail: { 
              node: { ...node, hasData: false, metadata: nextMd }, 
              treeId,
              nodeId 
            } 
          }));
        } catch (e) {
          logger.warn('⚠️ Impossible de nettoyer la metadata:', (e as Error).message);
        }
        
        // 🎯 Passer à une autre instance ou vider si aucune
        if (updatedInstances.length > 0) {
          const next = updatedInstances[0];
          setActiveId(next.id);
          setName(next.name || '');
          setSourceType(next.config.sourceType || 'fixed');
          setFixedValue(next.config.fixedValue || '');
          setSelectedSourceRef(next.config.sourceRef || '');
          form.setFieldsValue(next.config as Record<string, unknown>);
          onChange?.(next.config as Record<string, unknown>);
        } else {
          setActiveId(null);
          const emptyVals = { exposedKey: undefined, displayFormat: 'number', unit: '', precision: 2, visibleToUser: false, sourceType: 'fixed', sourceRef: '', fixedValue: '' } as Record<string, unknown>;
          form.setFieldsValue(emptyVals);
          onChange?.(emptyVals);
        }
        
        messageApi.success('Donnée supprimée');
      } catch (err) {
        logger.error('Erreur lors de la suppression de la variable:', err);
        messageApi.error('Impossible de supprimer la donnée');
      }
    })();
  }, [api, form, nodeId, onChange, treeId, messageApi, instances, activeId]);

  return (
    <Card size="small" variant="outlined" loading={loading}>
      {contextHolder}
      <Title level={5}>📊 Donnée</Title>
      {/* Multi‑instances */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <Text type="secondary">Instance:</Text>
        <Select
          size="small"
          style={{ minWidth: 220 }}
          value={activeId || undefined}
          options={instances.map(it => ({ value: it.id, label: it.name || 'Sans nom' }))}
          onChange={(id) => {
            setActiveId(id);
            const it = instances.find(x => x.id === id);
            if (it) {
              // 🎯 Initialiser les nouveaux états lors du changement d'instance
              setSourceType(it.config.sourceType || 'fixed');
              setFixedValue(it.config.fixedValue || '');
              setName(it.name || '');
            }
          }}
          placeholder="Sélectionner une instance"
        />
        <Button size="small" onClick={async () => {
          const id = `data_${Date.now()}_${Math.floor(Math.random()*1000)}`;
          const it: DataInstance = { 
            id, 
            name: `Donnée ${(instances.length || 0) + 1}`, 
            config: { 
              exposedKey: `var_${nodeId.slice(0,4)}`, 
              sourceType: 'fixed', // Par défaut : valeur fixe
              fixedValue: '', // Valeur vide par défaut
              sourceRef: '', 
              displayFormat: 'number', 
              unit: '', 
              precision: 2, 
              visibleToUser: false 
            } 
          };
          const next = [...instances, it];
          setInstances(next);
          setActiveId(id);
          
          // 🎯 CORRECTION: Initialiser les états locaux pour la nouvelle instance
          setSourceType(it.config.sourceType || 'fixed');
          setFixedValue(it.config.fixedValue || '');
          setSelectedSourceRef(it.config.sourceRef || '');
          
          form.setFieldsValue(it.config as Record<string, unknown>);
          setName(it.name);
          try {
            const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown> };
            const md = (node?.metadata || {}) as Record<string, unknown>;
            const prev: DataInstance[] = ((md as { capabilities?: { datas?: DataInstance[] } }).capabilities?.datas) || [];
            const nextMd = { ...md, capabilities: { ...(md as { capabilities?: Record<string, unknown> }).capabilities, datas: [...prev, it] } };
            await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd });
          } catch { /* noop */ }
        }}>Ajouter</Button>
        <Button size="small" danger onClick={deleteData} disabled={!activeId}>Supprimer</Button>
      </div>

      {/* Nom */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <Text type="secondary">Nom:</Text>
        <Input
          size="small"
          style={{ maxWidth: 280 }}
          placeholder="Nom de la donnée"
          value={name}
          onChange={(e) => {
            const n = e.target.value;
            setName(n);
            (async () => {
              if (!activeId) return;
              try {
                // 🏷️ 1. Sauvegarder dans la metadata du nœud (instances locales)
                const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown> };
                const md = (node?.metadata || {}) as Record<string, unknown>;
                const list: DataInstance[] = ((md as { capabilities?: { datas?: DataInstance[] } }).capabilities?.datas) || instances;
                const updated = (list || []).map(it => it.id === activeId ? { ...it, name: n } : it);
                const nextMd = { ...md, capabilities: { ...(md as { capabilities?: Record<string, unknown> }).capabilities, datas: updated } };
                await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd });
                setInstances(updated);
                
                // 🏷️ 2. NOUVEAU: Sauvegarder aussi dans la table variable (displayName)
                const currentValues = form.getFieldsValue();
                await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}/data`, {
                  ...currentValues,
                  displayName: n // 🏷️ Envoyer le nom pour mise à jour dans la variable
                });
                logger.debug('✅ [DataPanel] Nom sauvegardé dans la variable:', n);
              } catch (err) {
                logger.warn('⚠️ [DataPanel] Erreur sauvegarde nom:', err);
              }
            })();
          }}
        />
      </div>

      {/* 📦 Capacité liée - Affiche le type et nom de la capacité */}
      {useMemo(() => {
        // 🎯 CORRECTION: Utiliser selectedSourceRef (état local) au lieu du formulaire pour persistance
        const currentSourceRef = selectedSourceRef || form.getFieldValue('sourceRef');
        const currentSourceType = sourceType || form.getFieldValue('sourceType');
        const currentFixedValue = fixedValue || form.getFieldValue('fixedValue');
        
        // Déterminer le type et le nom de la capacité
        let capacityType: 'formula' | 'condition' | 'table' | 'value' | 'fixed' | null = null;
        let capacityName: string | null = null;
        let capacityId: string | null = null;
        let capacityIcon = '📦';
        let capacityColor = '#1890ff';
        
        if (currentSourceType === 'fixed' && currentFixedValue) {
          capacityType = 'fixed';
          capacityName = `Valeur: ${currentFixedValue}`;
          capacityIcon = '📌';
          capacityColor = '#722ed1';
        } else if (currentSourceRef) {
          // node-formula:UUID ou formula:UUID
          if (currentSourceRef.startsWith('node-formula:') || currentSourceRef.startsWith('formula:')) {
            capacityType = 'formula';
            const formulaId = currentSourceRef.replace('node-formula:', '').replace('formula:', '');
            capacityId = formulaId;
            // 🎯 Utiliser selectedCapacityName en priorité, sinon chercher dans la liste
            const formula = Array.isArray(formulas.items)
              ? formulas.items.find((f: { id: string; name: string }) => f.id === formulaId)
              : null;
            capacityName = selectedCapacityName || formula?.name || `Formule (${formulaId.substring(0, 8)}...)`;
            capacityIcon = '🧮';
            capacityColor = '#52c41a';
          }
          // node-condition:UUID ou condition:UUID
          else if (currentSourceRef.startsWith('node-condition:') || currentSourceRef.startsWith('condition:')) {
            capacityType = 'condition';
            const conditionId = currentSourceRef.replace('node-condition:', '').replace('condition:', '');
            capacityId = conditionId;
            // 🎯 Utiliser selectedCapacityName en priorité, sinon chercher dans la liste
            const condition = Array.isArray(conditions.items)
              ? conditions.items.find((c: { id: string; name: string }) => c.id === conditionId)
              : null;
            capacityName = selectedCapacityName || condition?.name || `Condition (${conditionId.substring(0, 8)}...)`;
            capacityIcon = '🔀';
            capacityColor = '#fa8c16';
          }
          // @table.UUID ou table:UUID
          else if (currentSourceRef.startsWith('@table.') || currentSourceRef.startsWith('table:')) {
            capacityType = 'table';
            const tableId = currentSourceRef.replace('@table.', '').replace('table:', '');
            capacityId = tableId;
            // 🎯 Utiliser selectedCapacityName en priorité, sinon chercher dans la liste
            const table = Array.isArray(tables.items)
              ? tables.items.find((t: { id: string; name: string }) => t.id === tableId)
              : null;
            capacityName = selectedCapacityName || table?.name || `Table (${tableId.substring(0, 8)}...)`;
            capacityIcon = '📊';
            capacityColor = '#13c2c2';
          }
          // @value.nodeId - référence à un champ
          else if (currentSourceRef.startsWith('@value.')) {
            capacityType = 'value';
            capacityId = currentSourceRef.replace('@value.', '');
            capacityName = selectedCapacityName || `Champ référencé`;
            capacityIcon = '🔗';
            capacityColor = '#1890ff';
          }
          // 🎯 NOUVEAU: Si aucun préfixe reconnu mais sourceRef existe (UUID brut = table)
          else if (currentSourceRef && currentSourceRef.length > 10) {
            capacityType = 'table';
            capacityId = currentSourceRef;
            const table = Array.isArray(tables.items)
              ? tables.items.find((t: { id: string; name: string }) => t.id === currentSourceRef)
              : null;
            capacityName = selectedCapacityName || table?.name || `Table (${currentSourceRef.substring(0, 8)}...)`;
            capacityIcon = '📊';
            capacityColor = '#13c2c2';
          }
        }
        
        if (!capacityType) return null;
        
        const typeLabels: Record<string, string> = {
          formula: 'FORMULE',
          condition: 'CONDITION',
          table: 'TABLE',
          value: 'VALEUR',
          fixed: 'FIXE'
        };
        
        return (
          <div style={{ 
            marginBottom: 12, 
            padding: '10px 12px', 
            background: `linear-gradient(135deg, ${capacityColor}08 0%, ${capacityColor}15 100%)`,
            border: `1px solid ${capacityColor}40`,
            borderRadius: 8,
            borderLeft: `4px solid ${capacityColor}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{capacityIcon}</span>
              <Tag color={capacityColor} style={{ margin: 0, fontWeight: 600, fontSize: 11 }}>
                {typeLabels[capacityType]}
              </Tag>
              <Text strong style={{ color: capacityColor, flex: 1 }}>
                {capacityName}
              </Text>
            </div>
            {capacityId && (
              <div style={{ marginTop: 6 }}>
                <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
                  ID: {capacityId}
                </Text>
              </div>
            )}
            {currentSourceRef && (
              <div style={{ marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace', color: '#722ed1' }}>
                  Source: {currentSourceRef}
                </Text>
              </div>
            )}
          </div>
        );
      }, [form, tables, formulas, conditions, sourceType, fixedValue, selectedSourceRef, selectedCapacityName])}
      
      {/* Bouton de test pour les conditions */}
      {(() => {
        const sourceType = form.getFieldValue('sourceType');
        const selectedSourceRef = form.getFieldValue('sourceRef');
        
        if (sourceType === 'tree' && selectedSourceRef?.startsWith('condition:')) {
          const conditionId = selectedSourceRef.replace('condition:', '');
          
          const handleTestCondition = async () => {
            try {
              // 🔧 CORRECTION : Utiliser les routes TBL réactivées avec CapacityCalculator
              const response = await api.post(`/api/tbl/evaluate/condition/${conditionId}`, {
                submissionId: 'df833cac-0b44-4b2b-bb1c-de3878f00182', // Utiliser submissionId réel
                organizationId: 'test-org',
                userId: 'test-user',
                testMode: true
              });
              
              logger.debug('🧪 [handleTestCondition] Réponse API complète:', response);
              logger.debug('🧪 [handleTestCondition] Données reçues:', response.data || response);
              logger.debug('🧪 [handleTestCondition] Structure evaluation:', (response.data || response)?.evaluation);
              
              // 🔍 DEBUG DÉTAILLÉ pour comprendre pourquoi ça dit "PAS OK"
              const responseData = response.data || response;
              logger.debug('🔍 [DEBUG] JSON de responseData:', JSON.stringify(responseData, null, 2));
              logger.debug('🔍 [DEBUG] evaluation.success existe ?', 'success' in (responseData?.evaluation || {}));
              logger.debug('🔍 [DEBUG] evaluation.success valeur:', responseData?.evaluation?.success);
              logger.debug('🔍 [DEBUG] evaluation.result existe ?', 'result' in (responseData?.evaluation || {}));
              logger.debug('🔍 [DEBUG] evaluation.result valeur:', responseData?.evaluation?.result);
              
              const conditionName = responseData?.conditionName || selectedCondition?.name || 'Condition inconnue';
              
              // 🎯 NOUVELLE LOGIQUE : Vérifier le VRAI résultat de la condition
              const evaluationSuccess = responseData?.evaluation?.success; // L'API a-t-elle fonctionné ?
              const conditionResult = responseData?.evaluation?.result;     // Peut être booléen OU valeur calculée
              const conditionMet = responseData?.evaluation?.details?.conditionMet;
              
              logger.debug('🧪 [handleTestCondition] ANALYSE COMPLÈTE:');
              logger.debug('🔍 [DIAGNOSTIC] API success =', evaluationSuccess);
              logger.debug('🔍 [DIAGNOSTIC] Condition result =', conditionResult);
              logger.debug('🔍 [DIAGNOSTIC] Condition met =', conditionMet);
              
              // Le test est réussi SI l'API fonctionne ET que la condition est vraie
              // Interpréter via conditionMet si disponible
              const isConditionOK = evaluationSuccess && (conditionMet === 'OUI' || conditionResult === true);
              const isConditionKO = evaluationSuccess && (conditionMet === 'NON' || conditionResult === false);
              const isNeutral = evaluationSuccess && (!isConditionOK && !isConditionKO);
              
              logger.debug('🎯 [DIAGNOSTIC] RÉSULTAT FINAL:');
              logger.debug('🔍 [DIAGNOSTIC] Condition OK ?', isConditionOK);
              logger.debug('🔍 [DIAGNOSTIC] Condition KO ?', isConditionKO);
              
              // Enregistrer le résultat du test (incluant la valeur calculée par l'API si fournie)
              setLastTestResult({
                status: isConditionOK ? 'ok' : (isConditionKO ? 'ko' : (isNeutral ? 'neutral' : 'error')),
                conditionName,
                timestamp: Date.now(),
                details: responseData?.evaluation?.details?.message,
                apiValue: responseData?.evaluation?.details?.calculatedValue ?? (typeof conditionResult !== 'boolean' ? conditionResult : undefined) ?? responseData?.evaluation?.value ?? responseData?.value
              });
              
              if (isConditionOK) {
                messageApi.success(`Condition "${conditionName}" OK`);
              } else if (isConditionKO) {
                messageApi.error(`Condition "${conditionName}" PAS OK`);
              } else if (isNeutral) {
                messageApi.info(`Condition "${conditionName}" non remplie (neutre)`);
              } else {
                messageApi.warning(`Test condition: erreur ou résultat invalide`);
              }
            } catch (error) {
              logger.error('Erreur test condition:', error);
              
              // Enregistrer l'échec du test
              setLastTestResult({
                status: 'error',
                conditionName: selectedCondition?.name || 'Condition inconnue',
                timestamp: Date.now(),
                details: (error as Error)?.message
              });
              messageApi.error(`Erreur lors du test de la condition: ${(error as Error)?.message || 'inconnue'}`);
            }
          };
          
          // Trouver le nom de la condition sélectionnée
          const selectedCondition = Array.isArray(conditions.items) 
            ? conditions.items.find((c: { id: string; name: string }) => c.id === conditionId)
            : null;
          
          return (
            <div style={{ 
              marginBottom: 12, 
              padding: '12px', 
              backgroundColor: lastTestResult ? 
                (lastTestResult.status === 'ok' ? '#f6ffed' : lastTestResult.status === 'ko' ? '#fff2f0' : '#f0f8ff') : '#f0f8ff', 
              border: lastTestResult ? 
                (lastTestResult.status === 'ok' ? '2px solid #52c41a' : lastTestResult.status === 'ko' ? '2px solid #ff4d4f' : '1px solid #91caff') : '1px solid #d9d9d9', 
              borderRadius: '6px' 
            }}>
              <div style={{ marginBottom: 8, fontSize: '13px', fontWeight: 'bold' }}>
                📋 <strong>Condition sélectionnée:</strong> {selectedCondition?.name || 'Condition inconnue'}
              </div>
              {conditionDetails?.expression && (
                <div style={{ marginBottom: 8, padding: '6px 8px', background: '#fff', border: '1px solid #f0f0f0', borderRadius: 6 }}>
                  <Text type="secondary">Expression:</Text>
                  <div><Text code>{conditionDetails.expression}</Text></div>
                </div>
              )}
              
              {/* Affichage du dernier résultat de test */}
              {lastTestResult && (
                <div style={{ 
                  marginBottom: 8, 
                  padding: '6px 8px', 
                  backgroundColor: lastTestResult.status === 'ok' ? '#d9f7be' : lastTestResult.status === 'ko' ? '#ffccc7' : '#e6f4ff', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {lastTestResult.status === 'ok' && (
                    <span style={{ color: '#389e0d' }}>✅ DERNIER TEST : OK</span>
                  )}
                  {lastTestResult.status === 'ko' && (
                    <span style={{ color: '#cf1322' }}>❌ DERNIER TEST : PAS OK</span>
                  )}
                  {lastTestResult.status === 'neutral' && (
                    <span style={{ color: '#0958d9' }}>ℹ️ DERNIER TEST : NEUTRE</span>
                  )}
                  {lastTestResult.status === 'error' && (
                    <span style={{ color: '#d46b08' }}>⚠️ DERNIER TEST : ERREUR</span>
                  )}
                  <span style={{ float: 'right', fontWeight: 'normal', opacity: 0.7 }}>
                    {new Date(lastTestResult.timestamp).toLocaleTimeString('fr-FR')}
                  </span>
                </div>
              )}
              {/* Valeur réellement calculée par la condition (retour API) */}
              {lastTestResult?.apiValue !== undefined && (
                <div style={{ marginBottom: 8, padding: '6px 8px', background: '#fff', border: '1px solid #f0f0f0', borderRadius: 6 }}>
                  <Text type="secondary">Valeur calculée (API): </Text>
                  <Text strong>{formatValueForDisplay(lastTestResult.apiValue)}</Text>
                </div>
              )}
              
              <Button 
                size="default" 
                type="primary" 
                onClick={handleTestCondition}
                style={{ 
                  fontSize: '13px', 
                  height: '32px', 
                  fontWeight: 'bold',
                  width: '100%'
                }}
                icon="🧪"
              >
                🧪 TESTER CETTE CONDITION
              </Button>
            </div>
          );
        }
        return null;
      })()}

      {/* 🧪 Bac à sable de test: conditions & formules */}
      {(() => {
        const sourceType = form.getFieldValue('sourceType');
        const selectedSourceRef: string | undefined = form.getFieldValue('sourceRef');
        const isCondition = sourceType === 'tree' && selectedSourceRef?.startsWith('condition:');
        const isFormula = sourceType === 'tree' && selectedSourceRef?.startsWith('formula:');
        if (!isCondition && !isFormula) return null;

        const refId = (selectedSourceRef || '').split(':')[1];

        const executeSandboxTest = async () => {
          if (!refId) return;
          setExecuting(true);
          try {
            // Construire fieldValues typés
            const fieldValues: Record<string, unknown> = {};
            for (const row of testRows) {
              if (!row.key) continue;
              if (row.type === 'number') {
                const v = typeof row.value === 'number' ? row.value : parseFloat(String(row.value).replace(',', '.'));
                if (!Number.isNaN(v)) fieldValues[row.key] = v;
              } else if (row.type === 'boolean') {
                fieldValues[row.key] = Boolean(row.value);
              } else {
                fieldValues[row.key] = String(row.value ?? '');
              }
            }

            if (isCondition) {
              const resp = (await enqueue(refId, fieldValues)) as EnqueueResp;
              const value = resp?.value ?? resp?.calculatedValue ?? resp?.evaluation?.result ?? resp?.result;
              const ok = value === true;
              const ko = value === false;
              const neutral = value === null || value === undefined;

              setLastTestResult({
                status: ok ? 'ok' : (ko ? 'ko' : (neutral ? 'neutral' : 'error')),
                conditionName: resp?.conditionName || 'Condition',
                timestamp: Date.now(),
                details: resp?.evaluation?.details?.message
              });

              if (ok) messageApi.success('✅ Condition remplie (OK)');
              else if (ko) messageApi.error('❌ Condition non remplie (PAS OK)');
              else if (neutral) messageApi.info('ℹ️ Résultat neutre (incomplet)');
              else messageApi.warning('⚠️ Test: résultat invalide');
            }

            if (isFormula) {
              const resp = (await enqueue(refId, fieldValues)) as EnqueueResp;
              const value = resp?.value ?? resp?.calculatedValue ?? resp?.evaluation?.result ?? resp?.result;
              if (value === null || value === undefined) messageApi.info('ℹ️ Formule évaluée: résultat vide');
              else messageApi.success(`🧮 Résultat formule: ${String(value)}`);
            }
          } catch (err) {
            logger.error('🧪 Erreur exécution bac à sable:', err);
            messageApi.error('Erreur pendant le test');
          } finally {
            setExecuting(false);
          }
        };

        const simulatedOutput = () => {
          if (!lastTestResult) return null;
          if (lastTestResult.status === 'ok') return alorsValue || null;
          if (lastTestResult.status === 'ko' || lastTestResult.status === 'neutral') return sinonValue || null;
          return null;
        };

        return (
          <Card size="small" style={{ marginBottom: 12, border: '1px dashed #91caff', background: '#f9fcff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text strong>🧪 Bac à sable de test</Text>
              <Button type="link" onClick={() => setSandboxOpen(v => !v)}>{sandboxOpen ? 'Masquer' : 'Afficher'}</Button>
            </div>
            {sandboxOpen && (
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Injectez des valeurs fictives pour simuler l'environnement d'évaluation.
                </Text>
                <Divider style={{ margin: '8px 0' }} />

                {testRows.map((row, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                    <Input 
                      size="small" 
                      placeholder="Clé (ex: @value.monChamp)" 
                      style={{ minWidth: 220, flex: 1 }}
                      value={row.key}
                      onChange={(e) => setTestRows(prev => prev.map((r,i) => i===idx ? { ...r, key: e.target.value } : r))}
                    />
                    <Button size="small" onClick={() => openTestKeySelector(idx)}>🌲 Choisir</Button>
                    <Select
                      size="small"
                      value={row.type}
                      style={{ width: 110 }}
                      options={[{value:'text',label:'Texte'},{value:'number',label:'Nombre'},{value:'boolean',label:'Booléen'}]}
                      onChange={(t) => setTestRows(prev => prev.map((r,i) => i===idx ? { ...r, type: t } : r))}
                    />
                    {row.type === 'number' && (
                      <InputNumber 
                        size="small" 
                        placeholder="Valeur" 
                        style={{ width: 160 }}
                        value={typeof row.value === 'number' ? row.value : (row.value ? Number(row.value) : undefined)}
                        onChange={(val) => setTestRows(prev => prev.map((r,i) => i===idx ? { ...r, value: (val as number) } : r))}
                      />
                    )}
                    {row.type === 'text' && (
                      <Input 
                        size="small" 
                        placeholder="Valeur" 
                        style={{ width: 220 }}
                        value={String(row.value ?? '')}
                        onChange={(e) => setTestRows(prev => prev.map((r,i) => i===idx ? { ...r, value: e.target.value } : r))}
                      />
                    )}
                    {row.type === 'boolean' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Switch 
                          size="small"
                          checked={Boolean(row.value)}
                          onChange={(checked) => setTestRows(prev => prev.map((r,i) => i===idx ? { ...r, value: checked } : r))}
                        />
                        <Tag color={row.value ? 'green' : 'red'}>{row.value ? 'true' : 'false'}</Tag>
                      </div>
                    )}
                    <Button size="small" danger onClick={() => setTestRows(prev => prev.filter((_,i) => i!==idx))}>Supprimer</Button>
                  </div>
                ))}
                <Button size="small" onClick={() => setTestRows(prev => [...prev, { key: '', type: 'text', value: '' }])}>+ Ajouter entrée</Button>

                {isCondition && (
                  <div style={{ marginTop: 10 }}>
                    <Divider style={{ margin: '8px 0' }} />
                    <Text strong>Sorties de la condition</Text>
                    <Space style={{ display: 'flex', marginTop: 6 }}>
                      <Input
                        size="small"
                        style={{ flex: 1 }}
                        readOnly
                        placeholder="Alors (si condition vraie)"
                        value={conditionDetails?.thenLabel ?? alorsValue}
                      />
                      <Input
                        size="small"
                        style={{ flex: 1 }}
                        readOnly
                        placeholder="Sinon (si condition fausse)"
                        value={conditionDetails?.elseLabel ?? sinonValue}
                      />
                    </Space>
                    {lastTestResult && (
                      <div style={{ marginTop: 8, padding: '6px 8px', background: '#fff', border: '1px solid #f0f0f0', borderRadius: 6 }}>
                        <Text type="secondary">Résultat simulé:</Text>
                        <div><Text strong>{simulatedOutput() ?? '—'}</Text></div>
                      </div>
                    )}
                  </div>
                )}

                <Button 
                  type="primary" 
                  onClick={executeSandboxTest} 
                  loading={executing}
                  style={{ marginTop: 10 }}
                >
                  Exécuter le test
                </Button>
              </div>
            )}
          </Card>
        );
      })()}
      
      <Form
        form={form}
        layout="vertical"
        initialValues={value}
        onValuesChange={onValuesChange}
        disabled={readOnly}
      >
        {/* 🔗 Source depuis l'arborescence uniquement */}
        <Form.Item label="Source de la donnée" name="sourceRef">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input 
              placeholder="Sélectionnez dans l'arborescence..." 
              readOnly
              style={{ cursor: 'pointer' }}
              value={selectedRefDisplay}
              title={selectedRefDisplay}
              onClick={openTreeSelector}
            />
            <Button 
              type="dashed" 
              onClick={openTreeSelector}
              disabled={readOnly}
              style={{ width: '100%' }}
            >
              📋 Sélectionner dans l'arborescence
            </Button>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Choisissez un champ, une formule ou une condition comme source
            </Text>
          </Space>
        </Form.Item>
        
        <Form.Item name="displayFormat" label="Format d'affichage">
          <Select options={formatOptions} placeholder="Choisir un format" />
        </Form.Item>
        <Space size={8} style={{ display: 'flex' }}>
          <Form.Item name="unit" label="Unité" style={{ flex: 1 }}>
            <Input placeholder="€, m², %..." />
          </Form.Item>
          <Form.Item name="precision" label="Précision" style={{ width: 140 }}>
            <Select
              options={[0,1,2,3,4].map(n => ({ value: n, label: n }))}
            />
          </Form.Item>
        </Space>
        <Form.Item name="visibleToUser" valuePropName="checked">
          <Checkbox>Visible pour l'utilisateur</Checkbox>
        </Form.Item>
      </Form>
      
      {/* 📊 Option pour créer un champ Total (somme des copies) */}
      <Divider style={{ margin: '12px 0' }} />
      <div style={{ marginBottom: 12 }}>
        <Checkbox
          checked={createSumDisplayField}
          disabled={readOnly || sumFieldLoading}
          onChange={async (e) => {
            const newValue = e.target.checked;
            setCreateSumDisplayField(newValue);
            setSumFieldLoading(true);
            
            try {
              // Sauvegarder dans la metadata du nœud
              const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown> };
              const md = (node?.metadata || {}) as Record<string, unknown>;
              const nextMd = { ...md, createSumDisplayField: newValue };
              await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd });
              
              // Appeler l'API pour créer/supprimer le champ Total
              if (newValue) {
                // Créer le champ Total
                await api.post(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}/sum-display-field`);
                messageApi.success('Champ Total créé avec succès');
              } else {
                // Supprimer le champ Total
                await api.delete(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}/sum-display-field`);
                messageApi.success('Champ Total supprimé');
              }
            } catch (err) {
              logger.error('❌ Erreur gestion champ Total:', err);
              messageApi.error('Erreur lors de la gestion du champ Total');
              // Rollback
              setCreateSumDisplayField(!newValue);
            } finally {
              setSumFieldLoading(false);
            }
          }}
        >
          📊 Créer un champ Total (somme des copies)
        </Checkbox>
        <div style={{ marginLeft: 24, marginTop: 4 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Active cette option pour créer automatiquement un champ qui affiche la somme de toutes les copies de cette variable (ex: toit + toit-1 + toit-2 = Total).
            Le champ Total sera mis à jour automatiquement à chaque ajout ou suppression de copie.
          </Text>
        </div>
      </div>
      
      {helper}
      
      {/* 🌲 Sélecteur d'arborescence modal */}
      <NodeTreeSelector
        nodeId={nodeId}
        open={treeSelectorOpen}
        onClose={() => setTreeSelectorOpen(false)}
        onSelect={handleTreeSelection}
        selectionContext="token"
        allowMulti={false}
      />

      {/* Sélecteur d'arborescence pour les clés du bac à sable */}
      <NodeTreeSelector
        nodeId={nodeId}
        open={testKeySelectorOpen}
        onClose={() => setTestKeySelectorOpen(false)}
        onSelect={handleTestKeySelection}
        selectionContext="test"
        allowMulti={false}
      />
    </Card>
  );
};

export default DataPanel;
