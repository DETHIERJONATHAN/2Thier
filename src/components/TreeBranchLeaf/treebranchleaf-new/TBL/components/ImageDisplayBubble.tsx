/**
 * 🖼️ ImageDisplayBubble - Affichage miniature de photo dans une bulle
 * 
 * Ce composant affiche une photo liée dans une bulle ronde avec:
 * - Miniature dans le cercle
 * - Modal de prévisualisation au clic
 * - Icône de fallback si pas d'image
 * 
 * @module TBL/components/ImageDisplayBubble
 * @author 2Thier CRM Team
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Spin, Tooltip, Image } from 'antd';
import { PictureOutlined, EyeOutlined, LoadingOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';
import { tblLog } from '../../../../../utils/tblDebug';

interface ImageDisplayBubbleProps {
  /** ID du champ courant */
  fieldId: string;
  /** ID du nœud image source (lié via link_targetNodeId) */
  sourceNodeId: string;
  /** Label du champ pour le tooltip */
  label?: string;
  /** Données du formulaire pour extraire la valeur de l'image */
  formData?: Record<string, unknown>;
  /** Taille de la bulle en pixels */
  size?: number;
  /** Style personnalisé */
  className?: string;
}

/**
 * Composant de bulle affichant une photo liée avec prévisualisation
 */
export const ImageDisplayBubble: React.FC<ImageDisplayBubbleProps> = ({
  fieldId,
  sourceNodeId,
  label = 'Photo',
  formData = {},
  size = 80,
  className
}) => {
  const { api } = useAuthenticatedApi();
  const apiRef = useRef(api);
  
  // Mettre à jour le ref si api change
  useEffect(() => {
    if (api && api !== apiRef.current) {
      apiRef.current = api;
    }
  }, [api]);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Récupérer l'URL de l'image depuis le champ source
  const fetchImageUrl = useCallback(async () => {
    // 🔍 DEBUG: Afficher ce que reçoit ImageDisplayBubble
    console.log(`🖼️🖼️🖼️ [ImageDisplayBubble] fetchImageUrl appelé:`, {
      fieldId,
      sourceNodeId,
      formDataKeys: Object.keys(formData).slice(0, 10),
      formDataFieldId: formData[fieldId],
      formDataSourceNodeId: formData[sourceNodeId]
    });
    
    if (!sourceNodeId && !fieldId) {
      setImageUrl(null);
      return;
    }

    // 🎯 FIX: D'abord vérifier si la valeur est dans formData[fieldId] (où le serveur stocke les valeurs Link)
    const formValueFieldId = formData[fieldId];
    if (formValueFieldId && typeof formValueFieldId === 'string' && (formValueFieldId.startsWith('http') || formValueFieldId.startsWith('data:'))) {
      tblLog(`✅ [ImageDisplayBubble] Image trouvée dans formData[fieldId=${fieldId}]`);
      setImageUrl(formValueFieldId);
      return;
    }

    // 2. Ensuite vérifier formData[sourceNodeId] (ancien comportement)
    const formValue = formData[sourceNodeId];
    if (formValue && typeof formValue === 'string' && (formValue.startsWith('http') || formValue.startsWith('data:'))) {
      tblLog(`✅ [ImageDisplayBubble] Image trouvée dans formData[sourceNodeId=${sourceNodeId}]`);
      setImageUrl(formValue);
      return;
    }

    // 2. Sinon, récupérer depuis l'API
    try {
      setLoading(true);
      setError(null);
      
      tblLog(`🔍 [ImageDisplayBubble] Récupération de l'image pour nodeId: ${sourceNodeId}`);
      
      // Essayer de récupérer la valeur calculée/stockée du nœud
      const response = await apiRef.current.get<{
        value?: string;
        calculatedValue?: string;
      }>(`/api/tree-nodes/${sourceNodeId}/calculated-value`);

      if (response) {
        const url = response.value ?? response.calculatedValue;
        if (url && typeof url === 'string' && (url.startsWith('http') || url.startsWith('data:'))) {
          tblLog(`✅ [ImageDisplayBubble] Image récupérée via API: ${url.substring(0, 50)}...`);
          setImageUrl(url);
          return;
        }
      }

      // 3. Essayer de récupérer depuis les métadonnées du nœud
      const nodeData = await apiRef.current.get<{
        metadata?: { imageUrl?: string };
        value?: string;
      }>(`/api/treebranchleaf/nodes/${sourceNodeId}`);

      if (nodeData) {
        const metaUrl = nodeData.metadata?.imageUrl || nodeData.value;
        if (metaUrl && typeof metaUrl === 'string' && (metaUrl.startsWith('http') || metaUrl.startsWith('data:'))) {
          tblLog(`✅ [ImageDisplayBubble] Image trouvée dans métadonnées: ${metaUrl.substring(0, 50)}...`);
          setImageUrl(metaUrl);
          return;
        }
      }

      // Pas d'image trouvée
      tblLog(`⚠️ [ImageDisplayBubble] Aucune image trouvée pour ${sourceNodeId}`);
      setImageUrl(null);
    } catch (err) {
      console.error(`❌ [ImageDisplayBubble] Erreur récupération image:`, err);
      setError('Erreur de chargement');
      setImageUrl(null);
    } finally {
      setLoading(false);
    }
  }, [fieldId, sourceNodeId, formData]);

  // Charger l'image au montage et quand sourceNodeId change
  useEffect(() => {
    fetchImageUrl();
  }, [fetchImageUrl]);

  // Écouter les mises à jour du nœud source
  useEffect(() => {
    const handler = (event: Event) => {
      try {
        const custom = event as CustomEvent<{ node?: { id?: string } }>;
        const node = custom.detail?.node;
        if (node && node.id === sourceNodeId) {
          tblLog('🔔 [ImageDisplayBubble] Mise à jour détectée pour le nœud source');
          fetchImageUrl();
        }
      } catch {
        // noop
      }
    };
    window.addEventListener('tbl-node-updated', handler);
    return () => window.removeEventListener('tbl-node-updated', handler);
  }, [sourceNodeId, fetchImageUrl]);

  // Style de la bulle
  const bubbleStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: imageUrl 
      ? 'transparent' 
      : 'linear-gradient(135deg, #f0f5ff 0%, #e6f0ff 100%)',
    border: imageUrl ? '3px solid #1890ff' : '2px dashed #91caff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    cursor: imageUrl ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    margin: '0 auto',
    overflow: 'hidden',
    position: 'relative',
  };

  // Style de l'overlay au hover
  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.2s ease',
    borderRadius: '50%',
  };

  // Handler pour ouvrir la prévisualisation
  const handleClick = useCallback(() => {
    if (imageUrl) {
      setPreviewVisible(true);
    }
  }, [imageUrl]);

  // Rendu du contenu de la bulle
  const renderBubbleContent = () => {
    if (loading) {
      return <Spin indicator={<LoadingOutlined style={{ fontSize: 24, color: '#1890ff' }} />} />;
    }

    if (error) {
      return (
        <Tooltip title={error}>
          <PictureOutlined style={{ fontSize: 28, color: '#ff4d4f' }} />
        </Tooltip>
      );
    }

    if (!imageUrl) {
      return (
        <div style={{ textAlign: 'center' }}>
          <PictureOutlined style={{ fontSize: 28, color: '#bfbfbf' }} />
          <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
            Pas d'image
          </div>
        </div>
      );
    }

    return (
      <>
        <img
          src={imageUrl}
          alt={label}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '50%',
          }}
          onError={() => {
            setError('Erreur de chargement');
            setImageUrl(null);
          }}
        />
        <div 
          className="image-overlay"
          style={overlayStyle}
        >
          <EyeOutlined style={{ fontSize: 24, color: '#fff' }} />
        </div>
      </>
    );
  };

  return (
    <>
      <Tooltip title={imageUrl ? `${label} - Cliquez pour agrandir` : label}>
        <div
          style={bubbleStyle}
          className={`image-display-bubble ${className || ''} hover:shadow-lg`}
          onClick={handleClick}
          onMouseEnter={(e) => {
            const overlay = e.currentTarget.querySelector('.image-overlay') as HTMLElement;
            if (overlay) overlay.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            const overlay = e.currentTarget.querySelector('.image-overlay') as HTMLElement;
            if (overlay) overlay.style.opacity = '0';
          }}
        >
          {renderBubbleContent()}
        </div>
      </Tooltip>

      {/* Modal de prévisualisation */}
      <Modal
        open={previewVisible}
        title={label}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width="auto"
        style={{ maxWidth: '90vw' }}
        centered
        destroyOnClose
      >
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={label}
            style={{ 
              maxWidth: '80vw', 
              maxHeight: '80vh',
              objectFit: 'contain'
            }}
            preview={false}
          />
        )}
      </Modal>
    </>
  );
};

export default React.memo(ImageDisplayBubble);
