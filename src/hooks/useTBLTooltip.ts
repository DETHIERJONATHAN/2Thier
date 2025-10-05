import { useMemo } from 'react';

/**
 * 🎯 Hook pour récupérer les données tooltip d'un champ TBL
 * 
 * Contrairement à useNodeTooltip qui cherche dans les données TreeBranchLeaf,
 * ce hook cherche directement dans l'objet field TBL qui contient déjà
 * les données tooltip mappées depuis la base de données.
 */

export interface TBLTooltipData {
  type: 'none' | 'text' | 'image' | 'both';
  text: string | null;
  image: string | null;
  hasTooltip: boolean;
}

export interface TBLFieldWithTooltip {
  text_helpTooltipType?: string;
  text_helpTooltipText?: string;
  text_helpTooltipImage?: string;
  label?: string;
  id?: string;
  [key: string]: unknown;
}

export const useTBLTooltip = (field: TBLFieldWithTooltip | null | undefined): TBLTooltipData => {
  return useMemo(() => {
    const shouldDebug = true; // 🚨 DEBUG GLOBAL ACTIVÉ
    
    if (shouldDebug) {
      console.log('🚨 [useTBLTooltip] APPELÉ avec:', {
        hasField: !!field,
        fieldLabel: field?.label || 'Inconnu',
        fieldId: field?.id || 'Inconnu',
        tooltipType: field?.text_helpTooltipType,
        tooltipText: field?.text_helpTooltipText,
        tooltipImage: field?.text_helpTooltipImage
      });
      
      // 🔍 SUPER DEBUG : Afficher l'objet field complet
      console.log('🔍 [useTBLTooltip] OBJET FIELD COMPLET:', JSON.stringify(field, null, 2));
      
      // 🔍 Vérification séparée pour appearanceConfig
      const appearanceConfig = (field as any)?.appearanceConfig;
      if (appearanceConfig) {
        console.log('✅ [useTBLTooltip] AppearanceConfig trouvé:', {
          helpTooltipType: appearanceConfig.helpTooltipType,
          helpTooltipText: appearanceConfig.helpTooltipText,
          helpTooltipImage: appearanceConfig.helpTooltipImage,
          fullAppearanceConfig: appearanceConfig
        });
      } else {
        console.log('❌ [useTBLTooltip] Pas d\'appearanceConfig');
      }
      
      // 🔍 Affichage des propriétés principales du field
      console.log('🔍 [useTBLTooltip] Propriétés field:', Object.keys(field || {}));
      
      // 🔥 NOUVEAU DEBUG : Chercher les propriétés tooltip partout dans l'objet
      const allTooltipProps = {};
      const searchTooltips = (obj: any, prefix = '') => {
        for (const key in obj) {
          if (key.includes('tooltip') || key.includes('Tooltip') || key.includes('help')) {
            allTooltipProps[prefix + key] = obj[key];
          }
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            searchTooltips(obj[key], prefix + key + '.');
          }
        }
      };
      searchTooltips(field);
      console.log('🔥 [useTBLTooltip] TOUTES LES PROPRIÉTÉS TOOLTIP TROUVÉES:', allTooltipProps);
    }

    if (!field) {
      if (shouldDebug) {
        console.log('❌ [useTBLTooltip] FIELD NULL - RÉSULTAT: aucun tooltip');
      }
      return {
        type: 'none',
        text: null,
        image: null,
        hasTooltip: false
      };
    }

    const tooltipType = field.text_helpTooltipType;
    const tooltipText = field.text_helpTooltipText;
    const tooltipImage = field.text_helpTooltipImage;

    if (shouldDebug) {
      console.log(`🔍 [useTBLTooltip][${field.label || field.id}] Données brutes:`, {
        tooltipType,
        tooltipText,
        tooltipImage
      });
    }

    // Vérifier s'il y a des données tooltip
    const hasText = tooltipText && tooltipText.trim().length > 0;
    const hasImage = tooltipImage && tooltipImage.trim().length > 0;

    if (!hasText && !hasImage) {
      if (shouldDebug) {
        console.log(`❌ [useTBLTooltip][${field.label || field.id}] AUCUN TOOLTIP TROUVÉ - RÉSULTAT: none`);
      }
      return {
        type: 'none',
        text: null,
        image: null,
        hasTooltip: false
      };
    }

    // Déterminer le type selon les données disponibles
    let type: 'text' | 'image' | 'both' = 'text';
    if (hasText && hasImage) {
      type = 'both';
    } else if (hasImage) {
      type = 'image';
    } else {
      type = 'text';
    }

    const result = {
      type,
      text: hasText ? tooltipText : null,
      image: hasImage ? tooltipImage : null,
      hasTooltip: true
    };

    if (shouldDebug) {
      console.log(`✅ [useTBLTooltip][${field.label || field.id}] TOOLTIP TROUVÉ:`, result);
    }

    return result;
  }, [field]);
};