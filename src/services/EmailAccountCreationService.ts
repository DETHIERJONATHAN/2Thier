/**
 * Service de création automatisée de comptes email
 * Génère les instructions et facilite la création manuelle
 */

export interface EmailCreationInstructions {
  provider: 'yandex' | 'google' | 'zoho' | 'custom';
  emailAddress: string;
  suggestedPassword: string;
  setupSteps: string[];
  configurationData: {
    smtpServer: string;
    smtpPort: number;
    imapServer: string;
    imapPort: number;
    security: string;
  };
}

export class EmailAccountCreationService {
  /**
   * Génère des instructions pour créer un compte email
   */
  static generateCreationInstructions(
    firstName: string,
    lastName: string,
    domain: string = '2thier.be'
  ): EmailCreationInstructions {
    const normalizedFirstName = this.normalizeText(firstName);
    const normalizedLastName = this.normalizeText(lastName);
    const emailAddress = `${normalizedFirstName}.${normalizedLastName}@${domain}`;
    const suggestedPassword = this.generateSecurePassword();

    // Déterminer le provider basé sur le domaine
    const provider = this.detectProvider(domain);

    return {
      provider,
      emailAddress,
      suggestedPassword,
      setupSteps: this.getSetupSteps(provider, emailAddress, suggestedPassword),
      configurationData: this.getProviderConfig(provider, domain)
    };
  }

  /**
   * Détecte le provider basé sur le domaine
   */
  private static detectProvider(domain: string): 'yandex' | 'google' | 'zoho' | 'custom' {
    if (domain.includes('yandex') || domain === '2thier.be') {
      return 'yandex';
    }
    if (domain.includes('gmail') || domain.includes('google')) {
      return 'google';
    }
    if (domain.includes('zoho')) {
      return 'zoho';
    }
    return 'custom';
  }

  /**
   * Génère les étapes de configuration
   */
  private static getSetupSteps(
    provider: 'yandex' | 'google' | 'zoho' | 'custom',
    emailAddress: string,
    password: string
  ): string[] {
    switch (provider) {
      case 'yandex':
        return [
          `🌐 Allez sur https://connect.yandex.com/ ou https://360.yandex.com/`,
          `📧 Créez un compte Yandex Business avec le domaine "2thier.be"`,
          `👤 Ajoutez un utilisateur avec l'email : ${emailAddress}`,
          `🔑 Définissez le mot de passe : ${password}`,
          `⚙️ Activez IMAP dans les paramètres du compte`,
          `✅ Testez la connexion depuis le CRM`,
          `💡 Note: Yandex Business coûte ~$1.38/mois par utilisateur`
        ];

      case 'google':
        return [
          `🌐 Allez sur https://workspace.google.com/`,
          `📧 Créez un compte Google Workspace`,
          `👤 Ajoutez un utilisateur : ${emailAddress}`,
          `🔑 Définissez le mot de passe : ${password}`,
          `⚙️ Activez l'accès IMAP dans Gmail`,
          `🔐 Créez un mot de passe d'application`,
          `✅ Testez la connexion depuis le CRM`,
          `💡 Note: Google Workspace coûte ~€13.60/mois par utilisateur`
        ];

      case 'zoho':
        return [
          `🌐 Allez sur https://www.zoho.com/mail/`,
          `📧 Créez un compte Zoho Mail Business`,
          `👤 Ajoutez un utilisateur : ${emailAddress}`,
          `🔑 Définissez le mot de passe : ${password}`,
          `⚙️ Configurez les paramètres IMAP/SMTP`,
          `✅ Testez la connexion depuis le CRM`,
          `💡 Note: Zoho Mail coûte ~$1/mois par utilisateur`
        ];

      default:
        return [
          `📧 Configurez votre serveur email personnalisé`,
          `👤 Créez l'utilisateur : ${emailAddress}`,
          `🔑 Mot de passe suggéré : ${password}`,
          `⚙️ Configurez IMAP/SMTP selon votre provider`,
          `✅ Testez la connexion depuis le CRM`
        ];
    }
  }

  /**
   * Configuration serveur par provider
   */
  private static getProviderConfig(
    provider: 'yandex' | 'google' | 'zoho' | 'custom',
    domain: string
  ) {
    switch (provider) {
      case 'yandex':
        return {
          smtpServer: 'smtp.yandex.com',
          smtpPort: 465,
          imapServer: 'imap.yandex.com',
          imapPort: 993,
          security: 'SSL/TLS'
        };

      case 'google':
        return {
          smtpServer: 'smtp.gmail.com',
          smtpPort: 465,
          imapServer: 'imap.gmail.com',
          imapPort: 993,
          security: 'SSL/TLS'
        };

      case 'zoho':
        return {
          smtpServer: 'smtp.zoho.com',
          smtpPort: 465,
          imapServer: 'imap.zoho.com',
          imapPort: 993,
          security: 'SSL/TLS'
        };

      default:
        return {
          smtpServer: `smtp.${domain}`,
          smtpPort: 465,
          imapServer: `imap.${domain}`,
          imapPort: 993,
          security: 'SSL/TLS'
        };
    }
  }

  /**
   * Normalise le texte (supprime accents, espaces, etc.)
   */
  private static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
      .replace(/[^a-z0-9]/g, '') // Garde seulement lettres et chiffres
      .trim();
  }

  /**
   * Génère un mot de passe sécurisé
   */
  private static generateSecurePassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    const length = 12;
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return password;
  }

  /**
   * Valide un email
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Estime le coût mensuel par provider
   */
  static getMonthlyCost(provider: 'yandex' | 'google' | 'zoho' | 'custom'): string {
    switch (provider) {
      case 'yandex':
        return '~$1.38/mois par utilisateur';
      case 'google':
        return '~€13.60/mois par utilisateur';
      case 'zoho':
        return '~$1/mois par utilisateur';
      default:
        return 'Selon votre hébergeur';
    }
  }
}
