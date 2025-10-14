/**
 * Service de génération de contenu IA pour les sites web
 * Utilise Google Gemini pour créer du contenu optimisé
 */

import { GoogleGeminiService } from './googleGeminiService';

export interface ServiceContent {
  key: string;
  icon: string;
  title: string;
  description: string;
  features: string[];
  ctaText: string;
}

export interface ProjectContent {
  title: string;
  location: string;
  details: string;
  tags: string[];
}

export interface TestimonialContent {
  customerName: string;
  location: string;
  service: string;
  rating: number;
  text: string;
}

export interface PageContent {
  heroTitle: string;
  heroSubtitle: string;
  heroCtaPrimary: string;
  heroCtaSecondary: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  aboutText: string;
}

export interface SEOSuggestions {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  improvements: string[];
}

export class AIContentService {
  private geminiService: GoogleGeminiService;

  constructor() {
    this.geminiService = new GoogleGeminiService();
  }

  /**
   * Option A : Génère le contenu d'un service
   */
  async generateService(context: {
    siteName: string;
    industry: string;
    serviceType: string;
    keywords?: string[];
  }): Promise<ServiceContent> {
    const prompt = `Tu es un expert en rédaction web et marketing pour le secteur ${context.industry}.

Génère le contenu complet d'un service pour le site "${context.siteName}".

Type de service : ${context.serviceType}
${context.keywords ? `Mots-clés suggérés : ${context.keywords.join(', ')}` : ''}

Retourne UNIQUEMENT un objet JSON valide avec cette structure exacte :
{
  "key": "identifiant-technique-du-service (slug, kebab-case)",
  "icon": "Nom d'une icône Ant Design pertinente (ex: ThunderboltOutlined, FireOutlined, etc.)",
  "title": "Titre accrocheur du service (3-6 mots)",
  "description": "Description persuasive en 1-2 phrases (max 150 caractères)",
  "features": ["Caractéristique 1 (5-8 mots)", "Caractéristique 2", "Caractéristique 3", "Caractéristique 4"],
  "ctaText": "Texte du call-to-action (3-5 mots)",
  "keywords": ["mot-clé 1", "mot-clé 2", "mot-clé 3", "mot-clé 4", "mot-clé 5", "mot-clé 6", "mot-clé 7", "mot-clé 8"]
}

⚠️ IMPORTANT pour les keywords :
- Génère AU MINIMUM 8 mots-clés SEO pertinents et variés
- Inclus des synonymes, termes techniques, bénéfices clients
- Pense référencement naturel (longue traîne + termes courts)
- Exemples : "panneaux solaires", "installation photovoltaïque", "énergie renouvelable", "économies électricité", "autoconsommation", "primes photovoltaïques", "panneaux haute performance", "autonomie énergétique"

Règles :
- Ton professionnel et convaincant
- Orienté bénéfices client
- Optimisé SEO naturellement
- Pas de texte superflu, UNIQUEMENT le JSON`;

    const response = await this.geminiService.generateContentStream(prompt);
    
    // Extraire le JSON de la réponse
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Format de réponse invalide de l\'IA');
    }

    return JSON.parse(jsonMatch[0]);
  }

  /**
   * Option A : Génère le contenu d'un projet
   */
  async generateProject(context: {
    siteName: string;
    industry: string;
    projectType: string;
    location?: string;
  }): Promise<ProjectContent> {
    const prompt = `Tu es un expert en rédaction web et marketing pour le secteur ${context.industry}.

Génère le contenu complet d'un projet réalisé pour le site "${context.siteName}".

Type de projet : ${context.projectType}
${context.location ? `Localisation : ${context.location}` : ''}

Retourne UNIQUEMENT un objet JSON valide avec cette structure exacte :
{
  "title": "Titre technique du projet (ex: 12.5 kWp + Batterie 15 kWh)",
  "location": "Ville ou région",
  "details": "Description détaillée du projet en 2-3 phrases (max 200 caractères)",
  "tags": ["Tag1", "Tag2", "Tag3"]
}

Règles :
- Titre technique et précis
- Détails concrets et mesurables
- Tags pertinents (2-4 tags)
- Pas de texte superflu, UNIQUEMENT le JSON`;

    const response = await this.geminiService.generateContentStream(prompt);
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Format de réponse invalide de l\'IA');
    }

    return JSON.parse(jsonMatch[0]);
  }

  /**
   * Option A : Génère le contenu d'un témoignage
   */
  async generateTestimonial(context: {
    siteName: string;
    industry: string;
    serviceType: string;
    customerType?: 'particulier' | 'professionnel';
  }): Promise<TestimonialContent> {
    const prompt = `Tu es un expert en rédaction web et marketing pour le secteur ${context.industry}.

Génère un témoignage client réaliste et convaincant pour le site "${context.siteName}".

Service concerné : ${context.serviceType}
Type de client : ${context.customerType || 'particulier'}

Retourne UNIQUEMENT un objet JSON valide avec cette structure exacte :
{
  "customerName": "Prénom Nom (belge francophone)",
  "location": "Ville belge",
  "service": "Nom du service utilisé",
  "rating": 5,
  "text": "Témoignage authentique et détaillé (3-4 phrases, max 300 caractères). Doit mentionner des détails concrets, l'expérience vécue, et les résultats obtenus."
}

Règles :
- Témoignage crédible et authentique
- Détails concrets et spécifiques
- Ton positif mais naturel
- Pas de superlatifs exagérés
- Pas de texte superflu, UNIQUEMENT le JSON`;

    const response = await this.geminiService.generateContentStream(prompt);
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Format de réponse invalide de l\'IA');
    }

    return JSON.parse(jsonMatch[0]);
  }

  /**
   * Option B : Génère le contenu complet d'une page
   */
  async generatePageContent(context: {
    siteName: string;
    siteType: 'vitrine' | 'landing' | 'blog';
    industry: string;
    mainServices: string[];
    targetAudience?: string;
  }): Promise<PageContent> {
    const prompt = `Tu es un expert en rédaction web et marketing pour le secteur ${context.industry}.

Génère le contenu complet de la page d'accueil pour "${context.siteName}".

Type de site : ${context.siteType}
Services principaux : ${context.mainServices.join(', ')}
${context.targetAudience ? `Audience cible : ${context.targetAudience}` : ''}

Retourne UNIQUEMENT un objet JSON valide avec cette structure exacte :
{
  "heroTitle": "Titre principal accrocheur (max 60 caractères)",
  "heroSubtitle": "Sous-titre avec liste des services séparés par •",
  "heroCtaPrimary": "Texte bouton principal (3-5 mots)",
  "heroCtaSecondary": "Texte bouton secondaire (2-4 mots)",
  "metaTitle": "Titre SEO optimisé (50-60 caractères)",
  "metaDescription": "Description SEO persuasive (140-160 caractères)",
  "metaKeywords": "Liste de mots-clés SEO séparés par des virgules",
  "aboutText": "Texte de présentation de l'entreprise (3-4 phrases, max 400 caractères)"
}

Règles :
- Titres percutants et orientés bénéfices
- SEO naturel et optimisé
- Ton professionnel et convaincant
- Intégrer les mots-clés de manière naturelle
- Pas de texte superflu, UNIQUEMENT le JSON`;

    const response = await this.geminiService.generateContentStream(prompt);
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Format de réponse invalide de l\'IA');
    }

    return JSON.parse(jsonMatch[0]);
  }

  /**
   * Option C : Optimisation SEO d'un contenu existant
   */
  async optimizeSEO(content: {
    currentTitle?: string;
    currentDescription?: string;
    pageContent: string;
    targetKeywords?: string[];
    siteName: string;
    industry: string;
  }): Promise<SEOSuggestions> {
    const prompt = `Tu es un expert SEO spécialisé dans le secteur ${content.industry}.

Analyse et optimise le contenu SEO pour "${content.siteName}".

Titre actuel : ${content.currentTitle || 'Non défini'}
Description actuelle : ${content.currentDescription || 'Non définie'}
${content.targetKeywords ? `Mots-clés cibles : ${content.targetKeywords.join(', ')}` : ''}

Contenu de la page :
${content.pageContent.substring(0, 1000)}

Retourne UNIQUEMENT un objet JSON valide avec cette structure exacte :
{
  "metaTitle": "Titre SEO optimisé (50-60 caractères)",
  "metaDescription": "Description SEO optimisée (140-160 caractères)",
  "metaKeywords": "Liste de mots-clés SEO pertinents séparés par des virgules",
  "improvements": [
    "Amélioration 1 suggérée",
    "Amélioration 2 suggérée",
    "Amélioration 3 suggérée",
    "Amélioration 4 suggérée"
  ]
}

Règles :
- Optimisation SEO technique
- Mots-clés intégrés naturellement
- Appel à l'action dans la description
- Suggestions concrètes et actionnables
- Pas de texte superflu, UNIQUEMENT le JSON`;

    const response = await this.geminiService.generateContentStream(prompt);
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Format de réponse invalide de l\'IA');
    }

    return JSON.parse(jsonMatch[0]);
  }

  /**
   * Génère plusieurs services d'un coup pour un site complet
   */
  async generateMultipleServices(context: {
    siteName: string;
    industry: string;
    serviceTypes: string[];
  }): Promise<ServiceContent[]> {
    const services: ServiceContent[] = [];
    
    for (const serviceType of context.serviceTypes) {
      try {
        const service = await this.generateService({
          siteName: context.siteName,
          industry: context.industry,
          serviceType
        });
        services.push(service);
      } catch (error) {
        console.error(`Erreur génération service ${serviceType}:`, error);
      }
    }

    return services;
  }
}

export const aiContentService = new AIContentService();
