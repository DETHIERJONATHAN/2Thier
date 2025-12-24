/**
 * 🌐 MIDDLEWARE DE DÉTECTION AUTOMATIQUE DES SITES VITRINES v2.1
 * 
 * Détecte le domaine appelé et charge automatiquement le site correspondant
 * depuis la base de données. Fonctionne pour TOUS les sites créés dans le CRM.
 * 
 * Exemples:
 * - 2thier.be → Charge le site avec domain="2thier.be"
 * - devis1min.be → Charge le site avec domain="devis1min.be"
 * - monsite.com → Charge le site avec domain="monsite.com"
 * 
 * Updated: 24/12/2025 - Ajout cache mémoire + réduction logs production
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { renderWebsite } from './websiteRenderer';

const prisma = new PrismaClient();

// 🚀 CACHE MÉMOIRE pour éviter les requêtes Prisma répétées
const websiteCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60_000; // 60 secondes
const isProduction = process.env.NODE_ENV === 'production';

// Domaines réservés pour le CRM (ne sont PAS des sites vitrines)
const CRM_DOMAINS = [
  'app.2thier.be',
  'api.2thier.be',
  'crm.2thier.be',
  'localhost',
  'railway.app',     // Railway deployments
  'up.railway.app'   // Railway preview URLs
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
    // 🌐 DÉTECTER LE DOMAINE: utiliser plusieurs sources
    // Cloud Run envoie le domaine dans req.hostname via les domain mappings
    const forwardedHost = req.headers['x-forwarded-host'] as string;
    const hostHeader = req.headers.host as string;
    
    // Priorité: X-Forwarded-Host > Host header > req.hostname
    let hostname = forwardedHost || hostHeader || req.hostname || '';
    
    // Enlever le port si présent (ex: localhost:5173)
    hostname = hostname.split(':')[0];
    
    // 🔇 Réduire les logs en production
    if (!isProduction) {
      console.log(`🔍 [WEBSITE-DETECTION] Headers - X-Forwarded-Host: ${forwardedHost}, Host: ${hostHeader}, hostname: ${req.hostname}`);
      console.log(`🔍 [WEBSITE-DETECTION] Domaine détecté: ${hostname}`);
    }
    
    // Si c'est un domaine CRM, passer au suivant
    if (CRM_DOMAINS.some(crm => hostname.includes(crm))) {
      if (!isProduction) {
        console.log(`📱 [WEBSITE-DETECTION] Domaine CRM détecté: ${hostname}`);
      }
      req.isWebsiteRoute = false;
      return next();
    }

    // Nettoyer le hostname (enlever www. si présent)
    const cleanDomain = hostname.replace(/^www\./, '');

    // 🚀 VÉRIFIER LE CACHE D'ABORD
    const cacheKey = cleanDomain;
    const cached = websiteCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      if (cached.data) {
        req.websiteData = cached.data;
        req.isWebsiteRoute = true;
      } else {
        req.isWebsiteRoute = false;
      }
      return next();
    }

    if (!isProduction) {
      console.log(`🌐 [WEBSITE-DETECTION] Recherche site pour: ${cleanDomain}`);
    }

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
          orderBy: { displayOrder: 'asc' }
        }
      }
    });

    if (website) {
      if (!isProduction) {
        console.log(`✅ [WEBSITE-DETECTION] Site trouvé: ${website.siteName} (${website.slug})`);
      }
      
      const websiteData = {
        id: website.id,
        slug: website.slug,
        domain: website.domain || cleanDomain,
        name: website.siteName, // ← Correction: utiliser siteName au lieu de name
        config: website.config,
        sections: website.sections
      };
      
      // 🚀 METTRE EN CACHE
      websiteCache.set(cacheKey, { data: websiteData, timestamp: Date.now() });
      
      req.websiteData = websiteData;
      req.isWebsiteRoute = true;
      
      // 🌐 SI C'EST UN SITE VITRINE, NE PAS ROUTER, IGNORER COMPLÈTEMENT LA REQUÊTE
      // ET LA LAISSER PASSER AU RENDERER
    } else {
      if (!isProduction) {
        console.log(`⚠️ [WEBSITE-DETECTION] Aucun site trouvé pour: ${cleanDomain}`);
      }
      // 🚀 METTRE EN CACHE (résultat null)
      websiteCache.set(cacheKey, { data: null, timestamp: Date.now() });
      req.isWebsiteRoute = false;
    }

    next();
  } catch (error) {
    console.error('❌ [WEBSITE-DETECTION] Erreur:', error);
    req.isWebsiteRoute = false;
    next();
  }
}

/**
 * Middleware qui intercepte les requêtes de sites vitrines
 * et les rend directement AVANT le serveur statique
 */
export function websiteInterceptor(
  req: WebsiteRequest,
  res: Response,
  next: NextFunction
) {
  // Si c'est une route API, health ou assets, passer au suivant
  if (req.url.startsWith('/api/') || req.url.startsWith('/assets/') || req.url.startsWith('/health')) {
    return next();
  }
  
  // Si un site vitrine a été détecté, ne PAS continuer, rendre le site
  if (req.isWebsiteRoute && req.websiteData) {
    console.log(`🎨 [WEBSITE-INTERCEPTOR] Interception pour site: ${req.websiteData.name}`);
    return renderWebsite(req, res);
  }
  
  // Sinon, continuer vers le serveur statique du CRM
  next();
}
