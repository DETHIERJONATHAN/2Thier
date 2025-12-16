"use strict";
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎯 SYSTÈME UNIVERSEL D'INTERPRÉTATION DES OPÉRATIONS TBL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ce module permet de LIRE, COMPRENDRE, et RETRANSCRIRE n'importe quelle
 * opération TBL (Condition, Formule, Table) de manière récursive.
 *
 * PRINCIPES FONDAMENTAUX :
 * ------------------------
 * 1. TOUT peut se mélanger : Condition → Formule → Table → Condition...
 * 2. Chaque opération est interprétée RÉCURSIVEMENT
 * 3. Les données sont récupérées depuis SubmissionData
 * 4. Le résultat est retranscrit en texte humain
 *
 * ARCHITECTURE :
 * --------------
 * - identifyReferenceType()    : Identifie le type d'une référence
 * - interpretReference()        : Point d'entrée récursif universel
 * - interpretCondition()        : Interprète une condition
 * - interpretFormula()          : Interprète une formule
 * - interpretTable()            : Interprète un lookup de table
 * - interpretField()            : Interprète un champ simple
 * - evaluateVariableOperation() : Point d'entrée principal depuis l'API
 *
 * @author System TBL
 * @version 1.0.0
 * @date 2025-01-06
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
exports.evaluateVariableOperation = evaluateVariableOperation;
exports.interpretReference = interpretReference;
exports.interpretCondition = interpretCondition;
exports.interpretFormula = interpretFormula;
exports.interpretTable = interpretTable;
exports.interpretField = interpretField;
exports.identifyReferenceType = identifyReferenceType;
exports.normalizeRef = normalizeRef;
var formulaEngine_js_1 = require("./formulaEngine.js");
function formatDebugValue(value) {
    if (value === null || value === undefined)
        return '∅';
    if (typeof value === 'string') {
        return value.length > 120 ? "".concat(value.slice(0, 117), "...") : value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    try {
        var serialized = JSON.stringify(value);
        return serialized.length > 120 ? "".concat(serialized.slice(0, 117), "...") : serialized;
    }
    catch (_a) {
        return '[unserializable]';
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// 🔍 MODULE 1 : IDENTIFICATION DU TYPE DE RÉFÉRENCE
// ═══════════════════════════════════════════════════════════════════════════
/**
 * 🔍 Identifie le type d'une référence TBL
 *
 * Cette fonction analyse une chaîne de référence et détermine si elle
 * pointe vers un champ, une formule, une condition ou une table.
 *
 * FORMATS RECONNUS :
 * ------------------
 * - Formule     : "node-formula:xxx" ou "@value.node-formula:xxx"
 * - Condition   : "condition:xxx" ou "@value.condition:xxx"
 * - Table       : "node-table:xxx" ou "@table.xxx"
 * - Champ UUID  : "702d1b09-abc9-4096-9aaa-77155ac5294f"
 * - Champ généré: "node_1757366229534_x6jxzmvmu"
 *
 * @param ref - Référence brute à analyser
 * @returns Type de référence identifié
 *
 * @example
 * identifyReferenceType("@value.702d1b09...") → 'field'
 * identifyReferenceType("node-formula:4e352467...") → 'formula'
 * identifyReferenceType("condition:ff05cc48...") → 'condition'
 * identifyReferenceType("@table.cmgbfpc7t...") → 'table'
 */
function identifyReferenceType(ref) {
    // 🆕 DÉTECTION RAPIDE - Vérifier les préfixes AVANT de nettoyer
    // Car @value. et @table. sont des indices cruciaux du type réel
    if (ref.startsWith('@value.condition:') || ref.startsWith('@value.node-condition:')) {
        return 'condition';
    }
    if (ref.startsWith('@value.node-formula:')) {
        return 'formula';
    }
    if (ref.startsWith('@value.node-table:')) {
        return 'table';
    }
    if (ref.startsWith('@value.')) {
        return 'value'; // 🆕 Reconnaître explicitement le type 'value'
    }
    if (ref.startsWith('@table.')) {
        return 'table';
    }
    // Nettoyer les préfixes courants pour analyse
    var cleaned = ref
        .replace('@value.', '')
        .replace('@table.', '')
        .trim();
    // 🧮 Vérifier si c'est une FORMULE
    if (cleaned.startsWith('node-formula:')) {
        return 'formula';
    }
    // 🔀 Vérifier si c'est une CONDITION
    if (cleaned.startsWith('condition:') || cleaned.startsWith('node-condition:')) {
        return 'condition';
    }
    // 📊 Vérifier si c'est une TABLE
    if (cleaned.startsWith('node-table:')) {
        return 'table';
    }
    // 📝 Vérifier si c'est un champ généré automatiquement
    if (cleaned.startsWith('node_')) {
        return 'field';
    }
    // 📝 Vérifier si c'est une référence partagée
    if (cleaned.startsWith('shared-ref-')) {
        return 'field';
    }
    // ⚠️ IMPORTANT: Les UUIDs nus sont ambigus - peuvent être des fields, tables, ou conditions
    // On retourne 'field' comme défaut, mais le système devrait vérifier en base de données
    // si c'est vraiment un champ ou une table
    var uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    if (uuidRegex.test(cleaned)) {
        // AMÉLIORATION FUTURE: Vérifier le type du nœud en base de données
        // Pour l'instant, retourner 'field' comme défaut
        return 'field';
    }
    // Par défaut, considérer comme un champ
    return 'field';
}
/**
 * 🔍 Identifie le type d'un UUID ambigu en interrogeant la base de données
 *
 * Cette fonction vérifie si un UUID est une condition, formule, table, ou champ
 * en interrogeant Prisma.
 *
 * @param id - UUID à vérifier
 * @param prisma - Client Prisma
 * @returns Type de référence trouvé ('condition' | 'formula' | 'table' | 'field')
 */
function identifyReferenceTypeFromDB(id, prisma) {
    return __awaiter(this, void 0, void 0, function () {
        var conditionNode, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                            where: { id: id },
                            select: { type: true }
                        })];
                case 1:
                    conditionNode = _a.sent();
                    if (conditionNode) {
                        if (conditionNode.type === 'condition') {
                            console.log("[IDENTIFY] \u2705 ".concat(id, " est une CONDITION"));
                            return [2 /*return*/, 'condition'];
                        }
                        if (conditionNode.type === 'node_formula') {
                            console.log("[IDENTIFY] \u2705 ".concat(id, " est une FORMULE"));
                            return [2 /*return*/, 'formula'];
                        }
                        if (conditionNode.type === 'node_table') {
                            console.log("[IDENTIFY] \u2705 ".concat(id, " est une TABLE"));
                            return [2 /*return*/, 'table'];
                        }
                        console.log("[IDENTIFY] \u2705 ".concat(id, " est un CHAMP (type: ").concat(conditionNode.type, ")"));
                        return [2 /*return*/, 'field'];
                    }
                    console.log("[IDENTIFY] \u26A0\uFE0F ".concat(id, " non trouv\u00E9 en BD, d\u00E9faut: CHAMP"));
                    return [2 /*return*/, 'field'];
                case 2:
                    error_1 = _a.sent();
                    console.error("[IDENTIFY] \u274C Erreur lors de l'identification en BD:", error_1);
                    return [2 /*return*/, 'field']; // Défaut : considérer comme champ
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * 🧹 Normalise une référence en enlevant les préfixes
 *
 * Cette fonction nettoie une référence pour obtenir l'ID pur utilisable
 * dans les requêtes Prisma.
 *
 * @param ref - Référence à normaliser
 * @returns ID normalisé
 *
 * @example
 * normalizeRef("@value.702d1b09...") → "702d1b09..."
 * normalizeRef("node-formula:4e352467...") → "4e352467..."
 * normalizeRef("condition:ff05cc48...") → "ff05cc48..."
 */
function normalizeRef(ref) {
    return ref
        .replace('@value.', '')
        .replace('@table.', '')
        .replace('node-formula:', '')
        .replace('node-table:', '')
        .replace('node-condition:', '')
        .replace('condition:', '')
        .trim();
}
// ═══════════════════════════════════════════════════════════════════════════
// 📊 MODULE 2 : RÉCUPÉRATION DES DONNÉES
// ═══════════════════════════════════════════════════════════════════════════
/**
 * 📊 ENRICHISSEMENT MASSIF - Charge TOUTES les valeurs et labels d'une soumission
 *
 * Cette fonction effectue une récupération massive depuis la base de données :
 * 1. Récupère TOUTES les valeurs depuis TreeBranchLeafSubmissionData
 * 2. Récupère TOUS les labels depuis TreeBranchLeafNode (pour tout l'arbre)
 * 3. Remplit les Maps valueMap et labelMap pour accès rapide
 *
 * IMPORTANT : Cette fonction ENRICHIT les Maps existantes (ne les remplace pas)
 *
 * @param submissionId - ID de la soumission
 * @param prisma - Instance Prisma Client
 * @param valueMap - Map des valeurs à enrichir
 * @param labelMap - Map des labels à enrichir
 * @param treeId - ID de l'arbre (optionnel, sera détecté automatiquement)
 */
function enrichDataFromSubmission(submissionId, prisma, valueMap, labelMap, treeId) {
    return __awaiter(this, void 0, void 0, function () {
        var submissionData, firstSubmissionNode, allNodes, _i, allNodes_1, node, canonicalLabel, _a, submissionData_1, data, parsedValue, error_2;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log("[ENRICHMENT] \uD83D\uDCCA Enrichissement donn\u00E9es: ".concat(submissionId));
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 8, , 9]);
                    return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.findMany({
                            where: { submissionId: submissionId },
                            select: {
                                nodeId: true,
                                value: true
                            }
                        })];
                case 2:
                    submissionData = _c.sent();
                    console.log("[ENRICHMENT] \uD83D\uDCCA ".concat(submissionData.length, " valeurs r\u00E9cup\u00E9r\u00E9es depuis SubmissionData"));
                    if (!!treeId) return [3 /*break*/, 4];
                    return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.findFirst({
                            where: { submissionId: submissionId },
                            include: { TreeBranchLeafNode: { select: { treeId: true } } }
                        })];
                case 3:
                    firstSubmissionNode = _c.sent();
                    treeId = (_b = firstSubmissionNode === null || firstSubmissionNode === void 0 ? void 0 : firstSubmissionNode.TreeBranchLeafNode) === null || _b === void 0 ? void 0 : _b.treeId;
                    _c.label = 4;
                case 4:
                    if (!treeId) return [3 /*break*/, 6];
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                            where: { treeId: treeId },
                            select: {
                                id: true,
                                label: true,
                                sharedReferenceName: true,
                                field_label: true
                            }
                        })];
                case 5:
                    allNodes = _c.sent();
                    console.log("[ENRICHMENT] \uD83C\uDFF7\uFE0F ".concat(allNodes.length, " labels r\u00E9cup\u00E9r\u00E9s depuis l'arbre"));
                    // 4. ENRICHIR LABELMAP avec priorité pour cohérence
                    // 🔥 ORDRE DE PRIORITÉ: sharedReferenceName > field_label > label (même logique que getNodeLabel)
                    for (_i = 0, allNodes_1 = allNodes; _i < allNodes_1.length; _i++) {
                        node = allNodes_1[_i];
                        if (!labelMap.has(node.id)) {
                            canonicalLabel = node.sharedReferenceName || node.field_label || node.label;
                            labelMap.set(node.id, canonicalLabel);
                        }
                    }
                    return [3 /*break*/, 7];
                case 6:
                    console.warn("[ENRICHMENT] \u26A0\uFE0F Impossible de trouver l'arbre pour la soumission ".concat(submissionId));
                    _c.label = 7;
                case 7:
                    // 5. ENRICHIR VALUEMAP
                    for (_a = 0, submissionData_1 = submissionData; _a < submissionData_1.length; _a++) {
                        data = submissionData_1[_a];
                        if (data.nodeId && data.value !== null) {
                            // Ne pas écraser si déjà présent (priorité au valueMap initial pour mode preview)
                            if (!valueMap.has(data.nodeId)) {
                                parsedValue = void 0;
                                try {
                                    parsedValue = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
                                }
                                catch (_d) {
                                    parsedValue = data.value;
                                }
                                valueMap.set(data.nodeId, parsedValue);
                            }
                        }
                    }
                    console.log("[ENRICHMENT] \uD83C\uDF89 Enrichissement termin\u00E9 - labels: ".concat(labelMap.size, ", valeurs: ").concat(valueMap.size));
                    return [3 /*break*/, 9];
                case 8:
                    error_2 = _c.sent();
                    console.error("[ENRICHMENT] \u274C Erreur enrichissement:", error_2);
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    });
}
function getNodeValue(nodeId, submissionId, prisma, valueMap, options) {
    return __awaiter(this, void 0, void 0, function () {
        var val, data, node;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // 🎯 PRIORITÉ 1: Vérifier dans valueMap si fourni
                    if (valueMap && valueMap.has(nodeId)) {
                        val = valueMap.get(nodeId);
                        console.log("[INTERPRETER][getNodeValue] valueMap hit ".concat(nodeId, " \u2192 ").concat(formatDebugValue(val)));
                        if (val === null || val === undefined) {
                            return [2 /*return*/, (options === null || options === void 0 ? void 0 : options.preserveEmpty) ? null : "0"];
                        }
                        return [2 /*return*/, String(val)];
                    }
                    console.log("[INTERPRETER][getNodeValue] DB fallback ".concat(nodeId));
                    return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.findFirst({
                            where: {
                                nodeId: nodeId,
                                submissionId: submissionId
                            },
                            select: {
                                value: true
                            }
                        })];
                case 1:
                    data = _a.sent();
                    if ((data === null || data === void 0 ? void 0 : data.value) !== null && (data === null || data === void 0 ? void 0 : data.value) !== undefined) {
                        console.log("[INTERPRETER][getNodeValue] SubmissionData hit ".concat(nodeId, " \u2192 ").concat(formatDebugValue(data.value)));
                        return [2 /*return*/, String(data.value)];
                    }
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                            where: { id: nodeId },
                            select: { calculatedValue: true, label: true }
                        })];
                case 2:
                    node = _a.sent();
                    if ((node === null || node === void 0 ? void 0 : node.calculatedValue) !== null && (node === null || node === void 0 ? void 0 : node.calculatedValue) !== undefined && (node === null || node === void 0 ? void 0 : node.calculatedValue) !== '') {
                        console.log("[INTERPRETER][getNodeValue] \uD83C\uDD95 TreeBranchLeafNode.calculatedValue hit ".concat(nodeId, " (").concat(node.label, ") \u2192 ").concat(formatDebugValue(node.calculatedValue)));
                        return [2 /*return*/, String(node.calculatedValue)];
                    }
                    console.log("[INTERPRETER][getNodeValue] No value found for ".concat(nodeId, ", returning \"0\""));
                    // Retourner "0" par défaut si aucune valeur trouvée
                    return [2 /*return*/, (options === null || options === void 0 ? void 0 : options.preserveEmpty) ? null : "0"];
            }
        });
    });
}
/**
 * 🏷️ Récupère le label depuis labelMap (avec fallback DB)
 *
 * Cette fonction récupère d'abord le label depuis labelMap (cache enrichi),
 * puis fait un fallback vers TreeBranchLeafNode si nécessaire.
 *
 * 🔥 COHÉRENCE: Utilise sharedReferenceName > label > field_label pour
 * garantir que les variables utilisent exactement le même libellé que l'original.
 *
 * @param nodeId - ID du nœud
 * @param prisma - Instance Prisma Client
 * @param labelMap - Map des labels (déjà enrichie par enrichDataFromSubmission)
 * @returns Label du nœud ou "Inconnu" si non trouvé
 *
 * @example
 * await getNodeLabel("702d1b09...", prisma, labelMap) → "Prix Kw/h"
 */
function getNodeLabel(nodeId, prisma, labelMap) {
    return __awaiter(this, void 0, void 0, function () {
        var label, node;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // 🎯 PRIORITÉ 1: Vérifier dans labelMap si fourni
                    if (labelMap && labelMap.has(nodeId)) {
                        label = labelMap.get(nodeId);
                        return [2 /*return*/, label || 'Inconnu'];
                    }
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                            where: { id: nodeId },
                            select: {
                                label: true,
                                sharedReferenceName: true,
                                field_label: true
                            }
                        })];
                case 1:
                    node = _a.sent();
                    // 🔥 ORDRE DE PRIORITÉ pour cohérence avec les champs originaux:
                    // 1. sharedReferenceName (si défini, c'est le nom canonique de la référence)
                    // 2. field_label (libellé personnalisé du champ)
                    // 3. label (libellé standard)
                    return [2 /*return*/, (node === null || node === void 0 ? void 0 : node.sharedReferenceName) || (node === null || node === void 0 ? void 0 : node.field_label) || (node === null || node === void 0 ? void 0 : node.label) || 'Inconnu'];
            }
        });
    });
}
// ═══════════════════════════════════════════════════════════════════════════
// 🔄 MODULE 3 : INTERPRÉTATION RÉCURSIVE UNIVERSELLE
// ═══════════════════════════════════════════════════════════════════════════
/**
 * 🔄 FONCTION RÉCURSIVE UNIVERSELLE - CŒUR DU SYSTÈME
 *
 * C'est LA fonction centrale qui interprète n'importe quelle référence TBL.
 * Elle agit comme un dispatcher intelligent qui :
 *
 * 1. 🔍 Identifie le type de la référence
 * 2. 🎯 Vérifie si déjà calculée (cache)
 * 3. 🎬 Délègue à l'interpréteur approprié
 * 4. 💾 Met en cache le résultat
 * 5. 📤 Retourne le résultat structuré
 *
 * RÉCURSIVITÉ :
 * -------------
 * Cette fonction s'appelle elle-même indirectement via les interpréteurs
 * spécifiques (interpretCondition, interpretFormula, etc.), permettant
 * de résoudre des structures imbriquées infiniment complexes.
 *
 * PROTECTION :
 * ------------
 * - Limite de profondeur (depth > 10) pour éviter boucles infinies
 * - Cache (valuesCache) pour éviter recalculs multiples
 *
 * @param ref - Référence à interpréter (peut être n'importe quel format)
 * @param submissionId - ID de la soumission en cours
 * @param prisma - Instance Prisma Client
 * @param valuesCache - Cache des valeurs déjà calculées (évite boucles)
 * @param depth - Profondeur de récursion actuelle (protection)
 * @param valueMap - Map des valeurs (mode preview ou enrichie)
 * @param labelMap - Map des labels (enrichie automatiquement)
 * @returns Résultat interprété avec valeur, texte et détails
 *
 * @example
 * // Cas simple : champ
 * await interpretReference("702d1b09...", "tbl-xxx", prisma)
 * → { result: "1450", humanText: "Prix Kw/h(1450)", details: {...} }
 *
 * // Cas complexe : condition qui contient une formule
 * await interpretReference("condition:ff05cc48...", "tbl-xxx", prisma)
 * → Résout récursivement toute la structure
 */
function interpretReference(ref_1, submissionId_1, prisma_1) {
    return __awaiter(this, arguments, void 0, function (ref, submissionId, prisma, valuesCache, depth, valueMap, labelMap, knownType // 🆕 Type connu du contexte (p.ex. 'table' depuis @table.xxx)
    ) {
        var cleanRef, type, uuidRegex, result, _a, error_3;
        if (valuesCache === void 0) { valuesCache = new Map(); }
        if (depth === void 0) { depth = 0; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    // ═══════════════════════════════════════════════════════════════════════
                    // 🛡️ ÉTAPE 1 : Protection contre récursion infinie
                    // ═══════════════════════════════════════════════════════════════════════
                    if (depth > 10) {
                        console.error("[INTERPR\u00C9TATION] \u274C R\u00E9cursion trop profonde (depth=".concat(depth, ") pour ref:"), ref);
                        return [2 /*return*/, {
                                result: '∅',
                                humanText: '⚠️ Récursion trop profonde',
                                details: {
                                    type: 'error',
                                    error: 'Max depth exceeded',
                                    depth: depth
                                }
                            }];
                    }
                    cleanRef = normalizeRef(ref);
                    if (valuesCache.has(cleanRef)) {
                        console.log("[INTERPR\u00C9TATION] \u267B\uFE0F Cache hit pour ref: ".concat(cleanRef));
                        return [2 /*return*/, valuesCache.get(cleanRef)];
                    }
                    type = knownType || identifyReferenceType(ref);
                    uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
                    if (!(type === 'field' && uuidRegex.test(cleanRef))) return [3 /*break*/, 2];
                    console.log("[INTERPR\u00C9TATION] \uD83D\uDD0D UUID ambigu d\u00E9tect\u00E9: ".concat(cleanRef, ", v\u00E9rification en BD..."));
                    return [4 /*yield*/, identifyReferenceTypeFromDB(cleanRef, prisma)];
                case 1:
                    type = _b.sent();
                    _b.label = 2;
                case 2:
                    console.log("[INTERPR\u00C9TATION] \uD83D\uDD0D Type identifi\u00E9: ".concat(type, " pour ref: ").concat(ref, " (depth=").concat(depth).concat(knownType ? ", contexte: ".concat(knownType) : '', ")"));
                    _b.label = 3;
                case 3:
                    _b.trys.push([3, 14, , 15]);
                    _a = type;
                    switch (_a) {
                        case 'condition': return [3 /*break*/, 4];
                        case 'formula': return [3 /*break*/, 6];
                        case 'table': return [3 /*break*/, 8];
                        case 'value': return [3 /*break*/, 10];
                        case 'field': return [3 /*break*/, 10];
                    }
                    return [3 /*break*/, 12];
                case 4:
                    console.log("[INTERPR\u00C9TATION] \uD83D\uDD00 D\u00E9l\u00E9gation vers interpretCondition");
                    return [4 /*yield*/, interpretCondition(cleanRef, submissionId, prisma, valuesCache, depth, valueMap, labelMap)];
                case 5:
                    result = _b.sent();
                    return [3 /*break*/, 13];
                case 6:
                    console.log("[INTERPR\u00C9TATION] \uD83E\uDDEE D\u00E9l\u00E9gation vers interpretFormula");
                    return [4 /*yield*/, interpretFormula(cleanRef, submissionId, prisma, valuesCache, depth, valueMap, labelMap)];
                case 7:
                    result = _b.sent();
                    return [3 /*break*/, 13];
                case 8:
                    console.log("[INTERPR\u00C9TATION] \uD83D\uDCCA D\u00E9l\u00E9gation vers interpretTable");
                    return [4 /*yield*/, interpretTable(cleanRef, submissionId, prisma, valuesCache, depth, valueMap, labelMap)];
                case 9:
                    result = _b.sent();
                    return [3 /*break*/, 13];
                case 10:
                    console.log("[INTERPR\u00C9TATION] \uD83D\uDCDD D\u00E9l\u00E9gation vers interpretField (type: ".concat(type, ")"));
                    return [4 /*yield*/, interpretField(cleanRef, submissionId, prisma, valueMap, labelMap)];
                case 11:
                    result = _b.sent();
                    return [3 /*break*/, 13];
                case 12:
                    console.error("[INTERPR\u00C9TATION] \u274C Type inconnu: ".concat(type));
                    result = {
                        result: '∅',
                        humanText: "Type inconnu: ".concat(type),
                        details: { type: 'error', error: 'Unknown type' }
                    };
                    _b.label = 13;
                case 13: return [3 /*break*/, 15];
                case 14:
                    error_3 = _b.sent();
                    // Gestion des erreurs d'interprétation
                    console.error("[INTERPR\u00C9TATION] \u274C Erreur lors de l'interpr\u00E9tation:", error_3);
                    result = {
                        result: '∅',
                        humanText: "Erreur: ".concat(error_3 instanceof Error ? error_3.message : 'Inconnue'),
                        details: {
                            type: 'error',
                            error: error_3 instanceof Error ? error_3.message : String(error_3)
                        }
                    };
                    return [3 /*break*/, 15];
                case 15:
                    // ═══════════════════════════════════════════════════════════════════════
                    // 💾 ÉTAPE 5 : Mettre en cache le résultat
                    // ═══════════════════════════════════════════════════════════════════════
                    valuesCache.set(cleanRef, result);
                    console.log("[INTERPR\u00C9TATION] \u2705 R\u00E9sultat mis en cache pour: ".concat(cleanRef, " = ").concat(result.result));
                    return [2 /*return*/, result];
            }
        });
    });
}
// ═══════════════════════════════════════════════════════════════════════════
// 🔀 MODULE 4 : INTERPRÉTATION DES CONDITIONS
// ═══════════════════════════════════════════════════════════════════════════
/**
 * 🔀 INTERPRÈTE UNE CONDITION (Si...Alors...Sinon)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎯 FONCTIONNEMENT CLÉS :
 * ═══════════════════════════════════════════════════════════════════════════
 * Cette fonction évalue une condition logique ET INTERPRÈTE LES DEUX BRANCHES
 * (ALORS + SINON) pour fournir un résultat complet et transparent.
 *
 * ⚠️ DIFFÉRENCE AVEC L'ANCIENNE VERSION :
 * ----------------------------------------
 * AVANT : On interprétait SEULEMENT la branche sélectionnée
 *         → Texte incomplet : "Si X; ALORS: Y = result"
 *
 * MAINTENANT : On interprète LES DEUX branches systématiquement
 *              → Texte complet : "Si X; ALORS: Y = result1; SINON: Z = result2 → [ALORS SÉLECTIONNÉ]"
 *
 * 📊 EXEMPLE CONCRET :
 * --------------------
 * Condition : Si "Prix Kw/h" est vide
 * ALORS : Calcul automatique = 1250 / 5000 = 0.25
 * SINON : Utiliser la valeur saisie = Prix Kw/h
 *
 * Résultat affiché :
 * "Si Prix Kw/h(∅) est vide;
 *  ALORS: Calcul du prix Kw/h(1250)/Consommation(5000) = 0.25;
 *  SINON: Prix Kw/h(150) = 150
 *  → [ALORS SÉLECTIONNÉ] Result = 0.25"
 *
 * 🔄 PROCESSUS DÉTAILLÉ :
 * -----------------------
 * 1. 📥 Récupérer la condition depuis TreeBranchLeafNodeCondition
 * 2. 🔍 Extraire le WHEN (left op right)
 * 3. 📊 Récupérer les valeurs LEFT et RIGHT
 *    - LEFT : Valeur du champ testé (ex: Prix Kw/h)
 *    - RIGHT : Valeur de comparaison (fixe ou référence)
 * 4. ⚖️ Évaluer l'opérateur (isEmpty, eq, gt, etc.)
 * 5. 🎯 Déterminer quelle branche est vraie (ALORS ou SINON)
 * 6. 🔄 **INTERPRÉTER LES DEUX BRANCHES** (nouvelle logique)
 *    - Interpréter la branche ALORS (peut être formule/table/champ/condition)
 *    - Interpréter la branche SINON (idem)
 * 7. 📝 Construire le texte humain COMPLET avec les deux résultats
 * 8. 📤 Retourner le résultat de la branche sélectionnée + texte explicatif
 *
 * 🏗️ STRUCTURE D'UNE CONDITION :
 * -------------------------------
 * {
 *   branches: [{
 *     when: {
 *       op: "isEmpty",               // Opérateur : isEmpty, eq, gt, etc.
 *       left: {ref: "@value.xxx"}    // Référence au champ testé
 *     },
 *     actions: [{
 *       type: "SHOW",
 *       nodeIds: ["node-formula:yyy"] // Action si condition VRAIE
 *     }]
 *   }],
 *   fallback: {
 *     actions: [{
 *       type: "SHOW",
 *       nodeIds: ["zzz"]              // Action si condition FAUSSE
 *     }]
 *   }
 * }
 *
 * 🎨 FORMAT DU TEXTE GÉNÉRÉ :
 * ---------------------------
 * "Si {condition}; ALORS: {texte_alors}; SINON: {texte_sinon} → [{branche} SÉLECTIONNÉ] Result = {résultat}"
 *
 * Note: Les humanText des branches contiennent déjà leur résultat
 *       (ex: "expression = 0.25"), donc on ne rajoute PAS "= result" après !
 *
 * 📦 RETOUR :
 * -----------
 * {
 *   result: "0.25",                    // Résultat de la branche sélectionnée
 *   humanText: "Si ... ALORS: ... SINON: ... → [ALORS SÉLECTIONNÉ]",
 *   details: {
 *     type: 'condition',
 *     conditionId: "...",
 *     branchUsed: "ALORS",             // Branche qui a été utilisée
 *     alorsResult: {...},              // Détails du résultat ALORS
 *     sinonResult: {...},              // Détails du résultat SINON
 *     selectedResult: {...}            // Détails du résultat sélectionné
 *   }
 * }
 *
 * @param conditionId - ID de la condition (avec ou sans préfixe "condition:")
 * @param submissionId - ID de la soumission (ou "preview-xxx" en mode aperçu)
 * @param prisma - Instance Prisma Client pour accès BDD
 * @param valuesCache - Cache des valeurs déjà calculées (évite recalculs)
 * @param depth - Profondeur de récursion (protection contre boucles infinies)
 * @param valueMap - Map optionnelle des valeurs en preview (clé=nodeId, valeur=valeur)
 * @param labelMap - Map optionnelle des labels (clé=nodeId, valeur=label)
 * @returns Résultat interprété avec les deux branches évaluées
 */
function interpretCondition(conditionId, submissionId, prisma, valuesCache, depth, valueMap, labelMap) {
    return __awaiter(this, void 0, void 0, function () {
        var cleanId, condition, condSet, branch, when, resolveOperandReference, leftRef, leftValue, leftLabel, leftInfo, rightRef, rightValue, rightLabel, rightInfo, operator, conditionMet, _selectedBranch, branchName, alorsResult, alorsAction, alorsNodeId, sinonResult, sinonAction, sinonNodeId, operatorText, leftDisplay, rightDisplay, conditionText, humanText, finalResult;
        var _this = this;
        var _a, _b, _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    console.log("[CONDITION] \uD83D\uDD00 D\u00E9but interpr\u00E9tation condition: ".concat(conditionId));
                    cleanId = conditionId.replace('condition:', '');
                    return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.findUnique({
                            where: { id: cleanId },
                            select: {
                                id: true,
                                name: true,
                                conditionSet: true,
                                nodeId: true
                            }
                        })];
                case 1:
                    condition = _g.sent();
                    if (!condition) {
                        console.error("[CONDITION] \u274C Condition introuvable: ".concat(conditionId));
                        return [2 /*return*/, {
                                result: '∅',
                                humanText: "Condition introuvable: ".concat(conditionId),
                                details: { type: 'condition', error: 'Not found' }
                            }];
                    }
                    console.log("[CONDITION] \u2705 Condition trouv\u00E9e: ".concat(condition.name));
                    condSet = condition.conditionSet;
                    branch = (_a = condSet.branches) === null || _a === void 0 ? void 0 : _a[0];
                    when = branch === null || branch === void 0 ? void 0 : branch.when;
                    if (!when) {
                        console.error("[CONDITION] \u274C Structure WHEN manquante");
                        return [2 /*return*/, {
                                result: '∅',
                                humanText: 'Structure condition invalide',
                                details: { type: 'condition', error: 'Missing WHEN' }
                            }];
                    }
                    console.log("[CONDITION] \uD83D\uDD0D WHEN extrait:", JSON.stringify(when));
                    resolveOperandReference = function (ref) { return __awaiter(_this, void 0, void 0, function () {
                        var optionNodeId, optionNode, operandType, operandId, value, label, interpreted, labelFromDetails;
                        var _a, _b, _c, _d, _e;
                        return __generator(this, function (_f) {
                            switch (_f.label) {
                                case 0:
                                    if (!ref) {
                                        return [2 /*return*/, { value: null, label: 'Inconnu' }];
                                    }
                                    if (!ref.startsWith('@select.')) return [3 /*break*/, 2];
                                    optionNodeId = ref.slice('@select.'.length).split('.')[0];
                                    console.log("[CONDITION] \uD83D\uDD39 R\u00E9solution @select: ".concat(optionNodeId));
                                    return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                                            where: { id: optionNodeId },
                                            select: { id: true, label: true, parentId: true }
                                        })];
                                case 1:
                                    optionNode = _f.sent();
                                    if (optionNode) {
                                        console.log("[CONDITION] \uD83D\uDD39 Option trouv\u00E9e: ".concat(optionNode.label));
                                        // Pour une option, la "valeur" à comparer est son ID (car c'est ce qui est stocké dans la soumission)
                                        // et le label est le texte affiché
                                        return [2 /*return*/, { value: optionNode.id, label: optionNode.label }];
                                    }
                                    console.warn("[CONDITION] \u26A0\uFE0F Option non trouv\u00E9e: ".concat(optionNodeId));
                                    return [2 /*return*/, { value: optionNodeId, label: 'Option inconnue' }];
                                case 2:
                                    operandType = identifyReferenceType(ref);
                                    if (!(operandType === 'field' || operandType === 'value')) return [3 /*break*/, 5];
                                    operandId = normalizeRef(ref);
                                    return [4 /*yield*/, getNodeValue(operandId, submissionId, prisma, valueMap, { preserveEmpty: true })];
                                case 3:
                                    value = _f.sent();
                                    return [4 /*yield*/, getNodeLabel(operandId, prisma, labelMap)];
                                case 4:
                                    label = _f.sent();
                                    return [2 /*return*/, { value: value, label: label }];
                                case 5: return [4 /*yield*/, interpretReference(ref, submissionId, prisma, valuesCache, depth + 1, valueMap, labelMap, operandType)];
                                case 6:
                                    interpreted = _f.sent();
                                    labelFromDetails = ((_a = interpreted.details) === null || _a === void 0 ? void 0 : _a.conditionName)
                                        || ((_b = interpreted.details) === null || _b === void 0 ? void 0 : _b.formulaName)
                                        || ((_c = interpreted.details) === null || _c === void 0 ? void 0 : _c.tableName)
                                        || ((_d = interpreted.details) === null || _d === void 0 ? void 0 : _d.label)
                                        || ((_e = interpreted.details) === null || _e === void 0 ? void 0 : _e.name)
                                        || "R\u00E9f\u00E9rence ".concat(operandType);
                                    return [2 /*return*/, {
                                            value: interpreted.result,
                                            label: labelFromDetails
                                        }];
                            }
                        });
                    }); };
                    leftRef = (_b = when.left) === null || _b === void 0 ? void 0 : _b.ref;
                    leftValue = null;
                    leftLabel = 'Inconnu';
                    if (!leftRef) return [3 /*break*/, 3];
                    return [4 /*yield*/, resolveOperandReference(leftRef)];
                case 2:
                    leftInfo = _g.sent();
                    leftValue = leftInfo.value;
                    leftLabel = leftInfo.label;
                    console.log("[CONDITION] \uD83D\uDCCA LEFT: ".concat(leftLabel, " = ").concat(leftValue));
                    _g.label = 3;
                case 3:
                    rightRef = (_c = when.right) === null || _c === void 0 ? void 0 : _c.ref;
                    rightValue = null;
                    rightLabel = 'Inconnu';
                    if (!rightRef) return [3 /*break*/, 5];
                    return [4 /*yield*/, resolveOperandReference(rightRef)];
                case 4:
                    rightInfo = _g.sent();
                    rightValue = rightInfo.value;
                    rightLabel = rightInfo.label;
                    console.log("[CONDITION] \uD83D\uDCCA RIGHT (ref): ".concat(rightLabel, " = ").concat(rightValue));
                    return [3 /*break*/, 6];
                case 5:
                    if (((_d = when.right) === null || _d === void 0 ? void 0 : _d.value) !== undefined) {
                        // C'est une valeur fixe
                        rightValue = String(when.right.value);
                        rightLabel = rightValue;
                        console.log("[CONDITION] \uD83D\uDCCA RIGHT (value): ".concat(rightValue));
                    }
                    _g.label = 6;
                case 6:
                    operator = when.op;
                    conditionMet = evaluateOperator(operator, leftValue, rightValue);
                    console.log("[CONDITION] \u2696\uFE0F \u00C9valuation: ".concat(leftValue, " ").concat(operator, " ").concat(rightValue, " = ").concat(conditionMet));
                    _selectedBranch = conditionMet ? branch : condSet.fallback;
                    branchName = conditionMet ? 'ALORS' : 'SINON';
                    console.log("[CONDITION] \uD83C\uDFAF Branche s\u00E9lectionn\u00E9e: ".concat(branchName));
                    alorsResult = { result: '∅', humanText: 'Aucune action' };
                    if (!(branch && branch.actions && branch.actions.length > 0)) return [3 /*break*/, 8];
                    alorsAction = branch.actions[0];
                    alorsNodeId = (_e = alorsAction.nodeIds) === null || _e === void 0 ? void 0 : _e[0];
                    if (!alorsNodeId) return [3 /*break*/, 8];
                    console.log("[CONDITION] \uD83D\uDD04 Interpr\u00E9tation branche ALORS: ".concat(alorsNodeId));
                    return [4 /*yield*/, interpretReference(alorsNodeId, submissionId, prisma, valuesCache, depth + 1, valueMap, labelMap)];
                case 7:
                    alorsResult = _g.sent();
                    console.log("[CONDITION] \u2705 R\u00E9sultat ALORS: ".concat(alorsResult.result));
                    _g.label = 8;
                case 8:
                    sinonResult = { result: '∅', humanText: 'Aucune action' };
                    if (!(condSet.fallback && condSet.fallback.actions && condSet.fallback.actions.length > 0)) return [3 /*break*/, 10];
                    sinonAction = condSet.fallback.actions[0];
                    sinonNodeId = (_f = sinonAction.nodeIds) === null || _f === void 0 ? void 0 : _f[0];
                    if (!sinonNodeId) return [3 /*break*/, 10];
                    console.log("[CONDITION] \uD83D\uDD04 Interpr\u00E9tation branche SINON: ".concat(sinonNodeId));
                    return [4 /*yield*/, interpretReference(sinonNodeId, submissionId, prisma, valuesCache, depth + 1, valueMap, labelMap)];
                case 9:
                    sinonResult = _g.sent();
                    console.log("[CONDITION] \u2705 R\u00E9sultat SINON: ".concat(sinonResult.result));
                    _g.label = 10;
                case 10:
                    operatorText = getOperatorText(operator);
                    leftDisplay = "".concat(leftLabel, "(").concat(leftValue || '∅', ")");
                    rightDisplay = rightLabel !== 'Inconnu' ? "".concat(rightLabel) : '';
                    conditionText = rightDisplay
                        ? "Si ".concat(leftDisplay, " ").concat(operatorText, " ").concat(rightDisplay)
                        : "Si ".concat(leftDisplay, " ").concat(operatorText);
                    humanText = "".concat(conditionText, "; ") +
                        "ALORS: ".concat(alorsResult.humanText, "; ") +
                        "SINON: ".concat(sinonResult.humanText, " ") +
                        "\u2192 [".concat(branchName, " S\u00C9LECTIONN\u00C9] Result = ").concat(conditionMet ? alorsResult.result : sinonResult.result);
                    console.log("[CONDITION] \uD83D\uDCDD Texte g\u00E9n\u00E9r\u00E9: ".concat(humanText));
                    finalResult = conditionMet ? alorsResult.result : sinonResult.result;
                    return [2 /*return*/, {
                            result: finalResult,
                            humanText: humanText,
                            details: {
                                type: 'condition',
                                conditionId: condition.id,
                                conditionName: condition.name,
                                when: {
                                    left: { ref: leftRef, label: leftLabel, value: leftValue },
                                    operator: operator,
                                    right: { ref: rightRef, label: rightLabel, value: rightValue },
                                    evaluated: conditionMet
                                },
                                branchUsed: branchName,
                                alorsResult: alorsResult.details,
                                sinonResult: sinonResult.details,
                                selectedResult: conditionMet ? alorsResult.details : sinonResult.details
                            }
                        }];
            }
        });
    });
}
/**
 * ⚖️ Évalue un opérateur de condition
 *
 * OPÉRATEURS SUPPORTÉS :
 * ----------------------
 * - isEmpty      : Vérifie si vide (null, undefined, '')
 * - isNotEmpty   : Vérifie si non vide
 * - eq (==)      : Égalité stricte
 * - ne (!=)      : Différent
 * - gt (>)       : Supérieur (numérique)
 * - gte (>=)     : Supérieur ou égal
 * - lt (<)       : Inférieur
 * - lte (<=)     : Inférieur ou égal
 *
 * @param op - Opérateur à évaluer
 * @param left - Valeur de gauche
 * @param right - Valeur de droite
 * @returns true si condition vraie, false sinon
 */
function evaluateOperator(op, left, right) {
    switch (op) {
        case 'isEmpty':
            return left === null || left === undefined || left === '';
        case 'isNotEmpty':
            return left !== null && left !== undefined && left !== '';
        case 'eq':
        case '==':
            return left === right;
        case 'ne':
        case '!=':
            return left !== right;
        // 🔥 NOUVEAU: Opérateur 'contains' pour vérifier si une chaîne contient une autre
        case 'contains':
            if (left === null || left === undefined)
                return false;
            if (right === null || right === undefined)
                return false;
            return String(left).toLowerCase().includes(String(right).toLowerCase());
        // 🔥 NOUVEAU: Opérateur 'startsWith' pour vérifier si une chaîne commence par une autre
        case 'startsWith':
        case 'commence par':
            if (left === null || left === undefined)
                return false;
            if (right === null || right === undefined)
                return false;
            return String(left).toLowerCase().startsWith(String(right).toLowerCase());
        case 'gt':
        case '>':
            return Number(left) > Number(right);
        case 'gte':
        case '>=':
            return Number(left) >= Number(right);
        case 'lt':
        case '<':
            return Number(left) < Number(right);
        case 'lte':
        case '<=':
            return Number(left) <= Number(right);
        default:
            console.warn("[CONDITION] \u26A0\uFE0F Op\u00E9rateur inconnu: ".concat(op));
            return false;
    }
}
function compareValuesByOperator(op, cellValue, targetValue) {
    if (!op)
        return false;
    switch (op) {
        case 'equals':
        case '==':
            return String(cellValue) === String(targetValue);
        case 'notEquals':
        case '!=':
            return String(cellValue) !== String(targetValue);
        case 'greaterThan':
        case '>':
            return Number(cellValue) > Number(targetValue);
        case 'greaterOrEqual':
        case '>=':
            return Number(cellValue) >= Number(targetValue);
        case 'lessThan':
        case '<':
            return Number(cellValue) < Number(targetValue);
        case 'lessOrEqual':
        case '<=':
            return Number(cellValue) <= Number(targetValue);
        case 'contains':
            return String(cellValue).includes(String(targetValue));
        case 'notContains':
            return !String(cellValue).includes(String(targetValue));
        default:
            return false;
    }
}
// ═══════════════════════════════════════════════════════════════════════
// 🧰 UTILITAIRES COMMUNS POUR LES LOOKUP (normalisation + recherche numérique)
// ═══════════════════════════════════════════════════════════════════════
var normalizeLookupValue = function (value) { return String(value !== null && value !== void 0 ? value : '').trim().toLowerCase(); };
var parseNumericLookupValue = function (value) {
    if (typeof value === 'number')
        return value;
    var raw = String(value !== null && value !== void 0 ? value : '').trim();
    if (!raw)
        return NaN;
    var sanitized = raw.replace(/,/g, '.').replace(/[^0-9+\-\.]/g, '');
    if (!sanitized)
        return NaN;
    return Number(sanitized);
};
function findClosestIndexInLabels(targetValue, labels, allowedIndices) {
    var indices = allowedIndices && allowedIndices.length ? allowedIndices : labels.map(function (_, idx) { return idx; });
    var normalizedTarget = normalizeLookupValue(targetValue);
    for (var _i = 0, indices_1 = indices; _i < indices_1.length; _i++) {
        var idx = indices_1[_i];
        var label = labels[idx];
        if (normalizeLookupValue(label) === normalizedTarget || label === targetValue) {
            return { index: idx, matchType: 'text', matchedValue: label };
        }
    }
    var numericTarget = parseNumericLookupValue(targetValue);
    if (isNaN(numericTarget)) {
        return null;
    }
    var exactIndex = -1;
    var upperIndex = -1;
    var upperValue = Infinity;
    var lowerIndex = -1;
    var lowerValue = -Infinity;
    for (var _a = 0, indices_2 = indices; _a < indices_2.length; _a++) {
        var idx = indices_2[_a];
        var labelValue = parseNumericLookupValue(labels[idx]);
        if (isNaN(labelValue))
            continue;
        if (labelValue === numericTarget) {
            exactIndex = idx;
            break;
        }
        if (labelValue >= numericTarget && labelValue < upperValue) {
            upperValue = labelValue;
            upperIndex = idx;
        }
        if (labelValue <= numericTarget && labelValue > lowerValue) {
            lowerValue = labelValue;
            lowerIndex = idx;
        }
    }
    if (exactIndex !== -1) {
        return { index: exactIndex, matchType: 'numeric', matchedValue: numericTarget };
    }
    if (upperIndex !== -1) {
        return { index: upperIndex, matchType: 'numeric', matchedValue: upperValue };
    }
    if (lowerIndex !== -1) {
        return { index: lowerIndex, matchType: 'numeric', matchedValue: lowerValue };
    }
    return null;
}
/**
 * 📝 Traduit un opérateur en texte humain français
 *
 * @param op - Opérateur technique
 * @returns Texte en français
 */
function getOperatorText(op) {
    var texts = {
        'isEmpty': 'est vide',
        'isNotEmpty': "n'est pas vide",
        'eq': '=',
        'ne': '≠',
        'gt': '>',
        'gte': '≥',
        'lt': '<',
        'lte': '≤',
        '==': '=',
        '!=': '≠'
    };
    return texts[op] || op;
}
var RE_NODE_FORMULA = /node-formula:[a-z0-9-]+/i;
var RE_LEGACY_FORMULA = /formula:[a-z0-9-]+/i;
var UUID_REGEX = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function encodeRef(refType, refId) {
    return "".concat(refType, "::").concat(refId);
}
function tryParseTokenReference(token) {
    if (!token || typeof token !== 'string')
        return null;
    var rawToken = token;
    var normalizedToken = token.trim();
    var wrapperMatch = normalizedToken.match(/^\{\{\s*(.+?)\s*\}\}$/);
    if (wrapperMatch && wrapperMatch[1]) {
        normalizedToken = wrapperMatch[1];
    }
    var createMeta = function (refType, refId) { return ({ refType: refType, refId: refId, rawToken: rawToken }); };
    // 🔥 NOUVEAU: Support des tokens @calculated.xxx (champs avec valeur calculée)
    // Ces tokens référencent un nodeId qui a une formule associée
    if (normalizedToken.startsWith('@calculated.')) {
        var nodeId = normalizedToken.slice('@calculated.'.length);
        // Un @calculated.xxx est essentiellement une référence à un champ (value) 
        // dont la valeur sera récupérée ou calculée
        return createMeta('value', nodeId);
    }
    if (normalizedToken.startsWith('@value.condition:')) {
        return createMeta('condition', normalizedToken.slice('@value.condition:'.length));
    }
    if (normalizedToken.startsWith('@value.node-condition:')) {
        return createMeta('condition', normalizedToken.slice('@value.node-condition:'.length));
    }
    if (normalizedToken.startsWith('@value.')) {
        return createMeta('value', normalizedToken.slice('@value.'.length));
    }
    if (normalizedToken.startsWith('@table.')) {
        return createMeta('table', normalizedToken.slice('@table.'.length));
    }
    if (normalizedToken.startsWith('@condition.')) {
        return createMeta('condition', normalizedToken.slice('@condition.'.length));
    }
    if (normalizedToken.startsWith('@select.')) {
        var cleaned = normalizedToken.slice('@select.'.length).split('.')[0];
        return cleaned ? createMeta('value', cleaned) : null;
    }
    var formulaMatch = normalizedToken.match(RE_NODE_FORMULA) || normalizedToken.match(RE_LEGACY_FORMULA);
    if (formulaMatch && formulaMatch[0]) {
        var normalized = formulaMatch[0].startsWith('node-formula:')
            ? formulaMatch[0].slice('node-formula:'.length)
            : formulaMatch[0].slice('formula:'.length);
        return createMeta('formula', normalized);
    }
    if (normalizedToken.startsWith('node-formula:')) {
        return createMeta('formula', normalizedToken.slice('node-formula:'.length));
    }
    // Support aussi "formula:" sans préfixe "node-"
    if (normalizedToken.startsWith('formula:') && !normalizedToken.startsWith('formula:node-')) {
        return createMeta('formula', normalizedToken.slice('formula:'.length));
    }
    if (normalizedToken.startsWith('node-table:')) {
        return createMeta('table', normalizedToken.slice('node-table:'.length));
    }
    // Support aussi "table:" sans préfixe "node-"
    if (normalizedToken.startsWith('table:') && !normalizedToken.startsWith('table:node-')) {
        return createMeta('table', normalizedToken.slice('table:'.length));
    }
    if (normalizedToken.startsWith('node-condition:')) {
        return createMeta('condition', normalizedToken.slice('node-condition:'.length));
    }
    // Support aussi "condition:" sans préfixe "node-"
    if (normalizedToken.startsWith('condition:') && !normalizedToken.startsWith('condition:node-')) {
        return createMeta('condition', normalizedToken.slice('condition:'.length));
    }
    if (normalizedToken.startsWith('shared-ref-') || normalizedToken.startsWith('node_') || UUID_REGEX.test(normalizedToken)) {
        return createMeta('field', normalizedToken);
    }
    return null;
}
function buildFormulaExpression(tokens) {
    var parts = [];
    var roleToEncoded = {};
    var encodedMeta = {};
    var exprSegments = [];
    var varIndex = 0;
    var appendLiteral = function (value) {
        exprSegments.push(value);
        parts.push({ type: 'literal', value: value });
    };
    var registerReference = function (meta) {
        var encoded = encodeRef(meta.refType, meta.refId);
        if (!encodedMeta[encoded])
            encodedMeta[encoded] = meta;
        var role = "var_".concat(varIndex++);
        roleToEncoded[role] = encoded;
        var placeholder = "{{".concat(role, "}}");
        exprSegments.push(placeholder);
        parts.push({ type: 'placeholder', encoded: encoded });
    };
    for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
        var rawToken = tokens_1[_i];
        if (typeof rawToken === 'string') {
            var refMeta = tryParseTokenReference(rawToken);
            if (refMeta) {
                registerReference(refMeta);
                continue;
            }
            if (rawToken === 'CONCAT') {
                appendLiteral('&');
                continue;
            }
            appendLiteral(rawToken);
        }
        else if (rawToken && typeof rawToken === 'object') {
            var refStr = typeof rawToken.ref === 'string'
                ? rawToken.ref
                : typeof rawToken.value === 'string'
                    ? rawToken.value
                    : typeof rawToken.nodeId === 'string'
                        ? rawToken.nodeId
                        : '';
            if (refStr) {
                var refMeta = tryParseTokenReference(refStr) || { refType: 'field', refId: refStr, rawToken: refStr };
                registerReference(refMeta);
            }
        }
    }
    var expression = exprSegments.join(' ');
    return { expression: expression, parts: parts, roleToEncoded: roleToEncoded, encodedMeta: encodedMeta };
}
// ═══════════════════════════════════════════════════════════════════════════
// 🧮 MODULE 5 : INTERPRÉTATION DES FORMULES
// ═══════════════════════════════════════════════════════════════════════════
/**
 * 🧮 INTERPRÈTE UNE FORMULE (Calcul mathématique)
 *
 * Cette fonction évalue une formule mathématique en résolvant tous ses tokens.
 *
 * PROCESSUS :
 * -----------
 * 1. 📥 Récupérer la formule depuis TreeBranchLeafNodeFormula
 * 2. 🔍 Parcourir les tokens un par un
 * 3. 🔄 Pour chaque @value.xxx, interpréter récursivement
 * 4. 🧮 Construire l'expression mathématique
 * 5. ⚡ Calculer le résultat final
 * 6. 📝 Générer le texte explicatif
 *
 * FORMAT DES TOKENS :
 * -------------------
 * ["@value.xxx", "/", "@value.yyy"] → Champ1 / Champ2
 * [{ type: "ref", ref: "@value.xxx" }, "+", "100"] → Champ + 100
 *
 * @param formulaId - ID de la formule
 * @param submissionId - ID de la soumission
 * @param prisma - Instance Prisma Client
 * @param valuesCache - Cache des valeurs
 * @param depth - Profondeur de récursion
 * @returns Résultat interprété
 */
function interpretFormula(formulaId, submissionId, prisma, valuesCache, depth, valueMap, labelMap) {
    return __awaiter(this, void 0, void 0, function () {
        var cleanId, formula, byNode, e_1, tokens, buildResult, valueCacheByEncoded, labelCacheByEncoded, detailCacheByEncoded, resolveVariable, evaluation, error_4, humanExpression, calculatedResult, humanText, tokenDetails;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("[FORMULE] \uD83E\uDDEE D\u00E9but interpr\u00E9tation formule: ".concat(formulaId));
                    cleanId = formulaId.replace('node-formula:', '');
                    return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findUnique({
                            where: { id: cleanId },
                            select: {
                                id: true,
                                name: true,
                                tokens: true,
                                nodeId: true
                            }
                        })];
                case 1:
                    formula = _a.sent();
                    if (!!formula) return [3 /*break*/, 5];
                    console.log("[FORMULE] \uD83D\uDD0D Formule introuvable par ID, tentative r\u00E9solution par nodeId: ".concat(cleanId));
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findFirst({
                            where: { nodeId: cleanId },
                            select: { id: true, name: true, tokens: true, nodeId: true },
                            orderBy: { isDefault: 'desc' }
                        })];
                case 3:
                    byNode = _a.sent();
                    if (byNode) {
                        formula = byNode;
                        console.log("[FORMULE] \u2705 Formule r\u00E9solue via nodeId \u2192 formula:".concat(formula.id));
                    }
                    return [3 /*break*/, 5];
                case 4:
                    e_1 = _a.sent();
                    console.warn('[FORMULE] ⚠️ Résolution implicite échouée:', e_1 instanceof Error ? e_1.message : e_1);
                    return [3 /*break*/, 5];
                case 5:
                    if (!formula) {
                        console.error("[FORMULE] \u274C Formule introuvable: ".concat(formulaId));
                        return [2 /*return*/, {
                                result: '∅',
                                humanText: "Formule introuvable: ".concat(formulaId),
                                details: { type: 'formula', error: 'Not found' }
                            }];
                    }
                    console.log("[FORMULE] \u2705 Formule trouv\u00E9e: ".concat(formula.name));
                    tokens = Array.isArray(formula.tokens) ? formula.tokens : [];
                    console.log("[FORMULE] \uD83D\uDCCB Tokens:", JSON.stringify(tokens));
                    buildResult = buildFormulaExpression(tokens);
                    if (!buildResult.expression.trim()) {
                        console.warn('[FORMULE] ⚠️ Expression vide, retour 0');
                        return [2 /*return*/, {
                                result: '0',
                                humanText: '0',
                                details: {
                                    type: 'formula',
                                    formulaId: formula.id,
                                    formulaName: formula.name,
                                    tokens: [],
                                    expression: '',
                                    humanExpression: '',
                                    calculatedResult: 0
                                }
                            }];
                    }
                    valueCacheByEncoded = new Map();
                    labelCacheByEncoded = new Map();
                    detailCacheByEncoded = new Map();
                    resolveVariable = function (encoded) { return __awaiter(_this, void 0, void 0, function () {
                        var meta, refResult, numeric, safeValue, label, label, error_5;
                        var _a, _b;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    if (valueCacheByEncoded.has(encoded)) {
                                        return [2 /*return*/, valueCacheByEncoded.get(encoded)];
                                    }
                                    meta = buildResult.encodedMeta[encoded];
                                    if (!meta || !meta.refId) {
                                        valueCacheByEncoded.set(encoded, 0);
                                        labelCacheByEncoded.set(encoded, (meta === null || meta === void 0 ? void 0 : meta.rawToken) || encoded);
                                        return [2 /*return*/, 0];
                                    }
                                    _c.label = 1;
                                case 1:
                                    _c.trys.push([1, 6, , 7]);
                                    return [4 /*yield*/, interpretReference(meta.refId, submissionId, prisma, valuesCache, depth + 1, valueMap, labelMap, meta.refType)];
                                case 2:
                                    refResult = _c.sent();
                                    detailCacheByEncoded.set(encoded, refResult);
                                    numeric = Number(refResult.result);
                                    safeValue = Number.isFinite(numeric) ? numeric : 0;
                                    valueCacheByEncoded.set(encoded, safeValue);
                                    if (!(meta.refType === 'formula')) return [3 /*break*/, 3];
                                    label = ((_a = refResult.details) === null || _a === void 0 ? void 0 : _a.formulaName) || ((_b = refResult.details) === null || _b === void 0 ? void 0 : _b.label) || "Formule ".concat(meta.refId);
                                    labelCacheByEncoded.set(encoded, label);
                                    return [3 /*break*/, 5];
                                case 3: return [4 /*yield*/, getNodeLabel(meta.refId, prisma, labelMap).catch(function () { return meta.refId; })];
                                case 4:
                                    label = _c.sent();
                                    labelCacheByEncoded.set(encoded, label || meta.refId);
                                    _c.label = 5;
                                case 5: return [2 /*return*/, safeValue];
                                case 6:
                                    error_5 = _c.sent();
                                    console.error('[FORMULE] ❌ Erreur résolution variable:', { encoded: encoded, error: error_5 });
                                    valueCacheByEncoded.set(encoded, 0);
                                    labelCacheByEncoded.set(encoded, (meta === null || meta === void 0 ? void 0 : meta.rawToken) || encoded);
                                    return [2 /*return*/, 0];
                                case 7: return [2 /*return*/];
                            }
                        });
                    }); };
                    _a.label = 6;
                case 6:
                    _a.trys.push([6, 8, , 9]);
                    return [4 /*yield*/, (0, formulaEngine_js_1.evaluateExpression)(buildResult.expression, buildResult.roleToEncoded, {
                            resolveVariable: resolveVariable,
                            divisionByZeroValue: 0,
                            strictVariables: false
                        })];
                case 7:
                    evaluation = _a.sent();
                    return [3 /*break*/, 9];
                case 8:
                    error_4 = _a.sent();
                    console.error('[FORMULE] ❌ Erreur evaluateExpression:', error_4);
                    return [2 /*return*/, {
                            result: '∅',
                            humanText: 'Erreur de calcul de la formule',
                            details: {
                                type: 'formula',
                                formulaId: formula.id,
                                formulaName: formula.name,
                                tokens: tokens.map(function (token) { return ({ type: 'raw', value: token }); }),
                                expression: buildResult.expression,
                                humanExpression: buildResult.expression,
                                calculatedResult: 0,
                                error: error_4 instanceof Error ? error_4.message : String(error_4)
                            }
                        }];
                case 9:
                    humanExpression = buildResult.parts
                        .map(function (part) {
                        var _a, _b;
                        if (part.type === 'literal')
                            return part.value;
                        var label = labelCacheByEncoded.get(part.encoded) || ((_a = buildResult.encodedMeta[part.encoded]) === null || _a === void 0 ? void 0 : _a.refId) || part.encoded;
                        var value = (_b = valueCacheByEncoded.get(part.encoded)) !== null && _b !== void 0 ? _b : 0;
                        return "".concat(label, "(").concat(value, ")");
                    })
                        .join(' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                    calculatedResult = evaluation.value;
                    humanText = "".concat(humanExpression, " = ").concat(calculatedResult);
                    tokenDetails = buildResult.parts.map(function (part) {
                        var _a, _b;
                        if (part.type === 'literal') {
                            return { type: 'literal', value: part.value };
                        }
                        var meta = buildResult.encodedMeta[part.encoded];
                        return {
                            type: 'reference',
                            ref: meta === null || meta === void 0 ? void 0 : meta.refId,
                            refType: meta === null || meta === void 0 ? void 0 : meta.refType,
                            label: labelCacheByEncoded.get(part.encoded) || (meta === null || meta === void 0 ? void 0 : meta.refId),
                            value: (_a = valueCacheByEncoded.get(part.encoded)) !== null && _a !== void 0 ? _a : 0,
                            details: ((_b = detailCacheByEncoded.get(part.encoded)) === null || _b === void 0 ? void 0 : _b.details) || null
                        };
                    });
                    return [2 /*return*/, {
                            result: String(calculatedResult),
                            humanText: humanText,
                            details: {
                                type: 'formula',
                                formulaId: formula.id,
                                formulaName: formula.name,
                                tokens: tokenDetails,
                                expression: buildResult.expression,
                                humanExpression: humanExpression,
                                calculatedResult: calculatedResult,
                                evaluationErrors: evaluation.errors
                            }
                        }];
            }
        });
    });
}
// ═══════════════════════════════════════════════════════════════════════════
// 📊 MODULE 6 : INTERPRÉTATION DES TABLES (LOOKUP)
// ═══════════════════════════════════════════════════════════════════════════
/**
 * 📊 INTERPRÈTE UNE TABLE (Lookup croisé)
 *
 * Cette fonction effectue un lookup dans une table en croisant ligne × colonne.
 *
 * PROCESSUS :
 * -----------
 * 1. 📥 Récupérer la table depuis TreeBranchLeafNodeTable
 * 2. 🔍 Extraire la config de lookup (selectors)
 * 3. 📊 Récupérer les valeurs sélectionnées (rowFieldId, columnFieldId)
 * 4. 🎯 Trouver les index dans rows[] et columns[]
 * 5. 📍 Faire le lookup dans data[rowIndex][colIndex]
 * 6. 📝 Générer le texte explicatif
 *
 * STRUCTURE D'UNE TABLE :
 * -----------------------
 * columns: ["Orientation", "0", "5", "15", "25", ...]
 * rows: ["Orientation", "Nord", "Nord-Est", ...]
 * data: [[86, 82, 73, ...], [86, 83, 74, ...], ...]
 * meta.lookup.selectors: { rowFieldId, columnFieldId }
 *
 * @param tableId - ID de la table
 * @param submissionId - ID de la soumission
 * @param prisma - Instance Prisma Client
 * @param valuesCache - Cache des valeurs
 * @param depth - Profondeur de récursion
 * @returns Résultat interprété
 */
// ═══════════════════════════════════════════════════════════════════════════
// 🔥 NOUVEAU: Gestion des 3 options de source (SELECT/CHAMP/CAPACITÉ)
// ═══════════════════════════════════════════════════════════════════════════
/**
 * 🔥 Récupère la valeur source selon le type configuré
 *
 * Supporte les 3 options :
 * 1. SELECT (columnSourceOption?.type === 'select'): Utilise le champ configuré
 * 2. CHAMP (columnSourceOption?.type === 'field'): Récupère la valeur d'un autre champ
 * 3. CAPACITÉ (columnSourceOption?.type === 'capacity'): Exécute une capacité
 *
 * @param sourceOption - Configuration de la source (columnSourceOption ou rowSourceOption)
 * @param lookupConfig - Configuration lookup complète (fallback pour mode SELECT)
 * @param fieldId - ID du champ pour le mode SELECT (fallback)
 * @param submissionId - ID de la soumission
 * @param prisma - Instance Prisma
 * @param valuesCache - Cache des interprétations
 * @param depth - Profondeur de récursion
 * @param valueMap - Map des valeurs
 * @param labelMap - Map des labels
 * @returns Valeur source | null
 */
function getSourceValue(sourceOption, lookupConfig, fieldId, submissionId, prisma, valuesCache, depth, valueMap, labelMap) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, result, capacityResult, error_6;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!(!sourceOption || sourceOption.type === 'select')) return [3 /*break*/, 4];
                    if (!fieldId) return [3 /*break*/, 2];
                    return [4 /*yield*/, getNodeValue(fieldId, submissionId, prisma, valueMap)];
                case 1:
                    _a = _b.sent();
                    return [3 /*break*/, 3];
                case 2:
                    _a = null;
                    _b.label = 3;
                case 3: return [2 /*return*/, _a];
                case 4:
                    if (!(sourceOption.type === 'field' && sourceOption.sourceField)) return [3 /*break*/, 6];
                    console.log("[TABLE] \uD83D\uDD0D DEBUG CHAMP: sourceOption=", JSON.stringify(sourceOption, null, 2));
                    console.log("[TABLE] \uD83D\uDD0D DEBUG CHAMP: submissionId=".concat(submissionId, ", sourceField=").concat(sourceOption.sourceField));
                    console.log("[TABLE] \uD83D\uDD0D DEBUG CHAMP: valueMap has ".concat((valueMap === null || valueMap === void 0 ? void 0 : valueMap.size) || 0, " entries:"), valueMap ? Array.from(valueMap.keys()).slice(0, 5) : 'NO_VALUE_MAP');
                    return [4 /*yield*/, getNodeValue(sourceOption.sourceField, submissionId, prisma, valueMap)];
                case 5:
                    result = _b.sent();
                    console.log("[TABLE] \uD83D\uDD25 Option 2 CHAMP: sourceField=".concat(sourceOption.sourceField, " \u2192 ").concat(result));
                    return [2 /*return*/, result];
                case 6:
                    if (!(sourceOption.type === 'capacity' && sourceOption.capacityRef)) return [3 /*break*/, 10];
                    _b.label = 7;
                case 7:
                    _b.trys.push([7, 9, , 10]);
                    return [4 /*yield*/, interpretReference(sourceOption.capacityRef, submissionId, prisma, valuesCache, depth + 1, valueMap, labelMap)];
                case 8:
                    capacityResult = _b.sent();
                    console.log("[TABLE] \uD83D\uDD25 Option 3 CAPACIT\u00C9: capacityRef=".concat(sourceOption.capacityRef, " \u2192 ").concat(capacityResult.result));
                    return [2 /*return*/, capacityResult.result];
                case 9:
                    error_6 = _b.sent();
                    console.error("[TABLE] \u274C Erreur ex\u00E9cution capacit\u00E9 ".concat(sourceOption.capacityRef, ":"), error_6);
                    return [2 /*return*/, null];
                case 10: return [2 /*return*/, null];
            }
        });
    });
}
/**
 * 🏷️ Récupère le label de la source selon le type configuré
 *
 * @param sourceOption - Configuration de la source
 * @param lookupConfig - Configuration lookup complète (fallback)
 * @param fieldId - ID du champ pour fallback
 * @param prisma - Instance Prisma
 * @param labelMap - Map des labels
 * @returns Label de la source
 */
function getSourceLabel(sourceOption, lookupConfig, fieldId, prisma, labelMap) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, capacityId;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!(!sourceOption || sourceOption.type === 'select')) return [3 /*break*/, 4];
                    if (!fieldId) return [3 /*break*/, 2];
                    return [4 /*yield*/, getNodeLabel(fieldId, prisma, labelMap)];
                case 1:
                    _a = _b.sent();
                    return [3 /*break*/, 3];
                case 2:
                    _a = 'Source';
                    _b.label = 3;
                case 3: return [2 /*return*/, _a];
                case 4:
                    if (!(sourceOption.type === 'field' && sourceOption.sourceField)) return [3 /*break*/, 6];
                    return [4 /*yield*/, getNodeLabel(sourceOption.sourceField, prisma, labelMap)];
                case 5: return [2 /*return*/, _b.sent()];
                case 6:
                    // Option CAPACITÉ: label de la capacité
                    if (sourceOption.type === 'capacity' && sourceOption.capacityRef) {
                        capacityId = sourceOption.capacityRef.replace('@value.', '').replace('formula:', '').replace('condition:', '').replace('table:', '');
                        if (labelMap && labelMap.has(capacityId)) {
                            return [2 /*return*/, labelMap.get(capacityId) || capacityId];
                        }
                        return [2 /*return*/, "Capacit\u00E9: ".concat(sourceOption.capacityRef)];
                    }
                    return [2 /*return*/, 'Source'];
            }
        });
    });
}
// ═══════════════════════════════════════════════════════════════════════════
function interpretTable(tableId, submissionId, prisma, valuesCache, depth, valueMap, labelMap) {
    return __awaiter(this, void 0, void 0, function () {
        var cleanId, table, byNode, e_2, columns, rows, data, meta, lookup, isLookupActive, rowFieldId, colFieldId, rowEnabled, colEnabled, rowSourceOption, colSourceOption, hasRowSelector, hasColSelector, colSelectorValue_1, colLabel_1, displayColumns, validRowIndices, filterRefResult, filterComparisonValue_1, normalizedFilterColName_1, filterColInCols, filterColInRows, filterColIndex_1, dataColIndexForFilter_1, results, refResult, targetValue, normalizedColSelector_1, colSelectorInCols_1, colSelectorInRows_1, finalColIndex_1, dataColIndex_1, foundRowIndex, _i, validRowIndices_1, rIdx, potentialVal, _loop_1, _a, displayColumns_1, fixedRowValue, resultText_1, resultValues_1, humanText_1, targetColIndex, comparisonColName, normalizedComparisonCol_1, colSelectorInCols_2, colSelectorInRows_2, colSelectorIndex, dataColIndex_2, foundRowIndex, _b, validRowIndices_2, rIdx, cellValue, _loop_2, _c, displayColumns_2, fixedColValue, hasOperatorConfig, isNumericSourceWithoutOperator, optionLabel, match, foundRowIndex, _loop_3, _d, displayColumns_3, fixedColValue, _loop_4, _e, displayColumns_4, fixedRowValue, resultText, resultValues, humanText_2, rowSelectorValue_1, rowLabel_1, displayRows, results, refResult, targetValue, normalizedRowSelector_1, rowSelectorInRows_1, rowSelectorInCols_1, finalRowIndex_1, dataRowIndex_1, foundColIndex, cIdx, valueAt, _loop_5, _f, displayRows_1, fixedColValue, resultText_2, resultValues_2, humanText_3, targetRowIndex, comparisonRowName, normalizedComparisonRow_1, rowSelectorInRows_2, rowSelectorInCols_2, rowSelectorIndex, foundColIndex, cIdx, cellValue, dataColIndexForFound, _loop_6, _g, displayRows_2, fixedRowValue, hasRowOperatorConfig, isRowNumericSource, optionLabel, match, foundRowIndex, _loop_7, _h, displayRows_3, fixedColValue, resultText_3, resultValues_3, humanText_4, _loop_8, _j, displayRows_4, fixedColValue, resultText, resultValues, humanText_5, rowSelectorValue, colSelectorValue, rowLabel, colLabel, rowSourceType, colSourceType, normalizedRowSelector, normalizedColSelector, rowSelectorInRows, rowSelectorInCols, colSelectorInRows, colSelectorInCols, rowMatch, columnIndices, colMatch, columnIndices, colMatch, rowMatch, finalRowIndex, finalColIndex, actualRowValue, actualColValue, dataRowIndex, dataColIndex, result, humanText;
        var _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
        return __generator(this, function (_z) {
            switch (_z.label) {
                case 0:
                    console.log("[TABLE] \uD83D\uDCCA D\u00E9but interpr\u00E9tation table: ".concat(tableId));
                    cleanId = tableId.replace('@table.', '').replace('node-table:', '');
                    return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findUnique({
                            where: { id: cleanId },
                            select: {
                                id: true,
                                name: true,
                                type: true,
                                rowCount: true,
                                columnCount: true,
                                meta: true,
                                nodeId: true,
                                tableColumns: {
                                    orderBy: { columnIndex: 'asc' },
                                    select: {
                                        id: true,
                                        columnIndex: true,
                                        name: true,
                                        type: true,
                                        width: true,
                                        format: true,
                                        metadata: true
                                    }
                                },
                                tableRows: {
                                    orderBy: { rowIndex: 'asc' },
                                    select: {
                                        id: true,
                                        rowIndex: true,
                                        cells: true
                                    }
                                }
                            }
                        })];
                case 1:
                    table = _z.sent();
                    if (!!table) return [3 /*break*/, 5];
                    console.log("[TABLE] \uD83D\uDD0D Table introuvable par ID, tentative r\u00E9solution par nodeId: ".concat(cleanId));
                    _z.label = 2;
                case 2:
                    _z.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findFirst({
                            where: { nodeId: cleanId },
                            select: {
                                id: true,
                                name: true,
                                type: true,
                                rowCount: true,
                                columnCount: true,
                                meta: true,
                                nodeId: true,
                                tableColumns: {
                                    orderBy: { columnIndex: 'asc' },
                                    select: { id: true, columnIndex: true, name: true, type: true, width: true, format: true, metadata: true }
                                },
                                tableRows: {
                                    orderBy: { rowIndex: 'asc' },
                                    select: { id: true, rowIndex: true, cells: true }
                                }
                            },
                            orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }]
                        })];
                case 3:
                    byNode = _z.sent();
                    console.log("[TABLE] \uD83D\uDD0D R\u00E9sultat findFirst par nodeId:", byNode ? "TROUV\u00C9 id=".concat(byNode.id) : 'NULL');
                    if (byNode) {
                        table = byNode;
                        console.log("[TABLE] \u2705 Table r\u00E9solue via nodeId \u2192 table:".concat(table.id));
                    }
                    else {
                        console.log("[TABLE] \u26A0\uFE0F Aucune table avec nodeId=\"".concat(cleanId, "\" trouv\u00E9e"));
                    }
                    return [3 /*break*/, 5];
                case 4:
                    e_2 = _z.sent();
                    console.warn('[TABLE] ⚠️ Résolution implicite échouée:', e_2 instanceof Error ? e_2.message : e_2);
                    return [3 /*break*/, 5];
                case 5:
                    if (!table) {
                        console.error("[TABLE] \u274C Table introuvable: ".concat(tableId));
                        return [2 /*return*/, {
                                result: '∅',
                                humanText: "Table introuvable: ".concat(tableId),
                                details: { type: 'table', error: 'Not found' }
                            }];
                    }
                    console.log("[TABLE] \u2705 Table trouv\u00E9e: ".concat(table.name, " (type: ").concat(table.type, ")"));
                    columns = table.tableColumns.map(function (col) { return col.name; });
                    rows = [];
                    data = [];
                    // 🔄 Parser cells avec support hybride (JSON array OU plain string)
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
                            // ⚠️ IMPORTANT: IGNORER rowIndex=0 car c'est la ligne HEADER (noms de colonnes)
                            // Dans le nouveau système normalisé, rowIndex=0 contient ["Orientation", "0°", "5°", ...]
                            // qui sont déjà extraits dans tableColumns
                            if (row.rowIndex === 0) {
                                console.log("[TABLE] \uD83D\uDD0D Header row d\u00E9tect\u00E9 (rowIndex=0), ignor\u00E9. Cells:", JSON.stringify(cellsData).substring(0, 100));
                                return; // Skip cette ligne
                            }
                            if (Array.isArray(cellsData) && cellsData.length > 0) {
                                // 🔑 cellsData[0] = label de ligne (colonne A) : "Nord", "Sud", etc.
                                // 📊 cellsData[1...] = données (colonnes B, C, D...) : [86, 82, 73, ...]
                                var rowLabel_2 = String(cellsData[0] || '');
                                var rowData = cellsData.slice(1); // Données sans le label
                                rows.push(rowLabel_2);
                                data.push(rowData);
                            }
                            else {
                                rows.push("Row ".concat(row.rowIndex));
                                data.push([]);
                            }
                        }
                        catch (error) {
                            console.error('[TABLE] ⚠️ Erreur parsing cells:', error);
                            rows.push("Row ".concat(row.rowIndex));
                            data.push([]);
                        }
                    });
                    meta = table.meta;
                    lookup = meta === null || meta === void 0 ? void 0 : meta.lookup;
                    isLookupActive = lookup && (lookup.enabled === true || lookup.columnLookupEnabled === true || lookup.rowLookupEnabled === true);
                    if (!isLookupActive) {
                        console.error("[TABLE] \u274C Lookup non configur\u00E9 ou d\u00E9sactiv\u00E9");
                        return [2 /*return*/, {
                                result: '∅',
                                humanText: "Lookup non configur\u00E9 pour table ".concat(table.name),
                                details: { type: 'table', error: 'Lookup not enabled' }
                            }];
                    }
                    rowFieldId = (_k = lookup.selectors) === null || _k === void 0 ? void 0 : _k.rowFieldId;
                    colFieldId = (_l = lookup.selectors) === null || _l === void 0 ? void 0 : _l.columnFieldId;
                    rowEnabled = lookup.rowLookupEnabled === true;
                    colEnabled = lookup.columnLookupEnabled === true;
                    rowSourceOption = lookup.rowSourceOption;
                    colSourceOption = lookup.columnSourceOption;
                    hasRowSelector = Boolean(rowFieldId || (rowSourceOption && rowSourceOption.type && rowSourceOption.type !== 'select'));
                    hasColSelector = Boolean(colFieldId || (colSourceOption && colSourceOption.type && colSourceOption.type !== 'select'));
                    if (!(rowEnabled && colEnabled && hasRowSelector && hasColSelector)) return [3 /*break*/, 6];
                    console.log("[TABLE] \uD83C\uDFAF MODE 3 d\u00E9tect\u00E9: Croisement dynamique COLONNE \u00D7 LIGNE");
                    return [3 /*break*/, 19];
                case 6:
                    if (!(colEnabled && (colFieldId || colSourceOption) && lookup.displayColumn && !(rowEnabled && colEnabled && hasRowSelector && hasColSelector))) return [3 /*break*/, 13];
                    console.log("[TABLE] \uD83C\uDFAF MODE 1 d\u00E9tect\u00E9: COLONNE \u00D7 displayColumn fixe (rowEnabled=".concat(rowEnabled, ", rowFieldId=").concat(rowFieldId, ")"));
                    return [4 /*yield*/, getSourceValue(colSourceOption, lookup, colFieldId, submissionId, prisma, valuesCache, depth, valueMap, labelMap)];
                case 7:
                    colSelectorValue_1 = _z.sent();
                    return [4 /*yield*/, getSourceLabel(colSourceOption, lookup, colFieldId, prisma, labelMap)];
                case 8:
                    colLabel_1 = _z.sent();
                    displayColumns = Array.isArray(lookup.displayColumn)
                        ? lookup.displayColumn
                        : [lookup.displayColumn];
                    if (!colSelectorValue_1) {
                        return [2 /*return*/, {
                                result: '∅',
                                humanText: "Table \"".concat(table.name, "\" - Aucune s\u00E9lection colonne"),
                                details: { type: 'table', mode: 1, error: 'No column selection' }
                            }];
                    }
                    validRowIndices = Array.from({ length: rows.length }, function (_, i) { return i; });
                    if (!((colSourceOption === null || colSourceOption === void 0 ? void 0 : colSourceOption.filterColumn) && (colSourceOption === null || colSourceOption === void 0 ? void 0 : colSourceOption.filterOperator) && (colSourceOption === null || colSourceOption === void 0 ? void 0 : colSourceOption.filterValueRef))) return [3 /*break*/, 10];
                    console.log("[TABLE] \uD83D\uDD25 \u00C9TAPE 2.5 - Filtrage d\u00E9tect\u00E9: colonne=\"".concat(colSourceOption.filterColumn, "\", op=\"").concat(colSourceOption.filterOperator, "\", ref=\"").concat(colSourceOption.filterValueRef, "\""));
                    return [4 /*yield*/, interpretReference(colSourceOption.filterValueRef, submissionId, prisma, valuesCache, depth + 1, valueMap, labelMap)];
                case 9:
                    filterRefResult = _z.sent();
                    filterComparisonValue_1 = filterRefResult.result;
                    console.log("[TABLE] \uD83D\uDD25 \u00C9TAPE 2.5 - Valeur de comparaison: \"".concat(colSourceOption.filterValueRef, "\" \u2192 ").concat(filterComparisonValue_1));
                    normalizedFilterColName_1 = String(colSourceOption.filterColumn).trim().toLowerCase();
                    filterColInCols = columns.findIndex(function (c) { return String(c).trim().toLowerCase() === normalizedFilterColName_1; });
                    filterColInRows = rows.findIndex(function (r) { return String(r).trim().toLowerCase() === normalizedFilterColName_1; });
                    filterColIndex_1 = -1;
                    if (filterColInCols !== -1)
                        filterColIndex_1 = filterColInCols;
                    else if (filterColInRows !== -1)
                        filterColIndex_1 = filterColInRows;
                    if (filterColIndex_1 !== -1) {
                        dataColIndexForFilter_1 = filterColIndex_1 - 1;
                        validRowIndices = validRowIndices.filter(function (rowIdx) {
                            var _a;
                            // Récupérer la valeur de la cellule à filtrer
                            var cellValue = filterColIndex_1 === 0 ? rows[rowIdx] : (_a = data[rowIdx]) === null || _a === void 0 ? void 0 : _a[dataColIndexForFilter_1];
                            // Appliquer l'opérateur de comparaison
                            var matches = compareValuesByOperator(colSourceOption.filterOperator, cellValue, filterComparisonValue_1);
                            if (matches) {
                                console.log("[TABLE] \u2705 \u00C9TAPE 2.5 - Ligne ".concat(rowIdx, " (\"").concat(rows[rowIdx], "\"): ").concat(cellValue, " ").concat(colSourceOption.filterOperator, " ").concat(filterComparisonValue_1, " = TRUE"));
                            }
                            else {
                                console.log("[TABLE] \u274C \u00C9TAPE 2.5 - Ligne ".concat(rowIdx, " (\"").concat(rows[rowIdx], "\"): ").concat(cellValue, " ").concat(colSourceOption.filterOperator, " ").concat(filterComparisonValue_1, " = FALSE (EXCLUE)"));
                            }
                            return matches;
                        });
                        console.log("[TABLE] \uD83D\uDD25 \u00C9TAPE 2.5 - R\u00E9sultat du filtrage: ".concat(validRowIndices.length, " lignes sur ").concat(rows.length, " conserv\u00E9es"));
                    }
                    else {
                        console.warn("[TABLE] \u26A0\uFE0F \u00C9TAPE 2.5 - Colonne de filtrage non trouv\u00E9e: \"".concat(colSourceOption.filterColumn, "\""));
                    }
                    _z.label = 10;
                case 10:
                    results = [];
                    if (!lookup.extractValueRef) return [3 /*break*/, 12];
                    console.log("[TABLE] \uD83D\uDD0E MODE 1 - extractValueRef d\u00E9tect\u00E9: ".concat(lookup.extractValueRef, ", op=").concat(lookup.extractOperator));
                    return [4 /*yield*/, interpretReference(lookup.extractValueRef, submissionId, prisma, valuesCache, depth + 1, valueMap, labelMap)];
                case 11:
                    refResult = _z.sent();
                    targetValue = refResult.result;
                    normalizedColSelector_1 = String(colSelectorValue_1 || '').trim().toLowerCase();
                    colSelectorInCols_1 = columns.findIndex(function (c) { return String(c).trim().toLowerCase() === normalizedColSelector_1; });
                    colSelectorInRows_1 = rows.findIndex(function (r) { return String(r).trim().toLowerCase() === normalizedColSelector_1; });
                    finalColIndex_1 = -1;
                    if (colSelectorInCols_1 !== -1)
                        finalColIndex_1 = colSelectorInCols_1;
                    else
                        finalColIndex_1 = colSelectorInRows_1;
                    if (finalColIndex_1 === -1) {
                        console.warn("[TABLE] \u26A0\uFE0F MODE 1 extract - colonne non trouv\u00E9e pour selector ".concat(colSelectorValue_1));
                    }
                    else {
                        dataColIndex_1 = finalColIndex_1 - 1;
                        foundRowIndex = -1;
                        for (_i = 0, validRowIndices_1 = validRowIndices; _i < validRowIndices_1.length; _i++) {
                            rIdx = validRowIndices_1[_i];
                            potentialVal = (_m = data[rIdx]) === null || _m === void 0 ? void 0 : _m[dataColIndex_1];
                            if (compareValuesByOperator(lookup.extractOperator, potentialVal, targetValue)) {
                                foundRowIndex = rIdx;
                                break;
                            }
                        }
                        if (foundRowIndex !== -1) {
                            _loop_1 = function (fixedRowValue) {
                                var normalizedFixedRow = String(fixedRowValue).trim().toLowerCase();
                                var fixedRowInRows = rows.findIndex(function (r) { return String(r).trim().toLowerCase() === normalizedFixedRow; });
                                var fixedRowInCols = columns.findIndex(function (c) { return String(c).trim().toLowerCase() === normalizedFixedRow; });
                                var rowIndex = -1;
                                if (fixedRowInRows !== -1)
                                    rowIndex = fixedRowInRows;
                                else if (fixedRowInCols !== -1)
                                    rowIndex = fixedRowInCols; // fallback
                                if (rowIndex !== -1) {
                                    var dataRowIndex_2 = rowIndex;
                                    var dataColIndexForDisplay = finalColIndex_1 - 1;
                                    var result_1 = (_o = data[dataRowIndex_2]) === null || _o === void 0 ? void 0 : _o[dataColIndexForDisplay];
                                    results.push({ row: fixedRowValue, value: result_1 });
                                    console.log("[TABLE] \u2705 MODE 1 - extract result ".concat(fixedRowValue, ": ").concat(result_1));
                                }
                            };
                            // Construire results à partir de displayColumns pour la ligne trouvée
                            for (_a = 0, displayColumns_1 = displayColumns; _a < displayColumns_1.length; _a++) {
                                fixedRowValue = displayColumns_1[_a];
                                _loop_1(fixedRowValue);
                            }
                            resultText_1 = results.map(function (r) { return "".concat(r.row, "=").concat(r.value); }).join(', ');
                            resultValues_1 = results.map(function (r) { return r.value; });
                            humanText_1 = "Table \"".concat(table.name, "\"[extract ").concat(lookup.extractValueRef, " ").concat(lookup.extractOperator, " -> row=").concat(rows[foundRowIndex], "] = ").concat(resultText_1);
                            return [2 /*return*/, {
                                    result: resultValues_1.length === 1 ? String(resultValues_1[0]) : JSON.stringify(resultValues_1),
                                    humanText: humanText_1,
                                    details: {
                                        type: 'table',
                                        mode: 1,
                                        tableId: table.id,
                                        tableName: table.name,
                                        lookup: {
                                            column: { field: colLabel_1, value: colSelectorValue_1 },
                                            rows: results,
                                            multiple: results.length > 1,
                                            extract: { ref: lookup.extractValueRef, operator: lookup.extractOperator, target: targetValue }
                                        }
                                    }
                                }];
                        }
                    }
                    _z.label = 12;
                case 12:
                    targetColIndex = -1;
                    if (((colSourceOption === null || colSourceOption === void 0 ? void 0 : colSourceOption.type) === 'field' || (colSourceOption === null || colSourceOption === void 0 ? void 0 : colSourceOption.type) === 'capacity') && (colSourceOption === null || colSourceOption === void 0 ? void 0 : colSourceOption.operator) && (colSourceOption === null || colSourceOption === void 0 ? void 0 : colSourceOption.comparisonColumn)) {
                        console.log("[TABLE] \uD83D\uDD25 MODE 1 - Option ".concat(colSourceOption.type === 'field' ? '2' : '3', " avec op\u00E9rateur: ").concat(colSourceOption.operator, " sur colonne \"").concat(colSourceOption.comparisonColumn, "\""));
                        comparisonColName = colSourceOption.comparisonColumn;
                        normalizedComparisonCol_1 = String(comparisonColName).trim().toLowerCase();
                        colSelectorInCols_2 = columns.findIndex(function (c) { return String(c).trim().toLowerCase() === normalizedComparisonCol_1; });
                        colSelectorInRows_2 = rows.findIndex(function (r) { return String(r).trim().toLowerCase() === normalizedComparisonCol_1; });
                        colSelectorIndex = -1;
                        if (colSelectorInCols_2 !== -1)
                            colSelectorIndex = colSelectorInCols_2;
                        else if (colSelectorInRows_2 !== -1)
                            colSelectorIndex = colSelectorInRows_2;
                        if (colSelectorIndex !== -1) {
                            dataColIndex_2 = colSelectorIndex - 1;
                            foundRowIndex = -1;
                            // 🔥 ÉTAPE 2.5: Boucler SEULEMENT sur les indices filtrés
                            for (_b = 0, validRowIndices_2 = validRowIndices; _b < validRowIndices_2.length; _b++) {
                                rIdx = validRowIndices_2[_b];
                                cellValue = colSelectorIndex === 0 ? rows[rIdx] : (_p = data[rIdx]) === null || _p === void 0 ? void 0 : _p[dataColIndex_2];
                                if (compareValuesByOperator(colSourceOption.operator, cellValue, colSelectorValue_1)) {
                                    foundRowIndex = rIdx;
                                    console.log("[TABLE] \u2705 MODE 1 Option ".concat(colSourceOption.type === 'field' ? '2' : '3', " - Trouv\u00E9 \u00E0 ligne ").concat(rIdx, ": ").concat(cellValue, " ").concat(colSourceOption.operator, " ").concat(colSelectorValue_1));
                                    break;
                                }
                            }
                            if (foundRowIndex !== -1) {
                                _loop_2 = function (fixedColValue) {
                                    var normalizedFixedCol = String(fixedColValue).trim().toLowerCase();
                                    var fixedColInCols = columns.findIndex(function (c) { return String(c).trim().toLowerCase() === normalizedFixedCol; });
                                    var fixedColInRows = rows.findIndex(function (r) { return String(r).trim().toLowerCase() === normalizedFixedCol; });
                                    var colIndexForDisplay = -1;
                                    if (fixedColInCols !== -1)
                                        colIndexForDisplay = fixedColInCols;
                                    else if (fixedColInRows !== -1)
                                        colIndexForDisplay = fixedColInRows;
                                    if (colIndexForDisplay !== -1) {
                                        // Utiliser foundRowIndex (la ligne trouvée par l'opérateur) et colIndexForDisplay
                                        var dataColIndexForDisplay = colIndexForDisplay - 1;
                                        var result_2 = (_q = data[foundRowIndex]) === null || _q === void 0 ? void 0 : _q[dataColIndexForDisplay];
                                        results.push({ row: fixedColValue, value: result_2 });
                                        console.log("[TABLE] \u2705 MODE 1 Option ".concat(colSourceOption.type === 'field' ? '2' : '3', " - R\u00E9sultat ").concat(fixedColValue, ": ").concat(result_2, " (\u00E0 partir de ligne trouv\u00E9e ").concat(foundRowIndex, ")"));
                                    }
                                };
                                // On a trouvé la ligne avec l'opérateur, récupérer la valeur depuis cette ligne pour chaque colonne à afficher
                                for (_c = 0, displayColumns_2 = displayColumns; _c < displayColumns_2.length; _c++) {
                                    fixedColValue = displayColumns_2[_c];
                                    _loop_2(fixedColValue);
                                }
                                targetColIndex = colSelectorIndex; // Marquer qu'on a traité avec l'opérateur
                            }
                        }
                        else {
                            console.warn("[TABLE] \u26A0\uFE0F MODE 1 - Colonne de comparaison non trouv\u00E9e: ".concat(comparisonColName));
                        }
                    }
                    // Boucle sur CHAQUE ligne à afficher (UNIQUEMENT si Option 2 n'a pas trouvé de match)
                    if (targetColIndex === -1) {
                        hasOperatorConfig = Boolean((colSourceOption === null || colSourceOption === void 0 ? void 0 : colSourceOption.operator) && (colSourceOption === null || colSourceOption === void 0 ? void 0 : colSourceOption.comparisonColumn));
                        isNumericSourceWithoutOperator = ((colSourceOption === null || colSourceOption === void 0 ? void 0 : colSourceOption.type) === 'capacity' || (colSourceOption === null || colSourceOption === void 0 ? void 0 : colSourceOption.type) === 'field') && !hasOperatorConfig;
                        if (isNumericSourceWithoutOperator) {
                            optionLabel = (colSourceOption === null || colSourceOption === void 0 ? void 0 : colSourceOption.type) === 'field' ? 'Option 2' : 'Option 3';
                            console.log("[TABLE] \uD83D\uDD25 MODE 1 ".concat(optionLabel, " SANS op\u00E9rateur - Recherche intelligente de ligne pour ").concat(colSelectorValue_1));
                            match = findClosestIndexInLabels(colSelectorValue_1, rows, validRowIndices);
                            if (match) {
                                foundRowIndex = match.index;
                                console.log("[TABLE] \u2705 MODE 1 ".concat(optionLabel, " - Ligne trouv\u00E9e ").concat(foundRowIndex, " (").concat(rows[foundRowIndex], ") via ").concat(match.matchType));
                                _loop_3 = function (fixedColValue) {
                                    var normalizedFixedCol = normalizeLookupValue(fixedColValue);
                                    var fixedColInCols = columns.findIndex(function (c) { return normalizeLookupValue(c) === normalizedFixedCol; });
                                    var fixedColInRows = rows.findIndex(function (r) { return normalizeLookupValue(r) === normalizedFixedCol; });
                                    var colIndexForDisplay = -1;
                                    if (fixedColInCols !== -1)
                                        colIndexForDisplay = fixedColInCols;
                                    else if (fixedColInRows !== -1)
                                        colIndexForDisplay = fixedColInRows;
                                    if (colIndexForDisplay !== -1) {
                                        var dataColIndexForDisplay = colIndexForDisplay - 1;
                                        var result_3 = (_r = data[foundRowIndex]) === null || _r === void 0 ? void 0 : _r[dataColIndexForDisplay];
                                        results.push({ row: fixedColValue, value: result_3 });
                                        console.log("[TABLE] \u2705 MODE 1 ".concat(optionLabel, " - R\u00E9sultat ").concat(fixedColValue, ": ").concat(result_3, " (ligne ").concat(foundRowIndex, ")"));
                                    }
                                };
                                for (_d = 0, displayColumns_3 = displayColumns; _d < displayColumns_3.length; _d++) {
                                    fixedColValue = displayColumns_3[_d];
                                    _loop_3(fixedColValue);
                                }
                                targetColIndex = 0;
                            }
                            else {
                                console.warn("[TABLE] \u26A0\uFE0F MODE 1 ".concat(optionLabel, " - Impossible de trouver une ligne pour ").concat(colSelectorValue_1));
                            }
                        }
                        // Cas standard: Option 1/2 où colSelectorValue est un nom de colonne
                        if (targetColIndex === -1) {
                            _loop_4 = function (fixedRowValue) {
                                // Normalisation pour matching robuste
                                // 🔧 FIX: Enlever le suffixe (-1, -2, etc.) pour les champs copiés dans les repeaters
                                var colSelectorWithoutSuffix = String(colSelectorValue_1).replace(/-\d+$/, '');
                                var normalizedColSelector_2 = colSelectorWithoutSuffix.trim().toLowerCase();
                                var normalizedFixedRow = String(fixedRowValue).trim().toLowerCase();
                                // Chercher dans colonnes ET lignes (auto-détection)
                                var colSelectorInCols_3 = columns.findIndex(function (c) { return String(c).trim().toLowerCase() === normalizedColSelector_2; });
                                var colSelectorInRows_3 = rows.findIndex(function (r) { return String(r).trim().toLowerCase() === normalizedColSelector_2; });
                                var fixedRowInRows = rows.findIndex(function (r) { return String(r).trim().toLowerCase() === normalizedFixedRow; });
                                var fixedRowInCols = columns.findIndex(function (c) { return String(c).trim().toLowerCase() === normalizedFixedRow; });
                                // Déterminer les index finaux (privilégier le matching naturel)
                                var colIndex = -1;
                                var rowIndex = -1;
                                if (colSelectorInCols_3 !== -1 && fixedRowInRows !== -1) {
                                    // Configuration normale
                                    colIndex = colSelectorInCols_3;
                                    rowIndex = fixedRowInRows;
                                }
                                else if (colSelectorInRows_3 !== -1 && fixedRowInCols !== -1) {
                                    // Configuration inversée (auto-correction)
                                    colIndex = fixedRowInCols;
                                    rowIndex = colSelectorInRows_3;
                                    console.log("[TABLE] \uD83D\uDD04 MODE 1 - Inversion d\u00E9tect\u00E9e et corrig\u00E9e pour ".concat(fixedRowValue));
                                }
                                else {
                                    // Matching partiel
                                    colIndex = colSelectorInCols_3 !== -1 ? colSelectorInCols_3 : colSelectorInRows_3;
                                    rowIndex = fixedRowInRows !== -1 ? fixedRowInRows : fixedRowInCols;
                                }
                                if (colIndex !== -1 && rowIndex !== -1) {
                                    // Lookup dans data (avec décalage header)
                                    var dataRowIndex_3 = rowIndex;
                                    var dataColIndex_3 = colIndex - 1;
                                    var result_4 = (_s = data[dataRowIndex_3]) === null || _s === void 0 ? void 0 : _s[dataColIndex_3];
                                    results.push({ row: fixedRowValue, value: result_4 });
                                    console.log("[TABLE] \u2705 MODE 1 - ".concat(fixedRowValue, ": ").concat(result_4));
                                }
                            };
                            for (_e = 0, displayColumns_4 = displayColumns; _e < displayColumns_4.length; _e++) {
                                fixedRowValue = displayColumns_4[_e];
                                _loop_4(fixedRowValue);
                            }
                        }
                    }
                    resultText = results.map(function (r) { return "".concat(r.row, "=").concat(r.value); }).join(', ');
                    resultValues = results.map(function (r) { return r.value; });
                    humanText_2 = "Table \"".concat(table.name, "\"[").concat(colLabel_1, "=").concat(colSelectorValue_1, ", ").concat(displayColumns.join('+'), "(fixes)] = ").concat(resultText);
                    return [2 /*return*/, {
                            result: resultValues.length === 1 ? String(resultValues[0]) : JSON.stringify(resultValues),
                            humanText: humanText_2,
                            details: {
                                type: 'table',
                                mode: 1,
                                tableId: table.id,
                                tableName: table.name,
                                lookup: {
                                    column: { field: colLabel_1, value: colSelectorValue_1 },
                                    rows: results,
                                    multiple: results.length > 1
                                }
                            }
                        }];
                case 13:
                    if (!(rowEnabled && !colEnabled && hasRowSelector && lookup.displayRow)) return [3 /*break*/, 18];
                    console.log("[TABLE] \uD83C\uDFAF MODE 2 d\u00E9tect\u00E9: displayRow fixe \u00D7 LIGNE");
                    return [4 /*yield*/, getSourceValue(rowSourceOption, lookup, rowFieldId, submissionId, prisma, valuesCache, depth, valueMap, labelMap)];
                case 14:
                    rowSelectorValue_1 = _z.sent();
                    return [4 /*yield*/, getSourceLabel(rowSourceOption, lookup, rowFieldId, prisma, labelMap)];
                case 15:
                    rowLabel_1 = _z.sent();
                    displayRows = Array.isArray(lookup.displayRow)
                        ? lookup.displayRow
                        : [lookup.displayRow];
                    console.log("[TABLE] \uD83D\uDCCA MODE 2 - Croisement: ligne=".concat(rowLabel_1, "(").concat(rowSelectorValue_1, ") \u00D7 colonnes=").concat(displayRows.join(', '), " (fixes)"));
                    if (!rowSelectorValue_1) {
                        return [2 /*return*/, {
                                result: '∅',
                                humanText: "Table \"".concat(table.name, "\" - Aucune s\u00E9lection ligne"),
                                details: { type: 'table', mode: 2, error: 'No row selection' }
                            }];
                    }
                    results = [];
                    if (!lookup.extractValueRef) return [3 /*break*/, 17];
                    console.log("[TABLE] \uD83D\uDD0E MODE 2 - extractValueRef detected: ".concat(lookup.extractValueRef, ", op=").concat(lookup.extractOperator));
                    return [4 /*yield*/, interpretReference(lookup.extractValueRef, submissionId, prisma, valuesCache, depth + 1, valueMap, labelMap)];
                case 16:
                    refResult = _z.sent();
                    targetValue = refResult.result;
                    normalizedRowSelector_1 = String(rowSelectorValue_1 || '').trim().toLowerCase();
                    rowSelectorInRows_1 = rows.findIndex(function (r) { return String(r).trim().toLowerCase() === normalizedRowSelector_1; });
                    rowSelectorInCols_1 = columns.findIndex(function (c) { return String(c).trim().toLowerCase() === normalizedRowSelector_1; });
                    finalRowIndex_1 = -1;
                    if (rowSelectorInRows_1 !== -1)
                        finalRowIndex_1 = rowSelectorInRows_1;
                    else
                        finalRowIndex_1 = rowSelectorInCols_1;
                    if (finalRowIndex_1 === -1) {
                        console.warn("[TABLE] \u26A0\uFE0F MODE 2 extract - ligne non trouv\u00E9e pour selector ".concat(rowSelectorValue_1));
                    }
                    else {
                        dataRowIndex_1 = finalRowIndex_1;
                        foundColIndex = -1;
                        for (cIdx = 0; cIdx < columns.length; cIdx++) {
                            valueAt = (_t = data[dataRowIndex_1]) === null || _t === void 0 ? void 0 : _t[cIdx - 1];
                            if (compareValuesByOperator(lookup.extractOperator, valueAt, targetValue)) {
                                foundColIndex = cIdx;
                                break;
                            }
                        }
                        if (foundColIndex !== -1) {
                            _loop_5 = function (fixedColValue) {
                                var normalizedFixedCol = String(fixedColValue).trim().toLowerCase();
                                var fixedColInCols = columns.findIndex(function (c) { return String(c).trim().toLowerCase() === normalizedFixedCol; });
                                var fixedColInRows = rows.findIndex(function (r) { return String(r).trim().toLowerCase() === normalizedFixedCol; });
                                var colIndex = -1;
                                if (fixedColInCols !== -1)
                                    colIndex = fixedColInCols;
                                else if (fixedColInRows !== -1)
                                    colIndex = fixedColInRows; // fallback if reversed
                                if (colIndex !== -1) {
                                    var dataColIndex_4 = colIndex - 1;
                                    var result_5 = (_u = data[dataRowIndex_1]) === null || _u === void 0 ? void 0 : _u[dataColIndex_4];
                                    results.push({ column: fixedColValue, value: result_5 });
                                    console.log("[TABLE] \u2705 MODE 2 - extract result ".concat(fixedColValue, ": ").concat(result_5));
                                }
                            };
                            // now build results: for each fixedColValue, get value from data[dataRowIndex][foundColIndex-1]
                            for (_f = 0, displayRows_1 = displayRows; _f < displayRows_1.length; _f++) {
                                fixedColValue = displayRows_1[_f];
                                _loop_5(fixedColValue);
                            }
                            resultText_2 = results.map(function (r) { return "".concat(r.column, "=").concat(r.value); }).join(', ');
                            resultValues_2 = results.map(function (r) { return r.value; });
                            humanText_3 = "Table \"".concat(table.name, "\"[extract ").concat(lookup.extractValueRef, " ").concat(lookup.extractOperator, " -> col=").concat(columns[foundColIndex], "] = ").concat(resultText_2);
                            return [2 /*return*/, {
                                    result: resultValues_2.length === 1 ? String(resultValues_2[0]) : JSON.stringify(resultValues_2),
                                    humanText: humanText_3,
                                    details: {
                                        type: 'table',
                                        mode: 2,
                                        tableId: table.id,
                                        tableName: table.name,
                                        lookup: {
                                            row: { field: rowLabel_1, value: rowSelectorValue_1 },
                                            columns: results,
                                            multiple: results.length > 1,
                                            extract: { ref: lookup.extractValueRef, operator: lookup.extractOperator, target: targetValue }
                                        }
                                    }
                                }];
                        }
                    }
                    _z.label = 17;
                case 17:
                    targetRowIndex = -1;
                    if (((rowSourceOption === null || rowSourceOption === void 0 ? void 0 : rowSourceOption.type) === 'field' || (rowSourceOption === null || rowSourceOption === void 0 ? void 0 : rowSourceOption.type) === 'capacity') && (rowSourceOption === null || rowSourceOption === void 0 ? void 0 : rowSourceOption.operator) && (rowSourceOption === null || rowSourceOption === void 0 ? void 0 : rowSourceOption.comparisonColumn)) {
                        console.log("[TABLE] \uD83D\uDD25 MODE 2 - Option ".concat(rowSourceOption.type === 'field' ? '2' : '3', " avec op\u00E9rateur: ").concat(rowSourceOption.operator, " sur ligne \"").concat(rowSourceOption.comparisonColumn, "\""));
                        comparisonRowName = rowSourceOption.comparisonColumn;
                        normalizedComparisonRow_1 = String(comparisonRowName).trim().toLowerCase();
                        rowSelectorInRows_2 = rows.findIndex(function (r) { return String(r).trim().toLowerCase() === normalizedComparisonRow_1; });
                        rowSelectorInCols_2 = columns.findIndex(function (c) { return String(c).trim().toLowerCase() === normalizedComparisonRow_1; });
                        rowSelectorIndex = -1;
                        if (rowSelectorInRows_2 !== -1)
                            rowSelectorIndex = rowSelectorInRows_2;
                        else if (rowSelectorInCols_2 !== -1)
                            rowSelectorIndex = rowSelectorInCols_2;
                        if (rowSelectorIndex !== -1) {
                            foundColIndex = -1;
                            for (cIdx = 0; cIdx < columns.length; cIdx++) {
                                cellValue = rowSelectorIndex === 0 ? columns[cIdx] : (_v = data[rowSelectorIndex - 1]) === null || _v === void 0 ? void 0 : _v[cIdx - 1];
                                if (compareValuesByOperator(rowSourceOption.operator, cellValue, rowSelectorValue_1)) {
                                    foundColIndex = cIdx;
                                    console.log("[TABLE] \u2705 MODE 2 Option ".concat(rowSourceOption.type === 'field' ? '2' : '3', " - Trouv\u00E9 \u00E0 colonne ").concat(cIdx, ": ").concat(cellValue, " ").concat(rowSourceOption.operator, " ").concat(rowSelectorValue_1));
                                    break;
                                }
                            }
                            if (foundColIndex !== -1) {
                                dataColIndexForFound = foundColIndex - 1;
                                _loop_6 = function (fixedRowValue) {
                                    var normalizedFixedRow = String(fixedRowValue).trim().toLowerCase();
                                    var fixedRowInRows = rows.findIndex(function (r) { return String(r).trim().toLowerCase() === normalizedFixedRow; });
                                    var fixedRowInCols = columns.findIndex(function (c) { return String(c).trim().toLowerCase() === normalizedFixedRow; });
                                    var rowIndexForDisplay = -1;
                                    if (fixedRowInRows !== -1)
                                        rowIndexForDisplay = fixedRowInRows;
                                    else if (fixedRowInCols !== -1)
                                        rowIndexForDisplay = fixedRowInCols;
                                    if (rowIndexForDisplay !== -1) {
                                        // Utiliser rowIndexForDisplay (la ligne à afficher) et la colonne trouvée par l'opérateur
                                        // 🔥 FIX: Gérer le cas où rowIndexForDisplay === 0
                                        var result_6 = rowIndexForDisplay === 0 ? columns[foundColIndex] : (_w = data[rowIndexForDisplay - 1]) === null || _w === void 0 ? void 0 : _w[dataColIndexForFound];
                                        results.push({ column: fixedRowValue, value: result_6 });
                                        console.log("[TABLE] \u2705 MODE 2 Option ".concat(rowSourceOption.type === 'field' ? '2' : '3', " - R\u00E9sultat ").concat(fixedRowValue, ": ").concat(result_6, " (depuis colonne trouv\u00E9e ").concat(foundColIndex, ")"));
                                    }
                                };
                                for (_g = 0, displayRows_2 = displayRows; _g < displayRows_2.length; _g++) {
                                    fixedRowValue = displayRows_2[_g];
                                    _loop_6(fixedRowValue);
                                }
                                targetRowIndex = rowSelectorIndex; // Marquer qu'on a traité avec l'opérateur
                            }
                        }
                        else {
                            console.warn("[TABLE] \u26A0\uFE0F MODE 2 - Ligne de comparaison non trouv\u00E9e: ".concat(comparisonRowName));
                        }
                    }
                    // Boucle sur CHAQUE colonne à afficher (UNIQUEMENT si Option 2 n'a pas trouvé de match)
                    if (targetRowIndex === -1) {
                        hasRowOperatorConfig = Boolean((rowSourceOption === null || rowSourceOption === void 0 ? void 0 : rowSourceOption.operator) && (rowSourceOption === null || rowSourceOption === void 0 ? void 0 : rowSourceOption.comparisonColumn));
                        isRowNumericSource = ((rowSourceOption === null || rowSourceOption === void 0 ? void 0 : rowSourceOption.type) === 'field' || (rowSourceOption === null || rowSourceOption === void 0 ? void 0 : rowSourceOption.type) === 'capacity') && !hasRowOperatorConfig;
                        if (isRowNumericSource) {
                            optionLabel = (rowSourceOption === null || rowSourceOption === void 0 ? void 0 : rowSourceOption.type) === 'field' ? 'Option 2' : 'Option 3';
                            console.log("[TABLE] \uD83D\uDD25 MODE 2 ".concat(optionLabel, " SANS op\u00E9rateur - Recherche intelligente de colonne pour ").concat(rowSelectorValue_1));
                            match = findClosestIndexInLabels(rowSelectorValue_1, rows);
                            if (match) {
                                foundRowIndex = match.index;
                                console.log("[TABLE] \u2705 MODE 2 ".concat(optionLabel, " - Ligne trouv\u00E9e ").concat(foundRowIndex, " (").concat(rows[foundRowIndex], ") via ").concat(match.matchType));
                                _loop_7 = function (fixedColValue) {
                                    var normalizedFixedCol = normalizeLookupValue(fixedColValue);
                                    var fixedColInCols = columns.findIndex(function (c) { return normalizeLookupValue(c) === normalizedFixedCol; });
                                    var fixedColInRows = rows.findIndex(function (r) { return normalizeLookupValue(r) === normalizedFixedCol; });
                                    var colIndexForDisplay = -1;
                                    if (fixedColInCols !== -1)
                                        colIndexForDisplay = fixedColInCols;
                                    else if (fixedColInRows !== -1)
                                        colIndexForDisplay = fixedColInRows;
                                    if (colIndexForDisplay !== -1) {
                                        var dataColIndexForDisplay = colIndexForDisplay - 1;
                                        var result_7 = (_x = data[foundRowIndex]) === null || _x === void 0 ? void 0 : _x[dataColIndexForDisplay];
                                        results.push({ column: fixedColValue, value: result_7 });
                                        console.log("[TABLE] \u2705 MODE 2 ".concat(optionLabel, " - R\u00E9sultat ").concat(fixedColValue, ": ").concat(result_7, " (ligne ").concat(foundRowIndex, ")"));
                                    }
                                };
                                for (_h = 0, displayRows_3 = displayRows; _h < displayRows_3.length; _h++) {
                                    fixedColValue = displayRows_3[_h];
                                    _loop_7(fixedColValue);
                                }
                                resultText_3 = results.map(function (r) { return "".concat(r.column, "=").concat(r.value); }).join(', ');
                                resultValues_3 = results.map(function (r) { return r.value; });
                                humanText_4 = "Table \"".concat(table.name, "\"[").concat(rowLabel_1, "=").concat(rowSelectorValue_1, ", ").concat(displayRows.join('+'), "(fixes)] = ").concat(resultText_3);
                                return [2 /*return*/, {
                                        result: resultValues_3.length === 1 ? String(resultValues_3[0]) : JSON.stringify(resultValues_3),
                                        humanText: humanText_4,
                                        details: {
                                            type: 'table',
                                            mode: 2,
                                            tableId: table.id,
                                            tableName: table.name,
                                            lookup: {
                                                row: { field: rowLabel_1, value: rowSelectorValue_1 },
                                                columns: results,
                                                multiple: results.length > 1
                                            }
                                        }
                                    }];
                            }
                            else {
                                console.warn("[TABLE] \u26A0\uFE0F MODE 2 ".concat(optionLabel, " - Impossible de trouver une ligne pour ").concat(rowSelectorValue_1));
                            }
                        }
                        _loop_8 = function (fixedColValue) {
                            // Normalisation
                            var normalizedRowSelector_2 = String(rowSelectorValue_1).trim().toLowerCase();
                            var normalizedFixedCol = String(fixedColValue).trim().toLowerCase();
                            // Chercher dans colonnes ET lignes (auto-détection)
                            var rowSelectorInRows_3 = rows.findIndex(function (r) { return String(r).trim().toLowerCase() === normalizedRowSelector_2; });
                            var rowSelectorInCols_3 = columns.findIndex(function (c) { return String(c).trim().toLowerCase() === normalizedRowSelector_2; });
                            var fixedColInCols = columns.findIndex(function (c) { return String(c).trim().toLowerCase() === normalizedFixedCol; });
                            var fixedColInRows = rows.findIndex(function (r) { return String(r).trim().toLowerCase() === normalizedFixedCol; });
                            // Déterminer les index finaux (privilégier le matching naturel)
                            var rowIndex = -1;
                            var colIndex = -1;
                            if (rowSelectorInRows_3 !== -1 && fixedColInCols !== -1) {
                                // Configuration normale
                                rowIndex = rowSelectorInRows_3;
                                colIndex = fixedColInCols;
                            }
                            else if (rowSelectorInCols_3 !== -1 && fixedColInRows !== -1) {
                                // Configuration inversée (auto-correction)
                                rowIndex = fixedColInRows;
                                colIndex = rowSelectorInCols_3;
                                console.log("[TABLE] \uD83D\uDD04 MODE 2 - Inversion d\u00E9tect\u00E9e et corrig\u00E9e pour ".concat(fixedColValue));
                            }
                            else {
                                // Matching partiel
                                rowIndex = rowSelectorInRows_3 !== -1 ? rowSelectorInRows_3 : rowSelectorInCols_3;
                                colIndex = fixedColInCols !== -1 ? fixedColInCols : fixedColInRows;
                            }
                            if (rowIndex !== -1 && colIndex !== -1) {
                                // Lookup dans data
                                var dataRowIndex_4 = rowIndex;
                                var dataColIndex_5 = colIndex - 1;
                                var result_8 = (_y = data[dataRowIndex_4]) === null || _y === void 0 ? void 0 : _y[dataColIndex_5];
                                results.push({ column: fixedColValue, value: result_8 });
                                console.log("[TABLE] \u2705 MODE 2 - ".concat(fixedColValue, ": ").concat(result_8));
                            }
                        };
                        for (_j = 0, displayRows_4 = displayRows; _j < displayRows_4.length; _j++) {
                            fixedColValue = displayRows_4[_j];
                            _loop_8(fixedColValue);
                        }
                    }
                    resultText = results.map(function (r) { return "".concat(r.column, "=").concat(r.value); }).join(', ');
                    resultValues = results.map(function (r) { return r.value; });
                    humanText_5 = "Table \"".concat(table.name, "\"[").concat(rowLabel_1, "=").concat(rowSelectorValue_1, ", ").concat(displayRows.join('+'), "(fixes)] = ").concat(resultText);
                    return [2 /*return*/, {
                            result: resultValues.length === 1 ? String(resultValues[0]) : JSON.stringify(resultValues),
                            humanText: humanText_5,
                            details: {
                                type: 'table',
                                mode: 2,
                                tableId: table.id,
                                tableName: table.name,
                                lookup: {
                                    row: { field: rowLabel_1, value: rowSelectorValue_1 },
                                    columns: results,
                                    multiple: results.length > 1
                                }
                            }
                        }];
                case 18:
                    console.error("[TABLE] \u274C Configuration lookup invalide");
                    return [2 /*return*/, {
                            result: '∅',
                            humanText: "Configuration lookup invalide pour table ".concat(table.name),
                            details: { type: 'table', error: 'Invalid configuration' }
                        }];
                case 19:
                    // ═══════════════════════════════════════════════════════════════════════
                    // 📊 MODE 3 : Code existant (croisement dynamique colonne × ligne)
                    // Ce code s'exécute SEULEMENT si on est en MODE 3
                    // ═══════════════════════════════════════════════════════════════════════
                    console.log("[TABLE] \uD83D\uDCCB Selectors MODE 3: row=".concat(rowFieldId, ", col=").concat(colFieldId));
                    return [4 /*yield*/, getSourceValue(rowSourceOption, lookup, rowFieldId, submissionId, prisma, valuesCache, depth, valueMap, labelMap)];
                case 20:
                    rowSelectorValue = _z.sent();
                    return [4 /*yield*/, getSourceValue(colSourceOption, lookup, colFieldId, submissionId, prisma, valuesCache, depth, valueMap, labelMap)];
                case 21:
                    colSelectorValue = _z.sent();
                    return [4 /*yield*/, getSourceLabel(rowSourceOption, lookup, rowFieldId, prisma, labelMap)];
                case 22:
                    rowLabel = _z.sent();
                    return [4 /*yield*/, getSourceLabel(colSourceOption, lookup, colFieldId, prisma, labelMap)];
                case 23:
                    colLabel = _z.sent();
                    rowSourceType = (rowSourceOption === null || rowSourceOption === void 0 ? void 0 : rowSourceOption.type) || (rowFieldId ? 'select' : undefined);
                    colSourceType = (colSourceOption === null || colSourceOption === void 0 ? void 0 : colSourceOption.type) || (colFieldId ? 'select' : undefined);
                    console.log("[TABLE] \uD83D\uDCCA Valeurs s\u00E9lectionn\u00E9es: row=".concat(rowLabel, "(").concat(rowSelectorValue, "), col=").concat(colLabel, "(").concat(colSelectorValue, ")"));
                    if (!rowSelectorValue || !colSelectorValue) {
                        return [2 /*return*/, {
                                result: '∅',
                                humanText: "Table \"".concat(table.name, "\"[").concat(rowLabel, "(").concat(rowSelectorValue || '?', "), ").concat(colLabel, "(").concat(colSelectorValue || '?', ")] = aucune s\u00E9lection"),
                                details: { type: 'table', error: 'Missing selection' }
                            }];
                    }
                    // ═══════════════════════════════════════════════════════════════════════
                    // 🎯 ÉTAPE 5 : Trouver les index dans rows[] et columns[]
                    // � AUTO-DÉTECTION : On cherche chaque valeur dans rows ET columns pour déterminer
                    //    automatiquement où elle se trouve (inversion automatique si nécessaire)
                    // ═══════════════════════════════════════════════════════════════════════
                    // columns, rows, data déjà reconstruits plus haut
                    // �🐛 DEBUG : Afficher toutes les valeurs AVANT la normalisation
                    console.log("[TABLE] \uD83D\uDD0D DEBUG rowSelectorValue:", {
                        raw: rowSelectorValue,
                        type: typeof rowSelectorValue,
                        stringified: JSON.stringify(rowSelectorValue),
                        asString: String(rowSelectorValue),
                        length: String(rowSelectorValue).length
                    });
                    console.log("[TABLE] \uD83D\uDD0D DEBUG colSelectorValue:", {
                        raw: colSelectorValue,
                        type: typeof colSelectorValue,
                        stringified: JSON.stringify(colSelectorValue),
                        asString: String(colSelectorValue),
                        length: String(colSelectorValue).length
                    });
                    normalizedRowSelector = String(rowSelectorValue).trim().toLowerCase();
                    normalizedColSelector = String(colSelectorValue).trim().toLowerCase();
                    console.log("[TABLE] \uD83D\uDD0D Recherche normalis\u00E9e:", {
                        normalizedRowSelector: normalizedRowSelector,
                        normalizedColSelector: normalizedColSelector
                    });
                    rowSelectorInRows = rows.findIndex(function (r) { return String(r).trim().toLowerCase() === normalizedRowSelector; });
                    rowSelectorInCols = columns.findIndex(function (c) { return String(c).trim().toLowerCase() === normalizedRowSelector; });
                    colSelectorInRows = rows.findIndex(function (r) { return String(r).trim().toLowerCase() === normalizedColSelector; });
                    colSelectorInCols = columns.findIndex(function (c) { return String(c).trim().toLowerCase() === normalizedColSelector; });
                    if (rowSelectorInRows === -1 && rowSelectorInCols === -1 && (rowSourceType === 'field' || rowSourceType === 'capacity')) {
                        rowMatch = findClosestIndexInLabels(rowSelectorValue, rows);
                        if (rowMatch) {
                            rowSelectorInRows = rowMatch.index;
                            rowSelectorValue = String(rows[rowMatch.index]);
                        }
                        else {
                            columnIndices = columns.map(function (_, idx) { return idx; }).filter(function (idx) { return idx > 0; });
                            colMatch = findClosestIndexInLabels(rowSelectorValue, columns, columnIndices);
                            if (colMatch) {
                                rowSelectorInCols = colMatch.index;
                                rowSelectorValue = String(columns[colMatch.index]);
                            }
                        }
                    }
                    if (colSelectorInCols === -1 && colSelectorInRows === -1 && (colSourceType === 'field' || colSourceType === 'capacity')) {
                        columnIndices = columns.map(function (_, idx) { return idx; }).filter(function (idx) { return idx > 0; });
                        colMatch = findClosestIndexInLabels(colSelectorValue, columns, columnIndices);
                        if (colMatch) {
                            colSelectorInCols = colMatch.index;
                            colSelectorValue = String(columns[colMatch.index]);
                        }
                        else {
                            rowMatch = findClosestIndexInLabels(colSelectorValue, rows);
                            if (rowMatch) {
                                colSelectorInRows = rowMatch.index;
                                colSelectorValue = String(rows[rowMatch.index]);
                            }
                        }
                    }
                    console.log("[TABLE] \uD83D\uDD0D Auto-d\u00E9tection positions:", {
                        rowSelector: { value: rowSelectorValue, inRows: rowSelectorInRows, inCols: rowSelectorInCols },
                        colSelector: { value: colSelectorValue, inRows: colSelectorInRows, inCols: colSelectorInCols }
                    });
                    finalRowIndex = -1;
                    finalColIndex = -1;
                    actualRowValue = '';
                    actualColValue = '';
                    // Stratégie : Privilégier le matching le plus "naturel"
                    // Si rowSelector est dans rows ET colSelector est dans columns → OK
                    // Si rowSelector est dans columns ET colSelector est dans rows → INVERSION
                    if (rowSelectorInRows !== -1 && colSelectorInCols !== -1) {
                        // ✅ CAS NORMAL : pas d'inversion
                        finalRowIndex = rowSelectorInRows;
                        finalColIndex = colSelectorInCols;
                        actualRowValue = String(rowSelectorValue);
                        actualColValue = String(colSelectorValue);
                        console.log("[TABLE] \u2705 Configuration normale d\u00E9tect\u00E9e");
                    }
                    else if (rowSelectorInCols !== -1 && colSelectorInRows !== -1) {
                        // 🔄 CAS INVERSÉ : on utilise directement les bons index
                        finalRowIndex = colSelectorInRows;
                        finalColIndex = rowSelectorInCols;
                        actualRowValue = String(colSelectorValue);
                        actualColValue = String(rowSelectorValue);
                        console.log("[TABLE] \uD83D\uDD04 INVERSION D\u00C9TECT\u00C9E ET CORRIG\u00C9E AUTOMATIQUEMENT");
                        console.log("[TABLE] \uD83D\uDD04 rowSelector (".concat(rowSelectorValue, ") \u00E9tait dans columns \u2192 devient colValue"));
                        console.log("[TABLE] \uFFFD colSelector (".concat(colSelectorValue, ") \u00E9tait dans rows \u2192 devient rowValue"));
                    }
                    else {
                        // ❌ Aucun matching trouvé (ou matching partiel)
                        finalRowIndex = rowSelectorInRows !== -1 ? rowSelectorInRows : colSelectorInRows;
                        finalColIndex = rowSelectorInCols !== -1 ? rowSelectorInCols : colSelectorInCols;
                        actualRowValue = String(rowSelectorValue);
                        actualColValue = String(colSelectorValue);
                    }
                    // 🐛 DEBUG : Afficher toutes les lignes/colonnes disponibles
                    console.log("[TABLE] \uD83D\uDCCB Lignes disponibles (".concat(rows.length, "):"), rows.map(function (r, i) { return "[".concat(i, "]\"").concat(r, "\""); }).join(', '));
                    console.log("[TABLE] \uD83D\uDCCB Colonnes disponibles (".concat(columns.length, "):"), columns.map(function (c, i) { return "[".concat(i, "]\"").concat(c, "\""); }).join(', '));
                    console.log("[TABLE] \uD83C\uDFAF Index finaux apr\u00E8s auto-d\u00E9tection: rowIndex=".concat(finalRowIndex, ", colIndex=").concat(finalColIndex));
                    console.log("[TABLE] \uD83C\uDFAF Index finaux apr\u00E8s auto-d\u00E9tection: rowIndex=".concat(finalRowIndex, ", colIndex=").concat(finalColIndex));
                    if (finalRowIndex === -1 || finalColIndex === -1) {
                        console.error("[TABLE] \u274C Valeur introuvable dans rows/columns");
                        return [2 /*return*/, {
                                result: '∅',
                                humanText: "Table \"".concat(table.name, "\"[").concat(actualRowValue, ", ").concat(actualColValue, "] = valeur introuvable"),
                                details: { type: 'table', error: 'Value not found in rows/columns' }
                            }];
                    }
                    dataRowIndex = finalRowIndex;
                    dataColIndex = finalColIndex - 1;
                    console.log("[TABLE] \uD83D\uDCCD Index dans data[][]: [".concat(dataRowIndex, "][").concat(dataColIndex, "] (finalRow=").concat(finalRowIndex, ", finalCol=").concat(finalColIndex, ")"));
                    if (dataRowIndex < 0 || dataColIndex < 0 || !data[dataRowIndex]) {
                        console.error("[TABLE] \u274C Index hors limites");
                        return [2 /*return*/, {
                                result: '∅',
                                humanText: "Table \"".concat(table.name, "\"[").concat(actualRowValue, ", ").concat(actualColValue, "] = hors limites"),
                                details: { type: 'table', error: 'Index out of bounds' }
                            }];
                    }
                    result = data[dataRowIndex][dataColIndex];
                    console.log("[TABLE] \u2705 R\u00E9sultat du lookup: ".concat(result));
                    humanText = "Table \"".concat(table.name, "\"[").concat(rowLabel, "=").concat(actualRowValue, ", ").concat(colLabel, "=").concat(actualColValue, "] = ").concat(result);
                    // ═══════════════════════════════════════════════════════════════════════
                    // 📤 ÉTAPE 8 : Retourner le résultat structuré
                    // ═══════════════════════════════════════════════════════════════════════
                    return [2 /*return*/, {
                            result: String(result),
                            humanText: humanText,
                            details: {
                                type: 'table',
                                tableId: table.id,
                                tableName: table.name,
                                lookup: {
                                    row: {
                                        field: rowLabel,
                                        fieldId: rowFieldId,
                                        value: actualRowValue,
                                        index: finalRowIndex
                                    },
                                    column: {
                                        field: colLabel,
                                        fieldId: colFieldId,
                                        value: actualColValue,
                                        index: finalColIndex
                                    },
                                    result: result
                                }
                            }
                        }];
            }
        });
    });
}
// ═══════════════════════════════════════════════════════════════════════════
// 📝 MODULE 7 : INTERPRÉTATION DES CHAMPS SIMPLES
// ═══════════════════════════════════════════════════════════════════════════
/**
 * 📝 INTERPRÈTE UN CHAMP SIMPLE
 *
 * Cette fonction récupère simplement la valeur d'un champ saisi par l'utilisateur.
 * C'est le cas le plus simple (pas de calcul, juste récupération).
 *
 * @param fieldId - ID du champ
 * @param submissionId - ID de la soumission
 * @param prisma - Instance Prisma Client
 * @returns Résultat interprété
 */
function interpretField(fieldId, submissionId, prisma, valueMap, labelMap) {
    return __awaiter(this, void 0, void 0, function () {
        var node, value, label, humanText;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("[CHAMP] \uD83D\uDCDD D\u00E9but interpr\u00E9tation champ: ".concat(fieldId));
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                            where: { id: fieldId },
                            select: { type: true, label: true }
                        })];
                case 1:
                    node = _a.sent();
                    console.log("[CHAMP] \uD83D\uDD0D N\u0153ud trouv\u00E9: ".concat(node ? "type=".concat(node.type, ", label=").concat(node.label) : 'INTROUVABLE'));
                    if (!(node && node.type)) return [3 /*break*/, 5];
                    if (!node.type.startsWith('leaf_table_')) return [3 /*break*/, 3];
                    console.log("[CHAMP] \u2705 REDIRECTION - Le n\u0153ud est une TABLE (type: ".concat(node.type, ")"));
                    return [4 /*yield*/, interpretTable(fieldId, submissionId, prisma, new Map(), 0, valueMap, labelMap)];
                case 2: return [2 /*return*/, _a.sent()];
                case 3:
                    if (!node.type.includes('table')) return [3 /*break*/, 5];
                    console.log("[CHAMP] \u2705 REDIRECTION - Le n\u0153ud contient 'table' dans son type (type: ".concat(node.type, ")"));
                    return [4 /*yield*/, interpretTable(fieldId, submissionId, prisma, new Map(), 0, valueMap, labelMap)];
                case 4: return [2 /*return*/, _a.sent()];
                case 5: return [4 /*yield*/, getNodeValue(fieldId, submissionId, prisma, valueMap)];
                case 6:
                    value = _a.sent();
                    return [4 /*yield*/, getNodeLabel(fieldId, prisma, labelMap)];
                case 7:
                    label = _a.sent();
                    // 📌 NOUVEAU: value ne peut jamais être null/undefined car getNodeValue retourne "0" par défaut
                    console.log("[CHAMP] \uD83D\uDCCA ".concat(label, " = ").concat(value));
                    humanText = "".concat(label, "(").concat(value, ")");
                    return [2 /*return*/, {
                            result: value || '0',
                            humanText: humanText,
                            details: {
                                type: 'field',
                                fieldId: fieldId,
                                label: label,
                                value: value
                            }
                        }];
            }
        });
    });
}
// ═══════════════════════════════════════════════════════════════════════════
// 🚀 MODULE 8 : POINT D'ENTRÉE PRINCIPAL (API)
// ═══════════════════════════════════════════════════════════════════════════
/**
 * 🎯 FONCTION PRINCIPALE : Évalue une variable et toutes ses opérations
 *
 * C'est LA fonction à appeler depuis les routes API pour évaluer une variable.
 * Elle gère automatiquement toute la récursion et retourne un résultat complet.
 *
 * PROCESSUS :
 * -----------
 * 1. 📥 Récupérer la variable depuis TreeBranchLeafNodeVariable
 * 2. 🔍 Vérifier le sourceType (fixed, tree, api, etc.)
 * 3. 🔄 Si tree, interpréter récursivement la sourceRef
 * 4. 📤 Retourner le résultat complet (value, detail, humanText)
 *
 * UTILISATION DANS L'API :
 * ------------------------
 * ```typescript
 * const result = await evaluateVariableOperation(
 *   "10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e",  // nodeId de la variable
 *   "tbl-1759750447813-5n5y6oup4",            // submissionId
 *   prisma
 * );
 *
 * // Stocker dans SubmissionData
 * await prisma.treeBranchLeafSubmissionData.upsert({
 *   where: { submissionId_nodeId: { submissionId, nodeId } },
 *   update: {
 *     value: result.value,
 *     operationDetail: result.operationDetail,
 *     operationResult: result.operationResult
 *   },
 *   create: { ... }
 * });
 * ```
 *
 * @param variableNodeId - ID du nœud variable à évaluer
 * @param submissionId - ID de la soumission en cours
 * @param prisma - Instance Prisma Client
 * @returns Résultat complet avec value, detail et humanText
 *
 * @throws Error si variable introuvable
 */
function evaluateVariableOperation(variableNodeId, submissionId, prisma, valueMap) {
    return __awaiter(this, void 0, void 0, function () {
        var localValueMap, labelMap, variable, valuesCache, result, operationSource, valuesCache, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("\n".concat('═'.repeat(80)));
                    console.log("\uD83C\uDFAF \u00C9VALUATION VARIABLE: ".concat(variableNodeId));
                    console.log("   Submission: ".concat(submissionId));
                    console.log("".concat('═'.repeat(80), "\n"));
                    localValueMap = valueMap || new Map();
                    labelMap = new Map();
                    // Enrichir automatiquement les données depuis la base
                    return [4 /*yield*/, enrichDataFromSubmission(submissionId, prisma, localValueMap, labelMap)];
                case 1:
                    // Enrichir automatiquement les données depuis la base
                    _a.sent();
                    console.log("\u2705 Maps enrichies: ".concat(localValueMap.size, " valeurs, ").concat(labelMap.size, " labels"));
                    return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findUnique({
                            where: { nodeId: variableNodeId },
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
                        })];
                case 2:
                    variable = _a.sent();
                    if (!variable) {
                        console.error("\u274C Variable introuvable: ".concat(variableNodeId));
                        throw new Error("Variable introuvable: ".concat(variableNodeId));
                    }
                    console.log("\u2705 Variable trouv\u00E9e: ".concat(variable.displayName));
                    console.log("   SourceType: ".concat(variable.sourceType));
                    console.log("   SourceRef: ".concat(variable.sourceRef));
                    // ═══════════════════════════════════════════════════════════════════════
                    // 🔍 ÉTAPE 2 : Traiter selon le sourceType
                    // ═══════════════════════════════════════════════════════════════════════
                    // CAS 1 : Valeur fixe
                    if (variable.sourceType === 'fixed' && variable.fixedValue) {
                        console.log("\uD83D\uDCCC Valeur fixe: ".concat(variable.fixedValue));
                        return [2 /*return*/, {
                                value: variable.fixedValue,
                                operationDetail: { type: 'fixed', value: variable.fixedValue },
                                operationResult: "Valeur fixe: ".concat(variable.fixedValue),
                                operationSource: 'fixed',
                                sourceRef: variable.sourceRef || ''
                            }];
                    }
                    if (!(variable.sourceType === 'tree' && variable.sourceRef)) return [3 /*break*/, 4];
                    console.log("\uD83C\uDF32 Source tree, interpr\u00E9tation de: ".concat(variable.sourceRef));
                    valuesCache = new Map();
                    return [4 /*yield*/, interpretReference(variable.sourceRef, submissionId, prisma, valuesCache, 0, // Profondeur initiale = 0
                        localValueMap, labelMap)];
                case 3:
                    result = _a.sent();
                    console.log("\n".concat('─'.repeat(80)));
                    console.log("\u2705 R\u00C9SULTAT FINAL:");
                    console.log("   Value: ".concat(result.result));
                    console.log("   HumanText: ".concat(result.humanText));
                    console.log("".concat('─'.repeat(80), "\n"));
                    operationSource = 'field';
                    if (variable.sourceRef.includes('condition:'))
                        operationSource = 'condition';
                    else if (variable.sourceRef.includes('node-formula:'))
                        operationSource = 'formula';
                    else if (variable.sourceRef.includes('@table.'))
                        operationSource = 'table';
                    return [2 /*return*/, {
                            value: result.result,
                            operationDetail: result.details,
                            operationResult: result.humanText,
                            operationSource: operationSource,
                            sourceRef: variable.sourceRef
                        }];
                case 4:
                    if (!(variable.sourceType === 'formula' && variable.sourceRef)) return [3 /*break*/, 6];
                    console.log("\uD83E\uDDEE Source FORMULA directe, interpr\u00E9tation de: ".concat(variable.sourceRef));
                    valuesCache = new Map();
                    return [4 /*yield*/, interpretReference(variable.sourceRef, submissionId, prisma, valuesCache, 0, // Profondeur initiale = 0
                        localValueMap, labelMap)];
                case 5:
                    result = _a.sent();
                    console.log("\n".concat('─'.repeat(80)));
                    console.log("\u2705 R\u00C9SULTAT FORMULE:");
                    console.log("   Value: ".concat(result.result));
                    console.log("   HumanText: ".concat(result.humanText));
                    console.log("".concat('─'.repeat(80), "\n"));
                    return [2 /*return*/, {
                            value: result.result,
                            operationDetail: result.details,
                            operationResult: result.humanText,
                            operationSource: 'formula',
                            sourceRef: variable.sourceRef
                        }];
                case 6:
                    // CAS 3 : Valeur par défaut
                    console.log("\uD83D\uDCCB Utilisation valeur par d\u00E9faut: ".concat(variable.defaultValue || '∅'));
                    return [2 /*return*/, {
                            value: variable.defaultValue || '∅',
                            operationDetail: { type: 'default', value: variable.defaultValue },
                            operationResult: "Valeur par d\u00E9faut: ".concat(variable.defaultValue || 'aucune'),
                            operationSource: 'field',
                            sourceRef: variable.sourceRef || ''
                        }];
            }
        });
    });
}
