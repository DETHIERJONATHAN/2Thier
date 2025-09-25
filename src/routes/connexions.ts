import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

/**
 * @route POST /api/connexions/voice/call
 * @description Initie un appel sortant via Telnyx.
 * @access Privé
 */
router.post('/voice/call', authMiddleware, async (req, res) => {
  const { to, from } = req.body; // `to` est le numéro à appeler, `from` est le numéro Telnyx de l'utilisateur/entreprise

  if (!to || !from) {
    res.status(400).json({ error: "Les numéros 'to' et 'from' sont requis." });
    return;
  }

  try {
    // Logique d'appel à l'API Telnyx ici
    console.log(`Initiating call from ${from} to ${to}`);
    
    // Simuler une réponse réussie de l'API
    res.status(200).json({ success: true, message: `Appel vers ${to} initié.` });
  } catch (error: any) {
    console.error("Erreur lors de l'initiation de l'appel via Telnyx:", error);
    res.status(500).json({ error: "Erreur interne du serveur.", details: error.message });
  }
});

/**
 * @route POST /api/connexions/email/send
 * @description Envoie un e-mail via one.com.
 * @access Privé
 */
router.post('/email/send', authMiddleware, async (req, res) => {
  const { to, subject, body } = req.body;

  if (!to || !subject || !body) {
    res.status(400).json({ error: "Les champs 'to', 'subject', et 'body' sont requis." });
    return;
  }

  try {
    // Logique d'envoi d'e-mail via one.com (SMTP ou API)
    console.log(`Sending email to ${to} with subject "${subject}"`);

    // Simuler une réponse réussie
    res.status(200).json({ success: true, message: "E-mail envoyé avec succès." });
  } catch (error: any) {
    console.error("Erreur lors de l'envoi de l'e-mail:", error);
    res.status(500).json({ error: "Erreur interne du serveur.", details: error.message });
  }
});

export default router;
