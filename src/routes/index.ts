import { Router } from 'express';
import authRoutes from './authRoutes';
import gmailRoutes from './gmailRoutes'; // Réactivé
import miscRoutes from './misc';
import modulesRoutes from './modules';
import companyRoutes from './company'; // ✅ RÉACTIVÉ - Fichier créé
import invitationRoutes from './invitations';
import organizationsRoutes from './organizations';
import autoGoogleAuthRoutes from './autoGoogleAuthRoutes';
import googleAuthRoutes from './google-auth'; // ✅ NOUVELLE ROUTE GOOGLE AUTH
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
import googleDriveRoutes from './google-drive'; // 📁 Routes Google Drive
import googleMeetRoutes from './google-meet'; // 📹 Routes Google Meet
import analyticsRoutes from './analytics'; // 📊 Routes Analytics
import aiRoutes from './ai'; // 🤖 Routes Intelligence Artificielle
import aiCodeRoutes from './ai-code'; // 🧩 Exploration code IA (SuperAdmin)
import { logout } from '../controllers/authController';
// import googleAuthRouter from './authGoogleRoutes'; // Commenté car non défini ou non utilisé

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

// Routes des blocks
apiRouter.use('/blocks', blocksRoutes);
console.log('[ROUTER] Routes des blocks montées sur /blocks');

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

// Routes Google Auth - Alias pour compatibilité Google Cloud Console
apiRouter.use('/auth/google', googleAuthRoutes);
console.log('[ROUTER] Routes Google Auth (alias) montées sur /auth/google');

// 🔧 **ULTRA-SÉCURISÉ** : Routes des services externes (Email, Telnyx)
apiRouter.use('/services', servicesRoutes);
console.log('[ROUTER] Routes des services externes montées sur /services');

// Routes Telnyx Communications
apiRouter.use('/telnyx', telnyxRoutes);
console.log('[ROUTER] Routes Telnyx montées sur /telnyx');

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

// ... (autres montages de routeurs)

// Routes des invitations
apiRouter.use('/invitations', invitationRoutes);
console.log('[ROUTER] Routes des invitations montées sur /invitations');

// apiRouter.use('/auth/google', googleAuthRouter); // NOUVEAU: Authentification Google OAuth - Commenté car non défini

// Route simple pour vérifier que l'API fonctionne (non authentifiée)
apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default apiRouter;
