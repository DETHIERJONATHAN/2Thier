import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, Form, Input, Checkbox, Typography, Select, Space, message, Button, Radio, InputNumber, Switch, Divider, Tag } from 'antd';
import { useAuthenticatedApi } from '../../../../../../hooks/useAuthenticatedApi';
import { useDebouncedCallback } from '../../../hooks/useDebouncedCallback';
import NodeTreeSelector, { NodeTreeSelectorValue } from '../shared/NodeTreeSelector';
import { useEvalBridge } from '../../../TBL/bridge/evalBridge';

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
    sourceType?: 'fixed' | 'tree'; // NOUVEAU : Type de source
    fixedValue?: string; // NOUVEAU : Valeur fixe
    sourceRef?: string; // Référence d'arborescence (@value.nodeId, @select.nodeId, formule, etc.)
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
  const [conditions, setConditions] = useState<{ items: Array<{ id: string; name: string }> }>({ items: [] });
  const [formulas, setFormulas] = useState<{ items: Array<{ id: string; name: string }> }>({ items: [] });
  
  // 🎯 NOUVEAU : Référence pour tracker les changements utilisateur avec protection renforcée
  const lastUserChangeRef = useRef<number>(0);
  const userSelectedRefRef = useRef<string | null>(null); // Track what user actually selected
  
  // 🎯 NOUVEAU : État pour le choix entre valeur fixe ou arborescence
  const [sourceType, setSourceType] = useState<'fixed' | 'tree'>('fixed');
  const [fixedValue, setFixedValue] = useState<string>('');
  
  // 🎯 NOUVEAU : État pour le dernier résultat de test
  const [lastTestResult, setLastTestResult] = useState<{
    status: 'ok' | 'ko' | 'neutral' | 'error';
    conditionName: string;
    timestamp: number;
    details?: string;
    apiValue?: unknown;
  } | null>(null);

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
        if (list.length > 0) {
          const first = list[0];
          setInstances(list);
          setActiveId(first.id);
          setName(first.name || '');
          // 🎯 Initialiser les nouveaux états
          setSourceType(first.config.sourceType || 'fixed');
          setFixedValue(first.config.fixedValue || '');
          // Laisser l'effet de synchronisation (activeId) remplir le formulaire après montage
          onChange?.(first.config as Record<string, unknown>);
          // Récupérer l'ID de la variable pour affichage (même si on a déjà des instances en metadata)
          try {
            const v = await api.get(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}/data`) as { id?: string; usedVariableId?: string } | undefined;
            if (v && typeof v.usedVariableId === 'string') setVariableId(v.usedVariableId);
          } catch { /* noop */ }
        } else {
          const data = await api.get(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}/data`);
          if (!mountedRef.current) return;
          const initial = {
            exposedKey: data?.exposedKey || `var_${nodeId.slice(0, 4)}`,
            sourceType: data?.sourceType || 'fixed', // NOUVEAU : Par défaut valeur fixe
            fixedValue: data?.fixedValue || '', // NOUVEAU : Valeur vide par défaut
            sourceRef: data?.sourceRef || '', // Référence d'arborescence vide par défaut
            displayFormat: data?.displayFormat || 'number',
            unit: data?.unit || '',
            precision: data?.precision ?? 2,
            visibleToUser: Boolean(data?.visibleToUser)
          };
          // 🎯 Initialiser les nouveaux états
          setSourceType(initial.sourceType);
          setFixedValue(initial.fixedValue);
          // Laisser l'effet de synchronisation (activeId) remplir le formulaire après montage
          const first: DataInstance = { id: `data_${Date.now()}`, name: 'Donnée 1', config: initial };
          setInstances([first]);
          setActiveId(first.id);
          setName(first.name);
          // Capturer l'ID de la variable si déjà existante côté API
          if (data && typeof (data as { usedVariableId?: string }).usedVariableId === 'string') {
            setVariableId((data as { usedVariableId?: string }).usedVariableId!);
          }
          // persister dans metadata
          try {
            const md = (node?.metadata || {}) as Record<string, unknown>;
            const nextMd = { ...md, capabilities: { ...(md as { capabilities?: Record<string, unknown> }).capabilities, datas: [first] } };
            await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd });
          } catch { /* noop */ }
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

  // 🎯 NOUVEAU: Effect pour synchroniser les états locaux quand activeId change
  useEffect(() => {
    if (activeId && instances.length > 0) {
      const activeInstance = instances.find(it => it.id === activeId);
      if (activeInstance?.config) {
        console.log('🔄 [DataPanel] Synchronisation états pour activeId:', activeId, 'config:', activeInstance.config);
        
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
          
          console.log('✅ [DataPanel] États synchronisés - sourceType:', activeInstance.config.sourceType, 'fixedValue:', activeInstance.config.fixedValue, 'sourceRef:', selectedSourceRef, '(PRÉSERVÉ)');
        } else {
          console.log('🛡️ [DataPanel] Synchronisation ignorée - changement utilisateur récent');
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
          console.log('🚀 [DataPanel] Capacité "Données" auto-activée');
        } catch (err) {
          console.warn('⚠️ [DataPanel] Erreur auto-activation capacité:', err);
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
            console.log('🔄 [DataPanel] Données fraîches depuis l\'API:', freshData);
            console.log('🔄 [DataPanel] États avant mise à jour - sourceType:', sourceType, 'fixedValue:', fixedValue, 'selectedSourceRef:', selectedSourceRef);
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
              
              console.log('🔄 [DataPanel] Données fraîches depuis l\'API - sourceType:', freshSourceType, 'fixedValue:', freshFixedValue, 'sourceRef:', freshSourceRef);
              console.log('🔄 [DataPanel] États actuels - sourceType:', sourceType, 'fixedValue:', fixedValue, 'selectedSourceRef:', selectedSourceRef);
              
          // 🛡️ PROTECTION CRITIQUE: Ne pas écraser les états utilisateur récemment modifiés
              // Ignorer la mise à jour si on vient de faire une modification (dans les 5 dernières secondes)
              const now = Date.now();
              const lastUserChange = lastUserChangeRef.current || 0;
              const timeSinceLastChange = now - lastUserChange;
              
              // Protection renforcée : vérifier aussi si l'utilisateur a fait une sélection qui est différente
              const userHasSelectedDifferent = userSelectedRefRef.current && 
                                             userSelectedRefRef.current !== freshSourceRef;
              
              if (timeSinceLastChange < 5000 || userHasSelectedDifferent) {
                console.log('🛡️ [DataPanel] Récente modification utilisateur détectée - ignore mise à jour API', {
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
                console.log('🔄 [DataPanel] Mise à jour nécessaire - application des données fraîches (SAUF sourceRef)');
                setSourceType(freshSourceType);
                setFixedValue(freshFixedValue);
                // ❌ NE PAS FAIRE: setSelectedSourceRef(freshSourceRef); 
                
                // Mettre à jour le formulaire SANS toucher au sourceRef
                const { sourceRef: _ignored, ...freshDataWithoutSourceRef } = freshData as Record<string, unknown>;
                form.setFieldsValue(freshDataWithoutSourceRef);
                
                console.log('✅ [DataPanel] États après mise à jour - sourceType:', freshSourceType, 'fixedValue:', freshFixedValue, 'selectedSourceRef:', selectedSourceRef, '(PRÉSERVÉ)');
              } else {
                console.log('🚫 [DataPanel] Pas de mise à jour nécessaire - données identiques');
              }
            }
          } catch (error) {
            console.error('🔥 [DataPanel] Erreur récupération données fraîches:', error);
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
    console.log('🌲 [DataPanel] Sélection arborescence:', selection);
    
    // 🎯 NOUVEAU : Marquer le changement utilisateur ET sauvegarder sa sélection
    lastUserChangeRef.current = Date.now();
    userSelectedRefRef.current = selection.ref || null;
    
    // 🎯 CORRECTION: Passer automatiquement en mode "tree" quand on sélectionne une référence
    setSourceType('tree');
    
    // Mettre à jour le champ sourceRef ET sourceType dans le formulaire
    form.setFieldsValue({ 
      sourceRef: selection.ref,
      sourceType: 'tree'
    });
    setSelectedSourceRef(selection.ref);
    
    // Sauvegarder automatiquement
    const currentValues = form.getFieldsValue();
    const updatedValues = { 
      ...currentValues, 
      sourceRef: selection.ref,
      sourceType: 'tree'
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
    
    // Charger les conditions et formules pour l'affichage des noms
    try {
      const [conditionsResponse, formulasResponse] = await Promise.all([
        api.get('/api/treebranchleaf/reusables/conditions'),
        api.get('/api/treebranchleaf/reusables/formulas')
      ]);
      console.log('🔍 [DataPanel] Conditions chargées:', conditionsResponse);
      console.log('🔍 [DataPanel] Formules chargées:', formulasResponse);
      setConditions(conditionsResponse || { items: [] });
      setFormulas(formulasResponse || { items: [] });
    } catch (error) {
      console.warn('Erreur lors du chargement des conditions/formules:', error);
    }
    setTreeSelectorOpen(true);
  }, [api, setConditions, setFormulas]);

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
        console.warn('⚠️ Impossible de charger la condition:', (e as Error)?.message);
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
    if (ref.startsWith('condition:')) {
      const id = ref.slice('condition:'.length);
      const c = conditions.items?.find((x) => x.id === id);
      return c ? `🧩 Condition: ${c.name}` : `🧩 Condition: ${id.slice(0, 8)}…`;
    }
    if (ref.startsWith('formula:')) {
      const id = ref.slice('formula:'.length);
      const f = formulas.items?.find((x) => x.id === id);
      return f ? `🧮 Formule: ${f.name}` : `🧮 Formule: ${id.slice(0, 8)}…`;
    }
    if (ref.startsWith('@value.')) {
      return `📊 Champ: ${ref.replace('@value.', '')}`;
    }
    return ref;
  }, [selectedSourceRef, conditions.items, formulas.items]);

  // Affichage demandé: montrer l'ID de la variable directement dans le champ de sélection
  const selectedRefDisplay = useMemo(() => {
    return (variableId && typeof variableId === 'string' && variableId.length > 0)
      ? variableId
      : selectedRefLabel;
  }, [variableId, selectedRefLabel]);

  // (supprimé) getSelectedName n'était pas utilisé

  const deleteData = useCallback(() => {
    const confirmed = window.confirm('Supprimer la donnée exposée ?\nCette action vide la configuration et désactive la capacité.');
    if (!confirmed) return;
    (async () => {
      try {
        // ✅ Utiliser DELETE au lieu de PUT avec valeurs vides
        await api.delete(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}/data`);
        
        const emptyVals = { exposedKey: undefined, displayFormat: 'number', unit: '', precision: 2, visibleToUser: false } as Record<string, unknown>;
        form.setFieldsValue(emptyVals);
        onChange?.(emptyVals);
        messageApi.success('Donnée supprimée');
      } catch (err) {
        console.error('Erreur lors de la suppression de la variable:', err);
        messageApi.error('Impossible de supprimer la donnée');
      }
    })();
  }, [api, form, nodeId, onChange, treeId, messageApi]);

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
                const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown> };
                const md = (node?.metadata || {}) as Record<string, unknown>;
                const list: DataInstance[] = ((md as { capabilities?: { datas?: DataInstance[] } }).capabilities?.datas) || instances;
                const updated = (list || []).map(it => it.id === activeId ? { ...it, name: n } : it);
                const nextMd = { ...md, capabilities: { ...(md as { capabilities?: Record<string, unknown> }).capabilities, datas: updated } };
                await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd });
                setInstances(updated);
              } catch { /* noop */ }
            })();
          }}
        />
      </div>

      {/* Résumé test */}
      <div style={{ marginBottom: 8, padding: '6px 8px', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6 }}>
        <Text strong style={{ marginRight: 8 }}>Résumé test:</Text>
        <div>
          <Text type="secondary">
            {(() => {
              const exposedKey = form.getFieldValue('exposedKey') || '';
              const sourceType = form.getFieldValue('sourceType');
              const fixedValue = form.getFieldValue('fixedValue');
              const selectedNodeId = form.getFieldValue('selectedNodeId');
              const selectedSourceRef = form.getFieldValue('sourceRef');
              const unit = form.getFieldValue('unit') || '';
              const precision = form.getFieldValue('precision') || 2;
              
              // Valeur de test simulée
              const testValue = 1250.50;
              
              if (sourceType === 'fixed' && fixedValue) {
                return `Valeur fixe: ${fixedValue}`;
              } else if (sourceType === 'tree' && selectedSourceRef) {
                // Gestion des références vers des conditions
                if (selectedSourceRef.startsWith('condition:')) {
                  const conditionId = selectedSourceRef.replace('condition:', '');
                  // Rechercher le nom de la condition dans les données chargées
                  const condition = Array.isArray(conditions.items)
                    ? conditions.items.find((c: { id: string; name: string }) => c.id === conditionId)
                    : null;
                  const conditionName = condition?.name || `ID: ${conditionId.substring(0, 8)}...`;
                  return `🔗 Condition: "${conditionName}"\n📋 Utilisez le bouton "Tester" pour évaluer la logique`;
                }
                // Gestion des références vers des formules
                if (selectedSourceRef.startsWith('formula:')) {
                  const formulaId = selectedSourceRef.replace('formula:', '');
                  const formula = Array.isArray(formulas.items)
                    ? formulas.items.find((f: { id: string; name: string }) => f.id === formulaId)
                    : null;
                  const formulaName = formula?.name || `ID: ${formulaId.substring(0, 8)}...`;
                  return `🧮 Formule: "${formulaName}"\n⚡ Évaluation automatique lors du calcul`;
                }
                // Gestion des références vers des champs/nœuds
                if (selectedSourceRef.startsWith('@value.')) {
                  const nodeKey = selectedSourceRef.replace('@value.', '');
                  return `📊 Champ référencé: ${nodeKey.substring(0, 15)}...\n🔄 Valeur en temps réel`;
                }
                return `🌲 Référence: ${selectedSourceRef.substring(0, 20)}...`;
              } else if (sourceType === 'tree' && selectedNodeId) {
                // Formatage selon la configuration
                let formatted = testValue.toLocaleString('fr-FR', {
                  minimumFractionDigits: precision,
                  maximumFractionDigits: precision
                });
                
                if (unit === '€') {
                  formatted = `${formatted} €`;
                } else if (unit) {
                  formatted = `${formatted} ${unit}`;
                }
                
                return `Valeur calculée (test): ${formatted}`;
              }
              
              return `Clé exposée: ${exposedKey}`;
            })()}
          </Text>
        </div>
      </div>
      
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
              
              console.log('🧪 [handleTestCondition] Réponse API complète:', response);
              console.log('🧪 [handleTestCondition] Données reçues:', response.data || response);
              console.log('🧪 [handleTestCondition] Structure evaluation:', (response.data || response)?.evaluation);
              
              // 🔍 DEBUG DÉTAILLÉ pour comprendre pourquoi ça dit "PAS OK"
              const responseData = response.data || response;
              console.log('🔍 [DEBUG] JSON de responseData:', JSON.stringify(responseData, null, 2));
              console.log('🔍 [DEBUG] evaluation.success existe ?', 'success' in (responseData?.evaluation || {}));
              console.log('🔍 [DEBUG] evaluation.success valeur:', responseData?.evaluation?.success);
              console.log('🔍 [DEBUG] evaluation.result existe ?', 'result' in (responseData?.evaluation || {}));
              console.log('🔍 [DEBUG] evaluation.result valeur:', responseData?.evaluation?.result);
              
              const conditionName = responseData?.conditionName || selectedCondition?.name || 'Condition inconnue';
              
              // 🎯 NOUVELLE LOGIQUE : Vérifier le VRAI résultat de la condition
              const evaluationSuccess = responseData?.evaluation?.success; // L'API a-t-elle fonctionné ?
              const conditionResult = responseData?.evaluation?.result;     // Peut être booléen OU valeur calculée
              const conditionMet = responseData?.evaluation?.details?.conditionMet;
              
              console.log('🧪 [handleTestCondition] ANALYSE COMPLÈTE:');
              console.log('🔍 [DIAGNOSTIC] API success =', evaluationSuccess);
              console.log('🔍 [DIAGNOSTIC] Condition result =', conditionResult);
              console.log('🔍 [DIAGNOSTIC] Condition met =', conditionMet);
              
              // Le test est réussi SI l'API fonctionne ET que la condition est vraie
              // Interpréter via conditionMet si disponible
              const isConditionOK = evaluationSuccess && (conditionMet === 'OUI' || conditionResult === true);
              const isConditionKO = evaluationSuccess && (conditionMet === 'NON' || conditionResult === false);
              const isNeutral = evaluationSuccess && (!isConditionOK && !isConditionKO);
              
              console.log('🎯 [DIAGNOSTIC] RÉSULTAT FINAL:');
              console.log('🔍 [DIAGNOSTIC] Condition OK ?', isConditionOK);
              console.log('🔍 [DIAGNOSTIC] Condition KO ?', isConditionKO);
              
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
              console.error('Erreur test condition:', error);
              
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
            console.error('🧪 Erreur exécution bac à sable:', err);
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
        {/* 🎯 NOUVEAU : Choix entre valeur fixe ou arborescence */}
        <Form.Item label="Source de la donnée" name="sourceType">
          <Radio.Group 
            onChange={(e) => {
              const newType = e.target.value;
              console.log('🔄 [DataPanel] Changement sourceType:', newType);
              
              // 🎯 NOUVEAU : Marquer le changement utilisateur et sauvegarder le type
              lastUserChangeRef.current = Date.now();
              if (newType === 'tree') {
                userSelectedRefRef.current = null; // Reset user selection when switching to tree mode
              }
              
              setSourceType(newType);
              
              // Si on passe en mode arborescence, effacer la valeur fixe
              if (newType === 'tree') {
                setFixedValue('');
                form.setFieldsValue({ fixedValue: '' });
              }
              // Si on passe en mode valeur fixe, effacer la référence d'arborescence
              else if (newType === 'fixed') {
                setSelectedSourceRef('');
                form.setFieldsValue({ sourceRef: '' });
              }
              
              // Sauvegarder immédiatement le changement de type
              const currentValues = form.getFieldsValue();
              const updatedValues = { 
                ...currentValues, 
                sourceType: newType,
                // Nettoyer les champs selon le type
                ...(newType === 'tree' ? { fixedValue: '' } : { sourceRef: '' })
              };
              console.log('🔄 [DataPanel] Sauvegarde valeurs:', updatedValues);
              debouncedSave(updatedValues);
            }}
            style={{ marginBottom: 12 }}
          >
            <Radio value="fixed">📝 Valeur fixe</Radio>
            <Radio value="tree">🔗 Depuis l'arborescence</Radio>
          </Radio.Group>
        </Form.Item>

        {/* Champs dépendants du type de source - séparés pour éviter l'avertissement Form.Item */}
        {sourceType === 'fixed' ? (
          <Form.Item name="fixedValue" label="Valeur fixe">
            <Input 
              placeholder="ex: 95%, 1234.56, Texte fixe..." 
              value={fixedValue}
              onChange={(e) => {
                const newValue = e.target.value;
                setFixedValue(newValue);
                form.setFieldsValue({ fixedValue: newValue });
                const currentValues = form.getFieldsValue();
                debouncedSave({ ...currentValues, fixedValue: newValue });
              }}
            />
          </Form.Item>
        ) : (
          <Form.Item label="Référence arborescence" name="sourceRef">
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
        )}
        
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
