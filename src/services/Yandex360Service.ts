import axios from 'axios';

interface Yandex360Config {
  organizationId: string;
  accessToken: string;
  apiUrl: string;
}

interface CreateUserRequest {
  departmentId: number;
  name: {
    first: string;
    last: string;
    middle?: string;
  };
  nickname: string; // Le login (sans @domain)
  password: string;
  about?: string;
  birthday?: string;
  isAdmin?: boolean;
  language?: string;
  position?: string;
  timezone?: string;
  passwordChangeRequired?: boolean;
}

interface Yandex360User {
  id: string;
  email: string;
  nickname: string;
  name: {
    first: string;
    last: string;
    middle?: string;
  };
  isEnabled: boolean;
  isDismissed: boolean;
  departmentId: number;
  position?: string;
  createdAt: string;
}

export class Yandex360Service {
  private config: Yandex360Config;

  constructor(config: Yandex360Config) {
    this.config = config;
  }

  /**
   * Crée automatiquement un nouvel utilisateur chez Yandex 360
   */
  async createUser(userParams: CreateUserRequest): Promise<Yandex360User> {
    try {
      console.log(`🔄 [YANDEX360] Création utilisateur: ${userParams.nickname}`);
      
      const response = await axios.post(
        `${this.config.apiUrl}/directory/v1/org/${this.config.organizationId}/users`,
        userParams,
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const userData = response.data as Yandex360User;
      console.log(`✅ [YANDEX360] Utilisateur créé: ${userData.email}`);
      
      return userData;

    } catch (error: any) {
      console.error(`❌ [YANDEX360] Erreur création utilisateur:`, error.response?.data || error.message);
      throw new Error(`Erreur lors de la création du compte Yandex: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Vérifie si un utilisateur existe déjà
   */
  async getUserByNickname(nickname: string): Promise<Yandex360User | null> {
    try {
      const response = await axios.get(
        `${this.config.apiUrl}/directory/v1/org/${this.config.organizationId}/users`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
          },
          params: {
            nickname: nickname,
          },
        }
      );

      const users = response.data.users || [];
      return users.find((user: Yandex360User) => user.nickname === nickname) || null;

    } catch (error: any) {
      console.error(`❌ [YANDEX360] Erreur recherche utilisateur:`, error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Liste tous les utilisateurs de l'organisation
   */
  async listUsers(): Promise<Yandex360User[]> {
    try {
      const response = await axios.get(
        `${this.config.apiUrl}/directory/v1/org/${this.config.organizationId}/users`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
          },
        }
      );

      return response.data.users || [];

    } catch (error: any) {
      console.error(`❌ [YANDEX360] Erreur liste utilisateurs:`, error.response?.data || error.message);
      throw new Error(`Erreur lors de la récupération des utilisateurs: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Supprime un utilisateur (marque comme licencié)
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      await axios.patch(
        `${this.config.apiUrl}/directory/v1/org/${this.config.organizationId}/users/${userId}`,
        {
          isDismissed: true,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`✅ [YANDEX360] Utilisateur supprimé: ${userId}`);

    } catch (error: any) {
      console.error(`❌ [YANDEX360] Erreur suppression utilisateur:`, error.response?.data || error.message);
      throw new Error(`Erreur lors de la suppression: ${error.response?.data?.message || error.message}`);
    }
  }
}

// Configuration par défaut pour Yandex 360
export const createYandex360Service = (accessToken: string, organizationId: string) => {
  return new Yandex360Service({
    organizationId,
    accessToken,
    apiUrl: 'https://api360.yandex.net',
  });
};
