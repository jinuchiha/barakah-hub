import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Combine Tailwind classes safely. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Initials from a name (2 chars). */
export function ini(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

/** Random hex color from a curated palette (deterministic if seed provided). */
export function pickColor(seed?: string): string {
  const palette = ['#c9a84c', '#1f6e4a', '#2d5a8c', '#a83254', '#5e4691', '#a0671e', '#2d6a4f', '#3a4a7a', '#b85a2e', '#475569'];
  if (!seed) return palette[Math.floor(Math.random() * palette.length)];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

/** Pakistan phone normalization for WhatsApp (`03xx-xxxxxxx` → `923xx...`). */
export function normalizePkPhone(phone?: string | null): string | null {
  if (!phone) return null;
  let p = phone.replace(/\D/g, '');
  if (p.length === 11 && p.startsWith('0')) return '92' + p.slice(1);
  if (p.length === 10 && p.startsWith('3')) return '92' + p;
  if (p.length >= 10) return p;
  return null;
}
