import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Modal, Tabs, Button, Space, Row, Col, Empty, Spin } from 'antd';
import { BgColorsOutlined } from '@ant-design/icons';
import { PAGE_BACKGROUNDS, buildCustomBackgroundDataUri } from './PageBackgrounds';
import type { PageBackground } from './PageBackgrounds';
import { useAuth } from '../../auth/useAuth';

interface BackgroundSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (backgroundId: string, backgroundSvg: string, rawSvg?: string) => void;
  globalTheme?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    textColor?: string;
    backgroundColor?: string;
  };
  selectedBackgroundId?: string;
}

export const BackgroundSelector: React.FC<BackgroundSelectorProps> = ({
  open,
  onClose,
  onSelect,
  globalTheme = {
    primaryColor: '#1890ff',
    secondaryColor: '#722ed1',
    accentColor: '#fa8c16',
    textColor: '#000000',
    backgroundColor: '#ffffff',
  },
  selectedBackgroundId,
}) => {
  const [loading, setLoading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const { isSuperAdmin } = useAuth();
  const [customEntries, setCustomEntries] = useState<Array<{ id: string; name: string; rawSvg: string }>>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem('customBackgrounds');
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item) => item?.id && item?.rawSvg);
    } catch {
      return [];
    }
  });

  const testBackgroundIds = useMemo(
    () => new Set(['bg_invoice_vecteezy_6314850', 'bg_invoice_vecteezy_6314448', 'bg_invoice_vecteezy_6315045']),
    []
  );

  // Préparer les couleurs pour les générateurs
  const colors = useMemo(() => ({
    primary: globalTheme.primaryColor || '#1890ff',
    secondary: globalTheme.secondaryColor || '#722ed1',
    accent: globalTheme.accentColor || '#fa8c16',
    text: globalTheme.textColor || '#000000',
    bg: globalTheme.backgroundColor || '#ffffff',
  }), [globalTheme.accentColor, globalTheme.backgroundColor, globalTheme.primaryColor, globalTheme.secondaryColor, globalTheme.textColor]);

  const categoryLabels = useMemo<Record<PageBackground['category'], string>>(() => ({
    premium: '👔 Professionnel',
    corporate: '🏢 Corporate',
    creative: '🎨 Créatif',
    minimal: '⚪ Minimal',
    luxury: '✨ Luxe',
    tech: '🧩 Tech',
    custom: '🧩 Custom',
  }), []);

  const customBackgrounds = useMemo<Array<PageBackground & { rawSvg: string }>>(() => {
    return customEntries.map((entry) => ({
      id: entry.id,
      name: entry.name,
      description: 'Fond uploadé (auto-clean).',
      category: 'custom',
      rawSvg: entry.rawSvg,
      svgGenerator: (c) => buildCustomBackgroundDataUri(entry.rawSvg, c),
    }));
  }, [customEntries]);

  const baseBackgrounds = useMemo(
    () => [...PAGE_BACKGROUNDS.filter(bg => !testBackgroundIds.has(bg.id)), ...customBackgrounds],
    [customBackgrounds, testBackgroundIds]
  );

  const testBackgrounds = useMemo(
    () => PAGE_BACKGROUNDS.filter(bg => testBackgroundIds.has(bg.id)),
    [testBackgroundIds]
  );

  const categories = useMemo(
    () => Array.from(new Set(baseBackgrounds.map(bg => bg.category))),
    [baseBackgrounds]
  );

  const handleCustomUpload = useCallback(async (file: File) => {
    try {
      setLoading(true);
      const rawSvg = await file.text();
      const svgUri = buildCustomBackgroundDataUri(rawSvg, colors);
      const entryId = `bg_custom_${Date.now()}`;
      const entryName = file.name.replace(/\.svg$/i, '');
      const nextEntries = [...customEntries, { id: entryId, name: entryName, rawSvg }];
      setCustomEntries(nextEntries);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('customBackgrounds', JSON.stringify(nextEntries));
      }
      onSelect(entryId, svgUri, rawSvg);
      setTimeout(() => {
        setLoading(false);
        onClose();
      }, 300);
    } catch (error) {
      console.error('Erreur lors de l\'upload du fond:', error);
      setLoading(false);
    }
  }, [colors, customEntries, onClose, onSelect]);

  const handleDeleteCustom = useCallback((id: string) => {
    const nextEntries = customEntries.filter(entry => entry.id !== id);
    setCustomEntries(nextEntries);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('customBackgrounds', JSON.stringify(nextEntries));
    }
  }, [customEntries]);

  // Composant pour une carte de background
  const BackgroundCard = useCallback(({ background }: { background: PageBackground & { rawSvg?: string } }) => {
    const svgUri = background.svgGenerator(colors);
    const isSelected = selectedBackgroundId === background.id;

    const handleSelect = () => {
      setLoading(true);
      try {
        onSelect(background.id, svgUri, background.rawSvg);
        setTimeout(() => {
          setLoading(false);
          onClose();
        }, 300);
      } catch (error) {
        console.error('Erreur lors de la sélection du fond:', error);
        setLoading(false);
      }
    };

    return (
      <div
        style={{
          border: isSelected ? '3px solid #1890ff' : '2px solid #d9d9d9',
          borderRadius: '8px',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          backgroundColor: '#fafafa',
          transform: isSelected ? 'scale(1.02)' : 'scale(1)',
          boxShadow: isSelected ? '0 4px 12px rgba(24, 144, 255, 0.3)' : 'none',
        }}
        onClick={handleSelect}
      >
        {/* Aperçu du fond */}
        <div
          style={{
            width: '100%',
            paddingTop: '66.67%',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: colors.bg,
          }}
        >
          <img
            src={svgUri}
            alt={background.name}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>

        {/* Infos du fond */}
        <div style={{ padding: '12px' }}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: colors.text,
              marginBottom: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {background.name}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: '#8c8c8c',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {background.description}
          </div>

          {/* Bouton de sélection */}
          <Button
            type={isSelected ? 'primary' : 'dashed'}
            size="small"
            style={{ marginTop: '8px', width: '100%' }}
            onClick={(e) => {
              e.stopPropagation();
              handleSelect();
            }}
            loading={loading}
          >
            {isSelected ? '✓ Sélectionné' : 'Choisir'}
          </Button>
          {background.category === 'custom' && (
            <Button
              danger
              size="small"
              style={{ marginTop: '6px', width: '100%' }}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteCustom(background.id);
              }}
            >
              Supprimer
            </Button>
          )}
        </div>
      </div>
    );
  }, [colors, handleDeleteCustom, loading, onClose, onSelect, selectedBackgroundId]);

  const tabItems = useMemo(() => {
    const items = categories.map((category) => {
      const backgrounds = baseBackgrounds.filter(bg => bg.category === category);
      return {
        key: category,
        label: categoryLabels[category],
        children: (
          <div style={{ padding: '20px 0' }}>
            {backgrounds.length === 0 ? (
              <Empty
                description="Aucun fond disponible"
                style={{ marginTop: '40px', marginBottom: '40px' }}
              />
            ) : (
              <Row gutter={[16, 16]}>
                {backgrounds.map((bg) => (
                  <Col xs={24} sm={12} md={8} lg={6} key={bg.id}>
                    <BackgroundCard background={bg} />
                  </Col>
                ))}
              </Row>
            )}
          </div>
        ),
      };
    });

    if (items.length === 0) {
      items.push({
        key: 'default',
        label: 'Fonds',
        children: (
          <div style={{ padding: '20px 0' }}>
            <Empty
              description="Aucun fond disponible"
              style={{ marginTop: '40px', marginBottom: '40px' }}
            />
          </div>
        ),
      });
    }

    if (isSuperAdmin) {
      items.push({
        key: 'test',
        label: '🧪 Test',
        children: (
          <div style={{ padding: '20px 0' }}>
            <div style={{ marginBottom: '16px' }}>
              <Space>
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/svg+xml"
                  style={{ display: 'none' }}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      handleCustomUpload(file);
                      event.currentTarget.value = '';
                    }
                  }}
                />
                <Button
                  icon={<BgColorsOutlined />}
                  onClick={() => uploadInputRef.current?.click()}
                  loading={loading}
                >
                  Upload SVG (auto-clean)
                </Button>
                <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  Nettoie textes/icônes et recadre A4 automatiquement.
                </span>
              </Space>
            </div>
            {customBackgrounds.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <Row gutter={[16, 16]}>
                  {customBackgrounds.map((bg) => (
                    <Col xs={24} sm={12} md={8} lg={6} key={bg.id}>
                      <BackgroundCard background={bg} />
                    </Col>
                  ))}
                </Row>
              </div>
            )}
            {testBackgrounds.length === 0 ? (
              <Empty
                description="Aucun fond de test disponible"
                style={{ marginTop: '40px', marginBottom: '40px' }}
              />
            ) : (
              <Row gutter={[16, 16]}>
                {testBackgrounds.map((bg) => (
                  <Col xs={24} sm={12} md={8} lg={6} key={bg.id}>
                    <BackgroundCard background={bg} />
                  </Col>
                ))}
              </Row>
            )}
          </div>
        ),
      });
    }

    return items;
  }, [BackgroundCard, baseBackgrounds, categories, categoryLabels, customBackgrounds, handleCustomUpload, isSuperAdmin, loading, testBackgrounds]);

  const defaultTabKey = useMemo(() => {
    if (categories.length === 0 && isSuperAdmin) {
      return 'test';
    }
    return tabItems[0]?.key;
  }, [categories.length, isSuperAdmin, tabItems]);

  return (
    <Modal
      title={
        <Space>
          <BgColorsOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
          <span>🎨 Choisir le Fond du Document</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={1000}
      styles={{ body: { maxHeight: '70vh', overflow: 'auto' } }}
      centered
    >
      <Spin spinning={loading}>
        <Tabs
          items={tabItems}
          defaultActiveKey={defaultTabKey}
        />

        {/* Info sur les adaptations */}
        <div
          style={{
            marginTop: '20px',
            padding: '12px 16px',
            backgroundColor: '#e6f7ff',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#0050b3',
            borderLeft: '4px solid #1890ff',
          }}
        >
          <strong>💡 Conseil :</strong> Le fond s'adapte automatiquement aux couleurs de votre
          thème. Changez de thème pour voir le fond se transformer en temps réel !
        </div>
      </Spin>
    </Modal>
  );
};

export default BackgroundSelector;
