import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        UserOrganization: {
          include: {
            Organization: true,
            Role: {
              include: {
                Permission: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    const { passwordHash, ...userWithoutPassword } = user;

    // Extraire les rôles et permissions depuis UserOrganization
    const userRoles = user.UserOrganization.map(uo => uo.Role);
    const allPermissions = userRoles.flatMap(role => role.Permission || []);

    // Déterminer si l'utilisateur est super admin
    const isSuperAdmin = user.role === 'super_admin' || userRoles.some(role => role.name === 'super_admin');

    const response = {
      currentUser: {
        ...userWithoutPassword,
        role: isSuperAdmin ? 'super_admin' : (userRoles[0]?.name || user.role || 'user'),
        permissions: allPermissions,
        isSuperAdmin,
        organizations: user.UserOrganization.map(uo => ({
          id: uo.Organization.id,
          name: uo.Organization.name,
          status: uo.status
        }))
      },
      originalUser: null,
    };

    // Créer le token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Définir le cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 heures
    });

    console.log(`[AUTH] Connexion réussie pour ${email}`);
    res.status(200).json(response);
  } catch (error) {
    console.error('[AUTH] Erreur lors de la connexion:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

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
        }
      },
    });

    if (!user) {
      res.clearCookie('token');
      return res.status(401).json({ message: 'Utilisateur introuvable' });
    }

    // Exclure le mot de passe de la réponse
    const { passwordHash, ...userWithoutPassword } = user;

    // Formater les organisations pour le frontend
    const organizations = user.UserOrganization.map(uo => ({
      id: uo.Organization.id,
      name: uo.Organization.name,
      status: uo.status,
      role: uo.Role.name,
      roleLabel: uo.Role.label,
      permissions: uo.Role.Permission || []
    }));

    // Sélectionner l'organisation principale (première active ou première tout court)
    const currentOrganization = organizations.find(org => org.status === 'ACTIVE') || organizations[0] || null;

    // Extraire les rôles et permissions depuis UserOrganization
    const userRoles = user.UserOrganization.map(uo => uo.Role);
    const allPermissions = userRoles.flatMap(role => role.Permission || []);

    // Déterminer si l'utilisateur est super admin
    const isSuperAdmin = user.role === 'super_admin' || userRoles.some(role => role.name === 'super_admin');

    // Formater la réponse selon ce que le frontend attend
    const response = {
      currentUser: {
        ...userWithoutPassword,
        role: isSuperAdmin ? 'super_admin' : (userRoles[0]?.name || user.role || 'user'),
        permissions: allPermissions,
        isSuperAdmin,
        organizations: organizations, // Ajouter les organisations formatées
        currentOrganization: currentOrganization // Ajouter l'organisation actuelle
      },
      originalUser: null // Pour l'usurpation d'identité, null par défaut
    };

    console.log(`[AUTH] Récupération des données utilisateur pour ${user.email}`);
    res.status(200).json(response);
  } catch (error) {
    console.error('[AUTH] Erreur lors de la vérification du token:', error);
    res.clearCookie('token');
    res.status(401).json({ message: 'Token invalide ou expiré' });
  }
};

export const logout = (_req: Request, res: Response) => {
  try {
    res.clearCookie('token');
    console.log('[AUTH] Déconnexion réussie');
    res.status(200).json({ message: 'Déconnexion réussie' });
  } catch (error) {
    console.error('[AUTH] Erreur lors de la déconnexion:', error);
    res.status(500).json({ message: 'Erreur lors de la déconnexion' });
  }
};
