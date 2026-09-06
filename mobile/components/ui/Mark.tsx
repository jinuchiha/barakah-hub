import React from 'react';
import Svg, { Circle, Defs, Mask, Rect } from 'react-native-svg';

/**
 * The Barakah mark — the single source for the symbol in-app.
 *
 * The app previously drew five visually different crescents: the raster
 * launcher icon, a Skia one in the background field, three unused SVG
 * explorations on the web side, and — on the loading screen — a
 * `MaterialCommunityIcons` "star-crescent" glyph, which was a third-party
 * icon-font character rather than the brand at all. This component and the
 * generated image assets are now built from the same construction.
 *
 * Geometry (128 grid): outer circle r48 at (64,64), inner circle r40 at
 * (77.1, 59.2). The offset follows the golden-ratio construction the original
 * mark used, pulled in far enough that the form wraps ~264 degrees. The deeper
 * wrap is deliberate: it reads as something held rather than a night sky, and
 * it keeps the mass that lets the shape survive at 24px, which the earlier
 * star-and-octagram version did not.
 */
export function Mark({ size = 56, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 128 128" accessibilityRole="image" accessibilityLabel="Barakah">
      <Defs>
        <Mask id="barakah-mark">
          <Rect width="128" height="128" fill="black" />
          <Circle cx="64" cy="64" r="48" fill="white" />
          <Circle cx="77.1" cy="59.2" r="40" fill="black" />
        </Mask>
      </Defs>
      <Circle cx="64" cy="64" r="48" fill={color} mask="url(#barakah-mark)" />
    </Svg>
  );
}
