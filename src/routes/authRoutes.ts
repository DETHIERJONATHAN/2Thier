import { Router } from 'express';
import { login, getMe, logout } from '../controllers/authController';

const authRouter = Router();

console.log('[AUTH ROUTES] Chargement des routes d\'authentification');

// Route de connexion (non authentifiée)
authRouter.post('/login', login);

// Route pour récupérer les informations de l'utilisateur connecté (authentifiée)
authRouter.get('/me', getMe);

// Route de déconnexion (authentifiée)
authRouter.post('/logout', logout);

console.log('[AUTH ROUTES] Routes d\'authentification configurées: /login, /me, /logout');

export default authRouter;
