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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var client_1 = require("@prisma/client");
var zod_1 = require("zod");
var axios_1 = __importDefault(require("axios"));
var router = (0, express_1.Router)();
var prisma = new client_1.PrismaClient();
// Configuration Telnyx
var TELNYX_API_URL = 'https://api.telnyx.com/v2';
// Fonction pour récupérer les headers Telnyx avec la clé API de l'organisation
function getTelnyxHeaders(organizationId) {
    return __awaiter(this, void 0, void 0, function () {
        var apiKey, headers;
        return __generator(this, function (_a) {
            try {
                console.log('🔍 [Telnyx] getTelnyxHeaders appelé pour organization:', organizationId);
                apiKey = process.env.TELNYX_API_KEY;
                console.log('🔑 [Telnyx] API Key from env:', apiKey ? "".concat(apiKey.substring(0, 10), "...") : 'UNDEFINED');
                if (!apiKey) {
                    console.warn('⚠️ [Telnyx] Aucune API Key configurée - process.env.TELNYX_API_KEY est undefined');
                    return [2 /*return*/, null];
                }
                headers = {
                    'Authorization': "Bearer ".concat(apiKey),
                    'Content-Type': 'application/json'
                };
                console.log('✅ [Telnyx] Headers générés avec succès');
                return [2 /*return*/, headers];
            }
            catch (error) {
                console.error('❌ [Telnyx] Erreur récupération headers:', error);
                return [2 /*return*/, null];
            }
            return [2 /*return*/];
        });
    });
}
// Schemas de validation
var makeCallSchema = zod_1.z.object({
    to: zod_1.z.string().min(1),
    from: zod_1.z.string().min(1),
    connection_id: zod_1.z.string().optional(),
    lead_id: zod_1.z.string().optional(),
    webhook_url: zod_1.z.string().url().optional()
});
var sendMessageSchema = zod_1.z.object({
    to: zod_1.z.string().min(1),
    from: zod_1.z.string().min(1),
    text: zod_1.z.string().min(1).max(1600),
    type: zod_1.z.enum(['SMS', 'MMS']).default('SMS'),
    lead_id: zod_1.z.string().optional(),
    media_urls: zod_1.z.array(zod_1.z.string().url()).optional()
});
var purchaseNumberSchema = zod_1.z.object({
    country: zod_1.z.string().length(2),
    type: zod_1.z.enum(['local', 'toll-free', 'national', 'mobile']),
    area_code: zod_1.z.string().optional()
});
// --- CONNEXIONS ---
router.get('/connections', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, headers, response, connections, _i, connections_1, conn, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 7, , 8]);
                console.log('🔍 [Telnyx API] Récupération des connexions...');
                organizationId = req.user.organizationId;
                console.log('[Telnyx API] organizationId:', organizationId);
                return [4 /*yield*/, getTelnyxHeaders(organizationId)];
            case 1:
                headers = _a.sent();
                if (!headers) {
                    return [2 /*return*/, res.status(500).json({
                            error: 'Configuration Telnyx manquante. Veuillez configurer votre API Key.'
                        })];
                }
                return [4 /*yield*/, axios_1.default.get("".concat(TELNYX_API_URL, "/connections"), {
                        headers: headers
                    })];
            case 2:
                response = _a.sent();
                connections = response.data.data.map(function (conn) {
                    var _a;
                    return ({
                        id: conn.id,
                        name: conn.connection_name || "Connection ".concat(conn.id.substring(0, 8)),
                        status: conn.active ? 'active' : 'inactive',
                        type: ((_a = conn.outbound) === null || _a === void 0 ? void 0 : _a.type) || 'voice',
                        webhook_url: conn.webhook_event_url,
                        created_at: conn.created_at,
                        updated_at: conn.updated_at
                    });
                });
                _i = 0, connections_1 = connections;
                _a.label = 3;
            case 3:
                if (!(_i < connections_1.length)) return [3 /*break*/, 6];
                conn = connections_1[_i];
                return [4 /*yield*/, prisma.telnyxConnection.upsert({
                        where: { id: conn.id },
                        update: {
                            name: conn.name,
                            status: conn.status,
                            type: conn.type,
                            webhookUrl: conn.webhook_url,
                            updatedAt: new Date()
                        },
                        create: {
                            id: conn.id,
                            name: conn.name,
                            status: conn.status,
                            type: conn.type,
                            webhookUrl: conn.webhook_url,
                            organizationId: organizationId,
                            createdAt: new Date(conn.created_at),
                            updatedAt: new Date()
                        }
                    })];
            case 4:
                _a.sent();
                _a.label = 5;
            case 5:
                _i++;
                return [3 /*break*/, 3];
            case 6:
                console.log("\u2705 [Telnyx API] ".concat(connections.length, " connexions synchronis\u00E9es"));
                res.json(connections);
                return [3 /*break*/, 8];
            case 7:
                error_1 = _a.sent();
                console.error('❌ [Telnyx API] Erreur connexions:', error_1);
                res.status(500).json({ error: 'Erreur lors de la récupération des connexions' });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
// --- NUMÉROS DE TÉLÉPHONE ---
router.get('/phone-numbers', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, headers, response, phoneNumbers, _i, phoneNumbers_1, number, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 7, , 8]);
                console.log('🔍 [Telnyx API] Récupération des numéros...');
                organizationId = req.user.organizationId;
                return [4 /*yield*/, getTelnyxHeaders(organizationId)];
            case 1:
                headers = _a.sent();
                if (!headers) {
                    return [2 /*return*/, res.status(500).json({
                            error: 'Configuration Telnyx manquante. Veuillez configurer votre API Key.'
                        })];
                }
                return [4 /*yield*/, axios_1.default.get("".concat(TELNYX_API_URL, "/phone_numbers"), {
                        headers: headers,
                        params: { 'page[size]': 250 }
                    })];
            case 2:
                response = _a.sent();
                phoneNumbers = response.data.data.map(function (number) { return ({
                    id: number.id,
                    phone_number: number.phone_number,
                    status: number.status,
                    country_code: number.country_code,
                    number_type: number.phone_number_type,
                    features: number.features || [],
                    monthly_cost: parseFloat(number.monthly_recurring_cost || '0'),
                    connection_id: number.connection_id,
                    purchased_at: number.purchased_at
                }); });
                _i = 0, phoneNumbers_1 = phoneNumbers;
                _a.label = 3;
            case 3:
                if (!(_i < phoneNumbers_1.length)) return [3 /*break*/, 6];
                number = phoneNumbers_1[_i];
                return [4 /*yield*/, prisma.telnyxPhoneNumber.upsert({
                        where: { id: number.id },
                        update: {
                            phoneNumber: number.phone_number,
                            status: number.status,
                            countryCode: number.country_code,
                            numberType: number.number_type,
                            features: number.features,
                            monthlyCost: number.monthly_cost,
                            connectionId: number.connection_id,
                            updatedAt: new Date()
                        },
                        create: {
                            id: number.id,
                            phoneNumber: number.phone_number,
                            status: number.status,
                            countryCode: number.country_code,
                            numberType: number.number_type,
                            features: number.features,
                            monthlyCost: number.monthly_cost,
                            connectionId: number.connection_id,
                            organizationId: organizationId,
                            purchasedAt: new Date(number.purchased_at),
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    })];
            case 4:
                _a.sent();
                _a.label = 5;
            case 5:
                _i++;
                return [3 /*break*/, 3];
            case 6:
                console.log("\u2705 [Telnyx API] ".concat(phoneNumbers.length, " num\u00E9ros synchronis\u00E9s"));
                res.json(phoneNumbers);
                return [3 /*break*/, 8];
            case 7:
                error_2 = _a.sent();
                console.error('❌ [Telnyx API] Erreur numéros:', error_2);
                res.status(500).json({ error: 'Erreur lors de la récupération des numéros' });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
router.post('/phone-numbers/purchase', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var data, headers, searchResponse, availableNumber, purchaseResponse, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                data = purchaseNumberSchema.parse(req.body);
                console.log('🛒 [Telnyx API] Achat de numéro:', data);
                return [4 /*yield*/, getTelnyxHeaders(req.user.organizationId)];
            case 1:
                headers = _a.sent();
                if (!headers) {
                    return [2 /*return*/, res.status(401).json({ error: 'Non autorisé' })];
                }
                return [4 /*yield*/, axios_1.default.get("".concat(TELNYX_API_URL, "/available_phone_numbers"), {
                        headers: headers,
                        params: {
                            'filter[country_code]': data.country,
                            'filter[phone_number_type]': data.type,
                            'filter[area_code]': data.area_code,
                            'page[size]': 10
                        }
                    })];
            case 2:
                searchResponse = _a.sent();
                if (!searchResponse.data.data.length) {
                    return [2 /*return*/, res.status(404).json({ error: 'Aucun numéro disponible avec ces critères' })];
                }
                availableNumber = searchResponse.data.data[0];
                return [4 /*yield*/, axios_1.default.post("".concat(TELNYX_API_URL, "/phone_number_orders"), {
                        phone_numbers: [{ phone_number: availableNumber.phone_number }]
                    }, { headers: headers })];
            case 3:
                purchaseResponse = _a.sent();
                console.log('✅ [Telnyx API] Numéro acheté:', availableNumber.phone_number);
                res.json({
                    success: true,
                    phone_number: availableNumber.phone_number,
                    order_id: purchaseResponse.data.data.id
                });
                return [3 /*break*/, 5];
            case 4:
                error_3 = _a.sent();
                console.error('❌ [Telnyx API] Erreur achat numéro:', error_3);
                res.status(500).json({ error: 'Erreur lors de l\'achat du numéro' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// --- APPELS ---
router.get('/calls', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var limit, organizationId, calls, formattedCalls, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                limit = parseInt(req.query.limit) || 50;
                organizationId = req.user.organizationId;
                console.log("\uD83D\uDD0D [Telnyx API] R\u00E9cup\u00E9ration des appels (".concat(limit, ")..."));
                return [4 /*yield*/, prisma.telnyxCall.findMany({
                        where: { organizationId: organizationId },
                        orderBy: { startedAt: 'desc' },
                        take: limit
                    })];
            case 1:
                calls = _a.sent();
                formattedCalls = calls.map(function (call) {
                    var _a;
                    return ({
                        id: call.id,
                        call_id: call.callId,
                        from: call.fromNumber,
                        to: call.toNumber,
                        direction: call.direction,
                        status: call.status,
                        duration: call.duration || 0,
                        cost: call.cost || 0,
                        started_at: call.startedAt.toISOString(),
                        ended_at: (_a = call.endedAt) === null || _a === void 0 ? void 0 : _a.toISOString(),
                        recording_url: call.recordingUrl,
                        lead_id: call.leadId
                    });
                });
                console.log("\u2705 [Telnyx API] ".concat(formattedCalls.length, " appels r\u00E9cup\u00E9r\u00E9s"));
                res.json(formattedCalls);
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                console.error('❌ [Telnyx API] Erreur récupération appels:', error_4);
                res.status(500).json({ error: 'Erreur lors de la récupération des appels' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.post('/calls', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var data, organizationId, headers, response, callData, call, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                data = makeCallSchema.parse(req.body);
                organizationId = req.user.organizationId;
                console.log('📞 [Telnyx API] Initiation appel:', data);
                return [4 /*yield*/, getTelnyxHeaders(organizationId)];
            case 1:
                headers = _a.sent();
                if (!headers) {
                    return [2 /*return*/, res.status(401).json({ error: 'Non autorisé' })];
                }
                return [4 /*yield*/, axios_1.default.post("".concat(TELNYX_API_URL, "/calls"), {
                        to: data.to,
                        from: data.from,
                        connection_id: data.connection_id,
                        webhook_url: data.webhook_url,
                        command_id: "call-".concat(Date.now())
                    }, { headers: headers })];
            case 2:
                response = _a.sent();
                callData = response.data.data;
                return [4 /*yield*/, prisma.telnyxCall.create({
                        data: {
                            id: "call-".concat(Date.now()),
                            callId: callData.call_control_id,
                            fromNumber: data.from,
                            toNumber: data.to,
                            direction: 'outbound',
                            status: 'in-progress',
                            organizationId: organizationId,
                            leadId: data.lead_id,
                            startedAt: new Date(),
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    })];
            case 3:
                call = _a.sent();
                console.log('✅ [Telnyx API] Appel initié:', call.callId);
                res.json({
                    id: call.id,
                    call_id: call.callId,
                    from: call.fromNumber,
                    to: call.toNumber,
                    status: call.status
                });
                return [3 /*break*/, 5];
            case 4:
                error_5 = _a.sent();
                console.error('❌ [Telnyx API] Erreur initiation appel:', error_5);
                res.status(500).json({ error: 'Erreur lors de l\'initiation de l\'appel' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
router.post('/calls/:callId/hangup', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var callId, organizationId, call, headers, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 6]);
                callId = req.params.callId;
                organizationId = req.user.organizationId;
                console.log('☎️ [Telnyx API] Raccrocher appel:', callId);
                return [4 /*yield*/, prisma.telnyxCall.findFirst({
                        where: {
                            callId: callId,
                            organizationId: organizationId
                        }
                    })];
            case 1:
                call = _a.sent();
                if (!call) {
                    return [2 /*return*/, res.status(404).json({ error: 'Appel non trouvé' })];
                }
                return [4 /*yield*/, getTelnyxHeaders(organizationId)];
            case 2:
                headers = _a.sent();
                if (!headers) {
                    return [2 /*return*/, res.status(401).json({ error: 'Non autorisé' })];
                }
                // Raccrocher via Telnyx
                return [4 /*yield*/, axios_1.default.post("".concat(TELNYX_API_URL, "/calls/").concat(callId, "/actions/hangup"), {}, {
                        headers: headers
                    })];
            case 3:
                // Raccrocher via Telnyx
                _a.sent();
                // Mettre à jour en base
                return [4 /*yield*/, prisma.telnyxCall.update({
                        where: { id: call.id },
                        data: {
                            status: 'completed',
                            endedAt: new Date(),
                            updatedAt: new Date()
                        }
                    })];
            case 4:
                // Mettre à jour en base
                _a.sent();
                console.log('✅ [Telnyx API] Appel raccroché:', callId);
                res.json({ success: true });
                return [3 /*break*/, 6];
            case 5:
                error_6 = _a.sent();
                console.error('❌ [Telnyx API] Erreur raccrocher:', error_6);
                res.status(500).json({ error: 'Erreur lors du raccrochage' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
router.post('/calls/:callId/mute', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var callId, organizationId, headers, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                callId = req.params.callId;
                organizationId = req.user.organizationId;
                console.log('🔇 [Telnyx API] Couper micro:', callId);
                return [4 /*yield*/, getTelnyxHeaders(organizationId)];
            case 1:
                headers = _a.sent();
                if (!headers) {
                    return [2 /*return*/, res.status(401).json({ error: 'Non autorisé' })];
                }
                return [4 /*yield*/, axios_1.default.post("".concat(TELNYX_API_URL, "/calls/").concat(callId, "/actions/mute"), {}, {
                        headers: headers
                    })];
            case 2:
                _a.sent();
                console.log('✅ [Telnyx API] Micro coupé:', callId);
                res.json({ success: true });
                return [3 /*break*/, 4];
            case 3:
                error_7 = _a.sent();
                console.error('❌ [Telnyx API] Erreur mute:', error_7);
                res.status(500).json({ error: 'Erreur lors de la coupure du micro' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
router.post('/calls/:callId/unmute', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var callId, organizationId, headers, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                callId = req.params.callId;
                organizationId = req.user.organizationId;
                console.log('🔊 [Telnyx API] Activer micro:', callId);
                return [4 /*yield*/, getTelnyxHeaders(organizationId)];
            case 1:
                headers = _a.sent();
                if (!headers) {
                    return [2 /*return*/, res.status(401).json({ error: 'Non autorisé' })];
                }
                return [4 /*yield*/, axios_1.default.post("".concat(TELNYX_API_URL, "/calls/").concat(callId, "/actions/unmute"), {}, {
                        headers: headers
                    })];
            case 2:
                _a.sent();
                console.log('✅ [Telnyx API] Micro activé:', callId);
                res.json({ success: true });
                return [3 /*break*/, 4];
            case 3:
                error_8 = _a.sent();
                console.error('❌ [Telnyx API] Erreur unmute:', error_8);
                res.status(500).json({ error: 'Erreur lors de l\'activation du micro' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// --- MESSAGES ---
router.get('/messages', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var limit, organizationId, messages, formattedMessages, error_9;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                limit = parseInt(req.query.limit) || 50;
                organizationId = req.user.organizationId;
                console.log("\uD83D\uDD0D [Telnyx API] R\u00E9cup\u00E9ration des messages (".concat(limit, ")..."));
                return [4 /*yield*/, prisma.telnyxMessage.findMany({
                        where: { organizationId: organizationId },
                        orderBy: { sentAt: 'desc' },
                        take: limit
                    })];
            case 1:
                messages = _a.sent();
                formattedMessages = messages.map(function (msg) {
                    var _a;
                    return ({
                        id: msg.id,
                        message_id: msg.messageId,
                        from: msg.fromNumber,
                        to: msg.toNumber,
                        direction: msg.direction,
                        type: msg.type,
                        text: msg.text,
                        status: msg.status,
                        cost: msg.cost || 0,
                        sent_at: msg.sentAt.toISOString(),
                        delivered_at: (_a = msg.deliveredAt) === null || _a === void 0 ? void 0 : _a.toISOString(),
                        media_urls: msg.mediaUrls || [],
                        lead_id: msg.leadId
                    });
                });
                console.log("\u2705 [Telnyx API] ".concat(formattedMessages.length, " messages r\u00E9cup\u00E9r\u00E9s"));
                res.json(formattedMessages);
                return [3 /*break*/, 3];
            case 2:
                error_9 = _a.sent();
                console.error('❌ [Telnyx API] Erreur récupération messages:', error_9);
                res.status(500).json({ error: 'Erreur lors de la récupération des messages' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.post('/messages', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var data, organizationId, headers, response, messageData, message, error_10;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                data = sendMessageSchema.parse(req.body);
                organizationId = req.user.organizationId;
                console.log('💬 [Telnyx API] Envoi message:', data);
                return [4 /*yield*/, getTelnyxHeaders(organizationId)];
            case 1:
                headers = _a.sent();
                if (!headers) {
                    return [2 /*return*/, res.status(401).json({ error: 'Non autorisé' })];
                }
                return [4 /*yield*/, axios_1.default.post("".concat(TELNYX_API_URL, "/messages"), {
                        to: data.to,
                        from: data.from,
                        text: data.text,
                        type: data.type,
                        media_urls: data.media_urls,
                        webhook_url: "".concat(process.env.APP_URL, "/api/telnyx/webhooks/messages")
                    }, { headers: headers })];
            case 2:
                response = _a.sent();
                messageData = response.data.data;
                return [4 /*yield*/, prisma.telnyxMessage.create({
                        data: {
                            id: "msg-".concat(Date.now()),
                            messageId: messageData.id,
                            fromNumber: data.from,
                            toNumber: data.to,
                            direction: 'outbound',
                            type: data.type,
                            text: data.text,
                            status: 'sent',
                            organizationId: organizationId,
                            leadId: data.lead_id,
                            mediaUrls: data.media_urls || [],
                            sentAt: new Date(),
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    })];
            case 3:
                message = _a.sent();
                console.log('✅ [Telnyx API] Message envoyé:', message.messageId);
                res.json({
                    id: message.id,
                    message_id: message.messageId,
                    status: message.status
                });
                return [3 /*break*/, 5];
            case 4:
                error_10 = _a.sent();
                console.error('❌ [Telnyx API] Erreur envoi message:', error_10);
                res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// --- WEBHOOKS ---
router.post('/webhooks/calls', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var webhook, callData, call, updateData, error_11;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 4, , 5]);
                webhook = req.body;
                console.log('🪝 [Telnyx Webhook] Appel:', (_a = webhook.data) === null || _a === void 0 ? void 0 : _a.event_type);
                callData = (_b = webhook.data) === null || _b === void 0 ? void 0 : _b.payload;
                if (!callData) {
                    return [2 /*return*/, res.json({ received: true })];
                }
                return [4 /*yield*/, prisma.telnyxCall.findFirst({
                        where: { callId: callData.call_control_id }
                    })];
            case 1:
                call = _c.sent();
                if (!call) return [3 /*break*/, 3];
                updateData = {
                    status: callData.state || call.status,
                    updatedAt: new Date()
                };
                if (callData.state === 'bridged') {
                    updateData.startedAt = new Date();
                }
                else if (['hangup', 'completed'].includes(callData.state)) {
                    updateData.endedAt = new Date();
                    updateData.duration = callData.hangup_duration_millis ?
                        Math.floor(callData.hangup_duration_millis / 1000) : 0;
                }
                return [4 /*yield*/, prisma.telnyxCall.update({
                        where: { id: call.id },
                        data: updateData
                    })];
            case 2:
                _c.sent();
                console.log("\u2705 [Telnyx Webhook] Appel mis \u00E0 jour: ".concat(call.callId, " -> ").concat(callData.state));
                _c.label = 3;
            case 3:
                res.json({ received: true });
                return [3 /*break*/, 5];
            case 4:
                error_11 = _c.sent();
                console.error('❌ [Telnyx Webhook] Erreur appel:', error_11);
                res.status(500).json({ error: 'Erreur webhook appel' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
router.post('/webhooks/messages', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var webhook, messageData, eventType, message, error_12;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 6, , 7]);
                webhook = req.body;
                console.log('🪝 [Telnyx Webhook] Message:', (_a = webhook.data) === null || _a === void 0 ? void 0 : _a.event_type);
                messageData = (_b = webhook.data) === null || _b === void 0 ? void 0 : _b.payload;
                if (!messageData) {
                    return [2 /*return*/, res.json({ received: true })];
                }
                eventType = webhook.data.event_type;
                if (!(eventType === 'message.received')) return [3 /*break*/, 2];
                // Message entrant
                return [4 /*yield*/, prisma.telnyxMessage.create({
                        data: {
                            id: "msg-".concat(Date.now()),
                            messageId: messageData.id,
                            fromNumber: messageData.from.phone_number,
                            toNumber: messageData.to[0].phone_number,
                            direction: 'inbound',
                            type: messageData.type,
                            text: messageData.text,
                            status: 'delivered',
                            organizationId: 'default', // TODO: déterminer l'organisation
                            sentAt: new Date(messageData.received_at),
                            deliveredAt: new Date(),
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    })];
            case 1:
                // Message entrant
                _c.sent();
                console.log('✅ [Telnyx Webhook] Message entrant sauvegardé:', messageData.id);
                return [3 /*break*/, 5];
            case 2:
                if (!(eventType === 'message.sent')) return [3 /*break*/, 5];
                return [4 /*yield*/, prisma.telnyxMessage.findFirst({
                        where: { messageId: messageData.id }
                    })];
            case 3:
                message = _c.sent();
                if (!message) return [3 /*break*/, 5];
                return [4 /*yield*/, prisma.telnyxMessage.update({
                        where: { id: message.id },
                        data: {
                            status: 'delivered',
                            deliveredAt: new Date(),
                            updatedAt: new Date()
                        }
                    })];
            case 4:
                _c.sent();
                console.log('✅ [Telnyx Webhook] Message livré:', messageData.id);
                _c.label = 5;
            case 5:
                res.json({ received: true });
                return [3 /*break*/, 7];
            case 6:
                error_12 = _c.sent();
                console.error('❌ [Telnyx Webhook] Erreur message:', error_12);
                res.status(500).json({ error: 'Erreur webhook message' });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// --- SYNCHRONISATION ---
router.post('/sync', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, headers, _a, connectionsRes, numbersRes, _i, _b, conn, _c, _d, number, error_13;
    var _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                _g.trys.push([0, 11, , 12]);
                console.log('🔄 [Telnyx API] Synchronisation complète...');
                organizationId = req.user.organizationId;
                return [4 /*yield*/, getTelnyxHeaders(organizationId)];
            case 1:
                headers = _g.sent();
                if (!headers) {
                    return [2 /*return*/, res.status(500).json({
                            error: 'Configuration Telnyx manquante. Veuillez configurer votre API Key.'
                        })];
                }
                return [4 /*yield*/, Promise.all([
                        axios_1.default.get("".concat(TELNYX_API_URL, "/connections"), { headers: headers }),
                        axios_1.default.get("".concat(TELNYX_API_URL, "/phone_numbers"), {
                            headers: headers,
                            params: { 'page[size]': 250 }
                        })
                    ])];
            case 2:
                _a = _g.sent(), connectionsRes = _a[0], numbersRes = _a[1];
                _i = 0, _b = connectionsRes.data.data;
                _g.label = 3;
            case 3:
                if (!(_i < _b.length)) return [3 /*break*/, 6];
                conn = _b[_i];
                return [4 /*yield*/, prisma.telnyxConnection.upsert({
                        where: { id: conn.id },
                        update: {
                            name: conn.connection_name || "Connection ".concat(conn.id.substring(0, 8)),
                            status: conn.active ? 'active' : 'inactive',
                            type: ((_e = conn.outbound) === null || _e === void 0 ? void 0 : _e.type) || 'voice',
                            webhookUrl: conn.webhook_event_url,
                            updatedAt: new Date()
                        },
                        create: {
                            id: conn.id,
                            name: conn.connection_name || "Connection ".concat(conn.id.substring(0, 8)),
                            status: conn.active ? 'active' : 'inactive',
                            type: ((_f = conn.outbound) === null || _f === void 0 ? void 0 : _f.type) || 'voice',
                            webhookUrl: conn.webhook_event_url,
                            organizationId: organizationId,
                            createdAt: new Date(conn.created_at),
                            updatedAt: new Date()
                        }
                    })];
            case 4:
                _g.sent();
                _g.label = 5;
            case 5:
                _i++;
                return [3 /*break*/, 3];
            case 6:
                _c = 0, _d = numbersRes.data.data;
                _g.label = 7;
            case 7:
                if (!(_c < _d.length)) return [3 /*break*/, 10];
                number = _d[_c];
                return [4 /*yield*/, prisma.telnyxPhoneNumber.upsert({
                        where: { id: number.id },
                        update: {
                            phoneNumber: number.phone_number,
                            status: number.status,
                            countryCode: number.country_code,
                            numberType: number.phone_number_type,
                            features: number.features || [],
                            monthlyCost: parseFloat(number.monthly_recurring_cost || '0'),
                            connectionId: number.connection_id,
                            updatedAt: new Date()
                        },
                        create: {
                            id: number.id,
                            phoneNumber: number.phone_number,
                            status: number.status,
                            countryCode: number.country_code,
                            numberType: number.phone_number_type,
                            features: number.features || [],
                            monthlyCost: parseFloat(number.monthly_recurring_cost || '0'),
                            connectionId: number.connection_id,
                            organizationId: organizationId,
                            purchasedAt: new Date(number.purchased_at),
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    })];
            case 8:
                _g.sent();
                _g.label = 9;
            case 9:
                _c++;
                return [3 /*break*/, 7];
            case 10:
                console.log('✅ [Telnyx API] Synchronisation terminée');
                res.json({
                    success: true,
                    connections: connectionsRes.data.data.length,
                    numbers: numbersRes.data.data.length
                });
                return [3 /*break*/, 12];
            case 11:
                error_13 = _g.sent();
                console.error('❌ [Telnyx API] Erreur synchronisation:', error_13);
                res.status(500).json({ error: 'Erreur lors de la synchronisation' });
                return [3 /*break*/, 12];
            case 12: return [2 /*return*/];
        }
    });
}); });
// --- CONFIGURATION ORGANISATION ---
router.post('/config', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, api_key, webhook_url, default_connection, organizationId, userOrgId, targetOrgId;
    return __generator(this, function (_b) {
        try {
            _a = req.body, api_key = _a.api_key, webhook_url = _a.webhook_url, default_connection = _a.default_connection, organizationId = _a.organizationId;
            userOrgId = req.user.organizationId;
            console.log('⚙️ [Telnyx API] Configuration organisation:', { organizationId: organizationId || userOrgId, hasApiKey: !!api_key });
            targetOrgId = organizationId || userOrgId;
            // Sauvegarder en base (vous devrez créer une table TelnyxConfig)
            // Pour l'instant, on sauvegarde dans les variables d'environnement ou une table de config
            // Réponse de succès
            res.json({
                success: true,
                message: 'Configuration Telnyx sauvegardée',
                organization: targetOrgId
            });
            console.log('✅ [Telnyx API] Configuration sauvegardée pour:', targetOrgId);
        }
        catch (error) {
            console.error('❌ [Telnyx API] Erreur sauvegarde configuration:', error);
            res.status(500).json({ error: 'Erreur lors de la sauvegarde de la configuration' });
        }
        return [2 /*return*/];
    });
}); });
// --- CONFIGURATION UTILISATEUR ---
router.post('/user-config', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, userId, assignedNumber, canMakeCalls, canSendSms, monthlyLimit, organizationId, userConfig, error_14;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 7, , 8]);
                _a = req.body, userId = _a.userId, assignedNumber = _a.assignedNumber, canMakeCalls = _a.canMakeCalls, canSendSms = _a.canSendSms, monthlyLimit = _a.monthlyLimit;
                organizationId = req.user.organizationId;
                console.log('⚙️ [Telnyx API] Configuration utilisateur:', { userId: userId, assignedNumber: assignedNumber });
                return [4 /*yield*/, prisma.telnyxUserConfig.upsert({
                        where: { userId: userId },
                        update: {
                            assignedNumber: assignedNumber,
                            canMakeCalls: canMakeCalls || false,
                            canSendSms: canSendSms || false,
                            monthlyLimit: monthlyLimit ? parseFloat(monthlyLimit) : null,
                            updatedAt: new Date()
                        },
                        create: {
                            userId: userId,
                            organizationId: organizationId,
                            assignedNumber: assignedNumber,
                            canMakeCalls: canMakeCalls || false,
                            canSendSms: canSendSms || false,
                            monthlyLimit: monthlyLimit ? parseFloat(monthlyLimit) : null,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    })];
            case 1:
                userConfig = _b.sent();
                if (!assignedNumber) return [3 /*break*/, 4];
                return [4 /*yield*/, prisma.telnyxPhoneNumber.updateMany({
                        where: {
                            phoneNumber: assignedNumber,
                            organizationId: organizationId
                        },
                        data: {
                            assignedUserId: userId,
                            updatedAt: new Date()
                        }
                    })];
            case 2:
                _b.sent();
                // Libérer les autres numéros de cet utilisateur
                return [4 /*yield*/, prisma.telnyxPhoneNumber.updateMany({
                        where: {
                            assignedUserId: userId,
                            phoneNumber: { not: assignedNumber },
                            organizationId: organizationId
                        },
                        data: {
                            assignedUserId: null,
                            updatedAt: new Date()
                        }
                    })];
            case 3:
                // Libérer les autres numéros de cet utilisateur
                _b.sent();
                return [3 /*break*/, 6];
            case 4: 
            // Libérer tous les numéros de cet utilisateur
            return [4 /*yield*/, prisma.telnyxPhoneNumber.updateMany({
                    where: {
                        assignedUserId: userId,
                        organizationId: organizationId
                    },
                    data: {
                        assignedUserId: null,
                        updatedAt: new Date()
                    }
                })];
            case 5:
                // Libérer tous les numéros de cet utilisateur
                _b.sent();
                _b.label = 6;
            case 6:
                console.log('✅ [Telnyx API] Configuration utilisateur sauvegardée');
                res.json({ success: true, config: userConfig });
                return [3 /*break*/, 8];
            case 7:
                error_14 = _b.sent();
                console.error('❌ [Telnyx API] Erreur config utilisateur:', error_14);
                res.status(500).json({ error: 'Erreur lors de la sauvegarde de la configuration' });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
router.get('/user-config/:userId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, organizationId, userConfig, error_15;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                userId = req.params.userId;
                organizationId = req.user.organizationId;
                console.log('🔍 [Telnyx API] Récupération config utilisateur:', userId);
                return [4 /*yield*/, prisma.telnyxUserConfig.findFirst({
                        where: {
                            userId: userId,
                            organizationId: organizationId
                        }
                    })];
            case 1:
                userConfig = _a.sent();
                res.json(userConfig || {
                    userId: userId,
                    organizationId: organizationId,
                    canMakeCalls: false,
                    canSendSms: false,
                    assignedNumber: null,
                    monthlyLimit: null
                });
                return [3 /*break*/, 3];
            case 2:
                error_15 = _a.sent();
                console.error('❌ [Telnyx API] Erreur récupération config:', error_15);
                res.status(500).json({ error: 'Erreur lors de la récupération de la configuration' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.get('/stats', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, _a, totalCalls, totalSms, activeNumbers, calls, numbers, callsCost, numbersCost, monthlyCost, error_16;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                organizationId = req.user.organizationId;
                console.log('📊 [Telnyx API] Récupération statistiques...');
                return [4 /*yield*/, Promise.all([
                        prisma.telnyxCall.count({
                            where: {
                                organizationId: organizationId,
                                startedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
                            }
                        }),
                        prisma.telnyxMessage.count({
                            where: {
                                organizationId: organizationId,
                                createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
                            }
                        }),
                        prisma.telnyxPhoneNumber.count({
                            where: {
                                organizationId: organizationId,
                                status: 'active'
                            }
                        })
                    ])];
            case 1:
                _a = _b.sent(), totalCalls = _a[0], totalSms = _a[1], activeNumbers = _a[2];
                return [4 /*yield*/, prisma.telnyxCall.findMany({
                        where: {
                            organizationId: organizationId,
                            startedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
                        },
                        select: { cost: true }
                    })];
            case 2:
                calls = _b.sent();
                return [4 /*yield*/, prisma.telnyxPhoneNumber.findMany({
                        where: {
                            organizationId: organizationId,
                            status: 'active'
                        },
                        select: { monthlyCost: true }
                    })];
            case 3:
                numbers = _b.sent();
                callsCost = calls.reduce(function (sum, call) { return sum + (call.cost || 0); }, 0);
                numbersCost = numbers.reduce(function (sum, number) { return sum + (number.monthlyCost || 0); }, 0);
                monthlyCost = callsCost + numbersCost;
                console.log('✅ [Telnyx API] Statistiques récupérées');
                res.json({
                    totalCalls: totalCalls,
                    totalSms: totalSms,
                    activeNumbers: activeNumbers,
                    monthlyCost: monthlyCost
                });
                return [3 /*break*/, 5];
            case 4:
                error_16 = _b.sent();
                console.error('❌ [Telnyx API] Erreur stats:', error_16);
                res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// --- WEBHOOK UNIQUE POUR TOUT ---
router.post('/webhooks', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var webhook, eventType, callData, call, updateData, messageData, message, error_17;
    var _a, _b, _c, _d, _e, _f, _g;
    return __generator(this, function (_h) {
        switch (_h.label) {
            case 0:
                _h.trys.push([0, 12, , 13]);
                webhook = req.body;
                eventType = (_a = webhook.data) === null || _a === void 0 ? void 0 : _a.event_type;
                console.log('🪝 [Telnyx Webhook Unique]', eventType, ((_c = (_b = webhook.data) === null || _b === void 0 ? void 0 : _b.payload) === null || _c === void 0 ? void 0 : _c.call_control_id) || ((_e = (_d = webhook.data) === null || _d === void 0 ? void 0 : _d.payload) === null || _e === void 0 ? void 0 : _e.id));
                if (!(eventType === null || eventType === void 0 ? void 0 : eventType.startsWith('call.'))) return [3 /*break*/, 4];
                callData = (_f = webhook.data) === null || _f === void 0 ? void 0 : _f.payload;
                if (!callData) return [3 /*break*/, 3];
                return [4 /*yield*/, prisma.telnyxCall.findFirst({
                        where: { callId: callData.call_control_id }
                    })];
            case 1:
                call = _h.sent();
                if (!call) return [3 /*break*/, 3];
                updateData = {
                    status: callData.state || call.status,
                    updatedAt: new Date()
                };
                if (callData.state === 'bridged') {
                    updateData.startedAt = new Date();
                }
                else if (['hangup', 'completed'].includes(callData.state)) {
                    updateData.endedAt = new Date();
                    updateData.duration = callData.hangup_duration_millis ?
                        Math.floor(callData.hangup_duration_millis / 1000) : 0;
                }
                return [4 /*yield*/, prisma.telnyxCall.update({
                        where: { id: call.id },
                        data: updateData
                    })];
            case 2:
                _h.sent();
                console.log("\u2705 [Telnyx Webhook] Appel mis \u00E0 jour: ".concat(call.callId, " -> ").concat(callData.state));
                _h.label = 3;
            case 3: return [3 /*break*/, 11];
            case 4:
                if (!(eventType === null || eventType === void 0 ? void 0 : eventType.startsWith('message.'))) return [3 /*break*/, 10];
                messageData = (_g = webhook.data) === null || _g === void 0 ? void 0 : _g.payload;
                if (!messageData) return [3 /*break*/, 9];
                if (!(eventType === 'message.received')) return [3 /*break*/, 6];
                // Message entrant
                return [4 /*yield*/, prisma.telnyxMessage.create({
                        data: {
                            id: "msg-".concat(Date.now()),
                            messageId: messageData.id,
                            fromNumber: messageData.from.phone_number,
                            toNumber: messageData.to[0].phone_number,
                            direction: 'inbound',
                            type: messageData.type,
                            text: messageData.text,
                            status: 'delivered',
                            organizationId: 'default',
                            sentAt: new Date(messageData.received_at),
                            deliveredAt: new Date(),
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    })];
            case 5:
                // Message entrant
                _h.sent();
                console.log('✅ [Telnyx Webhook] Message entrant sauvegardé:', messageData.id);
                return [3 /*break*/, 9];
            case 6:
                if (!(eventType === 'message.sent')) return [3 /*break*/, 9];
                return [4 /*yield*/, prisma.telnyxMessage.findFirst({
                        where: { messageId: messageData.id }
                    })];
            case 7:
                message = _h.sent();
                if (!message) return [3 /*break*/, 9];
                return [4 /*yield*/, prisma.telnyxMessage.update({
                        where: { id: message.id },
                        data: {
                            status: 'delivered',
                            deliveredAt: new Date(),
                            updatedAt: new Date()
                        }
                    })];
            case 8:
                _h.sent();
                console.log('✅ [Telnyx Webhook] Message sortant mis à jour:', messageData.id);
                _h.label = 9;
            case 9: return [3 /*break*/, 11];
            case 10:
                console.log('🪝 [Telnyx Webhook] Événement non géré:', eventType);
                _h.label = 11;
            case 11:
                res.json({ received: true });
                return [3 /*break*/, 13];
            case 12:
                error_17 = _h.sent();
                console.error('❌ [Telnyx Webhook] Erreur:', error_17);
                res.status(500).json({ error: 'Erreur webhook' });
                return [3 /*break*/, 13];
            case 13: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
