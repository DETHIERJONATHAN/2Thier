import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    organizationId?: string;
    isSuperAdmin: boolean;
    role?: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  console.log('[AUTH] 🔍 authenticateToken - Début');
  console.log('[AUTH] 📋 URL:', req.originalUrl);
  console.log('[AUTH] 📋 Method:', req.method);
  
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  
  console.log('[AUTH] 📋 Auth header présent:', !!authHeader);
  
  // Si pas de token dans l'en-tête, vérifier les cookies
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
    console.log('[AUTH] 🍪 Token trouvé dans les cookies');
  }

  if (!token) {
    console.log('[AUTH] ❌ Aucun token trouvé');
    return res.status(401).json({ error: 'Token d\'accès requis' });
  }

  console.log('[AUTH] 🔑 Token présent, vérification...');

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      organizationId?: string;
      isSuperAdmin: boolean;
      role?: string;
      exp?: number;
    };

    console.log('[AUTH] ✅ Token valide, utilisateur:', decoded.userId);
    console.log('[AUTH] 📋 Email:', decoded.email);
    console.log('[AUTH] 📋 OrganizationId:', decoded.organizationId);
    console.log('[AUTH] 📋 SuperAdmin:', decoded.isSuperAdmin);

    // Correction : garantir que le champ 'role' est toujours présent pour les super admins
    if (!decoded.role && decoded.isSuperAdmin) {
      decoded.role = 'super_admin';
      console.log('[AUTH] 👑 Rôle super_admin assigné automatiquement');
    }
    
    req.user = { ...decoded, id: decoded.userId }; // Assurer la présence de id et userId
    console.log('[AUTH] ✅ req.user assigné:', { id: req.user.id, userId: req.user.userId, email: req.user.email });
    console.log('[AUTH] ✅ authenticateToken terminé avec succès');
    next();
  } catch (error) {
    console.log('[AUTH] ❌ Token invalide ou expiré:', error.message);
    console.log('[AUTH] ❌ Erreur détaillée:', error);
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
};

/**
 * Middleware pour enrichir req.user avec les données complètes de la base de données.
 * Doit être appelé APRÈS authenticateToken.
 * Ne perturbe pas le flux d'authentification existant.
 */
export const fetchFullUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  console.log("<<<<< [MIDDLEWARE] fetchFullUser: Exécution. >>>>>");

  if (!req.user || !req.user.userId) {
    console.log("<<<<< [MIDDLEWARE] fetchFullUser: req.user ou req.user.userId manquant. Le middleware authenticateToken doit être exécuté avant. >>>>>");
    return res.status(401).json({ message: "Utilisateur non authentifié." });
  }

  try {
    const userFromDb = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!userFromDb) {
      console.log(`<<<<< [MIDDLEWARE] fetchFullUser: Utilisateur avec ID ${req.user.userId} non trouvé dans la DB. >>>>>`);
      return res.status(401).json({ message: "Utilisateur non valide." });
    }

    // Enrichir req.user avec les données complètes de la base de données
    req.user = { ...userFromDb, ...req.user };
    
    console.log("<<<<< [MIDDLEWARE] fetchFullUser: req.user enrichi avec succès. >>>>>");
    next();
  } catch (error) {
    console.error("<<<<< [MIDDLEWARE] fetchFullUser: Erreur lors de la récupération de l'utilisateur.", error);
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
