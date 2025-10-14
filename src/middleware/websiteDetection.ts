/**
 * 🌐 MIDDLEWARE DE DÉTECTION AUTOMATIQUE DES SITES VITRINES
 * 
 * Détecte le domaine appelé et charge automatiquement le site correspondant
 * depuis la base de données. Fonctionne pour TOUS les sites créés dans le CRM.
 * 
 * Exemples:
 * - 2thier.be → Charge le site avec domain="2thier.be"
 * - devis1min.be → Charge le site avec domain="devis1min.be"
 * - monsite.com → Charge le site avec domain="monsite.com"
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Domaines réservés pour le CRM (ne sont PAS des sites vitrines)
const CRM_DOMAINS = [
  'app.2thier.be',
  'api.2thier.be',
  'crm.2thier.be',
  'localhost'
];

export interface WebsiteRequest extends Request {
  websiteData?: {
    id: string;
    slug: string;
    domain: string;
    name: string;
    config: any;
    sections: any[];
  };
  isWebsiteRoute?: boolean;
}

/**
 * Détecte si la requête vient d'un domaine de site vitrine
 * et charge les données du site depuis la BD
 */
export async function detectWebsite(
  req: WebsiteRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Récupérer le hostname (ex: 2thier.be, devis1min.be)
    const hostname = req.hostname || req.headers.host?.split(':')[0] || '';
    
    // Si c'est un domaine CRM, passer au suivant
    if (CRM_DOMAINS.some(crm => hostname.includes(crm))) {
      req.isWebsiteRoute = false;
      return next();
    }

    // Nettoyer le hostname (enlever www. si présent)
    const cleanDomain = hostname.replace(/^www\./, '');

    console.log(`🌐 [WEBSITE-DETECTION] Hostname détecté: ${hostname} → Domain: ${cleanDomain}`);

    // Chercher le site dans la base de données
    const website = await prisma.webSite.findFirst({
      where: {
        OR: [
          { domain: cleanDomain },
          { domain: hostname },
          { domain: `www.${cleanDomain}` }
        ],
        isActive: true
      },
      include: {
        config: true,
        sections: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (website) {
      console.log(`✅ [WEBSITE-DETECTION] Site trouvé: ${website.name} (${website.slug})`);
      
      req.websiteData = {
        id: website.id,
        slug: website.slug,
        domain: website.domain || cleanDomain,
        name: website.name,
        config: website.config,
        sections: website.sections
      };
      req.isWebsiteRoute = true;
    } else {
      console.log(`⚠️ [WEBSITE-DETECTION] Aucun site trouvé pour: ${cleanDomain}`);
      req.isWebsiteRoute = false;
    }

    next();
  } catch (error) {
    console.error('❌ [WEBSITE-DETECTION] Erreur:', error);
    req.isWebsiteRoute = false;
    next();
  }
}
