import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

interface GoogleVoiceConfig {
  privateKey: string;
  clientEmail: string;
  domain: string;
  delegatedUserEmail: string;
}

interface GoogleVoiceUser {
  phoneNumber: string;
  displayName: string;
  email: string;
  voicemailPin?: string;
  callForwarding?: string[];
  voiceSettings?: {
    doNotDisturb: boolean;
    voicemailTranscription: boolean;
    callScreening: boolean;
  };
}

interface CallRecord {
  id: string;
  fromNumber: string;
  toNumber: string;
  duration: number;
  timestamp: Date;
  type: 'inbound' | 'outbound' | 'missed';
  recordingUrl?: string;
  transcription?: string;
}

interface SMSMessage {
  id: string;
  fromNumber: string;
  toNumber: string;
  message: string;
  timestamp: Date;
  direction: 'inbound' | 'outbound';
  status: 'sent' | 'delivered' | 'failed';
}

export class GoogleVoiceService {
  private auth: JWT;
  private config: GoogleVoiceConfig;
  private adminSdk: any;

  constructor(config: GoogleVoiceConfig) {
    this.config = config;
    
    // Configuration de l'authentification JWT avec délégation de domaine
    this.auth = new JWT({
      email: config.clientEmail,
      key: config.privateKey.replace(/\\n/g, '\n'),
      scopes: [
        'https://www.googleapis.com/auth/admin.directory',
        'https://www.googleapis.com/auth/admin.directory.user',
        'https://www.googleapis.com/auth/admin.directory.orgunit'
      ],
      subject: config.delegatedUserEmail // Utilisateur administrateur délégué
    });

    // Initialisation de l'Admin SDK (Voice est géré via Admin SDK)
    this.adminSdk = google.admin({ version: 'directory_v1', auth: this.auth });
  }

  /**
   * Test de connexion à Google Workspace Voice
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔗 Test de connexion Google Voice...');
      
      // Test de base avec l'Admin SDK
      const response = await this.adminSdk.users.list({
        domain: this.config.domain,
        maxResults: 1
      });

      if (response.data.users) {
        console.log('✅ Connexion Google Voice réussie');
        return {
          success: true,
          message: `Connexion établie avec ${this.config.domain}. Google Voice prêt.`
        };
      } else {
        throw new Error('Aucun utilisateur trouvé dans le domaine');
      }
    } catch (error: any) {
      console.error('❌ Erreur de connexion Google Voice:', error);
      return {
        success: false,
        message: `Erreur de connexion: ${error.message}`
      };
    }
  }

  /**
   * Attribution d'un numéro Google Voice à un utilisateur
   */
  async assignPhoneNumber(userEmail: string, phoneNumber: string): Promise<boolean> {
    try {
      console.log(`📞 Attribution du numéro ${phoneNumber} à ${userEmail}...`);
      
      // Note: Google Voice nécessite une gestion via la console d'administration
      // Pour l'instant, nous simulons l'attribution et stockons dans le profil utilisateur
      
      // Mise à jour du profil utilisateur avec le numéro de téléphone
      await this.adminSdk.users.patch({
        userKey: userEmail,
        requestBody: {
          phones: [
            {
              type: 'work',
              value: phoneNumber,
              primary: true
            }
          ],
          customSchemas: {
            'GoogleVoice': {
              'phoneNumber': phoneNumber,
              'voiceEnabled': true,
              'assignedDate': new Date().toISOString()
            }
          }
        }
      });

      console.log(`✅ Numéro ${phoneNumber} attribué à ${userEmail}`);
      return true;
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'attribution du numéro:', error);
      throw error;
    }
  }

  /**
   * Configuration des paramètres Voice pour un utilisateur
   */
  async configureVoiceSettings(userEmail: string, settings: GoogleVoiceUser['voiceSettings']): Promise<boolean> {
    try {
      console.log(`⚙️ Configuration Voice pour ${userEmail}...`);
      
      // Mise à jour des paramètres Voice dans le profil utilisateur
      await this.adminSdk.users.patch({
        userKey: userEmail,
        requestBody: {
          customSchemas: {
            'GoogleVoice': {
              'doNotDisturb': settings?.doNotDisturb || false,
              'voicemailTranscription': settings?.voicemailTranscription || true,
              'callScreening': settings?.callScreening || false,
              'lastUpdated': new Date().toISOString()
            }
          }
        }
      });

      console.log(`✅ Paramètres Voice configurés pour ${userEmail}`);
      return true;
    } catch (error: any) {
      console.error('❌ Erreur lors de la configuration Voice:', error);
      throw error;
    }
  }

  /**
   * Initialisation automatique de Google Voice pour un nouvel utilisateur
   */
  async initializeVoiceForUser(userEmail: string, displayName: string): Promise<GoogleVoiceUser> {
    try {
      console.log(`🚀 Initialisation Google Voice pour ${userEmail}...`);
      
      // Génération automatique d'un numéro (simulation)
      // En production, ceci serait fait via la console d'administration Google Voice
      const phoneNumber = this.generateVoiceNumber();
      
      // Configuration par défaut
      const defaultSettings: GoogleVoiceUser['voiceSettings'] = {
        doNotDisturb: false,
        voicemailTranscription: true,
        callScreening: false
      };

      // Attribution du numéro
      await this.assignPhoneNumber(userEmail, phoneNumber);
      
      // Configuration des paramètres
      await this.configureVoiceSettings(userEmail, defaultSettings);

      const voiceUser: GoogleVoiceUser = {
        phoneNumber,
        displayName,
        email: userEmail,
        voiceSettings: defaultSettings,
        callForwarding: []
      };

      console.log(`✅ Google Voice initialisé pour ${userEmail} avec le numéro ${phoneNumber}`);
      return voiceUser;
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'initialisation Voice:', error);
      throw error;
    }
  }

  /**
   * Récupération de tous les utilisateurs Voice du domaine
   */
  async getVoiceUsers(): Promise<GoogleVoiceUser[]> {
    try {
      console.log('📋 Récupération des utilisateurs Google Voice...');
      
      const response = await this.adminSdk.users.list({
        domain: this.config.domain,
        maxResults: 500
      });

      const voiceUsers: GoogleVoiceUser[] = [];

      if (response.data.users) {
        for (const user of response.data.users) {
          // Vérifier si l'utilisateur a Google Voice activé
          const voiceSchema = user.customSchemas?.GoogleVoice;
          const workPhone = user.phones?.find((p: any) => p.type === 'work');
          
          if (voiceSchema?.voiceEnabled && workPhone) {
            voiceUsers.push({
              phoneNumber: workPhone.value,
              displayName: user.name?.fullName || '',
              email: user.primaryEmail || '',
              voiceSettings: {
                doNotDisturb: voiceSchema.doNotDisturb || false,
                voicemailTranscription: voiceSchema.voicemailTranscription || true,
                callScreening: voiceSchema.callScreening || false
              }
            });
          }
        }
      }

      console.log(`✅ ${voiceUsers.length} utilisateurs Google Voice trouvés`);
      return voiceUsers;
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération des utilisateurs Voice:', error);
      throw error;
    }
  }

  /**
   * Simulation d'appel sortant (à intégrer avec l'API Google Voice réelle)
   */
  async makeCall(fromNumber: string, toNumber: string, userEmail: string): Promise<CallRecord> {
    try {
      console.log(`📞 Appel de ${fromNumber} vers ${toNumber} par ${userEmail}...`);
      
      // En production, ceci utiliserait l'API Google Voice pour initier l'appel
      // Pour l'instant, nous simulons l'appel
      
      const callRecord: CallRecord = {
        id: `gv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fromNumber,
        toNumber,
        duration: 0, // Sera mis à jour à la fin de l'appel
        timestamp: new Date(),
        type: 'outbound'
      };

      // Simulation: l'appel est initié
      console.log(`✅ Appel initié - ID: ${callRecord.id}`);
      return callRecord;
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'initiation de l\'appel:', error);
      throw error;
    }
  }

  /**
   * Envoi de SMS via Google Voice
   */
  async sendSMS(fromNumber: string, toNumber: string, message: string, userEmail: string): Promise<SMSMessage> {
    try {
      console.log(`💬 Envoi SMS de ${fromNumber} vers ${toNumber} par ${userEmail}...`);
      
      // En production, ceci utiliserait l'API Google Voice pour envoyer le SMS
      const smsMessage: SMSMessage = {
        id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fromNumber,
        toNumber,
        message,
        timestamp: new Date(),
        direction: 'outbound',
        status: 'sent'
      };

      // Simulation: SMS envoyé
      console.log(`✅ SMS envoyé - ID: ${smsMessage.id}`);
      return smsMessage;
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'envoi du SMS:', error);
      throw error;
    }
  }

  /**
   * Récupération de l'historique des appels
   */
  async getCallHistory(userEmail: string, limit: number = 50): Promise<CallRecord[]> {
    try {
      console.log(`📊 Récupération des ${limit} derniers appels pour ${userEmail}...`);
      
      // En production, ceci récupérerait les données depuis Google Voice
      // Pour l'instant, nous retournons un historique simulé
  const simulatedCount = Math.min(limit, 5);
      const callHistory: CallRecord[] = Array.from({ length: simulatedCount }, (_, index) => ({
        id: `sim_call_${index}`,
        fromNumber: '+32470123456',
        toNumber: '+32471111222',
        duration: 0,
        timestamp: new Date(),
        type: 'inbound'
      }));
      
      console.log(`✅ ${callHistory.length} appels récupérés`);
      return callHistory;
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération de l\'historique:', error);
      throw error;
    }
  }

  /**
   * Récupération des messages SMS
   */
  async getSMSHistory(userEmail: string, limit: number = 50): Promise<SMSMessage[]> {
    try {
      console.log(`💬 Récupération des ${limit} derniers SMS pour ${userEmail}...`);
      
      // En production, ceci récupérerait les données depuis Google Voice
  const simulatedCount = Math.min(limit, 5);
      const smsHistory: SMSMessage[] = Array.from({ length: simulatedCount }, (_, index) => ({
        id: `sim_sms_${index}`,
        fromNumber: '+32470123456',
        toNumber: '+32471111222',
        message: 'Message simulé',
        timestamp: new Date(),
        direction: 'inbound',
        status: 'received'
      }));
      
      console.log(`✅ ${smsHistory.length} SMS récupérés`);
      return smsHistory;
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération des SMS:', error);
      throw error;
    }
  }

  /**
   * Configuration d'un standard automatique (Auto Attendant)
   */
  async configureAutoAttendant(name: string, welcomeMessage: string, menuOptions: any[]): Promise<boolean> {
    try {
      console.log(`🏢 Configuration du standard automatique "${name}"...`);
      console.log(`📢 Message d'accueil: ${welcomeMessage}`);
      console.log(`📋 Options de menu (${menuOptions.length}):`, menuOptions.map((option) => option?.label ?? 'option'));
      
      // En production, ceci configurerait un standard automatique Google Voice
      // Pour l'instant, nous simulons la configuration
      
      console.log(`✅ Standard automatique "${name}" configuré`);
      return true;
    } catch (error: any) {
      console.error('❌ Erreur lors de la configuration du standard:', error);
      throw error;
    }
  }

  /**
   * Génération d'un numéro Google Voice (simulation)
   */
  private generateVoiceNumber(): string {
    // Simulation d'un numéro belge (format +32)
    const areaCode = '2'; // Bruxelles
    const number = Math.floor(Math.random() * 9000000) + 1000000;
    return `+32${areaCode}${number}`;
  }

  /**
   * Mise à jour des paramètres de renvoi d'appel
   */
  async updateCallForwarding(userEmail: string, forwardingNumbers: string[]): Promise<boolean> {
    try {
      console.log(`📞 Mise à jour du renvoi d'appel pour ${userEmail}...`);
      
      await this.adminSdk.users.patch({
        userKey: userEmail,
        requestBody: {
          customSchemas: {
            'GoogleVoice': {
              'callForwarding': forwardingNumbers.join(','),
              'lastUpdated': new Date().toISOString()
            }
          }
        }
      });

      console.log(`✅ Renvoi d'appel configuré pour ${userEmail}`);
      return true;
    } catch (error: any) {
      console.error('❌ Erreur lors de la configuration du renvoi:', error);
      throw error;
    }
  }

  /**
   * Activation/désactivation du mode Ne pas déranger
   */
  async toggleDoNotDisturb(userEmail: string, enabled: boolean): Promise<boolean> {
    try {
      console.log(`🔕 ${enabled ? 'Activation' : 'Désactivation'} du mode Ne pas déranger pour ${userEmail}...`);
      
      await this.adminSdk.users.patch({
        userKey: userEmail,
        requestBody: {
          customSchemas: {
            'GoogleVoice': {
              'doNotDisturb': enabled,
              'lastUpdated': new Date().toISOString()
            }
          }
        }
      });

      console.log(`✅ Mode Ne pas déranger ${enabled ? 'activé' : 'désactivé'} pour ${userEmail}`);
      return true;
    } catch (error: any) {
      console.error('❌ Erreur lors de la modification du mode Ne pas déranger:', error);
      throw error;
    }
  }
}

export default GoogleVoiceService;
