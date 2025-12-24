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
    // Debug désactivé pour performance - utilisez window.enableTBLDebug() si besoin

    if (!field) {
      return {
        type: 'none',
        text: null,
        image: null,
        hasTooltip: false
      };
    }

    const tooltipText = field.text_helpTooltipText;
    const tooltipImage = field.text_helpTooltipImage;

    // Vérifier s'il y a des données tooltip
    const hasText = tooltipText && tooltipText.trim().length > 0;
    const hasImage = tooltipImage && tooltipImage.trim().length > 0;

    if (!hasText && !hasImage) {
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

    return {
      type,
      text: hasText ? tooltipText : null,
      image: hasImage ? tooltipImage : null,
      hasTooltip: true
    };
  }, [field]);
};