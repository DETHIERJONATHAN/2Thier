import { Router } from 'express';
import { googleOAuthService } from '../google-auth/core/GoogleOAuthCore.js';
import { prisma } from '../lib/prisma';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();

// 🧠 Cache simple en mémoire pour éviter les rafales et rendre l'endpoint idempotent sur une courte période
type CachedConnectResult = { expiresAt: number; payload: Record<string, unknown> };
const connectCache = new Map<string, CachedConnectResult>();

// GET /api/auto-google-auth/status
// Retourne le statut de connexion Google pour l'utilisateur/organisation
router.get('/status', authMiddleware, async (req: AuthenticatedRequest, res) => {
  
  const { userId, organizationId } = req.query as { userId?: string; organizationId?: string };
  
  if (!userId || !organizationId) {
    return res.json({
      success: true,
      data: {
        connected: false,
        email: null,
        scopes: [],
        lastSync: null,
        error: !organizationId ? 'Organization ID requis' : 'User ID requis'
      }
    });
  }

  try {
    // Vérifier si des tokens existent pour cette organisation
    const tokens = await prisma.googleToken.findUnique({
      where: { organizationId }
    });

    if (!tokens || !tokens.accessToken) {
      return res.json({
        success: true,
        data: {
          connected: false,
          email: null,
          scopes: tokens?.scope?.split(' ') || [],
          lastSync: null
        }
      });
    }

    // Récupérer la config Google Workspace pour l'email admin
    const gwConfig = await prisma.googleWorkspaceConfig.findUnique({
      where: { organizationId }
    });

    return res.json({
      success: true,
      data: {
        connected: true,
        email: gwConfig?.adminEmail || null,
        scopes: tokens.scope?.split(' ') || [],
        lastSync: tokens.updatedAt || null,
        expiresAt: tokens.expiresAt
      }
    });

  } catch (error) {
    console.error('[AutoGoogleAuth] Erreur status:', error);
    return res.json({
      success: true,
      data: {
        connected: false,
        email: null,
        scopes: [],
        lastSync: null,
        error: 'Erreur serveur'
      }
    });
  }
});

// POST /api/auto-google-auth/connect
// Tente de connecter l'utilisateur à Google Workspace en arrière-plan.
// Si les tokens existent et sont valides (ou peuvent être rafraîchis), c'est transparent.
// Sinon, renvoie une URL d'autorisation pour que le frontend puisse rediriger l'utilisateur.
router.post('/connect', authMiddleware, async (req: AuthenticatedRequest, res) => {
  
  const { userId, organizationId } = req.body;
  const caller = req.user;

  if (!userId || !organizationId) {
    return res.status(400).json({ success: false, error: 'userId et organizationId sont requis.' });
  }

  // 🔒 Validation d'autorisation: l'appelant doit être lui-même OU super_admin
  if (!caller) {
    return res.status(401).json({ success: false, error: 'Authentification requise.' });
  }
  const isSuperAdmin = caller.role === 'super_admin' || caller.isSuperAdmin === true;
  if (!isSuperAdmin && caller.userId !== userId) {
    return res.status(403).json({ success: false, error: "Accès interdit: utilisateur non autorisé." });
  }

  // 🔒 Vérifier l'appartenance à l'organisation (sauf super_admin)
  if (!isSuperAdmin) {
    const membership = await prisma.userOrganization.findFirst({ where: { userId: caller.userId, organizationId } });
    if (!membership) {
      return res.status(403).json({ success: false, error: "Accès interdit: organisation non autorisée." });
    }
  }

  try {
    // Idempotence courte: renvoyer le dernier résultat récent si disponible (évite le spam + les courses)
    const key = `${userId}:${organizationId || 'none'}`;
    const now = Date.now();
    const cached = connectCache.get(key);
    if (cached && cached.expiresAt > now) {
      res.setHeader('X-AutoGoogle-Cache-Until', new Date(cached.expiresAt).toISOString());
      return res.json({ ...cached.payload, cached: true });
    }

    // 1. Essayer d'obtenir un client authentifié (ce qui gère le refresh token)
    const authClient = await googleOAuthService.getAuthenticatedClientForOrganization(organizationId);

    if (authClient) {
      // L'utilisateur est déjà connecté et le token est valide (ou a été rafraîchi)
      const ttlConnected = 15_000;
      const payload = { success: true, isConnected: true, needsManualAuth: false, message: 'Connexion Google déjà active.', cacheTtlMs: ttlConnected };
      connectCache.set(key, { expiresAt: now + ttlConnected, payload });
      res.setHeader('X-AutoGoogle-Cache-Until', new Date(now + ttlConnected).toISOString());
      return res.json(payload);
    }

    // 2. Si aucun client n'est retourné, cela signifie qu'il n'y a pas de tokens valides.
    // Il faut donc initier le processus d'autorisation manuelle.
    console.log('[AutoGoogleAuth] 🔐 Connexion Google non active, génération de l\'URL d\'autorisation...');
    
    // Récupérer l'email de l'admin pour l'organisation
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { GoogleWorkspaceConfig: true }
    });

    if (!org?.GoogleWorkspaceConfig?.adminEmail) {
      return res.status(404).json({ success: false, error: 'Configuration Google Workspace introuvable pour cette organisation.' });
    }

    // Générer l'URL d'autorisation
    const authUrl = googleOAuthService.getAuthUrl(userId, organizationId);

    const ttlManual = 60_000;
    const payload = {
      success: true,
      isConnected: false,
      needsManualAuth: true,
      authUrl: authUrl,
      adminEmail: org.GoogleWorkspaceConfig.adminEmail,
      message: 'Autorisation manuelle requise.',
      cacheTtlMs: ttlManual
    } as const;
    connectCache.set(key, { expiresAt: now + ttlManual, payload: payload as unknown as Record<string, unknown> });
    res.setHeader('X-AutoGoogle-Cache-Until', new Date(now + ttlManual).toISOString());
    // Indication côté client pour un backoff recommandé
    res.setHeader('Retry-After', Math.ceil(ttlManual / 1000).toString());
    return res.json(payload);

  } catch (error) {
    console.error('[AutoGoogleAuth] Erreur lors de la connexion automatique:', error);
    res.status(500).json({ success: false, error: 'Erreur interne du serveur lors de la connexion Google.' });
  }
});

// POST /api/auto-google-auth/trigger-logout
router.post('/trigger-logout', authMiddleware, async (req: AuthenticatedRequest, res) => {
  
  const { userId } = req.body;
  console.log('[GOOGLE-LOGOUT] Reçu logout CRM pour utilisateur:', userId);

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId requis.' });
  }

  // Politique voulue: NE JAMAIS déconnecter Google automatiquement.
  // On ne révoque pas les tokens, on ne supprime rien. On retourne juste un succès "no-op".
  try {
    // Ancien comportement (désactivé): await googleOAuthService.disconnectUser(userId);
    console.log('[GOOGLE-LOGOUT] Politique NO-OP: aucune action sur les tokens Google');
    return res.status(200).json({ success: true, message: 'Aucune déconnexion Google effectuée (politique persistante).' });
  } catch (error) {
    console.error('[AutoGoogleAuth] Erreur inattendue trigger-logout (no-op):', error);
    return res.status(200).json({ success: true, message: 'Aucune déconnexion Google effectuée (no-op avec erreur interne ignorée).' });
  }
});

export default router;
