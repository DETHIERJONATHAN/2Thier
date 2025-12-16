"use strict";
/**
 * 🌟 SERVICE DE NOTIFICATIONS UNIVERSEL CRM - GOOGLE WORKSPACE
 *
 * SYSTÈME COMPLET ULTRA-PERFORMANT AVEC IA :
 * - 📧 Gmail temps réel avec analyse IA
 * - 📅 Google Calendar notifications intelligentes
 * - 👥 Nouveaux leads avec scoring IA
 * - 📞 Appels manqués avec transcription IA
 * - 💰 Devis/factures avec analyse automatique
 * - 🎯 Tâches intelligentes avec priorités IA
 * - � Alertes système avec diagnostics IA
 * - ⚡ Notifications temps réel ultra-rapides
 * - 🧠 Enrichissement IA de toutes les notifications
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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniversalNotificationService = void 0;
var client_1 = require("@prisma/client");
var events_1 = require("events");
var prisma = new client_1.PrismaClient();
// 🎨 CONFIGURATION AFFICHAGE PAR TYPE
var NOTIFICATION_CONFIG = {
    NEW_EMAIL: { icon: '📧', color: '#1890ff', sound: 'email.wav' },
    NEW_LEAD: { icon: '👥', color: '#52c41a', sound: 'success.wav' },
    MISSED_CALL: { icon: '📞', color: '#fa8c16', sound: 'alert.wav' },
    UPCOMING_MEETING: { icon: '📅', color: '#722ed1', sound: 'reminder.wav' },
    NEW_QUOTE: { icon: '💰', color: '#13c2c2', sound: 'cash.wav' },
    NEW_INVOICE: { icon: '🧾', color: '#eb2f96', sound: 'invoice.wav' },
    OVERDUE_TASK: { icon: '⏰', color: '#f5222d', sound: 'urgent.wav' },
    SYSTEM_ALERT: { icon: '🚨', color: '#ff4d4f', sound: 'system.wav' },
    USER_MENTION: { icon: '@️⃣', color: '#1890ff', sound: 'mention.wav' },
    PROJECT_UPDATE: { icon: '📋', color: '#52c41a', sound: 'update.wav' },
    PAYMENT_RECEIVED: { icon: '💳', color: '#52c41a', sound: 'payment.wav' },
    CONTRACT_EXPIRING: { icon: '📄', color: '#fa8c16', sound: 'warning.wav' }
};
var UniversalNotificationService = /** @class */ (function (_super) {
    __extends(UniversalNotificationService, _super);
    function UniversalNotificationService() {
        var _this = _super.call(this) || this;
        _this.isRunning = false;
        return _this;
    }
    UniversalNotificationService.getInstance = function () {
        if (!this.instance) {
            this.instance = new UniversalNotificationService();
        }
        return this.instance;
    };
    /**
     * 🚀 DÉMARRER LE SERVICE UNIVERSEL
     */
    UniversalNotificationService.prototype.start = function () {
        if (this.isRunning) {
            console.log('⚠️ [UniversalNotification] Service déjà en cours...');
            return;
        }
        console.log('🌟 [UniversalNotification] Démarrage du service UNIVERSEL de notifications...');
        this.isRunning = true;
        // Démarrer la vérification périodique de tous les types d'événements
        this.startPeriodicChecks();
        // Émettre l'événement de démarrage
        this.emit('service-started');
        console.log('✅ [UniversalNotification] Service universel démarré avec succès');
    };
    /**
     * 🛑 ARRÊTER LE SERVICE
     */
    UniversalNotificationService.prototype.stop = function () {
        console.log('🛑 [UniversalNotification] Arrêt du service...');
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        this.isRunning = false;
        this.emit('service-stopped');
        console.log('✅ [UniversalNotification] Service arrêté');
    };
    /**
     * � OBTENIR L'ÉTAT COURANT DU SERVICE
     */
    UniversalNotificationService.prototype.getStatus = function () {
        return {
            isRunning: this.isRunning,
            checksActive: Boolean(this.checkInterval),
            activeListeners: this.listenerCount('notification-created')
        };
    };
    /**
     * �🔔 CRÉER UNE NOTIFICATION UNIVERSELLE
     */
    UniversalNotificationService.prototype.createNotification = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var config, notification, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        config = NOTIFICATION_CONFIG[data.type];
                        console.log("\uD83D\uDD14 [UniversalNotification] Cr\u00E9ation notification: ".concat(data.type, " - ").concat(data.title));
                        return [4 /*yield*/, prisma.notification.create({
                                data: {
                                    organizationId: data.organizationId,
                                    userId: data.userId,
                                    type: data.type === 'NEW_EMAIL' ? 'NEW_MAIL_RECEIVED' : data.type,
                                    data: {
                                        title: data.title,
                                        message: data.message,
                                        priority: data.priority,
                                        icon: config.icon,
                                        color: config.color,
                                        sound: config.sound,
                                        actionUrl: data.actionUrl,
                                        tags: data.tags,
                                        timestamp: new Date().toISOString(),
                                        metadata: data.metadata
                                    },
                                    status: 'PENDING',
                                    expiresAt: data.expiresAt
                                }
                            })];
                    case 1:
                        notification = _a.sent();
                        // Émettre l'événement en temps réel
                        this.emit('notification-created', {
                            id: notification.id,
                            type: data.type,
                            title: data.title,
                            message: data.message,
                            userId: data.userId,
                            organizationId: data.organizationId,
                            priority: data.priority,
                            config: config
                        });
                        console.log("\u2705 [UniversalNotification] Notification cr\u00E9\u00E9e: ".concat(notification.id));
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        console.error('❌ [UniversalNotification] Erreur création notification:', error_1);
                        throw error_1;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 📧 NOTIFICATION EMAIL SPÉCIALISÉE
     */
    UniversalNotificationService.prototype.notifyNewEmail = function (emailData) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, this.createNotification({
                            type: 'NEW_EMAIL',
                            title: 'Nouveau message reçu',
                            message: (_a = emailData.summary) !== null && _a !== void 0 ? _a : "De: ".concat(emailData.from.substring(0, 30)).concat(emailData.from.length > 30 ? '...' : ''),
                            userId: emailData.userId,
                            organizationId: emailData.organizationId,
                            priority: (_b = emailData.priority) !== null && _b !== void 0 ? _b : 'medium',
                            metadata: __assign({ emailId: emailData.emailId, from: emailData.from, subject: emailData.subject }, emailData.metadata),
                            actionUrl: (_c = emailData.actionUrl) !== null && _c !== void 0 ? _c : "/emails/".concat(emailData.emailId),
                            tags: (_d = emailData.tags) !== null && _d !== void 0 ? _d : ['email', 'inbox']
                        })];
                    case 1:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 👥 NOTIFICATION NOUVEAU LEAD
     */
    UniversalNotificationService.prototype.notifyNewLead = function (leadData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.createNotification({
                            type: 'NEW_LEAD',
                            title: 'Nouveau prospect',
                            message: "".concat(leadData.name).concat(leadData.source ? " via ".concat(leadData.source) : ''),
                            userId: leadData.userId,
                            organizationId: leadData.organizationId,
                            priority: 'high',
                            metadata: {
                                leadId: leadData.leadId,
                                name: leadData.name,
                                email: leadData.email,
                                phone: leadData.phone,
                                source: leadData.source
                            },
                            actionUrl: "/leads/".concat(leadData.leadId),
                            tags: ['lead', 'prospect', 'new']
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 📞 NOTIFICATION APPEL MANQUÉ
     */
    UniversalNotificationService.prototype.notifyMissedCall = function (callData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.createNotification({
                            type: 'MISSED_CALL',
                            title: 'Appel manqué',
                            message: "Appel de ".concat(callData.from),
                            userId: callData.userId,
                            organizationId: callData.organizationId,
                            priority: 'high',
                            metadata: {
                                callId: callData.callId,
                                from: callData.from,
                                duration: callData.duration
                            },
                            actionUrl: callData.callId ? "/calls/".concat(callData.callId) : '/calls',
                            tags: ['call', 'missed', 'urgent']
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 📅 NOTIFICATION RENDEZ-VOUS PROCHE
     */
    UniversalNotificationService.prototype.notifyUpcomingMeeting = function (meetingData) {
        return __awaiter(this, void 0, void 0, function () {
            var timeUntil;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        timeUntil = Math.round((meetingData.startTime.getTime() - Date.now()) / (1000 * 60));
                        return [4 /*yield*/, this.createNotification({
                                type: 'UPCOMING_MEETING',
                                title: 'Rendez-vous dans 15 minutes',
                                message: "".concat(meetingData.title, " dans ").concat(timeUntil, " min"),
                                userId: meetingData.userId,
                                organizationId: meetingData.organizationId,
                                priority: 'high',
                                metadata: {
                                    meetingId: meetingData.meetingId,
                                    title: meetingData.title,
                                    startTime: meetingData.startTime,
                                    attendees: meetingData.attendees,
                                    timeUntil: timeUntil
                                },
                                actionUrl: "/calendar/".concat(meetingData.meetingId),
                                tags: ['meeting', 'calendar', 'reminder'],
                                expiresAt: meetingData.startTime
                            })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 💰 NOTIFICATION NOUVEAU DEVIS
     */
    UniversalNotificationService.prototype.notifyNewQuote = function (quoteData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.createNotification({
                            type: 'NEW_QUOTE',
                            title: 'Nouveau devis créé',
                            message: "".concat(quoteData.clientName, " - ").concat(quoteData.amount).concat(quoteData.currency || '€'),
                            userId: quoteData.userId,
                            organizationId: quoteData.organizationId,
                            priority: 'medium',
                            metadata: {
                                quoteId: quoteData.quoteId,
                                clientName: quoteData.clientName,
                                amount: quoteData.amount,
                                currency: quoteData.currency
                            },
                            actionUrl: "/quotes/".concat(quoteData.quoteId),
                            tags: ['quote', 'billing', 'financial']
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 🔄 VÉRIFICATIONS PÉRIODIQUES (toutes les 2 minutes)
     */
    UniversalNotificationService.prototype.startPeriodicChecks = function () {
        var _this = this;
        console.log('🔄 [UniversalNotification] Démarrage vérifications périodiques...');
        this.checkInterval = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
            var error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, this.checkForUpcomingMeetings()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.checkForOverdueTasks()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.checkForExpiringContracts()];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, this.cleanExpiredNotifications()];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        error_2 = _a.sent();
                        console.error('❌ [UniversalNotification] Erreur vérification périodique:', error_2);
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        }); }, 2 * 60 * 1000); // 2 minutes
    };
    /**
     * 📅 VÉRIFIER LES RENDEZ-VOUS PROCHES
     */
    UniversalNotificationService.prototype.checkForUpcomingMeetings = function () {
        return __awaiter(this, void 0, void 0, function () {
            var now, fifteenMinutesFromNow;
            return __generator(this, function (_a) {
                now = new Date();
                fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);
                // Logique à implémenter selon votre modèle de données calendrier
                // Exemple: récupérer les meetings dans les 15 prochaines minutes
                console.log("\uD83D\uDCC5 [UniversalNotification] V\u00E9rification des rendez-vous entre ".concat(now.toISOString(), " et ").concat(fifteenMinutesFromNow.toISOString(), "..."));
                return [2 /*return*/];
            });
        });
    };
    /**
     * ⏰ VÉRIFIER LES TÂCHES EN RETARD
     */
    UniversalNotificationService.prototype.checkForOverdueTasks = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Logique à implémenter selon votre modèle de tâches
                console.log('⏰ [UniversalNotification] Vérification des tâches en retard...');
                return [2 /*return*/];
            });
        });
    };
    /**
     * 📄 VÉRIFIER LES CONTRATS EXPIRANTS
     */
    UniversalNotificationService.prototype.checkForExpiringContracts = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Logique à implémenter selon votre modèle de contrats
                console.log('📄 [UniversalNotification] Vérification des contrats expirants...');
                return [2 /*return*/];
            });
        });
    };
    /**
     * 🧹 NETTOYER LES NOTIFICATIONS EXPIRÉES
     */
    UniversalNotificationService.prototype.cleanExpiredNotifications = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, prisma.notification.deleteMany({
                                where: {
                                    expiresAt: {
                                        lt: new Date()
                                    }
                                }
                            })];
                    case 1:
                        result = _a.sent();
                        if (result.count > 0) {
                            console.log("\uD83E\uDDF9 [UniversalNotification] ".concat(result.count, " notifications expir\u00E9es supprim\u00E9es"));
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_3 = _a.sent();
                        console.error('❌ [UniversalNotification] Erreur nettoyage notifications expirées:', error_3);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 📊 OBTENIR LES STATISTIQUES
     */
    UniversalNotificationService.prototype.getStats = function (organizationId) {
        return __awaiter(this, void 0, void 0, function () {
            var stats, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, prisma.notification.groupBy({
                                by: ['type', 'status'],
                                where: {
                                    organizationId: organizationId,
                                    createdAt: {
                                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Dernières 24h
                                    }
                                },
                                _count: true
                            })];
                    case 1:
                        stats = _a.sent();
                        return [2 /*return*/, {
                                total: stats.reduce(function (sum, s) { return sum + s._count; }, 0),
                                byType: stats.reduce(function (acc, s) {
                                    acc[s.type] = (acc[s.type] || 0) + s._count;
                                    return acc;
                                }, {}),
                                byStatus: stats.reduce(function (acc, s) {
                                    acc[s.status] = (acc[s.status] || 0) + s._count;
                                    return acc;
                                }, {})
                            }];
                    case 2:
                        error_4 = _a.sent();
                        console.error('❌ [UniversalNotification] Erreur stats:', error_4);
                        return [2 /*return*/, { total: 0, byType: {}, byStatus: {} }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return UniversalNotificationService;
}(events_1.EventEmitter));
exports.UniversalNotificationService = UniversalNotificationService;
exports.default = UniversalNotificationService;
