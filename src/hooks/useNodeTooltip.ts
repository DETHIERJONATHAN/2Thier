import { useMemo } from 'react';

export interface TooltipData {
  type: 'none' | 'text' | 'image' | 'both';
  text: string | null;
  image: string | null;
  hasTooltip: boolean;
}

/**
 * 🪝 Hook useNodeTooltip
 * 
 * Extrait les données tooltip d'un nœud TreeBranchLeaf
 * Gère les différentes sources possibles (appearanceConfig, metadata, colonnes TBL)
 */
export const useNodeTooltip = (node?: any): TooltipData => {
  return useMemo(() => {
    // 🚨 DEBUG GLOBAL - Log TOUS les appels du hook
    console.log(`🚨 [useNodeTooltip] APPELÉ avec:`, {
      hasNode: !!node,
      nodeId: node?.id,
      nodeLabel: node?.label,
      nodeKeys: node ? Object.keys(node) : []
    });

    if (!node) {
      console.log(`🚨 [useNodeTooltip] AUCUN NŒUD - retour par défaut`);
      return {
        type: 'none',
        text: null,
        image: null,
        hasTooltip: false
      };
    }

    // 🔍 DEBUG: Log du nœud pour diagnostiquer (tous les nœuds TBL)
    const shouldDebug = true; // DEBUG GLOBAL TEMPORAIRE
    if (shouldDebug) {
      console.log(`🔍 [useNodeTooltip][${node.label || node.id}]`, {
        nodeId: node.id,
        appearanceConfig: node.appearanceConfig,
        metadata: node.metadata,
        directColumns: {
          text_helpTooltipType: node.text_helpTooltipType,
          text_helpTooltipText: node.text_helpTooltipText,
          text_helpTooltipImage: node.text_helpTooltipImage
        }
      });
    }

    // 🎯 PRIORITÉ 1 : appearanceConfig (nouveau système)
    if (node.appearanceConfig) {
      const type = node.appearanceConfig.helpTooltipType || 'none';
      const text = node.appearanceConfig.helpTooltipText || null;
      const image = node.appearanceConfig.helpTooltipImage || null;
      
      if (shouldDebug) {
        console.log(`[useNodeTooltip][${node.label || node.id}] appearanceConfig:`, { type, text, image });
      }
      
      if (type !== 'none' && (text || image)) {
        const result = {
          type,
          text,
          image,
          hasTooltip: true
        };
        if (shouldDebug) {
          console.log(`✅ [useNodeTooltip][${node.label || node.id}] TROUVÉ dans appearanceConfig:`, result);
        }
        return result;
      }
    }

    // 🎯 PRIORITÉ 2 : metadata.appearance (fallback)
    if (node.metadata?.appearance) {
      const type = node.metadata.appearance.helpTooltipType || 'none';
      const text = node.metadata.appearance.helpTooltipText || null;
      const image = node.metadata.appearance.helpTooltipImage || null;
      
      if (shouldDebug) {
        console.log(`[useNodeTooltip][${node.label || node.id}] metadata.appearance:`, { type, text, image });
      }
      
      if (type !== 'none' && (text || image)) {
        const result = {
          type,
          text,
          image,
          hasTooltip: true
        };
        if (shouldDebug) {
          console.log(`✅ [useNodeTooltip][${node.label || node.id}] TROUVÉ dans metadata.appearance:`, result);
        }
        return result;
      }
    }

    // 🎯 PRIORITÉ 3 : colonnes TBL directes (pour les composants TBL)
    if (node.text_helpTooltipType) {
      const type = node.text_helpTooltipType;
      const text = node.text_helpTooltipText || null;
      const image = node.text_helpTooltipImage || null;
      
      if (shouldDebug) {
        console.log(`[useNodeTooltip][${node.label || node.id}] colonnes TBL directes:`, { type, text, image });
      }
      
      if (type !== 'none' && (text || image)) {
        const result = {
          type,
          text,
          image,
          hasTooltip: true
        };
        if (shouldDebug) {
          console.log(`✅ [useNodeTooltip][${node.label || node.id}] TROUVÉ dans TBL directes:`, result);
        }
        return result;
      }
    }

    // Aucun tooltip trouvé
    const result = {
      type: 'none',
      text: null,
      image: null,
      hasTooltip: false
    };
    
    if (shouldDebug) {
      console.log(`❌ [useNodeTooltip][${node.label || node.id}] AUCUN TOOLTIP TROUVÉ - RÉSULTAT:`, result);
    }
    
    return result;
  }, [node]);
};

export default useNodeTooltip;