import React from 'react';
import { Alert } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import type { SectionInstance } from '../schemas/types';
import { getSectionSchema } from '../schemas';
import { HeaderRenderer } from './sections/HeaderRenderer';
import { HeroRenderer } from './sections/HeroRenderer';
import { ServicesRenderer } from './sections/ServicesRenderer';
import { StatsRenderer } from './sections/StatsRenderer';
import { TestimonialsRenderer } from './sections/TestimonialsRenderer';
import { CtaRenderer } from './sections/CtaRenderer';
import { FooterRenderer } from './sections/FooterRenderer';
import { ValuesRenderer } from './sections/ValuesRenderer';
import { ProcessRenderer } from './sections/ProcessRenderer';
import { ProjectsRenderer } from './sections/ProjectsRenderer';
import { AboutRenderer } from './sections/AboutRenderer';
import { ContactRenderer } from './sections/ContactRenderer';

/**
 * 🎨 SECTION RENDERER UNIVERSEL
 * 
 * Ce renderer lit le type de section et délègue le rendu au renderer spécifique.
 * Chaque type de section a son propre renderer dans /renderer/sections/
 * 
 * Modes disponibles :
 * - 'preview' : Rendu complet pour prévisualisation
 * - 'edit' : Rendu avec contrôles d'édition (future feature)
 * 
 * @author IA Assistant - Système de rendu modulaire
 */

interface SectionRendererProps {
  section: SectionInstance;
  mode?: 'preview' | 'edit';
  onEdit?: () => void;
}

export const SectionRenderer: React.FC<SectionRendererProps> = ({ 
  section, 
  mode = 'preview',
  onEdit 
}) => {
  console.log('🎨 [SectionRenderer] Rendu section:', section.type, mode);

  // 🔍 Vérification du schema
  const schema = getSectionSchema(section.type);
  
  if (!schema) {
    console.error('❌ [SectionRenderer] Schema introuvable pour:', section.type);
    return (
      <Alert
        type="error"
        icon={<WarningOutlined />}
        message={`Type de section inconnu : ${section.type}`}
        description="Ce type de section n'existe pas dans le registry des schemas."
        style={{ margin: '20px' }}
      />
    );
  }

  // 🎯 RENDU PAR TYPE
  let content: React.ReactNode;
  
  try {
    switch (section.type) {
      case 'header':
        content = <HeaderRenderer content={section.content} mode={mode} />;
        break;
      
      case 'hero':
        content = <HeroRenderer content={section.content} mode={mode} />;
        break;
      
      case 'services':
        content = <ServicesRenderer content={section.content} mode={mode} />;
        break;
      
      case 'stats':
        content = <StatsRenderer content={section.content} mode={mode} />;
        break;
      
      case 'testimonials':
        content = <TestimonialsRenderer content={section.content} mode={mode} />;
        break;
      
      case 'cta':
        content = <CtaRenderer content={section.content} mode={mode} />;
        break;
      
      case 'footer':
        content = <FooterRenderer content={section.content} mode={mode} />;
        break;
      
      case 'values':
        content = <ValuesRenderer content={section.content} mode={mode} />;
        break;
      
      case 'process':
        content = <ProcessRenderer content={section.content} mode={mode} />;
        break;
      
      case 'projects':
        content = <ProjectsRenderer content={section.content} mode={mode} />;
        break;
      
      case 'about':
        content = <AboutRenderer content={section.content} mode={mode} />;
        break;
      
      case 'contact':
        content = <ContactRenderer content={section.content} mode={mode} />;
        break;
      
      default:
        console.warn('⚠️ [SectionRenderer] Renderer non implémenté pour:', section.type);
        content = (
          <Alert
            type="warning"
            icon={<WarningOutlined />}
            message={`Renderer en développement : ${section.type}`}
            description={`Le renderer pour "${schema.name}" n'est pas encore implémenté.`}
            style={{ margin: '20px' }}
          />
        );
    }
  } catch (error) {
    console.error('❌ [SectionRenderer] Erreur rendu:', error);
    content = (
      <Alert
        type="error"
        icon={<WarningOutlined />}
        message="Erreur de rendu"
        description={`Une erreur s'est produite lors du rendu de la section "${section.type}".`}
        style={{ margin: '20px' }}
      />
    );
  }

  // 🔗 Wrapper avec <section id="key"> pour les ancres
  // Exception: header et footer n'ont pas besoin d'ID (ne sont pas des destinations de scroll)
  const needsAnchor = section.type !== 'header' && section.type !== 'footer';
  
  if (needsAnchor && section.key) {
    return (
      <section id={section.key}>
        {content}
      </section>
    );
  }

  return <>{content}</>;
};
