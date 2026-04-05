import { Router } from 'express';

const apiRouter = Router();


// Route simple pour vérifier que l'API fonctionne
apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), test: 'minimal router works' });
});

// Route de test auth pour confirmer la connexion
apiRouter.get('/auth/me', (_req, res) => {
  res.json({ 
    currentUser: { 
      id: 'test', 
      email: 'test@test.com', 
      firstName: 'Test', 
      lastName: 'User',
      test: 'minimal auth works'
    } 
  });
});

export default apiRouter;
