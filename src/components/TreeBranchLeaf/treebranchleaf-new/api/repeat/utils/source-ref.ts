export type ParsedSourceRef = {
  type: 'formula' | 'condition' | 'table' | 'field';
  id: string;
  prefix: string;
};

export function parseSourceRef(sourceRef: string | null | undefined): ParsedSourceRef | null {
  if (!sourceRef || typeof sourceRef !== 'string') return null;

  const cleaned = sourceRef.trim();
  if (!cleaned) return null;

  if (cleaned.startsWith('node-formula:')) {
    return { type: 'formula', id: cleaned.replace('node-formula:', ''), prefix: 'node-formula:' };
  }

  if (cleaned.startsWith('condition:')) {
    return { type: 'condition', id: cleaned.replace('condition:', ''), prefix: 'condition:' };
  }

  if (cleaned.startsWith('node-condition:')) {
    return { type: 'condition', id: cleaned.replace('node-condition:', ''), prefix: 'node-condition:' };
  }

  if (cleaned.startsWith('@table.')) {
    return { type: 'table', id: cleaned.replace('@table.', ''), prefix: '@table.' };
  }

  if (cleaned.startsWith('node-table:')) {
    return { type: 'table', id: cleaned.replace('node-table:', ''), prefix: 'node-table:' };
  }

  return { type: 'field', id: cleaned, prefix: '' };
}

export function applySuffixToSourceRef(sourceRef: string | null | undefined, suffix: string | number): string | null {
  if (!sourceRef) return null;
  const parsed = parseSourceRef(sourceRef);
  if (!parsed) return sourceRef;
  const newId = `${parsed.id}-${suffix}`;
  return `${parsed.prefix}${newId}`;
}

export function extractNodeIdFromSourceRef(sourceRef: string | null | undefined): string | null {
  const parsed = parseSourceRef(sourceRef);
  return parsed ? parsed.id : null;
}
