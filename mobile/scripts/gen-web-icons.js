/* eslint-disable */
// One-shot script — generates static PNG icons for next-app/public/ from the
// Barakah Hub crescent SVG. Run from mobile/ (which has sharp installed):
//   node scripts/gen-web-icons.js
// Replaces the dynamic /icon-* routes in next-app — those pulled in
// @vercel/og (resvg.wasm + yoga.wasm + fonts) and pushed the Worker over
// Cloudflare's free-tier 3 MiB limit.
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', '..', 'next-app', 'public');
fs.mkdirSync(OUT, { recursive: true });

const INK = '#14171c';
const CREAM = '#ebe7dd';

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

async function gen(name, size, glyphScale = 0.62) {
  const out = path.join(OUT, name);
  await sharp(crescentSVG(size, glyphScale)).png().toFile(out);
  console.log(`✓ ${name} ${size}×${size}`);
}

(async () => {
  await gen('icon-192.png', 192, 0.62);
  await gen('icon-512.png', 512, 0.62);
  // Maskable icon — keep glyph in the inner 80% safe zone, so glyphScale ~0.5
  await gen('icon-maskable-512.png', 512, 0.5);
  // Favicon (64x64) — Next.js used to generate this at /icon dynamically
  await gen('icon.png', 64, 0.62);
  // Larger one for apple-touch-icon
  await gen('apple-icon.png', 180, 0.62);
  console.log('All static icons generated to next-app/public/');
})().catch((e) => { console.error(e); process.exit(1); });
