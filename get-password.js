import { PrismaClient } from '@prisma/client';
import { decrypt } from './src/utils/crypto.js';

const prisma = new PrismaClient();

async function getRealPassword() {
  try {
    console.log('🔐 Récupération du vrai mot de passe...');
    
    const settings = await prisma.userMailSettings.findFirst({
      where: { userId: 1 }
    });
    
    if (!settings) {
      console.log('❌ Aucune configuration trouvée');
      return;
    }
    
    console.log(`📧 Email: ${settings.emailAddress}`);
    console.log(`🏠 SMTP: ${settings.smtpHost}:${settings.smtpPort}`);
    console.log(`🔒 Mot de passe chiffré: ${settings.smtpPassword}`);
    
    const realPassword = decrypt(settings.smtpPassword);
    console.log(`🔓 Mot de passe déchiffré: "${realPassword}"`);
    
    return realPassword;
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getRealPassword();
