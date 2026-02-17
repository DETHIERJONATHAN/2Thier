import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Card, Typography, message, Space, Button, Tooltip, Modal, Input, Divider, Select } from 'antd';
import TokenDropZone from '../shared/TokenDropZone';
import TokenChip from '../shared/TokenChip';
import { useOptimizedApi } from '../hooks/useOptimizedApi';
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

const FormulaPanel: React.FC<FormulaPanelProps> = ({ treeId, nodeId, onChange, readOnly }) => {
  // API optimisée pour éviter les conflits
  const { api } = useOptimizedApi();
  
  // Refs pour cleanup et stabilité
  const mountedRef = useRef<boolean>(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitializing = useRef<boolean>(false);
  const lastSavedTokens = useRef<string>('');
  const lastSavedName = useRef<string>('');
  
  // État local stable
  const [localTokens, setLocalTokens] = useState<string[]>([]);
  const [localName, setLocalName] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
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
    return () => {
      mountedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Chargement initial UNE SEULE FOIS depuis la table TreeBranchLeafNodeFormula
  useEffect(() => {
    if (isInitializing.current || isLoaded) return;
    
    isInitializing.current = true;
    let mounted = true;

    (async () => {
      try {
        // ✅ NOUVEAU: Charger depuis la table TreeBranchLeafNodeFormula
        const formulas = await api.get(`/api/treebranchleaf/nodes/${nodeId}/formulas`) as FormulaInstance[];
        
        if (formulas && formulas.length > 0) {
          if (!mounted) return;
          
          const first = formulas[0];
          setInstances(formulas);
          setActiveId(first.id);
          setLocalTokens(first.tokens || []);
          setLocalName(first.name || '');
          
          // Sauvegarder la référence pour éviter les re-saves inutiles
          lastSavedTokens.current = JSON.stringify(first.tokens || []);
          lastSavedName.current = first.name || '';
        } else {
          // Aucune formule dans la table - créer une formule par défaut
          const defaultFormula = {
            name: 'Formule 1',
            tokens: [],
            description: 'Nouvelle formule',
            isDefault: true,
            order: 1
,
          };
          
          const created = await api.post(`/api/treebranchleaf/nodes/${nodeId}/formulas`, defaultFormula) as FormulaInstance;
          
          if (!mounted) return;
          
          setInstances([created]);
          setActiveId(created.id);
          setLocalTokens(created.tokens || []);
          setLocalName(created.name || '');
          
          // Sauvegarder la référence
          lastSavedTokens.current = JSON.stringify(created.tokens || []);
          lastSavedName.current = created.name || '';
        }
        
        if (mounted) {
          setIsLoaded(true);
        }
      } catch (err) {
        console.error('Erreur chargement formule:', err);
        if (mounted) {
          setIsLoaded(true);
        }
      } finally {
        isInitializing.current = false;
      }
    })();

    return () => { 
      mounted = false; 
    };
  }, [api, nodeId, treeId, isLoaded]); // Dépendances fixes

  // Fonction de sauvegarde ULTRA-OPTIMISÉE avec protection complète contre les boucles
  const saveFormula = useCallback(async (nextTokens: string[], nextName: string) => {
    // Vérifications de sécurité
    if (!mountedRef.current || isSaving || !isLoaded) return;

    // 🛡️ Détection de références circulaires côté frontend
    const circularToken = nextTokens.find(t => 
      t === `@calculated.${nodeId}` || t === `@value.${nodeId}`
    );
    if (circularToken) {
      message.error('⚠️ Référence circulaire détectée : cette formule ne peut pas utiliser sa propre valeur calculée');
      return;
    }
    
    // Éviter les sauvegardes identiques
    const tokensStr = JSON.stringify(nextTokens);
    if (tokensStr === lastSavedTokens.current && nextName === lastSavedName.current) {
      return;
    }

    // console.log('💾 FormulaPanel: Sauvegarde demandée', { tokens: nextTokens, name: nextName }); // ✨ Log réduit
    
    // Debounce pour éviter les appels trop fréquents
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (!mountedRef.current || isSaving) return;
      
      setIsSaving(true);
      try {
        // Sauvegarde backend dans la table TreeBranchLeafNodeFormula
        if (activeId) {
          // Mettre à jour une formule existante
          await api.put(`/api/treebranchleaf/nodes/${nodeId}/formulas/${activeId}`, { 
            tokens: nextTokens, 
            name: nextName 
          });
        } else {
          // Créer une nouvelle formule
          const newFormula = await api.post(`/api/treebranchleaf/nodes/${nodeId}/formulas`, { 
            tokens: nextTokens, 
            name: nextName 
          });
          if (newFormula.id) {
            setActiveId(newFormula.id);
            setInstances(prev => [...prev, { id: newFormula.id, name: nextName, tokens: nextTokens }]);
          }
        }

        // Mettre à jour metadata si nécessaire (pour compatibilité)
        if (treeId && activeId) {
          try {
            const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { metadata?: Record<string, unknown> };
            const md = node?.metadata || {};
            const list: FormulaInstance[] = md?.capabilities?.formulas || instances;
            const updated = list.map((it: FormulaInstance) => 
              it.id === activeId ? { ...it, tokens: nextTokens, name: nextName } : it
            );
            const nextMd = { ...md, capabilities: { ...(md.capabilities || {}), formulas: updated } };
            await api.put(`/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`, { metadata: nextMd });
            
            setInstances(updated);
          } catch (err) {
            // console.warn('⚠️ Erreur mise à jour metadata', err); // ✨ Log réduit
          }
        }

        // Mettre à jour les références pour éviter les re-saves
        lastSavedTokens.current = tokensStr;
        lastSavedName.current = nextName;

        // Notifier le parent SEULEMENT si on a vraiment changé quelque chose
        if (mountedRef.current) {
          onChange?.({ tokens: nextTokens, name: nextName });
        }
        
        // console.log('✅ FormulaPanel: Sauvegarde réussie'); // ✨ Log réduit,
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
    }, 500); // Debounce de 500ms
  }, [api, nodeId, treeId, activeId, instances, onChange, isSaving, isLoaded]);

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

  // 🎯 Accumulateur pour multi-sélection (évite le problème de closure stale)
  const pendingRefsRef = React.useRef<string[]>([]);
  const flushTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const localTokensRef = React.useRef(localTokens);
  localTokensRef.current = localTokens;

  // Gestion sélection via sélecteur (supporte multi-sélection)
  const onSelectRef = useCallback((val: NodeTreeSelectorValue) => {
    pendingRefsRef.current.push(val.ref);
    // Flush en micro-tâche : tous les onSelect du même handleOk sont regroupés
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      const batch = pendingRefsRef.current.splice(0);
      if (batch.length > 0) {
        handleTokensChange([...localTokensRef.current, ...batch]);
      }
      flushTimerRef.current = null;
    }, 0);
  }, [handleTokensChange]);

  // Actions sur les tokens
  const appendToken = useCallback((t: string) => {
    handleTokensChange([...localTokens, t]);
  }, [localTokens, handleTokensChange]);

  const mathFunctionButtons = useMemo(() => ([
    // ARRONDIS
    { key: 'round', label: 'ARRONDI', token: 'ARRONDI(', tooltip: 'ARRONDI(nombre; decimales) - Arrondit au nombre de decimales specifie' },
    { key: 'roundup', label: 'ARRONDI.SUP', token: 'ARRONDI.SUP(', tooltip: 'ARRONDI.SUP(nombre; decimales) - Arrondit vers le haut' },
    { key: 'rounddown', label: 'ARRONDI.INF', token: 'ARRONDI.INF(', tooltip: 'ARRONDI.INF(nombre; decimales) - Arrondit vers le bas' },
    { key: 'int', label: 'ENT', token: 'ENT(', tooltip: 'ENT(nombre) - Partie entiere (arrondi vers le bas)' },
    { key: 'trunc', label: 'TRONQUE', token: 'TRONQUE(', tooltip: 'TRONQUE(nombre; decimales) - Tronque les decimales' },
    { key: 'ceiling', label: 'PLAFOND', token: 'PLAFOND(', tooltip: 'PLAFOND(nombre; multiple) - Arrondit au multiple superieur' },
    { key: 'floor', label: 'PLANCHER', token: 'PLANCHER(', tooltip: 'PLANCHER(nombre; multiple) - Arrondit au multiple inferieur' },
    // TRIGONOMETRIE
    { key: 'radians', label: 'RADIANS', token: 'RADIANS(', tooltip: 'RADIANS(degres) - Convertit des degres en radians' },
    { key: 'degrees', label: 'DEGRES', token: 'DEGRES(', tooltip: 'DEGRES(radians) - Convertit des radians en degres' },
    { key: 'sin', label: 'SIN', token: 'SIN(', tooltip: 'SIN(angle) - Sinus (angle en radians)' },
    { key: 'cos', label: 'COS', token: 'COS(', tooltip: 'COS(angle) - Cosinus (angle en radians)' },
    { key: 'tan', label: 'TAN', token: 'TAN(', tooltip: 'TAN(angle) - Tangente (angle en radians)' },
    { key: 'asin', label: 'ASIN', token: 'ASIN(', tooltip: 'ASIN(valeur) - Arc sinus (resultat en radians)' },
    { key: 'acos', label: 'ACOS', token: 'ACOS(', tooltip: 'ACOS(valeur) - Arc cosinus (resultat en radians)' },
    { key: 'atan', label: 'ATAN', token: 'ATAN(', tooltip: 'ATAN(valeur) - Arc tangente (resultat en radians)' },
    { key: 'atan2', label: 'ATAN2', token: 'ATAN2(', tooltip: 'ATAN2(x; y) - Arc tangente de y/x' },
    // MATHEMATIQUES
    { key: 'sqrt', label: 'RACINE', token: 'RACINE(', tooltip: 'RACINE(nombre) - Racine carree' },
    { key: 'power', label: 'PUISSANCE', token: 'PUISSANCE(', tooltip: 'PUISSANCE(base; exposant) - Eleve a la puissance' },
    { key: 'exp', label: 'EXP', token: 'EXP(', tooltip: 'EXP(nombre) - Exponentielle (e^n)' },
    { key: 'ln', label: 'LN', token: 'LN(', tooltip: 'LN(nombre) - Logarithme naturel' },
    { key: 'log', label: 'LOG', token: 'LOG(', tooltip: 'LOG(nombre; base) - Logarithme en base specifiee' },
    { key: 'log10', label: 'LOG10', token: 'LOG10(', tooltip: 'LOG10(nombre) - Logarithme en base 10' },
    { key: 'abs', label: 'ABS', token: 'ABS(', tooltip: 'ABS(nombre) - Valeur absolue' },
    { key: 'sign', label: 'SIGNE', token: 'SIGNE(', tooltip: 'SIGNE(nombre) - Renvoie 1, 0 ou -1 selon le signe' },
    { key: 'mod', label: 'MOD', token: 'MOD(', tooltip: 'MOD(nombre; diviseur) - Reste de la division (modulo)' },
    { key: 'pi', label: 'PI()', token: 'PI()', tooltip: 'PI() - Constante pi (3.14159...)' },
    // STATISTIQUES
    { key: 'min', label: 'MIN', token: 'MIN(', tooltip: 'MIN(val1; val2; ...) - Plus petite valeur' },
    { key: 'max', label: 'MAX', token: 'MAX(', tooltip: 'MAX(val1; val2; ...) - Plus grande valeur' },
    { key: 'moyenne', label: 'MOYENNE', token: 'MOYENNE(', tooltip: 'MOYENNE(val1; val2; ...) - Moyenne arithmetique' },
    { key: 'somme', label: 'SOMME', token: 'SOMME(', tooltip: 'SOMME(val1; val2; ...) - Somme des valeurs' },
    { key: 'sumproduct', label: 'SOMMEPROD', token: 'SOMMEPROD(', tooltip: 'SOMMEPROD(plage1; plage2) - Somme des produits' },
    { key: 'count', label: 'NB', token: 'NB(', tooltip: 'NB(val1; val2; ...) - Compte les nombres' },
    // LOGIQUE & CONDITIONS
    { key: 'sierreur', label: 'SIERREUR', token: 'SIERREUR(', tooltip: 'SIERREUR(valeur; secours) - Retourne secours si erreur' },
    { key: 'si', label: 'SI', token: 'SI(', tooltip: 'SI(condition; si_vrai; si_faux) - Condition' },
    { key: 'et', label: 'ET', token: 'ET(', tooltip: 'ET(cond1; cond2; ...) - VRAI si toutes conditions vraies' },
    { key: 'ou', label: 'OU', token: 'OU(', tooltip: 'OU(cond1; cond2; ...) - VRAI si au moins une condition vraie' },
    { key: 'non', label: 'NON', token: 'NON(', tooltip: 'NON(valeur) - Inverse la valeur logique' },
    // UTILITAIRES
    { key: 'row', label: 'ROW', token: 'ROW(', tooltip: 'ROW(plage) - Numero de ligne' },
    { key: 'indirect', label: 'INDIRECT', token: 'INDIRECT(', tooltip: 'INDIRECT(texte) - Reference a partir d un texte' },
  ]), []);

  const removeLast = useCallback(() => {
    if (!localTokens?.length) return;
    handleTokensChange(localTokens.slice(0, -1));
  }, [localTokens, handleTokensChange]);

  const clearAll = useCallback(() => {
    handleTokensChange([]);
  }, [handleTokensChange]);

  // Supprimer une formule avec modal contrôlé - VERSION MODERNE
  const deleteFormula = useCallback(() => {
    // console.log(...) // ✨ Log réduit

    // {
      // activeId,

      // nodeId,
      // isDeleting

    // }

    // Protection contre les clics multiples
    if (!activeId || isDeleting) {
      // console.log('🗑️ NOUVELLE VERSION: Arrêt - pas d\'activeId ou déjà en cours de suppression', { activeId, isDeleting }); // ✨ Log réduit
      return;
    }
    
    // console.log('🗑️ NOUVELLE VERSION: Ouverture du modal de confirmation contrôlé...'); // ✨ Log réduit
    setFormulaToDelete(activeId);
    setShowDeleteModal(true);
  }, [activeId, instances, nodeId, isDeleting]);

  // Confirmation de suppression
  const confirmDelete = useCallback(async () => {
    if (!formulaToDelete) return;

    // console.log('🗑️ FormulaPanel: Suppression confirmée, appel API...'); // ✨ Log réduit
    setIsDeleting(true);
    setShowDeleteModal(false);
    
    try {
      // ✅ NOUVEAU: Supprimer de la table TreeBranchLeafNodeFormula
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
      message.success('Formule supprimée de la table');
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
    // Nettoyer les accolades si présentes
    let cleanRef = ref;
    if (cleanRef.startsWith('{{') && cleanRef.endsWith('}}')) {
      cleanRef = cleanRef.slice(2, -2);
    }
    if (cleanRef.startsWith('@value.')) return cleanRef.slice('@value.'.length);
    if (cleanRef.startsWith('@select.')) return cleanRef.slice('@select.'.length).split('.')[0];
    // 🆕 Support pour @calculated.{nodeId}[-suffix]
    if (cleanRef.startsWith('@calculated.')) {
      const afterPrefix = cleanRef.slice('@calculated.'.length);
      const match = afterPrefix.match(/^([a-f0-9-]{36})/i);
      return match ? match[1] : afterPrefix.split('-')[0];
    }
    // 🚫 Les tokens @table.{tableId} NE SONT PAS des nœuds TBL
    // Ils sont des références à des TreeBranchLeafNodeTable (tables matricielles)
    // On retourne undefined pour qu'ils ne soient pas inclus dans referencedNodeIds
    // Le TokenChip les gère via 'tableRef' → /api/treebranchleaf/reusables/tables
    if (cleanRef.startsWith('@table.')) {
      return undefined;
    }
    const formulaAlias = extractFormulaAlias(cleanRef);
    if (formulaAlias) return formulaAlias;
    return undefined;
  }, []);

  const referencedNodeIds = useMemo(() => {
    return Array.from(new Set(localTokens.map(extractNodeIdFromRef).filter(Boolean))) as string[];
  }, [localTokens, extractNodeIdFromRef]);

  // 🆕 Extraire les IDs des tables matricielles séparément
  // Ces IDs ne sont pas des nœuds TBL mais des TreeBranchLeafNodeTable
  const referencedTableIds = useMemo(() => {
    return Array.from(new Set(
      localTokens
        .filter(t => typeof t === 'string' && t.startsWith('@table.'))
        .map(t => (t as string).slice('@table.'.length))
        .filter(Boolean)
    )) as string[];
  }, [localTokens]);

  const buildEvaluationExpression = useCallback(() => {
    const rolesMap: Record<string, string> = {};
    const parts: string[] = [];
    const formulaRoleCache = new Map<string, string>();

    const getFormulaRole = (alias: string) => {
      if (formulaRoleCache.has(alias)) {
        return formulaRoleCache.get(alias) as string;
      }
      const sanitized = alias.replace(/[^A-Za-z0-9]/g, '_');
      const role = `formula_${sanitized}`;
      formulaRoleCache.set(alias, role);
      return role;
    };

    for (const rawToken of localTokens) {
      if (!rawToken || typeof rawToken !== 'string') continue;
      if (rawToken === 'CONCAT') {
        parts.push('&');
        continue;
      }

      const formulaAlias = extractFormulaAlias(rawToken);
      if (formulaAlias) {
        const roleKey = getFormulaRole(formulaAlias);
        rolesMap[roleKey] = formulaAlias;
        parts.push(`{{${roleKey}}}`);
        continue;
      }

      if (rawToken.startsWith('@value.')) {
        const nodeId = rawToken.slice('@value.'.length);
        if (!nodeId) continue;
        rolesMap[nodeId] = nodeId;
        parts.push(`{{${nodeId}}}`);
        continue;
      }

      if (rawToken.startsWith('@select.')) {
        const nodeId = rawToken.slice('@select.'.length).split('.')[0];
        if (!nodeId) continue;
        rolesMap[nodeId] = nodeId;
        parts.push(`{{${nodeId}}}`);
        continue;
      }

      // 🆕 Traiter les références @calculated.{nodeId}[-suffix]
      if (rawToken.startsWith('@calculated.')) {
        const afterPrefix = rawToken.slice('@calculated.'.length);
        const match = afterPrefix.match(/^([a-f0-9-]{36})/i);
        const roleKey = match ? `calculated_${match[1]}` : `calculated_${afterPrefix.replace(/[^A-Za-z0-9]/g, '_')}`;
        rolesMap[roleKey] = rawToken;
        parts.push(`{{${roleKey}}}`);
        console.log(`🔧 [CALCULATED] Token: "${rawToken}" → roleKey: "${roleKey}"`);
        continue;
      }

      // 🆕 Traiter les références @table.{nodeId} (valeurs de tables matricielles)
      if (rawToken.startsWith('@table.')) {
        const nodeId = rawToken.slice('@table.'.length);
        if (nodeId) {
          const roleKey = `table_${nodeId.replace(/[^A-Za-z0-9]/g, '_')}`;
          rolesMap[roleKey] = rawToken;
          parts.push(`{{${roleKey}}}`);
          console.log(`🔧 [TABLE] Token: "${rawToken}" → roleKey: "${roleKey}"`);
        }
        continue;
      }

      parts.push(rawToken);
    }

    const expr = parts.join(' ').replace(/\s+/g, ' ').trim();
    return { expr, rolesMap };
  }, [localTokens]);

  const buildTestValuesPayload = useCallback(() => {
    const payload: Record<string, number | string> = {};
    
    // D'abord, construire le rolesMap pour savoir quelles clés @xxx sont utilisées
    const { rolesMap } = buildEvaluationExpression();
    
    referencedNodeIds.forEach((nodeId) => {
      const raw = testValues[nodeId];
      if (raw === undefined || raw === null || raw === '') {
        return;
      }
      const normalized = raw.replace(',', '.');
      const numeric = Number(normalized);
      const value = Number.isFinite(numeric) ? numeric : raw;
      
      // Ajouter avec la clé nodeId standard
      payload[nodeId] = value;
      
      // 🆕 Ajouter aussi avec les clés calculated_xxx et table_xxx
      payload[`calculated_${nodeId}`] = value;
      payload[`table_${nodeId.replace(/[^A-Za-z0-9]/g, '_')}`] = value;
      
      // 🆕 CRITIQUE: Ajouter aussi avec le token @calculated.xxx complet
      // Car resolveVariable reçoit la VALEUR du rolesMap, pas la clé
      const calculatedKey = `calculated_${nodeId}`;
      if (rolesMap[calculatedKey]) {
        payload[rolesMap[calculatedKey]] = value;
      }
    });
    
    // 🆕 Inclure aussi les valeurs des tables matricielles
    referencedTableIds.forEach((tableId) => {
      const raw = testValues[tableId];
      if (raw === undefined || raw === null || raw === '') {
        return;
      }
      const normalized = raw.replace(',', '.');
      const numeric = Number(normalized);
      const value = Number.isFinite(numeric) ? numeric : raw;
      
      // Ajouter avec la clé table_xxx (format utilisé par buildEvaluationExpression)
      const tableKey = `table_${tableId.replace(/[^A-Za-z0-9]/g, '_')}`;
      payload[tableKey] = value;
      
      // 🆕 CRITIQUE: Ajouter aussi avec le token @table.xxx complet
      // Car resolveVariable reçoit la VALEUR du rolesMap, pas la clé
      payload[`@table.${tableId}`] = value;
      if (rolesMap[tableKey]) {
        payload[rolesMap[tableKey]] = value;
      }
    });
    
    return payload;
  }, [referencedNodeIds, referencedTableIds, testValues, buildEvaluationExpression]);

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
      const response = await api.post('/api/treebranchleaf/evaluate/formula', {
        expr,
        rolesMap,
        values: buildTestValuesPayload(),
        options: { strict: false }
      }) as { value?: number | string | null; errors?: string[] };

      const value = response?.value;
      setTestResult(value === null || value === undefined ? '' : String(value));
      const responseErrors = Array.isArray(response?.errors) ? response.errors.filter(Boolean) : [];
      setTestError(responseErrors.length ? responseErrors.join(', ') : '');
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

  // Ne pas afficher tant que pas chargé
  if (!isLoaded) {
    return (
      <Card size="small" variant="outlined">
        <Title level={5}>🧮 Formule</Title>
        <Text type="secondary">Chargement...</Text>
      </Card>
    );
  }

  return (
    <Card size="small" variant="outlined">
      <Title level={5}>🧮 Formule</Title>
      
      {/* Multi-instances: sélection + actions */}
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
              setLocalTokens(it.tokens || []); 
              setLocalName(it.name || '');
              lastSavedTokens.current = JSON.stringify(it.tokens || []);
              lastSavedName.current = it.name || '';
            }
          }}
          placeholder="Sélectionner une instance"
        />
        
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
              {/* 🆕 Champs de test pour les tables matricielles */}
              {referencedTableIds.map(tableId => (
                <div key={`table-${tableId}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TokenChip token={`@table.${tableId}`} />
                  <Input
                    size="small"
                    placeholder="Valeur de test"
                    style={{ width: 180 }}
                    value={testValues[tableId] || ''}
                    onChange={(e) => setTestValues(prev => ({ ...prev, [tableId]: e.target.value }))}
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
        La formule (nom et éléments) est sauvegardée automatiquement.
      </Text>
      
      <NodeTreeSelector 
        nodeId={nodeId} 
        open={pickRef} 
        onClose={() => setPickRef(false)} 
        onSelect={onSelectRef}
        allowMulti
      />

      {/* Modal de confirmation de suppression */}
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
        <Text>Cette action supprime définitivement la formule de la table.</Text>
        <br />
        <Text type="secondary">Cette action est irréversible.</Text>
      </Modal>
    </Card>
  );
};

export default FormulaPanel;
