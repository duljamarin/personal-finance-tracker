# Personal Finance Tracker — Design System

> **Status (2026-06-19):** Evolved during the Monarch/Copilot-style redesign. This
> doc is now the canonical spec. It supersedes the earlier "single font, no display
> font" version — the live app uses **Hanken Grotesk for display**, and that is the
> intended direction. CLAUDE.md's Typography section is stale on this one point;
> trust this doc.
>
> **Taste target:** warm consumer-finance, in the spirit of Monarch Money and Copilot
> Money. Numbers are the heroes; teal is used with restraint; depth is soft and
> layered; charts are bespoke; every screen has a clear focal hierarchy rather than a
> uniform grid of equal-weight cards.

---

## 1. Typography

### Fonts (three faces — keep all three)

| Role | Face | Tailwind | Notes |
|------|------|----------|-------|
| **Display** | Hanken Grotesk | `font-display` | Headlines, hero, section headings, big section titles. |
| **UI / body** | Inter Tight | `font-sans` (default) | All body, labels, controls, dense data. |
| **Numeric / mono** | Geist Mono | `font-mono` | IDs, code, raw amounts where a mono face is explicitly wanted. Currency in the UI uses `font-sans` + `tabular-nums`, NOT `font-mono`. |

All three are already defined in `tailwind.config.cjs` and loaded via `src/fonts.css`. Do not remove any.

### Type scale

Numbers are the visual anchor. The scale below has deliberate contrast between
display, body, and the numeric hero — do not flatten it into one near-uniform size.

| Token | Use | Size / line-height | Weight | Tracking | Family |
|-------|-----|--------------------|--------|----------|--------|
| `display-hero` | Landing hero H1 | `clamp(3rem, 6vw, 4.25rem)` / 1.0 | 700 | `-0.02em` | display |
| `display-1` | Landing section H2 | `text-4xl`→`text-6xl` / 1.05 | 700 | `-0.02em` | display |
| `display-2` | In-app page title, large card title | `text-2xl`→`text-3xl` / 1.1 | 700 | `-0.01em` | display |
| `heading` | Card/panel heading | `text-lg` (18px) / 1.3 | 600 | `-0.01em` | sans |
| `body` | Default body | `text-sm`/`text-base` / 1.5 | 500 | normal | sans |
| `caption` | Helper, meta | `text-xs` (12px) / 1.4 | 500 | normal | sans |
| `eyebrow` | Section/stat label | `text-[12px]` (`.eyebrow`) | 500 | normal | sans |
| **`metric-hero`** | **The dominant number on a screen** | `text-4xl`→`text-5xl` / 1.0 | 600 | `-0.02em` | sans + `tabular-nums` |
| **`metric`** | **Supporting stat number** | `text-2xl`→`text-3xl` / 1.0 | 600 | `-0.01em` | sans + `tabular-nums` |
| **`metric-sm`** | **Inline / table number** | `text-sm`/`text-base` | 600 | normal | sans + `tabular-nums` |

### Numeric rule (non-negotiable)

**Every currency value, percentage, count, or other figure uses tabular figures.**
Apply `tabular-nums` (utility already in `index.css`). Numbers tracked slightly
tight, never lighter than 600 weight when they are the focal element. Labels next
to numbers are small, quiet, muted — they never compete with the number.

### Eyebrow rule (corrected)

`.eyebrow` = `text-[12px] font-medium text-ink-muted`. **No uppercase, no wide
letter-spacing.** The landing page currently has several `uppercase tracking-[0.12em]`
eyebrows (e.g. `LandingPage.jsx` `Eyebrow`, `FeatureCard`, the dashboard pie tags) —
these are an AI-tell and must be migrated to the `.eyebrow` style during Phase 1/4.
Do not introduce new uppercase tracked labels.

---

## 2. Color usage rules

Keep the existing palette. The teal ramp, warm paper light bg, layered dark
surfaces, `#e8394d` expense red, and whisper shadows are all intentional. **The
redesign changes composition, not palette.**

### When teal is permitted

Teal (`brand-*`) earns attention — it is NOT a default card accent. Use it only for:
- Primary actions (buttons, primary CTA)
- Active/selected states (nav active, selected tab, focused control ring)
- Positive financial emphasis (income amounts, on-track budget, positive net)
- The single "recommended" plan accent on pricing

**Stop** sprinkling teal on every card header, every icon chip, every eyebrow. Most
of the UI is warm neutral; color is the exception that signals meaning.

### Neutral ramp (surfaces & text)

```
LIGHT                          DARK
surface.page      #FAFAF7      surface.dark-page    #0A0A0B
surface.card      #FFFFFF      surface.dark-card    #111113
surface.hairline  #EDEDE8      surface.dark-hairline #1F1F22
                               surface.dark-elevated #222226  (popover/modal)
ink.primary       #111112      #FFFFFF (all dark text is white)
ink.muted         #2F2F2C      #FFFFFF @ opacity (white/70, white/60)
```

### Semantic income / expense

| Meaning | Color | Token |
|---------|-------|-------|
| Income / positive / on-track | `#168b78` | `brand-600` (light), `brand-400` dark |
| Expense / negative / over-budget | `#e8394d` | `expense.DEFAULT` |
| Neutral number (e.g. balance ≥0) | ink primary | `text-ink-primary dark:text-white` |

Never `#e05c6b` / `#f08090`. Over-budget hierarchy: the key percentage red, supporting
text muted (`white/60` dark), progress bar carries the color — don't paint everything red.

### Dark mode text — critical rules (unchanged, still enforced)

All dark text is forced white via `!important` rules in `index.css` outside `@layer`.
- Use `dark:text-white` for primary AND secondary text (use `text-white/70`, `/60` for hierarchy).
- **Never** `dark:text-gray-*`, `dark:text-zinc-*`, `dark:text-ink-dark-*` (JIT cache unreliable).
- Chart/SVG tick fills: JS hex, `dark ? '#FFFFFF' : '#6b7280'` — Tailwind classes don't reach SVG.

---

## 3. Elevation (3 tiers) + Radius (2 values)

### 3-tier elevation scale

Depth comes from **hairline border first, shadow second.** Tier is about role, not decoration.

| Tier | Role | Light | Dark |
|------|------|-------|------|
| **0 — Page** | Page background | `bg-surface-page`, no border, no shadow | `bg-surface-dark-page` |
| **1 — Card** | Cards, panels, list containers | `bg-white` + `border-surface-hairline`, **no shadow** | `bg-surface-dark-card` + `border-surface-dark-hairline` |
| **2 — Popover/Modal** | Dropdowns, modals, the hero mockup, toasts | Tier-1 surface + `shadow-md`/`shadow-lg` + `border` | `bg-surface-dark-elevated` + `shadow-lg` + `border-surface-dark-hairline` |

Rule: **cards do not get shadows.** A resting card is a tinted surface with a 1px
hairline. Shadow is reserved for things that float above the page (Tier 2). This is
the single biggest lever against the "every block is an equal floating card" tell.

`elevated` Card variant exists but should be used sparingly — only for genuinely
floating content, not for resting dashboard cards.

### 2-radius convention

Exactly two structural radii. Kill `rounded-2xl`-on-everything and `rounded-full`-on-everything.

| Radius | Token | Applies to |
|--------|-------|-----------|
| **Container** `10px` | `rounded-[10px]` | Cards, panels, feature blocks, modals (`rounded-xl`≈12 acceptable for modals only) |
| **Control** `6px` | `rounded-md` | Buttons, inputs, selects, chips, badges, icon buttons |

Exceptions (data-driven, allowed): `rounded-full` only for true pills/avatars/status
dots and progress-bar tracks; `rounded-none` for dense table rows. Migrate landing's
`rounded-2xl` feature/pricing cards → `rounded-[10px]`.

### Shadow tokens (unchanged — whisper-light, keep)

`xs … xl` at 3–5% opacity. Use `shadow-md`/`shadow-lg` for Tier 2 only.

---

## 4. Spacing rhythm & density

Vary density on purpose. Airy primary surfaces; compact dense data.

### Section rhythm (kill uniform `py-12` everywhere)

| Context | Vertical rhythm |
|---------|-----------------|
| Landing hero | `pt-16 sm:pt-24` / `pb-20 sm:pb-28` |
| Landing major section | `py-24 sm:py-32` |
| Landing minor/band section | `py-12 sm:py-20` |
| In-app page top region | header `mb-6`, summary→content `mt-6`/`mt-8` |
| In-app section gap | `space-y-6` between distinct blocks |

Alternate emphasis: not every section is the same height or the same background.
Use `bg-surface-page` ↔ `bg-white` alternation and border bands to create rhythm.

### Density inside surfaces

| Surface | Padding | Row height |
|---------|---------|-----------|
| Primary metric / hero card | `p-6`→`p-7` (airy) | — |
| Standard card | `p-4 sm:p-5` (Card `md`) | — |
| Dense list / transaction row | `px-3 py-2.5`, hairline divider | ~44px hit target |
| Compact table | `py-2`, `text-sm`, `tabular-nums` | scannable, quiet separators |

Transaction lists and tables should be **compact and scannable**, not airy. The
dashboard's primary chart/balance should **breathe** and dominate.

---

## 5. Iconography

- **Single curated set: `lucide-react`**, already a dependency and used in Sidebar,
  LandingPage, etc. One weight: **`strokeWidth={1.75}`** for nav/UI chrome,
  `{2}`/`{2.5}` only for tiny inline affirmations (CheckCircle in trust rows).
- Sizes: `w-4 h-4` (16, inline/controls), `w-5 h-5` (20, nav), `w-6 h-6` (24, rare emphasis).
- **Kill the icon-in-a-pastel-rounded-square motif.** Do not wrap stat/heading icons
  in a `w-7 h-7 rounded-md bg-brand-50` tile. Icons sit inline with the label, in a
  muted ink color, OR are dropped entirely in favor of the number doing the work.
  (Primary offender: `SummaryCards.jsx`.)
- **Emoji are data, not chrome.** User-chosen category emoji (`categories.emoji`) stay
  as data via `CategoryIconSvg`/`getCategoryIcon`. App chrome (nav, headings, stat
  labels, empty states) uses lucide, never emoji.
- The hand-rolled inline `<svg>` trend arrows in `SummaryCards` should migrate to
  lucide (`TrendingUp`, `TrendingDown`, `Scale`) for consistency.

---

## 6. Chart styling rules (Phase 3)

The chart layer is already partly bespoke (custom tooltips, custom legend, rounded
bars, curated donut palette, theme-aware ticks). Phase 3 **consolidates** these into
shared primitives and removes the remaining defaults.

- **Tooltip:** always a branded component — `bg-white dark:bg-surface-dark-card`,
  `border-surface-hairline`, `rounded-lg shadow-md`, values in `tabular-nums`,
  theme-aware. Never the default Recharts tooltip. (Extract the duplicated tooltips in
  `CombinedMonthChart`/`CategoryPieChart`/reports into one `<ChartTooltip>`.)
- **Gridlines:** horizontal-only, faint. Remove `strokeDasharray="3 3"` default dashes;
  use a solid faint line `stroke={dark ? '#1F1F22' : '#EDEDE8'}` at low opacity, or
  drop the grid. No vertical gridlines.
- **Axes:** muted tabular figures, `fontSize: 12`, fill `dark ? '#FFFFFF' : '#6b7280'`,
  `tickLine={false}` `axisLine={false}`. Drop the default legend — use the existing
  inline custom legend or contextual inline labels.
- **Bars:** rounded top caps `radius={[6,6,0,0]}`; income `#168b78`, expense `#e8394d`.
- **Area/line:** thin smooth lines; area fill = subtle brand gradient via
  `<defs><linearGradient>` (brand-500 ~0.18 → transparent). No hard fills.
- **Pie → donut:** keep the `innerRadius`/`outerRadius` donut; **center-label it with
  the key total** (currently the total sits only in the side list — move/echo it to
  the donut center). Palette = the existing `CHART_PALETTE` (brand + harmonious
  neutrals), never Recharts defaults.
- Every chart verified in dark mode.

---

## 7. Component specs

### Button (`UI/Button.jsx` — keep, codify)
- Radius `rounded-md`. Sizes `sm/md/lg` as-is. Focus ring `ring-brand-500/40`.
- `primary` `bg-brand-600 hover:bg-brand-700`; `secondary` outline; `ghost` subtle;
  `danger` outline `#e8394d`. Hit target ≥40px at `md` (`py-2` + text = ~40px; use `lg` where touch matters).

### Input / Select (`UI/Input.jsx`, `UI/CustomSelect.jsx` — keep)
- `rounded-md`, hairline border, focus `ring-brand-500/20 border-brand-500`.
- Error state via `error` prop only (red border + icon + message). Never pass border
  classes via `className` (conflicts with internal state).
- Prefer `CustomSelect` over native `<select>` where icons/rich options are needed.

### Card (`UI/Card.jsx` — keep, enforce Tier rules)
- Default = Tier 1 (hairline, **no shadow**). `elevated` = Tier 2, use sparingly.
- Radius `rounded-[10px]`. Padding via `padding` prop.

### Stat / Metric (NEW shared pattern — replaces `SummaryCards` motif)
- Label: `.eyebrow`, quiet, above or beside the number — never an icon-tile.
- Number: `metric` / `metric-hero` scale, `tabular-nums`, color by semantic tone
  (income teal, expense red, neutral ink). One stat per screen may be promoted to
  `metric-hero`; the rest recede.
- Optional tiny delta indicator (lucide arrow + small %), muted, never an icon chip.
- **No redundant subtitle** under every stat (drop the repeated "Base currency" line;
  state it once for the group).

### Table / list row
- Compact: `py-2`–`py-2.5`, `text-sm`, numbers `tabular-nums` right-aligned.
- Quiet separators: `border-b border-surface-hairline dark:border-surface-dark-hairline`,
  not boxed cards per row. `rounded-none`. Hover: subtle `bg-ink-primary/[0.03]`.

### Nav (`Sidebar.jsx` — already good)
- lucide icons `strokeWidth={1.75}`, active = `bg-brand-50 dark:bg-brand-950/30` +
  left accent bar `bg-brand-500`. Keep.

### Modal / popover (Tier 2)
- `rounded-xl`, Tier-2 surface, `shadow-lg`, hairline border, scale/fade-in animation.

### Empty state (`UI/EmptyState.jsx`)
- lucide icon (not emoji, not pastel tile), muted heading + caption, single CTA. Calm.

### Badge / pill
- `rounded-md` for status badges (PRO, plan labels); `rounded-full` only for true
  pills/counts. Teal only when the badge signals premium/active; otherwise neutral.

---

## 8. AI-tell kill-list (track during redesign)

| Tell | Where it currently lives | Fix phase |
|------|--------------------------|-----------|
| Uniform 3-up equal-weight stat grid | `Dashboard/SummaryCards.jsx` | 4 (Dashboard) |
| Icon-in-rounded-square next to stats | `SummaryCards.jsx`, `LandingPage` SecondaryItem/PrivacyCard | 1 & 4 |
| Uppercase tracked eyebrows | `LandingPage.jsx` Eyebrow/FeatureCard, Dashboard pie tags | 1 & 4 |
| Equal-weight 2-up pie cards | `Dashboard.jsx` income/expense grid | 4 |
| Default dashed gridlines | `CombinedMonthChart.jsx` CartesianGrid | 3 |
| Duplicated chart tooltips | multiple chart files | 3 |
| Donut total only in side list | `CategoryPieChart.jsx` | 3 |
| `rounded-2xl` feature/pricing cards | `LandingPage.jsx` | 1 |
| Redundant per-stat subtitle | `SummaryCards.jsx` "Base currency" ×3 | 4 |

Already healthy (do not "fix"): asymmetric hero w/ real demo, editorial feature blocks
with real tabular numbers, lucide nav, custom tooltips/legend, curated donut palette.

---

## 9. Proposed `tailwind.config.cjs` token refinements (NOT YET APPLIED)

These are additive and low-risk. Listed for review; apply only after approval.

```diff
  theme: {
    extend: {
+     // Formal light-theme elevation set mirroring the dark surfaces.
+     // (Values = existing whisper shadows, just named by role.)
+     boxShadow: {
+       // keep xs..xl as-is; add semantic aliases:
+       'tier1': 'none',                                   // resting card = border only
+       'tier2': '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.03)', // = lg
+     },
+     borderRadius: {
+       // formalize the 2-radius convention as named tokens
+       'control': '6px',     // buttons, inputs, chips  (== md)
+       'container': '10px',  // cards, panels           (== current rounded-[10px])
+     },
      fontFamily: { /* unchanged — keep display/sans/mono */ },
      colors: { /* unchanged */ },
    },
  },
```

Plus, in `src/index.css`, formalize the numeric utility already present and add
metric helpers (optional, for convenience — class usage can stay inline instead):

```css
/* already exists: .tabular-nums { font-variant-numeric: tabular-nums } */
@layer components {
  .metric        { @apply font-semibold tabular-nums tracking-tight leading-none; }
  .metric-hero   { @apply text-4xl sm:text-5xl font-semibold tabular-nums tracking-tight leading-none; }
}
```

**Deliberately NOT changing:** the brand ramp, surface tokens, ink tokens, expense
colors, font families, easing, or the existing whisper shadows. The redesign is
composition + hierarchy, not a palette/token swap.

---

## 10. Working method (per the brief)

1. Per phase: list files + changes, wait for go-ahead.
2. Small commits, one screen/component group at a time.
3. After each screen: describe before/after, remind to verify **both themes + EN/SQ**.
4. No logic refactors while restyling. Keep diffs visual. Stop and ask if functionality is at risk.

Phase order: **0 audit (this doc)** → 1 Landing/marketing → 2 Shell & primitives →
3 Charts → 4 Screens (Dashboard → Transactions → Budgets → Goals → Net Worth → Settings/Onboarding).
