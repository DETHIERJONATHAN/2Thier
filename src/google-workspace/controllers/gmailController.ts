import { type Request, type Response } from 'express';
import { getGmailClient } from '../services/googleAuthService.ts';
import { google } from 'googleapis';

// Fonction pour récupérer les threads (conversations)
export const getThreads = async (req: Request, res: Response) => {
    // --- LOGS DE DÉBOGAGE ---
    console.log('--- [gmailController.getThreads] Début de l\'exécution ---');
    console.log('[gmailController] Contenu de req.user à l\'entrée:', JSON.stringify(req.user, null, 2));
    // --- FIN DES LOGS ---

    try {
        const user = (req.user as any);
        const organizationId = req.headers['x-organization-id'] as string;

        console.log('[Gmail Threads] userId depuis req.user:', user?.userId);
        console.log('[Gmail Threads] organizationId depuis header:', organizationId);

        if (!organizationId) {
            console.error('[gmailController] ERREUR CRITIQUE: organizationId est manquant dans les headers.');
            return res.status(400).json({ success: false, message: 'Organization ID manquant dans les headers.' });
        }

        const gmail = await getGmailClient(organizationId);
        if (!gmail) {
            return res.status(401).json({ success: false, message: 'Connexion à Gmail requise.' });
        }

        const mailbox = (req.query.mailbox as string) || 'inbox';
        const maxResults = parseInt(req.query.maxResults as string, 10) || 15;

        const response = await gmail.users.threads.list({
            userId: 'me',
            labelIds: [mailbox.toUpperCase()],
            maxResults: maxResults,
        });

        const threads = response.data.threads || [];
        if (threads.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const threadDetailsPromises = threads.map(async (thread) => {
            if (thread.id) {
                try {
                    const threadDetails = await gmail.users.threads.get({
                        userId: 'me',
                        id: thread.id,
                        format: 'full', // On demande le format complet
                    });
                    return threadDetails.data;
                } catch (error) {
                    console.error(`Impossible de récupérer le thread ${thread.id}:`, error);
                    return null;
                }
            }
            return null;
        });

        const fullThreads = (await Promise.all(threadDetailsPromises)).filter((t): t is NonNullable<typeof t> => t !== null);

        const formattedThreads = fullThreads.map(thread => {
            if (!thread || !thread.messages || thread.messages.length === 0) {
                return null;
            }
            const firstMessage = thread.messages[0];
            if (!firstMessage || !firstMessage.payload) return null;

            const headers = firstMessage.payload.headers || [];
            const getHeader = (name: string) => {
                const header = headers.find(h => h && h.name && h.name.toLowerCase() === name.toLowerCase());
                return header?.value || '';
            };

            const from = getHeader('From');
            const subject = getHeader('Subject');
            const date = getHeader('Date');

            return {
                id: thread.id,
                snippet: thread.snippet || '',
                subject: subject,
                from: from,
                to: getHeader('To'),
                timestamp: date ? new Date(date).toISOString() : new Date(parseInt(firstMessage.internalDate || '0')).toISOString(),
                unread: firstMessage.labelIds?.includes('UNREAD') || false,
                isStarred: firstMessage.labelIds?.includes('STARRED') || false,
                hasAttachments: firstMessage.payload.parts?.some(p => !!p.filename) || false,
                messages: thread.messages.map(msg => {
                    if (!msg || !msg.payload) return null;
                    const msgHeaders = msg.payload.headers || [];
                    const getMsgHeader = (name: string) => {
                        const header = msgHeaders.find(h => h && h.name && h.name.toLowerCase() === name.toLowerCase());
                        return header?.value || '';
                    };

                    let body = '';
                    const getBody = (payload: any): string => {
                        if (!payload) return '';
                        if (payload.mimeType === 'text/html' && payload.body?.data) {
                            return Buffer.from(payload.body.data, 'base64').toString('utf-8');
                        }
                        if (payload.mimeType === 'text/plain' && payload.body?.data) {
                            return Buffer.from(payload.body.data, 'base64').toString('utf-8').replace(/\n/g, '<br>');
                        }
                        if (payload.parts) {
                            const htmlPart = payload.parts.find((p: any) => p && p.mimeType === 'text/html');
                            if (htmlPart) return getBody(htmlPart);
                            const textPart = payload.parts.find((p: any) => p && p.mimeType === 'text/plain');
                            if (textPart) return getBody(textPart);
                        }
                        if (payload.body?.data) {
                             return Buffer.from(payload.body.data, 'base64').toString('utf-8');
                        }
                        return '';
                    };
                    
                    body = getBody(msg.payload);

                    const msgDate = getMsgHeader('Date');

                    return {
                        id: msg.id,
                        body: body,
                        from: getMsgHeader('From'),
                        to: getMsgHeader('To'),
                        subject: getMsgHeader('Subject'),
                        timestamp: msgDate ? new Date(msgDate).toISOString() : new Date(parseInt(msg.internalDate || '0')).toISOString(),
                        isRead: !msg.labelIds?.includes('UNREAD'),
                        headers: msgHeaders.reduce((acc, h) => {
                            if (h && h.name && h.value) acc[h.name] = h.value;
                            return acc;
                        }, {} as {[key: string]: string})
                    };
                }).filter((m): m is NonNullable<typeof m> => m !== null),
            };
        }).filter((t): t is NonNullable<typeof t> => t !== null);

        res.json({ success: true, data: formattedThreads });
    } catch (error) {
        console.error('Erreur lors de la récupération des threads Gmail:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

// Fonction pour récupérer la liste des messages
export const getMessages = async (req: Request, res: Response) => {
    console.log('--- [gmailController.getMessages] Début de l\'exécution ---');
    console.log('[gmailController] Contenu de req.user à l\'entrée:', JSON.stringify(req.user, null, 2));

    try {
        const userId = (req.user as any)?.userId;
        const organizationId = req.headers['x-organization-id'] as string;
        const mailbox = (req.query.mailbox as string) || 'inbox';

        console.log('[Gmail Messages] userId:', userId);
        console.log('[Gmail Messages] organizationId depuis header:', organizationId);

        if (!userId) {
            console.error('[gmailController] ERREUR CRITIQUE: userId est manquant dans req.user.');
            return res.status(401).json({ success: false, message: 'Utilisateur non identifié.' });
        }

        if (!organizationId) {
            console.error('[gmailController] ERREUR CRITIQUE: organizationId est manquant dans les headers.');
            return res.status(400).json({ success: false, message: 'Organization ID manquant dans les headers.' });
        }

        const gmail = await getGmailClient(organizationId);
        if (!gmail) {
            return res.status(401).json({ success: false, message: 'Connexion à Gmail requise.' });
        }

        const maxResults = parseInt(req.query.maxResults as string, 10) || 20;

        console.log(`[Gmail Messages] 📧 Requête Gmail API pour mailbox: ${mailbox}, maxResults: ${maxResults}`);

        // Mapper le mailbox vers les labels Gmail corrects
        let labelIds: string[] = [];
        switch (mailbox.toLowerCase()) {
            case 'inbox':
                labelIds = ['INBOX'];
                break;
            case 'sent':
                labelIds = ['SENT'];
                break;
            case 'draft':
                labelIds = ['DRAFT'];
                break;
            case 'starred':
                labelIds = ['STARRED'];
                break;
            case 'trash':
                labelIds = ['TRASH'];
                break;
            case 'spam':
                labelIds = ['SPAM'];
                break;
            default:
                labelIds = [mailbox.toUpperCase()];
        }

        // Récupérer la liste des messages
        const response = await gmail.users.messages.list({
            userId: 'me',
            labelIds: labelIds,
            maxResults: maxResults,
        });

        console.log(`[Gmail Messages] ✅ Réponse Gmail API reçue: ${response.data.messages?.length || 0} messages`);

        const messages = response.data.messages || [];
        if (messages.length === 0) {
            console.log('[Gmail Messages] 📭 Aucun message trouvé');
            return res.json({ success: true, data: [] });
        }

        console.log(`[Gmail Messages] 🔄 Récupération des détails pour ${messages.length} messages...`);

        // Récupérer les détails de chaque message
        const messageDetailsPromises = messages.map(async (message) => {
            if (message.id) {
                try {
                    console.log(`[Gmail Messages] 📖 Récupération détails message: ${message.id}`);
                    const messageDetails = await gmail.users.messages.get({
                        userId: 'me',
                        id: message.id,
                        format: 'full'  // Changé de 'metadata' à 'full' pour avoir le contenu HTML
                    });
                    console.log(`[Gmail Messages] ✅ Détails message ${message.id} récupérés`);
                    return messageDetails.data;
                } catch (error) {
                    console.error(`Impossible de récupérer le message ${message.id}:`, error);
                    return null;
                }
            }
            return null;
        });

        console.log(`[Gmail Messages] 🔄 Attente de tous les détails de messages...`);
        const fullMessages = (await Promise.all(messageDetailsPromises)).filter((m): m is NonNullable<typeof m> => m !== null);

        console.log(`[Gmail Messages] 📝 Formatage de ${fullMessages.length} messages...`);
        const formattedMessages = fullMessages.map(message => {
            if (!message || !message.payload) return null;

            const headers = message.payload.headers || [];
            const getHeader = (name: string) => {
                const header = headers.find(h => h && h.name && h.name.toLowerCase() === name.toLowerCase());
                return header?.value || '';
            };

            // Extraire le contenu HTML du body (même logique que getThreads)
            let body = '';
            const getBody = (payload: any): string => {
                // Si on a directement du HTML
                if (payload.mimeType === 'text/html' && payload.body?.data) {
                    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
                }
                // Si on a du texte plain
                if (payload.mimeType === 'text/plain' && payload.body?.data) {
                    return Buffer.from(payload.body.data, 'base64').toString('utf-8').replace(/\n/g, '<br>');
                }
                // Si on a des parties multiples
                if (payload.parts && Array.isArray(payload.parts)) {
                    // Chercher récursivement dans toutes les parties
                    for (const part of payload.parts) {
                        // Chercher d'abord du HTML
                        if (part.mimeType === 'text/html' && part.body?.data) {
                            return Buffer.from(part.body.data, 'base64').toString('utf-8');
                        }
                        // Si cette partie a des sous-parties, chercher récursivement
                        if (part.parts && Array.isArray(part.parts)) {
                            const subResult = getBody(part);
                            if (subResult) return subResult;
                        }
                    }
                    // Si pas de HTML trouvé, chercher du texte plain
                    for (const part of payload.parts) {
                        if (part.mimeType === 'text/plain' && part.body?.data) {
                            return Buffer.from(part.body.data, 'base64').toString('utf-8').replace(/\n/g, '<br>');
                        }
                        // Chercher récursivement dans les sous-parties
                        if (part.parts && Array.isArray(part.parts)) {
                            const subResult = getBody(part);
                            if (subResult) return subResult;
                        }
                    }
                }
                // Fallback: contenu direct
                if (payload.body?.data) {
                     return Buffer.from(payload.body.data, 'base64').toString('utf-8');
                }
                return '';
            };

            body = getBody(message.payload);

            return {
                id: message.id,
                snippet: message.snippet || '',
                subject: getHeader('Subject'),
                from: getHeader('From'),
                to: getHeader('To'),
                timestamp: new Date(parseInt(message.internalDate || '0')).toISOString(),
                isRead: !message.labelIds?.includes('UNREAD'),
                isStarred: message.labelIds?.includes('STARRED') || false,
                hasAttachments: message.payload.parts?.some((p: any) => !!p.filename) || false,
                labels: message.labelIds || [],
                body: body,  // Ajouter le contenu HTML
                date: new Date(parseInt(message.internalDate || '0')).toISOString()  // Ajouter la date aussi
            };
        }).filter((m): m is NonNullable<typeof m> => m !== null);

        console.log(`[Gmail Messages] ✅ Réponse finale envoyée: ${formattedMessages.length} messages formatés`);
        res.json({ success: true, data: formattedMessages });
    } catch (error) {
        console.error('Erreur lors de la récupération des messages Gmail:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

// Fonction pour récupérer un message spécifique
export const getMessage = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.userId;
        const organizationId = req.headers['x-organization-id'] as string;

        console.log('[Gmail getMessage] userId:', userId);
        console.log('[Gmail getMessage] organizationId depuis header:', organizationId);

        if (!organizationId) {
            console.error('[gmailController] ERREUR CRITIQUE: organizationId est manquant dans les headers.');
            return res.status(400).json({ success: false, message: 'Organization ID manquant dans les headers.' });
        }

        const gmail = await getGmailClient(organizationId);
        if (!gmail) {
            return res.status(401).json({ success: false, message: 'Connexion à Gmail requise.' });
        }

        const messageId = req.params.id;
        const response = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'full',
        });

        res.json({ success: true, data: response.data });
    } catch (error) {
        console.error('Erreur lors de la récupération du message Gmail:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

// Fonction pour envoyer un message
export const sendMessage = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.userId;
        const organizationId = req.headers['x-organization-id'] as string;

        console.log('[Gmail sendMessage] userId:', userId);
        console.log('[Gmail sendMessage] organizationId depuis header:', organizationId);

        if (!organizationId) {
            console.error('[gmailController] ERREUR CRITIQUE: organizationId est manquant dans les headers.');
            return res.status(400).json({ success: false, message: 'Organization ID manquant dans les headers.' });
        }

        const gmail = await getGmailClient(organizationId);
        if (!gmail) {
            return res.status(401).json({ success: false, message: 'Connexion à Gmail requise.' });
        }

        const { to, subject, body } = req.body;
        const rawMessage = [
            `From: "me"`,
            `To: ${to}`,
            `Subject: ${subject}`,
            `Content-Type: text/html; charset=utf-8`,
            ``,
            `${body}`,
        ].join('\n');

        const encodedMessage = Buffer.from(rawMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        const response = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage,
            },
        });

        res.json({ success: true, data: response.data });
    } catch (error) {
        console.error('Erreur lors de l\'envoi du message Gmail:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

// Fonction pour récupérer les libellés
export const getLabels = async (req: Request, res: Response) => {
    console.log('🏷️ [GMAIL CONTROLLER] getLabels appelé !');
    console.log('🏷️ [GMAIL CONTROLLER] req.user:', req.user);
    
    try {
        const userId = (req.user as any)?.userId;
        const organizationId = req.headers['x-organization-id'] as string;
        
        console.log('🏷️ [GMAIL CONTROLLER] userId extrait:', userId);
        console.log('🏷️ [GMAIL CONTROLLER] organizationId depuis header:', organizationId);

        if (!organizationId) {
            console.error('🏷️ [GMAIL CONTROLLER] ERREUR CRITIQUE: organizationId est manquant dans les headers.');
            return res.status(400).json({ success: false, message: 'Organization ID manquant dans les headers.' });
        }
        
        const gmail = await getGmailClient(organizationId);
        if (!gmail) {
            console.log('🏷️ [GMAIL CONTROLLER] Pas de client Gmail disponible');
            return res.status(401).json({ success: false, message: 'Connexion à Gmail requise.' });
        }

        console.log('🏷️ [GMAIL CONTROLLER] Client Gmail obtenu, appel API...');
        const response = await gmail.users.labels.list({
            userId: 'me',
        });

        console.log('🏷️ [GMAIL CONTROLLER] Réponse API Gmail reçue');
        res.json({ success: true, data: response.data.labels });
    } catch (error) {
        console.error('🏷️ [GMAIL CONTROLLER] Erreur lors de la récupération des libellés Gmail:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

// Fonction pour créer un nouveau libellé
export const createLabel = async (req: Request, res: Response) => {
    console.log('🏷️ [GMAIL CONTROLLER] createLabel appelé !');
    
    try {
        const { name } = req.body;
        const organizationId = req.headers['x-organization-id'] as string;
        
        console.log('🏷️ [GMAIL CONTROLLER] Nom du label à créer:', name);
        console.log('🏷️ [GMAIL CONTROLLER] organizationId:', organizationId);

        if (!organizationId) {
            console.error('🏷️ [GMAIL CONTROLLER] ERREUR: organizationId manquant');
            return res.status(400).json({ success: false, message: 'Organization ID manquant dans les headers.' });
        }

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ success: false, message: 'Le nom du libellé est requis.' });
        }
        
        const gmail = await getGmailClient(organizationId);
        if (!gmail) {
            console.log('🏷️ [GMAIL CONTROLLER] Pas de client Gmail disponible');
            return res.status(401).json({ success: false, message: 'Connexion à Gmail requise.' });
        }

        console.log('🏷️ [GMAIL CONTROLLER] Client Gmail obtenu, création du label...');
        const response = await gmail.users.labels.create({
            userId: 'me',
            requestBody: {
                name: name.trim(),
                labelListVisibility: 'labelShow',
                messageListVisibility: 'show'
            }
        });

        console.log('🏷️ [GMAIL CONTROLLER] Label créé avec succès:', response.data);
        res.json({ success: true, data: response.data });
    } catch (error) {
        console.error('🏷️ [GMAIL CONTROLLER] Erreur lors de la création du libellé:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la création du libellé.' });
    }
};

// Fonction pour modifier un libellé existant
export const updateLabel = async (req: Request, res: Response) => {
    console.log('🏷️ [GMAIL CONTROLLER] updateLabel appelé !');
    
    try {
        const { id } = req.params;
        const { name } = req.body;
        const organizationId = req.headers['x-organization-id'] as string;
        
        console.log('🏷️ [GMAIL CONTROLLER] ID du label à modifier:', id);
        console.log('🏷️ [GMAIL CONTROLLER] Nouveau nom:', name);
        console.log('🏷️ [GMAIL CONTROLLER] organizationId:', organizationId);

        if (!organizationId) {
            console.error('🏷️ [GMAIL CONTROLLER] ERREUR: organizationId manquant');
            return res.status(400).json({ success: false, message: 'Organization ID manquant dans les headers.' });
        }

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ success: false, message: 'Le nouveau nom du libellé est requis.' });
        }
        
        const gmail = await getGmailClient(organizationId);
        if (!gmail) {
            console.log('🏷️ [GMAIL CONTROLLER] Pas de client Gmail disponible');
            return res.status(401).json({ success: false, message: 'Connexion à Gmail requise.' });
        }

        console.log('🏷️ [GMAIL CONTROLLER] Client Gmail obtenu, modification du label...');
        const response = await gmail.users.labels.update({
            userId: 'me',
            id: id,
            requestBody: {
                name: name.trim(),
                labelListVisibility: 'labelShow',
                messageListVisibility: 'show'
            }
        });

        console.log('🏷️ [GMAIL CONTROLLER] Label modifié avec succès:', response.data);
        res.json({ success: true, data: response.data });
    } catch (error) {
        console.error('🏷️ [GMAIL CONTROLLER] Erreur lors de la modification du libellé:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la modification du libellé.' });
    }
};

// Fonction pour supprimer un libellé
export const deleteLabel = async (req: Request, res: Response) => {
    console.log('🏷️ [GMAIL CONTROLLER] deleteLabel appelé !');
    
    try {
        const { id } = req.params;
        const organizationId = req.headers['x-organization-id'] as string;
        
        console.log('🏷️ [GMAIL CONTROLLER] ID du label à supprimer:', id);
        console.log('🏷️ [GMAIL CONTROLLER] organizationId:', organizationId);

        if (!organizationId) {
            console.error('🏷️ [GMAIL CONTROLLER] ERREUR: organizationId manquant');
            return res.status(400).json({ success: false, message: 'Organization ID manquant dans les headers.' });
        }
        
        const gmail = await getGmailClient(organizationId);
        if (!gmail) {
            console.log('🏷️ [GMAIL CONTROLLER] Pas de client Gmail disponible');
            return res.status(401).json({ success: false, message: 'Connexion à Gmail requise.' });
        }

        console.log('🏷️ [GMAIL CONTROLLER] Client Gmail obtenu, suppression du label...');
        await gmail.users.labels.delete({
            userId: 'me',
            id: id
        });

        console.log('🏷️ [GMAIL CONTROLLER] Label supprimé avec succès');
        res.json({ success: true, message: 'Label supprimé avec succès' });
    } catch (error) {
        console.error('🏷️ [GMAIL CONTROLLER] Erreur lors de la suppression du libellé:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la suppression du libellé.' });
    }
};

// Fonction pour télécharger une pièce jointe
export const getAttachment = async (req: Request, res: Response) => {
    console.log('📎 [GMAIL CONTROLLER] getAttachment appelé !');
    
    try {
        const { messageId, attachmentId } = req.params;
        const organizationId = req.headers['x-organization-id'] as string;
        
        console.log('📎 [GMAIL CONTROLLER] messageId:', messageId);
        console.log('📎 [GMAIL CONTROLLER] attachmentId:', attachmentId);
        console.log('📎 [GMAIL CONTROLLER] organizationId:', organizationId);

        if (!organizationId) {
            console.error('📎 [GMAIL CONTROLLER] ERREUR: organizationId manquant');
            return res.status(400).json({ success: false, message: 'Organization ID manquant dans les headers.' });
        }
        
        const gmail = await getGmailClient(organizationId);
        if (!gmail) {
            console.log('📎 [GMAIL CONTROLLER] Pas de client Gmail disponible');
            return res.status(401).json({ success: false, message: 'Connexion à Gmail requise.' });
        }

        console.log('📎 [GMAIL CONTROLLER] Client Gmail obtenu, récupération de la pièce jointe...');
        const response = await gmail.users.messages.attachments.get({
            userId: 'me',
            messageId: messageId,
            id: attachmentId
        });

        console.log('📎 [GMAIL CONTROLLER] Pièce jointe récupérée avec succès');
        res.json({ success: true, data: response.data });
    } catch (error) {
        console.error('📎 [GMAIL CONTROLLER] Erreur lors de la récupération de la pièce jointe:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération de la pièce jointe.' });
    }
};

/**
 * Modifie les labels d'un message (ex: ajouter/supprimer une étoile, marquer comme lu/non lu).
 */
export const modifyMessage = async (req: Request, res: Response) => {
    console.log('--- [gmailController.modifyMessage] Début ---');
    const { id } = req.params;
    const { addLabelIds, removeLabelIds } = req.body;
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
        return res.status(400).json({ success: false, message: 'Organization ID manquant.' });
    }
    if (!addLabelIds && !removeLabelIds) {
        return res.status(400).json({ success: false, message: 'Aucune action de modification spécifiée.' });
    }

    try {
        const gmail = await getGmailClient(organizationId);
        if (!gmail) {
            return res.status(401).json({ success: false, message: 'Connexion à Gmail requise.' });
        }

        const response = await gmail.users.messages.modify({
            userId: 'me',
            id,
            requestBody: {
                addLabelIds: addLabelIds || [],
                removeLabelIds: removeLabelIds || [],
            },
        });

        res.json({ success: true, data: response.data });
    } catch (error) {
        const err = error as Error;
        console.error(`Erreur lors de la modification du message ${id}:`, err);
        res.status(500).json({ success: false, message: 'Erreur interne du serveur.', error: err.message });
    }
};

/**
 * Place un message dans la corbeille.
 */
export const trashMessage = async (req: Request, res: Response) => {
    console.log('--- [gmailController.trashMessage] Début ---');
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
        return res.status(400).json({ success: false, message: 'Organization ID manquant.' });
    }

    try {
        const gmail = await getGmailClient(organizationId);
        if (!gmail) {
            return res.status(401).json({ success: false, message: 'Connexion à Gmail requise.' });
        }

        const response = await gmail.users.messages.trash({
            userId: 'me',
            id,
        });

        res.json({ success: true, data: response.data });
    } catch (error) {
        const err = error as Error;
        console.error(`Erreur lors de la mise à la corbeille du message ${id}:`, err);
        res.status(500).json({ success: false, message: 'Erreur interne du serveur.', error: err.message });
    }
};

/**
 * Restaure un message depuis la corbeille.
 */
export const untrashMessage = async (req: Request, res: Response) => {
    console.log('--- [gmailController.untrashMessage] Début ---');
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
        return res.status(400).json({ success: false, message: 'Organization ID manquant.' });
    }

    try {
        const gmail = await getGmailClient(organizationId);
        if (!gmail) {
            return res.status(401).json({ success: false, message: 'Connexion à Gmail requise.' });
        }

        const response = await gmail.users.messages.untrash({
            userId: 'me',
            id,
        });

        res.json({ success: true, data: response.data });
    } catch (error) {
        const err = error as Error;
        console.error(`Erreur lors de la restauration du message ${id}:`, err);
        res.status(500).json({ success: false, message: 'Erreur interne du serveur.', error: err.message });
    }
};

// Supprimer définitivement un message
export const deleteMessage = async (req: Request, res: Response) => {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
        return res.status(400).json({ success: false, message: 'Organization ID manquant.' });
    }

    try {
        const gmail = await getGmailClient(organizationId);
        if (!gmail) {
            return res.status(401).json({ success: false, message: 'Connexion à Gmail requise.' });
        }

        const response = await gmail.users.messages.delete({
            userId: 'me',
            id,
        });

        res.json({ success: true, data: response.data });
    } catch (error) {
        const err = error as Error;
        console.error(`Erreur lors de la suppression du message ${id}:`, err);
        res.status(500).json({ success: false, message: 'Erreur interne du serveur.', error: err.message });
    }
};
