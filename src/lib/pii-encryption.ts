/**
 * 🔐 PII FIELD-LEVEL ENCRYPTION
 * ==============================
 * 
 * Chiffre/déchiffre les champs PII (Personally Identifiable Information)
 * au repos dans la base de données.
 * 
 * Champs ciblés (non-requêtables par WHERE) :
 * - User: phoneNumber, address, vatNumber
 * - Lead: phone
 * 
 * Utilise l'utilitaire AES-256-CBC existant (src/utils/crypto.ts).
 * Les champs utilisés dans des contraintes uniques ou des WHERE fréquents
 * (email, firstName, lastName) ne sont PAS chiffrés.
 * 
 * @module pii-encryption
 */

import { encrypt, decrypt } from '../utils/crypto';
import { logger } from './logger';

// ============================================================================
// CONFIGURATION — Champs PII par modèle
// ============================================================================

const PII_FIELDS: Record<string, string[]> = {
  User: ['phoneNumber', 'address', 'vatNumber'],
  Lead: ['phone'],
};

// Prefix to identify encrypted values (avoid double-encryption)
const ENCRYPTED_PREFIX = 'enc:';

// ============================================================================
// HELPERS
// ============================================================================

function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX) && value.includes(':');
}

/**
 * Chiffre une valeur PII si elle n'est pas déjà chiffrée.
 */
export function encryptPII(value: string | null | undefined): string | null | undefined {
  if (!value || typeof value !== 'string' || value.trim() === '') return value;
  if (isEncrypted(value)) return value; // already encrypted
  try {
    return ENCRYPTED_PREFIX + encrypt(value);
  } catch (err) {
    logger.error('[PII] Encryption failed:', (err as Error)?.message);
    return value; // fallback to plaintext in dev
  }
}

/**
 * Déchiffre une valeur PII. Retourne la valeur originale si non chiffrée.
 */
export function decryptPII(value: string | null | undefined): string | null | undefined {
  if (!value || typeof value !== 'string') return value;
  if (!isEncrypted(value)) return value; // not encrypted, return as-is
  try {
    const encrypted = value.slice(ENCRYPTED_PREFIX.length);
    return decrypt(encrypted);
  } catch (err) {
    logger.error('[PII] Decryption failed:', (err as Error)?.message);
    return value; // fallback
  }
}

// ============================================================================
// MODEL-LEVEL HELPERS
// ============================================================================

/**
 * Chiffre les champs PII d'un objet data avant écriture.
 */
export function encryptModelData<T extends Record<string, unknown>>(model: string, data: T): T {
  const fields = PII_FIELDS[model];
  if (!fields) return data;

  const result = { ...data };
  for (const field of fields) {
    if (field in result && typeof result[field] === 'string') {
      result[field] = encryptPII(result[field] as string) as unknown as T[string];
    }
  }
  return result;
}

/**
 * Déchiffre les champs PII d'un objet résultat après lecture.
 */
export function decryptModelData<T extends Record<string, unknown>>(model: string, data: T): T {
  const fields = PII_FIELDS[model];
  if (!fields) return data;

  const result = { ...data };
  for (const field of fields) {
    if (field in result && typeof result[field] === 'string') {
      result[field] = decryptPII(result[field] as string) as unknown as T[string];
    }
  }
  return result;
}

/**
 * Déchiffre un tableau de résultats.
 */
export function decryptModelArray<T extends Record<string, unknown>>(model: string, data: T[]): T[] {
  const fields = PII_FIELDS[model];
  if (!fields) return data;
  return data.map(item => decryptModelData(model, item));
}

/**
 * Liste des modèles avec champs PII.
 */
export function getPIIModels(): string[] {
  return Object.keys(PII_FIELDS);
}

/**
 * Liste des champs PII d'un modèle.
 */
export function getPIIFields(model: string): string[] {
  return PII_FIELDS[model] || [];
}
