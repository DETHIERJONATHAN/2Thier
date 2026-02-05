import { Prisma, PrismaClient } from '@prisma/client';

export type MinimalReqUser = {
  organizationId?: string | null;
  isSuperAdmin?: boolean;
  role?: string;
  userRole?: string;
};

export type MinimalReq = {
  user?: MinimalReqUser;
  headers?: Record<string, unknown>;
};

export function getAuthCtx(req: MinimalReq): { organizationId: string | null; isSuperAdmin: boolean } {
  const user: MinimalReqUser = (req && req.user) || {};
  const headerOrg: string | undefined = (req?.headers?.['x-organization-id'] as string)
    || (req?.headers?.['x-organization'] as string)
    || (req?.headers?.['organization-id'] as string);
  const role: string | undefined = user.role || user.userRole;
  const isSuperAdmin = Boolean(user.isSuperAdmin || role === 'super_admin' || role === 'superadmin');
  const organizationId: string | null = (user.organizationId as string) || headerOrg || null;
  return { organizationId, isSuperAdmin };
}

export type LinkedField = 'linkedFormulaIds' | 'linkedConditionIds' | 'linkedTableIds' | 'linkedVariableIds';

type PrismaLikeClient = PrismaClient | Prisma.TransactionClient;

const uniq = <T,>(arr: T[]): T[] => Array.from(new Set(arr));

const uuidLikeRef = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isRealNodeRef = (ref: string): boolean => {
  if (!ref) return false;
  return uuidLikeRef.test(ref) || ref.startsWith('node_') || ref.startsWith('shared-ref-');
};

export function normalizeRefId(ref: string): string {
  if (!ref) return ref;
  if (ref.startsWith('node-formula:')) return ref.replace(/^node-formula:/, '');
  return ref;
}

export function extractNodeIdsFromConditionSet(conditionSet: unknown): Set<string> {
  const ids = new Set<string>();
  if (!conditionSet || typeof conditionSet !== 'object') return ids;
  const obj = conditionSet as Record<string, unknown>;
  if (Array.isArray(obj.tokens)) {
    for (const t of obj.tokens as unknown[]) {
      const asStr = typeof t === 'string' ? t : JSON.stringify(t);
      const re = /@value\.([a-f0-9-]{36})/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(asStr)) !== null) {
        ids.add(m[1]);
      }
    }
  }
  if (Array.isArray(obj.branches)) {
    for (const br of obj.branches as unknown[]) {
      const b = br as Record<string, unknown>;
      const when = b.when as Record<string, unknown> | undefined;
      const scanWhen = (node?: Record<string, unknown>) => {
        if (!node) return;
        const ref = node.ref as string | undefined;
        if (typeof ref === 'string') {
          const m = /@value\.([a-f0-9-]{36})/i.exec(ref);
          if (m && m[1]) ids.add(m[1]);
        }
        if (node.left && typeof node.left === 'object') scanWhen(node.left as Record<string, unknown>);
        if (node.right && typeof node.right === 'object') scanWhen(node.right as Record<string, unknown>);
      };
      scanWhen(when);
      const actions = b.actions as unknown[] | undefined;
      if (Array.isArray(actions)) {
        for (const a of actions) {
          const aa = a as Record<string, unknown>;
          const nodeIds = aa.nodeIds as string[] | undefined;
          if (Array.isArray(nodeIds)) {
            for (const nid of nodeIds) ids.add(normalizeRefId(nid));
          }
        }
      }
    }
  }
  if (obj.fallback && typeof obj.fallback === 'object') {
    const fb = obj.fallback as Record<string, unknown>;
    const actions = fb.actions as unknown[] | undefined;
    if (Array.isArray(actions)) {
      for (const a of actions) {
        const aa = a as Record<string, unknown>;
        const nodeIds = aa.nodeIds as string[] | undefined;
        if (Array.isArray(nodeIds)) {
          for (const nid of nodeIds) ids.add(normalizeRefId(nid));
        }
      }
    }
  }
  const str = JSON.stringify(obj);
  if (str) {
    const re = /@value\.([a-f0-9-]{36})/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(str)) !== null) ids.add(m[1]);
  }
  return ids;
}

export function extractNodeIdsFromTokens(tokens: unknown): Set<string> {
  const ids = new Set<string>();
  if (!tokens) return ids;
  const addFromString = (s: string) => {
    let m: RegExpExecArray | null;
    const re = /@value\.([A-Za-z0-9_:-]+)/gi;
    while ((m = re.exec(s)) !== null) ids.add(m[1]);
  };
  if (Array.isArray(tokens)) {
    for (const t of tokens) {
      if (typeof t === 'string') addFromString(t);
      else addFromString(JSON.stringify(t));
    }
  } else if (typeof tokens === 'string') {
    addFromString(tokens);
  } else {
    addFromString(JSON.stringify(tokens));
  }
  return ids;
}

export async function getNodeLinkedField(
  client: PrismaLikeClient,
  nodeId: string,
  field: LinkedField
): Promise<string[]> {
  const node = await client.treeBranchLeafNode.findUnique({
    where: { id: nodeId },
    select: { [field]: true } as unknown as { [k in LinkedField]: true }
  }) as unknown as { [k in LinkedField]?: string[] } | null;
  return (node?.[field] ?? []) as string[];
}

export async function setNodeLinkedField(
  client: PrismaLikeClient,
  nodeId: string,
  field: LinkedField,
  values: string[]
) {
  try {
    await client.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: { [field]: { set: uniq(values) } } as unknown as Prisma.TreeBranchLeafNodeUpdateInput
    });
  } catch (e) {
    console.warn('[TreeBranchLeaf API] setNodeLinkedField skipped:', { nodeId, field, error: (e as Error).message });
  }
}

export async function addToNodeLinkedField(
  client: PrismaLikeClient,
  nodeId: string,
  field: LinkedField,
  idsToAdd: string[]
) {
  const sanitized = idsToAdd?.filter(id => id && isRealNodeRef(id)) ?? [];
  if (!sanitized.length) return;
  const current = await getNodeLinkedField(client, nodeId, field);
  const next = uniq([...current, ...sanitized]);
  await setNodeLinkedField(client, nodeId, field, next);
}

export async function removeFromNodeLinkedField(
  client: PrismaLikeClient,
  nodeId: string,
  field: LinkedField,
  idsToRemove: string[]
) {
  const sanitized = idsToRemove?.filter(id => id && isRealNodeRef(id)) ?? [];
  if (!sanitized.length) return;
  const current = await getNodeLinkedField(client, nodeId, field);
  const toRemove = new Set(sanitized);
  const next = current.filter(id => !toRemove.has(id));
  await setNodeLinkedField(client, nodeId, field, next);
}

export function buildResponseFromColumns(node: any): Record<string, unknown> {
  type LegacyRepeaterMeta = {
    templateNodeIds?: unknown;
    templateNodeLabels?: unknown;
    minItems?: number | null;
    maxItems?: number | null;
    addButtonLabel?: string | null;
  };

  const metadataAppearance = (node.metadata && typeof node.metadata === 'object'
    ? (node.metadata as Record<string, unknown>).appearance
    : undefined) as Record<string, unknown> | undefined;

  const appearance = {
    size: node.appearance_size || 'md',
    width: node.appearance_width || null,
    variant: node.appearance_variant || null,
    helpTooltipType: node.text_helpTooltipType || 'none',
    helpTooltipText: node.text_helpTooltipText || null,
    helpTooltipImage: node.text_helpTooltipImage || null
  };

  const legacyRepeater: LegacyRepeaterMeta | null = (() => {
    if (node.metadata && typeof node.metadata === 'object' && (node.metadata as Record<string, unknown>).repeater) {
      const legacy = (node.metadata as Record<string, unknown>).repeater;
      return typeof legacy === 'object' && legacy !== null ? legacy as LegacyRepeaterMeta : null;
    }
    return null;
  })();

  const repeater = {
    templateNodeIds: (() => {
      if (node.repeater_templateNodeIds) {
        try {
          const parsed = JSON.parse(node.repeater_templateNodeIds);
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          console.error('ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€¦Ã¢â‚¬â„¢ [buildResponseFromColumns] Erreur parse repeater_templateNodeIds:', e);
          return [];
        }
      }
      const legacyIds = legacyRepeater?.templateNodeIds;
      if (Array.isArray(legacyIds)) {
        return legacyIds as string[];
      }
      return [];
    })(),
    templateNodeLabels: (() => {
      if (node.repeater_templateNodeLabels) {
        try {
          const parsedLabels = JSON.parse(node.repeater_templateNodeLabels);
          return parsedLabels && typeof parsedLabels === 'object' ? parsedLabels : null;
        } catch (e) {
          console.error('ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€¦Ã¢â‚¬â„¢ [buildResponseFromColumns] Erreur parse repeater_templateNodeLabels:', e);
        }
      }
      const legacyLabels = legacyRepeater?.templateNodeLabels;
      if (legacyLabels && typeof legacyLabels === 'object') {
        return legacyLabels as Record<string, string>;
      }
      return null;
    })(),
    minItems: node.repeater_minItems ?? legacyRepeater?.minItems ?? 0,
    maxItems: node.repeater_maxItems ?? legacyRepeater?.maxItems ?? null,
    addButtonLabel: node.repeater_addButtonLabel || legacyRepeater?.addButtonLabel || null,
    buttonSize: node.repeater_buttonSize || legacyRepeater?.buttonSize || 'middle',
    buttonWidth: node.repeater_buttonWidth || legacyRepeater?.buttonWidth || 'auto',
    iconOnly: node.repeater_iconOnly ?? legacyRepeater?.iconOnly ?? false
  };

  const storedAppearanceConfig = (node.appearanceConfig && typeof node.appearanceConfig === 'object')
    ? node.appearanceConfig as Record<string, unknown>
    : undefined;

  const appearanceConfig = {
    ...(storedAppearanceConfig || {}),
    size: node.appearance_size || 'md',
    variant: node.appearance_variant || 'singleline',
    placeholder: node.text_placeholder || '',
    maxLength: node.text_maxLength || 255,
    mask: node.text_mask || '',
    regex: node.text_regex || '',
    helpTooltipType: node.text_helpTooltipType || 'none',
    helpTooltipText: node.text_helpTooltipText || null,
    helpTooltipImage: node.text_helpTooltipImage || null,
    displayIcon: (storedAppearanceConfig as any)?.displayIcon || (metadataAppearance as any)?.displayIcon
  };

  const fieldConfig = {
    text: {
      placeholder: node.text_placeholder || null,
      maxLength: node.text_maxLength || null,
      minLength: node.text_minLength || null,
      mask: node.text_mask || null,
      regex: node.text_regex || null,
      rows: node.text_rows || 3
    },
    number: {
      min: node.number_min || null,
      max: node.number_max || null,
      step: node.number_step || 1,
      // ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€šÃ‚Â§ FIX: PrioritÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â© ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â  data_precision pour les champs d'affichage (cartes bleues), sinon number_decimals
      decimals: node.data_precision ?? node.number_decimals ?? 0,
      prefix: node.number_prefix || null,
      suffix: node.number_suffix || null,
      unit: node.number_unit ?? node.data_unit ?? null,
      defaultValue: node.number_defaultValue || null
    },
    select: {
      multiple: node.select_multiple || false,
      searchable: node.select_searchable !== false,
      allowClear: node.select_allowClear !== false,
      defaultValue: node.select_defaultValue || null,
      options: node.select_options || []
    },
    bool: {
      trueLabel: node.bool_trueLabel || null,
      falseLabel: node.bool_falseLabel || null,
      defaultValue: node.bool_defaultValue || null
    },
    date: {
      format: node.date_format || 'DD/MM/YYYY',
      showTime: node.date_showTime || false,
      minDate: node.date_minDate || null,
      maxDate: node.date_maxDate || null
    },
    image: {
      maxSize: node.image_maxSize || null,
      ratio: node.image_ratio || null,
      crop: node.image_crop || false,
      thumbnails: node.image_thumbnails || null
    }
  } as Record<string, Record<string, unknown>>;

  Object.keys(fieldConfig).forEach(key => {
    const config = fieldConfig[key];
    const hasValues = Object.values(config).some(val => val !== null && val !== undefined && val !== false && val !== 0 && val !== '');
    if (!hasValues) delete fieldConfig[key];
  });

  const cleanedMetadata = {
    ...(node.metadata || {}),
    appearance: {
      ...(metadataAppearance || {}),
      ...appearance
    }
  };

  if (node.subtabs) {
    try {
      const parsed = JSON.parse(node.subtabs as string);
      if (Array.isArray(parsed)) {
        (cleanedMetadata as any).subTabs = parsed;
      }
    } catch {
      // noop
    }
  }

  if (node.subtab !== undefined && node.subtab !== null) {
    const rawSubTab = node.subtab as string;
    let parsedSubTab: string | string[] = rawSubTab;
    if (typeof rawSubTab === 'string') {
      const trimmed = rawSubTab.trim();
      if (trimmed.startsWith('[')) {
        try {
          const candidate = JSON.parse(trimmed);
          if (Array.isArray(candidate)) {
            parsedSubTab = candidate;
          }
        } catch {
          parsedSubTab = rawSubTab;
        }
      } else if (trimmed.includes(',')) {
        parsedSubTab = trimmed.split(',').map(part => part.trim()).filter(Boolean);
      } else {
        parsedSubTab = trimmed;
      }
    }
    try {
      (cleanedMetadata as any).subTab = parsedSubTab;
    } catch {
      // noop
    }
  }

  if (node.id === '131a7b51-97d5-4f40-8a5a-9359f38939e8') {
  }

  if (cleanedMetadata && (cleanedMetadata as any).subTabs) {
    try {
    } catch {
      // noop
    }
  }

  const metadataWithRepeater = {
    ...cleanedMetadata,
    repeater
  };

  if (repeater.templateNodeIds && repeater.templateNodeIds.length > 0) {
  }


  const result = {
    ...node,
    metadata: metadataWithRepeater,
    fieldConfig,
    appearance,
    appearanceConfig,
    fieldType: node.fieldType || node.type,
    fieldSubType: node.fieldSubType || node.subType,
    text_helpTooltipType: node.text_helpTooltipType,
    text_helpTooltipText: node.text_helpTooltipText,
    text_helpTooltipImage: node.text_helpTooltipImage,
    // 🎯 AI Measure columns - MUST be included in API responses
    aiMeasure_enabled: node.aiMeasure_enabled ?? false,
    aiMeasure_autoTrigger: node.aiMeasure_autoTrigger ?? true,
    aiMeasure_prompt: node.aiMeasure_prompt || null,
    aiMeasure_keys: node.aiMeasure_keys || null,
    // 🔗 LINK: Colonnes dédiées pour la configuration des liens (valeur d'un autre champ)
    hasLink: node.hasLink ?? false,
    link_targetNodeId: node.link_targetNodeId || null,
    link_targetTreeId: node.link_targetTreeId || null,
    link_mode: node.link_mode || null,
    link_carryContext: node.link_carryContext ?? false,
    tables: node.TreeBranchLeafNodeTable || [],
    sharedReferenceIds: node.sharedReferenceIds || undefined
  } as Record<string, unknown>;

  try {
    const legacyMetaCaps = (node.metadata && typeof node.metadata === 'object') ? (node.metadata as any).capabilities : undefined;

    const buildInstances = (raw: unknown): Record<string, unknown> | undefined => {
      if (!raw) return undefined;
      if (typeof raw === 'object' && raw !== null) return raw as Record<string, unknown>;
      return undefined;
    };

    const capabilities: Record<string, unknown> = {
      data: (node.hasData || node.data_activeId || node.data_instances) ? {
        enabled: !!node.hasData,
        activeId: node.data_activeId || null,
        instances: buildInstances(node.data_instances) || {},
        unit: node.data_unit || null,
        precision: typeof node.data_precision === 'number' ? node.data_precision : 2,
        exposedKey: node.data_exposedKey || null,
        displayFormat: node.data_displayFormat || null,
        visibleToUser: node.data_visibleToUser === true
      } : undefined,
      formula: (node.hasFormula || node.formula_activeId || node.formula_instances) ? {
        enabled: !!node.hasFormula,
        activeId: node.formula_activeId || null,
        instances: buildInstances(node.formula_instances) || {},
        tokens: buildInstances(node.formula_tokens) || undefined,
        name: node.formula_name || null
      } : undefined,
      table: (node.hasTable || node.table_activeId || node.table_instances) ? {
        enabled: !!node.hasTable,
        activeId: node.table_activeId || null,
        instances: buildInstances(node.table_instances) || {},
        name: node.table_name || null,
        meta: buildInstances(node.table_meta) || {},
        type: node.table_type || 'columns',
        isImported: node.table_isImported === true,
        importSource: node.table_importSource || null,
        columns: Array.isArray(node.table_columns) ? node.table_columns : null,
        rows: Array.isArray(node.table_rows) ? node.table_rows : null
      } : undefined,
      select: (node.select_options || node.select_defaultValue) ? {
        options: Array.isArray(node.select_options) ? node.select_options : [],
        allowClear: node.select_allowClear !== false,
        multiple: node.select_multiple === true,
        searchable: node.select_searchable !== false,
        defaultValue: node.select_defaultValue || null
      } : undefined,
      number: (node.number_min !== undefined || node.number_max !== undefined || node.number_defaultValue !== undefined) ? {
        min: node.number_min ?? null,
        max: node.number_max ?? null,
        step: node.number_step ?? 1,
        // ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€šÃ‚Â§ FIX: PrioritÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â© ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â  data_precision pour les champs d'affichage
        decimals: node.data_precision ?? node.number_decimals ?? 0,
        unit: node.number_unit ?? node.data_unit ?? null,
        prefix: node.number_prefix || null,
        suffix: node.number_suffix || null,
        defaultValue: node.number_defaultValue || null
      } : undefined,
      bool: (node.bool_trueLabel || node.bool_falseLabel || node.bool_defaultValue !== undefined) ? {
        trueLabel: node.bool_trueLabel || null,
        falseLabel: node.bool_falseLabel || null,
        defaultValue: node.bool_defaultValue ?? null
      } : undefined,
      date: (node.date_format || node.date_showTime || node.date_minDate || node.date_maxDate) ? {
        format: node.date_format || 'DD/MM/YYYY',
        showTime: node.date_showTime === true,
        minDate: node.date_minDate || null,
        maxDate: node.date_maxDate || null
      } : undefined,
      image: (node.image_maxSize || node.image_ratio || node.image_crop || node.image_thumbnails) ? {
        maxSize: node.image_maxSize || null,
        ratio: node.image_ratio || null,
        crop: node.image_crop === true,
        thumbnails: node.image_thumbnails || null
      } : undefined,
      link: (node.link_activeId || node.link_instances) ? {
        enabled: !!node.hasLink,
        activeId: node.link_activeId || null,
        instances: buildInstances(node.link_instances) || {},
        mode: node.link_mode || 'JUMP',
        name: node.link_name || null,
        carryContext: node.link_carryContext === true,
        params: buildInstances(node.link_params) || {},
        targetNodeId: node.link_targetNodeId || null,
        targetTreeId: node.link_targetTreeId || null
      } : undefined,
      markers: (node.markers_activeId || node.markers_instances || node.markers_selectedIds) ? {
        enabled: !!node.hasMarkers,
        activeId: node.markers_activeId || null,
        instances: buildInstances(node.markers_instances) || {},
        available: buildInstances(node.markers_available) || {},
        selectedIds: buildInstances(node.markers_selectedIds) || {}
      } : undefined,
      api: (node.api_activeId || node.api_instances) ? {
        enabled: !!node.hasAPI,
        activeId: node.api_activeId || null,
        instances: buildInstances(node.api_instances) || {},
        bodyVars: buildInstances(node.api_bodyVars) || {},
        name: node.api_name || null
      } : undefined
    };

    Object.keys(capabilities).forEach(key => {
      if (capabilities[key] === undefined) delete capabilities[key];
    });

    let mergedCaps: Record<string, unknown> = capabilities;
    if (legacyMetaCaps && typeof legacyMetaCaps === 'object') {
      mergedCaps = { ...legacyMetaCaps, ...capabilities };
    }

    (result as any).capabilities = mergedCaps;
  } catch (e) {
    console.error('ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€¦Ã¢â‚¬â„¢ [buildResponseFromColumns] Erreur adaptation legacy capabilities:', e);
  }

  if (node.sharedReferenceIds && node.sharedReferenceIds.length > 0) {
  }

  if (node.text_helpTooltipType && node.text_helpTooltipType !== 'none') {
  }

  return result;
}
