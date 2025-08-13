import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * 🔐 ROUTES D'AUTHENTIFICATION COMPLÈTES
 * Délégation depuis api-server.ts pour architecture propre
 */

// POST /api/auth/login - Connexion utilisateur
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email requis' });
    }
    
    const user = await prisma.user.findFirst({
      where: { email },
      include: {
        UserOrganization: {
          include: { Organization: true }
        }
      }
    });

    if (!user) {
      return res.json({ success: false, message: 'Utilisateur non trouvé' });
    }

    const response = {
      success: true,
      currentUser: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: 'super_admin',
        permissions: ['super_admin'],
        organizations: user.UserOrganization.map(uo => ({
          id: uo.Organization.id,
          name: uo.Organization.name,
          status: 'active',
          role: 'super_admin',
          permissions: ['super_admin']
        })),
        UserOrganization: user.UserOrganization
      },
      token: 'temporary-jwt-token'
    };

    res.json(response);
  } catch (error) {
    console.error('Erreur auth/login:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/auth/me - Informations utilisateur courant
router.get('/me', async (req, res) => {
  try {
    const userEmail = 'jonathan.dethier@dethier.be'; 
    let user = await prisma.user.findFirst({
      where: { email: userEmail },
      include: {
        UserOrganization: {
          include: { Organization: true }
        }
      }
    });

    if (!user) {
      user = await prisma.user.findFirst({
        include: {
          UserOrganization: {
            include: { Organization: true }
          }
        }
      });
    }

    if (!user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    res.json({
      currentUser: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: 'super_admin',
        permissions: ['super_admin'],
        organizations: user.UserOrganization.map(uo => ({
          id: uo.Organization.id,
          name: uo.Organization.name,
          status: 'active',
          role: 'super_admin',
          permissions: ['super_admin']
        })),
        UserOrganization: user.UserOrganization
      }
    });
  } catch (error) {
    console.error('Erreur auth/me:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/logout - Déconnexion
router.post('/logout', async (req, res) => {
  try {
    res.json({ success: true, message: 'Déconnexion réussie' });
  } catch (error) {
    console.error('Erreur auth/logout:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
