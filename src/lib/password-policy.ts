/**
 * 🔐 Password Policy — Zhiive Security
 * Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 digit
 */

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

const MIN_LENGTH = 8;

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Le mot de passe est requis'] };
  }

  if (password.length < MIN_LENGTH) {
    errors.push(`Le mot de passe doit contenir au moins ${MIN_LENGTH} caractères`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }

  return { valid: errors.length === 0, errors };
}
