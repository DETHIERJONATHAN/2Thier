import { AxiosInstance } from 'axios';

/**
 * Service pour gérer les appels téléphoniques via Telnyx
 */
export class TelnyxService {
  private apiClient: AxiosInstance;
  private baseUrl: string;

  constructor(apiClient: AxiosInstance) {
    this.apiClient = apiClient;
    this.baseUrl = '/api/services/telnyx';
  }

  /**
   * Configure un numéro Telnyx pour un utilisateur
   */
  async setupTelnyxNumber(userId: string): Promise<any> {
    return this.apiClient.post(`${this.baseUrl}/setup`, { userId });
  }

  /**
   * Vérifie si un utilisateur possède un numéro Telnyx configuré
   */
  async checkTelnyxStatus(userId: string): Promise<any> {
    return this.apiClient.get(`${this.baseUrl}/status/${userId}`);
  }

  /**
   * Active ou désactive un numéro Telnyx
   */
  async toggleTelnyxStatus(userId: string, isActive: boolean): Promise<any> {
    return this.apiClient.patch(`${this.baseUrl}/status`, { userId, isActive });
  }

  /**
   * Initie un appel via Telnyx
   */
  async initiateCall(userId: string, destination: string): Promise<any> {
    return this.apiClient.post(`${this.baseUrl}/call`, { userId, destination });
  }
}

export default TelnyxService;
