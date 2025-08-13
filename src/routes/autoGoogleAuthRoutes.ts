import { Router } from 'express';
import { googleOAuthService } from '../google-auth/core/GoogleOAuthCore.js';
import { prisma } from '../lib/prisma';

const router = Router();

// POST /api/auto-google-auth/connect
// Tente de connecter l'utilisateur à Google Workspace en arrière-plan.
// Si les tokens existent et sont valides (ou peuvent être rafraîchis), c'est transparent.
// Sinon, renvoie une URL d'autorisation pour que le frontend puisse rediriger l'utilisateur.
router.post('/connect', async (req, res) => {
  console.log('[ROUTE] /api/auto-google-auth/connect atteint');
  const { userId, organizationId } = req.body;

  if (!userId || !organizationId) {
    return res.status(400).json({ error: 'userId et organizationId sont requis.' });
  }

  try {
    // 1. Essayer d'obtenir un client authentifié (ce qui gère le refresh token)
    const authClient = await googleOAuthService.getAuthenticatedClientForOrganization(organizationId);

    if (authClient) {
      // L'utilisateur est déjà connecté et le token est valide (ou a été rafraîchi)
      console.log('[AutoGoogleAuth] ✅ Connexion Google déjà active pour organisation:', organizationId);
      return res.json({ isConnected: true, message: 'Connexion Google déjà active.' });
    }

    // 2. Si aucun client n'est retourné, cela signifie qu'il n'y a pas de tokens valides.
    // Il faut donc initier le processus d'autorisation manuelle.
    console.log('[AutoGoogleAuth] 🔐 Connexion Google non active, génération de l\'URL d\'autorisation...');
    
    // Récupérer l'email de l'admin pour l'organisation
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { googleWorkspaceConfig: true }
    });

    if (!org?.googleWorkspaceConfig?.adminEmail) {
      return res.status(404).json({ error: 'Configuration Google Workspace introuvable pour cette organisation.' });
    }

    // Générer l'URL d'autorisation
    const authUrl = googleOAuthService.getAuthUrl(userId, organizationId);

    return res.json({
      isConnected: false,
      needsManualAuth: true,
      authUrl: authUrl,
      adminEmail: org.googleWorkspaceConfig.adminEmail,
      message: 'Autorisation manuelle requise.'
    });

  } catch (error) {
    console.error('[AutoGoogleAuth] Erreur lors de la connexion automatique:', error);
    res.status(500).json({ error: 'Erreur interne du serveur lors de la connexion Google.' });
  }
});

// POST /api/auto-google-auth/trigger-logout
router.post('/trigger-logout', async (req, res) => {
  console.log('[ROUTE] /api/auto-google-auth/trigger-logout atteint');
  const { userId } = req.body;
  console.log('[GOOGLE-LOGOUT] Déconnexion Google pour utilisateur:', userId);
  
  if (!userId) {
    return res.status(400).json({ error: 'userId requis.' });
  }

  try {
    await googleOAuthService.disconnectUser(userId);
    res.status(200).json({ message: 'Déconnexion Google traitée avec succès.' });
  } catch (error) {
    console.error('[AutoGoogleAuth] Erreur lors de la déconnexion Google:', error);
    res.status(500).json({ error: 'Erreur lors de la déconnexion Google.' });
  }
});

export default router;
