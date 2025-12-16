"use strict";
/**
 * 🤖 ROUTES API GOOGLE GEMINI
 * Routes pour l'intelligence artificielle dans le CRM
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
var express_1 = __importDefault(require("express"));
var GoogleGeminiService_1 = __importDefault(require("../services/GoogleGeminiService"));
var auth_1 = require("../middleware/auth");
var router = express_1.default.Router();
var geminiService = new GoogleGeminiService_1.default();
// Middleware d'authentification pour toutes les routes Gemini
router.use(auth_1.authenticateToken);
/**
 * 📧 POST /api/gemini/generate-email
 * Génère un email personnalisé pour un prospect
 */
router.post('/generate-email', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, leadData, _b, emailType, result, error_1;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                _a = req.body, leadData = _a.leadData, _b = _a.emailType, emailType = _b === void 0 ? 'initial' : _b;
                if (!leadData || (!leadData.name && !leadData.context)) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Données du lead requises (nom ou contexte)'
                        })];
                }
                console.log("\uD83E\uDD16 [Gemini] G\u00E9n\u00E9ration email ".concat(emailType, " pour ").concat(leadData.name || 'prospect'));
                return [4 /*yield*/, geminiService.generatePersonalizedEmail(leadData, emailType)];
            case 1:
                result = _c.sent();
                if (result.success) {
                    res.json({
                        success: true,
                        email: result.email,
                        metadata: {
                            generatedAt: new Date().toISOString(),
                            type: emailType,
                            leadName: leadData.name || 'prospect'
                        }
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        message: 'Erreur lors de la génération de l\'email',
                        error: result.error
                    });
                }
                return [3 /*break*/, 3];
            case 2:
                error_1 = _c.sent();
                console.error('❌ Erreur route generate-email:', error_1);
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de la génération d\'email'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * 📋 POST /api/gemini/analyze-lead
 * Analyse les données d'un lead et génère des insights
 */
router.post('/analyze-lead', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var leadData, result, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                leadData = req.body.leadData;
                if (!leadData) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Données du lead requises'
                        })];
                }
                console.log("\uD83E\uDD16 [Gemini] Analyse lead ".concat(leadData.name || 'Anonyme'));
                return [4 /*yield*/, geminiService.analyzeLeadData(leadData)];
            case 1:
                result = _a.sent();
                if (result.success) {
                    res.json({
                        success: true,
                        analysis: result.analysis,
                        metadata: {
                            analyzedAt: new Date().toISOString(),
                            leadId: leadData.id
                        }
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        message: 'Erreur lors de l\'analyse du lead',
                        error: result.error
                    });
                }
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error('❌ Erreur route analyze-lead:', error_2);
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de l\'analyse du lead'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * 📝 POST /api/gemini/generate-proposal
 * Génère une proposition commerciale
 */
router.post('/generate-proposal', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, leadData, productData, result, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, leadData = _a.leadData, productData = _a.productData;
                if (!leadData || !productData) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Données du lead et du produit requises'
                        })];
                }
                console.log("\uD83E\uDD16 [Gemini] G\u00E9n\u00E9ration proposition pour ".concat(leadData.name));
                return [4 /*yield*/, geminiService.generateCommercialProposal(leadData, productData)];
            case 1:
                result = _b.sent();
                if (result.success) {
                    res.json({
                        success: true,
                        proposal: result.proposal,
                        metadata: {
                            generatedAt: new Date().toISOString(),
                            leadName: leadData.name,
                            productName: productData.name
                        }
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        message: 'Erreur lors de la génération de la proposition',
                        error: result.error
                    });
                }
                return [3 /*break*/, 3];
            case 2:
                error_3 = _b.sent();
                console.error('❌ Erreur route generate-proposal:', error_3);
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de la génération de proposition'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * 🔍 POST /api/gemini/analyze-sentiment
 * Analyse le sentiment d'un email
 */
router.post('/analyze-sentiment', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var emailContent, result, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                emailContent = req.body.emailContent;
                if (!emailContent) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Contenu de l\'email requis'
                        })];
                }
                console.log('🤖 [Gemini] Analyse sentiment email');
                return [4 /*yield*/, geminiService.analyzeSentiment(emailContent)];
            case 1:
                result = _a.sent();
                if (result.success) {
                    res.json({
                        success: true,
                        sentiment: result.sentiment,
                        metadata: {
                            analyzedAt: new Date().toISOString(),
                            emailLength: emailContent.length
                        }
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        message: 'Erreur lors de l\'analyse de sentiment',
                        error: result.error
                    });
                }
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                console.error('❌ Erreur route analyze-sentiment:', error_4);
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de l\'analyse de sentiment'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * 💬 POST /api/gemini/suggest-response
 * Suggère une réponse à un email
 */
router.post('/suggest-response', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, emailContent, _b, context, result, error_5;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                _a = req.body, emailContent = _a.emailContent, _b = _a.context, context = _b === void 0 ? {} : _b;
                if (!emailContent) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Contenu de l\'email requis'
                        })];
                }
                console.log('🤖 [Gemini] Suggestion réponse email');
                return [4 /*yield*/, geminiService.suggestEmailResponse(emailContent, context)];
            case 1:
                result = _c.sent();
                if (result.success) {
                    res.json({
                        success: true,
                        suggestions: result.suggestions,
                        metadata: {
                            generatedAt: new Date().toISOString(),
                            context: context
                        }
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        message: 'Erreur lors de la suggestion de réponse',
                        error: result.error
                    });
                }
                return [3 /*break*/, 3];
            case 2:
                error_5 = _c.sent();
                console.error('❌ Erreur route suggest-response:', error_5);
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de la suggestion de réponse'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * 🧪 GET /api/gemini/test
 * Route de test pour vérifier la connexion Gemini
 */
router.get('/test', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var testLead, result, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                console.log('🧪 [Gemini] Test de connexion');
                testLead = {
                    name: 'Test Prospect',
                    company: 'Test Company',
                    email: 'test@example.com'
                };
                return [4 /*yield*/, geminiService.generatePersonalizedEmail(testLead, 'initial')];
            case 1:
                result = _a.sent();
                res.json({
                    success: true,
                    message: 'Service Gemini opérationnel',
                    test: result.success,
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 3];
            case 2:
                error_6 = _a.sent();
                console.error('❌ Erreur test Gemini:', error_6);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors du test Gemini',
                    error: error_6.message
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * 📊 GET /api/gemini/stats
 * Statistiques d'utilisation Gemini
 */
router.get('/stats', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        try {
            // TODO: Implémenter le tracking des statistiques
            res.json({
                success: true,
                stats: {
                    emailsGenerated: 0,
                    leadsAnalyzed: 0,
                    proposalsCreated: 0,
                    sentimentAnalyses: 0,
                    responseSuggestions: 0,
                    lastUsed: new Date().toISOString()
                },
                message: 'Statistiques Gemini (à implémenter)'
            });
        }
        catch (error) {
            console.error('❌ Erreur stats Gemini:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des statistiques'
            });
        }
        return [2 /*return*/];
    });
}); });
exports.default = router;
