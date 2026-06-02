import * as React from 'react';

/**
 * Barakah Hub mark — Concept A (Pure Geometric Crescent).
 *
 * Geometry: outer circle r=48 at (64,64); inner circle r=42 at (84.4, 56.5).
 * Inner offset = r × (1 − 1/φ) ≈ 18.3, rounded to 20.4 for visual balance.
 * Y-shift ≈ r/φ³ tilts the crescent ~9° clockwise so the horns point up-right.
 *
 * Tints via `currentColor` — set the colour at the parent.
 */
export function Crescent({
  className,
  title = 'Barakah Hub',
  ...props
}: React.SVGAttributes<SVGSVGElement> & { title?: string }) {
  const maskId = React.useId();
  return (
    <svg
      viewBox="0 0 128 128"
      role="img"
      aria-label={title}
      className={className}
      {...props}
    >
      <defs>
        <mask id={maskId}>
          <rect width="128" height="128" fill="black" />
          <circle cx="64" cy="64" r="48" fill="white" />
          <circle cx="84.4" cy="56.5" r="42" fill="black" />
        </mask>
      </defs>
      <circle cx="64" cy="64" r="48" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
}
