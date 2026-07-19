/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ── Brand ──────────────────────────────────────────────
        ink: '#0D1B2E',
        navy: {
          50:  '#EEF3F9',
          100: '#D5E2EF',
          200: '#AABFD8',
          300: '#7699BC',
          400: '#4A7BA5',
          500: '#2D6090',
          600: '#1F4B73',
          700: '#163A5A',
          800: '#0E2840',
          900: '#081929',
        },
        amber: {
          50:  '#FEF9EC',
          100: '#FBEACC',
          300: '#F5C842',
          400: '#E2A63B',
          500: '#CC8E28',
          600: '#A87220',
        },
        // ── Semantic status ────────────────────────────────────
        status: {
          pending:    '#92805A',
          confirmed:  '#2D6090',
          processing: '#7C5CBF',
          shipping:   '#CC8E28',
          delivered:  '#2E7D5B',
          cancelled:  '#C0392B',
          quote:      '#0E7C6B',
        },
        // ── Neutral surface ────────────────────────────────────
        canvas:   '#F0F4F8',
        surface:  '#FAFBFC',
        border:   '#DDE3EB',
        muted:    '#8896A4',
        // ── Semantic utility ──────────────────────────────────
        success:  '#1A7A4E',
        warning:  '#CC8E28',
        danger:   '#C0392B',
        info:     '#2D6090',
      },
      fontFamily: {
        display: ['Vazirmatn', 'sans-serif'],
        body:    ['Vazirmatn', 'sans-serif'],
        mono:    ['Vazirmatn', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem',  { lineHeight: '1rem'  }],
        xs:    ['0.75rem',  { lineHeight: '1.1rem' }],
        sm:    ['0.8125rem',{ lineHeight: '1.25rem'}],
        base:  ['0.875rem', { lineHeight: '1.5rem' }],
        md:    ['1rem',     { lineHeight: '1.5rem' }],
        lg:    ['1.125rem', { lineHeight: '1.75rem'}],
        xl:    ['1.25rem',  { lineHeight: '1.75rem'}],
        '2xl': ['1.5rem',   { lineHeight: '2rem'  }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem'}],
      },
      spacing: {
        4.5: '1.125rem',
        13:  '3.25rem',
        18:  '4.5rem',
        22:  '5.5rem',
        68:  '17rem',
        72:  '18rem',
        80:  '20rem',
      },
      borderRadius: {
        sm:   '0.375rem',
        DEFAULT: '0.5rem',
        md:   '0.625rem',
        lg:   '0.75rem',
        xl:   '1rem',
        '2xl':'1.25rem',
        '3xl':'1.5rem',
      },
      boxShadow: {
        card:  '0 1px 3px 0 rgba(13,27,46,.06), 0 1px 2px -1px rgba(13,27,46,.04)',
        modal: '0 20px 60px -10px rgba(13,27,46,.25)',
        dropdown: '0 8px 24px -4px rgba(13,27,46,.18)',
        sm:    '0 1px 2px 0 rgba(13,27,46,.06)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        fadeIn:  { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { from: { opacity: '0', transform: 'translateX(10px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        scaleIn: { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
        fadeIn:  'fadeIn 0.2s ease-out',
        slideIn: 'slideIn 0.2s ease-out',
        scaleIn: 'scaleIn 0.15s ease-out',
      },
    },
  },
  plugins: [],
};
