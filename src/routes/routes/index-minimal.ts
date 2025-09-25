import { Router } from 'express';

export const mainApiRouter = Router();

// Route de santé simple
mainApiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'API CRM en ligne'
  });
});

// Route test d'authentification
mainApiRouter.get('/auth/test', (req, res) => {
  res.json({
    authenticated: !!req.user,
    user: req.user ? req.user.email : null,
    session: !!req.session
  });
});

// Endpoints demandés par l'utilisateur
mainApiRouter.get('/notifications', (req, res) => {
  res.json({
    success: true,
    notifications: []
  });
});

mainApiRouter.get('/modules/all', (req, res) => {
  res.json({
    success: true,
    modules: []
  });
});

mainApiRouter.get('/blocks', (req, res) => {
  res.json({
    success: true,
    blocks: []
  });
});

mainApiRouter.get('/auto-google-auth/connect', (req, res) => {
  res.json({
    success: true,
    message: 'Google Auth endpoint accessible'
  });
});

console.log('✅ Routes principales configurées');
