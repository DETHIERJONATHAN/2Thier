"use strict";
/**
 * 🎯 INTÉGRATION DU SYSTÈME DE NOTIFICATIONS DANS LE SERVEUR
 *
 * Ce fichier doit être importé et appelé au démarrage du serveur principal
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
exports.initializeNotificationSystem = initializeNotificationSystem;
exports.shutdownNotificationSystem = shutdownNotificationSystem;
exports.getNotificationSystemStatus = getNotificationSystemStatus;
exports.getNotificationSystemInstance = getNotificationSystemInstance;
var NotificationSystemService_js_1 = __importDefault(require("./NotificationSystemService.js"));
var notificationSystem = null;
/**
 * 🚀 INITIALISER LE SYSTÈME DE NOTIFICATIONS
 * À appeler au démarrage du serveur
 */
function initializeNotificationSystem() {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log('🎯 [INIT] Initialisation du système de notifications...');
                    notificationSystem = NotificationSystemService_js_1.default.getInstance();
                    return [4 /*yield*/, notificationSystem.start()];
                case 1:
                    _a.sent();
                    console.log('✅ [INIT] Système de notifications initialisé avec succès');
                    // Afficher les instructions pour l'utilisateur
                    console.log('\n📋 [NOTIFICATIONS] FONCTIONNALITÉS DISPONIBLES :');
                    console.log('  • 📧 Notifications email temps réel');
                    console.log('  • 👥 Notifications nouveaux leads');
                    console.log('  • 📞 Notifications appels manqués');
                    console.log('  • 📅 Rappels rendez-vous');
                    console.log('  • 💰 Notifications devis/factures');
                    console.log('  • 🔔 Alertes système');
                    console.log('');
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    console.error('❌ [INIT] Erreur initialisation système notifications:', error_1);
                    throw error_1;
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * 🛑 ARRÊTER LE SYSTÈME DE NOTIFICATIONS
 * À appeler à l'arrêt du serveur
 */
function shutdownNotificationSystem() {
    return __awaiter(this, void 0, void 0, function () {
        var error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    if (!notificationSystem) return [3 /*break*/, 2];
                    console.log('🛑 [SHUTDOWN] Arrêt du système de notifications...');
                    return [4 /*yield*/, notificationSystem.stop()];
                case 1:
                    _a.sent();
                    console.log('✅ [SHUTDOWN] Système de notifications arrêté');
                    _a.label = 2;
                case 2: return [3 /*break*/, 4];
                case 3:
                    error_2 = _a.sent();
                    console.error('❌ [SHUTDOWN] Erreur arrêt système notifications:', error_2);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * 📊 OBTENIR LE STATUT DU SYSTÈME
 */
function getNotificationSystemStatus() {
    if (!notificationSystem) {
        return { status: 'not_initialized' };
    }
    return notificationSystem.getStatus();
}
/**
 * 🎯 OBTENIR L'INSTANCE DU SYSTÈME (pour utilisation dans les routes)
 */
function getNotificationSystemInstance() {
    return notificationSystem;
}
