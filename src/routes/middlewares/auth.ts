import type { Request as ExpressRequest, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../../lib/database';
import bcrypt from 'bcryptjs';
import { JWT_SECRET } from '../../config';

const prisma = db;

// Étendre le type Request pour inclure user et le fichier de multer
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
    else {
        
        
        
        
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
            
            
            
            // Nettoyer automatiquement le cookie invalide avec TOUTES les variantes possibles
            const cookieOptions = [
                { path: '/' },
                { path: '/', domain: 'localhost' },
                { path: '/', domain: '.localhost' },
                { path: '/', httpOnly: true },
                { path: '/', secure: false },
                { path: '/', sameSite: 'lax' as const },
                { path: '/', sameSite: 'none' as const },
                { path: '/', sameSite: 'strict' as const },
                { path: '/', maxAge: 0 },
                { path: '/', expires: new Date(0) }
            ];
            
            cookieOptions.forEach(options => {
                res.clearCookie('token', options);
            });
            
            // Headers supplémentaires pour forcer le nettoyage
            res.header('Clear-Site-Data', '"cookies", "storage", "cache"');
            res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.header('Pragma', 'no-cache');
            res.header('Expires', '0');
            
            
            return res.status(401).json({ 
                error: 'Authentification invalide',
                message: 'Token invalide - veuillez vous reconnecter'
                // ⚠️ SUPPRIMÉ: clearCache et forceReload pour éviter déconnexions intempestives
            });
        }
        
        
        
        
        
        
        let organizationId = decoded.organizationId || null;
        
        // Si on a un ID d'organisation dans l'en-tête, on l'utilise à la place
        if (orgIdFromHeader) {
            
            organizationId = orgIdFromHeader;
            
            // Vérifier si cette organisation existe
            const organization = await prisma.organization.findUnique({
                where: { id: organizationId }
            });
            
            if (organization) {
                
            } else {
                
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
        const anyErr = error as { code?: string; message?: string };
        const code = anyErr?.code;
        const message = anyErr?.message || '';

        // ⚠️ IMPORTANT: si la DB/Prisma est indisponible (ex: P1001), ne pas répondre 401.
        // Une 401 déclenche un logout côté frontend, alors qu'il s'agit d'une panne transitoire.
        const isDbUnavailable =
          code === 'P1001' ||
          code === 'P1000' ||
          code === 'P1017' ||
          /P1001|P1000|P1017|ECONNREFUSED|Connection refused|Can't reach database server/i.test(message);

        if (isDbUnavailable) {
          console.error('[AUTH] DB indisponible pendant authMiddleware:', error);
          return res.status(503).json({
            error: 'Service indisponible',
            message: 'Base de données indisponible. Réessayez dans quelques secondes.'
          });
        }

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

    // Log pour vérifier l'utilisateur trouvé

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
  const { passwordHash: _passwordHash, ...userWithoutPassword } = user;

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

// ...autres parties du fichier inchangées...
