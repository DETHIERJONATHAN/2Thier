import { google, admin_directory_v1 } from 'googleapis';
import { JWT } from 'google-auth-library';

interface GoogleWorkspaceUser {
  name: {
    givenName: string;
    familyName: string;
  };
  primaryEmail: string;
  password: string;
  orgUnitPath?: string;
  suspended?: boolean;
}

interface GoogleWorkspaceConfig {
  clientId: string;
  clientSecret: string;
  domain: string;
  adminEmail: string;
  serviceAccountEmail: string;
  privateKey: string;
  isActive: boolean;
}

export class GoogleWorkspaceService {
  private config: GoogleWorkspaceConfig;
  private adminClient: admin_directory_v1.Admin;

  constructor(config: GoogleWorkspaceConfig) {
    this.config = config;
    this.initializeClient();
  }

  private initializeClient() {
    try {
      // Configuration du compte de service avec délégation domain-wide
      const jwtClient = new JWT({
        email: this.config.serviceAccountEmail,
        key: this.config.privateKey.replace(/\\n/g, '\n'),
        scopes: [
          'https://www.googleapis.com/auth/admin.directory.user',
          'https://www.googleapis.com/auth/admin.directory.group',
          'https://www.googleapis.com/auth/admin.directory.orgunit'
        ],
        subject: this.config.adminEmail // Impersonification de l'admin
      });

      this.adminClient = google.admin({ version: 'directory_v1', auth: jwtClient });
    } catch (error) {
      console.error('[GoogleWorkspace] Erreur initialisation client:', error);
      throw new Error('Impossible d\'initialiser le client Google Workspace');
    }
  }

  /**
   * Teste la connexion à Google Workspace
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      
      // Test simple : récupérer les informations du domaine
      await this.adminClient.users.list({
        domain: this.config.domain,
        maxResults: 1
      });

      return {
        success: true,
        message: `Connexion réussie au domaine ${this.config.domain}`
      };
    } catch (error: unknown) {
      console.error('❌ [GoogleWorkspace] Erreur test connexion:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      return {
        success: false,
        message: `Erreur de connexion: ${errorMessage}`
      };
    }
  }

  /**
   * Crée un nouvel utilisateur Google Workspace
   */
  async createUser(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<{ success: boolean; user?: admin_directory_v1.Schema$User; error?: string }> {
    try {

      const googleUser: GoogleWorkspaceUser = {
        name: {
          givenName: userData.firstName,
          familyName: userData.lastName
        },
        primaryEmail: userData.email,
        password: userData.password,
        suspended: false,
        orgUnitPath: '/' // Unité organisationnelle par défaut
      };

      const response = await this.adminClient.users.insert({
        requestBody: googleUser
      });

      return {
        success: true,
  user: response.data
      };
    } catch (error: unknown) {
      console.error('❌ [GoogleWorkspace] Erreur création utilisateur:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Met à jour le mot de passe d'un utilisateur
   */
  async updateUserPassword(email: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {

      await this.adminClient.users.update({
        userKey: email,
        requestBody: {
          password: newPassword
        }
      });

      return { success: true };
    } catch (error: unknown) {
      console.error('❌ [GoogleWorkspace] Erreur mise à jour mot de passe:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Vérifie si un utilisateur existe
   */
  async userExists(email: string): Promise<boolean> {
    try {
      await this.adminClient.users.get({ userKey: email });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Liste tous les utilisateurs du domaine
   */
  async listUsers(): Promise<admin_directory_v1.Schema$User[]> {
    try {
      const response = await this.adminClient.users.list({
        domain: this.config.domain,
        maxResults: 500
      });
  return response.data.users ?? [];
    } catch (error) {
      console.error('[GoogleWorkspace] Erreur liste utilisateurs:', error);
      return [];
    }
  }

  /**
   * Supprime un utilisateur
   */
  async deleteUser(email: string): Promise<{ success: boolean; error?: string }> {
    try {

      await this.adminClient.users.delete({ userKey: email });

      return { success: true };
    } catch (error: unknown) {
      console.error('❌ [GoogleWorkspace] Erreur suppression utilisateur:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      return {
        success: false,
        error: errorMessage
      };
    }
  }
}
