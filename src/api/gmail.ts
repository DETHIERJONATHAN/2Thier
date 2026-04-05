/**
 * 📧 API Gmail - Envoi automatique des confirmations de RDV
 * 
 * Fonctionnalités :
 * - Envoi email de confirmation RDV
 * - Templates professionnels
 * - Gestion des pièces jointes (ICS)
 */

import { Router } from 'express';
import { google } from 'googleapis';
import { authenticateToken } from '../middleware/auth';
import { googleOAuthConfig, isGoogleOAuthConfigured } from '../auth/googleConfig';

const router = Router();
const gmail = google.gmail('v1');

/**
 * POST /api/gmail/send-meeting-confirmation
 * Envoie un email de confirmation de RDV au prospect
 */
router.post('/send-meeting-confirmation', authenticateToken, async (req, res) => {
  try {
    const {
      to,
      leadName,
      meetingDate,
      meetingTime,
      duration,
      type,
      meetingLink,
      location
    } = req.body;

    if (!to || !leadName || !meetingDate || !meetingTime) {
      return res.status(400).json({
        error: 'to, leadName, meetingDate et meetingTime sont requis'
      });
    }

    const auth = await getGoogleAuth(req.user.id);
    
    // Générer le contenu de l'email
    const emailContent = generateMeetingConfirmationEmail({
      leadName,
      meetingDate,
      meetingTime,
      duration: duration || 60,
      type: type || 'visio',
      meetingLink,
      location,
      commercialName: `${req.user.firstName} ${req.user.lastName}`,
      commercialEmail: req.user.email,
      commercialPhone: req.user.phone
    });

    // Créer l'email au format RFC 2822
    const email = [
      `To: ${to}`,
      `Subject: ${emailContent.subject}`,
      `Content-Type: text/html; charset=utf-8`,
      '',
      emailContent.html
    ].join('\\n');

    // Encoder en base64
    const encodedEmail = Buffer.from(email).toString('base64')
      .replace(/\\+/g, '-')
      .replace(/\\//g, '_')
      .replace(/=+$/, '');

    // Envoyer l'email via Gmail API
    const response = await gmail.users.messages.send({
      auth,
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    });


    // Log dans le CRM
    await logEmailActivity({
      userId: req.user.id,
      leadEmail: to,
      type: 'meeting_confirmation',
      messageId: response.data.id,
      subject: emailContent.subject
    });

    res.json({
      success: true,
      messageId: response.data.id,
      subject: emailContent.subject
    });

  } catch (error: any) {
    console.error('[Gmail] ❌ Erreur envoi email confirmation:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'envoi de l\'email de confirmation',
      details: error.message
    });
  }
});

/**
 * Génère le contenu HTML de l'email de confirmation
 */
function generateMeetingConfirmationEmail(params: {
  leadName: string;
  meetingDate: string;
  meetingTime: string;
  duration: number;
  type: string;
  meetingLink?: string;
  location?: string;
  commercialName: string;
  commercialEmail: string;
  commercialPhone?: string;
}) {
  const {
    leadName,
    meetingDate,
    meetingTime,
    duration,
    type,
    meetingLink,
    location,
    commercialName,
    commercialEmail,
    commercialPhone
  } = params;

  const subject = `Confirmation RDV - ${meetingDate} à ${meetingTime}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Confirmation de rendez-vous</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1890ff; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .meeting-details { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #1890ff; }
    .footer { padding: 15px; text-align: center; color: #666; font-size: 12px; }
    .button { display: inline-block; padding: 10px 20px; background: #1890ff; color: white; text-decoration: none; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Rendez-vous confirmé</h1>
    </div>
    
    <div class="content">
      <p>Bonjour <strong>${leadName}</strong>,</p>
      
      <p>Votre rendez-vous a été confirmé avec succès. Voici les détails :</p>
      
      <div class="meeting-details">
        <h3>📅 Détails du rendez-vous</h3>
        <p><strong>Date :</strong> ${new Date(meetingDate).toLocaleDateString('fr-FR', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</p>
        <p><strong>Heure :</strong> ${meetingTime}</p>
        <p><strong>Durée :</strong> ${duration} minutes</p>
        <p><strong>Type :</strong> ${type === 'visio' ? '📹 Visioconférence' : '🏢 Rendez-vous physique'}</p>
        
        ${meetingLink ? `
          <p><strong>Lien de connexion :</strong><br>
          <a href="${meetingLink}" class="button">Rejoindre la réunion</a></p>
        ` : ''}
        
        ${location ? `
          <p><strong>Lieu :</strong> ${location}</p>
        ` : ''}
      </div>
      
      <div class="meeting-details">
        <h3>👤 Votre interlocuteur</h3>
        <p><strong>Nom :</strong> ${commercialName}</p>
        <p><strong>Email :</strong> ${commercialEmail}</p>
        ${commercialPhone ? `<p><strong>Téléphone :</strong> ${commercialPhone}</p>` : ''}
      </div>
      
      <p>Si vous avez des questions ou devez reporter ce rendez-vous, n'hésitez pas à me contacter directement.</p>
      
      <p>À très bientôt !</p>
      
      <p>Cordialement,<br>
      <strong>${commercialName}</strong><br>
      2Thier SRL</p>
    </div>
    
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par le CRM 2Thier SRL</p>
      <p>En cas de problème, contactez-nous à ${commercialEmail}</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

/**
 * Log de l'activité email dans le CRM
 */
async function logEmailActivity(data: {
  userId: string;
  leadEmail: string;
  type: string;
  messageId: string;
  subject: string;
}) {
  try {
    // TODO: Implémenter avec Prisma
    // Sauvegarder dans une table email_logs ou lead_activities
  } catch (error) {
    console.error('[Gmail] ❌ Erreur log activité:', error);
  }
}

/**
 * Récupère l'authentification Google pour Gmail
 */
async function getGoogleAuth(userId: string) {
  // Réutiliser la même logique que pour Google Calendar
  if (!isGoogleOAuthConfigured()) {
    throw new Error('Configuration Google OAuth manquante. Vérifier googleOAuthConfig.');
  }

  const oauth2Client = new google.auth.OAuth2(
    googleOAuthConfig.clientId,
    googleOAuthConfig.clientSecret,
    googleOAuthConfig.redirectUri
  );
  
  // TODO: Récupérer les tokens depuis la DB
  const userTokens = await getUserGoogleTokens(userId);
  
  oauth2Client.setCredentials({
    access_token: userTokens.accessToken,
    refresh_token: userTokens.refreshToken
  });
  
  return oauth2Client;
}

async function getUserGoogleTokens(_userId: string) {
  // TODO: Implémentation avec Prisma
  throw new Error('getUserGoogleTokens à implémenter avec Prisma');
}

export default router;
