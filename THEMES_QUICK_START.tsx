/**
 * 🚀 QUICK START - Exemples d'intégration rapide
 * Copie-colle ces exemples pour intégrer les thèmes dans ton app
 */

// ============================================================================
// EXEMPLE 1: Ajouter un bouton "Changer le Thème" dans PageBuilder
// ============================================================================

import React, { useState } from 'react';
import { Button, Space } from 'antd';
import { BgColorsOutlined } from '@ant-design/icons';
import ThemeSelectorModal from '@/components/Documents/ThemeSelectorModal';
import { DocumentTheme } from '@/components/Documents/DocumentThemes';

export const PageBuilderWithThemeSelector = () => {
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState<string>('theme_professional_orange');

  const handleThemeSelected = (theme: DocumentTheme) => {
    setSelectedThemeId(theme.id);
    // Sauvegarder le thème pour le document
    // updateDocumentTemplate({ themeId: theme.id });
  };

  return (
    <>
      <Space style={{ marginBottom: '16px' }}>
        <Button
          type="default"
          icon={<BgColorsOutlined />}
          onClick={() => setThemeModalVisible(true)}
        >
          🎨 Changer le Thème
        </Button>
        <span style={{ fontSize: '12px', color: '#666' }}>
          Thème actif: {selectedThemeId}
        </span>
      </Space>

      <ThemeSelectorModal
        visible={themeModalVisible}
        onCancel={() => setThemeModalVisible(false)}
        currentThemeId={selectedThemeId}
        onThemeSelected={handleThemeSelected}
        title="🎨 Choisir un Thème pour votre Document"
      />

      {/* Reste du PageBuilder */}
    </>
  );
};

// ============================================================================
// EXEMPLE 2: Afficher un document avec le thème appliqué
// ============================================================================

import { useDocumentTheme } from '@/hooks/useDocumentTheme';

export const DocumentPreview = ({ themeId }: { themeId?: string }) => {
  const { theme, styles } = useDocumentTheme({ themeId });

  return (
    <div style={styles.documentStyle}>
      {/* HEADER */}
      <header style={styles.headerStyle}>
        <div style={{ color: '#fff', position: 'relative', zIndex: 1 }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px' }}>
            {theme?.name}
          </h1>
          <p style={{ margin: '0', fontSize: '14px', opacity: 0.9 }}>
            {theme?.description}
          </p>
        </div>
      </header>

      {/* CONTENU */}
      <main style={{ padding: '40px' }}>
        <section style={styles.moduleStyle}>
          <h2 style={{ color: theme?.primaryColor }}>Section 1</h2>
          <p>Contenu avec le thème appliqué</p>
        </section>

        <section style={styles.moduleStyle}>
          <h2 style={{ color: theme?.primaryColor }}>Section 2</h2>
          <p>Couleurs dynamiques du thème</p>
        </section>
      </main>

      {/* FOOTER */}
      <footer style={styles.footerStyle}>
        <div style={{ position: 'relative', zIndex: 1, color: 'inherit' }}>
          <p style={{ margin: 0 }}>
            © 2026 - Tous droits réservés
          </p>
        </div>
      </footer>
    </div>
  );
};

// ============================================================================
// EXEMPLE 3: Sélecteur de Thème Simple (Mini Version)
// ============================================================================

import { ALL_THEMES } from '@/components/Documents/DocumentThemes';
import { Card, Row, Col, Tooltip } from 'antd';

export const ThemeQuickSelector = ({
  onThemeSelect,
}: {
  onThemeSelect: (themeId: string) => void;
}) => {
  return (
    <Row gutter={[8, 8]} style={{ marginBottom: '16px' }}>
      {ALL_THEMES.map((theme) => (
        <Col key={theme.id} xs={6} sm={4}>
          <Tooltip title={theme.name}>
            <Card
              hoverable
              style={{
                padding: '4px',
                cursor: 'pointer',
                border: '2px solid #f0f0f0',
              }}
              onClick={() => onThemeSelect(theme.id)}
            >
              <div
                style={{
                  height: '40px',
                  background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
                  borderRadius: '4px',
                }}
              />
              <p style={{ margin: '4px 0 0 0', fontSize: '10px', textAlign: 'center' }}>
                {theme.name}
              </p>
            </Card>
          </Tooltip>
        </Col>
      ))}
    </Row>
  );
};

// ============================================================================
// EXEMPLE 4: Hook personnalisé pour gérer les thèmes et les templates
// ============================================================================

import { useState, useCallback } from 'react';
import { useDocumentTheme } from '@/hooks/useDocumentTheme';

export function useDocumentWithTheme() {
  const [selectedThemeId, setSelectedThemeId] = useState<string>('theme_professional_orange');
  const { styles, theme, getCSSVariables } = useDocumentTheme({
    themeId: selectedThemeId,
  });

  const changeTheme = useCallback((themeId: string) => {
    setSelectedThemeId(themeId);
  }, []);

  return {
    selectedThemeId,
    changeTheme,
    styles,
    theme,
    cssVariables: getCSSVariables(),
  };
}

// Utilisation:
// const { selectedThemeId, changeTheme, styles } = useDocumentWithTheme();

// ============================================================================
// EXEMPLE 5: Appliquer dynamiquement à un élément DOM
// ============================================================================

import { useRef, useEffect } from 'react';

export const DynamicThemedElement = ({ themeId }: { themeId: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { applyThemeToElement } = useDocumentTheme({ themeId });

  useEffect(() => {
    if (containerRef.current) {
      applyThemeToElement(containerRef.current);
    }
  }, [themeId, applyThemeToElement]);

  return (
    <div ref={containerRef} style={{ padding: '20px' }}>
      <h1>Élément avec thème appliqué</h1>
      <p>Les variables CSS du thème sont appliquées à cet élément</p>
      <p style={{ color: 'var(--theme-primary)' }}>Texte avec couleur primaire du thème</p>
    </div>
  );
};

// ============================================================================
// EXEMPLE 6: Intégrer dans ModuleConfigPanel (Page Builder)
// ============================================================================

import { Button, Divider } from 'antd';

export const EnhancedModuleConfigPanel = () => {
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [documentThemeId, setDocumentThemeId] = useState<string>();

  return (
    <div style={{ padding: '16px' }}>
      {/* Config existante */}

      <Divider />

      {/* Section Thème */}
      <h3>🎨 Thème du Document</h3>
      <p style={{ fontSize: '12px', color: '#666' }}>
        Sélectionnez un thème magnifique pour votre document
      </p>
      <Button
        block
        onClick={() => setThemeModalVisible(true)}
        type="default"
        style={{ marginBottom: '12px' }}
      >
        Changer le Thème
      </Button>

      <ThemeSelectorModal
        visible={themeModalVisible}
        onCancel={() => setThemeModalVisible(false)}
        currentThemeId={documentThemeId}
        onThemeSelected={(theme) => {
          setDocumentThemeId(theme.id);
          // Sauvegarder
        }}
      />
    </div>
  );
};

// ============================================================================
// EXEMPLE 7: Liste des thèmes avec filtres
// ============================================================================

import { Input, Empty } from 'antd';

export const ThemeGallery = () => {
  const [searchText, setSearchText] = useState('');

  const filteredThemes = ALL_THEMES.filter(
    (t) =>
      t.name.toLowerCase().includes(searchText.toLowerCase()) ||
      t.description.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div>
      <Input.Search
        placeholder="Chercher un thème..."
        onChange={(e) => setSearchText(e.target.value)}
        style={{ marginBottom: '16px' }}
      />

      {filteredThemes.length === 0 ? (
        <Empty description="Aucun thème trouvé" />
      ) : (
        <Row gutter={[16, 16]}>
          {filteredThemes.map((theme) => (
            <Col key={theme.id} xs={24} sm={12} md={8} lg={6}>
              <Card hoverable>
                <div
                  style={{
                    height: '80px',
                    background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
                    borderRadius: '4px',
                    marginBottom: '12px',
                  }}
                />
                <h4>{theme.name}</h4>
                <p style={{ fontSize: '12px', color: '#666' }}>
                  {theme.description}
                </p>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

// ============================================================================
// EXEMPLE 8: Exporter les styles CSS d'un thème
// ============================================================================

export function exportThemeAsCSS(themeId: string): string {
  const { getCSSVariables } = useDocumentTheme({ themeId });
  const variables = getCSSVariables();

  return Object.entries(variables)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n');
}

// Utilisation:
// const css = exportThemeAsCSS('theme_professional_orange');
// console.log(css);

export default {
  PageBuilderWithThemeSelector,
  DocumentPreview,
  ThemeQuickSelector,
  ThemeGallery,
};
