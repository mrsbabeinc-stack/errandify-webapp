/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand. Set to #FF6B35 — the value already hardcoded ~1,176 times in the
        // codebase — so the ~668 class-based usages now match instead of shipping
        // a second, slightly different orange alongside them.
        'errandify-orange': '#FF6B35',
        'errandify-orange-deep': '#D2521C', // accessible orange for text on light
        'errandify-orange-wash': '#FFEDE2', // tinted surface / chip background
        'errandify-brown': '#4A3221',
        'errandify-bg': '#FFFAF6',
        'admin-bg-light': '#FFF9F5',
        'admin-bg-peach': '#FFF0E5',

        // Kampung accents — used for state, never as a second brand colour.
        'kampung-jade': '#2FA48F',
        'kampung-jade-wash': '#E2F3EF',
        'kampung-sun': '#F0A81E',
        'kampung-sun-wash': '#FDF0D8',
        'kampung-rose': '#E2736B',
        'kampung-rose-wash': '#FCE9E6',

        // Semantic state. Kept separate from the brand accent so a dispute looks
        // the same in every module.
        ok: '#1E9E6A',
        'ok-wash': '#E2F3EF',
        warn: '#C98A16',
        'warn-wash': '#FDF0D8',
        danger: '#D8452F',
        'danger-wash': '#FCE9E6',

        // Warm neutral scale. This REPLACES Tailwind's default cool grey, which
        // was used ~3,120 times across all three modules and is the main reason
        // the app read as cold/harsh. Lightness relationships are preserved, so
        // existing contrast still holds — the hue just shifts toward the cocoa ink.
        gray: {
          50: '#FDF9F6',
          100: '#F8F1EB',
          200: '#F0E4DA',
          300: '#E3D2C4',
          400: '#C4AE9D',
          500: '#A8907C',
          600: '#806350',
          700: '#644C3C',
          800: '#4A3221',
          900: '#33220F',
        },
      },
      borderRadius: {
        // Density ladder: admin tightest, company mid, individual softest.
        admin: '6px',
        company: '10px',
        individual: '18px',
      },
      boxShadow: {
        // Warm-tinted shadows — cards feel lit rather than cut out.
        kampung: '0 8px 22px rgba(176, 96, 48, 0.12)',
        'kampung-sm': '0 3px 10px rgba(176, 96, 48, 0.09)',
      },
      backgroundImage: {
        'admin-gradient': 'linear-gradient(135deg, #FFF9F5 0%, #FFF0E5 100%)',
        'kampung-gradient': 'linear-gradient(135deg, #FF8A57 0%, #FF6B35 100%)',
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
