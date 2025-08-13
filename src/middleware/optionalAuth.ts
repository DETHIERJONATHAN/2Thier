import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key';

export interface OptionalAuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    isAuthenticated: boolean;
    organizations: any[];
    roles: any[];
    permissions: any[];
  };
}

/**
 * Middleware d'authentification optionnelle
 * Ajoute les informations utilisateur si un token valide est présent,
 * mais permet à la requête de continuer même sans authentification
 */
export const optionalAuthMiddleware = async (
  req: OptionalAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      // Pas de token : utilisateur non authentifié mais requête autorisée
      req.user = {
        userId: '',
        email: '',
        firstName: '',
        lastName: '',
        isAuthenticated: false,
        organizations: [],
        roles: [],
        permissions: []
      };
      return next();
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          UserOrganization: {
            include: {
              Organization: true,
              Role: {
                include: {
                  Permission: true
                }
              }
            }
          },
          roles: {
            include: {
              Permission: true
            }
          }
        },
      });

      if (!user) {
        // Token invalide : utilisateur non authentifié
        req.user = {
          userId: '',
          email: '',
          firstName: '',
          lastName: '',
          isAuthenticated: false,
          organizations: [],
          roles: [],
          permissions: []
        };
        return next();
      }

      // Utilisateur authentifié : ajouter les informations
      const organizations = user.UserOrganization.map(uo => ({
        id: uo.Organization.id,
        name: uo.Organization.name,
        status: uo.status,
        role: uo.Role.name,
        roleLabel: uo.Role.label,
        permissions: uo.Role.Permission || []
      }));

      req.user = {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAuthenticated: true,
        organizations,
        roles: user.roles,
        permissions: user.roles.flatMap(role => role.Permission)
      };

      next();
    } catch (jwtError) {
      // Token invalide : utilisateur non authentifié mais requête autorisée
      req.user = {
        userId: '',
        email: '',
        firstName: '',
        lastName: '',
        isAuthenticated: false,
        organizations: [],
        roles: [],
        permissions: []
      };
      next();
    }
  } catch (error) {
    console.error('[optionalAuthMiddleware] Erreur:', error);
    req.user = {
      userId: '',
      email: '',
      firstName: '',
      lastName: '',
      isAuthenticated: false,
      organizations: [],
      roles: [],
      permissions: []
    };
    next();
  }
};

/**
 * Middleware qui nécessite une authentification
 * Retourne 401 si l'utilisateur n'est pas authentifié
 */
export const requireAuthMiddleware = (
  req: OptionalAuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.isAuthenticated) {
    return res.status(401).json({ 
      message: 'Authentification requise',
      isAuthenticated: false 
    });
  }
  next();
};
