/**
 * 🔗 useTBLTableLookup
 * 
 * Hook qui charge les options d'un champ SELECT depuis un tableau lookup configuré
 * via TablePanel (meta.lookup).
 * 
 * Flux:
 * 1. Le champ a une configuration dans TreeBranchLeafSelectConfig (optionsSource: 'table')
 * 2. On récupère le tableau référencé (tableReference -> TreeBranchLeafNodeTable)
 * 3. On génère les options depuis les colonnes/lignes du tableau
 * 4. On retourne les options formatées pour le SELECT
 * 
 * 🚀 OPTIMISATION BATCHING:
 * - Utilise le TBLBatchContext pour récupérer la config SELECT
 * - Évite les appels API individuels /select-config et /trees/:id/nodes
 */

import { useState, useEffect, useContext, useMemo, useRef, useCallback } from 'react';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';
import { tblLog, tblWarn, isTBLDebugEnabled } from '../../../../../utils/tblDebug';
import { useTBLBatch } from '../contexts/TBLBatchContext';
import { canFieldBeSelect } from '../../../../../lib/fieldDuplicationPolicy';

// 🚀 PERF: Cache global pour les SelectConfig
const selectConfigCache = new Map<string, TreeBranchLeafSelectConfig>();
// 🚀 PERF: Compteur de génération : incrémenté à chaque clear() pour invalider les lastSentLookupKeyRef
let lookupCacheGeneration = 0;
// 🚀 PERF: Cache résultat lookup par (fieldId + formValuesHash) pour éviter appels réseau redondants
type LookupCacheEntry = {
  options: TableLookupOption[];
  tableData?: { columns: string[]; rows: string[]; data: unknown[][]; type: 'columns' | 'matrix' };
  config?: TreeBranchLeafSelectConfig;
};
const lookupResultCache = new Map<string, LookupCacheEntry>();

export interface TableLookupOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface TableLookupResult {
  options: TableLookupOption[];
  loading: boolean;
  error: string | null;
  // 🔥 NOUVEAU: Données complètes du tableau pour filtrage conditionnel
  tableData?: {
    columns: string[];
    rows: string[];
    data: unknown[][];
    type: 'columns' | 'matrix';
  };
  config?: TreeBranchLeafSelectConfig;
  // 🔥 FIX 23/02/2026: Forcer un re-fetch immédiat (appelé à l'ouverture du dropdown)
  refresh: () => void;
}

export interface TreeBranchLeafSelectConfig {
  id: string;
  nodeId: string;
  optionsSource: 'table' | 'static' | 'api';
  tableReference?: string; // ID du TreeBranchLeafNodeTable
  keyColumn?: string;
  keyRow?: string; // ✅ NOUVEAU: Pour extraire depuis une ligne
  valueColumn?: string;
  valueRow?: string; // ✅ NOUVEAU: Pour valeur depuis ligne
  displayColumn?: string;
  displayRow?: string; // ✅ NOUVEAU: Pour affichage depuis ligne
  dependsOnNodeId?: string;
}

interface NormalizedTableInstance {
  id: string;
  nodeId: string;
  name: string;
  type: 'columns' | 'matrix';
  columns: string[];
  rows: string[];
  data: unknown[][];
  meta: {
    lookup?: {
      enabled: boolean;
      mode: 'columns' | 'matrix';
      keyColumn?: string;
      valueColumn?: string;
      displayColumn?: string;
    };
  };
}

type TableLookupApiResponse = {
  options?: Array<{
    value?: unknown;
    label?: unknown;
    disabled?: unknown;
  }> | null;
};

type TableLookupPayload = NormalizedTableInstance | TableLookupApiResponse | null | undefined;

/**
 * 🎯 Hook principal
 */
export function useTBLTableLookup(
  fieldId: string | undefined,
  nodeId: string | undefined,
  enabled: boolean = true, // ✅ NOUVEAU: Paramètre pour activer/désactiver le lookup
  formData?: Record<string, any> // 🆕 ÉTAPE 2.5: Valeurs du formulaire pour filtrage dynamique
): TableLookupResult {
  const apiHook = useAuthenticatedApi();
  // 🔥 FIX: Stabiliser l'instance API pour éviter les boucles de rendu infinies
  // Conformément aux conventions du projet (.github/copilot-instructions.md)
  const api = useMemo(() => apiHook.api, []);
  
  // 🚀 BATCHING: Utiliser le contexte batch pour les configs
  const batchContext = useTBLBatch();
  
  // 🔥 FIX 04/02/2026: Stocker les valeurs calculées FRAÎCHES du broadcast
  // Le lookup doit attendre que create-and-evaluate soit terminé avant de filtrer
  // car formData contient des valeurs STALES (ex: "Puissance WC Total" = 0 au lieu de 9100)
  // 🛡️ FIX 20/02/2026: Initialiser depuis TBL_FORM_DATA au lieu de {} vide
  // Quand un hook monte APRÈS qu'un broadcast ait été émis (ex: "Puissance WC Total"
  // calculé quand N° panneau change, avant que le champ Onduleur soit rendu/monté),
  // le hook ratait les valeurs calculées → les filtres du lookup n'étaient pas appliqués
  // → le dropdown montrait TOUTES les options au lieu des options filtrées.
  // En initialisant depuis TBL_FORM_DATA, on récupère les valeurs déjà calculées.
  // 🚀 PERF FIX 22/02/2026: Converti de useState → useRef pour éliminer les boucles de re-render.
  // AVANT: broadcastedCalcValues était un state React → chaque broadcast déclenchait un re-render
  // dans TOUTES les ~30 instances de useTBLTableLookup → 30 useEffects → 30 appels API /table/lookup
  // → l'UI était bloquée et les champs comme Inclinaison-1 ne répondaient plus.
  // APRÈS: Le ref ne déclenche PAS de re-render. Les valeurs sont lues quand l'useEffect
  // se déclenche pour d'autres raisons (formData change via saisie utilisateur).
  // Les valeurs calculées sont aussi disponibles via window.TBL_FORM_DATA (déjà enrichi par broadcastCalculatedRefresh).
  // Calculer la valeur initiale une seule fois (useRef n'accepte pas de fonction lazy comme useState)
  const [initialBroadcastSnapshot] = useState<Record<string, any>>(() => {
    if (typeof window !== 'undefined' && (window as any).TBL_FORM_DATA) {
      const snapshot: Record<string, any> = {};
      for (const [key, value] of Object.entries((window as any).TBL_FORM_DATA as Record<string, any>)) {
        if (key.startsWith('__mirror_')) continue;
        if (value === null || value === undefined || value === '') continue;
        if (typeof value === 'string' && (value.startsWith('data:') || value.length > 2000)) continue;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          try {
            if (JSON.stringify(value).length > 5000) continue;
          } catch { continue; }
        }
        snapshot[key] = value;
      }
      return snapshot;
    }
    return {};
  });
  const broadcastedCalcValuesRef = useRef<Record<string, any>>(initialBroadcastSnapshot);
  
  // 🚀 PERF: Debounce pour accumuler les broadcasts rapides en un seul state update
  const pendingCalcValuesRef = useRef<Record<string, any>>({});
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replaceAllRef = useRef(false);
  // 🚀 PERF: Clé du dernier lookup exécuté avec succès et génération de cache associée
  // Permet de skipper les re-exécutions du useEffect quand les filtres réels n'ont pas changé
  const lastSentLookupKeyRef = useRef<string>('');
  const lastSentCacheGenRef = useRef<number>(-1);
  
  // 🎯 Écouter tbl-force-retransform pour récupérer les valeurs calculées FRAÎCHES
  useEffect(() => {
    const handleBroadcast = (event: CustomEvent) => {
      const { calculatedValues, clearDisplayFields, resetCalculatedCache, replaceAll } = event.detail || {};
      
      // 🔥 FIX 14/02/2026: Quand on change de devis, vider le cache des valeurs calculées
      // pour éviter que les valeurs du devis précédent polluent le devis actuel
      // 🔒 Préserver les valeurs des nœuds protégés
      if (clearDisplayFields || resetCalculatedCache) {
        // Clear/reset immédiat (pas de debounce pour les resets)
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        pendingCalcValuesRef.current = {};
        replaceAllRef.current = false;
        // 🚀 PERF: Invalider le cache lookup au changement de devis pour éviter données stales
        lookupResultCache.clear();
        lookupCacheGeneration++; // Invalide tous les lastSentLookupKeyRef en jeu
        const protectedIds = (event.detail as any)?.protectedNodeIds;
        if (Array.isArray(protectedIds) && protectedIds.length > 0) {
          const prev = broadcastedCalcValuesRef.current;
          const kept: Record<string, any> = {};
          for (const id of protectedIds) {
            if (id in prev) kept[id] = prev[id];
          }
          broadcastedCalcValuesRef.current = kept;
        } else {
          broadcastedCalcValuesRef.current = {};
        }
        return;
      }
      
      if (calculatedValues && typeof calculatedValues === 'object' && Object.keys(calculatedValues).length > 0) {
        // 🚀 PERF: Accumuler les valeurs dans le ref, puis flush après 50ms de silence
        // 🔥 FIX: Stocker replaceAll dans un ref pour éviter le bug de closure
        // Si UN SEUL event dans la fenêtre a replaceAll=true, on remplace tout
        if (replaceAll) {
          replaceAllRef.current = true;
          pendingCalcValuesRef.current = { ...calculatedValues };
        } else {
          Object.assign(pendingCalcValuesRef.current, calculatedValues);
        }
        
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          const pending = pendingCalcValuesRef.current;
          const shouldReplaceAll = replaceAllRef.current;
          pendingCalcValuesRef.current = {};
          replaceAllRef.current = false;
          if (shouldReplaceAll) {
            if (isTBLDebugEnabled()) {
              console.log(`🔄 [useTBLTableLookup] Broadcast ref update: ${Object.keys(pending).length} valeurs (replaceAll)`);
            }
            broadcastedCalcValuesRef.current = pending;
          } else {
            // 🚀 PERF: Mutation du ref directement — pas de re-render React.
            // Avant (useState), chaque broadcast déclenchait 30 re-renders (1 par instance du hook).
            const prev = broadcastedCalcValuesRef.current;
            let hasChanges = false;
            for (const key of Object.keys(pending)) {
              if (prev[key] !== pending[key]) {
                hasChanges = true;
                break;
              }
            }
            if (hasChanges) {
              if (isTBLDebugEnabled()) {
                console.log(`🔄 [useTBLTableLookup] Broadcast ref update: ${Object.keys(pending).length} valeurs (merge)`);
              }
              broadcastedCalcValuesRef.current = { ...prev, ...pending };
            }
          }
        }, 50);
      }
    };
    
    window.addEventListener('tbl-force-retransform', handleBroadcast as EventListener);
    return () => {
      window.removeEventListener('tbl-force-retransform', handleBroadcast as EventListener);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);
  
  // 🔥 FIX: Stabiliser formData en le sérialisant en JSON pour la dépendance
  // Cela évite les boucles infinies quand formData est un nouvel objet à chaque rendu
  // 🛡️ FIX: Conserver les clés explicitement vidées (undefined/null) pour empêcher la réinjection
  // JSON.stringify supprime les clés undefined, donc on les track séparément
  const clearedKeysJson = useMemo(() => {
    if (!formData) return '[]';
    const cleared: string[] = [];
    for (const [key, value] of Object.entries(formData)) {
      if (value === undefined || value === null || value === '') {
        cleared.push(key);
      }
    }
    return JSON.stringify(cleared);
  }, [formData]);
  const formDataJson = useMemo(() => 
    formData ? JSON.stringify(formData) : '', 
    [formData]
  );
  
  const [options, setOptions] = useState<TableLookupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableData, setTableData] = useState<{columns: string[], rows: string[], data: unknown[][], type: 'columns' | 'matrix'} | undefined>(undefined);
  const [config, setConfig] = useState<TreeBranchLeafSelectConfig | undefined>(undefined);

  // 🚀 PERF: Ref pour le timer de debounce du lookup (évite les appels API sur chaque frappe)
  const lookupDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 🚀 PERF: Ref pour savoir si c'est le premier montage (pas de debounce au premier chargement)
  const isFirstMountRef = useRef(true);

  // 🔥 FIX 23/02/2026: Refresh trigger + force-immediate flag
  // Permet de forcer un re-fetch immédiat à l'ouverture du dropdown
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const isForceRefreshRef = useRef(false);
  const refresh = useCallback(() => {
    // Annuler tout debounce en cours
    if (lookupDebounceTimerRef.current) {
      clearTimeout(lookupDebounceTimerRef.current);
      lookupDebounceTimerRef.current = null;
    }
    // Invalider le cache pour forcer un nouvel appel API
    lastSentLookupKeyRef.current = '';
    isForceRefreshRef.current = true;
    setRefreshTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    const isTargetField = fieldId === '131a7b51-97d5-4f40-8a5a-9359f38939e8';

    // 🔥 FIX: Reconstruire formData depuis la version JSON sérialisée
    let formDataParsed: Record<string, any> | undefined = formDataJson ? JSON.parse(formDataJson) : undefined;
    
    // ️ FIX: Reconstruire le set de clés explicitement vidées par l'utilisateur
    // Ces clés ne doivent JAMAIS être réinjectées par le batch ou les valeurs calculées
    const clearedKeys = new Set<string>(JSON.parse(clearedKeysJson) as string[]);
    
    // 🔥 FIX 04/02/2026: Enrichir avec les valeurs calculées du broadcast
    // 🔥 FIX 21/02/2026: NE PAS écraser les valeurs utilisateur existantes dans formData !
    // AVANT: `formDataParsed = { ...formDataParsed, ...safeBroadcast }` → broadcast écrasait formData
    // BUG: Quand l'utilisateur change onduleur de Huawei→DEYE, formData a DEYE mais
    // broadcastedCalcValues a encore Huawei (du dernier autosave) → spread remet Huawei
    // → le lookup batterie envoyait toujours Huawei → n'affichait que les batteries Huawei !
    // FIX: formData (saisie utilisateur fraîche) a PRIORITÉ sur broadcast (potentiellement stale)
    // → broadcast ne complète que les clés ABSENTES ou vides de formData
    // 🔥 FIX STALE DATA: Après nouveau devis, ne PAS enrichir avec les valeurs
    // broadcastées car elles contiennent des données du devis précédent
    // (onduleur, batterie, panneau) renvoyées par create-and-evaluate depuis la DB
    const newDevisTs = typeof window !== 'undefined' ? (window as any).__TBL_NEW_DEVIS_TS : 0;
    const isNewDevisRecent = newDevisTs && (Date.now() - newDevisTs < 10000);
    
    const currentBroadcastValues = broadcastedCalcValuesRef.current;
    if (!isNewDevisRecent && formDataParsed && Object.keys(currentBroadcastValues).length > 0) {
      const safeBroadcast = { ...currentBroadcastValues };
      for (const key of clearedKeys) {
        delete safeBroadcast[key];
      }
      // 🔥 FIX 20/02/2026: Distinguer clés CALCULÉES vs clés SAISIE UTILISATEUR
      // Les clés calculées (ex: "uuid-sum-total", "uuid-sum", "uuid-avg") contiennent
      // un suffixe après l'UUID. Ces valeurs sont TOUJOURS fraîches dans le broadcast
      // et DOIVENT écraser les valeurs stale de formData (ex: Puissance WC 0 → 8800).
      // Les clés UUID simples (champs SELECT/INPUT) ne DOIVENT PAS être écrasées
      // car formData contient la saisie utilisateur la plus récente (ex: Huawei → DEYE).
      const isCalculatedKey = (key: string): boolean => {
        // UUID simple = 8-4-4-4-12 → champ saisie utilisateur
        const isSimpleUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
        if (!isSimpleUUID) return true; // Toute clé avec suffixe est calculée
        return false;
      };
      let enrichedCount = 0;
      let overwrittenCount = 0;
      for (const [key, value] of Object.entries(safeBroadcast)) {
        const existing = formDataParsed[key];
        const isCalc = isCalculatedKey(key);
        // Pour les clés calculées: TOUJOURS écraser (broadcast est plus frais que formData)
        // Pour les clés saisie: ne compléter QUE si absente ou vide
        if (isCalc) {
          // Écraser inconditionnellement (valeur calculée fraîche du broadcast)
          if (existing !== undefined && existing !== null && existing !== '' && existing !== value) {
            overwrittenCount++;
          }
          formDataParsed[key] = value;
          enrichedCount++;
        } else if (existing === undefined || existing === null || existing === '') {
          formDataParsed[key] = value;
          enrichedCount++;
        }
      }
      if ((enrichedCount > 0 || overwrittenCount > 0) && isTBLDebugEnabled()) {
        console.log(`🔧 [useTBLTableLookup] formData enrichi avec ${enrichedCount}/${Object.keys(safeBroadcast).length} valeurs calculées (${overwrittenCount} valeurs stale écrasées)`);
      }
    }

    if (isTargetField) {
      console.log(`[DEBUG][Test - liste] 🚀 Hook déclenché pour le champ cible. fieldId: ${fieldId}, nodeId: ${nodeId}, enabled: ${enabled}`);
    }

    // ✅ NOUVEAU: Si le lookup est désactivé, on vide les options
    if (!enabled) {
      if (isTargetField) console.log(`[DEBUG][Test - liste] 🔴 Lookup désactivé (enabled=false). Vidage des options.`);
      setOptions([]);
      setTableData(undefined);
      setConfig(undefined);
      setLoading(false);
      setError(null);
      return;
    }

    //  OPTIMISATION CRITIQUE : Ne rien faire si fieldId est absent
    // Cela évite des centaines de requêtes 404 inutiles pour des champs TEXT/NUMBER/etc.
    if (!fieldId || !nodeId) {
      setOptions([]);
      setTableData(undefined);
      setConfig(undefined);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    // 🚀 PERF FIX 22/02/2026: Debounce le lookup de 400ms pour éviter les appels API
    // sur chaque frappe clavier. Ex: taper "35" ne fait qu'UN seul appel au lieu de deux.
    // Au premier montage (isFirstMountRef), pas de debounce pour afficher les options initiales rapidement.
    const executeLookup = async () => {
      try {
        if (isTargetField) console.log(`[DEBUG][Test - liste] 🔄 Statut initial: loading=true`);
        setLoading(true);
        setError(null);

        // 🚀 BATCHING: Attendre un court instant si le batch est en cours de chargement
        // Cela évite les 404 inutiles sur les IDs de repeater
        if (!batchContext.isReady && batchContext.loading) {
          if (isTargetField) console.log(`[DEBUG][Test - liste] ⏳ Batch en cours de chargement, attente...`);
          await new Promise(resolve => setTimeout(resolve, 100));
          if (cancelled) return;
        }

        // 🚀 BATCHING: 1. Essayer d'abord le cache batch pour la config SELECT
        let selectConfig: TreeBranchLeafSelectConfig | null = null;
        
        if (batchContext.isReady && fieldId) {
          const batchConfig = batchContext.getSelectConfigForNode(fieldId);
          if (batchConfig) {
            if (isTargetField) console.log(`[DEBUG][Test - liste] 🚀 Config SELECT trouvée dans le cache batch:`, batchConfig);
            // Convertir le format batch vers le format attendu
            selectConfig = {
              id: fieldId,
              nodeId: fieldId,
              optionsSource: batchConfig.sourceType as 'table' | 'static' | 'api' || 'static',
              tableReference: batchConfig.sourceTableId || undefined,
              keyColumn: batchConfig.sourceColumn || undefined,
              displayColumn: batchConfig.displayColumn || undefined,
            };
          }
        }
        
        // Fallback: appel API individuel si pas dans le cache batch
        if (!selectConfig) {
          try {
            const suffixMatch = fieldId.match(/-(\d{1,3})$/);
            const hasSuffix = !!suffixMatch;
            const baseFieldId = hasSuffix ? fieldId.replace(/-\d{1,3}$/, '') : fieldId;

            // 🚀 PERF: Vérifier d'abord le cache global (évite requêtes répétées à chaque re-render)
            if (selectConfigCache.has(fieldId)) {
              selectConfig = selectConfigCache.get(fieldId)!;
              if (isTBLDebugEnabled()) {
                console.log(`[useTBLTableLookup] ✅ Config SELECT depuis cache mémoire pour ${fieldId}`);
              }
            } else {
            
            if (isTBLDebugEnabled()) {
              console.log(`[useTBLTableLookup] 🔍 Recherche SelectConfig pour fieldId=${fieldId}, hasSuffix=${hasSuffix}, baseFieldId=${baseFieldId}`);
              console.log(`[useTBLTableLookup] ➡️ GET /api/treebranchleaf/nodes/${fieldId}/select-config (primary)`);
            }

            selectConfig = await api.get<TreeBranchLeafSelectConfig>(
              `/api/treebranchleaf/nodes/${fieldId}/select-config`,
              { suppressErrorLogForStatuses: [404] }
            );

            // 🚀 PERF: Stocker dans le cache pour les prochains appels
            if (selectConfig) {
              selectConfigCache.set(fieldId, selectConfig);
            }

            if (isTBLDebugEnabled()) {
              console.log(`[useTBLTableLookup] 📥 Réponse PRIMARY:`, selectConfig ? `TROUVÉ - nodeId=${selectConfig.nodeId}` : 'NULL (pas trouvé ou erreur)');
            }
            } // fin du else (pas dans cache)

          } catch (err: any) {
            // 🔥 GESTION CRITIQUE DU BUG INCLINAISON-1
            // Si l'API renvoie une erreur avec `isCalculated: true`, cela signifie que
            // la politique du backend a déterminé que ce champ ne DOIT PAS être un select.
            if (err.response?.data?.isCalculated === true) {
              if (isTBLDebugEnabled()) {
                console.log(`[useTBLTableLookup] 🛡️ Politique appliquée: le champ ${fieldId} est calculé, pas un select. Arrêt du lookup.`);
              }
              setOptions([]);
              setTableData(undefined);
              setConfig(undefined);
              setLoading(false);
              setError(null); // Ce n'est pas une erreur, c'est un comportement attendu
              return; // Arrêter l'exécution du hook
            }
            
            // Si c'est une autre erreur, on la lance pour être gérée plus bas
            throw err;
          }
        }

        if (isTargetField) console.log(`[DEBUG][Test - liste] ⬅️ Réponse select-config:`, selectConfig);

        if (cancelled) return;

        // 404 supprimé retourne null
        if (!selectConfig) {
          if (isTargetField) console.log(`[DEBUG][Test - liste] ❌ Pas de selectConfig. Arrêt.`);
          setOptions([]);
          setTableData(undefined);
          setConfig(undefined);
          setLoading(false);
          return;
        }

        // 🔥 POLITIQUE DE DUPLICATION: Vérifier si ce champ PEUT être un SELECT
        // 🆕 RÉVISÉE: Permettre aux champs SELECT dupliqués (comme Orientation-1) de rester SELECT
        //            Bloquer les champs TEXT dupliqués de devenir SELECT
        const fieldType = selectConfig?.sourceType || 'TEXT'; // Si pas de source, c'est TEXT
        if (!canFieldBeSelect(fieldId, fieldType)) {
          if (isTargetField) console.log(`[DEBUG][Test - liste] 🛡️ Politique appliquée: champ dupliqué (${fieldId}) de type ${fieldType} ne peut pas être SELECT. Arrêt.`);
          setOptions([]);
          setTableData(undefined);
          setConfig(undefined);
          setLoading(false);
          return;
        }

        if (selectConfig.optionsSource !== 'table') {
          if (isTargetField) console.log(`[DEBUG][Test - liste] ❌ optionsSource n'est pas 'table'. Arrêt.`);
          setOptions([]);
          setTableData(undefined);
          setConfig(undefined);
          setLoading(false);
          return;
        }

        if (!selectConfig.tableReference) {
          if (isTargetField) console.log(`[DEBUG][Test - liste] ❌ Pas de tableReference. Arrêt.`);
          setOptions([]);
          setTableData(undefined);
          setConfig(undefined);
          setLoading(false);
          return;
        }

        // 2. Charger le tableau référencé - IMPORTANT: Utiliser nodeId (ID du champ SELECT) pas tableReference
        if (isTargetField) console.log(`[DEBUG][Test - liste] ➡️ GET /api/treebranchleaf/nodes/${nodeId}/table/lookup (tableRef=${selectConfig.tableReference})`);
        
        // 🆕 ÉTAPE 2.5: Construire les formValues pour le filtrage dynamique
        let queryParams = '';
        let usePostMethod = false;
        let postFormValues: Record<string, any> = {};
        if (formDataParsed && Object.keys(formDataParsed).length > 0) {
          // 🔥 Filtrer les champs mirror TBL internes + images/fichiers base64 (évite URL trop longue)
          const filteredFormData = Object.entries(formDataParsed)
            .filter(([key, value]) => {
              // Exclure les champs mirror internes
              if (key.startsWith('__mirror_')) return false;
              
              // Exclure les valeurs base64 directes (string)
              if (typeof value === 'string' && value.startsWith('data:')) return false;
              
              // 🛡️ Exclure toute string de plus de 2000 caractères (images, signatures, fichiers encodés)
              if (typeof value === 'string' && value.length > 2000) {
                console.log(`[useTBLTableLookup] 🛡️ Valeur trop longue exclue pour lookup: ${key} (${(value.length / 1024).toFixed(1)} KB)`);
                return false;
              }
              
              // 🛡️ Exclure les objets contenant des données binaires/images (toutes les variantes possibles)
              if (value && typeof value === 'object' && !Array.isArray(value)) {
                const obj = value as Record<string, unknown>;
                // Vérifier les propriétés typiques des champs image: original, annotated, src, thumbnails
                for (const prop of ['original', 'annotated', 'src', 'image', 'data', 'base64']) {
                  const v = obj[prop];
                  if (typeof v === 'string' && (v.startsWith('data:') || v.length > 2000)) {
                    console.log(`[useTBLTableLookup] 🖼️ Image object exclue pour lookup: ${key}.${prop} (${(v.length / 1024).toFixed(1)} KB)`);
                    return false;
                  }
                }
                // Exclure si l'objet a une propriété thumbnails (= champ image)
                if ('thumbnails' in obj || 'original' in obj) {
                  console.log(`[useTBLTableLookup] 🖼️ Image object exclue pour lookup: ${key} (contient thumbnails/original)`);
                  return false;
                }
                // 🛡️ Exclure tout objet sérialisé > 5KB
                try {
                  const serialized = JSON.stringify(value);
                  if (serialized.length > 5000) {
                    console.log(`[useTBLTableLookup] 🛡️ Objet trop volumineux exclu: ${key} (${(serialized.length / 1024).toFixed(1)} KB)`);
                    return false;
                  }
                } catch { /* ignore serialization errors */ }
              }
              
              return true;
            })
            .reduce((acc, [key, value]) => {
              acc[key] = value;
              return acc;
            }, {} as Record<string, any>);
          
          // � FIX STALE DATA: Vérifier si un nouveau devis vient d'être créé
          // Si oui, ne PAS injecter les vieilles valeurs calculées du batch cache
          // car elles proviennent du devis précédent et pollueraient les filtres
          const newDevisTs = typeof window !== 'undefined' ? (window as any).__TBL_NEW_DEVIS_TS : 0;
          const isNewDevisRecent = newDevisTs && (Date.now() - newDevisTs < 10000);
          
          // 🚀 BATCHING: Utiliser le cache batch pour les valeurs calculées au lieu de charger tous les nœuds
          // Cela évite un appel API /trees/:id/nodes pour CHAQUE champ SELECT
          try {
            if (!isNewDevisRecent && batchContext.isReady && batchContext.batchData?.valuesByNode) {
              // Utiliser le cache batch pour injecter les valeurs calculées
              const valuesByNode = batchContext.batchData.valuesByNode;
              for (const [nodeId, valueData] of Object.entries(valuesByNode)) {
                const calculatedValue = valueData.calculatedValue ?? valueData.submissionValue;
                if (calculatedValue === null || calculatedValue === undefined || calculatedValue === '') {
                  continue;
                }

                // 🛡️ FIX: Ne JAMAIS réinjecter une valeur pour un champ explicitement vidé par l'utilisateur
                if (clearedKeys.has(nodeId)) continue;

                const existingValue = filteredFormData[nodeId];
                const shouldOverride = existingValue === undefined || existingValue === null || existingValue === '';

                if (shouldOverride) {
                  filteredFormData[nodeId] = calculatedValue;
                  if (isTargetField) {
                    console.log(`[DEBUG][Test - liste] 🚀 Valeur batch injectée pour ${nodeId}: ${calculatedValue}`);
                  }
                }
              }
              if (isTargetField) console.log(`[DEBUG][Test - liste] 🚀 Valeurs calculées depuis batch cache`);
            } else if (!isNewDevisRecent) {
              // Fallback: Charger depuis API si batch pas disponible
              // 🔥 FIX: Ne PAS charger si nouveau devis récent (données stales)
              const treeId = (window as any).__TBL_LAST_TREE_ID;
              if (treeId) {
                if (isTargetField) console.log(`[DEBUG][Test - liste] ⚠️ Batch pas prêt, fallback API /trees/${treeId}/nodes`);
                const allNodesResponse = await api.get(`/api/treebranchleaf/trees/${treeId}/nodes`);
                const allNodes = allNodesResponse as Array<{ id: string; calculatedValue?: string | number | boolean; hasFormula?: boolean; hasData?: boolean }>;
              
                // Pour chaque nœud avec calculatedValue, l'ajouter aux formValues
                for (const node of allNodes) {
                  if (node.calculatedValue === null || node.calculatedValue === undefined || node.calculatedValue === '') {
                    continue;
                  }

                  // 🛡️ FIX: Ne JAMAIS réinjecter une valeur pour un champ explicitement vidé par l'utilisateur
                  if (clearedKeys.has(node.id)) continue;

                  const existingValue = filteredFormData[node.id];
                  const isComputedField = Boolean(node.hasFormula || node.hasData);
                  const shouldOverride = isComputedField || existingValue === undefined || existingValue === null || existingValue === '';

                  if (shouldOverride) {
                    filteredFormData[node.id] = node.calculatedValue;
                    if (isTargetField) {
                      console.log(`[DEBUG][Test - liste] ✅ Valeur calculée injectée (${shouldOverride ? 'override' : 'set'}) pour ${node.id}: ${node.calculatedValue}`);
                    }
                  }
                }
              }
            }
          } catch (err) {
            console.warn('[useTBLTableLookup] Erreur chargement valeurs calculées:', err);
          }
          
          // 🔗 FIX LINK-RACE FRONTEND: Injecter les valeurs LINK depuis window.TBL_FORM_DATA
          // broadcastCalculatedRefresh y stocke les valeurs LINK résolues par le backend.
          // Ces valeurs sont nécessaires pour les lookups dont le filtre dépend d'un champ LINK.
          // Sans cela, le premier lookup après un changement échoue car le LINK n'est pas dans formData.
          if (!isNewDevisRecent && typeof window !== 'undefined' && (window as any).TBL_FORM_DATA) {
            const tblFormData = (window as any).TBL_FORM_DATA as Record<string, any>;
            let linkEnrichedCount = 0;
            for (const [key, value] of Object.entries(tblFormData)) {
              if (key.startsWith('__mirror_')) continue;
              if (clearedKeys.has(key)) continue;
              if (value === null || value === undefined || value === '') continue;
              // Exclure base64 et valeurs trop longues
              if (typeof value === 'string' && (value.startsWith('data:') || value.length > 2000)) continue;
              const existing = filteredFormData[key];
              if (existing === undefined || existing === null || existing === '') {
                filteredFormData[key] = value;
                linkEnrichedCount++;
              }
            }
            if (linkEnrichedCount > 0) {
              console.log(`🔗 [useTBLTableLookup] formData enrichi avec ${linkEnrichedCount} valeurs depuis TBL_FORM_DATA (LINK values)`);
            }
          }

          // Uniquement si des valeurs utilisateur existent (filteredFormData a déjà exclu les images)
          if (Object.keys(filteredFormData).length > 0) {
            const formValues = JSON.stringify(filteredFormData);

            //  FIX: Si formValues > 4KB, utiliser POST au lieu de GET
            // encodeURIComponent multiplie la taille ~2.5x (" → %22, { → %7B, etc.)
            // Node.js limite les headers HTTP à 16KB → seuil bas pour éviter les erreurs 431
            if (formValues.length > 4000) {
              if (isTBLDebugEnabled()) {
                console.log(`[useTBLTableLookup] 📦 formValues volumineuses (${(formValues.length / 1024).toFixed(1)} KB), envoi via POST`);
              }
              usePostMethod = true;
              postFormValues = filteredFormData;
              queryParams = '';
            } else {
              queryParams = `?formValues=${encodeURIComponent(formValues)}`;
            }
            if (isTargetField) console.log(`[DEBUG][Test - liste] 📊 formValues filtrées (avec calculatedValues):`, filteredFormData);
          }
        }
        
        let table: TableLookupPayload;
        // 🚀 PERF: Clé de cache basée sur fieldId + formValues envoyés
        const lookupCacheKey = `${fieldId}:${usePostMethod ? JSON.stringify(postFormValues) : queryParams}`;
        const cachedLookup = lookupResultCache.get(lookupCacheKey);
        if (cachedLookup) {
          setOptions(cachedLookup.options);
          setConfig(cachedLookup.config);
          setTableData(cachedLookup.tableData);
          setLoading(false);
          return;
        }

        // 🚀 PERF: Si la même clé a déjà été traitée avec succès dans cette instance
        // (et que la génération de cache n'a pas été invalidée), skip l'appel API
        // Cas typique : broadcast de valeurs calculées qui ne changent pas les filtres réels de CE champ
        if (
          lookupCacheKey === lastSentLookupKeyRef.current &&
          lastSentCacheGenRef.current === lookupCacheGeneration
        ) {
          setLoading(false);
          if (isTBLDebugEnabled()) {
            console.log(`[useTBLTableLookup] ⚡ Skip lookup (clé identique au dernier appel): ${fieldId}`);
          }
          return;
        }

        if (usePostMethod) {
          // POST: envoyer formValues dans le body pour éviter URI Too Long
          table = await api.post<TableLookupPayload>(
            `/api/treebranchleaf/nodes/${nodeId}/table/lookup`,
            { formValues: postFormValues },
            { suppressErrorLogForStatuses: [404] }
          );
        } else {
          table = await api.get<TableLookupPayload>(
            `/api/treebranchleaf/nodes/${nodeId}/table/lookup${queryParams}`,
            { suppressErrorLogForStatuses: [404] }
          );
        }
        if (isTargetField) {
          console.log(`[DEBUG][Test - liste] ⬅️ Réponse table/lookup:`, table);
          console.log(`[DEBUG][Test - liste] 🔍 Structure de table:`, {
            isArray: Array.isArray(table),
            hasOptions: table && typeof table === 'object' && 'options' in table,
            hasColumns: table && typeof table === 'object' && 'columns' in table,
            hasRows: table && typeof table === 'object' && 'rows' in table,
            type: table && typeof table === 'object' && 'type' in table ? (table as any).type : undefined,
            keys: table && typeof table === 'object' ? Object.keys(table) : []
          });
        }


        // Si la requête a été supprimée (404), on arrête
        if (!table) {
          setOptions([]);
          setTableData(undefined);
          setConfig(undefined);
          setLoading(false);
          return;
        }

        if (cancelled) return;

        // 3. Extraire les options selon le mode
        const extractedOptions = extractOptions(table, selectConfig);

        if (isTargetField) {
            console.log('✅ [DEBUG][Test - liste] Lookup chargé avec succès:', {
              field: fieldId,
              optionsCount: extractedOptions.length,
              options: extractedOptions
            });
        }

        const newTableData = (table as any)?.columns !== undefined ? {
          columns: (table as any).columns,
          rows: (table as any).rows,
          data: (table as any).data,
          type: (table as any).type
        } : undefined;

        // 🚀 PERF: Stocker résultat dans le cache lookup 
        lookupResultCache.set(lookupCacheKey, {
          options: extractedOptions,
          config: selectConfig,
          tableData: newTableData,
        });
        // 🚀 PERF: Mémoriser la clé réussie pour les prochains broadcasts
        lastSentLookupKeyRef.current = lookupCacheKey;
        lastSentCacheGenRef.current = lookupCacheGeneration;

        setOptions(extractedOptions);
        setConfig(selectConfig);
        setTableData(newTableData);
        setLoading(false);
      } catch (err) {
        if (isTargetField) console.error(`[DEBUG][Test - liste] 💥 Erreur dans le hook:`, err);
        if (!cancelled) {
          // Ne logger que les erreurs réelles (pas les 404 qui sont gérés)
          setError(err instanceof Error ? err.message : 'Erreur inconnue');
          setOptions([]);
          setTableData(undefined);
          setConfig(undefined);
          setLoading(false);
        }
      }
    };

    // 🚀 PERF: Premier montage ou force-refresh → exécution immédiate (pas de debounce)
    // Changements suivants (formDataJson) → debounce 400ms pour coalescer les frappes rapides
    if (isFirstMountRef.current || isForceRefreshRef.current) {
      isFirstMountRef.current = false;
      isForceRefreshRef.current = false;
      void executeLookup();
    } else {
      // Annuler le précédent timer si un nouveau changement arrive
      if (lookupDebounceTimerRef.current) {
        clearTimeout(lookupDebounceTimerRef.current);
      }
      // 🔥 FIX 23/02/2026: Réduit de 400ms à 150ms pour une réactivité plus rapide
      // L'utilisateur voyait un délai trop long avant que les options onduleur se mettent à jour
      lookupDebounceTimerRef.current = setTimeout(() => {
        lookupDebounceTimerRef.current = null;
        void executeLookup();
      }, 150);
    }

    return () => {
      cancelled = true;
      if (lookupDebounceTimerRef.current) {
        clearTimeout(lookupDebounceTimerRef.current);
        lookupDebounceTimerRef.current = null;
      }
    };
  }, [fieldId, nodeId, enabled, formDataJson, clearedKeysJson, batchContext.isReady, refreshTrigger]); // 🔥 FIX 23/02/2026: ajouté refreshTrigger pour forcer re-fetch à l'ouverture dropdown

  return { options, loading, error, tableData, config, refresh };
}

/**
 * 🔧 Extraction des options depuis le tableau
 */
function extractOptions(
  payload: TableLookupPayload,
  config: TreeBranchLeafSelectConfig
): TableLookupOption[] {
  if (isTBLDebugEnabled()) {
    tblLog('🔍 [extractOptions] ENTRÉE:', {
      payload: payload,
      payloadType: typeof payload,
      isArray: Array.isArray(payload),
      hasDirectOptions: hasDirectOptions(payload),
      isNormalizedInstance: isNormalizedInstance(payload),
      keys: payload && typeof payload === 'object' ? Object.keys(payload) : []
    });
  }
  
  if (hasDirectOptions(payload)) {
    if (isTBLDebugEnabled()) tblLog('✅ [extractOptions] Utilisation du chemin hasDirectOptions (payload.options)');
    return sanitizeDirectOptions(payload.options);
  }

  if (isNormalizedInstance(payload)) {
    if (isTBLDebugEnabled()) tblLog('✅ [extractOptions] Utilisation du chemin isNormalizedInstance (table complète)');
    return extractOptionsFromTable(payload, config);
  }

  if (isTBLDebugEnabled()) tblLog('❌ [extractOptions] Aucun chemin reconnu - retour array vide');
  return [];
}

function hasDirectOptions(payload: TableLookupPayload): payload is TableLookupApiResponse & { options: unknown[] } {
  const hasOptions = Boolean(
    payload && typeof payload === 'object' && Array.isArray((payload as TableLookupApiResponse).options)
  );
  
  // Log conditionnel - très verbeux
  // if (isTBLDebugEnabled()) tblLog('🔍 [hasDirectOptions] Test:', { result: hasOptions });
  
  return hasOptions;
}

function isNormalizedInstance(payload: TableLookupPayload): payload is NormalizedTableInstance {
  if (!payload || typeof payload !== 'object') return false;
  const candidate = payload as Partial<NormalizedTableInstance>;
  return (
    typeof candidate.type === 'string' &&
    Array.isArray(candidate.columns) &&
    Array.isArray(candidate.data)
  );
}

function extractOptionsFromTable(
  table: NormalizedTableInstance,
  config: TreeBranchLeafSelectConfig
): TableLookupOption[] {
  const { keyColumn, valueColumn, displayColumn } = config;
  const options: TableLookupOption[] = [];

  if (table.type === 'columns') {
    // Mode colonnes : chaque colonne devient une option
    const keyIdx = keyColumn ? table.columns.indexOf(keyColumn) : 0;
    const valueIdx = valueColumn ? table.columns.indexOf(valueColumn) : 0;
    const displayIdx = displayColumn ? table.columns.indexOf(displayColumn) : valueIdx;

    if (keyIdx === -1 || valueIdx === -1) {
      console.warn('⚠️ [extractOptions] Colonnes key/value introuvables', {
        keyColumn,
        valueColumn,
        columns: table.columns,
      });
      return [];
    }

    // Parcourir les lignes de données
    table.data.forEach((row) => {
      const key = row[keyIdx];
      const value = row[valueIdx];
      const display = displayIdx !== -1 ? row[displayIdx] : value;

      if (key !== undefined && key !== null && key !== '') {
        options.push({
          value: String(key),
          label: String(display || value || key),
        });
      }
    });
  } else if (table.type === 'matrix') {
    // 🔥 NOUVEAU: Si keyRow est défini, extraire les VALEURS de cette ligne
    if (config.keyRow) {
      const rowIdx = table.rows.indexOf(config.keyRow);
      
      if (rowIdx === -1) {
        console.warn('⚠️ [extractOptions] Ligne introuvable:', config.keyRow);
        return [];
      }

      const rowData = table.data[rowIdx] || [];
      
      // Créer une option pour chaque colonne de cette ligne
      table.columns.forEach((columnName, colIdx) => {
        const value = rowData[colIdx];
        
        if (value !== undefined && value !== null && value !== '') {
          options.push({
            value: String(value),
            label: config.displayRow ? `${columnName}: ${value}` : String(value),
          });
        }
      });
    } else {
      // Mode original : première colonne = clés, première ligne = colonnes
      // On prend la colonne spécifiée par valueColumn
      const colIdx = valueColumn ? table.columns.indexOf(valueColumn) : 1;

      if (colIdx === -1) {
        console.warn('⚠️ [extractOptions] Colonne value introuvable en mode matrix', {
          valueColumn,
          columns: table.columns,
        });
        return [];
      }

      table.data.forEach((row, rowIdx) => {
        const key = table.rows[rowIdx];
        const value = row[colIdx];
        const display = displayColumn && displayColumn !== valueColumn ? row[table.columns.indexOf(displayColumn)] : value;

        if (key !== undefined && key !== null && key !== '') {
          options.push({
            value: String(key),
            label: String(display || value || key),
          });
        }
      });
    }
  }

  // Logs supprimés - trop verbeux
  return options;
}

  function sanitizeDirectOptions(rawOptions: unknown[]): TableLookupOption[] {
    const safeOptions: TableLookupOption[] = [];

    if (!Array.isArray(rawOptions)) {
      tblWarn('⚠️ [sanitizeDirectOptions] rawOptions n\'est pas un array:', rawOptions);
      return safeOptions;
    }

    rawOptions.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        return;
      }
      
      const option = entry as Record<string, unknown>;
      const value = option.value ?? option.key ?? option.id;
      const label = option.label ?? option.display ?? value;

      if (value === undefined || value === null) {
        return;
      }

      const finalOption = {
        value: typeof value === 'number' || typeof value === 'string' ? value : String(value),
        label: typeof label === 'string' || typeof label === 'number' ? String(label) : `Option ${index + 1}`,
        disabled: typeof option.disabled === 'boolean' ? option.disabled : undefined,
      };
      
      safeOptions.push(finalOption);
    });

    // Log résumé uniquement si debug activé
    if (isTBLDebugEnabled()) {
      tblLog(`🎯 [sanitizeDirectOptions] RÉSULTAT: ${safeOptions.length} options`);
    }
    return safeOptions;
  }
