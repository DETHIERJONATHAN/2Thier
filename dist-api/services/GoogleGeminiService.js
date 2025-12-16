"use strict";
/**
 * 🤖 GOOGLE GEMINI AI SERVICE POUR CRM
 * Service d'intelligence artificielle pour automatiser les tâches CRM
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleGeminiService = void 0;
// Import pour l'API Google Generative AI
var generative_ai_1 = require("@google/generative-ai");
var GoogleGeminiService = /** @class */ (function () {
    function GoogleGeminiService() {
        var _this = this;
        var _a, _b;
        this.genAI = null;
        this.model = null;
        this.fallbackModelNames = [];
        this.modelCache = new Map();
        // Observabilité / Résilience
        this.consecutiveFailures = 0;
        this.lastError = null;
        this.lastSuccessAt = null;
        this.degradedUntil = null; // timestamp ms si circuit breaker actif
        // Vérifier si la clé API est configurée
        this.apiKey = process.env.GOOGLE_AI_API_KEY;
        var forcedMode = process.env.AI_MODE; // force-mock | force-live | auto
        this.isDemoMode = forcedMode === 'force-mock' ? true : (!this.apiKey && forcedMode !== 'force-live');
        var explicitDefaultModel = (_a = process.env.GEMINI_MODEL) === null || _a === void 0 ? void 0 : _a.trim();
        var fastModel = (_b = process.env.GEMINI_FAST_MODEL) === null || _b === void 0 ? void 0 : _b.trim();
        this.primaryModelName = fastModel || explicitDefaultModel || 'gemini-2.5-flash';
        var fallbackEnv = process.env.GEMINI_MODEL_FALLBACKS || explicitDefaultModel || 'gemini-2.5-pro';
        this.fallbackModelNames = fallbackEnv
            .split(',')
            .map(function (name) { return name.trim(); })
            .filter(function (name) { return !!name && name !== _this.primaryModelName; });
        // Compatibilité héritage (certaines routes lisent encore this.modelName)
        this.modelName = this.primaryModelName;
        // Paramètres par défaut (surchageables via .env)
        this.maxRetries = Math.max(0, parseInt(process.env.AI_MAX_RETRIES || '2', 10) || 2);
        this.baseTimeoutMs = Math.max(2000, parseInt(process.env.AI_TIMEOUT_MS || '12000', 10) || 12000);
        this.perAttemptExtraTimeoutMs = Math.max(0, parseInt(process.env.AI_RETRY_TIMEOUT_INCREMENT_MS || '2000', 10) || 2000);
        if (this.isDemoMode) {
            console.log('🤖 GoogleGeminiService initialisé (mode développement - démo)');
            console.log('ℹ️  Pour activer l\'API réelle, configurez GOOGLE_AI_API_KEY dans .env');
        }
        else {
            console.log('🤖 GoogleGeminiService initialisé (mode production - API réelle)');
            this.genAI = new generative_ai_1.GoogleGenerativeAI(this.apiKey);
            this.model = this.getModelInstance(this.primaryModelName);
            this.modelCache.set(this.primaryModelName, this.model);
            console.log("\u2705 Cl\u00E9 API Gemini d\u00E9tect\u00E9e, mod\u00E8le rapide: ".concat(this.primaryModelName, " (API v1beta)"));
            if (this.fallbackModelNames.length > 0) {
                console.log("\u21AA\uFE0F  Mod\u00E8les de secours configur\u00E9s: ".concat(this.fallbackModelNames.join(', ')));
            }
        }
    }
    /** Indique si on est en mode live */
    GoogleGeminiService.prototype.isLive = function () { return !this.isDemoMode; };
    /** Chat générique multi-modules */
    GoogleGeminiService.prototype.chat = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var prompt, result, e_1, msg;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        prompt = params.prompt;
                        if (this.isDemoMode) {
                            return [2 /*return*/, { success: true, mode: 'mock', content: this.buildDemoChat(prompt), model: 'demo' }];
                        }
                        // Circuit breaker actif ?
                        if (this.degradedUntil && Date.now() < this.degradedUntil) {
                            return [2 /*return*/, {
                                    success: true,
                                    mode: 'mock',
                                    content: this.buildDemoChat(prompt),
                                    error: this.lastError || 'circuit-breaker-active',
                                    model: 'fallback-mock'
                                }];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.callGeminiAPIWithFallbacks(prompt)];
                    case 2:
                        result = _a.sent();
                        if (result.success) {
                            this.recordSuccess();
                            return [2 /*return*/, { success: true, content: result.content, mode: 'live', model: result.modelUsed }];
                        }
                        this.recordFailure(result.error || 'unknown-error');
                        return [2 /*return*/, {
                                success: true,
                                content: this.buildDemoChat(prompt),
                                mode: 'mock',
                                error: result.error,
                                model: result.modelUsed || this.primaryModelName
                            }];
                    case 3:
                        e_1 = _a.sent();
                        msg = e_1.message;
                        this.recordFailure(msg);
                        return [2 /*return*/, {
                                success: true,
                                content: this.buildDemoChat(prompt),
                                mode: 'mock',
                                error: msg,
                                model: this.primaryModelName
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    GoogleGeminiService.prototype.buildDemoChat = function (userPrompt) {
        return "\nR\u00E9ponse simplifi\u00E9e (mode simul\u00E9) pour: ".concat(userPrompt.slice(0, 120), "...\nJe peux proposer: planifier un RDV, analyser un lead, g\u00E9n\u00E9rer un email ou la prochaine action. Pr\u00E9cisez votre besoin.");
    };
    /**
     * 📧 GÉNÉRATION EMAIL PERSONNALISÉ
     * Génère un email personnalisé pour un prospect
     */
    GoogleGeminiService.prototype.generatePersonalizedEmail = function (leadData_1) {
        return __awaiter(this, arguments, void 0, function (leadData, emailType) {
            var prompt_1, result, error_1;
            if (emailType === void 0) { emailType = 'initial'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        console.log("\uD83E\uDD16 [Gemini] G\u00E9n\u00E9ration email ".concat(emailType, " pour ").concat(leadData.name));
                        if (this.isDemoMode) {
                            return [2 /*return*/, this.generateDemoEmail(leadData, emailType)];
                        }
                        prompt_1 = this.buildEmailPrompt(leadData, emailType);
                        return [4 /*yield*/, this.callGeminiAPIWithFallbacks(prompt_1, emailType === 'initial' ? undefined : __spreadArray([this.primaryModelName], this.fallbackModelNames, true))];
                    case 1:
                        result = _a.sent();
                        if (result.success && result.content) {
                            return [2 /*return*/, {
                                    success: true,
                                    email: this.parseEmailResponse(result.content),
                                    source: 'gemini-api',
                                    model: result.modelUsed
                                }];
                        }
                        // Fallback en cas d'erreur API
                        console.warn('⚠️ Erreur API Gemini, fallback vers démo');
                        return [2 /*return*/, __assign(__assign({}, this.generateDemoEmail(leadData, emailType)), { model: 'demo' })];
                    case 2:
                        error_1 = _a.sent();
                        console.error('❌ Erreur génération email:', error_1);
                        return [2 /*return*/, { success: false, error: error_1.message }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 📋 ANALYSE ET RÉSUMÉ DE LEAD
     * Analyse les données d'un lead et génère un résumé intelligent
     */
    GoogleGeminiService.prototype.analyzeLeadData = function (leadData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                try {
                    console.log("\uD83E\uDD16 [Gemini] Analyse lead ".concat(leadData.name || 'Anonyme'));
                    if (this.isDemoMode) {
                        return [2 /*return*/, this.generateDemoAnalysis(leadData)];
                    }
                    // TODO: Intégration réelle Vertex AI
                    return [2 /*return*/, { success: false, error: 'Vertex AI non configuré' }];
                }
                catch (error) {
                    console.error('❌ Erreur analyse lead:', error);
                    return [2 /*return*/, { success: false, error: error.message }];
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * 📝 GÉNÉRATION PROPOSITION COMMERCIALE
     * Crée une proposition commerciale personnalisée
     */
    GoogleGeminiService.prototype.generateCommercialProposal = function (leadData, productData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                try {
                    console.log("\uD83E\uDD16 [Gemini] G\u00E9n\u00E9ration proposition pour ".concat(leadData.name));
                    if (this.isDemoMode) {
                        return [2 /*return*/, this.generateDemoProposal(leadData, productData)];
                    }
                    // TODO: Intégration réelle Vertex AI
                    return [2 /*return*/, { success: false, error: 'Vertex AI non configuré' }];
                }
                catch (error) {
                    console.error('❌ Erreur génération proposition:', error);
                    return [2 /*return*/, { success: false, error: error.message }];
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * 🔍 ANALYSE SENTIMENT EMAIL
     * Analyse le sentiment d'un email reçu
     */
    GoogleGeminiService.prototype.analyzeSentiment = function (emailContent) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                try {
                    console.log('🤖 [Gemini] Analyse sentiment email');
                    if (this.isDemoMode) {
                        return [2 /*return*/, this.generateDemoSentiment(emailContent)];
                    }
                    // TODO: Intégration réelle Vertex AI
                    return [2 /*return*/, { success: false, error: 'Vertex AI non configuré' }];
                }
                catch (error) {
                    console.error('❌ Erreur analyse sentiment:', error);
                    return [2 /*return*/, { success: false, error: error.message }];
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * 💬 SUGGESTION RÉPONSE EMAIL
     * Suggère une réponse appropriée à un email
     */
    GoogleGeminiService.prototype.suggestEmailResponse = function (emailContent_1) {
        return __awaiter(this, arguments, void 0, function (emailContent, context) {
            if (context === void 0) { context = {}; }
            return __generator(this, function (_a) {
                try {
                    console.log('🤖 [Gemini] Suggestion réponse email');
                    if (this.isDemoMode) {
                        return [2 /*return*/, this.generateDemoResponse(emailContent, context)];
                    }
                    // TODO: Intégration réelle Vertex AI
                    return [2 /*return*/, { success: false, error: 'Vertex AI non configuré' }];
                }
                catch (error) {
                    console.error('❌ Erreur suggestion email:', error);
                    return [2 /*return*/, { success: false, error: error.message }];
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * 🎭 MÉTHODES DEMO (SIMULATION)
     * Ces méthodes simulent les réponses de Gemini en attendant la configuration
     */
    GoogleGeminiService.prototype.generateDemoEmail = function (leadData, emailType) {
        var emailTemplates = {
            initial: {
                subject: "Bonjour ".concat(leadData.name, " - Proposition CRM personnalis\u00E9e pour ").concat(leadData.company || 'votre entreprise'),
                body: "Bonjour ".concat(leadData.name, ",\n\nJ'esp\u00E8re que vous allez bien. Je me permets de vous contacter suite \u00E0 votre int\u00E9r\u00EAt pour nos solutions CRM.\n\nChez 2Thier, nous aidons les entreprises comme ").concat(leadData.company || 'la vôtre', " \u00E0 optimiser leur gestion commerciale gr\u00E2ce \u00E0 des outils innovants et intuitifs.\n\n").concat(leadData.industry ? "Ayant une expertise particuli\u00E8re dans le secteur ".concat(leadData.industry, ", ") : '', "Je serais ravi de vous pr\u00E9senter comment notre CRM peut r\u00E9pondre \u00E0 vos besoins sp\u00E9cifiques.\n\nSeriez-vous disponible pour un \u00E9change de 30 minutes la semaine prochaine ?\n\nCordialement,\nL'\u00E9quipe 2Thier CRM\n\nP.S. : Nous offrons une d\u00E9monstration gratuite et personnalis\u00E9e.")
            },
            followup: {
                subject: "Suivi - D\u00E9monstration CRM pour ".concat(leadData.company || 'votre entreprise'),
                body: "Bonjour ".concat(leadData.name, ",\n\nJ'esp\u00E8re que vous avez pu consulter notre proposition CRM.\n\n").concat(leadData.notes ? "Suite \u00E0 nos \u00E9changes concernant ".concat(leadData.notes.substring(0, 50), "..., ") : '', "je souhaitais faire le point avec vous sur vos besoins.\n\nNotre solution pourrait particuli\u00E8rement vous aider \u00E0 :\n\u2022 Automatiser votre suivi commercial\n\u2022 Int\u00E9grer vos emails et calendrier\n\u2022 Analyser vos performances de vente\n\nQuand pourriez-vous \u00EAtre disponible pour une d\u00E9monstration personnalis\u00E9e ?\n\nBien \u00E0 vous,\nL'\u00E9quipe 2Thier CRM")
            }
        };
        var template = emailTemplates[emailType] || emailTemplates.initial;
        return {
            success: true,
            email: {
                subject: template.subject,
                body: template.body,
                tone: 'professionnel'
            }
        };
    };
    GoogleGeminiService.prototype.generateDemoAnalysis = function (leadData) {
        var qualificationScore = this.calculateQualificationScore(leadData);
        return {
            success: true,
            analysis: {
                profil: "".concat(leadData.name, " de ").concat(leadData.company || 'une entreprise', " ").concat(leadData.industry ? "dans le secteur ".concat(leadData.industry) : '', ". Contact via ").concat(leadData.source || 'canal direct', "."),
                besoins: leadData.notes ? this.extractNeeds(leadData.notes) : 'Besoins à clarifier lors du prochain contact',
                opportunites: this.generateOpportunities(leadData),
                actions: this.generateRecommendedActions(leadData, qualificationScore),
                score: qualificationScore
            }
        };
    };
    GoogleGeminiService.prototype.generateDemoProposal = function (leadData, productData) {
        var proposal = "PROPOSITION COMMERCIALE PERSONNALIS\u00C9E\n\nDestinataire: ".concat(leadData.name, " - ").concat(leadData.company || 'Entreprise', "\n\n1. INTRODUCTION\nNous avons le plaisir de vous proposer ").concat(productData.name, ", une solution parfaitement adapt\u00E9e \u00E0 vos besoins.\n\n2. ANALYSE DE VOS BESOINS\n").concat(leadData.notes || 'Optimisation de la gestion commerciale et amélioration du suivi client.', "\n\n3. SOLUTION PROPOS\u00C9E\n").concat(productData.description, "\n\nAvantages cl\u00E9s :\n").concat(Array.isArray(productData.benefits) ? productData.benefits.map(function (b) { return "\u2022 ".concat(b); }).join('\n') : '• Solution complète et intuitive', "\n\n4. INVESTISSEMENT\n").concat(productData.price || 'Sur devis personnalisé', "\n\n5. PROCHAINES \u00C9TAPES\n\u2022 D\u00E9monstration personnalis\u00E9e (30 minutes)\n\u2022 Configuration selon vos besoins\n\u2022 Formation de votre \u00E9quipe\n\u2022 Support technique complet\n\nNous restons \u00E0 votre disposition pour tout compl\u00E9ment d'information.\n\nCordialement,\nL'\u00E9quipe commerciale 2Thier");
        return {
            success: true,
            proposal: {
                content: proposal.trim(),
                wordCount: proposal.split(' ').length,
                sections: ['Introduction', 'Analyse besoins', 'Solution', 'Investissement', 'Prochaines étapes']
            }
        };
    };
    GoogleGeminiService.prototype.generateDemoSentiment = function (emailContent) {
        var sentiment = this.analyzeSentimentDemo(emailContent);
        return {
            success: true,
            sentiment: {
                sentiment: sentiment.type,
                score: sentiment.score,
                emotions: sentiment.emotions,
                urgence: sentiment.urgence,
                recommandations: sentiment.recommandations
            }
        };
    };
    GoogleGeminiService.prototype.generateDemoResponse = function (emailContent, context) {
        var suggestion = this.generateResponseSuggestion(emailContent, context);
        return {
            success: true,
            suggestions: {
                principale: suggestion.main,
                alternatives: suggestion.alternatives,
                objet: suggestion.subject,
                callToAction: suggestion.cta
            }
        };
    };
    /**
     * 🛠️ MÉTHODES UTILITAIRES DEMO
     */
    GoogleGeminiService.prototype.calculateQualificationScore = function (leadData) {
        var score = 5; // Score de base
        if (leadData.email)
            score += 1;
        if (leadData.phone)
            score += 1;
        if (leadData.company)
            score += 1;
        if (leadData.industry)
            score += 1;
        if (leadData.notes && leadData.notes.length > 50)
            score += 1;
        if (leadData.status === 'Qualified')
            score += 2;
        if (leadData.notes && leadData.notes.includes('budget'))
            score += 1;
        return Math.min(score, 10);
    };
    GoogleGeminiService.prototype.extractNeeds = function (notes) {
        if (notes.toLowerCase().includes('crm'))
            return 'Solution CRM complète';
        if (notes.toLowerCase().includes('gestion'))
            return 'Amélioration gestion commerciale';
        if (notes.toLowerCase().includes('automatisation'))
            return 'Automatisation des processus';
        return 'Besoins à affiner lors du prochain échange';
    };
    GoogleGeminiService.prototype.generateOpportunities = function (leadData) {
        var opportunities = [];
        if (leadData.company)
            opportunities.push('Déploiement à l\'échelle de l\'entreprise');
        if (leadData.industry)
            opportunities.push("Expertise sectorielle ".concat(leadData.industry));
        if (leadData.notes && leadData.notes.includes('équipe'))
            opportunities.push('Formation équipe complète');
        return opportunities.length > 0 ? opportunities.join(', ') : 'Potentiel à évaluer';
    };
    GoogleGeminiService.prototype.generateRecommendedActions = function (leadData, score) {
        if (score >= 8)
            return 'Proposer démonstration immédiate, préparer offre commerciale';
        if (score >= 6)
            return 'Planifier rendez-vous téléphonique, qualifier les besoins';
        return 'Envoyer informations complémentaires, programmer rappel dans 1 semaine';
    };
    GoogleGeminiService.prototype.analyzeSentimentDemo = function (emailContent) {
        var content = emailContent.toLowerCase();
        // Analyse basique du sentiment
        var score = 5;
        var type = 'neutre';
        var emotions = [];
        var urgence = 'moyenne';
        // Sentiment positif
        if (content.includes('merci') || content.includes('intéressant') || content.includes('parfait')) {
            score += 2;
            type = 'positif';
            emotions.push('satisfaction');
        }
        // Sentiment négatif
        if (content.includes('problème') || content.includes('déçu') || content.includes('pas satisfait')) {
            score -= 2;
            type = 'négatif';
            emotions.push('frustration');
        }
        // Urgence
        if (content.includes('urgent') || content.includes('rapidement') || content.includes('dès que possible')) {
            urgence = 'élevée';
            emotions.push('urgence');
        }
        // Recommandations
        var recommandations = 'Réponse standard professionnelle';
        if (type === 'positif')
            recommandations = 'Réponse enthousiaste, proposer prochaine étape';
        if (type === 'négatif')
            recommandations = 'Réponse empathique, proposer solution rapide';
        if (urgence === 'élevée')
            recommandations += ' - Répondre dans les 2 heures';
        return {
            type: type,
            score: Math.max(1, Math.min(10, score)),
            emotions: emotions,
            urgence: urgence,
            recommandations: recommandations
        };
    };
    GoogleGeminiService.prototype.generateResponseSuggestion = function (emailContent, context) {
        var isPositive = emailContent.toLowerCase().includes('intéressant') ||
            emailContent.toLowerCase().includes('merci');
        var main = '';
        if (isPositive) {
            main = "Bonjour,\n\nMerci pour votre retour positif ! Je suis ravi de voir que notre solution vous int\u00E9resse.\n\nPour donner suite \u00E0 votre message, je vous propose d'organiser une d\u00E9monstration personnalis\u00E9e qui vous permettra de d\u00E9couvrir concr\u00E8tement les fonctionnalit\u00E9s adapt\u00E9es \u00E0 vos besoins.\n\nQuelles sont vos disponibilit\u00E9s pour un \u00E9change de 30 minutes cette semaine ?\n\nCordialement";
        }
        else {
            main = "Bonjour,\n\nMerci pour votre message. Je prends note de vos remarques et vais m'assurer de vous apporter une r\u00E9ponse compl\u00E8te.\n\n".concat(context.objective || 'Je vous recontacte rapidement', " pour faire le point sur votre situation.\n\nBien \u00E0 vous");
        }
        return {
            main: main,
            alternatives: [
                'Version courte : Merci pour votre message. Je vous recontacte rapidement.',
                'Version formelle : Nous accusons réception de votre message et vous remercions de votre intérêt.'
            ],
            subject: 'Re: ' + (emailContent.substring(0, 30) + '...'),
            cta: isPositive ? 'Organiser une démonstration' : 'Faire le point ensemble'
        };
    };
    /**
     * 🚀 MÉTHODES POUR L'API GEMINI RÉELLE
     */
    GoogleGeminiService.prototype.ensureLiveMode = function () {
        if (!this.genAI) {
            throw new Error('API Gemini non initialisée');
        }
    };
    GoogleGeminiService.prototype.getModelInstance = function (modelName) {
        this.ensureLiveMode();
        var cached = this.modelCache.get(modelName);
        if (cached) {
            return cached;
        }
        var model = this.genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });
        this.modelCache.set(modelName, model);
        return model;
    };
    GoogleGeminiService.prototype.callGeminiAPIWithFallbacks = function (prompt, modelCandidates) {
        return __awaiter(this, void 0, void 0, function () {
            var candidates, lastError, _i, candidates_1, candidate, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        candidates = (modelCandidates && modelCandidates.length > 0)
                            ? modelCandidates
                            : __spreadArray([this.primaryModelName], this.fallbackModelNames, true);
                        _i = 0, candidates_1 = candidates;
                        _a.label = 1;
                    case 1:
                        if (!(_i < candidates_1.length)) return [3 /*break*/, 4];
                        candidate = candidates_1[_i];
                        return [4 /*yield*/, this.callGeminiAPIWithRetries(prompt, candidate)];
                    case 2:
                        result = _a.sent();
                        if (result.success) {
                            if (candidate !== this.primaryModelName) {
                                console.warn("\u21AA\uFE0F  [Gemini API] Bascul\u00E9 sur le mod\u00E8le de secours ".concat(candidate));
                            }
                            return [2 /*return*/, result];
                        }
                        lastError = result.error;
                        console.warn("\u26A0\uFE0F [Gemini API] \u00C9chec avec ".concat(candidate, ": ").concat(lastError || 'erreur inconnue'));
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, {
                            success: false,
                            error: lastError || 'no-model-available',
                            modelUsed: candidates[candidates.length - 1]
                        }];
                }
            });
        });
    };
    GoogleGeminiService.prototype.callGeminiAPI = function (prompt, modelName) {
        return __awaiter(this, void 0, void 0, function () {
            var modelToUse, result, response, text, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        if (!this.genAI) {
                            return [2 /*return*/, { success: false, error: 'API Gemini non initialisée', modelUsed: modelName }];
                        }
                        modelToUse = this.getModelInstance(modelName);
                        return [4 /*yield*/, modelToUse.generateContent(prompt)];
                    case 1:
                        result = _a.sent();
                        return [4 /*yield*/, result.response];
                    case 2:
                        response = _a.sent();
                        text = response.text();
                        console.log("\u2705 [Gemini API] R\u00E9ponse re\u00E7ue (".concat(modelName, ")"));
                        return [2 /*return*/, { success: true, content: text, modelUsed: modelName }];
                    case 3:
                        error_2 = _a.sent();
                        console.error('❌ [Gemini API] Erreur:', error_2);
                        return [2 /*return*/, { success: false, error: error_2.message, modelUsed: modelName }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /** Appel API avec timeout et retries exponentiels (backoff + jitter) */
    GoogleGeminiService.prototype.callGeminiAPIWithRetries = function (prompt, modelName) {
        return __awaiter(this, void 0, void 0, function () {
            var attempts, _loop_1, this_1, i, state_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        attempts = this.maxRetries + 1;
                        _loop_1 = function (i) {
                            var timeoutMs, res, err_1, msg, base, jitter;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        timeoutMs = this_1.baseTimeoutMs + i * this_1.perAttemptExtraTimeoutMs;
                                        _b.label = 1;
                                    case 1:
                                        _b.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, this_1.withTimeout(this_1.callGeminiAPI(prompt, modelName), timeoutMs)];
                                    case 2:
                                        res = _b.sent();
                                        if (res.success)
                                            return [2 /*return*/, { value: res }];
                                        // Si erreur non transitoire, on arrête
                                        if (!this_1.isTransientError(res.error || ''))
                                            return [2 /*return*/, { value: res }];
                                        return [3 /*break*/, 4];
                                    case 3:
                                        err_1 = _b.sent();
                                        msg = err_1.message || String(err_1);
                                        if (!this_1.isTransientError(msg)) {
                                            return [2 /*return*/, { value: { success: false, error: msg, modelUsed: modelName } }];
                                        }
                                        return [3 /*break*/, 4];
                                    case 4:
                                        base = Math.min(4000, 500 * Math.pow(2, i));
                                        jitter = Math.floor(Math.random() * 200);
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, base + jitter); })];
                                    case 5:
                                        _b.sent();
                                        return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        i = 0;
                        _a.label = 1;
                    case 1:
                        if (!(i < attempts)) return [3 /*break*/, 4];
                        return [5 /*yield**/, _loop_1(i)];
                    case 2:
                        state_1 = _a.sent();
                        if (typeof state_1 === "object")
                            return [2 /*return*/, state_1.value];
                        _a.label = 3;
                    case 3:
                        i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, { success: false, error: 'timeout-or-retry-exceeded', modelUsed: modelName }];
                }
            });
        });
    };
    GoogleGeminiService.prototype.withTimeout = function (p, ms) {
        return __awaiter(this, void 0, void 0, function () {
            var timer;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.race([
                            p,
                            new Promise(function (_, reject) {
                                timer = setTimeout(function () { return reject(new Error("ai-timeout-".concat(ms, "ms"))); }, ms);
                            })
                        ]).finally(function () {
                            // @ts-expect-error timer is set in both branches
                            if (timer)
                                clearTimeout(timer);
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    GoogleGeminiService.prototype.isTransientError = function (message) {
        var m = message.toLowerCase();
        return (m.includes('timeout') ||
            m.includes('timed out') ||
            m.includes('etimedout') ||
            m.includes('econnreset') ||
            m.includes('econnrefused') ||
            m.includes('network') ||
            m.includes('fetch failed') ||
            m.includes('503') ||
            m.includes('502') ||
            m.includes('429'));
    };
    /** Expose un statut enrichi pour la route /api/ai/status */
    GoogleGeminiService.prototype.getStatus = function () {
        var _a;
        var now = Date.now();
        var degraded = !!(this.degradedUntil && now < this.degradedUntil);
        return {
            mode: this.isDemoMode ? 'mock' : 'live',
            model: this.primaryModelName,
            fallbackModels: this.fallbackModelNames,
            hasApiKey: !!this.apiKey,
            consecutiveFailures: this.consecutiveFailures,
            lastError: this.lastError,
            lastSuccessAt: ((_a = this.lastSuccessAt) === null || _a === void 0 ? void 0 : _a.toISOString()) || null,
            degraded: degraded,
            degradedUntil: degraded && this.degradedUntil ? new Date(this.degradedUntil).toISOString() : null
        };
    };
    GoogleGeminiService.prototype.recordFailure = function (err) {
        this.consecutiveFailures += 1;
        this.lastError = err;
        // Détection clé invalide -> circuit breaker rapide
        var isKeyInvalid = /API key not valid|API_KEY_INVALID|permission|unauthorized|401|403/i.test(err);
        if (isKeyInvalid) {
            // Paliers exponentiels simples
            var penaltyMinutes = 1;
            if (this.consecutiveFailures >= 3)
                penaltyMinutes = 5;
            if (this.consecutiveFailures >= 5)
                penaltyMinutes = 15;
            if (this.consecutiveFailures >= 7)
                penaltyMinutes = 60;
            this.degradedUntil = Date.now() + penaltyMinutes * 60000;
        }
        else if (this.consecutiveFailures >= 4) {
            // Autres erreurs persistantes => courte pause 2-5 min selon charge
            var minutes = this.consecutiveFailures >= 6 ? 5 : 2;
            this.degradedUntil = Date.now() + minutes * 60000;
        }
    };
    GoogleGeminiService.prototype.recordSuccess = function () {
        this.consecutiveFailures = 0;
        this.lastError = null;
        this.lastSuccessAt = new Date();
        this.degradedUntil = null;
    };
    GoogleGeminiService.prototype.buildEmailPrompt = function (leadData, emailType) {
        var company = leadData.company || 'votre entreprise';
        var name = leadData.name || 'Monsieur/Madame';
        var sector = leadData.sector || 'votre secteur d\'activité';
        var service = leadData.service || 'nos services';
        return "G\u00E9n\u00E8re un email professionnel ".concat(emailType, " pour un prospect dans le CRM.\n\nCONTEXTE:\n- Nom: ").concat(name, "\n- Entreprise: ").concat(company, "\n- Secteur: ").concat(sector, "\n- Service d'int\u00E9r\u00EAt: ").concat(service, "\n- Type d'email: ").concat(emailType, "\n\nINSTRUCTIONS:\n1. Cr\u00E9e un email personnalis\u00E9 et professionnel\n2. Adapte le ton au type d'email (").concat(emailType, ")\n3. Mentionne les besoins sp\u00E9cifiques du secteur\n4. Inclus un appel \u00E0 l'action clair\n5. R\u00E9ponds au format JSON: {\"subject\": \"...\", \"body\": \"...\", \"tone\": \"...\"}\n\nL'email doit \u00EAtre en fran\u00E7ais et adapt\u00E9 au march\u00E9 belge.");
    };
    GoogleGeminiService.prototype.parseEmailResponse = function (content) {
        try {
            // Tenter de parser le JSON de la réponse
            var jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            // Fallback: extraire manuellement
            return {
                subject: this.extractFromContent(content, 'subject', 'Sujet généré par IA'),
                body: this.extractFromContent(content, 'body', content.substring(0, 500)),
                tone: this.extractFromContent(content, 'tone', 'professionnel')
            };
        }
        catch (error) {
            console.warn('⚠️ Erreur parsing réponse Gemini:', error);
            return {
                subject: 'Email généré par IA',
                body: content,
                tone: 'professionnel'
            };
        }
    };
    GoogleGeminiService.prototype.extractFromContent = function (content, field, defaultValue) {
        var regex = new RegExp("\"".concat(field, "\"\\s*:\\s*\"([^\"]*)\""), 'i');
        var match = content.match(regex);
        return match ? match[1] : defaultValue;
    };
    return GoogleGeminiService;
}());
exports.GoogleGeminiService = GoogleGeminiService;
exports.default = GoogleGeminiService;
