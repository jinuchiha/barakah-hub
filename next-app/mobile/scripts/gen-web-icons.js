/* eslint-disable */
// Atmospheric "rising crescent" icon — night sky with subtle stars, soft
// halo, gradient gold crescent slightly off-centre (upper-right) like a
// moon emerging. Generates all sizes for next-app/public/.
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', '..', 'next-app', 'public');
fs.mkdirSync(OUT, { recursive: true });

// Palette — matches the web app brutalist Islamic theme
const SKY_DEEP = '#0a0f1a';   // far darker than ink so the moon pops
const SKY_MID = '#14171c';    // matches --color-ink
const SKY_NEAR = '#1d2127';   // card raised
const CREAM = '#ebe7dd';
const BONE = '#d6d2c7';
const DARK_GOLD = '#9c9588';
const HALO = 'rgba(235,231,221,0.22)';

/**
 * Procedural star field — tiny dots scattered around the crescent.
 * Deterministic (seeded) so each render of the same size is identical.
 */
function stars(size, count) {
  // Simple LCG seeded by `size` so 192/512/etc each have a stable layout.
  let seed = size * 9973;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = rand() * size;
    const y = rand() * size * 0.7;          // bias upper half (sky)
    const r = 0.4 + rand() * 1.1;            // 0.4–1.5 px
    const a = 0.3 + rand() * 0.5;            // 0.3–0.8 opacity
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${CREAM}" opacity="${a.toFixed(2)}"/>`;
  }
  return out;
}

/**
 * Atmospheric crescent SVG — night sky, stars, soft halo, gradient
 * crescent rising slightly off-centre.
 */
function risingCrescent(size, glyphScale = 0.55, withStars = true) {
  const gs = Math.round(size * glyphScale);
  // Place crescent slightly up + right for "rising" feel
  const cx = size * 0.5 + size * 0.04;
  const cy = size * 0.5 - size * 0.02;
  const offset = cx - gs / 2;
  const offsetY = cy - gs / 2;
  const haloR = gs * 0.78;

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <radialGradient id="sky" cx="${(cx / size * 100).toFixed(1)}%" cy="${(cy / size * 100).toFixed(1)}%" r="75%">
        <stop offset="0%" stop-color="${SKY_NEAR}"/>
        <stop offset="60%" stop-color="${SKY_MID}"/>
        <stop offset="100%" stop-color="${SKY_DEEP}"/>
      </radialGradient>
      <radialGradient id="halo" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${HALO}" stop-opacity="0.85"/>
        <stop offset="55%" stop-color="${HALO}" stop-opacity="0.30"/>
        <stop offset="100%" stop-color="${HALO}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="moon" x1="15%" y1="20%" x2="85%" y2="80%">
        <stop offset="0%" stop-color="${CREAM}"/>
        <stop offset="50%" stop-color="${BONE}"/>
        <stop offset="100%" stop-color="${DARK_GOLD}"/>
      </linearGradient>
      <mask id="crmask${size}">
        <rect width="128" height="128" fill="black"/>
        <circle cx="60" cy="64" r="50" fill="white"/>
        <circle cx="82" cy="56" r="44" fill="black"/>
      </mask>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#sky)"/>
    ${withStars ? stars(size, Math.round(size / 22)) : ''}
    <circle cx="${cx}" cy="${cy}" r="${haloR}" fill="url(#halo)"/>
    <g transform="translate(${offset.toFixed(1)} ${offsetY.toFixed(1)})">
      <svg width="${gs}" height="${gs}" viewBox="0 0 128 128">
        <circle cx="60" cy="64" r="50" fill="url(#moon)" mask="url(#crmask${size})"/>
      </svg>
    </g>
  </svg>`);
}

async function gen(name, size, glyphScale, withStars = true) {
  const out = path.join(OUT, name);
  await sharp(risingCrescent(size, glyphScale, withStars)).png({ compressionLevel: 9 }).toFile(out);
  console.log(`✓ ${name} ${size}×${size}`);
}

(async () => {
  // Favicon — too small for stars to read; skip them
  await gen('icon.png', 64, 0.6, false);
  await gen('icon-192.png', 192, 0.56);
  await gen('icon-512.png', 512, 0.56);
  // Maskable: glyph in safe zone (66%), no stars (would crop awkwardly)
  await gen('icon-maskable-512.png', 512, 0.46, false);
  await gen('apple-icon.png', 180, 0.56);

  // SVG versions for crisp web rendering
  fs.writeFileSync(path.join(OUT, 'icon.svg'), risingCrescent(128, 0.56).toString());
  fs.writeFileSync(path.join(OUT, 'icon-maskable.svg'), risingCrescent(128, 0.46, false).toString());
  console.log('✓ icon.svg, icon-maskable.svg');

  console.log('\nAll atmospheric icons generated to next-app/public/');
})().catch((e) => { console.error(e); process.exit(1); });
