/**
 * 🏗️ TBLSectionRenderer - Rendu hiérarchique des sections TBL
 * 
 * Gère l'affichage des sections avec :
 * - Hiérarchie TreeBranchLeaf complète (sections + sous-sections)
 * - Logique conditionnelle (affichage/masquage basé sur les options)
 * - Rendu récursif des sous-sections
 * - Champs avec configuration TreeBranchLeaf avancée
 */

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { dlog as globalDlog } from '../../../../../utils/debug';
import { tblLog, isTBLDebugEnabled } from '../../../../../utils/tblDebug';
// ✅ NOUVEAU SYSTÈME : CalculatedValueDisplay affiche les valeurs STOCKÉES dans Prisma
import { CalculatedValueDisplay } from './CalculatedValueDisplay';
// 🖼️ NOUVEAU: ImageDisplayBubble pour afficher les photos liées via link mode PHOTO
import { ImageDisplayBubble } from './ImageDisplayBubble';
import { useBatchEvaluation } from '../hooks/useBatchEvaluation';
import { 
  Card, 
  Typography, 
  Row,
  Col,
  Divider,
  Tag,
  Collapse,
  Grid,
  Button,
  Form,
  Tooltip,
  Drawer
} from 'antd';
import { 
  BranchesOutlined,
  EyeInvisibleOutlined,
  PlusOutlined,
  MinusCircleOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import TBLFieldRendererAdvanced from './TBLFieldRendererAdvanced';
import type { TBLSection, TBLField } from '../hooks/useTBLDataPrismaComplete';
import type { TBLFormData } from '../hooks/useTBLSave';
import { buildMirrorKeys } from '../utils/mirrorNormalization';
import type { RawTreeNode } from '../types';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';
import { isCopyFromRepeater } from '../utils/isCopyFromRepeater';
import { useTBLBatchOptional } from '../contexts/TBLBatchContext';

const { Text } = Typography;
const { Panel } = Collapse;
const { useBreakpoint } = Grid;

// 🔍 HELPER: Distinguer les formules de VALEUR des formules de CONTRAINTE
// Une formule de contrainte (ex: number_max dynamique) ne rend PAS le champ read-only
const isConstraintFormula = (formulaInstances: Record<string, unknown> | null | undefined): boolean => {
  if (!formulaInstances) return false;
  
  // Parcourir toutes les instances de formule
  for (const [_instanceId, instance] of Object.entries(formulaInstances)) {
    const inst = instance as Record<string, unknown> | null;
    if (!inst) continue;
    
    // Vérifier le targetProperty - si c'est une propriété de contrainte, ce n'est PAS une formule de valeur
    const targetProperty = inst.targetProperty as string | undefined;
    if (targetProperty && ['number_max', 'number_min', 'max', 'min', 'step', 'visible', 'disabled', 'required'].includes(targetProperty)) {
      return true;
    }
    
    // Vérifier aussi le nom de la formule pour des indices
    const name = (inst.name as string) || '';
    if (/\b(max|min|limit|constraint|validation)\b/i.test(name)) {
      return true;
    }
  }
  return false;
};

// 🎯 INTERFACE POUR NAMESPACING DES REPEATERS
interface RepeaterNamespaceMeta {
  prefix: string; // Format: "${parentId}_${instanceIndex}_"
  parentId: string;
  instanceIndex: number;
  labelPrefix: string; // Ex: "Versant 1", "Bloc 1"
}

interface CloneRepeaterOptions {
  applyLabelPrefix?: boolean;
  templateNodeId?: string;
}

type FontWeightValue = number | 'normal' | 'bold' | 'lighter' | 'bolder';

const BASE_SUFFIX_KEY = '__BASE__';
const REPEATER_ADD_BUTTON_STYLE = {
  backgroundColor: '#0b5c6b',
  borderColor: '#094c58',
  color: '#ffffff'
};

const suffixFromString = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const dashMatch = value.match(/-(\d+)$/);
  if (dashMatch?.[1]) return dashMatch[1];
  const copyMatch = value.match(/\((?:copie|copy)\s*([^)]+)\)/i);
  if (copyMatch?.[1]) return copyMatch[1];
  return undefined;
};

const extractFieldSuffix = (field: TBLField): string => {
  const meta = (field.metadata || {}) as Record<string, unknown>;
  const repeaterIndex = (field as any).repeaterInstanceIndex ?? meta.repeaterInstanceIndex;
  if (typeof repeaterIndex === 'number' || typeof repeaterIndex === 'string') {
    return String(repeaterIndex);
  }
  const metaSuffix = (meta.copySuffix || meta.suffix || meta.instanceSuffix) as string | undefined;
  if (metaSuffix) return String(metaSuffix);
  const idSuffix = suffixFromString(field.id);
  if (idSuffix) return idSuffix;
  const labelSuffix = suffixFromString(field.label);
  if (labelSuffix) return labelSuffix;
  const sharedRefSuffix = suffixFromString((field as any).sharedReferenceName);
  if (sharedRefSuffix) return sharedRefSuffix;
  return BASE_SUFFIX_KEY;
};

const groupDisplayFieldsBySuffix = (fields: TBLField[]): Array<{ suffix: string; fields: TBLField[] }> => {
  // 🎯 RÈGLE D'ORDRE (07/02/2026):
  // 1. Tous les ORIGINAUX (suffixe __BASE__) triés par ordre TBL
  // 2. Toutes les copies -1 triées par ordre TBL
  // 3. Toutes les copies -2 triées par ordre TBL
  // ...
  // N. Tous les Totaux à la FIN triés par ordre TBL
  // Ceci s'applique aux sections FORM et DATA.
  
  // Déterminer si un champ est un Total
  const isTotal = (field: TBLField): boolean => {
    const label = (field.label || '').toLowerCase();
    // 🔧 FIX: Seuls les vrais champs de totalisation sont des "Totaux"
    // Convention: "xxx - total", "xxx -total", "total xxx" en début de label
    // EXCLURE les labels qui contiennent simplement le mot "total" (ex: "Hauteur total")
    return label.includes('- total') || label.startsWith('total ') || label === 'total';
  };
  
  // Extraire le suffixe numérique d'un champ (-1, -2, etc.)
  const getSuffixNumber = (field: TBLField): number => {
    if (isTotal(field)) return Infinity; // Totaux toujours à la fin
    // 🔧 Les boutons repeater (Ajouter/Supprimer) restent APRÈS les originaux mais AVANT les copies
    // Ordre: Originaux (0) → Bouton Ajouter (0.5) → Copies (1, 2, ...) → Totaux (Infinity)
    const fieldType = ((field as any).type || '').toString();
    if (fieldType === 'REPEATER_ADD_BUTTON' || fieldType === 'REPEATER_REMOVE_INSTANCE_BUTTON') {
      return 0.5; // Après les originaux, avant les copies
    }
    const suffix = extractFieldSuffix(field);
    if (suffix === BASE_SUFFIX_KEY) return 0; // Originaux = 0
    const num = parseInt(suffix, 10);
    return Number.isFinite(num) ? num : 0;
  };
  
  // Trier les champs : par suffixe d'abord, puis par ordre TBL (position dans le tableau d'entrée)
  const indexed = fields.map((f, i) => ({ field: f, originalIndex: i, suffixNum: getSuffixNumber(f) }));
  indexed.sort((a, b) => {
    // 1. Trier par suffixe (0 = originaux, 1, 2, ..., Infinity = totaux)
    if (a.suffixNum !== b.suffixNum) return a.suffixNum - b.suffixNum;
    // 2. À suffixe égal, conserver l'ordre TBL d'entrée
    return a.originalIndex - b.originalIndex;
  });
  
  // Reconstruire la liste triée et marquer isLastInCopyGroup
  const sortedFields: TBLField[] = [];
  for (let i = 0; i < indexed.length; i++) {
    const current = indexed[i];
    const next = indexed[i + 1];
    const isLastInGroup = !next || current.suffixNum !== next.suffixNum;
    sortedFields.push({ ...current.field, isLastInCopyGroup: isLastInGroup });
  }
  
  // Retourner un seul groupe pour garder la compatibilité avec le rendu flatMap
  return [{
    suffix: '__SUFFIX_ORDERED__',
    fields: sortedFields
  }];
};

interface DisplayAppearanceTokens {
  size: 'sm' | 'md' | 'lg';
  variant: string;
  align: 'left' | 'center' | 'right';
  accentColor: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  labelColor: string;
  labelFontSize: number;
  labelFontWeight: FontWeightValue;
  labelUppercase: boolean;
  valueFontSize: number;
  valueFontWeight: FontWeightValue;
  borderWidth: number;
  radius: number;
  shadow?: string;
  minHeight: number;
  paddingX: number;
  paddingY: number;
}

interface DisplayAppearanceResolution {
  tokens: DisplayAppearanceTokens;
  styleOverrides?: React.CSSProperties;
}

const DISPLAY_SIZE_PRESETS: Record<'sm' | 'md' | 'lg', Partial<DisplayAppearanceTokens>> = {
  sm: { paddingX: 8, paddingY: 8, labelFontSize: 11, valueFontSize: 12, minHeight: 60 },
  md: { paddingX: 12, paddingY: 12, labelFontSize: 13, valueFontSize: 14, minHeight: 80 },
  lg: { paddingX: 16, paddingY: 16, labelFontSize: 15, valueFontSize: 18, minHeight: 100 }
};

const STATUS_ACCENTS: Record<string, string> = {
  info: '#0ea5e9',
  success: '#16a34a',
  warning: '#f97316',
  danger: '#ef4444',
  error: '#ef4444',
  alert: '#f97316',
  primary: '#3b82f6',
  neutral: '#64748b'
};

const DEFAULT_DISPLAY_ACCENT = '#0f766e';
const DEFAULT_DISPLAY_BACKGROUND = 'linear-gradient(135deg, #0f766e 0%, #0b4f46 100%)';
const DEFAULT_DISPLAY_BORDER = 'rgba(6,80,70,0.55)';
const DEFAULT_DISPLAY_LABEL = '#ecfdf5';
const DEFAULT_DISPLAY_TEXT = '#f8fffb';
const DEFAULT_DISPLAY_SHADOW = '0 25px 45px rgba(5,50,45,0.25)';

const DEFAULT_DISPLAY_TOKENS: DisplayAppearanceTokens = {
  size: 'md',
  variant: 'default',
  align: 'center',
  accentColor: DEFAULT_DISPLAY_ACCENT,
  backgroundColor: DEFAULT_DISPLAY_BACKGROUND,
  borderColor: DEFAULT_DISPLAY_BORDER,
  textColor: '#334155',
  labelColor: DEFAULT_DISPLAY_ACCENT,
  labelFontSize: 13,
  labelFontWeight: 600,
  labelUppercase: false,
  valueFontSize: 14,
  valueFontWeight: 700,
  borderWidth: 2,
  radius: 12,
  shadow: undefined,
  minHeight: 80,
  paddingX: 12,
  paddingY: 12
};

const pickDefined = <T,>(...values: Array<T | null | undefined>): T | undefined => {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return undefined;
};

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const coerceFontWeight = (value: unknown, fallback: FontWeightValue): FontWeightValue => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const normalized = value.trim().toLowerCase();
    if (['normal', 'bold', 'lighter', 'bolder'].includes(normalized)) {
      return normalized as FontWeightValue;
    }
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const parseAlignPreference = (value: unknown, fallback: DisplayAppearanceTokens['align']): DisplayAppearanceTokens['align'] => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'left' || normalized === 'center' || normalized === 'right') return normalized;
  if (normalized === 'start') return 'left';
  if (normalized === 'end') return 'right';
  return fallback;
};

const normalizeUiValue = (value: unknown): string | number | boolean | null | undefined => {
  if (value === null || value === undefined) return value as null | undefined;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    const parts = value.map((entry) => normalizeUiValue(entry)).filter((entry) => entry !== undefined && entry !== null);
    return parts.join(', ');
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const direct = obj.value ?? obj.label ?? obj.text ?? obj.display ?? obj.name ?? obj.title;
    if (direct !== undefined && direct !== null) {
      return normalizeUiValue(direct) as string | number | boolean | null | undefined;
    }
    const street = obj.street ?? obj.address ?? obj.line1 ?? obj.route;
    const city = obj.city ?? obj.locality;
    const zip = obj.zipCode ?? obj.postalCode ?? obj.zip;
    const country = obj.country ?? obj.pays;
    const parts = [street, zip, city, country]
      .map((part) => (part !== undefined && part !== null ? String(part).trim() : ''))
      .filter(Boolean);
    if (parts.length > 0) return parts.join(', ');
    try {
      return JSON.stringify(obj);
    } catch {
      return String(obj);
    }
  }
  return String(value);
};

const safeColor = (value: unknown, fallback: string): string => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return fallback;
};

const extractHexTuple = (color: string): [number, number, number] | undefined => {
  const normalized = color.replace('#', '');
  if (normalized.length === 3) {
    const expanded = normalized.split('').map((char) => char + char).join('');
    const intVal = parseInt(expanded, 16);
    if (Number.isNaN(intVal)) return undefined;
    return [
      (intVal >> 16) & 255,
      (intVal >> 8) & 255,
      intVal & 255
    ];
  }
  // 8-char hex (with alpha) — extract RGB only (ignore alpha)
  if (normalized.length === 8) {
    const intVal = parseInt(normalized.substring(0, 6), 16);
    if (Number.isNaN(intVal)) return undefined;
    return [
      (intVal >> 16) & 255,
      (intVal >> 8) & 255,
      intVal & 255
    ];
  }
  if (normalized.length === 6) {
    const intVal = parseInt(normalized, 16);
    if (Number.isNaN(intVal)) return undefined;
    return [
      (intVal >> 16) & 255,
      (intVal >> 8) & 255,
      intVal & 255
    ];
  }
  return undefined;
};

const withAlpha = (color: string, alpha: number, fallbackAccent?: string): string => {
  if (typeof color === 'string' && color.trim().startsWith('#')) {
    const tuple = extractHexTuple(color.trim());
    if (tuple) {
      return `rgba(${tuple[0]}, ${tuple[1]}, ${tuple[2]}, ${alpha})`;
    }
  }
  if (fallbackAccent && fallbackAccent !== color) {
    return withAlpha(fallbackAccent, alpha);
  }
  return `rgba(14,165,233,${alpha})`;
};

/**
 * Normalise une couleur hex potentiellement avec canal alpha (8 chars) en hex 6 chars.
 * Gère aussi les formats rgb/rgba en extrayant un hex propre.
 */
const normalizeHexColor = (color: string): string => {
  if (!color || typeof color !== 'string') return color;
  const trimmed = color.trim();
  // Hex 8-char (#rrggbbaa) → garder seulement #rrggbb
  if (/^#[0-9a-fA-F]{8}$/.test(trimmed)) {
    return trimmed.substring(0, 7);
  }
  // rgb(r,g,b) ou rgba(r,g,b,a) → convertir en hex
  const rgbMatch = trimmed.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }
  return trimmed;
};

/**
 * Détermine si une couleur hex est "sombre" (luminosité < 128).
 * Utilisé pour adapter le texte (blanc sur fond sombre, teal sur fond clair).
 */
const isColorDark = (hex: string): boolean => {
  const tuple = extractHexTuple(hex);
  if (!tuple) return true; // Par défaut considérer comme sombre
  // Luminance relative perceptuelle (formule ITU-R BT.601)
  const luminance = 0.299 * tuple[0] + 0.587 * tuple[1] + 0.114 * tuple[2];
  return luminance < 128;
};

const buildDefaultVariant = (accent: string): Partial<DisplayAppearanceTokens> => ({
  borderColor: withAlpha(accent, 0.35, accent),
  backgroundColor: withAlpha(accent, 0.12, accent),
  labelColor: accent
});

const extractSubTabAssignments = (entity?: { subTabKey?: unknown; subTabKeys?: unknown }): string[] => {
  if (!entity) return [];
  const assignments: string[] = [];
  const pushValue = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) {
      assignments.push(value.trim());
    } else if (value !== undefined && value !== null) {
      const normalized = String(value).trim();
      if (normalized) assignments.push(normalized);
    }
  };

  if (Array.isArray((entity as any).subTabKeys)) {
    (entity as any).subTabKeys.forEach(pushValue);
  }

  const single = (entity as any).subTabKey;
  if (Array.isArray(single)) {
    single.forEach(pushValue);
  } else {
    pushValue(single);
  }

  return Array.from(new Set(assignments));
};

const buildOutlineVariant = (accent: string): Partial<DisplayAppearanceTokens> => ({
  borderColor: accent,
  backgroundColor: '#ffffff',
  labelColor: accent,
  borderWidth: 2
});

const buildFilledVariant = (accent: string): Partial<DisplayAppearanceTokens> => ({
  borderColor: accent,
  backgroundColor: accent,
  labelColor: '#ffffff',
  textColor: '#ffffff',
  shadow: '0 10px 30px rgba(15,23,42,0.2)'
});

const buildGhostVariant = (): Partial<DisplayAppearanceTokens> => ({
  borderColor: 'transparent',
  backgroundColor: 'transparent',
  labelColor: '#475569',
  textColor: '#0f172a',
  borderWidth: 0
});

const buildBorderlessVariant = (): Partial<DisplayAppearanceTokens> => ({
  borderColor: 'transparent',
  backgroundColor: '#ffffff',
  labelColor: '#475569',
  borderWidth: 0
});

const buildSoftVariant = (accent: string): Partial<DisplayAppearanceTokens> => ({
  borderColor: withAlpha(accent, 0.25, accent),
  backgroundColor: withAlpha(accent, 0.18, accent),
  labelColor: accent,
  borderWidth: 1
});

const buildBadgeVariant = (accent: string): Partial<DisplayAppearanceTokens> => ({
  borderColor: 'transparent',
  backgroundColor: withAlpha(accent, 0.2, accent),
  labelColor: accent,
  textColor: accent,
  borderWidth: 0,
  radius: 999,
  minHeight: 48,
  paddingX: 14,
  paddingY: 10
});

const buildGlassVariant = (accent: string): Partial<DisplayAppearanceTokens> => ({
  borderColor: withAlpha(accent, 0.35, accent),
  backgroundColor: 'rgba(15,23,42,0.18)',
  textColor: '#ffffff',
  labelColor: '#ffffff',
  shadow: '0 25px 45px rgba(15,23,42,0.35)',
  borderWidth: 1
});

const DISPLAY_VARIANT_BUILDERS: Record<string, (accent: string) => Partial<DisplayAppearanceTokens>> = {
  default: buildDefaultVariant,
  outline: buildOutlineVariant,
  filled: buildFilledVariant,
  ghost: buildGhostVariant,
  borderless: buildBorderlessVariant,
  soft: buildSoftVariant,
  badge: buildBadgeVariant,
  glass: buildGlassVariant
};

const resolveDisplayAppearance = (field: TBLField): DisplayAppearanceResolution => {
  const appearance = (field.appearanceConfig || {}) as Record<string, unknown>;
  const metadataAppearance = (field.metadata && typeof field.metadata === 'object'
    ? ((field.metadata as Record<string, unknown>).appearance as Record<string, unknown> | undefined)
    : undefined) || {};
  const appearanceStyle = typeof appearance.style === 'object' && appearance.style
    ? (appearance.style as React.CSSProperties)
    : undefined;
  const metadataAppearanceStyle = typeof metadataAppearance.style === 'object' && metadataAppearance.style
    ? (metadataAppearance.style as React.CSSProperties)
    : undefined;

  const rawSize = pickDefined(
    appearance.size as string | undefined,
    metadataAppearance.size as string | undefined,
    (field as unknown as { appearance_size?: string }).appearance_size,
    'md'
  ) as string;
  const normalizedSize = ['sm', 'md', 'lg'].includes((rawSize || '').toLowerCase())
    ? (rawSize as 'sm' | 'md' | 'lg')
    : 'md';

  const rawVariant = pickDefined(
    appearance.variant as string | undefined,
    metadataAppearance.variant as string | undefined,
    (field as unknown as { appearance_variant?: string }).appearance_variant,
    'default'
  ) as string;
  const normalizedVariant = (rawVariant || 'default').toLowerCase();

  const intentKey = pickDefined(
    appearance.intent as string | undefined,
    appearance.tone as string | undefined,
    metadataAppearance.intent as string | undefined,
    metadataAppearance.tone as string | undefined
  );

  const hasCustomPalette = Boolean(pickDefined(
    appearance.accentColor as string | undefined,
    appearance.primaryColor as string | undefined,
    appearance.color as string | undefined,
    appearance.backgroundColor as string | undefined,
    appearance.cardBackground as string | undefined,
    appearanceStyle?.backgroundColor,
    metadataAppearance.accentColor as string | undefined,
    metadataAppearance.primaryColor as string | undefined,
    metadataAppearance.color as string | undefined,
    metadataAppearance.backgroundColor as string | undefined,
    metadataAppearance.cardBackground as string | undefined,
    metadataAppearanceStyle?.backgroundColor
  ));

  const initialAccent = pickDefined(
    appearance.accentColor as string | undefined,
    appearance.primaryColor as string | undefined,
    appearance.color as string | undefined,
    metadataAppearance.accentColor as string | undefined,
    STATUS_ACCENTS[normalizedVariant],
    intentKey ? STATUS_ACCENTS[(intentKey || '').toLowerCase()] : undefined,
    DEFAULT_DISPLAY_ACCENT
  ) as string;

  const tokens: DisplayAppearanceTokens = {
    ...DEFAULT_DISPLAY_TOKENS,
    ...DISPLAY_SIZE_PRESETS[normalizedSize],
    size: normalizedSize,
    variant: normalizedVariant,
    accentColor: initialAccent
  };

  let variantBuilder = DISPLAY_VARIANT_BUILDERS[normalizedVariant];
  if (!variantBuilder && STATUS_ACCENTS[normalizedVariant]) {
    tokens.accentColor = STATUS_ACCENTS[normalizedVariant];
    variantBuilder = DISPLAY_VARIANT_BUILDERS.soft;
  }
  if (!variantBuilder) {
    const statusAccent = intentKey ? STATUS_ACCENTS[(intentKey || '').toLowerCase()] : undefined;
    if (statusAccent) {
      tokens.accentColor = statusAccent;
      variantBuilder = DISPLAY_VARIANT_BUILDERS.soft;
    }
  }
  if (!variantBuilder) {
    variantBuilder = DISPLAY_VARIANT_BUILDERS.default;
  }
  Object.assign(tokens, variantBuilder(tokens.accentColor));

  if (!hasCustomPalette && tokens.variant === 'default') {
    tokens.backgroundColor = DEFAULT_DISPLAY_BACKGROUND;
    tokens.borderColor = DEFAULT_DISPLAY_BORDER;
    tokens.textColor = DEFAULT_DISPLAY_TEXT;
    tokens.labelColor = DEFAULT_DISPLAY_LABEL;
    tokens.shadow = tokens.shadow ?? DEFAULT_DISPLAY_SHADOW;
  }

  tokens.backgroundColor = safeColor(
    pickDefined(
      appearance.backgroundColor as string | undefined,
      appearance.cardBackground as string | undefined,
      appearanceStyle?.backgroundColor,
      metadataAppearance.backgroundColor as string | undefined,
      metadataAppearance.cardBackground as string | undefined,
      metadataAppearanceStyle?.backgroundColor
    ),
    tokens.backgroundColor
  );

  tokens.borderColor = safeColor(
    pickDefined(
      appearance.borderColor as string | undefined,
      appearance.cardBorderColor as string | undefined,
      (appearance.style as React.CSSProperties | undefined)?.borderColor,
      metadataAppearance.borderColor as string | undefined
    ),
    tokens.borderColor
  );

  tokens.textColor = safeColor(
    pickDefined(
      appearance.textColor as string | undefined,
      appearance.valueColor as string | undefined,
      metadataAppearance.textColor as string | undefined,
      metadataAppearance.valueColor as string | undefined
    ),
    tokens.textColor
  );

  tokens.labelColor = safeColor(
    pickDefined(
      appearance.labelColor as string | undefined,
      appearance.badgeColor as string | undefined,
      metadataAppearance.labelColor as string | undefined
    ),
    tokens.labelColor
  );

  tokens.align = parseAlignPreference(
    pickDefined(
      appearance.textAlign as string | undefined,
      appearance.align as string | undefined,
      appearance.contentAlign as string | undefined,
      metadataAppearance.textAlign as string | undefined
    ),
    tokens.align
  );

  const minHeightOverride = toNumber(pickDefined(appearance.minHeight, appearance.cardMinHeight, metadataAppearance.minHeight));
  if (typeof minHeightOverride === 'number') {
    tokens.minHeight = minHeightOverride;
  }

  const radiusOverride = toNumber(pickDefined(appearance.borderRadius, appearance.radius, metadataAppearance.borderRadius));
  if (typeof radiusOverride === 'number') {
    tokens.radius = radiusOverride;
  }

  const borderWidthOverride = toNumber(pickDefined(appearance.borderWidth, metadataAppearance.borderWidth));
  if (typeof borderWidthOverride === 'number') {
    tokens.borderWidth = borderWidthOverride;
  }

  const labelSizeOverride = toNumber(pickDefined(appearance.labelFontSize, metadataAppearance.labelFontSize));
  if (typeof labelSizeOverride === 'number') {
    tokens.labelFontSize = labelSizeOverride;
  }

  tokens.labelFontWeight = coerceFontWeight(
    pickDefined(appearance.labelFontWeight, metadataAppearance.labelFontWeight),
    tokens.labelFontWeight
  );

  tokens.labelUppercase = pickDefined(appearance.labelUppercase as boolean | undefined, metadataAppearance.labelUppercase as boolean | undefined, tokens.labelUppercase) ?? tokens.labelUppercase;

  const valueSizeOverride = toNumber(pickDefined(appearance.valueFontSize, metadataAppearance.valueFontSize));
  if (typeof valueSizeOverride === 'number') {
    tokens.valueFontSize = valueSizeOverride;
  }

  tokens.valueFontWeight = coerceFontWeight(
    pickDefined(appearance.valueFontWeight, metadataAppearance.valueFontWeight, appearance.fontWeight),
    tokens.valueFontWeight
  );

  const paddingAll = toNumber(pickDefined(appearance.cardPadding, appearance.padding));
  if (typeof paddingAll === 'number') {
    tokens.paddingX = paddingAll;
    tokens.paddingY = paddingAll;
  }
  const paddingX = toNumber(pickDefined(appearance.cardPaddingX, appearance.paddingX));
  if (typeof paddingX === 'number') tokens.paddingX = paddingX;
  const paddingY = toNumber(pickDefined(appearance.cardPaddingY, appearance.paddingY));
  if (typeof paddingY === 'number') tokens.paddingY = paddingY;

  const elevation = toNumber(pickDefined(appearance.elevation, metadataAppearance.elevation));
  if (typeof elevation === 'number' && elevation > 0) {
    tokens.shadow = tokens.shadow ?? `0 ${Math.min(elevation, 8)}px ${18 + elevation * 2}px rgba(15,23,42,${0.08 + elevation * 0.02})`;
  }

  if (typeof appearance.shadow === 'string' && appearance.shadow.trim()) {
    tokens.shadow = appearance.shadow.trim();
  }

  const styleOverrides = [appearance.cardStyle, appearance.style, metadataAppearance.cardStyle, metadataAppearance.style]
    .find((candidate): candidate is React.CSSProperties => !!candidate && typeof candidate === 'object' && !Array.isArray(candidate));

  return { tokens, styleOverrides };
};

const buildDisplayCardStyle = (
  tokens: DisplayAppearanceTokens,
  overrides?: React.CSSProperties
): React.CSSProperties => {
  const style: React.CSSProperties = {
    border: tokens.borderWidth > 0 ? `${tokens.borderWidth}px solid ${tokens.borderColor}` : 'none',
    borderRadius: tokens.radius,
    minHeight: tokens.minHeight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    textAlign: tokens.align,
    boxShadow: tokens.shadow
  };

  if (typeof tokens.backgroundColor === 'string' && tokens.backgroundColor.includes('gradient')) {
    style.background = tokens.backgroundColor;
  } else {
    style.backgroundColor = tokens.backgroundColor;
  }

  return {
    ...style,
    ...overrides
  };
};

const buildDisplayLabelStyle = (tokens: DisplayAppearanceTokens): React.CSSProperties => {
  const LINE_HEIGHT_RATIO = 1.2;
  const lineHeightPx = tokens.labelFontSize * LINE_HEIGHT_RATIO;
  const twoLineHeightPx = lineHeightPx * 2;

  return {
    color: tokens.labelColor,
    fontSize: `${tokens.labelFontSize}px`,
    fontWeight: tokens.labelFontWeight,
    textTransform: tokens.labelUppercase ? 'uppercase' : undefined,
    letterSpacing: tokens.labelUppercase ? '0.05em' : undefined,
    marginBottom: 4,
    display: 'block',
    lineHeight: `${lineHeightPx}px`,
    minHeight: `${twoLineHeightPx}px`,
    maxHeight: `${twoLineHeightPx}px`,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'normal'
  };
};

const buildDisplayValueStyle = (tokens: DisplayAppearanceTokens): React.CSSProperties => ({
  color: tokens.textColor,
  fontSize: `${tokens.valueFontSize}px`,
  fontWeight: tokens.valueFontWeight,
  textAlign: tokens.align
});

// 🔧 FONCTION CRITIQUE: Namespacing pour les champs du repeater
const namespaceRepeaterField = (
  srcField: TBLField,
  namespace: RepeaterNamespaceMeta,
  options: CloneRepeaterOptions = {}
): TBLField => {
  const applyLabelPrefix = options.applyLabelPrefix !== false;
  const cloned: TBLField = JSON.parse(JSON.stringify(srcField));

  const originalFieldId =
    (srcField as unknown as { originalFieldId?: string }).originalFieldId ||
    ((srcField as unknown as { metadata?: { originalFieldId?: string; originalNodeId?: string } }).metadata?.originalFieldId) ||
    (srcField as unknown as { repeaterTemplateNodeId?: string }).repeaterTemplateNodeId ||
    srcField.id;

  // 🔑 CRITIQUE: Appliquer le namespace à l'ID pour qu'on puisse retrouver la valeur dans formData
  cloned.id = `${namespace.prefix}${originalFieldId}`;

  if (applyLabelPrefix && namespace.labelPrefix) {
    cloned.label = `${namespace.labelPrefix} - ${srcField.label}`;
    if (cloned.sharedReferenceName) {
      cloned.sharedReferenceName = `${namespace.labelPrefix} - ${cloned.sharedReferenceName}`;
    }
  }

  // Gestion des sharedReferenceIds
  // ⚠️ IMPORTANT: Ne PAS préfixer les sharedReferenceIds
  // Ils référencent des nœuds «raw» dans allNodes côté frontend.
  // Le resolver s'appuie sur ces IDs non-namespacés pour retrouver
  // les nœuds de référence et injecter les conditionalFields.
  // On préserve donc les IDs tels quels.

  if (cloned.config && typeof (cloned.config as Record<string, unknown>).sourceRef === 'string') {
    const rawRef = (cloned.config as Record<string, unknown>).sourceRef as string;
    const isBackendRef = (
      rawRef.startsWith('condition:') ||
      rawRef.startsWith('formula:') ||
      rawRef.startsWith('node-formula:') ||
      rawRef.startsWith('@value.') ||
      rawRef.startsWith('@table.') ||
      rawRef.startsWith('shared-ref-') ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawRef) ||
      /^node_[0-9]+_[a-z0-9]+$/i.test(rawRef)
    );
    if (!isBackendRef) {
      (cloned.config as Record<string, unknown>).sourceRef = `${namespace.prefix}${rawRef}`;
    }
  }

  // 🎯 Transformer les références des conditions pour pointer vers les champs namespacés
  if (Array.isArray(cloned.conditions)) {
    cloned.conditions = cloned.conditions.map((condition) => ({
      ...condition,
      dependsOn: `${namespace.prefix}${condition.dependsOn}`
    }));
  }

  // 🎯 NOUVEAU : Cloner et préfixer les filterConditions du tableLookupConfig
  if (cloned.tableLookupConfig && Array.isArray(cloned.tableLookupConfig.filterConditions)) {
    cloned.tableLookupConfig.filterConditions = cloned.tableLookupConfig.filterConditions.map(condition => {
      if (condition.fieldId) {
        return {
          ...condition,
          fieldId: `${namespace.prefix}${condition.fieldId}`
        };
      }
      return condition;
    });
  }

  // 🔥 CRITIQUE: Préserver le selectConfig original du champ principal pour les références partagées
  if (srcField.selectConfig) {
    cloned.selectConfig = JSON.parse(JSON.stringify(srcField.selectConfig));
  }

  // 🎯 NOUVEAU : Cloner et préfixer les conditionalFields des options pour les repeaters
  if (Array.isArray(cloned.options)) {
    
    // 🔬 ANALYSE CASCADE: Afficher le champ copié

    cloned.options = cloned.options.map((option, _optIdx) => {
      // 🔥 CORRECTION CRITIQUE: Deep clone pour préserver sharedReferenceIds
      // Le shallow copy { ...option } ne clone pas les objets imbriqués !
      const clonedOption = JSON.parse(JSON.stringify(option));

      // ⚠️ NE PAS préfixer les sharedReferenceIds - ils doivent pointer vers les nœuds originaux dans allNodes
      // Les nœuds référencés existent déjà dans allNodes avec leurs IDs d'origine
      // Le système les trouvera et créera automatiquement les champs conditionnels
      
      if (!Array.isArray(option.conditionalFields)) {
        return clonedOption;
      }
      
      clonedOption.conditionalFields = option.conditionalFields.map((cf) => {
        // 🔬 AVANT clonage
        const cfSharedRefsBefore = cf.sharedReferenceIds || cf.metadata?.sharedReferenceIds;
        
        // Appliquer le namespacing au champ conditionnel lui-même
        const namespacedCF = namespaceRepeaterField(cf, namespace, {
          applyLabelPrefix: true, // Appliquer le préfixe "Versant 1 - " etc.
          templateNodeId: (cf as any).originalFieldId || cf.id
        });
        
        // 🔬 APRÈS clonage
        const cfSharedRefsAfter = namespacedCF.sharedReferenceIds || namespacedCF.metadata?.sharedReferenceIds;
        
        if (Array.isArray(cfSharedRefsBefore) && cfSharedRefsBefore.length > 0) {
          if (!Array.isArray(cfSharedRefsAfter) || cfSharedRefsAfter.length === 0) {
            // sharedReferenceIds PERDU pendant le clonage!
          } else {
            // sharedReferenceIds préservé
          }
        }
        
        // 🔥 CRITIQUE: Préserver le selectConfig original pour les références partagées
        if (cf.selectConfig) {
          namespacedCF.selectConfig = JSON.parse(JSON.stringify(cf.selectConfig));
        }
        
        return namespacedCF;
      });
      
      return clonedOption;
    });
  }

  const originalNodeId =
    (srcField as unknown as { metadata?: { originalNodeId?: string; originalFieldId?: string } }).metadata?.originalNodeId ||
    (srcField as unknown as { metadata?: { originalFieldId?: string } }).metadata?.originalFieldId ||
    originalFieldId;

  cloned.metadata = {
    ...(cloned.metadata || {}),
    originalFieldId,
    originalNodeId
  };

  const templateNodeId =
    options.templateNodeId ||
    (srcField as unknown as { repeaterTemplateNodeId?: string }).repeaterTemplateNodeId ||
    originalFieldId;

  // 🎯 CORRECTION: namespaceRepeaterField EST UTILISÉ POUR LES REPEATERS SEULEMENT
  // Ce flag doit être TRUE pour que la logique d'injection de conditionalFields fonctionne correctement
  (cloned as unknown as Record<string, unknown>).isRepeaterInstance = true;
  (cloned as unknown as Record<string, unknown>).originalFieldId = originalFieldId;
  (cloned as unknown as Record<string, unknown>).repeaterParentId = namespace.parentId;
  (cloned as unknown as Record<string, unknown>).repeaterInstanceIndex = namespace.instanceIndex;
  (cloned as unknown as Record<string, unknown>).repeaterInstanceLabel = namespace.labelPrefix;
  (cloned as unknown as Record<string, unknown>).repeaterTemplateNodeId = templateNodeId;
  (cloned as unknown as Record<string, unknown>).repeaterNamespace = namespace;

  return cloned;
};

// 🎨 FORMATAGE DES VALEURS AVEC CONFIGURATION
const formatValueWithConfig = (
  value: number | string | boolean | null,
  config: { displayFormat?: string; unit?: string; precision?: number }
): string | number | boolean | null => {
  if (value === null || value === undefined) return null;

  const { displayFormat = 'number', unit, precision = 2 } = config;

  switch (displayFormat) {
    case 'currency': {
      const numValue = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(numValue)) return String(value);
      const formatted = numValue.toLocaleString('fr-FR', {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision
      });
      return unit ? `${formatted} ${unit}` : formatted;
    }
      
    case 'percentage': {
      const pctValue = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(pctValue)) return String(value);
      return `${pctValue.toFixed(precision)}%`;
    }
      
    case 'number': {
      const rawNumValue = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(rawNumValue)) return String(value);
      const numFormatted = rawNumValue.toLocaleString('fr-FR', {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision
      });
      
      // Si l'unité est €, traiter comme une devise
      if (unit === '€') {
        return `${numFormatted} €`;
      }
      
      return unit ? `${numFormatted} ${unit}` : numFormatted;
    }
      
    case 'boolean':
      return Boolean(value);
      
    default:
      return String(value);
  }
};

interface TBLSectionRendererProps {
  section: TBLSection;
  formData: TBLFormData;
  onChange: (fieldId: string, value: unknown) => void;
  treeId?: string; // ID de l'arbre TreeBranchLeaf
  allNodes?: RawTreeNode[]; // 🔥 NOUVEAU: Tous les nœuds pour Cascader
  allSections?: TBLSection[]; // 🔥 NOUVEAU: Toutes les sections pour chercher dans "Nouveau Section"
  disabled?: boolean;
  level?: number; // Niveau de profondeur pour le style
  parentConditions?: Record<string, unknown>; // Conditions héritées du parent
  isValidation?: boolean; // Mode validation (affichage des erreurs)
  submissionId?: string | null;
  activeSubTab?: string; // 🔧 FIX: Sous-onglet actif pour filtrer les champs conditionnels
  allSubTabs?: Array<{ key: string; label: string }>; // 🔧 FIX: Liste des sous-onglets reconnus pour filtrage cohérent
}

const TBLSectionRenderer: React.FC<TBLSectionRendererProps> = ({
  section,
  formData,
  onChange,
  treeId,
  allNodes = [],
  allSections = [],
  disabled = false,
  level = 0,
  parentConditions = {},
  isValidation = false,
  submissionId,
  activeSubTab,
  allSubTabs = []
}) => {
  // ✅ CRITIQUE: Stabiliser l'API pour éviter les re-rendus à chaque frappe
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]);
  
  // 🚀 CRITIQUE: Accès aux conditions inversées pour les champs SHOW/HIDE (sum-total, etc.)
  const batchCtx = useTBLBatchOptional();
  const getConditionsTargetingNode = batchCtx?.getConditionsTargetingNode;
  const batchReady = batchCtx?.isReady ?? false;
  
  // dlog alias to global debug logger (globalDlog checks DEBUG_VERBOSE)
  const dlog = globalDlog;

  const resolveEventTreeId = useCallback(() => {
    if (treeId && String(treeId).length > 0) {
      return String(treeId);
    }
    if (typeof window !== 'undefined') {
      const fallback = (window as any)?.__TBL_LAST_TREE_ID
        || (window as any)?.__TBL_TREE_ID
        || (window as any)?.TBL_LAST_TREE_ID;
      if (fallback) {
        return String(fallback);
      }
    }
    return undefined;
  }, [treeId]);
  
  // 🔥 FORCE RETRANSFORM LISTENER: Listen for displayAlways updates
  const [, forceUpdate] = useState({});
  
  // 🎯 État pour ouvrir/fermer la section Données (bulles)
  const [isDataSectionOpen, setIsDataSectionOpen] = useState(true);
  
  // 🎯 État pour le panneau de détails enfants (clic sur bulle parent)
  const [expandedBranchId, setExpandedBranchId] = useState<string | null>(null);
  // Refs pour partager les maps entre le IIFE de rendu et le Drawer
  const branchChildrenMap_ref = useRef<Map<string, TBLField[]>>(new Map());
  const branchInfoMap_ref = useRef<Map<string, { id: string; label: string; type: string }>>(new Map());
  
  // 🚫 PROTECTION ANTI-DOUBLE-CLIC pour les boutons de répétition
  const [isRepeating, setIsRepeating] = useState<Record<string, boolean>>({});
  const isRepeatingRef = useRef<Record<string, boolean>>({});
  
  useEffect(() => {
    const handleForceRetransform = (event: Event) => {
      const customEvent = event as CustomEvent<{ nodeId: string; fieldName: string }>;
      if (isTBLDebugEnabled()) tblLog('🔄 [TBLSectionRenderer] Received tbl-force-retransform for:', customEvent.detail?.nodeId, 'field:', customEvent.detail?.fieldName);
      
      // Force re-render by updating a dummy state
      forceUpdate({});
    };
    
    window.addEventListener('tbl-force-retransform', handleForceRetransform);
    return () => window.removeEventListener('tbl-force-retransform', handleForceRetransform);
  }, []);
  
  // ✨ ÉTAT LOCAL POUR FILTRAGE DES CHAMPS SUPPRIMÉS (SANS RECHARGEMENT VISIBLE)
  // ❌ SUPPRESSION DU SYSTÈME DE FILTRAGE LOCAL
  // Le forceRefresh + refetch silencieux gère déjà correctement la mise à jour
  // Pas besoin de filtrage temporaire avec deletedFieldIds
  
  // � DEBUG GLOBAL: Voir tous les champs reçus par cette section
  // ⚠️ DÉSACTIVÉ pour performance - réactiver si besoin de debug
  /*
  useEffect(() => {
    const copiesInSection = (section.fields || []).filter(field => {
      const meta = (field.metadata || {}) as any;
      return !!meta?.sourceTemplateId;
    });
    
    if (copiesInSection.length > 0) {
      if (isTBLDebugEnabled()) tblLog(`🚨 [SECTION-COPIES] Section "${section.title}" a reçu ${copiesInSection.length} copies:`, 
        copiesInSection.map(f => `${f.label} (source: ${(f.metadata as any)?.sourceTemplateId})`));
    }
  }, [section.fields, section.title]);
  */

  // �🔍 EXPOSITION GLOBALE POUR DÉBOGAGE
  // ⚠️ DÉSACTIVÉ pour performance - réactiver si besoin de debug
  /*
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.TBL_FORM_DATA = formData;
      window.TBL_ALL_NODES = allNodes;
      window.debugSharedRefs = () => {
        if (isTBLDebugEnabled()) tblLog('🔍 [DEBUG SUMMARY]');
        if (isTBLDebugEnabled()) tblLog('TBL_CASCADER_NODE_IDS:', window.TBL_CASCADER_NODE_IDS);
        if (isTBLDebugEnabled()) tblLog('TBL_FORM_DATA pour Versant:', Object.entries(formData).filter(([k]) => k.includes('versant') || k.includes('Versant') || k.includes('e207d8bf')));
        if (isTBLDebugEnabled()) tblLog('TBL_ALL_NODES count:', allNodes.length);
        if (isTBLDebugEnabled()) tblLog('Nœuds de type leaf_option:', allNodes.filter(n => n.type === 'leaf_option').length);
        if (isTBLDebugEnabled()) tblLog('Nœuds avec sharedReferenceIds:', allNodes.filter(n => n.sharedReferenceIds && n.sharedReferenceIds.length > 0).length);
      };
    }
  }, [formData, allNodes]);
  */
  
  // 🔥 FONCTION RECURSIVE STABLE : Recherche récursive des sharedReferenceIds dans toute la hiérarchie PAR PARENTID
  const findAllSharedReferencesRecursive = useCallback((nodeId: string, allNodes: any[], visited = new Set<string>()): string[] => {
    if (visited.has(nodeId)) return [];
    visited.add(nodeId);
    
    const node = allNodes.find(n => n.id === nodeId);
    if (!node) {
      return [];
    }
    
    const sharedRefs: string[] = [];
    
    // Ajouter les sharedReferenceIds du nœud actuel
    if (Array.isArray(node.sharedReferenceIds)) {
      sharedRefs.push(...node.sharedReferenceIds);
    }
    // Fallback: considérer aussi la référence unique si présente
    if (node.sharedReferenceId && typeof node.sharedReferenceId === 'string') {
      sharedRefs.push(node.sharedReferenceId);
    }
    
    // 🎯 RECHERCHE PAR PARENTID : Trouver tous les nœuds enfants
    const childrenByParentId = allNodes.filter(n => n.parentId === nodeId);
    
    for (const child of childrenByParentId) {
      const childRefs = findAllSharedReferencesRecursive(child.id, allNodes, visited);
      sharedRefs.push(...childRefs);
    }
    
    return sharedRefs;
  }, []);

  // Helper to resolve matching node by cascaderNodeId, node UUID in selectedValue, or label/value in allNodes
  const resolveMatchingNodeFromSelectedValue = useCallback((selectedValue: unknown, cascaderNodeId?: string) : RawTreeNode | undefined => {
    try {
      if (cascaderNodeId) {
        const byId = allNodes.find(n => n.id === cascaderNodeId);
        if (byId) return byId;
      }
      if (typeof selectedValue === 'string' && selectedValue.length > 0) {
        const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
        const candidates = new Set<string>();
        candidates.add(selectedValue);
        const afterLastUnderscore = selectedValue.split('_').pop();
        if (afterLastUnderscore) candidates.add(afterLastUnderscore);
        const uuidMatch = selectedValue.match(uuidRegex);
        if (uuidMatch && uuidMatch[0]) candidates.add(uuidMatch[0]);
        for (const cid of Array.from(candidates)) {
          const foundById = allNodes.find(node => node.id === cid);
          if (foundById) return foundById;
        }
      }
      // Fallback: find by label/value
      if (typeof selectedValue === 'string' && allNodes && allNodes.length > 0) {
        const norm = (v: unknown) => (v === null || v === undefined ? v : String(v));
        const foundByLabel = allNodes.find(node =>
          (node.type === 'leaf_option' || node.type === 'leaf_option_field') &&
          (node.label === selectedValue || norm(node.label) === norm(selectedValue))
        );
        if (foundByLabel) return foundByLabel;
      }
    } catch {
      // noop — keep undefined
    }
    return undefined;
  }, [allNodes]);

  const screens = useBreakpoint();
  const isMobile = !screens.md;

  
  // 📱 Gutters configurables par section (avec fallback)
  const getFormRowGutter = useCallback((section?: TBLSection): [number, number] => {
    const customGutter = section?.config?.gutter ?? (isMobile ? 12 : 24);
    return [customGutter, customGutter];
  }, [isMobile]);
  
  const getDataRowGutter = useCallback((section?: TBLSection): [number, number] => {
    const customGutter = section?.config?.gutter ?? (isMobile ? 12 : 16);
    return [customGutter, 16];
  }, [isMobile]);
  
  // 📱 Fonction pour calculer les spans de colonnes responsive
  const getResponsiveColSpan = useCallback((section: TBLSection) => {
    const columnsDesktop = section.config?.columnsDesktop ?? 6;
    const columnsMobile = section.config?.columnsMobile ?? 2;
    
    // Calculer les spans pour chaque breakpoint
    // ⚠️ Utiliser Math.ceil pour garantir qu'on ne dépasse PAS le nombre de colonnes demandé
    // Ex: 7 colonnes → span = ceil(24/7) = 4 → 6 colonnes max (mieux que 8 avec floor)
    const spanDesktop = Math.ceil(24 / Math.max(columnsDesktop, 1));
    const spanMobile = Math.ceil(24 / Math.max(columnsMobile, 1));
    
    return {
      xs: spanMobile,     // Mobile
      sm: spanMobile,     // Tablette portrait
      md: spanDesktop,    // Tablette paysage
      lg: spanDesktop,    // Desktop
      xl: spanDesktop,    // Large desktop
      xxl: spanDesktop    // Extra large desktop
    };
  }, []);

  const clampValue = useCallback((value: number, min: number, max: number) => {
    if (Number.isNaN(value)) return min;
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }, []);

  const coerceNumber = useCallback((value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value.trim());
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }, []);

  const extractWidthHints = useCallback((field: TBLField) => {
    const appearance = (field.appearanceConfig || {}) as Record<string, unknown>;
    const layout = appearance.layout as Record<string, unknown> | undefined;
    const metadata = (field.metadata || {}) as Record<string, unknown> | undefined;
    const metadataAppearance = (metadata?.appearance as Record<string, unknown> | undefined);
    const metadataLayout = metadataAppearance?.layout as Record<string, unknown> | undefined;
    const configRecord = field.config as unknown as Record<string, unknown> | undefined;

    const rawWidth =
      appearance.fieldWidth ??
      layout?.fieldWidth ??
      layout?.width ??
      appearance.width ??
      metadataAppearance?.fieldWidth ??
      metadataLayout?.width ??
      configRecord?.fieldWidth ??
      (field as unknown as { fieldWidth?: unknown }).fieldWidth ??
      (field as unknown as { width?: unknown }).width ??
      (field as unknown as { appearance_width?: unknown }).appearance_width ??
      configRecord?.width;

    const hintDesktop =
      coerceNumber(layout?.desktopColumns) ??
      coerceNumber(metadataLayout?.desktopColumns);

    const hintMobile =
      coerceNumber(layout?.mobileColumns) ??
      coerceNumber(metadataLayout?.mobileColumns);

    return { rawWidth, hintDesktop, hintMobile };
  }, [coerceNumber]);

  const parseWidthToken = useCallback((token: unknown, maxColumns: number): number | undefined => {
    if (!token) return undefined;
    if (typeof token === 'number' && Number.isFinite(token)) {
      if (token <= 0) return undefined;
      if (token <= maxColumns) return Math.round(token);
      return maxColumns;
    }
    if (typeof token !== 'string') return undefined;
    const normalized = token.trim().toLowerCase();
    if (!normalized) return undefined;
    if (/^\d+(\.\d+)?(px|rem|em)$/.test(normalized)) return undefined;
    if (['full', 'full-width', 'wide', 'stretch', 'max'].includes(normalized)) return maxColumns;
    if (['auto', 'fit', 'content', 'natural'].includes(normalized)) return undefined;
    if (['half', '1/2', '50%', 'two-columns', 'two cols', 'two col'].includes(normalized)) {
      return Math.max(1, Math.round(maxColumns / 2));
    }
    if (['third', 'one-third', '1/3', '33%', 'third-width'].includes(normalized)) {
      return Math.max(1, Math.round(maxColumns / 3));
    }
    if (['two-thirds', '2/3', '66%'].includes(normalized)) {
      return Math.max(1, Math.round((2 * maxColumns) / 3));
    }
    if (['quarter', '1/4', '25%'].includes(normalized)) {
      return Math.max(1, Math.round(maxColumns / 4));
    }
    if (['three-quarters', '3/4', '75%'].includes(normalized)) {
      return Math.max(1, Math.round((3 * maxColumns) / 4));
    }
    if (['double', 'large'].includes(normalized)) {
      return Math.min(maxColumns, 2);
    }
    const colsMatch = normalized.match(/^(span-)?(\d+)\s*(cols?|columns?)?$/);
    if (colsMatch) {
      return clampValue(parseInt(colsMatch[2], 10), 1, maxColumns);
    }
    const fractionMatch = normalized.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (fractionMatch) {
      const numerator = parseInt(fractionMatch[1], 10);
      const denominator = parseInt(fractionMatch[2], 10);
      if (denominator > 0) {
        return clampValue(Math.round((numerator / denominator) * maxColumns), 1, maxColumns);
      }
    }
    const percentMatch = normalized.match(/^(\d+(?:\.\d+)?)%$/);
    if (percentMatch) {
      const ratio = Number(percentMatch[1]) / 100;
      if (!Number.isNaN(ratio) && ratio > 0) {
        return clampValue(Math.round(ratio * maxColumns), 1, maxColumns);
      }
    }
    const numeric = Number(normalized);
    if (!Number.isNaN(numeric) && numeric > 0) {
      return clampValue(Math.round(numeric), 1, maxColumns);
    }
    return undefined;
  }, [clampValue]);

  const inferDefaultDesktopColumns = useCallback((field: TBLField, columnsDesktop: number) => {
    const type = (field.type || '').toLowerCase();
    const variant = (field.appearanceConfig as { variant?: string } | undefined)?.variant;
    if (
      type === 'textarea' ||
      type === 'text_area' ||
      // 🔧 FIX: Les repeaters ne doivent PAS forcer la pleine largeur
      // Ils doivent suivre le flux horizontal comme les autres champs
      // Seuls textarea et tableau restent en pleine largeur
      type.includes('tableau') ||
      variant === 'textarea'
    ) {
      return columnsDesktop;
    }
    // 🔧 FIX: Les champs conditionnels (Option+Champ) doivent avoir la même taille que les autres champs
    // On retourne 1 pour qu'ils prennent 1 colonne comme les champs normaux
    if ((field as any).isConditional && (field as any).parentFieldId) {
      return 1;
    }
    return 1;
  }, []);

  const getFieldColProps = useCallback(
    (targetSection: TBLSection, field: TBLField, options?: { forceFullWidth?: boolean }) => {
      const columnsDesktop = Math.max(1, targetSection.config?.columnsDesktop ?? 6);
      const columnsMobile = Math.max(1, targetSection.config?.columnsMobile ?? 2);
      // ⚠️ Math.ceil garantit qu'on ne dépasse pas le nombre de colonnes demandé
      const spanDesktop = Math.max(1, Math.ceil(24 / columnsDesktop));
      const spanMobile = Math.max(1, Math.ceil(24 / columnsMobile));
      const baseSpans = getResponsiveColSpan(targetSection);

      const { rawWidth, hintDesktop, hintMobile } = extractWidthHints(field);

      const desktopColumns = options?.forceFullWidth
        ? columnsDesktop
        : clampValue(
            clampValue(hintDesktop ? Math.round(hintDesktop) : inferDefaultDesktopColumns(field, columnsDesktop), 1, columnsDesktop),
            1,
            columnsDesktop
          );

      const parsedFromToken = options?.forceFullWidth
        ? columnsDesktop
        : parseWidthToken(rawWidth, columnsDesktop);

      const finalDesktopColumns = options?.forceFullWidth
        ? columnsDesktop
        : clampValue(parsedFromToken ?? desktopColumns, 1, columnsDesktop);

      const mobileFromHint = hintMobile ? clampValue(Math.round(hintMobile), 1, columnsMobile) : undefined;
      const ratioBasedMobile = Math.max(1, Math.round((finalDesktopColumns / columnsDesktop) * columnsMobile));
      const finalMobileColumns = options?.forceFullWidth
        ? columnsMobile
        : clampValue(mobileFromHint ?? ratioBasedMobile, 1, columnsMobile);

      const desktopSpan = clampValue(spanDesktop * finalDesktopColumns, spanDesktop, 24);
      const mobileSpan = clampValue(spanMobile * finalMobileColumns, spanMobile, 24);

      const fallbackXs = baseSpans?.xs ?? 24;
      const fallbackSm = baseSpans?.sm ?? fallbackXs;
      const fallbackMd = baseSpans?.md ?? spanDesktop;
      const fallbackLg = baseSpans?.lg ?? fallbackMd;
      const fallbackXl = baseSpans?.xl ?? fallbackLg;
      const fallbackXxl = baseSpans?.xxl ?? fallbackXl;

      const resolvedMobileSpan = options?.forceFullWidth ? 24 : mobileSpan;
      const resolvedDesktopSpan = options?.forceFullWidth ? 24 : desktopSpan;

      // 🎯 Fix colonnes non-divisibles par 24 (5, 7, 9, 10, 11 colonnes)
      // Le système de spans Ant Design arrondit et perd des colonnes (ex: 9→8)
      // Solution: flex CSS pour obtenir exactement le bon pourcentage
      const activeColumns = isMobile ? columnsMobile : columnsDesktop;
      const activeFieldColumns = isMobile ? finalMobileColumns : finalDesktopColumns;
      const needsFlexOverride = 24 % activeColumns !== 0;
      const flexStyle = needsFlexOverride ? {
        flex: `0 0 ${(activeFieldColumns / activeColumns) * 100}%`,
        maxWidth: `${(activeFieldColumns / activeColumns) * 100}%`,
      } : undefined;

      return {
        xs: resolvedMobileSpan ?? fallbackXs,
        sm: resolvedMobileSpan ?? fallbackSm,
        md: resolvedDesktopSpan ?? fallbackMd,
        lg: resolvedDesktopSpan ?? fallbackLg,
        xl: resolvedDesktopSpan ?? fallbackXl,
        xxl: resolvedDesktopSpan ?? fallbackXxl,
        ...(flexStyle ? { style: flexStyle } : {})
      };
    },
    [clampValue, extractWidthHints, getResponsiveColSpan, inferDefaultDesktopColumns, parseWidthToken, isMobile]
  );

  const getUniformDisplayColProps = useCallback((section: TBLSection) => {
    const columnsDesktop = Math.max(1, section.config?.columnsDesktop ?? 4);
    const columnsMobile = Math.max(1, section.config?.columnsMobile ?? 1);
    // ⚠️ Math.ceil garantit qu'on ne dépasse pas le nombre de colonnes demandé
    const spanDesktop = Math.ceil(24 / columnsDesktop);
    const spanMobile = Math.ceil(24 / columnsMobile);
    return {
      xs: spanMobile,
      sm: spanMobile,
      md: spanDesktop,
      lg: spanDesktop,
      xl: spanDesktop,
      xxl: spanDesktop
    };
  }, []);
  
  // ✅ CRITIQUE: Mémoiser le handleFieldChange pour éviter les re-rendus
  const handleFieldChange = useCallback((fieldId: string, value: any, fieldLabel?: string) => {
    console.log(`🟦🟦🟦 [TBLSectionRenderer] handleFieldChange LOCAL appelé: fieldId=${fieldId}, value=${value}, label=${fieldLabel}`);
    onChange(fieldId, value);
    
    // Synchronisation miroir
    if (fieldLabel) {
      try {
        const mirrorKey = `__mirror_data_${fieldLabel}`;
        onChange(mirrorKey, value);
      } catch {
        // Ignorer les erreurs de miroir en production
      }
    }
  }, [onChange]);
  
  // ✅ CRITIQUE: Fonction pour extraire la valeur de formData
  const extractFieldValue = useCallback((fieldId: string) => {
    const rawValue = formData[fieldId];
    // Si c'est un objet avec value/calculatedValue (réponse backend), extraire
    if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
      return rawValue.value ?? rawValue.calculatedValue ?? rawValue.operationResult?.value ?? rawValue;
    }
    return rawValue;
  }, [formData]);

  // Debug gating (localStorage.setItem('TBL_SMART_DEBUG','1'))
  // NOTE: Moved earlier to avoid runtime TDZ errors (dlog used across this file)

  // Handler to delete a full copy group (used by delete button)
  const handleDeleteCopyGroup = useCallback(async (f: TBLField) => {
    console.log('🗑️ [DELETE COPY GROUP] *** CALLBACK APPELÉ ***', { fieldId: f.id, fieldLabel: f.label });
    try {
      // 🔧 FIX: Récupérer le repeaterId de plusieurs sources possibles
      let repeaterId = (f as any).parentRepeaterId as string | undefined;
      
      // Fallback 1: Chercher dans le metadata du champ
      if (!repeaterId) {
        const meta = (f as any).metadata || {};
        repeaterId = meta.copyOf?.rootOriginalId || meta.sourceTemplateId?.split('-').slice(0, 5).join('-');
        console.log('🗑️ [DELETE COPY GROUP] Fallback 1 (metadata):', repeaterId);
      }
      
      // Fallback 2: Chercher le nœud dans allNodes pour avoir son parentId
      if (!repeaterId && allNodes) {
        const node = allNodes.find((n: any) => n.id === f.id);
        if (node) {
          repeaterId = node.parentId;
          // Vérifier que c'est bien un repeater (branch_repeater OU leaf_repeater)
          const parent = allNodes.find((n: any) => n.id === repeaterId);
          if (parent?.type !== 'branch_repeater' && parent?.type !== 'leaf_repeater') {
            // Le parent n'est pas un repeater, chercher dans metadata
            const nodeMeta = node.metadata || {};
            repeaterId = nodeMeta.copyOf?.rootOriginalId;
          }
          console.log('🗑️ [DELETE COPY GROUP] Fallback 2 (allNodes):', repeaterId);
        }
      }
      
      // Fallback 3: Extraire l'ID de base du champ copié (enlever le suffixe) et chercher le repeater parent
      if (!repeaterId && f.id) {
        const baseId = f.id.replace(/-\d+$/, ''); // Enlever -1, -2, etc.
        const originalNode = allNodes?.find((n: any) => n.id === baseId);
        if (originalNode?.parentId) {
          const parent = allNodes?.find((n: any) => n.id === originalNode.parentId);
          // 🔧 FIX: Accepter les deux types de repeater
          if (parent?.type === 'branch_repeater' || parent?.type === 'leaf_repeater') {
            repeaterId = parent.id;
            console.log('🗑️ [DELETE COPY GROUP] Fallback 3 (baseId→parent):', repeaterId);
          }
        }
      }
      
      console.log('🗑️ [DELETE COPY GROUP] repeaterId FINAL=', repeaterId);
      // ✅ Priorité: utiliser l'index d'instance du repeater (plus fiable que le suffixe du label)
      const instanceIndex: number | null = (f as any).repeaterInstanceIndex ?? null;
      const label = String(f.label || '');
      // Legacy: extraction via label si l'index est absent (compatibilité anciennes copies)
      const legacyMatch = label.match(/-(\d+)\s*$/) || label.match(/\(Copie\s+(\d+)\)/);
      const legacyIndex = legacyMatch ? parseInt(legacyMatch[1], 10) : null;
      const effectiveIndex = instanceIndex ?? legacyIndex;
      if (effectiveIndex == null) {
        console.warn('⚠️ [DELETE COPY GROUP] Impossible de déterminer l\'index de copie, suppression annulée.', { repeaterId, label });
        return;
      }

      dlog('🗑️ [DELETE COPY GROUP] Suppression de la copie ciblée:', { repeaterId, instanceIndex: effectiveIndex });

      // ✅ Sélection stricte des champs de la copie courante dans la section (évite la suppression d'autres copies)
      const getSuffixFromId = (id?: string) => String(id || '').match(/-(\d+)$/)?.[1] || null;
      
      // 🔥 MÉTHODE PRINCIPALE: Chercher par suffixe d'ID (plus fiable car l'ID est immuable)
      const suffixToMatch = String(effectiveIndex);
      
      // 🔒 NOUVEAU: Fonction pour détecter les champs "Total" - à NE JAMAIS supprimer
      const isTotalFieldCheck = (field: any): boolean => {
        const label = String(field?.label || '').toLowerCase();
        const meta: any = field?.metadata || {};
        // Vérifier le label
        if (label.includes('total') || label.includes('- total')) return true;
        // Vérifier les métadonnées (champ Total du repeater)
        if (meta.repeater?.totalField || meta.isTotalField) return true;
        // Vérifier si c'est un nœud Total du repeater (metadata.totalField)
        if (meta.totalField?.aggregationType) return true;
        return false;
      };
      
      const fieldsInSameCopy = section.fields.filter(sf => {
        // 🔒 EXCLUSION CRITIQUE: Ne jamais supprimer les champs Total
        if (isTotalFieldCheck(sf)) return false;
        
        const metaIndex = (sf as any).repeaterInstanceIndex;
        const suffix = getSuffixFromId(sf.id);
        const sameRepeater = (sf as any).parentRepeaterId === repeaterId;
        // ✅ NOUVEAU: Accepter si le suffixe correspond OU si l'index metadata correspond
        const sameIndex = suffix === suffixToMatch || String(metaIndex) === suffixToMatch;
        // ✅ NOUVEAU: Ne pas exiger isDeletableCopy - le suffixe suffit pour identifier une copie
        const isCopy = suffix !== null || (sf as any).isDeletableCopy === true;
        return sameRepeater && sameIndex && isCopy;
      });

      // ✅ Recherche dans allNodes: par suffixe d'ID ET/OU métadonnées
      const fieldsInNewSection = (allNodes || []).filter(n => {
        // 🔒 EXCLUSION CRITIQUE: Ne jamais supprimer les champs Total
        if (isTotalFieldCheck(n)) return false;
        
        const meta: any = n.metadata || {};
        const sameRepeater = meta.repeaterParentId === repeaterId;
        const metaIndex = meta.repeaterInstanceIndex;
        const suffix = getSuffixFromId(n.id);
        // ✅ NOUVEAU: Accepter si le suffixe correspond OU si l'index metadata correspond
        const sameIndex = suffix === suffixToMatch || String(metaIndex) === suffixToMatch;
        if (!sameIndex) return false;
        // Accepter si même repeater OU si suffixe identifie clairement une copie de ce repeater
        if (!sameRepeater && !meta.sourceTemplateId) return false;
        const notInCurrentSection = !section.fields.some((sf: any) => sf.id === n.id);
        return notInCurrentSection;
      });
      
      // 🔥 FALLBACK AGRESSIF: Rechercher tous les nœuds avec le même suffixe dans tout l'arbre
      const allNodesWithSameSuffix = (allNodes || []).filter(n => {
        // 🔒 EXCLUSION CRITIQUE: Ne jamais supprimer les champs Total
        if (isTotalFieldCheck(n)) return false;
        
        const suffix = getSuffixFromId(n.id);
        if (suffix !== suffixToMatch) return false;
        // Vérifier que c'est bien une copie (a sourceTemplateId ou copiedFromNodeId)
        const meta: any = n.metadata || {};
        const isCopy = !!(meta.sourceTemplateId || meta.copiedFromNodeId);
        return isCopy;
      });
      
      dlog('🔍 [DELETE COPY GROUP] Recherche par suffixe:', { 
        suffixToMatch, 
        fieldsInSameCopy: fieldsInSameCopy.length, 
        fieldsInNewSection: fieldsInNewSection.length,
        allNodesWithSameSuffix: allNodesWithSameSuffix.length 
      });

      // ✅ Fallback supplémentaire: pattern d'ID namespacé "${repeaterId}_${effectiveIndex}_<originalFieldId>"
      if (fieldsInNewSection.length === 0) {
        const prefix = `${repeaterId}_${effectiveIndex}_`;
        const patternMatches = (allNodes || []).filter(n => {
          // 🔒 EXCLUSION CRITIQUE: Ne jamais supprimer les champs Total
          if (isTotalFieldCheck(n)) return false;
          return n.id?.startsWith(prefix) && !section.fields.some((sf: any) => sf.id === n.id);
        });
        if (patternMatches.length > 0) {
          dlog('[DELETE COPY GROUP] Ajout des nœuds via prefix fallback:', patternMatches.map(p => p.id));
          fieldsInNewSection.push(...patternMatches as any);
        }
      }

      // 🔥 NOUVEAU: Fusionner toutes les sources de champs à supprimer (section + allNodes + suffixe global)
      const allFieldsToDelete = Array.from(new Map([
        ...fieldsInSameCopy, 
        ...fieldsInNewSection,
        ...allNodesWithSameSuffix  // ✅ Inclure les nœuds trouvés par suffixe
      ].map(x => [x.id, x])).values())
        // 🔒 FILTRE FINAL DE SÉCURITÉ: Exclure les champs Total même s'ils ont passé les filtres précédents
        .filter(x => !isTotalFieldCheck(x));
        
      // DEBUG: Inspect optimistic ids and suffixes
      try {
        const debugList = allFieldsToDelete.map(x => ({ id: x.id, suffix: getSuffixFromId(x.id), label: x.label }));
        dlog('[DELETE COPY GROUP] All fields to delete (optimistic):', { count: allFieldsToDelete.length, list: debugList });
      } catch { /* noop */ }
      if (allFieldsToDelete.length === 0) {
        dlog('⚠️ [DELETE COPY GROUP] Aucun champ détecté pour cette instance, rien à supprimer.');
        return;
      }

      dlog('🗑️ [DELETE COPY GROUP] Total éléments à supprimer (dédup):', allFieldsToDelete.length);

      // Dispatch optimistic UI update to remove the ids immediately (suppress reload)
      try {
        const optimisticIds = allFieldsToDelete.map(x => x.id);
        const eventTreeId = resolveEventTreeId();
        window.dispatchEvent(new CustomEvent('tbl-repeater-updated', { detail: { treeId: eventTreeId, nodeId: repeaterId, source: 'delete-copy-group-optimistic', suppressReload: true, deletingIds: optimisticIds, timestamp: Date.now() } }));
        dlog('[DELETE COPY GROUP] Dispatched optimistic tbl-repeater-updated (deletingIds)', optimisticIds);
      } catch {
        dlog('[DELETE COPY GROUP] Failed to dispatch optimistic tbl-repeater-updated (silent)');
      }

      // 🔥 OPTIMISATION: Le serveur fait la cascade - on n'envoie qu'un DELETE par nœud UNIQUE
      // Les 404 sont ignorés car le serveur peut avoir déjà supprimé le nœud en cascade
      const MAX_RETRIES = 2;
      const DELAY_MS = 300;
      const globalSuccessIds: string[] = [];
      const alreadyDeletedOnServer = new Set<string>();

      const deleteWithRetry = async (node: any, retry = 0): Promise<{ status: 'success' | 'skipped' | 'failed', id: string, serverDeletedIds: string[] }> => {
        // Skip si déjà supprimé par une cascade précédente
        if (alreadyDeletedOnServer.has(node.id)) {
          return { status: 'skipped', id: node.id, serverDeletedIds: [] };
        }
        
        try {
          const response = await api.delete(`/api/treebranchleaf/trees/${treeId}/nodes/${node.id}`, { suppressErrorLogForStatuses: [404] });
          // ✨ Le serveur retourne les IDs supprimés (CASCADE + display nodes)
          const serverDeletedIds: string[] = response?.deletedIds || response?.data?.deletedIds || [node.id];
          if (isTBLDebugEnabled()) tblLog('✅ [DELETE OK]', { nodeId: node.id, serverDeleted: serverDeletedIds.length });
          // Marquer ces IDs comme supprimés pour éviter de les re-supprimer
          serverDeletedIds.forEach(id => alreadyDeletedOnServer.add(id));
          return { status: 'success', id: node.id, serverDeletedIds };
        } catch (err: any) {
          const status = err?.status || 500;
          // 404 = déjà supprimé (cascade serveur) → considéré comme succès
          if (status === 404) {
            alreadyDeletedOnServer.add(node.id);
            return { status: 'success', id: node.id, serverDeletedIds: [node.id] };
          }
          // 500 → retry
          if (status === 500 && retry < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, DELAY_MS * (retry + 1)));
            return deleteWithRetry(node, retry + 1);
          }
          console.warn('❌ [DELETE FAIL]', { nodeId: node.id, status, error: err?.message });
          return { status: 'failed', id: node.id, serverDeletedIds: [] };
        }
      };

      // Supprimer séquentiellement pour éviter les conflits de cascade
      for (const field of allFieldsToDelete) {
        const result = await deleteWithRetry(field);
        if (result.status === 'success') {
          globalSuccessIds.push(result.id);
          // Ajouter les IDs cascade du serveur
          for (const serverId of result.serverDeletedIds) {
            if (!globalSuccessIds.includes(serverId)) {
              globalSuccessIds.push(serverId);
            }
          }
        }
      }

      dlog('🗑️ [DELETE COPY GROUP] Suppression terminée - Total IDs supprimés:', globalSuccessIds.length);
      console.log('🟢🟢🟢 [POST-DELETE] Après boucle de suppression - globalSuccessIds:', globalSuccessIds.length);

      // 🔄 SYNC BIDIRECTIONNEL: Suppression = -1 sur le champ source
      // On cherche le repeater qui a un countSourceNodeId configuré dans metadata.repeater
      // et on fait -1 sur ce champ (minimum 1)
      try {
        console.log('🔄🔄🔄 [SYNC DELETE] Recherche repeater avec countSourceNodeId dans allNodes:', allNodes?.length || 0, 'nodes');
        
        // 🔍 DEBUG: Lister tous les repeaters trouvés
        const allRepeaters = (allNodes || []).filter((n: any) => n.type === 'branch_repeater' || n.type === 'leaf_repeater');
        console.log('🔄🔄🔄 [SYNC DELETE] Repeaters dans allNodes:', allRepeaters.map((r: any) => ({
          id: r.id,
          type: r.type,
          hasMetadata: !!r.metadata,
          hasRepeater: !!r.metadata?.repeater,
          countSourceNodeId: r.metadata?.repeater?.countSourceNodeId || 'N/A'
        })));
        
        // 🔧 FIX: Chercher à la fois les types 'branch_repeater' ET 'leaf_repeater'
        const repeaterWithSync = (allNodes || []).find(
          (n: any) => (n.type === 'branch_repeater' || n.type === 'leaf_repeater') && n.metadata?.repeater?.countSourceNodeId
        );
        
        console.log('🔄🔄🔄 [SYNC DELETE] Repeater trouvé:', repeaterWithSync ? {
          id: repeaterWithSync.id,
          countSourceNodeId: repeaterWithSync.metadata?.repeater?.countSourceNodeId
        } : 'AUCUN');
        
        if (repeaterWithSync) {
          const countSourceNodeId = repeaterWithSync.metadata.repeater.countSourceNodeId;
          
          // 🔒 PROTECTION: Empêcher le preload de se déclencher pendant le sync
          if (typeof window !== 'undefined') {
            window.__TBL_SKIP_PRELOAD_UNTIL = Date.now() + 2000; // Skip pendant 2 secondes
            console.log(`🔒 [SYNC DELETE] Preload désactivé temporairement jusqu'à ${new Date(window.__TBL_SKIP_PRELOAD_UNTIL).toISOString()}`);
          }
          
          // 🔧 FIX: Utiliser section.fields ou allNodes (fields n'existait pas dans ce scope!)
          const currentField = section.fields.find((fld: any) => fld.id === countSourceNodeId) 
            || allNodes.find((n: any) => n.id === countSourceNodeId);
          const currentValue = parseInt(String(currentField?.value || currentField?.defaultValue || '1'), 10);
          const newValue = Math.max(1, currentValue - 1); // MINIMUM 1 !
          
          console.log(`🔄 [SYNC] Repeater ${repeaterWithSync.id}: champ ${countSourceNodeId} = ${currentValue} → ${newValue}`);
          onChange(countSourceNodeId, String(newValue));
        }
      } catch (syncErr) {
        console.warn('⚠️ [SYNC] Erreur:', syncErr);
      }

      // ✨ MISE À JOUR LOCALE SANS RECHARGEMENT
      // Émettre un événement avec les IDs supprimés pour que le composant parent filtre localement
      try {
        const eventTreeId = resolveEventTreeId();
        window.dispatchEvent(new CustomEvent('tbl-repeater-updated', { 
          detail: { 
            treeId: eventTreeId, 
            nodeId: repeaterId, 
            source: 'delete-copy-group-finished', 
            suppressReload: true,  // Pas de rechargement visible
            forceRefresh: false,   // ❌ PAS de refetch - la mise à jour locale suffit
            deletedIds: globalSuccessIds, 
            timestamp: Date.now() 
          } 
        }));
        dlog('[DELETE COPY GROUP] Dispatched final tbl-repeater-updated (deletedIds) - LOCAL UPDATE ONLY', globalSuccessIds);
        
        // Événement léger pour autres listeners
        window.dispatchEvent(new CustomEvent('delete-copy-group-finished', { 
          detail: { 
            treeId: eventTreeId, 
            nodeId: repeaterId, 
            deletedIds: globalSuccessIds, 
            timestamp: Date.now() 
          } 
        }));
        
        if (isTBLDebugEnabled()) tblLog('✨ [DELETE COPY GROUP] Mise à jour locale sans rechargement:', globalSuccessIds.length, 'éléments');
        
        // Déclencher une mise à jour du formData pour les composants dépendants
        window.dispatchEvent(new CustomEvent('TBL_FORM_DATA_CHANGED', { 
          detail: { 
            reason: 'delete-copy-group-finished', 
            deletedIds: globalSuccessIds 
          } 
        }));

        // 🎯 CRITICAL: Forcer le recalcul des valeurs sum-total après suppression
        // Le hook useNodeCalculatedValue écoute cet événement et re-fetch les valeurs
        // depuis le backend qui a nettoyé les SubmissionData des copies supprimées
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('tbl-force-retransform', {
            detail: {
              treeId: eventTreeId,
              reason: 'delete-copy-group',
              timestamp: Date.now()
            }
          }));
          dlog('🎯 [DELETE COPY GROUP] Dispatched tbl-force-retransform pour recalculer les sum-totals');
        }, 800); // Délai pour laisser le serveur terminer updateSumDisplayFieldAfterCopyChange
      } catch {
        dlog('⚠️ [DELETE COPY GROUP] Impossible de dispatch final tbl-repeater-updated (silent)');
      }
    } catch (error) {
      console.error('❌ [DELETE COPY GROUP] Erreur lors de la suppression de la copie:', error);
    }
  }, [api, allNodes, section, treeId, dlog, resolveEventTreeId, onChange]);
  
  // Debug gating (localStorage.setItem('TBL_SMART_DEBUG','1')) is declared earlier

  // 🎨 HÉRITAGE APPARENCE + SUBTAB: parentAppearance permet aux shared references d'hériter l'apparence du champ parent
  // 🔧 FIX DYNAMIQUE: parentSubTabs permet aux enfants d'hériter le subtab du parent
  const buildConditionalFieldFromNode = useCallback((
    node: RawTreeNode,
    parentAppearance?: { size?: string; variant?: string; width?: string; labelColor?: string; [key: string]: unknown },
    parentSubTabs?: string[]
  ): TBLField => {
    const finalFieldType = (node.subType || node.fieldType || node.type || 'TEXT') as string;
    
    // 🔧 FIX DYNAMIQUE: Extraire le subtab du nœud, sinon hériter du parent
    const nodeSubTab = node.subtab as string | null;
    const nodeSubTabs = nodeSubTab ? [nodeSubTab] : [];
    const effectiveSubTabs = nodeSubTabs.length > 0 ? nodeSubTabs : (parentSubTabs || []);

    const buildBaseCapability = (
      instances?: Record<string, unknown> | null,
      activeId?: string | null
    ) => {
      const hasInstances = !!instances && Object.keys(instances).length > 0;
      return {
        enabled: hasInstances,
        activeId: hasInstances && activeId ? activeId : undefined,
        instances: hasInstances ? instances : undefined,
      };
    };

    const extractActiveInstance = (
      instances?: Record<string, unknown> | null,
      activeId?: string | null
    ) => {
      if (!instances || !activeId) return undefined;
      return (instances as Record<string, unknown>)[activeId];
    };

    const formulaInstances = node.formula_instances as Record<string, unknown> | null;
    const conditionInstances = node.condition_instances as Record<string, unknown> | null;

    // 🔥 AJOUT CRITIQUE: Construire les options pour les champs CASCADE/SELECT
    let options: Array<{
      id: string;
      label: string;
      value: string;
      metadata?: any;
      conditionalFields?: TBLField[];
    }> | undefined;

    // Récupérer les children qui sont des options (leaf_option)
    const optionChildren = allNodes.filter(n => 
      n.parentId === node.id && 
      (n.type === 'leaf_option' || n.type === 'leaf_option_field')
    );

    if (optionChildren.length > 0) {
      
      options = optionChildren.map(optionNode => {

        return {
          id: optionNode.id,
          label: optionNode.option_label || optionNode.label,
          // 🔥 FIX: Utiliser l'ID du nœud comme valeur si value est null/undefined
          // Cela permet aux conditions @select.xxx de fonctionner correctement
          value: optionNode.value || optionNode.id,
          metadata: optionNode.metadata, // 🔥 CRITIQUE: Inclure metadata avec sharedReferenceIds !
          conditionalFields: undefined // TODO: construire si nécessaire
        };
      });
    }

    // 🎨 HÉRITAGE APPARENCE: Extraire les configurations d'apparence du nœud et de ses métadonnées
    const nodeMetadata = (node.metadata && typeof node.metadata === 'object') ? node.metadata as Record<string, unknown> : {};
    const metadataAppearance = (nodeMetadata.appearance && typeof nodeMetadata.appearance === 'object') ? nodeMetadata.appearance as Record<string, unknown> : {};
    const metadataFieldAppearance = (nodeMetadata.field && typeof nodeMetadata.field === 'object' && (nodeMetadata.field as Record<string, unknown>).appearance) 
      ? (nodeMetadata.field as Record<string, unknown>).appearance as Record<string, unknown> 
      : {};
    
    // 🔗 LIAISON: Récupérer les sharedReferenceIds depuis le nœud ET les métadonnées
    const sharedReferenceIds = Array.isArray(node.sharedReferenceIds) 
      ? node.sharedReferenceIds 
      : (Array.isArray(nodeMetadata.sharedReferenceIds) ? nodeMetadata.sharedReferenceIds as string[] : undefined);
    const sharedReferenceId = node.sharedReferenceId || (nodeMetadata.sharedReferenceId as string | undefined);

    return {
      id: node.id,
      name: (node.field_label as string) || (node.name as string) || node.label,
      label: node.label,
      type: finalFieldType,
      subType: (node.subType || node.fieldSubType || finalFieldType) as string, // 📸 Fallback pour le renderer
      fieldSubType: (node.fieldSubType || node.subType || finalFieldType) as string, // 📸 Fallback pour le renderer
      required: Boolean(node.isRequired),
      visible: node.isVisible !== false,
      placeholder: node.text_placeholder ?? undefined,
      description: node.description ?? undefined,
      order: typeof node.order === 'number' ? node.order : 9999,
      sharedReferenceName: node.sharedReferenceName || node.label,
      sharedReferenceId, // 🔗 LIAISON: Inclure la référence partagée unique
      sharedReferenceIds, // 🔗 LIAISON: Inclure les références partagées multiples
      // 🔧 FIX DYNAMIQUE: Héritage du subtab depuis le parent si le nœud n'en a pas
      subTabKey: effectiveSubTabs[0] ?? undefined,
      subTabKeys: effectiveSubTabs.length > 0 ? effectiveSubTabs : undefined,
      options, // 🔥 AJOUT CRITIQUE: Inclure les options construites !
      // 🎨 APPARENCE: Inclure les configurations d'apparence complètes du nœud source
      // 🎨 HÉRITAGE: parentAppearance prend priorité pour les shared references (Rampant, etc.)
      metadata: nodeMetadata,
      appearanceConfig: {
        ...metadataAppearance,
        ...metadataFieldAppearance,
        // 🎨 HÉRITAGE: parentAppearance PREND PRIORITÉ pour les shared references
        size: parentAppearance?.size ?? metadataAppearance.size ?? metadataFieldAppearance.size ?? node.appearance_size,
        variant: parentAppearance?.variant ?? metadataAppearance.variant ?? metadataFieldAppearance.variant ?? node.appearance_variant,
        width: parentAppearance?.width ?? metadataAppearance.width ?? metadataFieldAppearance.width ?? node.appearance_width,
        labelColor: parentAppearance?.labelColor ?? metadataAppearance.labelColor ?? metadataFieldAppearance.labelColor,
        bubbleColor: metadataAppearance.bubbleColor ?? metadataFieldAppearance.bubbleColor,
      },
      config: {
        // 🎨 HÉRITAGE: parentAppearance PREND PRIORITÉ pour les shared references
        size: parentAppearance?.size ?? node.appearance_size ?? metadataAppearance.size as string ?? undefined,
        width: parentAppearance?.width ?? node.appearance_width ?? metadataAppearance.width as string ?? undefined,
        variant: parentAppearance?.variant ?? node.appearance_variant ?? metadataAppearance.variant as string ?? undefined,
        labelColor: parentAppearance?.labelColor ?? metadataAppearance.labelColor as string ?? undefined,
        bubbleColor: metadataAppearance.bubbleColor as string ?? undefined,
        minLength: node.text_minLength ?? undefined,
        maxLength: node.text_maxLength ?? undefined,
        rows: node.text_rows ?? undefined,
        mask: node.text_mask ?? undefined,
        regex: node.text_regex ?? undefined,
        textDefaultValue: node.text_defaultValue ?? undefined,
        min: node.number_min ?? undefined,
        max: node.number_max ?? undefined,
        step: node.number_step ?? undefined,
        // 🔧 FIX: Priorité à data_precision pour les champs d'affichage (cartes bleues), sinon number_decimals
        decimals: node.data_precision ?? node.number_decimals ?? undefined,
        prefix: node.number_prefix ?? undefined,
        suffix: node.number_suffix ?? undefined,
        unit: node.number_unit ?? node.data_unit ?? undefined,
        numberDefaultValue: node.number_defaultValue ?? undefined,
        format: node.date_format ?? undefined,
        showTime: node.date_showTime ?? undefined,
        dateDefaultValue: node.date_defaultValue ?? undefined,
        minDate: node.date_minDate ?? undefined,
        maxDate: node.date_max ?? undefined,
        multiple: node.select_multiple ?? undefined,
        searchable: node.select_searchable ?? undefined,
        allowClear: node.select_allowClear ?? undefined,
        selectDefaultValue: node.select_defaultValue ?? undefined,
        trueLabel: node.bool_trueLabel ?? undefined,
        falseLabel: node.bool_falseLabel ?? undefined,
        boolDefaultValue: node.bool_defaultValue ?? undefined,
        // 📱 Configuration layout responsive
        columnsDesktop: node.section_columnsDesktop ?? 2,
        columnsMobile: node.section_columnsMobile ?? 1,
        gutter: node.section_gutter ?? 16,
        collapsible: node.section_collapsible ?? false,
        defaultCollapsed: node.section_defaultCollapsed ?? false,
        showChildrenCount: node.section_showChildrenCount ?? false,
      },
      capabilities: {
        data: buildBaseCapability(node.data_instances as Record<string, unknown> | null, node.data_activeId as string | null),
        formula: {
          ...buildBaseCapability(formulaInstances, node.formula_activeId as string | null),
          currentFormula: extractActiveInstance(formulaInstances, node.formula_activeId as string | null) as unknown,
        },
        condition: {
          ...buildBaseCapability(conditionInstances, node.condition_activeId as string | null),
          currentConditions: extractActiveInstance(conditionInstances, node.condition_activeId as string | null) as unknown,
        },
        table: buildBaseCapability(node.table_instances as Record<string, unknown> | null, node.table_activeId as string | null),
        api: buildBaseCapability(node.api_instances as Record<string, unknown> | null, node.api_activeId as string | null),
        link: buildBaseCapability(node.link_instances as Record<string, unknown> | null, node.link_activeId as string | null),
        markers: buildBaseCapability(node.markers_instances as Record<string, unknown> | null, node.markers_activeId as string | null),
      },
      // � LINK: Propriétés au niveau racine pour TBLFieldRendererAdvanced
      hasLink: node.hasLink as boolean | undefined,
      link_targetNodeId: node.link_targetNodeId as string | undefined,
      link_targetTreeId: node.link_targetTreeId as string | undefined,
      link_mode: node.link_mode as 'JUMP' | 'APPEND_SECTION' | 'PHOTO' | undefined,
      link_carryContext: node.link_carryContext as boolean | undefined,
      // 🖼️ NOUVEAU: Propriétés de link pour affichage photo (format alternatif)
      linkConfig: {
        targetNodeId: node.link_targetNodeId as string | undefined,
        targetTreeId: node.link_targetTreeId as string | undefined,
        mode: node.link_mode as 'JUMP' | 'APPEND_SECTION' | 'PHOTO' | undefined,
        carryContext: node.link_carryContext as boolean | undefined,
      },
    } as TBLField;
  }, [allNodes]);

  // Cache de logs pour éviter répétitions massives
  const lastInjectionHashRef = useRef<string>('');
  // Section structure log (gated)
  
  // 🎯 Vérifier si cette section doit être affichée selon les conditions
  const isVisible = useMemo(() => {
    if (!section.conditions) return true;

    const { dependsOn, showWhen, operator = 'equals' } = section.conditions;
    if (!dependsOn) return true;

    const dependentValue = formData[dependsOn];
    
    switch (operator) {
      case 'equals':
        return dependentValue === showWhen;
      case 'not_equals':
        return dependentValue !== showWhen;
      case 'contains':
        return String(dependentValue || '').includes(String(showWhen));
      case 'exists':
        return dependentValue !== undefined && dependentValue !== null && dependentValue !== '';
      default:
        return true;
    }
  }, [section.conditions, formData]);

  // 🔄 Réorganiser l'ordre des champs selon les conditions + injection des champs conditionnels + DÉPLOIEMENT DES REPEATERS
  const orderedFields = useMemo(() => {
    // 🎯 CRITICAL FIX: Trier les champs par leur order TBL dès le départ pour respecter l'arbre
    const fields = [...section.fields].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
    
    // Créer le tableau final en "compactant" l'ordre selon les conditions
  const finalFields: TBLField[] = [];
  // Suivi des champs déjà insérés lors du regroupement (évite les doublons)
  const consumedFieldIds = new Set<string>();
    let nextOrder = 0;
    
    // 🎯 Les champs sont maintenant triés par order TBL
    if (isTBLDebugEnabled()) tblLog('🔍 [ALL FIELDS DEBUG] Fields récupérés de la base (TRIÉS PAR ORDER TBL):', {
      totalFields: fields.length,
      fieldIds: fields.map(f => f.id),
      versantFields: fields.filter(f => f.id?.includes('3f0f') || f.id?.includes('e207d8bf') || f.label?.includes('Versant')),
      versantFieldIds: fields.filter(f => f.id?.includes('3f0f') || f.id?.includes('e207d8bf') || f.label?.includes('Versant')).map(f => ({ id: f.id, label: f.label, type: f.type }))
    });
    
    // 🎯 TRAITEMENT INLINE: Parcourir les champs dans l'ordre de la section
    // et déplier les repeaters à l'endroit exact où ils apparaissent
    fields.forEach(field => {
      // ⛔️ Sauter les champs déjà consommés par un regroupement de copies
      if (consumedFieldIds.has(field.id)) {
        return;
      }

      // ⛔️ Déporter TOUS les champs appartenant à une copie réelle vers le parent répéteur
      // On ne les rend pas à leur position brute dans section.fields; ils seront insérés
      // à la position du répéteur pour respecter la règle "les copies démarrent ici".
      // ⚠️ NOTE: A copy should be treated as "repeater-local" ONLY when its parentRepeaterId
      // references a repeater that actually lives in THIS SECTION. If the copy was moved to
      // another section/tab through the transformer (e.g., redistributed to its source template),
      // we must still render it normally here.
      const belongsToRealCopy = Boolean(
        (field as any).parentRepeaterId &&
        (field as any).sourceTemplateId &&
        // The parent repeater (field.parentRepeaterId) must be a field in the current section
        section.fields.some(sf => sf.id === (field as any).parentRepeaterId)
      );
      if ((field as any).parentRepeaterId && (field as any).sourceTemplateId && !belongsToRealCopy) {
        // Log the special case for debugging: copy in section but the parent repeater is NOT in this section
        try {
          if (process.env.NODE_ENV === 'development') {
            if (isTBLDebugEnabled()) tblLog('🔁 [COPY LOCATION] Copy appears in section (rendering):', { fieldId: field.id, label: field.label, parentRepeaterId: (field as any).parentRepeaterId, sectionId: section.id });
          } else {
            dlog('🔁 [COPY LOCATION] Copy appears in section (rendering):', { fieldId: field.id, label: field.label, parentRepeaterId: (field as any).parentRepeaterId, sectionId: section.id });
          }
        } catch { /* noop */ }
      }
      if (belongsToRealCopy) {
        return;
      }
      // 🔁 REPEATER : Déplier les instances du repeater dans le flux
      const isRepeater = (
        field.type === 'leaf_repeater' || 
        field.type === 'LEAF_REPEATER' ||
        (field as any).fieldType === 'leaf_repeater' ||
        (field as any).fieldType === 'LEAF_REPEATER' ||
        (field.metadata && typeof field.metadata === 'object' && 'repeater' in field.metadata)
      );
      
      // 🚨 CRITIQUE: Détecter les repeaters copiés qui ont changé de type
      if (field.id === 'e207d8bf-6a6f-414c-94ed-ffde47096915' || field.id === '10724c29-a717-4650-adf3-0ea6633f64f1') {
        if (isTBLDebugEnabled()) tblLog('🚨🚨🚨 [REPEATER TYPE CHECK] Analyse du repeater:', {
          fieldId: field.id,
          fieldLabel: field.label,
          fieldType: field.type,
          fieldSubType: (field as any).subType,
          fieldFieldType: (field as any).fieldType,
          isRepeaterDetected: isRepeater,
          hasRepeaterMetadata: !!(field.metadata && typeof field.metadata === 'object' && 'repeater' in field.metadata),
          repeaterMetadata: field.metadata?.repeater,
          isOriginal: field.id === '10724c29-a717-4650-adf3-0ea6633f64f1',
          isCopy: field.id === 'e207d8bf-6a6f-414c-94ed-ff6e47096915'
        });
      }
      
      if (isRepeater) {
        // 🔥 DEBUG CRITIQUE: Analyser ce repeater spécifiquement
        if (field.id === '10724c29-a717-4650-adf3-0ea6633f64f1') {
          if (isTBLDebugEnabled()) tblLog('🔥🔥🔥 [REPEATER CONTAINER DEBUG] Repeater container analysé:', {
            fieldId: field.id,
            fieldLabel: field.label,
            fieldType: field.type,
            metadata: field.metadata,
            repeaterMetadata: field.metadata?.repeater,
            allNodesCount: allNodes?.length || 0,
            sectionFieldsCount: section.fields.length
          });
        }

        const repeaterMetadata = field.metadata?.repeater;
        const templateNodeIdsRaw = repeaterMetadata?.templateNodeIds || [];

        // 🔎 Helpers: retrouver un node brut, déterminer si c'est un champ et récupérer tous les champs descendants
        const getNodeById = (id: string): RawTreeNode | undefined => allNodes?.find(n => n.id === id);
        const isFieldNode = (n?: RawTreeNode) => !!n && (
          (typeof n.fieldType === 'string' && n.fieldType.length > 0) ||
          (typeof n.subType === 'string' && n.subType.length > 0) ||
          (n.type && n.type.includes('leaf'))
        );
        const getChildren = (parentId: string): RawTreeNode[] => allNodes?.filter(n => n.parentId === parentId) || [];
        const getDescendantFieldNodes = (rootId: string): RawTreeNode[] => {
          const result: RawTreeNode[] = [];
          const stack: string[] = [rootId];
          const visited = new Set<string>();
          while (stack.length) {
            const id = stack.pop()!;
            if (visited.has(id)) continue;
            visited.add(id);
            const children = getChildren(id);
            for (const c of children) {
              if (isFieldNode(c)) result.push(c);
              if (c.id && !visited.has(c.id)) stack.push(c.id);
            }
          }
          return result;
        };

        // Développer les IDs fournis: si on sélectionne une branche/section, on prend tous les champs descendants
        const expandTemplateNodeIds = (ids: string[]): string[] => {
          const expanded: string[] = [];
          ids.forEach(id => {
            const node = getNodeById(id);
            if (!node) return;

            if (isFieldNode(node)) {
              expanded.push(id);
            } else {
              const descendants = getDescendantFieldNodes(id);
              descendants.forEach(d => {
                expanded.push(d.id);
                // Inclure les champs conditionnels et partagés des descendants
                if (d.conditionalFields) {
                  d.conditionalFields.forEach(cf => expanded.push(cf.id));
                }
                if (d.sharedReferenceIds) {
                  d.sharedReferenceIds.forEach(sharedId => expanded.push(sharedId));
                }
                // Fallback: inclure la référence unique dans l'expansion
                if (d.sharedReferenceId && typeof d.sharedReferenceId === 'string') {
                  expanded.push(d.sharedReferenceId);
                }
                // Inclure les configurations spécifiques comme "mesure simple"
                if (d.config && d.config.sourceRef) {
                  expanded.push(d.config.sourceRef);
                }
              });
            }
          });
          return Array.from(new Set(expanded));
        };

        // 🎯 RÉCUPÉRER L'ORDRE DES TEMPLATES DEPUIS L'ARBRE COPIÉ (CODE DUPLIQUÉ - À OPTIMISER)
        const getTemplateNodeIdsInTreeOrder = (templateNodeIds: string[]) => {
          if (!allNodes || allNodes.length === 0) {
            return templateNodeIds;
          }
          
          const repeaterNode = allNodes.find(n => n.id === field.id);
          if (!repeaterNode || !repeaterNode.children) {
            return templateNodeIds;
          }
          
          const orderedIds: string[] = [];
          repeaterNode.children.forEach(child => {
            if (child.config?.sourceRef && templateNodeIds.includes(child.config.sourceRef)) {
              orderedIds.push(child.config.sourceRef);
            } else if (templateNodeIds.includes(child.id)) {
              orderedIds.push(child.id);
            }
          });
          
          templateNodeIds.forEach(id => {
            if (!orderedIds.includes(id)) {
              orderedIds.push(id);
            }
          });
          
          return orderedIds;
        };

        const templateNodeIds = getTemplateNodeIdsInTreeOrder(expandTemplateNodeIds(templateNodeIdsRaw));
        
        // 🔍 DIAGNOSTIC: Logger les templateNodeIds pour analyser la configuration
        if (isTBLDebugEnabled()) tblLog('🔍 [REPEATER CONFIG]', {
          repeaterId: field.id,
          repeaterLabel: field.label,
          templateNodeIdsRaw: JSON.stringify(templateNodeIdsRaw),
          templateNodeIdsExpanded: JSON.stringify(templateNodeIds),
          allNodesCount: allNodes?.length || 0
        });
        
        // 🔍 DÉTAIL: Afficher les labels des champs à dupliquer
        const templateFields = templateNodeIds.map(tid => {
          const node = allNodes?.find(n => n.id === tid);
          return node ? `${node.label} (${tid})` : `[NOT FOUND] ${tid}`;
        });
        if (isTBLDebugEnabled()) tblLog('🔍 [REPEATER TEMPLATES]', templateFields);
        
        // 🎯 CORRECTION : Utiliser le label du champ (ex: "Versant", "Toiture") pour le bouton
        const repeaterLabel = field.label || field.name || 'Entrée';
        
        // 🚀 PRIORITÉ AUX COLONNES : Lire les colonnes Prisma en priorité, puis fallback sur metadata
  const buttonSize = (field as any).repeater_buttonSize || repeaterMetadata?.buttonSize || 'middle';
  const buttonWidth = (field as any).repeater_buttonWidth || repeaterMetadata?.buttonWidth || 'auto';
  const _iconOnly = (field as any).repeater_iconOnly ?? repeaterMetadata?.iconOnly ?? false;
        const maxItems = (field as any).repeater_maxItems ?? repeaterMetadata?.maxItems ?? null;
        
        // Récupérer le nombre d'instances depuis formData (clé spéciale)
        const instanceCountKey = `${field.id}_instanceCount`;
        // 🎯 Commencer à 0 instances - l'utilisateur doit cliquer sur "Ajouter" pour en créer
  const _instanceCount = (formData[instanceCountKey] as number) ?? 0;
        
        // NOUVEAU: Regrouper les COPIES RÉELLES à la position du répéteur, par rang d'encodage
        // 1) Récupérer toutes les copies de ce répéteur
        // 🎯 IMPORTANT: Ne chercher que dans la section courante - les copies cross-section 
        // restent dans leur section d'origine
        const copyFieldsAll = fields.filter(f => (f as any).parentRepeaterId === field.id && (f as any).sourceTemplateId);

        // 2) Construire mapping templateId -> liste de copies, triées par duplicatedAt puis index dans le label (fallback)
        const copiesByTemplate: Record<string, TBLField[]> = {};
        const getCopyIndexFromLabel = (lbl?: string) => {
          if (!lbl) return undefined;
          const m = lbl.match(/\(Copie\s*(\d+)\)/i);
          return m ? parseInt(m[1], 10) : undefined;
        };
        templateNodeIds.forEach(tid => { copiesByTemplate[tid] = []; });
        copyFieldsAll.forEach(cf => {
          const tid = (cf as any).sourceTemplateId as string | undefined;
          if (!tid) return;
          if (!copiesByTemplate[tid]) copiesByTemplate[tid] = [];
          copiesByTemplate[tid].push(cf);
        });
        Object.keys(copiesByTemplate).forEach(tid => {
          copiesByTemplate[tid].sort((a, b) => {
            const da = new Date(((a as any).metadata?.duplicatedAt) || 0).getTime();
            const db = new Date(((b as any).metadata?.duplicatedAt) || 0).getTime();
            if (da !== db) return da - db;
            const ia = getCopyIndexFromLabel(a.label);
            const ib = getCopyIndexFromLabel(b.label);
            if (ia !== undefined && ib !== undefined && ia !== ib) return ia - ib;
            return String(a.label || '').localeCompare(String(b.label || ''));
          });
        });

        // 3) Nombre de blocs = max du nombre de copies parmi les templates
        const maxBlocks = Math.max(0, ...Object.values(copiesByTemplate).map(arr => arr.length));

        // 4) Insérer bloc par bloc, dans l'ordre des templates
        for (let copyIndex = 0; copyIndex < maxBlocks; copyIndex++) {
          const block: TBLField[] = [];
          for (const tid of templateNodeIds) {
            const arr = copiesByTemplate[tid] || [];
            const cf = arr[copyIndex];
            if (!cf) continue; // Cas manquant (A) : ignorer
            consumedFieldIds.add(cf.id);
            block.push(cf);
          }
          // Marquer le dernier champ du bloc pour afficher le bouton poubelle de la copie
          block.forEach((f, idx) => {
            const isLast = idx === block.length - 1;
            // 1) Insérer le champ de copie
            finalFields.push({ ...f, order: nextOrder, isLastInCopyGroup: isLast });
            nextOrder++;

            // 2) Si c'est un select/cascade, injecter ses champs conditionnels IMMÉDIATEMENT APRÈS
            try {
              const isSelectField = (f as any).isSelect || Array.isArray(f.options);
              const isCascade = (f.type === 'cascade');
              if (!isSelectField && !isCascade) return;

              // Déterminer la valeur sélectionnée pour cette copie
              const norm = (v: unknown) => (v === null || v === undefined ? v : String(v));
              let selectedValue: unknown = (formData as Record<string, unknown>)[f.id];

              // Construire selectedOption pour réutiliser les conditionalFields éventuels
              let selectedOption = (Array.isArray(f.options) ? f.options.find(opt => {
                if (selectedValue === undefined || selectedValue === null) {
                  return opt.value === undefined || opt.value === null;
                }
                return opt.value === selectedValue || norm(opt.value) === norm(selectedValue);
              }) : undefined) as (typeof f.options extends undefined ? never : NonNullable<typeof f.options>[number]) | undefined;

              // 🔍 DEBUG COPY: log key info so we can trace why conditionalFields are not injected
              if (isTBLDebugEnabled()) tblLog('🔧 [REPEATER COPY INJECTION START]', { fieldId: f.id, fieldLabel: f.label, selectedValue, selectedOption, optionsCount: f.options?.length || 0 });

              // Si pas de conditionalFields préconstruits, reconstruire depuis allNodes via nodeId persistant
              let conditionalFieldsToRender: TBLField[] = [];
              const conditionalFromOption = selectedOption && Array.isArray(selectedOption.conditionalFields) ? selectedOption.conditionalFields : [];
              if (conditionalFromOption.length > 0) {
                conditionalFieldsToRender = conditionalFromOption as TBLField[];
              } else {
                // Chercher nodeId persistant
                let cascaderNodeId: string | undefined;
                try {
                  if (typeof window !== 'undefined' && (window as any).TBL_FORM_DATA) {
                    const key = `${f.id}__selectedNodeId`;
                    const maybe = (window as any).TBL_FORM_DATA[key];
                    if (typeof maybe === 'string' && maybe.length > 0) cascaderNodeId = maybe;
                    // FALLBACK: if no cascaderNodeId for this copy id, try the template/original id key
                    // FALLBACK: try window.TBL_CASCADER_NODE_IDS map for copyId and originalId
                    try {
                      const maybeNodeIdMap = (window as any).TBL_CASCADER_NODE_IDS as Record<string, string> | undefined;
                      if (!cascaderNodeId && maybeNodeIdMap) {
                        const n1 = maybeNodeIdMap[f.id];
                        const originalId = (f as any).originalFieldId || (f as any).sourceTemplateId || (f as any).metadata?.sourceTemplateId;
                        const n2 = originalId ? maybeNodeIdMap[originalId] : undefined;
                        if (typeof n1 === 'string' && n1.length > 0) cascaderNodeId = n1;
                        if (!cascaderNodeId && typeof n2 === 'string' && n2.length > 0) cascaderNodeId = n2;
                        if (cascaderNodeId) if (isTBLDebugEnabled()) tblLog('🔁 [REPEATER COPY INJECTION] fallback cascaderNodeId via TBL_CASCADER_NODE_IDS', { fId: f.id, cascaderNodeId });
                      }
                    } catch { /* noop */ }
                    if (!cascaderNodeId) {
                      const originalId = (f as any).originalFieldId || (f as any).sourceTemplateId || (f as any).metadata?.sourceTemplateId;
                      if (originalId) {
                        const templateKey = `${originalId}__selectedNodeId`;
                        const maybe2 = (window as any).TBL_FORM_DATA[templateKey];
                        if (typeof maybe2 === 'string' && maybe2.length > 0) {
                          cascaderNodeId = maybe2;
                          if (isTBLDebugEnabled()) tblLog('🔁 [REPEATER COPY INJECTION] fallback cascaderNodeId via template key found:', { fieldId: f.id, templateKey, cascaderNodeId });
                        }
                      }
                    }
                  }
                } catch {/* noop */}

                // Trouver le node correspondant via helper (cascaderNodeId, uuid in selectedValue, or fallback by label/value)
                let matchingNodeCopy = resolveMatchingNodeFromSelectedValue(selectedValue, cascaderNodeId);
                if (!matchingNodeCopy && selectedOption && (selectedOption as any).id) {
                  matchingNodeCopy = resolveMatchingNodeFromSelectedValue((selectedOption as any).id, cascaderNodeId);
                }

                if (matchingNodeCopy) {
                  // 🎨 HÉRITAGE APPARENCE: Extraire l'apparence du champ parent (f) pour la transmettre aux shared refs
                  const parentFieldAppearance = {
                    size: f.appearanceConfig?.size ?? f.config?.size,
                    variant: f.appearanceConfig?.variant ?? f.config?.variant,
                    width: f.appearanceConfig?.width ?? f.config?.width,
                    labelColor: f.appearanceConfig?.labelColor ?? f.config?.labelColor,
                  };
                  // 🔧 FIX DYNAMIQUE: Extraire le subtab du parent pour l'héritage aux enfants
                  const parentSubTabsForChildren = extractSubTabAssignments(f);
                  
                  const childFields = allNodes.filter(childNode => childNode.parentId === matchingNodeCopy.id && childNode.type === 'leaf_option_field');
                  for (const child of childFields) {
                    // 🎨 HÉRITAGE APPARENCE + SUBTAB: Passer l'apparence et le subtab du parent
                    conditionalFieldsToRender.push(buildConditionalFieldFromNode(child, parentFieldAppearance, parentSubTabsForChildren));
                  }
                  const sharedReferenceIds = findAllSharedReferencesRecursive(matchingNodeCopy.id, allNodes);
                  for (const refId of sharedReferenceIds) {
                    const refNode = allNodes.find(n => n.id === refId);
                    // 🎨 HÉRITAGE APPARENCE + SUBTAB: Passer l'apparence et le subtab du parent
                    if (refNode) conditionalFieldsToRender.push(buildConditionalFieldFromNode(refNode, parentFieldAppearance, parentSubTabsForChildren));
                  }
                  // Fallback: si selectedValue est vide, utiliser le label du node
                  if (selectedValue === undefined || selectedValue === null) selectedValue = matchingNodeCopy.label;
                }
                // Debug: if we could not reconstruct conditionalFields for a copy
                if ((!selectedOption || (selectedOption && (!Array.isArray(selectedOption.conditionalFields) || selectedOption.conditionalFields.length === 0))) && conditionalFieldsToRender.length === 0 && (selectedValue || cascaderNodeId)) {
                  if (isTBLDebugEnabled()) tblLog('�🔎 [REPEATER COPY INJECTION] No conditional fields reconstructed for copy:', {
                    fieldId: f.id,
                    fieldLabel: f.label,
                    selectedValue,
                    cascaderNodeId,
                    optionsCount: f.options?.length || 0,
                    sampleOptions: Array.isArray(f.options) ? f.options.map(o => ({ label: o.label, value: o.value, conditionalFieldsCount: (o.conditionalFields||[]).length })) : []
                  });
                }
              }

              if (conditionalFieldsToRender.length > 0) {
                // 🔧 FIX: Trier les champs conditionnels par leur order configuré
                conditionalFieldsToRender.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
                // Injecter juste après la copie
                conditionalFieldsToRender.forEach((cf) => {
                  // Éviter doublons au sein du même parent/option
                  const isAlreadyInFinalFields = finalFields.some(existingField => 
                    existingField.id === cf.id &&
                    (existingField as any).parentFieldId === f.id &&
                    (existingField as any).parentOptionValue === selectedValue
                  );
                  if (isAlreadyInFinalFields) return;

                  const fieldLabelBase = cf.sharedReferenceName || cf.label || String(selectedValue ?? '');
                  const inheritedSubTabs = extractSubTabAssignments(cf);
                  const parentSubTabs = extractSubTabAssignments(f);
                  const effectiveSubTabs = inheritedSubTabs.length > 0 ? inheritedSubTabs : parentSubTabs;
                  const fieldWithOrder = {
                    ...cf,
                    label: fieldLabelBase,
                    sharedReferenceName: fieldLabelBase,
                    order: nextOrder,
                    subTabKeys: effectiveSubTabs.length ? effectiveSubTabs : undefined,
                    subTabKey: effectiveSubTabs[0] ?? undefined,
                    isConditional: true,
                    parentFieldId: f.id,
                    parentOptionValue: selectedValue,
                    mirrorTargetLabel: (selectedOption as any)?.label || String(selectedValue ?? '')
                  } as TBLField & { isConditional: true; parentFieldId: string; parentOptionValue: unknown };

                  finalFields.push(fieldWithOrder);
                  nextOrder++;
                });
              }
            } catch (e) {
              console.warn('[REPEATER COPY INJECTION] Échec injection conditionnels pour copie', { fieldId: f.id, error: e });
            }
          });
        }

        // 5) Ajouter le bouton + APRÈS les blocs
        const currentCopiesCount = maxBlocks;
        const canAdd = !maxItems || currentCopiesCount < (Number(maxItems) || Infinity);
        const buttonLabel = (field as any).repeater_addButtonLabel 
          || repeaterMetadata?.addButtonLabel 
          || (repeaterLabel && repeaterLabel !== 'Entrée' ? `Ajouter ${repeaterLabel}` : 'Ajouter une entrée');
        const addButtonField: TBLField = {
          ...field,
          id: `${field.id}_addButton`,
          type: 'REPEATER_ADD_BUTTON' as any,
          label: buttonLabel,
          order: nextOrder,
          isRepeaterButton: true,
          repeaterParentId: field.id,
          repeaterCanAdd: canAdd,
          repeaterInstanceCount: currentCopiesCount,
          repeaterButtonSize: buttonSize,
          repeaterButtonWidth: buttonWidth,
          repeaterIconOnly: false,
          // 🔧 FIX: Ne plus forcer 'full' - utiliser 'auto' pour permettre le flux horizontal continu
          repeater_buttonSize: 'middle',
          repeater_buttonWidth: 'auto',
          repeater_iconOnly: false
        } as TBLField & { isRepeaterButton?: boolean };
        finalFields.push(addButtonField);
        nextOrder++;

        return; // on a géré ce répéteur ici
      }
      
      if (field.conditions && field.conditions.length > 0) {
        // Champ conditionnel : vérifier s'il doit être affiché
        const condition = field.conditions[0];
        const dependentValue = formData[condition.dependsOn];
        
        let isConditionMet = false;
        switch (condition.operator) {
          case 'equals':
            isConditionMet = dependentValue === condition.showWhen;
            break;
          case 'not_equals':
            isConditionMet = dependentValue !== condition.showWhen;
            break;
          default:
            isConditionMet = true;
        }
        
        if (isConditionMet) {
          // Si la condition est remplie, l'ajouter à la position suivante
          // 🔥 CRITICAL FIX: Préserver les propriétés personnalisées comme isConditional
          finalFields.push({ 
            ...field, 
            order: nextOrder,
            // Préserver les propriétés personnalisées qui peuvent avoir été ajoutées
            ...(field as any).isConditional && { isConditional: (field as any).isConditional },
            ...(field as any).parentFieldId && { parentFieldId: (field as any).parentFieldId },
            ...(field as any).parentOptionValue && { parentOptionValue: (field as any).parentOptionValue },
            ...(field as any).namespace && { namespace: (field as any).namespace }
          });
          nextOrder++;
        }
        // Si condition non remplie, on l'ignore dans le rendu
      } else {
        // Champ normal : toujours l'ajouter à la position suivante disponible
        // 🔥 CRITICAL FIX: Préserver les propriétés personnalisées comme isConditional
        finalFields.push({ 
          ...field, 
          order: nextOrder,
          // Préserver les propriétés personnalisées qui peuvent avoir été ajoutées
          ...(field as any).isConditional && { isConditional: (field as any).isConditional },
          ...(field as any).parentFieldId && { parentFieldId: (field as any).parentFieldId },
          ...(field as any).parentOptionValue && { parentOptionValue: (field as any).parentOptionValue },
          ...(field as any).namespace && { namespace: (field as any).namespace }
        });
        nextOrder++;
        
        // 🎯 INJECTER LES CHAMPS CONDITIONNELS juste après le champ select/radio
        // 🔧 CORRECTION: Détecter SELECT même si isSelect pas défini (basé sur field.options)
        // 🔥 NOUVEAU: Aussi détecter CASCADE même sans options (pour les copies clonées)
        const isSelectField = field.isSelect || Array.isArray(field.options);
        const isCascadeWithoutOptions = field.type === 'cascade' && (!field.options || field.options.length === 0);
        

        
        if ((isSelectField && field.options) || (isCascadeWithoutOptions)) {
          let rawSelectedValue = formData[field.id];
          
          // 🔥 FIX CRITICAL: Pour les champs namespacés (repeater), essayer aussi l'ID original comme fallback
          // Ancienne implémentation ne gérait que _0_ — on généralise pour tous les index (_1_, _2_, …)
          if (rawSelectedValue === undefined) {
            // 1) Fallback direct via originalFieldId si présent
            const originalFieldId = (field as any).originalFieldId as string | undefined;
            if (originalFieldId && formData[originalFieldId] !== undefined) {
              rawSelectedValue = formData[originalFieldId];
            }
          }
          if (rawSelectedValue === undefined) {
            // 2) Fallback via motif namespace repeater: `${parentId}_${instanceIndex}_${originalId}`
            //    On extrait originalId avec une regex générale qui couvre tous les index
            const m = /^.+?_\d+?_(.+)$/.exec(field.id);
            if (m && m[1] && formData[m[1]] !== undefined) {
              rawSelectedValue = formData[m[1]];
            }
          }
          if (rawSelectedValue === undefined && field.id.includes('_0_')) {
            // 3) Compatibilité rétro: ancien format spécifique _0_
            const originalId = field.id.split('_0_')[1]; // Extraire l'ID original après le namespace
            if (originalId && formData[originalId] !== undefined) {
              rawSelectedValue = formData[originalId];
            }
          }
          if (rawSelectedValue === undefined) {
            // 4) Fallback de dernier recours: scan léger des clés formData pour un suffixe `_${originalId}`
            //    Utile si un autre schéma de namespace est utilisé (ex: multiple underscores avant l'originalId)
            const suffixMatch = (() => {
              const parts = field.id.split('_');
              if (parts.length >= 3) {
                // Si format standard repeater: parentId_<index>_<originalId>
                const maybeOriginal = parts.slice(2).join('_');
                return maybeOriginal || undefined;
              }
              return undefined;
            })();
            if (suffixMatch) {
              const key = Object.keys(formData).find(k => k === suffixMatch || k.endsWith(`_${suffixMatch}`));
              if (key && formData[key] !== undefined) {
                rawSelectedValue = formData[key];
              }
            }
          }
          
          // 🔧 CORRECTION: Normaliser les valeurs undefined pour éviter les problèmes de comparaison
          let selectedValue = rawSelectedValue === "undefined" ? undefined : rawSelectedValue;
          
          // 🎯 LOGS CIBLÉS VERSANT 1
          const isVersantField = field.label?.includes('Versant') || field.id?.includes('versant') || field.label?.toLowerCase().includes('versant');
          
          // 🚨 DEBUG CRITIQUE: Analyser le formData pour ce champ
          if (isTBLDebugEnabled()) tblLog('🔍 [FORM DATA DEBUG] Recherche de valeur pour field:', {
            fieldId: field.id,
            fieldLabel: field.label,
            rawSelectedValue,
            selectedValue,
            fieldType: field.type,
            fieldSubType: (field as any).subType,
            fieldFieldType: (field as any).fieldType,
            isRepeaterInstance: (field as any).isRepeaterInstance,
            repeaterParentId: (field as any).repeaterParentId,
            originalFieldId: (field as any).originalFieldId,
            formDataKeys: Object.keys(formData).filter(k => k.includes(field.id) || k.includes(field.id.split('_')[2] || '')),
            formDataSample: Object.fromEntries(
              Object.entries(formData).filter(([k]) => 
                k.includes(field.id) || k.includes(field.id.split('_')[2] || '') || k.includes('node_1757366229569')
              )
            )
          });

          if (isVersantField) {
            if (isTBLDebugEnabled()) tblLog('🎯🎯🎯 [VERSANT DEBUG] Champ Versant détecté:', {
              fieldId: field.id,
              fieldLabel: field.label,
              fieldType: field.type,
              fieldSubType: (field as any).subType,
              fieldFieldType: (field as any).fieldType,
              selectedValue,
              rawSelectedValue,
              isRepeaterInstance: (field as any).isRepeaterInstance,
              repeaterParentId: (field as any).repeaterParentId,
              originalFieldId: (field as any).originalFieldId,
              isOriginalRepeater: field.id === '10724c29-a717-4650-adf3-0ea6633f64f1',
              isCopiedRepeater: field.id === 'e207d8bf-6a6f-414c-94ed-ff6e47096915',
              isTemplate: field.id === '3f0f3de7-9bc4-4fca-b39e-52e1ce9530af',
              allFormDataKeys: Object.keys(formData),
              relevantFormDataEntries: Object.entries(formData).filter(([key]) => 
                key.includes('versant') || key.includes('Versant') || key.toLowerCase().includes(field.id?.toLowerCase() || '') ||
                key.includes('f3a380cd-9a66-49cf-b03a-365d174496d4') || // ID du champ Type visible dans les logs
                key.includes('10724c29') || key.includes('e207d8bf') || key.includes('3f0f3de7')
              ),
              fieldOptions: field.options || [],
              hasSharedReference: field.sharedReferenceId || field.sharedReferenceIds
            });
          }
          
          // Le système d'injection conditionnelle est entièrement dynamique
          // Il gère automatiquement l'affichage des champs basé sur les sélections utilisateur

          // Chercher l'option sélectionnée qui a des champs conditionnels
          if (isTBLDebugEnabled()) tblLog('\n��� [ULTRA DEBUG] ========== DÉBUT INJECTION CONDITIONNELS ==========');
          if (isTBLDebugEnabled()) tblLog('��� [ULTRA DEBUG] Champ détecté pour injection:', {
            fieldId: field.id,
            fieldLabel: field.label,
            fieldType: field.type,
            isSelectField,
            isCascadeWithoutOptions,
            hasOptions: Array.isArray(field.options),
            optionsCount: field.options?.length || 0,
            rawSelectedValue,
            selectedValue,
            typeRaw: typeof rawSelectedValue,
            typeNormalized: typeof selectedValue,
            formDataKeys: Object.keys(formData).filter(k => k.includes(field.id.split('_')[0]))
          });

          // 🩹 PATCH (Versant / Cascader) : Si aucune valeur n'est encore détectée mais qu'un nodeId Cascader est mémorisé
          // ou qu'on dispose déjà d'un label sélectionné dans window.TBL_FORM_DATA, essayer de reconstruire selectedValue
          if ((selectedValue === undefined || selectedValue === null) && typeof window !== 'undefined') {
            try {
              const cascNodeId = window.TBL_CASCADER_NODE_IDS?.[field.id];
              const globalFormData = (window as any).TBL_FORM_DATA as Record<string, unknown> | undefined;
              // 1) Si un nodeId est présent, tenter de retrouver le nœud puis utiliser son label
              if (cascNodeId && allNodes?.length) {
                const cascNode = allNodes.find(n => n.id === cascNodeId);
                if (cascNode) {
                  selectedValue = cascNode.label || (cascNode as any).value || selectedValue;
                  if (isTBLDebugEnabled()) tblLog('🩹 [CASCADER PATCH] selectedValue reconstruit via cascaderNodeId:', { fieldId: field.id, cascNodeId, selectedValue });
                }
              }
              // 2) Fallback: si une clé miroir simple a été stockée avec le label (cas où handleFieldChange a déjà écrit la valeur)
              if ((selectedValue === undefined || selectedValue === null) && globalFormData) {
                const direct = globalFormData[field.id];
                if (typeof direct === 'string' && direct.length > 0) {
                  selectedValue = direct as unknown;
                  if (isTBLDebugEnabled()) tblLog('🩹 [CASCADER PATCH] selectedValue reconstruit via TBL_FORM_DATA direct:', { fieldId: field.id, selectedValue });
                }
              }
              // 3) Dernier recours: tester les options en comparant label vs rawSelectedValue stringifié
              if ((selectedValue === undefined || selectedValue === null) && rawSelectedValue !== undefined && Array.isArray(field.options)) {
                const matchByLabel = field.options.find(o => o.label === rawSelectedValue);
                if (matchByLabel) {
                  selectedValue = matchByLabel.value ?? matchByLabel.label;
                  if (isTBLDebugEnabled()) tblLog('🩹 [CASCADER PATCH] selectedValue reconstruit via option.label match rawSelectedValue:', { fieldId: field.id, selectedValue });
                }
              }
            } catch (e) {
              console.warn('⚠️ [CASCADER PATCH] Échec reconstruction selectedValue:', e);
            }
          }

          // 🔥 DEBUG spécifique pour la copie du champ Versant
          if (field.id === 'e207d8bf-6a6f-414c-94ed-ffde47096915') {
            if (isTBLDebugEnabled()) tblLog('🔥🔥🔥 [COPIE VERSANT DEBUG] Champ copié spécifique détecté:', {
              fieldId: field.id,
              fieldLabel: field.label,
              fieldType: field.type,
              selectedValue,
              rawSelectedValue,
              willProceedWithInjection: selectedValue !== undefined && selectedValue !== null,
              optionsCount: field.options?.length || 0,
              hasSharedReference: field.sharedReferenceId || field.sharedReferenceIds,
              formDataCheck: Object.keys(formData).filter(k => k.includes(field.id)),
              fieldOptions: field.options?.map(opt => ({ label: opt.label, value: opt.value }))
            });
          }

          // 🔥 DEBUG spécifique pour les instances copiées du repeater (format namespacé)
          if (field.id && field.id.includes('10724c29-a717-4650-adf3-0ea6633f64f1_')) {
            if (isTBLDebugEnabled()) tblLog('🔥🔥🔥 [REPEATER INSTANCE DEBUG] Instance copiée détectée:', {
              fieldId: field.id,
              fieldLabel: field.label,
              fieldType: field.type,
              selectedValue,
              rawSelectedValue,
              isVersantInstance: field.id.includes('3f0f3de7-9bc4-4fca-b39e-52e1ce9530af'),
              instanceNumber: field.id.split('_')[1],
              templateId: field.id.split('_')[2],
              willProceedWithInjection: selectedValue !== undefined && selectedValue !== null,
              optionsCount: field.options?.length || 0,
              formDataCheck: Object.keys(formData).filter(k => k.includes(field.id))
            });
          }

          // 🎯 LOG SPÉCIAL VERSANT
          if (isVersantField) {
            if (isTBLDebugEnabled()) tblLog('🎯🎯🎯 [VERSANT INJECTION] Analyse injection pour champ Versant:', {
              fieldId: field.id,
              fieldLabel: field.label,
              selectedValue,
              willProceedWithInjection: selectedValue !== undefined && selectedValue !== null,
              optionsAvailable: field.options?.length || 0,
              isTemplate: field.id === '3f0f3de7-9bc4-4fca-b39e-52e1ce9530af',
              isInstance: field.id.includes('10724c29-a717-4650-adf3-0ea6633f64f1_'),
              optionsDetail: field.options?.map(opt => ({
                label: opt.label,
                value: opt.value,
                hasConditionals: opt.conditionalFields?.length > 0,
                hasSharedRefs: opt.sharedReferenceId || opt.sharedReferenceIds
              }))
            });
          }
          

          // Chercher l'option sélectionnée qui a des champs conditionnels
          // Normalisation forte: tout en string sauf null/undefined
          const norm = (v: unknown) => (v === null || v === undefined ? v : String(v));
          const selectedNorm = norm(selectedValue);
          
          // 🔥 LOG CRITIQUE: Vérifier l'état de field.options AVANT recherche
          if (isTBLDebugEnabled()) tblLog('��� [ULTRA DEBUG] État field.options au moment de la sélection:', {
            fieldId: field.id,
            fieldLabel: field.label,
            selectedValue,
            nbOptions: field.options?.length || 0,
            optionsDetails: field.options?.map((o, i) => ({
              index: i,
              label: o.label,
              value: o.value,
              valueType: typeof o.value,
              hasConditionalFields: Array.isArray(o.conditionalFields) && o.conditionalFields.length > 0,
              conditionalFieldsCount: o.conditionalFields?.length || 0,
              conditionalFieldsLabels: o.conditionalFields?.map(cf => cf.label) || [],
              hasMetadata: !!o.metadata,
              metadataKeys: o.metadata ? Object.keys(o.metadata) : [],
              sharedReferenceIds: o.metadata?.sharedReferenceIds || null
            }))
          });
          
          // 🎯 ÉTAPE 1 : Chercher dans field.options (niveau 1)
          let selectedOption = field.options.find(opt => {
            if (selectedValue === undefined || selectedValue === null) {
              return opt.value === undefined || opt.value === null;
            }
            return opt.value === selectedValue;
          });
          if (!selectedOption) {
            selectedOption = field.options.find(opt => norm(opt.value) === selectedNorm);
            if (selectedOption) {
              dlog('🟡 [SECTION RENDERER] Correspondance option niveau 1 trouvée via comparaison loose (string).');
            }
          }
          // 🩹 PATCH complémentaire : tenter correspondance par label si value mismatch (ex: "Mesure simple" vs "mesure_simple")
          if (!selectedOption && (selectedValue !== undefined && selectedValue !== null)) {
            selectedOption = field.options.find(opt => norm(opt.label) === selectedNorm);
            if (selectedOption) {
              dlog('🟡 [SECTION RENDERER] Correspondance option trouvée via label (patch cascader).');
            }
          }
          

          
          // 🔍🔍🔍 DEBUG: ULTRA-AGGRESSIVE - check cascade field every time
          dlog(`\n${'='.repeat(80)}`);
          dlog(`🚀🚀🚀 [EVERY CASCADE CHECK] field.type="${field.type}", field.label="${field.label}"`);
          dlog(`  selectedValue: "${selectedValue}"`);
          dlog(`  selectedOption exists? ${!!selectedOption}`);
          if (selectedOption) {
            dlog(`    → label: "${selectedOption.label}"`);
            dlog(`    → Has conditionalFields? ${!!selectedOption.conditionalFields}`);
            dlog(`    → conditionalFields length: ${selectedOption?.conditionalFields?.length || 0}`);
          }
          dlog(`${'='.repeat(80)}\n`);
          
          // 🔍🔍🔍 DEBUG: Vérifier si l'option sélectionnée a des conditionalFields
          if (selectedOption && field.type === 'cascade') {
            if (isTBLDebugEnabled()) tblLog(`🎯🎯🎯 [SELECTED OPTION CHECK] field="${field.label}", selectedValue="${selectedValue}"`, {
              selectedOptionLabel: selectedOption.label,
              selectedOptionHasConditionalFields: !!selectedOption.conditionalFields,
              selectedOptionConditionalFieldsCount: Array.isArray(selectedOption.conditionalFields) ? selectedOption.conditionalFields.length : 0,
              selectedOptionConditionalFieldsLabels: Array.isArray(selectedOption.conditionalFields) ? selectedOption.conditionalFields.map(cf => cf.label) : []
            });
          }
          
          // 🎯 ÉTAPE 2 : Si pas trouvé, chercher dans allNodes (sous-options niveau 2+)
          // On gardera ici l'id d'une éventuelle COPIE utilisée pour reconstruire la sélection,
          // afin d'attacher les champs injectés à la bonne instance (et non au template).
          let fallbackSelectedCopyId: string | undefined;
          if (!selectedOption && allNodes && allNodes.length > 0) {
            let matchingNode: RawTreeNode | undefined;
            let cascaderNodeId: string | undefined;

            if (typeof window !== 'undefined' && window.TBL_CASCADER_NODE_IDS) {
              cascaderNodeId = window.TBL_CASCADER_NODE_IDS[field.id];
            }

            // ✅ Fallback persistant: si le map volatile n'a pas l'entrée, regarder dans TBL_FORM_DATA
            if (!cascaderNodeId && typeof window !== 'undefined' && (window as any).TBL_FORM_DATA) {
              try {
                const TBL_FORM_DATA = (window as any).TBL_FORM_DATA as Record<string, unknown>;
                // 1) Clé exacte: `${field.id}__selectedNodeId`
                const directKey = `${field.id}__selectedNodeId`;
                let maybeId = TBL_FORM_DATA[directKey] as string | undefined;
                
                // 2) Monde SANS namespace: si on traite un TEMPLATE, regarder les COPIES liées
                //    (originalFieldId/sourceTemplateId) et utiliser leur `${copyId}__selectedNodeId`
                if ((!maybeId || typeof maybeId !== 'string') && Array.isArray(fields)) {
                  const relatedCopies = fields.filter(f => 
                    (f as any)?.originalFieldId === field.id || (f as any)?.sourceTemplateId === field.id
                  );
                  for (const copy of relatedCopies) {
                    const key = `${copy.id}__selectedNodeId`;
                    const val = TBL_FORM_DATA[key];
                    if (typeof val === 'string' && val.length > 0) {
                      maybeId = val as string;
                      if (isTBLDebugEnabled()) tblLog('🔁 [CASCADER FALLBACK COPY] Utilisation sélection de la copie:', {
                        templateId: field.id,
                        copyId: copy.id,
                        nodeId: maybeId
                      });
                      // 🧭 Mémoriser l'id de la copie pour attacher les champs injectés à cette instance
                      fallbackSelectedCopyId = copy.id;
                      break;
                    }
                  }
                }
                if (typeof maybeId === 'string' && maybeId.length > 0) {
                  cascaderNodeId = maybeId;
                }
              } catch { /* noop */ }
            }

            // Resolve matching node via cascaderNodeId OR selectedValue via helper
            matchingNode = resolveMatchingNodeFromSelectedValue(selectedValue, cascaderNodeId);
            if (!matchingNode && selectedOption && (selectedOption as any).id) {
              matchingNode = resolveMatchingNodeFromSelectedValue((selectedOption as any).id, cascaderNodeId);
            }
            if (matchingNode) {
              if (isTBLDebugEnabled()) tblLog('🔍🔍🔍 [SECTION RENDERER] Recherche prioritaire via nodeId/selectedValue', {
                fieldLabel: field.label,
                found: !!matchingNode,
                matchingNodeId: matchingNode.id
              });
            }
            if (!matchingNode) {
              if (isTBLDebugEnabled()) tblLog('🔍🔍🔍 [SECTION RENDERER] Option non trouvée niveau 1, recherche dans allNodes...', {
                fieldLabel: field.label,
                selectedValue,
                allNodesCount: allNodes.length,
                leafOptionNodes: allNodes.filter(n => n.type === 'leaf_option').length
              });
              
              // Chercher dans les nodes de type leaf_option qui ont le bon label/value
              // 🔧 FALLBACK: si selectedValue contient un nodeId (UUID ou node_*), prioriser la recherche par id
              if (typeof selectedValue === 'string' && selectedValue.length > 0) {
                const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
                const candidates = new Set<string>();
                candidates.add(selectedValue);
                // Extraire la partie après le dernier '_' (utile si namespace ajouté)
                const afterLastUnderscore = selectedValue.split('_').pop();
                if (afterLastUnderscore) candidates.add(afterLastUnderscore);
                const uuidMatch = selectedValue.match(uuidRegex);
                if (uuidMatch && uuidMatch[0]) candidates.add(uuidMatch[0]);

                for (const cid of Array.from(candidates)) {
                  const foundById = allNodes.find(node => node.id === cid);
                  if (foundById) {
                    matchingNode = foundById;
                    break;
                  }
                }
              }

              if (!matchingNode) {
                matchingNode = allNodes.find(node => 
                  (node.type === 'leaf_option' || node.type === 'leaf_option_field') &&
                  (node.label === selectedValue || norm(node.label) === selectedNorm)
                );
              }
              
              if (isTBLDebugEnabled()) tblLog('🔍🔍🔍 [SECTION RENDERER] Résultat recherche matchingNode:', {
                found: !!matchingNode,
                matchingNode: matchingNode ? { id: matchingNode.id, label: matchingNode.label, type: matchingNode.type } : null
              });
            }
            
            // 🔥 CRITQUE: Avant de reconstuire depuis allNodes, vérifier si l'option existe déjà dans field.options
            // avec les conditionalFields clonés (cas repeaters). Ça priorise les references namespaced.
            const preBuiltOption = field.options?.find(opt => 
              norm(opt.value) === selectedNorm || opt.value === selectedValue
            );
            
            if (preBuiltOption && preBuiltOption.conditionalFields && preBuiltOption.conditionalFields.length > 0) {
              if (isTBLDebugEnabled()) tblLog('✅ [SECTION RENDERER] Option pré-clonée trouvée dans field.options avec conditionalFields:',  {
                label: preBuiltOption.label,
                conditionalFieldsCount: preBuiltOption.conditionalFields.length,
                conditionalFieldsDetails: preBuiltOption.conditionalFields.map(cf => ({ id: cf.id, label: cf.label })),
                note: 'Utilisation des sharedReferences namespaced (cas repeater)'
              });
              selectedOption = preBuiltOption;
              // 🧩 Fallback: si la valeur sélectionnée est undefined, utiliser la valeur de l'option retenue
              if (selectedValue === undefined || selectedValue === null) {
                selectedValue = preBuiltOption.value as unknown;
                if (isTBLDebugEnabled()) tblLog('🧩 [FALLBACK SELECTED VALUE] selectedValue défini via preBuiltOption.value =', selectedValue);
              }
            } else if (matchingNode) {
              if (isTBLDebugEnabled()) tblLog('✅✅✅ [SECTION RENDERER] Option trouvée dans allNodes:', matchingNode);
              if (isTBLDebugEnabled()) tblLog('🔍 [MATCHING NODE DEBUG] Détails complets du nœud:', {
                id: matchingNode.id,
                label: matchingNode.label,
                type: matchingNode.type,
                parentId: matchingNode.parentId,
                sharedReferenceIds: matchingNode.sharedReferenceIds,
                sharedReferenceId: matchingNode.sharedReferenceId,
                metadata: matchingNode.metadata
              });

              const reconstructedOption: { id: string; value: string; label: string; conditionalFields?: TBLField[]; metadata?: Record<string, unknown> | null } = {
                id: matchingNode.id,
                value: matchingNode.label,
                label: matchingNode.label,
                metadata: matchingNode.metadata || null
              };

              const conditionalFields: TBLField[] = [];
              const existingIds = new Set<string>();

              // 🎨 HÉRITAGE APPARENCE: Extraire l'apparence du champ parent (field) pour la transmettre aux enfants
              const parentFieldAppearanceForChildren = {
                size: field.appearanceConfig?.size ?? field.config?.size,
                variant: field.appearanceConfig?.variant ?? field.config?.variant,
                width: field.appearanceConfig?.width ?? field.config?.width,
                labelColor: field.appearanceConfig?.labelColor ?? field.config?.labelColor,
              };
              // 🔧 FIX DYNAMIQUE: Extraire le subtab du parent pour l'héritage aux enfants
              const parentSubTabsForChildren = extractSubTabAssignments(field);

              const childFields = allNodes.filter(childNode =>
                childNode.parentId === matchingNode.id &&
                childNode.type === 'leaf_option_field'
              );

              if (isTBLDebugEnabled()) tblLog('🔍🔍🔍 [SECTION RENDERER] Recherche childFields:', {
                matchingNodeId: matchingNode.id,
                childFieldsCount: childFields.length,
                childFields: childFields.map(c => ({ id: c.id, label: c.label, type: c.type, fieldType: c.fieldType, sharedReferenceName: c.sharedReferenceName }))
              });

              if (childFields.length > 0) {
                if (isTBLDebugEnabled()) tblLog(`🎯🎯🎯 [SECTION RENDERER] Trouvé ${childFields.length} champs enfants (références partagées)`);
                childFields.forEach(childNode => {
                  // 🎨 HÉRITAGE APPARENCE + SUBTAB: Passer l'apparence et le subtab du parent
                  const fieldFromChild = buildConditionalFieldFromNode(childNode, parentFieldAppearanceForChildren, parentSubTabsForChildren);
                  conditionalFields.push(fieldFromChild);
                  existingIds.add(fieldFromChild.id);
                });
              }

              if (isTBLDebugEnabled()) tblLog('🔍🔍🔍 [SECTION RENDERER] Reconstruction option depuis allNodes:', {
                matchingNodeId: matchingNode.id,
                matchingNodeLabel: matchingNode.label,
                fieldId: field.id,
                fieldLabel: field.label,
                selectedValue,
                matchingNodeHasSharedRefs: !!matchingNode.sharedReferenceIds,
                matchingNodeSharedRefsLength: Array.isArray(matchingNode.sharedReferenceIds) ? matchingNode.sharedReferenceIds.length : 0
              });
              

              // 🔥 AMÉLIORATION : Utiliser la recherche récursive dans toute la hiérarchie TreeBranchLeafNode
              // Les sharedReferenceIds peuvent être dans le nœud directement OU dans ses enfants
              const sharedReferenceIds = findAllSharedReferencesRecursive(matchingNode.id, allNodes);
              
              if (isTBLDebugEnabled()) tblLog('🔗🔗🔗 [SECTION RENDERER] Recherche RÉCURSIVE des références partagées:', {
                matchingNodeId: matchingNode.id,
                matchingNodeLabel: matchingNode.label,
                sharedReferenceIdsRecursive: sharedReferenceIds,
                fieldId: field.id,
                fieldLabel: field.label,
                allNodesCount: allNodes.length,
                directSharedRefs: matchingNode.sharedReferenceIds,
                directSharedRef: matchingNode.sharedReferenceId,
                childrenByParentId: allNodes.filter(n => n.parentId === matchingNode.id).map(c => ({
                  id: c.id,
                  label: c.label,
                  type: c.type,
                  sharedReferenceIds: c.sharedReferenceIds
                }))
              });

              if (sharedReferenceIds.length > 0) {
                if (isTBLDebugEnabled()) tblLog('🔗🔗🔗 [SECTION RENDERER] Références partagées détectées via recherche récursive:', {
                  matchingNodeId: matchingNode.id,
                  sharedReferenceIds,
                  fieldId: field.id,
                  fieldLabel: field.label
                });

                // 🎨 HÉRITAGE APPARENCE + SUBTAB: Réutiliser parentFieldAppearanceForChildren et parentSubTabsForChildren déclarés plus haut

                sharedReferenceIds.forEach(refId => {
                  const refNode = allNodes.find(node => node.id === refId);
                  if (!refNode) {
                    if (isTBLDebugEnabled()) tblLog('⚠️ [SECTION RENDERER] Référence partagée introuvable:', { refId, matchingNodeId: matchingNode.id });
                    return;
                  }
                  if (existingIds.has(refNode.id)) {
                    if (isTBLDebugEnabled()) tblLog('⚠️ [SECTION RENDERER] Référence déjà ajoutée:', { refId: refNode.id, matchingNodeId: matchingNode.id });
                    return;
                  }
                  
                  if (isTBLDebugEnabled()) tblLog('✅ [SECTION RENDERER] Ajout référence partagée:', {
                    refId: refNode.id,
                    refLabel: refNode.label,
                    refFieldType: refNode.fieldType,
                    matchingNodeId: matchingNode.id,
                    parentAppearanceInherited: parentFieldAppearanceForChildren,
                    parentSubTabsInherited: parentSubTabsForChildren
                  });
                  
                  // 🎨 HÉRITAGE APPARENCE + SUBTAB: Passer l'apparence et le subtab du parent
                  const refField = buildConditionalFieldFromNode(refNode, parentFieldAppearanceForChildren, parentSubTabsForChildren);
                  conditionalFields.push(refField);
                  existingIds.add(refField.id);
                  
                  if (isTBLDebugEnabled()) tblLog('✅ [SECTION RENDERER] Champ conditionnel ajouté:', {
                    refFieldId: refField.id,
                    refFieldLabel: refField.label,
                    refFieldType: refField.type,
                    conditionalFieldsCount: conditionalFields.length
                  });
                });
              } else {
                if (isTBLDebugEnabled()) tblLog('⚠️ [SECTION RENDERER] Aucune référence partagée trouvée via recherche récursive:', {
                  matchingNodeId: matchingNode.id,
                  matchingNodeLabel: matchingNode.label,
                  fieldId: field.id,
                  fieldLabel: field.label
                });
              }

              if (conditionalFields.length > 0) {
                // 🔧 FIX: Trier les champs conditionnels par leur order configuré
                // pour respecter l'ordre défini dans l'arbre (ex: Hauteur total, Hauteur corniche, Base du triangle)
                conditionalFields.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
                reconstructedOption.conditionalFields = conditionalFields;
              }

              selectedOption = reconstructedOption;
              // 🧩 Fallback: si selectedValue est undefined, utiliser le label de l'option reconstruite
              if (selectedValue === undefined || selectedValue === null) {
                selectedValue = reconstructedOption.value as unknown;
                if (isTBLDebugEnabled()) tblLog('🧩 [FALLBACK SELECTED VALUE] selectedValue défini via reconstructedOption.value =', selectedValue);
              }
            } else {
              dlog('🔴 [SECTION RENDERER] Aucune option match dans field.options ni allNodes. selectedValue=', selectedValue, 'selectedNorm=', selectedNorm);
            }
          } else if (!selectedOption) {
            dlog('🔴 [SECTION RENDERER] Aucune option match strict ou loose. selectedValue=', selectedValue, 'selectedNorm=', selectedNorm, 'options=', field.options.map(o => ({ value:o.value, norm:norm(o.value) })));
          }

          // ✅ ÉTAPE 2-bis : Si une option est trouvée mais SANS champs conditionnels,
          // reconstruire dynamiquement ses conditionalFields depuis allNodes (refs partagées + enfants directs)
          if (selectedOption && (!Array.isArray(selectedOption.conditionalFields) || selectedOption.conditionalFields.length === 0) && allNodes && allNodes.length > 0) {
            try {
              let srcNode: RawTreeNode | undefined = undefined;
              // Priorité: id exact de l'option s'il correspond à un node
              if (selectedOption.id) {
                srcNode = allNodes.find(n => n.id === (selectedOption as any).id);
              }
              // Fallback: recherche par label/value
              if (!srcNode) {
                srcNode = allNodes.find(node => 
                  (node.type === 'leaf_option' || node.type === 'leaf_option_field') &&
                  (node.label === selectedOption!.value || norm(node.label) === selectedNorm)
                );
              }

              if (srcNode) {
                const rebuiltConditional: TBLField[] = [];
                const existingIds = new Set<string>();

                // 🎨 HÉRITAGE APPARENCE: Extraire l'apparence du champ parent (field) pour la transmettre aux shared refs
                const parentFieldAppearance = {
                  size: field.appearanceConfig?.size ?? field.config?.size,
                  variant: field.appearanceConfig?.variant ?? field.config?.variant,
                  width: field.appearanceConfig?.width ?? field.config?.width,
                  labelColor: field.appearanceConfig?.labelColor ?? field.config?.labelColor,
                };
                // 🔧 FIX DYNAMIQUE: Extraire le subtab du parent pour l'héritage aux enfants
                const parentSubTabsForInheritance = extractSubTabAssignments(field);

                // 1) Ajouter les enfants directs de type leaf_option_field
                const childFields = allNodes.filter(childNode =>
                  childNode.parentId === srcNode!.id &&
                  childNode.type === 'leaf_option_field'
                );
                childFields.forEach(childNode => {
                  // 🎨 HÉRITAGE APPARENCE + SUBTAB: Passer l'apparence et le subtab du parent
                  const fieldFromChild = buildConditionalFieldFromNode(childNode, parentFieldAppearance, parentSubTabsForInheritance);
                  rebuiltConditional.push(fieldFromChild);
                  existingIds.add(fieldFromChild.id);
                });

                // 2) Injecter les références partagées détectées récursivement depuis srcNode
                const sharedReferenceIds = findAllSharedReferencesRecursive(srcNode.id, allNodes);
                sharedReferenceIds.forEach(refId => {
                  const refNode = allNodes.find(node => node.id === refId);
                  if (!refNode || existingIds.has(refNode.id)) return;
                  // 🎨 HÉRITAGE APPARENCE + SUBTAB: Passer l'apparence et le subtab du parent
                  const refField = buildConditionalFieldFromNode(refNode, parentFieldAppearance, parentSubTabsForInheritance);
                  rebuiltConditional.push(refField);
                  existingIds.add(refField.id);
                });

                if (rebuiltConditional.length > 0) {
                  // 🔧 FIX: Trier les champs conditionnels par leur order configuré
                  rebuiltConditional.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
                  (selectedOption as any).conditionalFields = rebuiltConditional;
                  if (isTBLDebugEnabled()) tblLog('✅ [SECTION RENDERER] conditionalFields reconstruits dynamiquement pour option sélectionnée:', {
                    fieldId: field.id,
                    fieldLabel: field.label,
                    optionLabel: selectedOption.label,
                    count: rebuiltConditional.length
                  });
                }
              }
            } catch (e) {
              console.warn('⚠️ [SECTION RENDERER] Reconstruction conditionalFields échouée:', e);
            }
          }
          
          dlog(`🔍 [SECTION RENDERER] Option finale trouvée:`, selectedOption);
          
          const rawConditionalFields = selectedOption?.conditionalFields || [];
          // 🔧 FIX: Toujours trier les champs conditionnels par order pour respecter l'ordre configuré
          // (même si selectedOption vient de field.options et pas de la reconstruction)
          let conditionalFieldsToRender = [...rawConditionalFields].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));


          // �🚨🚨 [DIAGNOSTIC VERSANT-MESURE SIMPLE] - Log TOUTES les sélections cascade
          if (field.type === 'cascade' && selectedValue) {
            if (isTBLDebugEnabled()) tblLog(`\n${'🔥'.repeat(50)}`);
            if (isTBLDebugEnabled()) tblLog(`🚨🚨🚨 [CASCADE SELECTED] field="${field.label}" (id=${field.id})`);
            if (isTBLDebugEnabled()) tblLog(`🚨 selectedValue="${selectedValue}"`);
            if (isTBLDebugEnabled()) tblLog(`🚨 selectedOption exists? ${!!selectedOption}`);
            if (isTBLDebugEnabled()) tblLog(`🚨 field.isRepeaterInstance? ${!!(field as any).isRepeaterInstance}`);
            if (isTBLDebugEnabled()) tblLog(`🚨 field.repeaterNamespace?`, (field as any).repeaterNamespace);
            
            if (selectedOption) {
              if (isTBLDebugEnabled()) tblLog(`🚨 selectedOption.label: "${selectedOption.label}"`);
              if (isTBLDebugEnabled()) tblLog(`🚨 selectedOption.value: "${selectedOption.value}"`);
              if (isTBLDebugEnabled()) tblLog(`🚨 selectedOption.conditionalFields exists? ${!!selectedOption.conditionalFields}`);
              if (isTBLDebugEnabled()) tblLog(`🚨 selectedOption.conditionalFields.length: ${selectedOption.conditionalFields?.length || 0}`);
              
              // 🔥🔥🔥 DETECTION SPECIFIQUE MESURE SIMPLE 🔥🔥🔥
              if (selectedOption.label === 'Mesure simple') {
                if (isTBLDebugEnabled()) tblLog(`\n${'🎯'.repeat(30)}`);
                if (isTBLDebugEnabled()) tblLog('🎯🎯🎯 [MESURE SIMPLE DETECTED] DÉTECTION MESURE SIMPLE !');
                if (isTBLDebugEnabled()) tblLog('🎯 Contexte complet:', {
                  fieldId: field.id,
                  fieldLabel: field.label,
                  isRepeaterInstance: !!(field as any).isRepeaterInstance,
                  repeaterNamespace: (field as any).repeaterNamespace,
                  selectedOption: {
                    label: selectedOption.label,
                    value: selectedOption.value,
                    hasConditionalFields: !!selectedOption.conditionalFields,
                    conditionalFieldsCount: selectedOption.conditionalFields?.length || 0
                  }
                });
                
                if (selectedOption.conditionalFields?.length > 0) {
                  if (isTBLDebugEnabled()) tblLog('🎯 [MESURE SIMPLE] Champs conditionnels trouvés:');
                  selectedOption.conditionalFields.forEach((cf, idx) => {
                    if (isTBLDebugEnabled()) tblLog(`🎯   ${idx + 1}. ${cf.label} (id: ${cf.id}, sharedRef: ${(cf as any).sharedReferenceName})`);
                  });
                  
                  // Vérifier spécifiquement les champs recherchés
                  const longueurFacade = selectedOption.conditionalFields.find(cf => 
                    cf.label?.toLowerCase().includes('longueur') && cf.label?.toLowerCase().includes('façade')
                  );
                  const rampant = selectedOption.conditionalFields.find(cf => 
                    cf.label?.toLowerCase().includes('rampant')
                  );
                  
                  if (isTBLDebugEnabled()) tblLog('🎯 [MESURE SIMPLE] Champs cibles recherchés:', {
                    longueurFacadeTrouve: !!longueurFacade,
                    longueurFacadeDetails: longueurFacade ? {
                      id: longueurFacade.id,
                      label: longueurFacade.label,
                      sharedRef: (longueurFacade as any).sharedReferenceName
                    } : null,
                    rampantTrouve: !!rampant,
                    rampantDetails: rampant ? {
                      id: rampant.id,
                      label: rampant.label,
                      sharedRef: (rampant as any).sharedReferenceName
                    } : null
                  });
                } else {
                  if (isTBLDebugEnabled()) tblLog('🎯 [MESURE SIMPLE] ❌ PROBLÈME: Aucun champ conditionnel trouvé !');
                }
                if (isTBLDebugEnabled()) tblLog(`${'🎯'.repeat(30)}\n`);
              }
              
              if (selectedOption.conditionalFields && selectedOption.conditionalFields.length > 0) {
                if (isTBLDebugEnabled()) tblLog(`🚨 RÉFÉRENCES PARTAGÉES TROUVÉES:`, selectedOption.conditionalFields.map(f => ({
                  id: f.id,
                  label: f.label,
                  type: f.type,
                  sharedReferenceName: (f as any).sharedReferenceName
                })));
              } else {
                if (isTBLDebugEnabled()) tblLog(`🚨 ❌ AUCUNE RÉFÉRENCE PARTAGÉE dans selectedOption.conditionalFields`);
              }
            } else {
              if (isTBLDebugEnabled()) tblLog(`🚨 ❌ selectedOption is NULL or UNDEFINED`);
            }
            
            if (isTBLDebugEnabled()) tblLog(`🚨 rawConditionalFields.length: ${rawConditionalFields.length}`);
            if (isTBLDebugEnabled()) tblLog(`${'🔥'.repeat(50)}\n`);
          }

          // 🔥 FIX: Toujours traiter les conditionalFields (repeater ET copies normales)
          // Pour les repeaters: appliquer namespace; pour les copies normales: utiliser as-is
          if (rawConditionalFields.length > 0) {
            // 🎯 LOG SPÉCIFIQUE MESURE SIMPLE DANS REPEATER
            if (selectedOption?.label === 'Mesure simple' && (field as any).isRepeaterInstance) {
              if (isTBLDebugEnabled()) tblLog(`\n${'🎯'.repeat(50)}`);
              if (isTBLDebugEnabled()) tblLog('🎯🎯🎯 [MESURE SIMPLE REPEATER] DÉTECTION DANS REPEATER !');
              if (isTBLDebugEnabled()) tblLog('🎯 Context:', {
                fieldLabel: field.label,
                repeaterNamespace: (field as any).repeaterNamespace,
                conditionalFieldsCount: rawConditionalFields.length,
                conditionalFields: rawConditionalFields.map(cf => ({
                  id: cf.id,
                  label: cf.label,
                  sharedRef: (cf as any).sharedReferenceName
                }))
              });
            }
            
            const namespaceMeta = (field as any).repeaterNamespace as RepeaterNamespaceMeta | undefined;
            
            if (namespaceMeta && (field as any).isRepeaterInstance) {
              // 🔄 Cas repeater: appliquer namespaceRepeaterField SAUF pour les références partagées
              if (selectedOption?.label === 'Mesure simple') {
                if (isTBLDebugEnabled()) tblLog('💥💥💥 [MESURE SIMPLE REPEATER] CHECKING SHARED REFERENCES');
              }
              conditionalFieldsToRender = rawConditionalFields.map((conditionalField, index) => {
                if ((conditionalField as any).isRepeaterInstance) {
                  return conditionalField;
                }
                
                // 🚨 NOUVELLE LOGIQUE: Bypass namespacing pour les références partagées ET les nœuds backend
                const hasSharedReferences = !!(
                  conditionalField.sharedReferenceId || 
                  (conditionalField.sharedReferenceIds && conditionalField.sharedReferenceIds.length > 0)
                );
                
                // 🔥 NOUVEAU: Bypass pour les nœuds backend (GRD, Prix Kwh, etc.)
                const isBackendNode = !!(
                  (conditionalField as any).metadata?.sourceType === 'tree' ||
                  (conditionalField as any).config?.sourceType === 'tree' ||
                  (conditionalField as any).nodeId ||
                  (conditionalField as any).metadata?.nodeId || // Vérifier aussi dans les métadonnées
                  (conditionalField as any).config?.nodeId || // Vérifier aussi dans la config
                  (conditionalField as any).metadata?.sourceRef ||
                  (conditionalField.id && conditionalField.id.startsWith('node_')) // Fallback: l'ID ressemble à un ID de noeud backend
                );
                
                if (hasSharedReferences || isBackendNode) {
                  if (selectedOption?.label === 'Mesure simple') {
                    if (hasSharedReferences) {
                      if (isTBLDebugEnabled()) tblLog(`🔥 [${index + 1}] BYPASS NAMESPACE (shared ref):`, {
                        id: conditionalField.id,
                        label: conditionalField.label,
                        sharedReferenceId: conditionalField.sharedReferenceId,
                        sharedReferenceIds: conditionalField.sharedReferenceIds,
                        sharedReferenceName: conditionalField.sharedReferenceName
                      });
                    }
                    if (isBackendNode) {
                      if (isTBLDebugEnabled()) tblLog(`🔥 [${index + 1}] BYPASS NAMESPACE (backend node):`, {
                        id: conditionalField.id,
                        label: conditionalField.label,
                        nodeId: (conditionalField as any).nodeId || (conditionalField as any).metadata?.nodeId || (conditionalField as any).config?.nodeId,
                        sourceType: (conditionalField as any).metadata?.sourceType || (conditionalField as any).config?.sourceType,
                        sourceRef: (conditionalField as any).metadata?.sourceRef,
                        idLooksLikeNode: conditionalField.id && conditionalField.id.startsWith('node_')
                      });
                    }
                  }
                  // Retourner le champ tel quel, en s'assurant que nodeId est bien présent à la racine
                  return {
                    ...conditionalField,
                    nodeId: (conditionalField as any).nodeId || conditionalField.id
                  };
                }
                
                const namespacedField = namespaceRepeaterField(
                  conditionalField,
                  namespaceMeta,
                  {
                    applyLabelPrefix: false,
                    templateNodeId: (conditionalField as unknown as { originalFieldId?: string }).originalFieldId ||
                      (conditionalField as unknown as { repeaterTemplateNameId?: string }).repeaterTemplateNodeId ||
                      conditionalField.id
                  }
                );
                
                if (selectedOption?.label === 'Mesure simple') {
                  if (isTBLDebugEnabled()) tblLog(`💥 [${index + 1}] NAMESPACÉ (pas de shared ref):`, {
                    avant: conditionalField.label,
                    après: namespacedField.label,
                    id: namespacedField.id
                  });
                }
                
                return namespacedField;
              });
            }
            // ✅ Cas copie normale: les conditionalFields sont déjà correctement clonés (sans namespace)
          }

          if (conditionalFieldsToRender.length > 0) {
            // Si la sélection a été reconstruite à partir d'une COPIE, on laisse l'injection se faire au niveau de la copie
            if (fallbackSelectedCopyId && fallbackSelectedCopyId !== field.id) {
              if (isTBLDebugEnabled()) tblLog('↪️ [INJECTION SKIP] Sélection reconstruite depuis une copie, injection déléguée à la copie.', {
                templateId: field.id,
                fallbackSelectedCopyId
              });
              return; // ne pas injecter ici
            }
            // Déterminer le parentFieldId à utiliser pour l'injection
            // Si nous avons reconstruit la sélection via une COPIE, attacher aux champs de la copie.
            const parentIdForInjection = field.id;
            if (selectedOption?.label === 'Mesure simple') {
              if (isTBLDebugEnabled()) tblLog('🧭 [INJECTION PARENT] Détermination du parentFieldId pour injection:', {
                fieldId: field.id,
                fallbackSelectedCopyId,
                parentIdForInjection
              });
            }
            // 🎉 LOG FINAL POUR MESURE SIMPLE
            if (selectedOption?.label === 'Mesure simple') {
              if (isTBLDebugEnabled()) tblLog(`\n${'🎉'.repeat(50)}`);
              if (isTBLDebugEnabled()) tblLog('🎉🎉🎉 [MESURE SIMPLE INJECTION] INJECTION FINALE RÉUSSIE !');
              if (isTBLDebugEnabled()) tblLog('🎉 Champs injectés:', conditionalFieldsToRender.map(cf => ({
                id: cf.id,
                label: cf.label,
                type: cf.type,
                sharedReferenceName: cf.sharedReferenceName,
                sharedReferenceId: cf.sharedReferenceId,
                sharedReferenceIds: cf.sharedReferenceIds
              })));
              if (isTBLDebugEnabled()) tblLog(`${'🎉'.repeat(50)}\n`);
            } else {
              if (isTBLDebugEnabled()) tblLog('🔍 [CONDITIONAL FIELDS] Injection de champs conditionnels:', {
                fieldId: field.id,
                fieldLabel: field.label,
                selectedOptionLabel: selectedOption?.label,
                conditionalFieldsCount: conditionalFieldsToRender.length,
                conditionalFields: conditionalFieldsToRender.map(cf => ({
                  id: cf.id,
                  label: cf.label,
                  type: cf.type,
                  sharedReferenceName: cf.sharedReferenceName
                }))
              });
            }
            
            if (fallbackSelectedCopyId) {
              dlog(`[SKIP INJECTION @TEMPLATE] La sélection appartient à une copie (${fallbackSelectedCopyId}). L'injection se fera au niveau de la copie.`);
            } else {
              if (conditionalFieldsToRender !== rawConditionalFields) {
                (selectedOption as unknown as { conditionalFields?: TBLField[] }).conditionalFields = conditionalFieldsToRender;
              }
              const injSignatureObj = {
                fieldId: parentIdForInjection,
                optionValue: selectedOption.value,
                conditionalIds: conditionalFieldsToRender.map(cf => cf.id)
              };
              const injHash = JSON.stringify(injSignatureObj);
              if (lastInjectionHashRef.current !== injHash) {
                lastInjectionHashRef.current = injHash;
                dlog(`========== INJECTION CHAMPS CONDITIONNELS ==========`);
                dlog(`Field: "${field.label}"`);
                dlog(`Option: "${selectedOption.label}"`);
                dlog(`Nombre de champs: ${conditionalFieldsToRender.length}`);
                dlog(`Détails champs:`, conditionalFieldsToRender.map(cf => ({
                label: cf.label,
                type: cf.type,
                placeholder: cf.placeholder
                })));
              } else {
                dlog(`(déjà loggé) Injection inchangée pour field=${parentIdForInjection} option=${selectedOption.value}`);
              }
              
              // Injecter TOUS les champs conditionnels avec des ordres séquentiels
              // 🔧 FIX: Trier par order configuré pour respecter l'ordre défini dans l'arbre
              conditionalFieldsToRender.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
              
              conditionalFieldsToRender.forEach((conditionalField, index) => {
              // 🔥 VÉRIFICATION AMÉLIORÉE: Éviter les doublons basé sur plusieurs critères
              const isAlreadyInFinalFields = finalFields.some(existingField => 
                existingField.id === conditionalField.id &&
                (existingField as any).parentFieldId === parentIdForInjection &&
                (existingField as any).parentOptionValue === selectedValue
              );
              
              // 🔥 NOUVELLE VÉRIFICATION: Éviter les doublons basés sur parentFieldId + parentOptionValue
              const isDuplicateBasedOnParent = finalFields.some(existingField => 
                existingField.parentFieldId === parentIdForInjection && 
                existingField.parentOptionValue === selectedValue &&
                existingField.label === conditionalField.label
              );
              
              if (isAlreadyInFinalFields || isDuplicateBasedOnParent) {
                if (isTBLDebugEnabled()) tblLog('🚫 [CONDITIONAL FIELD] Éviter doublon - champ déjà présent:', {
                  id: conditionalField.id,
                  label: conditionalField.label,
                  parentField: parentIdForInjection,
                  selectedOption: selectedOption.label,
                  reasonByFieldId: isAlreadyInFinalFields,
                  reasonByParentCombo: isDuplicateBasedOnParent
                });
                return; // Skip cette injection pour éviter le doublon
              }
              
              // 🔧 FIX: Si ce champ conditionnel existe aussi dans section.fields (comme champ normal),
              // le marquer comme consommé pour qu'il ne soit pas rendu deux fois.
              // On l'injecte ICI (position conditionnelle, après le cascade parent) et on skip
              // sa position originale dans section.fields.
              const matchInSectionFields = section.fields.find(sf => 
                sf.id === conditionalField.id && !(sf as any).isConditional
              );
              if (matchInSectionFields) {
                consumedFieldIds.add(matchInSectionFields.id);
              }
              
              // 🔥 CORRECTION : Utiliser le nom de la référence partagée au lieu du label de l'option
              const baseSharedRefName = conditionalField.sharedReferenceName || conditionalField.label;
              let fieldLabel = baseSharedRefName || `${selectedOption.label} ${index + 1}`;
              const conditionalNamespace = (conditionalField as any).repeaterNamespace as RepeaterNamespaceMeta | undefined;
              if (conditionalNamespace?.labelPrefix && !fieldLabel.startsWith(`${conditionalNamespace.labelPrefix} -`)) {
                fieldLabel = `${conditionalNamespace.labelPrefix} - ${fieldLabel}`;
              }
              const inheritedSubTabs = extractSubTabAssignments(conditionalField);
              const parentSubTabs = extractSubTabAssignments(field);
              const effectiveSubTabs = inheritedSubTabs.length > 0 ? inheritedSubTabs : parentSubTabs;
              
              const fieldWithOrder = {
                ...conditionalField,
                label: fieldLabel,
                sharedReferenceName: fieldLabel,
                order: nextOrder,
                subTabKeys: effectiveSubTabs.length ? effectiveSubTabs : undefined,
                subTabKey: effectiveSubTabs[0] ?? undefined,
                // Marquer comme champ conditionnel pour la logique interne seulement
                isConditional: true,
                parentFieldId: parentIdForInjection,
                parentOptionValue: selectedValue, // Utiliser la valeur normalisée (peut provenir du fallback si undefined)
                // ✨ CIBLE MIROIR: relier ce champ conditionnel à la carte Données portant le label de l'option
                // Exemple: option "Prix Kw/h" -> mirrorTargetLabel = "Prix Kw/h" pour alimenter la carte du même nom
                mirrorTargetLabel: selectedOption.label
              };
              

              
              dlog(`Création champ conditionnel #${index + 1}`, {
                label: fieldWithOrder.label,
                order: fieldWithOrder.order,
                parentFieldId: fieldWithOrder.parentFieldId,
                parentOptionValue: fieldWithOrder.parentOptionValue
              });
              
              finalFields.push(fieldWithOrder);
              nextOrder++;
              });
            }
            

          } 
          // ✨ NOUVEAU: Détecter les capacités TreeBranchLeaf sur l'option sélectionnée
          else if (selectedOption && (selectedOption.hasData || selectedOption.hasFormula)) {
            dlog(`Option avec capacités TreeBranchLeaf`, {
              option: selectedOption.label,
              hasData: selectedOption.hasData,
              hasFormula: selectedOption.hasFormula
            });
            
            // Générer automatiquement un champ intelligent pour cette option
            const smartField = {
              id: `${selectedOption.value}_smart_field`,
              type: 'TEXT',
              label: selectedOption.label,
              order: nextOrder,
              isConditional: true,
              parentFieldId: field.id,
              parentOptionValue: selectedValue, // Utiliser la valeur normalisée
              // Copier les capacités TreeBranchLeaf de l'option
              hasData: selectedOption.hasData,
              hasFormula: selectedOption.hasFormula,
              capabilities: selectedOption.capabilities,
              metadata: selectedOption.metadata,
              // Marquer comme champ intelligent TreeBranchLeaf
              isTreeBranchLeafSmart: true
            };
            
            dlog(`Génération automatique du champ intelligent pour ${selectedOption.label}`);
            finalFields.push(smartField);
            nextOrder++;
          }
          else {
            dlog(`Aucun champ conditionnel trouvé pour l'option "${selectedValue}"`);
            
            // Debug supplémentaire pour voir toutes les options avec champs conditionnels
            dlog(`Liste options avec champs conditionnels`, field.options.filter(opt => opt.conditionalFields && opt.conditionalFields.length > 0).map(opt => ({
              label: opt.label,
              value: opt.value,
              count: opt.conditionalFields?.length
            })));
          }
        }
      }
    });
    
    // (le traitement des repeaters se fait inline ci-dessus)
    
    // 🔥 DÉDUPLICATION FINALE: Nettoyer les doublons potentiels
    // IMPORTANT: on ne doit PAS fusionner deux champs conditionnels provenant de parents différents
    // (ex: Versant original vs Versant (Copie 1) vs Versant (Copie 2)).
    // On considère donc un champ unique par triplet (id, parentFieldId, parentOptionValue) lorsqu'il est conditionnel.
    const uniqueFields = finalFields.reduce((acc, field) => {
      const isConditional = (field as any).isConditional === true;
      const compositeKey = isConditional
        ? `${field.id}::${(field as any).parentFieldId || 'no-parent'}::${(field as any).parentOptionValue ?? ''}`
        : field.id;

      const existingFieldIndex = acc.findIndex(existingField => {
        const existingIsConditional = (existingField as any).isConditional === true;
        const existingKey = existingIsConditional
          ? `${existingField.id}::${(existingField as any).parentFieldId || 'no-parent'}::${(existingField as any).parentOptionValue ?? ''}`
          : existingField.id;
        return existingKey === compositeKey;
      });
      
      if (existingFieldIndex === -1) {
        // Nouveau champ, l'ajouter
        acc.push(field);
      } else {
        // Champ existant - garder celui avec l'ordre le plus bas (premier ajouté)
        const existingField = acc[existingFieldIndex];
        if (field.order < existingField.order) {
          acc[existingFieldIndex] = field;
        }
        if (isTBLDebugEnabled()) tblLog('🔧 [DEDUPLICATION] Doublon détecté et résolu:', {
          id: field.id,
          label: field.label,
          parentFieldId: (field as any).parentFieldId,
          parentOptionValue: (field as any).parentOptionValue,
          keptOrder: Math.min(field.order, existingField.order),
          removedOrder: Math.max(field.order, existingField.order)
        });
      }
      
      return acc;
    }, [] as typeof finalFields);
    
    // 🎯 CORRECTION: Ne pas trier pour préserver l'ordre des repeaters
    // Les champs sont déjà dans le bon ordre car ajoutés séquentiellement avec nextOrder
    
    return uniqueFields;
  }, [dlog, formData, section, allNodes, buildConditionalFieldFromNode, findAllSharedReferencesRecursive, resolveMatchingNodeFromSelectedValue]);

  // 🔗 ÉTAPE 2: Filtrer les champs basés sur la visibilité conditionnelle du cascader
  // Si un cascader est sélectionné, afficher UNIQUEMENT les champs dont sharedReferenceId correspond
  // 🔥 LOG BRUTAL: Afficher TOUS les champs de cette section pour déboguer
  if (orderedFields.length > 0) {
    const fieldDetails = orderedFields.map(f => ({
      label: f.label,
      type: f.type,
      isConditional: (f as any).isConditional,
      parentFieldId: (f as any).parentFieldId,
      hasSharedRefId: !!(f.sharedReferenceId || (f as any).sharedReferenceIds),
      order: f.order
      , subTabKey: (f as any).subTabKey,
      parentRepeaterId: (f as any).parentRepeaterId,
      sourceTemplateId: (f as any).sourceTemplateId || (f.metadata as any)?.sourceTemplateId,
      isDeletableCopy: !!(f as any).isDeletableCopy
    }));
    if (isTBLDebugEnabled()) tblLog(`�🚨🚨 [ULTRA DEBUG] ORDEREDFIELDS Section "${section.title}" (${section.sectionName}): ${orderedFields.length} champs`, fieldDetails);
    
    // Log spécifique pour les champs conditionnels
    const conditionalFields = orderedFields.filter(f => (f as any).isConditional);
    if (conditionalFields.length > 0) {
      if (isTBLDebugEnabled()) tblLog(`🚨🚨🚨 [ULTRA DEBUG] CHAMPS CONDITIONNELS trouvés dans orderedFields:`, {
        nbChamps: conditionalFields.length,
        details: conditionalFields.map(cf => ({
          id: cf.id,
          label: cf.label,
          order: cf.order,
          parentFieldId: (cf as any).parentFieldId,
          parentOptionValue: (cf as any).parentOptionValue
        }))
      });
    }
  }

  // ℹ️ NOTE: Les champs conditionnels sont DÉJÀ gérés par la logique existante
  // dans les cascaders et repeaters. Le système injecte automatiquement les
  // conditionalFields dans finalFields quand une option est sélectionnée.
  // On ne doit pas les filtrer à nouveau ici.
  const visibilityFilteredFields = useMemo(() => {
    if (isTBLDebugEnabled()) tblLog('🚨🚨🚨 [ULTRA DEBUG] VISIBILITYFILTERED - Entrée:', {
      section: section.title,
      nbOrderedFields: orderedFields.length,
      orderedFieldsConditionnels: orderedFields.filter(f => (f as any).isConditional).length,
      deletedFieldIds: [], // Plus utilisé
      activeSubTab
    });
    
    // ❌ SUPPRESSION DU FILTRAGE LOCAL DES SUPPRESSIONS
    // Le refetch silencieux (forceRefresh) gère déjà correctement la mise à jour
    let fieldsAfterDeletion = orderedFields;
    
    // 🔧 FIX: Filtrer TOUS les champs par sous-onglet actif
    // Les champs de répéteurs et références partagées sont créés dynamiquement après le filtrage initial de TBL.tsx
    // On doit donc les filtrer ici aussi
    if (activeSubTab) {
      // 🔧 FIX CRITIQUE: Construire un Set des sous-onglets reconnus pour gérer les subTabs non reconnus
      // Même logique que TBL.tsx pour éviter le double-filtrage incohérent
      const recognizedSubTabKeys = new Set((allSubTabs || []).map(st => st.key));
      
      fieldsAfterDeletion = fieldsAfterDeletion.filter(field => {
        // Vérifier le subTabKey du champ
        const fieldSubTabs = extractSubTabAssignments(field);
        
        // Log pour debug
        if ((field as any).isConditional || (field as any).parentRepeaterId || (field as any).isDeletableCopy) {
          if (isTBLDebugEnabled()) tblLog('🔧 [SUBTAB FILTER] Champ dynamique:', {
            id: field.id,
            label: field.label,
            fieldSubTabs,
            activeSubTab,
            isConditional: (field as any).isConditional,
            isDeletableCopy: (field as any).isDeletableCopy,
            willShow: fieldSubTabs.length === 0 ? activeSubTab === '__default__' : fieldSubTabs.includes(activeSubTab)
          });
        }
        
        if (fieldSubTabs.length === 0) {
          // Pas de subTab assigné = va dans Général (__default__)
          return activeSubTab === '__default__';
        }
        
        // 🔧 FIX CRITIQUE: Si le champ a un sous-onglet qui n'est PAS reconnu
        // dans la liste explicite, traiter comme s'il n'avait pas de sous-onglet
        // = afficher dans "Général" (__default__). Cohérent avec TBL.tsx.
        if (recognizedSubTabKeys.size > 0) {
          const hasRecognizedSubTab = fieldSubTabs.some(tab => recognizedSubTabKeys.has(tab));
          if (!hasRecognizedSubTab) {
            return activeSubTab === '__default__';
          }
        }
        
        // Vérifier si le subTab actif correspond
        return fieldSubTabs.includes(activeSubTab);
      });
    }
    
    // 🛒 PRODUIT: Filtrer les champs par visibilité produit
    // Si un champ a product_visibleFor configuré, il n'est visible que si
    // un des produits sélectionnés dans le champ source correspond
    {
      // Debug: compter les champs avec product config
      const productFields = fieldsAfterDeletion.filter(f => (f as any).hasProduct || (f as any).product_visibleFor);
      if (productFields.length > 0) {
        console.log(`🛒🛒🛒 [PRODUCT FILTER] Section "${section.title}": ${productFields.length} champs avec config produit sur ${fieldsAfterDeletion.length} total`, 
          productFields.map(f => ({ id: f.id, label: f.label, hasProduct: (f as any).hasProduct, visibleFor: (f as any).product_visibleFor, sourceId: (f as any).product_sourceNodeId })));
      }
    }
    fieldsAfterDeletion = fieldsAfterDeletion.filter(field => {
      const f = field as any;
      // Si pas de configuration produit, toujours visible
      if (!f.hasProduct) return true;
      if (!f.product_visibleFor || !Array.isArray(f.product_visibleFor) || f.product_visibleFor.length === 0) return true;
      if (!f.product_sourceNodeId) return true;

      // Récupérer la valeur du champ source produit depuis formData
      const sourceValue = formData[f.product_sourceNodeId];
      console.log(`🛒 [PRODUCT VISIBILITY] "${field.label}": sourceNodeId=${f.product_sourceNodeId}, sourceValue=${JSON.stringify(sourceValue)}, visibleFor=${JSON.stringify(f.product_visibleFor)}`);
      // Si aucune valeur sélectionnée → tout afficher
      if (sourceValue === undefined || sourceValue === null || sourceValue === '') return true;

      // Parser la valeur source (peut être string csv, array, ou valeur simple)
      let selectedValues: string[];
      if (Array.isArray(sourceValue)) {
        selectedValues = sourceValue.map(String);
      } else if (typeof sourceValue === 'string' && sourceValue.includes(',')) {
        selectedValues = sourceValue.split(',').map(v => v.trim()).filter(Boolean);
      } else {
        selectedValues = [String(sourceValue)];
      }

      if (selectedValues.length === 0) return true;

      const isVisible = f.product_visibleFor.some((v: string) => selectedValues.includes(v));
      console.log(`🛒 [PRODUCT VISIBILITY RESULT] "${field.label}": selected=${JSON.stringify(selectedValues)}, visible=${isVisible}`);
      return isVisible;
    });

    // ✅ FILTRE SIMPLE: On affiche TOUS les champs, y compris les copies de répéteurs
    // Les copies d'originals de répéteurs doivent s'afficher là où elles sont placées
    const result = fieldsAfterDeletion;
    
    // LOG DÉTAILLÉ pour champs conditionnels injectés
    orderedFields.forEach(field => {
      if ((field as any).isConditional) {
        if (isTBLDebugEnabled()) tblLog(`🔍🔍🔍 [CONDITIONAL FIELD DEBUG]`, {
          fieldId: field.id,
          fieldLabel: field.label,
          isConditional: (field as any).isConditional,
          fieldType: field.type,
          parentFieldId: (field as any).parentFieldId,
          parentOptionValue: (field as any).parentOptionValue,
          visibilityConditions: field.visibility || 'Aucune',
          section: section.title
        });
      }
    });
    
    if (isTBLDebugEnabled()) tblLog('🚨🚨🚨 [ULTRA DEBUG] VISIBILITYFILTERED - Sortie:', {
      section: section.title,
      nbResultFields: result.length,
      nbExcludedCopies: orderedFields.length - result.length,
      resultFieldsConditionnels: result.filter(f => (f as any).isConditional).length,
      detailsChamps: result.map(f => ({
        id: f.id,
        label: f.label,
        order: f.order,
        isConditional: (f as any).isConditional
      }))
    });
    
    return result;
  }, [orderedFields, section.title, allNodes, activeSubTab, allSubTabs, formData]);

  // 🎨 Déterminer le style selon le niveau
  const getSectionStyle = () => {
    switch (level) {
      case 0: // Section principale
        return {
          marginBottom: '24px',
          border: '1px solid #d9d9d9',
          borderRadius: '8px'
        };
      case 1: // Sous-section
        return {
          marginBottom: '16px',
          border: '1px solid #f0f0f0',
          borderRadius: '6px',
          marginLeft: '16px'
        };
      default: // Sous-sous-section et plus
        return {
          marginBottom: '12px',
          border: '1px solid #fafafa',
          borderRadius: '4px',
          marginLeft: `${16 * level}px`
        };
    }
  };

  // 🎯 Fonction de rendu pour les champs de la section "Données" avec TreeBranchLeaf
    const { evaluateBatch } = useBatchEvaluation({ debug: false });
    const batchCacheRef = useRef<Record<string, number | string | boolean | null>>({});
    const [batchLoaded, setBatchLoaded] = useState(false);
    const isDataSection = section.isDataSection || section.title === 'Données' || section.title.includes('Données');

    // 🔥 CORRECTION CRITIQUE: Pré-chargement batch UNIQUEMENT au montage du composant
    // ❌ NE PAS mettre formData dans les dépendances car ça relance l'API à chaque frappe !
    useEffect(() => {
      if (!isDataSection) return;
      type DataInstance = { metadata?: { sourceType?: string; sourceRef?: string }; displayFormat?: string; unit?: string; precision?: number };
      type CapabilityData = { activeId?: string; instances?: Record<string, DataInstance> };
      const candidateNodeIds: string[] = [];
      for (const f of (section.fields || [])) {
        const capData: CapabilityData | undefined = (f.capabilities && (f.capabilities as Record<string, unknown>).data) as CapabilityData | undefined;
        if (capData?.instances && Object.keys(capData.instances).length > 0) {
          const activeId = capData.activeId || Object.keys(capData.instances)[0];
          if (activeId) candidateNodeIds.push(activeId);
        }
      }
      if (candidateNodeIds.length === 0) { setBatchLoaded(true); return; }
      (async () => {
        const results = await evaluateBatch(candidateNodeIds, formData);
        const map: Record<string, number | string | boolean | null> = {};
        Object.values(results).forEach(r => { map[r.nodeId] = r.calculatedValue; });
        batchCacheRef.current = map;
        setBatchLoaded(true);
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDataSection, section.fields, evaluateBatch]); // ✅ formData intentionnellement omis pour éviter les appels API à chaque frappe

    const renderDataSectionField = (field: TBLField) => {
    const deriveNodeIdFromSourceRef = (sourceRef?: string) => {
      if (!sourceRef || typeof sourceRef !== 'string') return undefined;
      if (sourceRef.startsWith('@table.') || sourceRef.startsWith('@value.')) {
        return sourceRef.split('.').slice(1).join('.') || undefined;
      }
      if (sourceRef.includes(':')) {
        const [, rest] = sourceRef.split(':');
        return rest;
      }
      return sourceRef;
    };

    // 🔥 CORRECTION CRITIQUE: Synthétiser capabilities.data pour les champs condition/formula
    // Si le champ n'a pas de data_instances mais a une sourceRef dans ses metadata,
    // créer un objet data synthétique pour que getDisplayValue() fonctionne correctement
    let effectiveCapabilities = field.capabilities;
    const metadataCapabilities = (field as any).metadata?.capabilities;
    const metadataDataEntries = Array.isArray(metadataCapabilities?.datas)
      ? metadataCapabilities?.datas
      : [];

    if ((!effectiveCapabilities || !effectiveCapabilities.data) && metadataDataEntries.length > 0) {
      const instances: Record<string, { metadata: Record<string, unknown> }> = {};
      let syntheticActiveId: string | undefined;

      metadataDataEntries.forEach((entry: any, index: number) => {
        const sourceRef = entry?.config?.sourceRef as string | undefined;
        const derivedId = deriveNodeIdFromSourceRef(sourceRef);
        const instanceId = derivedId || entry?.id || `${field.id}-data-${index}`;
        if (!syntheticActiveId) {
          syntheticActiveId = instanceId;
        }
        instances[instanceId] = {
          metadata: {
            ...(entry?.config || {})
          }
        };
      });

      if (Object.keys(instances).length > 0) {
        effectiveCapabilities = {
          ...(effectiveCapabilities || {}),
          data: {
            enabled: true,
            activeId: syntheticActiveId,
            instances
          }
        } as TBLField['capabilities'];
      }
    }
    
    // ⚠️ DEBUG DÉSACTIVÉ pour performance - réactiver si besoin
    // if (isTBLDebugEnabled()) tblLog(`🎯 [RENDER DATA FIELD] Début renderDataSectionField pour: "${field.label}" (id: ${field.id})`);
    
    // 🔥 CORRECTION: Les champs avec data.instances vides seront gérés par PRIORITÉ 0 dans getDisplayValue()
    
    // 🔥 CORRECTION CRITIQUE : Si le champ a une capacité Table (lookup ou matrix), utiliser le renderer éditable
    const hasTableCapability = effectiveCapabilities?.table?.enabled;
    const hasRowOrColumnMode = effectiveCapabilities?.table?.currentTable?.rowBased === true || 
                               effectiveCapabilities?.table?.currentTable?.columnBased === true;
  // Note: le mode 'matrix' est géré en affichage (BackendValueDisplay), pas en édition
    
    //  Détection des champs répétables
    const isRepeater = field.type === 'leaf_repeater' || 
                       field.type === 'LEAF_REPEATER' ||
                       (field as any).fieldType === 'leaf_repeater' ||
                       (field as any).fieldType === 'LEAF_REPEATER';
    
  // Rendre éditable si c'est un lookup (rowBased/columnBased) OU un répétable
  // ⚠️ Ne PAS traiter les résultats de matrice comme éditables: ils doivent s'afficher via BackendValueDisplay
  // 🔧 FIX: Les champs repeater ne forcent plus la pleine largeur - ils utilisent leur width configurée
  // pour permettre un flux horizontal continu (gauche à droite, puis ligne suivante)
  if ((hasTableCapability && hasRowOrColumnMode) || isRepeater) {
      const editableColProps = getFieldColProps(section, field, { forceFullWidth: false });
      return (
        <Col
          key={field.id}
          {...editableColProps}
          className="mb-2"
        >
          <TBLFieldRendererAdvanced
            field={field}
            value={extractFieldValue(field.id)}
            allNodes={allNodes}
            onChange={(value) => handleFieldChange(field.id, value, field.label)}
            onUpdateAnyField={onChange} // 🤖 AI Measure: Passer le callback pour mettre à jour n'importe quel champ
            isValidation={isValidation}
            formData={formData}
            treeId={treeId}
            submissionId={submissionId}
          />
        </Col>
      );
    }
    
    // 🎯 Système TreeBranchLeaf : connexion aux capacités réelles (DISPLAY ONLY)
    const getDisplayValue = () => {
      const capabilities = effectiveCapabilities;
      let rawValue = formData[field.id];
      const fieldMetadata = (((field as unknown) as { metadata?: Record<string, unknown> }).metadata || {}) as Record<string, unknown>;
      const looksLikeDisplayNode = Boolean(
        fieldMetadata.autoCreateDisplayNode ||
        fieldMetadata.copiedFromNodeId ||
        fieldMetadata.fromVariableId ||
        fieldMetadata.sourceTemplateId ||
        fieldMetadata.tbl_auto_generated ||
        fieldMetadata.isSumDisplayField // 🎯 NOUVEAU: Champs Total
      );
      
      // 🎯 NOUVEAU: Détection directe des champs -sum-total
      const isSumTotalField = typeof field.id === 'string' && field.id.endsWith('-sum-total');

      // �️ Les champs sum-total sont TOUJOURS visibles — ils additionnent
      // les repeaters + l'original. Aucune condition ne doit les masquer.

      const isCopyWithSuffix = typeof field.id === 'string' && /^.+-\d+$/.test(field.id);
      const isRepeaterCopy = Boolean(fieldMetadata.duplicatedFromRepeater || fieldMetadata.copySuffix || fieldMetadata.suffixNum);

      // 🔑 Si le champ copié porte un suffixe -1, -2, ... on force
      // un parentNodeId cohérent en utilisant le parent d'origine + ce suffixe.
      // Cela permet à chaque copie (Versant 1, Versant 2, ...) d'avoir
      // son propre conteneur backend séparé.
      if ((isCopyWithSuffix || isRepeaterCopy) && fieldMetadata.parentNodeId && typeof field.id === 'string') {
        const suffixMatch = field.id.match(/-(\d+)$/);
        if (suffixMatch?.[1]) {
          const baseParentId = String(fieldMetadata.parentNodeId).replace(/-\d+$/, '');
          (field as any).parentNodeId = `${baseParentId}-${suffixMatch[1]}`;
        }
      }

      // ✅ Définition de resolveBackendNodeId AVANT utilisation
      const resolveBackendNodeId = (f: any): string | undefined => {
        try {
          const meta = (f && f.metadata) || {};
          
          // 🎯 NOUVEAU: Les champs Total (-sum-total) doivent TOUJOURS utiliser leur propre ID
          // Ils ne sont PAS des copies, ils ont leur propre valeur calculée
          if (f?.id && typeof f.id === 'string' && f.id.endsWith('-sum-total')) {
            return String(f.id);
          }
          if (meta?.isSumDisplayField) {
            if (f?.id) return String(f.id);
          }
          
          // ⚖️ RÈGLE IMPORTANTE: pour les champs d'affichage COPIÉS (suffixe ou duplications de répéteur),
          // on privilégie l'ID DE LA COPIE comme clé backend pour que chaque versant
          // ait sa propre valeur calculée, au lieu de réutiliser copiedFromNodeId.
          if (isCopyWithSuffix || isRepeaterCopy) {
            if (f?.id) return String(f.id);
            if (f?.nodeId) return String(f.nodeId);
          }
          // copiedFromNodeId can be array/string/JSON array -> prefer first item
          let cid = meta?.copiedFromNodeId;
          if (typeof cid === 'string' && cid.trim().startsWith('[')) {
            try {
              const arr = JSON.parse(cid);
              if (Array.isArray(arr) && arr.length > 0) cid = arr[0];
            } catch { /* ignore JSON parse */ }
          }
          if (Array.isArray(cid) && cid.length > 0) cid = cid[0];
          if (cid) return String(cid);

          // Some metadata use originalNodeId
          if (meta?.originalNodeId) return String(meta.originalNodeId);

          // Fallback: use nodeId property or field.id
          if (f?.nodeId) return String(f.nodeId);
          if (f?.id) return String(f.id);
        } catch (e) {
          console.warn('[resolveBackendNodeId] Erreur résolution nodeId:', e);
        }
        return undefined;
      };

      // 🎨 Helper: Extraire TOUTES les configs d'apparence d'un champ
      // Priorise: numberConfig > config racine > metadata > defaults
      const getFieldDisplayConfig = (f: TBLField) => {
        const cfg = (f.config || {}) as Record<string, unknown>;
        const numCfg = (cfg.numberConfig || cfg.number || {}) as Record<string, unknown>;
        const meta = ((f as any).metadata || {}) as Record<string, unknown>;
        
        // Priorité: numberConfig > config racine > metadata > capacités data > defaults
        const dataInstance = effectiveCapabilities?.data?.instances?.[effectiveCapabilities?.data?.activeId || ''] as Record<string, unknown> | undefined;
        const dataMeta = (dataInstance?.metadata || {}) as Record<string, unknown>;
        
        return {
          precision: (numCfg.decimals as number | undefined) ?? 
                     (cfg.decimals as number | undefined) ?? 
                     (dataMeta.precision as number | undefined) ??
                     (meta.precision as number | undefined) ?? 2,
          prefix: (numCfg.prefix as string | undefined) ?? 
                  (cfg.prefix as string | undefined) ?? 
                  (meta.prefix as string | undefined) ?? '',
          suffix: (numCfg.suffix as string | undefined) ?? 
                  (cfg.suffix as string | undefined) ?? 
                  (meta.suffix as string | undefined) ?? '',
          unit: (numCfg.unit as string | undefined) ?? 
                (cfg.unit as string | undefined) ?? 
                (dataMeta.unit as string | undefined) ??
                (meta.unit as string | undefined) ?? ''
        };
      };

      const renderStoredCalculatedValue = (
        nodeIdToUse?: string,
        options?: { unit?: string; prefix?: string; suffix?: string; precision?: number; fallbackValue?: unknown }
      ) => {
        if (!nodeIdToUse || !treeId) {
          return <span style={{ color: '#888' }}>---</span>;
        }

        // Extraire les configs d'apparence du champ
        const displayCfg = getFieldDisplayConfig(field);
        
        // Les options passées en paramètre ont la priorité sur les configs du champ
        const finalPrecision = options?.precision ?? displayCfg.precision;
        const finalPrefix = options?.prefix ?? displayCfg.prefix;
        const finalSuffix = options?.suffix ?? displayCfg.suffix;
        const finalUnit = options?.unit ?? displayCfg.unit;

        return (
          <CalculatedValueDisplay
            nodeId={nodeIdToUse}
            treeId={treeId}
            // 🔥 CORRECTION: Passer le submissionId pour que le backend puisse
            // recalculer les table lookups avec les bonnes valeurs de champs
            submissionId={submissionId}
            placeholder="---"
            precision={finalPrecision}
            prefix={finalPrefix}
            suffix={finalSuffix}
            unit={finalUnit}
            fallbackValue={options?.fallbackValue}
          />
        );
      };

      // 🎯 PRIORITÉ 0 ABSOLUE: Champs Total (-sum-total) - AVANT TOUT
      // Ces champs ont leur propre valeur calculée stockée en base, pas besoin de capacités complexes
      // Note: La visibilité conditionnelle (SHOW/HIDE) est gérée en amont dans renderDataSectionField
      if (treeId && isSumTotalField) {
        if (isTBLDebugEnabled()) tblLog(`🎯 [SUM-TOTAL] Affichage direct pour champ Total: ${field.id} (${field.label})`);
        return renderStoredCalculatedValue(field.id, {
          fallbackValue: rawValue
        });
      }

      // 🔥 FIX PRIORITAIRE: Forcer l'affichage via CalculatedValueDisplay pour TOUTES les copies
      if (treeId && isCopyWithSuffix) {
        const resolvedNodeId = resolveBackendNodeId(field) || field.id;
        if (isTBLDebugEnabled()) tblLog(`🚀 [COPY FIX CHAMPS DONNÉES] Forçage CalculatedValueDisplay pour copie de données: ${field.id} (${field.label})`);
        // Les configs d'apparence sont maintenant automatiquement extraites par renderStoredCalculatedValue
        return renderStoredCalculatedValue(resolvedNodeId, {
          fallbackValue: rawValue
        });
      }
      
  dlog(`🔬 [TEST CAPABILITIES] Champ "${field.label}" - Capabilities présentes:`, !!capabilities);
  if (isTBLDebugEnabled()) tblLog(`🔥 [DEBUG CAPABILITIES] "${field.label}":`, {
    hasData: !!capabilities?.data,
    dataActiveId: capabilities?.data?.activeId,
    dataInstancesCount: Object.keys(capabilities?.data?.instances || {}).length,
    dataSourceType: (capabilities?.data?.instances?.[capabilities?.data?.activeId as string] as any)?.metadata?.sourceType,
    dataSourceRef: (capabilities?.data?.instances?.[capabilities?.data?.activeId as string] as any)?.metadata?.sourceRef,
    hasTable: !!capabilities?.table,
    hasFormula: !!capabilities?.formula,
    fieldId: field.id,
    fieldLabel: field.label
  });

      // ✨ Check 0: valeur "miroir" issue d'un champ conditionnel associé (ex: "Prix Kw/h - Champ")
      // Permet d'afficher instantanément la valeur saisie quand aucune capacité Data/Formula n'est disponible
      const mirrorKey = `__mirror_data_${field.label}`;
      const mirrorValue: unknown = (formData as Record<string, unknown>)[mirrorKey];
      const hasDynamicCapabilities = Boolean(capabilities?.data?.instances || capabilities?.formula);
      // 🔍 Recherche variantes si pas trouvé
      let effectiveMirrorValue = mirrorValue;
      // 🔥 MODIFICATION: Rechercher les variantes MÊME SI hasDynamicCapabilities = true
      // Car le champ peut avoir une capacité mais la valeur calculée peut être vide
      if (effectiveMirrorValue === undefined || effectiveMirrorValue === null || effectiveMirrorValue === '') {
        try {
          const variantKeys = buildMirrorKeys(field.label || '').map(k => k); // déjà préfixés
          let variantHit: string | null = null;
          for (const vk of variantKeys) {
            if ((formData as Record<string, unknown>)[vk] !== undefined) {
              effectiveMirrorValue = (formData as Record<string, unknown>)[vk];
              dlog(`🪞 [MIRROR][VARIANT] Utilisation variante '${vk}' pour champ '${field.label}' ->`, effectiveMirrorValue);
              variantHit = vk;
              break;
            }
          }
          if (!variantHit && !hasDynamicCapabilities) {
            // Log agressif UNIQUE par champ (limité via ref ? simplif: log à chaque rendu si debug actif)
            const diag = (() => { try { return localStorage.getItem('TBL_DIAG') === '1'; } catch { return false; } })();
            if (diag) {
              console.warn('[TBL][MIRROR][MISS]', {
                label: field.label,
                triedMirrorKey: mirrorKey,
                variantKeys,
                reason: 'Aucune variante de clé miroir trouvée et aucune capacité dynamique',
                hasDynamicCapabilities
              });
            }
          }
        } catch (e) {
          console.warn('[MIRROR][VARIANT][ERROR]', e);
        }
      }
      
      // 🔥 MODIFICATION: Afficher la valeur miroir SI elle existe, MÊME AVEC capacités dynamiques
      // On laisse quand même les capacités s'exécuter après, et si elles retournent une valeur,
      // elle remplacera la valeur miroir. Mais si les capacités retournent null, au moins on a une valeur.
      // POUR L'INSTANT: On garde le comportement où on n'affiche QUE si pas de capacités dynamiques
      // Car sinon BackendCalculatedField va s'exécuter et peut écraser la valeur miroir
      if (!hasDynamicCapabilities && effectiveMirrorValue !== undefined && effectiveMirrorValue !== null && effectiveMirrorValue !== '') {
        const precision = (field.config as { decimals?: number } | undefined)?.decimals ?? 2;
        const unit = (field.config as { unit?: string } | undefined)?.unit;
        const asNumber = typeof effectiveMirrorValue === 'number'
          ? effectiveMirrorValue
          : parseFloat(String(effectiveMirrorValue).replace(',', '.'));
        const valueToFormat: number | string = isNaN(asNumber) ? String(mirrorValue) : asNumber;
        const formatted = formatValueWithConfig(valueToFormat as number | string, { displayFormat: 'number', unit, precision });
  dlog(`🪞 [MIRROR] Affichage via valeur miroir pour "${field.label}" (${mirrorKey}) (pas de capacité dynamique):`, formatted);
        return formatted ?? String(valueToFormat);
      } else if (effectiveMirrorValue !== undefined && effectiveMirrorValue !== null && effectiveMirrorValue !== '' && hasDynamicCapabilities) {
  dlog(`🪞 [MIRROR] Valeur miroir DÉTECTÉE pour "${field.label}" mais capacités dynamiques présentes - on laisse les capacités s'exécuter`);
      }

      // 🔥 PRIORITÉ 0 (AVANT TOUT): Si data.instances existe MAIS EST VIDE, c'est une condition/formule
      // → Afficher directement via BackendValueDisplay avec field.id
      // ✅ CORRECTION: Vérifier aussi si le champ a une sourceRef dans ses métadonnées
      // 🎯 MEGA FIX: Même SANS sourceRef, si data.instances est vide mais data.enabled = true,
      //    c'est probablement un champ calculé → tenter avec field.id
      const hasEmptyInstances = capabilities?.data?.instances && Object.keys(capabilities.data.instances).length === 0;
      const hasDataCapability = capabilities?.data?.enabled || (capabilities?.data?.instances !== undefined);
      
      if (hasEmptyInstances && hasDataCapability && treeId && field.id) {
        if (isTBLDebugEnabled()) tblLog(`🚀🚀🚀 [MEGA FIX BACKEND] Champ "${field.label}" (${field.id}) - Affichage valeur stockée`);
        return renderStoredCalculatedValue(resolveBackendNodeId(field) || field.id, {
          fallbackValue: effectiveMirrorValue
        });
      }

      // ✨ Pré-évaluation: si la capacité Donnée pointe vers une condition et qu'une formule est dispo,
      // on donne la priorité à la formule pour éviter un résultat null quand la condition n'est pas remplie.
      try {
        const dataActiveId = capabilities?.data?.activeId;
        type DataInstanceMeta = { metadata?: { sourceType?: string; sourceRef?: string; fixedValue?: unknown } } & Record<string, unknown>;
        const dataInstances = capabilities?.data?.instances as Record<string, DataInstanceMeta> | undefined;
        const candidateDataInstance = dataActiveId && dataInstances
          ? dataInstances[dataActiveId]
          : (dataInstances ? dataInstances[Object.keys(dataInstances)[0]] : undefined);
        let dataSourceType = candidateDataInstance?.metadata?.sourceType;
        let dataSourceRef = candidateDataInstance?.metadata?.sourceRef as string | undefined;
        
        // 🔥 FIX ULTRA SIMPLE: Si data.instances est vide mais le champ a une sourceRef dans ses métadonnées,
        // on l'utilise directement. C'est pour les champs condition/formula qui n'ont pas de data_instances.
        if (!dataSourceRef) {
          const fieldMeta = (field as any).metadata || {};
          const fallbackSourceRef = fieldMeta.sourceRef || (field as any).sourceRef;
          if (fallbackSourceRef && typeof fallbackSourceRef === 'string') {
            dataSourceRef = fallbackSourceRef;
            dataSourceType = 'tree';
            if (isTBLDebugEnabled()) tblLog(`🔧 [FALLBACK SOURCEREF] Utilisation sourceRef du champ pour "${field.label}": ${dataSourceRef}`);
          }
        }
        
        // 🚫 Suppression de la préférence forcée formule : on suit exactement la sourceRef.
        // Si la sourceRef cible une condition -> on affiche la condition (bool / valeur) via BackendCalculatedField.
        // Si l'utilisateur veut une formule, la sourceRef doit explicitement être "formula:<id>".
        if (dataSourceType === 'tree' && typeof dataSourceRef === 'string') {
          const r = dataSourceRef;
          if (r.startsWith('condition:') || r.startsWith('formula:') || r.startsWith('node-formula:') || r.startsWith('@value.') || r.startsWith('@table.')) {
            dlog(`Routing data direct sourceRef='${r}'`);
            const dMeta = (candidateDataInstance as { displayFormat?: string; unit?: string; precision?: number } | undefined) || {};
            // Récupérer le nodeId selon le type de sourceRef
            if (!treeId) {
              return <span style={{ color: '#888' }}>---</span>;
            }
            // Choix du nodeId à évaluer
            const looksLikeUuid = (s?: string) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
            let nodeIdToUse: string | undefined;
            
            // 🔥 FIX CRITIQUE: Pour condition/formula, utiliser field.id (pas l'ID de la sourceRef)
            // Car le backend retourne les résultats indexés par field.id, pas par l'ID de la condition/formule
            if (r.startsWith('condition:') || r.startsWith('formula:') || r.startsWith('node-formula:')) {
              nodeIdToUse = field.id; // Utiliser l'ID du champ, pas celui de la condition/formule
              if (isTBLDebugEnabled()) tblLog(`✅ [FIX FORMULA/CONDITION] Utilisation field.id pour la recherche backend: ${nodeIdToUse} (sourceRef était: ${r})`);
            } else if (r.startsWith('@value.')) {
              nodeIdToUse = r.split('@value.')[1]; // "@value.xyz" -> "xyz"
              dlog(`✅ [FIX @VALUE] Extraction nodeId direct de sourceRef: ${nodeIdToUse}`);
            } else if (r.startsWith('@table.')) {
              // Cas @table.*: correctif existant car activeId peut être la table conteneur
              const tableActiveId = (capabilities?.table as any)?.activeId as string | undefined;
              const fieldNodeId = (field as any).nodeId || (field as any).metadata?.originalNodeId || field.id;
              nodeIdToUse = dataActiveId;
              // Si activeId est égal à l'ID de table ou est absent, basculer sur l'ID du champ
              if (!nodeIdToUse || (tableActiveId && nodeIdToUse === tableActiveId)) {
                nodeIdToUse = fieldNodeId;
              }
              // Sécurité: si nodeIdToUse ne ressemble pas à un UUID, mais field.id oui, prendre field.id
              if (!looksLikeUuid(nodeIdToUse) && looksLikeUuid(field.id)) {
                nodeIdToUse = field.id;
              }
              dlog(`✅ [TABLE RESOLUTION] nodeIdToUse final: ${nodeIdToUse}`);
            } else {
              // Fallback: utiliser dataActiveId
              nodeIdToUse = dataActiveId as string | undefined;
            }

            if (!nodeIdToUse) {
              return <span style={{ color: '#888' }}>---</span>;
            }

            return renderStoredCalculatedValue(nodeIdToUse, {
              fallbackValue: effectiveMirrorValue
            });
          }
        }
      } catch (e) {
        console.warn('⚠️ [PREFERENCE] Erreur lors de la vérification priorité formule vs donnée:', e);
      }
      
  // ✨ PRIORITÉ 1: Capacité Data avec instances PEUPLÉES (données dynamiques depuis TreeBranchLeafNodeVariable)
  if ((capabilities?.data?.enabled || capabilities?.data?.instances) && 
      capabilities?.data?.instances && 
      Object.keys(capabilities.data.instances).length > 0) {
  dlog(`� [TEST DATA] Champ "${field.label}" a une capacité Data active:`, capabilities.data.activeId);
  dlog(`🔬 [TEST DATA] Instances disponibles:`, capabilities.data.instances);
        
        // Récupérer la configuration de la variable active
        const dataInstance = capabilities.data.activeId
          ? capabilities.data.instances?.[capabilities.data.activeId]
          : (capabilities.data.instances 
              ? capabilities.data.instances[Object.keys(capabilities.data.instances)[0]] 
              : undefined);
  dlog(`🔬 [TEST DATA] Instance active:`, dataInstance);
        
        // 🔥 FIX: Les données peuvent être dans dataInstance.metadata OU directement dans dataInstance
        // (selon si elles viennent de metadataCapabilities.datas ou de data_instances)
        const instanceData = dataInstance?.metadata || dataInstance;
        
        // 🔥 DEBUG TEMPORAIRE - à supprimer après fix
        if (field.label === 'GRD') {
        }
        
        if (instanceData && (instanceData.sourceType || instanceData.sourceRef)) {
          const { sourceType: configSourceType, sourceRef: configSourceRef, fixedValue } = instanceData as { sourceType?: string; sourceRef?: string; fixedValue?: unknown };
          
          dlog(`� [TEST METADATA] sourceType: "${configSourceType}"`);
          dlog(`🔬 [TEST METADATA] sourceRef: "${configSourceRef}"`);
          dlog(`🔬 [TEST METADATA] fixedValue:`, fixedValue);
          
          // Mode arborescence (router selon la vraie référence: condition:, formula:, @value., @table.)
          if (configSourceType === 'tree' && configSourceRef) {
            const ref = String(configSourceRef);
            const isCondition = ref.startsWith('condition:');
            const isFormula = ref.startsWith('formula:') || ref.startsWith('node-formula:');
            const isValue = ref.startsWith('@value.');
            const isTable = ref.startsWith('@table.'); // 🔥 AJOUT: Support des références @table
            dlog(`🔬 [TEST TREE SOURCE] Router direct: condition=${isCondition}, formula=${isFormula}, value=${isValue}, table=${isTable}`);

            if (isCondition || isFormula || isValue || isTable) { // 🔥 AJOUT: isTable
              // Si batch pré-chargé et c'est une variable nodeId connue => montrer la valeur batch si existante
              if (batchLoaded && ref.startsWith('condition:')) {
                const nodeId = (capabilities?.data?.activeId) || (capabilities?.data?.instances ? Object.keys(capabilities.data.instances)[0] : undefined);
                if (nodeId && batchCacheRef.current[nodeId] != null) {
                  const val = batchCacheRef.current[nodeId];
                  return <span style={{ fontWeight: 'bold', color: '#047857' }}>{formatValueWithConfig(val, dataInstance)}</span>;
                }
              }
              
              // Récupérer le nodeId pour le composant
              let variableNodeId = (capabilities?.data?.activeId) || (capabilities?.data?.instances ? Object.keys(capabilities.data.instances)[0] : undefined);
              
              // 🔥 FIX CRITIQUE FORMULE/TABLE: Pour les formules/conditions/tables, le backend retourne les résultats
              // avec le nodeId du CHAMP D'AFFICHAGE (field.id), PAS le nodeId de la formule/table elle-même.
              // On doit donc TOUJOURS utiliser field.id pour les formules/conditions/tables.
              if (isCondition || isFormula || isTable) {
                variableNodeId = field.id;
                if (isTBLDebugEnabled()) tblLog(`🔥🔥🔥 [FIX ${isFormula ? 'FORMULA' : isCondition ? 'CONDITION' : 'TABLE'}] Utilisation de field.id: ${variableNodeId} pour "${field.label}"`);
              }
              
              if (!variableNodeId || !treeId) {
                return <span style={{ color: '#888' }}>---</span>;
              }
              
              return renderStoredCalculatedValue(variableNodeId, {
                fallbackValue: effectiveMirrorValue
              });
            }

            // Sinon, déléguer à l'évaluation de variable du nœud
            const instanceId = capabilities?.data?.activeId 
              || (capabilities?.data?.instances ? Object.keys(capabilities.data.instances)[0] : undefined);
            if (instanceId) {
              dlog(`🎯 [DATA VARIABLE] nodeId utilisé pour évaluation: ${instanceId}`);
              const preVal = batchLoaded ? batchCacheRef.current[instanceId] : null;
              if (batchLoaded && preVal != null) {
                return <span style={{ fontWeight: 'bold', color: '#047857' }}>{formatValueWithConfig(preVal, dataInstance)}</span>;
              }
              
              if (!treeId) {
                return <span style={{ color: '#888' }}>---</span>;
              }
              
              if (localStorage.getItem('TBL_DIAG') === '1') {
                if (isTBLDebugEnabled()) tblLog('🔍 [TBL_DIAG] renderStoredCalculatedValue DATA-VARIABLE', {
                  fieldId: field.id,
                  label: field.label,
                  resolved: resolveBackendNodeId(field),
                  metadata: (field as any).metadata
                });
              }
              return renderStoredCalculatedValue(resolveBackendNodeId(field) || field.id, {
                fallbackValue: effectiveMirrorValue ?? rawValue
              });
            }
            console.warn('ℹ️ [DATA VARIABLE] Aucune instanceId trouvée pour variable – affichage placeholder');
            return '---';
          }
          
          // Mode valeur fixe
          if (configSourceType === 'fixed' && fixedValue !== undefined) {
            dlog(`� [TEST FIXED] Valeur fixe détectée: ${fixedValue}`);
            const formatted = formatValueWithConfig(fixedValue, dataInstance);
            return formatted;
          }
          
          // Fallback: valeur par défaut de la configuration
          if (dataInstance.defaultValue !== undefined) {
            dlog(`� [TEST DEFAULT] Valeur par défaut: ${dataInstance.defaultValue}`);
            return formatValueWithConfig(dataInstance.defaultValue, dataInstance);
          }
        }
      }
      
      // ✨ PRIORITÉ 2: Capacité Formula (formules directes) - COPIE DU COMPORTEMENT "Prix Kw/h test"
      // 🎯 NOUVEAU: Ignorer les formules de CONTRAINTE (number_max, etc.) - le champ reste éditable
      const formulaIsConstraint = isConstraintFormula(capabilities?.formula?.instances as Record<string, unknown> | null | undefined);
      
      const formulaId = capabilities?.formula?.activeId 
        || (capabilities?.formula?.instances && Object.keys(capabilities.formula.instances).length > 0 ? Object.keys(capabilities.formula.instances)[0] : undefined);
      
      // Seulement traiter comme champ calculé si ce n'est PAS une formule de contrainte
      if (!formulaIsConstraint && ((formulaId && String(formulaId).trim().length > 0) || capabilities?.formula?.currentFormula)) {
        const currentFormula = capabilities?.formula?.currentFormula;
        const rawExpression = currentFormula?.expression;
        const variablesDef = currentFormula?.variables ? Object.fromEntries(Object.entries(currentFormula.variables).map(([k,v]) => [k, { sourceField: (v as { sourceField?: string; type?: string }).sourceField, type: (v as { sourceField?: string; type?: string }).type }])) : undefined;
        
        dlog(`🔬 [TEST FORMULA ENHANCED] Formule avec expression: ${rawExpression}`);
        dlog(`🔬 [TEST FORMULA ENHANCED] Variables définies:`, variablesDef);
        
        if (!formulaId || !treeId) {
          return <span style={{ color: '#888' }}>---</span>;
        }
        
        // ✅ NOUVEAU SYSTÈME : CalculatedValueDisplay affiche la valeur STOCKÉE
        // 🔥 FIX CRITIQUE: Utiliser field.id (nodeId du champ d'affichage) et non formulaId (sauf si c'est une copie)
        // Le backend stocke les résultats avec le nodeId du CHAMP D'AFFICHAGE, mais pour les copies
        // il peut être nécessaire d'utiliser l'ID d'origine (copiedFromNodeId)
        return renderStoredCalculatedValue(resolveBackendNodeId(field) || field.id, {
          fallbackValue: effectiveMirrorValue
        });
      }
      
  // Pas de fallback conditionnel codé en dur: la valeur doit venir des capacités TBL (data/formula)
      
      // 🚑 Fallback Prisma: certaines copies de champs d'affichage perdent leurs capacités
      // mais restent marquées comme display nodes -> forcer l'appel CalculatedValueDisplay
      if (treeId && looksLikeDisplayNode && !hasDynamicCapabilities) {
        if (localStorage.getItem('TBL_DIAG') === '1') {
          if (isTBLDebugEnabled()) tblLog('🔍 [TBL_DIAG] Fallback display node (no dynamic capabilities):', {
            fieldId: field.id,
            label: field.label,
            resolvedBackendId: resolveBackendNodeId(field),
            metadata: (field as any).metadata
          });
        }
        return renderStoredCalculatedValue(resolveBackendNodeId(field) || field.id, {
          fallbackValue: effectiveMirrorValue ?? rawValue
        });
      }

      // 🔍 Si aucune capacité configurée, afficher la valeur brute du formulaire
      // rawValue déjà initialisé en amont pour permettre un fallback rapide
      
      // 🛡️ EXTRACTION PRÉCOCE : Si rawValue est un objet (réponse backend), extraire la valeur IMMÉDIATEMENT
      // Cela évite d'afficher "[object Object]" dans les cartes bleues et autres affichages
      if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
        const obj = rawValue as Record<string, unknown>;
        // Priorité: value > calculatedValue > operationResult.value
        rawValue = obj.value ?? obj.calculatedValue ?? (obj.operationResult && typeof obj.operationResult === 'object' 
          ? (obj.operationResult as Record<string, unknown>).value 
          : undefined) ?? rawValue;
        
        if (rawValue && typeof rawValue === 'object') {
          // Si toujours un objet après extraction, essayer d'autres propriétés
          const stillObj = rawValue as Record<string, unknown>;
          rawValue = stillObj.text ?? stillObj.result ?? stillObj.displayValue ?? stillObj.humanText ?? stillObj.label ?? rawValue;
        }
        
        dlog(`🛡️ [EXTRACTION PRÉCOCE] Objet détecté, valeur extraite:`, rawValue);
      }
      
  dlog(`🔬 [TEST FALLBACK] Aucune capacité - valeur brute: ${rawValue}`);
      
      // 🐛 DEBUG SPÉCIFIQUE pour M² de la toiture
      if (field.id === 'bda4aa6c-033e-46f8-ad39-5ea4e2a1cb77') {
        if (isTBLDebugEnabled()) tblLog('🐛 [DEBUG M² toiture] Configuration complète du champ:', {
          id: field.id,
          label: field.label,
          type: field.type,
          capabilities: field.capabilities,
          treeMetadata: field.treeMetadata,
          config: field.config,
          metadata: (field as any).metadata,
          rawValue
        });
      }
      // 🧩 Nouveau: si metadata/config contient un sourceRef exploitable, utiliser CalculatedFieldDisplay
      try {
        const metaLike = (field.treeMetadata || field.config || {}) as Record<string, unknown>;
        const metaSourceRef = (metaLike.sourceRef as string | undefined) || (metaLike['source_ref'] as string | undefined);
        if (metaSourceRef && typeof metaSourceRef === 'string' && /^(formula:|condition:|variable:|@value\.)/.test(metaSourceRef)) {
          dlog(`🧪 [FALLBACK SMART] Utilisation CalculatedFieldDisplay via metaSourceRef='${metaSourceRef}'`);
          if (localStorage.getItem('TBL_DIAG') === '1') {
            dlog('[TBL_DIAG][fallback-smart]', {
              fieldId: field.id,
              label: field.label,
              metaSourceRef,
              hasCapabilities: !!field.capabilities
            });
          }
          
          // Extraire le nodeId depuis metaSourceRef (format: "formula:id" ou "condition:id")
          const extractedNodeId = metaSourceRef.includes(':') 
            ? metaSourceRef.split(':')[1] 
            : metaSourceRef;
          
          if (!extractedNodeId || !treeId) {
            return <span style={{ color: '#888' }}>---</span>;
          }
          
          return renderStoredCalculatedValue(resolveBackendNodeId(field) || field.id, {
            fallbackValue: effectiveMirrorValue ?? rawValue
          });
        }
      } catch { /* ignore */ }

      // Si pas de valeur saisie, afficher placeholder
      if (rawValue == null || rawValue === undefined || rawValue === '') {
        dlog(`🔬 [TEST FALLBACK] Pas de valeur - affichage placeholder`);
        return '---';
      }

      // ✅ Afficher la valeur brute avec formatage défensif (protection contre [object Object])
      dlog(`🔬 [TEST FALLBACK] Retour valeur brute: ${rawValue}`);
      
      // 🛡️ PROTECTION : Si rawValue est un objet, extraire la valeur intelligemment
      if (typeof rawValue === 'object' && rawValue !== null) {
  dlog('⚠️ [FALLBACK OBJECT] Détection d\'un objet dans rawValue:', rawValue);
        
        // Tentative d'extraction de propriétés communes (ordre d'importance)
        const obj = rawValue as Record<string, unknown>;
        
        // 🎯 PRIORITÉ 1 : Valeurs directes du résultat backend
        const extracted = obj.value || obj.calculatedValue || obj.text || obj.result || 
                         obj.displayValue || obj.humanText || obj.label;
        
        if (extracted !== undefined && extracted !== null) {
          dlog('✅ [FALLBACK OBJECT] Valeur extraite:', extracted);
          // Si c'est encore un objet avec operationResult, extraire de là
          if (typeof extracted === 'object' && extracted !== null && 'value' in (extracted as Record<string, unknown>)) {
            return String((extracted as Record<string, unknown>).value);
          }
          return String(extracted);
        }
        
        // 🎯 PRIORITÉ 2 : Si c'est un résultat d'opération avec nested value
        if (obj.operationResult && typeof obj.operationResult === 'object') {
          const opResult = obj.operationResult as Record<string, unknown>;
          if (opResult.value !== undefined) {
            dlog('✅ [FALLBACK OBJECT] Valeur extraite depuis operationResult:', opResult.value);
            return String(opResult.value);
          }
        }
        
        // Si c'est un tableau, joindre les éléments
        if (Array.isArray(rawValue)) {
          return rawValue.join(', ');
        }
        
        // Dernier recours: JSON.stringify pour un affichage lisible
        dlog('⚠️ [FALLBACK OBJECT] Aucune propriété exploitable trouvée, affichage JSON');
        try {
          return JSON.stringify(rawValue);
        } catch {
          return String(rawValue);
        }
      }
      
      return String(rawValue);
    };

    // 🎨 Style de la carte selon le type de champ
    const displayColProps = getUniformDisplayColProps(section);
    const displayAppearance = resolveDisplayAppearance(field);
    
    // 🎯 Détection des champs "Total" pour style distinctif (teal foncé + texte blanc)
    const isTotalField = (field.label || '').toLowerCase().includes('total');
    
    // 🎨 Couleur de bulle personnalisée (surcharge le style auto "total")
    const rawBubbleColor = (
      (field.appearanceConfig as Record<string, unknown> | undefined)?.bubbleColor ||
      (field.config as Record<string, unknown> | undefined)?.bubbleColor ||
      ((field.metadata as Record<string, unknown> | undefined)?.appearance as Record<string, unknown> | undefined)?.bubbleColor
    ) as string | undefined;
    const customBubbleColor = rawBubbleColor ? normalizeHexColor(rawBubbleColor) : undefined;
    
    // 🎨 NOUVEAU: Système d'icônes pour les cartes de données
    // L'icône peut être définie dans field.config.displayIcon ou field.metadata.displayIcon
    // Sinon on détecte automatiquement selon le label
    const getFieldIcon = (f: TBLField): React.ReactNode => {
      const cfg = (f.config || {}) as Record<string, unknown>;
      const appearance = (f.appearanceConfig || {}) as Record<string, unknown>;
      const meta = ((f as any).metadata || {}) as Record<string, unknown>;
      const metaAppearance = (meta.appearance || {}) as Record<string, unknown>;
      
      // 1. Icône explicitement configurée (apparence prioritaire)
      const explicit = (f as any).displayIcon || appearance.displayIcon || metaAppearance.displayIcon || cfg.displayIcon || meta.displayIcon;
      if (explicit) {
        const explicitValue = String(explicit);
        if (/^data:image\//.test(explicitValue) || /^https?:\/\//.test(explicitValue)) {
          return (
            <img
              src={explicitValue}
              alt="Icône"
              style={{ width: 22, height: 22, borderRadius: 4 }}
            />
          );
        }
        return explicitValue;
      }
      
      // 2. Auto-détection basée sur le label
      const label = (f.label || '').toLowerCase();
      
      // Orientation / Angles
      if (label.includes('orientation') || label.includes('inclinaison') || label.includes('angle')) return '🧭';
      
      // Longueurs / Distances
      if (label.includes('longueur') || label.includes('distance') || label.includes('hauteur')) return '📏';
      if (label.includes('rampant')) return '📐';
      
      // Surfaces
      if (label.includes('m²') || label.includes('surface') || label.includes('aire')) return '⬜';
      
      // Toiture
      if (label.includes('toiture') || label.includes('toit')) return '🏠';
      
      // Panneaux solaires
      if (label.includes('panneau') || label.includes('module')) return '☀️';
      
      // Prix / Coûts
      if (label.includes('prix') || label.includes('coût') || label.includes('€') || label.includes('total')) return '💰';
      
      // Quantités
      if (label.includes('nombre') || label.includes('quantité') || label.includes('qty')) return '🔢';
      
      // Puissance / Énergie
      if (label.includes('puissance') || label.includes('kwc') || label.includes('watt')) return '⚡';
      
      // Poids
      if (label.includes('poids') || label.includes('kg') || label.includes('masse')) return '⚖️';
      
      // Par défaut
      return '📊';
    };
    
    const fieldIcon = getFieldIcon(field);
    
    // Style de base
    let cardStyle = buildDisplayCardStyle(displayAppearance.tokens, displayAppearance.styleOverrides);
    let labelStyle = buildDisplayLabelStyle(displayAppearance.tokens);
    let valueStyle = buildDisplayValueStyle(displayAppearance.tokens);
    
    // 🎨 Surcharge pour les champs Total ou avec couleur de bulle personnalisée
    if (customBubbleColor) {
      const isDark = isColorDark(customBubbleColor);
      cardStyle = {
        ...cardStyle,
        background: `linear-gradient(135deg, ${customBubbleColor} 0%, ${customBubbleColor}dd 100%)`,
        backgroundColor: customBubbleColor,
        borderColor: customBubbleColor
      };
      labelStyle = {
        ...labelStyle,
        color: isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.75)'
      };
      valueStyle = {
        ...valueStyle,
        color: isDark ? '#ffffff' : '#1a1a1a',
        fontWeight: 600
      };
    } else if (isTotalField) {
      cardStyle = {
        ...cardStyle,
        background: 'linear-gradient(135deg, #0b5c6b 0%, #0d4f59 100%)',
        backgroundColor: '#0b5c6b',
        borderColor: '#094d56'
      };
      labelStyle = {
        ...labelStyle,
        color: 'rgba(255, 255, 255, 0.85)'
      };
      valueStyle = {
        ...valueStyle,
        color: '#ffffff',
        fontWeight: 600
      };
    }
    
    // 🎨 DESIGN MODERNE: Bulles rondes compactes
    // Icône + Valeur seulement, label en tooltip
    
    // 🎨 Déterminer si on utilise un style "foncé" (total ou couleur custom foncée)
    const hasCustomBubble = Boolean(customBubbleColor);
    const usesDarkBubble = hasCustomBubble ? isColorDark(customBubbleColor!) : isTotalField;
    
    const bubbleSize = (isTotalField || hasCustomBubble) ? 90 : 80; // px - plus petit pour mobile
    
    // 🔢 Détecter si c'est une copie (suffixe -1, -2, etc.)
    const copyMatch = (field.id || '').match(/-(\d+)$/);
    const copyNumber = copyMatch ? copyMatch[1] : null;
    
    // Style de la bulle
    const bubbleStyle: React.CSSProperties = {
      width: bubbleSize,
      height: bubbleSize,
      borderRadius: '50%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: hasCustomBubble
        ? `linear-gradient(135deg, ${customBubbleColor} 0%, ${customBubbleColor}dd 100%)`
        : isTotalField 
          ? 'linear-gradient(135deg, #0b5c6b 0%, #0d4f59 100%)'
          : 'linear-gradient(135deg, #f0fdfa 0%, #e0f7f5 100%)',
      border: hasCustomBubble
        ? `2px solid ${customBubbleColor}`
        : isTotalField ? '2px solid #094d56' : '2px solid #99f6e4',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      cursor: 'default',
      transition: 'all 0.2s ease',
      margin: '0 auto',
      position: 'relative',
    };
    
    // 🔴 Badge rouge pour les copies
    const copyBadgeStyle: React.CSSProperties = {
      position: 'absolute',
      top: -4,
      right: -4,
      width: 20,
      height: 20,
      borderRadius: '50%',
      backgroundColor: '#ef4444',
      color: '#ffffff',
      fontSize: 11,
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '2px solid #ffffff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    };
    
    const iconStyle: React.CSSProperties = {
      fontSize: (isTotalField || hasCustomBubble) ? 24 : 22,
      marginBottom: 2,
      filter: usesDarkBubble ? 'brightness(0) invert(1)' : 'none',
    };
    
    const valueTextStyle: React.CSSProperties = {
      fontSize: (isTotalField || hasCustomBubble) ? 14 : 12,
      fontWeight: 600,
      color: usesDarkBubble ? '#ffffff' : '#0d9488',
      textAlign: 'center',
      lineHeight: 1.2,
      maxWidth: bubbleSize - 16,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    };
    
    // 🎯 FIX: Vérifier AUSSI les propriétés au niveau racine du field (pas seulement linkConfig)
    const isPhotoLink = (
      ((field as any).linkConfig?.mode === 'PHOTO' && (field as any).linkConfig?.targetNodeId) ||
      ((field as any).link_mode === 'PHOTO' && (field as any).link_targetNodeId)
    );
    const photoTargetNodeId = (field as any).linkConfig?.targetNodeId || (field as any).link_targetNodeId;

    // 🎯 Bulles Données: raccordées au réglage columnsDesktop de la section (Paramètres TBL)
    const bubbleCols = Math.max(1, section.config?.columnsDesktop ?? 9);
    const bubbleColsMobile = Math.max(1, section.config?.columnsMobile ?? 3);
    const bubbleActiveCols = isMobile ? bubbleColsMobile : bubbleCols;
    const bubbleSpan = Math.ceil(24 / bubbleCols);
    const bubbleSpanMob = Math.ceil(24 / bubbleColsMobile);
    const bubbleNeedsFlex = 24 % bubbleActiveCols !== 0;
    const bubbleFlexStyle = bubbleNeedsFlex ? {
      flex: `0 0 ${100 / bubbleActiveCols}%`,
      maxWidth: `${100 / bubbleActiveCols}%`,
    } : undefined;

    return (
      <Col key={field.id} xs={bubbleSpanMob} sm={bubbleSpanMob} md={bubbleSpan} lg={bubbleSpan} xl={bubbleSpan} style={{ marginBottom: 12, ...bubbleFlexStyle }}>
        {/* 🖼️ MODE PHOTO: Si linkConfig.mode === 'PHOTO' OU link_mode === 'PHOTO', utiliser ImageDisplayBubble */}
        {isPhotoLink && photoTargetNodeId ? (
          <ImageDisplayBubble
            fieldId={field.id}
            sourceNodeId={photoTargetNodeId}
            label={field.label || 'Photo'}
            formData={formData as Record<string, unknown>}
            size={bubbleSize}
          />
        ) : (
        <Tooltip title={field.label} placement="top">
          <div 
            style={bubbleStyle}
            className="hover:shadow-lg hover:scale-105"
          >
            {/* 🔴 Badge numéro de copie */}
            {copyNumber && (
              <span style={copyBadgeStyle}>{copyNumber}</span>
            )}
            <span style={iconStyle}>{fieldIcon}</span>
            {(() => {
              const displayValue = getDisplayValue();

              if (React.isValidElement(displayValue)) {
                return (
                  <div style={valueTextStyle}>
                    {displayValue}
                  </div>
                );
              }

              const normalizedValue = normalizeUiValue(displayValue);

              return (
                <span style={valueTextStyle}>
                  {normalizedValue ?? '---'}
                </span>
              );
            })()}
          </div>
        </Tooltip>
        )}
      </Col>
    );
  };

  if (!isVisible) {
    return (
      <div style={{ ...getSectionStyle(), opacity: 0.3, pointerEvents: 'none' }}>
        <Card size="small">
          <div className="flex items-center gap-2 text-gray-400">
            <EyeInvisibleOutlined />
            <Text type="secondary">{section.title} (masqué par condition)</Text>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={getSectionStyle()}>
      <Card
        size={level === 0 ? 'default' : 'small'}
        className={`tbl-section-level-${level}`}
      >
        {/* En-tête de section (seulement pour les sous-sections, pas le niveau racine) */}
        {level > 0 && (
          <div className="mb-4">
            {/* Style spécial pour section "Données" avec toggle ouvrir/fermer */}
            {section.title === 'Données' || section.title.includes('Données') ? (
              <div 
                onClick={() => setIsDataSectionOpen(!isDataSectionOpen)}
                style={{
                  background: 'linear-gradient(135deg, #14b8a6 0%, #0891b2 100%)',
                  color: 'white',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  marginBottom: isDataSectionOpen ? '16px' : '0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                }}
                className="hover:opacity-90"
              >
                <Text strong style={{ color: 'white', fontSize: '16px' }}>
                  {section.title}
                </Text>
                <span style={{ 
                  fontSize: 18, 
                  transition: 'transform 0.2s ease',
                  transform: isDataSectionOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                }}>
                  ▼
                </span>
              </div>
            ) : (
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <BranchesOutlined />
                    <Text strong style={{ fontSize: '16px' }}>
                      {section.title}
                    </Text>
                  </div>
                  
                  {section.description && (
                    <Text type="secondary" className="block mb-2">
                      {section.description}
                    </Text>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Champs de cette section */}
        {/* Forcer l'affichage des sections données même si orderedFields est vide */}
        {((section.isDataSection || section.title === 'Données' || section.title.includes('Données')) || visibilityFilteredFields.length > 0) && (
          <>
            {/* Style spécial pour les champs des sections données */}
            {(section.isDataSection || section.title === 'Données' || section.title.includes('Données')) ? (
              <>
                {/* 🎯 Flèche simple pour ouvrir/fermer les bulles */}
                <div 
                  onClick={() => setIsDataSectionOpen(!isDataSectionOpen)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    padding: '4px 8px',
                    marginBottom: isDataSectionOpen ? '8px' : '0',
                    borderRadius: '4px',
                    transition: 'all 0.2s ease',
                    userSelect: 'none',
                    color: '#0d9488',
                    fontSize: 13,
                  }}
                  className="hover:bg-gray-100"
                >
                  <span style={{ 
                    transition: 'transform 0.2s ease',
                    transform: isDataSectionOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                    fontSize: 12,
                  }}>
                    ▼
                  </span>
                  <span style={{ fontWeight: 500 }}>Données</span>
                </div>
                
                {/* Contenu des bulles avec animation */}
                <div style={{ 
                  overflow: 'hidden',
                  maxHeight: isDataSectionOpen ? '2000px' : '0',
                  opacity: isDataSectionOpen ? 1 : 0,
                  transition: 'all 0.3s ease-in-out',
                  marginBottom: isDataSectionOpen ? '16px' : '0',
                }}>
                  <Row gutter={getDataRowGutter(section)} justify="center">
                    {(() => {
                      const filteredFields = orderedFields.filter(field => {
                        const meta = (field.metadata || {}) as any;
                        const sourceTemplateId = meta?.sourceTemplateId;
                        const fieldParentId = (field as any)?.parentRepeaterId || (field as any)?.parentId || (allNodes.find(n => n.id === field.id)?.parentId || undefined);
                        const isPhysicalRepeaterCopy = Boolean(meta?.duplicatedFromRepeater);
                        const isRepeaterVariant = Boolean((field as any).parentRepeaterId) || (sourceTemplateId && isCopyFromRepeater(sourceTemplateId, allNodes, fieldParentId));
                        
                        // 🎯 DEBUG SPÉCIAL PANNEAU
                        const isPanneauField = field.label?.includes('Panneau') || field.label?.includes('panneau');
                        if (isPanneauField) {
                          if (isTBLDebugEnabled()) tblLog(`🎯🎯🎯 [PANNEAU FILTER DEBUG] Champ Panneau dans filtrage DATA SECTION:`, {
                            label: field.label,
                            id: field.id,
                            sourceTemplateId,
                            fieldParentId,
                            isPhysicalRepeaterCopy,
                          isRepeaterVariant,
                          duplicatedFromRepeater: meta?.duplicatedFromRepeater,
                          willBeExcluded: isRepeaterVariant && !isPhysicalRepeaterCopy
                        });
                      }
                      
                      if (sourceTemplateId && !isPhysicalRepeaterCopy && isCopyFromRepeater(sourceTemplateId, allNodes, fieldParentId)) {
                        if (isTBLDebugEnabled()) tblLog(`🚫 [COPY-FILTER] Exclusion de template DATA SECTION: "${field.label}" (sourceTemplateId: ${meta.sourceTemplateId})`);
                        return false;
                      }
                      if (isRepeaterVariant && !isPhysicalRepeaterCopy) {
                        if (isTBLDebugEnabled()) tblLog(`🚫 [REPEATER-FILTER] Exclusion de variante repeater DATA SECTION: "${field.label}" (id: ${field.id})`);
                      }
                      return !isRepeaterVariant || isPhysicalRepeaterCopy;
                    });
                    
                    if (isTBLDebugEnabled()) tblLog(`🎯🎯🎯 [DATA SECTION ROW] Rendering ${filteredFields.length} filtered fields in Row:`, filteredFields.map(f => ({ id: f.id, label: f.label })));
                    
                    // 🎯 GROUPEMENT PARENT-ENFANT: Identifier les champs enfants de branches (conteneurs)
                    // Pour chaque champ, trouver son parent dans allNodes et vérifier si c'est une branche
                    const sectionNodeId = section.id.replace(/-section$/, '');
                    const fieldIdsInSection = new Set(filteredFields.map(f => f.id));
                    
                    // Map: branchNodeId → children field IDs in this section
                    const branchChildrenMap = new Map<string, TBLField[]>();
                    // Map: branchNodeId → branch node info (label, etc.)
                    const branchInfoMap = new Map<string, { id: string; label: string; type: string }>();
                    // Set of field IDs that are children of a branch (should be hidden from main grid)
                    const childFieldIds = new Set<string>();
                    
                    for (const field of filteredFields) {
                      const node = allNodes.find(n => n.id === field.id);
                      if (!node || !node.parentId) continue;
                      
                      // Vérifier si le parent direct est une branche (conteneur) et pas la section elle-même
                      const parentNode = allNodes.find(n => n.id === node.parentId);
                      if (!parentNode) continue;
                      
                      // Le parent est une branche si: type === 'branch' ET n'est PAS la section directe
                      // Et le parent doit aussi NE PAS être une leaf_option/repeater
                      const isParentBranch = (
                        parentNode.type === 'branch' && 
                        parentNode.id !== sectionNodeId &&
                        !parentNode.type.includes('leaf') &&
                        !parentNode.type.includes('section') &&
                        !parentNode.type.includes('root')
                      );
                      
                      if (isParentBranch) {
                        // Vérifier que la branche parent n'a PAS d'options (sinon c'est un select, pas un conteneur)
                        const branchChildren = allNodes.filter(n => n.parentId === parentNode.id);
                        const hasOptions = branchChildren.some(c => c.type === 'leaf_option' || c.type === 'leaf_option_field');
                        
                        if (!hasOptions) {
                          // C'est un vrai conteneur → grouper les enfants
                          if (!branchChildrenMap.has(parentNode.id)) {
                            branchChildrenMap.set(parentNode.id, []);
                            branchInfoMap.set(parentNode.id, {
                              id: parentNode.id,
                              label: parentNode.label || parentNode.name || 'Groupe',
                              type: parentNode.type
                            });
                          }
                          branchChildrenMap.get(parentNode.id)!.push(field);
                          childFieldIds.add(field.id);
                        }
                      }
                    }
                    
                    // Séparer: champs visibles (top-level) vs champs cachés (enfants de branches)
                    const topLevelFields = filteredFields.filter(f => !childFieldIds.has(f.id));
                    
                    // 🔗 Sauvegarder dans les refs pour le Drawer (hors IIFE)
                    branchChildrenMap_ref.current = branchChildrenMap;
                    branchInfoMap_ref.current = branchInfoMap;
                    
                    if (isTBLDebugEnabled() && branchChildrenMap.size > 0) {
                      tblLog(`🎯 [DATA SECTION GROUPS] ${branchChildrenMap.size} branches avec enfants:`, 
                        Array.from(branchChildrenMap.entries()).map(([branchId, children]) => ({
                          branchId,
                          branchLabel: branchInfoMap.get(branchId)?.label,
                          childrenCount: children.length,
                          children: children.map(c => c.label)
                        }))
                      );
                    }
                    
                    const groupedBySuffix = groupDisplayFieldsBySuffix(topLevelFields);
                    const topLevelElements = groupedBySuffix.reduce<React.ReactElement[]>((elements, { suffix, fields: groupedFields }) => {
                      if (groupedFields.length > 0) {
                        if (isTBLDebugEnabled()) tblLog(`🎯 [DATA SECTION GROUP] Suffix "${suffix}" -> ${groupedFields.length} champs`);
                      }
                      const groupElements = groupedFields.map((field) => {
                        const rendered = renderDataSectionField(field);
                        if (isTBLDebugEnabled()) tblLog(`✅✅✅ [DATA SECTION FIELD RENDERED] (suffix: ${suffix}) "${field.label}" -> JSX element:`, rendered);
                        return rendered;
                      });
                      return elements.concat(groupElements);
                    }, []);
                    
                    // 🎯 Ajouter les bulles de branches (groupes cliquables) après les champs top-level
                    const branchBubbles = Array.from(branchChildrenMap.entries()).map(([branchId, children]) => {
                      const branchInfo = branchInfoMap.get(branchId)!;
                      const isExpanded = expandedBranchId === branchId;
                      const bubbleCols = Math.max(1, section.config?.columnsDesktop ?? 9);
                      const bubbleColsMobile = Math.max(1, section.config?.columnsMobile ?? 3);
                      const bubbleSpan = Math.ceil(24 / bubbleCols);
                      const bubbleSpanMob = Math.ceil(24 / bubbleColsMobile);
                      
                      return (
                        <Col key={`branch-${branchId}`} xs={bubbleSpanMob} sm={bubbleSpanMob} md={bubbleSpan} lg={bubbleSpan} xl={bubbleSpan} style={{ marginBottom: 12 }}>
                          <Tooltip title={`${branchInfo.label} (${children.length} champs)`} placement="top">
                            <div 
                              onClick={() => setExpandedBranchId(isExpanded ? null : branchId)}
                              style={{
                                width: 90,
                                height: 90,
                                borderRadius: '50%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: isExpanded
                                  ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                                  : 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                                border: isExpanded
                                  ? '2px solid #4338ca'
                                  : '2px solid #a5b4fc',
                                boxShadow: isExpanded 
                                  ? '0 4px 12px rgba(99, 102, 241, 0.35)'
                                  : '0 2px 8px rgba(0,0,0,0.08)',
                                cursor: 'pointer',
                                transition: 'all 0.25s ease',
                                margin: '0 auto',
                                position: 'relative',
                              }}
                              className="hover:shadow-lg hover:scale-105"
                            >
                              {/* Badge nombre d'enfants */}
                              <span style={{
                                position: 'absolute',
                                top: -4,
                                right: -4,
                                width: 22,
                                height: 22,
                                borderRadius: '50%',
                                backgroundColor: '#6366f1',
                                color: '#ffffff',
                                fontSize: 11,
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid #ffffff',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              }}>
                                {children.length}
                              </span>
                              <span style={{ fontSize: 24, marginBottom: 2, filter: isExpanded ? 'brightness(0) invert(1)' : 'none' }}>📂</span>
                              <span style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: isExpanded ? '#ffffff' : '#4338ca',
                                textAlign: 'center',
                                lineHeight: 1.2,
                                maxWidth: 74,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                {branchInfo.label}
                              </span>
                            </div>
                          </Tooltip>
                        </Col>
                      );
                    });
                    
                    return [...topLevelElements, ...branchBubbles];
                  })()}
                  </Row>
                  
                  {/* 🎯 DRAWER: Panneau latéral pour les champs enfants d'une branche */}
                  {expandedBranchId && branchChildrenMap_ref.current.has(expandedBranchId) && (() => {
                    // Note: On reconstruit les infos ici car le Drawer est en dehors du IIFE
                    const branchChildren = branchChildrenMap_ref.current.get(expandedBranchId)!;
                    const branchLabel = branchInfoMap_ref.current.get(expandedBranchId)?.label || 'Détails';
                    return (
                      <Drawer
                        title={
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}>📂</span>
                            <span style={{ fontWeight: 600, color: '#4338ca' }}>{branchLabel}</span>
                            <span style={{
                              backgroundColor: '#eef2ff',
                              color: '#4338ca',
                              borderRadius: 12,
                              padding: '2px 8px',
                              fontSize: 12,
                              fontWeight: 600,
                            }}>
                              {branchChildren.length} champs
                            </span>
                          </div>
                        }
                        placement="right"
                        open={true}
                        onClose={() => setExpandedBranchId(null)}
                        width={Math.min(400, window.innerWidth * 0.4)}
                        styles={{
                          body: { padding: 16, backgroundColor: '#fafafe' },
                        }}
                        mask={false}
                      >
                        <Row gutter={[12, 12]} justify="center">
                          {branchChildren.map((childField) => renderDataSectionField(childField))}
                        </Row>
                      </Drawer>
                    );
                  })()}
                </div>
              </>
            ) : visibilityFilteredFields.length > 0 ? (
              <Row gutter={getFormRowGutter(section)} className="tbl-form-row">
                {(() => {
                  const groupedBySuffix = groupDisplayFieldsBySuffix(visibilityFilteredFields);
                  return groupedBySuffix.flatMap(({ suffix, fields: groupedFields }) =>
                    groupedFields.map((field) => {
                  // 🚨🚨🚨 DEBUG: Log pour chaque champ rendu avec détails complets
                  if (isTBLDebugEnabled()) tblLog('��� [ULTRA DEBUG] RENDU CHAMP:', {
                    id: field.id,
                    label: field.label,
                    type: field.type,
                    isConditional: (field as any).isConditional,
                    isRepeaterButton: (field as any).isRepeaterButton,
                    parentFieldId: (field as any).parentFieldId,
                    parentOptionValue: (field as any).parentOptionValue,
                    order: field.order
                  });

                  // Debug spécifique pour les champs conditionnels
                  if ((field as any).isConditional) {
                    if (isTBLDebugEnabled()) tblLog('��� [CONDITIONAL FIELD RENDER] Rendu champ conditionnel:', {
                      id: field.id,
                      label: field.label,
                      type: field.type,
                      isConditional: (field as any).isConditional,
                      parentFieldId: (field as any).parentFieldId,
                      parentOptionValue: (field as any).parentOptionValue,
                      namespace: (field as any).namespace,
                      order: field.order,
                      shouldBeVisible: true
                    });
                  }
                  // 🔁 Gestion spéciale des boutons repeater
                  if ((field as any).isRepeaterButton) {
                    const isAddButton = field.type === 'REPEATER_ADD_BUTTON';
                    const isRemoveInstanceButton = field.type === 'REPEATER_REMOVE_INSTANCE_BUTTON';
                    const repeaterParentId = (field as any).repeaterParentId;
                    const instanceCountKey = `${repeaterParentId}_instanceCount`;
                    const instanceCount = (field as any).repeaterInstanceCount || 0;
                    const instanceIndex = (field as any).repeaterInstanceIndex;
                    const buttonSize = (field as any).repeater_buttonSize ?? (field as any).repeaterButtonSize ?? 'middle'; // tiny, small, middle, large
                    const buttonWidth = (field as any).repeater_buttonWidth ?? (field as any).repeaterButtonWidth ?? 'auto'; // auto, half, full
                    const iconOnly = isAddButton ? false : ((field as any).repeater_iconOnly ?? (field as any).repeaterIconOnly ?? false); // add button shows label
                    const buttonColProps = getFieldColProps(section, field, {
                      forceFullWidth: buttonWidth === 'full' || buttonWidth === 'full-width'
                    });
                    
                    // 🔍 DEBUG CRITIQUE : Afficher TOUTES les propriétés du field
                    if (isAddButton) {
                      if (isTBLDebugEnabled()) tblLog('🎯🎯🎯 [REPEATER RENDER] Rendu du bouton ADD:', {
                        fieldId: field.id,
                        fieldLabel: field.label,
                        'field.repeaterButtonSize': (field as any).repeaterButtonSize,
                        'field.repeaterButtonWidth': (field as any).repeaterButtonWidth,
                        'field.repeaterIconOnly': (field as any).repeaterIconOnly,
                        'buttonSize (utilisé)': buttonSize,
                        'buttonWidth (utilisé)': buttonWidth,
                        'iconOnly (utilisé)': iconOnly,
                        'TOUTES_LES_PROPS': field
                      });
                    }
                    
                    if (isAddButton && !(field as any).repeaterCanAdd) {
                      return null; // Ne pas afficher le bouton + si on a atteint le max
                    }
                    
                    return (
                      <Col 
                        key={field.id}
                        {...buttonColProps}
                        className="mb-2 tbl-form-col"
                      >
                        {/* Rendre le bouton d'ajout dans le même wrapper qu'un champ pour alignement parfait */}
                        <Form.Item
                          className={`mb-4 ${isMobile ? 'tbl-form-item-mobile' : ''}`}
                          labelCol={{ span: 24 }}
                          wrapperCol={{ span: 24 }}
                          colon={false}
                          // Réserver l'espace du label pour s'aligner avec les autres champs
                          label={<span style={{ visibility: 'hidden' }}>.</span>}
                          style={{ width: '150px' }}
                        >
                          <Button
                            type={isAddButton ? 'default' : 'dashed'}
                            ghost={false}
                            size={isAddButton ? 'middle' : 'middle'}
                            block={false}
                            danger={isRemoveInstanceButton}
                            icon={isAddButton ? <PlusOutlined /> : <MinusCircleOutlined />}
                            aria-label={isAddButton ? (field.label || 'Ajouter') : 'Répéteur'}
                            disabled={isAddButton && isRepeating[repeaterParentId]}
                            loading={isAddButton && isRepeating[repeaterParentId]}
                            style={{
                              height: isAddButton ? 32 : 32,
                              width: '150px',
                              fontSize: '14px',
                              borderRadius: '6px',
                              borderStyle: isAddButton ? 'solid' : 'dashed',
                              backgroundColor: isAddButton ? REPEATER_ADD_BUTTON_STYLE.backgroundColor : undefined,
                              borderColor: isAddButton ? REPEATER_ADD_BUTTON_STYLE.borderColor : undefined,
                              color: isAddButton ? REPEATER_ADD_BUTTON_STYLE.color : undefined,
                              fontWeight: isAddButton ? 600 : undefined,
                              boxShadow: isAddButton ? '0 6px 20px rgba(11,92,107,0.25)' : undefined,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '0 12px'
                            }}
                            onClick={async () => {
                            if (isAddButton) {
                              // 🎯 SCROLL LOCK: Sauvegarder la position du scroll pour la restaurer après
                              const scrollContainer = document.querySelector('.ant-layout-content') || document.documentElement;
                              const savedScrollTop = scrollContainer.scrollTop;
                              const savedWindowScrollY = window.scrollY;
                              
                              // Fonction pour restaurer le scroll
                              const restoreScroll = () => {
                                requestAnimationFrame(() => {
                                  if (scrollContainer && scrollContainer !== document.documentElement) {
                                    scrollContainer.scrollTop = savedScrollTop;
                                  }
                                  window.scrollTo(0, savedWindowScrollY);
                                });
                              };
                              
                              // 🚫 PROTECTION: Empêcher les double-clics (via Ref pour immédiateté)
                              if (isRepeatingRef.current[repeaterParentId]) {
                                console.warn('⚠️ [REPEATER] Clic ignoré: opération déjà en cours (ref check)');
                                return;
                              }
                              
                              // Verrouillage immédiat
                              isRepeatingRef.current[repeaterParentId] = true;
                              setIsRepeating(prev => ({ ...prev, [repeaterParentId]: true }));
                              
                              let optimisticOk = true;
                              
                              try {
                                // 🎯 NOUVELLE LOGIQUE: Utiliser l'API de copie réelle
                                if (isTBLDebugEnabled()) tblLog(`\n${'🚀'.repeat(30)}`);
                                if (isTBLDebugEnabled()) tblLog(`🚀🚀🚀 [CRÉATION VERSANT] Bouton "Ajouter Versant" cliqué !`);
                                if (isTBLDebugEnabled()) tblLog(`🚀 repeaterParentId: ${repeaterParentId}`);
                                if (isTBLDebugEnabled()) tblLog(`🚀 Utilisation de l'API de copie au lieu du namespace`);
                                if (isTBLDebugEnabled()) tblLog(`${'🚀'.repeat(30)}\n`);
                                // Récupérer les templates depuis les métadonnées du repeater
                                const parentField = section.fields.find(f => f.id === repeaterParentId);
                                
                                // Chercher templateNodeIds dans repeater_templateNodeIds ou metadata.repeater.templateNodeIds
                                let templateNodeIds = parentField?.repeater_templateNodeIds || [];
                                if (!Array.isArray(templateNodeIds)) {
                                  if (typeof templateNodeIds === 'string') {
                                    try {
                                      templateNodeIds = JSON.parse(templateNodeIds);
                                    } catch (e) {
                                      console.error('❌ [COPY-API] Impossible de parser repeater_templateNodeIds:', e);
                                      templateNodeIds = [];
                                    }
                                  } else {
                                    templateNodeIds = [];
                                  }
                                }
                                
                                // Fallback vers metadata.repeater.templateNodeIds
                                if (templateNodeIds.length === 0) {
                                  templateNodeIds = parentField?.metadata?.repeater?.templateNodeIds || [];
                                }
                                
                                if (templateNodeIds.length === 0) {
                                  console.error('❌ [COPY-API] Aucun template trouvé dans le repeater');
                                  if (isTBLDebugEnabled()) tblLog('🔍 [COPY-API] parentField:', parentField);
                                  return;
                                }
                                
                                if (isTBLDebugEnabled()) tblLog(`🔁 [COPY-API] Préparation duplication via repeat endpoint:`, {
                                  repeaterParentId,
                                  templateNodeIds,
                                  includeTotals: true
                                });
                                
                                // 🎯 Premièrement: ajouter l'instance UI localement (optimistic UI)
                                try {
                                  const newCount = instanceCount + 1;
                                  onChange(instanceCountKey, newCount);
                                } catch (e) {
                                  console.warn('⚠️ [REPEATER] Échec optimistic add instance', e);
                                }

                                // Appel à l'API de copie (opération asynchrone en arrière-plan)
                                const repeatRequestBody = {
                                  includeTotals: true
                                };

                                const response = await api.post(
                                  `/api/repeat/${repeaterParentId}/instances/execute`,
                                  repeatRequestBody
                                );
                                
                                // 🎯🎯🎯 DEBUG: Afficher les infos de triggers dans la console frontend
                                if (response?.debug?.triggersFix) {
                                  console.log('🎯🎯🎯 [REPEAT-EXECUTOR DEBUG] Infos triggers/subType:');
                                  response.debug.triggersFix.forEach((item: any, idx: number) => {
                                    console.log(`  [${idx}] ${item.label} (${item.nodeId})`);
                                    console.log(`      originalSubType: "${item.originalSubType}" → appliedSubType: "${item.appliedSubType}"`);
                                    console.log(`      originalTriggers:`, item.originalTriggers);
                                    console.log(`      suffixedTriggers:`, item.suffixedTriggers);
                                  });
                                }
                                
                                if (isTBLDebugEnabled()) tblLog(`✅ [COPY-API] Repeat execute terminé:`, response);
                                
                                // 🔄 SYNC BIDIRECTIONNELLE: Mettre à jour le champ source si configuré
                                try {
                                  console.log(`🔍 [SYNC DEBUG ADD] parentField.id=${parentField?.id}`);
                                  console.log(`🔍 [SYNC DEBUG ADD] parentField.repeater_countSourceNodeId:`, parentField?.repeater_countSourceNodeId);
                                  const countSourceNodeId = parentField?.repeater_countSourceNodeId;
                                  if (countSourceNodeId) {
                                    // 🔒 PROTECTION: Empêcher le preload de se déclencher pendant le sync
                                    if (typeof window !== 'undefined') {
                                      window.__TBL_SKIP_PRELOAD_UNTIL = Date.now() + 2000; // Skip pendant 2 secondes
                                      console.log(`🔒 [SYNC BIDIRECTIONNELLE] Preload désactivé temporairement jusqu'à ${new Date(window.__TBL_SKIP_PRELOAD_UNTIL).toISOString()}`);
                                    }
                                    
                                    // Compter les copies existantes (nœuds avec rootOriginalId = repeaterParentId)
                                    const existingCopiesCount = (allNodes || []).filter(
                                      (n: any) => n.metadata?.copyOf?.rootOriginalId === repeaterParentId
                                    ).length;
                                    // Total = 1 (original) + copies existantes + 1 (nouvelle copie)
                                    const newTotal = 1 + existingCopiesCount + 1;
                                    console.log(`🔄 [SYNC BIDIRECTIONNELLE] Mise à jour champ source ${countSourceNodeId}: ${newTotal}`);
                                    onChange(countSourceNodeId, String(newTotal));
                                  }
                                } catch (syncErr) {
                                  console.warn('⚠️ [SYNC BIDIRECTIONNELLE] Erreur mise à jour champ source:', syncErr);
                                }
                                
                                // ✅ Réponse reçue. On n'appelle PAS TBL_FORCE_REFRESH pour éviter le rechargement
                                // du formulaire complet et l'affichage d'un loader. On émet un événement local
                                // pour indiquer qu'une duplication a été effectuée, mais en demandant aux
                                // listeners de ne pas forcer un rechargement (suppressReload).
                                try {
                                  if (isTBLDebugEnabled()) tblLog('[COPY-API] Processing response for event dispatch...', { hasResponse: !!response });
                                  const duplicatedArray = (response && (response.duplicated || (response as any).data?.duplicated)) || [];
                                  if (isTBLDebugEnabled()) tblLog('[COPY-API] duplicatedArray extracted:', { count: duplicatedArray.length, items: duplicatedArray });
                                  const normalizedDuplicated = duplicatedArray.map((d: any) => ({ id: d?.id || d, parentId: d?.parentId || (d?.node || {})?.parentId || undefined, sourceTemplateId: d?.sourceTemplateId || (d?.metadata || {})?.sourceTemplateId || undefined }));
                                  const newNodesPayload = (response && (response.nodes || (response as any).data?.nodes)) || [];
                                  const eventDebugId = Math.random().toString(36).slice(2,9);
                                  // 🚀 OPTIMISATION: Utiliser directement les nœuds de la réponse sans fetches supplémentaires
                                  // Le backend devrait retourner les nœuds complets dans response.nodes
                                  const finalNodesPayload: any[] = Array.isArray(newNodesPayload) ? [...newNodesPayload] : [];
                                  const duplicatedIds = normalizedDuplicated.map((d:any)=>d.id).filter(Boolean);
                                  
                                  // 🚀 SUPPRESSION DES FETCHES BLOQUANTS
                                  // Les fetches individuels avec retries (5 tentatives × N nœuds) bloquaient l'UI
                                  // Le hook useTBLData-hierarchical-fixed fera un fetch silencieux si nécessaire
                                  const eventTreeId = resolveEventTreeId();
                                  if (isTBLDebugEnabled()) tblLog('[COPY-API] 📡 About to dispatch tbl-repeater-updated', { eventDebugId, duplicatedCount: normalizedDuplicated.length, duplicatedIds: normalizedDuplicated.map(d => d.id), treeId: eventTreeId, nodeId: repeaterParentId });
                                  window.dispatchEvent(new CustomEvent('tbl-repeater-updated', {
                                    detail: {
                                      treeId: eventTreeId,
                                      nodeId: repeaterParentId,
                                      source: 'duplicate-templates',
                                      duplicated: normalizedDuplicated,
                                      newNodes: Array.isArray(finalNodesPayload) ? finalNodesPayload : [],
                                      suppressReload: true,
                                      timestamp: Date.now(),
                                      eventDebugId
                                    }
                                  }));
                                  if (process.env.NODE_ENV === 'development') {
                                    try {
                                      if (isTBLDebugEnabled()) tblLog('✅✅✅ [COPY-API] 📡 Event dispatched successfully!', { eventDebugId, duplicated: JSON.stringify(normalizedDuplicated, null, 2), newNodesCount: (finalNodesPayload || []).length });
                                      if (isTBLDebugEnabled()) tblLog('[COPY-API] 📡 newNodes preview:', JSON.stringify((finalNodesPayload || []).slice(0, 6), null, 2));
                                    } catch (err) { if (isTBLDebugEnabled()) tblLog('[COPY-API] dispatched (debug log failure)', err); }
                                  } else {
                                    if (isTBLDebugEnabled()) tblLog('✅✅✅ [COPY-API] 📡 Event dispatched successfully!', { eventDebugId });
                                  }
                                  // 🎯 OPTIMISTIC UI: On ne force plus le rechargement complet !
                                  // L'événement tbl-repeater-updated avec suppressReload=true et newNodes suffit
                                  // pour une mise à jour instantanée sans freeze.
                                  // Un sync silencieux en arrière-plan garantit la cohérence pour les clics suivants.
                                  try {
                                    if (isTBLDebugEnabled()) tblLog('✅ [COPY-API] Mise à jour optimiste appliquée (pas de forceRemote)');
                                    // Dispatch un retransform LOCAL UNIQUEMENT (pas de refetch serveur)
                                    window.dispatchEvent(new CustomEvent('tbl-force-retransform', {
                                      detail: {
                                        source: 'duplicate-templates',
                                        treeId: eventTreeId,
                                        forceRemote: false, // 🎯 IMPORTANT: false = pas de refresh complet
                                        skipFormReload: true,
                                        eventDebugId,
                                      }
                                    }));
                                    if (isTBLDebugEnabled()) tblLog('✅ [COPY-API] Local retransform dispatched (no server refetch)');
                                    
                                    // 🔄 BACKGROUND SYNC: Synchronisation silencieuse pour les clics suivants
                                    // Cela garantit que les suffixes -2, -3, etc. seront corrects
                                    window.setTimeout(() => {
                                      try {
                                        if (isTBLDebugEnabled()) tblLog('🔄 [COPY-API] Background silent sync starting...');
                                        window.dispatchEvent(new CustomEvent('tbl-repeater-updated', {
                                          detail: {
                                            treeId: eventTreeId,
                                            nodeId: repeaterParentId,
                                            source: 'background-sync',
                                            duplicated: [],
                                            newNodes: [],
                                            suppressReload: true,
                                            silentRefresh: true,
                                            timestamp: Date.now(),
                                            eventDebugId: eventDebugId + '-bg'
                                          }
                                        }));
                                      } catch (bgErr) {
                                        console.warn('⚠️ [COPY-API] Background sync failed (silent):', bgErr);
                                      }
                                    }, 800); // Délai suffisant pour que l'UI soit stable
                                  } catch (e) { 
                                    console.warn('⚠️ [COPY-API] Local retransform dispatch failed:', e);
                                  }
                                } catch (e) {
                                  console.warn('⚠️ [COPY-API] Impossible de dispatch tbl-repeater-updated (silent)', e);
                                  console.warn('⚠️ [COPY-API] Error details:', { error: e, response });
                                }
                              } catch (error) {
                                console.error('❌ [COPY-API] Erreur lors de la copie:', error);
                                optimisticOk = false;
                              } finally {
                                // 🔓 Réactiver le bouton après l'opération (succès ou échec)
                                isRepeatingRef.current[repeaterParentId] = false;
                                setIsRepeating(prev => ({ ...prev, [repeaterParentId]: false }));
                                
                                // 🎯 SCROLL LOCK: Restaurer la position du scroll
                                restoreScroll();
                                // Double restauration avec délai pour les re-renders React
                                setTimeout(restoreScroll, 50);
                                setTimeout(restoreScroll, 150);
                              }

                              // Si la duplication a échoué côté serveur, annuler l'optimistic UI
                              if (!optimisticOk) {
                                  try {
                                    const newCount = Math.max(0, (formData[instanceCountKey] as number || 1) - 1);
                                    onChange(instanceCountKey, newCount);
                                  } catch (e) {
                                    console.warn('⚠️ [COPY-API] Impossible d’annuler l’instance localement', e);
                                  }
                                }
                            } else if (isRemoveInstanceButton) {
                              // Supprimer une instance spécifique
                              dlog(`🔁 [REPEATER] Suppression instance #${instanceIndex + 1}:`, {
                                repeaterParentId,
                                instanceIndex,
                                oldCount: instanceCount
                              });
                              
                              // 🎯 Diminuer immédiatement le compteur localement (optimistic)
                              const newCount = instanceCount - 1;
                              onChange(instanceCountKey, newCount);
                              
                              // Récupérer les IDs des champs template depuis les métadonnées
                              const parentField = section.fields.find(f => f.id === repeaterParentId);
                              const rawIds = parentField?.metadata?.repeater?.templateNodeIds || [];
                              // Utiliser la même expansion que pour le rendu afin de purger toutes les clés liées
                              const templateNodeIds = expandTemplateNodeIds(rawIds);
                              
                              // Décaler toutes les instances après celle supprimée
                              for (let i = instanceIndex + 1; i < instanceCount; i++) {
                                templateNodeIds.forEach(templateId => {
                                  const currentKey = `${repeaterParentId}_${i}_${templateId}`;
                                  const previousKey = `${repeaterParentId}_${i - 1}_${templateId}`;
                                  const currentValue = formData[currentKey];
                                  onChange(previousKey, currentValue);
                                });
                              }
                              
                              // Supprimer les clés de la dernière instance (maintenant obsolète)
                              templateNodeIds.forEach(templateId => {
                                const lastKey = `${repeaterParentId}_${instanceCount - 1}_${templateId}`;
                                onChange(lastKey, undefined);
                              });
                            }
                          }}
                          >
                            {isAddButton ? (field.label || 'Ajouter') : (!iconOnly && field.label)}
                          </Button>
                        </Form.Item>
                      </Col>
                    );
                  }
                  
                  // 🎯 DÉTECTER LES CHAMPS CONDITIONNELS INJECTÉS
                  // Les champs conditionnels injectés ont la propriété isConditional: true
                  const isInjectedConditionalField = (field as any).isConditional === true;
                  
                  if (isInjectedConditionalField) {
                    // Rendre directement le champ conditionnel injecté
                    if (isTBLDebugEnabled()) tblLog('🚨🚨🚨 [CONDITIONAL FIELD DIRECT RENDER] Rendu champ conditionnel injecté:', {
                      id: field.id,
                      label: field.label,
                      type: field.type,
                      parentFieldId: (field as any).parentFieldId,
                      parentOptionValue: (field as any).parentOptionValue
                    });
                    const conditionalKey = `${field.id}__pf_${(field as any).parentFieldId || 'none'}`;
                    const injectedConditionalColProps = getFieldColProps(section, field);
                    
                    return (
                      <Col
                        key={conditionalKey}
                        {...injectedConditionalColProps}
                        className="mb-2 tbl-form-col conditional-field-injected"
                        data-parent-field-id={(field as any).parentFieldId || ''}
                        data-parent-option-value={String((field as any).parentOptionValue ?? '')}
                        data-field-id={field.id}
                        data-field-label={field.label || ''}
                      >
                        <TBLFieldRendererAdvanced
                          field={field}
                          value={extractFieldValue(field.id)}
                          allNodes={allNodes}
                          onChange={(value) => handleFieldChange(field.id, value, field.label)}
                          onUpdateAnyField={onChange} // 🤖 AI Measure
                          disabled={disabled}
                          formData={formData}
                          treeMetadata={field.treeMetadata}
                          treeId={treeId}
                        />
                      </Col>
                    );
                  }

                  // 🎯 INJECTION CONDITIONALFIELDS POUR REPEATERS - DÉSACTIVÉE
                  // ❌ CETTE INJECTION EST MAINTENANT DÉSACTIVÉE CAR LES CHAMPS CONDITIONNELS 
                  // SONT DÉJÀ GÉRÉS PAR LE SYSTÈME INTÉGRÉ DANS orderedFields
                  // Cette injection directe causait des doublons de champs conditionnels
                  const shouldInjectConditionalFields = (_field: any) => {
                    // ❌ DÉSACTIVÉ - retourne toujours false pour éviter la double injection
                    return false;
                    
                    // Code original commenté pour référence :
                    // const isSelectField = field.type === 'select' || field.type === 'SELECT' || field.type === 'cascade';
                    // const hasOptions = field.options && Array.isArray(field.options) && field.options.length > 0;
                    // const isCascadeWithoutOptions = field.type === 'cascade' && (!field.options || field.options.length === 0);
                    // return (isSelectField && hasOptions) || isCascadeWithoutOptions;
                  };

                  // ❌ CETTE SECTION EST MAINTENANT DÉSACTIVÉE - LES CHAMPS CONDITIONNELS 
                  // SONT GÉRÉS PAR LE SYSTÈME INTÉGRÉ DANS orderedFields
                  if (shouldInjectConditionalFields(field)) {
                    const _repeaterNamespace = (field as any).repeaterNamespace as RepeaterNamespaceMeta | undefined;

                    // Récupérer la valeur pour ce field (priorité au namespacé, puis original)
                    let selectedValue = formData[field.id];
                    
                    if (selectedValue && field.options) {
                      // Chercher l'option sélectionnée
                      const selectedOption = field.options.find((opt: any) => opt.value === selectedValue);
                      
                      if (selectedOption && selectedOption.conditionalFields && selectedOption.conditionalFields.length > 0) {
                        if (isTBLDebugEnabled()) tblLog('🚨🚨🚨 [CONDITIONAL FIELD DIRECT RENDER] Rendu champ conditionnel injecté:', {
                          id: condField.id,
                          label: condField.label,
                          type: condField.type,
                          parentFieldId: field.id,
                          parentOptionValue: selectedValue
                        });
                        
                        // ⚡ INJECTION RÉELLE : Rendre les conditionalFields directement après le champ
                        const conditionalFieldsToRender = selectedOption.conditionalFields.map((condField: any, condIdx: number) => {
                          const conditionalColProps = getFieldColProps(section, condField);
                          
                          return (
                            <Col
                              key={`${field.id}_conditional_${condIdx}`}
                              {...conditionalColProps}
                              className="mb-2 tbl-form-col"
                            >
                              <TBLFieldRendererAdvanced
                                field={condField}
                                value={extractFieldValue(condField.id)}
                                allNodes={allNodes}
                                onChange={(value) => handleFieldChange(condField.id, value, condField.label)}
                                onUpdateAnyField={onChange} // 🤖 AI Measure
                                disabled={disabled}
                                formData={formData}
                                treeMetadata={condField.treeMetadata}
                                treeId={treeId}
                                submissionId={submissionId}
                              />
                            </Col>
                          );
                        });
                        
                        // Retourner un Fragment contenant le champ principal ET ses conditionalFields
                        const injectedMainFieldColProps = getFieldColProps(section, field);
                        return (
                          <React.Fragment key={field.id}>
                            {/* Champ principal */}
                            <Col
                              {...injectedMainFieldColProps}
                              className="mb-2 tbl-form-col"
                            >
                              <TBLFieldRendererAdvanced
                                field={field}
                                value={extractFieldValue(field.id)}
                                allNodes={allNodes}
                                onChange={(value) => handleFieldChange(field.id, value, field.label)}
                                onUpdateAnyField={onChange} // 🤖 AI Measure
                                disabled={disabled}
                                formData={formData}
                                treeMetadata={field.treeMetadata}
                                treeId={treeId}
                                submissionId={submissionId}
                              />
                            </Col>
                            {conditionalFieldsToRender}
                          </React.Fragment>
                        );
                      }
                    }
                  }

                  // Rendu normal des champs (si pas d'injection de conditionalFields)
                  const defaultFormColProps = getFieldColProps(section, field);
                  return (
                    <Col
                      key={field.id}
                      {...defaultFormColProps}
                      className="mb-2 tbl-form-col"
                    >
                      {/* Contrôles de copies: on garde seulement ➕ (sur le dernier champ du groupe) et un bouton 🗑️ pour supprimer TOUTE la copie (sur le dernier champ du groupe) */}
                      {(field.canAddNewCopy || (field as any).isLastInCopyGroup) && (
                        <div style={{ 
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px'
                        }}>
                          <div style={{ flex: 1 }}>
                            <TBLFieldRendererAdvanced
                              field={field}
                              value={extractFieldValue(field.id)}
                              allNodes={allNodes}
                              onChange={(value) => handleFieldChange(field.id, value, field.label)}
                              onUpdateAnyField={onChange} // 🤖 AI Measure
                              disabled={disabled}
                              formData={formData}
                              treeMetadata={field.treeMetadata}
                              treeId={treeId}
                              submissionId={submissionId}
                            />
                          </div>
                          
                          {/* BOUTONS D'ACTION (par groupe de copie) */}
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {/* ➕ Plus par champ désactivé: on ne garde que le bouton + du répéteur */}
                            
                            {/* 🗑️ BOUTON SUPPRIMER TOUTE LA COPIE (affiché sur le dernier champ du groupe) */}
                            {(() => {
                              const isLastInGroup = (field as any).isLastInCopyGroup === true;
                              // 🔧 FIX: Un UUID standard a 5 segments séparés par des tirets (8-4-4-4-12 chars)
                              // Une copie a un suffixe numérique APRÈS l'UUID: "uuid-1", "uuid-2", etc.
                              // On vérifie si l'ID se termine par un tiret suivi de 1-3 chiffres APRÈS un UUID complet
                              const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-\d{1,3}$/i;
                              const isCopyField = uuidPattern.test(field.id) || 
                                (field as any).isDeletableCopy === true ||
                                ((field as any).parentRepeaterId && (field as any).repeaterInstanceIndex !== undefined && (field as any).repeaterInstanceIndex > 0);
                              const shouldShowDelete = isLastInGroup && isCopyField;
                              
                              // Debug pour comprendre pourquoi le bouton n'apparaît pas
                              if (field.label?.includes('Inclinaison') || field.label?.includes('Orientation')) {
                                if (isTBLDebugEnabled()) tblLog('🗑️ [DELETE BUTTON DEBUG]', {
                                  label: field.label,
                                  id: field.id,
                                  isLastInGroup,
                                  isCopyField,
                                  shouldShowDelete,
                                  parentRepeaterId: (field as any).parentRepeaterId
                                });
                              }
                              
                              return shouldShowDelete ? (
                                <Button
                                  type="text"
                                  danger
                                  size="small"
                                  shape="circle"
                                  icon={<DeleteOutlined />}
                                  title={`Supprimer cette copie`}
                                  style={{
                                    marginTop: '4px',
                                    minWidth: '24px',
                                    height: '24px',
                                    padding: '0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  onClick={() => handleDeleteCopyGroup(field)}
                                />
                              ) : null;
                            })()}
                          </div>
                        </div>
                      )}
                      
                      {/* RENDU NORMAL (sans boutons d'action) */}
                      {!field.canAddNewCopy && !(field as any).isLastInCopyGroup && (
                        <TBLFieldRendererAdvanced
                          field={field}
                          value={extractFieldValue(field.id)}
                          allNodes={allNodes}
                          onChange={(value) => handleFieldChange(field.id, value, field.label)}
                          onUpdateAnyField={onChange} // 🤖 AI Measure
                          disabled={disabled}
                          formData={formData}
                          treeMetadata={field.treeMetadata}
                          treeId={treeId}
                        />
                      )}
                    </Col>
                  );
                    })
                  );
                })()}
              </Row>
            ) : null}
            
            {section.subsections && section.subsections.length > 0 && (
              <Divider />
            )}
          </>
        )}

        {/* Sous-sections (récursif) */}
        {section.subsections && section.subsections.length > 0 && (
          <div className="mt-4">
            {level < 2 ? (
              // Affichage direct pour les premiers niveaux
              <>
                {section.subsections.map((subsection) => (
                  <TBLSectionRenderer
                    key={subsection.id}
                    section={subsection}
                    formData={formData}
                    onChange={onChange}
                    treeId={treeId}
                    allNodes={allNodes}
                    allSections={allSections}
                    disabled={disabled}
                    level={level + 1}
                    parentConditions={parentConditions}
                    submissionId={submissionId}
                  />
                ))}
              </>
            ) : (
              // Affichage en accordéon pour les niveaux plus profonds
              <Collapse size="small" ghost>
                {section.subsections.map((subsection) => (
                  <Panel 
                    key={subsection.id} 
                    header={
                      <div className="flex items-center gap-2">
                        <BranchesOutlined />
                        <span>{subsection.title}</span>
                        <Tag size="small" color="geekblue">
                          {subsection.fields.length} champs
                        </Tag>
                      </div>
                    }
                  >
                    <TBLSectionRenderer
                      section={subsection}
                      formData={formData}
                      onChange={onChange}
                      treeId={treeId}
                      allNodes={allNodes}
                      allSections={allSections}
                      disabled={disabled}
                      level={level + 1}
                      parentConditions={parentConditions}
                      submissionId={submissionId}
                    />
                  </Panel>
                ))}
              </Collapse>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

const buildSectionStructureSignature = (section: TBLSection): string[] => {
  const signature: string[] = [];
  const visit = (sec: TBLSection, depth: number) => {
    signature.push(`section:${depth}:${sec.id}`);
    (sec.fields || []).forEach((field, index) => {
      signature.push(`field:${depth}:${index}:${field.id}`);
    });
    const subsections = (sec as unknown as { subsections?: TBLSection[] }).subsections;
    if (Array.isArray(subsections)) {
      subsections.forEach((subsection, index) => {
        signature.push(`subsection:${depth}:${index}:${subsection.id}`);
        visit(subsection, depth + 1);
      });
    }
  };
  visit(section, 0);
  return signature;
};

// ✅ MÉMOÏSATION AVEC COMPARAISON CUSTOM pour éviter les re-rendus à chaque frappe
const MemoizedTBLSectionRenderer = React.memo(TBLSectionRenderer, (prevProps, nextProps) => {
  // Ne re-render que si les props pertinentes changent
  if (prevProps.section.id !== nextProps.section.id) return false;
  if (prevProps.disabled !== nextProps.disabled) return false;
  if (prevProps.treeId !== nextProps.treeId) return false;
  if (prevProps.level !== nextProps.level) return false;
  if (prevProps.submissionId !== nextProps.submissionId) return false;
  // ⚠️ IMPORTANT: Si formData a changé (référence), forcer le re-render
  // Les champs conditionnels d'une section peuvent dépendre d'un select situé dans une AUTRE section (ex: Versant)
  // En comparant la référence, on garantit l'actualisation immédiate après toute sélection.
  if (prevProps.formData !== nextProps.formData) return false;
  
  // ⚠️ CRITIQUE: Comparer SEULEMENT les valeurs des champs de CETTE section
  const prevStructure = buildSectionStructureSignature(prevProps.section);
  const nextStructure = buildSectionStructureSignature(nextProps.section);

  if (prevStructure.length !== nextStructure.length) return false;
  for (let i = 0; i < prevStructure.length; i += 1) {
    if (prevStructure[i] !== nextStructure[i]) {
      return false;
    }
  }
  
  // Comparer les VALEURS des champs de cette section uniquement
  const prevFieldIds = (prevProps.section.fields || []).map(f => f.id);
  for (const fieldId of prevFieldIds) {
    if (prevProps.formData[fieldId] !== nextProps.formData[fieldId]) {
      return false; // Une valeur a changé, re-render
    }
  }
  
  // Aucun changement pertinent, ne pas re-render
  return true;
});

MemoizedTBLSectionRenderer.displayName = 'TBLSectionRenderer';

export default MemoizedTBLSectionRenderer;

