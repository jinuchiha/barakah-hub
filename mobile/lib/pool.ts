import type { useTheme } from './useTheme';
import type { FundPool } from '@/types';

type Colors = ReturnType<typeof useTheme>['colors'];

/** Single source of truth for pool → colour/icon, used across cards,
 *  the approval queue, and charts so a pool looks identical everywhere. */
export function poolColor(pool: FundPool | string, colors: Colors): string {
  if (pool === 'sadaqah') return colors.primary;
  if (pool === 'zakat') return colors.accent;
  return colors.gold; // qarz
}

export function poolIcon(pool: FundPool | string): 'hand-heart-outline' | 'star-circle-outline' | 'cash-multiple' {
  if (pool === 'sadaqah') return 'hand-heart-outline';
  if (pool === 'zakat') return 'star-circle-outline';
  return 'cash-multiple';
}
