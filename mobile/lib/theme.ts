export const darkColors = {
  bg0: '#0a0a0f',
  bg1: '#111118',
  bg2: '#1a1a24',
  bg3: '#22222e',
  bg4: '#2a2a38',
  glass1: 'rgba(255,255,255,0.04)',
  glass2: 'rgba(255,255,255,0.08)',
  glass3: 'rgba(255,255,255,0.12)',
  glassBorder: 'rgba(255,255,255,0.10)',
  primary: '#00e676',
  primaryMuted: '#00c853',
  primaryDim: 'rgba(0,230,118,0.15)',
  primaryGlow: 'rgba(0,230,118,0.30)',
  gold: '#ffd740',
  goldMuted: '#ffab00',
  goldDim: 'rgba(255,215,64,0.15)',
  accent: '#448aff',
  accentDim: 'rgba(68,138,255,0.15)',
  danger: '#ff5252',
  dangerDim: 'rgba(255,82,82,0.15)',
  text1: '#ffffff',
  text2: 'rgba(255,255,255,0.75)',
  text3: 'rgba(255,255,255,0.45)',
  text4: 'rgba(255,255,255,0.25)',
  border1: 'rgba(255,255,255,0.08)',
  border2: 'rgba(255,255,255,0.14)',
  shadowGreen: 'rgba(0,230,118,0.25)',
  shadowBlue: 'rgba(68,138,255,0.25)',
  shadowGold: 'rgba(255,215,64,0.25)',
  success: '#00e676',
  warning: '#ffd740',
  info: '#448aff',
} as const;

export const lightColors = {
  bg0: '#f0f4f8',
  bg1: '#f8fafc',
  bg2: '#ffffff',
  bg3: '#f1f5f9',
  bg4: '#e2e8f0',
  glass1: 'rgba(255,255,255,0.70)',
  glass2: 'rgba(255,255,255,0.85)',
  glass3: 'rgba(255,255,255,0.95)',
  glassBorder: 'rgba(255,255,255,0.60)',
  primary: '#1a7a4a',
  primaryMuted: '#2ecc71',
  primaryDim: 'rgba(26,122,74,0.12)',
  primaryGlow: 'rgba(26,122,74,0.20)',
  gold: '#f59e0b',
  goldMuted: '#d97706',
  goldDim: 'rgba(245,158,11,0.12)',
  accent: '#3b82f6',
  accentDim: 'rgba(59,130,246,0.12)',
  danger: '#ef4444',
  dangerDim: 'rgba(239,68,68,0.12)',
  text1: '#0f172a',
  text2: '#334155',
  text3: '#64748b',
  text4: '#94a3b8',
  border1: 'rgba(0,0,0,0.06)',
  border2: 'rgba(0,0,0,0.10)',
  shadowGreen: 'rgba(26,122,74,0.15)',
  shadowBlue: 'rgba(59,130,246,0.15)',
  shadowGold: 'rgba(245,158,11,0.15)',
  success: '#1a7a4a',
  warning: '#f59e0b',
  info: '#3b82f6',
} as const;

export type ColorScheme = {
  [K in keyof typeof darkColors]: string;
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  full: 9999,
} as const;

// Legacy aliases kept for backward compat while migration completes
export const colors = darkColors;
export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '500' as const },
} as const;
