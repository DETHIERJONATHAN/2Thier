"use strict";
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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var client_1 = require("@prisma/client");
var auth_js_1 = require("../middlewares/auth.js");
// Enum temporaire pour les devis
var QuoteStatus;
(function (QuoteStatus) {
    QuoteStatus["DRAFT"] = "DRAFT";
    QuoteStatus["SENT"] = "SENT";
    QuoteStatus["ACCEPTED"] = "ACCEPTED";
    QuoteStatus["REJECTED"] = "REJECTED";
    QuoteStatus["CANCELLED"] = "CANCELLED";
    QuoteStatus["EXPIRED"] = "EXPIRED";
})(QuoteStatus || (QuoteStatus = {}));
var router = (0, express_1.Router)();
var prisma = new client_1.PrismaClient();
// Appliquer l'auth à toutes les routes
router.use(auth_js_1.authMiddleware);
// Utils
var allowedTransitions = (_a = {},
    _a[QuoteStatus.DRAFT] = [QuoteStatus.SENT, QuoteStatus.CANCELLED],
    _a[QuoteStatus.SENT] = [QuoteStatus.ACCEPTED, QuoteStatus.REJECTED, QuoteStatus.CANCELLED, QuoteStatus.EXPIRED],
    _a[QuoteStatus.ACCEPTED] = [],
    _a[QuoteStatus.REJECTED] = [],
    _a[QuoteStatus.CANCELLED] = [],
    _a[QuoteStatus.EXPIRED] = [],
    _a);
function canTransition(from, to) {
    var _a, _b;
    return (_b = (_a = allowedTransitions[from]) === null || _a === void 0 ? void 0 : _a.includes(to)) !== null && _b !== void 0 ? _b : false;
}
// Générateur très simple de numéro de devis (non bloquant, unique par timestamp)
function generateQuoteNumber() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var seq = Math.floor(Math.random() * 9000 + 1000); // 4 chiffres
    return "Q-".concat(y).concat(m, "-").concat(seq);
}
function computeItemTotals(item) {
    var _a, _b;
    var qty = Math.max(0, Number(item.quantity) || 0);
    var price = Math.max(0, Number(item.unitPrice) || 0);
    var discount = Math.min(100, Math.max(0, Number((_a = item.discountPct) !== null && _a !== void 0 ? _a : 0)));
    var tax = Math.min(100, Math.max(0, Number((_b = item.taxPct) !== null && _b !== void 0 ? _b : 21)));
    var lineExclBeforeDiscount = qty * price;
    var lineExcl = round4(lineExclBeforeDiscount * (1 - discount / 100));
    var lineTax = round4(lineExcl * (tax / 100));
    var lineIncl = round4(lineExcl + lineTax);
    return { totalExcl: lineExcl, totalIncl: lineIncl };
}
function aggregateTotals(items) {
    var subtotalExcl = 0;
    var totalIncl = 0;
    for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
        var it = items_1[_i];
        var _a = computeItemTotals(it), totalExcl = _a.totalExcl, lineIncl = _a.totalIncl;
        subtotalExcl += totalExcl;
        totalIncl += lineIncl;
    }
    var totalTax = round4(totalIncl - subtotalExcl);
    return {
        subtotalExcl: round4(subtotalExcl),
        totalTax: round4(totalTax),
        totalIncl: round4(totalIncl),
    };
}
function round4(n) {
    return Math.round((n + Number.EPSILON) * 10000) / 10000;
}
function toDecimal(value) {
    // Passer en string pour sécuriser la précision côté Prisma.Decimal
    return new client_1.Prisma.Decimal(value.toString());
}
// GET /api/quotes?leadId=...&status=...&page=1&pageSize=20
router.get('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, leadId, status_1, _b, page, _c, pageSize, user, organizationId, where, pageNum, sizeNum, _d, total, data, e_1;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 2, , 3]);
                _a = req.query, leadId = _a.leadId, status_1 = _a.status, _b = _a.page, page = _b === void 0 ? '1' : _b, _c = _a.pageSize, pageSize = _c === void 0 ? '20' : _c;
                user = req.user;
                organizationId = user === null || user === void 0 ? void 0 : user.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({ error: 'Organisation non spécifiée' })];
                }
                where = __assign(__assign({ organizationId: organizationId }, (leadId ? { leadId: leadId } : {})), (status_1 ? { status: status_1 } : {}));
                pageNum = Math.max(1, parseInt(String(page), 10) || 1);
                sizeNum = Math.min(100, Math.max(1, parseInt(String(pageSize), 10) || 20));
                return [4 /*yield*/, Promise.all([
                        prisma.quote.count({ where: where }),
                        prisma.quote.findMany({
                            where: where,
                            orderBy: [{ updatedAt: 'desc' }],
                            skip: (pageNum - 1) * sizeNum,
                            take: sizeNum,
                            include: {
                                documents: {
                                    orderBy: { createdAt: 'desc' },
                                    take: 1,
                                },
                            },
                        }),
                    ])];
            case 1:
                _d = _e.sent(), total = _d[0], data = _d[1];
                res.json({ success: true, total: total, page: pageNum, pageSize: sizeNum, data: data });
                return [3 /*break*/, 3];
            case 2:
                e_1 = _e.sent();
                console.error('[QUOTES] GET list error', e_1);
                res.status(500).json({ success: false, error: 'Erreur lors du chargement des devis' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// GET /api/quotes/:id
router.get('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, user, organizationId, quote, e_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = req.params.id;
                user = req.user;
                organizationId = user === null || user === void 0 ? void 0 : user.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ error: 'Organisation non spécifiée' })];
                return [4 /*yield*/, prisma.quote.findFirst({
                        where: { id: id, organizationId: organizationId },
                        include: {
                            items: { orderBy: { order: 'asc' } },
                            documents: { orderBy: { createdAt: 'desc' }, take: 5 },
                        },
                    })];
            case 1:
                quote = _a.sent();
                if (!quote)
                    return [2 /*return*/, res.status(404).json({ error: 'Devis introuvable' })];
                res.json(quote);
                return [3 /*break*/, 3];
            case 2:
                e_2 = _a.sent();
                console.error('[QUOTES] GET detail error', e_2);
                res.status(500).json({ error: 'Erreur lors du chargement du devis' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// POST /api/quotes
router.post('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, organizationId, _a, leadId, blockId, title, _b, currency, validUntil, notes, data, lead, created, e_3;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 3, , 4]);
                user = req.user;
                organizationId = user === null || user === void 0 ? void 0 : user.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ error: 'Organisation non spécifiée' })];
                _a = req.body, leadId = _a.leadId, blockId = _a.blockId, title = _a.title, _b = _a.currency, currency = _b === void 0 ? 'EUR' : _b, validUntil = _a.validUntil, notes = _a.notes, data = _a.data;
                if (!leadId || !blockId)
                    return [2 /*return*/, res.status(400).json({ error: 'leadId et blockId requis' })];
                return [4 /*yield*/, prisma.lead.findFirst({ where: { id: leadId, organizationId: organizationId } })];
            case 1:
                lead = _d.sent();
                if (!lead)
                    return [2 /*return*/, res.status(404).json({ error: 'Lead non trouvé ou non autorisé' })];
                return [4 /*yield*/, prisma.quote.create({
                        data: {
                            organizationId: organizationId,
                            leadId: leadId,
                            blockId: blockId,
                            createdById: (_c = user === null || user === void 0 ? void 0 : user.userId) !== null && _c !== void 0 ? _c : null,
                            number: generateQuoteNumber(),
                            status: QuoteStatus.DRAFT,
                            title: title !== null && title !== void 0 ? title : null,
                            version: 1,
                            currency: currency,
                            validUntil: validUntil ? new Date(validUntil) : null,
                            notes: notes !== null && notes !== void 0 ? notes : null,
                            data: data !== null && data !== void 0 ? data : {},
                            totals: {},
                        },
                    })];
            case 2:
                created = _d.sent();
                res.status(201).json(created);
                return [3 /*break*/, 4];
            case 3:
                e_3 = _d.sent();
                console.error('[QUOTES] POST create error', e_3);
                res.status(500).json({ error: 'Erreur lors de la création du devis' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// PATCH /api/quotes/:id
router.patch('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, user, organizationId, existing, _a, title, notes, currency, validUntil, status_2, data, from, to, updated, e_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                id = req.params.id;
                user = req.user;
                organizationId = user === null || user === void 0 ? void 0 : user.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ error: 'Organisation non spécifiée' })];
                return [4 /*yield*/, prisma.quote.findFirst({ where: { id: id, organizationId: organizationId } })];
            case 1:
                existing = _b.sent();
                if (!existing)
                    return [2 /*return*/, res.status(404).json({ error: 'Devis introuvable' })];
                _a = req.body, title = _a.title, notes = _a.notes, currency = _a.currency, validUntil = _a.validUntil, status_2 = _a.status;
                data = {};
                if (title !== undefined)
                    data.title = title;
                if (notes !== undefined)
                    data.notes = notes;
                if (currency !== undefined)
                    data.currency = currency;
                if (validUntil !== undefined)
                    data.validUntil = validUntil ? new Date(validUntil) : null;
                if (status_2 && status_2 !== existing.status) {
                    from = existing.status;
                    to = status_2;
                    if (!canTransition(from, to)) {
                        return [2 /*return*/, res.status(400).json({ error: "Transition de statut interdite: ".concat(from, " -> ").concat(to) })];
                    }
                    data.status = to;
                }
                return [4 /*yield*/, prisma.quote.update({ where: { id: id }, data: data })];
            case 2:
                updated = _b.sent();
                res.json(updated);
                return [3 /*break*/, 4];
            case 3:
                e_4 = _b.sent();
                console.error('[QUOTES] PATCH update error', e_4);
                res.status(500).json({ error: 'Erreur lors de la mise à jour du devis' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// DELETE /api/quotes/:id -> soft delete en CANCELLED
router.delete('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, user, organizationId, existing, e_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                id = req.params.id;
                user = req.user;
                organizationId = user === null || user === void 0 ? void 0 : user.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ error: 'Organisation non spécifiée' })];
                return [4 /*yield*/, prisma.quote.findFirst({ where: { id: id, organizationId: organizationId } })];
            case 1:
                existing = _a.sent();
                if (!existing)
                    return [2 /*return*/, res.status(404).json({ error: 'Devis introuvable' })];
                return [4 /*yield*/, prisma.quote.update({ where: { id: id }, data: { status: QuoteStatus.CANCELLED } })];
            case 2:
                _a.sent();
                res.status(204).send();
                return [3 /*break*/, 4];
            case 3:
                e_5 = _a.sent();
                console.error('[QUOTES] DELETE error', e_5);
                res.status(500).json({ error: 'Erreur lors de l\'annulation du devis' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// POST /api/quotes/:id/items -> bulk upsert ordonné + recalcul totaux
router.post('/:id/items', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id_1, user, organizationId, existing, items, prepared_1, totals_1, updated, e_6;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                id_1 = req.params.id;
                user = req.user;
                organizationId = user === null || user === void 0 ? void 0 : user.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ error: 'Organisation non spécifiée' })];
                return [4 /*yield*/, prisma.quote.findFirst({ where: { id: id_1, organizationId: organizationId } })];
            case 1:
                existing = _b.sent();
                if (!existing)
                    return [2 /*return*/, res.status(404).json({ error: 'Devis introuvable' })];
                items = (((_a = req.body) === null || _a === void 0 ? void 0 : _a.items) || []);
                if (!Array.isArray(items))
                    return [2 /*return*/, res.status(400).json({ error: 'items doit être un tableau' })];
                prepared_1 = items
                    .filter(function (i) { return i && typeof i.label === 'string'; })
                    .map(function (i) {
                    var _a, _b;
                    return (__assign(__assign({}, i), { quantity: Number(i.quantity) || 0, unitPrice: Number(i.unitPrice) || 0, discountPct: Number((_a = i.discountPct) !== null && _a !== void 0 ? _a : 0), taxPct: Number((_b = i.taxPct) !== null && _b !== void 0 ? _b : 21) }));
                })
                    .sort(function (a, b) { var _a, _b; return ((_a = a.order) !== null && _a !== void 0 ? _a : 0) - ((_b = b.order) !== null && _b !== void 0 ? _b : 0); });
                totals_1 = aggregateTotals(prepared_1);
                // Transaction: on remplace l'ensemble des lignes pour simplifier et garantir l'ordre
                return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var _i, prepared_2, it, _a, totalExcl, totalIncl;
                        var _b, _c, _d, _e;
                        return __generator(this, function (_f) {
                            switch (_f.label) {
                                case 0: return [4 /*yield*/, tx.quoteItem.deleteMany({ where: { quoteId: id_1 } })];
                                case 1:
                                    _f.sent();
                                    _i = 0, prepared_2 = prepared_1;
                                    _f.label = 2;
                                case 2:
                                    if (!(_i < prepared_2.length)) return [3 /*break*/, 5];
                                    it = prepared_2[_i];
                                    _a = computeItemTotals(it), totalExcl = _a.totalExcl, totalIncl = _a.totalIncl;
                                    return [4 /*yield*/, tx.quoteItem.create({
                                            data: {
                                                quoteId: id_1,
                                                order: (_b = it.order) !== null && _b !== void 0 ? _b : 0,
                                                label: it.label,
                                                description: (_c = it.description) !== null && _c !== void 0 ? _c : null,
                                                quantity: toDecimal(it.quantity),
                                                unitPrice: toDecimal(it.unitPrice),
                                                discountPct: toDecimal((_d = it.discountPct) !== null && _d !== void 0 ? _d : 0),
                                                taxPct: toDecimal((_e = it.taxPct) !== null && _e !== void 0 ? _e : 21),
                                                totalExcl: toDecimal(totalExcl),
                                                totalIncl: toDecimal(totalIncl),
                                            },
                                        })];
                                case 3:
                                    _f.sent();
                                    _f.label = 4;
                                case 4:
                                    _i++;
                                    return [3 /*break*/, 2];
                                case 5: return [4 /*yield*/, tx.quote.update({
                                        where: { id: id_1 },
                                        data: {
                                            totals: {
                                                subtotalExcl: totals_1.subtotalExcl,
                                                totalTax: totals_1.totalTax,
                                                totalIncl: totals_1.totalIncl,
                                            },
                                        },
                                    })];
                                case 6:
                                    _f.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            case 2:
                // Transaction: on remplace l'ensemble des lignes pour simplifier et garantir l'ordre
                _b.sent();
                return [4 /*yield*/, prisma.quote.findUnique({
                        where: { id: id_1 },
                        include: { items: { orderBy: { order: 'asc' } } },
                    })];
            case 3:
                updated = _b.sent();
                res.json({ success: true, quote: updated });
                return [3 /*break*/, 5];
            case 4:
                e_6 = _b.sent();
                console.error('[QUOTES] POST items error', e_6);
                res.status(500).json({ error: 'Erreur lors de la mise à jour des lignes' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// POST /api/quotes/:id/duplicate
router.post('/:id/duplicate', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, user_1, organizationId_1, existing_1, newQuote, e_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                id = req.params.id;
                user_1 = req.user;
                organizationId_1 = user_1 === null || user_1 === void 0 ? void 0 : user_1.organizationId;
                if (!organizationId_1)
                    return [2 /*return*/, res.status(400).json({ error: 'Organisation non spécifiée' })];
                return [4 /*yield*/, prisma.quote.findFirst({
                        where: { id: id, organizationId: organizationId_1 },
                        include: { items: true },
                    })];
            case 1:
                existing_1 = _a.sent();
                if (!existing_1)
                    return [2 /*return*/, res.status(404).json({ error: 'Devis introuvable' })];
                return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var created, _i, _a, it;
                        var _b;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0: return [4 /*yield*/, tx.quote.create({
                                        data: {
                                            organizationId: organizationId_1,
                                            leadId: existing_1.leadId,
                                            blockId: existing_1.blockId,
                                            createdById: (_b = user_1 === null || user_1 === void 0 ? void 0 : user_1.userId) !== null && _b !== void 0 ? _b : null,
                                            number: generateQuoteNumber(),
                                            status: QuoteStatus.DRAFT,
                                            title: existing_1.title ? "".concat(existing_1.title, " (copie)") : null,
                                            version: 1,
                                            currency: existing_1.currency,
                                            validUntil: existing_1.validUntil,
                                            notes: existing_1.notes,
                                            data: existing_1.data,
                                            totals: existing_1.totals,
                                        },
                                    })];
                                case 1:
                                    created = _c.sent();
                                    _i = 0, _a = existing_1.items;
                                    _c.label = 2;
                                case 2:
                                    if (!(_i < _a.length)) return [3 /*break*/, 5];
                                    it = _a[_i];
                                    return [4 /*yield*/, tx.quoteItem.create({
                                            data: {
                                                quoteId: created.id,
                                                order: it.order,
                                                label: it.label,
                                                description: it.description,
                                                quantity: it.quantity,
                                                unitPrice: it.unitPrice,
                                                discountPct: it.discountPct,
                                                taxPct: it.taxPct,
                                                totalExcl: it.totalExcl,
                                                totalIncl: it.totalIncl,
                                            },
                                        })];
                                case 3:
                                    _c.sent();
                                    _c.label = 4;
                                case 4:
                                    _i++;
                                    return [3 /*break*/, 2];
                                case 5: return [2 /*return*/, created];
                            }
                        });
                    }); })];
            case 2:
                newQuote = _a.sent();
                res.status(201).json(newQuote);
                return [3 /*break*/, 4];
            case 3:
                e_7 = _a.sent();
                console.error('[QUOTES] duplicate error', e_7);
                res.status(500).json({ error: 'Erreur lors de la duplication du devis' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Phase 2: génération document -> stub pour l'instant
router.post('/:id/generate-document', function (_req, res) {
    return res.status(501).json({ error: 'Génération de document non encore implémentée (Phase 2)' });
});
exports.default = router;
