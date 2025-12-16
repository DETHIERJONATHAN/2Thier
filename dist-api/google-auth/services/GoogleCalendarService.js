"use strict";
/**
 * SERVICE GOOGLE CALENDAR - UTILISANT LE MODULE D'AUTHENTIFICATION CENTRALISÉ
 *
 * Ce service utilise exclusivement le GoogleAuthManager pour obtenir les clients authentifiés.
 * Il ne contient AUCUNE logique d'authentification propre.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleCalendarService = exports.GoogleCalendarService = void 0;
var googleapis_1 = require("googleapis");
var index_1 = require("../index");
var GoogleCalendarService = /** @class */ (function () {
    function GoogleCalendarService() {
    }
    GoogleCalendarService.getInstance = function () {
        if (!GoogleCalendarService.instance) {
            GoogleCalendarService.instance = new GoogleCalendarService();
        }
        return GoogleCalendarService.instance;
    };
    /**
     * Obtient une instance de l'API Google Calendar pour une organisation
     */
    GoogleCalendarService.prototype.getCalendarAPI = function (organizationId) {
        return __awaiter(this, void 0, void 0, function () {
            var authClient;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("[GoogleCalendarService] \uD83D\uDCC5 Cr\u00E9ation instance API Calendar pour organisation: ".concat(organizationId));
                        return [4 /*yield*/, index_1.googleAuthManager.getAuthenticatedClient(organizationId)];
                    case 1:
                        authClient = _a.sent();
                        if (!authClient) {
                            throw new Error('Connexion Google non configurée.');
                        }
                        return [2 /*return*/, googleapis_1.google.calendar({ version: 'v3', auth: authClient })];
                }
            });
        });
    };
    /**
     * Récupère les événements du calendrier
     */
    GoogleCalendarService.prototype.getEvents = function (organizationId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function () {
            var calendar, params, response, events, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getCalendarAPI(organizationId)];
                    case 1:
                        calendar = _a.sent();
                        params = {
                            calendarId: 'primary',
                            singleEvents: true,
                            orderBy: 'startTime',
                            maxResults: 100,
                            timeMin: startDate === null || startDate === void 0 ? void 0 : startDate.toISOString(),
                            timeMax: endDate === null || endDate === void 0 ? void 0 : endDate.toISOString(),
                        };
                        return [4 /*yield*/, calendar.events.list(params)];
                    case 2:
                        response = _a.sent();
                        events = response.data.items || [];
                        return [2 /*return*/, events.map(function (event) {
                                var _a, _b, _c, _d, _e, _f, _g;
                                return ({
                                    id: event.id,
                                    summary: event.summary || 'Sans titre',
                                    description: event.description,
                                    start: {
                                        dateTime: ((_a = event.start) === null || _a === void 0 ? void 0 : _a.dateTime) || ((_b = event.start) === null || _b === void 0 ? void 0 : _b.date) || '',
                                        timeZone: (_c = event.start) === null || _c === void 0 ? void 0 : _c.timeZone,
                                    },
                                    end: {
                                        dateTime: ((_d = event.end) === null || _d === void 0 ? void 0 : _d.dateTime) || ((_e = event.end) === null || _e === void 0 ? void 0 : _e.date) || '',
                                        timeZone: (_f = event.end) === null || _f === void 0 ? void 0 : _f.timeZone,
                                    },
                                    attendees: (_g = event.attendees) === null || _g === void 0 ? void 0 : _g.map(function (attendee) { return ({
                                        email: attendee.email || '',
                                        displayName: attendee.displayName,
                                    }); }),
                                });
                            })];
                    case 3:
                        error_1 = _a.sent();
                        console.error('[GoogleCalendarService] ❌ Erreur lors de la récupération des événements:', error_1);
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Crée un nouvel événement
     */
    GoogleCalendarService.prototype.createEvent = function (organizationId, event) {
        return __awaiter(this, void 0, void 0, function () {
            var calendar, response, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getCalendarAPI(organizationId)];
                    case 1:
                        calendar = _a.sent();
                        return [4 /*yield*/, calendar.events.insert({
                                calendarId: 'primary',
                                requestBody: {
                                    summary: event.summary,
                                    description: event.description,
                                    start: event.start,
                                    end: event.end,
                                    attendees: event.attendees,
                                },
                            })];
                    case 2:
                        response = _a.sent();
                        return [2 /*return*/, response.data.id];
                    case 3:
                        error_2 = _a.sent();
                        console.error('[GoogleCalendarService] ❌ Erreur lors de la création de l\'événement:', error_2);
                        throw error_2;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Met à jour un événement existant
     */
    GoogleCalendarService.prototype.updateEvent = function (organizationId, eventId, event) {
        return __awaiter(this, void 0, void 0, function () {
            var calendar, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getCalendarAPI(organizationId)];
                    case 1:
                        calendar = _a.sent();
                        return [4 /*yield*/, calendar.events.update({
                                calendarId: 'primary',
                                eventId: eventId,
                                requestBody: {
                                    summary: event.summary,
                                    description: event.description,
                                    start: event.start,
                                    end: event.end,
                                    attendees: event.attendees,
                                },
                            })];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_3 = _a.sent();
                        console.error('[GoogleCalendarService] ❌ Erreur lors de la mise à jour de l\'événement:', error_3);
                        throw error_3;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Supprime un événement
     */
    GoogleCalendarService.prototype.deleteEvent = function (organizationId, eventId) {
        return __awaiter(this, void 0, void 0, function () {
            var calendar, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getCalendarAPI(organizationId)];
                    case 1:
                        calendar = _a.sent();
                        return [4 /*yield*/, calendar.events.delete({
                                calendarId: 'primary',
                                eventId: eventId,
                            })];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_4 = _a.sent();
                        console.error('[GoogleCalendarService] ❌ Erreur lors de la suppression de l\'événement:', error_4);
                        throw error_4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Synchronise les événements avec Google Calendar
     */
    GoogleCalendarService.prototype.syncEvents = function (organizationId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("[GoogleCalendarService] \uD83D\uDD04 Synchronisation des \u00E9v\u00E9nements pour l'organisation: ".concat(organizationId));
                        console.log("[GoogleCalendarService] \uD83D\uDCC5 P\u00E9riode: ".concat(startDate.toISOString(), " -> ").concat(endDate.toISOString()));
                        return [4 /*yield*/, this.getEvents(organizationId, startDate, endDate)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return GoogleCalendarService;
}());
exports.GoogleCalendarService = GoogleCalendarService;
// Export de l'instance singleton
exports.googleCalendarService = GoogleCalendarService.getInstance();
