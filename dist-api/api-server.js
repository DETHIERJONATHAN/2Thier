"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv = __importStar(require("dotenv"));
console.log('🔍 [DEBUG] Chargement dotenv...');
dotenv.config();
console.log('✅ [DEBUG] Dotenv chargé');
var express_1 = __importDefault(require("express"));
var path_1 = __importDefault(require("path"));
var fs_1 = __importDefault(require("fs"));
console.log('✅ [DEBUG] Express importé');
var cors_1 = __importDefault(require("cors"));
console.log('✅ [DEBUG] CORS importé');
var express_session_1 = __importDefault(require("express-session"));
console.log('✅ [DEBUG] Session importée');
var cookie_parser_1 = __importDefault(require("cookie-parser"));
console.log('✅ [DEBUG] CookieParser importé');
var passport_1 = __importDefault(require("passport"));
console.log('✅ [DEBUG] Passport importé');
var index_1 = __importDefault(require("./routes/index")); // ✅ Router principal complet
var ai_internal_1 = __importDefault(require("./routes/ai-internal"));
var ai_field_generator_1 = __importDefault(require("./routes/ai-field-generator")); // 🤖 IA GÉNÉRATION DE CONTENU
var treebranchleaf_routes_1 = __importDefault(require("./components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes"));
var centralized_operations_routes_1 = __importDefault(require("./components/TreeBranchLeaf/treebranchleaf-new/api/centralized-operations-routes"));
var tbl_submission_evaluator_1 = __importDefault(require("./components/TreeBranchLeaf/tbl-bridge/routes/tbl-submission-evaluator"));
console.log('✅ [DEBUG] Router minimal importé');
// import analyticsRouter from './routes/analytics.ts'; // 📊 ANALYTICS - FUTUR
var security_1 = require("./middlewares/security");
console.log('✅ [DEBUG] Security importé');
// 🔄 GOOGLE TOKEN REFRESH SCHEDULER
var GoogleTokenRefreshScheduler_1 = require("./services/GoogleTokenRefreshScheduler");
console.log('✅ [DEBUG] Google Token Scheduler importé');
//  AUTO-SYNC DÉSACTIVÉ - Mode IMAP bidirectionnel pur
// import { autoMailSync } from './services/AutoMailSyncService.js';
console.log('🚀 [DEBUG] Création de l\'app Express...');
var app = (0, express_1.default)();
console.log('✅ [DEBUG] App Express créée');
var port = process.env.PORT || 4000;
console.log("\uD83D\uDD27 [DEBUG] Port configur\u00E9: ".concat(port));
console.log('🔧 [DEBUG] Configuration CORS...');
app.use((0, cors_1.default)({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
}));
console.log('✅ [DEBUG] CORS configuré');
console.log('🔧 [DEBUG] Configuration JSON parser...');
app.use(express_1.default.json());
console.log('✅ [DEBUG] JSON parser configuré');
console.log('🔧 [DEBUG] Configuration Cookie parser...');
app.use((0, cookie_parser_1.default)());
console.log('✅ [DEBUG] Cookie parser configuré');
var publicDir = path_1.default.resolve(process.cwd(), 'public');
var uploadsDir = path_1.default.join(publicDir, 'uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express_1.default.static(uploadsDir));
console.log('✅ [DEBUG] Statics configurés');
// Configuration de la session
console.log('🔧 [DEBUG] Configuration sessions...');
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    },
}));
console.log('✅ [DEBUG] Sessions configurées');
// Initialiser Passport.js pour l'authentification
console.log('🔧 [DEBUG] Configuration Passport...');
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
console.log('✅ [DEBUG] Passport configuré');
// Middleware de logging global pour debug
console.log('🔧 [DEBUG] Configuration logging middleware...');
app.use(function (req, res, next) {
    var _a;
    console.log("[SERVER] ".concat(req.method, " ").concat(req.url));
    console.log("[SERVER] Headers:", req.headers.authorization ? 'Authorization present' : 'No auth');
    console.log("[SERVER] Cookies:", ((_a = req.cookies) === null || _a === void 0 ? void 0 : _a.token) ? 'Token cookie present' : 'No token cookie');
    next();
});
console.log('✅ [DEBUG] Logging middleware configuré');
// 🧹 ROUTE DE NETTOYAGE FORCÉ DES COOKIES (pour résoudre les 401)
app.get('/clear-auth', function (_req, res) {
    console.log('🧹 [CLEAR-AUTH] Nettoyage forcé des cookies d\'authentification...');
    // Nettoyer tous les cookies possibles avec toutes les configurations
    var cookieOptions = [
        { path: '/' },
        { path: '/', domain: 'localhost' },
        { path: '/', domain: '.localhost' },
        { path: '/', httpOnly: true },
        { path: '/', secure: false },
        { path: '/', sameSite: 'lax' },
        { path: '/', sameSite: 'none' },
        { path: '/', sameSite: 'strict' }
    ];
    // Nettoyer le cookie 'token' avec toutes les variantes possibles
    cookieOptions.forEach(function (options) {
        res.clearCookie('token', options);
    });
    // Aussi supprimer d'autres cookies potentiels
    ['auth', 'session', 'user', 'jwt', 'access_token'].forEach(function (cookieName) {
        cookieOptions.forEach(function (options) {
            res.clearCookie(cookieName, options);
        });
    });
    console.log('✅ [CLEAR-AUTH] Cookies nettoyés - redirection vers le frontend');
    // Retourner du HTML avec script de nettoyage automatique
    res.send("\n        <!DOCTYPE html>\n        <html>\n        <head>\n            <title>\uD83E\uDDF9 Nettoyage en cours...</title>\n            <style>\n                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }\n                .container { background: white; padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto; }\n                h1 { color: #27ae60; }\n                .loading { animation: spin 1s linear infinite; }\n                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }\n            </style>\n        </head>\n        <body>\n            <div class=\"container\">\n                <h1>\uD83E\uDDF9 Nettoyage en cours...</h1>\n                <div class=\"loading\">\u27F3</div>\n                <p>Cache et cookies supprim\u00E9s. Redirection automatique...</p>\n                <p><a href=\"http://localhost:5173\">Aller au CRM maintenant</a></p>\n            </div>\n            <script>\n                // Nettoyer compl\u00E8tement le cache c\u00F4t\u00E9 client\n                console.log('\uD83E\uDDF9 Nettoyage c\u00F4t\u00E9 client...');\n                \n                localStorage.clear();\n                sessionStorage.clear();\n                \n                // Supprimer tous les cookies c\u00F4t\u00E9 client aussi\n                document.cookie.split(';').forEach(function(c) { \n                    document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/'); \n                });\n                \n                console.log('\u2705 Nettoyage termin\u00E9');\n                \n                // Redirection automatique apr\u00E8s 3 secondes\n                setTimeout(() => {\n                    window.location.href = 'http://localhost:5173?cleared=1';\n                }, 3000);\n            </script>\n        </body>\n        </html>\n    ");
});
// 🔥 NETTOYAGE RADICAL FORCÉ
app.get('/force-clean', function (_req, res) {
    console.log('🔥 [FORCE-CLEAN] Nettoyage radical demandé');
    res.send("\n        <!DOCTYPE html>\n        <html>\n        <head>\n            <title>\uD83D\uDD25 Nettoyage Radical</title>\n            <style>\n                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #e74c3c; color: white; }\n                .container { background: rgba(0,0,0,0.8); padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto; }\n                h1 { color: #fff; }\n                .loading { animation: spin 1s linear infinite; font-size: 2em; }\n                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }\n            </style>\n        </head>\n        <body>\n            <div class=\"container\">\n                <h1>\uD83D\uDD25 NETTOYAGE RADICAL EN COURS...</h1>\n                <div class=\"loading\">\u26A1</div>\n                <p>Suppression COMPL\u00C8TE de tous les tokens et cookies...</p>\n                <p>Redirection automatique vers la page de connexion...</p>\n            </div>\n            <script src=\"/force-clean.js\"></script>\n        </body>\n        </html>\n    ");
});
// 🔧 ENDPOINT TEMPORAIRE POUR MISE À JOUR DES SERVICES
app.post('/update-services-temp', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var PrismaClient, prisma, section, newContent, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 6]);
                console.log('🔄 Mise à jour du contenu de la section Services...');
                return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('@prisma/client')); })];
            case 1:
                PrismaClient = (_a.sent()).PrismaClient;
                prisma = new PrismaClient();
                return [4 /*yield*/, prisma.websiteSection.findFirst({
                        where: {
                            websiteId: 11,
                            type: 'services'
                        }
                    })];
            case 2:
                section = _a.sent();
                if (!section) {
                    console.error('❌ Section Services non trouvée !');
                    return [2 /*return*/, res.status(404).json({ error: 'Section Services non trouvée' })];
                }
                console.log("\u2705 Section trouv\u00E9e : ID ".concat(section.id));
                newContent = {
                    title: '🏠 Nos Services',
                    subtitle: 'Des solutions complètes pour votre habitat et votre autonomie énergétique',
                    items: [
                        {
                            icon: 'ThunderboltOutlined',
                            iconColor: '#f59e0b',
                            iconSize: '36px',
                            title: 'Panneaux Photovoltaïques',
                            description: 'Installation de panneaux solaires haute performance pour produire votre propre électricité verte et réduire vos factures.',
                            features: [
                                'Installation professionnelle',
                                'Rendement optimal',
                                'Garantie 25 ans',
                                'Maintenance incluse'
                            ],
                            ctaText: 'En savoir plus',
                            ctaUrl: '/services/photovoltaique'
                        },
                        {
                            icon: 'HomeOutlined',
                            iconColor: '#10b981',
                            iconSize: '36px',
                            title: 'Isolation (Murs, Sols, Toits)',
                            description: 'Isolation thermique et acoustique de qualité pour améliorer votre confort et réaliser jusqu\'à 40% d\'économies d\'énergie.',
                            features: [
                                'Isolation par l\'extérieur',
                                'Isolation par l\'intérieur',
                                'Matériaux écologiques',
                                'Primes disponibles'
                            ],
                            ctaText: 'Découvrir',
                            ctaUrl: '/services/isolation'
                        },
                        {
                            icon: 'FireOutlined',
                            iconColor: '#ef4444',
                            iconSize: '36px',
                            title: 'Pompes à Chaleur',
                            description: 'Systèmes de chauffage et climatisation économiques et écologiques avec un rendement jusqu\'à 4 fois supérieur.',
                            features: [
                                'Air-eau et air-air',
                                'Économies jusqu\'à 70%',
                                'Primes énergie',
                                'Installation rapide'
                            ],
                            ctaText: 'Demander un devis',
                            ctaUrl: '/services/pompes-chaleur'
                        },
                        {
                            icon: 'BuildOutlined',
                            iconColor: '#3b82f6',
                            iconSize: '36px',
                            title: 'Toitures',
                            description: 'Rénovation, réparation et pose de toitures neuves avec des matériaux durables et une garantie décennale.',
                            features: [
                                'Tous types de couverture',
                                'Étanchéité garantie',
                                'Isolation intégrée',
                                'Zinguerie incluse'
                            ],
                            ctaText: 'Voir nos réalisations',
                            ctaUrl: '/services/toitures'
                        },
                        {
                            icon: 'WindowsOutlined',
                            iconColor: '#8b5cf6',
                            iconSize: '36px',
                            title: 'Châssis',
                            description: 'Châssis PVC, aluminium et bois sur mesure pour une isolation optimale et un confort thermique et acoustique.',
                            features: [
                                'Triple vitrage',
                                'Sur mesure',
                                'Pose professionnelle',
                                'Excellent rapport qualité-prix'
                            ],
                            ctaText: 'Configurateur',
                            ctaUrl: '/services/chassis'
                        },
                        {
                            icon: 'BulbOutlined',
                            iconColor: '#f59e0b',
                            iconSize: '36px',
                            title: 'Électricité Générale',
                            description: 'Installation, rénovation et dépannage électrique pour votre maison ou entreprise, en conformité avec les normes.',
                            features: [
                                'Conformité RGIE',
                                'Domotique',
                                'Bornes de recharge',
                                'Intervention rapide'
                            ],
                            ctaText: 'Demander un électricien',
                            ctaUrl: '/services/electricite'
                        },
                        {
                            icon: 'ToolOutlined',
                            iconColor: '#64748b',
                            iconSize: '36px',
                            title: 'Gros Œuvre',
                            description: 'Travaux de construction, extension et transformation de bâtiments avec une équipe expérimentée et qualifiée.',
                            features: [
                                'Extensions',
                                'Transformations',
                                'Fondations',
                                'Maçonnerie générale'
                            ],
                            ctaText: 'Nos chantiers',
                            ctaUrl: '/services/gros-oeuvre'
                        },
                        {
                            icon: 'CloudOutlined',
                            iconColor: '#06b6d4',
                            iconSize: '36px',
                            title: 'Traitement de l\'Eau',
                            description: 'Solutions de filtration, adoucissement et purification pour une eau saine et de qualité dans toute votre habitation.',
                            features: [
                                'Adoucisseurs',
                                'Filtration complète',
                                'Osmose inverse',
                                'Entretien régulier'
                            ],
                            ctaText: 'Analyse gratuite',
                            ctaUrl: '/services/traitement-eau'
                        }
                    ],
                    layout: {
                        grid: {
                            columns: {
                                mobile: 1,
                                tablet: 2,
                                desktop: 4
                            },
                            gap: '24px',
                            alignment: 'stretch',
                            justifyContent: 'start'
                        },
                        cardStyle: 'elevated',
                        maxWidth: '1400px'
                    },
                    style: {
                        backgroundColor: '#f9fafb',
                        padding: '80px 24px',
                        titleColor: '#111827',
                        titleFontSize: '42px',
                        subtitleColor: '#64748b',
                        subtitleFontSize: '18px',
                        cardBackground: '#ffffff',
                        cardBorderRadius: '16px',
                        cardBorder: '1px solid #f1f5f9',
                        cardPadding: '24px',
                        serviceTitleColor: '#111827',
                        serviceTitleFontSize: '20px',
                        serviceDescriptionColor: '#64748b',
                        serviceDescriptionFontSize: '15px',
                        featureCheckColor: '#10b981',
                        ctaBackgroundColor: '#10b981',
                        ctaBorderColor: '#10b981',
                        ctaTextColor: '#ffffff'
                    }
                };
                // Mettre à jour la section
                return [4 /*yield*/, prisma.websiteSection.update({
                        where: {
                            id: section.id
                        },
                        data: {
                            content: newContent
                        }
                    })];
            case 3:
                // Mettre à jour la section
                _a.sent();
                console.log('✅ Contenu mis à jour avec succès !');
                console.log("\uD83D\uDCDD ".concat(newContent.items.length, " services ont \u00E9t\u00E9 ajout\u00E9s"));
                return [4 /*yield*/, prisma.$disconnect()];
            case 4:
                _a.sent();
                res.json({
                    success: true,
                    message: 'Services mis à jour avec succès',
                    services: newContent.items.map(function (s) { return s.title; })
                });
                return [3 /*break*/, 6];
            case 5:
                error_1 = _a.sent();
                console.error('❌ Erreur lors de la mise à jour:', error_1);
                res.status(500).json({ error: 'Erreur lors de la mise à jour', details: error_1 });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// Utiliser le routeur principal pour TOUTES les routes /api
// Ce routeur contient maintenant les routes gmail, qui seront donc protégées
// par les mêmes middlewares d'authentification que les autres.
app.use('/api', index_1.default);
app.use('/api/ai/internal', ai_internal_1.default);
app.use('/api/ai', ai_field_generator_1.default); // 🤖 IA GÉNÉRATION INTELLIGENTE DE CONTENU
app.use('/api/treebranchleaf', treebranchleaf_routes_1.default);
app.use('/api/treebranchleaf-ops', centralized_operations_routes_1.default);
app.use('/api/tbl', tbl_submission_evaluator_1.default); // 🔥 TBL PRISMA EVALUATOR
console.log('✅ Routes TreeBranchLeaf NOUVEAU système montées sur /treebranchleaf');
console.log('✅ Routes TreeBranchLeaf Opérations Centralisées montées sur /treebranchleaf-ops');
console.log('✅ Routes IA Génération de Contenu montées sur /api/ai');
// ✅ PAGE D'ACCUEIL: Simple page d'accueil de l'API
app.get('/', function (req, res) {
    return res.send("\n    <!DOCTYPE html>\n    <html lang=\"fr\">\n      <head>\n        <meta charset=\"utf-8\" />\n        <title>2Thier CRM API</title>\n      </head>\n      <body>\n        <h1>\uD83D\uDE80 2Thier CRM API</h1>\n        <p>API en fonctionnement sur le port ".concat(port, "</p>\n        <p><a href=\"").concat(process.env.FRONTEND_URL || 'http://localhost:5173', "\">Acc\u00E9der au CRM</a></p>\n      </body>\n    </html>\n  "));
});
// 📊 ANALYTICS ROUTES - FUTURES FONCTIONNALITÉS
// app.use('/api/analytics', analyticsRouter);
// Gestion des erreurs
// Middleware d'erreurs (signature à 4 args conservée pour Express)
app.use(function (err, req, res, _next) {
    console.error('Erreur serveur:', err);
    res.status(500).json({ error: 'Une erreur est survenue sur le serveur.' });
});
console.log('🔧 [DEBUG] Configuration sécurité...');
(0, security_1.setupSecurity)(app);
console.log('✅ [DEBUG] Sécurité configurée');
console.log('🚀 [DEBUG] Démarrage du serveur...');
// =============================================================================
// 🚀 INITIALISATION DES SERVICES CENTRALISÉS TREEBRANCHLEAF
// =============================================================================
// Import des services centralisés
var TreeBranchLeafBackgroundJobService_1 = require("./services/TreeBranchLeafBackgroundJobService");
app.listen(port, function () {
    console.log("\uD83C\uDF89 [SUCCESS] Server is running on port ".concat(port));
    console.log("\uD83C\uDF10 [SUCCESS] Health check: http://localhost:".concat(port, "/health"));
    // 🔄 Démarrage du scheduler de refresh automatique des tokens Google
    console.log('🔄 [SCHEDULER] Démarrage du scheduler de refresh automatique des tokens Google...');
    GoogleTokenRefreshScheduler_1.googleTokenScheduler.start();
    console.log('✅ [SCHEDULER] Scheduler de refresh automatique démarré');
    // 🌳 Initialisation des services TreeBranchLeaf
    console.log('🔧 [TREEBRANCHLEAF] Initialisation des services centralisés...');
    var backgroundJobService = (0, TreeBranchLeafBackgroundJobService_1.getBackgroundJobService)(prisma);
    backgroundJobService.start(15); // Toutes les 15 minutes
    console.log('✅ [TREEBRANCHLEAF] Services d\'arrière-plan démarrés');
    // Configuration pour arrêt propre
    (0, TreeBranchLeafBackgroundJobService_1.setupGracefulShutdown)();
    console.log('✅ [TREEBRANCHLEAF] Gestionnaire d\'arrêt propre configuré');
});
// Récupération des conditions TreeBranchLeaf
app.get('/api/treebranchleaf/conditions/:conditionId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var conditionId, condition, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                conditionId = req.params.conditionId;
                console.log('🔍 [API] GET condition:', conditionId);
                return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.findUnique({
                        where: { id: conditionId }
                    })];
            case 1:
                condition = _a.sent();
                if (!condition) {
                    console.log('❌ [API] Condition non trouvée:', conditionId);
                    return [2 /*return*/, res.status(404).json({ error: 'Condition non trouvée' })];
                }
                console.log('✅ [API] Condition trouvée:', condition.id);
                res.json(condition);
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error('❌ [API] Erreur récupération condition:', error_2);
                res.status(500).json({ error: 'Erreur serveur lors de la récupération de la condition' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 🎯 NOUVEAU: Récupération des formules d'un nœud spécifique (avec targetProperty!)
app.get('/api/treebranchleaf/nodes/:nodeId/formulas', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, formulas, constraintFormulas, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                nodeId = req.params.nodeId;
                console.log('🔍 [API] GET formulas for node:', nodeId);
                return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findMany({
                        where: { nodeId: nodeId },
                        orderBy: { createdAt: 'asc' }
                    })];
            case 1:
                formulas = _a.sent();
                console.log("\u2705 [API] ".concat(formulas.length, " formule(s) trouv\u00E9e(s) pour node ").concat(nodeId));
                constraintFormulas = formulas.filter(function (f) { return f.targetProperty; });
                if (constraintFormulas.length > 0) {
                    console.log("\uD83C\uDFAF [API] Formules de contrainte:", constraintFormulas.map(function (f) { return ({
                        id: f.id,
                        name: f.name,
                        targetProperty: f.targetProperty,
                        tokens: f.tokens
                    }); }));
                }
                res.json({ formulas: formulas });
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.error('❌ [API] Erreur récupération formules du nœud:', error_3);
                res.status(500).json({ error: 'Erreur serveur lors de la récupération des formules' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Récupération des formules TreeBranchLeaf
app.get('/api/treebranchleaf/formulas/:formulaId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var formulaId, formula, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                formulaId = req.params.formulaId;
                console.log('🔍 [API] GET formula:', formulaId);
                return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findUnique({
                        where: { id: formulaId },
                        include: {
                            node: true,
                            Organization: true
                        }
                    })];
            case 1:
                formula = _a.sent();
                if (!formula) {
                    console.log('❌ [API] Formule non trouvée:', formulaId);
                    return [2 /*return*/, res.status(404).json({ error: 'Formule non trouvée' })];
                }
                console.log('✅ [API] Formule trouvée:', formula.id);
                res.json(formula);
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                console.error('❌ [API] Erreur récupération formule:', error_4);
                res.status(500).json({ error: 'Erreur serveur lors de la récupération de la formule' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Création dynamique de formules
app.post('/api/treebranchleaf/nodes/:nodeId/formulas', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, _a, name_1, description, tokens, targetProperty, node, newFormula, error_5;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                nodeId = req.params.nodeId;
                _a = req.body, name_1 = _a.name, description = _a.description, tokens = _a.tokens, targetProperty = _a.targetProperty;
                console.log('➕ [API] POST nouvelle formule:', { nodeId: nodeId, name: name_1, tokensCount: (tokens === null || tokens === void 0 ? void 0 : tokens.length) || 0, targetProperty: targetProperty });
                return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                        where: { id: nodeId }
                    })];
            case 1:
                node = _b.sent();
                if (!node) {
                    return [2 /*return*/, res.status(404).json({ error: 'Nœud non trouvé' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.create({
                        data: {
                            nodeId: nodeId,
                            organizationId: node.organizationId,
                            name: name_1 || 'Nouvelle formule',
                            description: description || '',
                            tokens: tokens || [],
                            targetProperty: targetProperty ? String(targetProperty) : null
                        }
                    })];
            case 2:
                newFormula = _b.sent();
                // 🎯 ACTIVATION AUTOMATIQUE : Configurer hasFormula ET formula_activeId
                console.log('➕ [API] Activation automatique de la formule créée');
                return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                        where: { id: nodeId },
                        data: {
                            hasFormula: true,
                            formula_activeId: newFormula.id // 🎯 NOUVEAU : Activer automatiquement la formule
                        }
                    })];
            case 3:
                _b.sent();
                console.log('✅ [API] Formule créée avec succès:', newFormula.id);
                res.status(201).json(newFormula);
                return [3 /*break*/, 5];
            case 4:
                error_5 = _b.sent();
                console.error('❌ [API] Erreur création formule:', error_5);
                res.status(500).json({
                    error: 'Erreur lors de la création',
                    details: error_5.message
                });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// Mise à jour dynamique de formules
app.put('/api/treebranchleaf/nodes/:nodeId/formulas/:formulaId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, nodeId, formulaId, _b, name_2, description, tokens, targetProperty, existingFormula, updatedFormula, error_6;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 3, , 4]);
                _a = req.params, nodeId = _a.nodeId, formulaId = _a.formulaId;
                _b = req.body, name_2 = _b.name, description = _b.description, tokens = _b.tokens, targetProperty = _b.targetProperty;
                console.log('✏️ [API] PUT mise à jour formule:', { nodeId: nodeId, formulaId: formulaId, name: name_2, tokensCount: (tokens === null || tokens === void 0 ? void 0 : tokens.length) || 0, targetProperty: targetProperty });
                return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findUnique({
                        where: { id: formulaId }
                    })];
            case 1:
                existingFormula = _c.sent();
                if (!existingFormula) {
                    return [2 /*return*/, res.status(404).json({ error: 'Formule non trouvée' })];
                }
                if (existingFormula.nodeId !== nodeId) {
                    return [2 /*return*/, res.status(400).json({ error: 'Formule ne correspond pas au nœud' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.update({
                        where: { id: formulaId },
                        data: {
                            name: name_2 !== undefined ? name_2 : existingFormula.name,
                            description: description !== undefined ? description : existingFormula.description,
                            tokens: tokens !== undefined ? tokens : existingFormula.tokens,
                            targetProperty: targetProperty !== undefined ? (targetProperty ? String(targetProperty) : null) : existingFormula.targetProperty
                        }
                    })];
            case 2:
                updatedFormula = _c.sent();
                console.log('✅ [API] Formule mise à jour avec succès');
                res.json(updatedFormula);
                return [3 /*break*/, 4];
            case 3:
                error_6 = _c.sent();
                console.error('❌ [API] Erreur mise à jour formule:', error_6);
                res.status(500).json({
                    error: 'Erreur lors de la mise à jour',
                    details: error_6.message
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
;
// Suppression dynamique de formules
app.delete('/api/treebranchleaf/nodes/:nodeId/formulas/:formulaId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, nodeId, formulaId, formula, remainingCount, error_7;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 6, , 7]);
                _a = req.params, nodeId = _a.nodeId, formulaId = _a.formulaId;
                console.log('🗑️ [API] DELETE formule:', { nodeId: nodeId, formulaId: formulaId });
                return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findUnique({
                        where: { id: formulaId }
                    })];
            case 1:
                formula = _b.sent();
                if (!formula) {
                    return [2 /*return*/, res.status(404).json({ error: 'Formule non trouvée' })];
                }
                if (formula.nodeId !== nodeId) {
                    return [2 /*return*/, res.status(400).json({ error: 'Formule ne correspond pas au nœud' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.count({
                        where: {
                            nodeId: nodeId,
                            id: { not: formulaId }
                        }
                    })];
            case 2:
                remainingCount = _b.sent();
                console.log('🗑️ [API] Formules restantes après suppression:', remainingCount);
                // Supprimer la formule
                return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.delete({
                        where: { id: formulaId }
                    })];
            case 3:
                // Supprimer la formule
                _b.sent();
                if (!(remainingCount === 0)) return [3 /*break*/, 5];
                console.log('🗑️ [API] Plus de formules, mise à jour hasFormula = false');
                return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                        where: { id: nodeId },
                        data: { hasFormula: false }
                    })];
            case 4:
                _b.sent();
                _b.label = 5;
            case 5:
                console.log('✅ [API] Formule supprimée avec succès');
                res.json({
                    success: true,
                    message: 'Formule supprimée',
                    remainingFormulas: remainingCount,
                    nodeHasFormula: remainingCount > 0
                });
                return [3 /*break*/, 7];
            case 6:
                error_7 = _b.sent();
                console.error('❌ [API] Erreur suppression formule:', error_7);
                res.status(500).json({
                    error: 'Erreur lors de la suppression',
                    details: error_7.message
                });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
console.log('✅ [DEBUG] Fin du script principal');
