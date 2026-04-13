import { Router, Response } from "express";
import { authMiddleware, AuthenticatedRequest } from "../middlewares/auth";
import { impersonationMiddleware } from "../middlewares/impersonation";
import { db } from '../lib/database';
import path from 'path';
import fs from 'fs';
import { uploadExpressFile, deleteFile } from '../lib/storage';
import { logger } from '../lib/logger';

const prisma = db;
const router = Router();

const buildAvatarUrl = (_req: AuthenticatedRequest, avatarPath?: string | null) => {
  if (!avatarPath) {
    return '';
  }

  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    return avatarPath;
  }

  // Return relative path — the frontend proxy handles routing to the API server
  return avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`;
};

const sanitizeText = (value: unknown): string | null | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

// Helper: upload file to GCS via storage module
const saveUploadedFileToStorage = async (file: unknown, folder: string, filename: string): Promise<string> => {
  const ext = path.extname(file.name);
  const finalName = `${filename}_${Date.now()}${ext}`;
  const key = `${folder}/${finalName}`;
  const url = await uploadExpressFile(file, key);
  return url;
};

// Le middleware d'authentification est appliqué à toutes les routes de ce routeur
router.use(authMiddleware, impersonationMiddleware as unknown);

// GET /api/profile - Récupérer le profil de l'utilisateur
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<unknown> => {
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
      language: user.language || "fr",
      role: user.role || "user",
  avatarUrl: buildAvatarUrl(req, user.avatarUrl),
  coverUrl: buildAvatarUrl(req, (user as any).coverUrl),
  coverPositionY: (user as any).coverPositionY ?? 50,
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
    logger.error("Error fetching user profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/profile/avatar - Upload a new avatar
router.post('/avatar', async (req: AuthenticatedRequest, res: Response): Promise<unknown> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: "User ID not found in token" });
    }

    const files = (req as any).files;
    if (!files || !files.avatar) {
      return res.status(400).json({ error: "Aucun fichier n'a été téléversé." });
    }

    const file = files.avatar;

    // #7 MIME type validation
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Type de fichier non autorisé. Formats acceptés : JPEG, PNG, GIF, WebP' });
    }

    const avatarUrl = await saveUploadedFileToStorage(file, 'avatars', userId);

    // Save to UserPhoto collection
    try {
      await prisma.userPhoto.create({
        data: { userId, url: avatarUrl, category: 'profile' },
      });
    } catch { /* ignore if model not ready */ }

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

    res.json({
      ...updatedUser,
      avatarUrl: buildAvatarUrl(req, updatedUser.avatarUrl)
    });
  } catch (error) {
    logger.error("Erreur lors du téléversement de l'avatar:", error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST /api/profile/cover - Upload a new cover photo
router.post('/cover', async (req: AuthenticatedRequest, res: Response): Promise<unknown> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: "User ID not found in token" });
    }

    const files = (req as any).files;
    if (!files || !files.cover) {
      return res.status(400).json({ error: "Aucun fichier n'a été téléversé." });
    }

    const file = files.cover;

    // #7 MIME type validation
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Type de fichier non autorisé. Formats acceptés : JPEG, PNG, GIF, WebP' });
    }

    const coverUrl = await saveUploadedFileToStorage(file, 'covers', userId);

    // Save to UserPhoto collection
    try {
      await prisma.userPhoto.create({
        data: { userId, url: coverUrl, category: 'cover' },
      });
    } catch { /* ignore if model not ready */ }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { coverUrl, coverPositionY: 50 },
      select: { id: true, coverUrl: true },
    });

    res.json({ coverUrl: buildAvatarUrl(req, updatedUser.coverUrl) });
  } catch (error) {
    logger.error("Erreur lors du téléversement de la couverture:", error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// PUT /api/profile/cover-position - Save cover photo vertical position
router.put('/cover-position', async (req: AuthenticatedRequest, res: Response): Promise<unknown> => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(400).json({ error: "User ID not found" });

    const posY = Number(req.body?.positionY);
    if (isNaN(posY) || posY < 0 || posY > 100) {
      return res.status(400).json({ error: "positionY must be between 0 and 100" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { coverPositionY: posY },
    });

    res.json({ positionY: posY });
  } catch (error) {
    logger.error("Erreur cover-position:", error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /api/profile/permissions - Get current user's permissions
router.get('/permissions', (async (req: unknown, res: Response) => {
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
        logger.error("Failed to fetch permissions:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
}) as unknown);

// PUT /api/profile - Update current user's profile
router.put('/', (async (req: unknown, res: Response) => {
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
      phoneNumber,
      avatarUrl,
      language
    } = req.body;

    let normalizedAvatarUrl: string | null | undefined = undefined;
    if (typeof avatarUrl === 'string') {
      const trimmed = avatarUrl.trim();
      if (trimmed.length === 0) {
        normalizedAvatarUrl = null;
      } else {
        normalizedAvatarUrl = trimmed;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: sanitizeText(firstName),
        lastName: sanitizeText(lastName),
        address: sanitizeText(address),
        vatNumber: sanitizeText(vatNumber),
        phoneNumber: sanitizeText(phoneNumber),
        language: typeof language === 'string' && ['fr', 'en', 'nl'].includes(language) ? language : undefined,
        avatarUrl: normalizedAvatarUrl,
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

    res.json({
      ...updatedUser,
      avatarUrl: buildAvatarUrl(req, updatedUser.avatarUrl)
    });

  } catch (error) {
    logger.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}) as unknown);

// GET /api/profile/user/:userId - View another user's public profile
router.get('/user/:userId', async (req: AuthenticatedRequest, res: Response): Promise<unknown> => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'userId requis' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        UserOrganization: {
          where: { status: 'ACTIVE' },
          include: {
            Organization: true,
            Role: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const activeOrg = user.UserOrganization?.find(uo => uo.status === 'ACTIVE');
    return res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: activeOrg?.Role?.name || user.role || 'user',
      avatarUrl: buildAvatarUrl(req, user.avatarUrl),
      coverUrl: buildAvatarUrl(req, (user as any).coverUrl),
      coverPositionY: (user as any).coverPositionY ?? 50,
      organization: activeOrg ? {
        id: activeOrg.Organization.id,
        name: activeOrg.Organization.name
      } : null
    });
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/profile/photos - Fetch user photos grouped by category
router.get('/photos', async (req: AuthenticatedRequest, res: Response): Promise<unknown> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }

    const photos = await prisma.userPhoto.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Group by category
    const grouped: Record<string, typeof photos> = {};
    for (const p of photos) {
      const cat = p.category || 'other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    }

    return res.json({ photos, grouped });
  } catch (error) {
    logger.error("Error fetching user photos:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/profile/media - Fetch all user media (photos + videos) from WallPosts
router.get('/media', async (req: AuthenticatedRequest, res: Response): Promise<unknown> => {
  try {
    const userId = req.user?.userId;
    const targetUserId = (req.query.userId as string) || userId;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }

    const mediaType = req.query.type as string | undefined; // 'image', 'video', or undefined for all
    const category = req.query.category as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

    // Fetch WallPosts with media from this user
    const where: unknown = {
      authorId: targetUserId,
      isPublished: true,
      NOT: { mediaUrls: { equals: null } },
    };

    if (mediaType) {
      where.mediaType = mediaType;
    }
    if (category) {
      where.category = category;
    }

    // If viewing another user, only show visible posts
    if (targetUserId !== userId) {
      where.visibility = { in: ['ALL', 'IN'] };
    }

    const posts = await prisma.wallPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit * 2,
      select: {
        id: true,
        mediaUrls: true,
        mediaType: true,
        content: true,
        category: true,
        likesCount: true,
        commentsCount: true,
        createdAt: true,
      },
    });

    // Flatten: each media URL becomes one item
    const media = posts
      .filter(p => {
        const urls = Array.isArray(p.mediaUrls) ? p.mediaUrls as string[] : [];
        return urls.length > 0 && urls[0];
      })
      .flatMap(p => {
        const urls = p.mediaUrls as string[];
        return urls.map((url: string, idx: number) => ({
          id: `${p.id}-${idx}`,
          postId: p.id,
          url,
          mediaType: p.mediaType || 'image',
          category: p.category || null,
          caption: p.content || '',
          likesCount: p.likesCount,
          commentsCount: p.commentsCount,
          createdAt: p.createdAt,
        }));
      })
      .slice(0, limit);

    return res.json({ media });
  } catch (error) {
    logger.error("Error fetching user media:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/profile/photos/:id - Delete a user photo
router.delete('/photos/:id', async (req: AuthenticatedRequest, res: Response): Promise<unknown> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }

    const photo = await prisma.userPhoto.findUnique({ where: { id: req.params.id } });
    if (!photo || photo.userId !== userId) {
      return res.status(404).json({ error: "Photo non trouvée" });
    }

    // Delete file from disk
    const filePath = path.join('public', photo.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.userPhoto.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (error) {
    logger.error("Error deleting photo:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
