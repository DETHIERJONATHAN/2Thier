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
 */

import { useState, useEffect } from 'react';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';
import { tblLog, tblWarn, isTBLDebugEnabled } from '../../../../../utils/tblDebug';
import { selectConfigBatcher } from '../utils/SelectConfigBatcher';

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
  const { api } = useAuthenticatedApi();
  const [options, setOptions] = useState<TableLookupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableData, setTableData] = useState<{columns: string[], rows: string[], data: unknown[][], type: 'columns' | 'matrix'} | undefined>(undefined);
  const [config, setConfig] = useState<TreeBranchLeafSelectConfig | undefined>(undefined);

  useEffect(() => {
    const isTargetField = fieldId === '131a7b51-97d5-4f40-8a5a-9359f38939e8';

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

    (async () => {
      try {
        if (isTargetField) console.log(`[DEBUG][Test - liste] 🔄 Statut initial: loading=true`);
        setLoading(true);
        setError(null);

        // 1. Récupérer la configuration SELECT du champ
        // 🎯 404 = Normal (le champ n'a pas de config lookup)
        if (isTargetField) console.log(`[DEBUG][Test - liste] ➡️ GET /api/treebranchleaf/nodes/${fieldId}/select-config (BATCHED)`);
        
        // BATCHING OPTIMIZATION: Use the batcher instead of direct API call
        const selectConfig = await selectConfigBatcher.fetch(fieldId, api);

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
        if (formData && Object.keys(formData).length > 0) {
          // 🔥 Filtrer les champs mirror TBL internes + images/fichiers base64 (évite URL trop longue)
          const filteredFormData = Object.entries(formData)
            .filter(([key, value]) => {
              // Exclure les champs mirror internes
              if (key.startsWith('__mirror_')) return false;
              
              // Exclure les valeurs base64 (images/fichiers) qui rendent l'URL trop longue
              if (typeof value === 'string' && value.startsWith('data:')) return false;
              
              return true;
            })
            .reduce((acc, [key, value]) => {
              acc[key] = value;
              return acc;
            }, {} as Record<string, any>);
          
          // 🔥 ÉTAPE 2.5.1: Charger les valeurs calculées manquantes depuis Prisma
          // Les champs avec formules/data ont leurs valeurs dans calculatedValue, pas dans formData
          // On doit les récupérer manuellement pour le filtrage
          try {
            // Récupérer tous les champs de l'arbre pour trouver les champs avec calculatedValue
            const treeId = (window as any).__TBL_LAST_TREE_ID; // Stocké globalement par TBL.tsx (ligne 447)
            if (treeId) {
              const allNodesResponse = await api.get(`/api/treebranchleaf/trees/${treeId}/nodes`);
              const allNodes = allNodesResponse as Array<{ id: string; calculatedValue?: string | number | boolean; hasFormula?: boolean; hasData?: boolean }>;
              
              // Pour chaque nœud avec calculatedValue, l'ajouter aux formValues
              for (const node of allNodes) {
                if (node.calculatedValue === null || node.calculatedValue === undefined || node.calculatedValue === '') {
                  continue;
                }

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
          } catch (err) {
            console.warn('[useTBLTableLookup] Erreur chargement valeurs calculées:', err);
          }
          
          // Uniquement si des valeurs utilisateur existent
          if (Object.keys(filteredFormData).length > 0) {
            const formValues = JSON.stringify(filteredFormData);
            queryParams = `?formValues=${encodeURIComponent(formValues)}`;
            if (isTargetField) console.log(`[DEBUG][Test - liste] 📊 formValues filtrées (avec calculatedValues):`, filteredFormData);
          }
        }
        
        const table = await api.get<TableLookupPayload>(
          `/api/treebranchleaf/nodes/${nodeId}/table/lookup${queryParams}`,
          { suppressErrorLogForStatuses: [404] }
        );
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

        setOptions(extractedOptions);
        setConfig(selectConfig);
        setTableData({
          columns: table.columns,
          rows: table.rows,
          data: table.data,
          type: table.type
        });
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
    })();

    return () => {
      cancelled = true;
    };
  }, [fieldId, nodeId, api, enabled, formData]); // 🆕 Ajout de formData aux dépendances (re-fetch si formData change)

  return { options, loading, error, tableData, config };
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
