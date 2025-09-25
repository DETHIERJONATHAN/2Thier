// Utilité générique de génération de variantes de clés miroir sans connaissance métier codée en dur.
// Objectif: produire un ensemble de variantes robustes pour retrouver la valeur indépendamment des accents,
// casse, espaces, ponctuation ou segments décoratifs (ex: " - Champ").

export interface MirrorVariantOptions {
  stripSuffixPatterns?: RegExp[]; // motifs à retirer (ex: /\s*-\s*Champ$/i)
  minLength?: number; // Longueur mini pour conserver une variante
  customNormalizers?: ((s: string) => string)[]; // Injecter des normalisations additionnelles
}

const DEFAULT_SUFFIXES = [/\s*-\s*Champ.*$/i];

// Normalisations de base (ordre important)
function baseNormalize(raw: string): string[] {
  const variants: string[] = [];
  const trimmed = raw.trim();
  variants.push(trimmed);
  // Sans accents
  const noAccents = trimmed.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  variants.push(noAccents);
  // Remplacer ponctuation commune par espace
  const noPunct = noAccents.replace(/[,:;()/\\]/g, ' ');
  variants.push(noPunct);
  // Compacter espaces multiples
  const compactSpaces = noPunct.replace(/\s+/g, ' ');
  variants.push(compactSpaces);
  // Lowercase
  variants.push(compactSpaces.toLowerCase());
  // Sans espaces
  variants.push(compactSpaces.replace(/\s+/g, ''));
  return Array.from(new Set(variants)).filter(Boolean);
}

export function generateMirrorVariants(label: string, opts: MirrorVariantOptions = {}): string[] {
  const { stripSuffixPatterns = DEFAULT_SUFFIXES, minLength = 2, customNormalizers = [] } = opts;
  if (!label) return [];
  let base = label;
  stripSuffixPatterns.forEach(re => { base = base.replace(re, ''); });
  const seed = [base];
  const variantSet = new Set<string>();
  seed.forEach(s => baseNormalize(s).forEach(v => variantSet.add(v)));
  // Appliquer normaliseurs custom
  if (customNormalizers.length) {
    [...variantSet].forEach(v => {
      customNormalizers.forEach(fn => {
        try {
          const extra = fn(v);
          if (extra) variantSet.add(extra);
        } catch { /* ignore */ }
      });
    });
  }
  return [...variantSet].filter(v => v.length >= minLength && v !== label);
}

export function buildMirrorKeys(label: string, prefix = '__mirror_data_', options?: MirrorVariantOptions): string[] {
  return generateMirrorVariants(label, options).map(v => `${prefix}${v}`);
}
