"use strict";
/**
 * 🚀 SERVICE DE NOTIFICATIONS EMAIL EN TEMPS RÉEL
 *
 * SYSTÈME HYBRIDE OPTIMISÉ :
 * 1. 📧 Intégration directe avec AutoMailSyncService (temps réel)
 * 2. 🔄 Vérification périodique de sécurité (toutes les 5 minutes)
 * 3. 💡 Notifications intelligentes et instantanées
 */
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
exports.RealTimeEmailNotificationService = void 0;
var client_1 = require("@prisma/client");
var events_1 = require("events");
var UniversalNotificationService_js_1 = __importDefault(require("./UniversalNotificationService.js"));
var prisma = new client_1.PrismaClient();
var RealTimeEmailNotificationService = /** @class */ (function (_super) {
    __extends(RealTimeEmailNotificationService, _super);
    function RealTimeEmailNotificationService() {
        var _this = _super.call(this) || this;
        _this.isRunning = false;
        return _this;
    }
    RealTimeEmailNotificationService.getInstance = function () {
        if (!this.instance) {
            this.instance = new RealTimeEmailNotificationService();
        }
        return this.instance;
    };
    /**
     * 🚀 DÉMARRER LE SERVICE TEMPS RÉEL
     */
    RealTimeEmailNotificationService.prototype.start = function () {
        if (this.isRunning) {
            console.log('⚠️ [RealTimeEmailNotification] Service déjà en cours...');
            return;
        }
        console.log('🚀 [RealTimeEmailNotification] Démarrage du service temps réel...');
        this.isRunning = true;
        // 1. 🎯 ÉCOUTER LES ÉVÉNEMENTS DE SYNCHRONISATION EMAIL
        this.setupEmailSyncListener();
        // 2. 🔄 VÉRIFICATION DE SÉCURITÉ toutes les 5 minutes
        this.startBackupCheck();
        console.log('✅ [RealTimeEmailNotification] Service temps réel démarré !');
    };
    /**
     * 🎯 ÉCOUTER LES NOUVEAUX EMAILS EN TEMPS RÉEL
     */
    RealTimeEmailNotificationService.prototype.setupEmailSyncListener = function () {
        console.log('🎧 [RealTimeEmailNotification] Configuration de l\'écoute temps réel...');
        // Écouter les événements de nouveaux emails depuis AutoMailSyncService
        this.on('newEmailReceived', this.handleNewEmailReceived.bind(this));
        console.log('✅ [RealTimeEmailNotification] Écoute temps réel configurée');
    };
    /**
     * 📧 TRAITEMENT IMMÉDIAT D'UN NOUVEL EMAIL
     */
    RealTimeEmailNotificationService.prototype.handleNewEmailReceived = function (emailData) {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        console.log("\u26A1 [RealTimeEmailNotification] NOUVEL EMAIL D\u00C9TECT\u00C9 - Traitement imm\u00E9diat !");
                        console.log("\uD83D\uDCE7 De: ".concat(emailData.from, ", Sujet: ").concat(emailData.subject));
                        // Vérifier si ce n'est pas un spam/brouillon/envoyé
                        if (this.shouldIgnoreEmail(emailData)) {
                            console.log("\uD83D\uDEAB [RealTimeEmailNotification] Email ignor\u00E9: ".concat(emailData.folder));
                            return [2 /*return*/];
                        }
                        // Créer la notification IMMÉDIATEMENT
                        return [4 /*yield*/, this.createInstantNotification(emailData)];
                    case 1:
                        // Créer la notification IMMÉDIATEMENT
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        console.error('❌ [RealTimeEmailNotification] Erreur lors du traitement temps réel:', error_1);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 🔔 CRÉER UNE NOTIFICATION INSTANTANÉE
     */
    RealTimeEmailNotificationService.prototype.createInstantNotification = function (emailData) {
        return __awaiter(this, void 0, void 0, function () {
            var universalService, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        universalService = UniversalNotificationService_js_1.default.getInstance();
                        return [4 /*yield*/, universalService.notifyNewEmail({
                                emailId: emailData.emailId,
                                from: emailData.from,
                                subject: emailData.subject,
                                userId: emailData.userId,
                                organizationId: emailData.organizationId
                            })];
                    case 1:
                        _a.sent();
                        console.log("\u2705 [RealTimeEmailNotification] Notification UNIVERSELLE cr\u00E9\u00E9e pour: ".concat(emailData.subject));
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _a.sent();
                        console.error('❌ [RealTimeEmailNotification] Erreur notification instantanée:', error_2);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    }; /**
     * 🔄 VÉRIFICATION DE SÉCURITÉ (toutes les 5 minutes)
     * En cas où le temps réel rate quelque chose
     */
    RealTimeEmailNotificationService.prototype.startBackupCheck = function () {
        var _this = this;
        console.log('🛡️ [RealTimeEmailNotification] Démarrage vérification de sécurité...');
        this.backupCheckInterval = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('🔍 [RealTimeEmailNotification] Vérification de sécurité...');
                        return [4 /*yield*/, this.performBackupCheck()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); }, 5 * 60 * 1000); // 5 minutes
    };
    /**
     * 🔍 VÉRIFICATION DE SÉCURITÉ - RATTRAPER LES EMAILS MANQUÉS
     * Méthode publique pour déclencher manuellement une vérification
     */
    RealTimeEmailNotificationService.prototype.performBackupCheck = function () {
        return __awaiter(this, void 0, void 0, function () {
            var tenMinutesAgo, usersWithMail, _i, usersWithMail_1, emailAccount, userOrg, organizationId, recentEmails, _a, _b, _c, recentEmails_1, email, universalService, error_3;
            var _d, _e, _f, _g;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        _h.trys.push([0, 11, , 12]);
                        tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
                        return [4 /*yield*/, prisma.emailAccount.findMany({
                                where: {
                                    isActive: true,
                                    encryptedPassword: { not: null }
                                },
                                select: {
                                    userId: true
                                },
                                take: 10 // Limite pour la sécurité
                            })];
                    case 1:
                        usersWithMail = _h.sent();
                        _i = 0, usersWithMail_1 = usersWithMail;
                        _h.label = 2;
                    case 2:
                        if (!(_i < usersWithMail_1.length)) return [3 /*break*/, 10];
                        emailAccount = usersWithMail_1[_i];
                        return [4 /*yield*/, prisma.userOrganization.findFirst({
                                where: { userId: emailAccount.userId },
                                select: { organizationId: true }
                            })];
                    case 3:
                        userOrg = _h.sent();
                        if (!userOrg)
                            return [3 /*break*/, 9];
                        organizationId = userOrg.organizationId;
                        _b = (_a = prisma.email).findMany;
                        _d = {};
                        _e = {
                            userId: emailAccount.userId,
                            createdAt: { gte: tenMinutesAgo },
                            folder: { in: ['INBOX', 'inbox'] }
                        };
                        _f = {};
                        _g = {};
                        return [4 /*yield*/, prisma.notification.findMany({
                                where: {
                                    userId: emailAccount.userId,
                                    type: 'NEW_MAIL_RECEIVED',
                                    createdAt: { gte: tenMinutesAgo }
                                },
                                select: { id: true }
                            }).then(function (notifications) { return notifications.map(function (n) { return n.id; }); })];
                    case 4: return [4 /*yield*/, _b.apply(_a, [(_d.where = (
                            // Vérifier qu'il n'y a pas déjà une notification
                            _e.NOT = (_f.id = (_g.in = _h.sent(),
                                _g),
                                _f),
                                _e),
                                _d.orderBy = { createdAt: 'desc' },
                                _d.take = 5,
                                _d)])];
                    case 5:
                        recentEmails = _h.sent();
                        _c = 0, recentEmails_1 = recentEmails;
                        _h.label = 6;
                    case 6:
                        if (!(_c < recentEmails_1.length)) return [3 /*break*/, 9];
                        email = recentEmails_1[_c];
                        universalService = UniversalNotificationService_js_1.default.getInstance();
                        return [4 /*yield*/, universalService.notifyNewEmail({
                                emailId: email.id,
                                from: email.from,
                                subject: email.subject,
                                userId: emailAccount.userId,
                                organizationId: organizationId
                            })];
                    case 7:
                        _h.sent();
                        _h.label = 8;
                    case 8:
                        _c++;
                        return [3 /*break*/, 6];
                    case 9:
                        _i++;
                        return [3 /*break*/, 2];
                    case 10:
                        console.log('✅ [RealTimeEmailNotification] Vérification de sécurité terminée');
                        return [3 /*break*/, 12];
                    case 11:
                        error_3 = _h.sent();
                        console.error('❌ [RealTimeEmailNotification] Erreur vérification de sécurité:', error_3);
                        return [3 /*break*/, 12];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 🚫 FILTRER LES EMAILS À IGNORER
     */
    RealTimeEmailNotificationService.prototype.shouldIgnoreEmail = function (emailData) {
        var ignoredFolders = [
            'SPAM', 'spam', 'Spam',
            'JUNK', 'junk', 'Junk',
            'DRAFTS', 'drafts', 'Drafts', 'Brouillons',
            'SENT', 'sent', 'Sent', 'Envoyés'
        ];
        return ignoredFolders.includes(emailData.folder);
    };
    /**
     * 📧 MÉTHODE PUBLIQUE POUR SIGNALER UN NOUVEL EMAIL
     * À appeler depuis AutoMailSyncService
     */
    RealTimeEmailNotificationService.prototype.notifyNewEmail = function (emailData) {
        this.emit('newEmailReceived', emailData);
    };
    /**
     * 🛑 ARRÊTER LE SERVICE
     */
    RealTimeEmailNotificationService.prototype.stop = function () {
        if (!this.isRunning)
            return;
        console.log('🛑 [RealTimeEmailNotification] Arrêt du service...');
        if (this.backupCheckInterval) {
            clearInterval(this.backupCheckInterval);
        }
        this.removeAllListeners();
        this.isRunning = false;
        console.log('✅ [RealTimeEmailNotification] Service arrêté');
    };
    /**
     * ✂️ UTILITAIRE POUR TRONQUER LES CHAÎNES
     */
    RealTimeEmailNotificationService.prototype.truncateString = function (str, maxLength) {
        if (str.length <= maxLength)
            return str;
        return str.substring(0, maxLength - 3) + '...';
    };
    return RealTimeEmailNotificationService;
}(events_1.EventEmitter));
exports.RealTimeEmailNotificationService = RealTimeEmailNotificationService;
exports.default = RealTimeEmailNotificationService;
