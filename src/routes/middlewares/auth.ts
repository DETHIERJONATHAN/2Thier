import type { Request as ExpressRequest, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { JWT_SECRET } from '../../config';

const prisma = new PrismaClient();

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
    console.log('🔵 [AUTH] === DÉBUT DU MIDDLEWARE D\'AUTH ===');
    console.log('🔵 [AUTH] URL demandée:', req.url);
    console.log('🔵 [AUTH] Méthode:', req.method);
    console.log('🔵 [AUTH] Headers reçus:', JSON.stringify(req.headers, null, 2));
    console.log('🔵 [AUTH] Cookies reçus:', req.cookies);
    console.log('🔵 [AUTH] req.cookies.token existe?', !!req.cookies?.token);
    console.log('🔵 [AUTH] Contenu du token cookie:', req.cookies?.token);
    
    // Extraire le token depuis l'en-tête d'autorisation ou du cookie
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.token;
    
    console.log('🔍 [AUTH] authHeader:', authHeader);
    console.log('🔍 [AUTH] cookieToken (complet):', cookieToken);
    console.log('🔍 [AUTH] Type du cookieToken:', typeof cookieToken);
    console.log('🔍 [AUTH] Longueur du cookieToken:', cookieToken?.length);
    
    // Récupérer l'ID d'organisation depuis l'en-tête si disponible
    const orgIdFromHeader = req.headers['x-organization-id'] as string;
    console.log('🔍 [AUTH] x-organization-id de l\'en-tête:', orgIdFromHeader);
    
    // Déterminer le token à utiliser (en-tête ou cookie)
    let token: string | undefined;

    console.log('🚀 [AUTH] Début de la détermination du token...');
    
    // Essayer d'abord le cookie (plus fiable)
    if (cookieToken) {
        token = cookieToken;
        console.log('✅ [AUTH] Token trouvé dans les cookies');
        console.log('🔍 [AUTH] Token cookie (premiers 20 chars):', cookieToken.substring(0, 20) + '...');
    } 
    // Ensuite l'en-tête Authorization si pas de cookie ou si cookie non valide
    else if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
        console.log('✅ [AUTH] Token trouvé dans l\'en-tête Authorization');
        console.log('🔍 [AUTH] Token header (premiers 20 chars):', token.substring(0, 20) + '...');
    }
    else {
        console.log('❌ [AUTH] Aucune source de token trouvée');
        console.log('❌ [AUTH] cookieToken présent?', !!cookieToken);
        console.log('❌ [AUTH] authHeader présent?', !!authHeader);
        console.log('❌ [AUTH] authHeader commence par Bearer?', authHeader?.startsWith('Bearer '));
    }
    
    // Si aucun token n'est trouvé
    if (!token) {
        console.log('🚨 [AUTH] ERREUR: Aucun token d\'authentification trouvé');
        console.log('🚨 [AUTH] Returning 401 - Authentification requise');
        return res.status(401).json({ error: 'Authentification requise' });
    }
    
    console.log('🔑 [AUTH] Token final sélectionné (premiers 20 chars):', token.substring(0, 20) + '...');
    
    // Si le token est un token de développement (à partir du frontend)
    if (token.startsWith('dev-token-')) {
        console.log('🚨 [AUTH] Token de développement détecté, non autorisé en production');
        return res.status(401).json({ error: 'Token de développement non autorisé' });
    }
    
    console.log('🧪 [AUTH] Début de la vérification JWT...');
    console.log('🧪 [AUTH] JWT_SECRET existe?', !!JWT_SECRET);
    console.log('🧪 [AUTH] JWT_SECRET (premiers 10 chars):', JWT_SECRET.substring(0, 10) + '...');
    
    try {
        console.log('⚡ [AUTH] Vérification du token avec jwt.verify...');
        
        // Vérifier et décoder le token
        const decoded = jwt.verify(token, JWT_SECRET) as {
            userId: string;
            roles?: string[];
            role?: string;
            organizationId?: string;
        };
        
        console.log('✅ [AUTH] Token JWT décodé avec succès!');
        console.log('✅ [AUTH] UserId extrait du token:', decoded.userId);
        console.log('✅ [AUTH] Roles extraits du token:', decoded.roles);
        console.log('✅ [AUTH] OrganizationId extrait du token:', decoded.organizationId);
        console.log('✅ [AUTH] Données décodées:', {
            userId: decoded.userId,
            role: decoded.role,
            roles: decoded.roles,
            organizationId: decoded.organizationId
        });
        
        console.log('🔍 [AUTH] Recherche de l\'utilisateur dans la base de données...');
        console.log('🔍 [AUTH] Recherche pour userId:', decoded.userId);
        
        // Récupérer l'utilisateur depuis la base de données
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });
        
        console.log('🔍 [AUTH] Résultat de la recherche utilisateur:', !!user);
        
        if (!user) {
            console.log('🚨 [AUTH] ERREUR: Utilisateur non trouvé pour l\'ID:', decoded.userId);
            console.log('🧹 [AUTH] Token invalide détecté - nettoyage automatique...');
            
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
            
            console.log('🚨 [AUTH] Returning 401 - Token invalide');
            return res.status(401).json({ 
                error: 'Authentification invalide',
                message: 'Token invalide - veuillez vous reconnecter'
                // ⚠️ SUPPRIMÉ: clearCache et forceReload pour éviter déconnexions intempestives
            });
        }
        
        console.log('✅ [AUTH] Utilisateur trouvé dans la base de données!');
        console.log('✅ [AUTH] User ID:', user.id);
        console.log('✅ [AUTH] User email:', user.email);
        console.log('✅ [AUTH] User role:', user.role);
        
        let organizationId = decoded.organizationId || null;
        
        // Si on a un ID d'organisation dans l'en-tête, on l'utilise à la place
        if (orgIdFromHeader) {
            console.log('[AUTH] Utilisation de l\'ID d\'organisation de l\'en-tête:', orgIdFromHeader);
            organizationId = orgIdFromHeader;
            
            // Vérifier si cette organisation existe
            const organization = await prisma.organization.findUnique({
                where: { id: organizationId }
            });
            
            if (organization) {
                console.log('[AUTH] Organisation trouvée:', organization.name);
            } else {
                console.log('[AUTH] AVERTISSEMENT: Organisation non trouvée pour l\'ID:', organizationId);
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
        
        console.log('[AUTH] Utilisateur authentifié avec:', { 
            userId: req.user.userId, 
            role: req.user.role, 
            firstname: req.user.firstname,
            lastname: req.user.lastname,
            email: req.user.email,
            organizationId: req.user.organizationId 
        });
        
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

    // Log pour vérifier l'utilisateur trouvé
    console.log('[Login] Utilisateur trouvé:', { id: user.id, email: user.email, role: user.role });

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
