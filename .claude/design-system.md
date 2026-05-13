# Personal Finance Tracker — Design System

## Typography

### Fonts
- **Primary / body + headings**: **Inter Tight** (Google Fonts), 400–700 weight. Applied globally via `font-sans` in `tailwind.config.cjs`. All headings inherit this — there is no separate display font.
- **Monospace**: **Geist Mono**, used for code/amounts where a mono face is explicitly appropriate.

### Rules
- No `font-display` class — it was removed. Do not reintroduce it.
- No `tracking-display` or `tracking-tight-display` — removed. Use standard Tailwind tracking utilities.
- Use `tracking-tight` on large headings.
- `.eyebrow` class: `text-[12px] font-medium text-ink-muted` (no uppercase, no wide tracking — the "creepy AI" style was explicitly removed).

## Colors

### Brand (teal-green, darkened from original)
```
brand-500  #168b78   (accent, active states)
brand-600  #0f6b5e   (primary button fill)
brand-700  #0b5449   (button hover)
```

### Expense / negative (strong red, not washed-out pink)
```
#e8394d   — use everywhere for expense amounts, negative values, over-budget indicators
```
The old `#e05c6b` and `#f08090` (washed pink) have been replaced globally with `#e8394d`.

### Surface tokens
```
surface.page          #FAFAF7    light page bg
surface.card          #FFFFFF    light card bg
surface.hairline      #EDEDE8    light border
surface.dark          #0C0C0E
surface.dark-page     #0A0A0B    dark page bg
surface.dark-card     #111113    dark card bg
surface.dark-hairline #1F1F22    dark border
surface.dark-elevated #222226
surface.dark-tertiary #1A1A1E
```

### Ink tokens
```
ink.primary       #111112    light body text
ink.muted         #2F2F2C    light secondary text
ink.dark-primary  #FFFFFF    dark body text (white)
ink.dark-muted    #FFFFFF    dark secondary text (white)
```

**Important**: `ink.dark-primary` and `ink.dark-muted` are both `#FFFFFF`. In dark mode, all text is white. Hierarchy is achieved via opacity modifiers (`text-white/70`) or layout, not by making secondary text gray.

### Dark mode text — critical rules
All dark mode text is forced white via CSS outside `@layer` in `index.css`. Do not fight this:
- Use `dark:text-white` for primary text
- Use `dark:text-white` for muted/secondary text (the CSS cascade handles opacity if needed)
- Never use `dark:text-gray-*`, `dark:text-zinc-*`, or `dark:text-ink-dark-*` (tokens may not regenerate correctly from JIT cache)
- CSS fallbacks in `index.css` cover: `.dark .text-ink-primary`, `.dark .text-ink-muted`, `.dark .text-ink-dark-primary`, `.dark .text-ink-dark-muted`, `.dark label`, `.dark input`, `.dark textarea`, `.dark select`

## Radii

| Element | Radius |
|---|---|
| Buttons, inputs, chips | `rounded-md` |
| Pills / tags | `rounded-full` |
| Data cards, feature cards, panels | `rounded-[10px]` |
| Modals, dropdowns | `rounded-xl` |
| Transaction rows / data tables | `rounded-none` |

## Buttons

Primary brand buttons use `rounded-md` (not `rounded-full`). The `Button` component variant `primary` uses `bg-brand-600 hover:bg-brand-700`. All inline brand buttons follow the same pattern.

## Elevation

- Default card: 1px hairline border, no shadow.
- Shadows only on: modals, popovers, hero mockup.

## Expense / budget colors

When over budget, avoid showing everything in red simultaneously. Hierarchy:
- The percentage or one key number stays red (`#e8394d`)
- Supporting text (over-budget label, forecast) uses softer treatment (`text-white/60` in dark, or reduced opacity red)
- Progress bar carries the color signal; body text does not need to repeat it

## Placeholder text

- Light mode: `placeholder:text-ink-muted/40`
- Dark mode: `dark:placeholder:text-white/40` (40% white — visibly different from typed text but not gray)
- CSS fallback in `index.css`: `.dark input::placeholder { color: rgba(255,255,255,0.4) }`

## Utility classes (`src/index.css`)

```css
.eyebrow {
  /* 12px medium, no uppercase, no wide tracking */
  @apply text-[12px] font-medium text-ink-muted;
}
.dark .eyebrow {
  color: #FFFFFF;
}
```
