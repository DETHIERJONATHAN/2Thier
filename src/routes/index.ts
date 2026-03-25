import { Router } from 'express';
import authRoutes from './authRoutes';
import gmailRoutes from './gmailRoutes'; // Réactivé
import miscRoutes from './misc';
import profileRoutes from './profile';
import modulesRoutes from './modules';
import adminModulesRoutes from './admin-modules'; // 🎯 ROUTES ADMINISTRATION MODULES DYNAMIQUE
import adminTreesRoutes from './admin-trees'; // 🌳 ROUTES ADMINISTRATION ARBRES
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
import chantiersRoutes from './chantiersRoutes'; // 🏗️ Routes chantiers
import chantierStatusesRoutes from './chantier-statuses'; // 🏗️ Routes statuts chantiers
import chantierWorkflowRoutes from './chantier-workflow'; // 🏗️ Routes workflow chantiers (transitions, factures, événements, historique)
import eSignatureRoutes from './e-signature'; // ✍️ Signature électronique avancée + PDF TBL
import teamsRoutes from './teams'; // 👥 Routes équipes & techniciens
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
import gestionnaireRoutes from './gestionnaire'; // 📋 Routes Gestionnaire (overrides par organisation)
import { tblSelectConfigRouter } from './tbl-select-config-route'; // 🎯 NOUVEAU: Route dédiée pour select-config
import { logout } from '../controllers/authController';
// import googleAuthRouter from './authGoogleRoutes'; // Commenté car non défini ou non utilisé

// 🎯 DEVIS1MINUTE - Nouvelles routes
import leadGenerationRoutes from './leadGeneration'; // 🎯 Routes génération de leads
import marketplaceRoutes from './marketplace-fixed'; // 🏪 Routes marketplace leads (VERSION CORRIGÉE)
import partnerRoutes from './partner'; // 🤝 Routes portal partenaires
import publicFormsRoutes from './publicForms'; // 📝 Routes formulaires publics
import landingPagesRoutes from './landingPages'; // 🌐 Routes landing pages
import yandexMailRoutes from './yandex-mail'; // 📧 Routes Yandex Mail (IMAP/SMTP)
import mailProviderRoutes from './mail-provider'; // 🔍 Détection fournisseur mail (Gmail/Yandex)
import campaignAnalyticsRoutes from './campaignAnalytics'; // 📊 Routes analytics campagnes
import dispatchRoutes from './dispatch'; // 🚚 Rules engine (Dispatch)
import integrationsStatusRoutes from './integrationsStatus'; // 🔌 État des intégrations
import integrationsRoutes from './integrations'; // 🔌 Intégrations (advertising/ecommerce)

// 🌐 ROUTES PUBLIQUES (sans authentification)
import publicLeadsRoutes from './publicLeads'; // 🌍 API publique leads
import documentsRoutes from './documents'; // 📄 Routes documents (templates, génération PDF)
import productDocumentsRoutes from './product-documents'; // 📋 Routes fiches techniques produits (panneaux/onduleurs)
import syncTempRoutes from './sync-temp'; // 🔄 TEMPORAIRE: Sync documents
import joinRequestsRoutes from './join-requests'; // 📝 Routes demandes d'adhésion
import wallRoutes from './wall'; // 🏠 Routes Mur / Réseau Social d'Entreprise
import friendsRoutes from './friends'; // 👥 Routes Amis
import messengerRoutes from './messenger'; // 💬 Routes Messenger
import callsRoutes from './calls'; // 📹 Routes Appels Vidéo/Audio
import pushRoutes from './push'; // 🔔 Routes Push Notifications
import zhiiveRoutes from './zhiive'; // 🌊 Routes Zhiive — Réseau Social Nouvelle Génération
import globalSearchRoutes from './globalSearch'; // 🔍 Recherche universelle globale
import { authenticateToken, fetchFullUser } from '../middleware/auth'; // 🔐 Middleware auth pour TBL

const apiRouter = Router();



// Routes d'authentification
apiRouter.use('/auth', authRoutes);
console.log('[ROUTER] Routes d\'authentification montées sur /auth');

// Routes pour l'authentification Google automatique
apiRouter.use('/auto-google-auth', autoGoogleAuthRoutes);


// Routes diverses (me, register, etc.)
apiRouter.use('/', miscRoutes);


// Routes de profil utilisateur
apiRouter.use('/profile', profileRoutes);


// Route de déconnexion directe (attendue par le frontend)
apiRouter.post('/logout', logout);


// Routes des organisations
apiRouter.use('/organizations', organizationsRoutes);


// Routes de configuration Google Workspace par organisation
apiRouter.use('/organizations', googleWorkspaceRoutes);


// Routes Google Workspace pour les utilisateurs
apiRouter.use('/google-workspace', googleWorkspaceRoutes);


// Routes des modules
apiRouter.use('/modules', modulesRoutes);


// Routes administration modules DYNAMIQUE
apiRouter.use('/admin-modules', adminModulesRoutes);


// Routes des icônes
apiRouter.use('/icons', iconsRoutes);


// Routes des blocks
apiRouter.use('/blocks', blocksRoutes);


// Routes des fields (inclut validations/formulas/dependencies en sous-routes)
apiRouter.use('/fields', fieldsRoutes);


// Routes des sections (redirections + informations)
apiRouter.use('/sections', sectionsRoutes);


// Routes de navigation des modules (module.category)
apiRouter.use('/module-navigation', moduleNavigationRoutes);


// Routes des sections de formulaires (Block→Section→Field)  
apiRouter.use('/form-sections', formSectionsRoutes);


// Routes des types de champs (Prisma FieldType)
apiRouter.use('/field-types', fieldTypesRoutes);


// Routes des arborescences d'options (advanced_select)
apiRouter.use('/option-nodes', optionNodesRoutes);


// Routes des notifications
apiRouter.use('/notifications', notificationsRoutes);


// Routes du système de notifications
apiRouter.use('/notifications-system', notificationSystemRoutes);


// Routes des paramètres (settings)
apiRouter.use('/settings', settingsRoutes);


// Routes des leads
apiRouter.use('/leads', leadsRoutes);


// Routes des chantiers 🏗️
apiRouter.use('/chantiers', chantiersRoutes);


// Routes des statuts de chantier 🏗️
apiRouter.use('/chantier-statuses', chantierStatusesRoutes);

// Routes workflow chantier (transitions, factures, événements, historique) 🏗️
apiRouter.use('/chantier-workflow', chantierWorkflowRoutes);

// Routes signature électronique avancée + PDF TBL ✍️
apiRouter.use('/e-signature', eSignatureRoutes);

// Routes équipes & techniciens 👥
apiRouter.use('/teams', teamsRoutes);


// Routes du dashboard
apiRouter.use('/dashboard', dashboardRoutes);



// Routes des clients (basées sur les leads)
apiRouter.use('/clients', clientsRoutes);


// Routes des entreprises/sociétés
apiRouter.use('/company', companyRoutes);


// Routes des projets (basées sur les leads)
apiRouter.use('/projects', projectsRoutes);


// Routes des emails (Gmail intégration)
apiRouter.use('/emails', emailsRoutes);


// Routes Gemini AI 🤖
apiRouter.use('/gemini', geminiRoutes);


// Routes des rôles
apiRouter.use('/roles', rolesRoutes);


// Routes des permissions
apiRouter.use('/permissions', permissionsRoutes);


// Routes des utilisateurs
apiRouter.use('/users', usersRoutes);


// Routes d'administration
apiRouter.use('/admin', adminRoutes);

// 🌳 Routes admin gestion des arbres (TreeBranchLeaf)
apiRouter.use('/admin-trees', adminTreesRoutes);


// Routes d'usurpation d'identité
apiRouter.use('/impersonate', impersonateRoutes);


// Routes d'administration des mots de passe
apiRouter.use('/admin-password', adminPasswordRoutes);


// Routes Gmail
apiRouter.use('/gmail', gmailRoutes);


// Routes Yandex Mail (📧 IMAP/SMTP — alternative à Gmail)
apiRouter.use('/yandex', yandexMailRoutes);


// Routes détection fournisseur mail (🔍 Gmail ou Yandex ?)
apiRouter.use('/mail', mailProviderRoutes);


// Routes Calendar
apiRouter.use('/calendar', calendarRoutes);


// Routes Google Auth (OAuth)
apiRouter.use('/google-auth', googleAuthRoutes);


// Routes Google Scheduler (Refresh automatique des tokens)
apiRouter.use('/google/scheduler', googleSchedulerRoutes);


// Routes Google Tokens Monitoring
apiRouter.use('/google-tokens', googleTokensRoutes);


// Routes Google Auth - Alias pour compatibilité Google Cloud Console
apiRouter.use('/auth/google', googleAuthRoutes);


// 🔧 **ULTRA-SÉCURISÉ** : Routes des services externes (Email, Telnyx)
apiRouter.use('/services', servicesRoutes);


// Routes Telnyx Communications
apiRouter.use('/telnyx', telnyxRoutes);


// Routes Devis (Quotes)
apiRouter.use('/quotes', quotesRoutes);


// Routes Google Drive
apiRouter.use('/google-drive', googleDriveRoutes);


// Routes Google Meet
apiRouter.use('/google-meet', googleMeetRoutes);


// Routes Analytics
apiRouter.use('/analytics', analyticsRoutes);


// Routes Intelligence Artificielle
apiRouter.use('/ai', aiRoutes);


// Routes Exploration Code IA (sécurisées SuperAdmin)
apiRouter.use('/ai', aiCodeRoutes);


// Routes Advanced Select Professional 🚀
apiRouter.use('/advanced-select', advancedSelectRoutes);


// Routes Système Dynamique Universel 🌟
apiRouter.use('/dynamic-formulas', dynamicFormulasRoutes);


// Routes TreeBranchLeaf 🌳 NOUVEAU système centralisé
// 🔐 Appliquer authenticateToken + fetchFullUser pour que req.user.role soit disponible
apiRouter.use('/treebranchleaf', authenticateToken, fetchFullUser, treeBranchLeafNewRoutes);


// Routes TreeBranchLeaf V2 🌳 (DÉSACTIVÉ - Migration vers architecture centralisée)
// apiRouter.use('/treebranchleaf-v2', treeBranchLeafV2Routes);
// 

// Routes TBL Intelligence 🧠 (Intelligence pour formules, conditions, tableaux)
apiRouter.use('/tbl', tblIntelligenceRoutes);


// Routes TBL 🎯 (TreeBranchLeaf Business Logic)
apiRouter.use('/tbl', tblRoutes);


// Routes TBL Capabilities (pré-chargement des capacités sourceRef)
apiRouter.use('/tbl', tblCapabilitiesRoutes);


// 📋 Routes Gestionnaire (overrides par organisation)
apiRouter.use('/gestionnaire', authenticateToken, fetchFullUser, gestionnaireRoutes);


// Routes TBL Select Config 🎯 (NOUVELLE ROUTE DEDIEE)
apiRouter.use('/treebranchleaf', tblSelectConfigRouter); // 🎯 MONTAGE DE LA NOUVELLE ROUTE

// ... (autres montages de routeurs)

// Alias top-level pour les validations (DELETE/PATCH /api/validations/:id)
apiRouter.use('/validations', validationsRoutes);


// Alias top-level pour les formules (GET/PUT/DELETE /api/formulas/*)
apiRouter.use('/formulas', formulasApiRoutes);


// Alias top-level pour les dépendances (PUT/DELETE /api/dependencies/:id)
apiRouter.use('/dependencies', dependenciesApiRoutes);


// Routes des invitations
apiRouter.use('/invitations', invitationRoutes);


// Routes des demandes d'adhésion (JoinRequest)
apiRouter.use('/join-requests', joinRequestsRoutes);


// 🎯 DEVIS1MINUTE - Nouvelles routes modularisées
apiRouter.use('/lead-generation', leadGenerationRoutes);


apiRouter.use('/marketplace', marketplaceRoutes);


apiRouter.use('/partner', partnerRoutes);


apiRouter.use('/forms', publicFormsRoutes);


apiRouter.use('/public-forms', publicFormsRoutes);


apiRouter.use('/landing-pages', landingPagesRoutes);


apiRouter.use('/campaign-analytics', campaignAnalyticsRoutes);


apiRouter.use('/dispatch', dispatchRoutes);


// Monter les deux routeurs d'intégrations: status agrégé + advertising/ecommerce
apiRouter.use('/integrations', integrationsRoutes);
apiRouter.use('/integrations', integrationsStatusRoutes);


// 🌐 ROUTES PUBLIQUES (sans authentification requise)
apiRouter.use('/public', publicLeadsRoutes);


// 📄 Routes Documents (templates, génération PDF)
apiRouter.use('/documents', documentsRoutes);

// � Routes Fiches Techniques Produits (panneaux, onduleurs)
apiRouter.use('/product-documents', productDocumentsRoutes);
console.log('[ROUTER] Routes fiches techniques produits montées sur /product-documents');

// �🔄 TEMPORAIRE: Sync documents vers Cloud SQL
apiRouter.use('/sync', syncTempRoutes);

// 🏠 MUR / RÉSEAU SOCIAL D'ENTREPRISE
apiRouter.use('/wall', wallRoutes);

// 👥 AMIS & 💬 MESSENGER & 📹 APPELS & 🔔 PUSH
apiRouter.use('/friends', friendsRoutes);
apiRouter.use('/messenger', messengerRoutes);
apiRouter.use('/calls', callsRoutes);
apiRouter.use('/push', pushRoutes);

// 🌊 ZHIIVE — RÉSEAU SOCIAL NOUVELLE GÉNÉRATION
apiRouter.use('/zhiive', zhiiveRoutes);

// apiRouter.use('/auth/google', googleAuthRouter); // NOUVEAU: Authentification Google OAuth - Commenté car non défini

// 🔍 RECHERCHE UNIVERSELLE GLOBALE
apiRouter.use('/search', globalSearchRoutes);

// Route simple pour vérifier que l'API fonctionne (non authentifiée)
apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default apiRouter;
