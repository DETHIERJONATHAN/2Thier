/**
 * 🚀 SITE - Universal Website Builder System
 * 
 * Point d'entrée principal du système universel.
 * 
 * USAGE :
 * ```typescript
 * import {
 *   UniversalSectionEditor,
 *   getSectionSchema,
 *   sectionRegistry
 * } from '@/site';
 * 
 * // Utiliser l'éditeur universel
 * <UniversalSectionEditor
 *   sectionType="hero"
 *   content={content}
 *   onChange={handleChange}
 * />
 * ```
 * 
 * @module site
 * @author 2Thier CRM Team
 */

// ==================== SCHEMAS ====================
export * from './schemas';
export { default as sectionRegistry } from './schemas';

// ==================== BUILDER ====================
export { default as NoCodeBuilder } from './builder/NoCodeBuilder';
export { ComponentLibrary } from './builder/ComponentLibrary';
export { Canvas } from './builder/Canvas';

// ==================== EDITOR ====================
export { default as UniversalSectionEditor } from './editor/UniversalSectionEditor';
export { default as FieldRenderer } from './editor/fields/FieldRenderer';
export { default as ArrayFieldEditor } from './editor/fields/ArrayFieldEditor';
export { default as IconPicker } from './editor/fields/IconPicker';
export { default as ImageUploader } from './editor/fields/ImageUploader';
export { default as RichTextEditor } from './editor/fields/RichTextEditor';
export { default as GridConfigEditor } from './editor/fields/GridConfigEditor';

// ==================== RENDERER ====================
export { SectionRenderer } from './renderer/SectionRenderer';
export { RenderText, getTextContent, getTextStyles } from './renderer/components/RenderText';
export * from './renderer/sections/HeaderRenderer';
export * from './renderer/sections/HeroRenderer';
export * from './renderer/sections/ServicesRenderer';
export * from './renderer/sections/StatsRenderer';
export * from './renderer/sections/TestimonialsRenderer';
export * from './renderer/sections/CtaRenderer';
export * from './renderer/sections/FooterRenderer';

// ==================== AI ====================
export { default as AIAssistButton } from './ai/AIAssistButton';
export { default as AIContentGenerator } from './ai/AIContentGenerator';

// ==================== TYPES ====================
export type {
  FieldType,
  FieldDefinition,
  FieldOptions,
  SectionSchema,
  SectionInstance,
  StyleConfig,
  GridConfig,
  AIContext,
  AIAnalysis,
  SectionSchemaRegistry
} from './schemas/types';
