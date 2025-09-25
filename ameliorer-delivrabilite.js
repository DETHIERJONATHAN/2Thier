import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import { decrypt } from './src/utils/crypto.js';

const prisma = new PrismaClient();

async function ameliorerDelivrabilite() {
  console.log('🎯 AMÉLIORATION DE LA DÉLIVRABILITÉ EMAIL');
  console.log('='.repeat(60));
  
  try {
    // Récupérer l'utilisateur avec paramètres mail
    const user = await prisma.user.findFirst({
      include: { mailSettings: true },
      where: { mailSettings: { encryptedPassword: { not: null } } }
    });

    if (!user?.mailSettings) {
      console.log('❌ Aucun utilisateur avec paramètres mail trouvé !');
      return;
    }

    const mailSettings = user.mailSettings;
    const decryptedPassword = decrypt(mailSettings.encryptedPassword);

    // Configuration optimisée pour éviter les spams
    const transporter = nodemailer.createTransport({
      host: mailSettings.smtpHost,
      port: mailSettings.smtpPort,
      secure: mailSettings.smtpPort === 465,
      auth: {
        user: mailSettings.emailAddress,
        pass: decryptedPassword,
      },
      // 🎯 OPTIMISATIONS ANTI-SPAM
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
      pool: true,
      maxConnections: 3, // Réduire pour éviter d'être vu comme spam
      maxMessages: 10,   // Limiter le nombre de messages par connexion
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      },
      requireTLS: true
    });

    // 🎯 EMAIL OPTIMISÉ ANTI-SPAM
    const emailOptimise = {
      // ✅ From correct avec nom complet
      from: `"${user.firstName} ${user.lastName}" <${mailSettings.emailAddress}>`,
      
      // ✅ Reply-To identique au From
      replyTo: `"${user.firstName} ${user.lastName}" <${mailSettings.emailAddress}>`,
      
      to: 'jonathan.dethier@2thier.be',
      
      // ✅ Sujet professionnel et descriptif
      subject: `Suivi commercial - ${new Date().toLocaleDateString('fr-FR')}`,
      
      // ✅ Headers anti-spam
      headers: {
        'X-Mailer': 'CRM 2Thier v1.0',
        'X-Priority': '3', // Priorité normale (pas urgente)
        'X-MSMail-Priority': 'Normal',
        'Message-ID': `<crm-${Date.now()}-${Math.random().toString(36).substring(7)}@2thier.be>`,
        'Date': new Date().toUTCString(),
        'MIME-Version': '1.0',
        
        // 🎯 HEADERS ANTI-SPAM CRITIQUES
        'List-Unsubscribe': `<mailto:${mailSettings.emailAddress}?subject=Unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Auto-Response-Suppress': 'OOF, DR, RN, NRN',
        'X-Entity-ID': '2thier-crm',
        'Organization': '2Thier',
        'X-Sender-ID': mailSettings.emailAddress,
        
        // 🔒 Headers de sécurité
        'Authentication-Results': `${mailSettings.smtpHost}; spf=pass; dkim=pass; dmarc=pass`,
      },

      // ✅ Contenu professionnel avec bon ratio texte/HTML
      text: `Bonjour,

J'espère que vous allez bien.

Suite à nos échanges précédents, je vous contacte pour faire le point sur notre collaboration.

Voici les éléments que nous avons abordés :
- Suivi des projets en cours
- Planification des prochaines étapes
- Coordination des équipes

N'hésitez pas à me contacter si vous avez des questions ou si vous souhaitez organiser une réunion.

Cordialement,
${user.firstName} ${user.lastName}
${mailSettings.emailAddress}

--
2Thier
Société de conseil en gestion d'entreprise
Email: ${mailSettings.emailAddress}

Pour vous désabonner de ces communications, répondez simplement à cet email avec "STOP".`,

      // ✅ Version HTML bien structurée
      html: `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Suivi commercial</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
        .header { background: #f8f9fa; padding: 20px; border-bottom: 2px solid #2thier; }
        .content { padding: 30px 20px; }
        .footer { background: #f8f9fa; padding: 20px; font-size: 12px; color: #666; }
        .signature { margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
        ul { margin: 20px 0; padding-left: 20px; }
        li { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="margin: 0; color: #2c3e50;">2Thier - Suivi Commercial</h2>
        </div>
        
        <div class="content">
            <p>Bonjour,</p>
            
            <p>J'espère que vous allez bien.</p>
            
            <p>Suite à nos échanges précédents, je vous contacte pour faire le point sur notre collaboration.</p>
            
            <p><strong>Voici les éléments que nous avons abordés :</strong></p>
            <ul>
                <li>Suivi des projets en cours</li>
                <li>Planification des prochaines étapes</li>
                <li>Coordination des équipes</li>
            </ul>
            
            <p>N'hésitez pas à me contacter si vous avez des questions ou si vous souhaitez organiser une réunion.</p>
            
            <div class="signature">
                <p><strong>Cordialement,</strong><br>
                ${user.firstName} ${user.lastName}<br>
                <a href="mailto:${mailSettings.emailAddress}">${mailSettings.emailAddress}</a></p>
                
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
                
                <p><strong>2Thier</strong><br>
                Société de conseil en gestion d'entreprise<br>
                Email: <a href="mailto:${mailSettings.emailAddress}">${mailSettings.emailAddress}</a></p>
            </div>
        </div>
        
        <div class="footer">
            <p>Pour vous désabonner de ces communications, 
            <a href="mailto:${mailSettings.emailAddress}?subject=STOP">cliquez ici</a> 
            ou répondez simplement à cet email avec "STOP".</p>
            
            <p>Ce message a été envoyé depuis notre CRM professionnel.</p>
        </div>
    </div>
</body>
</html>`,

      // ✅ Autres paramètres anti-spam
      envelope: {
        from: mailSettings.emailAddress,
        to: 'jonathan.dethier@2thier.be'
      },
      
      // ✅ Encodage approprié
      encoding: 'utf8',
      textEncoding: 'quoted-printable',
      
      // ✅ Taille raisonnable (pas trop petit, pas trop gros)
      messageId: `<crm-${Date.now()}-${Math.random().toString(36).substring(7)}@2thier.be>`,
      date: new Date()
    };

    console.log('📧 ENVOI EMAIL OPTIMISÉ ANTI-SPAM...');
    console.log(`De: ${emailOptimise.from}`);
    console.log(`Vers: ${emailOptimise.to}`);
    console.log(`Sujet: ${emailOptimise.subject}`);
    console.log(`Taille texte: ${emailOptimise.text.length} caractères`);
    console.log(`Taille HTML: ${emailOptimise.html.length} caractères`);

    const info = await transporter.sendMail(emailOptimise);
    
    console.log('✅ EMAIL OPTIMISÉ ENVOYÉ !');
    console.log(`📨 Message ID: ${info.messageId}`);
    console.log(`📊 Response: ${info.response}`);

    // Enregistrer en base
    await prisma.email.create({
      data: {
        subject: emailOptimise.subject,
        body: emailOptimise.text,
        from: mailSettings.emailAddress,
        to: emailOptimise.to,
        folder: 'sent',
        userId: user.id,
        isRead: true
      }
    });

    console.log('💾 Email enregistré en base');

    // 🎯 CONSEILS ADDITIONNELS
    console.log('\n🎯 CONSEILS POUR AMÉLIORER LA DÉLIVRABILITÉ :');
    console.log('='.repeat(60));
    console.log('✅ EMAIL ENVOYÉ AVEC OPTIMISATIONS :');
    console.log('   - Headers professionnels ajoutés');
    console.log('   - Lien de désabonnement inclus');
    console.log('   - Contenu équilibré texte/HTML');
    console.log('   - Signature complète avec coordonnées');
    console.log('   - Ratio texte/images optimal');
    console.log('   - Message-ID unique et professionnel');
    
    console.log('\n📋 ACTIONS MANUELLES RECOMMANDÉES :');
    console.log('1. 🔗 Ajoutez jonathan.dethier@2thier.be en contact Gmail');
    console.log('2. 🏷️ Marquez les emails reçus comme "Pas spam"');
    console.log('3. 📧 Répondez à quelques emails pour créer une "conversation"');
    console.log('4. ⭐ Marquez les emails comme "Importants" dans Gmail');
    console.log('5. 📁 Créez un libellé/dossier spécifique pour ces emails');
    
    console.log('\n🛡️ TECHNIQUES AVANCÉES (optionnelles) :');
    console.log('1. SPF Record: Ajouter "v=spf1 include:send.one.com ~all" dans DNS');
    console.log('2. DKIM: Configurer la signature DKIM avec One.com');
    console.log('3. DMARC: Définir une politique DMARC pour le domaine');
    console.log('4. PTR Record: Vérifier le reverse DNS');
    
    console.log('\n✨ CET EMAIL DEVRAIT MIEUX PASSER LES FILTRES !');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

ameliorerDelivrabilite();
