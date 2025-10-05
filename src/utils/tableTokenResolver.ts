/**
 * Helper pour l'évaluation des tokens de table dans le système TreeBranchLeaf
 * S'intègre avec le système de submission existant (formules, conditions)
 */

interface TableEvaluationResult {
  type: 'lookup' | 'standard';
  processed: boolean;
  selectedValue?: string;
  data?: Record<string, unknown>;
  error?: string;
}

/**
 * Résout un token de table dans le contexte d'une submission
 * Formats supportés :
 * - @table.{tableId} → objet complet avec données du lookup
 * - @table.{tableId}.{columnName} → valeur d'une colonne spécifique
 * - @table.{tableId}.selected → valeur sélectionnée dans le lookup
 */
export function resolveTableToken(
  token: string,
  submissionData: Map<string, unknown>
): unknown {
  // Format: @table.{tableId} ou @table.{tableId}.{columnName}
  const match = token.match(/^@table\.([^.]+)(?:\.(.+))?$/);
  
  if (!match) {
    console.warn(`[TableTokenResolver] Format de token invalide: ${token}`);
    return null;
  }

  const [, tableId, columnName] = match;
  
  // Chercher les données de la table dans la submission
  const tableKey = `table_${tableId}`;
  const tableData = submissionData.get(tableKey) as TableEvaluationResult | undefined;

  if (!tableData || !tableData.processed) {
    console.warn(`[TableTokenResolver] Données de table non trouvées pour: ${tableId}`);
    return null;
  }

  // Si c'est un lookup et qu'on demande une colonne spécifique
  if (tableData.type === 'lookup' && columnName) {
    if (columnName === 'selected') {
      return tableData.selectedValue;
    }
    
    if (tableData.data && columnName in tableData.data) {
      return tableData.data[columnName];
    }
    
    console.warn(`[TableTokenResolver] Colonne "${columnName}" non trouvée dans les données de lookup`);
    return null;
  }

  // Si on demande l'objet complet
  if (!columnName) {
    return tableData.data || tableData;
  }

  return null;
}

/**
 * Extrait tous les tokens de table d'une expression
 */
export function extractTableTokens(expression: string): string[] {
  const regex = /@table\.[^.]+(?:\.[^.\s()]+)?/g;
  return expression.match(regex) || [];
}

/**
 * Remplace les tokens de table dans une expression par leurs valeurs
 */
export function replaceTableTokens(
  expression: string,
  submissionData: Map<string, unknown>
): string {
  const tokens = extractTableTokens(expression);
  
  let result = expression;
  for (const token of tokens) {
    const value = resolveTableToken(token, submissionData);
    
    if (value !== null && value !== undefined) {
      // Convertir en string pour le remplacement
      const replacement = typeof value === 'object' 
        ? JSON.stringify(value) 
        : String(value);
      
      result = result.replace(token, replacement);
    }
  }
  
  return result;
}

/**
 * Évalue les données d'une table après une sélection utilisateur
 * Intégré dans le système de submission existant
 */
export function evaluateTableSelection(
  table: {
    id: string;
    type: string;
    rows: Array<Record<string, unknown>>;
    lookupSelectColumn?: string;
    lookupDisplayColumns?: string[];
  },
  selectedValue: string
): TableEvaluationResult {
  // Pour les tables simples sans lookup
  if (table.type !== 'columns' || !table.lookupSelectColumn) {
    return {
      type: 'standard',
      processed: true,
      selectedValue
    };
  }

  // Pour les tables avec lookup
  const selectedRow = table.rows.find(
    (row) => String(row[table.lookupSelectColumn!]) === selectedValue
  );

  if (!selectedRow) {
    return {
      type: 'lookup',
      processed: false,
      error: 'Ligne non trouvée',
      selectedValue
    };
  }

  // Extraire les données configurées
  const data: Record<string, unknown> = {
    selected: selectedValue
  };

  if (table.lookupDisplayColumns && table.lookupDisplayColumns.length > 0) {
    table.lookupDisplayColumns.forEach((colName) => {
      data[colName] = selectedRow[colName];
    });
  }

  return {
    type: 'lookup',
    processed: true,
    selectedValue,
    data
  };
}

/**
 * Vérifie si un token est un token de table
 */
export function isTableToken(token: string): boolean {
  return /^@table\.[^.]+(?:\.[^.]+)?$/.test(token);
}

/**
 * Extrait l'ID de la table d'un token
 */
export function getTableIdFromToken(token: string): string | null {
  const match = token.match(/^@table\.([^.]+)/);
  return match ? match[1] : null;
}

/**
 * Crée un token de table pour une colonne spécifique
 */
export function createTableColumnToken(tableId: string, columnName: string): string {
  return `@table.${tableId}.${columnName}`;
}

/**
 * Crée un token de table pour la valeur sélectionnée
 */
export function createTableSelectedToken(tableId: string): string {
  return `@table.${tableId}.selected`;
}

export default {
  resolveTableToken,
  extractTableTokens,
  replaceTableTokens,
  evaluateTableSelection,
  isTableToken,
  getTableIdFromToken,
  createTableColumnToken,
  createTableSelectedToken
};
