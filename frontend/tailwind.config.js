/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neobrutalism palette
        neo: {
          yellow:  '#FFE156',
          pink:    '#FF6B9D',
          lime:    '#C8FF44',
          blue:    '#5DFDCB',
          orange:  '#FF914D',
          purple:  '#C4B5FD',
          red:     '#FF4444',
          cream:   '#FFF8E7',
          bg:      '#FFFDF5',
        },
        // Keep indigo for accent consistency
        indigo: {
          50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe',
          300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1',
          600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81',
        },
        surface: {
          DEFAULT: '#FFFDF5',
          50: '#FFFFFF',
          100: '#FFFDF5',
          200: '#FFF8E7',
          300: '#FFEDCC',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      boxShadow: {
        // Neobrutalism solid shadows
        'neo-xs':   '2px 2px 0px 0px #1a1a1a',
        'neo-sm':   '3px 3px 0px 0px #1a1a1a',
        'neo-md':   '4px 4px 0px 0px #1a1a1a',
        'neo-lg':   '6px 6px 0px 0px #1a1a1a',
        'neo-xl':   '8px 8px 0px 0px #1a1a1a',
        // Colored shadows
        'neo-yellow': '4px 4px 0px 0px #FFE156',
        'neo-pink':   '4px 4px 0px 0px #FF6B9D',
        'neo-lime':   '4px 4px 0px 0px #C8FF44',
        'neo-blue':   '4px 4px 0px 0px #5DFDCB',
        // Hover shadow (reduced offset for press effect)
        'neo-hover':  '2px 2px 0px 0px #1a1a1a',
        'neo-active': '1px 1px 0px 0px #1a1a1a',
        'neo-none':   '0px 0px 0px 0px #1a1a1a',
        // Legacy
        'float': '0 8px 30px rgb(0 0 0 / 0.12)',
      },
      borderWidth: {
        '3': '3px',
      },
      borderRadius: {
        'neo': '8px',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      spacing: {
        '18': '4.5rem', '88': '22rem', '100': '25rem', '112': '28rem',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'neo': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'neo-bounce': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'neo-wiggle': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-2deg)' },
          '75%': { transform: 'rotate(2deg)' },
        },
      },
      animation: {
        'neo-bounce': 'neo-bounce 0.5s ease-in-out',
        'neo-wiggle': 'neo-wiggle 0.3s ease-in-out',
      },
    },
  },
  plugins: [],
};
