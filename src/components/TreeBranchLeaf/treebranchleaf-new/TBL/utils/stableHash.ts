/**
 * stableHash
 * Génère un hash JSON stable (ordre des clés trié) limité en profondeur pour éviter le bruit.
 * - Ignore les valeurs undefined
 * - Coupe les tableaux après 50 éléments
 * - Coupe les objets après 100 clés
 * - Profondeur max 4 (au-delà valeur '[Object]')
 */
export function stableHash(value: unknown, depth = 0): string {
  const maxDepth = 4;
  const maxArray = 50;
  const maxKeys = 100;
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'number' || t === 'boolean') return String(value);
  if (t === 'string') return JSON.stringify(value);
  if (t === 'undefined') return 'u';
  if (t === 'object') {
    if (depth >= maxDepth) return '…';
    if (Array.isArray(value)) {
      const slice = value.slice(0, maxArray).map(v => stableHash(v, depth + 1));
      const suffix = value.length > maxArray ? `+${value.length - maxArray}` : '';
      return `[${slice.join(',')}]${suffix}`;
    }
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).filter(k => obj[k] !== undefined).sort().slice(0, maxKeys);
    const suffix = Object.keys(obj).length > maxKeys ? `+${Object.keys(obj).length - maxKeys}` : '';
    return `{${keys.map(k => `${JSON.stringify(k)}:${stableHash(obj[k], depth + 1)}`).join(',')}}${suffix}`;
  }
  return 'x';
}

export function shortHash(value: unknown): string {
  const full = stableHash(value);
  // Simple hash numeric reduction
  let h = 0;
  for (let i = 0; i < full.length; i++) {
    h = (h * 31 + full.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}
