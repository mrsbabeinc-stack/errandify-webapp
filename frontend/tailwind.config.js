/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'errandify-orange': '#FF7A29',
        'errandify-brown': '#4A3221',
        'errandify-bg': '#FFFAF6',
        'admin-bg-light': '#FFF9F5',
        'admin-bg-peach': '#FFF0E5',
      },
      backgroundImage: {
        'admin-gradient': 'linear-gradient(135deg, #FFF9F5 0%, #FFF0E5 100%)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      fontSize: {
        base: '16px',
      },
      keyframes: {
        slideup: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        slideup: 'slideup 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
