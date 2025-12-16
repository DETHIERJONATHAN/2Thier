"use strict";
/**
 * 🚀 SERVICE D'INITIALISATION DU SYSTÈME DE NOTIFICATIONS COMPLET
 *
 * Ce service démarre et coordonne tous les services de notifications :
 * - UniversalNotificationService (notifications tous types)
 * - RealTimeEmailNotificationService (emails temps réel)
 * - AutoMailSyncService (synchronisation emails)
 */
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
exports.NotificationSystemService = void 0;
var UniversalNotificationService_js_1 = __importDefault(require("./UniversalNotificationService.js"));
var RealTimeEmailNotificationService_js_1 = __importDefault(require("./RealTimeEmailNotificationService.js"));
var AutoMailSyncService_js_1 = require("./AutoMailSyncService.js");
var NotificationSystemService = /** @class */ (function () {
    function NotificationSystemService() {
        this.isStarted = false;
    }
    NotificationSystemService.getInstance = function () {
        if (!this.instance) {
            this.instance = new NotificationSystemService();
        }
        return this.instance;
    };
    /**
     * 🚀 DÉMARRER TOUT LE SYSTÈME DE NOTIFICATIONS
     */
    NotificationSystemService.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var universalService, emailNotificationService, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.isStarted) {
                            console.log('⚠️ [NotificationSystem] Système déjà démarré');
                            return [2 /*return*/];
                        }
                        console.log('🌟 [NotificationSystem] Démarrage du système de notifications complet...');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        // 1. 🌟 Démarrer le service universel
                        console.log('1️⃣ [NotificationSystem] Démarrage UniversalNotificationService...');
                        universalService = UniversalNotificationService_js_1.default.getInstance();
                        universalService.start();
                        // 2. 📧 Démarrer le service de notifications email temps réel
                        console.log('2️⃣ [NotificationSystem] Démarrage RealTimeEmailNotificationService...');
                        emailNotificationService = RealTimeEmailNotificationService_js_1.default.getInstance();
                        emailNotificationService.start();
                        // 3. 🔄 Démarrer la synchronisation email automatique
                        console.log('3️⃣ [NotificationSystem] Démarrage AutoMailSyncService...');
                        return [4 /*yield*/, AutoMailSyncService_js_1.autoMailSync.start()];
                    case 2:
                        _a.sent();
                        // 4. 🔗 Connecter les services entre eux
                        this.setupServiceConnections();
                        this.isStarted = true;
                        console.log('✅ [NotificationSystem] Système de notifications complet démarré avec succès !');
                        // 5. 📊 Afficher le statut
                        this.logSystemStatus();
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        console.error('❌ [NotificationSystem] Erreur lors du démarrage:', error_1);
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 🔗 CONNECTER LES SERVICES ENTRE EUX
     */
    NotificationSystemService.prototype.setupServiceConnections = function () {
        console.log('🔗 [NotificationSystem] Configuration des connexions inter-services...');
        // Écouter les événements de nouveaux emails depuis AutoMailSyncService
        var emailNotificationService = RealTimeEmailNotificationService_js_1.default.getInstance();
        // Quand AutoMailSyncService trouve un nouveau email, déclencher une notification
        AutoMailSyncService_js_1.autoMailSync.on('newEmailFound', function (emailData) {
            console.log('🎯 [NotificationSystem] Nouvel email détecté, création notification...');
            emailNotificationService.notifyNewEmail(emailData);
        });
        console.log('✅ [NotificationSystem] Connexions inter-services configurées');
    };
    /**
     * 📊 AFFICHER LE STATUT DU SYSTÈME
     */
    NotificationSystemService.prototype.logSystemStatus = function () {
        console.log('\n🎯 [NotificationSystem] STATUT DU SYSTÈME :');
        console.log('='.repeat(50));
        console.log('✅ UniversalNotificationService : ACTIF');
        console.log('✅ RealTimeEmailNotificationService : ACTIF');
        console.log('✅ AutoMailSyncService : ACTIF');
        console.log('✅ Connexions inter-services : CONFIGURÉES');
        console.log('='.repeat(50));
        console.log('🔔 Le système de notifications est opérationnel !\n');
    };
    /**
     * 🛑 ARRÊTER TOUT LE SYSTÈME
     */
    NotificationSystemService.prototype.stop = function () {
        return __awaiter(this, void 0, void 0, function () {
            var universalService, emailNotificationService, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.isStarted) {
                            console.log('⚠️ [NotificationSystem] Système déjà arrêté');
                            return [2 /*return*/];
                        }
                        console.log('🛑 [NotificationSystem] Arrêt du système de notifications...');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        universalService = UniversalNotificationService_js_1.default.getInstance();
                        universalService.stop();
                        emailNotificationService = RealTimeEmailNotificationService_js_1.default.getInstance();
                        emailNotificationService.stop();
                        return [4 /*yield*/, AutoMailSyncService_js_1.autoMailSync.stop()];
                    case 2:
                        _a.sent();
                        this.isStarted = false;
                        console.log('✅ [NotificationSystem] Système de notifications arrêté');
                        return [3 /*break*/, 4];
                    case 3:
                        error_2 = _a.sent();
                        console.error('❌ [NotificationSystem] Erreur lors de l\'arrêt:', error_2);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 📋 OBTENIR LE STATUT DU SYSTÈME
     */
    NotificationSystemService.prototype.getStatus = function () {
        return {
            isStarted: this.isStarted,
            services: {
                universal: this.isStarted,
                emailRealTime: this.isStarted,
                autoSync: this.isStarted
            },
            startedAt: this.isStarted ? new Date().toISOString() : null
        };
    };
    return NotificationSystemService;
}());
exports.NotificationSystemService = NotificationSystemService;
exports.default = NotificationSystemService;
