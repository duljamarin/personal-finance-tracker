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
        display: ['"Hanken Grotesk"', '"Inter Tight"', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      // Named type scale (see .claude/design-system.md §2). Each step bakes in
      // size + line-height + weight so components use `text-title` rather than
      // re-deriving `text-2xl font-semibold font-display` everywhere.
      fontSize: {
        display: ['2.75rem', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '600' }],
        title:   ['1.5rem',  { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '600' }],
        heading: ['1.125rem', { lineHeight: '1.3', fontWeight: '600' }],
        body:    ['0.9375rem', { lineHeight: '1.5', fontWeight: '500' }],
        label:   ['0.8125rem', { lineHeight: '1.4', fontWeight: '500' }],
      },
      colors: {
        // ── Brand (warm teal) ──────────────────────────────────────────────
        // Tokens read CSS vars (defined in index.css) with a hex fallback so
        // inline styles / SVG fills can reference the same var(--c-*). See
        // .claude/design-system.md §2.
        brand: {
          50: '#eefbf7',
          100: '#d5f5ec',
          200: '#aeebdb',
          300: '#79dbc5',
          400: '#43c5aa',
          accent: 'var(--c-brand-accent, #22AD93)', // dark-mode accent teal (was the stray #22AD93)
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
          'dark-deep': '#0a1a17', // landing dark band
        },
        ink: {
          primary: '#111112',
          muted: '#2F2F2C',
          'dark-primary': '#FFFFFF',
          'dark-muted': '#FFFFFF',
        },
        // ── Semantic: expense / negative / over-budget (single canonical red)
        expense: {
          DEFAULT: 'var(--c-expense, #e8394d)',
          light: '#f06070',
          bg: 'var(--c-expense-bg, #fdf2f4)',
          tint: 'var(--c-expense-tint, rgba(232,57,77,0.12))',  // soft fill (replaces banned rgba(224,92,107,*))
          border: 'var(--c-expense-border, rgba(232,57,77,0.30))',
          'dark-bg': 'rgba(232,57,77,0.12)',
        },
        // income / success / on-track == brand teal (one positive color, not five)
        income: 'var(--c-income, #168b78)',
        success: 'var(--c-success, #168b78)',
        // destructive == expense red (kills the red-600 vs #e8394d split)
        danger: {
          DEFAULT: 'var(--c-danger, #e8394d)',
          hover: 'var(--c-danger-hover, #cf2f41)',
        },
        // warning: calmer warm ochre (replaces candy amber-500)
        warning: {
          DEFAULT: 'var(--c-warning, #C98A2B)',
          hover: 'var(--c-warning-hover, #b3791f)',
          bg: 'var(--c-warning-bg, #FBF4E6)',
          'dark-bg': 'var(--c-warning-dark-bg, rgba(201,138,43,0.14))',
        },
        // ── Data / categorical (formalizes the two magic hexes + chart ladder)
        data: {
          blue: 'var(--c-data-blue, #6A8FC4)',
          'blue-deep': 'var(--c-data-blue-deep, #5B8DB8)',
          violet: 'var(--c-data-violet, #9B7EB3)',
          sand: 'var(--c-data-sand, #C9A87C)',
          gold: 'var(--c-data-gold, #D0A96A)',
          rose: 'var(--c-data-rose, #C46A75)',
          sage: 'var(--c-data-sage, #7A9E7E)',
          stone: 'var(--c-data-stone, #7A756A)',
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
        // Semantic elevation aliases (see .claude/design-system.md §3).
        // tier0 = whisper (sticky headers); tier1 = resting card (border only,
        // no shadow); tier2 = floating popover/modal/toast.
        tier0: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
        tier1: 'none',
        tier2: '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.03)',
      },
      borderRadius: {
        // 2-radius convention (see .claude/design-system.md §3).
        control: '6px',     // buttons, inputs, chips  (== md)
        container: '10px',  // cards, panels
      },
      animation: {
        'fade-out': 'fadeOut 0.5s ease-in-out 1.5s forwards',
        'in': 'animateIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slideInLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.2s ease-out',
        'hero-in': 'heroIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
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
        heroIn: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
