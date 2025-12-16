"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoMailSync = void 0;
var client_1 = require("@prisma/client");
var events_1 = require("events");
var imap_simple_1 = __importDefault(require("imap-simple"));
var crypto_js_1 = require("../utils/crypto.js");
var RealTimeEmailNotificationService_js_1 = __importDefault(require("./RealTimeEmailNotificationService.js"));
var prisma = new client_1.PrismaClient();
// Fonction pour décoder les en-têtes MIME encodés
function decodeMimeHeader(header) {
    if (!header)
        return header;
    // Décoder les en-têtes MIME-encodés (=?charset?encoding?encoded-text?=)
    var mimePattern = /=\?([^?]+)\?([QqBb])\?([^?]*)\?=/g;
    return header.replace(mimePattern, function (match, charset, encoding, encodedText) {
        try {
            charset = charset.toLowerCase();
            encoding = encoding.toUpperCase();
            if (encoding === 'Q' || encoding === 'q') {
                // Quoted-printable
                var decoded = encodedText.replace(/_/g, ' ');
                decoded = decoded.replace(/=([0-9A-F]{2})/gi, function (_, hex) {
                    return String.fromCharCode(parseInt(hex, 16));
                });
                return decoded;
            }
            else if (encoding === 'B' || encoding === 'b') {
                // Base64
                return Buffer.from(encodedText, 'base64').toString('utf8');
            }
            return encodedText;
        }
        catch (error) {
            console.warn('Erreur de décodage MIME:', error);
            return match; // Retourner le texte original en cas d'erreur
        }
    });
}
// Fonction pour corriger automatiquement l'encodage UTF-8 mal interprété
function fixUtf8Encoding(text) {
    if (!text)
        return text;
    var utf8Fixes = {
        'Ã©': 'é',
        'Ã¨': 'è',
        'Ã ': 'à',
        'Ã§': 'ç',
        'Ã¢': 'â',
        'Ã´': 'ô',
        'Ã¹': 'ù',
        'Ã»': 'û',
        'Ã®': 'î',
        'Ã«': 'ë',
        'Ã¯': 'ï',
        'Ã±': 'ñ',
        'Ãª': 'ê',
        'Ã¼': 'ü',
        'Â ': ' ', // Espace mal encodé
        'Â': '', // Caractères résiduels
    };
    var fixedText = text;
    for (var _i = 0, _a = Object.entries(utf8Fixes); _i < _a.length; _i++) {
        var _b = _a[_i], bad = _b[0], good = _b[1];
        fixedText = fixedText.replace(new RegExp(bad, 'g'), good);
    }
    return fixedText;
}
var AutoMailSyncService = /** @class */ (function (_super) {
    __extends(AutoMailSyncService, _super);
    function AutoMailSyncService() {
        var _this = _super.call(this) || this;
        _this.isRunning = false;
        _this.syncInterval = null;
        _this.syncFrequency = 60000; // 🚀 CHANGÉ : 1 minute au lieu de 10 (plus réactif pour notifications)
        _this.maxRetries = 3; // Nombre maximum de tentatives en cas d'erreur
        _this.retryDelay = 5000; // Délai entre les tentatives (5 secondes)
        return _this;
    }
    AutoMailSyncService.prototype.start = function () {
        var _this = this;
        if (this.isRunning) {
            console.log('🔄 [AUTO-SYNC] Service déjà en cours d\'exécution');
            return;
        }
        this.isRunning = true;
        console.log('🚀 [AUTO-SYNC] Démarrage du service de synchronisation automatique (toutes les 1 minute - TEMPS RÉEL)');
        // Synchronisation immédiate avec retry
        this.performSyncWithRetry();
        // Puis toutes les 1 minute avec retry
        this.syncInterval = setInterval(function () {
            _this.performSyncWithRetry();
        }, this.syncFrequency);
    };
    /**
     * 🚀 NOUVELLE MÉTHODE : Synchroniser un utilisateur spécifique immédiatement
     */
    AutoMailSyncService.prototype.syncForUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var emailAccount, result, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        console.log("\uD83C\uDFAF [AUTO-SYNC] Synchronisation manuelle pour l'utilisateur: ".concat(userId));
                        return [4 /*yield*/, prisma.emailAccount.findFirst({
                                where: {
                                    userId: userId,
                                    isActive: true
                                }
                            })];
                    case 1:
                        emailAccount = _a.sent();
                        if (!emailAccount) {
                            console.log("\u26A0\uFE0F [AUTO-SYNC] Aucun compte email actif trouv\u00E9 pour l'utilisateur ".concat(userId));
                            return [2 /*return*/, null];
                        }
                        return [4 /*yield*/, this.syncUserEmails(emailAccount)];
                    case 2:
                        result = _a.sent();
                        console.log("\u2705 [AUTO-SYNC] Sync manuelle termin\u00E9e pour ".concat(userId, ": ").concat(result.newEmails, " nouveaux, ").concat(result.updatedEmails, " mis \u00E0 jour"));
                        return [2 /*return*/, result];
                    case 3:
                        error_1 = _a.sent();
                        console.error("\u274C [AUTO-SYNC] Erreur sync manuelle pour l'utilisateur ".concat(userId, ":"), error_1);
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    AutoMailSyncService.prototype.stop = function () {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        this.isRunning = false;
        console.log('⏹️ [AUTO-SYNC] Service de synchronisation automatique arrêté');
    };
    // 🎛️ NOUVEAU: Méthode pour changer la fréquence de synchronisation
    AutoMailSyncService.prototype.setSyncFrequency = function (minutes) {
        var newFrequency = minutes * 60000; // Convertir en millisecondes
        console.log("\u2699\uFE0F [AUTO-SYNC] Changement de fr\u00E9quence: ".concat(minutes, " minutes (").concat(newFrequency, "ms)"));
        this.syncFrequency = newFrequency;
        // Si le service est en cours, le redémarrer avec la nouvelle fréquence
        if (this.isRunning) {
            console.log('🔄 [AUTO-SYNC] Redémarrage avec nouvelle fréquence...');
            this.stop();
            this.start();
        }
    };
    // 📊 NOUVEAU: Obtenir la fréquence actuelle
    AutoMailSyncService.prototype.getSyncFrequency = function () {
        return this.syncFrequency / 60000; // Retourner en minutes
    };
    AutoMailSyncService.prototype.performSyncWithRetry = function () {
        return __awaiter(this, arguments, void 0, function (retryCount) {
            var error_2;
            var _this = this;
            if (retryCount === void 0) { retryCount = 0; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 6]);
                        return [4 /*yield*/, this.performSync()];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 2:
                        error_2 = _a.sent();
                        console.error("\u274C [AUTO-SYNC] Erreur de synchronisation (tentative ".concat(retryCount + 1, "/").concat(this.maxRetries, "):"), error_2);
                        if (!(retryCount < this.maxRetries - 1)) return [3 /*break*/, 4];
                        console.log("\uD83D\uDD04 [AUTO-SYNC] Nouvelle tentative dans ".concat(this.retryDelay, "ms..."));
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, _this.retryDelay); })];
                    case 3:
                        _a.sent();
                        return [2 /*return*/, this.performSyncWithRetry(retryCount + 1)];
                    case 4:
                        console.error("\uD83D\uDCA5 [AUTO-SYNC] \u00C9chec d\u00E9finitif apr\u00E8s ".concat(this.maxRetries, " tentatives"));
                        _a.label = 5;
                    case 5: return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    AutoMailSyncService.prototype.performSync = function () {
        return __awaiter(this, void 0, void 0, function () {
            var usersWithMail, totalResults, _i, usersWithMail_1, emailAccount, result, userError_1, totalNew, totalUpdated, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 9, , 10]);
                        console.log('⏰ [AUTO-SYNC] Début de la synchronisation automatique...');
                        return [4 /*yield*/, prisma.emailAccount.findMany({
                                where: {
                                    isActive: true,
                                    encryptedPassword: { not: null }
                                },
                                take: 10 // Limite de sécurité
                            })];
                    case 1:
                        usersWithMail = _a.sent();
                        console.log("\uD83D\uDC65 [AUTO-SYNC] ".concat(usersWithMail.length, " utilisateurs \u00E0 synchroniser"));
                        totalResults = [];
                        _i = 0, usersWithMail_1 = usersWithMail;
                        _a.label = 2;
                    case 2:
                        if (!(_i < usersWithMail_1.length)) return [3 /*break*/, 8];
                        emailAccount = usersWithMail_1[_i];
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 6, , 7]);
                        // Validation des données critiques (pas besoin de imapHost car auto-détecté)
                        if (!emailAccount.emailAddress || !emailAccount.encryptedPassword) {
                            console.warn("\u26A0\uFE0F [AUTO-SYNC] Configuration incompl\u00E8te pour l'utilisateur ".concat(emailAccount.userId, ", ignor\u00E9"));
                            return [3 /*break*/, 7];
                        }
                        return [4 /*yield*/, this.syncUserEmails(emailAccount)];
                    case 4:
                        result = _a.sent();
                        totalResults.push(result);
                        // Attendre un peu entre chaque utilisateur pour éviter la surcharge
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
                    case 5:
                        // Attendre un peu entre chaque utilisateur pour éviter la surcharge
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        userError_1 = _a.sent();
                        console.error("\u274C [AUTO-SYNC] Erreur pour l'utilisateur ".concat(emailAccount.userId, ":"), userError_1);
                        return [3 /*break*/, 7];
                    case 7:
                        _i++;
                        return [3 /*break*/, 2];
                    case 8:
                        totalNew = totalResults.reduce(function (sum, r) { return sum + r.newEmails; }, 0);
                        totalUpdated = totalResults.reduce(function (sum, r) { return sum + r.updatedEmails; }, 0);
                        console.log("\u2705 [AUTO-SYNC] Synchronisation termin\u00E9e: ".concat(totalNew, " nouveaux emails, ").concat(totalUpdated, " mis \u00E0 jour"));
                        return [3 /*break*/, 10];
                    case 9:
                        error_3 = _a.sent();
                        console.error('❌ [AUTO-SYNC] Erreur lors de la synchronisation automatique:', error_3);
                        throw error_3; // Relancer pour le système de retry
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Configuration automatique IMAP basée sur le domaine email
     */
    AutoMailSyncService.prototype.getImapConfig = function (domain) {
        var configs = {
            'gmail.com': { host: 'imap.gmail.com', port: 993, tls: true },
            'one.com': { host: 'imap.one.com', port: 993, tls: true },
            'yandex.com': { host: 'imap.yandex.com', port: 993, tls: true },
            'yandex.ru': { host: 'imap.yandex.ru', port: 993, tls: true },
            'outlook.com': { host: 'outlook.office365.com', port: 993, tls: true },
            'hotmail.com': { host: 'outlook.office365.com', port: 993, tls: true },
            'live.com': { host: 'outlook.office365.com', port: 993, tls: true },
            'yahoo.com': { host: 'imap.mail.yahoo.com', port: 993, tls: true },
            'yahoo.fr': { host: 'imap.mail.yahoo.com', port: 993, tls: true }
        };
        return configs[domain] || { host: "imap.".concat(domain), port: 993, tls: true };
    };
    AutoMailSyncService.prototype.syncUserEmails = function (emailAccount) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, newEmails, updatedEmails, emailDomain, imapConfig, config, connection, foldersToSync, _i, foldersToSync_1, folder, existingEmailsCount, results, allError_1, searchDate, months, day, month, year, formattedDate, sinceError_1, allResults, fallbackError_1, maxEmailsToProcess, emailsToProcess, _loop_1, this_1, _a, emailsToProcess_1, item, folderError_1, duration, imapError_1, error_4, totalEmails;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        startTime = Date.now();
                        newEmails = 0;
                        updatedEmails = 0;
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 30, , 31]);
                        console.log("\uD83D\uDD04 [AUTO-SYNC] Synchronisation pour ".concat(emailAccount.emailAddress, "..."));
                        emailDomain = emailAccount.emailAddress.split('@')[1];
                        imapConfig = this.getImapConfig(emailDomain);
                        config = {
                            imap: {
                                user: emailAccount.emailAddress,
                                password: (0, crypto_js_1.decrypt)(emailAccount.encryptedPassword),
                                host: imapConfig.host,
                                port: imapConfig.port,
                                tls: imapConfig.tls,
                                tlsOptions: {
                                    rejectUnauthorized: false,
                                    servername: imapConfig.host
                                },
                                authTimeout: 10000,
                                connTimeout: 10000,
                                keepalive: false
                            }
                        };
                        connection = void 0;
                        _c.label = 2;
                    case 2:
                        _c.trys.push([2, 28, , 29]);
                        return [4 /*yield*/, imap_simple_1.default.connect(config)];
                    case 3:
                        connection = _c.sent();
                        foldersToSync = [
                            { imapName: 'INBOX', dbName: 'inbox' },
                            { imapName: 'INBOX.Sent', dbName: 'sent' },
                            { imapName: 'INBOX.Drafts', dbName: 'drafts' },
                            { imapName: 'INBOX.Trash', dbName: 'trash' },
                            { imapName: 'INBOX.Spam', dbName: 'spam' }
                        ];
                        _i = 0, foldersToSync_1 = foldersToSync;
                        _c.label = 4;
                    case 4:
                        if (!(_i < foldersToSync_1.length)) return [3 /*break*/, 27];
                        folder = foldersToSync_1[_i];
                        _c.label = 5;
                    case 5:
                        _c.trys.push([5, 25, , 26]);
                        return [4 /*yield*/, connection.openBox(folder.imapName)];
                    case 6:
                        _c.sent();
                        return [4 /*yield*/, prisma.email.count({
                                where: {
                                    userId: emailAccount.userId,
                                    folder: folder.dbName
                                }
                            })];
                    case 7:
                        existingEmailsCount = _c.sent();
                        console.log("\uD83D\uDCCA [AUTO-SYNC] ".concat(folder.imapName, ": ").concat(existingEmailsCount, " emails existants en base"));
                        results = [];
                        if (!(existingEmailsCount === 0)) return [3 /*break*/, 12];
                        console.log("\uD83D\uDD04 [AUTO-SYNC] Premier sync pour ".concat(folder.imapName, " - R\u00E9cup\u00E9ration de TOUS les emails"));
                        _c.label = 8;
                    case 8:
                        _c.trys.push([8, 10, , 11]);
                        return [4 /*yield*/, connection.search(['ALL'], {
                                bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID)', 'TEXT', '1.1', '1.2', '2', '1'],
                                markSeen: false,
                                struct: true
                            })];
                    case 9:
                        results = _c.sent();
                        console.log("\uD83D\uDCE7 [AUTO-SYNC] ".concat(folder.imapName, ": ").concat(results.length, " emails trouv\u00E9s (sync complet)"));
                        return [3 /*break*/, 11];
                    case 10:
                        allError_1 = _c.sent();
                        console.log("\u26A0\uFE0F [AUTO-SYNC] Erreur recherche ALL dans ".concat(folder.imapName, ":"), allError_1);
                        return [3 /*break*/, 11];
                    case 11: return [3 /*break*/, 20];
                    case 12:
                        // Sync normal : chercher seulement les emails récents
                        console.log("\uD83D\uDD04 [AUTO-SYNC] Sync normal pour ".concat(folder.imapName, " - Emails r\u00E9cents seulement"));
                        searchDate = new Date();
                        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                        day = String(searchDate.getDate());
                        month = months[searchDate.getMonth()];
                        year = searchDate.getFullYear();
                        formattedDate = "".concat(day, "-").concat(month, "-").concat(year);
                        _c.label = 13;
                    case 13:
                        _c.trys.push([13, 15, , 20]);
                        return [4 /*yield*/, connection.search(['SINCE', formattedDate], {
                                bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID)', 'TEXT', '1.1', '1.2', '2', '1'],
                                markSeen: false,
                                struct: true
                            })];
                    case 14:
                        results = _c.sent();
                        console.log("\uD83D\uDCE7 [AUTO-SYNC] ".concat(folder.imapName, ": ").concat(results.length, " emails depuis ").concat(formattedDate));
                        return [3 /*break*/, 20];
                    case 15:
                        sinceError_1 = _c.sent();
                        console.log("\u26A0\uFE0F [AUTO-SYNC] Erreur SINCE dans ".concat(folder.imapName, ", fallback vers r\u00E9cents:"), sinceError_1);
                        _c.label = 16;
                    case 16:
                        _c.trys.push([16, 18, , 19]);
                        return [4 /*yield*/, connection.search(['ALL'], {
                                bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID)', 'TEXT', '1.1', '1.2', '2', '1'],
                                markSeen: false,
                                struct: true
                            })];
                    case 17:
                        allResults = _c.sent();
                        results = allResults.slice(-50); // 50 plus récents
                        console.log("\uD83D\uDCE7 [AUTO-SYNC] ".concat(folder.imapName, ": ").concat(results.length, " emails (fallback r\u00E9cents)"));
                        return [3 /*break*/, 19];
                    case 18:
                        fallbackError_1 = _c.sent();
                        console.log("\u274C [AUTO-SYNC] Erreur fallback dans ".concat(folder.imapName, ":"), fallbackError_1);
                        return [3 /*break*/, 19];
                    case 19: return [3 /*break*/, 20];
                    case 20:
                        maxEmailsToProcess = existingEmailsCount === 0 ? 1000 : 100;
                        emailsToProcess = results.slice(0, maxEmailsToProcess);
                        if (results.length > maxEmailsToProcess) {
                            console.warn("\u26A0\uFE0F [AUTO-SYNC] ".concat(folder.imapName, ": Limite de ").concat(maxEmailsToProcess, " emails appliqu\u00E9e (").concat(results.length, " trouv\u00E9s)"));
                        }
                        _loop_1 = function (item) {
                            var headerPart, header, _e, _f, part, subject, from, to, messageId, date, isRead, uid, body, contentType, htmlBody_1, textBody_1, extractBodies_1, allParts, _g, allParts_1, part, bodyContent, existingEmail, dateStart, dateEnd, isInBlacklist, deletedByUID, deletedByMessageId, cleanBody, finalBody, newEmail, userOrg, notificationService, emailError_1;
                            return __generator(this, function (_h) {
                                switch (_h.label) {
                                    case 0:
                                        _h.trys.push([0, 20, , 21]);
                                        console.log("\uD83D\uDD0D [AUTO-SYNC] Traitement email dans ".concat(folder.imapName, "..."));
                                        headerPart = item.parts.find(function (part) {
                                            return part.which && part.which.includes('HEADER');
                                        });
                                        header = null;
                                        if (headerPart && headerPart.body) {
                                            header = headerPart.body;
                                            console.log("\u2705 [AUTO-SYNC] Headers trouv\u00E9s pour email dans ".concat(folder.imapName));
                                        }
                                        else {
                                            // Fallback: chercher dans toutes les parties
                                            for (_e = 0, _f = item.parts || []; _e < _f.length; _e++) {
                                                part = _f[_e];
                                                if (part.body && typeof part.body === 'object') {
                                                    if (part.body.subject || part.body.from || part.body.date) {
                                                        header = part.body;
                                                        console.log("\u2705 [AUTO-SYNC] Headers trouv\u00E9s via fallback pour email dans ".concat(folder.imapName));
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                        if (!header) return [3 /*break*/, 18];
                                        subject = decodeMimeHeader(header.subject ? header.subject[0] : 'Pas de sujet');
                                        from = decodeMimeHeader(header.from ? header.from[0] : 'Expéditeur inconnu');
                                        to = decodeMimeHeader(header.to ? header.to[0] : emailAccount.emailAddress);
                                        // 🔧 CORRECTION AUTOMATIQUE DE L'ENCODAGE
                                        subject = fixUtf8Encoding(subject);
                                        from = fixUtf8Encoding(from);
                                        to = fixUtf8Encoding(to);
                                        messageId = header['message-id'] ? header['message-id'][0] : null;
                                        date = header.date ? new Date(header.date[0]) : new Date();
                                        isRead = item.attributes.flags.includes('\\Seen');
                                        uid = item.attributes.uid;
                                        console.log("\uD83D\uDCE7 [AUTO-SYNC] Email \"".concat(subject, "\" de ").concat(from, " - Date: ").concat(date, " - UID: ").concat(uid));
                                        body = 'Corps récupéré en arrière-plan';
                                        contentType = 'text/plain';
                                        htmlBody_1 = null;
                                        textBody_1 = null;
                                        if (item.struct) {
                                            extractBodies_1 = function (struct, partPath) {
                                                var _a;
                                                if (partPath === void 0) { partPath = ''; }
                                                if (Array.isArray(struct)) {
                                                    struct.forEach(function (part, index) {
                                                        var currentPath = partPath ? "".concat(partPath, ".").concat(index + 1) : "".concat(index + 1);
                                                        extractBodies_1(part, currentPath);
                                                    });
                                                }
                                                else if (struct.type && struct.subtype) {
                                                    var mimeType = "".concat(struct.type, "/").concat(struct.subtype).toLowerCase();
                                                    var currentPath_1 = partPath || '1';
                                                    var bodyPart = (_a = item.parts.find(function (p) { return p.which === currentPath_1; })) === null || _a === void 0 ? void 0 : _a.body;
                                                    if (bodyPart) {
                                                        var bodyContent = bodyPart.toString();
                                                        if (mimeType === 'text/html' && !htmlBody_1) {
                                                            htmlBody_1 = bodyContent;
                                                        }
                                                        else if (mimeType === 'text/plain' && !textBody_1) {
                                                            textBody_1 = bodyContent;
                                                        }
                                                    }
                                                    if (struct.body) {
                                                        extractBodies_1(struct.body, currentPath_1);
                                                    }
                                                }
                                            };
                                            extractBodies_1(item.struct);
                                        }
                                        // Fallback: examiner toutes les parties disponibles
                                        if (!htmlBody_1 && !textBody_1) {
                                            allParts = item.parts || [];
                                            for (_g = 0, allParts_1 = allParts; _g < allParts_1.length; _g++) {
                                                part = allParts_1[_g];
                                                if (part.which && part.body) {
                                                    bodyContent = part.body.toString();
                                                    if (bodyContent.includes('<html') || bodyContent.includes('<HTML') ||
                                                        bodyContent.includes('<!DOCTYPE') || bodyContent.includes('<body') ||
                                                        bodyContent.includes('<div') || bodyContent.includes('<p>') ||
                                                        bodyContent.includes('<br') || bodyContent.includes('<a ')) {
                                                        htmlBody_1 = bodyContent;
                                                    }
                                                    else if (part.which === 'TEXT' || bodyContent.length > 10) {
                                                        textBody_1 = bodyContent;
                                                    }
                                                }
                                            }
                                        }
                                        // Priorité au HTML s'il existe, sinon utiliser le texte
                                        if (htmlBody_1) {
                                            body = this_1.cleanHtmlContent(htmlBody_1);
                                            contentType = 'text/html';
                                        }
                                        else if (textBody_1) {
                                            body = this_1.cleanTextContent(textBody_1);
                                            contentType = 'text/plain';
                                        }
                                        existingEmail = void 0;
                                        if (!uid) return [3 /*break*/, 2];
                                        return [4 /*yield*/, prisma.email.findFirst({
                                                where: {
                                                    userId: emailAccount.userId,
                                                    uid: uid.toString(),
                                                    folder: folder.dbName
                                                },
                                                select: { id: true, isRead: true }
                                            })];
                                    case 1:
                                        existingEmail = _h.sent();
                                        _h.label = 2;
                                    case 2:
                                        if (!(!existingEmail && messageId)) return [3 /*break*/, 4];
                                        return [4 /*yield*/, prisma.email.findFirst({
                                                where: {
                                                    userId: emailAccount.userId,
                                                    body: { contains: messageId },
                                                    folder: folder.dbName
                                                },
                                                select: { id: true, isRead: true }
                                            })];
                                    case 3:
                                        existingEmail = _h.sent();
                                        _h.label = 4;
                                    case 4:
                                        if (!!existingEmail) return [3 /*break*/, 6];
                                        dateStart = new Date(date.getTime() - 30000);
                                        dateEnd = new Date(date.getTime() + 30000);
                                        return [4 /*yield*/, prisma.email.findFirst({
                                                where: {
                                                    userId: emailAccount.userId,
                                                    subject: subject,
                                                    from: from,
                                                    folder: folder.dbName,
                                                    createdAt: {
                                                        gte: dateStart,
                                                        lte: dateEnd
                                                    }
                                                },
                                                select: { id: true, isRead: true }
                                            })];
                                    case 5:
                                        existingEmail = _h.sent();
                                        _h.label = 6;
                                    case 6:
                                        if (!!existingEmail) return [3 /*break*/, 14];
                                        isInBlacklist = false;
                                        if (!uid) return [3 /*break*/, 8];
                                        return [4 /*yield*/, prisma.deletedEmail.findFirst({
                                                where: {
                                                    userId: emailAccount.userId,
                                                    uid: uid.toString(),
                                                    folder: folder.dbName
                                                }
                                            })];
                                    case 7:
                                        deletedByUID = _h.sent();
                                        isInBlacklist = !!deletedByUID;
                                        _h.label = 8;
                                    case 8:
                                        if (!(!isInBlacklist && messageId)) return [3 /*break*/, 10];
                                        return [4 /*yield*/, prisma.deletedEmail.findFirst({
                                                where: {
                                                    userId: emailAccount.userId,
                                                    messageId: messageId,
                                                    folder: folder.dbName
                                                }
                                            })];
                                    case 9:
                                        deletedByMessageId = _h.sent();
                                        isInBlacklist = !!deletedByMessageId;
                                        _h.label = 10;
                                    case 10:
                                        if (isInBlacklist) {
                                            console.log("\uD83D\uDEAB [AUTO-SYNC] Email en blacklist, ignor\u00E9: \"".concat(subject, "\" (UID: ").concat(uid, ")"));
                                            return [2 /*return*/, "continue"];
                                        }
                                        console.log("\uD83D\uDCBE [AUTO-SYNC] Cr\u00E9ation nouvel email: \"".concat(subject, "\""));
                                        cleanBody = fixUtf8Encoding(body);
                                        finalBody = messageId ? "Message-ID: ".concat(messageId, "\n\n").concat(cleanBody) : cleanBody;
                                        return [4 /*yield*/, prisma.email.create({
                                                data: {
                                                    userId: emailAccount.userId,
                                                    from: from,
                                                    to: to,
                                                    subject: subject,
                                                    body: finalBody,
                                                    contentType: contentType,
                                                    isRead: isRead,
                                                    folder: folder.dbName,
                                                    uid: uid ? uid.toString() : null, // ✅ CORRECTION: Stocker l'UID IMAP
                                                    createdAt: date
                                                }
                                            })];
                                    case 11:
                                        newEmail = _h.sent();
                                        newEmails++;
                                        if (!(folder.dbName === 'inbox' && !isRead)) return [3 /*break*/, 13];
                                        console.log('🔔 [AUTO-SYNC] Déclenchement notification temps réel !');
                                        return [4 /*yield*/, prisma.userOrganization.findFirst({
                                                where: { userId: emailAccount.userId },
                                                select: { organizationId: true }
                                            })];
                                    case 12:
                                        userOrg = _h.sent();
                                        if (userOrg) {
                                            // 🚀 NOUVELLE FONCTIONNALITÉ : ÉMETTRE UN ÉVÉNEMENT
                                            this_1.emit('newEmailFound', {
                                                emailId: newEmail.id,
                                                from: from,
                                                subject: subject,
                                                folder: folder.dbName,
                                                receivedAt: date,
                                                userId: emailAccount.userId,
                                                organizationId: userOrg.organizationId
                                            });
                                            notificationService = RealTimeEmailNotificationService_js_1.default.getInstance();
                                            notificationService.notifyNewEmail({
                                                emailId: newEmail.id,
                                                from: from,
                                                subject: subject,
                                                folder: folder.dbName,
                                                receivedAt: date,
                                                userId: emailAccount.userId,
                                                organizationId: userOrg.organizationId
                                            });
                                        }
                                        _h.label = 13;
                                    case 13:
                                        console.log("\u2705 [AUTO-SYNC] Nouvel email cr\u00E9\u00E9: \"".concat(subject, "\" (UID: ").concat(uid, ", ").concat(contentType, ")"));
                                        return [3 /*break*/, 17];
                                    case 14:
                                        if (!(existingEmail.isRead !== isRead)) return [3 /*break*/, 16];
                                        console.log("\uD83D\uDCDD [AUTO-SYNC] Mise \u00E0 jour statut email: \"".concat(subject, "\""));
                                        return [4 /*yield*/, prisma.email.update({
                                                where: { id: existingEmail.id },
                                                data: { isRead: isRead }
                                            })];
                                    case 15:
                                        _h.sent();
                                        updatedEmails++;
                                        console.log("\uD83D\uDCDD [AUTO-SYNC] Email mis \u00E0 jour: \"".concat(subject, "\""));
                                        return [3 /*break*/, 17];
                                    case 16:
                                        console.log("\u23ED\uFE0F [AUTO-SYNC] Email d\u00E9j\u00E0 existant: \"".concat(subject, "\""));
                                        _h.label = 17;
                                    case 17: return [3 /*break*/, 19];
                                    case 18:
                                        console.warn("\u26A0\uFE0F [AUTO-SYNC] Pas de header trouv\u00E9 pour un email dans ".concat(folder.imapName));
                                        console.log("\uD83D\uDD0D [AUTO-SYNC] Debug - Parties disponibles:", (_b = item.parts) === null || _b === void 0 ? void 0 : _b.map(function (p) { return ({ which: p.which, hasBody: !!p.body, bodyType: typeof p.body }); }));
                                        console.log("\uD83D\uDD0D [AUTO-SYNC] Debug - Attributs:", item.attributes);
                                        _h.label = 19;
                                    case 19: return [3 /*break*/, 21];
                                    case 20:
                                        emailError_1 = _h.sent();
                                        console.error("\u274C [AUTO-SYNC] Erreur traitement email dans ".concat(folder.imapName, ":"), emailError_1);
                                        return [3 /*break*/, 21];
                                    case 21: return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _a = 0, emailsToProcess_1 = emailsToProcess;
                        _c.label = 21;
                    case 21:
                        if (!(_a < emailsToProcess_1.length)) return [3 /*break*/, 24];
                        item = emailsToProcess_1[_a];
                        return [5 /*yield**/, _loop_1(item)];
                    case 22:
                        _c.sent();
                        _c.label = 23;
                    case 23:
                        _a++;
                        return [3 /*break*/, 21];
                    case 24: return [3 /*break*/, 26];
                    case 25:
                        folderError_1 = _c.sent();
                        console.log("\u26A0\uFE0F [AUTO-SYNC] Dossier ".concat(folder.imapName, " inaccessible, ignor\u00E9:"), folderError_1);
                        return [3 /*break*/, 26];
                    case 26:
                        _i++;
                        return [3 /*break*/, 4];
                    case 27:
                        connection.end();
                        duration = Date.now() - startTime;
                        console.log("\u26A1 [AUTO-SYNC] ".concat(emailAccount.emailAddress, ": ").concat(newEmails, " nouveaux, ").concat(updatedEmails, " mis \u00E0 jour (").concat(duration, "ms)"));
                        return [3 /*break*/, 29];
                    case 28:
                        imapError_1 = _c.sent();
                        if (connection) {
                            try {
                                connection.end();
                            }
                            catch ( /* ignore */_d) { /* ignore */ }
                        }
                        throw imapError_1;
                    case 29: return [3 /*break*/, 31];
                    case 30:
                        error_4 = _c.sent();
                        console.error("\u274C [AUTO-SYNC] Erreur pour ".concat(emailAccount.emailAddress, ":"), error_4);
                        return [3 /*break*/, 31];
                    case 31: return [4 /*yield*/, prisma.email.count({
                            where: { userId: emailAccount.userId }
                        })];
                    case 32:
                        totalEmails = _c.sent();
                        return [2 /*return*/, {
                                userId: emailAccount.userId,
                                newEmails: newEmails,
                                updatedEmails: updatedEmails,
                                totalEmails: totalEmails
                            }];
                }
            });
        });
    };
    AutoMailSyncService.prototype.forceSync = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('🔄 [AUTO-SYNC] Synchronisation forcée demandée...');
                        return [4 /*yield*/, this.performSyncWithRetry()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    AutoMailSyncService.prototype.cleanHtmlContent = function (htmlContent) {
        try {
            var cleanContent = htmlContent;
            // 🎯 PARSING MIME AVANCÉ - Gérer tous les types de délimiteurs
            if (cleanContent.includes('This is a multi-part message') ||
                cleanContent.match(/^--[a-zA-Z0-9]/m) ||
                cleanContent.includes('------=_NextPart_') ||
                cleanContent.includes('Content-Type:')) {
                console.log('🔧 [AUTO-SYNC] Email MIME multi-part détecté, parsing avancé...');
                // Extraire les parties MIME avec différents délimiteurs
                var parts = [];
                // Méthode 1: Délimiteurs --XXXXX
                if (cleanContent.match(/^--[a-zA-Z0-9]/m)) {
                    parts = cleanContent.split(/^--[a-zA-Z0-9][^\n]*$/m);
                }
                // Méthode 2: Délimiteurs ------=_NextPart_
                else if (cleanContent.includes('------=_NextPart_')) {
                    parts = cleanContent.split(/^------=_NextPart_[^\n]*$/m);
                }
                // Méthode 3: Autres délimiteurs MIME
                else {
                    parts = cleanContent.split(/^--[=a-zA-Z0-9][^\n]*$/m);
                }
                var htmlPart = null;
                var textPart = null;
                // Analyser chaque partie
                for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
                    var part = parts_1[_i];
                    if (!part.trim())
                        continue;
                    // Chercher la partie HTML
                    if (part.includes('Content-Type: text/html') ||
                        part.includes('Content-Type:text/html')) {
                        console.log('✅ [AUTO-SYNC] Partie HTML trouvée');
                        // Extraire le contenu après les en-têtes
                        var lines = part.split('\n');
                        var contentStartIndex = -1;
                        for (var i = 0; i < lines.length; i++) {
                            if (lines[i].trim() === '') {
                                contentStartIndex = i + 1;
                                break;
                            }
                        }
                        if (contentStartIndex !== -1) {
                            htmlPart = lines.slice(contentStartIndex).join('\n').trim();
                            // Décoder quoted-printable si nécessaire
                            if (part.includes('quoted-printable')) {
                                htmlPart = htmlPart.replace(/=([0-9A-F]{2})/gi, function (_, hex) {
                                    return String.fromCharCode(parseInt(hex, 16));
                                });
                                htmlPart = htmlPart.replace(/=\r?\n/g, '');
                            }
                            break;
                        }
                    }
                    // Partie texte comme fallback
                    else if (part.includes('Content-Type: text/plain') ||
                        part.includes('Content-Type:text/plain')) {
                        var lines = part.split('\n');
                        var contentStartIndex = -1;
                        for (var i = 0; i < lines.length; i++) {
                            if (lines[i].trim() === '') {
                                contentStartIndex = i + 1;
                                break;
                            }
                        }
                        if (contentStartIndex !== -1) {
                            textPart = lines.slice(contentStartIndex).join('\n').trim();
                        }
                    }
                }
                // Utiliser la partie HTML si trouvée, sinon le texte
                if (htmlPart) {
                    console.log('🎯 [AUTO-SYNC] Utilisation de la partie HTML extraite');
                    cleanContent = htmlPart;
                }
                else if (textPart) {
                    console.log('📝 [AUTO-SYNC] Conversion texte → HTML');
                    cleanContent = "<div style=\"white-space: pre-wrap; font-family: Arial, sans-serif; padding: 20px;\">".concat(textPart.replace(/\n/g, '<br>'), "</div>");
                }
                else {
                    console.log('⚠️ [AUTO-SYNC] Aucune partie exploitable trouvée, nettoyage basique');
                }
            }
            // Décoder les caractères quoted-printable restants
            cleanContent = cleanContent.replace(/=([0-9A-F]{2})/gi, function (_, hex) {
                return String.fromCharCode(parseInt(hex, 16));
            });
            cleanContent = cleanContent.replace(/=\r?\n/g, '');
            // Corriger l'encodage UTF-8 mal interprété automatiquement
            cleanContent = fixUtf8Encoding(cleanContent);
            // Nettoyer les en-têtes MIME restants
            cleanContent = cleanContent.replace(/^[A-Za-z-]+:\s*.*$/gm, '');
            cleanContent = cleanContent.replace(/\n\s*\n\s*\n/g, '\n\n');
            cleanContent = cleanContent.replace(/^------=_NextPart_.*$/gm, '');
            cleanContent = cleanContent.replace(/This is a multi-part message in MIME format\./g, '');
            cleanContent = cleanContent.replace(/^Content-Type:.*$/gm, '');
            cleanContent = cleanContent.replace(/^Content-Transfer-Encoding:.*$/gm, '');
            cleanContent = cleanContent.replace(/^\s*charset.*$/gm, '');
            cleanContent = cleanContent.trim();
            // Chercher le début du HTML si ce n'est pas déjà fait
            var htmlTagIndex = cleanContent.search(/<html|<!DOCTYPE/i);
            if (htmlTagIndex >= 0) {
                cleanContent = cleanContent.substring(htmlTagIndex);
            }
            return cleanContent;
        }
        catch (error) {
            console.error('❌ [AUTO-SYNC] Erreur lors du nettoyage HTML:', error);
            return htmlContent;
        }
    };
    AutoMailSyncService.prototype.cleanTextContent = function (textContent) {
        try {
            var cleanContent = textContent;
            // Corriger l'encodage UTF-8 mal interprété automatiquement
            cleanContent = fixUtf8Encoding(cleanContent);
            var mimeHeaderPattern = /^[A-Za-z-]+:\s*.*$/gm;
            cleanContent = cleanContent.replace(mimeHeaderPattern, '');
            cleanContent = cleanContent.replace(/^------=_NextPart_.*$/gm, '');
            cleanContent = cleanContent.replace(/This is a multi-part message in MIME format\./g, '');
            cleanContent = cleanContent.trim();
            return cleanContent;
        }
        catch (error) {
            console.error('❌ [AUTO-SYNC] Erreur lors du nettoyage texte:', error);
            return textContent;
        }
    };
    return AutoMailSyncService;
}(events_1.EventEmitter));
// Instance singleton
exports.autoMailSync = new AutoMailSyncService();
exports.default = AutoMailSyncService;
