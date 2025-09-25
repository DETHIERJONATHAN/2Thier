import { Router, Response, Request, RequestHandler } from "express";
import { PrismaClient, Prisma, UserOrganizationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authMiddleware } from "../middlewares/auth";
import { impersonationMiddleware } from "../middlewares/impersonation"; // Importer le middleware
import type { AuthenticatedRequest } from "../middlewares/auth";
import { JWT_SECRET } from "../config";

const router = Router();
const prisma = new PrismaClient();

const userWithOrgsArgs = {
    include: {
        UserOrganization: {
            include: {
                Organization: true,
                Role: {
                    include: {
                        Permission: true, // CORRECTION: 'permissions' devient 'Permission'
                    },
                },
            },
        },
    },
};

type UserWithOrgs = Prisma.UserGetPayload<typeof userWithOrgsArgs>;

// POST /api/register - Inscription d'un nouvel utilisateur
router.post("/register", async (req: Request, res: Response) => {
  const { email, password, firstName, lastName } = req.body;

  if (!email || !password || !firstName) {
    return res.status(400).json({ error: "Email, mot de passe et prénom sont requis" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        status: 'active',
        role: 'user',
      },
    });
    res.status(201).json({ success: true, id: user.id, email: user.email });
  } catch (error) {
    console.error("[API][register] Erreur lors de l'inscription:", error);
    
    // Gestion spécifique de l'erreur de contrainte d'unicité
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: "Cette adresse email est déjà utilisée." });
    }
    
    res.status(500).json({ error: "Erreur lors de la création de l'utilisateur" });
  }
});

// POST /api/login - Connexion d'un utilisateur
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "L'email et le mot de passe sont requis" });
  }

  try {
    const user: UserWithOrgs | null = await prisma.user.findUnique({
        where: { email },
        ...userWithOrgsArgs
    });

    if (!user) {
      return res.status(401).json({ error: "Identifiants invalides" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Identifiants invalides" });
    }

    // Re-fetch user with relations to ensure data is fresh, especially after status changes.
    const freshUser: UserWithOrgs | null = await prisma.user.findUnique({
        where: { id: user.id },
        ...userWithOrgsArgs
    });

    if (!freshUser) {
        // This should not happen if the user was just found
        return res.status(404).json({ error: "Utilisateur non trouvé après la vérification." });
    }

    const isSuperAdmin = freshUser.role === 'super_admin';
    const mainOrg = freshUser.UserOrganization && freshUser.UserOrganization.length > 0 
        ? freshUser.UserOrganization.find(uo => uo.Organization && uo.Role && uo.status === UserOrganizationStatus.ACTIVE) || freshUser.UserOrganization.find(uo => uo.Organization && uo.Role)
        : null;

    // Un utilisateur standard DOIT POUVOIR se connecter même sans organisation pour en créer une ou accepter une invitation.
    // La logique de ce qu'il peut faire une fois connecté est gérée par le frontend et les autres routes API.
    if (!isSuperAdmin && !mainOrg) {
        console.log(`[API][login] Utilisateur ${user.id} se connecte sans organisation principale. C'est un utilisateur "flottant".`);
    }

    // Déterminer le rôle pour le token
    let tokenRole;
    if (isSuperAdmin) {
      tokenRole = 'super_admin';
    } else if (mainOrg && mainOrg.Role) {
      // Cas standard : l'utilisateur a un rôle dans une organisation
      tokenRole = mainOrg.Role.name;
    } else {
      // Cas d'un nouvel utilisateur sans organisation : on lui donne un rôle de base.
      tokenRole = 'user'; // Rôle par défaut pour les utilisateurs "flottants"
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        role: tokenRole, 
        // L'organizationId peut être null pour un super_admin sans orga principale
        organizationId: mainOrg ? mainOrg.organizationId : null,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, UserOrganization, ...userInfos } = freshUser;

    const organizations = UserOrganization
        .filter(uo => uo.Organization && uo.Role) // Filtrer les relations invalides
        .map((uo) => ({
            ...uo.Organization,
            role: uo.Role.name,
            roleLabel: uo.Role.label,
            userOrganizationId: uo.id, // Ajout de l'ID de la relation
            status: uo.status, // Ajout du statut de la relation
        }));

    // ✅ DÉFINIR LE COOKIE HTTPONLY SÉCURISÉ
    console.log('🍪 [LOGIN] Définition du cookie d\'authentification...');
    res.cookie('token', token, {
        httpOnly: true,        // Empêche l'accès via JavaScript côté client (sécurité)
        secure: false,         // true en production avec HTTPS, false en développement
        sameSite: 'lax',       // Protection CSRF tout en permettant les redirections
        maxAge: 24 * 60 * 60 * 1000, // 24 heures en millisecondes
        path: '/'              // Cookie disponible sur tout le site
    });
    
    console.log('✅ [LOGIN] Cookie défini avec succès');

    res.json({
        token,
        user: userInfos,
        organizations,
    });
  } catch (error) {
    console.error("[API][login] Erreur lors de la connexion:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Erreur interne du serveur." });
    }
  }
});

// GET /api/me - Récupère les informations de l'utilisateur connecté
router.get(
  "/me",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('[/me] === DEBUG /me ROUTE ===');
        console.log('[/me] req.user:', req.user);
        console.log('[/me] req.cookies:', req.cookies);
        console.log('[/me] req.headers.authorization:', req.headers.authorization);
        
        // CORRECTION : Vérifier si req.user existe avant de l'utiliser.
        // S'il n'existe pas, cela signifie que le client n'est pas authentifié.
        if (!req.user || !req.user.userId) {
          console.log('[/me] Échec: req.user ou req.user.userId manquant');
          return res.status(401).json({ error: "Utilisateur non authentifié" });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.userId }, // On peut maintenant y accéder en toute sécurité
            ...userWithOrgsArgs,
        });
        if (!user) {
          return res.status(404).json({ error: "Utilisateur non trouvé" });
        }

        const isSuperAdmin = user.role === 'super_admin';
        const mainOrg = user.UserOrganization && user.UserOrganization.length > 0 
            ? user.UserOrganization.find(uo => uo.Organization && uo.Role && uo.status === UserOrganizationStatus.ACTIVE) || user.UserOrganization.find(uo => uo.Organization && uo.Role)
            : null;

        // Un utilisateur standard doit appartenir à au moins une organisation valide pour se connecter.
        if (!isSuperAdmin && !mainOrg) {
            return res.status(403).json({ error: "Vous n'êtes associé à aucune organisation valide ou votre rôle n'est pas correctement configuré." });
        }

        // Déterminer le rôle pour le token
        let tokenRole;
        if (isSuperAdmin) {
          tokenRole = 'super_admin';
        } else {
          // mainOrg et mainOrg.Role sont garantis d'exister pour un utilisateur non-super-admin à ce stade.
          if (!mainOrg || !mainOrg.Role) {
            return res.status(403).json({ error: "Impossible de déterminer un rôle valide pour la connexion." });
          }
          tokenRole = mainOrg.Role.name;
        }

        const token = jwt.sign(
          { 
            userId: user.id, 
            role: tokenRole, 
            // L'organizationId peut être null pour un super_admin sans orga principale
            organizationId: mainOrg ? mainOrg.organizationId : null,
          },
          JWT_SECRET,
          { expiresIn: "24h" }
        );

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, UserOrganization, ...userInfos } = user;

        const organizations = UserOrganization
            .filter(uo => uo.Organization && uo.Role) // Filtrer les relations invalides
            .map((uo) => ({
                ...uo.Organization,
                role: uo.Role.name,
                roleLabel: uo.Role.label,
                userOrganizationId: uo.id, // Ajout de l'ID de la relation
                status: uo.status, // Ajout du statut de la relation
            }));

        res.json({ currentUser: { ...userInfos, organizations }, isImpersonating: !!req.originalUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur lors de la récupération de l'utilisateur." });
    }
  }
);

// POST /api/logout - Déconnexion avec nettoyage des cookies
router.post("/logout", (_req: Request, res: Response) => {
    console.log('🚪 [LOGOUT] Demande de déconnexion reçue');
    
    // Nettoyer le cookie principal avec la même configuration que lors de la création
    res.clearCookie('token', {
        httpOnly: true,
        secure: false,  // Même valeur qu'à la création
        sameSite: 'lax',
        path: '/'
    });
    
    // Nettoyer aussi d'autres variantes possibles (au cas où)
    const cookieOptions = [
        { path: '/' },
        { path: '/', httpOnly: true },
        { path: '/', secure: false },
        { path: '/', sameSite: 'lax' as const }
    ];
    
    cookieOptions.forEach(options => {
        res.clearCookie('token', options);
    });
    
    // Headers pour forcer le nettoyage côté client
    res.header('Clear-Site-Data', '"cookies"');
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    console.log('✅ [LOGOUT] Cookie nettoyé avec succès');
    res.json({ 
        success: true, 
        message: 'Déconnexion réussie',
        clearCache: true
    });
});

// NOUVELLE ROUTE
// GET /api/me/organizations - Récupère les organisations pour l'utilisateur actuel (ou toutes pour un super_admin)
router.get(
  "/me/organizations",
  authMiddleware,
  impersonationMiddleware as RequestHandler,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const isSuperAdmin = req.user?.role === 'super_admin';
      const isImpersonating = !!req.impersonatedUser;
      const effectiveUserId = req.impersonatedUser?.id || req.user?.userId;

      if (!effectiveUserId) {
        return res.status(401).json({ error: "Utilisateur non authentifié." });
      }

      let organizations = [];

      // Si c'est un super_admin et qu'il n'usurpe personne, il voit toutes les organisations.
      if (isSuperAdmin && !isImpersonating) {
        const allOrgs = await prisma.organization.findMany({
          orderBy: { name: 'asc' },
        });
        // On formate pour correspondre à la structure attendue par le front-end
        organizations = allOrgs.map(org => ({
          ...org,
          role: 'super_admin',
          roleLabel: 'Super Administrateur',
          userOrganizationId: null,
          status: 'ACTIVE', // Le statut de la relation n'existe pas ici
        }));
      } else {
        // Sinon, on récupère les organisations de l'utilisateur (ou de l'utilisateur usurpé).
        const userWithOrgs = await prisma.user.findUnique({
          where: { id: effectiveUserId },
          ...userWithOrgsArgs,
        });

        if (userWithOrgs && userWithOrgs.UserOrganization) {
          organizations = userWithOrgs.UserOrganization
            .filter(uo => uo.Organization && uo.Role)
            .map(uo => ({
              ...uo.Organization,
              role: uo.Role.name,
              roleLabel: uo.Role.label,
              userOrganizationId: uo.id,
              status: uo.status,
            }));
        }
      }

      res.json({ success: true, data: organizations });

    } catch (error) {
      console.error("[API][me/organizations] Erreur:", error);
      res.status(500).json({ success: false, message: "Erreur interne du serveur." });
    }
  }
);


// GET /api/me/role - Récupérer le rôle de l'utilisateur dans une organisation spécifique
router.get(
  "/me/role",
  authMiddleware,
  impersonationMiddleware as RequestHandler, // << AJOUT DU MIDDLEWARE
  async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.query.organizationId as string;
    // Si on usurpe, on utilise l'ID de l'utilisateur usurpé, sinon l'ID de l'utilisateur authentifié
    const userId = req.impersonatedUser?.id || req.user?.userId;

    console.log('[API][me/role] userId:', userId, 'organizationId:', organizationId, 'impersonatedUser:', req.impersonatedUser, 'headers:', req.headers);

    if (!userId) {
      res.status(401).json({ error: "Utilisateur non authentifié" });
      return;
    }

    if (!organizationId) {
      res.status(400).json({ error: "L'ID de l'organisation est requis" });
      return;
    }

    try {
      // Si le vrai utilisateur est un super_admin et qu'il usurpé, on donne le rôle de l'usurpé
      if (req.user?.role === 'super_admin' && req.impersonatedUser) {
        const userOrg = await prisma.userOrganization.findFirst({
          where: { userId: req.impersonatedUser.id, organizationId },
          include: { Role: true, Organization: true },
        });
        if (userOrg && userOrg.Role && userOrg.Organization) {
          res.json({
            role: userOrg.Role.name,
            roleLabel: userOrg.Role.label,
            orgStatus: userOrg.Organization.status,
            organizationName: userOrg.Organization.name,
          });
          return;
        } else {
          // Si l'utilisateur usurpé n'a pas de rôle dans cette orga, on renvoie null
          res.status(404).json({ error: "L'utilisateur usurpé n'a pas de rôle dans cette organisation." });
          return;
        }
      } else if (req.user?.role === 'super_admin' && !req.impersonatedUser) {
        // Un super_admin non-usurpateur a toujours le rôle super_admin
        res.json({ role: 'super_admin', roleLabel: 'Super administrateur', orgStatus: null });
        return;
      }

      // Pour un utilisateur standard
      const userOrg = await prisma.userOrganization.findFirst({
        where: { userId, organizationId },
        include: { Role: true, Organization: true },
      });

      if (userOrg && userOrg.Role && userOrg.Organization) {
        res.json({
          role: userOrg.Role.name,
          roleLabel: userOrg.Role.label,
          orgStatus: userOrg.Organization.status,
          organizationName: userOrg.Organization.name,
        });
      } else {
        res.status(404).json({ error: "Rôle non trouvé pour l'utilisateur dans cette organisation" });
      }
    } catch (error) {
      console.error("[API][me/role] Erreur:", error);
      res.status(500).json({ error: "Erreur interne du serveur" });
    }
  }
);

// POST /api/logout - Déconnexion de l'utilisateur
router.post("/logout", (_req, res) => {
  // Ici, vous pouvez gérer la déconnexion, comme la suppression du token côté client.
  // Cela dépend de la manière dont vous gérez l'authentification côté client.
  res.json({ message: "Déconnexion réussie" });
});

export default router;
