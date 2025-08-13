import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';

const router = Router();

// Appliquer l'authentification
router.use(authMiddleware);

/**
 * 🎭 ROUTES RÔLES ET PERMISSIONS
 * Système de rôles hiérarchique délégué depuis api-server.ts
 */

// GET /api/roles - Récupérer tous les rôles
router.get('/', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const defaultRoles = [
      { 
        id: 'super_admin', 
        name: 'Super Administrateur', 
        description: 'Accès complet au système', 
        permissions: ['super_admin'], 
        level: 100 
      },
      { 
        id: 'admin', 
        name: 'Administrateur', 
        description: 'Administration de l\'organisation', 
        permissions: ['admin_panel:view', 'user:read', 'user:write'], 
        level: 80 
      },
      { 
        id: 'manager', 
        name: 'Manager', 
        description: 'Gestion équipe et projets', 
        permissions: ['user:read', 'project:read', 'project:write'], 
        level: 60 
      },
      { 
        id: 'user', 
        name: 'Utilisateur', 
        description: 'Accès utilisateur standard', 
        permissions: ['user:read'], 
        level: 40 
      }
    ];

    res.json({ success: true, data: defaultRoles });
  } catch (error) {
    console.error('Erreur récupération roles:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// GET /api/roles/:id - Récupérer un rôle spécifique
router.get('/:id', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    const roleMap: Record<string, {
      id: string;
      name: string;
      description: string;
      permissions: string[];
      level: number;
    }> = {
      'super_admin': { 
        id: 'super_admin', 
        name: 'Super Administrateur', 
        description: 'Accès complet au système', 
        permissions: ['super_admin'], 
        level: 100 
      },
      'admin': { 
        id: 'admin', 
        name: 'Administrateur', 
        description: 'Administration de l\'organisation', 
        permissions: ['admin_panel:view', 'user:read', 'user:write'], 
        level: 80 
      },
      'manager': { 
        id: 'manager', 
        name: 'Manager', 
        description: 'Gestion équipe et projets', 
        permissions: ['user:read', 'project:read', 'project:write'], 
        level: 60 
      },
      'user': { 
        id: 'user', 
        name: 'Utilisateur', 
        description: 'Accès utilisateur standard', 
        permissions: ['user:read'], 
        level: 40 
      }
    };

    const role = roleMap[id];
    if (!role) {
      return res.status(404).json({ success: false, message: 'Rôle non trouvé' });
    }

    res.json({ success: true, data: role });
  } catch (error) {
    console.error('Erreur récupération role:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * 🔐 ROUTES PERMISSIONS (intégrées aux rôles)
 */

// GET /api/roles/permissions - Récupérer les permissions par rôle
router.get('/permissions', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { roleId } = req.query;
    
    const permissionsByRole: Record<string, Array<{
      id: string;
      name: string;
      description: string;
      category: string;
    }>> = {
      'super_admin': [
        { id: '1', name: 'super_admin', description: 'Accès complet au système', category: 'system' },
        { id: '2', name: 'admin_panel:view', description: 'Voir le panneau admin', category: 'admin' },
        { id: '3', name: 'user:read', description: 'Lire les utilisateurs', category: 'user' },
        { id: '4', name: 'user:write', description: 'Modifier les utilisateurs', category: 'user' },
        { id: '5', name: 'organization:read', description: 'Lire les organisations', category: 'organization' },
        { id: '6', name: 'organization:write', description: 'Modifier les organisations', category: 'organization' },
        { id: '7', name: 'module:read', description: 'Lire les modules', category: 'module' },
        { id: '8', name: 'module:write', description: 'Modifier les modules', category: 'module' }
      ],
      'admin': [
        { id: '2', name: 'admin_panel:view', description: 'Voir le panneau admin', category: 'admin' },
        { id: '3', name: 'user:read', description: 'Lire les utilisateurs', category: 'user' },
        { id: '4', name: 'user:write', description: 'Modifier les utilisateurs', category: 'user' },
        { id: '7', name: 'module:read', description: 'Lire les modules', category: 'module' }
      ],
      'manager': [
        { id: '3', name: 'user:read', description: 'Lire les utilisateurs', category: 'user' },
        { id: '7', name: 'module:read', description: 'Lire les modules', category: 'module' }
      ],
      'user': [
        { id: '3', name: 'user:read', description: 'Lire les utilisateurs', category: 'user' }
      ]
    };

    const permissions = permissionsByRole[roleId as string] || permissionsByRole['user'];
    res.json({ success: true, data: permissions });
  } catch (error) {
    console.error('Erreur récupération permissions:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// PUT /api/roles/permissions/:roleId - Mettre à jour les permissions d'un rôle
router.put('/permissions/:roleId', requireRole(['super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { roleId } = req.params;
    const { permissions } = req.body;
    
    res.json({ 
      success: true, 
      message: `Permissions mises à jour pour le rôle ${roleId}`,
      data: { roleId, permissions }
    });
  } catch (error) {
    console.error(`❌ [PUT /api/roles/permissions/${req.params.roleId}] Erreur:`, error);
    res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour des permissions' });
  }
});

export default router;
