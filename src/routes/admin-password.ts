import { Router } from 'express';
import { db } from '../lib/database';
import { authMiddleware } from '../middlewares/auth';
import { impersonationMiddleware } from '../middlewares/impersonation';
import { encrypt } from '../utils/crypto';
import { logger } from '../lib/logger';

const router = Router();
const prisma = db;

// Middleware d'authentification et d'impersonation appliqué à toutes les routes
router.use(authMiddleware, impersonationMiddleware);

/**
 * Route pour récupérer les informations de tous les utilisateurs avec leurs emails
 * GET /api/admin-password/users-emails
 */
router.get('/users-emails', async (req, res) => {
  try {
    
    // Vérifier que l'utilisateur est admin ou super_admin
    if (req.user && !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Vous n'avez pas les droits nécessaires pour accéder à cette ressource"
      });
    }

    // Récupérer le paramètre d'organisation depuis la query string
    const { organizationId } = req.query;
    
    // Déterminer les filtres en fonction du rôle
    let whereClause: object = {};
    
    if (req.user.role === 'admin') {
      // Les admins ne voient que les utilisateurs de leur organisation
      whereClause = {
        UserOrganization: {
          some: {
            organizationId: req.user.organizationId
          }
        }
      };
    } else if (req.user.role === 'super_admin' && organizationId) {
      // Les super_admins peuvent filtrer par organisation spécifique
      whereClause = {
        UserOrganization: {
          some: {
            organizationId: organizationId as string
          }
        }
      };
    }
    // Si super_admin sans filtre, on récupère tout (whereClause reste vide)

    // Récupérer les utilisateurs avec leurs organisations et comptes email
    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        UserOrganization: {
          include: {
            Organization: true
          }
        },
        emailAccount: true
      },
      orderBy: {
        lastName: 'asc'
      }
    });

    // Transformer les données pour l'interface Excel
    const usersEmailData = users.map(user => {
      const organization = user.UserOrganization?.[0]?.Organization;
      const emailAccount = user.emailAccount;
      
      // Si un compte email existe, utiliser ses données, sinon générer par défaut
      let emailDomain, emailExtension, generatedEmail;
      
      if (emailAccount && emailAccount.emailAddress) {
        // Extraire le domaine et l'extension de l'email sauvegardé
        const emailParts = emailAccount.emailAddress.split('@');
        if (emailParts.length === 2) {
          const domainPart = emailParts[1]; // ex: "2thier.be"
          const domainParts = domainPart.split('.');
          if (domainParts.length >= 2) {
            emailDomain = domainParts.slice(0, -1).join('.'); // ex: "2thier"
            emailExtension = '.' + domainParts[domainParts.length - 1]; // ex: ".be"
          } else {
            emailDomain = domainPart;
            emailExtension = '';
          }
        }
        generatedEmail = emailAccount.emailAddress;
      } else {
        // Générer le domaine par défaut si pas de compte email
        const defaultDomain = organization ? 
          organization.name.toLowerCase().replace(/\s/g, '') : 
          '2thier';
        
        emailDomain = defaultDomain;
        emailExtension = '.be'; // Extension par défaut
        
        // Générer l'email par défaut
        const firstName = (user.firstName || '').toLowerCase();
        const lastName = (user.lastName || '').toLowerCase();
        
        generatedEmail = firstName && lastName ? 
          `${firstName}.${lastName}@${emailDomain}${emailExtension}` : 
          '';
      }

      return {
        id: user.id,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        organizationName: organization?.name || 'Aucune organisation',
        organizationId: organization?.id || '',
        emailDomain: emailDomain,
        emailExtension: emailExtension,
        generatedEmail,
        hasEmailAccount: !!emailAccount,
        isValidated: !!emailAccount?.encryptedPassword,
        canSync: !!emailAccount?.encryptedPassword
      };
    });

    return res.status(200).json(usersEmailData);
  } catch (error) {
    logger.error('Erreur lors de la récupération des utilisateurs et emails:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs et emails'
    });
  }
});

/**
 * Route pour mettre à jour la configuration email d'un utilisateur
 * POST /api/admin-password/update-email-config
 */
router.post('/update-email-config', async (req, res) => {
  try {
    const { userId, emailDomain, emailExtension, firstName, lastName } = req.body;
    

    // Vérifier que l'utilisateur est admin ou super_admin
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Vous n'avez pas les droits nécessaires pour effectuer cette action"
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "L'ID de l'utilisateur est requis"
      });
    }

    // Générer l'email à partir des composants fournis
    const cleanFirstName = (firstName || '').toLowerCase().trim();
    const cleanLastName = (lastName || '').toLowerCase().trim();
    const domain = emailDomain || '2thier';
    const extension = emailExtension || '.be';
    
    const generatedEmail = cleanFirstName && cleanLastName ? 
      `${cleanFirstName}.${cleanLastName}@${domain}${extension}` : 
      '';


    if (!generatedEmail) {
      return res.status(400).json({
        success: false,
        message: "Impossible de générer l'email avec les données fournies"
      });
    }

    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        UserOrganization: {
          include: {
            Organization: true
          }
        },
        emailAccount: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé"
      });
    }

    const organization = user.UserOrganization?.[0]?.Organization;
    if (!organization) {
      return res.status(400).json({
        success: false,
        message: "L'utilisateur doit être associé à une organisation"
      });
    }

    // Mettre à jour ou créer le compte email
    if (user.emailAccount) {
      await prisma.emailAccount.update({
        where: { userId },
        data: {
          emailAddress: generatedEmail
        }
      });
    } else {
      // Créer un nouveau compte email sans mot de passe (sera configuré plus tard)
      await prisma.emailAccount.create({
        data: {
          userId,
          emailAddress: generatedEmail,
          encryptedPassword: '', // Sera rempli lors de la configuration Yandex
          organizationId: organization.id
        }
      });
    }

    return res.json({
      success: true,
      message: "Configuration email mise à jour avec succès"
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la configuration email:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la configuration email'
    });
  }
});
router.get('/users-services', async (req, res) => {
  try {
    
    // Vérifier que l'utilisateur est admin ou super_admin
    if (req.user && !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Vous n'avez pas les droits nécessaires pour accéder à cette ressource"
      });
    }

    // Récupérer les utilisateurs avec leurs mots de passe CRM ET email
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        passwordHash: true, // Mot de passe CRM
        emailAccount: {
          select: {
            emailAddress: true,
            encryptedPassword: true // Mot de passe email
          }
        }
      },
      orderBy: {
        lastName: 'asc'
      }
    });
    

    // Transformer les données avec la VRAIE logique d'unification
    const usersWithServices = users.map(user => {
      const hasCrmPassword = !!user.passwordHash;
      const hasEmailPassword = !!user.emailAccount?.encryptedPassword;
      const hasEmailAccount = !!user.emailAccount;
      
      // Un utilisateur est "unifié" s'il a TOUS ses mots de passe configurés
      const isUnified = hasCrmPassword && hasEmailPassword;
      
      
      return {
        id: user.id,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email,
        hasMailSettings: hasEmailAccount,
        hasTelnyxSettings: false, // À implémenter plus tard
        mailEmail: user.emailAccount?.emailAddress || 
                   `${(user.firstName || '').toLowerCase()}.${(user.lastName || '').toLowerCase()}@2thier.be`,
        isUnified: isUnified, // VRAIE logique d'unification
        _debug: {
          hasCrmPassword,
          hasEmailPassword,
          hasEmailAccount
        }
      };
    });
    
    return res.status(200).json(usersWithServices);
    
  } catch (error) {
    logger.error('Erreur lors de la récupération des utilisateurs et services:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs et services'
    });
  }
});

/**
 * Route pour définir un mot de passe unifié pour un utilisateur
 * POST /api/admin-password/unified-password
 */
router.post('/unified-password', async (req, res) => {
  try {
    const { userId, password } = req.body;


    // Vérifier que l'utilisateur est admin ou super_admin
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Vous n'avez pas les droits nécessaires pour effectuer cette action"
      });
    }

    if (!userId || !password) {
      return res.status(400).json({
        success: false,
        message: "L'ID de l'utilisateur et le mot de passe sont requis"
      });
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        emailAccount: true,
        UserOrganization: {
          include: {
            Organization: true,
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé"
      });
    }


    // Importer bcrypt pour le hachage du mot de passe CRM
    const bcrypt = await import('bcrypt');
    
    // 1. METTRE À JOUR LE MOT DE PASSE CRM (pour vraie unification)
    const hashedCrmPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashedCrmPassword
      }
    });

    // 2. METTRE À JOUR LE MOT DE PASSE EMAIL
    const encryptedEmailPassword = encrypt(password);

    if (user.emailAccount) {
      await prisma.emailAccount.update({
        where: { userId },
        data: {
          encryptedPassword: encryptedEmailPassword
        }
      });
    } else {
      // Créer le compte email s'il n'existe pas
      const organization = user.UserOrganization?.[0]?.Organization;
      const domain = organization ? `${organization.name.toLowerCase().replace(/\s/g, '')}.be` : '2thier.be';
      const emailAddress = `${user.firstName?.toLowerCase()}.${user.lastName?.toLowerCase()}@${domain}`;
      
      await prisma.emailAccount.create({
        data: {
          userId,
          emailAddress,
          encryptedPassword: encryptedEmailPassword,
          organizationId: organization?.id || user.UserOrganization?.[0]?.organizationId || ''
        }
      });
    }

    return res.json({
      success: true,
      message: "Mot de passe unifié défini avec succès pour CRM et Email"
    });
  } catch (error) {
    logger.error('Erreur lors de la définition du mot de passe unifié:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la définition du mot de passe unifié'
    });
  }
});

export default router;
