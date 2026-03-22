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

  // Gradients
  gradientPrimary: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
  gradientSecondary: 'linear-gradient(135deg, #00CEC9, #81ECEC)',
  gradientHot: 'linear-gradient(135deg, #FD79A8, #E17055)',
  gradientGold: 'linear-gradient(135deg, #FDCB6E, #F39C12)',
  gradientDark: 'linear-gradient(135deg, #2D3436, #636E72)',
  gradientStory: 'linear-gradient(135deg, #6C5CE7, #FD79A8, #FDCB6E)',

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
