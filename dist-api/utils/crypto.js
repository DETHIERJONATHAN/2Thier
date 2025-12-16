"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
var crypto = __importStar(require("crypto"));
var ALGORITHM = 'aes-256-cbc';
var IV_LENGTH = 16; // Pour AES, c'est toujours 16
// Validation paresseuse de la clé: ne pas interrompre le chargement du serveur.
// En production, l'utilisation d'`encrypt` sans clé valide lèvera une erreur explicite.
var ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
var key = null;
(function () {
    try {
        if (ENCRYPTION_KEY && Buffer.from(ENCRYPTION_KEY, 'utf8').length === 32) {
            key = Buffer.from(ENCRYPTION_KEY, 'utf8');
        }
        else {
            console.warn('[CRYPTO] ENCRYPTION_KEY manquante ou invalide (32 chars requis). Le chiffrement est indisponible jusqu\'à configuration.');
            key = null;
        }
    }
    catch (e) {
        console.warn('[CRYPTO] Impossible d\'initialiser la clé de chiffrement:', e === null || e === void 0 ? void 0 : e.message);
        key = null;
    }
})();
function encrypt(text) {
    if (!key) {
        // En prod: refuser explicitement pour éviter de chiffrer avec une clé inconnue
        if (process.env.NODE_ENV === 'production') {
            throw new Error('ENCRYPTION_KEY absente/invalide: chiffrement indisponible. Configurez une clé de 32 caractères.');
        }
        // En dev: permettre de travailler en clair (optionnel). Ici on renvoie tel quel.
        console.warn('[CRYPTO] encrypt() appelé sans clé valide en environnement non-production. Retour en clair.');
        return text;
    }
    var iv = crypto.randomBytes(IV_LENGTH);
    var cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    var encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}
function decrypt(text) {
    try {
        // Si le texte ne contient pas de ':', c'est probablement du texte non chiffré
        if (!text.includes(':')) {
            return text;
        }
        if (!key) {
            console.warn('[CRYPTO] decrypt() appelé sans clé valide. Retour du texte original.');
            return text;
        }
        var textParts = text.split(':');
        if (textParts.length < 2) {
            throw new Error('Invalid encrypted text format');
        }
        var ivHex = textParts.shift();
        if (!ivHex) {
            throw new Error('IV is missing');
        }
        var iv = Buffer.from(ivHex, 'hex');
        var encryptedText = textParts.join(':');
        var decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        var decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch (error) {
        console.error('Decryption failed:', error);
        // Si le décryptage échoue, retourner le texte original (peut-être non chiffré)
        return text;
    }
}
