# Personal Finance Tracker — Design System ("Bento")

> **Status (2026-11-18):** Canonical spec for the Bento redesign. Supersedes the
> 2026-06 Monarch/Copilot doc and the 2026-07 forest-green de-pastelization rules.
> Reference mockups (visual/behavioural spec only, fake data, do not copy markup):
> `docs/redesign/bento-dashboard.reference.html`, `docs/redesign/bento-landing.reference.html`.
>
> **Taste target:** tactile, rounded, mint + white. Every surface is a Tile on a
> mint page; one green hero tile per screen; numbers are the heroes; motion is a
> single entrance per mount, springy but calm.

Rule of the doc: **every value used in a component is one of the tokens below or a
formula over them.** If a value you need is not here, stop and ask; do not invent one.

---

## 1. Source of truth

### 1.1 Color inputs

| Input | Value | Notes |
|---|---|---|
| `BRAND` | `#0B5D3B` | = `brand-600`. Brand ramp 50..950 in `tailwind.config.cjs` unchanged. |
| `BRAND_HOVER` | `#084C30` | = `brand-700` |
| `BRAND_TEXT_DARK` | `#2E9E6B` | = `brand-400`, brand-colored text/icons in dark mode |
| `WHITE` | `#FFFFFF` | |
| `INK` | `#0F1F17` | light-mode text |
| `DARK_BASE` | `#0A0D0B` | dark page |
| `EXPENSE` | `#DC2626` | `--c-expense`, unchanged |
| `WARNING` | `#B45309` | `--c-warning`, unchanged |
| Category colors | `CATEGORY_PALETTE` in `src/utils/chartColors.js` via `colorFromName()` (`UI/CategoryAvatar.jsx`) | no new palette |

### 1.2 Derived colors (CSS custom properties in `src/index.css`)

All derived with `color-mix(in srgb, …)`.

| Token | Light | Dark | Tailwind |
|---|---|---|---|
| `--page` | BRAND 7% + WHITE | DARK_BASE | `bg-page` |
| `--tile` | WHITE | BRAND 12% + DARK_BASE | `bg-tile` |
| `--inner` | BRAND 7% + WHITE | BRAND 20% + DARK_BASE | `bg-inner` |
| `--inner-2` | BRAND 14% + WHITE | BRAND 30% + DARK_BASE | `bg-inner-2` |
| `--line` | BRAND 12% + WHITE | BRAND 26% + DARK_BASE | `border-line` |
| `--text` | INK | WHITE | `text-fg` |
| `--brand-text` | BRAND | BRAND_TEXT_DARK | `text-brand-text` |
| `--hero-tile` | BRAND (text WHITE) | same | `bg-hero` |
| `--hero-inset` | WHITE 14% + BRAND | same | `bg-hero-inset` |
| `--tint(c)` | `color-mix(in srgb, c 14%, var(--tile))` | same formula | `tintOf(c)` in `src/utils/bento.js` |

Legacy names (`surface-page`, `surface-card`, `surface-hairline`, `surface-dark-*`,
`ink-*`) are remapped onto these vars so old call sites inherit the new look. New code
uses the Bento names.

### 1.3 Shape and spacing

| Input | Value |
|---|---|
| `R_TILE` | 22px |
| `GAP` | 16px |
| `TYPE_MIN` | 14px |

| Derived | Formula | Value | Tailwind | Use |
|---|---|---|---|---|
| `R_HERO` | R_TILE + 10 | 32px | `rounded-hero` | landing hero block, large landing sections |
| `R_SHELL` | R_TILE + 4 | 26px | `rounded-shell` | nav panel, quick-add sheet |
| `R_INNER` | R_TILE − 4 | 18px | `rounded-inner` | panels inside tiles, goal cards, summary boxes, tooltips |
| `R_ICON` | R_TILE − 6 | 16px | `rounded-icon` | 48px icon squares, rail items |
| `R_INPUT` | R_TILE − 8 | 14px | `rounded-input` | inputs |
| `R_PILL` | 999px | | `rounded-pill` (= `rounded-full`) | buttons, chips, filters, toasts, badges, progress tracks |
| `TILE_PAD` | GAP + 10 | 26px | `p-tile` | default tile padding |
| `TILE_PAD_DENSE` | GAP + 8 | 24px | `p-tile-dense` | dense tiles; never less |
| Grid | 12 columns, gap GAP, max content width 1240px | | `grid-cols-12 gap-gap max-w-content` | |

No other radius is allowed in `src/components/**` (no `rounded`, `rounded-sm/md/lg/xl/2xl`).

### 1.4 Typography

- **One face: Manrope** (self-hosted variable woff2, weights 500..800, latin +
  latin-ext, `font-display: swap`, only latin preloaded). `font-sans` and
  `font-display` both resolve to Manrope. `font-mono` stays the system mono stack
  (recovery codes / ciphertext only).
- `tabular-nums` on every number.

| Token | Formula | Size | Tailwind |
|---|---|---|---|
| caption | TYPE_MIN + 1 | 15px | `text-caption` (also what `text-sm` resolves to) |
| body (app) | TYPE_MIN + 3 | 17px | `text-body` (`text-base`) |
| body (landing) | TYPE_MIN + 4 | 18px | `text-body-lg` |
| h3 (app) | body + 2 | 19px | `text-h3` |
| h3 (landing) | | 22px | `text-h3-lg` |
| h1 (app) | clamp(28px, 3vw, 36px) | | `text-h1` |
| kpi | clamp(40px, 4vw, 52px), weight 800 | | `text-kpi` (one per screen) |
| landing h2 | clamp(30px, 3.2vw, 40px) | | `text-h2-lg` |
| landing h1 | clamp(40px, 4.6vw, 60px) | | `text-h1-lg` |

Weights: 600 meta, 700 labels/titles/buttons, 800 numbers/h1/kpi. Nothing below 500.
Letter-spacing: −0.02em h1/h2/kpi, −0.01em h3, normal elsewhere.

**Minimum size:** nothing below 14px. `text-xs`, `text-[10px]`..`text-[13px]` are
forbidden in components. `.eyebrow` is gone.

### 1.5 Motion

| Input | Value | Tailwind duration |
|---|---|---|
| `D_FAST` | 180ms | `duration-fast` |
| `D_ENTER` | 380ms | `duration-enter` |
| `D_TILE` | 600ms | `duration-tile` |
| `D_DATA` | 700ms | `duration-data` |
| `D_COUNT` | 900ms | (JS, `MOTION.count`) |
| `STAGGER` | 80ms | |
| `STAGGER_ROW` | 45ms | |
| `MAX_STAGGERED` | 8 | |
| `EASE_OUT` | cubic-bezier(.22,1,.36,1) | `ease-out-b` |
| `EASE_SPRING` | cubic-bezier(.34,1.32,.64,1) | `ease-spring` |
| `EASE_STD` | cubic-bezier(.2,0,0,1) | `ease-std` |

Derived (in `src/utils/motion.js`): `tileDelay(i) = min(i, 8) * 80ms`;
`rowDelay(i, base) = min(i, 8) * 45ms + base`; `dataDelay(i) = tileDelay(i) + 300ms`;
toast lifetime = 2600ms.

Keyframes / animations (Tailwind): `animate-pop`, `animate-rise`, `animate-grow-x`,
`animate-grow-y`, `animate-draw`, `animate-row-new`. All entrance animations use
`animation-fill-mode: backwards`. Delays go through the `--d` custom property
(`style={{ '--d': '160ms' }}`). An element that has a hover transform must not also
carry an entrance animation (wrap it instead); `.tile` handles this by animating
with `backwards` so the hover transform is free after the entrance.

---

## 2. Invariants (each is checked in QA)

### Motion
- **I1** Entrance animations run once per mount. Scroll reveals go through
  `useRevealOnce()` (IntersectionObserver, threshold 0.18, unobserve after first hit).
  No infinite animation except `LoadingSpinner` and `Skeleton`.
- **I2** Entrances animate only `transform` and `opacity`. `width`/`height` transition
  only on data bars when their value changes (D_DATA EASE_OUT).
- **I3** `prefers-reduced-motion: reduce` → all animations/transitions off (one global
  rule in `index.css`) and count-ups render the final value (checked in the hooks).
- **I4** Count-ups use `useCountUp(value, { duration, delay })` (rAF, cubic ease-out).
  A later value change tweens from the currently displayed value, not from 0.
- **I5** Landing H1 is the LCP element: no opacity animation, visible on first paint.
  `HeroPreview.jsx` stays static HTML/CSS + lucide; its tiles may `pop`.
- **I6** No CLS: animations never change layout; Suspense fallbacks keep matching min-height.
- **I7** No new dependencies.

### Visual
- **V1** No text below 14px (see 1.4).
- **V2** Every card-like surface is a `Card` (Tile). Only `R_*` radii.
- **V3** Exactly one hero (green) tile per screen.
- **V4** Expense amounts use `--text` (ink/white), never red. Red (EXPENSE) is only for
  over-budget, errors, destructive actions. Income amounts use `--brand-text`.
- **V5** Text contrast ≥ 4.5:1 in both themes. Category colors are for icons and bars,
  never body text.
- **V6** Forbidden: eyebrow labels above headings, uppercase tracked labels, gradient
  text, glows, colored shadows other than the tile hover shadow, pulsing dots, emoji in
  chrome, italic/colored accent words in headings, "01 / 02 / 03" numbering, three
  identical centered cards, fake stats or testimonials, marketing superlatives.
- **V7** Do not invent values outside this doc.

### Product and code
- **P1** Nothing that exists on a page may disappear; layout changes move, never delete.
- **P2** i18n in both `en` and `sq`; no em dashes in locale values; no hardcoded
  user-facing English in JSX.
- **P3** Restyle existing primitives; new components only where §3 names one.
- **P4** All performance rules in `CLAUDE.md` stay.
- **P5** Real `<button>`/`<a>`; translated `aria-label` on icon-only buttons;
  focus-visible ring 3px BRAND, offset 3px; touch targets ≥ 44px; sliding indicators
  keep `aria-pressed`/`aria-current` on the real control.

### Dark mode text (kept from the previous system)
All dark text is white (`index.css` forces it outside `@layer`). Use `dark:text-white`;
never `dark:text-gray-*`, `dark:text-zinc-*`, `dark:text-ink-dark-*`. Placeholders
`dark:placeholder:text-white/40`. SVG/Recharts fills are JS-computed
(`dark ? '#FFFFFF' : INK`), Tailwind classes do not reach SVG.

---

## 3. Components

| Component | File | Spec |
|---|---|---|
| Tile | `UI/Card.jsx` | `--tile`, 1px `--line`, `R_TILE`, `TILE_PAD`. Hover (pointer only): translateY(−3px) + `0 14px 30px -18px color-mix(BRAND 35%, transparent)`; transform D_ENTER EASE_SPRING, shadow D_FAST EASE_STD. `variant="hero"`: `--hero-tile`, white text. `variant="inner"`: `--inner`, `R_INNER`, no border, no lift. Entrance `pop` with `tileDelay(index)` via `index` prop. |
| Button | `UI/Button.jsx` | `R_PILL`, weight 700. Primary BRAND → hover BRAND_HOVER + translateY(−2px), active scale(.97). Secondary `--tile` + 2px `--text` border, hover inverts. Leading "+" rotates 90deg on hover; trailing arrow moves 4px right. |
| Chip | `UI/Chip.jsx` | `R_PILL`, 2px `--line` border; selected = BRAND fill + white text. |
| SegmentedControl | `UI/SegmentedControl.jsx` | Track `--inner`, 4px padding, `R_PILL`; equal-width options; pill (white / dark `--inner-2`, `0 2px 8px rgba(15,31,23,.12)`) slides via translateX(index × 100%), D_ENTER EASE_SPRING. |
| ProgressBar | `UI/ProgressBar.jsx` | Track `--inner`/`--inner-2`, `R_PILL`, heights 6/10/14. Fill <85% BRAND, 85..100% WARNING, >100% EXPENSE. Entrance `grow-x`; width transitions on change. |
| ProgressRing | `UI/ProgressRing.jsx` | SVG rotated −90deg, round caps, track `--inner-2` (`--tile` on `--inner` backgrounds), `draw` entrance. Center label is ONE text node, nowrap, font-size = size × 0.23. |
| StackedBar | `UI/StackedBar.jsx` | 18px, `R_PILL`, 3px gaps, segment = category color, `grow-x` with delay(i); legend: 10px swatch (radius 3px), name, amount weight 800. |
| App shell | `Sidebar.jsx`, `Header.jsx`, `AuthenticatedLayout` | Page `--page`, padding GAP. Nav = floating tile (`R_SHELL`), top-aligned, not sticky. 48px rows with 48px icon square (`R_ICON`). Active: `--inner-2` + `--brand-text` icon. Hover: `--inner` + icon scale(1.06). ≥1280 icon+label (232px), 1024..1279 icon rail (72px, tooltip + aria-label), <1024 existing mobile nav restyled. |
| Quick add sheet | `Transaction/QuickAddSheet.jsx` (wraps `TransactionForm`) | ≥640px floating bottom-right, width min(400px, 100vw − 48px), `R_SHELL`, shadow `0 30px 60px -30px rgba(15,31,23,.45)`, enter translateY(24px) scale(.96), D_ENTER EASE_SPRING. <640px bottom sheet, top radius `R_SHELL`. Amount 36px/800. Category chips for the 6 most used + "More" (CustomSelect). Focus trap, Esc closes, focus returns. Save → close, toast "Saved: {title} {amount}", new row `row-new`. |
| Toast | `context/ToastContext.jsx` | Bottom-center, `R_PILL`, `--text` bg with `--tile` text (inverts in dark), check icon `color-mix(BRAND 45%, WHITE)`, enter translateY(16px) + fade, lifetime 2600ms, `role="status"`. |
| ActivityFeed | `Dashboard/ActivityFeed.jsx` | See redesign brief §3.8: filter, money in/out boxes, StackedBar top 5 + Other, day groups, rows with 48px tinted icon square, budget meta + 6px bar, hover translateX(4px). |

Charts (Recharts): bars radius `[8,8,0,0]`, income BRAND, other months `--inner-2`;
only faint horizontal `--line` grid; ticks 14px; tooltips are `R_INNER` tiles with
tabular numbers; donut center shows the total; `animationDuration = D_DATA`,
`animationEasing="ease-out"`, `isAnimationActive={!reducedMotion}`; explicit
`ResponsiveContainer` heights.

---

## 4. Iconography

- `lucide-react` only, `strokeWidth={2}` in chrome.
- Category markers: `CategoryAvatar` / `CategoryIconSvg` in a 48px `R_ICON` square
  with `--tint(categoryColor)` background and the icon in the category color.
- Emoji are data, never chrome.
