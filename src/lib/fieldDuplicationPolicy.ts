import { logger } from './logger';
/**
 * 🎯 Politique de Duplication des Champs
 * 
 * Fichier centralisé qui détermine si un champ dupliqué (suffixe -1, -2, etc.)
 * peut être configuré comme un SELECT avec lookup.
 * 
 * Cette logique doit être COHÉRENTE entre:
 * - Le backend (src/routes/tbl-select-config-route.ts)
 * - Le frontend (hooks React, composants)
 */

/**
 * ✅ Vérifier si un champ peut être un SELECT
 * 
 * Règle RÉVISÉE:
 * - Les champs dupliqués (suffixe -1, -2, etc.) qui sont naturellement TEXT NE PEUVENT PAS devenir SELECT par capability
 * - Les champs dupliqués qui ÉTAIENT DÉJÀ SELECT (champs de lookup) PEUVENT rester SELECT
 * - Les champs de base peuvent avoir une configuration SELECT
 * 
 * @param fieldId L'ID du champ à vérifier (peut contenir le suffixe)
 * @param fieldType Le type d'origine du champ (TEXT, SELECT, etc.) depuis Prisma
 * @returns true si le champ peut être SELECT, false sinon
 */
export function canFieldBeSelect(fieldId: string | undefined, fieldType?: string): boolean {
  if (!fieldId) return false;
  
  // Vérifier si le champ a un suffixe de duplication (-1, -2, etc.)
  const suffixMatch = fieldId.match(/-(\d{1,3})$/);
  const isDuplicated = !!suffixMatch;
  
  // 🔥 LOGIQUE RÉVISÉE:
  // - Si c'est un champ dupliqué ET qu'il n'était pas SELECT d'origine → NE PEUT PAS être SELECT
  // - Si c'est un champ dupliqué MAIS qu'il était SELECT d'origine → PEUT rester SELECT
  // - Si c'est un champ de base → PEUT être SELECT
  
  if (isDuplicated && fieldType && fieldType.toUpperCase() !== 'SELECT') {
    return false;
  }
  
  return true;
}

/**
 * ✅ Extraire l'ID de base d'un champ (supprimer le suffixe s'il existe)
 * 
 * @param fieldId ID du champ (peut contenir le suffixe -1, -2, etc.)
 * @returns ID sans le suffixe
 */
export function getBaseFieldId(fieldId: string): string {
  return fieldId.replace(/-(\d{1,3})$/, '');
}

/**
 * ✅ Vérifier si un champ est dupliqué
 * 
 * @param fieldId ID du champ à vérifier
 * @returns true si le champ a un suffixe de duplication
 */
export function isDuplicatedField(fieldId: string): boolean {
  return /-(\d{1,3})$/.test(fieldId);
}

/**
 * ✅ Extraire le numéro de duplication
 * 
 * @param fieldId ID du champ dupliqué
 * @returns Le numéro (1, 2, 3, etc.) ou undefined si pas dupliqué
 */
export function getDuplicationNumber(fieldId: string): number | undefined {
  const match = fieldId.match(/-(\d{1,3})$/);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * 🔥 DEBUG: Voir les résultats de la politique
 */
export function debugFieldPolicy(fieldId: string | undefined): void {
  if (!fieldId) {
    logger.debug('[fieldDuplicationPolicy] ❌ fieldId est undefined');
    return;
  }
  
  console.group(`[fieldDuplicationPolicy] Analyse: ${fieldId}`);
  logger.debug('isDuplicated:', isDuplicatedField(fieldId));
  logger.debug('canBeSelect:', canFieldBeSelect(fieldId));
  logger.debug('baseFieldId:', getBaseFieldId(fieldId));
  logger.debug('duplicationNumber:', getDuplicationNumber(fieldId));
  console.groupEnd();
}
