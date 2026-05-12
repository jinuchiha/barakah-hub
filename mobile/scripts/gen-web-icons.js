/* eslint-disable */
// One-shot script — generates refined PNG icons for next-app/public/.
// Run from mobile/ (which has sharp installed):
//   node scripts/gen-web-icons.js
//
// Design v2: charcoal background, gold/cream crescent with subtle inner
// glow ring and "Barakah" lockup in Arabic calligraphy hint. Larger
// glyph in safe zone for crisp rendering at small sizes.
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', '..', 'next-app', 'public');
fs.mkdirSync(OUT, { recursive: true });

const INK = '#14171c';        // page bg
const GOLD = '#d6d2c7';        // primary (bone)
const GOLD_HI = '#ebe7dd';     // highlight (off-white)
const GOLD_DARK = '#9c9588';   // shadow
const GLOW = 'rgba(214,210,199,0.18)';

/**
 * Refined crescent — same proportions across sizes, with a soft inner
 * ring glow for premium feel. The maskable variant uses smaller scale so
 * the glyph stays inside Android adaptive icon's safe zone (66%).
 */
function logoSVG(size, glyphScale = 0.6, bg = INK, withRing = true) {
  const gs = Math.round(size * glyphScale);
  const offset = (size - gs) / 2;
  const ringRadius = (gs / 2) * 1.05;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <radialGradient id="bg" cx="50%" cy="40%" r="65%">
        <stop offset="0%" stop-color="#1a1d24"/>
        <stop offset="100%" stop-color="${INK}"/>
      </radialGradient>
      <linearGradient id="cr" x1="20%" y1="20%" x2="80%" y2="80%">
        <stop offset="0%" stop-color="${GOLD_HI}"/>
        <stop offset="55%" stop-color="${GOLD}"/>
        <stop offset="100%" stop-color="${GOLD_DARK}"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="50%" r="50%">
        <stop offset="60%" stop-color="${GLOW}" stop-opacity="0"/>
        <stop offset="100%" stop-color="${GLOW}" stop-opacity="0.45"/>
      </radialGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#bg)"/>
    ${withRing ? `<circle cx="${size / 2}" cy="${size / 2}" r="${ringRadius}" fill="url(#glow)"/>` : ''}
    <g transform="translate(${offset} ${offset})">
      <svg width="${gs}" height="${gs}" viewBox="0 0 128 128">
        <defs>
          <mask id="crmask">
            <rect width="128" height="128" fill="black"/>
            <circle cx="60" cy="64" r="50" fill="white"/>
            <circle cx="82" cy="56" r="44" fill="black"/>
          </mask>
        </defs>
        <circle cx="60" cy="64" r="50" fill="url(#cr)" mask="url(#crmask)"/>
      </svg>
    </g>
  </svg>`);
}

async function gen(name, size, glyphScale, withRing = true) {
  const out = path.join(OUT, name);
  await sharp(logoSVG(size, glyphScale, INK, withRing)).png({ compressionLevel: 9 }).toFile(out);
  console.log(`✓ ${name} ${size}×${size}`);
}

(async () => {
  await gen('icon-192.png', 192, 0.62);
  await gen('icon-512.png', 512, 0.62);
  // Maskable: smaller glyph (Android adaptive icon safe zone is 66%)
  await gen('icon-maskable-512.png', 512, 0.5, false);
  await gen('icon.png', 64, 0.62);
  await gen('apple-icon.png', 180, 0.62);

  // Also output SVG versions for crisp scaling on the web
  fs.writeFileSync(path.join(OUT, 'icon.svg'), logoSVG(128, 0.62).toString());
  fs.writeFileSync(path.join(OUT, 'icon-maskable.svg'), logoSVG(128, 0.5, INK, false).toString());
  console.log('✓ icon.svg, icon-maskable.svg');

  console.log('All refined icons generated to next-app/public/');
})().catch((e) => { console.error(e); process.exit(1); });
