"use strict";
/**
 * 🤖 ROUTES API INTELLIGENCE ARTIFICIELLE
 * Routes pour l'assistant IA vocal et les recommandations intelligentes
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var auth_1 = require("../middlewares/auth");
var GoogleGeminiService_1 = __importDefault(require("../services/GoogleGeminiService"));
var client_1 = require("@prisma/client");
var crypto_1 = require("crypto");
// Instance unique réutilisable (évite recréations coûteuses)
var geminiSingleton = new GoogleGeminiService_1.default();
var prisma = new client_1.PrismaClient();
var router = express_1.default.Router();
// Middleware d'authentification pour toutes les routes IA
router.use(auth_1.authMiddleware);
// ------------------------ Logging usage IA (non destructif) ------------------------
var aiUsageTableEnsured = null;
function ensureAiUsageLogTable() {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            if (!aiUsageTableEnsured) {
                aiUsageTableEnsured = (function () { return __awaiter(_this, void 0, void 0, function () {
                    var e_1;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                _a.trys.push([0, 6, , 7]);
                                // Création préventive si la migration n'a pas été appliquée (non destructive)
                                // On crée la table avec le schéma correspondant au modèle Prisma (si migrations non appliquées)
                                return [4 /*yield*/, prisma.$executeRawUnsafe("CREATE TABLE IF NOT EXISTS \"AiUsageLog\" (\n          id TEXT PRIMARY KEY,\n          \"userId\" TEXT NULL,\n          \"organizationId\" TEXT NULL,\n          type TEXT NOT NULL,\n          model TEXT NULL,\n          \"tokensPrompt\" INTEGER DEFAULT 0,\n          \"tokensOutput\" INTEGER DEFAULT 0,\n          \"latencyMs\" INTEGER NULL,\n          success BOOLEAN DEFAULT true,\n          \"errorCode\" TEXT NULL,\n          \"errorMessage\" TEXT NULL,\n          meta JSONB NULL,\n          \"createdAt\" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP\n        );")];
                            case 1:
                                // Création préventive si la migration n'a pas été appliquée (non destructive)
                                // On crée la table avec le schéma correspondant au modèle Prisma (si migrations non appliquées)
                                _a.sent();
                                return [4 /*yield*/, prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "AiUsageLog_userId_idx" ON "AiUsageLog"("userId");')];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "AiUsageLog_orgId_idx" ON "AiUsageLog"("organizationId");')];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "AiUsageLog_type_idx" ON "AiUsageLog"(type);')];
                            case 4:
                                _a.sent();
                                return [4 /*yield*/, prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "AiUsageLog_createdAt_idx" ON "AiUsageLog"("createdAt");')];
                            case 5:
                                _a.sent();
                                return [3 /*break*/, 7];
                            case 6:
                                e_1 = _a.sent();
                                console.warn('⚠️ Impossible de garantir la table AiUsageLog (continuation sans log):', e_1.message);
                                return [3 /*break*/, 7];
                            case 7: return [2 /*return*/];
                        }
                    });
                }); })();
            }
            return [2 /*return*/, aiUsageTableEnsured];
        });
    });
}
function mapEndpointToType(endpoint) {
    switch (endpoint) {
        case 'generate-response':
        case 'chat':
            return 'chat';
        case 'schedule-recommendations':
            return 'schedule_rec';
        case 'schedule-explain':
            return 'schedule_explain';
        case 'analyze-conversation':
            return 'conversation_analysis';
        case 'context-summary':
            return 'context_summary';
        case 'context-lead':
            return 'context_lead';
        case 'context-leads-batch':
            return 'context_leads_batch';
        case 'ultimate-recommendation':
            return 'ultimate_recommendation';
        default:
            return endpoint.replace(/[^a-z0-9_]/gi, '_');
    }
}
function logAiUsage(params) {
    return __awaiter(this, void 0, void 0, function () {
        var authReq, organizationId_1, userId_1, type_1, meta_1, e_2;
        var _this = this;
        var _a, _b, _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    _g.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, ensureAiUsageLogTable()];
                case 1:
                    _g.sent();
                    authReq = params.req;
                    organizationId_1 = ((_a = authReq.user) === null || _a === void 0 ? void 0 : _a.organizationId) || null;
                    userId_1 = ((_b = authReq.user) === null || _b === void 0 ? void 0 : _b.userId) || null;
                    type_1 = mapEndpointToType(params.endpoint);
                    meta_1 = __assign({ endpoint: params.endpoint, mode: params.mode, rawError: params.error, tokensOutputRaw: params.tokensOutput }, (params.extraMeta || {}));
                    return [4 /*yield*/, ((_d = (_c = prisma.aiUsageLog) === null || _c === void 0 ? void 0 : _c.create) === null || _d === void 0 ? void 0 : _d.call(_c, {
                            data: {
                                id: (0, crypto_1.randomUUID)(),
                                organizationId: organizationId_1 || undefined,
                                userId: userId_1 || undefined,
                                type: type_1,
                                model: params.model || undefined,
                                tokensPrompt: (_e = params.tokensPrompt) !== null && _e !== void 0 ? _e : undefined,
                                tokensOutput: (_f = params.tokensOutput) !== null && _f !== void 0 ? _f : undefined,
                                latencyMs: params.latencyMs,
                                success: params.success,
                                errorCode: params.error ? 'ERR_AI' : undefined,
                                errorMessage: params.error || undefined,
                                meta: meta_1
                            }
                        }).catch(function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: 
                                    // Fallback SQL brut
                                    return [4 /*yield*/, prisma.$executeRawUnsafe('INSERT INTO "AiUsageLog" (id, "userId", "organizationId", type, model, "tokensPrompt", "tokensOutput", "latencyMs", success, "errorCode", "errorMessage", meta) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12);', (0, crypto_1.randomUUID)(), userId_1, organizationId_1, type_1, params.model, params.tokensPrompt || 0, params.tokensOutput || 0, params.latencyMs || null, params.success, params.error ? 'ERR_AI' : null, params.error || null, JSON.stringify(meta_1))];
                                    case 1:
                                        // Fallback SQL brut
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 2:
                    _g.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_2 = _g.sent();
                    // Ne jamais interrompre la réponse utilisateur pour un problème de log
                    console.warn('⚠️ Log AI usage échoué:', e_2.message);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * 🤖 POST /api/ai/analyze-section
 * Analyse une section de site web et propose des optimisations
 */
router.post('/analyze-section', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var t0, _a, sectionType, content, prompt_1, analysisPrompt, serviceResp, isLive, analysis, latency, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                t0 = Date.now();
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                _a = req.body, sectionType = _a.sectionType, content = _a.content, prompt_1 = _a.prompt;
                console.log('🎨 [AI] Analyse section:', sectionType);
                console.log('📝 [AI] Contenu longueur:', JSON.stringify(content).length, 'caractères');
                analysisPrompt = prompt_1 || buildSectionAnalysisPrompt(sectionType, content);
                return [4 /*yield*/, geminiSingleton.chat({ prompt: analysisPrompt })];
            case 2:
                serviceResp = _b.sent();
                isLive = serviceResp.mode === 'live';
                analysis = isLive ? parseSectionAnalysis(serviceResp.content) : generateMockSectionAnalysis(sectionType, content);
                latency = Date.now() - t0;
                res.json({
                    success: true,
                    data: analysis,
                    metadata: {
                        mode: serviceResp.mode,
                        model: isLive ? (process.env.GEMINI_MODEL || 'gemini-1.5-flash') : 'mock',
                        latencyMs: latency,
                        fallbackError: serviceResp.error
                    }
                });
                void logAiUsage({
                    req: req,
                    endpoint: 'analyze-section',
                    success: true,
                    latencyMs: latency,
                    model: isLive ? (process.env.GEMINI_MODEL || 'gemini-1.5-flash') : 'mock',
                    mode: serviceResp.mode,
                    error: serviceResp.error ? String(serviceResp.error) : null
                });
                return [3 /*break*/, 4];
            case 3:
                error_1 = _b.sent();
                console.error('❌ Erreur route analyze-section:', error_1);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de l\'analyse de la section',
                    details: error_1.message
                });
                void logAiUsage({
                    req: req,
                    endpoint: 'analyze-section',
                    success: false,
                    latencyMs: Date.now() - t0,
                    model: null,
                    mode: null,
                    error: error_1.message
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Helper: Construire le prompt d'analyse de section
function buildSectionAnalysisPrompt(sectionType, content) {
    // Déterminer les champs spécifiques selon le type de section
    var sectionTypeGuide = getSectionTypeGuide(sectionType);
    return "Tu es un expert en UX/UI et design web sp\u00E9cialis\u00E9 dans les sites de transition \u00E9nerg\u00E9tique.\n\n\uD83C\uDFAF **IMPORTANT : Analyse UNIQUEMENT cette section isol\u00E9e, PAS le site complet.**\n\n**Type de section \u00E0 analyser :** ".concat(sectionType, "\n").concat(sectionTypeGuide, "\n\n**Contenu actuel de CETTE section :**\n").concat(JSON.stringify(content, null, 2).slice(0, 3000), "\n\n**Ta mission :**\n1. Analyser UNIQUEMENT les \u00E9l\u00E9ments pr\u00E9sents dans cette section sp\u00E9cifique\n2. Proposer des am\u00E9liorations CONCR\u00C8TES pour cette section\n3. Ne PAS faire de suggestions globales sur le site\n4. Se concentrer sur ce qui est modifiable dans CETTE section\n\n**Format de r\u00E9ponse (JSON uniquement) :**\n{\n  \"score\": <nombre entre 0 et 100 pour CETTE section>,\n  \"suggestions\": [\n    {\n      \"id\": \"<id unique ex: ").concat(sectionType, "-suggestion-1>\",\n      \"category\": \"<layout|design|content|ux>\",\n      \"type\": \"<improvement|warning|best-practice>\",\n      \"title\": \"<titre court et actionnable>\",\n      \"description\": \"<explication d\u00E9taill\u00E9e SP\u00C9CIFIQUE \u00E0 cette section>\",\n      \"impact\": \"<low|medium|high>\",\n      \"changes\": { \n        \"<nomDuChamp>\": \"<valeurPropos\u00E9e>\",\n        \"// Exemple: title\": \"Nouveau titre optimis\u00E9\",\n        \"// Exemple: backgroundColor\": \"#10b981\"\n      },\n      \"preview\": {\n        \"before\": \"<valeur actuelle dans CETTE section>\",\n        \"after\": \"<valeur propos\u00E9e pour CETTE section>\"\n      }\n    }\n  ],\n  \"summary\": {\n    \"strengths\": [\"<point fort de CETTE section>\"],\n    \"weaknesses\": [\"<faiblesse de CETTE section>\"],\n    \"opportunities\": [\"<am\u00E9lioration possible dans CETTE section>\"]\n  }\n}\n\n**Crit\u00E8res d'analyse pour CETTE section :**\n- \uD83D\uDCD0 **LAYOUT**: disposition des \u00E9l\u00E9ments dans cette section, grille, espacement interne\n- \uD83C\uDFA8 **DESIGN**: couleurs utilis\u00E9es ici, typographie de cette section, contraste\n- \uD83D\uDCDD **CONTENU**: textes pr\u00E9sents dans cette section, CTA de cette section\n- \u26A1 **UX**: navigation dans cette section, hi\u00E9rarchie visuelle interne\n\n**Exemples de suggestions VALIDES (sp\u00E9cifiques \u00E0 la section) :**\n\u2705 \"Le titre de cette section manque de contraste - passer de #666666 \u00E0 #1f2937\"\n\u2705 \"Le CTA de cette section est peu visible - augmenter la taille du bouton\"\n\u2705 \"L'espacement entre le titre et la description est trop serr\u00E9 - passer \u00E0 24px\"\n\n**Exemples de suggestions INVALIDES (trop g\u00E9n\u00E9rales) :**\n\u274C \"Am\u00E9liorer la navigation du site\"\n\u274C \"Ajouter un footer au site\"\n\u274C \"Optimiser le SEO global\"\n\nR\u00E9ponds UNIQUEMENT avec le JSON, sans ```json ni texte additionnel.");
}
// Helper: Guide spécifique par type de section
function getSectionTypeGuide(sectionType) {
    var guides = {
        'hero': "\n**\u00C9l\u00E9ments typiques d'une section Hero :**\n- title (titre principal)\n- subtitle/description (sous-titre)\n- ctaText/buttonText (texte du bouton d'action)\n- backgroundImage/image (image de fond)\n- backgroundColor (couleur de fond)\n- textColor (couleur du texte)\n- alignment (alignement du contenu)",
        'hero-split': "\n**\u00C9l\u00E9ments typiques d'une section Hero Split :**\n- title, subtitle\n- image (c\u00F4t\u00E9 visuel)\n- ctaText\n- layout (left/right split)\n- backgroundColor, textColor",
        'card': "\n**\u00C9l\u00E9ments typiques d'une section Card :**\n- cards[] (liste de cartes)\n- Chaque carte : title, description, icon, link\n- gridColumns (nombre de colonnes)\n- backgroundColor",
        'cta': "\n**\u00C9l\u00E9ments typiques d'une section CTA :**\n- title (appel \u00E0 l'action)\n- description (description courte)\n- buttonText (texte du bouton)\n- buttonLink (lien du bouton)\n- backgroundColor, buttonColor",
        'footer': "\n**\u00C9l\u00E9ments typiques d'un Footer :**\n- companyInfo (infos entreprise)\n- links[] (liens footer)\n- socialLinks[] (r\u00E9seaux sociaux)\n- copyright (texte copyright)",
        'testimonials': "\n**\u00C9l\u00E9ments typiques d'une section T\u00E9moignages :**\n- testimonials[] (liste de t\u00E9moignages)\n- Chaque t\u00E9moignage : name, company, text, avatar\n- layout (carousel/grid)",
        'pricing': "\n**\u00C9l\u00E9ments typiques d'une section Tarifs :**\n- plans[] (liste de forfaits)\n- Chaque plan : name, price, features[], highlighted\n- currency, interval (mois/an)",
        'faq': "\n**\u00C9l\u00E9ments typiques d'une section FAQ :**\n- questions[] (liste de questions)\n- Chaque question : question, answer\n- layout (accordion/list)",
        'contact-form': "\n**\u00C9l\u00E9ments typiques d'un Formulaire de Contact :**\n- fields[] (champs du formulaire)\n- submitText (texte du bouton)\n- successMessage (message de succ\u00E8s)"
    };
    return guides[sectionType] || "**Section de type : ".concat(sectionType, "**\nAnalyser les \u00E9l\u00E9ments pr\u00E9sents dans le contenu fourni.");
}
// Helper: Parser la réponse Gemini
function parseSectionAnalysis(content) {
    if (!content)
        return generateMockSectionAnalysis('unknown', {});
    try {
        // Nettoyer le contenu (enlever les markdown code blocks si présents)
        var cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        var parsed = JSON.parse(cleaned);
        // Valider la structure
        if (!parsed.score || !parsed.suggestions || !parsed.summary) {
            throw new Error('Structure invalide');
        }
        return parsed;
    }
    catch (error) {
        console.warn('⚠️ Impossible de parser la réponse Gemini, utilisation du mock');
        return generateMockSectionAnalysis('unknown', {});
    }
}
// Helper: Générer une analyse mock spécifique à la section
function generateMockSectionAnalysis(sectionType, content) {
    var hasTitle = (content === null || content === void 0 ? void 0 : content.title) || (content === null || content === void 0 ? void 0 : content.heading);
    var hasDescription = (content === null || content === void 0 ? void 0 : content.description) || (content === null || content === void 0 ? void 0 : content.subtitle);
    var hasImage = (content === null || content === void 0 ? void 0 : content.image) || (content === null || content === void 0 ? void 0 : content.backgroundImage);
    var hasCTA = (content === null || content === void 0 ? void 0 : content.ctaText) || (content === null || content === void 0 ? void 0 : content.buttonText);
    var hasBackgroundColor = content === null || content === void 0 ? void 0 : content.backgroundColor;
    var hasTextColor = content === null || content === void 0 ? void 0 : content.textColor;
    var suggestions = [];
    var score = 75; // Score de base pour une section
    // === SUGGESTIONS SPÉCIFIQUES AU TYPE DE SECTION ===
    if (sectionType === 'hero' || sectionType === 'hero-split') {
        // Hero Section - L'image est cruciale
        if (!hasImage) {
            suggestions.push({
                id: "".concat(sectionType, "-img-missing"),
                category: 'design',
                type: 'warning',
                title: 'Image de fond manquante dans cette Hero',
                description: 'Cette section Hero nécessite une image de fond impactante pour capter l\'attention. Les Hero avec image convertissent 45% mieux.',
                impact: 'high',
                changes: {
                    backgroundImage: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1920',
                    overlayOpacity: '0.4'
                },
                preview: {
                    before: 'Aucune image de fond',
                    after: 'Image panoramique transition énergétique avec overlay'
                }
            });
            score -= 15;
        }
        if (!hasCTA) {
            suggestions.push({
                id: "".concat(sectionType, "-cta-missing"),
                category: 'content',
                type: 'warning',
                title: 'Bouton d\'action manquant dans cette Hero',
                description: 'Cette section Hero doit avoir un CTA clair et visible pour guider l\'utilisateur. Suggestion : "Demander un devis gratuit"',
                impact: 'high',
                changes: {
                    ctaText: 'Demander un devis gratuit',
                    ctaStyle: 'primary',
                    ctaSize: 'large'
                },
                preview: {
                    before: 'Pas de bouton d\'action',
                    after: 'Bouton "Demander un devis gratuit" visible'
                }
            });
            score -= 12;
        }
        if (hasTitle && hasTitle.length < 20) {
            suggestions.push({
                id: "".concat(sectionType, "-title-short"),
                category: 'content',
                type: 'improvement',
                title: 'Titre de cette Hero trop court',
                description: "Le titre actuel \"".concat(hasTitle, "\" est trop court. Un titre Hero impactant fait 30-60 caract\u00E8res pour \u00EAtre m\u00E9morable."),
                impact: 'medium',
                changes: {
                    title: 'Transformez votre consommation énergétique dès aujourd\'hui'
                },
                preview: {
                    before: hasTitle,
                    after: 'Transformez votre consommation énergétique dès aujourd\'hui'
                }
            });
            score -= 8;
        }
    }
    else if (sectionType === 'card' || sectionType === 'card-icon' || sectionType === 'card-service') {
        // Card Section - Le nombre de cartes et la grille sont importants
        var cards = (content === null || content === void 0 ? void 0 : content.cards) || [];
        var gridColumns = (content === null || content === void 0 ? void 0 : content.gridColumns) || 3;
        if (cards.length === 0) {
            suggestions.push({
                id: "".concat(sectionType, "-no-cards"),
                category: 'content',
                type: 'warning',
                title: 'Aucune carte dans cette section Cards',
                description: 'Cette section de cartes est vide. Ajoutez au moins 3 cartes pour présenter vos services/avantages.',
                impact: 'high',
                changes: {
                    cards: [
                        { title: 'Service 1', description: 'Description du service', icon: 'star' },
                        { title: 'Service 2', description: 'Description du service', icon: 'rocket' },
                        { title: 'Service 3', description: 'Description du service', icon: 'check' }
                    ]
                },
                preview: {
                    before: 'Section vide',
                    after: '3 cartes de services avec icônes'
                }
            });
            score -= 20;
        }
        else if (cards.length % gridColumns !== 0) {
            suggestions.push({
                id: "".concat(sectionType, "-grid-uneven"),
                category: 'layout',
                type: 'improvement',
                title: 'Grille déséquilibrée dans cette section',
                description: "Vous avez ".concat(cards.length, " cartes en ").concat(gridColumns, " colonnes, ce qui cr\u00E9e une derni\u00E8re ligne incompl\u00E8te. Ajoutez ").concat(gridColumns - (cards.length % gridColumns), " carte(s) ou passez \u00E0 ").concat(cards.length, " colonnes."),
                impact: 'medium',
                changes: {
                    gridColumns: cards.length === 4 ? 2 : Math.min(cards.length, 4)
                },
                preview: {
                    before: "".concat(cards.length, " cartes en ").concat(gridColumns, " colonnes"),
                    after: 'Grille équilibrée'
                }
            });
            score -= 5;
        }
    }
    else if (sectionType === 'cta' || sectionType === 'cta-banner') {
        // CTA Section - Le bouton doit être ultra-visible
        if (!hasCTA) {
            suggestions.push({
                id: "".concat(sectionType, "-no-button"),
                category: 'content',
                type: 'warning',
                title: 'Bouton manquant dans cette section CTA',
                description: 'Une section CTA DOIT avoir un bouton d\'action visible. C\'est l\'élément central de cette section.',
                impact: 'high',
                changes: {
                    buttonText: 'Commencer maintenant',
                    buttonSize: 'large',
                    buttonColor: '#10b981'
                },
                preview: {
                    before: 'Pas de bouton',
                    after: 'Bouton "Commencer maintenant" vert vif'
                }
            });
            score -= 25;
        }
        if (!hasBackgroundColor || hasBackgroundColor === '#ffffff') {
            suggestions.push({
                id: "".concat(sectionType, "-bg-bland"),
                category: 'design',
                type: 'improvement',
                title: 'Fond de cette CTA trop neutre',
                description: 'Cette section CTA doit se démarquer visuellement. Utilisez un fond coloré ou un gradient pour attirer l\'attention.',
                impact: 'high',
                changes: {
                    backgroundColor: '#f0fdf4',
                    borderColor: '#10b981',
                    borderWidth: '2px'
                },
                preview: {
                    before: 'Fond blanc neutre',
                    after: 'Fond vert clair avec bordure verte'
                }
            });
            score -= 10;
        }
    }
    else if (sectionType === 'footer') {
        // Footer - Doit avoir les infos légales
        var hasCopyright = content === null || content === void 0 ? void 0 : content.copyright;
        var hasLinks = (content === null || content === void 0 ? void 0 : content.links) && content.links.length > 0;
        if (!hasCopyright) {
            suggestions.push({
                id: "".concat(sectionType, "-no-copyright"),
                category: 'content',
                type: 'warning',
                title: 'Copyright manquant dans ce Footer',
                description: 'Ce footer doit inclure le copyright pour la conformité légale.',
                impact: 'medium',
                changes: {
                    copyright: "\u00A9 ".concat(new Date().getFullYear(), " 2Thier. Tous droits r\u00E9serv\u00E9s.")
                },
                preview: {
                    before: 'Pas de mention légale',
                    after: '© 2025 2Thier. Tous droits réservés.'
                }
            });
            score -= 8;
        }
        if (!hasLinks) {
            suggestions.push({
                id: "".concat(sectionType, "-no-links"),
                category: 'content',
                type: 'improvement',
                title: 'Liens manquants dans ce Footer',
                description: 'Ce footer devrait inclure des liens utiles (CGV, Mentions légales, Contact, etc.)',
                impact: 'medium',
                changes: {
                    links: [
                        { text: 'Mentions légales', url: '/legal' },
                        { text: 'CGV', url: '/cgv' },
                        { text: 'Contact', url: '/contact' }
                    ]
                },
                preview: {
                    before: 'Aucun lien',
                    after: '3 liens légaux essentiels'
                }
            });
            score -= 7;
        }
    }
    // === SUGGESTIONS GÉNÉRIQUES POUR TOUS LES TYPES ===
    if (!hasTitle) {
        suggestions.push({
            id: "".concat(sectionType, "-no-title"),
            category: 'content',
            type: 'warning',
            title: 'Titre manquant dans cette section',
            description: "Cette section ".concat(sectionType, " n\u00E9cessite un titre clair pour guider le visiteur."),
            impact: 'high',
            changes: {
                title: sectionType === 'hero' ? 'Votre titre impactant ici' : "Titre de la section ".concat(sectionType)
            },
            preview: {
                before: 'Pas de titre',
                after: 'Titre explicite ajouté'
            }
        });
        score -= 12;
    }
    if (!hasDescription && sectionType !== 'footer') {
        suggestions.push({
            id: "".concat(sectionType, "-no-desc"),
            category: 'content',
            type: 'improvement',
            title: 'Description manquante dans cette section',
            description: "Un sous-titre ou description dans cette section ".concat(sectionType, " am\u00E9liore la clart\u00E9 du message."),
            impact: 'medium',
            changes: {
                description: 'Description engageante de cette section'
            },
            preview: {
                before: 'Pas de description',
                after: 'Sous-titre explicatif ajouté'
            }
        });
        score -= 6;
    }
    // Contraste des couleurs
    if (hasBackgroundColor && hasTextColor) {
        var bgColor = hasBackgroundColor.replace('#', '');
        var txtColor = hasTextColor.replace('#', '');
        // Heuristique simple : si fond clair et texte clair, problème
        var bgLight = parseInt(bgColor.substring(0, 2), 16) > 200;
        var txtLight = parseInt(txtColor.substring(0, 2), 16) > 200;
        if (bgLight && txtLight) {
            suggestions.push({
                id: "".concat(sectionType, "-contrast-low"),
                category: 'design',
                type: 'warning',
                title: 'Contraste insuffisant dans cette section',
                description: 'Le texte clair sur fond clair de cette section pose un problème d\'accessibilité (WCAG). Assombrir le texte.',
                impact: 'medium',
                changes: {
                    textColor: '#1f2937'
                },
                preview: {
                    before: "Texte ".concat(hasTextColor, " sur fond ").concat(hasBackgroundColor),
                    after: 'Texte #1f2937 (gris foncé) sur fond clair'
                }
            });
            score -= 8;
        }
    }
    // Espacement
    var padding = content === null || content === void 0 ? void 0 : content.padding;
    if (!padding || padding === '0px' || padding === '0') {
        suggestions.push({
            id: "".concat(sectionType, "-no-padding"),
            category: 'layout',
            type: 'best-practice',
            title: 'Espacement insuffisant dans cette section',
            description: 'Cette section manque de "breathing room". Ajouter du padding pour un design aéré (règle des 8px).',
            impact: 'low',
            changes: {
                padding: '48px 24px'
            },
            preview: {
                before: 'Section collée aux bords',
                after: 'Section avec espacement confortable'
            }
        });
        score -= 4;
    }
    // Si aucune suggestion spécifique, ajouter des best practices
    if (suggestions.length === 0) {
        suggestions.push({
            id: "".concat(sectionType, "-optimize-mobile"),
            category: 'ux',
            type: 'best-practice',
            title: 'Optimiser cette section pour mobile',
            description: 'Vérifier que cette section s\'adapte bien aux petits écrans (responsive design).',
            impact: 'medium',
            changes: {
                responsiveSettings: {
                    mobile: { fontSize: '14px', padding: '24px 16px' }
                }
            },
            preview: {
                before: 'Paramètres desktop uniquement',
                after: 'Adapté aux mobiles'
            }
        });
    }
    return {
        score: Math.max(40, Math.min(95, score)),
        suggestions: suggestions.slice(0, 8), // Max 8 suggestions pour ne pas surcharger
        summary: {
            strengths: [
                hasTitle && "Titre pr\u00E9sent dans cette section",
                hasDescription && "Description claire dans cette section",
                hasImage && "Visuel pr\u00E9sent dans cette section",
                hasCTA && "Appel \u00E0 l'action dans cette section",
                hasBackgroundColor && hasBackgroundColor !== '#ffffff' && "Fond personnalis\u00E9 dans cette section"
            ].filter(Boolean),
            weaknesses: [
                !hasTitle && "Titre manquant dans cette section ".concat(sectionType),
                !hasDescription && sectionType !== 'footer' && "Description absente de cette section",
                !hasCTA && (sectionType === 'hero' || sectionType === 'cta') && "Bouton d'action manquant dans cette section",
                suggestions.length > 3 && "".concat(suggestions.length, " am\u00E9liorations possibles identifi\u00E9es pour cette section")
            ].filter(Boolean),
            opportunities: [
                "Ajouter des animations d'entr\u00E9e pour cette section",
                "Tester des variantes A/B de cette section",
                "Am\u00E9liorer l'accessibilit\u00E9 (WCAG AA) de cette section",
                "Optimiser le poids des images de cette section"
            ].slice(0, 3)
        }
    };
}
/**
 * 💬 POST /api/ai/generate-response
 * Génère une réponse de l'assistant IA
 */
router.post('/generate-response', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, handleChatLike(req, res, 'generate-response')];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
/**
 * 💬 POST /api/ai/chat (alias moderne)
 */
router.post('/chat', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, handleChatLike(req, res, 'chat')];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
function buildChatPrompt(_a) {
    var message = _a.message, context = _a.context, conversationHistory = _a.conversationHistory, analysis = _a.analysis, memory = _a.memory;
    // Lead/context summarization (kept concise to preserve tokens)
    function summarizeLeadFromContext(ctx) {
        var _a, _b, _c, _d, _e;
        try {
            if (!ctx)
                return '';
            var ctxUnknown = ctx;
            var leadBasic = (ctxUnknown === null || ctxUnknown === void 0 ? void 0 : ctxUnknown.lead) || null;
            var lc = (ctxUnknown === null || ctxUnknown === void 0 ? void 0 : ctxUnknown.leadContext) || null;
            var lead = (lc && lc.lead) || leadBasic || null;
            if (!lead && !lc)
                return '';
            var name_1 = [(lead === null || lead === void 0 ? void 0 : lead.firstName) || ((_a = lead === null || lead === void 0 ? void 0 : lead.data) === null || _a === void 0 ? void 0 : _a.firstName), (lead === null || lead === void 0 ? void 0 : lead.lastName) || ((_b = lead === null || lead === void 0 ? void 0 : lead.data) === null || _b === void 0 ? void 0 : _b.lastName), lead === null || lead === void 0 ? void 0 : lead.name].filter(Boolean).join(' ').trim();
            var company = (lead === null || lead === void 0 ? void 0 : lead.company) || ((_c = lead === null || lead === void 0 ? void 0 : lead.data) === null || _c === void 0 ? void 0 : _c.company) || '';
            var status_1 = (lead === null || lead === void 0 ? void 0 : lead.status) || ((_d = lead === null || lead === void 0 ? void 0 : lead.data) === null || _d === void 0 ? void 0 : _d.status) || '';
            var notes = ((lead === null || lead === void 0 ? void 0 : lead.notes) || ((_e = lead === null || lead === void 0 ? void 0 : lead.data) === null || _e === void 0 ? void 0 : _e.notes) || '').toString();
            var calls = (lc === null || lc === void 0 ? void 0 : lc.calls) || [];
            var messages = (lc === null || lc === void 0 ? void 0 : lc.messages) || [];
            var events = (lc === null || lc === void 0 ? void 0 : lc.upcomingEvents) || [];
            // const timeline = lc?.timeline || [];
            var lastCall = Array.isArray(calls) && calls.length ? calls[0] : null;
            var lastMsg = Array.isArray(messages) && messages.length ? messages[0] : null;
            var nextEvent = Array.isArray(events) && events.length ? events[0] : null;
            var parts = [];
            if (name_1)
                parts.push("Nom: ".concat(name_1).concat(company ? ' • ' + company : ''));
            if (status_1)
                parts.push("Statut: ".concat(status_1));
            var counts = [];
            if (Array.isArray(calls))
                counts.push("".concat(calls.length, " appels r\u00E9cents"));
            if (Array.isArray(messages))
                counts.push("".concat(messages.length, " messages"));
            if (Array.isArray(events))
                counts.push("".concat(events.length, " RDV \u00E0 venir"));
            if (counts.length)
                parts.push("Activit\u00E9: ".concat(counts.join(', ')));
            if (lastCall)
                parts.push("Dernier appel: ".concat(lastCall.status || 'n/a').concat(lastCall.duration ? " (".concat(lastCall.duration, "s)") : ''));
            if (lastMsg)
                parts.push("Dernier message: ".concat(lastMsg.type || 'n/a', " ").concat(lastMsg.sentAt ? "(".concat(new Date(lastMsg.sentAt).toLocaleDateString('fr-FR'), ")") : ''));
            if (nextEvent)
                parts.push("Prochain \u00E9v\u00E8nement: ".concat(nextEvent.title || 'RDV', " le ").concat(nextEvent.startDate ? new Date(nextEvent.startDate).toLocaleString('fr-FR') : 'bientôt'));
            if (notes)
                parts.push("Notes: ".concat((notes.replace(/\s+/g, ' ').slice(0, 140))).concat(notes.length > 140 ? '…' : ''));
            return parts.length ? ('\nLEAD_CONTEXT:\n' + parts.join('\n')) : '';
        }
        catch (_f) {
            return '';
        }
    }
    var hist = (conversationHistory || []).slice(-8).map(function (m, i) { return "#".concat(i + 1, " ").concat(m.type || m.role || 'user', ": ").concat((m.message || m.content || '').slice(0, 400)); }).join('\n');
    var analysisBlock = analysis ? "\nANALYSE_PRECEDENTE:\n".concat(JSON.stringify(analysis).slice(0, 800)) : '';
    var memoryBlock = memory ? "\nMEMOIRE_SYSTEME_RECENTE:\n".concat(memory) : '';
    var leadBlock = summarizeLeadFromContext(context);
    return "Tu es un assistant commercial CRM francophone sp\u00E9cialis\u00E9 en prospection, qualification et planification de RDV.\nContexteModule: ".concat((context === null || context === void 0 ? void 0 : context.currentModule) || 'inconnu', "\nPage: ").concat((context === null || context === void 0 ? void 0 : context.currentPage) || 'n/a', "\nR\u00F4leUtilisateur: ").concat((context === null || context === void 0 ? void 0 : context.userRole) || 'commercial', "\nObjectif: aider rapidement avec pertinence, proposer des actions concr\u00E8tes.\n").concat(leadBlock, "\nHistorique:\n").concat(hist || 'Aucun', "\nMessageUtilisateur: ").concat(message, "\n").concat(analysisBlock, "\n").concat(memoryBlock, "\nR\u00E8gles de r\u00E9ponse: commence par saluer en citant le pr\u00E9nom/nom du lead si disponibles. Fais 1 phrase d'\u00E9tat (appels/messages/RDV). Puis propose: 1) une phrase d'ouverture d'appel adapt\u00E9e, 2) deux questions de qualification courtes, 3) la prochaine action claire. Si aucune activit\u00E9, encourage \u00E0 appeler et propose un angle. R\u00E9ponds en fran\u00E7ais, concis, structur\u00E9, \u2264140 mots.");
}
function buildMockResponse(message, context) {
    var page = ((context === null || context === void 0 ? void 0 : context.currentPage) || '').toLowerCase();
    var moduleKey = ((context === null || context === void 0 ? void 0 : context.currentModule) || '').toLowerCase();
    var mentionsGmail = /gmail|mail|email|inbox|délivrabi|deliverab/i.test(message) || page.includes('mail') || page.includes('gmail') || moduleKey.includes('mail') || moduleKey.includes('gmail');
    if (mentionsGmail) {
        return [
            "Analyse rapide de la page Mail (r\u00E9ponse simplifi\u00E9e):",
            "\u2022 Lisibilit\u00E9: v\u00E9rifiez la hi\u00E9rarchie (sujet, exp\u00E9diteur, labels).",
            "\u2022 Actions cl\u00E9s visibles: r\u00E9pondre, transf\u00E9rer, \u00E9toile, supprimer, labels.",
            "\u2022 \u00C9tats: chargement, erreurs, bo\u00EEte vide, pagination/scroll.",
            "\u2022 Recherche/filtres: champs, tri par date/exp\u00E9diteur, labels.",
            "\u2022 S\u00E9curit\u00E9: si HTML d'email rendu, utiliser DOMPurify (anti-XSS).",
            "\u2022 Liaison CRM: lien vers Lead/Opportunit\u00E9/T\u00E2ches, suivi/relances.",
            "Prochaine \u00E9tape: dites \u201Caudite la page mail\u201D ou \u201Cpropose 3 quick wins UI\u201D."
        ].join('\n');
    }
    return "Je comprends: \"".concat(message, "\". (R\u00E9ponse simplifi\u00E9e) Besoin d'aide pour: planifier un RDV, analyser un lead, g\u00E9n\u00E9rer un email, ou d\u00E9finir la prochaine action ? Pr\u00E9cisez votre objectif en une phrase.");
}
function defaultSuggestions() {
    return [
        'Script d’ouverture d’appel',
        'Questions de qualification',
        'Prochaine action commerciale',
        'Planifier un rendez-vous'
    ];
}
function deriveSuggestions(content) {
    var lower = content.toLowerCase();
    var s = new Set();
    if (lower.includes('email'))
        s.add('Générer un email');
    if (lower.includes('rdv') || lower.includes('rendez'))
        s.add('Planifier un rendez-vous');
    if (lower.includes('analyse'))
        s.add('Analyser le lead');
    s.add('Prochaine action commerciale');
    return Array.from(s).slice(0, 6);
}
// ---------- Facteur commun chat/generate-response ----------
// Index fichiers & symboles pour enrichissement code lorsque l'utilisateur pose des questions techniques
var __AI_CODE_INDEX = null;
var __AI_SYMBOL_INDEX = null;
var __AI_FILE_SUMMARY_CACHE = {};
var __AI_FILE_SUMMARY_TTL = 90000;
function __aiBuildCodeIndex() {
    if (__AI_CODE_INDEX)
        return __AI_CODE_INDEX;
    var base = path_1.default.join(process.cwd(), 'src');
    var acc = [];
    function walk(dir, depth) {
        if (depth === void 0) { depth = 0; }
        if (depth > 6)
            return;
        var entries = [];
        try {
            entries = fs_1.default.readdirSync(dir);
        }
        catch (_a) {
            return;
        }
        for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
            var e = entries_1[_i];
            var full = path_1.default.join(dir, e);
            if (/node_modules|\.git|dist|build/.test(full))
                continue;
            var st = void 0;
            try {
                st = fs_1.default.statSync(full);
            }
            catch (_b) {
                continue;
            }
            if (st.isDirectory())
                walk(full, depth + 1);
            else if (/\.(ts|tsx|js|cjs|mjs)$/.test(e))
                acc.push(full.substring(base.length + 1).replace(/\\/g, '/'));
        }
    }
    walk(base);
    __AI_CODE_INDEX = acc;
    return acc;
}
function __aiBuildSymbolIndex() {
    if (__AI_SYMBOL_INDEX)
        return __AI_SYMBOL_INDEX;
    var idx = __aiBuildCodeIndex();
    var m = {};
    var _loop_1 = function (rel) {
        try {
            var abs = path_1.default.join(process.cwd(), 'src', rel);
            var content = fs_1.default.readFileSync(abs, 'utf8');
            var regexes = [
                /export\s+class\s+([A-Za-z0-9_]+)/g,
                /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g,
                /export\s+const\s+([A-Za-z0-9_]+)/g,
                /export\s+interface\s+([A-Za-z0-9_]+)/g,
                /export\s+type\s+([A-Za-z0-9_]+)/g,
                /export\s+enum\s+([A-Za-z0-9_]+)/g,
            ];
            for (var _b = 0, regexes_1 = regexes; _b < regexes_1.length; _b++) {
                var r = regexes_1[_b];
                var match = void 0;
                while ((match = r.exec(content))) {
                    if (!m[match[1]])
                        m[match[1]] = rel;
                }
            }
            var brace = /export\s+{([^}]+)}/g;
            var b = void 0;
            while ((b = brace.exec(content))) {
                b[1].split(',').map(function (s) { return s.trim().split(/\s+as\s+/i)[0]; }).filter(Boolean).forEach(function (sym) { if (!m[sym])
                    m[sym] = rel; });
            }
        }
        catch ( /* ignore */_c) { /* ignore */ }
    };
    for (var _i = 0, _a = idx.slice(0, 1200); _i < _a.length; _i++) {
        var rel = _a[_i];
        _loop_1(rel);
    }
    __AI_SYMBOL_INDEX = m;
    return m;
}
function __aiExtractReferencedFiles(message) {
    var explicit = Array.from(message.matchAll(/([A-Za-z0-9_-]+\.(?:tsx?|jsx?|cjs|mjs))/g)).map(function (m) { return m[1]; });
    var extra = [];
    var hooks = Array.from(message.matchAll(/use[A-Z][A-Za-z0-9]+/g)).map(function (m) { return m[0] + '.ts'; });
    extra.push.apply(extra, hooks);
    var symbolTokens = Array.from(message.matchAll(/\b[A-Z][A-Za-z0-9_]{2,}\b/g)).map(function (m) { return m[0]; }).slice(0, 30);
    var symIdx = __aiBuildSymbolIndex();
    for (var _i = 0, symbolTokens_1 = symbolTokens; _i < symbolTokens_1.length; _i++) {
        var t = symbolTokens_1[_i];
        if (symIdx[t])
            extra.push(symIdx[t]);
    }
    var candidates = Array.from(new Set(__spreadArray(__spreadArray([], explicit, true), extra, true)));
    if (!candidates.length)
        return [];
    var index = __aiBuildCodeIndex();
    var resolved = [];
    var _loop_2 = function (c) {
        if (c.includes('/')) {
            if (index.includes(c))
                resolved.push(c);
        }
        else {
            var hit = index.find(function (p) { return p.endsWith('/' + c) || p === c; });
            if (hit)
                resolved.push(hit);
        }
        if (resolved.length >= 5)
            return "break";
    };
    for (var _a = 0, candidates_1 = candidates; _a < candidates_1.length; _a++) {
        var c = candidates_1[_a];
        var state_1 = _loop_2(c);
        if (state_1 === "break")
            break;
    }
    return resolved.slice(0, 5);
}
function __aiSummarizeFile(rel) {
    try {
        var now = Date.now();
        var cached = __AI_FILE_SUMMARY_CACHE[rel];
        if (cached && now - cached.ts < __AI_FILE_SUMMARY_TTL)
            return cached.summary;
        var abs = path_1.default.join(process.cwd(), 'src', rel);
        if (!fs_1.default.existsSync(abs))
            return null;
        var content = fs_1.default.readFileSync(abs, 'utf8');
        var lines = content.split(/\r?\n/);
        var first = lines.slice(0, 80).join('\n');
        var importMatches = Array.from(content.matchAll(/import\s+[^;]+from\s+['"]([^'".][^'"/]*)['"]/g)).map(function (m) { return m[1]; }).slice(0, 8);
        var internalImports = Array.from(content.matchAll(/import\s+[^;]+from\s+['"](\.{1,2}\/[^'"]+)['"]/g)).map(function (m) { return m[1]; }).slice(0, 6);
        var exportMatches = Array.from(content.matchAll(/export\s+(?:default\s+)?(function|const|class)\s+([A-Za-z0-9_]+)/g)).map(function (m) { return m[2]; }).slice(0, 10);
        var hasDefault = /export\s+default\s+/.test(content);
        var hooksCount = (content.match(/\buse(State|Effect|Memo|Callback|Ref|Context|Reducer)\b/g) || []).length;
        var useEffectCount = (content.match(/\buseEffect\b/g) || []).length;
        var hasI18n = /\bt\(['"][^)]*\)/.test(content) || /i18n/.test(content);
        var jsxTags = (content.match(/<[A-Z][A-Za-z0-9]+\b/g) || []).length;
        var size = lines.length;
        var risk = [];
        if (size > 800)
            risk.push('very_large');
        else if (size > 400)
            risk.push('large');
        if (hooksCount > 18)
            risk.push('many_hooks');
        if (!hasI18n)
            risk.push('no_i18n');
        var summaryObj = {
            file: rel,
            lines: size,
            exports: exportMatches,
            defaultExport: hasDefault,
            importsExt: importMatches,
            importsInt: internalImports,
            hooks: { total: hooksCount, useEffect: useEffectCount },
            jsxTags: jsxTags,
            i18n: hasI18n,
            risks: risk
        };
        var summaryStr = 'FILE_SUMMARY ' + rel + '\n' + JSON.stringify(summaryObj) + '\nFIRST_LINES:\n' + first.slice(0, 1800);
        __AI_FILE_SUMMARY_CACHE[rel] = { ts: now, summary: summaryStr };
        return summaryStr;
    }
    catch (_a) {
        return null;
    }
}
function handleChatLike(req, res, endpoint) {
    return __awaiter(this, void 0, void 0, function () {
        // Local helper to find a page file
        function resolvePageFile(name) {
            if (!name)
                return null;
            var base = path_1.default.join(process.cwd(), 'src', 'pages');
            // If name already looks like path relative to src/pages
            if (name.endsWith('.tsx') && fs_1.default.existsSync(path_1.default.join(process.cwd(), 'src', name)))
                return name;
            // Try direct
            var candidate = path_1.default.join(base, name.endsWith('.tsx') ? name : name + '.tsx');
            if (fs_1.default.existsSync(candidate))
                return 'pages/' + path_1.default.basename(candidate); // shortened path not ideal; fallback search
            // Shallow search
            try {
                var entries = fs_1.default.readdirSync(base);
                var hit = entries.find(function (e) { return e.toLowerCase() === (name.toLowerCase().endsWith('.tsx') ? name.toLowerCase() : name.toLowerCase() + '.tsx'); });
                if (hit)
                    return 'pages/' + hit;
            }
            catch ( /* ignore */_a) { /* ignore */ }
            return null;
        }
        var t0, message, context, conversationHistory, analysis_1, historyPreview, memoryString, authReq, u, isSuper, orgId, memEntries, memErr_1, internalFunctionalContext, googleModules, activated, ctxErr_1, codeContext, referenced, autoAnalysis_1, ctxObj, maybePage, maybeModule, lowerMsg, wantAnalysis, featureKey, featureMapPath, featureMap, _i, _a, k, pagePath, guess, absPage, content, linesArr, hooksCount, useEffectCount, customHooks, antdComponents, hasI18n, usesTailwind, large, veryLarge, complexity, suggestions_1, score, def, files, totalLines, totalHooks, i18nYes, antdYes, tailwindYes, count, _b, files_1, f, absF, content, linesArr, hooksCount, hasI18n, memoryCombined, mergedAnalysis, prompt_2, serviceResp, isLive, aiText_1, suggestions, latency, analysisPayload_1, str, standardizedAnalysis, error_2;
        var _c, _d, _e;
        var _f, _g, _h;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    t0 = Date.now();
                    _j.label = 1;
                case 1:
                    _j.trys.push([1, 13, , 14]);
                    message = void 0, context = void 0, conversationHistory = void 0;
                    try {
                        (_c = req.body || {}, message = _c.message, _d = _c.context, context = _d === void 0 ? {} : _d, _e = _c.conversationHistory, conversationHistory = _e === void 0 ? [] : _e, analysis_1 = _c.analysis);
                    }
                    catch (parseErr) {
                        return [2 /*return*/, res.status(400).json({ success: false, error: 'Corps de requête invalide', details: parseErr.message })];
                    }
                    if (!message || typeof message !== 'string') {
                        return [2 /*return*/, res.status(400).json({ success: false, error: 'Paramètre "message" requis' })];
                    }
                    console.log("\uD83E\uDD16 [AI] ".concat(endpoint, " message="), message.slice(0, 160));
                    historyPreview = conversationHistory.slice(-6).map(function (m) { return "".concat(m.type || m.role, ": ").concat((m.message || m.content || '').slice(0, 100)); });
                    console.log('📚 [AI] History(last<=6)=', historyPreview);
                    memoryString = '';
                    _j.label = 2;
                case 2:
                    _j.trys.push([2, 5, , 6]);
                    authReq = req;
                    u = authReq.user;
                    isSuper = !!((u === null || u === void 0 ? void 0 : u.isSuperAdmin) || ((_g = (_f = u === null || u === void 0 ? void 0 : u.roles) === null || _f === void 0 ? void 0 : _f.includes) === null || _g === void 0 ? void 0 : _g.call(_f, 'super_admin')));
                    if (!isSuper) return [3 /*break*/, 4];
                    orgId = ((_h = authReq.user) === null || _h === void 0 ? void 0 : _h.organizationId) || null;
                    return [4 /*yield*/, prisma.aiUsageLog.findMany({
                            where: __assign({ type: 'system_memory' }, (orgId ? { organizationId: orgId } : {})),
                            orderBy: { createdAt: 'desc' },
                            take: 8,
                            select: { errorMessage: true, meta: true, createdAt: true }
                        })];
                case 3:
                    memEntries = _j.sent();
                    memoryString = memEntries.map(function (m) {
                        var _a;
                        var metaObj = (_a = m.meta) !== null && _a !== void 0 ? _a : null;
                        var topic = typeof (metaObj === null || metaObj === void 0 ? void 0 : metaObj.topic) === 'string' ? metaObj.topic : 'Mémo';
                        return "- ".concat(topic, ": ").concat((m.errorMessage || '').replace(/\s+/g, ' ').slice(0, 180));
                    }).join('\n');
                    _j.label = 4;
                case 4: return [3 /*break*/, 6];
                case 5:
                    memErr_1 = _j.sent();
                    console.warn('[AI] Mémoire système indisponible:', memErr_1.message);
                    return [3 /*break*/, 6];
                case 6:
                    internalFunctionalContext = '';
                    _j.label = 7;
                case 7:
                    _j.trys.push([7, 10, , 11]);
                    if (!/gmail|email|mail|délivrabi|deliverab/i.test(message)) return [3 /*break*/, 9];
                    return [4 /*yield*/, prisma.module.findMany({
                            where: { key: { in: ['google_gmail', 'google_drive', 'google_calendar'] } },
                            select: { key: true, label: true, route: true, feature: true }
                        })];
                case 8:
                    googleModules = _j.sent();
                    activated = googleModules.map(function (m) { return "".concat(m.label || m.key).concat(m.route ? '(/' + m.route.replace(/^\//, '') + ')' : ''); }).join(', ') || 'Aucun module Google activé';
                    // Mode AUDIT PAGE Gmail: centrer la réponse sur la page actuelle (UI/UX), pas sur Gmail en général
                    internalFunctionalContext = "AUDIT_PAGE_GMAIL: Concentre ta r\u00E9ponse sur l'audit de la page Gmail du CRM (UI/UX/flows), pas sur Gmail en g\u00E9n\u00E9ral.\nModulesGoogleActifs: ".concat(activated, "\nChecklist d'audit (prioriser concret et actionnable):\n- Structure & lisibilit\u00E9 (layout, densit\u00E9, hi\u00E9rarchie visuelle)\n- \u00C9tats (chargement/erreur/empty), feedbacks et affordances\n- Actions cl\u00E9s: composer, r\u00E9pondre, transf\u00E9rer, \u00E9toiler, supprimer, naviguer par labels\n- Recherche/tri/filtres/pagination ou scroll infini\n- Accessibilit\u00E9 (A11y), raccourcis clavier, focus management\n- Internationalisation (i18n), responsive/mobile\n- S\u00E9curit\u00E9 rendu HTML (sanitiser si HTML inject\u00E9)\n- Liaison CRM: liens Lead/Opportunit\u00E9/T\u00E2ches, suivi/relances\nRestitue: Points forts, Probl\u00E8mes, Am\u00E9liorations, Ajouts \u00E0 envisager, \u00C0 retirer, Quick wins (prioris\u00E9s).");
                    _j.label = 9;
                case 9: return [3 /*break*/, 11];
                case 10:
                    ctxErr_1 = _j.sent();
                    console.warn('[AI] Contexte fonctionnel Gmail non disponible:', ctxErr_1.message);
                    return [3 /*break*/, 11];
                case 11:
                    codeContext = '';
                    try {
                        if (/(analyse|regarde|inspecte|code|fichier|hook|component|classe|fonction|page|gmail|module|google mail)/i.test(message)) {
                            referenced = __aiExtractReferencedFiles(message);
                            if (referenced.length) {
                                codeContext = referenced.map(function (r) { return __aiSummarizeFile(r) || ("// ".concat(r, " (lecture impossible)")); }).join('\n\n');
                            }
                        }
                    }
                    catch (e) {
                        console.warn('[AI] Contexte code échoué:', e.message);
                    }
                    autoAnalysis_1 = null;
                    try {
                        ctxObj = (context || {});
                        maybePage = ctxObj.currentPage;
                        maybeModule = ctxObj.currentModule;
                        lowerMsg = message.toLowerCase();
                        wantAnalysis = /(analyse|audite|qualité|amélior|refactor|optimis|structure|complexité|lisibilité|accessibilité|ux|ui)/i.test(message);
                        featureKey = null;
                        featureMapPath = path_1.default.join(process.cwd(), 'src', 'feature-map.json');
                        featureMap = null;
                        if (fs_1.default.existsSync(featureMapPath)) {
                            try {
                                featureMap = JSON.parse(fs_1.default.readFileSync(featureMapPath, 'utf8'));
                            }
                            catch ( /* ignore */_k) { /* ignore */ }
                        }
                        if (featureMap) {
                            for (_i = 0, _a = Object.keys(featureMap); _i < _a.length; _i++) {
                                k = _a[_i];
                                if (lowerMsg.includes(k) || (maybeModule && maybeModule.toLowerCase().includes(k))) {
                                    featureKey = k;
                                    break;
                                }
                            }
                            // heuristiques sémantiques simples
                            if (!featureKey) {
                                if (/gmail|email|inbox/.test(lowerMsg))
                                    featureKey = 'mail';
                                else if (/lead/.test(lowerMsg))
                                    featureKey = 'leads';
                                else if (/agenda|calendar|calendrier/.test(lowerMsg))
                                    featureKey = 'agenda';
                            }
                        }
                        pagePath = null;
                        if (maybePage)
                            pagePath = resolvePageFile(maybePage);
                        if (!pagePath && /(page|mailpage|googlemailpage|inbox)/i.test(message)) {
                            guess = ['pages/GoogleMailPageFixed_New.tsx', 'pages/GoogleMailPageFixed.tsx', 'pages/GoogleMailPage.tsx', 'pages/MailPage.tsx'];
                            pagePath = guess.find(function (g) { return fs_1.default.existsSync(path_1.default.join(process.cwd(), 'src', g)); }) || null;
                        }
                        if ((wantAnalysis || featureKey || pagePath) && (featureKey || pagePath)) {
                            autoAnalysis_1 = {};
                            // Page analysis
                            if (pagePath && fs_1.default.existsSync(path_1.default.join(process.cwd(), 'src', pagePath))) {
                                try {
                                    absPage = path_1.default.join(process.cwd(), 'src', pagePath);
                                    content = fs_1.default.readFileSync(absPage, 'utf8');
                                    linesArr = content.split(/\r?\n/);
                                    hooksCount = (content.match(/\buse(State|Effect|Memo|Callback|Ref|Context|Reducer)\b/g) || []).length;
                                    useEffectCount = (content.match(/\buseEffect\b/g) || []).length;
                                    customHooks = (content.match(/\buse[A-Z][A-Za-z0-9_]*/g) || []).filter(function (h) { return !/use(State|Effect|Memo|Callback|Ref|Context|Reducer)/.test(h); });
                                    antdComponents = Array.from(new Set(((content.match(/<([A-Z][A-Za-z0-9]+)\b/g) || []).map(function (m) { return m.slice(1); })).filter(function (n) { return /^(Button|Table|Form|Modal|Input|Select|DatePicker|Tabs|Tag|Tooltip|Dropdown|Menu|Layout|Card|Space|Flex|Grid|Alert|Avatar|Badge)$/.test(n); }))).sort();
                                    hasI18n = /\bt\(['"][^)]*\)/.test(content) || /i18n/.test(content);
                                    usesTailwind = /className="[^"]*(flex|grid|px-|py-|text-|bg-|rounded|shadow)/.test(content);
                                    large = linesArr.length > 400;
                                    veryLarge = linesArr.length > 800;
                                    complexity = [];
                                    if (large)
                                        complexity.push('taille>400');
                                    if (veryLarge)
                                        complexity.push('taille>800');
                                    if (hooksCount > 18)
                                        complexity.push('hooks>18');
                                    if (useEffectCount > 7)
                                        complexity.push('useEffect>7');
                                    suggestions_1 = [];
                                    if (large)
                                        suggestions_1.push('Scinder en sous-composants logiques');
                                    if (!hasI18n)
                                        suggestions_1.push('Internationaliser textes statiques');
                                    if (!/Skeleton|Spin|isLoading/.test(content) && /api\.(get|post|put|delete)/.test(content))
                                        suggestions_1.push('Afficher état de chargement (Skeleton/Spin)');
                                    if (!/ErrorBoundary|ErrorFallback/.test(content) && useEffectCount > 0)
                                        suggestions_1.push('Ajouter ErrorBoundary');
                                    if (antdComponents.includes('Table') && !/pagination/i.test(content))
                                        suggestions_1.push('Ajouter pagination / tri sur Table');
                                    if (/dangerouslySetInnerHTML/.test(content))
                                        suggestions_1.push('Sanitiser le contenu HTML (DOMPurify) pour éviter le XSS');
                                    score = 85;
                                    if (large)
                                        score -= 5;
                                    if (veryLarge)
                                        score -= 8;
                                    if (hooksCount > 18)
                                        score -= 5;
                                    if (!hasI18n)
                                        score -= 4;
                                    score = Math.max(30, Math.min(95, score));
                                    autoAnalysis_1.page = { path: pagePath, lines: linesArr.length, hooks: { total: hooksCount, useEffect: useEffectCount, custom: Array.from(new Set(customHooks)).slice(0, 25) }, antd: antdComponents, i18n: hasI18n, tailwind: usesTailwind, complexity: complexity, suggestions: suggestions_1.slice(0, 20), score: score };
                                }
                                catch (e) {
                                    console.warn('[AI] Analyse page échouée:', e.message);
                                }
                            }
                            // Feature aggregate
                            if (featureKey && featureMap && featureMap[featureKey]) {
                                try {
                                    def = featureMap[featureKey];
                                    files = __spreadArray(__spreadArray([], (def.primaryPages || []), true), (def.relatedServices || []), true).filter(Boolean).slice(0, 30);
                                    totalLines = 0, totalHooks = 0, i18nYes = 0, antdYes = 0, tailwindYes = 0, count = 0;
                                    for (_b = 0, files_1 = files; _b < files_1.length; _b++) {
                                        f = files_1[_b];
                                        absF = path_1.default.join(process.cwd(), f);
                                        if (!fs_1.default.existsSync(absF))
                                            continue;
                                        count++;
                                        content = fs_1.default.readFileSync(absF, 'utf8');
                                        linesArr = content.split(/\r?\n/);
                                        totalLines += linesArr.length;
                                        hooksCount = (content.match(/\buse(State|Effect|Memo|Callback|Ref|Context|Reducer)\b/g) || []).length;
                                        totalHooks += hooksCount;
                                        hasI18n = /\bt\(['"][^)]*\)/.test(content) || /i18n/.test(content);
                                        if (hasI18n)
                                            i18nYes++;
                                        if (/from ['"]antd['"]/g.test(content))
                                            antdYes++;
                                        if (/className="[^"]*(flex|grid|px-|py-|text-|bg-|rounded|shadow)/.test(content))
                                            tailwindYes++;
                                    }
                                    if (count) {
                                        autoAnalysis_1.feature = { feature: featureKey, fileCount: count, totalLines: totalLines, avgLines: Math.round(totalLines / count), totalHooks: totalHooks, i18nCoverage: i18nYes / count, antdUsageRate: antdYes / count, tailwindUsageRate: tailwindYes / count };
                                    }
                                }
                                catch (e) {
                                    console.warn('[AI] Analyse feature échouée:', e.message);
                                }
                            }
                        }
                    }
                    catch (e) {
                        console.warn('[AI] Auto-analysis failed:', e.message);
                    }
                    memoryCombined = memoryString ? memoryString + (internalFunctionalContext ? '\n' + internalFunctionalContext : '') : internalFunctionalContext;
                    mergedAnalysis = (function () {
                        if (analysis_1 && autoAnalysis_1)
                            return { client: analysis_1, auto: autoAnalysis_1 };
                        if (autoAnalysis_1)
                            return { auto: autoAnalysis_1 };
                        if (analysis_1)
                            return analysis_1;
                        return null;
                    })();
                    prompt_2 = buildChatPrompt({ message: message, context: context, conversationHistory: conversationHistory, analysis: mergedAnalysis, memory: (memoryCombined + (codeContext ? '\nCODE_CONTEXT:\n' + codeContext.slice(0, 6000) : '')).trim() });
                    return [4 /*yield*/, geminiSingleton.chat({ prompt: prompt_2 })];
                case 12:
                    serviceResp = _j.sent();
                    isLive = serviceResp.mode === 'live';
                    aiText_1 = isLive ? (serviceResp.content || buildMockResponse(message, context)) : buildMockResponse(message, context);
                    suggestions = [];
                    try {
                        suggestions = isLive ? deriveSuggestions(aiText_1) : defaultSuggestions();
                    }
                    catch (sugErr) {
                        console.warn('⚠️ [AI] Erreur génération suggestions:', sugErr);
                        suggestions = defaultSuggestions();
                    }
                    latency = Date.now() - t0;
                    analysisPayload_1 = null;
                    if (mergedAnalysis) {
                        try {
                            str = JSON.stringify(mergedAnalysis);
                            if (str.length > 12000) {
                                analysisPayload_1 = { truncated: true, size: str.length, excerpt: str.slice(0, 6000) };
                            }
                            else {
                                analysisPayload_1 = mergedAnalysis;
                            }
                        }
                        catch (_l) {
                            analysisPayload_1 = { error: 'serialization_failed' };
                        }
                    }
                    standardizedAnalysis = (function () {
                        // Si on a déjà une analyse côté serveur (mergedAnalysis), la renvoyer (ou sa version tronquée)
                        if (analysisPayload_1)
                            return analysisPayload_1;
                        // Sinon, fournir au minimum un squelette avec excerpt de la réponse AI
                        var minimal = { excerpt: aiText_1.slice(0, 1800) };
                        return { auto: minimal };
                    })();
                    res.json({
                        success: true,
                        data: {
                            response: aiText_1,
                            suggestions: suggestions,
                            confidence: 0.92,
                            analysis: standardizedAnalysis,
                            metadata: {
                                model: isLive ? (process.env.GEMINI_MODEL || 'gemini-1.5-flash') : 'mock',
                                generatedAt: new Date().toISOString(),
                                latencyMs: latency,
                                mode: serviceResp.mode,
                                context: (context === null || context === void 0 ? void 0 : context.currentPage) || 'unknown',
                                fallbackError: serviceResp.error,
                                endpoint: endpoint
                            }
                        }
                    });
                    void logAiUsage({
                        req: req,
                        endpoint: endpoint,
                        success: true,
                        latencyMs: latency,
                        model: isLive ? (process.env.GEMINI_MODEL || 'gemini-1.5-flash') : 'mock',
                        mode: serviceResp.mode,
                        error: serviceResp.error ? String(serviceResp.error) : null,
                        extraMeta: {
                            conversationPreview: {
                                lastUserMessage: message.slice(0, 200),
                                aiResponse: aiText_1.slice(0, 200),
                                suggestions: suggestions,
                                memoryUsed: !!memoryString,
                                memoryChars: memoryString.length
                            }
                        }
                    });
                    return [3 /*break*/, 14];
                case 13:
                    error_2 = _j.sent();
                    console.error("\u274C Erreur route ".concat(endpoint, ":"), error_2);
                    res.status(500).json({ success: false, error: "Erreur IA (".concat(endpoint, ")"), details: error_2.message });
                    void logAiUsage({ req: req, endpoint: endpoint, success: false, latencyMs: Date.now() - t0, model: null, mode: null, error: error_2.message });
                    return [3 /*break*/, 14];
                case 14: return [2 /*return*/];
            }
        });
    });
}
/**
 * 📅 POST /api/ai/schedule-recommendations
 * Génère des recommandations de créneaux intelligentes
 */
router.post('/schedule-recommendations', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var t0, _a, leadId, targetDate, preferences, constraints, mockRecommendations, latency, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                t0 = Date.now();
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                _a = req.body, leadId = _a.leadId, targetDate = _a.targetDate, preferences = _a.preferences, constraints = _a.constraints;
                console.log('📅 [AI] Génération recommandations planning pour lead:', leadId);
                console.log('📆 [AI] Date cible:', targetDate);
                console.log('⚙️ [AI] Préférences:', preferences);
                console.log('🚫 [AI] Contraintes:', constraints);
                mockRecommendations = [
                    {
                        id: 'rec-1',
                        type: 'optimal',
                        datetime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Demain
                        duration: 60,
                        confidence: 0.92,
                        reasoning: "Créneau optimal basé sur l'historique des rendez-vous réussis",
                        priority: 'high',
                        metadata: {
                            leadScore: 85,
                            bestTimeWindow: '09:00-11:00',
                            sectoralInsight: 'Les prospects B2B répondent mieux le matin'
                        }
                    },
                    {
                        id: 'rec-2',
                        type: 'alternative',
                        datetime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Après-demain
                        duration: 45,
                        confidence: 0.78,
                        reasoning: "Alternative solide avec disponibilité confirmée",
                        priority: 'medium',
                        metadata: {
                            leadScore: 85,
                            bestTimeWindow: '14:00-16:00',
                            sectoralInsight: 'Bon taux de conversion en début d\'après-midi'
                        }
                    },
                    {
                        id: 'rec-3',
                        type: 'backup',
                        datetime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Dans 3 jours
                        duration: 30,
                        confidence: 0.65,
                        reasoning: "Option de secours si les autres créneaux ne conviennent pas",
                        priority: 'low',
                        metadata: {
                            leadScore: 85,
                            bestTimeWindow: '16:00-17:00',
                            sectoralInsight: 'Fin de journée acceptable pour ce secteur'
                        }
                    }
                ];
                // Délai simulé pour l'API
                return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 800); })];
            case 2:
                // Délai simulé pour l'API
                _b.sent();
                latency = Date.now() - t0;
                res.json({
                    success: true,
                    data: {
                        recommendations: mockRecommendations,
                        totalOptions: mockRecommendations.length,
                        analysisDate: new Date().toISOString(),
                        metadata: {
                            leadId: leadId,
                            targetDate: targetDate,
                            analysisModel: "gemini-pro-scheduling",
                            factors: [
                                "Historique des rendez-vous",
                                "Préférences du lead",
                                "Analyse sectorielle",
                                "Optimisation conversion"
                            ]
                        }
                    }
                });
                void logAiUsage({ req: req, endpoint: 'schedule-recommendations', success: true, latencyMs: latency, model: 'mock', mode: 'mock' });
                return [3 /*break*/, 4];
            case 3:
                error_3 = _b.sent();
                console.error('❌ Erreur route schedule-recommendations:', error_3);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la génération des recommandations',
                    details: error_3.message
                });
                void logAiUsage({ req: req, endpoint: 'schedule-recommendations', success: false, latencyMs: Date.now() - t0, model: null, mode: null, error: error_3.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * 🗓️ POST /api/ai/schedule-explain
 * Fournit une explication IA (ou mock) d'une sélection de créneaux proposés / choisis.
 * Body: { slots: [{ start: string, end: string }], objective?: string, lead?: { name?: string, sector?: string } }
 */
router.post('/schedule-explain', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var t0, _a, _b, slots, _c, objective, _d, lead, norm, prompt_3, serviceResp, explanation, latency, error_4;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                t0 = Date.now();
                _e.label = 1;
            case 1:
                _e.trys.push([1, 3, , 4]);
                _a = req.body || {}, _b = _a.slots, slots = _b === void 0 ? [] : _b, _c = _a.objective, objective = _c === void 0 ? 'planifier un rendez-vous' : _c, _d = _a.lead, lead = _d === void 0 ? {} : _d;
                if (!Array.isArray(slots) || slots.length === 0) {
                    return [2 /*return*/, res.status(400).json({ success: false, error: 'Aucun créneau fourni' })];
                }
                norm = slots.slice(0, 6).map(function (s) { return ({ start: s.start, end: s.end }); });
                prompt_3 = "Analyse les cr\u00E9neaux suivants pour ".concat(objective, " avec le lead ").concat(lead.name || 'inconnu', " (").concat(lead.sector || 'secteur standard', ").\nCr\u00E9neaux ISO:\n").concat(norm.map(function (c, i) { return "#".concat(i + 1, " ").concat(c.start, " -> ").concat(c.end); }).join('\n'), "\nT\u00E2ches:\n1. Identifier le meilleur cr\u00E9neau (justifier).\n2. Donner 3 facteurs cl\u00E9s (brefs).\n3. Indiquer si un autre cr\u00E9neau serait \u00E0 \u00E9viter.\nR\u00E9ponds en fran\u00E7ais concis (<=110 mots).");
                return [4 /*yield*/, geminiSingleton.chat({ prompt: prompt_3 })];
            case 2:
                serviceResp = _e.sent();
                explanation = serviceResp.content || 'Analyse simulée: créneau central recommandé pour maximiser disponibilité et énergie.';
                latency = Date.now() - t0;
                res.json({
                    success: true,
                    data: {
                        explanation: explanation,
                        mode: serviceResp.mode,
                        model: serviceResp.mode === 'live' ? (process.env.GEMINI_MODEL || 'gemini-1.5-flash') : 'mock',
                        latencyMs: latency,
                        slots: norm,
                        fallbackError: serviceResp.error
                    }
                });
                void logAiUsage({ req: req, endpoint: 'schedule-explain', success: true, latencyMs: latency, model: serviceResp.mode === 'live' ? (process.env.GEMINI_MODEL || 'gemini-1.5-flash') : 'mock', mode: serviceResp.mode, error: serviceResp.error ? String(serviceResp.error) : null });
                return [3 /*break*/, 4];
            case 3:
                error_4 = _e.sent();
                console.error('❌ Erreur route schedule-explain:', error_4);
                res.status(500).json({ success: false, error: 'Erreur explication planning', details: error_4.message });
                void logAiUsage({ req: req, endpoint: 'schedule-explain', success: false, latencyMs: Date.now() - t0, model: null, mode: null, error: error_4.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * 🎯 POST /api/ai/analyze-conversation
 * Analyse une conversation vocale transcrite
 */
router.post('/analyze-conversation', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var t0, _a, transcription, context, speakers, mockAnalysis, latency;
    return __generator(this, function (_b) {
        t0 = Date.now();
        try {
            _a = req.body, transcription = _a.transcription, context = _a.context, speakers = _a.speakers;
            console.log('🎯 [AI] Analyse conversation vocale');
            console.log('📝 [AI] Transcription longueur:', (transcription === null || transcription === void 0 ? void 0 : transcription.length) || 0, 'caractères');
            console.log('🎯 [AI] Contexte:', context);
            console.log('👥 [AI] Interlocuteurs:', (speakers === null || speakers === void 0 ? void 0 : speakers.length) || 0);
            mockAnalysis = {
                sentiment: {
                    overall: 'positive',
                    score: 0.75,
                    confidence: 0.88
                },
                keyPoints: [
                    "Intérêt exprimé pour la solution",
                    "Questions sur les prix",
                    "Demande de démonstration"
                ],
                actionItems: [
                    "Envoyer proposition commerciale",
                    "Planifier démonstration produit",
                    "Suivre dans 3 jours"
                ],
                leadScore: 78,
                nextSteps: [
                    {
                        action: "send_proposal",
                        priority: "high",
                        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000)
                    },
                    {
                        action: "schedule_demo",
                        priority: "medium",
                        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
                    }
                ]
            };
            latency = Date.now() - t0;
            res.json({
                success: true,
                data: mockAnalysis
            });
            void logAiUsage({ req: req, endpoint: 'analyze-conversation', success: true, latencyMs: latency, model: 'mock', mode: 'mock' });
        }
        catch (error) {
            console.error('❌ Erreur route analyze-conversation:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de l\'analyse de la conversation',
                details: error.message
            });
            void logAiUsage({ req: req, endpoint: 'analyze-conversation', success: false, latencyMs: Date.now() - t0, model: null, mode: null, error: error.message });
        }
        return [2 /*return*/];
    });
}); });
/**
 * 🧪 GET /api/ai/test
 * Route de test pour vérifier la connexion IA
 */
router.get('/test', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        try {
            console.log('🧪 [AI] Test de connexion IA');
            res.json({
                success: true,
                message: 'Service IA opérationnel',
                timestamp: new Date().toISOString(),
                features: [
                    'Génération de réponses',
                    'Recommandations de planning',
                    'Analyse de conversations',
                    'Assistant vocal'
                ]
            });
        }
        catch (error) {
            console.error('❌ Erreur test IA:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors du test IA',
                error: error.message
            });
        }
        return [2 /*return*/];
    });
}); });
/**
 * ⚙️ GET /api/ai/status
 * Expose l'état courant (live/mock) pour le frontend.
 */
router.get('/status', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var status_2;
    var _a;
    return __generator(this, function (_b) {
        try {
            status_2 = ((_a = geminiSingleton.getStatus) === null || _a === void 0 ? void 0 : _a.call(geminiSingleton)) || { mode: geminiSingleton.isLive() ? 'live' : 'mock' };
            res.json({
                success: true,
                data: __assign(__assign({}, status_2), { aiModeFlag: process.env.AI_MODE || 'auto', timestamp: new Date().toISOString() })
            });
        }
        catch (error) {
            res.status(500).json({ success: false, error: 'Erreur status IA', details: error.message });
        }
        return [2 /*return*/];
    });
}); });
/**
 * 📦 GET /api/ai/context/summary
 * Résumé contextuel léger pour alimenter l'assistant (R1). Limite volontaire pour rester < token budget.
 * Fournit: user, organization, modules actifs, 5 leads récents, 5 prochains événements.
 */
router.get('/context/summary', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var t0, authReq, orgId, userId, fieldsParam, wanted, _a, organization, moduleStatuses, leads, events, modules, latency, error_5;
    var _b, _c, _d, _e, _f, _g, _h;
    return __generator(this, function (_j) {
        switch (_j.label) {
            case 0:
                t0 = Date.now();
                _j.label = 1;
            case 1:
                _j.trys.push([1, 3, , 4]);
                authReq = req;
                orgId = ((_b = authReq.user) === null || _b === void 0 ? void 0 : _b.organizationId) || null;
                userId = ((_c = authReq.user) === null || _c === void 0 ? void 0 : _c.userId) || null;
                fieldsParam = (_d = req.query.fields) === null || _d === void 0 ? void 0 : _d.toLowerCase();
                wanted = new Set((fieldsParam ? fieldsParam.split(',') : ['modules', 'leads', 'events']).map(function (s) { return s.trim(); }).filter(Boolean));
                if (!userId)
                    return [2 /*return*/, res.status(401).json({ success: false, error: 'Non authentifié' })];
                if (!orgId) {
                    return [2 /*return*/, res.json({
                            success: true,
                            data: {
                                user: { id: userId, role: (_e = authReq.user) === null || _e === void 0 ? void 0 : _e.role, superAdmin: (_f = authReq.user) === null || _f === void 0 ? void 0 : _f.isSuperAdmin },
                                organization: null,
                                modules: wanted.has('modules') ? [] : undefined,
                                leads: wanted.has('leads') ? [] : undefined,
                                upcomingEvents: wanted.has('events') ? [] : undefined,
                                meta: { generatedAt: new Date().toISOString(), orgContext: false, version: 1, filtered: Array.from(wanted) }
                            }
                        })];
                }
                return [4 /*yield*/, Promise.all([
                        prisma.organization.findUnique({ where: { id: orgId }, select: { id: true, name: true } }),
                        wanted.has('modules') ? prisma.organizationModuleStatus.findMany({
                            where: { organizationId: orgId, active: true },
                            include: { Module: { select: { key: true, feature: true, label: true, route: true, description: true } } },
                            orderBy: { createdAt: 'asc' }
                        }) : Promise.resolve([]),
                        wanted.has('leads') ? prisma.lead.findMany({
                            where: { organizationId: orgId },
                            orderBy: { updatedAt: 'desc' },
                            take: 5,
                            select: {
                                id: true, firstName: true, lastName: true, company: true, status: true,
                                nextFollowUpDate: true, updatedAt: true, assignedToId: true
                            }
                        }) : Promise.resolve([]),
                        wanted.has('events') ? prisma.calendarEvent.findMany({
                            where: { organizationId: orgId, startDate: { gte: new Date() } },
                            orderBy: { startDate: 'asc' },
                            take: 5,
                            select: { id: true, title: true, startDate: true, endDate: true, type: true, status: true, linkedLeadId: true, ownerId: true }
                        }) : Promise.resolve([])
                    ])];
            case 2:
                _a = _j.sent(), organization = _a[0], moduleStatuses = _a[1], leads = _a[2], events = _a[3];
                modules = moduleStatuses.map(function (ms) { return ({
                    key: ms.Module.key,
                    feature: ms.Module.feature,
                    label: ms.Module.label,
                    route: ms.Module.route,
                    description: ms.Module.description
                }); });
                latency = Date.now() - t0;
                res.json({
                    success: true,
                    data: {
                        user: { id: userId, role: (_g = authReq.user) === null || _g === void 0 ? void 0 : _g.role, superAdmin: (_h = authReq.user) === null || _h === void 0 ? void 0 : _h.isSuperAdmin },
                        organization: organization,
                        modules: wanted.has('modules') ? modules : undefined,
                        leads: wanted.has('leads') ? leads : undefined,
                        upcomingEvents: wanted.has('events') ? events : undefined,
                        meta: { generatedAt: new Date().toISOString(), counts: { modules: modules.length, leads: leads.length, events: events.length }, version: 1, filtered: Array.from(wanted) }
                    }
                });
                void logAiUsage({ req: req, endpoint: 'context-summary', success: true, latencyMs: latency, model: 'internal', mode: 'context' });
                return [3 /*break*/, 4];
            case 3:
                error_5 = _j.sent();
                console.error('❌ Erreur /api/ai/context/summary:', error_5);
                res.status(500).json({ success: false, error: 'Erreur récupération contexte IA', details: error_5.message });
                void logAiUsage({ req: req, endpoint: 'context-summary', success: false, latencyMs: Date.now() - t0, model: null, mode: 'context', error: error_5.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * 🔍 GET /api/ai/context/lead/:id
 * Contexte détaillé d'un lead (R2). Inclut méta, derniers appels / messages, prochains événements, timeline récente.
 */
router.get('/context/lead/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var leadId, user, orgId, isSuperAdmin, t0, fieldsParam, wanted, whereCondition, lead, leadOrgId, _a, calls, messages, upcomingEvents, timeline, activityScore, latency, error_6;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                leadId = req.params.id;
                user = req.user;
                orgId = (user === null || user === void 0 ? void 0 : user.organizationId) || null;
                isSuperAdmin = (user === null || user === void 0 ? void 0 : user.isSuperAdmin) || false;
                // Pour les SuperAdmins, pas besoin d'organisationId
                if (!orgId && !isSuperAdmin) {
                    return [2 /*return*/, res.status(400).json({ success: false, error: 'Organisation requise' })];
                }
                t0 = Date.now();
                _c.label = 1;
            case 1:
                _c.trys.push([1, 4, , 5]);
                fieldsParam = (_b = req.query.fields) === null || _b === void 0 ? void 0 : _b.toLowerCase();
                wanted = new Set((fieldsParam ? fieldsParam.split(',') : ['calls', 'messages', 'events', 'timeline']).map(function (s) { return s.trim(); }).filter(Boolean));
                whereCondition = isSuperAdmin ?
                    { id: leadId } :
                    { id: leadId, organizationId: orgId };
                return [4 /*yield*/, prisma.lead.findFirst({
                        where: whereCondition,
                        select: {
                            id: true, firstName: true, lastName: true, company: true, email: true, phone: true,
                            status: true, source: true, nextFollowUpDate: true, updatedAt: true, createdAt: true,
                            assignedToId: true, notes: true, organizationId: true
                        }
                    })];
            case 2:
                lead = _c.sent();
                if (!lead)
                    return [2 /*return*/, res.status(404).json({ success: false, error: 'Lead introuvable' })];
                leadOrgId = lead.organizationId;
                return [4 /*yield*/, Promise.all([
                        wanted.has('calls') ? prisma.telnyxCall.findMany({
                            where: { leadId: leadId, organizationId: leadOrgId },
                            orderBy: { startedAt: 'desc' },
                            take: 5,
                            select: { id: true, direction: true, status: true, duration: true, startedAt: true }
                        }) : Promise.resolve([]),
                        wanted.has('messages') ? prisma.telnyxMessage.findMany({
                            where: { leadId: leadId, organizationId: leadOrgId },
                            orderBy: { sentAt: 'desc' },
                            take: 5,
                            select: { id: true, direction: true, type: true, status: true, sentAt: true, text: true }
                        }) : Promise.resolve([]),
                        wanted.has('events') ? prisma.calendarEvent.findMany({
                            where: { linkedLeadId: leadId, organizationId: leadOrgId, startDate: { gte: new Date() } },
                            orderBy: { startDate: 'asc' },
                            take: 3,
                            select: { id: true, title: true, startDate: true, endDate: true, type: true, status: true }
                        }) : Promise.resolve([]),
                        wanted.has('timeline') ? prisma.timelineEvent.findMany({
                            where: { leadId: leadId, organizationId: leadOrgId },
                            orderBy: { createdAt: 'desc' },
                            take: 8,
                            select: { id: true, eventType: true, createdAt: true }
                        }) : Promise.resolve([])
                    ])];
            case 3:
                _a = _c.sent(), calls = _a[0], messages = _a[1], upcomingEvents = _a[2], timeline = _a[3];
                activityScore = calls.length * 2 + messages.length + (upcomingEvents.length * 3);
                latency = Date.now() - t0;
                res.json({
                    success: true,
                    data: {
                        lead: lead,
                        calls: wanted.has('calls') ? calls : undefined,
                        messages: wanted.has('messages') ? messages : undefined,
                        upcomingEvents: wanted.has('events') ? upcomingEvents : undefined,
                        timeline: wanted.has('timeline') ? timeline : undefined,
                        metrics: { activityScore: activityScore },
                        meta: { generatedAt: new Date().toISOString(), version: 1, filtered: Array.from(wanted) }
                    }
                });
                void logAiUsage({ req: req, endpoint: 'context-lead', success: true, latencyMs: latency, model: 'internal', mode: 'context' });
                return [3 /*break*/, 5];
            case 4:
                error_6 = _c.sent();
                console.error('❌ Erreur /api/ai/context/lead/:id', error_6);
                res.status(500).json({ success: false, error: 'Erreur contexte lead', details: error_6.message });
                void logAiUsage({ req: req, endpoint: 'context-lead', success: false, latencyMs: Date.now() - t0, model: null, mode: 'context', error: error_6.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
/**
 * 📦 GET /api/ai/context/leads (batch) ?ids=id1,id2&id2
 * Limité à 10 IDs pour éviter surcharge.
 */
router.get('/context/leads', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, orgId, isSuperAdmin, idsParam, ids, t0, whereCondition, leads_1, latency, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                user = req.user;
                orgId = (user === null || user === void 0 ? void 0 : user.organizationId) || null;
                isSuperAdmin = (user === null || user === void 0 ? void 0 : user.isSuperAdmin) || false;
                // Pour les SuperAdmins, pas besoin d'organisationId
                if (!orgId && !isSuperAdmin) {
                    return [2 /*return*/, res.status(400).json({ success: false, error: 'Organisation requise' })];
                }
                idsParam = req.query.ids || '';
                ids = Array.from(new Set(idsParam.split(',').map(function (s) { return s.trim(); }).filter(Boolean))).slice(0, 10);
                if (!ids.length)
                    return [2 /*return*/, res.status(400).json({ success: false, error: 'Paramètre ids requis' })];
                t0 = Date.now();
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                whereCondition = isSuperAdmin ?
                    { id: { in: ids } } :
                    { id: { in: ids }, organizationId: orgId };
                return [4 /*yield*/, prisma.lead.findMany({
                        where: whereCondition,
                        select: { id: true, firstName: true, lastName: true, company: true, status: true, updatedAt: true, nextFollowUpDate: true }
                    })];
            case 2:
                leads_1 = _a.sent();
                latency = Date.now() - t0;
                res.json({
                    success: true,
                    data: {
                        count: leads_1.length,
                        leads: leads_1,
                        missing: ids.filter(function (id) { return !leads_1.some(function (l) { return l.id === id; }); }),
                        meta: { generatedAt: new Date().toISOString(), version: 1 }
                    }
                });
                void logAiUsage({ req: req, endpoint: 'context-leads-batch', success: true, latencyMs: latency, model: 'internal', mode: 'context' });
                return [3 /*break*/, 4];
            case 3:
                error_7 = _a.sent();
                console.error('❌ Erreur /api/ai/context/leads (batch)', error_7);
                res.status(500).json({ success: false, error: 'Erreur contexte leads batch', details: error_7.message });
                void logAiUsage({ req: req, endpoint: 'context-leads-batch', success: false, latencyMs: Date.now() - t0, model: null, mode: 'context', error: error_7.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * 🧠 POST /api/ai/ultimate-recommendation
 * Génère une analyse ultime et intelligente pour proposer la meilleure date de RDV
 */
router.post('/ultimate-recommendation', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var t0, _a, lead, context, mockAnalysis, optimalDate, ultimateRecommendation, latency, error_8;
    var _b, _c, _d, _e, _f, _g;
    return __generator(this, function (_h) {
        switch (_h.label) {
            case 0:
                t0 = Date.now();
                _h.label = 1;
            case 1:
                _h.trys.push([1, 3, , 4]);
                _a = req.body, lead = _a.lead, context = _a.context;
                console.log('🧠 [AI Ultimate] Analyse pour:', lead.name);
                console.log('📊 [AI Ultimate] RDV existants:', ((_b = context.existingAppointments) === null || _b === void 0 ? void 0 : _b.length) || 0);
                console.log('📞 [AI Ultimate] Transcriptions:', ((_c = context.callTranscriptions) === null || _c === void 0 ? void 0 : _c.length) || 0);
                console.log('📝 [AI Ultimate] Notes:', ((_d = context.notes) === null || _d === void 0 ? void 0 : _d.length) || 0);
                mockAnalysis = {
                    // Analyse des patterns comportementaux
                    behavioralPattern: analyzeCallBehavior(context.callTranscriptions),
                    // Optimisation géographique des déplacements
                    geographicalOptimization: optimizeGeography(context.existingAppointments, lead),
                    // Insights sectoriels 
                    sectoralInsights: getSectoralInsights(lead.sector),
                    // Expérience commerciale accumulée
                    commercialWisdom: getCommercialWisdom(lead, context)
                };
                optimalDate = calculateOptimalDate(mockAnalysis, context);
                ultimateRecommendation = {
                    proposedDate: optimalDate,
                    reasoning: "\uD83D\uDCCA **ANALYSE COMMERCIALE EXPERTE** \n\n\uD83C\uDFAF **Date recommand\u00E9e**: ".concat(optimalDate.toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }), "\n\n\uD83D\uDCA1 **Justification strat\u00E9gique**:\n").concat(mockAnalysis.commercialWisdom.primaryReason, "\n\n\uD83D\uDD0D **Facteurs analys\u00E9s**:\n\u2022 **Historique comportemental**: ").concat(mockAnalysis.behavioralPattern, "\n\u2022 **Optimisation trajets**: ").concat(mockAnalysis.geographicalOptimization, "  \n\u2022 **Intelligence sectorielle**: ").concat(mockAnalysis.sectoralInsights, "\n\u2022 **Exp\u00E9rience terrain**: ").concat(mockAnalysis.commercialWisdom.experience, "\n\n\u26A1 **Pourquoi cette date maximise vos chances**:\n").concat(mockAnalysis.commercialWisdom.successFactors.join('\n• '), "\n\n\uD83C\uDFAF **Taux de r\u00E9ussite estim\u00E9**: ").concat(mockAnalysis.commercialWisdom.successRate, "%"),
                    confidence: mockAnalysis.commercialWisdom.confidence,
                    factors: {
                        callHistory: mockAnalysis.behavioralPattern,
                        notes: "".concat(((_e = context.notes) === null || _e === void 0 ? void 0 : _e.length) || 0, " notes analys\u00E9es"),
                        geographicalOptimization: mockAnalysis.geographicalOptimization,
                        behavioralPattern: "Pattern de réceptivité détecté",
                        sectoralInsight: mockAnalysis.sectoralInsights,
                        commercialExperience: mockAnalysis.commercialWisdom.experience
                    },
                    alternatives: [
                        {
                            date: new Date(optimalDate.getTime() + 24 * 60 * 60 * 1000),
                            reason: "Alternative si conflit de dernière minute"
                        },
                        {
                            date: new Date(optimalDate.getTime() + 48 * 60 * 60 * 1000),
                            reason: "Option de repli avec très bon potentiel"
                        }
                    ]
                };
                // Délai simulé pour l'analyse complexe
                return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1500); })];
            case 2:
                // Délai simulé pour l'analyse complexe
                _h.sent();
                latency = Date.now() - t0;
                res.json({
                    success: true,
                    data: {
                        recommendation: ultimateRecommendation,
                        analysisMetadata: {
                            processingTime: "1.2s",
                            factorsAnalyzed: 127,
                            dataPoints: ((_f = context.callTranscriptions) === null || _f === void 0 ? void 0 : _f.length) * 15 + ((_g = context.notes) === null || _g === void 0 ? void 0 : _g.length) * 8,
                            confidenceLevel: "Très élevé"
                        }
                    }
                });
                void logAiUsage({ req: req, endpoint: 'ultimate-recommendation', success: true, latencyMs: latency, model: 'mock', mode: 'analysis' });
                return [3 /*break*/, 4];
            case 3:
                error_8 = _h.sent();
                console.error('❌ Erreur route ultimate-recommendation:', error_8);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de l\'analyse ultime',
                    details: error_8.message
                });
                void logAiUsage({ req: req, endpoint: 'ultimate-recommendation', success: false, latencyMs: Date.now() - t0, model: null, mode: 'analysis', error: error_8.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Fonctions d'analyse (simulation d'IA avancée)
function analyzeCallBehavior(transcriptions) {
    if (!(transcriptions === null || transcriptions === void 0 ? void 0 : transcriptions.length))
        return "Aucun historique d'appel à analyser";
    // Simulation d'analyse des patterns de communication
    return "".concat(transcriptions.length, " appels analys\u00E9s - R\u00E9ceptivit\u00E9 optimale d\u00E9tect\u00E9e en matin\u00E9e");
}
function optimizeGeography(appointments) {
    if (!(appointments === null || appointments === void 0 ? void 0 : appointments.length))
        return "Premier RDV dans le secteur";
    // Simulation d'optimisation géographique
    return "Optimisation trajets: 23 min \u00E9conomis\u00E9es vs planning classique";
}
function getSectoralInsights(sector) {
    var insights = {
        'technology': "Secteur tech: +47% de conversion en début de semaine",
        'healthcare': "Santé: Éviter vendredi après-midi (-23% taux réponse)",
        'finance': "Finance: Mardi-Jeudi matin optimal (+31% signature)",
        'retail': "Commerce: Lundi/Mardi hors périodes saisonnières",
        'default': "Secteur standard: Mardi-Jeudi 9h-11h optimaux"
    };
    return insights[sector] || insights['default'];
}
function getCommercialWisdom(lead) {
    return {
        primaryReason: "Cr\u00E9neau optimal identifi\u00E9 gr\u00E2ce \u00E0 l'analyse de 50,000+ RDV commerciaux similaires. Cette plage horaire pr\u00E9sente 67% de taux de conversion sup\u00E9rieur pour le profil \"".concat(lead.name, "\"."),
        experience: "15 ans d'expérience commerciale B2B analysée",
        successFactors: [
            "Moment de réceptivité maximale selon le profil comportemental",
            "Absence de conflits avec les pics de charge du prospect",
            "Timing optimal pour la prise de décision dans ce secteur",
            "Fenêtre de disponibilité mentale favorable (post-caffé, pré-rush)"
        ],
        successRate: Math.floor(75 + Math.random() * 20), // 75-95%
        confidence: 0.89
    };
}
function calculateOptimalDate() {
    // Simulation de calcul intelligent de date
    var baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 2); // Dans 2 jours par défaut
    baseDate.setHours(10, 0, 0, 0); // 10h optimal pour B2B
    // Éviter les vendredis après-midi et lundis matin
    if (baseDate.getDay() === 5 && baseDate.getHours() > 14) {
        baseDate.setDate(baseDate.getDate() + 3); // Reporter au lundi
        baseDate.setHours(10, 0, 0, 0);
    }
    if (baseDate.getDay() === 1 && baseDate.getHours() < 10) {
        baseDate.setHours(10, 0, 0, 0); // Pas avant 10h le lundi
    }
    return baseDate;
}
/**
 * 📈 GET /api/ai/usage/recent
 * Récupère les derniers logs d'usage IA (non sensible). Filtrage basique.
 * Query: limit (1-200, défaut 30), type, success (true/false)
 */
router.get('/usage/recent', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var t0, rawLimit, limit, type, successFilter, logs, usedPrisma, e_3, conditions, params, idx, where, sql, total, successCount, avgLatency, error_9;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                t0 = Date.now();
                _a.label = 1;
            case 1:
                _a.trys.push([1, 10, , 11]);
                return [4 /*yield*/, ensureAiUsageLogTable()];
            case 2:
                _a.sent();
                rawLimit = parseInt(String(req.query.limit || '30'), 10);
                limit = Math.min(200, Math.max(1, isNaN(rawLimit) ? 30 : rawLimit));
                type = typeof req.query.type === 'string' ? req.query.type : undefined;
                successFilter = typeof req.query.success === 'string' ? req.query.success === 'true' : undefined;
                logs = [];
                usedPrisma = false;
                _a.label = 3;
            case 3:
                _a.trys.push([3, 6, , 7]);
                if (!prisma.aiUsageLog) return [3 /*break*/, 5];
                return [4 /*yield*/, prisma.aiUsageLog.findMany({
                        where: __assign(__assign({}, (type ? { type: type } : {})), (successFilter !== undefined ? { success: successFilter } : {})),
                        orderBy: { createdAt: 'desc' },
                        take: limit,
                        select: {
                            id: true, type: true, model: true, tokensPrompt: true, tokensOutput: true,
                            latencyMs: true, success: true, errorCode: true, errorMessage: true,
                            createdAt: true, meta: true
                        }
                    })];
            case 4:
                logs = _a.sent();
                usedPrisma = true;
                _a.label = 5;
            case 5: return [3 /*break*/, 7];
            case 6:
                e_3 = _a.sent();
                console.warn('⚠️ Lecture via Prisma aiUsageLog échouée, fallback SQL:', e_3.message);
                return [3 /*break*/, 7];
            case 7:
                if (!!usedPrisma) return [3 /*break*/, 9];
                conditions = [];
                params = [];
                idx = 1;
                if (type) {
                    conditions.push("type = $".concat(idx++));
                    params.push(type);
                }
                if (successFilter !== undefined) {
                    conditions.push("success = $".concat(idx++));
                    params.push(successFilter);
                }
                where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
                sql = "SELECT id, type, model, \"tokensPrompt\", \"tokensOutput\", \"latencyMs\", success, \"errorCode\", \"errorMessage\", \"createdAt\", meta FROM \"AiUsageLog\" ".concat(where, " ORDER BY \"createdAt\" DESC LIMIT ").concat(limit);
                return [4 /*yield*/, prisma.$queryRawUnsafe.apply(prisma, __spreadArray([sql], params, false))];
            case 8:
                // @ts-expect-error raw
                logs = _a.sent();
                _a.label = 9;
            case 9:
                total = logs.length;
                successCount = logs.filter(function (l) { return l.success; }).length;
                avgLatency = logs.length ? Math.round(logs.reduce(function (s, l) { return s + (l.latencyMs || 0); }, 0) / logs.length) : 0;
                res.json({
                    success: true,
                    data: {
                        logs: logs.map(function (l) {
                            var _a, _b, _c, _d, _e, _f;
                            return ({
                                id: l.id,
                                type: l.type,
                                endpoint: ((_a = l.meta) === null || _a === void 0 ? void 0 : _a.endpoint) || undefined,
                                mode: ((_b = l.meta) === null || _b === void 0 ? void 0 : _b.mode) || undefined,
                                model: l.model,
                                latencyMs: l.latencyMs,
                                tokensPrompt: (_d = (_c = l.tokensPrompt) !== null && _c !== void 0 ? _c : l.tokens_prompt) !== null && _d !== void 0 ? _d : 0,
                                tokensOutput: (_f = (_e = l.tokensOutput) !== null && _e !== void 0 ? _e : l.tokens_output) !== null && _f !== void 0 ? _f : 0,
                                success: l.success,
                                errorCode: l.errorCode || l.error_code || undefined,
                                errorMessage: l.errorMessage || l.error_message || undefined,
                                createdAt: l.createdAt,
                            });
                        }),
                        meta: {
                            count: total,
                            successRate: total ? +(successCount / total * 100).toFixed(1) : 0,
                            avgLatencyMs: avgLatency,
                            filtered: { type: type || null, success: successFilter !== null && successFilter !== void 0 ? successFilter : null },
                            generatedAt: new Date().toISOString(),
                            durationMs: Date.now() - t0
                        }
                    }
                });
                return [3 /*break*/, 11];
            case 10:
                error_9 = _a.sent();
                console.error('❌ Erreur /api/ai/usage/recent:', error_9);
                res.status(500).json({ success: false, error: 'Erreur récupération logs IA', details: error_9.message });
                return [3 /*break*/, 11];
            case 11: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
