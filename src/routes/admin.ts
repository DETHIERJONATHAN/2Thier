import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { encrypt } from '../utils/crypto';
import { requireRole } from '../middlewares/requireRole';
import { authMiddleware } from '../middlewares/auth';
import { impersonationMiddleware } from '../middlewares/impersonation';

const prisma = new PrismaClient();
const router = express.Router();

router.use(authMiddleware, impersonationMiddleware);

// Route pour récupérer un utilisateur par son ID (pour restaurer l'impersonation)
router.get('/users/:id', requireRole(['super_admin']), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id: id },
      select: { // On ne sélectionne que les champs nécessaires
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      }
    });

    if (!user) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }
    res.json(user);
  } catch (error) {
    console.error(`Erreur lors de la récupération de l'utilisateur ${id}:`, error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Route pour récupérer le statut mail de tous les utilisateurs (pour l'admin)
router.get('/users/mail-status', requireRole(['super_admin']), async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      include: {
        mailSettings: true,
      },
    });

    const usersWithMailStatus = users.map(user => {
      return {
        id: user.id,
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        isMailConfigured: user.mailSettings?.isVerified ?? false,
      };
    });

    res.json(usersWithMailStatus);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Route pour définir/mettre à jour le mot de passe mail d'un utilisateur
router.post('/mail/settings', requireRole(['super_admin']), async (req: Request, res: Response): Promise<void> => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    res.status(400).json({ error: "L'ID de l'utilisateur et le mot de passe sont requis." });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'Utilisateur non trouvé.' });
      return;
    }

    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    if (!userName) {
        res.status(400).json({ error: "Le nom de l'utilisateur n'est pas défini, impossible de créer l'adresse email." });
        return;
    }

    const encryptedPassword = encrypt(password);
    const userEmail = `${userName.replace(/\s+/g, '.').toLowerCase()}@2thier.be`;

    await prisma.mailSettings.upsert({
      where: { userId },
      update: {
        encryptedPassword: encryptedPassword,
        isVerified: true,
      },
      create: {
        userId,
        emailAddress: userEmail,
        encryptedPassword: encryptedPassword,
        imapHost: 'imap.one.com',
        imapPort: 993,
        smtpHost: 'mail.one.com',
        smtpPort: 465,
        isVerified: true,
      },
    });

    res.status(200).json({ message: 'Configuration mail mise à jour avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la configuration mail:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Route pour récupérer les paramètres mail d'un utilisateur
router.get('/mail/settings', async (req: Request, res: Response): Promise<void> => {
  try {
    // Récupère l'ID de l'utilisateur à partir du token JWT
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ error: 'Utilisateur non authentifié.' });
      return;
    }

    // Récupère les paramètres mail de l'utilisateur
    const mailSettings = await prisma.mailSettings.findUnique({
      where: { userId },
    });

    if (!mailSettings) {
      res.status(404).json({ error: 'Aucune configuration mail trouvée pour cet utilisateur.' });
      return;
    }

    // Masque le mot de passe dans la réponse
    const { encryptedPassword, ...settings } = mailSettings;
    
    res.status(200).json(settings);
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres mail:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

export default router;
