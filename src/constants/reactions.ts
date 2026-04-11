/**
 * HIVE REACTION TYPES — Centralized Pollen System
 * 
 * Internal DB values: LIKE | LOVE | BRAVO | UTILE | WOW
 * Display names follow the Hive lexicon (Pollen = umbrella term for reactions)
 * 
 * Usage:
 *   import { REACTION_TYPES, getReactionByType } from '@/constants/reactions';
 */

import { SF } from '../components/zhiive/ZhiiveTheme';

export interface ReactionType {
  /** Internal DB value */
  type: string;
  /** Emoji displayed in picker */
  emoji: string;
  /** i18n key for the label (under "reactions" namespace) */
  i18nKey: string;
  /** Fallback label (if i18n not loaded) */
  fallback: string;
  /** CSS color for highlight */
  color: string;
}

/**
 * All available reaction types in order.
 * Colors reference SF/theme tokens as hex to avoid import cycle.
 */
export const REACTION_TYPES: readonly ReactionType[] = [
  { type: 'LIKE',  emoji: '👍', i18nKey: 'reactions.pollen',   fallback: 'Pollen',   color: SF.info },
  { type: 'LOVE',  emoji: '❤️', i18nKey: 'reactions.honey',    fallback: 'Honey',    color: SF.like },
  { type: 'BRAVO', emoji: '👏', i18nKey: 'reactions.waggle',   fallback: 'Waggle',   color: SF.gold },
  { type: 'UTILE', emoji: '💡', i18nKey: 'reactions.propolis',  fallback: 'Propolis',  color: SF.success },
  { type: 'WOW',   emoji: '😮', i18nKey: 'reactions.royal',    fallback: 'Royal',    color: SF.primary },
] as const;

/** Default reaction type (the simple tap/click) */
export const DEFAULT_REACTION = REACTION_TYPES[0];

/** Valid type strings for Zod validation */
export const REACTION_TYPE_VALUES = REACTION_TYPES.map(r => r.type) as [string, ...string[]];

/** Get a reaction config by its DB type */
export const getReactionByType = (type: string): ReactionType =>
  REACTION_TYPES.find(r => r.type === type) || DEFAULT_REACTION;
