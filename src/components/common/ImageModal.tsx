import React, { useState, useCallback } from 'react';
import { Modal } from 'antd';

/**
 * 🖼️ COMPOSANT MODAL POUR IMAGES EN PLEIN ÉCRAN
 * 
 * Ce composant fournit un hook pour ouvrir des images (ou du contenu mixte) 
 * en plein écran dans une modal Ant Design.
 * 
 * Utilisation: Appelé depuis HelpTooltip pour agrandir les images d'aide
 * Fonctionnalité: Affichage d'images, de canvas générés ou de contenu mixte
 */

interface ImageModalState {
  visible: boolean;
  src: string;
  title: string;
  category: string;
}

export const useImageModal = () => {
  const [modalState, setModalState] = useState<ImageModalState>({
    visible: false,
    src: '',
    title: '',
    category: ''
  });

  /**
   * 🚀 OUVRIR LA MODAL - Fonction principale pour afficher du contenu
   * @param src URL de l'image ou data URL du canvas
   * @param title Titre de la modal
   * @param category Catégorie pour debug/logging
   */
  const openModal = useCallback((src: string, title: string, category: string = 'Image') => {
    console.log(`🖼️ Ouverture modal ${category}:`, { src: src.substring(0, 50) + '...', title });
    setModalState({
      visible: true,
      src,
      title,
      category
    });
  }, []);

  /**
   * 🔒 FERMER LA MODAL
   */
  const closeModal = useCallback(() => {
    console.log('🔒 Fermeture modal image');
    setModalState(prev => ({ ...prev, visible: false }));
  }, []);

  /**
   * 🎨 COMPOSANT MODAL - A inclure dans le JSX du composant parent
   */
  const ImageModalComponent = useCallback(() => (
    <Modal
      open={modalState.visible}
      title={modalState.title}
      onCancel={closeModal}
      footer={null}
      width="90vw"
      style={{ top: 20 }}
      centered={false}
      destroyOnHidden={true}
      className="image-modal"
    >
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          maxHeight: '80vh',
          overflow: 'auto'
        }}
      >
        <img
          src={modalState.src}
          alt={modalState.title}
          style={{
            maxWidth: '100%',
            maxHeight: '80vh',
            objectFit: 'contain'
          }}
          onError={(e) => {
            console.error('❌ Erreur chargement image modal:', modalState.src);
            // Optionnel: afficher une image de fallback
            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub24gZGlzcG9uaWJsZTwvdGV4dD48L3N2Zz4=';
          }}
        />
      </div>
    </Modal>
  ), [modalState, closeModal]);

  return {
    openModal,
    closeModal,
    ImageModalComponent,
    modalState
  };
};

export default useImageModal;