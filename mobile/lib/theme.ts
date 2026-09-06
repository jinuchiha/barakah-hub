// Modern fintech palette — mirrors the web (Linear/Mercury school).
// Deep ink, NEUTRAL hairlines, gold used like an accent (CTAs, totals,
// active rail), not as paint on every border.
// v2 — "midnight vault": a deeper blue-black ink ramp with real elevation
// separation (each step visibly lighter AND slightly bluer, so stacked
// surfaces read as depth even without iOS blur), champagne-gold accent ramp,
// and luminous hairlines. surfaceGradA/B + sheen are what give every card a
// lit, dimensional face on Android, where BlurView never renders.
export const darkColors = {
  bg0: '#060a14',           // page — near-black with blue depth
  bg1: '#0d1424',           // card
  bg2: '#16203a',           // elevated
  bg3: '#1e2b4d',           // higher elevation
  bg4: '#28375f',           // top elevation
  glass1: 'rgba(255,255,255,0.03)',
  glass2: 'rgba(255,255,255,0.05)',
  glass3: 'rgba(255,255,255,0.09)',
  glassBorder: 'rgba(255,255,255,0.12)',
  primary: '#d4a94c',       // champagne gold — CTAs, totals, rails
  primaryMuted: '#8a8272',
  primaryDim: 'rgba(212,169,76,0.14)',
  primaryGlow: 'rgba(212,169,76,0.32)',
  gold: '#e8c56b',
  goldMuted: '#8a8272',
  goldDim: 'rgba(232,197,107,0.14)',
  accent: '#34a06f',        // money green — verified, paid, success
  accentDim: 'rgba(52,160,111,0.14)',
  danger: '#e05e5e',
  dangerDim: 'rgba(224,94,94,0.14)',
  text1: '#f2f0ea',
  text2: 'rgba(242,240,234,0.84)',
  text3: 'rgba(242,240,234,0.62)',
  text4: 'rgba(242,240,234,0.42)',
  border1: 'rgba(255,255,255,0.12)',     // neutral hairline
  border2: 'rgba(255,255,255,0.20)',     // emphasized
  /** Top-edge light line on cards/docks — the "lit surface" cue. */
  sheen: 'rgba(255,255,255,0.10)',
  /** Card face gradient stops (top-left → bottom-right). */
  surfaceGradA: '#131c33',
  surfaceGradB: '#0b111f',
  shadowGreen: 'rgba(52,160,111,0.25)',
  shadowBlue: 'rgba(96,141,215,0.22)',
  shadowGold: 'rgba(212,169,76,0.28)',
  success: '#34a06f',
  // Amber, deliberately OFF the gold ramp. Until now `warning` was the exact
  // same hex as `primary`, so a pending payment and a primary CTA rendered in
  // the same colour — the root cause of gold reading as "everything".
  warning: '#e08a3c',
  info: '#6d97e0',

  // --- Semantic split ----------------------------------------------------
  /** Brand identity accent. Rare and intentional — never the default text or
   *  icon colour, and never a status. */
  brandGold: '#d4a94c',
  /** Primary action. The same value as brandGold today by choice, but a
   *  separate token so the two can diverge without a sweep, and so intent is
   *  legible at the call site. */
  actionPrimary: '#d4a94c',
  /** Ink for text/icons sitting ON actionPrimary. */
  onAction: '#0b0f19',
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
  primary: '#0d5a3a',
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
  sheen: 'rgba(255,255,255,0.85)',
  surfaceGradA: '#ffffff',
  surfaceGradB: '#f2f6fa',
  shadowGreen: 'rgba(26,122,74,0.15)',
  shadowBlue: 'rgba(59,130,246,0.15)',
  shadowGold: 'rgba(245,158,11,0.15)',
  success: '#1a7a4a',
  warning: '#b45309',            // amber-700 — readable on a light ground
  info: '#3b82f6',
  // Light-theme gold is contrast-corrected: #d4a94c on #f4f2ec measures
  // 1.96:1, below the 3:1 required of meaningful non-text graphics.
  brandGold: '#9c7a2e',
  actionPrimary: '#0d5a3a',
  onAction: '#ffffff',
} as const;

export const amoledColors = {
  bg0: '#000000',
  bg1: '#000000',
  bg2: '#0a0a0a',
  bg3: '#111111',
  bg4: '#1a1a1a',
  glass1: 'rgba(255,255,255,0.03)',
  glass2: 'rgba(255,255,255,0.06)',
  glass3: 'rgba(255,255,255,0.10)',
  glassBorder: 'rgba(255,255,255,0.08)',
  primary: '#00e676',
  primaryMuted: '#00c853',
  primaryDim: 'rgba(0,230,118,0.12)',
  primaryGlow: 'rgba(0,230,118,0.25)',
  gold: '#ffd740',
  goldMuted: '#ffab00',
  goldDim: 'rgba(255,215,64,0.12)',
  accent: '#448aff',
  accentDim: 'rgba(68,138,255,0.12)',
  danger: '#ff5252',
  dangerDim: 'rgba(255,82,82,0.12)',
  text1: '#ffffff',
  text2: 'rgba(255,255,255,0.80)',
  text3: 'rgba(255,255,255,0.58)',
  text4: 'rgba(255,255,255,0.38)',
  border1: 'rgba(255,255,255,0.10)',
  border2: 'rgba(255,255,255,0.16)',
  sheen: 'rgba(255,255,255,0.08)',
  surfaceGradA: '#101010',
  surfaceGradB: '#050505',
  shadowGreen: 'rgba(0,230,118,0.20)',
  shadowBlue: 'rgba(68,138,255,0.20)',
  shadowGold: 'rgba(255,215,64,0.20)',
  success: '#00e676',
  warning: '#ff9100',
  info: '#448aff',
  brandGold: '#ffd740',
  actionPrimary: '#00e676',
  onAction: '#000000',
} as const;

export const cyberpunkColors = {
  bg0: '#0d0015',
  bg1: '#130020',
  bg2: '#1a0030',
  bg3: '#220040',
  bg4: '#2c0055',
  glass1: 'rgba(255,0,255,0.04)',
  glass2: 'rgba(255,0,255,0.08)',
  glass3: 'rgba(255,0,255,0.13)',
  glassBorder: 'rgba(255,0,255,0.18)',
  primary: '#00ffcc',
  primaryMuted: '#00ddb3',
  primaryDim: 'rgba(0,255,204,0.15)',
  primaryGlow: 'rgba(0,255,204,0.35)',
  gold: '#ff00ff',
  goldMuted: '#cc00cc',
  goldDim: 'rgba(255,0,255,0.18)',
  accent: '#ff2d78',
  accentDim: 'rgba(255,45,120,0.18)',
  danger: '#ff3333',
  dangerDim: 'rgba(255,51,51,0.15)',
  text1: '#f0e8ff',
  text2: 'rgba(240,232,255,0.80)',
  text3: 'rgba(240,232,255,0.50)',
  text4: 'rgba(240,232,255,0.28)',
  border1: 'rgba(255,0,255,0.12)',
  border2: 'rgba(255,0,255,0.22)',
  sheen: 'rgba(255,0,255,0.14)',
  surfaceGradA: '#1c0033',
  surfaceGradB: '#10001c',
  shadowGreen: 'rgba(0,255,204,0.30)',
  shadowBlue: 'rgba(255,45,120,0.25)',
  shadowGold: 'rgba(255,0,255,0.28)',
  success: '#00ffcc',
  warning: '#ff9100',
  info: '#ff2d78',
  brandGold: '#ff00ff',
  actionPrimary: '#00ffcc',
  onAction: '#0d0015',
} as const;

export const desertColors = {
  bg0: '#1a1208',
  bg1: '#221a0c',
  bg2: '#2d2210',
  bg3: '#382b14',
  bg4: '#44341a',
  glass1: 'rgba(255,220,130,0.04)',
  glass2: 'rgba(255,220,130,0.08)',
  glass3: 'rgba(255,220,130,0.13)',
  glassBorder: 'rgba(255,220,130,0.16)',
  primary: '#2ed573',
  primaryMuted: '#26c065',
  primaryDim: 'rgba(46,213,115,0.15)',
  primaryGlow: 'rgba(46,213,115,0.30)',
  gold: '#f5c842',
  goldMuted: '#d4a831',
  goldDim: 'rgba(245,200,66,0.18)',
  accent: '#4dabf7',
  accentDim: 'rgba(77,171,247,0.15)',
  danger: '#ff6b6b',
  dangerDim: 'rgba(255,107,107,0.15)',
  text1: '#fef3dc',
  text2: 'rgba(254,243,220,0.80)',
  text3: 'rgba(254,243,220,0.62)',
  text4: 'rgba(254,243,220,0.42)',
  border1: 'rgba(255,220,130,0.13)',
  border2: 'rgba(255,220,130,0.22)',
  sheen: 'rgba(255,220,130,0.12)',
  surfaceGradA: '#2a2010',
  surfaceGradB: '#1c1509',
  shadowGreen: 'rgba(46,213,115,0.25)',
  shadowBlue: 'rgba(77,171,247,0.20)',
  shadowGold: 'rgba(245,200,66,0.28)',
  success: '#2ed573',
  warning: '#e07b39',
  info: '#4dabf7',
  brandGold: '#f5c842',
  actionPrimary: '#2ed573',
  onAction: '#1a1208',
} as const;

export type ColorScheme = Record<keyof typeof darkColors, string>;

export type ThemeName = 'dark' | 'light' | 'amoled' | 'cyberpunk' | 'desert';

export const ALL_THEMES: Record<ThemeName, ColorScheme> = {
  dark: darkColors,
  light: lightColors,
  amoled: amoledColors,
  cyberpunk: cyberpunkColors,
  desert: desertColors,
};

export function getThemeColors(theme: ThemeName): ColorScheme {
  return ALL_THEMES[theme];
}

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

// Legacy aliases
export const colors = darkColors;
export const typography = {
  // Display — big hero numbers (fund totals, large stats)
  display: { fontSize: 30, fontFamily: 'SpaceMono_400Regular', letterSpacing: -0.8, lineHeight: 36 },
  // Hero — section hero values
  hero: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.8, lineHeight: 34 },
  // H1 — page titles
  h1: { fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: -0.5, lineHeight: 30 },
  // H2 — section titles
  h2: { fontSize: 20, fontFamily: 'Inter_700Bold', letterSpacing: -0.3, lineHeight: 26 },
  // H3 — card titles
  h3: { fontSize: 17, fontFamily: 'Inter_600SemiBold', letterSpacing: -0.2, lineHeight: 22 },
  // Body large
  bodyLg: { fontSize: 16, fontFamily: 'Inter_400Regular', letterSpacing: -0.1, lineHeight: 24 },
  // Body
  body: { fontSize: 14, fontFamily: 'Inter_400Regular', letterSpacing: 0, lineHeight: 21 },
  // Body small
  bodySm: { fontSize: 13, fontFamily: 'Inter_400Regular', letterSpacing: 0, lineHeight: 19 },
  // Label (buttons, tags)
  label: { fontSize: 13, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.1, lineHeight: 18 },
  // Caption
  caption: { fontSize: 12, fontFamily: 'Inter_400Regular', letterSpacing: 0.2, lineHeight: 17 },
  // Overline (section headers)
  overline: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.4, lineHeight: 14 },
  // Mono (numbers, amounts)
  mono: { fontSize: 14, fontFamily: 'SpaceMono_400Regular', letterSpacing: -0.3, lineHeight: 20 },
  monoLg: { fontSize: 20, fontFamily: 'SpaceMono_400Regular', letterSpacing: -0.5, lineHeight: 26 },
} as const;
