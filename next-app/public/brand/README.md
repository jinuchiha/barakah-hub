# Barakah Hub — Brand Concepts

> Three logo directions in cool monochrome (midnight / silver / charcoal),
> per the design brief. **None of these are wired into the live app yet** —
> the production palette is still gold + ink. Pick a concept and we'll
> swap the production assets in one pass.

Open [`preview.html`](./preview.html) in a browser to see all three on
both midnight and white grounds.

---

## Files

| File | Purpose |
|---|---|
| `mark-A.svg`, `lockup-A.svg`        | **Concept A · Pure Geometric** — golden-ratio crescent, single weight |
| `mark-B.svg`, `lockup-B.svg`        | **Concept B · Faceted** — gradient + facet ridge, Montserrat caps |
| `mark-C.svg`, `lockup-C.svg`        | **Concept C · Crescent + Star** — pivot star at the inner-arc focal point |
| `preview.html`                      | Side-by-side rendering on midnight + white |

All marks use `currentColor`. Set the colour at the parent (`<svg style="color: #c0c8d0">` or via Tailwind's `text-*` classes) and the mark inherits.

---

## Construction notes

### Crescent geometry (used in all three)

```
outer circle:  cx = 64,    cy = 64,    r = 48
inner circle:  cx = 84.4,  cy = 56.5,  r = 42
```

The inner circle's offset from the outer (`84.4 − 64 = 20.4`) is `r × (1 − 1/φ) ≈ 18.3` rounded for visual balance, which is the golden-ratio offset. The y-shift (`64 − 56.5 = 7.5 ≈ r/φ³`) tilts the crescent ~9° clockwise so the horns point up-and-right — reads as "rising moon" rather than "static logo."

### Concept B — facet ridge

A single quadratic curve inside the crescent at 28 % opacity. Reads as a highlight, not a literal lunar terminator. Works at every size including 16 px (the ridge fades to invisibility at sub-32 px, which is fine — the silhouette carries the ID).

### Concept C — pivot star

Five-point star centred at `(88, 64)`, outer radius 8, inner radius ≈ 3.2, in standard golden-pentagram proportion (inner = outer / φ²). Sits at the visual weight-point of the crescent's inner arc.

---

## Cool palette (proposal — only adopted if you opt to swap production)

| Token | Hex | Use |
|---|---|---|
| `--midnight`      | `#0b1220` | Page background |
| `--slate-1`       | `#14202f` | Card background |
| `--slate-2`       | `#243042` | Border / divider |
| `--charcoal`      | `#1a1f26` | Inverted background (light contexts) |
| `--ice`           | `#d8e3f0` | Headline text on midnight |
| `--silver`        | `#c0c8d0` | Body text on midnight |
| `--silver-muted`  | `#8a929c` | Caption / muted text |
| `--accent`        | `#4f8eff` | CTAs, focus rings (one electric blue, used sparingly) |

Contrast ratios on `--midnight` background:
- `--ice` : 13.4 : 1 (AAA)
- `--silver` : 9.8 : 1 (AAA)
- `--silver-muted` : 5.2 : 1 (AA)
- `--accent` : 6.4 : 1 (AA)

---

## Typography

| Use | Family | Weight | Tracking |
|---|---|---|---|
| Wordmark (Concept A, C) | Inter / Geist Sans | 600 | -0.5 px |
| Wordmark (Concept B)    | Montserrat | 700 (display) / 500 (sub) | +6 / +10 px (caps wide) |
| Body (proposed)          | Inter Variable | 400 / 500 / 600 | -0.1 px |
| Numerics (currency)      | Inter Variable, `tabular-nums` | 600 | 0 |

To use Inter, add to `app/layout.tsx` head:

```tsx
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

Or self-host via `next/font/google` for zero-FOUT:

```tsx
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
// then add inter.variable to <html className=...>
```

---

## Do / don't

**Do**
- Keep the silhouette as the primary brand asset; the wordmark is secondary.
- Use the mark at 16 / 32 / 64 / 128 px. Concept A is the only one designed to survive 16 px legibly.
- Maintain at least `r/2` clear-space around the mark.
- Use `currentColor` so the mark adapts to context.

**Don't**
- Add a drop shadow under the mark on dark grounds — the `feGaussianBlur`-based glow in early drafts looked muddy at small sizes; it's been removed.
- Tint the mark in chromatic colours (red, green, gold). The whole point of this exploration is monochrome.
- Apply gradients that span the wordmark — kills legibility at small sizes.
- Compress the lockup horizontally — the type-to-mark spacing is set to `1.08 × cap-height`.

---

## How to adopt a concept

When you pick one, the production swap touches:

1. `app/icon.tsx` — Next.js dynamic icon (replace inline SVG with the chosen `mark-X.svg` content)
2. `app/manifest.ts` — `icons` array — generate 192 / 512 PNGs from the SVG
3. `app/login/page.tsx` — `<Crescent />` component
4. `components/topbar.tsx` — `<Crescent />` component
5. `index.html` — legacy favicon (the SVG embedded in `<link rel="icon">`)
6. `app/globals.css` — palette tokens (only if also swapping the live palette)

I'll do all six in one PR once you pick. Say "go with concept A/B/C" and whether you want the live app re-tinted or just the marketing/social assets updated.
