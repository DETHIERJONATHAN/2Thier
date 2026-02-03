export type ShouldAutoCreateSelectConfigInput = {
  node: {
    id: string;
    subType?: string | null;
    fieldType?: string | null;
    table_activeId?: string | null;
    TreeBranchLeafSelectConfig?: {
      optionsSource?: string | null;
      tableReference?: string | null;
      keyColumn?: string | null;
      displayColumn?: string | null;
    } | null;
  };
  tableMeta?: Record<string, unknown> | null;
};

const SELECT_FIELD_TYPES = new Set([
  'select',
  'multi-select',
  'radio',
  'checkbox',
]);

function isSelectLikeFieldType(fieldType: string | null | undefined): boolean {
  if (!fieldType) return false;
  const normalized = String(fieldType).toLowerCase();
  if (SELECT_FIELD_TYPES.has(normalized)) return true;
  return normalized.includes('select');
}

/**
 * Décide si on autorise l'auto-création / conservation d'une SelectConfig sur un nœud copié (id suffixé -1, -2, ...).
 *
 * Objectif: éviter d'avoir des SelectConfigs “fantômes” sur des copies qui ne sont pas (ou plus) des champs SELECT,
 * tout en gardant les cas lookup (Orientation / Inclinaison) où `fieldType` peut être null mais le lookup est légitime.
 */
export function shouldAutoCreateSelectConfig(input: ShouldAutoCreateSelectConfigInput): boolean {
  const { node, tableMeta } = input;

  // Si le nœud ressemble à un champ select, on autorise.
  if (isSelectLikeFieldType(node.fieldType)) return true;

  // Certains nœuds “lookup” utilisent subType='SELECT' même si fieldType est null.
  if (typeof node.subType === 'string' && node.subType.toUpperCase() === 'SELECT') return true;

  // Si la SelectConfig pointe explicitement sur une table (lookup table), on privilégie l'autorisation.
  const optionsSource = node.TreeBranchLeafSelectConfig?.optionsSource ?? null;
  if (typeof optionsSource === 'string' && optionsSource.toLowerCase() === 'table') return true;

  // Heuristique basée sur la meta de table: si lookup.enabled=true, il s'agit d'un lookup légitime.
  const lookup = (tableMeta && typeof tableMeta === 'object') ? (tableMeta as any).lookup : undefined;
  if (lookup && typeof lookup === 'object' && (lookup.enabled === true || lookup.columnLookupEnabled === true || lookup.rowLookupEnabled === true)) {
    return true;
  }

  // Par défaut (notamment “copie en mode non-select”), on bloque.
  return false;
}
