"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var authRoutes_1 = __importDefault(require("./authRoutes"));
var gmailRoutes_1 = __importDefault(require("./gmailRoutes")); // Réactivé
var misc_1 = __importDefault(require("./misc"));
var profile_1 = __importDefault(require("./profile"));
var modules_1 = __importDefault(require("./modules"));
var admin_modules_1 = __importDefault(require("./admin-modules")); // 🎯 ROUTES ADMINISTRATION MODULES DYNAMIQUE
var icons_1 = __importDefault(require("./icons")); // 🎨 ROUTES ICÔNES DYNAMIQUES
var company_1 = __importDefault(require("./company")); // ✅ RÉACTIVÉ - Fichier créé
var invitations_1 = __importDefault(require("./invitations"));
var organizations_1 = __importDefault(require("./organizations"));
var autoGoogleAuthRoutes_1 = __importDefault(require("./autoGoogleAuthRoutes"));
var google_auth_1 = __importDefault(require("./google-auth")); // ✅ NOUVELLE ROUTE GOOGLE AUTH
var google_scheduler_1 = __importDefault(require("./google-scheduler")); // 🔄 ROUTES SCHEDULER REFRESH TOKENS GOOGLE
var google_tokens_1 = __importDefault(require("./google-tokens")); // 🔍 ROUTES MONITORING TOKENS GOOGLE
var googleWorkspace_1 = __importDefault(require("./googleWorkspace")); // ✅ CONFIGURATION GOOGLE WORKSPACE
var blocks_1 = __importDefault(require("./blocks"));
var notifications_1 = __importDefault(require("./notifications"));
var notificationSystemRoutes_1 = __importDefault(require("./notificationSystemRoutes")); // 🔔 Routes système notifications
var settingsRoutes_1 = __importDefault(require("./settingsRoutes"));
var leadsRoutes_1 = __importDefault(require("./leadsRoutes")); // ✅ Routes leads corrigées
var rolesRoutes_1 = __importDefault(require("./rolesRoutes"));
var usersRoutes_1 = __importDefault(require("./usersRoutes"));
var adminPasswordRoutes_1 = __importDefault(require("./adminPasswordRoutes"));
var services_1 = __importDefault(require("./services")); // 🔧 **AJOUT ULTRA-SÉCURISÉ** : Routes services externes
var permissions_1 = __importDefault(require("./permissions")); // ✅ Routes permissions
var admin_1 = __importDefault(require("./admin")); // ✅ Routes admin
var impersonate_1 = __importDefault(require("./impersonate")); // ✅ Routes usurpation
var calendar_1 = __importDefault(require("./calendar")); // ✅ Routes calendar
var clients_1 = __importDefault(require("./clients")); // ✅ Routes clients
var projects_1 = __importDefault(require("./projects")); // ✅ Routes projects
var emails_1 = __importDefault(require("./emails")); // ✅ Routes emails
var gemini_1 = __importDefault(require("./gemini")); // 🤖 Routes Gemini AI
var telnyx_1 = __importDefault(require("./telnyx")); // 📞 Routes Telnyx Communications
var quotes_1 = __importDefault(require("./quotes")); // 📄 Routes Devis (Quotes)
var google_drive_1 = __importDefault(require("./google-drive")); // 📁 Routes Google Drive
var google_meet_1 = __importDefault(require("./google-meet")); // 📹 Routes Google Meet
var analytics_1 = __importDefault(require("./analytics")); // 📊 Routes Analytics
var ai_1 = __importDefault(require("./ai")); // 🤖 Routes Intelligence Artificielle
var ai_code_1 = __importDefault(require("./ai-code")); // 🧩 Exploration code IA (SuperAdmin)
var fields_1 = __importDefault(require("./fields"));
var validations_1 = __importDefault(require("./validations"));
var formulas_1 = __importDefault(require("./api/formulas"));
var dependencies_1 = __importDefault(require("./api/dependencies"));
var sections_1 = __importDefault(require("./sections"));
var module_navigation_1 = __importDefault(require("./module-navigation")); // 🔹 NAVIGATION MODULES
var form_sections_1 = __importDefault(require("./form-sections")); // 🔹 SECTIONS FORMULAIRES
var fieldTypes_1 = __importDefault(require("./fieldTypes"));
var optionNodes_1 = __importDefault(require("./optionNodes"));
var advanced_select_js_1 = __importDefault(require("../api/advanced-select.js")); // 🚀 Routes Advanced Select Professional
var dynamic_formulas_1 = __importDefault(require("../api/dynamic-formulas")); // 🌟 Routes Système Dynamique Universel
var dashboard_1 = __importDefault(require("./dashboard")); // 📊 Routes Dashboard
var treebranchleaf_routes_1 = __importDefault(require("../components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes")); // 🌳 Routes TreeBranchLeaf NOUVEAU système centralisé
// import treeBranchLeafV2Routes from './treebranchleaf-v2'; // 🌳 Routes TreeBranchLeaf V2 (DÉSACTIVÉ - Migration vers architecture centralisée)
var tbl_routes_1 = __importDefault(require("../components/TreeBranchLeaf/treebranchleaf-new/TBL/routes/tbl-routes")); // 🎯 Routes TBL (TreeBranchLeaf Business Logic)
var tbl_intelligence_routes_1 = __importDefault(require("../components/TreeBranchLeaf/tbl-bridge/routes/tbl-intelligence-routes")); // 🧠 Routes TBL Intelligence V2.0
var tbl_capabilities_1 = __importDefault(require("./tbl-capabilities")); // 🧠 Nouveau endpoint capabilities pré-chargées
var authController_1 = require("../controllers/authController");
// import googleAuthRouter from './authGoogleRoutes'; // Commenté car non défini ou non utilisé
// 🎯 DEVIS1MINUTE - Nouvelles routes
var leadGeneration_1 = __importDefault(require("./leadGeneration")); // 🎯 Routes génération de leads
var marketplace_fixed_1 = __importDefault(require("./marketplace-fixed")); // 🏪 Routes marketplace leads (VERSION CORRIGÉE)
var partner_1 = __importDefault(require("./partner")); // 🤝 Routes portal partenaires
var publicForms_1 = __importDefault(require("./publicForms")); // 📝 Routes formulaires publics
var landingPages_1 = __importDefault(require("./landingPages")); // 🌐 Routes landing pages
var campaignAnalytics_1 = __importDefault(require("./campaignAnalytics")); // 📊 Routes analytics campagnes
var dispatch_1 = __importDefault(require("./dispatch")); // 🚚 Rules engine (Dispatch)
var integrationsStatus_1 = __importDefault(require("./integrationsStatus")); // 🔌 État des intégrations
var integrations_1 = __importDefault(require("./integrations")); // 🔌 Intégrations (advertising/ecommerce)
// 🌐 ROUTES PUBLIQUES (sans authentification)
var publicLeads_1 = __importDefault(require("./publicLeads")); // 🌍 API publique leads
var apiRouter = (0, express_1.Router)();
console.log('[ROUTER] Configuration du routeur principal');
// Routes d'authentification
apiRouter.use('/auth', authRoutes_1.default);
console.log('[ROUTER] Routes d\'authentification montées sur /auth');
// Routes pour l'authentification Google automatique
apiRouter.use('/auto-google-auth', autoGoogleAuthRoutes_1.default);
console.log('[ROUTER] Routes auto-google-auth montées sur /auto-google-auth');
// Routes diverses (me, register, etc.)
apiRouter.use('/', misc_1.default);
console.log('[ROUTER] Routes diverses montées sur /');
// Routes de profil utilisateur
apiRouter.use('/profile', profile_1.default);
console.log('[ROUTER] Routes profil montées sur /profile');
// Route de déconnexion directe (attendue par le frontend)
apiRouter.post('/logout', authController_1.logout);
console.log('[ROUTER] Route de déconnexion montée sur /logout');
// Routes des organisations
apiRouter.use('/organizations', organizations_1.default);
console.log('[ROUTER] Routes des organisations montées sur /organizations');
// Routes de configuration Google Workspace par organisation
apiRouter.use('/organizations', googleWorkspace_1.default);
console.log('[ROUTER] Routes Google Workspace montées sur /organizations');
// Routes Google Workspace pour les utilisateurs
apiRouter.use('/google-workspace', googleWorkspace_1.default);
console.log('[ROUTER] Routes Google Workspace utilisateurs montées sur /google-workspace');
// Routes des modules
apiRouter.use('/modules', modules_1.default);
console.log('[ROUTER] Routes des modules montées sur /modules');
// Routes administration modules DYNAMIQUE
apiRouter.use('/admin-modules', admin_modules_1.default);
console.log('[ROUTER] Routes administration modules DYNAMIQUE montées sur /admin-modules');
// Routes des icônes
apiRouter.use('/icons', icons_1.default);
console.log('[ROUTER] Routes des icônes montées sur /icons');
// Routes des blocks
apiRouter.use('/blocks', blocks_1.default);
console.log('[ROUTER] Routes des blocks montées sur /blocks');
// Routes des fields (inclut validations/formulas/dependencies en sous-routes)
apiRouter.use('/fields', fields_1.default);
console.log('[ROUTER] Routes des fields montées sur /fields');
// Routes des sections (redirections + informations)
apiRouter.use('/sections', sections_1.default);
console.log('[ROUTER] Routes des sections montées sur /sections (avec redirections)');
// Routes de navigation des modules (module.category)
apiRouter.use('/module-navigation', module_navigation_1.default);
console.log('[ROUTER] Routes navigation modules montées sur /module-navigation');
// Routes des sections de formulaires (Block→Section→Field)  
apiRouter.use('/form-sections', form_sections_1.default);
console.log('[ROUTER] Routes sections formulaires montées sur /form-sections');
// Routes des types de champs (Prisma FieldType)
apiRouter.use('/field-types', fieldTypes_1.default);
console.log('[ROUTER] Routes des types de champs montées sur /field-types');
// Routes des arborescences d'options (advanced_select)
apiRouter.use('/option-nodes', optionNodes_1.default);
console.log('[ROUTER] Routes des option-nodes montées sur /option-nodes');
// Routes des notifications
apiRouter.use('/notifications', notifications_1.default);
console.log('[ROUTER] Routes des notifications montées sur /notifications');
// Routes du système de notifications
apiRouter.use('/notifications-system', notificationSystemRoutes_1.default);
console.log('[ROUTER] Routes du système de notifications montées sur /notifications-system');
// Routes des paramètres (settings)
apiRouter.use('/settings', settingsRoutes_1.default);
console.log('[ROUTER] Routes des paramètres montées sur /settings');
// Routes des leads
apiRouter.use('/leads', leadsRoutes_1.default);
console.log('[ROUTER] Routes des leads montées sur /leads');
// Routes du dashboard
apiRouter.use('/dashboard', dashboard_1.default);
console.log('[ROUTER] Routes du dashboard montées sur /dashboard');
console.log('[ROUTER] Routes des leads montées sur /leads');
// Routes des clients (basées sur les leads)
apiRouter.use('/clients', clients_1.default);
console.log('[ROUTER] Routes des clients montées sur /clients');
// Routes des entreprises/sociétés
apiRouter.use('/company', company_1.default);
console.log('[ROUTER] Routes des entreprises montées sur /company');
// Routes des projets (basées sur les leads)
apiRouter.use('/projects', projects_1.default);
console.log('[ROUTER] Routes des projets montées sur /projects');
// Routes des emails (Gmail intégration)
apiRouter.use('/emails', emails_1.default);
console.log('[ROUTER] Routes des emails montées sur /emails');
// Routes Gemini AI 🤖
apiRouter.use('/gemini', gemini_1.default);
console.log('[ROUTER] Routes Gemini AI montées sur /gemini');
// Routes des rôles
apiRouter.use('/roles', rolesRoutes_1.default);
console.log('[ROUTER] Routes des rôles montées sur /roles');
// Routes des permissions
apiRouter.use('/permissions', permissions_1.default);
console.log('[ROUTER] Routes des permissions montées sur /permissions');
// Routes des utilisateurs
apiRouter.use('/users', usersRoutes_1.default);
console.log('[ROUTER] Routes des utilisateurs montées sur /users');
// Routes d'administration
apiRouter.use('/admin', admin_1.default);
console.log('[ROUTER] Routes admin montées sur /admin');
// Routes d'usurpation d'identité
apiRouter.use('/impersonate', impersonate_1.default);
console.log('[ROUTER] Routes usurpation montées sur /impersonate');
// Routes d'administration des mots de passe
apiRouter.use('/admin-password', adminPasswordRoutes_1.default);
console.log('[ROUTER] Routes admin-password montées sur /admin-password');
// Routes Gmail
apiRouter.use('/gmail', gmailRoutes_1.default);
console.log('[ROUTER] Routes Gmail montées sur /gmail');
// Routes Calendar
apiRouter.use('/calendar', calendar_1.default);
console.log('[ROUTER] Routes Calendar montées sur /calendar');
// Routes Google Auth (OAuth)
apiRouter.use('/google-auth', google_auth_1.default);
console.log('[ROUTER] Routes Google Auth montées sur /google-auth');
// Routes Google Scheduler (Refresh automatique des tokens)
apiRouter.use('/google/scheduler', google_scheduler_1.default);
console.log('[ROUTER] Routes Google Scheduler montées sur /google/scheduler');
// Routes Google Tokens Monitoring
apiRouter.use('/google-tokens', google_tokens_1.default);
console.log('[ROUTER] Routes Google Tokens Monitoring montées sur /google-tokens');
// Routes Google Auth - Alias pour compatibilité Google Cloud Console
apiRouter.use('/auth/google', google_auth_1.default);
console.log('[ROUTER] Routes Google Auth (alias) montées sur /auth/google');
// 🔧 **ULTRA-SÉCURISÉ** : Routes des services externes (Email, Telnyx)
apiRouter.use('/services', services_1.default);
console.log('[ROUTER] Routes des services externes montées sur /services');
// Routes Telnyx Communications
apiRouter.use('/telnyx', telnyx_1.default);
console.log('[ROUTER] Routes Telnyx montées sur /telnyx');
// Routes Devis (Quotes)
apiRouter.use('/quotes', quotes_1.default);
console.log('[ROUTER] Routes Devis montées sur /quotes');
// Routes Google Drive
apiRouter.use('/google-drive', google_drive_1.default);
console.log('[ROUTER] Routes Google Drive montées sur /google-drive');
// Routes Google Meet
apiRouter.use('/google-meet', google_meet_1.default);
console.log('[ROUTER] Routes Google Meet montées sur /google-meet');
// Routes Analytics
apiRouter.use('/analytics', analytics_1.default);
console.log('[ROUTER] Routes Analytics montées sur /analytics');
// Routes Intelligence Artificielle
apiRouter.use('/ai', ai_1.default);
console.log('[ROUTER] Routes IA montées sur /ai');
// Routes Exploration Code IA (sécurisées SuperAdmin)
apiRouter.use('/ai', ai_code_1.default);
console.log('[ROUTER] Routes IA Code montées sur /ai/code/*');
// Routes Advanced Select Professional 🚀
apiRouter.use('/advanced-select', advanced_select_js_1.default);
console.log('[ROUTER] Routes Advanced Select montées sur /advanced-select');
// Routes Système Dynamique Universel 🌟
apiRouter.use('/dynamic-formulas', dynamic_formulas_1.default);
console.log('[ROUTER] Routes Système Dynamique montées sur /dynamic-formulas');
// Routes TreeBranchLeaf 🌳 NOUVEAU système centralisé
apiRouter.use('/treebranchleaf', treebranchleaf_routes_1.default);
console.log('[ROUTER] Routes TreeBranchLeaf NOUVEAU système montées sur /treebranchleaf');
// Routes TreeBranchLeaf V2 🌳 (DÉSACTIVÉ - Migration vers architecture centralisée)
// apiRouter.use('/treebranchleaf-v2', treeBranchLeafV2Routes);
// console.log('[ROUTER] Routes TreeBranchLeaf V2 montées sur /treebranchleaf-v2');
// Routes TBL Intelligence 🧠 (Intelligence pour formules, conditions, tableaux)
apiRouter.use('/tbl', tbl_intelligence_routes_1.default);
console.log('[ROUTER] Routes TBL Intelligence montées sur /tbl');
// Routes TBL 🎯 (TreeBranchLeaf Business Logic)
apiRouter.use('/tbl', tbl_routes_1.default);
console.log('[ROUTER] Routes TBL montées sur /tbl');
// Routes TBL Capabilities (pré-chargement des capacités sourceRef)
apiRouter.use('/tbl', tbl_capabilities_1.default);
console.log('[ROUTER] Routes TBL Capabilities montées sur /tbl');
// ... (autres montages de routeurs)
// Alias top-level pour les validations (DELETE/PATCH /api/validations/:id)
apiRouter.use('/validations', validations_1.default);
console.log('[ROUTER] Routes validations (top-level) montées sur /validations');
// Alias top-level pour les formules (GET/PUT/DELETE /api/formulas/*)
apiRouter.use('/formulas', formulas_1.default);
console.log('[ROUTER] Routes formules (top-level) montées sur /formulas');
// Alias top-level pour les dépendances (PUT/DELETE /api/dependencies/:id)
apiRouter.use('/dependencies', dependencies_1.default);
console.log('[ROUTER] Routes dépendances (top-level) montées sur /dependencies');
// Routes des invitations
apiRouter.use('/invitations', invitations_1.default);
console.log('[ROUTER] Routes des invitations montées sur /invitations');
// 🎯 DEVIS1MINUTE - Nouvelles routes modularisées
apiRouter.use('/lead-generation', leadGeneration_1.default);
console.log('[ROUTER] Routes Lead Generation montées sur /lead-generation');
apiRouter.use('/marketplace', marketplace_fixed_1.default);
console.log('[ROUTER] Routes Marketplace montées sur /marketplace');
apiRouter.use('/partner', partner_1.default);
console.log('[ROUTER] Routes Partner Portal montées sur /partner');
apiRouter.use('/forms', publicForms_1.default);
console.log('[ROUTER] Routes Public Forms montées sur /forms');
apiRouter.use('/public-forms', publicForms_1.default);
console.log('[ROUTER] Routes Public Forms montées sur /public-forms');
apiRouter.use('/landing-pages', landingPages_1.default);
console.log('[ROUTER] Routes Landing Pages montées sur /landing-pages');
apiRouter.use('/campaign-analytics', campaignAnalytics_1.default);
console.log('[ROUTER] Routes Campaign Analytics montées sur /campaign-analytics');
apiRouter.use('/dispatch', dispatch_1.default);
console.log('[ROUTER] Routes Dispatch montées sur /dispatch');
// Monter les deux routeurs d'intégrations: status agrégé + advertising/ecommerce
apiRouter.use('/integrations', integrations_1.default);
apiRouter.use('/integrations', integrationsStatus_1.default);
console.log('[ROUTER] Routes Integrations (status + advertising/ecommerce) montées sur /integrations');
// 🌐 ROUTES PUBLIQUES (sans authentification requise)
apiRouter.use('/public', publicLeads_1.default);
console.log('[ROUTER] Routes Public API montées sur /public');
// apiRouter.use('/auth/google', googleAuthRouter); // NOUVEAU: Authentification Google OAuth - Commenté car non défini
// Route simple pour vérifier que l'API fonctionne (non authentifiée)
apiRouter.get('/health', function (_req, res) {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
exports.default = apiRouter;
