/**
 * Supprime les avertissements de compatibilité Ant Design avec React 19
 * Ces avertissements sont des faux positifs car Ant Design fonctionne correctement avec React 19
 */

// Sauvegarder la méthode console.warn originale
const originalWarn = console.warn;

// Override console.warn pour filtrer les avertissements Ant Design
console.warn = (...args: unknown[]) => {
  // Filtrer les avertissements de compatibilité Ant Design
  const message = args[0];
  if (typeof message === 'string') {
    // Supprimer l'avertissement de compatibilité React 19
    if (message.includes('[antd: compatible] antd v5 support React is 16 ~ 18')) {
      return;
    }
    
    // Supprimer l'avertissement useForm non connecté (faux positif en développement)
    if (message.includes('Instance created by `useForm` is not connected to any Form element')) {
      return;
    }
    
    // Supprimer l'avertissement JSX attribute (faux positif avec styled-jsx)
    if (message.includes('Received `true` for a non-boolean attribute `jsx`')) {
      return;
    }
    
    // Supprimer l'avertissement nested scroll container de @hello-pangea/dnd (connu, en attente de fix upstream)
    if (message.includes('unsupported nested scroll container detected') || 
        message.includes('@hello-pangea/dnd')) {
      return;
    }
  }
  
  // Laisser passer tous les autres avertissements
  originalWarn.apply(console, args);
};

export default function suppressAntdWarnings() {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔇 Avertissements Ant Design supprimés en mode développement');
  }
}
