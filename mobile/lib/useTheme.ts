import { createContext, useContext } from 'react';
import { darkColors, lightColors, type ColorScheme } from './theme';

export type ThemeMode = 'dark' | 'light';

export interface ThemeContextValue {
  mode: ThemeMode;
  colors: ColorScheme;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  colors: darkColors,
  toggleTheme: () => undefined,
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export function getColors(mode: ThemeMode): ColorScheme {
  return mode === 'dark' ? darkColors : lightColors;
}
