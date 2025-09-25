interface InvitationEmailPayload {
    to: string;
    token: string;
    isExistingUser: boolean;
    organizationName: string;
    roleName: string;
}

interface SendEmailPayload {
    to: string;
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
}

class EmailService {
    /**
     * Envoie un e-mail d'invitation.
     * Simule l'envoi en loggant les détails dans la console.
     */
    async sendInvitationEmail(payload: InvitationEmailPayload): Promise<void> {
        const { to, token, isExistingUser, organizationName, roleName } = payload;

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const acceptUrl = `${frontendUrl}/accept-invitation?token=${token}`;

        let subject = '';
        let body = '';

        if (isExistingUser) {
            subject = `Vous êtes invité(e) à rejoindre ${organizationName}`;
            body = `
                <p>Bonjour,</p>
                <p>Vous avez été invité(e) à rejoindre l'organisation "${organizationName}" avec le rôle "${roleName}".</p>
                <p>Comme vous avez déjà un compte, il vous suffit de cliquer sur le lien ci-dessous pour accepter l'invitation :</p>
                <p><a href="${acceptUrl}">Accepter l'invitation</a></p>
                <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.</p>
            `;
        } else {
            subject = `Invitation à rejoindre ${organizationName}`;
            body = `
                <p>Bonjour,</p>
                <p>Vous avez été invité(e) à rejoindre l'organisation "${organizationName}" avec le rôle "${roleName}".</p>
                <p>Pour finaliser votre inscription et rejoindre l'équipe, veuillez cliquer sur le lien ci-dessous :</p>
                <p><a href="${acceptUrl}">Créer votre compte et accepter l'invitation</a></p>
                <p>Ce lien est valide pendant 7 jours.</p>
            `;
        }

        console.log('--- SIMULATION D\'ENVOI D\'EMAIL ---');
        console.log(`À: ${to}`);
        console.log(`Sujet: ${subject}`);
        console.log(`URL d'acceptation: ${acceptUrl}`);
        console.log(`Corps (HTML): ${body.replace(/\s+/g, ' ').trim()}`);
        console.log('------------------------------------');
        
        // En production, vous intégreriez un vrai service d'envoi ici.
        return Promise.resolve();
    }

    /**
     * Envoie un e-mail générique (simulation console).
     */
    async sendEmail(payload: SendEmailPayload): Promise<void> {
        const { to, subject, html, text, replyTo } = payload;

        console.log('--- SIMULATION ENVOI EMAIL (générique) ---');
        console.log(`À: ${to}`);
        console.log(`Sujet: ${subject}`);
        if (replyTo) {
            console.log(`Répondre à: ${replyTo}`);
        }
        if (text) {
            console.log(`Corps (texte): ${text.replace(/\s+/g, ' ').trim()}`);
        }
        console.log(`Corps (HTML): ${html.replace(/\s+/g, ' ').trim()}`);
        console.log('------------------------------------------');

        return Promise.resolve();
    }
}

export const emailService = new EmailService();
