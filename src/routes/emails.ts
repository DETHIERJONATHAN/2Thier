import { Router } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';
import GmailService from '../services/GmailService.js';

const router = Router();

/**
 * @route   GET /api/emails
 * @desc    Récupère les emails Gmail de l'utilisateur authentifié pour un dossier donné.
 * @access  Private
 */
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  const { folder = 'INBOX' } = req.query;

  try {
    const threads = await GmailService.listThreads(req.user.userId, folder as string);
    res.json(threads);
  } catch (error) {
    console.error(`Erreur lors de la récupération des emails Gmail du dossier ${folder}:`, error);
    
    // Gérer les erreurs d'authentification spécifiquement
    if (error instanceof Error && error.message.includes('Authentication failed')) {
      return res.status(401).json({ 
        error: 'Authentification Google requise', 
        needsAuth: true 
      });
    }
    
    // Gérer le cas où l'utilisateur n'est pas connecté à Google
    if (error instanceof Error && error.message.includes('not authenticated with Google')) {
      return res.status(200).json([]); // Retourner un tableau vide plutôt qu'une erreur
    }
    
    // Autres erreurs : retourner un tableau vide pour éviter de casser l'agenda
    console.warn(`Gmail non disponible pour user ${req.user.userId}, retour d'un tableau vide`);
    res.status(200).json([]);
  }
});

/**
 * @route   GET /api/emails/thread/:threadId
 * @desc    Récupère les détails d'une conversation Gmail
 * @access  Private
 */
router.get('/thread/:threadId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  const { threadId } = req.params;

  try {
    const threadDetails = await GmailService.getThreadDetails(req.user.userId, threadId);
    res.json(threadDetails);
  } catch (error) {
    console.error(`Erreur lors de la récupération du thread ${threadId}:`, error);
    res.status(500).json({ error: 'Une erreur interne est survenue.' });
  }
});

/**
 * @route   POST /api/emails/send
 * @desc    Envoie un email via Gmail
 * @access  Private
 */
router.post('/send', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  const { to, subject, body } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Destinataire, sujet et corps requis' });
  }

  try {
    const result = await GmailService.sendEmail(req.user.userId, to, subject, body);
    res.json({ success: true, messageId: result.id });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    res.status(500).json({ error: 'Une erreur interne est survenue.' });
  }
});

export default router;