import { Router } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();

/**
 * @route   POST /api/email-sync/test
 * @desc    Test de synchronisation des emails (pour développement)
 * @access  Private
 */
router.post('/test', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  try {
    // Pour l'instant, on simule la synchronisation
    console.log(`🧪 [TEST] Simulation synchronisation pour utilisateur ${req.user.userId}`);
    
    // Créer quelques emails de test
    const testEmails = [
      {
        from: 'test@example.com',
        to: 'jonathan.dethier@2thier.be',
        subject: '🎉 Bienvenue dans votre nouvelle boîte mail !',
        body: 'Félicitations ! Votre boîte mail professionnelle est maintenant active. Vous pouvez commencer à recevoir et envoyer des emails.',
        isRead: false,
      },
      {
        from: 'noreply@2thier.be',
        to: 'jonathan.dethier@2thier.be',
        subject: '📧 Configuration de votre compte email',
        body: 'Votre compte email a été configuré avec succès. Toutes les fonctionnalités sont maintenant disponibles.',
        isRead: false,
      },
      {
        from: 'support@2thier.be',
        to: 'jonathan.dethier@2thier.be',
        subject: '🚀 Guide de démarrage rapide',
        body: `
          <h2>Guide de démarrage</h2>
          <p>Voici comment utiliser votre nouvelle interface email :</p>
          <ul>
            <li>📥 Consultez vos emails dans la boîte de réception</li>
            <li>✉️ Rédigez un nouveau message avec le bouton "Nouveau message"</li>
            <li>📂 Organisez vos emails dans différents dossiers</li>
            <li>⭐ Marquez vos emails importants comme favoris</li>
          </ul>
          <p>Bonne utilisation !</p>
        `,
        isRead: true,
        contentType: 'text/html',
      }
    ];

    // Importer prisma pour créer les emails de test
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    for (const emailData of testEmails) {
      await prisma.email.create({
        data: {
          userId: req.user.userId,
          from: emailData.from,
          to: emailData.to,
          subject: emailData.subject,
          body: emailData.body,
          contentType: emailData.contentType || 'text/plain',
          folder: 'inbox',
          isRead: emailData.isRead,
          isStarred: false,
        }
      });
    }

    res.json({
      success: true,
      message: 'Emails de test créés avec succès',
      count: testEmails.length
    });

  } catch (error) {
    console.error('❌ [TEST] Erreur lors de la création des emails de test:', error);
    res.status(500).json({
      error: 'Erreur lors de la synchronisation de test',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * @route   POST /api/email-sync/real
 * @desc    Synchronisation réelle avec un serveur IMAP (future implémentation)
 * @access  Private
 */
router.post('/real', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  try {
    // TODO: Implémenter la vraie synchronisation IMAP
    res.json({
      success: false,
      message: 'Synchronisation IMAP en cours de développement',
      status: 'coming_soon'
    });

  } catch (error) {
    console.error('❌ [REAL] Erreur synchronisation IMAP:', error);
    res.status(500).json({
      error: 'Erreur lors de la synchronisation',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

export default router;
