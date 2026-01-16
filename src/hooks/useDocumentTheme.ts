/**
 * 🎨 useDocumentTheme Hook
 * Gère l'application des thèmes sur les documents de manière centralisée
 */

import { useMemo, useCallback } from 'react';
import { DocumentTheme, getThemeById, ALL_THEMES } from '../components/Documents/DocumentThemes';

interface UseDocumentThemeProps {
  themeId?: string;
}

interface ThemeApplication {
  theme: DocumentTheme | null;
  styles: {
    headerStyle: React.CSSProperties;
    footerStyle: React.CSSProperties;
    documentStyle: React.CSSProperties;
    moduleStyle: React.CSSProperties;
  };
  applyThemeToElement: (element: HTMLElement) => void;
  getCSSVariables: () => Record<string, string>;
}

export function useDocumentTheme({
  themeId,
}: UseDocumentThemeProps = {}): ThemeApplication {
  // Get the theme
  const theme = useMemo(() => {
    if (!themeId) return null;
    return getThemeById(themeId) || null;
  }, [themeId]);

  // Default theme if none selected
  const activeTheme = theme || ALL_THEMES[0];

  // Generate CSS variables for the theme
  const getCSSVariables = useCallback(() => {
    return {
      '--theme-primary': activeTheme.primaryColor,
      '--theme-secondary': activeTheme.secondaryColor,
      '--theme-accent': activeTheme.accentColor,
      '--theme-text': activeTheme.textColor,
      '--theme-background': activeTheme.backgroundColor,
      '--theme-header-bg': activeTheme.headerBgColor,
      '--theme-footer-bg': activeTheme.footerBgColor,
      '--theme-font-family': activeTheme.fontFamily,
      '--theme-font-size': `${activeTheme.fontSize}px`,
    };
  }, [activeTheme]);

  // Generate styles for different document sections
  const styles = useMemo(
    () => ({
      headerStyle: {
        background: `linear-gradient(135deg, ${activeTheme.headerBgColor} 0%, ${activeTheme.secondaryColor} 100%)`,
        color: '#fff',
        padding: activeTheme.customStyles?.headerPadding || '30px',
        fontSize: activeTheme.fontSize + 4,
        fontFamily: activeTheme.fontFamily,
        minHeight: '120px',
        display: 'flex',
        alignItems: 'center',
        backgroundImage: `url('data:image/svg+xml;utf8,${encodeURIComponent(
          activeTheme.headerSvg
        )}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative' as const,
        overflow: 'hidden' as const,
      },
      footerStyle: {
        background: `linear-gradient(135deg, ${activeTheme.footerBgColor} 0%, ${activeTheme.accentColor} 100%)`,
        color: activeTheme.primaryColor === '#111827' ? '#fff' : activeTheme.textColor,
        padding: activeTheme.customStyles?.footerPadding || '20px',
        fontSize: activeTheme.fontSize,
        fontFamily: activeTheme.fontFamily,
        minHeight: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: `url('data:image/svg+xml;utf8,${encodeURIComponent(
          activeTheme.footerSvg
        )}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative' as const,
        overflow: 'hidden' as const,
      },
      documentStyle: {
        backgroundColor: activeTheme.backgroundColor,
        color: activeTheme.textColor,
        fontFamily: activeTheme.fontFamily,
        fontSize: activeTheme.fontSize,
        padding: '0px',
      },
      moduleStyle: {
        padding: activeTheme.customStyles?.moduleSpacing || '15px',
        marginBottom: activeTheme.customStyles?.moduleSpacing || '15px',
        borderColor: `${activeTheme.primaryColor}20`, // 20% opacity
      },
    }),
    [activeTheme]
  );

  // Apply theme to element
  const applyThemeToElement = useCallback(
    (element: HTMLElement) => {
      const cssVars = getCSSVariables();
      Object.entries(cssVars).forEach(([key, value]) => {
        element.style.setProperty(key, value);
      });
    },
    [getCSSVariables]
  );

  return {
    theme: activeTheme,
    styles,
    applyThemeToElement,
    getCSSVariables,
  };
}

export default useDocumentTheme;
