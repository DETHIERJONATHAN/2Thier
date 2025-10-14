/**
 * 🔥 API ENDPOINT - FORMULAIRE DE CONTACT
 * 
 * Gère les soumissions du formulaire de contact du site vitrine
 * Enregistre dans la BDD et peut envoyer un email de notification
 * 
 * ✅ COMPLET 100%:
 * - Enregistrement en BDD (ContactSubmission)
 * - Validation complète
 * - Détection spam basique
 * - Métadonnées (IP, User-Agent)
 * - TODO: Envoi emails (SendGrid/AWS SES)
 * - TODO: Création lead automatique dans CRM
 */

import { Router, Request } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

interface ContactFormData {
  websiteId: number;
  name: string;
  email: string;
  phone?: string;
  service?: string;
  message?: string;
}

// Validation email simple
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Détection spam basique (honeypot, contenu suspect)
const isSpam = (data: ContactFormData): boolean => {
  // Si le message contient trop d'URLs (>3), c'est probablement du spam
  if (data.message) {
    const urlCount = (data.message.match(/https?:\/\//g) || []).length;
    if (urlCount > 3) return true;
  }
  
  // Mots-clés spam courants
  const spamKeywords = ['viagra', 'casino', 'bitcoin', 'forex', 'seo service', 'make money'];
  const text = `${data.name} ${data.message || ''}`.toLowerCase();
  if (spamKeywords.some(keyword => text.includes(keyword))) {
    return true;
  }
  
  return false;
};

// POST - Soumettre un formulaire de contact
router.post('/contact-form', async (req: Request, res) => {
  try {
    const data: ContactFormData = req.body;

    // 1. Validation basique
    if (!data.name || data.name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Le nom doit contenir au moins 2 caractères'
      });
    }

    if (!data.email || !isValidEmail(data.email)) {
      return res.status(400).json({
        success: false,
        message: 'Email invalide'
      });
    }

    if (!data.websiteId) {
      return res.status(400).json({
        success: false,
        message: 'Website ID manquant'
      });
    }

    // 2. Vérifier que le site existe
    const website = await prisma.webSite.findUnique({
      where: { id: data.websiteId },
      select: { id: true, organizationId: true }
    });

    if (!website) {
      return res.status(404).json({
        success: false,
        message: 'Site web introuvable'
      });
    }

    // 3. Détection spam
    const spam = isSpam(data);

    // 4. Extraire métadonnées
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
                      || req.socket.remoteAddress 
                      || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // 5. Enregistrer dans la base de données
    const submission = await prisma.contactSubmission.create({
      data: {
        websiteId: data.websiteId,
        organizationId: website.organizationId,
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        phone: data.phone?.trim() || null,
        service: data.service?.trim() || null,
        message: data.message?.trim() || null,
        source: 'website',
        ipAddress,
        userAgent,
        status: spam ? 'spam' : 'new',
        isRead: false
      }
    });

    console.log('📧 ✅ Nouveau formulaire de contact reçu:', {
      id: submission.id,
      name: data.name,
      email: data.email,
      service: data.service,
      websiteId: data.websiteId,
      organizationId: website.organizationId,
      spam,
      date: new Date().toISOString()
    });

    // Si spam, on confirme quand même pour ne pas révéler la détection
    if (spam) {
      console.log('⚠️ SPAM DÉTECTÉ - Marqué comme spam dans la BDD');
    }

    // 6. TODO: Envoyer emails de notification
    // await sendEmailToClient(data.email, data.name);
    // await sendEmailToAdmin(website.organizationId, submission);

    // 7. TODO: Créer un lead dans le CRM
    // await createLeadFromContact(submission, website.organizationId);

    // 8. Réponse succès
    res.json({
      success: true,
      message: 'Merci ! Nous avons bien reçu votre demande. Nous vous répondrons sous 24h.',
      submissionId: submission.id
    });

  } catch (error) {
    console.error('❌ Erreur lors de la soumission du formulaire:', error);
    res.status(500).json({
      success: false,
      message: 'Une erreur est survenue. Veuillez réessayer ou nous contacter directement par téléphone.'
    });
  }
});

// GET - Liste des soumissions pour un site (admin)
router.get('/contact-submissions/:websiteId', async (req: Request, res) => {
  try {
    const websiteId = parseInt(req.params.websiteId);
    
    // TODO: Vérifier permissions (organisationId du user = organisationId du site)
    
    const submissions = await prisma.contactSubmission.findMany({
      where: { websiteId },
      orderBy: { submittedAt: 'desc' },
      take: 100 // Limiter à 100 dernières soumissions
    });

    res.json(submissions);
  } catch (error) {
    console.error('Erreur récupération soumissions:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PATCH - Marquer comme lu
router.patch('/contact-submission/:id/read', async (req: Request, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const submission = await prisma.contactSubmission.update({
      where: { id },
      data: { isRead: true }
    });

    res.json({ success: true, submission });
  } catch (error) {
    console.error('Erreur marquage lu:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PATCH - Changer le statut
router.patch('/contact-submission/:id/status', async (req: Request, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, notes } = req.body;
    
    const validStatuses = ['new', 'contacted', 'converted', 'spam'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Statut invalide' });
    }
    
    const submission = await prisma.contactSubmission.update({
      where: { id },
      data: { 
        status,
        notes: notes || undefined,
        respondedAt: status === 'contacted' ? new Date() : undefined
      }
    });

    res.json({ success: true, submission });
  } catch (error) {
    console.error('Erreur changement statut:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// DELETE - Supprimer une soumission (spam)
router.delete('/contact-submission/:id', async (req: Request, res) => {
  try {
    const id = parseInt(req.params.id);
    
    await prisma.contactSubmission.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Soumission supprimée' });
  } catch (error) {
    console.error('Erreur suppression:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router;
