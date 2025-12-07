import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Card, Typography, message, Space, Button, Tooltip, Modal, Input, Divider, Select } from 'antd';
import TokenDropZone from '../shared/TokenDropZone';
import TokenChip from '../shared/TokenChip';
import { useOptimizedApi } from '../../../hooks/useOptimizedApi';
import NodeTreeSelector, { NodeTreeSelectorValue } from '../shared/NodeTreeSelector';

const { Title, Text } = Typography;

interface FormulaPanelProps {
  treeId?: string;
  nodeId: string;
  value?: Record<string, unknown>;
  onChange?: (val: Record<string, unknown>) => void;
  readOnly?: boolean;
}

type FormulaInstance = { id: string; name: string; tokens: string[]; enabled?: boolean };

const NODE_FORMULA_REGEX = /node-formula:[a-z0-9-]+/i;
const LEGACY_FORMULA_REGEX = /formula:[a-z0-9-]+/i;

const extractFormulaAlias = (token?: string | null): string | null => {
  if (!token || typeof token !== 'string') return null;
  const nodeFormulaMatch = token.match(NODE_FORMULA_REGEX);
  if (nodeFormulaMatch && nodeFormulaMatch[0]) {
    return nodeFormulaMatch[0];
  }
  const legacyFormulaMatch = token.match(LEGACY_FORMULA_REGEX);
  if (legacyFormulaMatch && legacyFormulaMatch[0]) {
    const suffix = legacyFormulaMatch[0].slice('formula:'.length);
    return suffix ? `node-formula:${suffix}` : null;
  }
  return null;
};

const FormulaPanel: React.FC<FormulaPanelProps> = ({ nodeId, onChange, readOnly }) => {
  // API optimisée pour éviter les conflits
  const { api, clearCache } = useOptimizedApi();
  
  // Refs pour cleanup et stabilité
  const mountedRef = useRef<boolean>(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedTokens = useRef<string>('');
  const lastSavedName = useRef<string>('');
  
  // État local stable
  const [localTokens, setLocalTokens] = useState<string[]>([]);
  const [localName, setLocalName] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // État UI
  const [pickRef, setPickRef] = useState(false);
  const [nodeCache, setNodeCache] = useState<Record<string, { label: string; type: string }>>({});
  const [showNumberModal, setShowNumberModal] = useState(false);
  const [numberInput, setNumberInput] = useState<string>('');
  const [showTextModal, setShowTextModal] = useState(false);
  const [textInput, setTextInput] = useState<string>('');
  const [testValues, setTestValues] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<string>('');
  const [testError, setTestError] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  // Modal de suppression
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formulaToDelete, setFormulaToDelete] = useState<string | null>(null);
  
  // Multi instances
  const [instances, setInstances] = useState<FormulaInstance[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Cleanup au démontage
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // 🔄 CHARGEMENT INITIAL DES FORMULES
  useEffect(() => {
    if (!nodeId || !api) return;

    const loadFormulas = async () => {
      try {
        // Charger les formules existantes pour ce nœud
        const response = await api.get(`/api/treebranchleaf/nodes/${nodeId}/formulas`) as { formulas: FormulaInstance[] };
        const existingFormulas = response.formulas || [];
        
        if (existingFormulas.length > 0) {
          setInstances(existingFormulas);
          
          // Sélectionner la première formule par défaut
          const firstFormula = existingFormulas[0];
          setActiveId(firstFormula.id);
          setLocalTokens(firstFormula.tokens || []);
          setLocalName(firstFormula.name || '');
          lastSavedTokens.current = JSON.stringify(firstFormula.tokens || []);
          lastSavedName.current = firstFormula.name || '';
          
          console.log('✅ FormulaPanel: Formules chargées:', existingFormulas.length, existingFormulas);
        } else {
          // Aucune formule existante
          setInstances([]);
          setActiveId(null);
          setLocalTokens([]);
          setLocalName('');
          console.log('ℹ️ FormulaPanel: Aucune formule existante pour ce nœud');
        }
      } catch (err) {
        console.error('❌ FormulaPanel: Erreur chargement formules:', err);
        // En cas d'erreur, on réinitialise
        setInstances([]);
        setActiveId(null);
        setLocalTokens([]);
        setLocalName('');
      }
    };

    loadFormulas();
  }, [nodeId, api]);

  // Fonction de sauvegarde avec debounce
  const saveFormula = useCallback(async (nextTokens: string[], nextName: string) => {
    if (!mountedRef.current || isSaving) return;

    const tokensStr = JSON.stringify(nextTokens);
    if (tokensStr === lastSavedTokens.current && nextName === lastSavedName.current) {
      return; // Pas de changement
    }

    setIsSaving(true);
    const timeoutId = setTimeout(async () => {
      if (!mountedRef.current) return;

      try {
        let resultFormula: FormulaInstance | null = null;

        // Normaliser nom (backend exige name + tokens array)
        const finalName = nextName && nextName.trim().length > 0 ? nextName.trim() : 'Formule';

        if (activeId) {
          // PUT mise à jour distante + synchro locale
            await api.put(`/api/treebranchleaf/nodes/${nodeId}/formulas/${activeId}`, {
              tokens: nextTokens,
              name: finalName
            });
            setInstances(prev => prev.map(inst => inst.id === activeId ? { ...inst, tokens: nextTokens, name: finalName } : inst));
        } else {
          // POST création distante
          resultFormula = await api.post(`/api/treebranchleaf/nodes/${nodeId}/formulas`, {
            tokens: nextTokens,
            name: finalName
          }) as FormulaInstance;
          if (resultFormula?.id) {
            setActiveId(resultFormula.id);
            setInstances(prev => [...prev, { id: resultFormula.id, name: finalName, tokens: nextTokens }]);
          }
        }

        // Mettre à jour les références pour éviter les re-saves
        lastSavedTokens.current = tokensStr;
  lastSavedName.current = finalName;

        // Notifier le parent
        if (mountedRef.current) {
          onChange?.({ tokens: nextTokens, name: finalName });
        }

        // console.log('✅ FormulaPanel: Sauvegarde réussie dans la table'); // ✨ Log réduit
      } catch (err) {
        console.error('❌ FormulaPanel: Erreur sauvegarde', err);
        if (mountedRef.current) {
          message.error('Erreur de sauvegarde de la formule');
        }
      } finally {
        if (mountedRef.current) {
          setIsSaving(false);
        }
      }
    }, 300); // Debounce réduit à 300ms

    saveTimeoutRef.current = timeoutId;
  }, [api, nodeId, activeId, onChange, isSaving]);

  // Gestion des changements de tokens SANS déclencher de boucles
  const handleTokensChange = useCallback((nextTokens: string[]) => {
    if (!mountedRef.current) return;
    
    setLocalTokens(nextTokens);
    saveFormula(nextTokens, localName);
  }, [saveFormula, localName]);

  // Gestion des changements de nom SANS déclencher de boucles
  const handleNameChange = useCallback((nextName: string) => {
    if (!mountedRef.current) return;
    
    setLocalName(nextName);
    saveFormula(localTokens, nextName);
  }, [saveFormula, localTokens]);

  // Placeholder mémorisé
  const placeholder = useMemo(() => 'Glissez ici des références (@value.*, @key, #marker)…', []);

  // Gestion sélection via sélecteur
  const onSelectRef = useCallback((val: NodeTreeSelectorValue) => {
    const ref = val.ref;
    handleTokensChange([...localTokens, ref]);
  }, [localTokens, handleTokensChange]);

  // Actions sur les tokens
  const appendToken = useCallback((t: string) => {
    // If it's a function call token that ends with '(', add a closing ')' immediately
    if (typeof t === 'string' && t.trim().endsWith('(')) {
      handleTokensChange([...localTokens, t, ')']);
    } else {
      handleTokensChange([...localTokens, t]);
    }
  }, [localTokens, handleTokensChange]);

  const mathFunctionButtons = useMemo(() => ([
    { key: 'radians', label: 'Radians (→ rad)', token: 'RADIANS(', tooltip: 'Convertit un angle en degrés vers des radians' },
    { key: 'sqrt', label: 'Racine √', token: 'RACINE(', tooltip: 'Calcule la racine carrée (alias SQRT)' },
    { key: 'cos', label: 'Cosinus', token: 'COS(', tooltip: 'Renvoie le cosinus (argument en radians)' },
    { key: 'atan', label: 'Atan', token: 'ATAN(', tooltip: 'Renvoie l’arc tangente (résultat en radians)' },
    { key: 'sierreur', label: 'SIERREUR', token: 'SIERREUR(', tooltip: 'SIERREUR(valeur; secours) — nécessite une valeur de repli' },
    { key: 'pi', label: 'PI()', token: 'PI()', tooltip: 'Constante π (utilisez pi(*facteur) pour multiplier)' },
    { key: 'int', label: 'INT', token: 'INT(', tooltip: 'Arrondit vers l’entier inférieur (alias FINT)' },
    { key: 'row', label: 'ROW', token: 'ROW(', tooltip: 'Génère une séquence d’index numériques' },
    { key: 'indirect', label: 'INDIRECT', token: 'INDIRECT(', tooltip: 'Crée une plage à partir d’un texte (ex: "1:10")' },
    { key: 'sumproduct', label: 'SUMPRODUCT', token: 'SUMPRODUCT(', tooltip: 'Somme des produits de plusieurs plages (alias SOMMEPROD)' }
  ]), []);

  const removeLast = useCallback(() => {
    if (!localTokens?.length) return;
    handleTokensChange(localTokens.slice(0, -1));
  }, [localTokens, handleTokensChange]);

  const clearAll = useCallback(() => {
    handleTokensChange([]);
  }, [handleTokensChange]);

  // Supprimer une formule UNIQUEMENT de la table TreeBranchLeafNodeFormula
  const deleteFormula = useCallback(() => {
    // console.log(...) // ✨ Log réduit

    // {
      // activeId,

      // nodeId,
      // isDeleting

    // }

    // Protection contre les clics multiples
    if (!activeId || isDeleting) {
      // console.log('🗑️ FormulaPanel: Arrêt - pas d\'activeId ou déjà en cours de suppression', { activeId, isDeleting }); // ✨ Log réduit
      return;
    }
    
    // console.log('🗑️ FormulaPanel: Ouverture du modal de confirmation...'); // ✨ Log réduit
    setFormulaToDelete(activeId);
    setShowDeleteModal(true);
  }, [activeId, isDeleting]);

  // Confirmation de suppression SIMPLIFIÉE
  const confirmDelete = useCallback(async () => {
    if (!formulaToDelete) return;

    // console.log('🗑️ FormulaPanel: Suppression confirmée, appel API...'); // ✨ Log réduit
    setIsDeleting(true);
    setShowDeleteModal(false);
    
    try {
      // ✅ UNIQUEMENT: Supprimer de la table TreeBranchLeafNodeFormula
      await api.delete(`/api/treebranchleaf/nodes/${nodeId}/formulas/${formulaToDelete}`);
      
      // console.log('🗑️ FormulaPanel: Formule supprimée de la table avec succès'); // ✨ Log réduit
      
      // Mettre à jour les instances locales
      const remaining = instances.filter(f => f.id !== formulaToDelete);
      setInstances(remaining);
      
      // Sélectionner la prochaine formule ou vider
      const nextActive = remaining[0] || null;
      setActiveId(nextActive ? nextActive.id : null);
      
      if (nextActive) {
        setLocalTokens(nextActive.tokens || []);
        setLocalName(nextActive.name || '');
        lastSavedTokens.current = JSON.stringify(nextActive.tokens || []);
        lastSavedName.current = nextActive.name || '';
      } else {
        setLocalTokens([]);
        setLocalName('');
        lastSavedTokens.current = '[]';
        lastSavedName.current = '';
      }
      
      onChange?.({ tokens: nextActive?.tokens || [], name: nextActive?.name || '' });
      message.success('Formule supprimée');
    } catch (err) {
      console.error('🗑️ FormulaPanel: Erreur suppression:', err);
      message.error('Impossible de supprimer la formule');
    } finally {
      setIsDeleting(false);
      setFormulaToDelete(null);
    }
  }, [api, nodeId, formulaToDelete, instances, onChange]);

  // Annulation de suppression
  const cancelDelete = useCallback(() => {
    // console.log('🗑️ FormulaPanel: Suppression annulée'); // ✨ Log réduit
    setShowDeleteModal(false);
    setFormulaToDelete(null);
  }, []);

  // Aide rendu: extraire id depuis token
  const extractNodeIdFromRef = useCallback((ref?: string): string | undefined => {
    if (!ref || typeof ref !== 'string') return undefined;
    if (ref.startsWith('@value.')) return ref.slice('@value.'.length);
    if (ref.startsWith('@select.')) return ref.slice('@select.'.length).split('.')[0];
    const formulaAlias = extractFormulaAlias(ref);
    if (formulaAlias) return formulaAlias;
    return undefined;
  }, []);

  const referencedNodeIds = useMemo(() => {
    return Array.from(new Set(localTokens.map(extractNodeIdFromRef).filter(Boolean))) as string[];
  }, [localTokens, extractNodeIdFromRef]);

  const buildEvaluationExpression = useCallback(() => {
    const rolesMap: Record<string, string> = {};
    const parts: string[] = [];
    const formulaRoleCache = new Map<string, string>();

    // 🛠️ Helper: Extract string value from token (handles both string and object tokens)
    const getTokenString = (token: any): string => {
      if (typeof token === 'string') {
        return token;
      }
      if (typeof token === 'object' && token !== null) {
        // Try common property names
        return (token.value || token.id || token.token || token.ref || String(token)).toString();
      }
      return String(token);
    };

    const getFormulaRole = (alias: string) => {
      if (formulaRoleCache.has(alias)) {
        return formulaRoleCache.get(alias) as string;
      }
      const sanitized = alias.replace(/[^A-Za-z0-9]/g, '_');
      const role = `formula_${sanitized}`;
      formulaRoleCache.set(alias, role);
      return role;
    };

    // 🔍 DEBUG: Voir tous les tokens bruts - INSPECTING TOKEN STRUCTURE
    console.log('🔍 [buildEvaluationExpression] Tokens bruts traités:', localTokens.map((t, i) => {
      let tokenValue = '';
      if (typeof t === 'string') {
        tokenValue = t;
      } else if (typeof t === 'object' && t !== null) {
        // Essayer différentes propriétés pour extraire la valeur
        tokenValue = (t as any).value || (t as any).id || (t as any).token || (t as any).ref || String(t);
      }
      return {
        index: i, 
        type: typeof t,
        isString: typeof t === 'string',
        rawString: String(t),
        extractedValue: tokenValue,
        keys: typeof t === 'object' && t !== null ? Object.keys(t) : null,
        fullObject: t
      };
    }));

    for (const rawToken of localTokens) {
      if (!rawToken) continue;
      
      // Extract the actual string value from the token (may be object or string)
      let tokenStr = getTokenString(rawToken);
      
      // 🔍 DEBUG: Voir la valeur extraite
      if (typeof tokenStr === 'string' && tokenStr.includes('shared-ref')) {
        console.log(`🔎 [TOKEN-DEBUG] Raw:`, rawToken, `| Extracted: "${tokenStr}" | Type: ${typeof tokenStr} | Starts with {{: ${tokenStr.startsWith('{{')}`);
      }
      
      // CRITICAL: Remove {{ }} if present (tokens are stored WITH braces in DB)
      if (tokenStr.startsWith('{{') && tokenStr.endsWith('}}')) {
        console.log(`🔧 [BRACE-STRIP] "${tokenStr}" → "${tokenStr.slice(2, -2)}"`);
        tokenStr = tokenStr.slice(2, -2);
      }
      
      if (typeof tokenStr !== 'string' || !tokenStr) continue;
      if (tokenStr === 'CONCAT') {
        parts.push('&');
        continue;
      }

      const formulaAlias = extractFormulaAlias(tokenStr);
      if (formulaAlias) {
        const roleKey = getFormulaRole(formulaAlias);
        rolesMap[roleKey] = formulaAlias;
        parts.push(`{{${roleKey}}}`);
        continue;
      }

      if (tokenStr.startsWith('@value.')) {
        const nodeId = tokenStr.slice('@value.'.length);
        if (!nodeId) continue;
        
        // Les shared-ref-* sont utilisés tels quels
        rolesMap[nodeId] = nodeId;
        parts.push(`{{${nodeId}}}`);
        continue;
      }

      if (tokenStr.startsWith('@select.')) {
        const nodeId = tokenStr.slice('@select.'.length).split('.')[0];
        if (!nodeId) continue;
        rolesMap[nodeId] = nodeId;
        parts.push(`{{${nodeId}}}`);
        continue;
      }

      // Traiter les références partagées (shared-ref-*) comme des placeholders
      if (tokenStr.startsWith('shared-ref-')) {
        const roleKey = getFormulaRole(tokenStr);
        rolesMap[roleKey] = tokenStr;
        parts.push(`{{${roleKey}}}`);
        continue;
      }

      parts.push(tokenStr);
    }

    const expr = parts.join(' ').replace(/\s+/g, ' ').trim();
    return { expr, rolesMap };
  }, [localTokens]);

  // Validate if expression parentheses are balanced
  const isParenthesesBalanced = useCallback((input: string): boolean => {
    if (!input) return true;
    let balance = 0;
    for (let i = 0; i < input.length; i++) {
      const c = input[i];
      if (c === '(') balance++;
      else if (c === ')') {
        balance--;
        if (balance < 0) return false; // found extra closing parenthesis
      }
    }
    return balance === 0;
  }, []);

  const buildTestValuesPayload = useCallback(() => {
    const payload: Record<string, number | string> = {};
    referencedNodeIds.forEach((nodeId) => {
      const raw = testValues[nodeId];
      if (raw === undefined || raw === null || raw === '') {
        return;
      }
      const normalized = raw.replace(',', '.');
      const numeric = Number(normalized);
      payload[nodeId] = Number.isFinite(numeric) ? numeric : raw;
    });
    return payload;
  }, [referencedNodeIds, testValues]);

  const handleEvaluate = useCallback(async () => {
    if (!localTokens.length) {
      setTestResult('');
      setTestError('Ajoutez des éléments à la formule pour lancer un test.');
      return;
    }

    const { expr, rolesMap } = buildEvaluationExpression();
    if (!expr) {
      setTestResult('');
      setTestError('Impossible de construire l\'expression à partir des éléments saisis.');
      return;
    }

    setIsEvaluating(true);
    setTestError('');
    try {
      const payload = {
        expr,
        rolesMap,
        values: buildTestValuesPayload(),
        options: { strict: false }
      };

        // Vérifier rapidement si l'expression est équilibrée en parenthèses avant d'appeler l'API
        if (!isParenthesesBalanced(expr)) {
          setTestResult('');
          setTestError('Parenthèses déséquilibrées dans l\'expression ; vérifiez la formule.');
          setIsEvaluating(false);
          return;
        }

      // 🔍 DEBUG COMPLET: Voir exactement ce qui est envoyé
      console.log('📤 [FormulaPanel] Payload complet envoyé à /evaluate/formula:', {
        expr: payload.expr,
        rolesMap: payload.rolesMap,
        rolesMapStringified: JSON.stringify(payload.rolesMap, null, 2),
        values: payload.values,
        options: payload.options,
        localTokens: localTokens,
        referencedNodeIds: referencedNodeIds
      });

      const response = await api.post('/api/treebranchleaf/evaluate/formula', payload) as { value?: number | string | null; errors?: string[] };

      const value = response?.value;
      setTestResult(value === null || value === undefined ? '' : String(value));
      const responseErrors = Array.isArray(response?.errors) ? response.errors.filter(Boolean) : [];
      setTestError(responseErrors.length ? responseErrors.join(', ') : '');

      // 💾 SAUVEGARDER le résultat calculé dans le nœud
      // Note: utilisez `nodeId` (le nœud parent), anciennement `selectedNodeId` (inexistant)
      if (value !== null && value !== undefined) {
        if (!nodeId) {
          console.warn('⚠️ FormulaPanel: nodeId indisponible, impossible de sauvegarder la valeur calculée.');
        } else {
          try {
            console.log('🧭 [FormulaPanel] Tentative sauvegarde calculatedValue -> nodeId:', nodeId, 'value:', value);
            // Avant de patcher calculatedValue, s'assurer que la formule persistée correspond
            try {
              const tokensJson = JSON.stringify(localTokens || []);
              const desiredName = (localName || '').trim() || 'Formule';
              if (activeId) {
                const inst = instances.find(i => i.id === activeId);
                const persistedTokensJson = JSON.stringify(inst?.tokens || []);
                if (persistedTokensJson !== tokensJson || (inst?.name || '') !== desiredName) {
                  console.log('🔧 [FormulaPanel] Mise à jour de la formule persistée (PUT) avant patch du calculatedValue', { nodeId, activeId });
                  await api.put(`/api/treebranchleaf/nodes/${nodeId}/formulas/${activeId}`, { tokens: localTokens, name: desiredName });
                  setInstances(prev => prev.map(p => p.id === activeId ? { ...p, tokens: localTokens, name: desiredName } : p));
                  lastSavedTokens.current = tokensJson;
                  lastSavedName.current = desiredName;
                }
              } else {
                console.log('🔧 [FormulaPanel] Création d\'une nouvelle formule (POST) avant patch du calculatedValue', { nodeId });
                const created = await api.post(`/api/treebranchleaf/nodes/${nodeId}/formulas`, { tokens: localTokens, name: desiredName, description: 'Auto-save on evaluate', isDefault: instances.length === 0, order: instances.length + 1 }) as FormulaInstance;
                if (created?.id) {
                  setActiveId(created.id);
                  setInstances(prev => [...prev, created]);
                  lastSavedTokens.current = tokensJson;
                  lastSavedName.current = desiredName;
                }
              }
            } catch (syncErr) {
              console.warn('⚠️ [FormulaPanel] Échec sync formule persistée (non bloquant):', syncErr);
            }

            // Fetch node info to determine if this is a copy of another (copiedFromNodeId)
            let targetNodeIds = [nodeId];
            try {
              const nodeInfo = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as any;
              const meta = nodeInfo?.metadata || {};
              let origId: any = meta?.copiedFromNodeId || meta?.copied_from_node_id || meta?.sourceTemplateId || null;
              if (origId && typeof origId === 'string' && origId.trim().startsWith('[')) {
                try { origId = JSON.parse(origId)[0]; } catch { /* ignore */ }
              }
              if (Array.isArray(origId) && origId.length > 0) origId = origId[0];
              if (origId && typeof origId === 'string') {
                // If this node is a copy, add the origin node to the targets to patch as well
                targetNodeIds = Array.from(new Set([...targetNodeIds, origId]));
                console.log('🔁 [FormulaPanel] Node is a copy of', origId, '— will patch origin and copy');
              }
            } catch (getInfoErr) {
              // ignore, we'll just patch the node itself
            }

            // Patch all target nodes (the node itself and origin if found)
            for (const tid of targetNodeIds) {
              try {
                // UTILISER L'ENDPOINT DÉDIÉ: POST /api/tree-nodes/:nodeId/store-calculated-value
                // (useOptimizedApi expose .post — .patch n'existe pas sur l'API optimisée)
                const resp = await api.post(`/api/tree-nodes/${tid}/store-calculated-value`, {
                  calculatedValue: String(value),
                  calculatedBy: 'formula-panel'
                }) as any;
                console.log('✅ [FormulaPanel] Valeur calculée sauvegardée via store-calculated-value:', tid, resp);
                // Invalidate local cache for GET endpoints that might be stale
                try { clearCache(); } catch (e) { /* noop */ }
              } catch (errPost) {
                console.warn('⚠️ [FormulaPanel] Échec store-calculated-value (POST). Tentative fallback PATCH…', tid, errPost);
                // Fallback: si l'implémentation d'api expose patch (ex: useAuthenticatedApi direct), on tente
                try {
                  // @ts-ignore - fallback sur un api.patch si disponible
                  if (typeof (api as any).patch === 'function') {
                    await (api as any).patch(`/api/treebranchleaf/nodes/${tid}`, {
                      calculatedValue: String(value),
                      lastCalculationDate: new Date().toISOString()
                    });
                    console.log('✅ [FormulaPanel] Fallback PATCH réussi pour node:', tid, value);
                    continue;
                  }
                  console.warn('⚠️ [FormulaPanel] Fallback PATCH non disponible sur api. Aucune sauvegarde effectuée pour node:', tid);
                } catch (errPatch) {
                  console.error('❌ [FormulaPanel] Fallback PATCH a échoué pour node:', tid, errPatch);
                }
              }
            }
            console.log('✅ [FormulaPanel] Valeur calculée sauvegardée:', value);
            // 🔄 NOTIFIER le parent pour qu'il recharge les données
            if (onChange) {
              onChange({ calculatedValue: String(value) });
            }
            // 🔄 Forcer un rechargement des composants de valeur via events (plus léger que reload)
            try {
              for (const tid of (targetNodeIds || [nodeId])) {
                // Add a unique debug id to track events across the system
                const eventDebugId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                console.log('📣 [FormulaPanel] Dispatching tbl-node-updated + tbl-force-retransform', { nodeId: tid, eventDebugId });
                window.dispatchEvent(new CustomEvent('tbl-node-updated', { detail: { node: { id: tid, calculatedValue: String(value) }, eventDebugId, source: 'formulaPanel' } }));
                window.dispatchEvent(new CustomEvent('tbl-force-retransform', { detail: { nodeId: tid, eventDebugId, source: 'formulaPanel', forceRemote: true } }));
              }
              // Fallback: invoke the global TBL refresh function if available (ensures server refetch)
              try { (window as any).TBL_FORCE_REFRESH?.(); } catch (e) { /* noop */ }
            } catch (e) { /* noop */ }
            message.success('Valeur calculée sauvegardée !', 1.2);
          } catch (saveErr) {
            console.error('❌ [FormulaPanel] Erreur lors de la sauvegarde:', saveErr);
            message.error('Erreur lors de la sauvegarde de la valeur');
          }
        }
      }
    } catch (err) {
      setTestResult('');
      let messageText = 'Erreur pendant l\'évaluation';
      if (err && typeof err === 'object') {
        const maybe = err as { response?: { data?: Record<string, unknown> }; message?: string };
        const data = maybe.response?.data;
        if (data) {
          const details = typeof data['details'] === 'string' ? data['details']
            : typeof data['error'] === 'string' ? data['error']
            : typeof data['message'] === 'string' ? data['message']
            : null;
          if (details) {
            messageText = details;
          }
        } else if (maybe.message) {
          messageText = maybe.message;
        }
      }
      setTestError(messageText);
    } finally {
      if (mountedRef.current) {
        setIsEvaluating(false);
      }
    }
  }, [localTokens, buildEvaluationExpression, api, buildTestValuesPayload]);

  // Chargement des nœuds pour le cache
  const loadNode = useCallback(async (id: string) => {
    if (!id || nodeCache[id]) return;
    try {
      const data = await api.get(`/api/treebranchleaf/nodes/${id}`) as { label?: string; type?: string } | null;
      if (!data) return;
      setNodeCache(prev => ({ ...prev, [id]: { label: data.label || id, type: data.type || 'leaf_field' } }));
    } catch {
      // noop
    }
  }, [api, nodeCache]);

  // Charger les nœuds référencés
  useEffect(() => {
    referencedNodeIds.forEach(loadNode);
  }, [referencedNodeIds, loadNode]);

  // Debug final avant rendu
  // console.log(...) // ✨ Log réduit

  // {
    // activeId,
    // localName,

  // }

  return (
    <Card size="small" variant="outlined">
      <Title level={5}>🧮 Formule</Title>
      
      {/* DEBUG INFO */}
      <div style={{ marginBottom: 8, padding: 4, background: '#f0f0f0', fontSize: '11px', borderRadius: 4 }}>
        <Text type="secondary">
          Debug: activeId={activeId || 'null'} | instances={instances.length}
        </Text>
      </div>
      
      {/* Multi-instances: sélection + actions */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <Text type="secondary">Instance:</Text>
        <Select
          size="small"
          style={{ minWidth: 220 }}
          value={activeId || undefined}
          options={instances.map(it => ({ 
            value: it.id, 
            label: `${it.name || 'Sans nom'} (${(it.tokens || []).length} éléments)` 
          }))}
          onChange={(id) => {
            // console.log('🔄 FormulaPanel: Changement d\'instance:', { newId: id, availableInstances: instances.length }); // ✨ Log réduit
            setActiveId(id);
            const it = instances.find(x => x.id === id);
            if (it) { 
              setLocalTokens(it.tokens || []); 
              setLocalName(it.name || '');
              lastSavedTokens.current = JSON.stringify(it.tokens || []);
              lastSavedName.current = it.name || '';
              // console.log('✅ FormulaPanel: Instance sélectionnée:', { name: it.name, tokensCount: (it.tokens || []).length }); // ✨ Log réduit
            }
          }}
          placeholder={instances.length === 0 ? "Aucune formule disponible" : "Sélectionner une instance"}
          notFoundContent="Aucune formule trouvée"
          allowClear={false}
        />
        
        <Button size="small" onClick={async () => {
          try {
            // ✅ UNIQUEMENT TABLE: Créer une nouvelle formule
            const created = await api.post(`/api/treebranchleaf/nodes/${nodeId}/formulas`, {
              name: 'Nouvelle formule',
              tokens: [],
              description: 'Nouvelle formule',
              isDefault: instances.length === 0,
              order: instances.length + 1
,
            }) as FormulaInstance;
            
            // Mettre à jour les instances locales
            const next = [...instances, created];
            setInstances(next);
            setActiveId(created.id);
            setLocalTokens([]);
            setLocalName(created.name || '');
            lastSavedTokens.current = '[]';
            lastSavedName.current = created.name || '';
            
            message.success('Nouvelle formule créée');
          } catch (err) {
            console.error('Erreur création formule:', err);
            message.error('Impossible de créer une nouvelle formule');
          }
        }}>Ajouter</Button>
        
        <Button 
          size="small" 
          danger 
          onClick={deleteFormula} 
          disabled={!activeId || isDeleting}
          loading={isDeleting}
        >
          Supprimer
        </Button>
      </div>
      
      {/* Nom */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <Text type="secondary">Nom:</Text>
        <Input
          size="small"
          style={{ maxWidth: 280 }}
          placeholder="Nom de la formule"
          value={localName}
          onChange={(e) => handleNameChange(e.target.value)}
        />
      </div>
      
      {/* Résumé test */}
      <div style={{ marginBottom: 8, padding: '6px 8px', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6 }}>
        <Text strong style={{ marginRight: 8 }}>Résumé test:</Text>
        <Space wrap size={6}>
          <Text type="secondary">Éléments ({localTokens?.length || 0}):</Text>
          {localTokens.map((t, index) => (
            <TokenChip key={`${t}-${index}`} token={t} />
          ))}
        </Space>
        
        {/* Zone de test intégrée */}
        <div style={{ marginTop: 8 }}>
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            <Space wrap>
              {referencedNodeIds.map(id => (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TokenChip token={id.startsWith('node-formula:') ? id : `@value.${id}`} />
                  <Input
                    size="small"
                    placeholder="Valeur de test"
                    style={{ width: 180 }}
                    value={testValues[id] || ''}
                    onChange={(e) => setTestValues(prev => ({ ...prev, [id]: e.target.value }))}
                  />
                </div>
              ))}
            </Space>
            
            <Button size="small" type="primary" onClick={handleEvaluate} loading={isEvaluating}>
              Évaluer
            </Button>
            
            {testError ? (
              <Text type="danger">Erreur: {testError}</Text>
            ) : (
              <Text>Résultat: {testResult || '(vide)'}</Text>
            )}
          </Space>
        </div>
      </div>
      
      {/* Construction de la formule */}
      <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
        Construisez votre formule étape par étape: sélectionnez un champ, ajoutez un opérateur, puis un autre champ, etc.
      </Text>
      
      <div style={{ marginBottom: 8 }}>
        <Space wrap size={6}>
          <Tooltip title="Addition"><Button size="small" onClick={() => appendToken('+')}>+</Button></Tooltip>
          <Tooltip title="Soustraction"><Button size="small" onClick={() => appendToken('-')}>-</Button></Tooltip>
          <Tooltip title="Multiplication"><Button size="small" onClick={() => appendToken('*')}>*</Button></Tooltip>
          <Tooltip title="Division"><Button size="small" onClick={() => appendToken('/')}>/</Button></Tooltip>
          <Tooltip title="Parenthèse ouvrante"><Button size="small" onClick={() => appendToken('(')}>(</Button></Tooltip>
          <Tooltip title="Parenthèse fermante"><Button size="small" onClick={() => appendToken(')')}>)</Button></Tooltip>
          <Tooltip title="Concaténation de texte"><Button size="small" onClick={() => appendToken('CONCAT')}>CONCAT</Button></Tooltip>
          <Divider type="vertical" />
          <Tooltip title="Ajouter un nombre"><Button size="small" onClick={() => { setNumberInput(''); setShowNumberModal(true); }}>Nombre…</Button></Tooltip>
          <Tooltip title="Ajouter un texte"><Button size="small" onClick={() => { setTextInput(''); setShowTextModal(true); }}>Texte…</Button></Tooltip>
          <Divider type="vertical" />
          <Tooltip title="Supprimer le dernier élément"><Button size="small" danger disabled={!localTokens?.length} onClick={removeLast}>⟲ Annuler dernier</Button></Tooltip>
          <Tooltip title="Vider la formule"><Button size="small" danger disabled={!localTokens?.length} onClick={clearAll}>🗑️ Vider</Button></Tooltip>
        </Space>
      </div>

      <div style={{ marginBottom: 8 }}>
        <Text type="secondary" style={{ marginRight: 8 }}>Fonctions de calcul :</Text>
        <Space wrap size={6}>
          {mathFunctionButtons.map(btn => (
            <Tooltip key={btn.key} title={btn.tooltip}>
              <Button size="small" onClick={() => appendToken(btn.token)}>{btn.label}</Button>
            </Tooltip>
          ))}
        </Space>
      </div>
      
      <Space style={{ marginBottom: 8 }}>
        <Button size="small" onClick={() => setPickRef(true)} disabled={readOnly}>
          Sélectionner…
        </Button>
      </Space>

      {/* Modals */}
      <Modal
        title="Ajouter un nombre"
        open={showNumberModal}
        onCancel={() => setShowNumberModal(false)}
        onOk={() => {
          const v = numberInput.trim();
          if (!v) return setShowNumberModal(false);
          if (!/^[-+]?[0-9]*\.?[0-9]+$/.test(v)) {
            message.error('Entrez un nombre valide');
            return;
          }
          appendToken(v);
          setShowNumberModal(false);
        }}
        okText="Ajouter"
      >
        <Input
          placeholder="Ex: 10, 3.14"
          value={numberInput}
          onChange={(e) => setNumberInput(e.target.value)}
          inputMode="decimal"
        />
      </Modal>

      <Modal
        title="Ajouter un texte"
        open={showTextModal}
        onCancel={() => setShowTextModal(false)}
        onOk={() => {
          const v = textInput;
          const quoted = '"' + v.replace(/"/g, '\\"') + '"';
          appendToken(quoted);
          setShowTextModal(false);
        }}
        okText="Ajouter"
      >
        <Input
          placeholder="Ex: TVA"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
        />
      </Modal>

      <TokenDropZone
        nodeId={nodeId}
        capability="formula"
        label="Références utilisées"
        placeholder={placeholder}
        value={localTokens}
        onChange={handleTokensChange}
        readOnly={readOnly}
      />
      
      <Text type="secondary" style={{ fontSize: 12 }}>
        ✅ Stockage uniquement dans TreeBranchLeafNodeFormula - Sauvegarde automatique activée.
      </Text>
      
      <NodeTreeSelector 
        nodeId={nodeId} 
        open={pickRef} 
        onClose={() => setPickRef(false)} 
        onSelect={onSelectRef} 
      />

      <Modal
        title="Supprimer la formule ?"
        open={showDeleteModal}
        onOk={confirmDelete}
        onCancel={cancelDelete}
        okText="Supprimer"
        cancelText="Annuler"
        okButtonProps={{ danger: true, loading: isDeleting }}
        cancelButtonProps={{ disabled: isDeleting }}
      >
        <Text>Cette action supprime définitivement la formule de la table TreeBranchLeafNodeFormula.</Text>
        <br />
        <Text type="secondary">Cette action est irréversible.</Text>
      </Modal>
    </Card>
  );
};

export default FormulaPanel;
