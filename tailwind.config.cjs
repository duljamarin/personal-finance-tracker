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
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      // Named type scale (see .claude/design-system.md §2). Each step bakes in
      // size + line-height + weight so components use `text-title` rather than
      // re-deriving `text-2xl font-semibold font-display` everywhere.
      fontSize: {
        display: ['2.75rem', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '700' }],
        title:   ['1.5rem',  { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '700' }],
        heading: ['1.125rem', { lineHeight: '1.3', fontWeight: '600' }],
        body:    ['0.9375rem', { lineHeight: '1.5', fontWeight: '500' }],
        label:   ['0.8125rem', { lineHeight: '1.4', fontWeight: '500' }],
      },
      colors: {
        // ── Brand (forest green) ───────────────────────────────────────────
        // Tokens read CSS vars (defined in index.css) with a hex fallback so
        // inline styles / SVG fills can reference the same var(--c-*). Base
        // #0B5D3B sits at the 600 slot so `bg-brand-600` = primary fill stays
        // the canonical mapping across every call site. See design-system §2.
        brand: {
          50: '#EDF6F1',
          100: '#D6EBDF',
          200: '#AFD9C4',
          300: '#7FBD9E',
          400: '#2E9E6B', // dark-mode primary accent (5.8:1 on #111113)
          accent: 'var(--c-brand-accent, #2E9E6B)',
          500: '#17804F', // active rails, focus rings, progress
          600: '#0B5D3B', // primary button fill (7.9:1 with white text)
          700: '#084C30', // hover
          800: '#073E28', // active/pressed
          900: '#053120',
          950: '#032013',
        },
        surface: {
          DEFAULT: '#ffffff',
          secondary: '#f9fafb',
          page: '#FAFAF7',
          card: '#FFFFFF',
          hairline: '#EDEDE8',
          subtle: '#F4F4EF',      // neutral chip/panel fill (replaces pastel washes)
          outline: '#D8D8CF',     // firmer border for interactive form controls
          dark: '#0A0A0B',        // unified with body + dark-page (was #0C0C0E)
          'dark-secondary': '#141417',
          'dark-tertiary': '#1A1A1E',
          'dark-elevated': '#222226',
          'dark-page': '#0A0A0B',
          'dark-card': '#111113',
          'dark-hairline': '#1F1F22',
          'dark-subtle': '#1A1A1E',
          'dark-outline': '#2C2C31',
          'dark-deep': '#0C0C0E', // neutral dark band (landing final CTA)
        },
        ink: {
          primary: '#111112',
          secondary: '#44443F',
          muted: '#2F2F2C',
          'dark-primary': '#FFFFFF',
          'dark-muted': '#FFFFFF',
        },
        // ── Semantic: expense / negative / over-budget (single canonical red)
        expense: {
          DEFAULT: 'var(--c-expense, #DC2626)',   // solid red (was #e8394d)
          light: '#EF4444',
          bg: 'var(--c-expense-bg, #FDEDED)',
          tint: 'var(--c-expense-tint, rgba(220,38,38,0.10))',
          border: 'var(--c-expense-border, rgba(220,38,38,0.35))',
          'dark-bg': 'rgba(220,38,38,0.14)',
        },
        // income / success / on-track == brand forest green (one positive color)
        income: 'var(--c-income, #0B5D3B)',
        success: 'var(--c-success, #0B5D3B)',
        // destructive == expense red (kills the red-600 vs #e8394d split)
        danger: {
          DEFAULT: 'var(--c-danger, #DC2626)',
          hover: 'var(--c-danger-hover, #B91C1C)',
        },
        // warning: deeper amber (AA-safe as body text)
        warning: {
          DEFAULT: 'var(--c-warning, #B45309)',
          hover: 'var(--c-warning-hover, #92400E)',
          bg: 'var(--c-warning-bg, #FCF3E6)',
          'dark-bg': 'var(--c-warning-dark-bg, rgba(180,83,9,0.15))',
        },
        // ── Data / categorical (richer ladder, harmonized with forest + red)
        data: {
          blue: 'var(--c-data-blue, #3E6DB5)',
          'blue-deep': 'var(--c-data-blue-deep, #2A5183)',
          violet: 'var(--c-data-violet, #7D5BA6)',
          sand: 'var(--c-data-sand, #BE8A45)',
          gold: 'var(--c-data-gold, #D9A628)',
          rose: 'var(--c-data-rose, #C64B65)',
          sage: 'var(--c-data-sage, #2F8F83)',
          stone: 'var(--c-data-stone, #6E6A5E)',
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
