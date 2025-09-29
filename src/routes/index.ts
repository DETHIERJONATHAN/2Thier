import { Router } from 'express';
import authRoutes from './authRoutes';
import gmailRoutes from './gmailRoutes'; // Réactivé
import miscRoutes from './misc';
import profileRoutes from './profile';
import modulesRoutes from './modules';
import adminModulesRoutes from './admin-modules'; // 🎯 ROUTES ADMINISTRATION MODULES DYNAMIQUE
import iconsRoutes from './icons'; // 🎨 ROUTES ICÔNES DYNAMIQUES
import companyRoutes from './company'; // ✅ RÉACTIVÉ - Fichier créé
import invitationRoutes from './invitations';
import organizationsRoutes from './organizations';
import autoGoogleAuthRoutes from './autoGoogleAuthRoutes';
import googleAuthRoutes from './google-auth'; // ✅ NOUVELLE ROUTE GOOGLE AUTH
import googleSchedulerRoutes from './google-scheduler'; // 🔄 ROUTES SCHEDULER REFRESH TOKENS GOOGLE
import googleTokensRoutes from './google-tokens'; // 🔍 ROUTES MONITORING TOKENS GOOGLE
import googleWorkspaceRoutes from './googleWorkspace'; // ✅ CONFIGURATION GOOGLE WORKSPACE
import blocksRoutes from './blocks';
import notificationsRoutes from './notifications';
import notificationSystemRoutes from './notificationSystemRoutes'; // 🔔 Routes système notifications
import settingsRoutes from './settingsRoutes';
import leadsRoutes from './leadsRoutes'; // ✅ Routes leads corrigées
import rolesRoutes from './rolesRoutes';
import usersRoutes from './usersRoutes';
import adminPasswordRoutes from './adminPasswordRoutes';
import servicesRoutes from './services'; // 🔧 **AJOUT ULTRA-SÉCURISÉ** : Routes services externes
import permissionsRoutes from './permissions'; // ✅ Routes permissions
import adminRoutes from './admin'; // ✅ Routes admin
import impersonateRoutes from './impersonate'; // ✅ Routes usurpation
import calendarRoutes from './calendar'; // ✅ Routes calendar
import clientsRoutes from './clients'; // ✅ Routes clients
import projectsRoutes from './projects'; // ✅ Routes projects
import emailsRoutes from './emails'; // ✅ Routes emails
import geminiRoutes from './gemini'; // 🤖 Routes Gemini AI
import telnyxRoutes from './telnyx'; // 📞 Routes Telnyx Communications
import quotesRoutes from './quotes'; // 📄 Routes Devis (Quotes)
import googleDriveRoutes from './google-drive'; // 📁 Routes Google Drive
import googleMeetRoutes from './google-meet'; // 📹 Routes Google Meet
import analyticsRoutes from './analytics'; // 📊 Routes Analytics
import aiRoutes from './ai'; // 🤖 Routes Intelligence Artificielle
import aiCodeRoutes from './ai-code'; // 🧩 Exploration code IA (SuperAdmin)
import fieldsRoutes from './fields';
import validationsRoutes from './validations';
import formulasApiRoutes from './api/formulas';
import dependenciesApiRoutes from './api/dependencies';
import sectionsRoutes from './sections';
import moduleNavigationRoutes from './module-navigation'; // 🔹 NAVIGATION MODULES
import formSectionsRoutes from './form-sections'; // 🔹 SECTIONS FORMULAIRES
import fieldTypesRoutes from './fieldTypes';
import optionNodesRoutes from './optionNodes';
import advancedSelectRoutes from '../api/advanced-select.js'; // 🚀 Routes Advanced Select Professional
import dynamicFormulasRoutes from '../api/dynamic-formulas'; // 🌟 Routes Système Dynamique Universel
import dashboardRoutes from './dashboard'; // 📊 Routes Dashboard
import treeBranchLeafNewRoutes from '../components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes'; // 🌳 Routes TreeBranchLeaf NOUVEAU système centralisé
// import treeBranchLeafV2Routes from './treebranchleaf-v2'; // 🌳 Routes TreeBranchLeaf V2 (DÉSACTIVÉ - Migration vers architecture centralisée)
import tblRoutes from '../components/TreeBranchLeaf/treebranchleaf-new/TBL/routes/tbl-routes'; // 🎯 Routes TBL (TreeBranchLeaf Business Logic)
import tblIntelligenceRoutes from '../components/TreeBranchLeaf/tbl-bridge/routes/tbl-intelligence-routes'; // 🧠 Routes TBL Intelligence V2.0
import tblCapabilitiesRoutes from './tbl-capabilities'; // 🧠 Nouveau endpoint capabilities pré-chargées
import { logout } from '../controllers/authController';
// import googleAuthRouter from './authGoogleRoutes'; // Commenté car non défini ou non utilisé

// 🎯 DEVIS1MINUTE - Nouvelles routes
import leadGenerationRoutes from './leadGeneration'; // 🎯 Routes génération de leads
import marketplaceRoutes from './marketplace-fixed'; // 🏪 Routes marketplace leads (VERSION CORRIGÉE)
import partnerRoutes from './partner'; // 🤝 Routes portal partenaires
import publicFormsRoutes from './publicForms'; // 📝 Routes formulaires publics
import landingPagesRoutes from './landingPages'; // 🌐 Routes landing pages
import campaignAnalyticsRoutes from './campaignAnalytics'; // 📊 Routes analytics campagnes
import dispatchRoutes from './dispatch'; // 🚚 Rules engine (Dispatch)
import integrationsStatusRoutes from './integrationsStatus'; // 🔌 État des intégrations
import integrationsRoutes from './integrations'; // 🔌 Intégrations (advertising/ecommerce)

// 🌐 ROUTES PUBLIQUES (sans authentification)
import publicLeadsRoutes from './publicLeads'; // 🌍 API publique leads

const apiRouter = Router();

console.log('[ROUTER] Configuration du routeur principal');

// Routes d'authentification
apiRouter.use('/auth', authRoutes);
console.log('[ROUTER] Routes d\'authentification montées sur /auth');

// Routes pour l'authentification Google automatique
apiRouter.use('/auto-google-auth', autoGoogleAuthRoutes);
console.log('[ROUTER] Routes auto-google-auth montées sur /auto-google-auth');

// Routes diverses (me, register, etc.)
apiRouter.use('/', miscRoutes);
console.log('[ROUTER] Routes diverses montées sur /');

// Routes de profil utilisateur
apiRouter.use('/profile', profileRoutes);
console.log('[ROUTER] Routes profil montées sur /profile');

// Route de déconnexion directe (attendue par le frontend)
apiRouter.post('/logout', logout);
console.log('[ROUTER] Route de déconnexion montée sur /logout');

// Routes des organisations
apiRouter.use('/organizations', organizationsRoutes);
console.log('[ROUTER] Routes des organisations montées sur /organizations');

// Routes de configuration Google Workspace par organisation
apiRouter.use('/organizations', googleWorkspaceRoutes);
console.log('[ROUTER] Routes Google Workspace montées sur /organizations');

// Routes Google Workspace pour les utilisateurs
apiRouter.use('/google-workspace', googleWorkspaceRoutes);
console.log('[ROUTER] Routes Google Workspace utilisateurs montées sur /google-workspace');

// Routes des modules
apiRouter.use('/modules', modulesRoutes);
console.log('[ROUTER] Routes des modules montées sur /modules');

// Routes administration modules DYNAMIQUE
apiRouter.use('/admin-modules', adminModulesRoutes);
console.log('[ROUTER] Routes administration modules DYNAMIQUE montées sur /admin-modules');

// Routes des icônes
apiRouter.use('/icons', iconsRoutes);
console.log('[ROUTER] Routes des icônes montées sur /icons');

// Routes des blocks
apiRouter.use('/blocks', blocksRoutes);
console.log('[ROUTER] Routes des blocks montées sur /blocks');

// Routes des fields (inclut validations/formulas/dependencies en sous-routes)
apiRouter.use('/fields', fieldsRoutes);
console.log('[ROUTER] Routes des fields montées sur /fields');

// Routes des sections (redirections + informations)
apiRouter.use('/sections', sectionsRoutes);
console.log('[ROUTER] Routes des sections montées sur /sections (avec redirections)');

// Routes de navigation des modules (module.category)
apiRouter.use('/module-navigation', moduleNavigationRoutes);
console.log('[ROUTER] Routes navigation modules montées sur /module-navigation');

// Routes des sections de formulaires (Block→Section→Field)  
apiRouter.use('/form-sections', formSectionsRoutes);
console.log('[ROUTER] Routes sections formulaires montées sur /form-sections');

// Routes des types de champs (Prisma FieldType)
apiRouter.use('/field-types', fieldTypesRoutes);
console.log('[ROUTER] Routes des types de champs montées sur /field-types');

// Routes des arborescences d'options (advanced_select)
apiRouter.use('/option-nodes', optionNodesRoutes);
console.log('[ROUTER] Routes des option-nodes montées sur /option-nodes');

// Routes des notifications
apiRouter.use('/notifications', notificationsRoutes);
console.log('[ROUTER] Routes des notifications montées sur /notifications');

// Routes du système de notifications
apiRouter.use('/notifications-system', notificationSystemRoutes);
console.log('[ROUTER] Routes du système de notifications montées sur /notifications-system');

// Routes des paramètres (settings)
apiRouter.use('/settings', settingsRoutes);
console.log('[ROUTER] Routes des paramètres montées sur /settings');

// Routes des leads
apiRouter.use('/leads', leadsRoutes);
console.log('[ROUTER] Routes des leads montées sur /leads');

// Routes du dashboard
apiRouter.use('/dashboard', dashboardRoutes);
console.log('[ROUTER] Routes du dashboard montées sur /dashboard');
console.log('[ROUTER] Routes des leads montées sur /leads');

// Routes des clients (basées sur les leads)
apiRouter.use('/clients', clientsRoutes);
console.log('[ROUTER] Routes des clients montées sur /clients');

// Routes des entreprises/sociétés
apiRouter.use('/company', companyRoutes);
console.log('[ROUTER] Routes des entreprises montées sur /company');

// Routes des projets (basées sur les leads)
apiRouter.use('/projects', projectsRoutes);
console.log('[ROUTER] Routes des projets montées sur /projects');

// Routes des emails (Gmail intégration)
apiRouter.use('/emails', emailsRoutes);
console.log('[ROUTER] Routes des emails montées sur /emails');

// Routes Gemini AI 🤖
apiRouter.use('/gemini', geminiRoutes);
console.log('[ROUTER] Routes Gemini AI montées sur /gemini');

// Routes des rôles
apiRouter.use('/roles', rolesRoutes);
console.log('[ROUTER] Routes des rôles montées sur /roles');

// Routes des permissions
apiRouter.use('/permissions', permissionsRoutes);
console.log('[ROUTER] Routes des permissions montées sur /permissions');

// Routes des utilisateurs
apiRouter.use('/users', usersRoutes);
console.log('[ROUTER] Routes des utilisateurs montées sur /users');

// Routes d'administration
apiRouter.use('/admin', adminRoutes);
console.log('[ROUTER] Routes admin montées sur /admin');

// Routes d'usurpation d'identité
apiRouter.use('/impersonate', impersonateRoutes);
console.log('[ROUTER] Routes usurpation montées sur /impersonate');

// Routes d'administration des mots de passe
apiRouter.use('/admin-password', adminPasswordRoutes);
console.log('[ROUTER] Routes admin-password montées sur /admin-password');

// Routes Gmail
apiRouter.use('/gmail', gmailRoutes);
console.log('[ROUTER] Routes Gmail montées sur /gmail');

// Routes Calendar
apiRouter.use('/calendar', calendarRoutes);
console.log('[ROUTER] Routes Calendar montées sur /calendar');

// Routes Google Auth (OAuth)
apiRouter.use('/google-auth', googleAuthRoutes);
console.log('[ROUTER] Routes Google Auth montées sur /google-auth');

// Routes Google Scheduler (Refresh automatique des tokens)
apiRouter.use('/google/scheduler', googleSchedulerRoutes);
console.log('[ROUTER] Routes Google Scheduler montées sur /google/scheduler');

// Routes Google Tokens Monitoring
apiRouter.use('/google-tokens', googleTokensRoutes);
console.log('[ROUTER] Routes Google Tokens Monitoring montées sur /google-tokens');

// Routes Google Auth - Alias pour compatibilité Google Cloud Console
apiRouter.use('/auth/google', googleAuthRoutes);
console.log('[ROUTER] Routes Google Auth (alias) montées sur /auth/google');

// 🔧 **ULTRA-SÉCURISÉ** : Routes des services externes (Email, Telnyx)
apiRouter.use('/services', servicesRoutes);
console.log('[ROUTER] Routes des services externes montées sur /services');

// Routes Telnyx Communications
apiRouter.use('/telnyx', telnyxRoutes);
console.log('[ROUTER] Routes Telnyx montées sur /telnyx');

// Routes Devis (Quotes)
apiRouter.use('/quotes', quotesRoutes);
console.log('[ROUTER] Routes Devis montées sur /quotes');

// Routes Google Drive
apiRouter.use('/google-drive', googleDriveRoutes);
console.log('[ROUTER] Routes Google Drive montées sur /google-drive');

// Routes Google Meet
apiRouter.use('/google-meet', googleMeetRoutes);
console.log('[ROUTER] Routes Google Meet montées sur /google-meet');

// Routes Analytics
apiRouter.use('/analytics', analyticsRoutes);
console.log('[ROUTER] Routes Analytics montées sur /analytics');

// Routes Intelligence Artificielle
apiRouter.use('/ai', aiRoutes);
console.log('[ROUTER] Routes IA montées sur /ai');

// Routes Exploration Code IA (sécurisées SuperAdmin)
apiRouter.use('/ai', aiCodeRoutes);
console.log('[ROUTER] Routes IA Code montées sur /ai/code/*');

// Routes Advanced Select Professional 🚀
apiRouter.use('/advanced-select', advancedSelectRoutes);
console.log('[ROUTER] Routes Advanced Select montées sur /advanced-select');

// Routes Système Dynamique Universel 🌟
apiRouter.use('/dynamic-formulas', dynamicFormulasRoutes);
console.log('[ROUTER] Routes Système Dynamique montées sur /dynamic-formulas');

// Routes TreeBranchLeaf 🌳 NOUVEAU système centralisé
apiRouter.use('/treebranchleaf', treeBranchLeafNewRoutes);
console.log('[ROUTER] Routes TreeBranchLeaf NOUVEAU système montées sur /treebranchleaf');

// Routes TreeBranchLeaf V2 🌳 (DÉSACTIVÉ - Migration vers architecture centralisée)
// apiRouter.use('/treebranchleaf-v2', treeBranchLeafV2Routes);
// console.log('[ROUTER] Routes TreeBranchLeaf V2 montées sur /treebranchleaf-v2');

// Routes TBL Intelligence 🧠 (Intelligence pour formules, conditions, tableaux)
apiRouter.use('/tbl', tblIntelligenceRoutes);
console.log('[ROUTER] Routes TBL Intelligence montées sur /tbl');

// Routes TBL 🎯 (TreeBranchLeaf Business Logic)
apiRouter.use('/tbl', tblRoutes);
console.log('[ROUTER] Routes TBL montées sur /tbl');

// Routes TBL Capabilities (pré-chargement des capacités sourceRef)
apiRouter.use('/tbl', tblCapabilitiesRoutes);
console.log('[ROUTER] Routes TBL Capabilities montées sur /tbl');

// ... (autres montages de routeurs)

// Alias top-level pour les validations (DELETE/PATCH /api/validations/:id)
apiRouter.use('/validations', validationsRoutes);
console.log('[ROUTER] Routes validations (top-level) montées sur /validations');

// Alias top-level pour les formules (GET/PUT/DELETE /api/formulas/*)
apiRouter.use('/formulas', formulasApiRoutes);
console.log('[ROUTER] Routes formules (top-level) montées sur /formulas');

// Alias top-level pour les dépendances (PUT/DELETE /api/dependencies/:id)
apiRouter.use('/dependencies', dependenciesApiRoutes);
console.log('[ROUTER] Routes dépendances (top-level) montées sur /dependencies');

// Routes des invitations
apiRouter.use('/invitations', invitationRoutes);
console.log('[ROUTER] Routes des invitations montées sur /invitations');

// 🎯 DEVIS1MINUTE - Nouvelles routes modularisées
apiRouter.use('/lead-generation', leadGenerationRoutes);
console.log('[ROUTER] Routes Lead Generation montées sur /lead-generation');

apiRouter.use('/marketplace', marketplaceRoutes);
console.log('[ROUTER] Routes Marketplace montées sur /marketplace');

apiRouter.use('/partner', partnerRoutes);
console.log('[ROUTER] Routes Partner Portal montées sur /partner');

apiRouter.use('/forms', publicFormsRoutes);
console.log('[ROUTER] Routes Public Forms montées sur /forms');

apiRouter.use('/landing-pages', landingPagesRoutes);
console.log('[ROUTER] Routes Landing Pages montées sur /landing-pages');

apiRouter.use('/campaign-analytics', campaignAnalyticsRoutes);
console.log('[ROUTER] Routes Campaign Analytics montées sur /campaign-analytics');

apiRouter.use('/dispatch', dispatchRoutes);
console.log('[ROUTER] Routes Dispatch montées sur /dispatch');

// Monter les deux routeurs d'intégrations: status agrégé + advertising/ecommerce
apiRouter.use('/integrations', integrationsRoutes);
apiRouter.use('/integrations', integrationsStatusRoutes);
console.log('[ROUTER] Routes Integrations (status + advertising/ecommerce) montées sur /integrations');

// 🌐 ROUTES PUBLIQUES (sans authentification requise)
apiRouter.use('/public', publicLeadsRoutes);
console.log('[ROUTER] Routes Public API montées sur /public');

// apiRouter.use('/auth/google', googleAuthRouter); // NOUVEAU: Authentification Google OAuth - Commenté car non défini

// Route simple pour vérifier que l'API fonctionne (non authentifiée)
apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default apiRouter;
