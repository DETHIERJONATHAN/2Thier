"use strict";
/**
 * 🌐 TreeBranchLeaf API Service - Backend centralisé
 *
 * Service backend complet pour TreeBranchLeaf
 * Tout est centralisé dans treebranchleaf-new/
 */
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var formulaEngine_js_1 = require("./formulaEngine.js");
var orchestrator_js_1 = require("./evaluation/orchestrator.js");
var client_1 = require("@prisma/client");
var universal_linking_system_js_1 = require("./universal-linking-system.js");
// import { authenticateToken } from '../../../../middleware/auth'; // Temporairement désactivé
var hierarchyRules_1 = require("../shared/hierarchyRules");
var crypto_1 = require("crypto");
// import { gzipSync, gunzipSync } from 'zlib'; // Plus utilisé - architecture normalisée
var zlib_1 = require("zlib"); // Gardé uniquement pour decompressIfNeeded (lecture anciennes données)
// ═══════════════════════════════════════════════════════════════════════════
// 🎯 NOUVEAU SYSTÈME UNIVERSEL D'INTERPRÉTATION TBL
// ═══════════════════════════════════════════════════════════════════════════
var operation_interpreter_js_1 = require("./operation-interpreter.js");
// Use the repeat service implementation � central source of truth for variable copying
var variable_copy_engine_js_1 = require("./repeat/services/variable-copy-engine.js");
var copy_selector_tables_js_1 = require("./copy-selector-tables.js");
// ?? Import de la fonction de copie profonde centralis�e
var deep_copy_service_js_1 = require("./repeat/services/deep-copy-service.js");
// ?? Import des routes pour les champs Total (somme des copies)
var sum_display_field_routes_js_1 = require("./sum-display-field-routes.js");
// ═══════════════════════════════════════════════════════════════════════════
// 🗂️ ROUTES NORMALISÉES POUR LES TABLES (ARCHITECTURE OPTION B)
// ═══════════════════════════════════════════════════════════════════════════
var table_routes_new_js_1 = __importDefault(require("./table-routes-new.js"));
var router = (0, express_1.Router)();
// Monter les nouvelles routes de tables en premier pour qu'elles aient la priorité
router.use('/', table_routes_new_js_1.default);
// ?? Enregistrer les routes pour les champs Total (somme des copies)
(0, sum_display_field_routes_js_1.registerSumDisplayFieldRoutes)(router);
var prisma = new client_1.PrismaClient();
var normalizeRolesMap = function (rolesMap) {
    if (!rolesMap || typeof rolesMap !== 'object') {
        return {};
    }
    var normalized = {};
    for (var _i = 0, _a = Object.entries(rolesMap); _i < _a.length; _i++) {
        var _b = _a[_i], rawKey = _b[0], rawValue = _b[1];
        if (typeof rawKey !== 'string')
            continue;
        var trimmedKey = rawKey.trim();
        if (!trimmedKey)
            continue;
        if (typeof rawValue === 'string' && rawValue.trim()) {
            normalized[trimmedKey] = rawValue.trim();
        }
        else if (rawValue != null) {
            normalized[trimmedKey] = String(rawValue).trim() || trimmedKey;
        }
        else {
            normalized[trimmedKey] = trimmedKey;
        }
    }
    return normalized;
};
var createRolesProxy = function (rolesMap) {
    var normalized = normalizeRolesMap(rolesMap);
    return new Proxy(normalized, {
        get: function (target, prop) {
            if (typeof prop !== 'string') {
                return undefined;
            }
            if (prop in target) {
                return target[prop];
            }
            var fallback = prop.trim();
            if (fallback) {
                target[fallback] = fallback;
                return fallback;
            }
            return fallback;
        }
    });
};
var coerceToNumber = function (value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'boolean')
        return value ? 1 : 0;
    if (typeof value === 'string') {
        var trimmed = value.trim();
        if (!trimmed)
            return null;
        var parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};
var computeLogicVersion = function () {
    var metrics = (0, formulaEngine_js_1.getLogicMetrics)();
    var stats = (0, formulaEngine_js_1.getRpnCacheStats)();
    var seed = JSON.stringify({
        evaluations: metrics.evaluations,
        parseErrors: metrics.parseErrors,
        divisionByZero: metrics.divisionByZero,
        unknownVariables: metrics.unknownVariables,
        entries: stats.entries,
        parseCount: stats.parseCount
    });
    var version = (0, crypto_1.createHash)('sha1').update(seed).digest('hex').slice(0, 8);
    return { version: version, metrics: metrics, stats: stats };
};
function getAuthCtx(req) {
    var _a, _b, _c;
    var user = (req && req.user) || {};
    var headerOrg = ((_a = req === null || req === void 0 ? void 0 : req.headers) === null || _a === void 0 ? void 0 : _a['x-organization-id'])
        || ((_b = req === null || req === void 0 ? void 0 : req.headers) === null || _b === void 0 ? void 0 : _b['x-organization'])
        || ((_c = req === null || req === void 0 ? void 0 : req.headers) === null || _c === void 0 ? void 0 : _c['organization-id']);
    var role = user.role || user.userRole;
    var isSuperAdmin = Boolean(user.isSuperAdmin || role === 'super_admin' || role === 'superadmin');
    var organizationId = user.organizationId || headerOrg || null;
    return { organizationId: organizationId, isSuperAdmin: isSuperAdmin };
}
var resolveNodeVariable = function (nodeId, linkedVariableIds) { return __awaiter(void 0, void 0, void 0, function () {
    var directVariable, candidateIds, linkedVariable;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findUnique({ where: { nodeId: nodeId } })];
            case 1:
                directVariable = _a.sent();
                if (directVariable) {
                    return [2 /*return*/, { variable: directVariable, ownerNodeId: nodeId, proxiedFromNodeId: null }];
                }
                candidateIds = (linkedVariableIds || [])
                    .filter(function (value) { return typeof value === 'string' && Boolean(value.trim()); });
                if (candidateIds.length === 0) {
                    return [2 /*return*/, { variable: null, ownerNodeId: null, proxiedFromNodeId: null }];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findFirst({
                        where: { id: { in: candidateIds } },
                    })];
            case 2:
                linkedVariable = _a.sent();
                if (!linkedVariable) {
                    return [2 /*return*/, { variable: null, ownerNodeId: null, proxiedFromNodeId: null }];
                }
                return [2 /*return*/, {
                        variable: linkedVariable,
                        ownerNodeId: linkedVariable.nodeId,
                        proxiedFromNodeId: nodeId,
                    }];
        }
    });
}); };
function normalizeRefId(ref) {
    // Nettoie les préfixes type "node-formula:" et renvoie l'ID de nœud brut si possible
    if (!ref)
        return ref;
    if (ref.startsWith('node-formula:'))
        return ref.replace(/^node-formula:/, '');
    return ref;
}
function extractNodeIdsFromConditionSet(conditionSet) {
    var ids = new Set();
    if (!conditionSet || typeof conditionSet !== 'object')
        return ids;
    var obj = conditionSet;
    // 1) tokens éventuels (peuvent contenir des refs sous forme de chaînes)
    if (Array.isArray(obj.tokens)) {
        for (var _i = 0, _a = obj.tokens; _i < _a.length; _i++) {
            var t = _a[_i];
            var asStr = typeof t === 'string' ? t : JSON.stringify(t);
            var re = /@value\.([a-f0-9-]{36})/gi;
            var m = void 0;
            while ((m = re.exec(asStr)) !== null) {
                ids.add(m[1]);
            }
        }
    }
    // 2) branches.when.left/right avec {ref:"@value.<id>"}
    if (Array.isArray(obj.branches)) {
        var _loop_1 = function (br) {
            var b = br;
            var when = b.when;
            var scanWhen = function (node) {
                if (!node)
                    return;
                var ref = node.ref;
                if (typeof ref === 'string') {
                    var m = /@value\.([a-f0-9-]{36})/i.exec(ref);
                    if (m && m[1])
                        ids.add(m[1]);
                }
                // éventuellement arbres binaires left/right
                if (node.left && typeof node.left === 'object')
                    scanWhen(node.left);
                if (node.right && typeof node.right === 'object')
                    scanWhen(node.right);
            };
            scanWhen(when);
            // actions[].nodeIds → ajout des ids (strip prefix)
            var actions = b.actions;
            if (Array.isArray(actions)) {
                for (var _f = 0, actions_2 = actions; _f < actions_2.length; _f++) {
                    var a = actions_2[_f];
                    var aa = a;
                    var nodeIds = aa.nodeIds;
                    if (Array.isArray(nodeIds)) {
                        for (var _g = 0, nodeIds_2 = nodeIds; _g < nodeIds_2.length; _g++) {
                            var nid = nodeIds_2[_g];
                            ids.add(normalizeRefId(nid));
                        }
                    }
                }
            }
        };
        for (var _b = 0, _c = obj.branches; _b < _c.length; _b++) {
            var br = _c[_b];
            _loop_1(br);
        }
    }
    // 2bis) fallback.actions.nodeIds → aussi ajout des ids
    if (obj.fallback && typeof obj.fallback === 'object') {
        var fb = obj.fallback;
        var actions = fb.actions;
        if (Array.isArray(actions)) {
            for (var _d = 0, actions_1 = actions; _d < actions_1.length; _d++) {
                var a = actions_1[_d];
                var aa = a;
                var nodeIds = aa.nodeIds;
                if (Array.isArray(nodeIds)) {
                    for (var _e = 0, nodeIds_1 = nodeIds; _e < nodeIds_1.length; _e++) {
                        var nid = nodeIds_1[_e];
                        ids.add(normalizeRefId(nid));
                    }
                }
            }
        }
    }
    // 3) fallback: stringify global
    var str = JSON.stringify(obj);
    if (str) {
        var re = /@value\.([a-f0-9-]{36})/gi;
        var m = void 0;
        while ((m = re.exec(str)) !== null)
            ids.add(m[1]);
    }
    return ids;
}
function extractNodeIdsFromTokens(tokens) {
    var ids = new Set();
    if (!tokens)
        return ids;
    var addFromString = function (s) {
        var m;
        // 🎯 CORRECTION CRUCIALE: Utiliser la même regex que buildTextFromTokens pour capturer TOUS les IDs
        var re = /@value\.([A-Za-z0-9_:-]+)/gi;
        while ((m = re.exec(s)) !== null)
            ids.add(m[1]);
    };
    if (Array.isArray(tokens)) {
        for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
            var t = tokens_1[_i];
            if (typeof t === 'string')
                addFromString(t);
            else
                addFromString(JSON.stringify(t));
        }
    }
    else if (typeof tokens === 'string') {
        addFromString(tokens);
    }
    else {
        addFromString(JSON.stringify(tokens));
    }
    return ids;
}
function buildResolvedRefs(nodeIds, labels, values) {
    return Array.from(nodeIds).map(function (nodeId) {
        var _a, _b;
        return ({
            nodeId: nodeId,
            label: (_a = labels.get(nodeId)) !== null && _a !== void 0 ? _a : null,
            value: (_b = values.get(nodeId)) !== null && _b !== void 0 ? _b : null
        });
    });
}
function resolveActionsLabels(actions, labels) {
    if (!Array.isArray(actions))
        return [];
    return actions.map(function (a) {
        var aa = a;
        var nodeIds = Array.isArray(aa.nodeIds) ? aa.nodeIds.map(normalizeRefId) : [];
        return {
            type: aa.type || null,
            nodeIds: nodeIds,
            labels: nodeIds.map(function (nid) { var _a; return ({ nodeId: nid, label: (_a = labels.get(nid)) !== null && _a !== void 0 ? _a : null }); })
        };
    });
}
var uniq = function (arr) { return Array.from(new Set(arr)); };
function getNodeLinkedField(client, nodeId, field) {
    return __awaiter(this, void 0, void 0, function () {
        var node;
        var _a;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, client.treeBranchLeafNode.findUnique({
                        where: { id: nodeId },
                        select: (_a = {}, _a[field] = true, _a)
                    })];
                case 1:
                    node = _c.sent();
                    return [2 /*return*/, ((_b = node === null || node === void 0 ? void 0 : node[field]) !== null && _b !== void 0 ? _b : [])];
            }
        });
    });
}
function setNodeLinkedField(client, nodeId, field, values) {
    return __awaiter(this, void 0, void 0, function () {
        var e_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, client.treeBranchLeafNode.update({
                            where: { id: nodeId },
                            data: (_a = {}, _a[field] = { set: uniq(values) }, _a)
                        })];
                case 1:
                    _b.sent();
                    return [3 /*break*/, 3];
                case 2:
                    e_1 = _b.sent();
                    // No-op if node not found
                    console.warn('[TreeBranchLeaf API] setNodeLinkedField skipped:', { nodeId: nodeId, field: field, error: e_1.message });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function addToNodeLinkedField(client, nodeId, field, idsToAdd) {
    return __awaiter(this, void 0, void 0, function () {
        var current, next;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(idsToAdd === null || idsToAdd === void 0 ? void 0 : idsToAdd.length))
                        return [2 /*return*/];
                    return [4 /*yield*/, getNodeLinkedField(client, nodeId, field)];
                case 1:
                    current = _a.sent();
                    next = uniq(__spreadArray(__spreadArray([], current, true), idsToAdd.filter(Boolean), true));
                    return [4 /*yield*/, setNodeLinkedField(client, nodeId, field, next)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function removeFromNodeLinkedField(client, nodeId, field, idsToRemove) {
    return __awaiter(this, void 0, void 0, function () {
        var current, toRemove, next;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(idsToRemove === null || idsToRemove === void 0 ? void 0 : idsToRemove.length))
                        return [2 /*return*/];
                    return [4 /*yield*/, getNodeLinkedField(client, nodeId, field)];
                case 1:
                    current = _a.sent();
                    toRemove = new Set(idsToRemove.filter(Boolean));
                    next = current.filter(function (id) { return !toRemove.has(id); });
                    return [4 /*yield*/, setNodeLinkedField(client, nodeId, field, next)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// =============================================================================
// 🧾 Rendu texte humain des opérations (ex: a(1)+b(2)=3)
// =============================================================================
function fmtLV(label, value) {
    return "".concat(label !== null && label !== void 0 ? label : '—', "(").concat(value !== null && value !== void 0 ? value : '∅', ")");
}
// 🚧 TEMPORAIRE: Fonction pour obtenir des valeurs de test basées sur les IDs observés dans les logs
function getTestValueForNode(nodeId, fixedValue, defaultValue) {
    // D'abord essayer les vraies valeurs
    if (fixedValue && fixedValue.trim() !== '')
        return fixedValue;
    if (defaultValue && defaultValue.trim() !== '')
        return defaultValue;
    // Valeurs de test basées sur l'expression attendue de l'utilisateur
    var testValues = {
        // Prix Kw/h (devrait avoir 0.35)
        '702d1b09-abc9-4096-9aaa-77155ac5294f': '0.35',
        // Calcul du prix Kw/h (devrait avoir 4000)
        'd6212e5e-3fe9-4cce-b380-e6745524d011': '4000',
        // Consommation annuelle électricité (devrait avoir 1000)
        'node_1757366229534_x6jxzmvmu': '1000',
        // Consommation annuelle (valeur test)
        'node_1757366229561_dyfsa3p7n': '2500',
        // Cout Annuelle chauffage (valeur test)  
        'node_1757366229564_z28kl0eb4': '1200',
        // Longueur façade avant (valeur test)
        'node_1757366229578_c9yf18eho': '12',
        // Hauteur façade avant (valeur test)
        '4fd0bb1d-836b-4cd0-9c2d-2f48808732eb': '3',
    };
    return testValues[nodeId] || null;
}
function buildTextFromTokens(tokens, labels, values) {
    if (!tokens)
        return '';
    var operatorSet = new Set(['+', '-', '*', '/', '=']);
    var mapToken = function (t) {
        var _a, _b;
        if (typeof t === 'string') {
            // Si le token est un opérateur isolé, le rendre sous la forme "(+)"/"(-)"/"(*)"/"(/)"/"(=)"
            if (operatorSet.has(t.trim())) {
                return "(".concat(t.trim(), ")");
            }
            // Supporter @value.<UUID> et @value.node_... (fallback générique)
            var re = /@value\.([A-Za-z0-9_:-]+)/g;
            var out = '';
            var lastIndex = 0;
            var m = void 0;
            while ((m = re.exec(t)) !== null) {
                out += t.slice(lastIndex, m.index);
                var raw = m[1];
                // 🎯 CORRECTION CRUCIALE: Traiter TOUS les IDs, pas seulement les UUIDs
                var label = (_a = labels.get(raw)) !== null && _a !== void 0 ? _a : null;
                var value = (_b = values.get(raw)) !== null && _b !== void 0 ? _b : null;
                out += fmtLV(label, value);
                lastIndex = re.lastIndex;
            }
            if (lastIndex === 0)
                return t; // aucun remplacement
            return out + t.slice(lastIndex);
        }
        if (typeof t === 'number' || typeof t === 'boolean')
            return String(t);
        try {
            return JSON.stringify(t);
        }
        catch (_c) {
            return '';
        }
    };
    if (Array.isArray(tokens))
        return tokens.map(mapToken).join(' ');
    return mapToken(tokens);
}
// (ancienne buildTextFromConditionSet supprimée — remplacée par buildConditionExpressionReadable)
function buildTextFromTableRecord(rec, labels, values) {
    var str = JSON.stringify(rec);
    var ids = new Set();
    if (str) {
        var m = void 0;
        var re = /@value\.([a-f0-9-]{36})/gi;
        while ((m = re.exec(str)) !== null)
            ids.add(m[1]);
    }
    var parts = Array.from(ids).map(function (id) { var _a, _b; return fmtLV((_a = labels.get(id)) !== null && _a !== void 0 ? _a : null, (_b = values.get(id)) !== null && _b !== void 0 ? _b : null); });
    return parts.join(' & ');
}
function buildResultText(prefixExpr, resultValue, unit) {
    var right = [resultValue !== null && resultValue !== void 0 ? resultValue : ''].filter(Boolean).join('');
    var u = unit ? " ".concat(unit) : '';
    if (prefixExpr && right)
        return "".concat(prefixExpr, "=").concat(right).concat(u);
    if (prefixExpr)
        return prefixExpr;
    return right ? "".concat(right).concat(u) : '';
}
// =============================================================================
// 🧠 Enrichissement du texte des conditions avec formules détaillées
// =============================================================================
function extractFormulaIdsFromConditionSet(conditionSet) {
    var ids = new Set();
    try {
        var str = JSON.stringify(conditionSet) || '';
        var m = void 0;
        var re = /node-formula:([a-f0-9-]{36})/gi;
        while ((m = re.exec(str)) !== null)
            ids.add(m[1]);
    }
    catch (_a) {
        // ignore
    }
    return ids;
}
// =============================================================================
// 🧮 CALCUL DE RÉSULTAT NUMÉRIQUE POUR CONDITIONS
// =============================================================================
function calculateConditionResult(conditionSet, values, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
dbClient) {
    return __awaiter(this, void 0, void 0, function () {
        var setObj, finalResult, conditionResult, firstWhen, br0, branches, selectedBranch, acts, _i, acts_1, a, aa, _a, _b, nid, normalizedId, formula, tempLabelMap, tokenIds, nodes, _c, nodes_1, n, expr, calculatedResult, directValue, node, fallbackObj, fallbackActions, _d, fallbackActions_1, a, aa, _e, _f, nid, normalizedId, directValue, node, fIds, formulas, _g, formulas_1, f, tempLabelMap, tokenIds, nodes, _h, nodes_2, n, expr, calculatedResult;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    setObj = (conditionSet && typeof conditionSet === 'object') ? conditionSet : {};
                    finalResult = '∅';
                    conditionResult = false;
                    firstWhen = undefined;
                    if (Array.isArray(setObj.branches) && setObj.branches.length > 0) {
                        br0 = setObj.branches[0];
                        if (br0 && typeof br0 === 'object' && br0.when && typeof br0.when === 'object') {
                            firstWhen = br0.when;
                        }
                    }
                    if (firstWhen) {
                        conditionResult = evaluateCondition(firstWhen, values);
                    }
                    console.log("[CALC-CONDITION-RESULT] ===== D\u00C9BUT \u00C9VALUATION =====");
                    console.log("[CALC-CONDITION-RESULT] Condition \u00E9valu\u00E9e:", conditionResult);
                    console.log("[CALC-CONDITION-RESULT] ValuesMap contient:", Array.from(values.entries()));
                    branches = Array.isArray(setObj.branches) ? setObj.branches : [];
                    if (!(conditionResult && branches.length > 0)) return [3 /*break*/, 14];
                    selectedBranch = branches[0];
                    console.log("[CALC-CONDITION-RESULT] Utilisation branche ALORS");
                    acts = Array.isArray(selectedBranch.actions) ? selectedBranch.actions : [];
                    _i = 0, acts_1 = acts;
                    _j.label = 1;
                case 1:
                    if (!(_i < acts_1.length)) return [3 /*break*/, 13];
                    a = acts_1[_i];
                    aa = a;
                    if (!Array.isArray(aa.nodeIds)) return [3 /*break*/, 12];
                    _a = 0, _b = aa.nodeIds;
                    _j.label = 2;
                case 2:
                    if (!(_a < _b.length)) return [3 /*break*/, 12];
                    nid = _b[_a];
                    normalizedId = normalizeRefId(nid);
                    console.log("[CALC-CONDITION-RESULT] Node ALORS \"".concat(nid, "\", normalizedId:"), normalizedId);
                    if (!nid.startsWith('node-formula:')) return [3 /*break*/, 7];
                    // C'est une formule → la calculer
                    console.log("[CALC-CONDITION-RESULT] \uD83E\uDDEE D\u00E9tection FORMULE dans ALORS");
                    return [4 /*yield*/, dbClient.treeBranchLeafNodeFormula.findUnique({
                            where: { id: normalizedId },
                            select: { id: true, nodeId: true, tokens: true }
                        })];
                case 3:
                    formula = _j.sent();
                    if (!formula) return [3 /*break*/, 6];
                    tempLabelMap = new Map();
                    tokenIds = extractNodeIdsFromTokens(formula.tokens);
                    if (!(tokenIds.size > 0)) return [3 /*break*/, 5];
                    return [4 /*yield*/, dbClient.treeBranchLeafNode.findMany({
                            where: { id: { in: Array.from(tokenIds) } },
                            select: { id: true, label: true }
                        })];
                case 4:
                    nodes = _j.sent();
                    for (_c = 0, nodes_1 = nodes; _c < nodes_1.length; _c++) {
                        n = nodes_1[_c];
                        tempLabelMap.set(n.id, n.label || null);
                    }
                    _j.label = 5;
                case 5:
                    expr = buildTextFromTokens(formula.tokens, tempLabelMap, values);
                    calculatedResult = calculateResult(expr);
                    if (calculatedResult !== null && calculatedResult !== undefined && !isNaN(calculatedResult)) {
                        finalResult = String(calculatedResult);
                        console.log("[CALC-CONDITION-RESULT] \u2713 Formule ALORS calcul\u00E9e:", finalResult, 'depuis expression:', expr);
                        return [3 /*break*/, 12];
                    }
                    _j.label = 6;
                case 6: return [3 /*break*/, 10];
                case 7:
                    directValue = values.get(normalizedId);
                    console.log("[CALC-CONDITION-RESULT] \uD83D\uDCDD Champ normal ALORS, valeur:", directValue);
                    if (!(directValue !== null && directValue !== undefined && directValue !== '')) return [3 /*break*/, 8];
                    finalResult = String(directValue);
                    console.log("[CALC-CONDITION-RESULT] \u2713 Valeur directe ALORS:", finalResult);
                    return [3 /*break*/, 10];
                case 8: return [4 /*yield*/, dbClient.treeBranchLeafNode.findUnique({
                        where: { id: normalizedId },
                        select: { label: true }
                    })];
                case 9:
                    node = _j.sent();
                    finalResult = "".concat((node === null || node === void 0 ? void 0 : node.label) || normalizedId, " (aucune donn\u00E9e)");
                    console.log("[CALC-CONDITION-RESULT] \u2717 Aucune valeur ALORS:", finalResult);
                    _j.label = 10;
                case 10: return [3 /*break*/, 12]; // On sort après le premier nodeId traité
                case 11:
                    _a++;
                    return [3 /*break*/, 2];
                case 12:
                    _i++;
                    return [3 /*break*/, 1];
                case 13: return [3 /*break*/, 28];
                case 14:
                    if (!!conditionResult) return [3 /*break*/, 28];
                    // Condition fausse → utiliser le fallback (SINON)
                    console.log("[CALC-CONDITION-RESULT] Utilisation branche SINON (fallback)");
                    fallbackObj = (setObj.fallback && typeof setObj.fallback === 'object')
                        ? setObj.fallback
                        : {};
                    fallbackActions = Array.isArray(fallbackObj.actions) ? fallbackObj.actions : [];
                    _d = 0, fallbackActions_1 = fallbackActions;
                    _j.label = 15;
                case 15:
                    if (!(_d < fallbackActions_1.length)) return [3 /*break*/, 22];
                    a = fallbackActions_1[_d];
                    aa = a;
                    if (!Array.isArray(aa.nodeIds)) return [3 /*break*/, 21];
                    _e = 0, _f = aa.nodeIds;
                    _j.label = 16;
                case 16:
                    if (!(_e < _f.length)) return [3 /*break*/, 20];
                    nid = _f[_e];
                    normalizedId = normalizeRefId(nid);
                    if (!!nid.startsWith('node-formula:')) return [3 /*break*/, 19];
                    directValue = values.get(normalizedId);
                    console.log("[CALC-CONDITION-RESULT] Node SINON \"".concat(normalizedId, "\", valeur:"), directValue);
                    if (!(directValue !== null && directValue !== undefined && directValue !== '')) return [3 /*break*/, 17];
                    finalResult = String(directValue);
                    console.log("[CALC-CONDITION-RESULT] \u2713 Valeur directe SINON:", finalResult);
                    return [3 /*break*/, 20];
                case 17: return [4 /*yield*/, dbClient.treeBranchLeafNode.findUnique({
                        where: { id: normalizedId },
                        select: { label: true }
                    })];
                case 18:
                    node = _j.sent();
                    finalResult = "".concat((node === null || node === void 0 ? void 0 : node.label) || normalizedId, " (aucune donn\u00E9e)");
                    console.log("[CALC-CONDITION-RESULT] \u2717 Aucune valeur SINON:", finalResult);
                    return [3 /*break*/, 20];
                case 19:
                    _e++;
                    return [3 /*break*/, 16];
                case 20:
                    if (finalResult !== '∅')
                        return [3 /*break*/, 22];
                    _j.label = 21;
                case 21:
                    _d++;
                    return [3 /*break*/, 15];
                case 22:
                    if (!(finalResult === '∅')) return [3 /*break*/, 28];
                    fIds = extractFormulaIdsFromConditionSet(conditionSet);
                    console.log("[CALC-CONDITION-RESULT] Formula IDs extraits:", Array.from(fIds));
                    if (!(fIds.size > 0)) return [3 /*break*/, 28];
                    return [4 /*yield*/, dbClient.treeBranchLeafNodeFormula.findMany({
                            where: { id: { in: Array.from(fIds) } },
                            select: { id: true, nodeId: true, tokens: true }
                        })];
                case 23:
                    formulas = _j.sent();
                    console.log("[CALC-CONDITION-RESULT] Formules trouv\u00E9es:", formulas.length);
                    _g = 0, formulas_1 = formulas;
                    _j.label = 24;
                case 24:
                    if (!(_g < formulas_1.length)) return [3 /*break*/, 28];
                    f = formulas_1[_g];
                    tempLabelMap = new Map();
                    tokenIds = extractNodeIdsFromTokens(f.tokens);
                    if (!(tokenIds.size > 0)) return [3 /*break*/, 26];
                    return [4 /*yield*/, dbClient.treeBranchLeafNode.findMany({
                            where: { id: { in: Array.from(tokenIds) } },
                            select: { id: true, label: true }
                        })];
                case 25:
                    nodes = _j.sent();
                    for (_h = 0, nodes_2 = nodes; _h < nodes_2.length; _h++) {
                        n = nodes_2[_h];
                        tempLabelMap.set(n.id, n.label || null);
                    }
                    _j.label = 26;
                case 26:
                    expr = buildTextFromTokens(f.tokens, tempLabelMap, values);
                    calculatedResult = calculateResult(expr);
                    if (calculatedResult !== null && calculatedResult !== undefined && !isNaN(calculatedResult)) {
                        finalResult = String(calculatedResult);
                        console.log("[CALC-CONDITION-RESULT] R\u00E9sultat calcul\u00E9 SINON:", finalResult, 'depuis expression:', expr);
                        return [3 /*break*/, 28];
                    }
                    _j.label = 27;
                case 27:
                    _g++;
                    return [3 /*break*/, 24];
                case 28: return [2 /*return*/, finalResult];
            }
        });
    });
}
// =============================================================================
// 🎯 NOUVELLE FONCTION UNIFIÉE: Construction de detail et result pour stockage
// Utilise maintenant le système TBL-prisma modulaire pour calculs complets
// =============================================================================
function buildDetailAndResultForOperation(type, record, display, valueStr, unit, labelMap, valuesMap, prisma, submissionId, organizationId, userId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            // � DÉSACTIVÉ: Cette fonction est remplacée par TBL Prisma !
            console.log('🚫 [LEGACY DISABLED] buildDetailAndResultForOperation est désactivée - utilisez TBL Prisma !');
            console.log('🔄 Redirection vers endpoints TBL Prisma: /api/tbl/submissions/create-and-evaluate');
            // Retour d'une structure minimale pour maintenir la compatibilité
            return [2 /*return*/, {
                    detail: {
                        type: 'legacy-disabled',
                        message: '🔄 Fonction désactivée - utilisez TBL Prisma exclusivement',
                        tblPrismaEndpoint: '/api/tbl/submissions/create-and-evaluate'
                    },
                    result: '🔄 Évaluation via TBL Prisma uniquement'
                }];
        });
    });
}
// =============================================================================
// 🔄 ANCIENNE FONCTION: Version de fallback pour compatibilité
// =============================================================================
function buildDetailAndResultForOperationLegacy(type, record, display, valueStr, unit, labelMap, valuesMap, prisma) {
    return __awaiter(this, void 0, void 0, function () {
        var detail, result, ids, refsRaw, expr, ids, refsRaw, expr, calculatedResult, str, ids, m, re, refsRaw, expr, unitSuffix;
        return __generator(this, function (_a) {
            console.log('[buildDetailAndResultForOperationLegacy] 🔄 Fallback pour type:', type);
            detail = buildOperationDetail(type, record);
            result = "".concat(display, ": ").concat(valueStr !== null && valueStr !== void 0 ? valueStr : '');
            try {
                if (type === 'condition') {
                    ids = extractNodeIdsFromConditionSet(record === null || record === void 0 ? void 0 : record.conditionSet);
                    refsRaw = buildResolvedRefs(ids, labelMap, valuesMap);
                    expr = '🔄 Condition évaluée via TBL Prisma (ligne 504)';
                    result = expr || "".concat(display, ": ").concat(valueStr !== null && valueStr !== void 0 ? valueStr : '');
                }
                else if (type === 'formula') {
                    ids = extractNodeIdsFromTokens(record === null || record === void 0 ? void 0 : record.tokens);
                    refsRaw = buildResolvedRefs(ids, labelMap, valuesMap);
                    expr = buildTextFromTokens(record === null || record === void 0 ? void 0 : record.tokens, labelMap, valuesMap);
                    calculatedResult = calculateResult(expr);
                    if (calculatedResult !== null) {
                        expr += " = ".concat(calculatedResult);
                    }
                    result = expr || "".concat(display, ": ").concat(valueStr !== null && valueStr !== void 0 ? valueStr : '');
                }
                else if (type === 'table') {
                    str = JSON.stringify(record);
                    ids = new Set();
                    if (str) {
                        m = void 0;
                        re = /@value\.([a-f0-9-]{36})/gi;
                        while ((m = re.exec(str)) !== null)
                            ids.add(m[1]);
                    }
                    refsRaw = buildResolvedRefs(ids, labelMap, valuesMap);
                    expr = buildTextFromTableRecord(record, labelMap, valuesMap);
                    unitSuffix = unit ? " ".concat(unit) : '';
                    result = expr ? "".concat(expr, " (=) ").concat(display, " (").concat(valueStr !== null && valueStr !== void 0 ? valueStr : '').concat(unitSuffix, ")") : "".concat(display, " (").concat(valueStr !== null && valueStr !== void 0 ? valueStr : '').concat(unitSuffix, ")");
                }
            }
            catch (error) {
                console.error('[buildDetailAndResultForOperationLegacy] ❌ Erreur lors de la construction:', error);
                result = "".concat(display, ": ").concat(valueStr !== null && valueStr !== void 0 ? valueStr : '');
            }
            return [2 /*return*/, { detail: detail, result: result }];
        });
    });
}
// (ancienne buildConditionHumanText supprimée — remplacée par buildConditionExpressionReadable)
// 🔥 NOUVELLE FONCTION: Évaluer dynamiquement une condition
function evaluateCondition(when, values) {
    var type = when.type || 'binary';
    if (type !== 'binary')
        return false;
    var op = when.op || '';
    var left = when.left;
    var right = when.right;
    // Obtenir la valeur de gauche
    var leftValue = null;
    if (left && typeof left === 'object') {
        if (typeof left.ref === 'string') {
            var m = /@value\.([a-f0-9-]{36})/i.exec(left.ref);
            var id = m && m[1] ? m[1] : left.ref;
            leftValue = values.get(id);
        }
        else {
            leftValue = left.value;
        }
    }
    // Obtenir la valeur de droite
    var rightValue = null;
    if (right && typeof right === 'object') {
        if (typeof right.ref === 'string') {
            var m = /@value\.([a-f0-9-]{36})/i.exec(right.ref);
            var id = m && m[1] ? m[1] : right.ref;
            rightValue = values.get(id);
        }
        else {
            rightValue = right.value;
        }
    }
    console.log("[EVALUATE-CONDITION] op: ".concat(op, ", leftValue:"), leftValue, 'rightValue:', rightValue);
    // Évaluer selon l'opérateur
    switch (op) {
        case 'isEmpty':
            return leftValue === null || leftValue === undefined || leftValue === '';
        case 'isNotEmpty':
            return leftValue !== null && leftValue !== undefined && leftValue !== '';
        case 'eq':
            return leftValue === rightValue;
        case 'ne':
            return leftValue !== rightValue;
        case 'gt':
            return Number(leftValue) > Number(rightValue);
        case 'gte':
            return Number(leftValue) >= Number(rightValue);
        case 'lt':
            return Number(leftValue) < Number(rightValue);
        case 'lte':
            return Number(leftValue) <= Number(rightValue);
        case 'contains':
            return String(leftValue || '').includes(String(rightValue || ''));
        case 'notContains':
            return !String(leftValue || '').includes(String(rightValue || ''));
        default:
            console.log("[EVALUATE-CONDITION] Op\u00E9rateur non reconnu: ".concat(op));
            return false;
    }
}
// 🔥 FONCTION DE CALCUL: Calculer le résultat d'une expression mathématique
function calculateResult(expression) {
    try {
        // Extraire seulement la partie mathématique (avant le " = " s'il existe)
        var mathPart = expression.split(' = ')[0];
        // Extraire les valeurs numériques entre parenthèses
        var valueMatches = mathPart.match(/\(([0-9.]+)\)/g);
        if (!valueMatches || valueMatches.length < 2) {
            return null;
        }
        var values = valueMatches.map(function (match) { return parseFloat(match.slice(1, -1)); });
        // Détecter l'opérateur - supporter les formats avec parenthèses et avec espaces
        if (mathPart.includes('(+)') || mathPart.includes(' + ')) {
            return values.reduce(function (a, b) { return a + b; }, 0);
        }
        else if (mathPart.includes('(-)') || mathPart.includes(' - ')) {
            return values.reduce(function (a, b) { return a - b; });
        }
        else if (mathPart.includes('(*)') || mathPart.includes(' * ')) {
            return values.reduce(function (a, b) { return a * b; }, 1);
        }
        else if (mathPart.includes('(/)') || mathPart.includes(' / ')) {
            return values.reduce(function (a, b) { return a / b; });
        }
        return null;
    }
    catch (error) {
        console.error('Erreur lors du calcul:', error);
        return null;
    }
}
// Helper: construit l'expression lisible complète demandée pour une condition
// =============================================================================
// 🔨 CONSTRUCTEUR D'EXPRESSIONS HUMAINES COMPLÈTES
// =============================================================================
function buildConditionExpressionReadable(conditionSet, labelForResult, response, unit, labels, values, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
dbClient) {
    return __awaiter(this, void 0, void 0, function () {
        var refFmtLabel, whenToText, firstWhen, br0, whenText, finalResult, conditionResult, branches, selectedBranch, acts, _i, acts_2, a, aa, _a, _b, nid, normalizedId, directValue, fIds_1, formulas, _loop_2, _c, formulas_2, f, state_1, thenPart, b0, acts, nodeIds, _d, acts_3, a, aa, _e, _f, nid, parts, fIds, elseExpr, formulas, parts, _g, formulas_3, f, lbl, expr, calculatedResult, unitSuffix, conditionId, _h, _j, _k, key, label, evaluateVariableOperation_1, conditionNode, submissionId, organizationId, userId, calculationResult, error_1;
        var _l, _o, _p;
        return __generator(this, function (_q) {
            switch (_q.label) {
                case 0:
                    // 🚫 CETTE FONCTION LEGACY EST DÉSACTIVÉE !
                    // TOUT DOIT PASSER PAR TBL PRISMA MAINTENANT !
                    console.log('🚫 [LEGACY DISABLED] buildConditionExpressionReadable est désactivée - utilisez TBL Prisma !');
                    return [2 /*return*/, "🔄 Condition évaluée via TBL Prisma"];
                case 1:
                    if (!!conditionResult) return [3 /*break*/, 6];
                    // Condition fausse → utiliser le fallback (SINON) et calculer les formules
                    console.log("[BUILD-CONDITION-DEBUG] Utilisation branche SINON (fallback)");
                    fIds_1 = extractFormulaIdsFromConditionSet(conditionSet);
                    console.log("[BUILD-CONDITION-DEBUG] Formula IDs extraits:", Array.from(fIds_1));
                    if (!(fIds_1.size > 0)) return [3 /*break*/, 6];
                    return [4 /*yield*/, dbClient.treeBranchLeafNodeFormula.findMany({
                            where: { id: { in: Array.from(fIds_1) } },
                            select: { id: true, nodeId: true, tokens: true }
                        })];
                case 2:
                    formulas = _q.sent();
                    console.log("[BUILD-CONDITION-DEBUG] Formules trouv\u00E9es:", formulas.length);
                    _loop_2 = function (f) {
                        var allTokenIds, ids, missing, nodes, _r, nodes_3, n, expr, calculatedResult;
                        return __generator(this, function (_s) {
                            switch (_s.label) {
                                case 0:
                                    allTokenIds = new Set();
                                    ids = extractNodeIdsFromTokens(f.tokens);
                                    ids.forEach(function (id) { return allTokenIds.add(id); });
                                    if (!(allTokenIds.size > 0)) return [3 /*break*/, 2];
                                    missing = Array.from(allTokenIds).filter(function (id) { return !labels.has(id); });
                                    if (!(missing.length > 0)) return [3 /*break*/, 2];
                                    return [4 /*yield*/, dbClient.treeBranchLeafNode.findMany({
                                            where: { id: { in: missing } },
                                            select: { id: true, label: true }
                                        })];
                                case 1:
                                    nodes = _s.sent();
                                    for (_r = 0, nodes_3 = nodes; _r < nodes_3.length; _r++) {
                                        n = nodes_3[_r];
                                        labels.set(n.id, n.label || null);
                                    }
                                    _s.label = 2;
                                case 2:
                                    expr = buildTextFromTokens(f.tokens, labels, values);
                                    calculatedResult = calculateResult(expr);
                                    if (calculatedResult !== null && calculatedResult !== undefined && !isNaN(calculatedResult)) {
                                        finalResult = String(calculatedResult);
                                        console.log("[BUILD-CONDITION-DEBUG] R\u00E9sultat calcul\u00E9 SINON:", finalResult, 'depuis expression:', expr);
                                        return [2 /*return*/, "break"];
                                    }
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _c = 0, formulas_2 = formulas;
                    _q.label = 3;
                case 3:
                    if (!(_c < formulas_2.length)) return [3 /*break*/, 6];
                    f = formulas_2[_c];
                    return [5 /*yield**/, _loop_2(f)];
                case 4:
                    state_1 = _q.sent();
                    if (state_1 === "break")
                        return [3 /*break*/, 6];
                    _q.label = 5;
                case 5:
                    _c++;
                    return [3 /*break*/, 3];
                case 6:
                    thenPart = "".concat(labelForResult, " (").concat(finalResult, ")");
                    if (Array.isArray(setObj.branches) && setObj.branches.length > 0) {
                        b0 = setObj.branches[0];
                        acts = Array.isArray(b0.actions) ? b0.actions : [];
                        nodeIds = [];
                        for (_d = 0, acts_3 = acts; _d < acts_3.length; _d++) {
                            a = acts_3[_d];
                            aa = a;
                            if (Array.isArray(aa.nodeIds)) {
                                for (_e = 0, _f = aa.nodeIds; _e < _f.length; _e++) {
                                    nid = _f[_e];
                                    nodeIds.push(normalizeRefId(nid));
                                }
                            }
                        }
                        if (nodeIds.length > 0) {
                            parts = Array.from(new Set(nodeIds)).map(function (nid) { var _a, _b; return fmtLV((_a = labels.get(nid)) !== null && _a !== void 0 ? _a : nid, (_b = values.get(nid)) !== null && _b !== void 0 ? _b : null); });
                            if (parts.filter(Boolean).length > 0)
                                thenPart = parts.join(', ');
                        }
                    }
                    fIds = extractFormulaIdsFromConditionSet(conditionSet);
                    console.log("[BUILD-CONDITION-DEBUG] Formula IDs extraits:", Array.from(fIds));
                    elseExpr = '';
                    if (!(fIds.size > 0)) return [3 /*break*/, 8];
                    return [4 /*yield*/, dbClient.treeBranchLeafNodeFormula.findMany({
                            where: { id: { in: Array.from(fIds) } },
                            select: { id: true, nodeId: true, tokens: true }
                        })];
                case 7:
                    formulas = _q.sent();
                    parts = [];
                    for (_g = 0, formulas_3 = formulas; _g < formulas_3.length; _g++) {
                        f = formulas_3[_g];
                        lbl = (_l = labels.get(f.nodeId)) !== null && _l !== void 0 ? _l : 'Formule';
                        expr = buildTextFromTokens(f.tokens, labels, values);
                        // 🔥 CALCULER LE RÉSULTAT: Si c'est la condition active, utiliser le résultat calculé
                        if (!conditionResult) {
                            calculatedResult = calculateResult(expr);
                            if (calculatedResult !== null && calculatedResult !== undefined && !isNaN(calculatedResult)) {
                                parts.push("".concat(lbl, " ").concat(expr, " (=) ").concat(calculatedResult));
                            }
                            else {
                                parts.push("".concat(lbl, " ").concat(expr));
                            }
                        }
                        else {
                            parts.push("".concat(lbl, " ").concat(expr));
                        }
                    }
                    elseExpr = parts.join(' ; ');
                    _q.label = 8;
                case 8:
                    if (!elseExpr)
                        elseExpr = labelForResult;
                    unitSuffix = unit ? " ".concat(unit) : '';
                    // 🔥 REDIRECTION COMPLÈTE VERS TBL PRISMA !
                    // Au lieu de générer des traductions statiques, on utilise le CapacityCalculator
                    console.log('🔄 [REDIRECT TBL] buildConditionExpressionReadable redirigé vers CapacityCalculator');
                    conditionId = null;
                    for (_h = 0, _j = labels.entries(); _h < _j.length; _h++) {
                        _k = _j[_h], key = _k[0], label = _k[1];
                        if (label === labelForResult) {
                            conditionId = key;
                            break;
                        }
                    }
                    if (!conditionId) return [3 /*break*/, 14];
                    _q.label = 9;
                case 9:
                    _q.trys.push([9, 13, , 14]);
                    // 🔥 UTILISER LE SYSTÈME UNIFIÉ operation-interpreter !
                    console.log('🧮 [TBL DYNAMIC] Évaluation condition avec operation-interpreter:', conditionId);
                    return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('./operation-interpreter')); })];
                case 10:
                    evaluateVariableOperation_1 = (_q.sent()).evaluateVariableOperation;
                    return [4 /*yield*/, dbClient.treeBranchLeafNodeCondition.findUnique({
                            where: { id: conditionId },
                            select: { nodeId: true }
                        })];
                case 11:
                    conditionNode = _q.sent();
                    if (!(conditionNode === null || conditionNode === void 0 ? void 0 : conditionNode.nodeId)) {
                        return [2 /*return*/, "\u26A0\uFE0F Condition ".concat(conditionId, ": nodeId introuvable")];
                    }
                    submissionId = 'df833cac-0b44-4b2b-bb1c-de3878f00182';
                    organizationId = ((_o = req.user) === null || _o === void 0 ? void 0 : _o.organizationId) || 'unknown-org';
                    userId = ((_p = req.user) === null || _p === void 0 ? void 0 : _p.userId) || 'unknown-user';
                    return [4 /*yield*/, evaluateVariableOperation_1(conditionNode.nodeId, submissionId, dbClient)];
                case 12:
                    calculationResult = _q.sent();
                    console.log('🧮 [TBL DYNAMIC] Résultat operation-interpreter:', calculationResult);
                    // Retourner la traduction intelligente au lieu du message d'attente
                    if (calculationResult && calculationResult.operationResult) {
                        return [2 /*return*/, calculationResult.operationResult];
                    }
                    else {
                        return [2 /*return*/, "\u26A0\uFE0F Condition ".concat(conditionId, ": Aucun r\u00E9sultat TBL Prisma")];
                    }
                    return [3 /*break*/, 14];
                case 13:
                    error_1 = _q.sent();
                    console.error('❌ [TBL DYNAMIC] Erreur operation-interpreter:', error_1);
                    return [2 /*return*/, "\u26A0\uFE0F Condition ".concat(conditionId, ": Erreur \u00E9valuation TBL - ").concat(error_1 instanceof Error ? error_1.message : 'unknown')];
                case 14: 
                // Fallback pour les cas sans conditionId identifiable
                return [2 /*return*/, "\uD83D\uDD04 Condition: \u00C9valuation TBL Prisma (plus de traduction statique \"Si...alors...sinon\")"];
            }
        });
    });
}
// =============================================================================
// 🛡️ MIDDLEWARE - Sécurité et authentification
// =============================================================================
// TEMPORAIREMENT DÉSACTIVÉ pour tester le système automatique
// TODO: Réactiver l'authentification après tests
// Authentification requise pour toutes les routes - TEMPORAIREMENT DÉSACTIVÉ
// router.use(authenticateToken);
// Mock user temporaire pour les tests
router.use(function (req, res, next) {
    req.user = {
        id: '1757366075163-2vdibc2ve',
        userId: '1757366075163-2vdibc2ve',
        email: 'jonathan.dethier@2thier.be',
        organizationId: '1757366075154-i554z93kl',
        isSuperAdmin: true,
        role: 'super_admin'
    };
    console.log('[TreeBranchLeaf API] 🚩 Mock auth user assigné pour tests');
    next();
});
// =============================================================================
// 🌳 TREES - Gestion des arbres
// =============================================================================
// GET /api/treebranchleaf/trees - Liste des arbres
router.get('/trees', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, organizationId, isSuperAdmin, whereFilter, trees, error_2;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                console.log('🔍 [TBL-ROUTES] GET /trees - DÉBUT de la route');
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                console.log('🔍 [TBL-ROUTES] Organization ID:', organizationId);
                console.log('🔍 [TBL-ROUTES] Is Super Admin:', isSuperAdmin);
                whereFilter = isSuperAdmin || !organizationId ? {} : { organizationId: organizationId };
                console.log('🔍 [TBL-ROUTES] Where filter:', whereFilter);
                console.log('🔍 [TBL-ROUTES] Recherche des arbres TreeBranchLeaf...');
                return [4 /*yield*/, prisma.treeBranchLeafTree.findMany({
                        where: whereFilter,
                        include: {
                            _count: {
                                select: {
                                    TreeBranchLeafNode: true,
                                    TreeBranchLeafSubmission: true
                                }
                            }
                        },
                        orderBy: { createdAt: 'desc' }
                    })];
            case 1:
                trees = _c.sent();
                console.log('🔍 [TBL-ROUTES] Arbres trouvés:', trees.length);
                console.log('🔍 [TBL-ROUTES] Premier arbre:', trees[0] ? "".concat(trees[0].id, " - ").concat(trees[0].name) : 'Aucun');
                if (trees.length > 0) {
                    console.log('🔍 [TBL-ROUTES] Détails premier arbre:', {
                        id: trees[0].id,
                        name: trees[0].name,
                        organizationId: trees[0].organizationId,
                        nodeCount: ((_b = trees[0]._count) === null || _b === void 0 ? void 0 : _b.TreeBranchLeafNode) || 0
                    });
                }
                res.json(trees);
                return [3 /*break*/, 3];
            case 2:
                error_2 = _c.sent();
                console.error('[TreeBranchLeaf API] Error fetching trees:', error_2);
                res.status(500).json({ error: 'Impossible de récupérer les arbres' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// GET /api/treebranchleaf/trees/:id - Détails d'un arbre
router.get('/trees/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, organizationId, isSuperAdmin, tree, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                id = req.params.id;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({
                        where: isSuperAdmin || !organizationId ? { id: id } : { id: id, organizationId: organizationId },
                        include: {
                            _count: {
                                select: {
                                    TreeBranchLeafNode: true,
                                    TreeBranchLeafSubmission: true
                                }
                            }
                        }
                    })];
            case 1:
                tree = _b.sent();
                if (!tree) {
                    return [2 /*return*/, res.status(404).json({ error: 'Arbre non trouvé' })];
                }
                res.json(tree);
                return [3 /*break*/, 3];
            case 2:
                error_3 = _b.sent();
                console.error('[TreeBranchLeaf API] Error fetching tree:', error_3);
                res.status(500).json({ error: 'Impossible de récupérer l\'arbre' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// POST /api/treebranchleaf/trees - Créer un arbre
router.post('/trees', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name_1, description, _b, category, icon, _c, color, _d, version, _e, status_1, _f, settings, _g, metadata, _h, isPublic, bodyOrgId, targetOrgId, id, tree, error_4;
    return __generator(this, function (_j) {
        switch (_j.label) {
            case 0:
                _j.trys.push([0, 2, , 3]);
                _a = req.body || {}, name_1 = _a.name, description = _a.description, _b = _a.category, category = _b === void 0 ? 'formulaire' : _b, icon = _a.icon, _c = _a.color, color = _c === void 0 ? '#10b981' : _c, _d = _a.version, version = _d === void 0 ? '1.0.0' : _d, _e = _a.status, status_1 = _e === void 0 ? 'draft' : _e, _f = _a.settings, settings = _f === void 0 ? {} : _f, _g = _a.metadata, metadata = _g === void 0 ? {} : _g, _h = _a.isPublic, isPublic = _h === void 0 ? false : _h, bodyOrgId = _a.organizationId;
                if (!name_1 || typeof name_1 !== 'string' || !name_1.trim()) {
                    return [2 /*return*/, res.status(400).json({ error: "Le nom de l'arbre est requis" })];
                }
                targetOrgId = getAuthCtx(req).organizationId || (typeof bodyOrgId === 'string' ? bodyOrgId : null);
                if (!targetOrgId) {
                    return [2 /*return*/, res.status(400).json({ error: "organizationId requis (en-tête x-organization-id ou dans le corps)" })];
                }
                id = (0, crypto_1.randomUUID)();
                return [4 /*yield*/, prisma.treeBranchLeafTree.create({
                        data: {
                            id: id,
                            organizationId: targetOrgId,
                            name: name_1.trim(),
                            description: description !== null && description !== void 0 ? description : null,
                            category: category,
                            icon: icon !== null && icon !== void 0 ? icon : null,
                            color: color,
                            version: version,
                            status: status_1,
                            settings: settings,
                            metadata: metadata,
                            isPublic: Boolean(isPublic),
                            updatedAt: new Date()
                        }
                    })];
            case 1:
                tree = _j.sent();
                res.status(201).json(tree);
                return [3 /*break*/, 3];
            case 2:
                error_4 = _j.sent();
                console.error('[TreeBranchLeaf API] Error creating tree:', error_4);
                res.status(500).json({ error: 'Impossible de créer l\'arbre' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// PUT /api/treebranchleaf/trees/:id - Mettre à jour un arbre
router.put('/trees/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, organizationId, updateData, tree, updatedTree, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                id = req.params.id;
                organizationId = req.user.organizationId;
                updateData = req.body;
                // Supprimer les champs non modifiables
                delete updateData.id;
                delete updateData.organizationId;
                delete updateData.createdAt;
                return [4 /*yield*/, prisma.treeBranchLeafTree.updateMany({
                        where: {
                            id: id,
                            organizationId: organizationId
                        },
                        data: __assign(__assign({}, updateData), { updatedAt: new Date() })
                    })];
            case 1:
                tree = _a.sent();
                if (tree.count === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Arbre non trouvé' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({
                        where: { id: id, organizationId: organizationId }
                    })];
            case 2:
                updatedTree = _a.sent();
                res.json(updatedTree);
                return [3 /*break*/, 4];
            case 3:
                error_5 = _a.sent();
                console.error('[TreeBranchLeaf API] Error updating tree:', error_5);
                res.status(500).json({ error: 'Impossible de mettre à jour l\'arbre' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// DELETE /api/treebranchleaf/trees/:id - Supprimer un arbre
router.delete('/trees/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, organizationId, result, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                id = req.params.id;
                organizationId = req.user.organizationId;
                // Supprimer d'abord tous les nœuds associés
                return [4 /*yield*/, prisma.treeBranchLeafNode.deleteMany({
                        where: { treeId: id }
                    })];
            case 1:
                // Supprimer d'abord tous les nœuds associés
                _a.sent();
                return [4 /*yield*/, prisma.treeBranchLeafTree.deleteMany({
                        where: {
                            id: id,
                            organizationId: organizationId
                        }
                    })];
            case 2:
                result = _a.sent();
                if (result.count === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Arbre non trouvé' })];
                }
                res.json({ success: true, message: 'Arbre supprimé avec succès' });
                return [3 /*break*/, 4];
            case 3:
                error_6 = _a.sent();
                console.error('[TreeBranchLeaf API] Error deleting tree:', error_6);
                res.status(500).json({ error: 'Impossible de supprimer l\'arbre' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// 🍃 NODES - Gestion des nœuds
// =============================================================================
// GET /api/treebranchleaf/trees/:treeId/nodes - Liste des nœuds d'un arbre
router.get('/trees/:treeId/nodes', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var treeId, _a, organizationId, isSuperAdmin, treeWhereFilter, tree, nodes, reconstructedNodes, nodesWithTooltips, error_7;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                console.log('🔍 [TBL-ROUTES] GET /trees/:treeId/nodes - DÉBUT');
                treeId = req.params.treeId;
                console.log('🔍 [TBL-ROUTES] TreeId:', treeId);
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                console.log('🔍 [TBL-ROUTES] Organization ID:', organizationId);
                console.log('🔍 [TBL-ROUTES] Is Super Admin:', isSuperAdmin);
                treeWhereFilter = isSuperAdmin || !organizationId ? { id: treeId } : { id: treeId, organizationId: organizationId };
                console.log('🔍 [TBL-ROUTES] Tree where filter:', treeWhereFilter);
                return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({
                        where: treeWhereFilter
                    })];
            case 1:
                tree = _b.sent();
                console.log('🔍 [TBL-ROUTES] Arbre trouvé:', tree ? "".concat(tree.id, " - ").concat(tree.name) : 'null');
                if (!tree) {
                    return [2 /*return*/, res.status(404).json({ error: 'Arbre non trouvé' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                        where: { treeId: treeId },
                        include: {
                            _count: {
                                select: {
                                    other_TreeBranchLeafNode: true
                                }
                            },
                            TreeBranchLeafNodeTable: {
                                include: {
                                    tableColumns: {
                                        orderBy: { columnIndex: 'asc' }
                                    },
                                    tableRows: {
                                        orderBy: { rowIndex: 'asc' }
                                    }
                                }
                            }
                        },
                        orderBy: [
                            { order: 'asc' },
                            { createdAt: 'asc' }
                        ]
                    })];
            case 2:
                nodes = _b.sent();
                console.log('🔍 [TBL-ROUTES] Nœuds trouvés:', nodes.length);
                // 🔄 MIGRATION : Reconstruire les données JSON depuis les colonnes dédiées
                console.log('🔄 [GET /trees/:treeId/nodes] Reconstruction depuis colonnes pour', nodes.length, 'nœuds');
                reconstructedNodes = nodes.map(function (node) { return buildResponseFromColumns(node); });
                nodesWithTooltips = reconstructedNodes.filter(function (node) {
                    return node.text_helpTooltipType && node.text_helpTooltipType !== 'none';
                });
                if (nodesWithTooltips.length > 0) {
                    console.log('🎯 [GET /trees/:treeId/nodes] ENVOI AU CLIENT - Nœuds avec tooltips:', nodesWithTooltips.map(function (node) { return ({
                        id: node.id,
                        name: node.name,
                        tooltipType: node.text_helpTooltipType,
                        hasTooltipText: !!node.text_helpTooltipText,
                        hasTooltipImage: !!node.text_helpTooltipImage
                    }); }));
                }
                res.json(reconstructedNodes);
                return [3 /*break*/, 4];
            case 3:
                error_7 = _b.sent();
                console.error('[TreeBranchLeaf API] Error fetching nodes:', error_7);
                res.status(500).json({ error: 'Impossible de récupérer les nœuds' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// GET /api/treebranchleaf/trees/:treeId/repeater-fields - Liste des champs répétiteurs (instances)
router.get('/trees/:treeId/repeater-fields', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var treeId, _a, organizationId, isSuperAdmin, treeWhereFilter, tree, allNodesRaw, allNodes, _nodesById, repeaterFields, _loop_3, _i, allNodes_1, node, error_8;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                console.log('🔁 [TBL-ROUTES] GET /trees/:treeId/repeater-fields - DÉBUT');
                treeId = req.params.treeId;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                treeWhereFilter = isSuperAdmin || !organizationId ? { id: treeId } : { id: treeId, organizationId: organizationId };
                return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({
                        where: treeWhereFilter
                    })];
            case 1:
                tree = _b.sent();
                if (!tree) {
                    return [2 /*return*/, res.status(404).json({ error: 'Arbre non trouvé' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                        where: { treeId: treeId }
                    })];
            case 2:
                allNodesRaw = _b.sent();
                console.log("\uD83D\uDD01 [TBL-ROUTES] ".concat(allNodesRaw.length, " n\u0153uds bruts r\u00E9cup\u00E9r\u00E9s depuis la base"));
                allNodes = allNodesRaw.map(function (node) { return buildResponseFromColumns(node); });
                _nodesById = new Map(allNodes.map(function (n) { return [n.id, n]; }));
                repeaterFields = [];
                _loop_3 = function (node) {
                    // Vérifier si le nœud a des métadonnées repeater
                    var metadata = node.metadata;
                    if (!(metadata === null || metadata === void 0 ? void 0 : metadata.repeater))
                        return "continue";
                    var repeaterMeta = metadata.repeater;
                    var templateNodeIds = repeaterMeta.templateNodeIds || [];
                    var _templateNodeLabels = repeaterMeta.templateNodeLabels || {}; // Non utilisé dans le nouveau système
                    console.log("\uD83D\uDD01 [TBL-ROUTES] N\u0153ud repeater \"".concat(node.label, "\" a ").concat(templateNodeIds.length, " templates configur\u00E9s"));
                    // ========================================================================
                    // 🎯 SYSTÈME DE CHAMPS RÉPÉTITEURS - ENFANTS PHYSIQUES UNIQUEMENT
                    // ========================================================================
                    // IMPORTANT: On retourne UNIQUEMENT les enfants physiques RÉELS créés via duplication
                    // 
                    // ❌ PLUS D'IDS VIRTUELS ! On ne génère PLUS d'IDs composés comme {repeaterId}_template_{templateId}
                    //
                    // ✅ ON RETOURNE:
                    //    - Les enfants physiques qui ont metadata.sourceTemplateId (créés par POST /duplicate-templates)
                    //    - Ce sont de VRAIS nœuds dans la base avec de VRAIS UUID
                    //    - Ils peuvent être utilisés directement dans les formules/conditions
                    //
                    // 📌 Si aucun enfant physique n'existe encore (utilisateur n'a pas cliqué sur "+"):
                    //    - On ne retourne RIEN pour ce repeater
                    //    - Les champs apparaîtront après la première duplication
                    // ========================================================================
                    // Récupérer tous les enfants physiques de ce repeater
                    var physicalChildren = allNodes.filter(function (child) {
                        if (child.parentId !== node.id)
                            return false;
                        var childMeta = child.metadata;
                        // Vérifier que l'enfant a bien été créé via duplication (a sourceTemplateId)
                        // ET que ce sourceTemplateId correspond à un template configuré
                        return (childMeta === null || childMeta === void 0 ? void 0 : childMeta.sourceTemplateId) && templateNodeIds.includes(childMeta.sourceTemplateId);
                    });
                    console.log("\uD83D\uDD01 [TBL-ROUTES] \u2192 ".concat(physicalChildren.length, " enfants physiques avec sourceTemplateId trouv\u00E9s"));
                    if (physicalChildren.length === 0) {
                        console.log("\u26A0\uFE0F [TBL-ROUTES] Aucun enfant physique pour \"".concat(node.label, "\", il faut dupliquer les templates d'abord"));
                        return "continue";
                    }
                    // Ajouter chaque enfant physique à la liste
                    for (var _c = 0, physicalChildren_1 = physicalChildren; _c < physicalChildren_1.length; _c++) {
                        var child = physicalChildren_1[_c];
                        console.log("\u2705 [TBL-ROUTES] Enfant physique ajout\u00E9: \"".concat(child.label, "\" (").concat(child.id, ")"));
                        repeaterFields.push({
                            id: child.id, // ✅ VRAI UUID de l'enfant physique
                            label: "".concat(node.label, " / ").concat(child.label), // Label complet affiché
                            repeaterLabel: node.label, // Label du repeater parent
                            repeaterParentId: node.id, // ID du nœud repeater
                            nodeLabel: child.label, // Label de l'enfant
                            nodeId: child.id // ✅ VRAI UUID de l'enfant
                        });
                    }
                };
                // Parcourir tous les nœuds pour trouver ceux avec des repeaters
                for (_i = 0, allNodes_1 = allNodes; _i < allNodes_1.length; _i++) {
                    node = allNodes_1[_i];
                    _loop_3(node);
                }
                console.log("\uD83D\uDD01 [TBL-ROUTES] ".concat(repeaterFields.length, " champs r\u00E9p\u00E9titeurs trouv\u00E9s"));
                res.json(repeaterFields);
                return [3 /*break*/, 4];
            case 3:
                error_8 = _b.sent();
                console.error('[TreeBranchLeaf API] Error fetching repeater fields:', error_8);
                res.status(500).json({ error: 'Impossible de récupérer les champs répétiteurs' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// � RÉCUPÉRATION DES RÉFÉRENCES PARTAGÉES
// =============================================================================
/**
 * GET /trees/:treeId/shared-references
 * Récupère toutes les références partagées d'un arbre
 */
router.get('/trees/:treeId/shared-references', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var treeId, _a, organizationId, isSuperAdmin, treeWhereFilter, tree, sharedReferencesRaw, sharedReferences, error_9;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                console.log('🔗 [TBL-ROUTES] GET /trees/:treeId/shared-references - DÉBUT');
                treeId = req.params.treeId;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                treeWhereFilter = isSuperAdmin || !organizationId ? { id: treeId } : { id: treeId, organizationId: organizationId };
                return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({
                        where: treeWhereFilter
                    })];
            case 1:
                tree = _b.sent();
                if (!tree) {
                    return [2 /*return*/, res.status(404).json({ error: 'Arbre non trouvé' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                        where: {
                            treeId: treeId,
                            isSharedReference: true
                        }
                    })];
            case 2:
                sharedReferencesRaw = _b.sent();
                console.log("\uD83D\uDD17 [TBL-ROUTES] ".concat(sharedReferencesRaw.length, " r\u00E9f\u00E9rences partag\u00E9es trouv\u00E9es"));
                sharedReferences = sharedReferencesRaw.map(function (node) {
                    var response = buildResponseFromColumns(node);
                    return {
                        id: response.id,
                        label: (response.label || response.sharedReferenceName || 'Référence sans nom'),
                        category: response.sharedReferenceCategory,
                        description: response.sharedReferenceDescription,
                        type: response.type,
                        nodeLabel: response.label,
                        nodeId: response.id
                    };
                });
                console.log("\uD83D\uDD17 [TBL-ROUTES] R\u00E9f\u00E9rences partag\u00E9es format\u00E9es:", sharedReferences.map(function (r) { return ({ id: r.id, label: r.label, category: r.category }); }));
                res.json(sharedReferences);
                return [3 /*break*/, 4];
            case 3:
                error_9 = _b.sent();
                console.error('[TreeBranchLeaf API] Error fetching shared references:', error_9);
                res.status(500).json({ error: 'Impossible de récupérer les références partagées' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// �🔁 DUPLICATION PHYSIQUE DES TEMPLATES REPEATER
// =============================================================================
/**
 * POST /nodes/:nodeId/duplicate-templates
 * Clone physiquement les templates sélectionnés comme enfants du nœud repeater
 */
router.post('/nodes/:nodeId/duplicate-templates', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, templateNodeIds, _a, organizationId, isSuperAdmin, parentNode, existingChildrenByParent, newTemplateIds, requestedNodes_1, resolveBaseTemplateId_1, baseTemplateIdsInOrder, uniqueBaseTemplateIds, baseTemplateNodes, baseById_1, templatesToDuplicateInOrder, duplicatedSummaries, extractNumericSuffix, extractSuffixFromId_1, copyRootCandidates, globalMax, _i, copyRootCandidates_1, root, fromId, resolved, nextSuffix, sample, _b, templatesToDuplicateInOrder_1, template, baseTemplateId, copyNumber, labelSuffix, result, newRootId, normalizedCopyLabel, created, r, e_2, selectorCopyOptions, selectorErr_1, error_10, msg;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 19, , 20]);
                nodeId = req.params.nodeId;
                templateNodeIds = req.body.templateNodeIds;
                console.log('🔁 [DUPLICATE-TEMPLATES] Duplication des templates:', { nodeId: nodeId, templateNodeIds: templateNodeIds });
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                if (!Array.isArray(templateNodeIds) || templateNodeIds.length === 0) {
                    return [2 /*return*/, res.status(400).json({ error: 'templateNodeIds doit être un tableau non vide' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                        where: { id: nodeId },
                        include: { TreeBranchLeafTree: true }
                    })];
            case 1:
                parentNode = _c.sent();
                if (!parentNode) {
                    return [2 /*return*/, res.status(404).json({ error: 'Nœud parent non trouvé' })];
                }
                // Vérifier que l'arbre appartient à l'organisation (sauf SuperAdmin)
                if (!isSuperAdmin && organizationId && parentNode.TreeBranchLeafTree.organizationId !== organizationId) {
                    return [2 /*return*/, res.status(403).json({ error: 'Accès non autorisé à cet arbre' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                        where: { parentId: nodeId },
                        select: { id: true, metadata: true, parentId: true }
                    })];
            case 2:
                existingChildrenByParent = _c.sent();
                // 🔄 NOUVELLE LOGIQUE: Pour les repeaters, on PEUT créer plusieurs copies du même template
                // On ne filtre plus les templates - on permet toujours la duplication
                console.log('� [DUPLICATE-TEMPLATES] Création de nouvelles copies autorisée pour repeater');
                newTemplateIds = templateNodeIds;
                console.log('🆕 [DUPLICATE-TEMPLATES] Templates à dupliquer:', newTemplateIds);
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                        where: {
                            id: { in: newTemplateIds },
                            treeId: parentNode.treeId
                        },
                        select: { id: true, label: true, type: true, metadata: true }
                    })];
            case 3:
                requestedNodes_1 = _c.sent();
                if (requestedNodes_1.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Aucun template trouvé' })];
                }
                resolveBaseTemplateId_1 = function (n) {
                    var _a;
                    var md = ((_a = n.metadata) !== null && _a !== void 0 ? _a : {});
                    var sourceTemplateId = md.sourceTemplateId;
                    return typeof sourceTemplateId === 'string' && sourceTemplateId.length > 0 ? sourceTemplateId : n.id;
                };
                baseTemplateIdsInOrder = newTemplateIds.map(function (id) {
                    var found = requestedNodes_1.find(function (n) { return n.id === id; });
                    return found ? resolveBaseTemplateId_1(found) : id;
                });
                uniqueBaseTemplateIds = Array.from(new Set(baseTemplateIdsInOrder));
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                        where: {
                            id: { in: uniqueBaseTemplateIds },
                            treeId: parentNode.treeId
                        },
                        select: { id: true, label: true, type: true, metadata: true }
                    })];
            case 4:
                baseTemplateNodes = _c.sent();
                baseById_1 = new Map(baseTemplateNodes.map(function (n) { return [n.id, n]; }));
                templatesToDuplicateInOrder = baseTemplateIdsInOrder
                    .map(function (baseId) { return baseById_1.get(baseId); })
                    .filter(function (n) { return Boolean(n); });
                if (templatesToDuplicateInOrder.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Aucun template de base trouvé' })];
                }
                console.log("\uD83D\uDD01 [DUPLICATE-TEMPLATES] ".concat(templatesToDuplicateInOrder.length, " duplication(s) demand\u00E9e(s) (base templates: ").concat(uniqueBaseTemplateIds.length, ")"));
                duplicatedSummaries = [];
                extractNumericSuffix = function (candidate) {
                    if (typeof candidate === 'number' && Number.isFinite(candidate))
                        return candidate;
                    if (typeof candidate === 'string' && /^\d+$/.test(candidate))
                        return Number(candidate);
                    return null;
                };
                extractSuffixFromId_1 = function (id) {
                    if (!id)
                        return null;
                    var match = /-(\d+)$/.exec(id);
                    if (!match)
                        return null;
                    var parsed = Number(match[1]);
                    return Number.isFinite(parsed) ? parsed : null;
                };
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                        where: {
                            treeId: parentNode.treeId,
                            OR: uniqueBaseTemplateIds.map(function (t) { return ({ id: { startsWith: "".concat(t, "-") } }); })
                        },
                        select: { id: true, parentId: true }
                    })];
            case 5:
                copyRootCandidates = _c.sent();
                console.log("?? [DUPLICATE-TEMPLATES] Racines de copies d\uFFFDtect\uFFFDes (repeater=".concat(nodeId, ") parentChildren=").concat(existingChildrenByParent.length, " rootCandidates=").concat(copyRootCandidates.length));
                globalMax = 0;
                for (_i = 0, copyRootCandidates_1 = copyRootCandidates; _i < copyRootCandidates_1.length; _i++) {
                    root = copyRootCandidates_1[_i];
                    fromId = extractSuffixFromId_1(root.id);
                    resolved = fromId !== null && fromId !== void 0 ? fromId : 0;
                    if (resolved > globalMax)
                        globalMax = resolved;
                }
                nextSuffix = globalMax + 1;
                // Debug: afficher un échantillon des racines candidates
                try {
                    sample = copyRootCandidates.slice(0, 10).map(function (c) {
                        var fromId = extractSuffixFromId_1(c.id);
                        return { id: c.id, parentId: c.parentId, fromId: fromId };
                    });
                    console.log('?? [DUPLICATE-TEMPLATES] Sample racines candidates (id/suffix):', sample);
                }
                catch (_d) {
                    // noop
                }
                console.log('?? [DUPLICATE-TEMPLATES] Suffixe global calcul� (depuis enfants existants):');
                console.log("   max global existant: ".concat(globalMax, " ? prochain suffixe: ").concat(nextSuffix));
                _b = 0, templatesToDuplicateInOrder_1 = templatesToDuplicateInOrder;
                _c.label = 6;
            case 6:
                if (!(_b < templatesToDuplicateInOrder_1.length)) return [3 /*break*/, 18];
                template = templatesToDuplicateInOrder_1[_b];
                baseTemplateId = template.id;
                copyNumber = nextSuffix;
                labelSuffix = "-".concat(copyNumber);
                return [4 /*yield*/, (0, deep_copy_service_js_1.deepCopyNodeInternal)(prisma, req, template.id, {
                        targetParentId: nodeId,
                        suffixNum: copyNumber,
                        preserveSharedReferences: true,
                        isFromRepeaterDuplication: true
                    })];
            case 7:
                result = _c.sent();
                newRootId = result.root.newId;
                console.log("?? [DUPLICATE-TEMPLATES] deepCopyNodeInternalService newRootId:", newRootId, "(type: ".concat(typeof newRootId, ")"));
                normalizedCopyLabel = "".concat(template.label || baseTemplateId, "-").concat(copyNumber);
                // Ajouter/mettre � jour les m�tadonn�es de tra�abilit� sur la racine copi�e
                return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                        where: { id: newRootId },
                        data: {
                            label: normalizedCopyLabel,
                            metadata: __assign(__assign({}, (typeof template.metadata === 'object' ? template.metadata : {})), { sourceTemplateId: baseTemplateId, duplicatedAt: new Date().toISOString(), duplicatedFromRepeater: nodeId, copiedFromNodeId: baseTemplateId, copySuffix: copyNumber })
                        }
                    })];
            case 8:
                // Ajouter/mettre � jour les m�tadonn�es de tra�abilit� sur la racine copi�e
                _c.sent();
                return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                        where: { id: newRootId },
                        select: { id: true, label: true, type: true, parentId: true }
                    })];
            case 9:
                created = _c.sent();
                console.log("?? [DUPLICATE-TEMPLATES] findUnique result for ".concat(newRootId, ":"), created ? { id: created.id, label: created.label } : 'NULL');
                if (!created) return [3 /*break*/, 17];
                duplicatedSummaries.push({
                    id: created.id,
                    label: created.label,
                    type: created.type,
                    parentId: created.parentId,
                    sourceTemplateId: baseTemplateId
                });
                console.log("\u2705 [DUPLICATE-TEMPLATES] Template \"".concat(template.label, "\" dupliqu\u00E9 en profondeur \u2192 \"").concat(created.label, "\" (").concat(created.id, ")"));
                _c.label = 10;
            case 10:
                _c.trys.push([10, 12, , 13]);
                return [4 /*yield*/, applySharedReferencesFromOriginalInternal(req, newRootId)];
            case 11:
                r = _c.sent();
                console.log("\uD83D\uDD17 [DUPLICATE-TEMPLATES] R\u00E9f\u00E9rences partag\u00E9es appliqu\u00E9es (suffixe -".concat(r.suffix, ") pour"), newRootId);
                return [3 /*break*/, 13];
            case 12:
                e_2 = _c.sent();
                console.warn('⚠️ [DUPLICATE-TEMPLATES] Échec application des références partagées pour', newRootId, e_2);
                return [3 /*break*/, 13];
            case 13:
                _c.trys.push([13, 15, , 16]);
                selectorCopyOptions = {
                    nodeIdMap: result.idMap,
                    tableCopyCache: new Map(),
                    tableIdMap: new Map(Object.entries(result.tableIdMap)) // ? Utiliser le tableIdMap peupl�
                };
                return [4 /*yield*/, (0, copy_selector_tables_js_1.copySelectorTablesAfterNodeCopy)(prisma, newRootId, template.id, selectorCopyOptions, copyNumber)];
            case 14:
                _c.sent();
                console.log("? [DUPLICATE-TEMPLATES] Tables des s\uFFFDlecteurs copi\uFFFDes pour ".concat(newRootId));
                return [3 /*break*/, 16];
            case 15:
                selectorErr_1 = _c.sent();
                console.warn('??  [DUPLICATE-TEMPLATES] Erreur lors de la copie des tables des s�lecteurs pour', newRootId, selectorErr_1);
                return [3 /*break*/, 16];
            case 16:
                // ?? NOTE: Les variables li�es (linkedVariableIds) sont D�J� copi�es par deepCopyNodeInternal
                // avec autoCreateDisplayNode: true, donc pas besoin d'appeler copyLinkedVariablesFromNode ici
                console.log("?? [DUPLICATE-TEMPLATES] Variables li\uFFFDes d\uFFFDj\uFFFD copi\uFFFDes par deepCopyNodeInternal pour ".concat(newRootId));
                _c.label = 17;
            case 17:
                _b++;
                return [3 /*break*/, 6];
            case 18:
                console.log("\uD83C\uDF89 [DUPLICATE-TEMPLATES] ".concat(duplicatedSummaries.length, " n\u0153uds dupliqu\u00E9s (deep) avec succ\u00E8s"));
                res.status(201).json({
                    duplicated: duplicatedSummaries.map(function (n) { return ({ id: n.id, label: n.label, type: n.type, parentId: n.parentId, sourceTemplateId: n.sourceTemplateId }); }),
                    count: duplicatedSummaries.length
                });
                return [3 /*break*/, 20];
            case 19:
                error_10 = _c.sent();
                console.error('❌ [DUPLICATE-TEMPLATES] Erreur:', error_10);
                msg = error_10 instanceof Error ? error_10.message : String(error_10);
                res.status(500).json({ error: 'Erreur lors de la duplication des templates', details: msg });
                return [3 /*break*/, 20];
            case 20: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// 📦 COPIE PROFONDE D'UN NŒUD (COPIE INDÉPENDANTE COMPLÈTE)
// =============================================================================
/**
 * POST /api/treebranchleaf/nodes/:nodeId/deep-copy
 * Crée une copie indépendante complète d'un nœud et de toute sa cascade:
 * - Tous les descendants (options SELECT, champs enfants, etc.)
 * - Les références partagées (sharedReferenceId/sharedReferenceIds) NE sont PAS matérialisées
 *   dans la structure copiée. Elles restent vides (copie indépendante). Une étape séparée
 *   peut ensuite les réappliquer depuis l'original via l'endpoint dédié.
 * - Les formules/conditions/tables liées sont dupliquées et les IDs sont réécrits dans les JSON (tokens/conditionSet)
 * - Tous les IDs sont régénérés, sans doublons, avec un mappage old->new retourné
 */
// 🔧 Helper réutilisable pour réaliser une copie profonde côté serveur (utilisé par la route et le duplicateur de templates)
function deepCopyNodeInternal(req, nodeId, opts) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, targetParentId, suffixNum, _b, preserveSharedReferences, replaceIdsInTokens, replaceIdsInConditionSet, source, _c, organizationId, isSuperAdmin, __copySuffixNum, existingIdsWithSuffix, _maxSuffixNum, _i, existingIdsWithSuffix_1, rec, rest, num, __computedLabelSuffix, allNodes, byId, childrenByParent, _d, allNodes_2, n, arr, toCopy, queue, cur, children, _e, children_1, c, idMap, _f, toCopy_1, oldId, formulaIdMap, conditionIdMap, tableIdMap, buildCreationOrder, nodesToCreate, createdNodes, _loop_4, _g, nodesToCreate_1, oldId, _h, createdNodes_1, _j, oldId, newId, formulas, _k, formulas_4, f, newFormulaId, newTokens, refs, _l, refs_1, refId, e_3, conditions, _o, conditions_1, c, newConditionId, newSet, refs, _p, refs_2, refId, e_4, tables, _loop_5, _q, tables_1, t, variableCopyCache, _r, toCopy_2, oldNodeId, newNodeId, oldNode, newLinkedFormulaIds, newLinkedConditionIds, newLinkedTableIds, newLinkedVariableIds, shouldCreateDisplayNodes, _s, _t, linkedVarId, isSharedRef, newVarId, copyResult, e_5, e_6, rootNewId;
        return __generator(this, function (_u) {
            switch (_u.label) {
                case 0:
                    _a = opts || {}, targetParentId = _a.targetParentId, suffixNum = _a.suffixNum, _b = _a.preserveSharedReferences, preserveSharedReferences = _b === void 0 ? false : _b;
                    replaceIdsInTokens = function (tokens, idMap) {
                        if (!tokens)
                            return tokens;
                        var mapOne = function (s) { return s.replace(/@value\.([A-Za-z0-9_:-]+)/g, function (_m, p1) {
                            var newId = idMap.get(p1);
                            return newId ? "@value.".concat(newId) : "@value.".concat(p1);
                        }); };
                        if (Array.isArray(tokens))
                            return tokens.map(function (t) { return typeof t === 'string' ? mapOne(t) : t; });
                        if (typeof tokens === 'string')
                            return mapOne(tokens);
                        try {
                            var asStr = JSON.stringify(tokens);
                            var replaced = mapOne(asStr);
                            return JSON.parse(replaced);
                        }
                        catch (_a) {
                            return tokens;
                        }
                    };
                    replaceIdsInConditionSet = function (conditionSet, idMap, formulaIdMap) {
                        if (!conditionSet)
                            return conditionSet;
                        try {
                            var str = JSON.stringify(conditionSet);
                            // Remplacer les références de valeurs @value.<nodeId>
                            str = str.replace(/@value\.([A-Za-z0-9_:-]+)/g, function (_m, p1) { return "@value.".concat(idMap.get(p1) || p1); });
                            // Remplacer les références de formules node-formula:<formulaId>
                            str = str.replace(/node-formula:([a-f0-9-]{36})/gi, function (_m, p1) { return "node-formula:".concat(formulaIdMap.get(p1) || p1); });
                            return JSON.parse(str);
                        }
                        catch (_a) {
                            return conditionSet;
                        }
                    };
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                            where: { id: nodeId },
                            include: { TreeBranchLeafTree: { select: { organizationId: true } } }
                        })];
                case 1:
                    source = _u.sent();
                    if (!source) {
                        throw new Error('Nœud source introuvable');
                    }
                    _c = getAuthCtx(req), organizationId = _c.organizationId, isSuperAdmin = _c.isSuperAdmin;
                    if (!isSuperAdmin && organizationId && source.TreeBranchLeafTree.organizationId !== organizationId) {
                        throw new Error('Accès non autorisé à cet arbre');
                    }
                    __copySuffixNum = suffixNum || 1;
                    if (!!suffixNum) return [3 /*break*/, 3];
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                            where: { treeId: source.treeId, id: { startsWith: "".concat(source.id, "-") } },
                            select: { id: true }
                        })];
                case 2:
                    existingIdsWithSuffix = _u.sent();
                    _maxSuffixNum = 0;
                    for (_i = 0, existingIdsWithSuffix_1 = existingIdsWithSuffix; _i < existingIdsWithSuffix_1.length; _i++) {
                        rec = existingIdsWithSuffix_1[_i];
                        rest = rec.id.slice(source.id.length + 1);
                        if (/^\d+$/.test(rest)) {
                            num = Number(rest);
                            if (Number.isFinite(num) && num > _maxSuffixNum)
                                _maxSuffixNum = num;
                        }
                    }
                    __copySuffixNum = _maxSuffixNum + 1;
                    _u.label = 3;
                case 3:
                    __computedLabelSuffix = "-".concat(__copySuffixNum);
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({ where: { treeId: source.treeId } })];
                case 4:
                    allNodes = _u.sent();
                    byId = new Map(allNodes.map(function (n) { return [n.id, n]; }));
                    childrenByParent = new Map();
                    for (_d = 0, allNodes_2 = allNodes; _d < allNodes_2.length; _d++) {
                        n = allNodes_2[_d];
                        if (!n.parentId)
                            continue;
                        arr = childrenByParent.get(n.parentId) || [];
                        arr.push(n.id);
                        childrenByParent.set(n.parentId, arr);
                    }
                    toCopy = new Set();
                    queue = [source.id];
                    while (queue.length) {
                        cur = queue.shift();
                        if (toCopy.has(cur))
                            continue;
                        toCopy.add(cur);
                        children = childrenByParent.get(cur) || [];
                        for (_e = 0, children_1 = children; _e < children_1.length; _e++) {
                            c = children_1[_e];
                            queue.push(c);
                        }
                    }
                    idMap = new Map();
                    for (_f = 0, toCopy_1 = toCopy; _f < toCopy_1.length; _f++) {
                        oldId = toCopy_1[_f];
                        idMap.set(oldId, "".concat(oldId, "-").concat(__copySuffixNum));
                    }
                    formulaIdMap = new Map();
                    conditionIdMap = new Map();
                    tableIdMap = new Map();
                    buildCreationOrder = function () {
                        // Edges: parent -> child (si parent aussi copié)
                        var edges = new Map();
                        var indegree = new Map();
                        var ensureNode = function (id) { if (!edges.has(id))
                            edges.set(id, new Set()); if (!indegree.has(id))
                            indegree.set(id, 0); };
                        for (var _i = 0, toCopy_3 = toCopy; _i < toCopy_3.length; _i++) {
                            var id = toCopy_3[_i];
                            ensureNode(id);
                        }
                        // parent -> child
                        for (var _a = 0, toCopy_4 = toCopy; _a < toCopy_4.length; _a++) {
                            var id = toCopy_4[_a];
                            var n = byId.get(id);
                            if ((n === null || n === void 0 ? void 0 : n.parentId) && toCopy.has(n.parentId)) {
                                var from = n.parentId;
                                var to = id;
                                var set = edges.get(from);
                                if (!set.has(to)) {
                                    set.add(to);
                                    indegree.set(to, (indegree.get(to) || 0) + 1);
                                }
                            }
                        }
                        // Kahn topological sort
                        var queue = [];
                        for (var _b = 0, _c = indegree.entries(); _b < _c.length; _b++) {
                            var _d = _c[_b], id = _d[0], deg = _d[1];
                            if (deg === 0)
                                queue.push(id);
                        }
                        var ordered = [];
                        while (queue.length) {
                            var id = queue.shift();
                            ordered.push(id);
                            for (var _e = 0, _f = edges.get(id) || []; _e < _f.length; _e++) {
                                var next = _f[_e];
                                var d = (indegree.get(next) || 0) - 1;
                                indegree.set(next, d);
                                if (d === 0)
                                    queue.push(next);
                            }
                        }
                        // Si tout n'est pas ordonné (cycle improbable), fallback par profondeur parentale
                        if (ordered.length !== toCopy.size) {
                            var remaining = new Set(Array.from(toCopy).filter(function (id) { return !ordered.includes(id); }));
                            var depth_1 = new Map();
                            var getDepth_1 = function (id) {
                                if (depth_1.has(id))
                                    return depth_1.get(id);
                                var n = byId.get(id);
                                if (!n || !n.parentId || !toCopy.has(n.parentId)) {
                                    depth_1.set(id, 0);
                                    return 0;
                                }
                                var d = getDepth_1(n.parentId) + 1;
                                depth_1.set(id, d);
                                return d;
                            };
                            var rest = Array.from(remaining).sort(function (a, b) { return getDepth_1(a) - getDepth_1(b); });
                            return __spreadArray(__spreadArray([], ordered, true), rest, true);
                        }
                        return ordered;
                    };
                    nodesToCreate = buildCreationOrder();
                    createdNodes = [];
                    _loop_4 = function (oldId) {
                        var oldNode, newId, isRoot, newParentId, cloneData;
                        return __generator(this, function (_v) {
                            switch (_v.label) {
                                case 0:
                                    oldNode = byId.get(oldId);
                                    newId = idMap.get(oldId);
                                    isRoot = oldId === source.id;
                                    newParentId = (function () {
                                        var _a, _b;
                                        // Si le parent est dans l’ensemble copié → utiliser le nouveau parent
                                        if (oldNode.parentId && toCopy.has(oldNode.parentId))
                                            return idMap.get(oldNode.parentId);
                                        // Sinon, ancrer sous targetParentId si fourni, sinon reproduire le parent d’origine
                                        if (isRoot)
                                            return (_a = targetParentId !== null && targetParentId !== void 0 ? targetParentId : oldNode.parentId) !== null && _a !== void 0 ? _a : null;
                                        return (_b = oldNode.parentId) !== null && _b !== void 0 ? _b : null;
                                    })();
                                    cloneData = {
                                        id: newId,
                                        treeId: oldNode.treeId,
                                        type: oldNode.type,
                                        subType: oldNode.subType,
                                        fieldType: oldNode.fieldType,
                                        label: oldNode.label ? "".concat(oldNode.label).concat(__computedLabelSuffix) : oldNode.label,
                                        description: oldNode.description,
                                        parentId: newParentId,
                                        order: oldNode.order,
                                        isVisible: oldNode.isVisible,
                                        isActive: oldNode.isActive,
                                        isRequired: oldNode.isRequired,
                                        isMultiple: oldNode.isMultiple,
                                        // Capacités
                                        hasData: oldNode.hasData,
                                        hasFormula: oldNode.hasFormula,
                                        hasCondition: oldNode.hasCondition,
                                        hasTable: oldNode.hasTable,
                                        hasAPI: oldNode.hasAPI,
                                        hasLink: oldNode.hasLink,
                                        hasMarkers: oldNode.hasMarkers,
                                        // ?? FIX: Copier les propri�t�s data_* pour h�riter de l'unit� et de la pr�cision
                                        data_unit: oldNode.data_unit,
                                        data_precision: oldNode.data_precision,
                                        data_displayFormat: oldNode.data_displayFormat,
                                        data_exposedKey: oldNode.data_exposedKey,
                                        data_visibleToUser: oldNode.data_visibleToUser,
                                        // Colonnes simples
                                        defaultValue: oldNode.defaultValue,
                                        calculatedValue: oldNode.calculatedValue,
                                        // Apparence / text / number / select / date / image
                                        appearance_size: oldNode.appearance_size,
                                        appearance_variant: oldNode.appearance_variant,
                                        appearance_width: oldNode.appearance_width,
                                        text_placeholder: oldNode.text_placeholder,
                                        text_maxLength: oldNode.text_maxLength,
                                        text_minLength: oldNode.text_minLength,
                                        text_mask: oldNode.text_mask,
                                        text_regex: oldNode.text_regex,
                                        text_rows: oldNode.text_rows,
                                        text_helpTooltipType: oldNode.text_helpTooltipType,
                                        text_helpTooltipText: oldNode.text_helpTooltipText,
                                        text_helpTooltipImage: oldNode.text_helpTooltipImage,
                                        number_min: oldNode.number_min,
                                        number_max: oldNode.number_max,
                                        number_step: oldNode.number_step,
                                        number_decimals: oldNode.number_decimals,
                                        number_prefix: oldNode.number_prefix,
                                        number_suffix: oldNode.number_suffix,
                                        number_unit: oldNode.number_unit,
                                        number_defaultValue: oldNode.number_defaultValue,
                                        select_multiple: oldNode.select_multiple,
                                        select_searchable: oldNode.select_searchable,
                                        select_allowClear: oldNode.select_allowClear,
                                        select_source: oldNode.select_source ? (function () {
                                            var source = oldNode.select_source;
                                            if (source.startsWith('@table.')) {
                                                var tableId = source.substring(7);
                                                var newTableId = idMap.get(tableId);
                                                if (newTableId) {
                                                    return "@table.".concat(newTableId);
                                                }
                                            }
                                            return source;
                                        })() : oldNode.select_source,
                                        select_defaultValue: oldNode.select_defaultValue,
                                        select_options: oldNode.select_options ? (function () {
                                            try {
                                                var str = JSON.stringify(oldNode.select_options);
                                                var replaced = str.replace(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi, function (uuid) { return idMap.get(uuid) || uuid; });
                                                replaced = replaced.replace(/(node_[a-z0-9_-]+)/gi, function (id) { return idMap.get(id) || id; });
                                                return JSON.parse(replaced);
                                            }
                                            catch (_a) {
                                                return oldNode.select_options;
                                            }
                                        })() : oldNode.select_options,
                                        bool_trueLabel: oldNode.bool_trueLabel,
                                        bool_falseLabel: oldNode.bool_falseLabel,
                                        bool_defaultValue: oldNode.bool_defaultValue,
                                        date_format: oldNode.date_format,
                                        date_minDate: oldNode.date_minDate,
                                        date_maxDate: oldNode.date_maxDate,
                                        date_showTime: oldNode.date_showTime,
                                        image_maxSize: oldNode.image_maxSize,
                                        image_ratio: oldNode.image_ratio,
                                        image_crop: oldNode.image_crop,
                                        image_thumbnails: oldNode.image_thumbnails ? (function () {
                                            try {
                                                var str = JSON.stringify(oldNode.image_thumbnails);
                                                var replaced = str.replace(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi, function (uuid) { return idMap.get(uuid) || uuid; });
                                                replaced = replaced.replace(/(node_[a-z0-9_-]+)/gi, function (id) { return idMap.get(id) || id; });
                                                return JSON.parse(replaced);
                                            }
                                            catch (_a) {
                                                return oldNode.image_thumbnails;
                                            }
                                        })() : oldNode.image_thumbnails,
                                        link_activeId: oldNode.link_activeId,
                                        link_carryContext: oldNode.link_carryContext,
                                        link_mode: oldNode.link_mode,
                                        link_name: oldNode.link_name,
                                        link_params: oldNode.link_params ? (function () {
                                            try {
                                                var str = JSON.stringify(oldNode.link_params);
                                                var replaced = str.replace(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi, function (uuid) { return idMap.get(uuid) || uuid; });
                                                replaced = replaced.replace(/(node_[a-z0-9_-]+)/gi, function (id) { return idMap.get(id) || id; });
                                                return JSON.parse(replaced);
                                            }
                                            catch (_a) {
                                                return oldNode.link_params;
                                            }
                                        })() : oldNode.link_params,
                                        link_targetNodeId: oldNode.link_targetNodeId && idMap.has(oldNode.link_targetNodeId) ? idMap.get(oldNode.link_targetNodeId) : oldNode.link_targetNodeId,
                                        link_targetTreeId: oldNode.link_targetTreeId,
                                        // ?? TABLE: Copier table_activeId, table_instances et table_name du noeud original
                                        // ? IMPORTANT: Ajouter le suffixe aux IDs de table pour pointer aux tables copi�es
                                        table_activeId: oldNode.table_activeId ? "".concat(oldNode.table_activeId, "-").concat(__copySuffixNum) : null,
                                        table_instances: (function () {
                                            var _a, _b;
                                            console.log('\n[DEEP-COPY-TABLE] D�BUT table_instances');
                                            console.log('[DEEP-COPY-TABLE] oldNode.table_instances existe?', !!oldNode.table_instances);
                                            console.log('[DEEP-COPY-TABLE] typeof:', typeof oldNode.table_instances);
                                            console.log('[DEEP-COPY-TABLE] Constructor:', (_b = (_a = oldNode.table_instances) === null || _a === void 0 ? void 0 : _a.constructor) === null || _b === void 0 ? void 0 : _b.name);
                                            console.log('[DEEP-COPY-TABLE] value:', JSON.stringify(oldNode.table_instances).substring(0, 200));
                                            if (!oldNode.table_instances) {
                                                console.log('[DEEP-COPY-TABLE] RETURN: falsy');
                                                return oldNode.table_instances;
                                            }
                                            var rawInstances;
                                            try {
                                                // Toujours parser comme string d'abord
                                                if (typeof oldNode.table_instances === 'string') {
                                                    console.log('[DEEP-COPY-TABLE] Parsing string JSON');
                                                    rawInstances = JSON.parse(oldNode.table_instances);
                                                }
                                                else if (typeof oldNode.table_instances === 'object') {
                                                    console.log('[DEEP-COPY-TABLE] Objet, stringify + parse');
                                                    rawInstances = JSON.parse(JSON.stringify(oldNode.table_instances));
                                                }
                                                else {
                                                    console.log('[DEEP-COPY-TABLE] Type inconnu, return as-is');
                                                    return oldNode.table_instances;
                                                }
                                            }
                                            catch (e) {
                                                console.error('[DEEP-COPY-TABLE] Parse failed:', e);
                                                return oldNode.table_instances;
                                            }
                                            console.log('[DEEP-COPY-TABLE] Keys:', Object.keys(rawInstances));
                                            var updatedInstances = {};
                                            for (var _i = 0, _c = Object.entries(rawInstances); _i < _c.length; _i++) {
                                                var _d = _c[_i], key = _d[0], value = _d[1];
                                                // ? FIX: V�rifier si la cl� a D�J� un suffixe num�rique (-1, -2, etc.)
                                                // Ne pas utiliser includes('-') car UUIDs contiennent des tirets!
                                                var hasSuffixRegex = /-\d+$/; // Suffixe num�rique � la fin
                                                var newKey = hasSuffixRegex.test(key) ? key : "".concat(key, "-").concat(__copySuffixNum);
                                                console.log("[DEEP-COPY-TABLE] Key: \"".concat(key, "\" => \"").concat(newKey, "\""));
                                                if (value && typeof value === 'object') {
                                                    var tableInstanceObj = value;
                                                    var updatedObj = __assign({}, tableInstanceObj);
                                                    if (tableInstanceObj.tableId && typeof tableInstanceObj.tableId === 'string') {
                                                        var oldTableId = tableInstanceObj.tableId;
                                                        // ? FIX: V�rifier si le tableId a D�J� un suffixe num�rique (-1, -2, etc.)
                                                        // Ne pas utiliser includes('-') car UUIDs contiennent des tirets!
                                                        var hasSuffixRegex_1 = /-\d+$/; // Suffixe num�rique � la fin
                                                        updatedObj.tableId = hasSuffixRegex_1.test(oldTableId)
                                                            ? oldTableId
                                                            : "".concat(oldTableId, "-").concat(__copySuffixNum);
                                                        console.log("[DEEP-COPY-TABLE]   tableId: \"".concat(oldTableId, "\" => \"").concat(updatedObj.tableId, "\""));
                                                    }
                                                    updatedInstances[newKey] = updatedObj;
                                                }
                                                else {
                                                    updatedInstances[newKey] = value;
                                                }
                                            }
                                            console.log('[DEEP-COPY-TABLE] FINAL result:', JSON.stringify(updatedInstances).substring(0, 200));
                                            console.log('[DEEP-COPY-TABLE] FIN table_instances\n');
                                            return updatedInstances;
                                        })(),
                                        table_name: oldNode.table_name,
                                        // R�p�ter: recopier la config colonnes repeater telle quelle
                                        repeater_templateNodeIds: oldNode.repeater_templateNodeIds,
                                        repeater_templateNodeLabels: oldNode.repeater_templateNodeLabels,
                                        repeater_minItems: oldNode.repeater_minItems,
                                        repeater_maxItems: oldNode.repeater_maxItems,
                                        repeater_addButtonLabel: oldNode.repeater_addButtonLabel,
                                        repeater_buttonSize: oldNode.repeater_buttonSize,
                                        repeater_buttonWidth: oldNode.repeater_buttonWidth,
                                        repeater_iconOnly: oldNode.repeater_iconOnly,
                                        // METADATA: noter la provenance et supprimer les shared refs (copie indépendante)
                                        metadata: __assign(__assign({}, (typeof oldNode.metadata === 'object' ? oldNode.metadata : {})), { copiedFromNodeId: oldNode.id, copySuffix: __copySuffixNum }),
                                        // SHARED REFS → conditionnellement préservées ou supprimées
                                        isSharedReference: preserveSharedReferences ? oldNode.isSharedReference : false,
                                        sharedReferenceId: preserveSharedReferences ? oldNode.sharedReferenceId : null,
                                        sharedReferenceIds: preserveSharedReferences ? oldNode.sharedReferenceIds : [],
                                        sharedReferenceName: preserveSharedReferences ? oldNode.sharedReferenceName : null,
                                        sharedReferenceDescription: preserveSharedReferences ? oldNode.sharedReferenceDescription : null,
                                        // ?? COLONNES LINKED*** : Copier les r�f�rences existantes, cr�er les nouvelles apr�s
                                        linkedFormulaIds: Array.isArray(oldNode.linkedFormulaIds)
                                            ? oldNode.linkedFormulaIds
                                            : [],
                                        linkedConditionIds: Array.isArray(oldNode.linkedConditionIds)
                                            ? oldNode.linkedConditionIds
                                            : [],
                                        linkedTableIds: Array.isArray(oldNode.linkedTableIds)
                                            // ? AJOUTER LES SUFFIXES aux IDs de table ici aussi!
                                            ? oldNode.linkedTableIds.map(function (id) { return "".concat(id, "-").concat(__copySuffixNum); })
                                            : [],
                                        linkedVariableIds: Array.isArray(oldNode.linkedVariableIds)
                                            ? oldNode.linkedVariableIds
                                            : [],
                                        updatedAt: new Date(),
                                    };
                                    console.log("?? [CREATE-NODE] Cr\uFFFDation n\uFFFDud ".concat(newId, " (").concat(oldNode.label, ")"));
                                    console.log("   oldNode.linkedVariableIds:", oldNode.linkedVariableIds);
                                    console.log("   cloneData.linkedVariableIds:", cloneData.linkedVariableIds);
                                    return [4 /*yield*/, prisma.treeBranchLeafNode.create({ data: cloneData })];
                                case 1:
                                    _v.sent();
                                    createdNodes.push({ oldId: oldId, newId: newId });
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _g = 0, nodesToCreate_1 = nodesToCreate;
                    _u.label = 5;
                case 5:
                    if (!(_g < nodesToCreate_1.length)) return [3 /*break*/, 8];
                    oldId = nodesToCreate_1[_g];
                    return [5 /*yield**/, _loop_4(oldId)];
                case 6:
                    _u.sent();
                    _u.label = 7;
                case 7:
                    _g++;
                    return [3 /*break*/, 5];
                case 8:
                    _h = 0, createdNodes_1 = createdNodes;
                    _u.label = 9;
                case 9:
                    if (!(_h < createdNodes_1.length)) return [3 /*break*/, 39];
                    _j = createdNodes_1[_h], oldId = _j.oldId, newId = _j.newId;
                    return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findMany({ where: { nodeId: oldId } })];
                case 10:
                    formulas = _u.sent();
                    _k = 0, formulas_4 = formulas;
                    _u.label = 11;
                case 11:
                    if (!(_k < formulas_4.length)) return [3 /*break*/, 21];
                    f = formulas_4[_k];
                    newFormulaId = "".concat(f.id, "-").concat(__copySuffixNum);
                    formulaIdMap.set(f.id, newFormulaId);
                    newTokens = replaceIdsInTokens(f.tokens, idMap);
                    return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.create({
                            data: {
                                id: newFormulaId,
                                nodeId: newId,
                                organizationId: f.organizationId,
                                name: f.name ? "".concat(f.name).concat(__computedLabelSuffix) : f.name,
                                tokens: newTokens,
                                description: f.description,
                                isDefault: f.isDefault,
                                order: f.order,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            }
                        })];
                case 12:
                    _u.sent();
                    _u.label = 13;
                case 13:
                    _u.trys.push([13, 19, , 20]);
                    return [4 /*yield*/, addToNodeLinkedField(prisma, newId, 'linkedFormulaIds', [newFormulaId])];
                case 14:
                    _u.sent();
                    refs = Array.from(extractNodeIdsFromTokens(newTokens));
                    _l = 0, refs_1 = refs;
                    _u.label = 15;
                case 15:
                    if (!(_l < refs_1.length)) return [3 /*break*/, 18];
                    refId = refs_1[_l];
                    return [4 /*yield*/, addToNodeLinkedField(prisma, normalizeRefId(refId), 'linkedFormulaIds', [newFormulaId])];
                case 16:
                    _u.sent();
                    _u.label = 17;
                case 17:
                    _l++;
                    return [3 /*break*/, 15];
                case 18: return [3 /*break*/, 20];
                case 19:
                    e_3 = _u.sent();
                    console.warn('[TreeBranchLeaf API] Warning updating linkedFormulaIds during deep copy:', e_3.message);
                    return [3 /*break*/, 20];
                case 20:
                    _k++;
                    return [3 /*break*/, 11];
                case 21: return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.findMany({ where: { nodeId: oldId } })];
                case 22:
                    conditions = _u.sent();
                    _o = 0, conditions_1 = conditions;
                    _u.label = 23;
                case 23:
                    if (!(_o < conditions_1.length)) return [3 /*break*/, 33];
                    c = conditions_1[_o];
                    newConditionId = "".concat(c.id, "-").concat(__copySuffixNum);
                    conditionIdMap.set(c.id, newConditionId);
                    newSet = replaceIdsInConditionSet(c.conditionSet, idMap, formulaIdMap);
                    return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.create({
                            data: {
                                id: newConditionId,
                                nodeId: newId,
                                organizationId: c.organizationId,
                                name: c.name ? "".concat(c.name).concat(__computedLabelSuffix) : c.name,
                                conditionSet: newSet,
                                description: c.description,
                                isDefault: c.isDefault,
                                order: c.order,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            }
                        })];
                case 24:
                    _u.sent();
                    _u.label = 25;
                case 25:
                    _u.trys.push([25, 31, , 32]);
                    return [4 /*yield*/, addToNodeLinkedField(prisma, newId, 'linkedConditionIds', [newConditionId])];
                case 26:
                    _u.sent();
                    refs = Array.from(extractNodeIdsFromConditionSet(newSet));
                    _p = 0, refs_2 = refs;
                    _u.label = 27;
                case 27:
                    if (!(_p < refs_2.length)) return [3 /*break*/, 30];
                    refId = refs_2[_p];
                    return [4 /*yield*/, addToNodeLinkedField(prisma, normalizeRefId(refId), 'linkedConditionIds', [newConditionId])];
                case 28:
                    _u.sent();
                    _u.label = 29;
                case 29:
                    _p++;
                    return [3 /*break*/, 27];
                case 30: return [3 /*break*/, 32];
                case 31:
                    e_4 = _u.sent();
                    console.warn('[TreeBranchLeaf API] Warning updating linkedConditionIds during deep copy:', e_4.message);
                    return [3 /*break*/, 32];
                case 32:
                    _o++;
                    return [3 /*break*/, 23];
                case 33: return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findMany({
                        where: { nodeId: oldId },
                        include: { tableColumns: true, tableRows: true }
                    })];
                case 34:
                    tables = _u.sent();
                    _loop_5 = function (t) {
                        var newTableId, e_7;
                        return __generator(this, function (_w) {
                            switch (_w.label) {
                                case 0:
                                    newTableId = "".concat(t.id, "-").concat(__copySuffixNum);
                                    tableIdMap.set(t.id, newTableId); // ?? Tracer la copie
                                    return [4 /*yield*/, prisma.treeBranchLeafNodeTable.create({
                                            data: {
                                                id: newTableId,
                                                nodeId: newId,
                                                organizationId: t.organizationId,
                                                name: t.name ? "".concat(t.name).concat(__computedLabelSuffix) : t.name,
                                                description: t.description,
                                                type: t.type,
                                                rowCount: t.rowCount,
                                                columnCount: t.columnCount,
                                                // ?? COPIE TABLE META: suffixer comparisonColumn et UUIDs si c'est du texte
                                                meta: (function () {
                                                    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _o;
                                                    if (!t.meta)
                                                        return t.meta;
                                                    try {
                                                        var metaObj = typeof t.meta === 'string' ? JSON.parse(t.meta) : JSON.parse(JSON.stringify(t.meta));
                                                        // Suffixer les UUIDs dans selectors
                                                        if (((_b = (_a = metaObj === null || metaObj === void 0 ? void 0 : metaObj.lookup) === null || _a === void 0 ? void 0 : _a.selectors) === null || _b === void 0 ? void 0 : _b.columnFieldId) && !metaObj.lookup.selectors.columnFieldId.endsWith("-".concat(__copySuffixNum))) {
                                                            metaObj.lookup.selectors.columnFieldId = "".concat(metaObj.lookup.selectors.columnFieldId, "-").concat(__copySuffixNum);
                                                        }
                                                        if (((_d = (_c = metaObj === null || metaObj === void 0 ? void 0 : metaObj.lookup) === null || _c === void 0 ? void 0 : _c.selectors) === null || _d === void 0 ? void 0 : _d.rowFieldId) && !metaObj.lookup.selectors.rowFieldId.endsWith("-".concat(__copySuffixNum))) {
                                                            metaObj.lookup.selectors.rowFieldId = "".concat(metaObj.lookup.selectors.rowFieldId, "-").concat(__copySuffixNum);
                                                        }
                                                        // Suffixer sourceField dans rowSourceOption
                                                        if (((_f = (_e = metaObj === null || metaObj === void 0 ? void 0 : metaObj.lookup) === null || _e === void 0 ? void 0 : _e.rowSourceOption) === null || _f === void 0 ? void 0 : _f.sourceField) && !metaObj.lookup.rowSourceOption.sourceField.endsWith("-".concat(__copySuffixNum))) {
                                                            metaObj.lookup.rowSourceOption.sourceField = "".concat(metaObj.lookup.rowSourceOption.sourceField, "-").concat(__copySuffixNum);
                                                        }
                                                        // Suffixer sourceField dans columnSourceOption
                                                        if (((_h = (_g = metaObj === null || metaObj === void 0 ? void 0 : metaObj.lookup) === null || _g === void 0 ? void 0 : _g.columnSourceOption) === null || _h === void 0 ? void 0 : _h.sourceField) && !metaObj.lookup.columnSourceOption.sourceField.endsWith("-".concat(__copySuffixNum))) {
                                                            metaObj.lookup.columnSourceOption.sourceField = "".concat(metaObj.lookup.columnSourceOption.sourceField, "-").concat(__copySuffixNum);
                                                        }
                                                        // Suffixer comparisonColumn dans rowSourceOption si c'est du texte
                                                        if ((_k = (_j = metaObj === null || metaObj === void 0 ? void 0 : metaObj.lookup) === null || _j === void 0 ? void 0 : _j.rowSourceOption) === null || _k === void 0 ? void 0 : _k.comparisonColumn) {
                                                            var val = metaObj.lookup.rowSourceOption.comparisonColumn;
                                                            if (!/^-?\d+(\.\d+)?$/.test(val.trim()) && !val.endsWith(__computedLabelSuffix)) {
                                                                metaObj.lookup.rowSourceOption.comparisonColumn = "".concat(val).concat(__computedLabelSuffix);
                                                            }
                                                        }
                                                        // Suffixer comparisonColumn dans columnSourceOption si c'est du texte
                                                        if ((_o = (_l = metaObj === null || metaObj === void 0 ? void 0 : metaObj.lookup) === null || _l === void 0 ? void 0 : _l.columnSourceOption) === null || _o === void 0 ? void 0 : _o.comparisonColumn) {
                                                            var val = metaObj.lookup.columnSourceOption.comparisonColumn;
                                                            if (!/^-?\d+(\.\d+)?$/.test(val.trim()) && !val.endsWith(__computedLabelSuffix)) {
                                                                metaObj.lookup.columnSourceOption.comparisonColumn = "".concat(val).concat(__computedLabelSuffix);
                                                            }
                                                        }
                                                        return metaObj;
                                                    }
                                                    catch (_p) {
                                                        return t.meta;
                                                    }
                                                })(),
                                                isDefault: t.isDefault,
                                                order: t.order,
                                                createdAt: new Date(),
                                                updatedAt: new Date(),
                                                lookupDisplayColumns: t.lookupDisplayColumns,
                                                lookupSelectColumn: t.lookupSelectColumn,
                                                tableColumns: {
                                                    create: t.tableColumns.map(function (col) { return ({
                                                        id: "".concat(col.id, "-").concat(__copySuffixNum),
                                                        columnIndex: col.columnIndex,
                                                        // ?? COPIE TABLE COLUMN: suffixe seulement pour texte, pas pour nombres
                                                        name: col.name
                                                            ? (/^-?\d+(\.\d+)?$/.test(col.name.trim()) ? col.name : "".concat(col.name).concat(__computedLabelSuffix))
                                                            : col.name,
                                                        type: col.type,
                                                        width: col.width,
                                                        format: col.format,
                                                        metadata: col.metadata,
                                                    }); })
                                                },
                                                tableRows: {
                                                    create: t.tableRows.map(function (row) { return ({
                                                        id: "".concat(row.id, "-").concat(__copySuffixNum),
                                                        rowIndex: row.rowIndex,
                                                        cells: row.cells,
                                                    }); })
                                                }
                                            }
                                        })];
                                case 1:
                                    _w.sent();
                                    _w.label = 2;
                                case 2:
                                    _w.trys.push([2, 4, , 5]);
                                    return [4 /*yield*/, addToNodeLinkedField(prisma, newId, 'linkedTableIds', [newTableId])];
                                case 3:
                                    _w.sent();
                                    return [3 /*break*/, 5];
                                case 4:
                                    e_7 = _w.sent();
                                    console.warn('[TreeBranchLeaf API] Warning updating linkedTableIds during deep copy:', e_7.message);
                                    return [3 /*break*/, 5];
                                case 5: return [2 /*return*/];
                            }
                        });
                    };
                    _q = 0, tables_1 = tables;
                    _u.label = 35;
                case 35:
                    if (!(_q < tables_1.length)) return [3 /*break*/, 38];
                    t = tables_1[_q];
                    return [5 /*yield**/, _loop_5(t)];
                case 36:
                    _u.sent();
                    _u.label = 37;
                case 37:
                    _q++;
                    return [3 /*break*/, 35];
                case 38:
                    _h++;
                    return [3 /*break*/, 9];
                case 39:
                    variableCopyCache = new Map();
                    _r = 0, toCopy_2 = toCopy;
                    _u.label = 40;
                case 40:
                    if (!(_r < toCopy_2.length)) return [3 /*break*/, 55];
                    oldNodeId = toCopy_2[_r];
                    newNodeId = idMap.get(oldNodeId);
                    oldNode = byId.get(oldNodeId);
                    newLinkedFormulaIds = (Array.isArray(oldNode.linkedFormulaIds) ? oldNode.linkedFormulaIds : [])
                        .map(function (id) {
                        var mappedId = formulaIdMap.get(id);
                        // ? Si d�j� mapp� (avec suffixe), on le retourne directement. Sinon on ajoute le suffixe.
                        return mappedId !== null && mappedId !== void 0 ? mappedId : "".concat(id, "-").concat(__copySuffixNum);
                    })
                        .filter(Boolean);
                    newLinkedConditionIds = (Array.isArray(oldNode.linkedConditionIds) ? oldNode.linkedConditionIds : [])
                        .map(function (id) {
                        var mappedId = conditionIdMap.get(id);
                        // ? Si d�j� mapp� (avec suffixe), on le retourne directement. Sinon on ajoute le suffixe.
                        return mappedId !== null && mappedId !== void 0 ? mappedId : "".concat(id, "-").concat(__copySuffixNum);
                    })
                        .filter(Boolean);
                    newLinkedTableIds = (Array.isArray(oldNode.linkedTableIds) ? oldNode.linkedTableIds : [])
                        .map(function (id) {
                        var mappedId = tableIdMap.get(id);
                        // ? Si d�j� mapp� (avec suffixe), on le retourne directement. Sinon on ajoute le suffixe.
                        return mappedId !== null && mappedId !== void 0 ? mappedId : "".concat(id, "-").concat(__copySuffixNum);
                    })
                        .filter(Boolean);
                    newLinkedVariableIds = [];
                    // ?? COPIE DES VARIABLES DANS TreeBranchLeafNodeVariable
                    console.log("\n[DEEP-COPY] ? COPIE linkedVariableIds pour n\uFFFDud ".concat(newNodeId));
                    console.log("[DEEP-COPY] Ancien n\uFFFDud label: ".concat(oldNode.label));
                    console.log("[DEEP-COPY] Ancien n\uFFFDud type: ".concat(oldNode.type, ", subType: ").concat(oldNode.subType));
                    console.log("[DEEP-COPY] linkedVariableIds RAW:", oldNode.linkedVariableIds);
                    shouldCreateDisplayNodes = true;
                    console.log("[DEEP-COPY] shouldCreateDisplayNodes (forced): ".concat(shouldCreateDisplayNodes));
                    if (!(Array.isArray(oldNode.linkedVariableIds) && oldNode.linkedVariableIds.length > 0)) return [3 /*break*/, 49];
                    console.log("[DEEP-COPY] ? COPIE ".concat(oldNode.linkedVariableIds.length, " variable(s)"));
                    _s = 0, _t = oldNode.linkedVariableIds;
                    _u.label = 41;
                case 41:
                    if (!(_s < _t.length)) return [3 /*break*/, 48];
                    linkedVarId = _t[_s];
                    isSharedRef = typeof linkedVarId === 'string' && linkedVarId.startsWith('shared-ref-');
                    console.log("[DEEP-COPY] Traitement linkedVarId=\"".concat(linkedVarId, "\", isSharedRef=").concat(isSharedRef));
                    if (!isSharedRef) return [3 /*break*/, 42];
                    // ? Shared Reference : GARDER tel quel
                    console.log("[DEEP-COPY] PRESERVED SHARED: ".concat(linkedVarId));
                    newLinkedVariableIds.push(linkedVarId);
                    return [3 /*break*/, 47];
                case 42:
                    newVarId = "".concat(linkedVarId, "-").concat(__copySuffixNum);
                    console.log("[DEEP-COPY] COPYING NORMAL VAR: ".concat(linkedVarId, " ? ").concat(newVarId));
                    _u.label = 43;
                case 43:
                    _u.trys.push([43, 46, , 47]);
                    if (!shouldCreateDisplayNodes) return [3 /*break*/, 45];
                    // ?? Utiliser copyVariableWithCapacities pour cr�er le n�ud d'affichage
                    console.log("[DEEP-COPY] ?? Appel copyVariableWithCapacities avec autoCreateDisplayNode=true");
                    return [4 /*yield*/, (0, variable_copy_engine_js_1.copyVariableWithCapacities)(linkedVarId, __copySuffixNum, newNodeId, prisma, {
                            formulaIdMap: formulaIdMap,
                            conditionIdMap: conditionIdMap,
                            tableIdMap: tableIdMap,
                            nodeIdMap: idMap,
                            variableCopyCache: variableCopyCache,
                            autoCreateDisplayNode: true,
                            displayNodeAlreadyCreated: false
                        })];
                case 44:
                    copyResult = _u.sent();
                    if (copyResult.success) {
                        console.log("[DEEP-COPY] ? Created with display node: ".concat(copyResult.variableId));
                        newLinkedVariableIds.push(copyResult.variableId);
                    }
                    else {
                        console.error("[DEEP-COPY] ? Copy failed: ".concat(copyResult.error));
                        newLinkedVariableIds.push(linkedVarId);
                    }
                    _u.label = 45;
                case 45: return [3 /*break*/, 47];
                case 46:
                    e_5 = _u.sent();
                    console.error("[DEEP-COPY] ? Exception: ".concat(e_5.message));
                    newLinkedVariableIds.push(linkedVarId);
                    return [3 /*break*/, 47];
                case 47:
                    _s++;
                    return [3 /*break*/, 41];
                case 48:
                    console.log("[DEEP-COPY] DONE - Total: ".concat(newLinkedVariableIds.length));
                    return [3 /*break*/, 50];
                case 49:
                    console.log("[DEEP-COPY] NO linked variables");
                    _u.label = 50;
                case 50:
                    if (!(newLinkedFormulaIds.length > 0 || newLinkedConditionIds.length > 0 || newLinkedTableIds.length > 0 || newLinkedVariableIds.length > 0)) return [3 /*break*/, 54];
                    _u.label = 51;
                case 51:
                    _u.trys.push([51, 53, , 54]);
                    return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                            where: { id: newNodeId },
                            data: {
                                linkedFormulaIds: newLinkedFormulaIds.length > 0 ? { set: newLinkedFormulaIds } : { set: [] },
                                linkedConditionIds: newLinkedConditionIds.length > 0 ? { set: newLinkedConditionIds } : { set: [] },
                                linkedTableIds: newLinkedTableIds.length > 0 ? { set: newLinkedTableIds } : { set: [] },
                                linkedVariableIds: newLinkedVariableIds.length > 0 ? { set: newLinkedVariableIds } : { set: [] },
                            }
                        })];
                case 52:
                    _u.sent();
                    console.log("? [DEEP-COPY] N\uFFFDud ".concat(newNodeId, " mis \uFFFD jour - linkedFormulaIds: ").concat(newLinkedFormulaIds.length, ", linkedConditionIds: ").concat(newLinkedConditionIds.length, ", linkedTableIds: ").concat(newLinkedTableIds.length, ", linkedVariableIds: ").concat(newLinkedVariableIds.length));
                    return [3 /*break*/, 54];
                case 53:
                    e_6 = _u.sent();
                    console.warn("?? [DEEP-COPY] Erreur lors du UPDATE des linked*** pour ".concat(newNodeId, ":"), e_6.message);
                    return [3 /*break*/, 54];
                case 54:
                    _r++;
                    return [3 /*break*/, 40];
                case 55:
                    rootNewId = idMap.get(source.id);
                    return [2 /*return*/, {
                            root: { oldId: source.id, newId: rootNewId },
                            idMap: Object.fromEntries(idMap),
                            formulaIdMap: Object.fromEntries(formulaIdMap),
                            conditionIdMap: Object.fromEntries(conditionIdMap),
                            tableIdMap: Object.fromEntries(tableIdMap)
                        }];
            }
        });
    });
}
router.post('/nodes/:nodeId/deep-copy', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, _a, targetParentId, labelSuffix, result, error_11;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                nodeId = req.params.nodeId;
                _a = (req.body || {}), targetParentId = _a.targetParentId, labelSuffix = _a.labelSuffix;
                return [4 /*yield*/, (0, deep_copy_service_js_1.deepCopyNodeInternal)(prisma, req, nodeId, { targetParentId: targetParentId })];
            case 1:
                result = _b.sent();
                res.json(result);
                return [3 /*break*/, 3];
            case 2:
                error_11 = _b.sent();
                console.error('❌ [/nodes/:nodeId/deep-copy] Erreur:', error_11);
                res.status(500).json({ error: 'Erreur lors de la copie profonde' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// POST /api/treebranchleaf/trees/:treeId/nodes - Créer un nœud
router.post('/trees/:treeId/nodes', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var treeId, organizationId, nodeData, tree, allowedTypes, parentNode, parentType, parentSubType, childType, childSubType, validationResult, errorMessage, childType, childSubType, validationResult, errorMessage, randomUUID_1, nodeId, node, error_12;
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    return __generator(this, function (_o) {
        switch (_o.label) {
            case 0:
                _o.trys.push([0, 7, , 8]);
                treeId = req.params.treeId;
                organizationId = req.user.organizationId;
                nodeData = req.body;
                console.log('[TreeBranchLeaf API] Creating node:', { treeId: treeId, nodeData: nodeData });
                return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({
                        where: { id: treeId, organizationId: organizationId }
                    })];
            case 1:
                tree = _o.sent();
                if (!tree) {
                    return [2 /*return*/, res.status(404).json({ error: 'Arbre non trouvé' })];
                }
                // Vérifier les champs obligatoires
                if (!nodeData.type || !nodeData.label) {
                    return [2 /*return*/, res.status(400).json({ error: 'Les champs type et label sont obligatoires' })];
                }
                allowedTypes = [
                    'branch', // Branche = conteneur hiérarchique
                    'section', // Section = groupe de champs calculés
                    'leaf_field', // Champ standard (text, email, etc.)
                    'leaf_option', // Option pour un champ SELECT
                    'leaf_option_field', // Option + Champ (combiné) ← ajouté pour débloquer O+C
                    'leaf_text', // Champ texte simple
                    'leaf_email', // Champ email
                    'leaf_phone', // Champ téléphone
                    'leaf_date', // Champ date
                    'leaf_number', // Champ numérique
                    'leaf_checkbox', // Case à cocher
                    'leaf_select', // Liste déroulante
                    'leaf_radio', // Boutons radio
                    'leaf_repeater' // Bloc répétable (conteneur de champs répétables)
                ];
                if (!allowedTypes.includes(nodeData.type)) {
                    return [2 /*return*/, res.status(400).json({
                            error: "Type de n\u0153ud non autoris\u00E9: ".concat(nodeData.type, ". Types autoris\u00E9s: ").concat(allowedTypes.join(', '))
                        })];
                }
                if (!nodeData.parentId) return [3 /*break*/, 3];
                return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({
                        where: { id: nodeData.parentId, treeId: treeId }
                    })];
            case 2:
                parentNode = _o.sent();
                if (!parentNode) {
                    return [2 /*return*/, res.status(400).json({ error: 'Nœud parent non trouvé' })];
                }
                parentType = parentNode.type;
                parentSubType = parentNode.subType;
                childType = nodeData.type;
                childSubType = (nodeData.subType || nodeData.fieldType || 'data');
                validationResult = (0, hierarchyRules_1.validateParentChildRelation)(parentType, parentSubType, childType, childSubType);
                if (!validationResult.isValid) {
                    errorMessage = (0, hierarchyRules_1.getValidationErrorMessage)(parentType, parentSubType, childType, childSubType);
                    console.log("[TreeBranchLeaf API] Validation failed: ".concat(errorMessage));
                    return [2 /*return*/, res.status(400).json({
                            error: errorMessage
                        })];
                }
                console.log("[TreeBranchLeaf API] Validation passed: ".concat(parentType, "(").concat(parentSubType, ") -> ").concat(childType, "(").concat(childSubType, ")"));
                return [3 /*break*/, 4];
            case 3:
                childType = nodeData.type;
                childSubType = (nodeData.subType || nodeData.fieldType || 'data');
                validationResult = (0, hierarchyRules_1.validateParentChildRelation)('tree', 'data', childType, childSubType);
                if (!validationResult.isValid) {
                    errorMessage = (0, hierarchyRules_1.getValidationErrorMessage)('tree', 'data', childType, childSubType);
                    console.log("[TreeBranchLeaf API] Root validation failed: ".concat(errorMessage));
                    return [2 /*return*/, res.status(400).json({
                            error: errorMessage
                        })];
                }
                console.log("[TreeBranchLeaf API] Root validation passed: tree -> ".concat(childType, "(").concat(childSubType, ")"));
                _o.label = 4;
            case 4: return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('crypto')); })];
            case 5:
                randomUUID_1 = (_o.sent()).randomUUID;
                nodeId = randomUUID_1();
                return [4 /*yield*/, prisma.treeBranchLeafNode.create({
                        data: {
                            id: nodeId,
                            treeId: treeId,
                            type: nodeData.type,
                            subType: nodeData.subType || nodeData.fieldType || 'data',
                            label: nodeData.label,
                            description: nodeData.description || null,
                            parentId: nodeData.parentId || null,
                            order: (_a = nodeData.order) !== null && _a !== void 0 ? _a : 0,
                            isVisible: (_b = nodeData.isVisible) !== null && _b !== void 0 ? _b : true,
                            isActive: (_c = nodeData.isActive) !== null && _c !== void 0 ? _c : true,
                            // Par défaut, AUCUNE capacité n'est activée automatiquement
                            hasData: (_d = nodeData.hasData) !== null && _d !== void 0 ? _d : false,
                            hasFormula: (_e = nodeData.hasFormula) !== null && _e !== void 0 ? _e : false,
                            hasCondition: (_f = nodeData.hasCondition) !== null && _f !== void 0 ? _f : false,
                            hasTable: (_g = nodeData.hasTable) !== null && _g !== void 0 ? _g : false,
                            hasAPI: (_h = nodeData.hasAPI) !== null && _h !== void 0 ? _h : false,
                            hasLink: (_j = nodeData.hasLink) !== null && _j !== void 0 ? _j : false,
                            hasMarkers: (_k = nodeData.hasMarkers) !== null && _k !== void 0 ? _k : false,
                            metadata: (_l = nodeData.metadata) !== null && _l !== void 0 ? _l : {},
                            updatedAt: new Date()
                        }
                    })];
            case 6:
                node = _o.sent();
                console.log('[TreeBranchLeaf API] Node created successfully:', node.id);
                res.status(201).json(node);
                return [3 /*break*/, 8];
            case 7:
                error_12 = _o.sent();
                console.error('[TreeBranchLeaf API] Error creating node:', error_12);
                res.status(500).json({ error: 'Impossible de créer le nœud' });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
// ============================================================================= 
// 🔄 HELPER : Conversion JSON metadata vers colonnes dédiées
// =============================================================================
/**
 * Convertit les données JSON des metadata vers les nouvelles colonnes dédiées
 */
// =============================================================================
// 🔄 MIGRATION JSON → COLONNES DÉDIÉES
// =============================================================================
/**
 * 🔄 STRATÉGIE MIGRATION : JSON → Colonnes dédiées
 * Extraite TOUTES les données depuis metadata et fieldConfig pour les mapper vers les nouvelles colonnes
 * OBJECTIF : Plus jamais de JSON, une seule source de vérité
 */
function mapJSONToColumns(updateData) {
    var columnData = {};
    // ✅ PROTECTION DÉFENSIVE - Vérifier la structure des données
    if (!updateData || typeof updateData !== 'object') {
        console.log('🔄 [mapJSONToColumns] ❌ updateData invalide:', updateData);
        return columnData;
    }
    // Extraire les metadata et fieldConfig si présentes avec protection
    var metadata = (updateData.metadata && typeof updateData.metadata === 'object' ? updateData.metadata : {});
    var fieldConfig = (updateData.fieldConfig && typeof updateData.fieldConfig === 'object' ? updateData.fieldConfig : {});
    var appearanceConfig = (updateData.appearanceConfig && typeof updateData.appearanceConfig === 'object' ? updateData.appearanceConfig : {});
    console.log('🔄 [mapJSONToColumns] Entrées détectées:', {
        hasMetadata: Object.keys(metadata).length > 0,
        hasFieldConfig: Object.keys(fieldConfig).length > 0,
        hasAppearanceConfig: Object.keys(appearanceConfig).length > 0,
        metadataKeys: Object.keys(metadata),
        fieldConfigKeys: Object.keys(fieldConfig),
        appearanceConfigKeys: Object.keys(appearanceConfig)
    });
    // ✅ ÉTAPE 1 : Migration depuis appearanceConfig (NOUVEAU système prioritaire)
    if (Object.keys(appearanceConfig).length > 0) {
        console.log('🔄 [mapJSONToColumns] Traitement appearanceConfig:', appearanceConfig);
        if (appearanceConfig.size)
            columnData.appearance_size = appearanceConfig.size;
        if (appearanceConfig.width)
            columnData.appearance_width = appearanceConfig.width;
        if (appearanceConfig.variant)
            columnData.appearance_variant = appearanceConfig.variant;
        // Copier tous les autres champs d'apparence possibles
        if (appearanceConfig.textSize)
            columnData.appearance_size = appearanceConfig.textSize;
        if (appearanceConfig.fieldWidth)
            columnData.appearance_width = appearanceConfig.fieldWidth;
        if (appearanceConfig.fieldVariant)
            columnData.appearance_variant = appearanceConfig.fieldVariant;
        // ?? Configuration tooltip d'aide (pour TOUS les champs)
        if (appearanceConfig.helpTooltipType)
            columnData.text_helpTooltipType = appearanceConfig.helpTooltipType;
        if (appearanceConfig.helpTooltipText)
            columnData.text_helpTooltipText = appearanceConfig.helpTooltipText;
        if (appearanceConfig.helpTooltipImage)
            columnData.text_helpTooltipImage = appearanceConfig.helpTooltipImage;
        // ?? Configuration sections/branches (COLONNES DESKTOP/MOBILE)
        if (appearanceConfig.collapsible !== undefined)
            columnData.section_collapsible = appearanceConfig.collapsible;
        if (appearanceConfig.defaultCollapsed !== undefined)
            columnData.section_defaultCollapsed = appearanceConfig.defaultCollapsed;
        if (appearanceConfig.showChildrenCount !== undefined)
            columnData.section_showChildrenCount = appearanceConfig.showChildrenCount;
        if (appearanceConfig.columnsDesktop !== undefined)
            columnData.section_columnsDesktop = appearanceConfig.columnsDesktop;
        if (appearanceConfig.columnsMobile !== undefined)
            columnData.section_columnsMobile = appearanceConfig.columnsMobile;
        if (appearanceConfig.gutter !== undefined)
            columnData.section_gutter = appearanceConfig.gutter;
        // ?? Configuration fichiers
        if (appearanceConfig.maxFileSize !== undefined)
            columnData.file_maxSize = appearanceConfig.maxFileSize;
        if (appearanceConfig.allowedTypes)
            columnData.file_allowedTypes = appearanceConfig.allowedTypes;
        if (appearanceConfig.multiple !== undefined)
            columnData.file_multiple = appearanceConfig.multiple;
        if (appearanceConfig.showPreview !== undefined)
            columnData.file_showPreview = appearanceConfig.showPreview;
        // ?? Propri�t�s avanc�es universelles
        if (appearanceConfig.visibleToUser !== undefined)
            columnData.data_visibleToUser = appearanceConfig.visibleToUser;
        if (appearanceConfig.isRequired !== undefined)
            columnData.isRequired = appearanceConfig.isRequired;
        // ?? NOUVEAU: Mapping direct prefix/suffix/unit/decimals depuis appearanceConfig
        // Ces valeurs viennent directement du UniversalPanel
        if (appearanceConfig.prefix !== undefined)
            columnData.number_prefix = appearanceConfig.prefix || null;
        if (appearanceConfig.suffix !== undefined)
            columnData.number_suffix = appearanceConfig.suffix || null;
        if (appearanceConfig.unit !== undefined)
            columnData.number_unit = appearanceConfig.unit || null;
        if (appearanceConfig.decimals !== undefined)
            columnData.number_decimals = appearanceConfig.decimals;
        if (appearanceConfig.min !== undefined)
            columnData.number_min = appearanceConfig.min;
        if (appearanceConfig.max !== undefined)
            columnData.number_max = appearanceConfig.max;
        if (appearanceConfig.step !== undefined)
            columnData.number_step = appearanceConfig.step;
    }
    // ✅ ÉTAPE 1bis : Migration depuis metadata.appearance (fallback)
    if (metadata.appearance && typeof metadata.appearance === 'object') {
        var metaAppearance = metadata.appearance;
        console.log('🔄 [mapJSONToColumns] Traitement metadata.appearance:', metaAppearance);
        if (metaAppearance.size && !columnData.appearance_size)
            columnData.appearance_size = metaAppearance.size;
        if (metaAppearance.width && !columnData.appearance_width)
            columnData.appearance_width = metaAppearance.width;
        if (metaAppearance.variant && !columnData.appearance_variant)
            columnData.appearance_variant = metaAppearance.variant;
    }
    // ✅ ÉTAPE 1ter : Migration depuis metadata.repeater (NOUVEAU)
    if (metadata.repeater && typeof metadata.repeater === 'object') {
        var repeaterMeta = metadata.repeater;
        console.log('🔄 [mapJSONToColumns] 🔥 Traitement metadata.repeater:', repeaterMeta);
        // Sauvegarder templateNodeIds en JSON dans la colonne dédiée
        if ('templateNodeIds' in repeaterMeta) {
            if (Array.isArray(repeaterMeta.templateNodeIds)) {
                columnData.repeater_templateNodeIds = repeaterMeta.templateNodeIds.length > 0
                    ? JSON.stringify(repeaterMeta.templateNodeIds)
                    : null;
                console.log('✅ [mapJSONToColumns] repeater_templateNodeIds sauvegardé:', repeaterMeta.templateNodeIds);
            }
            else {
                columnData.repeater_templateNodeIds = null;
                console.log('✅ [mapJSONToColumns] repeater_templateNodeIds remis à NULL (valeur non-array)');
            }
        }
        // 🏷️ SAUVEGARDER templateNodeLabels en JSON dans la colonne dédiée
        if (repeaterMeta.templateNodeLabels && typeof repeaterMeta.templateNodeLabels === 'object') {
            columnData.repeater_templateNodeLabels = JSON.stringify(repeaterMeta.templateNodeLabels);
            console.log('✅ [mapJSONToColumns] 🏷️ repeater_templateNodeLabels sauvegardé:', repeaterMeta.templateNodeLabels);
        }
        else if ('templateNodeLabels' in repeaterMeta) {
            columnData.repeater_templateNodeLabels = null;
        }
        if (repeaterMeta.minItems !== undefined)
            columnData.repeater_minItems = repeaterMeta.minItems;
        if (repeaterMeta.maxItems !== undefined)
            columnData.repeater_maxItems = repeaterMeta.maxItems;
        if (repeaterMeta.addButtonLabel)
            columnData.repeater_addButtonLabel = repeaterMeta.addButtonLabel;
        if (repeaterMeta.buttonSize)
            columnData.repeater_buttonSize = repeaterMeta.buttonSize;
        if (repeaterMeta.buttonWidth)
            columnData.repeater_buttonWidth = repeaterMeta.buttonWidth;
        if (repeaterMeta.iconOnly !== undefined)
            columnData.repeater_iconOnly = repeaterMeta.iconOnly;
    }
    // ? �TAPE 1quater : Migration depuis metadata.subTabs (CRUCIAL!)
    // ?? Les sous-onglets (array) DOIVENT �tre sauvegard�s dans la colonne 'subtabs'
    if ('subTabs' in metadata) {
        if (Array.isArray(metadata.subTabs) && metadata.subTabs.length > 0) {
            columnData.subtabs = JSON.stringify(metadata.subTabs);
            console.log('?? [mapJSONToColumns] ? metadata.subTabs sauvegard� en colonne subtabs:', metadata.subTabs);
        }
        else {
            columnData.subtabs = null;
            console.log('?? [mapJSONToColumns] ? metadata.subTabs vid� : colonne subtabs remise � NULL');
        }
    }
    // ? �TAPE 1quinquies : Migration metadata.subTab (assignment champ individuel)
    // ?? L'assignment d'un champ � un sous-onglet (string ou array) va dans la colonne 'subtab'
    if ('subTab' in metadata) {
        var subTabValue = metadata.subTab;
        if (typeof subTabValue === 'string' && subTabValue.trim().length > 0) {
            columnData.subtab = subTabValue;
            console.log('?? [mapJSONToColumns] ? metadata.subTab (string assignment) sauvegard� en colonne subtab:', subTabValue);
        }
        else if (Array.isArray(subTabValue) && subTabValue.length > 0) {
            columnData.subtab = JSON.stringify(subTabValue);
            console.log('?? [mapJSONToColumns] ? metadata.subTab (array assignment) sauvegard� en colonne subtab:', subTabValue);
        }
        else {
            columnData.subtab = null;
            console.log('?? [mapJSONToColumns] ? metadata.subTab vid� : colonne subtab remise � NULL');
        }
    }
    // ? �TAPE 2 : Migration configuration champs texte
    var textConfig = metadata.textConfig || fieldConfig.text || fieldConfig.textConfig || {};
    if (Object.keys(textConfig).length > 0) {
        if (textConfig.placeholder)
            columnData.text_placeholder = textConfig.placeholder;
        if (textConfig.maxLength)
            columnData.text_maxLength = textConfig.maxLength;
        if (textConfig.minLength)
            columnData.text_minLength = textConfig.minLength;
        if (textConfig.mask)
            columnData.text_mask = textConfig.mask;
        if (textConfig.regex)
            columnData.text_regex = textConfig.regex;
        if (textConfig.rows)
            columnData.text_rows = textConfig.rows;
    }
    // ? �TAPE 3 : Migration configuration champs nombre
    var numberConfig = metadata.numberConfig || fieldConfig.number || fieldConfig.numberConfig || {};
    if (Object.keys(numberConfig).length > 0) {
        if (numberConfig.min !== undefined)
            columnData.number_min = numberConfig.min;
        if (numberConfig.max !== undefined)
            columnData.number_max = numberConfig.max;
        if (numberConfig.step !== undefined)
            columnData.number_step = numberConfig.step;
        if (numberConfig.decimals !== undefined)
            columnData.number_decimals = numberConfig.decimals;
        // ?? FIX: Permettre de supprimer prefix/suffix/unit en les mettant � vide
        if (numberConfig.prefix !== undefined)
            columnData.number_prefix = numberConfig.prefix || null;
        if (numberConfig.suffix !== undefined)
            columnData.number_suffix = numberConfig.suffix || null;
        if (numberConfig.unit !== undefined)
            columnData.number_unit = numberConfig.unit || null;
        if (numberConfig.defaultValue !== undefined)
            columnData.number_defaultValue = numberConfig.defaultValue;
    }
    // ✅ ÉTAPE 4 : Migration configuration champs sélection
    var selectConfig = metadata.selectConfig || fieldConfig.select || fieldConfig.selectConfig || {};
    if (Object.keys(selectConfig).length > 0) {
        if (selectConfig.multiple !== undefined)
            columnData.select_multiple = selectConfig.multiple;
        if (selectConfig.searchable !== undefined)
            columnData.select_searchable = selectConfig.searchable;
        if (selectConfig.allowClear !== undefined)
            columnData.select_allowClear = selectConfig.allowClear;
        if (selectConfig.defaultValue)
            columnData.select_defaultValue = selectConfig.defaultValue;
        if (selectConfig.options)
            columnData.select_options = selectConfig.options;
    }
    // ✅ ÉTAPE 5 : Migration configuration champs booléen
    var boolConfig = metadata.boolConfig || fieldConfig.bool || fieldConfig.boolConfig || {};
    if (Object.keys(boolConfig).length > 0) {
        if (boolConfig.trueLabel)
            columnData.bool_trueLabel = boolConfig.trueLabel;
        if (boolConfig.falseLabel)
            columnData.bool_falseLabel = boolConfig.falseLabel;
        if (boolConfig.defaultValue !== undefined)
            columnData.bool_defaultValue = boolConfig.defaultValue;
    }
    // ✅ ÉTAPE 6 : Migration configuration champs date
    var dateConfig = metadata.dateConfig || fieldConfig.date || fieldConfig.dateConfig || {};
    if (Object.keys(dateConfig).length > 0) {
        if (dateConfig.format)
            columnData.date_format = dateConfig.format;
        if (dateConfig.showTime !== undefined)
            columnData.date_showTime = dateConfig.showTime;
        if (dateConfig.minDate)
            columnData.date_minDate = new Date(dateConfig.minDate);
        if (dateConfig.maxDate)
            columnData.date_maxDate = new Date(dateConfig.maxDate);
    }
    // ✅ ÉTAPE 7 : Migration configuration champs image
    var imageConfig = metadata.imageConfig || fieldConfig.image || fieldConfig.imageConfig || {};
    if (Object.keys(imageConfig).length > 0) {
        if (imageConfig.maxSize)
            columnData.image_maxSize = imageConfig.maxSize;
        if (imageConfig.ratio)
            columnData.image_ratio = imageConfig.ratio;
        if (imageConfig.crop !== undefined)
            columnData.image_crop = imageConfig.crop;
        if (imageConfig.thumbnails)
            columnData.image_thumbnails = imageConfig.thumbnails;
    }
    // ✅ ÉTAPE 8 : Migration configuration tooltips d'aide
    if (Object.keys(appearanceConfig).length > 0) {
        if (appearanceConfig.helpTooltipType !== undefined)
            columnData.text_helpTooltipType = appearanceConfig.helpTooltipType;
        if (appearanceConfig.helpTooltipText !== undefined)
            columnData.text_helpTooltipText = appearanceConfig.helpTooltipText;
        if (appearanceConfig.helpTooltipImage !== undefined)
            columnData.text_helpTooltipImage = appearanceConfig.helpTooltipImage;
    }
    // ✅ ÉTAPE 9 : Types de champs spécifiques
    if (updateData.fieldType)
        columnData.fieldType = updateData.fieldType;
    if (updateData.fieldSubType)
        columnData.fieldSubType = updateData.fieldSubType;
    if (updateData.subType)
        columnData.fieldSubType = updateData.subType;
    if (updateData.type)
        columnData.fieldType = updateData.type;
    console.log('🔄 [mapJSONToColumns] Migration JSON vers colonnes:', {
        input: { metadata: !!metadata, fieldConfig: !!fieldConfig },
        output: Object.keys(columnData),
        columnDataPreview: columnData
    });
    return columnData;
}
/**
 * 📤 NETTOYER LA RÉPONSE : Colonnes dédiées → Interface frontend
 * Reconstruit les objets JSON pour la compatibilité frontend MAIS depuis les colonnes
 */
function buildResponseFromColumns(node) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _o, _p, _q, _r, _s, _t, _u, _v, _w;
    // Construire l'objet appearance depuis les colonnes
    var appearance = {
        size: node.appearance_size || 'md',
        width: node.appearance_width || null,
        variant: node.appearance_variant || null,
        // 🔥 TOOLTIP FIX : Inclure les champs tooltip dans metadata.appearance
        helpTooltipType: node.text_helpTooltipType || 'none',
        helpTooltipText: node.text_helpTooltipText || null,
        helpTooltipImage: node.text_helpTooltipImage || null
    };
    // 🔥 NOUVEAU : Construire l'objet repeater depuis les colonnes dédiées
    var legacyRepeater = (function () {
        if (node.metadata && typeof node.metadata === 'object' && node.metadata.repeater) {
            var legacy = node.metadata.repeater;
            return typeof legacy === 'object' && legacy !== null ? legacy : null;
        }
        return null;
    })();
    var repeater = {
        templateNodeIds: (function () {
            if (node.repeater_templateNodeIds) {
                try {
                    var parsed = JSON.parse(node.repeater_templateNodeIds);
                    console.log('✅ [buildResponseFromColumns] repeater_templateNodeIds reconstruit:', parsed);
                    return Array.isArray(parsed) ? parsed : [];
                }
                catch (e) {
                    console.error('❌ [buildResponseFromColumns] Erreur parse repeater_templateNodeIds:', e);
                    return [];
                }
            }
            var legacyIds = legacyRepeater === null || legacyRepeater === void 0 ? void 0 : legacyRepeater.templateNodeIds;
            if (Array.isArray(legacyIds)) {
                return legacyIds;
            }
            return [];
        })(),
        templateNodeLabels: (function () {
            if (node.repeater_templateNodeLabels) {
                try {
                    var parsedLabels = JSON.parse(node.repeater_templateNodeLabels);
                    return parsedLabels && typeof parsedLabels === 'object' ? parsedLabels : null;
                }
                catch (e) {
                    console.error('❌ [buildResponseFromColumns] Erreur parse repeater_templateNodeLabels:', e);
                }
            }
            var legacyLabels = legacyRepeater === null || legacyRepeater === void 0 ? void 0 : legacyRepeater.templateNodeLabels;
            if (legacyLabels && typeof legacyLabels === 'object') {
                return legacyLabels;
            }
            return null;
        })(),
        minItems: (_b = (_a = node.repeater_minItems) !== null && _a !== void 0 ? _a : legacyRepeater === null || legacyRepeater === void 0 ? void 0 : legacyRepeater.minItems) !== null && _b !== void 0 ? _b : 0,
        maxItems: (_d = (_c = node.repeater_maxItems) !== null && _c !== void 0 ? _c : legacyRepeater === null || legacyRepeater === void 0 ? void 0 : legacyRepeater.maxItems) !== null && _d !== void 0 ? _d : null,
        addButtonLabel: node.repeater_addButtonLabel || (legacyRepeater === null || legacyRepeater === void 0 ? void 0 : legacyRepeater.addButtonLabel) || null,
        buttonSize: node.repeater_buttonSize || (legacyRepeater === null || legacyRepeater === void 0 ? void 0 : legacyRepeater.buttonSize) || 'middle',
        buttonWidth: node.repeater_buttonWidth || (legacyRepeater === null || legacyRepeater === void 0 ? void 0 : legacyRepeater.buttonWidth) || 'auto',
        iconOnly: (_f = (_e = node.repeater_iconOnly) !== null && _e !== void 0 ? _e : legacyRepeater === null || legacyRepeater === void 0 ? void 0 : legacyRepeater.iconOnly) !== null && _f !== void 0 ? _f : false
    };
    // 🎯 CORRECTION CRITIQUE : Construire aussi appearanceConfig pour l'interface Parameters
    var appearanceConfig = {
        size: node.appearance_size || 'md',
        variant: node.appearance_variant || 'singleline',
        placeholder: node.text_placeholder || '',
        maxLength: node.text_maxLength || 255,
        mask: node.text_mask || '',
        regex: node.text_regex || '',
        helpTooltipType: node.text_helpTooltipType || 'none',
        helpTooltipText: node.text_helpTooltipText || null,
        helpTooltipImage: node.text_helpTooltipImage || null
    };
    // Construire fieldConfig depuis les colonnes dédiées
    var fieldConfig = {
        text: {
            placeholder: node.text_placeholder || null,
            maxLength: node.text_maxLength || null,
            minLength: node.text_minLength || null,
            mask: node.text_mask || null,
            regex: node.text_regex || null,
            rows: node.text_rows || 3
        },
        number: {
            min: node.number_min || null,
            max: node.number_max || null,
            step: node.number_step || 1,
            // ?? FIX: Priorit� � data_precision pour les champs d'affichage (cartes bleues), sinon number_decimals
            decimals: (_h = (_g = node.data_precision) !== null && _g !== void 0 ? _g : node.number_decimals) !== null && _h !== void 0 ? _h : 0,
            prefix: node.number_prefix || null,
            suffix: node.number_suffix || null,
            unit: (_k = (_j = node.number_unit) !== null && _j !== void 0 ? _j : node.data_unit) !== null && _k !== void 0 ? _k : null,
            defaultValue: node.number_defaultValue || null
        },
        select: {
            multiple: node.select_multiple || false,
            searchable: node.select_searchable !== false, // true par défaut
            allowClear: node.select_allowClear !== false, // true par défaut
            defaultValue: node.select_defaultValue || null,
            options: node.select_options || []
        },
        bool: {
            trueLabel: node.bool_trueLabel || null,
            falseLabel: node.bool_falseLabel || null,
            defaultValue: node.bool_defaultValue || null
        },
        date: {
            format: node.date_format || 'DD/MM/YYYY',
            showTime: node.date_showTime || false,
            minDate: node.date_minDate || null,
            maxDate: node.date_maxDate || null
        },
        image: {
            maxSize: node.image_maxSize || null,
            ratio: node.image_ratio || null,
            crop: node.image_crop || false,
            thumbnails: node.image_thumbnails || null
        }
    };
    // Nettoyer les objets vides
    Object.keys(fieldConfig).forEach(function (key) {
        var config = fieldConfig[key];
        var hasValues = Object.values(config).some(function (val) { return val !== null && val !== undefined && val !== false && val !== 0 && val !== ''; });
        if (!hasValues)
            delete fieldConfig[key];
    });
    // Mettre à jour les métadonnées avec les nouvelles données
    var cleanedMetadata = __assign(__assign({}, (node.metadata || {})), { appearance: appearance });
    // 🔍 DEBUG: Log metadata pour "Test - liste"
    if (node.id === '131a7b51-97d5-4f40-8a5a-9359f38939e8') {
        console.log('🔍 [buildResponseFromColumns][Test - liste] node.metadata BRUT:', node.metadata);
        console.log('🔍 [buildResponseFromColumns][Test - liste] cleanedMetadata:', cleanedMetadata);
        console.log('🔍 [buildResponseFromColumns][Test - liste] metadata.capabilities:', (node.metadata && typeof node.metadata === 'object') ? node.metadata.capabilities : 'N/A');
    }
    // 🔥 INJECTER repeater dans cleanedMetadata
    var metadataWithRepeater = repeater.templateNodeIds && repeater.templateNodeIds.length > 0
        ? __assign(__assign({}, cleanedMetadata), { repeater: repeater }) : cleanedMetadata;
    // 🔍 LOG SPÉCIAL POUR LES RÉPÉTABLES
    if (repeater.templateNodeIds && repeater.templateNodeIds.length > 0) {
        console.log('🔁🔁🔁 [REPEATER NODE FOUND]', {
            nodeId: node.id,
            nodeName: node.name,
            nodeLabel: node.label,
            nodeType: node.type,
            parentId: node.parentId,
            repeaterConfig: repeater
        });
    }
    console.log('[buildResponseFromColumns] metadata.repeater final:', metadataWithRepeater.repeater);
    // Reconstruire subTabs depuis la colonne 'subtabs' (array de noms de sous-onglets)
    if (node.subtabs) {
        try {
            var parsedSubTabs = JSON.parse(node.subtabs);
            if (Array.isArray(parsedSubTabs)) {
                metadataWithRepeater.subTabs = parsedSubTabs;
                console.log('[buildResponseFromColumns] OK subTabs reconstruits:', parsedSubTabs);
            }
        }
        catch (e) {
            console.error('[buildResponseFromColumns] Erreur parse subtabs:', e);
        }
    }
    // Reconstruire subTab depuis la colonne 'subtab' (string assignment du champ)
    if (node.subtab) {
        try {
            var subTabValue = node.subtab;
            if (typeof node.subtab === 'string' && node.subtab.startsWith('\"')) {
                subTabValue = JSON.parse(node.subtab);
            }
            if (subTabValue && typeof subTabValue === 'string') {
                metadataWithRepeater.subTab = subTabValue;
                console.log('[buildResponseFromColumns] OK subTab (assignment) reconstruit:', subTabValue);
            }
        }
        catch (e) {
            console.error('[buildResponseFromColumns] Erreur parse subtab:', e);
        }
    }
    var result = __assign(__assign({}, node), { metadata: metadataWithRepeater, fieldConfig: fieldConfig, 
        // Ajouter les champs d'interface pour compatibilité
        appearance: appearance, appearanceConfig: appearanceConfig, 
        // ⚠️ IMPORTANT : fieldType depuis les colonnes dédiées
        fieldType: node.fieldType || node.type, fieldSubType: node.fieldSubType || node.subType, 
        // 🔥 TOOLTIP FIX : Ajouter les propriétés tooltip au niveau racine pour TBL
        text_helpTooltipType: node.text_helpTooltipType, text_helpTooltipText: node.text_helpTooltipText, text_helpTooltipImage: node.text_helpTooltipImage, 
        // 🔥 TABLES : Inclure les tables avec leurs colonnes/lignes pour le lookup
        tables: node.TreeBranchLeafNodeTable || [], 
        // 🔗 SHARED REFERENCES : Inclure les références partagées pour les cascades
        sharedReferenceIds: node.sharedReferenceIds || undefined });
    // =====================================================================
    // ?? ADAPTATEUR LEGACY CAPABILITIES (Reconstruit l'ancien objet attendu)
    // =====================================================================
    // Objectif: Fournir � nouveau result.capabilities sans modifier le mod�le Prisma.
    // On s'appuie UNIQUEMENT sur les colonnes dédiées (hasFormula, formula_activeId, etc.).
    // Si metadata.capabilities existe d�j� (anciennes donn�es), on la pr�serve et on fusionne.
    try {
        var legacyMetaCaps = (node.metadata && typeof node.metadata === 'object') ? node.metadata.capabilities : undefined;
        var buildInstances = function (raw) {
            if (!raw)
                return undefined;
            if (typeof raw === 'object' && raw !== null)
                return raw;
            return undefined;
        };
        var capabilities_1 = {
            // Donn�es dynamiques / variables
            data: (node.hasData || node.data_activeId || node.data_instances) ? {
                enabled: !!node.hasData,
                activeId: node.data_activeId || null,
                instances: buildInstances(node.data_instances) || {},
                unit: node.data_unit || null,
                precision: typeof node.data_precision === 'number' ? node.data_precision : 2,
                exposedKey: node.data_exposedKey || null,
                displayFormat: node.data_displayFormat || null,
                visibleToUser: node.data_visibleToUser === true
            } : undefined,
            // Formules
            formula: (node.hasFormula || node.formula_activeId || node.formula_instances) ? {
                enabled: !!node.hasFormula,
                activeId: node.formula_activeId || null,
                instances: buildInstances(node.formula_instances) || {},
                tokens: buildInstances(node.formula_tokens) || undefined,
                name: node.formula_name || null
            } : undefined,
            // Table lookup
            table: (node.hasTable || node.table_activeId || node.table_instances) ? {
                enabled: !!node.hasTable,
                activeId: node.table_activeId || null,
                instances: buildInstances(node.table_instances) || {},
                name: node.table_name || null,
                meta: buildInstances(node.table_meta) || {},
                type: node.table_type || 'columns',
                isImported: node.table_isImported === true,
                importSource: node.table_importSource || null,
                columns: Array.isArray(node.table_columns) ? node.table_columns : null,
                rows: Array.isArray(node.table_rows) ? node.table_rows : null
            } : undefined,
            // Select (options statiques ou dynamiques d�j� r�solues)
            select: (node.select_options || node.select_defaultValue) ? {
                options: Array.isArray(node.select_options) ? node.select_options : [],
                allowClear: node.select_allowClear !== false,
                multiple: node.select_multiple === true,
                searchable: node.select_searchable !== false,
                defaultValue: node.select_defaultValue || null
            } : undefined,
            // Nombre
            number: (node.number_min !== undefined || node.number_max !== undefined || node.number_defaultValue !== undefined) ? {
                min: (_l = node.number_min) !== null && _l !== void 0 ? _l : null,
                max: (_o = node.number_max) !== null && _o !== void 0 ? _o : null,
                step: (_p = node.number_step) !== null && _p !== void 0 ? _p : 1,
                // ?? FIX: Priorit� � data_precision pour les champs d'affichage
                decimals: (_r = (_q = node.data_precision) !== null && _q !== void 0 ? _q : node.number_decimals) !== null && _r !== void 0 ? _r : 0,
                unit: (_t = (_s = node.number_unit) !== null && _s !== void 0 ? _s : node.data_unit) !== null && _t !== void 0 ? _t : null,
                prefix: node.number_prefix || null,
                suffix: node.number_suffix || null,
                defaultValue: node.number_defaultValue || null
            } : undefined,
            // Bool�en
            bool: (node.bool_trueLabel || node.bool_falseLabel || node.bool_defaultValue !== undefined) ? {
                trueLabel: node.bool_trueLabel || null,
                falseLabel: node.bool_falseLabel || null,
                defaultValue: (_u = node.bool_defaultValue) !== null && _u !== void 0 ? _u : null
            } : undefined,
            // Date
            date: (node.date_format || node.date_showTime || node.date_minDate || node.date_maxDate) ? {
                format: node.date_format || 'DD/MM/YYYY',
                showTime: node.date_showTime === true,
                minDate: node.date_minDate || null,
                maxDate: node.date_maxDate || null
            } : undefined,
            // Image
            image: (node.image_maxSize || node.image_ratio || node.image_crop || node.image_thumbnails) ? {
                maxSize: node.image_maxSize || null,
                ratio: node.image_ratio || null,
                crop: node.image_crop === true,
                thumbnails: node.image_thumbnails || null
            } : undefined,
            // Linking / navigation (simplifi�)
            link: (node.link_activeId || node.link_instances) ? {
                enabled: !!node.hasLink,
                activeId: node.link_activeId || null,
                instances: buildInstances(node.link_instances) || {},
                mode: node.link_mode || 'JUMP',
                name: node.link_name || null,
                carryContext: node.link_carryContext === true,
                params: buildInstances(node.link_params) || {},
                targetNodeId: node.link_targetNodeId || null,
                targetTreeId: node.link_targetTreeId || null
            } : undefined,
            // Markers
            markers: (node.markers_activeId || node.markers_instances || node.markers_selectedIds) ? {
                enabled: !!node.hasMarkers,
                activeId: node.markers_activeId || null,
                instances: buildInstances(node.markers_instances) || {},
                available: buildInstances(node.markers_available) || {},
                selectedIds: buildInstances(node.markers_selectedIds) || {}
            } : undefined,
            // API (legacy mapping minimal)
            api: (node.api_activeId || node.api_instances) ? {
                enabled: !!node.hasAPI,
                activeId: node.api_activeId || null,
                instances: buildInstances(node.api_instances) || {},
                bodyVars: buildInstances(node.api_bodyVars) || {},
                name: node.api_name || null
            } : undefined
        };
        // Nettoyer les cl�s undefined
        Object.keys(capabilities_1).forEach(function (key) {
            if (capabilities_1[key] === undefined)
                delete capabilities_1[key];
        });
        // Fusion avec legacy metadata.capabilities si pr�sent
        var mergedCaps = capabilities_1;
        if (legacyMetaCaps && typeof legacyMetaCaps === 'object') {
            mergedCaps = __assign(__assign({}, legacyMetaCaps), capabilities_1);
        }
        // Injection dans result
        result.capabilities = mergedCaps;
    }
    catch (e) {
        console.error('? [buildResponseFromColumns] Erreur adaptation legacy capabilities:', e);
    }
    // 🔍 DEBUG SHARED REFERENCES : Log pour les options avec références
    if (node.sharedReferenceIds && node.sharedReferenceIds.length > 0) {
        console.log('🔗 [buildResponseFromColumns] OPTION AVEC SHARED REFS:', {
            nodeId: node.id,
            label: node.label || node.option_label,
            type: node.type,
            sharedReferenceIds: node.sharedReferenceIds
        });
    }
    // 🚨 DEBUG TOOLTIP : Log si des tooltips sont trouvés
    if (node.text_helpTooltipType && node.text_helpTooltipType !== 'none') {
        console.log('🔥 [buildResponseFromColumns] TOOLTIP TROUVÉ:', {
            id: node.id,
            name: node.name,
            tooltipType: node.text_helpTooltipType,
            hasTooltipText: !!node.text_helpTooltipText,
            hasTooltipImage: !!node.text_helpTooltipImage,
            textLength: ((_v = node.text_helpTooltipText) === null || _v === void 0 ? void 0 : _v.length) || 0,
            imageLength: ((_w = node.text_helpTooltipImage) === null || _w === void 0 ? void 0 : _w.length) || 0
        });
    }
    return result;
}
// =============================================================================
// 🔄 FONCTIONS UTILITAIRES POUR COLONNES
// =============================================================================
/**
 * ⚡ PRÉSERVER LES CAPABILITIES : Écriture hybride colonnes + metadata
 * Préserve metadata.capabilities (formules multiples, etc.) tout en migrant le reste vers les colonnes
 */
function removeJSONFromUpdate(updateData) {
    var metadata = updateData.metadata, _fieldConfig = updateData.fieldConfig, _appearanceConfig = updateData.appearanceConfig, cleanData = __rest(updateData, ["metadata", "fieldConfig", "appearanceConfig"]);
    // 🔥 CORRECTION : Préserver metadata.capabilities pour les formules multiples
    if (metadata && typeof metadata === 'object') {
        var metaObj = metadata;
        var preservedMeta = {};
        if (metaObj.capabilities) {
            preservedMeta.capabilities = metaObj.capabilities;
        }
        if ('subTabs' in metaObj) {
            preservedMeta.subTabs = metaObj.subTabs;
            console.log('?? [removeJSONFromUpdate] Pr�servation de metadata.subTabs:', metaObj.subTabs);
        }
        if ('subTab' in metaObj) {
            preservedMeta.subTab = metaObj.subTab;
            console.log('?? [removeJSONFromUpdate] Pr�servation de metadata.subTab:', metaObj.subTab);
        }
        if (Object.keys(preservedMeta).length > 0) {
            return __assign(__assign({}, cleanData), { metadata: preservedMeta });
        }
    }
    return cleanData;
}
/**
 * 🧩 EXTRA: Normalisation des références partagées pour les COPIES
 * Règle métier (confirmée par l'utilisateur): lorsqu'un nœud est une copie dont l'id
 * se termine par un suffixe numérique "-N" (ex: "...-1", "...-2"), alors toute
 * référence partagée stockée dans les colonnes shared* doit pointer vers l'ID de la
 * COPIE correspondante (même suffixe), pas vers l'original.
 *
 * Exemple: si ce nœud (nodeId) = "shared-ref-ABC-1" et que l'utilisateur envoie
 * sharedReferenceId = "shared-ref-XYZ", on doit persister "shared-ref-XYZ-1".
 */
function extractCopySuffixFromId(id) {
    if (!id)
        return null;
    var m = String(id).match(/-(\d+)$/);
    return m ? m[0] : null; // renvoie "-1", "-2", etc. ou null
}
function applyCopySuffix(id, suffix) {
    // Retirer tout suffixe numérique existant et appliquer le suffixe souhaité
    var base = id.replace(/-(\d+)$/, '');
    return "".concat(base).concat(suffix);
}
function normalizeSharedRefsForCopy(nodeId, updateObj) {
    var suffix = extractCopySuffixFromId(nodeId);
    if (!suffix)
        return; // pas une copie → ne rien faire
    // Gérer single
    if (typeof updateObj.sharedReferenceId === 'string' && updateObj.sharedReferenceId.length > 0) {
        updateObj.sharedReferenceId = applyCopySuffix(updateObj.sharedReferenceId, suffix);
    }
    // Gérer array
    if (Array.isArray(updateObj.sharedReferenceIds)) {
        var out = [];
        for (var _i = 0, _a = updateObj.sharedReferenceIds; _i < _a.length; _i++) {
            var raw = _a[_i];
            if (typeof raw !== 'string' || raw.length === 0)
                continue;
            out.push(applyCopySuffix(raw, suffix));
        }
        // Dédupliquer en conservant l'ordre
        var seen_1 = new Set();
        updateObj.sharedReferenceIds = out.filter(function (id) { return (seen_1.has(id) ? false : (seen_1.add(id), true)); });
    }
}
// Handler commun pour UPDATE/PATCH d'un nœud (incluant le déplacement avec réindexation)
var updateOrMoveNode = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, treeId, nodeId_1, organizationId, updateData, columnData, cleanUpdateData, updateObj, _i, _b, k, tree, existingNode_1, nodeAnyTree, _c, _d, _e, targetId_1, position, newParentId, desiredIndex, targetNode, newParentNode, isSelectField, isSelectBranch, isMoveOperation, destinationParentId_1, siblings, insertIndex, idx, finalOrder_1, updatedNode_1, responseData_1, currentMetadata, updatedRepeaterMetadata, currentMetadata, repeater, metadataWithoutRepeater, updatedNode, responseData, error_13;
    var _f;
    var _g, _h, _j, _k, _l;
    return __generator(this, function (_o) {
        switch (_o.label) {
            case 0:
                _o.trys.push([0, 17, , 18]);
                _a = req.params, treeId = _a.treeId, nodeId_1 = _a.nodeId;
                organizationId = req.user.organizationId;
                updateData = req.body || {};
                console.log('🔄 [updateOrMoveNode] AVANT migration - données reçues:', {
                    hasMetadata: !!updateData.metadata,
                    hasFieldConfig: !!updateData.fieldConfig,
                    hasAppearanceConfig: !!updateData.appearanceConfig,
                    keys: Object.keys(updateData),
                    appearanceConfig: updateData.appearanceConfig,
                    'metadata.repeater': (_g = updateData.metadata) === null || _g === void 0 ? void 0 : _g.repeater,
                    'metadata complet': JSON.stringify(updateData.metadata, null, 2)
                });
                columnData = mapJSONToColumns(updateData);
                cleanUpdateData = removeJSONFromUpdate(updateData);
                updateObj = __assign(__assign({}, cleanUpdateData), columnData);
                console.log('🔄 [updateOrMoveNode] APRÈS migration - données finales:', {
                    originalKeys: Object.keys(updateData),
                    cleanedKeys: Object.keys(cleanUpdateData),
                    columnKeys: Object.keys(columnData),
                    finalKeys: Object.keys(updateObj),
                    hasMetadataInFinal: !!updateObj.metadata,
                    hasFieldConfigInFinal: !!updateObj.fieldConfig,
                    columnData: columnData
                });
                // 🧩 IMPORTANT: Normaliser les références partagées si le nœud est une COPIE (ID avec suffixe "-N")
                // Concerne les écritures directes envoyées par le frontend (single/array)
                normalizeSharedRefsForCopy(nodeId_1, updateObj);
                // Nettoyage de champs non supportés par le modèle Prisma (évite les erreurs PrismaClientValidationError)
                // Exemple: certains appels frontend envoient "markers" ou "hasMarkers" qui n'existent pas dans TreeBranchLeafNode
                for (_i = 0, _b = ['markers', 'hasMarkers']; _i < _b.length; _i++) {
                    k = _b[_i];
                    if (k in updateObj)
                        delete updateObj[k];
                }
                return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({
                        where: { id: treeId, organizationId: organizationId }
                    })];
            case 1:
                tree = _o.sent();
                if (!tree) {
                    return [2 /*return*/, res.status(404).json({ error: 'Arbre non trouvé' })];
                }
                // Supprimer les champs non modifiables
                delete updateObj.id;
                delete updateObj.treeId;
                delete updateObj.createdAt;
                // Charger le nœud existant (sera nécessaire pour la validation et la logique de déplacement)
                console.log('🔍 [updateOrMoveNode] Recherche nœud:', { nodeId: nodeId_1, treeId: treeId, organizationId: organizationId });
                return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({
                        where: { id: nodeId_1, treeId: treeId }
                    })];
            case 2:
                existingNode_1 = _o.sent();
                if (!!existingNode_1) return [3 /*break*/, 5];
                return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({
                        where: { id: nodeId_1 }
                    })];
            case 3:
                nodeAnyTree = _o.sent();
                _d = (_c = console).error;
                _e = ['? [updateOrMoveNode] N�ud non trouv� - DEBUG:'];
                _f = {
                    nodeId: nodeId_1,
                    treeId: treeId,
                    organizationId: organizationId,
                    nodeExistsElsewhere: !!nodeAnyTree,
                    nodeActualTreeId: nodeAnyTree === null || nodeAnyTree === void 0 ? void 0 : nodeAnyTree.treeId
                };
                return [4 /*yield*/, prisma.treeBranchLeafNode.count({ where: { treeId: treeId } })];
            case 4:
                _d.apply(_c, _e.concat([(_f.allNodesInTree = _o.sent(),
                        _f)]));
                return [2 /*return*/, res.status(404).json({
                        error: 'N�ud non trouv�',
                        debug: {
                            nodeId: nodeId_1,
                            treeId: treeId,
                            nodeExistsElsewhere: !!nodeAnyTree,
                            nodeActualTreeId: nodeAnyTree === null || nodeAnyTree === void 0 ? void 0 : nodeAnyTree.treeId
                        }
                    })];
            case 5:
                targetId_1 = updateData.targetId;
                position = updateData.position;
                newParentId = updateData.parentId;
                desiredIndex = undefined;
                if (!targetId_1) return [3 /*break*/, 7];
                return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({ where: { id: targetId_1, treeId: treeId } })];
            case 6:
                targetNode = _o.sent();
                if (!targetNode) {
                    return [2 /*return*/, res.status(400).json({ error: 'Cible de déplacement non trouvée' })];
                }
                if (position === 'child') {
                    newParentId = targetNode.id; // enfant direct
                    // on met à la fin par défaut (sera calculé plus bas)
                    desiredIndex = undefined;
                }
                else {
                    // before/after -> même parent que la cible
                    newParentId = targetNode.parentId || null;
                    // index désiré relatif à la cible (sera calculé plus bas)
                    // on signalera via un flag spécial pour ajuster après
                    desiredIndex = -1; // marqueur: calculer en fonction de la cible
                }
                _o.label = 7;
            case 7:
                if (!(newParentId !== undefined)) return [3 /*break*/, 10];
                if (!newParentId) return [3 /*break*/, 9];
                return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({
                        where: { id: newParentId, treeId: treeId }
                    })];
            case 8:
                newParentNode = _o.sent();
                if (!newParentNode) {
                    return [2 /*return*/, res.status(400).json({ error: 'Parent non trouvé' })];
                }
                // Appliquer les règles hiérarchiques actualisées
                if (existingNode_1.type === 'leaf_option') {
                    isSelectField = newParentNode.type.startsWith('leaf_') && newParentNode.subType === 'SELECT';
                    isSelectBranch = newParentNode.type === 'branch' && newParentNode.parentId !== null;
                    if (!isSelectField && !isSelectBranch) {
                        return [2 /*return*/, res.status(400).json({
                                error: 'Les options ne peuvent être déplacées que sous des champs SELECT ou des branches de niveau 2+'
                            })];
                    }
                }
                else if (existingNode_1.type.startsWith('leaf_')) {
                    // Les champs peuvent être sous des branches ou d'autres champs
                    if (newParentNode.type !== 'branch' && !newParentNode.type.startsWith('leaf_')) {
                        return [2 /*return*/, res.status(400).json({
                                error: 'Les champs ne peuvent être déplacés que sous des branches ou d\'autres champs'
                            })];
                    }
                }
                else if (existingNode_1.type === 'branch') {
                    // Les branches peuvent être sous l'arbre ou sous une autre branche
                    if (!(newParentNode.type === 'tree' || newParentNode.type === 'branch')) {
                        return [2 /*return*/, res.status(400).json({
                                error: 'Les branches doivent être sous l\'arbre ou sous une autre branche'
                            })];
                    }
                }
                return [3 /*break*/, 10];
            case 9:
                // parentId null = déplacement vers la racine
                // Seules les branches peuvent être directement sous l'arbre racine
                if (existingNode_1.type !== 'branch') {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Seules les branches peuvent être déplacées directement sous l\'arbre racine (niveau 2)'
                        })];
                }
                _o.label = 10;
            case 10:
                isMoveOperation = (targetId_1 && position) || (newParentId !== undefined) || (typeof updateObj.order === 'number');
                if (!isMoveOperation) return [3 /*break*/, 14];
                destinationParentId_1 = newParentId !== undefined ? newParentId : existingNode_1.parentId;
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                        where: { treeId: treeId, parentId: destinationParentId_1 || null, NOT: { id: nodeId_1 } },
                        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
                    })];
            case 11:
                siblings = _o.sent();
                insertIndex = void 0;
                if (targetId_1 && (position === 'before' || position === 'after')) {
                    idx = siblings.findIndex(function (s) { return s.id === targetId_1; });
                    // si la cible n'est pas un sibling (ex: child), idx sera -1; fallback fin
                    if (idx >= 0) {
                        insertIndex = position === 'before' ? idx : idx + 1;
                    }
                    else {
                        insertIndex = siblings.length;
                    }
                }
                else if (position === 'child') {
                    insertIndex = siblings.length; // à la fin sous ce parent
                }
                else if (typeof updateObj.order === 'number') {
                    // Si on reçoit un order numérique, on tente d'insérer au plus proche (borné entre 0 et len)
                    insertIndex = Math.min(Math.max(Math.round(updateObj.order), 0), siblings.length);
                }
                else if (desiredIndex !== undefined && desiredIndex >= 0) {
                    insertIndex = Math.min(Math.max(desiredIndex, 0), siblings.length);
                }
                else {
                    insertIndex = siblings.length; // défaut = fin
                }
                finalOrder_1 = __spreadArray([], siblings.map(function (s) { return s.id; }), true);
                finalOrder_1.splice(insertIndex, 0, nodeId_1);
                // Effectuer la transaction: mettre à jour parentId du nœud + réindexer les orders entiers
                return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var i, id;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    if (!(destinationParentId_1 !== existingNode_1.parentId)) return [3 /*break*/, 2];
                                    return [4 /*yield*/, tx.treeBranchLeafNode.update({
                                            where: { id: nodeId_1 },
                                            data: { parentId: destinationParentId_1 || null, updatedAt: new Date() }
                                        })];
                                case 1:
                                    _a.sent();
                                    _a.label = 2;
                                case 2:
                                    i = 0;
                                    _a.label = 3;
                                case 3:
                                    if (!(i < finalOrder_1.length)) return [3 /*break*/, 6];
                                    id = finalOrder_1[i];
                                    return [4 /*yield*/, tx.treeBranchLeafNode.update({
                                            where: { id: id },
                                            data: { order: i, updatedAt: new Date() }
                                        })];
                                case 4:
                                    _a.sent();
                                    _a.label = 5;
                                case 5:
                                    i++;
                                    return [3 /*break*/, 3];
                                case 6: return [2 /*return*/];
                            }
                        });
                    }); })];
            case 12:
                // Effectuer la transaction: mettre à jour parentId du nœud + réindexer les orders entiers
                _o.sent();
                return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({ where: { id: nodeId_1, treeId: treeId } })];
            case 13:
                updatedNode_1 = _o.sent();
                console.log('🔄 [updateOrMoveNode] APRÈS déplacement - reconstruction depuis colonnes');
                responseData_1 = updatedNode_1 ? buildResponseFromColumns(updatedNode_1) : updatedNode_1;
                return [2 /*return*/, res.json(responseData_1)];
            case 14:
                // Cas simple: pas de déplacement → mise à jour directe
                // 🔥 FIX : Reconstruire metadata.repeater depuis les colonnes pour synchroniser le JSON Prisma
                if (updateObj.repeater_buttonSize || updateObj.repeater_maxItems !== undefined || updateObj.repeater_minItems !== undefined) {
                    currentMetadata = existingNode_1.metadata || {};
                    updatedRepeaterMetadata = __assign(__assign(__assign(__assign(__assign(__assign(__assign({}, (currentMetadata.repeater || {})), (updateObj.repeater_addButtonLabel !== undefined ? { addButtonLabel: updateObj.repeater_addButtonLabel } : {})), (updateObj.repeater_buttonSize !== undefined ? { buttonSize: updateObj.repeater_buttonSize } : {})), (updateObj.repeater_buttonWidth !== undefined ? { buttonWidth: updateObj.repeater_buttonWidth } : {})), (updateObj.repeater_iconOnly !== undefined ? { iconOnly: updateObj.repeater_iconOnly } : {})), (updateObj.repeater_minItems !== undefined ? { minItems: updateObj.repeater_minItems } : {})), (updateObj.repeater_maxItems !== undefined ? { maxItems: updateObj.repeater_maxItems } : {}));
                    updateObj.metadata = __assign(__assign({}, currentMetadata), { repeater: updatedRepeaterMetadata });
                    console.warn('🔥 [updateOrMoveNode] Synchronisation metadata.repeater:', updatedRepeaterMetadata);
                }
                // CRITIQUE : Si repeater_templateNodeIds est explicitement NULL, supprimer metadata.repeater
                if ('repeater_templateNodeIds' in updateObj && updateObj.repeater_templateNodeIds === null) {
                    currentMetadata = existingNode_1.metadata || {};
                    if (currentMetadata.repeater) {
                        repeater = currentMetadata.repeater, metadataWithoutRepeater = __rest(currentMetadata, ["repeater"]);
                        updateObj.metadata = metadataWithoutRepeater;
                        console.warn('[updateOrMoveNode] Suppression explicite de metadata.repeater car repeater_templateNodeIds = NULL');
                    }
                }
                return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                        where: { id: nodeId_1 },
                        data: __assign(__assign({}, updateObj), { updatedAt: new Date() })
                    })];
            case 15:
                _o.sent();
                return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({ where: { id: nodeId_1, treeId: treeId } })];
            case 16:
                updatedNode = _o.sent();
                console.log('🔄 [updateOrMoveNode] APRÈS mise à jour - nœud brut Prisma:', {
                    'updatedNode.metadata': updatedNode === null || updatedNode === void 0 ? void 0 : updatedNode.metadata,
                    'updatedNode.metadata typeof': typeof (updatedNode === null || updatedNode === void 0 ? void 0 : updatedNode.metadata)
                });
                console.log('🔄 [updateOrMoveNode] APRÈS mise à jour - reconstruction depuis colonnes');
                responseData = updatedNode ? buildResponseFromColumns(updatedNode) : updatedNode;
                console.log('🔄 [updateOrMoveNode] APRÈS buildResponseFromColumns:', {
                    'responseData.metadata': responseData === null || responseData === void 0 ? void 0 : responseData.metadata,
                    'responseData.metadata.repeater': (_h = responseData === null || responseData === void 0 ? void 0 : responseData.metadata) === null || _h === void 0 ? void 0 : _h.repeater
                });
                return [2 /*return*/, res.json(responseData)];
            case 17:
                error_13 = _o.sent();
                console.error('[TreeBranchLeaf API] ❌ ERREUR DÉTAILLÉE lors de updateOrMoveNode:', {
                    error: error_13,
                    message: error_13.message,
                    stack: error_13.stack,
                    treeId: (_j = req.params) === null || _j === void 0 ? void 0 : _j.treeId,
                    nodeId: (_k = req.params) === null || _k === void 0 ? void 0 : _k.nodeId,
                    updateDataKeys: Object.keys(req.body || {}),
                    organizationId: (_l = req.user) === null || _l === void 0 ? void 0 : _l.organizationId
                });
                res.status(500).json({ error: 'Impossible de mettre à jour le nœud', details: error_13.message });
                return [3 /*break*/, 18];
            case 18: return [2 /*return*/];
        }
    });
}); };
// PUT /api/treebranchleaf/trees/:treeId/nodes/:nodeId - Mettre à jour un nœud
router.put('/trees/:treeId/nodes/:nodeId', updateOrMoveNode);
// PATCH (alias) pour compatibilité côté client
router.patch('/trees/:treeId/nodes/:nodeId', updateOrMoveNode);
// DELETE /api/treebranchleaf/trees/:treeId/nodes/:nodeId - Supprimer un nœud
router.delete('/trees/:treeId/nodes/:nodeId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, treeId, nodeId_2, _b, organizationId, isSuperAdmin, tree, allNodes, childrenByParent, _i, allNodes_3, n, arr, exists, toDelete_3, queue, depth_2, cur, children, _c, children_2, c, referencedIds_1, _loop_6, _d, toDelete_1, id, deletedSubtreeIds_1, deletedOrphans_1, deletedOrphansIds_1, deletedExtra_1, deletedExtraIds_1, remaining_3, stillRef_1, _e, remaining_1, n, _f, _g, rid, isCopySuffixed_1, orphanRoots, byParent, _h, remaining_2, n, arr, delSet, ddepth_1, _j, orphanRoots_1, rid, q, cur, d, _k, _l, c, ordered_1, remainingNodes_3, nodesToScan, removedSet_1, removedRepeaterCopyPairs_1, removedRepeaterCopyObjects_1, extractSuffixFromLabel, _loop_7, _o, toDelete_2, rid, debugDelete_1, extraCandidates, byParent, _p, remainingNodes_1, n, arr, delSet, ddepth_2, _q, extraCandidates_1, cand, q, cur, d, _r, _s, c, ordered_2, e_8, allDeletedSet, allDeletedIds, variablesToCheck, varIdsToDelete, suffixPattern, _t, variablesToCheck_1, variable, deletedVarCount, varCleanError_1, remainingNodes, _loop_8, _u, remainingNodes_2, node, sumUpdateError_1, remainingAfterFirstPass, deeperDeletedIds, removedIdStrings_1, containsRemovedId_1, extraToDelete_1, dd_1, e_9, error_14;
    var _v, _w, _x;
    return __generator(this, function (_y) {
        switch (_y.label) {
            case 0:
                _y.trys.push([0, 28, , 29]);
                _a = req.params, treeId = _a.treeId, nodeId_2 = _a.nodeId;
                _b = req.user, organizationId = _b.organizationId, isSuperAdmin = _b.isSuperAdmin;
                return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({
                        where: { id: treeId }
                    })];
            case 1:
                tree = _y.sent();
                if (!tree) {
                    return [2 /*return*/, res.status(404).json({ error: 'Arbre non trouvé' })];
                }
                // Sécurité organisation
                if (!isSuperAdmin && organizationId && tree.organizationId && tree.organizationId !== organizationId) {
                    return [2 /*return*/, res.status(403).json({ error: 'Accès refusé' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({ where: { treeId: treeId } })];
            case 2:
                allNodes = _y.sent();
                childrenByParent = new Map();
                for (_i = 0, allNodes_3 = allNodes; _i < allNodes_3.length; _i++) {
                    n = allNodes_3[_i];
                    if (!n.parentId)
                        continue;
                    arr = childrenByParent.get(n.parentId) || [];
                    arr.push(n.id);
                    childrenByParent.set(n.parentId, arr);
                }
                exists = allNodes.find(function (n) { return n.id === nodeId_2; });
                if (!exists) {
                    return [2 /*return*/, res.status(404).json({ error: 'Nœud non trouvé' })];
                }
                toDelete_3 = [];
                queue = [nodeId_2];
                depth_2 = new Map();
                depth_2.set(nodeId_2, 0);
                while (queue.length) {
                    cur = queue.shift();
                    toDelete_3.push(cur);
                    children = childrenByParent.get(cur) || [];
                    for (_c = 0, children_2 = children; _c < children_2.length; _c++) {
                        c = children_2[_c];
                        depth_2.set(c, (depth_2.get(cur) || 0) + 1);
                        queue.push(c);
                    }
                }
                referencedIds_1 = new Set();
                _loop_6 = function (id) {
                    var n = allNodes.find(function (x) { return x.id === id; });
                    if (!n)
                        return "continue";
                    if (n.sharedReferenceId)
                        referencedIds_1.add(n.sharedReferenceId);
                    if (Array.isArray(n.sharedReferenceIds))
                        n.sharedReferenceIds.forEach(function (rid) { return rid && referencedIds_1.add(rid); });
                };
                for (_d = 0, toDelete_1 = toDelete_3; _d < toDelete_1.length; _d++) {
                    id = toDelete_1[_d];
                    _loop_6(id);
                }
                // Supprimer en partant des feuilles (profondeur décroissante) pour éviter les contraintes FK parentId
                toDelete_3.sort(function (a, b) { return (depth_2.get(b) - depth_2.get(a)); });
                deletedSubtreeIds_1 = [];
                return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var _i, toDelete_4, id, err_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _i = 0, toDelete_4 = toDelete_3;
                                    _a.label = 1;
                                case 1:
                                    if (!(_i < toDelete_4.length)) return [3 /*break*/, 6];
                                    id = toDelete_4[_i];
                                    _a.label = 2;
                                case 2:
                                    _a.trys.push([2, 4, , 5]);
                                    return [4 /*yield*/, tx.treeBranchLeafNode.delete({ where: { id: id } })];
                                case 3:
                                    _a.sent();
                                    deletedSubtreeIds_1.push(id);
                                    return [3 /*break*/, 5];
                                case 4:
                                    err_1 = _a.sent();
                                    // Ignorer les erreurs individuelles (ex: id déjà supprimé) et logger
                                    console.warn('[DELETE SUBTREE] Failed to delete node', id, err_1.message);
                                    return [3 /*break*/, 5];
                                case 5:
                                    _i++;
                                    return [3 /*break*/, 1];
                                case 6: return [2 /*return*/];
                            }
                        });
                    }); })];
            case 3:
                _y.sent();
                deletedOrphans_1 = 0;
                deletedOrphansIds_1 = [];
                deletedExtra_1 = 0;
                deletedExtraIds_1 = [];
                if (!(referencedIds_1.size > 0)) return [3 /*break*/, 6];
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({ where: { treeId: treeId } })];
            case 4:
                remaining_3 = _y.sent();
                stillRef_1 = new Set();
                for (_e = 0, remaining_1 = remaining_3; _e < remaining_1.length; _e++) {
                    n = remaining_1[_e];
                    if (n.sharedReferenceId && referencedIds_1.has(n.sharedReferenceId))
                        stillRef_1.add(n.sharedReferenceId);
                    if (Array.isArray(n.sharedReferenceIds))
                        for (_f = 0, _g = n.sharedReferenceIds; _f < _g.length; _f++) {
                            rid = _g[_f];
                            if (referencedIds_1.has(rid))
                                stillRef_1.add(rid);
                        }
                }
                isCopySuffixed_1 = function (id) { return /-\d+$/.test(id); };
                orphanRoots = Array.from(referencedIds_1).filter(function (id) { return !stillRef_1.has(id) && remaining_3.some(function (n) { return n.id === id; }) && isCopySuffixed_1(id); });
                if (!(orphanRoots.length > 0)) return [3 /*break*/, 6];
                byParent = new Map();
                for (_h = 0, remaining_2 = remaining_3; _h < remaining_2.length; _h++) {
                    n = remaining_2[_h];
                    if (!n.parentId)
                        continue;
                    arr = byParent.get(n.parentId) || [];
                    arr.push(n.id);
                    byParent.set(n.parentId, arr);
                }
                delSet = new Set();
                ddepth_1 = new Map();
                for (_j = 0, orphanRoots_1 = orphanRoots; _j < orphanRoots_1.length; _j++) {
                    rid = orphanRoots_1[_j];
                    q = [rid];
                    ddepth_1.set(rid, 0);
                    while (q.length) {
                        cur = q.shift();
                        if (delSet.has(cur))
                            continue;
                        delSet.add(cur);
                        d = ddepth_1.get(cur);
                        for (_k = 0, _l = (byParent.get(cur) || []); _k < _l.length; _k++) {
                            c = _l[_k];
                            ddepth_1.set(c, d + 1);
                            q.push(c);
                        }
                    }
                }
                ordered_1 = Array.from(delSet).sort(function (a, b) { return (ddepth_1.get(b) - ddepth_1.get(a)); });
                return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var _i, ordered_3, id;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _i = 0, ordered_3 = ordered_1;
                                    _a.label = 1;
                                case 1:
                                    if (!(_i < ordered_3.length)) return [3 /*break*/, 4];
                                    id = ordered_3[_i];
                                    return [4 /*yield*/, tx.treeBranchLeafNode.delete({ where: { id: id } })];
                                case 2:
                                    _a.sent();
                                    deletedOrphans_1++;
                                    deletedOrphansIds_1.push(id);
                                    _a.label = 3;
                                case 3:
                                    _i++;
                                    return [3 /*break*/, 1];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); })];
            case 5:
                _y.sent();
                _y.label = 6;
            case 6:
                _y.trys.push([6, 10, , 11]);
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({ where: { treeId: treeId } })];
            case 7:
                remainingNodes_3 = _y.sent();
                nodesToScan = remainingNodes_3;
                removedSet_1 = new Set(toDelete_3);
                removedRepeaterCopyPairs_1 = new Set();
                removedRepeaterCopyObjects_1 = [];
                extractSuffixFromLabel = function (label) {
                    if (!label)
                        return null;
                    var l = String(label);
                    var m1 = /\(Copie\s*([0-9]+)\)$/i.exec(l);
                    if (m1 && m1[1])
                        return m1[1];
                    var m2 = /[-��]\s*(\d+)$/i.exec(l);
                    if (m2 && m2[1])
                        return m2[1];
                    return null;
                };
                _loop_7 = function (rid) {
                    var n = allNodes.find(function (x) { return x.id === rid; });
                    if (!n)
                        return "continue";
                    var dm = n.metadata || {};
                    var rId = (dm === null || dm === void 0 ? void 0 : dm.duplicatedFromRepeater) || n.parentId || null;
                    var cs = (_x = (_w = ((_v = dm === null || dm === void 0 ? void 0 : dm.copySuffix) !== null && _v !== void 0 ? _v : dm === null || dm === void 0 ? void 0 : dm.suffixNum)) !== null && _w !== void 0 ? _w : extractSuffixFromLabel(n.label)) !== null && _x !== void 0 ? _x : null;
                    // skip building relatedTemplateIds: avoid template-only deletion heuristics
                    if (rId && cs != null) {
                        removedRepeaterCopyPairs_1.add("".concat(rId, "|").concat(String(cs)));
                        removedRepeaterCopyObjects_1.push({ repeaterId: rId, copySuffix: String(cs) });
                    }
                    else {
                        // Keep it for a fallback attempt (if label-based suffix exists)
                        if (rId || n.label) {
                            var fallbackSuffix = cs;
                            removedRepeaterCopyObjects_1.push({ repeaterId: rId, copySuffix: fallbackSuffix });
                        }
                    }
                };
                for (_o = 0, toDelete_2 = toDelete_3; _o < toDelete_2.length; _o++) {
                    rid = toDelete_2[_o];
                    _loop_7(rid);
                }
                debugDelete_1 = typeof process !== 'undefined' && process.env && process.env.DEBUG_TBL_DELETE === '1';
                extraCandidates = nodesToScan.filter(function (n) {
                    var _a, _b;
                    var meta = n.metadata || {};
                    // ??? PROTECTION: Ne JAMAIS supprimer les n�uds Total (sum-display-field)
                    if ((meta === null || meta === void 0 ? void 0 : meta.isSumDisplayField) === true || n.id.endsWith('-sum-total')) {
                        if (debugDelete_1)
                            console.log('[DELETE DEBUG] ??? N�ud Total PROT�G� (extraCandidates):', n.id);
                        return false;
                    }
                    var looksLikeDisplay = !!((meta === null || meta === void 0 ? void 0 : meta.autoCreateDisplayNode) || (meta === null || meta === void 0 ? void 0 : meta.copiedFromNodeId) || (meta === null || meta === void 0 ? void 0 : meta.fromVariableId) || (meta === null || meta === void 0 ? void 0 : meta.sourceTemplateId));
                    if (!looksLikeDisplay)
                        return false;
                    if (removedSet_1.has(n.id))
                        return false;
                    if (meta.copiedFromNodeId) {
                        // Support string, array, or JSON array representation for copiedFromNodeId
                        try {
                            var normalizedCopiedFrom_1 = [];
                            if (Array.isArray(meta.copiedFromNodeId)) {
                                meta.copiedFromNodeId.forEach(function (v) { if (v)
                                    normalizedCopiedFrom_1.push(String(v)); });
                            }
                            else if (typeof meta.copiedFromNodeId === 'string') {
                                var s = String(meta.copiedFromNodeId);
                                if (s.trim().startsWith('[')) {
                                    try {
                                        var parsed = JSON.parse(s);
                                        if (Array.isArray(parsed))
                                            parsed.forEach(function (v) { if (v)
                                                normalizedCopiedFrom_1.push(String(v)); });
                                    }
                                    catch (_c) {
                                        normalizedCopiedFrom_1.push(s);
                                    }
                                }
                                else
                                    normalizedCopiedFrom_1.push(s);
                            }
                            else {
                                normalizedCopiedFrom_1.push(String(meta.copiedFromNodeId));
                            }
                            for (var _i = 0, _d = Array.from(removedSet_1); _i < _d.length; _i++) {
                                var rid = _d[_i];
                                if (normalizedCopiedFrom_1.includes(String(rid))) {
                                    if (debugDelete_1)
                                        console.log('[DELETE DEBUG] matched via copiedFromNodeId include', { candidateId: n.id, removedId: rid });
                                    return true;
                                }
                            }
                        }
                        catch (_e) {
                            if (removedSet_1.has(String(meta.copiedFromNodeId))) {
                                if (debugDelete_1)
                                    console.log('[DELETE DEBUG] matched via copiedFromNodeId direct', { candidateId: n.id, copiedFrom: meta.copiedFromNodeId });
                                return true;
                            }
                        }
                    }
                    // If the display references a template id used by removed copies, we must NOT delete
                    // it purely because of the template id: that would delete displays for other copies.
                    // Only delete when the display metadata explicitly ties it to the removed copy instance
                    // (either via copiedFromNodeId directly matching a removed id, or duplicatedFromRepeater+copySuffix
                    // meta matching a removed pair). Do not delete if display only cites a template by id.
                    if (meta.copiedFromNodeId) {
                        try {
                            var normalizedCopiedFromIds_1 = [];
                            if (Array.isArray(meta.copiedFromNodeId)) {
                                meta.copiedFromNodeId.forEach(function (v) {
                                    if (!v)
                                        return;
                                    if (typeof v === 'object' && v.id)
                                        normalizedCopiedFromIds_1.push(String(v.id));
                                    else
                                        normalizedCopiedFromIds_1.push(String(v));
                                    if (debugDelete_1 && looksLikeDisplay && !shouldDelete) {
                                        console.log('[DELETE DEBUG] Candidate not deleted, metadata:', { id: n.id, meta: meta });
                                    }
                                });
                            }
                            else if (typeof meta.copiedFromNodeId === 'string') {
                                var s = String(meta.copiedFromNodeId);
                                if (s.trim().startsWith('[')) {
                                    try {
                                        var parsed = JSON.parse(s);
                                        if (Array.isArray(parsed))
                                            parsed.forEach(function (v) { if (!v)
                                                return; if (typeof v === 'object' && v.id)
                                                normalizedCopiedFromIds_1.push(String(v.id));
                                            else
                                                normalizedCopiedFromIds_1.push(String(v)); });
                                    }
                                    catch (_f) {
                                        normalizedCopiedFromIds_1.push(s);
                                    }
                                }
                                else
                                    normalizedCopiedFromIds_1.push(s);
                            }
                            else {
                                normalizedCopiedFromIds_1.push(String(meta.copiedFromNodeId));
                            }
                            for (var _g = 0, _h = Array.from(removedSet_1); _g < _h.length; _g++) {
                                var rid = _h[_g];
                                if (normalizedCopiedFromIds_1.includes(String(rid))) {
                                    if (debugDelete_1)
                                        console.log('[DELETE DEBUG] matched via normalizedCopiedFromIds', { candidateId: n.id, removedId: rid });
                                    return true;
                                }
                            }
                        }
                        catch (_j) {
                            if (removedSet_1.has(String(meta.copiedFromNodeId))) {
                                if (debugDelete_1)
                                    console.log('[DELETE DEBUG] matched via copiedFromNodeId simple', { candidateId: n.id, copiedFrom: meta.copiedFromNodeId });
                                return true;
                            }
                        }
                    }
                    if (meta.copiedFromNodeId && meta.duplicatedFromRepeater && (meta.copySuffix != null || meta.suffixNum != null)) {
                        var key = "".concat(meta.duplicatedFromRepeater, "|").concat(String((_a = meta.copySuffix) !== null && _a !== void 0 ? _a : meta.suffixNum));
                        if (removedRepeaterCopyPairs_1.has(key)) {
                            if (debugDelete_1)
                                console.log('[DELETE DEBUG] matched via removedRepeaterCopyPairs', { candidateId: n.id, key: key });
                            return true;
                        }
                    }
                    // If the display claims to be part of a duplicated instance and that instance is among the removed pairs => delete
                    if ((meta === null || meta === void 0 ? void 0 : meta.duplicatedFromRepeater) && ((meta === null || meta === void 0 ? void 0 : meta.copySuffix) != null || (meta === null || meta === void 0 ? void 0 : meta.suffixNum) != null)) {
                        var key = "".concat(meta.duplicatedFromRepeater, "|").concat(String((_b = meta.copySuffix) !== null && _b !== void 0 ? _b : meta.suffixNum));
                        if (removedRepeaterCopyPairs_1.has(key)) {
                            if (debugDelete_1)
                                console.log('[DELETE DEBUG] matched via removedRepeaterCopyPairs (fallback)', { candidateId: n.id, key: key });
                            return true;
                        }
                    }
                    if (meta.fromVariableId) {
                        // fromVariableId may be a string, an array, or a serialized JSON. Normalize to an array and test membership
                        try {
                            var normalizedFromVariableIds_1 = [];
                            if (Array.isArray(meta.fromVariableId)) {
                                meta.fromVariableId.forEach(function (v) {
                                    if (!v)
                                        return;
                                    if (typeof v === 'object' && v.id)
                                        normalizedFromVariableIds_1.push(String(v.id));
                                    else
                                        normalizedFromVariableIds_1.push(String(v));
                                });
                            }
                            else if (typeof meta.fromVariableId === 'string') {
                                // If it looks like a JSON array, try to parse
                                var s = String(meta.fromVariableId);
                                if (s.trim().startsWith('[')) {
                                    try {
                                        var parsed = JSON.parse(s);
                                        if (Array.isArray(parsed))
                                            parsed.forEach(function (v) { if (!v)
                                                return; if (typeof v === 'object' && v.id)
                                                normalizedFromVariableIds_1.push(String(v.id));
                                            else
                                                normalizedFromVariableIds_1.push(String(v)); });
                                    }
                                    catch (_k) {
                                        normalizedFromVariableIds_1.push(s);
                                    }
                                }
                                else {
                                    normalizedFromVariableIds_1.push(s);
                                }
                            }
                            else {
                                normalizedFromVariableIds_1.push(String(meta.fromVariableId));
                            }
                            var _loop_9 = function (rid) {
                                if (normalizedFromVariableIds_1.some(function (v) { return String(v).includes(String(rid)); })) {
                                    if (debugDelete_1)
                                        console.log('[DELETE DEBUG] matched via fromVariableId normalized', { candidateId: n.id, removedId: rid });
                                    return { value: true };
                                }
                            };
                            for (var _l = 0, _o = Array.from(removedSet_1); _l < _o.length; _l++) {
                                var rid = _o[_l];
                                var state_2 = _loop_9(rid);
                                if (typeof state_2 === "object")
                                    return state_2.value;
                            }
                        }
                        catch (_p) {
                            // fallback to string matching
                            for (var _q = 0, _r = Array.from(removedSet_1); _q < _r.length; _q++) {
                                var rid = _r[_q];
                                if (String(meta.fromVariableId).includes(String(rid))) {
                                    if (debugDelete_1)
                                        console.log('[DELETE DEBUG] matched via fromVariableId string include', { candidateId: n.id, removedId: rid });
                                    return true;
                                }
                            }
                        }
                    }
                    // Fallback: If the display node has no duplication metadata at all, but its parent
                    // corresponds to a repeater and its label contains the same suffix as a removed copy,
                    // treat it as linked and delete. This covers legacy data where metadata is missing.
                    if (!(meta === null || meta === void 0 ? void 0 : meta.duplicatedFromRepeater) && !(meta === null || meta === void 0 ? void 0 : meta.copiedFromNodeId) && !(meta === null || meta === void 0 ? void 0 : meta.fromVariableId) && (!(meta === null || meta === void 0 ? void 0 : meta.copySuffix) && !(meta === null || meta === void 0 ? void 0 : meta.suffixNum))) {
                        var label = String(n.label || '');
                        for (var _s = 0, removedRepeaterCopyObjects_2 = removedRepeaterCopyObjects_1; _s < removedRepeaterCopyObjects_2.length; _s++) {
                            var obj = removedRepeaterCopyObjects_2[_s];
                            if (!obj.repeaterId || !obj.copySuffix)
                                continue;
                            if (n.parentId === obj.repeaterId) {
                                // possible patterns: " (Copie N)" or "-N" at the end
                                var reCopie = new RegExp("\\\\(Copie\\\\s*".concat(obj.copySuffix, "\\\\)$"), 'i');
                                var reDash = new RegExp("-".concat(obj.copySuffix, "$"));
                                if (reCopie.test(label) || reDash.test(label)) {
                                    if (debugDelete_1)
                                        console.log('[DELETE DEBUG] matched via label suffix heuristic', { candidateId: n.id, label: label, obj: obj });
                                    return true;
                                }
                            }
                        }
                    }
                    // Suffix heuristic: -N
                    // NOTE: don't rely on generic label suffix heuristics to avoid accidental matches across
                    // unrelated repeaters (legacy code removed). Only delete if it is directly linked via
                    // copiedFromNodeId, duplicatedFromRepeater+copySuffix or fromVariableId containing deleted id.
                    return false;
                });
                if (!(extraCandidates.length > 0)) return [3 /*break*/, 9];
                byParent = new Map();
                for (_p = 0, remainingNodes_1 = remainingNodes_3; _p < remainingNodes_1.length; _p++) {
                    n = remainingNodes_1[_p];
                    if (!n.parentId)
                        continue;
                    arr = byParent.get(n.parentId) || [];
                    arr.push(n.id);
                    byParent.set(n.parentId, arr);
                }
                delSet = new Set();
                ddepth_2 = new Map();
                for (_q = 0, extraCandidates_1 = extraCandidates; _q < extraCandidates_1.length; _q++) {
                    cand = extraCandidates_1[_q];
                    q = [cand.id];
                    ddepth_2.set(cand.id, 0);
                    while (q.length) {
                        cur = q.shift();
                        if (delSet.has(cur))
                            continue;
                        delSet.add(cur);
                        d = ddepth_2.get(cur);
                        for (_r = 0, _s = (byParent.get(cur) || []); _r < _s.length; _r++) {
                            c = _s[_r];
                            ddepth_2.set(c, d + 1);
                            q.push(c);
                        }
                    }
                }
                ordered_2 = Array.from(delSet).sort(function (a, b) { return (ddepth_2.get(b) - ddepth_2.get(a)); });
                // reused outer deletedExtra / deletedExtraIds
                return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var _loop_10, _i, ordered_4, id;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _loop_10 = function (id) {
                                        var candidateNode, e_10;
                                        return __generator(this, function (_b) {
                                            switch (_b.label) {
                                                case 0:
                                                    candidateNode = remainingNodes_3.find(function (x) { return x.id === id; });
                                                    if (debugDelete_1 && candidateNode)
                                                        console.log('[DELETE DEBUG] Extra candidate to delete:', { id: candidateNode.id, label: candidateNode.label, metadata: candidateNode.metadata });
                                                    _b.label = 1;
                                                case 1:
                                                    _b.trys.push([1, 3, , 4]);
                                                    return [4 /*yield*/, tx.treeBranchLeafNode.delete({ where: { id: id } })];
                                                case 2:
                                                    _b.sent();
                                                    deletedExtra_1++;
                                                    deletedExtraIds_1.push(id);
                                                    return [3 /*break*/, 4];
                                                case 3:
                                                    e_10 = _b.sent();
                                                    // Ignorer les erreurs individuelles (ex: id déjà supprimé), mais logger
                                                    console.warn('[DELETE EXTRA] Failed to delete node', id, e_10.message);
                                                    return [3 /*break*/, 4];
                                                case 4: return [2 /*return*/];
                                            }
                                        });
                                    };
                                    _i = 0, ordered_4 = ordered_2;
                                    _a.label = 1;
                                case 1:
                                    if (!(_i < ordered_4.length)) return [3 /*break*/, 4];
                                    id = ordered_4[_i];
                                    return [5 /*yield**/, _loop_10(id)];
                                case 2:
                                    _a.sent();
                                    _a.label = 3;
                                case 3:
                                    _i++;
                                    return [3 /*break*/, 1];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); })];
            case 8:
                // reused outer deletedExtra / deletedExtraIds
                _y.sent();
                console.log('[DELETE] Extra display nodes deleted:', deletedExtra_1);
                console.log('[DELETE] Extra display node IDs deleted:', deletedExtraIds_1);
                _y.label = 9;
            case 9: return [3 /*break*/, 11];
            case 10:
                e_8 = _y.sent();
                console.warn('[DELETE] Extra cleanup failed', e_8.message);
                return [3 /*break*/, 11];
            case 11:
                allDeletedSet = new Set(__spreadArray(__spreadArray(__spreadArray([], deletedSubtreeIds_1, true), deletedOrphansIds_1, true), deletedExtraIds_1, true));
                allDeletedIds = Array.from(allDeletedSet);
                _y.label = 12;
            case 12:
                _y.trys.push([12, 17, , 18]);
                return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findMany({
                        where: {
                            OR: [
                                { nodeId: { in: allDeletedIds } }, // Variables attach�es aux nodes supprim�s
                                { sourceNodeId: { in: allDeletedIds } } // Variables pointant depuis les nodes supprim�s
                            ]
                        },
                        select: { id: true, name: true, nodeId: true }
                    })];
            case 13:
                variablesToCheck = _y.sent();
                console.log("[DELETE] Trouv\uFFFD ".concat(variablesToCheck.length, " variable(s) potentiellement orpheline(s)"));
                varIdsToDelete = [];
                suffixPattern = /-\d+$/;
                for (_t = 0, variablesToCheck_1 = variablesToCheck; _t < variablesToCheck_1.length; _t++) {
                    variable = variablesToCheck_1[_t];
                    // ? Ne supprimer que si c'est une variable SUFFIX�E (copie)
                    if (suffixPattern.test(variable.id)) {
                        console.log("[DELETE] ??? Variable suffix\uFFFDe sera supprim\uFFFDe: ".concat(variable.name, " (").concat(variable.id, ")"));
                        varIdsToDelete.push(variable.id);
                    }
                    else {
                        console.log("[DELETE] ??? Variable ORIGINALE sera PR\uFFFDSERV\uFFFDE: ".concat(variable.name, " (").concat(variable.id, ")"));
                    }
                }
                if (!(varIdsToDelete.length > 0)) return [3 /*break*/, 15];
                return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.deleteMany({
                        where: { id: { in: varIdsToDelete } }
                    })];
            case 14:
                deletedVarCount = _y.sent();
                console.log("[DELETE] ? ".concat(deletedVarCount.count, " variable(s) suffix\uFFFDe(s) supprim\uFFFDe(s)"));
                return [3 /*break*/, 16];
            case 15:
                console.log("[DELETE] ?? Aucune variable suffix\uFFFDe \uFFFD supprimer (variables originales pr\uFFFDserv\uFFFDes)");
                _y.label = 16;
            case 16: return [3 /*break*/, 18];
            case 17:
                varCleanError_1 = _y.sent();
                console.warn('[DELETE] Impossible de nettoyer les variables orphelines:', varCleanError_1.message);
                return [3 /*break*/, 18];
            case 18:
                _y.trys.push([18, 20, , 21]);
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                        where: { treeId: treeId },
                        select: { id: true, metadata: true }
                    })];
            case 19:
                remainingNodes = _y.sent();
                _loop_8 = function (node) {
                    var meta = node.metadata;
                    if ((meta === null || meta === void 0 ? void 0 : meta.isSumDisplayField) === true && (meta === null || meta === void 0 ? void 0 : meta.sourceNodeId)) {
                        // Ce n�ud Total doit mettre � jour sa formule
                        console.log("[DELETE] ?? Mise \uFFFD jour du champ Total: ".concat(node.id));
                        (0, sum_display_field_routes_js_1.updateSumDisplayFieldAfterCopyChange)(String(meta.sourceNodeId), prisma).catch(function (err) {
                            console.warn("[DELETE] ?? Erreur mise \uFFFD jour champ Total ".concat(node.id, ":"), err);
                        });
                    }
                };
                for (_u = 0, remainingNodes_2 = remainingNodes; _u < remainingNodes_2.length; _u++) {
                    node = remainingNodes_2[_u];
                    _loop_8(node);
                }
                return [3 /*break*/, 21];
            case 20:
                sumUpdateError_1 = _y.sent();
                console.warn('[DELETE] Erreur lors de la mise � jour des champs Total:', sumUpdateError_1.message);
                return [3 /*break*/, 21];
            case 21:
                res.json({
                    success: true,
                    message: "Sous-arbre supprim\uFFFD (".concat(deletedSubtreeIds_1.length, " n\uFFFDud(s)), orphelines supprim\uFFFDes: ").concat(deletedOrphans_1),
                    deletedCount: deletedSubtreeIds_1.length,
                    deletedIds: allDeletedIds, // merged: subtree + orphan + extra display nodes
                    deletedOrphansCount: deletedOrphans_1,
                    deletedOrphansIds: deletedOrphansIds_1,
                    deletedExtraCount: deletedExtra_1,
                    deletedExtraIds: deletedExtraIds_1
                });
                _y.label = 22;
            case 22:
                _y.trys.push([22, 26, , 27]);
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({ where: { treeId: treeId } })];
            case 23:
                remainingAfterFirstPass = _y.sent();
                deeperDeletedIds = [];
                removedIdStrings_1 = allDeletedIds.map(function (i) { return String(i); });
                containsRemovedId_1 = function (val) {
                    if (val == null)
                        return false;
                    if (typeof val === 'string') {
                        // check direct equality or contains patterns
                        for (var _i = 0, removedIdStrings_2 = removedIdStrings_1; _i < removedIdStrings_2.length; _i++) {
                            var rid = removedIdStrings_2[_i];
                            if (val === rid)
                                return true;
                            if (val.includes(rid))
                                return true;
                        }
                        return false;
                    }
                    if (typeof val === 'number' || typeof val === 'boolean')
                        return false;
                    if (Array.isArray(val))
                        return val.some(function (v) { return containsRemovedId_1(v); });
                    if (typeof val === 'object') {
                        for (var _a = 0, _b = Object.keys(val); _a < _b.length; _a++) {
                            var k = _b[_a];
                            if (containsRemovedId_1(val[k]))
                                return true;
                        }
                    }
                    return false;
                };
                extraToDelete_1 = remainingAfterFirstPass.filter(function (n) {
                    if (!n.metadata)
                        return false;
                    // ??? PROTECTION: Ne JAMAIS supprimer les n�uds Total (sum-display-field)
                    // Ces n�uds contiennent des r�f�rences aux copies dans sumTokens mais doivent persister
                    var meta = n.metadata;
                    if ((meta === null || meta === void 0 ? void 0 : meta.isSumDisplayField) === true) {
                        console.log("[AGGRESSIVE CLEANUP] ??? N\uFFFDud Total PROT\uFFFDG\uFFFD: ".concat(n.id, " (").concat(n.label, ")"));
                        return false;
                    }
                    // ??? PROTECTION: Ne JAMAIS supprimer les n�uds avec ID finissant par -sum-total
                    if (n.id.endsWith('-sum-total')) {
                        console.log("[AGGRESSIVE CLEANUP] ??? N\uFFFDud Total PROT\uFFFDG\uFFFD (par ID): ".concat(n.id));
                        return false;
                    }
                    try {
                        return containsRemovedId_1(n.metadata);
                    }
                    catch (_a) {
                        return false;
                    }
                }).map(function (x) { return x.id; });
                if (!(extraToDelete_1.length > 0)) return [3 /*break*/, 25];
                dd_1 = [];
                return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var _i, extraToDelete_2, id, err_2;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _i = 0, extraToDelete_2 = extraToDelete_1;
                                    _a.label = 1;
                                case 1:
                                    if (!(_i < extraToDelete_2.length)) return [3 /*break*/, 6];
                                    id = extraToDelete_2[_i];
                                    _a.label = 2;
                                case 2:
                                    _a.trys.push([2, 4, , 5]);
                                    return [4 /*yield*/, tx.treeBranchLeafNode.delete({ where: { id: id } })];
                                case 3:
                                    _a.sent();
                                    dd_1.push(id);
                                    return [3 /*break*/, 5];
                                case 4:
                                    err_2 = _a.sent();
                                    console.warn('[AGGRESSIVE CLEANUP] Failed to delete node', id, err_2.message);
                                    return [3 /*break*/, 5];
                                case 5:
                                    _i++;
                                    return [3 /*break*/, 1];
                                case 6: return [2 /*return*/];
                            }
                        });
                    }); })];
            case 24:
                _y.sent();
                if (dd_1.length > 0) {
                    console.log('[AGGRESSIVE CLEANUP] Additional deleted nodes (by metadata scan):', dd_1);
                }
                _y.label = 25;
            case 25: return [3 /*break*/, 27];
            case 26:
                e_9 = _y.sent();
                console.warn('[AGGRESSIVE CLEANUP] Failed aggressive metadata scan:', e_9.message);
                return [3 /*break*/, 27];
            case 27: return [3 /*break*/, 29];
            case 28:
                error_14 = _y.sent();
                console.error('[TreeBranchLeaf API] Error deleting node subtree:', error_14);
                res.status(500).json({ error: 'Impossible de supprimer le nœud et ses descendants' });
                return [3 /*break*/, 29];
            case 29: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// � NODE INFO - Infos d'un nœud par ID
// =============================================================================
// GET /api/treebranchleaf/nodes/:nodeId
// Retourne des infos minimales du nœud (pour récupérer le treeId depuis nodeId)
router.get('/nodes/:nodeId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, _a, organizationId, isSuperAdmin, node, nodeOrg, hasOrgCtx, error_15;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                nodeId = req.params.nodeId;
                _a = req.user, organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({
                        where: { id: nodeId },
                        select: {
                            id: true,
                            treeId: true,
                            parentId: true,
                            type: true,
                            subType: true,
                            label: true,
                            metadata: true,
                            TreeBranchLeafTree: { select: { organizationId: true } }
                        }
                    })];
            case 1:
                node = _c.sent();
                if (!node)
                    return [2 /*return*/, res.status(404).json({ error: 'Nœud non trouvé' })];
                nodeOrg = (_b = node.TreeBranchLeafTree) === null || _b === void 0 ? void 0 : _b.organizationId;
                hasOrgCtx = typeof organizationId === 'string' && organizationId.length > 0;
                if (!isSuperAdmin && hasOrgCtx && nodeOrg && nodeOrg !== organizationId) {
                    return [2 /*return*/, res.status(403).json({ error: 'Accès refusé' })];
                }
                return [2 /*return*/, res.json({
                        id: node.id,
                        treeId: node.treeId,
                        parentId: node.parentId,
                        type: node.type,
                        subType: node.subType,
                        label: node.label,
                        metadata: node.metadata
                    })];
            case 2:
                error_15 = _c.sent();
                console.error('[TreeBranchLeaf API] Error fetching node info:', error_15);
                res.status(500).json({ error: 'Erreur lors de la récupération du nœud' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// 🔎 ANALYSE COMPLÈTE D'UNE BRANCHE (CASCADE + RÉFÉRENCES)
// =============================================================================
// GET /api/treebranchleaf/nodes/:nodeId/full
// Retourne la branche complète à partir d'un nœud: tous les descendants, les options,
// et les références partagées RÉSOLUES (objets complets) sans doublons
router.get('/nodes/:nodeId/full', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, _a, organizationId, isSuperAdmin, root, all, byId_1, childrenByParent_1, _i, all_1, n, arr, collected, queue, cur, children, _b, children_3, c, sharedIds, _c, collected_1, id, n, _d, _e, rid, sharedNodes, _f, sharedById_1, nodes, error_16;
    var _g;
    return __generator(this, function (_h) {
        switch (_h.label) {
            case 0:
                _h.trys.push([0, 6, , 7]);
                nodeId = req.params.nodeId;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({
                        where: { id: nodeId },
                        include: { TreeBranchLeafTree: { select: { id: true, organizationId: true } } }
                    })];
            case 1:
                root = _h.sent();
                if (!root)
                    return [2 /*return*/, res.status(404).json({ error: 'Nœud introuvable' })];
                if (!isSuperAdmin && organizationId && ((_g = root.TreeBranchLeafTree) === null || _g === void 0 ? void 0 : _g.organizationId) && root.TreeBranchLeafTree.organizationId !== organizationId) {
                    return [2 /*return*/, res.status(403).json({ error: 'Accès non autorisé' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({ where: { treeId: root.treeId } })];
            case 2:
                all = _h.sent();
                byId_1 = new Map(all.map(function (n) { return [n.id, n]; }));
                childrenByParent_1 = new Map();
                for (_i = 0, all_1 = all; _i < all_1.length; _i++) {
                    n = all_1[_i];
                    if (!n.parentId)
                        continue;
                    arr = childrenByParent_1.get(n.parentId) || [];
                    arr.push(n.id);
                    childrenByParent_1.set(n.parentId, arr);
                }
                collected = new Set();
                queue = [root.id];
                while (queue.length) {
                    cur = queue.shift();
                    if (collected.has(cur))
                        continue;
                    collected.add(cur);
                    children = childrenByParent_1.get(cur) || [];
                    for (_b = 0, children_3 = children; _b < children_3.length; _b++) {
                        c = children_3[_b];
                        queue.push(c);
                    }
                }
                sharedIds = new Set();
                for (_c = 0, collected_1 = collected; _c < collected_1.length; _c++) {
                    id = collected_1[_c];
                    n = byId_1.get(id);
                    if (!n)
                        continue;
                    if (n.sharedReferenceId)
                        sharedIds.add(n.sharedReferenceId);
                    if (Array.isArray(n.sharedReferenceIds))
                        for (_d = 0, _e = n.sharedReferenceIds; _d < _e.length; _d++) {
                            rid = _e[_d];
                            sharedIds.add(rid);
                        }
                }
                if (!(sharedIds.size > 0)) return [3 /*break*/, 4];
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({ where: { id: { in: Array.from(sharedIds) } } })];
            case 3:
                _f = _h.sent();
                return [3 /*break*/, 5];
            case 4:
                _f = [];
                _h.label = 5;
            case 5:
                sharedNodes = _f;
                sharedById_1 = new Map(sharedNodes.map(function (n) { return [n.id, n]; }));
                nodes = Array.from(collected).map(function (id) {
                    var node = byId_1.get(id);
                    var response = buildResponseFromColumns(node);
                    var childIds = childrenByParent_1.get(id) || [];
                    var optionChildrenIds = childIds.filter(function (cid) { var _a; return (((_a = byId_1.get(cid)) === null || _a === void 0 ? void 0 : _a.type) || '').toLowerCase() === 'leaf_option'.toLowerCase(); });
                    // Résolution des références partagées de ce nœud
                    var resolvedShared = [];
                    if (node.sharedReferenceId && sharedById_1.has(node.sharedReferenceId)) {
                        resolvedShared.push(buildResponseFromColumns(sharedById_1.get(node.sharedReferenceId)));
                    }
                    if (Array.isArray(node.sharedReferenceIds)) {
                        for (var _i = 0, _a = node.sharedReferenceIds; _i < _a.length; _i++) {
                            var rid = _a[_i];
                            if (sharedById_1.has(rid))
                                resolvedShared.push(buildResponseFromColumns(sharedById_1.get(rid)));
                        }
                    }
                    return __assign(__assign({}, response), { childrenIds: childIds, optionChildrenIds: optionChildrenIds, sharedReferencesResolved: resolvedShared });
                });
                // Index rapide et racine enrichie
                res.json({
                    rootId: root.id,
                    treeId: root.treeId,
                    count: nodes.length,
                    nodes: nodes
                });
                return [3 /*break*/, 7];
            case 6:
                error_16 = _h.sent();
                console.error('❌ [/nodes/:nodeId/full] Erreur:', error_16);
                res.status(500).json({ error: 'Erreur lors de l’analyse complète de la branche' });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// 🔎 ANALYSE CIBLÉE DES RÉFÉRENCES PARTAGÉES D'UN NŒUD
// =============================================================================
// GET /api/treebranchleaf/nodes/:nodeId/shared-references
// Inspecte uniquement les colonnes sharedReferenceId + sharedReferenceIds du nœud ciblé
// et retourne les nœuds référencés (résolus), avec un indicateur de "champ conditionnel".
router.get('/nodes/:nodeId/shared-references', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, _a, organizationId, isSuperAdmin, node, ids, _i, _b, rid, refs, refIds, conditionCounts, condCountByNode_1, resolved, error_17;
    var _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                _f.trys.push([0, 4, , 5]);
                nodeId = req.params.nodeId;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({
                        where: { id: nodeId },
                        include: { TreeBranchLeafTree: { select: { id: true, organizationId: true } } }
                    })];
            case 1:
                node = _f.sent();
                if (!node)
                    return [2 /*return*/, res.status(404).json({ error: 'Nœud introuvable' })];
                if (!isSuperAdmin && organizationId && ((_c = node.TreeBranchLeafTree) === null || _c === void 0 ? void 0 : _c.organizationId) && node.TreeBranchLeafTree.organizationId !== organizationId) {
                    return [2 /*return*/, res.status(403).json({ error: 'Accès non autorisé' })];
                }
                ids = new Set();
                if (node.sharedReferenceId)
                    ids.add(node.sharedReferenceId);
                if (Array.isArray(node.sharedReferenceIds))
                    for (_i = 0, _b = node.sharedReferenceIds; _i < _b.length; _i++) {
                        rid = _b[_i];
                        ids.add(rid);
                    }
                if (ids.size === 0) {
                    return [2 /*return*/, res.json({ nodeId: nodeId, count: 0, shared: { ids: { single: (_d = node.sharedReferenceId) !== null && _d !== void 0 ? _d : null, multiple: [] }, resolved: [] } })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({ where: { id: { in: Array.from(ids) } } })];
            case 2:
                refs = _f.sent();
                refIds = refs.map(function (r) { return r.id; });
                return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.groupBy({
                        by: ['nodeId'],
                        _count: { nodeId: true },
                        where: { nodeId: { in: refIds } }
                    })];
            case 3:
                conditionCounts = _f.sent();
                condCountByNode_1 = new Map(conditionCounts.map(function (c) { return [c.nodeId, c._count.nodeId]; }));
                resolved = refs.map(function (ref) {
                    var enriched = buildResponseFromColumns(ref);
                    var hasCondFlag = !!ref.hasCondition || (condCountByNode_1.get(ref.id) || 0) > 0;
                    return __assign(__assign({}, enriched), { isConditional: hasCondFlag, conditionCount: condCountByNode_1.get(ref.id) || 0 });
                });
                // 4) Réponse structurée
                res.json({
                    nodeId: nodeId,
                    count: resolved.length,
                    shared: {
                        ids: {
                            single: (_e = node.sharedReferenceId) !== null && _e !== void 0 ? _e : null,
                            multiple: Array.isArray(node.sharedReferenceIds) ? node.sharedReferenceIds : []
                        },
                        resolved: resolved
                    }
                });
                return [3 /*break*/, 5];
            case 4:
                error_17 = _f.sent();
                console.error('❌ [/nodes/:nodeId/shared-references] Erreur:', error_17);
                res.status(500).json({ error: 'Erreur lors de l’analyse des références partagées' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// 🔁 APPLIQUER LES RÉFÉRENCES PARTAGÉES DU GABARIT ORIGINAL À LA COPIE
// =============================================================================
// POST /api/treebranchleaf/nodes/:nodeId/apply-shared-references-from-original
// Pour un nœud copié (ayant metadata.copiedFromNodeId), propage les colonnes
// sharedReferenceId/sharedReferenceIds de CHAQUE nœud original vers le nœud copié
// correspondant (reconnu par metadata.copiedFromNodeId), sans créer d'enfants.
function applySharedReferencesFromOriginalInternal(req, nodeId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, organizationId, isSuperAdmin, copyRoot, all, byId, childrenByParent, _i, all_2, n, arr, collectedCopyIds, queue, cur, _b, _c, c, originalToCopy, _d, collectedCopyIds_1, id, n, meta, origId, originalIds, originals, allRefIds, _e, originals_1, orig, metaRoot, chosenSuffix, maxSuffix, SUFFIX_RE, _f, all_3, n, m, num, refCopyIdByOriginal, desiredIds, existingRefCopies, _g, existingSet, ensureRefCopy, _h, allRefIds_1, rid, updates, applied, _j, originals_2, orig, copyId, origMultiple, origSingle, mappedMultiple, mappedSingle, finalArray, finalSingle;
        var _this = this;
        var _k, _l, _o, _p;
        return __generator(this, function (_q) {
            switch (_q.label) {
                case 0:
                    _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({
                            where: { id: nodeId },
                            include: { TreeBranchLeafTree: { select: { id: true, organizationId: true } } }
                        })];
                case 1:
                    copyRoot = _q.sent();
                    if (!copyRoot)
                        throw new Error('Nœud introuvable');
                    if (!isSuperAdmin && organizationId && ((_k = copyRoot.TreeBranchLeafTree) === null || _k === void 0 ? void 0 : _k.organizationId) && copyRoot.TreeBranchLeafTree.organizationId !== organizationId) {
                        throw new Error('Accès non autorisé');
                    }
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({ where: { treeId: copyRoot.treeId } })];
                case 2:
                    all = _q.sent();
                    byId = new Map(all.map(function (n) { return [n.id, n]; }));
                    childrenByParent = new Map();
                    for (_i = 0, all_2 = all; _i < all_2.length; _i++) {
                        n = all_2[_i];
                        if (!n.parentId)
                            continue;
                        arr = childrenByParent.get(n.parentId) || [];
                        arr.push(n.id);
                        childrenByParent.set(n.parentId, arr);
                    }
                    collectedCopyIds = new Set();
                    queue = [copyRoot.id];
                    while (queue.length) {
                        cur = queue.shift();
                        if (collectedCopyIds.has(cur))
                            continue;
                        collectedCopyIds.add(cur);
                        for (_b = 0, _c = (childrenByParent.get(cur) || []); _b < _c.length; _b++) {
                            c = _c[_b];
                            queue.push(c);
                        }
                    }
                    originalToCopy = new Map();
                    for (_d = 0, collectedCopyIds_1 = collectedCopyIds; _d < collectedCopyIds_1.length; _d++) {
                        id = collectedCopyIds_1[_d];
                        n = byId.get(id);
                        if (!n)
                            continue;
                        meta = (n.metadata || {});
                        origId = String(meta.copiedFromNodeId || '');
                        if (origId)
                            originalToCopy.set(origId, n.id);
                    }
                    if (originalToCopy.size === 0)
                        return [2 /*return*/, { success: true, applied: 0, suffix: 0 }];
                    originalIds = Array.from(originalToCopy.keys());
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({ where: { id: { in: originalIds } } })];
                case 3:
                    originals = _q.sent();
                    allRefIds = new Set();
                    for (_e = 0, originals_1 = originals; _e < originals_1.length; _e++) {
                        orig = originals_1[_e];
                        if (orig.sharedReferenceId)
                            allRefIds.add(orig.sharedReferenceId);
                        if (Array.isArray(orig.sharedReferenceIds))
                            orig.sharedReferenceIds.forEach(function (id) { return id && allRefIds.add(id); });
                    }
                    metaRoot = copyRoot.metadata || {};
                    chosenSuffix = typeof metaRoot.copySuffix === 'number' ? metaRoot.copySuffix : null;
                    if (!!chosenSuffix) return [3 /*break*/, 5];
                    maxSuffix = 0;
                    SUFFIX_RE = /^(shared-ref-[A-Za-z0-9_\-]+)-(\d+)$/;
                    for (_f = 0, all_3 = all; _f < all_3.length; _f++) {
                        n = all_3[_f];
                        m = typeof n.id === 'string' ? n.id.match(SUFFIX_RE) : null;
                        if (m) {
                            num = Number(m[2]);
                            if (!Number.isNaN(num))
                                maxSuffix = Math.max(maxSuffix, num);
                        }
                    }
                    chosenSuffix = maxSuffix + 1 || 1;
                    // Persister ce suffixe sur la racine de la copie pour qu'il soit réutilisé ensuite
                    return [4 /*yield*/, prisma.treeBranchLeafNode.update({ where: { id: copyRoot.id }, data: { metadata: __assign(__assign({}, metaRoot), { copySuffix: chosenSuffix }) } })];
                case 4:
                    // Persister ce suffixe sur la racine de la copie pour qu'il soit réutilisé ensuite
                    _q.sent();
                    _q.label = 5;
                case 5:
                    refCopyIdByOriginal = new Map();
                    desiredIds = Array.from(allRefIds).map(function (id) { return "".concat(id, "-").concat(chosenSuffix); });
                    if (!(desiredIds.length > 0)) return [3 /*break*/, 7];
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({ where: { id: { in: desiredIds } } })];
                case 6:
                    _g = _q.sent();
                    return [3 /*break*/, 8];
                case 7:
                    _g = [];
                    _q.label = 8;
                case 8:
                    existingRefCopies = _g;
                    existingSet = new Set(existingRefCopies.map(function (n) { return n.id; }));
                    ensureRefCopy = function (origRefId) { return __awaiter(_this, void 0, void 0, function () {
                        var desiredRootId, subtreeIds, q, seen, cur, kids, _i, kids_1, cid, origSubtree, desired, already, _a, already_1, n, idMap, _b, subtreeIds_1, id, _c, origSubtree_1, orig, newId, newParentId, toCreate, variableCopyCache, formulaIdMap, conditionIdMap, tableIdMap, globalNodeIdMap, _d, _e, originalVarId, copyResult, e_11;
                        var _f, _g, _h, _j, _k, _l, _o, _p, _q, _r, _s, _t;
                        return __generator(this, function (_u) {
                            switch (_u.label) {
                                case 0:
                                    desiredRootId = "".concat(origRefId, "-").concat(chosenSuffix);
                                    if (existingSet.has(desiredRootId)) {
                                        refCopyIdByOriginal.set(origRefId, desiredRootId);
                                        return [2 /*return*/, desiredRootId];
                                    }
                                    subtreeIds = [];
                                    q = [origRefId];
                                    seen = new Set();
                                    while (q.length) {
                                        cur = q.shift();
                                        if (seen.has(cur))
                                            continue;
                                        seen.add(cur);
                                        subtreeIds.push(cur);
                                        kids = childrenByParent.get(cur) || [];
                                        for (_i = 0, kids_1 = kids; _i < kids_1.length; _i++) {
                                            cid = kids_1[_i];
                                            q.push(cid);
                                        }
                                    }
                                    origSubtree = subtreeIds.map(function (id) { return byId.get(id); }).filter(Boolean);
                                    desired = new Set(subtreeIds.map(function (id) { return "".concat(id, "-").concat(chosenSuffix); }));
                                    if (!(desired.size > 0)) return [3 /*break*/, 2];
                                    return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({ where: { id: { in: Array.from(desired) } } })];
                                case 1:
                                    already = _u.sent();
                                    for (_a = 0, already_1 = already; _a < already_1.length; _a++) {
                                        n = already_1[_a];
                                        desired.delete(n.id);
                                    }
                                    _u.label = 2;
                                case 2:
                                    idMap = new Map();
                                    for (_b = 0, subtreeIds_1 = subtreeIds; _b < subtreeIds_1.length; _b++) {
                                        id = subtreeIds_1[_b];
                                        idMap.set(id, "".concat(id, "-").concat(chosenSuffix));
                                    }
                                    _c = 0, origSubtree_1 = origSubtree;
                                    _u.label = 3;
                                case 3:
                                    if (!(_c < origSubtree_1.length)) return [3 /*break*/, 11];
                                    orig = origSubtree_1[_c];
                                    newId = idMap.get(orig.id);
                                    if (!desired.has(newId))
                                        return [3 /*break*/, 10];
                                    newParentId = orig.parentId ? (_f = idMap.get(orig.parentId)) !== null && _f !== void 0 ? _f : null : null;
                                    toCreate = {
                                        id: newId,
                                        treeId: copyRoot.treeId,
                                        type: orig.type,
                                        subType: orig.subType,
                                        fieldType: (_g = orig.fieldType) !== null && _g !== void 0 ? _g : 'TEXT',
                                        label: orig.label,
                                        description: orig.description,
                                        parentId: newParentId,
                                        order: (_h = orig.order) !== null && _h !== void 0 ? _h : 9999,
                                        isVisible: (_j = orig.isVisible) !== null && _j !== void 0 ? _j : true,
                                        isActive: (_k = orig.isActive) !== null && _k !== void 0 ? _k : true,
                                        isRequired: (_l = orig.isRequired) !== null && _l !== void 0 ? _l : false,
                                        isMultiple: (_o = orig.isMultiple) !== null && _o !== void 0 ? _o : false,
                                        hasData: false,
                                        hasFormula: false,
                                        hasCondition: false,
                                        hasTable: false,
                                        hasAPI: false,
                                        hasLink: false,
                                        hasMarkers: false,
                                        isSharedReference: orig.id === origRefId ? true : (_p = orig.isSharedReference) !== null && _p !== void 0 ? _p : false,
                                        sharedReferenceId: null,
                                        sharedReferenceIds: [],
                                        sharedReferenceName: (_r = (_q = orig.sharedReferenceName) !== null && _q !== void 0 ? _q : orig.label) !== null && _r !== void 0 ? _r : null,
                                        sharedReferenceDescription: (_t = (_s = orig.sharedReferenceDescription) !== null && _s !== void 0 ? _s : orig.description) !== null && _t !== void 0 ? _t : null,
                                        // ?? COLONNES LINKED*** : Copier les r�f�rences depuis le n�ud original avec IDs suffix�s
                                        linkedFormulaIds: Array.isArray(orig.linkedFormulaIds)
                                            ? orig.linkedFormulaIds.map(function (id) { return "".concat(id, "-").concat(chosenSuffix); }).filter(Boolean)
                                            : [],
                                        linkedConditionIds: Array.isArray(orig.linkedConditionIds)
                                            ? orig.linkedConditionIds.map(function (id) { return "".concat(id, "-").concat(chosenSuffix); }).filter(Boolean)
                                            : [],
                                        linkedTableIds: Array.isArray(orig.linkedTableIds)
                                            ? orig.linkedTableIds.map(function (id) { return "".concat(id, "-").concat(chosenSuffix); }).filter(Boolean)
                                            : [],
                                        linkedVariableIds: Array.isArray(orig.linkedVariableIds)
                                            ? orig.linkedVariableIds.map(function (id) { return "".concat(id, "-").concat(chosenSuffix); }).filter(Boolean)
                                            : [],
                                        metadata: __assign(__assign({}, (orig.metadata || {})), { copiedFromNodeId: orig.id }),
                                        updatedAt: new Date(),
                                    };
                                    return [4 /*yield*/, prisma.treeBranchLeafNode.create({ data: toCreate })];
                                case 4:
                                    _u.sent();
                                    if (!(Array.isArray(orig.linkedVariableIds) && orig.linkedVariableIds.length > 0)) return [3 /*break*/, 10];
                                    console.log("?? [SHARED-REF] Copie de ".concat(orig.linkedVariableIds.length, " variable(s) pour ").concat(newId));
                                    variableCopyCache = new Map();
                                    formulaIdMap = new Map();
                                    conditionIdMap = new Map();
                                    tableIdMap = new Map();
                                    globalNodeIdMap = new Map(__spreadArray(__spreadArray([], originalToCopy, true), idMap, true));
                                    _d = 0, _e = orig.linkedVariableIds;
                                    _u.label = 5;
                                case 5:
                                    if (!(_d < _e.length)) return [3 /*break*/, 10];
                                    originalVarId = _e[_d];
                                    _u.label = 6;
                                case 6:
                                    _u.trys.push([6, 8, , 9]);
                                    return [4 /*yield*/, (0, variable_copy_engine_js_1.copyVariableWithCapacities)(originalVarId, chosenSuffix, newId, // Le nouveau n�ud qui poss�de cette variable
                                        prisma, {
                                            formulaIdMap: formulaIdMap,
                                            conditionIdMap: conditionIdMap,
                                            tableIdMap: tableIdMap,
                                            nodeIdMap: globalNodeIdMap, // Utiliser le mapping global
                                            variableCopyCache: variableCopyCache,
                                            autoCreateDisplayNode: true
                                        })];
                                case 7:
                                    copyResult = _u.sent();
                                    if (copyResult.success) {
                                        console.log("  ? [SHARED-REF] Variable copi\uFFFDe: ".concat(copyResult.variableId));
                                    }
                                    else {
                                        console.warn("  ?? [SHARED-REF] \uFFFDchec copie variable ".concat(originalVarId, ": ").concat(copyResult.error));
                                    }
                                    return [3 /*break*/, 9];
                                case 8:
                                    e_11 = _u.sent();
                                    console.warn("  ?? [SHARED-REF] Erreur copie variable ".concat(originalVarId, ":"), e_11.message);
                                    return [3 /*break*/, 9];
                                case 9:
                                    _d++;
                                    return [3 /*break*/, 5];
                                case 10:
                                    _c++;
                                    return [3 /*break*/, 3];
                                case 11:
                                    refCopyIdByOriginal.set(origRefId, desiredRootId);
                                    return [2 /*return*/, desiredRootId];
                            }
                        });
                    }); };
                    _h = 0, allRefIds_1 = allRefIds;
                    _q.label = 9;
                case 9:
                    if (!(_h < allRefIds_1.length)) return [3 /*break*/, 12];
                    rid = allRefIds_1[_h];
                    return [4 /*yield*/, ensureRefCopy(rid)];
                case 10:
                    _q.sent();
                    _q.label = 11;
                case 11:
                    _h++;
                    return [3 /*break*/, 9];
                case 12:
                    updates = [];
                    applied = 0;
                    for (_j = 0, originals_2 = originals; _j < originals_2.length; _j++) {
                        orig = originals_2[_j];
                        copyId = originalToCopy.get(orig.id);
                        origMultiple = Array.isArray(orig.sharedReferenceIds) ? orig.sharedReferenceIds.filter(Boolean) : [];
                        origSingle = (_l = orig.sharedReferenceId) !== null && _l !== void 0 ? _l : null;
                        mappedMultiple = origMultiple.map(function (id) { return refCopyIdByOriginal.get(id) || "".concat(id, "-").concat(chosenSuffix); });
                        mappedSingle = origSingle ? (refCopyIdByOriginal.get(origSingle) || "".concat(origSingle, "-").concat(chosenSuffix)) : null;
                        finalArray = mappedMultiple.length > 0 ? mappedMultiple : (mappedSingle ? [mappedSingle] : []);
                        finalSingle = finalArray.length > 0 ? finalArray[0] : null;
                        updates.push(prisma.treeBranchLeafNode.update({
                            where: { id: copyId },
                            data: {
                                sharedReferenceId: finalSingle,
                                sharedReferenceIds: finalArray,
                                sharedReferenceName: (_o = orig.sharedReferenceName) !== null && _o !== void 0 ? _o : null,
                                sharedReferenceDescription: (_p = orig.sharedReferenceDescription) !== null && _p !== void 0 ? _p : null,
                                isSharedReference: false,
                                hasData: orig.hasData,
                                updatedAt: new Date()
                            }
                        }));
                        applied++;
                    }
                    return [4 /*yield*/, prisma.$transaction(updates)];
                case 13:
                    _q.sent();
                    return [2 /*return*/, { success: true, applied: applied, suffix: chosenSuffix }];
            }
        });
    });
}
// Route HTTP qui appelle la fonction interne
router.post('/nodes/:nodeId/apply-shared-references-from-original', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, result, error_18;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                nodeId = req.params.nodeId;
                return [4 /*yield*/, applySharedReferencesFromOriginalInternal(req, nodeId)];
            case 1:
                result = _a.sent();
                return [2 /*return*/, res.json(result)];
            case 2:
                error_18 = _a.sent();
                console.error('❌ [/nodes/:nodeId/apply-shared-references-from-original] Erreur:', error_18);
                res.status(500).json({ error: 'Erreur lors de l\'application des références partagées' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// 🧹 DÉLIER (ET OPTIONNELLEMENT SUPPRIMER) LES RÉFÉRENCES PARTAGÉES D'UNE COPIE
// =============================================================================
// POST /api/treebranchleaf/nodes/:nodeId/unlink-shared-references
// - Délie toutes les références partagées (sharedReferenceId/sharedReferenceIds) dans la sous-arborescence du nœud
// - Optionnel: supprime les sous-arbres de références copiées (suffixées) devenues orphelines
router.post('/nodes/:nodeId/unlink-shared-references', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, deleteOrphans, _a, organizationId, isSuperAdmin, root, all, byId_2, childrenByParent, _i, all_4, n, arr, collected, queue, cur, _b, _c, c, referencedIds_2, _d, collected_2, id, n, updates, _e, collected_3, id, deletedCount_1, orphanCandidates, elsewhereRefers_1, _f, all_5, n, _g, _h, rid, toDeleteRoots, delSet, depth_3, _j, toDeleteRoots_1, rid, q, cur, d, _k, _l, c, ordered_5, error_19;
    var _o;
    return __generator(this, function (_p) {
        switch (_p.label) {
            case 0:
                _p.trys.push([0, 6, , 7]);
                nodeId = req.params.nodeId;
                deleteOrphans = (req.body || {}).deleteOrphans;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({
                        where: { id: nodeId },
                        include: { TreeBranchLeafTree: { select: { id: true, organizationId: true } } }
                    })];
            case 1:
                root = _p.sent();
                if (!root)
                    return [2 /*return*/, res.status(404).json({ error: 'Nœud introuvable' })];
                if (!isSuperAdmin && organizationId && ((_o = root.TreeBranchLeafTree) === null || _o === void 0 ? void 0 : _o.organizationId) && root.TreeBranchLeafTree.organizationId !== organizationId) {
                    return [2 /*return*/, res.status(403).json({ error: 'Accès non autorisé' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({ where: { treeId: root.treeId } })];
            case 2:
                all = _p.sent();
                byId_2 = new Map(all.map(function (n) { return [n.id, n]; }));
                childrenByParent = new Map();
                for (_i = 0, all_4 = all; _i < all_4.length; _i++) {
                    n = all_4[_i];
                    if (!n.parentId)
                        continue;
                    arr = childrenByParent.get(n.parentId) || [];
                    arr.push(n.id);
                    childrenByParent.set(n.parentId, arr);
                }
                collected = new Set();
                queue = [root.id];
                while (queue.length) {
                    cur = queue.shift();
                    if (collected.has(cur))
                        continue;
                    collected.add(cur);
                    for (_b = 0, _c = (childrenByParent.get(cur) || []); _b < _c.length; _b++) {
                        c = _c[_b];
                        queue.push(c);
                    }
                }
                referencedIds_2 = new Set();
                for (_d = 0, collected_2 = collected; _d < collected_2.length; _d++) {
                    id = collected_2[_d];
                    n = byId_2.get(id);
                    if (!n)
                        continue;
                    if (n.sharedReferenceId)
                        referencedIds_2.add(n.sharedReferenceId);
                    if (Array.isArray(n.sharedReferenceIds))
                        n.sharedReferenceIds.forEach(function (rid) { return rid && referencedIds_2.add(rid); });
                }
                updates = [];
                for (_e = 0, collected_3 = collected; _e < collected_3.length; _e++) {
                    id = collected_3[_e];
                    updates.push(prisma.treeBranchLeafNode.update({ where: { id: id }, data: { sharedReferenceId: null, sharedReferenceIds: [] } }));
                }
                return [4 /*yield*/, prisma.$transaction(updates)];
            case 3:
                _p.sent();
                deletedCount_1 = 0;
                orphanCandidates = [];
                if (!(deleteOrphans && referencedIds_2.size > 0)) return [3 /*break*/, 5];
                // Candidats = références existantes dont l'ID existe dans l'arbre
                orphanCandidates = Array.from(referencedIds_2).filter(function (id) { return byId_2.has(id); });
                elsewhereRefers_1 = new Set();
                for (_f = 0, all_5 = all; _f < all_5.length; _f++) {
                    n = all_5[_f];
                    if (collected.has(n.id))
                        continue; // on ignore la sous-arborescence déjà délier
                    if (n.sharedReferenceId && referencedIds_2.has(n.sharedReferenceId))
                        elsewhereRefers_1.add(n.sharedReferenceId);
                    if (Array.isArray(n.sharedReferenceIds))
                        for (_g = 0, _h = n.sharedReferenceIds; _g < _h.length; _g++) {
                            rid = _h[_g];
                            if (referencedIds_2.has(rid))
                                elsewhereRefers_1.add(rid);
                        }
                }
                toDeleteRoots = orphanCandidates.filter(function (id) { return !elsewhereRefers_1.has(id); });
                if (!(toDeleteRoots.length > 0)) return [3 /*break*/, 5];
                delSet = new Set();
                depth_3 = new Map();
                for (_j = 0, toDeleteRoots_1 = toDeleteRoots; _j < toDeleteRoots_1.length; _j++) {
                    rid = toDeleteRoots_1[_j];
                    q = [rid];
                    depth_3.set(rid, 0);
                    while (q.length) {
                        cur = q.shift();
                        if (delSet.has(cur))
                            continue;
                        delSet.add(cur);
                        d = depth_3.get(cur);
                        for (_k = 0, _l = (childrenByParent.get(cur) || []); _k < _l.length; _k++) {
                            c = _l[_k];
                            depth_3.set(c, d + 1);
                            q.push(c);
                        }
                    }
                }
                ordered_5 = Array.from(delSet);
                ordered_5.sort(function (a, b) { return (depth_3.get(b) - depth_3.get(a)); });
                return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var _i, ordered_6, id;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _i = 0, ordered_6 = ordered_5;
                                    _a.label = 1;
                                case 1:
                                    if (!(_i < ordered_6.length)) return [3 /*break*/, 4];
                                    id = ordered_6[_i];
                                    return [4 /*yield*/, tx.treeBranchLeafNode.delete({ where: { id: id } })];
                                case 2:
                                    _a.sent();
                                    deletedCount_1++;
                                    _a.label = 3;
                                case 3:
                                    _i++;
                                    return [3 /*break*/, 1];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); })];
            case 4:
                _p.sent();
                _p.label = 5;
            case 5: return [2 /*return*/, res.json({ success: true, unlinked: collected.size, orphanCandidates: orphanCandidates, deletedOrphans: deletedCount_1 })];
            case 6:
                error_19 = _p.sent();
                console.error('❌ [/nodes/:nodeId/unlink-shared-references] Erreur:', error_19);
                res.status(500).json({ error: 'Erreur lors du délier/suppression des références partagées' });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// GET /api/treebranchleaf/nodes/:tableNodeId/table/lookup - Récupère les données pour un select basé sur une table
// ⚠️ ANCIEN ENDPOINT - DÉSACTIVÉ CAR DOUBLON AVEC L'ENDPOINT LIGNE 6339 (NOUVELLE VERSION AVEC keyRow/keyColumn)
/*
router.get('/nodes/:tableNodeId/table/lookup', async (req, res) => {
  const { tableNodeId } = req.params; // ✅ DÉPLACÉ AVANT LE TRY pour être accessible dans le catch
  try {
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);

    console.log(`[table/lookup] Début pour tableNodeId: ${tableNodeId}`);
    
    // 🔍 DIAGNOSTIC: Vérifier si Prisma est disponible
    if (!prisma) {
      console.error(`[table/lookup] ❌ ERREUR CRITIQUE: prisma est undefined !`);
      console.error(`[table/lookup] Type de prisma:`, typeof prisma);
      return res.status(500).json({
        error: 'Database connection not available',
        details: 'Prisma client is not initialized. Please restart the server.'
      });
    }
    
    console.log(`[table/lookup] ✅ Prisma client disponible, type:`, typeof prisma);

    // 1. Récupérer la configuration SELECT du champ pour savoir quelle table référencer
    const selectConfig = await prisma.treeBranchLeafSelectConfig.findUnique({
      where: { nodeId: tableNodeId },
      select: {
        tableReference: true,
        valueColumn: true,
        displayColumn: true,
      },
    });

    if (!selectConfig || !selectConfig.tableReference) {
      console.log(`[table/lookup] 404 - Aucune configuration de table référencée pour le nœud ${tableNodeId}`);
      return res.status(404).json({ error: 'Configuration de la table de référence non trouvée.' });
    }

    const { tableReference } = selectConfig;
    const _valueColumn = selectConfig.valueColumn; // Pour info (non utilisé en mode dynamique)
    const _displayColumn = selectConfig.displayColumn; // Pour info (non utilisé en mode dynamique)

    // 2. Récupérer les données de la table référencée
    const tableData = await prisma.treeBranchLeafNodeTable.findFirst({
      where: { id: tableReference },
      select: {
        data: true,      // ✅ CORRECT: Données 2D du tableau
        columns: true,   // Noms des colonnes
        rows: true,      // Noms des lignes (pour info)
        nodeId: true,
      },
    });

      const parentNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: tableData.nodeId },
      select: { TreeBranchLeafTree: { select: { organizationId: true } } }
    });

    const nodeOrg = parentNode?.TreeBranchLeafTree?.organizationId;
    if (!isSuperAdmin && organizationId && nodeOrg && nodeOrg !== organizationId) {
      console.log(`[table/lookup] 403 - Accès non autorisé. Org user: ${organizationId}, Org node: ${nodeOrg}`);
      return res.status(403).json({ error: 'Accès non autorisé à cette ressource.' });
    }

    // 3. Extraire les colonnes et les données
    const _tableDataArray = Array.isArray(tableData.data) ? tableData.data : []; // Pour info (non utilisé en mode dynamique)
    const dataColumns = Array.isArray(tableData.columns) ? tableData.columns : [];
    const rowNames = Array.isArray(tableData.rows) ? tableData.rows : [];

    console.log(`[table/lookup] 🔍 DEBUG - Colonnes:`, dataColumns);
    console.log(`[table/lookup] 🔍 DEBUG - Noms des lignes:`, rowNames);

    // 🎯 Récupérer le mode et la configuration depuis le champ SELECT
    const selectFieldNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: tableNodeId },
      select: {
        table_instances: true,
        table_activeId: true,
      }
    });

    let isRowBased = false;
    let isColumnBased = false;
    let tableMode: 'columns' | 'matrix' = 'columns';
    let keyColumnFromLookup: string | undefined;
    
    if (selectFieldNode?.table_instances && typeof selectFieldNode.table_instances === 'object') {
      const instances = selectFieldNode.table_instances as Record<string, any>;
      const activeInstance = selectFieldNode.table_activeId ? instances[selectFieldNode.table_activeId] : null;
      
      if (activeInstance) {
        isRowBased = activeInstance.rowBased === true;
        isColumnBased = activeInstance.columnBased === true;
        tableMode = activeInstance.mode || 'columns';
        
        // 🎯 CRITIQUE: Lire keyColumn depuis l'instance active
        keyColumnFromLookup = activeInstance.keyColumn || activeInstance.valueColumn || activeInstance.displayColumn;
        
        console.log(`[table/lookup] 🔍 Configuration complète:`, {
          isRowBased,
          isColumnBased,
          tableMode,
          keyColumnFromLookup,
          activeId: selectFieldNode.table_activeId,
          activeInstance
        });
      }
    }

    // 4. Transformer selon le mode (rowBased ou columnBased)
    let options: Array<{ label: string; value: string }>;

    if (isRowBased) {
      // Mode LIGNE: Retourner les noms des lignes
      console.log(`[table/lookup] 🎯 Mode LIGNE activé - Génération des options depuis les lignes`);
      options = rowNames.map((rowName: string) => ({
        label: String(rowName),
        value: String(rowName)
      }));
    } else if (tableMode === 'columns' && keyColumnFromLookup) {
      // ✅ Mode COLONNE avec keyColumn: Retourner les VALEURS de la colonne choisie
      console.log(`[table/lookup] 🎯 Mode COLONNE activé - Génération des options depuis la colonne "${keyColumnFromLookup}"`);
      
      const columnIndex = dataColumns.indexOf(keyColumnFromLookup);
      if (columnIndex === -1) {
        console.warn(`[table/lookup] ⚠️ Colonne "${keyColumnFromLookup}" introuvable dans:`, dataColumns);
        options = [];
      } else {
        // Extraire les valeurs de la colonne
        const tableDataArray = Array.isArray(tableData.data) ? tableData.data : [];
        options = tableDataArray
          .map((row: unknown) => {
            if (!Array.isArray(row)) return null;
            const value = row[columnIndex];
            if (value === null || value === undefined || value === '') return null;
            return {
              label: String(value),
              value: String(value)
            };
          })
          .filter((opt): opt is { label: string; value: string } => opt !== null);
        
        console.log(`[table/lookup] ✅ ${options.length} valeurs extraites de la colonne "${keyColumnFromLookup}":`, options);
      }
    } else {
      // Mode COLONNE par défaut (ancien comportement): Retourner les noms des colonnes
      console.log(`[table/lookup] 🎯 Mode COLONNE (legacy) activé - Génération des options depuis les noms de colonnes`);
      options = dataColumns.map((columnName: string) => ({
        label: String(columnName),
        value: String(columnName)
      }));
    }

    console.log(`[table/lookup] Succès - ${options.length} options ${isRowBased ? 'LIGNES' : 'COLONNES'} générées pour ${tableNodeId}`);
    res.json({ options });

  } catch (error) {
    console.error(`[API] 💥 Critical error in /table/lookup for tableNodeId: ${tableNodeId}`, error);
    if (error instanceof Error) {
        console.error(`[API] Error Name: ${error.name}`);
        console.error(`[API] Error Message: ${error.message}`);
        console.error(`[API] Error Stack: ${error.stack}`);
    }
    res.status(500).json({
        message: 'Internal Server Error',
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error)
    });
  }
});
*/
// ⚠️ FIN DE L'ANCIEN ENDPOINT /table/lookup - Utiliser maintenant l'endpoint moderne ligne ~6339
// =============================================================================
// �🔢 NODE DATA (VARIABLE EXPOSÉE) - Donnée d'un nœud
// =============================================================================
// GET /api/treebranchleaf/trees/:treeId/nodes/:nodeId/data
// Récupère la configuration "donnée" (variable exposée) d'un nœud
router.get('/trees/:treeId/nodes/:nodeId/data', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, treeId, nodeId, organizationId, tree, node, _b, variable, ownerNodeId, proxiedFromNodeId, sourceType, sourceRef, fixedValue, selectedNodeId, exposedKey, usedVariableId, error_20;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 4, , 5]);
                _a = req.params, treeId = _a.treeId, nodeId = _a.nodeId;
                organizationId = req.user.organizationId;
                console.log('??? [TBL NEW ROUTE][GET /data] treeId=%s nodeId=%s', treeId, nodeId);
                return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({
                        where: organizationId ? { id: treeId, organizationId: organizationId } : { id: treeId }
                    })];
            case 1:
                tree = _c.sent();
                if (!tree) {
                    return [2 /*return*/, res.status(404).json({ error: 'Arbre non trouv�' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({
                        where: { id: nodeId, treeId: treeId },
                        select: { id: true, data_activeId: true, linkedVariableIds: true },
                    })];
            case 2:
                node = _c.sent();
                if (!node) {
                    return [2 /*return*/, res.status(404).json({ error: 'Noeud non trouve' })];
                }
                return [4 /*yield*/, resolveNodeVariable(nodeId, node.linkedVariableIds)];
            case 3:
                _b = _c.sent(), variable = _b.variable, ownerNodeId = _b.ownerNodeId, proxiedFromNodeId = _b.proxiedFromNodeId;
                if (variable) {
                    sourceType = variable.sourceType, sourceRef = variable.sourceRef, fixedValue = variable.fixedValue, selectedNodeId = variable.selectedNodeId, exposedKey = variable.exposedKey;
                    console.log('?? [TBL NEW ROUTE][GET /data] payload keys=%s hasSource=%s ref=%s fixed=%s selNode=%s (owner=%s proxied=%s)', Object.keys(variable).join(','), !!sourceType, sourceRef, fixedValue, selectedNodeId, ownerNodeId, proxiedFromNodeId);
                    if (!sourceType && !sourceRef) {
                        console.log('?? [TBL NEW ROUTE][GET /data] Aucune sourceType/sourceRef retournee pour nodeId=%s (exposedKey=%s)', nodeId, exposedKey);
                    }
                }
                else {
                    console.log('?? [TBL NEW ROUTE][GET /data] variable inexistante nodeId=%s -> {} (owner=%s proxied=%s)', nodeId, ownerNodeId, proxiedFromNodeId);
                }
                usedVariableId = node.data_activeId || (variable === null || variable === void 0 ? void 0 : variable.id) || null;
                if (variable) {
                    return [2 /*return*/, res.json(__assign(__assign({}, variable), { usedVariableId: usedVariableId, ownerNodeId: ownerNodeId, proxiedFromNodeId: proxiedFromNodeId }))];
                }
                return [2 /*return*/, res.json({ usedVariableId: usedVariableId, ownerNodeId: ownerNodeId, proxiedFromNodeId: proxiedFromNodeId })];
            case 4:
                error_20 = _c.sent();
                console.error('[TreeBranchLeaf API] Error fetching node data:', error_20);
                res.status(500).json({ error: 'Erreur lors de la recuperation de la donnee du noeud' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// ⚖️ NODE CONDITIONS - Conditions IF/ELSE d'un nœud
// =============================================================================
// GET /api/treebranchleaf/nodes/:nodeId/conditions
// Récupère la configuration des conditions d'un nœud (JSON libre pour l'instant)
// (Moved export to bottom so routes below are mounted)
// PUT /api/treebranchleaf/trees/:treeId/nodes/:nodeId/data
// Crée/met à jour la configuration "donnée" (variable exposée) d'un nœud
router.put('/trees/:treeId/nodes/:nodeId/data', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, treeId, nodeId_3, organizationId, _b, exposedKey, displayFormat_1, unit_1, precision_1, visibleToUser_1, isReadonly_1, defaultValue_1, metadata_1, 
    // 🎯 NOUVEAUX CHAMPS pour sourceType/sourceRef/fixedValue
    sourceType_1, sourceRef_1, fixedValue_1, selectedNodeId_1, tree, node, safeExposedKey_1, displayName_1, _c, previousVariable_1, ownerNodeId, targetNodeId_1, proxiedTargetNodeId, updated, ownerIdForResponse, proxiedNodeIdForResponse, nodeAfter, usedVariableId, _d, error_21, err;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 9, , 10]);
                _a = req.params, treeId = _a.treeId, nodeId_3 = _a.nodeId;
                organizationId = req.user.organizationId;
                _b = req.body || {}, exposedKey = _b.exposedKey, displayFormat_1 = _b.displayFormat, unit_1 = _b.unit, precision_1 = _b.precision, visibleToUser_1 = _b.visibleToUser, isReadonly_1 = _b.isReadonly, defaultValue_1 = _b.defaultValue, metadata_1 = _b.metadata, sourceType_1 = _b.sourceType, sourceRef_1 = _b.sourceRef, fixedValue_1 = _b.fixedValue, selectedNodeId_1 = _b.selectedNodeId;
                console.log('🛰️ [TBL NEW ROUTE][PUT /data] nodeId=%s body=%o', nodeId_3, { exposedKey: exposedKey, sourceType: sourceType_1, sourceRef: sourceRef_1, fixedValue: fixedValue_1, selectedNodeId: selectedNodeId_1 });
                return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({
                        where: organizationId ? { id: treeId, organizationId: organizationId } : { id: treeId }
                    })];
            case 1:
                tree = _e.sent();
                if (!tree) {
                    return [2 /*return*/, res.status(404).json({ error: 'Arbre non trouvé' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({
                        where: {
                            id: nodeId_3,
                            treeId: treeId,
                        },
                        select: { id: true, label: true, linkedVariableIds: true },
                    })];
            case 2:
                node = _e.sent();
                if (!node) {
                    return [2 /*return*/, res.status(404).json({ error: 'Nœud non trouvé' })];
                }
                safeExposedKey_1 = typeof exposedKey === 'string' && exposedKey.trim() ? exposedKey.trim() : null;
                displayName_1 = safeExposedKey_1 || node.label || "var_".concat(String(nodeId_3).slice(0, 4));
                return [4 /*yield*/, resolveNodeVariable(nodeId_3, node.linkedVariableIds)];
            case 3:
                _c = _e.sent(), previousVariable_1 = _c.variable, ownerNodeId = _c.ownerNodeId;
                targetNodeId_1 = ownerNodeId !== null && ownerNodeId !== void 0 ? ownerNodeId : nodeId_3;
                proxiedTargetNodeId = nodeId_3 === targetNodeId_1 ? null : nodeId_3;
                if (proxiedTargetNodeId) {
                    console.log('?? [TBL NEW ROUTE][PUT /data] node %s proxied vers variable du noeud %s', nodeId_3, targetNodeId_1);
                }
                return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var variable, nodeUpdateData, tableId, instanceConfig, nodesToUpdate, _i, nodesToUpdate_1, target, e_12, e_13, getReferencedIds_1, oldIds_1, newIds_1, idsToAdd, idsToRemove, _a, idsToAdd_1, refId, _b, idsToRemove_1, refId, getNodeReferencedVariableIds, oldVariableRefs_1, newVariableRefs_1, variableIdsToAdd, variableIdsToRemove, nodeData, _c, _d, tableId, table, selectConfigsUsingTable, _e, selectConfigsUsingTable_1, config, selectNode, currentLinkedIds, updatedLinkedIds, e_14, e_15;
                        var _f, _g;
                        var _h, _j, _k, _l, _o, _p, _q, _r, _s, _t;
                        return __generator(this, function (_u) {
                            switch (_u.label) {
                                case 0: return [4 /*yield*/, tx.treeBranchLeafNodeVariable.upsert({
                                        where: { nodeId: targetNodeId_1 },
                                        update: {
                                            exposedKey: safeExposedKey_1 || undefined,
                                            displayName: displayName_1,
                                            displayFormat: typeof displayFormat_1 === 'string' ? displayFormat_1 : undefined,
                                            unit: typeof unit_1 === 'string' ? unit_1 : undefined,
                                            precision: typeof precision_1 === 'number' ? precision_1 : undefined,
                                            visibleToUser: typeof visibleToUser_1 === 'boolean' ? visibleToUser_1 : undefined,
                                            isReadonly: typeof isReadonly_1 === 'boolean' ? isReadonly_1 : undefined,
                                            defaultValue: typeof defaultValue_1 === 'string' ? defaultValue_1 : undefined,
                                            metadata: metadata_1 && typeof metadata_1 === 'object' ? metadata_1 : undefined,
                                            // 🎯 NOUVEAUX CHAMPS source
                                            sourceType: typeof sourceType_1 === 'string' ? sourceType_1 : undefined,
                                            sourceRef: typeof sourceRef_1 === 'string' ? sourceRef_1 : undefined,
                                            fixedValue: typeof fixedValue_1 === 'string' ? fixedValue_1 : undefined,
                                            selectedNodeId: typeof selectedNodeId_1 === 'string' ? selectedNodeId_1 : undefined,
                                            updatedAt: new Date(),
                                        },
                                        create: {
                                            id: (0, crypto_1.randomUUID)(),
                                            nodeId: targetNodeId_1,
                                            exposedKey: safeExposedKey_1 || "var_".concat(String(nodeId_3).slice(0, 4)),
                                            displayName: displayName_1,
                                            displayFormat: typeof displayFormat_1 === 'string' ? displayFormat_1 : 'number',
                                            unit: typeof unit_1 === 'string' ? unit_1 : null,
                                            precision: typeof precision_1 === 'number' ? precision_1 : 2,
                                            visibleToUser: typeof visibleToUser_1 === 'boolean' ? visibleToUser_1 : true,
                                            isReadonly: typeof isReadonly_1 === 'boolean' ? isReadonly_1 : false,
                                            defaultValue: typeof defaultValue_1 === 'string' ? defaultValue_1 : null,
                                            metadata: metadata_1 && typeof metadata_1 === 'object' ? metadata_1 : {},
                                            // 🎯 NOUVEAUX CHAMPS source
                                            sourceType: typeof sourceType_1 === 'string' ? sourceType_1 : 'fixed',
                                            sourceRef: typeof sourceRef_1 === 'string' ? sourceRef_1 : null,
                                            fixedValue: typeof fixedValue_1 === 'string' ? fixedValue_1 : null,
                                            selectedNodeId: typeof selectedNodeId_1 === 'string' ? selectedNodeId_1 : null,
                                            updatedAt: new Date(),
                                        },
                                        select: {
                                            id: true,
                                            exposedKey: true,
                                            displayFormat: true,
                                            unit: true,
                                            precision: true,
                                            visibleToUser: true,
                                            isReadonly: true,
                                            defaultValue: true,
                                            metadata: true,
                                            // 🎯 NOUVEAUX CHAMPS source
                                            sourceType: true,
                                            sourceRef: true,
                                            fixedValue: true,
                                            selectedNodeId: true,
                                        },
                                    })];
                                case 1:
                                    variable = _u.sent();
                                    nodeUpdateData = {
                                        hasData: true,
                                        updatedAt: new Date(),
                                        // ?? FIX: Toujours synchroniser unit et precision de la variable vers le n�ud
                                        data_unit: (_h = variable.unit) !== null && _h !== void 0 ? _h : null,
                                        data_precision: (_j = variable.precision) !== null && _j !== void 0 ? _j : null,
                                        data_displayFormat: (_k = variable.displayFormat) !== null && _k !== void 0 ? _k : null,
                                        data_exposedKey: (_l = variable.exposedKey) !== null && _l !== void 0 ? _l : null,
                                        data_visibleToUser: (_o = variable.visibleToUser) !== null && _o !== void 0 ? _o : true,
                                        data_activeId: variable.id,
                                    };
                                    if (variable.sourceRef && variable.sourceRef.startsWith('@table.')) {
                                        tableId = variable.sourceRef.replace('@table.', '');
                                        console.log("[TBL] ?? Configuration lookup pour table ".concat(tableId));
                                        instanceConfig = {
                                            sourceType: variable.sourceType || 'tree',
                                            sourceRef: variable.sourceRef,
                                            displayFormat: variable.displayFormat || null,
                                            unit: (_p = variable.unit) !== null && _p !== void 0 ? _p : null,
                                            precision: (_q = variable.precision) !== null && _q !== void 0 ? _q : null,
                                            visibleToUser: (_r = variable.visibleToUser) !== null && _r !== void 0 ? _r : true,
                                            exposedKey: variable.exposedKey || null,
                                            metadata: {
                                                sourceType: variable.sourceType || 'tree',
                                                sourceRef: variable.sourceRef,
                                                fixedValue: (_s = variable.fixedValue) !== null && _s !== void 0 ? _s : null,
                                                selectedNodeId: (_t = variable.selectedNodeId) !== null && _t !== void 0 ? _t : null,
                                                updatedAt: new Date().toISOString()
                                            }
                                        };
                                        nodeUpdateData.data_activeId = tableId;
                                        nodeUpdateData.data_instances = (_f = {}, _f[tableId] = instanceConfig, _f);
                                        nodeUpdateData.table_activeId = tableId;
                                        nodeUpdateData.table_instances = (_g = {}, _g[tableId] = instanceConfig, _g);
                                        nodeUpdateData.hasTable = true;
                                        console.log("[TBL] ? data_activeId/table_activeId=\"".concat(tableId, "\" configur\uFFFDs"));
                                    }
                                    nodesToUpdate = new Set([targetNodeId_1]);
                                    if (nodeId_3 !== targetNodeId_1) {
                                        nodesToUpdate.add(nodeId_3);
                                    }
                                    _i = 0, nodesToUpdate_1 = nodesToUpdate;
                                    _u.label = 2;
                                case 2:
                                    if (!(_i < nodesToUpdate_1.length)) return [3 /*break*/, 5];
                                    target = nodesToUpdate_1[_i];
                                    return [4 /*yield*/, tx.treeBranchLeafNode.update({
                                            where: { id: target },
                                            data: nodeUpdateData
                                        })];
                                case 3:
                                    _u.sent();
                                    _u.label = 4;
                                case 4:
                                    _i++;
                                    return [3 /*break*/, 2];
                                case 5:
                                    _u.trys.push([5, 9, , 10]);
                                    return [4 /*yield*/, addToNodeLinkedField(tx, targetNodeId_1, 'linkedVariableIds', [variable.id])];
                                case 6:
                                    _u.sent();
                                    if (!(nodeId_3 !== targetNodeId_1)) return [3 /*break*/, 8];
                                    return [4 /*yield*/, addToNodeLinkedField(tx, nodeId_3, 'linkedVariableIds', [variable.id])];
                                case 7:
                                    _u.sent();
                                    _u.label = 8;
                                case 8: return [3 /*break*/, 10];
                                case 9:
                                    e_12 = _u.sent();
                                    console.warn('[TreeBranchLeaf API] Warning updating owner linkedVariableIds:', e_12.message);
                                    return [3 /*break*/, 10];
                                case 10:
                                    if (!variable.sourceRef) return [3 /*break*/, 14];
                                    _u.label = 11;
                                case 11:
                                    _u.trys.push([11, 13, , 14]);
                                    return [4 /*yield*/, (0, universal_linking_system_js_1.linkVariableToAllCapacityNodes)(tx, variable.id, variable.sourceRef)];
                                case 12:
                                    _u.sent();
                                    return [3 /*break*/, 14];
                                case 13:
                                    e_13 = _u.sent();
                                    console.warn("?? [TreeBranchLeaf API] \uFFFDchec liaison automatique linkedVariableIds pour ".concat(variable.id, ":"), e_13.message);
                                    return [3 /*break*/, 14];
                                case 14:
                                    _u.trys.push([14, 44, , 45]);
                                    getReferencedIds_1 = function (varData) { return __awaiter(void 0, void 0, void 0, function () {
                                        var ids, sourceRef, metadata, parsedRef, formula, condition;
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0:
                                                    ids = new Set();
                                                    if (!varData)
                                                        return [2 /*return*/, ids];
                                                    sourceRef = varData.sourceRef, metadata = varData.metadata;
                                                    // 1. Référence directe dans metadata.selectedNodeId
                                                    if (metadata === null || metadata === void 0 ? void 0 : metadata.selectedNodeId) {
                                                        ids.add(normalizeRefId(metadata.selectedNodeId));
                                                    }
                                                    parsedRef = parseSourceRef(sourceRef);
                                                    if (!parsedRef) return [3 /*break*/, 6];
                                                    if (!(parsedRef.type === 'formula')) return [3 /*break*/, 2];
                                                    return [4 /*yield*/, tx.treeBranchLeafNodeFormula.findUnique({ where: { id: parsedRef.id }, select: { tokens: true } })];
                                                case 1:
                                                    formula = _a.sent();
                                                    if (formula) {
                                                        extractNodeIdsFromTokens(formula.tokens).forEach(function (id) { return ids.add(normalizeRefId(id)); });
                                                    }
                                                    return [3 /*break*/, 5];
                                                case 2:
                                                    if (!(parsedRef.type === 'condition')) return [3 /*break*/, 4];
                                                    return [4 /*yield*/, tx.treeBranchLeafNodeCondition.findUnique({ where: { id: parsedRef.id }, select: { conditionSet: true } })];
                                                case 3:
                                                    condition = _a.sent();
                                                    if (condition) {
                                                        extractNodeIdsFromConditionSet(condition.conditionSet).forEach(function (id) { return ids.add(normalizeRefId(id)); });
                                                    }
                                                    return [3 /*break*/, 5];
                                                case 4:
                                                    // Gérer les cas comme "table:id" ou "node:id"
                                                    ids.add(normalizeRefId(parsedRef.id));
                                                    _a.label = 5;
                                                case 5: return [3 /*break*/, 7];
                                                case 6:
                                                    if (sourceRef) {
                                                        // Si ce n'est pas un format "type:id", ça peut être un nodeId direct
                                                        ids.add(normalizeRefId(sourceRef));
                                                    }
                                                    _a.label = 7;
                                                case 7: return [2 /*return*/, ids];
                                            }
                                        });
                                    }); };
                                    return [4 /*yield*/, getReferencedIds_1(previousVariable_1)];
                                case 15:
                                    oldIds_1 = _u.sent();
                                    return [4 /*yield*/, getReferencedIds_1(variable)];
                                case 16:
                                    newIds_1 = _u.sent();
                                    idsToAdd = __spreadArray([], newIds_1, true).filter(function (id) { return !oldIds_1.has(id); });
                                    idsToRemove = __spreadArray([], oldIds_1, true).filter(function (id) { return !newIds_1.has(id); });
                                    if (!(idsToAdd.length > 0)) return [3 /*break*/, 20];
                                    console.log("[TBL] Adding variable ref ".concat(variable.id, " to ").concat(idsToAdd.length, " nodes."));
                                    _a = 0, idsToAdd_1 = idsToAdd;
                                    _u.label = 17;
                                case 17:
                                    if (!(_a < idsToAdd_1.length)) return [3 /*break*/, 20];
                                    refId = idsToAdd_1[_a];
                                    return [4 /*yield*/, addToNodeLinkedField(tx, refId, 'linkedVariableIds', [variable.id])];
                                case 18:
                                    _u.sent();
                                    _u.label = 19;
                                case 19:
                                    _a++;
                                    return [3 /*break*/, 17];
                                case 20:
                                    if (!(idsToRemove.length > 0)) return [3 /*break*/, 24];
                                    console.log("[TBL] Removing variable ref ".concat(variable.id, " from ").concat(idsToRemove.length, " nodes."));
                                    _b = 0, idsToRemove_1 = idsToRemove;
                                    _u.label = 21;
                                case 21:
                                    if (!(_b < idsToRemove_1.length)) return [3 /*break*/, 24];
                                    refId = idsToRemove_1[_b];
                                    return [4 /*yield*/, removeFromNodeLinkedField(tx, refId, 'linkedVariableIds', [variable.id])];
                                case 22:
                                    _u.sent();
                                    _u.label = 23;
                                case 23:
                                    _b++;
                                    return [3 /*break*/, 21];
                                case 24:
                                    getNodeReferencedVariableIds = function (varData) { return __awaiter(void 0, void 0, void 0, function () {
                                        var variableIds, referencedNodeIds, _i, referencedNodeIds_1, refNodeId, refVariable;
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0:
                                                    variableIds = new Set();
                                                    return [4 /*yield*/, getReferencedIds_1(varData)];
                                                case 1:
                                                    referencedNodeIds = _a.sent();
                                                    _i = 0, referencedNodeIds_1 = referencedNodeIds;
                                                    _a.label = 2;
                                                case 2:
                                                    if (!(_i < referencedNodeIds_1.length)) return [3 /*break*/, 5];
                                                    refNodeId = referencedNodeIds_1[_i];
                                                    return [4 /*yield*/, tx.treeBranchLeafNodeVariable.findUnique({
                                                            where: { nodeId: refNodeId },
                                                            select: { id: true }
                                                        })];
                                                case 3:
                                                    refVariable = _a.sent();
                                                    if (refVariable) {
                                                        variableIds.add(refVariable.id);
                                                    }
                                                    _a.label = 4;
                                                case 4:
                                                    _i++;
                                                    return [3 /*break*/, 2];
                                                case 5: return [2 /*return*/, variableIds];
                                            }
                                        });
                                    }); };
                                    return [4 /*yield*/, getNodeReferencedVariableIds(previousVariable_1)];
                                case 25:
                                    oldVariableRefs_1 = _u.sent();
                                    return [4 /*yield*/, getNodeReferencedVariableIds(variable)];
                                case 26:
                                    newVariableRefs_1 = _u.sent();
                                    variableIdsToAdd = __spreadArray([], newVariableRefs_1, true).filter(function (id) { return !oldVariableRefs_1.has(id); });
                                    variableIdsToRemove = __spreadArray([], oldVariableRefs_1, true).filter(function (id) { return !newVariableRefs_1.has(id); });
                                    if (!(variableIdsToAdd.length > 0)) return [3 /*break*/, 28];
                                    console.log("[TBL] Adding ".concat(variableIdsToAdd.length, " variable references to node ").concat(targetNodeId_1, "."));
                                    return [4 /*yield*/, addToNodeLinkedField(tx, targetNodeId_1, 'linkedVariableIds', variableIdsToAdd)];
                                case 27:
                                    _u.sent();
                                    _u.label = 28;
                                case 28:
                                    if (!(variableIdsToRemove.length > 0)) return [3 /*break*/, 30];
                                    console.log("[TBL] Removing ".concat(variableIdsToRemove.length, " variable references from node ").concat(targetNodeId_1, "."));
                                    return [4 /*yield*/, removeFromNodeLinkedField(tx, targetNodeId_1, 'linkedVariableIds', variableIdsToRemove)];
                                case 29:
                                    _u.sent();
                                    _u.label = 30;
                                case 30:
                                    _u.trys.push([30, 42, , 43]);
                                    return [4 /*yield*/, tx.treeBranchLeafNode.findUnique({
                                            where: { id: targetNodeId_1 },
                                            select: { linkedTableIds: true }
                                        })];
                                case 31:
                                    nodeData = _u.sent();
                                    if (!(nodeData && nodeData.linkedTableIds && nodeData.linkedTableIds.length > 0)) return [3 /*break*/, 41];
                                    console.log("[TBL] ?? Traitement des lookups pour ".concat(nodeData.linkedTableIds.length, " table(s)..."));
                                    _c = 0, _d = nodeData.linkedTableIds;
                                    _u.label = 32;
                                case 32:
                                    if (!(_c < _d.length)) return [3 /*break*/, 41];
                                    tableId = _d[_c];
                                    return [4 /*yield*/, tx.treeBranchLeafNodeTable.findUnique({
                                            where: { id: tableId },
                                            select: {
                                                id: true,
                                                name: true,
                                                nodeId: true,
                                                lookupSelectColumn: true,
                                                lookupDisplayColumns: true
                                            }
                                        })];
                                case 33:
                                    table = _u.sent();
                                    if (!table) return [3 /*break*/, 40];
                                    console.log("[TBL] ?? Table trouv\uFFFDe: \"".concat(table.name, "\" (ID: ").concat(table.id, ")"));
                                    return [4 /*yield*/, tx.treeBranchLeafSelectConfig.findMany({
                                            where: { tableReference: table.id },
                                            select: { nodeId: true }
                                        })];
                                case 34:
                                    selectConfigsUsingTable = _u.sent();
                                    if (!(selectConfigsUsingTable.length > 0)) return [3 /*break*/, 40];
                                    console.log("[TBL] ? ".concat(selectConfigsUsingTable.length, " champ(s) Select/Cascader utilise(nt) cette table"));
                                    _e = 0, selectConfigsUsingTable_1 = selectConfigsUsingTable;
                                    _u.label = 35;
                                case 35:
                                    if (!(_e < selectConfigsUsingTable_1.length)) return [3 /*break*/, 40];
                                    config = selectConfigsUsingTable_1[_e];
                                    return [4 /*yield*/, tx.treeBranchLeafNode.findUnique({
                                            where: { id: config.nodeId },
                                            select: {
                                                id: true,
                                                label: true,
                                                linkedVariableIds: true
                                            }
                                        })];
                                case 36:
                                    selectNode = _u.sent();
                                    if (!selectNode) return [3 /*break*/, 39];
                                    currentLinkedIds = selectNode.linkedVariableIds || [];
                                    if (!!currentLinkedIds.includes(variable.id)) return [3 /*break*/, 38];
                                    updatedLinkedIds = __spreadArray(__spreadArray([], currentLinkedIds, true), [variable.id], false);
                                    return [4 /*yield*/, tx.treeBranchLeafNode.update({
                                            where: { id: selectNode.id },
                                            data: {
                                                linkedVariableIds: updatedLinkedIds,
                                                updatedAt: new Date()
                                            }
                                        })];
                                case 37:
                                    _u.sent();
                                    console.log("[TBL] ? linkedVariableIds mis \uFFFD jour pour \"".concat(selectNode.label, "\" (").concat(selectNode.id, ")"));
                                    return [3 /*break*/, 39];
                                case 38:
                                    console.log("[TBL] ?? linkedVariableIds d\uFFFDj\uFFFD \uFFFD jour pour \"".concat(selectNode.label, "\""));
                                    _u.label = 39;
                                case 39:
                                    _e++;
                                    return [3 /*break*/, 35];
                                case 40:
                                    _c++;
                                    return [3 /*break*/, 32];
                                case 41: return [3 /*break*/, 43];
                                case 42:
                                    e_14 = _u.sent();
                                    console.warn('[TreeBranchLeaf API] Warning updating lookup linkedVariableIds:', e_14.message);
                                    return [3 /*break*/, 43];
                                case 43: return [3 /*break*/, 45];
                                case 44:
                                    e_15 = _u.sent();
                                    console.warn('[TreeBranchLeaf API] Warning updating inverse linkedVariableIds:', e_15.message);
                                    return [3 /*break*/, 45];
                                case 45: return [2 /*return*/, variable];
                            }
                        });
                    }); })];
            case 4:
                updated = _e.sent();
                ownerIdForResponse = targetNodeId_1;
                proxiedNodeIdForResponse = proxiedTargetNodeId;
                _e.label = 5;
            case 5:
                _e.trys.push([5, 7, , 8]);
                return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                        where: { id: nodeId_3 },
                        select: { data_activeId: true }
                    })];
            case 6:
                nodeAfter = _e.sent();
                usedVariableId = (nodeAfter === null || nodeAfter === void 0 ? void 0 : nodeAfter.data_activeId) || updated.id || null;
                return [2 /*return*/, res.json(__assign(__assign({}, updated), { usedVariableId: usedVariableId, ownerNodeId: ownerIdForResponse, proxiedFromNodeId: proxiedNodeIdForResponse }))];
            case 7:
                _d = _e.sent();
                return [2 /*return*/, res.json(__assign(__assign({}, updated), { ownerNodeId: ownerIdForResponse, proxiedFromNodeId: proxiedNodeIdForResponse }))];
            case 8: return [3 /*break*/, 10];
            case 9:
                error_21 = _e.sent();
                err = error_21;
                if (err && err.code === 'P2002') {
                    return [2 /*return*/, res.status(409).json({ error: 'La variable exposée (exposedKey) existe déjà' })];
                }
                console.error('[TreeBranchLeaf API] Error updating node data:', error_21);
                res.status(500).json({ error: 'Erreur lors de la mise à jour de la donnée du nœud' });
                return [3 /*break*/, 10];
            case 10: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// 🗑️ DELETE VARIABLE - Suppression d'une variable avec cascade
// =============================================================================
// DELETE /api/treebranchleaf/trees/:treeId/nodes/:nodeId/data
// Supprime une variable ET la capacité (formule/condition/table) qu'elle référence
router.delete('/trees/:treeId/nodes/:nodeId/data', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, treeId, nodeId, organizationId, tree, node, _b, variable_1, ownerNodeId, proxiedFromNodeId, nodesToDisable, dependentNodes, _i, dependentNodes_1, nodeToClean, updatedLinkedIds, e_16, error_22;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 14, , 15]);
                _a = req.params, treeId = _a.treeId, nodeId = _a.nodeId;
                organizationId = req.user.organizationId;
                console.log("\uD83D\uDDD1\uFE0F [DELETE Variable] D\u00E9but suppression pour nodeId=".concat(nodeId));
                return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({
                        where: organizationId ? { id: treeId, organizationId: organizationId } : { id: treeId }
                    })];
            case 1:
                tree = _c.sent();
                if (!tree) {
                    return [2 /*return*/, res.status(404).json({ error: 'Arbre non trouvé' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({
                        where: { id: nodeId, treeId: treeId },
                        select: { id: true, linkedVariableIds: true }
                    })];
            case 2:
                node = _c.sent();
                if (!node) {
                    return [2 /*return*/, res.status(404).json({ error: 'Nœud non trouvé' })];
                }
                return [4 /*yield*/, resolveNodeVariable(nodeId, node.linkedVariableIds)];
            case 3:
                _b = _c.sent(), variable_1 = _b.variable, ownerNodeId = _b.ownerNodeId, proxiedFromNodeId = _b.proxiedFromNodeId;
                if (!variable_1 || !ownerNodeId) {
                    return [2 /*return*/, res.status(404).json({ error: 'Variable non trouvée' })];
                }
                console.log("\uD83D\uDD0D [DELETE Variable] Variable trouv\u00E9e avec sourceRef: ".concat(variable_1.sourceRef));
                // ❌ PAS de suppression en cascade : on garde les capacités (formule/condition/table)
                // On supprime uniquement la variable, la capacité reste accessible directement
                console.log("\uD83D\uDD0D [DELETE Variable] Variable trouv\u00E9e avec sourceRef: ".concat(variable_1.sourceRef));
                console.log("\uD83D\uDCCC [DELETE Variable] La capacit\u00E9 r\u00E9f\u00E9renc\u00E9e sera conserv\u00E9e");
                // Supprimer la variable elle-même
                return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.delete({
                        where: { nodeId: ownerNodeId }
                    })];
            case 4:
                // Supprimer la variable elle-même
                _c.sent();
                nodesToDisable = Array.from(new Set([ownerNodeId, proxiedFromNodeId].filter(Boolean)));
                if (!(nodesToDisable.length > 0)) return [3 /*break*/, 6];
                return [4 /*yield*/, prisma.treeBranchLeafNode.updateMany({
                        where: { id: { in: nodesToDisable } },
                        data: { hasData: false, updatedAt: new Date() }
                    })];
            case 5:
                _c.sent();
                _c.label = 6;
            case 6:
                _c.trys.push([6, 12, , 13]);
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                        where: {
                            treeId: treeId,
                            linkedVariableIds: { has: variable_1.id }, // On cherche les nœuds qui ont l'ID de notre variable
                        },
                        select: { id: true, linkedVariableIds: true },
                    })];
            case 7:
                dependentNodes = _c.sent();
                console.log("\uD83E\uDDF9 [DELETE Variable] ".concat(dependentNodes.length, " n\u0153ud(s) d\u00E9pendant(s) trouv\u00E9(s) \u00E0 nettoyer."));
                _i = 0, dependentNodes_1 = dependentNodes;
                _c.label = 8;
            case 8:
                if (!(_i < dependentNodes_1.length)) return [3 /*break*/, 11];
                nodeToClean = dependentNodes_1[_i];
                updatedLinkedIds = nodeToClean.linkedVariableIds.filter(function (id) { return id !== variable_1.id; });
                return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                        where: { id: nodeToClean.id },
                        data: { linkedVariableIds: updatedLinkedIds },
                    })];
            case 9:
                _c.sent();
                console.log("\u2705 [DELETE Variable] Nettoyage de linkedVariableIds termin\u00E9 pour le n\u0153ud ".concat(nodeToClean.id));
                _c.label = 10;
            case 10:
                _i++;
                return [3 /*break*/, 8];
            case 11: return [3 /*break*/, 13];
            case 12:
                e_16 = _c.sent();
                console.warn('[DELETE Variable] Avertissement lors du nettoyage des linkedVariableIds:', e_16.message);
                return [3 /*break*/, 13];
            case 13:
                console.log("\u2705 [DELETE Variable] Variable ".concat(variable_1.id, " supprim\u00E9e avec succ\u00E8s (+ capacit\u00E9 associ\u00E9e si existante)"));
                return [2 /*return*/, res.json({ success: true, message: 'Variable supprimée avec succès' })];
            case 14:
                error_22 = _c.sent();
                console.error('❌ [DELETE Variable] Erreur lors de la suppression:', error_22);
                res.status(500).json({ error: 'Erreur lors de la suppression de la variable' });
                return [3 /*break*/, 15];
            case 15: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// ⚖️ NODE CONDITIONS - Conditions d'un nœud
// =============================================================================
// GET /api/treebranchleaf/nodes/:nodeId/conditions
// ANCIENNE ROUTE COMMENTÉE - Utilisait conditionConfig du nœud directement
// Maintenant nous utilisons la table TreeBranchLeafNodeCondition (voir ligne ~1554)
/*
router.get('/nodes/:nodeId/conditions', async (req, res) => {
  try {
    const { nodeId } = req.params;
  const { organizationId, isSuperAdmin } = req.user! as { organizationId?: string; isSuperAdmin?: boolean };

    // Charger le nœud et vérifier l'organisation via l'arbre
    const node = await prisma.treeBranchLeafNode.findFirst({
      where: { id: nodeId },
      select: {
        conditionConfig: true,
        TreeBranchLeafTree: { select: { organizationId: true } }
      }
    });

    if (!node) {
      return res.status(404).json({ error: 'Nœud non trouvé' });
    }

    const nodeOrg = node.TreeBranchLeafTree?.organizationId;
    const hasOrgCtx = typeof organizationId === 'string' && organizationId.length > 0;
    if (!isSuperAdmin && hasOrgCtx && nodeOrg && nodeOrg !== organizationId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    return res.json(node.conditionConfig || {});
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error fetching node conditions:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des conditions du nœud' });
  }
});
*/
// PUT /api/treebranchleaf/nodes/:nodeId/conditions
// Met à jour (ou crée) la configuration de conditions d'un nœud
router.put('/nodes/:nodeId/conditions', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, _a, organizationId, isSuperAdmin, payload, isObject, node, nodeOrg, hasOrgCtx, updated, error_23;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 3, , 4]);
                nodeId = req.params.nodeId;
                _a = req.user, organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                payload = (_b = req.body) !== null && _b !== void 0 ? _b : {};
                isObject = payload && typeof payload === 'object' && !Array.isArray(payload);
                if (!isObject) {
                    return [2 /*return*/, res.status(400).json({ error: 'Payload de conditions invalide' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({
                        where: { id: nodeId },
                        select: { id: true, TreeBranchLeafTree: { select: { organizationId: true } } }
                    })];
            case 1:
                node = _d.sent();
                if (!node) {
                    return [2 /*return*/, res.status(404).json({ error: 'Nœud non trouvé' })];
                }
                nodeOrg = (_c = node.TreeBranchLeafTree) === null || _c === void 0 ? void 0 : _c.organizationId;
                hasOrgCtx = typeof organizationId === 'string' && organizationId.length > 0;
                if (!isSuperAdmin && hasOrgCtx && nodeOrg && nodeOrg !== organizationId) {
                    return [2 /*return*/, res.status(403).json({ error: 'Accès refusé' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                        where: { id: nodeId },
                        data: {
                            conditionConfig: payload,
                            hasCondition: true,
                            updatedAt: new Date()
                        },
                        select: { conditionConfig: true, hasCondition: true }
                    })];
            case 2:
                updated = _d.sent();
                return [2 /*return*/, res.json(updated.conditionConfig || {})];
            case 3:
                error_23 = _d.sent();
                console.error('[TreeBranchLeaf API] Error updating node conditions:', error_23);
                res.status(500).json({ error: 'Erreur lors de la mise à jour des conditions du nœud' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// 🧮 NODE FORMULA - Formule d'un nœud
// =============================================================================
// GET /api/treebranchleaf/nodes/:nodeId/formula
// Récupère la configuration de formule d'un nœud (formulaConfig)
router.get('/nodes/:nodeId/formula', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, _a, organizationId, isSuperAdmin, node, nodeOrg, hasOrgCtx, error_24;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                nodeId = req.params.nodeId;
                _a = req.user, organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({
                        where: { id: nodeId },
                        select: {
                            formulaConfig: true,
                            TreeBranchLeafTree: { select: { organizationId: true } }
                        }
                    })];
            case 1:
                node = _c.sent();
                if (!node) {
                    return [2 /*return*/, res.status(404).json({ error: 'Nœud non trouvé' })];
                }
                nodeOrg = (_b = node.TreeBranchLeafTree) === null || _b === void 0 ? void 0 : _b.organizationId;
                hasOrgCtx = typeof organizationId === 'string' && organizationId.length > 0;
                if (!isSuperAdmin && hasOrgCtx && nodeOrg && nodeOrg !== organizationId) {
                    return [2 /*return*/, res.status(403).json({ error: 'Accès refusé' })];
                }
                return [2 /*return*/, res.json(node.formulaConfig || {})];
            case 2:
                error_24 = _c.sent();
                console.error('[TreeBranchLeaf API] Error fetching node formula:', error_24);
                res.status(500).json({ error: 'Erreur lors de la récupération de la formule du nœud' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// PUT /nodes/:nodeId/formula
// Met à jour (ou crée) la configuration de formule d'un nœud
router.put('/nodes/:nodeId/formula', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, _a, organizationId, isSuperAdmin, payload, isObject, node, nodeOrg, hasOrgCtx, updated, error_25;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 3, , 4]);
                nodeId = req.params.nodeId;
                _a = req.user, organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                payload = (_b = req.body) !== null && _b !== void 0 ? _b : {};
                isObject = payload && typeof payload === 'object' && !Array.isArray(payload);
                if (!isObject) {
                    return [2 /*return*/, res.status(400).json({ error: 'Payload de formule invalide' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({
                        where: { id: nodeId },
                        select: { id: true, TreeBranchLeafTree: { select: { organizationId: true } } }
                    })];
            case 1:
                node = _d.sent();
                if (!node) {
                    return [2 /*return*/, res.status(404).json({ error: 'Nœud non trouvé' })];
                }
                nodeOrg = (_c = node.TreeBranchLeafTree) === null || _c === void 0 ? void 0 : _c.organizationId;
                hasOrgCtx = typeof organizationId === 'string' && organizationId.length > 0;
                if (!isSuperAdmin && hasOrgCtx && nodeOrg && nodeOrg !== organizationId) {
                    return [2 /*return*/, res.status(403).json({ error: 'Accès refusé' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                        where: { id: nodeId },
                        data: {
                            formulaConfig: payload,
                            hasFormula: true,
                            updatedAt: new Date()
                        },
                        select: { formulaConfig: true, hasFormula: true }
                    })];
            case 2:
                updated = _d.sent();
                return [2 /*return*/, res.json(updated.formulaConfig || {})];
            case 3:
                error_25 = _d.sent();
                console.error('[TreeBranchLeaf API] Error updating node formula:', error_25);
                res.status(500).json({ error: 'Erreur lors de la mise à jour de la formule du nœud' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// 🧮 NODE FORMULAS - Formules spécifiques à un nœud (nouvelle table dédiée)
// =============================================================================
// GET /api/treebranchleaf/nodes/:nodeId/formulas
// Liste les formules spécifiques à un nœud
router.get('/nodes/:nodeId/formulas', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, _a, organizationId, isSuperAdmin, access, formulas, error_26;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                nodeId = req.params.nodeId;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                return [4 /*yield*/, ensureNodeOrgAccess(prisma, nodeId, { organizationId: organizationId, isSuperAdmin: isSuperAdmin })];
            case 1:
                access = _b.sent();
                if (!access.ok)
                    return [2 /*return*/, res.status(access.status).json({ error: access.error })];
                return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findMany({
                        where: { nodeId: nodeId },
                        orderBy: { createdAt: 'asc' }
                    })];
            case 2:
                formulas = _b.sent();
                console.log("[TreeBranchLeaf API] Formulas for node ".concat(nodeId, ":"), formulas.length);
                return [2 /*return*/, res.json({ formulas: formulas })];
            case 3:
                error_26 = _b.sent();
                console.error('[TreeBranchLeaf API] Error fetching node formulas:', error_26);
                res.status(500).json({ error: 'Erreur lors de la récupération des formules du nœud' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// POST /nodes/:nodeId/formulas
// Crée une nouvelle formule pour un nœud
router.post('/nodes/:nodeId/formulas', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, _a, organizationId, isSuperAdmin, _b, name_2, tokens, description, targetProperty, constraintMessage, access, uniqueName, counter, existingFormula, error_27, formula, refIds, _i, refIds_1, refId, e_17, error_28;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 18, , 19]);
                nodeId = req.params.nodeId;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                _b = req.body || {}, name_2 = _b.name, tokens = _b.tokens, description = _b.description, targetProperty = _b.targetProperty, constraintMessage = _b.constraintMessage;
                // Debug: log des infos d'authentification
                console.log('🔍 Formula creation auth debug:', {
                    nodeId: nodeId,
                    organizationId: organizationId,
                    isSuperAdmin: isSuperAdmin,
                    reqUser: req.user,
                    headers: req.headers['x-organization-id']
                });
                return [4 /*yield*/, ensureNodeOrgAccess(prisma, nodeId, { organizationId: organizationId, isSuperAdmin: isSuperAdmin })];
            case 1:
                access = _c.sent();
                if (!access.ok)
                    return [2 /*return*/, res.status(access.status).json({ error: access.error })];
                if (!name_2 || !Array.isArray(tokens)) {
                    return [2 /*return*/, res.status(400).json({ error: 'Name et tokens requis' })];
                }
                uniqueName = String(name_2);
                counter = 1;
                _c.label = 2;
            case 2:
                if (!true) return [3 /*break*/, 7];
                _c.label = 3;
            case 3:
                _c.trys.push([3, 5, , 6]);
                return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findFirst({
                        where: {
                            nodeId: nodeId,
                            name: uniqueName
                        }
                    })];
            case 4:
                existingFormula = _c.sent();
                if (!existingFormula) {
                    return [3 /*break*/, 7]; // Le nom est disponible
                }
                // Si le nom existe, ajouter un suffixe numérique
                uniqueName = "".concat(name_2, " (").concat(counter, ")");
                counter++;
                return [3 /*break*/, 6];
            case 5:
                error_27 = _c.sent();
                console.error('Erreur lors de la vérification du nom de formule:', error_27);
                return [3 /*break*/, 7];
            case 6: return [3 /*break*/, 2];
            case 7: return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.create({
                    data: {
                        id: (0, crypto_1.randomUUID)(),
                        nodeId: nodeId,
                        organizationId: organizationId || null,
                        name: uniqueName,
                        tokens: tokens,
                        description: description ? String(description) : null,
                        targetProperty: targetProperty ? String(targetProperty) : null, // 🆕 Propriété cible
                        constraintMessage: constraintMessage ? String(constraintMessage) : null, // 🆕 Message de contrainte
                        updatedAt: new Date()
                    }
                })];
            case 8:
                formula = _c.sent();
                // 🎯 ACTIVATION AUTOMATIQUE : Configurer hasFormula ET formula_activeId
                console.log("[TreeBranchLeaf API] Activation automatique de la formule cr\u00E9\u00E9e pour le n\u0153ud ".concat(nodeId));
                return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                        where: { id: nodeId },
                        data: {
                            hasFormula: true,
                            formula_activeId: formula.id // 🎯 NOUVEAU : Activer automatiquement la formule
                        }
                    })];
            case 9:
                _c.sent();
                _c.label = 10;
            case 10:
                _c.trys.push([10, 16, , 17]);
                return [4 /*yield*/, addToNodeLinkedField(prisma, nodeId, 'linkedFormulaIds', [formula.id])];
            case 11:
                _c.sent();
                refIds = Array.from(extractNodeIdsFromTokens(tokens));
                _i = 0, refIds_1 = refIds;
                _c.label = 12;
            case 12:
                if (!(_i < refIds_1.length)) return [3 /*break*/, 15];
                refId = refIds_1[_i];
                return [4 /*yield*/, addToNodeLinkedField(prisma, normalizeRefId(refId), 'linkedFormulaIds', [formula.id])];
            case 13:
                _c.sent();
                _c.label = 14;
            case 14:
                _i++;
                return [3 /*break*/, 12];
            case 15: return [3 /*break*/, 17];
            case 16:
                e_17 = _c.sent();
                console.warn('[TreeBranchLeaf API] Warning updating linkedFormulaIds after create:', e_17.message);
                return [3 /*break*/, 17];
            case 17:
                console.log("[TreeBranchLeaf API] Created formula for node ".concat(nodeId, ":"), formula.name);
                return [2 /*return*/, res.status(201).json(formula)];
            case 18:
                error_28 = _c.sent();
                console.error('[TreeBranchLeaf API] Error creating node formula:', error_28);
                res.status(500).json({ error: 'Erreur lors de la création de la formule' });
                return [3 /*break*/, 19];
            case 19: return [2 /*return*/];
        }
    });
}); });
// PUT /api/treebranchleaf/nodes/:nodeId/formulas/:formulaId
// Met à jour une formule spécifique
router.put('/nodes/:nodeId/formulas/:formulaId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, nodeId, formulaId, _b, organizationId, isSuperAdmin, _c, name_3, tokens, description, targetProperty, constraintMessage, access, existingFormula, updated, oldRefs, newRefs, oldSet_1, newSet_1, toAdd, toRemove, _i, toAdd_1, refId, _d, toRemove_1, refId, e_18, error_29;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 16, , 17]);
                _a = req.params, nodeId = _a.nodeId, formulaId = _a.formulaId;
                _b = getAuthCtx(req), organizationId = _b.organizationId, isSuperAdmin = _b.isSuperAdmin;
                _c = req.body || {}, name_3 = _c.name, tokens = _c.tokens, description = _c.description, targetProperty = _c.targetProperty, constraintMessage = _c.constraintMessage;
                return [4 /*yield*/, ensureNodeOrgAccess(prisma, nodeId, { organizationId: organizationId, isSuperAdmin: isSuperAdmin })];
            case 1:
                access = _e.sent();
                if (!access.ok)
                    return [2 /*return*/, res.status(access.status).json({ error: access.error })];
                return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findFirst({
                        where: { id: formulaId, nodeId: nodeId }
                    })];
            case 2:
                existingFormula = _e.sent();
                if (!existingFormula) {
                    return [2 /*return*/, res.status(404).json({ error: 'Formule non trouvée' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.update({
                        where: { id: formulaId },
                        data: {
                            name: name_3 ? String(name_3) : undefined,
                            tokens: Array.isArray(tokens) ? tokens : undefined,
                            description: description !== undefined ? (description ? String(description) : null) : undefined,
                            targetProperty: targetProperty !== undefined ? (targetProperty ? String(targetProperty) : null) : undefined, // 🆕 Propriété cible
                            constraintMessage: constraintMessage !== undefined ? (constraintMessage ? String(constraintMessage) : null) : undefined, // 🆕 Message de contrainte
                            updatedAt: new Date()
                        }
                    })];
            case 3:
                updated = _e.sent();
                console.log("[TreeBranchLeaf API] Updated formula ".concat(formulaId, " for node ").concat(nodeId));
                _e.label = 4;
            case 4:
                _e.trys.push([4, 14, , 15]);
                oldRefs = extractNodeIdsFromTokens(existingFormula.tokens);
                newRefs = extractNodeIdsFromTokens(Array.isArray(tokens) ? tokens : existingFormula.tokens);
                oldSet_1 = new Set(Array.from(oldRefs).map(normalizeRefId));
                newSet_1 = new Set(Array.from(newRefs).map(normalizeRefId));
                toAdd = Array.from(newSet_1).filter(function (id) { return !oldSet_1.has(id); });
                toRemove = Array.from(oldSet_1).filter(function (id) { return !newSet_1.has(id); });
                if (!toAdd.length) return [3 /*break*/, 8];
                _i = 0, toAdd_1 = toAdd;
                _e.label = 5;
            case 5:
                if (!(_i < toAdd_1.length)) return [3 /*break*/, 8];
                refId = toAdd_1[_i];
                return [4 /*yield*/, addToNodeLinkedField(prisma, refId, 'linkedFormulaIds', [formulaId])];
            case 6:
                _e.sent();
                _e.label = 7;
            case 7:
                _i++;
                return [3 /*break*/, 5];
            case 8:
                if (!toRemove.length) return [3 /*break*/, 12];
                _d = 0, toRemove_1 = toRemove;
                _e.label = 9;
            case 9:
                if (!(_d < toRemove_1.length)) return [3 /*break*/, 12];
                refId = toRemove_1[_d];
                return [4 /*yield*/, removeFromNodeLinkedField(prisma, refId, 'linkedFormulaIds', [formulaId])];
            case 10:
                _e.sent();
                _e.label = 11;
            case 11:
                _d++;
                return [3 /*break*/, 9];
            case 12: 
            // S'assurer que le nœud propriétaire contient bien la formule
            return [4 /*yield*/, addToNodeLinkedField(prisma, nodeId, 'linkedFormulaIds', [formulaId])];
            case 13:
                // S'assurer que le nœud propriétaire contient bien la formule
                _e.sent();
                return [3 /*break*/, 15];
            case 14:
                e_18 = _e.sent();
                console.warn('[TreeBranchLeaf API] Warning updating inverse linkedFormulaIds after update:', e_18.message);
                return [3 /*break*/, 15];
            case 15: return [2 /*return*/, res.json(updated)];
            case 16:
                error_29 = _e.sent();
                console.error('[TreeBranchLeaf API] Error updating node formula:', error_29);
                res.status(500).json({ error: 'Erreur lors de la mise à jour de la formule' });
                return [3 /*break*/, 17];
            case 17: return [2 /*return*/];
        }
    });
}); });
// DELETE /api/treebranchleaf/nodes/:nodeId/formulas/:formulaId
// Supprime une formule spécifique
router.delete('/nodes/:nodeId/formulas/:formulaId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, nodeId, formulaId, _b, organizationId, isSuperAdmin, access, existingFormula, variableWithFormula, e_19, refIds, _i, refIds_2, refId, e_20, remainingFormulas, error_30;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 19, , 20]);
                _a = req.params, nodeId = _a.nodeId, formulaId = _a.formulaId;
                _b = getAuthCtx(req), organizationId = _b.organizationId, isSuperAdmin = _b.isSuperAdmin;
                return [4 /*yield*/, ensureNodeOrgAccess(prisma, nodeId, { organizationId: organizationId, isSuperAdmin: isSuperAdmin })];
            case 1:
                access = _c.sent();
                if (!access.ok)
                    return [2 /*return*/, res.status(access.status).json({ error: access.error })];
                return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findFirst({
                        where: { id: formulaId, nodeId: nodeId }
                    })];
            case 2:
                existingFormula = _c.sent();
                if (!existingFormula) {
                    return [2 /*return*/, res.status(404).json({ error: 'Formule non trouvée' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.delete({
                        where: { id: formulaId }
                    })];
            case 3:
                _c.sent();
                console.log("[TreeBranchLeaf API] Deleted formula ".concat(formulaId, " for node ").concat(nodeId));
                _c.label = 4;
            case 4:
                _c.trys.push([4, 8, , 9]);
                return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findFirst({
                        where: {
                            nodeId: nodeId,
                            sourceRef: "node-formula:".concat(formulaId)
                        }
                    })];
            case 5:
                variableWithFormula = _c.sent();
                if (!variableWithFormula) return [3 /*break*/, 7];
                return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.delete({
                        where: { nodeId: nodeId }
                    })];
            case 6:
                _c.sent();
                console.log("\u2705 [TreeBranchLeaf API] Variable associ\u00E9e supprim\u00E9e pour formule ".concat(formulaId));
                _c.label = 7;
            case 7: return [3 /*break*/, 9];
            case 8:
                e_19 = _c.sent();
                console.warn('[TreeBranchLeaf API] Warning deleting associated variable:', e_19.message);
                return [3 /*break*/, 9];
            case 9:
                _c.trys.push([9, 15, , 16]);
                return [4 /*yield*/, removeFromNodeLinkedField(prisma, nodeId, 'linkedFormulaIds', [formulaId])];
            case 10:
                _c.sent();
                refIds = Array.from(extractNodeIdsFromTokens(existingFormula.tokens));
                _i = 0, refIds_2 = refIds;
                _c.label = 11;
            case 11:
                if (!(_i < refIds_2.length)) return [3 /*break*/, 14];
                refId = refIds_2[_i];
                return [4 /*yield*/, removeFromNodeLinkedField(prisma, normalizeRefId(refId), 'linkedFormulaIds', [formulaId])];
            case 12:
                _c.sent();
                _c.label = 13;
            case 13:
                _i++;
                return [3 /*break*/, 11];
            case 14: return [3 /*break*/, 16];
            case 15:
                e_20 = _c.sent();
                console.warn('[TreeBranchLeaf API] Warning cleaning linkedFormulaIds after delete:', e_20.message);
                return [3 /*break*/, 16];
            case 16: return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.count({ where: { nodeId: nodeId } })];
            case 17:
                remainingFormulas = _c.sent();
                return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                        where: { id: nodeId },
                        data: { hasFormula: remainingFormulas > 0 }
                    })];
            case 18:
                _c.sent();
                console.log("[TreeBranchLeaf API] Updated hasFormula to ".concat(remainingFormulas > 0, " for node ").concat(nodeId));
                return [2 /*return*/, res.json({ success: true, message: 'Formule supprimée avec succès' })];
            case 19:
                error_30 = _c.sent();
                console.error('[TreeBranchLeaf API] Error deleting node formula:', error_30);
                res.status(500).json({ error: 'Erreur lors de la suppression de la formule' });
                return [3 /*break*/, 20];
            case 20: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// 📚 REUSABLE FORMULAS - Formules réutilisables (persistance Prisma)
// =============================================================================
// GET /api/treebranchleaf/reusables/formulas
// Liste TOUTES les formules de TreeBranchLeafNodeFormula (toutes sont réutilisables !)
router.get('/reusables/formulas', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, organizationId, isSuperAdmin, hasOrg, whereFilter, allFormulas, items, error_31;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                hasOrg = typeof organizationId === 'string' && organizationId.length > 0;
                whereFilter = isSuperAdmin
                    ? {}
                    : {
                        OR: __spreadArray([
                            { organizationId: null }
                        ], (hasOrg ? [{ organizationId: organizationId }] : []), true)
                    };
                return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findMany({
                        where: whereFilter,
                        include: {
                            TreeBranchLeafNode: {
                                select: {
                                    label: true,
                                    treeId: true
                                }
                            }
                        },
                        orderBy: { createdAt: 'desc' }
                    })];
            case 1:
                allFormulas = _b.sent();
                items = allFormulas.map(function (f) {
                    var _a, _b;
                    return (__assign(__assign({}, f), { type: 'node', nodeLabel: ((_a = f.TreeBranchLeafNode) === null || _a === void 0 ? void 0 : _a.label) || 'Nœud inconnu', treeId: ((_b = f.TreeBranchLeafNode) === null || _b === void 0 ? void 0 : _b.treeId) || null }));
                });
                console.log('[TreeBranchLeaf API] All formulas listing', {
                    org: organizationId,
                    isSuperAdmin: isSuperAdmin,
                    totalCount: allFormulas.length
                });
                return [2 /*return*/, res.json({ items: items })];
            case 2:
                error_31 = _b.sent();
                console.error('[TreeBranchLeaf API] Error listing all formulas:', error_31);
                res.status(500).json({ error: 'Erreur lors de la récupération des formules' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// GET /api/treebranchleaf/reusables/formulas/:id
// Récupère une formule spécifique par son ID depuis TreeBranchLeafNodeFormula
router.get('/reusables/formulas/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, organizationId, isSuperAdmin, item, error_32;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                id = req.params.id;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findUnique({
                        where: { id: id },
                        include: {
                            TreeBranchLeafNode: {
                                select: {
                                    label: true,
                                    treeId: true
                                }
                            }
                        }
                    })];
            case 1:
                item = _d.sent();
                if (!item)
                    return [2 /*return*/, res.status(404).json({ error: 'Formule non trouvée' })];
                if (!isSuperAdmin) {
                    // Autorisé si globale ou même organisation
                    if (item.organizationId && item.organizationId !== organizationId) {
                        return [2 /*return*/, res.status(403).json({ error: 'Accès refusé' })];
                    }
                }
                return [2 /*return*/, res.json(__assign(__assign({}, item), { type: 'node', nodeLabel: ((_b = item.TreeBranchLeafNode) === null || _b === void 0 ? void 0 : _b.label) || 'Nœud inconnu', treeId: ((_c = item.TreeBranchLeafNode) === null || _c === void 0 ? void 0 : _c.treeId) || null }))];
            case 2:
                error_32 = _d.sent();
                console.error('[TreeBranchLeaf API] Error getting formula:', error_32);
                res.status(500).json({ error: 'Erreur lors de la récupération de la formule' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// 🔄 REUSABLE CONDITIONS - Conditions réutilisables globales
// =============================================================================
// GET /api/treebranchleaf/reusables/conditions
// Liste toutes les conditions réutilisables (équivalent aux formules réutilisables)
router.get('/reusables/conditions', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, organizationId, isSuperAdmin, hasOrg, whereFilter, allConditions, items, error_33;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                hasOrg = typeof organizationId === 'string' && organizationId.length > 0;
                whereFilter = isSuperAdmin
                    ? {}
                    : {
                        OR: __spreadArray([
                            { organizationId: null }
                        ], (hasOrg ? [{ organizationId: organizationId }] : []), true)
                    };
                return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.findMany({
                        where: whereFilter,
                        include: {
                            TreeBranchLeafNode: {
                                select: {
                                    label: true,
                                    treeId: true
                                }
                            }
                        },
                        orderBy: { createdAt: 'desc' }
                    })];
            case 1:
                allConditions = _b.sent();
                items = allConditions.map(function (c) {
                    var _a, _b;
                    return (__assign(__assign({}, c), { type: 'node', nodeLabel: ((_a = c.TreeBranchLeafNode) === null || _a === void 0 ? void 0 : _a.label) || 'Nœud inconnu', treeId: ((_b = c.TreeBranchLeafNode) === null || _b === void 0 ? void 0 : _b.treeId) || null, nodeId: c.nodeId }));
                });
                console.log('[TreeBranchLeaf API] All conditions listing', {
                    org: organizationId,
                    isSuperAdmin: isSuperAdmin,
                    totalCount: items.length
                });
                return [2 /*return*/, res.json({ items: items })];
            case 2:
                error_33 = _b.sent();
                console.error('[TreeBranchLeaf API] Error listing reusable conditions:', error_33);
                res.status(500).json({ error: 'Erreur lors de la récupération des conditions réutilisables' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// GET /api/treebranchleaf/reusables/conditions/:id
// Récupère une condition spécifique par son ID depuis TreeBranchLeafNodeCondition
router.get('/reusables/conditions/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, organizationId, isSuperAdmin, item, error_34;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                id = req.params.id;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.findUnique({
                        where: { id: id },
                        include: {
                            TreeBranchLeafNode: {
                                select: {
                                    label: true,
                                    treeId: true
                                }
                            }
                        }
                    })];
            case 1:
                item = _d.sent();
                if (!item)
                    return [2 /*return*/, res.status(404).json({ error: 'Condition non trouvée' })];
                if (!isSuperAdmin) {
                    // Autorisé si globale ou même organisation
                    if (item.organizationId && item.organizationId !== organizationId) {
                        return [2 /*return*/, res.status(403).json({ error: 'Accès refusé' })];
                    }
                }
                return [2 /*return*/, res.json(__assign(__assign({}, item), { type: 'node', nodeLabel: ((_b = item.TreeBranchLeafNode) === null || _b === void 0 ? void 0 : _b.label) || 'Nœud inconnu', treeId: ((_c = item.TreeBranchLeafNode) === null || _c === void 0 ? void 0 : _c.treeId) || null }))];
            case 2:
                error_34 = _d.sent();
                console.error('[TreeBranchLeaf API] Error getting condition:', error_34);
                res.status(500).json({ error: 'Erreur lors de la récupération de la condition' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// GET /api/treebranchleaf/reusables/tables
// Liste TOUTES les tables réutilisables de TOUS les nœuds (avec filtrage organisation)
router.get('/reusables/tables', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, organizationId, isSuperAdmin, hasOrg, whereFilter, allTables, items, error_35;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                hasOrg = typeof organizationId === 'string' && organizationId.length > 0;
                whereFilter = isSuperAdmin
                    ? {}
                    : {
                        OR: __spreadArray([
                            { organizationId: null }
                        ], (hasOrg ? [{ organizationId: organizationId }] : []), true)
                    };
                return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findMany({
                        where: whereFilter,
                        include: {
                            TreeBranchLeafNode: {
                                select: {
                                    label: true,
                                    treeId: true
                                }
                            }
                        },
                        orderBy: { createdAt: 'desc' }
                    })];
            case 1:
                allTables = _b.sent();
                items = allTables.map(function (t) {
                    var _a, _b;
                    return ({
                        id: t.id,
                        name: t.name,
                        type: t.type,
                        description: t.description,
                        nodeLabel: ((_a = t.TreeBranchLeafNode) === null || _a === void 0 ? void 0 : _a.label) || 'Nœud inconnu',
                        treeId: ((_b = t.TreeBranchLeafNode) === null || _b === void 0 ? void 0 : _b.treeId) || null,
                        nodeId: t.nodeId,
                        createdAt: t.createdAt,
                        updatedAt: t.updatedAt
                    });
                });
                console.log('[TreeBranchLeaf API] All tables listing', {
                    org: organizationId,
                    isSuperAdmin: isSuperAdmin,
                    totalCount: items.length
                });
                return [2 /*return*/, res.json({ items: items })];
            case 2:
                error_35 = _b.sent();
                console.error('[TreeBranchLeaf API] Error listing reusable tables:', error_35);
                res.status(500).json({ error: 'Erreur lors de la récupération des tables réutilisables' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// ⚖️ NODE CONDITIONS - Conditions spécifiques à un nœud (nouvelle table dédiée)
// =============================================================================
// GET /api/treebranchleaf/nodes/:nodeId/conditions
// Liste les conditions spécifiques à un nœud
router.get('/nodes/:nodeId/conditions', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, _a, organizationId, isSuperAdmin, access, whereClause, conditions, error_36;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                nodeId = req.params.nodeId;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                console.log("[TreeBranchLeaf API] \uD83D\uDD0D GET conditions for node ".concat(nodeId, ":"));
                console.log("[TreeBranchLeaf API] - organizationId: ".concat(organizationId));
                console.log("[TreeBranchLeaf API] - isSuperAdmin: ".concat(isSuperAdmin));
                return [4 /*yield*/, ensureNodeOrgAccess(prisma, nodeId, { organizationId: organizationId, isSuperAdmin: isSuperAdmin })];
            case 1:
                access = _b.sent();
                if (!access.ok)
                    return [2 /*return*/, res.status(access.status).json({ error: access.error })];
                whereClause = { nodeId: nodeId };
                // Ajouter le filtre d'organisation si ce n'est pas un super admin
                if (!isSuperAdmin && organizationId) {
                    whereClause.organizationId = organizationId;
                }
                console.log("[TreeBranchLeaf API] - whereClause:", whereClause);
                return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.findMany({
                        where: whereClause,
                        orderBy: { createdAt: 'asc' }
                    })];
            case 2:
                conditions = _b.sent();
                console.log("[TreeBranchLeaf API] Conditions for node ".concat(nodeId, " (org: ").concat(organizationId, "):"), conditions.length);
                console.log("[TreeBranchLeaf API] Details:", conditions.map(function (c) { return ({ id: c.id, name: c.name, organizationId: c.organizationId }); }));
                return [2 /*return*/, res.json({ conditions: conditions })];
            case 3:
                error_36 = _b.sent();
                console.error('[TreeBranchLeaf API] Error fetching node conditions:', error_36);
                res.status(500).json({ error: 'Erreur lors de la récupération des conditions du nœud' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// POST /api/treebranchleaf/evaluate/condition/:conditionId
// Évalue une condition spécifique et retourne le résultat
router.post('/evaluate/condition/:conditionId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var conditionId, _a, _b, fieldValues, _c, values, submissionId, _d, testMode, _e, organizationId, isSuperAdmin, allValues, condition, evaluateVariableOperation_2, valueMapLocal_1, calculationResult, result, error_37, error_38;
    var _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                _g.trys.push([0, 7, , 8]);
                conditionId = req.params.conditionId;
                _a = req.body, _b = _a.fieldValues, fieldValues = _b === void 0 ? {} : _b, _c = _a.values, values = _c === void 0 ? {} : _c, submissionId = _a.submissionId, _d = _a.testMode, testMode = _d === void 0 ? true : _d;
                _e = getAuthCtx(req), organizationId = _e.organizationId, isSuperAdmin = _e.isSuperAdmin;
                allValues = __assign(__assign({}, fieldValues), values);
                console.log("[TreeBranchLeaf API] \uD83E\uDDEE \u00C9valuation condition ".concat(conditionId, ":"), { allValues: allValues, submissionId: submissionId, testMode: testMode });
                return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.findUnique({
                        where: { id: conditionId },
                        include: {
                            TreeBranchLeafNode: {
                                select: {
                                    label: true,
                                    treeId: true
                                }
                            }
                        }
                    })];
            case 1:
                condition = _g.sent();
                if (!condition) {
                    return [2 /*return*/, res.status(404).json({ error: 'Condition non trouvée' })];
                }
                // Vérifier l'accès organisation
                if (!isSuperAdmin && condition.organizationId !== organizationId) {
                    return [2 /*return*/, res.status(403).json({ error: 'Accès refusé à cette condition' })];
                }
                _g.label = 2;
            case 2:
                _g.trys.push([2, 5, , 6]);
                return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('./operation-interpreter')); })];
            case 3:
                evaluateVariableOperation_2 = (_g.sent()).evaluateVariableOperation;
                valueMapLocal_1 = new Map();
                Object.entries(allValues).forEach(function (_a) {
                    var nodeId = _a[0], value = _a[1];
                    valueMapLocal_1.set(nodeId, value);
                });
                console.log('[TBL-PRISMA] 🧮 Évaluation avec operation-interpreter:', { conditionId: conditionId, values: Object.fromEntries(valueMapLocal_1) });
                return [4 /*yield*/, evaluateVariableOperation_2(condition.nodeId, submissionId || conditionId, prisma, valueMapLocal_1)];
            case 4:
                calculationResult = _g.sent();
                console.log('[TBL-PRISMA] ✅ Résultat évaluation:', calculationResult);
                result = {
                    conditionId: condition.id,
                    conditionName: condition.name,
                    nodeLabel: ((_f = condition.TreeBranchLeafNode) === null || _f === void 0 ? void 0 : _f.label) || 'Nœud inconnu',
                    operationSource: calculationResult.operationSource,
                    operationDetail: calculationResult.operationDetail,
                    operationResult: calculationResult.operationResult,
                    evaluation: {
                        success: true,
                        mode: 'tbl-prisma',
                        timestamp: new Date().toISOString(),
                        testMode: testMode
                    }
                };
                return [2 /*return*/, res.json(result)];
            case 5:
                error_37 = _g.sent();
                console.error('[TBL-PRISMA] ❌ Erreur évaluation TBL-prisma:', error_37);
                return [2 /*return*/, res.status(500).json({
                        error: 'Erreur lors de l\'évaluation TBL-prisma',
                        details: error_37 instanceof Error ? error_37.message : 'Erreur inconnue'
                    })];
            case 6: return [3 /*break*/, 8];
            case 7:
                error_38 = _g.sent();
                console.error('[TreeBranchLeaf API] Error evaluating condition:', error_38);
                res.status(500).json({ error: 'Erreur lors de l\'évaluation de la condition' });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
// POST /api/treebranchleaf/nodes/:nodeId/conditions
// Crée une nouvelle condition pour un nœud
router.post('/nodes/:nodeId/conditions', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, _a, organizationId, isSuperAdmin, _b, name_4, conditionSet, description, access, uniqueName, counter, existingCondition, condition, refIds, _i, refIds_3, refId, e_21, error_39;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 15, , 16]);
                nodeId = req.params.nodeId;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                _b = req.body || {}, name_4 = _b.name, conditionSet = _b.conditionSet, description = _b.description;
                // Debug: log des infos d'authentification
                console.log('🔍 Condition creation auth debug:', {
                    nodeId: nodeId,
                    organizationId: organizationId,
                    isSuperAdmin: isSuperAdmin,
                    reqUser: req.user,
                    headers: req.headers['x-organization-id']
                });
                return [4 /*yield*/, ensureNodeOrgAccess(prisma, nodeId, { organizationId: organizationId, isSuperAdmin: isSuperAdmin })];
            case 1:
                access = _c.sent();
                if (!access.ok)
                    return [2 /*return*/, res.status(access.status).json({ error: access.error })];
                if (!name_4 || !conditionSet) {
                    return [2 /*return*/, res.status(400).json({ error: 'Name et conditionSet requis' })];
                }
                uniqueName = String(name_4);
                counter = 1;
                _c.label = 2;
            case 2:
                if (!true) return [3 /*break*/, 4];
                return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.findFirst({
                        where: {
                            nodeId: nodeId,
                            name: uniqueName,
                            organizationId: organizationId || null
                        }
                    })];
            case 3:
                existingCondition = _c.sent();
                if (!existingCondition) {
                    return [3 /*break*/, 4]; // Le nom est unique
                }
                // Le nom existe, ajouter un numéro
                uniqueName = "".concat(name_4, " (").concat(counter, ")");
                counter++;
                // Sécurité: éviter une boucle infinie
                if (counter > 100) {
                    uniqueName = "".concat(name_4, " (").concat(Date.now(), ")");
                    return [3 /*break*/, 4];
                }
                return [3 /*break*/, 2];
            case 4:
                console.log("[TreeBranchLeaf API] Nom unique g\u00E9n\u00E9r\u00E9: \"".concat(uniqueName, "\" (original: \"").concat(name_4, "\")"));
                return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.create({
                        data: {
                            id: (0, crypto_1.randomUUID)(),
                            nodeId: nodeId,
                            organizationId: organizationId || null,
                            name: uniqueName,
                            conditionSet: conditionSet,
                            description: description ? String(description) : null,
                            updatedAt: new Date()
                        }
                    })];
            case 5:
                condition = _c.sent();
                // 🎯 ACTIVATION AUTOMATIQUE : Configurer hasCondition ET condition_activeId
                console.log("[TreeBranchLeaf API] Activation automatique de la condition cr\u00E9\u00E9e pour le n\u0153ud ".concat(nodeId));
                return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                        where: { id: nodeId },
                        data: {
                            hasCondition: true,
                            condition_activeId: condition.id // 🎯 NOUVEAU : Activer automatiquement la condition
                        }
                    })];
            case 6:
                _c.sent();
                console.log("[TreeBranchLeaf API] Created condition for node ".concat(nodeId, ":"), condition.name);
                _c.label = 7;
            case 7:
                _c.trys.push([7, 13, , 14]);
                return [4 /*yield*/, addToNodeLinkedField(prisma, nodeId, 'linkedConditionIds', [condition.id])];
            case 8:
                _c.sent();
                refIds = Array.from(extractNodeIdsFromConditionSet(conditionSet));
                _i = 0, refIds_3 = refIds;
                _c.label = 9;
            case 9:
                if (!(_i < refIds_3.length)) return [3 /*break*/, 12];
                refId = refIds_3[_i];
                return [4 /*yield*/, addToNodeLinkedField(prisma, normalizeRefId(refId), 'linkedConditionIds', [condition.id])];
            case 10:
                _c.sent();
                _c.label = 11;
            case 11:
                _i++;
                return [3 /*break*/, 9];
            case 12: return [3 /*break*/, 14];
            case 13:
                e_21 = _c.sent();
                console.warn('[TreeBranchLeaf API] Warning updating linkedConditionIds after create:', e_21.message);
                return [3 /*break*/, 14];
            case 14: return [2 /*return*/, res.status(201).json(condition)];
            case 15:
                error_39 = _c.sent();
                console.error('[TreeBranchLeaf API] Error creating node condition:', error_39);
                res.status(500).json({ error: 'Erreur lors de la création de la condition' });
                return [3 /*break*/, 16];
            case 16: return [2 /*return*/];
        }
    });
}); });
// PUT /api/treebranchleaf/nodes/:nodeId/conditions/:conditionId
// Met à jour une condition spécifique
router.put('/nodes/:nodeId/conditions/:conditionId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, nodeId, conditionId, _b, organizationId, isSuperAdmin, _c, name_5, conditionSet, description, access, existingCondition, updated, oldRefs, newRefs, oldSet_2, newSet_2, toAdd, toRemove, _i, toAdd_2, refId, _d, toRemove_2, refId, e_22, error_40;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 16, , 17]);
                _a = req.params, nodeId = _a.nodeId, conditionId = _a.conditionId;
                _b = getAuthCtx(req), organizationId = _b.organizationId, isSuperAdmin = _b.isSuperAdmin;
                _c = req.body || {}, name_5 = _c.name, conditionSet = _c.conditionSet, description = _c.description;
                return [4 /*yield*/, ensureNodeOrgAccess(prisma, nodeId, { organizationId: organizationId, isSuperAdmin: isSuperAdmin })];
            case 1:
                access = _e.sent();
                if (!access.ok)
                    return [2 /*return*/, res.status(access.status).json({ error: access.error })];
                return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.findFirst({
                        where: { id: conditionId, nodeId: nodeId }
                    })];
            case 2:
                existingCondition = _e.sent();
                if (!existingCondition) {
                    return [2 /*return*/, res.status(404).json({ error: 'Condition non trouvée' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.update({
                        where: { id: conditionId },
                        data: {
                            name: name_5 ? String(name_5) : undefined,
                            conditionSet: conditionSet ? conditionSet : undefined,
                            description: description !== undefined ? (description ? String(description) : null) : undefined,
                            updatedAt: new Date()
                        }
                    })];
            case 3:
                updated = _e.sent();
                console.log("[TreeBranchLeaf API] Updated condition ".concat(conditionId, " for node ").concat(nodeId));
                _e.label = 4;
            case 4:
                _e.trys.push([4, 14, , 15]);
                oldRefs = extractNodeIdsFromConditionSet(existingCondition.conditionSet);
                newRefs = extractNodeIdsFromConditionSet(conditionSet !== null && conditionSet !== void 0 ? conditionSet : existingCondition.conditionSet);
                oldSet_2 = new Set(Array.from(oldRefs).map(normalizeRefId));
                newSet_2 = new Set(Array.from(newRefs).map(normalizeRefId));
                toAdd = Array.from(newSet_2).filter(function (id) { return !oldSet_2.has(id); });
                toRemove = Array.from(oldSet_2).filter(function (id) { return !newSet_2.has(id); });
                if (!toAdd.length) return [3 /*break*/, 8];
                _i = 0, toAdd_2 = toAdd;
                _e.label = 5;
            case 5:
                if (!(_i < toAdd_2.length)) return [3 /*break*/, 8];
                refId = toAdd_2[_i];
                return [4 /*yield*/, addToNodeLinkedField(prisma, refId, 'linkedConditionIds', [conditionId])];
            case 6:
                _e.sent();
                _e.label = 7;
            case 7:
                _i++;
                return [3 /*break*/, 5];
            case 8:
                if (!toRemove.length) return [3 /*break*/, 12];
                _d = 0, toRemove_2 = toRemove;
                _e.label = 9;
            case 9:
                if (!(_d < toRemove_2.length)) return [3 /*break*/, 12];
                refId = toRemove_2[_d];
                return [4 /*yield*/, removeFromNodeLinkedField(prisma, refId, 'linkedConditionIds', [conditionId])];
            case 10:
                _e.sent();
                _e.label = 11;
            case 11:
                _d++;
                return [3 /*break*/, 9];
            case 12: 
            // S'assurer que le nœud propriétaire contient bien la condition
            return [4 /*yield*/, addToNodeLinkedField(prisma, nodeId, 'linkedConditionIds', [conditionId])];
            case 13:
                // S'assurer que le nœud propriétaire contient bien la condition
                _e.sent();
                return [3 /*break*/, 15];
            case 14:
                e_22 = _e.sent();
                console.warn('[TreeBranchLeaf API] Warning updating inverse linkedConditionIds after update:', e_22.message);
                return [3 /*break*/, 15];
            case 15: return [2 /*return*/, res.json(updated)];
            case 16:
                error_40 = _e.sent();
                console.error('[TreeBranchLeaf API] Error updating node condition:', error_40);
                res.status(500).json({ error: 'Erreur lors de la mise à jour de la condition' });
                return [3 /*break*/, 17];
            case 17: return [2 /*return*/];
        }
    });
}); });
// DELETE /api/treebranchleaf/nodes/:nodeId/conditions/:conditionId
// Supprime une condition spécifique
router.delete('/nodes/:nodeId/conditions/:conditionId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, nodeId, conditionId, _b, organizationId, isSuperAdmin, access, existingCondition, variableWithCondition, e_23, refIds, _i, refIds_4, refId, e_24, remainingConditions, error_41;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 19, , 20]);
                _a = req.params, nodeId = _a.nodeId, conditionId = _a.conditionId;
                _b = getAuthCtx(req), organizationId = _b.organizationId, isSuperAdmin = _b.isSuperAdmin;
                return [4 /*yield*/, ensureNodeOrgAccess(prisma, nodeId, { organizationId: organizationId, isSuperAdmin: isSuperAdmin })];
            case 1:
                access = _c.sent();
                if (!access.ok)
                    return [2 /*return*/, res.status(access.status).json({ error: access.error })];
                return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.findFirst({
                        where: { id: conditionId, nodeId: nodeId }
                    })];
            case 2:
                existingCondition = _c.sent();
                if (!existingCondition) {
                    return [2 /*return*/, res.status(404).json({ error: 'Condition non trouvée' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.delete({
                        where: { id: conditionId }
                    })];
            case 3:
                _c.sent();
                console.log("[TreeBranchLeaf API] Deleted condition ".concat(conditionId, " for node ").concat(nodeId));
                _c.label = 4;
            case 4:
                _c.trys.push([4, 8, , 9]);
                return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findFirst({
                        where: {
                            nodeId: nodeId,
                            sourceRef: "node-condition:".concat(conditionId)
                        }
                    })];
            case 5:
                variableWithCondition = _c.sent();
                if (!variableWithCondition) return [3 /*break*/, 7];
                return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.delete({
                        where: { nodeId: nodeId }
                    })];
            case 6:
                _c.sent();
                console.log("\u2705 [TreeBranchLeaf API] Variable associ\u00E9e supprim\u00E9e pour condition ".concat(conditionId));
                _c.label = 7;
            case 7: return [3 /*break*/, 9];
            case 8:
                e_23 = _c.sent();
                console.warn('[TreeBranchLeaf API] Warning deleting associated variable:', e_23.message);
                return [3 /*break*/, 9];
            case 9:
                _c.trys.push([9, 15, , 16]);
                return [4 /*yield*/, removeFromNodeLinkedField(prisma, nodeId, 'linkedConditionIds', [conditionId])];
            case 10:
                _c.sent();
                refIds = Array.from(extractNodeIdsFromConditionSet(existingCondition.conditionSet));
                _i = 0, refIds_4 = refIds;
                _c.label = 11;
            case 11:
                if (!(_i < refIds_4.length)) return [3 /*break*/, 14];
                refId = refIds_4[_i];
                return [4 /*yield*/, removeFromNodeLinkedField(prisma, normalizeRefId(refId), 'linkedConditionIds', [conditionId])];
            case 12:
                _c.sent();
                _c.label = 13;
            case 13:
                _i++;
                return [3 /*break*/, 11];
            case 14: return [3 /*break*/, 16];
            case 15:
                e_24 = _c.sent();
                console.warn('[TreeBranchLeaf API] Warning cleaning linkedConditionIds after delete:', e_24.message);
                return [3 /*break*/, 16];
            case 16: return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.count({ where: { nodeId: nodeId } })];
            case 17:
                remainingConditions = _c.sent();
                return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                        where: { id: nodeId },
                        data: { hasCondition: remainingConditions > 0 }
                    })];
            case 18:
                _c.sent();
                console.log("[TreeBranchLeaf API] Updated hasCondition to ".concat(remainingConditions > 0, " for node ").concat(nodeId));
                return [2 /*return*/, res.json({ success: true, message: 'Condition supprimée avec succès' })];
            case 19:
                error_41 = _c.sent();
                console.error('[TreeBranchLeaf API] Error deleting node condition:', error_41);
                res.status(500).json({ error: 'Erreur lors de la suppression de la condition' });
                return [3 /*break*/, 20];
            case 20: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// 🗂️ NODE TABLES - Gestion des instances de tableaux dédiées
// =============================================================================
// GET /api/treebranchleaf/tables/:id - Détails d'une table avec lignes paginées
router.get('/tables/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, organizationId, isSuperAdmin, page, limit, offset, table, tableOrgId, rows, error_42;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                id = req.params.id;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                page = parseInt(req.query.page) || 1;
                limit = parseInt(req.query.limit) || 100;
                offset = (page - 1) * limit;
                console.log("[GET /tables/:id] R\u00E9cup\u00E9ration de la table ".concat(id, " avec pagination (page: ").concat(page, ", limit: ").concat(limit, ")"));
                _d.label = 1;
            case 1:
                _d.trys.push([1, 4, , 5]);
                return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findUnique({
                        where: { id: id },
                        include: {
                            node: {
                                select: {
                                    treeId: true,
                                    TreeBranchLeafTree: {
                                        select: {
                                            organizationId: true
                                        }
                                    }
                                }
                            }
                        }
                    })];
            case 2:
                table = _d.sent();
                if (!table) {
                    return [2 /*return*/, res.status(404).json({ error: 'Table non trouvée' })];
                }
                tableOrgId = (_c = (_b = table.node) === null || _b === void 0 ? void 0 : _b.TreeBranchLeafTree) === null || _c === void 0 ? void 0 : _c.organizationId;
                if (!isSuperAdmin && organizationId && tableOrgId !== organizationId) {
                    return [2 /*return*/, res.status(403).json({ error: 'Accès non autorisé à cette table' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNodeTableRow.findMany({
                        where: { tableId: id },
                        orderBy: { rowIndex: 'asc' },
                        take: limit,
                        skip: offset,
                    })];
            case 3:
                rows = _d.sent();
                console.log("[GET /tables/:id] ".concat(rows.length, " lignes r\u00E9cup\u00E9r\u00E9es pour la table ").concat(id, "."));
                // Renvoyer la réponse
                res.json(__assign(__assign({}, table), { rows: rows.map(function (r) { return r.cells; }), // Renvoyer uniquement les données des cellules
                    page: page, limit: limit, totalRows: table.rowCount, totalPages: Math.ceil(table.rowCount / limit) }));
                return [3 /*break*/, 5];
            case 4:
                error_42 = _d.sent();
                console.error("\u274C [GET /tables/:id] Erreur lors de la r\u00E9cup\u00E9ration de la table ".concat(id, ":"), error_42);
                res.status(500).json({ error: 'Impossible de récupérer la table' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
var isJsonObject = function (value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
};
var jsonClone = function (value) { return JSON.parse(JSON.stringify(value !== null && value !== void 0 ? value : null)); };
// ==================================================================================
// ?? FONCTION DE FILTRAGE D'OPTIONS DE TABLE PAR FILTRE SIMPLE
// ==================================================================================
function applySingleFilter(filter, options, tableData, formValues) {
    var columnName = filter.columnName, operator = filter.operator, filterValue = filter.value;
    console.log("[applySingleFilter] ?? Filtre: colonne=\"".concat(columnName, "\", op=\"").concat(operator, "\""));
    // R�soudre la valeur du filtre si c'est une r�f�rence @select
    var resolvedValue = filterValue;
    var nodeId = undefined;
    if (typeof filterValue === 'string' && filterValue.startsWith('@select.')) {
        nodeId = filterValue.replace('@select.', '');
        resolvedValue = formValues[nodeId];
        console.log("[applySingleFilter] ?? R\uFFFDsolution @select: ".concat(filterValue, " -> ").concat(resolvedValue));
    }
    else {
        console.log("[applySingleFilter] ? Valeur statique: ".concat(filterValue));
    }
    // Si pas de valeur r�solue, on garde toutes les options
    if (resolvedValue === undefined || resolvedValue === null || resolvedValue === '') {
        console.log("[applySingleFilter] ?? Valeur du n\uFFFDud \"".concat(nodeId, "\" non trouv\uFFFDe dans formValues"));
        return options;
    }
    // Trouver l'index de la colonne
    var colIndex = tableData.columns.indexOf(columnName);
    if (colIndex === -1) {
        console.warn("[applySingleFilter] ?? Colonne \"".concat(columnName, "\" introuvable"));
        return options;
    }
    // Filtrer les options
    return options.filter(function (option) {
        var rowIndex = tableData.data.findIndex(function (row) { return row[0] === option.value; });
        if (rowIndex === -1)
            return false;
        var cellValue = tableData.data[rowIndex][colIndex];
        var result = compareValues(cellValue, resolvedValue, operator);
        if (!result) {
            console.log("[applySingleFilter] ? \"".concat(option.value, "\" rejet\uFFFD: ").concat(cellValue, " ").concat(operator, " ").concat(resolvedValue));
        }
        return result;
    });
}
// ═══════════════════════════════════════════════════════════════════════════
// 🗜️ COMPRESSION POUR GROS TABLEAUX
// ═══════════════════════════════════════════════════════════════════════════
/**
 * ⚠️ FONCTION DÉPRÉCIÉE - Utilisait l'ancienne architecture avec colonnes JSON
 * Maintenant que les tables sont normalisées (table-routes-new.ts), cette fonction n'est plus utilisée
 */
/*
const compressIfNeeded = (data: TableJsonValue): TableJsonValue => {
  if (!data || typeof data !== 'object') return data;
  
  const jsonString = JSON.stringify(data);
  const sizeKB = jsonString.length / 1024;
  
  console.log('[compressIfNeeded] Taille non compressée:', Math.round(sizeKB), 'KB');
  
  // Si > 1MB, on compresse
  if (sizeKB > 1024) {
    console.log('[compressIfNeeded] 🗜️ Compression activée (taille > 1MB)');
    const compressed = gzipSync(jsonString);
    const compressedB64 = compressed.toString('base64');
    const compressedSizeKB = compressedB64.length / 1024;
    const ratio = Math.round((1 - compressedSizeKB / sizeKB) * 100);
    
    console.log('[compressIfNeeded] ✅ Taille compressée:', Math.round(compressedSizeKB), 'KB (réduction:', ratio + '%)');
    
    return {
      _compressed: true,
      _data: compressedB64
    } as TableJsonValue;
  }
  
  console.log('[compressIfNeeded] Pas de compression nécessaire');
  return data;
};
*/
/**
 * Décompresse les données si elles étaient compressées
 */
var _decompressIfNeeded = function (value) {
    if (!value || typeof value !== 'object')
        return value;
    var obj = value;
    if (obj._compressed && typeof obj._data === 'string') {
        console.log('[decompressIfNeeded] 🔓 Décompression des données...');
        try {
            var buffer = Buffer.from(obj._data, 'base64');
            var decompressed = (0, zlib_1.gunzipSync)(buffer);
            var jsonString = decompressed.toString('utf-8');
            var result = JSON.parse(jsonString);
            console.log('[decompressIfNeeded] ✅ Décompression réussie');
            return result;
        }
        catch (error) {
            console.error('[decompressIfNeeded] ❌ Erreur décompression:', error);
            return value;
        }
    }
    return value;
};
// ⚠️ OBSOLÈTE : readStringArray supprimée - Architecture normalisée utilise tableColumns
// ⚠️ OBSOLÈTE : readMatrix et readStringArray supprimées - Architecture normalisée utilise tableRows/tableColumns
var readMeta = function (value) {
    if (!value)
        return {};
    if (!isJsonObject(value))
        return {};
    return jsonClone(value);
};
var buildRecordRows = function (columns, matrix) {
    console.log('[buildRecordRows] 🔍 ENTRÉE:');
    console.log('[buildRecordRows] columns:', columns.length);
    console.log('[buildRecordRows] matrix:', matrix.length, 'lignes');
    var result = matrix.map(function (row) {
        var obj = {};
        columns.forEach(function (col, index) {
            var _a;
            obj[col] = index < row.length ? (_a = row[index]) !== null && _a !== void 0 ? _a : null : null;
        });
        return obj;
    });
    console.log('[buildRecordRows] 🎯 SORTIE:', result.length, 'records');
    return result;
};
var normalizeTableInstance = function (table // TableColumns et TableRows chargés via include
) {
    var _a, _b, _c, _d, _e;
    try {
        console.log('[normalizeTableInstance] 🔄 ARCHITECTURE NORMALISÉE');
        console.log('[normalizeTableInstance] table.id:', table.id);
        console.log('[normalizeTableInstance] tableColumns:', ((_a = table.tableColumns) === null || _a === void 0 ? void 0 : _a.length) || 0);
        console.log('[normalizeTableInstance] tableRows:', ((_b = table.tableRows) === null || _b === void 0 ? void 0 : _b.length) || 0);
        // 📊 ARCHITECTURE NORMALISÉE : tableColumns et tableRows
        var columns = (table.tableColumns || [])
            .sort(function (a, b) { return a.columnIndex - b.columnIndex; })
            .map(function (col) { return col.name; });
        var rows = (table.tableRows || [])
            .sort(function (a, b) { return a.rowIndex - b.rowIndex; })
            .map(function (row) {
            // ✅ NOUVEAU: Prisma Json type retourne directement l'objet
            var cells;
            if (Array.isArray(row.cells)) {
                // Format actuel: cells est déjà un array d'objets JS
                cells = row.cells;
            }
            else if (typeof row.cells === 'string') {
                // Ancien format string BRUTE (pas JSON): "Nord", "Sud-Est"...
                // C'est juste le label, pas un tableau !
                return row.cells;
            }
            else if (row.cells === null || row.cells === undefined) {
                return '';
            }
            else {
                // Autre format inconnu
                cells = [];
            }
            // Extraire le label (premier élément de l'array)
            return Array.isArray(cells) && cells.length > 0 ? String(cells[0]) : '';
        });
        var matrix = (table.tableRows || [])
            .sort(function (a, b) { return a.rowIndex - b.rowIndex; })
            .map(function (row) {
            // ✅ NOUVEAU: Prisma Json type retourne directement l'objet
            var cells;
            if (Array.isArray(row.cells)) {
                // Format actuel: cells est déjà un array d'objets JS
                cells = row.cells;
            }
            else if (typeof row.cells === 'string') {
                // Ancien format string BRUTE: juste le label, pas de données
                // Retourner array vide car pas de data numeric
                return [];
            }
            else {
                cells = [];
            }
            // Les données commencent à partir de l'index 1 (index 0 = label)
            return Array.isArray(cells) ? cells.slice(1) : [];
        });
        console.log('[normalizeTableInstance] ✅ columns:', columns.length, columns);
        console.log('[normalizeTableInstance] ✅ rows:', rows.length, rows);
        console.log('[normalizeTableInstance] ✅ matrix:', matrix.length);
        var meta = readMeta(table.meta);
        var result = {
            id: table.id,
            name: table.name,
            description: (_c = table.description) !== null && _c !== void 0 ? _c : null,
            type: (_d = table.type) !== null && _d !== void 0 ? _d : 'columns',
            columns: columns,
            rows: rows,
            matrix: matrix,
            data: { matrix: matrix },
            records: buildRecordRows(columns, matrix),
            meta: meta,
            order: (_e = table.order) !== null && _e !== void 0 ? _e : 0,
            isDefault: Boolean(table.isDefault),
        };
        console.log('[normalizeTableInstance] 🎯 SORTIE:');
        console.log('[normalizeTableInstance] result.columns:', result.columns.length);
        console.log('[normalizeTableInstance] result.rows:', result.rows.length);
        console.log('[normalizeTableInstance] result.matrix:', result.matrix.length);
        console.log('[normalizeTableInstance] result.records:', result.records.length);
        return result;
    }
    catch (error) {
        console.error('[normalizeTableInstance] ❌ ERREUR FATALE:', error);
        console.error('[normalizeTableInstance] table.id:', table === null || table === void 0 ? void 0 : table.id);
        console.error('[normalizeTableInstance] table structure:', JSON.stringify(table, null, 2));
        throw error;
    }
};
var syncNodeTableCapability = function (nodeId_4) {
    var args_1 = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args_1[_i - 1] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([nodeId_4], args_1, true), void 0, function (nodeId, client) {
        var node, tables, normalizedList, instances, active, activeMeta, inferredIsImported, inferredImportSource;
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        if (client === void 0) { client = prisma; }
        return __generator(this, function (_l) {
            switch (_l.label) {
                case 0: return [4 /*yield*/, client.treeBranchLeafNode.findUnique({
                        where: { id: nodeId },
                        select: { id: true, table_activeId: true },
                    })];
                case 1:
                    node = _l.sent();
                    if (!node)
                        return [2 /*return*/];
                    return [4 /*yield*/, client.treeBranchLeafNodeTable.findMany({
                            where: { nodeId: nodeId },
                            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
                        })];
                case 2:
                    tables = _l.sent();
                    if (!(tables.length === 0)) return [3 /*break*/, 4];
                    return [4 /*yield*/, client.treeBranchLeafNode.update({
                            where: { id: nodeId },
                            data: {
                                hasTable: false,
                                table_instances: null,
                                table_activeId: null,
                                table_name: null,
                                table_type: null,
                                table_columns: null,
                                table_rows: null,
                                table_data: null,
                                table_meta: null,
                                table_isImported: false,
                                table_importSource: null,
                            },
                        })];
                case 3:
                    _l.sent();
                    return [2 /*return*/];
                case 4:
                    normalizedList = tables.map(normalizeTableInstance);
                    instances = normalizedList.reduce(function (acc, instance) {
                        acc[instance.id] = {
                            id: instance.id,
                            name: instance.name,
                            description: instance.description,
                            type: instance.type,
                            columns: instance.columns,
                            rows: instance.rows,
                            matrix: instance.matrix,
                            data: instance.data,
                            records: instance.records,
                            meta: instance.meta,
                            order: instance.order,
                            isDefault: instance.isDefault,
                        };
                        return acc;
                    }, {});
                    active = (_b = (_a = normalizedList.find(function (tbl) { return tbl.id === node.table_activeId; })) !== null && _a !== void 0 ? _a : normalizedList.find(function (tbl) { return tbl.isDefault; })) !== null && _b !== void 0 ? _b : normalizedList[0];
                    activeMeta = ((_c = active === null || active === void 0 ? void 0 : active.meta) !== null && _c !== void 0 ? _c : {});
                    inferredIsImported = typeof activeMeta.isImported === 'boolean'
                        ? activeMeta.isImported
                        : Boolean(activeMeta.isImported);
                    inferredImportSource = typeof activeMeta.importSource === 'string'
                        ? activeMeta.importSource
                        : null;
                    return [4 /*yield*/, client.treeBranchLeafNode.update({
                            where: { id: nodeId },
                            data: {
                                hasTable: true,
                                table_instances: instances,
                                table_activeId: (_d = active === null || active === void 0 ? void 0 : active.id) !== null && _d !== void 0 ? _d : null,
                                table_name: (_e = active === null || active === void 0 ? void 0 : active.name) !== null && _e !== void 0 ? _e : null,
                                table_type: (_f = active === null || active === void 0 ? void 0 : active.type) !== null && _f !== void 0 ? _f : null,
                                table_columns: ((_g = active === null || active === void 0 ? void 0 : active.columns) !== null && _g !== void 0 ? _g : null),
                                table_rows: ((_h = active === null || active === void 0 ? void 0 : active.rows) !== null && _h !== void 0 ? _h : null),
                                table_data: ((_j = active === null || active === void 0 ? void 0 : active.matrix) !== null && _j !== void 0 ? _j : null),
                                table_meta: ((_k = active === null || active === void 0 ? void 0 : active.meta) !== null && _k !== void 0 ? _k : null),
                                table_isImported: inferredIsImported,
                                table_importSource: inferredImportSource,
                            },
                        })];
                case 5:
                    _l.sent();
                    return [2 /*return*/];
            }
        });
    });
};
var fetchNormalizedTable = function (nodeId_4) {
    var args_1 = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args_1[_i - 1] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([nodeId_4], args_1, true), void 0, function (nodeId, options, client) {
        var tablesRaw, tables, target, nodeInfo_1, table;
        var _a;
        if (options === void 0) { options = {}; }
        if (client === void 0) { client = prisma; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, client.treeBranchLeafNodeTable.findMany({
                        where: { nodeId: nodeId },
                        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
                    })];
                case 1:
                    tablesRaw = _b.sent();
                    if (!tablesRaw.length) {
                        return [2 /*return*/, null];
                    }
                    tables = tablesRaw.map(normalizeTableInstance);
                    target = options.tableId ? tables.find(function (tbl) { return tbl.id === options.tableId; }) : undefined;
                    if (!!target) return [3 /*break*/, 3];
                    return [4 /*yield*/, client.treeBranchLeafNode.findUnique({
                            where: { id: nodeId },
                            select: { table_activeId: true },
                        })];
                case 2:
                    nodeInfo_1 = _b.sent();
                    if (nodeInfo_1 === null || nodeInfo_1 === void 0 ? void 0 : nodeInfo_1.table_activeId) {
                        target = (_a = tables.find(function (tbl) { return tbl.id === nodeInfo_1.table_activeId; })) !== null && _a !== void 0 ? _a : target;
                    }
                    _b.label = 3;
                case 3:
                    table = target !== null && target !== void 0 ? target : tables[0];
                    return [2 /*return*/, { table: table, tables: tables }];
            }
        });
    });
};
// Récupérer toutes les instances de tableaux d'un nœud
router.get('/nodes/:nodeId/tables', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, _a, organizationId, isSuperAdmin, access, tables, normalized, error_43;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                nodeId = req.params.nodeId;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                return [4 /*yield*/, ensureNodeOrgAccess(prisma, nodeId, { organizationId: organizationId, isSuperAdmin: isSuperAdmin })];
            case 1:
                access = _b.sent();
                if (!access.ok)
                    return [2 /*return*/, res.status(access.status).json({ error: access.error })];
                return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findMany({
                        where: { nodeId: nodeId },
                        include: {
                            tableColumns: {
                                orderBy: { columnIndex: 'asc' }
                            },
                            tableRows: {
                                orderBy: { rowIndex: 'asc' }
                            }
                        },
                        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
                    })];
            case 2:
                tables = _b.sent();
                normalized = tables.map(normalizeTableInstance);
                console.log("[TreeBranchLeaf API] Retrieved ".concat(normalized.length, " tables for node ").concat(nodeId));
                return [2 /*return*/, res.json(normalized)];
            case 3:
                error_43 = _b.sent();
                console.error('[TreeBranchLeaf API] Error fetching node tables:', error_43);
                res.status(500).json({ error: 'Erreur lors de la récupération des tableaux' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// ⚠️ ANCIENNE ROUTE DÉSACTIVÉE - Utilise maintenant table-routes-new.ts
// La nouvelle architecture normalisée gère POST /nodes/:nodeId/tables
/*
// Créer une nouvelle instance de tableau
router.post('/nodes/:nodeId/tables', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const { name, description, type = 'basic', columns = [], rows = [], data = {}, meta = {} } = req.body;

    console.log('========================================');
    console.log('[TreeBranchLeaf API] 📥 POST /nodes/:nodeId/tables REÇU');
    console.log('[TreeBranchLeaf API] nodeId:', nodeId);
    console.log('[TreeBranchLeaf API] name:', name);
    console.log('[TreeBranchLeaf API] type:', type);
    console.log('[TreeBranchLeaf API] 📊 DONNÉES REÇUES:');
    console.log('[TreeBranchLeaf API] columns:', Array.isArray(columns) ? columns.length : typeof columns, columns);
    console.log('[TreeBranchLeaf API] rows:', Array.isArray(rows) ? rows.length : typeof rows);
    console.log('[TreeBranchLeaf API] rows (10 premières):', Array.isArray(rows) ? rows.slice(0, 10) : 'N/A');
    console.log('[TreeBranchLeaf API] rows (10 dernières):', Array.isArray(rows) ? rows.slice(-10) : 'N/A');
    console.log('[TreeBranchLeaf API] data type:', typeof data, Array.isArray(data) ? `array[${data.length}]` : 'object');
    if (Array.isArray(data)) {
      console.log('[TreeBranchLeaf API] data[0]:', data[0]);
      console.log('[TreeBranchLeaf API] data[dernière]:', data[data.length - 1]);
    } else if (data && typeof data === 'object') {
      console.log('[TreeBranchLeaf API] data keys:', Object.keys(data));
      if (data.matrix) {
        console.log('[TreeBranchLeaf API] data.matrix length:', data.matrix.length);
      }
    }
    console.log('========================================');

    // Vérifier l'accès au nœud
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    // Vérifier que le nom n'existe pas déjà
    const existing = await prisma.treeBranchLeafNodeTable.findFirst({
      where: { nodeId, name }
    });

    if (existing) {
      console.log('[TreeBranchLeaf API] ❌ Tableau avec ce nom existe déjà');
      return res.status(400).json({ error: 'Un tableau avec ce nom existe déjà' });
    }

    // Déterminer l'ordre
    const lastTable = await prisma.treeBranchLeafNodeTable.findFirst({
      where: { nodeId },
      orderBy: { order: 'desc' }
    });
    const order = (lastTable?.order || 0) + 1;

    // Générer un ID unique pour le tableau
    const tableId = randomUUID();

    console.log('[TreeBranchLeaf API] 💾 AVANT PRISMA.CREATE:');
    console.log('[TreeBranchLeaf API] tableId:', tableId);
    console.log('[TreeBranchLeaf API] columns à sauver:', Array.isArray(columns) ? columns.length : typeof columns);
    console.log('[TreeBranchLeaf API] rows à sauver:', Array.isArray(rows) ? rows.length : typeof rows);
    console.log('[TreeBranchLeaf API] data à sauver:', Array.isArray(data) ? `array[${data.length}]` : typeof data);
    
    // Calculer la taille approximative du JSON
    const jsonSize = JSON.stringify({ columns, rows, data }).length;
    console.log('[TreeBranchLeaf API] 📏 Taille JSON totale:', jsonSize, 'caractères (' + Math.round(jsonSize / 1024) + ' KB)');
    
    if (jsonSize > 10 * 1024 * 1024) {
      console.log('[TreeBranchLeaf API] ⚠️ ATTENTION: Taille > 10MB, risque de problème PostgreSQL');
    }

    // 🗜️ Compresser les données volumineuses avant sauvegarde
    const compressedColumns = compressIfNeeded(columns);
    const compressedRows = compressIfNeeded(rows);
    const compressedData = compressIfNeeded(data);
    
    console.log('[TreeBranchLeaf API] 💾 Données après compression:');
    console.log('[TreeBranchLeaf API] columns compressé:', typeof compressedColumns === 'object' && (compressedColumns as any)._compressed ? 'OUI' : 'NON');
    console.log('[TreeBranchLeaf API] rows compressé:', typeof compressedRows === 'object' && (compressedRows as any)._compressed ? 'OUI' : 'NON');
    console.log('[TreeBranchLeaf API] data compressé:', typeof compressedData === 'object' && (compressedData as any)._compressed ? 'OUI' : 'NON');

    const newTable = await prisma.treeBranchLeafNodeTable.create({
      data: {
        id: tableId,
        nodeId,
        organizationId,
        name,
        description,
        type,
        columns: compressedColumns,
        rows: compressedRows,
        data: compressedData,
        meta,
        order,
        updatedAt: new Date()
      }
    });

    console.log('[TreeBranchLeaf API] ✅ PRISMA.CREATE TERMINÉ');
    console.log('[TreeBranchLeaf API] Tableau créé ID:', newTable.id);
    console.log('[TreeBranchLeaf API] Colonnes sauvées:', Array.isArray(newTable.columns) ? newTable.columns.length : typeof newTable.columns);
    console.log('[TreeBranchLeaf API] Rows sauvées:', Array.isArray(newTable.rows) ? newTable.rows.length : typeof newTable.rows);
    console.log('[TreeBranchLeaf API] Data sauvées:', Array.isArray(newTable.data) ? newTable.data.length : typeof newTable.data);

    await syncNodeTableCapability(nodeId);

    const normalized = normalizeTableInstance(newTable);

    console.log('[TreeBranchLeaf API] 🔄 APRÈS NORMALISATION:');
    console.log('[TreeBranchLeaf API] normalized.columns:', normalized.columns?.length);
    console.log('[TreeBranchLeaf API] normalized.rows:', normalized.rows?.length);
    console.log('[TreeBranchLeaf API] normalized.matrix:', normalized.matrix?.length);
    console.log('========================================');

    console.log(`[TreeBranchLeaf API] ✅ Created table ${newTable.id} for node ${nodeId}`);
    return res.status(201).json(normalized);
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error creating node table:', error);
    res.status(500).json({ error: 'Erreur lors de la création du tableau' });
  }
});
*/
// FIN DE L'ANCIENNE ROUTE - Utilise table-routes-new.ts maintenant
// ⚠️ ANCIENNE ROUTE PUT DÉSACTIVÉE - Utilise maintenant table-routes-new.ts
// Cette route utilisait les anciens champs columns/rows/data qui n'existent plus dans le schéma normalisé
/*
router.put('/nodes/:nodeId/tables/:tableId', async (req, res) => {
  try {
    const { nodeId, tableId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as unknown as MinimalReq);
    const { name, description, type, columns, rows, data, meta } = req.body;

    // Vérifier l'accès au nœud
    const access = await ensureNodeOrgAccess(prisma, nodeId, { organizationId, isSuperAdmin });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    // Vérifier que le tableau appartient bien à ce nœud
    const existingTable = await prisma.treeBranchLeafNodeTable.findFirst({
      where: { id: tableId, nodeId }
    });

    if (!existingTable) {
      return res.status(404).json({ error: 'Tableau non trouvé' });
    }

    // Vérifier l'unicité du nom si changé
    if (name && name !== existingTable.name) {
      const nameConflict = await prisma.treeBranchLeafNodeTable.findFirst({
        where: { nodeId, name, id: { not: tableId } }
      });

      if (nameConflict) {
        return res.status(400).json({ error: 'Un tableau avec ce nom existe déjà' });
      }
    }

    // 🗜️ Compresser les données volumineuses si fournies
    const updateData: any = {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(type !== undefined && { type }),
      ...(columns !== undefined && { columns: compressIfNeeded(columns) }),
      ...(rows !== undefined && { rows: compressIfNeeded(rows) }),
      ...(data !== undefined && { data: compressIfNeeded(data) }),
      ...(meta !== undefined && { meta }),
      updatedAt: new Date()
    };

    const updatedTable = await prisma.treeBranchLeafNodeTable.update({
      where: { id: tableId },
      data: updateData
    });

    await syncNodeTableCapability(nodeId);

    console.log(`[TreeBranchLeaf API] Updated table ${tableId} for node ${nodeId}`);
    return res.json(normalizeTableInstance(updatedTable));
  } catch (error) {
    console.error('[TreeBranchLeaf API] Error updating node table:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du tableau' });
  }
});
*/
// FIN DE L'ANCIENNE ROUTE PUT
// Supprimer une instance de tableau
router.delete('/nodes/:nodeId/tables/:tableId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var tableId, _a, organizationId, isSuperAdmin, table, tableOrgId, selectConfigsUsingTable, _i, selectConfigsUsingTable_2, config, selectNode, oldMetadata, oldCapabilities, newCapabilities, newMetadata, selectConfigError_1, node, currentLinkedIds, nextLinkedIds, wasActiveTable, cleanedInstances, instances, remainingTables, error_44;
    var _b, _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                tableId = req.params.tableId;
                console.log("[DELETE /nodes/:nodeId/tables/:tableId] ??? Suppression table ".concat(tableId, " avec nettoyage complet"));
                _f.label = 1;
            case 1:
                _f.trys.push([1, 19, , 20]);
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findUnique({
                        where: { id: tableId },
                        include: {
                            TreeBranchLeafNode: {
                                include: { TreeBranchLeafTree: true }
                            }
                        }
                    })];
            case 2:
                table = _f.sent();
                if (!table) {
                    return [2 /*return*/, res.status(404).json({ error: 'Table non trouv�e' })];
                }
                tableOrgId = (_c = (_b = table.TreeBranchLeafNode) === null || _b === void 0 ? void 0 : _b.TreeBranchLeafTree) === null || _c === void 0 ? void 0 : _c.organizationId;
                if (!isSuperAdmin && organizationId && tableOrgId !== organizationId) {
                    return [2 /*return*/, res.status(403).json({ error: 'Acc�s non autoris�' })];
                }
                // 2?? Supprimer la table (colonnes et lignes supprim�es en cascade par Prisma)
                return [4 /*yield*/, prisma.treeBranchLeafNodeTable.delete({ where: { id: tableId } })];
            case 3:
                // 2?? Supprimer la table (colonnes et lignes supprim�es en cascade par Prisma)
                _f.sent();
                console.log("[DELETE Table] ? Table ".concat(tableId, " supprim\uFFFDe (+ colonnes/lignes en cascade)"));
                _f.label = 4;
            case 4:
                _f.trys.push([4, 13, , 14]);
                return [4 /*yield*/, prisma.treeBranchLeafSelectConfig.findMany({
                        where: { tableReference: tableId },
                        select: { nodeId: true }
                    })];
            case 5:
                selectConfigsUsingTable = _f.sent();
                if (!(selectConfigsUsingTable.length > 0)) return [3 /*break*/, 12];
                console.log("[DELETE Table] ?? ".concat(selectConfigsUsingTable.length, " champ(s) Select/Cascader r\uFFFDf\uFFFDrencent cette table - D\uFFFDSACTIVATION LOOKUP"));
                _i = 0, selectConfigsUsingTable_2 = selectConfigsUsingTable;
                _f.label = 6;
            case 6:
                if (!(_i < selectConfigsUsingTable_2.length)) return [3 /*break*/, 11];
                config = selectConfigsUsingTable_2[_i];
                return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                        where: { id: config.nodeId },
                        select: {
                            label: true,
                            metadata: true
                        }
                    })];
            case 7:
                selectNode = _f.sent();
                if (!selectNode) return [3 /*break*/, 10];
                console.log("[DELETE Table] ?? D\uFFFDsactivation lookup pour \"".concat(selectNode.label, "\" (").concat(config.nodeId, ")"));
                oldMetadata = (selectNode.metadata || {});
                oldCapabilities = (oldMetadata.capabilities || {});
                newCapabilities = __assign(__assign({}, oldCapabilities), { table: {
                        enabled: false,
                        activeId: null,
                        instances: null,
                        currentTable: null,
                    } });
                newMetadata = __assign(__assign({}, oldMetadata), { capabilities: newCapabilities });
                // 2?? Mettre � jour le n�ud (m�me logique que PUT /capabilities/table avec enabled: false)
                return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                        where: { id: config.nodeId },
                        data: {
                            hasTable: false,
                            table_activeId: null,
                            table_instances: null,
                            table_name: null,
                            table_type: null,
                            table_meta: null,
                            table_columns: null,
                            table_rows: null,
                            table_data: null,
                            metadata: JSON.parse(JSON.stringify(newMetadata)),
                            select_options: [],
                            updatedAt: new Date()
                        }
                    })];
            case 8:
                // 2?? Mettre � jour le n�ud (m�me logique que PUT /capabilities/table avec enabled: false)
                _f.sent();
                // 3?? Supprimer la configuration SELECT (comme le fait le bouton D�sactiver)
                return [4 /*yield*/, prisma.treeBranchLeafSelectConfig.deleteMany({
                        where: { nodeId: config.nodeId }
                    })];
            case 9:
                // 3?? Supprimer la configuration SELECT (comme le fait le bouton D�sactiver)
                _f.sent();
                console.log("[DELETE Table] ? Lookup d\uFFFDsactiv\uFFFD pour \"".concat(selectNode.label, "\" - champ d\uFFFDbloqu\uFFFD"));
                _f.label = 10;
            case 10:
                _i++;
                return [3 /*break*/, 6];
            case 11:
                console.log("[DELETE Table] ? ".concat(selectConfigsUsingTable.length, " champ(s) Select D\uFFFDBLOQU\uFFFDS (lookup d\uFFFDsactiv\uFFFD)"));
                _f.label = 12;
            case 12: return [3 /*break*/, 14];
            case 13:
                selectConfigError_1 = _f.sent();
                console.error("[DELETE Table] ?? Erreur d\uFFFDsactivation lookups:", selectConfigError_1);
                return [3 /*break*/, 14];
            case 14:
                if (!table.nodeId) return [3 /*break*/, 18];
                return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                        where: { id: table.nodeId },
                        select: {
                            linkedTableIds: true,
                            table_activeId: true,
                            table_instances: true
                        }
                    })];
            case 15:
                node = _f.sent();
                currentLinkedIds = (_d = node === null || node === void 0 ? void 0 : node.linkedTableIds) !== null && _d !== void 0 ? _d : [];
                nextLinkedIds = currentLinkedIds.filter(function (x) { return x !== tableId; });
                wasActiveTable = (node === null || node === void 0 ? void 0 : node.table_activeId) === tableId;
                cleanedInstances = (_e = node === null || node === void 0 ? void 0 : node.table_instances) !== null && _e !== void 0 ? _e : {};
                if (typeof cleanedInstances === 'object' && cleanedInstances !== null) {
                    instances = cleanedInstances;
                    if (instances[tableId]) {
                        delete instances[tableId];
                        cleanedInstances = instances;
                    }
                }
                return [4 /*yield*/, prisma.treeBranchLeafNodeTable.count({
                        where: { nodeId: table.nodeId }
                    })];
            case 16:
                remainingTables = _f.sent();
                return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                        where: { id: table.nodeId },
                        data: __assign({ hasTable: remainingTables > 0, linkedTableIds: { set: nextLinkedIds }, table_activeId: wasActiveTable ? null : undefined, table_instances: cleanedInstances }, (remainingTables === 0 && {
                            table_name: null,
                            table_type: null,
                            table_meta: null,
                            table_columns: null,
                            table_rows: null,
                            table_data: null,
                            table_importSource: null,
                            table_isImported: false
                        }))
                    })];
            case 17:
                _f.sent();
                console.log("[DELETE Table] ? N\uFFFDud ".concat(table.nodeId, " enti\uFFFDrement nettoy\uFFFD"), {
                    hasTable: remainingTables > 0,
                    linkedTableIds: nextLinkedIds.length,
                    table_activeId_reset: wasActiveTable,
                    table_instances_cleaned: true,
                    all_fields_reset: remainingTables === 0
                });
                _f.label = 18;
            case 18: return [2 /*return*/, res.json({ success: true, message: 'Tableau supprim� avec succ�s' })];
            case 19:
                error_44 = _f.sent();
                console.error('[DELETE Table] ? Erreur lors de la suppression:', error_44);
                res.status(500).json({ error: 'Erreur lors de la suppression du tableau' });
                return [3 /*break*/, 20];
            case 20: return [2 /*return*/];
        }
    });
}); });
router.get('/nodes/:nodeId/tables/options', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, _a, organizationId, isSuperAdmin, _b, tableId, _c, dimension, access, normalized, table, tables, items_1, items, error_45;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 3, , 4]);
                nodeId = req.params.nodeId;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                _b = req.query, tableId = _b.tableId, _c = _b.dimension, dimension = _c === void 0 ? 'columns' : _c;
                return [4 /*yield*/, ensureNodeOrgAccess(prisma, nodeId, { organizationId: organizationId, isSuperAdmin: isSuperAdmin })];
            case 1:
                access = _d.sent();
                if (!access.ok)
                    return [2 /*return*/, res.status(access.status).json({ error: access.error })];
                return [4 /*yield*/, fetchNormalizedTable(nodeId, {
                        tableId: typeof tableId === 'string' && tableId ? tableId : undefined,
                    })];
            case 2:
                normalized = _d.sent();
                if (!normalized) {
                    return [2 /*return*/, res.json({ items: [], table: null })];
                }
                table = normalized.table, tables = normalized.tables;
                if (dimension === 'rows') {
                    items_1 = table.rows.map(function (label, index) { return ({ value: label, label: label, index: index }); });
                    return [2 /*return*/, res.json({ items: items_1, table: { id: table.id, type: table.type, name: table.name }, tables: tables })];
                }
                if (dimension === 'records') {
                    return [2 /*return*/, res.json({
                            items: table.records,
                            table: { id: table.id, type: table.type, name: table.name },
                            tables: tables,
                        })];
                }
                items = table.columns.map(function (label, index) { return ({ value: label, label: label, index: index }); });
                return [2 /*return*/, res.json({ items: items, table: { id: table.id, type: table.type, name: table.name }, tables: tables })];
            case 3:
                error_45 = _d.sent();
                console.error('[TreeBranchLeaf API] Error fetching table options:', error_45);
                res.status(500).json({ error: 'Erreur lors de la récupération des options du tableau' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Lookup dynamique dans une instance de tableau
router.get('/nodes/:nodeId/tables/lookup', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, _a, organizationId, isSuperAdmin, _b, tableId, column, row, key, keyColumn, keyValue, valueColumn, access, normalized, table, rawLookup, colLabel_1, rowLabel_1, columnIndex, rowIndex, value, resolvedKeyColumn_1, lookupValue, keyIndex, matchedIndex, i, current, matchedRow, matchedRecord, resolvedValueColumn_1, resolvedValue, valueIdx, exposeColumns, error_46;
    var _c, _d, _e, _f, _g, _h, _j, _k, _l, _o;
    return __generator(this, function (_p) {
        switch (_p.label) {
            case 0:
                _p.trys.push([0, 3, , 4]);
                nodeId = req.params.nodeId;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                _b = req.query, tableId = _b.tableId, column = _b.column, row = _b.row, key = _b.key, keyColumn = _b.keyColumn, keyValue = _b.keyValue, valueColumn = _b.valueColumn;
                return [4 /*yield*/, ensureNodeOrgAccess(prisma, nodeId, { organizationId: organizationId, isSuperAdmin: isSuperAdmin })];
            case 1:
                access = _p.sent();
                if (!access.ok)
                    return [2 /*return*/, res.status(access.status).json({ error: access.error })];
                return [4 /*yield*/, fetchNormalizedTable(nodeId, {
                        tableId: tableId && tableId.length ? tableId : undefined,
                    })];
            case 2:
                normalized = _p.sent();
                if (!normalized) {
                    return [2 /*return*/, res.status(404).json({ error: 'Aucun tableau disponible pour ce nœud' })];
                }
                table = normalized.table;
                rawLookup = (table.meta && typeof table.meta.lookup === 'object')
                    ? table.meta.lookup
                    : undefined;
                if (table.type === 'matrix') {
                    colLabel_1 = column || (valueColumn && valueColumn === 'column' ? valueColumn : undefined);
                    rowLabel_1 = row;
                    if (!colLabel_1 || !rowLabel_1) {
                        return [2 /*return*/, res.status(400).json({ error: 'Paramètres column et row requis pour un tableau croisé' })];
                    }
                    columnIndex = table.columns.findIndex(function (c) { return c === colLabel_1; });
                    rowIndex = table.rows.findIndex(function (r) { return r === rowLabel_1; });
                    if (columnIndex === -1) {
                        return [2 /*return*/, res.status(404).json({ error: "Colonne \"".concat(colLabel_1, "\" introuvable") })];
                    }
                    if (rowIndex === -1) {
                        return [2 /*return*/, res.status(404).json({ error: "Ligne \"".concat(rowLabel_1, "\" introuvable") })];
                    }
                    value = (_d = (_c = table.matrix[rowIndex]) === null || _c === void 0 ? void 0 : _c[columnIndex]) !== null && _d !== void 0 ? _d : null;
                    return [2 /*return*/, res.json({
                            value: value,
                            rowIndex: rowIndex,
                            columnIndex: columnIndex,
                            column: table.columns[columnIndex],
                            row: table.rows[rowIndex],
                            table: { id: table.id, name: table.name, type: table.type },
                            meta: table.meta,
                        })];
                }
                resolvedKeyColumn_1 = (_e = (keyColumn && keyColumn.length ? keyColumn : undefined)) !== null && _e !== void 0 ? _e : (rawLookup && typeof rawLookup.keyColumn === 'string' ? rawLookup.keyColumn : undefined);
                if (!resolvedKeyColumn_1) {
                    return [2 /*return*/, res.status(400).json({ error: 'Colonne clé non définie pour ce tableau' })];
                }
                lookupValue = (_g = (_f = (keyValue && keyValue.length ? keyValue : undefined)) !== null && _f !== void 0 ? _f : (key && key.length ? key : undefined)) !== null && _g !== void 0 ? _g : (column && !table.columns.includes(column) ? column : undefined);
                if (lookupValue === undefined) {
                    return [2 /*return*/, res.status(400).json({ error: 'Valeur de clé requise' })];
                }
                keyIndex = table.columns.findIndex(function (colName) { return colName === resolvedKeyColumn_1; });
                if (keyIndex === -1) {
                    return [2 /*return*/, res.status(404).json({ error: "Colonne cl\u00E9 \"".concat(resolvedKeyColumn_1, "\" introuvable") })];
                }
                matchedIndex = -1;
                for (i = 0; i < table.matrix.length; i += 1) {
                    current = (_h = table.matrix[i]) === null || _h === void 0 ? void 0 : _h[keyIndex];
                    if (current != null && String(current) === String(lookupValue)) {
                        matchedIndex = i;
                        break;
                    }
                }
                if (matchedIndex === -1) {
                    return [2 /*return*/, res.status(404).json({ error: 'Aucune ligne correspondant à cette clé' })];
                }
                matchedRow = (_j = table.matrix[matchedIndex]) !== null && _j !== void 0 ? _j : [];
                matchedRecord = (_k = table.records[matchedIndex]) !== null && _k !== void 0 ? _k : null;
                resolvedValueColumn_1 = (_l = (valueColumn && valueColumn.length ? valueColumn : undefined)) !== null && _l !== void 0 ? _l : (rawLookup && typeof rawLookup.valueColumn === 'string' ? rawLookup.valueColumn : undefined);
                resolvedValue = matchedRecord;
                if (resolvedValueColumn_1) {
                    valueIdx = table.columns.findIndex(function (colName) { return colName === resolvedValueColumn_1; });
                    if (valueIdx === -1) {
                        return [2 /*return*/, res.status(404).json({ error: "Colonne \"".concat(resolvedValueColumn_1, "\" introuvable") })];
                    }
                    resolvedValue = (_o = matchedRow[valueIdx]) !== null && _o !== void 0 ? _o : null;
                }
                exposeColumns = Array.isArray(rawLookup === null || rawLookup === void 0 ? void 0 : rawLookup.exposeColumns)
                    ? rawLookup === null || rawLookup === void 0 ? void 0 : rawLookup.exposeColumns
                    : [];
                return [2 /*return*/, res.json({
                        value: resolvedValue !== null && resolvedValue !== void 0 ? resolvedValue : null,
                        row: matchedRecord,
                        rowIndex: matchedIndex,
                        keyColumn: resolvedKeyColumn_1,
                        keyValue: lookupValue,
                        table: { id: table.id, name: table.name, type: table.type },
                        meta: table.meta,
                        exposeColumns: exposeColumns,
                    })];
            case 3:
                error_46 = _p.sent();
                console.error('[TreeBranchLeaf API] Error performing table lookup:', error_46);
                res.status(500).json({ error: 'Erreur lors du lookup dans le tableau' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Générer automatiquement des champs SELECT dépendants d'un tableau
router.post('/nodes/:nodeId/table/generate-selects', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, _a, organizationId, isSuperAdmin, _b, requestedTableId, labelColumns, labelRows, access, normalized, table, baseNode, parentId, siblingsCount, tableMeta, metaNameRaw, baseLabel, fallbackColumnsLabel, fallbackRowsLabel, toCreate, created, insertOrder, now, _i, toCreate_1, item, newNodeId, nodeMetadata, newNode, error_47;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 10, , 11]);
                nodeId = req.params.nodeId;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                _b = (req.body || {}), requestedTableId = _b.tableId, labelColumns = _b.labelColumns, labelRows = _b.labelRows;
                return [4 /*yield*/, ensureNodeOrgAccess(prisma, nodeId, { organizationId: organizationId, isSuperAdmin: isSuperAdmin })];
            case 1:
                access = _d.sent();
                if (!access.ok)
                    return [2 /*return*/, res.status(access.status).json({ error: access.error })];
                return [4 /*yield*/, fetchNormalizedTable(nodeId, {
                        tableId: typeof requestedTableId === 'string' && requestedTableId.trim().length
                            ? requestedTableId.trim()
                            : undefined,
                    })];
            case 2:
                normalized = _d.sent();
                if (!normalized) {
                    return [2 /*return*/, res.status(404).json({ error: 'Aucun tableau disponible pour ce nœud' })];
                }
                table = normalized.table;
                if (!table.columns.length) {
                    return [2 /*return*/, res.status(400).json({ error: 'Le tableau ne contient aucune colonne exploitable' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                        where: { id: nodeId },
                        select: { id: true, treeId: true, parentId: true },
                    })];
            case 3:
                baseNode = _d.sent();
                if (!baseNode) {
                    return [2 /*return*/, res.status(404).json({ error: 'Nœud de base introuvable' })];
                }
                parentId = (_c = baseNode.parentId) !== null && _c !== void 0 ? _c : null;
                return [4 /*yield*/, prisma.treeBranchLeafNode.count({
                        where: { treeId: baseNode.treeId, parentId: parentId },
                    })];
            case 4:
                siblingsCount = _d.sent();
                tableMeta = table.meta || {};
                metaNameRaw = typeof tableMeta['name'] === 'string' ? tableMeta['name'] : undefined;
                baseLabel = (metaNameRaw && metaNameRaw.trim()) || (table.name && table.name.trim()) || 'Tableau';
                fallbackColumnsLabel = typeof labelColumns === 'string' && labelColumns.trim().length
                    ? labelColumns.trim()
                    : "".concat(baseLabel, " - colonne");
                fallbackRowsLabel = typeof labelRows === 'string' && labelRows.trim().length
                    ? labelRows.trim()
                    : "".concat(baseLabel, " - ligne");
                toCreate = [];
                if (table.columns.length) {
                    toCreate.push({ label: fallbackColumnsLabel, dimension: 'columns' });
                }
                if (table.rows.length) {
                    toCreate.push({ label: fallbackRowsLabel, dimension: 'rows' });
                }
                if (!toCreate.length) {
                    return [2 /*return*/, res.status(400).json({ error: 'Aucune dimension exploitable pour générer des champs SELECT' })];
                }
                created = [];
                insertOrder = siblingsCount;
                now = new Date();
                _i = 0, toCreate_1 = toCreate;
                _d.label = 5;
            case 5:
                if (!(_i < toCreate_1.length)) return [3 /*break*/, 9];
                item = toCreate_1[_i];
                newNodeId = (0, crypto_1.randomUUID)();
                nodeMetadata = {
                    generatedFrom: 'table_lookup',
                    tableNodeId: baseNode.id,
                    tableId: table.id,
                    tableDimension: item.dimension,
                };
                return [4 /*yield*/, prisma.treeBranchLeafNode.create({
                        data: {
                            id: newNodeId,
                            treeId: baseNode.treeId,
                            parentId: parentId,
                            type: 'leaf_select',
                            subType: 'SELECT',
                            fieldType: 'SELECT',
                            fieldSubType: 'SELECT',
                            label: item.label,
                            order: insertOrder,
                            isVisible: true,
                            isActive: true,
                            hasData: false,
                            hasFormula: false,
                            hasCondition: false,
                            hasTable: false,
                            hasAPI: false,
                            hasLink: false,
                            hasMarkers: false,
                            select_allowClear: true,
                            select_defaultValue: null,
                            select_multiple: false,
                            select_options: [],
                            select_searchable: false,
                            metadata: nodeMetadata,
                            tbl_auto_generated: true,
                            updatedAt: now,
                        },
                    })];
            case 6:
                newNode = _d.sent();
                return [4 /*yield*/, prisma.treeBranchLeafSelectConfig.create({
                        data: {
                            id: (0, crypto_1.randomUUID)(),
                            nodeId: newNode.id,
                            options: [],
                            multiple: false,
                            searchable: false,
                            allowCustom: false,
                            optionsSource: "table_".concat(item.dimension),
                            tableReference: "node-table:".concat(table.id),
                            dependsOnNodeId: baseNode.id,
                            createdAt: now,
                            updatedAt: now,
                        },
                    })];
            case 7:
                _d.sent();
                created.push({ id: newNode.id, label: newNode.label, dimension: item.dimension });
                insertOrder += 1;
                _d.label = 8;
            case 8:
                _i++;
                return [3 /*break*/, 5];
            case 9: return [2 /*return*/, res.json({
                    created: created,
                    table: { id: table.id, name: table.name, type: table.type },
                })];
            case 10:
                error_47 = _d.sent();
                console.error('[TreeBranchLeaf API] Error generating selects from table:', error_47);
                res.status(500).json({ error: 'Erreur lors de la génération des champs dépendants' });
                return [3 /*break*/, 11];
            case 11: return [2 /*return*/];
        }
    });
}); });
// -------------------------------------------------------------
// ✅ Endpoint valeurs effectives (prise en compte override manuel)
// GET /api/treebranchleaf/effective-values?ids=a,b,c
router.get('/effective-values', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var idsParam, ids, nodes, result, _i, nodes_4, node, error_48;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                idsParam = String(req.query.ids || '').trim();
                if (!idsParam)
                    return [2 /*return*/, res.json({ success: true, data: {} })];
                ids = idsParam.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
                if (!ids.length)
                    return [2 /*return*/, res.json({ success: true, data: {} })];
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                        where: { id: { in: ids } },
                        include: { TreeBranchLeafNodeVariable: true }
                    })];
            case 1:
                nodes = _a.sent();
                result = {};
                for (_i = 0, nodes_4 = nodes; _i < nodes_4.length; _i++) {
                    node = nodes_4[_i];
                    result[node.id] = {
                        value: null,
                        source: 'not_implemented',
                        manualApplied: false
                    };
                }
                return [2 /*return*/, res.json({ success: true, data: result })];
            case 2:
                error_48 = _a.sent();
                console.error('[TreeBranchLeaf API] Error getting effective values:', error_48);
                res.status(500).json({ error: 'Erreur lors de la récupération des valeurs effectives' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// 🧪 FORMULA ENGINE DEBUG - Endpoints de débogage
// =============================================================================
// GET /api/treebranchleaf/debug/formula-vars
// Liste toutes les variables de formule pour débogage
router.get('/debug/formula-vars', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var vars, error_49;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findMany({
                        include: {
                            node: {
                                select: {
                                    id: true,
                                    label: true,
                                    treeId: true,
                                    organizationId: true
                                }
                            }
                        },
                        orderBy: {
                            updatedAt: 'desc'
                        }
                    })];
            case 1:
                vars = _a.sent();
                return [2 /*return*/, res.json(vars)];
            case 2:
                error_49 = _a.sent();
                console.error('[TreeBranchLeaf API] Error fetching formula variables:', error_49);
                res.status(500).json({ error: 'Erreur lors de la récupération des variables de formule' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// GET /api/treebranchleaf/debug/formula-eval
// Évalue une formule spécifique (pour débogage)
router.get('/debug/formula-eval', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, formulaId, nodeId, formula, node, fieldValues_1, _b, value, errors, error_50;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 4, , 5]);
                _a = req.query, formulaId = _a.formulaId, nodeId = _a.nodeId;
                if (typeof formulaId !== 'string' || typeof nodeId !== 'string') {
                    return [2 /*return*/, res.status(400).json({ error: 'formulaId et nodeId requis' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findUnique({
                        where: { id: formulaId }
                    })];
            case 1:
                formula = _d.sent();
                if (!formula) {
                    return [2 /*return*/, res.status(404).json({ error: 'Formule non trouvée' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                        where: { id: nodeId },
                        include: { TreeBranchLeafNodeVariable: true }
                    })];
            case 2:
                node = _d.sent();
                if (!node) {
                    return [2 /*return*/, res.status(404).json({ error: 'Nœud non trouvé' })];
                }
                fieldValues_1 = __assign({}, (_c = node.TreeBranchLeafNodeVariable) === null || _c === void 0 ? void 0 : _c.reduce(function (acc, v) {
                    if (v.exposedKey) {
                        acc[v.exposedKey] = v.fixedValue || null;
                    }
                    return acc;
                }, {}));
                console.log('🧪 [DEBUG] Évaluation de la formule avec les fieldValues suivants:', fieldValues_1);
                return [4 /*yield*/, (0, formulaEngine_js_1.evaluateTokens)(formula.tokens, {
                        resolveVariable: function (nodeId) { return __awaiter(void 0, void 0, void 0, function () {
                            var found;
                            return __generator(this, function (_a) {
                                found = Object.values(fieldValues_1).find(function (v) { return v.nodeId === nodeId; });
                                return [2 /*return*/, found ? found.value : 0];
                            });
                        }); },
                        divisionByZeroValue: 0
                    })];
            case 3:
                _b = _d.sent(), value = _b.value, errors = _b.errors;
                return [2 /*return*/, res.json({ value: value, errors: errors })];
            case 4:
                error_50 = _d.sent();
                console.error('[TreeBranchLeaf API] Error evaluating formula in debug:', error_50);
                res.status(500).json({ error: 'Erreur lors de l\'évaluation de la formule en mode débogage' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// 📈 FORMULA VERSION - Version des formules (pour cache frontend)
// =============================================================================
// GET /api/treebranchleaf/formulas-version
// Retourne une version/timestamp pour permettre au frontend de gérer le cache
router.get('/formulas-version', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, organizationId, isSuperAdmin, version;
    return __generator(this, function (_b) {
        try {
            res.setHeader('X-TBL-Legacy-Deprecated', 'true');
            if (process.env.NODE_ENV !== 'production') {
                console.warn('[TBL LEGACY] /api/treebranchleaf/formulas-version appelé (déprécié). Utiliser /api/tbl/evaluate avec futur cache dépendances.');
            }
            _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
            version = {
                version: Date.now(),
                timestamp: new Date().toISOString(),
                organizationId: organizationId || null,
                isSuperAdmin: Boolean(isSuperAdmin)
            };
            console.log('[TreeBranchLeaf API] Formulas version requested:', version);
            return [2 /*return*/, res.json(version)];
        }
        catch (error) {
            console.error('[TreeBranchLeaf API] Error getting formulas version:', error);
            res.status(500).json({ error: 'Erreur lors de la récupération de la version des formules' });
        }
        return [2 /*return*/];
    });
}); });
router.post('/formulas/validate', function (req, res) {
    var _a;
    try {
        var _b = (_a = req.body) !== null && _a !== void 0 ? _a : {}, expression = _b.expression, rolesMap = _b.rolesMap;
        if (typeof expression !== 'string' || !expression.trim()) {
            return res.status(400).json({ error: 'expression_required' });
        }
        var tokens = (0, formulaEngine_js_1.parseExpression)(expression, createRolesProxy(rolesMap), { enableCache: false });
        var rpn = (0, formulaEngine_js_1.toRPN)(tokens);
        return res.json({
            tokens: tokens,
            rpn: rpn,
            complexity: tokens.length
        });
    }
    catch (error) {
        console.error('[TreeBranchLeaf API] Error validating formula:', error);
        return res.status(400).json({
            error: 'Parse error',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
router.get('/logic/version', function (_req, res) {
    var payload = computeLogicVersion();
    return res.json(payload);
});
router.post('/formulas/cache/clear', function (_req, res) {
    (0, formulaEngine_js_1.clearRpnCache)();
    var stats = (0, formulaEngine_js_1.getRpnCacheStats)();
    return res.json({ cleared: true, stats: stats });
});
router.post('/nodes/:nodeId/table/evaluate', function (req, res) {
    // Fallback minimal implementation to ensure JSON response during integration tests.
    // Permissions would normally apply upstream; we respond with a structured 404 so the
    // caller never falls back to the SPA HTML payload.
    return res.status(404).json({ error: 'node_not_found', nodeId: req.params.nodeId });
});
router.post('/evaluate/formula', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, expr, rolesMap, values, options, strict, enableCache, divisionByZeroValue, precisionScale, valueStore_1, evaluation, stats, metrics, error_51;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                _a = (_b = req.body) !== null && _b !== void 0 ? _b : {}, expr = _a.expr, rolesMap = _a.rolesMap, values = _a.values, options = _a.options;
                if (typeof expr !== 'string' || !expr.trim()) {
                    return [2 /*return*/, res.status(400).json({ error: 'expr_required' })];
                }
                strict = Boolean(options === null || options === void 0 ? void 0 : options.strict);
                enableCache = (options === null || options === void 0 ? void 0 : options.enableCache) !== undefined ? Boolean(options.enableCache) : true;
                divisionByZeroValue = typeof (options === null || options === void 0 ? void 0 : options.divisionByZeroValue) === 'number' ? options.divisionByZeroValue : 0;
                precisionScale = typeof (options === null || options === void 0 ? void 0 : options.precisionScale) === 'number' ? options.precisionScale : undefined;
                valueStore_1 = (values && typeof values === 'object') ? values : {};
                return [4 /*yield*/, (0, formulaEngine_js_1.evaluateExpression)(expr, createRolesProxy(rolesMap), {
                        resolveVariable: function (nodeId) { var _a; return coerceToNumber((_a = valueStore_1[nodeId]) !== null && _a !== void 0 ? _a : valueStore_1[nodeId.toLowerCase()]); },
                        strictVariables: strict,
                        enableCache: enableCache,
                        divisionByZeroValue: divisionByZeroValue,
                        precisionScale: precisionScale
                    })];
            case 1:
                evaluation = _c.sent();
                stats = (0, formulaEngine_js_1.getRpnCacheStats)();
                metrics = (0, formulaEngine_js_1.getLogicMetrics)();
                return [2 /*return*/, res.json({
                        value: evaluation.value,
                        errors: evaluation.errors,
                        stats: stats,
                        metrics: metrics
                    })];
            case 2:
                error_51 = _c.sent();
                if (error_51 instanceof Error) {
                    return [2 /*return*/, res.status(400).json({ error: 'Parse error', details: error_51.message })];
                }
                console.error('[TreeBranchLeaf API] Error evaluating inline formula:', error_51);
                return [2 /*return*/, res.status(500).json({ error: 'Erreur évaluation inline' })];
            case 3: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// 🧮 FORMULA EVALUATION - Évaluation de formules
// =============================================================================
// POST /api/treebranchleaf/evaluate/formula/:formulaId
// Évalue une formule spécifique et retourne le résultat calculé
router.post('/evaluate/formula/:formulaId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var formulaId, _a, _b, fieldValues, _c, testMode, _d, organizationId, isSuperAdmin, formula, nodeOrg, isDebugMode, tokens, tokenVariables, rawExpression, orchestrated_1, variableCount, singleValue, values, resolvedVariables_1, universalAnalyzer, intelligentStrategy, classified, strategy, rawValue, cleanedString, numValue, finalValue, evaluateTokens, result, responseData, error_52;
    var _e, _f, _g, _h, _j, _k, _l;
    return __generator(this, function (_o) {
        switch (_o.label) {
            case 0:
                _o.trys.push([0, 2, , 3]);
                res.setHeader('X-TBL-Legacy-Deprecated', 'true');
                if (process.env.NODE_ENV !== 'production') {
                    console.warn('[TBL LEGACY] /api/treebranchleaf/evaluate/formula/:id appelé (déprécié). Utiliser POST /api/tbl/evaluate elementId=<exposedKey>.');
                }
                formulaId = req.params.formulaId;
                _a = req.body, _b = _a.fieldValues, fieldValues = _b === void 0 ? {} : _b, _c = _a.testMode, testMode = _c === void 0 ? true : _c;
                _d = getAuthCtx(req), organizationId = _d.organizationId, isSuperAdmin = _d.isSuperAdmin;
                console.log("[TreeBranchLeaf API] \uD83E\uDDEE \u00C9valuation formule ".concat(formulaId, ":"), { fieldValues: fieldValues, testMode: testMode });
                return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findUnique({
                        where: { id: formulaId },
                        include: {
                            TreeBranchLeafNode: {
                                select: {
                                    label: true,
                                    treeId: true,
                                    TreeBranchLeafTree: {
                                        select: { organizationId: true }
                                    }
                                }
                            }
                        }
                    })];
            case 1:
                formula = _o.sent();
                if (!formula) {
                    return [2 /*return*/, res.status(404).json({ error: 'Formule non trouvée' })];
                }
                nodeOrg = (_f = (_e = formula.TreeBranchLeafNode) === null || _e === void 0 ? void 0 : _e.TreeBranchLeafTree) === null || _f === void 0 ? void 0 : _f.organizationId;
                if (!isSuperAdmin && nodeOrg && nodeOrg !== organizationId) {
                    return [2 /*return*/, res.status(403).json({ error: 'Accès refusé à cette formule' })];
                }
                // Évaluer la formule avec le moteur d'expressions
                try {
                    console.log("[TreeBranchLeaf API] \uD83E\uDDEE \u00C9VALUATION FORMULE ULTRA-D\u00C9TAILL\u00C9E:", {
                        formulaId: formula.id,
                        formulaName: formula.name,
                        tokens: formula.tokens,
                        fieldValues: fieldValues
                    });
                    console.log("[TreeBranchLeaf API] \uD83D\uDD0D FIELDVALUES RE\u00C7UES:", Object.entries(fieldValues));
                    isDebugMode = process.env.NODE_ENV === 'development';
                    if (isDebugMode && formula) {
                        console.log("[TreeBranchLeaf API] \uFFFD === FORMULE EN COURS D'ANALYSE ===");
                        console.log("[TreeBranchLeaf API] \uFFFD ID:", formula.id);
                        console.log("[TreeBranchLeaf API] \uD83D\uDD0D Expression:", formula.expression || 'undefined');
                        console.log("[TreeBranchLeaf API] \uFFFD Tokens BRUTS:", JSON.stringify(formula.tokens, null, 2));
                        if (Array.isArray(formula.tokens)) {
                            formula.tokens.forEach(function (token, index) {
                                console.log("[TreeBranchLeaf API] \uFFFD Token ".concat(index, ":"), {
                                    type: token.type,
                                    value: token.value,
                                    name: token.name,
                                    variableId: token.variableId,
                                    allProps: Object.keys(token)
                                });
                            });
                        }
                        console.log("[TreeBranchLeaf API] \uFFFD FieldValues pour cette formule:");
                        Object.entries(fieldValues).forEach(function (_a) {
                            var k = _a[0], v = _a[1];
                            console.log("[TreeBranchLeaf API] \uFFFD   ".concat(k, ": \"").concat(v, "\" (").concat(typeof v, ")"));
                        });
                    }
                    tokens = Array.isArray(formula.tokens) ? formula.tokens : [];
                    tokenVariables = tokens
                        .filter(function (t) { return Boolean(t) && t.type === 'variable'; })
                        .map(function (t) { return t.name; })
                        .filter(Boolean);
                    console.log('[TreeBranchLeaf API] Variables dans les tokens:', tokenVariables);
                    rawExpression = (formula === null || formula === void 0 ? void 0 : formula.expression)
                        || (formula === null || formula === void 0 ? void 0 : formula.rawExpression)
                        || '';
                    orchestrated_1 = null;
                    try {
                        orchestrated_1 = (0, orchestrator_js_1.evaluateFormulaOrchestrated)({
                            fieldValues: fieldValues,
                            tokens: tokens,
                            rawExpression: rawExpression,
                            variableMap: (_g = req.body) === null || _g === void 0 ? void 0 : _g.variableMap,
                            hasOperatorsOverride: (_h = req.body) === null || _h === void 0 ? void 0 : _h.hasOperators
                        });
                        // 🎯 DEBUG MODE pour l'orchestrateur en développement
                        if (process.env.NODE_ENV === 'development') {
                            console.log("[TreeBranchLeaf API] \uD83D\uDEA8 === R\u00C9SULTAT ORCHESTRATEUR ===");
                            console.log("[TreeBranchLeaf API] \uD83D\uDEA8 resolvedVariables:", orchestrated_1.resolvedVariables);
                            console.log("[TreeBranchLeaf API] \uD83D\uDEA8 strategy:", orchestrated_1.strategy);
                            console.log("[TreeBranchLeaf API] \uD83D\uDEA8 operatorsDetected:", orchestrated_1.operatorsDetected);
                            variableCount = Object.keys(orchestrated_1.resolvedVariables).filter(function (k) { return orchestrated_1.resolvedVariables[k] !== 0; }).length;
                            console.log("[TreeBranchLeaf API] \uD83D\uDEA8 Variable count (non-zero):", variableCount);
                            if (variableCount === 1) {
                                singleValue = Object.values(orchestrated_1.resolvedVariables).find(function (v) { return v !== 0; });
                                console.log("[TreeBranchLeaf API] \uD83D\uDEA8 \u274C UNE SEULE VARIABLE \u2192 RETOUR DIRECT: ".concat(singleValue));
                            }
                            else if (variableCount >= 2) {
                                values = Object.values(orchestrated_1.resolvedVariables);
                                console.log("[TreeBranchLeaf API] \uD83D\uDEA8 \u2705 PLUSIEURS VARIABLES \u2192 CALCUL: ".concat(values[0], " / ").concat(values[1], " = ").concat(values[0] / values[1]));
                            }
                            console.log("[TreeBranchLeaf API] \uD83D\uDEA8 Trace orchestrateur:", orchestrated_1.trace);
                        }
                    }
                    catch (orchestratorError) {
                        console.error('[TreeBranchLeaf API] ❌ Erreur orchestrateur:', orchestratorError);
                        return [2 /*return*/, res.status(500).json({
                                error: 'Erreur orchestrateur formule',
                                details: orchestratorError.message || 'unknown',
                                debug: {
                                    formulaId: formula.id,
                                    rawExpression: rawExpression,
                                    tokensCount: tokens.length,
                                    receivedFieldValuesKeys: Object.keys(fieldValues)
                                }
                            })];
                    }
                    resolvedVariables_1 = orchestrated_1.resolvedVariables;
                    console.log('[TreeBranchLeaf API] 🎯 Variables finales résolues (orchestrateur):', resolvedVariables_1);
                    console.log('[TreeBranchLeaf API] 🎯 Stratégie orchestrateur:', orchestrated_1.strategy, 'operatorsDetected=', orchestrated_1.operatorsDetected);
                    console.log('[TreeBranchLeaf API] 📋 FieldValues disponibles:', Object.keys(fieldValues));
                    console.log('[TreeBranchLeaf API] 📋 Valeurs FieldValues:', fieldValues);
                    universalAnalyzer = function (fieldValues) {
                        console.log("[TreeBranchLeaf API] \uD83E\uDDE0 === ANALYSE INTELLIGENTE UNIVERSELLE ===");
                        console.log("[TreeBranchLeaf API] \uD83E\uDDE0 Donn\u00E9es re\u00E7ues:", fieldValues);
                        var classified = {
                            userInputs: {},
                            systemRefs: {},
                            calculations: {},
                            conditions: {},
                            metadata: {}
                        };
                        // 2. ANALYSE DE CHAQUE DONNÉE
                        Object.entries(fieldValues).forEach(function (_a) {
                            var key = _a[0], value = _a[1];
                            if (value == null || value === '')
                                return;
                            var strValue = String(value);
                            console.log("[TreeBranchLeaf API] \uD83D\uDD0D Analyse \"".concat(key, "\": \"").concat(strValue, "\""));
                            // Valeurs utilisateur directes (champs de saisie)
                            if (key.includes('_field')) {
                                classified.userInputs[key] = value;
                                console.log("[TreeBranchLeaf API] \uD83D\uDC64 INPUT UTILISATEUR: \"".concat(key, "\" = \"").concat(value, "\""));
                            }
                            // Références système (IDs, nœuds)
                            else if (key.startsWith('node_') || key.includes('-') && key.length > 10) {
                                classified.systemRefs[key] = value;
                                console.log("[TreeBranchLeaf API] \uD83D\uDD17 R\u00C9F\u00C9RENCE SYST\u00C8ME: \"".concat(key, "\" = \"").concat(value, "\""));
                            }
                            // Données miroir (pour sync)
                            else if (key.startsWith('__mirror_')) {
                                classified.metadata[key] = value;
                                console.log("[TreeBranchLeaf API] \uD83E\uDE9E M\u00C9TADONN\u00C9E: \"".concat(key, "\" = \"").concat(value, "\""));
                            }
                            // Tout le reste = calculs/conditions
                            else {
                                classified.calculations[key] = value;
                                console.log("[TreeBranchLeaf API] \uD83E\uDDEE CALCUL/CONDITION: \"".concat(key, "\" = \"").concat(value, "\""));
                            }
                        });
                        return classified;
                    };
                    intelligentStrategy = function (classified, resolvedVariables, context) {
                        console.log("[TreeBranchLeaf API] \uD83C\uDFAF === STRAT\u00C9GIE INTELLIGENTE ===");
                        var userInputCount = Object.keys(classified.userInputs).length;
                        var systemRefCount = Object.keys(classified.systemRefs).length;
                        var calculationCount = Object.keys(classified.calculations).length;
                        // 🔧 CORRECTION CRITIQUE: Compter toutes les variables des tokens, pas seulement celles résolues à non-zero
                        // Le problème était qu'une variable non-résolue (mise à 0) n'était pas comptée, 
                        // faisant passer de 2 variables à 1 variable → SINGLE_VALUE au lieu d'AUTO_CALCULATION
                        var tokenVariableCount = context.tokenVariablesCount;
                        var variableCount = Object.keys(resolvedVariables).filter(function (k) { return resolvedVariables[k] !== 0; }).length;
                        console.log("[TreeBranchLeaf API] \uD83D\uDCCA COMPTAGE:", {
                            userInputs: userInputCount,
                            systemRefs: systemRefCount,
                            calculations: calculationCount,
                            variables: variableCount,
                            tokenVariables: tokenVariableCount, // 🔧 UTILISER CETTE VALEUR
                            tokens: context.tokensCount
                        });
                        // RÈGLE 1 (ADAPTÉE): Priorité utilisateur UNIQUEMENT si la formule n'a pas de variables (tokenVariablesCount=0)
                        // Avant: on retournait systématiquement la première saisie (problème: figeait la formule sur le premier chiffre tapé)
                        if (userInputCount > 0 && context.tokenVariablesCount === 0) {
                            var userValue = Object.values(classified.userInputs)[0];
                            console.log("[TreeBranchLeaf API] \u2705 STRAT\u00C9GIE: PRIORIT\u00C9 UTILISATEUR");
                            console.log("[TreeBranchLeaf API] \uD83D\uDD0D D\u00C9TAIL VALEUR UTILISATEUR:");
                            console.log("[TreeBranchLeaf API] \uD83D\uDD0D - Type: ".concat(typeof userValue));
                            console.log("[TreeBranchLeaf API] \uD83D\uDD0D - Valeur brute: \"".concat(userValue, "\""));
                            console.log("[TreeBranchLeaf API] \uD83D\uDD0D - String conversion: \"".concat(String(userValue), "\""));
                            console.log("[TreeBranchLeaf API] \uD83D\uDD0D - Longueur: ".concat(String(userValue).length));
                            return {
                                strategy: 'USER_PRIORITY',
                                value: userValue,
                                reason: 'L\'utilisateur a entré une valeur directe'
                            };
                        }
                        // 🔧 CORRECTION CRITIQUE: Utiliser tokenVariableCount au lieu de variableCount
                        // RÈGLE 2: Si on a des variables pour calculer dans les tokens, on calcule
                        if (tokenVariableCount >= 2) {
                            console.log("[TreeBranchLeaf API] \u2705 STRAT\u00C9GIE: CALCUL AUTOMATIQUE (".concat(tokenVariableCount, " variables dans les tokens, ").concat(variableCount, " r\u00E9solues non-nulles)"));
                            return {
                                strategy: 'AUTO_CALCULATION',
                                value: null,
                                reason: "Calcul automatique avec ".concat(tokenVariableCount, " variables dans les tokens")
                            };
                        }
                        // RÈGLE 3: Une seule variable = retour direct (mais seulement si vraiment une seule variable dans les tokens)
                        if (tokenVariableCount === 1) {
                            var singleValue = Object.values(resolvedVariables).find(function (v) { return v !== 0; });
                            console.log("[TreeBranchLeaf API] \u2705 STRAT\u00C9GIE: VALEUR UNIQUE (valeur: ".concat(singleValue, ")"));
                            return {
                                strategy: 'SINGLE_VALUE',
                                value: singleValue,
                                reason: 'Une seule variable dans les tokens'
                            };
                        }
                        // RÈGLE 4: Pas de données = neutre
                        console.log("[TreeBranchLeaf API] \u26A0\uFE0F STRAT\u00C9GIE: NEUTRE (aucune donn\u00E9e significative)");
                        return {
                            strategy: 'NEUTRAL',
                            value: 0,
                            reason: 'Aucune donnée disponible'
                        };
                    };
                    classified = universalAnalyzer(fieldValues);
                    strategy = intelligentStrategy(classified, resolvedVariables_1, { tokenVariablesCount: tokenVariables.length, tokensCount: tokens.length });
                    console.log("[TreeBranchLeaf API] \uD83D\uDE80 === EX\u00C9CUTION INTELLIGENTE ===");
                    console.log("[TreeBranchLeaf API] \uD83D\uDE80 Strat\u00E9gie choisie: ".concat(strategy.strategy));
                    console.log("[TreeBranchLeaf API] \uD83D\uDE80 Raison: ".concat(strategy.reason));
                    // EXÉCUTION SELON LA STRATÉGIE
                    if (strategy.strategy === 'USER_PRIORITY' || strategy.strategy === 'SINGLE_VALUE') {
                        rawValue = strategy.value;
                        console.log("[TreeBranchLeaf API] \u2705 === RETOUR DIRECT ===");
                        console.log("[TreeBranchLeaf API] \uD83D\uDD0D ANALYSE CONVERSION:");
                        console.log("[TreeBranchLeaf API] \uD83D\uDD0D - Valeur strategy.value: \"".concat(rawValue, "\""));
                        console.log("[TreeBranchLeaf API] \uD83D\uDD0D - Type de strategy.value: ".concat(typeof rawValue));
                        console.log("[TreeBranchLeaf API] \uD83D\uDD0D - String(rawValue): \"".concat(String(rawValue), "\""));
                        cleanedString = String(rawValue).replace(/\s+/g, '').replace(/,/g, '.');
                        console.log("[TreeBranchLeaf API] \uD83D\uDD0D - Apr\u00E8s nettoyage: \"".concat(cleanedString, "\""));
                        numValue = parseFloat(cleanedString);
                        console.log("[TreeBranchLeaf API] \uD83D\uDD0D - parseFloat r\u00E9sultat: ".concat(numValue));
                        console.log("[TreeBranchLeaf API] \uD83D\uDD0D - isNaN(numValue): ".concat(isNaN(numValue)));
                        finalValue = isNaN(numValue) ? 0 : numValue;
                        console.log("[TreeBranchLeaf API] \u2705 Valeur finale: ".concat(finalValue));
                        return [2 /*return*/, res.json({
                                success: true,
                                result: finalValue,
                                strategy: strategy.strategy,
                                reason: strategy.reason,
                                source: rawValue,
                                analysis: classified,
                                orchestrator: orchestrated_1 ? {
                                    strategy: orchestrated_1.strategy,
                                    operatorsDetected: orchestrated_1.operatorsDetected,
                                    trace: orchestrated_1.trace,
                                    resolvedVariables: orchestrated_1.resolvedVariables
                                } : null
                            })];
                    }
                    if (strategy.strategy === 'NEUTRAL') {
                        console.log("[TreeBranchLeaf API] \u26A0\uFE0F === RETOUR NEUTRE ===");
                        return [2 /*return*/, res.json({
                                success: true,
                                result: 0,
                                strategy: strategy.strategy,
                                reason: strategy.reason,
                                analysis: classified,
                                orchestrator: orchestrated_1 ? {
                                    strategy: orchestrated_1.strategy,
                                    operatorsDetected: orchestrated_1.operatorsDetected,
                                    trace: orchestrated_1.trace,
                                    resolvedVariables: orchestrated_1.resolvedVariables
                                } : null
                            })];
                    }
                    // MODE CALCUL AUTOMATIQUE - Le système détecte et calcule intelligemment
                    if (strategy.strategy === 'AUTO_CALCULATION') {
                        console.log("[TreeBranchLeaf API] \uD83E\uDDEE === MODE CALCUL AUTOMATIQUE ===");
                        console.log("[TreeBranchLeaf API] \uD83E\uDDEE Variables pour calcul:", resolvedVariables_1);
                        // Le système continue avec l'évaluation mathématique de la formule
                        console.log("[TreeBranchLeaf API] \uD83E\uDDEE Proc\u00E9dure automatique de calcul activ\u00E9e");
                    }
                    // MODE CALCUL: Évaluation de la formule mathématique
                    console.log("[TreeBranchLeaf API] \uD83E\uDDEE === MODE CALCUL ===");
                    console.log("[TreeBranchLeaf API] \uD83E\uDDEE Formule \u00E0 \u00E9valuer avec variables:", resolvedVariables_1);
                    evaluateTokens = function (tokens) {
                        console.log("[TreeBranchLeaf API] \uD83E\uDDEE === D\u00C9BUT \u00C9VALUATION COMPL\u00C8TE ===");
                        console.log("[TreeBranchLeaf API] \uD83E\uDDEE Tokens \u00E0 \u00E9valuer:", tokens);
                        console.log("[TreeBranchLeaf API] \uD83E\uDDEE Variables disponibles:", resolvedVariables_1);
                        var stack = [];
                        var operations = [];
                        console.log("[TreeBranchLeaf API] \uD83E\uDDEE D\u00E9but \u00E9valuation avec ".concat(tokens.length, " tokens:"), tokens.map(function (t) { return "".concat(t.type, ":").concat(t.value || t.name); }).join(' '));
                        // 🚀 CONVERSION INFIX → POSTFIX pour expressions mathématiques correctes
                        var convertToPostfix = function (tokens) {
                            var outputQueue = [];
                            var operatorStack = [];
                            var precedence = { '+': 1, '-': 1, '*': 2, '/': 2 };
                            console.log("[TreeBranchLeaf API] \uD83D\uDD04 Conversion infix \u2192 postfix pour:", tokens.map(function (t) { return t.value || t.name; }).join(' '));
                            for (var _i = 0, tokens_2 = tokens; _i < tokens_2.length; _i++) {
                                var token = tokens_2[_i];
                                if (token.type === 'value' || token.type === 'variable') {
                                    outputQueue.push(token);
                                }
                                else if (token.type === 'operator' && token.value && precedence[token.value]) {
                                    // Pop operators with higher or equal precedence
                                    while (operatorStack.length > 0 &&
                                        operatorStack[operatorStack.length - 1].type === 'operator' &&
                                        operatorStack[operatorStack.length - 1].value &&
                                        precedence[operatorStack[operatorStack.length - 1].value] >= precedence[token.value]) {
                                        outputQueue.push(operatorStack.pop());
                                    }
                                    operatorStack.push(token);
                                }
                            }
                            // Pop remaining operators
                            while (operatorStack.length > 0) {
                                outputQueue.push(operatorStack.pop());
                            }
                            console.log("[TreeBranchLeaf API] \u2705 Postfix converti:", outputQueue.map(function (t) { return t.value || t.variableId || t.name || 'unknown'; }).join(' '));
                            return outputQueue;
                        };
                        var postfixTokens = convertToPostfix(tokens);
                        // 🧮 ÉVALUATION des tokens en notation postfix
                        for (var i = 0; i < postfixTokens.length; i++) {
                            var token = postfixTokens[i];
                            if (!token)
                                continue;
                            if (token.type === 'value') {
                                var value = parseFloat(String(token.value));
                                var finalValue = isNaN(value) ? 0 : value;
                                stack.push(finalValue);
                                operations.push("PUSH(".concat(finalValue, ")"));
                                console.log("[TreeBranchLeaf API] \uD83D\uDCCA Valeur: ".concat(finalValue));
                            }
                            else if (token.type === 'variable') {
                                // 🚀 DYNAMIQUE: Support des deux formats de tokens (name ET variableId)
                                var varName = token.variableId || token.name || '';
                                var value = resolvedVariables_1[varName] || 0;
                                stack.push(value);
                                operations.push("PUSH(".concat(varName, "=").concat(value, ")"));
                                console.log("[TreeBranchLeaf API] \uD83D\uDD22 Variable: ".concat(varName, " = ").concat(value, " (propri\u00E9t\u00E9: ").concat(token.variableId ? 'variableId' : 'name', ")"));
                            }
                            else if (token.type === 'operator' && ['+', '-', '*', '/'].includes(String(token.value))) {
                                // Évaluation en notation postfix - l'opérateur vient après les opérandes
                                if (stack.length >= 2) {
                                    var b = stack.pop();
                                    var a = stack.pop();
                                    var result_1 = 0;
                                    var operator = String(token.value);
                                    switch (operator) {
                                        case '+':
                                            result_1 = a + b;
                                            operations.push("".concat(a, " + ").concat(b, " = ").concat(result_1));
                                            break;
                                        case '-':
                                            result_1 = a - b;
                                            operations.push("".concat(a, " - ").concat(b, " = ").concat(result_1));
                                            break;
                                        case '*':
                                            result_1 = a * b;
                                            operations.push("".concat(a, " * ").concat(b, " = ").concat(result_1));
                                            break;
                                        case '/':
                                            if (b !== 0) {
                                                result_1 = a / b;
                                                operations.push("".concat(a, " / ").concat(b, " = ").concat(result_1));
                                            }
                                            else {
                                                result_1 = 0;
                                                operations.push("".concat(a, " / ").concat(b, " = 0 (division par z\u00E9ro \u00E9vit\u00E9e)"));
                                                console.log("[TreeBranchLeaf API] \u26A0\uFE0F Division par z\u00E9ro \u00E9vit\u00E9e: ".concat(a, " / ").concat(b));
                                            }
                                            break;
                                    }
                                    stack.push(result_1);
                                    console.log("[TreeBranchLeaf API] \u26A1 Op\u00E9ration: ".concat(a, " ").concat(operator, " ").concat(b, " = ").concat(result_1));
                                }
                                else {
                                    console.log("[TreeBranchLeaf API] \u274C Pile insuffisante pour l'op\u00E9rateur ".concat(token.value, ", pile actuelle:"), stack);
                                    operations.push("ERREUR: Pile insuffisante pour ".concat(token.value));
                                }
                            }
                            else {
                                console.log("[TreeBranchLeaf API] \u26A0\uFE0F Token ignor\u00E9:", token);
                            }
                        }
                        var finalResult = stack.length > 0 ? stack[0] : 0;
                        console.log("[TreeBranchLeaf API] \uD83C\uDFAF R\u00E9sultat final: ".concat(finalResult));
                        console.log("[TreeBranchLeaf API] \uD83D\uDCDD Op\u00E9rations effectu\u00E9es:", operations);
                        return finalResult;
                    };
                    result = null;
                    if (tokens.length > 0) {
                        result = evaluateTokens(tokens);
                    }
                    else {
                        result = 0;
                    }
                    console.log("[TreeBranchLeaf API] \uD83E\uDDEE R\u00E9sultat du calcul:", result);
                    responseData = {
                        formulaId: formula.id,
                        formulaName: formula.name,
                        nodeLabel: ((_j = formula.TreeBranchLeafNode) === null || _j === void 0 ? void 0 : _j.label) || 'Nœud inconnu',
                        evaluation: {
                            success: result !== null,
                            result: result,
                            tokens: tokens,
                            resolvedVariables: resolvedVariables_1,
                            details: {
                                fieldValues: fieldValues,
                                timestamp: new Date().toISOString(),
                                testMode: testMode,
                                tokenCount: tokens.length,
                                variableCount: tokenVariables.length
                            }
                        },
                        orchestrator: orchestrated_1 ? {
                            strategy: orchestrated_1.strategy,
                            operatorsDetected: orchestrated_1.operatorsDetected,
                            trace: orchestrated_1.trace,
                            resolvedVariables: orchestrated_1.resolvedVariables
                        } : null
                    };
                    return [2 /*return*/, res.json(responseData)];
                }
                catch (evaluationError) {
                    console.error("[TreeBranchLeaf API] Erreur lors de l'\u00E9valuation:", evaluationError);
                    return [2 /*return*/, res.status(500).json({
                            error: 'Erreur lors de l\'évaluation de la formule',
                            details: evaluationError.message,
                            debug: {
                                formulaId: formulaId,
                                hasTokens: (function () {
                                    var maybeErr = evaluationError;
                                    if (maybeErr && Array.isArray(maybeErr.tokens))
                                        return maybeErr.tokens.length;
                                    return tokens.length;
                                })(),
                                receivedFieldValuesKeys: Object.keys(fieldValues),
                                orchestratorTrace: ((_l = (_k = orchestrated === null || orchestrated === void 0 ? void 0 : orchestrated.trace) === null || _k === void 0 ? void 0 : _k.slice) === null || _l === void 0 ? void 0 : _l.call(_k, 0, 10)) || null
                            }
                        })];
                }
                return [3 /*break*/, 3];
            case 2:
                error_52 = _o.sent();
                console.error('[TreeBranchLeaf API] Error evaluating formula:', error_52);
                res.status(500).json({ error: 'Erreur lors de l\'évaluation de la formule' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// POST /api/treebranchleaf/evaluate/batch
// Évalue plusieurs formules en une seule requête
router.post('/evaluate/batch', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, requests, _c, nodeIds, _d, fieldValues, _e, organizationId, isSuperAdmin, finalRequests, _i, nodeIds_3, nodeId, nodeFormulas, _f, nodeFormulas_1, formula, results, _loop_11, _g, finalRequests_1, request, error_53;
    var _h, _j, _k;
    return __generator(this, function (_l) {
        switch (_l.label) {
            case 0:
                _l.trys.push([0, 11, , 12]);
                _a = req.body, _b = _a.requests, requests = _b === void 0 ? [] : _b, _c = _a.nodeIds, nodeIds = _c === void 0 ? [] : _c, _d = _a.fieldValues, fieldValues = _d === void 0 ? {} : _d;
                _e = getAuthCtx(req), organizationId = _e.organizationId, isSuperAdmin = _e.isSuperAdmin;
                console.log("[TreeBranchLeaf API] \uD83E\uDDEE \u00C9valuation batch - requests: ".concat(requests.length, ", nodeIds: ").concat(nodeIds.length));
                finalRequests = [];
                if (!(Array.isArray(requests) && requests.length > 0)) return [3 /*break*/, 1];
                // Format classique
                finalRequests = requests;
                return [3 /*break*/, 6];
            case 1:
                if (!(Array.isArray(nodeIds) && nodeIds.length > 0)) return [3 /*break*/, 6];
                // Format nodeIds - on doit récupérer les formules des nœuds
                console.log("[TreeBranchLeaf API] \uD83D\uDD0D R\u00E9cup\u00E9ration formules pour nodeIds:", nodeIds);
                _i = 0, nodeIds_3 = nodeIds;
                _l.label = 2;
            case 2:
                if (!(_i < nodeIds_3.length)) return [3 /*break*/, 5];
                nodeId = nodeIds_3[_i];
                return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findMany({
                        where: { nodeId: nodeId },
                        select: { id: true, name: true }
                    })];
            case 3:
                nodeFormulas = _l.sent();
                for (_f = 0, nodeFormulas_1 = nodeFormulas; _f < nodeFormulas_1.length; _f++) {
                    formula = nodeFormulas_1[_f];
                    finalRequests.push({
                        formulaId: formula.id,
                        fieldValues: fieldValues,
                        testMode: false
                    });
                }
                _l.label = 4;
            case 4:
                _i++;
                return [3 /*break*/, 2];
            case 5:
                console.log("[TreeBranchLeaf API] \uD83D\uDD0D Formules trouv\u00E9es: ".concat(finalRequests.length, " pour ").concat(nodeIds.length, " n\u0153uds"));
                _l.label = 6;
            case 6:
                if (finalRequests.length === 0) {
                    return [2 /*return*/, res.status(400).json({ error: 'Aucune formule à évaluer dans la requête batch' })];
                }
                results = [];
                _loop_11 = function (request) {
                    var formulaId, _o, fieldValues_2, _p, testMode, formula, nodeOrg, tokens, tokenVariables, resolvedVariables_2, _q, tokenVariables_1, varName, rawValue, numValue, evaluateTokens, result, evaluationError_1;
                    return __generator(this, function (_r) {
                        switch (_r.label) {
                            case 0:
                                formulaId = request.formulaId, _o = request.fieldValues, fieldValues_2 = _o === void 0 ? {} : _o, _p = request.testMode, testMode = _p === void 0 ? true : _p;
                                if (!formulaId) {
                                    results.push({
                                        formulaId: null,
                                        error: 'formulaId manquant',
                                        success: false
                                    });
                                    return [2 /*return*/, "continue"];
                                }
                                _r.label = 1;
                            case 1:
                                _r.trys.push([1, 3, , 4]);
                                return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findUnique({
                                        where: { id: formulaId },
                                        include: {
                                            TreeBranchLeafNode: {
                                                select: {
                                                    label: true,
                                                    treeId: true,
                                                    TreeBranchLeafTree: {
                                                        select: { organizationId: true }
                                                    }
                                                }
                                            }
                                        }
                                    })];
                            case 2:
                                formula = _r.sent();
                                if (!formula) {
                                    results.push({
                                        formulaId: formulaId,
                                        error: 'Formule non trouvée',
                                        success: false
                                    });
                                    return [2 /*return*/, "continue"];
                                }
                                nodeOrg = (_j = (_h = formula.TreeBranchLeafNode) === null || _h === void 0 ? void 0 : _h.TreeBranchLeafTree) === null || _j === void 0 ? void 0 : _j.organizationId;
                                if (!isSuperAdmin && nodeOrg && nodeOrg !== organizationId) {
                                    results.push({
                                        formulaId: formulaId,
                                        error: 'Accès refusé à cette formule',
                                        success: false
                                    });
                                    return [2 /*return*/, "continue"];
                                }
                                tokens = Array.isArray(formula.tokens) ? formula.tokens : [];
                                tokenVariables = tokens
                                    .filter(function (t) { return Boolean(t) && t.type === 'variable'; })
                                    .map(function (t) { return t.name; })
                                    .filter(Boolean);
                                resolvedVariables_2 = {};
                                for (_q = 0, tokenVariables_1 = tokenVariables; _q < tokenVariables_1.length; _q++) {
                                    varName = tokenVariables_1[_q];
                                    rawValue = fieldValues_2[varName];
                                    numValue = rawValue != null && rawValue !== ''
                                        ? parseFloat(String(rawValue).replace(/\s+/g, '').replace(/,/g, '.'))
                                        : 0;
                                    resolvedVariables_2[varName] = isNaN(numValue) ? 0 : numValue;
                                }
                                evaluateTokens = function (tokens) {
                                    var stack = [];
                                    for (var _i = 0, tokens_3 = tokens; _i < tokens_3.length; _i++) {
                                        var token = tokens_3[_i];
                                        if (!token)
                                            continue;
                                        if (token.type === 'value') {
                                            var value = parseFloat(String(token.value));
                                            stack.push(isNaN(value) ? 0 : value);
                                        }
                                        else if (token.type === 'variable') {
                                            // 🚀 DYNAMIQUE: Support des deux formats de tokens (variableId ET name)
                                            var varName = token.variableId || token.name || '';
                                            var value = resolvedVariables_2[varName] || 0;
                                            stack.push(value);
                                        }
                                        else if (token.type === 'operator' && ['+', '-', '*', '/'].includes(String(token.value))) {
                                            if (stack.length >= 2) {
                                                var b = stack.pop();
                                                var a = stack.pop();
                                                var result_2 = 0;
                                                switch (token.value) {
                                                    case '+':
                                                        result_2 = a + b;
                                                        break;
                                                    case '-':
                                                        result_2 = a - b;
                                                        break;
                                                    case '*':
                                                        result_2 = a * b;
                                                        break;
                                                    case '/':
                                                        result_2 = b !== 0 ? a / b : 0;
                                                        break;
                                                }
                                                stack.push(result_2);
                                            }
                                        }
                                    }
                                    return stack.length > 0 ? stack[0] : 0;
                                };
                                result = null;
                                if (tokens.length > 0) {
                                    result = evaluateTokens(tokens);
                                }
                                else {
                                    result = 0;
                                }
                                results.push({
                                    formulaId: formula.id,
                                    formulaName: formula.name,
                                    nodeLabel: ((_k = formula.TreeBranchLeafNode) === null || _k === void 0 ? void 0 : _k.label) || 'Nœud inconnu',
                                    success: true,
                                    evaluation: {
                                        success: result !== null,
                                        result: result,
                                        tokens: tokens,
                                        resolvedVariables: resolvedVariables_2,
                                        details: {
                                            fieldValues: fieldValues_2,
                                            timestamp: new Date().toISOString(),
                                            testMode: testMode,
                                            tokenCount: tokens.length,
                                            variableCount: tokenVariables.length
                                        }
                                    }
                                });
                                return [3 /*break*/, 4];
                            case 3:
                                evaluationError_1 = _r.sent();
                                console.error("[TreeBranchLeaf API] Erreur \u00E9valuation batch formule ".concat(formulaId, ":"), evaluationError_1);
                                results.push({
                                    formulaId: formulaId,
                                    error: "Erreur d'\u00E9valuation: ".concat(evaluationError_1.message),
                                    success: false
                                });
                                return [3 /*break*/, 4];
                            case 4: return [2 /*return*/];
                        }
                    });
                };
                _g = 0, finalRequests_1 = finalRequests;
                _l.label = 7;
            case 7:
                if (!(_g < finalRequests_1.length)) return [3 /*break*/, 10];
                request = finalRequests_1[_g];
                return [5 /*yield**/, _loop_11(request)];
            case 8:
                _l.sent();
                _l.label = 9;
            case 9:
                _g++;
                return [3 /*break*/, 7];
            case 10:
                console.log("[TreeBranchLeaf API] \uD83E\uDDEE Batch termin\u00E9: ".concat(results.filter(function (r) { return r.success; }).length, "/").concat(results.length, " succ\u00E8s"));
                return [2 /*return*/, res.json({
                        success: true,
                        totalRequests: finalRequests.length,
                        successCount: results.filter(function (r) { return r.success; }).length,
                        results: results
                    })];
            case 11:
                error_53 = _l.sent();
                console.error('[TreeBranchLeaf API] Error in batch evaluation:', error_53);
                res.status(500).json({ error: 'Erreur lors de l\'évaluation batch' });
                return [3 /*break*/, 12];
            case 12: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// 🔧 HELPER FUNCTIONS
// =============================================================================
// Fonction helper pour vérifier l'accès à un nœud par organisation
function ensureNodeOrgAccess(prisma, nodeId, auth) {
    return __awaiter(this, void 0, void 0, function () {
        var node, tree, error_54;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({
                            where: { id: nodeId },
                            select: { treeId: true }
                        })];
                case 1:
                    node = _a.sent();
                    if (!node) {
                        return [2 /*return*/, { ok: false, status: 404, error: 'Nœud non trouvé' }];
                    }
                    // Super admin a accès à tout
                    if (auth.isSuperAdmin) {
                        return [2 /*return*/, { ok: true }];
                    }
                    return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({
                            where: { id: node.treeId },
                            select: { organizationId: true }
                        })];
                case 2:
                    tree = _a.sent();
                    if (!tree) {
                        return [2 /*return*/, { ok: false, status: 404, error: 'Arbre non trouvé' }];
                    }
                    // Vérifier correspondance organisation
                    if (tree.organizationId && tree.organizationId !== auth.organizationId) {
                        return [2 /*return*/, { ok: false, status: 403, error: 'Accès refusé' }];
                    }
                    return [2 /*return*/, { ok: true }];
                case 3:
                    error_54 = _a.sent();
                    console.error('Error checking node org access:', error_54);
                    return [2 /*return*/, { ok: false, status: 500, error: 'Erreur de vérification d\'accès' }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// =============================================================================
// 🆔 ENDPOINTS DIRECTS PAR ID - Pour récupération dynamique
// =============================================================================
// GET /api/treebranchleaf/conditions/:conditionId
// Récupère une condition spécifique par son ID
router.get('/conditions/:conditionId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var conditionId, _a, organizationId, isSuperAdmin, condition, nodeOrg, error_55;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                conditionId = req.params.conditionId;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                console.log("[TreeBranchLeaf API] \uD83D\uDD0D GET condition par ID: ".concat(conditionId));
                return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.findUnique({
                        where: { id: conditionId },
                        include: {
                            TreeBranchLeafNode: {
                                select: {
                                    label: true,
                                    treeId: true,
                                    TreeBranchLeafTree: {
                                        select: { organizationId: true }
                                    }
                                }
                            }
                        }
                    })];
            case 1:
                condition = _d.sent();
                if (!condition) {
                    console.log("[TreeBranchLeaf API] \u274C Condition ".concat(conditionId, " non trouv\u00E9e"));
                    return [2 /*return*/, res.status(404).json({ error: 'Condition non trouvée' })];
                }
                nodeOrg = (_c = (_b = condition.TreeBranchLeafNode) === null || _b === void 0 ? void 0 : _b.TreeBranchLeafTree) === null || _c === void 0 ? void 0 : _c.organizationId;
                if (!isSuperAdmin && nodeOrg && nodeOrg !== organizationId) {
                    console.log("[TreeBranchLeaf API] \u274C Acc\u00E8s refus\u00E9 \u00E0 condition ".concat(conditionId, " (org: ").concat(nodeOrg, " vs ").concat(organizationId, ")"));
                    return [2 /*return*/, res.status(403).json({ error: 'Accès refusé à cette condition' })];
                }
                console.log("[TreeBranchLeaf API] \u2705 Condition ".concat(conditionId, " trouv\u00E9e et autoris\u00E9e"));
                return [2 /*return*/, res.json(condition)];
            case 2:
                error_55 = _d.sent();
                console.error('[TreeBranchLeaf API] Error getting condition by ID:', error_55);
                res.status(500).json({ error: 'Erreur lors de la récupération de la condition' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// GET /api/treebranchleaf/formulas/:formulaId
// Récupère une formule spécifique par son ID
router.get('/formulas/:formulaId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var formulaId, _a, organizationId, isSuperAdmin, formula, nodeOrg, error_56;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                formulaId = req.params.formulaId;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                console.log("[TreeBranchLeaf API] \uD83D\uDD0D GET formule par ID: ".concat(formulaId));
                return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findUnique({
                        where: { id: formulaId },
                        include: {
                            TreeBranchLeafNode: {
                                select: {
                                    label: true,
                                    treeId: true,
                                    TreeBranchLeafTree: {
                                        select: { organizationId: true }
                                    }
                                }
                            }
                        }
                    })];
            case 1:
                formula = _d.sent();
                if (!formula) {
                    console.log("[TreeBranchLeaf API] \u274C Formule ".concat(formulaId, " non trouv\u00E9e"));
                    return [2 /*return*/, res.status(404).json({ error: 'Formule non trouvée' })];
                }
                nodeOrg = (_c = (_b = formula.TreeBranchLeafNode) === null || _b === void 0 ? void 0 : _b.TreeBranchLeafTree) === null || _c === void 0 ? void 0 : _c.organizationId;
                if (!isSuperAdmin && nodeOrg && nodeOrg !== organizationId) {
                    console.log("[TreeBranchLeaf API] \u274C Acc\u00E8s refus\u00E9 \u00E0 formule ".concat(formulaId, " (org: ").concat(nodeOrg, " vs ").concat(organizationId, ")"));
                    return [2 /*return*/, res.status(403).json({ error: 'Accès refusé à cette formule' })];
                }
                console.log("[TreeBranchLeaf API] \u2705 Formule ".concat(formulaId, " trouv\u00E9e et autoris\u00E9e"));
                return [2 /*return*/, res.json(formula)];
            case 2:
                error_56 = _d.sent();
                console.error('[TreeBranchLeaf API] Error getting formula by ID:', error_56);
                res.status(500).json({ error: 'Erreur lors de la récupération de la formule' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// 📋 SUBMISSIONS - Gestion des soumissions TreeBranchLeaf
// =============================================================================
// GET /api/treebranchleaf/submissions - Lister les soumissions avec filtres
router.get('/submissions', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, organizationId, isSuperAdmin, _b, treeId, leadId, userId, whereClause, submissions, error_57;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                _b = req.query, treeId = _b.treeId, leadId = _b.leadId, userId = _b.userId;
                console.log("[TreeBranchLeaf API] \uD83D\uDCCB GET submissions avec filtres:", { treeId: treeId, leadId: leadId, userId: userId });
                whereClause = {};
                if (treeId)
                    whereClause.treeId = treeId;
                if (leadId)
                    whereClause.leadId = leadId;
                if (userId)
                    whereClause.userId = userId;
                // Filtrer par organisation si pas super admin
                if (!isSuperAdmin && organizationId) {
                    whereClause.TreeBranchLeafTree = {
                        organizationId: organizationId
                    };
                }
                return [4 /*yield*/, prisma.treeBranchLeafSubmission.findMany({
                        where: whereClause,
                        include: {
                            TreeBranchLeafTree: {
                                select: {
                                    id: true,
                                    name: true,
                                    organizationId: true
                                }
                            },
                            TreeBranchLeafSubmissionData: {
                                include: {
                                    TreeBranchLeafNode: {
                                        select: {
                                            id: true,
                                            label: true,
                                            type: true
                                        }
                                    }
                                }
                            },
                            Lead: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                    company: true
                                }
                            },
                            User_TreeBranchLeafSubmission_userIdToUser: {
                                select: {
                                    id: true,
                                    email: true,
                                    firstName: true,
                                    lastName: true
                                }
                            }
                        },
                        orderBy: { createdAt: 'desc' }
                    })];
            case 1:
                submissions = _c.sent();
                console.log("[TreeBranchLeaf API] \u2705 ".concat(submissions.length, " soumissions trouv\u00E9es"));
                res.json(submissions);
                return [3 /*break*/, 3];
            case 2:
                error_57 = _c.sent();
                console.error('[TreeBranchLeaf API] Error fetching submissions:', error_57);
                res.status(500).json({ error: 'Erreur lors de la récupération des soumissions' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// GET /submissions/by-leads - Récupérer les devis groupés par lead
router.get('/submissions/by-leads', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authCtx, organizationId, isSuperAdmin, _a, treeId, search, leadId, submissionWhere, leadWhere, leadsWithSubmissions, formattedData, error_58;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                authCtx = getAuthCtx(req);
                organizationId = authCtx.organizationId, isSuperAdmin = authCtx.isSuperAdmin;
                _a = req.query, treeId = _a.treeId, search = _a.search, leadId = _a.leadId;
                console.log("[TreeBranchLeaf API] \uD83D\uDCCB GET devis par leads - TreeId: ".concat(treeId, ", Search: ").concat(search, ", LeadId: ").concat(leadId));
                submissionWhere = {};
                if (treeId) {
                    submissionWhere.treeId = treeId;
                }
                if (leadId) {
                    submissionWhere.leadId = leadId;
                }
                if (!isSuperAdmin) {
                    submissionWhere.TreeBranchLeafTree = {
                        organizationId: organizationId
                    };
                }
                leadWhere = {};
                if (leadId) {
                    leadWhere.id = leadId;
                }
                if (!isSuperAdmin) {
                    leadWhere.organizationId = organizationId;
                }
                if (search) {
                    leadWhere.OR = [
                        { firstName: { contains: search, mode: 'insensitive' } },
                        { lastName: { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } }
                    ];
                }
                return [4 /*yield*/, prisma.lead.findMany({
                        where: __assign(__assign({}, leadWhere), { TreeBranchLeafSubmission: {
                                some: submissionWhere
                            } }),
                        include: {
                            TreeBranchLeafSubmission: {
                                where: submissionWhere,
                                select: {
                                    id: true,
                                    status: true,
                                    summary: true,
                                    createdAt: true,
                                    updatedAt: true,
                                    TreeBranchLeafTree: {
                                        select: { id: true, name: true }
                                    }
                                },
                                orderBy: { createdAt: 'desc' }
                            }
                        },
                        orderBy: [
                            { firstName: 'asc' },
                            { lastName: 'asc' }
                        ]
                    })];
            case 1:
                leadsWithSubmissions = _b.sent();
                console.log("[TreeBranchLeaf API] \uD83D\uDCCA Trouv\u00E9 ".concat(leadsWithSubmissions.length, " leads avec devis"));
                formattedData = leadsWithSubmissions.map(function (lead) { return ({
                    id: lead.id,
                    firstName: lead.firstName,
                    lastName: lead.lastName,
                    email: lead.email,
                    company: lead.company,
                    submissions: lead.TreeBranchLeafSubmission.map(function (submission) {
                        var _a, _b;
                        return ({
                            id: submission.id,
                            name: ((_a = submission.summary) === null || _a === void 0 ? void 0 : _a.name) || "Devis ".concat(new Date(submission.createdAt).toLocaleDateString('fr-FR')),
                            status: submission.status,
                            createdAt: submission.createdAt,
                            updatedAt: submission.updatedAt,
                            treeName: (_b = submission.TreeBranchLeafTree) === null || _b === void 0 ? void 0 : _b.name
                        });
                    })
                }); });
                res.json(formattedData);
                return [3 /*break*/, 3];
            case 2:
                error_58 = _b.sent();
                console.error('[TreeBranchLeaf API] Error getting submissions by leads:', error_58);
                res.status(500).json({ error: 'Erreur lors de la récupération des devis par leads' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// GET /api/treebranchleaf/submissions/:id - Récupérer une soumission spécifique
router.get('/submissions/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, organizationId, isSuperAdmin, id, submission, treeOrg, error_59;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                id = req.params.id;
                console.log("[TreeBranchLeaf API] \uD83D\uDCCB GET submission par ID: ".concat(id));
                return [4 /*yield*/, prisma.treeBranchLeafSubmission.findUnique({
                        where: { id: id },
                        include: {
                            TreeBranchLeafTree: {
                                select: {
                                    id: true,
                                    name: true,
                                    organizationId: true
                                }
                            },
                            TreeBranchLeafSubmissionData: {
                                include: {
                                    TreeBranchLeafNode: {
                                        select: {
                                            id: true,
                                            label: true,
                                            type: true
                                        }
                                    }
                                }
                            },
                            Lead: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                    company: true
                                }
                            },
                            User: {
                                select: {
                                    id: true,
                                    email: true,
                                    firstName: true,
                                    lastName: true
                                }
                            }
                        }
                    })];
            case 1:
                submission = _c.sent();
                if (!submission) {
                    console.log("[TreeBranchLeaf API] \u274C Soumission ".concat(id, " non trouv\u00E9e"));
                    return [2 /*return*/, res.status(404).json({ error: 'Soumission non trouvée' })];
                }
                treeOrg = (_b = submission.TreeBranchLeafTree) === null || _b === void 0 ? void 0 : _b.organizationId;
                if (!isSuperAdmin && treeOrg && treeOrg !== organizationId) {
                    console.log("[TreeBranchLeaf API] \u274C Acc\u00E8s refus\u00E9 \u00E0 soumission ".concat(id, " (org: ").concat(treeOrg, " vs ").concat(organizationId, ")"));
                    return [2 /*return*/, res.status(403).json({ error: 'Accès refusé à cette soumission' })];
                }
                console.log("[TreeBranchLeaf API] \u2705 Soumission ".concat(id, " trouv\u00E9e et autoris\u00E9e"));
                res.json(submission);
                return [3 /*break*/, 3];
            case 2:
                error_59 = _c.sent();
                console.error('[TreeBranchLeaf API] Error fetching submission:', error_59);
                res.status(500).json({ error: 'Erreur lors de la récupération de la soumission' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 🗂️ GET /api/treebranchleaf/submissions/:id/fields - Récupérer TOUS les champs d'une soumission
router.get('/submissions/:id/fields', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, organizationId, isSuperAdmin, id, submission, treeOrg, dataRows, fieldsMap, _i, dataRows_1, row, node, key, response, error_60;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 3, , 4]);
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                id = req.params.id;
                console.log("[TreeBranchLeaf API] \uD83D\uDDC2\uFE0F GET /submissions/".concat(id, "/fields - R\u00E9cup\u00E9ration de tous les champs"));
                return [4 /*yield*/, prisma.treeBranchLeafSubmission.findUnique({
                        where: { id: id },
                        include: {
                            TreeBranchLeafTree: { select: { id: true, organizationId: true } },
                            Lead: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                    phone: true,
                                    street: true,
                                    streetNumber: true,
                                    postalCode: true,
                                    city: true,
                                    company: true
                                }
                            }
                        }
                    })];
            case 1:
                submission = _d.sent();
                if (!submission) {
                    return [2 /*return*/, res.status(404).json({ error: 'Soumission non trouvée' })];
                }
                treeOrg = (_b = submission.TreeBranchLeafTree) === null || _b === void 0 ? void 0 : _b.organizationId;
                if (!isSuperAdmin && treeOrg && treeOrg !== organizationId) {
                    return [2 /*return*/, res.status(403).json({ error: 'Accès refusé' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.findMany({
                        where: { submissionId: id },
                        include: {
                            TreeBranchLeafNode: {
                                select: {
                                    id: true,
                                    type: true,
                                    label: true,
                                    name: true,
                                    fieldType: true,
                                    fieldSubType: true
                                }
                            }
                        },
                        orderBy: { createdAt: 'asc' }
                    })];
            case 2:
                dataRows = _d.sent();
                fieldsMap = {};
                for (_i = 0, dataRows_1 = dataRows; _i < dataRows_1.length; _i++) {
                    row = dataRows_1[_i];
                    node = row.TreeBranchLeafNode;
                    if (!node)
                        continue;
                    key = node.name || node.label || node.id;
                    fieldsMap[key] = {
                        nodeId: node.id,
                        label: node.label || '',
                        name: node.name,
                        type: node.type || 'unknown',
                        fieldType: node.fieldType,
                        fieldSubType: node.fieldSubType,
                        value: row.value, // Valeur parsée (JSON)
                        rawValue: row.rawValue // Valeur brute (string)
                    };
                }
                response = {
                    submissionId: submission.id,
                    treeId: submission.treeId,
                    treeName: (_c = submission.TreeBranchLeafTree) === null || _c === void 0 ? void 0 : _c.id,
                    leadId: submission.leadId,
                    lead: submission.Lead ? {
                        id: submission.Lead.id,
                        firstName: submission.Lead.firstName,
                        lastName: submission.Lead.lastName,
                        fullName: "".concat(submission.Lead.firstName || '', " ").concat(submission.Lead.lastName || '').trim(),
                        email: submission.Lead.email,
                        phone: submission.Lead.phone,
                        street: submission.Lead.street,
                        streetNumber: submission.Lead.streetNumber,
                        postalCode: submission.Lead.postalCode,
                        city: submission.Lead.city,
                        company: submission.Lead.company,
                        fullAddress: [
                            submission.Lead.street,
                            submission.Lead.streetNumber,
                            submission.Lead.postalCode,
                            submission.Lead.city
                        ].filter(Boolean).join(', ')
                    } : null,
                    status: submission.status,
                    createdAt: submission.createdAt,
                    updatedAt: submission.updatedAt,
                    fields: fieldsMap, // Tous les champs de la soumission
                    totalFields: Object.keys(fieldsMap).length
                };
                console.log("[TreeBranchLeaf API] \u2705 ".concat(response.totalFields, " champs r\u00E9cup\u00E9r\u00E9s pour soumission ").concat(id));
                res.json(response);
                return [3 /*break*/, 4];
            case 3:
                error_60 = _d.sent();
                console.error('[TreeBranchLeaf API] ❌ Erreur GET /submissions/:id/fields:', error_60);
                res.status(500).json({ error: 'Erreur lors de la récupération des champs' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// GET /api/treebranchleaf/submissions/:id/summary - Résumé des données d'une soumission
router.get('/submissions/:id/summary', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, organizationId, isSuperAdmin, submission, treeOrg, dataRows, isFilled_1, total, filled, empty, optionRows, optionTotal, optionFilled, optionEmpty, variablesTotal, completion, error_61;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 3, , 4]);
                id = req.params.id;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                return [4 /*yield*/, prisma.treeBranchLeafSubmission.findUnique({
                        where: { id: id },
                        include: { TreeBranchLeafTree: { select: { id: true, organizationId: true } } }
                    })];
            case 1:
                submission = _c.sent();
                if (!submission) {
                    return [2 /*return*/, res.status(404).json({ error: 'Soumission non trouvée' })];
                }
                treeOrg = (_b = submission.TreeBranchLeafTree) === null || _b === void 0 ? void 0 : _b.organizationId;
                if (!isSuperAdmin && treeOrg && treeOrg !== organizationId) {
                    return [2 /*return*/, res.status(403).json({ error: 'Accès refusé à cette soumission' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.findMany({
                        where: { submissionId: id },
                        include: {
                            TreeBranchLeafNode: { select: { id: true, type: true, label: true } }
                        }
                    })];
            case 2:
                dataRows = _c.sent();
                isFilled_1 = function (v) { return v != null && String(v).trim() !== ''; };
                total = dataRows.length;
                filled = dataRows.filter(function (r) { return isFilled_1(r.value); }).length;
                empty = total - filled;
                optionRows = dataRows.filter(function (r) {
                    var node = r.TreeBranchLeafNode;
                    var t = node === null || node === void 0 ? void 0 : node.type;
                    return t === 'leaf_option_field' || t === 'option_field' || t === 5;
                });
                optionTotal = optionRows.length;
                optionFilled = optionRows.filter(function (r) { return isFilled_1(r.value); }).length;
                optionEmpty = optionTotal - optionFilled;
                variablesTotal = dataRows.filter(function (r) { return r.isVariable === true; }).length;
                completion = total > 0 ? Math.round((filled / total) * 100) : 0;
                return [2 /*return*/, res.json({
                        submissionId: id,
                        treeId: submission.treeId,
                        status: submission.status,
                        updatedAt: submission.updatedAt,
                        counts: {
                            total: total,
                            filled: filled,
                            empty: empty,
                            optionFields: { total: optionTotal, filled: optionFilled, empty: optionEmpty },
                            variables: { total: variablesTotal }
                        },
                        completion: completion
                    })];
            case 3:
                error_61 = _c.sent();
                console.error('[TreeBranchLeaf API] ❌ Erreur GET /submissions/:id/summary:', error_61);
                return [2 /*return*/, res.status(500).json({ error: 'Erreur lors du calcul du résumé de la soumission' })];
            case 4: return [2 /*return*/];
        }
    });
}); });
// GET /api/treebranchleaf/submissions/:id/operations - Timeline détaillée des opérations/data
router.get('/submissions/:id/operations', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id_1, _a, organizationId, isSuperAdmin, submission, treeOrg, rows_2, treeVariables, pseudoRows, inferSource_1, treeId, allTreeNodes, labelMap_1, valuesMap_1, _i, rows_1, r, nodeLabel, ensureNodeLabels_1, resolveDetailForRow_1, items, error_62;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 7, , 8]);
                id_1 = req.params.id;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                return [4 /*yield*/, prisma.treeBranchLeafSubmission.findUnique({
                        where: { id: id_1 },
                        select: {
                            id: true,
                            treeId: true,
                            TreeBranchLeafTree: { select: { id: true, organizationId: true } }
                        }
                    })];
            case 1:
                submission = _d.sent();
                if (!submission)
                    return [2 /*return*/, res.status(404).json({ error: 'Soumission non trouvée' })];
                treeOrg = (_b = submission.TreeBranchLeafTree) === null || _b === void 0 ? void 0 : _b.organizationId;
                if (!isSuperAdmin && treeOrg && treeOrg !== organizationId) {
                    return [2 /*return*/, res.status(403).json({ error: 'Accès refusé à cette soumission' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.findMany({
                        where: { submissionId: id_1 },
                        include: {
                            TreeBranchLeafNode: { select: { id: true, label: true, type: true } }
                        },
                        // TreeBranchLeafSubmissionData n'a pas de colonne updatedAt -> trier par lastResolved puis createdAt
                        orderBy: [
                            { lastResolved: 'desc' },
                            { createdAt: 'desc' }
                        ]
                    })];
            case 2:
                rows_2 = _d.sent();
                if (!(rows_2.length === 0)) return [3 /*break*/, 4];
                console.log("[TBL Operations] Aucune donn\u00E9e de soumission trouv\u00E9e pour ".concat(id_1, ", r\u00E9cup\u00E9ration des variables configur\u00E9es..."));
                if (!(submission === null || submission === void 0 ? void 0 : submission.treeId)) return [3 /*break*/, 4];
                return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findMany({
                        where: { TreeBranchLeafNode: { treeId: submission.treeId } },
                        select: {
                            id: true,
                            nodeId: true,
                            exposedKey: true,
                            displayName: true,
                            unit: true,
                            defaultValue: true,
                            fixedValue: true,
                            sourceRef: true,
                            TreeBranchLeafNode: { select: { id: true, label: true, type: true } }
                        }
                    })];
            case 3:
                treeVariables = _d.sent();
                pseudoRows = treeVariables.map(function (v) {
                    var _a;
                    return ({
                        nodeId: v.nodeId,
                        submissionId: id_1,
                        isVariable: true,
                        fieldLabel: ((_a = v.TreeBranchLeafNode) === null || _a === void 0 ? void 0 : _a.label) || null,
                        variableDisplayName: v.displayName,
                        variableKey: v.exposedKey,
                        variableUnit: v.unit,
                        sourceRef: v.sourceRef,
                        // 🎯 CORRECTION: Utiliser fixedValue ou defaultValue comme valeur
                        // 🚧 TEMPORAIRE: Valeurs de test hardcodées pour validation
                        value: getTestValueForNode(v.nodeId, v.fixedValue, v.defaultValue),
                        operationSource: null,
                        operationDetail: null,
                        operationResult: null,
                        lastResolved: null,
                        createdAt: new Date(),
                        TreeBranchLeafNode: v.TreeBranchLeafNode
                    });
                });
                console.log("[TBL Operations] ".concat(pseudoRows.length, " variables configur\u00E9es trouv\u00E9es"));
                console.log("[TBL Operations] Variables avec valeurs:", pseudoRows.map(function (r) { return ({ nodeId: r.nodeId, label: r.fieldLabel, value: r.value }); }));
                console.log("[TBL Operations] Variables brutes:", treeVariables.map(function (v) { return ({ nodeId: v.nodeId, displayName: v.displayName, fixedValue: v.fixedValue, defaultValue: v.defaultValue }); }));
                rows_2.push.apply(rows_2, pseudoRows);
                _d.label = 4;
            case 4:
                inferSource_1 = function (sourceRef) {
                    var s = (sourceRef || '').toLowerCase();
                    if (s.includes('formula') || s.includes('formule'))
                        return 'formula';
                    if (s.includes('condition'))
                        return 'condition';
                    if (s.includes('table'))
                        return 'table';
                    return 'neutral';
                };
                treeId = submission === null || submission === void 0 ? void 0 : submission.treeId;
                if (!treeId) {
                    return [2 /*return*/, res.status(404).json({ error: 'Soumission non trouvée' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                        where: { treeId: treeId },
                        select: { id: true, label: true }
                    })];
            case 5:
                allTreeNodes = _d.sent();
                labelMap_1 = new Map(allTreeNodes.map(function (n) { return [n.id, n.label || null]; }));
                valuesMap_1 = new Map(rows_2.map(function (r) { return [r.nodeId, r.value == null ? null : String(r.value)]; }));
                // Compléter avec les labels spécifiques de la soumission si présents
                for (_i = 0, rows_1 = rows_2; _i < rows_1.length; _i++) {
                    r = rows_1[_i];
                    nodeLabel = ((_c = r.TreeBranchLeafNode) === null || _c === void 0 ? void 0 : _c.label) || r.fieldLabel;
                    if (nodeLabel && nodeLabel !== labelMap_1.get(r.nodeId)) {
                        labelMap_1.set(r.nodeId, nodeLabel);
                    }
                }
                ensureNodeLabels_1 = function (ids) { return __awaiter(void 0, void 0, void 0, function () {
                    var list, missing, extra, _i, extra_1, n;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                list = Array.isArray(ids) ? ids : Array.from(ids);
                                missing = list.filter(function (id) { return !!id && !labelMap_1.has(id); });
                                if (missing.length === 0)
                                    return [2 /*return*/];
                                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({ where: { id: { in: missing } }, select: { id: true, label: true } })];
                            case 1:
                                extra = _a.sent();
                                for (_i = 0, extra_1 = extra; _i < extra_1.length; _i++) {
                                    n = extra_1[_i];
                                    labelMap_1.set(n.id, n.label || null);
                                }
                                return [2 /*return*/];
                        }
                    });
                }); };
                resolveDetailForRow_1 = function (r) { return __awaiter(void 0, void 0, void 0, function () {
                    var det, parsed_1, rec, rec, rec, parsed, rec, rec, rec;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                det = r.operationDetail;
                                if (!(det && det.type)) return [3 /*break*/, 7];
                                parsed_1 = parseSourceRef(r.sourceRef);
                                if (!((parsed_1 === null || parsed_1 === void 0 ? void 0 : parsed_1.type) === 'condition')) return [3 /*break*/, 2];
                                return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.findUnique({ where: { id: parsed_1.id }, select: { id: true, name: true, description: true, conditionSet: true, nodeId: true } })];
                            case 1:
                                rec = _a.sent();
                                return [2 /*return*/, buildOperationDetail('condition', rec)];
                            case 2:
                                if (!((parsed_1 === null || parsed_1 === void 0 ? void 0 : parsed_1.type) === 'formula')) return [3 /*break*/, 4];
                                return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findUnique({ where: { id: parsed_1.id }, select: { id: true, name: true, description: true, tokens: true, nodeId: true } })];
                            case 3:
                                rec = _a.sent();
                                return [2 /*return*/, buildOperationDetail('formula', rec)];
                            case 4:
                                if (!((parsed_1 === null || parsed_1 === void 0 ? void 0 : parsed_1.type) === 'table')) return [3 /*break*/, 6];
                                return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findUnique({ where: { id: parsed_1.id }, select: { id: true, name: true, description: true, type: true, nodeId: true } })];
                            case 5:
                                rec = _a.sent();
                                return [2 /*return*/, buildOperationDetail('table', rec)];
                            case 6: return [2 /*return*/, det]; // laisser tel quel si pas de sourceRef exploitable
                            case 7:
                                parsed = parseSourceRef(r.sourceRef);
                                if (!parsed)
                                    return [2 /*return*/, det || null];
                                if (!(parsed.type === 'condition')) return [3 /*break*/, 9];
                                return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, conditionSet: true, nodeId: true } })];
                            case 8:
                                rec = _a.sent();
                                return [2 /*return*/, buildOperationDetail('condition', rec)];
                            case 9:
                                if (!(parsed.type === 'formula')) return [3 /*break*/, 11];
                                return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, tokens: true, nodeId: true } })];
                            case 10:
                                rec = _a.sent();
                                return [2 /*return*/, buildOperationDetail('formula', rec)];
                            case 11:
                                if (!(parsed.type === 'table')) return [3 /*break*/, 13];
                                return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, type: true, nodeId: true } })];
                            case 12:
                                rec = _a.sent();
                                return [2 /*return*/, buildOperationDetail('table', rec)];
                            case 13: return [2 /*return*/, det || null];
                        }
                    });
                }); };
                return [4 /*yield*/, Promise.all(rows_2.map(function (r) { return __awaiter(void 0, void 0, void 0, function () {
                        var nodeLabel, unit, val, displayName, response, source, operationDetail, labelForResult, operationResult, detNormalized, operationDetailResolved, operationResultResolved, operationHumanText, det, set, refIds, _resolvedRefs, extendLabelsWithFormulas, labelsForText_1, setObj, branches, _branchesResolved, _a, detail, result, refIds, _resolvedRefs, expr, _b, detail, result, refIds, str, m, re, expr, unitSuffix, _c, detail, result;
                        var _d, _e, _f;
                        return __generator(this, function (_g) {
                            switch (_g.label) {
                                case 0:
                                    nodeLabel = r.fieldLabel || ((_d = r.TreeBranchLeafNode) === null || _d === void 0 ? void 0 : _d.label) || labelMap_1.get(r.nodeId) || null;
                                    unit = r.variableUnit || null;
                                    val = r.value == null ? null : String(r.value);
                                    displayName = r.variableDisplayName || nodeLabel;
                                    response = val;
                                    source = r.isVariable ? inferSource_1(r.sourceRef) : 'neutral';
                                    operationDetail = (_e = r.operationDetail) !== null && _e !== void 0 ? _e : (r.isVariable ? (r.sourceRef || undefined) : (nodeLabel || undefined));
                                    labelForResult = displayName || nodeLabel || labelMap_1.get(r.nodeId) || ((_f = r.TreeBranchLeafNode) === null || _f === void 0 ? void 0 : _f.id) || '—';
                                    operationResult = unit && response ? "".concat(labelForResult, ": ").concat(response, " ").concat(unit) : "".concat(labelForResult, ": ").concat(response !== null && response !== void 0 ? response : '');
                                    return [4 /*yield*/, resolveDetailForRow_1(r)];
                                case 1:
                                    detNormalized = _g.sent();
                                    operationDetailResolved = undefined;
                                    operationResultResolved = undefined;
                                    operationHumanText = undefined;
                                    det = detNormalized;
                                    if (!(det && det.type)) return [3 /*break*/, 8];
                                    if (!(det.type === 'condition')) return [3 /*break*/, 4];
                                    set = det.conditionSet;
                                    refIds = extractNodeIdsFromConditionSet(set);
                                    return [4 /*yield*/, ensureNodeLabels_1(refIds)];
                                case 2:
                                    _g.sent();
                                    _resolvedRefs = buildResolvedRefs(refIds, labelMap_1, valuesMap_1);
                                    extendLabelsWithFormulas = function (conditionSet, baseLabels) { return __awaiter(void 0, void 0, void 0, function () {
                                        var extended, str, ids, m, re, list, formulas, _i, formulas_5, f, nodeLbl, _a;
                                        var _b;
                                        return __generator(this, function (_c) {
                                            switch (_c.label) {
                                                case 0:
                                                    extended = new Map(baseLabels);
                                                    _c.label = 1;
                                                case 1:
                                                    _c.trys.push([1, 3, , 4]);
                                                    str = JSON.stringify(conditionSet) || '';
                                                    ids = new Set();
                                                    m = void 0;
                                                    re = /node-formula:([a-f0-9-]{36})/gi;
                                                    while ((m = re.exec(str)) !== null)
                                                        ids.add(m[1]);
                                                    if (ids.size === 0)
                                                        return [2 /*return*/, extended];
                                                    list = Array.from(ids);
                                                    return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findMany({ where: { id: { in: list } }, select: { id: true, nodeId: true } })];
                                                case 2:
                                                    formulas = _c.sent();
                                                    for (_i = 0, formulas_5 = formulas; _i < formulas_5.length; _i++) {
                                                        f = formulas_5[_i];
                                                        nodeLbl = (_b = labelMap_1.get(f.nodeId)) !== null && _b !== void 0 ? _b : null;
                                                        if (nodeLbl)
                                                            extended.set(f.id, nodeLbl);
                                                    }
                                                    return [3 /*break*/, 4];
                                                case 3:
                                                    _a = _c.sent();
                                                    return [3 /*break*/, 4];
                                                case 4: return [2 /*return*/, extended];
                                            }
                                        });
                                    }); };
                                    return [4 /*yield*/, extendLabelsWithFormulas(set, labelMap_1)];
                                case 3:
                                    labelsForText_1 = _g.sent();
                                    setObj = (set && typeof set === 'object') ? set : {};
                                    branches = Array.isArray(setObj.branches) ? setObj.branches : [];
                                    _branchesResolved = branches.map(function (b) {
                                        var bb = b;
                                        var actions = bb.actions;
                                        return {
                                            label: bb.label || null,
                                            when: bb.when || null,
                                            actions: resolveActionsLabels(actions, labelsForText_1)
                                        };
                                    });
                                    // 🚫 Désactivé: buildConditionExpressionReadable - tout passe par TBL Prisma !
                                    operationHumanText = '🔄 Condition évaluée via TBL Prisma (ligne 4755)';
                                    _a = buildDetailAndResultForOperation(det, operationHumanText, unit, labelForResult, response), detail = _a.detail, result = _a.result;
                                    operationDetailResolved = detail;
                                    operationResultResolved = result;
                                    return [3 /*break*/, 8];
                                case 4:
                                    if (!(det.type === 'formula')) return [3 /*break*/, 6];
                                    refIds = extractNodeIdsFromTokens(det.tokens);
                                    return [4 /*yield*/, ensureNodeLabels_1(refIds)];
                                case 5:
                                    _g.sent();
                                    _resolvedRefs = buildResolvedRefs(refIds, labelMap_1, valuesMap_1);
                                    {
                                        expr = buildTextFromTokens(det.tokens, labelMap_1, valuesMap_1);
                                        operationHumanText = expr;
                                    }
                                    _b = buildDetailAndResultForOperation(det, operationHumanText, unit, labelForResult, response), detail = _b.detail, result = _b.result;
                                    operationDetailResolved = detail;
                                    operationResultResolved = result;
                                    return [3 /*break*/, 8];
                                case 6:
                                    if (!(det.type === 'table')) return [3 /*break*/, 8];
                                    refIds = new Set();
                                    str = JSON.stringify(det);
                                    if (str) {
                                        m = void 0;
                                        re = /@value\.([a-f0-9-]{36})/gi;
                                        while ((m = re.exec(str)) !== null)
                                            refIds.add(m[1]);
                                    }
                                    return [4 /*yield*/, ensureNodeLabels_1(refIds)];
                                case 7:
                                    _g.sent();
                                    {
                                        expr = buildTextFromTableRecord(det, labelMap_1, valuesMap_1);
                                        unitSuffix = unit ? " ".concat(unit) : '';
                                        operationHumanText = expr ? "".concat(expr, " (=) ").concat(labelForResult, " (").concat(response !== null && response !== void 0 ? response : '').concat(unitSuffix, ")") : "".concat(labelForResult, " (").concat(response !== null && response !== void 0 ? response : '').concat(unitSuffix, ")");
                                    }
                                    _c = buildDetailAndResultForOperation(det, operationHumanText, unit, labelForResult, response), detail = _c.detail, result = _c.result;
                                    operationDetailResolved = detail;
                                    operationResultResolved = result;
                                    _g.label = 8;
                                case 8: return [2 /*return*/, {
                                        nodeId: r.nodeId,
                                        isVariable: r.isVariable,
                                        fieldLabel: nodeLabel,
                                        variableDisplayName: r.variableDisplayName || null,
                                        variableKey: r.variableKey || null,
                                        unit: unit,
                                        sourceRef: r.sourceRef || null,
                                        operationSource: source,
                                        operationDetail: operationDetailResolved || detNormalized || operationDetail,
                                        operationResult: operationResultResolved || operationResult,
                                        // Pour les conditions, operationHumanText contient déjà l'expression complète souhaitée
                                        operationResultText: operationHumanText ? operationHumanText : null,
                                        operationResultResolved: operationResultResolved,
                                        operationDetailResolved: operationDetailResolved,
                                        response: response,
                                        lastResolved: r.lastResolved,
                                    }];
                            }
                        });
                    }); }))];
            case 6:
                items = _d.sent();
                return [2 /*return*/, res.json({ submissionId: id_1, items: items })];
            case 7:
                error_62 = _d.sent();
                console.error('[TreeBranchLeaf API] ❌ Erreur GET /submissions/:id/operations:', error_62);
                return [2 /*return*/, res.status(500).json({ error: 'Erreur lors de la récupération des opérations' })];
            case 8: return [2 /*return*/];
        }
    });
}); });
// POST /api/treebranchleaf/submissions/:id/repair-ops - Backfill operationDetail/operationResult/lastResolved pour une soumission
router.post('/submissions/:id/repair-ops', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, organizationId, isSuperAdmin, submission, treeId, treeOrg, nodes, labelMap, variables, varMetaByNodeId, inferSource, rows, submissionValues, valuesMapAll, now, _i, rows_3, row, isVar, meta, label, valueStr, opSrc, display, opRes, opDetail, parsed, rec, _b, detail, result, rec, _c, detail, result, rec, _d, detail, result, error_63;
    var _e, _f, _g, _h;
    return __generator(this, function (_j) {
        switch (_j.label) {
            case 0:
                _j.trys.push([0, 19, , 20]);
                id = req.params.id;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                return [4 /*yield*/, prisma.treeBranchLeafSubmission.findUnique({
                        where: { id: id },
                        include: { TreeBranchLeafTree: { select: { id: true, organizationId: true } } }
                    })];
            case 1:
                submission = _j.sent();
                if (!submission)
                    return [2 /*return*/, res.status(404).json({ error: 'Soumission non trouvée' })];
                treeId = submission.treeId;
                treeOrg = (_e = submission.TreeBranchLeafTree) === null || _e === void 0 ? void 0 : _e.organizationId;
                if (!isSuperAdmin && treeOrg && treeOrg !== organizationId) {
                    return [2 /*return*/, res.status(403).json({ error: 'Accès refusé à cette soumission' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({ where: { treeId: treeId }, select: { id: true, label: true } })];
            case 2:
                nodes = _j.sent();
                labelMap = new Map(nodes.map(function (n) { return [n.id, n.label]; }));
                return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findMany({
                        where: { TreeBranchLeafNode: { treeId: treeId } },
                        include: { TreeBranchLeafNode: { select: { label: true } } }
                    })];
            case 3:
                variables = _j.sent();
                varMetaByNodeId = new Map(variables.map(function (v) {
                    var _a;
                    return [
                        v.nodeId,
                        {
                            displayName: v.displayName || ((_a = v.TreeBranchLeafNode) === null || _a === void 0 ? void 0 : _a.label) || v.exposedKey || v.nodeId,
                            unit: v.unit || null,
                            sourceRef: v.sourceRef || null
                        }
                    ];
                }));
                inferSource = function (sourceRef) {
                    var s = (sourceRef || '').toLowerCase();
                    if (s.includes('formula') || s.includes('formule'))
                        return 'formula';
                    if (s.includes('condition'))
                        return 'condition';
                    if (s.includes('table'))
                        return 'table';
                    return 'neutral';
                };
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.findMany({
                        where: { submissionId: id },
                        select: { nodeId: true, isVariable: true, value: true, sourceRef: true }
                    })];
            case 4:
                rows = _j.sent();
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.findMany({
                        where: { submissionId: id },
                        select: { nodeId: true, value: true }
                    })];
            case 5:
                submissionValues = _j.sent();
                valuesMapAll = new Map(submissionValues.map(function (r) { return [r.nodeId, r.value == null ? null : String(r.value)]; }));
                now = new Date();
                _i = 0, rows_3 = rows;
                _j.label = 6;
            case 6:
                if (!(_i < rows_3.length)) return [3 /*break*/, 18];
                row = rows_3[_i];
                isVar = row.isVariable;
                meta = isVar ? varMetaByNodeId.get(row.nodeId) : undefined;
                label = labelMap.get(row.nodeId) || undefined;
                valueStr = row.value == null ? null : String(row.value);
                opSrc = isVar ? inferSource((meta === null || meta === void 0 ? void 0 : meta.sourceRef) || null) : 'neutral';
                display = isVar ? ((meta === null || meta === void 0 ? void 0 : meta.displayName) || label || row.nodeId) : (label || row.nodeId);
                opRes = (meta === null || meta === void 0 ? void 0 : meta.unit) && valueStr ? "".concat(display, ": ").concat(valueStr, " ").concat(meta.unit) : "".concat(display, ": ").concat(valueStr !== null && valueStr !== void 0 ? valueStr : '');
                opDetail = undefined;
                parsed = parseSourceRef(row.sourceRef);
                if (!(isVar && parsed)) return [3 /*break*/, 15];
                if (!(parsed.type === 'condition')) return [3 /*break*/, 9];
                return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, conditionSet: true, nodeId: true } })];
            case 7:
                rec = _j.sent();
                return [4 /*yield*/, buildDetailAndResultForOperation('condition', rec, display, valueStr, (meta === null || meta === void 0 ? void 0 : meta.unit) || null, labelMap, valuesMapAll, prisma, id, organizationId || '', ((_f = req.user) === null || _f === void 0 ? void 0 : _f.id) || '')];
            case 8:
                _b = _j.sent(), detail = _b.detail, result = _b.result;
                opDetail = detail;
                opRes = result;
                return [3 /*break*/, 15];
            case 9:
                if (!(parsed.type === 'formula')) return [3 /*break*/, 12];
                return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, tokens: true, nodeId: true } })];
            case 10:
                rec = _j.sent();
                return [4 /*yield*/, buildDetailAndResultForOperation('formula', rec, display, valueStr, (meta === null || meta === void 0 ? void 0 : meta.unit) || null, labelMap, valuesMapAll, prisma, id, organizationId || '', ((_g = req.user) === null || _g === void 0 ? void 0 : _g.id) || '')];
            case 11:
                _c = _j.sent(), detail = _c.detail, result = _c.result;
                opDetail = detail;
                opRes = result;
                return [3 /*break*/, 15];
            case 12:
                if (!(parsed.type === 'table')) return [3 /*break*/, 15];
                return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, type: true, nodeId: true } })];
            case 13:
                rec = _j.sent();
                return [4 /*yield*/, buildDetailAndResultForOperation('table', rec, display, valueStr, (meta === null || meta === void 0 ? void 0 : meta.unit) || null, labelMap, valuesMapAll, prisma, id, organizationId || '', ((_h = req.user) === null || _h === void 0 ? void 0 : _h.id) || '')];
            case 14:
                _d = _j.sent(), detail = _d.detail, result = _d.result;
                opDetail = detail;
                opRes = result;
                _j.label = 15;
            case 15: return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.updateMany({
                    where: { submissionId: id, nodeId: row.nodeId },
                    data: {
                        operationSource: opSrc,
                        // Fallback prioritaire: row.sourceRef (présent côté submissionData), puis meta.sourceRef, sinon label
                        operationDetail: isVar ? (opDetail !== null && opDetail !== void 0 ? opDetail : (row.sourceRef || (meta === null || meta === void 0 ? void 0 : meta.sourceRef) || undefined)) : (label || undefined),
                        operationResult: opRes,
                        lastResolved: now
                    }
                })];
            case 16:
                _j.sent();
                _j.label = 17;
            case 17:
                _i++;
                return [3 /*break*/, 6];
            case 18: return [2 /*return*/, res.json({ success: true, updated: rows.length })];
            case 19:
                error_63 = _j.sent();
                console.error('[TreeBranchLeaf API] ❌ Erreur POST /submissions/:id/repair-ops:', error_63);
                return [2 /*return*/, res.status(500).json({ error: 'Erreur lors du backfill des opérations' })];
            case 20: return [2 /*return*/];
        }
    });
}); });
// POST /api/treebranchleaf/submissions - Créer une nouvelle soumission
router.post('/submissions', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, organizationId, isSuperAdmin, userId, _b, treeId, leadId, name, data, normalizedTreeId, normalizedLeadId, approxBytes, tree, lead, validNodes, validNodeIds_1, rawEntries, filteredEntries, safeUserId, existingUser, checkErr_1, now, created_1, keys, nodesForLabels, labelMap_2, existing, existingSet_1, toCreate_2, toUpdate_1, treeIdForBackfill, _c, nodesForBackfill, varsForBackfill, labelMapBF, varMetaByNodeIdBF, rowsBF, valuesMapBF, nowBF, _loop_12, _i, rowsBF_1, row, enrichErr_1, full, responsePayload, error_64, err, outerErr_1, e;
    var _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                userId = (_d = req.user) === null || _d === void 0 ? void 0 : _d.id;
                _b = req.body, treeId = _b.treeId, leadId = _b.leadId, name = _b.name, data = _b.data;
                normalizedTreeId = treeId != null ? String(treeId) : '';
                normalizedLeadId = leadId != null && leadId !== '' ? String(leadId) : null;
                _e.label = 1;
            case 1:
                _e.trys.push([1, 29, , 30]);
                approxBytes = (function () {
                    var _a, _b;
                    try {
                        return (_b = (_a = JSON.stringify(data)) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
                    }
                    catch (_c) {
                        return 0;
                    }
                })();
                console.log("[TreeBranchLeaf API] \uD83D\uDCCB POST nouvelle soumission (entr\u00E9e)", {
                    treeId: normalizedTreeId,
                    leadId: normalizedLeadId,
                    providedName: name,
                    dataKeys: Object.keys(data),
                    approxBytes: approxBytes,
                    userId: userId,
                    organizationId: organizationId,
                    isSuperAdmin: isSuperAdmin
                });
                // Validation des paramètres requis
                if (!normalizedTreeId) {
                    return [2 /*return*/, res.status(400).json({ error: 'treeId est requis' })];
                }
                // L'utilisateur peut être mocké et ne pas exister en DB; on ne bloque pas la création
                if (!userId) {
                    console.warn('[TreeBranchLeaf API] ⚠️ Aucun userId dans la requête (mode anonyme/mock) – poursuite sans liaison utilisateur');
                }
                // LeadId est optionnel - peut être undefined pour des devis sans lead associé
                if (!name || typeof name !== 'string') {
                    return [2 /*return*/, res.status(400).json({ error: 'name est requis et doit être une chaîne' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({
                        where: __assign({ id: normalizedTreeId }, (isSuperAdmin ? {} : { organizationId: organizationId }))
                    })];
            case 2:
                tree = _e.sent();
                if (!tree) {
                    console.log("[TreeBranchLeaf API] \u274C Arbre ".concat(treeId, " non trouv\u00E9 ou acc\u00E8s refus\u00E9"));
                    return [2 /*return*/, res.status(404).json({ error: 'Arbre non trouvé ou accès refusé' })];
                }
                lead = null;
                if (!normalizedLeadId) return [3 /*break*/, 4];
                return [4 /*yield*/, prisma.lead.findFirst({
                        where: __assign({ id: normalizedLeadId }, (isSuperAdmin ? {} : { organizationId: organizationId }))
                    })];
            case 3:
                lead = _e.sent();
                if (!lead) {
                    console.log("[TreeBranchLeaf API] \u274C Lead ".concat(leadId, " non trouv\u00E9 ou acc\u00E8s refus\u00E9"));
                    return [2 /*return*/, res.status(404).json({ error: 'Lead non trouvé ou accès refusé' })];
                }
                return [3 /*break*/, 5];
            case 4:
                console.log("[TreeBranchLeaf API] \u2139\uFE0F Cr\u00E9ation de soumission sans lead associ\u00E9");
                _e.label = 5;
            case 5: return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                    where: { treeId: normalizedTreeId },
                    select: { id: true }
                })];
            case 6:
                validNodes = _e.sent();
                validNodeIds_1 = new Set(validNodes.map(function (node) { return node.id; }));
                console.log("[TreeBranchLeaf API] \uD83D\uDCCB N\u0153uds valides trouv\u00E9s: ".concat(validNodeIds_1.size));
                rawEntries = (function () {
                    if (Array.isArray(data)) {
                        return data
                            .map(function (it) {
                            if (it && typeof it === 'object' && 'nodeId' in it) {
                                var obj = it;
                                return { nodeId: String(obj.nodeId), value: obj.value, calculatedValue: obj.calculatedValue };
                            }
                            return null;
                        })
                            .filter(function (x) { return !!x; });
                    }
                    if (data && typeof data === 'object') {
                        return Object.entries(data).map(function (_a) {
                            var nodeId = _a[0], value = _a[1];
                            return ({ nodeId: nodeId, value: value });
                        });
                    }
                    return [];
                })();
                filteredEntries = rawEntries.filter(function (_a) {
                    var nodeId = _a.nodeId;
                    var isValid = validNodeIds_1.has(nodeId);
                    if (!isValid)
                        console.log("[TreeBranchLeaf API] \u26A0\uFE0F NodeId invalide ignor\u00E9: ".concat(nodeId));
                    return isValid;
                });
                console.log("[TreeBranchLeaf API] \uD83D\uDCCB Donn\u00E9es filtr\u00E9es: ".concat(filteredEntries.length, "/").concat(rawEntries.length));
                // Créer la soumission avec Prisma (fiable pour les JSON et enums)
                console.log("[TreeBranchLeaf API] \uD83D\uDD27 Cr\u00E9ation Prisma de la soumission");
                _e.label = 7;
            case 7:
                _e.trys.push([7, 27, , 28]);
                safeUserId = null;
                if (!userId) return [3 /*break*/, 11];
                _e.label = 8;
            case 8:
                _e.trys.push([8, 10, , 11]);
                return [4 /*yield*/, prisma.user.findUnique({ where: { id: userId } })];
            case 9:
                existingUser = _e.sent();
                if (existingUser) {
                    safeUserId = userId;
                }
                else {
                    console.warn('[TreeBranchLeaf API] ⚠️ userId fourni mais introuvable en base – création avec userId NULL');
                }
                return [3 /*break*/, 11];
            case 10:
                checkErr_1 = _e.sent();
                console.warn('[TreeBranchLeaf API] ⚠️ Échec de vérification userId – création avec userId NULL:', checkErr_1 === null || checkErr_1 === void 0 ? void 0 : checkErr_1.message);
                return [3 /*break*/, 11];
            case 11:
                now = new Date();
                return [4 /*yield*/, prisma.treeBranchLeafSubmission.create({
                        data: {
                            id: (0, crypto_1.randomUUID)(),
                            treeId: normalizedTreeId,
                            userId: safeUserId,
                            leadId: normalizedLeadId,
                            status: 'draft',
                            updatedAt: now
                        }
                    })];
            case 12:
                created_1 = _e.sent();
                console.log("[TreeBranchLeaf API] \u2705 Soumission cr\u00E9\u00E9e: ".concat(created_1.id));
                if (!(filteredEntries.length > 0)) return [3 /*break*/, 16];
                keys = filteredEntries.map(function (_a) {
                    var nodeId = _a.nodeId;
                    return nodeId;
                });
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                        where: { id: { in: keys } },
                        select: { id: true, label: true }
                    })];
            case 13:
                nodesForLabels = _e.sent();
                labelMap_2 = new Map(nodesForLabels.map(function (n) { return [n.id, n.label]; }));
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.findMany({
                        where: { submissionId: created_1.id, nodeId: { in: keys } },
                        select: { nodeId: true }
                    })];
            case 14:
                existing = _e.sent();
                existingSet_1 = new Set(existing.map(function (e) { return e.nodeId; }));
                toCreate_2 = filteredEntries.filter(function (_a) {
                    var nodeId = _a.nodeId;
                    return !existingSet_1.has(nodeId);
                });
                toUpdate_1 = filteredEntries.filter(function (_a) {
                    var nodeId = _a.nodeId;
                    return existingSet_1.has(nodeId);
                });
                return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var _i, toUpdate_2, _a, nodeId, raw, _b;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    if (!(toCreate_2.length > 0)) return [3 /*break*/, 2];
                                    return [4 /*yield*/, tx.treeBranchLeafSubmissionData.createMany({
                                            data: toCreate_2.map(function (_a) {
                                                var nodeId = _a.nodeId, raw = _a.value;
                                                return ({
                                                    id: (0, crypto_1.randomUUID)(),
                                                    submissionId: created_1.id,
                                                    nodeId: nodeId,
                                                    value: raw == null ? null : String(raw),
                                                    fieldLabel: labelMap_2.get(nodeId) || null,
                                                    isVariable: false
                                                });
                                            })
                                        })];
                                case 1:
                                    _c.sent();
                                    _c.label = 2;
                                case 2:
                                    if (!(toUpdate_1.length > 0)) return [3 /*break*/, 9];
                                    _i = 0, toUpdate_2 = toUpdate_1;
                                    _c.label = 3;
                                case 3:
                                    if (!(_i < toUpdate_2.length)) return [3 /*break*/, 9];
                                    _a = toUpdate_2[_i], nodeId = _a.nodeId, raw = _a.value;
                                    _c.label = 4;
                                case 4:
                                    _c.trys.push([4, 6, , 8]);
                                    return [4 /*yield*/, tx.treeBranchLeafSubmissionData.update({
                                            where: { submissionId_nodeId: { submissionId: created_1.id, nodeId: nodeId } },
                                            data: { value: raw == null ? null : String(raw), fieldLabel: labelMap_2.get(nodeId) || undefined }
                                        })];
                                case 5:
                                    _c.sent();
                                    return [3 /*break*/, 8];
                                case 6:
                                    _b = _c.sent();
                                    // Si le client Prisma n'expose pas la clé composée, fallback en updateMany
                                    return [4 /*yield*/, tx.treeBranchLeafSubmissionData.updateMany({
                                            where: { submissionId: created_1.id, nodeId: nodeId },
                                            data: { value: raw == null ? null : String(raw), fieldLabel: labelMap_2.get(nodeId) || undefined }
                                        })];
                                case 7:
                                    // Si le client Prisma n'expose pas la clé composée, fallback en updateMany
                                    _c.sent();
                                    return [3 /*break*/, 8];
                                case 8:
                                    _i++;
                                    return [3 /*break*/, 3];
                                case 9: return [2 /*return*/];
                            }
                        });
                    }); })];
            case 15:
                _e.sent();
                console.log("[TreeBranchLeaf API] \u2705 Champs persist\u00E9s: create=".concat(toCreate_2.length, ", update=").concat(toUpdate_1.length));
                return [3 /*break*/, 17];
            case 16:
                console.log('[TreeBranchLeaf API] ℹ️ Aucun champ utilisateur à persister (payload data vide après filtrage)');
                _e.label = 17;
            case 17:
                _e.trys.push([17, 24, , 25]);
                treeIdForBackfill = created_1.treeId;
                return [4 /*yield*/, Promise.all([
                        prisma.treeBranchLeafNode.findMany({ where: { treeId: treeIdForBackfill }, select: { id: true, label: true } }),
                        prisma.treeBranchLeafNodeVariable.findMany({ where: { TreeBranchLeafNode: { treeId: treeIdForBackfill } }, include: { TreeBranchLeafNode: { select: { label: true } } } })
                    ])];
            case 18:
                _c = _e.sent(), nodesForBackfill = _c[0], varsForBackfill = _c[1];
                labelMapBF = new Map(nodesForBackfill.map(function (n) { return [n.id, n.label]; }));
                varMetaByNodeIdBF = new Map(varsForBackfill.map(function (v) {
                    var _a;
                    return [
                        v.nodeId,
                        {
                            displayName: v.displayName || ((_a = v.TreeBranchLeafNode) === null || _a === void 0 ? void 0 : _a.label) || v.exposedKey || v.nodeId,
                            unit: v.unit || null,
                            sourceRef: v.sourceRef || null
                        }
                    ];
                }));
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.findMany({
                        where: { submissionId: created_1.id },
                        select: { nodeId: true, isVariable: true, value: true, sourceRef: true }
                    })];
            case 19:
                rowsBF = _e.sent();
                valuesMapBF = new Map(rowsBF.map(function (r) { return [r.nodeId, r.value == null ? null : String(r.value)]; }));
                nowBF = new Date();
                _loop_12 = function (row) {
                    var meta, label, valueStr, opSrc, display, opRes, opDetail, parsed, rec, _f, detail, result, rec, _g, detail, result, rec, _h, detail, result;
                    return __generator(this, function (_j) {
                        switch (_j.label) {
                            case 0:
                                if (!row.isVariable)
                                    return [2 /*return*/, "continue"];
                                meta = varMetaByNodeIdBF.get(row.nodeId);
                                label = labelMapBF.get(row.nodeId) || undefined;
                                valueStr = row.value == null ? null : String(row.value);
                                opSrc = (function () {
                                    var s = ((meta === null || meta === void 0 ? void 0 : meta.sourceRef) || '').toLowerCase();
                                    if (s.includes('formula') || s.includes('formule'))
                                        return 'formula';
                                    if (s.includes('condition'))
                                        return 'condition';
                                    if (s.includes('table'))
                                        return 'table';
                                    return 'neutral';
                                })();
                                display = (meta === null || meta === void 0 ? void 0 : meta.displayName) || label || row.nodeId;
                                opRes = (meta === null || meta === void 0 ? void 0 : meta.unit) && valueStr ? "".concat(display, ": ").concat(valueStr, " ").concat(meta.unit) : "".concat(display, ": ").concat(valueStr !== null && valueStr !== void 0 ? valueStr : '');
                                opDetail = undefined;
                                parsed = parseSourceRef(row.sourceRef || (meta === null || meta === void 0 ? void 0 : meta.sourceRef) || null);
                                if (!parsed) return [3 /*break*/, 9];
                                if (!(parsed.type === 'condition')) return [3 /*break*/, 3];
                                return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, conditionSet: true, nodeId: true } })];
                            case 1:
                                rec = _j.sent();
                                return [4 /*yield*/, buildDetailAndResultForOperation('condition', rec, display, valueStr, (meta === null || meta === void 0 ? void 0 : meta.unit) || null, labelMapBF, valuesMapBF, prisma, created_1.id, organizationId || '', userId || '')];
                            case 2:
                                _f = _j.sent(), detail = _f.detail, result = _f.result;
                                opDetail = detail;
                                opRes = result;
                                return [3 /*break*/, 9];
                            case 3:
                                if (!(parsed.type === 'formula')) return [3 /*break*/, 6];
                                return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, tokens: true, nodeId: true } })];
                            case 4:
                                rec = _j.sent();
                                return [4 /*yield*/, buildDetailAndResultForOperation('formula', rec, display, valueStr, (meta === null || meta === void 0 ? void 0 : meta.unit) || null, labelMapBF, valuesMapBF, prisma, created_1.id, organizationId || '', userId || '')];
                            case 5:
                                _g = _j.sent(), detail = _g.detail, result = _g.result;
                                opDetail = detail;
                                opRes = result;
                                return [3 /*break*/, 9];
                            case 6:
                                if (!(parsed.type === 'table')) return [3 /*break*/, 9];
                                return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, type: true, nodeId: true } })];
                            case 7:
                                rec = _j.sent();
                                return [4 /*yield*/, buildDetailAndResultForOperation('table', rec, display, valueStr, (meta === null || meta === void 0 ? void 0 : meta.unit) || null, labelMapBF, valuesMapBF, prisma, created_1.id, organizationId || '', userId || '')];
                            case 8:
                                _h = _j.sent(), detail = _h.detail, result = _h.result;
                                opDetail = detail;
                                opRes = result;
                                _j.label = 9;
                            case 9: return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.updateMany({
                                    where: { submissionId: created_1.id, nodeId: row.nodeId },
                                    data: {
                                        operationSource: opSrc,
                                        operationDetail: opDetail !== null && opDetail !== void 0 ? opDetail : (row.sourceRef || (meta === null || meta === void 0 ? void 0 : meta.sourceRef) || undefined),
                                        operationResult: opRes,
                                        lastResolved: nowBF
                                    }
                                })];
                            case 10:
                                _j.sent();
                                return [2 /*return*/];
                        }
                    });
                };
                _i = 0, rowsBF_1 = rowsBF;
                _e.label = 20;
            case 20:
                if (!(_i < rowsBF_1.length)) return [3 /*break*/, 23];
                row = rowsBF_1[_i];
                return [5 /*yield**/, _loop_12(row)];
            case 21:
                _e.sent();
                _e.label = 22;
            case 22:
                _i++;
                return [3 /*break*/, 20];
            case 23: return [3 /*break*/, 25];
            case 24:
                enrichErr_1 = _e.sent();
                console.warn('[TreeBranchLeaf API] ⚠️ Backfill post-création des opérations non critique a échoué:', enrichErr_1 === null || enrichErr_1 === void 0 ? void 0 : enrichErr_1.message);
                return [3 /*break*/, 25];
            case 25: return [4 /*yield*/, prisma.treeBranchLeafSubmission.findUnique({
                    where: { id: created_1.id },
                    include: {
                        TreeBranchLeafTree: { select: { id: true, name: true } },
                        Lead: { select: { id: true, firstName: true, lastName: true, email: true } },
                        TreeBranchLeafSubmissionData: {
                            include: {
                                TreeBranchLeafNode: { select: { id: true, label: true, type: true } }
                            }
                        }
                    }
                })];
            case 26:
                full = _e.sent();
                if (!full) {
                    throw new Error('Soumission non trouvée après création');
                }
                responsePayload = {
                    id: full.id,
                    treeId: full.treeId,
                    userId: full.userId,
                    leadId: full.leadId,
                    status: full.status,
                    summary: full.summary,
                    updatedAt: full.updatedAt,
                    TreeBranchLeafTree: full.TreeBranchLeafTree,
                    Lead: full.Lead || null,
                    TreeBranchLeafSubmissionData: full.TreeBranchLeafSubmissionData
                };
                console.log("[TreeBranchLeaf API] \u2705 Devis cr\u00E9\u00E9 et recharg\u00E9: ".concat(full.id));
                res.status(201).json(responsePayload);
                return [3 /*break*/, 28];
            case 27:
                error_64 = _e.sent();
                err = error_64;
                console.error('[TreeBranchLeaf API] ❌ ERREUR DÉTAILLÉE lors de la création:', {
                    message: err === null || err === void 0 ? void 0 : err.message,
                    code: err === null || err === void 0 ? void 0 : err.code,
                    meta: err === null || err === void 0 ? void 0 : err.meta
                });
                if (err === null || err === void 0 ? void 0 : err.stack)
                    console.error(err.stack);
                // Log spécifique pour erreurs Prisma
                if (err && err.code) {
                    console.error('[TreeBranchLeaf API] 🔍 Code erreur Prisma:', err.code);
                    if (err.meta) {
                        console.error('[TreeBranchLeaf API] 🔍 Métadonnées:', err.meta);
                    }
                }
                return [2 /*return*/, res.status(500).json({
                        error: 'Erreur lors de la création de la soumission',
                        details: process.env.NODE_ENV === 'development' ? err === null || err === void 0 ? void 0 : err.message : undefined
                    })];
            case 28: return [3 /*break*/, 30];
            case 29:
                outerErr_1 = _e.sent();
                e = outerErr_1;
                console.error('[TreeBranchLeaf API] ❌ Erreur inattendue en entrée de route /submissions:', e === null || e === void 0 ? void 0 : e.message);
                return [2 /*return*/, res.status(500).json({ error: 'Erreur interne inattendue' })];
            case 30: return [2 /*return*/];
        }
    });
}); });
// DELETE /api/treebranchleaf/submissions/:id - Supprimer une soumission
router.delete('/submissions/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, organizationId, isSuperAdmin, submission, error_65;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                id = req.params.id;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                console.log("[TreeBranchLeaf API] \uD83D\uDDD1\uFE0F DELETE submission ".concat(id));
                return [4 /*yield*/, prisma.treeBranchLeafSubmission.findFirst({
                        where: __assign({ id: id }, (isSuperAdmin ? {} : { Lead: { organizationId: organizationId } })),
                        include: {
                            Lead: {
                                select: { organizationId: true }
                            }
                        }
                    })];
            case 1:
                submission = _b.sent();
                if (!submission) {
                    console.log("[TreeBranchLeaf API] \u274C Submission ".concat(id, " non trouv\u00E9e ou acc\u00E8s refus\u00E9"));
                    return [2 /*return*/, res.status(404).json({ error: 'Soumission non trouvée ou accès refusé' })];
                }
                // Supprimer les données associées d'abord
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.deleteMany({
                        where: { submissionId: id }
                    })];
            case 2:
                // Supprimer les données associées d'abord
                _b.sent();
                // Puis supprimer la soumission
                return [4 /*yield*/, prisma.treeBranchLeafSubmission.delete({
                        where: { id: id }
                    })];
            case 3:
                // Puis supprimer la soumission
                _b.sent();
                console.log("[TreeBranchLeaf API] \u2705 Submission ".concat(id, " supprim\u00E9e avec succ\u00E8s"));
                res.json({ success: true, message: 'Soumission supprimée avec succès' });
                return [3 /*break*/, 5];
            case 4:
                error_65 = _b.sent();
                console.error('[TreeBranchLeaf API] Error deleting submission:', error_65);
                res.status(500).json({ error: 'Erreur lors de la suppression de la soumission' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// 🔗 TABLE LOOKUP - Récupération de la configuration SELECT pour les champs
// =============================================================================
// GET /api/treebranchleaf/nodes/:fieldId/select-config
// Récupère la configuration TreeBranchLeafSelectConfig d'un champ
router.get('/nodes/:fieldId/select-config', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var fieldId, _a, organizationId, isSuperAdmin, access, selectConfig, node, instances, activeInstance, isRowBased, isColumnBased, error_66;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 7, , 8]);
                fieldId = req.params.fieldId;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                console.log("[TreeBranchLeaf API] \uD83D\uDD0D GET select-config for field: ".concat(fieldId));
                return [4 /*yield*/, ensureNodeOrgAccess(prisma, fieldId, { organizationId: organizationId, isSuperAdmin: isSuperAdmin })];
            case 1:
                access = _b.sent();
                if (!access.ok) {
                    return [2 /*return*/, res.status(access.status).json({ error: access.error })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafSelectConfig.findFirst({
                        where: { nodeId: fieldId },
                    })];
            case 2:
                selectConfig = _b.sent();
                if (!!selectConfig) return [3 /*break*/, 6];
                console.log("[TreeBranchLeaf API] \u26A0\uFE0F Pas de configuration SELECT pour le champ ".concat(fieldId));
                return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                        where: { id: fieldId },
                        select: {
                            id: true,
                            hasTable: true,
                            table_activeId: true,
                            table_instances: true
                        }
                    })];
            case 3:
                node = _b.sent();
                if (!((node === null || node === void 0 ? void 0 : node.hasTable) && node.table_activeId && node.table_instances)) return [3 /*break*/, 5];
                instances = node.table_instances;
                activeInstance = instances[node.table_activeId];
                isRowBased = (activeInstance === null || activeInstance === void 0 ? void 0 : activeInstance.rowBased) === true;
                isColumnBased = (activeInstance === null || activeInstance === void 0 ? void 0 : activeInstance.columnBased) === true;
                if (!(isRowBased || isColumnBased)) return [3 /*break*/, 5];
                console.log("[TreeBranchLeaf API] \uD83D\uDD27 Cr\u00E9ation dynamique de la config SELECT pour lookup ".concat(isRowBased ? 'LIGNE' : 'COLONNE'));
                return [4 /*yield*/, prisma.treeBranchLeafSelectConfig.create({
                        data: {
                            id: (0, crypto_1.randomUUID)(),
                            nodeId: fieldId,
                            options: [],
                            multiple: false,
                            searchable: true,
                            allowCustom: false,
                            optionsSource: 'table',
                            tableReference: node.table_activeId,
                            keyColumn: null,
                            valueColumn: null,
                            displayColumn: null,
                            dependsOnNodeId: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        }
                    })];
            case 4:
                // Créer automatiquement la configuration SELECT
                selectConfig = _b.sent();
                console.log("[TreeBranchLeaf API] \u2705 Configuration SELECT cr\u00E9\u00E9e dynamiquement:", selectConfig.id);
                _b.label = 5;
            case 5:
                if (!selectConfig) {
                    return [2 /*return*/, res.status(404).json({ error: 'Configuration SELECT introuvable' })];
                }
                _b.label = 6;
            case 6:
                console.log("[TreeBranchLeaf API] \u2705 Configuration SELECT trouv\u00E9e:", selectConfig);
                return [2 /*return*/, res.json(selectConfig)];
            case 7:
                error_66 = _b.sent();
                console.error('[TreeBranchLeaf API] Error fetching select config:', error_66);
                res.status(500).json({ error: 'Erreur lors de la récupération de la configuration SELECT' });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
// POST /api/treebranchleaf/nodes/:fieldId/select-config
// Crée ou met à jour la configuration TreeBranchLeafSelectConfig d'un champ
router.post('/nodes/:fieldId/select-config', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var fieldId, _a, organizationId, isSuperAdmin, _b, optionsSource, tableReference, keyColumn, keyRow, valueColumn, valueRow, displayColumn, displayRow, dependsOnNodeId, access, selectConfig, error_67;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 3, , 4]);
                fieldId = req.params.fieldId;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                _b = req.body, optionsSource = _b.optionsSource, tableReference = _b.tableReference, keyColumn = _b.keyColumn, keyRow = _b.keyRow, valueColumn = _b.valueColumn, valueRow = _b.valueRow, displayColumn = _b.displayColumn, displayRow = _b.displayRow, dependsOnNodeId = _b.dependsOnNodeId;
                console.log("[TreeBranchLeaf API] \uD83D\uDCDD POST select-config for field: ".concat(fieldId), {
                    keyColumn: keyColumn,
                    keyRow: keyRow,
                    valueColumn: valueColumn,
                    valueRow: valueRow,
                    displayColumn: displayColumn,
                    displayRow: displayRow,
                });
                return [4 /*yield*/, ensureNodeOrgAccess(prisma, fieldId, { organizationId: organizationId, isSuperAdmin: isSuperAdmin })];
            case 1:
                access = _c.sent();
                if (!access.ok) {
                    return [2 /*return*/, res.status(access.status).json({ error: access.error })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafSelectConfig.upsert({
                        where: { nodeId: fieldId },
                        create: {
                            id: (0, crypto_1.randomUUID)(),
                            nodeId: fieldId,
                            options: [],
                            multiple: false,
                            searchable: true,
                            allowCustom: false,
                            optionsSource: optionsSource || 'table',
                            tableReference: tableReference || null,
                            keyColumn: keyColumn || null,
                            keyRow: keyRow || null,
                            valueColumn: valueColumn || null,
                            valueRow: valueRow || null,
                            displayColumn: displayColumn || null,
                            displayRow: displayRow || null,
                            dependsOnNodeId: dependsOnNodeId || null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        },
                        update: {
                            optionsSource: optionsSource || 'table',
                            tableReference: tableReference || null,
                            keyColumn: keyColumn || null,
                            keyRow: keyRow || null,
                            valueColumn: valueColumn || null,
                            valueRow: valueRow || null,
                            displayColumn: displayColumn || null,
                            displayRow: displayRow || null,
                            dependsOnNodeId: dependsOnNodeId || null,
                            updatedAt: new Date(),
                        },
                    })];
            case 2:
                selectConfig = _c.sent();
                console.log("[TreeBranchLeaf API] \u2705 Configuration SELECT cr\u00E9\u00E9e/mise \u00E0 jour:", selectConfig);
                return [2 /*return*/, res.json(selectConfig)];
            case 3:
                error_67 = _c.sent();
                console.error('[TreeBranchLeaf API] Error creating select config:', error_67);
                res.status(500).json({ error: 'Erreur lors de la création de la configuration SELECT' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// GET /api/treebranchleaf/nodes/:nodeId/table/lookup
// Récupère le tableau ACTIF d'un noeud pour lookup (utilisé par useTBLTableLookup)
router.get('/nodes/:nodeId/table/lookup', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, _a, organizationId, isSuperAdmin, access, selectConfig_1, node, table, columns, rows_4, data_1, rowIndex, options, dataRowIndex, rowData_1, colIndex, options, dataColIndex_1, hasNoConfig, a1, firstColHeader, autoOptions, e_25, error_68;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 13, , 14]);
                nodeId = req.params.nodeId;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                console.log("[TreeBranchLeaf API] \uD83D\uDD0D GET active table/lookup for node: ".concat(nodeId));
                return [4 /*yield*/, ensureNodeOrgAccess(prisma, nodeId, { organizationId: organizationId, isSuperAdmin: isSuperAdmin })];
            case 1:
                access = _b.sent();
                if (!access.ok) {
                    return [2 /*return*/, res.status(access.status).json({ error: access.error })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafSelectConfig.findFirst({
                        where: { nodeId: nodeId },
                        select: {
                            tableReference: true,
                            keyColumn: true,
                            keyRow: true,
                            valueColumn: true,
                            valueRow: true,
                            displayColumn: true,
                            displayRow: true,
                        }
                    })];
            case 2:
                selectConfig_1 = _b.sent();
                console.log("[TreeBranchLeaf API] \uD83D\uDCCB Configuration SELECT:", selectConfig_1);
                if (!!(selectConfig_1 === null || selectConfig_1 === void 0 ? void 0 : selectConfig_1.tableReference)) return [3 /*break*/, 6];
                console.log("[TreeBranchLeaf API] \u26A0\uFE0F Pas de tableReference dans la config SELECT \u2192 tentative de fallback via capabilities.table");
                return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                        where: { id: nodeId },
                        select: { hasTable: true, table_activeId: true, table_instances: true }
                    })];
            case 3:
                node = _b.sent();
                if (!((node === null || node === void 0 ? void 0 : node.hasTable) && node.table_activeId)) return [3 /*break*/, 6];
                // Créer à la volée une configuration minimale basée sur l'instance active
                return [4 /*yield*/, prisma.treeBranchLeafSelectConfig.upsert({
                        where: { nodeId: nodeId },
                        create: {
                            id: (0, crypto_1.randomUUID)(),
                            nodeId: nodeId,
                            options: [],
                            multiple: false,
                            searchable: true,
                            allowCustom: false,
                            optionsSource: 'table',
                            tableReference: node.table_activeId,
                            keyColumn: null,
                            keyRow: null,
                            valueColumn: null,
                            valueRow: null,
                            displayColumn: null,
                            displayRow: null,
                            dependsOnNodeId: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        },
                        update: {
                            optionsSource: 'table',
                            tableReference: node.table_activeId,
                            updatedAt: new Date(),
                        },
                    })];
            case 4:
                // Créer à la volée une configuration minimale basée sur l'instance active
                _b.sent();
                return [4 /*yield*/, prisma.treeBranchLeafSelectConfig.findFirst({
                        where: { nodeId: nodeId },
                        select: {
                            tableReference: true,
                            keyColumn: true,
                            keyRow: true,
                            valueColumn: true,
                            valueRow: true,
                            displayColumn: true,
                            displayRow: true,
                        }
                    })];
            case 5:
                // Recharger la config pour continuer le flux normal
                selectConfig_1 = _b.sent();
                console.log("[TreeBranchLeaf API] \u2705 Fallback SELECT config cr\u00E9\u00E9 depuis capabilities.table:", selectConfig_1);
                _b.label = 6;
            case 6:
                if (!(selectConfig_1 === null || selectConfig_1 === void 0 ? void 0 : selectConfig_1.tableReference)) {
                    console.log("[TreeBranchLeaf API] \u26A0\uFE0F Pas de tableReference dans la config SELECT (apr\u00E8s fallback)");
                    return [2 /*return*/, res.status(404).json({ error: 'Pas de tableau référencé pour ce lookup' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findUnique({
                        where: { id: selectConfig_1.tableReference },
                        select: {
                            id: true,
                            nodeId: true,
                            name: true,
                            type: true,
                            meta: true,
                            tableColumns: {
                                select: { id: true, name: true, columnIndex: true },
                                orderBy: { columnIndex: 'asc' },
                            },
                            tableRows: {
                                select: { id: true, rowIndex: true, cells: true },
                                orderBy: { rowIndex: 'asc' },
                            },
                        }
                    })];
            case 7:
                table = _b.sent();
                if (!table) {
                    console.log("[TreeBranchLeaf API] \u26A0\uFE0F Tableau introuvable: ".concat(selectConfig_1.tableReference));
                    return [2 /*return*/, res.status(404).json({ error: 'Tableau introuvable' })];
                }
                columns = table.tableColumns.map(function (col) { return col.name; });
                rows_4 = [];
                data_1 = [];
                table.tableRows.forEach(function (row) {
                    try {
                        var cellsData = void 0;
                        // 🔍 Tentative 1: Parse JSON si c'est une string
                        if (typeof row.cells === 'string') {
                            try {
                                cellsData = JSON.parse(row.cells);
                            }
                            catch (_a) {
                                // 🔧 Fallback: Si ce n'est PAS du JSON, c'est juste une valeur simple (première colonne uniquement)
                                // Cela arrive pour les anciennes données où cells = "Orientation" au lieu de ["Orientation", ...]
                                cellsData = [row.cells]; // Envelopper dans un array
                            }
                        }
                        else {
                            cellsData = row.cells || [];
                        }
                        if (Array.isArray(cellsData) && cellsData.length > 0) {
                            // 🔑 cellsData[0] = label de ligne (colonne A)
                            // 📊 cellsData[1...] = données (colonnes B, C, D...)
                            rows_4.push(String(cellsData[0] || ''));
                            data_1.push(cellsData.slice(1)); // Données sans le label
                        }
                        else {
                            rows_4.push('');
                            data_1.push([]);
                        }
                    }
                    catch (error) {
                        console.error('[TreeBranchLeaf API] Erreur parsing cells:', error);
                        rows_4.push('');
                        data_1.push([]);
                    }
                });
                console.log("[TreeBranchLeaf API] \u2705 Tableau charg\u00E9 (normalis\u00E9):", {
                    id: table.id,
                    name: table.name,
                    type: table.type,
                    columnsCount: columns.length,
                    rowsCount: rows_4.length,
                    firstColumns: columns.slice(0, 3),
                    firstRows: rows_4.slice(0, 3),
                });
                // 🎯 ÉTAPE 3: Générer les options selon la configuration
                if (table.type === 'matrix') {
                    // CAS 1: keyRow défini → Extraire les VALEURS de cette ligne
                    if (selectConfig_1 === null || selectConfig_1 === void 0 ? void 0 : selectConfig_1.keyRow) {
                        rowIndex = rows_4.indexOf(selectConfig_1.keyRow);
                        if (rowIndex === -1) {
                            console.warn("\u26A0\uFE0F [TreeBranchLeaf API] Ligne \"".concat(selectConfig_1.keyRow, "\" introuvable"));
                            return [2 /*return*/, res.json({ options: [] })];
                        }
                        options = void 0;
                        if (rowIndex === 0) {
                            // Ligne A1 sélectionnée → Extraire les en-têtes de colonnes (SANS A1 lui-même)
                            options = columns.slice(1).map(function (colName) {
                                return {
                                    value: colName,
                                    label: selectConfig_1.displayRow ? colName : colName,
                                };
                            }).filter(function (opt) { return opt.value !== 'undefined' && opt.value !== 'null' && opt.value !== ''; });
                        }
                        else {
                            dataRowIndex = rowIndex - 1;
                            rowData_1 = data_1[dataRowIndex] || [];
                            options = columns.slice(1).map(function (colName, colIdx) {
                                var value = rowData_1[colIdx];
                                return {
                                    value: String(value),
                                    label: selectConfig_1.displayRow ? "".concat(colName, ": ").concat(value) : String(value),
                                };
                            }).filter(function (opt) { return opt.value !== 'undefined' && opt.value !== 'null' && opt.value !== ''; });
                        }
                        console.log("[TreeBranchLeaf API] \u2705 Options extraites depuis ligne \"".concat(selectConfig_1.keyRow, "\":"), {
                            rowIndex: rowIndex,
                            isRowA1: rowIndex === 0,
                            optionsCount: options.length,
                            sample: options.slice(0, 3)
                        });
                        return [2 /*return*/, res.json({ options: options })];
                    }
                    // CAS 2: keyColumn défini → Extraire les VALEURS de cette colonne
                    if (selectConfig_1 === null || selectConfig_1 === void 0 ? void 0 : selectConfig_1.keyColumn) {
                        colIndex = columns.indexOf(selectConfig_1.keyColumn);
                        if (colIndex === -1) {
                            console.warn("\u26A0\uFE0F [TreeBranchLeaf API] Colonne \"".concat(selectConfig_1.keyColumn, "\" introuvable"));
                            return [2 /*return*/, res.json({ options: [] })];
                        }
                        options = void 0;
                        if (colIndex === 0) {
                            // Colonne A = labels des lignes → Extraire depuis rows[] SAUF rows[0] (qui est A1)
                            options = rows_4.slice(1).map(function (rowLabel) {
                                return {
                                    value: rowLabel,
                                    label: selectConfig_1.displayColumn ? rowLabel : rowLabel,
                                };
                            }).filter(function (opt) { return opt.value !== 'undefined' && opt.value !== 'null' && opt.value !== ''; });
                        }
                        else {
                            dataColIndex_1 = colIndex - 1;
                            options = data_1.map(function (row, rowIdx) {
                                var value = row[dataColIndex_1];
                                var rowLabel = rows_4[rowIdx] || '';
                                return {
                                    value: String(value),
                                    label: selectConfig_1.displayColumn ? "".concat(rowLabel, ": ").concat(value) : String(value),
                                };
                            }).filter(function (opt) { return opt.value !== 'undefined' && opt.value !== 'null' && opt.value !== ''; });
                        }
                        console.log("[TreeBranchLeaf API] \u2705 Options extraites depuis colonne \"".concat(selectConfig_1.keyColumn, "\" (index ").concat(colIndex, "):"), {
                            colIndex: colIndex,
                            isColumnA: colIndex === 0,
                            optionsCount: options.length,
                            sample: options.slice(0, 3)
                        });
                        return [2 /*return*/, res.json({ options: options })];
                    }
                }
                if (!(table.type === 'matrix')) return [3 /*break*/, 12];
                hasNoConfig = !(selectConfig_1 === null || selectConfig_1 === void 0 ? void 0 : selectConfig_1.keyRow) && !(selectConfig_1 === null || selectConfig_1 === void 0 ? void 0 : selectConfig_1.keyColumn);
                a1 = rows_4[0];
                firstColHeader = columns[0];
                if (!(hasNoConfig && firstColHeader && a1 && firstColHeader === a1)) return [3 /*break*/, 12];
                autoOptions = rows_4.slice(1)
                    .filter(function (r) { return r && r !== 'undefined' && r !== 'null'; })
                    .map(function (r) { return ({ value: r, label: r }); });
                console.log("[TreeBranchLeaf API] ?? AUTO-DEFAULT lookup (matrix, colonne A) g\uFFFDn\uFFFDr\uFFFD", {
                    nodeId: nodeId,
                    autoCount: autoOptions.length,
                    sample: autoOptions.slice(0, 5)
                });
                _b.label = 8;
            case 8:
                _b.trys.push([8, 10, , 11]);
                return [4 /*yield*/, prisma.treeBranchLeafSelectConfig.upsert({
                        where: { nodeId: nodeId },
                        create: {
                            id: (0, crypto_1.randomUUID)(),
                            nodeId: nodeId,
                            options: [],
                            multiple: false,
                            searchable: true,
                            allowCustom: false,
                            optionsSource: 'table',
                            tableReference: table.id,
                            keyColumn: firstColHeader,
                            keyRow: null,
                            valueColumn: null,
                            valueRow: null,
                            displayColumn: null,
                            displayRow: null,
                            dependsOnNodeId: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        },
                        update: {
                            optionsSource: 'table',
                            tableReference: table.id,
                            keyColumn: firstColHeader,
                            keyRow: null,
                            valueColumn: null,
                            valueRow: null,
                            displayColumn: null,
                            displayRow: null,
                            updatedAt: new Date(),
                        }
                    })];
            case 9:
                _b.sent();
                console.log("[TreeBranchLeaf API] ? AUTO-UPSERT select-config: nodeId=".concat(nodeId, ", table=").concat(table.id, ", keyColumn=").concat(firstColHeader));
                return [3 /*break*/, 11];
            case 10:
                e_25 = _b.sent();
                console.warn("[TreeBranchLeaf API] ?? Auto-upsert select-config a \uFFFDchou\uFFFD (non bloquant):", e_25);
                return [3 /*break*/, 11];
            case 11: return [2 /*return*/, res.json({ options: autoOptions, autoDefault: { source: 'columnA', keyColumnCandidate: firstColHeader } })];
            case 12:
                console.log("[TreeBranchLeaf API] \u26A0\uFE0F Aucun keyRow/keyColumn configur\u00E9, retour tableau brut (pas d'auto-default applicable)");
                return [2 /*return*/, res.json(table)];
            case 13:
                error_68 = _b.sent();
                console.error('[TreeBranchLeaf API] Error fetching table for lookup:', error_68);
                res.status(500).json({ error: 'Erreur lors de la récupération du tableau' });
                return [3 /*break*/, 14];
            case 14: return [2 /*return*/];
        }
    });
}); });
// PATCH /api/treebranchleaf/nodes/:nodeId
// Met à jour les propriétés d'un nœud (type, fieldType, etc.)
router.patch('/nodes/:nodeId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, _a, organizationId, isSuperAdmin, access, updatedNode, error_69;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                nodeId = req.params.nodeId;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                console.log("[TreeBranchLeaf API] \uD83D\uDD27 PATCH node: ".concat(nodeId), req.body);
                return [4 /*yield*/, ensureNodeOrgAccess(prisma, nodeId, { organizationId: organizationId, isSuperAdmin: isSuperAdmin })];
            case 1:
                access = _b.sent();
                if (!access.ok) {
                    return [2 /*return*/, res.status(access.status).json({ error: access.error })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                        where: { id: nodeId },
                        data: __assign(__assign({}, req.body), { updatedAt: new Date() }),
                    })];
            case 2:
                updatedNode = _b.sent();
                console.log("[TreeBranchLeaf API] \u2705 N\u0153ud mis \u00E0 jour:", updatedNode.id);
                return [2 /*return*/, res.json(updatedNode)];
            case 3:
                error_69 = _b.sent();
                console.error('[TreeBranchLeaf API] Error updating node:', error_69);
                res.status(500).json({ error: 'Erreur lors de la mise à jour du nœud' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * 🎯 PUT /nodes/:nodeId/capabilities/table
 * Active/désactive la capacité Table sur un champ
 * Appelé depuis TablePanel quand on sélectionne un champ dans le lookup
 */
router.put('/nodes/:nodeId/capabilities/table', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, _a, enabled, activeId, currentTable, node, oldMetadata, oldCapabilities, tableInstances, newCapabilities, newMetadata, keyColumn, keyRow, valueColumn, valueRow, displayColumn, displayRow, selectConfigError_2, deleteError_1, verifyNode, error_70;
    var _b;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 13, , 14]);
                nodeId = req.params.nodeId;
                _a = req.body, enabled = _a.enabled, activeId = _a.activeId, currentTable = _a.currentTable;
                console.log("\uD83C\uDFAF [TablePanel API] PUT /nodes/".concat(nodeId, "/capabilities/table"), { enabled: enabled, activeId: activeId, currentTable: currentTable });
                return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                        where: { id: nodeId },
                        select: {
                            id: true,
                            hasTable: true,
                            metadata: true
                        }
                    })];
            case 1:
                node = _e.sent();
                if (!node) {
                    return [2 /*return*/, res.status(404).json({ error: 'Nœud non trouvé' })];
                }
                oldMetadata = (node.metadata || {});
                oldCapabilities = (oldMetadata.capabilities || {});
                tableInstances = enabled && activeId ? (_b = {},
                    _b[activeId] = currentTable || { mode: 'matrix', tableId: activeId },
                    _b) : null;
                newCapabilities = __assign(__assign({}, oldCapabilities), { table: {
                        enabled: enabled === true,
                        activeId: enabled ? (activeId || null) : null,
                        instances: tableInstances,
                        currentTable: enabled ? (currentTable || null) : null,
                    } });
                newMetadata = __assign(__assign({}, oldMetadata), { capabilities: newCapabilities });
                console.log("\u2705 [TablePanel API] Nouvelle metadata.capabilities.table:", newCapabilities.table);
                // Mettre à jour le nœud avec metadata seulement - FORCE JSON serialization
                return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                        where: { id: nodeId },
                        data: {
                            hasTable: enabled === true,
                            table_activeId: enabled ? (activeId || null) : null,
                            table_instances: tableInstances ? JSON.parse(JSON.stringify(tableInstances)) : null,
                            metadata: JSON.parse(JSON.stringify(newMetadata)), // Force serialization
                            updatedAt: new Date()
                        }
                    })];
            case 2:
                // Mettre à jour le nœud avec metadata seulement - FORCE JSON serialization
                _e.sent();
                console.log("\u2705 [TablePanel API] Capacit\u00E9 Table mise \u00E0 jour pour n\u0153ud ".concat(nodeId));
                if (!(enabled && activeId)) return [3 /*break*/, 7];
                keyColumn = (currentTable === null || currentTable === void 0 ? void 0 : currentTable.keyColumn) || null;
                keyRow = (currentTable === null || currentTable === void 0 ? void 0 : currentTable.keyRow) || null;
                valueColumn = (currentTable === null || currentTable === void 0 ? void 0 : currentTable.valueColumn) || null;
                valueRow = (currentTable === null || currentTable === void 0 ? void 0 : currentTable.valueRow) || null;
                displayColumn = (currentTable === null || currentTable === void 0 ? void 0 : currentTable.displayColumn) || null;
                displayRow = (currentTable === null || currentTable === void 0 ? void 0 : currentTable.displayRow) || null;
                console.log("\uD83D\uDD27 [TablePanel API] Upsert configuration SELECT", {
                    nodeId: nodeId,
                    activeId: activeId,
                    keyColumn: keyColumn,
                    keyRow: keyRow,
                    valueColumn: valueColumn,
                    valueRow: valueRow,
                    displayColumn: displayColumn,
                    displayRow: displayRow,
                });
                _e.label = 3;
            case 3:
                _e.trys.push([3, 5, , 6]);
                // UPSERT la configuration SELECT avec tous les champs
                return [4 /*yield*/, prisma.treeBranchLeafSelectConfig.upsert({
                        where: { nodeId: nodeId },
                        create: {
                            id: (0, crypto_1.randomUUID)(),
                            nodeId: nodeId,
                            options: [],
                            multiple: false,
                            searchable: true,
                            allowCustom: false,
                            optionsSource: 'table',
                            tableReference: activeId,
                            keyColumn: keyColumn,
                            keyRow: keyRow,
                            valueColumn: valueColumn,
                            valueRow: valueRow,
                            displayColumn: displayColumn,
                            displayRow: displayRow,
                            dependsOnNodeId: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        },
                        update: {
                            tableReference: activeId,
                            keyColumn: keyColumn,
                            keyRow: keyRow,
                            valueColumn: valueColumn,
                            valueRow: valueRow,
                            displayColumn: displayColumn,
                            displayRow: displayRow,
                            updatedAt: new Date(),
                        },
                    })];
            case 4:
                // UPSERT la configuration SELECT avec tous les champs
                _e.sent();
                console.log("\u2705 [TablePanel API] Configuration SELECT upsert\u00E9e pour ".concat(nodeId), {
                    keyColumn: keyColumn,
                    keyRow: keyRow,
                    displayColumn: displayColumn,
                    displayRow: displayRow,
                });
                return [3 /*break*/, 6];
            case 5:
                selectConfigError_2 = _e.sent();
                console.error("\u26A0\uFE0F [TablePanel API] Erreur upsert config SELECT (non-bloquant):", selectConfigError_2);
                return [3 /*break*/, 6];
            case 6: return [3 /*break*/, 11];
            case 7:
                if (!!enabled) return [3 /*break*/, 11];
                // 🔴 DÉSACTIVATION : Supprimer la configuration SELECT
                console.log("\uD83D\uDD34 [TablePanel API] Suppression configuration SELECT pour ".concat(nodeId));
                _e.label = 8;
            case 8:
                _e.trys.push([8, 10, , 11]);
                return [4 /*yield*/, prisma.treeBranchLeafSelectConfig.deleteMany({
                        where: { nodeId: nodeId }
                    })];
            case 9:
                _e.sent();
                console.log("\u2705 [TablePanel API] Configuration SELECT supprim\u00E9e pour ".concat(nodeId));
                return [3 /*break*/, 11];
            case 10:
                deleteError_1 = _e.sent();
                console.error("\u26A0\uFE0F [TablePanel API] Erreur suppression config SELECT (non-bloquant):", deleteError_1);
                return [3 /*break*/, 11];
            case 11: return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                    where: { id: nodeId },
                    select: { metadata: true, hasTable: true }
                })];
            case 12:
                verifyNode = _e.sent();
                console.log("\uD83D\uDD0D [TablePanel API] V\u00C9RIFICATION apr\u00E8s UPDATE:", {
                    nodeId: nodeId,
                    hasTable: verifyNode === null || verifyNode === void 0 ? void 0 : verifyNode.hasTable,
                    metadataCapabilitiesTable: (_d = (_c = verifyNode === null || verifyNode === void 0 ? void 0 : verifyNode.metadata) === null || _c === void 0 ? void 0 : _c.capabilities) === null || _d === void 0 ? void 0 : _d.table
                });
                return [2 /*return*/, res.json({
                        success: true,
                        nodeId: nodeId,
                        capabilities: {
                            table: newCapabilities.table
                        }
                    })];
            case 13:
                error_70 = _e.sent();
                console.error('[TablePanel API] ❌ Erreur PUT /nodes/:nodeId/capabilities/table:', error_70);
                return [2 /*return*/, res.status(500).json({ error: 'Erreur lors de la mise à jour de la capacité Table' })];
            case 14: return [2 /*return*/];
        }
    });
}); });
// PUT /api/treebranchleaf/submissions/:id - Mettre à jour les données d'une soumission (upsert champs + backfill variables)
router.put('/submissions/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, organizationId, isSuperAdmin, _b, data, status, submission, treeId_1, treeOrg, nodes, validNodeIds_2, labelMap_3, variablesMeta, varByExposedKey_1, varMetaByNodeId_1, rawEntries, mappedEntries, entries_1, full, error_71;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                id = req.params.id;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                _b = req.body, data = _b.data, status = _b.status;
                _d.label = 1;
            case 1:
                _d.trys.push([1, 7, , 8]);
                return [4 /*yield*/, prisma.treeBranchLeafSubmission.findUnique({
                        where: { id: id },
                        include: { TreeBranchLeafTree: { select: { id: true, organizationId: true } } }
                    })];
            case 2:
                submission = _d.sent();
                if (!submission) {
                    return [2 /*return*/, res.status(404).json({ error: 'Soumission non trouvée' })];
                }
                treeId_1 = submission.treeId;
                treeOrg = (_c = submission.TreeBranchLeafTree) === null || _c === void 0 ? void 0 : _c.organizationId;
                if (!isSuperAdmin && treeOrg && treeOrg !== organizationId) {
                    return [2 /*return*/, res.status(403).json({ error: 'Accès refusé à cette soumission' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({ where: { treeId: treeId_1 }, select: { id: true, label: true } })];
            case 3:
                nodes = _d.sent();
                validNodeIds_2 = new Set(nodes.map(function (n) { return n.id; }));
                labelMap_3 = new Map(nodes.map(function (n) { return [n.id, n.label]; }));
                return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findMany({
                        where: { TreeBranchLeafNode: { treeId: treeId_1 } },
                        include: { TreeBranchLeafNode: { select: { label: true } } }
                    })];
            case 4:
                variablesMeta = _d.sent();
                varByExposedKey_1 = new Map(variablesMeta
                    .filter(function (v) { return !!v.exposedKey; })
                    .map(function (v) {
                    var _a;
                    return [
                        v.exposedKey,
                        {
                            nodeId: v.nodeId,
                            displayName: v.displayName || ((_a = v.TreeBranchLeafNode) === null || _a === void 0 ? void 0 : _a.label) || v.exposedKey || v.nodeId,
                            unit: v.unit || null,
                            sourceRef: v.sourceRef || null
                        }
                    ];
                }));
                varMetaByNodeId_1 = new Map(variablesMeta.map(function (v) {
                    var _a;
                    return [
                        v.nodeId,
                        {
                            displayName: v.displayName || ((_a = v.TreeBranchLeafNode) === null || _a === void 0 ? void 0 : _a.label) || v.exposedKey || v.nodeId,
                            unit: v.unit || null,
                            sourceRef: v.sourceRef || null
                        }
                    ];
                }));
                rawEntries = (function () {
                    if (Array.isArray(data)) {
                        return data
                            .map(function (it) {
                            if (it && typeof it === 'object' && 'nodeId' in it) {
                                var obj = it;
                                return { nodeId: String(obj.nodeId), value: obj.value, calculatedValue: obj.calculatedValue };
                            }
                            return null;
                        })
                            .filter(function (x) { return !!x; });
                    }
                    if (data && typeof data === 'object') {
                        return Object.entries(data).map(function (_a) {
                            var nodeId = _a[0], value = _a[1];
                            return ({ nodeId: nodeId, value: value });
                        });
                    }
                    return [];
                })();
                mappedEntries = rawEntries.map(function (e) {
                    if (!validNodeIds_2.has(e.nodeId) && varByExposedKey_1.has(e.nodeId)) {
                        var vm = varByExposedKey_1.get(e.nodeId);
                        return { nodeId: vm.nodeId, value: e.value, calculatedValue: e.calculatedValue };
                    }
                    return e;
                });
                entries_1 = mappedEntries
                    .filter(function (_a) {
                    var nodeId = _a.nodeId;
                    return validNodeIds_2.has(nodeId);
                })
                    .map(function (e) { return (__assign(__assign({}, e), { effectiveValue: e.calculatedValue !== undefined ? e.calculatedValue : e.value })); });
                return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var now, inferSource, resolveOperationDetail, existing, existingLabelMap_1, existingSet_2, toCreate, toUpdate, existingAll, valuesMapTx_1, createRows, _loop_13, _i, toUpdate_3, _a, nodeId, effectiveValue, variables, existingVarRows, existingVarSet, missingVars, allRows_1, valuesMapTxAll_1, missingRows, allRows, rowsNeeding, _b, rowsNeeding_1, row, isVar, meta, label, valueStr, opSrc, display, allRows_2, valuesMapTxAll, opRes, opDetail, _c, evaluation, error_72, parsed, rec, ids, refs, human, rec, ids, refs, human, rec, str, ids, m, re, refs, human;
                        var _d, _e;
                        return __generator(this, function (_f) {
                            switch (_f.label) {
                                case 0:
                                    now = new Date();
                                    inferSource = function (sourceRef) {
                                        var s = (sourceRef || '').toLowerCase();
                                        if (s.includes('formula') || s.includes('formule'))
                                            return 'formula';
                                        if (s.includes('condition'))
                                            return 'condition';
                                        if (s.includes('table'))
                                            return 'table';
                                        return 'neutral';
                                    };
                                    resolveOperationDetail = function (sourceRef) { return __awaiter(void 0, void 0, void 0, function () {
                                        var parsed, rec, rec, rec;
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0:
                                                    parsed = parseSourceRef(sourceRef);
                                                    if (!parsed)
                                                        return [2 /*return*/, null];
                                                    if (!(parsed.type === 'condition')) return [3 /*break*/, 2];
                                                    return [4 /*yield*/, tx.treeBranchLeafNodeCondition.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, conditionSet: true, nodeId: true } })];
                                                case 1:
                                                    rec = _a.sent();
                                                    return [2 /*return*/, buildOperationDetail('condition', rec)];
                                                case 2:
                                                    if (!(parsed.type === 'formula')) return [3 /*break*/, 4];
                                                    return [4 /*yield*/, tx.treeBranchLeafNodeFormula.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, tokens: true, nodeId: true } })];
                                                case 3:
                                                    rec = _a.sent();
                                                    return [2 /*return*/, buildOperationDetail('formula', rec)];
                                                case 4:
                                                    if (!(parsed.type === 'table')) return [3 /*break*/, 6];
                                                    return [4 /*yield*/, tx.treeBranchLeafNodeTable.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, type: true, nodeId: true } })];
                                                case 5:
                                                    rec = _a.sent();
                                                    return [2 /*return*/, buildOperationDetail('table', rec)];
                                                case 6: return [2 /*return*/, null];
                                            }
                                        });
                                    }); };
                                    if (!(entries_1.length > 0)) return [3 /*break*/, 9];
                                    return [4 /*yield*/, tx.treeBranchLeafSubmissionData.findMany({
                                            where: { submissionId: id, nodeId: { in: entries_1.map(function (_a) {
                                                        var nodeId = _a.nodeId;
                                                        return nodeId;
                                                    }) } },
                                            select: { nodeId: true, fieldLabel: true }
                                        })];
                                case 1:
                                    existing = _f.sent();
                                    existingLabelMap_1 = new Map(existing.map(function (e) { return [e.nodeId, e.fieldLabel]; }));
                                    existingSet_2 = new Set(existing.map(function (e) { return e.nodeId; }));
                                    toCreate = entries_1.filter(function (_a) {
                                        var nodeId = _a.nodeId;
                                        return !existingSet_2.has(nodeId);
                                    });
                                    toUpdate = entries_1.filter(function (_a) {
                                        var nodeId = _a.nodeId;
                                        return existingSet_2.has(nodeId);
                                    });
                                    if (!(toCreate.length > 0)) return [3 /*break*/, 5];
                                    return [4 /*yield*/, tx.treeBranchLeafSubmissionData.findMany({ where: { submissionId: id }, select: { nodeId: true, value: true } })];
                                case 2:
                                    existingAll = _f.sent();
                                    valuesMapTx_1 = new Map(existingAll.map(function (r) { return [r.nodeId, r.value == null ? null : String(r.value)]; }));
                                    return [4 /*yield*/, Promise.all(toCreate.map(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                                            var isVar, meta, label, valueStr, opSrc, display, opRes, opDetail, _c, parsed, rec, ids, refsRaw, refs, expr, rec, ids, refsRaw, refs, expr, calculatedResult, finalText, rec, str, ids, m, re, refsRaw, refs, expr, unitSuffix, finalText;
                                            var _d, _e, _f;
                                            var nodeId = _b.nodeId, effectiveValue = _b.effectiveValue;
                                            return __generator(this, function (_g) {
                                                switch (_g.label) {
                                                    case 0:
                                                        isVar = varMetaByNodeId_1.has(nodeId);
                                                        meta = isVar ? varMetaByNodeId_1.get(nodeId) : undefined;
                                                        label = labelMap_3.get(nodeId) || existingLabelMap_1.get(nodeId) || null;
                                                        valueStr = effectiveValue == null ? null : String(effectiveValue);
                                                        opSrc = isVar ? inferSource((meta === null || meta === void 0 ? void 0 : meta.sourceRef) || null) : 'neutral';
                                                        display = isVar ? ((meta === null || meta === void 0 ? void 0 : meta.displayName) || label || nodeId) : (label || nodeId);
                                                        opRes = (meta === null || meta === void 0 ? void 0 : meta.unit) && valueStr ? "".concat(display, ": ").concat(valueStr, " ").concat(meta.unit) : "".concat(display, ": ").concat(valueStr !== null && valueStr !== void 0 ? valueStr : '');
                                                        if (!isVar) return [3 /*break*/, 2];
                                                        return [4 /*yield*/, resolveOperationDetail((meta === null || meta === void 0 ? void 0 : meta.sourceRef) || null)];
                                                    case 1:
                                                        _c = (_g.sent());
                                                        return [3 /*break*/, 3];
                                                    case 2:
                                                        _c = label;
                                                        _g.label = 3;
                                                    case 3:
                                                        opDetail = _c;
                                                        if (!(isVar && (meta === null || meta === void 0 ? void 0 : meta.sourceRef))) return [3 /*break*/, 9];
                                                        parsed = parseSourceRef(meta.sourceRef);
                                                        if (!((parsed === null || parsed === void 0 ? void 0 : parsed.type) === 'condition')) return [3 /*break*/, 5];
                                                        return [4 /*yield*/, tx.treeBranchLeafNodeCondition.findUnique({ where: { id: parsed.id }, select: { conditionSet: true } })];
                                                    case 4:
                                                        rec = _g.sent();
                                                        ids = extractNodeIdsFromConditionSet(rec === null || rec === void 0 ? void 0 : rec.conditionSet);
                                                        // inclure la valeur qu'on est en train d'écrire
                                                        valuesMapTx_1.set(nodeId, valueStr);
                                                        refsRaw = buildResolvedRefs(ids, labelMap_3, valuesMapTx_1);
                                                        refs = refsRaw.map(function (r) { var _a, _b; return ({ label: (_a = r.label) !== null && _a !== void 0 ? _a : null, value: (_b = r.value) !== null && _b !== void 0 ? _b : null }); });
                                                        expr = '🔄 Condition évaluée via TBL Prisma (ligne 5456)';
                                                        opRes = { type: 'condition', label: display, value: valueStr, unit: (meta === null || meta === void 0 ? void 0 : meta.unit) || null, refs: refs, text: expr };
                                                        return [3 /*break*/, 9];
                                                    case 5:
                                                        if (!((parsed === null || parsed === void 0 ? void 0 : parsed.type) === 'formula')) return [3 /*break*/, 7];
                                                        return [4 /*yield*/, tx.treeBranchLeafNodeFormula.findUnique({ where: { id: parsed.id }, select: { tokens: true } })];
                                                    case 6:
                                                        rec = _g.sent();
                                                        ids = extractNodeIdsFromTokens(rec === null || rec === void 0 ? void 0 : rec.tokens);
                                                        valuesMapTx_1.set(nodeId, valueStr);
                                                        refsRaw = buildResolvedRefs(ids, labelMap_3, valuesMapTx_1);
                                                        refs = refsRaw.map(function (r) { var _a, _b; return ({ label: (_a = r.label) !== null && _a !== void 0 ? _a : null, value: (_b = r.value) !== null && _b !== void 0 ? _b : null }); });
                                                        expr = buildTextFromTokens(rec === null || rec === void 0 ? void 0 : rec.tokens, labelMap_3, valuesMapTx_1);
                                                        calculatedResult = calculateResult(expr);
                                                        if (calculatedResult !== null) {
                                                            expr += " = ".concat(calculatedResult);
                                                        }
                                                        finalText = expr;
                                                        opRes = { type: 'formula', label: display, value: valueStr, unit: (meta === null || meta === void 0 ? void 0 : meta.unit) || null, refs: refs, text: finalText };
                                                        return [3 /*break*/, 9];
                                                    case 7:
                                                        if (!((parsed === null || parsed === void 0 ? void 0 : parsed.type) === 'table')) return [3 /*break*/, 9];
                                                        return [4 /*yield*/, tx.treeBranchLeafNodeTable.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, type: true, nodeId: true } })];
                                                    case 8:
                                                        rec = _g.sent();
                                                        str = JSON.stringify(rec);
                                                        ids = new Set();
                                                        if (str) {
                                                            m = void 0;
                                                            re = /@value\.([a-f0-9-]{36})/gi;
                                                            while ((m = re.exec(str)) !== null)
                                                                ids.add(m[1]);
                                                        }
                                                        valuesMapTx_1.set(nodeId, valueStr);
                                                        refsRaw = buildResolvedRefs(ids, labelMap_3, valuesMapTx_1);
                                                        refs = refsRaw.map(function (r) { var _a, _b; return ({ label: (_a = r.label) !== null && _a !== void 0 ? _a : null, value: (_b = r.value) !== null && _b !== void 0 ? _b : null }); });
                                                        expr = buildTextFromTableRecord(rec, labelMap_3, valuesMapTx_1);
                                                        unitSuffix = (meta === null || meta === void 0 ? void 0 : meta.unit) ? " ".concat(meta.unit) : '';
                                                        finalText = expr ? "".concat(expr, " (=) ").concat(display, " (").concat(valueStr !== null && valueStr !== void 0 ? valueStr : '').concat(unitSuffix, ")") : "".concat(display, " (").concat(valueStr !== null && valueStr !== void 0 ? valueStr : '').concat(unitSuffix, ")");
                                                        opRes = { type: 'table', label: display, value: valueStr, unit: (meta === null || meta === void 0 ? void 0 : meta.unit) || null, refs: refs, text: finalText };
                                                        _g.label = 9;
                                                    case 9: return [2 /*return*/, {
                                                            id: (0, crypto_1.randomUUID)(),
                                                            submissionId: id,
                                                            nodeId: nodeId,
                                                            value: valueStr,
                                                            fieldLabel: label,
                                                            isVariable: isVar,
                                                            variableDisplayName: isVar ? (_d = meta === null || meta === void 0 ? void 0 : meta.displayName) !== null && _d !== void 0 ? _d : null : null,
                                                            variableKey: null,
                                                            variableUnit: isVar ? (_e = meta === null || meta === void 0 ? void 0 : meta.unit) !== null && _e !== void 0 ? _e : null : null,
                                                            sourceRef: isVar ? (_f = meta === null || meta === void 0 ? void 0 : meta.sourceRef) !== null && _f !== void 0 ? _f : null : null,
                                                            operationSource: opSrc,
                                                            operationDetail: opDetail,
                                                            operationResult: opRes,
                                                            lastResolved: now
                                                        }];
                                                }
                                            });
                                        }); }))];
                                case 3:
                                    createRows = _f.sent();
                                    return [4 /*yield*/, tx.treeBranchLeafSubmissionData.createMany({ data: createRows })];
                                case 4:
                                    _f.sent();
                                    _f.label = 5;
                                case 5:
                                    _loop_13 = function (nodeId, effectiveValue) {
                                        var isVar, meta, label, valueStr, existingAll, valuesMapTx, _g, _h, _j, _k, _l, _o, _p;
                                        var _q, _r, _s, _t;
                                        return __generator(this, function (_u) {
                                            switch (_u.label) {
                                                case 0:
                                                    isVar = varMetaByNodeId_1.has(nodeId);
                                                    meta = isVar ? varMetaByNodeId_1.get(nodeId) : undefined;
                                                    label = labelMap_3.get(nodeId) || existingLabelMap_1.get(nodeId) || undefined;
                                                    valueStr = effectiveValue == null ? null : String(effectiveValue);
                                                    return [4 /*yield*/, tx.treeBranchLeafSubmissionData.findMany({ where: { submissionId: id }, select: { nodeId: true, value: true } })];
                                                case 1:
                                                    existingAll = _u.sent();
                                                    valuesMapTx = new Map(existingAll.map(function (r) { return [r.nodeId, r.value == null ? null : String(r.value)]; }));
                                                    valuesMapTx.set(nodeId, valueStr);
                                                    _u.label = 2;
                                                case 2:
                                                    _u.trys.push([2, 7, , 12]);
                                                    _h = (_g = tx.treeBranchLeafSubmissionData).update;
                                                    _q = {
                                                        where: { submissionId_nodeId: { submissionId: id, nodeId: nodeId } }
                                                    };
                                                    _r = {
                                                        value: valueStr,
                                                        fieldLabel: label,
                                                        operationSource: isVar ? inferSource((meta === null || meta === void 0 ? void 0 : meta.sourceRef) || null) : 'neutral'
                                                    };
                                                    if (!isVar) return [3 /*break*/, 4];
                                                    return [4 /*yield*/, resolveOperationDetail((meta === null || meta === void 0 ? void 0 : meta.sourceRef) || null)];
                                                case 3:
                                                    _j = ((_d = (_u.sent())) !== null && _d !== void 0 ? _d : undefined);
                                                    return [3 /*break*/, 5];
                                                case 4:
                                                    _j = (label || undefined);
                                                    _u.label = 5;
                                                case 5: return [4 /*yield*/, _h.apply(_g, [(_q.data = (_r.operationDetail = _j,
                                                            _r.operationResult = (function () {
                                                                var display = isVar ? ((meta === null || meta === void 0 ? void 0 : meta.displayName) || label || nodeId) : (label || nodeId);
                                                                if (!isVar || !(meta === null || meta === void 0 ? void 0 : meta.sourceRef)) {
                                                                    return (meta === null || meta === void 0 ? void 0 : meta.unit) && valueStr ? "".concat(display, ": ").concat(valueStr, " ").concat(meta.unit) : "".concat(display, ": ").concat(valueStr !== null && valueStr !== void 0 ? valueStr : '');
                                                                }
                                                                var parsed = parseSourceRef(meta.sourceRef);
                                                                if ((parsed === null || parsed === void 0 ? void 0 : parsed.type) === 'condition') {
                                                                    return (function () { return __awaiter(void 0, void 0, void 0, function () {
                                                                        var rec, ids, refsRaw, refs, expr;
                                                                        return __generator(this, function (_a) {
                                                                            switch (_a.label) {
                                                                                case 0: return [4 /*yield*/, tx.treeBranchLeafNodeCondition.findUnique({ where: { id: parsed.id }, select: { conditionSet: true } })];
                                                                                case 1:
                                                                                    rec = _a.sent();
                                                                                    ids = extractNodeIdsFromConditionSet(rec === null || rec === void 0 ? void 0 : rec.conditionSet);
                                                                                    refsRaw = buildResolvedRefs(ids, labelMap_3, valuesMapTx);
                                                                                    refs = refsRaw.map(function (r) { var _a, _b; return ({ label: (_a = r.label) !== null && _a !== void 0 ? _a : null, value: (_b = r.value) !== null && _b !== void 0 ? _b : null }); });
                                                                                    expr = '🔄 Condition évaluée via TBL Prisma (ligne 5545)';
                                                                                    return [2 /*return*/, { type: 'condition', label: display, value: valueStr, unit: (meta === null || meta === void 0 ? void 0 : meta.unit) || null, refs: refs, text: expr }];
                                                                            }
                                                                        });
                                                                    }); })();
                                                                }
                                                                if ((parsed === null || parsed === void 0 ? void 0 : parsed.type) === 'formula') {
                                                                    return (function () { return __awaiter(void 0, void 0, void 0, function () {
                                                                        var rec, ids, refsRaw, refs, expr, calculatedResult;
                                                                        return __generator(this, function (_a) {
                                                                            switch (_a.label) {
                                                                                case 0: return [4 /*yield*/, tx.treeBranchLeafNodeFormula.findUnique({ where: { id: parsed.id }, select: { tokens: true } })];
                                                                                case 1:
                                                                                    rec = _a.sent();
                                                                                    ids = extractNodeIdsFromTokens(rec === null || rec === void 0 ? void 0 : rec.tokens);
                                                                                    refsRaw = buildResolvedRefs(ids, labelMap_3, valuesMapTx);
                                                                                    refs = refsRaw.map(function (r) { var _a, _b; return ({ label: (_a = r.label) !== null && _a !== void 0 ? _a : null, value: (_b = r.value) !== null && _b !== void 0 ? _b : null }); });
                                                                                    expr = buildTextFromTokens(rec === null || rec === void 0 ? void 0 : rec.tokens, labelMap_3, valuesMapTx);
                                                                                    calculatedResult = calculateResult(expr);
                                                                                    if (calculatedResult !== null) {
                                                                                        expr += " = ".concat(calculatedResult);
                                                                                    }
                                                                                    return [2 /*return*/, { type: 'formula', label: display, value: valueStr, unit: (meta === null || meta === void 0 ? void 0 : meta.unit) || null, refs: refs, text: expr }];
                                                                            }
                                                                        });
                                                                    }); })();
                                                                }
                                                                if ((parsed === null || parsed === void 0 ? void 0 : parsed.type) === 'table') {
                                                                    return (function () { return __awaiter(void 0, void 0, void 0, function () {
                                                                        var rec, str, ids, m, re, refsRaw, refs, expr, unitSuffix, finalText;
                                                                        return __generator(this, function (_a) {
                                                                            switch (_a.label) {
                                                                                case 0: return [4 /*yield*/, tx.treeBranchLeafNodeTable.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, type: true, nodeId: true } })];
                                                                                case 1:
                                                                                    rec = _a.sent();
                                                                                    str = JSON.stringify(rec);
                                                                                    ids = new Set();
                                                                                    if (str) {
                                                                                        m = void 0;
                                                                                        re = /@value\.([a-f0-9-]{36})/gi;
                                                                                        while ((m = re.exec(str)) !== null)
                                                                                            ids.add(m[1]);
                                                                                    }
                                                                                    refsRaw = buildResolvedRefs(ids, labelMap_3, valuesMapTx);
                                                                                    refs = refsRaw.map(function (r) { var _a, _b; return ({ label: (_a = r.label) !== null && _a !== void 0 ? _a : null, value: (_b = r.value) !== null && _b !== void 0 ? _b : null }); });
                                                                                    expr = buildTextFromTableRecord(rec, labelMap_3, valuesMapTx);
                                                                                    unitSuffix = (meta === null || meta === void 0 ? void 0 : meta.unit) ? " ".concat(meta.unit) : '';
                                                                                    finalText = expr ? "".concat(expr, " (=) ").concat(display, " (").concat(valueStr !== null && valueStr !== void 0 ? valueStr : '').concat(unitSuffix, ")") : "".concat(display, " (").concat(valueStr !== null && valueStr !== void 0 ? valueStr : '').concat(unitSuffix, ")");
                                                                                    return [2 /*return*/, { type: 'table', label: display, value: valueStr, unit: (meta === null || meta === void 0 ? void 0 : meta.unit) || null, refs: refs, text: finalText }];
                                                                            }
                                                                        });
                                                                    }); })();
                                                                }
                                                                return (meta === null || meta === void 0 ? void 0 : meta.unit) && valueStr ? "".concat(display, ": ").concat(valueStr, " ").concat(meta.unit) : "".concat(display, ": ").concat(valueStr !== null && valueStr !== void 0 ? valueStr : '');
                                                            })(),
                                                            _r.lastResolved = now,
                                                            _r),
                                                            _q)])];
                                                case 6:
                                                    _u.sent();
                                                    return [3 /*break*/, 12];
                                                case 7:
                                                    _k = _u.sent();
                                                    _o = (_l = tx.treeBranchLeafSubmissionData).updateMany;
                                                    _s = {
                                                        where: { submissionId: id, nodeId: nodeId }
                                                    };
                                                    _t = {
                                                        value: valueStr,
                                                        fieldLabel: label,
                                                        operationSource: isVar ? inferSource((meta === null || meta === void 0 ? void 0 : meta.sourceRef) || null) : 'neutral'
                                                    };
                                                    if (!isVar) return [3 /*break*/, 9];
                                                    return [4 /*yield*/, resolveOperationDetail((meta === null || meta === void 0 ? void 0 : meta.sourceRef) || null)];
                                                case 8:
                                                    _p = ((_e = (_u.sent())) !== null && _e !== void 0 ? _e : undefined);
                                                    return [3 /*break*/, 10];
                                                case 9:
                                                    _p = (label || undefined);
                                                    _u.label = 10;
                                                case 10: return [4 /*yield*/, _o.apply(_l, [(_s.data = (_t.operationDetail = _p,
                                                            _t.operationResult = (function () {
                                                                var display = isVar ? ((meta === null || meta === void 0 ? void 0 : meta.displayName) || label || nodeId) : (label || nodeId);
                                                                if (!isVar || !(meta === null || meta === void 0 ? void 0 : meta.sourceRef)) {
                                                                    return (meta === null || meta === void 0 ? void 0 : meta.unit) && valueStr ? "".concat(display, ": ").concat(valueStr, " ").concat(meta.unit) : "".concat(display, ": ").concat(valueStr !== null && valueStr !== void 0 ? valueStr : '');
                                                                }
                                                                var parsed = parseSourceRef(meta.sourceRef);
                                                                if ((parsed === null || parsed === void 0 ? void 0 : parsed.type) === 'condition') {
                                                                    return (function () { return __awaiter(void 0, void 0, void 0, function () {
                                                                        var rec, ids, refs;
                                                                        return __generator(this, function (_a) {
                                                                            switch (_a.label) {
                                                                                case 0: return [4 /*yield*/, tx.treeBranchLeafNodeCondition.findUnique({ where: { id: parsed.id }, select: { conditionSet: true } })];
                                                                                case 1:
                                                                                    rec = _a.sent();
                                                                                    ids = extractNodeIdsFromConditionSet(rec === null || rec === void 0 ? void 0 : rec.conditionSet);
                                                                                    refs = buildResolvedRefs(ids, labelMap_3, valuesMapTx);
                                                                                    return [2 /*return*/, { type: 'condition', label: display, value: valueStr, unit: (meta === null || meta === void 0 ? void 0 : meta.unit) || null, refs: refs }];
                                                                            }
                                                                        });
                                                                    }); })();
                                                                }
                                                                if ((parsed === null || parsed === void 0 ? void 0 : parsed.type) === 'formula') {
                                                                    return (function () { return __awaiter(void 0, void 0, void 0, function () {
                                                                        var rec, ids, refs;
                                                                        return __generator(this, function (_a) {
                                                                            switch (_a.label) {
                                                                                case 0: return [4 /*yield*/, tx.treeBranchLeafNodeFormula.findUnique({ where: { id: parsed.id }, select: { tokens: true } })];
                                                                                case 1:
                                                                                    rec = _a.sent();
                                                                                    ids = extractNodeIdsFromTokens(rec === null || rec === void 0 ? void 0 : rec.tokens);
                                                                                    refs = buildResolvedRefs(ids, labelMap_3, valuesMapTx);
                                                                                    return [2 /*return*/, { type: 'formula', label: display, value: valueStr, unit: (meta === null || meta === void 0 ? void 0 : meta.unit) || null, refs: refs }];
                                                                            }
                                                                        });
                                                                    }); })();
                                                                }
                                                                if ((parsed === null || parsed === void 0 ? void 0 : parsed.type) === 'table') {
                                                                    return (function () { return __awaiter(void 0, void 0, void 0, function () {
                                                                        var rec, str, ids, m, re, refs;
                                                                        return __generator(this, function (_a) {
                                                                            switch (_a.label) {
                                                                                case 0: return [4 /*yield*/, tx.treeBranchLeafNodeTable.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, type: true, nodeId: true } })];
                                                                                case 1:
                                                                                    rec = _a.sent();
                                                                                    str = JSON.stringify(rec);
                                                                                    ids = new Set();
                                                                                    if (str) {
                                                                                        m = void 0;
                                                                                        re = /@value\.([a-f0-9-]{36})/gi;
                                                                                        while ((m = re.exec(str)) !== null)
                                                                                            ids.add(m[1]);
                                                                                    }
                                                                                    refs = buildResolvedRefs(ids, labelMap_3, valuesMapTx);
                                                                                    return [2 /*return*/, { type: 'table', label: display, value: valueStr, unit: (meta === null || meta === void 0 ? void 0 : meta.unit) || null, refs: refs }];
                                                                            }
                                                                        });
                                                                    }); })();
                                                                }
                                                                return (meta === null || meta === void 0 ? void 0 : meta.unit) && valueStr ? "".concat(display, ": ").concat(valueStr, " ").concat(meta.unit) : "".concat(display, ": ").concat(valueStr !== null && valueStr !== void 0 ? valueStr : '');
                                                            })(),
                                                            _t.lastResolved = now,
                                                            _t),
                                                            _s)])];
                                                case 11:
                                                    _u.sent();
                                                    return [3 /*break*/, 12];
                                                case 12: return [2 /*return*/];
                                            }
                                        });
                                    };
                                    _i = 0, toUpdate_3 = toUpdate;
                                    _f.label = 6;
                                case 6:
                                    if (!(_i < toUpdate_3.length)) return [3 /*break*/, 9];
                                    _a = toUpdate_3[_i], nodeId = _a.nodeId, effectiveValue = _a.effectiveValue;
                                    return [5 /*yield**/, _loop_13(nodeId, effectiveValue)];
                                case 7:
                                    _f.sent();
                                    _f.label = 8;
                                case 8:
                                    _i++;
                                    return [3 /*break*/, 6];
                                case 9: return [4 /*yield*/, tx.treeBranchLeafNodeVariable.findMany({
                                        where: { TreeBranchLeafNode: { treeId: treeId_1 } },
                                        include: { TreeBranchLeafNode: { select: { id: true, label: true } } }
                                    })];
                                case 10:
                                    variables = _f.sent();
                                    return [4 /*yield*/, tx.treeBranchLeafSubmissionData.findMany({ where: { submissionId: id, nodeId: { in: variables.map(function (v) { return v.nodeId; }) } }, select: { nodeId: true } })];
                                case 11:
                                    existingVarRows = _f.sent();
                                    existingVarSet = new Set(existingVarRows.map(function (r) { return r.nodeId; }));
                                    missingVars = variables.filter(function (v) { return !existingVarSet.has(v.nodeId); });
                                    if (!(missingVars.length > 0)) return [3 /*break*/, 15];
                                    return [4 /*yield*/, tx.treeBranchLeafSubmissionData.findMany({ where: { submissionId: id }, select: { nodeId: true, value: true } })];
                                case 12:
                                    allRows_1 = _f.sent();
                                    valuesMapTxAll_1 = new Map(allRows_1.map(function (r) { return [r.nodeId, r.value == null ? null : String(r.value)]; }));
                                    return [4 /*yield*/, Promise.all(missingVars.map(function (v) { return __awaiter(void 0, void 0, void 0, function () {
                                            var _a;
                                            var _b;
                                            return __generator(this, function (_c) {
                                                switch (_c.label) {
                                                    case 0:
                                                        _a = {
                                                            id: (0, crypto_1.randomUUID)(),
                                                            submissionId: id,
                                                            nodeId: v.nodeId,
                                                            value: null,
                                                            fieldLabel: ((_b = v.TreeBranchLeafNode) === null || _b === void 0 ? void 0 : _b.label) || null,
                                                            isVariable: true,
                                                            variableDisplayName: v.displayName,
                                                            variableKey: v.exposedKey,
                                                            variableUnit: v.unit,
                                                            sourceRef: v.sourceRef || null,
                                                            operationSource: inferSource(v.sourceRef || null)
                                                        };
                                                        return [4 /*yield*/, resolveOperationDetail(v.sourceRef || null)];
                                                    case 1: return [2 /*return*/, (_a.operationDetail = _c.sent(),
                                                            _a.operationResult = (function () {
                                                                var _a;
                                                                var display = (v.displayName || ((_a = v.TreeBranchLeafNode) === null || _a === void 0 ? void 0 : _a.label) || v.exposedKey || v.nodeId);
                                                                if (!v.sourceRef)
                                                                    return "".concat(display, ": ");
                                                                var parsed = parseSourceRef(v.sourceRef);
                                                                if ((parsed === null || parsed === void 0 ? void 0 : parsed.type) === 'condition') {
                                                                    return (function () { return __awaiter(void 0, void 0, void 0, function () {
                                                                        var rec, ids, refs, human;
                                                                        return __generator(this, function (_a) {
                                                                            switch (_a.label) {
                                                                                case 0: return [4 /*yield*/, tx.treeBranchLeafNodeCondition.findUnique({ where: { id: parsed.id }, select: { conditionSet: true } })];
                                                                                case 1:
                                                                                    rec = _a.sent();
                                                                                    ids = extractNodeIdsFromConditionSet(rec === null || rec === void 0 ? void 0 : rec.conditionSet);
                                                                                    refs = buildResolvedRefs(ids, labelMap_3, valuesMapTxAll_1);
                                                                                    human = "".concat(display);
                                                                                    return [2 /*return*/, { type: 'condition', label: display, value: null, unit: v.unit || null, refs: refs, text: buildResultText(human, null, v.unit || null) }];
                                                                            }
                                                                        });
                                                                    }); })();
                                                                }
                                                                if ((parsed === null || parsed === void 0 ? void 0 : parsed.type) === 'formula') {
                                                                    return (function () { return __awaiter(void 0, void 0, void 0, function () {
                                                                        var rec, ids, refs, human;
                                                                        return __generator(this, function (_a) {
                                                                            switch (_a.label) {
                                                                                case 0: return [4 /*yield*/, tx.treeBranchLeafNodeFormula.findUnique({ where: { id: parsed.id }, select: { tokens: true } })];
                                                                                case 1:
                                                                                    rec = _a.sent();
                                                                                    ids = extractNodeIdsFromTokens(rec === null || rec === void 0 ? void 0 : rec.tokens);
                                                                                    refs = buildResolvedRefs(ids, labelMap_3, valuesMapTxAll_1);
                                                                                    human = "".concat(display);
                                                                                    return [2 /*return*/, { type: 'formula', label: display, value: null, unit: v.unit || null, refs: refs, text: buildResultText(human, null, v.unit || null) }];
                                                                            }
                                                                        });
                                                                    }); })();
                                                                }
                                                                if ((parsed === null || parsed === void 0 ? void 0 : parsed.type) === 'table') {
                                                                    return (function () { return __awaiter(void 0, void 0, void 0, function () {
                                                                        var rec, str, ids, m, re, refs, human;
                                                                        return __generator(this, function (_a) {
                                                                            switch (_a.label) {
                                                                                case 0: return [4 /*yield*/, tx.treeBranchLeafNodeTable.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, type: true, nodeId: true } })];
                                                                                case 1:
                                                                                    rec = _a.sent();
                                                                                    str = JSON.stringify(rec);
                                                                                    ids = new Set();
                                                                                    if (str) {
                                                                                        m = void 0;
                                                                                        re = /@value\.([a-f0-9-]{36})/gi;
                                                                                        while ((m = re.exec(str)) !== null)
                                                                                            ids.add(m[1]);
                                                                                    }
                                                                                    refs = buildResolvedRefs(ids, labelMap_3, valuesMapTxAll_1);
                                                                                    human = "".concat(display);
                                                                                    return [2 /*return*/, { type: 'table', label: display, value: null, unit: v.unit || null, refs: refs, text: buildResultText(human, null, v.unit || null) }];
                                                                            }
                                                                        });
                                                                    }); })();
                                                                }
                                                                return "".concat(display, ": ");
                                                            })(),
                                                            _a.lastResolved = now,
                                                            _a)];
                                                }
                                            });
                                        }); }))];
                                case 13:
                                    missingRows = _f.sent();
                                    return [4 /*yield*/, tx.treeBranchLeafSubmissionData.createMany({ data: missingRows })];
                                case 14:
                                    _f.sent();
                                    _f.label = 15;
                                case 15: return [4 /*yield*/, tx.treeBranchLeafSubmissionData.findMany({
                                        where: {
                                            submissionId: id
                                        },
                                        select: {
                                            nodeId: true,
                                            isVariable: true,
                                            value: true,
                                            sourceRef: true,
                                            operationDetail: true,
                                            operationResult: true,
                                            lastResolved: true
                                        }
                                    })];
                                case 16:
                                    allRows = _f.sent();
                                    rowsNeeding = allRows.filter(function (row) {
                                        return row.operationDetail === null ||
                                            row.operationResult === null ||
                                            row.lastResolved === null;
                                    });
                                    _b = 0, rowsNeeding_1 = rowsNeeding;
                                    _f.label = 17;
                                case 17:
                                    if (!(_b < rowsNeeding_1.length)) return [3 /*break*/, 35];
                                    row = rowsNeeding_1[_b];
                                    isVar = row.isVariable;
                                    meta = isVar ? varMetaByNodeId_1.get(row.nodeId) : undefined;
                                    label = labelMap_3.get(row.nodeId) || undefined;
                                    valueStr = row.value == null ? null : String(row.value);
                                    opSrc = isVar ? inferSource((meta === null || meta === void 0 ? void 0 : meta.sourceRef) || null) : 'neutral';
                                    display = isVar ? ((meta === null || meta === void 0 ? void 0 : meta.displayName) || label || row.nodeId) : (label || row.nodeId);
                                    return [4 /*yield*/, tx.treeBranchLeafSubmissionData.findMany({ where: { submissionId: id }, select: { nodeId: true, value: true } })];
                                case 18:
                                    allRows_2 = _f.sent();
                                    valuesMapTxAll = new Map(allRows_2.map(function (r) { return [r.nodeId, r.value == null ? null : String(r.value)]; }));
                                    valuesMapTxAll.set(row.nodeId, valueStr);
                                    opRes = (meta === null || meta === void 0 ? void 0 : meta.unit) && valueStr ? "".concat(display, ": ").concat(valueStr, " ").concat(meta.unit) : "".concat(display, ": ").concat(valueStr !== null && valueStr !== void 0 ? valueStr : '');
                                    if (!isVar) return [3 /*break*/, 20];
                                    return [4 /*yield*/, resolveOperationDetail(row.sourceRef || null)];
                                case 19:
                                    _c = (_f.sent());
                                    return [3 /*break*/, 21];
                                case 20:
                                    _c = label;
                                    _f.label = 21;
                                case 21:
                                    opDetail = _c;
                                    if (!(isVar && (row.sourceRef || (meta === null || meta === void 0 ? void 0 : meta.sourceRef)))) return [3 /*break*/, 32];
                                    _f.label = 22;
                                case 22:
                                    _f.trys.push([22, 25, , 32]);
                                    console.log("[UNIVERSAL] \uD83D\uDD04 \u00C9valuation de la variable: ".concat(row.nodeId, " (").concat(display, ")"));
                                    return [4 /*yield*/, (0, operation_interpreter_js_1.evaluateVariableOperation)(row.nodeId, id, // submissionId
                                        tx // Utiliser la transaction Prisma
                                        )];
                                case 23:
                                    evaluation = _f.sent();
                                    console.log("[UNIVERSAL] \u2705 R\u00E9sultat: ".concat(evaluation.value));
                                    // Utiliser le résultat du système universel
                                    opRes = evaluation.operationResult;
                                    // Mettre à jour la valeur calculée dans la base
                                    return [4 /*yield*/, tx.treeBranchLeafSubmissionData.updateMany({
                                            where: { submissionId: id, nodeId: row.nodeId },
                                            data: { value: evaluation.value }
                                        })];
                                case 24:
                                    // Mettre à jour la valeur calculée dans la base
                                    _f.sent();
                                    return [3 /*break*/, 32];
                                case 25:
                                    error_72 = _f.sent();
                                    console.error("[UNIVERSAL] \u274C Erreur \u00E9valuation variable ".concat(row.nodeId, ":"), error_72);
                                    parsed = parseSourceRef(row.sourceRef || (meta === null || meta === void 0 ? void 0 : meta.sourceRef) || null);
                                    if (!((parsed === null || parsed === void 0 ? void 0 : parsed.type) === 'condition')) return [3 /*break*/, 27];
                                    return [4 /*yield*/, tx.treeBranchLeafNodeCondition.findUnique({ where: { id: parsed.id }, select: { conditionSet: true } })];
                                case 26:
                                    rec = _f.sent();
                                    ids = extractNodeIdsFromConditionSet(rec === null || rec === void 0 ? void 0 : rec.conditionSet);
                                    refs = buildResolvedRefs(ids, labelMap_3, valuesMapTxAll);
                                    human = "".concat(display);
                                    opRes = { type: 'condition', label: display, value: valueStr, unit: (meta === null || meta === void 0 ? void 0 : meta.unit) || null, refs: refs, text: buildResultText(human, valueStr, (meta === null || meta === void 0 ? void 0 : meta.unit) || null) };
                                    return [3 /*break*/, 31];
                                case 27:
                                    if (!((parsed === null || parsed === void 0 ? void 0 : parsed.type) === 'formula')) return [3 /*break*/, 29];
                                    return [4 /*yield*/, tx.treeBranchLeafNodeFormula.findUnique({ where: { id: parsed.id }, select: { tokens: true } })];
                                case 28:
                                    rec = _f.sent();
                                    ids = extractNodeIdsFromTokens(rec === null || rec === void 0 ? void 0 : rec.tokens);
                                    refs = buildResolvedRefs(ids, labelMap_3, valuesMapTxAll);
                                    human = "".concat(display);
                                    opRes = { type: 'formula', label: display, value: valueStr, unit: (meta === null || meta === void 0 ? void 0 : meta.unit) || null, refs: refs, text: buildResultText(human, valueStr, (meta === null || meta === void 0 ? void 0 : meta.unit) || null) };
                                    return [3 /*break*/, 31];
                                case 29:
                                    if (!((parsed === null || parsed === void 0 ? void 0 : parsed.type) === 'table')) return [3 /*break*/, 31];
                                    return [4 /*yield*/, tx.treeBranchLeafNodeTable.findUnique({ where: { id: parsed.id }, select: { id: true, name: true, description: true, type: true, nodeId: true } })];
                                case 30:
                                    rec = _f.sent();
                                    str = JSON.stringify(rec);
                                    ids = new Set();
                                    if (str) {
                                        m = void 0;
                                        re = /@value\.([a-f0-9-]{36})/gi;
                                        while ((m = re.exec(str)) !== null)
                                            ids.add(m[1]);
                                    }
                                    refs = buildResolvedRefs(ids, labelMap_3, valuesMapTxAll);
                                    human = "".concat(display);
                                    opRes = { type: 'table', label: display, value: valueStr, unit: (meta === null || meta === void 0 ? void 0 : meta.unit) || null, refs: refs, text: buildResultText(human, valueStr, (meta === null || meta === void 0 ? void 0 : meta.unit) || null) };
                                    _f.label = 31;
                                case 31: return [3 /*break*/, 32];
                                case 32: return [4 /*yield*/, tx.treeBranchLeafSubmissionData.updateMany({
                                        where: { submissionId: id, nodeId: row.nodeId },
                                        data: {
                                            operationSource: opSrc,
                                            operationDetail: opDetail !== null && opDetail !== void 0 ? opDetail : (isVar ? ((meta === null || meta === void 0 ? void 0 : meta.sourceRef) || undefined) : (label || undefined)),
                                            operationResult: opRes,
                                            lastResolved: now
                                        }
                                    })];
                                case 33:
                                    _f.sent();
                                    _f.label = 34;
                                case 34:
                                    _b++;
                                    return [3 /*break*/, 17];
                                case 35:
                                    if (!(status && typeof status === 'string')) return [3 /*break*/, 37];
                                    return [4 /*yield*/, tx.treeBranchLeafSubmission.update({ where: { id: id }, data: { status: status, updatedAt: new Date() } })];
                                case 36:
                                    _f.sent();
                                    return [3 /*break*/, 39];
                                case 37: return [4 /*yield*/, tx.treeBranchLeafSubmission.update({ where: { id: id }, data: { updatedAt: new Date() } })];
                                case 38:
                                    _f.sent();
                                    _f.label = 39;
                                case 39: return [2 /*return*/];
                            }
                        });
                    }); })];
            case 5:
                _d.sent();
                return [4 /*yield*/, prisma.treeBranchLeafSubmission.findUnique({
                        where: { id: id },
                        include: {
                            TreeBranchLeafTree: { select: { id: true, name: true } },
                            Lead: { select: { id: true, firstName: true, lastName: true, email: true } },
                            TreeBranchLeafSubmissionData: { include: { TreeBranchLeafNode: { select: { id: true, label: true, type: true } } } }
                        }
                    })];
            case 6:
                full = _d.sent();
                return [2 /*return*/, res.json(full)];
            case 7:
                error_71 = _d.sent();
                console.error('[TreeBranchLeaf API] ❌ Erreur PUT /submissions/:id:', error_71);
                return [2 /*return*/, res.status(500).json({ error: 'Erreur lors de la mise à jour de la soumission' })];
            case 8: return [2 /*return*/];
        }
    });
}); });
// ═══════════════════════════════════════════════════════════════════════════
// 🎯 NOUVELLES ROUTES - SYSTÈME UNIVERSEL D'INTERPRÉTATION TBL
// ═══════════════════════════════════════════════════════════════════════════
// Ces routes utilisent le système moderne operation-interpreter.ts
// Elles sont INDÉPENDANTES des anciens systèmes (CapacityCalculator, etc.)
// ═══════════════════════════════════════════════════════════════════════════
/**
 * 🎯 POST /api/treebranchleaf/v2/variables/:variableNodeId/evaluate
 *
 * ÉVALUE UNE VARIABLE avec le système universel d'interprétation
 *
 * Cette route est le POINT D'ENTRÉE PRINCIPAL pour évaluer n'importe quelle
 * variable (condition, formule, table) de manière récursive et complète.
 *
 * PARAMÈTRES :
 * ------------
 * - variableNodeId : ID du nœud TreeBranchLeafNode qui contient la Variable
 * - submissionId (body) : ID de la soumission en cours
 *
 * RETOUR :
 * --------
 * {
 *   success: true,
 *   variable: { nodeId, displayName, exposedKey },
 *   result: {
 *     value: "73",              // Valeur calculée finale
 *     operationDetail: {...},    // Structure détaillée complète
 *     operationResult: "Si...",  // Texte explicatif en français
 *     operationSource: "table"   // Type d'opération source
 *   },
 *   evaluation: {
 *     mode: 'universal-interpreter',
 *     timestamp: "2025-01-06T...",
 *     depth: 0
 *   }
 * }
 *
 * EXEMPLES D'UTILISATION :
 * ------------------------
 * 1. Variable qui pointe vers une condition :
 *    POST /api/treebranchleaf/v2/variables/10bfb6d2.../evaluate
 *    Body: { submissionId: "tbl-1759750447813-xxx" }
 *    → Évalue récursivement la condition et retourne le résultat
 *
 * 2. Variable qui pointe vers une table :
 *    POST /api/treebranchleaf/v2/variables/abc123.../evaluate
 *    Body: { submissionId: "tbl-xxx" }
 *    → Effectue le lookup dans la table et retourne la valeur
 *
 * 3. Variable qui pointe vers une formule :
 *    POST /api/treebranchleaf/v2/variables/def456.../evaluate
 *    Body: { submissionId: "tbl-xxx" }
 *    → Calcule la formule et retourne le résultat
 */
router.post('/v2/variables/:variableNodeId/evaluate', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var variableNodeId, submissionId, _a, organizationId, isSuperAdmin, node, variable, submission, startTime, evaluationResult, duration, response, error_73;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 5, , 6]);
                variableNodeId = req.params.variableNodeId;
                submissionId = req.body.submissionId;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                console.log('\n' + '═'.repeat(80));
                console.log('🎯 [V2 API] ÉVALUATION VARIABLE UNIVERSELLE');
                console.log('═'.repeat(80));
                console.log('📋 Paramètres:');
                console.log('   - variableNodeId:', variableNodeId);
                console.log('   - submissionId:', submissionId);
                console.log('   - organizationId:', organizationId);
                console.log('   - isSuperAdmin:', isSuperAdmin);
                console.log('═'.repeat(80) + '\n');
                // ═══════════════════════════════════════════════════════════════════════
                // ✅ ÉTAPE 1 : Validation des paramètres
                // ═══════════════════════════════════════════════════════════════════════
                if (!variableNodeId) {
                    console.error('❌ [V2 API] variableNodeId manquant');
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            error: 'variableNodeId requis'
                        })];
                }
                if (!submissionId) {
                    console.error('❌ [V2 API] submissionId manquant');
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            error: 'submissionId requis dans le body'
                        })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                        where: { id: variableNodeId },
                        include: {
                            TreeBranchLeafTree: {
                                select: {
                                    id: true,
                                    name: true,
                                    organizationId: true
                                }
                            },
                            TreeBranchLeafNodeVariable: {
                                select: {
                                    id: true,
                                    nodeId: true,
                                    exposedKey: true,
                                    displayName: true,
                                    sourceType: true,
                                    sourceRef: true,
                                    fixedValue: true,
                                    defaultValue: true
                                }
                            }
                        }
                    })];
            case 1:
                node = _d.sent();
                if (!node) {
                    console.error('❌ [V2 API] Nœud introuvable:', variableNodeId);
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            error: 'Nœud introuvable'
                        })];
                }
                console.log('✅ [V2 API] Nœud trouvé:', node.label);
                // ═══════════════════════════════════════════════════════════════════════
                // 🔒 ÉTAPE 3 : Vérifier les permissions d'organisation
                // ═══════════════════════════════════════════════════════════════════════
                if (!isSuperAdmin && ((_b = node.TreeBranchLeafTree) === null || _b === void 0 ? void 0 : _b.organizationId) !== organizationId) {
                    console.error('❌ [V2 API] Accès refusé - mauvaise organisation');
                    return [2 /*return*/, res.status(403).json({
                            success: false,
                            error: 'Accès refusé à ce nœud'
                        })];
                }
                console.log('✅ [V2 API] Permissions validées');
                variable = (_c = node.TreeBranchLeafNodeVariable) === null || _c === void 0 ? void 0 : _c[0];
                if (!variable) {
                    console.error('❌ [V2 API] Pas de variable associée à ce nœud');
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            error: 'Ce nœud ne contient pas de variable'
                        })];
                }
                console.log('✅ [V2 API] Variable trouvée:', variable.displayName);
                console.log('   - sourceType:', variable.sourceType);
                console.log('   - sourceRef:', variable.sourceRef);
                return [4 /*yield*/, prisma.treeBranchLeafSubmission.findUnique({
                        where: { id: submissionId },
                        select: {
                            id: true,
                            treeId: true,
                            leadId: true,
                            status: true
                        }
                    })];
            case 2:
                submission = _d.sent();
                if (!submission) {
                    console.error('❌ [V2 API] Soumission introuvable:', submissionId);
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            error: 'Soumission introuvable'
                        })];
                }
                console.log('✅ [V2 API] Soumission trouvée:', submissionId);
                // ═══════════════════════════════════════════════════════════════════════
                // 🚀 ÉTAPE 6 : ÉVALUATION UNIVERSELLE avec operation-interpreter
                // ═══════════════════════════════════════════════════════════════════════
                console.log('\n' + '─'.repeat(80));
                console.log('🚀 [V2 API] Démarrage évaluation universelle...');
                console.log('─'.repeat(80) + '\n');
                startTime = Date.now();
                return [4 /*yield*/, (0, operation_interpreter_js_1.evaluateVariableOperation)(variableNodeId, submissionId, prisma)];
            case 3:
                evaluationResult = _d.sent();
                duration = Date.now() - startTime;
                console.log('\n' + '─'.repeat(80));
                console.log('✅ [V2 API] Évaluation terminée avec succès !');
                console.log('   - Durée:', duration, 'ms');
                console.log('   - Résultat:', evaluationResult.value);
                console.log('   - OperationSource:', evaluationResult.operationSource);
                console.log('─'.repeat(80) + '\n');
                // ═══════════════════════════════════════════════════════════════════════
                // 💾 ÉTAPE 7 : Sauvegarder le résultat dans SubmissionData
                // ═══════════════════════════════════════════════════════════════════════
                console.log('💾 [V2 API] Sauvegarde dans SubmissionData...');
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.upsert({
                        where: {
                            submissionId_nodeId: {
                                submissionId: submissionId,
                                nodeId: variableNodeId
                            }
                        },
                        update: {
                            value: evaluationResult.value,
                            operationDetail: evaluationResult.operationDetail,
                            operationResult: evaluationResult.operationResult,
                            operationSource: evaluationResult.operationSource,
                            lastResolved: new Date(),
                            updatedAt: new Date()
                        },
                        create: {
                            submissionId: submissionId,
                            nodeId: variableNodeId,
                            value: evaluationResult.value,
                            operationDetail: evaluationResult.operationDetail,
                            operationResult: evaluationResult.operationResult,
                            operationSource: evaluationResult.operationSource,
                            lastResolved: new Date(),
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    })];
            case 4:
                _d.sent();
                console.log('✅ [V2 API] Sauvegarde effectuée\n');
                response = {
                    success: true,
                    variable: {
                        nodeId: variable.nodeId,
                        displayName: variable.displayName,
                        exposedKey: variable.exposedKey,
                        sourceType: variable.sourceType,
                        sourceRef: variable.sourceRef
                    },
                    result: {
                        value: evaluationResult.value,
                        operationDetail: evaluationResult.operationDetail,
                        operationResult: evaluationResult.operationResult,
                        operationSource: evaluationResult.operationSource,
                        sourceRef: evaluationResult.sourceRef
                    },
                    evaluation: {
                        mode: 'universal-interpreter',
                        version: '1.0.0',
                        timestamp: new Date().toISOString(),
                        duration: "".concat(duration, "ms"),
                        submissionId: submissionId,
                        nodeLabel: node.label
                    }
                };
                console.log('═'.repeat(80));
                console.log('📤 [V2 API] Réponse envoyée avec succès');
                console.log('═'.repeat(80) + '\n');
                return [2 /*return*/, res.json(response)];
            case 5:
                error_73 = _d.sent();
                console.error('\n' + '═'.repeat(80));
                console.error('❌ [V2 API] ERREUR CRITIQUE');
                console.error('═'.repeat(80));
                console.error(error_73);
                console.error('═'.repeat(80) + '\n');
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        error: 'Erreur lors de l\'évaluation de la variable',
                        details: error_73 instanceof Error ? error_73.message : 'Erreur inconnue',
                        stack: process.env.NODE_ENV === 'development' && error_73 instanceof Error ? error_73.stack : undefined
                    })];
            case 6: return [2 /*return*/];
        }
    });
}); });
/**
 * 🔍 GET /api/treebranchleaf/v2/submissions/:submissionId/variables
 *
 * RÉCUPÈRE TOUTES LES VARIABLES d'une soumission avec leurs valeurs évaluées
 *
 * Cette route permet d'obtenir un aperçu complet de toutes les variables
 * d'une soumission, avec leurs valeurs calculées et leurs textes explicatifs.
 *
 * RETOUR :
 * --------
 * {
 *   success: true,
 *   submissionId: "tbl-xxx",
 *   tree: { id, name },
 *   variables: [
 *     {
 *       nodeId: "xxx",
 *       displayName: "Prix Kw/h test",
 *       exposedKey: "prix_kwh_test",
 *       value: "73",
 *       operationResult: "Si Prix > 10...",
 *       operationSource: "condition",
 *       lastResolved: "2025-01-06T..."
 *     },
 *     ...
 *   ]
 * }
 */
router.get('/v2/submissions/:submissionId/variables', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var submissionId, _a, organizationId, isSuperAdmin, submission, variables, submissionData, dataMap_1, variablesResponse, error_74;
    var _b, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 4, , 5]);
                submissionId = req.params.submissionId;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                console.log('\n🔍 [V2 API] RÉCUPÉRATION VARIABLES:', submissionId);
                return [4 /*yield*/, prisma.treeBranchLeafSubmission.findUnique({
                        where: { id: submissionId },
                        include: {
                            TreeBranchLeafTree: {
                                select: {
                                    id: true,
                                    name: true,
                                    organizationId: true
                                }
                            }
                        }
                    })];
            case 1:
                submission = _e.sent();
                if (!submission) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            error: 'Soumission introuvable'
                        })];
                }
                // Vérifier les permissions
                if (!isSuperAdmin && ((_b = submission.TreeBranchLeafTree) === null || _b === void 0 ? void 0 : _b.organizationId) !== organizationId) {
                    return [2 /*return*/, res.status(403).json({
                            success: false,
                            error: 'Accès refusé à cette soumission'
                        })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findMany({
                        where: {
                            TreeBranchLeafNode: {
                                treeId: submission.treeId
                            }
                        },
                        include: {
                            TreeBranchLeafNode: {
                                select: {
                                    id: true,
                                    label: true,
                                    type: true
                                }
                            }
                        }
                    })];
            case 2:
                variables = _e.sent();
                console.log('✅ [V2 API] Variables trouvées:', variables.length);
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.findMany({
                        where: {
                            submissionId: submissionId,
                            nodeId: {
                                in: variables.map(function (v) { return v.nodeId; })
                            }
                        }
                    })];
            case 3:
                submissionData = _e.sent();
                dataMap_1 = new Map(submissionData.map(function (d) { return [d.nodeId, d]; }));
                variablesResponse = variables.map(function (variable) {
                    var _a, _b;
                    var data = dataMap_1.get(variable.nodeId);
                    return {
                        nodeId: variable.nodeId,
                        displayName: variable.displayName,
                        exposedKey: variable.exposedKey,
                        sourceType: variable.sourceType,
                        sourceRef: variable.sourceRef,
                        value: (data === null || data === void 0 ? void 0 : data.value) || null,
                        operationResult: (data === null || data === void 0 ? void 0 : data.operationResult) || null,
                        operationSource: (data === null || data === void 0 ? void 0 : data.operationSource) || null,
                        operationDetail: (data === null || data === void 0 ? void 0 : data.operationDetail) || null,
                        lastResolved: (data === null || data === void 0 ? void 0 : data.lastResolved) || null,
                        nodeLabel: ((_a = variable.TreeBranchLeafNode) === null || _a === void 0 ? void 0 : _a.label) || 'Inconnu',
                        nodeType: ((_b = variable.TreeBranchLeafNode) === null || _b === void 0 ? void 0 : _b.type) || 'unknown'
                    };
                });
                console.log('✅ [V2 API] Réponse construite\n');
                return [2 /*return*/, res.json({
                        success: true,
                        submissionId: submissionId,
                        tree: {
                            id: (_c = submission.TreeBranchLeafTree) === null || _c === void 0 ? void 0 : _c.id,
                            name: (_d = submission.TreeBranchLeafTree) === null || _d === void 0 ? void 0 : _d.name
                        },
                        variables: variablesResponse,
                        meta: {
                            totalVariables: variables.length,
                            evaluatedVariables: submissionData.length
                        }
                    })];
            case 4:
                error_74 = _e.sent();
                console.error('❌ [V2 API] Erreur récupération variables:', error_74);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        error: 'Erreur lors de la récupération des variables',
                        details: error_74 instanceof Error ? error_74.message : 'Erreur inconnue'
                    })];
            case 5: return [2 /*return*/];
        }
    });
}); });
// ═══════════════════════════════════════════════════════════════════════════
// 📤 FIN DU SYSTÈME UNIVERSEL V2
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// 💾 SYSTÈME DE SAUVEGARDE TBL AVANCÉ - Brouillons & Versioning
// ═══════════════════════════════════════════════════════════════════════════
/**
 * 🎯 POST /api/tbl/submissions/stage
 * Crée ou met à jour un brouillon temporaire (stage)
 * TTL: 24h - Auto-renouvelé lors des modifications
 */
router.post('/submissions/stage', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, stageId, treeId, submissionId, leadId, formData, baseVersion, userId, expiresAt, stage, currentBaseVersion, submission, error_75;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 7, , 8]);
                _a = req.body, stageId = _a.stageId, treeId = _a.treeId, submissionId = _a.submissionId, leadId = _a.leadId, formData = _a.formData, baseVersion = _a.baseVersion;
                userId = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id) || 'system';
                console.log('📝 [STAGE] Création/Update brouillon:', { stageId: stageId, treeId: treeId, submissionId: submissionId, leadId: leadId, userId: userId });
                expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
                stage = void 0;
                if (!stageId) return [3 /*break*/, 2];
                return [4 /*yield*/, prisma.treeBranchLeafStage.update({
                        where: { id: stageId },
                        data: {
                            formData: formData || {},
                            lastActivity: new Date(),
                            expiresAt: expiresAt,
                        }
                    })];
            case 1:
                // Mise à jour d'un stage existant
                stage = _c.sent();
                console.log('✅ [STAGE] Brouillon mis à jour:', stage.id);
                return [3 /*break*/, 6];
            case 2:
                // Création d'un nouveau stage
                if (!treeId || !leadId) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            error: 'treeId et leadId sont requis pour créer un stage'
                        })];
                }
                currentBaseVersion = baseVersion || 1;
                if (!(submissionId && !baseVersion)) return [3 /*break*/, 4];
                return [4 /*yield*/, prisma.treeBranchLeafSubmission.findUnique({
                        where: { id: submissionId },
                        select: { currentVersion: true }
                    })];
            case 3:
                submission = _c.sent();
                currentBaseVersion = (submission === null || submission === void 0 ? void 0 : submission.currentVersion) || 1;
                _c.label = 4;
            case 4: return [4 /*yield*/, prisma.treeBranchLeafStage.create({
                    data: {
                        id: (0, crypto_1.randomUUID)(),
                        treeId: treeId,
                        submissionId: submissionId,
                        leadId: leadId,
                        userId: userId,
                        formData: formData || {},
                        baseVersion: currentBaseVersion,
                        expiresAt: expiresAt
                    }
                })];
            case 5:
                stage = _c.sent();
                console.log('✅ [STAGE] Nouveau brouillon créé:', stage.id);
                _c.label = 6;
            case 6: return [2 /*return*/, res.json({
                    success: true,
                    stage: {
                        id: stage.id,
                        expiresAt: stage.expiresAt,
                        lastActivity: stage.lastActivity
                    }
                })];
            case 7:
                error_75 = _c.sent();
                console.error('❌ [STAGE] Erreur:', error_75);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        error: 'Erreur lors de la gestion du brouillon',
                        details: error_75 instanceof Error ? error_75.message : 'Erreur inconnue'
                    })];
            case 8: return [2 /*return*/];
        }
    });
}); });
/**
 * 🔍 POST /api/tbl/submissions/stage/preview
 * Prévisualise les calculs d'un stage sans sauvegarder
 * Utilise operation-interpreter pour évaluer toutes les formules
 */
router.post('/submissions/stage/preview', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var stageId, stage_1, evaluateVariableOperation_3, variableNodes, valueMapLocal_2, results, error_76;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 6]);
                stageId = req.body.stageId;
                if (!stageId) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            error: 'stageId requis'
                        })];
                }
                console.log('🔍 [STAGE PREVIEW] Prévisualisation pour:', stageId);
                return [4 /*yield*/, prisma.treeBranchLeafStage.findUnique({
                        where: { id: stageId }
                    })];
            case 1:
                stage_1 = _a.sent();
                if (!stage_1) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            error: 'Stage non trouvé'
                        })];
                }
                return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('./operation-interpreter')); })];
            case 2:
                evaluateVariableOperation_3 = (_a.sent()).evaluateVariableOperation;
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                        where: {
                            treeId: stage_1.treeId,
                            subType: 'variable'
                        },
                        select: { id: true, label: true }
                    })];
            case 3:
                variableNodes = _a.sent();
                valueMapLocal_2 = new Map();
                Object.entries(stage_1.formData).forEach(function (_a) {
                    var nodeId = _a[0], value = _a[1];
                    valueMapLocal_2.set(nodeId, value);
                });
                return [4 /*yield*/, Promise.all(variableNodes.map(function (node) { return __awaiter(void 0, void 0, void 0, function () {
                        var evalResult, error_77;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, evaluateVariableOperation_3(node.id, stage_1.submissionId || stage_1.id, prisma, valueMapLocal_2)];
                                case 1:
                                    evalResult = _a.sent();
                                    return [2 /*return*/, {
                                            nodeId: node.id,
                                            nodeLabel: node.label,
                                            sourceRef: evalResult.sourceRef,
                                            operationSource: evalResult.operationSource,
                                            operationResult: evalResult.operationResult,
                                            operationDetail: evalResult.operationDetail
                                        }];
                                case 2:
                                    error_77 = _a.sent();
                                    console.error("\u274C Erreur \u00E9valuation ".concat(node.id, ":"), error_77);
                                    return [2 /*return*/, {
                                            nodeId: node.id,
                                            nodeLabel: node.label,
                                            sourceRef: '',
                                            operationSource: 'field',
                                            operationResult: 'ERROR',
                                            operationDetail: null
                                        }];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); }))];
            case 4:
                results = _a.sent();
                console.log('✅ [STAGE PREVIEW] Résultats:', results.length, 'noeuds évalués');
                return [2 /*return*/, res.json({
                        success: true,
                        stageId: stage_1.id,
                        results: results.map(function (r) { return ({
                            nodeId: r.nodeId,
                            nodeLabel: r.nodeLabel,
                            sourceRef: r.sourceRef,
                            operationSource: r.operationSource,
                            operationResult: r.operationResult,
                            operationDetail: r.operationDetail
                        }); })
                    })];
            case 5:
                error_76 = _a.sent();
                console.error('❌ [STAGE PREVIEW] Erreur:', error_76);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        error: 'Erreur lors de la prévisualisation',
                        details: error_76 instanceof Error ? error_76.message : 'Erreur inconnue'
                    })];
            case 6: return [2 /*return*/];
        }
    });
}); });
/**
 * 💾 POST /api/tbl/submissions/stage/commit
 * Commit un stage vers une submission définitive
 * Gère les conflits multi-utilisateurs et le versioning
 */
router.post('/submissions/stage/commit', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, stageId_1, asNew, userId_1, stage_2, submissionId, newVersion, evaluateVariableOperation_4, variableNodes, valueMapLocal_3, results_1, result, currentSubmission_1, currentData, currentDataMap, stageFormData, conflicts, _i, _b, _c, nodeId, stageValue, currentValue, lockAge, result, error_78;
    var _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 12, , 13]);
                _a = req.body, stageId_1 = _a.stageId, asNew = _a.asNew;
                userId_1 = ((_d = req.user) === null || _d === void 0 ? void 0 : _d.id) || 'system';
                if (!stageId_1) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            error: 'stageId requis'
                        })];
                }
                console.log('💾 [STAGE COMMIT] Commit brouillon:', { stageId: stageId_1, asNew: asNew, userId: userId_1 });
                return [4 /*yield*/, prisma.treeBranchLeafStage.findUnique({
                        where: { id: stageId_1 }
                    })];
            case 1:
                stage_2 = _e.sent();
                if (!stage_2) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            error: 'Stage non trouvé'
                        })];
                }
                // Vérifier si le stage n'a pas expiré
                if (stage_2.expiresAt < new Date()) {
                    return [2 /*return*/, res.status(410).json({
                            success: false,
                            error: 'Ce brouillon a expiré',
                            expired: true
                        })];
                }
                submissionId = void 0;
                newVersion = 1;
                if (!(asNew || !stage_2.submissionId)) return [3 /*break*/, 6];
                // ═══ CRÉATION NOUVELLE SUBMISSION ═══
                console.log('🆕 [STAGE COMMIT] Création nouvelle submission');
                return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('./operation-interpreter')); })];
            case 2:
                evaluateVariableOperation_4 = (_e.sent()).evaluateVariableOperation;
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                        where: {
                            treeId: stage_2.treeId,
                            subType: 'variable'
                        },
                        select: { id: true, label: true }
                    })];
            case 3:
                variableNodes = _e.sent();
                valueMapLocal_3 = new Map();
                Object.entries(stage_2.formData).forEach(function (_a) {
                    var nodeId = _a[0], value = _a[1];
                    valueMapLocal_3.set(nodeId, value);
                });
                return [4 /*yield*/, Promise.all(variableNodes.map(function (node) { return __awaiter(void 0, void 0, void 0, function () {
                        var evalResult, error_79;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, evaluateVariableOperation_4(node.id, stage_2.id, prisma, valueMapLocal_3)];
                                case 1:
                                    evalResult = _a.sent();
                                    return [2 /*return*/, {
                                            nodeId: node.id,
                                            nodeLabel: node.label,
                                            value: evalResult.value,
                                            operationSource: evalResult.operationSource,
                                            operationResult: evalResult.operationResult,
                                            operationDetail: evalResult.operationDetail
                                        }];
                                case 2:
                                    error_79 = _a.sent();
                                    console.error("\u274C Erreur \u00E9valuation ".concat(node.id, ":"), error_79);
                                    return [2 /*return*/, null];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); })).then(function (res) { return res.filter(function (r) { return r !== null; }); })];
            case 4:
                results_1 = _e.sent();
                return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var submission;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, tx.treeBranchLeafSubmission.create({
                                        data: {
                                            id: (0, crypto_1.randomUUID)(),
                                            treeId: stage_2.treeId,
                                            userId: stage_2.userId,
                                            leadId: stage_2.leadId,
                                            status: 'draft',
                                            currentVersion: 1,
                                            lastEditedBy: userId_1,
                                            summary: {},
                                            updatedAt: new Date()
                                        }
                                    })];
                                case 1:
                                    submission = _a.sent();
                                    if (!(results_1.length > 0)) return [3 /*break*/, 3];
                                    return [4 /*yield*/, tx.treeBranchLeafSubmissionData.createMany({
                                            data: results_1.map(function (r) { return ({
                                                id: (0, crypto_1.randomUUID)(),
                                                submissionId: submission.id,
                                                nodeId: r.nodeId,
                                                value: String(r.operationResult || ''),
                                                fieldLabel: r.nodeLabel,
                                                sourceRef: r.sourceRef,
                                                operationSource: r.operationSource,
                                                operationResult: r.operationResult,
                                                operationDetail: r.operationDetail,
                                                lastResolved: new Date()
                                            }); })
                                        })];
                                case 2:
                                    _a.sent();
                                    _a.label = 3;
                                case 3: 
                                // Créer la première version
                                return [4 /*yield*/, tx.treeBranchLeafSubmissionVersion.create({
                                        data: {
                                            id: (0, crypto_1.randomUUID)(),
                                            submissionId: submission.id,
                                            version: 1,
                                            formData: stage_2.formData,
                                            summary: 'Version initiale',
                                            createdBy: userId_1
                                        }
                                    })];
                                case 4:
                                    // Créer la première version
                                    _a.sent();
                                    // Supprimer le stage
                                    return [4 /*yield*/, tx.treeBranchLeafStage.delete({
                                            where: { id: stageId_1 }
                                        })];
                                case 5:
                                    // Supprimer le stage
                                    _a.sent();
                                    return [2 /*return*/, submission];
                            }
                        });
                    }); })];
            case 5:
                result = _e.sent();
                submissionId = result.id;
                newVersion = 1;
                console.log('✅ [STAGE COMMIT] Nouvelle submission créée:', submissionId);
                return [3 /*break*/, 11];
            case 6:
                // ═══ MISE À JOUR SUBMISSION EXISTANTE ═══
                console.log('🔄 [STAGE COMMIT] Mise à jour submission existante:', stage_2.submissionId);
                return [4 /*yield*/, prisma.treeBranchLeafSubmission.findUnique({
                        where: { id: stage_2.submissionId },
                        select: {
                            id: true,
                            currentVersion: true,
                            lastEditedBy: true,
                            updatedAt: true,
                            lockedBy: true,
                            lockedAt: true
                        }
                    })];
            case 7:
                currentSubmission_1 = _e.sent();
                if (!currentSubmission_1) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            error: 'Submission originale non trouvée'
                        })];
                }
                if (!(currentSubmission_1.currentVersion > stage_2.baseVersion)) return [3 /*break*/, 9];
                console.log('⚠️ [STAGE COMMIT] Conflit détecté!', {
                    baseVersion: stage_2.baseVersion,
                    currentVersion: currentSubmission_1.currentVersion
                });
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.findMany({
                        where: { submissionId: stage_2.submissionId },
                        select: { nodeId: true, value: true }
                    })];
            case 8:
                currentData = _e.sent();
                currentDataMap = new Map(currentData.map(function (d) { return [d.nodeId, d.value]; }));
                stageFormData = stage_2.formData;
                conflicts = [];
                for (_i = 0, _b = Object.entries(stageFormData); _i < _b.length; _i++) {
                    _c = _b[_i], nodeId = _c[0], stageValue = _c[1];
                    currentValue = currentDataMap.get(nodeId);
                    // Conflit si la valeur a changé des deux côtés
                    if (currentValue !== undefined && String(stageValue) !== currentValue) {
                        conflicts.push({
                            nodeId: nodeId,
                            yourValue: stageValue,
                            theirValue: currentValue
                        });
                    }
                }
                if (conflicts.length > 0) {
                    console.log('❌ [STAGE COMMIT] Conflits à résoudre:', conflicts.length);
                    return [2 /*return*/, res.status(409).json({
                            success: false,
                            conflict: true,
                            conflicts: conflicts,
                            lastEditedBy: currentSubmission_1.lastEditedBy,
                            lastEditedAt: currentSubmission_1.updatedAt,
                            message: 'Des modifications ont été faites par un autre utilisateur'
                        })];
                }
                console.log('✅ [STAGE COMMIT] Pas de conflit réel - merge automatique');
                _e.label = 9;
            case 9:
                // Vérifier le verrouillage
                if (currentSubmission_1.lockedBy && currentSubmission_1.lockedBy !== userId_1) {
                    lockAge = currentSubmission_1.lockedAt ?
                        Date.now() - new Date(currentSubmission_1.lockedAt).getTime() : 0;
                    // Lock expire après 1h
                    if (lockAge < 60 * 60 * 1000) {
                        return [2 /*return*/, res.status(423).json({
                                success: false,
                                locked: true,
                                lockedBy: currentSubmission_1.lockedBy,
                                message: 'Ce devis est en cours d\'édition par un autre utilisateur'
                            })];
                    }
                }
                return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var evaluateVariableOperation, variableNodes, valueMapLocal, results, nextVersion, updated, versions;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('./operation-interpreter')); })];
                                case 1:
                                    evaluateVariableOperation = (_a.sent()).evaluateVariableOperation;
                                    return [4 /*yield*/, tx.treeBranchLeafNode.findMany({
                                            where: {
                                                treeId: stage_2.treeId,
                                                subType: 'variable'
                                            },
                                            select: { id: true, label: true }
                                        })];
                                case 2:
                                    variableNodes = _a.sent();
                                    valueMapLocal = new Map();
                                    Object.entries(stage_2.formData).forEach(function (_a) {
                                        var nodeId = _a[0], value = _a[1];
                                        valueMapLocal.set(nodeId, value);
                                    });
                                    return [4 /*yield*/, Promise.all(variableNodes.map(function (node) { return __awaiter(void 0, void 0, void 0, function () {
                                            var evalResult, error_80;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0:
                                                        _a.trys.push([0, 2, , 3]);
                                                        return [4 /*yield*/, evaluateVariableOperation(node.id, stage_2.submissionId, tx, valueMapLocal)];
                                                    case 1:
                                                        evalResult = _a.sent();
                                                        return [2 /*return*/, {
                                                                nodeId: node.id,
                                                                nodeLabel: node.label,
                                                                value: evalResult.value,
                                                                operationSource: evalResult.operationSource,
                                                                operationResult: evalResult.operationResult,
                                                                operationDetail: evalResult.operationDetail
                                                            }];
                                                    case 2:
                                                        error_80 = _a.sent();
                                                        console.error("\u274C Erreur \u00E9valuation ".concat(node.id, ":"), error_80);
                                                        return [2 /*return*/, null];
                                                    case 3: return [2 /*return*/];
                                                }
                                            });
                                        }); })).then(function (res) { return res.filter(function (r) { return r !== null; }); })];
                                case 3:
                                    results = _a.sent();
                                    nextVersion = currentSubmission_1.currentVersion + 1;
                                    return [4 /*yield*/, tx.treeBranchLeafSubmission.update({
                                            where: { id: stage_2.submissionId },
                                            data: {
                                                currentVersion: nextVersion,
                                                lastEditedBy: userId_1,
                                                lockedBy: null, // Libérer le lock
                                                lockedAt: null,
                                                updatedAt: new Date()
                                            }
                                        })];
                                case 4:
                                    updated = _a.sent();
                                    // Supprimer les anciennes données
                                    return [4 /*yield*/, tx.treeBranchLeafSubmissionData.deleteMany({
                                            where: { submissionId: stage_2.submissionId }
                                        })];
                                case 5:
                                    // Supprimer les anciennes données
                                    _a.sent();
                                    if (!(results.length > 0)) return [3 /*break*/, 7];
                                    return [4 /*yield*/, tx.treeBranchLeafSubmissionData.createMany({
                                            data: results.map(function (r) { return ({
                                                id: (0, crypto_1.randomUUID)(),
                                                submissionId: updated.id,
                                                nodeId: r.nodeId,
                                                value: String(r.operationResult || ''),
                                                fieldLabel: r.nodeLabel,
                                                sourceRef: r.sourceRef,
                                                operationSource: r.operationSource,
                                                operationResult: r.operationResult,
                                                operationDetail: r.operationDetail,
                                                lastResolved: new Date()
                                            }); })
                                        })];
                                case 6:
                                    _a.sent();
                                    _a.label = 7;
                                case 7: 
                                // Créer la nouvelle version
                                return [4 /*yield*/, tx.treeBranchLeafSubmissionVersion.create({
                                        data: {
                                            id: (0, crypto_1.randomUUID)(),
                                            submissionId: updated.id,
                                            version: nextVersion,
                                            formData: stage_2.formData,
                                            createdBy: userId_1
                                        }
                                    })];
                                case 8:
                                    // Créer la nouvelle version
                                    _a.sent();
                                    return [4 /*yield*/, tx.treeBranchLeafSubmissionVersion.findMany({
                                            where: { submissionId: updated.id },
                                            orderBy: { version: 'desc' },
                                            skip: 20,
                                            select: { id: true }
                                        })];
                                case 9:
                                    versions = _a.sent();
                                    if (!(versions.length > 0)) return [3 /*break*/, 11];
                                    return [4 /*yield*/, tx.treeBranchLeafSubmissionVersion.deleteMany({
                                            where: { id: { in: versions.map(function (v) { return v.id; }) } }
                                        })];
                                case 10:
                                    _a.sent();
                                    console.log("\uD83D\uDDD1\uFE0F [STAGE COMMIT] ".concat(versions.length, " anciennes versions supprim\u00E9es"));
                                    _a.label = 11;
                                case 11: 
                                // Supprimer le stage
                                return [4 /*yield*/, tx.treeBranchLeafStage.delete({
                                        where: { id: stageId_1 }
                                    })];
                                case 12:
                                    // Supprimer le stage
                                    _a.sent();
                                    return [2 /*return*/, { submission: updated, version: nextVersion }];
                            }
                        });
                    }); })];
            case 10:
                result = _e.sent();
                submissionId = result.submission.id;
                newVersion = result.version;
                console.log('✅ [STAGE COMMIT] Submission mise à jour:', submissionId, 'v' + newVersion);
                _e.label = 11;
            case 11: return [2 /*return*/, res.json({
                    success: true,
                    submissionId: submissionId,
                    version: newVersion,
                    message: 'Devis enregistré avec succès'
                })];
            case 12:
                error_78 = _e.sent();
                console.error('❌ [STAGE COMMIT] Erreur:', error_78);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        error: 'Erreur lors de la sauvegarde',
                        details: error_78 instanceof Error ? error_78.message : 'Erreur inconnue'
                    })];
            case 13: return [2 /*return*/];
        }
    });
}); });
/**
 * 🗑️ POST /api/tbl/submissions/stage/discard
 * Supprime un brouillon (annulation)
 */
router.post('/submissions/stage/discard', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var stageId, error_81;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                stageId = req.body.stageId;
                if (!stageId) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            error: 'stageId requis'
                        })];
                }
                console.log('🗑️ [STAGE DISCARD] Suppression brouillon:', stageId);
                return [4 /*yield*/, prisma.treeBranchLeafStage.delete({
                        where: { id: stageId }
                    })];
            case 1:
                _a.sent();
                console.log('✅ [STAGE DISCARD] Brouillon supprimé');
                return [2 /*return*/, res.json({
                        success: true,
                        message: 'Brouillon supprimé'
                    })];
            case 2:
                error_81 = _a.sent();
                console.error('❌ [STAGE DISCARD] Erreur:', error_81);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        error: 'Erreur lors de la suppression du brouillon',
                        details: error_81 instanceof Error ? error_81.message : 'Erreur inconnue'
                    })];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * 📋 GET /api/tbl/submissions/my-drafts
 * Récupère les brouillons non sauvegardés de l'utilisateur
 * Pour récupération automatique au retour
 */
router.get('/submissions/my-drafts', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, _a, leadId, treeId, where, drafts, error_82;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                userId = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id) || 'system';
                _a = req.query, leadId = _a.leadId, treeId = _a.treeId;
                console.log('📋 [MY DRAFTS] Récupération brouillons:', { userId: userId, leadId: leadId, treeId: treeId });
                where = {
                    userId: userId,
                    expiresAt: { gt: new Date() } // Seulement les non-expirés
                };
                if (leadId)
                    where.leadId = leadId;
                if (treeId)
                    where.treeId = treeId;
                return [4 /*yield*/, prisma.treeBranchLeafStage.findMany({
                        where: where,
                        orderBy: { lastActivity: 'desc' },
                        include: {
                            Lead: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    company: true
                                }
                            }
                        }
                    })];
            case 1:
                drafts = _c.sent();
                console.log('✅ [MY DRAFTS] Trouvé:', drafts.length, 'brouillons');
                return [2 /*return*/, res.json({
                        success: true,
                        drafts: drafts.map(function (d) { return ({
                            stageId: d.id,
                            treeId: d.treeId,
                            submissionId: d.submissionId,
                            leadId: d.leadId,
                            leadName: d.Lead ?
                                "".concat(d.Lead.firstName || '', " ").concat(d.Lead.lastName || '').trim() || d.Lead.company || 'Lead'
                                : 'Lead',
                            lastActivity: d.lastActivity,
                            expiresAt: d.expiresAt,
                            formData: d.formData
                        }); })
                    })];
            case 2:
                error_82 = _c.sent();
                console.error('❌ [MY DRAFTS] Erreur:', error_82);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        error: 'Erreur lors de la récupération des brouillons',
                        details: error_82 instanceof Error ? error_82.message : 'Erreur inconnue'
                    })];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * 📜 GET /api/tbl/submissions/:id/versions
 * Récupère l'historique des versions d'une submission
 */
router.get('/submissions/:id/versions', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, versions, error_83;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = req.params.id;
                console.log('📜 [VERSIONS] Récupération historique:', id);
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionVersion.findMany({
                        where: { submissionId: id },
                        orderBy: { version: 'desc' },
                        include: {
                            User: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true
                                }
                            }
                        }
                    })];
            case 1:
                versions = _a.sent();
                console.log('✅ [VERSIONS] Trouvé:', versions.length, 'versions');
                return [2 /*return*/, res.json({
                        success: true,
                        submissionId: id,
                        versions: versions.map(function (v) { return ({
                            id: v.id,
                            version: v.version,
                            summary: v.summary,
                            createdAt: v.createdAt,
                            createdBy: {
                                id: v.User.id,
                                name: "".concat(v.User.firstName || '', " ").concat(v.User.lastName || '').trim() || v.User.email
                            }
                        }); })
                    })];
            case 2:
                error_83 = _a.sent();
                console.error('❌ [VERSIONS] Erreur:', error_83);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        error: 'Erreur lors de la récupération de l\'historique',
                        details: error_83 instanceof Error ? error_83.message : 'Erreur inconnue'
                    })];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * 🔙 POST /api/tbl/submissions/:id/restore/:version
 * Restaure une version antérieure d'une submission
 */
router.post('/submissions/:id/restore/:version', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, id, version, userId, versionToRestore, submission, stage, error_84;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 4, , 5]);
                _a = req.params, id = _a.id, version = _a.version;
                userId = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id) || 'system';
                console.log('🔙 [RESTORE] Restauration version:', { id: id, version: version, userId: userId });
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionVersion.findUnique({
                        where: {
                            submissionId_version: {
                                submissionId: id,
                                version: parseInt(version)
                            }
                        }
                    })];
            case 1:
                versionToRestore = _c.sent();
                if (!versionToRestore) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            error: 'Version non trouvée'
                        })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafSubmission.findUnique({
                        where: { id: id },
                        select: { treeId: true, leadId: true, currentVersion: true }
                    })];
            case 2:
                submission = _c.sent();
                if (!submission) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            error: 'Submission non trouvée'
                        })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafStage.create({
                        data: {
                            id: (0, crypto_1.randomUUID)(),
                            treeId: submission.treeId,
                            submissionId: id,
                            leadId: submission.leadId || 'unknown',
                            userId: userId,
                            formData: versionToRestore.formData,
                            baseVersion: submission.currentVersion,
                            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
                        }
                    })];
            case 3:
                stage = _c.sent();
                console.log('✅ [RESTORE] Stage créé pour restauration:', stage.id);
                return [2 /*return*/, res.json({
                        success: true,
                        stageId: stage.id,
                        message: "Version ".concat(version, " charg\u00E9e en brouillon. Enregistrez pour confirmer la restauration.")
                    })];
            case 4:
                error_84 = _c.sent();
                console.error('❌ [RESTORE] Erreur:', error_84);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        error: 'Erreur lors de la restauration',
                        details: error_84 instanceof Error ? error_84.message : 'Erreur inconnue'
                    })];
            case 5: return [2 /*return*/];
        }
    });
}); });
// ═══════════════════════════════════════════════════════════════════════════
// 💾 FIN DU SYSTÈME DE SAUVEGARDE TBL AVANCÉ
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// 🔗 SYSTÈME DE RÉFÉRENCES PARTAGÉES (SHARED REFERENCES)
// ═══════════════════════════════════════════════════════════════════════════
// GET /api/treebranchleaf/shared-references - Liste toutes les références partagées disponibles
router.get('/shared-references', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, templates, formatted, error_85;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                organizationId = getAuthCtx(req).organizationId;
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                        where: {
                            isSharedReference: true,
                            sharedReferenceId: null, // C'est une source, pas une référence
                            type: {
                                not: 'leaf_option' // ❌ Exclure les options de SELECT
                            },
                            TreeBranchLeafTree: {
                                organizationId: organizationId
                            }
                        },
                        select: {
                            id: true,
                            label: true,
                            sharedReferenceName: true,
                            // ✅ sharedReferenceCategory SUPPRIMÉ
                            sharedReferenceDescription: true,
                            referenceUsages: {
                                select: {
                                    id: true,
                                    treeId: true,
                                    TreeBranchLeafTree: {
                                        select: {
                                            name: true
                                        }
                                    }
                                }
                            }
                        }
                    })];
            case 1:
                templates = _a.sent();
                console.log("\uD83D\uDCCA [SHARED REF] ".concat(templates.length, " r\u00E9f\u00E9rences trouv\u00E9es en base"));
                templates.forEach(function (t, i) {
                    console.log("  ".concat(i + 1, ". ID: ").concat(t.id, ", Nom: ").concat(t.sharedReferenceName, ", Label: ").concat(t.label));
                });
                formatted = templates.map(function (template) { return ({
                    id: template.id,
                    label: template.sharedReferenceName || template.label,
                    // ✅ category SUPPRIMÉ
                    description: template.sharedReferenceDescription,
                    usageCount: template.referenceUsages.length,
                    usages: template.referenceUsages.map(function (usage) { return ({
                        treeId: usage.treeId,
                        path: "".concat(usage.TreeBranchLeafTree.name)
                    }); })
                }); });
                console.log("\uD83D\uDCE4 [SHARED REF] Retour au frontend: ".concat(JSON.stringify(formatted, null, 2)));
                res.json(formatted);
                return [3 /*break*/, 3];
            case 2:
                error_85 = _a.sent();
                console.error('❌ [SHARED REF] Erreur liste:', error_85);
                res.status(500).json({ error: 'Erreur serveur' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// GET /api/treebranchleaf/shared-references/:refId - Détails d'une référence
router.get('/shared-references/:refId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var refId, organizationId, template, error_86;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                refId = req.params.refId;
                organizationId = getAuthCtx(req).organizationId;
                return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({
                        where: {
                            id: refId,
                            isSharedReference: true,
                            sharedReferenceId: null,
                            TreeBranchLeafTree: {
                                organizationId: organizationId
                            }
                        },
                        select: {
                            id: true,
                            label: true,
                            sharedReferenceName: true,
                            // ✅ sharedReferenceCategory SUPPRIMÉ
                            sharedReferenceDescription: true,
                            referenceUsages: {
                                select: {
                                    id: true,
                                    treeId: true,
                                    TreeBranchLeafTree: {
                                        select: {
                                            name: true
                                        }
                                    }
                                }
                            }
                        }
                    })];
            case 1:
                template = _a.sent();
                if (!template) {
                    return [2 /*return*/, res.status(404).json({ error: 'Référence introuvable' })];
                }
                res.json({
                    id: template.id,
                    label: template.sharedReferenceName || template.label,
                    // ✅ category SUPPRIMÉ
                    description: template.sharedReferenceDescription,
                    usageCount: template.referenceUsages.length,
                    usages: template.referenceUsages.map(function (usage) { return ({
                        treeId: usage.treeId,
                        path: "".concat(usage.TreeBranchLeafTree.name)
                    }); })
                });
                return [3 /*break*/, 3];
            case 2:
                error_86 = _a.sent();
                console.error('❌ [SHARED REF] Erreur détails:', error_86);
                res.status(500).json({ error: 'Erreur serveur' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// PUT /api/treebranchleaf/shared-references/:refId - Modifier une référence partagée
router.put('/shared-references/:refId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var refId, _a, name_6, description, organizationId, template, updated, error_87;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                refId = req.params.refId;
                _a = req.body, name_6 = _a.name, description = _a.description;
                organizationId = getAuthCtx(req).organizationId;
                return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({
                        where: {
                            id: refId,
                            isSharedReference: true,
                            sharedReferenceId: null,
                            TreeBranchLeafTree: {
                                organizationId: organizationId
                            }
                        }
                    })];
            case 1:
                template = _b.sent();
                if (!template) {
                    return [2 /*return*/, res.status(404).json({ error: 'Référence introuvable' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                        where: { id: refId },
                        data: {
                            sharedReferenceName: name_6 || template.sharedReferenceName,
                            sharedReferenceDescription: description !== undefined ? description : template.sharedReferenceDescription,
                            label: name_6 || template.label,
                            updatedAt: new Date()
                        },
                        select: {
                            id: true,
                            label: true,
                            sharedReferenceName: true,
                            sharedReferenceDescription: true
                        }
                    })];
            case 2:
                updated = _b.sent();
                console.log("\u2705 [SHARED REF] R\u00E9f\u00E9rence ".concat(refId, " modifi\u00E9e:"), updated);
                res.json({ success: true, reference: updated });
                return [3 /*break*/, 4];
            case 3:
                error_87 = _b.sent();
                console.error('❌ [SHARED REF] Erreur modification:', error_87);
                res.status(500).json({ error: 'Erreur lors de la modification' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// DELETE /api/treebranchleaf/shared-references/:refId - Supprimer une référence partagée
router.delete('/shared-references/:refId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var refId, organizationId, template, error_88;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 6]);
                refId = req.params.refId;
                organizationId = getAuthCtx(req).organizationId;
                return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({
                        where: {
                            id: refId,
                            isSharedReference: true,
                            sharedReferenceId: null,
                            TreeBranchLeafTree: {
                                organizationId: organizationId
                            }
                        },
                        include: {
                            referenceUsages: true
                        }
                    })];
            case 1:
                template = _a.sent();
                if (!template) {
                    return [2 /*return*/, res.status(404).json({ error: 'Référence introuvable' })];
                }
                if (!(template.referenceUsages.length > 0)) return [3 /*break*/, 3];
                console.log("\u26A0\uFE0F [SHARED REF] D\u00E9tachement de ".concat(template.referenceUsages.length, " usage(s) avant suppression"));
                // Détacher tous les nœuds qui utilisent cette référence
                return [4 /*yield*/, prisma.treeBranchLeafNode.updateMany({
                        where: {
                            sharedReferenceId: refId
                        },
                        data: {
                            sharedReferenceId: null,
                            sharedReferenceName: null,
                            sharedReferenceDescription: null,
                            isSharedReference: false
                        }
                    })];
            case 2:
                // Détacher tous les nœuds qui utilisent cette référence
                _a.sent();
                _a.label = 3;
            case 3: 
            // Supprimer la référence
            return [4 /*yield*/, prisma.treeBranchLeafNode.delete({
                    where: { id: refId }
                })];
            case 4:
                // Supprimer la référence
                _a.sent();
                console.log("\uD83D\uDDD1\uFE0F [SHARED REF] R\u00E9f\u00E9rence ".concat(refId, " supprim\u00E9e"));
                res.json({ success: true, message: 'Référence supprimée avec succès' });
                return [3 /*break*/, 6];
            case 5:
                error_88 = _a.sent();
                console.error('❌ [SHARED REF] Erreur suppression:', error_88);
                res.status(500).json({ error: 'Erreur lors de la suppression' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// POST /api/treebranchleaf/trees/:treeId/create-shared-reference - Créer un nouveau nœud référence partagé
router.post('/trees/:treeId/create-shared-reference', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var treeId, _a, name_7, description, fieldType, label, organizationId, tree, newNodeId, newNode, error_89;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                treeId = req.params.treeId;
                _a = req.body, name_7 = _a.name, description = _a.description, fieldType = _a.fieldType, label = _a.label;
                organizationId = getAuthCtx(req).organizationId;
                console.log('📝 [SHARED REF] Création nouveau nœud référence:', { treeId: treeId, name: name_7, description: description, fieldType: fieldType, label: label });
                return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({
                        where: {
                            id: treeId,
                            organizationId: organizationId
                        }
                    })];
            case 1:
                tree = _b.sent();
                if (!tree) {
                    return [2 /*return*/, res.status(404).json({ error: 'Arbre introuvable' })];
                }
                newNodeId = "shared-ref-".concat(Date.now(), "-").concat(Math.random().toString(36).substring(7));
                return [4 /*yield*/, prisma.treeBranchLeafNode.create({
                        data: {
                            id: newNodeId,
                            treeId: treeId,
                            type: 'leaf_field', // ✅ OBLIGATOIRE : type du nœud
                            label: label || name_7,
                            fieldType: fieldType || 'TEXT',
                            parentId: null, // ✅ CORRECTION: null au lieu de 'ROOT' (contrainte de clé étrangère)
                            order: 9999, // Ordre élevé pour les mettre à la fin
                            isSharedReference: true,
                            sharedReferenceId: null, // C'est une source
                            sharedReferenceName: name_7,
                            sharedReferenceDescription: description,
                            updatedAt: new Date() // ✅ OBLIGATOIRE : timestamp de mise à jour
                        }
                    })];
            case 2:
                newNode = _b.sent();
                console.log('✅ [SHARED REF] Nouveau nœud référence créé:', newNode.id);
                res.json({
                    success: true,
                    id: newNode.id,
                    node: {
                        id: newNode.id,
                        label: newNode.label,
                        fieldType: newNode.fieldType,
                        sharedReferenceName: newNode.sharedReferenceName,
                        sharedReferenceDescription: newNode.sharedReferenceDescription
                    },
                    message: 'Référence partagée créée avec succès'
                });
                return [3 /*break*/, 4];
            case 3:
                error_89 = _b.sent();
                console.error('❌ [SHARED REF] Erreur création:', error_89);
                res.status(500).json({ error: 'Erreur serveur' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// POST /api/treebranchleaf/nodes/:nodeId/link-shared-references - Lier des références partagées à un nœud
router.post('/nodes/:nodeId/link-shared-references', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, referenceIds, organizationId, node, error_90;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                nodeId = req.params.nodeId;
                referenceIds = req.body.referenceIds;
                organizationId = getAuthCtx(req).organizationId;
                console.log('🔗 [SHARED REF] Liaison références:', { nodeId: nodeId, referenceIds: referenceIds });
                return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({
                        where: {
                            id: nodeId,
                            TreeBranchLeafTree: {
                                organizationId: organizationId
                            }
                        }
                    })];
            case 1:
                node = _a.sent();
                if (!node) {
                    return [2 /*return*/, res.status(404).json({ error: 'Nœud introuvable' })];
                }
                // Mettre à jour le nœud avec les IDs des références
                return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                        where: { id: nodeId },
                        data: {
                            sharedReferenceIds: referenceIds
                        }
                    })];
            case 2:
                // Mettre à jour le nœud avec les IDs des références
                _a.sent();
                console.log('✅ [SHARED REF] Références liées avec succès:', nodeId);
                res.json({
                    success: true,
                    message: "".concat(referenceIds.length, " r\u00E9f\u00E9rence(s) li\u00E9e(s) avec succ\u00E8s")
                });
                return [3 /*break*/, 4];
            case 3:
                error_90 = _a.sent();
                console.error('❌ [SHARED REF] Erreur liaison:', error_90);
                res.status(500).json({ error: 'Erreur serveur' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// POST /api/treebranchleaf/nodes/:nodeId/convert-to-reference - Convertir un nœud en référence partagée
router.post('/nodes/:nodeId/convert-to-reference', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, _a, name_8, description, organizationId, node, error_91;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                nodeId = req.params.nodeId;
                _a = req.body, name_8 = _a.name, description = _a.description;
                organizationId = getAuthCtx(req).organizationId;
                console.log('📝 [SHARED REF] Conversion nœud en référence:', { nodeId: nodeId, name: name_8, description: description });
                return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({
                        where: {
                            id: nodeId,
                            TreeBranchLeafTree: {
                                organizationId: organizationId
                            }
                        }
                    })];
            case 1:
                node = _b.sent();
                if (!node) {
                    return [2 /*return*/, res.status(404).json({ error: 'Nœud introuvable' })];
                }
                // Convertir en source de référence
                return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                        where: { id: nodeId },
                        data: {
                            isSharedReference: true,
                            sharedReferenceId: null, // C'est une source
                            sharedReferenceName: name_8,
                            // ✅ sharedReferenceCategory SUPPRIMÉ
                            sharedReferenceDescription: description
                        }
                    })];
            case 2:
                // Convertir en source de référence
                _b.sent();
                console.log('✅ [SHARED REF] Référence créée avec succès:', nodeId);
                res.json({
                    success: true,
                    id: nodeId,
                    message: 'Référence créée avec succès'
                });
                return [3 /*break*/, 4];
            case 3:
                error_91 = _b.sent();
                console.error('❌ [SHARED REF] Erreur conversion:', error_91);
                res.status(500).json({ error: 'Erreur serveur' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// ═══════════════════════════════════════════════════════════════════════════
// 🔗 FIN DU SYSTÈME DE RÉFÉRENCES PARTAGÉES
// ═══════════════════════════════════════════════════════════════════════════
// =============================================================================
// 🔄 COPIE DE VARIABLE AVEC CAPACITÉS - Système de suffixe -N
// =============================================================================
/**
 * POST /api/treebranchleaf/nodes/:nodeId/copy-linked-variable
 * Copie une variable avec toutes ses capacités (formules, conditions, tables)
 *
 * Body:
 *   - variableId: ID de la variable à copier (peut avoir suffixe -N)
 *   - newSuffix: Nouveau numéro de suffixe pour la copie (ex: 2)
 *
 * Retourne:
 * {
 *   success: boolean,
 *   variableId: string,
 *   formulaIds: string[],
 *   conditionIds: string[],
 *   tableIds: string[],
 *   error?: string
 * }
 */
// (revert) suppression des routes utilitaires ajout�es au niveau sup�rieur
router.post('/nodes/:nodeId/copy-linked-variable', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, _a, variableId, newSuffix, duplicateNode, bodyTargetNodeId, node, targetNodeId, shouldDuplicateNode, ownerNodeIdForMap, targetNode, originalVarForMap, originalVar, ownerNode, candidateId, exists, nodeIdMap, formulaIdMap, conditionIdMap, tableIdMap, result, e_26, error_92, msg;
    var _b, _c, _d, _e, _f, _g;
    return __generator(this, function (_h) {
        switch (_h.label) {
            case 0:
                _h.trys.push([0, 16, , 17]);
                nodeId = req.params.nodeId;
                _a = req.body, variableId = _a.variableId, newSuffix = _a.newSuffix, duplicateNode = _a.duplicateNode, bodyTargetNodeId = _a.targetNodeId;
                console.warn('?? [COPY-LINKED-VAR] DEPRECATED route: please use the registry/repeat API endpoints (POST /api/repeat) instead. This legacy route will be removed in a future release.');
                // Hint for automated clients
                res.set('X-Deprecated-API', '/api/repeat');
                console.log('🔄 [COPY-LINKED-VAR] Début - nodeId:', nodeId, 'variableId:', variableId, 'newSuffix:', newSuffix);
                // NOTE: the '/variables/:variableId/create-display' util route was nested
                // under the copy-linked-variable handler historically. That caused
                // registration order/visibility issues. We moved it to a top-level route
                // (see below) and this nested declaration no longer applies.
                if (!variableId || newSuffix === undefined) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'variableId et newSuffix requis dans le corps de la requête'
                        })];
                }
                if (!Number.isInteger(newSuffix) || newSuffix < 1) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'newSuffix doit être un nombre entier positif'
                        })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({
                        where: {
                            id: nodeId,
                            TreeBranchLeafTree: {
                                organizationId: getAuthCtx(req).organizationId
                            }
                        },
                        include: { TreeBranchLeafTree: true }
                    })];
            case 1:
                node = _h.sent();
                if (!node) {
                    return [2 /*return*/, res.status(404).json({ error: 'Noeud introuvable' })];
                }
                console.log('? Noeud trouv�:', node.label || nodeId);
                targetNodeId = nodeId;
                shouldDuplicateNode = duplicateNode === undefined ? true : Boolean(duplicateNode);
                ownerNodeIdForMap = null;
                if (!(!shouldDuplicateNode && bodyTargetNodeId)) return [3 /*break*/, 5];
                return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({ where: { id: bodyTargetNodeId } })];
            case 2:
                targetNode = _h.sent();
                if (!targetNode) {
                    return [2 /*return*/, res.status(404).json({ error: 'targetNodeId introuvable' })];
                }
                // V�rifier m�me arbre
                if (targetNode.treeId !== node.treeId) {
                    return [2 /*return*/, res.status(400).json({ error: 'targetNodeId doit appartenir au m�me arbre' })];
                }
                targetNodeId = targetNode.id;
                console.log("?? [COPY-LINKED-VAR] Cible explicite fournie: ".concat(targetNodeId));
                if (!variableId) return [3 /*break*/, 4];
                return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findUnique({ where: { id: variableId } })];
            case 3:
                originalVarForMap = _h.sent();
                if (originalVarForMap)
                    ownerNodeIdForMap = originalVarForMap.nodeId;
                _h.label = 4;
            case 4: return [3 /*break*/, 10];
            case 5:
                if (!shouldDuplicateNode) return [3 /*break*/, 10];
                return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findUnique({ where: { id: variableId } })];
            case 6:
                originalVar = _h.sent();
                if (!originalVar) {
                    return [2 /*return*/, res.status(404).json({ error: 'Variable introuvable' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({ where: { id: originalVar.nodeId } })];
            case 7:
                ownerNode = _h.sent();
                if (!ownerNode) {
                    return [2 /*return*/, res.status(404).json({ error: 'N�ud propri�taire introuvable' })];
                }
                ownerNodeIdForMap = ownerNode.id;
                candidateId = "".concat(ownerNode.id, "-").concat(newSuffix);
                return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({ where: { id: candidateId } })];
            case 8:
                exists = _h.sent();
                targetNodeId = exists ? "".concat(candidateId, "-").concat(Date.now()) : candidateId;
                return [4 /*yield*/, prisma.treeBranchLeafNode.create({
                        data: {
                            id: targetNodeId,
                            treeId: ownerNode.treeId,
                            parentId: ownerNode.parentId,
                            type: ownerNode.type,
                            subType: ownerNode.subType,
                            label: "".concat(ownerNode.label || 'Node', "-").concat(newSuffix),
                            description: ownerNode.description,
                            value: null,
                            order: ((_b = ownerNode.order) !== null && _b !== void 0 ? _b : 0) + 1,
                            isRequired: (_c = ownerNode.isRequired) !== null && _c !== void 0 ? _c : false,
                            isVisible: (_d = ownerNode.isVisible) !== null && _d !== void 0 ? _d : true,
                            isActive: (_e = ownerNode.isActive) !== null && _e !== void 0 ? _e : true,
                            isMultiple: (_f = ownerNode.isMultiple) !== null && _f !== void 0 ? _f : false,
                            hasData: (_g = ownerNode.hasData) !== null && _g !== void 0 ? _g : false,
                            metadata: ownerNode.metadata,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        }
                    })];
            case 9:
                _h.sent();
                console.log("?? [COPY-LINKED-VAR] N\uFFFDud dupliqu\uFFFD: ".concat(ownerNode.id, " -> ").concat(targetNodeId));
                _h.label = 10;
            case 10:
                nodeIdMap = new Map();
                if (ownerNodeIdForMap)
                    nodeIdMap.set(ownerNodeIdForMap, targetNodeId);
                formulaIdMap = new Map();
                conditionIdMap = new Map();
                tableIdMap = new Map();
                return [4 /*yield*/, (0, variable_copy_engine_js_1.copyVariableWithCapacities)(variableId, newSuffix, targetNodeId, prisma, {
                        autoCreateDisplayNode: true,
                        nodeIdMap: nodeIdMap,
                        formulaIdMap: formulaIdMap,
                        conditionIdMap: conditionIdMap,
                        tableIdMap: tableIdMap
                    })];
            case 11:
                result = _h.sent();
                if (!result.success) {
                    return [2 /*return*/, res.status(400).json({ error: result.error || 'Erreur lors de la copie' })];
                }
                _h.label = 12;
            case 12:
                _h.trys.push([12, 14, , 15]);
                return [4 /*yield*/, addToNodeLinkedField(prisma, targetNodeId, 'linkedVariableIds', [result.variableId])];
            case 13:
                _h.sent();
                return [3 /*break*/, 15];
            case 14:
                e_26 = _h.sent();
                console.warn('?? [COPY-LINKED-VAR] �chec MAJ linkedVariableIds:', e_26.message);
                return [3 /*break*/, 15];
            case 15:
                console.log('? [COPY-LINKED-VAR] Copie r�ussie:', __assign(__assign({}, result), { targetNodeId: targetNodeId }));
                res.status(201).json(__assign(__assign({}, result), { targetNodeId: targetNodeId }));
                return [3 /*break*/, 17];
            case 16:
                error_92 = _h.sent();
                console.error('❌ [COPY-LINKED-VAR] Erreur:', error_92);
                msg = error_92 instanceof Error ? error_92.message : String(error_92);
                res.status(500).json({ error: msg });
                return [3 /*break*/, 17];
            case 17: return [2 /*return*/];
        }
    });
}); });
// ==================================================================================
// ?? ROUTE UTILITAIRE: cr�er / mettre � jour le n�ud d'affichage pour une variable
// ==================================================================================
router.post('/variables/:variableId/create-display', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var variableId, _a, label, suffix, result, error_93, msg;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                variableId = req.params.variableId;
                _a = (req.body || {}), label = _a.label, suffix = _a.suffix;
                return [4 /*yield*/, (0, variable_copy_engine_js_1.createDisplayNodeForExistingVariable)(variableId, prisma, label || 'Nouveau Section', suffix !== null && suffix !== void 0 ? suffix : 'nouveau')];
            case 1:
                result = _b.sent();
                res.status(201).json(result);
                return [3 /*break*/, 3];
            case 2:
                error_93 = _b.sent();
                msg = error_93 instanceof Error ? error_93.message : String(error_93);
                console.error('? [/variables/:variableId/create-display] Erreur:', msg);
                res.status(400).json({ error: msg });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ==================================================================================
// ?? ROUTE UTILITAIRE: rechercher des variables par displayName (partiel)
// ==================================================================================
// =============================================================================
router.get('/variables/search', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var q, found, error_94, msg;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                q = String(req.query.displayName || '').trim();
                if (!q)
                    return [2 /*return*/, res.status(400).json({ error: 'displayName query string requis' })];
                return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findMany({
                        where: { displayName: { contains: q, mode: 'insensitive' } },
                        select: { id: true, nodeId: true, exposedKey: true, displayName: true, sourceType: true, sourceRef: true }
                    })];
            case 1:
                found = _a.sent();
                res.json({ count: found.length, items: found });
                return [3 /*break*/, 3];
            case 2:
                error_94 = _a.sent();
                msg = error_94 instanceof Error ? error_94.message : String(error_94);
                res.status(500).json({ error: msg });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// ?? R�CUP�RATION DES VALEURS CALCUL�ES (calculatedValue)
// =============================================================================
/**
 * GET /trees/:treeId/calculated-values
 * R�cup�re tous les champs ayant une calculatedValue non nulle
 * Utile pour r�f�rencer les r�sultats de formules/conditions comme contraintes dynamiques
 */
router.get('/trees/:treeId/calculated-values', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var treeId, _a, organizationId, isSuperAdmin, treeWhereFilter, tree, nodesWithCalculatedValue, parentIds, parentNodes, parentLabelsMap_1, calculatedValues, error_95;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                console.log('?? [TBL-ROUTES] GET /trees/:treeId/calculated-values - D�BUT');
                treeId = req.params.treeId;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                treeWhereFilter = isSuperAdmin || !organizationId ? { id: treeId } : { id: treeId, organizationId: organizationId };
                return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({
                        where: treeWhereFilter
                    })];
            case 1:
                tree = _b.sent();
                if (!tree) {
                    return [2 /*return*/, res.status(404).json({ error: 'Arbre non trouv�' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                        where: {
                            treeId: treeId,
                            calculatedValue: {
                                not: null
                            }
                        },
                        select: {
                            id: true,
                            label: true,
                            type: true,
                            calculatedValue: true,
                            calculatedBy: true,
                            parentId: true
                        }
                    })];
            case 2:
                nodesWithCalculatedValue = _b.sent();
                console.log("?? [TBL-ROUTES] ".concat(nodesWithCalculatedValue.length, " champs avec calculatedValue trouv\uFFFDs"));
                parentIds = nodesWithCalculatedValue
                    .map(function (n) { return n.parentId; })
                    .filter(function (id) { return !!id; });
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                        where: { id: { in: parentIds } },
                        select: { id: true, label: true }
                    })];
            case 3:
                parentNodes = _b.sent();
                parentLabelsMap_1 = new Map(parentNodes.map(function (p) { return [p.id, p.label]; }));
                calculatedValues = nodesWithCalculatedValue.map(function (node) { return ({
                    id: node.id,
                    label: node.label || 'Champ sans nom',
                    calculatedValue: node.calculatedValue,
                    calculatedBy: node.calculatedBy || undefined,
                    type: node.type,
                    parentLabel: node.parentId ? parentLabelsMap_1.get(node.parentId) : undefined
                }); });
                console.log("?? [TBL-ROUTES] Valeurs calcul\uFFFDes format\uFFFDes:", calculatedValues.map(function (cv) { return ({
                    id: cv.id,
                    label: cv.label,
                    value: cv.calculatedValue,
                    source: cv.calculatedBy
                }); }));
                res.json(calculatedValues);
                return [3 /*break*/, 5];
            case 4:
                error_95 = _b.sent();
                console.error('[TreeBranchLeaf API] Error fetching calculated values:', error_95);
                res.status(500).json({ error: 'Impossible de r�cup�rer les valeurs calcul�es' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
