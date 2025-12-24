import type { Request as ExpressRequest, Response, NextFunction } from 'express';
import type { UploadedFile } from 'express-fileupload';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { JWT_SECRET } from '../config';

const prisma = new PrismaClient();

// Étendre le type Request pour inclure user et les fichiers uploadés
export interface AuthenticatedRequest extends ExpressRequest {
  user?: {
    userId: string;
    role: string;
    organizationId: string | null;
    roles?: string[]; // Ajout pour la compatibilité avec requireSuperAdmin
    firstname?: string; // Ajout pour personnaliser l'utilisateur
    lastname?: string;  // Ajout pour personnaliser l'utilisateur
    email?: string;     // Ajout pour personnaliser l'utilisateur
    isSuperAdmin?: boolean; // 👑 CRUCIAL: Pour que les middlewares reconnaissent le SuperAdmin ! 👑
  };
  originalUser?: { // Pour l'usurpation
    userId: string;
    role: string;
  };
  impersonatedUser?: { // Pour l'usurpation
    id: string;
  };
  file?: Express.Multer.File; // Ajout pour multer
  files?: { [fieldName: string]: UploadedFile | UploadedFile[] }; // 📎 Pour express-fileupload
  impersonatedOrganizationId?: string;
  accessibleOrgIds?: string[];
  // La propriété cookies est ajoutée par le middleware cookie-parser
  cookies: { [key: string]: string };
}

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Extraire le token depuis l'en-tête d'autorisation ou du cookie
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.token;
    
    // Récupérer l'ID d'organisation depuis l'en-tête si disponible
    const orgIdFromHeader = req.headers['x-organization-id'] as string;
    
    // Déterminer le token à utiliser (en-tête ou cookie)
    let token: string | undefined;

    // Essayer d'abord le cookie (plus fiable)
    if (cookieToken) {
        token = cookieToken;
    } 
    // Ensuite l'en-tête Authorization si pas de cookie ou si cookie non valide
    else if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }
    
    // Si aucun token n'est trouvé
    if (!token) {
        return res.status(401).json({ error: 'Authentification requise' });
    }
    
    // Si le token est un token de développement (à partir du frontend)
    if (token.startsWith('dev-token-')) {
        return res.status(401).json({ error: 'Token de développement non autorisé' });
    }
    
    try {
        // Vérifier et décoder le token
        const decoded = jwt.verify(token, JWT_SECRET) as {
            userId: string;
            roles?: string[];
            role?: string;
            organizationId?: string;
        };
        
        // Récupérer l'utilisateur depuis la base de données
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });
        
        if (!user) {
            console.error('[AUTH] Utilisateur non trouvé pour l\'ID:', decoded.userId);
            return res.status(401).json({ error: 'Authentification invalide' });
        }
        
    let organizationId = decoded.organizationId || null;

    // Fallback supplémentaire: query ?organizationId=... (utile pour EventSource qui ne peut pas envoyer d'en-têtes personnalisés)
    const orgIdFromQuery = (req.query?.organizationId as string) || (req.query?.orgId as string);
    if (!organizationId && orgIdFromQuery) {
      organizationId = orgIdFromQuery;
    }

    // Si on a un ID d'organisation dans l'en-tête, il prime
    if (orgIdFromHeader) {
      organizationId = orgIdFromHeader;
    }

    // Validation de l'organisation si définie
    if (organizationId) {
      const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
      if (!organization) {
        console.error('[AUTH] Organisation non trouvée pour l\'ID:', organizationId);
        return res.status(404).json({ error: 'Organisation non trouvée' });
      }
    }
        
        // Configurer l'utilisateur dans la requête
        req.user = {
            userId: user.id,
            role: user.role || 'user',
            organizationId,
            roles: user.role ? [user.role] : [],
            firstname: user.firstName || '',
            lastname: user.lastName || '',
            email: user.email,
            // 👑 SUPER IMPORTANT: Définir isSuperAdmin pour que les middlewares le reconnaissent ! 👑
            isSuperAdmin: user.role === 'super_admin'
        };
        
        return next();
        
    } catch (error) {
        console.error('[AUTH] Erreur de vérification du token:', error);
        return res.status(401).json({ error: 'Token d\'authentification invalide' });
    }
};
export const login = async (req: AuthenticatedRequest, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Assurer que le rôle existe avant de générer le token
    if (!user.role) {
      console.error(`[Login] ERREUR: Le rôle de l'utilisateur ${user.email} est manquant.`);
      return res.status(500).json({ error: 'Erreur de configuration du compte : rôle manquant.' });
    }
    
    // Récupérer l'organisation de l'utilisateur depuis UserOrganization
    const userOrg = await prisma.userOrganization.findFirst({
      where: { userId: user.id },
    });

    const token = jwt.sign(
      { 
        userId: user.id, 
        // Utiliser 'roles' (pluriel) pour être cohérent
        roles: [user.role], 
        organizationId: userOrg?.organizationId 
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // On retire passwordHash avant de renvoyer l'objet utilisateur
    const { passwordHash, ...userWithoutPassword } = user;

    res.json({ token, user: userWithoutPassword });

  } catch (e) {
    console.error('[Login] Erreur lors de la connexion:', e);
    res.status(500).json({ error: 'Erreur interne' });
  }
};

export const requireSuperAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Vérification adaptée pour notre middleware de développement
  if (req.user?.role === 'super_admin' || req.user?.roles?.includes('super_admin')) {
    next();
  } else {
    // Message d'erreur standardisé
    res.status(403).json({ success: false, message: 'Accès non autorisé.' });
  }
};

// Fonction requireRole manquante
export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentification requise.' });
    }

    const userRole = req.user.role;
    const userRoles = req.user.roles || [];

    // Vérifier si l'utilisateur a l'un des rôles requis
    const hasRequiredRole = roles.includes(userRole) || userRoles.some(role => roles.includes(role));

    if (hasRequiredRole) {
      next();
    } else {
      res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    }
  };
};

// ...autres parties du fichier inchangées...
