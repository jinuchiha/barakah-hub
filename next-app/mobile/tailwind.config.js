/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './hooks/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a7a4a',
          light: '#2ecc71',
          dark: '#155f39',
        },
        secondary: {
          DEFAULT: '#f39c12',
          light: '#f5b942',
          dark: '#c87f0a',
        },
        background: '#f8f9fa',
        surface: '#ffffff',
        textPrimary: '#1a1a2e',
        textSecondary: '#6c757d',
        danger: '#e74c3c',
        success: '#27ae60',
        border: '#dee2e6',
        card: '#ffffff',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
