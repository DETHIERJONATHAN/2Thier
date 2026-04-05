import { Router } from 'express';
import { login, getMe, logout } from '../controllers/authController';

const authRouter = Router();


// Route de connexion (non authentifiée)
authRouter.post('/login', login);

// Route pour récupérer les informations de l'utilisateur connecté (authentifiée)
authRouter.get('/me', getMe);

// Route de déconnexion (authentifiée)
authRouter.post('/logout', logout);


export default authRouter;
