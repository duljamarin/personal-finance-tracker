/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  safelist: [
    'dark:text-white',
    'text-white',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Tight"', '"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        brand: {
          50: '#eefbf7',
          100: '#d5f5ec',
          200: '#aeebdb',
          300: '#79dbc5',
          400: '#43c5aa',
          500: '#168b78',
          600: '#0f6b5e',
          700: '#0b5449',
          800: '#094438',
          900: '#07352b',
          950: '#041f1a',
        },
        surface: {
          DEFAULT: '#ffffff',
          secondary: '#f9fafb',
          page: '#FAFAF7',
          card: '#FFFFFF',
          hairline: '#EDEDE8',
          dark: '#0C0C0E',
          'dark-secondary': '#141417',
          'dark-tertiary': '#1A1A1E',
          'dark-elevated': '#222226',
          'dark-page': '#0A0A0B',
          'dark-card': '#111113',
          'dark-hairline': '#1F1F22',
        },
        ink: {
          primary: '#111112',
          muted: '#2F2F2C',
          'dark-primary': '#FFFFFF',
          'dark-muted': '#FFFFFF',
        },
        expense: {
          DEFAULT: '#e8394d',
          light: '#f06070',
          bg: '#fdf2f4',
          'dark-bg': 'rgba(232,57,77,0.12)',
        },
        border: {
          DEFAULT: '#e5e7eb',
          dark: '#27272a',
        },
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
        sm: '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.03)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.03)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.05), 0 8px 10px -6px rgb(0 0 0 / 0.03)',
      },
      animation: {
        'fade-out': 'fadeOut 0.5s ease-in-out 1.5s forwards',
        'in': 'animateIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slideInLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        animateIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
