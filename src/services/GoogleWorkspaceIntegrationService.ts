import { GoogleWorkspaceService } from './GoogleWorkspaceService.js';
import { decrypt } from '../utils/crypto.js';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

/**
 * Service d'intégration automatique pour Google Workspace
 * Crée automatiquement des comptes Google Workspace quand de nouveaux utilisateurs CRM sont créés
 */
export class GoogleWorkspaceIntegrationService {
  private static instance: GoogleWorkspaceIntegrationService | null = null;
  private googleWorkspaceService: GoogleWorkspaceService | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): GoogleWorkspaceIntegrationService {
    if (!this.instance) {
      this.instance = new GoogleWorkspaceIntegrationService();
    }
    return this.instance;
  }

  /**
   * Initialise le service avec la configuration Google Workspace
   */
  async initialize(): Promise<boolean> {
    try {
      const config = await prisma.googleWorkspaceConfig.findFirst({
        where: { isActive: true }
      });

      if (!config) {
        this.isInitialized = false;
        return false;
      }

      // Déchiffrer la configuration
      const decryptedConfig = {
        clientId: config.clientId,
        clientSecret: decrypt(config.clientSecret),
        domain: config.domain,
        adminEmail: config.adminEmail,
        serviceAccountEmail: config.serviceAccountEmail,
        privateKey: decrypt(config.privateKey),
        isActive: config.isActive
      };

      this.googleWorkspaceService = new GoogleWorkspaceService(decryptedConfig);
      this.isInitialized = true;
      
      return true;
    } catch (error) {
      logger.error('❌ [GoogleWorkspaceIntegration] Erreur initialisation:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Crée automatiquement un compte Google Workspace pour un utilisateur CRM
   */
  async createWorkspaceUserForCrmUser(crmUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    organizationId?: string;
  }): Promise<{ success: boolean; workspaceUser?: unknown; error?: string }> {
    try {

      // Vérifier si le service est initialisé
      if (!this.isInitialized || !this.googleWorkspaceService) {
        const initialized = await this.initialize();
        if (!initialized) {
          return {
            success: false,
            error: 'Service Google Workspace non configuré'
          };
        }
      }

      // Générer un mot de passe temporaire sécurisé
      const tempPassword = this.generateSecurePassword();

      // Créer l'utilisateur Google Workspace
      const result = await this.googleWorkspaceService!.createUser({
        firstName: crmUser.firstName,
        lastName: crmUser.lastName,
        email: crmUser.email,
        password: tempPassword
      });

      if (result.success) {
        // Optionnel : Sauvegarder les informations de compte Workspace dans la DB
        await this.saveWorkspaceUserInfo(crmUser.id, {
          workspaceUserId: (result.user as unknown)?.id || 'unknown',
          email: crmUser.email,
          tempPassword: tempPassword, // À chiffrer en production
          createdAt: new Date()
        });

        
        // TODO: Envoyer un email de bienvenue avec les informations de connexion
        await this.sendWelcomeEmail(crmUser, tempPassword);

        return {
          success: true,
          workspaceUser: result.user
        };
      } else {
        logger.error(`❌ [GoogleWorkspaceIntegration] Échec création compte pour ${crmUser.email}:`, result.error);
        return {
          success: false,
          error: result.error || 'Erreur inconnue lors de la création du compte'
        };
      }
    } catch (error) {
      logger.error('❌ [GoogleWorkspaceIntegration] Erreur création utilisateur:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Vérifie si l'intégration Google Workspace est active
   */
  async isIntegrationActive(): Promise<boolean> {
    try {
      const config = await prisma.googleWorkspaceConfig.findFirst({
        where: { isActive: true }
      });
      return !!config;
    } catch (error) {
      logger.error('❌ [GoogleWorkspaceIntegration] Erreur vérification statut:', error);
      return false;
    }
  }

  /**
   * Met à jour le mot de passe d'un utilisateur Google Workspace
   */
  async updateUserPassword(email: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isInitialized || !this.googleWorkspaceService) {
        const initialized = await this.initialize();
        if (!initialized) {
          return {
            success: false,
            error: 'Service Google Workspace non configuré'
          };
        }
      }

      return await this.googleWorkspaceService!.updateUserPassword(email, newPassword);
    } catch (error) {
      logger.error('❌ [GoogleWorkspaceIntegration] Erreur mise à jour mot de passe:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Génère un mot de passe sécurisé temporaire
   */
  private generateSecurePassword(): string {
    const length = 16;
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    // Assurer au moins un caractère de chaque type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Majuscule
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Minuscule
    password += '0123456789'[Math.floor(Math.random() * 10)]; // Chiffre
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // Caractère spécial
    
    // Compléter avec des caractères aléatoires
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Mélanger les caractères
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Sauvegarde les informations du compte Workspace dans la DB
   */
  private async saveWorkspaceUserInfo(crmUserId: string, workspaceInfo: {
    workspaceUserId?: string;
    email: string;
    tempPassword: string;
    createdAt: Date;
  }): Promise<void> {
    try {
      // TODO: Créer une table WorkspaceAccount ou étendre EmailAccount
      
      // Pour l'instant, on peut utiliser la table EmailAccount existante
      // ou créer une nouvelle table spécifique Google Workspace
    } catch (error) {
      logger.error('❌ [GoogleWorkspaceIntegration] Erreur sauvegarde infos Workspace:', error);
    }
  }

  /**
   * Envoie un email de bienvenue avec les informations de connexion
   */
  private async sendWelcomeEmail(user: {
    firstName: string;
    lastName: string;
    email: string;
  }, _tempPassword: string): Promise<void> {
    try {
      
      // TODO: Implémenter l'envoi d'email avec les informations de connexion
      // const emailContent = `
      //   Bonjour ${user.firstName} ${user.lastName},
      //   
      //   Votre compte Google Workspace a été créé avec succès !
      //   
      //   Email: ${user.email}
      //   Mot de passe temporaire: ${tempPassword}
      //   
      //   Veuillez vous connecter et changer votre mot de passe dès que possible.
      //   
      //   Accès Gmail: https://gmail.com
      //   Accès Google Drive: https://drive.google.com
      //   
      //   Cordialement,
      //   L'équipe CRM
      // `;
      
      // await emailService.sendEmail({
      //   to: user.email,
      //   subject: 'Bienvenue - Votre compte Google Workspace est prêt',
      //   content: emailContent
      // });
      
    } catch (error) {
      logger.error('❌ [GoogleWorkspaceIntegration] Erreur envoi email de bienvenue:', error);
    }
  }
}

// Export d'une instance singleton
export const googleWorkspaceIntegration = GoogleWorkspaceIntegrationService.getInstance();
