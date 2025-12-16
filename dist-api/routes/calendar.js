"use strict";
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var client_1 = require("@prisma/client");
var auth_js_1 = require("../middlewares/auth.js");
var impersonation_js_1 = require("../middlewares/impersonation.js");
var GoogleCalendarService_js_1 = require("../google-auth/services/GoogleCalendarService.js");
var router = (0, express_1.Router)();
// Logging global minimal pour diagnostiquer les requêtes qui n'atteignent pas les handlers spécifiques
router.use(function (req, _res, next) {
    try {
        var hasUser = Boolean(req.user);
        console.log("[CALENDAR ROUTES][TRACE] ".concat(req.method, " ").concat(req.originalUrl, " avant middlewares sp\u00E9cifiques - user?"), hasUser);
    }
    catch (e) {
        console.warn('[CALENDAR ROUTES][TRACE] logging pré-middleware échoué', e);
    }
    next();
});
var prisma = new client_1.PrismaClient();
var sseClients = [];
function broadcast(orgId, event, payload) {
    var data = "event: ".concat(event, "\ndata: ").concat(JSON.stringify(payload), "\n\n");
    sseClients.filter(function (c) { return c.organizationId === orgId; }).forEach(function (c) { return c.res.write(data); });
}
// Protège le flux SSE en exigeant l'auth une fois authMiddleware appliqué (voir déplacement plus bas)
function initSSE(req, res) {
    var _a;
    if (!req.user) {
        console.log('[CALENDAR ROUTES][SSE] ❌ Rejet connexion SSE: pas de user');
        return res.status(401).end();
    }
    // Permettre query ?organizationId=... comme fallback pour super_admin (ex: quand req.user.organizationId est null)
    var organizationId = req.user.organizationId;
    if (!organizationId && req.query.organizationId && req.user.role === 'super_admin') {
        organizationId = String(req.query.organizationId);
        console.log('[CALENDAR ROUTES][SSE] ⚙️ Fallback organizationId depuis query pour super_admin:', organizationId);
    }
    if (!organizationId) {
        console.log('[CALENDAR ROUTES][SSE] ❌ Aucun organizationId déterminé');
        return res.status(400).json({ error: 'organizationId manquant pour SSE' });
    }
    console.log('[CALENDAR ROUTES][SSE] ✅ Connexion SSE acceptée pour org', organizationId);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    (_a = res.flushHeaders) === null || _a === void 0 ? void 0 : _a.call(res);
    var clientId = Date.now().toString() + Math.random();
    sseClients.push({ id: clientId, res: res, organizationId: organizationId });
    res.write("event: connected\ndata: {\"clientId\":\"".concat(clientId, "\"}\n\n"));
    req.on('close', function () {
        var idx = sseClients.findIndex(function (c) { return c.id === clientId; });
        if (idx !== -1)
            sseClients.splice(idx, 1);
    });
}
// Ajouter le middleware d'authentification AVANT d'exposer /stream pour qu'EventSource bénéficie de req.user
router.use(auth_js_1.authMiddleware, impersonation_js_1.impersonationMiddleware);
router.get('/stream', function (req, res) {
    initSSE(req, res);
});
// (Les autres routes sont déjà protégées car le use() précédent est placé avant leur déclaration)
// GET /api/calendar/events - Récupérer les événements de l'utilisateur
router.get('/events', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, userId, startDate, endDate, forceSync, userIdToSearch, organizationId, whereClause, events, todayStart_1, notesToCarry, _i, notesToCarry_1, n, carryErr_1, needSync, syncStart, syncEnd, googleEvents, _b, googleEvents_1, gEvent, gId, existing, baseData, syncError_1, error_1;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 23, , 24]);
                console.log('[CALENDAR ROUTES] GET /events - Début de la requête');
                _a = req.query, userId = _a.userId, startDate = _a.startDate, endDate = _a.endDate, forceSync = _a.forceSync;
                userIdToSearch = userId || req.user.userId;
                organizationId = req.user.organizationId;
                whereClause = {
                    organizationId: organizationId,
                    OR: [
                        { ownerId: userIdToSearch },
                        { participants: { some: { userId: userIdToSearch } } }
                    ]
                };
                if (startDate && endDate) {
                    whereClause.startDate = { gte: new Date(startDate), lte: new Date(endDate) };
                }
                return [4 /*yield*/, prisma.calendarEvent.findMany({
                        where: whereClause,
                        include: {
                            participants: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
                            owner: { select: { id: true, firstName: true, lastName: true, email: true } }
                        },
                        orderBy: { startDate: 'asc' }
                    })];
            case 1:
                events = _e.sent();
                console.log('[CALENDAR ROUTES] Événements locaux trouvés:', events.length);
                _e.label = 2;
            case 2:
                _e.trys.push([2, 9, , 10]);
                todayStart_1 = new Date();
                todayStart_1.setHours(0, 0, 0, 0);
                notesToCarry = events.filter(function (e) { return e.type === 'note' && e.status !== 'done' && e.startDate < todayStart_1 && (!e.dueDate || e.dueDate >= todayStart_1); });
                if (!notesToCarry.length) return [3 /*break*/, 8];
                console.log('[CALENDAR ROUTES] 🔁 Report automatique de', notesToCarry.length, 'notes non terminées');
                _i = 0, notesToCarry_1 = notesToCarry;
                _e.label = 3;
            case 3:
                if (!(_i < notesToCarry_1.length)) return [3 /*break*/, 6];
                n = notesToCarry_1[_i];
                return [4 /*yield*/, prisma.calendarEvent.update({
                        where: { id: n.id },
                        data: {
                            startDate: todayStart_1,
                            endDate: null, // allDay; pas nécessaire
                            allDay: true
                        }
                    })];
            case 4:
                _e.sent();
                _e.label = 5;
            case 5:
                _i++;
                return [3 /*break*/, 3];
            case 6: return [4 /*yield*/, prisma.calendarEvent.findMany({
                    where: whereClause,
                    include: {
                        participants: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
                        owner: { select: { id: true, firstName: true, lastName: true, email: true } }
                    },
                    orderBy: { startDate: 'asc' }
                })];
            case 7:
                // Recharger après report
                events = _e.sent();
                _e.label = 8;
            case 8: return [3 /*break*/, 10];
            case 9:
                carryErr_1 = _e.sent();
                console.warn('[CALENDAR ROUTES] ⚠️ Erreur report notes:', carryErr_1);
                return [3 /*break*/, 10];
            case 10:
                needSync = forceSync === 'true' || events.length === 0;
                if (!needSync) return [3 /*break*/, 22];
                console.log('[CALENDAR ROUTES] 🔄 Lancement auto-sync Google Calendar (needSync=', needSync, ')');
                _e.label = 11;
            case 11:
                _e.trys.push([11, 21, , 22]);
                syncStart = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 3600 * 1000);
                syncEnd = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 3600 * 1000);
                return [4 /*yield*/, GoogleCalendarService_js_1.googleCalendarService.syncEvents(organizationId, syncStart, syncEnd)];
            case 12:
                googleEvents = _e.sent();
                console.log('[CALENDAR ROUTES] Google events récupérés:', googleEvents.length);
                _b = 0, googleEvents_1 = googleEvents;
                _e.label = 13;
            case 13:
                if (!(_b < googleEvents_1.length)) return [3 /*break*/, 19];
                gEvent = googleEvents_1[_b];
                gId = gEvent.id;
                if (!gId || !((_c = gEvent.start) === null || _c === void 0 ? void 0 : _c.dateTime) || !((_d = gEvent.end) === null || _d === void 0 ? void 0 : _d.dateTime))
                    return [3 /*break*/, 18];
                return [4 /*yield*/, prisma.calendarEvent.findFirst({
                        where: { organizationId: organizationId, googleEventId: gId }
                    })];
            case 14:
                existing = _e.sent();
                baseData = {
                    title: gEvent.summary || 'Sans titre',
                    description: gEvent.description || null,
                    startDate: new Date(gEvent.start.dateTime),
                    endDate: new Date(gEvent.end.dateTime),
                    type: 'google_sync',
                    status: 'synced',
                    organizationId: organizationId,
                    ownerId: userIdToSearch,
                    googleEventId: gId
                };
                if (!existing) return [3 /*break*/, 16];
                return [4 /*yield*/, prisma.calendarEvent.update({ where: { id: existing.id }, data: baseData })];
            case 15:
                _e.sent();
                return [3 /*break*/, 18];
            case 16: return [4 /*yield*/, prisma.calendarEvent.create({ data: baseData })];
            case 17:
                _e.sent();
                _e.label = 18;
            case 18:
                _b++;
                return [3 /*break*/, 13];
            case 19: return [4 /*yield*/, prisma.calendarEvent.findMany({
                    where: whereClause,
                    include: {
                        participants: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
                        owner: { select: { id: true, firstName: true, lastName: true, email: true } }
                    },
                    orderBy: { startDate: 'asc' }
                })];
            case 20:
                // Recharger après sync
                events = _e.sent();
                console.log('[CALENDAR ROUTES] Événements après auto-sync:', events.length);
                return [3 /*break*/, 22];
            case 21:
                syncError_1 = _e.sent();
                console.warn('[CALENDAR ROUTES] ⚠️ Auto-sync échouée (les événements locaux restent affichés):', syncError_1);
                return [3 /*break*/, 22];
            case 22: return [2 /*return*/, res.json(events)];
            case 23:
                error_1 = _e.sent();
                console.error('Erreur récupération événements:', error_1);
                return [2 /*return*/, res.status(500).json({ error: 'Erreur serveur' })];
            case 24: return [2 /*return*/];
        }
    });
}); });
// GET /api/calendar/ai-suggestions?leadId=...&days=5
// Génère des créneaux intelligents basés sur : disponibilité calendrier, fraîcheur du lead, dernier contact.
router.get('/ai-suggestions', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var leadId, organizationId, lead, horizonDays, now, horizon, events_1, isBusy, candidateHours, suggestions, d, day, _i, candidateHours_1, h, hour, minutes, slotStart, slotEnd, busy, score, reasons, within48h, daysSinceLast, diff, type, filtered, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                leadId = req.query.leadId;
                organizationId = req.user.organizationId;
                if (!leadId) {
                    return [2 /*return*/, res.status(400).json({ error: 'Paramètre leadId requis' })];
                }
                return [4 /*yield*/, prisma.lead.findFirst({
                        where: { id: leadId, organizationId: organizationId },
                        select: { id: true, firstName: true, lastName: true, lastContactDate: true, nextFollowUpDate: true, status: true, createdAt: true }
                    })];
            case 1:
                lead = _a.sent();
                if (!lead)
                    return [2 /*return*/, res.status(404).json({ error: 'Lead introuvable' })];
                horizonDays = 5;
                now = new Date();
                horizon = new Date();
                horizon.setDate(horizon.getDate() + horizonDays);
                return [4 /*yield*/, prisma.calendarEvent.findMany({
                        where: {
                            organizationId: organizationId,
                            startDate: { gte: now, lte: horizon }
                        },
                        select: { id: true, startDate: true, endDate: true, title: true }
                    })];
            case 2:
                events_1 = _a.sent();
                isBusy = function (slotStart, slotEnd) {
                    return events_1.some(function (ev) {
                        var evStart = ev.startDate;
                        var evEnd = ev.endDate || new Date(ev.startDate.getTime() + 30 * 60000);
                        return evStart < slotEnd && evEnd > slotStart; // overlap
                    });
                };
                candidateHours = [9, 9.5, 10, 10.5, 11, 14, 14.5, 15, 15.5, 16];
                suggestions = [];
                for (d = 0; d < horizonDays; d++) {
                    day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, 0, 0, 0, 0);
                    for (_i = 0, candidateHours_1 = candidateHours; _i < candidateHours_1.length; _i++) {
                        h = candidateHours_1[_i];
                        hour = Math.floor(h);
                        minutes = h % 1 ? 30 : 0;
                        slotStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minutes, 0, 0);
                        // Ignore passé
                        if (slotStart < now)
                            continue;
                        slotEnd = new Date(slotStart.getTime() + 30 * 60000);
                        busy = isBusy(slotStart, slotEnd);
                        score = 50;
                        reasons = [];
                        if (!busy) {
                            score += 15;
                            reasons.push('Créneau libre');
                        }
                        else {
                            score -= 25;
                            reasons.push('Conflit calendrier');
                        }
                        within48h = slotStart.getTime() - now.getTime() <= 48 * 3600 * 1000;
                        if (within48h) {
                            score += 10;
                            reasons.push('Suivi rapide (<48h)');
                        }
                        // Matin productif
                        if (hour >= 9 && hour <= 11) {
                            score += 5;
                            reasons.push('Matin propice');
                        }
                        // Après-midi focus
                        if (hour >= 14 && hour <= 16 && !within48h) {
                            score += 3;
                            reasons.push('Créneau stable');
                        }
                        // Dernier contact > 5 jours => augmenter priorité
                        if (lead.lastContactDate) {
                            daysSinceLast = (now.getTime() - new Date(lead.lastContactDate).getTime()) / 86400000;
                            if (daysSinceLast > 5) {
                                score += 7;
                                reasons.push('Relance nécessaire');
                            }
                        }
                        else {
                            score += 6;
                            reasons.push('Aucun contact préalable');
                        }
                        // Proximité nextFollowUpDate
                        if (lead.nextFollowUpDate) {
                            diff = Math.abs(new Date(lead.nextFollowUpDate).getTime() - slotStart.getTime()) / 86400000;
                            if (diff <= 1.5) {
                                score += 8;
                                reasons.push('Aligné à la prochaine relance');
                            }
                        }
                        // Normalisation
                        if (score > 100)
                            score = 100;
                        if (score < 0)
                            score = 0;
                        type = score >= 85 ? 'best' : score >= 70 ? 'good' : 'ok';
                        suggestions.push({
                            date: slotStart.toISOString(),
                            endDate: slotEnd.toISOString(),
                            score: score,
                            type: type,
                            reason: reasons.join(' · '),
                            evidence: {
                                busy: busy,
                                within48h: within48h,
                                lastContactDate: lead.lastContactDate,
                                nextFollowUpDate: lead.nextFollowUpDate
                            }
                        });
                    }
                }
                filtered = suggestions.filter(function (s) { return s.score >= 55; }).sort(function (a, b) { return b.score - a.score; }).slice(0, 25);
                res.json({ success: true, data: filtered });
                return [3 /*break*/, 4];
            case 3:
                error_2 = _a.sent();
                console.error('[CALENDAR ROUTES] Erreur ai-suggestions:', error_2);
                res.status(500).json({ error: 'Erreur génération suggestions' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// POST /api/calendar/sync - Synchroniser avec Google Calendar
router.post('/sync', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, organizationId, _a, startDate, endDate, googleEvents, createdCount, updatedCount, _i, googleEvents_2, gEvent, existingEvent, _b, eventData, error_3;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 11, , 12]);
                userId = req.user.userId;
                organizationId = req.user.organizationId;
                _a = req.body, startDate = _a.startDate, endDate = _a.endDate;
                return [4 /*yield*/, GoogleCalendarService_js_1.googleCalendarService.syncEvents(organizationId, new Date(startDate), new Date(endDate))];
            case 1:
                googleEvents = _e.sent();
                createdCount = 0;
                updatedCount = 0;
                _i = 0, googleEvents_2 = googleEvents;
                _e.label = 2;
            case 2:
                if (!(_i < googleEvents_2.length)) return [3 /*break*/, 10];
                gEvent = googleEvents_2[_i];
                if (!((_c = gEvent.start) === null || _c === void 0 ? void 0 : _c.dateTime) || !((_d = gEvent.end) === null || _d === void 0 ? void 0 : _d.dateTime))
                    return [3 /*break*/, 9];
                if (!gEvent.id) return [3 /*break*/, 4];
                return [4 /*yield*/, prisma.calendarEvent.findFirst({
                        where: { organizationId: organizationId, googleEventId: gEvent.id }
                    })];
            case 3:
                _b = _e.sent();
                return [3 /*break*/, 5];
            case 4:
                _b = null;
                _e.label = 5;
            case 5:
                existingEvent = _b;
                eventData = {
                    title: gEvent.summary || 'Sans titre',
                    description: gEvent.description || null,
                    startDate: new Date(gEvent.start.dateTime),
                    endDate: new Date(gEvent.end.dateTime),
                    type: 'google_sync',
                    status: 'synced',
                    organizationId: organizationId,
                    ownerId: userId,
                    googleEventId: gEvent.id || null,
                };
                if (!existingEvent) return [3 /*break*/, 7];
                return [4 /*yield*/, prisma.calendarEvent.update({ where: { id: existingEvent.id }, data: eventData })];
            case 6:
                _e.sent();
                updatedCount++;
                return [3 /*break*/, 9];
            case 7: return [4 /*yield*/, prisma.calendarEvent.create({ data: eventData })];
            case 8:
                _e.sent();
                createdCount++;
                _e.label = 9;
            case 9:
                _i++;
                return [3 /*break*/, 2];
            case 10:
                res.json({ message: 'Synchronisation terminée.', created: createdCount, updated: updatedCount });
                return [3 /*break*/, 12];
            case 11:
                error_3 = _e.sent();
                console.error('Erreur de synchronisation Google Calendar:', error_3);
                res.status(500).json({ error: 'Erreur lors de la synchronisation.' });
                return [3 /*break*/, 12];
            case 12: return [2 /*return*/];
        }
    });
}); });
// POST /api/calendar/events - Créer un nouvel événement
router.post('/events', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var eventData, userId, organizationId, prismaData, event_1, googleEventData, googleEventId, updatedEvent, googleError_1, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 7, , 8]);
                console.log('[CALENDAR ROUTES] POST /events - Début création événement');
                console.log('[CALENDAR ROUTES] Body:', req.body);
                console.log('[CALENDAR ROUTES] User:', req.user);
                eventData = req.body;
                userId = req.user.userId;
                organizationId = req.user.organizationId;
                console.log('[CALENDAR ROUTES] userId:', userId);
                console.log('[CALENDAR ROUTES] organizationId:', organizationId);
                console.log('[CALENDAR ROUTES] eventData BRUT:', eventData);
                prismaData = {
                    title: eventData.title,
                    description: eventData.description || null,
                    startDate: eventData.start || eventData.startDate,
                    endDate: eventData.end || eventData.endDate,
                    allDay: eventData.isAllDay || eventData.allDay || false,
                    type: eventData.category || eventData.type || 'rendez-vous', // 🎯 category → type
                    status: eventData.priority || eventData.status || 'normal', // 🎯 priority → status  
                    notes: eventData.notes || null,
                    location: eventData.location || null,
                    ownerId: userId,
                    organizationId: organizationId,
                };
                console.log('[CALENDAR ROUTES] Données préparées pour Prisma:', prismaData);
                console.log('[CALENDAR ROUTES] Champs mappés correctement:', {
                    'category → type': eventData.category + ' → ' + prismaData.type,
                    'priority → status': eventData.priority + ' → ' + prismaData.status,
                    'organizer': eventData.organizer + ' (ignoré - pas de champ dans Prisma)'
                });
                return [4 /*yield*/, prisma.calendarEvent.create({
                        data: prismaData,
                    })];
            case 1:
                event_1 = _a.sent();
                console.log('[CALENDAR ROUTES] Événement créé:', event_1);
                _a.label = 2;
            case 2:
                _a.trys.push([2, 5, , 6]);
                googleEventData = {
                    summary: event_1.title,
                    description: event_1.description,
                    start: {
                        dateTime: new Date(event_1.startDate).toISOString(),
                        timeZone: 'Europe/Brussels',
                    },
                    end: {
                        dateTime: new Date(event_1.endDate).toISOString(),
                        timeZone: 'Europe/Brussels',
                    },
                };
                return [4 /*yield*/, GoogleCalendarService_js_1.googleCalendarService.createEvent(organizationId, googleEventData)];
            case 3:
                googleEventId = _a.sent();
                return [4 /*yield*/, prisma.calendarEvent.update({
                        where: { id: event_1.id },
                        data: {
                            googleEventId: googleEventId,
                        },
                        include: {
                            project: { select: { id: true, name: true, clientName: true } },
                            lead: { select: { id: true, firstName: true, lastName: true, email: true } }
                        }
                    })];
            case 4:
                updatedEvent = _a.sent();
                broadcast(organizationId, 'event.created', updatedEvent);
                return [2 /*return*/, res.status(201).json(updatedEvent)];
            case 5:
                googleError_1 = _a.sent();
                console.warn('[CALENDAR ROUTES] Erreur Google Calendar (événement créé en local):', googleError_1);
                return [3 /*break*/, 6];
            case 6:
                broadcast(organizationId, 'event.created', event_1);
                res.status(201).json(event_1);
                return [3 /*break*/, 8];
            case 7:
                error_4 = _a.sent();
                console.error('Erreur création événement:', error_4);
                res.status(500).json({ error: 'Erreur lors de la création de l\'événement' });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
// POST /api/calendar/notes - Création rapide d'une note (tâche journalière auto-reportée)
router.post('/notes', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var startedAt, _a, title, description, dueDate, priority, category, organizationId, ownerId, allowedPriorities, normalizedPriority, safeCategory, today, parsedDue, data, note, prismaCreateError_1, duration, error_5, duration, prismaErr;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                startedAt = Date.now();
                console.log('\n[CALENDAR ROUTES] ▶ POST /notes - Début');
                console.log('[CALENDAR ROUTES] ▶ Body reçu:', req.body);
                _d.label = 1;
            case 1:
                _d.trys.push([1, 6, , 7]);
                _a = req.body, title = _a.title, description = _a.description, dueDate = _a.dueDate, priority = _a.priority, category = _a.category;
                organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
                if (!organizationId && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) === 'super_admin' && (req.body.organizationId || req.query.organizationId)) {
                    organizationId = String(req.body.organizationId || req.query.organizationId);
                    console.log('[CALENDAR ROUTES][POST /notes] ⚙️ Fallback organizationId super_admin:', organizationId);
                }
                if (!organizationId) {
                    console.warn('[CALENDAR ROUTES][POST /notes] ❌ organizationId introuvable');
                    return [2 /*return*/, res.status(400).json({ error: 'organizationId requis' })];
                }
                ownerId = req.user.userId;
                if (!title || typeof title !== 'string') {
                    console.warn('[CALENDAR ROUTES] ⚠️ Titre manquant ou invalide');
                    return [2 /*return*/, res.status(400).json({ error: 'Titre requis' })];
                }
                allowedPriorities = ['low', 'medium', 'high', 'urgent'];
                normalizedPriority = priority && allowedPriorities.includes(priority) ? priority : null;
                safeCategory = category ? String(category).slice(0, 64) : null;
                today = new Date();
                today.setHours(0, 0, 0, 0);
                parsedDue = null;
                if (dueDate) {
                    try {
                        parsedDue = new Date(dueDate);
                        if (isNaN(parsedDue.getTime())) {
                            console.warn('[CALENDAR ROUTES] ⚠️ dueDate invalide, ignorée:', dueDate);
                            parsedDue = null;
                        }
                    }
                    catch (e) {
                        console.warn('[CALENDAR ROUTES] ⚠️ Erreur parsing dueDate, ignorée:', dueDate, e);
                        parsedDue = null;
                    }
                }
                console.log('[CALENDAR ROUTES] ✔ Données normalisées:', { title: title, hasDescription: !!description, parsedDue: parsedDue, normalizedPriority: normalizedPriority, safeCategory: safeCategory, organizationId: organizationId, ownerId: ownerId });
                data = {
                    title: title,
                    description: description || null,
                    startDate: today,
                    endDate: null,
                    allDay: true,
                    type: 'note',
                    status: 'pending',
                    dueDate: parsedDue,
                    priority: normalizedPriority,
                    category: safeCategory,
                    organizationId: organizationId,
                    ownerId: ownerId
                };
                console.log('[CALENDAR ROUTES] ➕ Création Prisma calendarEvent avec data:', data);
                note = void 0;
                _d.label = 2;
            case 2:
                _d.trys.push([2, 4, , 5]);
                return [4 /*yield*/, prisma.calendarEvent.create({ data: data })];
            case 3:
                note = _d.sent();
                return [3 /*break*/, 5];
            case 4:
                prismaCreateError_1 = _d.sent();
                console.error('[CALENDAR ROUTES] ❌ Prisma create a échoué');
                if (prismaCreateError_1 === null || prismaCreateError_1 === void 0 ? void 0 : prismaCreateError_1.code) {
                    console.error('[CALENDAR ROUTES] ❌ Prisma error code:', prismaCreateError_1.code, 'meta:', prismaCreateError_1.meta);
                }
                console.error('[CALENDAR ROUTES] ❌ Détails erreur:', prismaCreateError_1);
                throw prismaCreateError_1; // relancer pour gestion catch globale
            case 5:
                console.log('[CALENDAR ROUTES] ✅ Note créée:', { id: note.id, title: note.title });
                broadcast(organizationId, 'note.created', note);
                duration = Date.now() - startedAt;
                console.log('[CALENDAR ROUTES] ⏱ Durée création note ms:', duration);
                res.status(201).json(note);
                return [3 /*break*/, 7];
            case 6:
                error_5 = _d.sent();
                duration = Date.now() - startedAt;
                console.error('[CALENDAR ROUTES] ❌ Erreur création note après', duration, 'ms');
                if (error_5 instanceof Error) {
                    console.error('[CALENDAR ROUTES] ❌ Stack:', error_5.stack);
                }
                else {
                    console.error('[CALENDAR ROUTES] ❌ Valeur erreur non-Error:', error_5);
                }
                prismaErr = error_5;
                if (prismaErr && typeof prismaErr === 'object' && 'code' in prismaErr && prismaErr.code) {
                    console.error('[CALENDAR ROUTES] ❌ Prisma code:', prismaErr.code, 'meta:', prismaErr.meta);
                }
                res.status(500).json({ error: 'Erreur création note' });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// PATCH /api/calendar/notes/:id/done - Marquer une note comme accomplie
router.patch('/notes/:id/done', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, organizationId, existing, updated, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                id = req.params.id;
                organizationId = req.user.organizationId;
                return [4 /*yield*/, prisma.calendarEvent.findFirst({ where: { id: id, organizationId: organizationId, type: 'note' } })];
            case 1:
                existing = _a.sent();
                if (!existing)
                    return [2 /*return*/, res.status(404).json({ error: 'Note introuvable' })];
                return [4 /*yield*/, prisma.calendarEvent.update({
                        where: { id: id },
                        data: { status: 'done', completedAt: new Date() }
                    })];
            case 2:
                updated = _a.sent();
                broadcast(organizationId, 'note.updated', updated);
                res.json(updated);
                return [3 /*break*/, 4];
            case 3:
                error_6 = _a.sent();
                console.error('[CALENDAR ROUTES] Erreur completion note:', error_6);
                res.status(500).json({ error: 'Erreur completion note' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// GET /api/calendar/notes/summary - Compte rapide pour badge
router.get('/notes/summary', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, todayStart_2, active, overdue, e_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                organizationId = req.user.organizationId;
                todayStart_2 = new Date();
                todayStart_2.setHours(0, 0, 0, 0);
                return [4 /*yield*/, prisma.calendarEvent.findMany({
                        where: { organizationId: organizationId, type: 'note', status: { not: 'done' } },
                        select: { id: true, dueDate: true, startDate: true, title: true }
                    })];
            case 1:
                active = _a.sent();
                overdue = active.filter(function (n) { return n.dueDate && n.dueDate < todayStart_2; }).map(function (n) { return n.id; });
                res.json({ totalActive: active.length, overdueCount: overdue.length, overdueIds: overdue });
                return [3 /*break*/, 3];
            case 2:
                e_1 = _a.sent();
                console.error('[CALENDAR ROUTES] Erreur notes/summary:', e_1);
                res.status(500).json({ error: 'Erreur summary notes' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// GET /api/calendar/notes/history?from=YYYY-MM-DD&to=YYYY-MM-DD&format=json|csv
router.get('/notes/history', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, _a, from, to, format, where, notes, enriched, header, rows, csv, e_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                organizationId = req.user.organizationId;
                _a = req.query, from = _a.from, to = _a.to, format = _a.format;
                where = { organizationId: organizationId, type: 'note', status: 'done', completedAt: { not: null } };
                if (from || to) {
                    where.startDate = {};
                    if (from)
                        where.startDate.gte = new Date(from + 'T00:00:00');
                    if (to)
                        where.startDate.lte = new Date(to + 'T23:59:59');
                }
                return [4 /*yield*/, prisma.calendarEvent.findMany({ where: where, orderBy: { completedAt: 'desc' } })];
            case 1:
                notes = _b.sent();
                enriched = notes.map(function (n) { return ({
                    id: n.id,
                    title: n.title,
                    description: n.description,
                    createdDate: n.startDate,
                    dueDate: n.dueDate,
                    completedAt: n.completedAt,
                    completionDelayMinutes: n.completedAt && n.startDate ? Math.round((n.completedAt.getTime() - n.startDate.getTime()) / 60000) : null,
                    overdue: n.dueDate && n.completedAt ? n.completedAt > n.dueDate : false,
                    priority: n.priority,
                    category: n.category
                }); });
                if (format === 'csv') {
                    header = 'id;title;createdDate;dueDate;completedAt;completionDelayMinutes;overdue;priority;category';
                    rows = enriched.map(function (e) { var _a, _b, _c, _d; return [e.id, e.title.replace(/;/g, ','), (_a = e.createdDate) === null || _a === void 0 ? void 0 : _a.toISOString(), ((_b = e.dueDate) === null || _b === void 0 ? void 0 : _b.toISOString()) || '', ((_c = e.completedAt) === null || _c === void 0 ? void 0 : _c.toISOString()) || '', (_d = e.completionDelayMinutes) !== null && _d !== void 0 ? _d : '', e.overdue, e.priority || '', e.category || ''].join(';'); });
                    csv = __spreadArray([header], rows, true).join('\n');
                    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
                    return [2 /*return*/, res.send(csv)];
                }
                res.json({ success: true, data: enriched });
                return [3 /*break*/, 3];
            case 2:
                e_2 = _b.sent();
                console.error('[CALENDAR ROUTES] Erreur notes/history:', e_2);
                res.status(500).json({ error: 'Erreur history notes' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// PUT /api/calendar/events/:id - Modifier un événement
router.put('/events/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, eventData, organizationId, updatedEvent, googleEventData, googleError_2, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 6, , 7]);
                id = req.params.id;
                eventData = req.body;
                organizationId = req.user.organizationId;
                return [4 /*yield*/, prisma.calendarEvent.update({
                        where: { id: id, organizationId: organizationId },
                        data: eventData,
                    })];
            case 1:
                updatedEvent = _a.sent();
                if (!updatedEvent.googleEventId) return [3 /*break*/, 5];
                _a.label = 2;
            case 2:
                _a.trys.push([2, 4, , 5]);
                googleEventData = {
                    summary: updatedEvent.title,
                    description: updatedEvent.description,
                    start: {
                        dateTime: new Date(updatedEvent.startDate).toISOString(),
                        timeZone: 'Europe/Brussels',
                    },
                    end: {
                        dateTime: new Date(updatedEvent.endDate).toISOString(),
                        timeZone: 'Europe/Brussels',
                    },
                };
                return [4 /*yield*/, GoogleCalendarService_js_1.googleCalendarService.updateEvent(organizationId, updatedEvent.googleEventId, googleEventData)];
            case 3:
                _a.sent();
                return [3 /*break*/, 5];
            case 4:
                googleError_2 = _a.sent();
                console.warn('[CALENDAR ROUTES] Erreur mise à jour Google Calendar:', googleError_2);
                return [3 /*break*/, 5];
            case 5:
                res.json(updatedEvent);
                return [3 /*break*/, 7];
            case 6:
                error_7 = _a.sent();
                console.error('Erreur modification événement:', error_7);
                res.status(500).json({ error: 'Erreur lors de la modification de l\'événement' });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// DELETE /api/calendar/events/:id - Supprimer un événement
router.delete('/events/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, organizationId, eventToDelete, googleError_3, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 7, , 8]);
                console.log('[CALENDAR ROUTES] DELETE /events/:id - Début suppression');
                id = req.params.id;
                organizationId = req.user.organizationId;
                console.log('[CALENDAR ROUTES] ID à supprimer:', id);
                console.log('[CALENDAR ROUTES] OrganizationId:', organizationId);
                return [4 /*yield*/, prisma.calendarEvent.findUnique({ where: { id: id, organizationId: organizationId } })];
            case 1:
                eventToDelete = _a.sent();
                console.log('[CALENDAR ROUTES] Événement trouvé:', eventToDelete);
                if (!eventToDelete) {
                    console.log('[CALENDAR ROUTES] ❌ Événement non trouvé');
                    return [2 /*return*/, res.status(404).json({ error: 'Événement non trouvé.' })];
                }
                console.log('[CALENDAR ROUTES] 🗑️ Suppression de l\'événement...');
                return [4 /*yield*/, prisma.calendarEvent.delete({ where: { id: id } })];
            case 2:
                _a.sent();
                console.log('[CALENDAR ROUTES] ✅ Événement supprimé de la base de données');
                if (!eventToDelete.googleEventId) return [3 /*break*/, 6];
                _a.label = 3;
            case 3:
                _a.trys.push([3, 5, , 6]);
                console.log('[CALENDAR ROUTES] 🔄 Suppression de Google Calendar...');
                return [4 /*yield*/, GoogleCalendarService_js_1.googleCalendarService.deleteEvent(organizationId, eventToDelete.googleEventId)];
            case 4:
                _a.sent();
                console.log('[CALENDAR ROUTES] ✅ Événement supprimé de Google Calendar');
                return [3 /*break*/, 6];
            case 5:
                googleError_3 = _a.sent();
                console.warn('[CALENDAR ROUTES] ⚠️ Erreur suppression Google Calendar:', googleError_3);
                return [3 /*break*/, 6];
            case 6:
                console.log('[CALENDAR ROUTES] ✅ Suppression terminée avec succès');
                res.json({ message: 'Événement supprimé avec succès' });
                return [3 /*break*/, 8];
            case 7:
                error_8 = _a.sent();
                console.error('[CALENDAR ROUTES] ❌ Erreur suppression événement:', error_8);
                res.status(500).json({ error: 'Erreur lors de la suppression de l\'événement' });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
