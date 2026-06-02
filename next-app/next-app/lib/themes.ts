/** All 11 theme palettes — applied via `<html class={`theme-${key}`}>` */
export const THEMES = {
  gold:     { name: 'Royal Gold' },
  emerald:  { name: 'Emerald' },
  sapphire: { name: 'Sapphire' },
  ruby:     { name: 'Ruby' },
  amethyst: { name: 'Amethyst' },
  bronze:   { name: 'Bronze' },
  forest:   { name: 'Forest' },
  midnight: { name: 'Midnight' },
  copper:   { name: 'Copper' },
  slate:    { name: 'Graphite' },
  charcoal: { name: 'Charcoal' },
} as const;

export type ThemeKey = keyof typeof THEMES;
export const themeKeys = Object.keys(THEMES) as ThemeKey[];
