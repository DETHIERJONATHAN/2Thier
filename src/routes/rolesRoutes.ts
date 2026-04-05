import { Router, Response } from 'express';
import { db } from '../lib/database';
import { authMiddleware } from '../middlewares/auth.js';
import type { AuthenticatedRequest } from '../middlewares/auth.js';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

const router = Router();
const prisma = db;

// 🧹 SANITISATION SIMPLE ET EFFICACE
const sanitizeString = (input: string): string => {
  return input.trim().replace(/[<>]/g, ''); // Supprime < et >
};

// 🔒 VALIDATION ZOD ULTRA-STRICTE
const roleCreateSchema = z.object({
  name: z.string()
    .min(2, 'Nom du rôle minimum 2 caractères')
    .max(50, 'Nom du rôle maximum 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ0-9_\-\s]+$/, 'Nom du rôle contient des caractères non autorisés'),
  label: z.string()
    .max(100, 'Label maximum 100 caractères')
    .optional(),
  description: z.string()
    .max(500, 'Description maximum 500 caractères')
    .optional(),
  organizationId: z.string()
    .min(1, 'ID organisation invalide')
    .nullish()
});

const roleUpdateSchema = z.object({
  name: z.string()
    .min(2, 'Nom du rôle minimum 2 caractères')
    .max(50, 'Nom du rôle maximum 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ0-9_\-\s]+$/, 'Nom du rôle contient des caractères non autorisés')
    .optional(),
  label: z.string()
    .max(100, 'Label maximum 100 caractères')
    .optional(),
  description: z.string()
    .max(500, 'Description maximum 500 caractères')
    .optional(),
  organizationId: z.string()
    .min(1, 'ID organisation invalide')
    .nullish()
});

const roleQuerySchema = z.object({
  // Accepter 'current' OU n'importe quelle chaîne non vide (IDs personnalisés autorisés)
  organizationId: z.string()
    .min(1, 'ID organisation invalide')
    .optional()
});

// 🛡️ RATE LIMITING ADAPTÉ
const rolesRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes max (lecture fréquente)
  message: { 
    success: false, 
    message: 'Trop de requêtes sur les rôles, réessayez plus tard' 
  },
  standardHeaders: true,
  legacyHeaders: false
});

const rolesCreateRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  max: 10, // 10 créations max
  message: { 
    success: false, 
    message: 'Trop de créations de rôles, réessayez plus tard' 
  }
});

// 🔧 GESTION ERREURS ZOD CENTRALISÉE
const handleZodError = (error: z.ZodError) => {
  return {
    success: false,
    message: 'Données invalides',
    errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
  };
};

// Appliquer l'authentification et rate limiting
router.use(authMiddleware);
router.use(rolesRateLimit);

// 🏷️ GET /api/roles - SÉCURISÉ AVEC ZOD + SANITISATION
router.get('/', async (req: AuthenticatedRequest, res) => {
  
  try {
    // 🔍 VALIDATION ZOD QUERY PARAMS
    const queryValidation = roleQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      res.status(400).json(handleZodError(queryValidation.error));
      return;
    }

    const { organizationId } = queryValidation.data;
    const requestingUser = req.user;
    
    
    // ✅ LOGIQUE UNIFIÉE ET CORRIGÉE
    let finalOrganizationId: string | undefined | null = organizationId;
    if (organizationId === 'current') {
      finalOrganizationId = requestingUser?.organizationId;
    }

  const whereClause: Record<string, unknown> = {};

    // Si un ID d'organisation est spécifié (et résolu), on retourne:
    // 1. Les rôles spécifiques à cette organisation
    // 2. Les rôles globaux (organizationId: null)
    if (finalOrganizationId) {
      whereClause.OR = [
        { organizationId: finalOrganizationId },
        { organizationId: null } // Rôles globaux
      ];
    }
    
    // Si l'utilisateur n'est PAS super_admin, on force le filtrage sur son organisation
    // pour des raisons de sécurité, écrasant tout autre filtre.
    if (requestingUser?.role !== 'super_admin') {
      whereClause.OR = [
        { organizationId: requestingUser?.organizationId },
        { organizationId: null } // Rôles globaux toujours disponibles
      ];
    }

    // Si aucun filtre d'organisation n'est spécifié et que c'est un super_admin,
    // retourner tous les rôles (globaux et spécifiques)
    if (!finalOrganizationId && requestingUser?.role === 'super_admin') {
      // Pas de filtre - retourner tous les rôles
    }


    const roles = await prisma.role.findMany({
      where: whereClause,
      include: {
        Permission: true,
        Organization: true
      },
      orderBy: { name: 'asc' }
    });
      
    res.status(200).json({ success: true, data: roles });
    return;
    
  } catch (error: unknown) {
    console.error('[ROLES] Erreur lors de la récupération des rôles:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur interne lors de la récupération des rôles' 
    });
  }
});

// 🏷️ GET /api/roles/:id - RÉCUPÉRER UN RÔLE SÉCURISÉ
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    // 🔒 VALIDATION ZOD PARAMS
    if (!id || typeof id !== 'string' || id.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'ID du rôle invalide'
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        message: "Utilisateur non authentifié" 
      });
      return;
    }

    const requestingUser = req.user;
    const sanitizedId = sanitizeString(id.trim());

    // 🔍 RÉCUPÉRATION SÉCURISÉE DU RÔLE
    const role = await prisma.role.findUnique({
      where: { id: sanitizedId },
      include: {
        Permission: true,
        UserOrganization: {
          include: {
            Organization: true,
            User: {
              select: { id: true, firstName: true, lastName: true, email: true }
            }
          }
        },
        Organization: true
      }
    });

    if (!role) {
      res.status(404).json({ 
        success: false, 
        message: "Rôle non trouvé" 
      });
      return;
    }

    // 🔐 VÉRIFICATION PERMISSIONS RENFORCÉE
    if (requestingUser.role !== 'super_admin') {
      if (!requestingUser.organizationId || role.organizationId !== requestingUser.organizationId) {
        res.status(403).json({ 
          success: false, 
          message: "Accès refusé: vous ne pouvez voir que les rôles de votre organisation" 
        });
        return;
      }
    }

    res.json({ 
      success: true, 
      data: role 
    });

  } catch (error) {
    console.error('[ROLES] Error fetching role:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur interne du serveur' 
    });
  }
});

// POST /api/roles - Créer un nouveau rôle
// 🏷️ POST /api/roles - CRÉER UN RÔLE SÉCURISÉ
router.post('/', rolesCreateRateLimit, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  
  try {
    // 🔒 VALIDATION ZOD ULTRA-STRICTE
    const bodyValidation = roleCreateSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      res.status(400).json(handleZodError(bodyValidation.error));
      return;
    }

    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        message: "Utilisateur non authentifié" 
      });
      return;
    }

    const requestingUser = req.user;
    const { name, label, description, organizationId } = bodyValidation.data;

    // 🧹 SANITISATION DES ENTRÉES
    const sanitizedName = sanitizeString(name);
    const sanitizedLabel = label ? sanitizeString(label) : sanitizedName;
    const sanitizedDescription = description ? sanitizeString(description) : '';


    // 🔐 VÉRIFICATION PERMISSIONS RENFORCÉE
    if (requestingUser.role !== 'super_admin') {
      const targetOrgId = organizationId || requestingUser.organizationId;
      
      if (!requestingUser.organizationId || requestingUser.organizationId !== targetOrgId) {
        res.status(403).json({ 
          success: false, 
          message: "Accès refusé: vous ne pouvez créer des rôles que pour votre organisation" 
        });
        return;
      }
    }

    // 🔍 VÉRIFIER UNICITÉ DU NOM DANS L'ORGANISATION
    const finalOrgId = organizationId || requestingUser.organizationId;
    const existingRole = await prisma.role.findFirst({
      where: {
        name: sanitizedName,
        organizationId: finalOrgId
      }
    });

    if (existingRole) {
      res.status(409).json({
        success: false,
        message: `Un rôle avec le nom "${sanitizedName}" existe déjà dans cette organisation`
      });
      return;
    }

    // 🚫 Interdire la création d'un rôle réservé "super_admin"
    if (sanitizedName === 'super_admin') {
      res.status(400).json({
        success: false,
        message: 'Le nom de rôle "super_admin" est réservé et ne peut pas être créé.'
      });
      return;
    }

    const newRole = await prisma.role.create({
      data: {
        id: `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: sanitizedName,
        label: sanitizedLabel,
        description: sanitizedDescription,
        organizationId: finalOrgId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        UserOrganization: {
          include: {
            Organization: true,
            User: true
          }
        },
        Organization: true
      }
    });

    res.status(201).json({ 
      success: true, 
      data: newRole,
      message: `Rôle "${sanitizedName}" créé avec succès`
    });

  } catch (error) {
    console.error('[ROLES] Error creating role:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

// PUT/PATCH /api/roles/:id - Mettre à jour un rôle
// 🏷️ PUT|PATCH /api/roles/:id - MODIFIER UN RÔLE SÉCURISÉ  
const handleUpdateRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    // 🔒 VALIDATION ZOD PARAMS + BODY
    if (!id || typeof id !== 'string' || id.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'ID du rôle invalide'
      });
      return;
    }

    const bodyValidation = roleUpdateSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      res.status(400).json(handleZodError(bodyValidation.error));
      return;
    }

    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        message: "Utilisateur non authentifié" 
      });
      return;
    }

    const requestingUser = req.user;
    const { name, label, description, organizationId } = bodyValidation.data;

    // 🧹 SANITISATION DES ENTRÉES
    const sanitizedName = name ? sanitizeString(name) : undefined;
    const sanitizedLabel = label ? sanitizeString(label) : undefined;
    const sanitizedDescription = description ? sanitizeString(description) : undefined;

    // 🔍 VÉRIFIER EXISTENCE DU RÔLE
    const existingRole = await prisma.role.findUnique({
      where: { id: id.trim() }
    });

    if (!existingRole) {
      res.status(404).json({ 
        success: false, 
        message: "Rôle non trouvé" 
      });
      return;
    }

    // 🔐 VÉRIFICATION PERMISSIONS RENFORCÉE
    if (requestingUser.role !== 'super_admin') {
      if (!requestingUser.organizationId || existingRole.organizationId !== requestingUser.organizationId) {
        res.status(403).json({ 
          success: false, 
          message: "Accès refusé: vous ne pouvez modifier que les rôles de votre organisation" 
        });
        return;
      }
    }

    // � Interdire toute modification du rôle réservé "super_admin" (cohérent avec l'UI)
    if (existingRole.name === 'super_admin') {
      res.status(403).json({
        success: false,
        message: 'Le rôle "super_admin" est protégé et ne peut pas être modifié.'
      });
      return;
    }

    // �🔍 VÉRIFIER UNICITÉ DU NOUVEAU NOM (SI CHANGÉ)
    if (sanitizedName && sanitizedName !== existingRole.name) {
      // Utiliser le nouvel organizationId si fourni, sinon l'ancien
      const targetOrgId = organizationId !== undefined ? organizationId : existingRole.organizationId;
      const duplicateRole = await prisma.role.findFirst({
        where: {
          name: sanitizedName,
          organizationId: targetOrgId,
          id: { not: id.trim() }
        }
      });

      if (duplicateRole) {
        res.status(409).json({
          success: false,
          message: `Un rôle avec le nom "${sanitizedName}" existe déjà dans cette organisation`
        });
        return;
      }
    }

    // 📝 CONSTRUIRE LES DONNÉES À METTRE À JOUR
    const updateData: {
      updatedAt: Date;
      name?: string;
      label?: string;
      description?: string;
      organizationId?: string | null;
    } = {
      updatedAt: new Date()
    };

    if (sanitizedName !== undefined) {
      updateData.name = sanitizedName;
      updateData.label = sanitizedLabel || sanitizedName; // Utiliser label envoyé ou synchroniser avec name
    } else if (sanitizedLabel !== undefined) {
      updateData.label = sanitizedLabel;
    }

    if (sanitizedDescription !== undefined) {
      updateData.description = sanitizedDescription;
    }

    // 🌐 MISE À JOUR DE LA PORTÉE (organizationId)
    // organizationId est explicitement dans le body → on le prend en compte
    // null = rôle global, string = rôle lié à une organisation
    if (organizationId !== undefined) {
      // Seul un super_admin peut rendre un rôle global (organizationId = null)
      if (organizationId === null && requestingUser.role !== 'super_admin') {
        res.status(403).json({
          success: false,
          message: 'Seul un Super Admin peut rendre un rôle global'
        });
        return;
      }
      updateData.organizationId = organizationId;
    }

    const updatedRole = await prisma.role.update({
      where: { id: id.trim() },
      data: updateData,
      include: {
        UserOrganization: {
          include: {
            Organization: true,
            User: true
          }
        },
        Organization: true
      }
    });

    res.status(200).json({ 
      success: true, 
      data: updatedRole,
      message: 'Rôle modifié avec succès'
    });

  } catch (error) {
    console.error('[ROLES] Erreur lors de la modification du rôle:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur interne lors de la modification du rôle' 
    });
  }
};
router.put('/:id', handleUpdateRole);
router.patch('/:id', handleUpdateRole);

// DELETE /api/roles/:id - Supprimer un rôle
// 🏷️ DELETE /api/roles/:id - SUPPRIMER UN RÔLE SÉCURISÉ
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    // 🔒 VALIDATION PARAMS
    if (!id || typeof id !== 'string' || id.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'ID du rôle invalide'
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        message: "Utilisateur non authentifié" 
      });
      return;
    }

    const requestingUser = req.user;
    const roleId = id.trim();

    // 🔍 VÉRIFIER EXISTENCE DU RÔLE
    const existingRole = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        UserOrganization: true // Pour vérifier s'il y a des utilisateurs assignés
      }
    });

    if (!existingRole) {
      res.status(404).json({ 
        success: false, 
        message: "Rôle non trouvé" 
      });
      return;
    }

    // 🔐 VÉRIFICATION PERMISSIONS RENFORCÉE
    if (requestingUser.role !== 'super_admin') {
      if (!requestingUser.organizationId || existingRole.organizationId !== requestingUser.organizationId) {
        res.status(403).json({ 
          success: false, 
          message: "Accès refusé: vous ne pouvez supprimer que les rôles de votre organisation" 
        });
        return;
      }
    }

    // 🚫 Interdire la suppression du rôle réservé "super_admin" (sécurité système)
    if (existingRole.name === 'super_admin') {
      res.status(400).json({
        success: false,
        message: 'Le rôle "super_admin" est protégé et ne peut pas être supprimé.'
      });
      return;
    }

    // ⚠️ VÉRIFIER QU'AUCUN UTILISATEUR N'EST ASSIGNÉ
    if (existingRole.UserOrganization && existingRole.UserOrganization.length > 0) {
      res.status(409).json({
        success: false,
        message: `Impossible de supprimer le rôle "${existingRole.name}": ${existingRole.UserOrganization.length} utilisateur(s) y sont encore assigné(s)`
      });
      return;
    }

    // 🗑️ SUPPRESSION SÉCURISÉE
    await prisma.role.delete({
      where: { id: roleId }
    });

    res.status(200).json({ 
      success: true, 
      message: `Rôle "${existingRole.name}" supprimé avec succès` 
    });

  } catch (error) {
    console.error('[ROLES] Erreur lors de la suppression du rôle:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

export default router;
