"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var authController_1 = require("../controllers/authController");
var authRouter = (0, express_1.Router)();
console.log('[AUTH ROUTES] Chargement des routes d\'authentification');
// Route de connexion (non authentifiée)
authRouter.post('/login', authController_1.login);
// Route pour récupérer les informations de l'utilisateur connecté (authentifiée)
authRouter.get('/me', authController_1.getMe);
// Route de déconnexion (authentifiée)
authRouter.post('/logout', authController_1.logout);
console.log('[AUTH ROUTES] Routes d\'authentification configurées: /login, /me, /logout');
exports.default = authRouter;
