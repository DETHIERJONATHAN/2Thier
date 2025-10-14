/**
 * 📚 REGISTRE DES SCHÉMAS DE SECTIONS
 * 
 * Point d'entrée central pour tous les schémas de sections.
 * Permet d'accéder facilement à n'importe quel schéma par son type.
 * 
 * USAGE :
 * ```typescript
 * import { sectionRegistry, getSectionSchema } from './schemas';
 * 
 * const headerSchema = getSectionSchema('header');
 * const allSchemas = getAllSchemas();
 * const layoutSchemas = getSchemasByCategory('layout');
 * ```
 * 
 * @module site/schemas
 * @author 2Thier CRM Team
 */

import { SectionSchema, SectionSchemaRegistry } from './types';
import headerSchema from './header.schema';
import heroSchema from './hero.schema';
import servicesSchema from './services.schema';
import statsSchema from './stats.schema';
import testimonialsSchema from './testimonials.schema';
import ctaSchema from './cta.schema';
import footerSchema from './footer.schema';
import valuesSchema from './values.schema';
import processSchema from './process.schema';
import projectsSchema from './projects.schema';

/**
 * 🗂️ Registre complet des schémas
 * 
 * Ajoutez simplement votre nouveau schéma ici pour qu'il soit
 * automatiquement disponible dans tout le système !
 */
export const sectionRegistry: SectionSchemaRegistry = {
  header: headerSchema,
  hero: heroSchema,
  services: servicesSchema,
  stats: statsSchema,
  testimonials: testimonialsSchema,
  cta: ctaSchema,
  footer: footerSchema,
  values: valuesSchema,
  process: processSchema,
  projects: projectsSchema,
  
  // 📦 À VENIR (créez les fichiers correspondants) :
  // contact: contactSchema,
  // team: teamSchema,
  // pricing: pricingSchema,
  // faq: faqSchema,
  // blog: blogSchema,
  // features: featuresSchema,
  // timeline: timelineSchema,
  // gallery: gallerySchema,
  // partners: partnersSchema,
  // video: videoSchema,
  // newsletter: newsletterSchema,
  // social: socialSchema
};

/**
 * 🔍 Récupère un schéma par son type
 * 
 * @param type - Type de section ('header', 'hero', etc.)
 * @returns Le schéma correspondant ou undefined
 * 
 * @example
 * ```typescript
 * const schema = getSectionSchema('hero');
 * if (schema) {
 *   console.log(schema.name); // "🚀 Hero Section"
 * }
 * ```
 */
export function getSectionSchema(type: string): SectionSchema | undefined {
  return sectionRegistry[type];
}

/**
 * 📋 Récupère tous les schémas disponibles
 * 
 * @returns Tableau de tous les schémas
 * 
 * @example
 * ```typescript
 * const schemas = getAllSchemas();
 * schemas.forEach(schema => {
 *   console.log(`${schema.icon} ${schema.name}`);
 * });
 * ```
 */
export function getAllSchemas(): SectionSchema[] {
  return Object.values(sectionRegistry);
}

/**
 * 🏷️ Récupère les schémas d'une catégorie spécifique
 * 
 * @param category - Catégorie ('layout', 'content', 'marketing', etc.)
 * @returns Tableau des schémas de cette catégorie
 * 
 * @example
 * ```typescript
 * const layoutSchemas = getSchemasByCategory('layout');
 * // Retourne : [headerSchema, footerSchema, ...]
 * ```
 */
export function getSchemasByCategory(
  category: 'layout' | 'content' | 'marketing' | 'commerce' | 'media' | 'social'
): SectionSchema[] {
  return getAllSchemas().filter(schema => schema.category === category);
}

/**
 * 🤖 Récupère les schémas avec AI activée
 * 
 * @returns Tableau des schémas supportant l'AI
 * 
 * @example
 * ```typescript
 * const aiSchemas = getAIEnabledSchemas();
 * // Tous les schémas où aiEnabled === true
 * ```
 */
export function getAIEnabledSchemas(): SectionSchema[] {
  return getAllSchemas().filter(schema => schema.aiEnabled === true);
}

/**
 * 🔍 Vérifie si un type de section existe
 * 
 * @param type - Type de section à vérifier
 * @returns true si le schéma existe
 * 
 * @example
 * ```typescript
 * if (sectionExists('hero')) {
 *   // Le schéma hero existe
 * }
 * ```
 */
export function sectionExists(type: string): boolean {
  return type in sectionRegistry;
}

/**
 * 📊 Statistiques du registre
 * 
 * @returns Informations sur le registre
 * 
 * @example
 * ```typescript
 * const stats = getRegistryStats();
 * console.log(`${stats.total} sections disponibles`);
 * console.log(`${stats.aiEnabled} avec AI`);
 * ```
 */
export function getRegistryStats() {
  const schemas = getAllSchemas();
  
  return {
    total: schemas.length,
    byCategory: {
      layout: getSchemasByCategory('layout').length,
      content: getSchemasByCategory('content').length,
      marketing: getSchemasByCategory('marketing').length,
      commerce: getSchemasByCategory('commerce').length,
      media: getSchemasByCategory('media').length,
      social: getSchemasByCategory('social').length
    },
    aiEnabled: getAIEnabledSchemas().length
  };
}

// ==================== EXPORTS ====================

export * from './types';
export { headerSchema } from './header.schema';
export { heroSchema } from './hero.schema';
export { servicesSchema } from './services.schema';
export { statsSchema } from './stats.schema';
export { testimonialsSchema } from './testimonials.schema';
export { ctaSchema } from './cta.schema';
export { footerSchema } from './footer.schema';
export { valuesSchema } from './values.schema';
export { processSchema } from './process.schema';
export { projectsSchema } from './projects.schema';

export default sectionRegistry;
