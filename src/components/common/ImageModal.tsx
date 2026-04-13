import React, { useState, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { Modal } from 'antd';
import { logger } from '../../lib/logger';

/**
 * 🖼️ COMPOSANT MODAL POUR IMAGES ET CONTENU RICHE EN PLEIN ÉCRAN
 * 
 * Ce composant fournit un hook pour ouvrir des images ou du contenu HTML riche
 * en plein écran dans une modal Ant Design.
 * 
 * Utilisation: Appelé depuis HelpTooltip pour agrandir les images/texte d'aide
 * Fonctionnalité: Affichage d'images, de contenu HTML riche, ou les deux
 */

interface ImageModalState {
  visible: boolean;
  src: string;
  title: string;
  category: string;
  /** Contenu HTML riche à afficher (alternative à src pour le texte formaté) */
  htmlContent?: string | null;
  /** URL de l'image à afficher en dessous du contenu HTML */
  imageSrc?: string | null;
}

export const useImageModal = () => {
  const [modalState, setModalState] = useState<ImageModalState>({
    visible: false,
    src: '',
    title: '',
    category: '',
    htmlContent: null,
    imageSrc: null
  });

  /**
   * 🚀 OUVRIR LA MODAL - Fonction principale pour afficher du contenu
   * @param src URL de l'image ou data URL du canvas
   * @param title Titre de la modal
   * @param category Catégorie pour debug/logging
   */
  const openModal = useCallback((src: string, title: string, category: string = 'Image') => {
    logger.debug(`🖼️ Ouverture modal ${category}:`, { src: src.substring(0, 50) + '...', title });
    setModalState({
      visible: true,
      src,
      title,
      category,
      htmlContent: null,
      imageSrc: null
    });
  }, []);

  /**
   * 🚀 OUVRIR LA MODAL AVEC CONTENU RICHE (HTML formaté + image optionnelle)
   * Garde la même mise en page que le tooltip : gras, italique, souligné, espaces
   */
  const openRichModal = useCallback((options: {
    title: string;
    htmlContent?: string | null;
    imageSrc?: string | null;
    category?: string;
  }) => {
    const { title, htmlContent, imageSrc, category = 'Aide' } = options;
    logger.debug(`🖼️📝 Ouverture modal riche ${category}:`, { title, hasHtml: !!htmlContent, hasImage: !!imageSrc });
    setModalState({
      visible: true,
      src: imageSrc || '',
      title,
      category,
      htmlContent: htmlContent || null,
      imageSrc: imageSrc || null
    });
  }, []);

  /**
   * 🔒 FERMER LA MODAL
   */
  const closeModal = useCallback(() => {
    logger.debug('🔒 Fermeture modal image');
    setModalState(prev => ({ ...prev, visible: false }));
  }, []);

  /**
   * 🎨 COMPOSANT MODAL - A inclure dans le JSX du composant parent
   * Supporte 2 modes :
   * - Image seule (src) : affiche l'image en grand
   * - Contenu riche (htmlContent + imageSrc optionnelle) : affiche le HTML formaté + image
   */
  const ImageModalComponent = useCallback(() => {
    const isRichContent = !!modalState.htmlContent || (modalState.imageSrc && !modalState.src);
    const hasRichHtml = !!modalState.htmlContent;
    const hasRichImage = !!modalState.imageSrc;

    return (
      <Modal
        open={modalState.visible}
        title={modalState.title}
        onCancel={closeModal}
        footer={null}
        width={isRichContent ? 700 : '90vw'}
        style={{ top: 20 }}
        centered={false}
        destroyOnHidden={true}
        className="image-modal"
      >
        {isRichContent ? (
          /* 📝 MODE CONTENU RICHE : HTML formaté avec même mise en page que le tooltip */
          <div
            style={{
              maxHeight: '80vh',
              overflow: 'auto',
              padding: '16px 8px',
            }}
          >
            {hasRichHtml && (
              <div
                style={{
                  fontSize: '16px',
                  lineHeight: 1.8,
                  color: '#333',
                  marginBottom: hasRichImage ? 20 : 0,
                }}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(modalState.htmlContent!.replace(/\n/g, '<br>'))
                }}
              />
            )}
            {hasRichImage && (
              <div style={{ textAlign: 'center' }}>
                <img
                  src={modalState.imageSrc!}
                  alt={modalState.title}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '60vh',
                    objectFit: 'contain',
                    borderRadius: 8,
                    border: '1px solid #f0f0f0',
                  }}
                  onError={(e) => {
                    logger.error('❌ Erreur chargement image modal:', modalState.imageSrc);
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          /* 🖼️ MODE IMAGE SEULE : comportement original */
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
                logger.error('❌ Erreur chargement image modal:', modalState.src);
                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub24gZGlzcG9uaWJsZTwvdGV4dD48L3N2Zz4=';
              }}
            />
          </div>
        )}
      </Modal>
    );
  }, [modalState, closeModal]);

  return {
    openModal,
    openRichModal,
    closeModal,
    ImageModalComponent,
    modalState
  };
};

export default useImageModal;