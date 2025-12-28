import React from 'react';

/**
 * 🎨 RENDER TEXT HELPER
 * 
 * Ce composant gère le rendu des valeurs texte qui peuvent être :
 * - Une string simple : "Mon texte"
 * - Un objet de style : { text: "Mon texte", color: "#fff", fontSize: "24px", ... }
 * 
 * Utilisé par tous les renderers de sections pour afficher du texte de manière uniforme.
 * 
 * @author IA Assistant - Système de rendu universel
 */

interface TextStyleObject {
  text?: string;
  color?: string;
  fontSize?: string;
  fontWeight?: string;
  textAlign?: string;
  [key: string]: any;
}

interface RenderTextProps {
  value: string | TextStyleObject | undefined;
  defaultValue?: string;
  defaultStyle?: React.CSSProperties;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

/**
 * Rend un texte avec ses styles
 */
export const RenderText: React.FC<RenderTextProps> = ({ 
  value, 
  defaultValue = '', 
  defaultStyle = {},
  className,
  as: Component = 'span'
}) => {
  // 🔍 Cas 1: Valeur vide
  if (!value) {
    return <Component style={defaultStyle} className={className}>{defaultValue}</Component>;
  }

  // 🔍 Cas 2: String simple
  if (typeof value === 'string') {
    return <Component style={defaultStyle} className={className}>{value}</Component>;
  }

  // 🔍 Cas 3: Objet de style
  if (typeof value === 'object' && value.text !== undefined) {
    const {
      text,
      color,
      fontSize,
      fontWeight,
      textAlign,
      ...otherStyles
    } = value as TextStyleObject;

    const styles: React.CSSProperties = {
      ...defaultStyle,
      ...(color && { color }),
      ...(fontSize && { fontSize }),
      ...(fontWeight && { fontWeight }),
      ...(textAlign && { textAlign }),
      ...otherStyles
    };

    return <Component style={styles} className={className}>{text || defaultValue}</Component>;
  }

  // 🔍 Cas 4: Objet sans propriété text (ancienne structure?)
  if (typeof value === 'object') {
    console.warn('[RenderText] Objet texte sans propriété "text":', value);
    return <Component style={defaultStyle} className={className}>{defaultValue}</Component>;
  }

  // 🔍 Cas 5: Type inconnu
  console.warn('[RenderText] Type de valeur inconnu:', typeof value, value);
  return <Component style={defaultStyle} className={className}>{String(value)}</Component>;
};

/**
 * Extrait le texte brut d'une valeur (sans styles)
 */
export function getTextContent(value: string | TextStyleObject | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.text) return value.text;
  return String(value);
}

/**
 * Extrait les styles d'une valeur texte
 */
export function getTextStyles(value: string | TextStyleObject | undefined): React.CSSProperties {
  if (!value || typeof value !== 'object') return {};
  
  const {
    text,
    color,
    fontSize,
    fontWeight,
    textAlign,
    ...otherStyles
  } = value as TextStyleObject;

  return {
    ...(color && { color }),
    ...(fontSize && { fontSize }),
    ...(fontWeight && { fontWeight }),
    ...(textAlign && { textAlign }),
    ...otherStyles
  };
}
