/**
 * 🎯 Hook pour récupérer les valeurs calculées depuis Prisma
 * 
 * Le backend a DÉJÀ calculé et stocké la valeur dans TreeBranchLeafNode.calculatedValue
 * Ce hook va juste la chercher et la retourner
 * 
 * NO RECALCULATION - Just fetch and display
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import { tblLog, isTBLDebugEnabled } from '../utils/tblDebug';

// 🧠 Coalescing global (module-level): évite les bursts de requêtes identiques
const lastFetchAtByKey = new Map<string, number>();

// 🛡️ Anti-race-condition: compteur de version par clé - SEULE protection fiable
// (AbortController ne fonctionne pas car useAuthenticatedApi déduplique les requêtes GET)
const requestVersionByKey = new Map<string, number>();

// 🛡️ NOUVEAU: Timestamp de la DERNIÈRE réponse traitée par nodeId
// Protège contre les réponses qui arrivent dans le désordre (out-of-order)
// Utilise uniquement nodeId comme clé (pas submissionId qui peut changer)
const lastProcessedTimestampByNode = new Map<string, number>();

// 🛡️ Dernière valeur connue par clé - pour éviter les régressions de valeur
const lastKnownValueByKey = new Map<string, { value: string | number | boolean | null; version: number }>();
// 🎯 NOUVEAU FIX: Signal global de blocage des GET pendant qu'un changement est en cours
// Quand un champ change, on bloque les GET jusqu'à ce que le backend retourne
// Cela évite que les GET retournent des valeurs obsolètes avant que create-and-evaluate ne finisse
let changeInProgressUntil = 0;

// 🎯 FIX V2: Protection des valeurs inline après broadcast
// Les valeurs reçues via inline sont "fraîches" et ne doivent pas être écrasées par des GET obsolètes
// Clé: nodeId, Valeur: timestamp jusqu'auquel cette valeur est protégée
const inlineValueProtectedUntil = new Map<string, number>();

// 🔥 FIX V3: DÉSACTIVÉ - La protection globale bloquait les GET légitimes
// Les GET sont nécessaires pour récupérer les valeurs correctes après le broadcast
// La protection inline (V2) suffit pour les champs qui reçoivent une valeur via broadcast

/**
 * 🛡️ DÉSACTIVÉ - Ne fait plus rien
 * La protection inline (protectInlineValue) est suffisante
 */
export function protectAllDisplayFieldsAfterBroadcast(durationMs: number = 2000): void {
  // DÉSACTIVÉ: Cette protection bloquait les GET légitimes qui sont nécessaires
  // pour récupérer les valeurs correctes après le broadcast
  console.log(`🛡️ [useNodeCalculatedValue] Protection globale DÉSACTIVÉE (ne fait plus rien)`);
}

/**
 * 🚦 Active le blocage des GET pour une durée donnée
 * Appelé par TBL.tsx AVANT d'envoyer une requête au backend
 */
export function blockGetRequestsTemporarily(durationMs: number = 2000): void {
  const now = Date.now();
  changeInProgressUntil = now + durationMs;
  console.log(`🚫 [useNodeCalculatedValue] GET bloqués jusqu'à ${new Date(changeInProgressUntil).toISOString().slice(11, 23)}`);
}

/**
 * 🟢 Désactive le blocage des GET immédiatement
 * Appelé par TBL.tsx quand le backend a retourné et les valeurs inline sont broadcastées
 */
export function unblockGetRequests(): void {
  changeInProgressUntil = 0;
  console.log(`✅ [useNodeCalculatedValue] GET débloqués`);
}

/**
 * 🛡️ Protège une valeur inline d'être écrasée par un GET obsolète
 */
function protectInlineValue(nodeId: string, durationMs: number = 1500): void {
  inlineValueProtectedUntil.set(nodeId, Date.now() + durationMs);
}

/**
 * 🔍 Vérifie si une valeur inline est encore protégée
 */
function isInlineValueProtected(nodeId: string): boolean {
  const protectedUntil = inlineValueProtectedUntil.get(nodeId) || 0;
  return Date.now() < protectedUntil;
}
interface CalculatedValueResult {
  value: string | number | boolean | null;
  loading: boolean;
  error: string | null;
  calculatedAt?: string;
  calculatedBy?: string; // "formula-abc", "table-def", etc.
  /** Permet de déclencher un refetch manuel (ex: après un save). */
  refresh: () => void;
}

/**
 * Récupère une valeur calculée depuis Prisma (TreeBranchLeafNode.calculatedValue)
 * 
 * ⚠️ IMPORTANT: Le submissionId est utilisé UNIQUEMENT pour lire les valeurs des champs sources
 * nécessaires au calcul, PAS pour enregistrer le résultat calculé lui-même.
 * 
 * Les calculated values (display fields) ne sont JAMAIS enregistrés dans la submission.
 * Ils calculent toujours en temps réel basés sur les valeurs actuelles des champs normaux.
 * 
 * @param nodeId - ID du nœud TreeBranchLeaf
 * @param treeId - ID de l'arbre
 * @param submissionId - (Optionnel) ID de la soumission pour lire les valeurs des champs sources
 * @returns { value, loading, error, calculatedAt, calculatedBy }
 */
export function useNodeCalculatedValue(
  nodeId: string,
  treeId: string,
  submissionId?: string
): CalculatedValueResult {
  const { api } = useAuthenticatedApi();
  const [value, setValue] = useState<string | number | boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculatedAt, setCalculatedAt] = useState<string>();
  const [calculatedBy, setCalculatedBy] = useState<string>();
  
  // 🎯 NOUVELLE PROTECTION: Compteur d'évaluations API en cours pour éviter les overwrites
  const [isProtected, setIsProtected] = useState(false);
  const pendingEvaluationsRef = useRef<number>(0);

  // Refs pour éviter les closures périmées sans créer de boucles de dépendances
  const valueRef = useRef<string | number | boolean | null>(null);
  const isProtectedRef = useRef<boolean>(false);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    isProtectedRef.current = isProtected;
  }, [isProtected]);

  // 🔇 Anti-spam: mémoriser les derniers refresh globaux traités
  const lastGlobalRefreshKeyRef = useRef<string | null>(null);
  const lastGlobalRefreshAtRef = useRef<number>(0);

  // Fonction pour récupérer la valeur
  const fetchCalculatedValue = useCallback(async () => {
    if (!nodeId || !treeId) {
      // Cas courant: certains composants appellent le hook avec nodeId temporairement vide.
      // On n'émet pas d'erreur et on n'appelle pas l'API.
      setLoading(false);
      setError(null);
      setValue(null);
      return;
    }

    const requestKey = `${treeId}::${submissionId || ''}::${nodeId}`;
    const now = Date.now();
    
    // 🎯 FIX DONNÉES FANTÔMES: Bloquer les GET pendant qu'un changement est en cours
    // Les valeurs correctes arriveront via l'événement tbl-force-retransform avec calculatedValues inline
    if (changeInProgressUntil > now) {
      console.log(`🚫 [useNodeCalculatedValue] GET BLOQUÉ pour nodeId=${nodeId} - changement en cours (encore ${changeInProgressUntil - now}ms)`);
      return;
    }
    
    // 🛡️ FIX V2: Bloquer les GET si une valeur inline a été reçue récemment
    // Cela évite qu'un GET obsolète (lancé juste avant le inline) écrase la bonne valeur
    if (isInlineValueProtected(nodeId)) {
      console.log(`🛡️ [useNodeCalculatedValue] GET IGNORÉ pour nodeId=${nodeId} - valeur inline protégée`);
      return;
    }
    
    // 🔥 FIX V3: DÉSACTIVÉ - La protection globale a été retirée
    // Elle bloquait les GET légitimes qui sont nécessaires pour récupérer les vraies valeurs
    // La protection inline (V2) est suffisante pour les champs qui reçoivent une valeur via broadcast
    
    // �🛡️ NOUVEAU: Capturer le timestamp de CETTE requête (sera utilisé pour rejeter les réponses obsolètes)
    const requestTimestamp = now;

    // Throttle court (évite l'empilement d'events: preview + autosave + retransform)
    const last = lastFetchAtByKey.get(requestKey);
    if (last && now - last < 450) {
      return;
    }

    // 🛡️ Anti-race-condition: incrémenter et capturer la version AVANT la requête
    const currentVersion = (requestVersionByKey.get(requestKey) || 0) + 1;
    requestVersionByKey.set(requestKey, currentVersion);
    
    console.log(`🔢 [useNodeCalculatedValue] Requête v${currentVersion} pour nodeId=${nodeId}`);

    try {
      lastFetchAtByKey.set(requestKey, now);
      setLoading(true);
      setError(null);

      // 🎯 Endpoint: GET /api/tree-nodes/:nodeId/calculated-value
      // Retourne: { value, calculatedAt, calculatedBy }
      // 
      // ⚠️ IMPORTANT: Le submissionId est envoyé UNIQUEMENT pour lire les valeurs
      // des champs sources nécessaires au calcul. Le résultat calculé lui-même
      // n'est JAMAIS enregistré dans la submission - il reste dynamique.
      // ✅ IMPORTANT: Un 404 doit être toléré (ex: display field pas encore créé en DB)
      // et ne doit pas polluer la console ni casser l'UI.
      const response = await api.get(
        `/api/tree-nodes/${nodeId}/calculated-value`,
        {
          params: submissionId ? { submissionId } : undefined,
          suppressErrorLogForStatuses: [404]
        }
      );

      // 🛡️ Anti-race-condition V1: vérifier si une requête plus récente a été lancée (par version)
      const latestVersion = requestVersionByKey.get(requestKey) || 0;
      if (currentVersion !== latestVersion) {
        console.log(`🛡️ [useNodeCalculatedValue] IGNORÉ v${currentVersion}: réponse obsolète pour nodeId=${nodeId} (version courante: v${latestVersion})`);
        return;
      }
      
      // 🛡️ FIX V2: Vérifier si une valeur inline a été reçue PENDANT que ce GET était en cours
      // Si oui, ignorer la réponse du GET car elle contient des données obsolètes
      if (isInlineValueProtected(nodeId)) {
        console.log(`🛡️ [useNodeCalculatedValue] IGNORÉ v${currentVersion}: réponse GET pour nodeId=${nodeId} - valeur inline plus récente reçue pendant le fetch`);
        return;
      }
      
      // 🛡️ Anti-race-condition V2: vérifier par TIMESTAMP (protection cross-instances)
      // Utilise uniquement nodeId comme clé pour protéger contre les réponses out-of-order
      // même si le submissionId a changé entre-temps
      const lastProcessedTs = lastProcessedTimestampByNode.get(nodeId) || 0;
      if (requestTimestamp < lastProcessedTs) {
        console.log(`🛡️ [useNodeCalculatedValue] IGNORÉ ts=${requestTimestamp}: réponse obsolète pour nodeId=${nodeId} (dernier traité: ts=${lastProcessedTs})`);
        return;
      }
      // Marquer ce timestamp comme le dernier traité pour ce node
      lastProcessedTimestampByNode.set(nodeId, requestTimestamp);

      // Déclarer extractedValue au niveau supérieur pour pouvoir l'utiliser dans le fallback
      let extractedValue: string | number | boolean | null = null;
        
        if (response && typeof response === 'object') {
          const data = response as Record<string, unknown>;
          
          // Extraire les données de la réponse
          extractedValue = data.value ?? data.calculatedValue ?? null;
          
          // 🔥 Si c'est un objet, extraire la valeur intelligemment
          if (typeof extractedValue === 'object' && extractedValue !== null) {
            const obj = extractedValue as Record<string, unknown>;
            extractedValue = 
              obj.value ?? 
              obj.result ?? 
              obj.calculatedValue ?? 
              obj.text ?? 
              extractedValue;
          }

          if (isTBLDebugEnabled()) {
            tblLog('✅ [useNodeCalculatedValue] Valeur récupérée:', {
              nodeId,
              treeId,
              value: extractedValue,
              calculatedAt: data.calculatedAt,
              calculatedBy: data.calculatedBy
            });
          }

          // 🎯 PROTECTION: Ne pas écraser une valeur existante par null/vide/[] si des évaluations sont en cours
          const isValueBeingCleared = (
            extractedValue === null || 
            extractedValue === undefined || 
            extractedValue === '' ||
            extractedValue === '∅' ||
            (Array.isArray(extractedValue) && extractedValue.length === 0) // 🔥 NOUVEAU: Bloquer les tableaux vides []
          );
          const currentValue = valueRef.current;
          const hasCurrentValue = (
            currentValue !== null && 
            currentValue !== undefined && 
            currentValue !== '' && 
            currentValue !== '∅' &&
            !(Array.isArray(currentValue) && currentValue.length === 0)
          );
          
          if (isProtectedRef.current && isValueBeingCleared && hasCurrentValue) {
            console.log(`🛡️ [GRD nodeId=${nodeId}] PROTECTION: ne pas écraser "${currentValue}" avec "${extractedValue}" (${pendingEvaluationsRef.current} évaluations en cours)`);
            return;
          }

          // Si on a une valeur valide, l'utiliser directement
          if (extractedValue !== null && extractedValue !== undefined && extractedValue !== '') {
            // 🛡️ Anti-régression: ne jamais revenir à une valeur "pire" qu'avant
            // sauf si c'est la requête la plus récente ET qu'on est en mode non-protégé
            const lastKnown = lastKnownValueByKey.get(requestKey);
            
            // Stocker cette valeur comme dernière connue pour cette version
            lastKnownValueByKey.set(requestKey, { value: extractedValue as string | number | boolean | null, version: currentVersion });
            
            console.log(`🔄 [useNodeCalculatedValue] v${currentVersion} ts=${requestTimestamp} Mise à jour valeur pour nodeId=${nodeId}:`, extractedValue);
            setValue(extractedValue as string | number | boolean | null);
            setCalculatedAt(data.calculatedAt as string | undefined);
            setCalculatedBy(data.calculatedBy as string | undefined);
            return;
          }
        }
        
        // Si la valeur est vide, on l'affiche vide intentionnellement
        setValue(null);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      
      const status = (err as Error & { status?: number })?.status;
      if (status === 404) {
        // Tolérer le 404 (nœud inexistant / pas encore créé) -> valeur vide
        setValue(null);
        setError(null);
        return;
      }

      setError(errMsg);
      console.error('❌ [useNodeCalculatedValue] Erreur récupération:', {
        nodeId,
        treeId,
        error: errMsg
      });
    } finally {
      setLoading(false);
    }
  }, [nodeId, treeId, submissionId, api]);

  // 🔥 FIX 30/01/2026: Stocker le submissionId précédent pour détecter les changements
  const prevSubmissionIdRef = useRef<string | undefined>(submissionId);

  // Récupérer la valeur quand nodeId/treeId change (mais PAS quand submissionId change seul)
  // Quand submissionId change, les valeurs arriveront via broadcast inline depuis create-and-evaluate
  useEffect(() => {
    if (nodeId && treeId) {
      // 🔥 FIX: Si SEUL submissionId a changé, ne PAS déclencher de GET
      // Les valeurs correctes arriveront via l'événement tbl-force-retransform avec calculatedValues inline
      const previousSubmissionId = prevSubmissionIdRef.current;
      const submissionIdChanged = previousSubmissionId !== submissionId;
      
      // Mettre à jour le ref APRÈS avoir comparé
      prevSubmissionIdRef.current = submissionId;
      
      if (submissionIdChanged && submissionId) {
        console.log(`🛡️ [useNodeCalculatedValue] GET IGNORÉ pour nodeId=${nodeId} - submissionId a changé (${previousSubmissionId} → ${submissionId}), attente du broadcast inline`);
        // 🔎 DIAG PRIX KWH
        if (nodeId.startsWith('99476bab')) {
          console.log(`🔎🔎🔎 [DIAG PRIX KWH HOOK] GET IGNORÉ car submissionId changed - current value="${valueRef.current}"`);
        }
        return;
      }
      
      fetchCalculatedValue();
    }
  }, [nodeId, treeId, fetchCalculatedValue]);

  // 🎯 NOUVELLE PROTECTION: Écouter l'événement de fin d'évaluation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!nodeId || !treeId) return;
    // Quand un devis existe (submissionId), on laisse l'évaluation serveur piloter le refresh
    // via `tbl-force-retransform`/`tbl-node-updated` pour éviter un refetch trop tôt (valeurs non encore recalculées).
    if (submissionId) return;
    
    const handleEvaluationComplete = () => {
      if (pendingEvaluationsRef.current > 0) {
        pendingEvaluationsRef.current--;
        console.log(`⬇️ [GRD nodeId=${nodeId}] Évaluation terminée (${pendingEvaluationsRef.current} restantes)`);
        
        // Désactiver la protection quand le compteur atteint 0
        if (pendingEvaluationsRef.current === 0) {
          setIsProtected(false);
        }
      }
    };
    
    window.addEventListener('tbl-evaluation-complete', handleEvaluationComplete);
    return () => window.removeEventListener('tbl-evaluation-complete', handleEvaluationComplete);
  }, [nodeId, treeId]);

  // 🔄 Rafraîchir automatiquement quand un événement global force la retransformation
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!nodeId || !treeId) {
      return;
    }
    
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ 
        nodeId?: string; 
        submissionId?: string; 
        treeId?: string | number; 
        reason?: string; 
        signature?: string; 
        timestamp?: number; 
        debugId?: string;
        // 🎯 FIX: Valeurs calculées passées directement pour éviter refetch
        calculatedValues?: Record<string, unknown>;
      }>).detail;

      // Filtrer par treeId si présent
      if (detail?.treeId !== undefined && detail?.treeId !== null && String(detail.treeId) !== String(treeId)) {
        return;
      }

      // Filtrer par submissionId si présent
      if (detail?.submissionId && submissionId && String(detail.submissionId) !== String(submissionId)) {
        return;
      }

      // Anti-spam: ignorer les doubles refresh globaux identiques
      const refreshKey = `${detail?.reason || ''}::${detail?.signature || ''}::${detail?.timestamp || ''}`;
      const now = Date.now();
      if (lastGlobalRefreshKeyRef.current === refreshKey && (now - lastGlobalRefreshAtRef.current) < 400) {
        return;
      }

      // Global refresh sans nodeId => tous les champs, mais étalé pour éviter un burst de requêtes
      const isGlobal = !detail?.nodeId;
      if (isGlobal || detail.nodeId === nodeId) {
        lastGlobalRefreshKeyRef.current = refreshKey;
        lastGlobalRefreshAtRef.current = now;

        // 🎯 FIX RACE CONDITION: Si des valeurs calculées sont fournies dans l'événement,
        // les utiliser DIRECTEMENT au lieu de faire un refetch qui peut retourner des valeurs obsolètes
        if (detail?.calculatedValues && nodeId in detail.calculatedValues) {
          const inlineValue = detail.calculatedValues[nodeId];
          console.log(`📥 [useNodeCalculatedValue] Valeur inline pour nodeId=${nodeId}:`, inlineValue);
          
          // 🔎 DIAG PRIX KWH
          if (nodeId.startsWith('99476bab')) {
            console.log(`🔎🔎🔎 [DIAG PRIX KWH HOOK] Inline reçue: "${inlineValue}", type=${typeof inlineValue}, submissionId=${submissionId}`);
          }
          
          // Mettre à jour le timestamp pour protéger contre les réponses GET obsolètes
          lastProcessedTimestampByNode.set(nodeId, now);
          
          // 🛡️ FIX V2: Protéger cette valeur inline contre les GET obsolètes pendant 1.5s
          protectInlineValue(nodeId, 1500);
          
          // Utiliser la valeur directement
          if (inlineValue !== undefined && inlineValue !== null) {
            setValue(inlineValue as string | number | boolean | null);
          }
          return; // 🎯 Ne PAS faire de refetch !
        }

        // 🔥 FIX 30/01/2026: Si calculatedValues existe mais notre nodeId n'y est PAS,
        // cela signifie que ce display field n'a PAS été recalculé (skippé par le trigger filter).
        // Dans ce cas, NE PAS faire de refetch car la valeur actuelle est toujours correcte !
        // Le refetch risquerait de retourner null/obsolète pour les nouvelles révisions.
        if (detail?.calculatedValues && Object.keys(detail.calculatedValues).length > 0) {
          console.log(`🛡️ [useNodeCalculatedValue] nodeId=${nodeId} pas dans calculatedValues - conserver valeur actuelle (pas de refetch)`);
          return; // 🎯 Ne PAS faire de refetch - le champ n'a pas été impacté par le changement
        }

        // Si pas de valeur inline ET pas de calculatedValues, faire le refetch classique (fallback)
        // Cela couvre les cas comme le chargement initial ou les refreshs manuels
        // 🎯 PROTECTION: Incrémenter le compteur quand un refresh est demandé
        pendingEvaluationsRef.current++;
        setIsProtected(true);
        console.log(`⬆️ [GRD nodeId=${nodeId}] Rafraîchissement demandé (${pendingEvaluationsRef.current} en cours)`);

        // 🚀 Triggers au centre: rafraîchissement immédiat (throttle 450ms déjà appliqué dans fetchCalculatedValue)
        fetchCalculatedValue();
      }
    };
    
    window.addEventListener('tbl-force-retransform', handler);
    return () => {
      window.removeEventListener('tbl-force-retransform', handler);
    };
  }, [fetchCalculatedValue, nodeId, submissionId, treeId]);

  // 🚫 DÉSACTIVÉ: L'événement tbl-field-changed créait une race condition
  // Il déclenchait des requêtes GET AVANT que le backend ait sauvegardé les nouvelles données
  // Résultat: la première modification affichait toujours des valeurs obsolètes
  // Le seul événement qui doit déclencher un refresh est tbl-force-retransform,
  // émis APRÈS le succès de create-and-evaluate
  // useEffect(() => {
  //   if (typeof window === 'undefined') return;
  //   if (!nodeId || !treeId) return;
  //   
  //   const handler = () => {
  //     if (Date.now() - lastGlobalRefreshAtRef.current < 120) return;
  //     fetchCalculatedValue();
  //   };
  //   
  //   window.addEventListener('tbl-field-changed', handler);
  //   return () => {
  //     window.removeEventListener('tbl-field-changed', handler);
  //   };
  // }, [fetchCalculatedValue, nodeId, treeId, submissionId]);

  // �🔔 Rafraîchir aussi quand un événement tbl-node-updated est dispatché avec notre nodeId
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!nodeId || !treeId) return;
    
    const handler = (event: Event) => {
      try {
        const detail = (event as CustomEvent<{ node?: { id?: string } }>).detail;
        if (!detail?.node?.id || detail.node.id === nodeId) {
          // 🎯 PROTECTION: Incrémenter le compteur quand un update est signalé
          pendingEvaluationsRef.current++;
          setIsProtected(true);
          console.log(`⬆️ [GRD nodeId=${nodeId}] Update signalé (${pendingEvaluationsRef.current} en cours)`);

          lastGlobalRefreshAtRef.current = Date.now();

          // 🚀 Triggers au centre: rafraîchissement immédiat (throttle 450ms déjà appliqué)
          fetchCalculatedValue();
        }
      } catch {
        // noop
      }
    };
    
    window.addEventListener('tbl-node-updated', handler);
    return () => {
      window.removeEventListener('tbl-node-updated', handler);
    };
  }, [fetchCalculatedValue, nodeId, treeId]);

  const refresh = useCallback(() => {
    fetchCalculatedValue();
  }, [fetchCalculatedValue]);

  return {
    value,
    loading,
    error,
    calculatedAt,
    calculatedBy,
    refresh
  };
}
