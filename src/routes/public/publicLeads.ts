import express from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

const router = express.Router();

// Rate limiting pour les API publiques (plus restrictif)
const publicLeadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Maximum 5 demandes par IP par 15min
  message: {
    success: false,
    message: 'Trop de demandes. Veuillez attendre avant de soumettre un nouveau projet.',
    retryAfter: 15 * 60 // 15 minutes en secondes
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware de validation des données publiques
const validatePublicLead = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { title, description, category, firstName, lastName, email, phone, postalCode, dataProcessingConsent } = req.body;

  // Validation des champs requis
  if (!title || !description || !category || !firstName || !lastName || !email || !phone || !postalCode) {
    return res.status(400).json({
      success: false,
      message: 'Tous les champs obligatoires doivent être remplis',
      missingFields: {
        title: !title,
        description: !description,
        category: !category,
        firstName: !firstName,
        lastName: !lastName,
        email: !email,
        phone: !phone,
        postalCode: !postalCode
      }
    });
  }

  // Validation RGPD obligatoire
  if (!dataProcessingConsent) {
    return res.status(400).json({
      success: false,
      message: 'Le consentement au traitement des données est obligatoire',
      code: 'GDPR_CONSENT_REQUIRED'
    });
  }

  // Validation format email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Format d\'email invalide',
      code: 'INVALID_EMAIL_FORMAT'
    });
  }

  // Validation format code postal français
  const postalCodeRegex = /^\d{5}$/;
  if (!postalCodeRegex.test(postalCode)) {
    return res.status(400).json({
      success: false,
      message: 'Le code postal doit contenir 5 chiffres',
      code: 'INVALID_POSTAL_CODE'
    });
  }

  // Validation longueur téléphone
  const cleanPhone = phone.replace(/\s/g, '');
  if (cleanPhone.length < 10 || cleanPhone.length > 15) {
    return res.status(400).json({
      success: false,
      message: 'Format de téléphone invalide',
      code: 'INVALID_PHONE_FORMAT'
    });
  }

  next();
};

// 🌐 POST /api/public/leads - Création d'un lead depuis le formulaire public
router.post('/leads', publicLeadLimiter, validatePublicLead, async (req, res) => {
  try {
    
    const {
      // Projet
      title,
      description,
      category,
      budget,
      urgency = 'medium',
      
      // Localisation
      postalCode,
      
      // Contact
      firstName,
      lastName,
      email,
      phone,
      preferredContact = 'phone',
      
      // Consentements RGPD
      dataProcessingConsent,
      marketingConsent = false,
      
      // Tracking
      source = 'public_form',
      utmSource,
      utmMedium,
      utmCampaign
    } = req.body;

    // Détection et prévention des doublons
    const recentDuplicate = await prisma.lead.findFirst({
      where: {
        email,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Dernières 24h
        }
      }
    });

    if (recentDuplicate) {
      return res.status(409).json({
        success: false,
        message: 'Une demande similaire a déjà été envoyée récemment',
        code: 'DUPLICATE_LEAD_DETECTED',
        existingLeadId: recentDuplicate.id
      });
    }

    // Calcul du score IA de qualité du lead
    const calculateLeadQualityScore = (leadData: Record<string, unknown>): number => {
      let score = 50; // Score de base

      // Bonus description détaillée
      if (leadData.description.length > 100) score += 15;
      if (leadData.description.length > 200) score += 10;

      // Bonus budget précis
      if (leadData.budget && leadData.budget !== 'unknown') score += 10;
      
      // Bonus urgence
      if (leadData.urgency === 'high') score += 15;
      if (leadData.urgency === 'medium') score += 5;

      // Bonus contact téléphone préféré (plus convertissant)
      if (leadData.preferredContact === 'phone') score += 10;

      // Malus catégorie "other"
      if (leadData.category === 'other') score -= 5;

      return Math.min(Math.max(score, 0), 100);
    };

    const aiQualityScore = calculateLeadQualityScore(req.body);

    // Création du lead
    const newLead = await prisma.lead.create({
      data: {
        // Informations projet
        title: title.trim(),
        description: description.trim(),
        category,
        budget: budget || null,
        urgency,
        
        // Informations contact
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        preferredContact,
        
        // Localisation
        postalCode,
        
        // Scoring et classification
        aiQualityScore,
        status: 'NEW',
        
        // Tracking et attribution
        source,
        utmSource,
        utmMedium,
        utmCampaign,
        
        // RGPD
        dataProcessingConsent,
        marketingConsent,
        
        // Métadonnées
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || null,
        createdAt: new Date()
      }
    });


    // Déclencher un TimelineEvent pour notifier l'équipe (traitement asynchrone non-bloquant)
    prisma.timelineEvent.create({
      data: {
        id: crypto.randomUUID(),
        leadId: newLead.id,
        organizationId: newLead.organizationId,
        entityType: 'lead',
        entityId: newLead.id,
        eventType: 'lead_received',
        data: { aiQualityScore, source: utmSource ?? 'public_form', title: 'Nouveau lead public reçu' } as unknown,
        createdAt: new Date(),
      },
    }).catch(err => logger.error('⚠️ [PUBLIC-API] TimelineEvent non créé:', err));

    // Réponse de succès
    res.status(201).json({
      success: true,
      message: 'Votre demande a été reçue ! Vous recevrez vos devis sous 24h.',
      data: {
        leadId: newLead.id,
        qualityScore: aiQualityScore,
        estimatedResponseTime: '24h',
        nextSteps: [
          'Notre IA va analyser votre demande',
          'Nous sélectionnerons les meilleurs professionnels',
          'Vous recevrez jusqu\'à 3 devis personnalisés'
        ]
      }
    });

  } catch (error) {
    logger.error('❌ [PUBLIC-API] Erreur création lead:', error);
    
    res.status(500).json({
      success: false,
      message: 'Erreur technique lors de l\'envoi. Veuillez réessayer.',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// 📊 GET /api/public/stats - Statistiques publiques (anonymisées) 
router.get('/stats', async (req, res) => {
  try {
    const [
      totalLeads,
      totalPartners,
      avgSatisfaction
    ] = await Promise.all([
      prisma.lead.count({
        where: {
          status: { not: 'SPAM' }
        }
      }),
      prisma.organization.count({
        where: {
          type: 'PARTNER'
        }
      }),
      prisma.leadReview.aggregate({
        _avg: {
          rating: true
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalProjects: totalLeads,
        totalProfessionals: totalPartners,
        avgSatisfaction: Math.round((avgSatisfaction._avg.rating || 4.8) * 10) / 10,
        avgSavings: 1650, // Valeur fixe pour l'instant
        lastUpdate: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('❌ [PUBLIC-API] Erreur stats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du chargement des statistiques'
    });
  }
});

// 🔍 GET /api/public/categories - Liste des catégories disponibles
router.get('/categories', async (req, res) => {
  try {
    // Catégories statiques pour l'instant (peut être dynamique plus tard)
    const categories = [
      { value: 'renovation', label: 'Rénovation & Travaux', popular: true, icon: '🏠' },
      { value: 'energy', label: 'Énergie & Isolation', popular: true, icon: '⚡' },
      { value: 'plumbing', label: 'Plomberie', popular: false, icon: '🔧' },
      { value: 'electricity', label: 'Électricité', popular: false, icon: '💡' },
      { value: 'heating', label: 'Chauffage & Climatisation', popular: true, icon: '🔥' },
      { value: 'garden', label: 'Jardin & Paysagisme', popular: false, icon: '🌿' },
      { value: 'roofing', label: 'Toiture & Couverture', popular: false, icon: '🏘️' },
      { value: 'painting', label: 'Peinture & Décoration', popular: false, icon: '🎨' },
      { value: 'flooring', label: 'Sols & Revêtements', popular: false, icon: '🪜' },
      { value: 'kitchen', label: 'Cuisine', popular: true, icon: '👩‍🍳' },
      { value: 'bathroom', label: 'Salle de bain', popular: true, icon: '🛁' },
      { value: 'windows', label: 'Fenêtres & Menuiserie', popular: false, icon: '🪟' },
      { value: 'security', label: 'Sécurité & Alarme', popular: false, icon: '🔒' },
      { value: 'cleaning', label: 'Nettoyage', popular: false, icon: '🧽' },
      { value: 'moving', label: 'Déménagement', popular: false, icon: '📦' },
      { value: 'other', label: 'Autres services', popular: false, icon: '🔧' }
    ];

    res.json({
      success: true,
      data: {
        popular: categories.filter(c => c.popular),
        all: categories,
        total: categories.length
      }
    });

  } catch (error) {
    logger.error('❌ [PUBLIC-API] Erreur catégories:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du chargement des catégories'
    });
  }
});

// 🏥 GET /api/public/health - Health check pour le monitoring
router.get('/health', async (req, res) => {
  try {
    // Test de connexion DB
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        api: 'operational'
      }
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Database connection failed'
    });
  }
});

export default router;
