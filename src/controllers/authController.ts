import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';

// Helper pour lire JWT_SECRET dynamiquement (amélioration pour la production)
// En local: utilise la valeur par défaut ou .env
// En production Cloud Run: lit depuis /run/secrets/JWT_SECRET
const getJWTSecret = (): string => {
  // ✅ PRIORITÉ 1: Lire depuis process.env (variable d'environnement)
  let secret = process.env.JWT_SECRET;
  if (secret && secret.trim()) {
    console.log('[AUTH] ✅ JWT_SECRET trouvé dans process.env');
    return secret;
  }

  // ✅ PRIORITÉ 2: Lire depuis le fichier Cloud Run secret
  const cloudRunSecretPath = '/run/secrets/JWT_SECRET';
  if (fs.existsSync(cloudRunSecretPath)) {
    try {
      secret = fs.readFileSync(cloudRunSecretPath, 'utf-8').trim();
      if (secret) {
        console.log('[AUTH] ✅ JWT_SECRET trouvé dans /run/secrets/JWT_SECRET');
        return secret;
      }
    } catch (err) {
      console.error('[AUTH] ❌ Erreur à la lecture de /run/secrets/JWT_SECRET:', err);
    }
  }

  // ❌ FALLBACK: Clé de développement (ne jamais atteindre en production !)
  console.warn('[AUTH] ⚠️ JWT_SECRET non disponible, utilisation de la clé de développement');
  return 'development-secret-key';
};

export const login = async (req: Request, res: Response) => {
  try {
    // DEBUG: Afficher le body complet reçu
    console.log(`[AUTH] 📦 Body reçu:`, JSON.stringify(req.body));
    console.log(`[AUTH] 📦 Content-Type:`, req.headers['content-type']);
    
    const { email, password } = req.body;

    console.log(`[AUTH] 🔐 Tentative de connexion pour: ${email}`);
    console.log(`[AUTH] 🔐 Password reçu: "${password}" (length: ${password?.length || 0}, type: ${typeof password})`);

    if (!email || !password) {
      console.log(`[AUTH] ❌ Email ou password manquant`);
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
      console.log(`[AUTH] ❌ Utilisateur non trouvé ou pas de passwordHash pour: ${email}`);
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    console.log(`[AUTH] 👤 Utilisateur trouvé: ${user.firstName} ${user.lastName}`);
    
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    console.log(`[AUTH] 🔑 Comparaison mot de passe: ${isPasswordValid ? '✅ VALIDE' : '❌ INVALIDE'}`);
    
    if (!isPasswordValid) {
      console.log(`[AUTH] ❌ Mot de passe incorrect pour: ${email}`);
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    const { passwordHash: _passwordHash, ...userWithoutPassword } = user;

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

    // Récupérer l'organizationId de la première organisation active (ou première organisation si super admin)
    const primaryOrganization = user.UserOrganization.find(uo => uo.status === 'active') || user.UserOrganization[0];
    const organizationId = primaryOrganization?.organizationId;

    // Créer le token JWT avec TOUTES les informations nécessaires
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        organizationId: organizationId,
        isSuperAdmin: isSuperAdmin,
        role: isSuperAdmin ? 'super_admin' : (userRoles[0]?.name || user.role || 'user')
      },
      getJWTSecret(),
      { expiresIn: '24h' }
    );

    // Définir le cookie
    // Codespaces: le frontend est servi en HTTPS, le navigateur a besoin de Secure
    // Le cookie est défini via le proxy Vite qui est sur le même domaine HTTPS
    const isProduction = process.env.NODE_ENV === 'production';
    const isCodespaces = process.env.CODESPACES === 'true';
    const needsSecureCookie = isProduction || isCodespaces;
    
    console.log(`[AUTH] 🍪 Cookie config: isProduction=${isProduction}, isCodespaces=${isCodespaces}, needsSecure=${needsSecureCookie}`);
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: needsSecureCookie,
      sameSite: needsSecureCookie ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 heures
      path: '/',
    });

    console.log(`[AUTH] ✅ Connexion réussie pour ${email} (cookie secure=${needsSecureCookie}, sameSite=${needsSecureCookie ? 'none' : 'lax'})`);
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

    const decoded = jwt.verify(token, getJWTSecret()) as { userId: string };

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
    const { passwordHash: _passwordHash2, ...userWithoutPassword } = user;

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
