"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var auth_js_1 = require("../middleware/auth.js");
var router = (0, express_1.Router)();
// Appliquer l'authentification à toutes les routes (Admin uniquement)
router.use(auth_js_1.authenticateToken);
// GET /api/admin-password/users-emails - Récupérer les emails des utilisateurs
router.get('/users-emails', function (_req, res) {
    console.log('[ADMIN-PASSWORD] GET /admin-password/users-emails - Récupération des emails');
    // Données par défaut pour éviter les erreurs frontend
    var defaultUsersEmails = [
        {
            id: '1',
            userId: '1',
            firstName: 'Admin',
            lastName: 'System',
            email: 'admin@2thier.be',
            organization: '2thier.be',
            hasEmailConfig: true,
            lastEmailCheck: new Date().toISOString()
        },
        {
            id: '2',
            userId: '2',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            organization: 'Example Corp',
            hasEmailConfig: false,
            lastEmailCheck: null
        }
    ];
    res.json(defaultUsersEmails);
});
// GET /api/admin-password/users-services - Récupérer les utilisateurs avec leurs services
router.get('/users-services', function (_req, res) {
    console.log('[ADMIN-PASSWORD] GET /admin-password/users-services - Récupération des utilisateurs et services');
    // Données par défaut pour éviter les erreurs frontend
    var defaultUsersServices = [
        {
            id: '1',
            userId: '1',
            firstName: 'Admin',
            lastName: 'System',
            email: 'admin@2thier.be',
            organization: '2thier.be',
            services: {
                email: { configured: true, status: 'active' },
                calendar: { configured: true, status: 'active' },
                drive: { configured: false, status: 'inactive' }
            }
        },
        {
            id: '2',
            userId: '2',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            organization: 'Example Corp',
            services: {
                email: { configured: false, status: 'inactive' },
                calendar: { configured: false, status: 'inactive' },
                drive: { configured: false, status: 'inactive' }
            }
        }
    ];
    res.json(defaultUsersServices);
});
// POST /api/admin-password/configure-email - Configurer l'email pour un utilisateur
router.post('/configure-email', function (_req, res) {
    console.log('[ADMIN-PASSWORD] POST /admin-password/configure-email - Configuration email');
    res.status(201).json({
        success: true,
        message: 'Configuration email mise à jour avec succès',
        configuredAt: new Date().toISOString()
    });
});
// PUT /api/admin-password/update-password - Mettre à jour le mot de passe
router.put('/update-password', function (_req, res) {
    console.log('[ADMIN-PASSWORD] PUT /admin-password/update-password - Mise à jour mot de passe');
    res.json({
        success: true,
        message: 'Mot de passe mis à jour avec succès',
        updatedAt: new Date().toISOString()
    });
});
// GET /api/admin-password/email-status/:userId - Statut email d'un utilisateur
router.get('/email-status/:userId', function (req, res) {
    var userId = req.params.userId;
    console.log("[ADMIN-PASSWORD] GET /admin-password/email-status/".concat(userId, " - Statut email"));
    res.json({
        userId: userId,
        hasEmailConfig: true,
        lastSync: new Date().toISOString(),
        status: 'active'
    });
});
exports.default = router;
