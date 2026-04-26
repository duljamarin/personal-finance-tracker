# Personal Finance Tracker — Design System

This is the contract for the editorial redesign. When in doubt, refer back here. The goal is a typographic, human-feeling interface — not the generic "AI SaaS" aesthetic.

## Typography

### Fonts
- **Primary / body**: **Inter** (Google Fonts), 400 weight, with `font-feature-settings: 'cv02','cv03','cv04','cv11','ss01'` applied on `<body>`. Uses Tailwind's default `font-sans`.
- **Display / non-primary labels**: **Space Grotesk** (Google Fonts), 500–600 weight. Exposed as Tailwind `font-display`.

### When to use `font-display` (Space Grotesk) — broader than originally planned
Space Grotesk is the **dominant** typographic voice of this app. Use it on all of:
- All headings: `h1`, `h2`, `h3`, `h4`
- Primary and secondary CTA button labels
- All labels: form fields, stat captions, nav, chips/badges/tags, column headers
- Eyebrow / overline text, metadata, timestamps, "updated X ago"
- Feature card titles and their short descriptions
- Dashboard preview mockup labels ("BALANCE", "INCOME", "EXPENSES", "BUDGET", "RECENT")

### Stays Inter (narrower than originally planned)
- Long-form body paragraphs (hero subtitle, showcase descriptions, marketing copy over ~30 words)
- Transaction descriptions in lists
- Numeric values (amounts, percentages, counts) — always `tabular-nums`

### Tracking
| Size | Tracking | Notes |
|---|---|---|
| ≥24px display | `-0.035em` (`tracking-tight-display`) | Hero, big numbers |
| 18–22px headings | `-0.02em` (`tracking-display`) | H2, H3 |
| 14–16px | `-0.01em` | H4, large labels |
| Small body | `0` | 12–14px body |
| Eyebrow labels | `+0.08em` + `uppercase` | Section overlines |

### Line height
- **1.6** — body copy
- **1.35** — subheadings
- **1.1** — large display headings

## Neutrals (warmer, less "Tailwind gray")

### Light mode
- Page bg: `#FAFAF7` — replaces `surface.secondary`'s `#f9fafb`
- Card bg: `#FFFFFF`
- Hairline border: `#EDEDE8`
- Body text: `#111112`
- Secondary text: `#5A5A55`

### Dark mode
- Page bg: `#0A0A0B`
- Card bg: `#111113`
- Hairline border: `#1F1F22`
- Body text: `#EDEDE9`
- Secondary text: `#8A8A85`

### Tailwind tokens (added in `tailwind.config.cjs` under `extend.colors`)

```
surface.page         #FAFAF7
surface.card         #FFFFFF
surface.hairline     #EDEDE8
surface.dark-page    #0A0A0B
surface.dark-card    #111113
surface.dark-hairline #1F1F22

ink.primary          #111112
ink.muted            #5A5A55
ink.dark-primary     #EDEDE9
ink.dark-muted       #8A8A85
```

Existing `surface.dark`, `surface.dark-secondary`, `surface.dark-tertiary`, `surface.dark-elevated`, `border.*` remain — they're referenced elsewhere.

## Radii (deliberate, not uniform)

| Element | Radius |
|---|---|
| Buttons, inputs, small chips | `rounded-md` (6px) |
| Pills / true tags | `rounded-full` |
| Data cards (SummaryCards, feature cards, dashboard panels) | `rounded-[10px]` |
| Modals, dropdowns, large containers | `rounded-xl` (12px) |
| Data tables, transaction rows | `rounded-none` (sharp — this is data) |

Kill every stray `rounded-2xl`.

## Elevation

- **Default card**: 1px hairline border, no shadow.
- **Shadow is reserved for**: modals, popovers / dropdowns, the hero dashboard-mockup.
- Remove `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl` from all other cards and panels.

## Emerald usage — sparingly

**Allowed:**
- Primary CTA fill
- Positive numeric values (income, net-positive totals)
- Active nav item indicator (sidebar)
- Goal-completion accents, progress-bar fill
- Brand logomark

**Remove from:**
- Decorative dots, pulse halos, glow halos
- Feature-card icon backgrounds (swap to neutral)
- "Live" badges
- Hover backgrounds that aren't action affordances

## Motion

- CSS only. Existing keyframes in `tailwind.config.cjs` + `src/index.css` stay.
- Prefer `transition-colors` / `transition-opacity` over `transition-all`.
- No new animations unless an equivalent is removed.

## AI-tell removals (apply everywhere)

1. **Gradient-blur halos** — delete every `absolute -inset-* bg-brand-*/10 blur-*` (start with `LandingPage.jsx` behind `DashboardPreview`). Dashboard mockups sit on a flat surface.
2. **Pulse-dot "live" pill** — replaced with an editorial metadata strip: a 32px horizontal rule leading into wide-tracked Space Grotesk uppercase text, splitting any `·` divider into a proper inline structure. A bare `.eyebrow` class is **not** sufficient on landing-page hero strings — they need more intentional composition.
3. **Emoji in mockups** (`☕ 💰 🏠`) — replace with an 8px neutral category dot + the label. Replace the emoji favicon in `index.html` with an inline minimalist SVG geometric mark.
4. **Heroicons outline feature icons** — replaced with custom hairline 1.5px-stroke SVGs on a 40×40 viewBox, all sharing stroke width / linecap / aesthetic. Each feature gets a drawn-by-hand mini-illustration (trend line, bar trio, gauge, bullseye, loop, Venn, 2×2 grid, etc.). **Do NOT use numbered cards — "01/02/03" numerals were explicitly rejected by the user.**
5. **Uniform rounded-xl / rounded-2xl** — audit every file and apply the radii scale above. Don't find-replace; decide by context.
6. **Pure grays** — migrate to the warmer `surface.*` / `ink.*` tokens.
7. **Soft shadows** — removed from default cards; kept only on modals + dropdowns + hero mockup.
8. **Symmetric 3-col feature grid** — editorial asymmetric layout instead. Example: first feature full-width with large display type + description, next two side-by-side (1/2, 1/2), last three in 1/3,1/3,1/3. Vary type size between tiers.

## Utility classes (added in `src/index.css`)

```css
.eyebrow {
  @apply font-display uppercase tracking-[0.08em] text-xs font-medium text-ink-muted;
}
.label-display {
  @apply font-display text-sm font-medium tracking-tight;
}
```

Use `.eyebrow` for section overlines, `.label-display` for stat/field/nav labels.
