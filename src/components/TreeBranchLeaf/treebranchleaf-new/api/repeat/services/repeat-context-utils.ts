import type { Prisma } from '@prisma/client';
import type { DuplicationContext } from '../../registry/repeat-id-registry.js';

type MetadataCarrier = {
  id: string;
  metadata: Prisma.JsonValue | null | undefined;
};

type ContextFallback = {
  templateNodeId?: string;
  repeaterNodeId?: string;
  suffix?: string | number;
  scopeId?: string;
};

const toRecord = (metadata: Prisma.JsonValue | null | undefined): Record<string, unknown> => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }
  return metadata as Record<string, unknown>;
};

const pickString = (value: unknown): string | undefined => {
  return typeof value === 'string' && value.trim().length ? value : undefined;
};

const pickNumericLike = (value: unknown): string | number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length) {
    return value;
  }
  return undefined;
};

export function deriveRepeatContextFromMetadata(
  carrier: MetadataCarrier,
  fallback: ContextFallback = {}
): DuplicationContext | undefined {
  const meta = toRecord(carrier.metadata);

  const repeaterNodeId = pickString(meta.duplicatedFromRepeater) ?? fallback.repeaterNodeId;
  const templateNodeId = pickString(meta.sourceTemplateId) ?? fallback.templateNodeId;
  const duplicatedFromNodeId =
    pickString(meta.copiedFromNodeId) ?? templateNodeId ?? fallback.templateNodeId ?? carrier.id;
  const scopeId =
    pickString(meta.repeatScopeId) ??
    pickString(meta.repeaterScopeId) ??
    fallback.scopeId ??
    repeaterNodeId;
  const suffix =
    pickNumericLike(meta.copySuffix) ??
    pickNumericLike(meta.suffixNum) ??
    pickNumericLike(meta.suffix) ??
    fallback.suffix;

  if (!repeaterNodeId && !scopeId) {
    return undefined;
  }

  return {
    repeaterNodeId,
    templateNodeId: templateNodeId ?? carrier.id,
    duplicatedFromNodeId,
    scopeId,
    suffix,
    mode: 'repeater'
  };
}
