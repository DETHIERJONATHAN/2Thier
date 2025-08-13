import { Router, Response } from "express";
import { authMiddleware, AuthenticatedRequest } from "../middlewares/auth";
import { impersonationMiddleware } from "../middlewares/impersonation";
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();
const router = Router();

// Configuration de Multer pour le stockage des avatars
const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
        const dir = 'public/uploads/avatars';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user?.userId;
        cb(null, userId + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Le middleware d'authentification est appliqué à toutes les routes de ce routeur
router.use(authMiddleware, impersonationMiddleware as any);

// GET /api/profile - Récupérer le profil de l'utilisateur
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        UserOrganization: {
          include: {
            Organization: true,
            Role: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    // Formatter la réponse pour correspondre au format attendu par le frontend
    const formattedUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName || "",  // Utiliser firstName (camelCase) pour correspondre au frontend
      lastName: user.lastName || "",    // Utiliser lastName (camelCase) pour correspondre au frontend
      address: user.address || "",      // Ajouter l'adresse
      vatNumber: user.vatNumber || "",  // Ajouter le numéro TVA
      phoneNumber: user.phoneNumber || "", // Ajouter le numéro de téléphone
      role: user.role || "user",
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      organizationId: req.user?.organizationId || null,
      permissions: [], // À remplir si nécessaire
      organization: user.UserOrganization?.length > 0 ? {
        id: user.UserOrganization[0].Organization.id,
        name: user.UserOrganization[0].Organization.name
      } : null
    };

    return res.json(formattedUser);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/profile/avatar - Upload a new avatar
router.post('/avatar', upload.single('avatar'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(400).json({ error: "User ID not found in token" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "Aucun fichier n'a été téléversé." });
      return;
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
       select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        address: true,
        vatNumber: true,
        phoneNumber: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        UserOrganization: {
          select: {
            Organization: {
              select: {
                id: true,
                name: true,
                status: true,
              }
            },
            Role: {
              select: {
                id: true,
                name: true,
                label: true,
                description: true,
              }
            },
            id: true
          }
        }
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error("Erreur lors du téléversement de l'avatar:", error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /api/profile/permissions - Get current user's permissions
router.get('/permissions', (async (req: any, res: Response) => {
    try {
        const userId = req.user?.userId;
        const organizationId = req.user?.organizationId;

        if (!userId) {
            return res.status(400).json({ error: "User ID not found in token" });
        }

        const user = await prisma.user.findUnique({ 
            where: { id: userId },
            select: { role: true } // On vérifie le rôle global de l'utilisateur
        });

        // Le super admin (rôle global) a toutes les permissions
        if (user?.role === 'super_admin') {
            return res.json({ permissions: ['manage:all'] });
        }

        if (!organizationId) {
            // Les utilisateurs non-super-admin doivent avoir un contexte d'organisation
            return res.json({ permissions: [] });
        }

        const userOrgLink = await prisma.userOrganization.findUnique({
            where: {
                userId_organizationId: {
                    userId: userId,
                    organizationId: organizationId
                }
            },
            include: {
                Role: {
                    include: {
                        Permission: {
                            where: { allowed: true } // On ne récupère que les permissions actives
                        }
                    }
                }
            }
        });

        if (!userOrgLink || !userOrgLink.Role) {
            // User is not in the organization or has no role assigned
            return res.json({ permissions: [] });
        }

        const permissions = userOrgLink.Role.Permission.map(p => `${p.action}:${p.resource}`);
        
        res.json({ permissions });

    } catch (error) {
        console.error("Failed to fetch permissions:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
}) as any);

// PUT /api/profile - Update current user's profile
router.put('/', (async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: "User ID not found in token" });
    }

    const {
      firstName,
      lastName,
      address,
      vatNumber,
      phoneNumber
    } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        address,
        vatNumber,
        phoneNumber,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        address: true,
        vatNumber: true,
        phoneNumber: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        UserOrganization: {
          select: {
            Organization: {
              select: {
                id: true,
                name: true,
                status: true,
              }
            },
            Role: {
              select: {
                id: true,
                name: true,
                label: true,
                description: true,
              }
            },
            id: true
          }
        }
      }
    });

    res.json(updatedUser);

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}) as any);

export default router;
