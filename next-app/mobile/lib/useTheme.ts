import { createContext, useContext } from 'react';
import { darkColors, lightColors, type ColorScheme, type ThemeName, ALL_THEMES } from './theme';

// Keep backward-compat: ThemeMode is the 2-value toggle used in old code
export type ThemeMode = 'dark' | 'light';

export interface ThemeContextValue {
  mode: ThemeMode;
  themeName: ThemeName;
  colors: ColorScheme;
  toggleTheme: () => void;
  setTheme: (name: ThemeName) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  themeName: 'dark',
  colors: darkColors,
  toggleTheme: () => undefined,
  setTheme: () => undefined,
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export function getColors(mode: ThemeMode): ColorScheme {
  return mode === 'dark' ? darkColors : lightColors;
}

export function themeNameToMode(name: ThemeName): ThemeMode {
  return name === 'light' ? 'light' : 'dark';
}

export { ALL_THEMES };
