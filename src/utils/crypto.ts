import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
// Assurez-vous que ENCRYPTION_KEY est définie dans votre .env et fait 32 octets.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16; // Pour AES, c'est toujours 16

if (!ENCRYPTION_KEY || Buffer.from(ENCRYPTION_KEY, 'utf8').length !== 32) {
  throw new Error('La variable d\'environnement ENCRYPTION_KEY doit être définie et faire 32 caractères.');
}

const key = Buffer.from(ENCRYPTION_KEY, 'utf8');

export function encrypt(text: string): string {
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
      console.log('Texte non chiffré détecté, retour direct:', text);
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
    console.log('Texte déchiffré avec succès');
    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    // Si le décryptage échoue, retourner le texte original (peut-être non chiffré)
    console.log('Échec du décryptage, retour du texte original:', text);
    return text; 
  }
}
