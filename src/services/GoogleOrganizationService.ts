import { db } from '../lib/database';
import { googleOAuthService } from '../google-auth/core/GoogleOAuthCore.js';
import { OAuth2Client } from 'google-auth-library';

const prisma = db;

/**
 * Service pour gérer l'accès Google au niveau organisation
 * Logique : Si le Super Admin a connecté Google, tous les utilisateurs de l'organisation peuvent l'utiliser
 */
export class GoogleOrganizationService {

  /**
   * Obtenir le client Google authentifié pour une organisation
   * Recherche d'abord un super admin connecté, puis un admin, puis n'importe quel utilisateur connecté
   */
  async getOrganizationGoogleClient(organizationId: string): Promise<OAuth2Client | null> {
    console.log('[GoogleOrgService] Recherche client Google pour org:', organizationId);

    // 1. Rechercher les utilisateurs de l'organisation avec leurs tokens Google
    const usersWithTokens = await prisma.user.findMany({
      where: {
        UserOrganization: {
          some: {
            organizationId: organizationId
          }
        },
        googleToken: {
          isNot: null
        }
      },
      include: {
        googleToken: true,
        UserOrganization: {
          where: {
            organizationId: organizationId
          }
        }
      },
      orderBy: [
        // Priorité : super_admin > admin > user
        { role: 'desc' }
      ]
    });

    console.log('[GoogleOrgService] Utilisateurs trouvés avec tokens Google:', usersWithTokens.length);

    if (usersWithTokens.length === 0) {
      console.log('[GoogleOrgService] Aucun utilisateur connecté à Google dans cette organisation');
      return null;
    }

    // Prendre le premier (celui avec le rôle le plus élevé)
    const primaryUser = usersWithTokens[0];
    console.log('[GoogleOrgService] Utilisation du compte Google de:', primaryUser.email, 'Role:', primaryUser.role);

    return await googleOAuthService.getAuthenticatedClient(primaryUser.id);
  }

  /**
   * Vérifier si l'organisation a accès à Google
   */
  async hasOrganizationGoogleAccess(organizationId: string): Promise<boolean> {
    console.log('[GoogleOrgService] Vérification accès Google pour org:', organizationId);

    const count = await prisma.user.count({
      where: {
        UserOrganization: {
          some: {
            organizationId: organizationId
          }
        },
        googleToken: {
          isNot: null
        }
      }
    });

    const hasAccess = count > 0;
    console.log('[GoogleOrgService] Accès Google disponible:', hasAccess);
    return hasAccess;
  }

  /**
   * Obtenir les informations sur la connexion Google de l'organisation
   */
  async getOrganizationGoogleInfo(organizationId: string) {
    console.log('[GoogleOrgService] Récupération infos Google pour org:', organizationId);

    const usersWithTokens = await prisma.user.findMany({
      where: {
        UserOrganization: {
          some: {
            organizationId: organizationId
          }
        },
        googleToken: {
          isNot: null
        }
      },
      include: {
        googleToken: true
      },
      orderBy: [
        { role: 'desc' }
      ]
    });

    if (usersWithTokens.length === 0) {
      return {
        isConnected: false,
        connectedUsers: 0,
        primaryUser: null,
        scopes: []
      };
    }

    const primaryUser = usersWithTokens[0];
    const googleToken = primaryUser.googleToken!;

    // Tester la connexion pour avoir les infos utilisateur
    const connectionTest = await googleOAuthService.testConnection(primaryUser.id);

    return {
      isConnected: true,
      connectedUsers: usersWithTokens.length,
      primaryUser: {
        email: primaryUser.email,
        role: primaryUser.role,
        connectedAt: googleToken.createdAt,
        lastSync: googleToken.updatedAt
      },
      scopes: googleToken.scope ? googleToken.scope.split(' ') : [],
      userInfo: connectionTest.success ? connectionTest.userInfo : null
    };
  }

  /**
   * Obtenir le statut de connexion Google pour un utilisateur dans le contexte de son organisation
   */
  async getUserGoogleStatus(userId: string, organizationId: string) {
    console.log('[GoogleOrgService] Statut Google pour user:', userId, 'org:', organizationId);

    // Vérifier si l'utilisateur a sa propre connexion
    const userHasOwnConnection = await googleOAuthService.isUserConnected(userId);

    // Vérifier si l'organisation a accès via d'autres utilisateurs
    const orgHasAccess = await this.hasOrganizationGoogleAccess(organizationId);

    // Obtenir les infos de l'organisation
    const orgInfo = await this.getOrganizationGoogleInfo(organizationId);

    return {
      hasPersonalConnection: userHasOwnConnection,
      hasOrganizationAccess: orgHasAccess,
      canUseGoogle: userHasOwnConnection || orgHasAccess,
      organizationInfo: orgInfo,
      accessType: userHasOwnConnection ? 'personal' : (orgHasAccess ? 'organization' : 'none')
    };
  }

  /**
   * Déconnecter Google pour une organisation (nécessite les droits super admin)
   */
  async disconnectOrganizationGoogle(organizationId: string, requestingUserId: string) {
    console.log('[GoogleOrgService] Déconnexion Google org:', organizationId, 'par user:', requestingUserId);

    // Vérifier que l'utilisateur qui fait la demande est super admin
    const requestingUser = await prisma.user.findUnique({
      where: { id: requestingUserId },
      include: {
        UserOrganization: {
          where: { organizationId }
        }
      }
    });

    if (!requestingUser || requestingUser.role !== 'super_admin') {
      throw new Error('Seuls les super administrateurs peuvent déconnecter Google pour l\'organisation');
    }

    // Déconnecter tous les utilisateurs de l'organisation
    const usersToDisconnect = await prisma.user.findMany({
      where: {
        UserOrganization: {
          some: { organizationId }
        },
        googleToken: {
          isNot: null
        }
      }
    });

    console.log('[GoogleOrgService] Déconnexion de', usersToDisconnect.length, 'utilisateurs');

    for (const user of usersToDisconnect) {
      await googleOAuthService.disconnectUser(user.id);
    }

    return {
      disconnectedUsers: usersToDisconnect.length,
      success: true
    };
  }
}

export const googleOrganizationService = new GoogleOrganizationService();
