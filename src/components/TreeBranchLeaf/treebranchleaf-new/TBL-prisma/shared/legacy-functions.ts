import { TBLContext } from './types';

/**
 * Fonctions utilitaires portées depuis treebranchleaf-routes.ts
 * Ces fonctions MARCHENT déjà et sont utilisées dans le système TBL-prisma
 */

export type LabelMap = Map<string, string | null>;
export type ValuesMap = Map<string, unknown>;

/**
 * Formate un label et une valeur dans le format standard
 * EXACTEMENT comme dans l'ancien système
 */
export function fmtLV(label: string | null, value: unknown): string {
  // Gérer les cas où le label n'est pas disponible
  const lbl = (label && label !== 'undefined') ? label : 'Champ inconnu';
  const val = (value !== null && value !== undefined) ? String(value) : 'aucune donnée';
  return `${lbl}: ${val}`;
}

/**
 * Normalise un ID de référence
 * EXACTEMENT comme dans l'ancien système
 */
export function normalizeRefId(ref: string): string {
  if (!ref) return ref;
  const m = /@value\.([a-f0-9-]{36})/i.exec(ref);
  return m && m[1] ? m[1] : ref;
}

/**
 * Extrait les IDs de formules depuis un conditionSet
 * EXACTEMENT comme dans l'ancien système
 */
export function extractFormulaIdsFromConditionSet(conditionSet: unknown): Set<string> {
  const ids = new Set<string>();
  try {
    const str = JSON.stringify(conditionSet) || '';
    let m: RegExpExecArray | null;
    const re = /node-formula:([a-f0-9-]{36})/gi;
    while ((m = re.exec(str)) !== null) ids.add(m[1]);
  } catch {
    // ignore
  }
  return ids;
}

/**
 * Extrait les IDs de nœuds depuis les tokens
 * EXACTEMENT comme dans l'ancien système
 */
export function extractNodeIdsFromTokens(tokens: unknown): Set<string> {
  const ids = new Set<string>();
  try {
    const str = JSON.stringify(tokens) || '';
    // Rechercher les patterns @value.UUID
    let m: RegExpExecArray | null;
    const re = /@value\.([a-f0-9-]{36})/gi;
    while ((m = re.exec(str)) !== null) ids.add(m[1]);
  } catch {
    // ignore
  }
  return ids;
}

/**
 * Construit le texte depuis les tokens
 * EXACTEMENT comme dans l'ancien système
 */
export function buildTextFromTokens(tokens: unknown, labels: LabelMap, values: ValuesMap): string {
  if (!tokens) return '';
  const operatorSet = new Set(['+', '-', '*', '/', '=']);
  const mapToken = (t: unknown): string => {
    if (typeof t === 'string') {
      // Si le token est un opérateur isolé, le rendre sous la forme "(+)"/"(-)"/"(*)"/"(/)"/"(=)"
      if (operatorSet.has(t.trim())) {
        return `(${t.trim()})`;
      }
      // Supporter @value.<UUID> et @value.node_... (fallback générique)
      const re = /@value\.([A-Za-z0-9_:-]+)/g;
      let out = '';
      let lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(t)) !== null) {
        out += t.slice(lastIndex, m.index);
        const raw = m[1];
        // 🎯 CORRECTION CRUCIALE: Traiter TOUS les IDs, pas seulement les UUIDs
        const label = labels.get(raw) ?? null;
        const value = values.get(raw) ?? null;
        out += fmtLV(label, value);
        lastIndex = re.lastIndex;
      }
      if (lastIndex === 0) return t; // aucun remplacement
      return out + t.slice(lastIndex);
    }
    if (typeof t === 'number' || typeof t === 'boolean') return String(t);
    try { return JSON.stringify(t); } catch { return ''; }
  };
  if (Array.isArray(tokens)) return tokens.map(mapToken).join(' ');
  return mapToken(tokens);
}

/**
 * Calcule le résultat numérique d'une expression
 * EXACTEMENT comme dans l'ancien système
 */
export function calculateResult(expression: string): number | null {
  try {
    // Extraire seulement la partie mathématique (avant le " = " s'il existe)
    const mathPart = expression.split(' = ')[0];
    
    // Extraire les valeurs numériques entre parenthèses
    const valueMatches = mathPart.match(/\(([0-9.]+)\)/g);
    if (!valueMatches || valueMatches.length < 2) {
      return null;
    }
    
    const values = valueMatches.map(match => parseFloat(match.slice(1, -1)));
    
    // Détecter l'opérateur - supporter les formats avec parenthèses et avec espaces
    if (mathPart.includes('(+)') || mathPart.includes(' + ')) {
      return values.reduce((a, b) => a + b, 0);
    } else if (mathPart.includes('(-)') || mathPart.includes(' - ')) {
      return values.reduce((a, b) => a - b);
    } else if (mathPart.includes('(*)') || mathPart.includes(' * ')) {
      return values.reduce((a, b) => a * b, 1);
    } else if (mathPart.includes('(/)') || mathPart.includes(' / ')) {
      return values.reduce((a, b) => a / b);
    }
    
    return null;
  } catch (error) {
    console.error('Erreur lors du calcul:', error);
    return null;
  }
}

/**
 * Convertit le contexte TBL vers les maps legacy
 */
export function contextToLegacyMaps(context: TBLContext): { labels: LabelMap; values: ValuesMap } {
  return {
    labels: context.labelMap,
    values: context.valueMap
  };
}