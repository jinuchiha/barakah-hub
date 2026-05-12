/* eslint-disable */
// Generates the PNG icons + splash referenced by app.json from the Barakah Hub
// crescent SVG. Run once with `node scripts/gen-icons.js` — outputs into
// assets/images/.
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', 'assets', 'images');
fs.mkdirSync(OUT, { recursive: true });

const INK = '#0a0a0f';
const CREAM = '#ebe7dd';

// Crescent SVG — same mark used by the web app, at a generous size so the
// rasteriser doesn't blur the edge.
function crescentSVG(size, glyphScale = 0.6, bg = INK) {
  const gs = Math.round(size * glyphScale);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${bg}"/>
    <g transform="translate(${(size - gs) / 2} ${(size - gs) / 2})">
      <svg width="${gs}" height="${gs}" viewBox="0 0 128 128">
        <defs>
          <mask id="cr">
            <rect width="128" height="128" fill="black"/>
            <circle cx="64" cy="64" r="48" fill="white"/>
            <circle cx="84.4" cy="56.5" r="42" fill="black"/>
          </mask>
        </defs>
        <circle cx="64" cy="64" r="48" fill="${CREAM}" mask="url(#cr)"/>
      </svg>
    </g>
  </svg>`);
}

async function gen(name, size, glyphScale, bg) {
  const out = path.join(OUT, name);
  await sharp(crescentSVG(size, glyphScale, bg)).png().toFile(out);
  console.log(`✓ ${name} ${size}×${size}`);
}

(async () => {
  // App icon — 1024×1024 (Expo will downscale per density)
  await gen('icon.png', 1024, 0.62);
  // Adaptive icon foreground — keep glyph in safe zone (66% of canvas)
  await gen('adaptive-icon.png', 1024, 0.5);
  // Splash — also 1024×1024 with smaller glyph so it sits centred on launch
  await gen('splash.png', 1024, 0.45);
  console.log('All icons generated to assets/images/');
})().catch((e) => { console.error(e); process.exit(1); });
