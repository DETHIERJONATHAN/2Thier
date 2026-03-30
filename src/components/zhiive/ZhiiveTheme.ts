// Zhiive — "Exister, Créer, Gagner!"
// Theme constants for the Zhiive social network panels

export const SF = {
  // Brand
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  secondary: '#00CEC9',
  secondaryLight: '#81ECEC',
  accent: '#FD79A8',
  accentLight: '#FAB1D0',
  gold: '#FDCB6E',
  success: '#00B894',
  fire: '#E17055',

  // Social / interaction
  like: '#ff2d55',
  danger: '#ff4d4f',
  dangerAlt: '#e74c3c',
  info: '#1890ff',
  infoAlt: '#2196F3',
  successAlt: '#52c41a',
  successMd: '#4CAF50',
  orange: '#FF9800',
  orangeAlt: '#fa8c16',
  purple: '#9C27B0',

  // Scope / visibility
  scopeColony: '#1890ff',
  scopePublic: '#52c41a',
  scopePrivate: '#8c8c8c',

  // Primary alpha variations
  primaryAlpha03: 'rgba(108, 92, 231, 0.03)',
  primaryAlpha08: 'rgba(108, 92, 231, 0.08)',

  // Dark mode / overlay
  dark: '#1a1a2e',
  darkDeep: '#16213e',
  darkBg: '#222',
  black: '#000',
  textLight: '#ffffff',
  textLightMuted: 'rgba(255,255,255,0.7)',
  textLightDimmed: 'rgba(255,255,255,0.5)',
  overlayLight: 'rgba(255,255,255,0.2)',
  overlayLighter: 'rgba(255,255,255,0.15)',
  overlayLightest: 'rgba(255,255,255,0.08)',
  overlayLightFaint: 'rgba(255,255,255,0.06)',
  overlayLightBorder: 'rgba(255,255,255,0.4)',
  overlayLightActive: 'rgba(255,255,255,0.3)',
  overlayDark: 'rgba(0,0,0,0.3)',
  overlayDarkMd: 'rgba(0,0,0,0.5)',
  overlayDarkStrong: 'rgba(0,0,0,0.6)',
  overlayDarkHeavy: 'rgba(0,0,0,0.7)',
  overlayDarkVeryHeavy: 'rgba(0,0,0,0.85)',
  overlayPlayBtn: 'rgba(255,255,255,0.8)',
  gradientOverlayTop: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
  gradientOverlayBottom: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
  gradientOverlayThumb: 'linear-gradient(transparent, rgba(0,0,0,0.7))',

  // Neutral / surface    
  bgLight: '#f0f2f5',
  bgLighter: '#f5f5f5',
  bgLightest: '#fafafa',
  bgCard: '#f0f0f0',
  borderLight: '#d9d9d9',
  borderLighter: '#eee',
  textTertiary: '#65676b',
  textQuaternary: '#8c8c8c',
  textDark: '#333',
  textPlaceholder: '#999',
  bgPrimaryTint: 'rgba(108, 92, 231, 0.1)',

  // Tinted backgrounds (status/info)
  bgInfoTint: '#e6f7ff',
  bgSuccessTint: '#f6ffed',
  bgWarningTint: '#fff7e6',
  bgWarningTintAlt: '#FFF8E1',
  bgDangerTint: '#FFF3E0',
  bgPurpleTint: '#F3E5F5',
  bgGreenTint: '#E8F5E9',
  bgBlueTint: '#E3F2FD',
  successBorder: '#b7eb8f',
  warningBorder: '#ffd591',

  // Gradients
  gradientPrimary: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
  gradientSecondary: 'linear-gradient(135deg, #00CEC9, #81ECEC)',
  gradientHot: 'linear-gradient(135deg, #FD79A8, #E17055)',
  gradientGold: 'linear-gradient(135deg, #FDCB6E, #F39C12)',
  gradientDark: 'linear-gradient(135deg, #2D3436, #636E72)',
  gradientStory: 'linear-gradient(135deg, #6C5CE7, #FD79A8, #FDCB6E)',
  gradientAccent: 'linear-gradient(135deg, #6C5CE7 0%, #FD79A8 100%)',
  gradientFull: 'linear-gradient(135deg, #6C5CE7 0%, #FD79A8 50%, #FDCB6E 100%)',

  // Layout
  bg: '#F8F9FA',
  cardBg: '#FFFFFF',
  text: '#2D3436',
  textSecondary: '#636E72',
  textMuted: '#B2BEC3',
  border: '#DFE6E9',
  radius: 16,
  radiusSm: 10,
  shadow: '0 2px 12px rgba(0,0,0,0.06)',
  shadowMd: '0 4px 20px rgba(0,0,0,0.1)',

  // Panel labels & icons
  panels: [
    { key: 'explore', label: 'Explore', icon: '🔍', color: '#00CEC9' },
    { key: 'flow', label: 'Flow', icon: '🌊', color: '#6C5CE7' },
    { key: 'mur', label: 'Mur', icon: '🏠', color: '#1877F2' },
    { key: 'universe', label: 'Universe', icon: '🌌', color: '#FD79A8' },
    { key: 'dashboard', label: 'Stats', icon: '📊', color: '#FDCB6E' },
  ] as const,
} as const;
