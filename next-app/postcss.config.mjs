// Tailwind v4 ships its own PostCSS plugin; no separate tailwind.config.ts needed for tokens.
// Theme tokens live in app/globals.css under @theme.
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
