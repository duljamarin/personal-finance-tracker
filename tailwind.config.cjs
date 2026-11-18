/** @type {import('tailwindcss').Config} */
// Bento design system — see .claude/design-system.md. Surfaces, radii, motion
// and type are mapped onto the CSS custom properties declared once in
// src/index.css. Components use these names, never raw values.
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
      // §1.4: Manrope is the only UI face. Mono stays for codes/ciphertext.
      fontFamily: {
        sans: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      // Type scale derived from TYPE_MIN = 14px. Nothing renders below 14px.
      // Tailwind's sm/base/lg steps are re-pointed onto the scale so legacy
      // call sites inherit it; the named steps are what new code uses.
      fontSize: {
        min: ['14px', { lineHeight: '1.2' }],            // TYPE_MIN (badges only)
        sm: ['15px', { lineHeight: '1.5' }],             // caption = TYPE_MIN + 1
        base: ['17px', { lineHeight: '1.55' }],          // body    = TYPE_MIN + 3
        lg: ['19px', { lineHeight: '1.3' }],             // h3      = body + 2
        caption: ['15px', { lineHeight: '1.5' }],
        body: ['17px', { lineHeight: '1.55' }],
        'body-lg': ['18px', { lineHeight: '1.6' }],      // landing body = TYPE_MIN + 4
        h3: ['19px', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '700' }],
        'h3-lg': ['22px', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '700' }],
        h1: ['clamp(28px, 3vw, 36px)', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '800' }],
        kpi: ['clamp(40px, 4vw, 52px)', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '800' }],
        'h2-lg': ['clamp(30px, 3.2vw, 40px)', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '800' }],
        'h1-lg': ['clamp(40px, 4.6vw, 60px)', { lineHeight: '1.06', letterSpacing: '-0.02em', fontWeight: '800' }],
        // Legacy named steps, re-pointed onto the Bento scale.
        display: ['clamp(40px, 4.6vw, 60px)', { lineHeight: '1.06', letterSpacing: '-0.02em', fontWeight: '800' }],
        title: ['clamp(28px, 3vw, 36px)', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '800' }],
        heading: ['19px', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '700' }],
        label: ['15px', { lineHeight: '1.5', fontWeight: '600' }],
      },
      colors: {
        // ── Bento surfaces (CSS vars; they switch under .dark) ─────────────
        page: 'var(--page)',
        tile: 'var(--tile)',
        inner: 'var(--inner)',
        'inner-2': 'var(--inner-2)',
        line: 'var(--line)',
        fg: 'var(--text)',
        hero: 'var(--hero-tile)',
        'hero-inset': 'var(--hero-inset)',
        // ── Brand (forest green). Ramp unchanged; BRAND = 600. ────────────
        brand: {
          50: '#EDF6F1',
          100: '#D6EBDF',
          200: '#AFD9C4',
          300: '#7FBD9E',
          400: '#2E9E6B', // BRAND_TEXT_DARK
          accent: 'var(--c-brand-accent, #2E9E6B)',
          500: '#17804F',
          600: '#0B5D3B', // BRAND
          700: '#084C30', // BRAND_HOVER
          800: '#073E28',
          900: '#053120',
          950: '#032013',
          text: 'var(--brand-text)', // BRAND light / brand-400 dark
        },
        // Legacy surface names re-pointed onto the Bento vars so old call
        // sites inherit the new look. dark-* names resolve to the same vars,
        // which already hold the dark values under .dark.
        surface: {
          DEFAULT: 'var(--tile)',
          secondary: 'var(--inner)',
          page: 'var(--page)',
          card: 'var(--tile)',
          hairline: 'var(--line)',
          subtle: 'var(--inner)',
          outline: 'var(--line)',
          dark: 'var(--page)',
          'dark-secondary': 'var(--inner)',
          'dark-tertiary': 'var(--inner-2)',
          'dark-elevated': 'var(--tile)',
          'dark-page': 'var(--page)',
          'dark-card': 'var(--tile)',
          'dark-hairline': 'var(--line)',
          'dark-subtle': 'var(--inner)',
          'dark-outline': 'var(--line)',
          'dark-deep': 'var(--page)',
        },
        // ink = INK. Kept as hex (not a var) so opacity modifiers such as
        // ring-ink-primary/10 keep working. Dark text is forced white in index.css.
        ink: {
          primary: '#0F1F17',
          secondary: '#0F1F17',
          muted: '#0F1F17',
          'dark-primary': '#FFFFFF',
          'dark-muted': '#FFFFFF',
        },
        // ── Semantic: expense / negative / over-budget (single canonical red)
        expense: {
          DEFAULT: 'var(--c-expense, #DC2626)',
          light: '#EF4444',
          bg: 'var(--c-expense-bg, #FDEDED)',
          tint: 'var(--c-expense-tint, rgba(220,38,38,0.10))',
          border: 'var(--c-expense-border, rgba(220,38,38,0.35))',
          'dark-bg': 'rgba(220,38,38,0.14)',
        },
        income: 'var(--c-income, #0B5D3B)',
        success: 'var(--c-success, #0B5D3B)',
        danger: {
          DEFAULT: 'var(--c-danger, #DC2626)',
          hover: 'var(--c-danger-hover, #B91C1C)',
        },
        warning: {
          DEFAULT: 'var(--c-warning, #B45309)',
          hover: 'var(--c-warning-hover, #92400E)',
          bg: 'var(--c-warning-bg, #FCF3E6)',
          'dark-bg': 'var(--c-warning-dark-bg, rgba(180,83,9,0.15))',
        },
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
          DEFAULT: 'var(--line)',
          dark: 'var(--line)',
        },
      },
      borderColor: {
        DEFAULT: 'var(--line)',
      },
      // §1.3: radii derived from R_TILE = 22px. Only these are allowed.
      borderRadius: {
        tile: '22px',    // R_TILE
        hero: '32px',    // R_HERO  = R_TILE + 10
        shell: '26px',   // R_SHELL = R_TILE + 4 (nav panel, quick-add sheet)
        inner: '18px',   // R_INNER = R_TILE - 4
        icon: '16px',    // R_ICON  = R_TILE - 6
        input: '14px',   // R_INPUT = R_TILE - 8
        bar: '12px',     // kept-per-month bars (spec 4.1)
        swatch: '3px',   // legend swatch (spec 3.4)
        pill: '999px',   // R_PILL
      },
      spacing: {
        gap: '16px',            // GAP
        tile: '26px',           // TILE_PAD = GAP + 10
        'tile-dense': '24px',   // GAP + 8
      },
      maxWidth: {
        content: '1240px',
      },
      boxShadow: {
        tile: 'var(--tile-shadow)',
        sheet: 'var(--sheet-shadow)',
        pill: 'var(--pill-shadow)',
      },
      transitionDuration: {
        fast: 'var(--d-fast)',
        enter: 'var(--d-enter)',
        tile: 'var(--d-tile)',
        data: 'var(--d-data)',
      },
      transitionTimingFunction: {
        'out-b': 'var(--ease-out)',
        spring: 'var(--ease-spring)',
        std: 'var(--ease-std)',
      },
      // §1.5 entrance animations. Delay comes from --delay (set through the
      // helpers in src/utils/motion.js). fill-mode backwards, so a hover
      // transform is free once the entrance is done.
      animation: {
        pop: 'pop var(--d-tile) var(--ease-spring) var(--delay, 0ms) backwards',
        rise: 'rise var(--d-enter) var(--ease-out) var(--delay, 0ms) backwards',
        'grow-x': 'grow-x var(--d-data) var(--ease-out) var(--delay, 0ms) backwards',
        'grow-y': 'grow-y var(--d-data) var(--ease-spring) var(--delay, 0ms) backwards',
        draw: 'draw var(--d-data) var(--ease-out) var(--delay, 0ms) backwards',
        'row-new': 'row-new var(--d-row-new) var(--ease-out) var(--delay, 0ms) backwards',
        'sheet-in': 'sheet-in var(--d-enter) var(--ease-spring) backwards',
        'toast-in': 'toast-in var(--d-enter) var(--ease-spring) backwards',
        'step-out': 'step-out var(--d-enter) var(--ease-out) forwards',
        'fade-in': 'fade-in var(--d-fast) var(--ease-std) backwards',
      },
      keyframes: {
        pop: {
          from: { opacity: '0', transform: 'translateY(24px) scale(.97)' },
          to: { opacity: '1', transform: 'none' },
        },
        rise: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'grow-x': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
        'grow-y': {
          from: { transform: 'scaleY(0)' },
          to: { transform: 'scaleY(1)' },
        },
        draw: {
          from: { strokeDashoffset: 'var(--len, 1)' },
        },
        'row-new': {
          '0%': { opacity: '0', transform: 'translateX(-24px)', backgroundColor: 'var(--inner-2)' },
          '45%': { opacity: '1', transform: 'none', backgroundColor: 'var(--inner-2)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'sheet-in': {
          from: { opacity: '0', transform: 'translateY(24px) scale(.96)' },
          to: { opacity: '1', transform: 'none' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'step-out': {
          from: { opacity: '1', transform: 'none' },
          to: { opacity: '0', transform: 'translateX(-16px)' }, // -GAP
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
