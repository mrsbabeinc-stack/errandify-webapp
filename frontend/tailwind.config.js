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
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      fontSize: {
        base: '16px',
      },
    },
  },
  plugins: [],
};
