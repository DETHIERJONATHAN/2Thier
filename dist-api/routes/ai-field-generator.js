"use strict";
/**
 * 🤖 AI FIELD GENERATOR - ROUTE INTELLIGENTE
 *
 * Génère du contenu intelligent pour n'importe quel champ du Website Builder
 * avec analyse de contexte, propositions multiples, et scoring de qualité.
 *
 * Endpoint: POST /api/ai/generate-field
 *
 * @author IA Assistant - Système de génération intelligent
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var auth_1 = require("../middlewares/auth");
var GoogleGeminiService_1 = require("../services/GoogleGeminiService");
var router = express_1.default.Router();
var geminiService = new GoogleGeminiService_1.GoogleGeminiService();
// Protection par authentification
router.use(auth_1.authMiddleware);
/**
 * 🎯 SYSTÈME DE PROMPTS INTELLIGENTS
 * Adapte le prompt selon le type de champ pour des résultats optimaux
 */
var SmartPromptBuilder = /** @class */ (function () {
    function SmartPromptBuilder() {
    }
    /**
     * Construit un prompt optimisé selon le type de champ
     */
    SmartPromptBuilder.buildPrompt = function (params) {
        var _a;
        var fieldId = params.fieldId, fieldType = params.fieldType, fieldLabel = params.fieldLabel, currentValue = params.currentValue, aiContext = params.aiContext;
        var language = aiContext.language || 'français';
        var tone = aiContext.tone || 'professionnel et convaincant';
        var audience = aiContext.targetAudience || 'clients potentiels';
        var business = aiContext.businessType || 'services énergétiques';
        var keywords = ((_a = aiContext.keywords) === null || _a === void 0 ? void 0 : _a.join(', ')) || '';
        // Contexte enrichi pour tous les types
        var baseContext = "\nTu es un expert en r\u00E9daction web, marketing digital et SEO pour le secteur ".concat(business, ".\n\nCONTEXTE:\n- Type de section: ").concat(aiContext.sectionType, "\n- Champ \u00E0 g\u00E9n\u00E9rer: ").concat(fieldLabel, " (").concat(fieldId, ")\n- Public cible: ").concat(audience, "\n- Ton: ").concat(tone, "\n- Langue: ").concat(language, "\n").concat(keywords ? "- Mots-cl\u00E9s sugg\u00E9r\u00E9s: ".concat(keywords) : '', "\n").concat(currentValue ? "- Valeur actuelle: \"".concat(currentValue, "\"") : '', "\n");
        // Prompts spécialisés selon le type de champ
        switch (fieldType) {
            case 'text':
                return this.buildTextPrompt(baseContext, fieldId, fieldLabel, currentValue);
            case 'textarea':
                return this.buildTextareaPrompt(baseContext, fieldId, fieldLabel, currentValue);
            case 'select':
            case 'multiselect':
                return this.buildSelectPrompt(baseContext, fieldId, fieldLabel, currentValue);
            case 'richtext':
                return this.buildRichtextPrompt(baseContext, fieldId, fieldLabel, currentValue);
            default:
                return this.buildGenericPrompt(baseContext, fieldLabel, currentValue);
        }
    };
    /**
     * Prompt pour champs texte courts (titres, labels, CTA)
     */
    SmartPromptBuilder.buildTextPrompt = function (context, fieldId, label, current) {
        // Détection du type de contenu par l'ID du champ
        var isTitle = fieldId.toLowerCase().includes('title') || label.toLowerCase().includes('titre');
        var isCTA = fieldId.toLowerCase().includes('cta') || label.toLowerCase().includes('bouton');
        var isLabel = fieldId.toLowerCase().includes('label');
        var specificGuidelines = '';
        var maxLength = 60;
        if (isTitle) {
            specificGuidelines = "\nGUIDELINES SP\u00C9CIFIQUES TITRE:\n- Accrocheur et m\u00E9morable\n- Orient\u00E9 b\u00E9n\u00E9fice client\n- Inclure un chiffre ou statistique si pertinent\n- \u00C9voquer la transformation ou le r\u00E9sultat\n- Cr\u00E9er de la curiosit\u00E9 ou urgence\n";
            maxLength = 60;
        }
        else if (isCTA) {
            specificGuidelines = "\nGUIDELINES SP\u00C9CIFIQUES CTA:\n- Verbe d'action \u00E0 l'imp\u00E9ratif\n- Court et percutant (3-5 mots maximum)\n- Cr\u00E9er l'urgence ou la valeur\n- Exemples: \"Demander un devis gratuit\", \"D\u00E9couvrir nos solutions\", \"Calculer mes \u00E9conomies\"\n";
            maxLength = 40;
        }
        else if (isLabel) {
            specificGuidelines = "\nGUIDELINES SP\u00C9CIFIQUES LABEL:\n- Clair et descriptif\n- Terme professionnel mais accessible\n- Coh\u00E9rent avec le secteur\n";
            maxLength = 40;
        }
        return "".concat(context, "\n\n").concat(specificGuidelines, "\n\nT\u00C2CHE: G\u00E9n\u00E8re 3 PROPOSITIONS VARI\u00C9ES pour ce champ texte court.\n\nCONTRAINTES:\n- Maximum ").concat(maxLength, " caract\u00E8res par proposition\n- Ton professionnel et convaincant\n- Optimis\u00E9 SEO naturellement\n- \u00C9viter les clich\u00E9s et phrases creuses\n- Vari\u00E9t\u00E9 dans les approches (angle diff\u00E9rent pour chaque proposition)\n\nRetourne UNIQUEMENT un objet JSON valide avec cette structure:\n{\n  \"suggestions\": [\n    {\n      \"content\": \"Proposition 1\",\n      \"reasoning\": \"Pourquoi cette proposition (1 phrase)\",\n      \"score\": 85\n    },\n    {\n      \"content\": \"Proposition 2\", \n      \"reasoning\": \"Pourquoi cette proposition (1 phrase)\",\n      \"score\": 90\n    },\n    {\n      \"content\": \"Proposition 3\",\n      \"reasoning\": \"Pourquoi cette proposition (1 phrase)\", \n      \"score\": 80\n    }\n  ],\n  \"analysis\": {\n    \"fieldType\": \"").concat(fieldId, "\",\n    \"bestApproach\": \"Approche recommand\u00E9e (1 phrase)\",\n    \"keywords\": [\"mot-cl\u00E9 1\", \"mot-cl\u00E9 2\", \"mot-cl\u00E9 3\"],\n    \"avgScore\": 85\n  }\n}\n\n\u26A0\uFE0F IMPORTANT: Retourne UNIQUEMENT le JSON, aucun texte avant ou apr\u00E8s.");
    };
    /**
     * Prompt pour champs textarea (descriptions, paragraphes)
     */
    SmartPromptBuilder.buildTextareaPrompt = function (context, fieldId, label, current) {
        var isDescription = fieldId.toLowerCase().includes('description') || label.toLowerCase().includes('description');
        var isAbout = fieldId.toLowerCase().includes('about') || label.toLowerCase().includes('présentation');
        var specificGuidelines = '';
        var maxLength = 200;
        if (isDescription) {
            specificGuidelines = "\nGUIDELINES SP\u00C9CIFIQUES DESCRIPTION:\n- 2-3 phrases persuasives\n- Structure: Probl\u00E8me \u2192 Solution \u2192 B\u00E9n\u00E9fice\n- Inclure des chiffres/donn\u00E9es si pertinent\n- Call-to-action implicite\n- Optimis\u00E9 pour la conversion\n";
            maxLength = 200;
        }
        else if (isAbout) {
            specificGuidelines = "\nGUIDELINES SP\u00C9CIFIQUES \u00C0 PROPOS:\n- 3-4 phrases engageantes\n- Histoire/mission de l'entreprise\n- Valeurs et diff\u00E9renciateurs\n- Preuve sociale ou chiffres cl\u00E9s\n- Cr\u00E9er la confiance\n";
            maxLength = 300;
        }
        return "".concat(context, "\n\n").concat(specificGuidelines, "\n\nT\u00C2CHE: G\u00E9n\u00E8re 3 PROPOSITIONS VARI\u00C9ES pour ce champ texte long.\n\nCONTRAINTES:\n- Maximum ").concat(maxLength, " caract\u00E8res par proposition\n- Style fluide et naturel\n- Ponctuation et structure professionnelle\n- Int\u00E9gration naturelle des mots-cl\u00E9s\n- \u00C9viter le jargon excessif\n- Vari\u00E9t\u00E9 dans les angles (rationnel, \u00E9motionnel, social proof)\n\nRetourne UNIQUEMENT un objet JSON valide avec cette structure:\n{\n  \"suggestions\": [\n    {\n      \"content\": \"Proposition 1 (2-3 phrases)\",\n      \"reasoning\": \"Pourquoi cette proposition (1 phrase)\",\n      \"score\": 88,\n      \"angle\": \"angle rationnel / \u00E9motionnel / social proof\"\n    },\n    {\n      \"content\": \"Proposition 2 (2-3 phrases)\",\n      \"reasoning\": \"Pourquoi cette proposition (1 phrase)\",\n      \"score\": 92,\n      \"angle\": \"angle rationnel / \u00E9motionnel / social proof\"\n    },\n    {\n      \"content\": \"Proposition 3 (2-3 phrases)\",\n      \"reasoning\": \"Pourquoi cette proposition (1 phrase)\",\n      \"score\": 85,\n      \"angle\": \"angle rationnel / \u00E9motionnel / social proof\"\n    }\n  ],\n  \"analysis\": {\n    \"fieldType\": \"").concat(fieldId, "\",\n    \"bestApproach\": \"Approche recommand\u00E9e (1 phrase)\",\n    \"keywords\": [\"mot-cl\u00E9 1\", \"mot-cl\u00E9 2\", \"mot-cl\u00E9 3\", \"mot-cl\u00E9 4\"],\n    \"avgScore\": 88,\n    \"readabilityTips\": [\"Conseil 1\", \"Conseil 2\"]\n  }\n}\n\n\u26A0\uFE0F IMPORTANT: Retourne UNIQUEMENT le JSON, aucun texte avant ou apr\u00E8s.");
    };
    /**
     * Prompt pour champs select/multiselect (features, tags, options)
     */
    SmartPromptBuilder.buildSelectPrompt = function (context, fieldId, label, current) {
        var isFeatures = fieldId.toLowerCase().includes('feature') || label.toLowerCase().includes('caractéristique');
        var isTags = fieldId.toLowerCase().includes('tag') || label.toLowerCase().includes('étiquette');
        var isBenefits = fieldId.toLowerCase().includes('benefit') || label.toLowerCase().includes('avantage');
        var specificGuidelines = '';
        var itemCount = 4;
        if (isFeatures) {
            specificGuidelines = "\nGUIDELINES SP\u00C9CIFIQUES FEATURES:\n- Caract\u00E9ristiques techniques ET b\u00E9n\u00E9fices\n- Format: \"B\u00E9n\u00E9fice concret + d\u00E9tail technique\"\n- Exemples: \"Garantie 25 ans sur les panneaux\", \"Installation en 2 jours chrono\"\n- M\u00E9langer aspects techniques, pratiques, et commerciaux\n";
            itemCount = 4;
        }
        else if (isTags) {
            specificGuidelines = "\nGUIDELINES SP\u00C9CIFIQUES TAGS:\n- Mots-cl\u00E9s courts (1-3 mots)\n- Descriptifs et recherchables\n- Mix: technique + cat\u00E9gorie + b\u00E9n\u00E9fice\n- Exemples: \"\u00C9nergie verte\", \"R\u00E9sidentiel\", \"Haute performance\"\n";
            itemCount = 5;
        }
        else if (isBenefits) {
            specificGuidelines = "\nGUIDELINES SP\u00C9CIFIQUES AVANTAGES:\n- Orient\u00E9 r\u00E9sultat client\n- Quantifiable si possible\n- \u00C9motionnel + rationnel\n- Exemples: \"R\u00E9duisez vos factures de 60%\", \"Installation garantie d\u00E9cennale\"\n";
            itemCount = 4;
        }
        return "".concat(context, "\n\n").concat(specificGuidelines, "\n\nT\u00C2CHE: G\u00E9n\u00E8re ").concat(itemCount, " ITEMS PERTINENTS ET VARI\u00C9S pour ce champ liste.\n\nCONTRAINTES:\n- ").concat(itemCount, " items par proposition\n- Chaque item: 5-12 mots maximum\n- Coh\u00E9rence et compl\u00E9mentarit\u00E9 entre les items\n- \u00C9viter les r\u00E9p\u00E9titions\n- Mix de types: technique, pratique, \u00E9motionnel, chiffr\u00E9\n\nRetourne UNIQUEMENT un objet JSON valide avec cette structure:\n{\n  \"suggestions\": [\n    {\n      \"content\": [\"Item 1\", \"Item 2\", \"Item 3\", \"Item 4\"],\n      \"reasoning\": \"Logique de s\u00E9lection (1 phrase)\",\n      \"score\": 87\n    },\n    {\n      \"content\": [\"Item 1\", \"Item 2\", \"Item 3\", \"Item 4\"],\n      \"reasoning\": \"Logique de s\u00E9lection (1 phrase)\",\n      \"score\": 91\n    },\n    {\n      \"content\": [\"Item 1\", \"Item 2\", \"Item 3\", \"Item 4\"],\n      \"reasoning\": \"Logique de s\u00E9lection (1 phrase)\",\n      \"score\": 84\n    }\n  ],\n  \"analysis\": {\n    \"fieldType\": \"").concat(fieldId, "\",\n    \"bestApproach\": \"Approche recommand\u00E9e (1 phrase)\",\n    \"keywords\": [\"mot-cl\u00E9 1\", \"mot-cl\u00E9 2\", \"mot-cl\u00E9 3\"],\n    \"avgScore\": 87\n  }\n}\n\n\u26A0\uFE0F IMPORTANT: Retourne UNIQUEMENT le JSON, aucun texte avant ou apr\u00E8s.");
    };
    /**
     * Prompt pour richtext (contenu HTML/Markdown enrichi)
     */
    SmartPromptBuilder.buildRichtextPrompt = function (context, fieldId, label, current) {
        return "".concat(context, "\n\nT\u00C2CHE: G\u00E9n\u00E8re 2 PROPOSITIONS VARI\u00C9ES de contenu enrichi (paragraphes structur\u00E9s).\n\nCONTRAINTES:\n- 2-4 paragraphes par proposition\n- Structure: Intro \u2192 D\u00E9veloppement \u2192 Conclusion/CTA\n- Ton professionnel et engageant\n- Int\u00E9gration naturelle des mots-cl\u00E9s\n- Lisibilit\u00E9 optimale (phrases courtes, transitions)\n\nRetourne UNIQUEMENT un objet JSON valide avec cette structure:\n{\n  \"suggestions\": [\n    {\n      \"content\": \"Paragraphe 1\n\nParagraphe 2\n\nParagraphe 3\",\n      \"reasoning\": \"Pourquoi cette proposition (1 phrase)\",\n      \"score\": 89,\n      \"structure\": \"intro + b\u00E9n\u00E9fices + preuve sociale\"\n    },\n    {\n      \"content\": \"Paragraphe 1\n\nParagraphe 2\n\nParagraphe 3\",\n      \"reasoning\": \"Pourquoi cette proposition (1 phrase)\",\n      \"score\": 92,\n      \"structure\": \"probl\u00E8me + solution + r\u00E9sultats\"\n    }\n  ],\n  \"analysis\": {\n    \"fieldType\": \"").concat(fieldId, "\",\n    \"bestApproach\": \"Approche recommand\u00E9e (1 phrase)\",\n    \"keywords\": [\"mot-cl\u00E9 1\", \"mot-cl\u00E9 2\", \"mot-cl\u00E9 3\", \"mot-cl\u00E9 4\"],\n    \"avgScore\": 90,\n    \"readabilityScore\": 85\n  }\n}\n\n\u26A0\uFE0F IMPORTANT: Retourne UNIQUEMENT le JSON, aucun texte avant ou apr\u00E8s.");
    };
    /**
     * Prompt générique pour types inconnus
     */
    SmartPromptBuilder.buildGenericPrompt = function (context, label, current) {
        return "".concat(context, "\n\nT\u00C2CHE: G\u00E9n\u00E8re 3 PROPOSITIONS PERTINENTES pour le champ \"").concat(label, "\".\n\nRetourne UNIQUEMENT un objet JSON valide avec cette structure:\n{\n  \"suggestions\": [\n    {\n      \"content\": \"Proposition 1\",\n      \"reasoning\": \"Pourquoi cette proposition (1 phrase)\",\n      \"score\": 85\n    },\n    {\n      \"content\": \"Proposition 2\",\n      \"reasoning\": \"Pourquoi cette proposition (1 phrase)\",\n      \"score\": 88\n    },\n    {\n      \"content\": \"Proposition 3\",\n      \"reasoning\": \"Pourquoi cette proposition (1 phrase)\",\n      \"score\": 82\n    }\n  ],\n  \"analysis\": {\n    \"fieldType\": \"").concat(label, "\",\n    \"bestApproach\": \"Approche recommand\u00E9e (1 phrase)\",\n    \"keywords\": [\"mot-cl\u00E9 1\", \"mot-cl\u00E9 2\", \"mot-cl\u00E9 3\"],\n    \"avgScore\": 85\n  }\n}\n\n\u26A0\uFE0F IMPORTANT: Retourne UNIQUEMENT le JSON, aucun texte avant ou apr\u00E8s.");
    };
    return SmartPromptBuilder;
}());
/**
 * 📊 ANALYSEUR DE QUALITÉ
 * Évalue la qualité des suggestions générées
 */
var QualityAnalyzer = /** @class */ (function () {
    function QualityAnalyzer() {
    }
    /**
     * Analyse et enrichit les suggestions avec des métriques
     */
    QualityAnalyzer.analyzeSuggestions = function (response, fieldType) {
        try {
            // Calcul du score moyen
            var scores = response.suggestions.map(function (s) { return s.score || 0; });
            var avgScore = scores.length > 0
                ? Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length)
                : 0;
            // Tri des suggestions par score
            response.suggestions.sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
            // Enrichissement de l'analyse
            response.analysis = __assign(__assign({}, response.analysis), { avgScore: avgScore, generatedAt: new Date().toISOString(), fieldType: fieldType, qualityLevel: avgScore >= 90 ? 'excellent' : avgScore >= 80 ? 'good' : avgScore >= 70 ? 'acceptable' : 'needs-improvement' });
            return response;
        }
        catch (error) {
            console.error('❌ [QualityAnalyzer] Erreur analyse:', error);
            return response;
        }
    };
    return QualityAnalyzer;
}());
/**
 * 🎯 ENDPOINT PRINCIPAL: POST /api/ai/generate-field
 */
router.post('/generate-field', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var startTime, _a, fieldId, fieldType, fieldLabel, currentValue, aiContext, prompt_1, geminiResult, jsonMatch, parsedResponse, duration, modelUsed, error_1, duration;
    var _b, _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                startTime = Date.now();
                _f.label = 1;
            case 1:
                _f.trys.push([1, 3, , 4]);
                _a = req.body, fieldId = _a.fieldId, fieldType = _a.fieldType, fieldLabel = _a.fieldLabel, currentValue = _a.currentValue, aiContext = _a.aiContext;
                // ✅ Validation des paramètres
                if (!fieldId || !fieldType || !fieldLabel) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            error: 'Paramètres manquants',
                            details: 'fieldId, fieldType et fieldLabel sont requis'
                        })];
                }
                if (!aiContext || !aiContext.sectionType) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            error: 'Contexte IA manquant',
                            details: 'aiContext.sectionType est requis'
                        })];
                }
                console.log('🤖 [AI] Génération pour:', {
                    fieldId: fieldId,
                    fieldType: fieldType,
                    fieldLabel: fieldLabel,
                    sectionType: aiContext.sectionType
                });
                prompt_1 = SmartPromptBuilder.buildPrompt({
                    fieldId: fieldId,
                    fieldType: fieldType,
                    fieldLabel: fieldLabel,
                    currentValue: currentValue,
                    aiContext: aiContext
                });
                console.log('📝 [AI] Prompt construit, appel à Gemini...');
                return [4 /*yield*/, geminiService.chat({ prompt: prompt_1, raw: true })];
            case 2:
                geminiResult = _f.sent();
                if (!geminiResult.success || !geminiResult.content) {
                    throw new Error(geminiResult.error || 'Erreur lors de l\'appel à Gemini');
                }
                console.log('✅ [AI] Réponse brute reçue:', geminiResult.content.substring(0, 200));
                jsonMatch = geminiResult.content.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error('Format de réponse invalide: JSON non trouvé dans la réponse IA');
                }
                parsedResponse = JSON.parse(jsonMatch[0]);
                // 📈 Analyse de qualité
                parsedResponse = QualityAnalyzer.analyzeSuggestions(parsedResponse, fieldType);
                duration = Date.now() - startTime;
                modelUsed = geminiResult.model || geminiService.getStatus().model;
                console.log("\u2705 [AI] G\u00E9n\u00E9ration r\u00E9ussie en ".concat(duration, "ms, score moyen: ").concat(parsedResponse.analysis.avgScore, "/100"));
                // 🎉 Réponse structurée
                return [2 /*return*/, res.json({
                        success: true,
                        content: (_b = parsedResponse.suggestions[0]) === null || _b === void 0 ? void 0 : _b.content, // Meilleure suggestion par défaut
                        suggestions: parsedResponse.suggestions,
                        analysis: parsedResponse.analysis,
                        metadata: {
                            generatedAt: new Date().toISOString(),
                            duration: duration,
                            model: modelUsed,
                            fieldType: fieldType,
                            fieldId: fieldId
                        }
                    })];
            case 3:
                error_1 = _f.sent();
                duration = Date.now() - startTime;
                console.error('❌ [AI] Erreur génération:', error_1);
                // Gestion des erreurs spécifiques
                if ((_c = error_1.message) === null || _c === void 0 ? void 0 : _c.includes('API key')) {
                    return [2 /*return*/, res.status(500).json({
                            success: false,
                            error: 'Configuration IA manquante',
                            details: 'La clé API Google Gemini n\'est pas configurée',
                            duration: duration
                        })];
                }
                if (((_d = error_1.message) === null || _d === void 0 ? void 0 : _d.includes('quota')) || ((_e = error_1.message) === null || _e === void 0 ? void 0 : _e.includes('rate limit'))) {
                    return [2 /*return*/, res.status(429).json({
                            success: false,
                            error: 'Limite de quota atteinte',
                            details: 'Trop de requêtes IA. Attendez quelques instants.',
                            duration: duration
                        })];
                }
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        error: 'Erreur lors de la génération',
                        details: error_1.message || 'Erreur inconnue',
                        duration: duration
                    })];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * 🔍 ENDPOINT STATUS: GET /api/ai/status
 * Vérifie si le service IA est disponible
 */
router.get('/status', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var isAvailable;
    return __generator(this, function (_a) {
        try {
            isAvailable = !!process.env.GOOGLE_API_KEY || !!process.env.GEMINI_API_KEY;
            res.json({
                success: true,
                available: isAvailable,
                service: 'Google Gemini',
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                available: false,
                error: error.message
            });
        }
        return [2 /*return*/];
    });
}); });
exports.default = router;
