// src/services/CryptoService.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

// La clé secrète doit être une chaîne hexadécimale de 64 caractères (32 octets)
const secretKey = process.env.CRYPTO_SECRET_KEY;

if (!secretKey || Buffer.from(secretKey, 'hex').length !== 32) {
  throw new Error('CRYPTO_SECRET_KEY n\'est pas définie dans le fichier .env ou n\'a pas la longueur requise de 32 octets (64 caractères hex).');
}

const key = Buffer.from(secretKey, 'hex');

/**
 * Chiffre un texte en clair.
 * @param text Le texte à chiffrer.
 * @returns Une chaîne chiffrée contenant l'IV et les données.
 */
export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  // Concatène iv, authTag et données chiffrées pour le stockage
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
};

/**
 * Déchiffre un texte chiffré.
 * @param encryptedText Le texte chiffré.
 * @returns Le texte original en clair.
 */
export const decrypt = (encryptedText: string): string => {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Format du texte chiffré invalide.');
    }
    
    const [ivHex, authTagHex, encryptedDataHex] = parts;
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encryptedData = Buffer.from(encryptedDataHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Échec du déchiffrement:', error);
    return ''; // Retourne une chaîne vide en cas d'erreur pour éviter de planter l'application
  }
};
