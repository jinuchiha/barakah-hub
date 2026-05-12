import { darkColors } from './theme';

export interface ChartDataPoint {
  x: number;
  y: number;
  label?: string;
}

export interface ChartConfig {
  primaryColor: string;
  goldColor: string;
  dangerColor: string;
  textColor: string;
  gridColor: string;
  backgroundColor: string;
}

export function getChartConfig(colors: typeof darkColors): ChartConfig {
  return {
    primaryColor: colors.primary,
    goldColor: colors.gold,
    dangerColor: colors.danger,
    textColor: colors.text3,
    gridColor: colors.border1,
    backgroundColor: 'transparent',
  };
}

export function normalizeToDataPoints(
  values: number[],
  labels?: string[],
): ChartDataPoint[] {
  return values.map((y, i) => ({
    x: i,
    y,
    label: labels?.[i],
  }));
}

export function formatCurrencyShort(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}
