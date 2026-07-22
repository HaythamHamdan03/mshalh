/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/src/**/*.{js,ts,jsx,tsx}', './src/renderer/index.html'],
  theme: {
    extend: {
      colors: {
        bg: '#F7F1E6',
        card: '#FFFDF8',
        gold: {
          DEFAULT: '#D8A027',
          light: '#F0C55A',
          dark: '#A87820',
        },
        brown: {
          dark: '#3B2615',
          DEFAULT: '#7A5B35',
          light: '#A08060',
        },
        border: '#E7D8BD',
        success: '#2F6B3F',
        warning: '#B7791F',
        error: '#A33A2A',
        muted: '#9E8672',
      },
      fontFamily: {
        arabic: [
          'Noto Kufi Arabic',
          'Cairo',
          'Segoe UI',
          'Tahoma',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        card: '0 2px 12px rgba(59,38,21,0.07)',
        'card-hover': '0 4px 20px rgba(59,38,21,0.12)',
        gold: '0 0 0 2px rgba(216,160,39,0.3)',
      },
    },
  },
  plugins: [],
};
