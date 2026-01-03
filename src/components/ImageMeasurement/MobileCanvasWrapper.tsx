/**
 * 📱 MobileCanvasWrapper - Wrapper fullscreen mobile pour ImageMeasurementCanvas
 * 
 * Ce composant encapsule le canvas complet dans une interface mobile-friendly:
 * - ✅ Fullscreen fixe sur tout l'écran
 * - ✅ Pinch-to-zoom avec deux doigts
 * - ✅ Pan/scroll fluide quand zoomé
 * - ✅ Menu flottant avec toutes les options du desktop
 * - ✅ Support complet de la sélection d'objet de référence
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button, Dropdown, Space, Tag, message, Modal, Select } from 'antd';
import type { MenuProps } from 'antd';
import {
  CloseOutlined,
  MenuOutlined,
  PlusOutlined,
  BorderOutlined,
  DeleteOutlined,
  UndoOutlined,
  RedoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  AimOutlined,
  CheckOutlined,
  SettingOutlined,
  FullscreenOutlined,
  DragOutlined,
  FileImageOutlined
} from '@ant-design/icons';
import type {
  CalibrationData,
  ImageAnnotations,
  MeasurementResults,
  ReferenceType
} from '../../types/measurement';
import { REFERENCE_PRESETS } from '../../types/measurement';

const { Option } = Select;

// ============================================================================
// TYPES
// ============================================================================

interface MobileCanvasWrapperProps {
  imageUrl: string;
  calibration?: CalibrationData;
  initialPoints?: any[];
  onMeasurementsChange?: (measurements: MeasurementResults) => void;
  onValidate?: (annotations: ImageAnnotations) => void;
  onCancel?: () => void;
  minPoints?: number;
  maxWidth?: number;
  referenceDetected?: any;
  referenceRealSize?: { width: number; height: number };
  onReferenceAdjusted?: (newBoundingBox: any, newPixelPerCmX: number, newPixelPerCmY?: number) => void;
  imageBase64?: string;
  mimeType?: string;
  api?: any;
  fusedCorners?: any;
  homographyReady?: boolean;
  referenceConfig?: {
    referenceType: 'a4' | 'card' | 'meter' | 'custom';
    customName?: string;
    customWidth?: number;
    customHeight?: number;
  };
  measurementObjectConfig?: any;
  allPhotos?: any[];
  children: React.ReactNode; // Le ImageMeasurementCanvas sera passé en children
}

// Type pour les outils disponibles
type Tool = 'select' | 'addPoint' | 'addRectZone' | 'delete';

// ============================================================================
// COMPONENT
// ============================================================================

export const MobileCanvasWrapper: React.FC<MobileCanvasWrapperProps> = ({
  onCancel,
  onValidate,
  referenceConfig,
  children
}) => {
  // ========== STATE ==========
  const [selectedTool, setSelectedTool] = useState<Tool>('select');
  const [zoom, setZoom] = useState(1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Pinch-to-zoom state
  const [pinchStartDistance, setPinchStartDistance] = useState<number | null>(null);
  const [pinchStartZoom, setPinchStartZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Référence au canvas enfant pour les commandes
  const canvasRef = useRef<any>(null);

  // ========== BODY LOCK ==========
  useEffect(() => {
    // Bloquer le scroll du body
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTouchAction = document.body.style.touchAction;
    
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.touchAction = 'none';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.touchAction = originalTouchAction;
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, []);

  // ========== PINCH-TO-ZOOM HANDLERS ==========
  const getDistance = (touches: React.TouchList): number => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Début du pinch
      e.preventDefault();
      const distance = getDistance(e.touches);
      setPinchStartDistance(distance);
      setPinchStartZoom(zoom);
    }
  }, [zoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistance !== null) {
      // Pinch en cours
      e.preventDefault();
      const currentDistance = getDistance(e.touches);
      const scale = currentDistance / pinchStartDistance;
      const newZoom = Math.min(4, Math.max(0.5, pinchStartZoom * scale));
      setZoom(newZoom);
    }
  }, [pinchStartDistance, pinchStartZoom]);

  const handleTouchEnd = useCallback(() => {
    setPinchStartDistance(null);
  }, []);

  // ========== ZOOM CONTROLS ==========
  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(4, z + 0.25));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(0.5, z - 0.25));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  // ========== TOOL SELECTION ==========
  const handleSelectTool = useCallback((tool: Tool) => {
    setSelectedTool(tool);
    setMenuOpen(false);
    message.info(`Outil: ${
      tool === 'select' ? 'Sélection' :
      tool === 'addPoint' ? 'Ajouter point' :
      tool === 'addRectZone' ? 'Zone exclusion' :
      'Supprimer'
    }`);
  }, []);

  // ========== MENU ITEMS ==========
  const menuItems: MenuProps['items'] = [
    {
      key: 'tools',
      type: 'group',
      label: '🛠️ Outils',
      children: [
        {
          key: 'select',
          icon: <DragOutlined />,
          label: 'Sélection / Déplacer',
          onClick: () => handleSelectTool('select')
        },
        {
          key: 'addPoint',
          icon: <PlusOutlined />,
          label: 'Ajouter un point',
          onClick: () => handleSelectTool('addPoint')
        },
        {
          key: 'addRectZone',
          icon: <BorderOutlined />,
          label: 'Zone d\'exclusion',
          onClick: () => handleSelectTool('addRectZone')
        },
        {
          key: 'delete',
          icon: <DeleteOutlined />,
          label: 'Supprimer',
          danger: true,
          onClick: () => handleSelectTool('delete')
        }
      ]
    },
    { type: 'divider' },
    {
      key: 'history',
      type: 'group',
      label: '↩️ Historique',
      children: [
        {
          key: 'undo',
          icon: <UndoOutlined />,
          label: 'Annuler',
          disabled: !canUndo,
          onClick: () => {
            // Dispatch undo command
            document.dispatchEvent(new CustomEvent('canvas-undo'));
            setMenuOpen(false);
          }
        },
        {
          key: 'redo',
          icon: <RedoOutlined />,
          label: 'Rétablir',
          disabled: !canRedo,
          onClick: () => {
            // Dispatch redo command
            document.dispatchEvent(new CustomEvent('canvas-redo'));
            setMenuOpen(false);
          }
        }
      ]
    },
    { type: 'divider' },
    {
      key: 'reference',
      icon: <FileImageOutlined />,
      label: '📄 Objet de référence',
      onClick: () => {
        setShowReferenceModal(true);
        setMenuOpen(false);
      }
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '⚙️ Paramètres',
      onClick: () => {
        message.info('Paramètres à venir...');
        setMenuOpen(false);
      }
    }
  ];

  // ========== CURRENT REFERENCE LABEL ==========
  const getCurrentReferenceLabel = () => {
    if (!referenceConfig) return 'A4';
    const preset = REFERENCE_PRESETS[referenceConfig.referenceType as ReferenceType];
    if (referenceConfig.referenceType === 'custom' && referenceConfig.customName) {
      return referenceConfig.customName;
    }
    return preset?.label || 'A4';
  };

  // ========== RENDER ==========
  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        backgroundColor: '#000',
        display: 'flex',
        flexDirection: 'column',
        touchAction: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ===== HEADER BAR ===== */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          borderBottom: '1px solid #333',
          zIndex: 10
        }}
      >
        {/* Bouton retour */}
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={onCancel}
          style={{ color: '#fff', fontSize: 18 }}
        />
        
        {/* Titre + référence */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>
            📐 Points de mesure
          </div>
          <Tag color="blue" style={{ marginTop: 4 }}>
            Réf: {getCurrentReferenceLabel()}
          </Tag>
        </div>

        {/* Menu hamburger */}
        <Dropdown
          menu={{ items: menuItems }}
          trigger={['click']}
          open={menuOpen}
          onOpenChange={setMenuOpen}
          placement="bottomRight"
        >
          <Button
            type="text"
            icon={<MenuOutlined />}
            style={{ color: '#fff', fontSize: 18 }}
          />
        </Dropdown>
      </div>

      {/* ===== CANVAS CONTAINER ===== */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Canvas avec zoom appliqué */}
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            transition: pinchStartDistance ? 'none' : 'transform 0.1s ease-out',
            maxWidth: '100%',
            maxHeight: '100%',
            overflow: 'auto'
          }}
        >
          {children}
        </div>

        {/* Indicateur de zoom */}
        {zoom !== 1 && (
          <Tag
            color="blue"
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              fontSize: 14,
              padding: '4px 12px'
            }}
          >
            {Math.round(zoom * 100)}%
          </Tag>
        )}
      </div>

      {/* ===== FLOATING TOOLBAR ===== */}
      <div
        style={{
          position: 'absolute',
          left: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 10
        }}
      >
        {/* Zoom controls */}
        <Button
          type={zoom > 1 ? 'primary' : 'default'}
          icon={<ZoomInOutlined />}
          onClick={handleZoomIn}
          style={{ width: 44, height: 44, borderRadius: '50%' }}
        />
        {zoom !== 1 && (
          <Button
            type="primary"
            danger
            icon={<AimOutlined />}
            onClick={handleResetZoom}
            style={{ width: 44, height: 44, borderRadius: '50%' }}
            title="Reset zoom"
          />
        )}
        <Button
          type={zoom < 1 ? 'primary' : 'default'}
          icon={<ZoomOutOutlined />}
          onClick={handleZoomOut}
          style={{ width: 44, height: 44, borderRadius: '50%' }}
        />
      </div>

      {/* ===== TOOL INDICATOR ===== */}
      <div
        style={{
          position: 'absolute',
          bottom: 100,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10
        }}
      >
        <Tag
          color={selectedTool === 'delete' ? 'red' : selectedTool === 'addPoint' ? 'green' : 'blue'}
          style={{ fontSize: 14, padding: '6px 16px' }}
        >
          {selectedTool === 'select' && '👆 Sélection'}
          {selectedTool === 'addPoint' && '➕ Ajouter point'}
          {selectedTool === 'addRectZone' && '⬜ Zone exclusion'}
          {selectedTool === 'delete' && '🗑️ Supprimer'}
        </Tag>
      </div>

      {/* ===== BOTTOM ACTION BAR ===== */}
      <div
        style={{
          padding: '16px',
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          borderTop: '1px solid #333',
          display: 'flex',
          gap: 12,
          zIndex: 10
        }}
      >
        <Button
          size="large"
          onClick={onCancel}
          style={{ flex: 1, height: 52 }}
        >
          Annuler
        </Button>
        <Button
          type="primary"
          size="large"
          icon={<CheckOutlined />}
          onClick={() => {
            // Déclencher la validation via event custom
            document.dispatchEvent(new CustomEvent('canvas-validate'));
          }}
          style={{ flex: 2, height: 52, fontSize: 16 }}
        >
          Valider
        </Button>
      </div>

      {/* ===== REFERENCE MODAL ===== */}
      <Modal
        title="📄 Objet de référence"
        open={showReferenceModal}
        onCancel={() => setShowReferenceModal(false)}
        footer={null}
        centered
      >
        <div style={{ padding: '16px 0' }}>
          <p style={{ marginBottom: 16 }}>
            Sélectionnez l'objet de référence utilisé pour la calibration :
          </p>
          <Select
            value={referenceConfig?.referenceType || 'a4'}
            style={{ width: '100%' }}
            size="large"
            onChange={(value) => {
              // Dispatch event pour changer la référence
              document.dispatchEvent(new CustomEvent('canvas-change-reference', { detail: value }));
              setShowReferenceModal(false);
              message.success(`Référence changée: ${REFERENCE_PRESETS[value as ReferenceType]?.label || value}`);
            }}
          >
            <Option value="a4">📄 Feuille A4 (21 × 29.7 cm)</Option>
            <Option value="card">💳 Carte bancaire (8.56 × 5.4 cm)</Option>
            <Option value="meter">📏 Mètre ruban</Option>
            <Option value="custom">⚙️ Personnalisé</Option>
          </Select>
          
          <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
            <strong>💡 Astuce:</strong> Placez l'objet de référence bien visible sur votre photo pour une calibration précise.
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MobileCanvasWrapper;
