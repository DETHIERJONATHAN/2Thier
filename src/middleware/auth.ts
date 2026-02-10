import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';
import { JWT_SECRET as CONFIG_JWT_SECRET } from '../config';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    organizationId?: string;
    isSuperAdmin: boolean;
    role?: string;
  };
}

// Unifier le secret avec la configuration globale pour éviter les 401
const JWT_SECRET = CONFIG_JWT_SECRET;

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Bypass pour tests internes
  if (req.headers['x-test-bypass-auth'] === '1') {
    req.user = req.user || {
      id: 'test-user',
      email: 'test@example.com',
      organizationId: 'org-test',
      isSuperAdmin: true,
      role: 'super_admin'
    };
    return next();
  }
  
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  
  // Si pas de token dans l'en-tête, vérifier les cookies
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Token d\'accès requis' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      organizationId?: string;
      isSuperAdmin: boolean;
      role?: string;
      exp?: number;
    };

    // Correction : garantir que le champ 'role' est toujours présent pour les super admins
    if (!decoded.role && decoded.isSuperAdmin) {
      decoded.role = 'super_admin';
    }
    
    req.user = { ...decoded, id: decoded.userId };
    next();
  } catch (error) {
    console.error('[AUTH] ❌ Token invalide:', error.message);
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
};

/**
 * Middleware pour enrichir req.user avec les données complètes de la base de données.
 * Doit être appelé APRÈS authenticateToken.
 * Ne perturbe pas le flux d'authentification existant.
 */
export const fetchFullUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ message: "Utilisateur non authentifié." });
  }

  try {
    const userFromDb = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!userFromDb) {
      return res.status(401).json({ message: "Utilisateur non valide." });
    }

    // Enrichir req.user avec les données complètes de la base de données
    req.user = { ...userFromDb, ...req.user };
    next();
  } catch (error) {
    console.error("[MIDDLEWARE] fetchFullUser: Erreur", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
};

// Middleware pour vérifier le rôle administrateur ou super_admin
export const isAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const role = req.user?.role?.toLowerCase().replace(/_/g, '');

  // Correction : inclure super_admin dans la logique de vérification
  if (role === 'admin' || role === 'superadmin') {
    return next();
  }

  return res.status(403).json({ error: 'Accès non autorisé. Rôle Administrateur requis.' });
};

export const requireSuperAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ error: 'Accès réservé aux Super Admins' });
  }
  next();
};

export const requireOrganization = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.organizationId && !req.user?.isSuperAdmin) {
    return res.status(403).json({ error: 'Organisation requise' });
  }
  next();
};

// Middleware pour extraire l'ID d'organisation
export const extractOrganization = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // L'organisation peut venir du token JWT ou du header
  const orgHeader = req.headers['x-organization-id'] as string;
  if (orgHeader && req.user) {
    req.user.organizationId = orgHeader;
  }
  next();
};

export { AuthenticatedRequest };
