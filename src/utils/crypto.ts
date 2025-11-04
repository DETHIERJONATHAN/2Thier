import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // Pour AES, c'est toujours 16

// Validation paresseuse de la clé: ne pas interrompre le chargement du serveur.
// En production, l'utilisation d'`encrypt` sans clé valide lèvera une erreur explicite.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
let key: Buffer | null = null;

(() => {
  try {
    if (ENCRYPTION_KEY && Buffer.from(ENCRYPTION_KEY, 'utf8').length === 32) {
      key = Buffer.from(ENCRYPTION_KEY, 'utf8');
    } else {
      console.warn('[CRYPTO] ENCRYPTION_KEY manquante ou invalide (32 chars requis). Le chiffrement est indisponible jusqu\'à configuration.');
      key = null;
    }
  } catch (e) {
    console.warn('[CRYPTO] Impossible d\'initialiser la clé de chiffrement:', (e as Error)?.message);
    key = null;
  }
})();

export function encrypt(text: string): string {
  if (!key) {
    // En prod: refuser explicitement pour éviter de chiffrer avec une clé inconnue
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY absente/invalide: chiffrement indisponible. Configurez une clé de 32 caractères.');
    }
    // En dev: permettre de travailler en clair (optionnel). Ici on renvoie tel quel.
    console.warn('[CRYPTO] encrypt() appelé sans clé valide en environnement non-production. Retour en clair.');
    return text;
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(text: string): string {
  try {
    // Si le texte ne contient pas de ':', c'est probablement du texte non chiffré
    if (!text.includes(':')) {
      return text;
    }

    if (!key) {
      console.warn('[CRYPTO] decrypt() appelé sans clé valide. Retour du texte original.');
      return text;
    }

    const textParts = text.split(':');
    if (textParts.length < 2) {
      throw new Error('Invalid encrypted text format');
    }
    const ivHex = textParts.shift();
    if (!ivHex) {
      throw new Error('IV is missing');
    }
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = textParts.join(':');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    // Si le décryptage échoue, retourner le texte original (peut-être non chiffré)
    return text;
  }
}
