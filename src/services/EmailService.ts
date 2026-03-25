import { GoogleGmailService } from '../google-auth/services/GoogleGmailService';
import nodemailer from 'nodemailer';
import { randomUUID } from 'crypto';

interface InvitationEmailPayload {
    to: string;
    token: string;
    isExistingUser: boolean;
    organizationName: string;
    roleName: string;
    inviterId?: string;
    organizationId?: string;
}

interface SendEmailPayload {
    to: string;
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
    inviterId?: string;
    organizationId?: string;
}

class EmailService {

    /**
     * Convertit du HTML en texte brut (fallback anti-spam)
     */
    private htmlToPlainText(html: string): string {
        return html
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<\/h[1-6]>/gi, '\n\n')
            .replace(/<\/li>/gi, '\n')
            .replace(/<\/tr>/gi, '\n')
            .replace(/<hr[^>]*>/gi, '\n---\n')
            .replace(/<a[^>]+href="([^"]+)"[^>]*>([^<]*)<\/a>/gi, '$2 ($1)')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&quot;/gi, '"')
            .replace(/&#39;/gi, "'")
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    /**
     * Enveloppe le contenu HTML dans une structure email conforme (DOCTYPE, charset)
     */
    private wrapHtmlEmail(content: string): string {
        return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Zhiive</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa;">
${content}
</body>
</html>`;
    }

    /**
     * Construit le contenu HTML de l'email d'invitation
     */
    private buildInvitationContent(payload: InvitationEmailPayload): { subject: string; body: string } {
        const { to, token, isExistingUser, organizationName, roleName } = payload;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const acceptUrl = `${frontendUrl}/accept-invitation?token=${token}`;

        if (isExistingUser) {
            return {
                subject: `Vous êtes invité(e) à rejoindre ${organizationName}`,
                body: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1a365d;">Invitation à rejoindre ${organizationName}</h2>
                        <p>Bonjour,</p>
                        <p>Vous avez été invité(e) à rejoindre l'organisation <strong>"${organizationName}"</strong> avec le rôle <strong>"${roleName}"</strong>.</p>
                        <p>Comme vous avez déjà un compte, il vous suffit de cliquer sur le bouton ci-dessous pour accepter l'invitation :</p>
                        <p style="text-align: center; margin: 30px 0;">
                            <a href="${acceptUrl}" style="background-color: #2d5a7b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accepter l'invitation</a>
                        </p>
                        <p style="color: #666; font-size: 12px;">Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="color: #999; font-size: 11px;">2Thier CRM</p>
                    </div>
                `,
            };
        }

        return {
            subject: `Invitation à rejoindre ${organizationName}`,
            body: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1a365d;">Bienvenue chez ${organizationName} !</h2>
                    <p>Bonjour,</p>
                    <p>Vous avez été invité(e) à rejoindre l'organisation <strong>"${organizationName}"</strong> avec le rôle <strong>"${roleName}"</strong>.</p>
                    <p>Pour finaliser votre inscription et rejoindre l'équipe, veuillez cliquer sur le bouton ci-dessous :</p>
                    <p style="text-align: center; margin: 30px 0;">
                        <a href="${acceptUrl}" style="background-color: #2d5a7b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Créer votre compte et accepter</a>
                    </p>
                    <p style="color: #666; font-size: 12px;">Ce lien est valide pendant 7 jours.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #999; font-size: 11px;">2Thier CRM</p>
                </div>
            `,
        };
    }

    /**
     * Tente d'envoyer via Gmail API (si l'utilisateur a un token Google valide)
     */
    private async sendViaGmail(organizationId: string, userId: string, to: string, subject: string, htmlBody: string): Promise<boolean> {
        try {
            const gmailService = await GoogleGmailService.create(organizationId, userId);
            if (!gmailService) {
                console.log('[EmailService] ⚠️ Pas de service Gmail disponible pour cet utilisateur');
                return false;
            }

            const result = await gmailService.sendEmail({
                to,
                subject,
                body: htmlBody,
                isHtml: true,
            });

            if (result) {
                console.log(`[EmailService] ✅ Email envoyé via Gmail API (messageId: ${result.messageId})`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('[EmailService] ❌ Erreur Gmail API:', error);
            return false;
        }
    }

    /**
     * Fallback: envoie via Nodemailer SMTP (noreply@2thier.be ou config SMTP)
     */
    private async sendViaSMTP(to: string, subject: string, htmlBody: string, plainText?: string): Promise<boolean> {
        const smtpHost = process.env.SMTP_HOST;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;

        if (!smtpHost || !smtpUser || !smtpPass) {
            console.warn('[EmailService] ⚠️ SMTP non configuré (SMTP_HOST, SMTP_USER, SMTP_PASS manquants)');
            return false;
        }

        const fromAddress = process.env.SMTP_FROM || smtpUser;
        const fromDomain = fromAddress.split('@')[1] || 'zhiive.com';

        try {
            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: parseInt(process.env.SMTP_PORT || '465'),
                secure: (process.env.SMTP_PORT || '465') === '465',
                auth: { user: smtpUser, pass: smtpPass },
            });

            const wrappedHtml = this.wrapHtmlEmail(htmlBody);
            const text = plainText || this.htmlToPlainText(htmlBody);

            await transporter.sendMail({
                from: `"Zhiive" <${fromAddress}>`,
                replyTo: `"Zhiive" <${fromAddress}>`,
                to,
                subject,
                html: wrappedHtml,
                text,
                headers: {
                    'X-Mailer': 'Zhiive Mailer',
                    'List-Unsubscribe': `<mailto:${fromAddress}?subject=unsubscribe>`,
                    'Message-ID': `<${randomUUID()}@${fromDomain}>`,
                    'Precedence': 'bulk',
                },
            });

            console.log(`[EmailService] ✅ Email envoyé via SMTP (${smtpHost})`);
            return true;
        } catch (error) {
            console.error('[EmailService] ❌ Erreur SMTP:', error);
            return false;
        }
    }

    /**
     * Envoie un e-mail d'invitation.
     * Stratégie : Gmail API > SMTP > Log console (fallback final)
     */
    async sendInvitationEmail(payload: InvitationEmailPayload): Promise<void> {
        const { subject, body } = this.buildInvitationContent(payload);
        const { to, inviterId, organizationId } = payload;

        console.log(`[EmailService] 📧 Envoi invitation à ${to} (inviterId: ${inviterId || 'N/A'}, orgId: ${organizationId || 'N/A'})`);

        // 1. Tenter Gmail API (si l'utilisateur qui invite a un token Google)
        if (inviterId && organizationId) {
            const sentViaGmail = await this.sendViaGmail(organizationId, inviterId, to, subject, body);
            if (sentViaGmail) return;
        }

        // 2. Fallback SMTP
        const sentViaSMTP = await this.sendViaSMTP(to, subject, body);
        if (sentViaSMTP) return;

        // 3. Fallback final : log console (dev uniquement)
        console.warn('[EmailService] ⚠️ Aucun transport email disponible — affichage console uniquement');
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const acceptUrl = `${frontendUrl}/accept-invitation?token=${payload.token}`;
        console.log('--- EMAIL NON ENVOYÉ (aucun transport) ---');
        console.log(`À: ${to}`);
        console.log(`Sujet: ${subject}`);
        console.log(`URL d'acceptation: ${acceptUrl}`);
        console.log('-------------------------------------------');
    }

    /**
     * Envoie un e-mail générique.
     * Stratégie : Gmail API > SMTP > Throw (pour que l'appelant sache)
     */
    async sendEmail(payload: SendEmailPayload): Promise<void> {
        const { to, subject, html, text, inviterId, organizationId } = payload;

        // 1. Gmail API
        if (inviterId && organizationId) {
            const sent = await this.sendViaGmail(organizationId, inviterId, to, subject, html);
            if (sent) return;
        }

        // 2. SMTP
        const sent = await this.sendViaSMTP(to, subject, html, text);
        if (sent) return;

        // 3. Aucun transport — throw pour que l'appelant sache
        console.error(`[EmailService] ❌ Aucun transport disponible pour envoyer à ${to}`);
        throw new Error('Aucun transport email disponible (ni Gmail API, ni SMTP)');
    }
}

export const emailService = new EmailService();
